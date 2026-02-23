import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../src/lib/api';

const STATUS_FLOW: Record<
  string,
  { next: string; label: string; color: string; nextLabel: string }
> = {
  ACCEPTED: {
    next: 'ON_THE_WAY',
    label: 'Accepted',
    color: '#6366f1',
    nextLabel: '🚗 Start Driving',
  },
  ON_THE_WAY: {
    next: 'ARRIVED',
    label: 'On The Way',
    color: '#f59e0b',
    nextLabel: '📍 Mark Arrived',
  },
  ARRIVED: {
    next: 'PASSENGER_ON_BOARD',
    label: 'Arrived',
    color: '#f97316',
    nextLabel: '👤 Passenger On Board',
  },
  PASSENGER_ON_BOARD: {
    next: 'JOB_DONE',
    label: 'Passenger On Board',
    color: '#8b5cf6',
    nextLabel: '✅ Complete Job',
  },
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['driver-job', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/driver/${id}`);
      return res.data;
    },
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (next_status: string) => {
      const endpoint =
        next_status === 'ON_THE_WAY'
          ? `/bookings/driver/${id}/on-the-way`
          : next_status === 'ARRIVED'
            ? `/bookings/driver/${id}/arrived`
            : next_status === 'PASSENGER_ON_BOARD'
              ? `/bookings/driver/${id}/passenger-on-board`
              : next_status === 'JOB_DONE'
                ? `/bookings/driver/${id}/job-done`
                : null;

      if (!endpoint) throw new Error('Invalid status');
      return api.patch(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-job', id] });
      queryClient.invalidateQueries({ queryKey: ['driver-active-jobs'] });
    },
  });

  const handleNextStatus = () => {
    const driverStatus = booking?.driver_status;
    const flow = STATUS_FLOW[driverStatus];
    if (!flow) return;

    const isComplete = flow.next === 'JOB_DONE';

    Alert.alert(
      isComplete ? 'Complete Job?' : flow.nextLabel,
      isComplete
        ? 'Mark this job as complete? This will notify the admin.'
        : `Update status to: ${flow.next.replace(/_/g, ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateStatusMutation.mutate(flow.next),
        },
      ],
    );
  };

  const openMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${encoded}`);
  };

  const callPassenger = () => {
    if (!booking?.passenger_phone) return;
    Linking.openURL(`tel:${booking.passenger_phone}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const driverStatus = booking.driver_status;
  const flow = STATUS_FLOW[driverStatus];
  const isJobDone = driverStatus === 'JOB_DONE';

  const formatDateTime = (dt: string) =>
    new Date(dt).toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>#{booking.booking_number}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll}>
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: flow?.color ?? (isJobDone ? '#22c55e' : '#999') },
          ]}
        >
          <Text style={styles.statusBannerText}>{driverStatus.replace(/_/g, ' ')}</Text>
          <Text style={styles.statusBannerSub}>
            {isJobDone ? 'Job completed ✓' : 'Tap button below to update'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pickup Time</Text>
            <Text style={styles.rowValue}>{formatDateTime(booking.pickup_datetime)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Service</Text>
            <Text style={styles.rowValue}>
              {booking.service_type?.replace(/_/g, ' ')}
              {booking.duration_hours && ` · ${booking.duration_hours}hrs`}
            </Text>
          </View>
          {booking.flight_number && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Flight</Text>
              <Text style={styles.rowValue}>✈️ {booking.flight_number}</Text>
            </View>
          )}
          {booking.special_requests && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Requests</Text>
              <Text style={[styles.rowValue, { color: '#f59e0b' }]}>
                ⚠️ {booking.special_requests}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <TouchableOpacity
            style={styles.addressRow}
            onPress={() => openMaps(booking.pickup_address)}
          >
            <View style={[styles.addressDot, { backgroundColor: '#22c55e' }]} />
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Pickup</Text>
              <Text style={styles.addressText}>{booking.pickup_address}</Text>
            </View>
            <Text style={styles.mapsLink}>Maps →</Text>
          </TouchableOpacity>
          {booking.dropoff_address && (
            <TouchableOpacity
              style={styles.addressRow}
              onPress={() => openMaps(booking.dropoff_address)}
            >
              <View style={[styles.addressDot, { backgroundColor: '#ef4444' }]} />
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>Drop-off</Text>
                <Text style={styles.addressText}>{booking.dropoff_address}</Text>
              </View>
              <Text style={styles.mapsLink}>Maps →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Passenger</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{booking.passenger_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Count</Text>
            <Text style={styles.rowValue}>{booking.passenger_count} pax</Text>
          </View>
          {booking.passenger_phone && (
            <TouchableOpacity style={styles.callButton} onPress={callPassenger}>
              <Text style={styles.callButtonText}>📞 Call Passenger</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Earnings</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Fare</Text>
            <Text style={styles.rowValue}>
              {booking.currency} ${booking.driver_fare?.toFixed(2)}
            </Text>
          </View>
          {booking.driver_toll > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Toll</Text>
              <Text style={styles.rowValue}>
                {booking.currency} ${booking.driver_toll?.toFixed(2)}
              </Text>
            </View>
          )}
          {booking.driver_extras > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Extras</Text>
              <Text style={styles.rowValue}>
                {booking.currency} ${booking.driver_extras?.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {booking.currency} ${booking.driver_total?.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {flow && !isJobDone && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: flow.color },
              updateStatusMutation.isPending && styles.actionButtonDisabled,
            ]}
            onPress={handleNextStatus}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>{flow.nextLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isJobDone && (
        <View style={styles.actionContainer}>
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ Job Completed</Text>
            <Text style={styles.completedSub}>Awaiting admin confirmation</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { fontSize: 16, color: '#666' },
  backButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerBack: { width: 70 },
  headerBackText: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'monospace' },
  headerRight: { width: 70 },
  scroll: { flex: 1 },
  statusBanner: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  statusBannerText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statusBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowLabel: { fontSize: 14, color: '#666', flex: 1 },
  rowValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '500', flex: 2, textAlign: 'right' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#22c55e' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  addressDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  addressContent: { flex: 1, gap: 2 },
  addressLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  addressText: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },
  mapsLink: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  callButton: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 4,
  },
  callButtonText: { fontSize: 14, color: '#16a34a', fontWeight: '600' },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  completedBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 4,
  },
  completedText: { fontSize: 16, fontWeight: '700', color: '#16a34a' },
  completedSub: { fontSize: 12, color: '#86efac' },
});
