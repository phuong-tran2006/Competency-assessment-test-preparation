import { create } from 'zustand';

interface Question {
  id: string;
  content: string;
  options: { id: string; text: string }[];
}

interface QuizState {
  questions: Question[];
  answers: Record<string, string>; // Lưu dạng { "questionId": "optionId" }
  currentIndex: number;
  setQuestions: (questions: Question[]) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  questions: [],
  answers: {},
  currentIndex: 0,
  
  setQuestions: (questions) => set({ questions }),
  
  setAnswer: (questionId, optionId) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: optionId },
    })),
    
  nextQuestion: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
    })),
    
  prevQuestion: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),
    
  jumpToQuestion: (index) => set({ currentIndex: index }),
}));