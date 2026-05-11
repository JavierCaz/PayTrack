import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../src/utils/formatters';
import { useMemo } from 'react';
import { useTranslation } from '../src/i18n';
import { useTheme } from '../src/theme';

interface CollectionCardProps {
  productName: string;
  clientName?: string;
  totalPrice: number;
  paidAmount: number;
  remainingBalance: number;
  status: string;
  onPress: () => void;
}

export default function CollectionCard({ productName, clientName, totalPrice, paidAmount, remainingBalance, status, onPress }: CollectionCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const progress = totalPrice > 0 ? (paidAmount / totalPrice) * 100 : 0;
  const statusColor = status === 'active' ? colors.statusActive : status === 'completed' ? colors.statusCompleted : colors.statusOverdue;

  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginHorizontal: 16, marginVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    headerLeft: { flex: 1, marginRight: 8 },
    productName: { fontSize: 16, fontWeight: '600', color: colors.text },
    clientName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
    statusText: { fontSize: 12, fontWeight: '600' },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    progressBar: { flex: 1, height: 8, backgroundColor: colors.progressBg, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    progressText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    footer: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 11, color: colors.textTertiary, fontWeight: '500', marginBottom: 2 },
    paidAmount: { fontSize: 14, fontWeight: '600', color: colors.success },
    remainingAmount: { fontSize: 14, fontWeight: '600', color: colors.danger },
    totalAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
  }), [colors]);

  const statusIcons: Record<string, keyof typeof Ionicons.glyphMap> = { active: 'checkmark-circle', completed: 'shield-checkmark', overdue: 'alert-circle' };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
          {clientName && <Text style={styles.clientName}>{clientName}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Ionicons name={statusIcons[status] || 'help-circle'} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{t('status.' + status)}</Text>
        </View>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: statusColor }]} />
        </View>
        <Text style={styles.progressText}>{formatCurrency(paidAmount)} / {formatCurrency(totalPrice)}</Text>
      </View>
      <View style={styles.footer}>
        <View>
          <Text style={styles.label}>{t('collection.paid')}</Text>
          <Text style={styles.paidAmount}>{formatCurrency(paidAmount)}</Text>
        </View>
        <View>
          <Text style={styles.label}>{t('collection.remaining')}</Text>
          <Text style={styles.remainingAmount}>{formatCurrency(remainingBalance)}</Text>
        </View>
        <View>
          <Text style={styles.label}>{t('collection.total')}</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalPrice)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
