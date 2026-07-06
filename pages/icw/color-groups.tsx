import React, { useEffect, useState } from "react";
import { Button, Input, Badge } from "@roketid/windmill-react-ui";
import {
  Users,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  MapPin,
  Phone,
  Mail,
  Filter,
  RefreshCcw,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type ColorGroup = {
  colorId: number;
  colorName: string;
  hexCode: string;
  capacity: number;
  participantCount: number;
  maleCount: number;
  femaleCount: number;
  subClCount: number;
};

type SubCL = {
  subClId: number;
  state: string;
  lga: string;
  ward?: string;
  participantCount: number;
  supervisor?: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
};

type Participant = {
  attendeeId: number;
  uniqueId: string;
  fullName: string;
  phone?: string;
  email?: string;
  gender: string;
  age?: number;
  state?: string;
  lga?: string;
  ward?: string;
  community?: string;
  photoUrl?: string;
  isRegistered: boolean;
  subClId?: number;
  subcl?: {
    subClId: number;
    state: string;
    lga: string;
    ward?: string;
  };
};

type ColorGroupsResponse = {
  success: boolean;
  message: string;
  data?: ColorGroup[];
};

type SubCLsResponse = {
  success: boolean;
  message: string;
  data?: SubCL[];
};

type ParticipantsResponse = {
  success: boolean;
  message: string;
  data?: {
    data: Participant[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
};

const EVENT_ID = 1;
const DEFAULT_PER_PAGE = 20;

function PassportAvatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 rounded-xl"
      : size === "lg"
        ? "h-16 w-16 rounded-2xl"
        : "h-12 w-12 rounded-2xl";

  return photoUrl ? (
    <img
      src={photoUrl}
      alt={name}
      className={`${sizeClass} object-cover border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shrink-0`}
    />
  ) : (
    <div
      className={`${sizeClass} flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 shrink-0`}
    >
      <Users className="w-5 h-5" />
    </div>
  );
}

export default function ColorGroupsDashboard() {
  const [view, setView] = useState<"colors" | "subcls" | "participants">("colors");
  const [selectedColor, setSelectedColor] = useState<ColorGroup | null>(null);
  const [selectedSubCL, setSelectedSubCL] = useState<SubCL | null>(null);

  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  const [subCLs, setSubCLs] = useState<SubCL[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [loadingColors, setLoadingColors] = useState(false);
  const [loadingSubCLs, setLoadingSubCLs] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    void loadColorGroups();
  }, []);

  async function loadColorGroups() {
    try {
      setLoadingColors(true);
      const { data } = await api.get<ColorGroupsResponse>(`/colors`);
      setColorGroups(data?.data || []);
    } catch (error) {
      toast.error("Failed to load color groups");
    } finally {
      setLoadingColors(false);
    }
  }

  async function loadSubCLs(colorId: number) {
    try {
      setLoadingSubCLs(true);
      const { data } = await api.get<SubCLsResponse>(
        `/colors/${colorId}/subcls`
      );
      setSubCLs(data?.data || []);
    } catch (error) {
      toast.error("Failed to load Sub-CLs");
    } finally {
      setLoadingSubCLs(false);
    }
  }

  async function loadParticipants(colorId: number, subClId?: number, page = 1) {
    try {
      setLoadingParticipants(true);
      const params: any = {
        page,
        per_page: DEFAULT_PER_PAGE,
      };

      if (subClId) {
        params.subClId = subClId;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (genderFilter !== "all") {
        params.gender = genderFilter;
      }

      const { data } = await api.get<ParticipantsResponse>(
        `/colors/${colorId}/participants`,
        { params }
      );

      const payload = data?.data || { data: [], current_page: 1, last_page: 1, total: 0, per_page: DEFAULT_PER_PAGE };
      setParticipants(payload.data || []);
      setCurrentPage(payload.current_page || 1);
      setLastPage(payload.last_page || 1);
      setTotalRecords(payload.total || 0);
    } catch (error) {
      toast.error("Failed to load participants");
    } finally {
      setLoadingParticipants(false);
    }
  }

  function handleColorClick(color: ColorGroup) {
    setSelectedColor(color);
    setView("subcls");
    void loadSubCLs(color.colorId);
  }

  function handleSubCLClick(subcl: SubCL) {
    setSelectedSubCL(subcl);
    setView("participants");
    if (selectedColor) {
      void loadParticipants(selectedColor.colorId, subcl.subClId);
    }
  }

  function handleViewAllParticipants() {
    setSelectedSubCL(null);
    setView("participants");
    if (selectedColor) {
      void loadParticipants(selectedColor.colorId);
    }
  }

  function handleBackToColors() {
    setView("colors");
    setSelectedColor(null);
    setSelectedSubCL(null);
    setSearchQuery("");
    setGenderFilter("all");
  }

  function handleBackToSubCLs() {
    setView("subcls");
    setSelectedSubCL(null);
    setSearchQuery("");
    setGenderFilter("all");
  }

  useEffect(() => {
    if (view === "participants" && selectedColor) {
      void loadParticipants(selectedColor.colorId, selectedSubCL?.subClId, currentPage);
    }
  }, [searchQuery, genderFilter]);

  const paginationMetaText =
    totalRecords > 0
      ? `Showing ${(currentPage - 1) * DEFAULT_PER_PAGE + 1} to ${Math.min(
          currentPage * DEFAULT_PER_PAGE,
          totalRecords
        )} of ${totalRecords} participants`
      : "No participants";

  return (
    <Layout>
      <div className="mb-6">
        <PageTitle>Color Groups Dashboard</PageTitle>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View participants organized by color groups and Sub-CLs.
        </p>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <button
          onClick={handleBackToColors}
          className={`hover:text-gray-900 dark:hover:text-white ${
            view === "colors" ? "font-semibold text-gray-900 dark:text-white" : ""
          }`}
        >
          Color Groups
        </button>
        {(view === "subcls" || view === "participants") && selectedColor && (
          <>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={handleBackToSubCLs}
              className={`hover:text-gray-900 dark:hover:text-white ${
                view === "subcls" ? "font-semibold text-gray-900 dark:text-white" : ""
              }`}
            >
              {selectedColor.colorName}
            </button>
          </>
        )}
        {view === "participants" && selectedSubCL && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {selectedSubCL.state} - {selectedSubCL.lga}
            </span>
          </>
        )}
      </div>

      {/* COLOR GROUPS VIEW */}
      {view === "colors" && (
        <div className="space-y-4">
          {loadingColors ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading color groups...</p>
            </div>
          ) : colorGroups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No color groups found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {colorGroups.map((color) => (
                <button
                  key={color.colorId}
                  onClick={() => handleColorClick(color)}
                  className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-6 text-left hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl border-4 border-gray-200 dark:border-gray-600 shadow-md"
                      style={{ backgroundColor: color.hexCode }}
                    />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {color.colorName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {color.subClCount} Sub-CL{color.subClCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Total Participants</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {color.participantCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Capacity</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {color.capacity}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Male</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {color.maleCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Female</span>
                      <span className="text-sm font-semibold text-pink-600 dark:text-pink-400">
                        {color.femaleCount}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      View Details
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-CLs VIEW */}
      {view === "subcls" && selectedColor && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  layout="outline"
                  onClick={handleBackToColors}
                  className="rounded-2xl h-10"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div
                  className="w-10 h-10 rounded-xl border-4 border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: selectedColor.hexCode }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedColor.colorName}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedColor.participantCount} participants across {selectedColor.subClCount} Sub-CLs
                  </p>
                </div>
              </div>
              <Button
                onClick={handleViewAllParticipants}
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
              >
                View All Participants
              </Button>
            </div>
          </div>

          {loadingSubCLs ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading Sub-CLs...</p>
            </div>
          ) : subCLs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No Sub-CLs found for this color.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subCLs.map((subcl) => (
                <button
                  key={subcl.subClId}
                  onClick={() => handleSubCLClick(subcl)}
                  className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5 text-left hover:shadow-xl transition-all hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {subcl.state}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{subcl.lga}</p>
                        {subcl.ward && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{subcl.ward}</p>
                        )}
                      </div>
                    </div>
                    <Badge type="primary">{subcl.participantCount}</Badge>
                  </div>

                  {subcl.supervisor && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Supervisor</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {subcl.supervisor.firstName} {subcl.supervisor.lastName}
                      </p>
                      {subcl.supervisor.phoneNumber && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {subcl.supervisor.phoneNumber}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>View Participants</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PARTICIPANTS VIEW */}
      {view === "participants" && selectedColor && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  layout="outline"
                  onClick={handleBackToSubCLs}
                  className="rounded-2xl h-10"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div
                  className="w-10 h-10 rounded-xl border-4 border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: selectedColor.hexCode }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedSubCL
                      ? `${selectedSubCL.state} - ${selectedSubCL.lga}`
                      : `All ${selectedColor.colorName} Participants`}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedSubCL
                      ? `${selectedSubCL.participantCount} participants in this Sub-CL`
                      : `${selectedColor.participantCount} total participants`}
                  </p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  className="h-11 rounded-2xl border-gray-200 dark:border-gray-600"
                  placeholder="Search by name, unique ID, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={Search}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  layout={genderFilter === "all" ? "primary" : "outline"}
                  onClick={() => setGenderFilter("all")}
                  className="rounded-2xl h-11"
                >
                  All
                </Button>
                <Button
                  layout={genderFilter === "male" ? "primary" : "outline"}
                  onClick={() => setGenderFilter("male")}
                  className="rounded-2xl h-11"
                >
                  Male
                </Button>
                <Button
                  layout={genderFilter === "female" ? "primary" : "outline"}
                  onClick={() => setGenderFilter("female")}
                  className="rounded-2xl h-11"
                >
                  Female
                </Button>
                <Button
                  layout="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setGenderFilter("all");
                  }}
                  className="rounded-2xl h-11"
                >
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Participants Table */}
          <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-5">
            <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="max-h-[600px] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/40 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Photo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Unique ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Gender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Sub-CL
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {loadingParticipants ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                          Loading participants...
                        </td>
                      </tr>
                    ) : participants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No participants found.
                        </td>
                      </tr>
                    ) : (
                      participants.map((participant) => (
                        <tr key={participant.attendeeId}>
                          <td className="px-4 py-3">
                            <PassportAvatar
                              name={participant.fullName}
                              photoUrl={participant.photoUrl}
                              size="md"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {participant.fullName.toUpperCase()}
                            </p>
                            {participant.age && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Age: {participant.age}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {participant.uniqueId}
                            {participant.age && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {participant.serialNumber}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              type={
                                participant.gender?.toLowerCase() === "male"
                                  ? "primary"
                                  : "danger"
                              }
                            >
                              {participant.gender}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {participant.subcl
                              ? `${participant.subcl.state} - ${participant.subcl.lga}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {participant.phone && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {participant.phone}
                              </p>
                            )}
                            {participant.email && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-1">
                                <Mail className="w-3 h-3" />
                                {participant.email}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                            {[participant.community, participant.ward, participant.lga, participant.state]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">{paginationMetaText}</p>
              <div className="flex items-center gap-2">
                <Button
                  layout="outline"
                  className="rounded-2xl h-10 px-4"
                  disabled={currentPage <= 1 || loadingParticipants}
                  onClick={() =>
                    loadParticipants(
                      selectedColor.colorId,
                      selectedSubCL?.subClId,
                      currentPage - 1
                    )
                  }
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {currentPage} of {lastPage}
                </span>
                <Button
                  layout="outline"
                  className="rounded-2xl h-10 px-4"
                  disabled={currentPage >= lastPage || loadingParticipants}
                  onClick={() =>
                    loadParticipants(
                      selectedColor.colorId,
                      selectedSubCL?.subClId,
                      currentPage + 1
                    )
                  }
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}