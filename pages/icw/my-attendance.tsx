import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@roketid/windmill-react-ui";
import { CheckCircle2, Clock, Loader2, Lock, BadgeCheck, ClipboardList, Download, Circle } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type SessionStatus = "upcoming" | "open" | "closed" | "checked_in";

type SessionItem = {
  sessionId: number;
  title: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  checkedInAt: string | null;
};

type AttendanceData = {
  fullName: string;
  isAccredited: boolean;
  feedbackSubmitted: boolean; // = questionnaire submitted
  questionnaireOpen: boolean;
  certificateEligible: boolean;
  requiredSessions: number;
  sessions: SessionItem[];
};

type ApiSuccess<T> = { success: true; message: string; data: T };

// Change if your questionnaire page lives at a different route
const QUESTIONNAIRE_PATH = "/questionnaire";

const fmt = (v: string) => new Date(v).toLocaleString();

async function downloadCertificate() {
  try {
    const res = await api.get("/participant/certificate", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    let message = "Could not download your certificate.";
    try {
      const text = await err?.response?.data?.text();
      message = JSON.parse(text).message || message;
    } catch {}
    toast.error(message);
  }
}

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
      <span className={done ? "line-through opacity-70" : ""}>{label}</span>
    </li>
  );
}

export default function MyAttendancePage() {
  const router = useRouter();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);

  async function load() {
    try {
      const res = await api.get<ApiSuccess<AttendanceData>>("/participant/attendance");
      setData(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load your attendance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Refresh every minute so "upcoming" sessions flip to "open" without a reload
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  async function handleCheckIn(sessionId: number) {
    try {
      setCheckingIn(sessionId);
      const { data: res } = await api.post<ApiSuccess<null>>(`/participant/sessions/${sessionId}/check-in`);
      toast.success(res.message || "Checked in!");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Check-in failed.");
    } finally {
      setCheckingIn(null);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <PageTitle>My Attendance</PageTitle>
        <p className="text-gray-600 dark:text-gray-400">No registration found for the active event.</p>
      </Layout>
    );
  }

  const attendedCount = data.sessions.filter((s) => s.status === "checked_in").length;
  const hasPresence = data.isAccredited || attendedCount >= data.requiredSessions;

  return (
    <Layout>
      <PageTitle>My Attendance</PageTitle>

      {/* Certificate card */}
      <div
        className={`mb-8 rounded-3xl border-2 p-6 ${
          data.certificateEligible
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
            : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        }`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {data.certificateEligible ? (
              <BadgeCheck className="w-9 h-9 text-emerald-600 shrink-0" />
            ) : (
              <Lock className="w-9 h-9 text-gray-400 shrink-0" />
            )}
            <div>
              <p className="font-bold text-gray-900 dark:text-white uppercase">
                {data.certificateEligible ? "Your certificate is ready" : "Certificate locked"}
              </p>
              {!data.certificateEligible && (
                <ul className="mt-3 space-y-1.5">
                  <Step
                    done={hasPresence}
                    label={
                      data.isAccredited
                        ? "Attend the conference (accredited at venue)"
                        : `Attend: check in to ${data.requiredSessions} session(s) (${attendedCount} so far)`
                    }
                  />
                  <Step done={data.feedbackSubmitted} label="Complete the after-event questionnaire" />
                </ul>
              )}
            </div>
          </div>

          {data.certificateEligible && (
            <Button
              onClick={downloadCertificate}
              className="rounded-2xl h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0 shadow-lg"
            >
              <span className="inline-flex items-center gap-2 font-bold uppercase">
                <Download className="w-5 h-5" />
                Download
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Questionnaire card */}
      {!data.certificateEligible && (
        <div className="mb-8 rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <ClipboardList className="w-7 h-7 text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">After-event questionnaire</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {data.feedbackSubmitted
                  ? "Submitted. Thank you!"
                  : data.questionnaireOpen
                    ? "A few quick questions to unlock your certificate."
                    : "Opens once the conference ends."}
              </p>
            </div>
          </div>

          {data.questionnaireOpen && (
            <Button
              onClick={() => router.push(QUESTIONNAIRE_PATH)}
              className="rounded-2xl h-11 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
            >
              <span className="font-bold uppercase">{data.feedbackSubmitted ? "Review answers" : "Start"}</span>
            </Button>
          )}
        </div>
      )}

      {/* Sessions */}
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Sessions</h3>
      <div className="space-y-3 mb-10">
        {data.sessions.length === 0 && <p className="text-sm text-gray-500">No sessions have been scheduled yet.</p>}

        {data.sessions.map((s) => (
          <div
            key={s.sessionId}
            className="rounded-2xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-md p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white">{s.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {fmt(s.startsAt)} – {fmt(s.endsAt)}
              </p>
            </div>

            {s.status === "checked_in" ? (
              <span className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> Checked in
              </span>
            ) : s.status === "open" ? (
              <Button
                className="rounded-2xl h-11 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
                disabled={checkingIn === s.sessionId}
                onClick={() => handleCheckIn(s.sessionId)}
              >
                <span className="inline-flex items-center gap-2 font-bold uppercase">
                  {checkingIn === s.sessionId && <Loader2 className="w-4 h-4 animate-spin" />}
                  Check in
                </span>
              </Button>
            ) : (
              <span className="inline-flex items-center gap-2 text-gray-500 text-sm font-semibold uppercase">
                {s.status === "upcoming" ? <Clock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {s.status === "upcoming" ? "Not open yet" : "Closed"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="pb-20" />
    </Layout>
  );
}