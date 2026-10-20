import { NotFoundException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';

const examFixture = {
  id: 'e1',
  questions: [
    {
      question: {
        id: 'q1',
        options: [
          { id: 'o1', isCorrect: false },
          { id: 'o2', isCorrect: true },
        ],
      },
    },
    {
      question: {
        id: 'q2',
        options: [
          { id: 'o3', isCorrect: true },
          { id: 'o4', isCorrect: true },
          { id: 'o5', isCorrect: false },
        ],
      },
    },
  ],
};

describe('ExamsService.submitExam', () => {
  let service: ExamsService;
  let prisma: Record<string, jest.Mock>;

  beforeEach(() => {
    prisma = {
      exam: { findUnique: jest.fn().mockResolvedValue(examFixture) },
      examAttempt: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    };
    service = new ExamsService(prisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('chấm đúng single-choice và multi-select', async () => {
    const res = await service.submitExam(
      'e1',
      { q1: 'o2', q2: ['o3', 'o4'] },
      undefined,
    );
    expect(res.score).toBe(2);
    expect(res.total).toBe(2);
    expect(res.percentage).toBe(100);
    expect(res.attemptId).toBeNull();
    expect(prisma.examAttempt.create).not.toHaveBeenCalled();
  });

  it('multi-select thiếu đáp án thì sai', async () => {
    const res = await service.submitExam('e1', { q1: 'o2', q2: ['o3'] });
    expect(res.score).toBe(1);
    expect(res.details.find((d) => d.questionId === 'q2')!.isCorrect).toBe(
      false,
    );
  });

  it('lưu attempt khi có userId', async () => {
    const res = await service.submitExam('e1', { q1: 'o2' }, 'u1');
    expect(res.attemptId).toBe('a1');
    expect(prisma.examAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ examId: 'e1', userId: 'u1' }),
      }),
    );
  });

  it('404 khi exam không tồn tại', async () => {
    prisma.exam.findUnique.mockResolvedValue(null);
    await expect(service.submitExam('nope', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
