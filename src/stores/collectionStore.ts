import { create } from 'zustand';
import { Collection, type RecurrenceConfig } from '../types';
import * as collectionService from '../services/collectionService';

interface CollectionState {
  collections: collectionService.CollectionWithMeta[];
  loading: boolean;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  loadCollections: () => Promise<void>;
  loadClientCollections: (clientId: string) => Promise<Collection[]>;
  loadClientCollectionsWithMeta: (clientId: string) => Promise<collectionService.CollectionWithMeta[]>;
  getCollection: (id: string) => Promise<collectionService.CollectionWithMeta | null>;
  createCollection: (data: {
    clientId: string;
    productName: string;
    totalPrice: number;
    numInstallments: number;
    recurrence: RecurrenceConfig;
    startDate: string;
    installmentAmount?: number | null;
  }) => Promise<string>;
  updateCollection: (id: string, data: {
    productName?: string;
    totalPrice?: number;
    numInstallments?: number;
    recurrence?: RecurrenceConfig;
    startDate?: string;
    installmentAmount?: number | null;
    status?: string;
  }) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  loading: false,
  filterStatus: 'all',

  setFilterStatus: (status) => set({ filterStatus: status }),

  loadCollections: async () => {
    set({ loading: true });
    try {
      const collections = await collectionService.getCollectionsWithClient();
      const { filterStatus } = get();
      const filtered = filterStatus === 'all'
        ? collections
        : collections.filter(c => c.status === filterStatus);
      set({ collections: filtered, loading: false });
    } catch (error) {
      console.error('Failed to load collections:', error);
      set({ loading: false });
    }
  },

  loadClientCollections: async (clientId) => {
    return collectionService.getCollections(clientId);
  },

  loadClientCollectionsWithMeta: async (clientId) => {
    return collectionService.getClientCollectionsWithMeta(clientId);
  },

  getCollection: async (id) => {
    return collectionService.getCollectionWithMeta(id);
  },

  createCollection: async (data) => {
    const id = await collectionService.createCollection(data);
    return id;
  },

  updateCollection: async (id, data) => {
    await collectionService.updateCollection(id, data);
  },

  deleteCollection: async (id) => {
    await collectionService.deleteCollection(id);
  },
}));
