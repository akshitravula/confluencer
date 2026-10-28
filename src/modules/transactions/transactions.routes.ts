import { Router } from 'express';
import { TransactionsController } from './transactions.controller';
import { validate } from '../../middlewares/validate';
import { addTransactionSchema, transactionHistoryQuerySchema } from './transactions.schema';
import { accountIdParamSchema } from '../accounts/accounts.schema';

export const createTransactionsRouter = (controller: TransactionsController = new TransactionsController()): Router => {
  const router = Router();

  // Root /transactions endpoint
  router.post(
    '/',
    validate(addTransactionSchema),
    controller.addTransaction
  );

  return router;
};

export const createAccountTransactionsRouter = (controller: TransactionsController = new TransactionsController()): Router => {
  const router = Router({ mergeParams: true });

  // Nested /accounts/:accountId/transactions
  router.post(
    '/',
    validate(accountIdParamSchema),
    validate(addTransactionSchema),
    controller.addTransaction
  );

  router.get(
    '/',
    validate(accountIdParamSchema),
    validate(transactionHistoryQuerySchema),
    controller.getTransactionHistory
  );

  return router;
};
