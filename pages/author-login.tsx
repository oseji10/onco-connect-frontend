import React, { FormEvent, useState } from "react";
import { Loader2, LogIn, AlertCircle, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";

export default function AuthorLoginPage({
  onSuccess,
}: {
  /** Called after a successful login. Parent decides what to render next. */
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const { data } = await api.post("/auth/login", { email, password });

      if (data?.user?.role !== "author") {
        setError("This portal is for abstract authors only.");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Invalid credentials. Please check your email and password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-indigo-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Author Portal</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            International Cancer Week 2026 · Abstract Committee
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 px-4 text-sm font-medium focus:border-indigo-600 focus:ring-indigo-600 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-indigo-700 text-white font-bold hover:bg-indigo-800 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          Don't have credentials yet? Check your inbox for an invitation from
          the Scientific & Abstract Committee.
        </p>
      </div>
    </div>
  );
}