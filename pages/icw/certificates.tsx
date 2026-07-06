import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input, Button, Pagination } from "@roketid/windmill-react-ui";
import {
  Award,
  Search,
  Loader2,
  X,
  Users,
  Mail,
  Download,
  Eye,
  Send,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileText,
  BadgeCheck,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────

type IssuedCertificate = {
  certificateId: number;
  type: string; // certificate type key
  issuedAt: string | null;
  sentAt: string | null;
};

type CertificateRecipient = {
  attendeeId: number;
  fullName: string;
  uniqueId: string | null;
  title?: string | null;
  email: string | null;
  phoneNumber: string | null;
  gender: string | null;
  category: string | null;
  organizationName: string | null;
  photoUrl: string | null;
  accreditedAt: string | null;
  certificates: IssuedCertificate[];
};

type RecipientsResponse = {
  recipients: CertificateRecipient[];
};

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const eventId = 1;
const ITEMS_PER_PAGE = 10;

// Certificate types the system can issue. Add/rename freely — `key` is what the
// backend receives, `label` is the full title, `short` is used for table chips.
const CERTIFICATE_TYPES = [
  { key: "attendance", label: "Certificate of Attendance", short: "Attendance" },
  { key: "participation", label: "Certificate of Participation", short: "Participation" },
  { key: "speaker", label: "Speaker Certificate", short: "Speaker" },
  { key: "facilitator", label: "Facilitator Certificate", short: "Facilitator" },
  { key: "exhibitor", label: "Exhibitor Certificate", short: "Exhibitor" },
] as const;

const DEFAULT_TYPE = CERTIFICATE_TYPES[0].key;

// Category display mapping (backend value -> friendly label)
const CATEGORY_MAP: Record<string, string> = {
  healthcare_professional: "Healthcare Professional",
  researcher: "Researcher",
  government_official: "Government Official",
  development_partner: "Development Partner",
  student: "Student",
  cancer_survivor: "Cancer Survivor",
  media_representative: "Media Representative",
  general_public: "General Public",
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getCategoryDisplayName(value?: string | null): string {
  if (!value) return "—";
  return CATEGORY_MAP[value] || value;
}

function getCertType(key: string) {
  return CERTIFICATE_TYPES.find((t) => t.key === key);
}

function getCertTypeLabel(key: string): string {
  return getCertType(key)?.label || key;
}

function getCertTypeShort(key: string): string {
  return getCertType(key)?.short || key;
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

function resolvePhotoUrl(photoUrl?: string | null): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }
  return `${process.env.NEXT_PUBLIC_API_FILE_URL || ""}${photoUrl}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Error bodies come back as a Blob when responseType is "blob", so parse them.
async function parseBlobError(err: any, fallback: string): Promise<string> {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return err?.response?.data?.message || fallback;
}

// Generate a certificate PDF and return it as a Blob (used for preview/download).
async function generateCertificateBlob(
  attendeeId: number,
  type: string
): Promise<Blob> {
  const res = await api.post(
    `/events/${eventId}/certificates/generate`,
    { attendeeId, type },
    { responseType: "blob" }
  );
  return res.data as Blob;
}

// ─── Helper Components ──────────────────────────────────────────────────────

function PassportAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string | null;
}) {
  const resolved = resolvePhotoUrl(photoUrl);

  return resolved ? (
    <img
      src={resolved}
      alt={name}
      className="h-12 w-12 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shrink-0"
    />
  ) : (
    <div className="h-12 w-12 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 shrink-0">
      <User className="w-5 h-5" />
    </div>
  );
}

function CertificateChips({
  certificates,
}: {
  certificates: IssuedCertificate[];
}) {
  if (!certificates || certificates.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-400">
        <AlertCircle className="w-3.5 h-3.5" />
        Not issued
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {certificates.map((cert) => {
        const sent = Boolean(cert.sentAt);
        return (
          <span
            key={cert.certificateId}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
              sent
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            }`}
            title={
              sent
                ? `${getCertTypeLabel(cert.type)} — sent ${formatDate(cert.sentAt)}`
                : `${getCertTypeLabel(cert.type)} — issued, not sent`
            }
          >
            {sent ? (
              <BadgeCheck className="w-3 h-3" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            {getCertTypeShort(cert.type)}
          </span>
        );
      })}
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
  value: number;
  tone: "green" | "blue" | "amber";
}) {
  const tones = {
    green: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300",
    blue: "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300",
    amber: "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 text-amber-700 dark:text-amber-300",
  };

  return (
    <div
      className={`rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-gradient-to-br ${tones[tone]} p-5 flex items-center gap-4`}
    >
      <div className="rounded-2xl bg-white/70 dark:bg-gray-800/60 p-3 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─── Certificate Modal ──────────────────────────────────────────────────────

function CertificateModal({
  recipient,
  onClose,
  onChanged,
}: {
  recipient: CertificateRecipient | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [selectedType, setSelectedType] = useState<string>(DEFAULT_TYPE);
  const [busy, setBusy] = useState<"preview" | "download" | "email" | null>(
    null
  );
  const [rowBusy, setRowBusy] = useState<string | null>(null); // "download:<type>" | "resend:<type>"

  useEffect(() => {
    if (recipient) {
      setSelectedType(DEFAULT_TYPE);
      setBusy(null);
      setRowBusy(null);
    }
  }, [recipient?.attendeeId]);

  if (!recipient) return null;

  const hasEmail = Boolean(recipient.email);

  async function handlePreview() {
    try {
      setBusy("preview");
      const blob = await generateCertificateBlob(recipient!.attendeeId, selectedType);
      openBlobInNewTab(blob);
    } catch (err) {
      toast.error(await parseBlobError(err, "Failed to generate certificate."));
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload(type: string, rowKey?: string) {
    try {
      if (rowKey) setRowBusy(rowKey);
      else setBusy("download");
      const blob = await generateCertificateBlob(recipient!.attendeeId, type);
      const idPart = recipient!.uniqueId || recipient!.attendeeId;
      triggerBlobDownload(blob, `${idPart}-${type}-certificate.pdf`);
      await onChanged();
    } catch (err) {
      toast.error(await parseBlobError(err, "Failed to download certificate."));
    } finally {
      setBusy(null);
      setRowBusy(null);
    }
  }

  async function handleEmail(type: string, rowKey?: string) {
    if (!hasEmail) {
      toast.error("This participant has no email on record.");
      return;
    }
    try {
      if (rowKey) setRowBusy(rowKey);
      else setBusy("email");
      const { data } = await api.post<ApiSuccess<null>>(
        `/events/${eventId}/certificates/send`,
        { attendeeId: recipient!.attendeeId, type }
      );
      toast.success(data.message || "Certificate emailed successfully!");
      await onChanged();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to email certificate."
      );
    } finally {
      setBusy(null);
      setRowBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-slideUp">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wide mb-2">
                <Award className="w-3.5 h-3.5" />
                Certificate
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase break-words">
                {recipient.fullName}
              </h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 font-mono">
                {recipient.uniqueId || "—"}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Participant summary */}
          <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
            <PassportAvatar name={recipient.fullName} photoUrl={recipient.photoUrl} />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-gray-900 dark:text-white uppercase">
                {getCategoryDisplayName(recipient.category)}
              </p>
              <p className="mt-0.5 text-gray-500 dark:text-gray-400 truncate">
                {recipient.email || "No email on record"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Accredited {formatDate(recipient.accreditedAt)}
              </p>
            </div>
          </div>

          {/* Type selector + actions */}
          <div>
            <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Certificate Type
            </label>
            <select
              className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                layout="outline"
                className="rounded-2xl h-12 border-2"
                onClick={handlePreview}
                disabled={busy !== null}
              >
                <span className="inline-flex items-center justify-center gap-2 w-full font-semibold">
                  {busy === "preview" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  Preview
                </span>
              </Button>

              <Button
                layout="outline"
                className="rounded-2xl h-12 border-2"
                onClick={() => handleDownload(selectedType)}
                disabled={busy !== null}
              >
                <span className="inline-flex items-center justify-center gap-2 w-full font-semibold">
                  {busy === "download" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download
                </span>
              </Button>

              <Button
                className="rounded-2xl h-12 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 disabled:opacity-60"
                onClick={() => handleEmail(selectedType)}
                disabled={busy !== null || !hasEmail}
                title={hasEmail ? "Email certificate" : "No email on record"}
              >
                <span className="inline-flex items-center justify-center gap-2 w-full font-bold">
                  {busy === "email" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Email
                </span>
              </Button>
            </div>

            {!hasEmail && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                No email on record — emailing is disabled.
              </p>
            )}
          </div>

          {/* Issued certificates */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Issued Certificates
            </h4>

            {recipient.certificates.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4">
                No certificates issued for this participant yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recipient.certificates.map((cert) => {
                  const dlKey = `download:${cert.type}`;
                  const reKey = `resend:${cert.type}`;
                  return (
                    <div
                      key={cert.certificateId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 dark:border-gray-700 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                          {getCertTypeLabel(cert.type)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Issued {formatDate(cert.issuedAt)}
                          {cert.sentAt ? (
                            <span className="inline-flex items-center gap-1 ml-2 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Sent {formatDate(cert.sentAt)}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDownload(cert.type, dlKey)}
                          disabled={rowBusy !== null}
                          className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                          title="Download"
                        >
                          {rowBusy === dlKey ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEmail(cert.type, reKey)}
                          disabled={rowBusy !== null || !hasEmail}
                          className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={hasEmail ? "Resend" : "No email on record"}
                        >
                          {rowBusy === reKey ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Button
            layout="outline"
            className="w-full rounded-2xl h-12 border-2"
            onClick={onClose}
          >
            <span className="font-semibold">Close</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function CertificateManagementPage() {
  const [recipients, setRecipients] = useState<CertificateRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [activeId, setActiveId] = useState<number | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkType, setBulkType] = useState<string>(DEFAULT_TYPE);
  const [bulkSending, setBulkSending] = useState(false);

  async function fetchRecipients() {
    try {
      setLoading(true);
      const { data } = await api.get<ApiSuccess<RecipientsResponse>>(
        `/events/${eventId}/certificates/recipients`
      );
      setRecipients(data.data.recipients || []);
    } catch (err) {
      toast.error("Failed to load certificate recipients.");
      setRecipients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecipients();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recipients;
    return recipients.filter((r) => {
      const name = r.fullName?.toLowerCase() || "";
      const id = r.uniqueId?.toLowerCase() || "";
      const phone = r.phoneNumber?.toLowerCase() || "";
      const email = r.email?.toLowerCase() || "";
      const category = getCategoryDisplayName(r.category).toLowerCase();
      return (
        name.includes(q) ||
        id.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        category.includes(q)
      );
    });
  }, [recipients, searchQuery]);

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
    const eligible = recipients.length;
    const issued = recipients.filter((r) => r.certificates.length > 0).length;
    const sent = recipients.filter((r) =>
      r.certificates.some((c) => c.sentAt)
    ).length;
    return { eligible, issued, sent };
  }, [recipients]);

  const activeRecipient = useMemo(
    () => recipients.find((r) => r.attendeeId === activeId) || null,
    [recipients, activeId]
  );

  // ── Selection ──
  const allOnPageSelected =
    paginated.length > 0 && paginated.every((r) => selectedIds.has(r.attendeeId));

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginated.forEach((r) => next.delete(r.attendeeId));
      } else {
        paginated.forEach((r) => next.add(r.attendeeId));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkSend() {
    const attendeeIds = Array.from(selectedIds);
    if (attendeeIds.length === 0) return;

    try {
      setBulkSending(true);
      const { data } = await api.post<
        ApiSuccess<{ generated: number; sent: number; skipped: number }>
      >(`/events/${eventId}/certificates/bulk-send`, {
        attendeeIds,
        type: bulkType,
      });

      toast.success(
        data.message ||
          `Generated and sent ${data.data?.sent ?? attendeeIds.length} ${getCertTypeShort(
            bulkType
          )} certificate(s).`,
        { duration: 5000 }
      );

      await fetchRecipients();
      clearSelection();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Bulk generate & send failed."
      );
    } finally {
      setBulkSending(false);
    }
  }

  // ── Render ──
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
            transform: translateY(100%) scale(0.98);
          }
          to {
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <PageTitle>Certificate Management</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Issue, download, and email certificates to accredited attendees.
            </p>
          </div>

          <Button
            layout="outline"
            className="rounded-2xl h-12 px-6 border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            onClick={fetchRecipients}
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-6 h-6 text-green-600 dark:text-green-400" />}
          label="Eligible (Accredited)"
          value={stats.eligible}
          tone="green"
        />
        <StatCard
          icon={<FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          label="Issued"
          value={stats.issued}
          tone="blue"
        />
        <StatCard
          icon={<BadgeCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          label="Sent"
          value={stats.sent}
          tone="amber"
        />
      </div>

      {/* Search */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 mb-6">
        <div className="relative">
          <Input
            className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm text-base font-semibold focus:border-green-500 focus:ring-green-500 transition-all duration-200"
            placeholder="Search by name, unique ID, email, phone, or category..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center mr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {loading
            ? "Loading..."
            : `${filtered.length} accredited attendee${
                filtered.length === 1 ? "" : "s"
              }`}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="rounded-3xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <p className="text-sm font-bold text-green-800 dark:text-green-300 uppercase tracking-wide whitespace-nowrap">
              {selectedIds.size} selected
            </p>

            <select
              className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors sm:ml-auto"
              value={bulkType}
              onChange={(e) => setBulkType(e.target.value)}
              disabled={bulkSending}
            >
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>

            <Button
              className="rounded-2xl h-12 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg disabled:opacity-60"
              onClick={handleBulkSend}
              disabled={bulkSending}
            >
              <span className="inline-flex items-center justify-center gap-2 font-bold uppercase">
                {bulkSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {bulkSending ? "Sending..." : "Generate & Send"}
              </span>
            </Button>

            <Button
              layout="outline"
              className="rounded-2xl h-12 border-2"
              onClick={clearSelection}
              disabled={bulkSending}
            >
              <span className="font-semibold">Clear</span>
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="py-4 px-4">#</th>
                <th className="py-4 px-4">Photo</th>
                <th className="py-4 px-4">Attendee ID</th>
                <th className="py-4 px-4">Full Name</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Accredited</th>
                <th className="py-4 px-4">Certificates</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                    <p className="mt-4 font-semibold">Loading recipients...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <Award className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-4 font-semibold">
                      {searchQuery
                        ? "No matching attendees found"
                        : "No accredited attendees yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginated.map((r, index) => {
                  const isSelected = selectedIds.has(r.attendeeId);
                  return (
                    <tr
                      key={r.attendeeId}
                      className={`border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-150 ${
                        isSelected
                          ? "bg-green-50/60 dark:bg-green-900/10"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                          checked={isSelected}
                          onChange={() => toggleSelected(r.attendeeId)}
                          aria-label={`Select ${r.fullName}`}
                        />
                      </td>
                      <td className="py-4 px-4 font-medium text-gray-400">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="py-4 px-4">
                        <PassportAvatar name={r.fullName} photoUrl={r.photoUrl} />
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-bold uppercase">
                        {r.uniqueId || "—"}
                      </td>
                      <td className="py-4 px-4 font-bold uppercase whitespace-nowrap">
                        {r.title ? `${r.title} ` : ""}
                        {r.fullName}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold uppercase max-w-[140px] truncate">
                        {getCategoryDisplayName(r.category)}
                      </td>
                      <td className="py-4 px-4 text-xs whitespace-nowrap">
                        {formatDate(r.accreditedAt)}
                      </td>
                      <td className="py-4 px-4">
                        <CertificateChips certificates={r.certificates} />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end">
                          <Button
                            layout="outline"
                            size="small"
                            className="rounded-xl border-2"
                            onClick={() => setActiveId(r.attendeeId)}
                          >
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <Award className="w-4 h-4" />
                              Certificate
                            </span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Pagination
              totalResults={filtered.length}
              resultsPerPage={ITEMS_PER_PAGE}
              onChange={setCurrentPage}
              label="Recipients navigation"
            />
          </div>
        )}
      </div>

      <CertificateModal
        recipient={activeRecipient}
        onClose={() => setActiveId(null)}
        onChanged={fetchRecipients}
      />

      <div className="pb-20" />
    </Layout>
  );
}