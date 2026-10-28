import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../setup';

describe('Accounts API Integration Tests', () => {
  describe('POST /api/v1/accounts', () => {
    it('successfully creates an account with initial balance of 0', async () => {
      const response = await request(testApp)
        .post('/api/v1/accounts')
        .send({ name: 'Alice Smith' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Alice Smith');
      expect(response.body.data.balance).toBe(0);
      expect(response.body.data).toHaveProperty('created_at');
    });

    it('rejects account creation if name is missing', async () => {
      const response = await request(testApp)
        .post('/api/v1/accounts')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects account creation if name is empty or whitespaces only', async () => {
      const response = await request(testApp)
        .post('/api/v1/accounts')
        .send({ name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects client attempt to specify an initial balance', async () => {
      const response = await request(testApp)
        .post('/api/v1/accounts')
        .send({ name: 'Hacker Bob', balance: 1000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('GET /api/v1/accounts/:accountId', () => {
    it('retrieves an existing account by its ID', async () => {
      const createRes = await request(testApp)
        .post('/api/v1/accounts')
        .send({ name: 'Carol Danvers' });

      const accountId = createRes.body.data.id;

      const getRes = await request(testApp).get(`/api/v1/accounts/${accountId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.id).toBe(accountId);
      expect(getRes.body.data.name).toBe('Carol Danvers');
      expect(getRes.body.data.balance).toBe(0);
    });

    it('returns 404 if account does not exist', async () => {
      const nonExistentId = '00000000-0000-4000-8000-000000000000';
      const response = await request(testApp).get(`/api/v1/accounts/${nonExistentId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it('returns 400 if account ID is not a valid UUID', async () => {
      const response = await request(testApp).get('/api/v1/accounts/invalid-uuid-format');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/accounts/:accountId/balance', () => {
    it('retrieves the current balance of an account', async () => {
      const createRes = await request(testApp)
        .post('/api/v1/accounts')
        .send({ name: 'David Miller' });

      const accountId = createRes.body.data.id;

      const balanceRes = await request(testApp).get(`/api/v1/accounts/${accountId}/balance`);
      expect(balanceRes.status).toBe(200);
      expect(balanceRes.body.success).toBe(true);
      expect(balanceRes.body.data).toEqual({
        account_id: accountId,
        balance: 0,
      });
    });

    it('returns 404 when fetching balance for non-existent account', async () => {
      const nonExistentId = '11111111-2222-4333-8444-555555555555';
      const response = await request(testApp).get(`/api/v1/accounts/${nonExistentId}/balance`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });
});
