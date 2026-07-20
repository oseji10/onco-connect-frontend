"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "../containers/Layout";
import {
  CalendarDays,
  MapPin,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Building2,
  CheckCircle2,
  FileText,
  Presentation,
  Mic,
} from "lucide-react";
import api from "@/lib/api";
import { getRole } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

type SupervisorRow = {
  supervisorId: number;
  supervisorName: string;
  attendanceCount: number;
  status: "High Activity" | "Active" | "Low Activity";
};

type TrendPoint = {
  date: string;
  present: number;
  absent: number;
};

type IncidentRow = {
  category: string;
  count: number;
};

type DashboardOverviewStat = {
  title: string;
  value: string;
  note?: string;
  iconKey?: string;
  iconWrapperClass?: string;
  iconClassName?: string;
};

type DashboardPayload = {
  dashboardDate: string;
  dayName: string;
  programme: string;
  venue: string;
  period: string;
  overviewStats: DashboardOverviewStat[];
  supervisorRows: SupervisorRow[];
  incidentSnapshot: IncidentRow[];
  coordinatorNotes: string[];
};

type ApiResponse = {
  data?: DashboardPayload;
  dashboardDate?: string;
  dayName?: string;
  programme?: string;
  venue?: string;
  period?: string;
  overviewStats?: DashboardOverviewStat[];
  supervisorRows?: SupervisorRow[];
  incidentSnapshot?: IncidentRow[];
  coordinatorNotes?: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStat(stats: DashboardOverviewStat[], title: string): number {
  const raw = stats.find((s) => s.title === title)?.value ?? "0";
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

// Titles that are still sent by the backend (needed for the gender bar
// chart, or rendered as their own explicit card below) but should NOT
// also render as a standalone card via the generic secondary-stats loop.
const HIDDEN_FROM_SECONDARY_GRID = new Set([
  "Accredited Male",
  "Accredited Female",
  "Males Present",
  "Females Present",
  "Registered Participants", // rendered as its own explicit card instead
]);

// Accent colour map for the secondary overview stat cards
const ACCENT_MAP: Record<string, string> = {
  "Accredited Male": "#6366f1",
  "Accredited Female": "#ec4899",
  "Males Present": "#0ea5e9",
  "Females Present": "#f472b6",
  "Attendance %": "#059669",
  "Incidents for Date": "#f59e0b",
  "Meals (Unique)": "#14b8a6",
  // Abstract submission metrics
  "Abstracts Submitted": "#8b5cf6",
  "Abstracts Accepted": "#22c55e",
  "Abstracts Rejected": "#ef4444",
  "Poster Presentations": "#06b6d4",
  "Oral Presentations": "#f97316",
  // Registration
  "Registered Participants": "#0d9488",
};

// Distinct icons for specific secondary stats (falls back to a plain
// accent-coloured dot for anything not listed here).
function getSecondaryStatIcon(title: string, accentColor: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    "Abstracts Submitted": <FileText className="w-5 h-5" style={{ color: accentColor }} />,
    "Abstracts Accepted": <CheckCircle2 className="w-5 h-5" style={{ color: accentColor }} />,
    "Abstracts Rejected": <XCircle className="w-5 h-5" style={{ color: accentColor }} />,
    "Poster Presentations": <Presentation className="w-5 h-5" style={{ color: accentColor }} />,
    "Oral Presentations": <Mic className="w-5 h-5" style={{ color: accentColor }} />,
    "Registered Participants": <UserPlus className="w-5 h-5" style={{ color: accentColor }} />,
  };
  return icons[title] ?? <span className="w-2.5 h-2.5 rounded-full" style={{ background: accentColor }} />;
}

// Stats shown as large KPI cards at the top — excluded from the secondary grid
const TOP_KPI_TITLES = new Set([
  "Total Accredited Participants",
  "Total Present for Selected Date",
  "Total Absent for Selected Date",
  "Open Incidents",
]);

// Roles allowed to see the full metrics dashboard. Everyone else gets
// ActionButtonsView instead — same idea as ROLE_MENU_ACCESS in
// lib/permissions.ts, just scoped to this one page's internal layout
// rather than sidebar visibility.
const DASHBOARD_CARD_ROLES = new Set(["admin", "super_admin"]);

// Quick actions shown per role on the simplified view. Keys must match
// the roleName strings from the JWT / roles table exactly.
const ROLE_ACTIONS: Record<
  string,
  { label: string; description: string; href: string; icon: React.ReactNode }[]
> = {
  reviewer: [
    {
      label: "Review Abstracts",
      description: "View the abstracts assigned to you and submit your reviews.",
      href: "/icw/abstract-review",
      icon: <FileText className="w-6 h-6" />,
    },
  ],
  registration_desk_officer: [
    {
      label: "Registration",
      description: "Register new attendees for the event.",
      href: "/icw/registration",
      icon: <ClipboardList className="w-6 h-6" />,
    },
    {
      label: "Accreditation",
      description: "Accredit already-registered participants.",
      href: "/icw/accreditation",
      icon: <CheckCircle2 className="w-6 h-6" />,
    },
  ],
  abstract_committee_member: [
    {
      label: "Abstract Management",
      description: "View and manage submitted abstracts.",
      href: "/icw/abstract-management",
      icon: <FileText className="w-6 h-6" />,
    },
    {
      label: "Review Abstracts",
      description: "Review abstracts assigned to the committee.",
      href: "/icw/abstract-review",
      icon: <CheckCircle2 className="w-6 h-6" />,
    },
  ],
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SupervisorActivityBadge({ status }: { status: string }) {
  if (status === "High Activity")
    return (
      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
        High
      </span>
    );
  if (status === "Active")
    return (
      <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
        Active
      </span>
    );
  return (
    <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
      Low
    </span>
  );
}

function KpiCard({
  label,
  value,
  note,
  accentColor,
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  note?: string;
  accentColor: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="pl-2">
          <p className="text-xs uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400 mb-2">
            {label}
          </p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
            {value}
          </h3>
          {note && (
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{note}</p>
          )}
        </div>
        <div
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: accentColor + "20" }}
        >
          {icon}
        </div>
      </div>
    </>
  );

  const base =
    "relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 w-full text-left transition";
  const clickable =
    "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${clickable}`}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

function SmallInfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/90 dark:bg-white/10 shadow-sm p-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-black dark:text-emerald-300">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-white/50">
            {label}
          </p>
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// Simplified landing view for roles that don't get the metrics dashboard.
// Reads its action set from ROLE_ACTIONS; a role with nothing configured
// there (or an unrecognised role) gets a plain empty-state message rather
// than a blank page.
function ActionButtonsView({ role }: { role: string | null }) {
  const router = useRouter();
  const actions = (role && ROLE_ACTIONS[role]) || [];

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Choose what you'd like to do.
      </p>

      {actions.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No quick actions are set up for your role yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actions.map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => router.push(action.href)}
              className="flex items-start gap-4 text-left rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                {action.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {action.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function useChart(
  ref: React.RefObject<HTMLCanvasElement>,
  config: object,
  deps: any[]
) {
  const chartRef = useRef<any>(null);
  useEffect(() => {
    if (!ref.current) return;
    const Chart = (window as any).Chart;
    if (!Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ref.current, config);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function ChartScriptLoader({ onLoad }: { onLoad: () => void }) {
  useEffect(() => {
    if ((window as any).Chart) { onLoad(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = onLoad;
    document.head.appendChild(s);
  }, []);
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();

  // Role is read synchronously from the JWT (same source RoleGuard and
  // the sidebar filter use), but only inside an effect — reading it
  // during the initial render would mismatch between server and client
  // since localStorage isn't available server-side. roleReady gates
  // rendering until that first effect has actually run.
  const [role, setRole] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [dashboardData, setDashboardData] = useState<DashboardPayload | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [chartReady, setChartReady] = useState(false);

  const donutRef = useRef<HTMLCanvasElement>(null);
  const genderRef = useRef<HTMLCanvasElement>(null);
  const trendRef = useRef<HTMLCanvasElement>(null);
  const supBarRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setRole(getRole());
    setRoleReady(true);
  }, []);

  // ── Normalise API payload ─────────────────────────────────────────────────

  const normalizePayload = (raw: ApiResponse): DashboardPayload => {
    const payload = raw?.data ?? raw;
    return {
      dashboardDate: payload?.dashboardDate ?? "--",
      dayName: payload?.dayName ?? "--",
      programme: payload?.programme ?? "--",
      venue: payload?.venue ?? "--",
      period: payload?.period ?? "--",
      overviewStats: Array.isArray(payload?.overviewStats) ? payload.overviewStats : [],
      supervisorRows: Array.isArray(payload?.supervisorRows) ? payload.supervisorRows : [],
      incidentSnapshot: Array.isArray(payload?.incidentSnapshot) ? payload.incidentSnapshot : [],
      coordinatorNotes: Array.isArray(payload?.coordinatorNotes) ? payload.coordinatorNotes : [],
    };
  };

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchDashboard = async (date?: string, isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError("");
      const response = await api.get<ApiResponse>("dashboard/issam-central", {
        params: { date: date || selectedDate },
      });
      setDashboardData(normalizePayload(response.data));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrend = async () => {
    try {
      const response = await api.get<{ data: TrendPoint[] }>(
        "dashboard/issam-central/attendance-trend",
        { params: { periodStart: "2026-03-24", periodEnd: "2026-03-30" } }
      );
      setTrend(response.data.data ?? []);
    } catch {
      // non-critical
    }
  };

  // Only fetch the metrics dashboard's data once we know the role, and
  // only for roles that actually see it — action-buttons roles never hit
  // these endpoints at all.
  useEffect(() => {
    if (!roleReady) return;

    if (!role || !DASHBOARD_CARD_ROLES.has(role)) {
      setLoading(false);
      return;
    }

    fetchDashboard(selectedDate);
    fetchTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleReady, role]);

  // ── Derived values ────────────────────────────────────────────────────────

  const stats          = dashboardData?.overviewStats  ?? [];
  const supervisorRows = dashboardData?.supervisorRows ?? [];
  const incidentSnapshot = dashboardData?.incidentSnapshot ?? [];
  const coordinatorNotes = dashboardData?.coordinatorNotes ?? [];

  const dashboardDate = dashboardData?.dashboardDate ?? "--";
  const dayName       = dashboardData?.dayName       ?? "--";
  const programme     = dashboardData?.programme     ?? "--";
  const venue         = dashboardData?.venue         ?? "--";
  const period        = dashboardData?.period        ?? "--";

  const present       = getStat(stats, "Total Present for Selected Date");
  const absent        = getStat(stats, "Total Absent for Selected Date");
  const total         = getStat(stats, "Total Accredited Participants");
  const registered    = getStat(stats, "Registered Participants");
  const accMale       = getStat(stats, "Accredited Male");
  const accFemale     = getStat(stats, "Accredited Female");
  const malePresent   = getStat(stats, "Males Present");
  const femalePresent = getStat(stats, "Females Present");
  const openIncidents = getStat(stats, "Open Incidents");
  const abstractsRejected = getStat(stats, "Abstracts Rejected");
  const attendancePct = total > 0 ? Math.round((present / total) * 100) + "%" : "0%";

  // Merged gender totals — shown as a single figure on their cards; the
  // male/female split is only revealed in the detail drill-down view.
  const accreditedTotalByGender = accMale + accFemale;
  const presentTotalByGender    = malePresent + femalePresent;

  const isDark      = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const gridColor   = isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)";
  const tickColor   = isDark ? "#9ca3af" : "#6b7280";

  // ── Navigation — same query-param shape as the original ──────────────────

  function goToOverviewDetail(item: DashboardOverviewStat) {
    const params = new URLSearchParams({
      type: "overview",
      title: item.title,
      date: selectedDate,
      dashboardDate,
      dayName,
      programme,
      venue,
      period,
    });
    router.push(`/icw/dashboard-detail?${params.toString()}`);
  }

  // Helper — look up a stat object (with fallback) for KPI cards
  function statOrFallback(title: string, value: number): DashboardOverviewStat {
    return stats.find((s) => s.title === title) ?? { title, value: String(value) };
  }

  // ── Charts ────────────────────────────────────────────────────────────────
  // These hooks always run (rules-of-hooks) — they're just no-ops for
  // action-buttons roles since their canvas refs never mount.

  useChart(donutRef, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{ data: [present, absent], backgroundColor: ["#059669", "#f43f5e"], borderWidth: 0, hoverOffset: 4 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "68%",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw}` } } },
    },
  }, [present, absent, chartReady]);

  useChart(genderRef, {
    type: "bar",
    data: {
      labels: ["Male", "Female"],
      datasets: [
        { label: "Accredited", data: [accMale, accFemale], backgroundColor: "#6366f1", borderRadius: 4, barPercentage: 0.45 },
        { label: "Present",    data: [malePresent, femalePresent], backgroundColor: "#059669", borderRadius: 4, barPercentage: 0.45 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor }, border: { display: false } },
      },
    },
  }, [accMale, accFemale, malePresent, femalePresent, chartReady]);

  useChart(trendRef, {
    type: "line",
    data: {
      labels: trend.map((t) => t.date),
      datasets: [
        { label: "Present", data: trend.map((t) => t.present), borderColor: "#059669", backgroundColor: "rgba(5,150,105,.08)", fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: "#059669", pointBorderColor: "#fff", pointBorderWidth: 2 },
        { label: "Absent",  data: trend.map((t) => t.absent),  borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,.06)", fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: "#f43f5e", pointBorderColor: "#fff", pointBorderWidth: 2, borderDash: [4, 3] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor }, border: { display: false } },
      },
    },
  }, [trend, chartReady]);

  useChart(supBarRef, {
    type: "bar",
    data: {
      labels: supervisorRows.slice(0, 8).map((s) => s.supervisorName),
      datasets: [{ data: supervisorRows.slice(0, 8).map((s) => s.attendanceCount), backgroundColor: "#059669", borderRadius: 4, barPercentage: 0.6 }],
    },
    options: {
      indexAxis: "y",
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 11 } }, grid: { color: gridColor }, border: { display: false } },
        y: {
          ticks: {
            color: tickColor, font: { size: 11 },
            callback: (_v: any, i: number) => {
              const name = supervisorRows[i]?.supervisorName ?? "";
              return name.length > 14 ? name.slice(0, 14) + "…" : name;
            },
          },
          grid: { display: false },
        },
      },
    },
  }, [supervisorRows, chartReady]);

  // ── Role gate ─────────────────────────────────────────────────────────────

  if (!roleReady) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!role || !DASHBOARD_CARD_ROLES.has(role)) {
    return (
      <Layout>
        <ActionButtonsView role={role} />
      </Layout>
    );
  }

  // ── Loading state (admin / super_admin only, past this point) ────────────

  if (loading) {
    return (
      <Layout>
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </Layout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <ChartScriptLoader onLoad={() => setChartReady(true)} />

      {/* Header banner */}
      <div className="rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white shadow-xl p-5 sm:p-7 mb-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 text-[10px] font-semibold tracking-widest uppercase rounded-full bg-white/15 mb-3">
              Central operations view
            </span>
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">
              International Cancer Week Central Dashboard
            </h1>
            <h3 >
              2026 · {venue} 
            </h3>
            {error && (
              <p className="mt-3 text-sm text-red-100 bg-red-500/20 border border-red-200/20 rounded-xl px-3 py-2 inline-block">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/70">Filter by date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); fetchDashboard(e.target.value, true); }}
                  className="rounded-xl border border-white/30 bg-white/15 text-white px-4 py-2 text-sm focus:outline-none focus:border-white/60"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchDashboard(selectedDate, true)}
                disabled={refreshing}
                className="rounded-xl bg-white text-green-900 font-semibold text-sm px-5 py-2 hover:bg-green-50 transition disabled:opacity-60"
              >
                {refreshing ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full xl:w-[460px]">
            <SmallInfoCard label="Programme"      value={programme}                    icon={<ClipboardList className="w-4 h-4" />} />
            <SmallInfoCard label="Venue"          value={venue}                        icon={<MapPin className="w-4 h-4" />} />
            <SmallInfoCard label="Period"         value={period}                       icon={<CalendarDays className="w-4 h-4" />} />
            <SmallInfoCard label="Dashboard date" value={`${dashboardDate} · ${dayName}`} icon={<Building2 className="w-4 h-4" />} />
          </div>
        </div>
      </div>

      {/* Top KPI strip — 4 primary metrics, all clickable */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total accredited"
          value={total}
          note="Registered participants"
          accentColor="#059669"
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          onClick={() => goToOverviewDetail(statOrFallback("Total Accredited Participants", total))}
        />
        <KpiCard
          label="Present today"
          value={present}
          note={`${attendancePct} attendance rate`}
          accentColor="#0ea5e9"
          icon={<UserCheck className="w-5 h-5 text-sky-500" />}
          onClick={() => goToOverviewDetail(statOrFallback("Total Present for Selected Date", present))}
        />
        <KpiCard
          label="Absent today"
          value={absent}
          note="Unaccounted"
          accentColor="#f43f5e"
          icon={<UserX className="w-5 h-5 text-rose-500" />}
          onClick={() => goToOverviewDetail(statOrFallback("Total Absent for Selected Date", absent))}
        />
        <KpiCard
          label="Open incidents"
          value={openIncidents}
          note="Requires action"
          accentColor="#f59e0b"
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          onClick={() => goToOverviewDetail(statOrFallback("Open Incidents", openIncidents))}
        />
      </div>

      {/* Secondary overviewStats grid.
          - "Accredited by Gender" and "Present by Gender" are merged cards
            showing a single total figure (built from the raw male/female
            stats, which the backend still sends since they also feed the
            gender bar chart below). Tap either to see the full male/female
            breakdown in the detail view.
          - "Registered Participants" is rendered explicitly here (rather
            than through the generic loop below) so it always shows even if
            the backend key name ever drifts slightly.
          - Any other overviewStats entries (e.g. "Abstracts Rejected")
            render automatically through the generic loop, picking up their
            accent colour / icon from ACCENT_MAP / getSecondaryStatIcon, or
            a neutral fallback if not registered there. */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Accredited Participants"
          value={accreditedTotalByGender}
          note="Tap to view gender breakdown"
          accentColor="#6366f1"
          icon={<Users className="w-5 h-5 text-indigo-500" />}
          onClick={() =>
            goToOverviewDetail({
              title: "Accredited by Gender",
              value: String(accreditedTotalByGender),
            })
          }
        />
        <KpiCard
          label="Present Today"
          value={presentTotalByGender}
          note="Selected date · tap for gender breakdown"
          accentColor="#0ea5e9"
          icon={<UserCheck className="w-5 h-5 text-sky-500" />}
          onClick={() =>
            goToOverviewDetail({
              title: "Present by Gender",
              value: String(presentTotalByGender),
            })
          }
        />
        <KpiCard
          label="Registered Participants"
          value={registered}
          note="All registrations · tap for full list"
          accentColor="#0d9488"
          icon={<UserPlus className="w-5 h-5 text-teal-600" />}
          onClick={() =>
            goToOverviewDetail(statOrFallback("Registered Participants", registered))
          }
        />

        {stats
          .filter((s) => !TOP_KPI_TITLES.has(s.title) && !HIDDEN_FROM_SECONDARY_GRID.has(s.title))
          .map((item) => {
            const accent = ACCENT_MAP[item.title] ?? "#6b7280";
            return (
              <KpiCard
                key={item.title}
                label={item.title}
                value={item.value}
                note={item.note}
                accentColor={accent}
                icon={getSecondaryStatIcon(item.title, accent)}
                onClick={() => goToOverviewDetail(item)}
              />
            );
          })}
      </div>

      {/* Two chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Attendance donut */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Attendance split</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Present vs absent · selected date</p>
          <div className="relative h-48">
            <canvas ref={donutRef} role="img" aria-label={`Present ${present}, Absent ${absent}`}>
              Present {present}, Absent {absent}.
            </canvas>
          </div>
          <div className="mt-3 flex justify-center gap-5 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 shrink-0" />
              Present <strong className="text-gray-900 dark:text-white ml-1">{present}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
              Absent <strong className="text-gray-900 dark:text-white ml-1">{absent}</strong>
            </span>
          </div>
        </div>

        {/* Gender grouped bar */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Gender breakdown</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Accredited vs present by gender</p>
          <div className="relative h-48">
            <canvas ref={genderRef} role="img" aria-label={`Accredited: ${accMale} male, ${accFemale} female. Present: ${malePresent} male, ${femalePresent} female.`}>
              Accredited: {accMale} male, {accFemale} female. Present: {malePresent} male, {femalePresent} female.
            </canvas>
          </div>
          <div className="mt-3 flex justify-center gap-5 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />Accredited</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 shrink-0" />Present</span>
          </div>
        </div>
      </div>

      {/* Trend line */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Attendance trend</h2>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 shrink-0" />Present</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />Absent</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Daily present vs absent across the programme period</p>
        {trend.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No trend data available yet.
          </div>
        ) : (
          <div className="relative h-44">
            <canvas ref={trendRef} role="img" aria-label="Line chart of daily attendance trend">
              Attendance trend across programme period.
            </canvas>
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">

        {/* Supervisor horizontal bar chart */}
        {/* <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Sub-CL attendance activity</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Attendance scans per Sub-CL · selected date</p>
          {supervisorRows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No supervisor activity for this date.</p>
          ) : (
            <>
              <div className="relative" style={{ height: Math.max(supervisorRows.slice(0, 8).length * 44 + 24, 200) }}>
                <canvas ref={supBarRef} role="img" aria-label="Horizontal bar chart of supervisor attendance scan counts">
                  {supervisorRows.slice(0, 8).map((s) => `${s.supervisorName}: ${s.attendanceCount}`).join(", ")}.
                </canvas>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {supervisorRows.slice(0, 8).map((row) => (
                  <div key={row.supervisorId} className="flex items-center gap-1.5 rounded-lg border border-gray-100 dark:border-gray-700 px-2.5 py-1.5">
                    <span className="text-xs text-gray-700 dark:text-gray-300">{row.supervisorName}</span>
                    <SupervisorActivityBadge status={row.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div> */}

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Incident snapshot */}
          <div className="xl:col-span-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex-1">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Incident snapshot</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">By category · selected date</p>
            {incidentSnapshot.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">No incidents recorded.</p>
            ) : (
              <div className="space-y-1">
                {incidentSnapshot.map((row) => (
                  <div key={row.category} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <span className="text-xs text-gray-700 dark:text-gray-300">{row.category}</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}