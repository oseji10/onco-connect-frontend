import React, { FormEvent, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building,
  Users,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";
import {
  SUB_THEMES,
  PRESENTATION_TYPES,
  ABSTRACT_WORD_LIMIT,
  countWords,
  Author,
  SubThemeValue,
  PresentationType,
} from "../../types/abstract-type";

// ─── Types ────────────────────────────────────────────────────────────────

type FormState = {
  title: string;
  subTheme: SubThemeValue | "";
  presentationType: PresentationType | "";
  keywords: string;
  body: string;
  authors: Author[];
  declarationChecked: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>> & {
  authors?: string;
};

function newAuthor(isCorresponding = false): Author {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    affiliation: "",
    email: "",
    isCorresponding,
    phone: "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SubmitAbstractPage() {
  const [form, setForm] = useState<FormState>({
    title: "",
    subTheme: "",
    presentationType: "",
    keywords: "",
    body: "",
    authors: [newAuthor(true)],
    declarationChecked: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const wordCount = countWords(form.body);
  const overLimit = wordCount > ABSTRACT_WORD_LIMIT;

  function updateAuthor(id: string, patch: Partial<Author>) {
    setForm((prev) => ({
      ...prev,
      authors: prev.authors.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }

  function setCorresponding(id: string) {
    setForm((prev) => ({
      ...prev,
      authors: prev.authors.map((a) => ({ ...a, isCorresponding: a.id === id })),
    }));
  }

  function addAuthor() {
    setForm((prev) => ({ ...prev, authors: [...prev.authors, newAuthor(false)] }));
  }

  function removeAuthor(id: string) {
    setForm((prev) => {
      const remaining = prev.authors.filter((a) => a.id !== id);
      // keep exactly one corresponding author
      if (remaining.length && !remaining.some((a) => a.isCorresponding)) {
        remaining[0].isCorresponding = true;
      }
      return { ...prev, authors: remaining };
    });
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) newErrors.title = "Title is required.";
    if (!form.subTheme) newErrors.subTheme = "Please select a sub-theme.";
    if (!form.presentationType)
      newErrors.presentationType = "Please select a presentation preference.";
    if (!form.body.trim()) newErrors.body = "Abstract text is required.";
    else if (wordCount > ABSTRACT_WORD_LIMIT)
      newErrors.body = `Abstract exceeds the ${ABSTRACT_WORD_LIMIT}-word limit (currently ${wordCount}).`;

    const authorProblem = form.authors.some(
      (a) => !a.name.trim() || !a.affiliation.trim()
    );
    if (form.authors.length === 0 || authorProblem) {
      newErrors.authors = "Every author needs a name and affiliation.";
    }
    const correspondingAuthor = form.authors.find((a) => a.isCorresponding);
if (correspondingAuthor && !correspondingAuthor.email.trim()) {
  newErrors.authors =
    "The corresponding author needs an email address so we can reach them.";
}
if (correspondingAuthor && !correspondingAuthor.phone.trim()) {
  newErrors.authors =
    "The corresponding author needs a phone number so we can reach them.";
}
    if (!form.declarationChecked) {
      newErrors.declarationChecked =
        "Please confirm the declaration before submitting.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    try {
      setSubmitting(true);
      const { data } = await api.post("/abstracts/submit", {
        title: form.title.trim(),
        subTheme: form.subTheme,
        presentationType: form.presentationType,
        keywords: form.keywords.trim(),
        body: form.body.trim(),
        wordCount,
        authors: form.authors,
      });
      setSubmittedRef(data?.data?.reference || data?.reference || "your submission");
      toast.success("Abstract submitted successfully!");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────
  if (submittedRef) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Abstract received
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for submitting to the 2026 International Cancer Week
            Conference. Your tracking reference is:
          </p>
          <div className="inline-block px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-900 font-mono font-bold text-lg mb-6">
            {submittedRef}
          </div>
          <p className="text-sm text-gray-500">
            We'll email the corresponding author once the review process is
            complete. Keep this reference for any correspondence with the
            Abstract Committee.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header banner */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-xxl font-bold uppercase tracking-widest text-indigo-300 mb-2">
            2026 International Cancer Week &middot; 5&ndash;9 October 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Submit Your Abstract
          </h1>
          <p className="mt-3 text-indigo-100 max-w-2xl">
            Theme: United Against Cancer: Building Resilient, Innovative and Equitable Systems Across the Cancer Care Continuum.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Title & classification */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-indigo-700" />
            <h2 className="text-lg font-bold text-gray-900">Abstract details</h2>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none transition-colors"
              placeholder="Enter the title of your abstract"
              value={form.title}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, title: e.target.value }));
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <FieldError message={errors.title} />
              <span className="text-xs text-gray-400">
                {countWords(form.title)} words
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Sub-theme <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none transition-colors"
                value={form.subTheme}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    subTheme: e.target.value as SubThemeValue,
                  }));
                  setErrors((prev) => ({ ...prev, subTheme: undefined }));
                }}
              >
                <option value="">Select a sub-theme</option>
                {SUB_THEMES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.subTheme} />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Presentation preference <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none transition-colors"
                value={form.presentationType}
                onChange={(e) => {
                  setForm((prev) => ({
                    ...prev,
                    presentationType: e.target.value as PresentationType,
                  }));
                  setErrors((prev) => ({ ...prev, presentationType: undefined }));
                }}
              >
                <option value="">Select preference</option>
                {PRESENTATION_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <FieldError message={errors.presentationType} />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Keywords <span className="text-gray-400 font-normal">(optional, comma-separated)</span>
            </label>
            <input
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none transition-colors"
              placeholder="e.g. breast cancer, screening, health equity"
              value={form.keywords}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, keywords: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Abstract <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full h-56 rounded-2xl border-2 px-4 py-3 text-sm font-medium outline-none transition-colors resize-none ${
                overLimit
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200 focus:border-indigo-600 focus:ring-indigo-600"
              }`}
              placeholder="Background, methods, results, and conclusion..."
              value={form.body}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, body: e.target.value }));
                setErrors((prev) => ({ ...prev, body: undefined }));
              }}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <FieldError message={errors.body} />
              <span
                className={`text-xs font-semibold ${
                  overLimit ? "text-red-600" : "text-gray-400"
                }`}
              >
                {wordCount} / {ABSTRACT_WORD_LIMIT} words
              </span>
            </div>
          </div>
        </section>

        {/* Authors */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-700" />
              <h2 className="text-lg font-bold text-gray-900">
                Authors &amp; affiliation
              </h2>
            </div>
            <button
              type="button"
              onClick={addAuthor}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              <Plus className="w-4 h-4" /> Add author
            </button>
          </div>

          <FieldError message={errors.authors} />

          <div className="space-y-4">
            {form.authors.map((author, idx) => (
              <div
                key={author.id}
                className="rounded-2xl border-2 border-gray-100 p-4 sm:p-5 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Author {idx + 1}
                  </span>
                  {form.authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuthor(author.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    className="h-11 rounded-xl border-2 border-gray-200 px-3.5 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                    placeholder="Full name"
                    value={author.name}
                    onChange={(e) =>
                      updateAuthor(author.id, { name: e.target.value })
                    }
                  />
                  <input
                    className="h-11 rounded-xl border-2 border-gray-200 px-3.5 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                    placeholder="Affiliation / institution"
                    value={author.affiliation}
                    onChange={(e) =>
                      updateAuthor(author.id, { affiliation: e.target.value })
                    }
                  />
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
  <input
    className="h-11 rounded-xl border-2 border-gray-200 px-3.5 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none flex-1"
    placeholder="Email"
    type="email"
    value={author.email}
    onChange={(e) =>
      updateAuthor(author.id, { email: e.target.value })
    }
  />
  <input
    className="h-11 rounded-xl border-2 border-gray-200 px-3.5 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none flex-1"
    placeholder="Phone number"
    type="tel"
    value={author.phone}
    onChange={(e) =>
      updateAuthor(author.id, { phone: e.target.value })
    }
  />
  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 shrink-0">
    <input
      type="radio"
      name="corresponding"
      checked={author.isCorresponding}
      onChange={() => setCorresponding(author.id)}
      className="accent-indigo-700"
    />
    Corresponding author
  </label>
</div>
              </div>
            ))}
          </div>
        </section>

        {/* Declaration */}
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-start gap-2 mb-2">
            <Building className="w-5 h-5 text-indigo-700 mt-0.5" />
            <h2 className="text-lg font-bold text-gray-900">Declaration</h2>
          </div>
          <label className="flex items-start gap-3 mt-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-indigo-700"
              checked={form.declarationChecked}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  declarationChecked: e.target.checked,
                }));
                setErrors((prev) => ({ ...prev, declarationChecked: undefined }));
              }}
            />
            <span className="text-sm text-gray-600">
              I confirm this abstract is original work, has not been previously
              published, and that all listed authors have approved this
              submission.
            </span>
          </label>
          <FieldError message={errors.declarationChecked} />
        </section>

        <button
          type="submit"
          disabled={submitting || !form.declarationChecked}
          className="w-full h-14 rounded-2xl bg-indigo-700 text-white font-bold uppercase tracking-wide shadow-lg shadow-indigo-900/25 hover:from-indigo-900 hover:to-black transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ClipboardList className="w-5 h-5" />
          )}
          {submitting ? "Submitting..." : "Submit Abstract"}
        </button>
      </form>
      <div className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500 pb-10">
        <p>
          © 2026 National Institute for Cancer Research & Treatment (NICRAT). All rights reserved.{" "}
          <b>Powered by Resilience Nigeria - The Official Technology Partner of The 2026 International Cancer Week</b>
        </p>
      </div>
    </div>
  );
}