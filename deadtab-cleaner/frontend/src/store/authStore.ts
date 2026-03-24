import { create } from 'zustand';

interface AuthState {
  apiKey: string | null;
  userEmail: string | null;
  setAuth: (apiKey: string, userEmail: string) => void;
  clearAuth: () => void;
}

// Read from localStorage on initial load
const getStoredAuth = () => {
  if (typeof window === 'undefined') return { apiKey: null, userEmail: null };
  const apiKey = localStorage.getItem('deadtab_api_key');
  const userEmail = localStorage.getItem('deadtab_user_email');
  return { apiKey, userEmail };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getStoredAuth(),
  
  setAuth: (apiKey, userEmail) => {
    localStorage.setItem('deadtab_api_key', apiKey);
    localStorage.setItem('deadtab_user_email', userEmail);
    set({ apiKey, userEmail });
  },
  
  clearAuth: () => {
    localStorage.removeItem('deadtab_api_key');
    localStorage.removeItem('deadtab_user_email');
    set({ apiKey: null, userEmail: null });
  },
}));
