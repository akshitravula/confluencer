import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'ledger.db'),
  isTest: process.env.NODE_ENV === 'test',
};
