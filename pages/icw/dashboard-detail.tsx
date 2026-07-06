"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import { Pagination, Badge } from "@roketid/windmill-react-ui";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  ClipboardList,
  Building2,
  Loader2,
  Search,
  FileText,
  Rows3,
} from "lucide-react";
import api from "@/lib/api";
import * as XLSX from "xlsx";

type DetailColumn = {
  key: string;
  label: string;
};

type DetailSummary = Record<string, string | number | null>;

type DetailRow = Record<string, any>;

type DetailResponse = {
  title: string;
  date: string;
  summary?: DetailSummary;
  columns: DetailColumn[];
  rows: DetailRow[];
  message?: string;
};

function formatLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderCellValue(value: any) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function SummaryBadge({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {formatLabel(label)}
      </p>
      <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
        {value ?? "--"}
      </p>
    </div>
  );
}

function ContextInfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/95 shadow-sm p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0 text-green-700">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="text-sm font-semibold text-gray-900 break-words">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function MobileRecordCard({
  row,
  columns,
  renderTableCell,
  rowKey,
}: {
  row: DetailRow;
  columns: DetailColumn[];
  renderTableCell: (columnKey: string, value: any) => React.ReactNode;
  rowKey: string | number;
}) {
  // Skip photoUrl when determining text columns
  const textColumns = columns.filter((column) => column.key !== "photoUrl");
  const primaryColumn = textColumns[0];
  const secondaryColumn = textColumns[1];
  const visibleColumns = textColumns;

  return (
    <div
      key={rowKey}
      className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50/70 dark:bg-gray-900/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-gray-900 dark:text-white break-words uppercase">
            {primaryColumn
              ? renderCellValue(row[primaryColumn.key]).toUpperCase()
              : "RECORD"}
          </p>
          {secondaryColumn ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 uppercase break-words">
              {secondaryColumn.label}:{" "}
              {renderCellValue(row[secondaryColumn.key]).toUpperCase()}
            </p>
          ) : null}
        </div>

        <PassportThumb
          src={row.photoUrl}
          alt={row.fullName || row.attendeeId || "Participant"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {visibleColumns.slice(2).map((column) => (
          <div
            key={column.key}
            className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {column.label}
              </p>
              <div className="text-sm font-semibold text-right text-gray-900 dark:text-white max-w-[60%] break-words">
                {renderTableCell(column.key, row[column.key])}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function PassportThumb({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
        No Photo
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-14 w-14 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm"
    />
  );
}

export default function DashboardDetailPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DetailResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const resultsPerPage = 10;

  const getSingleQueryValue = (
    value: string | string[] | undefined,
  ): string | undefined => {
    if (Array.isArray(value)) return value[0];
    if (typeof value === "string" && value.trim() !== "") return value;
    return undefined;
  };

  const type = getSingleQueryValue(router.query.type);
  const title = getSingleQueryValue(router.query.title);
  const metric = getSingleQueryValue(router.query.metric);
  const category = getSingleQueryValue(router.query.category);
  const supervisorId = getSingleQueryValue(router.query.supervisorId);
  const date = getSingleQueryValue(router.query.date);
  const dashboardDate = getSingleQueryValue(router.query.dashboardDate);
  const dayName = getSingleQueryValue(router.query.dayName);
  const programme = getSingleQueryValue(router.query.programme);
  const venue = getSingleQueryValue(router.query.venue);
  const period = getSingleQueryValue(router.query.period);

  const fetchDetail = async () => {
    if (!router.isReady) return;

    if (!type || !date) {
      setError("Missing required detail parameters.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params: Record<string, string | number> = {
        type,
        date,
      };

      if (title) params.title = title;
      if (metric) params.metric = metric;
      if (category) params.category = category;
      if (supervisorId && !Number.isNaN(Number(supervisorId))) {
        params.supervisorId = Number(supervisorId);
      }

      const response = await api.get<DetailResponse>(
        "/dashboard/issam-central/detail",
        { params },
      );

      setData(response.data);
      setPage(1);
    } catch (err: any) {
      console.error("Failed to load dashboard detail", err);
      console.error("Validation response:", err?.response?.data);

      setError(
        err?.response?.data?.message || "Failed to load dashboard detail.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    fetchDetail();
  }, [router.isReady, type, title, metric, category, supervisorId, date]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const term = search.trim().toLowerCase();

    if (!term) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [data?.rows, search]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * resultsPerPage;
    return filteredRows.slice(start, start + resultsPerPage);
  }, [filteredRows, page]);

  const summaryEntries = Object.entries(data?.summary ?? {});

  function getStatusBadgeType(value: string) {
    const normalized = value.toLowerCase();

    if (
      normalized.includes("open") ||
      normalized.includes("warning") ||
      normalized.includes("low")
    ) {
      return "warning";
    }

    if (
      normalized.includes("closed") ||
      normalized.includes("resolved") ||
      normalized.includes("success") ||
      normalized.includes("high activity")
    ) {
      return "success";
    }

    if (
      normalized.includes("active") ||
      normalized.includes("primary") ||
      normalized.includes("progress")
    ) {
      return "primary";
    }

    if (
      normalized.includes("danger") ||
      normalized.includes("critical") ||
      normalized.includes("failed")
    ) {
      return "danger";
    }

    return null;
  }

  const desktopColumns = useMemo(() => {
    if (!data?.columns) return [];

    const hasPhotoInRows = (data.rows ?? []).some((row) =>
      Boolean(row.photoUrl),
    );
    const alreadyHasPhotoColumn = data.columns.some(
      (column) => column.key === "photoUrl",
    );

    if (hasPhotoInRows && !alreadyHasPhotoColumn) {
      return [{ key: "photoUrl", label: "Passport" }, ...data.columns];
    }

    return data.columns;
  }, [data]);

  function renderTableCell(columnKey: string, value: any) {
    const text = renderCellValue(value);

    if (
      typeof value === "string" &&
      ["status", "severity"].includes(columnKey.toLowerCase())
    ) {
      const badgeType = getStatusBadgeType(value);

      if (badgeType) {
        return <Badge type={badgeType as any}>{text}</Badge>;
      }
    }

    return <span className="break-words">{text}</span>;
  }

  const downloadExcel = () => {
    if (!data?.rows?.length || !data?.columns?.length) return;

    // Build rows using column labels as headers
    const exportRows = data.rows.map((row) => {
      const formatted: Record<string, any> = {};
      data.columns.forEach((col) => {
        if (col.key === "photoUrl") return; // skip photo column
        const value = row[col.key];
        formatted[col.label] =
          value === null || value === undefined ? "" : value;
      });
      return formatted;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Auto-size columns
    const colWidths = data.columns
      .filter((col) => col.key !== "photoUrl")
      .map((col) => ({
        wch: Math.max(
          col.label.length,
          ...data.rows.map((row) => String(row[col.key] ?? "").length),
        ),
      }));
    worksheet["!cols"] = colWidths;

    const fileName = `${(data.title ?? "report")
      .toLowerCase()
      .replace(/\s+/g, "-")}-${data.date ?? "export"}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const goBackToDashboard = () => {
    const params = new URLSearchParams();

    if (date) params.set("date", date);
    if (dashboardDate) params.set("dashboardDate", dashboardDate);
    if (programme) params.set("programme", programme);
    if (venue) params.set("venue", venue);
    if (period) params.set("period", period);

    router.push(`/icw/dashboard?${params.toString()}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="py-16">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading detail report...</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <PageTitle>{data?.title || "Dashboard Detail"}</PageTitle>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Detailed breakdown for the selected dashboard report.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={goBackToDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white shadow-xl p-5 sm:p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex items-center px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase rounded-full bg-white/15 mb-3">
                Detail report view
              </p>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                {data?.title || "Operational Detail Report"}
              </h2>

              <p className="mt-3 text-sm sm:text-base text-white/85 leading-6">
                View the complete table records and summary for this selected
                dashboard metric.
              </p>

              {error ? (
                <p className="mt-3 text-sm text-red-100 bg-red-500/20 border border-red-200/20 rounded-xl px-3 py-2 inline-block">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full xl:w-[520px]">
              <ContextInfoCard
                label="Programme"
                value={String(programme || "--")}
                icon={<ClipboardList className="w-5 h-5" />}
              />
              <ContextInfoCard
                label="Venue"
                value={String(venue || "--")}
                icon={<MapPin className="w-5 h-5" />}
              />
              <ContextInfoCard
                label="Period"
                value={String(period || "--")}
                icon={<CalendarDays className="w-5 h-5" />}
              />
              <ContextInfoCard
                label="Dashboard Date"
                value={`${String(dashboardDate || "--")}${
                  dayName ? ` • ${String(dayName)}` : ""
                }`}
                icon={<Building2 className="w-5 h-5" />}
              />
            </div>
          </div>
        </div>
      </div>
      {summaryEntries.length > 0 ? (
        <div className="grid gap-4 sm:gap-5 mb-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {summaryEntries.map(([key, value]) => (
            <SummaryBadge key={key} label={key} value={value} />
          ))}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Left — title */}
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Report Records
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 uppercase leading-relaxed">
                  Search and browse full detail records for this report.
                </p>
              </div>

              {/* Right — search + count + download */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto lg:min-w-[520px]">
                {/* Search input */}
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search records..."
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 pl-10 text-sm text-gray-900 dark:text-white shadow-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center ml-3 text-gray-400 pointer-events-none">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Record count */}
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">
                  {filteredRows.length} record
                  {filteredRows.length === 1 ? "" : "s"}
                </span>

                {/* Download button */}
                {(data?.rows?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={downloadExcel}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition whitespace-nowrap shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    Download Excel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {!data?.columns?.length ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 uppercase">
            No table columns available for this report.
          </div>
        ) : filteredRows.length > 0 ? (
          <>
            <div className="block lg:hidden p-4 space-y-4">
              {paginatedRows.map((row, index) => (
                <MobileRecordCard
                  key={row.id || row.attendeeId || row.incidentId || index}
                  row={row}
                  columns={data.columns}
                  renderTableCell={renderTableCell}
                  rowKey={row.id || row.attendeeId || row.incidentId || index}
                />
              ))}
            </div>

            <div className="hidden lg:block w-full overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
                    {desktopColumns.map((column) => (
                      <th
                        key={column.key}
                        className="py-4 px-4 font-semibold whitespace-nowrap first:pl-6 last:pr-6"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.map((row, index) => (
                    <tr
                      key={row.id || row.attendeeId || row.incidentId || index}
                      className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-900/20 transition"
                    >
                      {desktopColumns.map((column, colIndex) => {
                        const value = row[column.key];
                        const isPassport = column.key === "photoUrl";
                        const isPrimary = !isPassport && colIndex === 1; // first real data column

                        return (
                          <td
                            key={column.key}
                            className={`py-4 px-4 align-top ${
                              isPrimary
                                ? "font-semibold text-gray-900 dark:text-white"
                                : ""
                            } first:pl-6 last:pr-6`}
                          >
                            {isPassport ? (
                              <PassportThumb
                                src={row.photoUrl}
                                alt={
                                  row.fullName ||
                                  row.attendeeId ||
                                  "Participant"
                                }
                              />
                            ) : (
                              <div
                                className={`${isPrimary ? "uppercase" : ""} break-words max-w-[260px]`}
                              >
                                {renderTableCell(column.key, value)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && filteredRows.length > 0 ? (
                <div className="p-5">
                  <Pagination
                    totalResults={filteredRows.length}
                    resultsPerPage={resultsPerPage}
                    onChange={setPage}
                    label="Report table navigation"
                  />
                </div>
              ) : null}
            </div>

            <div className="block lg:hidden p-4 border-t border-gray-100 dark:border-gray-700">
              <Pagination
                totalResults={filteredRows.length}
                resultsPerPage={resultsPerPage}
                onChange={setPage}
                label="Report table navigation"
              />
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-300">
              <Rows3 className="w-6 h-6" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200 uppercase">
              No records found
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try changing the search term or reload the report.
            </p>
          </div>
        )}
      </div>

      <div className="pb-16" />
    </Layout>
  );
}
