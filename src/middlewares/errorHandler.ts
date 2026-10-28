import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../constants/errorCodes';
import { ApiResponse } from '../utils/response';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handled App Errors
  if (err instanceof AppError) {
    ApiResponse.error(res, err.statusCode, err.errorCode, err.message, err.details);
    return;
  }

  // Handle SQLite constraint violations that might slip past app checks (defense-in-depth)
  const errAny = err as any;
  if (errAny.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    if (errAny.message && errAny.message.includes('transfers.reference_id')) {
      ApiResponse.error(
        res,
        409,
        ErrorCode.DUPLICATE_TRANSFER,
        'A transfer with this reference_id already exists'
      );
      return;
    }
    ApiResponse.error(
      res,
      409,
      ErrorCode.DUPLICATE_TRANSACTION,
      'A transaction with this reference_id already exists for this account'
    );
    return;
  }

  if (errAny.code === 'SQLITE_CONSTRAINT_CHECK') {
    ApiResponse.error(
      res,
      422,
      ErrorCode.INSUFFICIENT_FUNDS,
      'Transaction rejected: Insufficient account balance'
    );
    return;
  }

  if (errAny.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    ApiResponse.error(
      res,
      404,
      ErrorCode.ACCOUNT_NOT_FOUND,
      'Referenced account does not exist'
    );
    return;
  }

  // SyntaxError from invalid JSON body
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    ApiResponse.error(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      'Malformed JSON request body'
    );
    return;
  }

  // Unhandled / Internal Server Errors
  console.error('[UNHANDLED_ERROR]', err);
  ApiResponse.error(
    res,
    500,
    ErrorCode.INTERNAL_SERVER_ERROR,
    'An unexpected internal server error occurred'
  );
};
