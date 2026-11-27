import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { questionSnapshot } from '../../src/attempts/question-snapshot';
import { questionWeight, roundScore } from '../../src/attempts/scoring';
import { INITIAL_RATING, updateRating } from '../../src/mastery/elo';
import { seedAssessmentData } from './seed-assessment';
import { SeedConfig } from './seed-config';

export const DEMO_ATTEMPT_IDS = ['demo-attempt-2024', 'demo-attempt-2025', 'demo-attempt-2026'];

/** Serialized and atomic. Existing account passwords and learner history are preserved. */
export async function seedSystem(prisma: PrismaClient, config: SeedConfig) {
  const accounts = await Promise.all(config.accounts.map(async (account) => ({
    ...account, passwordHash: await bcrypt.hash(account.password, 10),
  })));
  return prisma.$transaction(async (tx) => {
    const assessment = await seedAssessmentData(tx);
    const users = new Map<string, string>();
    for (const { password: _password, ...account } of accounts) {
      const existing = await tx.user.findUnique({ where: { email: account.email } });
      if (existing && (existing.role !== account.role || existing.status !== 'ACTIVE')) {
        throw new Error('Tài khoản seed đã tồn tại nhưng sai role/status: ' + account.email);
      }
      const user = await tx.user.upsert({
        where: { email: account.email }, update: {}, create: { ...account, status: 'ACTIVE' },
      });
      users.set(account.role, user.id);
    }
    if (config.mode === 'demo') {
      await seedDemoCourse(tx, users.get('INSTRUCTOR')!, users.get('STUDENT')!);
      await seedDemoHistory(tx, users.get('STUDENT')!);
    }
    return { mode: config.mode, ...assessment, accounts: accounts.map(({ email, role }) => ({ email, role })) };
  }, { timeout: 120000 });
}

async function seedDemoCourse(tx: Prisma.TransactionClient, instructorId: string, studentId: string) {
  const course = {
    title: 'Toán nền tảng ĐGNL', description: 'Ôn tập giới hạn, đạo hàm và ứng dụng trong bài thi ĐGNL.',
    instructorId, status: 'PUBLISHED' as const,
  };
  await tx.course.upsert({ where: { id: 'course-1' }, create: { id: 'course-1', ...course }, update: course });
  const topic = await tx.topic.findUniqueOrThrow({ where: { name: 'Toán' } });
  await tx.courseTopic.upsert({
    where: { courseId_topicId: { courseId: 'course-1', topicId: topic.id } }, update: {},
    create: { courseId: 'course-1', topicId: topic.id, order: 1 },
  });
  for (const [id, title, order] of [
    ['chapter-1', 'Chương 1: Giới hạn và liên tục', 1],
    ['chapter-2', 'Chương 2: Đạo hàm', 2],
  ] as const) {
    await tx.chapter.upsert({ where: { id }, update: {}, create: { id, courseId: 'course-1', title, order } });
  }
  const lessons = [
    { id: 'lesson-1', chapterId: 'chapter-1', title: 'Bài 1: Khái niệm giới hạn', order: 1,
      content: 'Giới hạn của hàm số mô tả giá trị mà hàm số tiến tới khi biến số tiến gần một điểm.' },
    { id: 'lesson-2', chapterId: 'chapter-1', title: 'Bài 2: Các dạng giới hạn thường gặp', order: 2,
      content: 'Với dạng vô định 0/0, thử phân tích nhân tử rồi rút gọn trước khi tính giới hạn.' },
    { id: 'lesson-3', chapterId: 'chapter-2', title: 'Bài 1: Định nghĩa đạo hàm', order: 1,
      content: 'Đạo hàm tại một điểm là giới hạn của tỉ số giữa số gia hàm số và số gia đối số.' },
  ];
  for (const lesson of lessons) {
    await tx.lesson.upsert({ where: { id: lesson.id }, update: {}, create: lesson });
  }
  await tx.material.upsert({
    where: { id: 'demo-material-limits' }, update: {},
    create: { id: 'demo-material-limits', lessonId: 'lesson-1', type: 'TEXT', title: 'Ví dụ có lời giải',
      content: 'Tính lim(x→1) (x²−1)/(x−1). Rút gọn thành x+1, suy ra giới hạn bằng 2.', order: 1 },
  });
  await tx.enrollment.upsert({
    where: { userId_courseId: { userId: studentId, courseId: 'course-1' } }, update: {},
    create: { userId: studentId, courseId: 'course-1' },
  });
  await tx.lessonProgress.upsert({
    where: { userId_lessonId: { userId: studentId, lessonId: 'lesson-1' } }, update: {},
    create: { userId: studentId, lessonId: 'lesson-1', isCompleted: true, completedAt: new Date('2026-11-16T08:00:00Z') },
  });
}

/** Reuse grading/snapshot/Elo functions; ratings come from the simulated answers. */
async function seedDemoHistory(tx: Prisma.TransactionClient, userId: string) {
  const existing = await tx.examAttempt.findMany({ where: { id: { in: DEMO_ATTEMPT_IDS } } });
  if (existing.length === DEMO_ATTEMPT_IDS.length && existing.every((attempt) =>
    attempt.userId === userId && attempt.status === 'SUBMITTED' && attempt.examId === 'vact-exam-' + attempt.id.slice(-4))) return;
  if (existing.length) throw new Error('Lịch sử demo không đầy đủ hoặc sai tài khoản; kiểm tra trước khi seed lại');
  const ratings = new Map<string, { masteryScore: number; attempts: number }>();
  for (const [index, id] of DEMO_ATTEMPT_IDS.entries()) {
    const links = await tx.examQuestion.findMany({
      where: { examId: 'vact-exam-' + (2024 + index) }, orderBy: { order: 'asc' },
      include: { question: { include: { options: { orderBy: { order: 'asc' } }, topic: true } } },
    });
    const startedAt = new Date(Date.UTC(2026, 10, 17 + index, 8));
    const submittedAt = new Date(startedAt.getTime() + 80 * 60 * 1000);
    const topics = new Map<string, { topicId: string; correct: number; total: number; weightedScore: number; timeSpent: number }>();
    let score = 0;
    let weightedScore = 0;
    const answers = links.map(({ question }, order) => {
      // Accuracy increases across attempts, with wrong and unanswered items as well.
      const correct = order % 10 < 5 + index;
      const skipped = order % 10 === 9;
      const choice = skipped ? undefined : question.options.find((option) => option.isCorrect === correct)!;
      const timeSpent = 25 + order % 30;
      const row = topics.get(question.topicId) ?? { topicId: question.topicId, correct: 0, total: 0, weightedScore: 0, timeSpent: 0 };
      row.total += 1;
      row.timeSpent += timeSpent;
      if (correct) {
        score += 1; weightedScore += questionWeight(question.difficulty);
        row.correct += 1; row.weightedScore += questionWeight(question.difficulty);
      }
      topics.set(question.topicId, row);
      if (choice) {
        const rating = ratings.get(question.topicId) ?? { masteryScore: INITIAL_RATING, attempts: 0 };
        rating.masteryScore = updateRating(rating.masteryScore, question.difficulty, correct);
        rating.attempts += 1;
        ratings.set(question.topicId, rating);
      }
      return {
        id: id + '-answer-' + String(order).padStart(3, '0'), questionId: question.id,
        isCorrect: correct, timeSpent, selectedOptionIds: choice ? [choice.id] : [],
        questionSnapshot: questionSnapshot(question), difficultyAtSubmission: question.difficulty,
        topicIdAtSubmission: question.topicId,
      };
    });
    await tx.examAttempt.create({ data: {
      id, userId, examId: 'vact-exam-' + (2024 + index), status: 'SUBMITTED', startedAt, submittedAt,
      deadlineAt: new Date(startedAt.getTime() + 90 * 60 * 1000), timeLimit: 5400,
      masteryUpdatedAt: submittedAt, score, weightedScore: roundScore(weightedScore), total: links.length,
      answers: { create: answers },
      topicResults: { create: [...topics.values()].map((row) => ({ ...row, weightedScore: roundScore(row.weightedScore) })) },
    } });
  }
  for (const [topicId, rating] of ratings) {
    await tx.topicMastery.upsert({
      where: { userId_topicId: { userId, topicId } }, update: {}, create: { userId, topicId, ...rating },
    });
  }
}
