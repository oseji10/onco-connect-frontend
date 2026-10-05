// Save as pages/q.tsx  (a plain static page, so it works with `next export` / output: "export")
// DELETE the old pages/q/[token].tsx, since a dynamic route can't be built in a static export.
//
// The personal token arrives in the URL fragment:  https://yourapp/q#<token>
// (the fragment is never sent to the server, so it stays out of host/CDN logs).
// A ?t=<token> query string is also accepted as a fallback.
//
// Make sure your _app / auth wrapper does NOT redirect unauthenticated users away from /q.

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { Loader2, LinkIcon } from "lucide-react";

import api from "../lib/api";
import QuestionnaireView, { QuestionnaireData, downloadCertificatePdf } from "./containers/QuestionnaireView";

type State = "loading" | "ready" | "invalid";

function readToken(): string {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
  if (hash) return hash;

  return (new URLSearchParams(window.location.search).get("t") || "").trim();
}

export default function PublicQuestionnairePage() {
  const [state, setState] = useState<State>("loading");
  const [token, setToken] = useState("");
  const [data, setData] = useState<QuestionnaireData | null>(null);

  useEffect(() => {
    // window is only available in the browser, which is exactly what a static export needs
    const t = readToken();

    if (t.length < 32) {
      setState("invalid");
      return;
    }

    setToken(t);

    (async () => {
      try {
        const res = await api.get(`/public/questionnaire/${t}`);
        setData(res.data.data);
        setState("ready");
      } catch {
        setState("invalid");
      }
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Questionnaire</title>
        <meta name="robots" content="noindex, nofollow" />
        {/* Don't leak the personal link to other sites */}
        <meta name="referrer" content="no-referrer" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
          {state === "loading" && (
            <div className="py-24 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" />
            </div>
          )}

          {state === "invalid" && (
            <div className="rounded-3xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center shadow-lg">
              <LinkIcon className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-4 font-bold text-gray-900 dark:text-white uppercase">This link is not valid</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Please open the link from your email exactly as sent, including everything after the # sign. If you still have
                trouble, contact the organisers.
              </p>
            </div>
          )}

          {state === "ready" && data && (
            <QuestionnaireView
              data={data}
              submit={async (answers) => (await api.post(`/public/questionnaire/${token}`, { answers })).data}
              onDownload={() => downloadCertificatePdf(`/public/certificate/${token}`)}
            />
          )}
        </div>
      </div>
    </>
  );
}