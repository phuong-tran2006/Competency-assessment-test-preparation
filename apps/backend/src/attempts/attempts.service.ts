import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreatePlacementDto } from './dto/create-placement.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { isAnswerCorrect, questionWeight, roundScore } from './scoring';
import { Prisma } from '@prisma/client';
import { MasteryService } from '../mastery/mastery.service';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mastery: MasteryService,
  ) {}

  private resolveTimeLimit(dto: { timeLimit?: number; durationMin?: number }, fallback: number) {
    if (dto.timeLimit !== undefined) return dto.timeLimit;
    if (dto.durationMin !== undefined) return dto.durationMin * 60;
    return fallback;
  }

  async startAttempt(userId: string | null, dto: CreateAttemptDto) {
    const timeLimit = this.resolveTimeLimit(dto, 3600);

    if (dto.examId) {
      const exam = await this.prisma.exam.findUnique({
        where: { id: dto.examId },
        include: { questions: true },
      });
      if (!exam) throw new NotFoundException('Không tìm thấy đề thi');

      const questionIds = exam.questions.map((q) => q.questionId);
      if (!questionIds.length) {
        throw new NotFoundException('Đề thi chưa có câu hỏi');
      }

      return this.createAttempt(
        userId,
        questionIds,
        dto.examId,
        timeLimit,
        questionIds.length,
      );
    }

    const requestedCount = dto.questionCount ?? 20;
    const questionIds = await this.pickRandomQuestions({
      topicIds: dto.topicIds,
      difficultyMin: dto.difficultyMin,
      difficultyMax: dto.difficultyMax,
      count: requestedCount,
    });

    if (!questionIds.length) {
      throw new NotFoundException('Không đủ câu hỏi để tạo đề');
    }

    return this.createAttempt(
      userId,
      questionIds,
      null,
      timeLimit,
      requestedCount,
    );
  }

  async startPlacement(userId: string, dto: CreatePlacementDto) {
    const requestedCount = dto.questionCount ?? 20;
    const timeLimit = this.resolveTimeLimit(dto, 1800);

    const topicIds = dto.topicIds?.length
      ? dto.topicIds
      : (await this.prisma.question.groupBy({ by: ['topicId'] })).map(
          (row) => row.topicId,
        );

    if (!topicIds.length) {
      throw new NotFoundException('Ngân hàng câu hỏi đang trống');
    }

    const questionIds = await this.pickBalancedQuestions(
      topicIds,
      requestedCount,
    );
    if (!questionIds.length) {
      throw new NotFoundException('Không đủ câu hỏi để tạo placement');
    }

    return this.createAttempt(
      userId,
      questionIds,
      null,
      timeLimit,
      requestedCount,
    );
  }

  private async createAttempt(
    userId: string | null,
    questionIds: string[],
    examId: string | null,
    timeLimit: number,
    requestedCount: number,
  ) {
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + timeLimit * 1000);

    const attempt = await this.prisma.examAttempt.create({
      data: {
        userId,
        examId,
        timeLimit,
        startedAt,
        deadlineAt,
        status: 'IN_PROGRESS',
        total: questionIds.length,
      },
    });

    await this.prisma.examAnswer.createMany({
      data: questionIds.map((qId) => ({
        attemptId: attempt.id,
        questionId: qId,
        selectedOptionIds: [],
      })),
    });

    return {
      attemptId: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      timeLimit: attempt.timeLimit,
      totalQuestions: questionIds.length,
      requestedCount,
      shortfall: Math.max(0, requestedCount - questionIds.length),
      questionIds,
    };
  }

  private async pickRandomQuestions(filters: {
    topicIds?: string[];
    difficultyMin?: number;
    difficultyMax?: number;
    count: number;
  }): Promise<string[]> {
    if (
      filters.difficultyMin !== undefined &&
      filters.difficultyMax !== undefined &&
      filters.difficultyMin > filters.difficultyMax
    ) {
      throw new BadRequestException(
        'difficultyMin không được lớn hơn difficultyMax',
      );
    }

    const where: any = {};

    if (filters.topicIds?.length) {
      where.topicId = { in: filters.topicIds };
    }

    if (
      filters.difficultyMin !== undefined ||
      filters.difficultyMax !== undefined
    ) {
      where.difficulty = {};
      if (filters.difficultyMin !== undefined) {
        where.difficulty.gte = filters.difficultyMin;
      }
      if (filters.difficultyMax !== undefined) {
        where.difficulty.lte = filters.difficultyMax;
      }
    }

    const rows = await this.prisma.question.findMany({
      where,
      select: { id: true },
    });

    return this.shuffle(rows.map((row) => row.id)).slice(
      0,
      Math.max(0, filters.count),
    );
  }

  private async pickBalancedQuestions(
    topicIds: string[],
    requested: number,
  ): Promise<string[]> {
    const rows = await this.prisma.question.findMany({
      where: { topicId: { in: topicIds } },
      select: { id: true, topicId: true },
    });

    const byTopic = new Map<string, string[]>();
    for (const row of rows) {
      const list = byTopic.get(row.topicId) ?? [];
      list.push(row.id);
      byTopic.set(row.topicId, list);
    }

    const availableTopics = [...byTopic.entries()].filter(
      ([, ids]) => ids.length > 0,
    );
    if (!availableTopics.length) return [];

    const target = Math.min(requested, rows.length);
    const quotas = new Map<string, number>(
      availableTopics.map(([topicId]) => [topicId, 0]),
    );

    let remaining = target;
    let progressed = true;

    while (remaining > 0 && progressed) {
      progressed = false;
      for (const [topicId, ids] of availableTopics) {
        if (remaining === 0) break;

        const allocated = quotas.get(topicId) ?? 0;
        if (allocated < ids.length) {
          quotas.set(topicId, allocated + 1);
          remaining -= 1;
          progressed = true;
        }
      }
    }

    const selected: string[] = [];
    for (const [topicId, ids] of availableTopics) {
      const quota = quotas.get(topicId) ?? 0;
      selected.push(...this.shuffle(ids).slice(0, quota));
    }

    return this.shuffle(selected);
  }

  private shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  async saveAnswer(
    attemptId: string,
    questionId: string,
    dto: SubmitAnswerDto,
    userId: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "exam_attempts" WHERE "id" = ${attemptId} AND "userId" = ${userId} FOR UPDATE`;
      const attempt = await tx.examAttempt.findFirst({
        where: { id: attemptId, userId },
      });
      if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
      if (attempt.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Lượt làm bài đã kết thúc');
      }

      if (this.isExpired(attempt)) {
        return { expired: true as const };
      }

      const answer = await tx.examAnswer.findUnique({
        where: { attemptId_questionId: { attemptId, questionId } },
      });
      if (!answer) {
        throw new NotFoundException('Câu hỏi không thuộc lượt làm bài này');
      }

      const selectedOptionIds = [...new Set(dto.selectedOptionIds)];
      if (selectedOptionIds.length) {
        const validOptions = await tx.questionOption.count({
          where: { questionId, id: { in: selectedOptionIds } },
        });
        if (validOptions !== selectedOptionIds.length) {
          throw new BadRequestException('Có đáp án không thuộc câu hỏi này');
        }
      }

      const updated = await tx.examAnswer.update({
        where: { attemptId_questionId: { attemptId, questionId } },
        data: {
          selectedOptionIds,
          ...(dto.timeSpent !== undefined ? { timeSpent: dto.timeSpent } : {}),
        },
      });

      return { expired: false as const, answer: {
        id: updated.id,
        attemptId: updated.attemptId,
        questionId: updated.questionId,
        selectedOptionIds: updated.selectedOptionIds,
        timeSpent: updated.timeSpent,
      } };
    });
    if (result.expired) {
      await this.finalizeAttempt(attemptId);
      throw new BadRequestException('Đã hết thời gian làm bài, bài đã được nộp tự động');
    }
    return result.answer;
  }

  async submitAttempt(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    if (attempt.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Bài thi đã được nộp');
    }

    return this.finalizeAttempt(attemptId);
  }

  async finalizeAttempt(attemptId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "exam_attempts" WHERE "id" = ${attemptId} FOR UPDATE`;
      return this.finalizeLockedAttempt(tx, attemptId);
    }, { timeout: 15000 });
  }

  private async finalizeLockedAttempt(tx: Prisma.TransactionClient, attemptId: string) {
    const attempt = await tx.examAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: { orderBy: { id: 'asc' } } },
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy bài làm');

    if (attempt.status !== 'IN_PROGRESS') {
      return {
        message: 'Bài thi đã được nộp trước đó',
        attemptId: attempt.id,
        status: attempt.status,
        score: attempt.score,
        weightedScore: attempt.weightedScore,
        total: attempt.total || attempt.answers.length,
        submittedAt: attempt.submittedAt,
      };
    }

    const now = new Date();
    const deadline = this.getDeadline(attempt);
    const submittedAt = deadline && now > deadline ? deadline : now;

    const questionIds = attempt.answers.map((a) => a.questionId);
    const questions = await tx.question.findMany({
      where: { id: { in: questionIds } },
      include: { options: true },
    });

    const byQuestion = new Map(questions.map((question) => [question.id, question]));

    let score = 0;
    let weightedScore = 0;
    const updates: Prisma.PrismaPromise<unknown>[] = [];

    const topicStats = new Map<
      string,
      {
        topicId: string;
        correct: number;
        total: number;
        weightedScore: number;
        timeSpent: number;
      }
    >();

    for (const answer of attempt.answers) {
      const question = byQuestion.get(answer.questionId);
      if (!question) continue;

      const correctOptionIds = question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id);

      const isCorrect = isAnswerCorrect(
        answer.selectedOptionIds,
        correctOptionIds,
      );
      const weight = questionWeight(question.difficulty);

      const topic = topicStats.get(question.topicId) ?? {
        topicId: question.topicId,
        correct: 0,
        total: 0,
        weightedScore: 0,
        timeSpent: 0,
      };

      topic.total += 1;
      topic.timeSpent += answer.timeSpent;

      if (isCorrect) {
        score += 1;
        weightedScore += weight;
        topic.correct += 1;
        topic.weightedScore += weight;
      }

      topicStats.set(question.topicId, topic);

      updates.push(
        tx.examAnswer.update({
          where: { id: answer.id },
          data: { isCorrect, difficultyAtSubmission: question.difficulty, topicIdAtSubmission: question.topicId },
        }),
      );
    }

    const total = attempt.total || attempt.answers.length;
    const roundedWeightedScore = roundScore(weightedScore);

    const topicRows = [...topicStats.values()].map((row) => ({
      attemptId,
      topicId: row.topicId,
      correct: row.correct,
      total: row.total,
      weightedScore: roundScore(row.weightedScore),
      timeSpent: row.timeSpent,
    }));

    await Promise.all(updates);
    await tx.attemptTopicResult.deleteMany({ where: { attemptId } });
    if (topicRows.length) await tx.attemptTopicResult.createMany({ data: topicRows });
    await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'SUBMITTED',
          submittedAt,
          score,
          weightedScore: roundedWeightedScore,
          total,
        },
    });
    await this.mastery.updateAfterGrading(tx, attemptId);

    return {
      message: 'Nộp bài thành công',
      attemptId,
      status: 'SUBMITTED',
      score,
      weightedScore: roundedWeightedScore,
      total,
      submittedAt,
    };
  }

  async autoSubmitExpired(limit = 100): Promise<number> {
    const expired = await this.prisma.examAttempt.findMany({
      where: {
        status: 'IN_PROGRESS',
        deadlineAt: { lte: new Date() },
      },
      select: { id: true },
      orderBy: { deadlineAt: 'asc' },
      take: limit,
    });

    let submitted = 0;
    for (const { id } of expired) {
      try {
        await this.finalizeAttempt(id);
        submitted += 1;
      } catch {
        continue;
      }
    }
    return submitted;
  }

  async getAttempt(attemptId: string, userId: string) {
    let attempt = await this.findAttemptDetail(attemptId, userId);
    if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');

    if (attempt.status === 'IN_PROGRESS' && this.isExpired(attempt)) {
      await this.finalizeAttempt(attemptId);
      attempt = await this.findAttemptDetail(attemptId, userId);
      if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài');
    }

    const deadline = this.getDeadline(attempt);
    const remainingSeconds =
      attempt.status === 'SUBMITTED'
        ? 0
        : deadline
          ? Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000))
          : null;

    return {
      id: attempt.id,
      status: attempt.status,
      exam: attempt.exam,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      timeLimit: attempt.timeLimit,
      deadlineAt: deadline,
      remainingSeconds,
      score: attempt.score,
      weightedScore: attempt.weightedScore,
      total: attempt.total,
      answeredCount: attempt.answers.filter(
        (a) => a.selectedOptionIds.length > 0,
      ).length,
      questions: attempt.answers.map((a) => ({
        questionId: a.questionId,
        content: a.question.content,
        type: a.question.type,
        difficulty: a.question.difficulty,
        topic: a.question.topic,
        options: a.question.options.map((o) => ({
          id: o.id,
          content: o.content,
          order: o.order,
        })),
        selectedOptionIds: a.selectedOptionIds,
        timeSpent: a.timeSpent,
      })),
    };
  }

  async getResults(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        answers: {
          include: {
            question: {
              include: {
                options: true,
                topic: { select: { id: true, name: true } },
              },
            },
          },
        },
        topicResults: {
          include: { topic: { select: { id: true, name: true } } },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy bài làm');
    if (attempt.status !== 'SUBMITTED') {
      throw new BadRequestException('Bài làm chưa được nộp, chưa có kết quả');
    }

    const details = attempt.answers.map((a) => ({
      questionId: a.questionId,
      content: a.question.content,
      explanation: a.question.explanation,
      difficulty: a.question.difficulty,
      topic: a.question.topic,
      isCorrect: a.isCorrect,
      timeSpent: a.timeSpent,
      selectedOptionIds: a.selectedOptionIds,
      correctOptionIds: a.question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id),
      options: a.question.options,
    }));

    const total = attempt.total || details.length;
    const correctCount = details.filter((d) => d.isCorrect).length;
    const unansweredCount = details.filter(
      (d) => d.selectedOptionIds.length === 0,
    ).length;
    const wrongCount = details.filter(
      (d) => !d.isCorrect && d.selectedOptionIds.length > 0,
    ).length;
    const percentage = total > 0 ? roundScore((correctCount / total) * 100) : 0;

    const maxWeightedScore = roundScore(
      details.reduce((sum, d) => sum + questionWeight(d.difficulty), 0),
    );
    const weightedPercentage =
      maxWeightedScore > 0
        ? roundScore((attempt.weightedScore / maxWeightedScore) * 100)
        : 0;

    const topicSummary = attempt.topicResults.length
      ? attempt.topicResults.map((r) => ({
          topicId: r.topicId,
          name: r.topic.name,
          correct: r.correct,
          total: r.total,
          percentage: r.total > 0 ? roundScore((r.correct / r.total) * 100) : 0,
          weightedScore: r.weightedScore,
          timeSpent: r.timeSpent,
        }))
      : this.buildTopicSummary(details);

    return {
      attemptId: attempt.id,
      status: attempt.status,
      score: attempt.score,
      weightedScore: attempt.weightedScore,
      total,
      submittedAt: attempt.submittedAt,
      summary: {
        correctCount,
        wrongCount,
        unansweredCount,
        percentage,
        weightedPercentage,
        maxWeightedScore,
      },
      topicSummary,
      details,
    };
  }

  private buildTopicSummary(
    details: Array<{
      topic: { id: string; name: string };
      isCorrect: boolean;
      timeSpent: number;
      difficulty: number;
    }>,
  ) {
    const map = new Map<
      string,
      {
        topicId: string;
        name: string;
        correct: number;
        total: number;
        weightedScore: number;
        timeSpent: number;
      }
    >();

    for (const detail of details) {
      const row = map.get(detail.topic.id) ?? {
        topicId: detail.topic.id,
        name: detail.topic.name,
        correct: 0,
        total: 0,
        weightedScore: 0,
        timeSpent: 0,
      };

      row.total += 1;
      row.timeSpent += detail.timeSpent;

      if (detail.isCorrect) {
        row.correct += 1;
        row.weightedScore += questionWeight(detail.difficulty);
      }

      map.set(detail.topic.id, row);
    }

    return [...map.values()].map((row) => ({
      ...row,
      percentage:
        row.total > 0 ? roundScore((row.correct / row.total) * 100) : 0,
      weightedScore: roundScore(row.weightedScore),
    }));
  }

  async getAnalysis(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy bài làm');
    if (attempt.status !== 'SUBMITTED') {
      throw new BadRequestException('Bài làm chưa được nộp, chưa có phân tích');
    }

    const answers = await this.prisma.examAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          include: {
            topic: { select: { id: true, name: true } },
            options: { orderBy: { order: 'asc' } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const persistedTopics = await this.prisma.attemptTopicResult.findMany({
      where: { attemptId },
      include: { topic: { select: { id: true, name: true } } },
    });

    const topicAnalysis = persistedTopics.length
      ? persistedTopics.map((r) => ({
          topicId: r.topicId,
          name: r.topic.name,
          correct: r.correct,
          total: r.total,
          totalTime: r.timeSpent,
        }))
      : this.buildTopicAnalysis(answers);

    const questionAnalysis = answers.map((a) => ({
      questionId: a.questionId,
      content: a.question.content,
      type: a.question.type,
      difficulty: a.question.difficulty,
      topic: a.question.topic,
      explanation: a.question.explanation,
      selectedOptionIds: a.selectedOptionIds,
      correctOptionIds: a.question.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id),
      isCorrect: a.isCorrect,
      timeSpent: a.timeSpent,
    }));

    const totalTime = questionAnalysis.reduce((sum, q) => sum + q.timeSpent, 0);
    const answeredCount = questionAnalysis.filter(
      (q) => q.selectedOptionIds.length > 0,
    ).length;

    return {
      attemptId,
      score: attempt.score,
      weightedScore: attempt.weightedScore,
      total: attempt.total || answers.length,
      timeAnalysis: {
        totalTime,
        answeredCount,
        averageTimePerQuestion:
          answeredCount > 0 ? roundScore(totalTime / answeredCount) : 0,
      },
      topicAnalysis,
      questionAnalysis,
    };
  }

  private buildTopicAnalysis(
    answers: Array<{
      isCorrect: boolean;
      timeSpent: number;
      question: { topic: { id: string; name: string } };
    }>,
  ) {
    const map = new Map<
      string,
      { name: string; correct: number; total: number; totalTime: number }
    >();

    for (const answer of answers) {
      const topic = answer.question.topic;
      const row = map.get(topic.id) ?? {
        name: topic.name,
        correct: 0,
        total: 0,
        totalTime: 0,
      };

      row.total += 1;
      row.totalTime += answer.timeSpent;
      if (answer.isCorrect) row.correct += 1;

      map.set(topic.id, row);
    }

    return [...map.entries()].map(([topicId, row]) => ({
      topicId,
      ...row,
    }));
  }

  async getHistory(userId: string) {
    return this.prisma.examAttempt.findMany({
      where: { userId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        score: true,
        weightedScore: true,
        total: true,
        startedAt: true,
        submittedAt: true,
        exam: { select: { id: true, title: true } },
      },
    });
  }

  private findAttemptDetail(attemptId: string, userId: string) {
    return this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        exam: { select: { id: true, title: true } },
        answers: {
          include: {
            question: {
              include: {
                topic: { select: { id: true, name: true } },
                options: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });
  }

  private getDeadline(attempt: {
    startedAt: Date;
    timeLimit: number | null;
    deadlineAt: Date | null;
  }): Date | null {
    if (attempt.deadlineAt) return attempt.deadlineAt;
    if (!attempt.timeLimit) return null;
    return new Date(attempt.startedAt.getTime() + attempt.timeLimit * 1000);
  }

  private isExpired(attempt: {
    startedAt: Date;
    timeLimit: number | null;
    deadlineAt: Date | null;
  }): boolean {
    const deadline = this.getDeadline(attempt);
    return deadline ? Date.now() >= deadline.getTime() : false;
  }
}
