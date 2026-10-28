import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../setup';

describe('Transactions API Integration Tests', () => {
  let testAccountId: string;

  beforeEach(async () => {
    const res = await request(testApp)
      .post('/api/v1/accounts')
      .send({ name: 'Testing Account' });
    testAccountId = res.body.data.id;
  });

  describe('Credit & Debit Core Logic', () => {
    it('accurately credits an account and updates balance', async () => {
      // Step 1: Initial credit of 100
      const tx1 = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          description: 'Initial funding',
          reference_id: 'REF-TX-001',
        });

      expect(tx1.status).toBe(201);
      expect(tx1.body.success).toBe(true);
      expect(tx1.body.data.amount).toBe(100);

      // Verify balance is 100
      const bal1 = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(bal1.body.data.balance).toBe(100);

      const tx2 = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 50,
          description: 'Bonus credit',
          reference_id: 'REF-TX-002',
        });

      expect(tx2.status).toBe(201);

      const bal2 = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(bal2.body.data.balance).toBe(150);
    });

    it('accurately debits an account when sufficient balance exists', async () => {
      // Setup balance of 100
      await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          description: 'Deposit',
          reference_id: 'REF-DEP-001',
        });

      // Debit 30 from current 100 balance
      const debitRes = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 30,
          description: 'Coffee purchase',
          reference_id: 'REF-DEB-001',
        });

      expect(debitRes.status).toBe(201);
      expect(debitRes.body.data.type).toBe('debit');
      expect(debitRes.body.data.amount).toBe(30);

      const balRes = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(70);
    });

    it('rejects debit when balance is insufficient, leaving balance untouched', async () => {
      // Setup balance of 100
      await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          description: 'Initial Deposit',
          reference_id: 'REF-INIT',
        });

      // Overdraft debit should fail
      const debitRes = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'debit',
          amount: 150,
          description: 'Large purchase',
          reference_id: 'REF-OVERDRAFT',
        });

      expect(debitRes.status).toBe(422);
      expect(debitRes.body.success).toBe(false);
      expect(debitRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

      // Verify balance remains strictly 100
      const balRes = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(100);

      // Verify transaction was not created in history
      const historyRes = await request(testApp).get(`/api/v1/accounts/${testAccountId}/transactions`);
      expect(historyRes.body.pagination.total_records).toBe(1);
    });

    it('works via root /transactions endpoint with account_id in body', async () => {
      const res = await request(testApp)
        .post('/api/v1/transactions')
        .send({
          account_id: testAccountId,
          type: 'credit',
          amount: 88.5,
          description: 'Direct transaction API call',
          reference_id: 'REF-DIRECT-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.account_id).toBe(testAccountId);
      expect(res.body.data.amount).toBe(88.5);

      const balRes = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(88.5);
    });
  });

  describe('Duplicate Transactions (Idempotency)', () => {
    it('rejects duplicate transaction with same reference_id for same account', async () => {
      const payload = {
        type: 'credit',
        amount: 50,
        description: 'First attempt',
        reference_id: 'DUP-REF-100',
      };

      // First submission
      const firstRes = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send(payload);
      expect(firstRes.status).toBe(201);

      // Duplicate submission
      const secondRes = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send(payload);

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.error.code).toBe('DUPLICATE_TRANSACTION');
      expect(secondRes.body.error.details).toHaveProperty('existing_transaction');

      // Balance must NOT have increased twice
      const balRes = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(50);
    });

    it('permits same reference_id to be used across DIFFERENT accounts', async () => {
      // Create second account
      const acc2 = await request(testApp)
        .post('/api/v1/accounts')
        .send({ name: 'Second Account' });
      const account2Id = acc2.body.data.id;

      const sharedRefId = 'SHARED-REF-200';

      // Submit to account 1
      const res1 = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 40,
          description: 'Account 1 payment',
          reference_id: sharedRefId,
        });
      expect(res1.status).toBe(201);

      // Submit with same reference_id to account 2
      const res2 = await request(testApp)
        .post(`/api/v1/accounts/${account2Id}/transactions`)
        .send({
          type: 'credit',
          amount: 90,
          description: 'Account 2 payment',
          reference_id: sharedRefId,
        });
      expect(res2.status).toBe(201);
    });
  });

  describe('Transaction History, Filtering, Pagination, Sorting', () => {
    beforeEach(async () => {
      // Seed 4 transactions:
      // Initial: 0
      // Credit 100
      // Credit 50
      // Debit 30
      // Debit 20
      // Expected balance: 100
      await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: 100, description: 'Credit 1', reference_id: 'SEED-1' });

      await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({ type: 'credit', amount: 50, description: 'Credit 2', reference_id: 'SEED-2' });

      await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({ type: 'debit', amount: 30, description: 'Debit 1', reference_id: 'SEED-3' });

      await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({ type: 'debit', amount: 20, description: 'Debit 2', reference_id: 'SEED-4' });
    });

    it('verifies balance consistency matching the spec example', async () => {
      const balRes = await request(testApp).get(`/api/v1/accounts/${testAccountId}/balance`);
      expect(balRes.body.data.balance).toBe(100);
    });

    it('returns all transactions sorted latest-first when no filter is provided', async () => {
      const res = await request(testApp).get(`/api/v1/accounts/${testAccountId}/transactions`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.pagination.total_records).toBe(4);

      // Latest first order
      expect(res.body.data[0].reference_id).toBe('SEED-4');
      expect(res.body.data[1].reference_id).toBe('SEED-3');
      expect(res.body.data[2].reference_id).toBe('SEED-2');
      expect(res.body.data[3].reference_id).toBe('SEED-1');
    });

    it('filters transactions by type=credit', async () => {
      const res = await request(testApp).get(
        `/api/v1/accounts/${testAccountId}/transactions?type=credit`
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total_records).toBe(2);
      res.body.data.forEach((tx: any) => {
        expect(tx.type).toBe('credit');
      });
    });

    it('filters transactions by type=debit', async () => {
      const res = await request(testApp).get(
        `/api/v1/accounts/${testAccountId}/transactions?type=debit`
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total_records).toBe(2);
      res.body.data.forEach((tx: any) => {
        expect(tx.type).toBe('debit');
      });
    });

    it('supports pagination with page and limit parameters', async () => {
      // Page 1 with limit 2
      const page1 = await request(testApp).get(
        `/api/v1/accounts/${testAccountId}/transactions?page=1&limit=2`
      );

      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.pagination).toEqual({
        current_page: 1,
        page_size: 2,
        total_records: 4,
        total_pages: 2,
      });

      // Page 2 with limit 2
      const page2 = await request(testApp).get(
        `/api/v1/accounts/${testAccountId}/transactions?page=2&limit=2`
      );

      expect(page2.status).toBe(200);
      expect(page2.body.data).toHaveLength(2);
      expect(page2.body.pagination.current_page).toBe(2);

      // Verify records are distinct
      const page1Refs = page1.body.data.map((t: any) => t.reference_id);
      const page2Refs = page2.body.data.map((t: any) => t.reference_id);
      expect(page1Refs).not.toEqual(page2Refs);
    });

    it('returns 404 if getting history for non-existent account', async () => {
      const nonExistent = '99999999-9999-4999-8999-999999999999';
      const res = await request(testApp).get(`/api/v1/accounts/${nonExistent}/transactions`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
    });
  });

  describe('Validation & Edge Cases', () => {
    it('rejects invalid transaction type', async () => {
      const res = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'invalid_type',
          amount: 50,
          description: 'Invalid',
          reference_id: 'REF-INV',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects amount <= 0', async () => {
      const res = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: -10,
          description: 'Negative',
          reference_id: 'REF-NEG',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects amount with more than 2 decimal places', async () => {
      const res = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 10.123,
          description: 'Too many decimals',
          reference_id: 'REF-DEC',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces immutability: transaction modification or deletion is rejected with 404', async () => {
      const res = await request(testApp)
        .post(`/api/v1/accounts/${testAccountId}/transactions`)
        .send({
          type: 'credit',
          amount: 100,
          description: 'Immutability test',
          reference_id: 'REF-IMMUTABLE',
        });

      const txId = res.body.data.id;

      // No PUT or DELETE endpoint exists on the ledger
      const putRes = await request(testApp)
        .put(`/api/v1/transactions/${txId}`)
        .send({ amount: 200 });
      expect(putRes.status).toBe(404);

      const deleteRes = await request(testApp)
        .delete(`/api/v1/transactions/${txId}`);
      expect(deleteRes.status).toBe(404);
    });
  });
});
