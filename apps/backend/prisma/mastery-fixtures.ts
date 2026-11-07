import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { INITIAL_RATING, updateRating } from '../src/mastery/elo';
import { isAnswerCorrect, questionWeight, roundScore } from '../src/attempts/scoring';
import { PREREQUISITE_GRAPH_LOCK_ID, wouldCreateCycle } from '../src/topics/prerequisite-graph';

export const MASTERY_DEMO_TOPICS = [
  { id: 'mastery-demo-basics', name: 'Demo mastery: Nền tảng đại số', questions: ['2 + 3 bằng bao nhiêu?', 'Giá trị của 3 × (2 + 1) là bao nhiêu?'], correct: ['5', '9'] },
  { id: 'mastery-demo-equations', name: 'Demo mastery: Phương trình', questions: ['Nghiệm của x + 2 = 5 là bao nhiêu?', 'Nghiệm của 2x - 3 = 7 là bao nhiêu?'], correct: ['3', '5'] },
  { id: 'mastery-demo-functions', name: 'Demo mastery: Hàm số', questions: ['Với f(x) = 2x, f(3) bằng bao nhiêu?', 'Với f(x) = x² - 1, f(3) bằng bao nhiêu?'], correct: ['6', '8'] },
  { id: 'mastery-demo-statistics', name: 'Demo mastery: Thống kê', questions: ['Trung bình của 2 và 4 là bao nhiêu?', 'Trung vị của 1, 3, 7, 9, 11 là bao nhiêu?'], correct: ['3', '7'] },
  { id: 'mastery-demo-probability', name: 'Demo mastery: Xác suất', questions: ['Gieo xúc xắc cân đối, xác suất ra mặt 6 là bao nhiêu?', 'Tung hai đồng xu cân đối, xác suất có hai mặt ngửa là bao nhiêu?'], correct: ['1/6', '1/4'] },
];

export const MASTERY_DEMO_SCENARIOS = ['weak', 'blocked', 'mastered', 'new'] as const;

/** Dedicated demo IDs only. Re-running resets these fixtures, never other accounts. */
export async function seedMasteryFixtures(prisma: PrismaClient) {
  for (const topic of MASTERY_DEMO_TOPICS) {
    await prisma.topic.upsert({ where: { id: topic.id }, create: { id: topic.id, name: topic.name }, update: { name: topic.name } });
    for (let index = 0; index < 2; index += 1) {
      const id = `${topic.id}-q${index + 1}`;
      await prisma.question.upsert({
        where: { id },
        create: { id, topicId: topic.id, content: topic.questions[index], difficulty: index ? 0.75 : 0.25, source: 'mastery-demo' },
        update: { topicId: topic.id, content: topic.questions[index], difficulty: index ? 0.75 : 0.25 },
      });
      for (const correct of [true, false]) {
        const optionId = `${id}-${correct ? 'correct' : 'wrong'}`;
        const data = { questionId: id, content: correct ? topic.correct[index] : 'Không có đáp án đúng', isCorrect: correct, order: correct ? 0 : 1 };
        await prisma.questionOption.upsert({ where: { id: optionId }, create: { id: optionId, ...data }, update: data });
      }
    }
  }
  const edges = [
    { topicId: 'mastery-demo-equations', prerequisiteId: 'mastery-demo-basics' },
    { topicId: 'mastery-demo-functions', prerequisiteId: 'mastery-demo-equations' },
    { topicId: 'mastery-demo-statistics', prerequisiteId: 'mastery-demo-basics' },
    { topicId: 'mastery-demo-probability', prerequisiteId: 'mastery-demo-statistics' },
  ];
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(${PREREQUISITE_GRAPH_LOCK_ID}::bigint)`;
    const current = await tx.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } });
    for (const edge of edges) {
      if (current.some((row) => row.topicId === edge.topicId && row.prerequisiteId === edge.prerequisiteId)) continue;
      if (wouldCreateCycle(current, edge.topicId, edge.prerequisiteId)) throw new Error('Demo prerequisite would create a cycle');
      await tx.topicPrerequisite.create({ data: edge });
      current.push(edge);
    }
  });
  const questions = await prisma.question.findMany({
    where: { topicId: { in: MASTERY_DEMO_TOPICS.map((topic) => topic.id) }, source: 'mastery-demo' },
    include: { options: true }, orderBy: { id: 'asc' },
  });
  const passwordHash = await bcrypt.hash('MasteryDemo@123', 10);
  for (const scenario of MASTERY_DEMO_SCENARIOS) {
    const userId = `mastery-demo-${scenario}`;
    const email = `mastery.${scenario}@example.test`;
    await prisma.user.upsert({ where: { id: userId },
      create: { id: userId, email, fullName: `Mastery demo: ${scenario}`, passwordHash, role: Role.STUDENT },
      update: { email, passwordHash, role: Role.STUDENT, status: 'ACTIVE' },
    });
    const ratings = new Map<string, { masteryScore: number; attempts: number }>();
    const rounds = scenario === 'new' ? 0 : 20;
    for (let round = 0; round < rounds; round += 1) {
      const attemptId = `${userId}-attempt-${String(round).padStart(2, '0')}`;
      const submittedAt = new Date(Date.UTC(2026, 9, 1, 0, round * 10));
      let score = 0;
      let weightedScore = 0;
      const answers = questions.map((question, index) => {
        const correct = scenario === 'mastered' || (scenario === 'blocked' && question.topicId !== 'mastery-demo-basics');
        const chosen = question.options.find((option) => option.isCorrect === correct)!;
        const selectedOptionIds = [chosen.id];
        const isCorrect = isAnswerCorrect(selectedOptionIds, question.options.filter((option) => option.isCorrect).map((option) => option.id));
        if (isCorrect) { score += 1; weightedScore += questionWeight(question.difficulty); }
        const previous = ratings.get(question.topicId) ?? { masteryScore: INITIAL_RATING, attempts: 0 };
        ratings.set(question.topicId, { masteryScore: updateRating(previous.masteryScore, question.difficulty, isCorrect), attempts: previous.attempts + 1 });
        return { id: `${attemptId}-answer-${String(index).padStart(2, '0')}`, questionId: question.id,
          selectedOptionIds, isCorrect, timeSpent: 30,
          topicIdAtSubmission: question.topicId, difficultyAtSubmission: question.difficulty };
      });
      const data = { userId, status: 'SUBMITTED' as const, total: questions.length, score, weightedScore: roundScore(weightedScore),
        startedAt: new Date(submittedAt.getTime() - 300000), deadlineAt: submittedAt, submittedAt, timeLimit: 300, masteryUpdatedAt: submittedAt };
      await prisma.examAttempt.upsert({ where: { id: attemptId },
        create: { id: attemptId, ...data, answers: { create: answers } },
        update: { ...data, answers: { deleteMany: {}, create: answers } },
      });
    }
    for (const topic of MASTERY_DEMO_TOPICS) {
      const value = ratings.get(topic.id);
      if (!value) continue; // cold start is represented by the absence of evidence, not fake scores.
      await prisma.topicMastery.upsert({ where: { userId_topicId: { userId, topicId: topic.id } },
        create: { userId, topicId: topic.id, ...value }, update: value,
      });
    }
  }
  return { users: MASTERY_DEMO_SCENARIOS.map((scenario) => `mastery-demo-${scenario}`), topics: MASTERY_DEMO_TOPICS.map((topic) => topic.id) };
}
