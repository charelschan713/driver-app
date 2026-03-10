import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,

  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useDriverSession } from '../../src/context/DriverSessionContext';

const DRIVER_STATUS_COLORS: Record<string, string> = {
  UNASSIGNED: '#999',
  ASSIGNED: '#3b82f6',
  ACCEPTED: '#6366f1',
  ON_THE_WAY: '#f59e0b',
  ARRIVED: '#f97316',
  PASSENGER_ON_BOARD: '#8b5cf6',
  JOB_DONE: '#22c55e',
};

export default function HomeScreen() {
  const queryClient = useQueryClient();
  // Driver identity from DriverSessionContext — set by guard in (app)/_layout.tsx
  // after /driver-app/me succeeds. No async SecureStore reads needed here.
  const driver = useDriverSession();

  const {
    data: activeJobs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['driver-active-jobs'],
    queryFn: async () => {
      const res = await api.get('/driver-app/assignments', {
        params: { filter: 'active' },
      });
      return res.data?.data ?? res.data ?? [];
    },
    refetchInterval: 15000,
  });

  const acceptMutation = useMutation({
    mutationFn: (assignment_id: string) =>
      api.patch(`/driver-app/assignments/${assignment_id}/status`, { new_status: 'ACCEPTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-active-jobs'] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (assignment_id: string) =>
      api.patch(`/driver-app/assignments/${assignment_id}/status`, { new_status: 'REJECTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-active-jobs'] });
    },
  });

  const handleAccept = (booking_id: string) => {
    Alert.alert('Accept Job', 'Are you sure you want to accept this job?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () => acceptMutation.mutate(booking_id),
      },
    ]);
  };

  const handleDecline = (booking_id: string) => {
    Alert.alert('Decline Job', 'Are you sure you want to decline this job?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => declineMutation.mutate(booking_id),
      },
    ]);
  };

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const pendingJobs = activeJobs.filter((j: any) => j.driver_status === 'ASSIGNED');
  const activeJob = activeJobs.find((j: any) =>
    ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'PASSENGER_ON_BOARD'].includes(j.driver_status),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {driver?.first_name ?? 'Driver'} 👋</Text>
          <Text style={styles.subGreeting}>
            {activeJob
              ? '🟢 You have an active job'
              : pendingJobs.length > 0
                ? `📬 ${pendingJobs.length} new job${pendingJobs.length > 1 ? 's' : ''}`
                : '✅ No pending jobs'}
          </Text>
        </View>

      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚗 Current Job</Text>
            <TouchableOpacity style={styles.activeJobCard} onPress={() => router.push(`/(app)/job/${activeJob.id}`)}>
              <View style={styles.jobHeader}>
                <Text style={styles.bookingNumber}>#{activeJob.booking_number}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: DRIVER_STATUS_COLORS[activeJob.driver_status] + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: DRIVER_STATUS_COLORS[activeJob.driver_status] }]}>
                    {activeJob.driver_status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.jobDetail}>
                <Text style={styles.detailLabel}>Passenger</Text>
                <Text style={styles.detailValue}>
                  {activeJob.passenger_name}
                  {activeJob.passenger_phone && ` · ${activeJob.passenger_phone}`}
                </Text>
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.routeRow}>
                  <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {activeJob.pickup_address}
                  </Text>
                </View>
                {activeJob.dropoff_address && (
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      {activeJob.dropoff_address}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.jobFooter}>
                <Text style={styles.dateTime}>📅 {formatDateTime(activeJob.pickup_datetime)}</Text>
                <Text style={styles.earnings}>
                  {activeJob.currency} ${activeJob.driver_total?.toFixed(2)}
                </Text>
              </View>

              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap to manage job →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {pendingJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📬 New Job Requests</Text>
            {pendingJobs.map((job: any) => (
              <View key={job.id} style={styles.pendingCard}>
                <View style={styles.jobHeader}>
                  <Text style={[styles.bookingNumber, { color: '#1a1a1a' }]}>#{job.booking_number}</Text>
                  <Text style={styles.vehicleClass}>{job.vehicle_class}</Text>
                </View>

                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={[styles.routeText, { color: '#555' }]} numberOfLines={2}>
                      {job.pickup_address}
                    </Text>
                  </View>
                  {job.dropoff_address && (
                    <View style={styles.routeRow}>
                      <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                      <Text style={[styles.routeText, { color: '#555' }]} numberOfLines={2}>
                        {job.dropoff_address}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.jobDetail}>
                  <Text style={[styles.detailLabel, { color: '#888' }]}>Passenger</Text>
                  <Text style={[styles.detailValue, { color: '#1a1a1a' }]}>
                    {job.passenger_name}
                    {job.flight_number && ` · ✈️ ${job.flight_number}`}
                  </Text>
                </View>

                <View style={styles.jobFooter}>
                  <Text style={[styles.dateTime, { color: '#666' }]}>📅 {formatDateTime(job.pickup_datetime)}</Text>
                  <Text style={styles.earnings}>
                    {job.currency} ${job.driver_total?.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAccept(job.id)}
                    disabled={acceptMutation.isPending}
                  >
                    <Text style={styles.acceptButtonText}>✓ Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDecline(job.id)}
                    disabled={declineMutation.isPending}
                  >
                    <Text style={styles.declineButtonText}>✗ Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {!activeJob && pendingJobs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛣️</Text>
            <Text style={styles.emptyTitle}>No jobs right now</Text>
            <Text style={styles.emptySubtitle}>No pending jobs at the moment</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  subGreeting: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  scroll: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  activeJobCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  vehicleClass: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  routeContainer: {
    gap: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  jobDetail: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTime: {
    fontSize: 12,
    color: '#aaa',
  },
  earnings: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  tapHint: {
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
