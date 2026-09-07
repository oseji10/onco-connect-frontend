import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Layers,
  Image as ImageIcon,
  Clock as ClockIcon,
  Mail,
  MailCheck,
  Loader2,
  X,
  PlayCircle,
  Eye,
  Star,
  ArrowUp,
  ArrowDown,
  Medal,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { Abstract, SUB_THEMES, formatDate } from "../../types/abstract-type";

// ─── Types for this page's API responses ───────────────────────────────────

type BucketKey = "top30" | "subThemeTop5" | "posters" | "pending";
type SortField = "rank" | "score" | "title";
type SortDir = "asc" | "desc";
type NotifiedFilter = "all" | "notified" | "not_sent";

interface RankedRow {
  abstract: Abstract;
  notified: boolean;
  rank?: number;
  subTheme?: string;
  subThemeRank?: number;
}

interface ClassificationData {
  top30: RankedRow[];
  subThemeTop5: RankedRow[];
  posters: RankedRow[];
  pending: RankedRow[];
  counts: Record<BucketKey, number>;
}

function subThemeLabel(value?: string) {
  if (!value) return "";
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

// ─── Local UI primitives (matching AbstractManagementPage) ─────────────────

function Button({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "solid" | "outline";
}) {
  const base =
    variant === "outline"
      ? "border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
      : "text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${base} ${className}`}
    >
      {children}
    </button>
  );
}

function NotifiedBadge({ notified }: { notified: boolean }) {
  return notified ? (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
      <MailCheck className="w-3.5 h-3.5" /> Notified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
      <Mail className="w-3.5 h-3.5" /> Not sent
    </span>
  );
}

// Colored pill for the average score — green/amber/red by threshold, with
// a bold, larger number so it reads at a glance down a column.
function ScorePill({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span className="text-sm text-gray-400">&mdash;</span>;
  }
  const tone =
    score >= 4
      ? "bg-green-50 text-green-800"
      : score >= 2.5
      ? "bg-amber-50 text-amber-800"
      : "bg-red-50 text-red-700";
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-lg px-2.5 py-1 font-bold ${tone}`}>
      <Star className="w-3.5 h-3.5 self-center" />
      <span className="text-base tabular-nums">{score.toFixed(2)}</span>
      <span className="text-[11px] font-semibold opacity-60">/ 5</span>
    </span>
  );
}

// Rank badge shown as the leftmost column. Overall top-30 ranks get a
// medal treatment for the top 3; sub-theme ranks get a distinct purple
// badge with the sub-theme underneath; posters/pending (which have no
// formal rank) get a quiet numbered position instead.
function RankBadge({ row, position }: { row: RankedRow; position: number }) {
  if (row.rank != null) {
    const medalTone =
      row.rank === 1
        ? "bg-amber-400 text-amber-950"
        : row.rank === 2
        ? "bg-gray-300 text-gray-800"
        : row.rank === 3
        ? "bg-orange-300 text-orange-950"
        : "bg-teal-600 text-white";
    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-extrabold text-sm tabular-nums ${medalTone}`}
        >
          {row.rank <= 3 ? <Medal className="w-4 h-4" /> : `#${row.rank}`}
        </span>
        {row.rank <= 3 && <span className="text-xs font-bold text-gray-500">#{row.rank}</span>}
      </div>
    );
  }

  if (row.subThemeRank != null) {
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-full font-extrabold text-sm tabular-nums bg-indigo-100 text-indigo-800">
          #{row.subThemeRank}
        </span>
        <span className="text-[10px] text-gray-400 max-w-[8rem] truncate">
          {subThemeLabel(row.subTheme)}
        </span>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm tabular-nums bg-gray-100 text-gray-500">
      {position}
    </span>
  );
}

// Lists every author on the abstract with their email — the corresponding
// author first and bolded, co-authors underneath in muted text — so emails
// are visible straight from the table without opening the detail modal.
function AuthorsCell({ authors }: { authors: Abstract["authors"] }) {
  if (!authors || authors.length === 0) {
    return <span className="text-xs text-gray-400">&mdash;</span>;
  }
  const sorted = [...authors].sort((a, b) => (b.isCorresponding ? 1 : 0) - (a.isCorresponding ? 1 : 0));

  return (
    <div className="space-y-1">
      {sorted.map((a) => (
        <div key={a.id} className="leading-tight">
          <p
            className={`text-xs truncate ${
              a.isCorresponding ? "font-bold text-gray-900" : "font-semibold text-gray-700"
            }`}
          >
            {a.name}
            {a.isCorresponding && <span className="ml-1 text-teal-700">(corresponding)</span>}
          </p>
          <p className="text-[11px] text-gray-500 truncate">{a.email}</p>
        </div>
      ))}
    </div>
  );
}

const BUCKET_TABS: { key: BucketKey; label: string; icon: React.ReactNode }[] = [
  { key: "top30", label: "Overall Top 30 (Oral)", icon: <Trophy className="w-4 h-4" /> },
  { key: "subThemeTop5", label: "Sub-theme Top 5 (Oral)", icon: <Layers className="w-4 h-4" /> },
  { key: "posters", label: "Posters (≥ 2.5)", icon: <ImageIcon className="w-4 h-4" /> },
  { key: "pending", label: "Pending (< 2.5)", icon: <ClockIcon className="w-4 h-4" /> },
];

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "score", label: "Score" },
  { key: "title", label: "Title" },
];

// ─── Run classification confirm modal ───────────────────────────────────────

function RunClassificationModal({
  isOpen,
  onClose,
  onDone,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [sendEmails, setSendEmails] = useState(true);
  const [resend, setResend] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleRun() {
    try {
      setSubmitting(true);
      const { data } = await api.post("/abstracts/rankings/process", {
        sendEmails,
        resend,
      });
      toast.success(data?.message || "Classification applied.");
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to run classification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Run Classification</h3>
            <p className="text-sm text-gray-500 mt-1">
              Accepts the overall top 30, the sub-theme top 5, and every
              remaining abstract scoring 2.5+; abstracts below 2.5 are held
              as pending.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-0.5 accent-teal-600"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              Send decision emails to newly-classified authors right away.
              Leave this unchecked to just apply statuses/ranks and send
              emails individually later.
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-0.5 accent-teal-600"
              checked={resend}
              onChange={(e) => setResend(e.target.checked)}
              disabled={!sendEmails}
            />
            <span className={`text-sm ${sendEmails ? "text-gray-700" : "text-gray-400"}`}>
              Re-send to authors who were already notified (e.g. after
              re-running because scores changed). Otherwise already-notified
              abstracts are skipped.
            </span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-6" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0 px-6"
            onClick={handleRun}
            disabled={submitting}
          >
            <span className="inline-flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {submitting ? "Running..." : "Run Classification"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual classify modal (for the "pending" bucket) ───────────────────────

function ManualClassifyModal({
  row,
  onClose,
  onDone,
}: {
  row: RankedRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [decision, setDecision] = useState<"accepted-oral" | "accepted-poster" | "rejected">(
    "accepted-poster"
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!row) return null;

  async function handleSubmit() {
    if (!row) return;
    const status = decision === "rejected" ? "rejected" : "accepted";
    const presentationType =
      decision === "accepted-oral" ? "oral" : decision === "accepted-poster" ? "poster" : undefined;

    try {
      setSubmitting(true);
      await api.patch(`/abstracts/${row.abstract.id}/classify`, {
        status,
        presentationType,
        sendEmail,
      });
      toast.success("Abstract classified.");
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to classify abstract.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">Classify Abstract</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{row.abstract.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {(
            [
              { value: "accepted-poster", label: "Accept — Poster presentation" },
              { value: "accepted-oral", label: "Accept — Oral presentation" },
              { value: "rejected", label: "Reject" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-teal-200 cursor-pointer"
            >
              <input
                type="radio"
                name="decision"
                className="w-4 h-4 accent-teal-600"
                checked={decision === opt.value}
                onChange={() => setDecision(opt.value)}
              />
              <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
            </label>
          ))}
          <label className="flex items-center gap-3 pt-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-teal-600"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Send the decision email now</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-6" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0 px-6"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── View abstract detail modal (read-only — full detail from this page) ───

function ViewRankingDetailModal({
  row,
  onClose,
}: {
  row: RankedRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  const { abstract } = row;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{abstract.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{abstract.reference}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Sub-theme</p>
              <p className="text-sm font-semibold text-gray-900">
                {subThemeLabel(abstract.subTheme) || "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Presentation type</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {abstract.presentationType || "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Rank</p>
              <p className="text-sm font-semibold text-gray-900">
                {row.rank
                  ? `#${row.rank} overall`
                  : row.subThemeRank
                  ? `#${row.subThemeRank} in ${subThemeLabel(row.subTheme)}`
                  : "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Average score</p>
              <div className="mt-1">
                <ScorePill score={abstract.averageScore} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <p className="text-xs font-bold uppercase text-gray-500">Decision email</p>
            <NotifiedBadge notified={row.notified} />
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Authors</p>
            <div className="space-y-2">
              {abstract.authors.map((a) => (
                <div key={a.id} className="text-sm">
                  <span className="font-semibold text-gray-900">{a.name}</span>
                  {a.isCorresponding && (
                    <span className="ml-2 text-xs text-teal-700 font-bold">(Corresponding)</span>
                  )}
                  <p className="text-xs text-gray-500">{a.affiliation}</p>
                  <p className="text-xs text-gray-500">{a.email}</p>
                  <p className="text-xs text-gray-500">{a.phone}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Abstract</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {abstract.body}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Reviewers &amp; scores</p>
            {abstract.reviewers.length === 0 ? (
              <p className="text-sm text-gray-500">No reviewers assigned.</p>
            ) : (
              <div className="space-y-3">
                {abstract.reviewers.map((r) => (
                  <div key={r.reviewerId} className="rounded-xl border-2 border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{r.reviewerName}</p>
                      <span
                        className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${
                          r.status === "submitted"
                            ? "bg-green-100 text-green-800"
                            : r.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                    {r.review && (
                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                        <p>
                          Significance {r.review.scores.significance} &middot; Relevance{" "}
                          {r.review.scores.relevance} &middot; Originality{" "}
                          {r.review.scores.originality} &mdash;{" "}
                          <span className="font-bold">avg {r.review.average.toFixed(2)}</span>
                        </p>
                        {r.review.comment && (
                          <p className="italic text-gray-500">"{r.review.comment}"</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button variant="outline" className="rounded-2xl h-11 px-6" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AbstractRankingsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassificationData | null>(null);
  const [activeTab, setActiveTab] = useState<BucketKey>("top30");
  const [isRunOpen, setIsRunOpen] = useState(false);
  const [classifyingRow, setClassifyingRow] = useState<RankedRow | null>(null);
  const [viewingRow, setViewingRow] = useState<RankedRow | null>(null);
  const [notifyingId, setNotifyingId] = useState<number | null>(null);

  // Filter + sort controls
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [notifiedFilter, setNotifiedFilter] = useState<NotifiedFilter>("all");
  const [subThemeFilter, setSubThemeFilter] = useState<string>("all");

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/abstracts/rankings");
      setData(data?.data ?? null);
    } catch (err) {
      toast.error("Failed to load ranking preview.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Reset filters that don't apply to every tab whenever the tab changes.
  useEffect(() => {
    setSubThemeFilter("all");
  }, [activeTab]);

  async function handleSendIndividual(abstractId: number) {
    try {
      setNotifyingId(abstractId);
      await api.post(`/abstracts/${abstractId}/notify`);
      toast.success("Notification sent.");
      await fetchPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send notification.");
    } finally {
      setNotifyingId(null);
    }
  }

  const isPendingTab = activeTab === "pending";
  const isSubThemeTab = activeTab === "subThemeTop5";

  const subThemeOptionsInTab = useMemo(() => {
    if (!data || !isSubThemeTab) return [];
    const values = new Set(data.subThemeTop5.map((r) => r.subTheme).filter(Boolean) as string[]);
    return Array.from(values);
  }, [data, isSubThemeTab]);

  const rows = useMemo(() => {
    if (!data) return [] as RankedRow[];
    let result = [...data[activeTab]];

    if (notifiedFilter !== "all") {
      result = result.filter((r) =>
        notifiedFilter === "notified" ? r.notified : !r.notified
      );
    }
    if (isSubThemeTab && subThemeFilter !== "all") {
      result = result.filter((r) => r.subTheme === subThemeFilter);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    result.sort((a, b) => {
      if (sortField === "score") {
        const av = a.abstract.averageScore ?? -Infinity;
        const bv = b.abstract.averageScore ?? -Infinity;
        return (av - bv) * dir;
      }
      if (sortField === "title") {
        return a.abstract.title.localeCompare(b.abstract.title) * dir;
      }
      // rank: fall back to overall rank, then sub-theme rank, then score
      const ar = a.rank ?? a.subThemeRank ?? Infinity;
      const br = b.rank ?? b.subThemeRank ?? Infinity;
      if (ar !== br) return (ar - br) * dir;
      const av = a.abstract.averageScore ?? -Infinity;
      const bv = b.abstract.averageScore ?? -Infinity;
      return (bv - av) * dir;
    });

    return result;
  }, [data, activeTab, notifiedFilter, subThemeFilter, isSubThemeTab, sortField, sortDir]);

  function toggleSortDir() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle>Abstract Rankings &amp; Classification</PageTitle>
            <p className="mt-2 text-sm text-gray-600">
              Top 30 overall and top 5 per sub-theme present orally; everyone
              else scoring 2.5+ presents as a poster; below 2.5 is held for a
              manual call.
            </p>
          </div>
          <Button
            className="rounded-2xl h-12 px-5 bg-indigo-600 border-0"
            onClick={() => setIsRunOpen(true)}
          >
            <span className="inline-flex items-center gap-2">
              <PlayCircle className="w-5 h-5" />
              Run Classification
            </span>
          </Button>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {BUCKET_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl border-2 p-5 text-left transition-colors ${
              activeTab === tab.key
                ? "border-teal-500 bg-teal-50"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              {tab.icon}
              <span className="text-xs font-bold uppercase">{tab.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "—" : data?.counts?.[tab.key] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Filter + sort toolbar */}
      <div className="rounded-2xl bg-white border-2 border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-gray-400">Sort</span>
          <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortField(opt.key)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${
                  sortField === opt.key
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={toggleSortDir}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            {sortDir === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
            {sortDir === "asc" ? "Asc" : "Desc"}
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-gray-400">Emails</span>
          <div className="flex rounded-xl border-2 border-gray-200 overflow-hidden">
            {(
              [
                { key: "all", label: "All" },
                { key: "notified", label: "Notified" },
                { key: "not_sent", label: "Not sent" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setNotifiedFilter(opt.key)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${
                  notifiedFilter === opt.key
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isSubThemeTab && subThemeOptionsInTab.length > 0 && (
          <>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-gray-400">Sub-theme</span>
              <select
                value={subThemeFilter}
                onChange={(e) => setSubThemeFilter(e.target.value)}
                className="h-9 rounded-xl border-2 border-gray-200 px-3 text-xs font-bold text-gray-700 bg-white"
              >
                <option value="all">All</option>
                {subThemeOptionsInTab.map((st) => (
                  <option key={st} value={st}>
                    {subThemeLabel(st)}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {loading ? "" : `${rows.length} shown`}
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-20 text-center text-gray-500">
          Nothing matches the current filters.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="text-left px-5 py-3">Rank</th>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Authors</th>
                <th className="text-left px-5 py-3">Score</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={row.abstract.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <RankBadge row={row} position={idx + 1} />
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">
                    {row.abstract.reference}
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {row.abstract.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(row.abstract.submittedAt)}
                    </p>
                  </td>
                  <td className="px-5 py-4 max-w-[220px]">
                    <AuthorsCell authors={row.abstract.authors} />
                  </td>
                  <td className="px-5 py-4">
                    <ScorePill score={row.abstract.averageScore} />
                  </td>
                  <td className="px-5 py-4">
                    <NotifiedBadge notified={row.notified} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingRow(row)}
                        title="View full details"
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {isPendingTab ? (
                        <Button
                          variant="outline"
                          className="rounded-lg h-8 px-3 text-xs"
                          onClick={() => setClassifyingRow(row)}
                        >
                          Classify
                        </Button>
                      ) : (
                        <button
                          onClick={() => handleSendIndividual(row.abstract.id)}
                          disabled={notifyingId === row.abstract.id}
                          title={row.notified ? "Resend email" : "Send email"}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        >
                          {notifyingId === row.abstract.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RunClassificationModal
        isOpen={isRunOpen}
        onClose={() => setIsRunOpen(false)}
        onDone={fetchPreview}
      />
      <ManualClassifyModal
        row={classifyingRow}
        onClose={() => setClassifyingRow(null)}
        onDone={fetchPreview}
      />
      <ViewRankingDetailModal row={viewingRow} onClose={() => setViewingRow(null)} />
    </Layout>
  );
}