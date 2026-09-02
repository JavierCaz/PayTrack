import { create } from 'zustand';
import { getSetting, setSetting } from '../services/settingsService';

interface UIState {
  isInitialized: boolean;
  setInitialized: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  privacyMode: boolean;
  hydratePrivacyMode: () => Promise<void>;
  togglePrivacyMode: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isInitialized: false,
  setInitialized: () => set({ isInitialized: true }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  privacyMode: false,
  hydratePrivacyMode: async () => {
    try {
      const value = await getSetting('privacy_mode');
      set({ privacyMode: value === '1' });
    } catch (error) {
      console.error('Failed to load privacy mode:', error);
    }
  },
  togglePrivacyMode: () => {
    const next = !get().privacyMode;
    set({ privacyMode: next });
    setSetting('privacy_mode', next ? '1' : '0').catch((error) => {
      console.error('Failed to save privacy mode:', error);
    });
  },
}));
