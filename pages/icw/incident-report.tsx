"use client";

import React, { useEffect, useMemo, useState } from "react";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import {
  Button,
  Input,
  Label,
  Select,
  Textarea,
  Badge,
} from "@roketid/windmill-react-ui";
import {
  AlertTriangle,
  ClipboardList,
  Eye,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";

const EVENT_ID = 1;

const CATEGORY_OPTIONS = [
  "medical",
  "security",
  "misconduct",
  "room",
  "lost_found",
  "access",
  "attendance",
  "facility",
  "other",
];

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "resolved",
  "closed",
  "escalated",
];

type Incident = {
  incidentId: number;
  incidentCode: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  location?: string | null;
  occurredAt?: string | null;
  reportedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  isAnonymous?: boolean;
  reporter?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
  assignee?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;
  attendee?: {
    attendeeId: number;
    fullName: string;
    uniqueId?: string | null;
    phone?: string | null;
  } | null;
  room?: {
    roomId: number;
    name?: string | null;
    code?: string | null;
    building?: string | null;
  } | null;
  updates?: IncidentUpdate[];
};

type IncidentUpdate = {
  updateId: number;
  oldStatus?: string | null;
  newStatus?: string | null;
  note: string;
  createdAt?: string | null;
  updatedBy?: {
    id: number;
    name: string;
  } | null;
};

type IncidentListResponse = {
  success: boolean;
  message: string;
  data: Incident[];
};

type IncidentDetailsResponse = {
  success: boolean;
  message: string;
  data: Incident;
};

type AttendeeOption = {
  attendeeId: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  uniqueId?: string;
};

type RoomOption = {
  roomId: number;
  name?: string;
  code?: string;
  building?: string;
};

type AttendeesResponse = {
  success: boolean;
  data?: AttendeeOption[];
  attendees?: AttendeeOption[];
};

type RoomsResponse = {
  success: boolean;
  data?: RoomOption[];
};

type SimpleModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function SimpleModal({
  isOpen,
  title,
  onClose,
  children,
  footer,
}: SimpleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-3xl bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ×
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto max-h-[68vh]">
          {children}
        </div>

        {footer ? (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function severityBadgeType(severity: string) {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "primary";
    default:
      return "neutral";
  }
}

function statusBadgeType(status: string) {
  switch (status) {
    case "resolved":
    case "closed":
      return "success";
    case "in_progress":
      return "warning";
    case "escalated":
      return "danger";
    default:
      return "primary";
  }
}

function titleCase(value?: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [attendees, setAttendees] = useState<AttendeeOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [attendeePreview, setAttendeePreview] = useState<any>(null);
  const [attendeeLoading, setAttendeeLoading] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  async function lookupAttendee(id: string) {
    if (!id) {
      setAttendeePreview(null);
      return;
    }

    try {
      setAttendeeLoading(true);

      const { data } = await api.get(`/events/${EVENT_ID}/attendees/${id}`);

      setAttendeePreview(data?.data || null);
    } catch {
      setAttendeePreview(null);
    } finally {
      setAttendeeLoading(false);
    }
  }

  const [reportForm, setReportForm] = useState({
    title: "",
    description: "",
    category: "other",
    severity: "low",
    attendeeId: "",
    roomId: "",
    location: "",
    occurredAt: "",
  });

  const [statusForm, setStatusForm] = useState({
    status: "open",
    note: "",
    resolutionNote: "",
  });

  useEffect(() => {
    void fetchIncidents();
    void fetchAttendees();
    void fetchRooms();
  }, []);

  useEffect(() => {
    void fetchIncidents();
  }, [statusFilter, severityFilter, categoryFilter]);

  async function fetchIncidents() {
    try {
      setLoading(true);

      const { data } = await api.get<IncidentListResponse>(
        `/events/${EVENT_ID}/incidents`,
        {
          params: {
            search: search || undefined,
            status: statusFilter || undefined,
            severity: severityFilter || undefined,
            category: categoryFilter || undefined,
          },
        },
      );

      setIncidents(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to load incidents.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttendees() {
    try {
      const { data } = await api.get<AttendeesResponse>(
        `/events/${EVENT_ID}/registered-attendees`,
      );

      const rows =
        (data?.data as any)?.data ||
        (Array.isArray(data?.data) ? data?.data : undefined) ||
        data?.attendees ||
        [];

      setAttendees(Array.isArray(rows) ? rows : []);
    } catch {
      setAttendees([]);
    }
  }

  async function fetchRooms() {
    try {
      const { data } = await api.get<RoomsResponse>(
        `/events/${EVENT_ID}/rooms`,
      );
      setRooms(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setRooms([]);
    }
  }

  async function openDetailsModal(incidentId: number) {
    try {
      setDetailsLoading(true);
      setDetailsModalOpen(true);

      const { data } = await api.get<IncidentDetailsResponse>(
        `/events/${EVENT_ID}/incidents/${incidentId}`,
      );

      setSelectedIncident(data?.data || null);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to load incident details.",
      );
      setDetailsModalOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  }

  function openReportModal() {
    setReportForm({
      title: "",
      description: "",
      category: "other",
      severity: "low",
      attendeeId: "",
      roomId: "",
      location: "",
      occurredAt: "",
    });
    setReportModalOpen(true);
  }

  function openStatusModal(incident: Incident) {
    setSelectedIncident(incident);
    setStatusForm({
      status: incident.status || "open",
      note: "",
      resolutionNote: incident.resolutionNote || "",
    });
    setStatusModalOpen(true);
  }

  async function submitIncident() {
    if (!reportForm.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    if (!reportForm.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: reportForm.title.trim(),
        description: reportForm.description.trim(),
        category: reportForm.category,
        severity: reportForm.severity,
        attendeeId: reportForm.attendeeId
          ? Number(reportForm.attendeeId)
          : null,
        roomId: reportForm.roomId ? Number(reportForm.roomId) : null,
        location: reportForm.location.trim() || null,
        occurredAt: reportForm.occurredAt || null,
      };

      const { data } = await api.post(`/events/${EVENT_ID}/incidents`, payload);

      toast.success(data?.message || "Incident reported successfully.");
      setReportModalOpen(false);
      await fetchIncidents();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to report incident.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStatusUpdate() {
    if (!selectedIncident) return;

    if (!statusForm.note.trim()) {
      toast.error("Update note is required.");
      return;
    }

    try {
      setSubmitting(true);

      if (statusForm.status === "resolved") {
        if (!statusForm.resolutionNote.trim()) {
          toast.error("Resolution note is required for resolved incidents.");
          return;
        }

        const { data } = await api.patch(
          `/events/${EVENT_ID}/incidents/${selectedIncident.incidentId}/resolve`,
          {
            resolutionNote: statusForm.resolutionNote.trim(),
            note: statusForm.note.trim(),
          },
        );

        toast.success(data?.message || "Incident resolved successfully.");
      } else {
        const { data } = await api.patch(
          `/events/${EVENT_ID}/incidents/${selectedIncident.incidentId}/status`,
          {
            status: statusForm.status,
            note: statusForm.note.trim(),
          },
        );

        toast.success(data?.message || "Incident status updated successfully.");
      }

      setStatusModalOpen(false);
      await fetchIncidents();

      if (detailsModalOpen && selectedIncident) {
        await openDetailsModal(selectedIncident.incidentId);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Unable to update incident.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return incidents;

    return incidents.filter((incident) => {
      const values = [
        incident.incidentCode,
        incident.title,
        incident.description,
        incident.category,
        incident.severity,
        incident.status,
        incident.location,
        incident.attendee?.fullName,
        incident.attendee?.uniqueId,
        incident.room?.name,
        incident.room?.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(term);
    });
  }, [incidents, search]);

  const stats = useMemo(() => {
    return {
      total: incidents.length,
      open: incidents.filter((i) => i.status === "open").length,
      inProgress: incidents.filter((i) => i.status === "in_progress").length,
      resolved: incidents.filter((i) => i.status === "resolved").length,
      critical: incidents.filter((i) => i.severity === "critical").length,
    };
  }, [incidents]);

  {
    attendeeLoading && (
      <p className="text-xs text-gray-500 mt-1">Checking attendee...</p>
    );
  }

  useEffect(() => {
    const value = reportForm.attendeeId.trim();

    if (!value) {
      setAttendeePreview(null);
      setAttendeeLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void lookupAttendee(value);
    }, 500);

    return () => clearTimeout(timer);
  }, [reportForm.attendeeId]);

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Incident Reporting</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Report, track, and resolve event incidents from one place.
        </p>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-4 py-5 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                Incident Command Desk
              </div>
              <h2 className="mt-3 text-xl sm:text-3xl font-bold leading-tight">
                Log fast. Escalate clearly. Resolve with audit trail.
              </h2>
              <p className="mt-2 text-xs sm:text-base text-slate-200 leading-6">
                Capture incident details, monitor severity, and keep a full
                timeline of updates for every case.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard
          title="Total"
          value={stats.total}
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <StatCard
          title="Open"
          value={stats.open}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          icon={<Clock3 className="w-5 h-5" />}
        />
        <StatCard
          title="Resolved"
          value={stats.resolved}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          title="Critical"
          value={stats.critical}
          icon={<ShieldAlert className="w-5 h-5" />}
        />
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Incident Dashboard
            </h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <Input
                className="pl-10 h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              className="h-11 rounded-2xl border-gray-200 dark:border-gray-600 w-full sm:w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>

            <Select
              className="h-11 rounded-2xl border-gray-200 dark:border-gray-600 w-full sm:w-44"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All Severities</option>
              {SEVERITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>

            <Select
              className="h-11 rounded-2xl border-gray-200 dark:border-gray-600 w-full sm:w-44"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>

            <Button
              layout="outline"
              className="rounded-2xl h-11 w-full sm:w-auto"
              onClick={fetchIncidents}
            >
              <span className="inline-flex items-center justify-center gap-2 w-full">
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </span>
            </Button>

            <Button
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 w-full sm:w-auto"
              onClick={openReportModal}
            >
              <span className="inline-flex items-center justify-center gap-2 w-full">
                <Plus className="w-4 h-4" />
                Report Incident
              </span>
            </Button>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
              Loading incidents...
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-sm text-gray-500 dark:text-gray-400">
              No incidents found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {filteredIncidents.map((incident) => (
                  <div
                    key={incident.incidentId}
                    className="rounded-3xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white break-words">
                          {incident.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {incident.incidentCode}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        <Badge
                          type={severityBadgeType(incident.severity) as any}
                        >
                          {titleCase(incident.severity)}
                        </Badge>
                        <Badge type={statusBadgeType(incident.status) as any}>
                          {titleCase(incident.status)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoCell
                        label="Category"
                        value={titleCase(incident.category)}
                      />
                      <InfoCell
                        label="Reported At"
                        value={formatDateTime(incident.reportedAt)}
                      />
                      <InfoCell
                        label="Attendee"
                        value={incident.attendee?.fullName || "—"}
                      />
                      <InfoCell
                        label="Room"
                        value={
                          incident.room
                            ? `${incident.room.name || "—"} ${incident.room.code ? `(${incident.room.code})` : ""}`
                            : "—"
                        }
                      />
                    </div>

                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                      {incident.description}
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        layout="outline"
                        className="rounded-2xl h-11 w-full"
                        onClick={() => openDetailsModal(incident.incidentId)}
                      >
                        <span className="inline-flex items-center justify-center gap-2 w-full">
                          <Eye className="w-4 h-4" />
                          View Details
                        </span>
                      </Button>

                      <Button
                        className="rounded-2xl h-11 bg-amber-600 border-amber-600 hover:bg-amber-700 hover:border-amber-700 w-full"
                        onClick={() => openStatusModal(incident)}
                      >
                        Update Status
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden xl:block overflow-x-auto">
                <table className="min-w-[1200px] w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-3 pr-4">Code</th>
                      <th className="py-3 pr-4">Title</th>
                      <th className="py-3 pr-4">Category</th>
                      <th className="py-3 pr-4">Severity</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Attendee</th>
                      <th className="py-3 pr-4">Room</th>
                      <th className="py-3 pr-4">Reported At</th>
                      <th className="py-3 pr-0">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr
                        key={incident.incidentId}
                        className="border-b border-gray-100 dark:border-gray-700 align-top"
                      >
                        <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">
                          {incident.incidentCode}
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {incident.title}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {incident.description}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">
                          {titleCase(incident.category)}
                        </td>
                        <td className="py-4 pr-4">
                          <Badge
                            type={severityBadgeType(incident.severity) as any}
                          >
                            {titleCase(incident.severity)}
                          </Badge>
                        </td>
                        <td className="py-4 pr-4">
                          <Badge type={statusBadgeType(incident.status) as any}>
                            {titleCase(incident.status)}
                          </Badge>
                        </td>
                        <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">
                          {incident.attendee?.fullName || "—"}
                        </td>
                        <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">
                          {incident.room
                            ? `${incident.room.name || "—"} ${incident.room.code ? `(${incident.room.code})` : ""}`
                            : "—"}
                        </td>
                        <td className="py-4 pr-4 text-sm text-gray-700 dark:text-gray-300">
                          {formatDateTime(incident.reportedAt)}
                        </td>
                        <td className="py-4 pr-0">
                          <div className="flex gap-2">
                            <Button
                              layout="outline"
                              className="rounded-2xl h-10"
                              onClick={() =>
                                openDetailsModal(incident.incidentId)
                              }
                            >
                              View
                            </Button>
                            <Button
                              className="rounded-2xl h-10 bg-amber-600 border-amber-600 hover:bg-amber-700 hover:border-amber-700"
                              onClick={() => openStatusModal(incident)}
                            >
                              Update
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <SimpleModal
        isOpen={reportModalOpen}
        onClose={() => !submitting && setReportModalOpen(false)}
        title="Report Incident"
        footer={
          <div className="w-full flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              layout="outline"
              className="rounded-2xl h-11 w-full sm:w-auto"
              onClick={() => setReportModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="rounded-2xl h-11 w-full sm:w-auto bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              onClick={submitIncident}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Incident"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title</Label>
            <Input
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.title}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Incident title"
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.category}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, category: e.target.value }))
              }
            >
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Severity</Label>
            <Select
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.severity}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, severity: e.target.value }))
              }
            >
              {SEVERITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Attendee ID (Optional)</Label>
            <Input
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.attendeeId}
              onChange={(e) => {
                const value = e.target.value;
                setReportForm((p) => ({ ...p, attendeeId: value }));

                if (!value.trim()) {
                  setAttendeePreview(null);
                }
              }}
              placeholder="Enter attendee ID (e.g. WM-000001)"
              // onBlur={() => lookupAttendee(reportForm.attendeeId)}
            />

            {attendeeLoading ? (
              <p className="mt-2 text-xs text-gray-500">Checking attendee...</p>
            ) : attendeePreview ? (
              <div className="mt-2 rounded-2xl border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-800">
                  {attendeePreview.fullName ||
                    `${attendeePreview.firstName || ""} ${attendeePreview.lastName || ""}`.trim() ||
                    `Attendee ${attendeePreview.attendeeId}`}
                </p>
                <p className="mt-1 text-xs text-green-700">
                  ID: {attendeePreview.attendeeId}
                  {attendeePreview.uniqueId
                    ? ` • ${attendeePreview.uniqueId}`
                    : ""}
                </p>
              </div>
            ) : reportForm.attendeeId.trim() ? (
              <p className="mt-2 text-xs text-red-500">
                No attendee found for this ID.
              </p>
            ) : null}
          </div>

          <div>
            <Label>Room (Optional)</Label>
            <Select
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.roomId}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, roomId: e.target.value }))
              }
            >
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.roomId} value={room.roomId}>
                  {`${room.name || "Room"}${room.code ? ` (${room.code})` : ""}${room.building ? ` - ${room.building}` : ""}`}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Location</Label>
            <Input
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.location}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, location: e.target.value }))
              }
              placeholder="Incident location"
            />
          </div>

          <div>
            <Label>Occurred At</Label>
            <Input
              type="datetime-local"
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.occurredAt}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, occurredAt: e.target.value }))
              }
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={5}
              className="mt-2 rounded-2xl border-gray-200 dark:border-gray-600"
              value={reportForm.description}
              onChange={(e) =>
                setReportForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Describe what happened"
            />
          </div>
        </div>
      </SimpleModal>

      <SimpleModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Incident Details"
        footer={
          selectedIncident ? (
            <div className="w-full flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                layout="outline"
                className="rounded-2xl h-11 w-full sm:w-auto"
                onClick={() => setDetailsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                className="rounded-2xl h-11 w-full sm:w-auto bg-amber-600 border-amber-600 hover:bg-amber-700 hover:border-amber-700"
                onClick={() => {
                  setDetailsModalOpen(false);
                  openStatusModal(selectedIncident);
                }}
              >
                Update Status
              </Button>
            </div>
          ) : null
        }
      >
        {detailsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading details...
          </p>
        ) : !selectedIncident ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No incident selected.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedIncident.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedIncident.incidentCode}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    type={severityBadgeType(selectedIncident.severity) as any}
                  >
                    {titleCase(selectedIncident.severity)}
                  </Badge>
                  <Badge type={statusBadgeType(selectedIncident.status) as any}>
                    {titleCase(selectedIncident.status)}
                  </Badge>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {selectedIncident.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard
                label="Category"
                value={titleCase(selectedIncident.category)}
              />
              <InfoCard
                label="Location"
                value={selectedIncident.location || "—"}
              />
              <InfoCard
                label="Reported At"
                value={formatDateTime(selectedIncident.reportedAt)}
              />
              <InfoCard
                label="Occurred At"
                value={formatDateTime(selectedIncident.occurredAt)}
              />
              <InfoCard
                label="Attendee"
                value={selectedIncident.attendee?.fullName || "—"}
              />
              <InfoCard
                label="Room"
                value={
                  selectedIncident.room
                    ? `${selectedIncident.room.name || "—"}${selectedIncident.room.code ? ` (${selectedIncident.room.code})` : ""}`
                    : "—"
                }
              />
              <InfoCard
                label="Reporter"
                value={selectedIncident.reporter?.name || "—"}
              />
              <InfoCard
                label="Assignee"
                value={selectedIncident.assignee?.name || "—"}
              />
            </div>

            {selectedIncident.resolutionNote ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Resolution Note
                </p>
                <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300 whitespace-pre-line">
                  {selectedIncident.resolutionNote}
                </p>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Incident Timeline
              </p>

              <div className="mt-3 space-y-3">
                {selectedIncident.updates?.length ? (
                  selectedIncident.updates.map((update) => (
                    <div
                      key={update.updateId}
                      className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          {update.oldStatus || update.newStatus ? (
                            <Badge type="neutral">
                              {titleCase(update.oldStatus || "none")} →{" "}
                              {titleCase(
                                update.newStatus || selectedIncident.status,
                              )}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(update.createdAt)}
                        </p>
                      </div>

                      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {update.note}
                      </p>

                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        By: {update.updatedBy?.name || "—"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                    No updates yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SimpleModal>

      <SimpleModal
        isOpen={statusModalOpen}
        onClose={() => !submitting && setStatusModalOpen(false)}
        title="Update Incident Status"
        footer={
          <div className="w-full flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              layout="outline"
              className="rounded-2xl h-11 w-full sm:w-auto"
              onClick={() => setStatusModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="rounded-2xl h-11 w-full sm:w-auto bg-amber-600 border-amber-600 hover:bg-amber-700 hover:border-amber-700"
              onClick={submitStatusUpdate}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Update"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedIncident ? (
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4">
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedIncident.title}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedIncident.incidentCode}
              </p>
            </div>
          ) : null}

          <div>
            <Label>New Status</Label>
            <Select
              className="mt-2 h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={statusForm.status}
              onChange={(e) =>
                setStatusForm((p) => ({ ...p, status: e.target.value }))
              }
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {titleCase(item)}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Update Note</Label>
            <Textarea
              rows={4}
              className="mt-2 rounded-2xl border-gray-200 dark:border-gray-600"
              value={statusForm.note}
              onChange={(e) =>
                setStatusForm((p) => ({ ...p, note: e.target.value }))
              }
              placeholder="Describe what changed"
            />
          </div>

          {statusForm.status === "resolved" ? (
            <div>
              <Label>Resolution Note</Label>
              <Textarea
                rows={4}
                className="mt-2 rounded-2xl border-gray-200 dark:border-gray-600"
                value={statusForm.resolutionNote}
                onChange={(e) =>
                  setStatusForm((p) => ({
                    ...p,
                    resolutionNote: e.target.value,
                  }))
                }
                placeholder="Describe how the incident was resolved"
              />
            </div>
          ) : null}
        </div>
      </SimpleModal>
    </Layout>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {title}
        </p>
        <div className="text-gray-500">{icon}</div>
      </div>
      <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-sm text-gray-900 dark:text-white break-words">
        {value}
      </p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900 dark:text-white break-words">
        {value}
      </p>
    </div>
  );
}
