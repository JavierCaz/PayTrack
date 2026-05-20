import { useMemo, useState, useEffect  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../../../components/DatePickerField';
import { usePaymentStore } from '../../../src/stores/paymentStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../src/utils/formatters';

export default function EditPaymentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const { getPayment, updatePayment, deletePayment } = usePaymentStore();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    paymentInfo: { backgroundColor: colors.infoBg, borderRadius: 14, padding: 20, alignItems: 'center' },
    installmentLabel: { fontSize: 18, fontWeight: '700', color: colors.infoText, textAlign: 'center' },
    clientName: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    dueText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.danger + '60', backgroundColor: colors.dangerBg, gap: 8, marginTop: 8 },
    deleteText: { fontSize: 16, fontWeight: '600', color: colors.danger },
    receiptButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '40', backgroundColor: colors.infoBg, gap: 8, marginTop: 8 },
    receiptText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  }), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!paymentId) return;
    getPayment(paymentId).then((data) => {
      if (data) {
        setPayment(data);
        setPaidAmount(data.paidAmount?.toString() || data.amount.toString());
        setPaidDate(data.paidDate?.split('T')[0] || '');
        setNotes(data.notes || '');
      }
      setLoading(false);
    });
  }, [paymentId, getPayment]);

  const handleSave = async () => {
    if (!paidAmount || parseFloat(paidAmount) <= 0) { Alert.alert(t('common.required'), t('payment.enterValidAmount')); return; }
    if (!paidDate) { Alert.alert(t('common.required'), t('payment.enterDate')); return; }
    setSaving(true);
    try {
      await updatePayment(paymentId!, { paidAmount: parseFloat(paidAmount), paidDate, notes: notes.trim() || undefined });
      Alert.alert(t('common.success'), t('payment.paidSuccess'), [{ text: t('common.done'), onPress: () => router.back() }]);
    } catch { Alert.alert(t('common.error'), t('payment.updateFailed')); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert(t('common.delete'), t('payment.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await deletePayment(paymentId!); Alert.alert(t('common.success'), t('payment.deleteSuccess')); router.back(); }
        catch { Alert.alert(t('common.error'), t('payment.deleteFailed')); }
      }},
    ]);
  };

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.loading')}</Text></View>;
  if (!payment) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.noData')}</Text></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.paymentInfo}>
          <Text style={styles.installmentLabel}>{t('payment.installment', { number: payment.installmentNumber })} - {payment.productName}</Text>
          <Text style={styles.clientName}>{payment.clientName}</Text>
          <Text style={styles.dueText}>{t('payment.amountWas', { amount: formatCurrency(payment.amount) })}</Text>
        </View>
        <DatePickerField label={t('payment.dateLabel')} value={paidDate} onChange={setPaidDate} />
        <View style={styles.field}>
          <Text style={styles.label}>{t('payment.amountPaid')}</Text>
          <TextInput style={styles.input} value={paidAmount} onChangeText={setPaidAmount} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('payment.notes')}</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder={t('payment.notesPlaceholder')} placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />
        </View>
        <TouchableOpacity style={styles.receiptButton} onPress={() => router.push(`/receipts/${paymentId}`)}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} /><Text style={styles.receiptText}>{t('payment.viewReceipt')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} /><Text style={styles.deleteText}>{t('common.delete')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.saving') : t('common.update')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
