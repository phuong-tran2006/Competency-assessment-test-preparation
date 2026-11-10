import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { PrismaService } from '../prisma/prisma.service';

function createService() {
  const prisma = {
    exam: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    examQuestion: { create: jest.fn() },
    question: { findMany: jest.fn() },
  };
  const service = new ExamsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe('ExamsService', () => {
  describe('getExamById — ẩn đáp án', () => {
    it('strip `isCorrect` khỏi mọi options', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue({
        id: 'e1',
        title: 'Đề 1',
        questions: [
          {
            question: {
              id: 'q1',
              content: 'c1',
              options: [
                { id: 'o1', content: 'A', order: 0, isCorrect: true },
                { id: 'o2', content: 'B', order: 1, isCorrect: false },
              ],
            },
          },
        ],
      });

      const exam = await service.getExamById('e1');
      expect(exam.questions).toHaveLength(1);
      for (const q of exam.questions) {
        for (const opt of q.options) {
          expect(opt).not.toHaveProperty('isCorrect');
          expect(Object.keys(opt).sort()).toEqual(['content', 'id', 'order']);
        }
      }
    });

    it('báo 404 khi đề không tồn tại', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue(null);
      await expect(service.getExamById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getQuestionsByExamId', () => {
    it('trả mảng phẳng đã strip đáp án', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue({
        id: 'e1',
        questions: [
          {
            question: {
              id: 'q1',
              options: [{ id: 'o1', content: 'A', order: 0 }],
            },
          },
        ],
      });

      const questions = await service.getQuestionsByExamId('e1');
      expect(questions).toHaveLength(1);
      expect(questions[0]).not.toHaveProperty('isCorrect');
    });
  });

  describe('submitExam (legacy)', () => {
    it('luôn báo lỗi, hướng sang luồng attempts', async () => {
      const { service } = createService();
      await expect(service.submitExam()).rejects.toThrow(BadRequestException);
      await expect(service.submitExam()).rejects.toThrow(
        '/attempts/:id/submit',
      );
    });
  });

  describe('createExam', () => {
    it('tạo đề mới không tự bốc câu hỏi mẫu', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue(null);
      prisma.exam.create.mockImplementation(({ data }: any) => data);

      const res = await service.createExam({ title: 'Đề mới' });
      expect(res.title).toBe('Đề mới');
      expect(prisma.examQuestion.create).not.toHaveBeenCalled();
    });

    it('báo lỗi khi trùng mã đề', async () => {
      const { service, prisma } = createService();
      prisma.exam.findUnique.mockResolvedValue({ id: 'dup' });
      await expect(
        service.createExam({ id: 'dup', title: 'X' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
