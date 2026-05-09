import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../src/utils/formatters';
import { formatDate } from '../src/utils/dateUtils';
import { useTranslation } from '../src/i18n';

interface ReceiptTemplateProps {
  clientName: string;
  collectionName: string;
  installmentNumber: number;
  totalInstallments: number;
  paidAmount: number;
  paidDate: string;
  receiptNumber?: string;
  totalCollectionAmount: number;
  pendingAmount: number;
}

export default function ReceiptTemplate({
  clientName,
  collectionName,
  installmentNumber,
  totalInstallments,
  paidAmount,
  paidDate,
  receiptNumber,
  totalCollectionAmount,
  pendingAmount,
}: ReceiptTemplateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('receipt.paymentReceipt')}</Text>
        <Text style={styles.receiptNo}>{t('receipt.receiptNo', { number: receiptNumber || `${Date.now()}` })}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.dataRow}>
        <View style={styles.dataColumn}>
          <Text style={styles.sectionTitle}>{t('receipt.client')}</Text>
          <Text style={styles.value}>{clientName}</Text>
        </View>
        <View style={styles.dataColumn}>
          <Text style={styles.sectionTitle}>{t('receipt.paidDate')}</Text>
          <Text style={styles.value}>{formatDate(paidDate)}</Text>
        </View>
      </View>
      <View style={styles.dataRow}>
        <View style={styles.dataColumn}>
          <Text style={styles.sectionTitle}>{t('receipt.collection')}</Text>
          <Text style={styles.value}>{collectionName}</Text>
        </View>
        <View style={styles.dataColumn}>
          <Text style={styles.sectionTitle}>{t('receipt.installment')}</Text>
          <Text style={styles.value}>{installmentNumber} / {totalInstallments}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('receipt.totalCollection')}</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalCollectionAmount)}</Text>
        </View>
        <View style={styles.paymentMadeRow}>
          <Text style={styles.paymentMadeLabel}>{t('receipt.paymentMade')}</Text>
          <Text style={styles.paymentMadeValue}>{formatCurrency(paidAmount)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('receipt.pendingAfter')}</Text>
          <Text style={styles.pendingValue}>{formatCurrency(pendingAmount)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('receipt.thankYou')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 1,
  },
  receiptNo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  dataRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  dataColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  totalSection: {
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  paymentMadeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentMadeLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  paymentMadeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
  },
  pendingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});
