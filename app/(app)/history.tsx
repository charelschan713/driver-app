import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import api from '../../src/lib/api';

export default function HistoryScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['driver-history'],
    queryFn: async () => {
      const res = await api.get('/bookings/driver', {
        params: { driver_status: 'JOB_DONE', limit: 50 },
      });
      return res.data?.data ?? res.data ?? [];
    },
  });

  const jobs = data ?? [];

  const formatDate = (dt: string) =>
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
        <Text style={styles.title}>Job History</Text>
        <Text style={styles.subtitle}>{jobs.length} completed jobs</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No completed jobs yet</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {jobs.map((job: any) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/(app)/job/${job.id}`)}
              >
                <View style={styles.jobTop}>
                  <Text style={styles.bookingNum}>#{job.booking_number}</Text>
                  <Text style={styles.earnings}>
                    {job.currency} ${job.driver_total?.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.date}>📅 {formatDate(job.pickup_datetime)}</Text>
                <Text style={styles.address} numberOfLines={1}>
                  📍 {job.pickup_address}
                  {job.dropoff_address && ` → ${job.dropoff_address}`}
                </Text>
                <View style={styles.jobBottom}>
                  <Text style={styles.passenger}>👤 {job.passenger_name}</Text>
                  <Text style={styles.vehicleClass}>{job.vehicle_class}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
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
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  scroll: { flex: 1 },
  list: { padding: 16, gap: 10 },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  jobTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingNum: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1a1a1a',
  },
  earnings: { fontSize: 16, fontWeight: '700', color: '#22c55e' },
  date: { fontSize: 12, color: '#666' },
  address: { fontSize: 13, color: '#444' },
  jobBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passenger: { fontSize: 12, color: '#666' },
  vehicleClass: { fontSize: 11, color: '#999', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, color: '#666' },
});
