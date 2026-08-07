import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../src/utils/formatters';
import { formatDate } from '../src/utils/dateUtils';
import { useMemo } from 'react';
import { useTranslation } from '../src/i18n';
import { useTheme } from '../src/theme';

interface PaymentItemProps {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidDate: string | null;
  paidAmount: number | null;
  onPress?: () => void;
}

export default function PaymentItem({ installmentNumber, dueDate, amount, paidDate, paidAmount, onPress }: PaymentItemProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginHorizontal: 16, marginVertical: 3, gap: 12, backgroundColor: colors.successBg },
    info: { flex: 1 },
    installment: { fontSize: 15, fontWeight: '600', color: colors.text },
    date: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    amountSection: { alignItems: 'flex-end' },
    amount: { fontSize: 15, fontWeight: '700', color: colors.success },
    paidDateStyle: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  }), [colors]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
      <View style={styles.info}>
        <Text style={styles.installment}>{t('payment.installment', { number: installmentNumber })}</Text>
        <Text style={styles.date}>{formatDate(paidDate || dueDate)}</Text>
      </View>
      <View style={styles.amountSection}>
        <Text style={styles.amount}>{paidAmount != null ? formatCurrency(paidAmount) : formatCurrency(amount)}</Text>
      </View>
    </TouchableOpacity>
  );
}
