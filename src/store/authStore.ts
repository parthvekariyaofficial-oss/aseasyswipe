import { create } from 'zustand';
import type { UserProfile } from '../types/auth';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  sessionRemainingSeconds: number;
  
  setAuth: (user: UserProfile, token: string, mustChangePassword?: boolean) => void;
  updateUser: (user: UserProfile) => void;
  logout: () => void;
  decrementTimer: () => void;
  resetSessionTimer: () => void;
}

const INITIAL_SESSION_SECONDS = 24 * 60 * 60; // 24 hours

export const useAuthStore = create<AuthState>((set, get) => {
  const savedToken = localStorage.getItem('aseasy_token');
  const savedUser = localStorage.getItem('aseasy_user');
  
  let initialUser: UserProfile | null = null;
  if (savedUser) {
    try {
      initialUser = JSON.parse(savedUser);
    } catch {
      initialUser = null;
    }
  }

  return {
    user: initialUser,
    token: savedToken,
    isAuthenticated: Boolean(savedToken && initialUser),
    mustChangePassword: initialUser?.must_change_password || false,
    sessionRemainingSeconds: INITIAL_SESSION_SECONDS,

    setAuth: (user: UserProfile, token: string, mustChangePassword = false) => {
      localStorage.setItem('aseasy_token', token);
      localStorage.setItem('aseasy_user', JSON.stringify(user));
      set({
        user,
        token,
        isAuthenticated: true,
        mustChangePassword: mustChangePassword || user.must_change_password,
        sessionRemainingSeconds: INITIAL_SESSION_SECONDS
      });
    },

    updateUser: (updatedUser: UserProfile) => {
      localStorage.setItem('aseasy_user', JSON.stringify(updatedUser));
      set({ user: updatedUser, mustChangePassword: updatedUser.must_change_password });
    },

    logout: () => {
      localStorage.removeItem('aseasy_token');
      localStorage.removeItem('aseasy_user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        mustChangePassword: false,
        sessionRemainingSeconds: 0
      });
    },

    decrementTimer: () => {
      const current = get().sessionRemainingSeconds;
      if (current <= 1) {
        get().logout();
      } else {
        set({ sessionRemainingSeconds: current - 1 });
      }
    },

    resetSessionTimer: () => {
      set({ sessionRemainingSeconds: INITIAL_SESSION_SECONDS });
    }
  };
});
