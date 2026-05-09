import { useMemo, useState, useEffect  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../../../components/DatePickerField';
import { usePaymentStore } from '../../../src/stores/paymentStore';
import { Payment } from '../../../src/types';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';
import { formatCurrency } from '../../../src/utils/formatters';
import { formatDate } from '../../../src/utils/dateUtils';
import dayjs from 'dayjs';

export default function RecordPaymentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const { payments, loadPayments, recordPayment } = usePaymentStore();
  const [nextPayment, setNextPayment] = useState<Payment | null>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    paymentInfo: { backgroundColor: colors.infoBg, borderRadius: 14, padding: 20, alignItems: 'center' },
    installmentLabel: { fontSize: 18, fontWeight: '700', color: colors.infoText },
    dueDate: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    amount: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 8 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    warning: { fontSize: 12, color: colors.warning, fontWeight: '500', marginLeft: 2 },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    backButton: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    backButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  }), [colors]);

  useEffect(() => { if (!collectionId) return; loadPayments(collectionId).then(() => setLoading(false)); }, [collectionId, loadPayments]);

  useEffect(() => {
    const next = payments.find(p => p.status === 'pending');
    if (next) { setNextPayment(next); setPaidAmount(next.amount.toString()); }
  }, [payments]);

  const handleRecord = async () => {
    if (!nextPayment) { Alert.alert(t('payment.noPending'), t('payment.noPendingDesc')); return; }
    if (!paidAmount || parseFloat(paidAmount) <= 0) { Alert.alert(t('common.required'), t('payment.amountPaid')); return; }
    setSaving(true);
    try {
      await recordPayment(nextPayment.id, parseFloat(paidAmount), paidDate, notes.trim() || undefined);
      Alert.alert(t('common.success'), t('payment.paidSuccess'), [
        { text: t('payment.viewReceipt'), onPress: () => router.replace(`/receipts/${nextPayment.id}`) },
        { text: t('common.done'), style: 'cancel', onPress: () => router.back() },
      ]);
    } catch { Alert.alert(t('common.error'), t('payment.paidFailed')); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.loading')}</Text></View>;

  if (!nextPayment) return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 32 }}>
      <Ionicons name="shield-checkmark" size={64} color={colors.success} />
      <Text style={{fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16 }}>{t('payment.allPaid')}</Text>
      <Text style={{fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>{t('payment.allPaidDesc')}</Text>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backButtonText}>{t('common.back')}</Text></TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.paymentInfo}>
          <Text style={styles.installmentLabel}>{t('payment.installment', { number: nextPayment.installmentNumber })}</Text>
          <Text style={styles.dueDate}>{t('payment.due', { date: formatDate(nextPayment.dueDate) })}</Text>
          <Text style={styles.amount}>{t('payment.amountDue', { amount: formatCurrency(nextPayment.amount) })}</Text>
        </View>
        <DatePickerField label={t('payment.dateLabel')} value={paidDate} onChange={setPaidDate} />
        <View style={styles.field}>
          <Text style={styles.label}>{t('payment.amountPaid')}</Text>
          <TextInput style={styles.input} value={paidAmount} onChangeText={setPaidAmount} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" />
          {parseFloat(paidAmount) < nextPayment.amount && parseFloat(paidAmount) > 0 && (
            <Text style={styles.warning}>{t('payment.partialWarning', { amount: formatCurrency(nextPayment.amount - parseFloat(paidAmount)) })}</Text>
          )}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('payment.notes')}</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder={t('payment.notesPlaceholder')} placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleRecord} disabled={saving}>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.recording') : t('payment.record')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
