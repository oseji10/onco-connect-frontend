import React, { FormEvent, useRef, useState } from "react";
import {
  Mic,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Camera,
  Upload,
  FileText,
  ArrowLeft,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";
import {
  SESSION_TYPES,
  SUB_THEMES,
  PARTICIPATION_TYPES,
  YES_NO,
  TITLES,
  NIGERIAN_STATES,
  COUNTRIES,
  PHONE_COUNTRY_CODES,
  DEFAULT_PHONE_COUNTRY_CODE,
  BIO_WORD_LIMIT,
  SESSION_DESCRIPTION_WORD_LIMIT,
  countWords,
  SessionType,
  SubThemeValue,
  ParticipationType,
} from "../../types/speaker-constants";

// ─── Types ────────────────────────────────────────────────────────────────

type FormState = {
  // Session
  sessionType: SessionType | "";
  subTheme: SubThemeValue | "";
  sessionTitle: string;
  sessionDescription: string;
  participationType: ParticipationType | "";

  // Personal
  title: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  organization: string;
  jobTitle: string;
  bio: string;
  physicallyChallenged: "Yes" | "No" | "";
  accessibilityNeeds: string;

  // Contact
  email: string;
  country: string;
  state: string;
  phoneCountryCode: string;
  phoneNumber: string;
  linkedinUrl: string;
  twitterHandle: string;

  // Files
  photo: File | null;
  photoPreview: string | null;
  cv: File | null;

  declarationChecked: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  sessionType: "",
  subTheme: "",
  sessionTitle: "",
  sessionDescription: "",
  participationType: "",
  title: "",
  firstName: "",
  lastName: "",
  otherNames: "",
  organization: "",
  jobTitle: "",
  bio: "",
  physicallyChallenged: "",
  accessibilityNeeds: "",
  email: "",
  country: "Nigeria",
  state: "",
  phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
  phoneNumber: "",
  linkedinUrl: "",
  twitterHandle: "",
  photo: null,
  photoPreview: null,
  cv: null,
  declarationChecked: false,
};

const STEPS = [
  { number: 1, label: "Session" },
  { number: 2, label: "Personal" },
  { number: 3, label: "Contact" },
  { number: 4, label: "Documents" },
];

// ─── Helper Components ─────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {STEPS.map((step) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-full text-sm font-bold transition-all duration-300 ${
                step.number <= currentStep
                  ? "bg-indigo-700 text-white shadow-lg shadow-indigo-700/25"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.number < currentStep ? <CheckCircle2 className="w-5 h-5" /> : step.number}
            </div>
            {step.number < STEPS.length && (
              <div
                className={`w-14 sm:w-20 h-1 mx-2 transition-all duration-300 ${
                  step.number < currentStep ? "bg-indigo-700" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        {STEPS.map((step) => (
          <span key={step.number} className={step.number <= currentStep ? "text-indigo-700" : ""}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsCameraMode(true);
    } catch {
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
            const file = new File([blob], `headshot-${Date.now()}.jpg`, { type: "image/jpeg" });
            onPhotoChange(file);
            stopCamera();
          }
        },
        "image/jpeg",
        0.85
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
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
      <label className="block text-sm font-semibold text-gray-700">
        Headshot Photo <span className="text-red-500">*</span>
      </label>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {isCameraMode ? (
        <div className="relative rounded-2xl overflow-hidden bg-black">
          <video ref={videoRef} className="w-full max-h-[360px] object-cover" autoPlay playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-3 rounded-full bg-white/90 hover:bg-white text-gray-800 font-bold shadow-lg"
            >
              <Camera className="w-5 h-5 inline-block mr-2" />
              Capture
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-6 py-3 rounded-full bg-red-500/90 hover:bg-red-600 text-white font-bold shadow-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : photoPreview ? (
        <div className="relative inline-block">
          <img
            src={photoPreview}
            alt="Headshot preview"
            className="w-32 h-32 rounded-2xl object-cover border-2 border-gray-200"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors text-gray-600 hover:text-indigo-700"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-semibold">Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors text-gray-600 hover:text-indigo-700"
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

function CvUpload({
  cv,
  onCvChange,
  error,
}: {
  cv: File | null;
  onCvChange: (file: File | null) => void;
  error?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">
        CV / Speaker Profile <span className="text-red-500">*</span>
        <span className="text-gray-400 text-xs font-normal"> (PDF or Word, max 10MB)</span>
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e) => onCvChange(e.target.files?.[0] || null)}
        className="hidden"
      />

      {cv ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 bg-gray-50 max-w-md">
          <FileText className="w-5 h-5 text-indigo-700 shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate flex-1">{cv.name}</span>
          <button
            type="button"
            onClick={() => onCvChange(null)}
            className="text-gray-400 hover:text-red-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors text-gray-600 hover:text-indigo-700"
        >
          <Upload className="w-4 h-4" />
          <span className="text-sm font-semibold">Upload CV</span>
        </button>
      )}
      <FieldError message={error} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SpeakerRegistrationPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  const bioWordCount = countWords(form.bio);
  const sessionDescWordCount = countWords(form.sessionDescription);

  function validateStep(n: number): boolean {
    const newErrors: FormErrors = {};

    if (n === 1) {
      if (!form.sessionType) newErrors.sessionType = "Please select a session type.";
      if (!form.subTheme) newErrors.subTheme = "Please select a sub-theme.";
      if (!form.sessionTitle.trim()) newErrors.sessionTitle = "Proposed session title is required.";
      if (!form.sessionDescription.trim()) newErrors.sessionDescription = "Session description is required.";
      else if (sessionDescWordCount > SESSION_DESCRIPTION_WORD_LIMIT)
        newErrors.sessionDescription = `Description exceeds the ${SESSION_DESCRIPTION_WORD_LIMIT}-word limit (currently ${sessionDescWordCount}).`;
      if (!form.participationType) newErrors.participationType = "Please select a participation type.";
    }

    if (n === 2) {
      if (!form.title) newErrors.title = "Title is required.";
      if (!form.firstName.trim()) newErrors.firstName = "First name is required.";
      if (!form.lastName.trim()) newErrors.lastName = "Last name is required.";
      if (!form.organization.trim()) newErrors.organization = "Organization is required.";
      if (!form.jobTitle.trim()) newErrors.jobTitle = "Job title is required.";
      if (!form.bio.trim()) newErrors.bio = "A short bio is required.";
      else if (bioWordCount > BIO_WORD_LIMIT)
        newErrors.bio = `Bio exceeds the ${BIO_WORD_LIMIT}-word limit (currently ${bioWordCount}).`;
      if (!form.physicallyChallenged)
        newErrors.physicallyChallenged = "Please let us know if you require accessibility support.";
    }

    if (n === 3) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Please enter a valid email address.";
      if (!form.country) newErrors.country = "Please select a country.";
      if (!form.state.trim())
        newErrors.state = form.country === "Nigeria" ? "Please select a state." : "Please enter a state/region.";
      if (form.phoneNumber.trim().length < 7) newErrors.phoneNumber = "Please enter a valid phone number.";
    }

    if (n === 4) {
      if (!form.photo) newErrors.photo = "Please upload a headshot photo.";
      if (!form.cv) newErrors.cv = "Please upload your CV.";
      if (!form.declarationChecked) newErrors.declarationChecked = "Please confirm the declaration.";
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
    if (!validateStep(4)) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append("sessionType", form.sessionType);
      payload.append("subTheme", form.subTheme);
      payload.append("sessionTitle", form.sessionTitle.trim());
      payload.append("sessionDescription", form.sessionDescription.trim());
      payload.append("participationType", form.participationType);
      payload.append("title", form.title);
      payload.append("firstName", form.firstName.trim());
      payload.append("lastName", form.lastName.trim());
      payload.append("otherNames", form.otherNames.trim() || "");
      payload.append("organization", form.organization.trim());
      payload.append("jobTitle", form.jobTitle.trim());
      payload.append("bio", form.bio.trim());
      payload.append("physicallyChallenged", form.physicallyChallenged === "Yes" ? "1" : "0");
      payload.append("accessibilityNeeds", form.accessibilityNeeds.trim() || "");
      payload.append("email", form.email.trim());
      payload.append("country", form.country);
      payload.append("state", form.state.trim());
      payload.append("phoneCountryCode", form.phoneCountryCode);
      payload.append("phoneNumber", form.phoneNumber.trim());
      payload.append("linkedinUrl", form.linkedinUrl.trim() || "");
      payload.append("twitterHandle", form.twitterHandle.trim() || "");
      if (form.photo) payload.append("photo", form.photo);
      if (form.cv) payload.append("cv", form.cv);

      const { data } = await api.post("/speakers/register", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmittedRef(data?.data?.reference || data?.reference || "your submission");
      toast.success("Speaker registration submitted!");
    } catch (err: any) {
      const validationErrors = err?.response?.data?.errors;
      let message = err?.response?.data?.message || "Submission failed. Please try again.";
      if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        if (firstKey && validationErrors[firstKey]?.[0]) message = validationErrors[firstKey][0];
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────

  if (submittedRef) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration received</h1>
          <p className="text-gray-600 mb-6">
            Thank you for offering to speak at the 2026 International Cancer Week Conference. Your tracking
            reference is:
          </p>
          <div className="inline-block px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-900 font-mono font-bold text-lg mb-6">
            {submittedRef}
          </div>
          <p className="text-sm text-gray-500">
            The organizing committee will review your submission and email you once a decision has been made.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-800 text-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-2 inline-flex items-center gap-2">
            <Mic className="w-3.5 h-3.5" /> 2026 International Cancer Week &middot; 5&ndash;9 October 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">Speaker Registration</h1>
          <p className="mt-3 text-indigo-100 max-w-2xl">
            Share your expertise with the global cancer community. Tell us about the session you'd like to
            deliver at ICW 2026.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-6 py-10">
        <ProgressSteps currentStep={step} />

        {/* Step 1: Session */}
        {step === 1 && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-indigo-700" />
              <h2 className="text-lg font-bold text-gray-900">Proposed Session</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Session Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  value={form.sessionType}
                  onChange={(e) => update("sessionType", e.target.value as SessionType)}
                >
                  <option value="">Select session type</option>
                  {SESSION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.sessionType} />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Participation Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  value={form.participationType}
                  onChange={(e) => update("participationType", e.target.value as ParticipationType)}
                >
                  <option value="">Select preference</option>
                  {PARTICIPATION_TYPES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.participationType} />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Sub-theme <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                value={form.subTheme}
                onChange={(e) => update("subTheme", e.target.value as SubThemeValue)}
              >
                <option value="">Select a sub-theme</option>
                {SUB_THEMES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <FieldError message={errors.subTheme} />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Proposed Session Title <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                placeholder="Enter the title of your proposed session"
                value={form.sessionTitle}
                onChange={(e) => update("sessionTitle", e.target.value)}
              />
              <FieldError message={errors.sessionTitle} />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Session Description <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`w-full h-40 rounded-2xl border-2 px-4 py-3 text-sm font-medium outline-none resize-none ${
                  sessionDescWordCount > SESSION_DESCRIPTION_WORD_LIMIT
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-indigo-600 focus:ring-indigo-600"
                }`}
                placeholder="What will attendees learn from this session?"
                value={form.sessionDescription}
                onChange={(e) => update("sessionDescription", e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <FieldError message={errors.sessionDescription} />
                <span
                  className={`text-xs font-semibold ${
                    sessionDescWordCount > SESSION_DESCRIPTION_WORD_LIMIT ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {sessionDescWordCount} / {SESSION_DESCRIPTION_WORD_LIMIT} words
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Personal */}
        {step === 2 && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Speaker Profile</h2>

            <div className="grid grid-cols-[auto,1fr,1fr] gap-4">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <select
                  className="h-12 rounded-2xl border-2 border-gray-200 px-3 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  value={form.title}
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
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
                <FieldError message={errors.firstName} />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                />
                <FieldError message={errors.lastName} />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Other Names <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                value={form.otherNames}
                onChange={(e) => update("otherNames", e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Organization <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="Institution, company, or body"
                  value={form.organization}
                  onChange={(e) => update("organization", e.target.value)}
                />
                <FieldError message={errors.organization} />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="e.g. Consultant Oncologist"
                  value={form.jobTitle}
                  onChange={(e) => update("jobTitle", e.target.value)}
                />
                <FieldError message={errors.jobTitle} />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Short Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`w-full h-32 rounded-2xl border-2 px-4 py-3 text-sm font-medium outline-none resize-none ${
                  bioWordCount > BIO_WORD_LIMIT
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-200 focus:border-indigo-600 focus:ring-indigo-600"
                }`}
                placeholder="A short professional bio for the conference programme"
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <FieldError message={errors.bio} />
                <span
                  className={`text-xs font-semibold ${
                    bioWordCount > BIO_WORD_LIMIT ? "text-red-600" : "text-gray-400"
                  }`}
                >
                  {bioWordCount} / {BIO_WORD_LIMIT} words
                </span>
              </div>
            </div>

            <div>
              <label className="block mb-3 text-sm font-semibold text-gray-700">
                Do you require accessibility support? <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {YES_NO.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => update("physicallyChallenged", option as "Yes" | "No")}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 text-sm font-semibold transition-all ${
                      form.physicallyChallenged === option
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-indigo-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <FieldError message={errors.physicallyChallenged} />

              {form.physicallyChallenged === "Yes" && (
                <div className="mt-4">
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Please let us know how we can support you{" "}
                    <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="w-full h-24 rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none resize-none"
                    placeholder="e.g. wheelchair access, sign language interpretation..."
                    value={form.accessibilityNeeds}
                    onChange={(e) => update("accessibilityNeeds", e.target.value)}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 3: Contact */}
        {step === 3 && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Contact Details</h2>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                placeholder="you@organisation.org"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              <FieldError message={errors.email} />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                value={form.country}
                onChange={(e) => {
                  update("country", e.target.value);
                  update("state", "");
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

            {form.country === "Nigeria" ? (
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                >
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.state} />
              </div>
            ) : (
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  State/Region <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="e.g. Ontario, Bavaria..."
                  value={form.state}
                  onChange={(e) => update("state", e.target.value)}
                />
                <FieldError message={errors.state} />
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  className="h-12 w-32 shrink-0 rounded-2xl border-2 border-gray-200 px-3 text-sm font-semibold focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  value={form.phoneCountryCode}
                  onChange={(e) => update("phoneCountryCode", e.target.value)}
                >
                  {PHONE_COUNTRY_CODES.map(({ country, dial }) => (
                    <option key={country} value={dial}>
                      {dial ? `${dial} ${country}` : country}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  className="h-12 flex-1 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="e.g. 8031234567 (no leading 0)"
                  value={form.phoneNumber}
                  onChange={(e) => update("phoneNumber", e.target.value)}
                />
              </div>
              <FieldError message={errors.phoneNumber} />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  LinkedIn <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="linkedin.com/in/..."
                  value={form.linkedinUrl}
                  onChange={(e) => update("linkedinUrl", e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold text-gray-700">
                  X / Twitter <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                  placeholder="@handle"
                  value={form.twitterHandle}
                  onChange={(e) => update("twitterHandle", e.target.value)}
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Documents &amp; Declaration</h2>

            <PhotoUpload
              photoPreview={form.photoPreview}
              onPhotoChange={(file) => {
                update("photo", file);
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => update("photoPreview", reader.result as string);
                  reader.readAsDataURL(file);
                } else {
                  update("photoPreview", null);
                }
              }}
              error={errors.photo}
            />

            <CvUpload cv={form.cv} onCvChange={(file) => update("cv", file)} error={errors.cv} />

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-indigo-700"
                checked={form.declarationChecked}
                onChange={(e) => update("declarationChecked", e.target.checked)}
              />
              <span className="text-sm text-gray-600">
                I confirm the information provided is accurate and I am available to speak at ICW 2026 if my
                session is accepted.
              </span>
            </label>
            <FieldError message={errors.declarationChecked} />
          </section>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="h-12 px-8 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-indigo-400 transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className="h-12 px-8 rounded-2xl bg-indigo-800 to-indigo-950 text-white font-bold uppercase inline-flex items-center gap-2 shadow-lg"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="h-12 px-8 rounded-2xl bg-indigo-800 to-indigo-950 text-white font-bold uppercase inline-flex items-center gap-2 shadow-lg disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Submit Registration"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}