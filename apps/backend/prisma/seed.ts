import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
  }

  console.log('✅ Đã khởi tạo 3 Bộ đề minh họa ĐGNL (2024, 2025, 2026)');

  // ==================== 4. COURSES (KHÓA HỌC NỀN TẢNG) ====================
  await prisma.course.upsert({
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