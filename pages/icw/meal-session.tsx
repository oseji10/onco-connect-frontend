import React, { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { Input, Button, Pagination } from "@roketid/windmill-react-ui";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Play,
  Square,
  ListChecks,
  Loader2,
  X,
  UtensilsCrossed,
  Undo2,
  Search,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { getCategoryDisplayName } from "../../types/registration-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = "draft" | "active" | "closed" | "cancelled";

type SessionRow = {
  mealSessionId: number;
  title: string;
  mealDate: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: SessionStatus;
  redeemedCount: number;
};

type Headcount = {
  registered: number;
  inPersonRegistered: number;
  accredited: number;
};

type Entry = {
  redemptionId: number;
  fullName: string;
  uniqueId: string | null;
  serialNumber: string | null;
  category: string | null;
  deviceName: string | null;
  redeemedAt: string;
};

type ApiSuccess<T> = { success: true; message: string; data: T };

const EMPTY_FORM = { title: "", mealDate: "", startTime: "", endTime: "", location: "" };
const ENTRIES_PER_PAGE = 20;

const fmtDate = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString();
const fmtTime = (v: string) => new Date(v).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SessionStatus }) {
  const styles: Record<SessionStatus, string> = {
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    closed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const label = status === "active" ? "Serving" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>{label}</span>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-5 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className="p-3 rounded-2xl bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{icon}</div>
    </div>
  );
}

// ─── Entries modal ────────────────────────────────────────────────────────────

function EntriesModal({
  session,
  onClose,
  onChanged,
}: {
  session: SessionRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<ApiSuccess<{ total: number; entries: Entry[] }>>(
        `/meal-sessions/${session.mealSessionId}/redemptions`,
        { params: { search: search || undefined, page, per_page: ENTRIES_PER_PAGE } }
      );
      setEntries(data.data.entries);
      setTotal(data.data.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load entries.");
    } finally {
      setLoading(false);
    }
  }, [session.mealSessionId, search, page]);

  // Debounce typing in the search box
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function undo(entry: Entry) {
    if (!window.confirm(`Remove ${entry.fullName}'s entry? They will be able to scan in again.`)) return;

    try {
      setRemoving(entry.redemptionId);
      await api.delete(`/meal-sessions/${session.mealSessionId}/redemptions/${entry.redemptionId}`);
      toast.success("Entry removed.");
      await load();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove entry.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Modal title={`Entries · ${session.title}`} onClose={onClose} wide>
      <div className="relative mb-4">
        <Input
          className="pl-11 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
          placeholder="Search by name, unique ID or serial..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        {loading ? "Loading..." : `${total} entr${total === 1 ? "y" : "ies"}`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Time</th>
              <th className="py-3 pr-4">Scanner</th>
              <th className="py-3 text-right">Undo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-10 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-gray-500 font-semibold">
                  No entries yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.redemptionId} className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  <td className="py-3 pr-4">
                    <p className="font-bold uppercase">{e.fullName}</p>
                    <p className="text-xs font-mono text-gray-500">
                      {e.uniqueId || "—"}
                      {e.category ? ` · ${getCategoryDisplayName(e.category)}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">{fmtTime(e.redeemedAt)}</td>
                  <td className="py-3 pr-4 text-xs">{e.deviceName || "—"}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => undo(e)}
                      disabled={removing === e.redemptionId}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      title="Remove entry"
                    >
                      {removing === e.redemptionId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && total > ENTRIES_PER_PAGE && (
        <div className="mt-4">
          <Pagination totalResults={total} resultsPerPage={ENTRIES_PER_PAGE} onChange={setPage} label="Entries navigation" />
        </div>
      )}
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MealSessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [headcount, setHeadcount] = useState<Headcount>({ registered: 0, inPersonRegistered: 0, accredited: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<SessionRow | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get<ApiSuccess<{ headcount: Headcount; sessions: SessionRow[] }>>("/meal-sessions");
      setSessions(data.data.sessions);
      setHeadcount(data.data.headcount);
    } catch (err: any) {
      if (!silent) toast.error(err?.response?.data?.message || "Failed to load meal sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 15_000); // keep the live counter fresh
    return () => clearInterval(t);
  }, [load]);

  const active = sessions.find((s) => s.status === "active") || null;
  const pct = active && headcount.accredited > 0 ? Math.min(100, Math.round((active.redeemedCount / headcount.accredited) * 100)) : 0;

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(s: SessionRow) {
    setEditingId(s.mealSessionId);
    setForm({ title: s.title, mealDate: s.mealDate, startTime: s.startTime, endTime: s.endTime, location: s.location || "" });
    setFormOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!form.title.trim() || !form.mealDate || !form.startTime || !form.endTime) {
      return toast.error("Title, date, start time and end time are required.");
    }
    if (form.endTime <= form.startTime) return toast.error("End time must be after start time.");

    const payload = {
      title: form.title.trim(),
      mealDate: form.mealDate,
      startTime: form.startTime,
      endTime: form.endTime,
      location: form.location.trim() || null,
    };

    try {
      setSaving(true);
      const res = editingId
        ? await api.put<ApiSuccess<SessionRow>>(`/meal-sessions/${editingId}`, payload)
        : await api.post<ApiSuccess<SessionRow>>("/meal-sessions", payload);

      toast.success(res.data.message);
      setFormOpen(false);
      await load(true);
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors && Object.values(errors)[0];
      toast.error((Array.isArray(first) && first[0]) || err?.response?.data?.message || "Failed to save session.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(s: SessionRow, status: "active" | "closed") {
    try {
      setBusyId(s.mealSessionId);
      const { data } = await api.patch<ApiSuccess<null>>(`/meal-sessions/${s.mealSessionId}/status`, { status });
      toast.success(data.message);
      await load(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(s: SessionRow) {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;

    try {
      setBusyId(s.mealSessionId);
      await api.delete(`/meal-sessions/${s.mealSessionId}`);
      toast.success("Meal session deleted.");
      await load(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete session.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageTitle>Meal Sessions</PageTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Open a session and scanners will let accredited participants into the buffet, once each.
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="rounded-2xl h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg"
        >
          <span className="inline-flex items-center gap-2 font-bold">
            <Plus className="w-5 h-5" />
            New Session
          </span>
        </Button>
      </div>

      {/* Headcount: what to tell the caterer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Registered" value={headcount.registered} icon={<Users className="w-6 h-6" />} />
        <StatCard label="In-person registered" value={headcount.inPersonRegistered} icon={<MapPin className="w-6 h-6" />} />
        <StatCard label="Accredited at venue" value={headcount.accredited} icon={<BadgeCheck className="w-6 h-6" />} />
      </div>

      {/* Live service card */}
      <div
        className={`mb-8 rounded-3xl p-6 shadow-xl ${
          active
            ? "bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white"
            : "bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700"
        }`}
      >
        {active ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-green-100">Now serving</p>
                <h3 className="mt-1 text-2xl font-bold">{active.title}</h3>
                <p className="mt-1 text-sm text-green-100">
                  {fmtDate(active.mealDate)} · {active.startTime} – {active.endTime}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-5xl font-extrabold leading-none">{active.redeemedCount}</p>
                  <p className="mt-1 text-xs text-green-100">
                    of {headcount.accredited} accredited · {Math.max(headcount.accredited - active.redeemedCount, 0)} yet to eat
                  </p>
                </div>
                <Button
                  disabled={busyId === active.mealSessionId}
                  onClick={() => setStatus(active, "closed")}
                  className="rounded-2xl h-12 bg-white text-green-900 border-0 hover:bg-green-50"
                >
                  <span className="inline-flex items-center gap-2 font-bold uppercase">
                    <Square className="w-4 h-4" />
                    Close service
                  </span>
                </Button>
              </div>
            </div>
            <div className="mt-5 h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-gray-400" />
            <p className="mt-3 font-bold text-gray-800 dark:text-gray-100 uppercase">No session is open</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Click Open on a session below when the buffet is ready to receive guests.
            </p>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-5">Session</th>
                <th className="py-4 px-5">Date & time</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Served</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-500 font-semibold">
                    No meal sessions yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.mealSessionId} className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                    <td className="py-4 px-5">
                      <p className="font-bold text-gray-900 dark:text-white">{s.title}</p>
                      {s.location && <p className="text-xs text-gray-500">{s.location}</p>}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {fmtDate(s.mealDate)}
                      <span className="block text-xs text-gray-500">
                        {s.startTime} – {s.endTime}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="py-4 px-5 font-bold">{s.redeemedCount}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1">
                        {s.status === "active" ? (
                          <button
                            onClick={() => setStatus(s, "closed")}
                            disabled={busyId === s.mealSessionId}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                          >
                            <Square className="w-4 h-4" /> Close
                          </button>
                        ) : (
                          <button
                            onClick={() => setStatus(s, "active")}
                            disabled={busyId === s.mealSessionId}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50"
                          >
                            <Play className="w-4 h-4" /> Open
                          </button>
                        )}

                        <button
                          onClick={() => setViewing(s)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          title="View entries"
                        >
                          <ListChecks className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={busyId === s.mealSessionId || s.redeemedCount > 0}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={s.redeemedCount > 0 ? "Sessions with entries cannot be deleted" : "Delete"}
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

      {/* Create / edit */}
      {formOpen && (
        <Modal title={editingId ? "Edit Session" : "New Session"} onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                placeholder="e.g. Day 1 Lunch"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                value={form.mealDate}
                onChange={(e) => setForm({ ...form, mealDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Start <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  End <span className="text-red-500">*</span>
                </label>
                <Input
                  type="time"
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Location <span className="text-gray-400 text-xs normal-case font-normal">(optional)</span>
              </label>
              <Input
                className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                placeholder="e.g. Banquet Hall"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" layout="outline" className="rounded-2xl h-12 flex-1 border-2" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-2xl h-12 flex-1 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
              >
                <span className="inline-flex items-center gap-2 font-bold uppercase">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : "Save"}
                </span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && <EntriesModal session={viewing} onClose={() => setViewing(null)} onChanged={() => load(true)} />}

      <div className="pb-20" />
    </Layout>
  );
}