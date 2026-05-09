import { useMemo, useState  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClientStore } from '../../src/stores/clientStore';
import { useTranslation } from '../../src/i18n';
import { useTheme } from '../../src/theme';

export default function NewClientScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { addClient } = useClientStore();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 16 },
    field: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    footer: { padding: 20, paddingBottom: 32, backgroundColor: colors.background },
    saveButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
    saveText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  }), [colors]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common.required'), t('clients.nameRequired')); return; }
    setSaving(true);
    try { await addClient({ name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim() }); router.back(); }
    catch { Alert.alert(t('common.error'), t('clients.saveFailed')); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('common.name')} *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('common.name')} placeholderTextColor={colors.textTertiary} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('common.phone')}</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('clients.phonePlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('common.email')}</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={t('clients.emailPlaceholder')} placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('common.notes')}</Text>
          <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder={t('common.notes')} placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          <Text style={styles.saveText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
