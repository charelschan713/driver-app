import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://chauffeur-saas-production.up.railway.app',
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Inject tenant slug for defensive routing — backend resolves tenant from JWT,
  // but slug header provides a redundant cross-check.
  const slug = await SecureStore.getItemAsync('tenant_slug');
  if (slug) config.headers['x-tenant-slug'] = slug;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user');
      // Navigation is handled by the app root layout watching token state.
    }
    return Promise.reject(err);
  },
);

export default api;
