import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button, Input } from "@roketid/windmill-react-ui";
import {
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  PlusCircle,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  KeyRound,
  Power,
  Presentation,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { SUB_THEMES, formatDate } from "../../types/abstract-type";
import { CRITERIA, CriteriaScores, MAX_TOTAL, percentTone } from "../../lib/oralScoring";

// ─── Types ────────────────────────────────────────────────────────────────

interface PanelScore {
  panelistId: number;
  panelistName: string;
  scores: CriteriaScores;
  total: number;
  percentage: number;
  comment: string | null;
  updatedAt: string | null;
}

interface ResultRow {
  id: number;
  reference: string;
  title: string;
  subTheme?: string | null;
  presenter?: string | null;
  rank: number | null;
  scoresCount: number;
  averageTotal: number | null;
  averagePercentage: number | null;
  criteriaAverages: CriteriaScores | null;
  scores: PanelScore[];
}

interface ResultsData {
  presentations: ResultRow[];
  summary: {
    presentations: number;
    scoredCount: number;
    totalScores: number;
    panelists: number;
    activePanelists: number;
  };
}

interface Panelist {
  id: number;
  name: string;
  email: string | null;
  token: string;
  isActive: boolean;
  lastSeenAt: string | null;
  scoresCount: number;
}

type Tab = "results" | "panelists";
type StatusFilter = "all" | "scored" | "unscored";

// ─── Helpers ──────────────────────────────────────────────────────────────

function subThemeLabel(value?: string | null) {
  if (!value) return "—";
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

function panelLink(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/panel?token=${encodeURIComponent(token)}`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copied.");
  } catch {
    toast.error("Couldn't copy. Select and copy the link manually.");
  }
}

function exportResultsToExcel(rows: ResultRow[]) {
  if (rows.length === 0) {
    toast.error("Nothing to export.");
    return;
  }

  const summary = rows.map((r) => ({
    Rank: r.rank ?? "",
    Reference: r.reference,
    Title: r.title,
    Presenter: r.presenter ?? "",
    "Sub-theme": subThemeLabel(r.subTheme),
    "Panelists scored": r.scoresCount,
    [`Average total (/${MAX_TOTAL})`]: r.averageTotal ?? "",
    "Average %": r.averagePercentage ?? "",
  }));

  const detail = rows.flatMap((r) =>
    r.scores.map((s) => ({
      Reference: r.reference,
      Title: r.title,
      Panelist: s.panelistName,
      ...Object.fromEntries(CRITERIA.map((c) => [c.title, s.scores[c.key]])),
      [`Total (/${MAX_TOTAL})`]: s.total,
      "Percentage %": s.percentage,
      Comment: s.comment ?? "",
    }))
  );

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(summary);
  ws1["!cols"] = [{ wch: 6 }, { wch: 16 }, { wch: 50 }, { wch: 26 }, { wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Panelist scores");
  XLSX.writeFile(wb, `oral-presentation-scores-${new Date().toISOString().slice(0, 10)}.xlsx`, {
    compression: true,
  });
}

// ─── Small components ─────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 flex items-center gap-4">
      <div className="rounded-2xl bg-green-50 dark:bg-green-900/30 p-3 text-green-700 dark:text-green-300 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none text-gray-900 dark:text-white">{value}</p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <span className="text-gray-300 font-bold">—</span>;
  }
  const tone =
    rank === 1
      ? "bg-amber-100 text-amber-700 ring-amber-300"
      : rank === 2
      ? "bg-gray-200 text-gray-700 ring-gray-300"
      : rank === 3
      ? "bg-orange-100 text-orange-700 ring-orange-300"
      : "bg-teal-50 text-teal-700 ring-teal-200";
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full ring-2 text-sm font-extrabold tabular-nums ${tone}`}
    >
      {rank}
    </span>
  );
}

// ─── Results tab ──────────────────────────────────────────────────────────

function ResultsTab({ data, loading }: { data: ResultsData | null; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [subTheme, setSubTheme] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data?.presentations ?? []).filter((r) => {
      if (status === "scored" && r.scoresCount === 0) return false;
      if (status === "unscored" && r.scoresCount > 0) return false;
      if (subTheme !== "all" && r.subTheme !== subTheme) return false;
      if (!q) return true;
      return (
        r.reference.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.presenter ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, subTheme, status]);

  const summary = data?.summary;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Presentation className="w-6 h-6" />} label="Oral presentations" value={summary?.presentations ?? "—"} />
        <StatCard icon={<BadgeCheck className="w-6 h-6" />} label="Scored so far" value={summary ? `${summary.scoredCount}` : "—"} />
        <StatCard icon={<Award className="w-6 h-6" />} label="Scores submitted" value={summary?.totalScores ?? "—"} />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Active panelists"
          value={summary ? `${summary.activePanelists}/${summary.panelists}` : "—"}
        />
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Input
              className="pl-11 h-12 rounded-2xl border-2 border-gray-200 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
              placeholder="Search reference, title or presenter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
          </div>

          <select
            value={subTheme}
            onChange={(e) => setSubTheme(e.target.value)}
            className="h-12 rounded-2xl border-2 border-gray-200 bg-white dark:bg-gray-700 px-4 text-sm font-semibold"
          >
            <option value="all">All sub-themes</option>
            {SUB_THEMES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-2xl border-2 border-gray-200 bg-white dark:bg-gray-700 p-1">
            {(
              [
                { value: "all", label: "All" },
                { value: "scored", label: "Scored" },
                { value: "unscored", label: "Not scored" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  status === opt.value ? "bg-green-600 text-white" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            layout="outline"
            className="rounded-2xl h-12 border-2"
            onClick={() => exportResultsToExcel(rows)}
            disabled={!data}
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              <Download className="w-4 h-4" />
              Export Excel
            </span>
          </Button>
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4 w-10" />
                <th className="py-4 px-4">Rank</th>
                <th className="py-4 px-4">Reference</th>
                <th className="py-4 px-4">Presentation</th>
                <th className="py-4 px-4">Sub-theme</th>
                <th className="py-4 px-4 text-center">Panelists</th>
                <th className="py-4 px-4">Average</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-500">
                    {data?.presentations.length === 0
                      ? "No accepted oral presentations yet. Run classification on the rankings page first."
                      : "Nothing matches the current filter."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const open = expandedId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                        onClick={() => setExpandedId(open ? null : r.id)}
                      >
                        <td className="py-4 px-4 text-gray-400">
                          {r.scoresCount > 0 &&
                            (open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                        </td>
                        <td className="py-4 px-4">
                          <RankBadge rank={r.rank} />
                        </td>
                        <td className="py-4 px-4 font-mono text-xs font-bold text-gray-500">{r.reference}</td>
                        <td className="py-4 px-4 max-w-md">
                          <p className="font-semibold text-gray-900 dark:text-white line-clamp-2">{r.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{r.presenter ?? "Presenter not listed"}</p>
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300">{subThemeLabel(r.subTheme)}</td>
                        <td className="py-4 px-4 text-center font-bold">{r.scoresCount}</td>
                        <td className="py-4 px-4">
                          {r.averagePercentage == null ? (
                            <span className="text-xs font-semibold text-gray-400">Not scored</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${percentTone(
                                  r.averagePercentage
                                )}`}
                              >
                                {r.averagePercentage.toFixed(1)}%
                              </span>
                              <span className="text-xs text-gray-500 tabular-nums">
                                {r.averageTotal?.toFixed(1)} / {MAX_TOTAL}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>

                      {open && (
                        <tr className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                          <td />
                          <td colSpan={6} className="px-4 py-4">
                            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left uppercase tracking-wide font-bold text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-2.5 px-3">Panelist</th>
                                    {CRITERIA.map((c, i) => (
                                      <th key={c.key} className="py-2.5 px-2 text-center" title={c.title}>
                                        C{i + 1}
                                      </th>
                                    ))}
                                    <th className="py-2.5 px-3 text-center">Total</th>
                                    <th className="py-2.5 px-3 text-center">%</th>
                                    <th className="py-2.5 px-3">Comment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.scores.map((s) => (
                                    <tr key={s.panelistId} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                        {s.panelistName}
                                        <p className="font-normal text-gray-400">{formatDate(s.updatedAt ?? undefined)}</p>
                                      </td>
                                      {CRITERIA.map((c) => (
                                        <td key={c.key} className="py-2.5 px-2 text-center tabular-nums font-semibold">
                                          {s.scores[c.key]}
                                        </td>
                                      ))}
                                      <td className="py-2.5 px-3 text-center font-bold tabular-nums">{s.total}</td>
                                      <td className="py-2.5 px-3 text-center font-bold tabular-nums">{s.percentage.toFixed(1)}</td>
                                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 max-w-xs">
                                        {s.comment || <span className="text-gray-300">—</span>}
                                      </td>
                                    </tr>
                                  ))}
                                  {r.criteriaAverages && (
                                    <tr className="bg-gray-50 dark:bg-gray-900/40 font-bold">
                                      <td className="py-2.5 px-3">Average</td>
                                      {CRITERIA.map((c) => (
                                        <td key={c.key} className="py-2.5 px-2 text-center tabular-nums">
                                          {r.criteriaAverages![c.key].toFixed(2)}
                                        </td>
                                      ))}
                                      <td className="py-2.5 px-3 text-center tabular-nums">{r.averageTotal?.toFixed(1)}</td>
                                      <td className="py-2.5 px-3 text-center tabular-nums">{r.averagePercentage?.toFixed(1)}</td>
                                      <td />
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                              {CRITERIA.map((c, i) => `C${i + 1} ${c.title}`).join(" · ")}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Panelists tab ────────────────────────────────────────────────────────

function PanelistsTab({ onChanged }: { onChanged: () => void }) {
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchPanelists = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/oral-scoring/panelists");
      setPanelists(data.data || []);
    } catch {
      toast.error("Failed to load panelists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPanelists();
  }, [fetchPanelists]);

  async function addPanelist(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setAdding(true);
      await api.post("/oral-scoring/panelists", { name: name.trim(), email: email.trim() || null });
      toast.success("Panelist added. Copy their link and send it.");
      setName("");
      setEmail("");
      await fetchPanelists();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add panelist.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(p: Panelist) {
    try {
      setBusyId(p.id);
      await api.patch(`/oral-scoring/panelists/${p.id}`, { isActive: !p.isActive });
      await fetchPanelists();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update panelist.");
    } finally {
      setBusyId(null);
    }
  }

  async function regenerate(p: Panelist) {
    if (!window.confirm(`Generate a new link for ${p.name}? Their current link will stop working.`)) return;
    try {
      setBusyId(p.id);
      await api.post(`/oral-scoring/panelists/${p.id}/regenerate`);
      toast.success("New link generated.");
      await fetchPanelists();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to regenerate link.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: Panelist) {
    const extra = p.scoresCount > 0 ? ` This also deletes their ${p.scoresCount} submitted score(s).` : "";
    if (!window.confirm(`Delete ${p.name}?${extra}`)) return;
    try {
      setBusyId(p.id);
      await api.delete(`/oral-scoring/panelists/${p.id}`);
      toast.success("Panelist deleted.");
      await fetchPanelists();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete panelist.");
    } finally {
      setBusyId(null);
    }
  }

  function whatsappUrl(p: Panelist) {
    const text = `Hello ${p.name}, here is your personal link to score oral presentations at ICW 2026. Please don't share it: ${panelLink(
      p.token
    )}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return (
    <>
      <form
        onSubmit={addPanelist}
        className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-5 mb-6"
      >
        <p className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-3">Add a panelist</p>
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200 text-sm font-semibold"
            placeholder="Full name (e.g. Prof. Ada Obi)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            className="h-12 rounded-2xl border-2 border-gray-200 text-sm font-semibold"
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            className="rounded-2xl h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0 shrink-0"
            disabled={adding || !name.trim()}
          >
            <span className="inline-flex items-center gap-2 font-bold">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Add
            </span>
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Each panelist gets one personal link. They open it on a phone or tablet and score — no account or password.
        </p>
      </form>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4">Panelist</th>
                <th className="py-4 px-4 text-center">Scores</th>
                <th className="py-4 px-4">Last opened</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Link & actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </td>
                </tr>
              ) : panelists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-gray-500">
                    No panelists yet. Add the first one above.
                  </td>
                </tr>
              ) : (
                panelists.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.email || "No email"}</p>
                    </td>
                    <td className="py-4 px-4 text-center font-bold">{p.scoresCount}</td>
                    <td className="py-4 px-4 text-xs text-gray-500">
                      {p.lastSeenAt ? formatDate(p.lastSeenAt) : "Never"}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyText(panelLink(p.token))}
                          title="Copy link"
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a
                          href={whatsappUrl(p)}
                          target="_blank"
                          rel="noreferrer"
                          title="Send on WhatsApp"
                          className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={busyId === p.id}
                          title={p.isActive ? "Deactivate link" : "Activate link"}
                          className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => regenerate(p)}
                          disabled={busyId === p.id}
                          title="Generate a new link (old one stops working)"
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-40"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(p)}
                          disabled={busyId === p.id}
                          title="Delete panelist"
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function OralScoringPage() {
  const [tab, setTab] = useState<Tab>("results");
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/oral-scoring/results");
      setData(data.data);
    } catch {
      toast.error("Failed to load oral presentation scores.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Live during the conference: refresh the results every 30 seconds.
  useEffect(() => {
    if (tab !== "results") return;
    const id = setInterval(fetchResults, 30000);
    return () => clearInterval(id);
  }, [tab, fetchResults]);

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <PageTitle>Oral Presentation Scoring</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Live scores from the panel (six criteria, 1 to 5 each, total out of {MAX_TOTAL}). Presentations are
              ranked by the average percentage across panelists.
            </p>
          </div>
          <Button layout="outline" className="rounded-2xl h-12 px-6 border-2" onClick={fetchResults}>
            <span className="inline-flex items-center gap-2 font-semibold">
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </span>
          </Button>
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-2xl border-2 border-gray-200 bg-white dark:bg-gray-800 p-1">
        {(
          [
            { value: "results", label: "Scored presentations" },
            { value: "panelists", label: "Panelists & links" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold ${
              tab === t.value ? "bg-green-600 text-white" : "text-gray-600 dark:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        <ResultsTab data={data} loading={loading && !data} />
      ) : (
        <PanelistsTab onChanged={fetchResults} />
      )}

      <div className="pb-20" />
    </Layout>
  );
}