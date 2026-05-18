import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useState, createContext, useContext, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  Download,
  Filter,
  Globe2,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  MapPinned,
  Megaphone,
  MessageSquare,
  PackageCheck,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Target,
  Timer,
  TrendingUp,
  Truck,
  UploadCloud,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

type Tone = 'teal' | 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'pink';

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  delta?: string;
  tone?: Tone;
};

const chartColors = ['#0d9488', '#3b82f6', '#f59e0b', '#64748b', '#ec4899', '#8b5cf6'];

type FilterState = { period: string; city: string; platform: string };
const FilterContext = createContext<{ filters: FilterState; setFilters: (f: Partial<FilterState>) => void }>({ filters: { period: 'آخر 30 يوم', city: 'كل المدن', platform: 'كل المنصات' }, setFilters: () => {} });
function useFilters() { return useContext(FilterContext); }

function FilterBar() {
  const { filters, setFilters } = useFilters();
  const periods = ['آخر 24 ساعة', 'آخر 7 أيام', 'آخر 30 يوم', 'الربع الحالي', 'سنة كاملة'];
  const cities = ['كل المدن', 'صنعاء', 'عدن', 'تعز', 'حضرموت', 'الحديدة'];
  const platforms = ['كل المنصات', 'شي إن', 'نون', 'أمازون', 'علي إكسبريس'];

  return (
    <div className="topbar-tools">
      <div className="search-box">
        <Search size={18} />
        <input aria-label="بحث" placeholder="بحث في المؤشرات والردود..." />
      </div>
      <div className="filter-row" style={{ gap: 6 }}>
        <FilterChip icon={CalendarDays} label={filters.period} active />
        <select value={filters.period} onChange={e => setFilters({ period: e.target.value })} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc' }}>
          {periods.map(p => <option key={p}>{p}</option>)}
        </select>
        <FilterChip icon={MapPinned} label={filters.city} active />
        <select value={filters.city} onChange={e => setFilters({ city: e.target.value })} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc' }}>
          {cities.map(c => <option key={c}>{c}</option>)}
        </select>
        <FilterChip icon={Globe2} label={filters.platform} active />
        <select value={filters.platform} onChange={e => setFilters({ platform: e.target.value })} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc' }}>
          {platforms.map(p => <option key={p}>{p}</option>)}
        </select>
        <button className="btn secondary" onClick={() => setFilters({ period: 'آخر 30 يوم', city: 'كل المدن', platform: 'كل المنصات' })} style={{ fontSize: 12, padding: '6px 12px' }}>
          <Filter size={14} /> إعادة ضبط
        </button>
      </div>
    </div>
  );
}

function FilterChip({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <div className="filter-chip" style={active ? { background: '#f0fdfa', borderColor: '#0d9488', color: '#0d9488', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 } : { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
      <Icon size={16} />
      <span>{label}</span>
      <ChevronDown size={14} />
    </div>
  );
}

const marketTrend = [
  { month: 'يناير', orders: 420, responses: 210, satisfaction: 3.8 },
  { month: 'فبراير', orders: 510, responses: 260, satisfaction: 4.0 },
  { month: 'مارس', orders: 690, responses: 390, satisfaction: 4.1 },
  { month: 'أبريل', orders: 640, responses: 430, satisfaction: 4.0 },
  { month: 'مايو', orders: 860, responses: 590, satisfaction: 4.3 },
  { month: 'يونيو', orders: 980, responses: 710, satisfaction: 4.4 },
];

const marketShare = [
  { name: 'شي إن', value: 42, color: '#0d9488' },
  { name: 'نون', value: 21, color: '#3b82f6' },
  { name: 'أمازون', value: 17, color: '#f59e0b' },
  { name: 'علي إكسبريس', value: 14, color: '#64748b' },
  { name: 'أخرى', value: 6, color: '#ec4899' },
];

const platformRows = [
  { platform: 'Shein', arabic: 'شي إن', share: '42%', orders: '52,400', nps: 72, delivery: '12.8 يوم', issue: 'تأخير في تسليم الشحنة', status: 'متصدر' },
  { platform: 'Noon', arabic: 'نون', share: '21%', orders: '26,100', nps: 64, delivery: '9.4 يوم', issue: 'محدودية طرق الدفع', status: 'مستقر' },
  { platform: 'Amazon', arabic: 'أمازون', share: '17%', orders: '18,900', nps: 78, delivery: '14.1 يوم', issue: 'ارتفاع رسوم الشحن', status: 'نامي' },
  { platform: 'AliExpress', arabic: 'علي إكسبريس', share: '14%', orders: '15,700', nps: 58, delivery: '21.6 يوم', issue: 'الجمارك والتتبع', status: 'بحاجة تدخل' },
];

const platformChart = [
  { name: 'شي إن', demand: 92, satisfaction: 72, delivery: 64 },
  { name: 'نون', demand: 68, satisfaction: 64, delivery: 81 },
  { name: 'أمازون', demand: 56, satisfaction: 78, delivery: 58 },
  { name: 'علي إكسبريس', demand: 48, satisfaction: 58, delivery: 42 },
];

const platformDemand = [
  { name: 'شي إن', orders: 52400, spend: 1240000 },
  { name: 'نون', orders: 26100, spend: 680000 },
  { name: 'أمازون', orders: 18900, spend: 515000 },
  { name: 'علي إكسبريس', orders: 15700, spend: 420000 },
  { name: 'أخرى', orders: 7400, spend: 165000 },
];

const satisfactionTrend = [
  { month: 'يناير', shein: 4.0, noon: 3.8, amazon: 4.2 },
  { month: 'فبراير', shein: 4.1, noon: 3.9, amazon: 4.3 },
  { month: 'مارس', shein: 4.2, noon: 4.1, amazon: 4.4 },
  { month: 'أبريل', shein: 4.0, noon: 4.0, amazon: 4.2 },
  { month: 'مايو', shein: 4.3, noon: 4.2, amazon: 4.6 },
  { month: 'يونيو', shein: 4.4, noon: 4.3, amazon: 4.7 },
];

const brokers = [
  { name: 'سما إكسبريس', city: 'صنعاء / عدن', orders: 3420, success: 91, rating: 4.8, avg: '11.2 يوم', status: 'نشط جداً' },
  { name: 'محيط للتوصيل', city: 'تعز / إب', orders: 2850, success: 84, rating: 4.5, avg: '13.5 يوم', status: 'نشط' },
  { name: 'أمانة لوجستك', city: 'الحديدة / المكلا', orders: 1210, success: 73, rating: 4.2, avg: '16.4 يوم', status: 'مستقر' },
  { name: 'بوابة اليمن', city: 'حضرموت', orders: 980, success: 68, rating: 3.9, avg: '18.7 يوم', status: 'مراقبة' },
];

const issues = [
  { type: 'تأخير الشحن', severity: 88, frequency: 64, owner: 'العمليات', trend: '+14%' },
  { type: 'رسوم جمركية غير متوقعة', severity: 82, frequency: 51, owner: 'الشركاء', trend: '+9%' },
  { type: 'ضعف التتبع', severity: 74, frequency: 46, owner: 'التكامل', trend: '+6%' },
  { type: 'صعوبة الدفع', severity: 67, frequency: 39, owner: 'المنتج', trend: '-3%' },
  { type: 'تلف أو فقدان الشحنة', severity: 63, frequency: 28, owner: 'الجودة', trend: '+2%' },
];

const cities = [
  { city: 'صنعاء', demand: 92, response: 78, delivery: 12.4, share: '34%' },
  { city: 'عدن', demand: 86, response: 71, delivery: 10.8, share: '24%' },
  { city: 'تعز', demand: 74, response: 63, delivery: 15.6, share: '17%' },
  { city: 'حضرموت', demand: 69, response: 58, delivery: 17.2, share: '14%' },
  { city: 'الحديدة', demand: 55, response: 49, delivery: 18.1, share: '11%' },
];

const consumerDrivers = [
  { name: 'السعر المنخفض', value: 78 },
  { name: 'تنوع المنتجات', value: 62 },
  { name: 'سهولة الدفع', value: 55 },
  { name: 'العروض والخصومات', value: 47 },
  { name: 'ثقة الوسيط', value: 41 },
];

const ageGroups = [
  { name: '18-24', value: 25 },
  { name: '25-34', value: 40 },
  { name: '35-44', value: 20 },
  { name: '45+', value: 15 },
];

const purchaseFrequency = [
  { label: 'أسبوعياً', value: 15 },
  { label: 'شهرياً', value: 55 },
  { label: 'ربع سنوي', value: 30 },
  { label: 'حسب العروض', value: 42 },
];

const consumerSegments = [
  { segment: 'المتسوقون بكثافة (Heavy Shoppers)', users: '12,450', spend: '$185.00', platforms: 'شي إن، أمازون', status: 'نشط جداً' },
  { segment: 'المشترون العرضيون (Occasional)', users: '45,200', spend: '$32.50', platforms: 'علي إكسبريس، السوق المفتوح', status: 'مستقر' },
];

const opportunities = [
  { name: 'الدفع عند الاستلام', demand: 94, pain: 38, size: 900 },
  { name: 'تتبع مباشر', demand: 82, pain: 74, size: 700 },
  { name: 'تسليم منزلي', demand: 88, pain: 68, size: 820 },
  { name: 'ضمان الاسترجاع', demand: 79, pain: 81, size: 620 },
  { name: 'تجميع الشحنات', demand: 72, pain: 55, size: 520 },
];

const responses = [
  { name: 'أحمد علي', phone: '967771234567', city: 'صنعاء', platform: 'Shein', issue: 'تأخير في تسليم الشحنة', rating: 4, date: '2026/05/18 14:20', status: 'مكتمل' },
  { name: 'سارة محمد', phone: '967739876543', city: 'عدن', platform: 'Amazon', issue: 'خطأ في المقاسات المستلمة', rating: 3, date: '2026/05/18 13:45', status: 'معلق' },
  { name: 'خالد جمال', phone: '967710987654', city: 'تعز', platform: 'AliExpress', issue: 'رسوم جمركية غير متوقعة', rating: 2, date: '2026/05/18 11:10', status: 'مكتمل' },
  { name: 'نورة صالح', phone: '967731231231', city: 'صنعاء', platform: 'Noon', issue: 'تجربة ممتازة', rating: 5, date: '2026/05/18 10:05', status: 'مكتمل' },
];

const campaigns = [
  { name: 'مسح القوة الشرائية - إب', sent: '5,000', responses: '3,640', rate: '72.8%', status: 'نشط', spend: '$420' },
  { name: 'تفضيلات العلامات التجارية - حضرموت', sent: '8,200', responses: '2,140', rate: '26.1%', status: 'مجدول', spend: '$310' },
  { name: 'توعية صحية - الحديدة', sent: '12,000', responses: '5,400', rate: '45.0%', status: 'نشط', spend: '$680' },
];

const campaignTrend = [
  { hour: '08:00', sent: 1200, replies: 390 },
  { hour: '10:00', sent: 1800, replies: 620 },
  { hour: '12:00', sent: 900, replies: 240 },
  { hour: '14:00', sent: 1400, replies: 510 },
  { hour: '16:00', sent: 2200, replies: 990 },
  { hour: '18:00', sent: 1900, replies: 850 },
  { hour: '20:00', sent: 2600, replies: 1370 },
];

const navSections = [
  {
    label: 'التحليل',
    items: [
      { path: '/', label: 'لوحة القيادة', icon: LayoutDashboard },
      { path: '/platforms', label: 'تحليل المنصات', icon: Globe2 },
      { path: '/brokers', label: 'قنوات الشراء غير المباشر', icon: Handshake },
      { path: '/consumer', label: 'سلوك المستهلك', icon: Users },
      { path: '/geo', label: 'التوزيع الجغرافي', icon: MapPinned },
      { path: '/issues', label: 'مصفوفة المشاكل', icon: AlertTriangle },
      { path: '/opportunities', label: 'الفرص والتوقعات', icon: Lightbulb },
    ],
  },
  {
    label: 'الأدوات',
    items: [
      { path: '/responses', label: 'نتائج الاستبيانات', icon: ClipboardList },
      { path: '/survey-engine', label: 'محرك الاستبيان', icon: Bot },
      { path: '/campaigns', label: 'إدارة الحملات', icon: Megaphone },
      { path: '/settings', label: 'الإعدادات والربط', icon: Settings },
    ],
  },
];

const pageTitles = navSections.flatMap((section) => section.items);

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  let csv = '\uFEFF' + headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadCampaignTemplate() {
  downloadCSV(
    'linker_campaign_template.csv',
    ['رقم الهاتف', 'الاسم', 'المدينة'],
    [
      ['967771234567', 'أحمد علي', 'صنعاء'],
      ['967739876543', 'سارة محمد', 'عدن'],
      ['967710987654', 'خالد جمال', 'تعز'],
      ['', '', ''],
      ['', '', ''],
    ],
  );
}

function ExportBtn({ onClick, label = 'تصدير Excel' }: { onClick: () => void; label?: string }) {
  return <button className="btn primary" onClick={onClick}><Download size={17} /> {label}</button>;
}

function App() {
  const [filters, setFiltersRaw] = useState<FilterState>({ period: 'آخر 30 يوم', city: 'كل المدن', platform: 'كل المنصات' });
  const setFilters = (partial: Partial<FilterState>) => setFiltersRaw(prev => ({ ...prev, ...partial }));

  return (
    <FilterContext.Provider value={{ filters, setFilters }}>
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
    </FilterContext.Provider>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <BarChart3 size={24} />
        </div>
        <div>
          <strong>لينكر للذكاء السوقي</strong>
          <span>Yemen Market Intelligence</span>
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
      </div>
      <FilterBar />
      <button className="icon-btn" aria-label="الإشعارات">
        <Bell size={19} />
        <span className="notify-dot" />
      </button>
    </header>
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

function MetricCard({ icon: Icon, label, value, hint, delta, tone = 'teal' }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className={`metric-icon tone-${tone}`}>
        <Icon size={21} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
      {delta && <small className={delta.startsWith('-') ? 'delta down' : 'delta'}>{delta}</small>}
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

function StatusBadge({ value }: { value: string }) {
  const tone = value.includes('نشط') || value.includes('مكتمل') || value.includes('متصدر') || value.includes('نامي') ? 'success' : value.includes('معلق') || value.includes('مراقبة') || value.includes('بحاجة') ? 'danger' : 'warning';
  return <span className={`status ${tone}`}>{value}</span>;
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div className="modal-body" onClick={e => e.stopPropagation()} style={{background:'white',borderRadius:12,padding:24,maxWidth:600,width:'90%',maxHeight:'80vh',overflow:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontSize:18,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#94a3b8'}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success'|'error'; onClose: () => void }) {
  return (
    <div style={{position:'fixed',bottom:24,left:24,zIndex:9999,background:type==='success'?'#0d9488':'#ef4444',color:'white',padding:'12px 20px',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',display:'flex',alignItems:'center',gap:12}}>
      <span>{type==='success'?'✅':'❌'}</span> {message}
      <button onClick={onClose} style={{background:'none',border:'none',color:'white',cursor:'pointer',fontSize:16}}>×</button>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="rating" aria-label={`التقييم ${value} من 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={15} fill={index < value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function DashboardPage() {
  const { filters } = useFilters();
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => { setRefreshing(true); setTimeout(() => { setRefreshing(false); setToast({message:'تم تحديث البيانات بنجاح',type:'success'}); }, 800); };
  const handleExport = () => { downloadCSV('لوحة_القيادة_التنفيذية.csv',['المؤشر','القيمة','التفاصيل'],[['إجمالي الردود','5,240','منذ بداية الشهر'],['المنصة الأكثر استخداماً','شي إن','42% من حجم الطلب'],['متوسط الرضا العام','4.2/5','تحسن طفيف'],['نسبة الاعتماد على الوسطاء','64%','من إجمالي المشتريات']]); setToast({message:'تم تصدير التقرير',type:'success'}); };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Executive Dashboard"
        title="قراءة تنفيذية لحالة السوق اليمني"
        description={`مؤشرات مركزة — ${filters.period} — ${filters.city} — ${filters.platform}`}
        action={<div className="action-row"><button className="btn secondary" onClick={handleRefresh} disabled={refreshing}>{refreshing?'⏳ جاري التحديث...':'🔄 تحديث'}</button><ExportBtn onClick={handleExport} /></div>}
      />
      <div className="metric-grid four">
        <MetricCard icon={MessageSquare} label="إجمالي الردود" value="5,240" hint="منذ بداية الشهر" delta="+12.5%" />
        <MetricCard icon={ShoppingBag} label="المنصة الأكثر استخداماً" value="شي إن" hint="42% من حجم الطلب" delta="+8.2%" tone="purple" />
        <MetricCard icon={Star} label="متوسط الرضا العام" value="4.2 / 5" hint="تحسن طفيف في آخر أسبوع" delta="+2.1%" tone="amber" />
        <MetricCard icon={Truck} label="متوسط زمن التوصيل" value="14.8 يوم" hint="يشمل الشحن والجمارك" delta="-1.4 يوم" tone="blue" />
      </div>
      <div className="content-grid dashboard-grid">
        <Card title="نمو الطلبات والردود" subtitle="آخر 6 أشهر" className="span-2">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" reversed tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" name="الطلبات" stroke="#0d9488" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="responses" name="الردود" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="الحصص السوقية" subtitle="حسب المنصة">
          <DonutChart />
        </Card>
        <Card title="أعلى المشاكل تأثيراً" subtitle="مؤشر الشدة والتكرار">
          <div className="chart-md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issues} layout="vertical" margin={{ right: 12, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="type" type="category" width={128} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="severity" name="الشدة" fill="#0d9488" radius={[4, 4, 4, 4]} barSize={14} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="أداء الوسطاء" subtitle="ترتيب تشغيلي مختصر" className="span-2">
          <BrokersTable compact />
        </Card>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function DonutChart() {
  return (
    <div className="donut-wrap">
      <div className="chart-sm">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={marketShare} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} isAnimationActive={false}>
              {marketShare.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-list">
        {marketShare.map((item) => (
          <div key={item.name}>
            <span style={{ background: item.color }} />
            <strong>{item.name}</strong>
            <em>{item.value}%</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformsPage() {
  return (
    <div className="page-stack">
      <PageHeader
        kicker="Platforms Analysis"
        title="تحليل المنصات الدولية"
        description="مقارنة الطلب، الرضا، زمن التوصيل، والمشاكل المتكررة لكل منصة في السوق اليمني."
        action={<ExportBtn onClick={() => downloadCSV('تحليل_المنصات.csv',['المنصة','الحصة','الطلبات','NPS','التوصيل','المشكلة','الحالة'],platformRows.map(r=>[r.arabic,r.share,r.orders,String(r.nps),r.delivery,r.issue,r.status]))} />}
      />
      <div className="metric-grid six">
        <MetricCard icon={ShoppingBag} label="المنصة الأعلى طلباً" value="شي إن" hint="42% من إجمالي الطلبات" delta="+18.2%" />
        <MetricCard icon={PackageCheck} label="إجمالي الطلبات" value="124,500" hint="طلبات مكتملة ومعلقة" delta="+12.4%" tone="blue" />
        <MetricCard icon={WalletCards} label="إجمالي الإنفاق" value="$3.02M" hint="عبر كل المنصات" delta="+15.6%" tone="green" />
        <MetricCard icon={ShoppingBag} label="متوسط قيمة السلة" value="$45.20" hint="قيمة الطلب الواحد" delta="+5.4%" tone="purple" />
        <MetricCard icon={Timer} label="متوسط وقت التوصيل" value="14.8 يوم" hint="يشمل الشحن والجمارك" delta="-1.4 يوم" tone="amber" />
        <MetricCard icon={Star} label="متوسط رضا العملاء" value="4.3 / 5" hint="مؤشر رضا عام" delta="+0.3" tone="green" />
      </div>
      <div className="content-grid two">
        <Card title="شارت حجم الطلب حسب المنصة" subtitle="حجم الطلب والإنفاق حسب المنصة">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformDemand}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis yAxisId="orders" tickLine={false} axisLine={false} />
                <YAxis yAxisId="spend" orientation="right" hide />
                <Tooltip />
                <Bar yAxisId="orders" dataKey="orders" name="إجمالي الطلبات" fill="#0d9488" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar yAxisId="spend" dataKey="spend" name="إجمالي الإنفاق" fill="#3b82f6" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="اتجاهات رضا العملاء" subtitle="متوسط التقييم آخر 6 أشهر">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfactionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" reversed tickLine={false} axisLine={false} />
                <YAxis domain={[3, 5]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="shein" name="شي إن" stroke="#0d9488" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="noon" name="نون" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="amazon" name="أمازون" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="المقارنة التشغيلية للمنصات" subtitle="طلب، رضا، توصيل">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="demand" name="الطلب" fill="#0d9488" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="satisfaction" name="الرضا" fill="#3b82f6" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="delivery" name="التوصيل" fill="#f59e0b" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="رادار الأداء المتكامل" subtitle="طلب، رضا، سرعة، دفع، تتبع">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[
                { axis: 'الطلب', Shein: 92, Noon: 68, Amazon: 56 },
                { axis: 'الرضا', Shein: 72, Noon: 64, Amazon: 78 },
                { axis: 'السرعة', Shein: 64, Noon: 81, Amazon: 58 },
                { axis: 'الدفع', Shein: 70, Noon: 84, Amazon: 62 },
                { axis: 'التتبع', Shein: 75, Noon: 80, Amazon: 69 },
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" />
                <Radar name="Shein" dataKey="Shein" stroke="#0d9488" fill="#0d9488" fillOpacity={0.25} isAnimationActive={false} />
                <Radar name="Noon" dataKey="Noon" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.16} isAnimationActive={false} />
                <Radar name="Amazon" dataKey="Amazon" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.12} isAnimationActive={false} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="تفاصيل أداء المنصات" subtitle="جدول قابل للمراجعة التشغيلية">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنصة</th>
                <th>الحصة</th>
                <th>الطلبات</th>
                <th>NPS</th>
                <th>زمن التوصيل</th>
                <th>المشكلة الأعلى</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {platformRows.map((row) => (
                <tr key={row.platform}>
                  <td><strong>{row.arabic}</strong><span>{row.platform}</span></td>
                  <td>{row.share}</td>
                  <td>{row.orders}</td>
                  <td>{row.nps}</td>
                  <td>{row.delivery}</td>
                  <td>{row.issue}</td>
                  <td><StatusBadge value={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BrokersPage() {
  return (
    <div className="page-stack">
      <PageHeader kicker="Brokers Analysis" title="تحليل قنوات الشراء غير المباشر" description="قياس جودة التنفيذ وتصنيف الوسطاء حسب النوع والقناة والجنس وتوزيع الثقة داخل السوق اليمني."
        action={<ExportBtn onClick={() => downloadCSV('تحليل_قنوات_الشراء.csv',['الوسيط','المدينة','الطلبات','النجاح','التقييم','متوسط التوصيل','الحالة'],[['سما إكسبريس','صنعاء/عدن','3,420','91%','4.8','11.2 يوم','نشط جداً'],['محيط للتوصيل','تعز/إب','2,850','84%','4.5','13.5 يوم','نشط'],['أمانة لوجستك','الحديدة/المكلا','1,210','73%','4.2','16.4 يوم','مستقر'],['بوابة اليمن','حضرموت','980','68%','3.9','18.7 يوم','مراقبة']])} />}
      />
      <div className="metric-grid four">
        <MetricCard icon={Handshake} label="نسبة الاعتماد على الوسطاء" value="64%" hint="من إجمالي المشتريات" delta="+5.2%" />
        <MetricCard icon={Users} label="إجمالي الوسطاء النشطين" value="124" hint="وسطاء عبر كل القنوات" delta="+12%" tone="blue" />
        <MetricCard icon={WalletCards} label="متوسط عمولة الوسيط" value="12.5%" hint="متوسط عمولة الشراء" tone="amber" />
        <MetricCard icon={Truck} label="أسرع وسيط توصيلاً" value="وسيط البرق الشامل" hint="متوسط: 9 أيام" tone="green" />
      </div>
      <div className="content-grid three">
        <Card title="أنواع الوسطاء" subtitle="توزيع طبقة الشراء غير المباشر">
          <div className="stack-list">
            {[
              { label: 'فرد (ذكر)', value: 42, color: '#0d9488' },
              { label: 'فرد (أنثى)', value: 35, color: '#ec4899' },
              { label: 'متجر إنستغرام', value: 15, color: '#8b5cf6' },
              { label: 'بائع واتساب', value: 5, color: '#3b82f6' },
              { label: 'متجر محلي', value: 3, color: '#f59e0b' },
            ].map((item) => <ProgressRow key={item.label} label={item.label} value={item.value} color={item.color} />)}
          </div>
        </Card>
        <Card title="قنوات الوسطاء" subtitle="أين يعمل الوسطاء">
          <div className="stack-list">
            {[
              { label: 'إنستغرام', value: 58, color: '#ec4899' },
              { label: 'واتساب', value: 28, color: '#3b82f6' },
              { label: 'تيليجرام', value: 8, color: '#8b5cf6' },
              { label: 'تيك توك', value: 4, color: '#0d9488' },
              { label: 'محلي', value: 2, color: '#f59e0b' },
            ].map((item) => <ProgressRow key={item.label} label={item.label} value={item.value} color={item.color} />)}
          </div>
        </Card>
        <Card title="توزيع الجنس بين الوسطاء" subtitle="نسبة الذكور والإناث">
          <div className="chart-md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{name:'إناث',value:55,color:'#ec4899'},{name:'ذكور',value:45,color:'#3b82f6'}]} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={4} isAnimationActive={false}>
                  {[{name:'إناث',color:'#ec4899'},{name:'ذكور',color:'#3b82f6'}].map(e=><Cell key={e.name} fill={e.color}/>)}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-inline">
            <span><i style={{background:'#ec4899'}}/>إناث 55%</span>
            <span><i style={{background:'#3b82f6'}}/>ذكور 45%</span>
          </div>
          <p className="metric-note">الوسيطات النسائية يحظين بأعلى ثقة (4.8⭐) مقارنة بـ 3.9⭐ للأفراد الذكور</p>
        </Card>
      </div>
      <div className="content-grid two">
        <Card title="حجم الطلبات حسب الوسيط" subtitle="آخر 30 يوم">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brokers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="orders" name="الطلبات" fill="#0d9488" radius={[7, 7, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="مؤشرات الجودة" subtitle="نجاح، تقييم، متوسط التوصيل">
          <BrokersTable compact={false} />
        </Card>
      </div>
      <Card title="مسار التشغيل" subtitle="نقاط القياس الحرجة">
        <div className="process-grid">
          {[
            { label: 'استلام الطلب', value: '98%', icon: PackageCheck },
            { label: 'تأكيد الدفع', value: '91%', icon: WalletCards },
            { label: 'تسليم الشحنة', value: '84%', icon: Truck },
            { label: 'إغلاق المحادثة', value: '76%', icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div className="process-card" key={label}>
              <Icon size={22} />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BrokersTable({ compact }: { compact: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الوسيط</th>
            <th>الطلبات</th>
            <th>النجاح</th>
            <th>التقييم</th>
            {!compact && <th>متوسط التوصيل</th>}
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((broker) => (
            <tr key={broker.name}>
              <td><strong>{broker.name}</strong><span>{broker.city}</span></td>
              <td>{formatNumber(broker.orders)}</td>
              <td><Progress value={broker.success} /></td>
              <td><Rating value={Math.round(broker.rating)} /></td>
              {!compact && <td>{broker.avg}</td>}
              <td><StatusBadge value={broker.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <span className="progress-cell">
      <span className="progress-track"><span style={{ width: `${value}%` }} /></span>
      <em>{value}%</em>
    </span>
  );
}

function ConsumerPage() {
  const genderData = [{ name: 'إناث', value: 58, color: '#ec4899' }, { name: 'ذكور', value: 42, color: '#94a3b8' }];
  return (
    <div className="page-stack">
      <PageHeader kicker="Consumer Behavior" title="تحليل سلوك المستهلك" description="قراءة ديموغرافية وسلوكية للشراء عبر المنصات الدولية من داخل السوق اليمني."
        action={<ExportBtn onClick={() => downloadCSV('تحليل_سلوك_المستهلك.csv',['المؤشر','القيمة','التفاصيل'],[['إجمالي المتسوقين','57,650','مستجيب ومستخدم نشط'],['إجمالي الإنفاق','$1.24M','في جميع المنصات'],['متوسط قيمة السلة','$45.20','مقارنة بالشهر السابق'],['الفئة الأكثر طلباً','الأزياء','34% من الإجمالي'],['وسيلة الدفع المفضلة','الدفع للوسيط','نمو 8% في الرقمي'],['يوم الذروة','الخميس','نشاط بعد 8 مساءً'],['إناث','58%',''],['ذكور','42%',''],['الفئة 25-34','40%','الأكثر نشاطاً'],['الفئة 18-24','25%',''],['دوافع: السعر','78%',''],['دوافع: تنوع المنتجات','62%','']])} />}
      />
      <div className="metric-grid six">
        <MetricCard icon={Users} label="إجمالي المتسوقين" value="57,650" hint="مستجيب ومستخدم نشط" delta="+9.6%" />
        <MetricCard icon={WalletCards} label="إجمالي الإنفاق" value="$1.24M" hint="في جميع المنصات" delta="+15.4%" tone="green" />
        <MetricCard icon={ShoppingBag} label="متوسط قيمة السلة" value="$45.20" hint="مقارنة بالشهر السابق" delta="+12%" tone="blue" />
        <MetricCard icon={ShoppingBag} label="الفئة الأكثر طلباً" value="الأزياء" hint="34% من الإجمالي" tone="pink" />
        <MetricCard icon={WalletCards} label="وسيلة الدفع المفضلة" value="الدفع للوسيط" hint="نمو 8% في الرقمي" tone="blue" />
        <MetricCard icon={CalendarDays} label="يوم الذروة" value="الخميس" hint="نشاط بعد 8 مساءً" tone="purple" />
      </div>
      <div className="content-grid two">
        <Card title="توزيع الجنس" subtitle="عينة 500 مستجيب">
          <div className="chart-md">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" innerRadius={70} outerRadius={98} paddingAngle={4} isAnimationActive={false}>
                  {genderData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-inline">
            {genderData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name} {item.value}%</span>)}
          </div>
        </Card>
        <Card title="الفئات العمرية" subtitle="نسبة من العينة">
          <div className="stack-list">
            {ageGroups.map((item, index) => <ProgressRow key={item.name} label={item.name} value={item.value} color={chartColors[index]} />)}
          </div>
        </Card>
      </div>
      <div className="content-grid two">
        <Card title="مخطط وتيرة الشراء" subtitle="تكرار الشراء حسب السلوك">
          <div className="chart-md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchaseFrequency}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" name="النسبة" fill="#0d9488" radius={[6, 6, 0, 0]} barSize={34} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="دوافع الشراء الرئيسية" subtitle="الأسباب الأكثر تأثيراً في قرار الشراء">
          <div className="chart-md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumerDrivers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 4, 4]} barSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card
        title="شرائح المستهلكين"
        action={<button className="link-btn">عرض كل الشرائح</button>}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>شريحة المستهلك</th>
                <th>عدد المستخدمين</th>
                <th>متوسط الإنفاق</th>
                <th>المنصات المفضلة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {consumerSegments.map((segment) => (
                <tr key={segment.segment}>
                  <td><strong>{segment.segment}</strong></td>
                  <td>{segment.users}</td>
                  <td>{segment.spend}</td>
                  <td>{segment.platforms}</td>
                  <td><StatusBadge value={segment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="progress-row">
      <div><strong>{label}</strong><span>{value}%</span></div>
      <div className="progress-track"><span style={{ width: `${value}%`, background: color }} /></div>
    </div>
  );
}

function GeoPage() {
  return (
    <div className="page-stack">
      <PageHeader kicker="Geographic Analysis" title="التوزيع الجغرافي للطلب" description="مقارنة حجم الطلب، معدل الاستجابة، ومتوسط التوصيل بين المدن الرئيسية."
        action={<ExportBtn onClick={() => downloadCSV('التوزيع_الجغرافي.csv',['المدينة','مؤشر الطلب','الاستجابة','متوسط التوصيل','الحصة'],[['صنعاء','92','78%','12.4 يوم','34%'],['عدن','86','71%','10.8 يوم','24%'],['تعز','74','63%','15.6 يوم','17%'],['حضرموت','69','58%','17.2 يوم','14%'],['الحديدة','55','49%','18.1 يوم','11%']])} />}
      />
      <div className="content-grid two">
        <Card title="الطلب حسب المدينة" subtitle="Demand index">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cities}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="city" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="demand" name="الطلب" fill="#0d9488" radius={[7, 7, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="response" name="الاستجابة" fill="#3b82f6" radius={[7, 7, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="خريطة تشغيلية مبسطة" subtitle="أولوية التدخل حسب المدينة">
          <div className="city-board">
            {cities.map((city) => (
              <div key={city.city} className="city-tile">
                <span>{city.share}</span>
                <strong>{city.city}</strong>
                <em>{city.delivery} يوم</em>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="تفاصيل المدن" subtitle="القراءة التفصيلية للمدن">
        <div className="table-wrap">
          <table>
            <thead><tr><th>المدينة</th><th>مؤشر الطلب</th><th>الاستجابة</th><th>متوسط التوصيل</th><th>الحصة</th></tr></thead>
            <tbody>
              {cities.map((city) => <tr key={city.city}><td><strong>{city.city}</strong></td><td>{city.demand}</td><td><Progress value={city.response} /></td><td>{city.delivery} يوم</td><td>{city.share}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function IssuesPage() {
  return (
    <div className="page-stack">
      <PageHeader kicker="Issues Matrix" title="مصفوفة المشاكل ونقاط الألم" description="ترتيب المشاكل حسب الشدة والتكرار وربطها بالمالك التشغيلي المناسب."
        action={<ExportBtn onClick={() => downloadCSV('مصفوفة_المشاكل.csv',['المشكلة','الشدة','التكرار','المالك','الاتجاه'],[['تأخير الشحن','88','64','العمليات','+14%'],['رسوم جمركية','82','51','الشركاء','+9%'],['ضعف التتبع','74','46','التكامل','+6%'],['صعوبة الدفع','67','39','المنتج','-3%'],['تلف/فقدان الشحنة','63','28','الجودة','+2%']])} />}
      />
      <div className="content-grid two">
        <Card title="ترتيب المشاكل" subtitle="حسب مؤشر الشدة">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issues} layout="vertical" margin={{ right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={150} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="severity" name="الشدة" fill="#ef4444" radius={[4, 4, 4, 4]} barSize={18} isAnimationActive={false} />
                <Bar dataKey="frequency" name="التكرار" fill="#f59e0b" radius={[4, 4, 4, 4]} barSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="مربعات التدخل" subtitle="أولوية حسب التأثير">
          <div className="issue-matrix">
            {issues.slice(0, 4).map((issue, index) => (
              <div key={issue.type} className={`issue-tile priority-${index + 1}`}>
                <span>{issue.trend}</span>
                <strong>{issue.type}</strong>
                <em>{issue.owner}</em>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="سجل المشاكل" subtitle="توجيه المالك التشغيلي">
        <div className="table-wrap">
          <table>
            <thead><tr><th>المشكلة</th><th>الشدة</th><th>التكرار</th><th>المالك</th><th>الاتجاه</th></tr></thead>
            <tbody>{issues.map((issue) => <tr key={issue.type}><td><strong>{issue.type}</strong></td><td>{issue.severity}</td><td>{issue.frequency}</td><td>{issue.owner}</td><td>{issue.trend}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OpportunitiesPage() {
  return (
    <div className="page-stack">
      <PageHeader kicker="Opportunities & Insights" title="الفرص والتوقعات" description="تحديد مناطق الاستثمار الأعلى بناءً على الطلب المرتفع والمشاكل المتكررة."
        action={<ExportBtn onClick={() => downloadCSV('الفرص_والتوقعات.csv',['الفرصة','الطلب','الألم','حجم السوق'],[['الدفع عند الاستلام','94','38','900'],['تتبع مباشر','82','74','700'],['تسليم منزلي','88','68','820'],['ضمان الاسترجاع','79','81','620'],['تجميع الشحنات','72','55','520']])} />}
      />
      <div className="metric-grid four">
        <MetricCard icon={Lightbulb} label="أكبر فجوة خدمية" value="ضمان الاسترجاع" hint="طلب مرتفع وتلبية منخفضة" tone="amber" />
        <MetricCard icon={Target} label="فرصة توسع" value="تسليم منزلي" hint="صنعاء وعدن أولاً" />
        <MetricCard icon={Zap} label="أسرع أثر" value="الدفع عند الاستلام" hint="يرفع الإكمال 40%" tone="green" />
        <MetricCard icon={Database} label="جاهزية البيانات" value="عالية" hint="500 مستجيب أولي" tone="blue" />
      </div>
      <div className="content-grid two">
        <Card title="مصفوفة الفرص" subtitle="الطلب × الألم × حجم السوق">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="pain" name="الألم" domain={[0, 100]} />
                <YAxis type="number" dataKey="demand" name="الطلب" domain={[0, 100]} />
                <ZAxis type="number" dataKey="size" range={[120, 900]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="الفرص" data={opportunities} fill="#0d9488" fillOpacity={0.82} isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="توقع النمو" subtitle="12 شهر">
          <div className="chart-lg">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { q: 'Q1', fashion: 120, electronics: 82, logistics: 60 },
                { q: 'Q2', fashion: 150, electronics: 105, logistics: 78 },
                { q: 'Q3', fashion: 190, electronics: 135, logistics: 116 },
                { q: 'Q4', fashion: 245, electronics: 170, logistics: 148 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="q" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="fashion" name="الأزياء" stackId="1" stroke="#ec4899" fill="#ec4899" fillOpacity={0.55} isAnimationActive={false} />
                <Area type="monotone" dataKey="electronics" name="الإلكترونيات" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.45} isAnimationActive={false} />
                <Area type="monotone" dataKey="logistics" name="الخدمات اللوجستية" stackId="1" stroke="#0d9488" fill="#0d9488" fillOpacity={0.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ResponsesPage() {
  const [searchText, setSearchText] = useState('');
  const [cityFilter, setCityFilter] = useState('كل المدن');
  const [platformFilter, setPlatformFilter] = useState('كل المنصات');
  const [chatOpen, setChatOpen] = useState<(typeof responses)[0] | null>(null);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);

  const filtered = responses.filter(r =>
    (r.name.includes(searchText) || r.phone.includes(searchText) || r.city.includes(searchText)) &&
    (cityFilter === 'كل المدن' || r.city === cityFilter) &&
    (platformFilter === 'كل المنصات' || r.platform === platformFilter)
  );

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Survey Responses"
        title="نتائج الاستبيانات والمحادثات"
        description="مراجعة الاستجابات الخام وربط كل رد بالمنصة، المدينة، المشكلة، والتقييم."
        action={<ExportBtn onClick={() => { downloadCSV('نتائج_الاستبيانات.csv',['المستجيب','الهاتف','المدينة','المنصة','المشكلة','التقييم','التاريخ','الحالة'],filtered.map(r=>[r.name,r.phone,r.city,r.platform,r.issue,String(r.rating),r.date,r.status])); setToast({message:'تم التصدير بنجاح',type:'success'}); }} />}
      />
      <div className="metric-grid three">
        <MetricCard icon={MessageSquare} label="إجمالي الردود" value={String(filtered.length)} hint="بعد تطبيق الفلاتر" />
        <MetricCard icon={CheckCircle2} label="نسبة المكتملة" value={`${Math.round(filtered.filter(r=>r.status==='مكتمل').length/filtered.length*100)||0}%`} hint="من الإجمالي" tone="green" />
        <MetricCard icon={ClipboardList} label="ردود اليوم" value={String(filtered.length)} hint="تحديث مباشر" tone="purple" />
      </div>
      <Card title="فلترة النتائج" subtitle={`${filtered.length} نتيجة`}>
        <div className="filter-row">
          <div className="search-box wide"><Search size={18} /><input placeholder="ابحث باسم المستجيب أو رقم الهاتف..." value={searchText} onChange={e => setSearchText(e.target.value)} /></div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e2e8f0'}}>{['كل المدن','صنعاء','عدن','تعز'].map(c=><option key={c}>{c}</option>)}</select>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #e2e8f0'}}>{['كل المنصات','Shein','Amazon','AliExpress','Noon'].map(p=><option key={p}>{p}</option>)}</select>
          <button className="btn secondary" onClick={()=>{setSearchText('');setCityFilter('كل المدن');setPlatformFilter('كل المنصات');}}><Filter size={17}/> إعادة ضبط</button>
        </div>
      </Card>
      <Card title="جدول الاستجابات" subtitle={filtered.length===0?'لا توجد نتائج':'آخر المحادثات'}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>المستجيب</th><th>المدينة</th><th>المنصة</th><th>المشكلة الأساسية</th><th>الرضا</th><th>التاريخ والوقت</th><th>الحالة</th><th>الإجراء</th></tr></thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.phone}-${row.date}`}>
                  <td><strong>{row.name}</strong><span>{row.phone}</span></td><td>{row.city}</td><td>{row.platform}</td><td>{row.issue}</td><td><Rating value={row.rating} /></td><td>{row.date}</td>
                  <td><StatusBadge value={row.status} /></td>
                  <td><button className="link-btn" onClick={()=>setChatOpen(row)}>عرض المحادثة</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={!!chatOpen} onClose={()=>setChatOpen(null)} title={`محادثة ${chatOpen?.name || ''}`}>
        {chatOpen && (
          <div style={{background:'#efeae2',padding:16,borderRadius:8,maxHeight:400,overflow:'auto'}}>
            <p style={{background:'#dcf8c6',padding:'10px 14px',borderRadius:'12px 12px 0 12px',marginBottom:8,textAlign:'right'}}>👋 السلام عليكم... هل ممكن نبدأ؟</p>
            <p style={{background:'white',padding:'10px 14px',borderRadius:'12px 12px 12px 0',marginBottom:8}}>نعم تفضلوا</p>
            <p style={{background:'#dcf8c6',padding:'10px 14px',borderRadius:'12px 12px 0 12px',marginBottom:8,textAlign:'right'}}>من أي المنصات تشتري غالباً؟</p>
            <p style={{background:'white',padding:'10px 14px',borderRadius:'12px 12px 12px 0',marginBottom:8}}>{chatOpen.platform}</p>
            <p style={{background:'#dcf8c6',padding:'10px 14px',borderRadius:'12px 12px 0 12px',marginBottom:8,textAlign:'right'}}>شكراً لك جداً 🙏🌷</p>
          </div>
        )}
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

function SurveyEnginePage() {
  const [humanMode, setHumanMode] = useState(false);
  const [questions, setQuestions] = useState([
    { id: 'GREETING', label: '📩 الرسالة الافتتاحية', text: 'السلام عليكم 👋\nمعك فريق دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها، بهدف تحسين خدمات الشحن والتوصيل والدفع داخل اليمن.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\nوإجاباتك بتساعدنا نفهم احتياجات العملاء بشكل أفضل.\n\nهل ممكن نبدأ؟ 😊', options: [], key: '' },
    { id: 'APPROVAL', label: '✅ رسالة الموافقة', text: 'ممتاز 🙏\nشكراً لك مقدماً 🌷\n\nأول سؤال 👇', options: [], key: '' },
    { id: 'ASK_PLATFORMS', label: 'المنصات المستخدمة', text: 'من أي المنصات أو التطبيقات تشتري غالباً؟', options: ['شي إن','نون','أمازون','علي إكسبريس','تيمو','آي هيرب','نايس ون','متاجر إنستغرام','مواقع أو تطبيقات أخرى'], key: 'platforms' },
    { id: 'ASK_FAVORITE_PLATFORM', label: 'المنصة المفضلة', text: 'وأي منصة تعتبرها الأكثر استخداماً بالنسبة لك؟', options: [], key: 'preferredPlatform' },
    { id: 'ASK_PURCHASE_METHOD', label: 'طريقة الشراء', text: 'كيف تقوم بالشراء غالباً؟ 👀', options: ['أطلب بنفسي مباشرة من الموقع','أطلب عبر وسيط أو مندوب','أحياناً مباشرة وأحياناً عبر وسيط','أشتري من متجر محلي يعرض المنتجات'], key: 'purchaseMethod' },
    { id: 'ASK_BROKER_SOURCE', label: 'مصدر الوسيط', text: 'غالباً كيف تعرفت على الوسيط؟', options: ['إنستغرام','واتساب','تيك توك','تيليجرام','صديق أو معرفة','متجر محلي','إعلان'], key: 'brokerSource' },
    { id: 'ASK_BROKER_NAME', label: 'اسم الوسيط', text: 'ايش اسم الحساب أو الوسيط اللي تتعامل معه غالباً؟', options: [], key: 'brokerName' },
    { id: 'ASK_BROKER_CHANNEL', label: 'قناة الوسيط', text: 'هذا الوسيط موجود غالباً فين؟', options: ['إنستغرام','واتساب','تيك توك','تيليجرام','متجر فعلي','مكان آخر'], key: 'brokerPlatform' },
    { id: 'ASK_BROKER_REASON', label: 'سبب الاعتماد على الوسيط', text: 'ايش أكثر سبب يخليك تفضل الطلب عبر وسيط؟', options: ['ما عندي وسيلة دفع','ما أعرف طريقة الطلب','الوسيط أسهل وأسرع','أثق بالوسيط أكثر','يوفر الدفع عند الاستلام','يساعد في الشحن والجمارك','يوفر تجميع الطلبات','أقدر أتواصل معه بسهولة'], key: 'brokerReason' },
    { id: 'ASK_DELIVERY_TIME', label: 'وقت التوصيل', text: 'كم تستغرق الطلبية حتى توصل لك؟ 🚚', options: ['أقل من أسبوعين','أسبوعين إلى شهر','أكثر من شهر','تختلف حسب الطلب'], key: 'deliveryTime' },
    { id: 'ASK_HAS_COD', label: 'الدفع عند الاستلام', text: 'هل الوسيط يوفر الدفع عند الاستلام؟', options: ['نعم','لا','أحياناً'], key: 'cashOnDelivery' },
    { id: 'ASK_HAS_PROBLEMS', label: 'وجود مشاكل', text: 'هل قد واجهت مشكلة مع الطلبات؟ 👀', options: ['نعم','لا'], key: 'hasProblems' },
    { id: 'ASK_MAIN_PROBLEM', label: 'المشكلة الرئيسية', text: 'ايش أكثر مشكلة واجهتك؟', options: ['تأخير الطلب','ارتفاع الشحن','المنتج مختلف','ضعف التتبع','صعوبة التواصل','مشكلة في المقاس','مشكلة بالدفع','مشكلة بالاستلام','أخرى'], key: 'mainProblem' },
    { id: 'ASK_ORDER_VALUE', label: 'متوسط قيمة الطلب', text: 'كم متوسط قيمة طلباتك عادة؟ 💰', options: ['أقل من 10 ألف','من 10 إلى 25 ألف','من 25 إلى 50 ألف','من 50 إلى 100 ألف','أكثر من 100 ألف'], key: 'orderValue' },
    { id: 'ASK_FREQUENCY', label: 'تكرار الشراء', text: 'كم مرة تطلب من المواقع الخارجية؟ 👀', options: ['أسبوعياً','مرتين بالشهر','شهرياً','كل عدة أشهر','فقط بالمواسم'], key: 'purchaseFrequency' },
    { id: 'ASK_CITY', label: 'المدينة', text: 'أي مدينة أنت؟ 🌍', options: [], key: 'city' },
    { id: 'ASK_AGE', label: 'الفئة العمرية', text: 'الفئة العمرية؟', options: ['أقل من 18','18 - 24','25 - 34','35 - 44','أكثر من 45'], key: 'ageGroup' },
    { id: 'ASK_GENDER', label: 'الجنس', text: 'الجنس؟', options: ['ذكر','أنثى'], key: 'gender' },
    { id: 'ASK_PAYMENT_METHOD', label: 'طريقة الدفع', text: 'ايش طريقة الدفع اللي تفضلها غالباً؟ 💳', options: ['الدفع عند الاستلام','تحويل','محفظة إلكترونية','بطاقة بنكية'], key: 'paymentPreference' },
    { id: 'ASK_CANCELED_BEFORE', label: 'إلغاء طلب سابق', text: 'هل سبق وألغيت طلب قبل؟ 👀', options: ['نعم','لا'], key: 'canceledBefore' },
    { id: 'ASK_CANCEL_REASON', label: 'سبب الإلغاء', text: 'ايش كان السبب الرئيسي للإلغاء؟', options: ['تأخير','تغير السعر','غيرت رأيي','ضعف التواصل','فقدت الثقة','تكلفة الشحن','سبب آخر'], key: 'cancelReason' },
    { id: 'ASK_BIGGEST_ANNOYANCE', label: 'أكثر شيء مزعج', text: 'ايش أكثر شيء يزعجك في تجربة الطلب من الخارج؟', options: ['التأخير','ارتفاع تكلفة الشحن','عدم وجود دفع عند الاستلام','ضعف الثقة','صعوبة المرتجعات','اختلاف المنتج','ضعف التتبع','عدم وضوح السعر النهائي','ضعف التواصل','مشاكل الجمارك أو الرسوم'], key: 'biggestAnnoyance' },
    { id: 'ASK_DIRECT_PROBABILITY', label: 'احتمالية الشراء المباشر', text: 'إذا دعمت شي إن اليمن رسمياً… هل تتوقع تطلب مباشرة منها؟', options: ['أكيد','غالباً','ممكن','لا'], key: 'directPurchaseProb' },
    { id: 'ASK_DIRECT_ENCOURAGEMENT', label: 'ما يشجع للشراء المباشر', text: 'ايش أكثر شيء بيشجعك تطلب مباشرة؟', options: ['الدفع عند الاستلام','سرعة التوصيل','تتبع واضح','أسعار أفضل','ضمان واسترجاع','ثقة أكبر'], key: 'directEncouragement' },
    { id: 'ASK_DIRECT_HESITATION', label: 'سبب التردد', text: 'ايش أكثر شيء يخليك متردد حالياً؟', options: [], key: 'directHesitation' },
    { id: 'ASK_REFUSAL_REASON', label: 'سبب الرفض', text: 'ممكن نعرف السبب؟ 🌷', options: [], key: 'refusalReason' },
    { id: 'COMPLETED', label: '🎉 الرسالة الختامية', text: 'شكراً لك جداً 🙏🌷\nمشاركتك أفادتنا بشكل كبير، وبإذن الله تساعد في تحسين خدمات التسوق والتوصيل داخل اليمن.\n\nنتمنى لك يوم سعيد 💜', options: [], key: '' },
    { id: 'REJECTED', label: '🚫 رسالة الرفض', text: 'ولا يهمك أبداً 🌷\nشكراً لوقتك، ونتمنى لك يوم جميل 🙏', options: [], key: '' },
  ]);

  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [newOption, setNewOption] = useState('');

  const selected = questions.find(q => q.id === selectedQ);

  const addQuestion = () => {
    const newId = `ASK_CUSTOM_${Date.now()}`;
    setQuestions([...questions, { id: newId, label: 'سؤال جديد', text: 'نص السؤال', options: [], key: '' }]);
    setSelectedQ(newId);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (selectedQ === id) setSelectedQ(null);
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const addOption = (id: string) => {
    if (!newOption.trim()) return;
    setQuestions(questions.map(q => q.id === id ? { ...q, options: [...q.options, newOption.trim()] } : q));
    setNewOption('');
  };

  const removeOption = (id: string, idx: number) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q));
  };

  const saveConfig = () => {
    fetch('/api/admin/survey/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanMode }),
    });
  };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Survey Engine"
        title="محرك الاستبيان"
        description="إدارة الأسئلة والخيارات والتفرعات مع وضع المحادثة البشرية."
        action={
          <div className="action-row">
            <label className="toggle-chip" style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <span className="text-body-md text-secondary">وضع المحادثة البشرية</span>
              <input type="checkbox" checked={humanMode} onChange={e => setHumanMode(e.target.checked)} style={{width:18,height:18,accentColor:'#0d9488'}} />
            </label>
            <button className="btn primary" onClick={saveConfig}><ShieldCheck size={17} /> حفظ وإرسال</button>
          </div>
        }
      />

      <div className="content-grid three">
        <div className="panel" style={{gridColumn:'span 1'}}>
          <div className="panel-head"><h3>قائمة الأسئلة (28)</h3></div>
          <div style={{maxHeight:'70vh',overflow:'auto'}}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setSelectedQ(q.id)}
                className={`filter-chip`}
                style={{display:'block',width:'100%',textAlign:'right',marginBottom:4,background:selectedQ===q.id?'#f0fdfa':undefined,borderRight:selectedQ===q.id?'3px solid #0d9488':'3px solid transparent'}}
              >
                <span style={{fontSize:11,color:'#64748b'}}>{i+1}.</span> {q.label}
              </button>
            ))}
            <button onClick={addQuestion} className="btn secondary" style={{width:'100%',marginTop:8}}>+ إضافة سؤال جديد</button>
          </div>
        </div>

        <div className="panel" style={{gridColumn:'span 2'}}>
          {!selected ? (
            <div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>اختر سؤالاً من القائمة لتعديله</div>
          ) : (
            <div className="question-grid" style={{gap:16}}>
              <label>
                <span>نص السؤال المرسل للعميل</span>
                <textarea
                  value={selected.text}
                  onChange={e => updateQuestion(selected.id, 'text', e.target.value)}
                  rows={3}
                  style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #e2e8f0',fontSize:14,resize:'vertical'}}
                />
              </label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <label>
                  <span>المعرف التقني</span>
                  <input value={selected.id} readOnly style={{background:'#f1f5f9',width:'100%'}} />
                </label>
                <label>
                  <span>الحقل في قاعدة البيانات</span>
                  <input value={selected.key} onChange={e => updateQuestion(selected.id, 'key', e.target.value)} placeholder="مثلاً: productCategory" style={{width:'100%'}} />
                </label>
              </div>

              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontWeight:600,fontSize:13}}>الخيارات ({selected.options.length})</span>
                  {selected.options.length > 0 && <span style={{fontSize:11,color:'#64748b'}}>اسحب للترتيب</span>}
                </div>
                {selected.options.length === 0 ? (
                  <div style={{padding:20,textAlign:'center',border:'1px dashed #e2e8f0',borderRadius:8,color:'#94a3b8'}}>سؤال مفتوح (بدون خيارات)</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {selected.options.map((opt, oIdx) => (
                      <div key={oIdx} style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span style={{fontSize:12,color:'#94a3b8',minWidth:24}}>{oIdx+1}.</span>
                        <input
                          value={opt}
                          onChange={e => {
                            const newOpts = [...selected!.options];
                            newOpts[oIdx] = e.target.value;
                            updateQuestion(selected!.id, 'options' as never, '' as never);
                            setQuestions(questions.map(q => q.id === selected!.id ? { ...q, options: newOpts } : q));
                          }}
                          style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:13}}
                        />
                        <button onClick={() => removeOption(selected!.id, oIdx)} style={{color:'#ef4444',border:'none',background:'none',cursor:'pointer',fontSize:18}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <input
                    value={newOption}
                    onChange={e => setNewOption(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addOption(selected.id)}
                    placeholder="أضف خياراً جديداً..."
                    style={{flex:1,padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:13}}
                  />
                  <button onClick={() => addOption(selected.id)} className="btn secondary" style={{fontSize:12}}>+ إضافة</button>
                </div>
              </div>

              <div style={{display:'flex',gap:8,justifyContent:'flex-end',borderTop:'1px solid #e2e8f0',paddingTop:12,marginTop:8}}>
                <button onClick={() => deleteQuestion(selected.id)} className="btn secondary" style={{color:'#ef4444',borderColor:'#fecaca'}}>🗑 حذف السؤال</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {humanMode && (
        <div className="insight-strip" style={{background:'#fef3c7',border:'1px solid #f59e0b'}}>
          <MessageSquare size={22} style={{color:'#f59e0b'}} />
          <strong style={{color:'#92400e'}}>وضع المحادثة البشرية مفعّل</strong>
          <span style={{color:'#a16207'}}>الأسئلة سترسل بدون أرقام أو خيارات تفاعلية. ستبدو كأنها محادثة طبيعية مع شخص حقيقي.</span>
        </div>
      )}
    </div>
  );
}

function CampaignsPage() {
  const [launching, setLaunching] = useState(false);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File|null>(null);

  const handleLaunch = () => { setLaunching(true); setTimeout(() => { setLaunching(false); setShowLaunchModal(false); setToast({message:'تم إطلاق الحملة بنجاح 🚀',type:'success'}); }, 1500); };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Campaign Management"
        title="إدارة الحملات التسويقية"
        description="رفع قوائم العملاء، اختيار قالب الاستبيان، وجدولة الإطلاق مع متابعة الاستجابة."
        action={<div className="action-row"><button className="btn secondary" onClick={downloadCampaignTemplate}><Download size={17} /> تحميل قالب Excel</button><button className="btn primary" onClick={()=>setShowLaunchModal(true)}><Send size={17} /> إطلاق حملة جديدة</button></div>}
      />
      <div className="metric-grid four">
        <MetricCard icon={Megaphone} label="الحملات النشطة" value="12" hint="2 هذا الشهر" />
        <MetricCard icon={Send} label="الرسائل المرسلة" value="45,820" hint="98% تسليم" tone="blue" />
        <MetricCard icon={Activity} label="معدل الاستجابة" value="24.5%" hint="آخر 24 ساعة" delta="+1.8%" tone="green" />
        <MetricCard icon={TrendingUp} label="عائد الاستثمار" value="3.8x" hint="مقارنة بالتكلفة" tone="amber" />
      </div>
      <div className="content-grid two">
        <Card title="إعداد حملة سريعة" subtitle="رفع قائمة واختيار قالب">
          <div className="upload-card">
            {uploadedFile ? (
              <><CheckCircle2 size={32} color="#0d9488" /><strong>تم رفع الملف بنجاح</strong><span dir="ltr">{uploadedFile.name}</span></>
            ) : (
              <><UploadCloud size={32} /><strong>رفع قائمة العملاء</strong><span>CSV / Excel — يجب أن يحتوي على: رقم الهاتف، الاسم، المدينة</span></>
            )}
            <label className="btn secondary" style={{marginTop:8,cursor:'pointer'}}>
              <Download size={14} /> اختر ملف
              <input type="file" hidden accept=".csv,.xlsx" onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]); }} />
            </label>
            <button className="btn secondary" onClick={downloadCampaignTemplate} style={{marginTop:4}}><Download size={14} /> القالب الفارغ</button>
          </div>
          <div className="form-row">
            <select defaultValue="survey1"><option value="survey1">استبيان رضا المستهلك في صنعاء</option><option value="survey2">تفضيلات الدفع</option></select>
            <button className="btn secondary"><CalendarDays size={17} /> جدولة</button>
            <button className="btn primary" onClick={()=>setShowLaunchModal(true)} disabled={!uploadedFile}>معاينة وإطلاق</button>
          </div>
        </Card>
        <Card title="أداء الحملة الزمنية" subtitle="توصيل مقابل استجابات">
          <div className="chart-md">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Bar dataKey="sent" name="توصيل الرسائل" fill="#cbd5e1" radius={[6,6,0,0]} isAnimationActive={false} /><Bar dataKey="replies" name="الاستجابات" fill="#0d9488" radius={[6,6,0,0]} isAnimationActive={false} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="الحملات النشطة والمجدولة" subtitle="قائمة تشغيلية">
        <div className="table-wrap">
          <table><thead><tr><th>اسم الحملة</th><th>المرسل</th><th>الاستجابات</th><th>المعدل</th><th>التكلفة</th><th>الحالة</th></tr></thead>
          <tbody>{campaigns.map((row) => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.sent}</td><td>{row.responses}</td><td>{row.rate}</td><td>{row.spend}</td><td><StatusBadge value={row.status} /></td></tr>)}</tbody></table>
        </div>
      </Card>
      <Modal open={showLaunchModal} onClose={()=>setShowLaunchModal(false)} title="تأكيد إطلاق الحملة">
        <p style={{marginBottom:16,color:'#64748b'}}>سيتم إرسال الاستبيان إلى {uploadedFile ? 'قائمة العملاء المرفوعة' : 'جميع العملاء النشطين'}. هل تريد المتابعة؟</p>
        <div className="action-row" style={{justifyContent:'flex-end'}}>
          <button className="btn secondary" onClick={()=>setShowLaunchModal(false)}>إلغاء</button>
          <button className="btn primary" onClick={handleLaunch} disabled={launching}>{launching?'⏳ جاري الإطلاق...':'✅ تأكيد الإطلاق'}</button>
        </div>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

function SettingsPage() {
  const [profile, setProfile] = useState({ name: 'أحمد محمد سالم', email: 'ahmed@linker-intelligence.com', org: 'لينكر ماركت للأبحاث', lang: 'العربية (Yemen)' });
  const [waba, setWaba] = useState({ provider: 'meta', apiKey: '', phoneId: '', businessId: '', webhookToken: 'linker-webhook-secret' });
  const [webhookUrl, setWebhookUrl] = useState('https://linker-agent.com/api/integrations/survey-agent/webhook');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{message:string;type:'success'|'error'}|null>(null);

  const handleSaveAll = () => {
    setSaving(true);
    fetch('/api/admin/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, waba, webhookUrl }),
    }).then(r => r.json()).then(() => {
      setSaving(false);
      setToast({ message: 'تم حفظ جميع الإعدادات بنجاح ✅', type: 'success' });
    }).catch(() => {
      setSaving(false);
      setToast({ message: 'فشل حفظ الإعدادات ❌', type: 'error' });
    });
  };

  const handleTestConnection = () => {
    setToast({ message: 'جاري اختبار الاتصال بمزود WhatsApp API...', type: 'success' });
    fetch('/api/admin/settings/test-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: waba.provider, apiKey: waba.apiKey }),
    }).then(r => r.json()).then(data => {
      setToast({ message: data.ok ? '✅ تم الاتصال بنجاح — مزود الخدمة متصل ويعمل' : '❌ فشل الاتصال — تحقق من المفتاح', type: data.ok ? 'success' : 'error' });
    }).catch(() => setToast({ message: '❌ فشل الاتصال بالخادم', type: 'error' }));
  };

  return (
    <div className="page-stack">
      <PageHeader
        kicker="Settings"
        title="الإعدادات والربط التقني"
        description="إدارة المفاتيح، مزود WhatsApp API، Webhooks، وصلاحيات الفريق."
        action={<button className="btn primary" onClick={handleSaveAll} disabled={saving}>{saving ? '⏳ جاري الحفظ...' : <><ShieldCheck size={17} /> حفظ جميع الإعدادات</>}</button>}
      />
      <div className="content-grid two">
        <Card title="الملف والمنظمة" subtitle="بيانات النظام">
          <div className="question-grid">
            <label><span>اسم المستخدم الكامل</span><input value={profile.name} onChange={e => setProfile({...profile,name:e.target.value})} /></label>
            <label><span>البريد الإلكتروني</span><input value={profile.email} onChange={e => setProfile({...profile,email:e.target.value})} /></label>
            <label><span>اسم المنظمة</span><input value={profile.org} onChange={e => setProfile({...profile,org:e.target.value})} /></label>
            <label><span>لغة الواجهة</span><select value={profile.lang} onChange={e => setProfile({...profile,lang:e.target.value})}><option>العربية (Yemen)</option><option>English</option></select></label>
          </div>
        </Card>
        <Card title="Webhook الرابط" subtitle="رابط استقبال رسائل واتساب">
          <div className="question-grid">
            <label><span>رابط Webhook URL</span><input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} dir="ltr" style={{fontFamily:'monospace',fontSize:12}} /></label>
            <label><span>رمز التحقق (Verify Token)</span><input value={waba.webhookToken} onChange={e => setWaba({...waba,webhookToken:e.target.value})} type="password" dir="ltr" /></label>
            <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
              <div style={{flex:1}}><label><span>حالة الربط</span></label><div style={{padding:12,background:'#f0fdf4',borderRadius:8,display:'flex',alignItems:'center',gap:8}}><CheckCircle2 size={18} color="#16a34a"/><span style={{color:'#16a34a',fontWeight:600}}>جاهز للاستقبال</span></div></div>
            </div>
          </div>
        </Card>
      </div>
      <Card title="مزود خدمة WhatsApp API" subtitle="إعدادات مزود خدمة واتساب للأعمال">
        <div className="question-grid">
          <label>
            <span>مزود الخدمة</span>
            <select value={waba.provider} onChange={e => setWaba({...waba,provider:e.target.value})}>
              <option value="meta">Meta Cloud API (WhatsApp Business Platform)</option>
              <option value="twilio">Twilio for WhatsApp</option>
              <option value="messagebird">MessageBird</option>
              <option value="infobip">Infobip</option>
              <option value="wati">WATI</option>
              <option value="custom">مزود مخصص (Custom API)</option>
            </select>
          </label>
          <label>
            <span>API Key / Access Token</span>
            <input value={waba.apiKey} onChange={e => setWaba({...waba,apiKey:e.target.value})} type="password" placeholder="EAAx..." dir="ltr" style={{fontFamily:'monospace',fontSize:12}} />
          </label>
          <label>
            <span>Phone Number ID</span>
            <input value={waba.phoneId} onChange={e => setWaba({...waba,phoneId:e.target.value})} placeholder="123456789..." dir="ltr" style={{fontFamily:'monospace',fontSize:12}} />
          </label>
          <label>
            <span>WhatsApp Business Account ID</span>
            <input value={waba.businessId} onChange={e => setWaba({...waba,businessId:e.target.value})} placeholder="987654321..." dir="ltr" style={{fontFamily:'monospace',fontSize:12}} />
          </label>
        </div>
        <div className="action-row" style={{marginTop:16}}>
          <button className="btn secondary" onClick={handleTestConnection}>🔗 اختبار الاتصال</button>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,background:waba.apiKey?'#f0fdf4':'#fef2f2',border:`1px solid ${waba.apiKey?'#bbf7d0':'#fecaca'}`}}>
            {waba.apiKey ? <><CheckCircle2 size={16} color="#16a34a"/><span style={{fontSize:13,color:'#16a34a'}}>تم إدخال بيانات المزود</span></> : <><span style={{fontSize:13,color:'#dc2626'}}>⚠️ لم يتم إدخال API Key بعد</span></>}
          </div>
        </div>
      </Card>
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

export default App;
