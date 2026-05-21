/**
 * Self-contained Vercel handler.
 * Routes connection tests, campaign launches, and Whapi webhooks.
 */

type JsonObject = Record<string, unknown>;

type SurveyState =
  | 'GREETING'
  | 'ASK_PLATFORMS'
  | 'ASK_FAVORITE_PLATFORM'
  | 'ASK_PURCHASE_METHOD'
  | 'ASK_BROKER_SOURCE'
  | 'ASK_BROKER_NAME'
  | 'ASK_BROKER_CHANNEL'
  | 'ASK_BROKER_REASON'
  | 'ASK_DELIVERY_TIME'
  | 'ASK_HAS_COD'
  | 'ASK_HAS_PROBLEMS'
  | 'ASK_MAIN_PROBLEM'
  | 'ASK_ORDER_VALUE'
  | 'ASK_FREQUENCY'
  | 'ASK_CITY'
  | 'ASK_AGE'
  | 'ASK_GENDER'
  | 'ASK_PAYMENT_METHOD'
  | 'ASK_CANCELED_BEFORE'
  | 'ASK_CANCEL_REASON'
  | 'ASK_BIGGEST_ANNOYANCE'
  | 'ASK_DIRECT_PROBABILITY'
  | 'ASK_DIRECT_ENCOURAGEMENT'
  | 'ASK_DIRECT_HESITATION'
  | 'ASK_REFUSAL_REASON'
  | 'COMPLETED'
  | 'REJECTED';

type PurchaseMethod = 'direct' | 'broker' | 'mixed' | 'local';

interface SurveyData {
  platforms?: string;
  preferredPlatform?: string;
  purchaseMethod?: PurchaseMethod;
  purchaseMethodRaw?: string;
  brokerType?: string;
  brokerSource?: string;
  brokerName?: string;
  brokerPlatform?: string;
  brokerReason?: string;
  deliveryTime?: string;
  cashOnDelivery?: string;
  hasProblems?: boolean;
  mainProblem?: string;
  orderValue?: string;
  purchaseFrequency?: string;
  city?: string;
  ageGroup?: string;
  gender?: string;
  paymentPreference?: string;
  canceledBefore?: boolean;
  cancelReason?: string;
  biggestAnnoyance?: string;
  directPurchaseProb?: string;
  directEncouragement?: string;
  directHesitation?: string;
  refusalReason?: string;
}

interface SurveyOption {
  title: string;
  answer: string;
}

interface SurveySession {
  phone: string;
  campaignId: string;
  currentState: SurveyState;
  data: SurveyData;
  rawLogs: Array<{ sender: 'bot' | 'user'; state: SurveyState; text: string; at: string }>;
  apiUrl: string;
  apiKey: string;
  updatedAt: number;
}

const DEFAULT_API_URL = process.env.WHATSAPP_API_URL || 'https://gate.whapi.cloud/';
const DEFAULT_API_TOKEN = process.env.WHATSAPP_API_TOKEN || 'iQpbDrEIyNctlBtajcEP3NjFNTN9NfT4';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

let runtimeWaba = {
  apiUrl: normalizeUrl(DEFAULT_API_URL),
  apiKey: DEFAULT_API_TOKEN,
};

const sessions = new Map<string, SurveySession>();

const surveyMessages: Record<SurveyState, string> = {
  GREETING:
    'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها، بهدف تحسين خدمات الشحن والتوصيل والدفع داخل اليمن.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\nوإجاباتك بتساعدنا نفهم احتياجات العملاء بشكل أفضل.\n\nهل ممكن نبدأ؟ 😊',
  ASK_PLATFORMS:
    'من أي المنصات أو التطبيقات تشتري غالباً؟\n\n1️⃣ شي إن\n2️⃣ نون\n3️⃣ أمازون\n4️⃣ علي إكسبريس\n5️⃣ تيمو\n6️⃣ آي هيرب\n7️⃣ نايس ون\n8️⃣ متاجر إنستغرام\n9️⃣ مواقع أو تطبيقات أخرى',
  ASK_FAVORITE_PLATFORM: 'ممتاز 👍\nوأي منصة تعتبرها الأكثر استخداماً بالنسبة لك؟',
  ASK_PURCHASE_METHOD:
    'كيف تقوم بالشراء غالباً؟ 👀\n\n1️⃣ أطلب بنفسي مباشرة من الموقع\n2️⃣ أطلب عبر وسيط أو مندوب\n3️⃣ أحياناً مباشرة وأحياناً عبر وسيط\n4️⃣ أشتري من متجر محلي يعرض المنتجات',
  ASK_BROKER_SOURCE:
    'تمام 👍\nغالباً كيف تعرفت على الوسيط؟\n\n1️⃣ إنستغرام\n2️⃣ واتساب\n3️⃣ تيك توك\n4️⃣ تيليجرام\n5️⃣ صديق أو معرفة\n6️⃣ متجر محلي\n7️⃣ إعلان',
  ASK_BROKER_NAME: 'إذا ممكن، ايش اسم الحساب أو الوسيط اللي تتعامل معه غالباً؟ 🌷\n\n(تقدر تكتب الاسم فقط)',
  ASK_BROKER_CHANNEL:
    'هذا الوسيط موجود غالباً فين؟\n\n1️⃣ إنستغرام\n2️⃣ واتساب\n3️⃣ تيك توك\n4️⃣ تيليجرام\n5️⃣ متجر فعلي\n6️⃣ مكان آخر',
  ASK_BROKER_REASON:
    'ايش أكثر سبب يخليك تفضل الطلب عبر وسيط؟ 👀\n\n1️⃣ ما عندي وسيلة دفع إلكترونية\n2️⃣ ما أعرف طريقة الطلب\n3️⃣ الوسيط أسهل وأسرع\n4️⃣ أثق بالوسيط أكثر\n5️⃣ يوفر الدفع عند الاستلام\n6️⃣ يساعد في الشحن والجمارك\n7️⃣ يوفر تجميع الطلبات\n8️⃣ أقدر أتواصل معه بسهولة',
  ASK_DELIVERY_TIME:
    'تقريباً كم تستغرق الطلبية حتى توصل لك؟ 🚚\n\n1️⃣ أقل من أسبوعين\n2️⃣ من أسبوعين إلى شهر\n3️⃣ أكثر من شهر\n4️⃣ تختلف حسب الطلب',
  ASK_HAS_COD: 'هل الوسيط يوفر الدفع عند الاستلام؟\n\n1️⃣ نعم\n2️⃣ لا\n3️⃣ أحياناً',
  ASK_HAS_PROBLEMS: 'هل قد واجهت مشكلة مع الطلبات؟ 👀\n\n1️⃣ نعم\n2️⃣ لا',
  ASK_MAIN_PROBLEM:
    'ايش أكثر مشكلة واجهتك؟\n\n1️⃣ تأخير الطلب\n2️⃣ ارتفاع الشحن\n3️⃣ المنتج مختلف\n4️⃣ ضعف التتبع\n5️⃣ صعوبة التواصل\n6️⃣ مشكلة في المقاس\n7️⃣ مشكلة بالدفع\n8️⃣ مشكلة بالاستلام\n9️⃣ أخرى',
  ASK_ORDER_VALUE:
    'تقريباً كم متوسط قيمة طلباتك عادة؟ 💰\n\n1️⃣ أقل من 10 ألف\n2️⃣ من 10 ألف إلى 25 ألف\n3️⃣ من 25 ألف إلى 50 ألف\n4️⃣ من 50 ألف إلى 100 ألف\n5️⃣ أكثر من 100 ألف',
  ASK_FREQUENCY:
    'كم مرة تطلب تقريباً من المواقع أو التطبيقات الخارجية؟ 👀\n\n1️⃣ أسبوعياً\n2️⃣ مرتين بالشهر\n3️⃣ شهرياً\n4️⃣ كل عدة أشهر\n5️⃣ فقط بالمواسم',
  ASK_CITY: 'أي مدينة أنت؟ 🌍',
  ASK_AGE: 'الفئة العمرية؟\n\n1️⃣ أقل من 18\n2️⃣ 18 - 24\n3️⃣ 25 - 34\n4️⃣ 35 - 44\n5️⃣ أكثر من 45',
  ASK_GENDER: 'الجنس؟\n\n1️⃣ ذكر\n2️⃣ أنثى',
  ASK_PAYMENT_METHOD:
    'ايش طريقة الدفع اللي تفضلها غالباً؟ 💳\n\n1️⃣ الدفع عند الاستلام\n2️⃣ تحويل\n3️⃣ محفظة إلكترونية\n4️⃣ بطاقة بنكية',
  ASK_CANCELED_BEFORE: 'هل سبق وألغيت طلب قبل؟ 👀\n\n1️⃣ نعم\n2️⃣ لا',
  ASK_CANCEL_REASON:
    'ايش كان السبب الرئيسي للإلغاء؟\n\n1️⃣ تأخير\n2️⃣ تغير السعر\n3️⃣ غيرت رأيي\n4️⃣ ضعف التواصل\n5️⃣ فقدت الثقة\n6️⃣ تكلفة الشحن\n7️⃣ سبب آخر',
  ASK_BIGGEST_ANNOYANCE:
    'ايش أكثر شيء يزعجك حالياً في تجربة الطلب من الخارج؟\n\n1️⃣ التأخير\n2️⃣ ارتفاع تكلفة الشحن\n3️⃣ عدم وجود دفع عند الاستلام\n4️⃣ ضعف الثقة\n5️⃣ صعوبة المرتجعات\n6️⃣ اختلاف المنتج\n7️⃣ ضعف التتبع\n8️⃣ عدم وضوح السعر النهائي\n9️⃣ ضعف التواصل\n🔟 مشاكل الجمارك أو الرسوم',
  ASK_DIRECT_PROBABILITY:
    'إذا دعمت شي إن اليمن رسمياً مع دفع عند الاستلام وتتبع واضح وتوصيل محلي… هل تتوقع تطلب مباشرة منها؟ 👀\n\n1️⃣ أكيد\n2️⃣ غالباً\n3️⃣ ممكن\n4️⃣ لا',
  ASK_DIRECT_ENCOURAGEMENT:
    'ممتاز 👍\nايش أكثر شيء بيشجعك تطلب مباشرة؟\n\n1️⃣ الدفع عند الاستلام\n2️⃣ سرعة التوصيل\n3️⃣ تتبع واضح\n4️⃣ أسعار أفضل\n5️⃣ ضمان واسترجاع\n6️⃣ ثقة أكبر',
  ASK_DIRECT_HESITATION: 'ايش أكثر شيء يخليك متردد حالياً؟ 👀',
  ASK_REFUSAL_REASON: 'ممكن نعرف السبب؟ 🌷',
  COMPLETED:
    'شكراً لك جداً 🙏🌷\nمشاركتك أفادتنا بشكل كبير، وبإذن الله تساعد في تحسين خدمات التسوق والتوصيل داخل اليمن.\n\nنتمنى لك يوم سعيد 💜',
  REJECTED: 'ولا يهمك أبداً 🌷\nشكراً لوقتك، ونتمنى لك يوم جميل 🙏',
};

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

function resolveWabaSettings(body: JsonObject, useRuntimeFallback = true) {
  const waba = objectField(body.waba);
  const apiUrl = stringField(body.apiUrl) || stringField(waba?.apiUrl) || (useRuntimeFallback ? runtimeWaba.apiUrl : DEFAULT_API_URL);
  const apiKey = stringField(body.apiKey) || stringField(waba?.apiKey) || (useRuntimeFallback ? runtimeWaba.apiKey : '');
  return { apiUrl: normalizeUrl(apiUrl), apiKey };
}

function rememberWabaSettings(settings: { apiUrl: string; apiKey: string }) {
  if (settings.apiUrl) runtimeWaba.apiUrl = normalizeUrl(settings.apiUrl);
  if (settings.apiKey) runtimeWaba.apiKey = settings.apiKey;
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
        try { status = (JSON.parse(text) as Record<string, unknown>)?.status as string || 'متصل'; } catch { /**/ }
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

function containsAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

function parseApproval(input: string): boolean | undefined {
  const approveKeywords = ['نعم', 'ابدأ', 'ابدا', 'موافق', 'يلا', 'ماشي', 'ok', 'yes'];
  const rejectKeywords = ['لا', 'لاحق', 'مشغول', 'مش فاضي', 'no'];
  const lower = input.toLowerCase();
  if (containsAny(lower, approveKeywords)) return true;
  if (containsAny(lower, rejectKeywords)) return false;
  return undefined;
}

function parseYesNo(input: string): boolean | undefined {
  if (containsAny(input, ['نعم', 'ايوه', 'أيوه', 'ايوا'])) return true;
  if (containsAny(input, ['لا', 'كلا'])) return false;
  return undefined;
}

function parsePurchaseMethod(input: string): PurchaseMethod {
  if (containsAny(input, ['متجر محلي', 'محلي', 'محل'])) return 'local';
  if (containsAny(input, ['أحيان', 'احيان', 'مرات', 'أحيانا'])) return 'mixed';
  if (containsAny(input, ['وسيط', 'وسيطة', 'مندوب', 'مندوبة', 'حساب', 'صفحة', 'متجر', 'بائع', 'بائعة'])) return 'broker';
  return 'direct';
}

function extractBrokerType(input: string): string {
  if (containsAny(input, ['مندوبة', 'وسيطة', 'بنت', 'أخت', 'خالة', 'صديقة', 'وحدة', 'بائعة', 'تاجرة'])) return 'individual_female';
  if (containsAny(input, ['مندوب', 'ولد', 'شخص', 'واحد', 'صاحب'])) return 'individual_male';
  if (containsAny(input, ['انستا', 'انستغرام', 'إنستغرام', 'انستقرام', 'صفحة'])) return 'instagram_store';
  if (containsAny(input, ['واتس', 'واتساب', 'whatsapp'])) return 'whatsapp_seller';
  if (containsAny(input, ['تيليجرام', 'تليجرام', 'telegram'])) return 'telegram_seller';
  if (containsAny(input, ['تيك', 'تيك توك', 'tiktok'])) return 'tiktok_seller';
  if (containsAny(input, ['متجر', 'محل', 'محلي'])) return 'local_store';
  if (containsAny(input, ['تاجر', 'تاجرة', 'بائع', 'بائعة'])) return 'reseller';
  if (containsAny(input, ['شركة', 'مؤسسة'])) return 'company';
  return 'individual_unknown';
}

function extractPreferredPlatform(input: string) {
  const knownPlatforms = ['شي إن', 'نون', 'أمازون', 'علي إكسبريس', 'تيمو', 'آي هيرب', 'نايس ون'];
  const matchedPlatform = knownPlatforms.find((platform) => input.includes(platform));
  if (matchedPlatform) return matchedPlatform;
  return input.split(/[,،\n]/)[0]?.trim() || input.trim();
}

function isLikelyDirectPurchase(input: string) {
  return containsAny(input, ['أكيد', 'اكيد', 'غالب', 'احتمال كبير']);
}

function isMaybeDirectPurchase(input: string) {
  return containsAny(input, ['ممكن', 'ربما', 'يمكن']);
}

function captureAnswer(currentState: SurveyState, input: string, data: SurveyData) {
  const normalizedInput = input.trim();
  switch (currentState) {
    case 'ASK_PLATFORMS':
      data.platforms = normalizedInput;
      data.preferredPlatform = extractPreferredPlatform(normalizedInput);
      break;
    case 'ASK_FAVORITE_PLATFORM':
      data.preferredPlatform = normalizedInput;
      break;
    case 'ASK_PURCHASE_METHOD':
      data.purchaseMethod = parsePurchaseMethod(normalizedInput);
      data.purchaseMethodRaw = normalizedInput;
      if (data.purchaseMethod === 'broker' || data.purchaseMethod === 'mixed') data.brokerType = extractBrokerType(normalizedInput);
      break;
    case 'ASK_BROKER_SOURCE': data.brokerSource = normalizedInput; break;
    case 'ASK_BROKER_NAME': data.brokerName = normalizedInput; break;
    case 'ASK_BROKER_CHANNEL': data.brokerPlatform = normalizedInput; break;
    case 'ASK_BROKER_REASON': data.brokerReason = normalizedInput; break;
    case 'ASK_DELIVERY_TIME': data.deliveryTime = normalizedInput; break;
    case 'ASK_HAS_COD': data.cashOnDelivery = normalizedInput; break;
    case 'ASK_HAS_PROBLEMS': data.hasProblems = parseYesNo(normalizedInput) ?? false; break;
    case 'ASK_MAIN_PROBLEM': data.mainProblem = normalizedInput; break;
    case 'ASK_ORDER_VALUE': data.orderValue = normalizedInput; break;
    case 'ASK_FREQUENCY': data.purchaseFrequency = normalizedInput; break;
    case 'ASK_CITY': data.city = normalizedInput; break;
    case 'ASK_AGE': data.ageGroup = normalizedInput; break;
    case 'ASK_GENDER': data.gender = normalizedInput; break;
    case 'ASK_PAYMENT_METHOD': data.paymentPreference = normalizedInput; break;
    case 'ASK_CANCELED_BEFORE': data.canceledBefore = parseYesNo(normalizedInput) ?? false; break;
    case 'ASK_CANCEL_REASON': data.cancelReason = normalizedInput; break;
    case 'ASK_BIGGEST_ANNOYANCE': data.biggestAnnoyance = normalizedInput; break;
    case 'ASK_DIRECT_PROBABILITY': data.directPurchaseProb = normalizedInput; break;
    case 'ASK_DIRECT_ENCOURAGEMENT': data.directEncouragement = normalizedInput; break;
    case 'ASK_DIRECT_HESITATION': data.directHesitation = normalizedInput; break;
    case 'ASK_REFUSAL_REASON': data.refusalReason = normalizedInput; break;
    default: break;
  }
}

function determineNextState(currentState: SurveyState, input: string, data: SurveyData): SurveyState {
  switch (currentState) {
    case 'GREETING': return parseApproval(input) === false ? 'REJECTED' : 'ASK_PLATFORMS';
    case 'ASK_PLATFORMS':
      return (data.platforms || '').split(/[,،\n]/).filter((item) => item.trim().length > 0).length > 1
        ? 'ASK_FAVORITE_PLATFORM'
        : 'ASK_PURCHASE_METHOD';
    case 'ASK_FAVORITE_PLATFORM': return 'ASK_PURCHASE_METHOD';
    case 'ASK_PURCHASE_METHOD': return data.purchaseMethod === 'broker' || data.purchaseMethod === 'mixed' ? 'ASK_BROKER_SOURCE' : 'ASK_DELIVERY_TIME';
    case 'ASK_BROKER_SOURCE': return 'ASK_BROKER_NAME';
    case 'ASK_BROKER_NAME': return 'ASK_BROKER_CHANNEL';
    case 'ASK_BROKER_CHANNEL': return 'ASK_BROKER_REASON';
    case 'ASK_BROKER_REASON': return 'ASK_DELIVERY_TIME';
    case 'ASK_DELIVERY_TIME': return 'ASK_HAS_COD';
    case 'ASK_HAS_COD': return 'ASK_HAS_PROBLEMS';
    case 'ASK_HAS_PROBLEMS': return data.hasProblems ? 'ASK_MAIN_PROBLEM' : 'ASK_ORDER_VALUE';
    case 'ASK_MAIN_PROBLEM': return 'ASK_ORDER_VALUE';
    case 'ASK_ORDER_VALUE': return 'ASK_FREQUENCY';
    case 'ASK_FREQUENCY': return 'ASK_CITY';
    case 'ASK_CITY': return 'ASK_AGE';
    case 'ASK_AGE': return 'ASK_GENDER';
    case 'ASK_GENDER': return 'ASK_PAYMENT_METHOD';
    case 'ASK_PAYMENT_METHOD': return 'ASK_CANCELED_BEFORE';
    case 'ASK_CANCELED_BEFORE': return data.canceledBefore ? 'ASK_CANCEL_REASON' : 'ASK_BIGGEST_ANNOYANCE';
    case 'ASK_CANCEL_REASON': return 'ASK_BIGGEST_ANNOYANCE';
    case 'ASK_BIGGEST_ANNOYANCE': return 'ASK_DIRECT_PROBABILITY';
    case 'ASK_DIRECT_PROBABILITY':
      if (isLikelyDirectPurchase(input)) return 'ASK_DIRECT_ENCOURAGEMENT';
      return isMaybeDirectPurchase(input) ? 'ASK_DIRECT_HESITATION' : 'ASK_REFUSAL_REASON';
    case 'ASK_DIRECT_ENCOURAGEMENT':
    case 'ASK_DIRECT_HESITATION':
    case 'ASK_REFUSAL_REASON':
      return 'COMPLETED';
    default:
      return 'COMPLETED';
  }
}

function questionForState(state: SurveyState, bodyPrefix = '') {
  if (state === 'GREETING') {
    return {
      body: surveyMessages.GREETING,
      options: [
        { title: 'نعم، أبدأ', answer: 'نعم' },
        { title: 'لاحقاً', answer: 'لا' },
      ],
    };
  }

  const message = surveyMessages[state];
  const bodyLines: string[] = [];
  const options: SurveyOption[] = [];
  const optionPattern = /^(?:[0-9]+️⃣|🔟|\d+)\s*[).:-]?\s*(.+)$/u;

  for (const line of message.split('\n')) {
    const match = line.trim().match(optionPattern);
    if (match?.[1]) options.push({ title: match[1].trim(), answer: match[1].trim() });
    else bodyLines.push(line);
  }

  return { body: `${bodyPrefix}${bodyLines.join('\n').trim()}`.trim(), options };
}

function optionAnswer(state: SurveyState, index: number) {
  return questionForState(state).options[index]?.answer || '';
}

function optionId(state: SurveyState, index: number) {
  return `survey:${state}:${index}`;
}

function parseOptionId(value: string) {
  const normalized = value.split(':').slice(-3).join(':');
  const match = normalized.match(/^survey:([A-Z_]+):(\d+)$/);
  if (!match) return null;
  const state = match[1] as SurveyState;
  const index = Number(match[2]);
  if (!Number.isInteger(index) || !surveyMessages[state]) return null;
  return { state, index, answer: optionAnswer(state, index) };
}

function compactTitle(title: string) {
  return title.length > 24 ? `${title.slice(0, 21)}...` : title;
}

async function postToWhapi(apiUrl: string, apiKey: string, path: string, payload: unknown) {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const responseBody = await response.text();
    if (response.ok) return { ok: true as const };
    return { ok: false as const, message: parseWhapiError(response.status, responseBody), status: response.status };
  } catch (err) {
    const message = err instanceof Error && err.name === 'TimeoutError'
      ? 'انتهت مهلة الإرسال إلى Whapi'
      : `تعذر الإرسال إلى Whapi: ${err instanceof Error ? err.message : String(err)}`;
    return { ok: false as const, message };
  }
}

function fallbackText(body: string, options: SurveyOption[]) {
  if (options.length === 0) return body;
  return `${body}\n\n${options.map((option) => `- ${option.title}`).join('\n')}`;
}

async function sendWhapiText(apiUrl: string, apiKey: string, to: string, text: string) {
  return postToWhapi(apiUrl, apiKey, '/messages/text', { to, body: text });
}

async function sendSurveyMessage(apiUrl: string, apiKey: string, to: string, state: SurveyState, bodyPrefix = '') {
  const question = questionForState(state, bodyPrefix);
  if (question.options.length === 0) return sendWhapiText(apiUrl, apiKey, to, question.body);

  const quickButtonsAllowed = question.options.length <= 3 && question.options.every((option) => option.title.length <= 25);
  const payload = quickButtonsAllowed
    ? {
      to,
      type: 'button',
      body: { text: question.body },
      action: {
        buttons: question.options.map((option, index) => ({
          type: 'quick_reply',
          id: optionId(state, index),
          title: option.title,
        })),
      },
    }
    : {
      to,
      type: 'list',
      body: { text: question.body },
      action: {
        list: {
          label: 'اختر الإجابة',
          sections: [{
            title: 'الخيارات',
            rows: question.options.map((option, index) => ({
              id: optionId(state, index),
              title: compactTitle(option.title),
              description: option.title,
            })),
          }],
        },
      },
    };

  const interactiveResult = await postToWhapi(apiUrl, apiKey, '/messages/interactive', payload);
  if (interactiveResult.ok) return interactiveResult;
  return sendWhapiText(apiUrl, apiKey, to, fallbackText(question.body, question.options));
}

function nowIso() {
  return new Date().toISOString();
}

function purgeExpiredSessions() {
  const expiresBefore = Date.now() - SESSION_TTL_MS;
  for (const [phone, session] of sessions.entries()) {
    if (session.updatedAt < expiresBefore) sessions.delete(phone);
  }
}

async function startSurvey(phone: string, campaignId: string, apiUrl: string, apiKey: string) {
  sessions.set(phone, {
    phone,
    campaignId,
    currentState: 'GREETING',
    data: {},
    rawLogs: [{ sender: 'bot', state: 'GREETING', text: surveyMessages.GREETING, at: nowIso() }],
    apiUrl,
    apiKey,
    updatedAt: Date.now(),
  });
  return sendSurveyMessage(apiUrl, apiKey, phone, 'GREETING');
}

async function launchCampaign(body: JsonObject) {
  const customers = Array.isArray(body.customers) ? body.customers : [];
  if (customers.length === 0) {
    return { status: 400, payload: { ok: false, message: 'لا يوجد عملاء في طلب إطلاق الحملة' } };
  }

  const { apiUrl, apiKey } = resolveWabaSettings(body);
  rememberWabaSettings({ apiUrl, apiKey });
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

  purgeExpiredSessions();
  let queued = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let index = 0; index < validCustomers.length; index += 5) {
    const batch = validCustomers.slice(index, index + 5);
    const results = await Promise.all(batch.map(customer => startSurvey(customer.phone, stringField(body.campaignId) || 'default', apiUrl, apiKey)));
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

function firstObject(...values: unknown[]) {
  for (const value of values) {
    const candidate = objectField(value);
    if (candidate) return candidate;
  }
  return null;
}

function extractIncoming(body: JsonObject) {
  const messages = Array.isArray(body.messages) ? body.messages : [body];
  for (const rawMessage of messages) {
    const message = objectField(rawMessage);
    if (!message) continue;
    if (message.from_me === true || message.fromMe === true) continue;

    const phone = cleanPhone(message.from || message.chat_id || message.chatId || message.sender);
    if (!phone) continue;

    const reply = objectField(message.reply);
    const replySource = firstObject(
      reply?.buttons_reply,
      reply?.button_reply,
      reply?.list_reply,
      reply?.selected_row,
      objectField(message.interactive)?.button_reply,
      objectField(message.interactive)?.list_reply,
    );
    const textObject = objectField(message.text);
    const id = stringField(replySource?.id) || stringField(replySource?.row_id) || stringField(replySource?.button_id);
    const text = stringField(replySource?.title)
      || stringField(replySource?.text)
      || stringField(replySource?.description)
      || stringField(textObject?.body)
      || stringField(message.body)
      || stringField(message.text);

    return { phone, id, text };
  }
  return null;
}

async function handleSurveyWebhook(body: JsonObject) {
  const incoming = extractIncoming(body);
  if (!incoming) return { ok: true, ignored: true };

  purgeExpiredSessions();
  const selection = parseOptionId(incoming.id);
  const existing = sessions.get(incoming.phone);
  const settings = existing ? { apiUrl: existing.apiUrl, apiKey: existing.apiKey } : resolveWabaSettings(body);
  if (!settings.apiKey) return { ok: false, message: 'Missing Whapi token for webhook reply' };

  const currentState = selection?.state || existing?.currentState || 'GREETING';
  const answer = selection?.answer || incoming.text;
  if (!answer) return { ok: true, ignored: true };

  const session: SurveySession = existing || {
    phone: incoming.phone,
    campaignId: 'webhook',
    currentState,
    data: {},
    rawLogs: [],
    apiUrl: settings.apiUrl,
    apiKey: settings.apiKey,
    updatedAt: Date.now(),
  };

  session.currentState = currentState;
  session.rawLogs.push({ sender: 'user', state: currentState, text: answer, at: nowIso() });
  captureAnswer(currentState, answer, session.data);

  const nextState = determineNextState(currentState, answer, session.data);
  const bodyPrefix = currentState === 'GREETING' && nextState === 'ASK_PLATFORMS'
    ? 'ممتاز 🙏\nشكراً لك مقدماً 🌷\n\n'
    : '';

  const responseText = surveyMessages[nextState];
  session.rawLogs.push({ sender: 'bot', state: nextState, text: responseText, at: nowIso() });
  session.updatedAt = Date.now();

  if (nextState === 'COMPLETED' || nextState === 'REJECTED') {
    const sent = await sendWhapiText(settings.apiUrl, settings.apiKey, incoming.phone, responseText);
    sessions.delete(incoming.phone);
    return { ok: sent.ok, completed: nextState === 'COMPLETED', message: sent.message };
  }

  session.currentState = nextState;
  session.apiUrl = settings.apiUrl;
  session.apiKey = settings.apiKey;
  sessions.set(incoming.phone, session);
  const sent = await sendSurveyMessage(settings.apiUrl, settings.apiKey, incoming.phone, nextState, bodyPrefix);
  return { ok: sent.ok, nextState, message: sent.message };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const route = getRoute(req);
  if (req.method === 'GET' || route.includes('/health')) {
    sendJson(res, 200, { ok: true, service: 'Linker Agent API', activeSessions: sessions.size, timestamp: new Date().toISOString() });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, message: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const isWebhook = route.includes('/integrations/survey-agent/webhook') || Array.isArray(body.messages);
    const isCampaignLaunch = route.includes('/campaigns/launch') || Array.isArray(body.customers);
    const isSettingsSave = route.includes('/admin/settings/save') || Boolean(body.waba && (body.profile || body.webhookUrl));
    const isConnectionTest = route.includes('/test-connection') || route.includes('/test-whatsapp') || Boolean(body.apiKey);

    if (isWebhook) {
      const result = await handleSurveyWebhook(body);
      sendJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (isCampaignLaunch) {
      const result = await launchCampaign(body);
      sendJson(res, result.status, result.payload);
      return;
    }

    if (isSettingsSave) {
      const settings = resolveWabaSettings(body, false);
      rememberWabaSettings(settings);
      sendJson(res, 200, {
        ok: true,
        saved: true,
        runtimeWaba: { apiUrl: runtimeWaba.apiUrl, hasToken: Boolean(runtimeWaba.apiKey) },
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
    if (result.ok) rememberWabaSettings({ apiUrl, apiKey });
    sendJson(res, result.ok ? 200 : 502, result);
  } catch (err) {
    sendJson(res, 500, { ok: false, message: `خطأ: ${err instanceof Error ? err.message : String(err)}` });
  }
}
