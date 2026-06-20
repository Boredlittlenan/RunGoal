import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 请求拦截：自动带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一错误处理 + token 刷新
api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const originalRequest = err.config;

    // 401 时尝试刷新 token
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          const { token, refreshToken: newRefresh } = res.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch {
          // 刷新失败，清除登录态
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err.response?.data || err);
  }
);

/**
 * 将 Date 转为 NaiveDateTime 兼容的 ISO 字符串（去掉 Z 后缀）。
 * 后端 chrono::NaiveDateTime 不接受时区后缀。
 */
export const toNaiveIso = (d: Date): string => d.toISOString().replace('Z', '');

export default api;
