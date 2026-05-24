import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { readSheet } from 'read-excel-file/browser';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Eye,
  Filter,
  Globe2,
  GripVertical,
  Handshake,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Megaphone,
  MessageSquare,
  PackageCheck,
  PlayCircle,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Type,
  UploadCloud,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Tone = 'teal' | 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'pink';
type ToastState = { message: string; type: 'success' | 'error' } | null;
type FilterState = { period: string; city: string; platform: string };
type CountDatum = { name: string; value: number; color?: string };
type QuestionType =
  | 'single_select'
  | 'multi_select'
  | 'open_text'
  | 'quick_buttons'
  | 'interactive_list'
  | 'text_input'
  | 'rating'
  | 'yes_no';

type SurveyQuestion = {
  id: string;
  label: string;
  text: string;
  options: string[];
  key: string;
  type: QuestionType;
};

type ApiCustomer = { id?: string; phone: string; name?: string | null; city?: string | null };
type ApiCampaign = {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  surveyTemplate?: string | null;
  launchMode?: string | null;
  status: string;
  scheduledAt?: string | null;
  recipientCount?: number;
  validRecipientCount?: number;
  duplicateRecipientCount?: number;
  invalidRecipientCount?: number;
  humanMode?: boolean;
  sentCount?: number;
  responseCount?: number;
  responseRate?: number;
  createdAt?: string;
  updatedAt?: string;
};
type ApiSurveyResponse = {
  id: string;
  campaignId: string;
  customerId: string;
  platforms?: string | null;
  preferredPlatform?: string | null;
  purchaseMethod?: string | null;
  brokerName?: string | null;
  brokerPlatform?: string | null;
  mainProblem?: string | null;
  purchaseFrequency?: string | null;
  city?: string | null;
  ageGroup?: string | null;
  gender?: string | null;
  paymentPreference?: string | null;
  directPurchaseProb?: string | null;
  directEncouragement?: string | null;
  rawChatLog?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer?: ApiCustomer;
  campaign?: { id: string; name: string; status: string };
};
type DashboardMetrics = {
  totalResponses: number;
  brokerDependencyRatio: number;
  directProbabilityRatio: number;
  topBrokers: { name?: string; type?: string | null; channel?: string | null; mentionCount?: number }[];
  allBrokers: { name?: string; type?: string | null; channel?: string | null; gender?: string | null; mentionCount?: number }[];
  recentResponses: ApiSurveyResponse[];
  platformBreakdown: CountDatum[];
  cityBreakdown: CountDatum[];
  problemBreakdown: CountDatum[];
  paymentPreferenceBreakdown: CountDatum[];
  purchaseMethodBreakdown: CountDatum[];
  ageGroupBreakdown: CountDatum[];
  genderBreakdown: CountDatum[];
  frequencyBreakdown: CountDatum[];
  directEncouragementBreakdown: CountDatum[];
  brokerTypeBreakdown: CountDatum[];
  brokerChannelBreakdown: CountDatum[];
  brokerGenderBreakdown: CountDatum[];
  campaignStats?: { totalCampaigns: number; activeCampaigns: number; scheduledCampaigns: number };
  messageStats?: { sentMessages: number; failedMessages: number; inboundMessages: number; deliveryRatio: number; replyRatio: number };
};
type MarketDataValue = {
  dashboard: DashboardMetrics;
  responses: ApiSurveyResponse[];
  campaigns: ApiCampaign[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};
type RecipientRecord = { phone: string; name?: string; city?: string };
type RecipientPreview = {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  recipients: RecipientRecord[];
  duplicates: { row: number; phone: string; firstRow: number }[];
  invalid: { row: number; rawPhone: string; reason: string }[];
};

const chartColors = ['#0d9488', '#3b82f6', '#f59e0b', '#64748b', '#ec4899', '#8b5cf6', '#22c55e'];
const emptyDashboard: DashboardMetrics = {
  totalResponses: 0,
  brokerDependencyRatio: 0,
  directProbabilityRatio: 0,
  topBrokers: [],
  allBrokers: [],
  recentResponses: [],
  platformBreakdown: [],
  cityBreakdown: [],
  problemBreakdown: [],
  paymentPreferenceBreakdown: [],
  purchaseMethodBreakdown: [],
  ageGroupBreakdown: [],
  genderBreakdown: [],
  frequencyBreakdown: [],
  directEncouragementBreakdown: [],
  brokerTypeBreakdown: [],
  brokerChannelBreakdown: [],
  brokerGenderBreakdown: [],
  campaignStats: { totalCampaigns: 0, activeCampaigns: 0, scheduledCampaigns: 0 },
  messageStats: { sentMessages: 0, failedMessages: 0, inboundMessages: 0, deliveryRatio: 0, replyRatio: 0 },
};

const navSections = [
  {
    label: 'التحليل',
    items: [
      { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
      { path: '/platforms', label: 'تحليل المنصات', icon: Globe2 },
      { path: '/brokers', label: 'قنوات الشراء', icon: Handshake },
      { path: '/consumer', label: 'سلوك المستهلك', icon: Users },
      { path: '/geo', label: 'التوزيع الجغرافي', icon: MapPinned },
      { path: '/issues', label: 'مصفوفة المشاكل', icon: AlertTriangle },
      { path: '/opportunities', label: 'الفرص والتوقعات', icon: PackageCheck },
    ],
  },
  {
    label: 'التشغيل',
    items: [
      { path: '/responses', label: 'نتائج الاستبيانات', icon: ClipboardList },
      { path: '/survey-engine', label: 'محرك الاستبيان', icon: Bot },
      { path: '/campaigns', label: 'إدارة الحملات', icon: Megaphone },
      { path: '/settings', label: 'الإعدادات والربط', icon: Settings },
    ],
  },
];

const questionTypes: { value: QuestionType; label: string; hint: string }[] = [
  { value: 'single_select', label: 'اختيار واحد', hint: 'إجابة واحدة من الخيارات' },
  { value: 'multi_select', label: 'اختيارات متعددة', hint: 'عدة إجابات في نفس السؤال' },
  { value: 'open_text', label: 'سؤال مفتوح', hint: 'إجابة حرة طويلة أو قصيرة' },
  { value: 'quick_buttons', label: 'أزرار سريعة', hint: 'حتى ثلاثة خيارات مباشرة' },
  { value: 'interactive_list', label: 'قائمة تفاعلية', hint: 'قائمة WhatsApp منظمة' },
  { value: 'text_input', label: 'إدخال نص', hint: 'حقل نص مباشر' },
  { value: 'rating', label: 'تقييم', hint: 'درجة أو تقييم رقمي' },
  { value: 'yes_no', label: 'نعم/لا', hint: 'سؤال ثنائي مختصر' },
];

const defaultQuestions: SurveyQuestion[] = [
  { id: 'GREETING', label: 'الرسالة الافتتاحية', text: 'السلام عليكم\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن.\nالاستبيان خفيف وما يأخذ أكثر من دقيقتين.\nهل ممكن نبدأ؟', options: [], key: '', type: 'open_text' },
  { id: 'ASK_PLATFORMS', label: 'المنصات المستخدمة', text: 'من أي المنصات أو التطبيقات تشتري غالباً؟', options: ['شي إن', 'نون', 'أمازون', 'علي إكسبريس', 'تيمو', 'آي هيرب', 'نايس ون', 'متاجر إنستغرام', 'مواقع أو تطبيقات أخرى'], key: 'platforms', type: 'multi_select' },
  { id: 'ASK_FAVORITE_PLATFORM', label: 'المنصة المفضلة', text: 'وأي منصة تعتبرها الأكثر استخداماً بالنسبة لك؟', options: [], key: 'preferredPlatform', type: 'text_input' },
  { id: 'ASK_PURCHASE_METHOD', label: 'طريقة الشراء', text: 'كيف تقوم بالشراء غالباً؟', options: ['أطلب بنفسي مباشرة من الموقع', 'أطلب عبر وسيط أو مندوب', 'أحياناً مباشرة وأحياناً عبر وسيط', 'أشتري من متجر محلي يعرض المنتجات'], key: 'purchaseMethod', type: 'interactive_list' },
  { id: 'ASK_BROKER_SOURCE', label: 'مصدر الوسيط', text: 'غالباً كيف تعرفت على الوسيط؟', options: ['إنستغرام', 'واتساب', 'تيك توك', 'تيليجرام', 'صديق أو معرفة', 'متجر محلي', 'إعلان'], key: 'brokerSource', type: 'interactive_list' },
  { id: 'ASK_BROKER_NAME', label: 'اسم الوسيط', text: 'ايش اسم الحساب أو الوسيط اللي تتعامل معه غالباً؟', options: [], key: 'brokerName', type: 'text_input' },
  { id: 'ASK_DELIVERY_TIME', label: 'وقت التوصيل', text: 'كم تستغرق الطلبية حتى توصل لك؟', options: ['أقل من أسبوعين', 'أسبوعين إلى شهر', 'أكثر من شهر', 'تختلف حسب الطلب'], key: 'deliveryTime', type: 'interactive_list' },
  { id: 'ASK_HAS_COD', label: 'الدفع عند الاستلام', text: 'هل يتوفر الدفع عند الاستلام؟', options: ['نعم', 'لا', 'أحياناً'], key: 'cashOnDelivery', type: 'quick_buttons' },
  { id: 'ASK_HAS_PROBLEMS', label: 'وجود مشاكل', text: 'هل قد واجهت مشكلة مع الطلبات؟', options: ['نعم', 'لا'], key: 'hasProblems', type: 'yes_no' },
  { id: 'ASK_MAIN_PROBLEM', label: 'المشكلة الرئيسية', text: 'ايش أكثر مشكلة واجهتك؟', options: ['تأخير الطلب', 'ارتفاع الشحن', 'المنتج مختلف', 'ضعف التتبع', 'صعوبة التواصل', 'مشكلة في المقاس', 'مشكلة بالدفع', 'مشكلة بالاستلام', 'أخرى'], key: 'mainProblem', type: 'interactive_list' },
  { id: 'ASK_CITY', label: 'المدينة', text: 'أي مدينة أنت؟', options: [], key: 'city', type: 'text_input' },
  { id: 'ASK_PAYMENT_METHOD', label: 'طريقة الدفع', text: 'ايش طريقة الدفع اللي تفضلها غالباً؟', options: ['الدفع عند الاستلام', 'تحويل', 'محفظة إلكترونية', 'بطاقة بنكية'], key: 'paymentPreference', type: 'interactive_list' },
  { id: 'ASK_DIRECT_PROBABILITY', label: 'احتمالية الشراء المباشر', text: 'إذا توفر طلب مباشر مع دفع عند الاستلام وتتبع واضح وتوصيل محلي، هل تتوقع تطلب مباشرة؟', options: ['أكيد', 'غالباً', 'ممكن', 'لا'], key: 'directPurchaseProb', type: 'quick_buttons' },
  { id: 'ASK_DIRECT_ENCOURAGEMENT', label: 'ما يشجع للشراء المباشر', text: 'ايش أكثر شيء يشجعك تطلب مباشرة؟', options: ['الدفع عند الاستلام', 'سرعة التوصيل', 'تتبع واضح', 'أسعار أفضل', 'ضمان واسترجاع', 'ثقة أكبر'], key: 'directEncouragement', type: 'multi_select' },
  { id: 'COMPLETED', label: 'الرسالة الختامية', text: 'شكراً لك جداً.\nمشاركتك أفادتنا بشكل كبير في تحسين خدمات التسوق والتوصيل داخل اليمن.', options: [], key: '', type: 'open_text' },
];

const pageTitles = navSections.flatMap((section) => section.items);
const FilterContext = createContext<{ filters: FilterState; setFilters: (f: Partial<FilterState>) => void }>({
  filters: { period: 'آخر 30 يوم', city: 'كل المدن', platform: 'كل المنصات' },
  setFilters: () => undefined,
});
const MarketDataContext = createContext<MarketDataValue>({
  dashboard: emptyDashboard,
  responses: [],
  campaigns: [],
  loading: true,
  error: null,
  refresh: async () => undefined,
});

function useFilters() {
  return useContext(FilterContext);
}

function useMarketData() {
  return useContext(MarketDataContext);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const text = await response.text();
  const data = text ? JSON.parse(text) as T : ({} as T);
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as { message?: unknown }).message) : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function MarketDataProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardMetrics>(emptyDashboard);
  const [responses, setResponses] = useState<ApiSurveyResponse[]>([]);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const [dashboardResult, responseResult, campaignResult] = await Promise.allSettled([
        fetchJson<DashboardMetrics>('/api/admin/market-intelligence/dashboard'),
        fetchJson<ApiSurveyResponse[]>('/api/admin/market-intelligence/responses'),
        fetchJson<{ ok: boolean; campaigns: ApiCampaign[] }>('/api/admin/campaigns'),
      ]);

      setDashboard(dashboardResult.status === 'fulfilled' ? { ...emptyDashboard, ...dashboardResult.value } : emptyDashboard);
      setResponses(responseResult.status === 'fulfilled' && Array.isArray(responseResult.value) ? responseResult.value : []);
      setCampaigns(campaignResult.status === 'fulfilled' && Array.isArray(campaignResult.value.campaigns) ? campaignResult.value.campaigns : []);

      const errors = [dashboardResult, responseResult, campaignResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));
      if (errors.length) setError(Array.from(new Set(errors)).join(' / '));
    } catch (err) {
      setDashboard(emptyDashboard);
      setResponses([]);
      setCampaigns([]);
      setError(err instanceof Error ? err.message : 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo(() => ({ dashboard, responses, campaigns, loading, error, refresh }), [dashboard, responses, campaigns, loading, error]);
  return <MarketDataContext.Provider value={value}>{children}</MarketDataContext.Provider>;
}

function formatNumber(value: number | undefined | null) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function percent(value: number | undefined | null) {
  return `${Math.round(value || 0)}%`;
}

function valueShare(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function withColors(data: CountDatum[]) {
  return data.map((item, index) => ({ ...item, color: item.color || chartColors[index % chartColors.length] }));
}

function firstName(data: CountDatum[], fallback = 'لا توجد بيانات') {
  return data[0]?.name || fallback;
}

function downloadCSV(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const csv = '\uFEFF' + [
    headers.join(','),
    ...rows.map((row) => row.map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function downloadCampaignTemplate() {
  downloadCSV('linker_campaign_template.csv', ['رقم الهاتف', 'الاسم', 'المدينة'], []);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

async function readCustomerFileRows(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const rows: unknown[][] = await readSheet(file);
    return rows.map((row) => row.map((cell) => String(cell ?? '').trim()));
  }
  if (/\.csv$/i.test(file.name)) return parseCsvRows(await file.text());
  throw new Error('Unsupported file type');
}

function normalizeCampaignPhone(value: unknown) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith('7')) digits = `967${digits}`;
  return digits;
}

function hasHeader(row: string[]) {
  const joined = row.join(' ').toLowerCase();
  return /phone|mobile|whatsapp|هاتف|جوال|رقم/.test(joined);
}

function analyzeCustomerRows(rows: string[][]): RecipientPreview {
  const header = rows[0] || [];
  const startsWithHeader = hasHeader(header);
  const dataRows = startsWithHeader ? rows.slice(1) : rows;
  const normalizedHeader = header.map((cell) => cell.trim().toLowerCase());
  const phoneIndex = startsWithHeader ? normalizedHeader.findIndex((cell) => /phone|mobile|whatsapp|هاتف|جوال|رقم/.test(cell)) : 0;
  const nameIndex = startsWithHeader ? normalizedHeader.findIndex((cell) => /name|اسم/.test(cell)) : 1;
  const cityIndex = startsWithHeader ? normalizedHeader.findIndex((cell) => /city|مدينة/.test(cell)) : 2;
  const seen = new Map<string, number>();
  const recipients: RecipientRecord[] = [];
  const duplicates: RecipientPreview['duplicates'] = [];
  const invalid: RecipientPreview['invalid'] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = (startsWithHeader ? index + 2 : index + 1);
    const phone = normalizeCampaignPhone(row[Math.max(phoneIndex, 0)]);
    if (!phone || phone.length < 9 || phone.length > 15) {
      invalid.push({ row: rowNumber, rawPhone: String(row[Math.max(phoneIndex, 0)] || ''), reason: 'رقم غير صالح' });
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
      name: nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '',
      city: cityIndex >= 0 ? String(row[cityIndex] || '').trim() : '',
    });
  });

  return {
    totalRows: dataRows.length,
    validCount: recipients.length,
    duplicateCount: duplicates.length,
    invalidCount: invalid.length,
    recipients,
    duplicates,
    invalid,
  };
}

function parseChatLog(raw?: string | null) {
  if (!raw) return [] as Array<{ sender: string; text: string; at?: string }>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => item as { sender?: unknown; text?: unknown; at?: unknown })
        .filter((item) => typeof item.text === 'string')
        .map((item) => ({ sender: String(item.sender || 'bot'), text: String(item.text || ''), at: typeof item.at === 'string' ? item.at : undefined }));
    }
  } catch {
    return [{ sender: 'bot', text: raw }];
  }
  return [];
}

function App() {
  const [filters, setFiltersRaw] = useState<FilterState>({ period: 'آخر 30 يوم', city: 'كل المدن', platform: 'كل المنصات' });
  const setFilters = (partial: Partial<FilterState>) => setFiltersRaw((current) => ({ ...current, ...partial }));

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
      <MarketDataProvider>
        <div className="app-shell" dir="rtl">
          <Sidebar />
          <main className="workspace">
            <Topbar />
            <div className="workspace-body">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/platforms" element={<PlatformsPage />} />
                <Route path="/brokers" element={<BrokersPage />} />
                <Route path="/consumer" element={<ConsumerPage />} />
                <Route path="/geo" element={<GeoPage />} />
                <Route path="/issues" element={<IssuesPage />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/responses" element={<ResponsesPage />} />
                <Route path="/survey-engine" element={<SurveyEnginePage />} />
                <Route path="/campaigns" element={<CampaignsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </MarketDataProvider>
    </FilterContext.Provider>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><BarChart3 size={24} /></div>
        <div>
          <strong>لينكر للذكاء السوقي</strong>
          <span>WhatsApp Survey Ops</span>
        </div>
      </div>
      <nav className="nav-groups" aria-label="التنقل الرئيسي">
        {navSections.map((section) => (
          <div className="nav-section" key={section.label}>
            <p>{section.label}</p>
            {section.items.map((item) => (
              <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} key={item.path} to={item.path} end={item.path === '/'}>
                <item.icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function Topbar() {
  const location = useLocation();
  const current = pageTitles.find((item) => item.path === location.pathname) ?? pageTitles[0];
  return (
    <header className="topbar">
      <div className="title-block">
        <span>لينكر / {current.label}</span>
        <h1>{current.label}</h1>
        <span style={{color:'#0d9488',fontSize:11,fontWeight:700}}>نسخة التحقق من النشر &#8226; codex/h &#8226; 2026-05-24</span>
      </div>
      <FilterBar />
      <button className="icon-btn" aria-label="الإشعارات">
        <Bell size={19} />
        <span className="notify-dot" />
      </button>
    </header>
  );
}

function FilterBar() {
  const { filters, setFilters } = useFilters();
  return (
    <div className="topbar-tools">
      <div className="search-box">
        <Search size={18} />
        <input aria-label="بحث عام" placeholder="بحث في النتائج والمؤشرات" />
      </div>
      <div className="filter-row compact">
        <select value={filters.period} onChange={(event) => setFilters({ period: event.target.value })}>
          {['آخر 24 ساعة', 'آخر 7 أيام', 'آخر 30 يوم', 'الربع الحالي'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={filters.city} onChange={(event) => setFilters({ city: event.target.value })}>
          {['كل المدن', 'صنعاء', 'عدن', 'تعز', 'حضرموت', 'الحديدة'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={filters.platform} onChange={(event) => setFilters({ platform: event.target.value })}>
          {['كل المنصات', 'شي إن', 'نون', 'أمازون', 'علي إكسبريس'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
    </div>
  );
}

function PageHeader({ kicker, title, description, action }: { kicker: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint, tone = 'teal' }: { icon: LucideIcon; label: string; value: string; hint: string; tone?: Tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon tone-${tone}`}><Icon size={21} /></div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
    </article>
  );
}

function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function SafeResponsiveContainer({ children }: { children: ReactNode }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  );
}

function EmptyState({ title = 'لا توجد بيانات حقيقية بعد', description = 'ستظهر البيانات هنا فور وصول ردود أو حملات من قاعدة البيانات.' }: { title?: string; description?: string }) {
  return (
    <div className="empty-state">
      <Database size={28} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function ExportBtn({ onClick, label = 'تصدير' }: { onClick: () => void; label?: string }) {
  return <button className="btn primary" onClick={onClick}><Download size={17} /> {label}</button>;
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>
      <button onClick={onClose} aria-label="إغلاق"><X size={16} /></button>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value || 'غير محدد';
  const className = /completed|active|sent|مكتمل|نشط|مرسل/.test(normalized)
    ? 'success'
    : /draft|scheduled|pending|مسودة|مجدول|قيد/.test(normalized)
      ? 'warning'
      : /failed|abandoned|فشل|ملغي/.test(normalized)
        ? 'danger'
        : 'warning';
  return <span className={`status ${className}`}>{normalized}</span>;
}

function CountBarList({ data }: { data: CountDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (!data.length) return <EmptyState />;
  return (
    <div className="stack-list">
      {data.map((item, index) => (
        <div className="progress-row" key={item.name}>
          <div><strong>{item.name}</strong><span>{formatNumber(item.value)}</span></div>
          <div className="progress-track"><span style={{ width: `${Math.round((item.value / max) * 100)}%`, background: chartColors[index % chartColors.length] }} /></div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: CountDatum[] }) {
  const chartData = withColors(data);
  if (!chartData.length) return <EmptyState />;
  return (
    <div className="donut-wrap">
      <div className="chart-sm">
        <SafeResponsiveContainer>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3} isAnimationActive={false}>
              {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </SafeResponsiveContainer>
      </div>
      <div className="legend-list">
        {chartData.map((item) => (
          <div key={item.name}><span style={{ background: item.color }} /><strong>{item.name}</strong><em>{formatNumber(item.value)}</em></div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { filters } = useFilters();
  const { dashboard, responses, loading, error, refresh } = useMarketData();
  const [toast, setToast] = useState<ToastState>(null);
  const trend = useMemo(() => buildTrend(responses), [responses]);
  const exportRows = [
    ['إجمالي الردود', dashboard.totalResponses],
    ['المنصة الأعلى', firstName(dashboard.platformBreakdown)],
    ['نسبة الاعتماد على الوسطاء', percent(dashboard.brokerDependencyRatio)],
    ['احتمالية الشراء المباشر', percent(dashboard.directProbabilityRatio)],
  ];

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Executive Dashboard"
        title="لوحة قيادة مبنية على البيانات الحقيقية"
        description={`${filters.period} - ${filters.city} - ${filters.platform}`}
        action={<div className="action-row"><button className="btn secondary" onClick={() => { void refresh(); setToast({ message: 'تم تحديث البيانات', type: 'success' }); }}><Activity size={17} /> تحديث</button><ExportBtn onClick={() => downloadCSV('dashboard.csv', ['المؤشر', 'القيمة'], exportRows)} /></div>}
      />
      {error && <div className="insight-strip danger"><AlertTriangle size={20} /><strong>تعذر تحميل البيانات</strong><span>{error}</span></div>}
      <div className="metric-grid four">
        <MetricCard icon={MessageSquare} label="إجمالي الردود" value={loading ? '...' : formatNumber(dashboard.totalResponses)} hint="ردود مكتملة من قاعدة البيانات" />
        <MetricCard icon={Globe2} label="المنصة الأعلى" value={firstName(dashboard.platformBreakdown)} hint="حسب الردود المكتملة" tone="blue" />
        <MetricCard icon={Handshake} label="الاعتماد على الوسطاء" value={percent(dashboard.brokerDependencyRatio)} hint="من إجمالي المشتريات" tone="amber" />
        <MetricCard icon={Send} label="رسائل مرسلة" value={formatNumber(dashboard.messageStats?.sentMessages)} hint={`ردود واردة: ${formatNumber(dashboard.messageStats?.inboundMessages)}`} tone="green" />
      </div>
      <div className="content-grid dashboard-grid">
        <Card title="اتجاه الردود" subtitle="تجميع شهري من السجلات الفعلية" className="span-2">
          <div className="chart-lg">{trend.length ? <SafeResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="responses" name="الردود" stroke="#0d9488" strokeWidth={3} isAnimationActive={false} /></LineChart></SafeResponsiveContainer> : <EmptyState />}</div>
        </Card>
        <Card title="الحصص حسب المنصة" subtitle="من إجابات العملاء"><DonutChart data={dashboard.platformBreakdown} /></Card>
        <Card title="أعلى المشاكل" subtitle="حسب التكرار"><CountBarList data={dashboard.problemBreakdown.slice(0, 6)} /></Card>
        <Card title="أحدث الردود" subtitle="آخر محادثات مكتملة" className="span-2"><ResponsesTable rows={dashboard.recentResponses} compact /></Card>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function buildTrend(responses: ApiSurveyResponse[]) {
  const counts = new Map<string, number>();
  responses.filter((response) => response.status === 'completed').forEach((response) => {
    const date = new Date(response.updatedAt || response.createdAt);
    const key = Number.isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('ar', { month: 'short', year: '2-digit' });
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([month, responsesCount]) => ({ month, responses: responsesCount })).slice(-8);
}

function PlatformsPage() {
  const { dashboard } = useMarketData();
  const total = dashboard.platformBreakdown.reduce((sum, item) => sum + item.value, 0);
  return (
    <DataBreakdownPage
      kicker="Platforms Analysis"
      title="تحليل المنصات"
      description="كل الأرقام هنا من إجابات الاستبيان المحفوظة وليست تقديرات."
      icon={Globe2}
      primaryMetric={firstName(dashboard.platformBreakdown)}
      primaryLabel="المنصة الأعلى"
      data={dashboard.platformBreakdown}
      headers={['المنصة', 'عدد الردود', 'الحصة']}
      row={(item) => [item.name, formatNumber(item.value), percent(valueShare(item.value, total))]}
      filename="platforms.csv"
    />
  );
}

function BrokersPage() {
  const { dashboard } = useMarketData();
  const brokerRows = dashboard.topBrokers.map((broker) => ({ name: broker.name || broker.type || 'غير محدد', value: broker.mentionCount || 0 }));
  return (
    <div className="page-stack">
      <PageHeader kicker="Brokers Analysis" title="قنوات الشراء والوسطاء" description="تصنيف الوسطاء والقنوات من الردود الفعلية." action={<ExportBtn onClick={() => downloadCSV('brokers.csv', ['الوسيط', 'النوع', 'القناة'], dashboard.allBrokers.map((broker) => [broker.name || '', broker.type || '', broker.channel || '']))} />} />
      <div className="metric-grid four">
        <MetricCard icon={Handshake} label="نسبة الاعتماد على الوسطاء" value={percent(dashboard.brokerDependencyRatio)} hint="من الردود المكتملة" />
        <MetricCard icon={Users} label="وسطاء مذكورون" value={formatNumber(dashboard.allBrokers.length)} hint="أسماء فريدة محفوظة" tone="blue" />
        <MetricCard icon={Globe2} label="القناة الأعلى" value={firstName(dashboard.brokerChannelBreakdown)} hint="حسب ذكر العملاء" tone="purple" />
        <MetricCard icon={MessageSquare} label="أعلى نوع وسيط" value={firstName(dashboard.brokerTypeBreakdown)} hint="من تحليل المحادثات" tone="amber" />
      </div>
      <div className="content-grid two">
        <Card title="أكثر الوسطاء ذكراً" subtitle="حسب عدد الإشارات"><CountBarList data={brokerRows} /></Card>
        <Card title="قنوات الوسطاء" subtitle="توزيع واقعي"><DonutChart data={dashboard.brokerChannelBreakdown} /></Card>
      </div>
      <Card title="سجل الوسطاء" subtitle="قابل للتصدير">
        <div className="table-wrap">
          <table><thead><tr><th>الاسم</th><th>النوع</th><th>القناة</th><th>الجنس</th><th>الإشارات</th></tr></thead><tbody>
            {dashboard.allBrokers.map((broker, index) => <tr key={`${broker.name || broker.type}-${index}`}><td><strong>{broker.name || 'غير محدد'}</strong></td><td>{broker.type || 'غير محدد'}</td><td>{broker.channel || 'غير محدد'}</td><td>{broker.gender || 'غير محدد'}</td><td>{formatNumber(broker.mentionCount)}</td></tr>)}
          </tbody></table>
          {!dashboard.allBrokers.length && <EmptyState />}
        </div>
      </Card>
    </div>
  );
}

function ConsumerPage() {
  const { dashboard } = useMarketData();
  return (
    <div className="page-stack">
      <PageHeader kicker="Consumer Behavior" title="سلوك المستهلك" description="الشرائح والدفع والتكرار من بيانات الردود فقط." action={<ExportBtn onClick={() => downloadCSV('consumer.csv', ['المؤشر', 'العدد'], [...dashboard.genderBreakdown, ...dashboard.ageGroupBreakdown, ...dashboard.paymentPreferenceBreakdown].map((item) => [item.name, item.value]))} />} />
      <div className="metric-grid four">
        <MetricCard icon={Users} label="إجمالي المستجيبين" value={formatNumber(dashboard.totalResponses)} hint="ردود مكتملة" />
        <MetricCard icon={WalletCards} label="الدفع المفضل" value={firstName(dashboard.paymentPreferenceBreakdown)} hint="حسب الردود" tone="green" />
        <MetricCard icon={CalendarDays} label="تكرار الشراء الأعلى" value={firstName(dashboard.frequencyBreakdown)} hint="من إجابات العملاء" tone="blue" />
        <MetricCard icon={PackageCheck} label="نية الشراء المباشر" value={percent(dashboard.directProbabilityRatio)} hint="أكيد أو غالباً" tone="amber" />
      </div>
      <div className="content-grid two">
        <Card title="الجنس" subtitle="توزيع المستجيبين"><DonutChart data={dashboard.genderBreakdown} /></Card>
        <Card title="الفئات العمرية" subtitle="حسب الاستبيان"><CountBarList data={dashboard.ageGroupBreakdown} /></Card>
        <Card title="طرق الدفع" subtitle="تفضيلات فعلية"><CountBarList data={dashboard.paymentPreferenceBreakdown} /></Card>
        <Card title="تكرار الشراء" subtitle="وتيرة الطلب"><CountBarList data={dashboard.frequencyBreakdown} /></Card>
      </div>
    </div>
  );
}

function GeoPage() {
  const { dashboard } = useMarketData();
  return (
    <DataBreakdownPage
      kicker="Geographic Analysis"
      title="التوزيع الجغرافي"
      description="توزيع المدن مبني على بيانات العملاء والردود المحفوظة."
      icon={MapPinned}
      primaryMetric={firstName(dashboard.cityBreakdown)}
      primaryLabel="المدينة الأعلى"
      data={dashboard.cityBreakdown}
      headers={['المدينة', 'عدد الردود']}
      row={(item) => [item.name, formatNumber(item.value)]}
      filename="cities.csv"
    />
  );
}

function IssuesPage() {
  const { dashboard } = useMarketData();
  return (
    <DataBreakdownPage
      kicker="Issues Matrix"
      title="مصفوفة المشاكل"
      description="ترتيب المشاكل حسب عدد مرات ظهورها في الاستبيانات."
      icon={AlertTriangle}
      primaryMetric={firstName(dashboard.problemBreakdown)}
      primaryLabel="المشكلة الأعلى"
      data={dashboard.problemBreakdown}
      headers={['المشكلة', 'التكرار']}
      row={(item) => [item.name, formatNumber(item.value)]}
      filename="issues.csv"
    />
  );
}

function OpportunitiesPage() {
  const { dashboard } = useMarketData();
  return (
    <DataBreakdownPage
      kicker="Opportunities"
      title="الفرص والتوقعات"
      description="ما يشجع العملاء على الطلب المباشر بناءً على اختياراتهم."
      icon={PackageCheck}
      primaryMetric={firstName(dashboard.directEncouragementBreakdown)}
      primaryLabel="أهم محفز"
      data={dashboard.directEncouragementBreakdown}
      headers={['المحفز', 'عدد الاختيارات']}
      row={(item) => [item.name, formatNumber(item.value)]}
      filename="opportunities.csv"
    />
  );
}

function DataBreakdownPage({
  kicker,
  title,
  description,
  icon,
  primaryMetric,
  primaryLabel,
  data,
  headers,
  row,
  filename,
}: {
  kicker: string;
  title: string;
  description: string;
  icon: LucideIcon;
  primaryMetric: string;
  primaryLabel: string;
  data: CountDatum[];
  headers: string[];
  row: (item: CountDatum) => Array<string | number>;
  filename: string;
}) {
  const Icon = icon;
  return (
    <div className="page-stack">
      <PageHeader kicker={kicker} title={title} description={description} action={<ExportBtn onClick={() => downloadCSV(filename, headers, data.map(row))} />} />
      <div className="metric-grid three">
        <MetricCard icon={Icon} label={primaryLabel} value={primaryMetric} hint="من قاعدة البيانات" />
        <MetricCard icon={MessageSquare} label="إجمالي العناصر" value={formatNumber(data.reduce((sum, item) => sum + item.value, 0))} hint="بعد التجميع" tone="blue" />
        <MetricCard icon={Database} label="مصدر البيانات" value="فعلي" hint="بدون بيانات وهمية" tone="green" />
      </div>
      <div className="content-grid two">
        <Card title="الرسم البياني" subtitle="حسب العدد">
          <div className="chart-lg">{data.length ? <SafeResponsiveContainer><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" name="العدد" fill="#0d9488" radius={[7, 7, 0, 0]} isAnimationActive={false} /></BarChart></SafeResponsiveContainer> : <EmptyState />}</div>
        </Card>
        <Card title="التوزيع" subtitle="نسبة وتكرار"><DonutChart data={data} /></Card>
      </div>
      <Card title="الجدول التفصيلي" subtitle={`${data.length} صف`}>
        <div className="table-wrap">
          <table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>
            {data.map((item) => <tr key={item.name}>{row(item).map((value, index) => <td key={`${item.name}-${index}`}>{index === 0 ? <strong>{value}</strong> : value}</td>)}</tr>)}
          </tbody></table>
          {!data.length && <EmptyState />}
        </div>
      </Card>
    </div>
  );
}

function ResponsesPage() {
  const { responses } = useMarketData();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('كل الحالات');
  const [chatOpen, setChatOpen] = useState<ApiSurveyResponse | null>(null);
  const filtered = responses.filter((response) => {
    const haystack = [response.customer?.name, response.customer?.phone, response.customer?.city, response.preferredPlatform, response.mainProblem, response.campaign?.name].join(' ');
    return haystack.includes(searchText) && (statusFilter === 'كل الحالات' || response.status === statusFilter);
  });

  return (
    <div className="page-stack">
      <PageHeader kicker="Survey Responses" title="نتائج الاستبيانات والمحادثات" description="كل رد مرتبط بالعميل والحملة والسجل الخام." action={<ExportBtn onClick={() => downloadCSV('responses.csv', ['العميل', 'الهاتف', 'المدينة', 'المنصة', 'المشكلة', 'الحالة'], filtered.map((response) => [response.customer?.name || '', response.customer?.phone || '', response.customer?.city || '', response.preferredPlatform || response.platforms || '', response.mainProblem || '', response.status]))} />} />
      <div className="metric-grid three">
        <MetricCard icon={MessageSquare} label="إجمالي النتائج" value={formatNumber(filtered.length)} hint="بعد الفلاتر" />
        <MetricCard icon={CheckCircle2} label="مكتملة" value={formatNumber(filtered.filter((response) => response.status === 'completed').length)} hint="استبيانات مكتملة" tone="green" />
        <MetricCard icon={ClipboardList} label="قيد المتابعة" value={formatNumber(filtered.filter((response) => response.status !== 'completed').length)} hint="جلسات أو رفض" tone="amber" />
      </div>
      <Card title="فلترة النتائج" subtitle={`${filtered.length} نتيجة`}>
        <div className="filter-row">
          <div className="search-box wide"><Search size={18} /><input placeholder="ابحث باسم العميل أو الرقم أو الحملة" value={searchText} onChange={(event) => setSearchText(event.target.value)} /></div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{['كل الحالات', 'completed', 'in_progress', 'abandoned'].map((item) => <option key={item}>{item}</option>)}</select>
          <button className="btn secondary" onClick={() => { setSearchText(''); setStatusFilter('كل الحالات'); }}><Filter size={17} /> إعادة ضبط</button>
        </div>
      </Card>
      <ResponsesTable rows={filtered} onOpen={setChatOpen} />
      <Modal open={Boolean(chatOpen)} onClose={() => setChatOpen(null)} title={`محادثة ${chatOpen?.customer?.phone || ''}`}>
        <div className="chat-preview real">
          {parseChatLog(chatOpen?.rawChatLog).map((entry, index) => <p key={`${entry.at || ''}-${index}`} className={entry.sender === 'user' ? 'user-msg' : 'bot-msg'}>{entry.text}</p>)}
          {chatOpen && !parseChatLog(chatOpen.rawChatLog).length && <EmptyState title="لا يوجد سجل محادثة" description="لم يتم حفظ rawChatLog لهذا الرد." />}
        </div>
      </Modal>
    </div>
  );
}

function ResponsesTable({ rows, compact, onOpen }: { rows: ApiSurveyResponse[]; compact?: boolean; onOpen?: (response: ApiSurveyResponse) => void }) {
  return (
    <Card title={compact ? undefined : 'جدول الاستجابات'} subtitle={compact ? undefined : `${rows.length} صف`}>
      <div className="table-wrap">
        <table>
          <thead><tr><th>العميل</th><th>الحملة</th><th>المدينة</th><th>المنصة</th><th>المشكلة</th><th>الحالة</th>{!compact && <th>الإجراء</th>}</tr></thead>
          <tbody>
            {rows.map((response) => (
              <tr key={response.id}>
                <td><strong>{response.customer?.name || 'بدون اسم'}</strong><span dir="ltr">{response.customer?.phone || response.customerId}</span></td>
                <td>{response.campaign?.name || response.campaignId}</td>
                <td>{response.customer?.city || response.city || 'غير محدد'}</td>
                <td>{response.preferredPlatform || response.platforms || 'غير محدد'}</td>
                <td>{response.mainProblem || 'غير محدد'}</td>
                <td><StatusBadge value={response.status} /></td>
                {!compact && <td><button className="link-btn" onClick={() => onOpen?.(response)}><Eye size={15} /> عرض</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <EmptyState />}
      </div>
    </Card>
  );
}

function SurveyEnginePage() {
  const [humanMode, setHumanMode] = useState(false);
  const [questions, setQuestions] = useState<SurveyQuestion[]>(defaultQuestions);
  const [selectedId, setSelectedId] = useState(defaultQuestions[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'content' | 'logic' | 'type' | 'preview' | 'database'>('content');
  const [newOption, setNewOption] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const dragQuestion = useRef<number | null>(null);
  const selected = questions.find((question) => question.id === selectedId) || questions[0];

  useEffect(() => {
    fetchJson<{ humanMode?: boolean; questions?: SurveyQuestion[]; config?: { humanMode?: boolean; questions?: SurveyQuestion[] } }>('/api/admin/survey/config')
      .then((response) => {
        const config = response.config || response;
        setHumanMode(Boolean(config.humanMode));
        if (Array.isArray(config.questions) && config.questions.length) {
          setQuestions(config.questions.map((question) => ({ ...question, options: question.options || [], type: question.type || 'open_text' })));
          setSelectedId(config.questions[0]?.id || defaultQuestions[0].id);
        }
      })
      .catch(() => undefined);
  }, []);

  const updateQuestion = (id: string, patch: Partial<SurveyQuestion>) => {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, ...patch } : question));
  };

  const addQuestion = () => {
    const id = `ASK_CUSTOM_${Date.now()}`;
    const question: SurveyQuestion = { id, label: 'سؤال جديد', text: 'اكتب نص السؤال هنا', options: [], key: '', type: 'open_text' };
    setQuestions((current) => [...current, question]);
    setSelectedId(id);
    setActiveTab('content');
  };

  const deleteQuestion = (id: string) => {
    const next = questions.filter((question) => question.id !== id);
    setQuestions(next);
    setSelectedId(next[0]?.id || '');
  };

  const moveQuestion = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setQuestions((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const addOption = () => {
    if (!selected || !newOption.trim()) return;
    updateQuestion(selected.id, { options: [...selected.options, newOption.trim()] });
    setNewOption('');
  };

  const moveOption = (from: number, to: number) => {
    if (!selected || from === to || to < 0 || to >= selected.options.length) return;
    const options = [...selected.options];
    const [item] = options.splice(from, 1);
    options.splice(to, 0, item);
    updateQuestion(selected.id, { options });
  };

  const saveConfig = async () => {
    try {
      const response = await fetch('/api/admin/survey/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanMode, questions }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        setToast({ message: `❌ فشل الحفظ: ${errData.message || 'خطأ في الخادم'}`, type: 'error' });
        return;
      }
      const data = await response.json();
      if (data?.config?.questions) {
        setQuestions(data.config.questions.map((q: SurveyQuestion) => ({ ...q, options: q.options || [], type: q.type || 'open_text' })));
      }
      setToast({ message: '✅ تم حفظ محرك الاستبيان', type: 'success' });
    } catch (err) {
      setToast({ message: `❌ فشل الاتصال بالخادم`, type: 'error' });
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Survey Engine"
        title="محرك الاستبيان"
        description="أنواع الأسئلة، الخيارات، المنطق، المعاينة، وربط قاعدة البيانات من شاشة واحدة."
        action={<div className="action-row"><label className="toggle-chip"><span>وضع المحادثة البشرية</span><input type="checkbox" checked={humanMode} onChange={(event) => setHumanMode(event.target.checked)} /></label><button className="btn primary" onClick={() => void saveConfig()}><Save size={17} /> حفظ</button></div>}
      />
      <div className="survey-builder">
        <Card title={`الأسئلة (${questions.length})`} action={<button className="btn secondary" onClick={addQuestion}><Plus size={16} /> إضافة</button>} className="survey-list-panel">
          <div className="survey-question-list">
            {questions.map((question, index) => (
              <button
                key={question.id}
                draggable
                onDragStart={() => { dragQuestion.current = index; }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => { moveQuestion(dragQuestion.current ?? index, index); dragQuestion.current = null; }}
                className={`survey-question-item ${selectedId === question.id ? 'active' : ''}`}
                onClick={() => setSelectedId(question.id)}
              >
                <GripVertical size={15} />
                <span>{index + 1}</span>
                <strong>{question.label}</strong>
                <em>{questionTypes.find((type) => type.value === question.type)?.label}</em>
              </button>
            ))}
          </div>
        </Card>
        <Card className="survey-editor-panel" title={selected?.label || 'اختر سؤالاً'}>
          {selected ? (
            <>
              <div className="tabs">
                {[
                  ['content', 'المحتوى', Type],
                  ['logic', 'المنطق', ListChecks],
                  ['type', 'نوع السؤال', Bot],
                  ['preview', 'المعاينة', Eye],
                  ['database', 'قاعدة البيانات', Database],
                ].map(([key, label, Icon]) => (
                  <button key={String(key)} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key as typeof activeTab)}><Icon size={16} /> {String(label)}</button>
                ))}
              </div>
              {activeTab === 'content' && (
                <div className="question-grid relaxed">
                  <label className="span-full"><span>نص السؤال</span><textarea value={selected.text} onChange={(event) => updateQuestion(selected.id, { text: event.target.value })} rows={7} /></label>
                  <label><span>عنوان السؤال</span><input value={selected.label} onChange={(event) => updateQuestion(selected.id, { label: event.target.value })} /></label>
                  <label><span>المعرف التقني</span><input value={selected.id} onChange={(event) => updateQuestion(selected.id, { id: event.target.value })} dir="ltr" /></label>
                </div>
              )}
              {activeTab === 'type' && (
                <div className="question-grid relaxed">
                  <label><span>نوع السؤال</span><select value={selected.type} onChange={(event) => updateQuestion(selected.id, { type: event.target.value as QuestionType, options: event.target.value === 'yes_no' ? ['نعم', 'لا'] : selected.options })}>{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                  <div className="span-full option-editor">
                    <div className="option-head"><strong>الخيارات ({selected.options.length})</strong><span>يمكن إعادة ترتيب الخيارات</span></div>
                    {selected.options.length ? selected.options.map((option, index) => (
                      <div className="option-row" key={`${option}-${index}`}>
                        <GripVertical size={15} />
                        <input value={option} onChange={(event) => {
                          const options = [...selected.options];
                          options[index] = event.target.value;
                          updateQuestion(selected.id, { options });
                        }} />
                        <button className="icon-btn" onClick={() => moveOption(index, index - 1)} aria-label="رفع">↑</button>
                        <button className="icon-btn" onClick={() => moveOption(index, index + 1)} aria-label="خفض">↓</button>
                        <button className="icon-btn danger" onClick={() => updateQuestion(selected.id, { options: selected.options.filter((_, optionIndex) => optionIndex !== index) })} aria-label="حذف"><Trash2 size={15} /></button>
                      </div>
                    )) : <EmptyState title="لا توجد خيارات" description="هذا السؤال سيعامل كسؤال مفتوح ما لم تضف خيارات." />}
                    <div className="inline-add">
                      <input value={newOption} onChange={(event) => setNewOption(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addOption(); }} placeholder="أضف خياراً جديداً" />
                      <button className="btn secondary" onClick={addOption}><Plus size={16} /> إضافة</button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'logic' && (
                <div className="question-grid relaxed">
                  <label><span>السؤال التالي الافتراضي</span><select defaultValue=""><option value="">حسب ترتيب القائمة</option>{questions.filter((question) => question.id !== selected.id).map((question) => <option key={question.id} value={question.id}>{question.label}</option>)}</select></label>
                  <label><span>السلوك عند عدم الفهم</span><select defaultValue="repeat"><option value="repeat">إعادة صياغة السؤال</option><option value="open">قبول كنص مفتوح</option></select></label>
                  <div className="insight-strip"><ListChecks size={20} /><strong>المنطق الحالي</strong><span>المحرك يحافظ على مسار الاستبيان الأساسي ويستخدم نوع السؤال لتغيير واجهة WhatsApp والحفظ.</span></div>
                </div>
              )}
              {activeTab === 'preview' && <WhatsAppQuestionPreview question={selected} humanMode={humanMode} />}
              {activeTab === 'database' && (
                <div className="question-grid relaxed">
                  <label><span>الحقل المرتبط بقاعدة البيانات</span><input value={selected.key} onChange={(event) => updateQuestion(selected.id, { key: event.target.value })} placeholder="directEncouragement" dir="ltr" /></label>
                  <label><span>طريقة الحفظ</span><select value={selected.type === 'multi_select' ? 'array_text' : 'text'} disabled><option value="text">نص</option><option value="array_text">قائمة نصية مفصولة</option></select></label>
                  <div className="insight-strip"><Database size={20} /><strong>تأثير الحفظ</strong><span>سيتم حفظ إجابات الاختيارات المتعددة كنص منظف مفصول بعلامة "،" ليدخل في التحليلات والرسوم.</span></div>
                </div>
              )}
              <div className="editor-actions">
                <button className="btn secondary danger-text" onClick={() => deleteQuestion(selected.id)}><Trash2 size={16} /> حذف السؤال</button>
              </div>
            </>
          ) : <EmptyState title="اختر سؤالاً" description="ابدأ من القائمة اليمنى أو أضف سؤالاً جديداً." />}
        </Card>
      </div>
      {humanMode && <div className="insight-strip warning"><MessageSquare size={20} /><strong>وضع المحادثة البشرية مفعل</strong><span>سيتم تقليل النمط الآلي، تعطيل القوائم عند الحاجة، وإضافة تأخير عشوائي في الخادم.</span></div>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function WhatsAppQuestionPreview({ question, humanMode }: { question: SurveyQuestion; humanMode: boolean }) {
  const isMulti = question.type === 'multi_select';
  const hasInteractive = question.options.length > 0 && !humanMode && question.type !== 'open_text' && question.type !== 'text_input';
  return (
    <div className="whatsapp-preview-frame">
      <div className="wa-bubble outgoing">
        <strong>{humanMode ? 'رسالة بشرية' : isMulti ? 'اختيارات متعددة' : 'سؤال تفاعلي'}</strong>
        <p>{question.text}</p>
        {isMulti && !humanMode && <span>اكتب الأرقام مفصولة بفواصل لاختيار أكثر من إجابة.</span>}
      </div>
      {hasInteractive && (
        <div className="wa-list">
          <button><ListChecks size={18} /> {isMulti ? 'اختيارات متعددة' : 'اختر الإجابة'}</button>
          <div>
            {question.options.map((option, index) => <p key={option}><strong>{option}</strong><span>{isMulti ? `اختيار ${index + 1}` : ''}</span></p>)}
          </div>
        </div>
      )}
      {humanMode && question.options.length > 0 && <div className="wa-bubble outgoing soft">{question.options.join('، ')}</div>}
    </div>
  );
}

function CampaignsPage() {
  const { campaigns, dashboard, refresh } = useMarketData();
  const [showModal, setShowModal] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RecipientPreview>({ totalRows: 0, validCount: 0, duplicateCount: 0, invalidCount: 0, recipients: [], duplicates: [], invalid: [] });
  const [toast, setToast] = useState<ToastState>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'survey',
    surveyTemplate: 'default',
    launchMode: 'immediate',
    scheduledAt: '',
    status: 'draft',
    humanMode: false,
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readCustomerFileRows(file);
      const analyzed = analyzeCustomerRows(rows);
      setUploadedFile(file);
      setPreview(analyzed);
      setToast({ message: `تم تحليل الملف: ${analyzed.validCount} رقم صالح`, type: analyzed.validCount ? 'success' : 'error' });
    } catch (error) {
      setUploadedFile(null);
      setPreview({ totalRows: 0, validCount: 0, duplicateCount: 0, invalidCount: 0, recipients: [], duplicates: [], invalid: [] });
      setToast({ message: error instanceof Error ? error.message : 'تعذر قراءة الملف', type: 'error' });
    }
  };

  const createPayload = (mode: string) => ({
    ...form,
    launchMode: mode,
    status: mode === 'draft' ? 'draft' : mode === 'schedule' ? 'scheduled' : 'active',
    campaignId: `campaign_${Date.now()}`,
    id: `campaign_${Date.now()}`,
    name: form.name.trim() || 'حملة استبيان جديدة',
    customers: preview.recipients,
    scheduledAt: form.scheduledAt || undefined,
  });

  const saveDraft = async () => {
    const payload = createPayload('draft');
    const response = await fetch('/api/admin/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error('فشل حفظ المسودة');
    setToast({ message: 'تم حفظ الحملة كمسودة', type: 'success' });
    setShowModal(false);
    await refresh();
  };

  const launchCampaign = async () => {
    if (!preview.validCount) {
      setToast({ message: 'لا يوجد مستلمون صالحون للإرسال', type: 'error' });
      return;
    }
    setLaunching(true);
    try {
      const payload = createPayload(form.launchMode);
      const response = await fetch('/api/campaigns/launch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json() as { ok?: boolean; message?: string; queued?: number };
      if (!response.ok || data.ok === false) throw new Error(data.message || 'فشل إطلاق الحملة');
      setToast({ message: `تم تشغيل الحملة على ${data.queued || 0} مستلم`, type: 'success' });
      setShowModal(false);
      await refresh();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'فشل الإطلاق', type: 'error' });
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader kicker="Campaign Management" title="إدارة الحملات" description="إنشاء الحملات، معاينة المستلمين، ثم تشغيل الإرسال من قائمة مؤكدة فقط." action={<div className="action-row"><button className="btn secondary" onClick={downloadCampaignTemplate}><Download size={17} /> قالب فارغ</button><button className="btn primary" onClick={() => setShowModal(true)}><Plus size={17} /> إضافة حملة جديدة</button></div>} />
      <div className="metric-grid four">
        <MetricCard icon={Megaphone} label="إجمالي الحملات" value={formatNumber(dashboard.campaignStats?.totalCampaigns || campaigns.length)} hint="من قاعدة البيانات" />
        <MetricCard icon={PlayCircle} label="النشطة" value={formatNumber(dashboard.campaignStats?.activeCampaigns)} hint="حملات قيد التشغيل" tone="green" />
        <MetricCard icon={CalendarDays} label="المجدولة" value={formatNumber(dashboard.campaignStats?.scheduledCampaigns)} hint="تنتظر موعد الإطلاق" tone="amber" />
        <MetricCard icon={Send} label="رسائل مرسلة" value={formatNumber(dashboard.messageStats?.sentMessages)} hint="من سجل WhatsApp" tone="blue" />
      </div>
      <Card title="الحملات" subtitle={`${campaigns.length} حملة`}>
        <div className="table-wrap">
          <table><thead><tr><th>اسم الحملة</th><th>النوع</th><th>المستلمون</th><th>المكرر</th><th>غير صالح</th><th>الاستجابات</th><th>المعدل</th><th>الحالة</th></tr></thead><tbody>
            {campaigns.map((campaign) => <tr key={campaign.id}><td><strong>{campaign.name}</strong><span>{campaign.description || campaign.id}</span></td><td>{campaign.type || 'survey'}</td><td>{formatNumber(campaign.validRecipientCount)}</td><td>{formatNumber(campaign.duplicateRecipientCount)}</td><td>{formatNumber(campaign.invalidRecipientCount)}</td><td>{formatNumber(campaign.responseCount)}</td><td>{percent(campaign.responseRate)}</td><td><StatusBadge value={campaign.status} /></td></tr>)}
          </tbody></table>
          {!campaigns.length && <EmptyState />}
        </div>
      </Card>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة حملة جديدة">
        <div className="campaign-modal-grid">
          <label><span>اسم الحملة</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span>نوع الحملة</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="survey">استبيان</option><option value="reactivation">إعادة تنشيط</option><option value="research">بحث سوقي</option></select></label>
          <label className="span-full"><span>وصف الحملة</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label><span>قالب الاستبيان</span><select value={form.surveyTemplate} onChange={(event) => setForm({ ...form, surveyTemplate: event.target.value })}><option value="default">الاستبيان الرئيسي</option><option value="payment">تفضيلات الدفع</option><option value="delivery">تجربة التوصيل</option></select></label>
          <label><span>وقت الإطلاق</span><input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></label>
          <label><span>طريقة التشغيل</span><select value={form.launchMode} onChange={(event) => setForm({ ...form, launchMode: event.target.value })}><option value="immediate">تشغيل فوري</option><option value="schedule">جدولة</option><option value="draft">حفظ كمسودة</option></select></label>
          <label><span>الحالة</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">مسودة</option><option value="active">نشطة</option><option value="scheduled">مجدولة</option></select></label>
          <label className="toggle-chip span-full"><span>وضع المحادثة البشرية لهذه الحملة</span><input type="checkbox" checked={form.humanMode} onChange={(event) => setForm({ ...form, humanMode: event.target.checked })} /></label>
          <div className="upload-card span-full">
            <UploadCloud size={30} />
            <strong>{uploadedFile ? uploadedFile.name : 'رفع ملف العملاء'}</strong>
            <span>CSV / Excel. لن يتم إرسال أي رقم غير موجود في الملف.</span>
            <label className="btn secondary"><UploadCloud size={15} /> اختر ملف<input type="file" hidden accept=".csv,.xlsx" onChange={handleFileChange} /></label>
          </div>
          <RecipientPreviewPanel preview={preview} />
          <div className="action-row span-full modal-actions">
            <button className="btn secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            <button className="btn secondary" onClick={() => void saveDraft()}><Save size={16} /> حفظ كمسودة</button>
            <button className="btn primary" disabled={launching || !preview.validCount} onClick={() => void launchCampaign()}><Send size={16} /> {launching ? 'جاري التشغيل' : 'تشغيل الحملة'}</button>
          </div>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function RecipientPreviewPanel({ preview }: { preview: RecipientPreview }) {
  return (
    <div className="recipient-preview span-full">
      <div className="preview-metrics">
        <strong>{preview.validCount}</strong><span>سيتم الإرسال لهم فعلياً</span>
        <strong>{preview.duplicateCount}</strong><span>مكرر</span>
        <strong>{preview.invalidCount}</strong><span>غير صالح</span>
      </div>
      <div className="recipient-lists">
        <div><h4>الأرقام الصالحة</h4>{preview.recipients.slice(0, 80).map((recipient) => <p key={recipient.phone}><span dir="ltr">{recipient.phone}</span><em>{recipient.name || 'بدون اسم'}</em></p>)}{!preview.recipients.length && <small>لا يوجد</small>}</div>
        <div><h4>المكررة</h4>{preview.duplicates.slice(0, 40).map((item) => <p key={`${item.phone}-${item.row}`}><span dir="ltr">{item.phone}</span><em>صف {item.row} مكرر لصف {item.firstRow}</em></p>)}{!preview.duplicates.length && <small>لا يوجد</small>}</div>
        <div><h4>غير الصالحة</h4>{preview.invalid.slice(0, 40).map((item) => <p key={`${item.rawPhone}-${item.row}`}><span>{item.rawPhone || 'فارغ'}</span><em>صف {item.row}</em></p>)}{!preview.invalid.length && <small>لا يوجد</small>}</div>
      </div>
    </div>
  );
}

function SettingsPage() {
  const [waba, setWaba] = useState({ provider: 'custom', apiUrl: 'https://gate.whapi.cloud/', apiKey: '', phoneId: '', businessId: '', webhookToken: '' });
  const [webhookUrl, setWebhookUrl] = useState('/api/integrations/survey-agent/webhook');
  const [toast, setToast] = useState<ToastState>(null);
  const save = async () => {
    const response = await fetch('/api/admin/settings/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ waba, webhookUrl }) });
    setToast({ message: response.ok ? 'تم حفظ الإعدادات' : 'فشل حفظ الإعدادات', type: response.ok ? 'success' : 'error' });
  };
  const test = async () => {
    const response = await fetch('/api/admin/settings/test-whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: waba.provider, apiUrl: waba.apiUrl, apiKey: waba.apiKey }) });
    const data = await response.json().catch(() => ({ message: 'تعذر قراءة الرد' })) as { message?: string };
    setToast({ message: data.message || (response.ok ? 'تم الاتصال' : 'فشل الاتصال'), type: response.ok ? 'success' : 'error' });
  };

  return (
    <div className="page-stack">
      <PageHeader kicker="Settings" title="الإعدادات والربط التقني" description="إدارة مزود WhatsApp والـ Webhook بدون بيانات تجريبية." action={<button className="btn primary" onClick={() => void save()}><ShieldCheck size={17} /> حفظ</button>} />
      <Card title="مزود WhatsApp API" subtitle="بيانات الربط">
        <div className="question-grid">
          <label><span>مزود الخدمة</span><select value={waba.provider} onChange={(event) => setWaba({ ...waba, provider: event.target.value })}><option value="custom">مزود مخصص</option><option value="meta">Meta Cloud API</option><option value="twilio">Twilio</option></select></label>
          <label><span>API URL</span><input value={waba.apiUrl} onChange={(event) => setWaba({ ...waba, apiUrl: event.target.value })} dir="ltr" /></label>
          <label><span>API Token</span><input value={waba.apiKey} onChange={(event) => setWaba({ ...waba, apiKey: event.target.value })} type="password" dir="ltr" /></label>
          <label><span>Webhook URL</span><input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} dir="ltr" /></label>
          <label><span>Phone Number ID</span><input value={waba.phoneId} onChange={(event) => setWaba({ ...waba, phoneId: event.target.value })} dir="ltr" /></label>
          <label><span>Business Account ID</span><input value={waba.businessId} onChange={(event) => setWaba({ ...waba, businessId: event.target.value })} dir="ltr" /></label>
        </div>
        <div className="action-row form-actions"><button className="btn secondary" onClick={() => void test()}><Activity size={17} /> اختبار الاتصال</button></div>
      </Card>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default App;
