import { create } from 'zustand';

interface UIState {
  isInitialized: boolean;
  setInitialized: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isInitialized: false,
  setInitialized: () => set({ isInitialized: true }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),
}));
