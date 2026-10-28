import { Database } from 'better-sqlite3';
import { getDatabase } from '../../database/connection';

export interface AccountRow {
  id: string;
  name: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

export class AccountsRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  create(account: {
    id: string;
    name: string;
    balance_cents: number;
    created_at: string;
    updated_at: string;
  }): AccountRow {
    const stmt = this.db.prepare(`
      INSERT INTO accounts (id, name, balance_cents, created_at, updated_at)
      VALUES (@id, @name, @balance_cents, @created_at, @updated_at)
    `);
    stmt.run(account);
    return account;
  }

  findById(id: string): AccountRow | undefined {
    const stmt = this.db.prepare(`
      SELECT id, name, balance_cents, created_at, updated_at
      FROM accounts
      WHERE id = ?
    `);
    return stmt.get(id) as AccountRow | undefined;
  }

  updateBalance(id: string, newBalanceCents: number, updatedAt: string): void {
    const stmt = this.db.prepare(`
      UPDATE accounts
      SET balance_cents = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(newBalanceCents, updatedAt, id);
  }

  listAll(): AccountRow[] {
    const stmt = this.db.prepare(`
      SELECT id, name, balance_cents, created_at, updated_at
      FROM accounts
      ORDER BY created_at DESC
    `);
    return stmt.all() as AccountRow[];
  }
}
