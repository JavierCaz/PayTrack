import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../src/theme';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    text: { marginTop: 12, fontSize: 16, color: colors.textSecondary },
  }), [colors]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message || ''}</Text>
    </View>
  );
}
