import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export type { SQLiteDatabase };

let db: SQLiteDatabase | null = null;
let dbOpenPromise: Promise<SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (db) return db;
  // Serialize concurrent open calls so only one openDatabaseAsync runs at a time
  if (!dbOpenPromise) {
    dbOpenPromise = openDatabaseAsync('paytrack.db').then(async (opened) => {
      // WAL mode gives better concurrency and crash recovery on Android
      await opened.runAsync('PRAGMA journal_mode=WAL');
      await opened.runAsync('PRAGMA foreign_keys=ON');
      db = opened;
      dbOpenPromise = null;
      return db;
    }).catch((err) => {
      dbOpenPromise = null;
      throw err;
    });
  }
  return dbOpenPromise;
}

async function reopenDb(): Promise<SQLiteDatabase> {
  try { if (db) await db.closeAsync(); } catch (_) {}
  db = null;
  dbOpenPromise = null;
  return getDb();
}

export async function withTransaction<T>(
  fn: (db: SQLiteDatabase) => Promise<T>
): Promise<T> {
  return dbQuery(async (db) => {
    await db.runAsync('BEGIN IMMEDIATE');
    try {
      const result = await fn(db);
      await db.runAsync('COMMIT');
      return result;
    } catch (err) {
      try { await db.runAsync('ROLLBACK'); } catch (_) {}
      throw err;
    }
  });
}

export async function dbQuery<T>(
  fn: (d: SQLiteDatabase) => Promise<T>
): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await fn(await getDb());
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || err);
      if (msg.includes('NullPointerException') || msg.includes('prepareAsync') || msg.includes('runAsync')) {
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        await reopenDb();
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

export function startDbKeepAlive(): void {
  if (keepAliveTimer) return;
  // Ping every 30 s to prevent Android from dropping the idle SQLite connection
  keepAliveTimer = setInterval(async () => {
    try {
      await dbQuery(async (database) => {
        await database.getFirstAsync('SELECT 1');
      });
    } catch (_) {}
  }, 30_000);
}

export function stopDbKeepAlive(): void {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

export async function initDatabase(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT DEFAULT '',
      email TEXT DEFAULT '', notes TEXT DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL,
      product_name TEXT NOT NULL, total_price REAL NOT NULL,
      num_installments INTEGER NOT NULL DEFAULT 12,
      payment_days TEXT NOT NULL DEFAULT '1,15',
      start_date TEXT NOT NULL, installment_amount REAL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, collection_id TEXT NOT NULL,
      installment_number INTEGER NOT NULL, due_date TEXT NOT NULL,
      amount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      paid_date TEXT, paid_amount REAL, notes TEXT DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS idx_collections_client_id ON collections(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_collection_id ON payments(collection_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date)',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
  ];
  // Run schema setup inside dbQuery so any connection failure triggers auto-reopen
  await dbQuery(async (database) => {
    for (const sql of statements) {
      await database.runAsync(sql);
    }
    // Migrations for new columns added after initial schema
    try { await database.runAsync('ALTER TABLE clients ADD COLUMN blacklisted INTEGER DEFAULT 0'); } catch (_) {}
    try { await database.runAsync('ALTER TABLE clients ADD COLUMN blacklist_note TEXT DEFAULT \'\''); } catch (_) {}
    try { await database.runAsync('ALTER TABLE clients ADD COLUMN default_recurrence TEXT'); } catch (_) {}
    try { await database.runAsync('ALTER TABLE clients ADD COLUMN placeholder_name TEXT DEFAULT \'\''); } catch (_) {}
    try { await database.runAsync('ALTER TABLE collections ADD COLUMN installment_amount REAL'); } catch (_) {}
    try { await database.runAsync('ALTER TABLE collections DROP COLUMN payments_per_month'); } catch (_) {}
    try { await database.runAsync('ALTER TABLE collections ADD COLUMN conversion_rate REAL DEFAULT 1.0'); } catch (_) {}
    try { await database.runAsync('ALTER TABLE collections ADD COLUMN interest_rate REAL'); } catch (_) {}
    try { await database.runAsync('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)'); } catch (_) {}
    try { await database.runAsync("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('interest_percentage', '0.35')"); } catch (_) {}
  });
}
