import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env';
import { swaggerDocument } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFound';

import { createAccountsRouter } from './modules/accounts/accounts.routes';
import {
  createAccountTransactionsRouter,
  createTransactionsRouter,
} from './modules/transactions/transactions.routes';
import { createTransfersRouter } from './modules/transfers/transfers.routes';

export function createApp(): Application {
  const app = express();

  // Security and standard middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Logging (suppressed in tests)
  if (!config.isTest) {
    app.use(morgan('combined'));
  }

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
  });

  // Swagger Documentation endpoints
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  // API v1 Routes
  app.use('/api/v1/accounts', createAccountsRouter());
  app.use('/api/v1/accounts/:accountId/transactions', createAccountTransactionsRouter());
  app.use('/api/v1/transactions', createTransactionsRouter());
  app.use('/api/v1/transfers', createTransfersRouter());

  // 404 Handler
  app.use(notFoundHandler);

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
}
