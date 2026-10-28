import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { testApp } from '../setup';

describe('App Endpoints & Error Handling Tests', () => {
  it('responds with 200 on /health', async () => {
    const res = await request(testApp).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('serves OpenAPI specification on /openapi.json', async () => {
    const res = await request(testApp).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('Transaction Ledger API');
  });

  it('handles unknown routes with 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(testApp).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('handles malformed JSON request bodies with 400 VALIDATION_ERROR', async () => {
    const res = await request(testApp)
      .post('/api/v1/accounts')
      .set('Content-Type', 'application/json')
      .send('{ "name": "Broken JSON');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Malformed JSON');
  });

  it('lists accounts on GET /api/v1/accounts', async () => {
    await request(testApp).post('/api/v1/accounts').send({ name: 'User A' });
    await request(testApp).post('/api/v1/accounts').send({ name: 'User B' });

    const res = await request(testApp).get('/api/v1/accounts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
