import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryService } from '../mastery/mastery.service';

function createService() {
  const prisma = {
    exam: { findUnique: jest.fn() },
    question: { findMany: jest.fn(), groupBy: jest.fn() },
    questionOption: { count: jest.fn() },
    examAttempt: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    examAnswer: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    attemptTopicResult: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  const mastery = { updateAfterGrading: jest.fn().mockResolvedValue({ updated: true, topics: 0 }) };
  const service = new AttemptsService(prisma as unknown as PrismaService, mastery as unknown as MasteryService);
  return { service, prisma, mastery };
}

const past = () => new Date(Date.now() - 60_000);
const future = () => new Date(Date.now() + 3_600_000);

describe('AttemptsService (M1)', () => {
  describe('startAttempt — validation bộ lọc', () => {
    it('báo lỗi khi difficultyMin > difficultyMax', async () => {
      const { service } = createService();
      await expect(
        service.startAttempt('u1', { difficultyMin: 5, difficultyMax: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('báo lỗi khi exam không có câu hỏi', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue({ id: 'e1', questions: [] });
      await expect(
        service.startAttempt('u1', { examId: 'e1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('báo lỗi khi exam không tồn tại', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue(null);
      await expect(
        service.startAttempt('u1', { examId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('tạo attempt với deadline = startedAt + timeLimit', async () => {
      const { service, prisma } = createService();
      prisma.question.findMany.mockResolvedValue([{ id: 'q1' }]);
      prisma.examAttempt.create.mockImplementation(({ data }: any) => ({
        id: 'a1',
        ...data,
      }));
      prisma.examAnswer.createMany.mockResolvedValue({ count: 1 });

      const res = await service.startAttempt('u1', {
        questionCount: 1,
        timeLimit: 600,
      });

      expect(res.attemptId).toBe('a1');
      expect(res.totalQuestions).toBe(1);
      const gap =
        new Date(res.deadlineAt!).getTime() -
        new Date(res.startedAt).getTime();
      expect(gap).toBe(600_000);
    });
  });

  describe('startPlacement — phân bổ theo chủ đề', () => {
    it('báo lỗi khi ngân hàng câu hỏi trống', async () => {
      const { service, prisma } = createService();
      prisma.question.groupBy.mockResolvedValue([]);
      await expect(service.startPlacement('u1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('saveAnswer — lưu đáp án', () => {
    it('báo lỗi khi attempt đã kết thúc', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'SUBMITTED',
      });
      await expect(
        service.saveAnswer('a1', 'q1', { selectedOptionIds: ['o1'] }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('báo lỗi khi attempt không thuộc user', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue(null);
      await expect(
        service.saveAnswer('a1', 'q1', { selectedOptionIds: [] }, 'other'),
      ).rejects.toThrow(NotFoundException);
    });

    it('tự nộp và báo lỗi khi đã hết giờ', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        startedAt: past(),
        timeLimit: 60,
        deadlineAt: past(),
      });
      prisma.examAttempt.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        answers: [],
        total: 0,
      });
      prisma.question.findMany.mockResolvedValue([]);

      await expect(
        service.saveAnswer('a1', 'q1', { selectedOptionIds: ['o1'] }, 'u1'),
      ).rejects.toThrow('Đã hết thời gian làm bài');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('báo lỗi khi câu hỏi không thuộc attempt', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        timeLimit: 3600,
        deadlineAt: future(),
      });
      prisma.examAnswer.findUnique.mockResolvedValue(null);
      await expect(
        service.saveAnswer('a1', 'qX', { selectedOptionIds: [] }, 'u1'),
      ).rejects.toThrow('Câu hỏi không thuộc lượt làm bài này');
    });

    it('báo lỗi khi option không thuộc câu hỏi', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        timeLimit: 3600,
        deadlineAt: future(),
      });
      prisma.examAnswer.findUnique.mockResolvedValue({ id: 'ans1' });
      prisma.questionOption.count.mockResolvedValue(0);
      await expect(
        service.saveAnswer('a1', 'q1', { selectedOptionIds: ['fake'] }, 'u1'),
      ).rejects.toThrow('Có đáp án không thuộc câu hỏi này');
    });
  });

  describe('submitAttempt — nộp bài', () => {
    it('báo lỗi khi nộp bài đã nộp', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'SUBMITTED',
      });
      await expect(service.submitAttempt('a1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAttempt — đồng hồ server', () => {
    it('tự nộp khi đọc attempt đã quá hạn và trả remainingSeconds = 0', async () => {
      const { service, prisma } = createService();
      const expired: any = {
        id: 'a1',
        status: 'IN_PROGRESS',
        exam: null,
        startedAt: past(),
        submittedAt: null,
        timeLimit: 60,
        deadlineAt: past(),
        score: 0,
        weightedScore: 0,
        total: 1,
        answers: [],
      };
      const submitted = { ...expired, status: 'SUBMITTED' };
      prisma.examAttempt.findFirst
        .mockResolvedValueOnce(expired)
        .mockResolvedValueOnce(submitted);
      prisma.examAttempt.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        answers: [],
        total: 0,
      });
      prisma.question.findMany.mockResolvedValue([]);

      const res = await service.getAttempt('a1', 'u1');
      expect(res.status).toBe('SUBMITTED');
      expect(res.remainingSeconds).toBe(0);
    });

    it('trả remainingSeconds dương khi còn giờ', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        exam: null,
        startedAt: new Date(),
        submittedAt: null,
        timeLimit: 3600,
        deadlineAt: future(),
        score: 0,
        weightedScore: 0,
        total: 0,
        answers: [],
      });

      const res = await service.getAttempt('a1', 'u1');
      expect(res.remainingSeconds).toBeGreaterThan(3500);
    });
  });

  describe('getHistory', () => {
    it('chỉ lấy các bài đã nộp', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findMany.mockResolvedValue([]);
      await service.getHistory('u1');
      expect(prisma.examAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u1', status: 'SUBMITTED' }),
        }),
      );
    });
  });

  describe('finalizeAttempt — auto-grading + difficulty-weighted scoring', () => {
    function gradingMocks() {
      const { service, prisma } = createService();
      prisma.examAttempt.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        timeLimit: 3600,
        deadlineAt: future(),
        total: 0,
        answers: [
          { id: 'ans1', questionId: 'q1', selectedOptionIds: ['o1'], timeSpent: 10 },
          { id: 'ans2', questionId: 'q2', selectedOptionIds: ['oX'], timeSpent: 5 },
          { id: 'ans3', questionId: 'q3', selectedOptionIds: [], timeSpent: 0 },
        ],
      });
      prisma.question.findMany.mockResolvedValue([
        {
          id: 'q1',
          topicId: 't1',
          difficulty: 2,
          options: [
            { id: 'o1', isCorrect: true },
            { id: 'oW', isCorrect: false },
          ],
        },
        {
          id: 'q2',
          topicId: 't1',
          difficulty: 0,
          options: [
            { id: 'o2', isCorrect: true },
            { id: 'oX', isCorrect: false },
          ],
        },
        {
          id: 'q3',
          topicId: 't2',
          difficulty: 1,
          options: [{ id: 'o3', isCorrect: true }],
        },
      ]);
      return { service, prisma };
    }

    it('chấm đúng/sai/bỏ trống và tính điểm có trọng số độ khó', async () => {
      const { service, prisma } = gradingMocks();
      const res = await service.finalizeAttempt('a1');

      // q1 đúng (difficulty 2 → weight 3), q2 sai, q3 bỏ trống tính sai
      expect(res.score).toBe(1);
      expect(res.weightedScore).toBe(3);
      expect(res.total).toBe(3);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 15000 });
      expect(prisma.examAnswer.update).toHaveBeenCalledTimes(3);
      expect(prisma.examAnswer.update).toHaveBeenCalledWith({
        where: { id: 'ans1' },
        data: expect.objectContaining({ isCorrect: true, difficultyAtSubmission: 2, topicIdAtSubmission: 't1' }),
      });
      expect(prisma.examAnswer.update).toHaveBeenCalledWith({
        where: { id: 'ans2' },
        data: expect.objectContaining({ isCorrect: false }),
      });
      expect(prisma.examAnswer.update).toHaveBeenCalledWith({
        where: { id: 'ans3' },
        data: expect.objectContaining({ isCorrect: false }),
      });
      expect(prisma.examAttempt.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          status: 'SUBMITTED',
          score: 1,
          weightedScore: 3,
        }),
      });
    });

    it('lưu điểm theo chủ đề (AttemptTopicResult)', async () => {
      const { service, prisma } = gradingMocks();
      await service.finalizeAttempt('a1');

      expect(prisma.attemptTopicResult.deleteMany).toHaveBeenCalledWith({
        where: { attemptId: 'a1' },
      });
      expect(prisma.attemptTopicResult.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ topicId: 't1', correct: 1, total: 2 }),
          expect.objectContaining({ topicId: 't2', correct: 0, total: 1 }),
        ]),
      });
    });

    it('nộp bài quá hạn: submittedAt chốt tại deadline', async () => {
      const { service, prisma } = createService();
      const deadline = past();
      prisma.examAttempt.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
        startedAt: new Date(deadline.getTime() - 60_000),
        timeLimit: 60,
        deadlineAt: deadline,
        total: 0,
        answers: [],
      });
      prisma.question.findMany.mockResolvedValue([]);

      const res = await service.finalizeAttempt('a1');
      expect(new Date(res.submittedAt!).getTime()).toBe(deadline.getTime());
    });

    it('nộp lại bài đã nộp: idempotent, không chấm lại', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'SUBMITTED',
        score: 2,
        weightedScore: 3,
        total: 6,
        submittedAt: new Date(),
        answers: [],
      });

      const res = await service.finalizeAttempt('a1');
      expect(res.message).toBe('Bài thi đã được nộp trước đó');
      expect(prisma.examAnswer.update).not.toHaveBeenCalled();
    });

    it('báo lỗi khi attempt không tồn tại', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findUnique.mockResolvedValue(null);
      await expect(service.finalizeAttempt('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResults — result summary', () => {
    function submittedMocks() {
      const { service, prisma } = createService();
      const topic = { id: 't1', name: 'Toán - Giới hạn' };
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'SUBMITTED',
        score: 1,
        weightedScore: 3,
        total: 3,
        submittedAt: new Date(),
        topicResults: [],
        answers: [
          {
            questionId: 'q1',
            isCorrect: true,
            timeSpent: 10,
            selectedOptionIds: ['o1'],
            question: {
              content: 'c1',
              explanation: 'g1',
              difficulty: 2,
              topic,
              options: [
                { id: 'o1', isCorrect: true },
                { id: 'oW', isCorrect: false },
              ],
            },
          },
          {
            questionId: 'q2',
            isCorrect: false,
            timeSpent: 5,
            selectedOptionIds: ['oX'],
            question: {
              content: 'c2',
              explanation: 'g2',
              difficulty: 0,
              topic,
              options: [
                { id: 'o2', isCorrect: true },
                { id: 'oX', isCorrect: false },
              ],
            },
          },
          {
            questionId: 'q3',
            isCorrect: false,
            timeSpent: 0,
            selectedOptionIds: [],
            question: {
              content: 'c3',
              explanation: 'g3',
              difficulty: 1,
              topic,
              options: [{ id: 'o3', isCorrect: true }],
            },
          },
        ],
      });
      return { service, prisma };
    }

    it('báo lỗi khi attempt không tồn tại', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue(null);
      await expect(service.getResults('missing', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('báo lỗi khi bài chưa nộp', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
      });
      await expect(service.getResults('a1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tổng hợp đúng/sai/bỏ trống + % + topic summary nhất quán', async () => {
      const { service } = submittedMocks();
      const res = await service.getResults('a1', 'u1');

      expect(res.score).toBe(1);
      expect(res.total).toBe(3);
      expect(res.details).toHaveLength(3);
      expect(res.summary.correctCount).toBe(1);
      expect(res.summary.wrongCount).toBe(1);
      expect(res.summary.unansweredCount).toBe(1);
      expect(res.summary.percentage).toBeCloseTo(33.33, 1);
      // maxWeighted = (1+2)+(1+0)+(1+1) = 6 → 3/6 = 50%
      expect(res.summary.maxWeightedScore).toBe(6);
      expect(res.summary.weightedPercentage).toBe(50);
      // topic summary tự build khi chưa có persisted rows
      expect(res.topicSummary).toHaveLength(1);
      expect(res.topicSummary[0]).toMatchObject({
        topicId: 't1',
        correct: 1,
        total: 3,
      });
      // chi tiết từng câu có đáp án đúng + giải thích
      expect(res.details[0]).toMatchObject({
        questionId: 'q1',
        isCorrect: true,
        correctOptionIds: ['o1'],
        explanation: 'g1',
      });
    });

    it('dùng topicResults đã lưu khi có (result persistence)', async () => {
      const { service, prisma } = submittedMocks();
      prisma.examAttempt.findFirst.mockResolvedValue({
        ...(await prisma.examAttempt.findFirst()),
        topicResults: [
          {
            topicId: 't1',
            correct: 1,
            total: 3,
            weightedScore: 3,
            timeSpent: 15,
            topic: { id: 't1', name: 'Toán - Giới hạn' },
          },
        ],
      });

      const res = await service.getResults('a1', 'u1');
      expect(res.topicSummary[0]).toMatchObject({
        topicId: 't1',
        correct: 1,
        total: 3,
        timeSpent: 15,
      });
    });
  });

  describe('getAnalysis — question-level + time analysis', () => {
    it('báo lỗi khi attempt không tồn tại', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue(null);
      await expect(service.getAnalysis('missing', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('báo lỗi khi bài chưa nộp, chưa có phân tích', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'IN_PROGRESS',
      });
      await expect(service.getAnalysis('a1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tính tổng thời gian và trung bình/câu đã trả lời', async () => {
      const { service, prisma } = createService();
      prisma.examAttempt.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'SUBMITTED',
        score: 1,
        weightedScore: 3,
        total: 2,
      });
      const topic = { id: 't1', name: 'Toán - Giới hạn' };
      prisma.examAnswer.findMany.mockResolvedValue([
        {
          questionId: 'q1',
          isCorrect: true,
          timeSpent: 10,
          selectedOptionIds: ['o1'],
          question: {
            content: 'c1',
            type: 'MULTIPLE_CHOICE',
            difficulty: 2,
            topic,
            explanation: 'g1',
            options: [{ id: 'o1', isCorrect: true }],
          },
        },
        {
          questionId: 'q2',
          isCorrect: false,
          timeSpent: 0,
          selectedOptionIds: [],
          question: {
            content: 'c2',
            type: 'MULTIPLE_CHOICE',
            difficulty: 0,
            topic,
            explanation: 'g2',
            options: [{ id: 'o2', isCorrect: true }],
          },
        },
      ]);
      prisma.attemptTopicResult.findMany.mockResolvedValue([]);

      const res = await service.getAnalysis('a1', 'u1');
      expect(res.timeAnalysis.totalTime).toBe(10);
      expect(res.timeAnalysis.answeredCount).toBe(1);
      expect(res.timeAnalysis.averageTimePerQuestion).toBe(10);
      expect(res.questionAnalysis).toHaveLength(2);
      expect(res.questionAnalysis[0]).toMatchObject({
        questionId: 'q1',
        isCorrect: true,
        correctOptionIds: ['o1'],
        timeSpent: 10,
      });
      expect(res.topicAnalysis[0]).toMatchObject({ topicId: 't1', total: 2 });
    });
  });
});
