import {
  MarketIntelligenceStore,
  type CompleteSurveyArgs,
  type CustomerProfile,
  type PurchaseMethod,
  type SurveyResponseData,
  type SurveySession,
} from './marketIntelligenceStore';

export type SurveyState =
  | 'GREETING'
  | 'APPROVAL'
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

export interface ConversationStore {
  prepareSurveySession(phone: string, campaignId: string, profile?: CustomerProfile): Promise<SurveySession>;
  completeSurvey(args: CompleteSurveyArgs): Promise<unknown>;
  rejectSurvey(campaignId: string, customerId: string, phone: string, rawChatLog: string): Promise<unknown>;
  loadSession(phone: string): Promise<SessionData | null>;
  saveSession(phone: string, data: SessionData): Promise<void>;
  deleteSession(phone: string): Promise<void>;
  getActiveSessionCount(): Promise<number>;
}

export interface SessionData {
  phone: string;
  campaignId: string;
  customerId: string;
  currentState: SurveyState;
  extractedData: SurveyResponseData;
  rawLogs: ChatLogEntry[];
}

export interface SurveyConfig {
  humanMode: boolean;
  messages: Partial<Record<SurveyState, string>>;
  questions?: SurveyQuestionConfig[];
}

export type QuestionType =
  | 'single_select'
  | 'multi_select'
  | 'open_text'
  | 'quick_buttons'
  | 'interactive_list'
  | 'text_input'
  | 'rating'
  | 'yes_no';

export interface SurveyQuestionConfig {
  id: SurveyState | string;
  label?: string;
  text: string;
  options?: string[];
  key?: string;
  type?: QuestionType;
}

interface ChatLogEntry {
  sender: 'bot' | 'user';
  state: SurveyState;
  text: string;
  at: string;
}

const defaultMessages: Record<SurveyState, string> = {
  GREETING:
    'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها، بهدف تحسين خدمات الشحن والتوصيل والدفع داخل اليمن.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\nوإجاباتك بتساعدنا نفهم احتياجات العملاء بشكل أفضل.\n\nهل ممكن نبدأ؟ 😊',
  APPROVAL: 'ممتاز 🙏\nشكراً لك مقدماً 🌷\n\nأول سؤال 👇',
  ASK_PLATFORMS:
    'من أي المنصات أو التطبيقات تشتري غالباً؟\n\n1️⃣ شي إن\n2️⃣ نون\n3️⃣ أمازون\n4️⃣ علي إكسبريس\n5️⃣ تيمو\n6️⃣ آي هيرب\n7️⃣ نايس ون\n8️⃣ متاجر إنستغرام\n9️⃣ مواقع أو تطبيقات أخرى\n\nتقدر تختار أكثر من خيار ✨',
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

export const systemMessages = {
  REMINDER:
    'أهلين 🌷\nفقط تذكير بسيط بخصوص الاستبيان 🙏\nباقي لك أقل من دقيقتين ويكتمل 👍\n\nمشاركتك تساعدنا نفهم احتياجات العملاء بشكل أفضل وتحسين خدمات الشحن والتوصيل داخل اليمن.',
  NOT_UNDERSTOOD: 'أكيد 👍\nبشرحها بشكل أبسط 😊',
  UNCLEAR: 'ممتاز 🌷\nبس ممكن توضح لنا أكثر شوي حتى نسجل الإجابة بشكل صحيح 🙏',
  REACTIVATION:
    'أهلين 👋\nحالياً نعمل تحديث جديد لدراسة التسوق الإلكتروني داخل اليمن، وحابين نأخذ رأيك السريع إذا عندك دقيقة 🌷',
};

const defaultQuestionTypes: Partial<Record<SurveyState, QuestionType>> = {
  ASK_PLATFORMS: 'multi_select',
  ASK_PURCHASE_METHOD: 'interactive_list',
  ASK_BROKER_SOURCE: 'interactive_list',
  ASK_BROKER_CHANNEL: 'interactive_list',
  ASK_BROKER_REASON: 'interactive_list',
  ASK_DELIVERY_TIME: 'interactive_list',
  ASK_HAS_COD: 'yes_no',
  ASK_HAS_PROBLEMS: 'yes_no',
  ASK_MAIN_PROBLEM: 'interactive_list',
  ASK_ORDER_VALUE: 'interactive_list',
  ASK_FREQUENCY: 'interactive_list',
  ASK_AGE: 'interactive_list',
  ASK_GENDER: 'yes_no',
  ASK_PAYMENT_METHOD: 'interactive_list',
  ASK_CANCELED_BEFORE: 'yes_no',
  ASK_CANCEL_REASON: 'interactive_list',
  ASK_BIGGEST_ANNOYANCE: 'multi_select',
  ASK_DIRECT_PROBABILITY: 'quick_buttons',
  ASK_DIRECT_ENCOURAGEMENT: 'multi_select',
};

const defaultQuestionOptions: Partial<Record<SurveyState, string[]>> = {
  ASK_PLATFORMS: ['شي إن', 'نون', 'أمازون', 'علي إكسبريس', 'تيمو', 'آي هيرب', 'نايس ون', 'متاجر إنستغرام', 'مواقع أو تطبيقات أخرى'],
  ASK_PURCHASE_METHOD: ['أطلب بنفسي مباشرة من الموقع', 'أطلب عبر وسيط أو مندوب', 'أحياناً مباشرة وأحياناً عبر وسيط', 'أشتري من متجر محلي يعرض المنتجات'],
  ASK_BROKER_SOURCE: ['إنستغرام', 'واتساب', 'تيك توك', 'تيليجرام', 'صديق أو معرفة', 'متجر محلي', 'إعلان'],
  ASK_BROKER_CHANNEL: ['إنستغرام', 'واتساب', 'تيك توك', 'تيليجرام', 'متجر فعلي', 'مكان آخر'],
  ASK_BROKER_REASON: ['ما عندي وسيلة دفع إلكترونية', 'ما أعرف طريقة الطلب', 'الوسيط أسهل وأسرع', 'أثق بالوسيط أكثر', 'يوفر الدفع عند الاستلام', 'يساعد في الشحن والجمارك', 'يوفر تجميع الطلبات', 'أقدر أتواصل معه بسهولة'],
  ASK_DELIVERY_TIME: ['أقل من أسبوعين', 'من أسبوعين إلى شهر', 'أكثر من شهر', 'تختلف حسب الطلب'],
  ASK_HAS_COD: ['نعم', 'لا', 'أحياناً'],
  ASK_HAS_PROBLEMS: ['نعم', 'لا'],
  ASK_MAIN_PROBLEM: ['تأخير الطلب', 'ارتفاع الشحن', 'المنتج مختلف', 'ضعف التتبع', 'صعوبة التواصل', 'مشكلة في المقاس', 'مشكلة بالدفع', 'مشكلة بالاستلام', 'أخرى'],
  ASK_ORDER_VALUE: ['أقل من 10 ألف', 'من 10 ألف إلى 25 ألف', 'من 25 ألف إلى 50 ألف', 'من 50 ألف إلى 100 ألف', 'أكثر من 100 ألف'],
  ASK_FREQUENCY: ['أسبوعياً', 'مرتين بالشهر', 'شهرياً', 'كل عدة أشهر', 'فقط بالمواسم'],
  ASK_AGE: ['أقل من 18', '18 - 24', '25 - 34', '35 - 44', 'أكثر من 45'],
  ASK_GENDER: ['ذكر', 'أنثى'],
  ASK_PAYMENT_METHOD: ['الدفع عند الاستلام', 'تحويل', 'محفظة إلكترونية', 'بطاقة بنكية'],
  ASK_CANCELED_BEFORE: ['نعم', 'لا'],
  ASK_CANCEL_REASON: ['تأخير', 'تغير السعر', 'غيرت رأيي', 'ضعف التواصل', 'فقدت الثقة', 'تكلفة الشحن', 'سبب آخر'],
  ASK_BIGGEST_ANNOYANCE: ['التأخير', 'ارتفاع تكلفة الشحن', 'عدم وجود دفع عند الاستلام', 'ضعف الثقة', 'صعوبة المرتجعات', 'اختلاف المنتج', 'ضعف التتبع', 'عدم وضوح السعر النهائي', 'ضعف التواصل', 'مشاكل الجمارك أو الرسوم'],
  ASK_DIRECT_PROBABILITY: ['أكيد', 'غالباً', 'ممكن', 'لا'],
  ASK_DIRECT_ENCOURAGEMENT: ['الدفع عند الاستلام', 'سرعة التوصيل', 'تتبع واضح', 'أسعار أفضل', 'ضمان واسترجاع', 'ثقة أكبر'],
};

let activeMessages: Record<SurveyState, string> = { ...defaultMessages };
let activeQuestions: SurveyQuestionConfig[] = [];
let surveyConfig: SurveyConfig = { humanMode: false, messages: {}, questions: [] };

export function updateSurveyConfig(config: Partial<SurveyConfig>) {
  if (config.humanMode !== undefined) surveyConfig.humanMode = config.humanMode;
  if (config.messages) {
    surveyConfig.messages = { ...surveyConfig.messages, ...config.messages };
    activeMessages = { ...defaultMessages, ...surveyConfig.messages };
  }
  if (Array.isArray(config.questions)) {
    activeQuestions = config.questions
      .filter((question) => typeof question?.id === 'string' && typeof question?.text === 'string')
      .map((question) => ({
        ...question,
        text: question.text.trim(),
        options: Array.isArray(question.options)
          ? question.options.map((option) => String(option).trim()).filter(Boolean)
          : [],
      }));
    surveyConfig.questions = activeQuestions;
  }
  return getSurveyConfig();
}

export function getSurveyConfig() {
  return { ...surveyConfig, questions: activeQuestions, defaultMessages, systemMessages, defaultQuestionTypes, defaultQuestionOptions };
}

export function resetSurveyConfig() {
  surveyConfig = { humanMode: false, messages: {}, questions: [] };
  activeMessages = { ...defaultMessages };
  activeQuestions = [];
}

function getHumanModeMessages(state: SurveyState): string {
  const map: Partial<Record<SurveyState, string>> = {
    GREETING: 'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\n\nهل ممكن نبدأ؟ 😊',
    APPROVAL: 'ممتاز 🙏 شكراً لك مقدماً 🌷',
    ASK_PLATFORMS: 'من أي المنصات أو التطبيقات تشتري غالباً؟ ✨',
    ASK_FAVORITE_PLATFORM: 'ممتاز 👍 وأي منصة تعتبرها الأكثر استخداماً بالنسبة لك؟',
    ASK_PURCHASE_METHOD: 'كيف تقوم بالشراء غالباً؟ 👀',
    ASK_BROKER_SOURCE: 'تمام 👍 غالباً كيف تعرفت على الوسيط؟',
    ASK_BROKER_NAME: 'إذا ممكن، ايش اسم الحساب أو الوسيط اللي تتعامل معه غالباً؟ 🌷',
    ASK_BROKER_CHANNEL: 'هذا الوسيط موجود غالباً فين؟',
    ASK_BROKER_REASON: 'ايش أكثر سبب يخليك تفضل الطلب عبر وسيط؟ 👀',
    ASK_DELIVERY_TIME: 'تقريباً كم تستغرق الطلبية حتى توصل لك؟ 🚚',
    ASK_HAS_COD: 'هل الوسيط يوفر الدفع عند الاستلام؟',
    ASK_HAS_PROBLEMS: 'هل قد واجهت مشكلة مع الطلبات؟ 👀',
    ASK_MAIN_PROBLEM: 'ايش أكثر مشكلة واجهتك؟',
    ASK_ORDER_VALUE: 'تقريباً كم متوسط قيمة طلباتك عادة؟ 💰',
    ASK_FREQUENCY: 'كم مرة تطلب تقريباً من المواقع أو التطبيقات الخارجية؟ 👀',
    ASK_CITY: 'أي مدينة أنت؟ 🌍',
    ASK_AGE: 'الفئة العمرية؟',
    ASK_GENDER: 'الجنس؟',
    ASK_PAYMENT_METHOD: 'ايش طريقة الدفع اللي تفضلها غالباً؟ 💳',
    ASK_CANCELED_BEFORE: 'هل سبق وألغيت طلب قبل؟ 👀',
    ASK_CANCEL_REASON: 'ايش كان السبب الرئيسي للإلغاء؟',
    ASK_BIGGEST_ANNOYANCE: 'ايش أكثر شيء يزعجك حالياً في تجربة الطلب من الخارج؟',
    ASK_DIRECT_PROBABILITY:
      'إذا دعمت شي إن اليمن رسمياً مع دفع عند الاستلام وتتبع واضح وتوصيل محلي… هل تتوقع تطلب مباشرة منها؟ 👀',
    ASK_DIRECT_ENCOURAGEMENT: 'ممتاز 👍 ايش أكثر شيء بيشجعك تطلب مباشرة؟',
    ASK_DIRECT_HESITATION: 'ايش أكثر شيء يخليك متردد حالياً؟ 👀',
    ASK_REFUSAL_REASON: 'ممكن نعرف السبب؟ 🌷',
    COMPLETED: 'شكراً لك جداً 🙏🌷\nمشاركتك أفادتنا بشكل كبير.\n\nنتمنى لك يوم سعيد 💜',
    REJECTED: 'ولا يهمك أبداً 🌷\nشكراً لوقتك، ونتمنى لك يوم جميل 🙏',
  };
  return map[state] || activeMessages[state] || '';
}

function nowIso() { return new Date().toISOString(); }
function normalizeInput(input: string) { return input.trim(); }

function getConfiguredQuestion(state: SurveyState): SurveyQuestionConfig | undefined {
  return activeQuestions.find((question) => question.id === state);
}

function parseOptionsFromMessage(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim().match(/^\s*(?:\d+)(?:\uFE0F?\u20E3)?\s*[\)\.\-:]?\s*(.+)$/u)?.[1]?.trim() || '')
    .filter(Boolean);
}

function getStateOptions(state: SurveyState) {
  const configured = getConfiguredQuestion(state)?.options?.filter(Boolean);
  if (configured?.length) return configured;

  const defaults = defaultQuestionOptions[state];
  if (defaults?.length) return defaults;

  const parsed = parseOptionsFromMessage(activeMessages[state] || defaultMessages[state] || '');
  return parsed.length ? parsed : [];
}

function getStateQuestionType(state: SurveyState): QuestionType {
  return getConfiguredQuestion(state)?.type || defaultQuestionTypes[state] || 'open_text';
}

function renderQuestionMessage(state: SurveyState, humanMode: boolean) {
  const configured = getConfiguredQuestion(state);
  const text = configured?.text || activeMessages[state] || '';
  const options = getStateOptions(state);
  const type = getStateQuestionType(state);

  if (!options.length || humanMode) {
    return text;
  }

  const numberedOptions = options.map((option, index) => `${index + 1}. ${option}`).join('\n');
  const multiSelectHint = type === 'multi_select'
    ? '\n\nتقدر تختار أكثر من خيار. اكتب الأرقام مفصولة بفواصل، مثال: 1، 2، 3'
    : '';

  return `${text.trim()}\n\n${numberedOptions}${multiSelectHint}`;
}

function resolveChoiceText(state: SurveyState, input: string) {
  const options = getStateOptions(state);
  if (!options.length) return normalizeInput(input);

  const normalized = normalizeInput(input);
  const idMatch = normalized.match(/^opt_(\d+)$/i);
  if (idMatch) {
    const selected = options[Number(idMatch[1]) - 1];
    return selected || normalized;
  }

  const numberTokens = normalized
    .replace(/[،;|]/g, ',')
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => Number(token))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= options.length);

  const type = getStateQuestionType(state);
  if (numberTokens.length > 0) {
    const unique = Array.from(new Set(numberTokens));
    if (type === 'multi_select' || unique.length > 1) {
      return unique.map((index) => options[index - 1]).filter(Boolean).join('، ');
    }

    return options[unique[0] - 1] || normalized;
  }

  return normalized;
}

function containsAny(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

function parseApproval(input: string): boolean | undefined {
  const approveKeywords = ['نعم', 'ايوه', 'أيوه', 'ايوا', 'موافق', 'موافقة', 'ابدا', 'ابدأ', 'ابدأي', 'ابدئي', 'طيب', 'خلينا', 'يلا', '1', 'ok', 'okay', 'yes', 'ماشي', 'بش'];
  const rejectKeywords = ['لا', 'كلا', 'مشغول', 'مش فاضي', 'مو فاضي', 'معليش', 'وقت', 'لاحق', 'مش الحين', '2', 'no'];
  if (containsAny(input.toLowerCase(), approveKeywords)) return true;
  if (containsAny(input.toLowerCase(), rejectKeywords)) return false;
  return undefined;
}

function parseYesNo(input: string): boolean | undefined {
  if (containsAny(input, ['نعم', 'ايوه', 'أيوه', 'ايوا', '1'])) return true;
  if (containsAny(input, ['لا', 'كلا', '2'])) return false;
  return undefined;
}

const brokerAliases = [
  'وسيط', 'وسيطة', 'مندوب', 'مندوبة', 'مندوبي', 'مندوبتي',
  'بنت تطلب', 'ولد يطلب', 'شخص يطلب', 'وحدة تطلب', 'واحد يطلب',
  'أخت تطلب', 'خالة تطلب', 'صديقة تطلب', 'صاحب يطلب',
  'حساب', 'حساب يطلب', 'صفحة', 'صفحة طلبات', 'متجر', 'متجر إنستغرام', 'متجر انستغرام', 'بائع', 'بائعة', 'تاجر', 'تاجرة',
  'انستا', 'انستغرام', 'إنستغرام', 'انستقرام',
];
const mixedAliases = ['مختلط', 'أحيان', 'احيان', 'مرات', 'أحيانا'];
const localAliases = ['متجر محلي', 'محلي', 'محل'];

function parsePurchaseMethod(input: string): PurchaseMethod {
  if (containsAny(input, localAliases.concat(['4']))) return 'local';
  if (containsAny(input, mixedAliases.concat(['3']))) return 'mixed';
  if (containsAny(input, brokerAliases.concat(['2']))) return 'broker';
  return 'direct';
}

function extractBrokerType(input: string): string {
  if (containsAny(input, ['مندوبة', 'وسيطة', 'بنت', 'أخت', 'خالة', 'صديقة', 'وحدة', 'بائعة', 'تاجرة']))
    return 'individual_female';
  if (containsAny(input, ['مندوب', 'ولد', 'شخص', 'واحد', 'صاحب'])) return 'individual_male';
  if (containsAny(input, ['انستا', 'انستغرام', 'إنستغرام', 'انستقرام', 'صفحة', 'حساب', 'صفحة طلبات', 'متجر إنستغرام', 'متجر انستغرام'])) return 'instagram_store';
  if (containsAny(input, ['واتس', 'واتساب', 'whatsapp'])) return 'whatsapp_seller';
  if (containsAny(input, ['تيليجرام', 'تليجرام', 'telegram'])) return 'telegram_seller';
  if (containsAny(input, ['تيك', 'تيك توك', 'tiktok'])) return 'tiktok_seller';
  if (containsAny(input, ['متجر', 'محل', 'محلي'])) return 'local_store';
  if (containsAny(input, ['تاجر', 'تاجرة', 'بائع', 'بائعة'])) return 'reseller';
  if (containsAny(input, ['شركة', 'مؤسسة'])) return 'company';
  return 'individual_unknown';
}

function extractBrokerGender(brokerType: string): string {
  if (brokerType === 'individual_female') return 'female';
  if (brokerType === 'individual_male') return 'male';
  return 'unknown';
}

function extractBrokerChannel(brokerType: string): string {
  if (brokerType === 'instagram_store') return 'Instagram';
  if (brokerType === 'whatsapp_seller') return 'WhatsApp';
  if (brokerType === 'telegram_seller') return 'Telegram';
  if (brokerType === 'tiktok_seller') return 'TikTok';
  if (brokerType === 'local_store') return 'Local';
  return 'Other';
}

function extractPreferredPlatform(input: string) {
  const knownPlatforms = ['شي إن', 'نون', 'أمازون', 'علي إكسبريس', 'تيمو', 'آي هيرب', 'نايس ون'];
  const matchedPlatform = knownPlatforms.find((platform) => input.includes(platform));
  if (matchedPlatform) return matchedPlatform;
  return input.split(/[,،\n]/)[0]?.trim() || input.trim();
}

function isLikelyDirectPurchase(input: string) {
  return containsAny(input, ['أكيد', 'اكيد', 'غالب', 'احتمال كبير', '1', '2']);
}

function isMaybeDirectPurchase(input: string) {
  return containsAny(input, ['ممكن', 'ربما', 'يمكن', '3']);
}

export function captureAnswer(currentState: SurveyState, input: string, data: SurveyResponseData) {
  const normalizedInput = resolveChoiceText(currentState, input);
  switch (currentState) {
    case 'GREETING': case 'APPROVAL': break;
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
      if (data.purchaseMethod === 'broker' || data.purchaseMethod === 'mixed') {
        data.brokerType = extractBrokerType(normalizedInput);
      }
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

export function determineNextState(currentState: SurveyState, input: string, data: SurveyResponseData): SurveyState {
  const answer = resolveChoiceText(currentState, input);
  switch (currentState) {
    case 'GREETING': {
      const approved = parseApproval(answer);
      return approved === false ? 'REJECTED' : 'ASK_PLATFORMS';
    }
    case 'APPROVAL': return 'ASK_PLATFORMS';
    case 'ASK_PLATFORMS': {
      const platforms = data.platforms || '';
      return platforms.split(/[,،\n]/).filter(s => s.trim().length > 0).length > 1 ? 'ASK_FAVORITE_PLATFORM' : 'ASK_PURCHASE_METHOD';
    }
    case 'ASK_FAVORITE_PLATFORM': return 'ASK_PURCHASE_METHOD';
    case 'ASK_PURCHASE_METHOD':
      return data.purchaseMethod === 'broker' || data.purchaseMethod === 'mixed' ? 'ASK_BROKER_SOURCE' : 'ASK_DELIVERY_TIME';
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
      if (isLikelyDirectPurchase(answer)) return 'ASK_DIRECT_ENCOURAGEMENT';
      return isMaybeDirectPurchase(answer) ? 'ASK_DIRECT_HESITATION' : 'ASK_REFUSAL_REASON';
    case 'ASK_DIRECT_ENCOURAGEMENT':
    case 'ASK_DIRECT_HESITATION':
    case 'ASK_REFUSAL_REASON': return 'COMPLETED';
    default: return 'COMPLETED';
  }
}

export function getMessageForState(state: SurveyState) {
  const configured = getConfiguredQuestion(state);
  if (configured) return renderQuestionMessage(state, surveyConfig.humanMode);
  if (surveyConfig.humanMode) return getHumanModeMessages(state);
  return activeMessages[state] || '';
}

export { extractBrokerType, extractBrokerGender, extractBrokerChannel };

export function createConversationEngine(store: ConversationStore = MarketIntelligenceStore as unknown as ConversationStore) {
  return {
    async startConversation(phone: string, campaignId: string, profile: CustomerProfile = {}) {
      const session = await store.prepareSurveySession(phone, campaignId, profile);
      const greeting = getMessageForState('GREETING');
      await store.saveSession(phone, {
        phone, campaignId, customerId: session.customerId, currentState: 'GREETING', extractedData: {},
        rawLogs: [{ sender: 'bot', state: 'GREETING', text: greeting, at: nowIso() }],
      });
      return greeting;
    },

    async handleIncomingMessage(phone: string, message: string) {
      const ctx = await store.loadSession(phone);
      if (!ctx) return null;

      const currentState = ctx.currentState;
      ctx.rawLogs.push({ sender: 'user', state: currentState, text: message, at: nowIso() });
      captureAnswer(currentState, message, ctx.extractedData);

      const nextState = determineNextState(currentState, message, ctx.extractedData);
      ctx.currentState = nextState;

      if (nextState === 'COMPLETED' || nextState === 'REJECTED') {
        const finalMessage = getMessageForState(nextState);
        ctx.rawLogs.push({ sender: 'bot', state: nextState, text: finalMessage, at: nowIso() });

        if (nextState === 'REJECTED') {
          await store.rejectSurvey(ctx.campaignId, ctx.customerId, ctx.phone, JSON.stringify(ctx.rawLogs));
        } else {
          await store.completeSurvey({
            campaignId: ctx.campaignId, customerId: ctx.customerId, phone: ctx.phone,
            rawChatLog: JSON.stringify(ctx.rawLogs), data: ctx.extractedData,
          });
        }

        await store.deleteSession(phone);
        return finalMessage;
      }

      const reply = getMessageForState(nextState);
      ctx.rawLogs.push({ sender: 'bot', state: nextState, text: reply, at: nowIso() });
      await store.saveSession(phone, ctx);
      return reply;
    },

    determineNextState,
    getMessageForState,

    async getActiveConversationCount() {
      return store.getActiveSessionCount();
    },
  };
}

export const ConversationEngine = createConversationEngine();
