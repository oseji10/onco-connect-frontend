// lib/oralScoring.ts — shared by the panelist page and the admin page.
// Wording follows the "ICW 2026 Criteria for Scoring Oral Presentations" sheet.

export const CRITERIA = [
  {
    key: "presentation_of_results",
    title: "Presentation of results",
    hint: "How coherent and clear are the results?",
  },
  {
    key: "visual_aids",
    title: "Use of visual aids",
    hint: "In supporting the presentation, e.g. graphs, images, illustrations and photomicrographs.",
  },
  {
    key: "clarity_organization",
    title: "Clarity and organization",
    hint: "Is the presentation clear, concise and well organized?",
  },
  {
    key: "presenter_performance",
    title: "Presenter's performance",
    hint: "Is he/she confident and composed, with engagement of the audience?",
  },
  {
    key: "impact",
    title: "Impact",
    hint: "Does it have the potential to impact clinical practice, research or patient outcomes?",
  },
  {
    key: "response_to_questions",
    title: "Response to questions",
    hint: "Response to questions from the audience.",
  },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];
export type CriteriaScores = Record<CriterionKey, number>;

export const MAX_PER_CRITERION = 5;
export const MAX_TOTAL = CRITERIA.length * MAX_PER_CRITERION; // 30

export const SCORE_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export function totalOf(scores: Partial<Record<CriterionKey, number>>): number {
  return CRITERIA.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);
}

/** TOTAL SCORE / 30 x 100% */
export function percentageOf(total: number): number {
  return Math.round((total / MAX_TOTAL) * 10000) / 100;
}

export function percentTone(pct: number): string {
  if (pct >= 70) return "bg-green-100 text-green-800";
  if (pct >= 50) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

export interface MyScore {
  scores: CriteriaScores;
  total: number;
  percentage: number;
  comment: string | null;
  updatedAt?: string | null;
}