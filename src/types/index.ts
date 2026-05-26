export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  blacklisted: boolean;
  blacklistNote: string;
  defaultRecurrence: RecurrenceConfig | null;
  createdAt: string;
  updatedAt: string;
}

export type RecurrenceType = 'monthly' | 'weekly' | 'monthly_weekday';

export interface WeekdayOccurrence {
  week: number;
  day: number;
}

export interface RecurrenceConfig {
  type: RecurrenceType;
  monthDays: number[];
  weekDays: number[];
  monthWeekday: WeekdayOccurrence[];
}

export interface Collection {
  id: string;
  clientId: string;
  productName: string;
  totalPrice: number;
  conversionRate: number;
  interestRate: number;
  numInstallments: number;
  paymentsPerMonth: number;
  paymentDays: number[];
  recurrence: RecurrenceConfig;
  startDate: string;
  installmentAmount: number | null;
  status: 'active' | 'completed' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export function getDefaultRecurrence(): RecurrenceConfig {
  return { type: 'monthly', monthDays: [1, 15], weekDays: [], monthWeekday: [] };
}

export function serializeRecurrence(r: RecurrenceConfig): string {
  return JSON.stringify(r);
}

export function parseRecurrence(str: string): RecurrenceConfig {
  if (!str) return getDefaultRecurrence();
  if (str.startsWith('{')) {
    try { return JSON.parse(str); }
    catch { return getDefaultRecurrence(); }
  }
  const days = str.split(',').map(Number).filter(d => !isNaN(d));
  return { type: 'monthly', monthDays: days.length > 0 ? days : [1, 15], weekDays: [], monthWeekday: [] };
}

export interface Payment {
  id: string;
  collectionId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'paid';
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
export type PaymentStatus = 'paid';

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
  todayIncome: number;
  weekIncome: number;
  yearIncome: number;
  activeClients: number;
  blacklistedClients: number;
  realEarnings: number;
  totalInvestment: number;
  interestPercentage: number;
}

export interface IncomeDataPoint {
  label: string;
  amount: number;
  earnings: number;
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
