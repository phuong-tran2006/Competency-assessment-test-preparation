// src/services/course.service.ts
import api from './api';
import type { Course, Lesson } from '../types';

export const courseService = {
  // Lấy danh sách khóa học (hỗ trợ cả dạng mảng trực tiếp hoặc object phân trang { items })
  getAllCourses: async (): Promise<Course[]> => {
    const { data } = await api.get('/courses');
    if (Array.isArray(data)) {
      return data;
    }
    return data.items || [];
  },

  // Lấy chi tiết khóa học kèm danh sách bài giảng
  getCourseById: async (courseId: string): Promise<Course> => {
    const { data } = await api.get(`/courses/${courseId}`);
    return data;
  },

  // Lấy nội dung chi tiết của một bài giảng cụ thể (Sửa lại gọi đúng route /lessons/:id của Backend)
  getLessonDetails: async (_courseId: string, lessonId: string): Promise<Lesson> => {
    const { data } = await api.get(`/lessons/${lessonId}`);
    return data;
  }
};