import api from './api';
import type { Question } from '../types';

export const quizService = {
  // Lấy danh sách đề thi (nếu cần lấy list exams)
  getAllExams: async () => {
    const { data } = await api.get('/exams');
    return data;
  },

  // Lấy danh sách câu hỏi của một đề thi cụ thể (không còn chứa isCorrect)
  getExamQuestions: async (examId: string): Promise<Question[]> => {
    const { data } = await api.get(`/exams/${examId}/questions`);
    // Map dữ liệu để đảm bảo tương thích với type FE
    return data.map((q: any) => ({
      id: q.id,
      content: q.content,
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text || opt.content,
      })),
    }));
  },

  // Nộp bài thi lên Backend, nhận về điểm số và chi tiết chấm điểm
  submitExam: async (examId: string, answers: Record<string, string>) => {
    // Chuyển đổi định dạng answers sang Record<string, string[]> theo yêu cầu của DTO backend
    const formattedAnswers: Record<string, string[]> = {};
    for (const [qId, optId] of Object.entries(answers)) {
      formattedAnswers[qId] = [optId];
    }

    const { data } = await api.post(`/exams/${examId}/submit`, {
      answers: formattedAnswers,
    });
    
    // Trả về object kết quả: { score, total, percentage, details, attemptId }
    return data;
  },
};