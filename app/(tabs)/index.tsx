import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useMemo, useCallback, useState  } from 'react';
import { useFocusEffect } from 'expo-router';
import StatCard from '../../components/StatCard';
import LoadingScreen from '../../components/LoadingScreen';
import { usePaymentStore } from '../../src/stores/paymentStore';
import { useTranslation } from '../../src/i18n';
import { useTheme } from '../../src/theme';
import { formatCurrency } from '../../src/utils/formatters';

type Period = 'today' | 'week' | 'month' | 'year';

export default function Dashboard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { stats, loadDashboardStats } = usePaymentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const periodIncome = useMemo(() => {
    if (!stats) return 0;
    switch (period) {
      case 'today': return stats.todayIncome;
      case 'week': return stats.weekIncome;
      case 'month': return stats.monthlyIncome;
      case 'year': return stats.yearIncome;
    }
  }, [period, stats]);

  const periods: Period[] = ['today', 'week', 'month', 'year'];

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    statsGrid: { paddingHorizontal: 16, gap: 8 },
    totalsRow: { flexDirection: 'row', gap: 6 },
    section: { marginTop: 4, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginHorizontal: 16, marginBottom: 8 },
    incomeCard: { backgroundColor: colors.card, marginHorizontal: 16, padding: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    incomeInfo: { alignItems: 'center', paddingVertical: 4 },
    incomeLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    incomeAmount: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
    pickerRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 6 },
    pickerBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' as const },
    pickerBtnActive: { backgroundColor: colors.primary },
    pickerBtnInactive: { backgroundColor: colors.card },
    pickerText: { fontSize: 12, fontWeight: '600' },
    pickerTextActive: { color: '#fff' },
    pickerTextInactive: { color: colors.textSecondary },
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
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.totalClients')} value={stats.totalClients} icon="people-outline" color={colors.primary} />
            <StatCard title={t('dashboard.totalCollections')} value={stats.totalCollections} icon="folder-open-outline" color={colors.primary} />
            <StatCard title={t('dashboard.totalPayments')} value={stats.totalPayments} icon="cash-outline" color={colors.primary} />
          </View>
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.activeClients')} value={stats.activeClients} icon="person-outline" color={colors.warning} />
            <StatCard title={t('dashboard.activeCollections')} value={stats.activeCollections} icon="folder-outline" color={colors.primary} />
            <StatCard title={t('dashboard.blacklistedClients')} value={stats.blacklistedClients} icon="shield-outline" color="#e74c3c" />
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.sectionPayments')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.totalPaymentsSum')} value={formatCurrency(stats.totalPaymentsSum, 0)} icon="card-outline" color={colors.success} />
            <StatCard title={t('dashboard.totalPaidOut')} value={formatCurrency(stats.totalPaidOut, 0)} icon="checkmark-circle-outline" color={colors.success} />
            <StatCard title={t('dashboard.totalRemainder')} value={formatCurrency(stats.totalRemainder, 0)} icon="alert-circle-outline" color={colors.warning} />
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.periodIncome')}</Text>
        <View style={styles.pickerRow}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pickerBtn, period === p ? styles.pickerBtnActive : styles.pickerBtnInactive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.pickerText, period === p ? styles.pickerTextActive : styles.pickerTextInactive]}>
                {t(`dashboard.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.incomeCard, { marginTop: 10 }]}>
          <View style={styles.incomeInfo}>
            <Text style={styles.incomeAmount}>{formatCurrency(periodIncome)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
