import { create } from 'zustand';
import type { QuizState, Question } from '../types/quiz.types';

// Mở rộng giao diện QuizStore để bao gồm đầy đủ các hàm, trạng thái và dữ liệu kết quả từ BE
interface QuizStore extends QuizState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setQuestions: (questions: Question[]) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  toggleReview: (questionId: string) => void; 
  setStep: (step: 'intro' | 'playing' | 'result') => void;
  jumpToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => void;
  resetQuiz: () => void;
  
  // State lưu kết quả thi trả về từ Backend
  resultData: any; 
  setResultData: (data: any) => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  questions: [],
  loading: true,
  currentIndex: 0,
  answers: {},
  reviewList: {}, 
  currentStep: 'intro',
  score: 0,
  resultData: null, // Khởi tạo ban đầu là null

  setLoading: (loading) => set({ loading }),
  setQuestions: (questions) => set({ questions }),
  
  setAnswer: (questionId, optionId) => 
    set((state) => ({ answers: { ...state.answers, [questionId]: optionId } })),

  toggleReview: (questionId) => 
    set((state) => ({
      reviewList: { 
        ...state.reviewList, 
        [questionId]: !state.reviewList[questionId] 
      }
    })),
  
  setStep: (step) => set({ currentStep: step }),

  jumpToQuestion: (index) => set({ currentIndex: index }),

  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),

  prevQuestion: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0), // Đã sửa lỗi thiếu dấu phẩy
    })),

  submitQuiz: () => {
    set({ currentStep: 'result' });
  },

  setResultData: (data) => set({ resultData: data }),

  resetQuiz: () => set({ 
    answers: {}, 
    reviewList: {},
    currentStep: 'intro', 
    score: 0,
    currentIndex: 0,
    loading: false,
    resultData: null
  }),
}));