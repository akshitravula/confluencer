import { z } from 'zod';

export const createAccountSchema = {
  body: z.object({
    name: z
      .string({
        required_error: 'Account holder name is required',
        invalid_type_error: 'Account holder name must be a string',
      })
      .trim()
      .min(1, 'Account holder name cannot be empty')
      .max(100, 'Account holder name cannot exceed 100 characters'),
    balance: z
      .any()
      .optional()
      .refine((val) => val === undefined, {
        message: 'Client is not permitted to specify an initial balance. Initial balance must always be 0',
      }),
  }),
};

export const accountIdParamSchema = {
  params: z.object({
    accountId: z
      .string({ required_error: 'Account ID is required' })
      .trim()
      .uuid('Account ID must be a valid UUID'),
  }),
};

export type CreateAccountInput = z.infer<typeof createAccountSchema.body>;
