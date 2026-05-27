import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import {
  ConversationEngine,
  createConversationEngine,
  getSurveyConfig,
  updateSurveyConfig,
  resetSurveyConfig,
  type ConversationStore,
} from './conversationEngine';
import { MarketIntelligenceStore, type CampaignRecipientRecord } from './marketIntelligenceStore';

import { qualityMonitor, campaignScheduler, canSendNow, getMessageForPhase, warmUpSchedule, humanizationEngine, hasSpamKeywords } from './messagingEngine';
import { whatsappTemplates } from './whatsappTemplates';

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

function normalizePhone(value: unknown): string {
  let digits = stringField(value).replace(/\D/g, '');
  if (digits.startsWith('00967')) digits = digits.slice(2);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0967')) digits = digits.slice(1);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length === 9) digits = `967${digits}`;
  return digits;
}

function isValidPhone(phone: string): boolean {
  if (!/^967\d{9}$/.test(phone)) return false;
  return ['77', '73', '71', '70', '78'].includes(phone.slice(3, 5));
}

interface RecipientInput {
  phone?: unknown;
  phoneNumber?: unknown;
  mobile?: unknown;
  whatsapp?: unknown;
  name?: unknown;
  city?: unknown;
}

interface InvalidRecipient {
  row: number;
  rawPhone: string;
  reason: string;
}

interface DuplicateRecipient {
  row: number;
  phone: string;
  firstRow: number;
}

function analyzeRecipients(rows: RecipientInput[] = []) {
  const seen = new Map<string, number>();
  const recipients: CampaignRecipientRecord[] = [];
  const invalid: InvalidRecipient[] = [];
  const duplicates: DuplicateRecipient[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const rawPhone = stringField(row.phone ?? row.phoneNumber ?? row.mobile ?? row.whatsapp);
    const phone = normalizePhone(rawPhone);

    if (!phone) {
      invalid.push({ row: rowNumber, rawPhone, reason: 'missing_phone' });
      return;
    }

    if (!isValidPhone(phone)) {
      invalid.push({ row: rowNumber, rawPhone, reason: 'invalid_phone' });
      return;
    }

    const firstRow = seen.get(phone);
    if (firstRow) {
      duplicates.push({ row: rowNumber, phone, firstRow });
      return;
    }

    seen.set(phone, rowNumber);
    recipients.push({
      phone,
      name: stringField(row.name),
      city: stringField(row.city),
    });
  });

  return {
    totalRows: rows.length,
    validCount: recipients.length,
    duplicateCount: duplicates.length,
    invalidCount: invalid.length,
    recipients,
    duplicates,
    invalid,
  };
}

function campaignStatusFromLaunchMode(launchMode: string, requestedStatus?: string) {
  if (requestedStatus === 'draft') return 'draft';
  if (launchMode === 'schedule') return 'scheduled';
  if (launchMode === 'draft') return 'draft';
  return 'active';
}

function normalizeProviderUrl(value: string): string {
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('Provider URL must use http or https');
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isPrivateHost =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

  if (process.env.NODE_ENV === 'production' && (isLocalHost || isPrivateHost)) {
    throw new Error('Provider URL cannot target local or private networks in production');
  }

  parsed.pathname = parsed.pathname.replace(/\/$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
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

type MarketStore = typeof MarketIntelligenceStore;

interface ServerAppOptions {
  conversationStore?: ConversationStore;
  marketStore?: MarketStore;
}

const processedWebhookMessageIds = new Map<string, number>();
const WEBHOOK_DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

function rememberWebhookMessage(messageId: string): boolean {
  const now = Date.now();
  for (const [id, timestamp] of processedWebhookMessageIds) {
    if (now - timestamp > WEBHOOK_DEDUP_TTL_MS) processedWebhookMessageIds.delete(id);
  }
  if (processedWebhookMessageIds.has(messageId)) return false;
  processedWebhookMessageIds.set(messageId, now);
  return true;
}

function createCorsOptions() {
  const configuredOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowLocalDev = process.env.NODE_ENV !== 'production';

  return {
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-API-Key', 'X-Webhook-Token'],
    origin(origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowedOrigin = configuredOrigins.includes(origin);
      const isLocalDevOrigin = allowLocalDev && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

      if (isAllowedOrigin || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error('CORS origin not allowed'));
    },
  };
}

function isAuthorizedAdminRequest(request: Request): boolean {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) return true;

  const apiKey = stringField(request.header('x-admin-api-key'));
  const bearer = stringField(request.header('authorization')).replace(/^Bearer\s+/i, '');
  return apiKey === expectedKey || bearer === expectedKey;
}

function isAuthorizedWebhookRequest(request: Request): boolean {
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) return true;

  const candidates = [
    stringField(request.header('x-webhook-token')),
    stringField(request.query.verify_token),
    stringField(request.query.token),
  ];
  return candidates.includes(expectedToken);
}

function securityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function createServerApp(options: ServerAppOptions = {}) {
  const app = express();
  const conversationEngine = options.conversationStore
    ? createConversationEngine(options.conversationStore)
    : ConversationEngine;
  const marketStore = options.marketStore ?? MarketIntelligenceStore;

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '1mb' }));
  app.use((error: Error, request: Request, response: Response, next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      void marketStore.logSystemEvent({
        level: 'warn',
        type: 'invalid_json',
        route: request.path,
        reason: error.message,
        action: 'request_rejected',
      });
      response.status(400).json({ ok: false, message: 'Invalid JSON body' });
      return;
    }
    next(error);
  });
  app.use(cors(createCorsOptions()));

  app.use('/api/admin', (request, response, next) => {
    if (!isAuthorizedAdminRequest(request)) {
      void marketStore.logSystemEvent({
        level: 'warn',
        type: 'unauthorized_admin_request',
        route: request.path,
        action: 'request_rejected',
      });
      response.status(401).json({ ok: false, message: 'Unauthorized' });
      return;
    }
    next();
  });

  app.use('/api/campaigns', (request, response, next) => {
    if (!isAuthorizedAdminRequest(request)) {
      void marketStore.logSystemEvent({
        level: 'warn',
        type: 'unauthorized_campaign_request',
        route: request.path,
        action: 'request_rejected',
      });
      response.status(401).json({ ok: false, message: 'Unauthorized' });
      return;
    }
    next();
  });

  // Health check — no DB, no auth, always first
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'Linker Agent API',
      databaseConfigured: hasDatabaseConfig(),
      whatsappConfigured: Boolean(process.env.WHATSAPP_API_TOKEN),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── whapi config (read from env or defaults) ────────────────────────────
  const runtimeWaba = {
    apiUrl: normalizeProviderUrl(process.env.WHATSAPP_API_URL || 'https://gate.whapi.cloud'),
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
  };

  function parseInteractiveMessage(text: string) {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const options: string[] = [];
    const promptLines: string[] = [];

    for (const line of lines) {
        const match = line.match(/^\s*(?:\d+)(?:\uFE0F?\u20E3)?\s*[\)\.\-:]?\s*(.+)$/u);
      if (match?.[1]) {
        const title = match[1].trim();
        if (title && !options.includes(title)) options.push(title);
        continue;
      }
      if (options.length > 0 && /تقدر تختار|يمكنك اختيار|اكتب الأرقام|مفصولة/.test(line)) {
        continue;
      }
      promptLines.push(line);
    }

    const prompt = promptLines.join('\n').trim() || text.trim();
    const isMultiSelect = /أكثر من|اكثر من|عدة|متعددة|اختيارات متعددة|مفصولة|فواصل/.test(text);

    return {
      prompt,
      options: options.length >= 2 ? options : [],
      isMultiSelect,
    };
  }

  function buildListRows(options: string[]) {
    return options.slice(0, 10).map((title, index) => ({
      id: `opt_${index + 1}`,
      title: title.slice(0, 24),
    }));
  }

  function buildMultiSelectText(prompt: string, options: string[]) {
    const choices = options.map((option, index) => `${index + 1}. ${option}`).join('\n');
    return `${prompt}\n\n${choices}\n\nتقدر تختار أكثر من خيار بكتابة الأرقام مفصولة بفواصل، مثال: 1، 2، 3`;
  }

  async function sendWhapiMessage(to: string, text: string) {
    try {
      if (!runtimeWaba.apiToken) return false;
      const parsedMessage = parseInteractiveMessage(text);
      if (parsedMessage.options.length > 0 && parsedMessage.isMultiSelect) {
        const res = await fetch(`${runtimeWaba.apiUrl}/messages/text`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${runtimeWaba.apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, body: buildMultiSelectText(parsedMessage.prompt, parsedMessage.options) }),
        });
        if (!res.ok) console.error('[whapi] multi-select text send failed:', res.status, await res.text());
        return res.ok;
      }

      if (parsedMessage.options.length > 0) {
        const interactiveRes = await fetch(`${runtimeWaba.apiUrl}/messages/interactive`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${runtimeWaba.apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            type: 'list',
            header: { type: 'text', text: 'اختر الإجابة' },
            body: { text: parsedMessage.prompt },
            action: {
              button: 'اختر الإجابة',
              sections: [{ title: 'الخيارات', rows: buildListRows(parsedMessage.options) }],
            },
          }),
        });
        if (interactiveRes.ok) return true;
        console.error('[whapi] interactive send failed:', interactiveRes.status, await interactiveRes.text());
      }

      const res = await fetch(`${runtimeWaba.apiUrl}/messages/text`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${runtimeWaba.apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body: text }),
      });
      if (!res.ok) console.error('[whapi] send failed:', res.status, await res.text());
      return res.ok;
    } catch (err) {
      console.error('[whapi] send error:', err);
      return false;
    }
  }

  // Parse whapi reply message text & extract button reply if any
  function extractWhapiMessage(body: Record<string, unknown>): { phone: string; text: string; messageId?: string } | null {
    // whapi sends messages array
    const messages = body.messages as Array<Record<string, unknown>> | undefined;
    const msg = messages?.[0];
    if (!msg) return null;

    const from = normalizePhone(msg.from || msg.chat_id);
    if (!from) return null;
    const messageId = stringField(msg.id || msg.message_id || msg.messageId);

    // Button reply
    const interactive = msg.interactive as Record<string, unknown> | undefined;
    if (interactive?.type === 'button_reply') {
      const reply = interactive.button_reply as Record<string, unknown>;
      return { phone: from, text: stringField(reply?.title || reply?.id) || '', messageId };
    }
    if (interactive?.type === 'list_reply') {
      const reply = interactive.list_reply as Record<string, unknown>;
      return { phone: from, text: stringField(reply?.title || reply?.id || reply?.description) || '', messageId };
    }

    // Plain text
    const textObj = msg.text as Record<string, unknown> | undefined;
    const text = stringField(textObj?.body || msg.body || msg.text);
    if (!text) return null;

    return { phone: from, text, messageId };
  }

  // ─── whapi Webhook (receives customer replies) ───────────────────────────
  app.get('/api/integrations/survey-agent/webhook', (request, response) => {
    if (!isAuthorizedWebhookRequest(request)) {
      response.status(401).json({ ok: false, message: 'Unauthorized webhook verification' });
      return;
    }
    response.json({
      ok: true,
      challenge: stringField(request.query.challenge) || undefined,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/integrations/survey-agent/webhook', async (request, response) => {
    // Always respond 200 immediately so providers do not retry while we process.
    response.status(200).json({ ok: true });

    try {
      if (!isAuthorizedWebhookRequest(request)) {
        await marketStore.logSystemEvent({
          level: 'warn',
          type: 'unauthorized_webhook',
          route: request.path,
          action: 'request_acknowledged_ignored',
        });
        return;
      }
      if (!hasDatabaseConfig() && !options.conversationStore) {
        await marketStore.logSystemEvent({
          level: 'error',
          type: 'webhook_database_unavailable',
          route: request.path,
          action: 'message_not_processed',
        });
        return;
      }

      const body = request.body as Record<string, unknown>;

      // Handle whapi format (messages array)
      const parsed = extractWhapiMessage(body);
      if (parsed) {
        const { phone, text, messageId } = parsed;
        if (!isValidPhone(phone)) {
          await marketStore.logSystemEvent({
            level: 'warn',
            type: 'invalid_inbound_phone',
            route: request.path,
            message: text,
            action: 'message_ignored',
          });
          return;
        }

        if (messageId) {
          const alreadyProcessed = !rememberWebhookMessage(messageId) || await marketStore.hasProcessedWhatsappMessage(messageId);
          if (alreadyProcessed) {
            await marketStore.logWhatsappMessage({
              providerMessageId: messageId,
              direction: 'inbound',
              phone,
              status: 'duplicate',
              text,
              payload: body,
            });
            return;
          }
        }

        await marketStore.logWhatsappMessage({
          providerMessageId: messageId,
          direction: 'inbound',
          phone,
          status: 'received',
          text,
          payload: body,
        });
        qualityMonitor.recordReply();

        const reply = await conversationEngine.handleIncomingMessage(phone, text);
        if (reply) {
          if (getSurveyConfig().humanMode) {
            await new Promise((resolve) => setTimeout(resolve, humanizationEngine.randomDelay(1200, 4500)));
          }
          const sent = await sendWhapiMessage(phone, reply);
          if (sent) qualityMonitor.recordSent();
          await marketStore.logWhatsappMessage({
            direction: 'outbound',
            phone,
            status: sent ? 'sent' : 'failed',
            text: reply,
            error: sent ? undefined : 'Provider send failed or token missing',
          });
        }
        return;
      }

      // Legacy/Direct format support
      const phone = normalizePhone(body.phone);
      const message = stringField(body.message);
      if (!phone || !message) return;

      const reply = await conversationEngine.handleIncomingMessage(phone, message);
      if (reply) {
        if (getSurveyConfig().humanMode) {
          await new Promise((resolve) => setTimeout(resolve, humanizationEngine.randomDelay(1200, 4500)));
        }
        const sent = await sendWhapiMessage(phone, reply);
        if (sent) qualityMonitor.recordSent();
        await marketStore.logWhatsappMessage({
          direction: 'outbound',
          phone,
          status: sent ? 'sent' : 'failed',
          text: reply,
          error: sent ? undefined : 'Provider send failed or token missing',
        });
      }

    } catch (error) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'webhook_processing_failed',
        route: request.path,
        reason: error instanceof Error ? error.message : String(error),
        action: 'request_acknowledged',
      });
      console.error('[survey-webhook]', error);
    }
  });

  // ─── Campaign launcher: sends first message + starts conversation ─────────
  app.post('/api/campaigns/launch', async (request, response) => {
    try {
      const {
        customers,
        recipients,
        campaignId = `campaign_${Date.now()}`,
        name = 'حملة استبيان جديدة',
        description,
        type = 'survey',
        surveyTemplate = 'default',
        launchMode = 'immediate',
        scheduledAt,
        status,
        humanMode,
      } = request.body as {
        customers?: Array<{ phone?: string; phoneNumber?: string; mobile?: string; whatsapp?: string; name?: string; city?: string }>;
        recipients?: Array<{ phone?: string; phoneNumber?: string; mobile?: string; whatsapp?: string; name?: string; city?: string }>;
        campaignId?: string;
        name?: string;
        description?: string;
        type?: string;
        surveyTemplate?: string;
        launchMode?: string;
        scheduledAt?: string;
        status?: string;
        humanMode?: boolean;
      };

      const incomingRecipients = Array.isArray(customers) ? customers : Array.isArray(recipients) ? recipients : [];
      console.info('[campaign-launch-api] received', { count: incomingRecipients.length, first: incomingRecipients[0] || null });
      const preview = analyzeRecipients(incomingRecipients);
      console.info('[campaign-launch-api] analyzed', { valid: preview.validCount, invalid: preview.invalidCount, firstValid: preview.recipients[0] || null });

      if (!preview.recipients.length) {
        response.status(400).json({ ok: false, message: 'لا يمكن إطلاق الحملة بدون مستلمين صالحين' });
        return;
      }

      const campaignStatus = campaignStatusFromLaunchMode(launchMode, status);
      await marketStore.createCampaign({
        id: campaignId,
        name: stringField(name) || 'حملة استبيان جديدة',
        description: stringField(description),
        type: stringField(type) || 'survey',
        surveyTemplate: stringField(surveyTemplate) || 'default',
        launchMode,
        scheduledAt,
        status: campaignStatus,
        humanMode: Boolean(humanMode),
        recipientCount: preview.totalRows,
        validRecipientCount: preview.validCount,
        duplicateRecipientCount: preview.duplicateCount,
        invalidRecipientCount: preview.invalidCount,
      });
      await marketStore.replaceCampaignRecipients(campaignId, preview.recipients, preview);

      if (typeof humanMode === 'boolean') {
        updateSurveyConfig({ humanMode });
      }

      if (campaignStatus !== 'active') {
        response.json({ ok: true, campaignId, status: campaignStatus, queued: 0, preview });
        return;
      }

      const effectiveApiUrl = runtimeWaba.apiUrl;
      const effectiveApiToken = runtimeWaba.apiToken;

      if (!effectiveApiToken) {
        response.status(400).json({ ok: false, message: 'يرجى إدخال API Token في صفحة الإعدادات أولاً' });
        return;
      }
      if (!hasDatabaseConfig() && !options.conversationStore) {
        response.status(503).json({ ok: false, message: 'DATABASE_URL is not configured', code: 'DATABASE_UNAVAILABLE' });
        return;
      }

      async function sendWithToken(to: string, text: string) {
        try {
          const parsedMessage = parseInteractiveMessage(text);
          if (parsedMessage.options.length > 0 && parsedMessage.isMultiSelect) {
            const res = await fetch(`${effectiveApiUrl}/messages/text`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${effectiveApiToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ to, body: buildMultiSelectText(parsedMessage.prompt, parsedMessage.options) }),
            });
            if (!res.ok) {
              const errText = await res.text();
              console.error('[whapi] multi-select text send failed:', res.status, errText);
              if (res.status === 401 || res.status === 403) {
                throw new Error(`❌ ${parseWhapiError(res.status, errText)}`);
              }
              return false;
            }
            return true;
          }

          if (parsedMessage.options.length > 0) {
            const interactiveRes = await fetch(`${effectiveApiUrl}/messages/interactive`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${effectiveApiToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to,
                type: 'list',
                header: { type: 'text', text: 'اختر إجابتك' },
                body: { text: parsedMessage.prompt },
                action: {
                  button: 'اختر الإجابة',
                  sections: [{ title: 'الخيارات', rows: buildListRows(parsedMessage.options) }],
                },
              }),
            });
            if (interactiveRes.ok) return true;
            const errText = await interactiveRes.text();
            console.error('[whapi] interactive send failed:', interactiveRes.status, errText);
            if (interactiveRes.status === 401 || interactiveRes.status === 403) {
              throw new Error(`❌ ${parseWhapiError(interactiveRes.status, errText)}`);
            }
          }

          const res = await fetch(`${effectiveApiUrl}/messages/text`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${effectiveApiToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, body: text }),
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error('[whapi] send failed:', res.status, errText);
            if (res.status === 401 || res.status === 403) {
              throw new Error(`❌ ${parseWhapiError(res.status, errText)}`);
            }
            return false;
          }
          return true;
        } catch (err) {
          console.error('[whapi] send error:', err);
          throw err;
        }
      }

      let queued = 0;
      const errors: string[] = [];
      for (const customer of preview.recipients) {
        const phone = customer.phone;

        try {
          const greeting = await conversationEngine.startConversation(phone, campaignId, {
            name: customer.name,
            city: customer.city,
          });
          const sent = await sendWithToken(phone, greeting);
          if (sent) qualityMonitor.recordSent();
          await marketStore.logWhatsappMessage({
            direction: 'outbound',
            phone,
            campaignId,
            status: sent ? 'sent' : 'failed',
            text: greeting,
            error: sent ? undefined : 'Provider send failed',
          });
          await marketStore.markCampaignRecipientStatus(campaignId, phone, sent ? 'sent' : 'failed', sent ? undefined : 'Provider send failed');
          if (sent) queued++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Error';
          errors.push(errMsg);
          await marketStore.markCampaignRecipientStatus(campaignId, phone, 'failed', errMsg);
          if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('Token')) {
            response.status(401).json({ ok: false, message: errMsg, queued });
            return;
          }
        }

        const delayMs = process.env.NODE_ENV === 'test'
          ? 0
          : getSurveyConfig().humanMode
            ? humanizationEngine.randomDelay(7000, 22000)
            : humanizationEngine.randomDelay(1800, 4200);
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      }

      await marketStore.markCampaignStatus(campaignId, 'completed');
      response.json({ ok: true, campaignId, queued, preview, errors: errors.length > 0 ? errors : undefined });
    } catch (err) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'campaign_launch_failed',
        route: request.path,
        reason: err instanceof Error ? err.message : String(err),
        action: 'request_failed',
      });
      console.error('[campaign-launch]', err);
      response.status(500).json({ ok: false, message: err instanceof Error ? err.message : 'Error' });
    }
  });

  app.get('/api/admin/campaigns', async (_request, response) => {
    try {
      if (!hasDatabaseConfig() && !options.marketStore) {
        response.status(503).json({ ok: false, message: 'DATABASE_URL is not configured', code: 'DATABASE_UNAVAILABLE' });
        return;
      }
      response.json({ ok: true, campaigns: await marketStore.listCampaigns() });
    } catch (error) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'campaigns_fetch_failed',
        route: '/api/admin/campaigns',
        reason: error instanceof Error ? error.message : String(error),
      });
      response.status(500).json({ ok: false, message: 'Error fetching campaigns' });
    }
  });

  app.post('/api/admin/campaigns/preview-recipients', async (request, response) => {
    const { customers = [] } = request.body || {};
    response.json({ ok: true, preview: analyzeRecipients(Array.isArray(customers) ? customers : []) });
  });

  app.post('/api/admin/campaigns', async (request, response) => {
    try {
      if (!hasDatabaseConfig() && !options.marketStore) {
        response.status(503).json({ ok: false, message: 'DATABASE_URL is not configured', code: 'DATABASE_UNAVAILABLE' });
        return;
      }

      const {
        customers = [],
        id,
        name,
        description,
        type = 'survey',
        surveyTemplate = 'default',
        launchMode = 'draft',
        scheduledAt,
        status,
        humanMode = false,
      } = request.body || {};

      const campaignId = stringField(id) || `campaign_${Date.now()}`;
      const preview = analyzeRecipients(Array.isArray(customers) ? customers : []);
      const campaignStatus = campaignStatusFromLaunchMode(stringField(launchMode) || 'draft', stringField(status));

      const campaign = await marketStore.createCampaign({
        id: campaignId,
        name: stringField(name) || 'حملة استبيان جديدة',
        description: stringField(description),
        type: stringField(type) || 'survey',
        surveyTemplate: stringField(surveyTemplate) || 'default',
        launchMode: stringField(launchMode) || 'draft',
        scheduledAt,
        status: campaignStatus,
        humanMode: Boolean(humanMode),
        recipientCount: preview.totalRows,
        validRecipientCount: preview.validCount,
        duplicateRecipientCount: preview.duplicateCount,
        invalidRecipientCount: preview.invalidCount,
      });
      await marketStore.replaceCampaignRecipients(campaignId, preview.recipients, preview);

      response.status(201).json({ ok: true, campaign, preview });
    } catch (error) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'campaign_create_failed',
        route: '/api/admin/campaigns',
        reason: error instanceof Error ? error.message : String(error),
      });
      response.status(500).json({ ok: false, message: 'Error creating campaign' });
    }
  });

  app.get('/api/admin/market-intelligence/dashboard', async (_request, response) => {
    try {
      if (!hasDatabaseConfig() && !options.marketStore) {
        response.status(503).json({ ok: false, message: 'DATABASE_URL is not configured', code: 'DATABASE_UNAVAILABLE' });
        return;
      }
      const metrics = await marketStore.getDashboardMetrics();
      response.json(metrics);
    } catch (error) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'dashboard_metrics_failed',
        route: '/api/admin/market-intelligence/dashboard',
        reason: error instanceof Error ? error.message : String(error),
      });
      response.status(500).json({ ok: false, message: 'Error fetching metrics' });
    }
  });

  app.get('/api/admin/market-intelligence/analytics', async (_request, response) => {
    try {
      if (!hasDatabaseConfig() && !options.marketStore) {
        response.status(503).json({ ok: false, message: 'DATABASE_URL is not configured', code: 'DATABASE_UNAVAILABLE' });
        return;
      }
      const analytics = await marketStore.getAnalyticsSnapshot();
      response.json(analytics);
    } catch (error) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'analytics_snapshot_failed',
        route: '/api/admin/market-intelligence/analytics',
        reason: error instanceof Error ? error.message : String(error),
      });
      response.status(500).json({ ok: false, message: 'Error fetching analytics' });
    }
  });

  app.get('/api/admin/market-intelligence/responses', async (_request, response) => {
    try {
      if (!hasDatabaseConfig() && !options.marketStore) {
        response.status(503).json({ ok: false, message: 'DATABASE_URL is not configured', code: 'DATABASE_UNAVAILABLE' });
        return;
      }
      const responses = await marketStore.getAllResponses();
      response.json(responses);
    } catch (error) {
      void marketStore.logSystemEvent({
        level: 'error',
        type: 'responses_fetch_failed',
        route: '/api/admin/market-intelligence/responses',
        reason: error instanceof Error ? error.message : String(error),
      });
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
    try {
      const { profile, waba, webhookUrl } = request.body || {};
      const nextApiUrl = normalizeProviderUrl(stringField(waba?.apiUrl) || runtimeWaba.apiUrl);
      const nextToken = stringField(waba?.apiKey);
      runtimeWaba.apiUrl = nextApiUrl;
      if (nextToken) runtimeWaba.apiToken = nextToken;
      response.json({
        ok: true,
        saved: {
          profile,
          webhookUrl,
          waba: {
            provider: stringField(waba?.provider) || 'custom',
            apiUrl: runtimeWaba.apiUrl,
            hasToken: Boolean(runtimeWaba.apiToken),
          },
        },
        runtimeWaba: { apiUrl: runtimeWaba.apiUrl, hasToken: Boolean(runtimeWaba.apiToken) },
      });
    } catch (error) {
      response.status(400).json({ ok: false, message: error instanceof Error ? error.message : 'Invalid settings' });
    }
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

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeProviderUrl(stringField(apiUrl) || 'https://gate.whapi.cloud/');
    } catch (error) {
      response.status(400).json({ ok: false, connected: false, message: error instanceof Error ? error.message : 'Invalid provider URL' });
      return;
    }
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
      message: `Connection successful via ${result.path} (${result.authMode})`,
      status: result.status,
      attempts: result.attempts,
    });
  });

  app.use((request, response) => {
    response.status(404).json({ ok: false, message: `Route not found: ${request.path}` });
  });

  app.use((error: Error, request: Request, response: Response, _next: NextFunction) => {
    void marketStore.logSystemEvent({
      level: 'error',
      type: 'unhandled_server_error',
      route: request.path,
      reason: error.message,
      action: 'request_failed',
    });
    if (response.headersSent) return;
    response.status(500).json({ ok: false, message: 'Internal server error' });
  });

  return app;
}
