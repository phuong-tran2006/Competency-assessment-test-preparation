import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Địa chỉ Backend NestJS
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor tự động gắn Token vào Header cho mỗi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi chung (ví dụ 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Phiên đăng nhập hết hạn hoặc chưa xác thực.');
    }
    return Promise.reject(error);
  }
);

export default api;