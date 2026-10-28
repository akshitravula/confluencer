import { z } from 'zod';

export const transferMoneySchema = {
  body: z
    .object({
      source_account_id: z
        .string({ required_error: 'source_account_id is required' })
        .trim()
        .uuid('source_account_id must be a valid UUID'),
      destination_account_id: z
        .string({ required_error: 'destination_account_id is required' })
        .trim()
        .uuid('destination_account_id must be a valid UUID'),
      amount: z
        .number({
          required_error: 'Transfer amount is required',
          invalid_type_error: 'Transfer amount must be a number',
        })
        .positive('Transfer amount must be greater than 0')
        .refine(
          (val) => {
            const parts = val.toString().split('.');
            return parts.length <= 1 || parts[1].length <= 2;
          },
          { message: 'Transfer amount cannot have more than 2 decimal places' }
        ),
      reference_id: z
        .string({
          required_error: 'reference_id is required',
          invalid_type_error: 'reference_id must be a string',
        })
        .trim()
        .min(1, 'reference_id cannot be empty')
        .max(100, 'reference_id cannot exceed 100 characters'),
      description: z
        .string({
          required_error: 'Transfer description is required',
          invalid_type_error: 'Transfer description must be a string',
        })
        .trim()
        .min(1, 'Transfer description cannot be empty')
        .max(255, 'Transfer description cannot exceed 255 characters'),
    })
    .refine((data) => data.source_account_id !== data.destination_account_id, {
      message: 'Source and destination accounts cannot be the same',
      path: ['destination_account_id'],
    }),
};

export type TransferMoneyInput = z.infer<typeof transferMoneySchema.body>;
