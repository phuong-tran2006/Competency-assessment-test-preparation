import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Địa chỉ Backend NestJS
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Token chỉ có một nguồn duy nhất: authStore (persist vào key 'auth-storage').
 * Trước đây interceptor đọc localStorage.getItem('token') — key đó không ai ghi
 * nên mọi request đều thiếu header Authorization và bị backend trả 401.
 */
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi chung: 401 nghĩa là token hết hạn/không hợp lệ,
// phải xóa phiên để ProtectedRoute đưa người dùng về trang đăng nhập.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const { isAuthenticated, logout } = useAuthStore.getState();
      if (isAuthenticated) {
        console.warn('Phiên đăng nhập đã hết hạn, cần đăng nhập lại.');
        logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
