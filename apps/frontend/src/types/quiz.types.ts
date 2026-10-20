export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  examId: string;
  content: string;
  options: Option[];
  level?: string; // Ví dụ: "Nhận biết", "Thông hiểu", "Vận dụng"
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>; // { questionId: optionId }
  reviewList: Record<string, boolean>; // Lưu trạng thái cần kiểm tra lại { questionId: true/false }
  currentStep: 'intro' | 'playing' | 'result';
  score: number;
}