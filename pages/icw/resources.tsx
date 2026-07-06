import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Input, Button, Badge, Pagination } from "@roketid/windmill-react-ui";
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Upload as UploadIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
//   FilePdf,
  FileSpreadsheet,
  FileVideo,
  Music,
  Clock,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Filter,
  BookOpen,
  Users,
  Building,
  Heart,
  Award,
  Shield,
  FileDigitIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Resource = {
  id: number;
  title: string;
  description: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  uploadedBy: {
    id: number;
    firstName: string;
    email: string;
    uniqueId: string;
  };
  approvedBy?: {
    id: number;
    name: string;
  };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  downloads: number;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ApiPaginatedResponse<T> = {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type UploadFormData = {
  title: string;
  description: string;
  category: string;
  file: File | null;
};

type FormErrors = Partial<Record<keyof UploadFormData, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const RESOURCE_CATEGORIES = [
  "Presentation",
  "Seminar Paper",
  "Research Material",
  "Abstract",
  "Event Material",
  "Workshop Guide",
  "Video Recording",
  "Audio Recording",
  "Data Set",
  "Other",
];

const ITEMS_PER_PAGE = 10;

// ─── Helper Components ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const icons = {
    pending: <ClockIcon className="w-3 h-3 mr-1" />,
    approved: <CheckCircle className="w-3 h-3 mr-1" />,
    rejected: <XCircle className="w-3 h-3 mr-1" />,
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

function getFileIcon(fileType: string) {
  const type = fileType?.toLowerCase() || "";
  if (type.includes("pdf")) return <FileDigitIcon className="w-5 h-5 text-red-500" />;
  if (type.includes("image") || type.includes("jpg") || type.includes("png") || type.includes("jpeg") || type.includes("gif"))
    return <FileImage className="w-5 h-5 text-blue-500" />;
  if (type.includes("video") || type.includes("mp4") || type.includes("avi") || type.includes("mov"))
    return <FileVideo className="w-5 h-5 text-purple-500" />;
  if (type.includes("audio") || type.includes("mp3") || type.includes("wav"))
    return <Music className="w-5 h-5 text-indigo-500" />;
  if (type.includes("zip") || type.includes("rar") || type.includes("7z"))
    return <FileArchive className="w-5 h-5 text-amber-500" />;
  if (type.includes("sheet") || type.includes("xls") || type.includes("csv"))
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────

function UploadModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UploadFormData) => Promise<void>;
  submitting: boolean;
}) {
  const [formData, setFormData] = useState<UploadFormData>({
    title: "",
    description: "",
    category: "",
    file: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ title: "", description: "", category: "", file: null });
      setErrors({});
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
      setErrors((prev) => ({ ...prev, file: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required.";
    if (!formData.description.trim()) newErrors.description = "Description is required.";
    if (!formData.category) newErrors.category = "Please select a category.";
    if (!formData.file) newErrors.file = "Please select a file to upload.";
    else if (formData.file.size > 50 * 1024 * 1024) {
      newErrors.file = "File size must be less than 50MB.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 sticky top-0 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Upload Resource
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Share your research, presentations, or materials with other participants
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
              placeholder="Enter resource title"
              value={formData.title}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, title: e.target.value }));
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full h-32 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm font-medium focus:border-teal-500 focus:ring-teal-500 transition-colors resize-none"
              placeholder="Describe your resource (purpose, content, etc.)"
              value={formData.description}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, description: e.target.value }));
                setErrors((prev) => ({ ...prev, description: undefined }));
              }}
            />
            <FieldError message={errors.description} />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
              value={formData.category}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, category: e.target.value }));
                setErrors((prev) => ({ ...prev, category: undefined }));
              }}
            >
              <option value="">Select a category</option>
              {RESOURCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <FieldError message={errors.category} />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              File <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-500 transition-colors text-gray-600 dark:text-gray-400 hover:text-teal-600"
              >
                <UploadIcon className="w-5 h-5" />
                <span className="font-semibold">Choose File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              {formData.file && (
                <div className="flex items-center gap-2 text-sm">
                  {getFileIcon(formData.file.name)}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formData.file.name}
                  </span>
                  <span className="text-gray-400">({formatFileSize(formData.file.size)})</span>
                </div>
              )}
            </div>
            <FieldError message={errors.file} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <Button
              layout="outline"
              className="rounded-2xl h-12 border-2"
              onClick={onClose}
              type="button"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-2xl h-12 bg-gradient-to-r from-teal-600 to-emerald-600 border-0 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25 disabled:opacity-60"
              disabled={submitting}
            >
              <span className="inline-flex items-center gap-2 font-bold uppercase">
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadIcon className="w-4 h-4" />
                )}
                {submitting ? "Uploading..." : "Upload Resource"}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── View Resource Modal ─────────────────────────────────────────────────────

function ViewResourceModal({
  isOpen,
  onClose,
  resource,
}: {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
}) {
  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 sticky top-0 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Resource Details
              </h3>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600">
              {getFileIcon(resource.fileType)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                {resource.title}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {resource.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Category
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {resource.category}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </p>
              <StatusBadge status={resource.status} />
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Uploaded By
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {resource.uploaded_by.firstName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {resource.uploaded_by?.uniqueId}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                File Size
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatFileSize(resource.fileSize)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Uploaded At
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatDate(resource.createdAt)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Downloads
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {resource.downloads}
              </p>
            </div>
          </div>

          {resource.approvedAt && (
            <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
              <p className="text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
                Approved
              </p>
              <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                {formatDate(resource.approvedAt)} by {resource.approvedBy?.name || "Admin"}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl flex gap-3">
          <Button
            onClick={() => window.open(resource.filePath, "_blank")}
            className="flex-1 rounded-2xl h-12 bg-gradient-to-r from-teal-600 to-emerald-600 border-0 hover:from-teal-700 hover:to-emerald-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
          <Button
            layout="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl h-12 border-2"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResourceManagementPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [userRole, setUserRole] = useState<"admin" | "participant">("participant");

  // ── Fetch resources ────────────────────────────────────────────────────

  async function fetchResources() {
    try {
      setLoading(true);
      const response = await api.get<ApiPaginatedResponse<Resource>>(
        "/resources"
      );
      setResources(response.data.data.items || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
      setResources([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResources();
    // Check user role from auth context
    // setUserRole(user?.role === "admin" ? "admin" : "participant");
  }, []);

  // ── Search, filter, and pagination ────────────────────────────────────

  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.uploadedBy.firstName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === filterStatus);
    }

    // Filter by category
    if (filterCategory !== "all") {
      filtered = filtered.filter((r) => r.category === filterCategory);
    }

    return filtered;
  }, [resources, searchQuery, filterStatus, filterCategory]);

  const paginatedResources = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredResources.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredResources, currentPage]);

  const totalPages = Math.ceil(filteredResources.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  // ── Upload resource ────────────────────────────────────────────────────

  async function handleUpload(formData: UploadFormData) {
    try {
      setSubmitting(true);

      const payload = new FormData();
      payload.append("title", formData.title);
      payload.append("description", formData.description);
      payload.append("category", formData.category);
      if (formData.file) {
        payload.append("file", formData.file);
      }

      const { data } = await api.post<ApiResponse<Resource>>(
        "/resources/upload",
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(data.message || "Resource uploaded successfully!");
      await fetchResources();
      setIsUploadModalOpen(false);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Upload failed. Please try again.";
      toast.error(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  // ── Approve/Reject resource (admin only) ─────────────────────────────

  async function handleApprove(id: number) {
    try {
      const { data } = await api.patch<ApiResponse<Resource>>(
        `/resources/${id}/approve`
      );
      toast.success(data.message || "Resource approved!");
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve resource");
    }
  }

  async function handleReject(id: number) {
    try {
      const { data } = await api.patch<ApiResponse<Resource>>(
        `/resources/${id}/reject`
      );
      toast.success(data.message || "Resource rejected!");
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject resource");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      const { data } = await api.delete<ApiResponse<Resource>>(
        `/resources/${id}`
      );
      toast.success(data.message || "Resource deleted!");
      await fetchResources();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete resource");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Layout>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%) scale(0.95); }
          to { transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <PageTitle>Resource Library</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Share and access conference resources, presentations, research materials, and more
            </p>
          </div>

          <Button
            className="rounded-2xl h-12 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 border-0 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <span className="inline-flex items-center gap-2 font-bold">
              <UploadIcon className="w-5 h-5" />
              Upload Resource
            </span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Input
              className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm text-base font-semibold focus:border-teal-500 focus:ring-teal-500 transition-all duration-200"
              placeholder="Search resources by title, description, category, or uploader..."
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

          <div className="flex gap-3">
            <select
              className="h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              className="h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Categories</option>
              {RESOURCE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {loading ? "Loading..." : `${filteredResources.length} resource${filteredResources.length === 1 ? "" : "s"} found`}
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-20 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
            {searchQuery || filterStatus !== "all" || filterCategory !== "all"
              ? "No matching resources found"
              : "No resources uploaded yet"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            {!searchQuery && filterStatus === "all" && filterCategory === "all" &&
              "Be the first to share your research, presentation, or materials"}
          </p>
          {!searchQuery && filterStatus === "all" && filterCategory === "all" && (
            <Button
              className="mt-6 rounded-2xl h-12 bg-gradient-to-r from-teal-600 to-emerald-600 border-0"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload Resource
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginatedResources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`h-1.5 ${
                resource.status === "approved" ? "bg-green-500" :
                resource.status === "rejected" ? "bg-red-500" : "bg-yellow-500"
              }`} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600">
                      {getFileIcon(resource.fileType)}
                    </div>
                    <div>
                      <StatusBadge status={resource.status} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(resource.createdAt)}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                  {resource.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {resource.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {resource.downloads}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {resource.uploaded_by.firstName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewingResource(resource)}
                    className="flex-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Eye className="w-4 h-4 inline-block mr-1" />
                    View
                  </button>

                  {userRole === "admin" && resource.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(resource.id)}
                        className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(resource.id)}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {(userRole === "admin" || resource.uploaded_by.id === 1) && (
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 px-4 py-2.5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredResources.length > 0 && (
        <div className="mt-8">
          <Pagination
            totalResults={filteredResources.length}
            resultsPerPage={ITEMS_PER_PAGE}
            onChange={setCurrentPage}
            label="Resources navigation"
          />
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUpload}
        submitting={submitting}
      />

      {/* View Resource Modal */}
      <ViewResourceModal
        isOpen={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource}
      />
    </Layout>
  );
}