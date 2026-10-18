import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const filePath = path.join(process.cwd(), 'prisma', 'questions-import.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const items = JSON.parse(raw);

  // Lấy danh sách topic để map từ tên -> id
  const topics = await prisma.topic.findMany();
  const topicMap = new Map(topics.map((t) => [t.name, t.id]));

  let successCount = 0;
  let skipCount = 0;

  for (const [index, q] of items.entries()) {
    const topicId = topicMap.get(q.topicName);

    if (!topicId) {
      console.error(
        `❌ [Câu ${index + 1}] Bỏ qua: Không tìm thấy chủ đề "${q.topicName}"`,
      );
      continue;
    }

    // Chống trùng lặp: Nếu nội dung câu hỏi này đã có trong DB thì bỏ qua
    const existing = await prisma.question.findFirst({
      where: { content: q.content },
    });

    if (existing) {
      console.log(
        `⏭️  [Câu ${index + 1}] Bỏ qua: Câu hỏi đã tồn tại trong DB.`,
      );
      skipCount++;
      continue;
    }

    try {
      await prisma.question.create({
        data: {
          content: q.content,
          explanation: q.explanation || null,
          type: q.type,
          difficulty: q.difficulty || 0.0,
          topicId: topicId,
          options: {
            create: q.options.map((o: any, idx: number) => ({
              content: o.content,
              isCorrect: o.isCorrect,
              order: idx,
            })),
          },
        },
      });
      console.log(
        `✅ [Câu ${index + 1}] Đã nạp thành công: ${q.content.substring(0, 30)}...`,
      );
      successCount++;
    } catch (error) {
      console.error(`❌ [Câu ${index + 1}] Lỗi khi nạp:`, error);
    }
  }

  console.log('\n================================');
  console.log(
    `🎉 HOÀN TẤT: Thành công ${successCount}, Bỏ qua ${skipCount}, Tổng ${items.length} câu.`,
  );
  console.log('================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
