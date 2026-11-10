import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

const INITIAL_RATING = 1200;
const K_FACTOR = 32;

// 4 Trụ cột năng lực chuẩn của kỳ thi ĐGNL V-ACT
const CORE_TOPICS = ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Logic - Suy luận'];

const VIETNAMESE_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function questionRating(difficulty: number): number {
  const d = Math.min(1, Math.max(0, difficulty ?? 0.5));
  return 800 + d * 1200;
}

function expectedScore(rating: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (questionRating(difficulty) - rating) / 400));
}

function updateRating(
  rating: number,
  difficulty: number,
  correct: boolean,
): number {
  const actual = correct ? 1 : 0;
  return (
    Math.round(
      (rating + K_FACTOR * (actual - expectedScore(rating, difficulty))) * 100,
    ) / 100
  );
}

function ratingToLevel(
  rating: number,
): 'Yếu' | 'Trung bình' | 'Khá' | 'Tốt' {
  if (rating < 1000) return 'Yếu';
  if (rating < 1300) return 'Trung bình';
  if (rating < 1600) return 'Khá';
  return 'Tốt';
}

function extractQuestionOrder(questionId: string): number {
  const match = String(questionId).match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  // Lấy động toàn bộ đề thi có trong Database (không hardcode danh sách ID đề thi)
  async getAllExams() {
    return this.prisma.exam.findMany({
      where: {
        questions: { some: {} },
      },
      orderBy: { id: 'desc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async getExamById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { questionId: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { order: 'asc' } },
                topic: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy bộ đề thi với mã: ${id}`);
    }

    const sortedQuestions = exam.questions
      .map((eq) => eq.question)
      .sort((a, b) => extractQuestionOrder(a.id) - extractQuestionOrder(b.id));

    return {
      ...exam,
      questions: sortedQuestions,
    };
  }

  async getQuestionsByExamId(id: string) {
    const exam = await this.getExamById(id);
    return exam.questions;
  }

  // Lấy câu hỏi từ Kho luyện tập bằng quan hệ Prisma (exams: { none: {} })
  async getQuestionsFromBankByCode(bankCode: string, count = 20) {
    const where: any = {
      exams: { none: {} },
    };

    if (bankCode === 'bank-toan') {
      where.topic = { name: { contains: 'Toán', mode: 'insensitive' } };
    } else if (bankCode === 'bank-logic') {
      where.topic = { name: { contains: 'Logic', mode: 'insensitive' } };
    } else if (
      bankCode === 'bank-tieng-viet' ||
      bankCode === 'bank-tieng-anh'
    ) {
      where.topic = {
        name: { in: ['Tiếng Việt', 'Tiếng Anh', 'Ngôn ngữ'] },
      };
    }

    let poolQuestions = await this.prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { order: 'asc' } },
        topic: { select: { id: true, name: true } },
      },
    });

    if (bankCode === 'bank-tieng-viet') {
      poolQuestions = poolQuestions.filter((q) =>
        VIETNAMESE_REGEX.test(q.content),
      );
    } else if (bankCode === 'bank-tieng-anh') {
      poolQuestions = poolQuestions.filter(
        (q) => !VIETNAMESE_REGEX.test(q.content),
      );
    }

    const shuffled = [...poolQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  async getPracticeFromBank(params: {
    topicName?: string;
    difficulty?: number;
    count: number;
  }) {
    return this.getQuestionsFromBankByCode(
      params.topicName ? `bank-${params.topicName}` : 'bank-mixed',
      params.count,
    );
  }

  async submitExam(examId: string, data: any, userId?: string) {
    const userAnswers = data.answers ? data.answers : data || {};
    const submittedQuestionIds: string[] = Array.isArray(data.questionIds)
      ? data.questionIds
      : Object.keys(userAnswers);
    const db = this.prisma as any;

    let questions: any[] = [];
    let examTitle = 'Luyện tập thích ứng theo chuyên đề';

    const examRecord = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { questionId: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { order: 'asc' } },
                topic: true,
              },
            },
          },
        },
      },
    });

    const isOfficialExam = !!examRecord;

    if (isOfficialExam) {
      examTitle = examRecord.title;
      questions = examRecord.questions
        .map((eq) => eq.question)
        .sort(
          (a, b) => extractQuestionOrder(a.id) - extractQuestionOrder(b.id),
        );
    } else {
      const fetched = await this.prisma.question.findMany({
        where: { id: { in: submittedQuestionIds } },
        include: {
          options: { orderBy: { order: 'asc' } },
          topic: true,
        },
      });
      const mapById = new Map(fetched.map((q) => [q.id, q]));
      questions = submittedQuestionIds
        .map((id) => mapById.get(id))
        .filter(Boolean);
    }

    const totalQuestions = questions.length;
    let correctCount = 0;

    let activeUserId = userId;
    if (!activeUserId) {
      const defaultLearner = await this.prisma.user.findFirst({
        where: { role: Role.STUDENT },
      });
      activeUserId = defaultLearner?.id;
    }

    // Luôn quy chuẩn Elo về đúng 4 Chuyên đề chính của kỳ thi ĐGNL
    const coreTopics = await this.prisma.topic.findMany({
      where: { name: { in: CORE_TOPICS } },
    });

    const resolveCoreTopic = (q: any) => {
      const qId = String(q.id || '');
      const name = String(q.topic?.name || '');
      let targetName = 'Toán';

      if (qId.startsWith('q-l')) {
        targetName = VIETNAMESE_REGEX.test(q.content)
          ? 'Tiếng Việt'
          : 'Tiếng Anh';
      } else if (
        qId.startsWith('q-s') ||
        name.includes('Logic') ||
        name.includes('Khoa học')
      ) {
        targetName = 'Logic - Suy luận';
      } else if (name.includes('Tiếng Việt')) {
        targetName = 'Tiếng Việt';
      } else if (name.includes('Tiếng Anh')) {
        targetName = 'Tiếng Anh';
      } else if (qId.startsWith('q-t') || name.includes('Toán')) {
        targetName = 'Toán';
      }

      const matched = coreTopics.find((t) => t.name === targetName);
      return {
        id: matched ? matched.id : q.topicId || coreTopics[0]?.id,
        name: matched ? matched.name : targetName,
      };
    };

    const existingMasteries: any[] =
      activeUserId && db.topicMastery
        ? await db.topicMastery
            .findMany({ where: { userId: activeUserId } })
            .catch(() => [])
        : [];

    const eloMap = new Map<
      string,
      {
        topicId: string;
        topicName: string;
        oldRating: number;
        newRating: number;
        correct: number;
        answered: number;
        total: number;
      }
    >();

    const details: any[] = [];

    for (const q of questions) {
      const correctOption = q.options.find((opt: any) => opt.isCorrect);
      const rawSelected = userAnswers[q.id];
      const userSelected = Array.isArray(rawSelected)
        ? rawSelected[0]
        : rawSelected;

      const isAnswered =
        userSelected !== undefined &&
        userSelected !== null &&
        userSelected !== '';
      const isCorrect =
        !!correctOption &&
        isAnswered &&
        (String(userSelected) === String(correctOption.id) ||
          Number(userSelected) === correctOption.order);

      if (isCorrect) correctCount++;

      const resolved = resolveCoreTopic(q);
      const topicId = resolved.id;
      const topicName = resolved.name;

      if (!eloMap.has(topicId)) {
        const found = existingMasteries.find(
          (m: any) => m.topicId === topicId,
        );
        const startRating = found ? found.rating : INITIAL_RATING;
        eloMap.set(topicId, {
          topicId,
          topicName,
          oldRating: startRating,
          newRating: startRating,
          correct: 0,
          answered: 0,
          total: 0,
        });
      }

      const topicStat = eloMap.get(topicId)!;
      topicStat.total += 1;

      if (isAnswered) {
        topicStat.answered += 1;
        if (isCorrect) topicStat.correct += 1;
        const normDiff =
          q.difficulty >= 100
            ? 0.5
            : q.difficulty > 1
              ? Math.min(1, q.difficulty / 4)
              : q.difficulty ?? 0.5;
        topicStat.newRating = updateRating(
          topicStat.newRating,
          normDiff,
          isCorrect,
        );
      }

      details.push({
        questionId: q.id,
        isCorrect,
        selectedOptionId: userSelected || null,
        correctOptionId: correctOption?.id || null,
        explanation: q.explanation,
        topicName,
      });
    }

    const eloChanges = Array.from(eloMap.values()).map((item) => ({
      ...item,
      delta: Math.round((item.newRating - item.oldRating) * 100) / 100,
      level: ratingToLevel(item.newRating),
    }));

    if (activeUserId) {
      if (db.topicMastery) {
        for (const item of eloChanges) {
          if (item.answered > 0) {
            await db.topicMastery
              .upsert({
                where: {
                  userId_topicId: {
                    userId: activeUserId,
                    topicId: item.topicId,
                  },
                },
                update: {
                  rating: item.newRating,
                  attempts: { increment: item.answered },
                },
                create: {
                  userId: activeUserId,
                  topicId: item.topicId,
                  rating: item.newRating,
                  attempts: item.answered,
                },
              })
              .catch(() => null);
          }
        }
      }

      if (isOfficialExam) {
        await this.prisma.examAttempt
          .create({
            data: {
              userId: activeUserId,
              examId,
              status: 'SUBMITTED',
              startedAt: new Date(Date.now() - 15 * 60 * 1000),
              submittedAt: new Date(),
              score: correctCount,
              weightedScore: correctCount * 10,
              total: totalQuestions,
            },
          })
          .catch(() => null);
      }
    }

    const percentage =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      success: true,
      message: 'Nộp bài và cập nhật hệ thống Elo thành công!',
      examId,
      examTitle,
      correctAnswers: correctCount,
      totalQuestions,
      score: percentage,
      vactScore: Math.round((correctCount / Math.max(1, totalQuestions)) * 1200),
      eloChanges,
      details,
      submittedAt: new Date(),
    };
  }

  // Chỉ hiển thị đúng 4 Chuyên đề chính trên Hồ sơ Năng lực Elo
  async getLearnerDashboard(userId?: string) {
    const db = this.prisma as any;
    let targetUserId = userId;
    if (!targetUserId) {
      const defaultLearner = await this.prisma.user.findFirst({
        where: { role: Role.STUDENT },
      });
      targetUserId = defaultLearner?.id;
    }

    const allTopics = await this.prisma.topic.findMany({
      where: { name: { in: CORE_TOPICS } },
      include: { _count: { select: { questions: true } } },
    });

    allTopics.sort(
      (a, b) => CORE_TOPICS.indexOf(a.name) - CORE_TOPICS.indexOf(b.name),
    );

    const masteries: any[] =
      targetUserId && db.topicMastery
        ? await db.topicMastery
            .findMany({ where: { userId: targetUserId } })
            .catch(() => [])
        : [];

    const eloProfile = allTopics.map((t) => {
      const found = masteries.find((m: any) => m.topicId === t.id);
      const rating = found ? Math.round(found.rating) : INITIAL_RATING;
      return {
        topicId: t.id,
        topicName: t.name,
        questionBankCount: t._count.questions,
        rating,
        attempts: found ? found.attempts : 0,
        level: ratingToLevel(rating),
      };
    });

    const attempts = targetUserId
      ? await this.prisma.examAttempt.findMany({
          where: { userId: targetUserId, status: 'SUBMITTED' },
          orderBy: { submittedAt: 'desc' },
          take: 15,
          include: { exam: { select: { id: true, title: true } } },
        })
      : [];

    return {
      eloProfile,
      attempts,
    };
  }

  async getAttempts(examId: string) {
    return this.prisma.examAttempt.findMany({
      where: { examId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async createExam(data: { id?: string; title: string; description?: string }) {
    const examId = data.id || `exam-${Date.now()}`;
    return this.prisma.exam.create({
      data: {
        id: examId,
        title: data.title || 'Bộ đề thi mới',
        description: data.description || '',
      },
    });
  }
}