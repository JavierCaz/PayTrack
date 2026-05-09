import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../src/utils/formatters';
import { formatDate, isOverdue, isDueToday } from '../src/utils/dateUtils';
import { useMemo } from 'react';
import { useTranslation } from '../src/i18n';
import { useTheme } from '../src/theme';

interface PaymentItemProps {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidDate: string | null;
  paidAmount: number | null;
  onPress?: () => void;
}

export default function PaymentItem({ installmentNumber, dueDate, amount, status, paidDate, paidAmount, onPress }: PaymentItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isPaid = status === 'paid' || status === 'partial';
  const isPending = status === 'pending';
  const isOverdueStatus = status === 'overdue' || (isPending && isOverdue(dueDate));
  const isDue = isPending && isDueToday(dueDate);
  const isPartial = status === 'partial';

  const icon = isPaid ? (isPartial ? 'remove-circle' : 'checkmark-circle') : isOverdueStatus ? 'alert-circle' : isDue ? 'time-outline' : 'ellipse-outline';
  const iconColor = isPaid ? (isPartial ? colors.warning : colors.success) : isOverdueStatus ? colors.danger : isDue ? colors.primary : colors.textTertiary;
  const bgColor = isPaid ? (isPartial ? colors.warningBg : colors.successBg) : isOverdueStatus ? colors.dangerBg : isDue ? colors.infoBg : colors.card;

  const styles = useMemo(() => StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginHorizontal: 16, marginVertical: 3, gap: 12 },
    info: { flex: 1 },
    installment: { fontSize: 15, fontWeight: '600', color: colors.text },
    date: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    amountSection: { alignItems: 'flex-end' },
    amount: { fontSize: 15, fontWeight: '700', color: colors.text },
    paidAmountStyle: { color: colors.success },
    partialLabel: { fontSize: 11, color: colors.warning, fontWeight: '600', marginTop: 1 },
    paidDateStyle: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  }), [colors]);

  let dateLabel = formatDate(dueDate);
  if (isOverdueStatus && !isPaid) dateLabel += ' ' + t('payment.overdueLabel');
  if (isDue) dateLabel += ' ' + t('payment.dueTodayLabel');

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: bgColor }]} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={24} color={iconColor} />
      <View style={styles.info}>
        <Text style={styles.installment}>{t('payment.installment', { number: installmentNumber })}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>
      <View style={styles.amountSection}>
        <Text style={[styles.amount, isPaid && styles.paidAmountStyle]}>
          {isPaid && paidAmount != null ? formatCurrency(paidAmount) : formatCurrency(amount)}
        </Text>
        {isPartial && <Text style={styles.partialLabel}>{t('payment.partialLabel')}</Text>}
        {isPaid && paidDate && <Text style={styles.paidDateStyle}>{formatDate(paidDate)}</Text>}
      </View>
    </TouchableOpacity>
  );
}
