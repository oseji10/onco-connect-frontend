import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { Input, Button } from "@roketid/windmill-react-ui";
import { ChevronDown, ChevronRight, Crown, Plus, Trash2, Loader2, X, Search, Printer, Users } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { TITLES } from "../../types/registration-constants";

type GuestPass = {
  attendeeId: number;
  fullName: string;
  uniqueId: string | null;
  serialNumber: string | null;
};

type Vip = {
  attendeeId: number;
  fullName: string;
  organization: string | null;
  guests: number;
  guestPasses: GuestPass[];
  uniqueId: string | null;
  serialNumber: string | null;
};

type ApiSuccess<T> = { success: true; message: string; data: T };

const EMPTY = { title: "", firstName: "", lastName: "", organization: "", guests: 0 };

// PassPrintController understands the `hostId` filter, so the row button prints
// a VIP together with all of their guests. Set to false to print only the VIP's own pass.
const HOST_PRINT_READY = true;

export default function VipsPage() {
  const [vips, setVips] = useState<Vip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [guestDraft, setGuestDraft] = useState<Record<number, number>>({});
  const [updatingGuests, setUpdatingGuests] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ApiSuccess<{ vips: Vip[] }>>("/vips");
      setVips(res.data.data.vips);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load VIPs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.toLowerCase().trim();
  const shown = q
    ? vips.filter((v) => v.fullName.toLowerCase().includes(q) || (v.organization || "").toLowerCase().includes(q))
    : vips;

  const totalPasses = vips.reduce((n, v) => n + 1 + v.guests, 0);

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error("First and last name are required.");

    try {
      setSaving(true);
      const res = await api.post<ApiSuccess<null>>("/vips", {
        title: form.title || null,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        organization: form.organization.trim() || null,
        guests: Number(form.guests) || 0,
      });
      toast.success(res.data.message);
      setForm(EMPTY);
      setFormOpen(false);
      await load();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors && Object.values(errors)[0];
      toast.error((Array.isArray(first) && first[0]) || err?.response?.data?.message || "Failed to add VIP.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: Vip) {
    const extra = v.guests > 0 ? ` Their ${v.guests} guest pass${v.guests === 1 ? "" : "es"} will be removed too.` : "";
    if (!window.confirm(`Remove ${v.fullName} from the VIP list?${extra}`)) return;

    try {
      setRemoving(v.attendeeId);
      await api.delete(`/vips/${v.attendeeId}`);
      toast.success("VIP removed.");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to remove VIP.");
    } finally {
      setRemoving(null);
    }
  }

  async function saveGuests(v: Vip) {
    const target = guestDraft[v.attendeeId] ?? v.guests;
    if (target === v.guests) return;

    try {
      setUpdatingGuests(v.attendeeId);
      await api.patch(`/vips/${v.attendeeId}/guests`, { guests: target });
      toast.success("Guest passes updated.");
      await load();
      setGuestDraft((d) => {
        const next = { ...d };
        delete next[v.attendeeId];
        return next;
      });
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors && Object.values(errors)[0];
      toast.error((Array.isArray(first) && first[0]) || err?.response?.data?.message || "Failed to update guests.");
    } finally {
      setUpdatingGuests(null);
    }
  }

  // Printable passes (with QR). VIPs work fine without them: Scanner > Find person is always available.
  async function printBadges(key: string, params: Record<string, string | number>, filename: string) {
    try {
      setPrinting(key);

      const res = await api.get("/passes/print/download", {
        params: { type: "all", batch: 1, ...params },
        responseType: "blob",
        timeout: 180_000,
      });

      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      let message = "Could not generate the pass.";
      try {
        const text = await err?.response?.data?.text();
        message = JSON.parse(text).message || message;
      } catch {}
      toast.error(message);
    } finally {
      setPrinting(null);
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageTitle>VIPs</PageTitle>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            VIPs need no login or email. They are accredited automatically and served from{" "}
            <strong>Scanner → Find person</strong>. Every guest gets their own pass, so a VIP with +3 guests has 4 passes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            layout="outline"
            disabled={printing !== null || vips.length === 0}
            onClick={() => printBadges("all", { group: "vip", size: 200 }, "vip-passes.pdf")}
            className="rounded-2xl h-12 px-5 border-2"
          >
            <span className="inline-flex items-center gap-2 font-bold">
              {printing === "all" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              Print all passes ({totalPasses})
            </span>
          </Button>

          <Button
            onClick={() => setFormOpen(true)}
            className="rounded-2xl h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0 shadow-lg"
          >
            <span className="inline-flex items-center gap-2 font-bold">
              <Plus className="w-5 h-5" />
              Add VIP
            </span>
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Input
          className="pl-11 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
          placeholder="Search VIPs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-3 w-10" />
                <th className="py-4 px-3">Name</th>
                <th className="py-4 px-5">Organisation</th>
                <th className="py-4 px-5">Passes</th>
                <th className="py-4 px-5">ID</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-500 font-semibold">
                    {vips.length === 0 ? "No VIPs yet." : "No VIPs match your search."}
                  </td>
                </tr>
              ) : (
                shown.map((v) => {
                  const open = expandedId === v.attendeeId;
                  const draft = guestDraft[v.attendeeId] ?? v.guests;
                  return (
                    <React.Fragment key={v.attendeeId}>
                      <tr className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                        <td className="py-4 px-3">
                          <button
                            onClick={() => setExpandedId(open ? null : v.attendeeId)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Guest passes"
                          >
                            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-4 px-3">
                          <span className="inline-flex items-center gap-2 font-bold uppercase">
                            <Crown className="w-4 h-4 text-amber-500" />
                            {v.fullName}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-bold uppercase">{v.organization || "—"}</td>
                        <td className="py-4 px-5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-1 text-xs font-bold">
                            <Users className="w-3.5 h-3.5" />
                            {1 + v.guests}
                            {v.guests > 0 && <span className="text-gray-500 font-semibold">(+{v.guests} guest{v.guests === 1 ? "" : "s"})</span>}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono text-xs font-bold">{v.uniqueId || "—"}</td>
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                HOST_PRINT_READY
                                  ? printBadges(`host-${v.attendeeId}`, { group: "vip", hostId: v.attendeeId, size: 200 }, `vip-passes-${v.uniqueId || v.attendeeId}.pdf`)
                                  : printBadges(`host-${v.attendeeId}`, { group: "all", attendeeId: v.attendeeId, size: 4 }, `vip-pass-${v.uniqueId || v.attendeeId}.pdf`)
                              }
                              disabled={printing !== null}
                              className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                              title={
                                HOST_PRINT_READY
                                  ? `Print ${1 + v.guests} pass${v.guests === 0 ? "" : "es"} (VIP + guests)`
                                  : "Print this VIP's pass"
                              }
                            >
                              {printing === `host-${v.attendeeId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDelete(v)}
                              disabled={removing === v.attendeeId}
                              className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                              title="Remove"
                            >
                              {removing === v.attendeeId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {open && (
                        <tr className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                          <td />
                          <td colSpan={5} className="px-3 py-4">
                            <div className="flex flex-col lg:flex-row gap-6">
                              {/* Guest passes */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Guest passes</p>
                                {v.guestPasses.length === 0 ? (
                                  <p className="text-sm text-gray-500">No guests. Use the box on the right to add guest passes.</p>
                                ) : (
                                  <ul className="space-y-2">
                                    {v.guestPasses.map((g) => (
                                      <li
                                        key={g.attendeeId}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-sm font-bold uppercase truncate">{g.fullName}</p>
                                          <p className="font-mono text-[11px] text-gray-500">{g.uniqueId}</p>
                                        </div>
                                        <button
                                          onClick={() =>
                                            printBadges(`guest-${g.attendeeId}`, { group: "all", attendeeId: g.attendeeId, size: 4 }, `vip-guest-${g.uniqueId || g.attendeeId}.pdf`)
                                          }
                                          disabled={printing !== null}
                                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50 shrink-0"
                                          title="Print this guest pass"
                                        >
                                          {printing === `guest-${g.attendeeId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Change the number of guests */}
                              <div className="lg:w-64 shrink-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Number of guests</p>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    className="h-11 w-24 rounded-xl border-2 border-gray-200 dark:border-gray-600"
                                    value={draft}
                                    onChange={(e) =>
                                      setGuestDraft((d) => ({ ...d, [v.attendeeId]: Math.max(0, Math.min(20, Number(e.target.value) || 0)) }))
                                    }
                                  />
                                  <Button
                                    onClick={() => saveGuests(v)}
                                    disabled={updatingGuests === v.attendeeId || draft === v.guests}
                                    className="rounded-xl h-11 px-4 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                                  >
                                    <span className="inline-flex items-center gap-2 font-bold">
                                      {updatingGuests === v.attendeeId && <Loader2 className="w-4 h-4 animate-spin" />}
                                      Save
                                    </span>
                                  </Button>
                                </div>
                                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                                  Adding creates new passes. Removing deletes the highest-numbered guests, unless they already have meal or attendance records.
                                </p>
                              </div>
                            </div>
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

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setFormOpen(false)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase">Add VIP</h3>
              <button onClick={() => setFormOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-[auto,1fr,1fr] gap-3">
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Title</label>
                  <select
                    className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  >
                    <option value="">—</option>
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Organisation <span className="text-gray-400 text-xs normal-case font-normal">(optional, printed bold on the pass)</span>
                </label>
                <Input
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Guests <span className="text-gray-400 text-xs normal-case font-normal">(each guest gets their own pass)</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  className="h-12 w-28 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" layout="outline" className="rounded-2xl h-12 flex-1 border-2" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="rounded-2xl h-12 flex-1 bg-gradient-to-r from-green-600 to-emerald-600 border-0">
                  <span className="inline-flex items-center gap-2 font-bold uppercase">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Add VIP
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="pb-20" />
    </Layout>
  );
}