import { dbQuery, withTransaction, type SQLiteDatabase } from '../database/database';
import { Collection as CollectionRow, generateId, nowISO } from '../types';
import { generatePaymentSchedule } from '../utils/dateUtils';

interface CollectionData {
  clientId: string;
  productName: string;
  totalPrice: number;
  numInstallments: number;
  paymentsPerMonth: number;
  paymentDays: number[];
  startDate: string;
}

export interface CollectionWithMeta extends CollectionRow {
  clientName: string;
  paidAmount: number;
  remainingBalance: number;
  paidCount: number;
  totalCount: number;
}

function rowToCollection(row: any): CollectionRow {
  return {
    id: row.id,
    clientId: row.client_id,
    productName: row.product_name,
    totalPrice: row.total_price,
    numInstallments: row.num_installments,
    paymentsPerMonth: row.payments_per_month,
    paymentDays: (row.payment_days || '1,15').split(',').map(Number),
    startDate: row.start_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCollections(clientId?: string): Promise<CollectionRow[]> {
  return dbQuery(async (db) => {
    const rows = clientId
      ? await db.getAllAsync('SELECT * FROM collections WHERE client_id = ? ORDER BY created_at DESC', [clientId])
      : await db.getAllAsync('SELECT * FROM collections ORDER BY created_at DESC');
    return rows.map(rowToCollection);
  });
}

async function _getCollection(db: SQLiteDatabase, id: string): Promise<CollectionRow | null> {
  const row = await db.getFirstAsync<any>('SELECT * FROM collections WHERE id = ?', [id]);
  return row ? rowToCollection(row) : null;
}

export async function getCollection(id: string): Promise<CollectionRow | null> {
  return dbQuery((db) => _getCollection(db, id));
}

export async function getCollectionWithMeta(id: string): Promise<CollectionWithMeta | null> {
  return dbQuery(async (db) => {
    const row: any = await db.getFirstAsync(
      `SELECT c.*, cl.name as client_name,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE collection_id = c.id AND status IN ('paid', 'partial')), 0) as paid_amount,
        COALESCE((SELECT COUNT(*) FROM payments WHERE collection_id = c.id AND status IN ('paid', 'partial')), 0) as paid_count,
        (SELECT COUNT(*) FROM payments WHERE collection_id = c.id) as total_count
      FROM collections c JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`, [id]);
    if (!row) return null;
    const collection = rowToCollection(row);
    return { ...collection, clientName: row.client_name, paidAmount: row.paid_amount, remainingBalance: collection.totalPrice - row.paid_amount, paidCount: row.paid_count, totalCount: row.total_count };
  });
}

export async function getCollectionsWithClient(): Promise<CollectionWithMeta[]> {
  return dbQuery(async (db) => {
    const rows = await db.getAllAsync(
      `SELECT c.*, cl.name as client_name,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE collection_id = c.id AND status IN ('paid', 'partial')), 0) as paid_amount,
        COALESCE((SELECT COUNT(*) FROM payments WHERE collection_id = c.id AND status IN ('paid', 'partial')), 0) as paid_count,
        (SELECT COUNT(*) FROM payments WHERE collection_id = c.id) as total_count
      FROM collections c JOIN clients cl ON cl.id = c.client_id ORDER BY c.created_at DESC`);
    return rows.map((row: any) => {
      const collection = rowToCollection(row);
      return { ...collection, clientName: row.client_name, paidAmount: row.paid_amount, remainingBalance: collection.totalPrice - row.paid_amount, paidCount: row.paid_count, totalCount: row.total_count };
    });
  });
}

export async function getClientCollectionsWithMeta(clientId: string): Promise<CollectionWithMeta[]> {
  return dbQuery(async (db) => {
    const rows = await db.getAllAsync(
      `SELECT c.*, cl.name as client_name,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE collection_id = c.id AND status IN ('paid', 'partial')), 0) as paid_amount,
        COALESCE((SELECT COUNT(*) FROM payments WHERE collection_id = c.id AND status IN ('paid', 'partial')), 0) as paid_count,
        (SELECT COUNT(*) FROM payments WHERE collection_id = c.id) as total_count
      FROM collections c JOIN clients cl ON cl.id = c.client_id WHERE c.client_id = ? ORDER BY c.created_at DESC`, [clientId]);
    return rows.map((row: any) => {
      const collection = rowToCollection(row);
      return { ...collection, clientName: row.client_name, paidAmount: row.paid_amount, remainingBalance: collection.totalPrice - row.paid_amount, paidCount: row.paid_count, totalCount: row.total_count };
    });
  });
}

export async function createCollection(data: CollectionData): Promise<string> {
  return withTransaction(async (db) => {
    const id = generateId();
    const now = nowISO();
    const paymentDaysStr = data.paymentDays.join(',');
    await db.runAsync(
      `INSERT INTO collections (id, client_id, product_name, total_price, num_installments, payments_per_month, payment_days, start_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, data.clientId, data.productName, data.totalPrice, data.numInstallments, data.paymentsPerMonth, paymentDaysStr, data.startDate, now, now]
    );
    const schedule = generatePaymentSchedule(data.startDate, data.numInstallments, data.totalPrice, data.paymentsPerMonth, data.paymentDays);
    for (const p of schedule) {
      await db.runAsync(
        `INSERT INTO payments (id, collection_id, installment_number, due_date, amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [generateId(), id, p.installmentNumber, p.dueDate, p.amount, now, now]
      );
    }
    return id;
  });
}

export async function updateCollection(id: string, data: { productName?: string; totalPrice?: number; numInstallments?: number; paymentsPerMonth?: number; paymentDays?: number[]; startDate?: string; status?: string }): Promise<void> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const sets: string[] = [];
    const values: any[] = [];
    if (data.productName !== undefined) { sets.push('product_name = ?'); values.push(data.productName); }
    if (data.totalPrice !== undefined) { sets.push('total_price = ?'); values.push(data.totalPrice); }
    if (data.numInstallments !== undefined) { sets.push('num_installments = ?'); values.push(data.numInstallments); }
    if (data.paymentsPerMonth !== undefined) { sets.push('payments_per_month = ?'); values.push(data.paymentsPerMonth); }
    if (data.paymentDays !== undefined) { sets.push('payment_days = ?'); values.push(data.paymentDays.join(',')); }
    if (data.startDate !== undefined) { sets.push('start_date = ?'); values.push(data.startDate); }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    const structureChanged = data.numInstallments !== undefined || data.paymentsPerMonth !== undefined || data.paymentDays !== undefined || data.startDate !== undefined || data.totalPrice !== undefined;
    if (sets.length === 0) return;
    sets.push('updated_at = ?'); values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`, values);
    if (structureChanged) {
      const collection = await _getCollection(db, id);
      if (!collection) return;
      const totalPrice = data.totalPrice ?? collection.totalPrice;
      const numInstallments = data.numInstallments ?? collection.numInstallments;
      const paymentsPerMonth = data.paymentsPerMonth ?? collection.paymentsPerMonth;
      const paymentDays = data.paymentDays ?? collection.paymentDays;
      const startDate = data.startDate ?? collection.startDate;
      await db.runAsync("DELETE FROM payments WHERE collection_id = ? AND status = 'pending'", [id]);
      const schedule = generatePaymentSchedule(startDate, numInstallments, totalPrice, paymentsPerMonth, paymentDays);
      for (const p of schedule) {
        await db.runAsync(`INSERT INTO payments (id, collection_id, installment_number, due_date, amount, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`, [generateId(), id, p.installmentNumber, p.dueDate, p.amount, now, now]);
      }
    }
  });
}

export async function deleteCollection(id: string): Promise<void> {
  return withTransaction(async (db) => {
    await db.runAsync('DELETE FROM payments WHERE collection_id = ?', [id]);
    await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
  });
}

export async function _updateCollectionStatus(db: SQLiteDatabase, id: string): Promise<void> {
  const collection = await _getCollection(db, id);
  if (!collection) return;
  const stats = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as total,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
     FROM payments WHERE collection_id = ?`, [id]);
  let status: string;
  if (stats.total > 0 && stats.total === stats.paid_count) status = 'completed';
  else if (stats.overdue_count > 0) status = 'overdue';
  else status = 'active';
  await db.runAsync('UPDATE collections SET status = ?, updated_at = ? WHERE id = ?', [status, nowISO(), id]);
}

export async function updateCollectionStatus(id: string): Promise<void> {
  return dbQuery((db) => _updateCollectionStatus(db, id));
}
