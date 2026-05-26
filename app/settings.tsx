import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, Switch, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { useTranslation } from '../src/i18n';
import { exportBackup, importBackup } from '../src/services/backupService';
import { getSetting, setSetting } from '../src/services/settingsService';
import { useTheme } from '../src/theme';

export default function SettingsScreen() {
  const { t, locale, setLocale } = useTranslation();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const { colors, isDark, setDarkMode } = useTheme();
  const [importing, setImporting] = useState(false);
  const [interestPercent, setInterestPercent] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [defaultsModalVisible, setDefaultsModalVisible] = useState(false);
  const [modalInterest, setModalInterest] = useState('');
  const [modalSms, setModalSms] = useState('');

  useEffect(() => {
    (async () => {
      const val = await getSetting('interest_percentage');
      setInterestPercent(val ? String(parseFloat(val) * 100) : '35');
      const msg = await getSetting('sms_message');
      if (msg) setSmsMessage(msg);
    })();
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 20, marginBottom: 8 },
    option: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, marginHorizontal: 16, marginVertical: 3, borderRadius: 12, gap: 14 },
    iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    optionInfo: { flex: 1 },
    optionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    optionDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    toggleLabel: { fontSize: 16, fontWeight: '600', color: colors.text },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
    overlayBox: { backgroundColor: colors.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, minWidth: 160 },
    overlayText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  }), [colors]);

  const handleExport = async () => { await exportBackup(); };
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImporting(true);
        await importBackup(result.assets[0].uri);
        setImporting(false);
      }
    } catch (e) { setImporting(false); console.error('Import failed:', e); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.option}>
          <Text style={[styles.toggleLabel, { color: locale === 'en' ? colors.primary : colors.textTertiary, fontWeight: locale === 'en' ? '700' : '400' }]}>{t('settings.english')}</Text>
          <Switch
            value={locale === 'es'}
            onValueChange={(val) => setLocale(val ? 'es' : 'en')}
            trackColor={{ false: colors.chipBg, true: colors.primary + '60' }}
            thumbColor={locale === 'es' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.toggleLabel, { color: locale === 'es' ? colors.primary : colors.textTertiary, fontWeight: locale === 'es' ? '700' : '400' }]}>{t('settings.spanish')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
        <View style={styles.option}>
          <Text style={[styles.toggleLabel, { color: !isDark ? colors.primary : colors.textTertiary, fontWeight: !isDark ? '700' : '400' }]}>{t('settings.lightMode')}</Text>
          <Switch
            value={isDark}
            onValueChange={setDarkMode}
            trackColor={{ false: colors.chipBg, true: colors.primary + '60' }}
            thumbColor={isDark ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.toggleLabel, { color: isDark ? colors.primary : colors.textTertiary, fontWeight: isDark ? '700' : '400' }]}>{t('settings.darkMode')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.defaultsTitle')}</Text>
        <TouchableOpacity style={styles.option} onPress={() => {
          setModalInterest(interestPercent);
          setModalSms(smsMessage);
          setDefaultsModalVisible(true);
        }}>
          <View style={[styles.iconBox, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="options-outline" size={24} color={colors.warning} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{t('settings.modifyDefaults')}</Text>
            <Text style={styles.optionDesc}>{t('settings.modifyDefaultsDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.dataManagement')}</Text>
        <TouchableOpacity style={styles.option} onPress={handleExport}>
          <View style={[styles.iconBox, { backgroundColor: colors.infoBg }]}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{t('settings.exportBackup')}</Text>
            <Text style={styles.optionDesc}>{t('settings.exportDesc')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={handleImport}>
          <View style={[styles.iconBox, { backgroundColor: colors.warningBg }]}>
            <Ionicons name="cloud-download-outline" size={24} color={colors.warning} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>{t('settings.importBackup')}</Text>
            <Text style={styles.optionDesc}>{t('settings.importDesc')}</Text>
          </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.eraseAll')}</Text>
          <TouchableOpacity style={styles.option} onPress={() => {
            Alert.alert(t('settings.eraseAll'), t('settings.eraseConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('common.delete'), style: 'destructive', onPress: async () => {
                try {
                  const { clearAllData } = await import('../src/services/backupService');
                  await clearAllData();
                  Alert.alert(t('common.success'), t('settings.eraseDone'));
                } catch (e) { Alert.alert(t('common.error'), String(e)); }
              }},
            ]);
          }}>
            <View style={[styles.iconBox, { backgroundColor: colors.dangerBg }]}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.danger }]}>{t('settings.eraseAll')}</Text>
              <Text style={styles.optionDesc}>{t('settings.eraseDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.option}>
          <View style={[styles.iconBox, { backgroundColor: colors.chipBg }]}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textTertiary} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>PayTrack</Text>
            <Text style={styles.optionDesc}>{t('settings.version', { version: appVersion })}</Text>
          </View>
        </View>
      </View>
      <Modal visible={defaultsModalVisible} transparent animationType="fade" onRequestClose={() => setDefaultsModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, marginHorizontal: 24, width: '85%', maxWidth: 400 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 }}>{t('settings.modifyDefaults')}</Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{t('settings.interestLabel')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: colors.chipBg,
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: '700',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  textAlign: 'center',
                }}
                value={modalInterest}
                onChangeText={(val) => setModalInterest(val.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder="35"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>%</Text>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>{t('settings.smsMessage')}</Text>
            <TextInput
              style={{
                backgroundColor: colors.chipBg,
                color: colors.text,
                fontSize: 15,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              value={modalSms}
              onChangeText={setModalSms}
              multiline
              placeholder={t('clients.smsMessage')}
              placeholderTextColor={colors.textTertiary}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.chipBg, alignItems: 'center' }}
                onPress={() => setDefaultsModalVisible(false)}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' }}
                onPress={async () => {
                  const num = parseFloat(modalInterest);
                  if (!isNaN(num) && num >= 0) {
                    const decimal = (num / 100).toFixed(4);
                    await setSetting('interest_percentage', decimal);
                    setInterestPercent(modalInterest);
                  }
                  await setSetting('sms_message', modalSms.trim());
                  setSmsMessage(modalSms.trim());
                  setDefaultsModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={importing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>{t('common.loading')}</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
