import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách đề thi (kèm số lượng câu hỏi)
  async findAll() {
    const exams = await this.prisma.exam.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { questions: true } } },
    });
    return exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      questionCount: e._count.questions,
      createdAt: e.createdAt,
    }));
  }

  // Lấy danh sách câu hỏi của đề thi (không trả đáp án đúng về client)
  async getQuestionsByExamId(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            question: {
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy đề thi ${examId}`);
    }
    if (exam.questions.length === 0) {
      throw new NotFoundException(`Đề thi ${examId} chưa có câu hỏi nào`);
    }

    // Map DB -> FE, loại bỏ isCorrect để chống lộ đáp án
    return exam.questions.map(({ question: q }) => ({
      id: q.id,
      examId,
      content: q.content,
      type: q.type,
      difficulty: q.difficulty,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.content,
      })),
    }));
  }

  // Chấm bài: so đáp án client gửi với đáp án đúng trong DB.
  // Nếu có userId (đã đăng nhập) thì lưu ExamAttempt + ExamAnswer để
  // phục vụ thống kê và recommendation (M4).
  async submitExam(
    examId: string,
    answers: Record<string, string | string[]>,
    userId?: string,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            question: { include: { options: true } },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy đề thi ${examId}`);
    }

    let correct = 0;
    const details = exam.questions.map(({ question: q }) => {
      const correctIds = q.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id)
        .sort();
      const submitted = answers?.[q.id];
      const submittedIds = (
        Array.isArray(submitted) ? submitted : submitted ? [submitted] : []
      ).sort();
      const isCorrect =
        correctIds.length === submittedIds.length &&
        correctIds.every((id, i) => id === submittedIds[i]);
      if (isCorrect) correct++;
      return { questionId: q.id, isCorrect, correctOptionIds: correctIds };
    });

    const total = exam.questions.length;
    const percentage = total ? Math.round((correct / total) * 100) : 0;

    let attemptId: string | null = null;
    if (userId) {
      const attempt = await this.prisma.examAttempt.create({
        data: {
          examId,
          userId,
          score: correct,
          total,
          percentage,
          answers: {
            create: details.map((d) => ({
              questionId: d.questionId,
              isCorrect: d.isCorrect,
              selectedIds:
                (Array.isArray(answers?.[d.questionId])
                  ? (answers[d.questionId] as string[])
                  : answers?.[d.questionId]
                    ? [answers[d.questionId] as string]
                    : []) ?? [],
            })),
          },
        },
        select: { id: true },
      });
      attemptId = attempt.id;
    }

    return {
      success: true,
      examId,
      attemptId,
      submittedAt: new Date(),
      score: correct,
      total,
      percentage,
      details,
    };
  }

  // Lịch sử làm bài của 1 learner (phục vụ recommendation)
  async getAttempts(examId: string, userId: string) {
    return this.prisma.examAttempt.findMany({
      where: { examId, userId },
      orderBy: { createdAt: 'desc' },
      include: { answers: true },
    });
  }
}
