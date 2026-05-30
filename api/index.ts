/**
 * Self-contained Vercel API handler — ZERO external dependencies.
 * Includes full survey conversation engine in the webhook handler.
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
function sf(v: unknown) { return typeof v === 'string' ? v.trim() : ''; }

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

// ── Phone helpers ──────────────────────────────────────────────────────────
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
  return /^967\d{9}$/.test(p);
}

// ── Survey conversation engine ─────────────────────────────────────────────
// Simple in-memory sessions (per serverless instance — resets on cold start)
// For production persistence, this would use a DB or KV store
const sessions = new Map<string, SessionState>();

interface SessionState {
  step: number;
  data: Record<string, string>;
  name: string;
  city: string;
}

const SURVEY_STEPS: Array<{
  key: string;
  text: string;
  options?: string[];
  multi?: boolean;
}> = [
  {
    key: 'platforms',
    text: 'من أي المنصات أو التطبيقات تشتري غالباً؟',
    options: ['شي إن', 'نون', 'أمازون', 'علي إكسبريس', 'تيمو', 'آي هيرب', 'نايس ون', 'متاجر إنستغرام', 'أخرى'],
    multi: true,
  },
  {
    key: 'purchase_method',
    text: 'كيف تقوم بالشراء غالباً؟',
    options: ['أطلب بنفسي مباشرة', 'أطلب عبر وسيط', 'أحياناً مباشرة وأحياناً وسيط', 'أشتري من متجر محلي'],
  },
  {
    key: 'delivery_time',
    text: 'كم يستغرق توصيل طلبك عادةً؟',
    options: ['أقل من أسبوع', 'أسبوع إلى أسبوعين', '2-4 أسابيع', 'أكثر من شهر'],
  },
  {
    key: 'has_problems',
    text: 'هل واجهت مشاكل في استلام طلباتك؟',
    options: ['نعم، أكثر من مرة', 'نعم، مرة أو مرتين', 'لا، لم أواجه مشاكل'],
  },
  {
    key: 'order_value',
    text: 'كم يبلغ متوسط قيمة طلبك الواحد؟',
    options: ['أقل من 50$', '50$ - 100$', '100$ - 200$', 'أكثر من 200$'],
  },
  {
    key: 'frequency',
    text: 'كم مرة تطلب في الشهر؟',
    options: ['مرة أو أقل', '2-3 مرات', '4-6 مرات', 'أكثر من 6 مرات'],
  },
  {
    key: 'biggest_annoyance',
    text: 'ما أكبر مشكلة تواجهها في التسوق الإلكتروني وشحن البضائع لليمن؟',
    options: ['التأخير في التسليم', 'ارتفاع رسوم الشحن', 'الرسوم الجمركية', 'فقدان أو تلف الطرود', 'صعوبة تتبع الشحنة', 'مشاكل في الدفع'],
  },
];

async function sendText(phone: string, text: string) {
  try {
    const res = await fetch(`${runtimeUrl}/messages/text`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtimeToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, body: text }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) console.error('[send text]', phone, res.status, await res.text());
    return res.ok;
  } catch (e) { console.error('[send text err]', e); return false; }
}

async function sendButtons(phone: string, text: string, buttons: Array<{id: string; title: string}>) {
  try {
    const res = await fetch(`${runtimeUrl}/messages/interactive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtimeToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        type: 'button',
        body: { text },
        action: { buttons: buttons.slice(0, 3).map(b => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn('[send buttons] failed, trying text fallback', res.status);
      return sendText(phone, text);
    }
    return true;
  } catch (e) { console.error('[send buttons err]', e); return sendText(phone, text); }
}

async function sendList(phone: string, text: string, options: string[]) {
  try {
    const rows = options.slice(0, 10).map((title, i) => ({ id: `opt_${i+1}`, title: title.slice(0, 24) }));
    const res = await fetch(`${runtimeUrl}/messages/interactive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${runtimeToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        type: 'list',
        header: { type: 'text', text: 'اختر الإجابة' },
        body: { text },
        action: { button: 'اختر الإجابة', sections: [{ title: 'الخيارات', rows }] },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn('[send list] failed, fallback to numbered text', res.status);
      const numbered = options.map((o, i) => `${i+1}. ${o}`).join('\n');
      return sendText(phone, `${text}\n\n${numbered}`);
    }
    return true;
  } catch (e) { console.error('[send list err]', e); return false; }
}

async function sendStep(phone: string, stepIndex: number, name: string) {
  if (stepIndex >= SURVEY_STEPS.length) {
    await sendText(phone, `شكراً جزيلاً ${name} 🌷\n\nإجاباتك ستساعدنا كثيراً في تحسين خدمات الشحن والتوصيل في اليمن.\n\nبارك الله فيك! 🙏`);
    return;
  }
  const step = SURVEY_STEPS[stepIndex];
  if (!step.options?.length) {
    await sendText(phone, step.text);
    return;
  }
  if (step.options.length <= 3) {
    await sendButtons(phone, step.text, step.options.map((o, i) => ({ id: `opt_${i+1}`, title: o })));
  } else {
    await sendList(phone, step.text + (step.multi ? '\n\n(يمكنك اختيار أكثر من إجابة)' : ''), step.options);
  }
}

async function handleSurveyReply(phone: string, text: string) {
  const session = sessions.get(phone);
  if (!session) {
    console.log('[survey] no session for', phone, '- ignoring');
    return;
  }

  const lowerText = text.toLowerCase().trim();

  // Step 0 = waiting for YES/NO to start
  if (session.step === 0) {
    const isYes = ['نعم', 'yes', 'اه', 'أيوا', 'موافق', 'survey_yes', 'أبدأ', 'ابدأ', 'بدء'].some(w => lowerText.includes(w));
    const isNo = ['لا', 'no', 'لاحقاً', 'لاحقا', 'survey_later', 'مو الحين', 'مش الحين'].some(w => lowerText.includes(w));

    if (isNo) {
      await sendText(phone, 'لا بأس 🙏 يمكنك التواصل معنا في وقت آخر. شكراً لك!');
      sessions.delete(phone);
      return;
    }
    if (isYes) {
      await sendText(phone, `ممتاز 🙏 شكراً لك ${session.name ? session.name : ''} 🌷\n\nأول سؤال 👇`);
      session.step = 1;
      sessions.set(phone, session);
      await sendStep(phone, 0, session.name);
      return;
    }
    // unclear answer — re-prompt
    await sendButtons(phone, 'هل ممكن نبدأ الاستبيان؟ 😊', [
      { id: 'survey_yes', title: 'نعم، أبدأ 😊' },
      { id: 'survey_later', title: 'لاحقاً' },
    ]);
    return;
  }

  // Steps 1+ = record answer and move to next
  const currentStepIndex = session.step - 1;
  const currentStep = SURVEY_STEPS[currentStepIndex];
  if (currentStep) {
    session.data[currentStep.key] = text;
    console.log('[survey]', phone, 'step', session.step, 'answer:', text.slice(0, 50));
  }

  session.step++;
  sessions.set(phone, session);
  await sendStep(phone, currentStepIndex + 1, session.name);

  if (currentStepIndex + 1 >= SURVEY_STEPS.length) {
    sessions.delete(phone);
  }
}

function startSession(phone: string, name: string, city: string) {
  sessions.set(phone, { step: 0, data: {}, name, city });
}

// ── Greeting message ───────────────────────────────────────────────────────
function greetingText() {
  return 'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\nوإجاباتك بتساعدنا نفهم احتياجات العملاء بشكل أفضل.\n\nهل ممكن نبدأ؟ 😊';
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
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
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

  // ── Test connection (just saves config — browser tests directly) ──────
  if (url.includes('/test-connection') && req.method === 'POST') {
    const body = await readBody(req);
    const key = sf(body.apiKey);
    if (!key) return fail(res, 400, 'API Key مطلوب');
    runtimeToken = key;
    if (sf(body.apiUrl)) runtimeUrl = sf(body.apiUrl).replace(/\/+$/, '');
    return ok(res, { ok: true, message: '✅ تم حفظ الإعدادات' });
  }

  // ── Campaign launch — validate phones, return list to client ──────────
  if (url.includes('/campaigns/launch') && req.method === 'POST') {
    const body = await readBody(req);
    const rawList = Array.isArray(body.customers) ? body.customers : Array.isArray(body.recipients) ? body.recipients : [];
    console.log('[campaign] raw count:', rawList.length, 'first:', JSON.stringify(rawList[0] || null));

    const customers: Array<{ phone: string; name: string; city: string }> = [];
    const skipped: string[] = [];
    for (const row of rawList) {
      const raw = String(row.phone || row.phoneNumber || row.mobile || row.whatsapp || '');
      const phone = normalizePhone(raw);
      if (!phone || !isValidPhone(phone)) { skipped.push(raw || 'empty'); continue; }
      customers.push({ phone, name: String(row.name || ''), city: String(row.city || '') });
      // Pre-register session so webhook can process replies immediately
      startSession(phone, String(row.name || ''), String(row.city || ''));
    }

    console.log('[campaign] valid:', customers.length, 'skipped:', skipped.length);
    if (!customers.length) return fail(res, 400, `لا يوجد مستلمون صالحون (${rawList.length} صف، ${skipped.length} مرفوض)`);

    const w = body.waba || {};
    const token = sf(w.apiKey) || runtimeToken;
    const baseUrl = (sf(w.apiUrl) || runtimeUrl).replace(/\/+$/, '');
    if (token) { runtimeToken = token; runtimeUrl = baseUrl; }

    return ok(res, {
      ok: true,
      sendFromClient: true,
      customers,
      total: customers.length,
      skipped: skipped.length,
      greeting: greetingText(),
      waba: { apiUrl: baseUrl, apiKey: token },
    });
  }

  // ── Webhook — receives customer replies from whapi ────────────────────
  if (url.includes('/integrations/survey-agent/webhook')) {
    if (req.method === 'GET') return ok(res, { ok: true, challenge: req.query?.challenge });
    if (req.method !== 'POST') return ok(res, { ok: true });

    // Respond immediately so whapi doesn't retry
    ok(res, { ok: true });

    try {
      const body = await readBody(req);
      const messages = (body.messages || body.data?.messages) as any[];
      if (!Array.isArray(messages) || !messages.length) return;

      for (const msg of messages) {
        // Skip outbound messages
        if (msg.from_me || msg.fromMe) continue;

        const phone = normalizePhone(msg.from || msg.chat_id || msg.chatId);
        if (!phone || !isValidPhone(phone)) continue;

        // Extract text from different message types
        let text = '';
        if (msg.type === 'interactive') {
          const ia = msg.interactive as any;
          if (ia?.type === 'button_reply') text = ia.button_reply?.title || ia.button_reply?.id || '';
          else if (ia?.type === 'list_reply') text = ia.list_reply?.title || ia.list_reply?.id || '';
        } else if (msg.type === 'button') {
          text = msg.button?.text || msg.button?.payload || '';
        } else {
          text = sf(msg.text?.body || msg.body || msg.text || msg.message);
        }

        if (!text) continue;
        console.log('[webhook] from:', phone, 'text:', text.slice(0, 60));

        await handleSurveyReply(phone, text);
      }
    } catch (e) { console.error('[webhook] error:', e); }
    return;
  }

  // ── Survey config ─────────────────────────────────────────────────────
  if (url.includes('/survey/config')) {
    if (req.method === 'GET') return ok(res, { humanMode: false, questions: SURVEY_STEPS });
    return ok(res, { ok: true });
  }

  // ── Static data routes ────────────────────────────────────────────────
  if (url.includes('/market-intelligence/dashboard')) return ok(res, { totalResponses: sessions.size, brokerDependent: 0, directPurchase: 0, codPreference: 0, topPlatforms: [], topCities: [], topBrokers: [], topProblems: [], responseRate: 0, avgOrderValue: 'N/A', marketShare: [] });
  if (url.includes('/market-intelligence/responses')) return ok(res, []);
  if (url.includes('/market-intelligence/analytics')) return ok(res, { surveys: 0, completionRate: 0 });
  if (url.includes('/admin/campaigns')) return ok(res, { ok: true, campaigns: [] });
  if (url.includes('/messaging/templates')) return ok(res, []);
  if (url.includes('/messaging/quality')) return ok(res, { totalSent24h: 0, blockRate: '0%', reportRate: '0%', status: 'green' });
  if (url.includes('/messaging/can-send')) return ok(res, { ok: true });
  if (url.includes('/health') || url.includes('/ping')) return ok(res, { ok: true, service: 'Linker Agent', sessions: sessions.size });

  fail(res, 404, `Route not found: ${url}`);
}
