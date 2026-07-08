import React, { useEffect, useMemo, useState } from "react";
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
  Trash2,
  RefreshCw,
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
  REJECTION_REASONS,
  formatDate,
} from "../../types/abstract-type";

const ITEMS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AbstractStatus }) {
  const styles: Record<AbstractStatus, string> = {
    submitted: "bg-gray-100 text-gray-700",
    under_review: "bg-yellow-100 text-yellow-800",
    scored: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<AbstractStatus, string> = {
    submitted: "Submitted",
    under_review: "Under Review",
    scored: "Scored",
    accepted: "Accepted",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function subThemeLabel(value: string) {
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

// ─── Local UI primitives (no external UI kit dependency) ───────────────────

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

function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`text-sm font-medium outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${className}`}
    />
  );
}

function Pagination({
  totalResults,
  resultsPerPage,
  onChange,
  label,
}: {
  totalResults: number;
  resultsPerPage: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalResults / resultsPerPage));
  const [page, setPage] = useState(1);

  function go(p: number) {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
    onChange(clamped);
  }

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-2">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500 px-2">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
      >
        Next
      </button>
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
      toast.error(err?.response?.data?.message || "Failed to send invitation.");
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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200"
            placeholder="Affiliation (optional)"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" className="rounded-2xl h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0"
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
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      toast.error(err?.response?.data?.message || "Failed to assign reviewers.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 flex items-start justify-between sticky top-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900">Assign Reviewers</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{abstract.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
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
                  <p className="text-sm font-semibold text-gray-900">{r.name}</p>
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
          <Button variant="outline" className="rounded-2xl h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 bg-indigo-600 border-0"
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

// ─── View Abstract Modal (with scores) ─────────────────────────────────────

function ViewAbstractModal({
  abstract,
  onClose,
  onDecision,
}: {
  abstract: Abstract | null;
  onClose: () => void;
  onDecision: (id: number, status: "accepted" | "rejected") => void;
}) {
  if (!abstract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
              {abstract.title}
            </h3>
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
                {subThemeLabel(abstract.subTheme)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">Status</p>
              <StatusBadge status={abstract.status} />
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">
                Presentation type
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {abstract.presentationType}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs font-bold uppercase text-gray-500">
                Average score
              </p>
              <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                {abstract.averageScore != null
                  ? abstract.averageScore.toFixed(2)
                  : "Pending reviews"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">Authors</p>
            <div className="space-y-2">
              {abstract.authors.map((a) => (
                <div key={a.id} className="text-sm">
                  <span className="font-semibold text-gray-900">{a.name}</span>
                  {a.isCorresponding && (
                    <span className="ml-2 text-xs text-teal-700 font-bold">
                      (Corresponding)
                    </span>
                  )}
                  <p className="text-xs text-gray-500">{a.affiliation}</p>
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
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">
              Reviewers &amp; scores
            </p>
            {abstract.reviewers.length === 0 ? (
              <p className="text-sm text-gray-500">No reviewers assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {abstract.reviewers.map((r) => (
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
                          Significance {r.review.scores.significance} &middot;
                          Relevance {r.review.scores.relevance} &middot;
                          Originality {r.review.scores.originality} &mdash;{" "}
                          <span className="font-bold">
                            avg {r.review.average.toFixed(2)}
                          </span>
                        </p>
                        {r.review.comment && (
                          <p className="italic text-gray-500">
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

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <Button
            className="flex-1 rounded-2xl h-11 bg-green-600 hover:bg-green-700 border-0"
            onClick={() => onDecision(abstract.id, "accepted")}
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Accept
          </Button>
          <Button
            className="flex-1 rounded-2xl h-11 bg-red-600 hover:bg-red-700 border-0"
            onClick={() => onDecision(abstract.id, "rejected")}
          >
            <XCircle className="w-4 h-4 mr-2" /> Reject
          </Button>
          <Button variant="outline" className="rounded-2xl h-11" onClick={onClose}>
            Close
          </Button>
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

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [assigningAbstract, setAssigningAbstract] = useState<Abstract | null>(null);
  const [viewingAbstract, setViewingAbstract] = useState<Abstract | null>(null);
  const [resendingId, setResendingId] = useState<number | null>(null);

  async function fetchAbstracts() {
    try {
      setLoading(true);
      const { data } = await api.get("/abstracts");
      setAbstracts(data?.data?.items || []);
    } catch (err) {
      toast.error("Failed to load abstracts.");
      setAbstracts([]);
    } finally {
      setLoading(false);
    }
  }

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
      toast.error(err?.response?.data?.message || "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  }

  useEffect(() => {
    fetchAbstracts();
    fetchReviewers();
  }, []);

  async function handleDecision(id: number, status: "accepted" | "rejected") {
    try {
      await api.patch(`/abstracts/${id}/status`, { status });
      toast.success(`Abstract ${status}.`);
      setViewingAbstract(null);
      await fetchAbstracts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  }

  const filtered = useMemo(() => {
    let list = [...abstracts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.reference.toLowerCase().includes(q) ||
          a.authors.some((au) => au.name.toLowerCase().includes(q))
      );
    }
    if (filterStatus !== "all") list = list.filter((a) => a.status === filterStatus);
    if (filterSubTheme !== "all")
      list = list.filter((a) => a.subTheme === filterSubTheme);
    return list;
  }, [abstracts, searchQuery, filterStatus, filterSubTheme]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle>Abstract Management</PageTitle>
            <p className="mt-2 text-sm text-gray-600">
              Review submissions, assign reviewers, and record final decisions
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

      {/* Reviewer pool summary */}
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

      {/* Search and filters */}
      <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Input
              className="pl-12 h-14 rounded-2xl border-2 border-gray-200 text-base font-semibold"
              placeholder="Search by title, reference, or author..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
          </div>
          <select
            className="h-14 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="scored">Scored</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="h-14 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold"
            value={filterSubTheme}
            onChange={(e) => {
              setFilterSubTheme(e.target.value);
              setCurrentPage(1);
            }}
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
          {loading ? "Loading..." : `${filtered.length} abstract${filtered.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-20 text-center text-gray-500">
          No abstracts match the current filters.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="text-left px-5 py-3">Reference</th>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">Sub-theme</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Avg score</th>
                <th className="text-left px-5 py-3">Reviewers</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">
                    {a.reference}
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(a.submittedAt)}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 max-w-[180px]">
                    {subThemeLabel(a.subTheme)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-4">
                    {a.averageScore != null ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        {a.averageScore.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600">
                    {a.reviewers.filter((r) => r.status === "submitted").length}/
                    {a.reviewers.length} submitted
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setViewingAbstract(a)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="mt-8">
          <Pagination
            totalResults={filtered.length}
            resultsPerPage={ITEMS_PER_PAGE}
            onChange={setCurrentPage}
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
        onAssigned={fetchAbstracts}
      />
      <ViewAbstractModal
        abstract={viewingAbstract}
        onClose={() => setViewingAbstract(null)}
        onDecision={handleDecision}
      />
    </Layout>
  );
}