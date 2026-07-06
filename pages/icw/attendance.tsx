import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Badge, Select } from "@roketid/windmill-react-ui";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  ScanLine,
  Keyboard,
  CalendarDays,
  UserCheck,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
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

type AttendanceScanResponse = {
  success: boolean;
  message: string;
  data?: {
    status?: string;
    attendanceId?: number;
    attendanceDate?: string;
    markedAt?: string;
    attendee?: {
      attendeeId?: number;
      name?: string;
      uniqueId?: string;
      phone?: string;
      gender?: string;
      passportUrl?: string;
    };
    pass?: {
      passId?: number;
      serialNumber?: string;
      token?: string;
    };
  };
};

type AttendanceSummaryResponse = {
  success: boolean;
  message: string;
  data?: {
    eventId?: number;
    attendanceDate?: string;
    registeredCount?: number;
    presentCount?: number;
    absentCount?: number;
    attendanceLock?: {
      enabled?: boolean;
      isClosed?: boolean;
      closeTime?: string | null;
      closeDateTime?: string | null;
      message?: string | null;
    };
  };
};

type AttendanceRecord = {
  attendanceId: number;
  attendanceDate?: string;
  markedAt?: string;
  attendee?: {
    attendeeId?: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    fullName?: string;
    uniqueId?: string;
    phone?: string;
    gender?: string;
    photoUrl?: string;
    passportUrl?: string;
    color?: {
      colorId?: number;
      colorName?: string;
      hexCode?: string;
    };
    subcl?: {
      subClId?: number;
      state?: string;
      lga?: string;
      ward?: string;
    };
  };
  pass?: {
    passId?: number;
    serialNumber?: string;
    token?: string;
  };
  marker?: {
    name?: string;
  };
};

type AttendanceListResponse = {
  success: boolean;
  message: string;
  data?: {
    data?: AttendanceRecord[];
    current_page?: number;
    last_page?: number;
    total?: number;
    per_page?: number;
  };
};

type ScanResultModalData = {
  type: "success" | "error" | "fraud";
  title: string;
  message: string;
  attendanceDate?: string;
  markedAt?: string;
  scannedCode?: string;
  attendeeName?: string;
  uniqueId?: string;
  phone?: string;
  fraudDetails?: string[];
};

type ResultModalProps = {
  open: boolean;
  data: ScanResultModalData | null;
  onClose: () => void;
};

const EVENT_ID = 1;
const DEFAULT_PER_PAGE = 10;

// ===================== SCREEN DETECTION UTILITIES =====================

interface FraudDetectionResult {
  isFraud: boolean;
  confidence: number;
  reasons: string[];
  metrics: {
    screenPattern?: number;
    brightness?: number;
    contrast?: number;
    sharpness?: number;
  };
}

/**
 * Analyzes an image to detect if it's being scanned from a screen vs physical print
 */
function analyzeImageForScreenDetection(
  imageData: ImageData
): FraudDetectionResult {
  const { data, width, height } = imageData;
  const reasons: string[] = [];
  let fraudScore = 0;
  const metrics: FraudDetectionResult["metrics"] = {};

  // 1. PIXEL PATTERN DETECTION (screens have regular RGB subpixel patterns)
  const pixelPatternScore = detectPixelPattern(data, width, height);
  metrics.screenPattern = pixelPatternScore;
  
  // More strict thresholds - only flag very obvious screen patterns
  if (pixelPatternScore > 0.75) {
    reasons.push("Strong regular pixel pattern detected (digital screen)");
    fraudScore += 40;
  } else if (pixelPatternScore > 0.65) {
    reasons.push("Moderate pixel pattern detected");
    fraudScore += 25;
  }

  // 2. BRIGHTNESS ANALYSIS (screens emit light, paper reflects)
  const brightnessScore = analyzeBrightness(data);
  metrics.brightness = brightnessScore;
  
  // Higher threshold - screens are significantly brighter
  if (brightnessScore > 0.82) {
    reasons.push("Very high brightness (screen emission detected)");
    fraudScore += 35;
  } else if (brightnessScore > 0.72) {
    reasons.push("Elevated brightness levels");
    fraudScore += 20;
  }

  // 3. CONTRAST & SHARPNESS ANALYSIS (screenshots often have different characteristics)
  const contrastScore = analyzeContrast(data);
  const sharpnessScore = analyzeSharpness(data, width);
  metrics.contrast = contrastScore;
  metrics.sharpness = sharpnessScore;

  // Only flag very low contrast (typical of screens)
  if (contrastScore < 0.25) {
    reasons.push("Very low contrast (screen characteristic)");
    fraudScore += 25;
  }

  // Adjust sharpness detection - printed QR codes can vary
  if (sharpnessScore < 0.25) {
    reasons.push("Extremely low sharpness (digital artifact)");
    fraudScore += 20;
  } else if (sharpnessScore > 0.90) {
    reasons.push("Unnaturally high sharpness (digital processing)");
    fraudScore += 15;
  }

  // COMBINED METRICS - Multiple weak signals can indicate fraud
  const suspiciousMetricsCount = [
    pixelPatternScore > 0.6,
    brightnessScore > 0.7,
    contrastScore < 0.3,
    sharpnessScore < 0.3 || sharpnessScore > 0.88
  ].filter(Boolean).length;

  if (suspiciousMetricsCount >= 3) {
    reasons.push("Multiple screen indicators detected simultaneously");
    fraudScore += 20;
  }

  // Require higher threshold - only flag obvious screens
  const isFraud = fraudScore >= 60;
  const confidence = Math.min(fraudScore / 100, 1);

  console.log("=== FRAUD DETECTION SUMMARY ===");
  console.log("Total Fraud Score:", fraudScore);
  console.log("Is Fraud:", isFraud);
  console.log("Confidence:", (confidence * 100).toFixed(1) + "%");
  console.log("Reasons:", reasons);
  console.log("Metrics:", {
    pixelPattern: pixelPatternScore.toFixed(3),
    brightness: brightnessScore.toFixed(3),
    contrast: contrastScore.toFixed(3),
    sharpness: sharpnessScore.toFixed(3),
  });
  console.log("==============================");

  return {
    isFraud,
    confidence,
    reasons,
    metrics,
  };
}

/**
 * Detects regular pixel patterns typical of digital screens
 */
function detectPixelPattern(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  let patternScore = 0;
  const sampleSize = 80; // Reduced sample size
  const checkRadius = 2; // Smaller radius for tighter checking

  for (let i = 0; i < sampleSize; i++) {
    const x = Math.floor(Math.random() * (width - checkRadius * 2)) + checkRadius;
    const y = Math.floor(Math.random() * (height - checkRadius * 2)) + checkRadius;
    const idx = (y * width + x) * 4;

    // Check for repetitive patterns in nearby pixels (screen subpixels)
    let similarityCount = 0;
    let totalChecks = 0;
    
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      for (let dy = -checkRadius; dy <= checkRadius; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nIdx = ((y + dy) * width + (x + dx)) * 4;
        
        const rDiff = Math.abs(data[idx] - data[nIdx]);
        const gDiff = Math.abs(data[idx + 1] - data[nIdx + 1]);
        const bDiff = Math.abs(data[idx + 2] - data[nIdx + 2]);
        
        totalChecks++;
        
        // Screens have VERY uniform pixels - stricter threshold
        if (rDiff + gDiff + bDiff < 20) {
          similarityCount++;
        }
      }
    }

    const similarityRatio = similarityCount / totalChecks;
    
    // Only count as screen pattern if very high uniformity (>80%)
    if (similarityRatio > 0.8) {
      patternScore++;
    }
  }

  return patternScore / sampleSize;
}

/**
 * Analyzes brightness levels (screens are backlit and brighter)
 */
function analyzeBrightness(data: Uint8ClampedArray): number {
  let totalBrightness = 0;
  let highBrightnessCount = 0;
  let extremeBrightnessCount = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    totalBrightness += brightness;
    
    // Count pixels with very high brightness (screen-like)
    if (brightness > 210) {
      highBrightnessCount++;
    }
    
    // Count extremely bright pixels (definitely screen)
    if (brightness > 235) {
      extremeBrightnessCount++;
    }
  }

  const avgBrightness = totalBrightness / pixelCount;
  const highBrightnessRatio = highBrightnessCount / pixelCount;
  const extremeBrightnessRatio = extremeBrightnessCount / pixelCount;

  // Weight extreme brightness more heavily
  return (avgBrightness / 255) * 0.4 + highBrightnessRatio * 0.3 + extremeBrightnessRatio * 0.3;
}

/**
 * Analyzes contrast (screenshots often have compressed contrast)
 */
function analyzeContrast(data: Uint8ClampedArray): number {
  let min = 255;
  let max = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;

    if (brightness < min) min = brightness;
    if (brightness > max) max = brightness;
  }

  return (max - min) / 255;
}

/**
 * Analyzes sharpness using edge detection
 */
function analyzeSharpness(data: Uint8ClampedArray, width: number): number {
  let edgeStrength = 0;
  const sampleSize = 500;

  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(Math.random() * (data.length / 4 - width - 1)) * 4;

    const curr = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    const next = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
    const below = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;

    edgeStrength += Math.abs(curr - next) + Math.abs(curr - below);
  }

  return Math.min(edgeStrength / sampleSize / 255, 1);
}

/**
 * Captures a frame from the video element and analyzes it
 */
function captureAndAnalyzeFrame(videoElement: HTMLVideoElement): FraudDetectionResult | null {
  try {
    // Check if video is ready
    if (!videoElement || videoElement.readyState < 2) {
      console.warn("Video not ready for analysis");
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    
    console.log("Analyzing frame:", canvas.width, "x", canvas.height);
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      console.error("Failed to get canvas context");
      return null;
    }

    ctx.drawImage(videoElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const result = analyzeImageForScreenDetection(imageData);
    console.log("Frame analysis complete:", result);
    
    return result;
  } catch (error) {
    console.error("Error analyzing frame:", error);
    return null;
  }
}

// ===================== END SCREEN DETECTION UTILITIES =====================

function ResultModal({ open, data, onClose }: ResultModalProps) {
  if (!open || !data) return null;

  const isFraud = data.type === "fraud";

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
                  : isFraud
                  ? "bg-orange-100 dark:bg-orange-900/20"
                  : "bg-red-100 dark:bg-red-900/20"
              }`}
            >
              {data.type === "success" ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : isFraud ? (
                <ShieldAlert className="h-8 w-8 text-orange-600" />
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

            {isFraud && data.fraudDetails && data.fraudDetails.length > 0 && (
              <div className="mt-4 rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 p-3 text-left">
                <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 mb-2">
                  Detection Details:
                </p>
                <ul className="space-y-1">
                  {data.fraudDetails.map((detail, idx) => (
                    <li key={idx} className="text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 text-left space-y-2">
              {data.attendeeName && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">Attendee:</span>{" "}
                  {data.attendeeName}
                </p>
              )}
              {data.uniqueId && (
                <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                  <span className="font-semibold text-gray-900 dark:text-white">Unique ID:</span>{" "}
                  {data.uniqueId}
                </p>
              )}
              {data.phone && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">Phone:</span>{" "}
                  {data.phone}
                </p>
              )}
              {data.attendanceDate && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">Attendance Date:</span>{" "}
                  {formatDisplayDate(data.attendanceDate)}
                </p>
              )}
              {data.markedAt && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">Marked At:</span>{" "}
                  {formatDisplayDateTime(data.markedAt)}
                </p>
              )}
              {data.scannedCode && (
                <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                  <span className="font-semibold text-gray-900 dark:text-white">Pass Code:</span>{" "}
                  {maskToken(data.scannedCode)}
                </p>
              )}
            </div>

            <Button
              className={`mt-6 w-full rounded-2xl h-12 ${
                data.type === "success"
                  ? "bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                  : isFraud
                  ? "bg-orange-600 border-orange-600 hover:bg-orange-700 hover:border-orange-700"
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

function formatDisplayDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function getTodayDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAttendeeName(record: AttendanceRecord) {
  const name =
    record.attendee?.name ||
    record.attendee?.fullName ||
    "Unknown attendee";

  return name.toUpperCase();
}

function getAttendeeLga(record: AttendanceRecord) {
  const lga = record.attendee?.subcl?.lga;
  return lga ? lga.toUpperCase() : "Unknown LGA";
}

function PassportAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 rounded-xl"
      : size === "lg"
        ? "h-16 w-16 rounded-2xl"
        : "h-12 w-12 rounded-2xl";

  return photoUrl ? (
    <img
      src={photoUrl || "/default-avatar.png"}
      alt={name}
      className={`${sizeClass} object-cover border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shrink-0`}
    />
  ) : (
    <div
      className={`${sizeClass} flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 shrink-0`}
    >
      <Users className="w-5 h-5" />
    </div>
  );
}

export default function AttendanceScannerPage() {
  const isMountedRef = useRef(true);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [deviceName, setDeviceName] = useState("Main Attendance Scanner");
  const [manualToken, setManualToken] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(getTodayDateValue());
  const [fraudDetectionEnabled, setFraudDetectionEnabled] = useState(true);

  const [summary, setSummary] = useState({
    registeredCount: 0,
    presentCount: 0,
    absentCount: 0,
  });

  const [attendanceLock, setAttendanceLock] = useState({
    enabled: false,
    isClosed: false,
    closeTime: "",
    closeDateTime: "",
    message: "",
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultModalData, setResultModalData] = useState<ScanResultModalData | null>(null);

  // Get available cameras
  const devices = useDevices();

  const availableCameras = useMemo(() => {
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((device) => ({
        id: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 6)}`,
      }));
  }, [devices]);

  // Auto-select rear camera
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
    void loadSummary();
    void loadAttendanceRecords(1);

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    void loadSummary();
    void loadAttendanceRecords(1);
  }, [attendanceDate]);

  useEffect(() => {
    if (attendanceLock.isClosed && isScannerRunning) {
      setIsScannerRunning(false);
    }
  }, [attendanceLock.isClosed]);

  // Capture video element for fraud detection
  useEffect(() => {
    if (isScannerRunning) {
      const timer = setInterval(() => {
        const video = document.querySelector("video");
        if (video && video !== videoRef.current) {
          videoRef.current = video;
          console.log("Video element captured for fraud detection");
        }
      }, 500);

      return () => clearInterval(timer);
    } else {
      videoRef.current = null;
    }
  }, [isScannerRunning]);

  const scannerConstraints = useMemo<MediaTrackConstraints>(() => {
    if (selectedCameraId) {
      return { deviceId: { exact: selectedCameraId } };
    }
    return { facingMode: "environment" };
  }, [selectedCameraId]);

  async function loadSummary() {
    try {
      const { data } = await api.get<AttendanceSummaryResponse>(
        `/events/${EVENT_ID}/attendance/summary`,
        { params: { date: attendanceDate } }
      );

      setSummary({
        registeredCount: data?.data?.registeredCount || 0,
        presentCount: data?.data?.presentCount || 0,
        absentCount: data?.data?.absentCount || 0,
      });

      setAttendanceLock({
        enabled: !!data?.data?.attendanceLock?.enabled,
        isClosed: !!data?.data?.attendanceLock?.isClosed,
        closeTime: data?.data?.attendanceLock?.closeTime || "",
        closeDateTime: data?.data?.attendanceLock?.closeDateTime || "",
        message: data?.data?.attendanceLock?.message || "",
      });
    } catch {
      // ignore error
    }
  }

  async function loadAttendanceRecords(page = 1) {
    try {
      setLoadingRecords(true);
      const { data } = await api.get<AttendanceListResponse>(
        `/events/${EVENT_ID}/attendance`,
        {
          params: {
            date: attendanceDate,
            page,
            per_page: perPage,
          },
        }
      );

      const payload = data?.data || {};
      setAttendanceRecords(payload.data || []);
      setCurrentPage(payload.current_page || page);
      setLastPage(payload.last_page || 1);
      setTotalRecords(payload.total || 0);
      setPerPage(payload.per_page || DEFAULT_PER_PAGE);
    } catch {
      toast.error("Unable to load attendance records.");
    } finally {
      setLoadingRecords(false);
    }
  }

  async function markAttendance(rawToken: string, fraudCheck?: FraudDetectionResult) {
    const token = rawToken.trim();
    if (!token) return;

    // Check for fraud BEFORE proceeding
    if (fraudDetectionEnabled && fraudCheck?.isFraud) {
      setResultModalData({
        type: "fraud",
        title: "Fraudulent Scan Detected",
        message: "This appears to be a scan of a screen/photo rather than a physical printed pass. Please use the actual printed pass.",
        attendanceDate,
        scannedCode: token,
        fraudDetails: fraudCheck.reasons,
      });
      setResultModalOpen(true);
      setScanState("error");
      toast.error("Screen scan detected! Use the physical printed pass.");
      return;
    }

    if (attendanceLock.isClosed) {
      setResultModalData({
        type: "error",
        title: "Attendance Closed",
        message: attendanceLock.message || "Attendance taking has been closed for today.",
        attendanceDate,
        scannedCode: token,
      });
      setResultModalOpen(true);
      return;
    }

    try {
      setScanState("processing");

      const { data } = await api.post<AttendanceScanResponse>(
        `/events/${EVENT_ID}/attendance/scan`,
        {
          token,
          deviceName,
          scanSource: "barcode",
          attendanceDate,
        }
      );

      const resultData = data?.data || {};

      setResultModalData({
        type: "success",
        title: "Attendance Marked",
        message: data?.message || "Attendance marked successfully.",
        attendanceDate: resultData.attendanceDate,
        markedAt: resultData.markedAt,
        scannedCode: token,
        attendeeName: resultData.attendee?.name,
        uniqueId: resultData.attendee?.uniqueId,
        phone: resultData.attendee?.phone,
      });

      setManualToken("");
      setScanState("success");
      setResultModalOpen(true);

      await loadSummary();
      await loadAttendanceRecords(currentPage);

      toast.success(data?.message || "Attendance marked successfully.");
    } catch (error: any) {
      const response = error?.response?.data;
      const resultData = response?.data || {};
      const isClosed = resultData?.status === "attendance_closed";

      if (isClosed) {
        setAttendanceLock((prev) => ({
          ...prev,
          enabled: true,
          isClosed: true,
          closeTime: resultData?.closeTime || prev.closeTime,
          closeDateTime: resultData?.closeDateTime || prev.closeDateTime,
          message: response?.message || "Attendance taking has been closed for today.",
        }));
      }

      setResultModalData({
        type: "error",
        title: isClosed ? "Attendance Closed" : "Attendance Not Marked",
        message: response?.message || "Attendance could not be marked.",
        attendanceDate: resultData.attendanceDate,
        markedAt: resultData.markedAt,
        scannedCode: token,
        attendeeName: resultData.attendee?.name,
        uniqueId: resultData.attendee?.uniqueId,
        phone: resultData.attendee?.phone,
      });

      setScanState("error");
      setResultModalOpen(true);
      toast.error(response?.message || "Attendance could not be marked.");
    }
  }

  function handleCloseResultModal() {
    setResultModalOpen(false);
    setResultModalData(null);
    setScanState(isScannerRunning ? "scanning" : "idle");
  }

  async function submitManualToken(e: React.FormEvent) {
    e.preventDefault();
    if (attendanceLock.isClosed) {
      toast.error(attendanceLock.message || "Attendance taking has been closed for today.");
      return;
    }
    if (!manualToken.trim()) {
      toast.error("Enter a pass code first.");
      return;
    }
    // Manual entry bypasses fraud detection
    await markAttendance(manualToken);
  }

  const statusBadge = useMemo(() => {
    if (scanState === "scanning") return { type: "success", label: "Scanning" };
    if (scanState === "processing") return { type: "warning", label: "Processing" };
    if (scanState === "success") return { type: "success", label: "Marked" };
    if (scanState === "error") return { type: "danger", label: "Attention" };
    return { type: "neutral", label: "Idle" };
  }, [scanState]);

  const paginationMetaText =
    totalRecords > 0
      ? `Showing ${(currentPage - 1) * perPage + 1} to ${Math.min(
          currentPage * perPage,
          totalRecords
        )} of ${totalRecords} records`
      : "No records";

  return (
    <Layout>
      <ResultModal
        open={resultModalOpen}
        data={resultModalData}
        onClose={handleCloseResultModal}
      />

      <div className="mb-6">
        <PageTitle>Attendance Scanner</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Scan attendee passes each morning and mark attendance automatically for the selected date.
        </p>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-4 py-5 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                Daily Attendance
              </div>
              <h2 className="mt-3 text-xl sm:text-3xl font-bold leading-tight">
                One scan, one attendance record per day
              </h2>
              <p className="mt-2 text-xs sm:text-base text-slate-200 leading-6">
                Supervisors can scan each attendee pass once daily. Tap OK after each result to continue scanning.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Detection Status Banner */}
      {fraudDetectionEnabled && (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300 px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Screen Detection Active</p>
              <p className="mt-1 text-xs">
                System will reject scans from phone screens, monitors, or photos. Only physical printed passes are accepted.
              </p>
            </div>
          </div>
        </div>
      )}

      {attendanceLock.enabled && (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 ${
            attendanceLock.isClosed
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-300"
          }`}
        >
          <p className="text-sm font-semibold">
            {attendanceLock.isClosed ? "Attendance Closed" : "Attendance Open"}
          </p>
          <p className="mt-1 text-sm">
            {attendanceLock.message ||
              (attendanceLock.closeTime ? `Attendance closes at ${attendanceLock.closeTime}.` : "")}
          </p>
        </div>
      )}

      {/* ====================== MOBILE LAYOUT ====================== */}
      <div className="sm:hidden space-y-4">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Attendance Date
            </label>
            <Input
              type="date"
              className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {!isScannerRunning ? (
              <Button
                onClick={() => {
                  if (attendanceLock.isClosed) {
                    toast.error(attendanceLock.message || "Attendance is closed");
                    return;
                  }
                  setIsScannerRunning(true);
                  setScanState("scanning");
                  setHasCameraPermission(true);
                  toast.success("Scanner started");
                }}
                disabled={attendanceLock.isClosed || scanState === "processing"}
                className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full"
              >
                <span className="inline-flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {attendanceLock.isClosed ? "Attendance Closed" : "Start Scanner"}
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

                    // Perform fraud detection
                    let fraudResult: FraudDetectionResult | null = null;
                    if (fraudDetectionEnabled && videoRef.current) {
                      fraudResult = captureAndAnalyzeFrame(videoRef.current);
                      if (fraudResult) {
                        console.log("Fraud detection result:", fraudResult);
                        console.log("Is Fraud:", fraudResult.isFraud);
                        console.log("Confidence:", fraudResult.confidence);
                        console.log("Reasons:", fraudResult.reasons);
                        console.log("Metrics:", fraudResult.metrics);
                      }
                    }
                    
                    markAttendance(decodedText, fraudResult || undefined);
                  }}
                  onError={(error) => {
                    console.error(error);
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

        {/* Today's Register - Mobile */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Today&apos;s Register
            </h4>
            <Button layout="outline" className="rounded-2xl h-10" onClick={() => loadAttendanceRecords(currentPage)}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {loadingRecords ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading attendance...</p>
            ) : attendanceRecords.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No attendance records yet.</p>
            ) : (
              attendanceRecords.map((record) => {
                const attendeeName = getAttendeeName(record);
                return (
                  <div
                    key={record.attendanceId}
                    className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <PassportAvatar
                        name={attendeeName}
                        photoUrl={record.attendee?.photoUrl}
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white break-words">
                          {attendeeName}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 break-all">
                          {record.attendee?.uniqueId || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatDisplayDateTime(record.markedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              layout="outline"
              className="rounded-2xl h-10 px-4"
              disabled={currentPage <= 1 || loadingRecords}
              onClick={() => loadAttendanceRecords(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {currentPage} of {lastPage}
            </span>
            <Button
              layout="outline"
              className="rounded-2xl h-10 px-4"
              disabled={currentPage >= lastPage || loadingRecords}
              onClick={() => loadAttendanceRecords(currentPage + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
            {paginationMetaText}
          </p>
        </div>
      </div>

      {/* ====================== DESKTOP LAYOUT ====================== */}
      <div className="hidden sm:block space-y-5">
        {/* Scanner Section */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Scanner</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Point the camera at the printed attendee pass.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isScannerRunning ? (
                <Button
                  onClick={() => {
                    if (attendanceLock.isClosed) {
                      toast.error(attendanceLock.message || "Attendance is closed");
                      return;
                    }
                    setIsScannerRunning(true);
                    setScanState("scanning");
                    setHasCameraPermission(true);
                    toast.success("Scanner started");
                  }}
                  disabled={attendanceLock.isClosed || scanState === "processing"}
                  className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto"
                >
                  <span className="inline-flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {attendanceLock.isClosed ? "Attendance Closed" : "Start Scanner"}
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

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr,380px]">
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

                      // Perform fraud detection
                      let fraudResult: FraudDetectionResult | null = null;
                      if (fraudDetectionEnabled && videoRef.current) {
                        fraudResult = captureAndAnalyzeFrame(videoRef.current);
                        if (fraudResult) {
                          console.log("Fraud detection result:", fraudResult);
                          console.log("Is Fraud:", fraudResult.isFraud);
                          console.log("Confidence:", fraudResult.confidence);
                          console.log("Reasons:", fraudResult.reasons);
                          console.log("Metrics:", fraudResult.metrics);
                        }
                      }
                      
                      markAttendance(decodedText, fraudResult || undefined);
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

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attendance Date
                </label>
                <Input
                  type="date"
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
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

              {/* <div className="rounded-2xl border border-blue-100 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Fraud Detection
                    </h4>
                  </div>
                  <button
                    onClick={() => setFraudDetectionEnabled(!fraudDetectionEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      fraudDetectionEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        fraudDetectionEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {fraudDetectionEnabled
                    ? "Blocking scans from screens and photos"
                    : "Screen detection disabled (not recommended)"}
                </p>
              </div> */}

              {/* <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Manual Entry</h4>
                </div>
                <form onSubmit={submitManualToken} className="space-y-3">
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
                    Mark Attendance Manually
                  </Button>
                </form>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Manual entry bypasses fraud detection
                </p>
              </div> */}
            </div>
          </div>
        </div>

        {/* Attendance Guide */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Guide</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex gap-3">
              <CalendarDays className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
              <p>Attendance is marked once per attendee per selected day.</p>
            </div>
            <div className="flex gap-3">
              <UserCheck className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
              <p>If a pass is scanned again on the same day, it will show already marked.</p>
            </div>
            <div className="flex gap-3">
              <ScanLine className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
              <p>Use manual entry only when the printed QR or barcode is damaged.</p>
            </div>
            <div className="flex gap-3">
              <Shield className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
              <p>Fraud detection blocks scans from phone screens, monitors, and photos.</p>
            </div>
          </div>
        </div>

        {/* Wide Attendance Register Table */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Register</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-4 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Current Device</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {deviceName || "Unnamed scanner"}
                </p>
              </div>
              <Button layout="outline" className="rounded-2xl h-10" onClick={() => loadAttendanceRecords(currentPage)}>
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="max-h-[600px] overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Passport</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Attendee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Unique ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">LGA</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Color</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sub-CL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Time Marked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {loadingRecords ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                        No attendance records found for this date.
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((record) => {
                      const attendeeName = getAttendeeName(record);
                      const attendeeLga = getAttendeeLga(record);
                      const colorName = record.attendee?.color?.colorName || "—";
                      const colorHex = record.attendee?.color?.hexCode || "#6B7280";
                      const subClName = record.attendee?.subcl ? 
                        `${record.attendee.subcl.state || ""} - ${record.attendee.subcl.lga || ""}`.trim() || "—" : "—";
                      
                      return (
                        <tr key={record.attendanceId}>
                          <td className="px-4 py-3">
                            <PassportAvatar
                              name={attendeeName}
                              photoUrl={record.attendee?.photoUrl}
                              size="md"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{attendeeName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {record.attendee?.uniqueId || "—"}
                          </td>

                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {attendeeLga}
                          </td>

                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-600"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span className="text-sm text-gray-900 dark:text-white font-medium">
                                {colorName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {subClName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {formatDisplayDateTime(record.markedAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{paginationMetaText}</p>
            <div className="flex items-center gap-2">
              <Button
                layout="outline"
                className="rounded-2xl h-10 px-4"
                disabled={currentPage <= 1 || loadingRecords}
                onClick={() => loadAttendanceRecords(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Page {currentPage} of {lastPage}
              </span>
              <Button
                layout="outline"
                className="rounded-2xl h-10 px-4"
                disabled={currentPage >= lastPage || loadingRecords}
                onClick={() => loadAttendanceRecords(currentPage + 1)}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}