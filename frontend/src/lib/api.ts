import axios from 'axios';

export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.origin}/api`
    : 'http://localhost:8090/api');

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Merchant JWT Access Token & Test Mode Header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sumiopay_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const mode = localStorage.getItem('sumiopay_mode');
  if (mode === 'TEST' && config.headers) {
    config.headers['x-test-mode'] = 'true';
  }
  return config;
});

// Response Interceptor: Automatic Refresh Token Rotation upon 401 Expiration
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on login or refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/merchant/login') &&
      !originalRequest.url?.includes('/merchant/refresh-token')
    ) {
      const refreshToken = localStorage.getItem('sumiopay_refresh_token');

      if (!refreshToken) {
        localStorage.removeItem('sumiopay_token');
        localStorage.removeItem('sumiopay_refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(`${API_BASE}/merchant/refresh-token`, {
          refreshToken,
        });

        if (refreshResponse.data.success && refreshResponse.data.data) {
          const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
          localStorage.setItem('sumiopay_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('sumiopay_refresh_token', newRefreshToken);
          }

          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return api(originalRequest);
        } else {
          throw new Error('Refresh token invalid');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('sumiopay_token');
        localStorage.removeItem('sumiopay_refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (
      error.response?.status === 402 &&
      (error.response?.data?.code === 'SUBSCRIPTION_EXPIRED' ||
        error.response?.data?.error?.code === 'SUBSCRIPTION_EXPIRED')
    ) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sumiopay_subscription_expired'));
      }
    }

    return Promise.reject(error);
  }
);

// SuperAdmin Dedicated API Client
export const adminApi = axios.create({
  baseURL: `${API_BASE}/superadmin`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('sumiopay_superadmin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/login');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('sumiopay_superadmin_token');
      if (
        window.location.pathname.startsWith('/superadmin') &&
        !window.location.pathname.includes('/superadmin/login')
      ) {
        window.location.href = '/superadmin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Public Unauthenticated API Client (Landing page & checkout)
export const publicApi = axios.create({
  baseURL: `${API_BASE}/public`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
