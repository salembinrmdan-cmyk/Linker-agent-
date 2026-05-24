import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createServerApp } from './app';
import type { ConversationStore } from './conversationEngine';
import { MarketIntelligenceStore } from './marketIntelligenceStore';

async function withServer<T>(run: (baseUrl: string) => Promise<T>) {
  const conversationStore: ConversationStore = {
    async prepareSurveySession() { return { customerId: 'customer-1' }; },
    async completeSurvey() { return { id: 'response-1' }; },
    async rejectSurvey() { return { id: 'rejected-1' }; },
    async loadSession() { return null; },
    async saveSession() {},
    async deleteSession() {},
    async getActiveSessionCount() { return 0; },
  };
  const marketStore = {
    ...MarketIntelligenceStore,
    async logSystemEvent() { return null; },
    async logWhatsappMessage() { return null; },
    async hasProcessedWhatsappMessage() { return false; },
    async getDashboardMetrics() {
      return {
        totalResponses: 0,
        brokerDependencyRatio: 0,
        topBrokers: [],
        allBrokers: [],
        directProbabilityRatio: 0,
        recentResponses: [],
        platformBreakdown: [],
        cityBreakdown: [],
        problemBreakdown: [],
        paymentPreferenceBreakdown: [],
        purchaseMethodBreakdown: [],
        ageGroupBreakdown: [],
        genderBreakdown: [],
        brokerTypeBreakdown: [],
        brokerChannelBreakdown: [],
        brokerGenderBreakdown: [],
      };
    },
  } as unknown as typeof MarketIntelligenceStore;
  const app = createServerApp({ conversationStore, marketStore });
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

test('recipient preview only accepts numbers from the submitted payload', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/campaigns/preview-recipients`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customers: [
          { phone: '777123456', name: 'A' },
          { phone: '777123456', name: 'Duplicate' },
          { phone: 'not-a-phone', name: 'Invalid' },
        ],
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json() as { preview: { validCount: number; duplicateCount: number; invalidCount: number; recipients: Array<{ phone: string }> } };
    assert.equal(data.preview.validCount, 1);
    assert.equal(data.preview.duplicateCount, 1);
    assert.equal(data.preview.invalidCount, 1);
    assert.deepEqual(data.preview.recipients.map((recipient) => recipient.phone), ['967777123456']);
  });
});
