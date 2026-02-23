import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { isLoggedIn } from '../src/lib/auth';
import { registerPushToken } from '../src/lib/notifications';
import * as Notifications from 'expo-notifications';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        await registerPushToken();
        router.replace('/(app)/home');
      } else {
        router.replace('/login');
      }
      setReady(true);
    };

    init();
  }, []);

  // Push通知点击处理
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data?.booking_id) {
          router.push(`/(app)/job/${data.booking_id}`);
        }
      },
    );

    return () => sub.remove();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
