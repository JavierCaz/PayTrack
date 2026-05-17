import { create } from 'zustand';
import { Client } from '../types';
import * as clientService from '../services/clientService';

interface ClientState {
  clients: clientService.ClientWithTotal[];
  allClients: clientService.ClientWithTotal[];
  loading: boolean;
  searchQuery: string;
  filterStatus: string;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: string) => void;
  loadClients: () => Promise<void>;
  addClient: (data: { name: string; phone?: string; email?: string; notes?: string; defaultRecurrence?: import('../types').RecurrenceConfig | null }) => Promise<string>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  blacklistClient: (id: string, note: string) => Promise<void>;
  unblacklistClient: (id: string) => Promise<void>;
  getClient: (id: string) => Client | undefined;
}

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function applyFilter(allClients: clientService.ClientWithTotal[], filterStatus: string): clientService.ClientWithTotal[] {
  if (filterStatus === 'all') return allClients;
  if (filterStatus === 'blacklist') return allClients.filter(c => c.blacklisted);
  if (filterStatus === 'pending') return allClients.filter(c => c.isPending && !c.blacklisted);
  return allClients.filter(c => c.collectionStatus === filterStatus && !c.blacklisted);
}

function applySearch(clients: clientService.ClientWithTotal[], searchQuery: string): clientService.ClientWithTotal[] {
  if (!searchQuery) return clients;
  const normalizedQuery = normalizeText(searchQuery.toLowerCase());
  return clients.filter(c => normalizeText(c.name.toLowerCase()).includes(normalizedQuery));
}

export const useClientStore = create<ClientState>((set, get) => {
  let loadGeneration = 0;

  return {
  clients: [],
  allClients: [],
  loading: false,
  searchQuery: '',
  filterStatus: 'all',

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().loadClients();
  },

  setFilterStatus: (status) => {
    set({ filterStatus: status });
    const { allClients } = get();
    set({ clients: applyFilter(allClients, status) });
  },

  loadClients: async () => {
    const generation = ++loadGeneration;
    set({ loading: true });
    try {
      const { searchQuery, filterStatus } = get();
      const allClients = await clientService.getClients();
      if (generation !== loadGeneration) return;
      const searched = applySearch(allClients, searchQuery);
      set({ allClients, clients: applyFilter(searched, filterStatus), loading: false });
    } catch (error) {
      console.error('Failed to load clients:', error);
      if (generation === loadGeneration) set({ loading: false });
    }
  },

  addClient: async (data) => {
    const id = await clientService.createClient(data);
    await get().loadClients();
    return id;
  },

  updateClient: async (id, data) => {
    await clientService.updateClient(id, data);
    await get().loadClients();
  },

  deleteClient: async (id) => {
    await clientService.deleteClient(id);
    await get().loadClients();
  },

  blacklistClient: async (id, note) => {
    await clientService.blacklistClient(id, note);
    await get().loadClients();
  },

  unblacklistClient: async (id) => {
    await clientService.unblacklistClient(id);
    await get().loadClients();
  },

  getClient: (id) => {
    return get().clients.find(c => c.id === id);
  },
};
});
