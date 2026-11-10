import api from './api';
import type { Question } from '../types';

export const quizService = {
  // Lấy danh sách đề thi (nếu cần lấy list exams)
  getAllExams: async () => {
    const { data } = await api.get('/exams');
    return data;
  },

  // Metadata đề thi để hiển thị màn giới thiệu (KHÔNG chứa nội dung câu hỏi/đáp án).
  // Response: { id, title, description, questionCount }.
  getExamMeta: async (
    examId: string,
  ): Promise<{ id: string; title: string; description: string | null; questionCount: number }> => {
    const { data } = await api.get(`/exams/${examId}`);
    const count = Array.isArray(data?.questions) ? data.questions.length : 0;
    return {
      id: data.id,
      title: data.title,
      description: data.description ?? null,
      questionCount: count,
    };
  },

  // Lấy danh sách câu hỏi của một đề thi cụ thể (BE đã strip `isCorrect`).
  getExamQuestions: async (examId: string): Promise<Question[]> => {
    const { data } = await api.get(`/exams/${examId}/questions`);
    return data;
  },
};
