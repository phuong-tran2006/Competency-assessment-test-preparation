// apps/backend/prisma/seed_bank.ts
import 'dotenv/config';
import { PrismaClient, QuestionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type BankQ = {
  n: number;
  content: string;
  options: string[];
  correct: number;
  topicId?: string;
  difficulty: number;
  passage?: string;
};

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function inferTopicByOrder(n: number, total: number, explicitTopic?: string): string {
  if (explicitTopic) return explicitTopic;
  // Phân bổ tự động theo tỷ lệ cấu trúc đề ĐGNL (25% Tiếng Việt, 25% Tiếng Anh, 25% Toán, 25% Logic - Suy luận)
  const quarter = Math.ceil(total / 4);
  if (n <= quarter) return 'Tiếng Việt';
  if (n <= quarter * 2) return 'Tiếng Anh';
  if (n <= quarter * 3) return 'Toán';
  return 'Logic - Suy luận';
}

async function upsertQuestionWithOptions(
  qId: string,
  q: BankQ,
  topicId: string,
) {
  const content = q.passage
    ? `${stripHtml(q.content)}\n\n[Đoạn văn]\n${stripHtml(q.passage)}`
    : stripHtml(q.content);

  const opts = q.options.map((text, i) => ({
    content: stripHtml(text),
    isCorrect: i === q.correct,
    order: i,
  }));

  const fields = {
    content,
    explanation: null as string | null,
    topicId,
    difficulty: q.difficulty ?? 0.5,
  };

  await prisma.$transaction(async (tx) => {
    await tx.question.upsert({
      where: { id: qId },
      update: fields,
      create: { id: qId, type: QuestionType.MULTIPLE_CHOICE, ...fields },
    });
    await tx.questionOption.deleteMany({ where: { questionId: qId } });
    await tx.questionOption.createMany({
      data: opts.map((o) => ({ questionId: qId, ...o })),
    });
  });
}

async function main() {
  const allFiles = fs.readdirSync(__dirname);

  // 1. Tự động quét tất cả các file ngân hàng câu hỏi (bank_*.json)
  const bankFiles = allFiles.filter(
    (f) => f.startsWith('bank_') && f.endsWith('.json'),
  );

  const items: Array<BankQ & { id: string; topicId: string }> = [];

  for (const file of bankFiles) {
    const questions = readJsonFile<BankQ[]>(path.join(__dirname, file));
    const bankKey = file.replace(/^bank_/, '').replace(/\.json$/, '');

    // Tự động suy luận chuyên đề và tiền tố ID từ dữ liệu hoặc tên file
    questions.forEach((q, idx) => {
      let defaultTopic = q.topicId || 'Toán';
      let prefix = `q-${bankKey}`;

      if (bankKey.includes('toan')) {
        defaultTopic = 'Toán';
        prefix = 'q-t';
      } else if (bankKey.includes('adv')) {
        defaultTopic = 'Toán';
        prefix = 'q-ta';
      } else if (bankKey.includes('sci')) {
        defaultTopic = 'Logic - Suy luận';
        prefix = 'q-s';
      } else if (bankKey.includes('lang')) {
        defaultTopic = q.topicId || 'Tiếng Việt';
        prefix = 'q-l';
      }

      items.push({
        ...q,
        topicId: defaultTopic,
        id: `${prefix}${idx + 1}`,
      });
    });
  }

  console.log('Tổng số câu hỏi trong Kho ngân hàng đề:', items.length);

  // 2. Đồng bộ tự động danh mục Chuyên đề (Topics) trong Database
  const existingTopics = await prisma.topic.findMany();
  const topics: Record<string, string> = {};
  for (const t of existingTopics) {
    topics[t.name] = t.id;
  }

  const requiredTopicNames = [
    ...new Set([
      'Toán',
      'Tiếng Việt',
      'Tiếng Anh',
      'Logic - Suy luận',
      ...items.map((q) => q.topicId),
    ]),
  ];

  for (const name of requiredTopicNames) {
    if (!topics[name]) {
      const created = await prisma.topic.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      topics[name] = created.id;
    }
  }

  // Nạp câu hỏi Ngân hàng luyện tập
  let bankCount = 0;
  for (const q of items) {
    await upsertQuestionWithOptions(q.id, q, topics[q.topicId]);
    bankCount++;
  }
  console.log(`✅ Đã nạp ${bankCount} câu hỏi vào Kho ngân hàng câu hỏi!`);

  // 3. Tự động quét mọi file Đề thi (de_minh_hoa_*.json) trong thư mục prisma
  const examFiles = allFiles.filter(
    (f) => f.startsWith('de_minh_hoa_') && f.endsWith('.json'),
  );

  for (const file of examFiles) {
    const rawQuestions = readJsonFile<BankQ[]>(path.join(__dirname, file));
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) continue;

    // Tự động trích xuất mã đề từ tên file (VD: de_minh_hoa_2026.json -> slug: 2026 -> examId: vact-exam-2026)
    const slug = file.replace(/^de_minh_hoa_/, '').replace(/\.json$/, '');
    const examId = `vact-exam-${slug}`;

    // Khử trùng lặp theo số thứ tự câu hỏi 'n' và sắp xếp tăng dần
    const uniqueMap = new Map<number, BankQ>();
    for (const item of rawQuestions) {
      if (item && typeof item.n === 'number') {
        uniqueMap.set(item.n, item);
      }
    }
    const examQuestions = Array.from(uniqueMap.values()).sort(
      (a, b) => a.n - b.n,
    );

    const examTitle = `Đề minh họa ĐGNL ĐHQG TPHCM năm ${slug.toUpperCase()}`;
    const examDesc = `Bộ đề thi chuẩn cấu trúc ĐHQG-HCM (${examQuestions.length} câu hỏi).`;

    await prisma.exam.upsert({
      where: { id: examId },
      update: { title: examTitle, description: examDesc },
      create: { id: examId, title: examTitle, description: examDesc },
    const fields = {
      content,
      explanation: null as string | null,
      topicId,
      difficulty: normalizeDifficulty(q.difficulty),
    };
    await prisma.$transaction(async (tx) => {
      await tx.question.upsert({
        where: { id: q.id },
        update: fields,
        create: { id: q.id, type: QuestionType.MULTIPLE_CHOICE, ...fields },
      });
      await tx.questionOption.deleteMany({ where: { questionId: q.id } });
      await tx.questionOption.createMany({
        data: opts.map((o) => ({ questionId: q.id, ...o })),
      });
    });

    // Làm mới liên kết câu hỏi của đề thi này
    await prisma.examQuestion.deleteMany({ where: { examId } });

    for (const q of examQuestions) {
      const qId = `q-${slug}-${String(q.n).padStart(3, '0')}`;
      const topicName = inferTopicByOrder(
        q.n,
        examQuestions.length,
        q.topicId,
      );

      if (!topics[topicName]) {
        const newTopic = await prisma.topic.upsert({
          where: { name: topicName },
          update: {},
          create: { name: topicName },
        });
        topics[topicName] = newTopic.id;
      }

      await upsertQuestionWithOptions(qId, q, topics[topicName]);

      await prisma.examQuestion.create({
        data: {
          examId,
          questionId: qId,
        },
      });
    }

    console.log(
      `✅ Đã nạp đề [${examTitle}] từ file ${file}: ${examQuestions.length} câu!`,
    );
  }
}

main()
  .catch((e) => {
    console.error('seed bank failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });