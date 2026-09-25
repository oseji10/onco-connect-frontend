"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import Layout from "../containers/Layout";

type TabType = "pending" | "completed" | "all";

interface Author {
  id: number;
  name: string;
  email?: string | null;
  affiliation?: string | null;
  phone?: string | null;
  is_corresponding?: boolean;
}

interface Review {
  id: number;
  significance?: number | null;
  relevance?: number | null;
  originality?: number | null;
  average?: number | null;
  comment?: string | null;
  recommended_rejection_reason?: string | null;
  submitted_at?: string | null;
}

interface ReviewerInfo {
  reviewer_id?: number;
  reviewerId?: number;
  name?: string;
  email?: string;
  affiliation?: string;
  isResubmissionReview?: boolean;
  is_resubmission_review?: boolean;
}

interface AbstractItem {
  id: number;
  reference: string;
  title: string;
  sub_theme?: string | null;
  presentation_type?: string | null;
  keywords?: string | null;
  body?: string | null;
  word_count?: number | null;
  status?: string | null;
  version?: number | null;
  is_current?: boolean;
  resubmission_note?: string | null;
  resubmitted_at?: string | null;
  submitted_at?: string | null;

  assignment_id?: number | null;
  assignment_status?: string | null;
  assignment_assigned_at?: string | null;
  reviewer_id?: number | null;

  is_resubmission_review?: boolean;

  review?: Review | null;

  reviewers?: ReviewerInfo[];

  authors?: Author[];

  average_score?: number | null;
}

interface VersionItem {
  id: number;
  reference?: string;
  version?: number;
  title?: string;
  status?: string;
  is_current?: boolean;
  submitted_at?: string | null;
  resubmitted_at?: string | null;
  resubmission_note?: string | null;
  review?: Review | null;
  reviewer?: {
    id?: number;
    name?: string;
    email?: string;
  } | null;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    items?: AbstractItem[];
    total?: number;
    [key: string]: any;
  };
}

interface ReviewForm {
  significance: number;
  relevance: number;
  originality: number;
  comment: string;
  recommended_rejection_reason: string;
}

const emptyReviewForm: ReviewForm = {
  significance: 0,
  relevance: 0,
  originality: 0,
  comment: "",
  recommended_rejection_reason: "",
};

const scoreLabels = [
  { value: 1, label: "1 — Poor" },
  { value: 2, label: "2 — Fair" },
  { value: 3, label: "3 — Good" },
  { value: 4, label: "4 — Very Good" },
  { value: 5, label: "5 — Excellent" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getInitials = (name?: string) => {
  if (!name) return "AU";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const getAverage = (review?: Review | null) => {
  if (!review) return null;

  if (
    review.average !== null &&
    review.average !== undefined &&
    Number.isFinite(Number(review.average))
  ) {
    return Number(review.average);
  }

  const scores = [
    review.significance,
    review.relevance,
    review.originality,
  ]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!scores.length) return null;

  return (
    scores.reduce((sum, value) => sum + value, 0) /
    scores.length
  );
};

const getStatusText = (item: AbstractItem) => {
  const complete =
    item.assignment_status === "submitted" && !!item.review;

  return complete ? "Reviewed" : "Awaiting review";
};

export default function ReviewerDashboardPage() {
  const [assigned, setAssigned] = useState<AbstractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] =
    useState<TabType>("pending");

  const [notReviewer, setNotReviewer] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [selectedAbstract, setSelectedAbstract] =
    useState<AbstractItem | null>(null);

  const [showReviewModal, setShowReviewModal] =
    useState(false);

  const [submittingReview, setSubmittingReview] =
    useState(false);

  const [reviewForm, setReviewForm] =
    useState<ReviewForm>(emptyReviewForm);

  const [expandedAbstract, setExpandedAbstract] =
    useState<number | null>(null);

  const [versionHistory, setVersionHistory] = useState<
    VersionItem[]
  >([]);

  const [loadingVersions, setLoadingVersions] =
    useState(false);

  const [showPreviousReview, setShowPreviousReview] =
    useState(false);

  /*
   * IMPORTANT REVIEW STATE LOGIC
   *
   * Completed:
   * assignment_status === submitted AND review exists
   *
   * Pending:
   * anything that is not completed
   *
   * This means a new resubmission assignment can correctly
   * appear as pending even when the old version was reviewed.
   */
  const completed = useMemo(() => {
    return assigned.filter(
      (item) =>
        item.assignment_status === "submitted" &&
        !!item.review
    );
  }, [assigned]);

  const pending = useMemo(() => {
    return assigned.filter(
      (item) =>
        !(
          item.assignment_status === "submitted" &&
          !!item.review
        )
    );
  }, [assigned]);

  const visibleItems = useMemo(() => {
    if (activeTab === "pending") return pending;
    if (activeTab === "completed") return completed;
    return assigned;
  }, [activeTab, assigned, completed, pending]);

  const loadAssignedAbstracts = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setNotReviewer(false);
        setAccessMessage("");

        const response = await api.get<ApiResponse>(
          "/abstracts/reviews/assigned"
        );

        const payload = response.data;

        if (payload?.success === false) {
          const message = payload?.message || "";

          if (
            message
              .toLowerCase()
              .includes("not registered as a reviewer")
          ) {
            setAssigned([]);
            setNotReviewer(true);
            setAccessMessage(
              message ||
                "This account is not registered as a reviewer for this conference."
            );
            return;
          }

          throw new Error(
            message || "Unable to load assigned abstracts."
          );
        }

        const items = Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];

        setAssigned(items);

        /*
         * If everything has already been reviewed, show Completed
         * automatically so the dashboard is not left on an empty
         * Pending tab.
         */
        const hasPending = items.some(
          (item) =>
            !(
              item.assignment_status === "submitted" &&
              !!item.review
            )
        );

        if (!hasPending && items.length > 0) {
          setActiveTab("completed");
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const message =
          error?.response?.data?.message ||
          error?.message ||
          "";

        const isReviewerAccessError =
          status === 403 ||
          (status === 422 &&
            message
              .toLowerCase()
              .includes("not registered as a reviewer")) ||
          message
            .toLowerCase()
            .includes("not registered as a reviewer");

        if (isReviewerAccessError) {
          setAssigned([]);
          setNotReviewer(true);
          setAccessMessage(
            message ||
              "This account is not registered as a reviewer for this conference."
          );
          return;
        }

        console.error(
          "Failed to load assigned abstracts:",
          error
        );

        toast.error(
          message || "Unable to load assigned abstracts."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAssignedAbstracts(true);
  }, [loadAssignedAbstracts]);

  const openReview = (abstract: AbstractItem) => {
    setSelectedAbstract(abstract);

    const review = abstract.review;

    setReviewForm({
      significance: Number(review?.significance || 0),
      relevance: Number(review?.relevance || 0),
      originality: Number(review?.originality || 0),
      comment: review?.comment || "",
      recommended_rejection_reason:
        review?.recommended_rejection_reason || "",
    });

    setShowPreviousReview(false);
    setShowReviewModal(true);

    if (abstract.is_resubmission_review) {
      loadVersionHistory(abstract);
    } else {
      setVersionHistory([]);
    }
  };

  const closeReview = () => {
    if (submittingReview) return;

    setShowReviewModal(false);
    setSelectedAbstract(null);
    setReviewForm(emptyReviewForm);
    setVersionHistory([]);
    setShowPreviousReview(false);
  };

  const loadVersionHistory = async (
    abstract: AbstractItem
  ) => {
    try {
      setLoadingVersions(true);

      const response = await api.get<any>(
        `/abstracts/${abstract.id}/versions`
      );

      const data = response.data?.data;

      const versions = Array.isArray(data)
        ? data
        : Array.isArray(data?.versions)
        ? data.versions
        : Array.isArray(response.data?.versions)
        ? response.data.versions
        : [];

      setVersionHistory(versions);
    } catch (error) {
      console.error(
        "Failed to load version history:",
        error
      );

      setVersionHistory([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const submitReview = async () => {
    if (!selectedAbstract) return;

    if (
      !reviewForm.significance ||
      !reviewForm.relevance ||
      !reviewForm.originality
    ) {
      toast.error("Please provide all three scores.");
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error("Please enter your review comment.");
      return;
    }

    try {
      setSubmittingReview(true);

      const response = await api.post(
        `/abstracts/${selectedAbstract.id}/review`,
        {
          significance: reviewForm.significance,
          relevance: reviewForm.relevance,
          originality: reviewForm.originality,
          comment: reviewForm.comment.trim(),
          recommended_rejection_reason:
            reviewForm.recommended_rejection_reason.trim() ||
            null,
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message ||
            "Unable to submit review."
        );
      }

      toast.success(
        selectedAbstract.is_resubmission_review
          ? "Resubmission review submitted successfully."
          : "Review submitted successfully."
      );

      closeReview();

      await loadAssignedAbstracts(false);

      setActiveTab("completed");
    } catch (error: any) {
      console.error(
        "Review submission error:",
        error
      );

      let message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to submit review.";

      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors;

        message = Object.values(errors)
          .flat()
          .join(" ");
      }

      toast.error(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const calculateAverage = () => {
    const values = [
      reviewForm.significance,
      reviewForm.relevance,
      reviewForm.originality,
    ].filter((value) => Number(value) > 0);

    if (!values.length) return 0;

    return (
      values.reduce(
        (sum, value) => sum + Number(value),
        0
      ) / values.length
    );
  };

  const updateScore = (
    field:
      | "significance"
      | "relevance"
      | "originality",
    value: number
  ) => {
    setReviewForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const renderScoreDots = (score?: number | null) => {
    const value = Number(score || 0);

    return (
      <div className="d-flex gap-1">
        {[1, 2, 3, 4, 5].map((item) => (
          <span
            key={item}
            className={
              item <= value
                ? "score-dot score-dot-active"
                : "score-dot"
            }
          />
        ))}
      </div>
    );
  };

  /*
   * Reviewer access state
   */
  if (notReviewer) {
    return (
      <Layout>
        <div className="reviewer-page">
          <div className="access-wrapper">
            <div className="access-card">
              <div className="access-icon">
                <AlertCircle size={34} />
              </div>

              <h2>Reviewer access required</h2>

              <p>
                {accessMessage ||
                  "This account is not registered as a reviewer for this conference."}
              </p>

              <div className="access-help">
                <div className="access-help-icon">
                  <Users size={18} />
                </div>

                <div>
                  <strong>Reviewer profile not found</strong>

                  <span>
                    If you have been invited to review abstracts,
                    please contact the conference administrator
                    to have your reviewer profile linked to this
                    account.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="reviewer-page">
        <div className="reviewer-container">
          {/* HERO */}
          <div className="dashboard-hero">
            <div className="hero-left">
              <div className="hero-eyebrow">
                <span className="hero-dot" />
                Reviewer workspace
              </div>

              <h1>Abstract Reviews</h1>

              <p>
                Review assigned conference abstracts, track your
                submissions, and revisit completed assessments.
              </p>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => loadAssignedAbstracts(false)}
              disabled={refreshing || loading}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "spin" : ""}
              />

              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>

          {/* STAT CARDS */}
          <div className="stats-grid">
            <button
              type="button"
              className={`stat-card ${
                activeTab === "all"
                  ? "stat-card-selected"
                  : ""
              }`}
              onClick={() => setActiveTab("all")}
            >
              <div className="stat-top">
                <span className="stat-label">
                  Total assigned
                </span>

                <span className="stat-icon stat-icon-blue">
                  <BookOpen size={19} />
                </span>
              </div>

              <div className="stat-number">
                {assigned.length}
              </div>

              <div className="stat-foot">
                Abstracts assigned to you
              </div>
            </button>

            <button
              type="button"
              className={`stat-card ${
                activeTab === "pending"
                  ? "stat-card-selected stat-card-warning"
                  : ""
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <div className="stat-top">
                <span className="stat-label">
                  Awaiting review
                </span>

                <span className="stat-icon stat-icon-orange">
                  <Clock3 size={19} />
                </span>
              </div>

              <div className="stat-number">
                {pending.length}
              </div>

              <div className="stat-foot">
                Require your attention
              </div>
            </button>

            <button
              type="button"
              className={`stat-card ${
                activeTab === "completed"
                  ? "stat-card-selected stat-card-green"
                  : ""
              }`}
              onClick={() => setActiveTab("completed")}
            >
              <div className="stat-top">
                <span className="stat-label">
                  Completed
                </span>

                <span className="stat-icon stat-icon-green">
                  <CheckCircle2 size={19} />
                </span>
              </div>

              <div className="stat-number">
                {completed.length}
              </div>

              <div className="stat-foot">
                Reviews submitted
              </div>
            </button>
          </div>

          {/* WORKSPACE */}
          <div className="workspace-card">
            {/* NAV */}
            <div className="workspace-header">
              <div>
                <h2>
                  {activeTab === "pending"
                    ? "Pending reviews"
                    : activeTab === "completed"
                    ? "Completed reviews"
                    : "All assignments"}
                </h2>

                <p>
                  {activeTab === "pending"
                    ? "Abstracts waiting for your assessment."
                    : activeTab === "completed"
                    ? "Abstracts you have already reviewed."
                    : "All abstracts currently assigned to you."}
                </p>
              </div>

              <div className="tab-switcher">
                <button
                  type="button"
                  className={
                    activeTab === "pending"
                      ? "active"
                      : ""
                  }
                  onClick={() => setActiveTab("pending")}
                >
                  Pending
                  <span>{pending.length}</span>
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "completed"
                      ? "active"
                      : ""
                  }
                  onClick={() => setActiveTab("completed")}
                >
                  Completed
                  <span>{completed.length}</span>
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "all" ? "active" : ""
                  }
                  onClick={() => setActiveTab("all")}
                >
                  All
                  <span>{assigned.length}</span>
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="workspace-content">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner">
                    <Loader2 size={27} />
                  </div>

                  <h3>Loading your assignments</h3>

                  <p>
                    Fetching the abstracts assigned to you...
                  </p>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    {activeTab === "pending" ? (
                      <CheckCircle2 size={31} />
                    ) : (
                      <FileText size={31} />
                    )}
                  </div>

                  <h3>
                    {activeTab === "pending"
                      ? "You're all caught up"
                      : activeTab === "completed"
                      ? "No completed reviews yet"
                      : "No abstracts assigned"}
                  </h3>

                  <p>
                    {activeTab === "pending"
                      ? "There are currently no abstracts waiting for your review."
                      : activeTab === "completed"
                      ? "Your submitted reviews will appear here."
                      : "Once abstracts are assigned to you, they will appear here."}
                  </p>

                  {activeTab === "pending" &&
                  completed.length > 0 ? (
                    <button
                      type="button"
                      className="empty-action"
                      onClick={() =>
                        setActiveTab("completed")
                      }
                    >
                      View completed reviews
                      <ArrowUpRight size={15} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="abstract-list">
                  {visibleItems.map((item) => {
                    const isCompleted =
                      item.assignment_status ===
                        "submitted" && !!item.review;

                    const average = getAverage(item.review);

                    const expanded =
                      expandedAbstract === item.id;

                    return (
                      <div
                        key={`${item.id}-${item.assignment_id}`}
                        className={`abstract-card ${
                          expanded
                            ? "abstract-card-expanded"
                            : ""
                        }`}
                      >
                        {/* CARD MAIN */}
                        <div className="abstract-card-main">
                          <div className="abstract-content">
                            <div className="abstract-meta">
                              <span className="reference-pill">
                                {item.reference}
                              </span>

                              {item.version ? (
                                <span className="version-pill">
                                  v{item.version}
                                </span>
                              ) : null}

                              {item.is_resubmission_review ? (
                                <span className="resubmission-pill">
                                  <RefreshCw size={11} />
                                  Resubmission
                                </span>
                              ) : null}

                              <span
                                className={
                                  isCompleted
                                    ? "status-pill status-complete"
                                    : "status-pill status-pending"
                                }
                              >
                                {isCompleted ? (
                                  <Check size={11} />
                                ) : (
                                  <Clock3 size={11} />
                                )}

                                {getStatusText(item)}
                              </span>
                            </div>

                            <h3>{item.title}</h3>

                            <div className="abstract-details">
                              {item.sub_theme ? (
                                <span>
                                  <strong>Theme</strong>
                                  {item.sub_theme}
                                </span>
                              ) : null}

                              {item.presentation_type ? (
                                <span>
                                  <strong>Format</strong>
                                  {item.presentation_type}
                                </span>
                              ) : null}

                              {item.word_count ? (
                                <span>
                                  <strong>Words</strong>
                                  {item.word_count}
                                </span>
                              ) : null}
                            </div>

                            {item.authors?.length ? (
                              <div className="author-line">
                                <div className="author-stack">
                                  {item.authors
                                    .slice(0, 3)
                                    .map((author) => (
                                      <div
                                        key={author.id}
                                        className="author-avatar"
                                        title={author.name}
                                      >
                                        {getInitials(
                                          author.name
                                        )}
                                      </div>
                                    ))}
                                </div>

                                <span>
                                  {item.authors.length === 1
                                    ? item.authors[0].name
                                    : `${item.authors[0].name} + ${
                                        item.authors.length - 1
                                      } author${
                                        item.authors.length -
                                          1 >
                                        1
                                          ? "s"
                                          : ""
                                      }`}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {/* SCORE */}
                          <div className="abstract-score">
                            {isCompleted ? (
                              <>
                                <span className="score-caption">
                                  Your score
                                </span>

                                <div className="score-value">
                                  {average !== null
                                    ? average.toFixed(2)
                                    : "—"}
                                </div>

                                {renderScoreDots(
                                  average
                                )}
                              </>
                            ) : (
                              <div className="pending-score">
                                <Clock3 size={17} />
                                <span>Review pending</span>
                              </div>
                            )}
                          </div>

                          {/* ACTION */}
                          <div className="abstract-action">
                            <button
                              type="button"
                              className={
                                isCompleted
                                  ? "secondary-action"
                                  : "primary-action"
                              }
                              onClick={() =>
                                openReview(item)
                              }
                            >
                              {isCompleted ? (
                                <>
                                  View review
                                  <ChevronRight
                                    size={16}
                                  />
                                </>
                              ) : (
                                <>
                                  Review abstract
                                  <ArrowUpRight
                                    size={16}
                                  />
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="details-button"
                              onClick={() =>
                                setExpandedAbstract(
                                  expanded
                                    ? null
                                    : item.id
                                )
                              }
                            >
                              {expanded
                                ? "Hide details"
                                : "Details"}

                              <ChevronDown
                                size={15}
                                className={
                                  expanded
                                    ? "rotate-chevron"
                                    : ""
                                }
                              />
                            </button>
                          </div>
                        </div>

                        {/* EXPANDED */}
                        {expanded ? (
                          <div className="abstract-expanded">
                            <div className="expanded-grid">
                              <div className="expanded-section">
                                <div className="section-label">
                                  <FileText size={15} />
                                  Abstract
                                </div>

                                <div className="abstract-body">
                                  {item.body ||
                                    "No abstract content available."}
                                </div>

                                {item.keywords ? (
                                  <div className="keywords">
                                    <strong>Keywords</strong>

                                    <span>
                                      {item.keywords}
                                    </span>
                                  </div>
                                ) : null}
                              </div>

                              <div className="expanded-section">
                                <div className="section-label">
                                  <Users size={15} />
                                  Authors
                                </div>

                                <div className="authors-list">
                                  {item.authors?.length ? (
                                    item.authors.map(
                                      (author) => (
                                        <div
                                          key={author.id}
                                          className="author-row"
                                        >
                                          <div className="author-avatar large">
                                            {getInitials(
                                              author.name
                                            )}
                                          </div>

                                          <div>
                                            <strong>
                                              {author.name}
                                            </strong>

                                            {author.is_corresponding ? (
                                              <span className="corresponding">
                                                Corresponding
                                              </span>
                                            ) : null}

                                            {author.affiliation ? (
                                              <small>
                                                {
                                                  author.affiliation
                                                }
                                              </small>
                                            ) : null}

                                            {author.email ? (
                                              <small>
                                                {author.email}
                                              </small>
                                            ) : null}
                                          </div>
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <span className="muted">
                                      No author information
                                      available.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {item.is_resubmission_review &&
                            item.resubmission_note ? (
                              <div className="resubmission-note">
                                <div className="resubmission-note-icon">
                                  <RefreshCw size={16} />
                                </div>

                                <div>
                                  <strong>
                                    Author's resubmission note
                                  </strong>

                                  <p>
                                    {
                                      item.resubmission_note
                                    }
                                  </p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* REVIEW MODAL */}
        {showReviewModal && selectedAbstract ? (
          <div className="review-overlay">
            <div className="review-modal">
              <div className="review-modal-header">
                <div>
                  <div className="review-modal-meta">
                    <span className="reference-pill">
                      {selectedAbstract.reference}
                    </span>

                    {selectedAbstract.version ? (
                      <span className="version-pill">
                        v{selectedAbstract.version}
                      </span>
                    ) : null}

                    {selectedAbstract.is_resubmission_review ? (
                      <span className="resubmission-pill">
                        <RefreshCw size={11} />
                        Resubmission
                      </span>
                    ) : null}
                  </div>

                  <h2>
                    {selectedAbstract.review
                      ? "Submitted review"
                      : "Review abstract"}
                  </h2>

                  <p>
                    {selectedAbstract.title}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeReview}
                  disabled={submittingReview}
                >
                  <X size={19} />
                </button>
              </div>

              <div className="review-modal-body">
                {/* RESUBMISSION */}
                {selectedAbstract.is_resubmission_review ? (
                  <div className="resubmission-banner">
                    <div className="resubmission-banner-icon">
                      <RefreshCw size={18} />
                    </div>

                    <div>
                      <strong>
                        This is a corrected submission
                      </strong>

                      <p>
                        The author has submitted a new version
                        following the previous review.
                      </p>

                      {selectedAbstract.resubmission_note ? (
                        <div className="author-note">
                          <strong>Author's note:</strong>{" "}
                          {
                            selectedAbstract.resubmission_note
                          }
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="previous-review-button"
                        onClick={() =>
                          setShowPreviousReview(
                            (value) => !value
                          )
                        }
                      >
                        {showPreviousReview
                          ? "Hide previous review"
                          : "View previous review"}

                        <ChevronDown
                          size={14}
                          className={
                            showPreviousReview
                              ? "rotate-chevron"
                              : ""
                          }
                        />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* PREVIOUS REVIEW */}
                {selectedAbstract.is_resubmission_review &&
                showPreviousReview ? (
                  <div className="previous-review-panel">
                    {loadingVersions ? (
                      <div className="mini-loading">
                        <Loader2
                          size={20}
                          className="spin"
                        />
                        Loading previous review...
                      </div>
                    ) : versionHistory.length ? (
                      versionHistory
                        .filter(
                          (version) =>
                            version.id !==
                            selectedAbstract.id
                        )
                        .map((version) => (
                          <div
                            key={version.id}
                            className="previous-version"
                          >
                            <div className="previous-version-top">
                              <div>
                                <span>
                                  Version{" "}
                                  {version.version || "—"}
                                </span>

                                <strong>
                                  {version.title}
                                </strong>
                              </div>

                              {version.review ? (
                                <span className="status-pill status-complete">
                                  <Check size={11} />
                                  Reviewed
                                </span>
                              ) : null}
                            </div>

                            {version.review ? (
                              <>
                                <div className="previous-scores">
                                  <div>
                                    <small>
                                      Significance
                                    </small>
                                    <strong>
                                      {
                                        version.review
                                          .significance
                                      }
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Relevance
                                    </small>
                                    <strong>
                                      {
                                        version.review
                                          .relevance
                                      }
                                    </strong>
                                  </div>

                                  <div>
                                    <small>
                                      Originality
                                    </small>
                                    <strong>
                                      {
                                        version.review
                                          .originality
                                      }
                                    </strong>
                                  </div>

                                  <div>
                                    <small>Average</small>
                                    <strong>
                                      {getAverage(
                                        version.review
                                      )?.toFixed(2) ||
                                        "—"}
                                    </strong>
                                  </div>
                                </div>

                                {version.review.comment ? (
                                  <div className="previous-comment">
                                    <MessageSquare
                                      size={15}
                                    />

                                    <span>
                                      {
                                        version.review
                                          .comment
                                      }
                                    </span>
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <div className="muted">
                                No review recorded for this
                                version.
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="muted">
                        No previous version history is
                        available.
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="review-layout">
                  {/* ABSTRACT */}
                  <div className="review-abstract">
                    <div className="review-section-title">
                      <span className="section-number">
                        01
                      </span>

                      <div>
                        <strong>Abstract</strong>
                        <small>
                          Read the submission carefully before
                          scoring.
                        </small>
                      </div>
                    </div>

                    <div className="review-abstract-body">
                      {selectedAbstract.body ||
                        "No abstract content available."}
                    </div>

                    {selectedAbstract.keywords ? (
                      <div className="review-keywords">
                        <span>Keywords</span>
                        <p>
                          {selectedAbstract.keywords}
                        </p>
                      </div>
                    ) : null}

                    {selectedAbstract.authors?.length ? (
                      <div className="review-authors">
                        <div className="review-subheading">
                          Authors
                        </div>

                        {selectedAbstract.authors.map(
                          (author) => (
                            <div
                              key={author.id}
                              className="review-author"
                            >
                              <div className="author-avatar large">
                                {getInitials(
                                  author.name
                                )}
                              </div>

                              <div>
                                <strong>
                                  {author.name}
                                </strong>

                                {author.affiliation ? (
                                  <small>
                                    {author.affiliation}
                                  </small>
                                ) : null}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* FORM */}
                  <div className="review-form">
                    <div className="review-section-title">
                      <span className="section-number">
                        02
                      </span>

                      <div>
                        <strong>Your assessment</strong>
                        <small>
                          Score each criterion from 1 to 5.
                        </small>
                      </div>
                    </div>

                    <div className="score-summary">
                      <div>
                        <span>Current average</span>

                        <strong>
                          {calculateAverage().toFixed(2)}
                        </strong>
                      </div>

                      <div className="summary-stars">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <Star
                              key={star}
                              size={16}
                              fill={
                                star <=
                                Math.round(
                                  calculateAverage()
                                )
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          )
                        )}
                      </div>
                    </div>

                    <div className="criteria-list">
                      {[
                        {
                          key: "significance" as const,
                          title: "Significance",
                          description:
                            "Importance and contribution of the work.",
                        },
                        {
                          key: "relevance" as const,
                          title: "Relevance",
                          description:
                            "Alignment with the conference theme.",
                        },
                        {
                          key: "originality" as const,
                          title: "Originality",
                          description:
                            "Novelty of the ideas, findings or approach.",
                        },
                      ].map((criterion) => (
                        <div
                          key={criterion.key}
                          className="criterion"
                        >
                          <div className="criterion-top">
                            <div>
                              <strong>
                                {criterion.title}
                              </strong>

                              <small>
                                {criterion.description}
                              </small>
                            </div>

                            <span>
                              {reviewForm[
                                criterion.key
                              ] || "—"}
                              /5
                            </span>
                          </div>

                          <div className="score-selector">
                            {[1, 2, 3, 4, 5].map(
                              (score) => (
                                <button
                                  key={score}
                                  type="button"
                                  disabled={
                                    submittingReview ||
                                    !!selectedAbstract.review
                                  }
                                  className={
                                    reviewForm[
                                      criterion.key
                                    ] === score
                                      ? "selected"
                                      : ""
                                  }
                                  onClick={() =>
                                    updateScore(
                                      criterion.key,
                                      score
                                    )
                                  }
                                >
                                  {score}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="form-field">
                      <label>
                        Reviewer comments
                        <span>Required</span>
                      </label>

                      <textarea
                        rows={6}
                        value={reviewForm.comment}
                        onChange={(event) =>
                          setReviewForm(
                            (previous) => ({
                              ...previous,
                              comment:
                                event.target.value,
                            })
                          )
                        }
                        disabled={
                          submittingReview ||
                          !!selectedAbstract.review
                        }
                        placeholder="Provide a clear and constructive assessment of the abstract..."
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        Recommendation / rejection reason
                        <small>Optional</small>
                      </label>

                      <textarea
                        rows={3}
                        value={
                          reviewForm.recommended_rejection_reason
                        }
                        onChange={(event) =>
                          setReviewForm(
                            (previous) => ({
                              ...previous,
                              recommended_rejection_reason:
                                event.target.value,
                            })
                          )
                        }
                        disabled={
                          submittingReview ||
                          !!selectedAbstract.review
                        }
                        placeholder="Add any recommendation or reason if applicable..."
                      />
                    </div>

                    {selectedAbstract.review ? (
                      <div className="already-reviewed">
                        <CheckCircle2 size={19} />

                        <div>
                          <strong>
                            Review already submitted
                          </strong>

                          <span>
                            Submitted{" "}
                            {formatDateTime(
                              selectedAbstract.review
                                .submitted_at
                            )}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="submit-review-button"
                        onClick={submitReview}
                        disabled={submittingReview}
                      >
                        {submittingReview ? (
                          <>
                            <Loader2
                              size={17}
                              className="spin"
                            />
                            Submitting review...
                          </>
                        ) : (
                          <>
                            <Send size={17} />
                            Submit review
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="review-modal-footer">
                <button
                  type="button"
                  onClick={closeReview}
                  disabled={submittingReview}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx global>{`
        :root {
          --review-green: #176b45;
          --review-green-dark: #105538;
          --review-green-light: #eaf7f0;
          --review-border: #e8ece9;
          --review-text: #18211c;
          --review-muted: #728078;
          --review-bg: #f6f8f7;
        }

        .reviewer-page {
          min-height: 100vh;
          background: var(--review-bg);
          color: var(--review-text);
          padding: 28px 24px 60px;
        }

        .reviewer-container {
          width: 100%;
          max-width: 1450px;
          margin: 0 auto;
        }

        /* HERO */

        .dashboard-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 25px;
        }

        .hero-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--review-green);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          margin-bottom: 9px;
        }

        .hero-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #1d9b63;
        }

        .dashboard-hero h1 {
          font-size: clamp(27px, 3vw, 38px);
          line-height: 1.12;
          font-weight: 750;
          letter-spacing: -0.035em;
          margin: 0 0 9px;
        }

        .dashboard-hero p {
          color: var(--review-muted);
          margin: 0;
          max-width: 650px;
          font-size: 14px;
          line-height: 1.65;
        }

        .refresh-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--review-border);
          background: white;
          color: #344039;
          border-radius: 11px;
          padding: 10px 15px;
          font-size: 13px;
          font-weight: 600;
          transition: 0.18s ease;
        }

        .refresh-button:hover {
          border-color: #cbd5cf;
          background: #fafcfb;
        }

        .refresh-button:disabled {
          opacity: 0.65;
        }

        /* STATS */

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .stat-card {
          text-align: left;
          background: white;
          border: 1px solid var(--review-border);
          border-radius: 15px;
          padding: 20px;
          transition: 0.2s ease;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-1px);
          border-color: #d3ddd7;
          box-shadow: 0 7px 24px rgba(21, 44, 32, 0.05);
        }

        .stat-card-selected {
          border-color: #9bcbb3;
          box-shadow: 0 0 0 2px rgba(23, 107, 69, 0.07);
        }

        .stat-card-warning {
          border-color: #e7c67b;
        }

        .stat-card-green {
          border-color: #9bcbb3;
        }

        .stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .stat-label {
          color: #67736c;
          font-size: 12px;
          font-weight: 650;
        }

        .stat-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
        }

        .stat-icon-blue {
          color: #4169a1;
          background: #edf3fb;
        }

        .stat-icon-orange {
          color: #a36a16;
          background: #fff5df;
        }

        .stat-icon-green {
          color: var(--review-green);
          background: var(--review-green-light);
        }

        .stat-number {
          font-size: 29px;
          line-height: 1;
          font-weight: 750;
          letter-spacing: -0.03em;
          margin-top: 20px;
        }

        .stat-foot {
          color: #8a948e;
          font-size: 11px;
          margin-top: 7px;
        }

        /* WORKSPACE */

        .workspace-card {
          background: white;
          border: 1px solid var(--review-border);
          border-radius: 17px;
          overflow: hidden;
          box-shadow: 0 3px 18px rgba(22, 42, 31, 0.025);
        }

        .workspace-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 25px;
          padding: 21px 23px;
          border-bottom: 1px solid var(--review-border);
        }

        .workspace-header h2 {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 730;
          letter-spacing: -0.02em;
        }

        .workspace-header p {
          margin: 0;
          color: var(--review-muted);
          font-size: 12px;
        }

        .tab-switcher {
          display: flex;
          padding: 3px;
          background: #f3f5f4;
          border-radius: 10px;
          gap: 2px;
        }

        .tab-switcher button {
          border: 0;
          background: transparent;
          border-radius: 8px;
          padding: 8px 11px;
          color: #78827d;
          font-size: 12px;
          font-weight: 650;
          white-space: nowrap;
          transition: 0.18s ease;
        }

        .tab-switcher button span {
          margin-left: 6px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.045);
          font-size: 10px;
        }

        .tab-switcher button.active {
          background: white;
          color: var(--review-green);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        .tab-switcher button.active span {
          background: var(--review-green-light);
          color: var(--review-green);
        }

        .workspace-content {
          padding: 20px;
        }

        /* ABSTRACT CARDS */

        .abstract-list {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .abstract-card {
          border: 1px solid var(--review-border);
          border-radius: 14px;
          background: white;
          overflow: hidden;
          transition: 0.2s ease;
        }

        .abstract-card:hover {
          border-color: #d2ddd6;
          box-shadow: 0 7px 25px rgba(23, 55, 39, 0.045);
        }

        .abstract-card-expanded {
          border-color: #b7d6c4;
        }

        .abstract-card-main {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 130px 155px;
          gap: 22px;
          align-items: center;
          padding: 19px 20px;
        }

        .abstract-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 9px;
        }

        .reference-pill,
        .version-pill,
        .resubmission-pill,
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 20px;
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
          padding: 6px 8px;
        }

        .reference-pill {
          color: var(--review-green);
          background: var(--review-green-light);
        }

        .version-pill {
          color: #65716a;
          background: #f1f3f2;
        }

        .resubmission-pill {
          color: #426b83;
          background: #edf7fb;
        }

        .status-complete {
          color: #24704d;
          background: #eaf7f0;
        }

        .status-pending {
          color: #986515;
          background: #fff5df;
        }

        .abstract-content h3 {
          font-size: 16px;
          line-height: 1.4;
          font-weight: 700;
          letter-spacing: -0.012em;
          margin: 0 0 9px;
          max-width: 850px;
        }

        .abstract-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #7d8781;
          font-size: 11px;
        }

        .abstract-details span {
          display: flex;
          gap: 5px;
        }

        .abstract-details strong {
          color: #56625b;
          font-weight: 650;
        }

        .author-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 13px;
          color: #7b857f;
          font-size: 11px;
        }

        .author-stack {
          display: flex;
          padding-left: 2px;
        }

        .author-avatar {
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #edf5f0;
          border: 2px solid white;
          margin-left: -4px;
          color: var(--review-green);
          font-size: 8px;
          font-weight: 750;
        }

        .author-avatar:first-child {
          margin-left: 0;
        }

        .abstract-score {
          min-height: 66px;
          border-left: 1px solid var(--review-border);
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .score-caption {
          font-size: 10px;
          color: #89938d;
          margin-bottom: 2px;
        }

        .score-value {
          font-size: 22px;
          line-height: 1;
          font-weight: 750;
          color: var(--review-green);
          letter-spacing: -0.03em;
          margin-bottom: 6px;
        }

        .score-dot {
          width: 13px;
          height: 4px;
          border-radius: 5px;
          background: #e5e9e6;
        }

        .score-dot-active {
          background: #54a67d;
        }

        .pending-score {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #9a711e;
          font-size: 11px;
          font-weight: 650;
        }

        .abstract-action {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .primary-action,
        .secondary-action {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 9px;
          padding: 9px 11px;
          font-size: 11px;
          font-weight: 700;
          transition: 0.18s ease;
        }

        .primary-action {
          border: 1px solid var(--review-green);
          color: white;
          background: var(--review-green);
        }

        .primary-action:hover {
          background: var(--review-green-dark);
          border-color: var(--review-green-dark);
        }

        .secondary-action {
          border: 1px solid #cfe0d5;
          color: var(--review-green);
          background: #f7fbf8;
        }

        .secondary-action:hover {
          background: var(--review-green-light);
        }

        .details-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 0;
          background: transparent;
          color: #8a938d;
          font-size: 10px;
          font-weight: 600;
          padding: 3px;
        }

        .rotate-chevron {
          transform: rotate(180deg);
        }

        /* EXPANDED */

        .abstract-expanded {
          border-top: 1px solid var(--review-border);
          background: #fafcfb;
          padding: 20px;
        }

        .expanded-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 28px;
        }

        .section-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #526059;
          font-size: 11px;
          font-weight: 750;
          margin-bottom: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .abstract-body {
          color: #56625b;
          font-size: 12px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .keywords {
          display: flex;
          gap: 8px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid var(--review-border);
          font-size: 11px;
        }

        .keywords strong {
          color: #536059;
        }

        .keywords span {
          color: #7a857f;
        }

        .authors-list {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .author-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .author-avatar.large {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          font-size: 9px;
        }

        .author-row > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .author-row strong {
          font-size: 11px;
        }

        .author-row small {
          color: #89938d;
          font-size: 10px;
          margin-top: 2px;
        }

        .corresponding {
          display: inline-block;
          width: fit-content;
          margin-top: 3px;
          padding: 2px 5px;
          border-radius: 4px;
          background: #eaf7f0;
          color: var(--review-green);
          font-size: 8px;
          font-weight: 700;
        }

        .resubmission-note {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          padding: 12px 14px;
          border: 1px solid #d9eaf1;
          background: #f2f9fc;
          border-radius: 10px;
        }

        .resubmission-note-icon {
          color: #39728d;
        }

        .resubmission-note strong {
          color: #3c5f6d;
          font-size: 10px;
        }

        .resubmission-note p {
          margin: 4px 0 0;
          color: #647a84;
          font-size: 11px;
          line-height: 1.6;
        }

        /* LOADING / EMPTY */

        .loading-state,
        .empty-state {
          min-height: 410px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
          padding: 40px 20px;
        }

        .loading-spinner {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: var(--review-green-light);
          color: var(--review-green);
          margin-bottom: 15px;
        }

        .loading-state h3,
        .empty-state h3 {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 700;
        }

        .loading-state p,
        .empty-state p {
          color: #89938d;
          font-size: 12px;
          max-width: 400px;
          margin: 0;
          line-height: 1.6;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: #edf6f1;
          color: var(--review-green);
          margin-bottom: 15px;
        }

        .empty-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 17px;
          border: 0;
          background: transparent;
          color: var(--review-green);
          font-size: 11px;
          font-weight: 700;
        }

        /* REVIEW MODAL */

        .review-overlay {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15, 24, 19, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .review-modal {
          width: min(1180px, 100%);
          max-height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18);
        }

        .review-modal-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--review-border);
        }

        .review-modal-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 9px;
        }

        .review-modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 750;
          letter-spacing: -0.025em;
        }

        .review-modal-header p {
          margin: 5px 0 0;
          color: #78837c;
          font-size: 12px;
          max-width: 800px;
        }

        .modal-close {
          width: 35px;
          height: 35px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--review-border);
          background: #fafcfb;
          color: #68736d;
          border-radius: 9px;
        }

        .review-modal-body {
          overflow-y: auto;
          padding: 23px;
        }

        .resubmission-banner {
          display: flex;
          gap: 12px;
          padding: 14px;
          border: 1px solid #d6e9ef;
          background: #f2f9fb;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .resubmission-banner-icon {
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #39748b;
          background: #e1f1f6;
          border-radius: 9px;
        }

        .resubmission-banner strong {
          color: #385f6c;
          font-size: 12px;
        }

        .resubmission-banner p {
          color: #71858d;
          font-size: 11px;
          margin: 3px 0 7px;
        }

        .author-note {
          color: #5e737b;
          font-size: 11px;
          line-height: 1.6;
          margin-bottom: 7px;
        }

        .previous-review-button {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #39748b;
          font-size: 10px;
          font-weight: 700;
        }

        .previous-review-panel {
          border: 1px solid var(--review-border);
          border-radius: 12px;
          padding: 13px;
          margin-bottom: 20px;
          background: #fafcfb;
        }

        .mini-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 20px;
          color: #7e8982;
          font-size: 11px;
        }

        .previous-version {
          padding: 13px;
          background: white;
          border: 1px solid var(--review-border);
          border-radius: 9px;
          margin-bottom: 8px;
        }

        .previous-version:last-child {
          margin-bottom: 0;
        }

        .previous-version-top {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .previous-version-top > div {
          display: flex;
          flex-direction: column;
        }

        .previous-version-top span:first-child {
          color: #859089;
          font-size: 9px;
          margin-bottom: 3px;
        }

        .previous-version-top strong {
          font-size: 11px;
        }

        .previous-scores {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 7px;
          margin-top: 12px;
        }

        .previous-scores div {
          padding: 8px;
          border-radius: 7px;
          background: #f7f9f8;
        }

        .previous-scores small {
          display: block;
          color: #8b958f;
          font-size: 8px;
        }

        .previous-scores strong {
          font-size: 13px;
        }

        .previous-comment {
          display: flex;
          gap: 7px;
          margin-top: 10px;
          padding: 9px;
          background: #f7f9f8;
          color: #69756e;
          border-radius: 7px;
          font-size: 10px;
          line-height: 1.6;
        }

        .review-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(370px, 0.75fr);
          gap: 20px;
        }

        .review-abstract,
        .review-form {
          border: 1px solid var(--review-border);
          border-radius: 13px;
          padding: 18px;
        }

        .review-section-title {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 17px;
        }

        .section-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 27px;
          height: 27px;
          border-radius: 7px;
          background: var(--review-green-light);
          color: var(--review-green);
          font-size: 9px;
          font-weight: 800;
        }

        .review-section-title > div {
          display: flex;
          flex-direction: column;
        }

        .review-section-title strong {
          font-size: 12px;
        }

        .review-section-title small {
          color: #8b958f;
          font-size: 9px;
          margin-top: 2px;
        }

        .review-abstract-body {
          color: #505d55;
          font-size: 12px;
          line-height: 1.85;
          white-space: pre-wrap;
        }

        .review-keywords {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid var(--review-border);
        }

        .review-keywords span {
          color: #748078;
          font-size: 9px;
          font-weight: 750;
          text-transform: uppercase;
        }

        .review-keywords p {
          margin: 5px 0 0;
          color: #68746d;
          font-size: 11px;
        }

        .review-authors {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid var(--review-border);
        }

        .review-subheading {
          color: #748078;
          font-size: 9px;
          font-weight: 750;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .review-author {
          display: flex;
          gap: 9px;
          align-items: center;
          margin-bottom: 9px;
        }

        .review-author > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .review-author strong {
          font-size: 10px;
        }

        .review-author small {
          color: #8b958f;
          font-size: 9px;
          margin-top: 2px;
        }

        .score-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px;
          margin-bottom: 15px;
          border-radius: 10px;
          background: #f4f9f6;
        }

        .score-summary > div:first-child {
          display: flex;
          flex-direction: column;
        }

        .score-summary span {
          color: #7f8a83;
          font-size: 9px;
        }

        .score-summary strong {
          color: var(--review-green);
          font-size: 23px;
          line-height: 1.1;
          margin-top: 2px;
        }

        .summary-stars {
          display: flex;
          color: #d39b32;
          gap: 2px;
        }

        .criteria-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .criterion {
          padding: 11px;
          border: 1px solid var(--review-border);
          border-radius: 9px;
        }

        .criterion-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }

        .criterion-top > div {
          display: flex;
          flex-direction: column;
        }

        .criterion-top strong {
          font-size: 10px;
        }

        .criterion-top small {
          color: #8b958f;
          font-size: 8px;
          margin-top: 2px;
        }

        .criterion-top > span {
          color: var(--review-green);
          font-size: 12px;
          font-weight: 750;
        }

        .score-selector {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 5px;
        }

        .score-selector button {
          height: 31px;
          border: 1px solid #dfe5e1;
          border-radius: 6px;
          background: white;
          color: #7a847e;
          font-size: 10px;
          font-weight: 700;
          transition: 0.15s ease;
        }

        .score-selector button:hover:not(:disabled) {
          border-color: #a6cbb6;
          color: var(--review-green);
        }

        .score-selector button.selected {
          color: white;
          background: var(--review-green);
          border-color: var(--review-green);
        }

        .score-selector button:disabled {
          cursor: default;
          opacity: 0.85;
        }

        .form-field {
          margin-top: 14px;
        }

        .form-field label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #4f5b54;
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .form-field label span,
        .form-field label small {
          color: #a0aaa4;
          font-size: 8px;
          font-weight: 600;
        }

        .form-field textarea {
          display: block;
          width: 100%;
          resize: vertical;
          border: 1px solid #dfe5e1;
          border-radius: 8px;
          outline: none;
          padding: 10px;
          color: #48534c;
          background: white;
          font-size: 11px;
          line-height: 1.6;
          transition: 0.15s ease;
        }

        .form-field textarea:focus {
          border-color: #8bbca1;
          box-shadow: 0 0 0 3px rgba(23, 107, 69, 0.07);
        }

        .form-field textarea:disabled {
          background: #f7f9f8;
        }

        .submit-review-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 15px;
          border: 0;
          border-radius: 9px;
          padding: 11px;
          background: var(--review-green);
          color: white;
          font-size: 11px;
          font-weight: 700;
          transition: 0.18s ease;
        }

        .submit-review-button:hover:not(:disabled) {
          background: var(--review-green-dark);
        }

        .submit-review-button:disabled {
          opacity: 0.65;
        }

        .already-reviewed {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 15px;
          padding: 11px;
          color: #26704e;
          background: #eaf7f0;
          border-radius: 9px;
        }

        .already-reviewed > div {
          display: flex;
          flex-direction: column;
        }

        .already-reviewed strong {
          font-size: 10px;
        }

        .already-reviewed span {
          font-size: 9px;
          color: #789286;
          margin-top: 2px;
        }

        .review-modal-footer {
          display: flex;
          justify-content: flex-end;
          padding: 13px 23px;
          border-top: 1px solid var(--review-border);
        }

        .review-modal-footer button {
          border: 1px solid var(--review-border);
          background: white;
          border-radius: 8px;
          padding: 8px 15px;
          color: #65716a;
          font-size: 11px;
          font-weight: 650;
        }

        /* ACCESS */

        .access-wrapper {
          min-height: calc(100vh - 100px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .access-card {
          width: min(560px, 100%);
          background: white;
          border: 1px solid var(--review-border);
          border-radius: 18px;
          padding: 42px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(20, 50, 34, 0.05);
        }

        .access-icon {
          width: 65px;
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 17px;
          border-radius: 17px;
          background: #fff5df;
          color: #9b701d;
        }

        .access-card h2 {
          margin: 0 0 8px;
          font-size: 21px;
          font-weight: 750;
        }

        .access-card > p {
          color: #7a857e;
          font-size: 12px;
          line-height: 1.65;
          margin: 0 auto 22px;
        }

        .access-help {
          display: flex;
          text-align: left;
          gap: 10px;
          padding: 13px;
          border-radius: 10px;
          background: #f7f9f8;
        }

        .access-help-icon {
          color: var(--review-green);
        }

        .access-help > div:last-child {
          display: flex;
          flex-direction: column;
        }

        .access-help strong {
          font-size: 10px;
        }

        .access-help span {
          color: #858f89;
          font-size: 10px;
          line-height: 1.55;
          margin-top: 3px;
        }

        .muted {
          color: #89938d;
          font-size: 11px;
        }

        .spin {
          animation: reviewer-spin 0.9s linear infinite;
        }

        @keyframes reviewer-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .abstract-card-main {
            grid-template-columns: minmax(0, 1fr) 110px;
          }

          .abstract-action {
            grid-column: 1 / -1;
            flex-direction: row;
            justify-content: flex-start;
          }

          .primary-action,
          .secondary-action {
            width: auto;
            min-width: 150px;
          }

          .details-button {
            width: auto;
            padding: 8px 10px;
          }

          .review-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 800px) {
          .reviewer-page {
            padding: 20px 14px 45px;
          }

          .dashboard-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .refresh-button {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .workspace-header {
            align-items: flex-start;
            flex-direction: column;
            padding: 17px;
          }

          .tab-switcher {
            width: 100%;
          }

          .tab-switcher button {
            flex: 1;
          }

          .workspace-content {
            padding: 12px;
          }

          .abstract-card-main {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .abstract-score {
            border-left: 0;
            border-top: 1px solid var(--review-border);
            padding-left: 0;
            padding-top: 13px;
          }

          .abstract-action {
            width: 100%;
          }

          .primary-action,
          .secondary-action {
            flex: 1;
          }

          .expanded-grid {
            grid-template-columns: 1fr;
          }

          .review-overlay {
            padding: 0;
          }

          .review-modal {
            max-height: 100vh;
            height: 100vh;
            border-radius: 0;
          }

          .review-modal-body {
            padding: 15px;
          }

          .review-modal-header {
            padding: 17px;
          }

          .previous-scores {
            grid-template-columns: repeat(2, 1fr);
          }

          .access-card {
            padding: 30px 22px;
          }
        }

        @media (max-width: 500px) {
          .reviewer-page {
            padding: 15px 10px 35px;
          }

          .dashboard-hero h1 {
            font-size: 27px;
          }

          .abstract-action {
            flex-direction: column;
          }

          .primary-action,
          .secondary-action,
          .details-button {
            width: 100%;
          }

          .abstract-details {
            flex-direction: column;
            gap: 5px;
          }

          .review-form,
          .review-abstract {
            padding: 13px;
          }

          .review-modal-header h2 {
            font-size: 17px;
          }
        }
      `}</style>
    </Layout>
  );
}
