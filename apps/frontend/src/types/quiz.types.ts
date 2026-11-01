export interface Option {
  id: string;
  text: string;
  isCorrect?: boolean | string | number;
}

export interface Question {
  id: string;
  // Attempt tự sinh đề không gắn với exam nào nên examId là optional
  examId?: string;
  content: string;
  options: Option[];
  level?: string; // Ví dụ: "Nhận biết", "Thông hiểu", "Vận dụng"
  explanation?: string;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>; // { questionId: optionId }
  reviewList: Record<string, boolean>; // Lưu trạng thái cần kiểm tra lại { questionId: true/false }
  currentStep: 'intro' | 'playing' | 'result' | 'review';
  score: number;
}