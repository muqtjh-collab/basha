import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config;
    
    // Check if it's a 401 unauthorized and we haven't retried yet
    if (
      error.response?.status === 401 && 
      originalRequest && 
      !(originalRequest as any)._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      try {
        // Call the refresh endpoint (which relies on HTTP-only cookie)
        const response = await axios.post('/api/auth/refresh');
        const { accessToken, user } = response.data.data;
        
        // Update Zustand store
        useAuthStore.getState().setAuth(accessToken, user);
        
        processQueue(null, accessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Refresh failed (e.g. cookie expired), logout user
        useAuthStore.getState().clearAuth();
        
        // Redirect to login page only if we are not already there
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Standardize error responses to pull our Arabic message
    const customError = {
      status: error.response?.status || 500,
      code: error.response?.data?.error?.code || 'NETWORK_ERROR',
      messageAr: error.response?.data?.error?.message_ar || 'عذراً، تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
      details: error.response?.data?.error?.details || []
    };

    return Promise.reject(customError);
  }
);

export default api;
