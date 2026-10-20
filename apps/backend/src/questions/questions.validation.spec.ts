import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';

const opts = (corrects: boolean[]) =>
  corrects.map((isCorrect, i) => ({ content: `opt${i}`, isCorrect }));

describe('QuestionsService.create — validation', () => {
  let service: QuestionsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      topic: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
      question: { create: jest.fn().mockResolvedValue({ id: 'q1' }) },
    };
    service = new QuestionsService(prisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  const base: any = {
    content: 'Nội dung câu hỏi đủ dài',
    type: QuestionType.MULTIPLE_CHOICE,
    topicId: 't1',
  };

  it('MULTIPLE_CHOICE phải có đúng 1 đáp án đúng', async () => {
    await expect(
      service.create({ ...base, options: opts([true, true]) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ ...base, options: opts([false, false]) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('MULTI_SELECT cho phép nhiều đáp án đúng', async () => {
    await service.create({
      ...base,
      type: QuestionType.MULTI_SELECT,
      options: opts([true, true, false]),
    });
    expect(prisma.question.create).toHaveBeenCalled();
  });

  it('TRUE_FALSE yêu cầu đúng 2 options', async () => {
    await expect(
      service.create({
        ...base,
        type: QuestionType.TRUE_FALSE,
        options: opts([true, false, false]),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 khi topic không tồn tại', async () => {
    prisma.topic.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ ...base, options: opts([true, false]) }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
