import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { login, getStoredSlug, clearCompany } from '../src/lib/auth';
import { registerPushToken } from '../src/lib/notifications';

// ── Platform design tokens ──────────────────────────────────────────────────
const BG     = '#0D0F14';
const CARD   = '#16181F';
const BORDER = '#2A2D3A';
const GOLD   = '#C8A870';
const TEXT   = '#FFFFFF';
const MUTED  = '#9CA3AF';
const ERROR  = '#EF4444';

export default function LoginScreen() {
  const [slug, setSlug]           = useState('');
  const [rememberedSlug, setRememberedSlug] = useState<string | null>(null);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [loadingSlug, setLoadingSlug] = useState(true);

  // Pre-fill slug from last successful login
  useEffect(() => {
    getStoredSlug().then((stored) => {
      if (stored) {
        setSlug(stored);
        setRememberedSlug(stored);
      }
      setLoadingSlug(false);
    });
  }, []);

  const handleLogin = async () => {
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedSlug) {
      Alert.alert('Company ID required', 'Enter your Company ID to continue.');
      return;
    }
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password, trimmedSlug);
      await registerPushToken();
      router.replace('/(app)/home');
    } catch (err: any) {
      const msg: string = err.response?.data?.message ?? err.message ?? 'Please try again.';
      // Map backend slug rejection to friendly copy
      const friendlyMsg = msg.toLowerCase().includes('company not found')
        ? 'Company not found or you don\'t have access.\nCheck your Company ID and try again.'
        : msg;
      Alert.alert('Sign in failed', friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchCompany = async () => {
    Alert.alert(
      'Switch Company',
      'This will sign you out and clear your remembered Company ID.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          style: 'destructive',
          onPress: async () => {
            await clearCompany();
            setSlug('');
            setRememberedSlug(null);
            setEmail('');
            setPassword('');
          },
        },
      ],
    );
  };

  if (loadingSlug) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>CS</Text>
          </View>
          <Text style={styles.brand}>Chauffeur Solutions</Text>
          <Text style={styles.surface}>Driver Portal</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.card}>
          {/* Company ID */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Company ID</Text>
            <TextInput
              style={styles.input}
              value={slug}
              onChangeText={setSlug}
              placeholder="e.g. aschauffeured"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {rememberedSlug && (
              <View style={styles.rememberedRow}>
                <Text style={styles.rememberedText}>
                  Remembered: {rememberedSlug}
                </Text>
                <TouchableOpacity onPress={handleSwitchCompany}>
                  <Text style={styles.switchLink}>Switch</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="driver@example.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={MUTED}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={BG} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Help */}
          <Text style={styles.helpText}>
            Don't know your Company ID? Ask your fleet manager or dispatcher.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: BG,
    letterSpacing: 1,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
  },
  surface: {
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: TEXT,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rememberedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rememberedText: {
    fontSize: 12,
    color: MUTED,
  },
  switchLink: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '600',
  },
  button: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: BG,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  helpText: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
