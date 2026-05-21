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

function isWhapiProvider(apiUrl: string): boolean {
  return apiUrl.includes('whapi.cloud') || apiUrl.includes('whapi.io');
}

function parseWhapiError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body);
    const msg = parsed?.error?.message || parsed?.message || parsed?.error || '';
    if (msg) return String(msg);
  } catch { /* not JSON */ }

  if (status === 401) return 'Token غير صالح أو منتهي الصلاحية — تحقق من API Token في لوحة whapi.cloud';
  if (status === 403) return 'الوصول مرفوض — تأكد من صحة الـ Token وأن القناة مفعّلة في لوحة whapi.cloud';
  if (status === 404) return 'القناة غير موجودة — تحقق من أن الـ Token مرتبط بقناة نشطة';
  if (status === 422) return 'بيانات غير صالحة — تحقق من إعدادات القناة';
  if (status === 429) return 'تجاوزت حد الطلبات — انتظر قليلاً ثم أعد المحاولة';
  if (status >= 500) return 'خطأ في خادم whapi.cloud — حاول مرة أخرى لاحقاً';
  return `رمز الحالة: ${status}`;
}

async function testWhapiConnection(apiUrl: string, apiKey: string) {
  const attempts: Array<{ path: string; authMode: string; ok: boolean; status?: number; error?: string; body?: string }> = [];

  // whapi uses /health as the primary health-check endpoint
  // wakeup=false prevents launching the channel just for a test
  const testPath = '/health';
  const testUrl = `${apiUrl}${testPath}?wakeup=false`;

  for (const candidate of [
    { authMode: 'bearer' as const, headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } },
    { authMode: 'query_token' as const, headers: { Accept: 'application/json' }, useQueryToken: true },
  ]) {
    const url = candidate.useQueryToken
      ? `${apiUrl}${testPath}?wakeup=false&token=${encodeURIComponent(apiKey)}`
      : testUrl;
    try {
      const result = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
        headers: candidate.headers,
      });

      const bodyText = await result.text();

      if (result.ok) {
        let channelStatus = 'متصل';
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed?.status) channelStatus = parsed.status;
          if (parsed?.deviceStatus) channelStatus = parsed.deviceStatus;
        } catch { /* ignore */ }
        attempts.push({ path: testPath, authMode: candidate.authMode, ok: true, status: result.status });
        return {
          ok: true as const,
          path: testPath,
          status: result.status,
          authMode: candidate.authMode,
          channelStatus,
          attempts,
        };
      }

      const errorMessage = parseWhapiError(result.status, bodyText);
      attempts.push({ path: testPath, authMode: candidate.authMode, ok: false, status: result.status, body: errorMessage });

      // 401/403 with first auth mode → try next; other errors → stop
      if (result.status !== 401 && result.status !== 403) break;

    } catch (err) {
      const errorMsg = err instanceof Error && err.name === 'TimeoutError'
        ? 'انتهت مهلة الاتصال (10 ثانية) — تحقق من اتصالك بالإنترنت'
        : 'خطأ في الشبكة — تعذّر الوصول إلى gate.whapi.cloud';
      attempts.push({ path: testPath, authMode: candidate.authMode, ok: false, error: errorMsg });
    }
  }

  const lastAttempt = attempts[attempts.length - 1];
  const message = lastAttempt?.body || lastAttempt?.error || 'فشل الاتصال بـ whapi.cloud';
  return { ok: false as const, message, attempts };
}

async function testCustomProviderConnection(apiUrl: string, apiKey: string) {
  // Use whapi-specific handler for whapi.cloud
  if (isWhapiProvider(apiUrl)) {
    return testWhapiConnection(apiUrl, apiKey);
  }

  const candidatePaths = ['/health', '/api/health', '/v1/health', '/status', '/ping'];
  const attempts: Array<{ path: string; authMode: 'bearer' | 'query_token' | 'token_header' | 'x_api_key'; ok: boolean; status?: number; error?: string; body?: string }> = [];
  let lastStatus: number | null = null;

  for (const path of candidatePaths) {
    const candidates = [
      { authMode: 'bearer' as const, url: `${apiUrl}${path}`, headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } },
      { authMode: 'query_token' as const, url: `${apiUrl}${path}?token=${encodeURIComponent(apiKey)}`, headers: { Accept: 'application/json' } },
      { authMode: 'token_header' as const, url: `${apiUrl}${path}`, headers: { token: apiKey, Accept: 'application/json' } },
      { authMode: 'x_api_key' as const, url: `${apiUrl}${path}`, headers: { 'x-api-key': apiKey, Accept: 'application/json' } },
    ];

    for (const candidate of candidates) {
      try {
        const result = await fetch(candidate.url, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
          headers: candidate.headers,
        });

        const bodyText = await result.text();
        if (result.ok) {
          attempts.push({ path, authMode: candidate.authMode, ok: true, status: result.status });
          return { ok: true as const, path, status: result.status, authMode: candidate.authMode, attempts };
        }
        attempts.push({ path, authMode: candidate.authMode, ok: false, status: result.status, body: bodyText.slice(0, 120) });
        lastStatus = result.status;
      } catch {
        attempts.push({ path, authMode: candidate.authMode, ok: false, error: 'Network error or timeout' });
      }
    }
  }

  return {
    ok: false as const,
    message: lastStatus ? `Provider responded with status ${lastStatus}` : 'Unable to reach provider',
    attempts,
  };
}

function createCorsOptions() {
  return { credentials: true, origin(_origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) { callback(null, true); } };
}

export function createServerApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(cors(createCorsOptions()));

  // Health check — no DB, no auth, always first
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Linker Agent API', timestamp: new Date().toISOString() });
  });

  // ─── whapi config (read from env or defaults) ────────────────────────────
  const WHAPI_URL = (process.env.WHATSAPP_API_URL || 'https://gate.whapi.cloud').replace(/\/$/, '');
  const WHAPI_TOKEN = process.env.WHATSAPP_API_TOKEN || 'iQpbDrEIyNctlBtajcEP3NjFNTN9NfT4';

  async function sendWhapiMessage(to: string, text: string) {
    try {
      const res = await fetch(`${WHAPI_URL}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body: text }),
      });
      if (!res.ok) console.error('[whapi] send failed:', res.status, await res.text());
      return res.ok;
    } catch (err) {
      console.error('[whapi] send error:', err);
      return false;
    }
  }

      return true;
    } catch (err) {
      console.error('[whapi] buttons error:', err);
      return sendWhapiMessage(to, text);
    }
  }

  // Parse whapi reply message text & extract button reply if any
  function extractWhapiMessage(body: Record<string, unknown>): { phone: string; text: string } | null {
    // whapi sends messages array
    const messages = body.messages as Array<Record<string, unknown>> | undefined;
    const msg = messages?.[0];
    if (!msg) return null;

    const from = stringField(msg.from || msg.chat_id);
    if (!from) return null;

    // Button reply
    const interactive = msg.interactive as Record<string, unknown> | undefined;
    if (interactive?.type === 'button_reply') {
      const reply = interactive.button_reply as Record<string, unknown>;
      return { phone: from, text: stringField(reply?.title) || '' };
    }

    // Plain text
    const textObj = msg.text as Record<string, unknown> | undefined;
    const text = stringField(textObj?.body || msg.body || msg.text);
    if (!text) return null;

    return { phone: from, text };
  }

  // ─── whapi Webhook (receives customer replies) ───────────────────────────
  app.post('/api/integrations/survey-agent/webhook', async (request, response) => {
    // Always respond 200 immediately so whapi doesn't retry
    response.status(200).json({ ok: true });

    try {
      const body = request.body as Record<string, unknown>;

      // Handle whapi format (messages array)
      const parsed = extractWhapiMessage(body);
      if (parsed) {
        const { phone, text } = parsed;
        const reply = await ConversationEngine.handleIncomingMessage(phone, text);
        if (reply) await sendWhapiMessage(phone, reply);
        return;
      }

      // Legacy format (direct phone+message from our own campaign launcher)
      const phone = stringField(body.phone);
      const message = stringField(body.message);
      const campaignId = stringField(body.campaignId);
      const profile: CustomerProfile = {
        name: stringField(body.name) || undefined,
        city: stringField(body.city) || undefined,
      };

      if (!phone || !message) return;

      if (campaignId && message === 'START_CAMPAIGN') {
        const greeting = await ConversationEngine.startConversation(phone, campaignId, profile);
        await sendWhapiMessage(phone, greeting);
        return;
      }

      const reply = await ConversationEngine.handleIncomingMessage(phone, message);
      if (reply) await sendWhapiMessage(phone, reply);

    } catch (error) {
      console.error('[survey-webhook]', error);
    }
  });

  // ─── Campaign launcher: sends first message + starts conversation ─────────
  app.post('/api/campaigns/launch', async (request, response) => {
    try {
      const { customers, campaignId = 'default' } = request.body as {
        customers: Array<{ phone: string; name: string; city: string }>;
        campaignId?: string;
      };

      if (!customers?.length) {
        response.status(400).json({ ok: false, message: 'No customers provided' });
        return;
      }

      let queued = 0;
      for (const customer of customers) {
        const phone = customer.phone.replace(/\D/g, '');
        if (phone.length < 9) continue;

        // Start conversation session
        await ConversationEngine.startConversation(phone, campaignId, {
          name: customer.name,
          city: customer.city,
        });

        // Send greeting via whapi
        const greeting = await ConversationEngine.startConversation(phone, campaignId, {
          name: customer.name,
          city: customer.city,
        });
        await sendWhapiMessage(phone, greeting);
        queued++;

        // Delay between sends
        await new Promise(r => setTimeout(r, 2500));
      }

      response.json({ ok: true, queued });
    } catch (err) {
      console.error('[campaign-launch]', err);
      response.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Error' });
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

  // Alias for Vercel standalone function — same handler, works in local dev too
  app.post('/api/test-connection', async (request, response) => {
    const { provider, apiKey, apiUrl } = request.body || {};
    if (!apiKey) { response.status(400).json({ ok: false, message: 'Missing API Key' }); return; }
    const currentProvider = stringField(provider) || 'meta';
    if (currentProvider !== 'custom') {
      response.json({ ok: true, connected: true, message: 'تم التحقق من المزود المحدد' });
      return;
    }
    const normalizedUrl = normalizeBaseUrl(stringField(apiUrl) || 'https://gate.whapi.cloud/');
    const result = await testCustomProviderConnection(normalizedUrl, stringField(apiKey));
    if (!result.ok) {
      response.status(502).json({ ok: false, connected: false, message: result.message, attempts: result.attempts });
      return;
    }
    const channelStatus = 'channelStatus' in result ? result.channelStatus : undefined;
    const statusNote = channelStatus && channelStatus !== 'متصل' ? ` — حالة القناة: ${channelStatus}` : '';
    response.json({ ok: true, connected: true, message: `✅ تم الاتصال بنجاح${statusNote}`, channelStatus, status: result.status, attempts: result.attempts });
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
        attempts: result.attempts,
      });
      return;
    }

    response.json({
      ok: true,
      connected: true,
      provider: currentProvider,
      apiUrl: normalizedUrl,
      message: `✅ تم الاتصال بنجاح عبر ${result.path} (${result.authMode})${"channelStatus" in result && result.channelStatus && result.channelStatus !== "متصل" ? ` — حالة القناة: ${result.channelStatus}` : ""}`,
      channelStatus: "channelStatus" in result ? result.channelStatus : undefined,
      status: result.status,
      attempts: result.attempts,
    });
  });

  // ─── Global 4-arg Error Handler (must be LAST) ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[Express Error]', err?.stack || err?.message || err);
    if (!res.headersSent) {
      res.status(err?.status || 500).json({
        ok: false,
        message: err?.message || 'Internal server error',
      });
    }
  });

  return app;
}
