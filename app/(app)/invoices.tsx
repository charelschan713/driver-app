import { useState } from 'react';
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
import api from '../../src/lib/api';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f5f5f5', text: '#666' },
  SENT: { bg: '#eff6ff', text: '#3b82f6' },
  PAID: { bg: '#f0fdf4', text: '#16a34a' },
};

export default function InvoicesScreen() {
  const queryClient = useQueryClient();
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [showCreateMode, setShowCreateMode] = useState(false);

  const { data: invoiceableJobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['invoiceable-jobs'],
    queryFn: async () => {
      const res = await api.get('/invoices/driver/invoiceable');
      return res.data;
    },
  });

  const {
    data: invoices = [],
    isLoading,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['driver-invoices'],
    queryFn: async () => {
      const res = await api.get('/invoices/driver');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/invoices/driver', { booking_ids: selectedBookings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoiceable-jobs'] });
      setSelectedBookings([]);
      setShowCreateMode(false);
      Alert.alert('✅ Invoice Created', 'Your invoice has been created as a draft.');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (invoice_id: string) => api.patch(`/invoices/driver/${invoice_id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-invoices'] });
      Alert.alert('📤 Invoice Submitted', 'Your invoice has been sent to the operator.');
    },
  });

  const toggleBooking = (id: string) => {
    setSelectedBookings((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Invoices</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateMode(!showCreateMode)}
        >
          <Text style={styles.createButtonText}>
            {showCreateMode ? 'Cancel' : '+ New Invoice'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              refetchInvoices();
              refetchJobs();
            }}
          />
        }
      >
        {showCreateMode && (
          <View style={styles.createSection}>
            <Text style={styles.sectionTitle}>Select Completed Jobs</Text>

            {invoiceableJobs.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySmallText}>No jobs available to invoice</Text>
              </View>
            ) : (
              <>
                {invoiceableJobs.map((job: any) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[
                      styles.selectableJob,
                      selectedBookings.includes(job.id) && styles.selectedJob,
                    ]}
                    onPress={() => toggleBooking(job.id)}
                  >
                    <View style={styles.checkbox}>
                      {selectedBookings.includes(job.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobNum}>#{job.booking_number}</Text>
                      <Text style={styles.jobDate}>{formatDate(job.pickup_datetime)}</Text>
                      <Text style={styles.jobAddress} numberOfLines={1}>
                        {job.pickup_address}
                      </Text>
                    </View>
                    <Text style={styles.jobEarnings}>${job.driver_total?.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}

                {selectedBookings.length > 0 && (
                  <TouchableOpacity
                    style={styles.submitCreateButton}
                    onPress={() => createMutation.mutate()}
                    disabled={createMutation.isPending}
                  >
                    <Text style={styles.submitCreateText}>
                      {createMutation.isPending
                        ? 'Creating...'
                        : `Create Invoice (${selectedBookings.length} jobs)`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.listSection}>
          {!showCreateMode && <Text style={styles.sectionTitle}>My Invoices</Text>}

          {invoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>No invoices yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete jobs and create your first invoice
              </Text>
            </View>
          ) : (
            invoices.map((inv: any) => (
              <View key={inv.id} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <Text style={styles.invoiceNumber}>{inv.invoice_number}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_STYLES[inv.invoice_status]?.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_STYLES[inv.invoice_status]?.text },
                      ]}
                    >
                      {inv.invoice_status}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Period</Text>
                    <Text style={styles.rowValue}>
                      {formatDate(inv.invoice_period_from)} – {formatDate(inv.invoice_period_to)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Jobs</Text>
                    <Text style={styles.rowValue}>{inv.item_count ?? '—'}</Text>
                  </View>
                  {inv.invoice_gst > 0 && (
                    <View style={styles.row}>
                      <Text style={styles.rowLabel}>GST</Text>
                      <Text style={styles.rowValue}>${inv.invoice_gst?.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.row, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>${inv.invoice_total?.toFixed(2)}</Text>
                  </View>
                </View>

                {inv.invoice_status === 'DRAFT' && (
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      Alert.alert(
                        'Submit Invoice',
                        'Send this invoice to the operator for payment?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Submit',
                            onPress: () => submitMutation.mutate(inv.id),
                          },
                        ],
                      );
                    }}
                    disabled={submitMutation.isPending}
                  >
                    <Text style={styles.submitButtonText}>📤 Submit for Payment</Text>
                  </TouchableOpacity>
                )}

                {inv.invoice_status === 'PAID' && (
                  <View style={styles.paidBanner}>
                    <Text style={styles.paidText}>
                      💰 Paid{inv.paid_at ? ` on ${formatDate(inv.paid_at)}` : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  createButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  createSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    gap: 10,
  },
  listSection: { padding: 16, gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  selectableJob: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#fafafa',
  },
  selectedJob: { borderColor: '#1a1a1a', backgroundColor: '#f0f0f0' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkmark: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  jobInfo: { flex: 1, gap: 2 },
  jobNum: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1a1a1a',
  },
  jobDate: { fontSize: 11, color: '#666' },
  jobAddress: { fontSize: 11, color: '#888' },
  jobEarnings: { fontSize: 15, fontWeight: '700', color: '#22c55e' },
  submitCreateButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitCreateText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1a1a1a',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  invoiceDetails: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500' },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
    marginTop: 2,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#22c55e' },
  submitButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  submitButtonText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  paidBanner: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  paidText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  emptySubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptySmall: { paddingVertical: 20, alignItems: 'center' },
  emptySmallText: { fontSize: 13, color: '#666' },
});
