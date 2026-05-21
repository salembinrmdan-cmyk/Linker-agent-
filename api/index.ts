/**
 * Self-contained Vercel handler — zero external dependencies.
 * Handles Whapi connection tests and campaign launches on Vercel.
 */

type JsonObject = Record<string, unknown>;

const DEFAULT_API_URL = process.env.WHATSAPP_API_URL || 'https://gate.whapi.cloud/';
const DEFAULT_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

const INITIAL_SURVEY_MESSAGE =
  'السلام عليكم 👋\n\nمعك فريق شركة لينكر لوجستكس  دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها، بهدف تحسين خدمات الشحن والتوصيل والدفع داخل اليمن.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\nوإجاباتك بتساعدنا نفهم احتياجات العملاء بشكل أفضل.\n\nهل ممكن نبدأ؟ 😊';

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function objectField(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function getRoute(req: { url?: string }): string {
  const rawUrl = typeof req.url === 'string' ? req.url : '/';
  try {
    return new URL(rawUrl, 'https://linker-agent.local').pathname;
  } catch {
    return rawUrl.split('?')[0] || '/';
  }
}

function resolveWabaSettings(body: JsonObject, useEnvFallback = true) {
  const waba = objectField(body.waba);
  const apiUrl = stringField(body.apiUrl) || stringField(waba?.apiUrl) || DEFAULT_API_URL;
  const apiKey = stringField(body.apiKey) || stringField(waba?.apiKey) || (useEnvFallback ? DEFAULT_API_TOKEN : '');
  return { apiUrl: normalizeUrl(apiUrl), apiKey };
}

async function readJsonBody(req: { body?: unknown; on: Function }): Promise<JsonObject> {
  if (typeof req.body === 'string') {
    if (!req.body.trim()) return {};
    return objectField(JSON.parse(req.body) as unknown) || {};
  }
  if (Buffer.isBuffer(req.body)) {
    const bodyText = req.body.toString();
    if (!bodyText.trim()) return {};
    return objectField(JSON.parse(bodyText) as unknown) || {};
  }
  if (req.body && typeof req.body === 'object') return req.body as JsonObject;

  const raw: string = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  return objectField(parsed) || {};
}

function sendJson(res: { statusCode: number; end: (body: string) => void }, status: number, body: unknown) {
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function parseWhapiError(status: number, body: string): string {
  try {
    const p = JSON.parse(body) as Record<string, unknown>;
    const err = p?.error;
    const msg = typeof err === 'object' && err !== null
      ? (err as Record<string, unknown>).message
      : (p?.message ?? err);
    if (msg) return String(msg);
  } catch { /**/ }
  if (status === 401) return 'Token غير صالح أو منتهي الصلاحية';
  if (status === 403) return 'الوصول مرفوض — تأكد من صحة الـ Token';
  if (status === 404) return 'القناة غير موجودة لهذا الـ Token';
  if (status === 429) return 'تجاوزت حد الطلبات — انتظر قليلاً';
  if (status >= 500) return 'خطأ في خادم whapi.cloud';
  return `رمز الحالة: ${status}`;
}

async function testWhapi(apiUrl: string, apiKey: string) {
  for (const mode of ['bearer', 'query'] as const) {
    const url = mode === 'query'
      ? `${apiUrl}/health?wakeup=false&token=${encodeURIComponent(apiKey)}`
      : `${apiUrl}/health?wakeup=false`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (mode === 'bearer') headers.Authorization = `Bearer ${apiKey}`;
    try {
      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      if (res.ok) {
        let status = 'متصل';
        try { status = (JSON.parse(text) as Record<string,unknown>)?.status as string || 'متصل'; } catch {/**/ }
        return { ok: true as const, message: `✅ تم الاتصال بنجاح — حالة القناة: ${status}` };
      }
      const errMsg = parseWhapiError(res.status, text);
      if (res.status !== 401 && res.status !== 403) return { ok: false as const, message: errMsg };
    } catch (err) {
      const msg = err instanceof Error && err.name === 'TimeoutError'
        ? 'انتهت مهلة الاتصال (10 ثانية)'
        : `خطأ في الشبكة: ${err instanceof Error ? err.message : String(err)}`;
      return { ok: false as const, message: msg };
    }
  }
  return { ok: false as const, message: 'فشل الاتصال — Token غير صالح' };
}

function cleanPhone(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

async function sendWhapiText(apiUrl: string, apiKey: string, to: string, text: string) {
  try {
    const response = await fetch(`${apiUrl}/messages/text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ to, body: text }),
      signal: AbortSignal.timeout(12000),
    });
    const responseBody = await response.text();
    if (response.ok) return { ok: true as const };
    return { ok: false as const, message: parseWhapiError(response.status, responseBody) };
  } catch (err) {
    const message = err instanceof Error && err.name === 'TimeoutError'
      ? 'انتهت مهلة الإرسال إلى Whapi'
      : `تعذر الإرسال إلى Whapi: ${err instanceof Error ? err.message : String(err)}`;
    return { ok: false as const, message };
  }
}

async function launchCampaign(body: JsonObject) {
  const customers = Array.isArray(body.customers) ? body.customers : [];
  if (customers.length === 0) {
    return { status: 400, payload: { ok: false, message: 'لا يوجد عملاء في طلب إطلاق الحملة' } };
  }

  const { apiUrl, apiKey } = resolveWabaSettings(body);
  if (!apiKey) {
    return {
      status: 400,
      payload: { ok: false, message: 'يرجى حفظ API URL و API Key من صفحة الإعدادات قبل إطلاق الحملة' },
    };
  }

  const validCustomers = customers
    .map(customer => objectField(customer))
    .filter((customer): customer is JsonObject => Boolean(customer))
    .map(customer => ({ phone: cleanPhone(customer.phone), name: stringField(customer.name), city: stringField(customer.city) }))
    .filter(customer => customer.phone.length >= 9);

  if (validCustomers.length === 0) {
    return { status: 400, payload: { ok: false, message: 'لا توجد أرقام واتساب صالحة في الملف' } };
  }

  let queued = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let index = 0; index < validCustomers.length; index += 5) {
    const batch = validCustomers.slice(index, index + 5);
    const results = await Promise.all(batch.map(customer => sendWhapiText(apiUrl, apiKey, customer.phone, INITIAL_SURVEY_MESSAGE)));
    for (const result of results) {
      if (result.ok) queued += 1;
      else {
        failed += 1;
        if (result.message && errors.length < 3) errors.push(result.message);
      }
    }
  }

  if (queued === 0) {
    return {
      status: 502,
      payload: { ok: false, queued, failed, message: errors[0] || 'فشل إرسال رسائل الحملة عبر Whapi' },
    };
  }

  return {
    status: 200,
    payload: {
      ok: true,
      queued,
      failed,
      message: failed > 0 ? `تم الإرسال إلى ${queued} عميل وفشل ${failed}` : 'تم إطلاق الحملة بنجاح',
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const route = getRoute(req);

  // Health check
  if (req.method === 'GET' || route.includes('/health')) {
    sendJson(res, 200, { ok: true, service: 'Linker Agent API', timestamp: new Date().toISOString() });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const isCampaignLaunch = route.includes('/campaigns/launch') || Array.isArray(body.customers);
    const isSettingsSave = route.includes('/admin/settings/save') || Boolean(body.waba && (body.profile || body.webhookUrl));
    const isConnectionTest = route.includes('/test-connection') || route.includes('/test-whatsapp') || Boolean(body.apiKey);

    if (isCampaignLaunch) {
      const result = await launchCampaign(body);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (isSettingsSave) {
      const settings = resolveWabaSettings(body, false);
      sendJson(res, 200, {
        ok: true,
        saved: true,
        runtimeWaba: { apiUrl: settings.apiUrl, hasToken: Boolean(settings.apiKey) },
      });
      return;
    }

    if (!isConnectionTest) {
      sendJson(res, 404, { ok: false, message: 'API route not found' });
      return;
    }

    const { apiUrl, apiKey } = resolveWabaSettings(body, false);
    if (!apiKey) {
      sendJson(res, 400, { ok: false, message: 'API Key مطلوب' });
      return;
    }
    const result = await testWhapi(normalizeUrl(apiUrl), apiKey);
    sendJson(res, result.ok ? 200 : 502, result);

  } catch (err) {
    sendJson(res, 500, { ok: false, message: `خطأ: ${err instanceof Error ? err.message : String(err)}` });
  }
}
