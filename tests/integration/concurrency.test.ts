import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../setup';

describe('Concurrency and Race Condition Tests', () => {
  it('prevents overdrafts and maintains balance consistency under concurrent debits', async () => {
    // Create an account with initial funding of 100
    const accRes = await request(testApp)
      .post('/api/v1/accounts')
      .send({ name: 'Concurrency Test Account' });
    const accountId = accRes.body.data.id;

    await request(testApp)
      .post(`/api/v1/accounts/${accountId}/transactions`)
      .send({
        type: 'credit',
        amount: 100,
        description: 'Initial funding',
        reference_id: 'CONC-INIT',
      });

    // Fire 5 concurrent debit requests of 30 each
    // 3 should succeed (90 total debited), 2 should fail due to insufficient funds
    const debitPromises = Array.from({ length: 5 }, (_, i) =>
      request(testApp)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'debit',
          amount: 30,
          description: `Concurrent debit ${i + 1}`,
          reference_id: `CONC-DEBIT-${i + 1}`,
        })
    );

    const responses = await Promise.all(debitPromises);

    const successfulDebits = responses.filter((r) => r.status === 201);
    const failedDebits = responses.filter((r) => r.status === 422);

    expect(successfulDebits).toHaveLength(3);
    expect(failedDebits).toHaveLength(2);

    // Verify final balance is exactly 10 (100 - 3 * 30 = 10)
    const balRes = await request(testApp).get(`/api/v1/accounts/${accountId}/balance`);
    expect(balRes.body.data.balance).toBe(10);
  });
});
