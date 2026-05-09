import { useMemo, useState, useEffect  } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClientStore } from '../../../src/stores/clientStore';
import { useTranslation } from '../../../src/i18n';
import { useTheme } from '../../../src/theme';

export default function EditClientScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clients, updateClient } = useClientStore();
  const client = clients.find(c => c.id === id);

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

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) { setName(client.name); setPhone(client.phone); setEmail(client.email); setNotes(client.notes); }
  }, [client]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('common.required'), t('clients.nameRequired')); return; }
    if (!id) return;
    setSaving(true);
    try { await updateClient(id, { name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim() }); router.back(); }
    catch { Alert.alert(t('common.error'), t('clients.updateFailed')); }
    finally { setSaving(false); }
  };

  if (!client) return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><Text style={{color: colors.textSecondary }}>{t('clients.notFound')}</Text></View>;

  return (
    <KeyboardAvoidingView style={{flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.field}><Text style={styles.label}>{t('common.name')} *</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Client name" placeholderTextColor={colors.textTertiary} /></View>
        <View style={styles.field}><Text style={styles.label}>{t('common.phone')}</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+1 (555) 000-0000" placeholderTextColor={colors.textTertiary} keyboardType="phone-pad" /></View>
        <View style={styles.field}><Text style={styles.label}>{t('common.email')}</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="client@example.com" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" /></View>
        <View style={styles.field}><Text style={styles.label}>{t('common.notes')}</Text><TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} /></View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" /><Text style={styles.saveText}>{saving ? t('common.saving') : t('common.update')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
