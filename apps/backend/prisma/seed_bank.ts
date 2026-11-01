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
  topicId: string;
  difficulty: number;
  passage?: string;
};

async function load(name: string): Promise<BankQ[]> {
  const raw = fs.readFileSync(path.join(__dirname, name), 'utf8');
  return JSON.parse(raw);
}

async function loadIfExists(name: string): Promise<BankQ[]> {
  const full = path.join(__dirname, name);
  if (!fs.existsSync(full)) return [];
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * bank_*.json ghi difficulty theo thang nguyên 0..4.
 * Elo (questionRating) và scoring (questionWeight) đều giả định [0,1],
 * nên phải chuẩn hóa tại chỗ seed thay vì sửa ở nơi tiêu thụ.
 */
function normalizeDifficulty(d: number): number {
  const clamped = Math.min(4, Math.max(0, d ?? 2));
  return Math.round((clamped / 4) * 100) / 100;
}

async function main() {
  const toan = await load('bank_toan100.json');
  const lang = await load('bank_lang100.json');
  const adv = await loadIfExists('bank_adv100.json');
  const sci = await loadIfExists('bank_sci100.json');

  const items: Array<BankQ & { id: string }> = [
    ...toan.map((q, i) => ({ ...q, topicId: 'Toán', id: `q-t${i + 1}` })),
    ...lang.map((q, i) => ({ ...q, id: `q-l${i + 1}` })),
    ...adv.map((q, i) => ({ ...q, topicId: 'Toán', id: `q-ta${i + 1}` })),
    ...sci.map((q, i) => ({ ...q, topicId: 'Logic - Suy luận', id: `q-s${i + 1}` })),
  ];
  console.log('total to seed:', items.length);

  // Ensure topics exist
  const names = [...new Set(items.map((q) => q.topicId))];
  const topics: Record<string, string> = {};
  for (const name of names) {
    const t = await prisma.topic.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    topics[name] = t.id;
  }
  console.log('topics:', names.join(', '));

  let ok = 0;
  for (const q of items) {
    const topicId = topics[q.topicId];
    const content = q.passage
      ? `${stripHtml(q.content)}\n\n[Đoạn văn]\n${stripHtml(q.passage)}`
      : stripHtml(q.content);
    const opts = q.options.map((text, i) => ({
      content: stripHtml(text),
      isCorrect: i === q.correct,
      order: i,
    }));
    if (opts.filter((o) => o.isCorrect).length !== 1) {
      throw new Error(`${q.id}: must have exactly 1 correct answer`);
    }
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
    ok++;
    if (ok % 50 === 0) console.log(`  ...${ok}/${items.length}`);
  }

  const counts = {
    questions: await prisma.question.count(),
    options: await prisma.questionOption.count(),
  };
  console.log('done, inserted/updated:', ok, counts);
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
