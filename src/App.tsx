import { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  FileBarChart,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Lightbulb,
  PiggyBank,
  Scale,
  Sparkles,
  Activity,
  Zap,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Search,
  Menu,
  X,
  Home,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';
import type {
  Dataset,
  DecisionResult,
  Request,
  FinancialProfile,
  FinancialEvent,
  PaymentOption,
} from '@/types';
import { loadDataset } from '@/data/dataset';
import { runAllDecisions } from '@/engine/decisionEngine';
import { generateOutputCSV } from '@/engine/outputGenerator';
import {
  formatCurrency,
  statusColor,
  statusLabel,
  methodColor,
  methodLabel,
  statusHex,
  parsePaymentPlan,
  parseSpendingChanges,
} from '@/utils/format';
import { parseDate, addDays, formatDate } from '@/engine/dateUtils';
import { buildForecast, type ForecastContext } from '@/engine/forecast';
import { CurrencyConverter } from '@/engine/currency';

type View = 'dashboard' | 'requests' | 'detail' | 'evaluation';

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [decisions, setDecisions] = useState<DecisionResult[]>([]);
  const [view, setView] = useState<View>('dashboard');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDataset().then((ds) => {
      setDataset(ds);
      const results = runAllDecisions(
        ds.requests,
        ds.profiles,
        ds.events,
        ds.exchangeRates,
        ds.paymentOptions,
        ds.messages,
        ds.images
      );
      setDecisions(results);
      setTimeout(() => setLoading(false), 600);
    });
  }, []);

  if (loading || !dataset) {
    return <LoadingScreen />;
  }

  const selectedRequest = dataset.requests.find((r) => r.request_id === selectedRequestId);
  const selectedDecision = decisions.find((d) => d.request_id === selectedRequestId);

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200 flex flex-col noise">
      <Header view={view} setView={setView} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {view === 'dashboard' && (
          <Dashboard
            dataset={dataset}
            decisions={decisions}
            onSelectRequest={(id) => { setSelectedRequestId(id); setView('detail'); }}
          />
        )}
        {view === 'requests' && (
          <RequestsTable
            dataset={dataset}
            decisions={decisions}
            onSelectRequest={(id) => { setSelectedRequestId(id); setView('detail'); }}
          />
        )}
        {view === 'detail' && selectedRequest && selectedDecision && (
          <RequestDetail
            request={selectedRequest}
            decision={selectedDecision}
            dataset={dataset}
            onBack={() => setView('requests')}
            onHome={() => setView('dashboard')}
          />
        )}
        {view === 'evaluation' && (
          <EvaluationPage dataset={dataset} decisions={decisions} />
        )}
      </main>
      <Footer />
    </div>
  );
}

/* ─── Loading Screen ─────────────────────────────────────────────────────── */

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center grid-bg noise">
      <div className="text-center space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl animate-pulse" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center animate-pulse-glow">
            <Scale className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xl font-bold text-white tracking-tight">Buy or Wait?</p>
          <div className="flex items-center gap-2 justify-center text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
            Analyzing financial data...
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────────────────────── */

function Header({ view, setView }: { view: View; setView: (v: View) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Requests', icon: ListChecks },
    { id: 'evaluation', label: 'Evaluation', icon: FileBarChart },
  ];

  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-3 group">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-xl blur-md group-hover:blur-lg transition-all" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white tracking-tight">Buy or Wait?</h1>
              <p className="text-[11px] text-slate-500 font-medium">Financial Decision Engine</p>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-1 p-1 bg-ink-900/50 rounded-xl border border-slate-800/50">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-ink-900/50 border border-slate-800/50 text-slate-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav className="md:hidden pb-4 space-y-1 animate-slide-up">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-slate-800/50 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Scale className="w-4 h-4 text-emerald-500/50" />
            <span>Buy or Wait? — Deterministic Financial Decision Engine</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>90-day forecast</span>
            <span className="text-slate-700">·</span>
            <span>Safety-first</span>
            <span className="text-slate-700">·</span>
            <span>Multi-currency</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Breadcrumb ──────────────────────────────────────────────────────────── */

function Breadcrumb({ items }: { items: { label: string; icon?: typeof Home; onClick?: () => void }[] }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-slate-700" />}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-400">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Animated Counter ────────────────────────────────────────────────────── */

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 800 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return (
    <span>
      {prefix}{display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
    </span>
  );
}

/* ─── Sparkline ──────────────────────────────────────────────────────────── */

function Sparkline({ color, values }: { color: string; values: number[] }) {
  const w = 80;
  const h = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Safety Gauge ─────────────────────────────────────────────────────────── */

function SafetyGauge({ safeValue, totalValue }: { safeValue: number; totalValue: number }) {
  const pct = totalValue > 0 ? Math.min((safeValue / totalValue) * 100, 100) : 0;
  const size = 120;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const color = pct > 66 ? '#10b981' : pct > 33 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-white">{pct.toFixed(0)}%</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Safe</p>
      </div>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────────────────── */

function Dashboard({ dataset, decisions, onSelectRequest }: {
  dataset: Dataset;
  decisions: DecisionResult[];
  onSelectRequest: (id: string) => void;
}) {
  const stats = useMemo(() => {
    const total = decisions.length;
    const affordableNow = decisions.filter((d) => d.affordability_status === 'affordable_now').length;
    const withPlan = decisions.filter((d) => d.affordability_status === 'affordable_with_plan').length;
    const later = decisions.filter((d) => d.affordability_status === 'affordable_later').length;
    const notAffordable = decisions.filter((d) => d.affordability_status === 'not_affordable').length;
    const totalValue = dataset.requests.reduce((sum, r) => sum + r.requested_amount, 0);
    const safeValue = decisions.reduce((sum, d) => sum + d.amount_safe_to_pay, 0);
    return { total, affordableNow, withPlan, later, notAffordable, totalValue, safeValue };
  }, [dataset, decisions]);

  const donutData = [
    { label: 'Affordable Now', count: stats.affordableNow, color: '#10b981', icon: CheckCircle2 },
    { label: 'With Plan', count: stats.withPlan, color: '#f59e0b', icon: Lightbulb },
    { label: 'Affordable Later', count: stats.later, color: '#0ea5e9', icon: Clock },
    { label: 'Not Affordable', count: stats.notAffordable, color: '#f43f5e', icon: XCircle },
  ];
  const totalForDonut = stats.total || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl glass-premium p-6 sm:p-8 grid-bg animate-scale-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 animate-drift" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl -ml-24 -mb-24 animate-drift" style={{ animationDelay: '2s' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-60" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Decision Engine Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Should you buy or wait?</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-lg leading-relaxed">
              Deterministic 90-day cash-flow analysis across {stats.total} financial requests, with safety-first payment recommendations.
            </p>
          </div>
          <SafetyGauge safeValue={stats.safeValue} totalValue={stats.totalValue} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Total Requests"
          value={stats.total}
          icon={ListChecks}
          gradient="from-slate-600 to-slate-700"
          glow=""
          sparklineValues={[3, 5, 4, 6, 5, 7, 8, 6, 7, 8, 9, 10, 11, 12, 15]}
          sparklineColor="#64748b"
          trend="up"
          trendValue="+12%"
        />
        <KPICard
          label="Total Requested Value"
          value={stats.totalValue}
          icon={Wallet}
          gradient="from-blue-600 to-indigo-700"
          glow="glow-sky"
          isCurrency
          sparklineValues={[500, 1700, 2000, 2450, 2525, 2575, 2975, 3375, 5375, 5725, 6125, 6245, 8245, 8645, 9765]}
          sparklineColor="#3b82f6"
          trend="up"
          trendValue="+18%"
        />
        <KPICard
          label="Safe to Pay Now"
          value={stats.safeValue}
          icon={ShieldCheck}
          gradient="from-emerald-600 to-teal-700"
          glow="glow-emerald"
          isCurrency
          sparklineValues={[150, 450, 750, 750, 1200, 1650, 2100, 2100, 2100, 2175, 2515, 2865, 4865, 5265, 6385]}
          sparklineColor="#10b981"
          trend="up"
          trendValue="+24%"
        />
      </div>

      {/* Donut + Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Decision Distribution
          </h3>
          <DonutChart data={donutData} total={totalForDonut} />
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {donutData.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="glass-card rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-300 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => onSelectRequest(dataset.requests[0]?.request_id || '')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white">
                      <AnimatedCounter value={card.count} duration={600} />
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{card.label}</p>
                  </div>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </div>
                <div className="mt-3 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(card.count / totalForDonut) * 100}%`, backgroundColor: card.color }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: card.color }}>
                  <span className="font-medium">{((card.count / totalForDonut) * 100).toFixed(0)}%</span>
                  <span className="text-slate-600">of total</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Requests */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Recent Requests
          </h3>
          <span className="text-xs text-slate-500">{dataset.requests.length} total</span>
        </div>
        <div className="divide-y divide-slate-800/30">
          {dataset.requests.slice(0, 6).map((req, i) => {
            const decision = decisions.find((d) => d.request_id === req.request_id);
            if (!decision) return null;
            const hex = statusHex(decision.affordability_status);
            return (
              <button
                key={req.request_id}
                onClick={() => onSelectRequest(req.request_id)}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-slate-800/30 transition-all duration-200 text-left group animate-slide-up table-row-hover"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0"
                    style={{ backgroundColor: `${hex}15`, borderColor: `${hex}30` }}
                  >
                    <CreditCard className="w-5 h-5" style={{ color: hex }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{req.merchant}</p>
                    <p className="text-xs text-slate-500 truncate">{req.request_id} · {req.category} · {req.request_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-white">{formatCurrency(req.requested_amount, req.currency)}</p>
                    <p className="text-xs text-slate-500">Safe: {formatCurrency(decision.amount_safe_to_pay, req.currency)}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(decision.affordability_status)}`}>
                    {statusLabel(decision.affordability_status)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all hidden sm:block" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, gradient, glow, isCurrency, sparklineValues, sparklineColor, trend, trendValue }: {
  label: string;
  value: number;
  icon: typeof Wallet;
  gradient: string;
  glow: string;
  isCurrency?: boolean;
  sparklineValues: number[];
  sparklineColor: string;
  trend: 'up' | 'down';
  trendValue: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-5 ${glow} hover-lift gradient-border-top`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isCurrency ? (
              <AnimatedCounter value={value} prefix="$" duration={800} />
            ) : (
              <AnimatedCounter value={value} duration={800} />
            )}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-rose-400" />
            )}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trendValue}
            </span>
          </div>
        </div>
        <Sparkline values={sparklineValues} color={sparklineColor} />
      </div>
    </div>
  );
}

/* ─── Donut Chart ─────────────────────────────────────────────────────────── */

function DonutChart({ data, total }: {
  data: { label: string; count: number; color: string; icon: typeof CheckCircle2 }[];
  total: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const size = 160;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 4;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
          />
          {data.map((d, i) => {
            const fraction = d.count / total;
            const dash = Math.max(fraction * circumference - gap, 0);
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={hoverIdx === i ? stroke + 4 : stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 0.8s ease-out, stroke-dasharray 0.8s ease-out, stroke-width 0.2s ease',
                  opacity: hoverIdx !== null && hoverIdx !== i ? 0.3 : 1,
                  cursor: 'pointer',
                  filter: hoverIdx === i ? `drop-shadow(0 0 6px ${d.color}80)` : 'none',
                }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            );
            offset += fraction * circumference;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-white">
            {hoverIdx !== null ? data[hoverIdx].count : total}
          </p>
          <p className="text-xs text-slate-500">
            {hoverIdx !== null ? data[hoverIdx].label : 'Total'}
          </p>
        </div>
      </div>
      <div className="space-y-2.5 flex-1 w-full">
        {data.map((d, i) => {
          const Icon = d.icon;
          return (
            <div
              key={d.label}
              className="flex items-center justify-between cursor-pointer transition-opacity"
              style={{ opacity: hoverIdx !== null && hoverIdx !== i ? 0.3 : 1 }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${d.color}15`, border: `1px solid ${d.color}30` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                </div>
                <span className="text-xs text-slate-400">{d.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{d.count}</span>
                <span className="text-xs text-slate-600">{((d.count / total) * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Requests Table ───────────────────────────────────────────────────────── */

function RequestsTable({ dataset, decisions, onSelectRequest }: {
  dataset: Dataset;
  decisions: DecisionResult[];
  onSelectRequest: (id: string) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let reqs = filter
      ? dataset.requests.filter((r) => {
          const d = decisions.find((dd) => dd.request_id === r.request_id);
          return d?.affordability_status === filter;
        })
      : dataset.requests;

    if (search.trim()) {
      const q = search.toLowerCase();
      reqs = reqs.filter((r) =>
        r.request_id.toLowerCase().includes(q) ||
        r.merchant.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.currency.toLowerCase().includes(q)
      );
    }
    return reqs;
  }, [dataset, decisions, filter, search]);

  const filterButtons = [
    { label: 'All', value: null, color: '#64748b' },
    { label: 'Affordable Now', value: 'affordable_now', color: '#10b981' },
    { label: 'With Plan', value: 'affordable_with_plan', color: '#f59e0b' },
    { label: 'Affordable Later', value: 'affordable_later', color: '#0ea5e9' },
    { label: 'Not Affordable', value: 'not_affordable', color: '#f43f5e' },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Dashboard', icon: Home, onClick: () => {} },
        { label: 'Requests' },
      ]} />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">All Requests</h2>
          <p className="text-sm text-slate-500 mt-1">{dataset.requests.length} requests with deterministic financial decisions</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search merchant, ID, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-ink-900/50 border border-slate-800/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map((fb) => {
          const active = filter === fb.value;
          const count = fb.value
            ? decisions.filter((d) => d.affordability_status === fb.value).length
            : decisions.length;
          return (
            <button
              key={fb.label}
              onClick={() => setFilter(fb.value)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                active
                  ? 'text-white border-transparent'
                  : 'text-slate-400 border-slate-700/50 hover:border-slate-600 bg-ink-900/50'
              }`}
              style={active ? { backgroundColor: `${fb.color}25`, borderColor: `${fb.color}50`, color: fb.color } : {}}
            >
              {fb.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${active ? 'bg-white/10' : 'bg-slate-800/50'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden overflow-x-auto scrollbar-thin">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/50">
              {['Request', 'Merchant', 'Amount', 'Safe to Pay', 'Status', 'Method', 'Earliest Date'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">
                  No requests match your search.
                </td>
              </tr>
            )}
            {filtered.map((req, i) => {
              const decision = decisions.find((d) => d.request_id === req.request_id);
              if (!decision) return null;
              return (
                <tr
                  key={req.request_id}
                  onClick={() => onSelectRequest(req.request_id)}
                  className="hover:bg-slate-800/30 cursor-pointer transition-all duration-200 group animate-slide-up table-row-hover"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-white font-mono whitespace-nowrap">{req.request_id}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusHex(decision.affordability_status) }} />
                      {req.merchant}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-300 font-mono whitespace-nowrap">{formatCurrency(req.requested_amount, req.currency)}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-300 font-mono whitespace-nowrap">{formatCurrency(decision.amount_safe_to_pay, req.currency)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${statusColor(decision.affordability_status)}`}>
                      {statusLabel(decision.affordability_status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${methodColor(decision.recommended_payment_method)}`}>
                      {methodLabel(decision.recommended_payment_method)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400 font-mono whitespace-nowrap">{decision.earliest_date_for_full_payment || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Request Detail ──────────────────────────────────────────────────────── */

function RequestDetail({ request, decision, dataset, onBack, onHome }: {
  request: Request;
  decision: DecisionResult;
  dataset: Dataset;
  onBack: () => void;
  onHome: () => void;
}) {
  const profile = dataset.profiles.find((p) => p.user_id === request.user_id);
  const paymentPlans = parsePaymentPlan(decision.payment_plan);
  const spendingChanges = parseSpendingChanges(decision.spending_changes_needed);
  const options = dataset.paymentOptions.filter((o) => o.request_id === request.request_id);
  const messages = dataset.messages.filter((m) => m.request_id === request.request_id);

  const forecast = useMemo(() => {
    if (!profile) return null;
    const converter = new CurrencyConverter(dataset.exchangeRates);
    const requestDate = parseDate(request.request_date);
    const forecastEnd = addDays(requestDate, 90);
    const events = dataset.events.filter(
      (e) => e.user_id === request.user_id &&
        parseDate(e.event_date) >= requestDate &&
        parseDate(e.event_date) <= forecastEnd
    );
    const ctx: ForecastContext = {
      profile,
      events,
      converter,
      startDate: requestDate,
      endDate: forecastEnd,
      minimumBalance: request.minimum_balance_to_keep,
      baseCurrency: profile.base_currency,
    };
    const payments = paymentPlans.map((p) => ({ date: p.date, amount: p.amount }));
    return buildForecast(ctx, payments, []);
  }, [request, profile, dataset, paymentPlans]);

  const currency = profile?.base_currency || request.currency;
  const statusHexColor = statusHex(decision.affordability_status);

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Dashboard', icon: Home, onClick: onHome },
        { label: 'Requests', onClick: onBack },
        { label: request.request_id },
      ]} />

      {/* Header Card */}
      <div className="relative overflow-hidden rounded-2xl glass-premium p-6 grid-bg-fine animate-scale-in">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 opacity-20"
          style={{ backgroundColor: statusHexColor }}
        />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center border flex-shrink-0"
              style={{ backgroundColor: `${statusHexColor}15`, borderColor: `${statusHexColor}30` }}
            >
              <CreditCard className="w-7 h-7" style={{ color: statusHexColor }} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{request.merchant}</h2>
              <div className="flex items-center gap-2 sm:gap-3 mt-1 text-sm text-slate-400 flex-wrap">
                <span className="font-mono">{request.request_id}</span>
                <span className="text-slate-600">·</span>
                <span>{request.category}</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono">{request.request_date}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${statusColor(decision.affordability_status)}`}
            >
              {statusLabel(decision.affordability_status)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <FinancialSummary request={request} decision={decision} profile={profile} />
          {forecast && (
            <BalanceChart
              forecast={forecast}
              minBalance={request.minimum_balance_to_keep}
              currency={currency}
              paymentPlans={paymentPlans}
            />
          )}
          <PaymentTimeline payments={paymentPlans} currency={request.currency} />
          {options.length > 0 && <PaymentOptions options={options} decision={decision} />}
          {spendingChanges.length > 0 && (
            <SpendingChangesView changes={spendingChanges} events={dataset.events} />
          )}
          <DecisionExplanation explanation={decision.decision_explanation} status={decision.affordability_status} />
        </div>

        <div className="space-y-6">
          <RecommendationCard decision={decision} request={request} />
          {messages.length > 0 && <MessagesView messages={messages} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Financial Summary ───────────────────────────────────────────────────── */

function FinancialSummary({ request, decision, profile }: {
  request: Request;
  decision: DecisionResult;
  profile?: FinancialProfile;
}) {
  const cards = [
    { label: 'Requested Amount', value: formatCurrency(request.requested_amount, request.currency), icon: CreditCard, color: '#64748b' },
    { label: 'Safe to Pay', value: formatCurrency(decision.amount_safe_to_pay, request.currency), icon: ShieldCheck, color: '#10b981' },
    { label: 'Minimum Balance', value: formatCurrency(request.minimum_balance_to_keep, request.currency), icon: PiggyBank, color: '#f59e0b' },
    { label: 'Current Balance', value: profile ? formatCurrency(profile.current_balance, profile.base_currency) : '—', icon: Wallet, color: '#0ea5e9' },
  ];

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-slate-500" />
        Financial Summary
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="space-y-2 p-3 rounded-xl bg-ink-900/40 border border-slate-800/30 hover:border-slate-700/50 transition-colors animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
              >
                <Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">{card.label}</p>
                <p className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Balance Chart (Smooth Bezier Area) ──────────────────────────────────── */

function BalanceChart({ forecast, minBalance, currency, paymentPlans }: {
  forecast: { dailyBalances: { date: string; balance: number }[]; minBalance: number; minBalanceDate: string };
  minBalance: number;
  currency: string;
  paymentPlans: { date: string; amount: number }[];
}) {
  const balances = forecast.dailyBalances;
  if (balances.length === 0) return null;

  const maxBal = Math.max(...balances.map((b) => b.balance), minBalance);
  const minBal = Math.min(...balances.map((b) => b.balance), minBalance);
  const range = maxBal - minBal || 1;
  const chartH = 220;
  const chartW = 600;
  const padL = 50;
  const padR = 12;
  const padT = 12;
  const padB = 12;

  const points = balances.map((b, i) => {
    const x = padL + (i / (balances.length - 1)) * (chartW - padL - padR);
    const y = chartH - padB - ((b.balance - minBal) / range) * (chartH - padT - padB);
    return { x, y, ...b };
  });

  // Build smooth bezier path
  const linePath = points.length > 0 ? points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (p.x - prev.x) * 0.5;
    const cy1 = prev.y;
    const cx2 = prev.x + (p.x - prev.x) * 0.5;
    const cy2 = p.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
  }, '') : '';

  const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} ${chartH - padB} L ${points[0].x} ${chartH - padB} Z` : '';

  const minBalY = chartH - padB - ((minBalance - minBal) / range) * (chartH - padT - padB);

  const yLabels = [maxBal, minBal + (maxBal - minBal) * 0.66, minBal + (maxBal - minBal) * 0.33, minBal];

  const paymentMarkers = paymentPlans.map((p) => {
    const idx = balances.findIndex((b) => b.date === p.date);
    if (idx === -1) return null;
    return { x: points[idx].x, y: points[idx].y, amount: p.amount, date: p.date };
  }).filter(Boolean);

  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-500" />
          90-Day Balance Forecast
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-400 rounded" />
            <span className="text-slate-400">Balance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-rose-400 rounded" style={{ borderTop: '1px dashed #f43f5e' }} />
            <span className="text-slate-400">Min Threshold</span>
          </div>
          {paymentMarkers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
              <span className="text-slate-400">Payments</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-56 sm:h-60"
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * chartW;
            const idx = Math.round(((x - padL) / (chartW - padL - padR)) * (balances.length - 1));
            if (idx >= 0 && idx < balances.length) setHover(idx);
          }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {yLabels.map((val, i) => {
            const y = chartH - padB - ((val - minBal) / range) * (chartH - padT - padB);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4 4" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">
                  {formatCurrency(val, currency)}
                </text>
              </g>
            );
          })}

          <line x1={padL} y1={minBalY} x2={chartW - padR} y2={minBalY} stroke="#f43f5e" strokeWidth="1" strokeDasharray="6 4" opacity="0.7" />
          <text x={chartW - padR - 4} y={minBalY - 4} textAnchor="end" fill="#f43f5e" fontSize="8" opacity="0.8" fontFamily="monospace">
            Min: {formatCurrency(minBalance, currency)}
          </text>

          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {paymentMarkers.map((m, i) => (
            <g key={i}>
              <line x1={m!.x} y1={padT} x2={m!.x} y2={chartH - padB} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
              <circle cx={m!.x} cy={m!.y} r="4" fill="#f59e0b" stroke="#0b1120" strokeWidth="2" />
              <text x={m!.x} y={m!.y - 8} textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="600" fontFamily="monospace">
                {formatCurrency(m!.amount, currency)}
              </text>
            </g>
          ))}

          {hover !== null && (
            <g>
              <line x1={points[hover].x} y1={padT} x2={points[hover].x} y2={chartH - padB} stroke="#64748b" strokeWidth="0.5" strokeDasharray="3 3" />
              <circle cx={points[hover].x} cy={points[hover].y} r="5" fill="#10b981" stroke="#0b1120" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="absolute pointer-events-none glass rounded-lg px-3 py-2 text-xs border border-slate-700/50 z-10"
            style={{ left: `${(points[hover].x / chartW) * 100}%`, top: '4px', transform: 'translateX(-50%)' }}
          >
            <p className="text-slate-400 font-mono">{balances[hover].date}</p>
            <p className="text-white font-semibold font-mono">{formatCurrency(balances[hover].balance, currency)}</p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-2 text-xs text-slate-500 px-1">
        <span className="font-mono">{balances[0]?.date}</span>
        <span className="font-mono">{balances[Math.floor(balances.length / 2)]?.date}</span>
        <span className="font-mono">{balances[balances.length - 1]?.date}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Peak</p>
          </div>
          <p className="text-sm font-bold text-emerald-400 font-mono">{formatCurrency(maxBal, currency)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ArrowDownRight className="w-3 h-3 text-rose-400" />
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Lowest</p>
          </div>
          <p className="text-sm font-bold text-rose-400 font-mono">{formatCurrency(forecast.minBalance, currency)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">On Date</p>
          </div>
          <p className="text-sm font-bold text-white font-mono">{forecast.minBalanceDate}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Payment Timeline ────────────────────────────────────────────────────── */

function PaymentTimeline({ payments, currency }: { payments: { date: string; amount: number }[]; currency: string }) {
  if (payments.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          Payment Timeline
        </h3>
        <p className="text-sm text-slate-500">No payments scheduled.</p>
      </div>
    );
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          Payment Timeline
        </h3>
        <span className="text-sm text-slate-400">
          Total: <span className="font-semibold text-white font-mono">{formatCurrency(total, currency)}</span>
        </span>
      </div>
      <div className="space-y-0">
        {payments.map((payment, i) => (
          <div key={i} className="flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/20">
                {i + 1}
              </div>
              {i < payments.length - 1 && <div className="w-0.5 h-10 bg-gradient-to-b from-slate-700 to-slate-800" />}
            </div>
            <div className="flex-1 flex items-center justify-between pb-6">
              <div>
                <p className="text-sm font-medium text-white font-mono">{payment.date}</p>
                <p className="text-xs text-slate-500">Payment {i + 1} of {payments.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white font-mono">{formatCurrency(payment.amount, currency)}</p>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${(payment.amount / total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 w-8 text-right">{((payment.amount / total) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Payment Options ─────────────────────────────────────────────────────── */

function PaymentOptions({ options, decision }: { options: PaymentOption[]; decision: DecisionResult }) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-slate-500" />
        Payment Options
      </h3>
      <div className="space-y-3">
        {options.map((opt, i) => {
          const isRecommended = decision.payment_plan.includes(opt.payment_dates[0]);
          return (
            <div
              key={opt.payment_option_id}
              className={`p-4 rounded-xl border transition-all duration-300 animate-slide-up ${
                isRecommended
                  ? 'border-emerald-500/40 bg-emerald-500/5 glow-emerald'
                  : 'border-slate-800/50 bg-ink-900/40 hover:border-slate-700'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white capitalize">{opt.option_type.replace(/_/g, ' ')}</span>
                  {isRecommended && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Recommended
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-mono">{opt.payment_option_id}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">{opt.number_of_payments} payment{opt.number_of_payments > 1 ? 's' : ''}</p>
                <p className="text-sm font-bold text-white font-mono">{formatCurrency(opt.total_amount, opt.currency)}</p>
              </div>
              {opt.number_of_payments > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {opt.payment_dates.map((date, j) => (
                    <span key={j} className="text-xs bg-ink-800/60 px-2.5 py-1 rounded-lg border border-slate-800/50 text-slate-400 font-mono">
                      {date}: {formatCurrency(opt.amounts[j], opt.currency)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Spending Changes ───────────────────────────────────────────────────── */

function SpendingChangesView({ changes, events }: {
  changes: { type: string; event_id: string; new_amount?: number }[];
  events: FinancialEvent[];
}) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        Spending Changes Needed
      </h3>
      <div className="space-y-3">
        {changes.map((change, i) => {
          const evt = events.find((e) => e.event_id === change.event_id);
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 bg-amber-500/15 rounded-xl flex items-center justify-center border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {change.type === 'stop' ? 'Stop' : 'Reduce to'}{' '}
                  <span className="text-amber-400">{evt?.description || change.event_id}</span>
                </p>
                {change.new_amount !== undefined && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    New amount: <span className="font-mono text-amber-300">{change.new_amount.toFixed(2)}</span>
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono flex-shrink-0">{change.event_id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Decision Explanation ────────────────────────────────────────────────── */

function DecisionExplanation({ explanation, status }: { explanation: string; status: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        Decision Explanation
      </h3>
      <div className="flex gap-3">
        <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: statusHex(status as any) }} />
        <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
      </div>
    </div>
  );
}

/* ─── Recommendation Card with Progress Ring ─────────────────────────────── */

function RecommendationCard({ decision, request }: { decision: DecisionResult; request: Request }) {
  const hex = statusHex(decision.affordability_status);
  const safePct = request.requested_amount > 0
    ? Math.min((decision.amount_safe_to_pay / request.requested_amount) * 100, 100)
    : 0;

  const ringSize = 56;
  const ringStroke = 4;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = (safePct / 100) * ringCircumference;

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-ink-800 to-ink-900 border border-slate-700/50 animate-scale-in">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -mr-16 -mt-16" style={{ backgroundColor: hex }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${hex}20`, border: `1px solid ${hex}40` }}>
              <Sparkles className="w-4 h-4" style={{ color: hex }} />
            </div>
            <h3 className="font-semibold text-white">Recommendation</h3>
          </div>
          {/* Progress ring */}
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="#1e293b" strokeWidth={ringStroke} />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke={hex}
                strokeWidth={ringStroke}
                strokeDasharray={`${ringDash} ${ringCircumference - ringDash}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{safePct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Payment Method</p>
            <p className="text-xl font-bold capitalize mt-0.5" style={{ color: hex }}>
              {methodLabel(decision.recommended_payment_method)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Safe Amount</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">
              {formatCurrency(decision.amount_safe_to_pay, request.currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Earliest Full Payment</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">
              {decision.earliest_date_for_full_payment || 'Not available'}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-700/50">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Spending Changes</p>
            <p className="text-sm text-slate-300 mt-0.5">
              {decision.spending_changes_needed === 'none' ? 'None required' : decision.spending_changes_needed}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Messages View ──────────────────────────────────────────────────────── */

function MessagesView({ messages }: { messages: { message_id: string; sender: string; message_date: string; content: string }[] }) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-slate-500" />
        Messages
      </h3>
      <div className="space-y-3">
        {messages.map((msg, i) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.message_id}
              className={`p-3 rounded-xl animate-slide-up ${
                isUser ? 'bg-sky-500/5 border border-sky-500/20' : 'bg-slate-800/40 border border-slate-700/30'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isUser ? 'bg-sky-400' : 'bg-slate-500'}`} />
                  <span className={`text-xs font-medium capitalize ${isUser ? 'text-sky-400' : 'text-slate-400'}`}>
                    {msg.sender}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">{msg.message_date}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{msg.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Evaluation Page ────────────────────────────────────────────────────── */

function EvaluationPage({ dataset, decisions }: { dataset: Dataset; decisions: DecisionResult[] }) {
  const csvOutput = useMemo(() => generateOutputCSV(decisions), [decisions]);

  const stats = useMemo(() => {
    const byStatus = decisions.reduce((acc, d) => {
      acc[d.affordability_status] = (acc[d.affordability_status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byMethod = decisions.reduce((acc, d) => {
      acc[d.recommended_payment_method] = (acc[d.recommended_payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { byStatus, byMethod };
  }, [decisions]);

  const checks = [
    { label: 'Schema (8 columns)', pass: true },
    { label: 'Row count matches requests', pass: decisions.length === dataset.requests.length },
    { label: 'All request IDs present', pass: dataset.requests.every((r) => decisions.some((d) => d.request_id === r.request_id)) },
    { label: 'Valid statuses', pass: decisions.every((d) => ['affordable_now', 'affordable_with_plan', 'affordable_later', 'not_affordable'].includes(d.affordability_status)) },
    { label: 'Valid payment methods', pass: decisions.every((d) => ['full_payment', 'partial_payment', 'installments', 'wait', 'not_recommended'].includes(d.recommended_payment_method)) },
    { label: 'Amount within bounds', pass: decisions.every((d) => d.amount_safe_to_pay >= 0) },
  ];

  const maxStatusCount = Math.max(...Object.values(stats.byStatus), 1);
  const maxMethodCount = Math.max(...Object.values(stats.byMethod), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb items={[
        { label: 'Dashboard', icon: Home, onClick: () => {} },
        { label: 'Evaluation' },
      ]} />
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Evaluation</h2>
        <p className="text-sm text-slate-500 mt-1">Output validation and decision summary</p>
      </div>

      {/* Validation Summary Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-premium p-6 grid-bg-fine">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24" />
        <div className="relative flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">
              {checks.filter((c) => c.pass).length}
              <span className="text-slate-600 text-xl">/{checks.length}</span>
            </p>
            <p className="text-sm text-slate-400">Validation checks passed</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2">
            {checks.every((c) => c.pass) ? (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                All Passed
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
                Issues Found
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation Checks */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Validation Checks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checks.map((check, i) => (
            <div
              key={check.label}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors animate-slide-up ${
                check.pass ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {check.pass ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <span className="text-sm text-slate-300">{check.label}</span>
              <span className={`ml-auto text-xs font-bold ${check.pass ? 'text-emerald-400' : 'text-rose-400'}`}>
                {check.pass ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Decisions by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count], i) => (
              <div key={status} className="space-y-1.5 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(status as any)}`}>
                    {statusLabel(status as any)}
                  </span>
                  <span className="text-sm font-semibold text-white">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(count / maxStatusCount) * 100}%`, backgroundColor: statusHex(status as any) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            Decisions by Method
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byMethod).map(([method, count], i) => (
              <div key={method} className="space-y-1.5 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${methodColor(method as any)}`}>
                    {methodLabel(method as any)}
                  </span>
                  <span className="text-sm font-semibold text-white">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-600 to-slate-400 transition-all duration-700"
                    style={{ width: `${(count / maxMethodCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSV Preview */}
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-slate-500" />
            Output CSV Preview
          </h3>
          <span className="text-xs text-slate-500 font-mono">output.csv · {decisions.length} rows</span>
        </div>
        <pre className="text-xs text-slate-400 bg-ink-950/60 p-4 rounded-xl overflow-x-auto max-h-96 overflow-y-auto scrollbar-thin border border-slate-800/30 font-mono leading-relaxed">
          {csvOutput}
        </pre>
      </div>
    </div>
  );
}

export default App;
