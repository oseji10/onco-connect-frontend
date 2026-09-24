// src/pages/reviewer/ReviewerDashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Loader2,
  Star,
  CheckCircle2,
  Clock as ClockIcon,
  FileText,
  Lock,
  Trophy,
  Award,
  TrendingUp,
  Eye,
  Users,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Layout from '../containers/Layout';
import PageTitle from '../components/Typography/PageTitle';
import api from '../../lib/api';
import {
  Abstract,
  AbstractStatus,
  REJECTION_REASONS,
  SUB_THEMES,
  ReviewScores,
  ReviewerAssignment,
} from '../../types/abstract-type';

type ConferenceSettings = {
  abstractSubmissionDeadline: string | null;
  abstractReviewDeadline: string | null;
  submissionsClosed: boolean;
  reviewsClosed: boolean;
};

type RankedAbstract = {
  rank: number;
  abstract: {
    id: number;
    reference: string;
    title: string;
    sub_theme: string;
    average_score: number;
    status: string;
    presentation_type: string;
    authors: Array<{
      id: number;
      name: string;
      email: string;
      affiliation: string;
      is_corresponding: boolean;
    }>;
  };
  average_score: number;
  review_count: number;
  sub_theme: string;
};

function subThemeLabel(value: string) {
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

// ─── Local button component ──────────────────────────────────────────────

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

// ─── Score picker component ──────────────────────────────────────────────

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
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl border-2 font-bold text-sm transition-colors ${
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
  reviewsClosed,
}: {
  abstract: Abstract | null;
  onClose: () => void;
  onSubmitted: () => void;
  reviewsClosed: boolean;
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
    if (reviewsClosed) {
      toast.error("The review deadline has passed.");
      return;
    }
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
      toast.success("Review submitted successfully.");
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              {subThemeLabel(abstract.subTheme)}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 mt-1">
              {abstract.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 break-all">{abstract.reference}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 shrink-0 p-1 -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {reviewsClosed && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-100 px-3 sm:px-4 py-3 flex items-start sm:items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm font-medium text-amber-800">
                The review deadline has passed. You can view this abstract but can't submit a score.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">
              Abstract Text
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto rounded-xl bg-gray-50 p-3 sm:p-4">
              {abstract.body}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Author names are withheld here to support blind review.
            </p>
          </div>

          <div className="space-y-4 sm:space-y-5">
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
            <div className="rounded-xl bg-teal-50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm font-semibold text-teal-900">
                Average Score
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
              className="w-full h-24 sm:h-28 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-teal-500 focus:ring-teal-500 outline-none resize-none"
              placeholder="Strengths, weaknesses, and any concerns..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Flag for Rejection <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              className="w-full h-11 sm:h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-teal-500 focus:ring-teal-500 outline-none"
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

        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl h-11 px-5 w-full sm:w-auto justify-center" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 w-full sm:w-auto justify-center"
            onClick={handleSubmit}
            disabled={submitting || reviewsClosed}
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

// ─── Abstract Detail Modal for Reviewer ──────────────────────────────────

function AbstractDetailModal({
  abstract,
  onClose,
}: {
  abstract: Abstract | null;
  onClose: () => void;
}) {
  if (!abstract) return null;

  const mine = abstract.reviewers[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
              {subThemeLabel(abstract.subTheme)}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 mt-1">
              {abstract.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 break-all">{abstract.reference}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 shrink-0 p-1 -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Status</p>
              <p className="text-sm font-semibold text-gray-900">
                {mine?.status === 'submitted' ? 'Reviewed' : 'Pending Review'}
              </p>
            </div>
            {mine?.review && (
              <div className="p-3 rounded-xl bg-teal-50">
                <p className="text-xs font-bold uppercase text-gray-500">Your Score</p>
                <p className="text-sm font-semibold text-teal-900 flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  {mine.review.average.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Abstract</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {abstract.body}
            </p>
          </div>

          {mine?.review && mine.review.comment && (
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">Your Comments</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-xl">
                {mine.review.comment}
              </p>
            </div>
          )}

          {mine?.review && mine.review.scores && (
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-2">Your Scores</p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Significance</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{mine.review.scores.significance}</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Relevance</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{mine.review.scores.relevance}</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">Originality</p>
                  <p className="text-base sm:text-lg font-bold text-gray-900">{mine.review.scores.originality}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button 
            variant="outline" 
            className="rounded-2xl h-11 px-5 sm:px-6 w-full sm:w-auto justify-center" 
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Rankings View Component ─────────────────────────────────────────────

function RankingsView({ rankings }: { rankings: any }) {
  const [selectedAbstract, setSelectedAbstract] = useState<RankedAbstract | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Check if rankings exist and have data
  if (!rankings) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">Rankings not yet available.</p>
        <p className="text-sm text-gray-400 mt-1">Check back after abstracts have been reviewed and accepted.</p>
      </div>
    );
  }

  const subThemes = Object.keys(rankings.sub_themes || {});
  const overallRankings = rankings.overall || [];

  // Check if there are any rankings to show
  if (overallRankings.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">No rankings available for your reviewed abstracts yet.</p>
        <p className="text-sm text-gray-400 mt-1">Complete more reviews to see rankings here.</p>
      </div>
    );
  }

  // Filter by selected theme - show ALL abstracts, no limit
  const filteredRankings = selectedTheme === 'all' 
    ? overallRankings 
    : overallRankings.filter((item: RankedAbstract) => item.sub_theme === selectedTheme);

  const getSubThemeRank = (abstractId: number, theme: string) => {
    const themeRankings = rankings.sub_themes?.[theme] || [];
    const found = themeRankings.find((r: any) => r.abstract.id === abstractId);
    return found?.rank || null;
  };

  const toggleExpand = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overall Rankings - Mobile Card View */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="w-full sm:w-auto">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                Your Reviewed Abstracts Rankings
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                All abstracts you've reviewed ({overallRankings.length} total)
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-500 focus:ring-teal-500 outline-none flex-1 sm:flex-none min-w-[120px]"
              >
                <option value="all">All Themes</option>
                {subThemes.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Card View - Show ALL */}
        <div className="block lg:hidden">
          <div className="divide-y divide-gray-100">
            {filteredRankings.map((item: RankedAbstract) => {
              const subThemeRank = getSubThemeRank(item.abstract.id, item.sub_theme);
              const isExpanded = expandedItems.has(item.abstract.id);
              
              return (
                <div
                  key={item.abstract.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(item.abstract.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-gradient-to-br from-yellow-400 to-orange-400 text-white font-bold rounded-full text-xs flex-shrink-0 mt-0.5">
                        {item.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                          {item.abstract.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-xs text-gray-500">{item.abstract.reference}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-500">{item.sub_theme}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-yellow-600 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {item.average_score.toFixed(1)}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Reviews</p>
                          <p className="text-sm font-bold text-gray-900">{item.review_count}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Theme Rank</p>
                          <p className="text-sm font-bold text-indigo-600">
                            {subThemeRank ? `#${subThemeRank}` : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.abstract.presentation_type === 'oral'
                            ? 'bg-green-100 text-green-800'
                            : item.abstract.presentation_type === 'poster'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.abstract.presentation_type || 'Pending'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAbstract(item);
                          }}
                          className="text-xs text-teal-600 font-bold hover:text-teal-700"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Table View - Show ALL */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Theme</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Reviews</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Theme Rank</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRankings.map((item: RankedAbstract) => {
                const subThemeRank = getSubThemeRank(item.abstract.id, item.sub_theme);
                
                return (
                  <tr
                    key={item.abstract.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAbstract(item)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 text-white font-bold rounded-full text-sm">
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {item.abstract.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.abstract.reference}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.sub_theme}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-yellow-600 flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        {item.average_score.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {item.review_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {subThemeRank ? (
                        <span className="inline-flex items-center px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                          #{subThemeRank}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${
                        item.abstract.presentation_type === 'oral'
                          ? 'bg-green-100 text-green-800'
                          : item.abstract.presentation_type === 'poster'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.abstract.presentation_type || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAbstract(item);
                        }}
                        className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRankings.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No abstracts found for the selected theme.
          </div>
        )}
      </div>

      {/* Sub-theme Rankings - Show ALL */}
      {subThemes.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Rankings by Theme
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {subThemes.map((theme) => {
              const themeRankings = rankings.sub_themes[theme] || [];
              return (
                <div
                  key={theme}
                  className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base min-w-0">
                        <Award className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="truncate">{theme}</span>
                      </h4>
                      <span className="text-xs font-medium text-gray-500 flex-shrink-0 ml-2">
                        Total: {themeRankings.length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                    {themeRankings.map((item: RankedAbstract) => (
                      <div
                        key={item.abstract.id}
                        className="p-2.5 sm:p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedAbstract(item)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-indigo-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex-shrink-0">
                              {item.rank}
                            </span>
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                              {item.abstract.title}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-yellow-600 flex items-center gap-1 flex-shrink-0">
                            <Star className="w-3 h-3 fill-current" />
                            {item.average_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {themeRankings.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No abstracts ranked in this theme yet.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abstract Detail Modal */}
      {selectedAbstract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
          <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50 sticky top-0 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                    <Trophy className="w-3 h-3" />
                    Rank #{selectedAbstract.rank}
                  </span>
                  <span className="text-xs text-gray-500 truncate">{selectedAbstract.sub_theme}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2">
                  {selectedAbstract.abstract.title}
                </h3>
                <p className="text-xs text-gray-500 break-all">
                  {selectedAbstract.abstract.reference}
                </p>
              </div>
              <button
                onClick={() => setSelectedAbstract(null)}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/50 transition-colors shrink-0 -mt-1"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">Score</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    {selectedAbstract.average_score.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">Reviews</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {selectedAbstract.review_count}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">Presentation</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                      selectedAbstract.abstract.presentation_type === 'oral'
                        ? 'bg-green-100 text-green-800'
                        : selectedAbstract.abstract.presentation_type === 'poster'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {selectedAbstract.abstract.presentation_type || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Authors
                </h4>
                <div className="space-y-2">
                  {selectedAbstract.abstract.authors.map((author: any) => (
                    <div key={author.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {author.name}
                            {author.is_corresponding && (
                              <span className="ml-2 text-xs text-teal-600 font-bold">
                                (Corresponding)
                              </span>
                            )}
                          </p>
                          {author.affiliation && (
                            <p className="text-xs text-gray-500 mt-0.5">{author.affiliation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAbstract.abstract.body && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Abstract
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedAbstract.abstract.body}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedAbstract(null)}
                  className="px-5 sm:px-6 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReviewerDashboardPage() {
  const [assigned, setAssigned] = useState<Abstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<Abstract | null>(null);
  const [viewing, setViewing] = useState<Abstract | null>(null);
  const [tab, setTab] = useState<'pending' | 'completed' | 'rankings'>('pending');
  const [settings, setSettings] = useState<ConferenceSettings | null>(null);
  const [rankings, setRankings] = useState<any>(null);
  const [rankingsLoading, setRankingsLoading] = useState(false);

  // ─── Fetch Functions ──────────────────────────────────────────────────────

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

  async function fetchRankings() {
    try {
      setRankingsLoading(true);
      // Use the reviewer-specific endpoint
      const { data } = await api.get("/reviewer/rankings");
      setRankings(data.data);
    } catch (err) {
      setRankings(null);
    } finally {
      setRankingsLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const { data } = await api.get("/conference-settings");
      setSettings(data?.data ?? null);
    } catch (err) {
      setSettings(null);
    }
  }

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAssigned();
    fetchSettings();
    fetchRankings();
  }, []);

  // ─── Computed Values ──────────────────────────────────────────────────────

  const reviewsClosed = !!settings?.reviewsClosed;

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

  // ─── Render Functions ────────────────────────────────────────────────────

  const renderAbstractList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-teal-600" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-10 sm:p-20 text-center">
          <FileText className="w-10 h-10 sm:w-14 sm:h-14 mx-auto text-gray-300 mb-4" />
          <p className="text-base sm:text-lg font-semibold text-gray-600">
            {tab === "pending"
              ? "No abstracts pending your review"
              : "You haven't completed any reviews yet"}
          </p>
          {tab === "completed" && (
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              Once you submit reviews, they will appear here
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {list.map((a) => {
          const mine = a.reviewers[0];
          return (
            <div
              key={a.id}
              className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-4 sm:p-6 hover:shadow-2xl transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-teal-700 mb-0.5 sm:mb-1 truncate">
                    {subThemeLabel(a.subTheme)}
                  </p>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 line-clamp-2 mb-2">
                    {a.title}
                  </h3>

                  
                </div>
                <button
                  onClick={() => setViewing(a)}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                  title="View details"
                >
                  <Eye className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-600 line-clamp-3 mb-3 sm:mb-4">{a.body}</p>

              {mine?.status === "submitted" && mine.review ? (
                <div className="rounded-xl bg-teal-50 p-2.5 sm:p-3 mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <span className="text-sm font-semibold text-teal-900">
                    Your score
                  </span>
                  <span className="text-base font-bold text-teal-900 inline-flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current" />
                    {mine.review.average.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-yellow-700 mb-3 sm:mb-4">
                  <ClockIcon className="w-3.5 h-3.5" />
                  Awaiting your review
                </div>
              )}

              <Button
                className="w-full rounded-2xl h-10 sm:h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-sm"
                onClick={() => setReviewing(a)}
                disabled={mine?.status === "submitted" || reviewsClosed}
              >
                {mine?.status === "submitted"
                  ? "Review submitted"
                  : reviewsClosed
                  ? "Review deadline passed"
                  : "Score this abstract"}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <PageTitle>My Abstract Reviews</PageTitle>
        <p className="mt-1 sm:mt-2 text-sm text-gray-600">
          Score assigned abstracts on significance, relevance, and originality
        </p>
      </div>

      {/* Deadline Warning */}
      {reviewsClosed && (
        <div className="mb-4 sm:mb-6 rounded-2xl bg-amber-50 border-2 border-amber-100 px-3 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center gap-2 sm:gap-3">
          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-xs sm:text-sm font-medium text-amber-800">
            The review deadline
            {settings?.abstractReviewDeadline
              ? ` (${new Date(settings.abstractReviewDeadline).toLocaleString()})`
              : ""}{" "}
            has passed. You can no longer submit new reviews.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        <button
          onClick={() => setTab("pending")}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-colors flex-1 sm:flex-none ${
            tab === "pending"
              ? "bg-teal-600 text-white"
              : "bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-colors flex-1 sm:flex-none ${
            tab === "completed"
              ? "bg-teal-600 text-white"
              : "bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Completed ({completed.length})
        </button>
        <button
          onClick={() => setTab("rankings")}
          className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-none ${
            tab === "rankings"
              ? "bg-teal-600 text-white"
              : "bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Rankings</span>
          <span className="xs:hidden">Rank</span>
        </button>
      </div>

      {/* Content */}
      {tab === "rankings" ? (
        rankingsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-teal-600" />
          </div>
        ) : (
          <RankingsView rankings={rankings} />
        )
      ) : (
        renderAbstractList()
      )}

      {/* Modals */}
      <ReviewModal
        abstract={reviewing}
        onClose={() => setReviewing(null)}
        onSubmitted={fetchAssigned}
        reviewsClosed={reviewsClosed}
      />

      <AbstractDetailModal
        abstract={viewing}
        onClose={() => setViewing(null)}
      />
    </Layout>
  );
}