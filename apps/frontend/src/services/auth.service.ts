import api from './api';
import { useAuthStore } from '../store/authStore';
import type { AppRole } from '../types/auth.types';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    role: AppRole;
  };
}

export const authService = {
  // Đăng nhập tài khoản (Nhận accessToken từ Backend NestJS)
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const token =
      response.data?.accessToken ||
      response.data?.access_token ||
      response.data?.token;
    if (token) {
      localStorage.setItem('token', token);
  /**
   * Đăng nhập. Backend (auth.controller.ts) trả về { accessToken, user } —
   * không phải access_token, nên phải đọc đúng tên trường.
   * Token được ghi vào authStore để interceptor trong api.ts dùng lại.
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    const { accessToken, user } = response.data;
    if (accessToken && user) {
      useAuthStore.getState().setAuth(user, accessToken);
    }
    return response.data;
  },

  // Đăng ký tài khoản học viên mới (Gửi fullName khớp với RegisterDto của Backend)
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', {
      fullName: name,
  // Đăng ký tài khoản học viên mới. Backend nhận fullName, không nhận name/role.
  register: async (fullName: string, email: string, password: string) => {
    const response = await api.post('/auth/register', {
      fullName,
      email,
      password,
    });
    return response.data;
  },

  // Đăng xuất khỏi hệ thống
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Đăng xuất phía client vẫn phải thực hiện dù API lỗi
    } finally {
      useAuthStore.getState().logout();
      // Dọn key cũ còn sót từ các bản trước
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('auth-storage');
    }
  },

  // Kiểm tra trạng thái phiên đăng nhập hiện tại của user
  getCurrentUser: async () => {
    const response = await api.get('/auth/status');
    return response.data;
  },
};
};
