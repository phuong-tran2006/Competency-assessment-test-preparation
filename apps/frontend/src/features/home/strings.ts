// src/features/home/strings.ts
// All homepage text lives here. To add English later, export a second object
// with the same shape and pick one by language.

export const BRAND = "V-ACT Learning"; // TODO: replace with the group's final platform name

// Routes taken from App.tsx
export const ROUTES = {
  home: "/",
  exams: "/courses", // existing exam list page (CourseList)
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
    badge: "Luyện thi đánh giá năng lực",
    title: "Ôn thi V-ACT đúng chủ đề, vừa với thời gian của bạn",
    subtitle:
      "Luyện đề theo cấu trúc đề đánh giá năng lực, có đồng hồ đếm ngược và chấm điểm tự động.",
    ctaPrimary: "Bắt đầu làm bài",
    ctaSecondary: "Đăng ký miễn phí",
  },

  // Pain points P1-P3 from the proposal. They are marked "to be validated by a
  // survey", so keep the wording as difficulties, not as statistics.
  problems: {
    title: "Ôn thi đánh giá năng lực không dễ",
    items: [
      {
        title: "Quỹ thời gian ngắn",
        text: "Chỉ có khoảng 30 phút mỗi ngày nhưng không biết chọn chủ đề và bộ câu hỏi nào cho vừa.",
      },
      {
        title: "Không biết bắt đầu từ đâu",
        text: "Đề có nhiều phần và nhiều chủ đề, khó xác định nên ưu tiên phần nào trước.",
      },
      {
        title: "Kết quả chỉ có tổng điểm",
        text: "Không biết mình yếu ở chủ đề nào và mất bao lâu cho mỗi câu hỏi.",
      },
    ],
  },

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

  roles: {
    title: "Dành cho mọi vai trò",
    items: [
      {
        title: "Học viên",
        text: "Làm đề, xem kết quả và theo dõi tiến độ ôn tập của mình.",
      },
      {
        title: "Giảng viên",
        text: "Soạn khóa học và ngân hàng câu hỏi gắn chủ đề, độ khó, giải thích.",
      },
      {
        title: "Quản trị viên",
        text: "Quản lý tài khoản, khóa học, nội dung bị báo cáo và thống kê.",
      },
    ],
  },

  footer: {
    project: "Sản phẩm đồ án CO3103, học kỳ 261 (Nhóm 20).",
    disclaimer:
      "Nền tảng luyện tập do sinh viên xây dựng, không liên kết chính thức với ĐHQG-HCM hay Trung tâm Khảo thí.",
  },
};
