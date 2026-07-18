"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import api from "../../lib/api";
import { setToken } from "../../lib/auth";

export default function LoginOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const emailFromLink = searchParams.get("email");
    if (emailFromLink) setEmail(emailFromLink);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data } = await api.post("/auth/login-otp", { email, otp });

      if (data.success && data.token) {
        setToken(data.token);
        // must_change_password is always true right after an OTP login —
        // this is a hard redirect, not a suggestion.
        router.replace("/icw/change-password");
      } else {
        setError(data.message || "Invalid or expired code.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid or expired code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
        <div className="flex justify-center mb-6">
          <Image
            src="/assets/img/onco-connect.svg"
            alt="OncoConnect Logo"
            width={220}
            height={90}
            className="object-contain"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">First-time login</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Enter your email and the one-time code sent to it. You'll set your own password right
          after.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              One-time code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent tracking-widest text-center text-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}