import { Request, Response } from 'express';
import { ApiResponse } from '../utils/response';
import { ErrorCode } from '../constants/errorCodes';

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponse.error(
    res,
    404,
    ErrorCode.ROUTE_NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  );
};
