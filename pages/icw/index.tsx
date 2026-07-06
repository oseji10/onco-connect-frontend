"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Label, Input, Button } from "@roketid/windmill-react-ui";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";

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
      router.push("/icw/events");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[650px]">
          {/* LEFT SIDE IMAGE */}
          <div className="hidden md:block md:w-1/2 relative">
            <Image
              src="/assets/img/ticketing.jpg" // 🔥 replace with your image
              alt="Login visual"
              fill
              className="object-cover"
              priority
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Optional branding text */}
            <div className="absolute bottom-10 left-10 right-10 text-white z-10">
              <h2 className="text-2xl font-bold mb-2">
                Smart Operations & Access Management Platform
              </h2>
              <p className="text-sm text-white/80 leading-6">
                A unified QR-based system for identity verification, secure
                validation, real-time monitoring, and operational reporting.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE FORM */}
          <main className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-12">
            <div className="w-full max-w-md">
              {/* Logo */}
              <div className="mb-8 text-center md:text-left">
                <div className="flex justify-center md:justify-start mb-4">
                  <Image
                    src="/assets/img/ticketa.svg"
                    alt="Ticketa Logo"
                    width={180}
                    height={80}
                    className="object-contain"
                    priority
                  />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Sign in to your account
                </p>
              </div>

              {/* FORM CARD */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 backdrop-blur-md p-6 shadow-sm">
                <form onSubmit={handleLogin} className="space-y-5">
                  {/* EMAIL */}
                  <Label>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Email
                    </span>
                    <div className="relative mt-2">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        className="pl-11 pr-4 py-3 rounded-xl border-gray-200 dark:border-gray-600 focus:border-[#1F6F43] focus:ring-[#1F6F43] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                        type="email"
                        placeholder="john@doe.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </Label>

                  {/* PASSWORD */}
                  <Label>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Password
                    </span>
                    <div className="relative mt-2">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        className="pl-11 pr-12 py-3 rounded-xl border-gray-200 dark:border-gray-600 focus:border-[#1F6F43] focus:ring-[#1F6F43] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#1F6F43] hover:bg-green-50 dark:hover:bg-gray-700 transition"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </Label>

                  {/* ERROR */}
                  {error && (
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                      {error}
                    </div>
                  )}

                  {/* BUTTON */}
                  <Button
                    type="submit"
                    className="rounded-xl bg-[#1F6F43] border-[#1F6F43] hover:bg-[#185c36] hover:border-[#185c36] h-12 font-semibold shadow-md transition-all"
                    block
                    disabled={submitting}
                  >
                    <span className="inline-flex items-center gap-2">
                      {submitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {submitting ? "Signing in..." : "Log in"}
                    </span>
                  </Button>
                </form>

                {/* FOOTER */}
                <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 text-center md:text-left">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#1F6F43] hover:underline"
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
