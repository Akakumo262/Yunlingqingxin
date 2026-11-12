import { create } from 'zustand';
import type { Me } from '@yunling/contracts';

interface AuthState {
  /** 只放内存，不落 localStorage；刷新即重新登录 */
  token: string | null;
  me: Me | null;
  setSession: (token: string, me: Me) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  me: null,
  setToken: (token) => set({ token }),
  setSession: (token, me) => set({ token, me }),
  logout: () => set({ token: null, me: null }),
}));
