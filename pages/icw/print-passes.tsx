import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Printer, Download, Loader2, FileText } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Batch = { batch: number; from: number; to: number; count: number };
type Summary = { total: number; size: number; batches: Batch[] };

type TypeFilter = "Physical" | "Virtual" | "all";
type GroupFilter = "all" | "vip" | "regular";

type ApiSuccess<T> = { success: true; message: string; data: T };

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "Physical", label: "In-person" },
  { value: "Virtual", label: "Virtual" },
  { value: "all", label: "Everyone" },
];

const GROUP_OPTIONS: { value: GroupFilter; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "vip", label: "VIPs only" },
  { value: "regular", label: "Exclude VIPs" },
];

const SIZE_OPTIONS = [40, 80, 160];

const pill = (active: boolean) =>
  `px-4 py-2.5 rounded-full border-2 text-xs font-bold uppercase tracking-wide transition-all ${
    active
      ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400"
  }`;

export default function PrintPassesPage() {
  const [type, setType] = useState<TypeFilter>("Physical");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [size, setSize] = useState(80);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiSuccess<Summary>>("/passes/print/summary", { params: { type, group, size } });
      setSummary(res.data.data);
    } catch (err: any) {
      setSummary(null);
      toast.error(err?.response?.data?.message || "Failed to load passes.");
    } finally {
      setLoading(false);
    }
  }, [type, group, size]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function download(key: string, params: { batch: number; size: number }, filename: string) {
    try {
      setBusy(key);
      toast("Preparing PDF. Big batches can take up to a minute.", { icon: "⏳" });

      const res = await api.get("/passes/print/download", {
        params: { type, group, ...params },
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
      toast.success("Downloaded.");
    } catch (err: any) {
      let message = "Could not generate the PDF.";
      try {
        const text = await err?.response?.data?.text();
        message = JSON.parse(text).message || message;
      } catch {}
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  const slug = `${type.toLowerCase()}-${group}`;

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Print Passes</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Download event passes as print-ready badge sheets: 4 vertical badges per A4 page, alphabetical by surname, with the same QR the scanner already accepts.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6 space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Attendance type</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button key={o.value} className={pill(type === o.value)} onClick={() => setType(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Who</p>
          <div className="flex flex-wrap gap-2">
            {GROUP_OPTIONS.map((o) => (
              <button key={o.value} className={pill(group === o.value)} onClick={() => setGroup(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Passes per file</p>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((n) => (
              <button key={n} className={pill(size === n)} onClick={() => setSize(n)}>
                {n} ({n / 4} sheets)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test print */}
      <div className="mb-6 rounded-3xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-amber-900 dark:text-amber-200 uppercase">Do a test print first</p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            Print one sheet at 100% scale. Check the cut lines line up and scan a QR with the scanner before printing hundreds.
          </p>
        </div>
        <Button
          layout="outline"
          disabled={busy !== null || !summary || summary.total === 0}
          onClick={() => download("test", { batch: 1, size: 4 }, `passes-test-sheet.pdf`)}
          className="rounded-2xl h-11 border-2 shrink-0"
        >
          <span className="inline-flex items-center gap-2 font-bold uppercase text-xs">
            {busy === "test" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Test sheet (4)
          </span>
        </Button>
      </div>

      {/* Batches */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-green-600" />
          </div>
        ) : !summary || summary.total === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 font-semibold">No passes match these filters.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white">{summary.total}</strong> pass{summary.total === 1 ? "" : "es"} in{" "}
              <strong className="text-gray-900 dark:text-white">{summary.batches.length}</strong> file{summary.batches.length === 1 ? "" : "s"}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.batches.map((b) => {
                const key = `batch-${b.batch}`;

                return (
                  <div
                    key={b.batch}
                    className="flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {b.from}–{b.to}
                        </p>
                        <p className="text-xs text-gray-500">{b.count} passes</p>
                      </div>
                    </div>

                    <Button
                      disabled={busy !== null}
                      onClick={() => download(key, { batch: b.batch, size: summary.size }, `passes-${slug}-${b.from}-${b.to}.pdf`)}
                      className="rounded-xl h-10 shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                    >
                      <span className="inline-flex items-center gap-1.5 font-bold uppercase text-xs">
                        {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        PDF
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6 text-sm text-gray-700 dark:text-gray-300 space-y-2">
        <p className="font-bold text-gray-900 dark:text-white uppercase text-xs tracking-wide">Printing tips</p>
        <p>Print on A4 at <strong>100% / "Actual size"</strong>. Turn off "fit to page", or the badges and cut lines will shift.</p>
        <p>Each badge is 99 × 135 mm (portrait). Cut along the dotted lines and check it fits your lanyard holder. Heavier card stock (200–250 gsm) works best.</p>
        <p>Colour bands: green = in-person, blue = virtual, gold = VIP. Organisation and ID are bold so badges can be sorted at a glance.</p>
      </div>

      <div className="pb-20" />
    </Layout>
  );
}