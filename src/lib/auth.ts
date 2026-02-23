import * as SecureStore from 'expo-secure-store';
import api from './api';

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', {
    email,
    password,
  });

  const { access_token, user } = res.data;

  if (user.role !== 'DRIVER') {
    throw new Error('Not a driver account');
  }

  await SecureStore.setItemAsync('access_token', access_token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));

  return user;
}

export async function logout() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('user');
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync('user');
  return raw ? JSON.parse(raw) : null;
}

export async function isLoggedIn() {
  const token = await SecureStore.getItemAsync('access_token');
  return !!token;
}
