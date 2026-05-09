import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../src/theme';

interface FilterChipsProps {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { marginVertical: 4, flexGrow: 0, flexShrink: 0, height: 32 },
    content: { paddingHorizontal: 16, gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 14, lineHeight: 18, color: colors.chipText, fontWeight: '500' },
    chipTextSelected: { color: '#FFFFFF' },
  }), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.chip, selected === option.value && styles.chipSelected]}
          onPress={() => onSelect(option.value)}
        >
          <Text style={[styles.chipText, selected === option.value && styles.chipTextSelected]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
