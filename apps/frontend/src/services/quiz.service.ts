import api from './api';
import type { Question } from '../types';

export const quizService = {
  // Lấy danh sách câu hỏi của một đề thi cụ thể
  getExamQuestions: async (examId: string): Promise<Question[]> => {
    const { data } = await api.get(`/exams/${examId}/questions`);
    return data;
  },

  // Nộp bài thi lên Backend để chấm điểm
  submitExam: async (examId: string, answers: Record<string, string>) => {
    const { data } = await api.post(`/exams/${examId}/submit`, { answers });
    return data;
  }
};