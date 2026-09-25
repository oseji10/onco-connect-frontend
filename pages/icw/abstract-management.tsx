"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Loader2,
  Eye,
  UserPlus,
  Users,
  Star,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Mail,
  RefreshCw,
  GitBranch,
  CalendarDays,
  MessageSquare,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import {
  Abstract,
  AbstractStatus,
  Reviewer,
  SUB_THEMES,
  formatDate,
} from "../../types/abstract-type";

// ─── Types ────────────────────────────────────────────────────────────────

type AbstractVersion = {
  id: number;
  reference: string;
  version: number;
  is_current: boolean;
  status: string;
  title: string;
  body: string | null;
  keywords: string[] | string | null;
  sub_theme: string | null;
  presentation_type: string | null;
  resubmission_note: string | null;
  submitted_at: string | null;
  resubmitted_at: string | null;
  reviews: {
    reviewer_name: string | null;
    status: string;
    is_resubmission_review: boolean;
    review: {
      significance?: number | null;
      relevance?: number | null;
      originality?: number | null;
      average: number;
      comment: string | null;
      submitted_at?: string | null;
    } | null;
  }[];
};

type VersionResponse = {
  success?: boolean;
  data?: AbstractVersion[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AbstractStatus | string }) {
  const styles: Record<string, string> = {
    submitted: "bg-gray-100 text-gray-700",
    under_review: "bg-yellow-100 text-yellow-800",
    scored: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    scored: "Scored",
    accepted: "Accepted",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {labels[status] || String(status).replace(/_/g, " ")}
    </span>
  );
}

function subThemeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeVersion(v: any): AbstractVersion {
  return {
    id: Number(v?.id ?? 0),
    reference: v?.reference ?? "",
    version: Number(v?.version ?? 1),
    is_current: Boolean(v?.is_current ?? v?.isCurrent ?? false),
    status: v?.status ?? "submitted",
    title: v?.title ?? "",
    body: v?.body ?? null,
    keywords: v?.keywords ?? null,
    sub_theme: v?.sub_theme ?? v?.subTheme ?? null,
    presentation_type: v?.presentation_type ?? v?.presentationType ?? null,
    resubmission_note:
      v?.resubmission_note ?? v?.resubmissionNote ?? null,
    submitted_at: v?.submitted_at ?? v?.submittedAt ?? null,
    resubmitted_at: v?.resubmitted_at ?? v?.resubmittedAt ?? null,
    reviews: Array.isArray(v?.reviews)
      ? v.reviews.map((r: any) => ({
          reviewer_name:
            r?.reviewer_name ?? r?.reviewerName ?? null,
          status: r?.status ?? "pending",
          is_resubmission_review: Boolean(
            r?.is_resubmission_review ?? r?.isResubmissionReview ?? false,
          ),
          review: r?.review
            ? {
                significance: r.review.significance ?? null,
                relevance: r.review.relevance ?? null,
                originality: r.review.originality ?? null,
                average: Number(r.review.average ?? 0),
                comment: r.review.comment ?? null,
                submitted_at:
                  r.review.submitted_at ?? r.review.submittedAt ?? null,
              }
            : null,
        }))
      : [],
  };
}

function reviewTally(abstract: Abstract) {
  const total = abstract.reviewers.length;
  const done = abstract.reviewers.filter(
    (r) => r.status === "submitted" || r.review !== null,
  ).length;
  return { total, done };
}

function ReviewProgressPill({
  total,
  done,
  compact = false,
}: {
  total: number;
  done: number;
  compact?: boolean;
}) {
  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 px-2.5 py-1 text-xs font-semibold">
        <AlertCircle className="w-3.5 h-3.5" />
        {compact ? "Not reviewed" : "No reviewers assigned"}
      </span>
    );
  }
  if (done === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 text-yellow-700 px-2.5 py-1 text-xs font-semibold">
        <ClockIcon className="w-3.5 h-3.5" />
        {compact ? `0/${total}` : `0/${total} reviewed`}
      </span>
    );
  }
  if (done < total) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-semibold">
        <ClockIcon className="w-3.5 h-3.5" />
        {done}/{total}
        {!compact && " reviewed"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 px-2.5 py-1 text-xs font-semibold">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {compact ? `${done}/${total}` : `Reviewed ${done}/${total}`}
    </span>
  );
}

// ─── Local UI primitives ─────────────────────────────────────────────────

function Button({
  children,
  onClick,
  className = "",
  disabled = false,
  variant = "solid",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "solid" | "outline";
  title?: string;
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
      title={title}
      className={`inline-flex items-center justify-center font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${base} ${className}`}
    >
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`text-sm font-medium outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${className}`}
    />
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  label,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (limit: number) => void;
  label?: string;
}) {
  const options = [10, 20, 50, 100, 200, 500, 1000];
  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  function go(p: number) {
    const clamped = Math.min(Math.max(1, p), totalPages);
    onPageChange(clamped);
  }

  return (
    <nav
      aria-label={label}
      className="flex flex-col sm:flex-row items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          Showing <span className="font-semibold">{startItem}</span> to{" "}
          <span className="font-semibold">{endItem}</span> of{" "}
          <span className="font-semibold">{totalItems}</span> results
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rows:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-9 rounded-lg border-2 border-gray-200 px-2 text-sm font-semibold bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Previous
        </button>
        <span className="text-sm text-gray-500 px-2">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

// ─── Invite Reviewer Modal ─────────────────────────────────────────────────

function InviteReviewerModal({
  isOpen,
  onClose,
  onInvited,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleInvite() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/abstracts/reviewers/invite", {
        name: name.trim(),
        email: email.trim(),
        affiliation: affiliation.trim(),
      });
      toast.success(`Invitation sent to ${email.trim()}`);
      setName("");
      setEmail("");
      setAffiliation("");
      onInvited();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to send invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Invite Reviewer</h3>
            <p className="text-sm text-gray-500 mt-1">
              Send an invitation to join the Abstract Committee's reviewer pool
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200 w-full px-4"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200 w-full px-4"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200 w-full px-4"
            placeholder="Affiliation (optional)"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-11 px-6"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0 px-6"
            onClick={handleInvite}
            disabled={submitting}
          >
            <span className="inline-flex items-center gap-2">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {submitting ? "Sending..." : "Send Invite"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Reviewers Modal ─────────────────────────────────────────────────

function AssignReviewersModal({
  abstract,
  reviewers,
  onClose,
  onAssigned,
}: {
  abstract: Abstract | null;
  reviewers: Reviewer[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (abstract) {
      setSelected(abstract.reviewers.map((r) => r.reviewerId));
    }
  }, [abstract]);

  if (!abstract) return null;

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleAssign() {
    if (!abstract) return;
    if (selected.length < 2) {
      toast.error("Assign at least two reviewers per abstract.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/abstracts/${abstract.id}/assign-reviewers`, {
        reviewerIds: selected,
      });
      toast.success("Reviewers assigned.");
      onAssigned();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to assign reviewers.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-start justify-between sticky top-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">
              Assign Reviewers
            </h3>
            <p className="text-sm text-gray-500 mt-1 break-words whitespace-normal">
              {abstract.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            At least two reviewers are required. The final score is the
            average across submitted reviews.
          </p>
          {reviewers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No reviewers yet — invite one first.
            </p>
          ) : (
            reviewers.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-teal-200 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-teal-600"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {r.name}
                  </p>
                  <p className="text-xs text-gray-500">{r.email}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {r.completedCount}/{r.assignedCount} completed
                </span>
              </label>
            ))
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-2xl h-11 px-6"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0 px-6"
            onClick={handleAssign}
            disabled={submitting}
          >
            {submitting ? "Assigning..." : `Assign (${selected.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Version History Modal ─────────────────────────────────────────────────

function VersionHistoryModal({
  abstract,
  onClose,
  onViewVersion,
}: {
  abstract: Abstract | null;
  onClose: () => void;
  onViewVersion: (versionId: number) => void;
}) {
  const [versions, setVersions] = useState<AbstractVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!abstract) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<VersionResponse>(`/abstracts/${abstract.id}/versions`)
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data?.data)
          ? data.data.map(normalizeVersion)
          : [];
        // Original version first (ascending).
        list.sort((a, b) => a.version - b.version);
        setVersions(list);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load version history.");
          setVersions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [abstract]);

  if (!abstract) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs text-gray-500">
                {abstract.reference}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <GitBranch className="w-3.5 h-3.5" />
                {loading
                  ? "Loading versions…"
                  : `${versions.length} ${
                      versions.length === 1 ? "version" : "versions"
                    }`}
              </span>
              <StatusBadge status={abstract.status} />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold leading-snug text-gray-900 break-words whitespace-normal">
              {abstract.title}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Version history and reviewer feedback — original version first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(92vh-120px)] overflow-y-auto bg-gray-50 px-4 py-5 sm:px-7">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
              <p className="mt-3 text-sm text-gray-500">
                Loading version history...
              </p>
            </div>
          ) : versions.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-200 p-10 text-center">
              <GitBranch className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">
                No version history found
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {versions.map((v) => {
                const completed = v.reviews.filter(
                  (r) => r.review !== null,
                ).length;
                const total = v.reviews.length;
                const avgScores = v.reviews
                  .filter((r) => r.review !== null)
                  .map((r) => Number(r.review?.average ?? 0))
                  .filter((n) => Number.isFinite(n));
                const avg =
                  avgScores.length > 0
                    ? avgScores.reduce((s, n) => s + n, 0) /
                      avgScores.length
                    : null;

                return (
                  <div
                    key={v.id}
                    className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${
                      v.is_current
                        ? "border-indigo-200 ring-1 ring-indigo-100"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Version heading */}
                    <div className="border-b border-gray-100 px-5 py-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                              <GitBranch className="w-3.5 h-3.5" />
                              Version {v.version}
                            </span>
                            {v.version === 1 && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Original
                              </span>
                            )}
                            {v.is_current && (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                Current
                              </span>
                            )}
                            <StatusBadge status={v.status} />
                            <ReviewProgressPill
                              total={total}
                              done={completed}
                              compact
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" />
                              Submitted {formatDate(v.submitted_at)}
                            </span>
                            <span className="font-mono">{v.reference}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {avg !== null && (
                            <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-amber-500" />
                                <span className="text-lg font-bold text-gray-900">
                                  {avg.toFixed(2)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                                Avg score
                              </p>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewVersion(v.id)}
                            className="h-10 px-4 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-5">
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Title
                        </p>
                        <h3 className="text-base sm:text-lg font-bold leading-relaxed text-gray-900 break-words whitespace-normal">
                          {v.title || "Untitled abstract"}
                        </h3>
                      </div>

                      {v.resubmission_note && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Resubmission note
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-amber-900 whitespace-pre-wrap break-words">
                            {v.resubmission_note}
                          </p>
                          {v.resubmitted_at && (
                            <p className="mt-2 text-xs text-amber-700">
                              Resubmitted {formatDateTime(v.resubmitted_at)}
                            </p>
                          )}
                        </div>
                      )}

                      {v.body && (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Abstract
                          </p>
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 max-h-64 overflow-y-auto">
                            <p className="text-sm leading-7 text-gray-700 whitespace-pre-wrap break-words">
                              {v.body}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              Reviewer feedback
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {completed} of {total} review
                              {total === 1 ? "" : "s"} completed
                            </p>
                          </div>
                          <MessageSquare className="w-5 h-5 text-gray-300" />
                        </div>

                        {total === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                            <ClockIcon className="w-7 h-7 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm font-semibold text-gray-600">
                              Awaiting reviewer assignment
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {v.reviews.map((r, idx) => (
                              <div
                                key={`${v.id}-rev-${idx}`}
                                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                                      <User className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 truncate">
                                        {r.reviewer_name || "Reviewer"}
                                      </p>
                                      {r.is_resubmission_review && (
                                        <p className="text-[10px] text-indigo-600">
                                          Resubmission review
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {r.review && (
                                    <div className="shrink-0 flex items-center gap-1 rounded-lg bg-white px-3 py-2 border border-gray-100">
                                      <Star className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-sm font-bold text-gray-800">
                                        {Number(r.review.average).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {r.review ? (
                                  <div className="mt-3">
                                    {r.review.comment && (
                                      <p className="text-sm leading-6 text-gray-700 whitespace-pre-wrap break-words">
                                        {r.review.comment}
                                      </p>
                                    )}
                                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
                                      {r.review.significance != null && (
                                        <span>
                                          Significance:{" "}
                                          <strong>
                                            {r.review.significance}
                                          </strong>
                                        </span>
                                      )}
                                      {r.review.relevance != null && (
                                        <span>
                                          Relevance:{" "}
                                          <strong>{r.review.relevance}</strong>
                                        </span>
                                      )}
                                      {r.review.originality != null && (
                                        <span>
                                          Originality:{" "}
                                          <strong>
                                            {r.review.originality}
                                          </strong>
                                        </span>
                                      )}
                                      {r.review.submitted_at && (
                                        <span>
                                          Reviewed{" "}
                                          {formatDateTime(
                                            r.review.submitted_at,
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                                    Awaiting this reviewer's submission.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View Abstract Modal (single version) ─────────────────────────────────

function ViewAbstractModal({
  versionId,
  fallback,
  onClose,
  onDecision,
}: {
  /** The version id to fetch. If null and fallback is provided, fallback is used. */
  versionId: number | null;
  /** Optional preloaded object (used when opening from a row). */
  fallback?: Abstract | null;
  onClose: () => void;
  onDecision: (id: number, status: "accepted" | "rejected") => void;
}) {
  const [loaded, setLoaded] = useState<Abstract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have an id, always fetch fresh (this lets us open specific versions).
    if (versionId != null) {
      setLoading(true);
      setError(null);
      api
        .get(`/abstracts/${versionId}`)
        .then(({ data }) => setLoaded(data?.data ?? null))
        .catch((err) =>
          setError(
            err?.response?.data?.message ||
              "Failed to load this abstract version.",
          ),
        )
        .finally(() => setLoading(false));
      return;
    }
    // Otherwise use the fallback if provided.
    setLoaded(fallback ?? null);
    setError(null);
  }, [versionId, fallback]);

  // Nothing to show and nothing to fetch
  if (versionId == null && !fallback) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl p-10 flex flex-col items-center">
          <Loader2 className="w-9 h-9 animate-spin text-teal-600" />
          <p className="mt-3 text-sm text-gray-500">Loading abstract…</p>
        </div>
      </div>
    );
  }

  if (error || !loaded) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700">
            {error ?? "This abstract could not be loaded."}
          </p>
          <button
            onClick={onClose}
            className="mt-5 h-11 px-6 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const hasReceivedReview = loaded.reviewers.some(
    (r) => r.status === "submitted" || r.review !== null,
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-5 sm:px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs text-gray-500">
                {loaded.reference}
              </span>
              {loaded.version === 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">
                  Original
                </span>
              )}
              {loaded.version > 1 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  <GitBranch className="w-3 h-3" />
                  v{loaded.version}
                </span>
              )}
              <StatusBadge status={loaded.status} />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold leading-snug text-gray-900 break-words whitespace-normal">
              {loaded.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 shrink-0 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">
                Sub-theme
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {subThemeLabel(loaded.subTheme)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">
                Status
              </p>
              <StatusBadge status={loaded.status} />
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">
                Presentation type
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {loaded.presentationType}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">
                Average score
              </p>
              <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                {loaded.averageScore != null
                  ? Number(loaded.averageScore).toFixed(2)
                  : "Pending reviews"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">
              Authors
            </p>
            <div className="space-y-2">
              {loaded.authors.map((a) => (
                <div key={a.id} className="text-sm">
                  <span className="font-semibold text-gray-900">{a.name}</span>
                  {a.isCorresponding && (
                    <span className="ml-2 text-xs text-teal-700 font-bold">
                      (Corresponding)
                    </span>
                  )}
                  <p className="text-xs text-gray-500">{a.affiliation}</p>
                  <p className="text-xs text-gray-500">{a.email}</p>
                  {a.phone && (
                    <p className="text-xs text-gray-500">{a.phone}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">
              Abstract
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto rounded-xl bg-gray-50 p-4 break-words">
              {loaded.body ?? "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">
              Reviewers &amp; scores
            </p>
            {loaded.reviewers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No reviewers assigned yet.
              </p>
            ) : (
              <div className="space-y-3">
                {loaded.reviewers.map((r) => (
                  <div
                    key={r.reviewerId}
                    className="rounded-xl border-2 border-gray-100 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {r.reviewerName}
                      </p>
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
                          Significance {r.review.scores.significance} · Relevance{" "}
                          {r.review.scores.relevance} · Originality{" "}
                          {r.review.scores.originality} —{" "}
                          <span className="font-bold">
                            avg {r.review.average.toFixed(2)}
                          </span>
                        </p>
                        {r.review.comment && (
                          <p className="italic text-gray-500 whitespace-pre-wrap break-words">
                            "{r.review.comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-gray-100">
          {!hasReceivedReview && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                At least one review is required before making a decision.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              className="flex-1 rounded-2xl h-11 bg-green-600 hover:bg-green-700 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onDecision(loaded.id, "accepted")}
              disabled={!hasReceivedReview}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Accept
            </Button>
            <Button
              className="flex-1 rounded-2xl h-11 bg-red-600 hover:bg-red-700 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onDecision(loaded.id, "rejected")}
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button
              variant="outline"
              className="rounded-2xl h-11 px-6"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AbstractManagementPage() {
  const [abstracts, setAbstracts] = useState<Abstract[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSubTheme, setFilterSubTheme] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [assigningAbstract, setAssigningAbstract] = useState<Abstract | null>(
    null,
  );
  const [versionsAbstract, setVersionsAbstract] = useState<Abstract | null>(
    null,
  );
  const [resendingId, setResendingId] = useState<number | null>(null);

  // View modal state — we now track a version id we want to inspect.
  const [viewingVersionId, setViewingVersionId] = useState<number | null>(null);
  const [viewingFallback, setViewingFallback] = useState<Abstract | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const fetchAbstracts = useCallback(
    async (page = currentPage, limit = itemsPerPage) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("perPage", limit.toString());

        if (debouncedSearch.trim()) {
          params.append("search", debouncedSearch.trim());
        }
        if (filterStatus !== "all") params.append("status", filterStatus);
        if (filterSubTheme !== "all")
          params.append("subTheme", filterSubTheme);

        const { data } = await api.get(`/abstracts?${params.toString()}`);
        const responseData = data?.data;

        setAbstracts(responseData?.items || []);
        setTotalItems(responseData?.total || 0);
        setTotalPages(responseData?.totalPages || 1);
        setCurrentPage(responseData?.page || 1);
      } catch (err) {
        toast.error("Failed to load abstracts.");
        setAbstracts([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, filterStatus, filterSubTheme],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchAbstracts(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, fetchAbstracts]);

  async function fetchReviewers() {
    try {
      const { data } = await api.get("/abstracts/reviewers");
      setReviewers(data?.data?.items || data?.data || []);
    } catch (err) {
      setReviewers([]);
    }
  }

  async function handleResendInvite(reviewerId: number, email: string) {
    try {
      setResendingId(reviewerId);
      await api.post(`/abstracts/reviewers/${reviewerId}/resend-invite`);
      toast.success(`Invitation resent to ${email}.`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to resend invitation.",
      );
    } finally {
      setResendingId(null);
    }
  }

  useEffect(() => {
    fetchReviewers();
  }, []);

  async function handleDecision(
    id: number,
    status: "accepted" | "rejected",
  ) {
    try {
      await api.patch(`/abstracts/${id}/status`, { status });
      toast.success(`Abstract ${status}.`);
      closeViewModal();
      await fetchAbstracts(currentPage, itemsPerPage);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  }

  // ─── View Modal helpers ─────────────────────────────────────────────

  /**
   * Opens the view modal on the ORIGINAL (v1) version of the given abstract.
   * We fetch the version chain, sort ascending, and pick the first item.
   * If the fetch fails, we fall back to the row object so the modal still
   * opens on the current version.
   */
  async function openViewModalAtFirstVersion(row: Abstract) {
    // Set fallback immediately so the modal opens fast even if the fetch
    // takes a moment.
    setViewingFallback(row);
    setViewingVersionId(null);

    try {
      const { data } = await api.get<VersionResponse>(
        `/abstracts/${row.id}/versions`,
      );
      const list = Array.isArray(data?.data)
        ? data.data.map(normalizeVersion)
        : [];
      if (list.length === 0) return;
      // Ascending → index 0 is the original version.
      list.sort((a, b) => a.version - b.version);
      const original = list[0];
      setViewingVersionId(original.id);
      setViewingFallback(null);
    } catch {
      // Leave fallback in place; user still sees something useful.
    }
  }

  function openViewModalAtVersion(versionId: number) {
    setViewingFallback(null);
    setViewingVersionId(versionId);
  }

  function closeViewModal() {
    setViewingVersionId(null);
    setViewingFallback(null);
  }

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleItemsPerPageChange = (limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  };
  const handleStatusChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };
  const handleSubThemeChange = (value: string) => {
    setFilterSubTheme(value);
    setCurrentPage(1);
  };

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle>Abstract Management</PageTitle>
            <p className="mt-2 text-sm text-gray-600">
              Review submissions, assign reviewers, browse versions, and record
              final decisions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-2xl h-12 px-5 border-2"
              onClick={() => setIsInviteOpen(true)}
            >
              <span className="inline-flex items-center gap-2 font-bold">
                <UserPlus className="w-5 h-5" />
                Invite Reviewer
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Reviewer pool */}
      <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-teal-700" />
          <h2 className="text-base font-bold text-gray-900">Reviewer pool</h2>
          <span className="text-xs text-gray-400">({reviewers.length})</span>
        </div>
        {reviewers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No reviewers invited yet. Use "Invite Reviewer" to build the pool.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reviewers.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {r.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{r.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {r.status === "invited" && (
                    <button
                      onClick={() => handleResendInvite(r.id, r.email)}
                      disabled={resendingId === r.id}
                      title="Resend invitation"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50"
                    >
                      {resendingId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      r.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search + filters */}
      <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Input
              className="pl-12 h-14 rounded-2xl border-2 border-gray-200 text-base font-semibold w-full px-4"
              placeholder="Search by title, reference, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
          </div>
          <select
            className="h-14 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold bg-white"
            value={filterStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="scored">Scored</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="h-14 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold bg-white"
            value={filterSubTheme}
            onChange={(e) => handleSubThemeChange(e.target.value)}
          >
            <option value="all">All Sub-themes</option>
            {SUB_THEMES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          {loading
            ? "Loading..."
            : `${totalItems} abstract${totalItems === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : abstracts.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-20 text-center text-gray-500">
          No abstracts match the current filters.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                <tr>
                  <th className="text-left px-5 py-3">Reference</th>
                  <th className="text-left px-5 py-3 min-w-[280px]">Title</th>
                  <th className="text-left px-5 py-3">Sub-theme</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Version</th>
                  <th className="text-left px-5 py-3">Avg score</th>
                  <th className="text-left px-5 py-3">Reviews</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {abstracts.map((a) => {
                  const { total, done } = reviewTally(a);
                  const hasMultipleVersions = (a.version ?? 1) > 1;

                  return (
                    <tr key={a.id} className="hover:bg-gray-50 align-top">
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">
                        {a.reference}
                      </td>
                      <td className="px-5 py-4 max-w-md">
                        <p className="font-semibold text-gray-900 leading-snug break-words whitespace-normal">
                          {a.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(a.submittedAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 max-w-[180px]">
                        {subThemeLabel(a.subTheme)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setVersionsAbstract(a)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                            hasMultipleVersions
                              ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          title="View version history"
                        >
                          <GitBranch className="w-3 h-3" />
                          v{a.version ?? 1}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {a.averageScore != null ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            {Number(a.averageScore).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <ReviewProgressPill total={total} done={done} compact />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View → opens ORIGINAL (v1) version */}
                          <button
                            onClick={() => openViewModalAtFirstVersion(a)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="View original abstract (version 1)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Version history → opens modal, original first */}
                          <button
                            onClick={() => setVersionsAbstract(a)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="View version history"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>

                          {/* Assign reviewers */}
                          <button
                            onClick={() => setAssigningAbstract(a)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="Assign reviewers"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && totalItems > 0 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            label="Abstracts navigation"
          />
        </div>
      )}

      <InviteReviewerModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvited={fetchReviewers}
      />

      <AssignReviewersModal
        abstract={assigningAbstract}
        reviewers={reviewers}
        onClose={() => setAssigningAbstract(null)}
        onAssigned={() => fetchAbstracts(currentPage, itemsPerPage)}
      />

      <ViewAbstractModal
        versionId={viewingVersionId}
        fallback={viewingFallback}
        onClose={closeViewModal}
        onDecision={handleDecision}
      />

      <VersionHistoryModal
        abstract={versionsAbstract}
        onClose={() => setVersionsAbstract(null)}
        onViewVersion={(versionId) => {
          setVersionsAbstract(null);
          openViewModalAtVersion(versionId);
        }}
      />
    </Layout>
  );
}