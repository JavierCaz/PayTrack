import { create } from 'zustand';
import { Payment } from '../types';
import * as paymentService from '../services/paymentService';

interface PaymentState {
  payments: Payment[];
  loading: boolean;
  stats: {
    totalClients: number;
    totalCollections: number;
    totalPayments: number;
    totalPaymentsSum: number;
    totalPaidOut: number;
    totalRemainder: number;
    activeCollections: number;
    completedCollections: number;
    overdueCollections: number;
    totalOutstanding: number;
    monthlyIncome: number;
  } | null;
  loadPayments: (collectionId: string) => Promise<void>;
  getPayment: (id: string) => Promise<any>;
  recordPayment: (collectionId: string, paidAmount: number, paidDate?: string, notes?: string) => Promise<string>;
  updatePayment: (paymentId: string, data: { paidAmount?: number; paidDate?: string; notes?: string; amount?: number }) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  loadDashboardStats: () => Promise<void>;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  payments: [],
  loading: false,
  stats: null,

  loadPayments: async (collectionId) => {
    set({ loading: true });
    try {
      const payments = await paymentService.getPayments(collectionId);
      set({ payments, loading: false });
    } catch (error) {
      console.error('Failed to load payments:', error);
      set({ loading: false });
    }
  },

  getPayment: async (id) => {
    return paymentService.getPaymentWithDetails(id);
  },

  recordPayment: async (collectionId, paidAmount, paidDate, notes) => {
    return paymentService.recordPayment(collectionId, paidAmount, paidDate, notes);
  },

  updatePayment: async (paymentId, data) => {
    await paymentService.updatePayment(paymentId, data);
  },

  deletePayment: async (paymentId) => {
    await paymentService.deletePayment(paymentId);
  },

  loadDashboardStats: async () => {
    try {
      const stats = await paymentService.getDashboardStats();
      set({ stats });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  },
}));
