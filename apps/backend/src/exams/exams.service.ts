import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách câu hỏi của đề thi
  async getQuestionsByExamId(examId: string) {
    const questions = await this.prisma.question.findMany({
      include: {
        options: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      take: 10, // Lấy tối đa câu hỏi sẵn có
    });

    if (!questions || questions.length === 0) {
      throw new NotFoundException(`Chưa có dữ liệu câu hỏi trong cơ sở dữ liệu`);
    }

    // Map dữ liệu từ DB (content) sang định dạng Frontend yêu cầu (text)
    return questions.map((q) => ({
      id: q.id,
      examId: examId,
      content: q.content,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.content, // Đổi tên thuộc tính `content` thành `text`
        isCorrect: opt.isCorrect,
      })),
    }));
  }

  // Xử lý nộp bài thi (khi học sinh ấn Nộp bài)
  async submitExam(examId: string, answers: Record<string, string>) {
    return {
      success: true,
      examId,
      submittedAt: new Date(),
      message: 'Nộp bài thi thành công!',
    };
  }
}