import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Input, Button, Pagination } from "@roketid/windmill-react-ui";
import {
  Handshake,
  Search,
  Plus,
  X,
  Loader2,
  RefreshCcw,
  Edit,
  Trash2,
  Eye,
  Globe,
  Mail,
  Phone,
  User,
  Building,
  FileText,
  CheckCircle2,
  Circle,
  Clock,
  Upload,
  Download,
  DollarSign,
  Award,
  LayoutGrid,
  List,
  CreditCard,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────

type SponsorshipType = "Sponsor" | "Partner";
type PaymentStatus = "unpaid" | "partial" | "paid";
type DeliverableStatus = "pending" | "in_progress" | "fulfilled";

type Contact = {
  contactId: number;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
};

type Deliverable = {
  deliverableId: number;
  title: string;
  status: DeliverableStatus;
  dueDate?: string | null;
};

type PartnerDocument = {
  documentId: number;
  title: string;
  category: string;
  fileUrl?: string | null;
  createdAt?: string | null;
};

type Partner = {
  sponsorshipId: number;
  eventId?: number | null;
  type: SponsorshipType;
  organizationName: string;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  tier?: string | null;
  status: string;
  currency: string;
  agreedAmount?: number | null;
  amountPaid?: number | null;
  paymentStatus: PaymentStatus;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  contacts: Contact[];
  deliverables: Deliverable[];
  documents: PartnerDocument[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PartnerFormData = {
  type: SponsorshipType;
  organizationName: string;
  website: string;
  description: string;
  tier: string;
  status: string;
  currency: string;
  agreedAmount: string;
  amountPaid: string;
  paymentStatus: PaymentStatus;
  invoiceNumber: string;
  invoiceDate: string;
  logo: File | null;
  logoPreview: string | null;
};

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

type SponsorshipsResponse = { sponsorships: Partner[] };

// ─── Constants ──────────────────────────────────────────────────────────────

const eventId = 1;
const ITEMS_PER_PAGE = 10;

const TYPES: SponsorshipType[] = ["Sponsor", "Partner"];

const TIERS = [
  {
    key: "platinum",
    label: "Platinum",
    color: "#475569",
    benefits: [
      "Prime logo placement",
      "Keynote speaking slot",
      "Premium exhibition booth",
      "Full-page program advert",
      "10 delegate passes",
    ],
  },
  {
    key: "gold",
    label: "Gold",
    color: "#ca8a04",
    benefits: [
      "Logo on event materials",
      "Panel speaking slot",
      "Standard exhibition booth",
      "Half-page program advert",
      "6 delegate passes",
    ],
  },
  {
    key: "silver",
    label: "Silver",
    color: "#94a3b8",
    benefits: [
      "Logo on website",
      "Shared booth space",
      "Quarter-page advert",
      "4 delegate passes",
    ],
  },
  {
    key: "bronze",
    label: "Bronze",
    color: "#b45309",
    benefits: ["Logo on website", "Listing in program", "2 delegate passes"],
  },
  {
    key: "partner",
    label: "Partner (Non-monetary)",
    color: "#2563eb",
    benefits: [
      "Logo as official partner",
      "Acknowledgement in communications",
    ],
  },
] as const;

const STATUSES = [
  { key: "prospect", label: "Prospect", color: "#94a3b8" },
  { key: "contacted", label: "Contacted", color: "#3b82f6" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#8b5cf6" },
  { key: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { key: "committed", label: "Committed", color: "#10b981" },
  { key: "confirmed", label: "Confirmed", color: "#059669" },
  { key: "declined", label: "Declined", color: "#ef4444" },
] as const;

const PAYMENT_STATUSES = [
  { key: "unpaid", label: "Unpaid", color: "#ef4444" },
  { key: "partial", label: "Partial", color: "#f59e0b" },
  { key: "paid", label: "Paid", color: "#10b981" },
] as const;

const DOCUMENT_CATEGORIES = [
  "MOU",
  "Contract",
  "Invoice",
  "Proposal",
  "Logo",
  "Other",
];

const DELIVERABLE_STATUSES: { key: DeliverableStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "fulfilled", label: "Fulfilled" },
];

const EMPTY_FORM: PartnerFormData = {
  type: "Sponsor",
  organizationName: "",
  website: "",
  description: "",
  tier: "",
  status: "prospect",
  currency: "NGN",
  agreedAmount: "",
  amountPaid: "",
  paymentStatus: "unpaid",
  invoiceNumber: "",
  invoiceDate: "",
  logo: null,
  logoPreview: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getTier(key?: string | null) {
  return TIERS.find((t) => t.key === key);
}
function getStatus(key?: string | null) {
  return STATUSES.find((s) => s.key === key);
}
function getPayment(key?: string | null) {
  return PAYMENT_STATUSES.find((p) => p.key === key);
}

function formatCurrency(amount?: number | null, currency = "NGN") {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₦${Number(amount).toLocaleString()}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function resolveLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }
  return `${process.env.NEXT_PUBLIC_API_FILE_URL || ""}${logoUrl}`;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function partnerToForm(p: Partner): PartnerFormData {
  return {
    type: p.type,
    organizationName: p.organizationName,
    website: p.website || "",
    description: p.description || "",
    tier: p.tier || "",
    status: p.status,
    currency: p.currency || "NGN",
    agreedAmount: p.agreedAmount != null ? String(p.agreedAmount) : "",
    amountPaid: p.amountPaid != null ? String(p.amountPaid) : "",
    paymentStatus: p.paymentStatus,
    invoiceNumber: p.invoiceNumber || "",
    invoiceDate: p.invoiceDate ? p.invoiceDate.slice(0, 10) : "",
    logo: null,
    logoPreview: resolveLogoUrl(p.logoUrl),
  };
}

// ─── Small UI pieces ────────────────────────────────────────────────────────

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier?: string | null }) {
  const t = getTier(tier);
  if (!t) return <span className="text-gray-400 text-xs">—</span>;
  return <Pill label={t.label} color={t.color} />;
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = getStatus(status);
  if (!s) return <span className="text-gray-400 text-xs">—</span>;
  return <Pill label={s.label} color={s.color} />;
}

function PaymentBadge({ status }: { status?: string | null }) {
  const p = getPayment(status);
  if (!p) return <span className="text-gray-400 text-xs">—</span>;
  return <Pill label={p.label} color={p.color} />;
}

function TypeBadge({ type }: { type: SponsorshipType }) {
  const color = type === "Sponsor" ? "#059669" : "#2563eb";
  return <Pill label={type} color={color} />;
}

function LogoAvatar({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
}) {
  const resolved = resolveLogoUrl(logoUrl);
  const cls = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return resolved ? (
    <img
      src={resolved}
      alt={name}
      className={`${cls} rounded-2xl object-contain bg-white border border-gray-200 dark:border-gray-700 p-1 shrink-0`}
    />
  ) : (
    <div
      className={`${cls} rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 shrink-0`}
    >
      <Building className="w-5 h-5" />
    </div>
  );
}

function DeliverableProgress({ deliverables }: { deliverables: Deliverable[] }) {
  const total = deliverables.length;
  const done = deliverables.filter((d) => d.status === "fulfilled").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  if (total === 0) {
    return <span className="text-xs text-gray-400">No deliverables</span>;
  }

  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
        <span>{done}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: "green" | "blue" | "amber" | "slate";
}) {
  const tones = {
    green: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
    blue: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
    amber: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
    slate: "from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20",
  };
  return (
    <div
      className={`rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-gradient-to-br ${tones[tone]} p-5 flex items-center gap-4`}
    >
      <div className="rounded-2xl bg-white/70 dark:bg-gray-800/60 p-3 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-gray-900 dark:text-white truncate">
          {value}
        </p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Pipeline Board Card ────────────────────────────────────────────────────

function BoardCard({
  partner,
  onOpen,
  onDragStart,
}: {
  partner: Partner;
  onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="cursor-pointer rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <LogoAvatar name={partner.organizationName} logoUrl={partner.logoUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {partner.organizationName}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <TypeBadge type={partner.type} />
            {partner.tier && <TierBadge tier={partner.tier} />}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {formatCurrency(partner.agreedAmount, partner.currency)}
        </span>
        <PaymentBadge status={partner.paymentStatus} />
      </div>
    </div>
  );
}

// ─── Form Modal (create / edit) ─────────────────────────────────────────────

function PartnerFormModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  initialData,
  mode,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PartnerFormData) => Promise<void>;
  submitting: boolean;
  initialData: PartnerFormData;
  mode: "create" | "edit";
}) {
  const [form, setForm] = useState<PartnerFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData);
      setError(null);
    }
  }, [isOpen, initialData]);

  function update<K extends keyof PartnerFormData>(key: K, value: PartnerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    update("logo", file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => update("logoPreview", reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.organizationName.trim()) {
      setError("Organization name is required.");
      return;
    }
    setError(null);
    await onSubmit(form);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full h-[95dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-slideUp">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase">
              {mode === "create" ? "New Sponsor / Partner" : "Edit Record"}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {mode === "create"
                ? "Add an organization to the pipeline"
                : "Update record details"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Logo + type */}
          <div className="flex items-center gap-4">
            <input ref={fileRef} type="file" accept="image/*" onChange={onLogoSelect} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0"
              title="Upload logo"
            >
              {form.logoPreview ? (
                <img
                  src={form.logoPreview}
                  alt="Logo"
                  className="h-20 w-20 rounded-2xl object-contain bg-white border-2 border-gray-200 dark:border-gray-600 p-1"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:border-green-500 transition-colors">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px] mt-1 font-semibold">Logo</span>
                </div>
              )}
            </button>

            <div className="flex-1">
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Type
              </label>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update("type", t)}
                    className={`flex-1 px-4 py-2.5 rounded-2xl border-2 text-sm font-bold uppercase tracking-wide transition-all ${
                      form.type === t
                        ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "border-gray-200 dark:border-gray-600 text-gray-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <Input
              className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
              placeholder="Organization / company name"
              value={form.organizationName}
              onChange={(e) => update("organizationName", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Website
              </label>
              <Input
                className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                placeholder="https://"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Tier / Package
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
                value={form.tier}
                onChange={(e) => update("tier", e.target.value)}
              >
                <option value="">No tier</option>
                {TIERS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Pipeline Stage
            </label>
            <select
              className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Financials */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Financials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                  Agreed Amount ({form.currency})
                </label>
                <Input
                  type="number"
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="0"
                  value={form.agreedAmount}
                  onChange={(e) => update("agreedAmount", e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                  Amount Paid
                </label>
                <Input
                  type="number"
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="0"
                  value={form.amountPaid}
                  onChange={(e) => update("amountPaid", e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                  Payment Status
                </label>
                <select
                  className="w-full h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
                  value={form.paymentStatus}
                  onChange={(e) => update("paymentStatus", e.target.value as PaymentStatus)}
                >
                  {PAYMENT_STATUSES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                  Invoice No.
                </label>
                <Input
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="INV-..."
                  value={form.invoiceNumber}
                  onChange={(e) => update("invoiceNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                  Invoice Date
                </label>
                <Input
                  type="date"
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  value={form.invoiceDate}
                  onChange={(e) => update("invoiceDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-4 text-sm focus:border-green-500 focus:ring-green-500"
              rows={3}
              placeholder="Context, history, special terms..."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <X className="w-4 h-4" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              layout="outline"
              className="rounded-2xl h-12 flex-1 border-2"
              onClick={onClose}
              disabled={submitting}
            >
              <span className="font-semibold">Cancel</span>
            </Button>
            <Button
              type="submit"
              className="rounded-2xl h-12 flex-1 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg disabled:opacity-60"
              disabled={submitting}
            >
              <span className="inline-flex items-center justify-center gap-2 font-bold uppercase">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {mode === "create" ? "Create" : "Save"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Modal (sub-entity management) ────────────────────────────────────

function PartnerDetailModal({
  partner,
  onClose,
  onEdit,
  onChanged,
}: {
  partner: Partner | null;
  onClose: () => void;
  onEdit: (p: Partner) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  // Contact form
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ name: "", role: "", email: "", phone: "" });

  // Deliverable form
  const [deliverableTitle, setDeliverableTitle] = useState("");

  // Document form
  const [showDoc, setShowDoc] = useState(false);
  const [doc, setDoc] = useState({ title: "", category: "Contract" });
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowContact(false);
    setContact({ name: "", role: "", email: "", phone: "" });
    setDeliverableTitle("");
    setShowDoc(false);
    setDoc({ title: "", category: "Contract" });
  }, [partner?.sponsorshipId]);

  if (!partner) return null;
  const id = partner.sponsorshipId;

  async function run(fn: () => Promise<any>, successMsg?: string) {
    try {
      setBusy(true);
      await fn();
      if (successMsg) toast.success(successMsg);
      await onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    await run(
      () => api.patch(`/sponsorships/${id}/status`, { status }),
      "Stage updated."
    );
  }

  async function addContact() {
    if (!contact.name.trim()) return toast.error("Contact name is required.");
    await run(async () => {
      await api.post(`/sponsorships/${id}/contacts`, contact);
      setContact({ name: "", role: "", email: "", phone: "" });
      setShowContact(false);
    }, "Contact added.");
  }

  async function deleteContact(contactId: number) {
    await run(() => api.delete(`/sponsorships/${id}/contacts/${contactId}`), "Contact removed.");
  }

  async function addDeliverable() {
    if (!deliverableTitle.trim()) return;
    await run(async () => {
      await api.post(`/sponsorships/${id}/deliverables`, { title: deliverableTitle.trim() });
      setDeliverableTitle("");
    }, "Deliverable added.");
  }

  async function seedTierBenefits() {
    if (!partner!.tier) return toast.error("Assign a tier first.");
    await run(
      () => api.post(`/sponsorships/${id}/deliverables/seed`, { tier: partner!.tier }),
      "Tier benefits added."
    );
  }

  async function cycleDeliverable(d: Deliverable) {
    const order: DeliverableStatus[] = ["pending", "in_progress", "fulfilled"];
    const next = order[(order.indexOf(d.status) + 1) % order.length];
    await run(() =>
      api.patch(`/sponsorships/${id}/deliverables/${d.deliverableId}`, { status: next })
    );
  }

  async function deleteDeliverable(deliverableId: number) {
    await run(() => api.delete(`/sponsorships/${id}/deliverables/${deliverableId}`), "Deliverable removed.");
  }

  async function addDocument() {
    if (!doc.title.trim()) return toast.error("Document title is required.");
    const file = docFileRef.current?.files?.[0];
    if (!file) return toast.error("Select a file to upload.");
    await run(async () => {
      const payload = new FormData();
      payload.append("title", doc.title.trim());
      payload.append("category", doc.category);
      payload.append("file", file);
      await api.post(`/sponsorships/${id}/documents`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDoc({ title: "", category: "Contract" });
      setShowDoc(false);
      if (docFileRef.current) docFileRef.current.value = "";
    }, "Document uploaded.");
  }

  async function deleteDocument(documentId: number) {
    await run(() => api.delete(`/sponsorships/${id}/documents/${documentId}`), "Document removed.");
  }

  const outstanding =
    (partner.agreedAmount || 0) - (partner.amountPaid || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full h-[95dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-3xl overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-slideUp">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <LogoAvatar name={partner.organizationName} logoUrl={partner.logoUrl} />
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {partner.organizationName}
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <TypeBadge type={partner.type} />
                  {partner.tier && <TierBadge tier={partner.tier} />}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onEdit(partner)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                title="Edit"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pipeline + website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Pipeline Stage
              </label>
              <select
                className="w-full h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
                value={partner.status}
                onChange={(e) => changeStatus(e.target.value)}
                disabled={busy}
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            {partner.website && (
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Website
                </label>
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 h-11 text-sm font-semibold text-blue-600 hover:underline truncate"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="truncate">{partner.website}</span>
                </a>
              </div>
            )}
          </div>

          {partner.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 rounded-2xl bg-gray-50 dark:bg-gray-900/30 p-4">
              {partner.description}
            </p>
          )}

          {/* Financials */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Financials
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[11px] uppercase font-semibold text-gray-400">Agreed</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(partner.agreedAmount, partner.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-semibold text-gray-400">Paid</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(partner.amountPaid, partner.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-semibold text-gray-400">Outstanding</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(outstanding, partner.currency)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase font-semibold text-gray-400">Status</p>
                <div className="mt-1.5">
                  <PaymentBadge status={partner.paymentStatus} />
                </div>
              </div>
            </div>
            {(partner.invoiceNumber || partner.invoiceDate) && (
              <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Invoice {partner.invoiceNumber || "—"} · {formatDate(partner.invoiceDate)}
              </p>
            )}
          </div>

          {/* Deliverables */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <Award className="w-4 h-4" />
                Deliverables
              </h4>
              {partner.tier && (
                <button
                  onClick={seedTierBenefits}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Add {getTier(partner.tier)?.label} benefits
                </button>
              )}
            </div>

            <div className="mb-4">
              <DeliverableProgress deliverables={partner.deliverables} />
            </div>

            <div className="space-y-2">
              {partner.deliverables.map((d) => (
                <div
                  key={d.deliverableId}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-3"
                >
                  <button
                    onClick={() => cycleDeliverable(d)}
                    disabled={busy}
                    title="Cycle status"
                    className="shrink-0"
                  >
                    {d.status === "fulfilled" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : d.status === "in_progress" ? (
                      <Clock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      d.status === "fulfilled"
                        ? "line-through text-gray-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {d.title}
                  </span>
                  <button
                    onClick={() => deleteDeliverable(d.deliverableId)}
                    disabled={busy}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                placeholder="Add a deliverable..."
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDeliverable();
                  }
                }}
              />
              <Button
                type="button"
                className="rounded-2xl h-11 px-4 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                onClick={addDeliverable}
                disabled={busy}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Contacts */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4" />
                Contacts
              </h4>
              <button
                onClick={() => setShowContact((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            {showContact && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Name"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                />
                <Input
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Role / title"
                  value={contact.role}
                  onChange={(e) => setContact({ ...contact, role: e.target.value })}
                />
                <Input
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
                <Input
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Phone"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    className="rounded-2xl h-11 w-full bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                    onClick={addContact}
                    disabled={busy}
                  >
                    <span className="font-bold">Save Contact</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {partner.contacts.length === 0 ? (
                <p className="text-sm text-gray-400">No contacts yet.</p>
              ) : (
                partner.contacts.map((c) => (
                  <div
                    key={c.contactId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {c.name}
                        {c.role ? (
                          <span className="font-normal text-gray-400"> · {c.role}</span>
                        ) : null}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-green-600">
                            <Mail className="w-3 h-3" /> {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-green-600">
                            <Phone className="w-3 h-3" /> {c.phone}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteContact(c.contactId)}
                      disabled={busy}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </h4>
              <button
                onClick={() => setShowDoc((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
            </div>

            {showDoc && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Document title"
                  value={doc.title}
                  onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                />
                <select
                  className="h-11 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
                  value={doc.category}
                  onChange={(e) => setDoc({ ...doc, category: e.target.value })}
                >
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  ref={docFileRef}
                  type="file"
                  className="sm:col-span-2 text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:rounded-xl file:border-0 file:bg-green-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-green-700"
                />
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    className="rounded-2xl h-11 w-full bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                    onClick={addDocument}
                    disabled={busy}
                  >
                    <span className="font-bold">Upload Document</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {partner.documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents yet.</p>
              ) : (
                partner.documents.map((d) => (
                  <div
                    key={d.documentId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {d.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.category} · {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {d.fileUrl && (
                        <a
                          href={resolveLogoUrl(d.fileUrl) || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Open"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => deleteDocument(d.documentId)}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function SponsorshipManagementPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"pipeline" | "directory">("pipeline");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | SponsorshipType>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  async function fetchPartners() {
    try {
      setLoading(true);
      const { data } = await api.get<ApiSuccess<SponsorshipsResponse>>("/sponsorships");
      setPartners(data.data.sponsorships || []);
    } catch (err) {
      toast.error("Failed to load sponsors & partners.");
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPartners();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return partners.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (tierFilter !== "all" && (p.tier || "") !== tierFilter) return false;
      if (!q) return true;
      return (
        p.organizationName.toLowerCase().includes(q) ||
        (p.website || "").toLowerCase().includes(q) ||
        p.contacts.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q)
        )
      );
    });
  }, [partners, search, typeFilter, tierFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  const stats = useMemo(() => {
    const total = partners.length;
    const confirmed = partners.filter((p) => p.status === "confirmed").length;
    const committed = partners
      .filter((p) => ["committed", "confirmed"].includes(p.status))
      .reduce((sum, p) => sum + (p.agreedAmount || 0), 0);
    const received = partners.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    return { total, confirmed, committed, received };
  }, [partners]);

  const activePartner = useMemo(
    () => partners.find((p) => p.sponsorshipId === activeId) || null,
    [partners, activeId]
  );

  // Board grouping
  const byStatus = useMemo(() => {
    const map: Record<string, Partner[]> = {};
    STATUSES.forEach((s) => (map[s.key] = []));
    filtered.forEach((p) => {
      (map[p.status] = map[p.status] || []).push(p);
    });
    return map;
  }, [filtered]);

  async function moveToStatus(sponsorshipId: number, status: string) {
    const current = partners.find((p) => p.sponsorshipId === sponsorshipId);
    if (!current || current.status === status) return;

    // optimistic
    setPartners((prev) =>
      prev.map((p) => (p.sponsorshipId === sponsorshipId ? { ...p, status } : p))
    );
    try {
      await api.patch(`/sponsorships/${sponsorshipId}/status`, { status });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to move record.");
      fetchPartners();
    }
  }

  async function handleCreate(form: PartnerFormData) {
    try {
      setSubmitting(true);
      const payload = buildPayload(form);
      const { data } = await api.post<ApiSuccess<Partner>>("/sponsorships", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(data.message || "Record created.");
      await fetchPartners();
      setFormOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create record.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(form: PartnerFormData) {
    if (!editing) return;
    try {
      setSubmitting(true);
      const payload = buildPayload(form);
      payload.append("_method", "PUT");
      const { data } = await api.post<ApiSuccess<Partner>>(
        `/sponsorships/${editing.sponsorshipId}`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success(data.message || "Record updated.");
      await fetchPartners();
      setFormOpen(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update record.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  function buildPayload(form: PartnerFormData): FormData {
    const payload = new FormData();
    payload.append("eventId", String(eventId));
    payload.append("type", form.type);
    payload.append("organizationName", form.organizationName.trim());
    payload.append("website", form.website.trim());
    payload.append("description", form.description.trim());
    payload.append("tier", form.tier);
    payload.append("status", form.status);
    payload.append("currency", form.currency);
    const agreed = toNumberOrNull(form.agreedAmount);
    const paid = toNumberOrNull(form.amountPaid);
    if (agreed != null) payload.append("agreedAmount", String(agreed));
    if (paid != null) payload.append("amountPaid", String(paid));
    payload.append("paymentStatus", form.paymentStatus);
    payload.append("invoiceNumber", form.invoiceNumber.trim());
    if (form.invoiceDate) payload.append("invoiceDate", form.invoiceDate);
    if (form.logo) payload.append("logo", form.logo);
    return payload;
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/sponsorships/${id}`);
      toast.success("Record deleted.");
      setDeleteId(null);
      if (activeId === id) setActiveId(null);
      await fetchPartners();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete record.");
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(p: Partner) {
    setEditing(p);
    setFormOpen(true);
  }

  return (
    <Layout>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%) scale(0.98); }
          to { transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <PageTitle>Partnerships & Sponsorships</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Manage your sponsor pipeline, confirmed partners, tiers, deliverables, and payments.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              layout="outline"
              className="rounded-2xl h-12 border-2"
              onClick={fetchPartners}
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </span>
            </Button>
            <Button
              className="rounded-2xl h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              onClick={openCreate}
            >
              <span className="inline-flex items-center gap-2 font-bold">
                <Plus className="w-5 h-5" />
                New
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Handshake className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
          label="Total Records"
          value={stats.total}
          tone="slate"
        />
        <StatCard
          icon={<CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />}
          label="Confirmed"
          value={stats.confirmed}
          tone="green"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          label="Committed Value"
          value={formatCurrency(stats.committed)}
          tone="blue"
        />
        <StatCard
          icon={<CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          label="Received"
          value={formatCurrency(stats.received)}
          tone="amber"
        />
      </div>

      {/* Controls */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="relative flex-1">
            <Input
              className="pl-12 h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 font-semibold focus:border-green-500 focus:ring-green-500"
              placeholder="Search by organization, website, or contact..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
          </div>

          <select
            className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">All tiers</option>
            {TIERS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-2xl border-2 border-gray-200 dark:border-gray-600 p-1">
            <button
              onClick={() => setView("pipeline")}
              className={`inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold transition-all ${
                view === "pipeline"
                  ? "bg-green-600 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Pipeline
            </button>
            <button
              onClick={() => setView("directory")}
              className={`inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold transition-all ${
                view === "directory"
                  ? "bg-green-600 text-white shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-4 h-4" />
              Directory
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
          <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
            Loading records...
          </p>
        </div>
      ) : view === "pipeline" ? (
        /* ── Pipeline Board ── */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUSES.map((stage) => {
              const items = byStatus[stage.key] || [];
              const isOver = dragOver === stage.key;
              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(stage.key);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === stage.key ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = Number(e.dataTransfer.getData("text/plain"));
                    if (id) moveToStatus(id, stage.key);
                  }}
                  className={`w-72 shrink-0 rounded-3xl border-2 p-3 transition-colors ${
                    isOver
                      ? "border-green-400 bg-green-50/60 dark:bg-green-900/10"
                      : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between px-2 py-1 mb-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.label}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{items.length}</span>
                  </div>

                  <div className="space-y-3 min-h-[60px]">
                    {items.map((p) => (
                      <BoardCard
                        key={p.sponsorshipId}
                        partner={p}
                        onOpen={() => setActiveId(p.sponsorshipId)}
                        onDragStart={(e) =>
                          e.dataTransfer.setData("text/plain", String(p.sponsorshipId))
                        }
                      />
                    ))}
                    {items.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Drop here</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Directory Table ── */
        <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="py-4 px-4">Organization</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Tier</th>
                  <th className="py-4 px-4">Stage</th>
                  <th className="py-4 px-4">Agreed</th>
                  <th className="py-4 px-4">Payment</th>
                  <th className="py-4 px-4">Deliverables</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      <Handshake className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="mt-4 font-semibold">
                        {search || typeFilter !== "all" || tierFilter !== "all"
                          ? "No matching records"
                          : "No sponsors or partners yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((p) => (
                    <tr
                      key={p.sponsorshipId}
                      className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <LogoAvatar name={p.organizationName} logoUrl={p.logoUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {p.organizationName}
                            </p>
                            {p.website && (
                              <p className="text-xs text-gray-400 truncate">{p.website}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4"><TypeBadge type={p.type} /></td>
                      <td className="py-4 px-4"><TierBadge tier={p.tier} /></td>
                      <td className="py-4 px-4"><StatusBadge status={p.status} /></td>
                      <td className="py-4 px-4 font-bold whitespace-nowrap">
                        {formatCurrency(p.agreedAmount, p.currency)}
                      </td>
                      <td className="py-4 px-4"><PaymentBadge status={p.paymentStatus} /></td>
                      <td className="py-4 px-4"><DeliverableProgress deliverables={p.deliverables} /></td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setActiveId(p.sponsorshipId)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.sponsorshipId)}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
              <Pagination
                totalResults={filtered.length}
                resultsPerPage={ITEMS_PER_PAGE}
                onChange={setCurrentPage}
                label="Records navigation"
              />
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 p-6 animate-slideUp">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Delete this record and all its contacts, deliverables, and documents? This can't be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <Button layout="outline" className="rounded-2xl h-12 flex-1 border-2" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                className="rounded-2xl h-12 flex-1 bg-red-600 border-0 hover:bg-red-700"
                onClick={() => handleDelete(deleteId)}
              >
                <span className="font-bold">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <PartnerDetailModal
        partner={activePartner}
        onClose={() => setActiveId(null)}
        onEdit={(p) => {
          setActiveId(null);
          openEdit(p);
        }}
        onChanged={fetchPartners}
      />

      <PartnerFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleUpdate : handleCreate}
        submitting={submitting}
        initialData={editing ? partnerToForm(editing) : EMPTY_FORM}
        mode={editing ? "edit" : "create"}
      />

      <div className="pb-20" />
    </Layout>
  );
}