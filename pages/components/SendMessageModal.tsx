import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Megaphone, Paperclip, FileText, Send, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../lib/api";
import { CATEGORY_DISPLAY_NAMES, getCategoryBackendValue } from "../../types/registration-constants";

// Keep in sync with AttendeeMessageController::sendCustom validation.
const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip";

type MessageParticipant = {
  email?: string;
  category: string; // backend value, e.g. "healthcare_professional"
  participationType: "Physical" | "Virtual" | null;
};

type TypeChoice = "all" | "Physical" | "Virtual";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SendMessageModal({
  isOpen,
  onClose,
  onSent,
  participants,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  participants: MessageParticipant[];
}) {
  const [category, setCategory] = useState<string>("all"); // "all" or backend value
  const [typeChoice, setTypeChoice] = useState<TypeChoice>("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory("all");
      setTypeChoice("all");
      setSubject("");
      setMessage("");
      setFiles([]);
    }
  }, [isOpen]);

  // Unique-by-email recipient counts, mirroring what the backend will do.
  const { countFor, categoryCounts } = useMemo(() => {
    const matches = (p: MessageParticipant, cat: string) =>
      (cat === "all" || p.category === cat) && (typeChoice === "all" || p.participationType === typeChoice);

    const countFor = (cat: string) => {
      const emails = new Set<string>();
      for (const p of participants) {
        const email = p.email?.trim().toLowerCase();
        if (email && matches(p, cat)) emails.add(email);
      }
      return emails.size;
    };

    const categoryCounts: Record<string, number> = { all: countFor("all") };
    for (const display of CATEGORY_DISPLAY_NAMES) {
      const value = getCategoryBackendValue(display);
      categoryCounts[value] = countFor(value);
    }
    return { countFor, categoryCounts };
  }, [participants, typeChoice]);

  if (!isOpen) return null;

  const recipientCount = countFor(category);

  function handleFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    const next = [...files];
    for (const f of picked) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`${f.name} is larger than ${MAX_FILE_MB} MB.`);
        continue;
      }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      next.push(f);
    }
    setFiles(next);
  }

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are both required.");
      return;
    }
    try {
      setSubmitting(true);

      const form = new FormData();
      form.append("subject", subject.trim());
      form.append("message", message.trim());
      form.append("category", category);
      if (typeChoice !== "all") form.append("participationType", typeChoice);
      files.forEach((f) => form.append("attachments[]", f));

      const { data } = await api.post("/conference/notifications/custom", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(data?.message || "Message sent.");
      onSent?.();
      onClose();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstKey = errors && Object.keys(errors)[0];
      toast.error(
        (firstKey && errors[firstKey]?.[0]) || err?.response?.data?.message || "Failed to send message."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 text-sm font-semibold focus:border-green-500 focus:ring-green-500 transition-colors";
  const labelClass = "text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-green-700" />
              Message Participants
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Send an email to registered participants in the category you choose.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              <option value="all">All categories ({categoryCounts.all ?? 0})</option>
              {CATEGORY_DISPLAY_NAMES.map((display) => {
                const value = getCategoryBackendValue(display);
                return (
                  <option key={value} value={value}>
                    {display} ({categoryCounts[value] ?? 0})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelClass}>Participation type</label>
            <select
              value={typeChoice}
              onChange={(e) => setTypeChoice(e.target.value as TypeChoice)}
              className={selectClass}
            >
              <option value="all">In-person and virtual</option>
              <option value="Physical">In-person only</option>
              <option value="Virtual">Virtual only</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important update for ICW 2026 participants"
              className="w-full h-12 rounded-2xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 px-4 text-sm font-medium outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div>
            <label className={labelClass}>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write your message. Separate paragraphs with a blank line."
              className="w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 px-4 py-3 text-sm font-medium outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>

          <div>
            <label className={labelClass}>
              Attachments{" "}
              <span className="normal-case font-medium text-gray-400">
                (optional · up to {MAX_FILES} files, {MAX_FILE_MB} MB each)
              </span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              onChange={handleFilesPicked}
              className="hidden"
            />
            <Button
              layout="outline"
              type="button"
              className="rounded-2xl h-10 px-4 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting || files.length >= MAX_FILES}
            >
              <span className="inline-flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attach files
              </span>
            </Button>

            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-green-700 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{f.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{formatBytes(f.size)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={submitting}
                      className="text-gray-400 hover:text-gray-700 shrink-0"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-400">
            This will send to <span className="font-bold text-gray-600 dark:text-gray-300">{recipientCount}</span>{" "}
            recipient(s). Participants without an email, and duplicate registrations sharing an email, are only
            counted once.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <Button layout="outline" className="rounded-2xl h-11 px-6" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="rounded-2xl h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 border-0"
            onClick={handleSend}
            disabled={submitting || recipientCount === 0}
          >
            <span className="inline-flex items-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting
                ? "Sending..."
                : `Send to ${recipientCount}${files.length ? ` (+${files.length} file${files.length > 1 ? "s" : ""})` : ""}`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}