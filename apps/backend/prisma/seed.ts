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
  await prisma.user.upsert({
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

  // 2. Tạo Chủ đề (Topic)
  const topic = await prisma.topic.upsert({
    where: { name: 'Toán học & Ngôn ngữ tổng hợp' },
    update: {},
    create: { 
      name: 'Toán học & Ngôn ngữ tổng hợp', 
      description: 'Chủ đề trọng tâm ôn thi Đánh giá năng lực' 
    },
  });

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
        { id: 'q-2026-6', content: 'Một hình chữ nhật có chu vi bằng 40cm, chiều dài hơn chiều rộng 4cm. Diện tích là:', correct: 0, options: ['96 cm²', '100 cm²', '84 cm²', '120 cm²'] }
      ]
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
        { id: 'q-2025-6', content: 'Thị Phương là nhân vật trong vở chèo cổ nào?', correct: 3, options: ['Quan Âm Thị Kính', 'Lưu Bình - Dương Lễ', 'Súy Vân', 'Trương Viên'] }
      ]
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
        { id: 'q-2024-6', content: 'Điền từ còn thiếu vào câu tục ngữ: "Uống nước nhớ ..."', correct: 0, options: ['nguồn', 'nơi', 'ông', 'cha'] }
      ]
    }
  ];

  for (const exData of examsConfig) {
    const exam = await prisma.exam.upsert({
      where: { id: exData.id },
      update: {},
      create: {
        id: exData.id,
        title: exData.title,
        description: exData.description,
      },
    });

    for (let i = 0; i < exData.questions.length; i++) {
      const qInfo = exData.questions[i];

      await prisma.question.upsert({
        where: { id: qInfo.id },
        update: {},
        create: {
          id: qInfo.id,
          content: qInfo.content,
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: 0.5,
          topicId: topic.id,
          options: {
            create: qInfo.options.map((optText, optIdx) => ({
              content: optText,
              isCorrect: optIdx === qInfo.correct,
              order: optIdx,
            })),
          },
        },
      });

      // Đã loại bỏ thuộc tính "order" gây lỗi
      await prisma.examQuestion.upsert({
        where: { examId_questionId: { examId: exam.id, questionId: qInfo.id } },
        update: {},
        create: { examId: exam.id, questionId: qInfo.id },
      });
    }
  }

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