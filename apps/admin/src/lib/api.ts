import axios from 'axios';

const api = axios.create({
  baseURL: '/api/admin',
  timeout: 10000,
});

// 请求拦截：带 admin token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 自动跳登录
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
