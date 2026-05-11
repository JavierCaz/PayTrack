import { dbQuery, withTransaction } from '../database/database';
import { Client as ClientRow, generateId, nowISO, parseRecurrence, serializeRecurrence, type RecurrenceConfig } from '../types';
import { getNthWeekday } from '../utils/dateUtils';
import dayjs from 'dayjs';

interface ClientData {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  defaultRecurrence?: RecurrenceConfig | null;
}

function rowToClient(row: any): ClientRow {
  let defaultRecurrence: RecurrenceConfig | null = null;
  if (row.default_recurrence) {
    try { defaultRecurrence = JSON.parse(row.default_recurrence); }
    catch { defaultRecurrence = null; }
  }
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    blacklisted: !!row.blacklisted,
    blacklistNote: row.blacklist_note || '',
    defaultRecurrence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CollectionStatus = 'none' | 'active' | 'settled';

export interface ClientWithTotal extends ClientRow {
  totalCollections: number;
  collectionStatus: CollectionStatus;
  isPending: boolean;
}

function rowToClientWithTotal(row: any): ClientWithTotal {
  return {
    ...rowToClient(row),
    totalCollections: row.total_collections || 0,
    collectionStatus: row.collection_status || 'none',
    isPending: false,
  };
}

async function getPendingClientIds(db: any): Promise<Set<string>> {
  const rows = await db.getAllAsync(
    `SELECT col.id, col.client_id, col.payment_days, col.payments_per_month,
      (SELECT MAX(paid_date) FROM payments WHERE collection_id = col.id) as last_paid_date,
      col.num_installments, col.total_price, col.installment_amount, col.start_date
    FROM collections col WHERE col.status = 'active'`
  );

  const pendingClients = new Set<string>();
  const today = dayjs();

  for (const row of rows) {
    const recurrence: RecurrenceConfig = parseRecurrence(row.payment_days || '1,15');
    const paymentsPerMonth = row.payments_per_month || 1;
    const start = dayjs(row.start_date || today);

    if (recurrence.type === 'weekly') {
      const sortedDays = [...recurrence.weekDays].sort();
      if (sortedDays.length === 0) continue;
      const mostRecentDay = [...sortedDays].reverse().find((d: number) => d <= today.day());
      let expectedDate: dayjs.Dayjs;
      if (mostRecentDay !== undefined) {
        expectedDate = today.day(mostRecentDay);
      } else {
        expectedDate = today.subtract(1, 'week').day(sortedDays[sortedDays.length - 1]);
      }
      if (expectedDate.isAfter(today)) {
        expectedDate = expectedDate.subtract(1, 'week');
      }
      if (expectedDate.isBefore(start, 'day')) continue;
      const expectedDateStr = expectedDate.format('YYYY-MM-DD');
      if (!row.last_paid_date || row.last_paid_date < expectedDateStr) {
        pendingClients.add(row.client_id);
      }
      continue;
    }

    if (recurrence.type === 'monthly_weekday') {
      const days = recurrence.monthWeekday.slice(0, paymentsPerMonth);
      if (days.length === 0) continue;
      let isPending = false;
      for (const { week, day } of days) {
        const occurrence = getNthWeekday(today.year(), today.month(), week, day);
        if (occurrence.isAfter(today, 'day')) continue;
        if (occurrence.isBefore(start, 'day')) continue;
        const occurrenceStr = occurrence.format('YYYY-MM-DD');
        if (!row.last_paid_date || row.last_paid_date < occurrenceStr) {
          isPending = true;
          break;
        }
      }
      if (isPending) pendingClients.add(row.client_id);
      continue;
    }

    const paymentDays = [...recurrence.monthDays].sort((a: number, b: number) => a - b).slice(0, paymentsPerMonth);
    const currentDay = today.date();
    const mostRecentDay = [...paymentDays].reverse().find((d: number) => d <= currentDay);

    let expectedDate: dayjs.Dayjs;
    if (mostRecentDay !== undefined) {
      expectedDate = dayjs(new Date(today.year(), today.month(), mostRecentDay));
    } else {
      const lastDayOfLastMonth = new Date(today.year(), today.month(), 0).getDate();
      const lastMonthDay = [...paymentDays].reverse().find((d: number) => d <= lastDayOfLastMonth);
      if (lastMonthDay === undefined) continue;
      expectedDate = dayjs(new Date(today.year(), today.month() - 1, lastMonthDay));
    }

    if (expectedDate.isBefore(start, 'day')) continue;
    const expectedDateStr = expectedDate.format('YYYY-MM-DD');
    if (!row.last_paid_date || row.last_paid_date < expectedDateStr) {
      pendingClients.add(row.client_id);
    }
  }

  return pendingClients;
}

export async function getClients(search?: string): Promise<ClientWithTotal[]> {
  return dbQuery(async (db) => {
    const select = `SELECT c.*,
      COALESCE(SUM(col.total_price), 0) as total_collections,
      CASE
        WHEN COUNT(col.id) = 0 THEN 'none'
        WHEN COALESCE(SUM(col.total_price), 0) - COALESCE(SUM(col.total_paid), 0) > 0 THEN 'active'
        ELSE 'settled'
      END as collection_status`;
    const from = `FROM clients c LEFT JOIN (
      SELECT col.id, col.client_id, col.total_price,
        COALESCE(SUM(p.paid_amount), 0) as total_paid
      FROM collections col
      LEFT JOIN payments p ON p.collection_id = col.id AND p.status = 'paid'
      GROUP BY col.id
    ) col ON col.client_id = c.id`;
    const where = search ? `WHERE c.name LIKE ?` : ``;
    const groupOrder = `GROUP BY c.id ORDER BY c.name ASC`;
    const query = [select, from, where, groupOrder].filter(Boolean).join(' ');
    const params = search ? [`%${search}%`] : [];
    const rows = await db.getAllAsync(query, params);
    const clients = rows.map(rowToClientWithTotal);
    const pendingIds = await getPendingClientIds(db);
    return clients.map(c => ({ ...c, isPending: pendingIds.has(c.id) }));
  });
}

export async function getClient(id: string): Promise<ClientRow | null> {
  return dbQuery(async (db) => {
    const row = await db.getFirstAsync('SELECT * FROM clients WHERE id = ?', [id]);
    return row ? rowToClient(row) : null;
  });
}

export async function createClient(data: ClientData): Promise<string> {
  return dbQuery(async (db) => {
    const id = generateId();
    const now = nowISO();
    await db.runAsync(
      'INSERT INTO clients (id, name, phone, email, notes, default_recurrence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, data.name, data.phone || '', data.email || '', data.notes || '', data.defaultRecurrence ? serializeRecurrence(data.defaultRecurrence) : null, now, now]
    );
    return id;
  });
}

export async function updateClient(id: string, data: Partial<ClientData>): Promise<void> {
  return dbQuery(async (db) => {
    const now = nowISO();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
    if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }
    if (data.defaultRecurrence !== undefined) { fields.push('default_recurrence = ?'); values.push(data.defaultRecurrence ? serializeRecurrence(data.defaultRecurrence) : null); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`, values);
  });
}

export async function blacklistClient(id: string, note: string): Promise<void> {
  return dbQuery(async (db) => {
    const now = nowISO();
    await db.runAsync(
      'UPDATE clients SET blacklisted = 1, blacklist_note = ?, updated_at = ? WHERE id = ?',
      [note, now, id]
    );
  });
}

export async function unblacklistClient(id: string): Promise<void> {
  return dbQuery(async (db) => {
    const now = nowISO();
    await db.runAsync(
      'UPDATE clients SET blacklisted = 0, blacklist_note = \'\', updated_at = ? WHERE id = ?',
      [now, id]
    );
  });
}

export async function deleteClient(id: string): Promise<void> {
  return withTransaction(async (db) => {
    await db.runAsync('DELETE FROM payments WHERE collection_id IN (SELECT id FROM collections WHERE client_id = ?)', [id]);
    await db.runAsync('DELETE FROM collections WHERE client_id = ?', [id]);
    await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
  });
}
