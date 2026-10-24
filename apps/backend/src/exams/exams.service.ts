import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptsService } from '../attempts/attempts.service';
import {
  isAnswerCorrect,
  questionWeight,
  roundScore,
} from '../attempts/scoring';

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attempts: AttemptsService,
  ) {}

  async getAllExams() {
    return this.prisma.exam.findMany({
      include: { _count: { select: { questions: true } } },
    });
  }

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
      throw new NotFoundException('Không tìm thấy đề');
    }

    return exam.questions.map((eq) => ({
      id: eq.question.id,
      examId,
      content: eq.question.content,
      options: eq.question.options.map((opt) => ({
        id: opt.id,
        text: opt.content,
      })),
    }));
  }

  async submitExam(
    examId: string,
    userId: string | null,
    answers: Record<string, string[]>,
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: { question: { include: { options: true } } },
        },
      },
    });
    if (!exam) throw new NotFoundException('Không tìm thấy đề thi');

    let score = 0;
    let weightedScore = 0;

    const details: Array<{
      questionId: string;
      isCorrect: boolean;
      correctOptionIds: string[];
      selectedOptionIds: string[];
      explanation: string | null;
    }> = [];

    const examAnswersToCreate: Array<{
      questionId: string;
      isCorrect: boolean;
      selectedOptionIds: string[];
    }> = [];

    for (const eq of exam.questions) {
      const question = eq.question;
      const selectedOptionIds = answers[question.id] || [];
      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id);

      const isCorrect = isAnswerCorrect(
        selectedOptionIds,
        correctOptionIds,
      );

      if (isCorrect) {
        score += 1;
        weightedScore += questionWeight(question.difficulty);
      }

      details.push({
        questionId: question.id,
        isCorrect,
        correctOptionIds,
        selectedOptionIds,
        explanation: question.explanation,
      });

      examAnswersToCreate.push({
        questionId: question.id,
        isCorrect,
        selectedOptionIds,
      });
    }

    const total = exam.questions.length;

    let attemptId: string | null = null;
    let finalScore = score;
    let finalWeightedScore = roundScore(weightedScore);

    if (userId) {
      const now = new Date();
      const attempt = await this.prisma.examAttempt.create({
        data: {
          userId,
          examId,
          status: 'IN_PROGRESS',
          startedAt: now,
          deadlineAt: null,
          timeLimit: null,
          total,
          answers: { create: examAnswersToCreate },
        },
      });

      const finalized = await this.attempts.finalizeAttempt(attempt.id);
      finalScore = finalized.score;
      finalWeightedScore = finalized.weightedScore;
      attemptId = attempt.id;
    }

    const percentage = total > 0 ? (finalScore / total) * 100 : 0;

    return {
      score: finalScore,
      weightedScore: finalWeightedScore,
      total,
      percentage,
      details,
      attemptId,
    };
  }

  async getAttempts(examId: string, userId: string) {
    return this.prisma.examAttempt.findMany({
      where: { examId, userId },
      include: { answers: true },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
