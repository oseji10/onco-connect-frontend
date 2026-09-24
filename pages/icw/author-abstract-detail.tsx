"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  Star,
  MessageSquare,
  GitBranch,
  FileEdit,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import ResubmitModal from "../components/ResubmitModal";
import Layout from "../containers/Layout";

type Review = {
  significance: number;
  relevance: number;
  originality: number;
  average: number;
  comment: string | null;
  submittedAt: string | null;
};

type ReviewerEntry = {
  reviewerName: string;
  status: string;
  isResubmissionReview: boolean;
  review: Review | null;
};

type Version = {
  id: number;
  reference: string;
  version: number;
  isCurrent: boolean;
  status: string;
  title: string;
  body: string;
  keywords: string | null;
  subTheme: string;
  presentationType: string;
  resubmissionNote: string | null;
  submittedAt: string | null;
  resubmittedAt: string | null;
  reviews: ReviewerEntry[];
};

const SUB_THEME_LABELS: Record<string, string> = {
  // Add your actual sub-theme mappings here
};

/**
 * Normalise API response.
 *
 * Your buildVersionTimeline() returns snake_case:
 *
 * is_current
 * sub_theme
 * presentation_type
 * resubmission_note
 * submitted_at
 * resubmitted_at
 *
 * while the frontend uses camelCase.
 */
function normalizeVersion(raw: any): Version {
  return {
    id: Number(raw?.id),
    reference: raw?.reference ?? "",
    version: Number(raw?.version ?? 1),

    isCurrent:
      raw?.isCurrent ??
      raw?.is_current ??
      false,

    status: raw?.status ?? "",

    title: raw?.title ?? "",
    body: raw?.body ?? "",

    keywords:
      raw?.keywords ??
      null,

    subTheme:
      raw?.subTheme ??
      raw?.sub_theme ??
      "",

    presentationType:
      raw?.presentationType ??
      raw?.presentation_type ??
      "",

    resubmissionNote:
      raw?.resubmissionNote ??
      raw?.resubmission_note ??
      null,

    submittedAt:
      raw?.submittedAt ??
      raw?.submitted_at ??
      null,

    resubmittedAt:
      raw?.resubmittedAt ??
      raw?.resubmitted_at ??
      null,

    reviews: Array.isArray(raw?.reviews)
      ? raw.reviews.map((reviewer: any) => ({
          reviewerName:
            reviewer?.reviewerName ??
            reviewer?.reviewer_name ??
            "Reviewer",

          status:
            reviewer?.status ?? "",

          isResubmissionReview:
            reviewer?.isResubmissionReview ??
            reviewer?.is_resubmission_review ??
            false,

          review: reviewer?.review
            ? {
                significance: Number(
                  reviewer.review.significance ?? 0
                ),
                relevance: Number(
                  reviewer.review.relevance ?? 0
                ),
                originality: Number(
                  reviewer.review.originality ?? 0
                ),
                average: Number(
                  reviewer.review.average ?? 0
                ),
                comment:
                  reviewer.review.comment ?? null,
                submittedAt:
                  reviewer.review.submittedAt ??
                  reviewer.review.submitted_at ??
                  null,
              }
            : null,
        }))
      : [],
  };
}

function VersionCard({
  version,
  isLatest,
  onResubmit,
}: {
  version: Version;
  isLatest: boolean;
  onResubmit: () => void;
}) {
  const [expanded, setExpanded] = useState(isLatest);

  const submittedReviews = version.reviews.filter(
    (r) => r.review !== null
  );

  return (
    <div
      className={`rounded-3xl bg-white border-2 shadow-sm overflow-hidden ${
        isLatest
          ? "border-indigo-200"
          : "border-gray-100"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
            <GitBranch className="w-3 h-3" />
            Version {version.version}
          </span>

          {isLatest && (
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Current
            </span>
          )}

          <span className="font-mono text-xs text-gray-500">
            {version.reference}
          </span>

          <span className="text-xs text-gray-400">
            {version.resubmittedAt
              ? `Resubmitted ${new Date(
                  version.resubmittedAt
                ).toLocaleDateString()}`
              : version.submittedAt
              ? `Submitted ${new Date(
                  version.submittedAt
                ).toLocaleDateString()}`
              : ""}
          </span>
        </div>

        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 ml-3" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-3" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-5 border-t border-gray-100">
          {version.resubmissionNote && (
            <div className="mt-5 rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-xs font-bold uppercase text-indigo-700 mb-1">
                Author's note for this version
              </p>

              <p className="text-sm text-indigo-900 whitespace-pre-wrap">
                {version.resubmissionNote}
              </p>
            </div>
          )}

          <div className="pt-5">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              {version.title}
            </h3>

            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
              <span className="bg-gray-100 px-2 py-1 rounded-full font-semibold">
                {SUB_THEME_LABELS[
                  version.subTheme
                ] ?? version.subTheme}
              </span>

              <span className="bg-gray-100 px-2 py-1 rounded-full font-semibold">
                {version.presentationType}
              </span>
            </div>

            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {version.body}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-indigo-700" />

              <h4 className="text-sm font-bold text-gray-900">
                Reviewer feedback ({submittedReviews.length})
              </h4>
            </div>

            {submittedReviews.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No reviews submitted on this version yet.
              </p>
            ) : (
              <div className="space-y-3">
                {submittedReviews.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border-2 border-gray-100 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {r.reviewerName ||
                          `Reviewer ${i + 1}`}
                      </span>

                      <span className="inline-flex items-center gap-1 text-sm font-bold text-indigo-700">
                        <Star className="w-3.5 h-3.5 text-amber-500" />

                        {r.review!.average.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                      <div>
                        Significance{" "}
                        <b className="text-gray-900">
                          {r.review!.significance}
                        </b>
                      </div>

                      <div>
                        Relevance{" "}
                        <b className="text-gray-900">
                          {r.review!.relevance}
                        </b>
                      </div>

                      <div>
                        Originality{" "}
                        <b className="text-gray-900">
                          {r.review!.originality}
                        </b>
                      </div>
                    </div>

                    {r.review!.comment && (
                      <p className="text-sm text-gray-700 italic bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">
                        "{r.review!.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EDIT / RESUBMIT */}
          {isLatest && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onResubmit}
                className="w-full h-12 rounded-2xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition-colors inline-flex items-center justify-center gap-2"
              >
                <FileEdit className="w-4 h-4" />
                Edit & Resubmit Abstract
              </button>

              <p className="text-xs text-gray-500 text-center mt-2">
                Your changes will be saved as a new version.
                The current version and its reviewer feedback
                will remain unchanged.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuthorAbstractDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const abstractId = searchParams.get("id");

  const [current, setCurrent] =
    useState<Version | null>(null);

  const [versions, setVersions] =
    useState<Version[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [resubmitOpen, setResubmitOpen] =
    useState(false);

  const load = useCallback(async () => {
    /*
     * Do not immediately redirect here if the query
     * parameter has not hydrated yet.
     */
    if (!abstractId) {
      return;
    }

    try {
      setLoading(true);

      console.log(
        "Loading author abstract:",
        abstractId
      );

      const { data } = await api.get(
        `/author/abstracts/${abstractId}`
      );

      console.log(
        "Author abstract response:",
        data
      );

      const normalizedCurrent =
        data?.data?.current
          ? normalizeVersion(data.data.current)
          : null;

      const normalizedVersions =
        Array.isArray(data?.data?.versions)
          ? data.data.versions.map(normalizeVersion)
          : [];

      setCurrent(normalizedCurrent);
      setVersions(normalizedVersions);
    } catch (err: any) {
      console.error(
        "Failed to load author abstract:",
        err
      );

      toast.error(
        err?.response?.data?.message ||
          "Failed to load this abstract."
      );

      router.push("/icw/author-dashboard");
    } finally {
      setLoading(false);
    }
  }, [abstractId, router]);

  useEffect(() => {
    if (abstractId) {
      load();
    }
  }, [abstractId, load]);

  const latest = useMemo(() => {
    /*
     * First look for the version explicitly marked current.
     */
    const currentVersion = versions.find(
      (v) => v.isCurrent === true
    );

    if (currentVersion) {
      return currentVersion;
    }

    /*
     * Fallback to API's current object.
     */
    if (current?.isCurrent) {
      return current;
    }

    /*
     * Final fallback: highest version number.
     */
    if (versions.length > 0) {
      return [...versions].sort(
        (a, b) => b.version - a.version
      )[0];
    }

    return current;
  }, [versions, current]);

  /*
   * While the query parameter is still being resolved,
   * don't display "abstract not found".
   */
  if (!abstractId || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">
            Abstract not found.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/icw/author-dashboard")
            }
            className="mt-4 inline-flex items-center gap-2 text-indigo-700 font-semibold hover:text-indigo-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to my abstracts
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className=" text-black">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            type="button"
            onClick={() =>
              router.push("/icw/author-dashboard")
            }
            className="inline-flex items-center gap-1 text-black hover:text-white text-sm font-semibold mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to my abstracts
          </button>

          <p className="font-mono text-xs text-black mb-2">
            {latest.reference}
          </p>

          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            {latest.title}
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {versions.length > 1 && (
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />

            <p className="text-sm text-blue-900">
              This abstract has{" "}
              <b>{versions.length} versions</b>. The most
              recent version is shown first. Scroll to compare
              with earlier versions and their reviewer feedback.
            </p>
          </div>
        )}

        {versions.length > 0 ? (
          [...versions]
            .sort((a, b) => b.version - a.version)
            .map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                isLatest={version.isCurrent}
                onResubmit={() =>
                  setResubmitOpen(true)
                }
              />
            ))
        ) : (
          <VersionCard
            version={latest}
            isLatest={true}
            onResubmit={() =>
              setResubmitOpen(true)
            }
          />
        )}
      </div>

      {latest && (
        <ResubmitModal
          isOpen={resubmitOpen}
          onClose={() =>
            setResubmitOpen(false)
          }
          abstract={latest}
          onSubmitted={() => {
            setResubmitOpen(false);
            load();
            toast.success(
              "Corrections submitted successfully."
            );
          }}
        />
      )}
    </div>
    </Layout>
  );
}