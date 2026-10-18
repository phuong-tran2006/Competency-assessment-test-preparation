import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu seed...');

  // ==================== 1. USERS ====================
  const adminPassword = await bcrypt.hash('admin123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const learnerPassword = await bcrypt.hash('learner123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vact.com' },
    update: {},
    create: {
      email: 'admin@vact.com',
      passwordHash: adminPassword,
      fullName: 'Quản trị viên',
      role: 'ADMIN',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@vact.com' },
    update: {},
    create: {
      email: 'teacher@vact.com',
      passwordHash: teacherPassword,
      fullName: 'Nguyễn Văn Teacher',
      role: 'INSTRUCTOR',
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: 'learner@vact.com' },
    update: {},
    create: {
      email: 'learner@vact.com',
      passwordHash: learnerPassword,
      fullName: 'Trần Thị Learner',
      role: 'LEARNER',
      targetScore: 850,
    },
  });

  console.log(`✅ Users: ${admin.email}, ${teacher.email}, ${learner.email}`);

  // ==================== 2. TOPICS ====================
  const topicData = [
    { name: 'Toán - Giới hạn', description: 'Giới hạn của hàm số, dãy số' },
    { name: 'Toán - Đạo hàm', description: 'Đạo hàm và ứng dụng' },
    { name: 'Toán - Tích phân', description: 'Nguyên hàm, tích phân' },
    { name: 'Tiếng Việt - Đọc hiểu', description: 'Kỹ năng đọc hiểu văn bản' },
    { name: 'Tiếng Anh - Ngữ pháp', description: 'Ngữ pháp tiếng Anh cơ bản' },
    {
      name: 'Logic - Suy luận',
      description: 'Suy luận logic, phân tích dữ liệu',
    },
  ];

  const topics: Record<string, { id: string; name: string }> = {};
  for (const t of topicData) {
    const topic = await prisma.topic.upsert({
      where: { name: t.name },
      update: { description: t.description },
      create: t,
    });
    topics[t.name] = { id: topic.id, name: topic.name };
  }
  console.log(`✅ Topics: ${Object.keys(topics).length} chủ đề`);

  // ==================== 3. PREREQUISITES ====================
  // Giới hạn → Đạo hàm → Tích phân
  await prisma.topicPrerequisite.upsert({
    where: {
      topicId_prerequisiteId: {
        topicId: topics['Toán - Đạo hàm'].id,
        prerequisiteId: topics['Toán - Giới hạn'].id,
      },
    },
    update: {},
    create: {
      topicId: topics['Toán - Đạo hàm'].id,
      prerequisiteId: topics['Toán - Giới hạn'].id,
    },
  });

  await prisma.topicPrerequisite.upsert({
    where: {
      topicId_prerequisiteId: {
        topicId: topics['Toán - Tích phân'].id,
        prerequisiteId: topics['Toán - Đạo hàm'].id,
      },
    },
    update: {},
    create: {
      topicId: topics['Toán - Tích phân'].id,
      prerequisiteId: topics['Toán - Đạo hàm'].id,
    },
  });

  console.log('✅ Prerequisites: Đạo hàm ← Giới hạn, Tích phân ← Đạo hàm');

  // ==================== 4. COURSES ====================
  const course1 = await prisma.course.create({
    data: {
      title: 'Khóa luyện Toán V-ACT',
      description: 'Khóa học cấp tốc ôn Toán cho kỳ thi V-ACT',
      instructorId: teacher.id,
      status: 'PUBLISHED',
      courseTopics: {
        create: [
          { topicId: topics['Toán - Giới hạn'].id, order: 1 },
          { topicId: topics['Toán - Đạo hàm'].id, order: 2 },
          { topicId: topics['Toán - Tích phân'].id, order: 3 },
        ],
      },
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: 'Khóa luyện Tiếng Anh V-ACT',
      description: 'Ôn ngữ pháp và đọc hiểu tiếng Anh',
      instructorId: teacher.id,
      status: 'PUBLISHED',
      courseTopics: {
        create: [{ topicId: topics['Tiếng Anh - Ngữ pháp'].id, order: 1 }],
      },
    },
  });

  console.log(`✅ Courses: ${course1.title}, ${course2.title}`);

  // ==================== 5. CHAPTERS + LESSONS + MATERIALS ====================
  const chapter1 = await prisma.chapter.create({
    data: {
      courseId: course1.id,
      title: 'Chương 1: Giới hạn và liên tục',
      order: 1,
    },
  });

  const lesson1 = await prisma.lesson.create({
    data: {
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
            type: 'VIDEO',
            title: 'Video bài giảng',
            url: 'https://www.youtube.com/watch?v=demo',
            order: 2,
          },
          {
            type: 'PDF',
            title: 'Bài tập tự luyện',
            url: 'https://example.com/exercises.pdf',
            order: 3,
          },
        ],
      },
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      chapterId: chapter1.id,
      title: 'Bài 2: Các dạng giới hạn thường gặp',
      content: 'Trong bài này ta sẽ học các dạng giới hạn vô định 0/0, ∞/∞...',
      order: 2,
    },
  });

  const chapter2 = await prisma.chapter.create({
    data: {
      courseId: course1.id,
      title: 'Chương 2: Đạo hàm',
      order: 2,
    },
  });

  const lesson3 = await prisma.lesson.create({
    data: {
      chapterId: chapter2.id,
      title: 'Bài 1: Định nghĩa đạo hàm',
      content:
        'Đạo hàm là giới hạn của tỉ số giữa số gia hàm số và số gia đối số...',
      order: 1,
      materials: {
        create: [
          {
            type: 'LINK',
            title: 'Tham khảo Wikipedia',
            url: 'https://vi.wikipedia.org/wiki/Đạo_hàm',
            order: 1,
          },
        ],
      },
    },
  });

  console.log('✅ Chapters, Lessons, Materials đã tạo');
  console.log(`   - Chapter: ${chapter1.title}, ${chapter2.title}`);
  console.log(
    `   - Lesson: ${lesson1.title}, ${lesson2.title}, ${lesson3.title}`,
  );

  // ==================== 6. QUESTIONS ====================
  // Câu hỏi 1: MULTIPLE_CHOICE
  const q1 = await prisma.question.create({
    data: {
      content:
        'Giới hạn của hàm số f(x) = (x² - 1)/(x - 1) khi x → 1 là bao nhiêu?',
      explanation:
        'Phân tích tử: x² - 1 = (x-1)(x+1). Rút gọn (x-1) → còn x+1. Thay x = 1 → 2.',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.4,
      source: 'Đề thi thử V-ACT 2025',
      license: 'CC BY-SA',
      topicId: topics['Toán - Giới hạn'].id,
      options: {
        create: [
          { content: '0', isCorrect: false, order: 0 },
          { content: '1', isCorrect: false, order: 1 },
          { content: '2', isCorrect: true, order: 2 },
          { content: 'Không tồn tại', isCorrect: false, order: 3 },
        ],
      },
    },
  });

  // Câu hỏi 2: TRUE_FALSE
  const q2 = await prisma.question.create({
    data: {
      content: 'Đạo hàm của hàm số y = x² tại x = 3 là 6.',
      explanation: "y' = 2x. Tại x = 3 → y' = 6. Đúng.",
      type: 'TRUE_FALSE',
      difficulty: 0.2,
      topicId: topics['Toán - Đạo hàm'].id,
      options: {
        create: [
          { content: 'Đúng', isCorrect: true, order: 0 },
          { content: 'Sai', isCorrect: false, order: 1 },
        ],
      },
    },
  });

  // Câu hỏi 3: MULTI_SELECT
  const q3 = await prisma.question.create({
    data: {
      content: 'Trong các phát biểu sau, phát biểu nào ĐÚNG về tích phân?',
      explanation: 'a, c đúng. b sai (tích phân xác định có thể âm). d sai.',
      type: 'MULTI_SELECT',
      difficulty: 0.6,
      topicId: topics['Toán - Tích phân'].id,
      options: {
        create: [
          {
            content: 'Tích phân là phép toán ngược của đạo hàm',
            isCorrect: true,
            order: 0,
          },
          {
            content: 'Tích phân xác định luôn dương',
            isCorrect: false,
            order: 1,
          },
          {
            content: 'Tích phân bất định có hằng số C',
            isCorrect: true,
            order: 2,
          },
          {
            content: 'Tích phân không áp dụng được cho hàm số liên tục',
            isCorrect: false,
            order: 3,
          },
        ],
      },
    },
  });

  // Câu hỏi 4: Tiếng Việt
  const q4 = await prisma.question.create({
    data: {
      content:
        'Từ "long lanh" trong câu "Nước hồ long lanh dưới ánh nắng" thuộc loại từ nào?',
      explanation: 'Đây là từ láy âm đầu (l) và vần (anh).',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.3,
      topicId: topics['Tiếng Việt - Đọc hiểu'].id,
      options: {
        create: [
          { content: 'Từ đơn', isCorrect: false, order: 0 },
          { content: 'Từ ghép', isCorrect: false, order: 1 },
          { content: 'Từ láy', isCorrect: true, order: 2 },
          { content: 'Từ phức', isCorrect: false, order: 3 },
        ],
      },
    },
  });

  // Câu hỏi 5: Tiếng Anh
  const q5 = await prisma.question.create({
    data: {
      content: 'Choose the correct answer: "She ___ to school every day."',
      explanation: 'Thì hiện tại đơn, chủ ngữ số ít → động từ thêm "es".',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.1,
      topicId: topics['Tiếng Anh - Ngữ pháp'].id,
      options: {
        create: [
          { content: 'go', isCorrect: false, order: 0 },
          { content: 'goes', isCorrect: true, order: 1 },
          { content: 'going', isCorrect: false, order: 2 },
          { content: 'gone', isCorrect: false, order: 3 },
        ],
      },
    },
  });

  // Câu hỏi 6: Logic
  const q6 = await prisma.question.create({
    data: {
      content: 'Nếu tất cả A là B, và tất cả B là C, thì kết luận nào đúng?',
      explanation: 'Suy luận bắc cầu: A ⊆ B ⊆ C ⟹ A ⊆ C.',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.3,
      topicId: topics['Logic - Suy luận'].id,
      options: {
        create: [
          { content: 'Tất cả A là C', isCorrect: true, order: 0 },
          { content: 'Tất cả C là A', isCorrect: false, order: 1 },
          { content: 'Không A nào là C', isCorrect: false, order: 2 },
          { content: 'Không kết luận được', isCorrect: false, order: 3 },
        ],
      },
    },
  });

  console.log(`✅ Questions: 6 câu hỏi đã tạo`);

  // ==================== SUMMARY ====================
  const counts = {
    users: await prisma.user.count(),
    topics: await prisma.topic.count(),
    prerequisites: await prisma.topicPrerequisite.count(),
    courses: await prisma.course.count(),
    chapters: await prisma.chapter.count(),
    lessons: await prisma.lesson.count(),
    materials: await prisma.material.count(),
    questions: await prisma.question.count(),
    options: await prisma.questionOption.count(),
  };

  console.log('\n📊 Tổng kết database:');
  console.table(counts);
  console.log('\n🎉 Seed hoàn tất!');
  console.log('\n🔑 Tài khoản demo:');
  console.log('   Admin    : admin@vact.com    / admin123');
  console.log('   Teacher  : teacher@vact.com  / teacher123');
  console.log('   Learner  : learner@vact.com  / learner123');
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
