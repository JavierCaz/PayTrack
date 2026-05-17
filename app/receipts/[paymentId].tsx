import { useMemo, useRef, useState, useEffect  } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import LoadingScreen from '../../components/LoadingScreen';
import { getPaymentWithDetails } from '../../src/services/paymentService';
import { shareReceipt, saveReceiptToGallery } from '../../src/services/receiptService';
import { useTranslation } from '../../src/i18n';
import { useTheme } from '../../src/theme';

export default function ReceiptScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const receiptRef = useRef<View>(null);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingVertical: 20 },
    actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8, marginBottom: 40 },
    button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    shareButton: { backgroundColor: colors.primary },
    saveButton: { backgroundColor: colors.success },
    buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  useEffect(() => { if (!paymentId) return; getPaymentWithDetails(paymentId).then((data) => { setPayment(data); setLoading(false); }); }, [paymentId]);

  const handleShare = async () => { setSharing(true); await shareReceipt(receiptRef); setSharing(false); };
  const handleSave = async () => { setSharing(true); await saveReceiptToGallery(receiptRef); setSharing(false); };

  if (loading) return <LoadingScreen />;
  if (!payment) return <LoadingScreen message="Receipt not found" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View ref={receiptRef} collapsable={false}>
        <ReceiptTemplate
          clientName={payment.clientName}
          collectionName={payment.productName}
          installmentNumber={payment.installmentNumber}
          totalInstallments={payment.numInstallments}
          paidAmount={payment.paidAmount || payment.amount}
          paidDate={payment.paidDate || payment.createdAt}
          receiptNumber={payment.id.slice(-8).toUpperCase()}
          totalCollectionAmount={payment.totalPrice}
          pendingAmount={Math.max(0, payment.totalPrice - payment.totalPaidForCollection)}
          notes={payment.notes}
        />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={handleShare} disabled={sharing}>
          {sharing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <><Ionicons name="share-outline" size={20} color="#FFFFFF" /><Text style={styles.buttonText}>{t('receipt.share')}</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={sharing}>
          <Ionicons name="download-outline" size={20} color="#FFFFFF" /><Text style={styles.buttonText}>{t('receipt.saveToGallery')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
