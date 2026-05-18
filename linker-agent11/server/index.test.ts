import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createServerApp } from './app';

async function withServer<T>(run: (baseUrl: string) => Promise<T>) {
  const app = createServerApp();
  const server = app.listen(0);

  try {
    const address = server.address() as AddressInfo;
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => { if (error) reject(error); else resolve(); });
    });
  }
}

test('dashboard endpoint returns metrics without auth', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/market-intelligence/dashboard`);
    assert.equal(res.status, 200);
    const data = await res.json() as Record<string, unknown>;
    assert.ok(typeof data.totalResponses === 'number');
  });
});

test('webhook endpoint accepts START_CAMPAIGN without auth', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/integrations/survey-agent/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: '777123456', message: 'START_CAMPAIGN', campaignId: 'campaign-1' }),
    });
    assert.equal(res.status, 200);
  });
});

test('health check returns ok', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
  });
});
