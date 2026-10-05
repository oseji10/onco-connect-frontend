"use client";

// app/panel/page.tsx   (link format:  /panel?token=<secret>)
// PUBLIC page — panelists open their personal link on a phone/tablet and score
// each oral presentation as it happens. No login.
// Uses a query string, not a [token] segment, because the site is statically exported.
// (Token is read from window.location in an effect, so no Suspense / useSearchParams needed.)

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Search, X } from "lucide-react";

import api from "../lib/api";
import { SUB_THEMES } from "../types/abstract-type";
import {
  CRITERIA,
  CriterionKey,
  MAX_PER_CRITERION,
  MAX_TOTAL,
  MyScore,
  SCORE_LABELS,
  percentTone,
  percentageOf,
  totalOf,
} from "../lib/oralScoring";

interface Presentation {
  id: number;
  reference: string;
  title: string;
  subTheme?: string | null;
  presenter?: string | null;
  myScore: MyScore | null;
}

type Filter = "all" | "todo" | "done";

function subThemeLabel(value?: string | null) {
  if (!value) return "";
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

function firstError(err: any, fallback: string) {
  const errors = err?.response?.data?.errors;
  const first = errors ? (Object.values(errors)[0] as string[] | undefined)?.[0] : undefined;
  return first || err?.response?.data?.message || fallback;
}

export default function PanelScoringPage() {
  // Read the token straight from the URL in the browser. (With a static export
  // the page is pre-built without a query string, so reading it during render
  // can come back empty on the first pass.)  null = not read yet.
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const [panelistName, setPanelistName] = useState("");
  const [presentations, setPresentations] = useState<Presentation[]>([]);

  const [search, setSearch] = useState("");
  const [subTheme, setSubTheme] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");

  const [active, setActive] = useState<Presentation | null>(null);
  const [draft, setDraft] = useState<Partial<Record<CriterionKey, number>>>({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (token === null) return; // still reading the URL

    if (token === "") {
      setFatal("This scoring link is incomplete. Please open the full link you were sent.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setFatal("");
        const { data } = await api.get(`/panel/${token}/presentations`);
        setPanelistName(data.data.panelist.name);
        setPresentations(data.data.presentations);
      } catch (err: any) {
        setFatal(
          err?.response?.data?.message ||
            "We couldn't open this scoring page. Check your link or contact the organisers."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const scoredCount = presentations.filter((p) => p.myScore).length;

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return presentations.filter((p) => {
      if (filter === "todo" && p.myScore) return false;
      if (filter === "done" && !p.myScore) return false;
      if (subTheme !== "all" && p.subTheme !== subTheme) return false;
      if (!q) return true;
      return (
        p.reference.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        (p.presenter ?? "").toLowerCase().includes(q)
      );
    });
  }, [presentations, search, subTheme, filter]);

  function openSheet(p: Presentation) {
    setActive(p);
    setDraft(p.myScore ? { ...p.myScore.scores } : {});
    setComment(p.myScore?.comment ?? "");
    setSheetError("");
  }

  const allChosen = CRITERIA.every((c) => draft[c.key]);
  const total = totalOf(draft);

  async function submit() {
    if (!active || !allChosen) return;
    try {
      setSaving(true);
      setSheetError("");
      const { data } = await api.post(`/panel/${token}/presentations/${active.id}/score`, {
        scores: draft,
        comment: comment.trim() || null,
      });
      const saved: MyScore = data.data;
      setPresentations((prev) => prev.map((p) => (p.id === active.id ? { ...p, myScore: saved } : p)));
      setNotice(`Score saved for ${active.reference} (${saved.percentage}%).`);
      setActive(null);
    } catch (err: any) {
      setSheetError(firstError(err, "Could not save. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-green-700" />
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Scoring link unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{fatal}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-green-700">
            ICW 2026 · Oral Presentation Scoring
          </p>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-gray-900 truncate">{panelistName}</h1>
            <span className="text-xs font-semibold text-gray-500 shrink-0">
              {scoredCount} of {presentations.length} scored
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all"
              style={{ width: `${presentations.length ? (scoredCount / presentations.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4">
        {notice && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {notice}
          </div>
        )}

        {/* Search + filters */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, title or presenter..."
            className="w-full h-12 rounded-2xl border-2 border-gray-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-green-600"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={subTheme}
            onChange={(e) => setSubTheme(e.target.value)}
            className="h-10 rounded-xl border-2 border-gray-200 bg-white px-3 text-sm font-semibold"
          >
            <option value="all">All sub-themes</option>
            {SUB_THEMES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border-2 border-gray-200 bg-white p-1">
            {(
              [
                { value: "all", label: "All" },
                { value: "todo", label: "To score" },
                { value: "done", label: "Scored" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  filter === opt.value ? "bg-green-700 text-white" : "text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="mt-4 space-y-3">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              {presentations.length === 0
                ? "No oral presentations are open for scoring yet."
                : "Nothing matches your search."}
            </p>
          ) : (
            visible.map((p) => (
              <button
                key={p.id}
                onClick={() => openSheet(p)}
                className="w-full text-left rounded-2xl border-2 border-gray-100 bg-white p-4 shadow-sm active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-gray-400">{p.reference}</p>
                    <p className="mt-1 font-semibold text-gray-900 leading-snug line-clamp-3">{p.title}</p>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {p.presenter ? `${p.presenter}` : "Presenter not listed"}
                      {p.subTheme ? ` · ${subThemeLabel(p.subTheme)}` : ""}
                    </p>
                  </div>
                  {p.myScore ? (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold ${percentTone(
                        p.myScore.percentage
                      )}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {p.myScore.percentage}%
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white">
                      Score
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </main>

      {/* Scoring sheet */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-xl max-h-[95dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 bg-green-50 rounded-t-3xl">
              <div className="min-w-0">
                <p className="font-mono text-xs font-bold text-green-800">{active.reference}</p>
                <h2 className="mt-0.5 text-base font-bold text-gray-900 leading-snug line-clamp-3">
                  {active.title}
                </h2>
                {active.presenter && <p className="mt-1 text-xs text-gray-600">{active.presenter}</p>}
              </div>
              <button
                onClick={() => setActive(null)}
                className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {CRITERIA.map((c, i) => (
                <div key={c.key}>
                  <p className="text-sm font-bold text-gray-900">
                    {i + 1}. {c.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-snug">{c.hint}</p>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {Array.from({ length: MAX_PER_CRITERION }, (_, k) => k + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setDraft((d) => ({ ...d, [c.key]: n }))}
                        className={`h-12 rounded-xl border-2 text-lg font-bold transition ${
                          draft[c.key] === n
                            ? "border-green-700 bg-green-700 text-white"
                            : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                        }`}
                        aria-label={`${c.title}: ${n} (${SCORE_LABELS[n]})`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase text-gray-400">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}

              <div>
                <p className="text-sm font-bold text-gray-900">
                  Comment <span className="font-medium text-gray-400">(optional)</span>
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="mt-2 w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm outline-none focus:border-green-600 resize-none"
                  placeholder="Anything worth noting for the organisers..."
                />
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Total</span>
                <span className="text-lg font-extrabold text-gray-900">
                  {total} / {MAX_TOTAL}
                  <span className="ml-2 text-sm font-bold text-green-700">{percentageOf(total)}%</span>
                </span>
              </div>

              {sheetError && (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {sheetError}
                </p>
              )}

              <button
                onClick={submit}
                disabled={!allChosen || saving}
                className="w-full h-14 rounded-2xl bg-green-700 text-base font-bold text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                {saving ? "Saving..." : active.myScore ? "Update score" : "Submit score"}
              </button>
              {!allChosen && (
                <p className="mt-2 text-center text-xs text-gray-400">Score all six criteria to submit.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}