import dayjs from 'dayjs';
import { dbQuery, withTransaction, type SQLiteDatabase } from '../database/database';
import { Payment as PaymentRow, generateId, nowISO, type IncomeDataPoint } from '../types';
import { _updateCollectionStatus } from './collectionService';
import { getSetting } from './settingsService';

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
        (SELECT COALESCE(SUM(paid_amount), 0) FROM payments WHERE collection_id = p.collection_id AND installment_number <= p.installment_number) as total_paid_for_collection
       FROM payments p JOIN collections c ON c.id = p.collection_id JOIN clients cl ON cl.id = c.client_id WHERE p.id = ?`, [id]);
    if (!row) return null;
    return { ...rowToPayment(row), productName: row.product_name, totalPrice: row.total_price, numInstallments: row.num_installments, clientName: row.client_name, clientPhone: row.client_phone, totalPaidForCollection: row.total_paid_for_collection };
  });
}

export async function recordPayment(collectionId: string, paidAmount: number, paidDate?: string, notes?: string): Promise<string> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const id = generateId();
    const countResult = await db.getFirstAsync<any>('SELECT COUNT(*) as count FROM payments WHERE collection_id = ?', [collectionId]);
    const installmentNumber = (countResult?.count || 0) + 1;
    const date = paidDate || now.split('T')[0];
    await db.runAsync(
      `INSERT INTO payments (id, collection_id, installment_number, due_date, amount, status, paid_date, paid_amount, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?)`,
      [id, collectionId, installmentNumber, date, paidAmount, date, paidAmount, notes || '', now, now]
    );
    await _updateCollectionStatus(db, collectionId);
    return id;
  });
}

export async function updatePayment(paymentId: string, data: { paidAmount?: number; paidDate?: string; notes?: string; amount?: number }): Promise<void> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const payment = await _getPayment(db, paymentId);
    if (!payment) throw new Error('Payment not found');
    const sets: string[] = []; const values: any[] = [];
    if (data.paidAmount !== undefined) {
      sets.push('paid_amount = ?'); values.push(data.paidAmount);
      sets.push('amount = ?'); values.push(data.paidAmount);
    }
    if (data.paidDate !== undefined) { sets.push('paid_date = ?'); values.push(data.paidDate); sets.push('due_date = ?'); values.push(data.paidDate); }
    if (data.notes !== undefined) { sets.push('notes = ?'); values.push(data.notes); }
    if (data.amount !== undefined) { sets.push('amount = ?'); values.push(data.amount); }
    sets.push('updated_at = ?'); values.push(now);
    values.push(paymentId);
    await db.runAsync(`UPDATE payments SET ${sets.join(', ')} WHERE id = ?`, values);
    await _updateCollectionStatus(db, payment.collectionId);
  });
}

export async function deletePayment(paymentId: string): Promise<void> {
  return withTransaction(async (db) => {
    const payment = await _getPayment(db, paymentId);
    if (!payment) throw new Error('Payment not found');
    await db.runAsync('DELETE FROM payments WHERE id = ?', [paymentId]);
    await _updateCollectionStatus(db, payment.collectionId);
  });
}

export async function getDashboardStats(): Promise<{
  totalClients: number; totalCollections: number; totalPayments: number;
  totalPaymentsSum: number; totalPaidOut: number; totalRemainder: number;
  activeCollections: number; completedCollections: number; overdueCollections: number;
  totalOutstanding: number; monthlyIncome: number; todayIncome: number; weekIncome: number; yearIncome: number;
  activeClients: number; blacklistedClients: number;
  realEarnings: number; totalInvestment: number; interestPercentage: number;
}> {
  const interestStr = await getSetting('interest_percentage');
  const interestPercentage = parseFloat(interestStr || '0.35');

  return dbQuery(async (db) => {
    const now = dayjs();
    const todayStr = now.format('YYYY-MM-DD');
    const monthStartStr = now.startOf('month').format('YYYY-MM-DD');
    const monthEndStr = now.endOf('month').format('YYYY-MM-DD');
    const yearStartStr = now.startOf('year').format('YYYY-MM-DD');
    const yearEndStr = now.endOf('year').format('YYYY-MM-DD');
    const weekStart = now.subtract((now.day() + 6) % 7, 'day');
    const weekStartStr = weekStart.format('YYYY-MM-DD');
    const weekEndStr = weekStart.add(6, 'day').format('YYYY-MM-DD');

    const totalClients = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM clients");
    const totalCollections = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections");
    const totalPayments = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM payments");
    const paymentsSum = await db.getFirstAsync<any>("SELECT COALESCE(SUM(amount), 0) as total FROM payments");
    const paidOut = await db.getFirstAsync<any>("SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments");
    const activeColl = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections WHERE status = 'active'");
    const completedColl = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections WHERE status = 'completed'");
    const overdueColl = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM collections WHERE status = 'overdue'");
    const outstanding = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(c.total_price - COALESCE(paid.paid, 0)), 0) as total FROM collections c LEFT JOIN (SELECT collection_id, SUM(paid_amount) as paid FROM payments GROUP BY collection_id) paid ON paid.collection_id = c.id WHERE c.status != 'completed'`);
    const monthlyIncome = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE paid_date >= ? AND paid_date <= ?`, [monthStartStr, monthEndStr]);
    const todayIncome = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE paid_date = ?`, [todayStr]);
    const weekIncome = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE paid_date >= ? AND paid_date <= ?`, [weekStartStr, weekEndStr]);
    const yearIncome = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE paid_date >= ? AND paid_date <= ?`, [yearStartStr, yearEndStr]);
    const globalRemainder = await db.getFirstAsync<any>(`SELECT COALESCE(SUM(c.total_price - COALESCE(paid.paid, 0)), 0) as total FROM collections c LEFT JOIN (SELECT collection_id, SUM(paid_amount) as paid FROM payments GROUP BY collection_id) paid ON paid.collection_id = c.id`);
    const activeClients = await db.getFirstAsync<any>(
      `SELECT COUNT(*) as count FROM (
        SELECT c.id
        FROM clients c
        LEFT JOIN (
          SELECT col.id, col.client_id, col.total_price,
            COALESCE(SUM(p.paid_amount), 0) as total_paid
          FROM collections col
          LEFT JOIN payments p ON p.collection_id = col.id AND p.status = 'paid'
          GROUP BY col.id
        ) col ON col.client_id = c.id
        WHERE c.blacklisted = 0
        GROUP BY c.id
        HAVING COALESCE(SUM(col.total_price), 0) - COALESCE(SUM(col.total_paid), 0) > 0
      )`
    );
    const blacklistedClients = await db.getFirstAsync<any>("SELECT COUNT(*) as count FROM clients WHERE blacklisted = 1");

    const totalPaidOutValue = paidOut?.total || 0;
    const totalInvestment = interestPercentage > 0 ? totalPaidOutValue / (1 + interestPercentage) : totalPaidOutValue;
    const realEarnings = totalPaidOutValue - totalInvestment;

    return {
      totalClients: totalClients?.count || 0, totalCollections: totalCollections?.count || 0,
      totalPayments: totalPayments?.count || 0, totalPaymentsSum: paymentsSum?.total || 0,
      totalPaidOut: totalPaidOutValue, totalRemainder: globalRemainder?.total || 0,
      activeCollections: activeColl?.count || 0, completedCollections: completedColl?.count || 0,
      overdueCollections: overdueColl?.count || 0, totalOutstanding: outstanding?.total || 0,
      monthlyIncome: monthlyIncome?.total || 0, todayIncome: todayIncome?.total || 0,
      weekIncome: weekIncome?.total || 0, yearIncome: yearIncome?.total || 0,
      activeClients: activeClients?.count || 0, blacklistedClients: blacklistedClients?.count || 0,
      realEarnings, totalInvestment, interestPercentage,
    };
  });
}

export async function getIncomeChartData(period: 'today' | 'week' | 'month' | 'year'): Promise<IncomeDataPoint[]> {
  return dbQuery(async (db) => {
    const now = dayjs();

    if (period === 'today') {
      const weekStart = now.subtract((now.day() + 6) % 7, 'day');
      const weekEnd = weekStart.add(6, 'day');
      const rows = await db.getAllAsync<any>(
        `SELECT paid_date, COALESCE(SUM(paid_amount), 0) as amount
         FROM payments WHERE paid_date >= ? AND paid_date <= ?
         GROUP BY paid_date ORDER BY paid_date`,
        [weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD')]
      );
      const map = new Map(rows.map(r => [r.paid_date, r.amount]));
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return labels.map((label, i) => ({
        label,
        amount: map.get(weekStart.add(i, 'day').format('YYYY-MM-DD')) || 0,
      }));
    }

    if (period === 'week') {
      const monthStart = now.startOf('month');
      const monthEnd = now.endOf('month');
      const rows = await db.getAllAsync<any>(
        `SELECT paid_date, COALESCE(SUM(paid_amount), 0) as amount
         FROM payments WHERE paid_date >= ? AND paid_date <= ?
         GROUP BY paid_date ORDER BY paid_date`,
        [monthStart.format('YYYY-MM-DD'), monthEnd.format('YYYY-MM-DD')]
      );
      const weekMap = new Map<number, number>();
      for (const row of rows) {
        const dayOfMonth = dayjs(row.paid_date).date();
        const weekIndex = Math.floor((dayOfMonth - 1) / 7);
        weekMap.set(weekIndex, (weekMap.get(weekIndex) || 0) + row.amount);
      }
      const numWeeks = Math.ceil(monthEnd.date() / 7);
      return Array.from({ length: numWeeks }, (_, i) => ({
        label: `W${i + 1}`,
        amount: weekMap.get(i) || 0,
      }));
    }

    if (period === 'month') {
      const yearStart = now.startOf('year');
      const yearEnd = now.endOf('year');
      const rows = await db.getAllAsync<any>(
        `SELECT strftime('%m', paid_date) as month_num, COALESCE(SUM(paid_amount), 0) as amount
         FROM payments WHERE paid_date >= ? AND paid_date <= ?
         GROUP BY month_num ORDER BY month_num`,
        [yearStart.format('YYYY-MM-DD'), yearEnd.format('YYYY-MM-DD')]
      );
      const map = new Map(rows.map(r => [r.month_num, r.amount]));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((name, i) => ({
        label: name,
        amount: map.get(String(i + 1).padStart(2, '0')) || 0,
      }));
    }

    // year
    const rows = await db.getAllAsync<any>(
      `SELECT strftime('%Y', paid_date) as year, COALESCE(SUM(paid_amount), 0) as amount
       FROM payments GROUP BY year ORDER BY year`
    );
    return rows.map(r => ({ label: r.year, amount: r.amount }));
  });
}
