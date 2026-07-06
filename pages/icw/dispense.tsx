import React, { useState, useEffect } from "react";
import { Button, Badge } from "@roketid/windmill-react-ui";
import {
  Search,
  Pill,
  User,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  AlertTriangle,
  Heart,
  Baby,
  Syringe,
  Activity,
  Plus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type Attendee = {
  attendeeId: number;
  fullName: string;
  phoneNumber?: string;
  state?: string;
  lga?: string;
};

type MedicalInfo = {
  hasAllergy: boolean;
  allergyDetails?: string;
  hasDrugAllergy: boolean;
  drugAllergyType?: string;
  isPregnant: boolean;
  pregnancyMonths?: string;
  isBreastfeeding: boolean;
  onMedications: boolean;
  medicationType?: string;
  onBirthControl: boolean;
  hasSurgicalHistory: boolean;
  hasMedicalConditions: boolean;
  medicalConditionsDetails?: string;
};

type MedicationHistory = {
  dispensingId: number;
  drugName: string;
  quantityDispensed: number;
  symptoms: string | null;
  instructions: string | null;
  batchNumber: string;
  dispensedBy: string;
  dispensedAt: string;
};

type AvailableMedication = {
  drugName: string;
  totalRemaining: number;
  nearestExpiry: string;
  isExpiringSoon: boolean;
};

type MedicationItem = {
  id: string;
  drugName: string;
  quantity: string;
  symptoms: string;
  instructions: string;
};

export default function MedicationDispensingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [loadingMedicalInfo, setLoadingMedicalInfo] = useState(false);
  const [medicationHistory, setMedicationHistory] = useState<MedicationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Available medications
  const [availableMedications, setAvailableMedications] = useState<AvailableMedication[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(true);

  // Multiple medications dispensing
  const [medications, setMedications] = useState<MedicationItem[]>([
    { id: "1", drugName: "", quantity: "", symptoms: "", instructions: "" }
  ]);
  const [dispensing, setDispensing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Dispensing form
  const [isParticipant, setIsParticipant] = useState(true);

  // Non-participant fields
  const [recipientName, setRecipientName] = useState("");
  const [recipientType, setRecipientType] = useState<"staff" | "visitor" | "other">("staff");
  const [recipientNotes, setRecipientNotes] = useState("");

  useEffect(() => {
    loadAvailableMedications();
  }, []);

  async function loadAvailableMedications() {
    try {
      setLoadingMedications(true);
      const { data } = await api.get("/medications/available");
      setAvailableMedications(data.medications || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load available medications"
      );
    } finally {
      setLoadingMedications(false);
    }
  }

  async function handleSearch() {
    if (searchTerm.trim().length < 2) {
      toast.error("Please enter at least 2 characters to search");
      return;
    }

    try {
      setSearching(true);
      const { data } = await api.get("/medications/attendees/search", {
        params: { search: searchTerm.trim() },
      });

      setAttendees(data.attendees || []);

      if (data.attendees.length === 0) {
        toast.error("No participants found matching your search");
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to search participants"
      );
    } finally {
      setSearching(false);
    }
  }

  async function selectAttendee(attendee: Attendee) {
    setSelectedAttendee(attendee);
    setAttendees([]);
    setSearchTerm("");

    // Load medical information
    try {
      setLoadingMedicalInfo(true);
      const { data } = await api.get(
        `/medications/attendees/${attendee.attendeeId}/medical-info`
      );
      setMedicalInfo(data.medicalInfo || null);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load medical information"
      );
      setMedicalInfo(null);
    } finally {
      setLoadingMedicalInfo(false);
    }

    // Load medication history
    try {
      setLoadingHistory(true);
      const { data } = await api.get(
        `/medications/attendees/${attendee.attendeeId}/history`
      );
      setMedicationHistory(data.history || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load medication history"
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  function addMedication() {
    const newId = (Math.max(...medications.map(m => parseInt(m.id)), 0) + 1).toString();
    setMedications([...medications, { 
      id: newId, 
      drugName: "", 
      quantity: "", 
      symptoms: "", 
      instructions: "" 
    }]);
  }

  function removeMedication(id: string) {
    if (medications.length === 1) {
      toast.error("You must have at least one medication");
      return;
    }
    setMedications(medications.filter(m => m.id !== id));
  }

  function updateMedication(id: string, field: keyof MedicationItem, value: string) {
    setMedications(medications.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  }

  async function handleDispense(e: React.FormEvent) {
    e.preventDefault();

    if (isParticipant && !selectedAttendee) {
      toast.error("Please select a participant first");
      return;
    }

    if (!isParticipant && !recipientName.trim()) {
      toast.error("Please enter recipient name");
      return;
    }

    // Validate all medications
    const validMedications = medications.filter(m => m.drugName.trim() && m.quantity);
    
    if (validMedications.length === 0) {
      toast.error("Please add at least one medication with drug name and quantity");
      return;
    }

    // Check stock for all medications
    for (const med of validMedications) {
      const selectedMed = availableMedications.find(m => m.drugName === med.drugName);
      if (selectedMed && parseInt(med.quantity) > selectedMed.totalRemaining) {
        toast.error(`Insufficient stock for ${med.drugName}. Only ${selectedMed.totalRemaining} units available.`);
        return;
      }
    }

    // Warning for drug allergies
    if (isParticipant && medicalInfo?.hasDrugAllergy && medicalInfo?.drugAllergyType) {
      const allergyWarning = `⚠️ WARNING: Patient has drug allergy to ${medicalInfo.drugAllergyType}`;
      toast.error(allergyWarning, { duration: 5000 });
    }

    // Warning for pregnancy
    if (isParticipant && medicalInfo?.isPregnant) {
      const pregnancyWarning = `⚠️ WARNING: Patient is pregnant ${medicalInfo.pregnancyMonths ? `(${medicalInfo.pregnancyMonths})` : ''}`;
      toast.error(pregnancyWarning, { duration: 5000 });
    }

    try {
      setDispensing(true);
      
      // Dispense each medication
      const promises = validMedications.map(med => {
        const payload: any = {
          isParticipant,
          drugName: med.drugName.trim(),
          quantityDispensed: parseInt(med.quantity),
          symptoms: med.symptoms.trim() || null,
          instructions: med.instructions.trim() || null,
        };

        if (isParticipant) {
          payload.attendeeId = selectedAttendee!.attendeeId;
        } else {
          payload.recipientName = recipientName.trim();
          payload.recipientType = recipientType;
          payload.recipientNotes = recipientNotes.trim() || null;
        }

        return api.post("/medications/dispense", payload);
      });

      await Promise.all(promises);

      toast.success(`${validMedications.length} medication(s) dispensed successfully`);

      // Show success message
      setShowSuccessMessage(true);

      // Reset form
      setMedications([{ id: "1", drugName: "", quantity: "", symptoms: "", instructions: "" }]);
      setRecipientName("");
      setRecipientNotes("");

      // Reload medications (to update available quantities)
      loadAvailableMedications();

      // Reload history if participant
      if (isParticipant && selectedAttendee) {
        const { data: historyData } = await api.get(
          `/medications/attendees/${selectedAttendee.attendeeId}/history`
        );
        setMedicationHistory(historyData.history || []);
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to dispense medication"
      );
    } finally {
      setDispensing(false);
    }
  }

  function clearSelection() {
    setSelectedAttendee(null);
    setMedicalInfo(null);
    setMedicationHistory([]);
    setMedications([{ id: "1", drugName: "", quantity: "", symptoms: "", instructions: "" }]);
    setRecipientName("");
    setRecipientNotes("");
    setShowSuccessMessage(false);
  }

  // Check if there are critical medical alerts
  const hasCriticalAlerts = medicalInfo && (
    medicalInfo.hasDrugAllergy || 
    medicalInfo.isPregnant || 
    medicalInfo.hasMedicalConditions
  );

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <PageTitle>Dispense Medication</PageTitle>
        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Search for participants and dispense medications
        </p>

        {/* Hero Banner */}
        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900 via-teal-800 to-teal-700 shadow-xl">
          <div className="px-4 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-2 py-1 sm:px-3 sm:py-1 text-[8px] sm:text-xs font-semibold tracking-wide uppercase">
                Medical Care
              </div>

              <h2 className="mt-2 sm:mt-3 text-lg sm:text-3xl font-bold leading-tight">
                Provide medical care to participants
              </h2>

              <p className="mt-1 sm:mt-2 text-xs sm:text-base text-slate-200 leading-5 sm:leading-6">
                Track symptoms, dispense medications, and view patient history
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recipient Type Toggle */}
      <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-5">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Dispensing For
        </h3>
        
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setIsParticipant(true);
              setRecipientName("");
              setRecipientNotes("");
            }}
            className={`flex-1 px-4 py-3 rounded-2xl border-2 font-medium transition-all ${
              isParticipant
                ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              <span>Participant</span>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsParticipant(false);
              setSelectedAttendee(null);
              setMedicalInfo(null);
              setMedicationHistory([]);
            }}
            className={`flex-1 px-4 py-3 rounded-2xl border-2 font-medium transition-all ${
              !isParticipant
                ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              <span>Staff/Visitor/Other</span>
            </div>
          </button>
        </div>
      </div>

      {/* Search Section (Only for Participants) */}
      {isParticipant && !selectedAttendee && (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-5">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search for Participant
          </h3>

          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="text"
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter participant name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searching || searchTerm.trim().length < 2}
              className="rounded-2xl h-auto px-6 bg-purple-700 border-purple-700 hover:bg-purple-800 hover:border-purple-800"
            >
              <span className="inline-flex items-center gap-2">
                <Search className="w-4 h-4" />
                {searching ? "Searching..." : "Search"}
              </span>
            </Button>
          </div>

          {/* Search Results */}
          {attendees.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {attendees.length} participant{attendees.length > 1 ? "s" : ""} found
              </p>
              {attendees.map((attendee) => (
                <div
                  key={attendee.attendeeId}
                  onClick={() => selectAttendee(attendee)}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {attendee.fullName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        ID: {attendee.attendeeId}
                        {attendee.phoneNumber && ` • ${attendee.phoneNumber}`}
                        {attendee.state && ` • ${attendee.lga}, ${attendee.state}`}
                      </p>
                    </div>
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Non-Participant Section */}
      {!isParticipant && (
        <div className="space-y-5">
          {/* Non-Participant Info Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800 shadow-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recipient Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recipient Type *
                </label>
                <select
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as "staff" | "visitor" | "other")}
                  required
                >
                  <option value="staff">Staff Member</option>
                  <option value="visitor">Visitor</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={2}
                  value={recipientNotes}
                  onChange={(e) => setRecipientNotes(e.target.value)}
                  placeholder="e.g., Department, contact info, etc."
                />
              </div>
            </div>
          </div>

          {/* Success Message */}
          {showSuccessMessage && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    Medication(s) Dispensed Successfully
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    The medication(s) have been recorded for {recipientName}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dispensing Form for Non-Participants */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Dispense Medication(s)
              </h3>
              <Button
                onClick={addMedication}
                size="small"
                className="rounded-xl"
              >
                <span className="inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add Medication
                </span>
              </Button>
            </div>

            {!loadingMedications && availableMedications.length === 0 && (
              <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                      No Medications Available
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      There are no medications in stock. Please record medication supplies first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleDispense} className="space-y-6">
              {medications.map((med, index) => (
                <div key={med.id} className="relative border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(med.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="mb-2">
                    <Badge type="neutral" className="text-xs">
                      Medication {index + 1}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Medication *
                      </label>
                      {loadingMedications ? (
                        <div className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                          Loading medications...
                        </div>
                      ) : availableMedications.length === 0 ? (
                        <div className="w-full px-4 py-3 rounded-2xl border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                          No medications available in inventory
                        </div>
                      ) : (
                        <select
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          value={med.drugName}
                          onChange={(e) => updateMedication(med.id, "drugName", e.target.value)}
                          required
                        >
                          <option value="">-- Select Medication --</option>
                          {availableMedications.map((availMed) => (
                            <option key={availMed.drugName} value={availMed.drugName}>
                              {availMed.drugName} ({availMed.totalRemaining} units available)
                              {availMed.isExpiringSoon && " - Expiring Soon"}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {med.drugName && (
                        <div className="mt-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                          {(() => {
                            const selectedMed = availableMedications.find(m => m.drugName === med.drugName);
                            if (!selectedMed) return null;
                            
                            return (
                              <div className="flex items-center justify-between text-sm">
                                <div>
                                  <p className="font-medium text-purple-900 dark:text-purple-100">
                                    {selectedMed.drugName}
                                  </p>
                                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                    Available Stock: <span className="font-semibold">{selectedMed.totalRemaining}</span> units
                                    {selectedMed.isExpiringSoon && (
                                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                                        ⚠️ Expiring Soon
                                      </span>
                                    )}
                                  </p>
                                </div>
                                {selectedMed.isExpiringSoon && (
                                  <Badge type="warning" className="text-xs">
                                    Use First
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={med.quantity}
                        onChange={(e) => updateMedication(med.id, "quantity", e.target.value)}
                        placeholder="Number of tablets/units"
                        min="1"
                        max={
                          med.drugName
                            ? availableMedications.find(m => m.drugName === med.drugName)?.totalRemaining || 999
                            : 999
                        }
                        required
                        disabled={!med.drugName}
                      />
                      {med.drugName && med.quantity && (() => {
                        const selectedMed = availableMedications.find(m => m.drugName === med.drugName);
                        const remaining = selectedMed ? selectedMed.totalRemaining - parseInt(med.quantity || "0") : 0;
                        const exceedsStock = selectedMed && parseInt(med.quantity) > selectedMed.totalRemaining;
                        
                        return (
                          <p className={`text-xs mt-2 ${exceedsStock ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                            {exceedsStock ? (
                              `⚠️ Insufficient stock! Only ${selectedMed.totalRemaining} units available.`
                            ) : (
                              `Stock after dispensing: ${remaining} units`
                            )}
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Symptoms / Reason
                      </label>
                      <textarea
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        value={med.symptoms}
                        onChange={(e) => updateMedication(med.id, "symptoms", e.target.value)}
                        placeholder="e.g., Headache, Fever, Body aches..."
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Instructions / Dosage
                      </label>
                      <textarea
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        value={med.instructions}
                        onChange={(e) => updateMedication(med.id, "instructions", e.target.value)}
                        placeholder="e.g., Take 2 tablets every 6 hours after meals..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="submit"
                disabled={
                  dispensing || 
                  !recipientName.trim() || 
                  availableMedications.length === 0 ||
                  medications.every(m => !m.drugName.trim() || !m.quantity)
                }
                className="w-full rounded-2xl h-12 bg-purple-700 border-purple-700 hover:bg-purple-800 hover:border-purple-800"
              >
                <span className="inline-flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  {dispensing 
                    ? "Dispensing..." 
                    : availableMedications.length === 0 
                    ? "No Medications Available" 
                    : `Dispense ${medications.filter(m => m.drugName.trim() && m.quantity).length} Medication(s)`
                  }
                </span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Selected Participant Section (Only for Participants) */}
      {isParticipant && selectedAttendee && (
        <div className="space-y-5">
          {/* Participant Info Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-100 dark:border-purple-800 shadow-lg p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-purple-700 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {selectedAttendee.fullName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ID: {selectedAttendee.attendeeId}
                    {selectedAttendee.phoneNumber && ` • ${selectedAttendee.phoneNumber}`}
                  </p>
                  {selectedAttendee.state && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedAttendee.lga}, {selectedAttendee.state}
                    </p>
                  )}
                </div>
              </div>
              <Button
                layout="outline"
                onClick={clearSelection}
                className="rounded-2xl"
              >
                Change
              </Button>
            </div>
          </div>

          {/* Medical Information Card */}
          {loadingMedicalInfo ? (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Loading medical information...
                </p>
              </div>
            </div>
          ) : medicalInfo && (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Medical Information
                </h3>
                {hasCriticalAlerts && (
                  <Badge type="danger" className="text-xs">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Critical Alerts
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drug Allergies - Critical Alert */}
                {medicalInfo.hasDrugAllergy && (
                  <div className="col-span-full rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 dark:text-red-100 text-sm">
                          ⚠️ DRUG ALLERGY ALERT
                        </h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Allergic to: <span className="font-semibold">{medicalInfo.drugAllergyType || "Specific drug not specified"}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pregnancy - Critical Alert */}
                {medicalInfo.isPregnant && (
                  <div className="col-span-full rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 p-4">
                    <div className="flex items-start gap-3">
                      <Baby className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm">
                          ⚠️ PREGNANCY ALERT
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Patient is pregnant {medicalInfo.pregnancyMonths && `(${medicalInfo.pregnancyMonths})`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Medical Conditions - Critical Alert */}
                {medicalInfo.hasMedicalConditions && (
                  <div className="col-span-full rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 p-4">
                    <div className="flex items-start gap-3">
                      <Heart className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-orange-900 dark:text-orange-100 text-sm">
                          ⚠️ MEDICAL CONDITION ALERT
                        </h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                          {medicalInfo.medicalConditionsDetails || "Kidney disease, heart conditions, hypertension, or diabetes"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* General Allergies */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${medicalInfo.hasAllergy ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        General Allergies
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {medicalInfo.hasAllergy ? (
                          medicalInfo.allergyDetails || "Yes (details not specified)"
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">No known allergies</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breastfeeding */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    <Baby className={`w-5 h-5 shrink-0 mt-0.5 ${medicalInfo.isBreastfeeding ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Breastfeeding
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {medicalInfo.isBreastfeeding ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">No</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Medications */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    <Pill className={`w-5 h-5 shrink-0 mt-0.5 ${medicalInfo.onMedications ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Current Medications
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {medicalInfo.onMedications ? (
                          medicalInfo.medicationType || "Yes (type not specified)"
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">None</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Birth Control */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    <Syringe className={`w-5 h-5 shrink-0 mt-0.5 ${medicalInfo.onBirthControl ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Birth Control
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {medicalInfo.onBirthControl ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">No</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Surgical History */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start gap-3">
                    <Activity className={`w-5 h-5 shrink-0 mt-0.5 ${medicalInfo.hasSurgicalHistory ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Surgical History
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {medicalInfo.hasSurgicalHistory ? (
                          <span className="text-teal-600 dark:text-teal-400 font-medium">Yes</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">No previous surgeries</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccessMessage && (
            <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    Medication(s) Dispensed Successfully
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    The medication(s) have been recorded in the participant's history.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dispensing Form */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Dispense Medication(s)
              </h3>
              <Button
                onClick={addMedication}
                size="small"
                className="rounded-xl"
              >
                <span className="inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add Medication
                </span>
              </Button>
            </div>

            {/* Critical Warnings */}
            {hasCriticalAlerts && (
              <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 dark:text-red-200 font-medium">
                    Review medical alerts above before dispensing medication
                  </p>
                </div>
              </div>
            )}

            {!loadingMedications && availableMedications.length === 0 && (
              <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                      No Medications Available
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      There are no medications in stock. Please record medication supplies first.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleDispense} className="space-y-6">
              {medications.map((med, index) => (
                <div key={med.id} className="relative border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedication(med.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="mb-2">
                    <Badge type="neutral" className="text-xs">
                      Medication {index + 1}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Medication *
                      </label>
                      {loadingMedications ? (
                        <div className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm">
                          Loading medications...
                        </div>
                      ) : availableMedications.length === 0 ? (
                        <div className="w-full px-4 py-3 rounded-2xl border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                          No medications available in inventory
                        </div>
                      ) : (
                        <select
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          value={med.drugName}
                          onChange={(e) => updateMedication(med.id, "drugName", e.target.value)}
                          required
                        >
                          <option value="">-- Select Medication --</option>
                          {availableMedications.map((availMed) => (
                            <option key={availMed.drugName} value={availMed.drugName}>
                              {availMed.drugName} ({availMed.totalRemaining} units available)
                              {availMed.isExpiringSoon && " - Expiring Soon"}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {med.drugName && (
                        <div className="mt-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                          {(() => {
                            const selectedMed = availableMedications.find(m => m.drugName === med.drugName);
                            if (!selectedMed) return null;
                            
                            return (
                              <div className="flex items-center justify-between text-sm">
                                <div>
                                  <p className="font-medium text-purple-900 dark:text-purple-100">
                                    {selectedMed.drugName}
                                  </p>
                                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                    Available Stock: <span className="font-semibold">{selectedMed.totalRemaining}</span> units
                                    {selectedMed.isExpiringSoon && (
                                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                                        ⚠️ Expiring Soon
                                      </span>
                                    )}
                                  </p>
                                </div>
                                {selectedMed.isExpiringSoon && (
                                  <Badge type="warning" className="text-xs">
                                    Use First
                                  </Badge>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={med.quantity}
                        onChange={(e) => updateMedication(med.id, "quantity", e.target.value)}
                        placeholder="Number of tablets/units"
                        min="1"
                        max={
                          med.drugName
                            ? availableMedications.find(m => m.drugName === med.drugName)?.totalRemaining || 999
                            : 999
                        }
                        required
                        disabled={!med.drugName}
                      />
                      {med.drugName && med.quantity && (() => {
                        const selectedMed = availableMedications.find(m => m.drugName === med.drugName);
                        const remaining = selectedMed ? selectedMed.totalRemaining - parseInt(med.quantity || "0") : 0;
                        const exceedsStock = selectedMed && parseInt(med.quantity) > selectedMed.totalRemaining;
                        
                        return (
                          <p className={`text-xs mt-2 ${exceedsStock ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}>
                            {exceedsStock ? (
                              `⚠️ Insufficient stock! Only ${selectedMed.totalRemaining} units available.`
                            ) : (
                              `Stock after dispensing: ${remaining} units`
                            )}
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Symptoms / Reason
                      </label>
                      <textarea
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        value={med.symptoms}
                        onChange={(e) => updateMedication(med.id, "symptoms", e.target.value)}
                        placeholder="e.g., Headache, Fever, Body aches..."
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Instructions / Dosage
                      </label>
                      <textarea
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                        value={med.instructions}
                        onChange={(e) => updateMedication(med.id, "instructions", e.target.value)}
                        placeholder="e.g., Take 2 tablets every 6 hours after meals..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="submit"
                disabled={
                  dispensing || 
                  availableMedications.length === 0 ||
                  medications.every(m => !m.drugName.trim() || !m.quantity)
                }
                className="w-full rounded-2xl h-12 bg-purple-700 border-purple-700 hover:bg-purple-800 hover:border-purple-800"
              >
                <span className="inline-flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  {dispensing 
                    ? "Dispensing..." 
                    : availableMedications.length === 0 
                    ? "No Medications Available" 
                    : `Dispense ${medications.filter(m => m.drugName.trim() && m.quantity).length} Medication(s)`
                  }
                </span>
              </Button>
            </form>
          </div>

          {/* Medication History */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6 mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Medication History
            </h3>

            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Loading history...
                </p>
              </div>
            ) : medicationHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No medication history for this participant
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {medicationHistory.map((record) => (
                  <div
                    key={record.dispensingId}
                    className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {record.drugName}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(record.dispensedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge type="primary">
                        {record.quantityDispensed} unit{record.quantityDispensed > 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {record.symptoms && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Symptoms:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {record.symptoms}
                        </p>
                      </div>
                    )}

                    {record.instructions && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Instructions:
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {record.instructions}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Batch: {record.batchNumber}</span>
                      <span>•</span>
                      <span>By: {record.dispensedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}