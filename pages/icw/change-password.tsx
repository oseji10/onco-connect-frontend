"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import api from "../../lib/api";
import { setToken } from "../../lib/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post("/auth/change-password", {
        password,
        password_confirmation: confirmation,
      });

      if (data.success && data.token) {
        // Fresh token has mustChangePassword: false baked in — swap it in
        // immediately so the guard on the next page stops redirecting here.
        setToken(data.token);
        router.replace("/icw/dashboard");
      } else {
        setError(data.message || "Couldn't update your password.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn't update your password.");
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

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Set your password
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This is your first login — choose a password to finish setting up your account.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">At least 8 characters.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Confirm password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Set password and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}