import { Database } from 'better-sqlite3';
import { getDatabase } from '../../database/connection';

export interface TransactionRow {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount_cents: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export class TransactionsRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getDb(): Database {
    return this.db;
  }

  findByAccountAndReference(accountId: string, referenceId: string): TransactionRow | undefined {
    const stmt = this.db.prepare(`
      SELECT id, account_id, type, amount_cents, description, reference_id, created_at
      FROM transactions
      WHERE account_id = ? AND reference_id = ?
    `);
    return stmt.get(accountId, referenceId) as TransactionRow | undefined;
  }

  insert(tx: TransactionRow): void {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (id, account_id, type, amount_cents, description, reference_id, created_at)
      VALUES (@id, @account_id, @type, @amount_cents, @description, @reference_id, @created_at)
    `);
    stmt.run(tx);
  }

  countByAccount(accountId: string, type?: 'credit' | 'debit'): number {
    let sql = 'SELECT COUNT(*) as total FROM transactions WHERE account_id = ?';
    const params: unknown[] = [accountId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as { total: number };
    return row.total;
  }

  listByAccount(
    accountId: string,
    options: { type?: 'credit' | 'debit'; offset: number; limit: number }
  ): TransactionRow[] {
    let sql = `
      SELECT id, account_id, type, amount_cents, description, reference_id, created_at
      FROM transactions
      WHERE account_id = ?
    `;
    const params: unknown[] = [accountId];

    if (options.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
    params.push(options.limit, options.offset);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as TransactionRow[];
  }
}
