import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Input, Button, Pagination } from "@roketid/windmill-react-ui";
import {
  Users,
  Search,
  Edit,
  Trash2,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  User,
  Hash,
  Eye,
  Camera,
  Upload,
  Send,
  Accessibility,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import {
  CATEGORY_DISPLAY_NAMES,
  getCategoryBackendValue,
  getCategoryDisplayName,
  TITLES,
  NIGERIAN_STATES,
  PARTICIPATION_TYPES,
  GENDERS,
  YES_NO,
  COUNTRIES,
  PHONE_COUNTRY_CODES,
  DEFAULT_PHONE_COUNTRY_CODE,
} from "../../types/registration-constants";

// ─── Types ────────────────────────────────────────────────────────────────────

type Participant = {
  attendeeId: number;
  firstName: string;
  lastName: string;
  otherNames?: string;
  fullName: string;
  uniqueId: string | null;
  phoneCountryCode?: string;
  phoneNumber: string;
  email?: string;
  gender: string;
  participationType: "Physical" | "Virtual" | null;
  category: string;
  photo?: string | null;
  photoUrl?: string | null;
  title?: string;
  country?: string;
  stateOfResidence?: string;
  physicallyChallenged?: boolean;
  accessibilityNeeds?: string | null;
  organizationName?: string;
};

type FormData = {
  category: string;
  participationType: "Physical" | "Virtual" | "";
  title: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  email: string;
  country: string;
  stateOfResidence: string;
  phoneCountryCode: string;
  phoneNumber: string;
  organizationName: string;
  gender: string;
  physicallyChallenged: "Yes" | "No" | "";
  accessibilityNeeds: string;
  photo: File | null;
  photoPreview: string | null;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
};

type RegistrationResponse = {
  referenceNumber: string;
  fullName: string;
  email: string;
};

// ─── Constants (page-specific) ─────────────────────────────────────────────

const EMPTY_FORM: FormData = {
  category: "",
  participationType: "",
  title: "",
  firstName: "",
  lastName: "",
  otherNames: "",
  email: "",
  country: "Nigeria",
  stateOfResidence: "",
  phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
  phoneNumber: "",
  organizationName: "",
  gender: "",
  physicallyChallenged: "",
  accessibilityNeeds: "",
  photo: null,
  photoPreview: null,
};

const ITEMS_PER_PAGE = 10;

// ─── Helper Components ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "Physical" | "Virtual" | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
        Not Set
      </span>
    );
  }

  const styles = {
    Physical: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    Virtual: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${styles[status]}`}>
      {status === "Physical" ? "In-Person" : "Virtual"}
    </span>
  );
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

// ─── Photo Upload Component ─────────────────────────────────────────────

function PhotoUpload({
  photoPreview,
  onPhotoChange,
  error,
}: {
  photoPreview: string | null;
  onPhotoChange: (file: File | null) => void;
  error?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPhotoChange(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsCameraMode(true);
    } catch (err) {
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
            onPhotoChange(file);
            stopCamera();
          }
        },
        "image/jpeg",
        0.8
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraMode(false);
  };

  const removePhoto = () => {
    onPhotoChange(null);
    stopCamera();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Passport Photo <span className="text-red-500">*</span>
      </label>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {isCameraMode ? (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} className="w-full max-h-[400px] object-cover" autoPlay playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-3 rounded-full bg-white/90 hover:bg-white text-gray-800 font-bold shadow-lg transition-all"
            >
              <Camera className="w-5 h-5 inline-block mr-2" />
              Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-6 py-3 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-bold shadow-lg transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : photoPreview ? (
        <div className="relative inline-block">
          <img
            src={photoPreview}
            alt="Passport preview"
            className="w-32 h-32 rounded-2xl object-cover border-2 border-gray-200 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 transition-colors text-gray-600 dark:text-gray-400 hover:text-green-600"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-semibold">Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 transition-colors text-gray-600 dark:text-gray-400 hover:text-green-600"
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm font-semibold">Take Photo</span>
          </button>
        </div>
      )}
      <FieldError message={error} />
    </div>
  );
}

// ─── View Details Modal ─────────────────────────────────────────────────────

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="text-gray-400 dark:text-gray-500 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function ViewDetailsModal({
  isOpen,
  onClose,
  participant,
}: {
  isOpen: boolean;
  onClose: () => void;
  participant: Participant | null;
}) {
  if (!isOpen || !participant) return null;

  const categoryDisplay = getCategoryDisplayName(participant.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 sticky top-0 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Participant Details</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Complete registration information</p>
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
          <div className="flex items-start gap-6 pb-6 border-b border-gray-100 dark:border-gray-700">
            {participant.photoUrl ? (
              <img
                src={`${process.env.NEXT_PUBLIC_API_FILE_URL}${participant.photoUrl}`}
                width="20%"
                alt={participant.fullName}
              />
            ) : participant.photo ? (
              <img src={participant.photo} alt={participant.fullName} />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase">{participant.fullName}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                ID: {participant.uniqueId || "Not assigned"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={participant.participationType} />
                {participant.physicallyChallenged && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <Accessibility className="w-3 h-3" />
                    Accessibility support
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem icon={<User className="w-4 h-4" />} label="Title" value={participant.title || "—"} />
              <DetailItem icon={<User className="w-4 h-4" />} label="First Name" value={participant.firstName} />
              <DetailItem icon={<User className="w-4 h-4" />} label="Last Name" value={participant.lastName} />
              <DetailItem icon={<User className="w-4 h-4" />} label="Other Names" value={participant.otherNames || "—"} />
              <DetailItem icon={<User className="w-4 h-4" />} label="Gender" value={participant.gender || "—"} />
              <DetailItem
                icon={<Accessibility className="w-4 h-4" />}
                label="Accessibility support needed"
                value={participant.physicallyChallenged ? "Yes" : "No"}
              />
              {participant.physicallyChallenged && participant.accessibilityNeeds && (
                <DetailItem
                  icon={<Accessibility className="w-4 h-4" />}
                  label="Accessibility details"
                  value={participant.accessibilityNeeds}
                />
              )}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem icon={<Mail className="w-4 h-4" />} label="Email" value={participant.email || "—"} />
              <DetailItem
                icon={<Phone className="w-4 h-4" />}
                label="Phone Number"
                value={
                  participant.phoneCountryCode
                    ? `${participant.phoneCountryCode} ${participant.phoneNumber}`
                    : participant.phoneNumber
                }
              />
              <DetailItem
                icon={<MapPin className="w-4 h-4" />}
                label="Country"
                value={participant.country || "—"}
              />
              <DetailItem
                icon={<MapPin className="w-4 h-4" />}
                label="State of Residence"
                value={participant.stateOfResidence || "—"}
              />
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Registration Details
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem icon={<Hash className="w-4 h-4" />} label="Category" value={categoryDisplay} />
              <DetailItem
                icon={<Building className="w-4 h-4" />}
                label="Organization"
                value={participant.organizationName || "—"}
              />
              <DetailItem
                icon={<Calendar className="w-4 h-4" />}
                label="Participation Type"
                value={participant.participationType || "—"}
              />
              <DetailItem icon={<Hash className="w-4 h-4" />} label="Unique ID" value={participant.uniqueId || "—"} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl sticky bottom-0">
          <Button
            onClick={onClose}
            className="w-full rounded-2xl h-12 bg-gradient-to-r from-blue-600 to-indigo-600 border-0 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
          >
            <span className="font-bold">Close</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Registration Modal ─────────────────────────────────────────────────────

function RegistrationModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  initialData = EMPTY_FORM,
  mode = "create",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  submitting: boolean;
  initialData?: FormData;
  mode?: "create" | "edit";
}) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setErrors({});
      setStep(1);
    }
  }, [isOpen, initialData]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep(n: number): boolean {
    const newErrors: FormErrors = {};

    if (n === 1) {
      if (!formData.category) newErrors.category = "Please select a registration category.";
      if (!formData.participationType) newErrors.participationType = "Please select a participation type.";
    }

    if (n === 2) {
      if (!formData.title) newErrors.title = "Title is required.";
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
      if (!formData.gender) newErrors.gender = "Please select a gender.";
      if (!formData.physicallyChallenged)
        newErrors.physicallyChallenged = "Please indicate accessibility support needs.";
    }

    if (n === 3) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = "Please enter a valid email address.";
      if (!formData.country) newErrors.country = "Please select a country.";
      if (!formData.stateOfResidence.trim())
        newErrors.stateOfResidence =
          formData.country === "Nigeria"
            ? "Please select a state of residence."
            : "Please enter a state/region of residence.";
      if (formData.phoneNumber.trim().length < 7)
        newErrors.phoneNumber = "Please enter a valid phone number.";
    }

    if (n === 4) {
      if (!formData.photo && !formData.photoPreview) newErrors.photo = "Please upload a passport photo.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(4)) return;
    await onSubmit(formData);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col animate-slideUp">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase">
                {mode === "create" ? "New Registration" : "Edit Registration"}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {mode === "create" ? "Register a new participant for the conference" : "Update participant information"}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Category */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Registration Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATEGORY_DISPLAY_NAMES.map((displayName) => (
                    <button
                      key={displayName}
                      type="button"
                      onClick={() => update("category", displayName)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        formData.category === displayName
                          ? "border-green-600 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700"
                      }`}
                    >
                      <span
                        className={`text-sm font-bold uppercase tracking-wide ${
                          formData.category === displayName
                            ? "text-green-800 dark:text-green-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {displayName}
                      </span>
                      {formData.category === displayName && (
                        <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.category} />
              </div>

              <div>
                <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Participation Type <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {PARTICIPATION_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => update("participationType", type as "Physical" | "Virtual")}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold uppercase tracking-wide transition-all duration-200 ${
                        formData.participationType === type
                          ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          formData.participationType === type
                            ? "border-green-600 bg-green-600"
                            : "border-gray-300 dark:border-gray-500"
                        }`}
                      >
                        {formData.participationType === type && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                        )}
                      </span>
                      {type === "Physical" ? "In-Person" : type}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.participationType} />
              </div>
            </div>
          )}

          {/* Step 2: Personal */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-[auto,1fr,1fr] gap-4">
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors"
                    value={formData.title}
                    onChange={(e) => update("title", e.target.value)}
                  >
                    <option value="">—</option>
                    {TITLES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.title} />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                  <FieldError message={errors.firstName} />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                  <FieldError message={errors.lastName} />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Other Names <span className="text-gray-400 text-xs normal-case font-normal">(optional)</span>
                </label>
                <Input
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Middle name or other names"
                  value={formData.otherNames}
                  onChange={(e) => update("otherNames", e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => update("gender", g)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold uppercase tracking-wide transition-all duration-200 ${
                        formData.gender === g
                          ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          formData.gender === g
                            ? "border-green-600 bg-green-600"
                            : "border-gray-300 dark:border-gray-500"
                        }`}
                      >
                        {formData.gender === g && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                      </span>
                      {g}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.gender} />
              </div>

              <div>
                <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Accessibility Support Needed <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {YES_NO.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => update("physicallyChallenged", option as "Yes" | "No")}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold uppercase tracking-wide transition-all duration-200 ${
                        formData.physicallyChallenged === option
                          ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400"
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          formData.physicallyChallenged === option
                            ? "border-green-600 bg-green-600"
                            : "border-gray-300 dark:border-gray-500"
                        }`}
                      >
                        {formData.physicallyChallenged === option && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                        )}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.physicallyChallenged} />

                {formData.physicallyChallenged === "Yes" && (
                  <div className="mt-4">
                    <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Accessibility Details <span className="text-gray-400 text-xs normal-case font-normal">(optional)</span>
                    </label>
                    <textarea
                      className="w-full h-24 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm font-medium focus:border-green-500 focus:ring-green-500 transition-colors resize-none"
                      placeholder="e.g. wheelchair access, sign language interpretation..."
                      value={formData.accessibilityNeeds}
                      onChange={(e) => update("accessibilityNeeds", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="you@organisation.org"
                  value={formData.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                <FieldError message={errors.email} />
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Country <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors"
                  value={formData.country}
                  onChange={(e) => {
                    update("country", e.target.value);
                    update("stateOfResidence", "");
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.country} />
              </div>

              {formData.country === "Nigeria" ? (
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    State of Residence <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors"
                    value={formData.stateOfResidence}
                    onChange={(e) => update("stateOfResidence", e.target.value)}
                  >
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.stateOfResidence} />
                </div>
              ) : (
                <div>
                  <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    State/Region of Residence <span className="text-red-500">*</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                    placeholder="e.g. Ontario, Bavaria..."
                    value={formData.stateOfResidence}
                    onChange={(e) => update("stateOfResidence", e.target.value)}
                  />
                  <FieldError message={errors.stateOfResidence} />
                </div>
              )}

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    className="h-12 w-32 shrink-0 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors"
                    value={formData.phoneCountryCode}
                    onChange={(e) => update("phoneCountryCode", e.target.value)}
                  >
                    {PHONE_COUNTRY_CODES.map(({ country, dial }) => (
                      <option key={country} value={dial}>
                        {dial ? `${dial} ${country}` : country}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="tel"
                    className="h-12 flex-1 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                    placeholder="e.g. 8031234567 (no leading 0)"
                    value={formData.phoneNumber}
                    onChange={(e) => update("phoneNumber", e.target.value)}
                  />
                </div>
                <FieldError message={errors.phoneNumber} />
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Organisation Name{" "}
                  <span className="text-gray-400 text-xs normal-case font-normal">(optional)</span>
                </label>
                <Input
                  className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600"
                  placeholder="Your institution, company, or body"
                  value={formData.organizationName}
                  onChange={(e) => update("organizationName", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 4: Photo Upload */}
          {step === 4 && (
            <div className="space-y-5">
              <PhotoUpload
                photoPreview={formData.photoPreview}
                onPhotoChange={(file) => {
                  update("photo", file);
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      update("photoPreview", reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    update("photoPreview", null);
                  }
                }}
                error={errors.photo}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            {step > 1 ? (
              <Button layout="outline" className="rounded-2xl h-12 border-2" onClick={goBack} type="button" disabled={submitting}>
                <span className="font-semibold">Back</span>
              </Button>
            ) : (
              <span />
            )}

            {step < 4 ? (
              <Button
                className="rounded-2xl h-12 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                onClick={goNext}
                type="button"
              >
                <span className="font-bold uppercase">Next →</span>
              </Button>
            ) : (
              <Button
                type="submit"
                className="rounded-2xl h-12 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg disabled:opacity-60"
                disabled={submitting}
              >
                <span className="inline-flex items-center gap-2 font-bold uppercase">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {submitting ? "Submitting..." : mode === "create" ? "Register" : "Update"}
                </span>
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RegistrationManagementPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [viewingParticipant, setViewingParticipant] = useState<Participant | null>(null);
  const [resendingPass, setResendingPass] = useState<number | null>(null);

  async function handleResendPass(participant: Participant) {
    try {
      setResendingPass(participant.attendeeId);
      const { data } = await api.post<ApiSuccess<null>>(
        `/conference/participants/${participant.attendeeId}/resend-pass`
      );
      toast.success(data.message || "Pass resent successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend pass. Please try again.");
    } finally {
      setResendingPass(null);
    }
  }

  async function fetchParticipants() {
    try {
      setLoading(true);
      const response = await api.get<ApiSuccess<Participant[]>>("/conference/participants");
      setParticipants(response.data.data || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
      toast.error("Failed to load participants");
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchParticipants();
  }, []);

  const filteredParticipants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return participants;

    return participants.filter(
      (p) =>
        p.fullName.toLowerCase().includes(query) ||
        p.phoneNumber.includes(query) ||
        p.uniqueId?.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        getCategoryDisplayName(p.category).toLowerCase().includes(query)
    );
  }, [participants, searchQuery]);

  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredParticipants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredParticipants, currentPage]);

  const totalPages = Math.ceil(filteredParticipants.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  function buildPayload(formData: FormData): globalThis.FormData {
    const payload = new FormData();
    payload.append("category", getCategoryBackendValue(formData.category));
    payload.append("participationType", formData.participationType);
    payload.append("title", formData.title);
    payload.append("firstName", formData.firstName.trim());
    payload.append("lastName", formData.lastName.trim());
    payload.append("otherNames", formData.otherNames.trim() || "");
    payload.append("email", formData.email.trim());
    payload.append("country", formData.country);
    payload.append("stateOfResidence", formData.stateOfResidence.trim());
    payload.append("phoneCountryCode", formData.phoneCountryCode);
    payload.append("phoneNumber", formData.phoneNumber.trim());
    payload.append("organizationName", formData.organizationName.trim() || "");
    payload.append("gender", formData.gender);
    payload.append("physicallyChallenged", formData.physicallyChallenged === "Yes" ? "1" : "0");
    payload.append("accessibilityNeeds", formData.accessibilityNeeds.trim() || "");
    if (formData.photo) {
      payload.append("photo", formData.photo);
    }
    return payload;
  }

  async function handleCreate(formData: FormData) {
    try {
      setSubmitting(true);
      const payload = buildPayload(formData);
      payload.append("_method", "PUT");

      const { data } = await api.post<ApiSuccess<RegistrationResponse>>("/conference/register", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(data.message || "Registration successful!");
      await fetchParticipants();
      setIsModalOpen(false);
    } catch (err: any) {
      const validationErrors = err?.response?.data?.errors;
      let message = err?.response?.data?.message || "Registration failed. Please try again.";
      if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        if (firstKey && validationErrors[firstKey]?.[0]) message = validationErrors[firstKey][0];
      }
      toast.error(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(formData: FormData) {
    if (!editingParticipant) return;
    try {
      setSubmitting(true);
      const payload = buildPayload(formData);

      const { data } = await api.post<ApiSuccess<RegistrationResponse>>(
        `/conference/participants/${editingParticipant.attendeeId}`,
        payload,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success(data.message || "Participant updated successfully!");
      await fetchParticipants();
      setIsModalOpen(false);
      setEditingParticipant(null);
    } catch (err: any) {
      const validationErrors = err?.response?.data?.errors;
      let message = err?.response?.data?.message || "Update failed. Please try again.";
      if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        if (firstKey && validationErrors[firstKey]?.[0]) message = validationErrors[firstKey][0];
      }
      toast.error(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(`/conference/participants/${id}`);
      toast.success("Participant deleted successfully!");
      await fetchParticipants();
      setDeleteConfirm(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete participant");
    }
  }

  function openEditModal(participant: Participant) {
    setEditingParticipant(participant);
    setIsModalOpen(true);
  }

  function getFormDataFromParticipant(participant: Participant): FormData {
    const categoryDisplayName = getCategoryDisplayName(participant.category);

    return {
      category: categoryDisplayName,
      participationType: participant.participationType || "",
      title: participant.title || "",
      firstName: participant.firstName,
      lastName: participant.lastName,
      otherNames: participant.otherNames || "",
      email: participant.email || "",
      country: participant.country || "Nigeria",
      stateOfResidence: participant.stateOfResidence || "",
      phoneCountryCode: participant.phoneCountryCode || DEFAULT_PHONE_COUNTRY_CODE,
      phoneNumber: participant.phoneNumber,
      organizationName: participant.organizationName || "",
      gender: participant.gender,
      physicallyChallenged: participant.physicallyChallenged ? "Yes" : "No",
      accessibilityNeeds: participant.accessibilityNeeds || "",
      photo: null,
      photoPreview: participant.photo || null,
    };
  }

  function openViewModal(participant: Participant) {
    setViewingParticipant(participant);
  }

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
            transform: translateY(100%) scale(0.95);
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
            <PageTitle>Registration Management</PageTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              View and manage all registered conference participants
            </p>
          </div>

          <Button
            className="rounded-2xl h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => {
              setEditingParticipant(null);
              setIsModalOpen(true);
            }}
          >
            <span className="inline-flex items-center gap-2 font-bold">
              <UserPlus className="w-5 h-5" />
              New Registration
            </span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 mb-8">
        <div className="relative">
          <Input
            className="pl-12 h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-sm text-base font-semibold focus:border-green-500 focus:ring-green-500 transition-all duration-200"
            placeholder="Search by name, phone, unique ID, or category..."
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
            : `${filteredParticipants.length} participant${filteredParticipants.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide font-bold text-gray-600 dark:text-gray-400 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="py-4 px-4">#</th>
                <th className="py-4 px-4">Photo</th>
                <th className="py-4 px-4">Attendee ID</th>
                <th className="py-4 px-4">Full Name</th>
                <th className="py-4 px-4">Phone</th>
                <th className="py-4 px-4">Gender</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
                    <p className="mt-4 font-semibold">Loading participants...</p>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-4 font-semibold">
                      {searchQuery ? "No matching participants found" : "No participants registered yet"}
                    </p>
                    {!searchQuery && (
                      <Button
                        className="mt-4 rounded-2xl h-11 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                        onClick={() => setIsModalOpen(true)}
                      >
                        <span className="font-bold">Register First Participant</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map((participant, index) => {
                  const categoryDisplay = getCategoryDisplayName(participant.category);
                  return (
                    <tr
                      key={participant.attendeeId}
                      className="border-b border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                    >
                      <td className="py-4 px-4 font-medium text-gray-400">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="py-4 px-4">
                        {participant.photoUrl ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_FILE_URL}${participant.photoUrl}`}
                            alt={participant.fullName}
                            className="lg:w-16 lg:h-16 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                          />
                        ) : participant.photo ? (
                          <img
                            src={participant.photo}
                            alt={participant.fullName}
                            className="lg:w-12 lg:h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-bold uppercase">
                        {participant.uniqueId || "—"}
                      </td>
                      <td className="py-4 px-4 font-bold uppercase whitespace-nowrap">
                        {participant.title} {participant.fullName}
                        {participant.physicallyChallenged && (
                          <Accessibility className="w-3.5 h-3.5 inline-block ml-1.5 text-amber-500" />
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {participant.phoneCountryCode
                          ? `${participant.phoneCountryCode} ${participant.phoneNumber}`
                          : participant.phoneNumber}
                      </td>
                      <td className="py-4 px-4 text-sm uppercase">{participant.gender || "—"}</td>
                      <td className="py-4 px-4 text-xs font-semibold uppercase max-w-[120px] truncate">
                        {categoryDisplay}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={participant.participationType} />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openViewModal(participant)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleResendPass(participant)}
                            disabled={resendingPass === participant.attendeeId || !participant.email}
                            className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={participant.email ? "Resend Pass" : "No email on record"}
                          >
                            {resendingPass === participant.attendeeId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => openEditModal(participant)}
                            className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(participant.attendeeId)}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredParticipants.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Pagination
              totalResults={filteredParticipants.length}
              resultsPerPage={ITEMS_PER_PAGE}
              onChange={setCurrentPage}
              label="Participants navigation"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 p-6 animate-slideUp">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this participant? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <Button layout="outline" className="rounded-2xl h-12 flex-1 border-2" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="rounded-2xl h-12 flex-1 bg-red-600 border-0 hover:bg-red-700"
                onClick={() => handleDelete(deleteConfirm)}
              >
                <span className="font-bold">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      <ViewDetailsModal isOpen={!!viewingParticipant} onClose={() => setViewingParticipant(null)} participant={viewingParticipant} />

      <RegistrationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingParticipant(null);
        }}
        onSubmit={editingParticipant ? handleUpdate : handleCreate}
        submitting={submitting}
        initialData={editingParticipant ? getFormDataFromParticipant(editingParticipant) : EMPTY_FORM}
        mode={editingParticipant ? "edit" : "create"}
      />

      <div className="pb-20" />
    </Layout>
  );
}