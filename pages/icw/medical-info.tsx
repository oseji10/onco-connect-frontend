"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import {
  Heart,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Pill,
  Activity,
  Baby,
  Stethoscope,
  FileHeart,
  AlertTriangle,
  Save,
  Search,
  UserRound,
  Phone,
  Hash,
  RefreshCcw,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { Input, Button } from "@roketid/windmill-react-ui";
import toast from "react-hot-toast";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type AttendeeData = {
  attendeeId: number;
  eventId: number;
  uniqueId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  state: string | null;
  lga: string | null;
  ward: string | null;
  community: string | null;
  isRegistered: boolean;
  registeredAt: string | null;
};

type MedicalFormData = {
  hasAllergy: boolean;
  allergyDetails: string;
  hasDrugAllergy: boolean;
  drugAllergyType: string;
  isPregnant: boolean;
  pregnancyMonths: string;
  isBreastfeeding: boolean;
  onMedications: boolean;
  medicationType: string;
  onBirthControl: boolean;
  hasSurgicalHistory: boolean;
  surgicalHistoryDetails: string;
  hasMedicalConditions: boolean;
  medicalConditionsDetails: string;
};

type SearchResponseData = {
  attendee: AttendeeData;
};

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

function toDisplayUpper(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value).toUpperCase();
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/30 dark:to-gray-800/50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white dark:bg-gray-800 p-2.5 border border-gray-100 dark:border-gray-700 shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
            {label}
          </p>
          <p className="mt-1.5 text-sm font-bold text-gray-900 dark:text-white break-words uppercase leading-tight">
            {value || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MedicalInformationForm() {
  const eventId = 1;
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendee, setAttendee] = useState<AttendeeData | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<MedicalFormData>({
    hasAllergy: false,
    allergyDetails: "",
    hasDrugAllergy: false,
    drugAllergyType: "",
    isPregnant: false,
    pregnancyMonths: "",
    isBreastfeeding: false,
    onMedications: false,
    medicationType: "",
    onBirthControl: false,
    hasSurgicalHistory: false,
    surgicalHistoryDetails: "",
    hasMedicalConditions: false,
    medicalConditionsDetails: "",
  });

  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  function resetAll() {
    setSearchQuery("");
    setAttendee(null);
    setFormData({
      hasAllergy: false,
      allergyDetails: "",
      hasDrugAllergy: false,
      drugAllergyType: "",
      isPregnant: false,
      pregnancyMonths: "",
      isBreastfeeding: false,
      onMedications: false,
      medicationType: "",
      onBirthControl: false,
      hasSurgicalHistory: false,
      surgicalHistoryDetails: "",
      hasMedicalConditions: false,
      medicalConditionsDetails: "",
    });
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  async function handleSearchAttendee(e?: FormEvent) {
    e?.preventDefault();

    if (!searchQuery.trim()) {
      toast.error("Enter phone number or unique ID.");
      return;
    }

    if (!eventId) {
      toast.error("Event ID is missing.");
      return;
    }

    try {
      setSearching(true);
      setAttendee(null);

      const { data } = await api.post<ApiSuccess<SearchResponseData>>(
        `/search`,
        {
          q: searchQuery.trim(),
          eventId,
        }
      );

      setAttendee(data.data.attendee);
      toast.success(data.message || "Participant found.");
    } catch (err: any) {
      setAttendee(null);
      toast.error(err?.response?.data?.message || "Unable to find participant.");
    } finally {
      setSearching(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!attendee) {
      toast.error("Please search and select a participant first.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        attendeeId: attendee.attendeeId,
        hasAllergy: formData.hasAllergy,
        allergyDetails: formData.hasAllergy ? formData.allergyDetails : null,
        hasDrugAllergy: formData.hasDrugAllergy,
        drugAllergyType: formData.hasDrugAllergy
          ? formData.drugAllergyType
          : null,
        isPregnant: formData.isPregnant,
        pregnancyMonths: formData.isPregnant ? formData.pregnancyMonths : null,
        isBreastfeeding: formData.isBreastfeeding,
        onMedications: formData.onMedications,
        medicationType: formData.onMedications ? formData.medicationType : null,
        onBirthControl: formData.onBirthControl,
        hasSurgicalHistory: formData.hasSurgicalHistory,
        surgicalHistoryDetails: formData.hasSurgicalHistory
          ? formData.surgicalHistoryDetails
          : null,
        hasMedicalConditions: formData.hasMedicalConditions,
        medicalConditionsDetails: formData.hasMedicalConditions
          ? formData.medicalConditionsDetails
          : null,
      };

      const { data } = await api.post("/participant/medical-info", payload);

      toast.success(data.message || "Medical information saved successfully!");

      // Reset after success
      setTimeout(() => {
        resetAll();
      }, 2000);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save medical information"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasCriticalAlerts =
    formData.hasDrugAllergy ||
    formData.isPregnant ||
    formData.hasMedicalConditions;

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <PageTitle>Medical Information</PageTitle>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Capture medical information for participants
            </p>
          </div>

          <Button
            layout="outline"
            className="rounded-2xl h-12 w-full sm:w-auto border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            onClick={resetAll}
          >
            <span className="inline-flex items-center justify-center gap-2 w-full font-semibold">
              <RefreshCcw className="w-4 h-4" />
              Reset
            </span>
          </Button>
        </div>

        {/* Hero Banner */}
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-pink-700 shadow-xl">
          <div className="px-4 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 sm:px-3 sm:py-1 text-[8px] sm:text-xs font-semibold tracking-wide uppercase">
                <Heart className="w-3 h-3 mr-1" />
                Health & Safety
              </div>

              <h2 className="mt-2 sm:mt-3 text-lg sm:text-3xl font-bold leading-tight">
                Your health and safety are our top priority
              </h2>

              <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-200 leading-5 sm:leading-6">
                Capture accurate medical information to help us serve
                participants better during the event. All information is
                confidential and encrypted.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confidentiality Notice */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 shadow-lg p-4 sm:p-6 mb-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">
              Confidentiality Assured
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              All medical information is encrypted and accessible only to
              authorized medical personnel. This data will be used solely for
              emergency response and health management during the event.
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-5">
        <div className="mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600" />
            Search Participant
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Find the participant by phone number or unique ID to capture their
            medical information.
          </p>
        </div>

        <form onSubmit={handleSearchAttendee} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone Number or Unique ID
            </label>
            <div className="relative">
              <Input
                ref={searchInputRef}
                className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm text-base font-semibold focus:border-purple-500 focus:ring-purple-500"
                placeholder="e.g. 08031234567 or ISM/B2/M/00001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 flex items-center ml-4 text-gray-400 pointer-events-none">
                <Search className="w-5 h-5" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={searching}
            className="rounded-2xl h-12 w-full sm:w-auto bg-purple-700 border-purple-700 hover:bg-purple-800 hover:border-purple-800"
          >
            <span className="inline-flex items-center gap-2">
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {searching ? "Searching..." : "Search Participant"}
            </span>
          </Button>
        </form>
      </div>

      {/* Selected Participant Card */}
      {attendee && (
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800 shadow-lg p-4 sm:p-6 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
              <UserRound className="w-6 h-6 sm:w-8 sm:h-8 text-purple-700 dark:text-purple-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white uppercase">
                {attendee.fullName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ID: {attendee.uniqueId || attendee.attendeeId}
                {attendee.phone && ` • ${attendee.phone}`}
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard
              icon={<Hash className="w-4 h-4" />}
              label="UNIQUE ID"
              value={toDisplayUpper(attendee.uniqueId)}
            />
            <InfoCard
              icon={<Phone className="w-4 h-4" />}
              label="PHONE"
              value={toDisplayUpper(attendee.phone)}
            />
            <InfoCard
              icon={<UserRound className="w-4 h-4" />}
              label="GENDER"
              value={toDisplayUpper(attendee.gender)}
            />
            <InfoCard
              icon={<CalendarDays className="w-4 h-4" />}
              label="AGE"
              value={attendee.age ? toDisplayUpper(attendee.age) : "—"}
            />
            <InfoCard
              icon={<MapPin className="w-4 h-4" />}
              label="STATE / LGA"
              value={toDisplayUpper(
                [attendee.state, attendee.lga].filter(Boolean).join(" / ")
              )}
            />
            <InfoCard
              icon={<MapPin className="w-4 h-4" />}
              label="WARD"
              value={toDisplayUpper(attendee.ward)}
            />
          </div>
        </div>
      )}

      {/* Medical Information Form - Only show if attendee is selected */}
      {attendee && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Allergies */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Allergies
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Food, environmental, and drug allergies
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* General Allergies */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.hasAllergy}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        hasAllergy: e.target.checked,
                        allergyDetails: e.target.checked
                          ? formData.allergyDetails
                          : "",
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      I have allergies
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Food, pollen, dust, animals, etc.
                    </p>
                  </div>
                </label>

                {formData.hasAllergy && (
                  <div className="mt-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Please specify your allergies *
                    </label>
                    <textarea
                      value={formData.allergyDetails}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allergyDetails: e.target.value,
                        })
                      }
                      placeholder="e.g., Peanuts, shellfish, dust, pollen..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={formData.hasAllergy}
                    />
                  </div>
                )}
              </div>

              {/* Drug Allergies */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.hasDrugAllergy}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        hasDrugAllergy: e.target.checked,
                        drugAllergyType: e.target.checked
                          ? formData.drugAllergyType
                          : "",
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      I have drug allergies
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Critical
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Medications or antibiotics that cause reactions
                    </p>
                  </div>
                </label>

                {formData.hasDrugAllergy && (
                  <div className="mt-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Please specify drug allergies *
                    </label>
                    <textarea
                      value={formData.drugAllergyType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          drugAllergyType: e.target.value,
                        })
                      }
                      placeholder="e.g., Penicillin, Aspirin, Ibuprofen..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={formData.hasDrugAllergy}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Pregnancy & Women's Health */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Baby className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Pregnancy & Women's Health
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Important for event planning and emergency response
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Pregnancy */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isPregnant}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        isPregnant: e.target.checked,
                        pregnancyMonths: e.target.checked
                          ? formData.pregnancyMonths
                          : "",
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      I am currently pregnant
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Critical
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This helps us provide appropriate care and accommodations
                    </p>
                  </div>
                </label>

                {formData.isPregnant && (
                  <div className="mt-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      How many months pregnant? *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={formData.pregnancyMonths}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pregnancyMonths: e.target.value,
                        })
                      }
                      placeholder="Enter number of months (1-9)"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={formData.isPregnant}
                    />
                  </div>
                )}
              </div>

              {/* Breastfeeding */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.isBreastfeeding}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        isBreastfeeding: e.target.checked,
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      I am currently breastfeeding
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Helps us arrange appropriate facilities
                    </p>
                  </div>
                </label>
              </div>

              {/* Birth Control */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.onBirthControl}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        onBirthControl: e.target.checked,
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      I am on birth control medication
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Important for potential drug interactions
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Medications */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Current Medications
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Prescription drugs, supplements, and regular medications
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.onMedications}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        onMedications: e.target.checked,
                        medicationType: e.target.checked
                          ? formData.medicationType
                          : "",
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      I am currently on medication
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Include prescription drugs, supplements, or regular
                      medications
                    </p>
                  </div>
                </label>

                {formData.onMedications && (
                  <div className="mt-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Please list all medications *
                    </label>
                    <textarea
                      value={formData.medicationType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          medicationType: e.target.value,
                        })
                      }
                      placeholder="e.g., Lisinopril 10mg daily, Metformin 500mg twice daily, Vitamin D supplement..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={formData.onMedications}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Include dosage and frequency if possible
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Medical History */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Medical History
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Past surgeries and existing medical conditions
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Surgical History */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.hasSurgicalHistory}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        hasSurgicalHistory: e.target.checked,
                        surgicalHistoryDetails: e.target.checked
                          ? formData.surgicalHistoryDetails
                          : "",
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      I have had surgery before
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Past surgical procedures or operations
                    </p>
                  </div>
                </label>

                {formData.hasSurgicalHistory && (
                  <div className="mt-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Please describe your surgical history *
                    </label>
                    <textarea
                      value={formData.surgicalHistoryDetails}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          surgicalHistoryDetails: e.target.value,
                        })
                      }
                      placeholder="e.g., Appendectomy (2019), Cesarean section (2021)..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={formData.hasSurgicalHistory}
                    />
                  </div>
                )}
              </div>

              {/* Medical Conditions */}
              <div>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.hasMedicalConditions}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        hasMedicalConditions: e.target.checked,
                        medicalConditionsDetails: e.target.checked
                          ? formData.medicalConditionsDetails
                          : "",
                      });
                    }}
                    className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      I have existing medical conditions
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Critical
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Chronic illnesses, ongoing health conditions
                    </p>
                  </div>
                </label>

                {formData.hasMedicalConditions && (
                  <div className="mt-3">
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Please list all medical conditions *
                    </label>
                    <textarea
                      value={formData.medicalConditionsDetails}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          medicalConditionsDetails: e.target.value,
                        })
                      }
                      placeholder="e.g., Hypertension, Type 2 Diabetes, Asthma, Epilepsy..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required={formData.hasMedicalConditions}
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Include any conditions that may require special attention
                      during the event
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <Activity className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                By submitting this form, you confirm that all information
                provided is accurate and complete to the best of your knowledge.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl h-12 bg-purple-700 border-purple-700 hover:bg-purple-800 hover:border-purple-800"
            >
              <span className="inline-flex items-center gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Medical Information
                  </>
                )}
              </span>
            </Button>
          </div>
        </form>
      )}

      {!attendee && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-8 text-center mb-8">
          <FileHeart className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Search for a participant to begin capturing medical information
          </p>
        </div>
      )}
    </Layout>
  );
}