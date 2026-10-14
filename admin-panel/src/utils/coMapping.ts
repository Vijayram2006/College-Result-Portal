/**
 * Course Outcome (CO) of every question on the question paper, per assessment (from the COE's paper patterns).
 * Part A = questions 1-10, Part B/C = questions 11-16 (choices a and b of a question test the same CO).
 */
export type AssessmentType = "IAT-1" | "IAT-2" | "End Semester";

const PATTERNS: Record<AssessmentType, { partA: number[]; partBC: Record<number, number> }> = {
  "IAT-1": {
    partA: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3],
    partBC: { 11: 1, 12: 1, 13: 2, 14: 2, 15: 3, 16: 6 },
  },
  "IAT-2": {
    partA: [3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
    partBC: { 11: 3, 12: 4, 13: 4, 14: 5, 15: 5, 16: 6 },
  },
  "End Semester": {
    partA: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    partBC: { 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6 },
  },
};

const pattern = (assessment: string) => PATTERNS[assessment as AssessmentType] ?? PATTERNS["IAT-1"];

const known = (assessment: string) => assessment in PATTERNS;

/** CO of Part A question 1-10, e.g. "CO1" ("—" until the assessment is chosen). */
export const partACo = (assessment: string, question: number) =>
  known(assessment) ? `CO${pattern(assessment).partA[question - 1]}` : "—";

/** CO of Part B/C question 11-16 (same for choice a and b; "—" until the assessment is chosen). */
export const partBCCo = (assessment: string, question: number) =>
  known(assessment) ? `CO${pattern(assessment).partBC[question]}` : "—";

type Sub = { i: number; ii: number; iii: number };

/** Marks obtained per CO for one answer script (a Part B/C question counts its better choice, as in the total). */
export function coWiseMarks(
  assessment: string,
  partA: number[],
  partBC: Record<number, { a: Sub; b: Sub }>
): { co: string; marks: number }[] {
  const totals = new Map<string, number>();
  const add = (co: string, m: number) => totals.set(co, (totals.get(co) ?? 0) + m);
  partA.forEach((m, i) => add(partACo(assessment, i + 1), Number(m) || 0));
  for (const q of [11, 12, 13, 14, 15, 16]) {
    const d = partBC[q];
    if (!d) continue;
    const sum = (s: Sub) => (Number(s.i) || 0) + (Number(s.ii) || 0) + (Number(s.iii) || 0);
    add(partBCCo(assessment, q), Math.max(sum(d.a), sum(d.b)));
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([co, marks]) => ({ co, marks: Math.round(marks * 10) / 10 }));
}
