import React, { useEffect, useMemo, useState } from "react";
import { Input, Button, Pagination } from "@roketid/windmill-react-ui";
import { Search, Loader2, BadgeCheck, X, ShieldCheck, Users, Undo2 } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Row = {
  attendeeId: number;
  fullName: string;
  uniqueId: string | null;
  email: string | null;
  participationType: "Physical" | "Virtual" | null;
  isAccredited: boolean;
  sessionsAttended: number;
  feedbackSubmitted: boolean;
  manualOverride: boolean;
  manualOverrideReason: string | null;
  certificateEligible: boolean;
};

type EligibilityData = {
  totalSessions: number;
  requiredSessions: number;
  attendees: Row[];
};

type ApiSuccess<T> = { success: true; message: string; data: T };
type Filter = "all" | "eligible" | "not_eligible";

const EVENT_ID = 1;
const PER_PAGE = 10;

function Pill({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
        ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
      }`}
    >
      {ok ? yes : no}
    </span>
  );
}

export default function CertificateEligibilityPage() {
  const [data, setData] = useState<EligibilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const [target, setTarget] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get<ApiSuccess<EligibilityData>>(`/accreditation/events/${EVENT_ID}/eligibility`);
      setData(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load eligibility data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = data?.attendees ?? [];

  const stats = useMemo(
    () => ({
      total: rows.length,
      eligible: rows.filter((r) => r.certificateEligible).length,
      manual: rows.filter((r) => r.manualOverride).length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (filter === "eligible" && !r.certificateEligible) return false;
      if (filter === "not_eligible" && r.certificateEligible) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        r.uniqueId?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  async function submitManual() {
    if (!target) return;
    if (reason.trim().length < 10) return toast.error("Please give a reason (at least 10 characters).");

    try {
      setSaving(true);
      const { data: res } = await api.post<ApiSuccess<null>>(`/accreditation/events/${EVENT_ID}/manual`, {
        attendeeId: target.attendeeId,
        reason: reason.trim(),
      });
      toast.success(res.message);
      setTarget(null);
      setReason("");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to accredit attendee.");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(row: Row) {
    try {
      setRevoking(row.attendeeId);
      await api.delete(`/accreditation/events/${EVENT_ID}/manual/${row.attendeeId}`);
      toast.success("Manual accreditation revoked.");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to revoke.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Layout>
      <PageTitle>Certificate Eligibility</PageTitle>
      <p className="-mt-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
        Eligible = attended ({data ? `${data.requiredSessions} of ${data.totalSessions} sessions` : "…"} or venue
        accredited) + feedback submitted, or manually accredited by an admin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Registrations", value: stats.total, icon: <Users className="w-6 h-6" /> },
          { label: "Certificate eligible", value: stats.eligible, icon: <BadgeCheck className="w-6 h-6" /> },
          { label: "Manual accreditations", value: stats.manual, icon: <ShieldCheck className="w-6 h-6" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
            </div>
            <div className="p-3 rounded-2xl bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{s.icon}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 mb-8">
        <div className="relative">
          <Input
            className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-base font-semibold"
            placeholder="Search by name, unique ID or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ["all", "All"],
            ["eligible", "Eligible"],
            ["not_eligible", "Not eligible"],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full border-2 text-xs font-bold uppercase transition-all ${
                filter === key
                  ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4">Name</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Venue</th>
                <th className="py-4 px-4">Sessions</th>
                <th className="py-4 px-4">Feedback</th>
                <th className="py-4 px-4">Certificate</th>
                <th className="py-4 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-500 font-semibold">
                    No matching attendees.
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.attendeeId} className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                    <td className="py-4 px-4">
                      <p className="font-bold uppercase whitespace-nowrap">{r.fullName}</p>
                      <p className="text-xs font-mono text-gray-500">{r.uniqueId || "—"}</p>
                    </td>
                    <td className="py-4 px-4 text-xs font-bold uppercase">
                      {r.participationType === "Physical" ? "In-Person" : r.participationType || "—"}
                    </td>
                    <td className="py-4 px-4"><Pill ok={r.isAccredited} yes="Accredited" no="No" /></td>
                    <td className="py-4 px-4 font-bold">
                      {r.sessionsAttended} / {data?.totalSessions ?? 0}
                    </td>
                    <td className="py-4 px-4"><Pill ok={r.feedbackSubmitted} yes="Submitted" no="Pending" /></td>
                    <td className="py-4 px-4">
                      <Pill ok={r.certificateEligible} yes={r.manualOverride ? "Eligible (manual)" : "Eligible"} no="Not eligible" />
                      {r.manualOverride && r.manualOverrideReason && (
                        <p className="mt-1 text-[11px] text-gray-500 max-w-[220px] truncate" title={r.manualOverrideReason}>
                          “{r.manualOverrideReason}”
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {r.manualOverride ? (
                        <button
                          onClick={() => revoke(r)}
                          disabled={revoking === r.attendeeId}
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl disabled:opacity-50"
                        >
                          {revoking === r.attendeeId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                          Revoke
                        </button>
                      ) : !r.certificateEligible ? (
                        <button
                          onClick={() => {
                            setTarget(r);
                            setReason("");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-3 py-2 rounded-xl"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Accredit
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Pagination totalResults={filtered.length} resultsPerPage={PER_PAGE} onChange={setPage} label="Eligibility navigation" />
          </div>
        )}
      </div>

      {/* Manual accreditation modal */}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase">Manual Accreditation</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {target.fullName} will become certificate-eligible regardless of attendance or feedback. This is logged
                  with your name.
                </p>
              </div>
              <button onClick={() => setTarget(null)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="block mt-5 mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-28 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-green-500 focus:ring-green-500 resize-none"
              placeholder="e.g. Joined via colleague's laptop; confirmed attendance with organiser."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="flex gap-3 mt-5">
              <Button layout="outline" className="rounded-2xl h-12 flex-1 border-2" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button
                className="rounded-2xl h-12 flex-1 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                disabled={saving}
                onClick={submitManual}
              >
                <span className="inline-flex items-center gap-2 font-bold uppercase">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Accredit
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20" />
    </Layout>
  );
}