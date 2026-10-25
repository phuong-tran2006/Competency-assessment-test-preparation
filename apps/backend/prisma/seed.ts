import 'dotenv/config';
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

  await prisma.user.upsert({
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

  await prisma.user.upsert({
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

  console.log('✅ Users OK');

  // ==================== 2. TOPICS ====================
  const topicData = [
    {
      id: 'topic-1',
      name: 'Toán - Giới hạn',
      description: 'Giới hạn của hàm số, dãy số',
    },
    {
      id: 'topic-2',
      name: 'Toán - Đạo hàm',
      description: 'Đạo hàm và ứng dụng',
    },
    {
      id: 'topic-3',
      name: 'Toán - Tích phân',
      description: 'Nguyên hàm, tích phân',
    },
    {
      id: 'topic-4',
      name: 'Tiếng Việt - Đọc hiểu',
      description: 'Kỹ năng đọc hiểu văn bản',
    },
    {
      id: 'topic-6',
      name: 'Tiếng Anh - Ngữ pháp',
      description: 'Ngữ pháp tiếng Anh cơ bản',
    },
    {
      id: 'topic-7',
      name: 'Logic - Suy luận',
      description: 'Suy luận logic, phân tích dữ liệu',
    },
  ];

  const topics: Record<string, string> = {};
  for (const t of topicData) {
    const topic = await prisma.topic.upsert({
      where: { id: t.id },
      update: { name: t.name },
      create: t,
    });
    topics[t.name] = t.id;
  }
  console.log('✅ Topics OK');

  // ==================== 3. PREREQUISITES ====================
  // Giới hạn → Đạo hàm → Tích phân
  await prisma.topicPrerequisite.upsert({
    where: {
      topicId_prerequisiteId: {
        topicId: topics['Toán - Đạo hàm'],
        prerequisiteId: topics['Toán - Giới hạn'],
      },
    },
    update: {},
    create: {
      topicId: topics['Toán - Đạo hàm'],
      prerequisiteId: topics['Toán - Giới hạn'],
    },
  });

  await prisma.topicPrerequisite.upsert({
    where: {
      topicId_prerequisiteId: {
        topicId: topics['Toán - Tích phân'],
        prerequisiteId: topics['Toán - Đạo hàm'],
      },
    },
    update: {},
    create: {
      topicId: topics['Toán - Tích phân'],
      prerequisiteId: topics['Toán - Đạo hàm'],
    },
  });

  console.log('✅ Prerequisites: Đạo hàm ← Giới hạn, Tích phân ← Đạo hàm');

  // ==================== 4. COURSES ====================
  const course1 = await prisma.course.upsert({
    where: { id: 'course-1' },
    update: { title: 'Khóa luyện Toán V-ACT' },
    create: {
      id: 'course-1',
      title: 'Khóa luyện Toán V-ACT',
      description: 'Khóa học cấp tốc cho kỳ thi V-ACT',
      instructorId: teacher.id,
      status: 'PUBLISHED',
      courseTopics: {
        create: [{ topicId: topics['Toán - Giới hạn'], order: 1 }],
      },
    },
  });

  const course2 = await prisma.course.findFirst({
    where: { title: 'Khóa luyện Tiếng Anh V-ACT' },
  });

  const course2Record = course2
    ? await prisma.course.update({
        where: { id: course2.id },
        data: {
          description: 'Ôn ngữ pháp và đọc hiểu tiếng Anh',
          instructorId: teacher.id,
          status: 'PUBLISHED',
        },
      })
    : await prisma.course.create({
        data: {
          title: 'Khóa luyện Tiếng Anh V-ACT',
          description: 'Ôn ngữ pháp và đọc hiểu tiếng Anh',
          instructorId: teacher.id,
          status: 'PUBLISHED',
        },
      });

  await prisma.courseTopic.upsert({
    where: {
      courseId_topicId: {
        courseId: course2Record.id,
        topicId: topics['Tiếng Anh - Ngữ pháp'],
      },
    },
    update: {},
    create: {
      courseId: course2Record.id,
      topicId: topics['Tiếng Anh - Ngữ pháp'],
      order: 1,
    },
  });

  console.log(`✅ Courses: ${course1.title}, ${course2Record.title}`);

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

  // ==================== 6. QUESTIONS ====================
  // Câu hỏi 1: MULTIPLE_CHOICE
  const q1 = await prisma.question.upsert({
    where: { id: 'q-1' },
    update: {},
    create: {
      id: 'q-1',
      content:
        'Giới hạn của hàm số f(x) = (x² - 1)/(x - 1) khi x → 1 là bao nhiêu?',
      explanation:
        'Phân tích tử: x² - 1 = (x-1)(x+1). Rút gọn (x-1) → còn x+1. Thay x = 1 → 2.',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.4,
      topicId: topics['Toán - Giới hạn'],
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

  // Câu hỏi 2: MULTIPLE_CHOICE
  const q2 = await prisma.question.upsert({
    where: { id: 'q-2' },
    update: {},
    create: {
      id: 'q-2',
      content: 'Đạo hàm của hàm số y = x² tại x = 3 là 6.',
      explanation: "y' = 2x. Tại x = 3 → y' = 6. Đúng.",
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.2,
      topicId: topics['Toán - Đạo hàm'],
      options: {
        create: [
          { content: 'Đúng', isCorrect: true, order: 0 },
          { content: 'Sai', isCorrect: false, order: 1 },
        ],
      },
    },
  });

  // Câu hỏi 3: MULTIPLE_CHOICE
  const q3 = await prisma.question.upsert({
    where: { id: 'q-3' },
    update: {},
    create: {
      id: 'q-3',
      content: 'Phát biểu nào sau đây ĐÚNG về tích phân?',
      explanation:
        'Tích phân là phép toán ngược của đạo hàm. Các phát biểu còn lại đều sai.',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.6,
      topicId: topics['Toán - Tích phân'],
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
            content: 'Tích phân bất định không có hằng số C',
            isCorrect: false,
            order: 2,
          },
          {
            content: 'Tích phân chỉ áp dụng cho hàm số gián đoạn',
            isCorrect: false,
            order: 3,
          },
        ],
      },
    },
  });

  // Câu hỏi 4: Tiếng Việt
  const q4 = await prisma.question.upsert({
    where: { id: 'q-4' },
    update: {},
    create: {
      id: 'q-4',
      content:
        'Từ "long lanh" trong câu "Nước hồ long lanh dưới ánh nắng" thuộc loại từ nào?',
      explanation: 'Đây là từ láy âm đầu (l) và vần (anh).',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.3,
      topicId: topics['Tiếng Việt - Đọc hiểu'],
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
  const q5 = await prisma.question.upsert({
    where: { id: 'q-5' },
    update: {},
    create: {
      id: 'q-5',
      content: 'Choose the correct answer: "She ___ to school every day."',
      explanation: 'Thì hiện tại đơn, chủ ngữ số ít → động từ thêm "es".',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.1,
      topicId: topics['Tiếng Anh - Ngữ pháp'],
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
  const q6 = await prisma.question.upsert({
    where: { id: 'q-6' },
    update: {},
    create: {
      id: 'q-6',
      content: 'Nếu tất cả A là B, và tất cả B là C, thì kết luận nào đúng?',
      explanation: 'Suy luận bắc cầu: A ⊆ B ⊆ C ⟹ A ⊆ C.',
      type: 'MULTIPLE_CHOICE',
      difficulty: 0.3,
      topicId: topics['Logic - Suy luận'],
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

  //==================== 7. EXAMS ====================
  const exam1 = await prisma.exam.upsert({
    where: { id: 'exam-1' },
    update: {},
    create: {
      id: 'exam-1',
      title: 'Đề thi thử V-ACT số 1',
      description: 'Đề thi mẫu',
      questions: {
        create: [
          { questionId: q1.id },
          { questionId: q2.id },
          { questionId: q3.id }, // Tích phân
          { questionId: q4.id }, // Tiếng Việt
          { questionId: q5.id }, // Tiếng Anh
          { questionId: q6.id }, // Logic
        ],
      },
    },
  });
  const testPasswordHash = await bcrypt.hash('Test@123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test.learner@vact.com' },
    update: {
      passwordHash: testPasswordHash,
      fullName: 'Learner Test API',
      role: 'LEARNER',
    },
    create: {
      email: 'test.learner@vact.com',
      passwordHash: testPasswordHash,
      fullName: 'Learner Test API',
      role: 'LEARNER',
      targetScore: 900,
    },
  });

  const seededQuestions = await prisma.question.findMany({
    where: { id: { in: ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6'] } },
    include: { options: { orderBy: { order: 'asc' } } },
  });

  const questionById = new Map(seededQuestions.map((q) => [q.id, q]));

  const correctOptionIds = (id: string) => {
    const question = questionById.get(id);
    if (!question) throw new Error(`Không tìm thấy câu hỏi ${id}`);
    return question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id);
  };

  const wrongOptionId = (id: string) => {
    const question = questionById.get(id);
    if (!question) throw new Error(`Không tìm thấy câu hỏi ${id}`);
    const option = question.options.find((item) => !item.isCorrect);
    if (!option) throw new Error(`Câu hỏi ${id} không có đáp án sai`);
    return option.id;
  };

  const attemptIds = [
    'attempt-test-submitted',
    'attempt-test-submitted-2',
    'attempt-test-inprogress',
    'attempt-test-expired',
  ];

  await prisma.examAnswer.deleteMany({
    where: { attemptId: { in: attemptIds } },
  });
  await prisma.examAttempt.deleteMany({
    where: { id: { in: attemptIds } },
  });

  const now = Date.now();
  const minutes = (value: number) => value * 60 * 1000;

  const submittedAt1 = new Date(now - 36 * 60 * 60 * 1000);
  const startedAt1 = new Date(submittedAt1.getTime() - minutes(25));
  await prisma.examAttempt.create({
    data: {
      id: 'attempt-test-submitted',
      userId: testUser.id,
      examId: 'exam-1',
      status: 'SUBMITTED',
      startedAt: startedAt1,
      deadlineAt: new Date(startedAt1.getTime() + 1800 * 1000),
      submittedAt: submittedAt1,
      timeLimit: 1800,
      total: 6,
      score: 4,
      weightedScore: 5.2,
      answers: {
        create: [
          {
            questionId: 'q-1',
            selectedOptionIds: correctOptionIds('q-1'),
            isCorrect: true,
            timeSpent: 45,
          },
          {
            questionId: 'q-2',
            selectedOptionIds: correctOptionIds('q-2'),
            isCorrect: true,
            timeSpent: 20,
          },
          {
            questionId: 'q-3',
            selectedOptionIds: [wrongOptionId('q-3')],
            isCorrect: false,
            timeSpent: 80,
          },
          {
            questionId: 'q-4',
            selectedOptionIds: correctOptionIds('q-4'),
            isCorrect: true,
            timeSpent: 30,
          },
          {
            questionId: 'q-5',
            selectedOptionIds: [wrongOptionId('q-5')],
            isCorrect: false,
            timeSpent: 25,
          },
          {
            questionId: 'q-6',
            selectedOptionIds: correctOptionIds('q-6'),
            isCorrect: true,
            timeSpent: 40,
          },
        ],
      },
    },
  });

  const submittedAt2 = new Date(now - 3 * 60 * 60 * 1000);
  const startedAt2 = new Date(submittedAt2.getTime() - minutes(30));
  await prisma.examAttempt.create({
    data: {
      id: 'attempt-test-submitted-2',
      userId: testUser.id,
      examId: 'exam-1',
      status: 'SUBMITTED',
      startedAt: startedAt2,
      deadlineAt: new Date(startedAt2.getTime() + 1800 * 1000),
      submittedAt: submittedAt2,
      timeLimit: 1800,
      total: 6,
      score: 6,
      weightedScore: 7.9,
      answers: {
        create: ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6'].map(
          (questionId, index) => ({
            questionId,
            selectedOptionIds: correctOptionIds(questionId),
            isCorrect: true,
            timeSpent: [30, 18, 55, 22, 15, 35][index],
          }),
        ),
      },
    },
  });

  const startedAt3 = new Date(now - minutes(2));
  await prisma.examAttempt.create({
    data: {
      id: 'attempt-test-inprogress',
      userId: testUser.id,
      examId: null,
      status: 'IN_PROGRESS',
      startedAt: startedAt3,
      deadlineAt: new Date(startedAt3.getTime() + 1800 * 1000),
      timeLimit: 1800,
      total: 3,
      score: 0,
      weightedScore: 0,
      answers: {
        create: [
          {
            questionId: 'q-1',
            selectedOptionIds: correctOptionIds('q-1'),
            isCorrect: false,
            timeSpent: 15,
          },
          {
            questionId: 'q-2',
            selectedOptionIds: [],
            isCorrect: false,
            timeSpent: 0,
          },
          {
            questionId: 'q-3',
            selectedOptionIds: [],
            isCorrect: false,
            timeSpent: 0,
          },
        ],
      },
    },
  });

  const startedAt4 = new Date(now - minutes(10));
  await prisma.examAttempt.create({
    data: {
      id: 'attempt-test-expired',
      userId: testUser.id,
      examId: null,
      status: 'IN_PROGRESS',
      startedAt: startedAt4,
      deadlineAt: new Date(startedAt4.getTime() + 60 * 1000),
      timeLimit: 60,
      total: 2,
      score: 0,
      weightedScore: 0,
      answers: {
        create: [
          { questionId: 'q-1', selectedOptionIds: [], isCorrect: false },
          { questionId: 'q-2', selectedOptionIds: [], isCorrect: false },
        ],
      },
    },
  });

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
    exam: await prisma.exam.count(),
    attempts: await prisma.examAttempt.count(),
    attemptAnswers: await prisma.examAnswer.count(),
    attemptTopicResults: await prisma.attemptTopicResult.count(),
  };

  console.log('\n📊 Tổng kết database:');
  console.table(counts);
  console.log('\n🎉 Seed hoàn tất!');
  console.log('\n🔑 Tài khoản demo:');
  console.log('   Admin    : admin@vact.com    / admin123');
  console.log('   Teacher  : teacher@vact.com  / teacher123');
  console.log('   Learner  : learner@vact.com  / learner123');
  console.log('   Test     : test.learner@vact.com / Test@123');
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
