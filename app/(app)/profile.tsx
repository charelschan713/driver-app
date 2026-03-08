import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { getStoredUser, logout } from '../../src/lib/auth';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  const [abn, setAbn] = useState('');
  const [bankBsb, setBankBsb] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [abnVerified, setAbnVerified] = useState(false);
  const [abnName, setAbnName] = useState('');

  useEffect(() => {
    getStoredUser().then(setUser);
  }, []);

  const { data: driver } = useQuery({
    queryKey: ['driver-profile'],
    queryFn: async () => {
      const res = await api.get('/driver-app/me');
      return res.data;
    },
  });

  useEffect(() => {
    if (!driver) return;
    setAbn(driver.abn ?? '');
    setBankBsb(driver.bank_bsb ?? '');
    setBankAccount(driver.bank_account ?? '');
    setBankName(driver.bank_name ?? '');
    setIsGstRegistered(driver.is_gst_registered ?? false);
    setAbnVerified(driver.abn_verified ?? false);
    setAbnName(driver.abn_name ?? '');
  }, [driver]);

  const verifyAbnMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/driver-app/verify-abn', { abn });
      return res.data;
    },
    onSuccess: (data) => {
      setAbnVerified(data.abn_verified);
      setAbnName(data.abn_name ?? '');
      setIsGstRegistered(data.is_gst_registered ?? false);
      Alert.alert(
        data.abn_verified ? '✅ ABN Verified' : '⚠️ ABN Not Found',
        data.abn_name
          ? `Registered to: ${data.abn_name}`
          : 'Please check your ABN number',
      );
    },
  });

  const saveDetailsMutation = useMutation({
    mutationFn: () =>
      api.patch('/driver-app/me/banking', {
        abn,
        bank_bsb: bankBsb,
        bank_account: bankAccount,
        bank_name: bankName,
        is_gst_registered: isGstRegistered,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      setEditing(false);
      Alert.alert('✅ Saved', 'Banking details updated');
    },
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {driver?.first_name?.[0]}
              {driver?.last_name?.[0]}
            </Text>
          </View>
          <Text style={styles.driverName}>
            {driver?.first_name} {driver?.last_name}
          </Text>
          <Text style={styles.driverPhone}>{driver?.phone}</Text>
          <View
            style={[
              styles.verifiedBadge,
              {
                backgroundColor:
                  driver?.platform_verified === 'VERIFIED' ? '#f0fdf4' : '#fefce8',
              },
            ]}
          >
            <Text
              style={[
                styles.verifiedText,
                {
                  color:
                    driver?.platform_verified === 'VERIFIED' ? '#16a34a' : '#ca8a04',
                },
              ]}
            >
              {driver?.platform_verified === 'VERIFIED'
                ? '✅ Verified Driver'
                : '⏳ Pending Verification'}
            </Text>
          </View>
        </View>

        {driver?.vehicle_make && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Vehicle</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Vehicle</Text>
              <Text style={styles.rowValue}>
                {driver.vehicle_color} {driver.vehicle_make} {driver.vehicle_model}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Year</Text>
              <Text style={styles.rowValue}>{driver.vehicle_year}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Plate</Text>
              <Text style={[styles.rowValue, { fontFamily: 'monospace' }]}>
                {driver.plate_number}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Class</Text>
              <Text style={styles.rowValue}>{driver.platform_class}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>ABN & Banking</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editLink}>{editing ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {!editing ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>ABN</Text>
                <View style={styles.abnRow}>
                  <Text style={styles.rowValue}>{driver?.abn ?? 'Not set'}</Text>
                  {abnVerified && <Text style={styles.verifiedIcon}>✅</Text>}
                </View>
              </View>

              {abnName ? (
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>ABN Name</Text>
                  <Text style={styles.rowValue}>{abnName}</Text>
                </View>
              ) : null}

              <View style={styles.row}>
                <Text style={styles.rowLabel}>GST</Text>
                <Text style={styles.rowValue}>
                  {isGstRegistered ? 'Registered' : 'Not registered'}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>BSB</Text>
                <Text style={styles.rowValue}>{driver?.bank_bsb ?? 'Not set'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Account</Text>
                <Text style={styles.rowValue}>{driver?.bank_account ?? 'Not set'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Bank</Text>
                <Text style={styles.rowValue}>{driver?.bank_name ?? 'Not set'}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ABN *</Text>
                <View style={styles.abnInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={abn}
                    onChangeText={setAbn}
                    placeholder="11 digit ABN"
                    keyboardType="numeric"
                    maxLength={11}
                  />
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => verifyAbnMutation.mutate()}
                    disabled={abn.length < 11 || verifyAbnMutation.isPending}
                  >
                    <Text style={styles.verifyButtonText}>
                      {verifyAbnMutation.isPending ? '...' : 'Verify'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {abnVerified && abnName && <Text style={styles.abnNameText}>✅ {abnName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>GST Registered</Text>
                  <Switch
                    value={isGstRegistered}
                    onValueChange={setIsGstRegistered}
                    trackColor={{ false: '#e0e0e0', true: '#22c55e' }}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>BSB</Text>
                <TextInput
                  style={styles.input}
                  value={bankBsb}
                  onChangeText={setBankBsb}
                  placeholder="000-000"
                  keyboardType="numeric"
                  maxLength={7}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  placeholder="Account number"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  style={styles.input}
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. Commonwealth Bank"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => saveDetailsMutation.mutate()}
                disabled={saveDetailsMutation.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {saveDetailsMutation.isPending ? 'Saving...' : 'Save Details'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  scroll: { flex: 1 },
  profileCard: {
    backgroundColor: '#1a1a1a',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  driverName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  driverPhone: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  verifiedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editLink: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: { fontSize: 14, color: '#666', flex: 1 },
  rowValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  abnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 2,
    justifyContent: 'flex-end',
  },
  verifiedIcon: { fontSize: 14 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  abnInputRow: { flexDirection: 'row', gap: 8 },
  verifyButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  verifyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  abnNameText: { fontSize: 12, color: '#16a34a', marginTop: 2 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  signOutButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
