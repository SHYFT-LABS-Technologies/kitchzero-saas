import { create } from 'zustand';
import type { AuthUser } from '@/lib/auth'; // Corrected path

interface UserState {
  user: AuthUser | null;
  csrfToken: string | null;
  setUser: (user: AuthUser | null) => void;
  setCsrfToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  csrfToken: null,
  setUser: (user) => set({ user }),
  setCsrfToken: (token) => set({ csrfToken: token }),
  clearAuth: () => set({ user: null, csrfToken: null }),
}));
