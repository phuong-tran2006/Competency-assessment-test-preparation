export interface LessonItem {
  id: string;
  title: string;
  duration: string;
  content: string;
  pdfUrl?: string;
}

export interface ChapterItem {
  id: string;
  title: string;
  lessons: LessonItem[];
}

export interface CourseItem {
  id: string;
  badge: string;
  title: string;
  description: string;
  chapters: ChapterItem[];
}

export const COURSES_DATA: Record<string, CourseItem> = {
  'toan-tu-duy': {
    id: 'toan-tu-duy',
    badge: 'PHẦN 2: TOÁN HỌC',
    title: 'Toán tư duy',
    description: 'Ôn tập toàn diện kiến thức Toán học theo cấu trúc mới.',
    chapters: [
      {
        id: 'ch-1',
        title: 'Chương 1: Giới hạn và Liên tục',
        lessons: [
          {
            id: 'l-1',
            title: 'Bài 1: Khái niệm giới hạn dãy số & hàm số',
            duration: '20 phút',
            content:
              'Giới hạn của hàm số là giá trị mà hàm số tiến tới khi biến số tiến đến một giá trị xác định. Trọng tâm đề V-ACT thường rơi vào các dạng vô định 0/0, ∞/∞ và ứng dụng tìm tiệm cận.',
            pdfUrl: 'https://example.com/toan-gioi-han.pdf',
          },
          {
            id: 'l-2',
            title: 'Bài 2: Các dạng bài tập giới hạn thường gặp',
            duration: '25 phút',
            content:
              'Luyện tập kỹ thuật nhân liên hợp, chia cho lũy thừa bậc cao nhất và mẹo bấm máy tính Casio kiểm tra nhanh kết quả.',
          },
        ],
      },
      {
        id: 'ch-2',
        title: 'Chương 2: Đạo hàm và Ứng dụng',
        lessons: [
          {
            id: 'l-3',
            title: 'Bài 1: Tính đơn điệu và cực trị hàm số',
            duration: '30 phút',
            content:
              'Cách lập bảng biến thiên nhanh, đọc đồ thị f(x) và f\'(x) để xác định khoảng đồng biến, nghịch biến và điểm cực trị.',
          },
        ],
      },
    ],
  },
  'phan-tich-so-lieu-logic': {
    id: 'phan-tich-so-lieu-logic',
    badge: 'PHẦN 3: TƯ DUY KHOA HỌC',
    title: 'Phân tích số liệu & Logic',
    description: 'Rèn luyện kỹ năng suy luận logic và đọc biểu đồ.',
    chapters: [
      {
        id: 'ch-logic-1',
        title: 'Chương 1: Tư duy Logic mệnh đề',
        lessons: [
          {
            id: 'l-logic-1',
            title: 'Bài 1: Mệnh đề điều kiện và suy luận kéo theo',
            duration: '20 phút',
            content:
              'Nắm vững quy tắc phủ định, mệnh đề đảo, phản đảo và cách giải nhanh nhóm câu hỏi sắp xếp vị trí trong đề ĐGNL.',
          },
        ],
      },
      {
        id: 'ch-logic-2',
        title: 'Chương 2: Đọc hiểu & Phân tích biểu đồ',
        lessons: [
          {
            id: 'l-logic-2',
            title: 'Bài 1: Biểu đồ tròn, cột và tính tốc độ tăng trưởng',
            duration: '25 phút',
            content:
              'Công thức tính phần trăm thay đổi, tỷ trọng và phương pháp ước lượng nhanh để tiết kiệm thời gian làm bài.',
          },
        ],
      },
    ],
  },
  'tieng-anh': {
    id: 'tieng-anh',
    badge: 'PHẦN 1: SỬ DỤNG NGÔN NGỮ',
    title: 'Tiếng Anh',
    description: 'Hệ thống lại ngữ pháp và từ vựng thường gặp trong đề.',
    chapters: [
      {
        id: 'ch-en-1',
        title: 'Chương 1: Ngữ pháp trọng tâm V-ACT',
        lessons: [
          {
            id: 'l-en-1',
            title: 'Bài 1: Các thì, câu điều kiện và mệnh đề quan hệ',
            duration: '25 phút',
            content:
              'Tổng hợp cấu trúc ngữ pháp xuất hiện với tần suất cao trong phần chọn đáp án đúng và tìm lỗi sai.',
          },
        ],
      },
      {
        id: 'ch-en-2',
        title: 'Chương 2: Kỹ năng Đọc hiểu (Reading)',
        lessons: [
          {
            id: 'l-en-2',
            title: 'Bài 1: Chiến thuật Skimming & Scanning',
            duration: '20 phút',
            content:
              'Cách xác định ý chính (Main idea), từ đồng nghĩa trong ngữ cảnh và câu hỏi suy luận (Inference).',
          },
        ],
      },
    ],
  },
};