import { Request, Response, NextFunction } from 'express';
import { TransfersService } from './transfers.service';
import { ApiResponse } from '../../utils/response';

export class TransfersController {
  constructor(private transfersService: TransfersService = new TransfersService()) {}

  transferMoney = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { source_account_id, destination_account_id, amount, reference_id, description } = req.body;
      const transfer = this.transfersService.transferMoney({
        source_account_id,
        destination_account_id,
        amount,
        reference_id,
        description,
      });

      ApiResponse.success(res, transfer, 201);
    } catch (error) {
      next(error);
    }
  };
}
