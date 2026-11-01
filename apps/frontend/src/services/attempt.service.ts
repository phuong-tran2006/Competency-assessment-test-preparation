import api from './api';

export interface AttemptOption {
  id: string;
  content: string;
  order: number;
  isCorrect?: boolean;
}

export interface AttemptDetail {
  questionId: string;
  content: string;
  explanation: string | null;
  difficulty: number;
  topic: { id: string; name: string };
  isCorrect: boolean;
  timeSpent: number;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  options: AttemptOption[];
}

export interface TopicSummary {
  topicId: string;
  name: string;
  correct: number;
  total: number;
  percentage: number;
  weightedScore: number;
  timeSpent: number;
}

export interface AttemptResults {
  attemptId: string;
  status: string;
  score: number;
  weightedScore: number;
  total: number;
  submittedAt: string | null;
  summary: {
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    percentage: number;
    weightedPercentage: number;
    maxWeightedScore: number;
  };
  topicSummary: TopicSummary[];
  details: AttemptDetail[];
}

export interface HistoryItem {
  id: string;
  score: number;
  weightedScore: number;
  total: number;
  startedAt: string;
  submittedAt: string | null;
  exam: { id: string; title: string } | null;
}

export const attemptService = {
  // Bắt đầu một lượt làm bài theo đề có sẵn
  start: async (examId: string, timeLimit?: number) => {
    const { data } = await api.post('/attempts', { examId, timeLimit });
    return data;
  },

  // Bắt đầu một lượt luyện tập tự sinh đề theo topic
  startPractice: async (payload: {
    topicIds?: string[];
    questionCount?: number;
    timeLimit?: number;
  }) => {
    const { data } = await api.post('/attempts', payload);
    return data;
  },

  getAttempt: async (attemptId: string) => {
    const { data } = await api.get(`/attempts/${attemptId}`);
    return data;
  },

  // Lưu câu trả lời từng câu (có ghi nhận thời gian làm)
  saveAnswer: async (
    attemptId: string,
    questionId: string,
    selectedOptionIds: string[],
    timeSpent = 0,
  ) => {
    const { data } = await api.put(
      `/attempts/${attemptId}/answers/${questionId}`,
      { selectedOptionIds, timeSpent },
    );
    return data;
  },

  submit: async (attemptId: string) => {
    const { data } = await api.post(`/attempts/${attemptId}/submit`);
    return data;
  },

  getResults: async (attemptId: string): Promise<AttemptResults> => {
    const { data } = await api.get(`/attempts/${attemptId}/results`);
    return data;
  },

  getAnalysis: async (attemptId: string) => {
    const { data } = await api.get(`/attempts/${attemptId}/analysis`);
    return data;
  },

  getHistory: async (): Promise<HistoryItem[]> => {
    const { data } = await api.get('/attempts/history');
    return Array.isArray(data) ? data : (data?.items ?? []);
  },
};
