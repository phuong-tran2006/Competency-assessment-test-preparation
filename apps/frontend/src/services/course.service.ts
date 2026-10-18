// src/services/course.service.ts
import api from './api';
import type { Course, Lesson } from '../types';

export const courseService = {
  // Lấy danh sách toàn bộ khóa học
  getAllCourses: async (): Promise<Course[]> => {
    const { data } = await api.get('/courses');
    return data;
  },

  // Lấy chi tiết khóa học kèm danh sách bài giảng
  getCourseById: async (courseId: string): Promise<Course> => {
    const { data } = await api.get(`/courses/${courseId}`);
    return data;
  },

  // Lấy nội dung chi tiết của một bài giảng cụ thể
  getLessonDetails: async (courseId: string, lessonId: string): Promise<Lesson> => {
    const { data } = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
    return data;
  }
};