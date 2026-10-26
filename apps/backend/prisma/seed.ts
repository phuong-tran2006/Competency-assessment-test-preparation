import 'dotenv/config';
import { PrismaClient, QuestionType, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu chuẩn cho hệ thống V-ACT (giữ nguyên cơ chế chấm điểm)...');

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
      role: Role.LEARNER,
    },
  });

  // 2. Tạo Chủ đề (Topic) theo đúng format ĐGNL: mỗi câu 1 topic
  const topicDefs = [
    { name: 'Toán', description: 'Toán học và tư duy định lượng' },
    { name: 'Tiếng Việt', description: 'Ngữ văn và đọc hiểu tiếng Việt' },
    { name: 'Tiếng Anh', description: 'Ngữ pháp và đọc hiểu tiếng Anh' },
    { name: 'Logic - Suy luận', description: 'Tư duy logic và phân tích số liệu' },
  ];
  const topics: Record<string, { id: string }> = {};
  for (const t of topicDefs) {
    topics[t.name] = await prisma.topic.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  // Map questionId -> topic
  const questionTopics: Record<string, string> = {
    'q-2026-1': 'Toán', 'q-2026-2': 'Tiếng Việt', 'q-2026-3': 'Toán',
    'q-2026-4': 'Tiếng Anh', 'q-2026-5': 'Toán', 'q-2026-6': 'Toán',
    'q-2025-1': 'Tiếng Việt', 'q-2025-2': 'Toán', 'q-2025-3': 'Tiếng Việt',
    'q-2025-4': 'Toán', 'q-2025-5': 'Toán', 'q-2025-6': 'Tiếng Việt',
    'q-2024-1': 'Toán', 'q-2024-2': 'Toán', 'q-2024-3': 'Tiếng Việt',
    'q-2024-4': 'Toán', 'q-2024-5': 'Toán', 'q-2024-6': 'Tiếng Việt',
  };

  // 3. Cấu hình 3 bộ đề khớp đúng với giao diện
  const examsConfig = [
    {
      id: 'vact-exam-2026',
      title: 'Đề minh họa ĐGNL ĐHQG TPHCM năm 2026',
      description: 'Bộ đề thi chuẩn cấu trúc mới nhất năm 2026, bao gồm các câu hỏi tư duy và giải tích.',
      questions: [
        { id: 'q-2026-1', content: 'Giới hạn của hàm số f(x) = (x^2 - 1)/(x - 1) khi x tiến đến 1 là bao nhiêu?', correct: 2, options: ['0', '1', '2', 'Không tồn tại'] },
        { id: 'q-2026-2', content: 'Từ nào sau đây viết ĐÚNG chính tả tiếng Việt?', correct: 1, options: ['Sán lán', 'Xán lạn', 'Sáng lạng', 'Chăm chúm'] },
        { id: 'q-2026-3', content: 'Đạo hàm của hàm số y = x^3 tại điểm x = 2 bằng bao nhiêu?', correct: 3, options: ['6', '8', '9', '12'] },
        { id: 'q-2026-4', content: 'Choose the correct answer: "She ___ to school every day."', correct: 1, options: ['go', 'goes', 'going', 'gone'] },
        { id: 'q-2026-5', content: 'Trong không gian Oxyz, mặt phẳng (P): x + y + z - 3 = 0 có véctơ pháp tuyến là:', correct: 0, options: ['n = (1, 1, 1)', 'n = (1, 1, -3)', 'n = (0, 0, 1)', 'n = (1, -1, 1)'] },
        { id: 'q-2026-6', content: 'Một hình chữ nhật có chu vi bằng 40cm, chiều dài hơn chiều rộng 4cm. Diện tích là:', correct: 0, options: ['96 cm²', '100 cm²', '84 cm²', '120 cm²'] },
      ],
    },
    {
      id: 'vact-exam-2025',
      title: 'Đề minh họa ĐGNL ĐHQG TPHCM năm 2025',
      description: 'Đề thi chính thức và minh họa lưu trữ năm 2025, rèn luyện tư duy logic và phân tích số liệu.',
      questions: [
        { id: 'q-2025-1', content: 'Thể loại của tác phẩm "Đăm Săn" trong kho tàng văn học dân gian là gì?', correct: 2, options: ['Thần thoại', 'Truyền thuyết', 'Sử thi', 'Truyện cổ tích'] },
        { id: 'q-2025-2', content: 'Cho cấp số cộng có u1 = 3 và công sai d = 2. Giá trị của u4 là:', correct: 1, options: ['7', '9', '11', '13'] },
        { id: 'q-2025-3', content: 'Từ "long lanh" trong câu "Nước hồ long lanh" thuộc loại từ nào?', correct: 2, options: ['Từ đơn', 'Từ ghép', 'Từ láy', 'Từ phức'] },
        { id: 'q-2025-4', content: 'Tích phân từ 0 đến 1 của hàm số f(x) = 2xdx có giá trị bằng:', correct: 0, options: ['1', '2', '0.5', '0'] },
        { id: 'q-2025-5', content: 'Giải phương trình log2(x) = 3. Nghiệm của phương trình là:', correct: 2, options: ['6', '9', '8', '3'] },
        { id: 'q-2025-6', content: 'Thị Phương là nhân vật trong vở chèo cổ nào?', correct: 3, options: ['Quan Âm Thị Kính', 'Lưu Bình - Dương Lễ', 'Súy Vân', 'Trương Viên'] },
      ],
    },
    {
      id: 'vact-exam-2024',
      title: 'Đề minh họa ĐGNL ĐHQG TPHCM năm 2024',
      description: 'Bộ đề ôn tập nền tảng từ kỳ thi ĐGNL năm 2024, củng cố kiến thức cơ bản.',
      questions: [
        { id: 'q-2024-1', content: 'Số phức z = 3 - 4i có phần thực và phần ảo lần lượt là:', correct: 0, options: ['3 và -4', '-3 và 4', '3 và 4', '-3 và -4'] },
        { id: 'q-2024-2', content: 'Tập nghiệm của bất phương trình 2^x > 4 là:', correct: 1, options: ['(1; +inf)', '(2; +inf)', '(0; 2)', '(-inf; 2)'] },
        { id: 'q-2024-3', content: 'Tác giả của đoạn trích "Đất nước" trong chương trình Ngữ văn là ai?', correct: 2, options: ['Tố Hữu', 'Huy Cận', 'Nguyễn Khoa Điềm', 'Xuân Quỳnh'] },
        { id: 'q-2024-4', content: 'Cho tam giác ABC vuông tại A có AB = 3cm, AC = 4cm. Độ dài cạnh huyền BC là:', correct: 1, options: ['6 cm', '5 cm', '7 cm', 'sqrt(7) cm'] },
        { id: 'q-2024-5', content: 'Hàm số y = -x^3 + 3x nghịch biến trên khoảng nào dưới đây?', correct: 3, options: ['(-1; 1)', '(0; +inf)', '(-inf; -1)', '(-inf; -1) và (1; +inf)'] },
        { id: 'q-2024-6', content: 'Điền từ còn thiếu vào câu tục ngữ: "Uống nước nhớ ..."', correct: 0, options: ['nguồn', 'nơi', 'ông', 'cha'] },
      ],
    },
  ];

  for (const exData of examsConfig) {
    await prisma.exam.upsert({
      where: { id: exData.id },
      update: {},
      create: {
        id: exData.id,
        title: exData.title,
        description: exData.description,
      },
    });

    for (const qInfo of exData.questions) {
      await prisma.question.upsert({
        where: { id: qInfo.id },
        update: {},
        create: {
          id: qInfo.id,
          content: qInfo.content,
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: 0.5,
          topicId: topics[questionTopics[qInfo.id] ?? 'Toán'].id,
          options: {
            create: qInfo.options.map((optText, optIdx) => ({
              content: optText,
              isCorrect: optIdx === qInfo.correct,
              order: optIdx,
            })),
          },
        },
      });

      await prisma.examQuestion.upsert({
        where: {
          examId_questionId: { examId: exData.id, questionId: qInfo.id },
        },
        update: {},
        create: { examId: exData.id, questionId: qInfo.id },
      });
    }
  }

  console.log('✅ Exams + Questions đã tạo (3 đề, mỗi đề 6 câu, gắn đúng topic Toán/Tiếng Việt/Tiếng Anh)');

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
  for (const [idx, topicName] of ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Logic - Suy luận'].entries()) {
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
  console.log('Counts:', counts);

  console.log('🚀 Seed thành công toàn bộ đề thi kèm đáp án chuẩn để làm bài và chấm điểm tự động!');
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
