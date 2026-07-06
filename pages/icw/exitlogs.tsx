import React, { useState, useEffect, useMemo } from "react";
import { Button, Badge } from "@roketid/windmill-react-ui";
import {
  QrCode,
  LogOut,
  LogIn,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  User,
  CameraOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Attendee = {
  id: number;
  attendeeId: string;
  fullName: string;
  photo: string | null;
  phoneNumber: string | null;
  state: string | null;
  lga: string | null;
};

type CurrentExit = {
  exitLogId: number;
  reason: string;
  exitTime: string;
  timeAway: string;
};

type ParticipantOut = {
  exitLogId: number;
  attendee: Attendee;
  reason: string;
  additionalNotes: string | null;
  exitTime: string;
  minutesAway: number;
  timeAway: string;
  recordedBy: string;
};

type Statistics = {
  currentlyOut: number;
  totalExits: number;
  totalReturned: number;
  averageDurationMinutes: number;
};

// Format time away safely (never negative)
function formatTimeAway(minutes: number): string {
  // Ensure minutes is never negative
  const safeMinutes = Math.max(0, minutes);
  const absMinutes = Math.round(safeMinutes);

  if (absMinutes < 1) return "Just now";
  if (absMinutes < 60) return `${absMinutes} min`;

  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}


// Calculate time away in minutes (always positive)
function calculateMinutesAway(exitTime: string): number {
  const exit = new Date(exitTime);
  const now = new Date();
  const diffMs = now.getTime() - exit.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  return Math.max(0, diffMinutes); // Never return negative
}

// Convert name to UPPERCASE
function toUpperCase(str: string | null | undefined): string {
  if (!str) return "";
  return str.toUpperCase().trim();
}

function toSentenceCase(str: string | null | undefined): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function ExitTrackingPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAttendee, setScannedAttendee] = useState<Attendee | null>(null);
  const [currentStatus, setCurrentStatus] = useState<"in" | "out" | null>(null);
  const [currentExit, setCurrentExit] = useState<CurrentExit | null>(null);
  const [participantsOut, setParticipantsOut] = useState<ParticipantOut[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);

  const [reason, setReason] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [selectedCameraId, setSelectedCameraId] = useState("");

  const devices = useDevices();

  const availableCameras = useMemo(() => {
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((device) => ({
        id: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 6)}`,
      }));
  }, [devices]);

  useEffect(() => {
    if (availableCameras.length > 0 && !selectedCameraId) {
      const rearCamera = availableCameras.find((cam) =>
        ["back", "rear", "environment"].some((word) =>
          cam.label.toLowerCase().includes(word)
        )
      ) || availableCameras[0];
      setSelectedCameraId(rearCamera.id);
    }
  }, [availableCameras, selectedCameraId]);

  const scannerConstraints = useMemo(() => {
    if (selectedCameraId) return { deviceId: { exact: selectedCameraId } };
    return { facingMode: "environment" };
  }, [selectedCameraId]);

  useEffect(() => {
    loadCurrentlyOut();
    loadStatistics();
    const interval = setInterval(() => {
      loadCurrentlyOut();
      loadStatistics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadCurrentlyOut() {
    try {
      const { data } = await api.get("/exits/currently-out");
      setParticipantsOut(data.participants || []);
    } catch (error: any) {
      console.error("Failed to load currently out participants");
    }
  }

  async function loadStatistics() {
    try {
      const { data } = await api.get("/exits/statistics");
      setStatistics(data.statistics);
    } catch (error: any) {
      console.error("Failed to load statistics");
    }
  }

  async function handleQRScan(detectedCodes: any[]) {
    if (detectedCodes.length === 0) return;
    const qrData = detectedCodes[0].rawValue;

    try {
      setLoading(true);
      const { data } = await api.post("/exits/scan", { qrData });

      setScannedAttendee(data.attendee);
      setCurrentStatus(data.currentStatus);
      setCurrentExit(data.currentExit);
      setShowScanner(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to scan QR code");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordExit() {
    if (!scannedAttendee) return;
    if (!reason.trim()) {
      toast.error("Please enter a reason for leaving");
      return;
    }

    try {
      setLoading(true);
      await api.post("/exits/record-exit", {
        attendeeId: scannedAttendee.attendeeId,
        reason: reason.trim(),
        additionalNotes: additionalNotes.trim() || null,
      });

      toast.success("Exit recorded successfully");
      resetForm();
      loadCurrentlyOut();
      loadStatistics();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to record exit");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordReturn() {
    if (!currentExit) return;

    try {
      setLoading(true);
      await api.post("/exits/record-return", {
        exitLogId: currentExit.exitLogId,
      });

      toast.success("Return recorded successfully");
      resetForm();
      loadCurrentlyOut();
      loadStatistics();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to record return");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setScannedAttendee(null);
    setCurrentStatus(null);
    setCurrentExit(null);
    setReason("");
    setAdditionalNotes("");
  }

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <PageTitle>Exit tracking</PageTitle>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Track participants leaving and returning to the venue
        </p>

        {/* Hero Banner */}
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-emerald-700 shadow-xl">
          <div className="px-4 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 sm:px-3 sm:py-1 text-[8px] sm:text-xs font-semibold tracking-wide uppercase">
                Exit Management
              </div>
              <h2 className="mt-2 sm:mt-3 text-lg sm:text-3xl font-bold leading-tight">
                Monitor participant movements
              </h2>
              <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-200 leading-5 sm:leading-6">
                Scan QR codes to log exits and returns, track who's currently away
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards - RESTORED */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Currently out</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statistics.currentlyOut}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total exits</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalExits}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Returned</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statistics.totalReturned}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg. duration</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {Math.round(statistics.averageDurationMinutes || 0)} min
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Section */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Scan QR code
        </h3>

        {!scannedAttendee ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <QrCode className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Click the button below to scan a participant's QR code
            </p>
            <Button
              onClick={() => setShowScanner(true)}
              className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
            >
              <span className="inline-flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Scan QR code
              </span>
            </Button>
          </div>
        ) : (
          <div>
            {/* Scanned Participant - NAME IN CAPITAL LETTERS */}
            <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-800 p-4 mb-4">
              <div className="flex items-center gap-4">
                {scannedAttendee.photo ? (
                  <img
                    src={`${scannedAttendee.photo}`}
                    alt={scannedAttendee.fullName}
                    className="w-16 h-16 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        scannedAttendee.fullName
                      )}&background=16a34a&color=fff&size=200`;
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
                    <User className="w-8 h-8 text-green-700 dark:text-green-300" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {toUpperCase(scannedAttendee.fullName)}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ID: {scannedAttendee.attendeeId}
                  </p>
                  {scannedAttendee.phoneNumber && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {scannedAttendee.phoneNumber}
                    </p>
                  )}
                </div>
                <div>
                  {currentStatus === "out" ? (
                    <Badge type="danger">Currently out</Badge>
                  ) : (
                    <Badge type="success">On premises</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Exit / Return Form */}
            {currentStatus === "in" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for leaving <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Medical emergency, Family issue, Personal errand"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional notes (optional)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Any additional information..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleRecordExit}
                    disabled={loading || !reason.trim()}
                    className="flex-1 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      {loading ? "Recording..." : "Record exit"}
                    </span>
                  </Button>
                  <Button layout="outline" onClick={resetForm} className="rounded-2xl">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : currentExit ? (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
            Participant is currently out
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Reason: {toSentenceCase(currentExit.reason)}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Left at: {new Date(currentExit.exitTime).toLocaleString()}
          </p>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mt-2">
            Time away: {formatTimeAway(calculateMinutesAway(currentExit.exitTime))}
          </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleRecordReturn}
                    disabled={loading}
                    className="flex-1 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      {loading ? "Recording..." : "Record return"}
                    </span>
                  </Button>
                  <Button layout="outline" onClick={resetForm} className="rounded-2xl">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Currently Out List - Names in CAPITAL LETTERS */}
      {participantsOut.length > 0 && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Currently out ({participantsOut.length})
          </h3>

          <div className="space-y-3">
            {participantsOut.map((participant) => (
              <div
                key={participant.exitLogId}
                className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  {participant.attendee.photo ? (
                    <img
                      src={`${participant.attendee.photo}`}
                      alt={participant.attendee.fullName}
                      className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          participant.attendee.fullName
                        )}&background=16a34a&color=fff&size=128`;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {toUpperCase(participant.attendee.fullName)}
                      </h4>
                      <Badge type="danger">Out</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ID: {participant.attendee.attendeeId}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      <span className="font-medium">Color:</span>{" "}
                      {toSentenceCase(participant.attendee.color)}
                    </p>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      <span className="font-medium">SubCL:</span>{" "}
                      {toSentenceCase(participant.attendee.subclName)}
                    </p>

                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      <span className="font-medium">Reason:</span>{" "}
                      {toSentenceCase(participant.reason)}
                    </p>
                    {participant.additionalNotes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {toSentenceCase(participant.additionalNotes)}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {formatTimeAway(participant.minutesAway)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Left: {new Date(participant.exitTime).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improved Scanner Modal - Better for Desktop */}
      {showScanner && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between p-4 text-white border-b border-white/20">
            <h3 className="text-lg font-semibold">Scan Participant QR Code</h3>
            <Button
              layout="outline"
              onClick={() => setShowScanner(false)}
              className="text-white border-white/30 hover:bg-white/10"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Close Scanner
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">   {/* Limited width on desktop */}
              <div className="bg-black rounded-3xl overflow-hidden shadow-2xl">
                <Scanner
                  onScan={handleQRScan}
                  onError={(error) => {
                    console.error("Scanner error:", error);
                    if (String(error).toLowerCase().includes("permission")) {
                      toast.error("Camera permission denied");
                    }
                  }}
                  constraints={scannerConstraints}
                  formats={["qr_code"]}
                  styles={{
                    container: { width: "100%", height: "420px" },
                    video: { 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover", 
                      background: "#000" 
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="p-6 text-center text-white/70 text-sm pb-8">
            Point the camera steadily at the participant's QR code
          </div>
        </div>
      )}
    </Layout>
  );
}