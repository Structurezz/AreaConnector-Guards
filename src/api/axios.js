import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api',
  withCredentials: true,
});

// Attach access token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    // A site module (e.g. deliveries) was switched off — let the app re-sync.
    if (err.response?.status === 403 && err.response?.data?.code === 'MODULE_OFF') {
      window.dispatchEvent(new CustomEvent('site:module_off', { detail: err.response.data }));
    }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem('accessToken', data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
