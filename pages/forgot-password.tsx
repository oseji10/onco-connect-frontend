"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Label, Input, Button } from "@roketid/windmill-react-ui";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import api from "../lib/api";

type Step = "email" | "reset" | "done";

const RESEND_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 8;

function getErrorMessage(err: any, fallback: string): string {
  if (err?.response?.status === 429) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  const data = err?.response?.data;
  const firstFieldError = data?.errors
    ? (Object.values(data.errors)[0] as string[] | undefined)?.[0]
    : undefined;
  return firstFieldError || data?.message || fallback;
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Go back to login shortly after a successful reset
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => router.push("/"), 2500);
    return () => clearTimeout(t);
  }, [step, router]);

  async function requestCode(isResend = false) {
    setSubmitting(true);
    setError("");
    setInfo("");

    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setStep("reset");
      setCooldown(RESEND_SECONDS);
      setInfo(
        isResend
          ? "A new code has been sent."
          : "If an account exists for that email, a 6-digit code is on its way."
      );
    } catch (err: any) {
      setError(getErrorMessage(err, "Unable to send the reset code."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    requestCode(false);
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim(),
        otp,
        password,
        password_confirmation: confirmPassword,
      });
      setStep("done");
    } catch (err: any) {
      setError(getErrorMessage(err, "Unable to reset your password."));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "pl-11 pr-4 py-3 rounded-xl border-gray-200 dark:border-gray-600 focus:border-[#1F6F43] focus:ring-[#1F6F43] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm";

  const buttonClass =
    "rounded-xl !bg-[#1F6F43] border-[#1F6F43] hover:bg-[#185c36] hover:border-[#185c36] h-12 font-semibold shadow-md transition-all";

  const heading =
    step === "email"
      ? "Forgot your password?"
      : step === "reset"
      ? "Reset your password"
      : "Password updated";

  const subheading =
    step === "email"
      ? "Enter your email and we'll send you a 6-digit code."
      : step === "reset"
      ? `We sent a code to ${email.trim()}. It expires in 15 minutes.`
      : "Redirecting you to sign in...";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[650px]">
          {/* LEFT SIDE IMAGE */}
          <div className="hidden md:block md:w-1/2 relative">
            <Image
              src="/assets/img/qr.webp"
              alt="Password reset visual"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/30" />
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

          {/* RIGHT SIDE */}
          <main className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 md:p-12">
            <div className="w-full max-w-md">
              {/* Logo + heading */}
              <div className="mb-8 text-center md:text-left">
                <div className="flex justify-center md:justify-start mb-4">
                  <Image
                    src="/assets/img/onco-connect.svg"
                    alt="Onco Connect Logo"
                    width={350}
                    height={100}
                    className="object-contain"
                    priority
                  />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {heading}
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {subheading}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 backdrop-blur-md p-6 shadow-sm">
                {/* STEP 1: EMAIL */}
                {step === "email" && (
                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <Label>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Email
                      </span>
                      <div className="relative mt-2">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className={inputClass}
                          type="email"
                          placeholder="john@doe.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </Label>

                    {error && (
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className={buttonClass}
                      block
                      disabled={submitting}
                    >
                      <span className="inline-flex items-center gap-2">
                        {submitting && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {submitting ? "Sending..." : "Send reset code"}
                      </span>
                    </Button>
                  </form>
                )}

                {/* STEP 2: CODE + NEW PASSWORD */}
                {step === "reset" && (
                  <form onSubmit={handleResetSubmit} className="space-y-5">
                    <Label>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        6-digit code
                      </span>
                      <div className="relative mt-2">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className={`${inputClass} tracking-[0.4em] font-mono text-lg`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="••••••"
                          maxLength={6}
                          value={otp}
                          onChange={(e) =>
                            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          required
                          autoFocus
                        />
                      </div>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        New password
                      </span>
                      <div className="relative mt-2">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className={`${inputClass} pr-12`}
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-[#1F6F43] hover:bg-green-50 dark:hover:bg-gray-700 transition"
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

                    <Label>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Confirm new password
                      </span>
                      <div className="relative mt-2">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className={inputClass}
                          type={showPassword ? "text" : "password"}
                          placeholder="Repeat your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </Label>

                    {info && !error && (
                      <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-sm text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
                        {info}
                      </div>
                    )}

                    {error && (
                      <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className={buttonClass}
                      block
                      disabled={submitting}
                    >
                      <span className="inline-flex items-center gap-2">
                        {submitting && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {submitting ? "Resetting..." : "Reset password"}
                      </span>
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setOtp("");
                          setPassword("");
                          setConfirmPassword("");
                          setError("");
                          setInfo("");
                        }}
                        className="font-medium text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Use a different email
                      </button>

                      <button
                        type="button"
                        onClick={() => requestCode(true)}
                        disabled={cooldown > 0 || submitting}
                        className="font-medium text-[#1F6F43] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: DONE */}
                {step === "done" && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-14 h-14 mx-auto text-[#1F6F43]" />
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Your password has been reset. You can now sign in with
                      your new password.
                    </p>
                    <Button
                      className={`${buttonClass} mt-6`}
                      block
                      onClick={() => router.push("/")}
                    >
                      Go to sign in
                    </Button>
                  </div>
                )}

                {/* FOOTER */}
                {step !== "done" && (
                  <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 text-center md:text-left">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#1F6F43] hover:underline"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to sign in
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}