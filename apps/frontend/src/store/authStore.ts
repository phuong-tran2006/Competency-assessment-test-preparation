import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (userData: User, token: string) => void;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      const saveSession = (userData: User, token: string) => {
        localStorage.setItem('token', token);
        localStorage.setItem('accessToken', token);
        const normalizedUser: User = {
          ...userData,
          name: userData.name || userData.fullName || userData.email,
        };
        set({
          user: normalizedUser,
          token,
          isAuthenticated: true,
        });
      };

      return {
        user: null,
        token: null,
        isAuthenticated: false,

        setAuth: saveSession,
        login: saveSession,

        logout: () => {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('auth-storage');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        },
      };
    },
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        const storedToken =
          localStorage.getItem('token') || localStorage.getItem('accessToken');
        if (state && (!storedToken || !state.token)) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
      },
    },
  ),
);