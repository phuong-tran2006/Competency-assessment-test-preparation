import api from './api';

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
    }
    return response.data;
  },

  // Đăng ký tài khoản học viên mới (Gửi fullName khớp với RegisterDto của Backend)
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', {
      fullName: name,
      email,
      password,
    });
    return response.data;
  },

  // Đăng xuất khỏi hệ thống
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
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