/**
 * Self-contained Vercel API handler — ZERO external dependencies.
 * No Express, no Prisma, no dotenv. Only Node.js built-ins.
 */

// ── Helpers ────────────────────────────────────────────────────────────────
function ok(res: any, data: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}
function fail(res: any, code: number, msg: string) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ ok: false, message: msg }));
}
function stringField(v: unknown) { return typeof v === 'string' ? v.trim() : ''; }

async function readBody(req: any): Promise<any> {
  console.log('[readBody] type:', typeof req.body, 'keys:', req.body ? Object.keys(req.body).length : 'null', 'isBuffer:', Buffer.isBuffer(req.body));
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  try {
    const chunks: any[] = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const raw = Buffer.concat(chunks).toString();
    console.log('[readBody] stream raw length:', raw.length);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[readBody] stream error:', e);
    return {};
  }
}

// ── In-memory state ────────────────────────────────────────────────────────
let whapiUrl = 'https://gate.whapi.cloud/';
let whapiToken = 'oVKAY7FJH3p1H8qlV8LfyAPIrAmwdRhb';
let webhookUrl = '';
let humanMode = false;

let surveyConfig: { humanMode: boolean; questions: any[] } = {
  humanMode: false,
  questions: [],
};

// ── Whapi call ─────────────────────────────────────────────────────────────
async function whapiCall(token: string, baseUrl: string, path: string, payload?: any, method = 'POST') {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  return { ok: res.ok, status: res.status, body: text, data };
}

// ── Greeting ───────────────────────────────────────────────────────────────
function greet() {
  return 'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\n\nهل ممكن نبدأ؟ 😊';
}

// ── Main handler ───────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end();
    return;
  }

  const url = (req.url || '/').split('?')[0];

  // ── Test connection ────────────────────────────────────────────────────
  if (url.includes('/test-connection') && req.method === 'POST') {
    const body = await readBody(req);
    const key = stringField(body.apiKey) || whapiToken;
    const u = (stringField(body.apiUrl) || whapiUrl).replace(/\/$/, '');
    const r = await whapiCall(key, u, '/health?wakeup=false', undefined, 'GET');
    if (r.ok) { whapiToken = key; whapiUrl = u; }
    return ok(res, { ok: r.ok, connected: r.ok, message: r.ok ? '✅ تم الاتصال بنجاح' : `❌ ${r.data?.error?.message || r.body}` });
  }

  // ── Save settings ──────────────────────────────────────────────────────
  if (url.includes('/admin/settings/save') && req.method === 'POST') {
    const body = await readBody(req);
    const w = body.waba || {};
    if (stringField(w.apiKey)) whapiToken = stringField(w.apiKey);
    if (stringField(w.apiUrl)) whapiUrl = stringField(w.apiUrl).replace(/\/$/, '');
    webhookUrl = stringField(body.webhookUrl) || webhookUrl;
    if (whapiToken && webhookUrl) {
      await whapiCall(whapiToken, whapiUrl, '/settings', {
        webhooks: [{ url: webhookUrl, mode: 'body', events: [{ type: 'messages', method: 'post' }] }],
      }, 'PATCH');
    }
    return ok(res, { ok: true, saved: true, hasToken: !!whapiToken });
  }

  // ── Survey config ──────────────────────────────────────────────────────
  if (url.includes('/survey/config') && !url.includes('/reset') && req.method === 'GET') {
    return ok(res, surveyConfig);
  }
  if (url.includes('/survey/config') && !url.includes('/reset') && req.method === 'POST') {
    const body = await readBody(req);
    if (body.humanMode !== undefined) { humanMode = Boolean(body.humanMode); surveyConfig.humanMode = humanMode; }
    if (Array.isArray(body.questions)) {
      surveyConfig.questions = body.questions
        .filter((q: any) => typeof q?.id === 'string')
        .map((q: any) => ({ ...q, type: q.type || 'open_text', options: Array.isArray(q.options) ? q.options : [] }));
    }
    return ok(res, { ok: true, config: surveyConfig });
  }
  if (url.includes('/survey/config/reset') && req.method === 'POST') {
    surveyConfig = { humanMode: false, questions: [] };
    return ok(res, { ok: true, config: surveyConfig });
  }

  // ── Campaign launch ────────────────────────────────────────────────────
  if (url.includes('/campaigns/launch') && req.method === 'POST') {
    const body = await readBody(req);
    const customers = Array.isArray(body.customers) ? body.customers : [];
    console.log('[campaign] body keys:', Object.keys(body).join(','), 'customers:', customers.length);

    // Return diagnostic info so user can see in Network tab
    if (customers.length === 0) {
      return ok(res, {
        ok: true,
        queued: 0,
        debug: {
          bodyKeys: Object.keys(body),
          customersType: typeof body.customers,
          customersLen: customers.length,
          hasWaba: !!body.waba,
          wabaKeys: body.waba ? Object.keys(body.waba) : [],
        },
        message: 'لا يوجد مستلمون — تأكد من رفع ملف العملاء',
      });
    }
    const w = body.waba || {};
    const token = stringField(w.apiKey) || whapiToken;
    const baseUrl = (stringField(w.apiUrl) || whapiUrl).replace(/\/$/, '');
    console.log(`[campaign] token=${token.slice(0,6)}... customers=${customers.length}`);

    if (customers.length === 0) return ok(res, { ok: true, queued: 0, message: 'لا يوجد مستلمون — تأكد من رفع ملف العملاء' });

    if (token && webhookUrl) {
      await whapiCall(token, baseUrl, '/settings', {
        webhooks: [{ url: webhookUrl, mode: 'body', events: [{ type: 'messages', method: 'post' }] }],
      }, 'PATCH');
    }

    let queued = 0;
    let failed = 0;
    const errors: string[] = [];
    const limit = Math.min(customers.length, 50);

    for (let i = 0; i < limit; i++) {
      const c = customers[i];
      let phone = String(c.phone || '').replace(/\D/g, '');
      if (phone.length < 9) continue;
      if (phone.length <= 10) phone = '967' + phone;

      const r = await whapiCall(token, baseUrl, '/messages/interactive', {
        to: phone,
        type: 'button',
        body: { text: greet() },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'survey_start_yes', title: 'نعم، أبدأ' } },
            { type: 'reply', reply: { id: 'survey_start_later', title: 'لاحقاً' } },
          ],
        },
      });

      if (r.ok && r.data?.messages?.[0]?.id) {
        queued++;
      } else {
        failed++;
        const err = r.data?.error?.message || r.body?.slice(0, 100) || `status ${r.status}`;
        if (errors.length < 5) errors.push(`${phone}: ${err}`);
        console.error(`[campaign] FAIL ${phone}: ${err}`);
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    return ok(res, { ok: true, queued, failed, errors: errors.length ? errors : undefined });
  }

  // ── Webhook ────────────────────────────────────────────────────────────
  if (url.includes('/integrations/survey-agent/webhook') && req.method === 'POST') {
    ok(res, { ok: true });
    return;
  }

  // ── Dashboard / Market Intelligence ────────────────────────────────────
  if (url.includes('/market-intelligence/dashboard')) return ok(res, { totalResponses: 0, brokerDependent: 0, directPurchase: 0, codPreference: 0, topPlatforms: [], topCities: [], topBrokers: [], topProblems: [], responseRate: 0, avgOrderValue: 'N/A', marketShare: [] });
  if (url.includes('/market-intelligence/responses')) return ok(res, []);
  if (url.includes('/market-intelligence/analytics')) return ok(res, { surveys: 0, completionRate: 0 });
  if (url.includes('/admin/campaigns')) return ok(res, { ok: true, campaigns: [] });
  if (url.includes('/messaging/templates')) return ok(res, []);
  if (url.includes('/messaging/quality')) return ok(res, { totalSent24h: 0, blockRate: '0%', reportRate: '0%', status: 'green' });
  if (url.includes('/messaging/can-send')) return ok(res, { ok: true });
  if (url.includes('/health') || url.includes('/ping')) return ok(res, { ok: true, service: 'Linker Agent' });

  fail(res, 404, `Route not found: ${url}`);
}
