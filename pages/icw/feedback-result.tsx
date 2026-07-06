"use client";

import React, { useEffect, useState } from "react";
import Layout from "../containers/Layout";
import {
  Download,
  Star,
  Users,
  TrendingUp,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import api from "../../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type GeneralSummary = {
  totalSubmissions: number;
  avgOverallRating: string | number;
  avgOrganization: string | number;
  avgCommunication: string | number;
  respectedYes: string | number;
  respectedSomewhat: string | number;
  respectedNo: string | number;
  contributedYes: string | number;
  contributedSomewhat: string | number;
  contributedNo: string | number;
  participateYes: string | number;
  participateMaybe: string | number;
  participateNo: string | number;
};

type StaffSummary = {
  userId: number;
  name: string;
  role: string;
  image: string | null;
  responseCount: number;
  avgPerformance: string | number;
};

type CommentEntry = {
  strength: string | null;
  improvement: string | null;
  submittedAt: string;
};

type CommentGroup = {
  userId: number;
  name: string;
  role: string;
  image: string | null;
  comments: CommentEntry[];
};

type SummaryData = {
  general: GeneralSummary;
  staff: StaffSummary[];
  comments: CommentGroup[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: string | number | null | undefined, d = 1): string {
  if (n == null) return "—";
  const num = typeof n === "string" ? parseFloat(n) : n;
  return isNaN(num) ? "—" : num.toFixed(d);
}

function scoreColor(v: string | number): string {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "text-gray-400";
  if (num >= 4) return "text-emerald-600 dark:text-emerald-400";
  if (num >= 3) return "text-amber-500 dark:text-amber-400";
  return "text-rose-500 dark:text-rose-400";
}

function scoreFill(v: string | number): string {
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "bg-gray-400";
  if (num >= 4) return "bg-emerald-500";
  if (num >= 3) return "bg-amber-400";
  return "bg-rose-500";
}

// ── Partial StarRow - Accurately reflects decimal scores ─────────────────────
function StarRow({ value }: { value: string | number }) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const rating = isNaN(numValue) ? 0 : Math.max(0, Math.min(5, numValue));

  const fullStars = Math.floor(rating);
  const partial = rating - fullStars; // e.g., 0.7 for 4.7

  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((star) => {
        if (star <= fullStars) {
          // Fully filled star
          return (
            <Star
              key={star}
              className="w-4 h-4 text-yellow-400 fill-yellow-400"
            />
          );
        } else if (star === fullStars + 1 && partial > 0) {
          // Partially filled star
          return (
            <div key={star} className="relative w-4 h-4">
              {/* Empty star background */}
              <Star className="w-4 h-4 text-amber-200 dark:text-amber-800 fill-amber-200 dark:fill-amber-800" />
              {/* Filled portion overlay */}
              <div
                className="absolute top-0 left-0 overflow-hidden"
                style={{ width: `${partial * 100}%` }}
              >
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
          );
        } else {
          // Empty star
          return (
            <Star
              key={star}
              className="w-4 h-4 text-amber-200 dark:text-amber-800 fill-amber-200 dark:fill-amber-800"
            />
          );
        }
      })}
    </div>
  );
}

// ── Other components (ScoreBar, KpiCard, SentimentBar) ───────────────────────

function ScoreBar({ value }: { value: string | number }) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  const w = isNaN(numValue) ? 0 : Math.round((numValue / 5) * 100);

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreFill(value)}`}
          style={{ width: `${w}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-8 text-right ${scoreColor(value)}`}>
        {fmt(value)}
      </span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="text-xs uppercase tracking-widest font-medium text-gray-400 dark:text-gray-500 mb-1.5">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
            {value}
          </p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent + "18" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SentimentBar({
  title,
  description,
  yes,
  yesLabel,
  mid,
  midLabel,
  no,
  noLabel,
  total,
}: {
  title: string;
  description: string;
  yes: string | number;
  yesLabel: string;
  mid: string | number;
  midLabel: string;
  no: string | number;
  noLabel: string;
  total: number;
}) {
  const y = typeof yes === "string" ? parseFloat(yes) || 0 : yes;
  const m = typeof mid === "string" ? parseFloat(mid) || 0 : mid;
  const n = typeof no === "string" ? parseFloat(no) || 0 : no;

  const yPct = total ? Math.round((y / total) * 100) : 0;
  const mPct = total ? Math.round((m / total) * 100) : 0;
  const nPct = 100 - yPct - mPct;

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{title}</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 leading-relaxed">{description}</p>

      <div className="flex rounded-xl overflow-hidden h-3 mb-4 gap-0.5">
        {yPct > 0 && <div className="bg-emerald-500" style={{ width: `${yPct}%` }} />}
        {mPct > 0 && <div className="bg-amber-400" style={{ width: `${mPct}%` }} />}
        {nPct > 0 && <div className="bg-rose-500" style={{ width: `${nPct}%` }} />}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: yesLabel, count: Math.round(y), pct: yPct, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: midLabel, count: Math.round(m), pct: mPct, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: noLabel, count: Math.round(n), pct: nPct, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-2.5 ${item.bg}`}>
            <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffCard({
  staff,
  rank,
  commentGroup,
}: {
  staff: StaffSummary;
  rank: number;
  commentGroup: CommentGroup | undefined;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div
      className={`rounded-2xl border shadow-sm overflow-hidden bg-white dark:bg-gray-800 transition-all duration-200 ${
        rank <= 3
          ? "border-emerald-200 dark:border-emerald-800"
          : "border-gray-100 dark:border-gray-700"
      }`}
    >
      {/* Accent strip */}
      <div
        className="h-1"
        style={{
          background:
            rank === 1
              ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
              : rank === 2
              ? "linear-gradient(90deg,#94a3b8,#cbd5e1)"
              : rank === 3
              ? "linear-gradient(90deg,#b45309,#d97706)"
              : "linear-gradient(90deg,#059669,#34d399)",
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative shrink-0">
            <img
              src={
                staff.image
                  ? `${process.env.NEXT_PUBLIC_API_FILE_URL}storage/${staff.image}`
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=059669&color=fff&size=80`
              }
              alt={staff.name}
              className="w-14 h-14 rounded-xl object-cover bg-gray-100 dark:bg-gray-700"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=059669&color=fff&size=80`;
              }}
            />
            {medal && (
              <span className="absolute -top-2 -right-2 text-3xl leading-none">{medal}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {staff.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
  {staff?.portfolio || staff.role}
</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-bold tabular-nums ${scoreColor(staff.avgPerformance)}`}>
                  {fmt(staff.avgPerformance)}
                  <span className="text-xs font-normal text-gray-400">/5</span>
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {staff.responseCount} {staff.responseCount === 1 ? "response" : "responses"}
                </p>
              </div>
            </div>

            {/* Partial stars reflecting exact score */}
            <div className="mt-2">
              <StarRow value={staff.avgPerformance} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FeedbackAdminPage() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"avgOverall" | "name" | "responseCount">("avgOverall");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "comments">("overview");

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/feedback");
      setData(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load feedback data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      setDownloading(true);
      const res = await api.get("/feedback/download-pdf", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `issam-feedback-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  const filteredStaff = (data?.staff ?? [])
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      if (sortBy === "name") return mul * a.name.localeCompare(b.name);
      const valA = typeof a.avgPerformance === "string" ? parseFloat(a.avgPerformance) || 0 : 0;
      const valB = typeof b.avgPerformance === "string" ? parseFloat(b.avgPerformance) || 0 : 0;
      return mul * (valA - valB);
    });

  const totalComments = (data?.comments ?? []).reduce((sum, g) => sum + g.comments.length, 0);

  if (loading) {
    return (
      <>
        <div className="px-6 sm:px-8 lg:px-10 py-12">
          <div className="py-24 text-center text-sm text-gray-400 dark:text-gray-500">
            Loading feedback analytics…
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="px-6 sm:px-8 lg:px-10 py-12">
          <div className="py-24 text-center">
            <p className="text-sm text-rose-500 mb-4">{error}</p>
            <button onClick={fetchSummary} className="text-xs text-emerald-600 underline inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  const g = data!.general;
  const total = g.totalSubmissions ?? 0;

  return (
    <>
      {/* Main container with padding for breathing space */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white shadow-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[10px] font-semibold uppercase tracking-widest mb-3">
                <Award className="w-3 h-3" /> Feedback Analytics
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Feedback Report</h1>
              <p className="mt-1.5 text-sm text-white/70 max-w-xl leading-relaxed">
                ISSAM Residential Training — staff and programme evaluation analytics
                based on {total} participant response{total !== 1 ? "s" : ""}.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
              <button
                type="button"
                onClick={fetchSummary}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2.5 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-2xl bg-white text-green-900 font-semibold text-sm px-5 py-2.5 hover:bg-green-50 transition disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {downloading ? "Generating…" : "Download PDF Report"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-8 w-fit">
          {[
            { key: "overview", label: "Overview", icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { key: "staff", label: `Staff (${(data?.staff ?? []).length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { key: "comments", label: `Comments (${totalComments})`, icon: <MessageSquare className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <KpiCard label="Total responses" value={total} sub="Unique submissions" accent="#059669" icon={<Users className="w-5 h-5 text-emerald-600" />} />
              <KpiCard label="Overall rating" value={`${fmt(g.avgOverallRating)} / 5`} sub="Management team avg" accent="#0ea5e9" icon={<Star className="w-5 h-5 text-sky-500" />} />
              <KpiCard label="Organisation" value={`${fmt(g.avgOrganization)} / 5`} sub="Programme organisation" accent="#8b5cf6" icon={<TrendingUp className="w-5 h-5 text-violet-500" />} />
              <KpiCard label="Communication" value={`${fmt(g.avgCommunication)} / 5`} sub="From management" accent="#f59e0b" icon={<MessageSquare className="w-5 h-5 text-amber-500" />} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <SentimentBar
                title="Felt respected and supported"
                description="Did participants feel respected and supported by the management team?"
                yes={g.respectedYes} yesLabel="Yes"
                mid={g.respectedSomewhat} midLabel="Somewhat"
                no={g.respectedNo} noLabel="No"
                total={total}
              />
              <SentimentBar
                title="Contributed to learning"
                description="Did the management team contribute positively to participants' learning experience?"
                yes={g.contributedYes} yesLabel="Yes"
                mid={g.contributedSomewhat} midLabel="Somewhat"
                no={g.contributedNo} noLabel="No"
                total={total}
              />
              <SentimentBar
                title="Would participate again"
                description="Would participants join another programme managed by this team?"
                yes={g.participateYes} yesLabel="Yes"
                mid={g.participateMaybe} midLabel="Maybe"
                no={g.participateNo} noLabel="No"
                total={total}
              />
            </div>

            {(data?.staff ?? []).length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Performing Staff</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(data?.staff ?? [])
                    .slice()
                    .sort((a, b) => {
                      const va = typeof a.avgPerformance === "string" ? parseFloat(a.avgPerformance) || 0 : 0;
                      const vb = typeof b.avgPerformance === "string" ? parseFloat(b.avgPerformance) || 0 : 0;
                      return vb - va;
                    })
                    .slice(0, 3)
                    .map((s, i) => {
                      const cg = (data?.comments ?? []).find((c) => c.userId === s.userId);
                      return <StaffCard key={s.userId} staff={s} rank={i + 1} commentGroup={cg} />;
                    })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STAFF TAB ────────────────────────────────────────────────────────── */}
        {activeTab === "staff" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Staff Members</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {filteredStaff.length} of {(data?.staff ?? []).length} shown
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or role…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-56 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 pl-9 pr-4 py-2.5 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                <div className="flex gap-2">
                  {[
                    { label: "Score", field: "avgOverall" as const },
                    { label: "Name", field: "name" as const },
                    { label: "Responses", field: "responseCount" as const },
                  ].map(({ label, field }) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleSort(field)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition flex items-center gap-1 ${
                        sortBy === field ? "bg-green-700 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400"
                      }`}
                    >
                      {label}
                      {sortBy === field && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredStaff.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">No staff match your search.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
                {filteredStaff.map((s) => {
                  const globalRank = [...(data?.staff ?? [])]
                    .sort((a, b) => {
                      const va = typeof a.avgPerformance === "string" ? parseFloat(a.avgPerformance) || 0 : 0;
                      const vb = typeof b.avgPerformance === "string" ? parseFloat(b.avgPerformance) || 0 : 0;
                      return vb - va;
                    })
                    .findIndex((x) => x.userId === s.userId) + 1;

                  const cg = (data?.comments ?? []).find((c) => c.userId === s.userId);
                  return <StaffCard key={s.userId} staff={s} rank={globalRank} commentGroup={cg} />;
                })}
              </div>
            )}
          </>
        )}

        {/* ── COMMENTS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "comments" && (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">All Written Comments</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {totalComments} written response{totalComments !== 1 ? "s" : ""} across{" "}
                {(data?.comments ?? []).length} staff member{(data?.comments ?? []).length !== 1 ? "s" : ""}.
              </p>
            </div>

            {(data?.comments ?? []).length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <MessageSquare className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No written comments have been submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-8 mb-10">
                {(data?.comments ?? []).map((group) => (
                  <div key={group.userId}>
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={
                          group.image
                            ? `${process.env.NEXT_PUBLIC_API_FILE_URL}storage/${group.image}`
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=059669&color=fff&size=48`
                        }
                        alt={group.name}
                        className="w-10 h-10 rounded-xl object-cover bg-gray-100 dark:bg-gray-700 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=059669&color=fff&size=48`;
                        }}
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{group.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{group.role} · {group.comments.length} comment{group.comments.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="ml-auto h-px flex-1 bg-gray-100 dark:bg-gray-700 max-w-xs" />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {group.comments.map((c, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/40 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                              Response #{i + 1}
                            </span>
                          </div>
                          <div className="p-4 space-y-4">
                            {c.strength && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    What this staff member did well
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-6">
                                  {c.strength}
                                </p>
                              </div>
                            )}
                            {c.improvement && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                    <TrendingUp className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                    Areas for improvement
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-6">
                                  {c.improvement}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="pb-8" />
      </div>
    </>
  );
}