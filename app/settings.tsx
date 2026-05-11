import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, Switch, ActivityIndicator, Modal } from 'react-native';
import { useTranslation } from '../src/i18n';
import { exportBackup, importBackup } from '../src/services/backupService';
import { useTheme } from '../src/theme';

export default function SettingsScreen() {
  const { t, locale, setLocale } = useTranslation();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const { colors, isDark, setDarkMode } = useTheme();
  const [importing, setImporting] = useState(false);

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
    <View style={styles.container}>
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
      <Modal visible={importing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.overlayBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.overlayText}>{t('common.loading')}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
