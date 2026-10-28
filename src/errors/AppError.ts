import { ErrorCode } from '../constants/errorCodes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;

  constructor(statusCode: number, errorCode: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.ACCOUNT_NOT_FOUND) {
    super(404, errorCode, message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.VALIDATION_ERROR, details?: unknown) {
    super(400, errorCode, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.DUPLICATE_TRANSACTION, details?: unknown) {
    super(409, errorCode, message, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string, errorCode: ErrorCode = ErrorCode.INSUFFICIENT_FUNDS, details?: unknown) {
    super(422, errorCode, message, details);
  }
}
