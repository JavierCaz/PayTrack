import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export const lightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  inputBg: '#FFFFFF',
  inputBorder: '#E5E7EB',
  headerBg: '#FFFFFF',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  avatarBg: '#EEF2FF',
  chipBg: '#F3F4F6',
  chipText: '#6B7280',
  chipSelectedBg: '#4F46E5',
  chipSelectedText: '#FFFFFF',
  infoBg: '#EEF2FF',
  infoText: '#4F46E5',
  warningBg: '#FFFBEB',
  warningText: '#F59E0B',
  dangerBg: '#FEF2F2',
  dangerText: '#EF4444',
  successBg: '#F0FDF4',
  successText: '#10B981',
  progressBg: '#F3F4F6',
  progressFill: '#4F46E5',
  fabBg: '#4F46E5',
  overlay: 'rgba(0,0,0,0.05)',
  statusActive: '#10B981',
  statusCompleted: '#4F46E5',
  statusOverdue: '#EF4444',
  white: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#334155',
  primary: '#818CF8',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  inputBg: '#1E293B',
  inputBorder: '#475569',
  headerBg: '#1E293B',
  tabBarBg: '#1E293B',
  tabBarBorder: '#334155',
  avatarBg: '#312E81',
  chipBg: '#334155',
  chipText: '#94A3B8',
  chipSelectedBg: '#818CF8',
  chipSelectedText: '#FFFFFF',
  infoBg: '#1E1B4B',
  infoText: '#818CF8',
  warningBg: '#451A03',
  warningText: '#FBBF24',
  dangerBg: '#450A0A',
  dangerText: '#F87171',
  successBg: '#052E16',
  successText: '#34D399',
  progressBg: '#334155',
  progressFill: '#818CF8',
  fabBg: '#818CF8',
  overlay: 'rgba(0,0,0,0.3)',
  statusActive: '#34D399',
  statusCompleted: '#818CF8',
  statusOverdue: '#F87171',
  white: '#FFFFFF',
};

type ThemeColors = typeof lightColors;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  onThemeChange?: (isDark: boolean) => Promise<void>;
  initialDark?: boolean;
}

export function ThemeProvider({ children, onThemeChange, initialDark }: ThemeProviderProps) {
  const systemDark = useColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(initialDark ?? systemDark);

  const setDarkMode = useCallback(async (dark: boolean) => {
    setIsDark(dark);
    if (onThemeChange) await onThemeChange(dark);
  }, [onThemeChange]);

  const toggleTheme = useCallback(async () => {
    setIsDark(prev => {
      const next = !prev;
      if (onThemeChange) onThemeChange(next);
      return next;
    });
  }, [onThemeChange]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
