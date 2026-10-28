import { v4 as uuidv4 } from 'uuid';
import { TransfersRepository, TransferRow } from './transfers.repository';
import { AccountsRepository } from '../accounts/accounts.repository';
import { TransactionsRepository, TransactionRow } from '../transactions/transactions.repository';
import { CurrencyUtil } from '../../utils/currency';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../../errors/AppError';
import { ErrorCode } from '../../constants/errorCodes';

export interface TransferResponse {
  id: string;
  source_account_id: string;
  destination_account_id: string;
  amount: number;
  reference_id: string;
  description: string;
  source_balance: number;
  destination_balance: number;
  created_at: string;
}

export class TransfersService {
  constructor(
    private transfersRepo: TransfersRepository = new TransfersRepository(),
    private accountsRepo: AccountsRepository = new AccountsRepository(),
    private transactionsRepo: TransactionsRepository = new TransactionsRepository()
  ) {}

  transferMoney(input: {
    source_account_id: string;
    destination_account_id: string;
    amount: number;
    reference_id: string;
    description: string;
  }): TransferResponse {
    const db = this.transfersRepo.getDb();
    const amountCents = CurrencyUtil.toCents(input.amount);
    const now = new Date().toISOString();
    const transferId = uuidv4();

    const execute = db.transaction(() => {
      const sourceAccount = this.accountsRepo.findById(input.source_account_id);
      if (!sourceAccount) {
        throw new NotFoundError(
          `Source account not found with ID: ${input.source_account_id}`,
          ErrorCode.SOURCE_ACCOUNT_NOT_FOUND
        );
      }

      const destAccount = this.accountsRepo.findById(input.destination_account_id);
      if (!destAccount) {
        throw new NotFoundError(
          `Destination account not found with ID: ${input.destination_account_id}`,
          ErrorCode.DESTINATION_ACCOUNT_NOT_FOUND
        );
      }

      const existingTransfer = this.transfersRepo.findByReference(input.reference_id);
      if (existingTransfer) {
        throw new ConflictError(
          `A transfer with reference_id '${input.reference_id}' already exists`,
          ErrorCode.DUPLICATE_TRANSFER,
          {
            existing_transfer: this.mapToResponse(existingTransfer, sourceAccount.balance_cents, destAccount.balance_cents),
          }
        );
      }

      if (sourceAccount.balance_cents < amountCents) {
        throw new UnprocessableEntityError(
          `Transfer rejected: Source account has insufficient balance. Current balance is ${CurrencyUtil.toAmount(
            sourceAccount.balance_cents
          )}, requested transfer: ${input.amount}`,
          ErrorCode.INSUFFICIENT_FUNDS,
          {
            source_balance: CurrencyUtil.toAmount(sourceAccount.balance_cents),
            requested_amount: input.amount,
          }
        );
      }

      const newSourceBalanceCents = sourceAccount.balance_cents - amountCents;
      const newDestBalanceCents = destAccount.balance_cents + amountCents;

      const sourceTx: TransactionRow = {
        id: uuidv4(),
        account_id: input.source_account_id,
        type: 'debit',
        amount_cents: amountCents,
        description: `Transfer to ${destAccount.name}: ${input.description}`,
        reference_id: `transfer:${input.reference_id}:debit`,
        created_at: now,
      };
      this.transactionsRepo.insert(sourceTx);

      const destTx: TransactionRow = {
        id: uuidv4(),
        account_id: input.destination_account_id,
        type: 'credit',
        amount_cents: amountCents,
        description: `Transfer from ${sourceAccount.name}: ${input.description}`,
        reference_id: `transfer:${input.reference_id}:credit`,
        created_at: now,
      };
      this.transactionsRepo.insert(destTx);

      this.accountsRepo.updateBalance(input.source_account_id, newSourceBalanceCents, now);
      this.accountsRepo.updateBalance(input.destination_account_id, newDestBalanceCents, now);

      const transferRow: TransferRow = {
        id: transferId,
        source_account_id: input.source_account_id,
        destination_account_id: input.destination_account_id,
        amount_cents: amountCents,
        reference_id: input.reference_id,
        description: input.description,
        created_at: now,
      };
      this.transfersRepo.insert(transferRow);

      return {
        id: transferRow.id,
        source_account_id: transferRow.source_account_id,
        destination_account_id: transferRow.destination_account_id,
        amount: CurrencyUtil.toAmount(transferRow.amount_cents),
        reference_id: transferRow.reference_id,
        description: transferRow.description,
        source_balance: CurrencyUtil.toAmount(newSourceBalanceCents),
        destination_balance: CurrencyUtil.toAmount(newDestBalanceCents),
        created_at: transferRow.created_at,
      };
    }).immediate;

    return execute();
  }

  private mapToResponse(
    row: TransferRow,
    sourceBalanceCents: number,
    destBalanceCents: number
  ): TransferResponse {
    return {
      id: row.id,
      source_account_id: row.source_account_id,
      destination_account_id: row.destination_account_id,
      amount: CurrencyUtil.toAmount(row.amount_cents),
      reference_id: row.reference_id,
      description: row.description,
      source_balance: CurrencyUtil.toAmount(sourceBalanceCents),
      destination_balance: CurrencyUtil.toAmount(destBalanceCents),
      created_at: row.created_at,
    };
  }
}
