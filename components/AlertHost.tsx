import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '../src/theme';
import { useTranslation } from '../src/i18n';
import { useAlertStore, type AlertButton } from '../src/stores/alertStore';

export default function AlertHost() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const current = useAlertStore((s) => s.queue[0]);
  const dismiss = useAlertStore((s) => s.dismiss);

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
    content: { width: '100%', maxWidth: 400, maxHeight: '80%', backgroundColor: colors.card, borderRadius: 16, padding: 24 },
    title: { fontSize: 18, fontWeight: '700', color: colors.text },
    message: { fontSize: 15, color: colors.textSecondary, lineHeight: 21, marginTop: 8 },
    actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12, marginTop: 20 },
    actionsColumn: { gap: 8, marginTop: 20 },
    button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    buttonText: { fontSize: 15, fontWeight: '600' },
  }), [colors]);

  if (!current) return null;

  const buttons: AlertButton[] = current.buttons?.length ? current.buttons : [{ text: t('common.ok') }];
  // Primary actions on the right (row) / top (column); cancel goes to the left / bottom.
  const ordered = [...buttons.filter((b) => b.style === 'cancel'), ...buttons.filter((b) => b.style !== 'cancel')];
  const stacked = ordered.length > 2;
  if (stacked) ordered.reverse();

  const press = (button?: AlertButton) => {
    dismiss(current.id);
    button?.onPress?.();
  };

  // Android back: behave like cancel, or like the only button when there is just one.
  const onRequestClose = () => {
    const cancel = buttons.find((b) => b.style === 'cancel');
    if (cancel) press(cancel);
    else if (buttons.length === 1) press(buttons[0]);
  };

  const buttonColors = (style: AlertButton['style']) => {
    if (style === 'cancel') return { bg: 'transparent', fg: colors.textSecondary };
    if (style === 'destructive') return { bg: colors.danger, fg: colors.white };
    return { bg: colors.primary, fg: colors.white };
  };

  return (
    <Modal key={current.id} visible transparent animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{current.title}</Text>
          {!!current.message && (
            <ScrollView bounces={false}>
              <Text style={styles.message}>{current.message}</Text>
            </ScrollView>
          )}
          <View style={stacked ? styles.actionsColumn : styles.actionsRow}>
            {ordered.map((button, i) => {
              const { bg, fg } = buttonColors(button.style);
              return (
                <TouchableOpacity key={i} style={[styles.button, { backgroundColor: bg }]} onPress={() => press(button)}>
                  <Text style={[styles.buttonText, { color: fg }]}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
