import { useMemo, useState, useEffect  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../../../components/DatePickerField';
import { useCollectionStore } from '../../../src/stores/collectionStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';

export default function EditCollectionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCollection, updateCollection } = useCollectionStore();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    hint: { fontSize: 12, color: colors.textTertiary, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    row: { flexDirection: 'row', gap: 12 },
    warningBox: { fontSize: 13, color: colors.warning, backgroundColor: colors.warningBg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.warning + '40', lineHeight: 18 },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [numInstallments, setNumInstallments] = useState('12');
  const [paymentsPerMonth, setPaymentsPerMonth] = useState('2');
  const [paymentDays, setPaymentDays] = useState('1,15');
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (!id) return;
    getCollection(id).then((col) => {
      if (col) {
        setProductName(col.productName);
        setTotalPrice(col.totalPrice.toString());
        setNumInstallments(col.numInstallments.toString());
        setPaymentsPerMonth(col.paymentsPerMonth.toString());
        setPaymentDays(col.paymentDays.join(','));
        setStartDate(col.startDate);
      }
      setLoading(false);
    });
  }, [id, getCollection]);

  const handleSave = async () => {
    if (!productName.trim()) { Alert.alert(t('common.required'), t('collection.productRequired')); return; }
    if (!totalPrice || parseFloat(totalPrice) <= 0) { Alert.alert(t('common.required'), t('collection.priceRequired')); return; }
    if (!numInstallments || parseInt(numInstallments) <= 0) { Alert.alert(t('common.required'), t('collection.installmentsRequired')); return; }
    if (!id) return;
    const days = paymentDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0 && d <= 31);
    if (days.length === 0) { Alert.alert(t('common.error'), t('collection.paymentDaysError')); return; }
    setSaving(true);
    try {
      await updateCollection(id, { productName: productName.trim(), totalPrice: parseFloat(totalPrice), numInstallments: parseInt(numInstallments), paymentsPerMonth: Math.min(parseInt(paymentsPerMonth), days.length), paymentDays: days, startDate });
      Alert.alert(t('common.success'), t('collection.create'), [{ text: t('common.done'), onPress: () => router.back() }]);
    } catch { Alert.alert(t('common.error'), t('collection.createFailed')); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.loading')}</Text></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}><Text style={styles.label}>{t('collection.productName')}</Text><TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Web Development" placeholderTextColor={colors.textTertiary} /></View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.totalPrice')}</Text><TextInput style={styles.input} value={totalPrice} onChangeText={setTotalPrice} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" /></View>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}><Text style={styles.label}>{t('collection.installments')}</Text><TextInput style={styles.input} value={numInstallments} onChangeText={setNumInstallments} placeholder="12" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" /></View>
          <View style={[styles.field, { flex: 1 }]}><Text style={styles.label}>{t('collection.perMonth')}</Text><TextInput style={styles.input} value={paymentsPerMonth} onChangeText={setPaymentsPerMonth} placeholder="2" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" /></View>
        </View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.paymentDays')}</Text><TextInput style={styles.input} value={paymentDays} onChangeText={setPaymentDays} placeholder="1, 15" placeholderTextColor={colors.textTertiary} /><Text style={styles.hint}>{t('collection.paymentDaysHint')}</Text></View>
        <DatePickerField label={t('collection.startDate')} value={startDate} onChange={setStartDate} />
        <Text style={styles.warningBox}>{t('collection.editWarning')}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.saving') : t('common.update')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
