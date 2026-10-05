import React, { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Button, Input } from "@roketid/windmill-react-ui";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2, X, Lock, Unlock, Sparkles, Star } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import InvitationsCard from "../components/InvitationsCard";

type QType = "rating" | "single_choice" | "multi_choice" | "text";

type Question = {
  questionId: number;
  type: QType;
  prompt: string;
  options: string[] | null;
  required: boolean;
};

type AdminData = {
  status: "open" | "closed";
  responseCount: number;
  questions: Question[];
};

type ResultQuestion = {
  questionId: number;
  type: QType;
  prompt: string;
  answered: number;
  average?: number | null;
  distribution?: { label: string; count: number }[];
  answers?: string[];
};

type Results = {
  totalResponses: number;
  attendedCount: number;
  questions: ResultQuestion[];
};

type ApiSuccess<T> = { success: true; message: string; data: T };

const TYPE_LABELS: Record<QType, string> = {
  rating: "Rating (1–5)",
  single_choice: "Single choice",
  multi_choice: "Multiple choice",
  text: "Free text",
};

const EMPTY_FORM = { type: "rating" as QType, prompt: "", optionsText: "", required: true };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function DistributionBars({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs font-semibold text-gray-700 dark:text-gray-300" title={it.label}>
            {it.label}
          </span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-500"
              style={{ width: `${total ? (it.count / total) * 100 : 0}%` }}
            />
          </div>
          <span className="w-8 text-right text-sm font-bold text-gray-900 dark:text-white">{it.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function QuestionnaireAdminPage() {
  const [tab, setTab] = useState<"questions" | "results">("questions");
  const [data, setData] = useState<AdminData | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ApiSuccess<AdminData>>("/questionnaire/admin");
      setData(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load the questionnaire.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoadingResults(true);
      const res = await api.get<ApiSuccess<Results>>("/questionnaire/results");
      setResults(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load results.");
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === "results") loadResults();
  }, [tab, loadResults]);

  const questions = data?.questions ?? [];
  const isChoice = form.type === "single_choice" || form.type === "multi_choice";

  async function toggleStatus() {
    if (!data) return;
    try {
      setTogglingStatus(true);
      const next = data.status === "open" ? "closed" : "open";
      const res = await api.patch<ApiSuccess<null>>("/questionnaire/status", { status: next });
      toast.success(res.data.message);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to change status.");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function seedDefaults() {
    try {
      await api.post("/questionnaire/seed-defaults");
      toast.success("Starter questions added.");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add starter questions.");
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(q: Question) {
    setEditingId(q.questionId);
    setForm({ type: q.type, prompt: q.prompt, optionsText: (q.options || []).join("\n"), required: q.required });
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!form.prompt.trim()) return toast.error("Enter the question text.");

    const options = form.optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    if (isChoice && new Set(options).size < 2) return toast.error("Add at least two different options, one per line.");

    const payload = {
      type: form.type,
      prompt: form.prompt.trim(),
      required: form.required,
      options: isChoice ? options : null,
    };

    try {
      setSaving(true);
      const res = editingId
        ? await api.put<ApiSuccess<Question>>(`/questionnaire/questions/${editingId}`, payload)
        : await api.post<ApiSuccess<Question>>("/questionnaire/questions", payload);

      toast.success(res.data.message);
      setFormOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save the question.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(q: Question) {
    const warn = data && data.responseCount > 0 ? "\n\nExisting responses already include answers to it." : "";
    if (!window.confirm(`Delete this question?${warn}`)) return;

    try {
      await api.delete(`/questionnaire/questions/${q.questionId}`);
      toast.success("Question deleted.");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete.");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!data || target < 0 || target >= questions.length) return;

    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    setData({ ...data, questions: reordered }); // optimistic

    try {
      await api.post("/questionnaire/reorder", { ids: reordered.map((q) => q.questionId) });
    } catch (err: any) {
      toast.error("Failed to save the new order.");
      await load();
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
        </div>
      </Layout>
    );
  }

  const open = data?.status === "open";

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageTitle>After-Event Questionnaire</PageTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Participants complete this to unlock their certificate. Open it when the event ends.
          </p>
        </div>

        <Button
          onClick={toggleStatus}
          disabled={togglingStatus}
          className={`rounded-2xl h-12 px-6 border-0 shadow-lg ${
            open ? "bg-amber-600 hover:bg-amber-700" : "bg-gradient-to-r from-green-600 to-emerald-600"
          }`}
        >
          <span className="inline-flex items-center gap-2 font-bold uppercase">
            {togglingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : open ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            {open ? "Close questionnaire" : "Open questionnaire"}
          </span>
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${
            open
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {open ? "Open" : "Closed"}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {data?.responseCount ?? 0} response{data?.responseCount === 1 ? "" : "s"} so far
        </span>
      </div>

      <InvitationsCard open={open} />

      <div className="mb-6 flex gap-2">
        {(["questions", "results"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-full border-2 text-sm font-bold uppercase transition-all ${
              tab === t
                ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Questions tab ── */}
      {tab === "questions" && (
        <>
          {data && data.responseCount > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
              {data.responseCount} response(s) already submitted. Editing or deleting questions now affects how old answers appear in the results.
            </div>
          )}

          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center">
                <p className="font-bold text-gray-800 dark:text-gray-100 uppercase">No questions yet</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Start from a ready-made set or build your own.</p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={seedDefaults} className="rounded-2xl h-11 bg-gradient-to-r from-green-600 to-emerald-600 border-0">
                    <span className="inline-flex items-center gap-2 font-bold">
                      <Sparkles className="w-4 h-4" />
                      Load starter questions
                    </span>
                  </Button>
                  <Button layout="outline" onClick={openCreate} className="rounded-2xl h-11 border-2">
                    <span className="font-bold">Add my own</span>
                  </Button>
                </div>
              </div>
            ) : (
              questions.map((q, i) => (
                <div
                  key={q.questionId}
                  className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-5 flex items-start gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === questions.length - 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">
                      <span className="text-gray-400 mr-2">{i + 1}.</span>
                      {q.prompt}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-bold uppercase">
                        {TYPE_LABELS[q.type]}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold uppercase ${
                          q.required
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {q.required ? "Required" : "Optional"}
                      </span>
                    </div>
                    {q.options && q.options.length > 0 && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{q.options.join("  ·  ")}</p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(q)} className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {questions.length > 0 && (
            <Button onClick={openCreate} layout="outline" className="mt-5 rounded-2xl h-12 border-2">
              <span className="inline-flex items-center gap-2 font-bold">
                <Plus className="w-4 h-4" />
                Add question
              </span>
            </Button>
          )}
        </>
      )}

      {/* ── Results tab ── */}
      {tab === "results" && (
        <>
          {loadingResults || !results ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Responses</p>
                  <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">{results.totalResponses}</p>
                </div>
                <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Attended (confirmed)</p>
                  <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">{results.attendedCount}</p>
                </div>
              </div>

              {results.questions.map((q, i) => (
                <div key={q.questionId} className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-bold text-gray-900 dark:text-white">
                      <span className="text-gray-400 mr-2">{i + 1}.</span>
                      {q.prompt}
                    </p>
                    <span className="shrink-0 text-xs text-gray-500">{q.answered} answered</span>
                  </div>

                  {q.type === "rating" && (
                    <div className="mt-4">
                      <p className="mb-3 flex items-center gap-2 text-2xl font-extrabold text-gray-900 dark:text-white">
                        <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                        {q.average ?? "—"}
                        <span className="text-sm font-medium text-gray-500">/ 5</span>
                      </p>
                      <DistributionBars items={q.distribution || []} total={q.answered} />
                    </div>
                  )}

                  {(q.type === "single_choice" || q.type === "multi_choice") && (
                    <div className="mt-4">
                      <DistributionBars items={q.distribution || []} total={q.answered} />
                    </div>
                  )}

                  {q.type === "text" && (
                    <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
                      {(q.answers || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No answers yet.</p>
                      ) : (
                        (q.answers || []).map((a, idx) => (
                          <p key={idx} className="rounded-2xl bg-gray-50 dark:bg-gray-700/50 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {a}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / edit question */}
      {formOpen && (
        <Modal title={editingId ? "Edit question" : "Add question"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Type</label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as QType })}
              >
                {(Object.keys(TYPE_LABELS) as QType[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full h-24 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-green-500 focus:ring-green-500 resize-none"
                maxLength={500}
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              />
            </div>

            {isChoice && (
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Options <span className="text-gray-400 text-xs normal-case font-normal">(one per line)</span>
                </label>
                <textarea
                  className="w-full h-28 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-green-500 focus:ring-green-500 resize-none"
                  placeholder={"Yes\nMaybe\nNo"}
                  value={form.optionsText}
                  onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Required</span>
            </label>

            <div className="flex gap-3 pt-2">
              <Button type="button" layout="outline" className="rounded-2xl h-12 flex-1 border-2" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-2xl h-12 flex-1 bg-gradient-to-r from-green-600 to-emerald-600 border-0">
                <span className="inline-flex items-center gap-2 font-bold uppercase">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <div className="pb-20" />
    </Layout>
  );
}