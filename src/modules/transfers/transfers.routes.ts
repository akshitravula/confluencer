import { Router } from 'express';
import { TransfersController } from './transfers.controller';
import { validate } from '../../middlewares/validate';
import { transferMoneySchema } from './transfers.schema';

export const createTransfersRouter = (controller: TransfersController = new TransfersController()): Router => {
  const router = Router();

  router.post('/', validate(transferMoneySchema), controller.transferMoney);

  return router;
};
