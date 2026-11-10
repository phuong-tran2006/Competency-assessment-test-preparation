import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { prerequisiteAncestors, prerequisiteMap } from '../topics/prerequisite-graph';
import { INITIAL_RATING, ratingToLevel, updateRating } from './elo';
import { MasteryHistoryQueryDto, MasteryQueryDto, PracticeQuestionsQueryDto } from './dto/mastery-query.dto';

@Injectable()
export class MasteryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertStudent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== Role.STUDENT) throw new NotFoundException('Không tìm thấy sinh viên');
  }

  private async assertTopic(topicId?: string) {
    if (topicId && !await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } })) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }
  }

  async getProfile(userId: string, query: MasteryQueryDto = new MasteryQueryDto()) {
    await this.assertStudent(userId);
    const [topics, scores, edges, history] = await Promise.all([
      this.prisma.topic.findMany({ select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.prisma.topicMastery.findMany({ where: { userId } }),
      this.prisma.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } }),
      this.prisma.$queryRaw<Array<{ topicId: string; attemptCount: number }>>`
        SELECT COALESCE(a."topicIdAtSubmission", q."topicId") AS "topicId",
               COUNT(DISTINCT e."id")::int AS "attemptCount"
        FROM "exam_answers" a
        JOIN "exam_attempts" e ON e."id" = a."attemptId"
        JOIN "questions" q ON q."id" = a."questionId"
        WHERE e."userId" = ${userId} AND e."status" = 'SUBMITTED'
        GROUP BY COALESCE(a."topicIdAtSubmission", q."topicId")`,
    ]);
    if (query.topicId && !topics.some((topic) => topic.id === query.topicId)) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }
    const byTopic = new Map(scores.map((score) => [score.topicId, score]));
    const historicalCounts = new Map(history.map((row) => [row.topicId, row.attemptCount]));
    const graph = prerequisiteMap(edges);
    const threshold = query.masteryThreshold ?? 1300;
    const selected = topics.filter((topic) => !query.topicId || topic.id === query.topicId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const items = selected.slice((page - 1) * limit, page * limit).map((topic) => {
      const score = byTopic.get(topic.id);
      const isAssessed = (score?.attempts ?? 0) > 0;
      const masteryScore = score?.masteryScore ?? INITIAL_RATING;
      const ancestors = prerequisiteAncestors(graph, topic.id);
      const prerequisiteCycle = (graph.get(topic.id) ?? []).includes(topic.id) ||
        ancestors.some(({ id }) => (graph.get(id) ?? []).includes(topic.id));
      const unmetPrerequisiteIds = ancestors.filter(({ id }) => {
        const parent = byTopic.get(id);
        return !parent || parent.attempts === 0 || parent.masteryScore < threshold;
      }).map(({ id }) => id);
      return {
        topicId: topic.id,
        name: topic.name,
        masteryScore,
        evidenceCount: score?.attempts ?? 0,
        hasHistory: isAssessed || (historicalCounts.get(topic.id) ?? 0) > 0,
        submittedAttemptCount: historicalCounts.get(topic.id) ?? 0,
        isAssessed,
        level: isAssessed ? ratingToLevel(masteryScore) : 'Chưa đánh giá',
        isMastered: isAssessed && masteryScore >= threshold,
        updatedAt: score?.updatedAt ?? null,
        prerequisiteIds: graph.get(topic.id) ?? [],
        ancestorIds: ancestors.map(({ id }) => id),
        unmetPrerequisiteIds,
        prerequisiteCycle,
        ready: !prerequisiteCycle && unmetPrerequisiteIds.length === 0,
      };
    });
    return { userId, initialMasteryScore: INITIAL_RATING, masteryThreshold: threshold, items, total: selected.length, page, limit };
  }

  async getQuestions(userId: string, query: PracticeQuestionsQueryDto) {
    await this.assertStudent(userId);
    await this.assertTopic(query.topicId);
    if (query.difficultyMin !== undefined && query.difficultyMax !== undefined && query.difficultyMin > query.difficultyMax) {
      throw new BadRequestException('difficultyMin không được lớn hơn difficultyMax');
    }
    const where: Prisma.QuestionWhereInput = {
      topicId: query.topicId,
      difficulty: { gte: query.difficultyMin, lte: query.difficultyMax },
      ...(query.unseenOnly ? { answers: { none: { attempt: { userId, status: 'SUBMITTED' } } } } : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
        select: { id: true, content: true, type: true, difficulty: true, topicId: true, topic: { select: { id: true, name: true } } },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getHistory(userId: string, query: MasteryHistoryQueryDto) {
    await this.assertStudent(userId);
    await this.assertTopic(query.topicId);
    const answerWhere: Prisma.ExamAnswerWhereInput = query.topicId ? {
      OR: [
        { topicIdAtSubmission: query.topicId },
        { topicIdAtSubmission: null, question: { topicId: query.topicId } },
      ],
    } : {};
    const where: Prisma.ExamAttemptWhereInput = { userId, status: 'SUBMITTED', answers: { some: answerWhere } };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [attempts, total] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ submittedAt: query.order ?? 'desc' }, { id: query.order ?? 'desc' }],
        select: {
          id: true, examId: true, startedAt: true, submittedAt: true, masteryUpdatedAt: true,
          score: true, weightedScore: true, total: true,
          answers: { where: answerWhere, orderBy: { id: 'asc' }, select: {
            questionId: true, isCorrect: true, selectedOptionIds: true, timeSpent: true,
            difficultyAtSubmission: true, topicIdAtSubmission: true,
            question: { select: { difficulty: true, topicId: true } },
          } },
        },
      }),
      this.prisma.examAttempt.count({ where }),
    ]);
    return {
      userId, items: attempts.map(({ answers, ...attempt }) => ({
        ...attempt,
        answers: answers.map(({ question, selectedOptionIds, difficultyAtSubmission, topicIdAtSubmission, ...answer }) => ({
          ...answer,
          answered: selectedOptionIds.length > 0,
          difficulty: difficultyAtSubmission ?? question.difficulty,
          topicId: topicIdAtSubmission ?? question.topicId,
        })),
      })), total, page, limit,
    };
  }

  /** M1/M4 call inside the grading transaction. The client never supplies scores. */
  async updateAfterGrading(tx: Prisma.TransactionClient, attemptId: string) {
    // Lock order is always attempt -> user to serialize both retries and concurrent exams.
    await tx.$queryRaw`SELECT "id" FROM "exam_attempts" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId }, include: { user: { select: { role: true } } } });
    if (!attempt) throw new NotFoundException('Không tìm thấy bài làm');
    if (attempt.status !== 'SUBMITTED') throw new BadRequestException('Chỉ cập nhật mastery sau khi chấm bài');
    if (!attempt.userId || attempt.user?.role !== Role.STUDENT || attempt.masteryUpdatedAt) return { updated: false, topics: 0 };
    const userId = attempt.userId;
    await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
    const answers = await tx.examAnswer.findMany({
      where: { attemptId }, orderBy: { id: 'asc' },
      select: { selectedOptionIds: true, isCorrect: true, difficultyAtSubmission: true, topicIdAtSubmission: true,
        question: { select: { topicId: true, difficulty: true } } },
    });
    const evidence = answers.filter((answer) => answer.selectedOptionIds.length > 0);
    const topicIds = [...new Set(evidence.map((answer) => answer.topicIdAtSubmission ?? answer.question.topicId))].sort();
    const stored = topicIds.length ? await tx.topicMastery.findMany({ where: { userId, topicId: { in: topicIds } } }) : [];
    const scores = new Map(stored.map((row) => [row.topicId, { masteryScore: row.masteryScore, attempts: row.attempts }]));
    for (const answer of evidence) {
      const topicId = answer.topicIdAtSubmission ?? answer.question.topicId;
      const difficulty = answer.difficultyAtSubmission ?? answer.question.difficulty;
      const previous = scores.get(topicId) ?? { masteryScore: INITIAL_RATING, attempts: 0 };
      if (!Number.isFinite(difficulty) || !Number.isFinite(previous.masteryScore)) {
        throw new BadRequestException('Dữ liệu độ khó hoặc mastery không hợp lệ');
      }
      scores.set(topicId, { masteryScore: updateRating(previous.masteryScore, difficulty, answer.isCorrect), attempts: previous.attempts + 1 });
    }
    for (const topicId of topicIds) {
      const score = scores.get(topicId)!;
      await tx.topicMastery.upsert({ where: { userId_topicId: { userId, topicId } }, create: { userId, topicId, ...score }, update: score });
    }
    await tx.examAttempt.update({ where: { id: attemptId }, data: { masteryUpdatedAt: new Date() } });
    return { updated: true, topics: topicIds.length };
  }
}
