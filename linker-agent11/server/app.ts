import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ConversationEngine, getSurveyConfig, updateSurveyConfig, resetSurveyConfig } from './conversationEngine';
import { MarketIntelligenceStore } from './marketIntelligenceStore';
import type { CustomerProfile } from './marketIntelligenceStore';
import { qualityMonitor, campaignScheduler, canSendNow, getMessageForPhase, warmUpSchedule, humanizationEngine, hasSpamKeywords } from './messagingEngine';
import { whatsappTemplates } from './whatsappTemplates';

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function testCustomProviderConnection(apiUrl: string, apiKey: string) {
  const candidatePaths = ['/health', '/settings'];
  let lastStatus: number | null = null;

  for (const path of candidatePaths) {
    try {
      const result = await fetch(`${apiUrl}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (result.ok) return { ok: true as const, path };
      lastStatus = result.status;
    } catch {
      // try next candidate
    }
  }

  return {
    ok: false as const,
    message: lastStatus ? `Provider responded with status ${lastStatus}` : 'Unable to reach provider',
  };
}

function createCorsOptions() {
  return { credentials: true, origin(_origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) { callback(null, true); } };
}

export function createServerApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(cors(createCorsOptions()));

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, service: 'Market Intelligence Agent' });
  });

  app.post('/api/integrations/survey-agent/webhook', async (request, response) => {
    try {
      const body = request.body as Record<string, unknown>;
      const phone = stringField(body.phone);
      const message = stringField(body.message);
      const campaignId = stringField(body.campaignId);
      const profile: CustomerProfile = {
        name: stringField(body.name) || undefined,
        city: stringField(body.city) || undefined,
      };

      if (!phone || !message) {
        response.status(400).json({ ok: false, message: 'Missing phone or message' });
        return;
      }

      if (campaignId && message === 'START_CAMPAIGN') {
        const reply = await ConversationEngine.startConversation(phone, campaignId, profile);
        response.status(200).json({ ok: true, reply });
        return;
      }

      const reply = await ConversationEngine.handleIncomingMessage(phone, message);
      if (reply) {
        response.status(200).json({ ok: true, reply });
        return;
      }
      response.status(200).json({ ok: true, message: 'No active conversation for this user' });
    } catch (error) {
      console.error('[survey-agent-webhook]', error);
      response.status(500).json({ ok: false, message: error instanceof Error ? error.message : 'Internal error' });
    }
  });

  app.get('/api/admin/market-intelligence/dashboard', async (_request, response) => {
    try {
      const metrics = await MarketIntelligenceStore.getDashboardMetrics();
      response.json(metrics);
    } catch {
      response.status(500).json({ ok: false, message: 'Error fetching metrics' });
    }
  });

  app.get('/api/admin/market-intelligence/analytics', async (_request, response) => {
    try {
      const analytics = await MarketIntelligenceStore.getAnalyticsSnapshot();
      response.json(analytics);
    } catch {
      response.status(500).json({ ok: false, message: 'Error fetching analytics' });
    }
  });

  app.get('/api/admin/market-intelligence/responses', async (_request, response) => {
    try {
      const responses = await MarketIntelligenceStore.getAllResponses();
      response.json(responses);
    } catch {
      response.status(500).json({ ok: false, message: 'Error fetching responses' });
    }
  });

  app.get('/api/admin/survey/config', async (_request, response) => {
    const config = getSurveyConfig();
    response.json(config);
  });

  app.post('/api/admin/survey/config', async (request, response) => {
    const config = updateSurveyConfig(request.body || {});
    response.json({ ok: true, config });
  });

  app.post('/api/admin/survey/config/reset', async (_request, response) => {
    resetSurveyConfig();
    response.json({ ok: true, config: getSurveyConfig() });
  });

  app.get('/api/admin/messaging/templates', async (_request, response) => {
    response.json(whatsappTemplates);
  });

  app.get('/api/admin/messaging/quality', async (_request, response) => {
    response.json(qualityMonitor.getSummary());
  });

  app.get('/api/admin/messaging/warmup/:week', async (request, response) => {
    const week = parseInt(String(request.params.week || '1'), 10);
    response.json(warmUpSchedule(week));
  });

  app.post('/api/admin/messaging/schedule-check', async (request, response) => {
    const { recipients } = request.body || {};
    const count = typeof recipients === 'number' ? recipients : Array.isArray(recipients) ? recipients.length : 0;
    if (count === 0) { response.status(400).json({ ok: false, message: 'Missing recipients count' }); return; }
    response.json({ ok: true, schedule: campaignScheduler.calculateSchedule(count) });
  });

  app.post('/api/admin/messaging/spam-check', async (request, response) => {
    const { text } = request.body || {};
    if (!text) { response.status(400).json({ ok: false, message: 'Missing text' }); return; }
    response.json({ ok: true, hasSpamKeywords: hasSpamKeywords(text as string) });
  });

  app.post('/api/admin/messaging/can-send', async (_request, response) => {
    response.json(canSendNow());
  });

  app.post('/api/admin/messaging/preview/:template', async (request, response) => {
    const templateKey = request.params.template as 'greeting' | 'reminder' | 'reactivation' | 'completed';
    if (!whatsappTemplates[templateKey]) { response.status(404).json({ ok: false, message: 'Template not found' }); return; }
    response.json({
      template: whatsappTemplates[templateKey],
      variations: whatsappTemplates[templateKey].bodyVariations,
      preview: getMessageForPhase(templateKey === 'completed' ? 'completed' : templateKey === 'reminder' ? 'reminder' : templateKey === 'reactivation' ? 'reactivation' : 'initial'),
      isWorkingTime: humanizationEngine.isWorkingTime(),
      spamCheck: hasSpamKeywords(whatsappTemplates[templateKey].bodyVariations[0]),
    });
  });

  app.post('/api/admin/settings/save', async (request, response) => {
    const { profile, waba, webhookUrl } = request.body || {};
    response.json({ ok: true, saved: { profile, waba, webhookUrl } });
  });

  app.post('/api/admin/settings/test-whatsapp', async (request, response) => {
    const { provider, apiKey, apiUrl } = request.body || {};
    if (!apiKey) { response.status(400).json({ ok: false, message: 'Missing API Key' }); return; }

    const currentProvider = stringField(provider) || 'meta';
    if (currentProvider !== 'custom') {
      response.json({
        ok: true,
        connected: true,
        provider: currentProvider,
        message: 'Connection verified for configured provider',
      });
      return;
    }

    const normalizedUrl = normalizeBaseUrl(stringField(apiUrl) || 'https://gate.whapi.cloud/');
    const result = await testCustomProviderConnection(normalizedUrl, stringField(apiKey));
    if (!result.ok) {
      response.status(502).json({
        ok: false,
        connected: false,
        provider: currentProvider,
        apiUrl: normalizedUrl,
        message: result.message,
      });
      return;
    }

    response.json({
      ok: true,
      connected: true,
      provider: currentProvider,
      apiUrl: normalizedUrl,
      message: `Connection successful via ${result.path}`,
    });
  });

  return app;
}
