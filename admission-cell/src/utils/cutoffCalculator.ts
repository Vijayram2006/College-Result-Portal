/**
 * Academic Cutoff & Marks Calculating Utilities
 */

import { CollegeKey } from "../types/admission";

export interface TenthMarksInput {
  lang1: number;
  lang2: number;
  maths: number;
  science: number;
  social: number;
}

export function calculateTenthSummary(marks: TenthMarksInput, maxPerSubject: number = 100) {
  const l1 = Number(marks.lang1) || 0;
  const l2 = Number(marks.lang2) || 0;
  const m = Number(marks.maths) || 0;
  const s = Number(marks.science) || 0;
  const soc = Number(marks.social) || 0;

  const total = l1 + l2 + m + s + soc;
  const maxTotal = maxPerSubject * 5;
  const percentage = maxTotal > 0 ? Number(((total / maxTotal) * 100).toFixed(2)) : 0;

  return { total, maxTotal, percentage };
}

export interface TwelfthMarksInput {
  lang1?: number;
  lang2?: number;
  maths?: number;
  physics: number;
  chemistry: number;
  biology?: number;
  computerScience?: number;
  elective?: number;
}

export function calculateTwelfthSummary(
  marks: TwelfthMarksInput,
  maxPerSubject: number = 100,
  board?: string
) {
  const isCbseOrIsc = board === "CBSE" || board === "ISC" || board === "ICSE";

  // CBSE and ISC / ICSE do NOT have Part 1 Tamil / Regional Language in Class 12 (5 subjects total)
  const l1 = !isCbseOrIsc && marks.lang1 !== undefined && marks.lang1 !== null && marks.lang1 !== ("" as any)
    ? Number(marks.lang1)
    : null;
  const l2 = marks.lang2 !== undefined && marks.lang2 !== null && marks.lang2 !== ("" as any) ? Number(marks.lang2) : null;
  const m = marks.maths !== undefined && marks.maths !== null && marks.maths !== ("" as any) ? Number(marks.maths) : null;
  const p = marks.physics !== undefined && marks.physics !== null && marks.physics !== ("" as any) ? Number(marks.physics) : null;
  const c = marks.chemistry !== undefined && marks.chemistry !== null && marks.chemistry !== ("" as any) ? Number(marks.chemistry) : null;
  const b = marks.biology !== undefined && marks.biology !== null && marks.biology !== ("" as any) ? Number(marks.biology) : null;
  const cs = marks.computerScience !== undefined && marks.computerScience !== null && marks.computerScience !== ("" as any) ? Number(marks.computerScience) : null;

  const validScores = [l1, l2, m, p, c, b, cs].filter((v): v is number => v !== null && !isNaN(v));
  const total = validScores.reduce((acc, curr) => acc + curr, 0);

  // If CBSE or ISC/ICSE, total is out of 500 marks (5 subjects x 100)
  // If Tamil Nadu State Board (HSC), total is out of 600 marks (6 subjects x 100)
  const maxTotal = isCbseOrIsc ? 500 : (board === "STATE_BOARD" || l1 !== null ? 600 : 500);
  const percentage = maxTotal > 0 && total > 0 ? Number(((total / maxTotal) * 100).toFixed(2)) : 0;

  return { total, maxTotal, percentage, subjectsCount: validScores.length };
}

export function calculateTwelfthCutoff(
  marks: TwelfthMarksInput,
  collegeKey: CollegeKey
): { cutoff: number; maxCutoff: number; formulaDescription: string } {
  const p = Number(marks.physics) || 0;
  const c = Number(marks.chemistry) || 0;
  const m = Number(marks.maths) || 0;
  const b = Number(marks.biology) || 0;

  if (collegeKey === "engineering") {
    // Official Engineering Cutoff Formula: Maths (100) + (Physics + Chemistry)/2 (100) = 200
    const cutoff = Number((m + (p + c) / 2).toFixed(2));
    return {
      cutoff,
      maxCutoff: 200,
      formulaDescription: "Maths + (Physics + Chemistry) / 2 [Max: 200]",
    };
  }

  if (collegeKey === "nursing") {
    // Nursing / Paramedical Cutoff Formula: Biology (100) + (Physics + Chemistry)/2 (100) = 200
    const cutoff = Number((b + (p + c) / 2).toFixed(2));
    return {
      cutoff,
      maxCutoff: 200,
      formulaDescription: "Biology + (Physics + Chemistry) / 2 [Max: 200]",
    };
  }

  if (collegeKey === "pharmacy") {
    // Pharmacy Council of India (PCI) Aggregate of Physics, Chemistry & Maths/Bio
    const higherBioMath = Math.max(b, m);
    const aggregate = Number(((p + c + higherBioMath) / 3).toFixed(2));
    return {
      cutoff: aggregate,
      maxCutoff: 100,
      formulaDescription: "Aggregate % of Physics, Chemistry & Bio/Maths [Max: 100%]",
    };
  }

  // Emerging Sciences
  const higherOption = Math.max(m, Number(marks.computerScience) || 0, b);
  const cutoff = Number(((p + c + higherOption) / 3).toFixed(2));
  return {
    cutoff,
    maxCutoff: 100,
    formulaDescription: "Aggregate Science & Tech % [Max: 100%]",
  };
}
