/**
 * Seed đề demo đa chủ đề (M1).
 *
 * Lý do cần: đề `vact-exam-2026` có đúng 30 câu và cả 30 đều thuộc Tiếng Việt
 * (phần 1.1 của cấu trúc ĐGNL), nên biểu đồ "kết quả theo chủ đề" chỉ có 1 cột.
 * Đề này bốc câu từ ngân hàng 400 câu theo đúng tỷ lệ ĐGNL để demo có 4 chủ đề:
 *
 *   Tiếng Việt 30 | Tiếng Anh 30 | Toán 30 | Logic - Suy luận 30  → 120 câu
 *
 * Chạy: npx ts-node prisma/seed_exam_demo.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EXAM_ID = 'vact-exam-demo-120';

const BLUEPRINT: Array<{ topic: string; count: number }> = [
  { topic: 'Tiếng Việt', count: 30 },
  { topic: 'Tiếng Anh', count: 30 },
  { topic: 'Toán', count: 30 },
  { topic: 'Logic - Suy luận', count: 30 },
];

async function main() {
  console.log('🌱 Tạo đề demo đa chủ đề...\n');

  await prisma.exam.upsert({
    where: { id: EXAM_ID },
    update: {
      title: 'Đề demo V-ACT 120 câu (4 chủ đề)',
      description:
        'Đề tổng hợp theo cấu trúc ĐGNL: Tiếng Việt, Tiếng Anh, Toán, Logic - Suy luận. Dùng cho demo phân tích kết quả theo chủ đề.',
    },
    create: {
      id: EXAM_ID,
      title: 'Đề demo V-ACT 120 câu (4 chủ đề)',
      description:
        'Đề tổng hợp theo cấu trúc ĐGNL: Tiếng Việt, Tiếng Anh, Toán, Logic - Suy luận. Dùng cho demo phân tích kết quả theo chủ đề.',
    },
  });

  // Làm sạch liên kết cũ để script chạy lại được nhiều lần
  await prisma.examQuestion.deleteMany({ where: { examId: EXAM_ID } });

  const picked: string[] = [];

  for (const row of BLUEPRINT) {
    const topic = await prisma.topic.findUnique({ where: { name: row.topic } });
    if (!topic) {
      throw new Error(
        `Chưa có topic "${row.topic}". Chạy "npm run seed:topics" trước.`,
      );
    }

    // Trải đều theo độ khó để weightedScore có phân hóa
    const questions = await prisma.question.findMany({
      where: { topicId: topic.id },
      select: { id: true, difficulty: true },
      orderBy: { difficulty: 'asc' },
    });

    if (questions.length < row.count) {
      console.log(
        `   ⚠️  ${row.topic}: chỉ có ${questions.length}/${row.count} câu, dùng hết số có`,
      );
    }

    const take = Math.min(row.count, questions.length);
    const step = Math.max(1, Math.floor(questions.length / take));
    const chosen: string[] = [];
    for (let i = 0; i < questions.length && chosen.length < take; i += step) {
      chosen.push(questions[i].id);
    }
    // Bù cho đủ số lượng nếu bước nhảy làm thiếu
    for (const q of questions) {
      if (chosen.length >= take) break;
      if (!chosen.includes(q.id)) chosen.push(q.id);
    }

    picked.push(...chosen);
    console.log(`   → ${row.topic}: ${chosen.length} câu`);
  }

  await prisma.examQuestion.createMany({
    data: picked.map((questionId) => ({ examId: EXAM_ID, questionId })),
    skipDuplicates: true,
  });

  // Báo cáo phân bố thực tế
  const rows = await prisma.examQuestion.findMany({
    where: { examId: EXAM_ID },
    include: {
      question: { select: { difficulty: true, topic: { select: { name: true } } } },
    },
  });

  const byTopic = new Map<string, { count: number; avgDifficulty: number }>();
  for (const r of rows) {
    const name = r.question.topic.name;
    const cur = byTopic.get(name) ?? { count: 0, avgDifficulty: 0 };
    cur.avgDifficulty =
      (cur.avgDifficulty * cur.count + r.question.difficulty) / (cur.count + 1);
    cur.count += 1;
    byTopic.set(name, cur);
  }

  console.log(`\n✅ Đề "${EXAM_ID}" có ${rows.length} câu`);
  console.table(
    [...byTopic.entries()].map(([topic, v]) => ({
      topic,
      questions: v.count,
      avgDifficulty: Math.round(v.avgDifficulty * 100) / 100,
    })),
  );
}

main()
  .catch((e) => {
    console.error('❌ Lỗi tạo đề demo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
