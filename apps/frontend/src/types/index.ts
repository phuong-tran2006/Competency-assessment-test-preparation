// src/types/index.ts

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  videoUrl?: string;
  content?: string;
  isCompleted?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  lessonsCount: number;
  lessons?: Lesson[]; // Optional vì danh sách tổng quát có thể không kèm chi tiết bài học
  chapters?: any[]; // Thêm dòng này để TypeScript nhận diện chapters
}

export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  content: string;
  options: Option[];
}