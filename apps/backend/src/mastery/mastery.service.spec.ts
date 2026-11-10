import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { MasteryService } from './mastery.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryHistoryQueryDto, MasteryQueryDto, PracticeQuestionsQueryDto } from './dto/mastery-query.dto';
import { INITIAL_RATING, updateRating } from './elo';

function setup() {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ role: Role.STUDENT }) },
    topic: { findMany: jest.fn().mockResolvedValue([{ id: 't1', name: 'Basics' }]), findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
    topicPrerequisite: { findMany: jest.fn().mockResolvedValue([]) },
    topicMastery: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
    question: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    examAttempt: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(), update: jest.fn() },
    examAnswer: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  return { prisma, service: new MasteryService(prisma as unknown as PrismaService), tx: prisma as unknown as Prisma.TransactionClient };
}

describe('Mastery data access', () => {
  it('returns explicit unassessed defaults without inventing history', async () => {
    const { service, prisma } = setup();
    const result = await service.getProfile('student-1');
    expect(result.items[0]).toMatchObject({ masteryScore: INITIAL_RATING, evidenceCount: 0, hasHistory: false, isMastered: false, level: 'Chưa đánh giá', ready: true });
    expect(prisma.topicMastery.upsert).not.toHaveBeenCalled();
  });

  it('checks transitive prerequisites using batched reads and de-duplicates diamond ancestors', async () => {
    const { service, prisma } = setup();
    prisma.topic.findMany.mockResolvedValue(['a', 'b', 'c', 'd'].map((id) => ({ id, name: id })));
    prisma.topicPrerequisite.findMany.mockResolvedValue([
      { topicId: 'd', prerequisiteId: 'b' }, { topicId: 'd', prerequisiteId: 'c' },
      { topicId: 'b', prerequisiteId: 'a' }, { topicId: 'c', prerequisiteId: 'a' },
    ]);
    prisma.topicMastery.findMany.mockResolvedValue([
      { topicId: 'a', masteryScore: 900, attempts: 30 },
      ...['b', 'c', 'd'].map((topicId) => ({ topicId, masteryScore: 1700, attempts: 30 })),
    ]);
    const result = await service.getProfile('student-1', Object.assign(new MasteryQueryDto(), { topicId: 'd' }));
    expect(result.items[0]).toMatchObject({ isMastered: true, ready: false, unmetPrerequisiteIds: ['a'] });
    expect(result.items[0].ancestorIds).toEqual(['b', 'c', 'a']);
    expect(prisma.topic.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.topicMastery.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.topicPrerequisite.findMany).toHaveBeenCalledTimes(1);
  });

  it('never treats a prerequisite with no evidence as mastered even at a low threshold', async () => {
    const { service, prisma } = setup();
    prisma.topicPrerequisite.findMany.mockResolvedValue([{ topicId: 't1', prerequisiteId: 'unknown' }]);
    const result = await service.getProfile('student-1', Object.assign(new MasteryQueryDto(), { masteryThreshold: 0 }));
    expect(result.items[0].ready).toBe(false);
  });

  it('rejects absent students and non-student targets', async () => {
    const { service, prisma } = setup();
    for (const user of [null, { role: Role.INSTRUCTOR }, { role: Role.ADMIN }]) {
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.getProfile('not-student')).rejects.toThrow(NotFoundException);
    }
  });

  it('distinguishes unprocessed historical submissions from a true cold start', async () => {
    const { service, prisma } = setup();
    prisma.$queryRaw.mockResolvedValue([{ topicId: 't1', attemptCount: 2 }]);
    expect((await service.getProfile('student-1')).items[0]).toMatchObject({ hasHistory: true, isAssessed: false, submittedAttemptCount: 2, level: 'Chưa đánh giá' });
  });

  it('rejects an unknown topic', async () => {
    const { service } = setup();
    await expect(service.getProfile('student-1', Object.assign(new MasteryQueryDto(), { topicId: 'missing' }))).rejects.toThrow(NotFoundException);
  });

  it('filters a bounded question pool by topic, difficulty and student history without exposing correct options', async () => {
    const { service, prisma } = setup();
    const query = Object.assign(new PracticeQuestionsQueryDto(), { topicId: 't1', difficultyMin: 0.2, difficultyMax: 0.8, unseenOnly: true, page: 2, limit: 5 });
    await service.getQuestions('student-1', query);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 5, take: 5, where: {
        topicId: 't1', difficulty: { gte: 0.2, lte: 0.8 },
        answers: { none: { attempt: { userId: 'student-1', status: 'SUBMITTED' } } },
      },
    }));
    const select = prisma.question.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('options');
    expect(select).not.toHaveProperty('explanation');
  });

  it('rejects an inverted difficulty range', async () => {
    const { service } = setup();
    await expect(service.getQuestions('student-1', Object.assign(new PracticeQuestionsQueryDto(), { difficultyMin: 0.9, difficultyMax: 0.1 }))).rejects.toThrow(BadRequestException);
  });

  it('preserves historical difficulty and topic after the question is edited', async () => {
    const { service, prisma } = setup();
    prisma.examAttempt.findMany.mockResolvedValue([{ id: 'a1', answers: [{
      questionId: 'q1', isCorrect: false, selectedOptionIds: ['o1'], timeSpent: 15,
      difficultyAtSubmission: 0.3, topicIdAtSubmission: 'old-topic', question: { difficulty: 0.9, topicId: 'new-topic' },
    }] }]);
    const result = await service.getHistory('student-1', Object.assign(new MasteryHistoryQueryDto(), { topicId: 'old-topic', order: 'asc' }));
    expect(result.items[0].answers[0]).toMatchObject({ topicId: 'old-topic', difficulty: 0.3, isCorrect: false, answered: true });
    expect(prisma.examAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'student-1', status: 'SUBMITTED' }) }));
  });

  it('returns empty history for a new student', async () => {
    const { service } = setup();
    expect(await service.getHistory('student-1', new MasteryHistoryQueryDto())).toMatchObject({ items: [], total: 0 });
  });
});

describe('Mastery updates after grading', () => {
  function graded() {
    const context = setup();
    const attempt = { id: 'a1', status: 'SUBMITTED', userId: 'student-1', user: { role: Role.STUDENT }, masteryUpdatedAt: null as Date | null };
    context.prisma.examAttempt.findUnique.mockResolvedValue(attempt);
    context.prisma.examAttempt.update.mockImplementation(({ data }) => Object.assign(attempt, data));
    return { ...context, attempt };
  }

  it('accumulates correct and incorrect answers into one row per topic and ignores blanks', async () => {
    const { service, prisma, tx } = graded();
    prisma.examAnswer.findMany.mockResolvedValue([
      { selectedOptionIds: ['a'], isCorrect: true, difficultyAtSubmission: 0.2, topicIdAtSubmission: 't1', question: {} },
      { selectedOptionIds: ['b'], isCorrect: false, difficultyAtSubmission: 0.8, topicIdAtSubmission: 't1', question: {} },
      { selectedOptionIds: [], isCorrect: false, difficultyAtSubmission: 0.5, topicIdAtSubmission: 't2', question: {} },
    ]);
    expect(await service.updateAfterGrading(tx, 'a1')).toEqual({ updated: true, topics: 1 });
    expect(prisma.topicMastery.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.topicMastery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_topicId: { userId: 'student-1', topicId: 't1' } },
      update: { attempts: 2, masteryScore: updateRating(updateRating(INITIAL_RATING, 0.2, true), 0.8, false) },
    }));
    expect(prisma.examAttempt.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { masteryUpdatedAt: expect.any(Date) } });
  });

  it('a repeated callback cannot apply the same attempt twice', async () => {
    const { service, prisma, tx } = graded();
    await service.updateAfterGrading(tx, 'a1');
    expect(await service.updateAfterGrading(tx, 'a1')).toEqual({ updated: false, topics: 0 });
    expect(prisma.examAnswer.findMany).toHaveBeenCalledTimes(1);
  });

  it('continues from an existing score instead of resetting the student', async () => {
    const { service, prisma, tx } = graded();
    prisma.topicMastery.findMany.mockResolvedValue([{ topicId: 't1', masteryScore: 1550, attempts: 15 }]);
    prisma.examAnswer.findMany.mockResolvedValue([{ selectedOptionIds: ['a'], isCorrect: true, difficultyAtSubmission: 0.5, topicIdAtSubmission: 't1', question: {} }]);
    await service.updateAfterGrading(tx, 'a1');
    expect(prisma.topicMastery.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { masteryScore: updateRating(1550, 0.5, true), attempts: 16 } }));
  });

  it('does not create fake evidence for a blank submission', async () => {
    const { service, prisma, tx } = graded();
    await service.updateAfterGrading(tx, 'a1');
    expect(prisma.topicMastery.upsert).not.toHaveBeenCalled();
    expect(prisma.topicMastery.findMany).not.toHaveBeenCalled();
  });

  it('rejects an ungraded attempt', async () => {
    const { service, attempt, tx } = graded();
    attempt.status = 'IN_PROGRESS';
    await expect(service.updateAfterGrading(tx, 'a1')).rejects.toThrow(BadRequestException);
  });

  it('skips attempts belonging to instructors and deleted users', async () => {
    const { service, prisma, tx } = graded();
    for (const attempt of [
      { status: 'SUBMITTED', userId: null, user: null },
      { status: 'SUBMITTED', userId: 'instructor', user: { role: Role.INSTRUCTOR } },
    ]) {
      prisma.examAttempt.findUnique.mockResolvedValue(attempt);
      expect(await service.updateAfterGrading(tx, 'a1')).toEqual({ updated: false, topics: 0 });
    }
    expect(prisma.topicMastery.upsert).not.toHaveBeenCalled();
  });

  it('rejects non-finite difficulty without marking mastery as processed', async () => {
    const { service, prisma, tx } = graded();
    prisma.examAnswer.findMany.mockResolvedValue([{ selectedOptionIds: ['a'], isCorrect: true, difficultyAtSubmission: NaN, topicIdAtSubmission: 't1', question: {} }]);
    await expect(service.updateAfterGrading(tx, 'a1')).rejects.toThrow(BadRequestException);
    expect(prisma.examAttempt.update).not.toHaveBeenCalled();
  });
});
