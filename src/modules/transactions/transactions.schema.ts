import { z } from 'zod';

export const addTransactionSchema = {
  body: z.object({
    account_id: z
      .string()
      .trim()
      .uuid('account_id must be a valid UUID')
      .optional(),
    type: z.enum(['credit', 'debit'], {
      errorMap: () => ({ message: "Transaction type must be either 'credit' or 'debit'" }),
    }),
    amount: z
      .number({
        required_error: 'Transaction amount is required',
        invalid_type_error: 'Transaction amount must be a number',
      })
      .positive('Transaction amount must be greater than 0')
      .refine(
        (val) => {
          const parts = val.toString().split('.');
          return parts.length <= 1 || parts[1].length <= 2;
        },
        { message: 'Transaction amount cannot have more than 2 decimal places' }
      ),
    description: z
      .string({
        required_error: 'Transaction description is required',
        invalid_type_error: 'Transaction description must be a string',
      })
      .trim()
      .min(1, 'Transaction description cannot be empty')
      .max(255, 'Transaction description cannot exceed 255 characters'),
    reference_id: z
      .string({
        required_error: 'reference_id is required',
        invalid_type_error: 'reference_id must be a string',
      })
      .trim()
      .min(1, 'reference_id cannot be empty')
      .max(100, 'reference_id cannot exceed 100 characters'),
  }),
};

export const transactionHistoryQuerySchema = {
  query: z.object({
    type: z
      .enum(['credit', 'debit'], {
        errorMap: () => ({ message: "Filter type must be either 'credit' or 'debit'" }),
      })
      .optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().min(1, 'Page must be an integer >= 1')),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .pipe(z.number().int().min(1, 'Limit must be an integer >= 1').max(100, 'Limit cannot exceed 100')),
  }),
};

export type AddTransactionInput = z.infer<typeof addTransactionSchema.body>;
export type TransactionHistoryQuery = z.infer<typeof transactionHistoryQuerySchema.query>;
