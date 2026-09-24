// src/pages/author/components/ResubmitModal.tsx

import React, { FormEvent, useEffect, useState } from "react";
import { X, Loader2, FileEdit, Info, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import {
  SUB_THEMES,
  PRESENTATION_TYPES,
  ABSTRACT_WORD_LIMIT,
  countWords,
} from "../../types/abstract-type";

type Version = {
  id: number;
  title: string;
  body: string;
  keywords: string | null;
  subTheme: string;
  presentationType: string;
};

export default function ResubmitModal({
  isOpen,
  onClose,
  abstract,
  onSubmitted,
}: {
  isOpen: boolean;
  onClose: () => void;
  abstract: Version;
  onSubmitted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [keywords, setKeywords] = useState("");
  const [subTheme, setSubTheme] = useState("");
  const [presentationType, setPresentationType] = useState("");
  const [resubmissionNote, setResubmissionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(abstract.title);
      setBody(abstract.body);
      setKeywords(abstract.keywords ?? "");
      setSubTheme(abstract.subTheme);
      setPresentationType(abstract.presentationType);
      setResubmissionNote("");
    }
  }, [isOpen, abstract]);

  const wordCount = countWords(body);
  const overLimit = wordCount > ABSTRACT_WORD_LIMIT;

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resubmissionNote.trim()) {
      toast.error("Please describe what changed in this version.");
      return;
    }
    if (overLimit) {
      toast.error(`Abstract exceeds ${ABSTRACT_WORD_LIMIT} words.`);
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/author/abstracts/${abstract.id}/resubmit`, {
        title: title.trim(),
        body: body.trim(),
        keywords: keywords.trim(),
        subTheme,
        presentationType,
        resubmissionNote: resubmissionNote.trim(),
      });
      onSubmitted();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to submit corrections."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-start justify-between sticky top-0 rounded-t-3xl">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-indigo-700" />
              Submit corrections
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Your corrections will be recorded as a new version. The original
              submission and its reviews remain intact.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900">
              Reviewers will see your revised abstract alongside their previous
              feedback. No accept/reject decision is taken on this
              resubmission — it is for documentation only.
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              What changed? <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-28 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm focus:border-indigo-600 focus:ring-indigo-600 outline-none resize-none"
              placeholder="e.g. Added sample size justification, corrected Table 2 numbers, expanded the discussion of limitations..."
              value={resubmissionNote}
              onChange={(e) => setResubmissionNote(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Title
            </label>
            <input
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Sub-theme
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                value={subTheme}
                onChange={(e) => setSubTheme(e.target.value)}
                disabled
              >
                {SUB_THEMES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Presentation preference
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                value={presentationType}
                onChange={(e) => setPresentationType(e.target.value)}
                disabled
              >
                {PRESENTATION_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Keywords
            </label>
            <input
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Abstract
            </label>
            <textarea
              className={`w-full h-64 rounded-2xl border-2 px-4 py-3 text-sm font-medium outline-none resize-none ${
                overLimit
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200 focus:border-indigo-600 focus:ring-indigo-600"
              }`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
            <div className="mt-1.5 flex items-center justify-between">
              {overLimit && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Over the word limit
                </p>
              )}
              <span
                className={`text-xs font-semibold ml-auto ${
                  overLimit ? "text-red-600" : "text-gray-400"
                }`}
              >
                {wordCount} / {ABSTRACT_WORD_LIMIT} words
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || overLimit}
              className="h-11 px-6 rounded-2xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileEdit className="w-4 h-4" />
              )}
              {submitting ? "Submitting..." : "Submit corrections"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}