import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Archive, HabitScore, Settings, User, PaginatedResult } from '../types';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: VITE_API_URL,
});

// Request interceptor: Attach API key as Bearer token
api.interceptors.request.use((config) => {
  const { apiKey } = useAuthStore.getState();
  if (apiKey && config.headers) {
    config.headers.Authorization = `Bearer ${apiKey}`;
  }
  return config;
});

// Response interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth on 401
      useAuthStore.getState().clearAuth();
      // Only redirect if we're not already on the login page to avoid loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- API Methods ---

export const createUser = async (email: string): Promise<User> => {
  const { data } = await api.post('/api/users', { email });
  // Map backend's api_key to frontend's apiKey
  return {
    ...data.user,
    apiKey: data.user.api_key
  };
};

export const fetchScore = async (): Promise<HabitScore> => {
  const { data } = await api.get('/api/score');
  return data;
};

export const fetchArchives = async (params: { page?: number; limit?: number; search?: string; domain?: string; tag?: string } = {}): Promise<PaginatedResult<Archive>> => {
  const { data } = await api.get('/api/archives', { params });
  return data;
};

export const fetchArchive = async (id: string): Promise<{ archive: Archive }> => {
  const { data } = await api.get(`/api/archives/${id}`);
  return data;
};

export const deleteArchive = async (id: string): Promise<void> => {
  await api.delete(`/api/archives/${id}`);
};

export const fetchSettings = async (): Promise<Settings> => {
  const { data } = await api.get('/api/settings');
  return data;
};

export const updateSettings = async (settings: Partial<Settings>): Promise<Settings> => {
  const { data } = await api.put('/api/settings', settings);
  return data;
};

export default api;
