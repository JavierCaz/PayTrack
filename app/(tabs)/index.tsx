import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatCard from '../../components/StatCard';
import LoadingScreen from '../../components/LoadingScreen';
import IncomeChart from '../../components/IncomeChart';
import { usePaymentStore } from '../../src/stores/paymentStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useTranslation } from '../../src/i18n';
import { useTheme } from '../../src/theme';
import { formatCurrency, maskCurrency, maskNumber } from '../../src/utils/formatters';
import { formatDate } from '../../src/utils/dateUtils';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';

type Period = 'today' | 'week' | 'month' | 'year';

export default function Dashboard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { stats, chartData, dayPayments, loadDashboardStats, loadChartData, loadDayPayments } = usePaymentStore();
  const { privacyMode, hydratePrivacyMode, togglePrivacyMode } = useUIStore();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [privacyReady, setPrivacyReady] = useState(false);

  useEffect(() => {
    loadChartData(period);
    if (period === 'today') loadDayPayments(dayjs().format('YYYY-MM-DD'));
  }, [period, loadChartData, loadDayPayments]);

  useEffect(() => {
    hydratePrivacyMode().finally(() => setPrivacyReady(true));
  }, [hydratePrivacyMode]);

  const periodIncome = useMemo(() => {
    if (!stats) return 0;
    switch (period) {
      case 'today': return stats.todayIncome;
      case 'week': return stats.weekIncome;
      case 'month': return stats.monthlyIncome;
      case 'year': return stats.yearIncome;
    }
  }, [period, stats]);

  const periodEarnings = useMemo(() => {
    if (!stats) return 0;
    switch (period) {
      case 'today': return stats.todayEarnings;
      case 'week': return stats.weekEarnings;
      case 'month': return stats.monthlyEarnings;
      case 'year': return stats.yearEarnings;
    }
  }, [period, stats]);

  const dayTotal = useMemo(() => dayPayments.reduce((sum, p) => sum + p.contributedAmount, 0), [dayPayments]);

  const money = (n: number, fractionDigits?: number) => (privacyMode ? maskCurrency(n, fractionDigits) : formatCurrency(n, fractionDigits));
  const num = (n: number) => (privacyMode ? maskNumber(n) : String(n));

  const periods: Period[] = ['today', 'week', 'month', 'year'];

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    headerTexts: { flex: 1 },
    privacyBtn: { padding: 8, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
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
    dayListCard: { backgroundColor: colors.card, marginHorizontal: 16, marginTop: 8, borderRadius: 12, paddingVertical: 4, overflow: 'hidden' as const },
    dayListTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2, textTransform: 'uppercase' as const },
    dayRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
    dayRowInfo: { flex: 1 },
    dayRowClient: { fontSize: 14, fontWeight: '600', color: colors.text },
    dayRowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    dayRowAmount: { fontSize: 14, fontWeight: '700', color: colors.success },
    dayTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.textTertiary + '44', paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
    dayTotalLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    dayTotalValue: { fontSize: 15, fontWeight: '800', color: colors.text },
    emptyPayments: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 16 },
  }), [colors]);

  const loadData = useCallback(async () => {
    await loadDashboardStats();
    await loadChartData(period);
    if (period === 'today') await loadDayPayments(dayjs().format('YYYY-MM-DD'));
  }, [loadDashboardStats, loadChartData, loadDayPayments, period]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  if (!stats || !privacyReady) return <LoadingScreen />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTexts}>
            <Text style={styles.greeting}>{t('dashboard.title')}</Text>
            <Text style={styles.subtitle}>{t('dashboard.subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.privacyBtn} onPress={togglePrivacyMode} accessibilityLabel={t(privacyMode ? 'dashboard.showValues' : 'dashboard.hideValues')} hitSlop={8}>
            <Ionicons name={privacyMode ? 'eye-off-outline' : 'eye-outline'} size={22} color={privacyMode ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.sectionTotals')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.totalClients')} value={num(stats.totalClients)} icon="people-outline" color={colors.primary} />
            <StatCard title={t('dashboard.totalCollections')} value={num(stats.totalCollections)} icon="folder-open-outline" color={colors.primary} />
            <StatCard title={t('dashboard.totalPayments')} value={num(stats.totalPayments)} icon="cash-outline" color={colors.primary} />
          </View>
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.activeClients')} value={num(stats.activeClients)} icon="person-outline" color={colors.warning} />
            <StatCard title={t('dashboard.activeCollections')} value={num(stats.activeCollections)} icon="folder-outline" color={colors.primary} />
            <StatCard title={t('dashboard.blacklistedClients')} value={num(stats.blacklistedClients)} icon="shield-outline" color="#e74c3c" />
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.sectionFinancials')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.totalPaidOut')} value={money(stats.totalPaidOut, 0)} icon="checkmark-circle-outline" color={colors.success} />
            <StatCard title={t('dashboard.totalRemainder')} value={money(stats.totalRemainder, 0)} icon="alert-circle-outline" color={colors.warning} />
            <StatCard title={t('dashboard.totalGross')} value={money(stats.totalPaymentsSum + stats.totalRemainder, 0)} icon="calculator-outline" color={colors.primary} />
          </View>
          <View style={styles.totalsRow}>
            <StatCard title={t('dashboard.totalInvestment')} value={money(stats.totalInvestment, 0)} icon="trending-down-outline" color={colors.warning} />
            <StatCard title={t('dashboard.realEarnings')} value={money(stats.realEarnings, 0)} icon="trending-up-outline" color={colors.success} />
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
            <Text style={styles.incomeAmount}>{money(periodIncome)}</Text>
            <Text style={styles.incomeLabel}>{t('dashboard.totalPaidOut')}</Text>
          </View>
          <View style={[styles.incomeInfo, { paddingTop: 4 }]}>
            <Text style={[styles.incomeAmount, { fontSize: 18, color: colors.success }]}>{money(periodEarnings)}</Text>
            <Text style={styles.incomeLabel}>{t('dashboard.realEarnings')}</Text>
          </View>
        </View>
        <View style={[styles.incomeCard, { marginTop: 8 }]}>
          <IncomeChart data={chartData} hidden={privacyMode} />
        </View>
        {period === 'today' && (
          <View style={styles.dayListCard}>
            <Text style={styles.dayListTitle}>{t('dashboard.paymentsOnDay', { date: formatDate(dayjs().format('YYYY-MM-DD')) })}</Text>
            {dayPayments.length === 0 ? (
              <Text style={styles.emptyPayments}>{t('common.noData')}</Text>
            ) : (
              <>
                {dayPayments.map((p) => (
                  <TouchableOpacity key={p.id} style={styles.dayRow} onPress={() => router.push(`/payments/edit/${p.id}`)}>
                    <View style={styles.dayRowInfo}>
                      <Text style={styles.dayRowClient} numberOfLines={1}>{p.clientName}</Text>
                      <Text style={styles.dayRowSub} numberOfLines={1}>{p.productName} · {t('payment.installment', { number: p.installmentNumber })}</Text>
                    </View>
                    <Text style={styles.dayRowAmount}>{money(p.contributedAmount)}</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.dayTotalRow}>
                  <Text style={styles.dayTotalLabel}>{t('collection.total')}</Text>
                  <Text style={styles.dayTotalValue}>{money(dayTotal)}</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
