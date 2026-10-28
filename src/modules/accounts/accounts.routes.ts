import { Router } from 'express';
import { AccountsController } from './accounts.controller';
import { validate } from '../../middlewares/validate';
import { createAccountSchema, accountIdParamSchema } from './accounts.schema';

export const createAccountsRouter = (controller: AccountsController = new AccountsController()): Router => {
  const router = Router();

  router.post('/', validate(createAccountSchema), controller.createAccount);
  router.get('/', controller.listAccounts);
  router.get('/:accountId', validate(accountIdParamSchema), controller.getAccount);
  router.get('/:accountId/balance', validate(accountIdParamSchema), controller.getBalance);

  return router;
};
