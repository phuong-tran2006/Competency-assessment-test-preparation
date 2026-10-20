import { create } from 'zustand';
import type { QuizState, Question } from '../types/quiz.types';

// Mở rộng giao diện QuizStore để bao gồm các hàm và trạng thái mới
interface QuizStore extends QuizState {
  loading: boolean; // Trạng thái đang tải dữ liệu
  setLoading: (loading: boolean) => void;
  setQuestions: (questions: Question[]) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  toggleReview: (questionId: string) => void; 
  setStep: (step: 'intro' | 'playing' | 'result') => void;
  jumpToQuestion: (index: number) => void;
  nextQuestion: () => void; // Hàm chuyển câu tiếp theo
  prevQuestion: () => void; // Hàm lùi lại câu trước
  submitQuiz: () => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizStore>((set) => ({
  questions: [],
  loading: true, // Mặc định là true khi vừa khởi tạo
  currentIndex: 0,
  answers: {},
  reviewList: {}, 
  currentStep: 'intro',
  score: 0,

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

  // Logic chuyển câu an toàn (không vượt quá giới hạn mảng)
  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),

  prevQuestion: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  submitQuiz: () => {
    set({ currentStep: 'result' });
  },

  resetQuiz: () => set({ 
    answers: {}, 
    reviewList: {},
    currentStep: 'intro', 
    score: 0,
    currentIndex: 0,
    loading: false // Tắt loading khi reset
  }),
}));