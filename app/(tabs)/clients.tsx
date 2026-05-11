import { View, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useMemo, useCallback, useState  } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ClientCard from '../../components/ClientCard';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import { useClientStore } from '../../src/stores/clientStore';
import { useTranslation } from '../../src/i18n';
import { useTheme } from '../../src/theme';

export default function ClientsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { clients, loading, searchQuery, setSearchQuery, filterStatus, setFilterStatus, loadClients } = useClientStore();

  const filterOptions = useMemo(() => [
    { label: t('clients.filterAll'), value: 'all' },
    { label: t('clients.filterPending'), value: 'pending' },
    { label: t('clients.filterActive'), value: 'active' },
    { label: t('clients.filterSettled'), value: 'settled' },
    { label: t('clients.filterBlacklist'), value: 'blacklist' },
  ], [t]);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fabBg, justifyContent: 'center', alignItems: 'center', shadowColor: colors.fabBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  }), [colors]);

  useFocusEffect(useCallback(() => { loadClients(); }, [loadClients]));

  const onRefresh = async () => { setRefreshing(true); await loadClients(); setRefreshing(false); };

  return (
    <View style={styles.container}>
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('clients.searchPlaceholder')} />
      <FilterChips options={filterOptions} selected={filterStatus} onSelect={setFilterStatus} />
      {loading && clients.length === 0 ? <LoadingScreen /> : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClientCard client={item} totalCollections={item.totalCollections} collectionStatus={item.collectionStatus} onPress={() => router.push(`/clients/${item.id}`)} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title={t('clients.noClients')} subtitle={t('clients.noClientsDesc')} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={clients.length === 0 ? { flex: 1 } : { paddingVertical: 8 }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/clients/new')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
