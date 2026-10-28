import Database, { Database as DatabaseType } from 'better-sqlite3';
import { config } from '../config/env';
import { SCHEMA_SQL } from './schema';

let dbInstance: DatabaseType | null = null;

export function getDatabase(customPath?: string): DatabaseType {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  // If opening with custom path, close existing connection cleanly
  if (dbInstance && customPath) {
    try {
      dbInstance.close();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }

  const targetPath = customPath || config.dbPath;
  const db = new Database(targetPath);

  // Enforce WAL mode, busy timeout, and strict foreign keys
  if (targetPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // Execute schema initialization
  db.exec(SCHEMA_SQL);

  dbInstance = db;
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }
}

export function resetDatabase(db: DatabaseType): void {
  db.exec(`
    DELETE FROM transfers;
    DELETE FROM transactions;
    DELETE FROM accounts;
  `);
}
