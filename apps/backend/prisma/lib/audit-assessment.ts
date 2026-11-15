import { PrismaClient } from '@prisma/client';
import { INITIAL_RATING, K_FACTOR } from '../../src/mastery/elo';
import { answerQuestion } from '../../src/attempts/question-snapshot';
import { isAnswerCorrect, questionWeight, roundScore } from '../../src/attempts/scoring';
import { BankQ, EXAM_BLUEPRINT, EXAM_QUESTION_COUNT, readBanks, readCatalog } from './question-bank';

/** Read-only checks of imported data, annual composition and stored answer snapshots. */
export async function auditAssessment(prisma: PrismaClient) {
  const catalog = readCatalog();
  const banks = readBanks();
  const [questions, exams, attempts, masteries, roles] = await Promise.all([
    prisma.question.findMany({ include: { options: true, topic: true } }),
    prisma.exam.findMany({ include: { questions: { orderBy: { order: 'asc' } } } }),
    prisma.examAttempt.findMany({
      where: { status: 'SUBMITTED' },
      include: { answers: { include: { question: { include: { options: true, topic: true } } } } },
    }),
    prisma.topicMastery.findMany(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
  ]);
  const issues: string[] = [];
  const byId = new Map(questions.map((question) => [question.id, question]));
  const distribution: Record<string, number> = {};
  for (const question of questions) {
    if (!Number.isFinite(question.difficulty) || question.difficulty < 0 || question.difficulty > 1) {
      issues.push(question.id + ': difficulty ngoài [0,1]');
    }
    if (!question.content.trim() || question.options.length < 2 || question.options.some((option) => !option.content.trim()) ||
      question.options.filter((option) => option.isCorrect).length !== 1) {
      issues.push(question.id + ': nội dung/options/đáp án không hợp lệ');
    }
    distribution[String(question.difficulty)] = (distribution[String(question.difficulty)] ?? 0) + 1;
  }

  function inspectQuestion(id: string, source: BankQ) {
    const stored = byId.get(id);
    const content = source.passage ? source.passage + '\n\n' + source.content : source.content;
    if (!stored || stored.content !== content || stored.explanation !== (source.explanation ?? null) ||
      stored.topic.name !== source.topicId || stored.difficulty !== source.difficulty ||
      stored.options.length !== source.options.length ||
      stored.options.some((option) => option.content !== source.options[option.order] || option.isCorrect !== (option.order === source.correct))) {
      issues.push(id + ': dữ liệu khác JSON');
    }
    if (source.source && stored?.source !== source.source.pdf + '#page=' + source.source.page + '&question=' + source.n) {
      issues.push(id + ': mất trang nguồn PDF');
    }
  }
  const bankIds = new Set<string>();
  for (const bank of banks) {
    for (const question of bank.items) {
      const id = bank.prefix + question.n;
      bankIds.add(id);
      inspectQuestion(id, question);
    }
  }
  const englishOwners = new Map<string, string>();
  const annual = catalog.map((source) => {
    const exam = exams.find((exam) => exam.id === source.id);
    const links = exam?.questions ?? [];
    const allowedIds = new Set(bankIds);
    for (const question of source.questions) {
      const id = 'q-' + source.year + '-' + question.n;
      allowedIds.add(id);
      inspectQuestion(id, question);
      if (!links.some((link) => link.questionId === id)) issues.push(source.id + ': thiếu câu năm ' + id);
    }
    if (links.length !== EXAM_QUESTION_COUNT) issues.push(source.id + ': cần đủ ' + EXAM_QUESTION_COUNT + ' câu');
    links.forEach((link, order) => {
      if (!allowedIds.has(link.questionId) || link.order !== order) issues.push(source.id + ': sai nguồn/thứ tự ' + link.questionId);
      const question = byId.get(link.questionId);
      if (question?.topic.name === 'Tiếng Anh') {
        const key = question.content.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const owner = englishOwners.get(key);
        if (owner) issues.push(source.id + ': câu Tiếng Anh trùng với ' + owner);
        englishOwners.set(key, source.id);
      }
    });
    const groups = Object.fromEntries(EXAM_BLUEPRINT.map((group) => {
      const count = links.filter((link) => group.topics.includes(byId.get(link.questionId)?.topic.name ?? '')).length;
      if (count !== group.count) issues.push(source.id + ': ' + group.name + ' cần ' + group.count + ' câu');
      return [group.name, count];
    }));
    return { examId: source.id, questions: links.length, groups };
  });

  let missingSnapshots = 0;
  for (const attempt of attempts) {
    let score = 0;
    let weighted = 0;
    for (const answer of attempt.answers) {
      if (!answer.questionSnapshot) missingSnapshots += 1;
      const question = answerQuestion(answer);
      const correct = isAnswerCorrect(answer.selectedOptionIds, question.options.filter((option) => option.isCorrect).map((option) => option.id));
      if (correct !== answer.isCorrect) issues.push(answer.id + ': isCorrect khác snapshot');
      if (correct) { score += 1; weighted += questionWeight(question.difficulty); }
    }
    if (attempt.total !== attempt.answers.length || score !== attempt.score || roundScore(weighted) !== attempt.weightedScore) {
      issues.push(attempt.id + ': tổng câu/điểm khác answers');
    }
  }
  for (const mastery of masteries) {
    if (!Number.isFinite(mastery.masteryScore) || mastery.attempts < 0) issues.push(mastery.id + ': mastery không hợp lệ');
  }
  if (missingSnapshots) issues.push('Thiếu snapshot ở ' + missingSnapshots + ' đáp án đã nộp');
  return {
    annual, roles, questions: questions.length, difficultyDistribution: distribution,
    submittedAttempts: attempts.length, missingSnapshots, masteryRows: masteries.length,
    elo: { initialRating: INITIAL_RATING, k: K_FACTOR, calibration: 'Chưa đánh giá trên dữ liệu người học thật' },
    issues,
  };
}
