import { Prisma, PrismaClient } from '@prisma/client';
import {
  BankQ, EXAM_BLUEPRINT, LoadedBank, LoadedExam,
  readBanks, readCatalog, TOPIC_NAMES,
} from './question-bank';

export interface ExamQuestionSource {
  id: string;
  question: BankQ;
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}

/** Keep annual source questions and valid previous selections, then fill each quota. */
export function selectExamQuestions(
  exam: LoadedExam,
  banks: LoadedBank[],
  existingIds: string[] = [],
  usedEnglishIds: ReadonlySet<string> = new Set(),
): ExamQuestionSource[] {
  const required = exam.questions.map((question) => ({
    id: 'q-' + exam.year + '-' + question.n,
    question,
  }));
  const pool = banks.flatMap((bank) => bank.items.map((question) => ({
    id: bank.prefix + question.n,
    question,
  }))).filter((item) => item.question.topicId !== 'Tiếng Anh' || !usedEnglishIds.has(item.id));
  const byId = new Map(pool.map((item) => [item.id, item]));
  const selected: ExamQuestionSource[] = [];
  for (const group of EXAM_BLUEPRINT) {
    const fixed = required.filter((item) => group.topics.includes(item.question.topicId));
    if (fixed.length > group.count) throw new Error(exam.id + ': quá số câu ' + group.name);
    const retained = [...new Set(existingIds)]
      .map((id) => byId.get(id))
      .filter((item): item is ExamQuestionSource => !!item && group.topics.includes(item.question.topicId))
      .slice(0, group.count - fixed.length);
    const retainedIds = new Set(retained.map((item) => item.id));
    const candidates = pool.filter((item) =>
      group.topics.includes(item.question.topicId) && !retainedIds.has(item.id));
    const shortfall = group.count - fixed.length - retained.length;
    if (candidates.length < shortfall) throw new Error(exam.id + ': thiếu câu ' + group.name);
    selected.push(...fixed, ...retained, ...shuffle(candidates).slice(0, shortfall));
  }
  return selected;
}

/** Validate before writing. Serialize seed runs and import all data atomically. */
export async function seedAssessment(prisma: PrismaClient) {
  return prisma.$transaction(seedAssessmentData, { timeout: 120000 });
}

/** Also used inside the full seed transaction so accounts/history commit together. */
export async function seedAssessmentData(tx: Prisma.TransactionClient) {
  const banks = readBanks();
  const exams = readCatalog();
  const plannedEnglishIds = new Set<string>();
  for (const exam of exams) {
    const selected = selectExamQuestions(exam, banks, [], plannedEnglishIds);
    for (const item of selected) {
      if (item.question.topicId === 'Tiếng Anh') plannedEnglishIds.add(item.id);
    }
  }

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('assessment-seed'))`;
  const topicIds = new Map<string, string>();
  for (const name of TOPIC_NAMES) {
    const topic = await tx.topic.upsert({ where: { name }, create: { name }, update: {} });
    topicIds.set(name, topic.id);
  }
  for (const bank of banks) {
    for (const question of bank.items) {
      await seedQuestion(tx, bank.prefix + question.n, question, topicIds.get(question.topicId)!, bank.file);
    }
  }

  const reports: Array<{ id: string; questions: number; groups: Record<string, number> }> = [];
  const usedEnglishIds = new Set<string>();
  for (const exam of exams) {
    const description = '120 câu luyện tập, gồm 30 Tiếng Việt, 30 Tiếng Anh, 30 Toán và 30 Logic/Suy luận khoa học. Tiếng Anh gồm câu bổ sung và câu ngân hàng, được phân bổ riêng giữa ba năm.';
    await tx.exam.upsert({
      where: { id: exam.id },
      create: { id: exam.id, title: exam.title, description },
      update: { title: exam.title, description },
    });
    const existing = await tx.examQuestion.findMany({
      where: { examId: exam.id }, orderBy: [{ order: 'asc' }, { questionId: 'asc' }],
    });
    const selected = selectExamQuestions(exam, banks, existing.map((link) => link.questionId), usedEnglishIds);
    for (const item of selected) {
      if (item.question.topicId === 'Tiếng Anh') usedEnglishIds.add(item.id);
    }
    for (const question of exam.questions) {
      await seedQuestion(tx, 'q-' + exam.year + '-' + question.n, question, topicIds.get(question.topicId)!, exam.file);
    }
    for (const [order, item] of selected.entries()) {
      await tx.examQuestion.upsert({
        where: { examId_questionId: { examId: exam.id, questionId: item.id } },
        create: { examId: exam.id, questionId: item.id, order },
        update: { order },
      });
    }
    await tx.examQuestion.deleteMany({
      where: { examId: exam.id, questionId: { notIn: selected.map((item) => item.id) } },
    });
    reports.push({
      id: exam.id, questions: selected.length,
      groups: Object.fromEntries(EXAM_BLUEPRINT.map((group) => [
        group.name, selected.filter((item) => group.topics.includes(item.question.topicId)).length,
      ])),
    });
  }
  return { bankQuestions: banks.reduce((sum, bank) => sum + bank.items.length, 0), exams: reports };
}

export async function seedQuestion(tx: Prisma.TransactionClient, id: string, q: BankQ, topicId: string, source: string) {
  const fields = {
    content: q.passage ? q.passage + '\n\n' + q.content : q.content,
    explanation: q.explanation ?? null, difficulty: q.difficulty, topicId,
    source: q.source ? q.source.pdf + '#page=' + q.source.page + '&question=' + q.n : source,
  };
  await tx.question.upsert({ where: { id }, create: { id, ...fields }, update: fields });
  for (const [order, content] of q.options.entries()) {
    const fields = { content, isCorrect: order === q.correct };
    // Historical selectedOptionIds continue to point to the same options.
    await tx.questionOption.upsert({
      where: { questionId_order: { questionId: id, order } },
      create: { id: id + '-option-' + order, questionId: id, order, ...fields },
      update: fields,
    });
  }
  await tx.questionOption.deleteMany({ where: { questionId: id, order: { gte: q.options.length } } });
}
