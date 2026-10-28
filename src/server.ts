import { createApp } from './app';
import { config } from './config/env';
import { getDatabase } from './database/connection';

const app = createApp();

getDatabase();

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port} (${config.env})`);
  console.log(`Docs: http://localhost:${config.port}/docs`);
  console.log(`Health: http://localhost:${config.port}/health`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
