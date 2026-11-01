import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuizState, Question } from "../types/quiz.types";

// Mở rộng giao diện QuizStore để bao gồm đầy đủ các hàm, trạng thái và dữ liệu kết quả từ BE
interface QuizStore extends QuizState {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setQuestions: (questions: Question[]) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  toggleReview: (questionId: string) => void;
  setStep: (step: "intro" | "playing" | "result" | "review") => void;
  currentStep: "intro" | "playing" | "result" | "review";
  jumpToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => void;
  resetQuiz: () => void;

  // State lưu kết quả thi trả về từ Backend
  resultData: any;
  setResultData: (data: any) => void;

  // Mã lượt làm bài (ExamAttempt) đang mở, dùng để lưu đáp án và nộp bài
  attemptId: string | null;
  setAttemptId: (attemptId: string | null) => void;

  timeLeft: number;
  setTimeLeft: (updater: number | ((prev: number) => number)) => void;
}

export const useQuizStore = create<QuizStore>()(
  persist(
    (set) => ({
      questions: [],
      loading: true,
      currentIndex: 0,
      answers: {},
      reviewList: {},
      currentStep: "intro",
      score: 0,
      resultData: null,
      attemptId: null,
      timeLeft: 3600,

      setLoading: (loading) => set({ loading }),
      setQuestions: (questions) => set({ questions }),

      setAnswer: (questionId, optionId) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: optionId },
        })),

      toggleReview: (questionId) =>
        set((state) => ({
          reviewList: {
            ...state.reviewList,
            [questionId]: !state.reviewList[questionId],
          },
        })),

      setStep: (step) => set({ currentStep: step }),

      jumpToQuestion: (index) => set({ currentIndex: index }),

      nextQuestion: () =>
        set((state) => ({
          currentIndex: Math.min(
            state.currentIndex + 1,
            state.questions.length - 1,
          ),
        })),

      prevQuestion: () =>
        set((state) => ({
          currentIndex: Math.max(state.currentIndex - 1, 0),
        })),

      submitQuiz: () => {
        set({ currentStep: "result" });
      },

      setResultData: (data) => set({ resultData: data }),

      setAttemptId: (attemptId) => set({ attemptId }),

      setTimeLeft: (updater) =>
        set((state) => ({
          timeLeft:
            typeof updater === "function" ? updater(state.timeLeft) : updater,
        })),

      resetQuiz: () => {
        set({
          answers: {},
          reviewList: {},
          currentStep: "intro",
          score: 0,
          timeLeft: 3600,
          attemptId: null,
          resultData: null,
        });
        localStorage.removeItem("vact-exam-progress");
      },
    }),
    {
      name: "vact-exam-progress", // Tên key dùng để lưu trữ dưới LocalStorage
      partialize: (state) => ({
        // Chỉ định lưu lại các state quan trọng nhất
        answers: state.answers,
        reviewList: state.reviewList,
        currentStep: state.currentStep,
        timeLeft: state.timeLeft,
        attemptId: state.attemptId,
      }),
    },
  ),
);
