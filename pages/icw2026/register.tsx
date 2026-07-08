import React, { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Input, Button } from "@roketid/windmill-react-ui";
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Camera,
  Upload,
  ChevronRight,
  CheckCircle,
  Heart,
  Users,
  Award,
  Shield,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";
import {
  CATEGORY_DISPLAY_NAMES,
  getCategoryBackendValue,
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

// ─── Helper Components ─────────────────────────────────────────────────────

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
    if (file) {
      onPhotoChange(file);
    }
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
            const file = new File([blob], `photo-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
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
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        Passport Photo <span className="text-red-500">*</span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isCameraMode ? (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full max-h-[400px] object-cover"
            autoPlay
            playsInline
          />
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-500 transition-colors text-gray-600 dark:text-gray-400 hover:text-teal-600"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-semibold">Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-teal-500 transition-colors text-gray-600 dark:text-gray-400 hover:text-teal-600"
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

// ─── Progress Steps ─────────────────────────────────────────────────────

function ProgressSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "Category" },
    { number: 2, label: "Personal" },
    { number: 3, label: "Contact" },
    { number: 4, label: "Photo" },
  ];

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold transition-all duration-300 ${
                step.number <= currentStep
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
              }`}
            >
              {step.number < currentStep ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>
            {step.number < 4 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 transition-all duration-300 ${
                  step.number < currentStep
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {steps.map((step) => (
          <span
            key={step.number}
            className={step.number <= currentStep ? "text-teal-600 dark:text-teal-400" : ""}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Registration Page ─────────────────────────────────────────────

export default function RegistrationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setStep(1);
    setSubmitted(false);
    setSubmitting(false);
  };

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
        newErrors.physicallyChallenged = "Please let us know if you require accessibility support.";
    }

    if (n === 3) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = "Please enter a valid email address.";
      if (!formData.country) newErrors.country = "Please select a country.";
      if (!formData.stateOfResidence.trim())
        newErrors.stateOfResidence =
          formData.country === "Nigeria"
            ? "Please select your state of residence."
            : "Please enter your state/region of residence.";
      if (formData.phoneNumber.trim().length < 7)
        newErrors.phoneNumber = "Please enter a valid phone number.";
    }

    if (n === 4) {
      if (!formData.photo) newErrors.photo = "Please upload a passport photo.";
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

    try {
      setSubmitting(true);

      const categoryBackendValue = getCategoryBackendValue(formData.category);

      const payload = new FormData();
      payload.append("_method", "PUT");
      payload.append("category", categoryBackendValue);
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

      const { data } = await api.post<ApiSuccess<RegistrationResponse>>(
        "/conference/attendee/register",
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(data.message || "Registration successful!");
      setSubmitted(true);
    } catch (err: any) {
      const validationErrors = err?.response?.data?.errors;
      let message = err?.response?.data?.message || "Registration failed. Please try again.";

      if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        if (firstKey && validationErrors[firstKey]?.[0]) {
          message = validationErrors[firstKey][0];
        }
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-6 ring-8 ring-teal-50 dark:ring-teal-900/10">
            <CheckCircle className="w-12 h-12 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            ICW 2026 Registration Successful!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
            Your details have been recorded successfully. Kindly check your email for further details.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => {
                resetForm();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-2xl h-12 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 border-0 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all"
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <ArrowLeft className="w-4 h-4" />
                Register Another Participant
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Logo & Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/25">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                2026 International Cancer Week
              </h1>
              <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                Registration Portal
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-500" />
                <span>Global Impact</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-teal-500" />
                <span>Expert Speakers</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-500" />
                <span>Knowledge Sharing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Description */}
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-teal-500 p-8 text-white shadow-xl shadow-teal-500/20">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

          <div className="relative">
            <p className="text-sm font-medium uppercase tracking-wider text-teal-100 mb-2">
              About This Event
            </p>
            <h2 className="text-2xl font-bold mb-3">Uniting Against Cancer</h2>
            <p className="text-teal-50/90 leading-relaxed max-w-2xl">
              The International Cancer Week is a global initiative bringing together healthcare professionals,
              researchers, advocates, and communities to advance cancer care, share breakthrough research,
              and foster collaboration across borders. Join us in the fight against cancer.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400" />

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 lg:p-10">
            <ProgressSteps currentStep={step} />

            {/* Step 1: Category */}
            {step === 1 && (
              <div className="space-y-8 animate-fadeIn">
                <div>
                  <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md shadow-teal-500/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700"
                        }`}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            formData.category === displayName
                              ? "text-teal-700 dark:text-teal-300"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {displayName}
                        </span>
                        {formData.category === displayName && (
                          <CheckCircle2 className="w-5 h-5 text-teal-600 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                  <FieldError message={errors.category} />
                </div>

                <div>
                  <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Participation Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {PARTICIPATION_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => update("participationType", type as "Physical" | "Virtual")}
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                          formData.participationType === type
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 shadow-md shadow-teal-500/10"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-teal-400"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            formData.participationType === type
                              ? "border-teal-500 bg-teal-500"
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
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-[auto,1fr,1fr] gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
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
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={(e) => update("firstName", e.target.value)}
                    />
                    <FieldError message={errors.firstName} />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) => update("lastName", e.target.value)}
                    />
                    <FieldError message={errors.lastName} />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Other Names{" "}
                    <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                    placeholder="Middle name or other names"
                    value={formData.otherNames}
                    onChange={(e) => update("otherNames", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => update("gender", g)}
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                          formData.gender === g
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 shadow-md shadow-teal-500/10"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-teal-400"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            formData.gender === g
                              ? "border-teal-500 bg-teal-500"
                              : "border-gray-300 dark:border-gray-500"
                          }`}
                        >
                          {formData.gender === g && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                          )}
                        </span>
                        {g}
                      </button>
                    ))}
                  </div>
                  <FieldError message={errors.gender} />
                </div>

                <div>
                  <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Do you require accessibility support?{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {YES_NO.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => update("physicallyChallenged", option as "Yes" | "No")}
                        className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                          formData.physicallyChallenged === option
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 shadow-md shadow-teal-500/10"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-teal-400"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            formData.physicallyChallenged === option
                              ? "border-teal-500 bg-teal-500"
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
                      <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Please let us know how we can support you{" "}
                        <span className="text-gray-400 text-xs font-normal">(optional)</span>
                      </label>
                      <textarea
                        className="w-full h-24 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm font-medium focus:border-teal-500 focus:ring-teal-500 transition-colors resize-none"
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
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                    placeholder="you@organisation.org"
                    value={formData.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                  <FieldError message={errors.email} />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
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
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      State of Residence <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
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
                    <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      State/Region of Residence <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                      placeholder="e.g. Ontario, Bavaria..."
                      value={formData.stateOfResidence}
                      onChange={(e) => update("stateOfResidence", e.target.value)}
                    />
                    <FieldError message={errors.stateOfResidence} />
                  </div>
                )}

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="h-12 w-32 shrink-0 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm font-semibold focus:border-teal-500 focus:ring-teal-500 transition-colors"
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
                      className="h-12 flex-1 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                      placeholder="e.g. 8031234567 (no leading 0)"
                      value={formData.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                    />
                  </div>
                  <FieldError message={errors.phoneNumber} />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Organisation Name{" "}
                    <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <Input
                    className="h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-teal-500"
                    placeholder="Your institution, company, or body"
                    value={formData.organizationName}
                    onChange={(e) => update("organizationName", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Photo Upload */}
            {step === 4 && (
              <div className="space-y-6 animate-fadeIn">
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

                {/* Review Information */}
                <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-700/50 dark:to-gray-700/30 border border-teal-100 dark:border-gray-600">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-teal-700 dark:text-teal-400 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Review Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-gray-500 dark:text-gray-400">Category:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formData.category}</div>
                    <div className="text-gray-500 dark:text-gray-400">Participation:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formData.participationType}</div>
                    <div className="text-gray-500 dark:text-gray-400">Name:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formData.title} {formData.firstName} {formData.lastName}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Email:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formData.email}</div>
                    <div className="text-gray-500 dark:text-gray-400">Country:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formData.country}</div>
                    <div className="text-gray-500 dark:text-gray-400">State of Residence:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formData.stateOfResidence}</div>
                    <div className="text-gray-500 dark:text-gray-400">Phone:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formData.phoneCountryCode} {formData.phoneNumber}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Accessibility support:</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{formData.physicallyChallenged}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100 dark:border-gray-700">
              {step > 1 ? (
                <Button
                  layout="outline"
                  className="rounded-2xl h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors px-8"
                  onClick={goBack}
                  type="button"
                  disabled={submitting}
                >
                  <span className="font-semibold">Back</span>
                </Button>
              ) : (
                <span />
              )}

              {step < 4 ? (
                <Button
                  className="rounded-2xl h-12 bg-gradient-to-r from-teal-600 to-emerald-600 border-0 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all px-8"
                  onClick={goNext}
                  type="button"
                >
                  <span className="font-bold uppercase flex items-center gap-2">
                    Next <ChevronRight className="w-4 h-4" />
                  </span>
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="rounded-2xl h-12 bg-gradient-to-r from-teal-600 to-emerald-600 border-0 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all disabled:opacity-60 min-w-[160px]"
                  disabled={submitting}
                >
                  <span className="inline-flex items-center gap-2 font-bold uppercase">
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    {submitting ? "Submitting..." : "Register"}
                  </span>
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
          <p>
            © 2026 National Institute for Cancer Research & Treatment (NICRAT). All rights reserved.{" "}
            <b>Powered by Resilience Nigeria - The Official Technology Partner of The 2026 International Cancer Week</b>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}