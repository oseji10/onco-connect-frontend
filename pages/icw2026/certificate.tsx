"use client";

// app/certificates/page.tsx   (public link:  /certificates)
// Attendees and authors enter the email + phone they registered with, answer the
// feedback questionnaire, then download their certificates. No login.
//
// IMPORT PATHS: api is shared with the login page. QuestionnaireView is the same
// component your logged-in QuestionnairePage uses — adjust that one import to
// wherever it lives in your project.

import React, { useCallback, useEffect, useState } from "react";
import { Button, Input, Label } from "@roketid/windmill-react-ui";
import { AlertCircle, Award, CheckCircle2, Download, Loader2, Lock, Mail, Mic, Phone, Presentation, ShieldAlert } from "lucide-react";

import api from "../../lib/api";
import QuestionnaireView, { QuestionnaireData } from "../../components/QuestionnaireView";

type Step = "checking" | "verify" | "ineligible" | "questionnaire" | "download";

interface CertificateItem {
  type: string;
  label: string;
  available: boolean;
}

const STORAGE_KEY = "icw-certificate-session";

function iconFor(type: string) {
  if (type === "oral_presenter") return <Mic className="w-6 h-6" />;
  if (type === "poster_presenter") return <Presentation className="w-6 h-6" />;
  return <Award className="w-6 h-6" />;
}

function descriptionFor(type: string) {
  if (type === "oral_presenter") return "For presenting your abstract orally.";
  if (type === "poster_presenter") return "For presenting your abstract as a poster.";
  return "For taking part in International Cancer Week.";
}

async function blobErrorMessage(err: any, fallback: string): Promise<string> {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || fallback;
}

export default function PublicCertificatesPage() {
  const [step, setStep] = useState<Step>("checking");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");

  // verify form
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState("");
  const [ineligibleMessage, setIneligibleMessage] = useState("");

  // questionnaire
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // downloads
  const [items, setItems] = useState<CertificateItem[]>([]);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const headers = useCallback(() => ({ "X-Certificate-Token": token }), [token]);

  function endSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    setToken("");
    setName("");
    setQuestionnaire(null);
    setSubmitted(false);
    setItems([]);
    setStep("verify");
  }

  // ── Resume a session after a refresh ──
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.token) {
        setToken(saved.token);
        setName(saved.name || "");
        resume(saved.token);
        return;
      }
    } catch {}
    setStep("verify");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resume(t: string) {
    try {
      const { data } = await api.get("/public/certificates", { headers: { "X-Certificate-Token": t } });
      setName(data.data.name || "");
      setItems(data.data.certificates || []);
      if (data.data.eligible) {
        setStep("download");
      } else {
        await openQuestionnaire(t);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      setToken("");
      setStep("verify");
    }
  }

  async function openQuestionnaire(t: string) {
    setStep("questionnaire");
    setLoadingQuestionnaire(true);
    try {
      const { data } = await api.get("/public/certificates/questionnaire", { headers: { "X-Certificate-Token": t } });
      setQuestionnaire(data.data);
    } catch (err: any) {
      if (err?.response?.data?.code === "session_expired") {
        endSession();
      }
    } finally {
      setLoadingQuestionnaire(false);
    }
  }

  async function loadDownloads(t: string = token) {
    try {
      const { data } = await api.get("/public/certificates", { headers: { "X-Certificate-Token": t } });
      setItems(data.data.certificates || []);
      setName(data.data.name || name);
      setStep("download");
    } catch (err: any) {
      if (err?.response?.data?.code === "session_expired") endSession();
    }
  }

  // ── Step 1: verify ──
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setVerifying(true);

    try {
      const { data } = await api.post("/public/certificates/verify", { email: email.trim(), phone: phone.trim() });
      const t: string = data.data.token;

      setToken(t);
      setName(data.data.name);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, name: data.data.name }));

      if (data.data.next === "download") {
        await loadDownloads(t);
      } else {
        await openQuestionnaire(t);
      }
    } catch (err: any) {
      const body = err?.response?.data;
      if (body?.code === "not_accredited") {
        setIneligibleMessage(body.message);
        setStep("ineligible");
      } else {
        const first = body?.errors ? (Object.values(body.errors)[0] as string[] | undefined)?.[0] : undefined;
        setFormError(first || body?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  }

  // ── Step 3: download ──
  async function download(item: CertificateItem) {
    try {
      setBusyType(item.type);
      setDownloadError("");
      const res = await api.get(`/public/certificates/${item.type}`, { headers: headers(), responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.type}-certificate.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setDownloadError(await blobErrorMessage(err, "Couldn't download the certificate. Please try again."));
    } finally {
      setBusyType(null);
    }
  }

  const inputClass =
    "pl-11 pr-4 py-3 rounded-xl border-gray-200 dark:border-gray-600 focus:border-[#1F6F43] focus:ring-[#1F6F43] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm";
  const buttonClass = "rounded-xl !bg-[#1F6F43] border-[#1F6F43] hover:bg-[#185c36] hover:border-[#185c36] h-12 font-semibold shadow-md";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#1F6F43]">International Cancer Week 2026</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Get your certificate</h1>
        </div>

        {/* Progress */}
        {(step === "verify" || step === "questionnaire" || step === "download") && (
          <ol className="mb-6 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide">
            {[
              { key: "verify", label: "1 · Your details" },
              { key: "questionnaire", label: "2 · Feedback" },
              { key: "download", label: "3 · Download" },
            ].map((s) => (
              <li
                key={s.key}
                className={`rounded-full px-3 py-1.5 ${
                  step === s.key ? "bg-[#1F6F43] text-white" : "bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>
        )}

        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
          {step === "checking" && (
            <div className="py-10 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1F6F43]" />
            </div>
          )}

          {/* STEP 1 */}
          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-5 max-w-md mx-auto">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Enter the <strong>email address</strong> and <strong>phone number</strong> you used to register for the
                programme. Authors and presenters use the same details.
              </p>

              <Label>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</span>
                <div className="relative mt-2">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className={inputClass}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </Label>

              <Label>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone number</span>
                <div className="relative mt-2">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className={inputClass}
                    type="tel"
                    inputMode="tel"
                    placeholder="0803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </Label>

              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}

              <Button type="submit" className={buttonClass} block disabled={verifying}>
                <span className="inline-flex items-center gap-2">
                  {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                  {verifying ? "Checking..." : "Continue"}
                </span>
              </Button>
            </form>
          )}

          {/* NOT ACCREDITED */}
          {step === "ineligible" && (
            <div className="text-center max-w-md mx-auto py-4">
              <ShieldAlert className="w-14 h-14 mx-auto text-amber-500" />
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">You're not eligible for a certificate</h2>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{ineligibleMessage}</p>
              <Button
                layout="outline"
                className="mt-6 rounded-xl h-11 px-6 border-2"
                onClick={() => {
                  setIneligibleMessage("");
                  setStep("verify");
                }}
              >
                Try different details
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === "questionnaire" && (
            <div>
              {name && <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Hello <strong>{name}</strong>. Please answer a few questions to unlock your certificate.</p>}

              {loadingQuestionnaire || !questionnaire ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1F6F43]" />
                </div>
              ) : (
                <>
                  <QuestionnaireView
                    data={questionnaire}
                    submit={async (answers: any) => {
                      const res = await api.post("/public/certificates/questionnaire", { answers }, { headers: headers() });
                      setSubmitted(true);
                      return res.data;
                    }}
                    onDownload={() => loadDownloads()}
                  />

                  {submitted && (
                    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-300">
                        <CheckCircle2 className="w-5 h-5" /> Thank you! Your certificate is ready.
                      </p>
                      <Button className={`${buttonClass} px-6`} onClick={() => loadDownloads()}>
                        Go to my certificates
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === "download" && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{name ? `Congratulations, ${name}` : "Your certificates"}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Download your certificates below.</p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div key={item.type} className="rounded-3xl border-2 border-gray-100 dark:border-gray-700 p-5 flex flex-col">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-2xl p-3 shrink-0 ${
                          item.available ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {item.available ? iconFor(item.type) : <Lock className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white leading-snug">{item.label}</p>
                        <p className="mt-1 text-xs text-gray-500">{descriptionFor(item.type)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => download(item)}
                      disabled={!item.available || busyType !== null}
                      className="mt-5 h-11 rounded-2xl bg-[#1F6F43] text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busyType === item.type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download PDF
                    </button>
                  </div>
                ))}
              </div>

              {downloadError && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p>
              )}

              <button onClick={endSession} className="mt-6 text-xs font-semibold text-gray-500 hover:underline">
                Not you? Start again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}