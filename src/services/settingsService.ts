import { dbQuery } from '../database/database';

let tableReady = false;

export async function getSetting(key: string): Promise<string | null> {
  if (!tableReady) {
    await dbQuery(async (db) => {
      await db.runAsync('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)');
    });
    tableReady = true;
  }
  return dbQuery(async (db) => {
    const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
    return row?.value ?? null;
  });
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!tableReady) {
    await dbQuery(async (db) => {
      await db.runAsync('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)');
    });
    tableReady = true;
  }
  return dbQuery(async (db) => {
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
  });
}
