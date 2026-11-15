import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedAssessment } from './lib/seed-assessment';
import { TOPIC_NAMES } from './lib/question-bank';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    '🌱 Bắt đầu seed dữ liệu chuẩn cho hệ thống V-ACT (giữ nguyên cơ chế chấm điểm)...',
  );

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 1. Tạo tài khoản mẫu
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vact.com' },
    update: {},
    create: {
      email: 'admin@vact.com',
      passwordHash: hashedPassword,
      fullName: 'Quản trị viên Hệ thống',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'learner@vact.com' },
    update: {},
    create: {
      email: 'learner@vact.com',
      passwordHash: hashedPassword,
      fullName: 'Học viên Test',
      role: Role.STUDENT,
    },
  });

  // Shared validated importer with stable question IDs and annual exam links.
  console.log(await seedAssessment(prisma));
  const topics: Record<string, { id: string }> = {};
  for (const name of TOPIC_NAMES) {
    topics[name] = (await prisma.topic.findUnique({ where: { name } }))!;
  }

  // ==================== 4. COURSES ====================
  const course1 = await prisma.course.upsert({
    where: { id: 'course-1' },
    update: {},
    create: {
      id: 'course-1',
      title: 'Toán nền tảng ĐGNL',
      description: 'Khóa học giới hạn, đạo hàm, tích phân',
      instructorId: admin.id,
    },
  });

  // Gắn course với topic Toán (upsert từng topic để rerun an toàn)
  for (const [idx, topicName] of [
    'Toán',
    'Tiếng Việt',
    'Tiếng Anh',
    'Logic - Suy luận',
  ].entries()) {
    await prisma.courseTopic.upsert({
      where: {
        courseId_topicId: {
          courseId: course1.id,
          topicId: topics[topicName].id,
        },
      },
      update: {},
      create: {
        courseId: course1.id,
        topicId: topics[topicName].id,
        order: idx + 1,
      },
    });
  }

  console.log(`✅ Courses: ${course1.title}`);

  // ==================== 5. CHAPTERS + LESSONS + MATERIALS ====================
  const chapter1 = await prisma.chapter.upsert({
    where: { id: 'chapter-1' },
    update: {},
    create: {
      id: 'chapter-1',
      courseId: course1.id,
      title: 'Chương 1: Giới hạn và liên tục',
      order: 1,
    },
  });

  const lesson1 = await prisma.lesson.upsert({
    where: { id: 'lesson-1' },
    update: {},
    create: {
      id: 'lesson-1',
      chapterId: chapter1.id,
      title: 'Bài 1: Khái niệm giới hạn',
      content: 'Giới hạn của hàm số là giá trị mà hàm số tiến tới...',
      order: 1,
      materials: {
        create: [
          {
            type: 'TEXT',
            title: 'Lý thuyết cơ bản',
            content: 'Giới hạn là một khái niệm quan trọng trong giải tích...',
            order: 1,
          },
          {
            type: 'PDF',
            title: 'Bài tập tự luyện',
            url: 'https://example.com/exercises.pdf',
            order: 2,
          },
        ],
      },
    },
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { id: 'lesson-2' },
    update: {},
    create: {
      id: 'lesson-2',
      chapterId: chapter1.id,
      title: 'Bài 2: Các dạng giới hạn thường gặp',
      content: 'Trong bài này ta sẽ học các dạng giới hạn vô định 0/0, ∞/∞...',
      order: 2,
    },
  });

  const chapter2 = await prisma.chapter.upsert({
    where: { id: 'chapter-2' },
    update: {},
    create: {
      id: 'chapter-2',
      courseId: course1.id,
      title: 'Chương 2: Đạo hàm',
      order: 2,
    },
  });

  const lesson3 = await prisma.lesson.upsert({
    where: { id: 'lesson-3' },
    update: {},
    create: {
      id: 'lesson-3',
      chapterId: chapter2.id,
      title: 'Bài 1: Định nghĩa đạo hàm',
      content:
        'Đạo hàm là giới hạn của tỉ số giữa số gia hàm số và số gia đối số...',
      order: 1,
    },
  });

  console.log('✅ Chapters, Lessons, Materials đã tạo');
  console.log(`   - Chapter: ${chapter1.title}, ${chapter2.title}`);
  console.log(
    `   - Lesson: ${lesson1.title}, ${lesson2.title}, ${lesson3.title}`,
  );

  console.log('Seed complete. Three annual practice exams are ready.');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
