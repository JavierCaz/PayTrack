import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ClientCard from '../../components/ClientCard';
import EmptyState from '../../components/EmptyState';
import FilterChips from '../../components/FilterChips';
import LoadingScreen from '../../components/LoadingScreen';
import SearchBar from '../../components/SearchBar';
import { useTranslation } from '../../src/i18n';
import { useClientStore } from '../../src/stores/clientStore';
import { getSetting } from '../../src/services/settingsService';
import { useTheme } from '../../src/theme';

export default function ClientsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { clients, loading, searchQuery, setSearchQuery, filterStatus, setFilterStatus, loadClients, resetSearchFilter } = useClientStore();

  const insets = useSafeAreaInsets();
  const filterOptions = useMemo(() => [
    { label: t('clients.filterAll'), value: 'all' },
    { label: t('clients.filterPending'), value: 'pending' },
    { label: t('clients.filterActive'), value: 'active' },
    { label: t('clients.filterSettled'), value: 'settled' },
    { label: t('clients.filterBlacklist'), value: 'blacklist' },
  ], [t]);
  const [refreshing, setRefreshing] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');

  useFocusEffect(useCallback(() => {
    loadClients();
    getSetting('sms_message').then(msg => { if (msg) setSmsMessage(msg); else setSmsMessage(''); });
    return () => { resetSearchFilter(); };
  }, [loadClients, resetSearchFilter]));

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fabBg, justifyContent: 'center', alignItems: 'center', shadowColor: colors.fabBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  }), [colors]);

  const onRefresh = async () => { setRefreshing(true); await loadClients(); setRefreshing(false); };

  const handleSendSms = useCallback((name: string) => {
    const firstName = name.split(' ')[0];
    const message = smsMessage || t('clients.smsMessage');
    Share.share({ message: message.replace(/\{name\}/g, firstName) });
  }, [t, smsMessage]);

  return (
    <View style={styles.container}>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('clients.searchPlaceholder')} />
      <FilterChips options={filterOptions} selected={filterStatus} onSelect={setFilterStatus} />
      {loading && clients.length === 0 ? <LoadingScreen /> : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClientCard client={item} totalCollections={item.totalCollections} collectionStatus={item.collectionStatus} onPress={() => router.push(`/clients/${item.id}`)} onSendSms={filterStatus === 'pending' ? () => handleSendSms(item.name) : undefined} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title={t('clients.noClients')} subtitle={t('clients.noClientsDesc')} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={clients.length === 0 ? { flex: 1 } : { paddingVertical: 8, paddingBottom: insets.bottom + 80 }}
        />
      )}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => router.push('/clients/new')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
