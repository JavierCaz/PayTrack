import { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../../../components/DatePickerField';
import { useCollectionStore } from '../../../src/stores/collectionStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RecurrenceType, RecurrenceConfig } from '../../../src/types';

export default function EditCollectionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
    segmentRow: { flexDirection: 'row', gap: 8 },
    segment: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center' },
    segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    segmentTextActive: { color: '#FFFFFF' },
    chipRow: { flexDirection: 'row', gap: 6 },
    chip: { width: 42, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, justifyContent: 'center', alignItems: 'center' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: '#FFFFFF' },
    weekRow: { flexDirection: 'row', gap: 6 },
    weekChip: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center' },
    weekChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [numInstallments, setNumInstallments] = useState('12');
  const [startDate, setStartDate] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [conversionRate, setConversionRate] = useState('1');

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('monthly');
  const [monthDays, setMonthDays] = useState('1,15');
  const [weekDay, setWeekDay] = useState<number | null>(null);
  const [monthWeekday, setMonthWeekday] = useState<{ week: number; day: number }>({ week: 0, day: 1 });

  useEffect(() => {
    if (!id) return;
    getCollection(id).then((col) => {
      if (col) {
        setProductName(col.productName);
        setTotalPrice(col.totalPrice.toString());
        setNumInstallments(col.numInstallments.toString());
        setStartDate(col.startDate);
        setInstallmentAmount(col.installmentAmount ? col.installmentAmount.toString() : '');
        setConversionRate(col.conversionRate ? col.conversionRate.toString() : '1');

        const rec = col.recurrence;
        setRecurrenceType(rec.type);
        setMonthDays(rec.monthDays.length > 0 ? rec.monthDays.join(',') : '1,15');
        setWeekDay(rec.weekDays[0] ?? null);
        if (rec.monthWeekday.length > 0) {
          setMonthWeekday(rec.monthWeekday[0]);
        }
      }
      setLoading(false);
    });
  }, [id, getCollection]);

  const buildRecurrence = (): RecurrenceConfig | null => {
    if (recurrenceType === 'monthly') {
      const days = monthDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0 && d <= 31);
      if (days.length === 0) { Alert.alert(t('common.error'), t('collection.paymentDaysError')); return null; }
      return { type: 'monthly', monthDays: days, weekDays: [], monthWeekday: [] };
    }
    if (recurrenceType === 'weekly') {
      if (weekDay === null) { Alert.alert(t('common.error'), t('collection.paymentDaysError')); return null; }
      return { type: 'weekly', monthDays: [], weekDays: [weekDay], monthWeekday: [] };
    }
    return { type: 'monthly_weekday', monthDays: [], weekDays: [], monthWeekday: [monthWeekday] };
  };

  const handleSave = async () => {
    if (!productName.trim()) { Alert.alert(t('common.required'), t('collection.productRequired')); return; }
    if (!totalPrice || parseFloat(totalPrice) <= 0) { Alert.alert(t('common.required'), t('collection.priceRequired')); return; }
    if (!numInstallments || parseInt(numInstallments) <= 0) { Alert.alert(t('common.required'), t('collection.installmentsRequired')); return; }
    if (!id) return;
    const recurrence = buildRecurrence();
    if (!recurrence) return;
    setSaving(true);
    try {
      await updateCollection(id, {
        productName: productName.trim(), totalPrice: parseFloat(totalPrice),
        conversionRate: parseFloat(conversionRate) || 1,
        numInstallments: parseInt(numInstallments),
        recurrence, startDate,
        installmentAmount: installmentAmount ? parseFloat(installmentAmount) : null,
      });
      Alert.alert(t('common.success'), t('collection.updated'), [{ text: t('common.done'), onPress: () => router.back() }]);
    } catch { Alert.alert(t('common.error'), t('collection.updateFailed')); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('common.loading')}</Text></View>;

  const weekLabels = [t('collection.recurrenceWeekDay_0'), t('collection.recurrenceWeekDay_1'), t('collection.recurrenceWeekDay_2'), t('collection.recurrenceWeekDay_3'), t('collection.recurrenceWeekDay_4'), t('collection.recurrenceWeekDay_5'), t('collection.recurrenceWeekDay_6')];
  const weekNames = [t('collection.recurrenceWeek_0'), t('collection.recurrenceWeek_1'), t('collection.recurrenceWeek_2'), t('collection.recurrenceWeek_3'), t('collection.recurrenceWeek_4')];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}><Text style={styles.label}>{t('collection.productName')}</Text><TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="e.g. Web Development" placeholderTextColor={colors.textTertiary} /></View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.totalPrice')}</Text><TextInput style={styles.input} value={totalPrice} onChangeText={setTotalPrice} placeholder="0.00" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" /></View>
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}><Text style={styles.label}>{t('collection.installments')}</Text><TextInput style={styles.input} value={numInstallments} onChangeText={setNumInstallments} placeholder="12" placeholderTextColor={colors.textTertiary} keyboardType="number-pad" /></View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('collection.recurrenceType')}</Text>
          <View style={styles.segmentRow}>
            {(['monthly', 'weekly', 'monthly_weekday'] as const).map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.segment, recurrenceType === type && styles.segmentActive]}
                onPress={() => setRecurrenceType(type)}
              >
                <Text style={[styles.segmentText, recurrenceType === type && styles.segmentTextActive]}>
                  {type === 'monthly' ? t('collection.recurrenceMonthly') : type === 'weekly' ? t('collection.recurrenceWeekly') : t('collection.recurrenceMonthlyWeekday')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {recurrenceType === 'monthly' && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('collection.recurrenceDaysLabel')}</Text>
            <TextInput style={styles.input} value={monthDays} onChangeText={setMonthDays} placeholder="1, 15" placeholderTextColor={colors.textTertiary} />
            <Text style={styles.hint}>{t('collection.recurrenceDaysHint')}</Text>
          </View>
        )}

        {recurrenceType === 'weekly' && (
          <View style={styles.field}>
            <Text style={styles.label}>{t('collection.recurrenceWeekDaysLabel')}</Text>
            <View style={styles.chipRow}>
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, weekDay === d && styles.chipActive]}
                  onPress={() => setWeekDay(d)}
                >
                  <Text style={[styles.chipText, weekDay === d && styles.chipTextActive]}>{weekLabels[d]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {recurrenceType === 'monthly_weekday' && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>{t('collection.recurrenceWeekLabel')}</Text>
              <View style={styles.weekRow}>
                {[0, 1, 2, 3, 4].map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.weekChip, monthWeekday.week === w && styles.weekChipActive]}
                    onPress={() => setMonthWeekday(prev => ({ ...prev, week: w }))}
                  >
                    <Text style={[styles.chipText, monthWeekday.week === w && styles.chipTextActive]}>{weekNames[w]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('collection.recurrenceWeekDaysLabel')}</Text>
              <View style={styles.chipRow}>
                {[0, 1, 2, 3, 4, 5, 6].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, monthWeekday.day === d && styles.chipActive]}
                    onPress={() => setMonthWeekday(prev => ({ ...prev, day: d }))}
                  >
                    <Text style={[styles.chipText, monthWeekday.day === d && styles.chipTextActive]}>{weekLabels[d]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.field}><Text style={styles.label}>{t('collection.installmentAmount')}</Text><TextInput style={styles.input} value={installmentAmount} onChangeText={setInstallmentAmount} placeholder={t('collection.installmentAmountPlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" /><Text style={styles.hint}>{t('collection.installmentAmountHint')}</Text></View>
        <View style={styles.field}><Text style={styles.label}>{t('collection.conversionRate')}</Text><TextInput style={styles.input} value={conversionRate} onChangeText={setConversionRate} placeholder="1" placeholderTextColor={colors.textTertiary} keyboardType="decimal-pad" /><Text style={styles.hint}>{t('collection.conversionRateHint')}</Text></View>
        <DatePickerField label={t('collection.startDate')} value={startDate} onChange={setStartDate} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.saving') : t('common.update')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
