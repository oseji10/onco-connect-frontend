// Drop into QuestionnaireAdminPage, e.g. just above the Questions/Results tabs:
//
//   import InvitationsCard from "../components/InvitationsCard";
//   ...
//   <InvitationsCard open={open} />
//
// (`open` is the boolean the page already computes: data?.status === "open")

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Mail, Send, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";

type Stats = {
  audience: number;
  submitted: number;
  pendingInvite: number;
  pendingRemind: number;
  noEmail: number;
};

export default function InvitationsCard({ open }: { open: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sending, setSending] = useState<"invite" | "remind" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/questionnaire/invitations");
      setStats(res.data.data);
    } catch {
      /* card is optional; stay quiet */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, open]);

  async function send(mode: "invite" | "remind") {
    if (!stats) return;
    const n = mode === "invite" ? stats.pendingInvite : stats.pendingRemind;
    const verb = mode === "invite" ? "invitation" : "reminder";

    if (!window.confirm(`Send ${n} ${verb} email${n === 1 ? "" : "s"}?`)) return;

    try {
      setSending(mode);
      const res = await api.post("/questionnaire/invitations", { mode });
      toast.success(res.data.message);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send emails.");
    } finally {
      setSending(null);
    }
  }

  if (!stats) return null;

  const pct = stats.audience ? Math.round((stats.submitted / stats.audience) * 100) : 0;

  return (
    <div className="mb-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-green-600" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">Invitations</h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Each person who attended gets a personal link, so they can complete the questionnaire and download their certificate
        without logging in.
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
          <span>
            {stats.submitted} of {stats.audience} attendees have submitted
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div className="h-full bg-green-600 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <Button
          disabled={!open || stats.pendingInvite === 0 || sending !== null}
          onClick={() => send("invite")}
          className="rounded-2xl h-11 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
        >
          <span className="inline-flex items-center gap-2 font-bold uppercase">
            {sending === "invite" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send invitations ({stats.pendingInvite})
          </span>
        </Button>

        <Button
          layout="outline"
          disabled={!open || stats.pendingRemind === 0 || sending !== null}
          onClick={() => send("remind")}
          className="rounded-2xl h-11 border-2"
        >
          <span className="inline-flex items-center gap-2 font-bold uppercase">
            {sending === "remind" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send reminder ({stats.pendingRemind})
          </span>
        </Button>
      </div>

      {!open && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Open the questionnaire first. Emails can only be sent while it is open.</p>
      )}

      {stats.noEmail > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {stats.noEmail} attendee{stats.noEmail === 1 ? " has" : "s have"} no email on record. Use "Copy link" on the Certificate
          Eligibility page to share their link by WhatsApp or SMS.
        </p>
      )}
    </div>
  );
}