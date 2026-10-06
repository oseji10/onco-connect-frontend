import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { Input, Button } from "@roketid/windmill-react-ui";
import { Crown, Plus, Trash2, Loader2, X, Search, Printer } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { TITLES } from "../../types/registration-constants";

type Vip = {
  attendeeId: number;
  fullName: string;
  organization: string | null;
  guests: number;
  uniqueId: string | null;
  serialNumber: string | null;
};

type ApiSuccess<T> = { success: true; message: string; data: T };

const EMPTY = { title: "", firstName: "", lastName: "", organization: "", guests: 0 };

export default function VipsPage() {
  const [vips, setVips] = useState<Vip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

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
    if (!window.confirm(`Remove ${v.fullName} from the VIP list?`)) return;

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

  // Optional printable badge (with QR). VIPs work fine without it: Scanner > Find person is always available.
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
      let message = "Could not generate the badge.";
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
            VIPs need no login, email or QR. They are accredited automatically and served from <strong>Scanner → Find person</strong>.
            A printed badge with a QR is an optional extra.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            layout="outline"
            disabled={printing !== null || vips.length === 0}
            onClick={() => printBadges("all", { group: "vip", size: 200 }, "vip-badges.pdf")}
            className="rounded-2xl h-12 px-5 border-2"
          >
            <span className="inline-flex items-center gap-2 font-bold">
              {printing === "all" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              Print VIP badges
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
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-5">Name</th>
                <th className="py-4 px-5">Organisation</th>
                <th className="py-4 px-5">Guests</th>
                <th className="py-4 px-5">ID</th>
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
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-500 font-semibold">
                    {vips.length === 0 ? "No VIPs yet." : "No VIPs match your search."}
                  </td>
                </tr>
              ) : (
                shown.map((v) => (
                  <tr key={v.attendeeId} className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-2 font-bold uppercase">
                        <Crown className="w-4 h-4 text-amber-500" />
                        {v.fullName}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-bold uppercase">{v.organization || "—"}</td>
                    <td className="py-4 px-5">{v.guests > 0 ? `+${v.guests}` : "—"}</td>
                    <td className="py-4 px-5 font-mono text-xs font-bold">{v.uniqueId || "—"}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            printBadges(`one-${v.attendeeId}`, { group: "all", attendeeId: v.attendeeId, size: 4 }, `vip-badge-${v.uniqueId || v.attendeeId}.pdf`)
                          }
                          disabled={printing !== null}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                          title="Print this badge"
                        >
                          {printing === `one-${v.attendeeId}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
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
                ))
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
                  Organisation <span className="text-gray-400 text-xs normal-case font-normal">(optional, printed bold on the badge)</span>
                </label>
                <Input
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Guests <span className="text-gray-400 text-xs normal-case font-normal">(shown to the host, not counted separately)</span>
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