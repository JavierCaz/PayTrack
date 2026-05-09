import { Stack } from 'expo-router';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LocaleProvider, useTranslation } from '../src/i18n';
import type { Locale } from '../src/i18n';
import { ThemeProvider, useTheme } from '../src/theme';
import { initDatabase, startDbKeepAlive, stopDbKeepAlive } from '../src/database/database';
import { getSetting, setSetting } from '../src/services/settingsService';

function RootLayoutInner() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const mounted = useRef(true);

  const styles = useMemo(() => StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 32 },
    loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
    errorTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 16 },
    errorDetail: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
    retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 24, gap: 8 },
    retryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  }), [colors]);

  const initialize = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    const timeout = setTimeout(() => {
      if (mounted.current) {
        setErrorMsg('Database initialization timed out.');
        setState('error');
      }
    }, 15000);

    try {
      await initDatabase();
      clearTimeout(timeout);
      if (mounted.current) {
        startDbKeepAlive();
        setState('ready');
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (mounted.current) {
        setErrorMsg(err?.message || String(err) || 'An unknown error occurred.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    initialize();
    return () => {
      mounted.current = false;
      stopDbKeepAlive();
    };
  }, [initialize]);

  const headerTint = colors.primary;

  const loadingText = t('common.initializing');
  const errorTitle = t('errors.somethingWrong');
  const retryLabel = t('common.retry');

  if (state === 'loading') {
    return (
      <View style={styles.centered}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.centered}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
        <Text style={styles.errorTitle}>{errorTitle}</Text>
        <Text style={styles.errorDetail}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initialize}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="clients/new" options={{ headerShown: true, headerTitle: t('clients.newTitle'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="clients/[id]" options={{ headerShown: true, headerTitle: t('clients.title'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="clients/edit/[id]" options={{ headerShown: true, headerTitle: t('clients.editTitle'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="collections/[id]" options={{ headerShown: true, headerTitle: t('collection.detailTitle'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="collections/edit/[id]" options={{ headerShown: true, headerTitle: t('collection.editTitle'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="collections/new/[clientId]" options={{ headerShown: true, headerTitle: t('collection.newTitle'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="payments/new/[collectionId]" options={{ headerShown: true, headerTitle: t('payment.title'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="payments/edit/[paymentId]" options={{ headerShown: true, headerTitle: t('payment.editTitle'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="receipts/[paymentId]" options={{ headerShown: true, headerTitle: t('receipt.title'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
        <Stack.Screen name="settings" options={{ headerShown: true, headerTitle: t('settings.title'), headerTintColor: headerTint, headerStyle: { backgroundColor: colors.headerBg } }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, setLoaded] = useState(false);
  const [initialLocale, setInitialLocale] = useState<Locale>('en');
  const [initialDark, setInitialDark] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Initialize DB first, then read settings — avoids a race where getSetting
    // opens the SQLite connection before WAL mode / schema setup runs.
    initDatabase()
      .catch(() => {})
      .then(() => Promise.all([getSetting('locale'), getSetting('theme')]))
      .then(([locale, theme]) => {
        if (locale === 'en' || locale === 'es') setInitialLocale(locale as Locale);
        if (theme === 'dark') setInitialDark(true);
        else if (theme === 'light') setInitialDark(false);
        else setInitialDark(undefined);
      }).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  const handleLocaleChange = useCallback(async (locale: Locale) => {
    await setSetting('locale', locale);
  }, []);

  const handleThemeChange = useCallback(async (isDark: boolean) => {
    await setSetting('theme', isDark ? 'dark' : 'light');
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <LocaleProvider onLocaleChange={handleLocaleChange} initialLocale={initialLocale}>
      <ThemeProvider onThemeChange={handleThemeChange} initialDark={initialDark}>
        <RootLayoutInner />
      </ThemeProvider>
    </LocaleProvider>
  );
}
