import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppRole } from '../types/auth.types';

export interface User {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
interface User {
  id?: string | number;
  name?: string;
  fullName?: string | null;
  email: string;
  role: AppRole;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (userData: User, token: string) => void;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

type PersistedAuthState = Pick<AuthState, 'user' | 'token' | 'isAuthenticated'>;
type LegacyAuthState = Omit<PersistedAuthState, 'user'> & {
  user: (Omit<User, 'role'> & { role: AppRole | 'LEARNER' }) | null;
};

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
      name: 'auth-storage', // Tự động lưu vào localStorage để không bị mất khi F5
      version: 1,
      partialize: ({ user, token, isAuthenticated }): PersistedAuthState => ({
        user,
        token,
        isAuthenticated,
      }),
      migrate: (persistedState): PersistedAuthState => {
        const state = persistedState as LegacyAuthState;
        return {
          ...state,
          user: state.user
            ? {
                ...state.user,
                role: state.user.role === 'LEARNER' ? 'STUDENT' : state.user.role,
              }
            : null,
        };
      },
    }
  )
);
