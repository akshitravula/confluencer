import { v4 as uuidv4 } from 'uuid';
import { TransactionsRepository, TransactionRow } from './transactions.repository';
import { AccountsRepository } from '../accounts/accounts.repository';
import { CurrencyUtil } from '../../utils/currency';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../../errors/AppError';
import { ErrorCode } from '../../constants/errorCodes';
import { PaginationMeta } from '../../utils/response';

export interface TransactionResponse {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  reference_id: string;
  created_at: string;
}

export interface AddTransactionResult {
  transaction: TransactionResponse;
  current_balance: number;
}

export class TransactionsService {
  constructor(
    private transactionsRepo: TransactionsRepository = new TransactionsRepository(),
    private accountsRepo: AccountsRepository = new AccountsRepository()
  ) {}

  addTransaction(
    accountId: string,
    input: {
      type: 'credit' | 'debit';
      amount: number;
      description: string;
      reference_id: string;
    }
  ): AddTransactionResult {
    const db = this.transactionsRepo.getDb();
    const amountCents = CurrencyUtil.toCents(input.amount);
    const now = new Date().toISOString();
    const transactionId = uuidv4();

    const execute = db.transaction(() => {
      const account = this.accountsRepo.findById(accountId);
      if (!account) {
        throw new NotFoundError(`Account not found with ID: ${accountId}`, ErrorCode.ACCOUNT_NOT_FOUND);
      }

      const existingTx = this.transactionsRepo.findByAccountAndReference(accountId, input.reference_id);
      if (existingTx) {
        throw new ConflictError(
          `A transaction with reference_id '${input.reference_id}' already exists for account '${accountId}'`,
          ErrorCode.DUPLICATE_TRANSACTION,
          {
            existing_transaction: this.mapToResponse(existingTx),
          }
        );
      }

      let newBalanceCents: number;
      if (input.type === 'credit') {
        newBalanceCents = account.balance_cents + amountCents;
      } else {
        if (account.balance_cents < amountCents) {
          throw new UnprocessableEntityError(
            `Transaction rejected: Insufficient balance. Current balance is ${CurrencyUtil.toAmount(
              account.balance_cents
            )}, but attempted to debit ${input.amount}`,
            ErrorCode.INSUFFICIENT_FUNDS,
            {
              current_balance: CurrencyUtil.toAmount(account.balance_cents),
              attempted_debit: input.amount,
            }
          );
        }
        newBalanceCents = account.balance_cents - amountCents;
      }

      const newTx: TransactionRow = {
        id: transactionId,
        account_id: accountId,
        type: input.type,
        amount_cents: amountCents,
        description: input.description,
        reference_id: input.reference_id,
        created_at: now,
      };
      this.transactionsRepo.insert(newTx);
      this.accountsRepo.updateBalance(accountId, newBalanceCents, now);

      return {
        transaction: this.mapToResponse(newTx),
        current_balance: CurrencyUtil.toAmount(newBalanceCents),
      };
    }).immediate;

    return execute();
  }

  getTransactionHistory(
    accountId: string,
    options: {
      type?: 'credit' | 'debit';
      page?: number;
      limit?: number;
    }
  ): { transactions: TransactionResponse[]; pagination: PaginationMeta } {
    const account = this.accountsRepo.findById(accountId);
    if (!account) {
      throw new NotFoundError(`Account not found with ID: ${accountId}`, ErrorCode.ACCOUNT_NOT_FOUND);
    }

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 10;
    const offset = (page - 1) * limit;

    const totalRecords = this.transactionsRepo.countByAccount(accountId, options.type);
    const rows = this.transactionsRepo.listByAccount(accountId, {
      type: options.type,
      offset,
      limit,
    });

    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    return {
      transactions: rows.map((r) => this.mapToResponse(r)),
      pagination: {
        current_page: page,
        page_size: limit,
        total_records: totalRecords,
        total_pages: totalPages,
      },
    };
  }

  private mapToResponse(row: TransactionRow): TransactionResponse {
    return {
      id: row.id,
      account_id: row.account_id,
      type: row.type,
      amount: CurrencyUtil.toAmount(row.amount_cents),
      description: row.description,
      reference_id: row.reference_id,
      created_at: row.created_at,
    };
  }
}
