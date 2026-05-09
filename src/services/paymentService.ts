import { dbQuery, withTransaction, type SQLiteDatabase } from '../database/database';
import { Payment as PaymentRow, nowISO } from '../types';
import { _updateCollectionStatus } from './collectionService';

function rowToPayment(row: any): PaymentRow {
  return {
    id: row.id, collectionId: row.collection_id, installmentNumber: row.installment_number,
    dueDate: row.due_date, amount: row.amount, status: row.status,
    paidDate: row.paid_date || null, paidAmount: row.paid_amount || null,
    notes: row.notes || '', createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function getPayments(collectionId: string): Promise<PaymentRow[]> {
  return dbQuery(async (db) => {
    const rows = await db.getAllAsync('SELECT * FROM payments WHERE collection_id = ? ORDER BY installment_number ASC', [collectionId]);
    return rows.map(rowToPayment);
  });
}

async function _getPayment(db: SQLiteDatabase, id: string): Promise<PaymentRow | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM payments WHERE id = ?', [id]);
  return row ? rowToPayment(row) : null;
}

export async function getPayment(id: string): Promise<PaymentRow | null> {
  return dbQuery((db) => _getPayment(db, id));
}

export async function getPaymentWithDetails(id: string): Promise<any | null> {
  return dbQuery(async (db) => {
    const row: any = await db.getFirstAsync(
      `SELECT p.*, c.product_name, c.total_price, c.num_installments, cl.name as client_name, cl.phone as client_phone,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM payments WHERE collection_id = p.collection_id AND status IN ('paid', 'partial')) as total_paid_for_collection
       FROM payments p JOIN collections c ON c.id = p.collection_id JOIN clients cl ON cl.id = c.client_id WHERE p.id = ?`, [id]);
    if (!row) return null;
    return { ...rowToPayment(row), productName: row.product_name, totalPrice: row.total_price, numInstallments: row.num_installments, clientName: row.client_name, clientPhone: row.client_phone, totalPaidForCollection: row.total_paid_for_collection };
  });
}

export async function recordPayment(paymentId: string, paidAmount: number, paidDate?: string, notes?: string): Promise<void> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const payment = await _getPayment(db, paymentId);
    if (!payment) throw new Error('Payment not found');
    const status = paidAmount >= payment.amount ? 'paid' : 'partial';
    const date = paidDate || now;
    await db.runAsync(`UPDATE payments SET status = ?, paid_date = ?, paid_amount = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [status, date, paidAmount, notes || '', now, paymentId]);
    await _updateCollectionStatus(db, payment.collectionId);
  });
}

export async function updatePayment(paymentId: string, data: { paidAmount?: number; paidDate?: string; notes?: string }): Promise<void> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const payment = await _getPayment(db, paymentId);
    if (!payment) throw new Error('Payment not found');
    const sets: string[] = []; const values: any[] = [];
    if (data.paidAmount !== undefined) {
      const status = data.paidAmount >= payment.amount ? 'paid' : 'partial';
      sets.push('status = ?'); values.push(status);
      sets.push('paid_amount = ?'); values.push(data.paidAmount);
    }
    if (data.paidDate !== undefined) { sets.push('paid_date = ?'); values.push(data.paidDate); }
    if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes); }
    sets.push('updated_at = ?'); values.push(now);
    values.push(paymentId);
    await db.runAsync(`UPDATE payments SET ${sets.join(', ')} WHERE id = ?`, values);
    await _updateCollectionStatus(db, payment.collectionId);
  });
}

export async function deletePayment(paymentId: string): Promise<void> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const payment = await _getPayment(db, paymentId);
    if (!payment) throw new Error('Payment not found');
    await db.runAsync(`UPDATE payments SET status = 'pending', paid_date = NULL, paid_amount = NULL, notes = '', updated_at = ? WHERE id = ?`, [now, paymentId]);
    await _updateCollectionStatus(db, payment.collectionId);
  });
}

export async function getUpcomingPayments(days: number = 7): Promise<PaymentRow[]> {
  return dbQuery(async (db) => {
    const now = nowISO().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    const rows = await db.getAllAsync(`SELECT * FROM payments WHERE due_date >= ? AND due_date <= ? AND status = 'pending' ORDER BY due_date ASC`, [now, future]);
    return rows.map(rowToPayment);
  });
}

export async function getDueTodayPayments(): Promise<PaymentRow[]> {
  return dbQuery(async (db) => {
    const today = nowISO().split('T')[0];
    const rows = await db.getAllAsync("SELECT * FROM payments WHERE due_date = ? AND status = 'pending'", [today]);
    return rows.map(rowToPayment);
  });
}

export async function getOverduePayments(): Promise<PaymentRow[]> {
  return dbQuery(async (db) => {
    const today = nowISO().split('T')[0];
    const rows = await db.getAllAsync("SELECT * FROM payments WHERE due_date < ? AND status = 'pending' ORDER BY due_date ASC", [today]);
    return rows.map(rowToPayment);
  });
}

export async function getDashboardStats(): Promise<{
  totalClients: number; totalCollections: number; totalPayments: number;
  totalPaymentsSum: number; totalPaidOut: number; totalRemainder: number;
  activeCollections: number; completedCollections: number; overdueCollections: number;
  totalOutstanding: number; monthlyIncome: number; dueToday: number;
  overduePayments: number; upcomingPayments: number
}> {
  return dbQuery(async (db) => {
    const today = nowISO().split('T')[0];
    const monthStartStr = new Date(new Date().setDate(1)).toISOString().split('T')[0];
    const monthEndStr = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    const totalClients = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM clients");
    const totalCollections = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections");
    const totalPayments = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM payments");
    const paymentsSum = await db.getFirstAsync<any>("SELECT COALESCE(SUM(amount), 0) as total FROM payments");
    const paidOut = await db.getFirstAsync<any>("SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE status IN ('paid', 'partial')");
    const activeColl = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections WHERE status = 'active'");
    const completedColl = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections WHERE status = 'completed'");
    const overdueColl = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections WHERE status = 'overdue'");
    const outstanding = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(c.total_price - COALESCE(paid.paid, 0)), 0) as total FROM collections c LEFT JOIN (SELECT collection_id, SUM(paid_amount) as paid FROM payments WHERE status IN ('paid', 'partial') GROUP BY collection_id) paid ON paid.collection_id = c.id WHERE c.status != 'completed'`);
    const monthlyIncome = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE status IN ('paid', 'partial') AND paid_date >= ? AND paid_date <= ?`, [monthStartStr, monthEndStr]);
    const dueTodayCount = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM payments WHERE due_date = ? AND status = 'pending'", [today]);
    const overdueCount = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM payments WHERE due_date < ? AND status = 'pending'", [today]);
    const upcomingCount = await db.getFirstAsync<any>(`SELECT COUNT(*) as count FROM payments WHERE due_date > ? AND due_date <= ? AND status = 'pending'`, [today, new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]]);
    const totalPaymentsSum = paymentsSum?.total || 0;
    const totalPaidOut = paidOut?.total || 0;
    const globalRemainder = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(c.total_price - COALESCE(paid.paid, 0)), 0) as total FROM collections c LEFT JOIN (SELECT collection_id, SUM(paid_amount) as paid FROM payments WHERE status IN ('paid', 'partial') GROUP BY collection_id) paid ON paid.collection_id = c.id`);
    return {
      totalClients: totalClients?.count || 0, totalCollections: totalCollections?.count || 0,
      totalPayments: totalPayments?.count || 0, totalPaymentsSum,
      totalPaidOut, totalRemainder: globalRemainder?.total || 0,
      activeCollections: activeColl?.count || 0, completedCollections: completedColl?.count || 0,
      overdueCollections: overdueColl?.count || 0, totalOutstanding: outstanding?.total || 0,
      monthlyIncome: monthlyIncome?.total || 0, dueToday: dueTodayCount?.count || 0,
      overduePayments: overdueCount?.count || 0, upcomingPayments: upcomingCount?.count || 0,
    };
  });
}
