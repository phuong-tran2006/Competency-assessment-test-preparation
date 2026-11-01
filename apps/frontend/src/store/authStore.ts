import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id?: string | number;
  name?: string;
  fullName?: string | null;
  email: string;
  // 'STUDENT' giữ lại cho dữ liệu cũ còn trong localStorage
  role: 'LEARNER' | 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      // Hàm này sẽ thay thế cho việc bạn tự gọi localStorage
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // Tự động lưu vào localStorage để không bị mất khi F5
    }
  )
);