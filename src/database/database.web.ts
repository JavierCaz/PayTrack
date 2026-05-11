const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  blacklisted INTEGER DEFAULT 0,
  blacklist_note TEXT DEFAULT '',
  default_recurrence TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  total_price REAL NOT NULL,
  num_installments INTEGER NOT NULL DEFAULT 12,
  payments_per_month INTEGER NOT NULL DEFAULT 2,
  payment_days TEXT NOT NULL DEFAULT '1,15',
  start_date TEXT NOT NULL,
  installment_amount REAL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  installment_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date TEXT,
  paid_amount REAL,
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);
`;

type Row = Record<string, any>;
type Table = Map<string, Row>;

function parseSelect(sql: string, params?: any[]): Row[] {
  const match = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?(?:\s+ORDER\s+BY\s+(.*?))?(?:\s+ASC|DESC)?(?:\s+LIMIT\s+(\d+))?/i);
  if (!match) return [];

  const [, , tableName, whereClause, orderBy, limit] = match;
  const table = tables.get(tableName);
  if (!table) return [];

  let rows = Array.from(table.values());

  if (whereClause) {
    rows = rows.filter(row => evaluateWhere(whereClause, row, params || []));
  }

  if (orderBy) {
    const field = orderBy.trim();
    rows.sort((a, b) => {
      if ((a[field] || '') < (b[field] || '')) return -1;
      if ((a[field] || '') > (b[field] || '')) return 1;
      return 0;
    });
  }

  if (limit) {
    rows = rows.slice(0, parseInt(limit));
  }

  return rows;
}

function evaluateWhere(clause: string, row: Row, params: any[]): boolean {
  const patterns = [
    { regex: /(\w+)\s*(=|!=|<=|>=|<|>|LIKE|IN)\s*\?/g, handler: (field: string, op: string, paramIdx: number) => {
      const val = params[paramIdx];
      const rowVal = row[field];
      if (val === undefined || val === null) return false;
      switch (op) {
        case '=': return rowVal == val; // eslint-disable-line eqeqeq
        case '!=': return rowVal != val; // eslint-disable-line eqeqeq
        case '<': return rowVal < val;
        case '>': return rowVal > val;
        case '<=': return rowVal <= val;
        case '>=': return rowVal >= val;
        case 'LIKE': return String(rowVal).toLowerCase().includes(String(val).replace(/%/g, '').toLowerCase());
        default: return true;
      }
    }},
  ];

  let paramIdx = 0;
  for (const { regex, handler } of patterns) {
    let m;
    while ((m = regex.exec(clause)) !== null) {
      if (!handler(m[1], m[2], paramIdx)) return false;
      paramIdx++;
    }
  }
  return true;
}

const tables = new Map<string, Table>();

class InMemoryDb {
  async execAsync(sql: string): Promise<void> {
    if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match && !tables.has(match[1])) {
        tables.set(match[1], new Map());
      }
    }
  }

  async runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }> {
    if (sql.startsWith('INSERT')) {
      const match = sql.match(/INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)/i);
      if (match) {
        const tableName = match[1];
        const fields = match[2].split(',').map(f => f.trim());
        const placeholders = match[3].split(',').map(p => p.trim());
        let table = tables.get(tableName);
        if (!table) { table = new Map(); tables.set(tableName, table); }

        const row: Row = {};
        fields.forEach((field, i) => {
          row[field] = placeholders[i] === '?' ? (params ? params[i] : null) : placeholders[i];
        });
        const id = row.id || String(Date.now());
        table.set(id, row);
      }
    } else if (sql.startsWith('UPDATE')) {
      const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.*?)(?:\s+WHERE\s+(.*))?/i);
      if (match) {
        const tableName = match[1];
        const setClause = match[2];
        const whereClause = match[3];
        const table = tables.get(tableName);
        if (!table) return { lastInsertRowId: 0, changes: 0 };

        const setPairs = setClause.split(',').map(s => {
          const [f, ...v] = s.trim().split('=');
          return { field: f.trim(), value: v.join('=').trim() };
        });

        let changes = 0;
        table.forEach((row, id) => {
          if (!whereClause || evaluateWhere(whereClause, row, params || [])) {
            setPairs.forEach(({ field, value }) => {
              row[field] = value === '?' ? (params ? params[params.length - 1] : null) : value.replace(/'/g, '');
            });
            changes++;
          }
        });
        return { lastInsertRowId: 0, changes };
      }
    } else if (sql.startsWith('DELETE')) {
      const match = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.*))?/i);
      if (match) {
        const tableName = match[1];
        const whereClause = match[2];
        const table = tables.get(tableName);
        if (!table) return { lastInsertRowId: 0, changes: 0 };

        let changes = 0;
        table.forEach((row, id) => {
          if (!whereClause || evaluateWhere(whereClause, row, params || [])) {
            table.delete(id);
            changes++;
          }
        });
        return { lastInsertRowId: 0, changes };
      }
    } else if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
      // no-op for web mock
    }
    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync(sql: string, params?: any[]): Promise<Row[]> {
    if (sql.startsWith('SELECT')) {
      return parseSelect(sql, params);
    }
    return [];
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<Row | null> {
    const rows = await this.getAllAsync(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }
}

const db = new InMemoryDb();

export type { InMemoryDb as SQLiteDatabase };

export async function getDb(): Promise<InMemoryDb> {
  return db;
}

export async function dbQuery<T>(
  fn: (d: InMemoryDb) => Promise<T>
): Promise<T> {
  return fn(await getDb());
}

export async function withTransaction<T>(
  fn: (db: InMemoryDb) => Promise<T>
): Promise<T> {
  return fn(await getDb());
}

export function startDbKeepAlive(): void {
  // no-op: no native SQLite connection to keep alive on web
}

export function stopDbKeepAlive(): void {
  // no-op: no native SQLite connection to keep alive on web
}

export async function initDatabase(): Promise<void> {
  await db.execAsync(SCHEMA);
}
