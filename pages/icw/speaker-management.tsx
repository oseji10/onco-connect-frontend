import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Mail,
  Phone,
  MapPin,
  Building,
  FileText,
  Download,
  Mic,
  Linkedin,
  Twitter,
  Accessibility,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { SUB_THEMES, SessionType, formatDate, SpeakerStatus } from "../../types/speaker-constants";

const ITEMS_PER_PAGE = 10;

// ─── Types ────────────────────────────────────────────────────────────────

type Speaker = {
  id: number;
  reference: string;
  title: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  country: string;
  state: string;
  organization: string;
  jobTitle: string;
  bio: string;
  sessionType: SessionType;
  subTheme: string;
  sessionTitle: string;
  sessionDescription: string;
  participationType: "Physical" | "Virtual";
  photoUrl: string | null;
  cvUrl: string | null;
  linkedinUrl?: string;
  twitterHandle?: string;
  physicallyChallenged: boolean;
  accessibilityNeeds?: string | null;
  status: SpeakerStatus;
  submittedAt: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────

function subThemeLabel(value: string) {
  return SUB_THEMES.find((s) => s.value === value)?.label ?? value;
}

function StatusBadge({ status }: { status: SpeakerStatus }) {
  const styles: Record<SpeakerStatus, string> = {
    submitted: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const icons: Record<SpeakerStatus, React.ReactNode> = {
    submitted: <ClockIcon className="w-3 h-3 mr-1" />,
    confirmed: <CheckCircle className="w-3 h-3 mr-1" />,
    rejected: <XCircle className="w-3 h-3 mr-1" />,
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ─── View Speaker Modal ─────────────────────────────────────────────────

function ViewSpeakerModal({
  speaker,
  onClose,
  onDecision,
}: {
  speaker: Speaker | null;
  onClose: () => void;
  onDecision: (id: number, status: "confirmed" | "rejected") => void;
}) {
  if (!speaker) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 sticky top-0 flex items-start justify-between">
          <div className="flex items-center gap-4 min-w-0">
            {speaker.photoUrl ? (
              <img
                src={speaker.photoUrl}
                alt={speaker.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center shrink-0">
                <Mic className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {speaker.title} {speaker.fullName}
              </h3>
              <p className="text-xs text-gray-500">{speaker.reference}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={speaker.status} />
            <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
              {speaker.sessionType}
            </span>
            <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              {speaker.participationType}
            </span>
            {speaker.physicallyChallenged && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800">
                <Accessibility className="w-3 h-3" />
                Accessibility support
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Sub-theme</p>
            <p className="text-sm font-semibold text-gray-900">{subThemeLabel(speaker.subTheme)}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Proposed Session</p>
            <p className="text-sm font-bold text-gray-900">{speaker.sessionTitle}</p>
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">
              {speaker.sessionDescription}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-1">Bio</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{speaker.bio}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
              <Building className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Organization</p>
                <p className="text-sm font-semibold text-gray-900">{speaker.organization}</p>
                <p className="text-xs text-gray-500">{speaker.jobTitle}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Location</p>
                <p className="text-sm font-semibold text-gray-900">
                  {speaker.state}, {speaker.country}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Email</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{speaker.email}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Phone</p>
                <p className="text-sm font-semibold text-gray-900">
                  {speaker.phoneCountryCode} {speaker.phoneNumber}
                </p>
              </div>
            </div>
          </div>

          {(speaker.linkedinUrl || speaker.twitterHandle) && (
            <div className="flex gap-4 text-sm">
              {speaker.linkedinUrl && (
                <a
                  href={speaker.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-700 hover:underline"
                >
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              )}
              {speaker.twitterHandle && (
                <span className="inline-flex items-center gap-1.5 text-gray-600">
                  <Twitter className="w-4 h-4" /> {speaker.twitterHandle}
                </span>
              )}
            </div>
          )}

          {speaker.physicallyChallenged && speaker.accessibilityNeeds && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-xs font-bold uppercase text-amber-700 mb-1">Accessibility details</p>
              <p className="text-sm text-amber-900">{speaker.accessibilityNeeds}</p>
            </div>
          )}

          {speaker.cvUrl && (
            <a
              href={speaker.cvUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 hover:border-indigo-400 text-sm font-semibold text-gray-700"
            >
              <FileText className="w-4 h-4" />
              View CV
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button
            onClick={() => onDecision(speaker.id, "confirmed")}
            className="flex-1 h-11 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold inline-flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Confirm
          </button>
          <button
            onClick={() => onDecision(speaker.id, "rejected")}
            className="flex-1 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold inline-flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
          <button
            onClick={onClose}
            className="h-11 px-5 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function SpeakerManagementPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSessionType, setFilterSessionType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingSpeaker, setViewingSpeaker] = useState<Speaker | null>(null);

  async function fetchSpeakers() {
    try {
      setLoading(true);
      const { data } = await api.get("/speakers");
      setSpeakers(data?.data?.items || []);
    } catch (err) {
      toast.error("Failed to load speakers.");
      setSpeakers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSpeakers();
  }, []);

  async function handleDecision(id: number, status: "confirmed" | "rejected") {
    try {
      await api.patch(`/speakers/${id}/status`, { status });
      toast.success(`Speaker ${status}.`);
      setViewingSpeaker(null);
      await fetchSpeakers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  }

  const filtered = useMemo(() => {
    let list = [...speakers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.reference.toLowerCase().includes(q) ||
          s.organization.toLowerCase().includes(q) ||
          s.sessionTitle.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") list = list.filter((s) => s.status === filterStatus);
    if (filterSessionType !== "all") list = list.filter((s) => s.sessionType === filterSessionType);
    return list;
  }, [speakers, searchQuery, filterStatus, filterSessionType]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <PageTitle>Speaker Management</PageTitle>
        <p className="mt-2 text-sm text-gray-600">Review speaker registrations and confirm session slots</p>
      </div>

      {/* Search and filters */}
      <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              className="pl-12 h-14 w-full rounded-2xl border-2 border-gray-200 text-base font-semibold focus:border-teal-500 focus:ring-teal-500 outline-none"
              placeholder="Search by name, reference, organization, or session..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
              <Search className="w-5 h-5" />
            </div>
          </div>
          <select
            className="h-14 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="h-14 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold"
            value={filterSessionType}
            onChange={(e) => {
              setFilterSessionType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Session Types</option>
            <option value="Keynote">Keynote</option>
            <option value="Plenary">Plenary</option>
            <option value="Panel">Panel</option>
            <option value="Breakout">Breakout</option>
          </select>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          {loading ? "Loading..." : `${filtered.length} speaker${filtered.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl p-20 text-center text-gray-500">
          No speaker registrations match the current filters.
        </div>
      ) : (
        <div className="rounded-3xl bg-white border-2 border-gray-100 shadow-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
              <tr>
                <th className="text-left px-5 py-3">Speaker</th>
                <th className="text-left px-5 py-3">Session</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.fullName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                          <Mic className="w-4 h-4 text-gray-400" />
                        </div>
                      )}

                      {/* {s.photoUrl ? (
                                    <img
                                      src={`${process.env.NEXT_PUBLIC_API_FILE_URL}${s.photoUrl}`}
                                      width="20%"
                                      alt={s.fullName}
                                    />
                                  ) : s.photoUrl ? (
                                    <img src={s.photoUrl} alt={s.fullName} />
                                  ) : (
                                    <div className="w-24 h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                                      
                                      <Mic className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )} */}

                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {s.title} {s.fullName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{s.reference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 max-w-[220px]">
                    <p className="text-gray-900 font-medium line-clamp-1">{s.sessionTitle}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.submittedAt)}</p>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold uppercase text-gray-600">{s.sessionType}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setViewingSpeaker(s)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 inline-flex"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <ViewSpeakerModal
        speaker={viewingSpeaker}
        onClose={() => setViewingSpeaker(null)}
        onDecision={handleDecision}
      />
    </Layout>
  );
}