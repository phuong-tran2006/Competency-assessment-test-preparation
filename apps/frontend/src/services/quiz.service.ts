import api from './api';
import type { Question } from '../types';

export const quizService = {
  getAllExams: async () => {
    const { data } = await api.get('/exams');
    return data;
  },

  getExamQuestions: async (examId: string): Promise<Question[]> => {
    const { data } = await api.get(`/exams/${examId}/questions`);
    return data;
  },

  // Gửi kèm danh sách toàn bộ questionIds của đề thi để Backend chấm đủ 20/20 câu
  submitExam: async (
    examId: string,
    answers: Record<string, string>,
    questionIds?: string[],
  ) => {
    const { data } = await api.post(`/exams/${examId}/submit`, {
      answers,
      questionIds,
    });
    return data;
  },
};