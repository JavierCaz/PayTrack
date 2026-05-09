import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useMemo, useCallback, useState  } from 'react';
import { useFocusEffect } from 'expo-router';
import StatCard from '../../components/StatCard';
import LoadingScreen from '../../components/LoadingScreen';
import { usePaymentStore } from '../../src/stores/paymentStore';
import { useTranslation } from '../../src/i18n';
import { useTheme } from '../../src/theme';
import { formatCurrency } from '../../src/utils/formatters';

export default function Dashboard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { stats, loadDashboardStats } = usePaymentStore();
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 20, paddingTop: 12 },
    greeting: { fontSize: 28, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
    section: { marginTop: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginHorizontal: 20, marginBottom: 12 },
    incomeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 16, padding: 16, borderRadius: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    incomeInfo: { flex: 1 },
    incomeLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    incomeAmount: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 2 },
  }), [colors]);

  const loadData = useCallback(async () => {
    await loadDashboardStats();
  }, [loadDashboardStats]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (!stats) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('dashboard.title')}</Text>
        <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.sectionTotals')}</Text>
        <View style={styles.statsGrid}>
          <StatCard title={t('dashboard.totalClients')} value={stats.totalClients} icon="people-outline" color={colors.primary} />
          <StatCard title={t('dashboard.totalCollections')} value={stats.totalCollections} icon="folder-open-outline" color={colors.primary} />
          <StatCard title={t('dashboard.totalPayments')} value={stats.totalPayments} icon="cash-outline" color={colors.primary} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.sectionPayments')}</Text>
        <View style={styles.statsGrid}>
          <StatCard title={t('dashboard.totalPaymentsSum')} value={formatCurrency(stats.totalPaymentsSum)} icon="card-outline" color={colors.success} />
          <StatCard title={t('dashboard.totalPaidOut')} value={formatCurrency(stats.totalPaidOut)} icon="checkmark-circle-outline" color={colors.success} />
          <StatCard title={t('dashboard.totalRemainder')} value={formatCurrency(stats.totalRemainder)} icon="alert-circle-outline" color={colors.warning} />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.monthlyIncome')}</Text>
        <View style={styles.incomeCard}>
          <View style={styles.incomeInfo}>
            <Text style={styles.incomeLabel}>{t('dashboard.thisMonth')}</Text>
            <Text style={styles.incomeAmount}>{formatCurrency(stats.monthlyIncome)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
