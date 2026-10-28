import { Response } from 'express';

export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
    });
  }

  static paginated<T>(res: Response, data: T[], pagination: PaginationMeta, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      pagination,
    });
  }

  static error(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
    return res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    });
  }
}
