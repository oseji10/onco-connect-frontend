"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  FileText,
  ChevronRight,
  Star,
  Clock,
  MessageSquare,
  GitBranch,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import Layout from "../containers/Layout";

type AuthorAbstractItem = {
  id: number;
  reference: string;
  title: string;
  subTheme: string;
  status: "submitted" | "under_review" | "scored" | "accepted" | "rejected";
  version: number;
  averageScore: number | null;
  submittedAt: string | null;
  reviewers: {
    reviewerName: string;
    status: string;
    isResubmissionReview: boolean;
    review: {
      average: number;
      comment: string | null;
    } | null;
  }[];
};

const SUB_THEME_LABELS: Record<string, string> = {
  // Add your actual sub-theme mappings here.
  // Example:
  // "cancer_prevention": "Cancer Prevention",
  // "early_detection": "Early Detection",
};

function StatusPill({
  status,
}: {
  status: AuthorAbstractItem["status"];
}) {
  const styles: Record<
    AuthorAbstractItem["status"],
    string
  > = {
    submitted: "bg-gray-100 text-gray-700",
    under_review: "bg-yellow-100 text-yellow-800",
    scored: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
        styles[status]
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default function AuthorAbstractsPage() {
  const [abstracts, setAbstracts] = useState<
    AuthorAbstractItem[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/author/abstracts")
      .then(({ data }) => {
        setAbstracts(data?.data || []);
      })
      .catch((error) => {
        console.error("Failed to load author abstracts:", error);
        toast.error("Failed to load your abstracts.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Layout>

    
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* <div className="bg-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-2">
            Author Portal
          </p>

          <h1 className="text-3xl font-extrabold">
            My Abstracts
          </h1>

          <p className="mt-2 text-indigo-100 text-sm max-w-2xl">
            Review committee feedback on your submission, and
            submit corrected versions if needed.
          </p>
        </div>
      </div> */}

      {/* Content */}
      <h1 className="text-3xl font-extrabold">
            My Abstracts
          </h1>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          </div>
        ) : abstracts.length === 0 ? (
          <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-sm p-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />

            <p className="text-lg font-semibold text-gray-700">
              No abstracts linked to your account
            </p>

            <p className="text-sm text-gray-500 mt-2">
              If you believe this is an error, contact the
              Abstract Committee.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {abstracts.map((a) => {
              const submittedReviews = a.reviewers.filter(
                (r) => r.review !== null
              ).length;

              const hasComments = submittedReviews > 0;

              return (
                // <Link
                //   key={a.id}
                //   href={`/author/abstracts/${a.id}`}
                //   className="block rounded-3xl bg-white border-2 border-gray-100 shadow-sm p-6 hover:border-indigo-200 hover:shadow-md transition-all"
                // >
                <Link
  key={a.id}
  href={`/icw/author-abstract-detail?id=${a.id}`}
  className="block rounded-3xl bg-white border-2 border-gray-100 shadow-sm p-6 hover:border-indigo-200 hover:shadow-md transition-all"
>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-xs text-gray-500">
                          {a.reference}
                        </span>

                        <StatusPill status={a.status} />

                        {a.version > 1 && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                            <GitBranch className="w-3 h-3" />
                            Version {a.version}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-bold text-gray-900 line-clamp-2 mb-2">
                        {a.title}
                      </h2>

                      <p className="text-xs text-gray-500">
                        {SUB_THEME_LABELS[a.subTheme] ??
                          a.subTheme}
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-300 shrink-0 mt-1" />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                    {a.averageScore != null && (
                      <span className="inline-flex items-center gap-1 text-gray-700 font-semibold">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        Score {a.averageScore.toFixed(2)}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <MessageSquare className="w-3.5 h-3.5" />

                      {hasComments
                        ? `${submittedReviews} reviewer comment${
                            submittedReviews === 1
                              ? ""
                              : "s"
                          }`
                        : "Awaiting reviewer feedback"}
                    </span>

                    {a.submittedAt && (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Clock className="w-3.5 h-3.5" />

                        {new Date(
                          a.submittedAt
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}