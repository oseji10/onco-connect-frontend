import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
  Input,
  Button,
  Badge,
  Pagination,
} from "@roketid/windmill-react-ui";
import {
  Search,
  UserRound,
  Phone,
  Hash,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  CalendarDays,
  BadgeCheck,
  Loader2,
  MapPin,
  Landmark,
  Image as ImageIcon,
  X,
  Users,
  Camera,
  QrCode,
  ScanLine,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type AssignedPassData = {
  passId: number;
  serialNumber: string;
  status: string;
  assignedAt: string | null;
} | null;

type AttendeeData = {
  attendeeId: number;
  eventId: number;
  uniqueId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  organization: string | null;
  gender: string | null;
  category: string | null;
  age: number | null;
  state: string | null;
  lga: string | null;
  ward: string | null;
  photoUrl: string | null;
  // Online registration markers (set when the participant signed up online)
  isRegistered: boolean;
  registeredAt: string | null;
  // Venue accreditation markers (set at this desk)
  isAccredited: boolean;
  accreditedAt: string | null;
  accreditedBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedPass: AssignedPassData;
};

type SearchResponseData = {
  attendee: Omit<AttendeeData, "assignedPass">;
  assignedPass: AssignedPassData;
};

type AccreditedAttendeeRow = {
  attendeeId: number;
  fullName: string;
  uniqueId: string | null;
  phone: string | null;
  gender: string | null;
  serialNumber: string | null;
  accreditedAt: string | null;
};

type AccreditedAttendeesResponse = {
  attendees: AccreditedAttendeeRow[];
};

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

function formatDisplayDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString().toUpperCase();
}

function toDisplayUpper(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).toUpperCase();
}

/**
 * The QR may encode a bare code (passCode / serialNumber / attendeeId) or a
 * verify URL like https://app.example.com/verify/ABC123. Normalize either to a
 * single lookup token. The backend /search endpoint should resolve whatever it
 * receives (attendeeId, passCode, or serialNumber).
 */
function extractScanValue(raw: string): string {
  const text = (raw || "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length) return segments[segments.length - 1];

    const param =
      url.searchParams.get("code") ||
      url.searchParams.get("pass") ||
      url.searchParams.get("q");
    if (param) return param;

    return text;
  } catch {
    return text;
  }
}

function AppStatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "primary" | "neutral";
}) {
  return <Badge type={tone as any}>{label}</Badge>;
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="group rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/30 dark:to-gray-800/50 p-4 transition-all duration-300 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-2.5 border border-gray-100 dark:border-gray-700 shrink-0 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </p>
          <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white break-words uppercase leading-tight">
            {value || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function AccreditedAttendeeMobileCard({
  item,
}: {
  item: AccreditedAttendeeRow;
}) {
  return (
    <div className="group rounded-2xl border border-gray-100 dark:border-gray-700 p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900/50 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900 dark:text-white uppercase break-words">
            {toDisplayUpper(item.fullName)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 uppercase">
            {toDisplayUpper(item.uniqueId)}
          </p>
        </div>
        <div className="shrink-0">
          <AppStatusPill label="ACCREDITED" tone="success" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <InfoCard
          icon={<Phone className="w-4 h-4" />}
          label="PHONE"
          value={toDisplayUpper(item.phone)}
        />
        <InfoCard
          icon={<UserRound className="w-4 h-4" />}
          label="GENDER"
          value={toDisplayUpper(item.gender)}
        />
        <InfoCard
          icon={<Hash className="w-4 h-4" />}
          label="SERIAL"
          value={toDisplayUpper(item.serialNumber)}
        />
        <InfoCard
          icon={<CalendarDays className="w-4 h-4" />}
          label="ACCREDITED AT"
          value={formatDisplayDateTime(item.accreditedAt)}
        />
      </div>
    </div>
  );
}

/**
 * Camera-based QR scanner. Uses html5-qrcode, dynamically imported so it never
 * runs during SSR. Install once: `npm i html5-qrcode`.
 */
function QrScannerModal({
  isOpen,
  onClose,
  onDecode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDecode: (value: string) => void;
}) {
  const scannerRef = useRef<any>(null);
  const hasScannedRef = useRef(false);
  const onDecodeRef = useRef(onDecode);

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const regionId = "accreditation-qr-reader";

  // Keep the latest callback without restarting the camera on every render.
  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    hasScannedRef.current = false;
    setError(null);
    setStarting(true);

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, { verbose: false } as any);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;
            onDecodeRef.current(decodedText);
          },
          () => {
            /* per-frame decode failures are normal — ignore */
          }
        );

        if (!cancelled) setStarting(false);
      } catch (err: any) {
        if (cancelled) return;
        setStarting(false);
        const denied =
          err?.name === "NotAllowedError" ||
          String(err?.message || "")
            .toLowerCase()
            .includes("permission");
        setError(
          denied
            ? "Camera permission denied. Allow camera access in your browser and try again."
            : "Unable to start the camera. Make sure it isn't being used by another app."
        );
      }
    })();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
        <div className="px-5 sm:px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide mb-2">
              <ScanLine className="w-3.5 h-3.5" />
              Scan Pass
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white uppercase">
              Scan QR Code
            </h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Point the camera at the QR on the attendee&apos;s phone or printed
              pass.
            </p>
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="relative mx-auto w-full max-w-xs aspect-square rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-black">
            {/* html5-qrcode injects the <video> element here */}
            <div id={regionId} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />

            {starting && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/90">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs uppercase font-semibold tracking-wide">
                  Starting camera...
                </p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-gray-900/90 text-white">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          <div className="mt-5">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-12 w-full border-2 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={onClose}
            >
              <span className="font-semibold">Cancel</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccreditationModal({
  isOpen,
  attendee,
  accrediting,
  canAccredit,
  onClose,
  onAccredit,
}: {
  isOpen: boolean;
  attendee: AttendeeData | null;
  accrediting: boolean;
  canAccredit: boolean;
  onClose: () => void;
  onAccredit: () => void;
}) {
  if (!isOpen || !attendee) return null;

  const alreadyAccredited = attendee.isAccredited;
  const hasPass = Boolean(attendee.assignedPass);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full h-[95dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-7xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-slideUp">
        {/* Header */}
        <div className="px-5 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide mb-2">
                <BadgeCheck className="w-3.5 h-3.5" />
                Accreditation
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white uppercase">
                Attendee Accreditation
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Verify the attendee and their pass, then confirm accreditation.
              </p>
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-gradient-to-br from-gray-50/50 to-white dark:from-gray-900/30 dark:to-gray-800/30">
          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
            {/* Left Column - Attendee Details */}
            <div className="space-y-5">
              {/* Photo & Main Info */}
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
                  <div className="relative h-36 w-36 sm:h-44 sm:w-44 overflow-hidden rounded-3xl border-4 border-white dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center shrink-0 shadow-lg">
                    {attendee.photoUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_FILE_URL}${attendee.photoUrl}`}
                        alt={attendee.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 w-full text-center md:text-left">
                    <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                      <AppStatusPill
                        label={
                          attendee.isAccredited
                            ? "ACCREDITED"
                            : "NOT ACCREDITED"
                        }
                        tone={attendee.isAccredited ? "success" : "warning"}
                      />
                      {attendee.gender ? (
                        <AppStatusPill
                          label={toDisplayUpper(attendee.gender)}
                          tone="neutral"
                        />
                      ) : null}
                      {attendee.category ? (
                        <AppStatusPill
                          label={toDisplayUpper(attendee.category)}
                          tone="primary"
                        />
                      ) : null}
                      {hasPass ? (
                        <AppStatusPill label="PASS ISSUED" tone="success" />
                      ) : (
                        <AppStatusPill label="NO PASS" tone="danger" />
                      )}
                    </div>

                    <h4 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words uppercase leading-tight">
                      {attendee.fullName}
                    </h4>

                    <div className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2">
                      <InfoCard
                        icon={<Hash className="w-4 h-4" />}
                        label="UNIQUE ID"
                        value={toDisplayUpper(attendee.uniqueId)}
                      />
                      <InfoCard
                        icon={<Phone className="w-4 h-4" />}
                        label="Phone"
                        value={toDisplayUpper(attendee.phone)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details Grid */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                <InfoCard
                  icon={<UserRound className="w-4 h-4" />}
                  label="Age"
                  value={attendee.age ? toDisplayUpper(attendee.age) : "—"}
                />
                <InfoCard
                  icon={<Landmark className="w-4 h-4" />}
                  label="Organization"
                  value={toDisplayUpper(attendee.organization)}
                />
                <InfoCard
                  icon={<MapPin className="w-4 h-4" />}
                  label="State / LGA"
                  value={toDisplayUpper(
                    [attendee.state, attendee.lga].filter(Boolean).join(" / ")
                  )}
                />
                <InfoCard
                  icon={<MapPin className="w-4 h-4" />}
                  label="Ward"
                  value={toDisplayUpper(attendee.ward)}
                />
                <InfoCard
                  icon={<CalendarDays className="w-4 h-4" />}
                  label="Registered Online"
                  value={formatDisplayDateTime(attendee.registeredAt)}
                />
              </div>

              {/* Pass Section */}
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-4 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  Event Pass
                </h4>

                {attendee.assignedPass ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoCard
                      icon={<Hash className="w-4 h-4" />}
                      label="Serial Number"
                      value={toDisplayUpper(attendee.assignedPass.serialNumber)}
                    />
                    <InfoCard
                      icon={<BadgeCheck className="w-4 h-4" />}
                      label="Status"
                      value={toDisplayUpper(attendee.assignedPass.status)}
                    />
                    <InfoCard
                      icon={<CalendarDays className="w-4 h-4" />}
                      label="Issued At"
                      value={formatDisplayDateTime(
                        attendee.assignedPass.assignedAt
                      )}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                    No pass on record for this attendee.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Accreditation Action */}
            <div className="space-y-5">
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 shadow-lg">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-green-600" />
                  Accredit Attendee
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Confirm the photo and pass match the person at the desk, then
                  accredit them for venue entry.
                </p>

                {/* Accreditation status */}
                <div className="mt-6 flex flex-col items-center justify-center text-center py-4">
                  {alreadyAccredited ? (
                    <CheckCircle2
                      className="h-24 w-24 text-emerald-500 dark:text-emerald-400 animate-scaleIn"
                      strokeWidth={1.75}
                    />
                  ) : (
                    <XCircle
                      className="h-24 w-24 text-amber-500 dark:text-amber-400 animate-scaleIn"
                      strokeWidth={1.75}
                    />
                  )}
                  <p
                    className={`mt-4 text-2xl font-bold uppercase tracking-wide ${
                      alreadyAccredited
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {alreadyAccredited ? "Accredited" : "Not Accredited"}
                  </p>
                </div>

                {alreadyAccredited && (
                  <div className="mt-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 uppercase leading-relaxed font-medium">
                      ✓ THIS ATTENDEE WAS ACCREDITED ON{" "}
                      {formatDisplayDateTime(attendee.accreditedAt)}.
                    </p>
                  </div>
                )}

                {!alreadyAccredited && !hasPass && (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs text-amber-800 dark:text-amber-200 uppercase leading-relaxed font-medium">
                      ⚠️ NO PASS FOUND FOR THIS ATTENDEE. VERIFY THEIR
                      REGISTRATION BEFORE ACCREDITING.
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <Button
                    type="button"
                    disabled={!canAccredit}
                    className="rounded-2xl h-14 w-full bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    onClick={onAccredit}
                  >
                    <span className="inline-flex items-center justify-center gap-3 uppercase font-bold text-base">
                      {accrediting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <BadgeCheck className="w-5 h-5" />
                      )}
                      {accrediting ? "Accrediting..." : "Accredit Attendee"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccreditationDeskPage() {
  const router = useRouter();
  const eventId = 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [accreditedSearch, setAccreditedSearch] = useState("");
  const [accreditedPage, setAccreditedPage] = useState(1);

  const [attendee, setAttendee] = useState<AttendeeData | null>(null);
  const [accreditedAttendees, setAccreditedAttendees] = useState<
    AccreditedAttendeeRow[]
  >([]);

  const [searching, setSearching] = useState(false);
  const [accrediting, setAccrediting] = useState(false);
  const [loadingAccredited, setLoadingAccredited] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const accreditedResultsPerPage = 10;

  const canAccredit = useMemo(() => {
    return Boolean(
      attendee &&
        !attendee.isAccredited &&
        attendee.assignedPass &&
        !accrediting
    );
  }, [attendee, accrediting]);

  const filteredAccreditedAttendees = useMemo(() => {
    const term = accreditedSearch.trim().toLowerCase();

    if (!term) return accreditedAttendees;

    return accreditedAttendees.filter((item) => {
      const fullName = item.fullName?.toLowerCase() || "";
      const phone = item.phone?.toLowerCase() || "";
      const uniqueId = item.uniqueId?.toLowerCase() || "";
      const serialNumber = item.serialNumber?.toLowerCase() || "";

      return (
        fullName.includes(term) ||
        phone.includes(term) ||
        uniqueId.includes(term) ||
        serialNumber.includes(term)
      );
    });
  }, [accreditedAttendees, accreditedSearch]);

  const paginatedAccreditedAttendees = useMemo(() => {
    const start = (accreditedPage - 1) * accreditedResultsPerPage;
    return filteredAccreditedAttendees.slice(
      start,
      start + accreditedResultsPerPage
    );
  }, [filteredAccreditedAttendees, accreditedPage, accreditedResultsPerPage]);

  useEffect(() => {
    if (!router.isReady) return;
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [router.isReady]);

  useEffect(() => {
    fetchAccreditedAttendees();
  }, []);

  useEffect(() => {
    setAccreditedPage(1);
  }, [accreditedSearch]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredAccreditedAttendees.length / accreditedResultsPerPage)
    );

    if (accreditedPage > totalPages) {
      setAccreditedPage(totalPages);
    }
  }, [
    filteredAccreditedAttendees.length,
    accreditedPage,
    accreditedResultsPerPage,
  ]);

  async function fetchAccreditedAttendees() {
    try {
      setLoadingAccredited(true);
      const { data } = await api.get<ApiSuccess<AccreditedAttendeesResponse>>(
        `/accreditation/events/${eventId}/accredited-attendees`
      );
      setAccreditedAttendees(data.data.attendees || []);
    } catch (err: any) {
      setAccreditedAttendees([]);
    } finally {
      setLoadingAccredited(false);
    }
  }

  function resetAll() {
    setSearchQuery("");
    setAttendee(null);
    setIsModalOpen(false);
    setIsScannerOpen(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  function closeModal() {
    setIsModalOpen(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  /**
   * Resolve an attendee by a free-form token: a typed attendeeId, or a value
   * scanned from the QR pass (passCode / serialNumber / verify URL). The
   * backend /search endpoint decides how to match it.
   */
  async function lookupAttendee(rawQuery: string) {
    const q = rawQuery.trim();

    if (!q) {
      toast.error("Enter an Attendee ID or scan a QR pass.");
      return;
    }

    if (!eventId) {
      toast.error("Event ID is missing.");
      return;
    }

    try {
      setSearching(true);
      setAttendee(null);
      setIsModalOpen(false);

      const { data } = await api.post<ApiSuccess<SearchResponseData>>(
        `/accreditation/search`,
        {
          q,
          eventId,
        }
      );

      const nextAttendee: AttendeeData = {
        ...data.data.attendee,
        assignedPass: data.data.assignedPass,
      };

      setAttendee(nextAttendee);
      setIsModalOpen(true);

      toast.success(data.message || "Attendee found.");
    } catch (err: any) {
      setAttendee(null);
      setIsModalOpen(false);
      toast.error(err?.response?.data?.message || "Unable to find attendee.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSearchSubmit(e?: FormEvent) {
    e?.preventDefault();
    await lookupAttendee(searchQuery);
  }

  function handleScanDecoded(decodedText: string) {
    const value = extractScanValue(decodedText);
    setIsScannerOpen(false);
    setSearchQuery(value);
    lookupAttendee(value);
  }

  async function handleAccredit() {
    if (!eventId) {
      toast.error("Event ID is missing.");
      return;
    }

    if (!attendee?.attendeeId) {
      toast.error("Find and confirm an attendee first.");
      return;
    }

    if (attendee.isAccredited) {
      toast.error("This attendee is already accredited.");
      return;
    }

    try {
      setAccrediting(true);

      const { data } = await api.post<
        ApiSuccess<{
          attendee: {
            attendeeId: number;
            fullName: string;
            phone: string | null;
            uniqueId: string | null;
            isAccredited: boolean;
            accreditedAt: string | null;
          };
          pass: {
            passId: number;
            serialNumber: string;
            status: string;
            assignedAt: string | null;
          };
        }>
      >(`/accreditation/events/${eventId}/accreditations`, {
        attendeeId: attendee.attendeeId,
      });

      toast.success(`${data.data.attendee.fullName} accredited successfully!`, {
        duration: 5000,
      });

      await fetchAccreditedAttendees();

      setTimeout(() => {
        setSearchQuery("");
        setAttendee(null);
        setIsModalOpen(false);
        searchInputRef.current?.focus();
      }, 1000);
    } catch (err: any) {
      const validationErrors = err?.response?.data?.errors;
      let message =
        err?.response?.data?.message || "Failed to accredit attendee.";

      if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        if (firstKey && validationErrors[firstKey]?.[0]) {
          message = validationErrors[firstKey][0];
        }
      }

      toast.error(message);
    } finally {
      setAccrediting(false);
    }
  }

  return (
    <Layout>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 640px) {
          .animate-slideUp {
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }
      `}</style>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <PageTitle>Accreditation</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Accredit attendees at the venue by entering their Attendee ID or
              scanning the QR code on their emailed pass.
            </p>
          </div>

          <Button
            layout="outline"
            className="rounded-2xl h-12 w-full sm:w-auto border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            onClick={resetAll}
          >
            <span className="inline-flex items-center justify-center gap-2 w-full font-semibold">
              <RefreshCcw className="w-4 h-4" />
              Reset
            </span>
          </Button>
        </div>
      </div>

      {/* Lookup Section */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 sm:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-green-600" />
            Find Attendee
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Type the Attendee ID, or tap{" "}
            <span className="font-semibold">Scan QR</span> to read the pass with
            your camera.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-5">
          <div>
            <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Attendee ID
            </label>

            <div className="relative">
              <Input
                ref={searchInputRef}
                className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm text-base font-semibold focus:border-green-500 focus:ring-green-500 transition-all duration-200"
                placeholder="e.g. ICW-20260627-0001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Hash className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={searching}
              className="rounded-2xl h-14 w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="inline-flex items-center justify-center gap-3 w-full font-bold text-base uppercase">
                {searching ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {searching ? "Searching..." : "Find Attendee"}
              </span>
            </Button>

            <Button
              type="button"
              layout="outline"
              disabled={searching}
              className="rounded-2xl h-14 w-full sm:w-auto border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
              onClick={() => setIsScannerOpen(true)}
            >
              <span className="inline-flex items-center justify-center gap-3 w-full font-bold text-base uppercase">
                <Camera className="w-5 h-5" />
                Scan QR
              </span>
            </Button>
          </div>
        </form>

        {attendee && (
          <div className="mt-6 rounded-2xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5">
            <p className="text-xs text-green-700 dark:text-green-300 uppercase font-bold mb-2">
              Last Loaded Attendee
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white uppercase break-words">
              {attendee.fullName}
            </p>
            <div className="mt-4">
              <Button
                type="button"
                className="rounded-2xl h-12 w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-md"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="font-bold">Open Accreditation</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Accredited Attendees Section */}
      <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Accredited Attendees
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Browse and search everyone accredited at the venue.
              </p>
            </div>

            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11 w-full sm:w-auto border-2 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={fetchAccreditedAttendees}
            >
              <span className="font-semibold">Refresh</span>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Search Accredited Attendees
              </label>
              <div className="relative">
                <Input
                  className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm text-base font-semibold focus:border-green-500 focus:ring-green-500"
                  placeholder="Search by name, phone, unique ID, or serial"
                  value={accreditedSearch}
                  onChange={(e) => setAccreditedSearch(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                  <Search className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase text-center">
              {loadingAccredited
                ? "Loading..."
                : `${filteredAccreditedAttendees.length} result${
                    filteredAccreditedAttendees.length === 1 ? "" : "s"
                  }`}
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden">
          {loadingAccredited ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">
                Loading accredited attendees...
              </p>
            </div>
          ) : filteredAccreditedAttendees.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 uppercase font-semibold">
                No matching accredited attendees found.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedAccreditedAttendees.map((item) => (
                  <AccreditedAttendeeMobileCard
                    key={item.attendeeId}
                    item={item}
                  />
                ))}
              </div>

              <div className="mt-6">
                <Pagination
                  totalResults={filteredAccreditedAttendees.length}
                  resultsPerPage={accreditedResultsPerPage}
                  onChange={setAccreditedPage}
                  label="Accredited attendees navigation"
                />
              </div>
            </>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 pr-4">Name</th>
                <th className="py-4 pr-4">Unique ID</th>
                <th className="py-4 pr-4">Phone</th>
                <th className="py-4 pr-4">Gender</th>
                <th className="py-4 pr-4">Serial</th>
                <th className="py-4 pr-0">Accredited At</th>
              </tr>
            </thead>
            <tbody>
              {loadingAccredited ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-sm text-gray-500 dark:text-gray-400 uppercase"
                  >
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                    <p className="mt-4 font-semibold">
                      Loading accredited attendees...
                    </p>
                  </td>
                </tr>
              ) : filteredAccreditedAttendees.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-sm text-gray-500 dark:text-gray-400 uppercase"
                  >
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-4 font-semibold">
                      No matching accredited attendees found.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedAccreditedAttendees.map((item) => (
                  <tr
                    key={item.attendeeId}
                    className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    <td className="py-4 pr-4 font-bold uppercase whitespace-nowrap">
                      {toDisplayUpper(item.fullName)}
                    </td>
                    <td className="py-4 pr-4 uppercase whitespace-nowrap font-medium">
                      {toDisplayUpper(item.uniqueId)}
                    </td>
                    <td className="py-4 pr-4 uppercase whitespace-nowrap">
                      {toDisplayUpper(item.phone)}
                    </td>
                    <td className="py-4 pr-4 uppercase whitespace-nowrap">
                      {toDisplayUpper(item.gender)}
                    </td>
                    <td className="py-4 pr-4 uppercase whitespace-nowrap font-mono text-xs">
                      {toDisplayUpper(item.serialNumber)}
                    </td>
                    <td className="py-4 pr-0 uppercase whitespace-nowrap text-xs">
                      {formatDisplayDateTime(item.accreditedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loadingAccredited && filteredAccreditedAttendees.length > 0 && (
            <div className="mt-6">
              <Pagination
                totalResults={filteredAccreditedAttendees.length}
                resultsPerPage={accreditedResultsPerPage}
                onChange={setAccreditedPage}
                label="Accredited attendees navigation"
              />
            </div>
          )}
        </div>
      </div>

      <div className="pb-20"></div>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDecode={handleScanDecoded}
      />

      <AccreditationModal
        isOpen={isModalOpen}
        attendee={attendee}
        accrediting={accrediting}
        canAccredit={canAccredit}
        onClose={closeModal}
        onAccredit={handleAccredit}
      />
    </Layout>
  );
}