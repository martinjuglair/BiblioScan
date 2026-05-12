import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@infrastructure/supabase/client";

/**
 * Admin dashboard at `/admin`. Calls a single Supabase RPC
 * (`admin_dashboard_metrics`) that returns every metric as one JSON
 * blob — keeps the round-trip count to 1 per period change, and the
 * RPC enforces the admin email guard server-side so we don't have to
 * trust the client.
 *
 * Layout (top → bottom):
 *   1. Header (title + period selector + refresh + CSV export)
 *   2. KPI strip (4 cards: users / books / groups / reads)
 *   3. Growth chart (stacked area — users / books / groups / reads per day)
 *   4. Engagement gauges (% of users with ≥1 book / group / read)
 *   5. Top users / Top groups / Top books tables
 *   6. Waitlist conversion card
 */

type Period = 7 | 30 | 90 | 365;

interface DailyPoint {
  day: string;
  users: number;
  books: number;
  groups: number;
  reads: number;
}

interface TopUser {
  id: string;
  display_name: string;
  email: string;
  book_count: number;
  read_count: number;
}

interface TopGroup {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
  member_count: number;
  book_count: number;
}

interface TopBook {
  isbn: string;
  title: string | null;
  cover_url: string | null;
  add_count: number;
  read_count: number;
}

interface Metrics {
  totals: {
    users: number;
    books: number;
    groups: number;
    reads: number;
    group_members: number;
    waitlist: number;
  };
  period: {
    days: number;
    new_users: number;
    new_books: number;
    new_groups: number;
    new_reads: number;
    new_waitlist: number;
  };
  daily: DailyPoint[];
  top_users: TopUser[] | null;
  top_groups: TopGroup[] | null;
  top_books: TopBook[] | null;
  engagement: {
    total_users: number;
    with_book: number;
    with_group: number;
    with_read_book: number;
  };
  waitlist: {
    total: number;
    converted: number;
  };
  generated_at: string;
}

interface AdminDashboardProps {
  onExit: () => void;
}

// Where we cache the password for the session. Cleared on browser
// tab close, on logout, and on Invalid-password errors.
const SESSION_KEY = "ploom-admin-password";

const PERIODS: { value: Period; label: string }[] = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 365, label: "1 an" },
];

// Reusable palette — picked to match the brand gradient (orange → pink → yellow)
const COLORS = {
  users: "#FB6538",
  books: "#FF3C7A",
  groups: "#7A5AF8",
  reads: "#FFC83D",
  muted: "#94A3B8",
};

export function AdminDashboard({ onExit }: AdminDashboardProps) {
  const [password, setPassword] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(SESSION_KEY);
  });
  const [period, setPeriod] = useState<Period>(30);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const signOut = useCallback(() => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setPassword(null);
    setMetrics(null);
    setError(null);
  }, []);

  const loadMetrics = useCallback(
    async (days: Period, pwd: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc(
          "admin_dashboard_metrics",
          { p_password: pwd, period_days: days }
        );
        if (rpcError) throw rpcError;
        setMetrics(data as Metrics);
        setLastRefreshedAt(new Date());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Wrong password → clear cache so we re-prompt
        if (msg.toLowerCase().includes("invalid password")) {
          window.sessionStorage.removeItem(SESSION_KEY);
          setPassword(null);
          setError("Mot de passe incorrect.");
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (password) loadMetrics(period, password);
  }, [period, password, loadMetrics]);

  const handlePasswordSubmit = useCallback((pwd: string) => {
    window.sessionStorage.setItem(SESSION_KEY, pwd);
    setPassword(pwd);
  }, []);

  // Not authenticated yet → show password prompt
  if (!password) {
    return (
      <AdminLogin
        onSubmit={handlePasswordSubmit}
        onExit={onExit}
        error={error}
      />
    );
  }

  const exportCSV = useCallback(() => {
    if (!metrics) return;
    const lines: string[] = [];
    lines.push("date,users,books,groups,reads");
    for (const d of metrics.daily) {
      lines.push(`${d.day},${d.users},${d.books},${d.groups},${d.reads}`);
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `ploom-metrics-${today}-${period}d.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics, period]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="text-slate-400 hover:text-slate-700 transition text-sm"
              aria-label="Retour à l'app"
            >
              ← Retour
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Ploom · Admin
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Session privée
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector value={period} onChange={setPeriod} />
            <button
              onClick={() => password && loadMetrics(period, password)}
              disabled={loading || !password}
              className="px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              {loading ? "..." : "↻ Rafraîchir"}
            </button>
            <button
              onClick={exportCSV}
              disabled={!metrics}
              className="px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              ⬇ CSV
            </button>
            <button
              onClick={signOut}
              className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
            >
              Verrouiller
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-lg p-4 text-sm">
            <strong className="font-semibold">Erreur :</strong> {error}
            {error.toLowerCase().includes("function") && (
              <p className="mt-2 text-rose-700">
                Vérifie que la fonction SQL{" "}
                <code>admin_dashboard_metrics</code> est bien installée sur
                Supabase (script <code>supabase/admin-dashboard.sql</code>).
              </p>
            )}
          </div>
        )}

        {/* KPI strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KPI
            label="Utilisateurs"
            value={metrics?.totals.users ?? null}
            delta={metrics?.period.new_users ?? null}
            deltaLabel={`+ sur ${period}j`}
            color={COLORS.users}
            icon="👥"
            loading={loading}
          />
          <KPI
            label="Livres ajoutés"
            value={metrics?.totals.books ?? null}
            delta={metrics?.period.new_books ?? null}
            deltaLabel={`+ sur ${period}j`}
            color={COLORS.books}
            icon="📚"
            loading={loading}
          />
          <KPI
            label="Groupes créés"
            value={metrics?.totals.groups ?? null}
            delta={metrics?.period.new_groups ?? null}
            deltaLabel={`+ sur ${period}j`}
            color={COLORS.groups}
            icon="👨‍👩‍👧"
            loading={loading}
          />
          <KPI
            label="Livres lus"
            value={metrics?.totals.reads ?? null}
            delta={metrics?.period.new_reads ?? null}
            deltaLabel={`+ sur ${period}j`}
            color={COLORS.reads}
            icon="⭐"
            loading={loading}
          />
        </section>

        {/* Growth chart */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Croissance
            </h2>
            <p className="text-xs text-slate-500">
              {period} derniers jours
              {lastRefreshedAt && (
                <span className="ml-2">
                  · maj {lastRefreshedAt.toLocaleTimeString("fr-FR")}
                </span>
              )}
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics?.daily ?? []}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={COLORS.users}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.users}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gBooks" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={COLORS.books}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.books}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gGroups" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={COLORS.groups}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.groups}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickFormatter={formatShortDay}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke={COLORS.users}
                  fill="url(#gUsers)"
                  strokeWidth={2}
                  name="Users"
                />
                <Area
                  type="monotone"
                  dataKey="books"
                  stroke={COLORS.books}
                  fill="url(#gBooks)"
                  strokeWidth={2}
                  name="Livres"
                />
                <Area
                  type="monotone"
                  dataKey="groups"
                  stroke={COLORS.groups}
                  fill="url(#gGroups)"
                  strokeWidth={2}
                  name="Groupes"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Legend
            items={[
              { label: "Users", color: COLORS.users },
              { label: "Livres", color: COLORS.books },
              { label: "Groupes", color: COLORS.groups },
            ]}
          />
        </section>

        {/* Engagement + Waitlist row */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <EngagementGauge
            label="Avec ≥1 livre"
            value={metrics?.engagement.with_book ?? 0}
            total={metrics?.engagement.total_users ?? 0}
            color={COLORS.books}
            loading={loading}
          />
          <EngagementGauge
            label="Dans ≥1 groupe"
            value={metrics?.engagement.with_group ?? 0}
            total={metrics?.engagement.total_users ?? 0}
            color={COLORS.groups}
            loading={loading}
          />
          <EngagementGauge
            label="A lu ≥1 livre"
            value={metrics?.engagement.with_read_book ?? 0}
            total={metrics?.engagement.total_users ?? 0}
            color={COLORS.reads}
            loading={loading}
          />
        </section>

        {/* Reads chart (separate so users/books/groups don't crowd it) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-900">
              Livres lus par jour
            </h2>
            <p className="text-xs text-slate-500">{period} derniers jours</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics?.daily ?? []}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  tickFormatter={formatShortDay}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="reads"
                  fill={COLORS.reads}
                  radius={[4, 4, 0, 0]}
                  name="Lus"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Top users / top groups / top books */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TopList
            title="Top utilisateurs"
            subtitle="Par # livres ajoutés"
            rows={(metrics?.top_users ?? []).map((u) => ({
              key: u.id,
              primary: u.display_name || u.email || "—",
              secondary: u.email,
              value: u.book_count,
              tag: `${u.read_count} lus`,
            }))}
            color={COLORS.users}
            loading={loading}
          />
          <TopList
            title="Top groupes"
            subtitle="Par # membres"
            rows={(metrics?.top_groups ?? []).map((g) => ({
              key: g.id,
              primary: `${g.emoji} ${g.name}`,
              secondary: new Date(g.created_at).toLocaleDateString("fr-FR"),
              value: g.member_count,
              tag: `${g.book_count} livres`,
            }))}
            color={COLORS.groups}
            loading={loading}
          />
          <TopList
            title="Top livres"
            subtitle="Par # ajouts"
            rows={(metrics?.top_books ?? []).map((b) => ({
              key: b.isbn,
              primary: b.title ?? b.isbn,
              secondary: b.isbn,
              value: b.add_count,
              tag: `${b.read_count} lus`,
              cover: b.cover_url ?? undefined,
            }))}
            color={COLORS.books}
            loading={loading}
          />
        </section>

        {/* Waitlist conversion */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900 mb-3">
            Conversion waitlist
          </h2>
          <WaitlistConversion
            total={metrics?.waitlist.total ?? 0}
            converted={metrics?.waitlist.converted ?? 0}
            loading={loading}
          />
        </section>

        <p className="text-xs text-slate-400 text-center pt-4 pb-8">
          Données générées
          {metrics?.generated_at &&
            ` le ${new Date(metrics.generated_at).toLocaleString("fr-FR")}`}
        </p>
      </main>
    </div>
  );
}

/* ════════════════════ Sub-components ════════════════════ */

function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (v: Period) => void;
}) {
  return (
    <div className="flex bg-slate-100 rounded-lg p-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
            value === p.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function KPI({
  label,
  value,
  delta,
  deltaLabel,
  color,
  icon,
  loading,
}: {
  label: string;
  value: number | null;
  delta: number | null;
  deltaLabel: string;
  color: string;
  icon: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight">
        {loading && value === null ? "—" : value?.toLocaleString("fr-FR") ?? "0"}
      </p>
      {delta !== null && (
        <p className="text-xs text-slate-500 mt-1">
          <span
            className="font-bold tabular-nums"
            style={{ color: delta > 0 ? "#10B981" : "#64748B" }}
          >
            {delta > 0 ? "+" : ""}
            {delta.toLocaleString("fr-FR")}
          </span>{" "}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}

function EngagementGauge({
  label,
  value,
  total,
  color,
  loading,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  loading: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const data = useMemo(
    () => [
      { name: "ok", value: pct },
      { name: "rest", value: 100 - pct },
    ],
    [pct]
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={32}
                outerRadius={44}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="#F1F5F9" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-extrabold text-slate-900 tabular-nums">
              {loading ? "—" : `${pct}%`}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 mt-1">
            {value.toLocaleString("fr-FR")} sur{" "}
            {total.toLocaleString("fr-FR")} users
          </p>
        </div>
      </div>
    </div>
  );
}

interface TopRow {
  key: string;
  primary: string;
  secondary?: string;
  value: number;
  tag?: string;
  cover?: string;
}

function TopList({
  title,
  subtitle,
  rows,
  color,
  loading,
}: {
  title: string;
  subtitle: string;
  rows: TopRow[];
  color: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{subtitle}</p>
      {loading && rows.length === 0 ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune donnée.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.key}
              className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-0"
            >
              <span
                className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              {r.cover && (
                <img
                  src={r.cover}
                  alt=""
                  className="w-7 h-10 rounded object-cover flex-shrink-0 bg-slate-100"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {r.primary}
                </p>
                {r.secondary && (
                  <p className="text-xs text-slate-500 truncate">
                    {r.secondary}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {r.value.toLocaleString("fr-FR")}
                </p>
                {r.tag && <p className="text-xs text-slate-500">{r.tag}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WaitlistConversion({
  total,
  converted,
  loading,
}: {
  total: number;
  converted: number;
  loading: boolean;
}) {
  const pct = total > 0 ? Math.round((converted / total) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
          Inscrits waitlist
        </p>
        <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
          {loading ? "—" : total.toLocaleString("fr-FR")}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
          Convertis
        </p>
        <p className="text-3xl font-extrabold text-emerald-600 mt-1 tabular-nums">
          {loading ? "—" : converted.toLocaleString("fr-FR")}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
          Taux
        </p>
        <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
          {loading ? "—" : `${pct}%`}
        </p>
      </div>
    </div>
  );
}

function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-4 mt-2 pl-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: it.color }}
          />
          <span className="text-xs text-slate-600 font-medium">
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Recharts default tooltip works but is plain; this one matches the
// brand surfaces and uses tabular-nums so digits don't wobble on hover.
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const dateLabel =
    typeof label === "string" ? formatLongDay(label) : String(label ?? "");
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-bold text-slate-900 mb-1">{dateLabel}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-slate-600">{p.name}</span>
          <span className="font-bold text-slate-900 tabular-nums ml-auto">
            {p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ════════════════════ Login screen ════════════════════ */

function AdminLogin({
  onSubmit,
  onExit,
  error,
}: {
  onSubmit: (pwd: string) => void;
  onExit: () => void;
  error: string | null;
}) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.length === 0) return;
    onSubmit(value);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-5">
      <button
        onClick={onExit}
        className="absolute top-5 left-5 text-slate-400 hover:text-slate-700 transition text-sm"
      >
        ← Retour à l'app
      </button>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FB6538] via-[#FF3C7A] to-[#FFC83D] shadow-lg mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Ploom · Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accès restreint
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
        >
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Mot de passe
            </span>
            <div className="mt-1 relative">
              <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-12 text-base border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FB6538] focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                {show ? "Cacher" : "Voir"}
              </button>
            </div>
          </label>

          {error && (
            <p className="text-sm text-rose-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={value.length === 0}
            className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
          >
            Entrer
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4">
          Le mot de passe est vérifié côté serveur (bcrypt).
        </p>
      </div>
    </div>
  );
}

/* ════════════════════ Helpers ════════════════════ */

function formatShortDay(day: string) {
  // "2026-05-12" → "12/05"
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

function formatLongDay(day: string) {
  // "2026-05-12" → "12 mai 2026"
  const [y, m, d] = day.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
