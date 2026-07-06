import React, {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Input,
  Button,
  Badge,
  Pagination,
  Select,
} from "@roketid/windmill-react-ui";
import {
  Search,
  CalendarDays,
  MapPin,
  Plus,
  Eye,
  Ticket,
  UtensilsCrossed,
  FileText,
  Pencil,
  RefreshCcw,
  Layers3,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type EventStatus = "draft" | "active" | "closed" | "cancelled";
type MealSessionStatus = "draft" | "active" | "closed" | "cancelled";

type EventItem = {
  eventId: number;
  title: string;
  slug: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  location?: string | null;
  status: EventStatus;
  passCount: number;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  passes_count?: number;
  meal_sessions_count?: number;
};

type MealSession = {
  mealSessionId: number;
  eventId: number;
  title: string;
  slug: string;
  description?: string | null;
  mealDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  status: MealSessionStatus;
  sortOrder: number;
  redeemedCount: number;
  redemptions_count?: number;
};

type EventPass = {
  passId: number;
  eventId: number;
  passCode: string;
  serialNumber?: string | null;
  qrUrl?: string | null;
  qrPath?: string | null;
  status: string;
  createdAt?: string;
};

type EventsResponse = {
  success: boolean;
  data?: {
    data?: any[];
    total?: number;
    current_page?: number;
    last_page?: number;
  };
};

type AppModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

function AppModal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}: AppModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="absolute inset-0 overflow-y-auto p-3 sm:p-6">
        <div className="min-h-full flex items-center justify-center">
          <div
            className={`relative w-full ${maxWidth} rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white pr-4">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full w-9 h-9 inline-flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[85vh] overflow-y-auto px-5 sm:px-6 py-5">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatEventStatus(status?: string | null) {
  if (!status) return "—";
  if (status === "draft") return "Draft";
  if (status === "active") return "Active";
  if (status === "closed") return "Closed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function getStatusBadge(status?: string | null) {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  if (status === "closed") return "primary";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function formatDisplayDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDisplayTime(value?: string) {
  if (!value) return "—";
  const [hour, minute] = value.split(":");
  if (!hour || !minute) return value;

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EventsIndexPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedSession, setSelectedSession] = useState<MealSession | null>(
    null,
  );

  const [mealSessions, setMealSessions] = useState<MealSession[]>([]);
  const [passes, setPasses] = useState<EventPass[]>([]);

  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isEditSessionOpen, setIsEditSessionOpen] = useState(false);
  const [isGeneratePassesOpen, setIsGeneratePassesOpen] = useState(false);
  const [isViewPassesOpen, setIsViewPassesOpen] = useState(false);

  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [editingSession, setEditingSession] = useState(false);
  const [generatingPasses, setGeneratingPasses] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingPasses, setLoadingPasses] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    status: "draft" as EventStatus,
  });

  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    mealDate: "",
    startTime: "",
    endTime: "",
    location: "",
    status: "draft" as MealSessionStatus,
    sortOrder: 0,
  });

  const [generatePassForm, setGeneratePassForm] = useState({
    count: 100,
  });

  const resultsPerPage = 10;

  async function fetchEvents() {
    try {
      setLoading(true);

      const { data } = await api.get<EventsResponse>("/events", {
        params: {
          page,
          search: search || undefined,
          status: status || undefined,
        },
      });

      const rawEvents = data?.data?.data || [];

      const mappedEvents: EventItem[] = rawEvents.map((event: any) => ({
        eventId: event.eventId ?? event.id,
        title: event.title ?? "",
        slug: event.slug ?? "",
        description: event.description ?? "",
        startDate: event.startDate ?? "",
        endDate: event.endDate ?? "",
        location: event.location ?? "",
        status: event.status ?? "draft",
        passCount: event.passCount ?? event.passes_count ?? 0,
        createdBy: event.createdBy,
        createdAt: event.createdAt ?? event.created_at,
        updatedAt: event.updatedAt ?? event.updated_at,
        passes_count: event.passes_count,
        meal_sessions_count: event.meal_sessions_count,
      }));

      setEvents(mappedEvents);
      setTotalResults(data?.data?.total || mappedEvents.length);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
  }, [page, search, status]);

  async function loadMealSessions(eventId: number) {
    try {
      setLoadingSessions(true);

      const { data } = await api.get(`/events/${eventId}/meal-sessions`);

      const raw = data?.data?.data || [];

      const mapped: MealSession[] = raw.map((session: any) => ({
        mealSessionId: session.mealSessionId ?? session.id,
        eventId: session.eventId,
        title: session.title ?? "",
        slug: session.slug ?? "",
        description: session.description ?? "",
        mealDate: session.mealDate ?? "",
        startTime: session.startTime ?? "",
        endTime: session.endTime ?? "",
        location: session.location ?? "",
        status: session.status ?? "draft",
        sortOrder: session.sortOrder ?? 0,
        redeemedCount: session.redeemedCount ?? 0,
        redemptions_count: session.redemptions_count ?? 0,
      }));

      setMealSessions(mapped);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Unable to load meal sessions.",
      );
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadPasses(eventId: number) {
    try {
      setLoadingPasses(true);

      const { data } = await api.get(`/events/${eventId}/passes`);

      const raw = data?.data?.data || [];

      const mapped: EventPass[] = raw.map((pass: any) => ({
        passId: pass.passId ?? pass.id,
        eventId: pass.eventId,
        passCode: pass.passCode ?? "",
        serialNumber: pass.serialNumber ?? null,
        qrUrl: pass.qrUrl ?? null,
        qrPath: pass.qrPath ?? null,
        status: pass.status ?? "active",
        createdAt: pass.createdAt ?? pass.created_at,
      }));

      setPasses(mapped);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load passes.");
    } finally {
      setLoadingPasses(false);
    }
  }

  function handleSearchSubmit(e?: FormEvent) {
    e?.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setStatus("");
  }

  async function handleCreateEvent(e: FormEvent) {
    e.preventDefault();

    if (!eventForm.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    if (!eventForm.startDate || !eventForm.endDate) {
      toast.error("Start date and end date are required");
      return;
    }

    if (eventForm.endDate < eventForm.startDate) {
      toast.error("End date must be after or equal to start date");
      return;
    }

    try {
      setCreatingEvent(true);

      await api.post("/events", eventForm);

      toast.success("Event created successfully");
      setIsCreateEventOpen(false);
      setEventForm({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        location: "",
        status: "draft",
      });

      fetchEvents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  }

  function openEditEventModal(event: EventItem) {
    setSelectedEvent(event);
    setEventForm({
      title: event.title || "",
      description: event.description || "",
      startDate: event.startDate || "",
      endDate: event.endDate || "",
      location: event.location || "",
      status: event.status || "draft",
    });
    setIsEditEventOpen(true);
  }

  async function handleUpdateEvent(e: FormEvent) {
    e.preventDefault();

    if (!selectedEvent?.eventId) {
      toast.error("No event selected");
      return;
    }

    if (!eventForm.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    if (!eventForm.startDate || !eventForm.endDate) {
      toast.error("Start date and end date are required");
      return;
    }

    if (eventForm.endDate < eventForm.startDate) {
      toast.error("End date must be after or equal to start date");
      return;
    }

    try {
      setEditingEvent(true);

      await api.put(`/events/${selectedEvent.eventId}`, eventForm);

      toast.success("Event updated successfully");
      setIsEditEventOpen(false);

      await fetchEvents();

      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              ...eventForm,
            }
          : prev,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update event");
    } finally {
      setEditingEvent(false);
    }
  }

  async function updateEventStatus(eventId: number, nextStatus: EventStatus) {
    try {
      await api.patch(`/events/${eventId}/status`, {
        status: nextStatus,
      });

      await fetchEvents();

      setSelectedEvent((prev) =>
        prev?.eventId === eventId
          ? {
              ...prev,
              status: nextStatus,
            }
          : prev,
      );

      toast.success("Event status updated successfully");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to update event status",
      );
    }
  }

  async function handleCreateMealSession(e: FormEvent) {
    e.preventDefault();

    if (!selectedEvent?.eventId) {
      toast.error("No event selected");
      return;
    }

    if (!sessionForm.title.trim()) {
      toast.error("Meal session title is required");
      return;
    }

    if (
      !sessionForm.mealDate ||
      !sessionForm.startTime ||
      !sessionForm.endTime
    ) {
      toast.error("Meal date and times are required");
      return;
    }

    if (sessionForm.endTime <= sessionForm.startTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setCreatingSession(true);

      await api.post(
        `/events/${selectedEvent.eventId}/meal-sessions`,
        sessionForm,
      );

      toast.success("Meal session created successfully");
      setIsCreateSessionOpen(false);
      setSessionForm({
        title: "",
        description: "",
        mealDate: "",
        startTime: "",
        endTime: "",
        location: "",
        status: "draft",
        sortOrder: 0,
      });

      await loadMealSessions(selectedEvent.eventId);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to create meal session",
      );
    } finally {
      setCreatingSession(false);
    }
  }

  function openEditSessionModal(session: MealSession) {
    setSelectedSession(session);
    setSessionForm({
      title: session.title || "",
      description: session.description || "",
      mealDate: session.mealDate || "",
      startTime: session.startTime || "",
      endTime: session.endTime || "",
      location: session.location || "",
      status: session.status || "draft",
      sortOrder: session.sortOrder ?? 0,
    });
    setIsEditSessionOpen(true);
  }

  async function handleUpdateMealSession(e: FormEvent) {
    e.preventDefault();

    if (!selectedSession?.mealSessionId) {
      toast.error("No meal session selected");
      return;
    }

    if (!sessionForm.title.trim()) {
      toast.error("Meal session title is required");
      return;
    }

    if (
      !sessionForm.mealDate ||
      !sessionForm.startTime ||
      !sessionForm.endTime
    ) {
      toast.error("Meal date and times are required");
      return;
    }

    if (sessionForm.endTime <= sessionForm.startTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setEditingSession(true);

      await api.put(
        `/meal-sessions/${selectedSession.mealSessionId}`,
        sessionForm,
      );

      toast.success("Meal session updated successfully");
      setIsEditSessionOpen(false);

      if (selectedEvent?.eventId) {
        await loadMealSessions(selectedEvent.eventId);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to update meal session",
      );
    } finally {
      setEditingSession(false);
    }
  }

  async function handleGeneratePasses(e: FormEvent) {
    e.preventDefault();

    if (!selectedEvent?.eventId) {
      toast.error("No event selected");
      return;
    }

    if (!generatePassForm.count || generatePassForm.count < 1) {
      toast.error("Pass count must be at least 1");
      return;
    }

    try {
      setGeneratingPasses(true);

      await api.post(`/events/${selectedEvent.eventId}/generate-passes`, {
        count: generatePassForm.count,
      });

      toast.success("Event passes generated successfully");
      setIsGeneratePassesOpen(false);

      await loadPasses(selectedEvent.eventId);
      await fetchEvents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate passes");
    } finally {
      setGeneratingPasses(false);
    }
  }

  async function openEventView(event: EventItem) {
    setSelectedEvent(event);
    setIsViewEventOpen(true);
    await Promise.all([
      loadMealSessions(event.eventId),
      loadPasses(event.eventId),
    ]);
  }

  async function updateMealSessionStatus(
    mealSessionId: number,
    nextStatus: MealSessionStatus,
  ) {
    try {
      await api.patch(`/meal-sessions/${mealSessionId}/status`, {
        status: nextStatus,
      });

      if (selectedEvent?.eventId) {
        await loadMealSessions(selectedEvent.eventId);
      }

      toast.success("Meal session status updated successfully");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to update meal session status",
      );
    }
  }

  async function downloadPassesPdf(eventId: number, eventTitle?: string) {
    try {
      const response = await api.get(`/events/${eventId}/passes/download-pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${eventTitle || `event-${eventId}`}-passes.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to download PDF");
    }
  }

  const summary = useMemo(() => {
    const totalEvents = events.length;
    const activeEvents = events.filter(
      (event) => event.status === "active",
    ).length;
    const totalPasses = events.reduce(
      (sum, event) => sum + (event.passCount ?? event.passes_count ?? 0),
      0,
    );

    return {
      totalEvents,
      activeEvents,
      totalPasses,
    };
  }, [events]);

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle>Events</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage multi-day events, meal sessions, reusable passes, and
              redemption flow.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateEventOpen(true)}
            className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Event
            </span>
          </Button>
        </div>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Event Pass System
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                One QR pass, multiple meal sessions
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                Generate passes once for the event, then redeem the same QR one
                time per active meal session.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Events</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {summary.totalEvents}
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Active Events
          </p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {summary.activeEvents}
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generated Passes
          </p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {summary.totalPasses}
          </h3>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr,220px,auto,auto]">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Input
                className="pl-11 h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                placeholder="Search by event title or location"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </form>

          <Select
            className="h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <Button
            className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            onClick={() => handleSearchSubmit()}
          >
            Search
          </Button>

          <Button
            layout="outline"
            className="rounded-2xl h-12"
            onClick={resetFilters}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="lg:hidden space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 animate-pulse"
            >
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
              <div className="h-8 w-24 rounded-xl bg-gray-200 dark:bg-gray-700 mt-4" />
            </div>
          ))
        ) : events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.eventId}
              className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {event.description || "No description added"}
                  </p>
                </div>

                <Badge type={getStatusBadge(event.status) as any}>
                  {formatEventStatus(event.status)}
                </Badge>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <CalendarDays className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                  <span>
                    {formatDisplayDate(event.startDate)} -{" "}
                    {formatDisplayDate(event.endDate)}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                  <span>{event.location || "No location"}</span>
                </div>

                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <Ticket className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                  <span>{event.passCount} passes</span>
                </div>

                <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                  <UtensilsCrossed className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                  <span>{event.meal_sessions_count ?? 0} meal sessions</span>
                </div>

                <div className="pt-1">
                  <label className="block mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Change Status
                  </label>
                  <Select
                    className="rounded-2xl"
                    value={event.status}
                    onChange={(e) =>
                      updateEventStatus(
                        event.eventId,
                        e.target.value as EventStatus,
                      )
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  layout="outline"
                  className="rounded-2xl w-full"
                  onClick={() => openEventView(event)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Open Event
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl w-full"
                  onClick={() => openEditEventModal(event)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </span>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center bg-white dark:bg-gray-800">
            <Layers3 className="w-10 h-10 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No events found
            </h4>
          </div>
        )}

        {!loading && totalResults > resultsPerPage ? (
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg px-4 py-3">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Events navigation"
            />
          </div>
        ) : null}
      </div>

      <div className="hidden lg:block rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg mb-8">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-normal">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Passes</th>
                <th className="px-6 py-4">Meal Sessions</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : events.length > 0 ? (
                events.map((event) => (
                  <tr
                    key={event.eventId}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {event.description || "No description added"}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {formatDisplayDate(event.startDate)} -{" "}
                      {formatDisplayDate(event.endDate)}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {event.location || "—"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge type={getStatusBadge(event.status) as any}>
                          {formatEventStatus(event.status)}
                        </Badge>

                        <Select
                          className="rounded-xl min-w-[130px]"
                          value={event.status}
                          onChange={(e) =>
                            updateEventStatus(
                              event.eventId,
                              e.target.value as EventStatus,
                            )
                          }
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="closed">Closed</option>
                          <option value="cancelled">Cancelled</option>
                        </Select>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">{event.passCount}</td>

                    <td className="px-6 py-4 text-sm">
                      {event.meal_sessions_count ?? 0}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          layout="outline"
                          className="rounded-xl"
                          onClick={() => openEventView(event)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Open
                          </span>
                        </Button>

                        <Button
                          layout="outline"
                          className="rounded-xl"
                          onClick={() => openEditEventModal(event)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Pencil className="w-4 h-4" />
                            Edit
                          </span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Layers3 className="w-10 h-10 mx-auto text-gray-400" />
                    <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                      No events found
                    </h4>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalResults > resultsPerPage ? (
          <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Events navigation"
            />
          </div>
        ) : null}
      </div>

      <AppModal
        open={isCreateEventOpen}
        title="Create Event"
        onClose={() => setIsCreateEventOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateEvent} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Event Title
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                className="w-full min-h-[110px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.startDate}
                onChange={(e) =>
                  setEventForm({ ...eventForm, startDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.endDate}
                onChange={(e) =>
                  setEventForm({ ...eventForm, endDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm({ ...eventForm, location: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.status}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    status: e.target.value as EventStatus,
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() => setIsCreateEventOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingEvent}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            >
              {creatingEvent ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={isEditEventOpen}
        title={
          selectedEvent ? `Edit Event - ${selectedEvent.title}` : "Edit Event"
        }
        onClose={() => setIsEditEventOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleUpdateEvent} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Event Title
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                className="w-full min-h-[110px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.startDate}
                onChange={(e) =>
                  setEventForm({ ...eventForm, startDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                End Date
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.endDate}
                onChange={(e) =>
                  setEventForm({ ...eventForm, endDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.location}
                onChange={(e) =>
                  setEventForm({ ...eventForm, location: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={eventForm.status}
                onChange={(e) =>
                  setEventForm({
                    ...eventForm,
                    status: e.target.value as EventStatus,
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() => setIsEditEventOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editingEvent}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            >
              {editingEvent ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={isViewEventOpen}
        title={selectedEvent ? selectedEvent.title : "Event Details"}
        onClose={() => setIsViewEventOpen(false)}
        maxWidth="max-w-6xl"
      >
        {selectedEvent ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </p>
                <div className="mt-2">
                  <Badge type={getStatusBadge(selectedEvent.status) as any}>
                    {formatEventStatus(selectedEvent.status)}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Dates
                </p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {formatDisplayDate(selectedEvent.startDate)} -{" "}
                  {formatDisplayDate(selectedEvent.endDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Location
                </p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {selectedEvent.location || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Pass Count
                </p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {selectedEvent.passCount}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Quick Actions
              </h4>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={() => setIsCreateSessionOpen(true)}
                >
                  <span className="inline-flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    Add Meal Session
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={() => openEditEventModal(selectedEvent)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit Event
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={() => setIsGeneratePassesOpen(true)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Generate Passes
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={async () => {
                    setIsViewPassesOpen(true);
                    await loadPasses(selectedEvent.eventId);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Passes
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={() =>
                    downloadPassesPdf(
                      selectedEvent.eventId,
                      selectedEvent.title,
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download PDF
                  </span>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Meal Sessions
                </h4>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={() =>
                    selectedEvent && loadMealSessions(selectedEvent.eventId)
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                  </span>
                </Button>
              </div>

              <div className="space-y-3">
                {loadingSessions ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Loading meal sessions...
                  </div>
                ) : mealSessions.length > 0 ? (
                  mealSessions.map((session) => (
                    <div
                      key={session.mealSessionId}
                      className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            {session.title}
                          </h5>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDisplayDate(session.mealDate)} •{" "}
                            {formatDisplayTime(session.startTime)} -{" "}
                            {formatDisplayTime(session.endTime)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {session.location || "No location"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Badge type={getStatusBadge(session.status) as any}>
                            {formatEventStatus(session.status)}
                          </Badge>

                          <Select
                            className="rounded-xl min-w-[130px]"
                            value={session.status}
                            onChange={(e) =>
                              updateMealSessionStatus(
                                session.mealSessionId,
                                e.target.value as MealSessionStatus,
                              )
                            }
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="closed">Closed</option>
                            <option value="cancelled">Cancelled</option>
                          </Select>

                          <Button
                            layout="outline"
                            className="rounded-xl"
                            onClick={() => openEditSessionModal(session)}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Pencil className="w-4 h-4" />
                              Edit
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    No meal sessions added yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AppModal>

      <AppModal
        open={isCreateSessionOpen}
        title={
          selectedEvent
            ? `Add Meal Session - ${selectedEvent.title}`
            : "Add Meal Session"
        }
        onClose={() => setIsCreateSessionOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateMealSession} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Session Title
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.title}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, title: e.target.value })
                }
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                className="w-full min-h-[110px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Meal Date
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.mealDate}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, mealDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort Order
              </label>
              <Input
                type="number"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.sortOrder}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    sortOrder: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time
              </label>
              <Input
                type="time"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.startTime}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, startTime: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                End Time
              </label>
              <Input
                type="time"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.endTime}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, endTime: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.location}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, location: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.status}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    status: e.target.value as MealSessionStatus,
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() => setIsCreateSessionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingSession}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            >
              {creatingSession ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={isEditSessionOpen}
        title={
          selectedSession
            ? `Edit Session - ${selectedSession.title}`
            : "Edit Session"
        }
        onClose={() => setIsEditSessionOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleUpdateMealSession} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Session Title
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.title}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, title: e.target.value })
                }
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                className="w-full min-h-[110px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Meal Date
              </label>
              <Input
                type="date"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.mealDate}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, mealDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Sort Order
              </label>
              <Input
                type="number"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.sortOrder}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    sortOrder: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time
              </label>
              <Input
                type="time"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.startTime}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, startTime: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                End Time
              </label>
              <Input
                type="time"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.endTime}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, endTime: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.location}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, location: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={sessionForm.status}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    status: e.target.value as MealSessionStatus,
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() => setIsEditSessionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editingSession}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            >
              {editingSession ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={isGeneratePassesOpen}
        title={
          selectedEvent
            ? `Generate Passes - ${selectedEvent.title}`
            : "Generate Passes"
        }
        onClose={() => setIsGeneratePassesOpen(false)}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleGeneratePasses} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Number of Passes
            </label>
            <Input
              type="number"
              min={1}
              className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
              value={generatePassForm.count}
              onChange={(e) =>
                setGeneratePassForm({ count: Number(e.target.value) })
              }
              required
            />
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Generate passes once for this event. The same QR pass will be
              reused across all active meal sessions.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() => setIsGeneratePassesOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generatingPasses}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            >
              {generatingPasses ? "Generating..." : "Generate Passes"}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={isViewPassesOpen}
        title={
          selectedEvent
            ? `Event Passes - ${selectedEvent.title}`
            : "Event Passes"
        }
        onClose={() => setIsViewPassesOpen(false)}
        maxWidth="max-w-7xl"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {loadingPasses
                ? "Loading passes..."
                : `${passes.length} pass${passes.length === 1 ? "" : "es"} found`}
            </p>

            {selectedEvent ? (
              <Button
                layout="outline"
                className="rounded-2xl"
                onClick={() =>
                  downloadPassesPdf(selectedEvent.eventId, selectedEvent.title)
                }
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Download PDF
                </span>
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loadingPasses ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 animate-pulse"
                >
                  <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700 mb-4" />
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                  <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))
            ) : passes.length > 0 ? (
              passes.map((pass) => (
                <div
                  key={pass.passId}
                  className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {selectedEvent?.title}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {pass.serialNumber || `Pass #${pass.passId}`}
                      </p>
                    </div>

                    <Badge type={getStatusBadge(pass.status) as any}>
                      {pass.status}
                    </Badge>
                  </div>

                  <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 flex items-center justify-center min-h-[240px]">
                    {pass.qrUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_FILE_URL}storage/${pass.qrUrl}`}
                        alt={pass.serialNumber || pass.passCode}
                        className="max-h-52 w-auto object-contain"
                      />
                    ) : (
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        QR not available
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
                <Ticket className="w-10 h-10 mx-auto text-gray-400" />
                <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                  No passes found
                </h4>
              </div>
            )}
          </div>
        </div>
      </AppModal>
    </Layout>
  );
}