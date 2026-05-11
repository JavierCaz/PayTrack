import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { CollectionStatus } from '../src/services/clientService';
import { useTheme } from '../src/theme';
import { Client } from '../src/types';
import { formatCurrency } from '../src/utils/formatters';

interface ClientCardProps {
  client: Client;
  onPress: () => void;
  totalCollections?: number;
  collectionStatus?: CollectionStatus;
}

export default function ClientCard({ client, onPress, totalCollections = 0, collectionStatus = 'none' }: ClientCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, padding: 16, marginHorizontal: 16, marginVertical: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.avatarBg, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    avatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detail: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    total: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 4 },
    end: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8 },
    statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  }), [colors]);

  const statusColor = collectionStatus === 'settled' ? '#22C55E' : collectionStatus === 'active' ? '#ef9a44' : colors.textTertiary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{client.name}</Text>
        {client.phone ? (
          <View style={styles.row}>
            <Ionicons name="call-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.detail}>{client.phone}</Text>
          </View>
        ) : null}
        <Text style={styles.total}>Total: {formatCurrency(totalCollections)}</Text>
      </View>
      <View style={styles.end}>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      </View>
    </TouchableOpacity>
  );
}
