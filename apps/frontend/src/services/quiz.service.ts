import api from './api';
import type { Question } from '../types';

export const quizService = {
  // Gọi chính xác API /exams/:id/questions của NestJS Backend
  getExamQuestions: async (examId: string): Promise<Question[]> => {
    const { data } = await api.get(`/exams/${examId}/questions`);
    return data;
  },

  // Nộp bài thi
  submitExam: async (examId: string, answers: Record<string, string>) => {
    const { data } = await api.post(`/exams/${examId}/submit`, { answers });
    return data;
  },
};