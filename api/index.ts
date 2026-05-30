/**
 * Vercel API Handler — Self-contained, zero external dependencies.
 * Full whapi.cloud webhook integration based on official documentation.
 * 
 * whapi webhook payload format (from docs):
 * - Incoming text:  messages[].type = "text", messages[].text.body
 * - Button reply:   messages[].type = "reply", messages[].reply.buttons_reply.title
 * - List reply:     messages[].type = "interactive", messages[].interactive.list_reply.title  
 * - from_me: false = incoming from customer
 * - from: "967771234567" (phone without @s.whatsapp.net)
 * - chat_id: "967771234567@s.whatsapp.net"
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
function sf(v: unknown): string { return typeof v === 'string' ? v.trim() : ''; }

async function readBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  try {
    const chunks: any[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ── Config ─────────────────────────────────────────────────────────────────
const WHAPI_BASE = 'https://gate.whapi.cloud';
const DEFAULT_TOKEN = 'lepqgk2szSYhf3h1HnXGoNnVRiphRi8u';
let runtimeToken = DEFAULT_TOKEN;
let runtimeUrl = WHAPI_BASE;

// ── Phone normalization ────────────────────────────────────────────────────
function normalizePhone(v: unknown): string {
  // Remove @s.whatsapp.net suffix if present (whapi sends phone as "967xxx@s.whatsapp.net" in chat_id)
  let d = String(v || '').replace(/@.*$/, '').replace(/\D/g, '');
  if (d.startsWith('00967')) d = d.slice(2);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0967')) d = d.slice(1);
  else if (d.startsWith('0') && d.length === 10) d = d.slice(1);
  if (d.length === 9) d = '967' + d;
  return d;
}
function isValidPhone(p: string): boolean {
  return /^967\d{9}$/.test(p);
}

// ── whapi API calls ────────────────────────────────────────────────────────
async function whapiPost(path: string, payload: unknown, method = 'POST') {
  const url = `${runtimeUrl}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${runtimeToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok) console.error(`[whapi] ${method} ${path} → ${res.status}:`, text.slice(0, 200));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.error(`[whapi] ${method} ${path} error:`, e);
    return { ok: false, status: 0, data: {} };
  }
}

async function registerWebhook(webhookUrl: string) {
  // Register webhook per whapi docs:
  // PATCH /settings with webhooks array
  // mode: "body" = event info in request body (standard)
  // events: messages.post = incoming messages
  // callback_persist: true = retry if server down
  return whapiPost('/settings', {
    webhooks: [{
      url: webhookUrl,
      mode: 'body',
      events: [
        { type: 'messages', method: 'post' },   // incoming & outgoing messages
      ],
    }],
    callback_persist: true,    // retry webhook if our server is temporarily down
  }, 'PATCH');
}

// ── Message sending ────────────────────────────────────────────────────────
async function sendText(phone: string, text: string): Promise<boolean> {
  const r = await whapiPost('/messages/text', { to: phone, body: text });
  return r.ok;
}

async function sendButtons(phone: string, text: string, buttons: Array<{id: string; title: string}>): Promise<boolean> {
  // whapi interactive button message (max 3 buttons, title max 20 chars)
  const r = await whapiPost('/messages/interactive', {
    to: phone,
    type: 'button',
    body: { text },
    action: {
      buttons: buttons.slice(0, 3).map(b => ({
        type: 'reply',
        reply: { id: b.id, title: b.title.slice(0, 20) },
      })),
    },
  });
  if (!r.ok) {
    console.warn('[whapi] buttons failed, fallback to text');
    return sendText(phone, text);
  }
  return true;
}

async function sendList(phone: string, bodyText: string, options: string[]): Promise<boolean> {
  // whapi list message (max 10 items per section)
  const rows = options.slice(0, 10).map((title, i) => ({
    id: `opt_${i + 1}`,
    title: title.slice(0, 24),
  }));
  const r = await whapiPost('/messages/interactive', {
    to: phone,
    type: 'list',
    body: { text: bodyText },
    action: {
      button: 'اختر إجابتك',
      sections: [{ title: 'الخيارات المتاحة', rows }],
    },
  });
  if (!r.ok) {
    // Fallback to numbered text
    const numbered = options.map((o, i) => `${i + 1}️⃣ ${o}`).join('\n');
    return sendText(phone, `${bodyText}\n\n${numbered}`);
  }
  return true;
}

// ── Survey engine ──────────────────────────────────────────────────────────
interface Session {
  step: number;       // 0 = waiting for YES, 1+ = survey questions
  name: string;
  city: string;
  data: Record<string, string>;
  startedAt: number;
}
const sessions = new Map<string, Session>();

// Cleanup stale sessions older than 24 hours
function cleanupSessions() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [phone, s] of sessions) {
    if (s.startedAt < cutoff) sessions.delete(phone);
  }
}

const QUESTIONS = [
  {
    key: 'platforms',
    text: 'السؤال الأول 📱\n\nمن أي المنصات تشتري غالباً؟',
    options: ['شي إن (Shein)', 'نون (Noon)', 'أمازون', 'علي إكسبريس', 'تيمو (Temu)', 'آي هيرب (iHerb)', 'متاجر إنستغرام', 'أخرى'],
  },
  {
    key: 'purchase_method',
    text: 'السؤال الثاني 🛍️\n\nكيف تشتري عادةً؟',
    options: ['أطلب بنفسي مباشرة', 'عبر وسيط / شخص متخصص', 'أحياناً مباشرة وأحياناً وسيط', 'من متجر محلي'],
  },
  {
    key: 'delivery_time',
    text: 'السؤال الثالث ⏱️\n\nكم يستغرق وصول طلبك؟',
    options: ['أقل من أسبوع', 'أسبوع — أسبوعان', '2 — 4 أسابيع', 'أكثر من شهر'],
  },
  {
    key: 'has_problems',
    text: 'السؤال الرابع ⚠️\n\nهل واجهت مشاكل في استلام طلباتك؟',
    options: ['نعم، أكثر من مرة', 'نعم، مرة أو مرتين', 'لا، ولله الحمد'],
  },
  {
    key: 'order_value',
    text: 'السؤال الخامس 💰\n\nما متوسط قيمة طلبك الواحد؟',
    options: ['أقل من 50$', '50$ — 100$', '100$ — 200$', 'أكثر من 200$'],
  },
  {
    key: 'frequency',
    text: 'السؤال السادس 🔄\n\nكم مرة تطلب في الشهر؟',
    options: ['مرة أو أقل', 'مرتان — 3 مرات', '4 — 6 مرات', 'أكثر من 6 مرات'],
  },
  {
    key: 'biggest_problem',
    text: 'السؤال السابع والأخير 🎯\n\nما أكبر مشكلة تواجهها؟',
    options: ['التأخير في التسليم', 'ارتفاع رسوم الشحن', 'الرسوم الجمركية المفاجئة', 'فقدان أو تلف الطرود', 'صعوبة تتبع الشحنة', 'صعوبة في الدفع الإلكتروني'],
  },
];

async function sendQuestion(phone: string, qIndex: number, name: string) {
  if (qIndex >= QUESTIONS.length) {
    // Survey complete
    await sendText(phone, `شكراً جزيلاً لك ${name ? name + ' ' : ''}🌷\n\nإجاباتك ستساعدنا كثيراً في تحسين خدمات الشحن والتوصيل في اليمن.\n\nبارك الله فيك وفي وقتك الكريم! 🙏`);
    sessions.delete(phone);
    return;
  }
  const q = QUESTIONS[qIndex];
  if (q.options.length <= 3) {
    await sendButtons(phone, q.text, q.options.map((o, i) => ({ id: `opt_${i+1}`, title: o })));
  } else {
    await sendList(phone, q.text, q.options);
  }
}

async function processIncoming(phone: string, text: string) {
  const session = sessions.get(phone);
  if (!session) {
    console.log('[survey] no session for', phone, '— ignoring');
    return;
  }

  const t = text.toLowerCase().trim();
  console.log('[survey] phone:', phone, 'step:', session.step, 'text:', text.slice(0, 50));

  if (session.step === 0) {
    // Waiting for YES/NO to start
    const isYes = /نعم|yes|اه|أيوا|ايوا|موافق|ابدأ|أبدأ|بدء|survey_yes|opt_1|start/.test(t);
    const isNo  = /لا$|^no$|لاحق|مو الحين|مش الحين|survey_later|opt_2/.test(t);

    if (isNo) {
      await sendText(phone, 'لا بأس 🙏 شكراً لك، يمكنك التواصل معنا في وقت آخر!');
      sessions.delete(phone);
      return;
    }
    if (isYes) {
      session.step = 1;
      sessions.set(phone, session);
      await sendText(phone, `ممتاز! 🙌 شكراً لك ${session.name || ''}\n\nسنبدأ بـ 7 أسئلة سريعة 👇`);
      await sendQuestion(phone, 0, session.name);
      return;
    }
    // Unclear answer
    await sendButtons(phone, 'هل ممكن نبدأ الاستبيان؟ 😊', [
      { id: 'survey_yes', title: 'نعم، أبدأ 😊' },
      { id: 'survey_later', title: 'لاحقاً' },
    ]);
    return;
  }

  // Active survey — record answer
  const qIndex = session.step - 1;
  if (qIndex < QUESTIONS.length) {
    const q = QUESTIONS[qIndex];
    session.data[q.key] = text;
    console.log('[survey] recorded', q.key, '=', text.slice(0, 40));
  }

  session.step++;
  sessions.set(phone, session);
  await sendQuestion(phone, qIndex + 1, session.name);
}

// ── Extract message from whapi webhook payload ─────────────────────────────
// Based on official whapi webhook format documentation
function extractMessage(body: any): { phone: string; text: string } | null {
  const messages: any[] = body?.messages || [];
  if (!messages.length) return null;

  for (const msg of messages) {
    // Skip outbound messages (from_me: true)
    if (msg.from_me === true) continue;

    // Get phone: prefer 'from' field (clean number), fallback to chat_id (has @s.whatsapp.net)
    const phone = normalizePhone(msg.from || msg.chat_id);
    if (!phone || !isValidPhone(phone)) continue;

    let text = '';

    // Type "reply" = customer tapped a button (buttons_reply)
    if (msg.type === 'reply' && msg.reply?.buttons_reply) {
      text = sf(msg.reply.buttons_reply.title || msg.reply.buttons_reply.id);
    }
    // Type "interactive" = list_reply or button_reply
    else if (msg.type === 'interactive') {
      const ia = msg.interactive;
      if (ia?.type === 'list_reply') text = sf(ia.list_reply?.title || ia.list_reply?.id);
      else if (ia?.type === 'buttons_reply') text = sf(ia.buttons_reply?.title || ia.buttons_reply?.id);
      else if (ia?.type === 'button_reply') text = sf(ia.button_reply?.title || ia.button_reply?.id);
    }
    // Type "text" = plain text message
    else if (msg.type === 'text') {
      text = sf(msg.text?.body);
    }
    // Type "link_preview" = text with URL
    else if (msg.type === 'link_preview') {
      text = sf(msg.link_preview?.body);
    }
    // Fallback: try common fields
    else {
      text = sf(msg.text?.body || msg.body || msg.text);
    }

    if (!text) continue;
    return { phone, text };
  }
  return null;
}

// ── Greeting text ──────────────────────────────────────────────────────────
function greetingText() {
  return 'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nنعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\n\nهل ممكن نبدأ؟ 😊';
}

// ── Main handler ───────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  try { return await handleRequest(req, res); }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[handler] crash:', msg);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: false, message: `خطأ داخلي: ${msg}` }));
    }
  }
}

async function handleRequest(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    res.end(); return;
  }

  const url = (req.url || '/').split('?')[0];
  console.log('[req]', req.method, url);

  // ── Settings save ─────────────────────────────────────────────────────
  if (url.includes('/admin/settings/save') && req.method === 'POST') {
    const body = await readBody(req);
    const w = body.waba || {};
    if (sf(w.apiKey)) runtimeToken = sf(w.apiKey);
    if (sf(w.apiUrl)) runtimeUrl = sf(w.apiUrl).replace(/\/+$/, '');
    return ok(res, { ok: true, saved: true, hasToken: !!runtimeToken });
  }

  // ── Test connection (browser tests directly — Vercel can't reach whapi) ─
  if (url.includes('/test-connection') && req.method === 'POST') {
    const body = await readBody(req);
    const key = sf(body.apiKey);
    if (!key) return fail(res, 400, 'API Key مطلوب');
    runtimeToken = key;
    if (sf(body.apiUrl)) runtimeUrl = sf(body.apiUrl).replace(/\/+$/, '');
    return ok(res, { ok: true, message: '✅ تم حفظ الإعدادات' });
  }

  // ── Campaign launch ───────────────────────────────────────────────────
  if (url.includes('/campaigns/launch') && req.method === 'POST') {
    const body = await readBody(req);
    const rawList: any[] = Array.isArray(body.customers) ? body.customers
      : Array.isArray(body.recipients) ? body.recipients : [];

    console.log('[campaign] raw:', rawList.length, 'first:', JSON.stringify(rawList[0] || null));

    const customers: Array<{ phone: string; name: string; city: string }> = [];
    const skipped: string[] = [];

    for (const row of rawList) {
      const raw = String(row.phone || row.phoneNumber || row.mobile || row.whatsapp || '');
      const phone = normalizePhone(raw);
      if (!phone || !isValidPhone(phone)) { skipped.push(raw || 'empty'); continue; }
      customers.push({ phone, name: String(row.name || ''), city: String(row.city || '') });
      // Pre-register session
      sessions.set(phone, { step: 0, name: String(row.name || ''), city: String(row.city || ''), data: {}, startedAt: Date.now() });
    }

    console.log('[campaign] valid:', customers.length, 'skipped:', skipped.length);
    if (!customers.length) {
      return fail(res, 400, `لا يوجد مستلمون صالحون (${rawList.length} صف، ${skipped.length} مرفوض)`);
    }

    const w = body.waba || {};
    if (sf(w.apiKey)) runtimeToken = sf(w.apiKey);
    if (sf(w.apiUrl)) runtimeUrl = sf(w.apiUrl).replace(/\/+$/, '');

    cleanupSessions();

    return ok(res, {
      ok: true,
      sendFromClient: true,
      customers,
      total: customers.length,
      skipped: skipped.length,
      greeting: greetingText(),
      waba: { apiUrl: runtimeUrl, apiKey: runtimeToken },
    });
  }

  // ── Webhook — receives customer replies from whapi ────────────────────
  if (url.includes('/integrations/survey-agent/webhook')) {
    // GET = webhook verification (whapi doesn't require it but handle anyway)
    if (req.method === 'GET') {
      return ok(res, { ok: true, status: 'ready' });
    }
    if (req.method !== 'POST') return ok(res, { ok: true });

    // MUST respond 200 immediately — whapi retries if response is slow
    ok(res, { ok: true });

    try {
      const body = await readBody(req);
      console.log('[webhook] event:', body?.event?.type, body?.event?.event, 'msgs:', body?.messages?.length || 0);

      // Only process messages events (not statuses, chats, etc.)
      if (body?.event?.type !== 'messages') return;
      if (body?.event?.event !== 'post') return;

      const parsed = extractMessage(body);
      if (!parsed) {
        console.log('[webhook] no parseable message in payload');
        return;
      }

      console.log('[webhook] from:', parsed.phone, 'text:', parsed.text.slice(0, 60));
      await processIncoming(parsed.phone, parsed.text);

    } catch (e) {
      console.error('[webhook] processing error:', e);
    }
    return;
  }

  // ── Survey config ─────────────────────────────────────────────────────
  if (url.includes('/survey/config')) {
    if (req.method === 'GET') return ok(res, { humanMode: false, questions: QUESTIONS });
    return ok(res, { ok: true });
  }

  // ── Static / dashboard routes ─────────────────────────────────────────
  if (url.includes('/market-intelligence/dashboard')) {
    return ok(res, { totalResponses: sessions.size, brokerDependent: 0, directPurchase: 0, codPreference: 0, topPlatforms: [], topCities: [], topBrokers: [], topProblems: [], responseRate: 0, avgOrderValue: 'N/A', marketShare: [] });
  }
  if (url.includes('/market-intelligence/responses')) return ok(res, []);
  if (url.includes('/market-intelligence/analytics')) return ok(res, { surveys: 0, completionRate: 0 });
  if (url.includes('/admin/campaigns')) return ok(res, { ok: true, campaigns: [] });
  if (url.includes('/messaging/templates')) return ok(res, []);
  if (url.includes('/messaging/quality')) return ok(res, { totalSent24h: 0, blockRate: '0%', reportRate: '0%', status: 'green' });
  if (url.includes('/messaging/can-send')) return ok(res, { ok: true });
  if (url.includes('/health') || url.includes('/ping')) {
    return ok(res, { ok: true, service: 'Linker Agent', activeSessions: sessions.size, token: runtimeToken ? runtimeToken.slice(0, 8) + '...' : 'none' });
  }

  fail(res, 404, `Route not found: ${url}`);
}
