import { Database } from 'better-sqlite3';
import { getDatabase } from '../../database/connection';

export interface TransferRow {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount_cents: number;
  reference_id: string;
  description: string;
  created_at: string;
}

export class TransfersRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getDb(): Database {
    return this.db;
  }

  findByReference(referenceId: string): TransferRow | undefined {
    const stmt = this.db.prepare(`
      SELECT id, source_account_id, destination_account_id, amount_cents, reference_id, description, created_at
      FROM transfers
      WHERE reference_id = ?
    `);
    return stmt.get(referenceId) as TransferRow | undefined;
  }

  findById(id: string): TransferRow | undefined {
    const stmt = this.db.prepare(`
      SELECT id, source_account_id, destination_account_id, amount_cents, reference_id, description, created_at
      FROM transfers
      WHERE id = ?
    `);
    return stmt.get(id) as TransferRow | undefined;
  }

  insert(transfer: TransferRow): void {
    const stmt = this.db.prepare(`
      INSERT INTO transfers (id, source_account_id, destination_account_id, amount_cents, reference_id, description, created_at)
      VALUES (@id, @source_account_id, @destination_account_id, @amount_cents, @reference_id, @description, @created_at)
    `);
    stmt.run(transfer);
  }
}
