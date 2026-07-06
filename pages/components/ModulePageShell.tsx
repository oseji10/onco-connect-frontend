import React from "react";
import Link from "next/link";
import { Button } from "@roketid/windmill-react-ui";
import { ChevronRight, Loader2, ShieldCheck } from "lucide-react";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";

type ModulePageShellProps = {
  title: string;
  description: string;
  visitId: string | number;
  submitting: boolean;
  submitLabel: string;
  serverError?: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
};

export default function ModulePageShell({
  title,
  description,
  visitId,
  submitting,
  submitLabel,
  serverError,
  onSubmit,
  children,
}: ModulePageShellProps) {
  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>{title}</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  National Cancer Screening Register
                </div>

                <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                  {title}
                </h2>

                <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                  {description}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Visits</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>Visit #{visitId}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{title}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {serverError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {serverError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-8">
        {children}

        <div className="sticky bottom-0 z-10">
          <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl px-4 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link href={`/icw/visits?visitId=${visitId}`} passHref>
                <Button
                  tag="a"
                  layout="outline"
                  type="button"
                  className="rounded-2xl h-11"
                >
                  Back to Visit
                </Button>
              </Link>

              <Button
                type="submit"
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                disabled={submitting}
              >
                <span className="inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Saving..." : submitLabel}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}
