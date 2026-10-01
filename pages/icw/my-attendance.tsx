import React, { FormEvent, useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { CheckCircle2, Clock, Loader2, Lock, BadgeCheck, Star } from "lucide-react";
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
  feedbackSubmitted: boolean;
  certificateEligible: boolean;
  requiredSessions: number;
  sessions: SessionItem[];
};

type ApiSuccess<T> = { success: true; message: string; data: T };

const fmt = (v: string) => new Date(v).toLocaleString();

export default function MyAttendancePage() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(0);
  const [takeaway, setTakeaway] = useState("");
  const [comments, setComments] = useState("");

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

  async function handleFeedback(e: FormEvent) {
    e.preventDefault();
    if (!rating) return toast.error("Please give a rating.");
    if (takeaway.trim().length < 30) return toast.error("Please write at least 30 characters for your key takeaway.");

    try {
      setSubmitting(true);
      const { data: res } = await api.post<ApiSuccess<{ certificateEligible: boolean }>>("/participant/feedback", {
        rating,
        takeaway: takeaway.trim(),
        comments: comments.trim() || null,
      });
      toast.success(res.message);
      await load();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const first = errors && Object.values(errors)[0];
      toast.error((Array.isArray(first) && first[0]) || err?.response?.data?.message || "Could not submit feedback.");
    } finally {
      setSubmitting(false);
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
  const hasPresence = data.isAccredited || attendedCount > 0;

  return (
    <Layout>
      <PageTitle>My Attendance</PageTitle>

      {/* Eligibility banner */}
      <div
        className={`mb-8 rounded-3xl border-2 p-6 flex items-start gap-4 ${
          data.certificateEligible
            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
        }`}
      >
        {data.certificateEligible ? (
          <BadgeCheck className="w-8 h-8 text-emerald-600 shrink-0" />
        ) : (
          <Clock className="w-8 h-8 text-amber-600 shrink-0" />
        )}
        <div>
          <p className="font-bold text-gray-900 dark:text-white uppercase">
            {data.certificateEligible ? "You are eligible for a certificate" : "Certificate requirements"}
          </p>
          {!data.certificateEligible && (
            <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>
                {hasPresence ? "✓" : "○"} Attend: {data.isAccredited ? "accredited at venue" : `check in to ${data.requiredSessions} session(s) (${attendedCount} so far)`}
              </li>
              <li>{data.feedbackSubmitted ? "✓" : "○"} Submit the feedback form below</li>
            </ul>
          )}
        </div>
      </div>

      {/* Sessions */}
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Sessions</h3>
      <div className="space-y-3 mb-10">
        {data.sessions.length === 0 && (
          <p className="text-sm text-gray-500">No sessions have been scheduled yet.</p>
        )}
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
                <Lock className="w-4 h-4" />
                {s.status === "upcoming" ? "Not open yet" : "Closed"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Feedback */}
      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Feedback</h3>
      <div className="rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-xl p-6 sm:p-8">
        {!hasPresence ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Check in to at least one session to unlock the feedback form.
          </p>
        ) : (
          <form onSubmit={handleFeedback} className="space-y-6">
            {data.feedbackSubmitted && (
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                ✓ Feedback already submitted. You can update it below.
              </p>
            )}

            <div>
              <label className="block mb-3 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Overall rating <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        n <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Your key takeaway <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full h-28 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-green-500 focus:ring-green-500 resize-none"
                placeholder="What is the most useful thing you learned from the conference? (min. 30 characters)"
                value={takeaway}
                onChange={(e) => setTakeaway(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">{takeaway.trim().length}/30 minimum</p>
            </div>

            <div>
              <label className="block mb-2 text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Other comments <span className="text-gray-400 text-xs normal-case font-normal">(optional)</span>
              </label>
              <textarea
                className="w-full h-24 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm focus:border-green-500 focus:ring-green-500 resize-none"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="rounded-2xl h-12 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
            >
              <span className="inline-flex items-center gap-2 font-bold uppercase">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Submitting..." : data.feedbackSubmitted ? "Update feedback" : "Submit feedback"}
              </span>
            </Button>
          </form>
        )}
      </div>

      <div className="pb-20" />
    </Layout>
  );
}