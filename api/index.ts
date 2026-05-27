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

    // Accept both 'customers' and 'recipients' field names
    const rawList = Array.isArray(body.customers) ? body.customers
      : Array.isArray(body.recipients) ? body.recipients : [];

    console.log('[campaign] body keys:', Object.keys(body).join(','));
    console.log('[campaign] rawList length:', rawList.length, 'first:', JSON.stringify(rawList[0] || null));

    // Normalize phone numbers (Yemeni format)
    function normalizePhone(v: unknown): string {
      let d = String(v || '').replace(/\D/g, '');
      if (d.startsWith('00967')) d = d.slice(2);
      else if (d.startsWith('00')) d = d.slice(2);
      else if (d.startsWith('0967')) d = d.slice(1);
      else if (d.startsWith('0') && d.length === 10) d = d.slice(1);
      if (d.length === 9) d = '967' + d;
      return d;
    }
    function isValidPhone(p: string): boolean {
      return /^967[77|73|71|70|78]\d{7}$/.test(p) || /^967\d{9}$/.test(p);
    }

    const customers: Array<{ phone: string; name: string; city: string }> = [];
    const skipped: string[] = [];

    for (const row of rawList) {
      const raw = String(row.phone || row.phoneNumber || row.mobile || row.whatsapp || '');
      const phone = normalizePhone(raw);
      if (!phone || !isValidPhone(phone)) {
        skipped.push(raw || 'empty');
        continue;
      }
      customers.push({ phone, name: String(row.name || ''), city: String(row.city || '') });
    }

    console.log('[campaign] valid:', customers.length, 'skipped:', skipped.length, 'first valid:', JSON.stringify(customers[0] || null));

    if (customers.length === 0) {
      return fail(res, 400, `لا يوجد مستلمون صالحون. الأرقام المُدخلة: ${rawList.length}، المرفوضة: ${skipped.length}. نماذج: ${skipped.slice(0,3).join(', ')}`);
    }

    // Get whapi credentials: payload → saved in-memory → defaults
    const w = body.waba || {};
    const token = stringField(w.apiKey) || whapiToken;
    const baseUrl = (stringField(w.apiUrl) || whapiUrl).replace(/\/$/, '');

    if (!token) {
      return fail(res, 400, 'يرجى إدخال API Token في صفحة الإعدادات أولاً');
    }

    console.log(`[campaign] sending to ${customers.length} recipients. token=${token.slice(0,8)}...`);

    // Register webhook if configured
    const wh = stringField(body.webhookUrl) || webhookUrl;
    if (token && wh) {
      await whapiCall(token, baseUrl, '/settings', {
        webhooks: [{ url: wh, mode: 'body', events: [{ type: 'messages', method: 'post' }] }],
      }, 'PATCH');
    }

    let queued = 0;
    let failed = 0;
    const errors: string[] = [];
    const limit = Math.min(customers.length, 50);

    for (let i = 0; i < limit; i++) {
      const c = customers[i];
      const phone = c.phone;

      // Try interactive buttons first, fallback to text
      const interactiveRes = await whapiCall(token, baseUrl, '/messages/interactive', {
        to: phone,
        type: 'button',
        body: { text: greet() },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'survey_yes', title: 'نعم، أبدأ 😊' } },
            { type: 'reply', reply: { id: 'survey_later', title: 'لاحقاً' } },
          ],
        },
      });

      let sent = interactiveRes.ok;

      if (!sent) {
        // Fallback to plain text
        const textRes = await whapiCall(token, baseUrl, '/messages/text', {
          to: phone,
          body: greet() + '\n\nللبدء، رد بـ *نعم*',
        });
        sent = textRes.ok;
        if (!sent) {
          const err = interactiveRes.data?.error?.message || `status ${interactiveRes.status}`;
          if (errors.length < 5) errors.push(`${phone}: ${err}`);
          console.error(`[campaign] FAIL ${phone}: ${err}`);
        }
      }

      if (sent) queued++;
      else failed++;

      if (i < limit - 1) await new Promise(r => setTimeout(r, 2200 + Math.random() * 1800));
    }

    console.log(`[campaign] done. queued=${queued} failed=${failed}`);
    return ok(res, { ok: true, queued, failed, total: customers.length, errors: errors.length ? errors : undefined });
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
