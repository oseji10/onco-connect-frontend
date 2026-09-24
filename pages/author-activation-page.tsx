import React, { FormEvent, useEffect, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";

interface ActivationData {
  name: string;
  email: string;
  already_active: boolean;
}

export default function AuthorActivatePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Controls the successful activation screen.
  const [activated, setActivated] = useState(false);

  /*
   * Read the activation URL directly from the browser.
   *
   * Expected URL:
   *
   * /author-activation-page/?user=772&expires=...&signature=...
   *
   * We deliberately use window.location instead of React Router or
   * Next.js router hooks because this application is statically exported.
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    const user = params.get("user");

    if (!user) {
      setLinkError(
        "This activation link is invalid because the user ID is missing."
      );
      setLoading(false);
      return;
    }

    setUserId(user);

    /*
     * Preserve the complete signed query string:
     *
     * expires=...
     * signature=...
     *
     * We remove "user" because user is already part of the API path.
     */
    params.delete("user");

    const signedQuery = params.toString();

    setQuery(signedQuery);
  }, []);

  /*
   * Once the user ID and signed query are available, validate the
   * activation link against Laravel.
   */
  useEffect(() => {
    if (!userId || !query) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    setLinkError(null);

    api
      .get(`/author/activate/${userId}?${query}`)
      .then(({ data }) => {
        if (cancelled) {
          return;
        }

        setActivation(data.data);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setLinkError(
          err?.response?.data?.message ||
            "This activation link is invalid or has expired."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, query]);

  /*
   * After successful activation:
   *
   * 1. Show success message.
   * 2. Keep the success screen visible for 3 seconds.
   * 3. Redirect to the login page.
   */
  useEffect(() => {
    if (!activated) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = "/";
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activated]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || !query) {
      toast.error("The activation link is invalid.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post(
        `/author/activate/${userId}?${query}`,
        {
          password,
          password_confirmation: confirm,
        }
      );

      /*
       * Do not automatically log the user in.
       * The account has been activated successfully, so show the
       * success screen and allow the user to proceed to login.
       */
      setActivated(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Activation failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * Successful activation screen.
   *
   * This remains visible for 3 seconds before redirecting to "/".
   */
  if (activated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-11 h-11 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Account activated successfully!
          </h1>

          <p className="text-sm text-gray-600 leading-6">
            Your author account has been activated and your password
            has been set successfully.
          </p>

          {activation?.email && (
            <p className="text-sm font-semibold text-gray-800 mt-3">
              {activation.email}
            </p>
          )}

          <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-4">
            <p className="text-sm text-indigo-800">
              Redirecting you to the login page...
            </p>

            <div className="flex justify-center mt-3">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Activation link problem
          </h1>

          <p className="text-sm text-gray-600">
            {linkError}
          </p>

          <p className="text-xs text-gray-400 mt-4">
            Please contact the Abstract Committee for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-indigo-700" />
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            Welcome, {activation?.name}
          </h1>

          <p className="text-sm text-gray-500 mt-1 text-center">
            Set a password for{" "}
            <b>{activation?.email}</b> to access your
            abstract dashboard.
          </p>
        </div>

        {activation?.already_active && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />

            <span>
              This account is already active. Setting a new password
              will replace the existing one.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              New password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Confirm password
            </label>

            <input
              type="password"
              autoComplete="new-password"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}

            {submitting
              ? "Activating..."
              : "Activate my account"}
          </button>
        </form>
      </div>
    </div>
  );
}
