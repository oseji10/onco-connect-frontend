import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";

type InvitePreview = {
  name: string;
  email: string;
  affiliation: string | null;
  alreadyHasAccount: boolean;
};

export default function AcceptReviewerInvitePage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setLoadError("This invitation link is missing its token.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get(`/abstracts/reviewers/invite/${token}`);
        setInvite(data?.data ?? null);
      } catch (err: any) {
        setLoadError(
          err?.response?.data?.message ||
            "This invitation link is invalid or has expired."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, token]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;

    if (!invite.alreadyHasAccount) {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (password !== passwordConfirmation) {
        toast.error("Passwords don't match.");
        return;
      }
    }

    try {
      setSubmitting(true);
      const { data } = await api.post(
        `/abstracts/reviewers/invite/${token}/accept`,
        invite.alreadyHasAccount
          ? {}
          : { password, password_confirmation: passwordConfirmation }
      );

      // If the API returned a Sanctum token, store it however this app
      // already persists auth (adjust to match your existing auth utility).
      if (data?.data?.token) {
        localStorage.setItem("authToken", data.data.token);
      }

      setAccepted(true);
      toast.success("Invitation accepted!");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to accept invitation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
        {loading ? (
          <div className="flex flex-col items-center py-10 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-700" />
            <p className="text-sm">Checking your invitation...</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Invitation not available
            </h1>
            <p className="text-sm text-gray-600">{loadError}</p>
          </div>
        ) : accepted ? (
          <div className="text-center py-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              You're all set
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Your reviewer account is active. Abstracts assigned to you will
              appear on your reviewer dashboard.
            </p>
            <a
              href="/"
              className="inline-flex h-12 items-center justify-center px-6 rounded-2xl bg-indigo-800 text-white font-bold"
            >
              Go to reviewer dashboard
            </a>
          </div>
        ) : (
          invite && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-indigo-700" />
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                  ICW 2026 Abstract Committee
                </p>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                Join as a reviewer
              </h1>
              <p className="text-sm text-gray-600 mb-6">
                Hi {invite.name}, confirm your details below to start
                reviewing abstracts assigned to <strong>{invite.email}</strong>.
              </p>

              <form onSubmit={handleAccept} className="space-y-4">
                {invite.alreadyHasAccount ? (
                  <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">
                    This email is already linked to an existing account. Just
                    confirm below — no new password needed.
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Create a password
                      </label>
                      <input
                        type="password"
                        className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Confirm password
                      </label>
                      <input
                        type="password"
                        className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
                        placeholder="Repeat your password"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-2xl bg-indigo-800 text-white font-bold uppercase tracking-wide shadow-lg disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Accepting..." : "Accept invitation"}
                </button>
              </form>
            </>
          )
        )}
      </div>
    </div>
  );
}