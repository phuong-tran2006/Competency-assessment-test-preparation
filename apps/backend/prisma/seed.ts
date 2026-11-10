import 'dotenv/config';
import { PrismaClient, QuestionType, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { questions2026 } from './examData2026';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu nạp dữ liệu mẫu (Seed) cho hệ thống V-ACT...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // ==================== 1. USERS (ADMIN, INSTRUCTOR, STUDENT) ====================
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vact.com' },
    update: {
      passwordHash: hashedPassword,
      fullName: 'Quản trị viên Hệ thống',
      role: Role.ADMIN,
    },
    create: {
      email: 'admin@vact.com',
      passwordHash: hashedPassword,
      fullName: 'Quản trị viên Hệ thống',
      role: Role.ADMIN,
    },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@vact.com' },
    update: {
      passwordHash: hashedPassword,
      fullName: 'Giảng viên Chuyên môn V-ACT',
      role: Role.INSTRUCTOR,
    },
    create: {
      email: 'instructor@vact.com',
      passwordHash: hashedPassword,
      fullName: 'Giảng viên Chuyên môn V-ACT',
      role: Role.INSTRUCTOR,
    },
  });

  const learner = await prisma.user.upsert({
    where: { email: 'learner@vact.com' },
    update: {
      passwordHash: hashedPassword,
      fullName: 'Học viên Test',
      role: Role.STUDENT,
    },
    create: {
      email: 'learner@vact.com',
      passwordHash: hashedPassword,
      fullName: 'Học viên Test',
      role: Role.STUDENT,
    },
  });

  console.log(
    `✅ Đã tạo/cập nhật 3 tài khoản mẫu (Mật khẩu chung: admin123):`,
    `\n   - Admin: ${admin.email}`,
    `\n   - Instructor: ${instructor.email}`,
    `\n   - Student: ${learner.email}`,
  );

  // ==================== 2. CORE TOPICS (4 CHUYÊN ĐỀ CHUẨN ĐGNL) ====================
  const coreTopicsData = [
    { id: 'topic-math', name: 'Toán' },
    { id: 'topic-vietnamese', name: 'Tiếng Việt' },
    { id: 'topic-english', name: 'Tiếng Anh' },
    { id: 'topic-logic', name: 'Logic - Suy luận' },
  ];

  const topicMap: Record<string, string> = {};

  for (const t of coreTopicsData) {
    const existing = await prisma.topic.findFirst({
      where: { name: t.name },
    });

    if (existing) {
      topicMap[t.name] = existing.id;
    } else {
      const created = await prisma.topic.upsert({
        where: { id: t.id },
        update: { name: t.name },
        create: { id: t.id, name: t.name },
      });
      topicMap[t.name] = created.id;
    }
  }

  console.log('✅ Đã chuẩn hóa 4 Chuyên đề cốt lõi: Toán, Tiếng Việt, Tiếng Anh, Logic - Suy luận');

  // ==================== 3. EXAMS (3 BỘ ĐỀ MINH HỌA CHÍNH THỨC) ====================
  const examsData = [
    {
      id: 'vact-exam-2026',
      title: 'Đề minh họa ĐGNL ĐHQG TPHCM năm 2026',
      description: 'Bộ đề thi chuẩn cấu trúc mới nhất năm 2026.',
      duration: 150,
    },
    {
      id: 'vact-exam-2025',
      title: 'Đề minh họa ĐGNL ĐHQG TPHCM năm 2025',
      description:
        'Đề thi chính thức và minh họa lưu trữ năm 2025, rèn luyện tư duy logic và phân tích số liệu.',
      duration: 150,
    },
    {
      id: 'vact-exam-2024',
      title: 'Đề minh họa ĐGNL ĐHQG TPHCM năm 2024',
      description:
        'Bộ đề ôn tập nền tảng từ kỳ thi ĐGNL năm 2024, củng cố kiến thức cơ bản.',
      duration: 150,
    },
  ];

  for (const ex of examsData) {
    await prisma.exam.upsert({
      where: { id: ex.id },
      update: {
        title: ex.title,
        description: ex.description,
      },
      create: {
        id: ex.id,
        title: ex.title,
        description: ex.description,
      },
    });

    // Hiện chỉ có bộ câu hỏi 2026 (examData2026.ts) nên cả 3 đề minh họa
    // dùng chung để đều làm bài được. Khi có data 2024/2025 riêng thì thay ở đây.
    for (const qInfo of questions2026 as any[]) {
      const topicName = qInfo.topicId || 'Tiếng Việt';
      const topicId = topicMap[topicName];
      if (!topicId) {
        throw new Error(
          `Câu ${qInfo.id}: không có topic "${topicName}". Hiện có: ${Object.keys(topicMap).join(', ')}`,
        );
      }

      const opts = qInfo.options.map((opt: any, i: number) => {
        const isString = typeof opt === 'string';
        return {
          content: (isString ? opt : opt.text || opt.content || '').replace(
            /^[A-D]\.\s*/,
            '',
          ),
          isCorrect: isString ? i === qInfo.correct : !!opt.isCorrect,
          order: i,
        };
      });
      if (opts.filter((o: any) => o.isCorrect).length !== 1) {
        throw new Error(`Câu ${qInfo.id}: phải có đúng 1 đáp án đúng`);
      }

      const fields = {
        content: qInfo.content,
        explanation: qInfo.explanation || null,
        topicId,
      };

      await prisma.$transaction(async (tx) => {
        await tx.question.upsert({
          where: { id: qInfo.id },
          update: fields,
          create: {
            id: qInfo.id,
            type: QuestionType.MULTIPLE_CHOICE,
            difficulty: 0.5, // thang [0,1]; 1200 là rating Elo, không phải difficulty
            ...fields,
          },
        });
        await tx.questionOption.deleteMany({ where: { questionId: qInfo.id } });
        await tx.questionOption.createMany({
          data: opts.map((o: any) => ({ questionId: qInfo.id, ...o })),
        });
      });

      await prisma.examQuestion.upsert({
        where: {
          examId_questionId: { examId: ex.id, questionId: qInfo.id },
        },
        update: {},
        create: { examId: ex.id, questionId: qInfo.id },
      });
    }
  }

  console.log('✅ Đã khởi tạo 3 Bộ đề minh họa ĐGNL (2024, 2025, 2026)');

  // ==================== 4. COURSES (KHÓA HỌC NỀN TẢNG) ====================
  const course1 = await prisma.course.upsert({
    where: { id: 'course-1' },
    update: {
      title: 'Toán nền tảng ĐGNL',
      description: 'Khóa học giới hạn, đạo hàm, tích phân',
      instructorId: instructor.id,
    },
    create: {
      id: 'course-1',
      title: 'Toán nền tảng ĐGNL',
      description: 'Khóa học giới hạn, đạo hàm, tích phân',
      instructorId: instructor.id,
    },
  });

  const chapter1 = await prisma.chapter.upsert({
    where: { id: 'chapter-1' },
    update: { title: 'Chương 1: Giới hạn và liên tục' },
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
    },
  });

  await prisma.material.upsert({
    where: { id: 'material-1' },
    update: {},
    create: {
      id: 'material-1',
      lessonId: lesson1.id,
      type: 'TEXT',
      title: 'Lý thuyết cơ bản',
      content: 'Giới hạn là một khái niệm quan trọng trong giải tích...',
      order: 1,
    },
  });

  await prisma.material.upsert({
    where: { id: 'material-2' },
    update: {},
    create: {
      id: 'material-2',
      lessonId: lesson1.id,
      type: 'PDF',
      title: 'Bài tập tự luyện',
      url: 'https://example.com/exercises.pdf',
      order: 2,
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

  // ==================== 6. EXAM + ATTEMPTS (dùng câu hỏi 2026) ====================
  const exam1 = await prisma.exam.upsert({
    where: { id: 'exam-1' },
    update: {},
    create: {
      id: 'exam-1',
      title: 'Đề thi thử V-ACT số 1',
      description: 'Đề thi mẫu',
    },
  });

  // Gắn 6 câu 2026 vào exam-1 để attempts có dữ liệu chấm điểm
  const exam1QuestionIds = [
    'q-2026-1',
    'q-2026-2',
    'q-2026-3',
    'q-2026-4',
    'q-2026-5',
    'q-2026-6',
    'q-2026-7',
    'q-2026-8',
    'q-2026-9',
    'q-2026-10',
    'q-2026-11',
    'q-2026-12',
    'q-2026-13',
    'q-2026-14',
    'q-2026-15',
    'q-2026-16',
    'q-2026-17',
    'q-2026-18',
    'q-2026-19',
    'q-2026-20',
  ];
  for (const questionId of exam1QuestionIds) {
    await prisma.examQuestion.upsert({
      where: { examId_questionId: { examId: exam1.id, questionId } },
      update: {},
      create: { examId: exam1.id, questionId },
    });
  }

  const testPasswordHash = await bcrypt.hash('Test@123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test.learner@vact.com' },
    update: {
      passwordHash: testPasswordHash,
      fullName: 'Learner Test API',
      role: Role.STUDENT,
    },
    create: {
      email: 'test.learner@vact.com',
      passwordHash: testPasswordHash,
      fullName: 'Learner Test API',
      role: Role.STUDENT,
      targetScore: 900,
    },
  });

  const seededQuestions = await prisma.question.findMany({
    where: { id: { in: exam1QuestionIds } },
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
  const [aq1, aq2, aq3, aq4, aq5, aq6] = exam1QuestionIds;

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
            questionId: aq1,
            selectedOptionIds: correctOptionIds(aq1),
            isCorrect: true,
            timeSpent: 45,
          },
          {
            questionId: aq2,
            selectedOptionIds: correctOptionIds(aq2),
            isCorrect: true,
            timeSpent: 20,
          },
          {
            questionId: aq3,
            selectedOptionIds: [wrongOptionId(aq3)],
            isCorrect: false,
            timeSpent: 80,
          },
          {
            questionId: aq4,
            selectedOptionIds: correctOptionIds(aq4),
            isCorrect: true,
            timeSpent: 30,
          },
          {
            questionId: aq5,
            selectedOptionIds: [wrongOptionId(aq5)],
            isCorrect: false,
            timeSpent: 25,
          },
          {
            questionId: aq6,
            selectedOptionIds: correctOptionIds(aq6),
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
        create: exam1QuestionIds.map((questionId, index) => ({
          questionId,
          selectedOptionIds: correctOptionIds(questionId),
          isCorrect: true,
          timeSpent: [30, 18, 55, 22, 15, 35][index],
        })),
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
            questionId: aq1,
            selectedOptionIds: correctOptionIds(aq1),
            isCorrect: false,
            timeSpent: 15,
          },
          {
            questionId: aq2,
            selectedOptionIds: [],
            isCorrect: false,
            timeSpent: 0,
          },
          {
            questionId: aq3,
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
          { questionId: aq1, selectedOptionIds: [], isCorrect: false },
          { questionId: aq2, selectedOptionIds: [], isCorrect: false },
        ],
      },
    },
  });

  console.log('✅ Đã khởi tạo Khóa học nền tảng (Course-1)');
  console.log('🎉 Hoàn tất quá trình Seed dữ liệu!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });