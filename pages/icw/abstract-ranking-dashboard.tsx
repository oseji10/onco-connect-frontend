import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
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
  ArrowUpDown,
  Star,
  Medal,
  Send,
  Megaphone,
  FileDown,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { Abstract, SUB_THEMES, formatDate } from "../../types/abstract-type";

// ─── Types for this page's API responses ───────────────────────────────────

type BucketKey = "top30" | "subThemeTop5" | "posters" | "pending";

// AbstractResource doesn't expose these yet on the shared `Abstract` type
// (see README) — declared locally until that's wired through.
type RankedAbstract = Abstract & {
  overallRank?: number | null;
  subThemeRank?: number | null;
  classificationGroup?: string | null;
  decisionNotifiedAt?: string | null;
};

interface RankedRow {
  abstract: RankedAbstract;
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

type SortKey = "rank" | "score" | "title" | "submitted";
type SortDir = "asc" | "desc";
type NotifiedFilter = "all" | "notified" | "not_notified";

function subThemeLabel(value?: string) {
  if (!value) return "—";
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

// ─── Excel export ───────────────────────────────────────────────────────
// Client-side, via SheetJS — no backend round-trip needed since the page
// already has every row it might export sitting in state.

function correspondingAuthorOf(abstract: RankedAbstract) {
  return abstract.authors?.find((a) => a.isCorresponding) ?? abstract.authors?.[0] ?? null;
}

function rankDisplayFor(row: RankedRow, listPosition: number, subThemeFilterActive: boolean): string {
  if (row.rank) return `#${row.rank} overall`;
  if (row.subThemeRank) return `#${row.subThemeRank} in ${subThemeLabel(row.subTheme)}`;
  return subThemeFilterActive ? `#${listPosition} (in filtered sub-theme)` : `#${listPosition}`;
}

function rowsToWorksheet(rows: RankedRow[], subThemeFilterActive: boolean): XLSX.WorkSheet {
  const records = rows.map((row, idx) => {
    const author = correspondingAuthorOf(row.abstract);
    return {
      Rank: rankDisplayFor(row, idx + 1, subThemeFilterActive),
      Reference: row.abstract.reference,
      Title: row.abstract.title,
      "Sub-theme": subThemeLabel(row.abstract.subTheme),
      Score: row.abstract.averageScore ?? "",
      "Presentation Type": row.abstract.presentationType ?? "",
      Status: row.abstract.status,
      Notified: row.notified ? "Yes" : "No",
      "Submitted At": formatDate(row.abstract.submittedAt),
      "Corresponding Author": author?.name ?? "",
      "Author Email": author?.email ?? "",
      Affiliation: author?.affiliation ?? "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(records);
  ws["!cols"] = [
    { wch: 22 }, // Rank
    { wch: 14 }, // Reference
    { wch: 45 }, // Title
    { wch: 20 }, // Sub-theme
    { wch: 8 }, // Score
    { wch: 16 }, // Presentation Type
    { wch: 12 }, // Status
    { wch: 10 }, // Notified
    { wch: 18 }, // Submitted At
    { wch: 24 }, // Corresponding Author
    { wch: 28 }, // Author Email
    { wch: 28 }, // Affiliation
  ];
  return ws;
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename, { compression: true });
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

// Export exactly what's on screen for the active tab — i.e. respects the
// current sub-theme filter, notified filter, and sort order.
function exportViewToExcel(bucketLabel: string, rows: RankedRow[], subThemeFilterActive: boolean) {
  if (rows.length === 0) {
    toast.error("Nothing to export in the current view.");
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, rowsToWorksheet(rows, subThemeFilterActive), bucketLabel.slice(0, 31));
  downloadWorkbook(wb, `abstracts-${bucketLabel.toLowerCase().replace(/\s+/g, "-")}-${todayStamp()}.xlsx`);
}

// Export every bucket, unfiltered, as separate sheets in one workbook.
function exportAllToExcel(data: ClassificationData) {
  const wb = XLSX.utils.book_new();
  const sheets: { key: BucketKey; name: string }[] = [
    { key: "top30", name: "Top 30 (Oral)" },
    { key: "subThemeTop5", name: "Sub-theme Top 5 (Oral)" },
    { key: "posters", name: "Posters" },
    { key: "pending", name: "Pending" },
  ];
  sheets.forEach(({ key, name }) => {
    XLSX.utils.book_append_sheet(wb, rowsToWorksheet(data[key], false), name.slice(0, 31));
  });
  downloadWorkbook(wb, `abstracts-all-categories-${todayStamp()}.xlsx`);
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

// Beautified rank number: medal treatment for #1-3 of an official rank,
// a plain teal/indigo badge for other official ranks, and a muted "list
// position" badge when there's no official rank (posters / pending),
// so the left-hand column always shows something legible. When a caption
// is supplied (e.g. because a sub-theme filter is active), it's shown
// under the badge to make clear what the number means.
function RankBadge({
  officialRank,
  isSubTheme,
  listPosition,
  caption,
}: {
  officialRank?: number;
  isSubTheme?: boolean;
  listPosition: number;
  caption?: string;
}) {
  if (officialRank) {
    const medal =
      officialRank === 1
        ? { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-300" }
        : officialRank === 2
        ? { bg: "bg-gray-200", text: "text-gray-700", ring: "ring-gray-300" }
        : officialRank === 3
        ? { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-300" }
        : isSubTheme
        ? { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200" }
        : { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200" };

    return (
      <div className="flex flex-col items-start gap-1">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full ring-2 ${medal.bg} ${medal.text} ${medal.ring} font-extrabold text-sm tabular-nums`}
        >
          {officialRank <= 3 ? <Medal className="w-4 h-4" /> : `#${officialRank}`}
        </span>
        {caption && <span className="text-[10px] font-semibold text-gray-400 leading-tight">{caption}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 text-gray-400 font-bold text-sm tabular-nums ring-2 ring-gray-100">
        {listPosition}
      </span>
      {caption && <span className="text-[10px] font-semibold text-gray-400 leading-tight">{caption}</span>}
    </div>
  );
}

// Beautified score: a colored pill instead of a bare number, tiered by
// the same 2.5 threshold the classification itself uses.
function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span className="text-gray-400">—</span>;
  }
  const tier =
    score >= 4
      ? "bg-green-100 text-green-800"
      : score >= 2.5
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-sm tabular-nums ${tier}`}>
      <Star className="w-3.5 h-3.5" />
      {score.toFixed(2)}
    </span>
  );
}

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

// ─── View abstract modal (read-only detail + score breakdown) ──────────────

function ViewAbstractModal({
  row,
  onClose,
  onSendEmail,
  sending,
}: {
  row: RankedRow | null;
  onClose: () => void;
  onSendEmail: (abstractId: number) => void;
  sending: boolean;
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
              <p className="text-sm font-semibold text-gray-900">{subThemeLabel(abstract.subTheme)}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Presentation</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {abstract.presentationType || "Not yet decided"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Average score</p>
              <p className="text-sm font-semibold text-gray-900">
                <ScoreBadge score={abstract.averageScore} />
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Rank</p>
              <p className="text-sm font-semibold text-gray-900">
                {row.rank
                  ? `#${row.rank} overall`
                  : row.subThemeRank
                  ? `#${row.subThemeRank} in ${subThemeLabel(row.subTheme)}`
                  : "Unranked"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Notification</p>
              <div className="mt-1">
                <NotifiedBadge notified={row.notified} />
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-xl h-9 px-4 text-xs"
              onClick={() => onSendEmail(abstract.id)}
              disabled={sending}
            >
              <span className="inline-flex items-center gap-2">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                {row.notified ? "Resend email" : "Send email"}
              </span>
            </Button>
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
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{abstract.body}</p>
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
                          {r.review.scores.relevance} &middot; Originality {r.review.scores.originality} &mdash;{" "}
                          <span className="font-bold">avg {r.review.average.toFixed(2)}</span>
                        </p>
                        {r.review.comment && <p className="italic text-gray-500">"{r.review.comment}"</p>}
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

// ─── Filter / sort toolbar ───────────────────────────────────────────────

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "score", label: "Score" },
  { key: "title", label: "Title" },
  { key: "submitted", label: "Submitted date" },
];

function Toolbar({
  subThemeFilter,
  onSubThemeFilterChange,
  notifiedFilter,
  onNotifiedFilterChange,
  sortKey,
  onSortKeyChange,
  sortDir,
  onToggleSortDir,
  onExportView,
}: {
  subThemeFilter: string;
  onSubThemeFilterChange: (v: string) => void;
  notifiedFilter: NotifiedFilter;
  onNotifiedFilterChange: (v: NotifiedFilter) => void;
  sortKey: SortKey;
  onSortKeyChange: (v: SortKey) => void;
  sortDir: SortDir;
  onToggleSortDir: () => void;
  onExportView: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={subThemeFilter}
          onChange={(e) => onSubThemeFilterChange(e.target.value)}
          className="h-9 rounded-lg border-2 border-gray-200 px-3 text-sm font-semibold bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All sub-themes</option>
          {SUB_THEMES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-xl border-2 border-gray-200 bg-white p-1">
          {(
            [
              { value: "all", label: "All" },
              { value: "notified", label: "Notified" },
              { value: "not_notified", label: "Not sent" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onNotifiedFilterChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                notifiedFilter === opt.value ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase text-gray-500">Sort by</span>
        <select
          value={sortKey}
          onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
          className="h-9 rounded-lg border-2 border-gray-200 px-3 text-sm font-semibold bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={onToggleSortDir}
          title={sortDir === "asc" ? "Ascending" : "Descending"}
          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span className="sr-only">{sortDir}</span>
        </button>
        <button
          onClick={onExportView}
          title="Export this view to Excel"
          className="h-9 inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          <FileDown className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
}

const BUCKET_TABS: { key: BucketKey; label: string; icon: React.ReactNode }[] = [
  { key: "top30", label: "Overall Top 30 (Oral)", icon: <Trophy className="w-4 h-4" /> },
  { key: "subThemeTop5", label: "Sub-theme Top 5 (Oral)", icon: <Layers className="w-4 h-4" /> },
  { key: "posters", label: "Posters (≥ 2.5)", icon: <ImageIcon className="w-4 h-4" /> },
  { key: "pending", label: "Pending (< 2.5)", icon: <ClockIcon className="w-4 h-4" /> },
];

// ─── Custom message modal ───────────────────────────────────────────────
// Two modes:
//  - "category": broadcast to everyone in a named bucket (oral / poster /
//    pending / rejected / all) — free text, admin picks the category here.
//  - "selected": send to exactly the abstract IDs the admin checked in the
//    table, regardless of which bucket each one is in.
// Either way this hits the same /abstracts/notifications/custom endpoint
// and never touches the automated decision emails or decision_notified_at.

type MessageCategory = "oral" | "poster" | "pending" | "rejected" | "all";

const MESSAGE_CATEGORIES: { value: MessageCategory; label: string }[] = [
  { value: "oral", label: "Oral presenters" },
  { value: "poster", label: "Poster presenters" },
  { value: "pending", label: "Pending (not yet decided)" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "Everyone" },
];

function CustomMessageModal({
  isOpen,
  onClose,
  onSent,
  mode,
  selectedIds,
  recipientCounts,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
  mode: "category" | "selected";
  selectedIds: number[];
  recipientCounts: Record<MessageCategory, number>;
}) {
  const [category, setCategory] = useState<MessageCategory>("oral");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubject("");
      setMessage("");
      setCategory("oral");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const recipientCount = mode === "selected" ? selectedIds.length : recipientCounts[category] ?? 0;

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are both required.");
      return;
    }
    try {
      setSubmitting(true);
      const payload =
        mode === "selected"
          ? { abstractIds: selectedIds, subject: subject.trim(), message: message.trim() }
          : { category, subject: subject.trim(), message: message.trim() };
      const { data } = await api.post("/abstracts/notifications/custom", payload);
      toast.success(data?.message || "Message sent.");
      onSent();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-teal-700" />
              {mode === "selected" ? "Message Selected Abstracts" : "Message a Category"}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {mode === "selected"
                ? `Free-text message to the ${selectedIds.length} abstract(s) you've selected — e.g. a reclassification notice.`
                : "Free-text message to every author currently in the chosen category."}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === "category" && (
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Send to</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MessageCategory)}
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                {MESSAGE_CATEGORIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({recipientCounts[opt.value] ?? 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Update on your presentation format"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message. Separate paragraphs with a blank line."
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm font-medium outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
            />
          </div>

          <p className="text-xs text-gray-400">
            This will send to <span className="font-bold text-gray-600">{recipientCount}</span> recipient(s).
            It won't change any abstract's status or presentation type.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-6" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0 px-6"
            onClick={handleSend}
            disabled={submitting || recipientCount === 0}
          >
            <span className="inline-flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Sending..." : `Send to ${recipientCount}`}
            </span>
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

  const [subThemeFilter, setSubThemeFilter] = useState<string>("all");
  const [notifiedFilter, setNotifiedFilter] = useState<NotifiedFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Cross-tab selection: an admin can check a couple of oral presenters
  // and a couple of pending abstracts and message all of them at once.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [messageModal, setMessageModal] = useState<"category" | "selected" | null>(null);

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

  // Reset sort-by-rank to something sensible when switching into a bucket
  // that has no official rank (posters / pending), so "Rank" doesn't
  // silently no-op there.
  useEffect(() => {
    if ((activeTab === "posters" || activeTab === "pending") && sortKey === "rank") {
      setSortKey("score");
    }
  }, [activeTab, sortKey]);

  async function handleSendIndividual(abstractId: number) {
    try {
      setNotifyingId(abstractId);
      await api.post(`/abstracts/${abstractId}/notify`);
      toast.success("Notification sent.");
      await fetchPreview();
      setViewingRow((prev) => (prev && prev.abstract.id === abstractId ? { ...prev, notified: true } : prev));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send notification.");
    } finally {
      setNotifyingId(null);
    }
  }

  const bucketRows = data ? data[activeTab] : [];

  const visibleRows = useMemo(() => {
    let rows = bucketRows;

    if (subThemeFilter !== "all") {
      rows = rows.filter((r) => r.abstract.subTheme === subThemeFilter);
    }

    if (notifiedFilter === "notified") {
      rows = rows.filter((r) => r.notified);
    } else if (notifiedFilter === "not_notified") {
      rows = rows.filter((r) => !r.notified);
    }

    const withOrder = rows.map((row, idx) => ({ row, originalIndex: idx }));

    withOrder.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "rank": {
          const ra = a.row.rank ?? a.row.subThemeRank ?? Number.MAX_SAFE_INTEGER;
          const rb = b.row.rank ?? b.row.subThemeRank ?? Number.MAX_SAFE_INTEGER;
          cmp = ra - rb;
          break;
        }
        case "score": {
          const sa = a.row.abstract.averageScore ?? -Infinity;
          const sb = b.row.abstract.averageScore ?? -Infinity;
          cmp = sb - sa; // higher score first by default
          break;
        }
        case "title":
          cmp = a.row.abstract.title.localeCompare(b.row.abstract.title);
          break;
        case "submitted":
          cmp = new Date(a.row.abstract.submittedAt).getTime() - new Date(b.row.abstract.submittedAt).getTime();
          break;
      }
      if (cmp === 0) cmp = a.originalIndex - b.originalIndex;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return withOrder.map((w) => w.row);
  }, [bucketRows, subThemeFilter, notifiedFilter, sortKey, sortDir]);

  const isPendingTab = activeTab === "pending";

  // When a sub-theme filter is active and a row has no official rank
  // (posters / pending), the list position within the filtered+sorted
  // view IS effectively "rank within this sub-theme" — this caption
  // makes that reading explicit instead of implying an official rank.
  const subThemeFilterLabel = subThemeFilter !== "all" ? subThemeLabel(subThemeFilter) : null;

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.abstract.id));

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleRows.forEach((r) => next.delete(r.abstract.id));
      } else {
        visibleRows.forEach((r) => next.add(r.abstract.id));
      }
      return next;
    });
  }

  // Recipient counts per category, for the category-message modal's
  // dropdown. Oral = top30 + subThemeTop5.
  const categoryCounts: Record<MessageCategory, number> = {
    oral: (data?.counts?.top30 ?? 0) + (data?.counts?.subThemeTop5 ?? 0),
    poster: data?.counts?.posters ?? 0,
    pending: data?.counts?.pending ?? 0,
    rejected: 0, // not tracked in the preview buckets — resolved server-side when sending
    all: (data?.counts?.top30 ?? 0) + (data?.counts?.subThemeTop5 ?? 0) + (data?.counts?.posters ?? 0) + (data?.counts?.pending ?? 0),
  };

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
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-2xl h-12 px-5 border-2"
              onClick={() => data && exportAllToExcel(data)}
              disabled={!data}
            >
              <span className="inline-flex items-center gap-2 font-bold">
                <Download className="w-5 h-5" />
                Export All
              </span>
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl h-12 px-5 border-2"
              onClick={() => setMessageModal("category")}
            >
              <span className="inline-flex items-center gap-2 font-bold">
                <Megaphone className="w-5 h-5" />
                Message Category
              </span>
            </Button>
            <Button className="rounded-2xl h-12 px-5 bg-indigo-600 border-0" onClick={() => setIsRunOpen(true)}>
              <span className="inline-flex items-center gap-2">
                <PlayCircle className="w-5 h-5" />
                Run Classification
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary counts / tab selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {BUCKET_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-2xl border-2 p-5 text-left transition-colors ${
              activeTab === tab.key ? "border-teal-500 bg-teal-50" : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              {tab.icon}
              <span className="text-xs font-bold uppercase">{tab.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : data?.counts?.[tab.key] ?? 0}</p>
          </button>
        ))}
      </div>

      <Toolbar
        subThemeFilter={subThemeFilter}
        onSubThemeFilterChange={setSubThemeFilter}
        notifiedFilter={notifiedFilter}
        onNotifiedFilterChange={setNotifiedFilter}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        sortDir={sortDir}
        onToggleSortDir={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        onExportView={() =>
          exportViewToExcel(
            BUCKET_TABS.find((t) => t.key === activeTab)?.label ?? activeTab,
            visibleRows,
            subThemeFilter !== "all"
          )
        }
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-20 text-center text-gray-500">
          Nothing matches the current filter.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="text-left px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-teal-600"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible rows"
                  />
                </th>
                <th className="text-left px-5 py-3">
                  {subThemeFilterLabel ? `Rank (${subThemeFilterLabel})` : "Rank"}
                </th>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Score</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleRows.map((row, idx) => (
                <tr
                  key={row.abstract.id}
                  className={`hover:bg-gray-50 ${selectedIds.has(row.abstract.id) ? "bg-teal-50/50" : ""}`}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-teal-600"
                      checked={selectedIds.has(row.abstract.id)}
                      onChange={() => toggleSelected(row.abstract.id)}
                      aria-label={`Select ${row.abstract.title}`}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <RankBadge
                      officialRank={row.rank ?? row.subThemeRank}
                      isSubTheme={!row.rank && !!row.subThemeRank}
                      listPosition={idx + 1}
                      caption={
                        !row.rank && !row.subThemeRank && subThemeFilterLabel
                          ? `in ${subThemeFilterLabel}`
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{row.abstract.reference}</td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="font-semibold text-gray-900 line-clamp-1">{row.abstract.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(row.abstract.submittedAt)}
                      {" · "}
                      {subThemeLabel(row.abstract.subTheme)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <ScoreBadge score={row.abstract.averageScore} />
                  </td>
                  <td className="px-5 py-4">
                    <NotifiedBadge notified={row.notified} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingRow(row)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="View details"
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

      {/* Sticky selection bar — appears once at least one row is checked */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-2xl bg-gray-900 text-white shadow-2xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-semibold">
            {selectedIds.size} abstract{selectedIds.size === 1 ? "" : "s"} selected
          </span>
          <Button
            className="rounded-xl h-9 px-4 bg-teal-500 border-0 text-xs"
            onClick={() => setMessageModal("selected")}
          >
            <span className="inline-flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Send Message
            </span>
          </Button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-semibold text-gray-300 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      <RunClassificationModal isOpen={isRunOpen} onClose={() => setIsRunOpen(false)} onDone={fetchPreview} />
      <ManualClassifyModal row={classifyingRow} onClose={() => setClassifyingRow(null)} onDone={fetchPreview} />
      <ViewAbstractModal
        row={viewingRow}
        onClose={() => setViewingRow(null)}
        onSendEmail={handleSendIndividual}
        sending={viewingRow != null && notifyingId === viewingRow.abstract.id}
      />
      <CustomMessageModal
        isOpen={messageModal !== null}
        onClose={() => setMessageModal(null)}
        onSent={() => {
          if (messageModal === "selected") setSelectedIds(new Set());
          fetchPreview();
        }}
        mode={messageModal ?? "category"}
        selectedIds={Array.from(selectedIds)}
        recipientCounts={categoryCounts}
      />
    </Layout>
  );
}