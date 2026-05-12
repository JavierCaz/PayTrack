import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import PaymentItem from '../../components/PaymentItem';
import { useTranslation } from '../../src/i18n';
import { useCollectionStore } from '../../src/stores/collectionStore';
import { usePaymentStore } from '../../src/stores/paymentStore';
import { useTheme } from '../../src/theme';
import { formatDate } from '../../src/utils/dateUtils';
import { formatCurrency } from '../../src/utils/formatters';
import type { RecurrenceConfig } from '../../src/types';

export default function CollectionDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { payments, loadPayments } = usePaymentStore();
  const { getCollection, deleteCollection } = useCollectionStore();
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', padding: 24, backgroundColor: colors.card, marginBottom: 1 },
    productName: { fontSize: 22, fontWeight: '700', color: colors.text },
    clientName: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
    statusText: { fontSize: 13, fontWeight: '600' },
    headerActions: { flexDirection: 'row', gap: 24, marginTop: 16 },
    headerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerActionText: { fontSize: 14, fontWeight: '600' },
    statsRow: { flexDirection: 'row', backgroundColor: colors.card, padding: 20, marginBottom: 1 },
    stat: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
    statValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, paddingHorizontal: 20, paddingBottom: 20 },
    progressBar: { flex: 1, height: 10, backgroundColor: colors.progressBg, borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
    progressText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    infoRow: { flexDirection: 'row', backgroundColor: colors.card, padding: 20, marginBottom: 8, gap: 12 },
    infoItem: { flex: 1, alignItems: 'center' },
    infoLabel: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
    infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fabBg, justifyContent: 'center', alignItems: 'center', shadowColor: colors.fabBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  }), [colors]);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [coll] = await Promise.all([getCollection(id), loadPayments(id)]);
    setCollection(coll);
    setLoading(false);
  }, [id, getCollection, loadPayments]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleDelete = () => {
    Alert.alert(t('common.delete'), t('collection.deleteWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { if (!id) return; await deleteCollection(id); router.back(); } },
    ]);
  };

  const getFrequencyLabel = (rec: RecurrenceConfig, count: number) => {
    if (rec.type === 'weekly') return t('collection.weeklyLabel', { count });
    if (rec.type === 'monthly_weekday') return t('collection.weekdayLabel', { count });
    return t('collection.xPerMonth', { count });
  };

  if (loading) return <LoadingScreen />;
  if (!collection) return <EmptyState icon="alert-circle" title={t('collection.notFound')} />;

  const statusColor = collection.status === 'active' ? colors.statusActive : colors.statusCompleted;
  const hasRemaining = collection.remainingBalance > 0;
  const progress = collection.totalPrice > 0 ? (collection.paidAmount / collection.totalPrice) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <Text style={styles.productName}>{collection.productName}</Text>
          <Text style={styles.clientName}>{collection.clientName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{t('status.' + collection.status)}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerAction} onPress={() => router.push(`/collections/edit/${id}`)}>
              <Ionicons name="create-outline" size={18} color={colors.primary} /><Text style={[styles.headerActionText, { color: colors.primary }]}>{t('clients.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={[styles.headerActionText, { color: colors.danger }]}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statLabel}>{t('collection.total')}</Text><Text style={styles.statValue}>{formatCurrency(collection.totalPrice)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>{t('collection.paid')}</Text><Text style={[styles.statValue, { color: colors.success }]}>{formatCurrency(collection.paidAmount)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>{t('collection.remaining')}</Text><Text style={[styles.statValue, { color: colors.danger }]}>{formatCurrency(collection.remainingBalance)}</Text></View>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} /></View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('collection.startDateLabel')}</Text><Text style={styles.infoValue}>{formatDate(collection.startDate)}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('collection.installmentsLabel')}</Text><Text style={styles.infoValue}>{collection.numInstallments}</Text></View>
          <View style={styles.infoItem}><Text style={styles.infoLabel}>{t('collection.frequency')}</Text><Text style={styles.infoValue}>{getFrequencyLabel(collection.recurrence, collection.paymentsPerMonth)}</Text></View>
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('collection.payments')} ({payments.length})</Text>
        </View>
        {payments.length === 0
          ? <EmptyState icon="cash-outline" title={t('collection.noPayments')} subtitle={t('collection.noPaymentsDesc')} />
          : payments.map((p: any) => (
              <TouchableOpacity key={p.id} onPress={() => router.push(`/payments/edit/${p.id}`)}>
                <PaymentItem installmentNumber={p.installmentNumber} dueDate={p.dueDate} amount={p.amount} paidDate={p.paidDate} paidAmount={p.paidAmount} />
              </TouchableOpacity>
            ))
        }
        <View style={{ height: 80 }} />
      </ScrollView>
      {hasRemaining && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push(`/payments/new/${id}`)}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}
