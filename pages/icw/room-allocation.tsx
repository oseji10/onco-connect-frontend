"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import { Button, Input, Badge, Select } from "@roketid/windmill-react-ui";
import {
  QrCode,
  Users,
  Search,
  MapPinHouse,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Camera,
  CameraOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { Scanner, useDevices } from "@yudiel/react-qr-scanner";
import api from "../../lib/api";

const EVENT_ID = 1;
const ITEMS_PER_PAGE = 10;

const HOTELS = [
  { key: "royal_choice_inn", label: "Royal Choice Inn" },
  { key: "conference_center_hall", label: "Conference Center Hall" },
];

type AttendeeRow = {
  attendeeId: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  uniqueId?: string;
  phone?: string;
  gender?: string;
  passportUrl?: string | null;
  accommodation?: string | null;
  color?: string | null;
  currentRoomAllocation?: {
    allocationId?: number;
    hotel?: string | null;
    roomNumber?: string | null;
    checkedInAt?: string | null;
    reason?: string | null;
    status?: string | null;
  } | null;
};

type RegisteredAttendeesResponse = {
  success: boolean;
  message: string;
  data?: AttendeeRow[] | { data?: AttendeeRow[] };
  attendees?: AttendeeRow[];
};

type ScanLookupResponse = {
  success: boolean;
  message: string;
  data?: {
    attendee?: AttendeeRow;
    alreadyCheckedIn?: boolean;
    currentAllocation?: {
      allocationId?: number;
      hotel?: string | null;
      roomNumber?: string | null;
      checkedInAt?: string | null;
      status?: string | null;
    } | null;
  };
};

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

type ResultModalData = {
  type: "success" | "error";
  title: string;
  message: string;
};

type ResultModalProps = {
  open: boolean;
  data: ResultModalData | null;
  onClose: () => void;
};

type AssignmentModalProps = {
  open: boolean;
  attendee: AttendeeRow | null;
  hotel: string;
  roomNumber: string;
  submitting: boolean;
  onHotelChange: (value: string) => void;
  onRoomNumberChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function ResultModal({ open, data, onClose }: ResultModalProps) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-6 pb-5 text-center">
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

            <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{data.title}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{data.message}</p>

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

function AssignmentModal({
  open,
  attendee,
  hotel,
  roomNumber,
  submitting,
  onHotelChange,
  onRoomNumberChange,
  onSubmit,
  onClose,
}: AssignmentModalProps) {
  if (!open || !attendee) return null;

  return (
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shrink-0">
                {attendee.passportUrl ? (
                  <img
                    src={attendee.passportUrl}
                    alt={getAttendeeName(attendee)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <Users className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Room</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 break-words">
                  {getAttendeeName(attendee)}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Hotel
              </label>
              <Select
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={hotel}
                onChange={(e) => onHotelChange(e.target.value)}
              >
                <option value="">Select hotel</option>
                {HOTELS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Number
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                placeholder="Enter room number"
                value={roomNumber}
                onChange={(e) => onRoomNumberChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                onClick={onSubmit}
                className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                disabled={submitting}
              >
                {submitting ? "Assigning..." : "Assign Room"}
              </Button>
              <Button
                layout="outline"
                onClick={onClose}
                className="rounded-2xl h-12"
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAttendeeName(attendee: AttendeeRow) {
  return (
    attendee.fullName ||
    attendee.name ||
    `${attendee.firstName || ""} ${attendee.lastName || ""}`.trim() ||
    "Unnamed attendee"
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function getHotelLabel(value?: string | null) {
  if (!value) return "—";
  return HOTELS.find((h) => h.key === value)?.label || value;
}

export default function RegisteredAttendeesRoomPage() {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "processing">("idle");

  const [scannerSubmitting, setScannerSubmitting] = useState(false);
  const [scannerAttendee, setScannerAttendee] = useState<AttendeeRow | null>(null);
  const [scannerHotel, setScannerHotel] = useState("");
  const [scannerRoomNumber, setScannerRoomNumber] = useState("");

  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultModalData, setResultModalData] = useState<ResultModalData | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
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

  // Auto-select rear camera
  useEffect(() => {
    if (availableCameras.length > 0 && !selectedCameraId) {
      const rearCamera = availableCameras.find((cam) =>
        ["back", "rear", "environment"].some((word) => cam.label.toLowerCase().includes(word))
      ) || availableCameras[0];
      setSelectedCameraId(rearCamera.id);
    }
  }, [availableCameras, selectedCameraId]);

  const scannerConstraints = useMemo(() => {
    if (selectedCameraId) return { deviceId: { exact: selectedCameraId } };
    return { facingMode: "environment" };
  }, [selectedCameraId]);

  useEffect(() => {
    fetchRegisteredAttendees();
  }, []);

  async function fetchRegisteredAttendees() {
    try {
      setLoading(true);
      const { data } = await api.get<RegisteredAttendeesResponse>(`/events/${EVENT_ID}/registered-attendees2`);
      const rows = (data?.data as any)?.data || data?.attendees || [];
      setAttendees(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Unable to load registered attendees.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQRScan(detectedCodes: any[]) {
    if (detectedCodes.length === 0) return;
    const qrValue = detectedCodes[0].rawValue.trim();

    try {
      setScanState("processing");
      const { data } = await api.post<ScanLookupResponse>(
        `/events/${EVENT_ID}/room-checkins/scan-lookup`,
        { qrValue }
      );

      const attendee = data?.data?.attendee || null;
      const alreadyCheckedIn = !!data?.data?.alreadyCheckedIn;

      if (!attendee) {
        setResultModalData({
          type: "error",
          title: "Attendee Not Found",
          message: data?.message || "No attendee found for this QR code.",
        });
        setResultModalOpen(true);
        return;
      }

      if (alreadyCheckedIn) {
        setResultModalData({
          type: "error",
          title: "Already Checked In",
          message: `${getAttendeeName(attendee)} is already assigned to ${getHotelLabel(
            data?.data?.currentAllocation?.hotel
          )}, room ${data?.data?.currentAllocation?.roomNumber || "—"}.`,
        });
        setResultModalOpen(true);
        return;
      }

      setScannerAttendee(attendee);
      setScannerHotel("");
      setScannerRoomNumber("");
      setAssignmentModalOpen(true);
      setIsScannerRunning(false); // Stop scanner after successful scan
    } catch (error: any) {
      setResultModalData({
        type: "error",
        title: "Lookup Failed",
        message: error?.response?.data?.message || "Unable to fetch attendee.",
      });
      setResultModalOpen(true);
    } finally {
      setScanState("idle");
    }
  }

  async function handleRoomCheckin() {
    if (!scannerAttendee || !scannerHotel || !scannerRoomNumber.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    try {
      setScannerSubmitting(true);
      const { data } = await api.post<ActionResponse>(
        `/events/${EVENT_ID}/room-checkins/checkin`,
        {
          attendeeId: scannerAttendee.attendeeId,
          hotel: scannerHotel,
          roomNumber: scannerRoomNumber.trim(),
        }
      );

      setAssignmentModalOpen(false);
      setResultModalData({
        type: "success",
        title: "Check-In Successful",
        message: data?.message || "Room assigned successfully.",
      });
      setResultModalOpen(true);

      toast.success(data?.message || "Checked in successfully.");
      await fetchRegisteredAttendees();
    } catch (error: any) {
      setResultModalData({
        type: "error",
        title: "Check-In Failed",
        message: error?.response?.data?.message || "Unable to assign room.",
      });
      setResultModalOpen(true);
    } finally {
      setScannerSubmitting(false);
      setScannerAttendee(null);
    }
  }

  function handleCloseResultModal() {
    setResultModalOpen(false);
    setResultModalData(null);
  }

  function handleCloseAssignmentModal() {
    setAssignmentModalOpen(false);
    setScannerAttendee(null);
    setScannerHotel("");
    setScannerRoomNumber("");
  }

  const checkedInCount = attendees.filter((item) => item.currentRoomAllocation).length;
  const pendingCount = attendees.filter((item) => !item.currentRoomAllocation).length;

  const filteredScannedAttendees = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return attendees.filter((a) => a.currentRoomAllocation);

    return attendees.filter((attendee) => {
      const name = getAttendeeName(attendee).toLowerCase();
      const uniqueId = (attendee.uniqueId || "").toLowerCase();
      const phone = (attendee.phone || "").toLowerCase();
      const hotel = (attendee.currentRoomAllocation?.hotel || attendee.accommodation || "").toLowerCase();
      const room = (attendee.currentRoomAllocation?.roomNumber || "").toLowerCase();

      return (
        name.includes(value) ||
        uniqueId.includes(value) ||
        phone.includes(value) ||
        hotel.includes(value) ||
        room.includes(value)
      );
    });
  }, [search, attendees]);

  const totalPages = Math.max(1, Math.ceil(filteredScannedAttendees.length / ITEMS_PER_PAGE));
  const paginatedScannedAttendees = filteredScannedAttendees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <Layout>
      <ResultModal open={resultModalOpen} data={resultModalData} onClose={handleCloseResultModal} />

      <AssignmentModal
        open={assignmentModalOpen}
        attendee={scannerAttendee}
        hotel={scannerHotel}
        roomNumber={scannerRoomNumber}
        submitting={scannerSubmitting}
        onHotelChange={setScannerHotel}
        onRoomNumberChange={setScannerRoomNumber}
        onSubmit={handleRoomCheckin}
        onClose={handleCloseAssignmentModal}
      />

      <div className="mb-6">
        <PageTitle>Room Check-In Management</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Scan attendee QR code, assign room in the popup, and continue scanning.
        </p>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-4 py-5 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                Supervisor Room Desk
              </div>
              <h2 className="mt-3 text-xl sm:text-3xl font-bold leading-tight">Scan QR and assign rooms fast</h2>
              <p className="mt-2 text-xs sm:text-base text-slate-200 leading-6">
                Mobile is now simplified for faster room desk operations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="mb-5 hidden md:grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Scanner Status</p>
          <div className="mt-3">
            <Badge type={isScannerRunning ? "success" : "neutral"}>
              {isScannerRunning ? "Scanning" : "Idle"}
            </Badge>
          </div>
        </div>
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Checked In</p>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{checkedInCount}</p>
        </div>
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr,0.75fr]">
        {/* Live Scanner - Exact same pattern as Attendance Page */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Scanner</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Scan attendee QR code to assign room.
              </p>
            </div>

            {!isScannerRunning ? (
              <Button
                onClick={() => {
                  setIsScannerRunning(true);
                  setScanState("scanning");
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

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr,260px]">
            <div>
              <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-2 sm:p-3 overflow-hidden">
                {isScannerRunning ? (
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
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Camera</label>
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
            </div>
          </div>
        </div>

        {/* Scanned Attendees List */}
        <div className="mt-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scanned Attendees</h3>
            </div>

            <div className="relative w-full sm:w-80">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <Input
                className="pl-10 h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                placeholder="Search name, phone, ID, hotel, room..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
                Loading attendees...
              </div>
            ) : filteredScannedAttendees.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
                No scanned attendees found.
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-[1000px] w-full">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="py-3 pr-4">Attendee</th>
                        <th className="py-3 pr-4">Unique ID</th>
                        <th className="py-3 pr-4">Phone</th>
                        <th className="py-3 pr-4">Gender</th>
                        <th className="py-3 pr-4">Hotel</th>
                        <th className="py-3 pr-4">Room Number</th>
                        <th className="py-3 pr-4">Checked In At</th>
                        <th className="py-3 pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedScannedAttendees.map((attendee) => {
                        const current = attendee.currentRoomAllocation;
                        return (
                          <tr key={attendee.attendeeId} className="border-b border-gray-100 dark:border-gray-700 align-top">
                            <td className="py-4 pr-4">
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shrink-0">
                                  {attendee.passportUrl ? (
                                    <img src={attendee.passportUrl} alt={getAttendeeName(attendee)} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                                      <Users className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white">{getAttendeeName(attendee)}</p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">ID: {attendee.attendeeId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">{attendee.uniqueId || "—"}</td>
                            <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">{attendee.phone || "—"}</td>
                            <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{attendee.gender || "—"}</td>
                            <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">
                              {attendee?.accommodation || getHotelLabel(current?.hotel)}
                            </td>
                            <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">{current?.roomNumber || "—"}</td>
                            <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">{formatDateTime(current?.checkedInAt)}</td>
                            <td className="py-4 pr-4">
                              <Badge type="success">Checked In</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 lg:hidden">
                  {paginatedScannedAttendees.map((attendee) => {
                    const current = attendee.currentRoomAllocation;
                    return (
                      <div key={attendee.attendeeId} className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shrink-0">
                            {attendee.passportUrl ? (
                              <img src={attendee.passportUrl} alt={getAttendeeName(attendee)} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <Users className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 dark:text-white break-words">{getAttendeeName(attendee)}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">{attendee.uniqueId || "—"}</p>
                            <div className="mt-2">
                              <Badge type="success">Checked In</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Phone</p>
                            <p className="mt-1 text-gray-900 dark:text-white break-words">{attendee.phone || "—"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Gender</p>
                            <p className="mt-1 text-gray-900 dark:text-white capitalize">{attendee.gender || "—"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Hotel</p>
                            <p className="mt-1 text-gray-900 dark:text-white break-words">
                              {attendee?.accommodation || getHotelLabel(current?.hotel)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Room</p>
                            <p className="mt-1 text-gray-900 dark:text-white">{current?.roomNumber || "—"}</p>
                          </div>
                        </div>

                        <div className="mt-3 text-sm">
                          <p className="text-gray-500 dark:text-gray-400">Checked In At</p>
                          <p className="mt-1 text-gray-900 dark:text-white">{formatDateTime(current?.checkedInAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing{" "}
                    <span className="font-semibold">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredScannedAttendees.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold">{filteredScannedAttendees.length}</span>{" "}
                    scanned attendees
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      layout="outline"
                      className="rounded-2xl h-10 px-4"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>

                    <div className="px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page {currentPage} of {totalPages}
                    </div>

                    <Button
                      layout="outline"
                      className="rounded-2xl h-10 px-4"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}