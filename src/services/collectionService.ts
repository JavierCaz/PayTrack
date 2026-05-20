import { dbQuery, withTransaction, type SQLiteDatabase } from '../database/database';
import { Collection as CollectionRow, generateId, nowISO, type RecurrenceConfig, parseRecurrence, serializeRecurrence } from '../types';

function getPaymentsPerMonthCount(rec: RecurrenceConfig): number {
  if (rec.type === 'monthly') return rec.monthDays.length;
  if (rec.type === 'weekly') return rec.weekDays.length;
  return rec.monthWeekday.length;
}

interface CollectionData {
  clientId: string;
  productName: string;
  totalPrice: number;
  conversionRate?: number;
  numInstallments: number;
  recurrence: RecurrenceConfig;
  startDate: string;
  installmentAmount?: number | null;
}

export interface CollectionWithMeta extends CollectionRow {
  clientName: string;
  paidAmount: number;
  remainingBalance: number;
  paymentCount: number;
}

function rowToCollection(row: any): CollectionRow {
  const recurrence = parseRecurrence(row.payment_days || '1,15');
  return {
    id: row.id,
    clientId: row.client_id,
    productName: row.product_name,
    totalPrice: row.total_price,
    conversionRate: row.conversion_rate ?? 1,
    numInstallments: row.num_installments,
    paymentsPerMonth: getPaymentsPerMonthCount(recurrence),
    paymentDays: recurrence.type === 'monthly' ? recurrence.monthDays : [],
    recurrence,
    startDate: row.start_date,
    installmentAmount: row.installment_amount ?? null,
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
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE collection_id = c.id), 0) as paid_amount,
        COALESCE((SELECT COUNT(*) FROM payments WHERE collection_id = c.id), 0) as payment_count
      FROM collections c JOIN clients cl ON cl.id = c.client_id WHERE c.id = ?`, [id]);
    if (!row) return null;
    const collection = rowToCollection(row);
    return { ...collection, clientName: row.client_name, paidAmount: row.paid_amount, remainingBalance: collection.totalPrice - row.paid_amount, paymentCount: row.payment_count };
  });
}

export async function getCollectionsWithClient(): Promise<CollectionWithMeta[]> {
  return dbQuery(async (db) => {
    const rows = await db.getAllAsync(
      `SELECT c.*, cl.name as client_name,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE collection_id = c.id), 0) as paid_amount,
        COALESCE((SELECT COUNT(*) FROM payments WHERE collection_id = c.id), 0) as payment_count
      FROM collections c JOIN clients cl ON cl.id = c.client_id ORDER BY c.created_at DESC`);
    return rows.map((row: any) => {
      const collection = rowToCollection(row);
      return { ...collection, clientName: row.client_name, paidAmount: row.paid_amount, remainingBalance: collection.totalPrice - row.paid_amount, paymentCount: row.payment_count };
    });
  });
}

export async function getClientCollectionsWithMeta(clientId: string): Promise<CollectionWithMeta[]> {
  return dbQuery(async (db) => {
    const rows = await db.getAllAsync(
      `SELECT c.*, cl.name as client_name,
        COALESCE((SELECT SUM(paid_amount) FROM payments WHERE collection_id = c.id), 0) as paid_amount,
        COALESCE((SELECT COUNT(*) FROM payments WHERE collection_id = c.id), 0) as payment_count
      FROM collections c JOIN clients cl ON cl.id = c.client_id WHERE c.client_id = ? ORDER BY c.created_at DESC`, [clientId]);
    return rows.map((row: any) => {
      const collection = rowToCollection(row);
      return { ...collection, clientName: row.client_name, paidAmount: row.paid_amount, remainingBalance: collection.totalPrice - row.paid_amount, paymentCount: row.payment_count };
    });
  });
}

export async function createCollection(data: CollectionData): Promise<string> {
  return withTransaction(async (db) => {
    const id = generateId();
    const now = nowISO();
    const paymentDaysStr = serializeRecurrence(data.recurrence);
    await db.runAsync(
      `INSERT INTO collections (id, client_id, product_name, total_price, conversion_rate, num_installments, payment_days, start_date, installment_amount, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, data.clientId, data.productName, data.totalPrice, data.conversionRate ?? 1, data.numInstallments, paymentDaysStr, data.startDate, data.installmentAmount ?? null, now, now]
    );
    return id;
  });
}

export async function updateCollection(id: string, data: { productName?: string; totalPrice?: number; conversionRate?: number; numInstallments?: number; recurrence?: RecurrenceConfig; startDate?: string; installmentAmount?: number | null; status?: string }): Promise<void> {
  return withTransaction(async (db) => {
    const now = nowISO();
    const sets: string[] = [];
    const values: any[] = [];
    if (data.productName !== undefined) { sets.push('product_name = ?'); values.push(data.productName); }
    if (data.totalPrice !== undefined) { sets.push('total_price = ?'); values.push(data.totalPrice); }
    if (data.conversionRate !== undefined) { sets.push('conversion_rate = ?'); values.push(data.conversionRate); }
    if (data.numInstallments !== undefined) { sets.push('num_installments = ?'); values.push(data.numInstallments); }
    if (data.recurrence !== undefined) {
      sets.push('payment_days = ?'); values.push(serializeRecurrence(data.recurrence));
    }
    if (data.startDate !== undefined) { sets.push('start_date = ?'); values.push(data.startDate); }
    if (data.installmentAmount !== undefined) { sets.push('installment_amount = ?'); values.push(data.installmentAmount); }
    if (data.status !== undefined) { sets.push('status = ?'); values.push(data.status); }
    if (data.totalPrice !== undefined) {
      sets.push('updated_at = ?'); values.push(now);
      values.push(id);
      await db.runAsync(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`, values);
      await _updateCollectionStatus(db, id);
    } else if (sets.length > 0) {
      sets.push('updated_at = ?'); values.push(now);
      values.push(id);
      await db.runAsync(`UPDATE collections SET ${sets.join(', ')} WHERE id = ?`, values);
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
  const totalPaid = await db.getFirstAsync<any>(
    'SELECT COALESCE(SUM(paid_amount), 0) as total FROM payments WHERE collection_id = ?', [id]);
  const status = totalPaid?.total >= collection.totalPrice ? 'completed' : 'active';
  await db.runAsync('UPDATE collections SET status = ?, updated_at = ? WHERE id = ?', [status, nowISO(), id]);
}

export async function updateCollectionStatus(id: string): Promise<void> {
  return dbQuery((db) => _updateCollectionStatus(db, id));
}
