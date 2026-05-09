export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  blacklisted: boolean;
  blacklistNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  clientId: string;
  productName: string;
  totalPrice: number;
  numInstallments: number;
  paymentsPerMonth: number;
  paymentDays: number[];
  startDate: string;
  status: 'active' | 'completed' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  collectionId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paidDate: string | null;
  paidAmount: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionWithClient extends Collection {
  clientName: string;
}

export interface PaymentWithCollection extends Payment {
  productName: string;
  clientName: string;
}

export type CollectionStatus = 'active' | 'completed' | 'overdue';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial';

export interface DashboardStats {
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
  dueToday: number;
  overduePayments: number;
  upcomingPayments: number;
}

export interface MonthlyIncome {
  month: string;
  amount: number;
}

export interface OutstandingByClient {
  clientName: string;
  outstanding: number;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

export function nowISO(): string {
  return new Date().toISOString();
}
