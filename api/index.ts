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
function getBody(req: any): any {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  return {};
}
function stringField(v: unknown) { return typeof v === 'string' ? v.trim() : ''; }

// ── In-memory state ────────────────────────────────────────────────────────
let whapiUrl = 'https://gate.whapi.cloud/';
let whapiToken = 'oVKAY7FJH3p1H8qlV8LfyAPIrAmwdRhb';
let webhookUrl = '';
let humanMode = false;

let surveyConfig: { humanMode: boolean; questions: any[] } = {
  humanMode: false,
  questions: [],
};

// ── Whapi helpers ──────────────────────────────────────────────────────────
async function whapi(path: string, payload?: any, method = 'POST') {
  try {
    const r = await fetch(`${whapiUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${whapiToken}`, 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  }
}

async function ensureWebhook(url: string) {
  if (!url) return { ok: false };
  return whapi('/settings', {
    webhooks: [{ url, mode: 'body', events: [{ type: 'messages', method: 'post' }] }],
  }, 'PATCH');
}

// ── Survey greeting ────────────────────────────────────────────────────────
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
    const body = getBody(req);
    const key = stringField(body.apiKey) || whapiToken;
    const u = stringField(body.apiUrl) || whapiUrl;
    const r = await whapi('/health?wakeup=false', undefined, 'GET');
    if (r.ok) { whapiToken = key; whapiUrl = u; }
    return ok(res, { ok: r.ok, connected: r.ok, message: r.ok ? '✅ تم الاتصال بنجاح' : `❌ ${r.body}` });
  }

  // ── Save settings ──────────────────────────────────────────────────────
  if (url.includes('/admin/settings/save') && req.method === 'POST') {
    const body = getBody(req);
    const w = body.waba || {};
    if (stringField(w.apiKey)) whapiToken = stringField(w.apiKey);
    if (stringField(w.apiUrl)) whapiUrl = stringField(w.apiUrl).replace(/\/$/, '');
    webhookUrl = stringField(body.webhookUrl) || webhookUrl;
    await ensureWebhook(webhookUrl);
    return ok(res, { ok: true, saved: true });
  }

  // ── Survey config ──────────────────────────────────────────────────────
  if (url.includes('/survey/config') && !url.includes('/reset') && req.method === 'GET') {
    return ok(res, surveyConfig);
  }
  if (url.includes('/survey/config') && !url.includes('/reset') && req.method === 'POST') {
    const body = getBody(req);
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
    const body = getBody(req);
    const customers = Array.isArray(body.customers) ? body.customers : [];
    const w = body.waba || {};
    const token = stringField(w.apiKey) || whapiToken;
    const baseUrl = (stringField(w.apiUrl) || whapiUrl).replace(/\/$/, '');
    console.log(`[campaign] token=${token.slice(0,8)}... customers=${customers.length} url=${baseUrl}`);

    if (customers.length === 0) return ok(res, { ok: true, queued: 0, message: 'لا يوجد مستلمون — تأكد من رفع ملف العملاء' });

    await ensureWebhook(webhookUrl || `https://${req.headers.host}/api/integrations/survey-agent/webhook`);

    let queued = 0;
    let errors: string[] = [];
    for (const c of customers.slice(0, 50)) {
      let phone = String(c.phone || '').replace(/\D/g, '');
      if (phone.length < 9) continue;
      if (!phone.startsWith('967') && phone.length <= 10) phone = '967' + phone;
      const text = greet();
      try {
        const ir = await fetch(`${baseUrl}/messages/interactive`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone, type: 'button',
            body: { text },
            action: { buttons: [
              { type: 'reply', reply: { id: 'survey_start_yes', title: 'نعم، أبدأ' } },
              { type: 'reply', reply: { id: 'survey_start_later', title: 'لاحقاً' } },
            ]},
          }),
        });
        const rb = await ir.text();
        if (ir.ok) { queued++; }
        else { errors.push(`${phone}: ${ir.status} ${rb.slice(0,80)}`); console.error(`[campaign] ${phone}: ${ir.status} ${rb.slice(0,100)}`); }
      } catch (e) {
        errors.push(`${phone}: ${e}`);
        console.error(`[campaign] ${phone} error:`, e);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    return ok(res, { ok: true, queued, errors: errors.length ? errors.slice(0, 5) : undefined });
  }

  // ── Webhook ────────────────────────────────────────────────────────────
  if (url.includes('/integrations/survey-agent/webhook') && req.method === 'POST') {
    ok(res, { ok: true }); // ACK immediately
    return;
  }

  // ── Dashboard / Market Intelligence ────────────────────────────────────
  if (url.includes('/market-intelligence/dashboard')) {
    return ok(res, {
      totalResponses: 0, brokerDependent: 0, directPurchase: 0, codPreference: 0,
      topPlatforms: [], topCities: [], topBrokers: [], topProblems: [],
      responseRate: 0, avgOrderValue: 'N/A', marketShare: [],
    });
  }
  if (url.includes('/market-intelligence/responses')) return ok(res, []);
  if (url.includes('/market-intelligence/analytics')) return ok(res, { surveys: 0, completionRate: 0 });
  if (url.includes('/admin/campaigns')) return ok(res, { ok: true, campaigns: [] });

  // ── Messaging endpoints ────────────────────────────────────────────────
  if (url.includes('/messaging/templates')) return ok(res, []);
  if (url.includes('/messaging/quality')) return ok(res, { totalSent24h: 0, blockRate: '0%', reportRate: '0%', status: 'green' });
  if (url.includes('/messaging/can-send')) return ok(res, { ok: true });

  // ── Health / Ping ──────────────────────────────────────────────────────
  if (url.includes('/health') || url.includes('/ping')) return ok(res, { ok: true, service: 'Linker Agent' });

  // ── Fallback ───────────────────────────────────────────────────────────
  fail(res, 404, `Route not found: ${url}`);
}
