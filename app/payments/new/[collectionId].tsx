import { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../../../components/DatePickerField';
import { usePaymentStore } from '../../../src/stores/paymentStore';
import { useCollectionStore } from '../../../src/stores/collectionStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '../../../src/utils/formatters';
import dayjs from 'dayjs';

export default function RecordPaymentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const { recordPayment } = usePaymentStore();
  const { getCollection } = useCollectionStore();
  const [collection, setCollection] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    collectionInfo: { backgroundColor: colors.infoBg, borderRadius: 14, padding: 20, alignItems: 'center' },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    backButton: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    backButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  }), [colors]);

  useEffect(() => {
    if (!collectionId) return;
    getCollection(collectionId).then((coll) => {
      setCollection(coll);
      setPaidAmount((coll?.installmentAmount ?? 0).toString());
      setLoading(false);
    });
  }, [collectionId, getCollection]);

  const handleRecord = async () => {
    if (!paidAmount || parseFloat(paidAmount) <= 0) { Alert.alert(t('common.required'), t('payment.enterValidAmount')); return; }
    setSaving(true);
    try {
      const paymentId = await recordPayment(collectionId!, parseFloat(paidAmount), paidDate, notes.trim() || undefined);
      Alert.alert(t('common.success'), t('payment.paidSuccess'), [
        { text: t('payment.viewReceipt'), onPress: () => router.replace(`/receipts/${paymentId}`) },
        { text: t('common.done'), style: 'cancel', onPress: () => router.back() },
      ]);
    } catch { Alert.alert(t('common.error'), t('payment.paidFailed')); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.loading')}</Text></View>;

  if (!collection) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.noData')}</Text></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.collectionInfo}>
          <Ionicons name="folder-open-outline" size={32} color={colors.infoText} />
          <Text style={{fontSize: 16, fontWeight: '600', color: colors.infoText, marginTop: 8}}>{collection.productName}</Text>
          <Text style={{fontSize: 14, color: colors.textSecondary, marginTop: 4}}>{t('collection.total')}: {formatCurrency(collection.totalPrice)}</Text>
          <Text style={{fontSize: 14, color: colors.textSecondary}}>{t('collection.remaining')}: {formatCurrency(collection.remainingBalance)}</Text>
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
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleRecord} disabled={saving}>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.saving') : t('payment.record')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
