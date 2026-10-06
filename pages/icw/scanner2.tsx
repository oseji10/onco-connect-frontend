import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Select } from "@roketid/windmill-react-ui";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Keyboard,
  User,
  Loader2,
  UtensilsCrossed,
  DoorOpen,
  Search,
  Crown,
} from "lucide-react";
import toast from "react-hot-toast";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { getCategoryDisplayName } from "../../types/registration-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "gate" | "meal";
type View = "scan" | "find";

type AttendeeSummary = {
  fullName: string;
  uniqueId: string | null;
  category: string | null;
  participationType: string | null;
  photoUrl: string | null;
  serialNumber: string | null;
  isVip: boolean;
  guests: number;
};

type SessionSummary = { mealSessionId: number; title: string; mealDate: string; startTime: string; endTime: string };
type DaySummary = { sessionId: number; title: string; startsAt: string; endsAt: string };

type CurrentData = {
  session: SessionSummary | null;
  servedCount: number;
  accreditedCount: number;
  day: DaySummary | null;
  presentToday: number;
};

type Person = {
  attendeeId: number;
  fullName: string;
  organization: string | null;
  uniqueId: string | null;
  photoUrl: string | null;
  isVip: boolean;
  guests: number;
  isAccredited: boolean;
  served: boolean;
  servedAt: string | null;
  presentToday: boolean;
};

type Tone = "ok" | "warn" | "deny";
type ResultState = { tone: Tone; title: string; message: string; attendee?: AttendeeSummary | null };

type ApiSuccess<T> = { success: true; message: string; data: T };

const AUTO_DISMISS_MS: Record<Exclude<Tone, "deny">, number> = { ok: 2500, warn: 3500 }; // errors wait for a tap
const REPEAT_SCAN_BLOCK_MS = 5000; // ignore the same QR still in front of the camera

const fmtTime = (v: string) => new Date(v).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// ─── Result popup ─────────────────────────────────────────────────────────────

// Colours are inline on purpose: the popup must stay readable no matter which Tailwind colours exist in the build.
const TONE_COLORS: Record<Tone, string> = { ok: "#059669", warn: "#d97706", deny: "#dc2626" };

function ResultModal({ result, onClose }: { result: ResultState | null; onClose: () => void }) {
  if (!result) return null;

  const { tone, attendee } = result;
  const color = TONE_COLORS[tone];
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : XCircle;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-6 text-center" style={{ backgroundColor: color, color: "#ffffff" }}>
          <Icon className="w-16 h-16 mx-auto" style={{ color: "#ffffff" }} />
          <p className="mt-3 text-3xl font-extrabold uppercase tracking-wide" style={{ color: "#ffffff" }}>
            {result.title}
          </p>
          <p className="mt-2 text-base font-semibold leading-snug" style={{ color: "#ffffff" }}>
            {result.message}
          </p>
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
                {attendee.isVip ? <Crown className="w-16 h-16" style={{ color: "#f59e0b" }} /> : <User className="w-16 h-16 text-gray-400" />}
              </div>
            )}

            <p className="mt-4 text-xl font-bold uppercase text-gray-900 dark:text-white break-words">{attendee.fullName}</p>
            <p className="mt-1 text-sm font-mono font-bold text-gray-600 dark:text-gray-300">{attendee.uniqueId || "—"}</p>

            {attendee.isVip ? (
              <p
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase"
                style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
              >
                <Crown className="w-3.5 h-3.5" /> VIP{attendee.guests > 0 ? ` · +${attendee.guests} guest${attendee.guests === 1 ? "" : "s"}` : ""}
              </p>
            ) : (
              attendee.category && (
                <p className="mt-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">{getCategoryDisplayName(attendee.category)}</p>
              )
            )}
          </div>
        )}

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl font-bold uppercase tracking-wide"
            style={{ backgroundColor: color, color: "#ffffff" }}
          >
            {tone === "deny" ? "OK" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScannerPage() {
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ value: string; time: number }>({ value: "", time: 0 });

  const [mode, setMode] = useState<Mode>("gate");
  const [view, setView] = useState<View>("scan");
  const [current, setCurrent] = useState<CurrentData | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [deviceName, setDeviceName] = useState("Entrance");
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

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

  // Remember mode + scanner name on this device
  useEffect(() => {
    try {
      const m = localStorage.getItem("scannerMode");
      if (m === "gate" || m === "meal") setMode(m);
      const n = localStorage.getItem("scannerDeviceName");
      if (n) setDeviceName(n);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("scannerMode", mode);
      localStorage.setItem("scannerDeviceName", deviceName);
    } catch {}
  }, [mode, deviceName]);

  // Open meal session + today's day + live counters
  const loadCurrent = useCallback(async () => {
    try {
      const { data } = await api.get<ApiSuccess<CurrentData>>("/scan/current");
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

  // Success / warning popups dismiss themselves; errors wait for a tap
  useEffect(() => {
    if (!result || result.tone === "deny") return;
    const t = setTimeout(() => setResult(null), AUTO_DISMISS_MS[result.tone]);
    return () => clearTimeout(t);
  }, [result]);

  // Camera only makes sense in the scan view
  useEffect(() => {
    if (view !== "scan") setRunning(false);
  }, [view]);

  const loadPeople = useCallback(async () => {
    try {
      setLoadingPeople(true);
      const res = await api.get<ApiSuccess<{ people: Person[] }>>("/scan/people", { params: { search: query || undefined } });
      setPeople(res.data.data.people);
    } catch {
      setPeople([]);
    } finally {
      setLoadingPeople(false);
    }
  }, [query]);

  useEffect(() => {
    if (view !== "find") return;
    const t = setTimeout(loadPeople, 300);
    return () => clearTimeout(t);
  }, [view, loadPeople]);

  const submit = useCallback(
    async (payload: { token?: string; attendeeId?: number }) => {
      if (busyRef.current) return;

      busyRef.current = true;
      setProcessing(true);

      try {
        if (mode === "meal") {
          const { data } = await api.post("/scan/redeem", { ...payload, deviceName });

          setResult({ tone: "ok", title: "Allowed", message: "Let them in to the buffet.", attendee: data?.data?.attendee });

          if (typeof data?.data?.servedCount === "number") {
            setCurrent((prev) => (prev ? { ...prev, servedCount: data.data.servedCount } : prev));
          }
        } else {
          const { data } = await api.post("/scan/attendance", { ...payload, deviceName });
          const d = data?.data || {};

          if (d.alreadyMarked) {
            setResult({ tone: "warn", title: "Already counted", message: "Checked in earlier today. Let them through.", attendee: d.attendee });
          } else if (!d.accredited) {
            setResult({
              tone: "warn",
              title: "Checked in",
              message: "Not accredited yet. Send them to the accreditation desk.",
              attendee: d.attendee,
            });
          } else {
            setResult({ tone: "ok", title: "Checked in", message: `Attendance recorded for ${d.day?.title || "today"}.`, attendee: d.attendee });
          }

          if (typeof d.presentCount === "number") {
            setCurrent((prev) => (prev ? { ...prev, presentToday: d.presentCount } : prev));
          }
        }

        navigator.vibrate?.(80);
      } catch (err: any) {
        const res = err?.response?.data;
        const status = err?.response?.status;

        if (!status || status >= 500) {
          // A server or network fault is NOT a denied attendee: never show raw errors to door staff.
          setResult({
            tone: "deny",
            title: "System error",
            message: "Could not process this scan. Try again, or use Find person. Tell an admin if it keeps happening.",
            attendee: null,
          });
        } else {
          setResult({
            tone: "deny",
            title: mode === "meal" ? "Not allowed" : "Not recognised",
            message: res?.message || "Could not process this pass.",
            attendee: res?.data?.attendee,
          });
        }
        navigator.vibrate?.([200, 100, 200]);
      } finally {
        busyRef.current = false;
        setProcessing(false);
        setManualToken("");
      }
    },
    [mode, deviceName]
  );

  async function actOnPerson(p: Person) {
    setActingId(p.attendeeId);
    await submit({ attendeeId: p.attendeeId });
    await loadPeople();
    setActingId(null);
  }

  function handleScan(codes: { rawValue: string }[]) {
    const value = codes?.[0]?.rawValue;
    if (!value) return;

    const now = Date.now();
    if (value === lastScanRef.current.value && now - lastScanRef.current.time < REPEAT_SCAN_BLOCK_MS) return;

    lastScanRef.current = { value, time: now };
    submit({ token: value });
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return toast.error("Enter a pass code first.");
    submit({ token: manualToken.trim() });
  }

  const constraints = useMemo<MediaTrackConstraints>(
    () => (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" }),
    [selectedCameraId]
  );

  const canScan = mode === "meal" ? Boolean(current?.session) : Boolean(current?.day);
  const session = current?.session ?? null;
  const day = current?.day ?? null;

  const counter = mode === "meal" ? current?.servedCount ?? 0 : current?.presentToday ?? 0;
  const accredited = current?.accreditedCount ?? 0;
  const pct = accredited > 0 ? Math.min(100, Math.round((counter / accredited) * 100)) : 0;

  const pill = (active: boolean) =>
    `inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 text-sm font-bold uppercase tracking-wide transition-all ${
      active
        ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
    }`;

  return (
    <Layout>
      <ResultModal result={result} onClose={() => setResult(null)} />

      <PageTitle>Scanner</PageTitle>

      {/* Mode + view */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button className={pill(mode === "gate")} onClick={() => setMode("gate")}>
            <DoorOpen className="w-4 h-4" /> Gate
          </button>
          <button className={pill(mode === "meal")} onClick={() => setMode("meal")}>
            <UtensilsCrossed className="w-4 h-4" /> Meal
          </button>
        </div>

        <div className="flex gap-2">
          <button className={pill(view === "scan")} onClick={() => setView("scan")}>
            <Camera className="w-4 h-4" /> Scan
          </button>
          <button className={pill(view === "find")} onClick={() => setView("find")}>
            <Search className="w-4 h-4" /> Find person
          </button>
        </div>
      </div>

      {/* Banner */}
      {loadingCurrent ? (
        <div className="mb-5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
        </div>
      ) : canScan ? (
        <div className="mb-5 rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white shadow-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-100">
                {mode === "meal" ? "Now serving" : "Attendance for today"}
              </p>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold leading-tight">{mode === "meal" ? session?.title : day?.title}</h2>
              {mode === "meal" && session && (
                <p className="mt-1 text-xs text-green-100">
                  {session.startTime} – {session.endTime}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-4xl font-extrabold leading-none">{counter}</p>
              <p className="mt-1 text-xs text-green-100">
                {mode === "meal" ? "served" : "checked in"} · {accredited} accredited
              </p>
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
            <p className="font-bold text-amber-900 dark:text-amber-200 uppercase">
              {mode === "meal" ? "No meal session is open" : "No conference day for today"}
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {mode === "meal"
                ? "Ask an admin to open a session under Meal Sessions. Scanning is disabled until then."
                : "Ask an admin to add today under Attendance. Scanning is disabled until then."}
            </p>
          </div>
        </div>
      )}

      {/* ── Scan view ── */}
      {view === "scan" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{mode === "meal" ? "Scan for meal" : "Scan at the gate"}</h3>

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
                  {mode === "meal" ? <UtensilsCrossed className="w-10 h-10" /> : <DoorOpen className="w-10 h-10" />}
                  <p className="text-sm">{canScan ? 'Tap "Start" to begin scanning' : "Scanning is disabled for now"}</p>
                </div>
              )}

              {processing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Scanner name</label>
                <Input
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Hall Gate A"
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
                If a QR will not scan, type the pass serial number, or use <strong>Find person</strong> above.
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
                  Submit
                </Button>
              </form>
            </div>

            <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <p className="font-semibold text-gray-900 dark:text-white">{mode === "meal" ? "At the buffet" : "At the gate"}</p>
              <p>Compare the photo on screen with the person in front of you.</p>
              {mode === "meal" ? (
                <p>One scan per person per meal. Green closes by itself; red needs a tap.</p>
              ) : (
                <p>One scan per person per day. A second scan is harmless: it just says "Already counted".</p>
              )}
              <p>Not accredited? Send them to the accreditation desk first.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Find person view ── */}
      {view === "find" && (
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 sm:p-6">
          <div className="relative">
            <Input
              className="pl-11 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-base font-semibold"
              placeholder="Search name, ID, phone or organisation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
          </div>

          <p className="mt-3 mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {query.trim() ? "Search results" : "VIP list"}
          </p>

          {!canScan && (
            <p className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              {mode === "meal" ? "No meal session is open." : "No conference day is scheduled for today."} Actions are disabled.
            </p>
          )}

          {loadingPeople ? (
            <div className="py-12 text-center">
              <Loader2 className="w-7 h-7 animate-spin mx-auto text-green-600" />
            </div>
          ) : people.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500 font-semibold">
              {query.trim() ? "No one matches that search." : "No VIPs added yet. Add them under VIPs."}
            </p>
          ) : (
            <div className="space-y-3">
              {people.map((p) => {
                const done = mode === "meal" ? p.served : p.presentToday;
                const blocked = mode === "meal" && !p.isAccredited;

                return (
                  <div
                    key={p.attendeeId}
                    className="flex items-center gap-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 p-3 sm:p-4"
                  >
                    {p.photoUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_FILE_URL}${p.photoUrl}`}
                        alt={p.fullName}
                        className="h-14 w-14 rounded-xl object-cover border border-gray-200 dark:border-gray-600 shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        {p.isVip ? <Crown className="w-6 h-6 text-amber-500" /> : <User className="w-6 h-6 text-gray-400" />}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-bold uppercase text-gray-900 dark:text-white truncate">{p.fullName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {[p.organization, p.uniqueId].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {p.isVip && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                            <Crown className="w-3 h-3" /> VIP{p.guests > 0 ? ` +${p.guests}` : ""}
                          </span>
                        )}
                        {!p.isAccredited && (
                          <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:text-red-300">
                            Not accredited
                          </span>
                        )}
                        {done && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                            {mode === "meal" ? `Served${p.servedAt ? " " + fmtTime(p.servedAt) : ""}` : "Present today"}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      disabled={!canScan || done || blocked || processing || actingId === p.attendeeId}
                      onClick={() => actOnPerson(p)}
                      className="rounded-2xl h-11 shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 border-0 disabled:opacity-40"
                    >
                      <span className="inline-flex items-center gap-2 font-bold uppercase text-xs">
                        {actingId === p.attendeeId && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mode === "meal" ? "Serve" : "Mark present"}
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="pb-20" />
    </Layout>
  );
}