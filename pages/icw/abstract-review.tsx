import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  Star,
  CheckCircle2,
  Clock as ClockIcon,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import {
  Abstract,
  REJECTION_REASONS,
  SUB_THEMES,
  ReviewScores,
} from "../../types/abstract-type";

function subThemeLabel(value: string) {
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

// ─── Local button (no external UI kit dependency) ──────────────────────────

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

// ─── Score selector (1-5 segmented control) ────────────────────────────────

function ScorePicker({
  label,
  helpText,
  value,
  onChange,
}: {
  label: string;
  helpText: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <p className="text-xs text-gray-500 mb-2">{helpText}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-11 h-11 rounded-xl border-2 font-bold text-sm transition-colors ${
              value === n
                ? "bg-teal-600 border-teal-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-teal-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Review Modal ───────────────────────────────────────────────────────────

function ReviewModal({
  abstract,
  onClose,
  onSubmitted,
}: {
  abstract: Abstract | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [scores, setScores] = useState<ReviewScores>({
    significance: 0,
    relevance: 0,
    originality: 0,
  });
  const [comment, setComment] = useState("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setScores({ significance: 0, relevance: 0, originality: 0 });
    setComment("");
    setRejectionReason("");
  }, [abstract]);

  if (!abstract) return null;

  const allScored =
    scores.significance > 0 && scores.relevance > 0 && scores.originality > 0;
  const average = allScored
    ? (scores.significance + scores.relevance + scores.originality) / 3
    : 0;

  async function handleSubmit() {
    if (!allScored) {
      toast.error("Please score all three criteria before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/abstracts/${abstract.id}/review`, {
        scores,
        comment: comment.trim(),
        recommendedRejectionReason: rejectionReason || null,
      });
      toast.success("Review submitted.");
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              {subThemeLabel(abstract.subTheme)}
            </p>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mt-1">
              {abstract.title}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">
              Abstract text
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto rounded-xl bg-gray-50 p-4">
              {abstract.body}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Author names are withheld here to support blind review.
            </p>
          </div>

          <div className="space-y-5">
            <ScorePicker
              label="Significance"
              helpText="Importance and potential impact of the study and its findings."
              value={scores.significance}
              onChange={(v) => setScores((s) => ({ ...s, significance: v }))}
            />
            <ScorePicker
              label="Relevance"
              helpText="Relevance to cancer care, prevention, epidemiology, health services, or inclusiveness."
              value={scores.relevance}
              onChange={(v) => setScores((s) => ({ ...s, relevance: v }))}
            />
            <ScorePicker
              label="Originality"
              helpText="How unique, novel, and innovative the information, methods, or results are."
              value={scores.originality}
              onChange={(v) => setScores((s) => ({ ...s, originality: v }))}
            />
          </div>

          {allScored && (
            <div className="rounded-xl bg-teal-50 p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-teal-900">
                Average score
              </span>
              <span className="text-lg font-bold text-teal-900 inline-flex items-center gap-1">
                <Star className="w-4 h-4" />
                {average.toFixed(2)}
              </span>
            </div>
          )}

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Comments <span className="text-gray-400 font-normal">(shared with the committee)</span>
            </label>
            <textarea
              className="w-full h-28 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none resize-none"
              placeholder="Strengths, weaknesses, and any concerns..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Flag for rejection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-teal-500 focus:ring-teal-500 outline-none"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            >
              <option value="">No rejection flag</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" className="rounded-2xl h-11 px-5" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <span className="inline-flex items-center gap-2">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {submitting ? "Submitting..." : "Submit Review"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ReviewerDashboardPage() {
  const [assigned, setAssigned] = useState<Abstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Abstract | null>(null);
  const [tab, setTab] = useState<"pending" | "completed">("pending");

  async function fetchAssigned() {
    try {
      setLoading(true);
      const { data } = await api.get("/abstracts/reviews/assigned");
      setAssigned(data?.data?.items || data?.data || []);
    } catch (err) {
      toast.error("Failed to load your assigned abstracts.");
      setAssigned([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssigned();
  }, []);

  // Assumes the API scopes /reviews/assigned to the current reviewer and
  // includes only their own ReviewerAssignment entry per abstract.
  const pending = useMemo(
    () =>
      assigned.filter(
        (a) => a.reviewers[0] && a.reviewers[0].status !== "submitted"
      ),
    [assigned]
  );
  const completed = useMemo(
    () =>
      assigned.filter(
        (a) => a.reviewers[0] && a.reviewers[0].status === "submitted"
      ),
    [assigned]
  );

  const list = tab === "pending" ? pending : completed;

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <PageTitle>My Abstract Reviews</PageTitle>
        <p className="mt-2 text-sm text-gray-600">
          Score assigned abstracts on significance, relevance, and originality
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
            tab === "pending"
              ? "bg-teal-600 text-white"
              : "bg-white border-2 border-gray-200 text-gray-600"
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
            tab === "completed"
              ? "bg-teal-600 text-white"
              : "bg-white border-2 border-gray-200 text-gray-600"
          }`}
        >
          Completed ({completed.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-20 text-center">
          <FileText className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-600">
            {tab === "pending"
              ? "No abstracts pending your review"
              : "You haven't completed any reviews yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {list.map((a) => {
            const mine = a.reviewers[0];
            return (
              <div
                key={a.id}
                className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-6"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700 mb-1">
                  {subThemeLabel(a.subTheme)}
                </p>
                <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-3">
                  {a.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">{a.body}</p>

                {mine?.status === "submitted" && mine.review ? (
                  <div className="rounded-xl bg-teal-50 p-3 mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-teal-900">
                      Your score
                    </span>
                    <span className="text-base font-bold text-teal-900 inline-flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {mine.review.average.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-700 mb-4">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Awaiting your review
                  </div>
                )}

                <Button
                  className="w-full rounded-2xl h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                  onClick={() => setReviewing(a)}
                  disabled={mine?.status === "submitted"}
                >
                  {mine?.status === "submitted" ? "Review submitted" : "Score this abstract"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ReviewModal
        abstract={reviewing}
        onClose={() => setReviewing(null)}
        onSubmitted={fetchAssigned}
      />
    </Layout>
  );
}