import { withTransaction } from '../database/database';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { generateId, nowISO } from '../types';
import { t } from '../i18n';

interface BackupData {
  version: number;
  exportedAt: string;
  clients: any[];
  collections: any[];
  payments: any[];
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return nowISO().split('T')[0];
  // "2022/12/10" -> "2022-12-10"
  let d = dateStr.replace(/-/g, '/');
  const parts = d.split('/');
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  // "2022-06-21 21:05:04" -> "2022-06-21"
  return dateStr.split(' ')[0];
}

function safeNum(val: any, fallback: number = 0): number {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? fallback : n;
}

function safeStr(val: any, fallback: string = ''): string {
  return String(val ?? fallback);
}

async function importExternalFormat(data: any): Promise<void> {
  return withTransaction(async (db) => {
    const clientes = data.clientes || [];
    if (!clientes.length) throw new Error('No clients found in backup');

    await db.runAsync('DELETE FROM payments');
    await db.runAsync('DELETE FROM collections');
    await db.runAsync('DELETE FROM clients');

    const clientIdMap = new Map<string, string>();

    for (const c of clientes) {
      const newId = generateId();
      clientIdMap.set(safeStr(c.idCliente, `cli_${generateId()}`), newId);
      const name = safeStr(c.nombre, 'Unknown');
      const phone = (safeStr(c.telefono) || safeStr(c.celular)).trim();
      const now = nowISO();
      await db.runAsync(
        'INSERT INTO clients (id, name, phone, email, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [newId, name, phone, '', safeStr(c.obs), normalizeDate(c.fechaAlta) || now, normalizeDate(c.fechaModif) || now]
      );
    }

    for (const c of clientes) {
      const cobranzas = c.cobranzas || [];
      for (const col of cobranzas) {
        if (!col || !col.idCobranza) continue;
        const newCollId = generateId();
        const clientId = clientIdMap.get(safeStr(col.idCliente));
        if (!clientId) continue;

        const cobros = col.cobros || [];
        const totalPrice = safeNum(col.precio);
        const numInstallments = Math.max(cobros.length, 1);
        const now = nowISO();
        const startDate = normalizeDate(col.fechaCompra) || now;

        const productName = safeStr(col.nombre, 'Product');
        const paymentDays = cobros.length > 0 ? String(new Date(normalizeDate(cobros[0].fechaCobro) || now).getDate()) : '1';

        await db.runAsync(
          'INSERT INTO collections (id, client_id, product_name, total_price, num_installments, payments_per_month, payment_days, start_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newCollId, clientId, productName, totalPrice,
           numInstallments, 1, paymentDays, startDate, 'active', now, now]
        );

        for (let i = 0; i < cobros.length; i++) {
          const cobro = cobros[i];
          const paidDate = normalizeDate(cobro.fechaCobro) || now;
          const monto = safeNum(cobro.monto);
          await db.runAsync(
            'INSERT INTO payments (id, collection_id, installment_number, due_date, amount, status, paid_date, paid_amount, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateId(), newCollId, i + 1, paidDate, monto, 'paid', paidDate, monto, safeStr(cobro.obs), now, now]
          );
        }
      }
    }

    // Refresh collection statuses based on imported payments
    const allColls = await db.getAllAsync('SELECT id FROM collections');
    for (const coll of allColls as any[]) {
      await db.runAsync(`UPDATE collections SET status = CASE
        WHEN (SELECT COUNT(*) FROM payments WHERE collection_id = ? AND status = 'pending') = 0
          AND (SELECT COUNT(*) FROM payments WHERE collection_id = ?) > 0 THEN 'completed'
        WHEN (SELECT COUNT(*) FROM payments WHERE collection_id = ? AND status = 'overdue') > 0 THEN 'overdue'
        ELSE 'active'
      END, updated_at = ? WHERE id = ?`,
        [coll.id, coll.id, coll.id, nowISO(), coll.id]);
    }
  });
}

export async function clearAllData(): Promise<void> {
  return withTransaction(async (db) => {
    await db.runAsync('DELETE FROM payments');
    await db.runAsync('DELETE FROM collections');
    await db.runAsync('DELETE FROM clients');
  });
}

export async function exportBackup(): Promise<void> {
  try {
    const { clients, collections, payments } = await withTransaction(async (db) => {
      const clients = await db.getAllAsync('SELECT * FROM clients');
      const collections = await db.getAllAsync('SELECT * FROM collections');
      const payments = await db.getAllAsync('SELECT * FROM payments');
      return { clients, collections, payments };
    });

    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      clients,
      collections,
      payments,
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `paytrack_backup_${new Date().toISOString().split('T')[0]}.json`;
    const file = new File(Paths.document, filename);
    const writer = file.writableStream().getWriter();
    await writer.write(new TextEncoder().encode(json));
    await writer.close();

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: t('backup.exportSuccess'),
      });
    } else {
      Alert.alert(t('backup.exportSuccess'), t('backup.exportSavedTo', { path: file.uri }));
    }
  } catch (error) {
    console.error('Failed to export backup:', error);
    Alert.alert(t('common.error'), t('backup.exportFailed'));
  }
}

export async function importBackup(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    const text = await file.text();
    const data = JSON.parse(text);

    // Detect external format (from another app) - has "clientes" array
    if (data.clientes && Array.isArray(data.clientes)) {
      await importExternalFormat(data);
      Alert.alert(t('common.success'), t('backup.importExternalSuccess'));
      return;
    }

    // Our own format
    const backup = data as BackupData;
    if (!backup.version || !backup.clients || !backup.collections || !backup.payments) {
      Alert.alert(t('backup.invalidFile'), t('backup.invalidFileDesc'));
      return;
    }

    await withTransaction(async (db) => {
      await db.runAsync('DELETE FROM payments');
      await db.runAsync('DELETE FROM collections');
      await db.runAsync('DELETE FROM clients');

      for (const client of backup.clients) {
        await db.runAsync(
          'INSERT INTO clients (id, name, phone, email, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [client.id, client.name, client.phone, client.email, client.notes, client.created_at, client.updated_at]
        );
      }

      for (const collection of backup.collections) {
        await db.runAsync(
          'INSERT INTO collections (id, client_id, product_name, total_price, num_installments, payments_per_month, payment_days, start_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [collection.id, collection.client_id, collection.product_name, collection.total_price,
           collection.num_installments, collection.payments_per_month, collection.payment_days,
           collection.start_date, collection.status, collection.created_at, collection.updated_at]
        );
      }

      for (const payment of backup.payments) {
        await db.runAsync(
          'INSERT INTO payments (id, collection_id, installment_number, due_date, amount, status, paid_date, paid_amount, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [payment.id, payment.collection_id, payment.installment_number, payment.due_date,
           payment.amount, payment.status, payment.paid_date, payment.paid_amount,
           payment.notes, payment.created_at, payment.updated_at]
        );
      }
    });
    Alert.alert(t('common.success'), t('backup.importSuccess'));
  } catch (error) {
    console.error('Failed to import backup:', error);
    Alert.alert(t('common.error'), t('backup.importFailed'));
  }
}
