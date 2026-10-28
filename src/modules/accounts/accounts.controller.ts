import { Request, Response, NextFunction } from 'express';
import { AccountsService } from './accounts.service';
import { ApiResponse } from '../../utils/response';

export class AccountsController {
  constructor(private accountsService: AccountsService = new AccountsService()) {}

  createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name } = req.body;
      const account = this.accountsService.createAccount(name);
      ApiResponse.success(res, account, 201);
    } catch (error) {
      next(error);
    }
  };

  getAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = req.params.accountId as string;
      const account = this.accountsService.getAccountById(accountId);
      ApiResponse.success(res, account, 200);
    } catch (error) {
      next(error);
    }
  };

  getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = req.params.accountId as string;
      const balance = this.accountsService.getBalance(accountId);
      ApiResponse.success(res, balance, 200);
    } catch (error) {
      next(error);
    }
  };

  listAccounts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = this.accountsService.listAccounts();
      ApiResponse.success(res, accounts, 200);
    } catch (error) {
      next(error);
    }
  };
}
