import { useMemo, useState  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCollectionStore } from '../../../src/stores/collectionStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';
import dayjs from 'dayjs';

export default function NewCollectionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { createCollection } = useCollectionStore();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    hint: { fontSize: 12, color: colors.textTertiary, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    row: { flexDirection: 'row', gap: 12 },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  const [productName, setProductName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [numInstallments, setNumInstallments] = useState('12');
  const [paymentsPerMonth, setPaymentsPerMonth] = useState('2');
  const [paymentDays, setPaymentDays] = useState('1,15');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!productName.trim()) { Alert.alert(t('common.required'), t('collection.productRequired')); return; }
    if (!totalPrice || parseFloat(totalPrice) <= 0) { Alert.alert(t('common.required'), t('collection.priceRequired')); return; }
    if (!numInstallments || parseInt(numInstallments) <= 0) { Alert.alert(t('common.required'), t('collection.installmentsRequired')); return; }
    setSaving(true);
    try {
      const days = paymentDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0 && d <= 31);
      if (days.length === 0) { Alert.alert(t('common.error'), t('collection.paymentDaysError')); setSaving(false); return; }
      await createCollection({ clientId: clientId!, productName: productName.trim(), totalPrice: parseFloat(totalPrice), numInstallments: parseInt(numInstallments), paymentsPerMonth: Math.min(parseInt(paymentsPerMonth), days.length), paymentDays: days, startDate });
      router.back();
    } catch { Alert.alert(t('common.error'), t('collection.createFailed')); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}><Text style={styles.label}>{t('collection.productName')}</Text><TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder={t('collection.productNamePlaceholder')} placeholderTextColor={colors.textTertiary} /></View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.totalPrice')}</Text><TextInput style={styles.input} value={totalPrice} onChangeText={setTotalPrice} placeholder={t('collection.totalPricePlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" /></View>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}><Text style={styles.label}>{t('collection.installments')}</Text><TextInput style={styles.input} value={numInstallments} onChangeText={setNumInstallments} placeholder="12" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" /></View>
          <View style={[styles.field, { flex: 1 }]}><Text style={styles.label}>{t('collection.perMonth')}</Text><TextInput style={styles.input} value={paymentsPerMonth} onChangeText={setPaymentsPerMonth} placeholder="2" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" /></View>
        </View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.paymentDays')}</Text><TextInput style={styles.input} value={paymentDays} onChangeText={setPaymentDays} placeholder={t('collection.paymentDaysPlaceholder')} placeholderTextColor={colors.textTertiary} /><Text style={styles.hint}>{t('collection.paymentDaysHint')}</Text></View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.startDate')}</Text><TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder={t('collection.startDatePlaceholder')} placeholderTextColor={colors.textTertiary} /><Text style={styles.hint}>{t('collection.startDateHint')}</Text></View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.creating') : t('collection.create')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
