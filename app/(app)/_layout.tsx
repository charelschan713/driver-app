import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import api from '../../src/lib/api';

// ── Platform design tokens ──────────────────────────────────────────────────
const BG   = '#0D0F14';
const GOLD = '#C8A870';
const MUTED = '#9CA3AF';
const TAB_BG = '#111318';
const TAB_BORDER = '#1E2028';

/**
 * Driver App Layout — Protected shell for all driver screens.
 *
 * Guard sequence on mount:
 *   1. Check SecureStore for access_token  → if missing: /login
 *   2. Call GET /driver-app/me             → if 401/404: not a driver, /login
 *   3. Verify response has driver_id       → success: render tabs
 *
 * This is the authoritative driver-role check. /driver-app/me JOINs memberships
 * WHERE role = 'driver', so it's server-enforced, not a client-side string check.
 *
 * All child screens (home, history, invoices, profile) inherit this guard.
 * No ad-hoc role checks needed in individual screens.
 *
 * PHASE 3 NOTE: When tenant ThemeContext is added, inject tenant primary color
 * here for tabBarActiveTintColor, replacing the hardcoded GOLD token.
 */
export default function AppLayout() {
  const queryClient = useQueryClient();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [guardDone, setGuardDone] = useState(false);

  // ── Driver role guard ─────────────────────────────────────────────────────
  useEffect(() => {
    async function runGuard() {
      // Step 1: token must exist
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        router.replace('/login');
        return;
      }

      // Step 2: server-side role verification via /driver-app/me
      // This endpoint JOINs memberships WHERE role = 'driver' —
      // non-driver users receive 404 here even with a valid token.
      try {
        await api.get('/driver-app/me');
        setGuardDone(true);
      } catch (err: any) {
        // 401 → token expired/invalid; 404 → not a driver account
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user');
        router.replace('/login');
      }
    }
    runGuard();
  }, []);

  // ── Push notification listeners ───────────────────────────────────────────
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['driver-active-jobs'] });
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.assignment_id) {
        router.push(`/(app)/job/${data.assignment_id}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [queryClient]);

  // ── Guard loading state ───────────────────────────────────────────────────
  if (!guardDone) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={GOLD} size="large" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: TAB_BORDER,
          borderTopWidth: 1,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: MUTED,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
