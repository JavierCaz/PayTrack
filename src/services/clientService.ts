import { dbQuery, withTransaction } from '../database/database';
import { Client as ClientRow, generateId, nowISO } from '../types';

interface ClientData {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

function rowToClient(row: any): ClientRow {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    blacklisted: !!row.blacklisted,
    blacklistNote: row.blacklist_note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CollectionStatus = 'none' | 'active' | 'settled';

export interface ClientWithTotal extends ClientRow {
  totalCollections: number;
  collectionStatus: CollectionStatus;
}

function rowToClientWithTotal(row: any): ClientWithTotal {
  return {
    ...rowToClient(row),
    totalCollections: row.total_collections || 0,
    collectionStatus: row.collection_status || 'none',
  };
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
    return rows.map(rowToClientWithTotal);
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
      'INSERT INTO clients (id, name, phone, email, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, data.name, data.phone || '', data.email || '', data.notes || '', now, now]
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
