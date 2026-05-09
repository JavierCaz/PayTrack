import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  const { colors } = useTheme();
  const accent = color || colors.primary;
  const styles = useMemo(() => StyleSheet.create({
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    value: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
    title: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  }), [colors]);

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: accent + '20' }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}
