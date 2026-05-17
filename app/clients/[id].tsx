import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CollectionCard from '../../components/CollectionCard';
import EmptyState from '../../components/EmptyState';
import LoadingScreen from '../../components/LoadingScreen';
import { formatCurrency } from '../../src/utils/formatters';
import SearchBar from '../../components/SearchBar';
import FilterChips from '../../components/FilterChips';
import { useTranslation } from '../../src/i18n';
import { useClientStore } from '../../src/stores/clientStore';
import { useCollectionStore } from '../../src/stores/collectionStore';
import { useTheme } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClientDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clients, allClients, deleteClient, blacklistClient, unblacklistClient } = useClientStore();
  const { loadClientCollectionsWithMeta } = useCollectionStore();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [blacklistModalVisible, setBlacklistModalVisible] = useState(false);
  const [blacklistNote, setBlacklistNote] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    profile: { alignItems: 'center', padding: 24, backgroundColor: colors.card, marginBottom: 8 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.avatarBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 32, fontWeight: '700', color: colors.primary },
    name: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
    warningBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8, marginHorizontal: 10 },
    warningText: { fontSize: 13, fontWeight: '600', color: colors.danger, flex: 1, marginLeft: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    detail: { fontSize: 15, color: colors.textSecondary },
    notes: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', marginTop: 12, textAlign: 'center', paddingHorizontal: 20 },
    actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, padding: 12, backgroundColor: colors.card, marginBottom: 8 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background, gap: 6 },
    actionText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    section: { padding: 20, paddingBottom: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '85%', backgroundColor: colors.card, borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
    modalInput: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, backgroundColor: colors.inputBg, minHeight: 80, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
    modalCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    modalConfirm: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.danger },
    modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fabBg, justifyContent: 'center', alignItems: 'center', shadowColor: colors.fabBg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    summary: { width: '100%', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.inputBorder },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    summaryLabel: { fontSize: 14, color: colors.textSecondary },
    summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    summaryTotalValue: { fontSize: 15, fontWeight: '700', color: colors.text },
    summaryDivider: { height: 1, backgroundColor: colors.inputBorder, marginVertical: 4 },
  }), [colors]);

  const client = allClients.find(c => c.id === id) || clients.find(c => c.id === id);
  const filteredCollections = useMemo(() => {
    let result = collections;
    if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus);
    if (searchQuery) result = result.filter(c => c.productName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(searchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
    return result;
  }, [collections, searchQuery, filterStatus]);

  const totals = useMemo(() => {
    const totalCollectionsAmount = collections.reduce((sum, c) => sum + c.totalPrice, 0);
    const totalPaid = collections.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalRemaining = collections.reduce((sum, c) => sum + c.remainingBalance, 0);
    return { totalCollectionsAmount, totalPaid, totalRemaining };
  }, [collections]);
  const loadData = useCallback(async () => {
    if (!id) return;
    setCollections(await loadClientCollectionsWithMeta(id));
    setLoading(false);
  }, [id, loadClientCollectionsWithMeta]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleBlacklist = async () => {
    if (!id || !blacklistNote.trim()) return;
    await blacklistClient(id, blacklistNote.trim());
    setBlacklistModalVisible(false);
    setBlacklistNote('');
  };

  const handleDelete = () => {
    Alert.alert(t('clients.deleteConfirm'), t('clients.deleteWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { if (!id) return; await deleteClient(id); router.back(); } },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!client) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><EmptyState icon="alert-circle" title={t('clients.notFound')} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.name}>{client.name}</Text>
          {client.blacklisted && client.blacklistNote ? (
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <Text style={styles.warningText}>{t('clients.blacklistedWarning', { note: client.blacklistNote })}</Text>
            </View>
          ) : null}
          {client.phone && <View style={styles.row}><Ionicons name="call-outline" size={16} color={colors.textSecondary} /><Text style={styles.detail}>{client.phone}</Text></View>}
          {client.email && <View style={styles.row}><Ionicons name="mail-outline" size={16} color={colors.textSecondary} /><Text style={styles.detail}>{client.email}</Text></View>}
          {client.notes ? <Text style={styles.notes}>{client.notes}</Text> : null}
          {collections.length > 0 && (
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('clients.totalPaid')}</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(totals.totalPaid)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('clients.totalRemaining')}</Text>
                <Text style={[styles.summaryValue, { color: colors.danger }]}>{formatCurrency(totals.totalRemaining)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryTotalLabel}>{t('collection.total')}</Text>
                <Text style={styles.summaryTotalValue}>{formatCurrency(totals.totalPaid + totals.totalRemaining)}</Text>
              </View>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/clients/edit/${client.id}`)}>
            <Ionicons name="create-outline" size={20} color={colors.primary} /><Text style={styles.actionText}>{t('clients.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} /><Text style={[styles.actionText, { color: colors.danger }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
          {client.blacklisted ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => unblacklistClient(client.id)}>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} /><Text style={[styles.actionText, { color: colors.success }]}>{t('clients.unblacklist')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={() => setBlacklistModalVisible(true)}>
              <Ionicons name="ban-outline" size={20} color={colors.danger} /><Text style={[styles.actionText, { color: colors.danger }]}>{t('clients.blacklist')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>{t('clients.collections')} ({filteredCollections.length})</Text></View>
        <FilterChips options={[{ label: t('status.all'), value: 'all' }, { label: t('status.active'), value: 'active' }, { label: t('status.completed'), value: 'completed' }]} selected={filterStatus} onSelect={setFilterStatus} />
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('clients.searchCollectionPlaceholder')} />
        {filteredCollections.length === 0
          ? <EmptyState icon="folder-open-outline" title={t('clients.noCollections')} subtitle={t('clients.noCollectionsDesc')} />
          : filteredCollections.map((col) => (
              <CollectionCard key={col.id} productName={col.productName} totalPrice={col.totalPrice} paidAmount={col.paidAmount} remainingBalance={col.remainingBalance} status={col.status} onPress={() => router.push(`/collections/${col.id}`)} />
            ))
        }
        <View style={{height: 40 }} />
      </ScrollView>
      <Modal visible={blacklistModalVisible} transparent animationType="fade" onRequestClose={() => setBlacklistModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('clients.blacklistConfirm')}</Text>
            <TextInput
              style={styles.modalInput}
              value={blacklistNote}
              onChangeText={setBlacklistNote}
              placeholder={t('clients.blacklistNotePlaceholder')}
              placeholderTextColor={colors.textTertiary}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setBlacklistModalVisible(false); setBlacklistNote(''); }}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleBlacklist}>
                <Text style={styles.modalConfirmText}>{t('clients.blacklist')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => router.push(`/collections/new/${client.id}`)}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
