// src/services/auth.service.ts
import api from './api';

export const authService = {
  // Đăng nhập tài khoản (Gửi email & password, nhận về JWT access_token)
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },

  // Đăng ký tài khoản học viên mới
  register: async (name: string, email: string, password: string, role = 'LEARNER') => {
    const response = await api.post('/auth/register', { name, email, password, role });
    return response.data;
  },

  // Đăng xuất khỏi hệ thống
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    }
  },

  // Kiểm tra trạng thái phiên đăng nhập hiện tại của user
  getCurrentUser: async () => {
    const response = await api.get('/auth/status');
    return response.data;
  }
};