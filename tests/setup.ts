import { beforeAll, beforeEach, afterAll } from 'vitest';
import { getDatabase, closeDatabase, resetDatabase } from '../src/database/connection';
import { createApp } from '../src/app';
import { Application } from 'express';

export let testApp: Application;
export let testDb: any;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  testDb = getDatabase(':memory:');
  testApp = createApp();
});

beforeEach(() => {
  resetDatabase(testDb);
});

afterAll(() => {
  closeDatabase();
});
