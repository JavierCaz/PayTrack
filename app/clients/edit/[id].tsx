import { useMemo, useState, useEffect  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClientStore } from '../../../src/stores/clientStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RecurrenceType, RecurrenceConfig } from '../../../src/types';

export default function EditClientScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clients, updateClient } = useClientStore();
  const client = clients.find(c => c.id === id);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    hint: { fontSize: 12, color: colors.textTertiary, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    segmentRow: { flexDirection: 'row', gap: 8 },
    segment: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    segmentTextActive: { color: '#FFFFFF' },
    chipRow: { flexDirection: 'row', gap: 6 },
    chip: { width: 42, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, justifyContent: 'center', alignItems: 'center' },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    chipTextActive: { color: '#FFFFFF' },
    weekRow: { flexDirection: 'row', gap: 6 },
    weekChip: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
    weekChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('monthly');
  const [monthDays, setMonthDays] = useState('1,15');
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [monthWeekday, setMonthWeekday] = useState<{ week: number; day: number }>({ week: 0, day: 1 });

  useEffect(() => {
    if (client) {
      setName(client.name);
      setPhone(client.phone);
      setEmail(client.email);
      setNotes(client.notes);
      const rec = client.defaultRecurrence;
      if (rec) {
        setRecurrenceType(rec.type);
        if (rec.type === 'monthly') setMonthDays(rec.monthDays.length > 0 ? rec.monthDays.join(',') : '1,15');
        if (rec.type === 'weekly') setWeekDays(rec.weekDays);
        if (rec.type === 'monthly_weekday' && rec.monthWeekday.length > 0) setMonthWeekday(rec.monthWeekday[0]);
      }
    }
  }, [client]);

  const toggleWeekDay = (d: number) => {
    setWeekDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const buildDefaultRecurrence = (): RecurrenceConfig => {
    if (recurrenceType === 'monthly') {
      const days = monthDays.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0 && d <= 31);
      return { type: 'monthly', monthDays: days.length > 0 ? days : [1, 15], weekDays: [], monthWeekday: [] };
    }
    if (recurrenceType === 'weekly') {
      if (weekDays.length === 0) return { type: 'monthly', monthDays: [1, 15], weekDays: [], monthWeekday: [] };
      return { type: 'weekly', monthDays: [], weekDays, monthWeekday: [] };
    }
    return { type: 'monthly_weekday', monthDays: [], weekDays: [], monthWeekday: [monthWeekday] };
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common.required'), t('clients.nameRequired')); return; }
    if (!id) return;
    setSaving(true);
    try { await updateClient(id, { name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(), defaultRecurrence: buildDefaultRecurrence() }); router.back(); }
    catch { Alert.alert(t('common.error'), t('clients.updateFailed')); }
    finally { setSaving(false); }
  };

  if (!client) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('clients.notFound')}</Text></View>;

  const weekLabels = [t('collection.recurrenceWeekDay_0'), t('collection.recurrenceWeekDay_1'), t('collection.recurrenceWeekDay_2'), t('collection.recurrenceWeekDay_3'), t('collection.recurrenceWeekDay_4'), t('collection.recurrenceWeekDay_5'), t('collection.recurrenceWeekDay_6')];
  const weekNames = [t('collection.recurrenceWeek_0'), t('collection.recurrenceWeek_1'), t('collection.recurrenceWeek_2'), t('collection.recurrenceWeek_3'), t('collection.recurrenceWeek_4')];

  return (
    <KeyboardAvoidingView style={{flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}><Text style={styles.label}>{t('common.name')} *</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Client name" placeholderTextColor={colors.textTertiary} /></View>
        <View style={styles.field}><Text style={styles.label}>{t('common.phone')}</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" /></View>
        <View style={styles.field}><Text style={styles.label}>{t('common.email')}</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="client@example.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" /></View>
        <View style={styles.field}><Text style={styles.label}>{t('common.notes')}</Text><TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} /></View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('clients.defaultRecurrence')}</Text>
          <Text style={styles.hint}>{t('clients.defaultRecurrenceHint')}</Text>
          <View style={[styles.segmentRow, { marginTop: 8 }]}>
            {(['monthly', 'weekly', 'monthly_weekday'] as const).map(type => (
              <TouchableOpacity key={type} style={[styles.segment, recurrenceType === type && styles.segmentActive]} onPress={() => setRecurrenceType(type)}>
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
                <TouchableOpacity key={d} style={[styles.chip, weekDays.includes(d) && styles.chipActive]} onPress={() => toggleWeekDay(d)}>
                  <Text style={[styles.chipText, weekDays.includes(d) && styles.chipTextActive]}>{weekLabels[d]}</Text>
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
                  <TouchableOpacity key={w} style={[styles.weekChip, monthWeekday.week === w && styles.weekChipActive]} onPress={() => setMonthWeekday(prev => ({ ...prev, week: w }))}>
                    <Text style={[styles.chipText, monthWeekday.week === w && styles.chipTextActive]}>{weekNames[w]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('collection.recurrenceWeekDaysLabel')}</Text>
              <View style={styles.chipRow}>
                {[0, 1, 2, 3, 4, 5, 6].map(d => (
                  <TouchableOpacity key={d} style={[styles.chip, monthWeekday.day === d && styles.chipActive]} onPress={() => setMonthWeekday(prev => ({ ...prev, day: d }))}>
                    <Text style={[styles.chipText, monthWeekday.day === d && styles.chipTextActive]}>{weekLabels[d]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.saving') : t('common.update')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
