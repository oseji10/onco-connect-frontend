import React, { useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Star, Loader2, Lock, BadgeCheck, Clock, Download, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";

export type QType = "rating" | "single_choice" | "multi_choice" | "text";

export type Question = {
  questionId: number;
  type: QType;
  prompt: string;
  options: string[] | null;
  required: boolean;
};

export type QuestionnaireData = {
  firstName?: string;
  status: "open" | "closed";
  submitted: boolean;
  answers: Record<string, any>;
  certificateEligible: boolean;
  questions: Question[];
};

type Answers = Record<number, any>;

type Props = {
  data: QuestionnaireData;
  /** POST the answers. Must resolve with the API's { success, message, data } body; throw (axios) on failure. */
  submit: (answers: Answers) => Promise<{ message: string; data: { certificateEligible: boolean } }>;
  /** Called when the person clicks "Download certificate". */
  onDownload: () => void | Promise<void>;
};

/** Downloads a PDF from an API path (works for both the logged-in and public certificate routes). */
export async function downloadCertificatePdf(path: string) {
  try {
    const res = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    let message = "Could not download your certificate.";
    try {
      const text = await err?.response?.data?.text();
      message = JSON.parse(text).message || message;
    } catch {}
    toast.error(message);
  }
}

function isEmpty(v: any) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

const pill = (selected: boolean) =>
  `inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all ${
    selected
      ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400"
  }`;

function Heading({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-6 text-2xl font-semibold text-gray-700 dark:text-gray-200">{children}</h1>;
}

function DownloadButton({ onDownload }: { onDownload: () => void | Promise<void> }) {
  return (
    <Button onClick={onDownload} className="mt-6 rounded-2xl h-12 px-8 bg-gradient-to-r from-green-600 to-emerald-600 border-0 shadow-lg">
      <span className="inline-flex items-center gap-2 font-bold uppercase">
        <Download className="w-5 h-5" />
        Download certificate
      </span>
    </Button>
  );
}

export default function QuestionnaireView({ data, submit, onDownload }: Props) {
  const [answers, setAnswers] = useState<Answers>((data.answers as Answers) || {});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ eligible: boolean; message: string } | null>(null);

  function setAnswer(id: number, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function toggleMulti(id: number, option: string) {
    const current: string[] = Array.isArray(answers[id]) ? answers[id] : [];
    setAnswer(id, current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const missing: Record<number, string> = {};
    for (const q of data.questions) {
      const value = typeof answers[q.questionId] === "string" ? answers[q.questionId].trim() : answers[q.questionId];
      if (q.required && isEmpty(value)) missing[q.questionId] = "This question is required.";
    }

    if (Object.keys(missing).length) {
      setErrors(missing);
      toast.error("Please answer all required questions.");
      document.getElementById(`q-${Object.keys(missing)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await submit(answers);
      setDone({ eligible: res.data.certificateEligible, message: res.message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors as Record<string, string[]> | undefined;
      if (apiErrors) {
        const mapped: Record<number, string> = {};
        Object.entries(apiErrors).forEach(([key, msgs]) => {
          const id = Number(key.replace("answers.", ""));
          if (!Number.isNaN(id)) mapped[id] = msgs[0];
        });
        setErrors(mapped);
      }
      toast.error(err?.response?.data?.message || "Could not submit the questionnaire.");
    } finally {
      setSubmitting(false);
    }
  }

  // After submitting
  if (done) {
    return (
      <>
        <Heading>Questionnaire</Heading>
        <div
          className={`rounded-3xl border-2 p-8 text-center ${
            done.eligible
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
              : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
          }`}
        >
          {done.eligible ? <BadgeCheck className="w-14 h-14 mx-auto text-emerald-600" /> : <Clock className="w-14 h-14 mx-auto text-amber-600" />}
          <p className="mt-4 text-lg font-bold text-gray-900 dark:text-white">{done.message}</p>
          {done.eligible && <DownloadButton onDownload={onDownload} />}
        </div>
      </>
    );
  }

  // Closed
  if (data.status !== "open") {
    return (
      <>
        <Heading>Questionnaire</Heading>
        <div className="rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center shadow-lg">
          <Lock className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 font-bold text-gray-900 dark:text-white uppercase">
            {data.submitted ? "Questionnaire closed" : "Not open yet"}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {data.submitted
              ? "Thank you, your responses have been recorded."
              : "The after-event questionnaire opens once the conference ends. Please check back soon."}
          </p>
          {data.certificateEligible && <DownloadButton onDownload={onDownload} />}
        </div>
      </>
    );
  }

  return (
    <>
      <Heading>After-Event Questionnaire</Heading>
      <p className="-mt-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
        {data.firstName ? `Hi ${data.firstName}. ` : ""}
        Complete this short questionnaire to unlock your certificate of participation.
        {data.submitted && " You have already submitted, but you can update your answers below."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {data.questions.map((q, index) => (
          <div
            key={q.questionId}
            id={`q-${q.questionId}`}
            className={`rounded-3xl bg-white dark:bg-gray-800 border-2 shadow-lg p-6 ${
              errors[q.questionId] ? "border-red-300 dark:border-red-700" : "border-gray-100 dark:border-gray-700"
            }`}
          >
            <p className="font-bold text-gray-900 dark:text-white">
              <span className="text-gray-400 mr-2">{index + 1}.</span>
              {q.prompt}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </p>

            <div className="mt-4">
              {q.type === "rating" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setAnswer(q.questionId, n)} aria-label={`${n} out of 5`}>
                      <Star
                        className={`w-9 h-9 transition-colors ${
                          n <= (answers[q.questionId] || 0) ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}

              {q.type === "single_choice" && (
                <div className="flex flex-wrap gap-3">
                  {(q.options || []).map((opt) => (
                    <button key={opt} type="button" onClick={() => setAnswer(q.questionId, opt)} className={pill(answers[q.questionId] === opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "multi_choice" && (
                <div className="flex flex-wrap gap-3">
                  {(q.options || []).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMulti(q.questionId, opt)}
                      className={pill(Array.isArray(answers[q.questionId]) && answers[q.questionId].includes(opt))}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "text" && (
                <textarea
                  className="w-full h-28 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-green-500 focus:ring-green-500 resize-none"
                  maxLength={2000}
                  value={answers[q.questionId] || ""}
                  onChange={(e) => setAnswer(q.questionId, e.target.value)}
                />
              )}
            </div>

            {errors[q.questionId] && (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors[q.questionId]}
              </p>
            )}
          </div>
        ))}

        <Button type="submit" disabled={submitting} className="rounded-2xl h-14 w-full bg-gradient-to-r from-green-600 to-emerald-600 border-0 shadow-lg">
          <span className="inline-flex items-center justify-center gap-2 font-bold uppercase text-base">
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {submitting ? "Submitting..." : data.submitted ? "Update responses" : "Submit & unlock certificate"}
          </span>
        </Button>
      </form>
    </>
  );
}