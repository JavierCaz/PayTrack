import { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ReceiptTemplate from '../../../components/ReceiptTemplate';
import LoadingScreen from '../../../components/LoadingScreen';
import { getCollectionReceiptData } from '../../../src/services/collectionService';
import { getPayments } from '../../../src/services/paymentService';
import * as Clipboard from 'expo-clipboard';
import { shareReceipt, saveReceiptToGallery } from '../../../src/services/receiptService';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';


export default function CollectionReceiptScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const receiptRef = useRef<View>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingVertical: 20 },
    actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8, marginBottom: 40 },
    button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    shareButton: { backgroundColor: colors.primary },
    saveButton: { backgroundColor: colors.success },
    buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  useEffect(() => {
    if (!collectionId) return;
    Promise.all([
      getCollectionReceiptData(collectionId),
      getPayments(collectionId),
    ]).then(([result, paymentsList]) => {
      setData(result);
      setPayments(paymentsList);
      setLoading(false);
    });
  }, [collectionId]);

  const handleShare = async () => {
    if (!data) return;
    setSharing(true);
    const name = data.clientPlaceholderName || data.clientName.split(' ')[0];
    await Clipboard.setStringAsync(t('receipt.thankYouMessage', { name }));
    await shareReceipt(receiptRef);
    setSharing(false);
  };

  const handleSave = async () => {
    setSharing(true);
    await saveReceiptToGallery(receiptRef);
    setSharing(false);
  };

  if (loading) return <LoadingScreen />;
  if (!data) return <LoadingScreen message="Receipt not found" />;

  const today = new Date().toISOString().split('T')[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View ref={receiptRef} collapsable={false}>
        <ReceiptTemplate
          mode="collection"
          clientName={data.clientName}
          collectionName={data.productName}
          installmentNumber={data.paymentCount}
          totalInstallments={data.numInstallments}
          paidAmount={data.paidAmount}
          paidDate={today}
          receiptNumber={data.id.slice(-8).toUpperCase()}
          totalCollectionAmount={data.totalPrice}
          pendingAmount={data.remainingBalance}
          payments={payments.filter((p: any) => p.paidAmount != null).map((p: any) => ({
            installmentNumber: p.installmentNumber,
            amount: p.paidAmount || p.amount,
            paidDate: p.paidDate || p.dueDate,
          }))}
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
