"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { Label, Input, Button } from "@roketid/windmill-react-ui";
import {
  Activity,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";

import api from "../../lib/api";
import { setToken } from "../../lib/auth";
import { LoginResponse } from "../../types/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      setToken(data.access_token);
      router.push("/icw/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-6 sm:px-6">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[680px]">
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white p-10 lg:p-12 flex-col justify-between relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_30%)]" />

            <div className="relative flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Cancer Screening Register</h2>
              </div>
            </div>

            <div className="relative max-w-md">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-5 text-sm rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <Activity className="w-4 h-4" />
                Public health screening platform
              </div>

              <p className="text-sm leading-7 text-green-100">
                Register clients, document risk profile, record screenings,
                manage referrals, and monitor outcomes in one secure system.
              </p>
            </div>

            <div className="relative rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-green-100 leading-6">
                Built for organized, facility-level cancer screening data
                capture with a clean and reliable workflow.
              </p>
            </div>
          </div>

          <main className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-12">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center md:text-left">
                <div className="flex justify-center md:justify-start mb-4">
                  <Image
                    src="/assets/img/ISSAM.svg"
                    alt="NSCR Logo"
                    width={350}
                    height={150}
                    className="object-contain"
                    priority
                  />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                  Sign in
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Access your screening dashboard securely.
                </p>
              </div>

              <div className="rounded-2xl border border-green-100 dark:border-gray-700 bg-white/80 dark:bg-gray-900/30 backdrop-blur-sm p-5 sm:p-6 shadow-sm">
                <form onSubmit={handleLogin} className="space-y-5">
                  <Label>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Email
                    </span>
                    <div className="relative mt-2">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        className="pl-11 pr-4 py-3 rounded-xl border-gray-200 dark:border-gray-600 focus:border-green-600 focus:ring-green-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                        type="email"
                        placeholder="john@doe.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </Label>

                  <Label>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Password
                    </span>
                    <div className="relative mt-2">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        className="pl-11 pr-12 py-3 rounded-xl border-gray-200 dark:border-gray-600 focus:border-green-600 focus:ring-green-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-gray-700 transition"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </Label>

                  {error ? (
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800 h-12 font-semibold shadow-md transition-all"
                    block
                    disabled={submitting}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {submitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {submitting ? "Signing in..." : "Log in"}
                    </span>
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center md:text-left">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-green-700 dark:text-green-400 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
