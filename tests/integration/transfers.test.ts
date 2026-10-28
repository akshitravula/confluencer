import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { testApp } from '../setup';

describe('Money Transfer API Integration Tests', () => {
  let accountAId: string;
  let accountBId: string;

  beforeEach(async () => {
    // Create Account A with 100 balance
    const resA = await request(testApp)
      .post('/api/v1/accounts')
      .send({ name: 'Account A' });
    accountAId = resA.body.data.id;

    await request(testApp)
      .post(`/api/v1/accounts/${accountAId}/transactions`)
      .send({
        type: 'credit',
        amount: 100,
        description: 'Initial funding A',
        reference_id: 'INIT-A',
      });

    // Create Account B with 50 balance
    const resB = await request(testApp)
      .post('/api/v1/accounts')
      .send({ name: 'Account B' });
    accountBId = resB.body.data.id;

    await request(testApp)
      .post(`/api/v1/accounts/${accountBId}/transactions`)
      .send({
        type: 'credit',
        amount: 50,
        description: 'Initial funding B',
        reference_id: 'INIT-B',
      });
  });

  it('executes atomic money transfer between accounts', async () => {
    const transferRes = await request(testApp)
      .post('/api/v1/transfers')
      .send({
        source_account_id: accountAId,
        destination_account_id: accountBId,
        amount: 30,
        reference_id: 'TRF-TEST-001',
        description: 'Payment',
      });

    expect(transferRes.status).toBe(201);
    expect(transferRes.body.success).toBe(true);
    expect(transferRes.body.data.source_balance).toBe(70);
    expect(transferRes.body.data.destination_balance).toBe(80);

    // Verify Account A balance
    const balA = await request(testApp).get(`/api/v1/accounts/${accountAId}/balance`);
    expect(balA.body.data.balance).toBe(70);

    // Verify Account B balance
    const balB = await request(testApp).get(`/api/v1/accounts/${accountBId}/balance`);
    expect(balB.body.data.balance).toBe(80);

    // Verify ledger records created in both accounts
    const histA = await request(testApp).get(`/api/v1/accounts/${accountAId}/transactions`);
    expect(histA.body.data[0].type).toBe('debit');
    expect(histA.body.data[0].amount).toBe(30);

    const histB = await request(testApp).get(`/api/v1/accounts/${accountBId}/transactions`);
    expect(histB.body.data[0].type).toBe('credit');
    expect(histB.body.data[0].amount).toBe(30);
  });

  it('rejects transfer if source account has insufficient balance', async () => {
    // Account A has 100, attempts to transfer 150
    const transferRes = await request(testApp)
      .post('/api/v1/transfers')
      .send({
        source_account_id: accountAId,
        destination_account_id: accountBId,
        amount: 150,
        reference_id: 'TRF-FAIL-OVERDRAFT',
        description: 'Excessive transfer',
      });

    expect(transferRes.status).toBe(422);
    expect(transferRes.body.success).toBe(false);
    expect(transferRes.body.error.code).toBe('INSUFFICIENT_FUNDS');

    // Both balances remain strictly untouched (no partial transfer)
    const balA = await request(testApp).get(`/api/v1/accounts/${accountAId}/balance`);
    expect(balA.body.data.balance).toBe(100);

    const balB = await request(testApp).get(`/api/v1/accounts/${accountBId}/balance`);
    expect(balB.body.data.balance).toBe(50);
  });

  it('rejects transfer if source and destination are the exact same account', async () => {
    const transferRes = await request(testApp)
      .post('/api/v1/transfers')
      .send({
        source_account_id: accountAId,
        destination_account_id: accountAId,
        amount: 25,
        reference_id: 'TRF-SELF-TRANSFER',
        description: 'Self transfer',
      });

    expect(transferRes.status).toBe(400);
    expect(transferRes.body.success).toBe(false);
    expect(transferRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects transfer if source account does not exist', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const transferRes = await request(testApp)
      .post('/api/v1/transfers')
      .send({
        source_account_id: fakeId,
        destination_account_id: accountBId,
        amount: 20,
        reference_id: 'TRF-NO-SOURCE',
        description: 'Missing source',
      });

    expect(transferRes.status).toBe(404);
    expect(transferRes.body.error.code).toBe('SOURCE_ACCOUNT_NOT_FOUND');
  });

  it('rejects transfer if destination account does not exist', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000';
    const transferRes = await request(testApp)
      .post('/api/v1/transfers')
      .send({
        source_account_id: accountAId,
        destination_account_id: fakeId,
        amount: 20,
        reference_id: 'TRF-NO-DEST',
        description: 'Missing destination',
      });

    expect(transferRes.status).toBe(404);
    expect(transferRes.body.error.code).toBe('DESTINATION_ACCOUNT_NOT_FOUND');
  });

  it('rejects duplicate transfer reference_id', async () => {
    const payload = {
      source_account_id: accountAId,
      destination_account_id: accountBId,
      amount: 15,
      reference_id: 'TRF-DUP-CHECK',
      description: 'Transfer idempotency',
    };

    const res1 = await request(testApp).post('/api/v1/transfers').send(payload);
    expect(res1.status).toBe(201);

    const res2 = await request(testApp).post('/api/v1/transfers').send(payload);
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('DUPLICATE_TRANSFER');

    // Balance should only be deducted once
    const balA = await request(testApp).get(`/api/v1/accounts/${accountAId}/balance`);
    expect(balA.body.data.balance).toBe(85);
  });
});
