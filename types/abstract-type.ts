// ─── Shared types & constants for the ICW Abstract Submission Module ─────────
// Import this file from the public submission page, the admin management
// page, and the reviewer scoring page so all three agree on shape/limits.

export const SUB_THEMES = [
  {
    value: "policy-leadership-governance",
    label: "Sub-theme 1: Policy, Leadership, and Governance for Equitable Cancer Control",
  },
  {
    value: "research-innovation-data",
    label: "Sub-theme 2: Research, Innovation, and Data for Evidence-Driven Cancer Solutions",
  },
  {
    value: "quality-care-implementation",
    label: "Sub-theme 3: Quality Cancer Care, Implementation, and Patient-Centred Practice",
  },
] as const;

export type SubThemeValue = typeof SUB_THEMES[number]["value"];

export const PRESENTATION_TYPES = ["Oral", "Poster", "Either"] as const;
export type PresentationType = typeof PRESENTATION_TYPES[number];

export const ABSTRACT_WORD_LIMIT = 500;

export const REJECTION_REASONS = [
  "Irrelevance — subject is not relevant to the cancer field",
  "Plagiarism — abstract is a copy of other work",
  "Too short — abstract does not provide enough detail",
  "Late submission — submitted after the deadline",
] as const;

// Abstract lifecycle. "under_review" once at least one reviewer has been
// assigned; "scored" once all assigned reviewers have submitted a score;
// "accepted" / "rejected" is the committee's final call (may be auto-set
// once average score + reviewer recommendations are in).
export type AbstractStatus =
  | "submitted"
  | "under_review"
  | "scored"
  | "accepted"
  | "rejected";

export type Author = {
  id: string; // client-generated key, e.g. crypto.randomUUID()
  name: string;
  affiliation: string;
  email: string;
  isCorresponding: boolean;
};

export type Abstract = {
  id: number;
  title: string;
  subTheme: SubThemeValue;
  presentationType: PresentationType;
  keywords: string;
  body: string;
  wordCount: number;
  authors: Author[];
  status: AbstractStatus;
  averageScore: number | null; // mean of all submitted reviewer average scores
  reviewers: ReviewerAssignment[];
  submittedAt: string;
  reference: string; // human-facing tracking code, e.g. ICW2026-0042
};

export type ReviewerAssignment = {
  reviewerId: number;
  reviewerName: string;
  reviewerEmail: string;
  status: "invited" | "in_progress" | "submitted";
  review?: Review;
};

export type ReviewScores = {
  significance: number; // 1-5
  relevance: number; // 1-5
  originality: number; // 1-5
};

export type Review = {
  scores: ReviewScores;
  average: number; // (significance + relevance + originality) / 3
  comment: string;
  recommendedRejectionReason?: (typeof REJECTION_REASONS)[number] | null;
  submittedAt: string;
};

export type Reviewer = {
  id: number;
  name: string;
  email: string;
  affiliation?: string;
  status: "invited" | "active";
  assignedCount: number;
  completedCount: number;
};

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function formatDate(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}