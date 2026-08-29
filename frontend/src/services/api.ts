import axios from 'axios';

// Backend URL
export const BACKEND_URL =
  (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';

// API base URL
export const API_BASE_URL = `${BACKEND_URL}/api`;

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,

  // IMPORTANT: Send session cookies from frontend to backend
  withCredentials: true,

  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    // Debug log
    if (status === 401) {
      console.warn(
        '🔍 [Debug] Axios Interceptor: Received 401 Unauthorized:',
        requestUrl
      );

      /*
       * IMPORTANT:
       *
       * /auth/me is used by useAuth.ts to check whether
       * the user is logged in.
       *
       * If it returns 401, do NOT immediately redirect
       * to /login here.
       *
       * useAuth.ts will catch the error and return null.
       */
      if (!requestUrl.includes('/auth/me')) {
        if (window.location.pathname !== '/login') {
          console.log(
            '🔍 [Debug] Redirecting to login due to unauthorized API request'
          );

          window.location.href = '/login?message=expired';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;