import React, { useEffect, useState } from "react";
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@roketid/windmill-react-ui";
import {
  Search,
  Clock,
  FileText,
  User,
  Calendar,
  Pill,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type MedicationRecord = {
  dispensingId: number;
  recipientName: string;
  recipientType: string;
  isParticipant: boolean;
  attendeeId: number | null;
  recipientNotes: string | null;
  drugName: string;
  quantityDispensed: number;
  symptoms: string | null;
  instructions: string | null;
  batchNumber: string;
  dispensedBy: string;
  dispensedAt: string;
};

type RecipientHistory = {
  recipientName: string;
  recipientType: string;
  isParticipant: boolean;
  attendeeId: number | null;
  photo: string | null;
  phoneNumber: string | null;
  state: string | null;
  lga: string | null;
  totalDispensings: number;
  history: MedicationRecord[];
};

// Helper function for sentence case
function toSentenceCase(str: string | null | undefined): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function MedicationHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allRecipients, setAllRecipients] = useState<RecipientHistory[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientHistory | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [perPage] = useState(20);

  useEffect(() => {
    loadAllRecipients(1);
  }, []);

  async function loadAllRecipients(page: number = 1) {
    try {
      setLoading(true);
      const { data } = await api.get("/medications/recipients", {
        params: { page, per_page: perPage },
      });

      setAllRecipients(data.recipients || []);
      setCurrentPage(data.pagination.current_page);
      setTotalPages(data.pagination.last_page);
      setTotalRecipients(data.pagination.total);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load recipients"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (searchTerm.trim().length < 2) {
      // If search is cleared, reload all recipients
      loadAllRecipients(1);
      return;
    }

    try {
      setSearching(true);
      const { data } = await api.get("/medications/recipients", {
        params: { search: searchTerm.trim(), page: 1, per_page: perPage },
      });

      setAllRecipients(data.recipients || []);
      setCurrentPage(data.pagination.current_page);
      setTotalPages(data.pagination.last_page);
      setTotalRecipients(data.pagination.total);

      if (data.recipients.length === 0) {
        toast.error("No medication history found for this name");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to search medication history"
      );
    } finally {
      setSearching(false);
    }
  }

  function handlePageChange(page: number) {
    if (searchTerm.trim()) {
      // If searching, search with new page
      api.get("/medications/recipients", {
        params: { search: searchTerm.trim(), page, per_page: perPage },
      }).then(({ data }) => {
        setAllRecipients(data.recipients || []);
        setCurrentPage(data.pagination.current_page);
        setTotalPages(data.pagination.last_page);
        setTotalRecipients(data.pagination.total);
      });
    } else {
      // Load all with new page
      loadAllRecipients(page);
    }
  }

  function getRecipientTypeBadge(type: string) {
    const typeFormatted = toSentenceCase(type);
    switch (type) {
      case "participant":
        return <Badge type="primary">{typeFormatted}</Badge>;
      case "staff":
        return <Badge type="success">{typeFormatted}</Badge>;
      case "visitor":
        return <Badge type="warning">{typeFormatted}</Badge>;
      case "other":
        return <Badge type="neutral">{typeFormatted}</Badge>;
      default:
        return <Badge type="neutral">{typeFormatted}</Badge>;
    }
  }

  function viewRecipientHistory(recipient: RecipientHistory) {
    setSelectedRecipient(recipient);
  }

  function closeDetailView() {
    setSelectedRecipient(null);
  }

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <PageTitle>Medication history</PageTitle>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Search and view medication history for all recipients
        </p>

        {/* Hero Banner */}
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-teal-700 shadow-xl">
          <div className="px-4 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 sm:px-3 sm:py-1 text-[8px] sm:text-xs font-semibold tracking-wide uppercase">
                Medical Records
              </div>

              <h2 className="mt-2 sm:mt-3 text-lg sm:text-3xl font-bold leading-tight">
                Complete medication history
              </h2>

              <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-200 leading-5 sm:leading-6">
                View dispensing records for participants, staff, visitors, and others
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Search recipients (optional)
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
          Filter the list below by entering a name
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Enter name to filter results..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.trim().length === 0) {
                  loadAllRecipients(1);
                }
              }}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={searching}
            className="rounded-2xl h-auto px-6 bg-teal-700 border-teal-700 hover:bg-teal-800 hover:border-teal-800"
          >
            <span className="inline-flex items-center gap-2">
              <Search className="w-4 h-4" />
              {searching ? "Searching..." : "Search"}
            </span>
          </Button>
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-8 text-center mb-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700 mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading recipients...</p>
        </div>
      ) : allRecipients.length > 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              All recipients
              {searchTerm.trim() && " (filtered)"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {allRecipients.length} of {totalRecipients}
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Records</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRecipients.map((recipient, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {recipient.isParticipant && recipient.photo ? (
                          <img
                            src={recipient.photo}
                            alt={recipient.recipientName}
                            className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                recipient.recipientName
                              )}&background=0d9488&color=fff&size=128`;
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {toSentenceCase(recipient.recipientName)}
                          </p>
                          {recipient.isParticipant && recipient.attendeeId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {recipient.attendeeId}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRecipientTypeBadge(recipient.recipientType)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {recipient.phoneNumber && (
                          <p className="text-gray-700 dark:text-gray-300">
                            {recipient.phoneNumber}
                          </p>
                        )}
                        {recipient.state && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs">
                            {toSentenceCase(recipient.lga)},{" "}
                            {toSentenceCase(recipient.state)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {recipient.totalDispensings}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => viewRecipientHistory(recipient)}
                        className="rounded-xl bg-teal-700 border-teal-700 hover:bg-teal-800"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          View
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {allRecipients.map((recipient, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  {recipient.isParticipant && recipient.photo ? (
                    <img
                      src={`${recipient.photo}`}
                      alt={recipient.recipientName}
                      className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          recipient.recipientName
                        )}&background=0d9488&color=fff&size=128`;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {toSentenceCase(recipient.recipientName)}
                      </p>
                      {getRecipientTypeBadge(recipient.recipientType)}
                    </div>
                    {recipient.isParticipant && recipient.attendeeId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {recipient.attendeeId}
                      </p>
                    )}
                    {recipient.phoneNumber && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {recipient.phoneNumber}
                      </p>
                    )}
                    {recipient.state && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {toSentenceCase(recipient.lga)},{" "}
                        {toSentenceCase(recipient.state)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {recipient.totalDispensings}
                    </span>{" "}
                    record{recipient.totalDispensings > 1 ? "s" : ""}
                  </span>
                  <Button
                    size="small"
                    onClick={() => viewRecipientHistory(recipient)}
                    className="rounded-xl bg-teal-700 border-teal-700 hover:bg-teal-800"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  size="small"
                  layout="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-xl"
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={i}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? "bg-teal-700 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-100 dark:hover:bg-teal-900/20"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <Button
                  size="small"
                  layout="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : !loading && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-8 sm:p-12 text-center mb-8">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm.trim() ? "No results found" : "No recipients yet"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchTerm.trim()
              ? "No medication history found for this search. Try a different name."
              : "No medications have been dispensed yet. Start by dispensing medications to participants or visitors."}
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecipient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={closeDetailView}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-b border-teal-100 dark:border-teal-800 p-4 sm:p-6 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedRecipient.isParticipant &&
                    selectedRecipient.photo ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_FILE_URL}storage/${selectedRecipient.photo}`}
                        alt={selectedRecipient.recipientName}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-gray-100 dark:bg-gray-700 ring-4 ring-white dark:ring-gray-800"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            selectedRecipient.recipientName
                          )}&background=0d9488&color=fff&size=200`;
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-200 dark:bg-teal-800 flex items-center justify-center ring-4 ring-white dark:ring-gray-800">
                        <User className="w-8 h-8 sm:w-10 sm:h-10 text-teal-700 dark:text-teal-300" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                          {toSentenceCase(selectedRecipient.recipientName)}
                        </h3>
                        {getRecipientTypeBadge(selectedRecipient.recipientType)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedRecipient.totalDispensings} medication record
                        {selectedRecipient.totalDispensings > 1 ? "s" : ""}
                        {selectedRecipient.isParticipant &&
                          selectedRecipient.attendeeId && (
                            <> • Participant ID: {selectedRecipient.attendeeId}</>
                          )}
                      </p>
                      {selectedRecipient.phoneNumber && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedRecipient.phoneNumber}
                        </p>
                      )}
                      {selectedRecipient.state && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {toSentenceCase(selectedRecipient.lga)},{" "}
                          {toSentenceCase(selectedRecipient.state)}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={closeDetailView}
                    className="p-2 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* History Content */}
              <div className="p-4 sm:p-6">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Complete medication history
                </h4>

                {selectedRecipient.history.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No medication history found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedRecipient.history.map((record) => (
                      <div
                        key={record.dispensingId}
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {toSentenceCase(record.drugName)}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {new Date(record.dispensedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge type="primary">
                            {record.quantityDispensed} unit
                            {record.quantityDispensed > 1 ? "s" : ""}
                          </Badge>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          {record.symptoms && (
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Symptoms / Reason
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {toSentenceCase(record.symptoms)}
                              </p>
                            </div>
                          )}

                          {record.instructions && (
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Instructions / Dosage
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {toSentenceCase(record.instructions)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Additional Info for Non-Participants */}
                        {!record.isParticipant && record.recipientNotes && (
                          <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                              Additional notes
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {toSentenceCase(record.recipientNotes)}
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Batch: {record.batchNumber}
                          </span>
                          <span>•</span>
                          <span>
                            Dispensed by: {toSentenceCase(record.dispensedBy)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {allRecipients.length === 0 && !searching && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-8 sm:p-12 text-center mb-8">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Search medication history
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Enter a recipient's name to view their complete medication history
            including all dispensing records, symptoms, and instructions.
          </p>
        </div>
      )}
    </Layout>
  );
}