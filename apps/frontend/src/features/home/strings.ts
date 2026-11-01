// src/features/home/strings.ts
// All homepage text lives here. To add English later, export a second object
// with the same shape and pick one by language.

export const BRAND = "V-ACT Learning"; // TODO: replace with the group's final platform name

// Routes taken from App.tsx
export const ROUTES = {
  home: "/",
  courses: "/courses",
  exams: "/exams", // Phòng thi thử (ExamList) — trước đây trỏ nhầm sang /courses
  practice: "/practice", // /practice/:examId (QuizPage)
  login: "/login",
  register: "/register",
};

export const STR = {
  nav: {
    exams: "Bộ đề",
    course: "Khóa học",
    how: "Hướng dẫn",
    structure: "Cấu trúc đề",
    login: "Đăng nhập",
    register: "Đăng ký",
    enter: "Vào học",
  },

  hero: {
    badge: "Luyện thi Đánh giá Năng lực ĐHQG TP.HCM",
    title: "Bứt phá điểm số V-ACT – Ôn trọng tâm, chuẩn nhịp thời gian!",
    subtitle:
      "Lộ trình bài bản, cá nhân hóa, luyện đề sát cấu trúc ĐGNL và hệ thống chấm điểm tự động giúp bạn bứt phá mỗi ngày.",
    ctaPrimary: "Bắt đầu làm bài",
    ctaSecondary: "Đăng ký miễn phí",
  },

  // Pain points P1-P3 from the proposal. They are marked "to be validated by a
  // survey", so keep the wording as difficulties, not as statistics.

  // Set available: true only for steps that really work in the deployed demo.
  how: {
    title: "Hướng dẫn",
    soon: "Sắp ra mắt",
    steps: [
      {
        title: "Làm bài",
        text: "Làm đề luyện tập có giới hạn thời gian, nộp bài và nhận kết quả.",
        available: true,
      },
      {
        title: "Xem hồ sơ theo chủ đề",
        text: "Điểm được tổng hợp theo từng chủ đề của đề thi để thấy chỗ mạnh và chỗ yếu.",
        available: false,
      },
      {
        title: "Nhận gợi ý",
        text: "Gợi ý bài học và bộ câu hỏi kèm lý do, theo số phút bạn có hôm nay.",
        available: false,
      },
      {
        title: "Luyện tập tiếp",
        text: "Làm bộ câu hỏi vừa sức; kết quả mới được cập nhật vào hồ sơ của bạn.",
        available: false,
      },
    ],
  },

  // Official structure of the exam since 2025: 120 questions, 150 minutes.
  structure: {
    title: "Cấu trúc đề đánh giá năng lực",
    summary: "120 câu trắc nghiệm, 150 phút, mỗi câu có 4 lựa chọn.",
    unit: "câu",
    sections: [
      { name: "Tiếng Việt", questions: 30 },
      { name: "Tiếng Anh", questions: 30 },
      { name: "Toán học", questions: 30 },
      { name: "Logic, phân tích số liệu", questions: 12 },
      { name: "Suy luận khoa học", questions: 18 },
    ],
    source:
      "Theo cấu trúc đề thi đánh giá năng lực ĐHQG-HCM áp dụng từ năm 2025.",
  },

  courses: {
    title: "Khóa học",
    empty: "Chưa có khóa học nào để hiển thị.",
    loading: "Đang tải khóa học...",
    open: "Vào học",
    items: [
      {
        title: "Toán tư duy",
        text: "Ôn tập toàn diện kiến thức Toán học theo cấu trúc mới.",
        link: ROUTES.exams,
      },
      {
        title: "Phân tích số liệu & Logic",
        text: "Rèn luyện kỹ năng suy luận logic và đọc biểu đồ.",
        link: ROUTES.exams,
      },
      {
        title: "Tiếng Anh",
        text: "Hệ thống lại ngữ pháp và từ vựng thường gặp trong đề.",
        link: ROUTES.exams,
      },
    ],
  },

  featured: {
    title: "Bộ đề luyện tập",
    empty: "Chưa có bộ đề nào để hiển thị.",
    loading: "Đang tải bộ đề...",
    questions: "câu hỏi",
    open: "Vào học",
    all: "Xem tất cả bộ đề",
  },

  footer: {
    project: "Sản phẩm đồ án CO3103, học kỳ 261 (Nhóm 20).",
    disclaimer:
      "Nền tảng luyện tập do sinh viên xây dựng, không liên kết chính thức với ĐHQG-HCM hay Trung tâm Khảo thí.",
  },
};
