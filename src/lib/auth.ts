import * as SecureStore from 'expo-secure-store';
import api from './api';

const SLUG_KEY  = 'tenant_slug';
const TOKEN_KEY = 'access_token';
const USER_KEY  = 'user';

/** Login using the mobile endpoint (tokens returned in body, no cookie). */
export async function login(email: string, password: string, tenantSlug: string) {
  const res = await api.post('/auth/mobile/login', {
    email,
    password,
    tenantSlug,
  });

  // Mobile endpoint returns snake_case fields
  const { access_token } = res.data;

  // Persist slug FIRST so the api interceptor picks it up on subsequent requests
  await SecureStore.setItemAsync(SLUG_KEY, tenantSlug);
  await SecureStore.setItemAsync(TOKEN_KEY, access_token);

  return res.data;
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  // Do NOT clear tenant_slug on regular logout — driver likely re-logs into same company.
  // Slug is only cleared via explicit "Switch Company" action.
}

/** Clear stored slug + tokens. Used by Switch Company flow. */
export async function clearCompany() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(SLUG_KEY);
}

export async function getStoredSlug(): Promise<string | null> {
  return SecureStore.getItemAsync(SLUG_KEY);
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function isLoggedIn() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return !!token;
}
