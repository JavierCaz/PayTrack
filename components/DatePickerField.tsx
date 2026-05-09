import { useMemo, useState  } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTheme } from '../src/theme';

interface DatePickerFieldProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
}

export default function DatePickerField({ value, onChange, label }: DatePickerFieldProps) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const date = dayjs(value).isValid() ? dayjs(value).toDate() : new Date();

  const styles = useMemo(() => StyleSheet.create({
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginLeft: 2, marginBottom: 6 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, color: colors.text },
    hint: { fontSize: 12, color: colors.textTertiary, marginLeft: 2, marginTop: 4 },
    dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 12, padding: 14, gap: 10 },
    dateText: { fontSize: 16, color: colors.text, flex: 1 },
  }), [colors]);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) onChange(dayjs(selectedDate).format('YYYY-MM-DD'));
  };

  if (Platform.OS === 'web') {
    return (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textTertiary} />
        <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
      </View>
    );
  }

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.dateButton} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.dateText}>{dayjs(value).format('MMM D, YYYY')}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleChange} />
      )}
    </View>
  );
}
