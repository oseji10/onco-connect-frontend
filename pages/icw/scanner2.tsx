import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Select } from "@roketid/windmill-react-ui";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Keyboard,
  User,
  Loader2,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { getCategoryDisplayName } from "../../types/registration-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendeeSummary = {
  fullName: string;
  uniqueId: string | null;
  category: string | null;
  participationType: string | null;
  photoUrl: string | null;
  serialNumber: string | null;
};

type SessionSummary = {
  mealSessionId: number;
  title: string;
  mealDate: string;
  startTime: string;
  endTime: string;
};

type CurrentData = {
  session: SessionSummary | null;
  servedCount: number;
  accreditedCount: number;
};

type ScanResult = {
  ok: boolean;
  message: string;
  code?: string;
  attendee?: AttendeeSummary | null;
  redeemedAt?: string | null;
};

type ApiSuccess<T> = { success: true; message: string; data: T };

const AUTO_DISMISS_MS = 1800; // success popups close themselves to keep the queue moving
const REPEAT_SCAN_BLOCK_MS = 5000; // ignore the same QR still in front of the camera

// ─── Result popup ─────────────────────────────────────────────────────────────

function ResultModal({ result, onClose }: { result: ScanResult | null; onClose: () => void }) {
  if (!result) return null;

  const { ok, attendee } = result;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 py-5 text-center text-white ${ok ? "bg-emerald-600" : "bg-red-600"}`}>
          {ok ? <CheckCircle2 className="w-14 h-14 mx-auto" /> : <XCircle className="w-14 h-14 mx-auto" />}
          <p className="mt-2 text-2xl font-extrabold uppercase tracking-wide">{ok ? "Allowed" : "Not allowed"}</p>
          <p className="mt-1 text-sm font-medium opacity-95">{result.message}</p>
        </div>

        {attendee && (
          <div className="p-6 text-center">
            {attendee.photoUrl ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_FILE_URL}${attendee.photoUrl}`}
                alt={attendee.fullName}
                className="mx-auto h-36 w-36 rounded-2xl object-cover border-4 border-gray-100 dark:border-gray-700"
              />
            ) : (
              <div className="mx-auto h-36 w-36 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <User className="w-16 h-16 text-gray-400" />
              </div>
            )}

            <p className="mt-4 text-lg font-bold uppercase text-gray-900 dark:text-white break-words">
              {attendee.fullName}
            </p>
            <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">{attendee.uniqueId || "—"}</p>
            {attendee.category && (
              <p className="mt-1 text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">
                {getCategoryDisplayName(attendee.category)}
              </p>
            )}
          </div>
        )}

        <div className="px-6 pb-6">
          <Button
            className={`w-full rounded-2xl h-12 border-0 ${
              ok ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
            }`}
            onClick={onClose}
          >
            <span className="font-bold uppercase">{ok ? "Next" : "OK"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventPassScannerPage() {
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ value: string; time: number }>({ value: "", time: 0 });

  const [current, setCurrent] = useState<CurrentData | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [deviceName, setDeviceName] = useState("Buffet Entrance");
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const devices = useDevices();

  const cameras = useMemo(
    () =>
      devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ id: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` })),
    [devices]
  );

  // Prefer the rear camera
  useEffect(() => {
    if (cameras.length && !selectedCameraId) {
      const rear = cameras.find((c) => /back|rear|environment/i.test(c.label)) || cameras[0];
      setSelectedCameraId(rear.id);
    }
  }, [cameras, selectedCameraId]);

  // Remember the scanner name on this device
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mealScannerDeviceName");
      if (saved) setDeviceName(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("mealScannerDeviceName", deviceName);
    } catch {}
  }, [deviceName]);

  // Open session + live counters
  const loadCurrent = useCallback(async () => {
    try {
      const { data } = await api.get<ApiSuccess<CurrentData>>("/scanner/current");
      setCurrent(data.data);
    } catch {
      /* keep last known state */
    } finally {
      setLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    loadCurrent();
    const t = setInterval(loadCurrent, 10_000);
    return () => clearInterval(t);
  }, [loadCurrent]);

  // Success popups dismiss themselves; errors wait for a tap
  useEffect(() => {
    if (!result?.ok) return;
    const t = setTimeout(() => setResult(null), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [result]);

  const redeem = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token || busyRef.current) return;

      busyRef.current = true;
      setProcessing(true);

      try {
        const { data } = await api.post("/scanner/redeem", { token, deviceName });

        setResult({
          ok: true,
          message: data?.message || "Allowed in.",
          attendee: data?.data?.attendee,
          redeemedAt: data?.data?.redeemedAt,
        });

        if (typeof data?.data?.servedCount === "number") {
          setCurrent((prev) => (prev ? { ...prev, servedCount: data.data.servedCount } : prev));
        }
        navigator.vibrate?.(80);
      } catch (err: any) {
        const res = err?.response?.data;

        setResult({
          ok: false,
          message: res?.message || "Pass could not be redeemed.",
          code: res?.code,
          attendee: res?.data?.attendee,
          redeemedAt: res?.data?.redeemedAt,
        });
        navigator.vibrate?.([200, 100, 200]);
      } finally {
        busyRef.current = false;
        setProcessing(false);
        setManualToken("");
      }
    },
    [deviceName]
  );

  function handleScan(codes: { rawValue: string }[]) {
    const value = codes?.[0]?.rawValue;
    if (!value) return;

    const now = Date.now();
    if (value === lastScanRef.current.value && now - lastScanRef.current.time < REPEAT_SCAN_BLOCK_MS) return;

    lastScanRef.current = { value, time: now };
    redeem(value);
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return toast.error("Enter a pass code first.");
    redeem(manualToken);
  }

  const constraints = useMemo<MediaTrackConstraints>(
    () => (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" }),
    [selectedCameraId]
  );

  const session = current?.session ?? null;
  const canScan = Boolean(session);
  const pct =
    current && current.accreditedCount > 0
      ? Math.min(100, Math.round((current.servedCount / current.accreditedCount) * 100))
      : 0;

  return (
    <Layout>
      <ResultModal result={result} onClose={() => setResult(null)} />

      <PageTitle>Meal Scanner</PageTitle>

      {/* Session banner */}
      {loadingCurrent ? (
        <div className="mb-5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
        </div>
      ) : session ? (
        <div className="mb-5 rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white shadow-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-100">Now serving</p>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold leading-tight">{session.title}</h2>
              <p className="mt-1 text-xs text-green-100">
                {session.startTime} – {session.endTime}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-4xl font-extrabold leading-none">{current?.servedCount ?? 0}</p>
              <p className="mt-1 text-xs text-green-100">of {current?.accreditedCount ?? 0} accredited</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-3xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-200 uppercase">No meal session is open</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              Ask an admin to open a session under Meal Sessions. Scanning is disabled until then.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr,0.8fr]">
        {/* Camera */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scan pass</h3>

            {!running ? (
              <Button
                disabled={!canScan}
                onClick={() => setRunning(true)}
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              >
                <span className="inline-flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Start
                </span>
              </Button>
            ) : (
              <Button layout="outline" onClick={() => setRunning(false)} className="rounded-2xl h-11">
                <span className="inline-flex items-center gap-2">
                  <CameraOff className="w-4 h-4" />
                  Stop
                </span>
              </Button>
            )}
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-black min-h-[320px] lg:min-h-[420px]">
            {running && canScan ? (
              <Scanner
                onScan={(codes) => handleScan(codes as any)}
                onError={(error) => {
                  console.error("Scanner error:", error);
                  if (String(error).toLowerCase().includes("permission")) toast.error("Camera permission denied");
                }}
                paused={Boolean(result) || processing}
                constraints={constraints}
                formats={["qr_code"]}
                styles={{
                  container: { width: "100%", minHeight: "320px" },
                  video: { width: "100%", height: "100%", objectFit: "cover" },
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400">
                <UtensilsCrossed className="w-10 h-10" />
                <p className="text-sm">{canScan ? 'Tap "Start" to begin scanning' : "Waiting for a session to open"}</p>
              </div>
            )}

            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-10 h-10 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-5">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Scanner name</label>
              <Input
                className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Buffet Entrance A"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Camera</label>
              <Select
                className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
              >
                {cameras.length === 0 ? (
                  <option value="">Loading cameras...</option>
                ) : (
                  cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))
                )}
              </Select>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Manual entry</h4>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use only if a QR will not scan. Type the pass serial number or code.
            </p>
            <form onSubmit={submitManual} className="mt-3 space-y-3">
              <Input
                className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="e.g. ICW-0001"
                disabled={!canScan}
              />
              <Button
                type="submit"
                disabled={!canScan || processing}
                className="rounded-2xl w-full h-11 bg-slate-900 border-slate-900 hover:bg-slate-800 hover:border-slate-800"
              >
                Redeem manually
              </Button>
            </form>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <p className="font-semibold text-gray-900 dark:text-white">At the door</p>
            <p>Compare the photo on screen with the person in front of you.</p>
            <p>One scan per person per meal. Green closes by itself; red needs a tap.</p>
            <p>Not accredited? Send them to the accreditation desk first.</p>
          </div>
        </div>
      </div>

      <div className="pb-20" />
    </Layout>
  );
}