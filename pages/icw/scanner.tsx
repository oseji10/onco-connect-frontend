import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Badge, Select } from "@roketid/windmill-react-ui";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Ticket,
  ScanLine,
  Keyboard,
  UtensilsCrossed,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type ScanState =
  | "idle"
  | "starting"
  | "scanning"
  | "processing"
  | "success"
  | "error";

type RedeemResponse = {
  success: boolean;
  message: string;
  data?: {
    status?: string;
    eventId?: number;
    mealSessionId?: number;
    mealSession?: string;
    mealDate?: string;
    redeemedAt?: string;
  };
};

type ScanResultModalData = {
  type: "success" | "error";
  title: string;
  message: string;
  mealSession?: string;
  mealDate?: string;
  redeemedAt?: string;
  scannedCode?: string;
};

type ResultModalProps = {
  open: boolean;
  data: ScanResultModalData | null;
  onClose: () => void;
};

function ResultModal({ open, data, onClose }: ResultModalProps) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-6 pb-4 text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                data.type === "success"
                  ? "bg-emerald-100 dark:bg-emerald-900/20"
                  : "bg-red-100 dark:bg-red-900/20"
              }`}
            >
              {data.type === "success" ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
            </div>

            <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              {data.title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {data.message}
            </p>

            <div className="mt-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 text-left space-y-2">
              {data.mealSession && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Meal Session:
                  </span>{" "}
                  {data.mealSession}
                </p>
              )}

              {data.mealDate && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Meal Date:
                  </span>{" "}
                  {formatDisplayDate(data.mealDate)}
                </p>
              )}

              {data.redeemedAt && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Redeemed At:
                  </span>{" "}
                  {data.redeemedAt}
                </p>
              )}

              {data.scannedCode && (
                <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Pass Code:
                  </span>{" "}
                  {maskToken(data.scannedCode)}
                </p>
              )}
            </div>

            <Button
              className={`mt-6 w-full rounded-2xl h-12 ${
                data.type === "success"
                  ? "bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                  : "bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700"
              }`}
              onClick={onClose}
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function maskToken(value: string) {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDisplayDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function EventPassScannerPage() {
  const isMountedRef = useRef(true);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [deviceName, setDeviceName] = useState("Main Event Scanner");
  const [manualToken, setManualToken] = useState("");
  const [todayCount, setTodayCount] = useState(0);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultModalData, setResultModalData] = useState<ScanResultModalData | null>(null);

  // Get available cameras using the library hook
  const devices = useDevices();

  const availableCameras = useMemo(() => {
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((device) => ({
        id: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 6)}`,
      }));
  }, [devices]);

  // Auto-select rear/environment camera when devices load
  useEffect(() => {
    if (availableCameras.length > 0 && !selectedCameraId) {
      const rearCamera =
        availableCameras.find((cam) =>
          ["back", "rear", "environment"].some((word) =>
            cam.label.toLowerCase().includes(word)
          )
        ) || availableCameras[0];

      setSelectedCameraId(rearCamera.id);
    }
  }, [availableCameras, selectedCameraId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function redeemToken(rawToken: string) {
    const token = rawToken.trim();
    if (!token) return;

    try {
      setScanState("processing");

      const { data } = await api.post<RedeemResponse>("/scanner/redeem", {
        token,
        deviceName,
      });

      const resultData = data?.data || {};

      setResultModalData({
        type: "success",
        title: "Pass Redeemed Successfully",
        message: data?.message || "Pass redeemed successfully.",
        mealSession: resultData.mealSession,
        mealDate: resultData.mealDate,
        redeemedAt: resultData.redeemedAt,
        scannedCode: token,
      });

      setTodayCount((prev) => prev + 1);
      setManualToken("");
      setScanState("success");
      setResultModalOpen(true);
      toast.success(data?.message || "Pass redeemed successfully.");
    } catch (error: any) {
      const response = error?.response?.data;
      const resultData = response?.data || {};

      setResultModalData({
        type: "error",
        title: "Pass Not Accepted",
        message: response?.message || "Pass could not be redeemed.",
        mealSession: resultData.mealSession,
        mealDate: resultData.mealDate,
        redeemedAt: resultData.redeemedAt,
        scannedCode: token,
      });

      setScanState("error");
      setResultModalOpen(true);
      toast.error(response?.message || "Pass could not be redeemed.");
    }
  }

  function handleCloseResultModal() {
    setResultModalOpen(false);
    setResultModalData(null);
    setScanState(isScannerRunning ? "scanning" : "idle");
  }

  async function submitManualToken(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) {
      toast.error("Enter a pass code first.");
      return;
    }
    await redeemToken(manualToken);
  }

  const statusBadge = useMemo(() => {
    if (scanState === "scanning") return { type: "success", label: "Scanning" };
    if (scanState === "processing") return { type: "warning", label: "Processing" };
    if (scanState === "success") return { type: "success", label: "Accepted" };
    if (scanState === "error") return { type: "danger", label: "Attention" };
    if (scanState === "starting") return { type: "warning", label: "Starting" };
    return { type: "neutral", label: "Idle" };
  }, [scanState]);

  // Camera constraints
  const scannerConstraints = useMemo<MediaTrackConstraints>(() => {
    if (selectedCameraId) {
      return { deviceId: { exact: selectedCameraId } };
    }
    return { facingMode: "environment" };
  }, [selectedCameraId]);

  return (
    <Layout>
      <ResultModal
        open={resultModalOpen}
        data={resultModalData}
        onClose={handleCloseResultModal}
      />

      <div className="mb-6">
        <PageTitle>Scanner</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Scan reusable event passes and redeem them once for the currently active meal session.
        </p>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-4 py-5 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                Event Pass Scanner
              </div>
              <h2 className="mt-3 text-xl sm:text-3xl font-bold leading-tight">
                One QR pass, one redemption per active meal
              </h2>
              <p className="mt-2 text-xs sm:text-base text-slate-200 leading-6">
                Scan at the serving point. Tap OK after each result to continue scanning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="mb-5 hidden sm:grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Scanner Status</p>
          <div className="mt-3">
            <Badge type={statusBadge.type as any}>{statusBadge.label}</Badge>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Successful Redemptions</p>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{todayCount}</p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Camera Access</p>
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {hasCameraPermission === null
              ? "Not requested yet"
              : hasCameraPermission
                ? "Allowed"
                : "Blocked or unavailable"}
          </p>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="sm:hidden space-y-4">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <div className="flex flex-col gap-3">
            {!isScannerRunning ? (
              <Button
                onClick={() => {
                  setIsScannerRunning(true);
                  setScanState("scanning");
                  setHasCameraPermission(true);
                  toast.success("Scanner started");
                }}
                className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full"
              >
                <span className="inline-flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Start Scanner
                </span>
              </Button>
            ) : (
              <Button
                layout="outline"
                onClick={() => setIsScannerRunning(false)}
                className="rounded-2xl h-12 w-full"
              >
                <span className="inline-flex items-center gap-2">
                  <CameraOff className="w-4 h-4" />
                  Stop Scanner
                </span>
              </Button>
            )}

            {isScannerRunning && (
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-2 overflow-hidden">
                <Scanner
                  onScan={(detectedCodes) => {
                    if (detectedCodes.length === 0) return;
                    const decodedText = detectedCodes[0].rawValue;

                    const now = Date.now();
                    if (
                      decodedText === lastScannedRef.current &&
                      now - lastScanTimeRef.current < 2500
                    ) {
                      return;
                    }

                    lastScannedRef.current = decodedText;
                    lastScanTimeRef.current = now;

                    redeemToken(decodedText);
                  }}
                  onError={(error) => {
                    console.error("Scanner error:", error);
                    if (String(error).toLowerCase().includes("permission")) {
                      setHasCameraPermission(false);
                      toast.error("Camera permission denied");
                    }
                  }}
                  constraints={scannerConstraints}
                  formats={["qr_code"]}
                  styles={{
                    container: { width: "100%", height: "320px" },
                    video: { width: "100%", height: "100%", objectFit: "cover", background: "#000" },
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Manual Redeem */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Manual Redeem</h4>
          </div>

          <form onSubmit={submitManualToken} className="mt-3 space-y-3">
            <Input
              className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Paste or type pass token"
            />
            <Button
              type="submit"
              disabled={scanState === "processing"}
              className="rounded-2xl w-full h-11 bg-slate-900 border-slate-900 hover:bg-slate-800 hover:border-slate-800"
            >
              Redeem Manually
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Scanner</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Point the camera at the printed event pass.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isScannerRunning ? (
                <Button
                  onClick={() => {
                    setIsScannerRunning(true);
                    setScanState("scanning");
                    setHasCameraPermission(true);
                    toast.success("Scanner started");
                  }}
                  className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto"
                >
                  <span className="inline-flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Start Scanner
                  </span>
                </Button>
              ) : (
                <Button
                  layout="outline"
                  onClick={() => setIsScannerRunning(false)}
                  className="rounded-2xl h-11 w-full sm:w-auto"
                >
                  <span className="inline-flex items-center gap-2">
                    <CameraOff className="w-4 h-4" />
                    Stop Scanner
                  </span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr,250px]">
            <div>
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-2 sm:p-3 overflow-hidden">
                {isScannerRunning ? (
                  <Scanner
                    onScan={(detectedCodes) => {
                      if (detectedCodes.length === 0) return;
                      const decodedText = detectedCodes[0].rawValue;

                      const now = Date.now();
                      if (
                        decodedText === lastScannedRef.current &&
                        now - lastScanTimeRef.current < 2500
                      ) {
                        return;
                      }

                      lastScannedRef.current = decodedText;
                      lastScanTimeRef.current = now;

                      redeemToken(decodedText);
                    }}
                    onError={(error) => console.error("Scanner error:", error)}
                    constraints={scannerConstraints}
                    formats={["qr_code"]}
                    styles={{
                      container: { width: "100%", minHeight: "420px" },
                      video: { width: "100%", height: "100%", objectFit: "cover", background: "#000" },
                    }}
                  />
                ) : (
                  <div className="min-h-[420px] bg-black rounded-2xl flex items-center justify-center text-gray-400">
                    Click "Start Scanner" to begin
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Scanner Name */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Scanner Name
                </label>
                <Input
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Main Hall Scanner"
                />
              </div>

              {/* Camera Selection */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Camera
                </label>
                <Select
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                >
                  {availableCameras.length === 0 ? (
                    <option value="">Loading cameras...</option>
                  ) : (
                    availableCameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label}
                      </option>
                    ))
                  )}
                </Select>
              </div>

              {/* Manual Entry */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Manual Entry</h4>
                </div>

                <form onSubmit={submitManualToken} className="mt-3 space-y-3">
                  <Input
                    className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste or type pass token"
                  />
                  <Button
                    type="submit"
                    disabled={scanState === "processing"}
                    className="rounded-2xl w-full h-11 bg-slate-900 border-slate-900 hover:bg-slate-800 hover:border-slate-800"
                  >
                    Redeem Manually
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Guide & Device Info (unchanged from your original) */}
        <div className="space-y-5">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner Guide</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              {/* Your guide items here - keep as in original code */}
              <div className="flex gap-3">
                <UtensilsCrossed className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                <p>Only one meal session should be active at a time for the event.</p>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                <p>When one meal closes and the next opens, the same pass becomes valid again for the new meal.</p>
              </div>
              <div className="flex gap-3">
                <Ticket className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                <p>Use manual entry only when the printed QR is damaged or unreadable.</p>
              </div>
              <div className="flex gap-3">
                <Ticket className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                <p>After every scan, tap OK on the popup to return to the scanner.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Device</h3>
            </div>
            <div className="mt-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Scanner Name</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white break-words">
                {deviceName || "Unnamed scanner"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}