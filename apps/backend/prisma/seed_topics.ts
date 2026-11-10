/**
 * Seed bổ sung (M1): chuẩn hóa Topic + difficulty.
 *
 * Việc script làm:
 * 1. Đảm bảo tồn tại đúng 4 topic chuẩn theo cấu trúc ĐGNL:
 *    Toán, Tiếng Việt, Tiếng Anh, Logic - Suy luận.
 * 2. Gộp các topic rời rạc cũ (vd "Toán - Giới hạn", "Tiếng Việt - Đọc hiểu")
 *    về 4 topic chuẩn, chuyển toàn bộ câu hỏi và quan hệ sang topic đích.
 * 3. Xóa các topic rỗng không còn câu hỏi / quan hệ nào.
 * 4. Chuẩn hóa difficulty về thang [0, 1] để Elo và weightedScore dùng chung
 *    một thang duy nhất (bank_*.json dùng 0..4, seed cũ set 1200).
 *
 * Chạy: npx ts-node prisma/seed_topics.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CANONICAL = [
  { name: 'Toán', description: 'Toán học và tư duy định lượng' },
  { name: 'Tiếng Việt', description: 'Ngữ văn và đọc hiểu tiếng Việt' },
  { name: 'Tiếng Anh', description: 'Ngữ pháp và đọc hiểu tiếng Anh' },
  {
    name: 'Logic - Suy luận',
    description: 'Tư duy logic, phân tích số liệu và suy luận khoa học',
  },
] as const;

type CanonicalName = (typeof CANONICAL)[number]['name'];

/** Suy ra topic chuẩn từ tên topic cũ. */
function resolveCanonical(name: string): CanonicalName | null {
  const n = name.toLowerCase();
  if (n.includes('tiếng anh')) return 'Tiếng Anh';
  if (n.includes('tiếng việt') || n.includes('ngữ văn')) return 'Tiếng Việt';
  if (n.includes('logic') || n.includes('suy luận') || n.includes('khoa học'))
    return 'Logic - Suy luận';
  if (n.includes('toán')) return 'Toán';
  return null;
}

/** Đưa difficulty về [0,1]: thang 0..4 chia 4, giá trị rating cũ (>100) về 0.5. */
function normalizeDifficulty(d: number): number {
  if (d > 100) return 0.5; // dữ liệu cũ set difficulty = 1200 (nhầm với rating Elo)
  if (d > 1) return Math.round((d / 4) * 100) / 100; // bank_*.json dùng 0..4
  if (d < 0) return 0;
  return Math.round(d * 100) / 100;
}

async function main() {
  console.log('🔧 Chuẩn hóa Topic + difficulty...\n');

  // ===== 1. Tạo / cập nhật 4 topic chuẩn =====
  const canonicalIds: Record<string, string> = {};
  for (const t of CANONICAL) {
    const topic = await prisma.topic.upsert({
      where: { name: t.name },
      update: { description: t.description },
      create: { name: t.name, description: t.description },
    });
    canonicalIds[t.name] = topic.id;
  }
  console.log('✅ 4 topic chuẩn:', CANONICAL.map((t) => t.name).join(', '));

  // ===== 2. Gộp topic cũ về topic chuẩn =====
  const canonicalIdSet = new Set(Object.values(canonicalIds));
  const legacyTopics = await prisma.topic.findMany({
    where: { id: { notIn: [...canonicalIdSet] } },
    include: { _count: { select: { questions: true } } },
  });

  let movedQuestions = 0;
  let removedTopics = 0;

  for (const legacy of legacyTopics) {
    const target = resolveCanonical(legacy.name);
    if (!target) {
      console.log(
        `   ⚠️  Bỏ qua "${legacy.name}" (${legacy._count.questions} câu): không suy ra được topic chuẩn`,
      );
      continue;
    }
    const targetId = canonicalIds[target];

    // Chuyển câu hỏi sang topic chuẩn
    const moved = await prisma.question.updateMany({
      where: { topicId: legacy.id },
      data: { topicId: targetId },
    });
    movedQuestions += moved.count;

    // Chuyển quan hệ course_topics, tránh vi phạm khóa chính ghép
    const courseLinks = await prisma.courseTopic.findMany({
      where: { topicId: legacy.id },
    });
    for (const link of courseLinks) {
      const existed = await prisma.courseTopic.findUnique({
        where: {
          courseId_topicId: { courseId: link.courseId, topicId: targetId },
        },
      });
      if (!existed) {
        await prisma.courseTopic.create({
          data: {
            courseId: link.courseId,
            topicId: targetId,
            order: link.order,
          },
        });
      }
      await prisma.courseTopic.delete({
        where: {
          courseId_topicId: { courseId: link.courseId, topicId: legacy.id },
        },
      });
    }

    // Quan hệ tiên quyết của topic cũ không còn ý nghĩa sau khi gộp
    await prisma.topicPrerequisite.deleteMany({
      where: { OR: [{ topicId: legacy.id }, { prerequisiteId: legacy.id }] },
    });

    // Chỉ xóa khi không còn dữ liệu tham chiếu (tránh lỗi onDelete: Restrict)
    const [stillQuestions, stillResults, stillMastery, historicalAnswers] = await Promise.all([
      prisma.question.count({ where: { topicId: legacy.id } }),
      prisma.attemptTopicResult.count({ where: { topicId: legacy.id } }),
      prisma.topicMastery.count({ where: { topicId: legacy.id } }),
      prisma.examAnswer.count({ where: { topicIdAtSubmission: legacy.id } }),
    ]);

    if (!stillQuestions && !stillResults && !stillMastery && !historicalAnswers) {
      await prisma.topic.delete({ where: { id: legacy.id } });
      removedTopics += 1;
      console.log(
        `   → Gộp "${legacy.name}" vào "${target}" (${moved.count} câu), đã xóa topic cũ`,
      );
    } else {
      console.log(
        `   → Gộp "${legacy.name}" vào "${target}" (${moved.count} câu), giữ topic cũ vì còn dữ liệu tham chiếu`,
      );
    }
  }
  console.log(
    `✅ Đã chuyển ${movedQuestions} câu hỏi, xóa ${removedTopics} topic rời rạc\n`,
  );

  // ===== 3. Chuẩn hóa difficulty về [0,1] =====
  const questions = await prisma.question.findMany({
    select: { id: true, difficulty: true },
  });
  let fixedDifficulty = 0;
  for (const q of questions) {
    const next = normalizeDifficulty(q.difficulty);
    if (next !== q.difficulty) {
      await prisma.question.update({
        where: { id: q.id },
        data: { difficulty: next },
      });
      fixedDifficulty += 1;
    }
  }
  console.log(`✅ Chuẩn hóa difficulty: ${fixedDifficulty}/${questions.length} câu\n`);

  // ===== 4. Báo cáo cuối =====
  const summary = await prisma.topic.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: 'asc' },
  });
  console.table(
    summary.map((t) => ({ topic: t.name, questions: t._count.questions })),
  );

  const diffRows = await prisma.question.groupBy({
    by: ['difficulty'],
    _count: { _all: true },
    orderBy: { difficulty: 'asc' },
  });
  console.table(
    diffRows.map((r) => ({ difficulty: r.difficulty, count: r._count._all })),
  );
}

main()
  .catch((e) => {
    console.error('❌ Lỗi chuẩn hóa topic:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
