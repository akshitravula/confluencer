import { v4 as uuidv4 } from 'uuid';
import { AccountsRepository, AccountRow } from './accounts.repository';
import { CurrencyUtil } from '../../utils/currency';
import { NotFoundError } from '../../errors/AppError';
import { ErrorCode } from '../../constants/errorCodes';

export interface AccountResponse {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface BalanceResponse {
  account_id: string;
  balance: number;
}

export class AccountsService {
  constructor(private accountsRepo: AccountsRepository = new AccountsRepository()) {}

  createAccount(name: string): AccountResponse {
    const id = uuidv4();
    const now = new Date().toISOString();

    const row = this.accountsRepo.create({
      id,
      name,
      balance_cents: 0,
      created_at: now,
      updated_at: now,
    });

    return this.mapToResponse(row);
  }

  getAccountById(accountId: string): AccountResponse {
    const row = this.accountsRepo.findById(accountId);
    if (!row) {
      throw new NotFoundError(`Account not found with ID: ${accountId}`, ErrorCode.ACCOUNT_NOT_FOUND);
    }
    return this.mapToResponse(row);
  }

  getBalance(accountId: string): BalanceResponse {
    const row = this.accountsRepo.findById(accountId);
    if (!row) {
      throw new NotFoundError(`Account not found with ID: ${accountId}`, ErrorCode.ACCOUNT_NOT_FOUND);
    }
    return {
      account_id: row.id,
      balance: CurrencyUtil.toAmount(row.balance_cents),
    };
  }

  listAccounts(): AccountResponse[] {
    const rows = this.accountsRepo.listAll();
    return rows.map((r) => this.mapToResponse(r));
  }

  private mapToResponse(row: AccountRow): AccountResponse {
    return {
      id: row.id,
      name: row.name,
      balance: CurrencyUtil.toAmount(row.balance_cents),
      created_at: row.created_at,
    };
  }
}
