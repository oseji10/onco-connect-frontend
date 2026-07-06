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
} from "lucide-react";
import toast from "react-hot-toast";
import { Html5Qrcode } from "html5-qrcode";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type RedeemResponse = {
  success: boolean;
  message: string;
  meal?: string;
  ticketId?: number;
  redeemed_at?: string;
  data?: {
    status?: string;
    meal?: string;
    redeemed_at?: string;
  };
};

type ScanState =
  | "idle"
  | "starting"
  | "scanning"
  | "processing"
  | "success"
  | "error";

type ScanResultCard = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
  meal?: string;
  redeemedAt?: string;
  scannedCode?: string;
};

const SCANNER_REGION_ID = "meal-ticket-scanner-region";

function maskToken(value: string) {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function MealScannerPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [deviceName, setDeviceName] = useState("Front Desk Scanner");
  const [manualToken, setManualToken] = useState("");
  const [lastResult, setLastResult] = useState<ScanResultCard | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      void stopScanner();
    };
  }, []);

  async function loadCameras() {
    try {
      const devices = await Html5Qrcode.getCameras();
      const mapped = devices.map((device) => ({
        id: device.id,
        label: device.label || `Camera ${device.id.slice(0, 6)}`,
      }));

      if (!isMountedRef.current) return;

      setAvailableCameras(mapped);

      if (!selectedCameraId && mapped.length > 0) {
        setSelectedCameraId(mapped[0].id);
      }

      return mapped;
    } catch (error) {
      if (!isMountedRef.current) return [];
      toast.error("Unable to access available cameras.");
      return [];
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current && isScannerRunning) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } else if (scannerRef.current) {
        await scannerRef.current.clear();
      }
    } catch {
      // ignore scanner shutdown noise
    } finally {
      if (!isMountedRef.current) return;
      setIsScannerRunning(false);
      setScanState("idle");
    }
  }

  async function startScanner() {
    if (scanState === "starting" || scanState === "processing") return;

    try {
      setScanState("starting");
      setLastResult(null);

      const devices = availableCameras.length
        ? availableCameras
        : await loadCameras();

      if (!devices || devices.length === 0) {
        setScanState("error");
        setHasCameraPermission(false);
        setLastResult({
          type: "error",
          title: "No camera found",
          message: "No usable camera was detected on this device.",
        });
        return;
      }

      const cameraId = selectedCameraId || devices[0].id;

      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch {
          // ignore
        }
      }

      const scanner = new Html5Qrcode(SCANNER_REGION_ID);
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.333334,
        },
        async (decodedText) => {
          const now = Date.now();

          if (
            decodedText === lastScannedRef.current &&
            now - lastScanTimeRef.current < 2500
          ) {
            return;
          }

          lastScannedRef.current = decodedText;
          lastScanTimeRef.current = now;

          await redeemToken(decodedText);
        },
        () => {
          // scan failures happen continuously; ignore
        },
      );

      if (!isMountedRef.current) return;

      setHasCameraPermission(true);
      setIsScannerRunning(true);
      setScanState("scanning");
      toast.success("Scanner started");
    } catch (error: any) {
      if (!isMountedRef.current) return;

      setHasCameraPermission(false);
      setIsScannerRunning(false);
      setScanState("error");
      setLastResult({
        type: "error",
        title: "Scanner failed to start",
        message:
          error?.message ||
          "Camera permission was denied or the scanner could not initialize.",
      });
      toast.error("Unable to start scanner.");
    }
  }

  async function redeemToken(rawToken: string) {
    const token = rawToken.trim();

    if (!token) return;

    try {
      setScanState("processing");

      const { data } = await api.post<RedeemResponse>("/scanner/redeem", {
        token,
        deviceName,
      });

      const meal = data?.meal || data?.data?.meal;
      const redeemedAt = data?.redeemed_at || data?.data?.redeemed_at;

      setLastResult({
        type: "success",
        title: "Ticket redeemed",
        message: data?.message || "Ticket redeemed successfully.",
        meal,
        redeemedAt,
        scannedCode: token,
      });

      setTodayCount((prev) => prev + 1);
      setManualToken("");
      setScanState("success");
      toast.success(data?.message || "Ticket redeemed successfully.");

      setTimeout(() => {
        if (!isMountedRef.current) return;
        setScanState(isScannerRunning ? "scanning" : "idle");
      }, 1200);
    } catch (error: any) {
      const response = error?.response?.data;
      const meal = response?.meal || response?.data?.meal;
      const redeemedAt = response?.redeemed_at || response?.data?.redeemed_at;

      setLastResult({
        type: "error",
        title: "Ticket not accepted",
        message: response?.message || "Ticket could not be redeemed.",
        meal,
        redeemedAt,
        scannedCode: token,
      });

      setScanState("error");
      toast.error(response?.message || "Ticket could not be redeemed.");

      setTimeout(() => {
        if (!isMountedRef.current) return;
        setScanState(isScannerRunning ? "scanning" : "idle");
      }, 1500);
    }
  }

  async function submitManualToken(e: React.FormEvent) {
    e.preventDefault();

    if (!manualToken.trim()) {
      toast.error("Enter a ticket code first.");
      return;
    }

    await redeemToken(manualToken);
  }

  const statusBadge = useMemo(() => {
    if (scanState === "scanning") return { type: "success", label: "Scanning" };
    if (scanState === "processing")
      return { type: "warning", label: "Processing" };
    if (scanState === "success") return { type: "success", label: "Accepted" };
    if (scanState === "error") return { type: "danger", label: "Attention" };
    if (scanState === "starting") return { type: "warning", label: "Starting" };
    return { type: "neutral", label: "Idle" };
  }, [scanState]);

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Scanner</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Scan printed meal tickets and redeem them in real time.
        </p>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Meal Redemption Desk
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                Fast scan, instant validation, clean audit trail
              </h2>

              <p className="mt-3 text-sm sm:text-base text-slate-200 leading-6">
                Use this page on a phone or tablet at the serving point. Each
                valid ticket is redeemed once, and duplicate or invalid scans
                are blocked.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scanner Status
          </p>
          <div className="mt-3">
            <Badge type={statusBadge.type as any}>{statusBadge.label}</Badge>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Today&apos;s Redemptions
          </p>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {todayCount}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Camera Access
          </p>
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {hasCameraPermission === null
              ? "Not requested yet"
              : hasCameraPermission
                ? "Allowed"
                : "Blocked or unavailable"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Scanner
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Point the camera at the printed QR code.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isScannerRunning ? (
                <Button
                  onClick={startScanner}
                  disabled={
                    scanState === "starting" || scanState === "processing"
                  }
                  className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                >
                  <span className="inline-flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Start Scanner
                  </span>
                </Button>
              ) : (
                <Button
                  layout="outline"
                  onClick={stopScanner}
                  className="rounded-2xl h-11"
                >
                  <span className="inline-flex items-center gap-2">
                    <CameraOff className="w-4 h-4" />
                    Stop Scanner
                  </span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr,220px]">
            <div>
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                <div
                  id={SCANNER_REGION_ID}
                  className="overflow-hidden rounded-2xl min-h-[360px] bg-black"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Scanner Name
                </label>
                <Input
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Main Gate Scanner"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Camera
                </label>
                <Select
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  disabled={isScannerRunning}
                >
                  {availableCameras.length === 0 ? (
                    <option value="">No camera loaded yet</option>
                  ) : (
                    availableCameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label}
                      </option>
                    ))
                  )}
                </Select>

                <div className="mt-3">
                  <Button
                    layout="outline"
                    className="rounded-2xl w-full h-10"
                    onClick={loadCameras}
                    disabled={isScannerRunning}
                  >
                    <span className="inline-flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4" />
                      Refresh Cameras
                    </span>
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Manual Entry
                  </h4>
                </div>

                <form onSubmit={submitManualToken} className="mt-3 space-y-3">
                  <Input
                    className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste or type ticket token"
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

        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Last Scan Result
            </h3>

            {lastResult ? (
              <div
                className={`mt-4 rounded-2xl border p-4 ${
                  lastResult.type === "success"
                    ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                    : lastResult.type === "error"
                      ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30"
                      : "border-gray-200 bg-gray-50 dark:bg-gray-900/10 dark:border-gray-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastResult.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 mt-0.5 text-red-600" />
                  )}

                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {lastResult.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {lastResult.message}
                    </p>

                    {lastResult.meal ? (
                      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Meal:
                        </span>{" "}
                        {lastResult.meal}
                      </p>
                    ) : null}

                    {lastResult.redeemedAt ? (
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Redeemed At:
                        </span>{" "}
                        {lastResult.redeemedAt}
                      </p>
                    ) : null}

                    {lastResult.scannedCode ? (
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-white">
                          Code:
                        </span>{" "}
                        {maskToken(lastResult.scannedCode)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
                <ScanLine className="w-10 h-10 mx-auto text-gray-400" />
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  No ticket scanned yet.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event-Day Checklist
            </h3>

            <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex gap-3">
                <Ticket className="w-4 h-4 mt-0.5 text-gray-500" />
                <p>Use one scanner login per physical serving point.</p>
              </div>

              <div className="flex gap-3">
                <Ticket className="w-4 h-4 mt-0.5 text-gray-500" />
                <p>
                  Keep one spare phone or tablet ready in case a device fails.
                </p>
              </div>

              <div className="flex gap-3">
                <Ticket className="w-4 h-4 mt-0.5 text-gray-500" />
                <p>Use manual entry only when the printed QR is damaged.</p>
              </div>

              <div className="flex gap-3">
                <Ticket className="w-4 h-4 mt-0.5 text-gray-500" />
                <p>
                  Watch for repeated “already redeemed” messages during
                  distribution.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
