import { Request, Response, NextFunction } from 'express';
import { TransactionsService } from './transactions.service';
import { ApiResponse } from '../../utils/response';
import { BadRequestError } from '../../errors/AppError';
import { ErrorCode } from '../../constants/errorCodes';

export class TransactionsController {
  constructor(private transactionsService: TransactionsService = new TransactionsService()) {}

  addTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = (req.params.accountId as string) || (req.body.account_id as string);
      if (!accountId) {
        throw new BadRequestError('account_id is required either in the URL route parameter or request body', ErrorCode.VALIDATION_ERROR);
      }

      const { type, amount, description, reference_id } = req.body;
      const result = this.transactionsService.addTransaction(accountId, {
        type,
        amount,
        description,
        reference_id,
      });

      ApiResponse.success(res, result.transaction, 201);
    } catch (error) {
      next(error);
    }
  };

  getTransactionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = req.params.accountId as string;
      const { type, page, limit } = req.query as any;

      const result = this.transactionsService.getTransactionHistory(accountId, {
        type,
        page,
        limit,
      });

      ApiResponse.paginated(res, result.transactions, result.pagination, 200);
    } catch (error) {
      next(error);
    }
  };
}
