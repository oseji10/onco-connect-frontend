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
  UtensilsCrossed,
  Ticket,
  CheckCircle2,
  Eye,
  Filter,
  Plus,
  Clock3,
  FileText,
  Pencil,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type MealStatus = "draft" | "active" | "closed" | "cancelled";

type Meal = {
  mealId: number;
  title: string;
  slug: string;
  description?: string | null;
  mealDate: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  status: MealStatus;
  ticketCount: number;
  redeemedCount: number;
  createdAt?: string;
  updatedAt?: string;
  ticketsCount?: number;
  redeemedTicketsCount?: number;
  unusedTicketsCount?: number;
  voidTicketsCount?: number;
};

type ScanLog = {
  scanId: number;
  token: string;
  scanResult: string;
  message?: string | null;
  deviceName?: string | null;
  ipAddress?: string | null;
  createdAt?: string;
  scanner?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  ticket?: {
    id: number;
    serialNumber?: string | null;
    status?: string;
  } | null;
};

type MealsResponse = {
  data?: {
    data?: any[];
    total?: number;
    current_page?: number;
    last_page?: number;
  };
  meals?: any[];
  total?: number;
};

type ScanLogsResponse = {
  data?: {
    data?: any[];
    total?: number;
  };
};

type AppModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

type MealTicket = {
  ticketId: number;
  serialNumber?: string | null;
  token: string;
  status: string;
  qrUrl?: string | null;
  qrPath?: string | null;
  redeemedAt?: string | null;
  createdAt?: string;
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

function formatMealStatus(status?: string | null) {
  if (!status) return "—";
  if (status === "draft") return "Draft";
  if (status === "active") return "Active";
  if (status === "closed") return "Closed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function getMealStatusBadge(status?: string | null) {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  if (status === "closed") return "primary";
  if (status === "cancelled") return "danger";
  return "neutral";
}

function getScanResultBadge(result?: string | null) {
  if (result === "valid") return "success";
  if (result === "invalid") return "danger";
  if (result === "already_redeemed") return "warning";
  if (result === "outside_window") return "primary";
  if (result === "void") return "danger";
  return "neutral";
}

function formatScanResult(value?: string | null) {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  return date.toLocaleString();
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

function getIssuedCount(meal: Meal) {
  return meal.ticketsCount ?? meal.ticketCount ?? 0;
}

function getRedeemedCount(meal: Meal) {
  return meal.redeemedTicketsCount ?? meal.redeemedCount ?? 0;
}

function getRemainingCount(meal: Meal) {
  return Math.max(getIssuedCount(meal) - getRedeemedCount(meal), 0);
}

export default function MealsIndexPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mealDateFilter, setMealDateFilter] = useState("");
  const [totalResults, setTotalResults] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isScanLogsOpen, setIsScanLogsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [generatingTickets, setGeneratingTickets] = useState(false);
  const [loadingScanLogs, setLoadingScanLogs] = useState(false);
  const [updatingMeal, setUpdatingMeal] = useState(false);

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [scanLogsTotal, setScanLogsTotal] = useState(0);
  const [scanResultFilter, setScanResultFilter] = useState("");

  const [isQrCodesOpen, setIsQrCodesOpen] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [tickets, setTickets] = useState<MealTicket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketStatusFilter, setTicketStatusFilter] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");

  const [ticketPage, setTicketPage] = useState(1);
  const [ticketLastPage, setTicketLastPage] = useState(1);
  const [ticketPerPage] = useState(24);

  const [form, setForm] = useState({
    title: "",
    description: "",
    mealDate: "",
    startTime: "",
    endTime: "",
    location: "",
    ticketCount: 100,
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    mealDate: "",
    startTime: "",
    endTime: "",
    location: "",
    status: "draft" as MealStatus,
  });

  const [generateForm, setGenerateForm] = useState({
    count: 100,
  });

  const resultsPerPage = 10;

  async function fetchMeals() {
    setLoading(true);

    try {
      const { data } = await api.get<MealsResponse>("/meals", {
        params: {
          page,
          search: search || undefined,
          status: status || undefined,
          mealDate: mealDateFilter || undefined,
        },
      });

      const rawMeals = data?.data?.data || data?.meals || [];

      const mappedMeals: Meal[] = rawMeals.map((meal: any) => ({
        mealId: meal.mealId,
        title: meal.title ?? "",
        slug: meal.slug ?? "",
        description: meal.description ?? "",
        mealDate: meal.mealDate ?? "",
        startTime: meal.startTime ?? "",
        endTime: meal.endTime ?? "",
        location: meal.location ?? "",
        status: meal.status ?? "draft",
        ticketCount: meal.ticketCount ?? 0,
        redeemedCount: meal.redeemedCount ?? 0,
        createdAt: meal.createdAt ?? meal.created_at,
        updatedAt: meal.updatedAt ?? meal.updated_at,
        ticketsCount: meal.ticketsCount ?? meal.tickets_count ?? 0,
        redeemedTicketsCount:
          meal.redeemedTicketsCount ?? meal.redeemed_tickets_count ?? 0,
        unusedTicketsCount:
          meal.unusedTicketsCount ?? meal.unused_tickets_count ?? 0,
        voidTicketsCount: meal.voidTicketsCount ?? meal.void_tickets_count ?? 0,
      }));

      setMeals(mappedMeals);
      setTotalResults(
        data?.data?.total || data?.total || mappedMeals.length || 0,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to load meals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMeals();
  }, [page, search, status, mealDateFilter]);

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
    setMealDateFilter("");
  }

  function handleOpenMeal(meal: Meal) {
    setSelectedMeal(meal);
    setIsViewOpen(true);
  }

  function closeViewModal() {
    setIsViewOpen(false);
    setSelectedMeal(null);
  }

  function openEditModal() {
    if (!selectedMeal) return;

    setEditForm({
      title: selectedMeal.title,
      description: selectedMeal.description || "",
      mealDate: selectedMeal.mealDate,
      startTime: selectedMeal.startTime,
      endTime: selectedMeal.endTime,
      location: selectedMeal.location || "",
      status: selectedMeal.status,
    });

    setIsEditOpen(true);
  }

  function openGenerateModal() {
    if (!selectedMeal) return;

    setGenerateForm({
      count: Math.max(selectedMeal.ticketCount || 100, 1),
    });

    setIsGenerateOpen(true);
  }

  async function loadScanLogs(mealId: number, result?: string) {
    try {
      setLoadingScanLogs(true);

      const { data } = await api.get<ScanLogsResponse>(
        `/meals/${mealId}/scan-logs`,
        {
          params: {
            scanResult: result || undefined,
          },
        },
      );

      const raw = data?.data?.data || [];
      const mapped: ScanLog[] = raw.map((log: any) => ({
        id: log.id,
        token: log.token ?? "",
        scanResult: log.scanResult ?? log.scan_result ?? "",
        message: log.message ?? null,
        deviceName: log.deviceName ?? log.device_name ?? null,
        ipAddress: log.ipAddress ?? log.ip_address ?? null,
        createdAt: log.createdAt ?? log.created_at,
        scanner: log.scanner
          ? {
              id: log.scanner.id,
              name: log.scanner.name,
              email: log.scanner.email,
            }
          : null,
        ticket: log.ticket
          ? {
              id: log.ticket.id,
              serialNumber:
                log.ticket.serialNumber ?? log.ticket.serial_number ?? null,
              status: log.ticket.status,
            }
          : null,
      }));

      setScanLogs(mapped);
      setScanLogsTotal(data?.data?.total || mapped.length);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load scan logs.");
    } finally {
      setLoadingScanLogs(false);
    }
  }

  async function openScanLogsModal() {
    if (!selectedMeal) return;

    setScanResultFilter("");
    setIsScanLogsOpen(true);
    await loadScanLogs(selectedMeal.mealId);
  }

  async function updateMealStatus(mealId: number, nextStatus: MealStatus) {
    try {
      setStatusUpdatingId(mealId);

      await api.patch(`/meals/${mealId}/status`, {
        status: nextStatus,
      });

      setMeals((prev) =>
        prev.map((meal) =>
          meal.mealId === mealId ? { ...meal, status: nextStatus } : meal,
        ),
      );

      setSelectedMeal((prev) =>
        prev && prev.mealId === mealId ? { ...prev, status: nextStatus } : prev,
      );

      toast.success("Meal status updated successfully.");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Unable to update meal status.",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleCreateMeal(e: FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Meal title is required");
      return;
    }

    if (!form.mealDate) {
      toast.error("Meal date is required");
      return;
    }

    if (!form.startTime || !form.endTime) {
      toast.error("Start time and end time are required");
      return;
    }

    if (form.endTime <= form.startTime) {
      toast.error("End time must be after start time");
      return;
    }

    if (!form.ticketCount || form.ticketCount < 1) {
      toast.error("Ticket count must be at least 1");
      return;
    }

    try {
      setCreating(true);

      await api.post("/meals", {
        title: form.title,
        description: form.description,
        mealDate: form.mealDate,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location,
        ticketCount: form.ticketCount,
      });

      toast.success("Meal created successfully");

      setIsCreateOpen(false);
      setForm({
        title: "",
        description: "",
        mealDate: "",
        startTime: "",
        endTime: "",
        location: "",
        ticketCount: 100,
      });

      fetchMeals();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      if (errors && typeof errors === "object") {
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError) && firstError[0]) {
          toast.error(String(firstError[0]));
          return;
        }
      }

      toast.error(err?.response?.data?.message || "Failed to create meal");
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateTickets(e: FormEvent) {
    e.preventDefault();

    if (!selectedMeal) return;

    if (!generateForm.count || generateForm.count < 1) {
      toast.error("Ticket count must be at least 1");
      return;
    }

    try {
      setGeneratingTickets(true);

      await api.post(`/meals/${selectedMeal.mealId}/generate-tickets`, {
        count: generateForm.count,
      });

      toast.success("Tickets generated successfully");
      setIsGenerateOpen(false);

      await fetchMeals();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate tickets");
    } finally {
      setGeneratingTickets(false);
    }
  }

  async function handleEditMeal(e: FormEvent) {
    e.preventDefault();

    if (!selectedMeal) return;

    if (!editForm.title.trim()) {
      toast.error("Meal title is required");
      return;
    }

    if (!editForm.mealDate) {
      toast.error("Meal date is required");
      return;
    }

    if (!editForm.startTime || !editForm.endTime) {
      toast.error("Start time and end time are required");
      return;
    }

    if (editForm.endTime <= editForm.startTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setUpdatingMeal(true);

      const { data } = await api.put(`/meals/${selectedMeal.mealId}`, {
        title: editForm.title,
        description: editForm.description,
        mealDate: editForm.mealDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        location: editForm.location,
        status: editForm.status,
      });

      const mealRaw = data?.data ?? {};

      const updatedMeal: Meal = {
        mealId: mealRaw.id ?? selectedMeal.mealId,
        title: mealRaw.title ?? editForm.title,
        slug: mealRaw.slug ?? selectedMeal.slug,
        description: mealRaw.description ?? editForm.description,
        mealDate: mealRaw.mealDate ?? mealRaw.meal_date ?? editForm.mealDate,
        startTime:
          mealRaw.startTime ?? mealRaw.start_time ?? editForm.startTime,
        endTime: mealRaw.endTime ?? mealRaw.end_time ?? editForm.endTime,
        location: mealRaw.location ?? editForm.location,
        status: mealRaw.status ?? editForm.status,
        ticketCount:
          mealRaw.ticketCount ??
          mealRaw.ticket_count ??
          selectedMeal.ticketCount,
        redeemedCount:
          mealRaw.redeemedCount ??
          mealRaw.redeemed_count ??
          selectedMeal.redeemedCount,
        createdAt:
          mealRaw.createdAt ?? mealRaw.created_at ?? selectedMeal.createdAt,
        updatedAt:
          mealRaw.updatedAt ?? mealRaw.updated_at ?? selectedMeal.updatedAt,
        ticketsCount:
          mealRaw.ticketsCount ??
          mealRaw.tickets_count ??
          selectedMeal.ticketsCount,
        redeemedTicketsCount:
          mealRaw.redeemedTicketsCount ??
          mealRaw.redeemed_tickets_count ??
          selectedMeal.redeemedTicketsCount,
        unusedTicketsCount:
          mealRaw.unusedTicketsCount ??
          mealRaw.unused_tickets_count ??
          selectedMeal.unusedTicketsCount,
        voidTicketsCount:
          mealRaw.voidTicketsCount ??
          mealRaw.void_tickets_count ??
          selectedMeal.voidTicketsCount,
      };

      setMeals((prev) =>
        prev.map((meal) =>
          meal.mealId === updatedMeal.mealId ? updatedMeal : meal,
        ),
      );
      setSelectedMeal(updatedMeal);

      toast.success("Meal updated successfully");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update meal");
    } finally {
      setUpdatingMeal(false);
    }
  }

  const summary = useMemo(() => {
    const totalMeals = meals.length;
    const activeMeals = meals.filter((meal) => meal.status === "active").length;
    const totalIssued = meals.reduce(
      (sum, meal) => sum + getIssuedCount(meal),
      0,
    );
    const totalRedeemed = meals.reduce(
      (sum, meal) => sum + getRedeemedCount(meal),
      0,
    );

    return {
      totalMeals,
      activeMeals,
      totalIssued,
      totalRedeemed,
    };
  }, [meals]);

  async function loadMealTickets(
    mealId: number,
    status?: string,
    searchValue?: string,
    pageNumber: number = 1,
  ) {
    try {
      setLoadingTickets(true);

      const { data } = await api.get(`/meals/${mealId}/tickets`, {
        params: {
          status: status || undefined,
          search: searchValue || undefined,
          page: pageNumber,
          per_page: ticketPerPage,
        },
      });

      const rawTickets = data?.data?.data || data?.tickets || [];

      const mappedTickets: MealTicket[] = rawTickets.map((ticket: any) => ({
        ticketId: ticket.ticketId ?? ticket.id,
        serialNumber: ticket.serialNumber ?? ticket.serial_number ?? null,
        token: ticket.token ?? "",
        status: ticket.status ?? "unused",
        qrUrl: ticket.qrUrl ?? ticket.qr_url ?? null,
        qrPath: ticket.qrPath ?? ticket.qr_path ?? null,
        redeemedAt: ticket.redeemedAt ?? ticket.redeemed_at ?? null,
        createdAt: ticket.createdAt ?? ticket.created_at,
      }));

      setTickets(mappedTickets);
      setTicketsTotal(data?.data?.total || mappedTickets.length);
      setTicketPage(data?.data?.current_page || pageNumber);
      setTicketLastPage(data?.data?.last_page || 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load tickets.");
    } finally {
      setLoadingTickets(false);
    }
  }

  async function openQrCodesModal() {
    if (!selectedMeal) return;

    setTicketStatusFilter("");
    setTicketSearch("");
    setTicketPage(1);
    setIsQrCodesOpen(true);

    await loadMealTickets(selectedMeal.mealId, "", "", 1);
  }

  function downloadQrCode(ticketId: number) {
    window.open(
      `${api.defaults.baseURL}/tickets/${ticketId}/qr/download`,
      "_blank",
    );
  }

  async function downloadAllQRCodesForMeal(mealId: number, mealTitle?: string) {
    try {
      const response = await api.get(`/meals/${mealId}/tickets/download-zip`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${mealTitle || `meal-${mealId}`}-tickets.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to download ZIP file.",
      );
    }
  }

  async function downloadTicketsPdf(mealId: number, mealTitle?: string) {
    try {
      const response = await api.get(`/meals/${mealId}/tickets/download-pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${mealTitle || "meal"}-tickets.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Failed to download PDF");
    }
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle>Meals</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Create meal sessions, manage ticket availability, and monitor
              redemption.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Meal
            </span>
          </Button>
        </div>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Meal Ticketing System
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                Manage meal sessions and ticket redemption
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                View meal sessions, track issued and redeemed tickets, and keep
                operations smooth across all serving points.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Meals</p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalMeals}
              </h3>
            </div>
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-3">
              <UtensilsCrossed className="w-5 h-5 text-green-700 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Meals
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {summary.activeMeals}
              </h3>
            </div>
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Issued Tickets
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalIssued}
              </h3>
            </div>
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-3">
              <Ticket className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Redeemed Tickets
              </p>
              <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {summary.totalRedeemed}
              </h3>
            </div>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-3">
              <CheckCircle2 className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr,220px,190px,auto,auto]">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Input
                className="pl-11 h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
                placeholder="Search by title or location"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </form>

          <div className="relative">
            <Select
              className="h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm pl-10"
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
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Filter className="w-4 h-4" />
            </div>
          </div>

          <Input
            type="date"
            className="h-12 rounded-2xl border-gray-200 dark:border-gray-600 shadow-sm"
            value={mealDateFilter}
            onChange={(e) => {
              setPage(1);
              setMealDateFilter(e.target.value);
            }}
          />

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

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Meal Register
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {loading
            ? "Loading meals..."
            : `${totalResults} meal${totalResults === 1 ? "" : "s"} found`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 animate-pulse"
            >
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          ))
        ) : meals.length > 0 ? (
          meals.map((meal) => (
            <div
              key={meal.mealId}
              className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {meal.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {meal.location || "No location added"}
                  </p>
                </div>

                <Badge type={getMealStatusBadge(meal.status) as any}>
                  {formatMealStatus(meal.status)}
                </Badge>
              </div>

              <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formatDisplayDate(meal.mealDate)}</span>
                </div>

                <div className="flex items-start gap-2">
                  <Clock3 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {formatDisplayTime(meal.startTime)} -{" "}
                    {formatDisplayTime(meal.endTime)}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <Ticket className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{getIssuedCount(meal)} tickets issued</span>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{getRedeemedCount(meal)} redeemed</span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{meal.location || "No location added"}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  layout="outline"
                  className="rounded-xl"
                  onClick={() => handleOpenMeal(meal)}
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Open
                  </span>
                </Button>

                <Select
                  className="rounded-xl"
                  value={meal.status}
                  disabled={statusUpdatingId === meal.mealId}
                  onChange={(e) =>
                    updateMealStatus(meal.mealId, e.target.value as MealStatus)
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-8 text-center">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No meals found
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Try a different search or create a new meal.
            </p>
          </div>
        )}

        {!loading && totalResults > resultsPerPage ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={setPage}
              label="Meals navigation"
            />
          </div>
        ) : null}
      </div>

      <div className="hidden lg:block rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-normal">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                <th className="px-6 py-4">Meal</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tickets</th>
                <th className="px-6 py-4">Redeemed</th>
                <th className="px-6 py-4">Remaining</th>
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
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : meals.length > 0 ? (
                meals.map((meal) => (
                  <tr
                    key={meal.mealId}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">
                          {meal.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {meal.description || "No description added"}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {formatDisplayDate(meal.mealDate)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {formatDisplayTime(meal.startTime)} -{" "}
                      {formatDisplayTime(meal.endTime)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {meal.location || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge type={getMealStatusBadge(meal.status) as any}>
                        {formatMealStatus(meal.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getIssuedCount(meal)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getRedeemedCount(meal)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getRemainingCount(meal)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          layout="outline"
                          className="rounded-xl"
                          onClick={() => handleOpenMeal(meal)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Open
                          </span>
                        </Button>

                        <Select
                          className="rounded-xl min-w-[130px]"
                          value={meal.status}
                          disabled={statusUpdatingId === meal.mealId}
                          onChange={(e) =>
                            updateMealStatus(
                              meal.mealId,
                              e.target.value as MealStatus,
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <UtensilsCrossed className="w-10 h-10 mx-auto text-gray-400" />
                    <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                      No meals found
                    </h4>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Try a different search or create a new meal.
                    </p>
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
              label="Meals table navigation"
            />
          </div>
        ) : null}
      </div>

      <AppModal
        open={isCreateOpen}
        title="Create Meal"
        onClose={() => setIsCreateOpen(false)}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateMeal} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Meal Title
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                placeholder="e.g. Conference Lunch - Day 1"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                className="w-full min-h-[110px] rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Optional meal description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
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
                value={form.mealDate}
                onChange={(e) => setForm({ ...form, mealDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ticket Count
              </label>
              <Input
                type="number"
                min={1}
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={form.ticketCount}
                onChange={(e) =>
                  setForm({ ...form, ticketCount: Number(e.target.value) })
                }
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Time
              </label>
              <Input
                type="time"
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
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
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <Input
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                placeholder="e.g. Main Hall"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={creating}
              className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
            >
              {creating ? "Creating..." : "Create Meal"}
            </Button>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={isViewOpen}
        title={selectedMeal ? selectedMeal.title : "Meal Details"}
        onClose={closeViewModal}
        maxWidth="max-w-5xl"
      >
        {selectedMeal ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </p>
                <div className="mt-2">
                  <Badge type={getMealStatusBadge(selectedMeal.status) as any}>
                    {formatMealStatus(selectedMeal.status)}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Date
                </p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {formatDisplayDate(selectedMeal.mealDate)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Time
                </p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {formatDisplayTime(selectedMeal.startTime)} -{" "}
                  {formatDisplayTime(selectedMeal.endTime)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Location
                </p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {selectedMeal.location || "—"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Issued Tickets
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {getIssuedCount(selectedMeal)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Redeemed
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {getRedeemedCount(selectedMeal)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Remaining
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {getRemainingCount(selectedMeal)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Description
              </h4>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {selectedMeal.description ||
                  "No description added for this meal."}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Quick Actions
              </h4>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Button
                  layout="outline"
                  className="rounded-2xl"
                  disabled={statusUpdatingId === selectedMeal.mealId}
                  onClick={() =>
                    updateMealStatus(
                      selectedMeal.mealId,
                      selectedMeal.status === "active" ? "closed" : "active",
                    )
                  }
                >
                  {selectedMeal.status === "active"
                    ? "Close Meal"
                    : "Activate Meal"}
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={openGenerateModal}
                >
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Generate Tickets
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={openScanLogsModal}
                >
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    View Scan Logs
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={openEditModal}
                >
                  <span className="inline-flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Edit Meal
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={openQrCodesModal}
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    View QR Codes
                  </span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </AppModal>

      <AppModal
        open={isGenerateOpen}
        title={
          selectedMeal
            ? `Generate Tickets - ${selectedMeal.title}`
            : "Generate Tickets"
        }
        onClose={() => setIsGenerateOpen(false)}
        maxWidth="max-w-xl"
      >
        {selectedMeal ? (
          <form onSubmit={handleGenerateTickets} className="space-y-5">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Current Issued
                  </p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    {getIssuedCount(selectedMeal)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Redeemed
                  </p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    {getRedeemedCount(selectedMeal)}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Remaining
                  </p>
                  <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    {getRemainingCount(selectedMeal)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of Tickets to Generate
              </label>
              <Input
                type="number"
                min={1}
                className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                value={generateForm.count}
                onChange={(e) =>
                  setGenerateForm({ count: Number(e.target.value) })
                }
                required
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900/30 p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Only generate tickets once unless your backend explicitly
                supports multiple generations for the same meal.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                type="button"
                layout="outline"
                className="rounded-2xl h-11"
                onClick={() => setIsGenerateOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={generatingTickets}
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              >
                {generatingTickets ? "Generating..." : "Generate Tickets"}
              </Button>
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={isScanLogsOpen}
        title={selectedMeal ? `Scan Logs - ${selectedMeal.title}` : "Scan Logs"}
        onClose={() => setIsScanLogsOpen(false)}
        maxWidth="max-w-6xl"
      >
        {selectedMeal ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {loadingScanLogs
                    ? "Loading scan logs..."
                    : `${scanLogsTotal} scan log${scanLogsTotal === 1 ? "" : "s"} found`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  className="rounded-2xl min-w-[180px]"
                  value={scanResultFilter}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setScanResultFilter(value);
                    await loadScanLogs(selectedMeal.mealId, value);
                  }}
                >
                  <option value="">All Results</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="already_redeemed">Already Redeemed</option>
                  <option value="outside_window">Outside Window</option>
                  <option value="void">Void</option>
                </Select>

                <Button
                  layout="outline"
                  className="rounded-2xl"
                  onClick={() =>
                    loadScanLogs(selectedMeal.mealId, scanResultFilter)
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                  </span>
                </Button>
              </div>
            </div>

            <div className="hidden lg:block rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-normal">
                  <thead>
                    <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                      <th className="px-5 py-4">Result</th>
                      <th className="px-5 py-4">Token</th>
                      <th className="px-5 py-4">Message</th>
                      <th className="px-5 py-4">Scanner</th>
                      <th className="px-5 py-4">Device</th>
                      <th className="px-5 py-4">Time</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loadingScanLogs ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-5 py-4">
                            <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : scanLogs.length > 0 ? (
                      scanLogs.map((log) => (
                        <tr key={log.scanId}>
                          <td className="px-5 py-4">
                            <Badge
                              type={getScanResultBadge(log.scanResult) as any}
                            >
                              {formatScanResult(log.scanResult)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-sm font-mono break-all">
                            {log.token || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {log.message || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {log.scanner?.name || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {log.deviceName || "—"}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {formatDisplayDateTime(log.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <FileText className="w-10 h-10 mx-auto text-gray-400" />
                          <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                            No scan logs found
                          </h4>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {loadingScanLogs ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse"
                  >
                    <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
                    <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                    <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))
              ) : scanLogs.length > 0 ? (
                scanLogs.map((log) => (
                  <div
                    key={log.scanId}
                    className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Badge type={getScanResultBadge(log.scanResult) as any}>
                        {formatScanResult(log.scanResult)}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDisplayDateTime(log.createdAt)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <p className="font-mono break-all text-gray-800 dark:text-gray-100">
                        {log.token || "—"}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        {log.message || "—"}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Scanner: {log.scanner?.name || "—"}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Device: {log.deviceName || "—"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
                  <FileText className="w-10 h-10 mx-auto text-gray-400" />
                  <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                    No scan logs found
                  </h4>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </AppModal>

      <AppModal
        open={isEditOpen}
        title={selectedMeal ? `Edit Meal - ${selectedMeal.title}` : "Edit Meal"}
        onClose={() => setIsEditOpen(false)}
        maxWidth="max-w-3xl"
      >
        {selectedMeal ? (
          <form onSubmit={handleEditMeal} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meal Title
                </label>
                <Input
                  className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
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
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
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
                  value={editForm.mealDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mealDate: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <Select
                  className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as MealStatus,
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Start Time
                </label>
                <Input
                  type="time"
                  className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={editForm.startTime}
                  onChange={(e) =>
                    setEditForm({ ...editForm, startTime: e.target.value })
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
                  value={editForm.endTime}
                  onChange={(e) =>
                    setEditForm({ ...editForm, endTime: e.target.value })
                  }
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <Input
                  className="h-12 rounded-2xl border-gray-200 dark:border-gray-600"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button
                type="button"
                layout="outline"
                className="rounded-2xl h-11"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updatingMeal}
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              >
                {updatingMeal ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={isQrCodesOpen}
        title={selectedMeal ? `QR Codes - ${selectedMeal.title}` : "QR Codes"}
        onClose={() => setIsQrCodesOpen(false)}
        maxWidth="max-w-7xl"
      >
        {selectedMeal ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {loadingTickets
                    ? "Loading QR codes..."
                    : `${ticketsTotal} ticket${ticketsTotal === 1 ? "" : "s"} found`}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  placeholder="Search by token or serial number"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                />

                <Select
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600 min-w-[170px]"
                  value={ticketStatusFilter}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setTicketStatusFilter(value);
                    await loadMealTickets(
                      selectedMeal.mealId,
                      value,
                      ticketSearch,
                      1,
                    );
                  }}
                >
                  <option value="">All Tickets</option>
                  <option value="unused">Unused</option>
                  <option value="redeemed">Redeemed</option>
                  <option value="void">Void</option>
                </Select>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11"
                  onClick={() =>
                    loadMealTickets(
                      selectedMeal.mealId,
                      ticketStatusFilter,
                      ticketSearch,
                      1,
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Search
                  </span>
                </Button>

                <Button
                  layout="outline"
                  className="rounded-2xl h-11"
                  onClick={() =>
                    loadMealTickets(
                      selectedMeal.mealId,
                      ticketStatusFilter,
                      ticketSearch,
                    )
                  }
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                  </span>
                </Button>
              </div>
            </div>

            <Button
              layout="outline"
              className="rounded-2xl h-11"
              onClick={() =>
                downloadTicketsPdf(selectedMeal.mealId, selectedMeal.title)
              }
            >
              <span className="inline-flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Download PDF
              </span>
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loadingTickets ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 animate-pulse"
                  >
                    <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700 mb-4" />
                    <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
                    <div className="h-10 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <div
                    key={ticket.ticketId}
                    className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {selectedMeal.title}
                      </p>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {ticket.serialNumber || `Ticket #${ticket.ticketId}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                          {ticket.token}
                        </p>
                      </div>

                      <Badge
                        type={
                          ticket.status === "unused"
                            ? "success"
                            : ticket.status === "redeemed"
                              ? "warning"
                              : ticket.status === "void"
                                ? "danger"
                                : "neutral"
                        }
                      >
                        {ticket.status}
                      </Badge>
                    </div>

                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 flex items-center justify-center min-h-[240px]">
                      {ticket.qrUrl ? (
                        <img
                          // src={ticket.qrUrl}
                          src={`${process.env.NEXT_PUBLIC_API_FILE_URL}storage/${ticket.qrUrl}`}
                          alt={ticket.serialNumber || ticket.token}
                          className="max-h-52 w-auto object-contain"
                        />
                      ) : (
                        <div className="text-center">
                          <Ticket className="w-10 h-10 mx-auto text-gray-400" />
                          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                            QR image not available
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <p>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          Created:
                        </span>{" "}
                        {formatDisplayDateTime(ticket.createdAt)}
                      </p>

                      {ticket.redeemedAt ? (
                        <p>
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            Redeemed:
                          </span>{" "}
                          {formatDisplayDateTime(ticket.redeemedAt)}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Button
                        layout="outline"
                        className="rounded-2xl flex-1"
                        onClick={() => downloadQrCode(ticket.ticketId)}
                      >
                        Download QR
                      </Button>

                      {ticket.qrUrl ? (
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_FILE_URL}storage/${ticket.qrUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1"
                        >
                          <Button
                            layout="outline"
                            className="rounded-2xl w-full"
                          >
                            Preview
                          </Button>
                        </a>
                      ) : (
                        <Button
                          layout="outline"
                          className="rounded-2xl flex-1"
                          disabled
                        >
                          Preview
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full rounded-3xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
                  <Ticket className="w-10 h-10 mx-auto text-gray-400" />
                  <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                    No QR codes found
                  </h4>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Generate tickets for this meal first, then come back here.
                  </p>
                </div>
              )}
              {!loadingTickets && ticketsTotal > ticketPerPage ? (
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-3">
                  <Pagination
                    totalResults={ticketsTotal}
                    resultsPerPage={ticketPerPage}
                    onChange={(p) =>
                      loadMealTickets(
                        selectedMeal.mealId,
                        ticketStatusFilter,
                        ticketSearch,
                        p,
                      )
                    }
                    label="Tickets navigation"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </AppModal>
    </Layout>
  );
}
