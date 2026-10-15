// Copy of admin-panel/src/utils/analytics.ts (keep the two in step).
import * as XLSX from "xlsx";
import type { ResultBatchRecord, StudentMarkRecord, StudentRecord, SubjectRecord } from "./types";
import { partACo, partBCCo } from "../../utils/coMapping";
import { downloadWorkbook } from "../../utils/downloadWorkbook";

/** One answer script: a student's marks in one subject for one assessment, with its publication state. */
export interface MarkRow {
  regNo: string;
  name: string;
  category: string;
  deptKey: string;
  deptName: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  assessment: string;
  partA: number;
  partBC: number;
  total: number;
  grade: string;
  passed: boolean;
  examiner: string;
  published: boolean;
  credits: number;
  faculty: string;
  questionsA: number[];
  questionsBC: Record<string, { a: number; b: number }>;
}

export const ASSESSMENTS = ["IAT-1", "IAT-2", "End Semester"] as const;
export const GRADES = ["O", "A+", "A", "B+", "B", "C", "F"] as const;
export const RANGES = [
  { label: "90–100", min: 90, max: 100 },
  { label: "80–89", min: 80, max: 89.99 },
  { label: "70–79", min: 70, max: 79.99 },
  { label: "60–69", min: 60, max: 69.99 },
  { label: "50–59", min: 50, max: 59.99 },
  { label: "40–49", min: 40, max: 49.99 },
  { label: "Below 40", min: 0, max: 39.99 },
];

const sum = (s: { i: number; ii: number; iii: number } | undefined) =>
  s ? (Number(s.i) || 0) + (Number(s.ii) || 0) + (Number(s.iii) || 0) : 0;

/** Joins entered marks with subject details (credits, faculty) and the publication state of their batch. */
export function buildRows(marks: StudentMarkRecord[], batches: ResultBatchRecord[], subjects: SubjectRecord[]): MarkRow[] {
  const published = new Set(
    batches
      .filter((b) => b.publicationStatus === "PUBLISHED")
      .map((b) => `${b.departmentKey}|${b.semester}|${b.subjectCode}|${b.assessmentType || "End Semester"}`)
  );
  const subjectInfo = new Map(subjects.map((s) => [`${s.deptKey}|${s.semester}|${s.code}`, s]));
  return marks
    .filter((m) => m.hasMarks)
    .map((m) => {
      const assessment = m.assessmentType || "End Semester";
      const info = subjectInfo.get(`${m.deptKey}|${m.semester}|${m.subjectCode}`);
      const questionsBC: MarkRow["questionsBC"] = {};
      Object.entries(m.partBC || {}).forEach(([q, v]) => (questionsBC[q] = { a: sum(v?.a), b: sum(v?.b) }));
      return {
        regNo: m.regNo,
        name: m.name,
        category: m.category === "lateral" ? "Lateral" : "Regular",
        deptKey: m.deptKey || "",
        deptName: m.deptName || (m.deptKey || "").toUpperCase(),
        semester: m.semester || "",
        subjectCode: m.subjectCode || "",
        subjectTitle: m.subjectTitle || info?.title || "",
        assessment,
        partA: Number(m.partATotal) || 0,
        partBC: Number(m.partBCTotal) || 0,
        total: Number(m.grandTotal) || 0,
        grade: m.grade || "—",
        passed: m.resultStatus === "PASS",
        examiner: (m.examinerName || "").trim() || "Not recorded",
        published: published.has(`${m.deptKey}|${m.semester}|${m.subjectCode}|${assessment}`),
        credits: info?.credits ?? 0,
        faculty: info?.faculty || "",
        questionsA: (m.partA || []).map((v) => Number(v) || 0),
        questionsBC,
      };
    });
}

export interface Stats {
  scripts: number;
  students: number;
  passed: number;
  failed: number;
  passPct: number;
  avg: number;
  median: number;
  highest: number;
  lowest: number;
  stdDev: number;
  grades: Record<string, number>;
  ranges: number[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
export const pct = (part: number, whole: number) => (whole ? round1((part * 100) / whole) : 0);

export function stats(rows: MarkRow[]): Stats {
  const totals = rows.map((r) => r.total).sort((a, b) => a - b);
  const n = totals.length;
  const avg = n ? totals.reduce((a, b) => a + b, 0) / n : 0;
  const median = n ? (n % 2 ? totals[(n - 1) / 2] : (totals[n / 2 - 1] + totals[n / 2]) / 2) : 0;
  const variance = n ? totals.reduce((a, t) => a + (t - avg) ** 2, 0) / n : 0;
  const passed = rows.filter((r) => r.passed).length;
  const grades: Record<string, number> = {};
  GRADES.forEach((g) => (grades[g] = 0));
  rows.forEach((r) => (grades[r.grade] = (grades[r.grade] || 0) + 1));
  return {
    scripts: n,
    students: new Set(rows.map((r) => r.regNo)).size,
    passed,
    failed: n - passed,
    passPct: pct(passed, n),
    avg: round1(avg),
    median: round1(median),
    highest: n ? totals[n - 1] : 0,
    lowest: n ? totals[0] : 0,
    stdDev: round1(Math.sqrt(variance)),
    grades,
    ranges: RANGES.map((r) => totals.filter((t) => t >= r.min && t <= r.max).length),
  };
}

/** Groups rows by a key, keeping the order of first appearance unless sorted later. */
export function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  rows.forEach((r) => {
    const k = key(r);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(r);
  });
  return out;
}

/** Students who passed every script in the selection (an "all clear" student). */
export function allClear(rows: MarkRow[]): { students: number; clear: number; pct: number } {
  const byStudent = groupBy(rows, (r) => r.regNo);
  let clear = 0;
  byStudent.forEach((list) => list.every((r) => r.passed) && clear++);
  return { students: byStudent.size, clear, pct: pct(clear, byStudent.size) };
}

export interface DeptRow {
  deptKey: string; deptName: string; enrolled: number; evaluated: number; scripts: number; subjects: number;
  avg: number; passPct: number; allClearPct: number; highest: number; topper: string; failed: number;
}

export function departmentTable(rows: MarkRow[], students: StudentRecord[], semester: string): DeptRow[] {
  return Array.from(groupBy(rows, (r) => r.deptKey).entries())
    .map(([deptKey, list]) => {
      const s = stats(list);
      const best = [...list].sort((a, b) => b.total - a.total)[0];
      const enrolled = students.filter((st) => st.deptKey === deptKey && (!semester || st.semester === semester)).length;
      return {
        deptKey,
        deptName: list[0].deptName,
        enrolled,
        evaluated: s.students,
        scripts: s.scripts,
        subjects: new Set(list.map((r) => r.subjectCode)).size,
        avg: s.avg,
        passPct: s.passPct,
        allClearPct: allClear(list).pct,
        highest: s.highest,
        topper: best ? `${best.name} (${best.total}, ${best.subjectCode})` : "",
        failed: s.failed,
      };
    })
    .sort((a, b) => b.passPct - a.passPct || b.avg - a.avg);
}

export interface SubjectRow {
  key: string; deptName: string; semester: string; code: string; title: string; assessment: string; examiners: string;
  faculty: string; credits: number; enrolled: number; appeared: number; passed: number; failed: number; passPct: number;
  avg: number; highest: number; lowest: number; grades: Record<string, number>; published: boolean;
}

/** Subject-wise result analysis (the usual college "Result Analysis" sheet). */
export function subjectTable(rows: MarkRow[], students: StudentRecord[]): SubjectRow[] {
  return Array.from(groupBy(rows, (r) => `${r.deptKey}|${r.semester}|${r.subjectCode}|${r.assessment}`).entries())
    .map(([key, list]) => {
      const s = stats(list);
      const r0 = list[0];
      return {
        key,
        deptName: r0.deptName,
        semester: r0.semester,
        code: r0.subjectCode,
        title: r0.subjectTitle,
        assessment: r0.assessment,
        examiners: Array.from(new Set(list.map((r) => r.examiner))).join(", "),
        faculty: r0.faculty,
        credits: r0.credits,
        enrolled: students.filter((st) => st.deptKey === r0.deptKey && st.semester === r0.semester).length,
        appeared: s.scripts,
        passed: s.passed,
        failed: s.failed,
        passPct: s.passPct,
        avg: s.avg,
        highest: s.highest,
        lowest: s.lowest,
        grades: s.grades,
        published: list.every((r) => r.published),
      };
    })
    .sort((a, b) => a.deptName.localeCompare(b.deptName) || a.code.localeCompare(b.code) || a.assessment.localeCompare(b.assessment));
}

export interface ComparisonRow { key: string; deptName: string; code: string; title: string; byAssessment: Record<string, { avg: number; passPct: number; appeared: number } | null>; change: number | null; }

/** The same subject across IAT-1, IAT-2 and End Semester. */
export function assessmentComparison(rows: MarkRow[]): ComparisonRow[] {
  return Array.from(groupBy(rows, (r) => `${r.deptKey}|${r.semester}|${r.subjectCode}`).entries())
    .map(([key, list]) => {
      const byAssessment: ComparisonRow["byAssessment"] = {};
      ASSESSMENTS.forEach((a) => {
        const part = list.filter((r) => r.assessment === a);
        if (!part.length) { byAssessment[a] = null; return; }
        const s = stats(part);
        byAssessment[a] = { avg: s.avg, passPct: s.passPct, appeared: s.scripts };
      });
      const i1 = byAssessment["IAT-1"], i2 = byAssessment["IAT-2"];
      return { key, deptName: list[0].deptName, code: list[0].subjectCode, title: list[0].subjectTitle, byAssessment, change: i1 && i2 ? round1(i2.avg - i1.avg) : null };
    })
    .sort((a, b) => a.deptName.localeCompare(b.deptName) || a.code.localeCompare(b.code));
}

export interface ProgressRow { regNo: string; name: string; deptName: string; code: string; iat1: number; iat2: number; change: number; }

/** Students who wrote both IAT-1 and IAT-2 in a subject, with the change in marks. */
export function iatProgress(rows: MarkRow[]): ProgressRow[] {
  const out: ProgressRow[] = [];
  groupBy(rows, (r) => `${r.regNo}|${r.deptKey}|${r.semester}|${r.subjectCode}`).forEach((list) => {
    const a = list.find((r) => r.assessment === "IAT-1");
    const b = list.find((r) => r.assessment === "IAT-2");
    if (a && b) out.push({ regNo: a.regNo, name: a.name, deptName: a.deptName, code: a.subjectCode, iat1: a.total, iat2: b.total, change: round1(b.total - a.total) });
  });
  return out.sort((x, y) => x.change - y.change);
}

export interface QuestionRow { question: string; part: string; co: string; attempted: number; avg: number; max: number; choiceA: number; choiceB: number; }

/** Average marks per question (Part A out of 2; Part B/C counts the attempted choice), with the CO it tests. */
export function questionTable(rows: MarkRow[]): QuestionRow[] {
  const assessment = new Set(rows.map((r) => r.assessment)).size === 1 ? rows[0]?.assessment ?? "" : "";
  const out: QuestionRow[] = [];
  for (let q = 1; q <= 10; q++) {
    const vals = rows.map((r) => r.questionsA[q - 1] ?? 0);
    out.push({ question: `Q${q}`, part: "A", co: assessment ? partACo(assessment, q) : "—", attempted: vals.filter((v) => v > 0).length,
      avg: vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, max: Math.max(0, ...vals), choiceA: 0, choiceB: 0 });
  }
  for (let q = 11; q <= 16; q++) {
    const vals = rows.map((r) => r.questionsBC[String(q)] ?? { a: 0, b: 0 });
    const best = vals.map((v) => Math.max(v.a, v.b));
    out.push({ question: `Q${q}`, part: q === 16 ? "C" : "B", co: assessment ? partBCCo(assessment, q) : "—",
      attempted: best.filter((v) => v > 0).length, avg: best.length ? round1(best.reduce((a, b) => a + b, 0) / best.length) : 0,
      max: Math.max(0, ...best), choiceA: vals.filter((v) => v.a > 0).length, choiceB: vals.filter((v) => v.b > 0).length });
  }
  return out;
}

export interface CoRow { co: string; questions: string; avgMarks: number; share: number; }

/** Average marks scored per course outcome (needs a single assessment, since each paper maps COs differently). */
export function coTable(rows: MarkRow[]): CoRow[] {
  const assessment = new Set(rows.map((r) => r.assessment)).size === 1 ? rows[0]?.assessment ?? "" : "";
  if (!assessment || !rows.length) return [];
  const totals = new Map<string, { marks: number; questions: string[] }>();
  const add = (co: string, q: string, m: number) => {
    if (!totals.has(co)) totals.set(co, { marks: 0, questions: [] });
    const t = totals.get(co)!;
    t.marks += m;
    if (!t.questions.includes(q)) t.questions.push(q);
  };
  rows.forEach((r) => {
    for (let q = 1; q <= 10; q++) add(partACo(assessment, q), `Q${q}`, r.questionsA[q - 1] ?? 0);
    for (let q = 11; q <= 16; q++) { const v = r.questionsBC[String(q)]; add(partBCCo(assessment, q), `Q${q}`, v ? Math.max(v.a, v.b) : 0); }
  });
  const grand = Array.from(totals.values()).reduce((a, t) => a + t.marks, 0);
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([co, t]) => ({ co, questions: t.questions.join(", "), avgMarks: round1(t.marks / rows.length), share: pct(t.marks, grand) }));
}

export interface ExaminerRow { examiner: string; subjects: string; scripts: number; avg: number; passPct: number; highest: number; lowest: number; }

export function examinerTable(rows: MarkRow[]): ExaminerRow[] {
  return Array.from(groupBy(rows, (r) => r.examiner.toUpperCase()).entries())
    .map(([, list]) => {
      const s = stats(list);
      return { examiner: list[0].examiner, subjects: Array.from(new Set(list.map((r) => r.subjectCode))).join(", "), scripts: s.scripts, avg: s.avg, passPct: s.passPct, highest: s.highest, lowest: s.lowest };
    })
    .sort((a, b) => b.passPct - a.passPct || b.avg - a.avg);
}

export interface StudentRow { rank: number; regNo: string; name: string; deptName: string; category: string; subjects: number; total: number; avg: number; passed: number; failed: number; best: string; weakest: string; }

/** Students ranked by average marks in the selection. */
export function studentTable(rows: MarkRow[]): StudentRow[] {
  const list = Array.from(groupBy(rows, (r) => r.regNo).values()).map((items) => {
    const total = items.reduce((a, r) => a + r.total, 0);
    const sorted = [...items].sort((a, b) => b.total - a.total);
    return {
      rank: 0, regNo: items[0].regNo, name: items[0].name, deptName: items[0].deptName, category: items[0].category,
      subjects: items.length, total, avg: round1(total / items.length), passed: items.filter((r) => r.passed).length,
      failed: items.filter((r) => !r.passed).length,
      best: `${sorted[0].subjectCode} (${sorted[0].total})`, weakest: `${sorted[sorted.length - 1].subjectCode} (${sorted[sorted.length - 1].total})`,
    };
  });
  list.sort((a, b) => b.avg - a.avg || a.regNo.localeCompare(b.regNo));
  list.forEach((s, i) => (s.rank = i + 1));
  return list;
}

const SEMESTER_ORDER = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const semesterIndex = (s: string) => {
  const i = SEMESTER_ORDER.indexOf(s.replace(/^Semester\s+/i, "").trim().toUpperCase());
  return i < 0 ? 99 : i;
};

export interface SemesterRow {
  key: string; semester: string; assessment: string; departments: number; subjects: number; students: number;
  scripts: number; avg: number; passPct: number; allClearPct: number; highest: number; failed: number;
}

/** One row per semester and assessment, so the trend across a programme reads top to bottom. */
export function semesterTable(rows: MarkRow[]): SemesterRow[] {
  return Array.from(groupBy(rows, (r) => `${r.semester}|${r.assessment}`).entries())
    .map(([key, list]) => {
      const s = stats(list);
      return {
        key, semester: list[0].semester, assessment: list[0].assessment,
        departments: new Set(list.map((r) => r.deptKey)).size, subjects: new Set(list.map((r) => `${r.deptKey}|${r.subjectCode}`)).size,
        students: s.students, scripts: s.scripts, avg: s.avg, passPct: s.passPct, allClearPct: allClear(list).pct, highest: s.highest, failed: s.failed,
      };
    })
    .sort((a, b) => semesterIndex(a.semester) - semesterIndex(b.semester)
      || ASSESSMENTS.indexOf(a.assessment as never) - ASSESSMENTS.indexOf(b.assessment as never));
}

export interface CategoryRow { category: string; students: number; scripts: number; avg: number; passPct: number; allClearPct: number; }

/** Regular vs lateral-entry students. */
export function categoryTable(rows: MarkRow[]): CategoryRow[] {
  return Array.from(groupBy(rows, (r) => r.category).entries()).map(([category, list]) => {
    const s = stats(list);
    return { category, students: s.students, scripts: s.scripts, avg: s.avg, passPct: s.passPct, allClearPct: allClear(list).pct };
  });
}

/** How many scripts of each grade every department has (for the stacked grade chart). */
export function deptGradeMatrix(rows: MarkRow[]): Record<string, string | number>[] {
  return Array.from(groupBy(rows, (r) => r.deptKey).values())
    .map((list) => {
      const s = stats(list);
      return { dept: list[0].deptName, key: list[0].deptKey, ...s.grades, total: s.scripts };
    })
    .sort((a, b) => String(a.dept).localeCompare(String(b.dept)));
}

export interface RiskRow {
  regNo: string; name: string; deptName: string; category: string; scripts: number; failed: number; avg: number;
  failedSubjects: string; reason: string;
}

/**
 * Students who need attention: failed two or more scripts, average below 50, or dropped 10+ marks from IAT-1 to IAT-2
 * in any subject. Sorted with the most failures first.
 */
export function atRiskStudents(rows: MarkRow[]): RiskRow[] {
  const drops = new Map<string, string[]>();
  iatProgress(rows).filter((p) => p.change <= -10).forEach((p) => {
    if (!drops.has(p.regNo)) drops.set(p.regNo, []);
    drops.get(p.regNo)!.push(`${p.code} ${p.change}`);
  });
  const out: RiskRow[] = [];
  groupBy(rows, (r) => r.regNo).forEach((list, regNo) => {
    const failedList = list.filter((r) => !r.passed);
    const avg = round1(list.reduce((a, r) => a + r.total, 0) / list.length);
    if (failedList.length < 2 && avg >= 50 && !drops.has(regNo)) return;
    const reasons: string[] = [];
    if (failedList.length) reasons.push(`${failedList.length} failed script${failedList.length > 1 ? "s" : ""}`);
    if (avg < 50) reasons.push(`average ${avg}`);
    if (drops.has(regNo)) reasons.push(`IAT drop: ${drops.get(regNo)!.join(", ")}`);
    out.push({
      regNo, name: list[0].name, deptName: list[0].deptName, category: list[0].category, scripts: list.length,
      failed: failedList.length, avg,
      failedSubjects: Array.from(new Set(failedList.map((r) => `${r.subjectCode} (${r.assessment})`))).join(", "),
      reason: reasons.join("; "),
    });
  });
  return out.sort((a, b) => b.failed - a.failed || a.avg - b.avg);
}

export interface TopperRow { deptName: string; rank: number; regNo: string; name: string; scripts: number; avg: number; failed: number; }

/** The top `n` students of every department by average mark. */
export function deptToppers(rows: MarkRow[], n = 3): TopperRow[] {
  const out: TopperRow[] = [];
  groupBy(rows, (r) => r.deptKey).forEach((list) => {
    studentTable(list).slice(0, n).forEach((s) =>
      out.push({ deptName: s.deptName, rank: s.rank, regNo: s.regNo, name: s.name, scripts: s.subjects, avg: s.avg, failed: s.failed }));
  });
  return out.sort((a, b) => a.deptName.localeCompare(b.deptName) || a.rank - b.rank);
}

/* ---------- Excel export ---------- */

export type Sheet = { name: string; rows: Record<string, string | number>[] };

/** Saves one table as a .csv download (opens in Excel; UTF-8 with BOM so names keep their accents). */
export function exportCsv(fileName: string, sheet: Sheet) {
  const cols = Object.keys(sheet.rows[0] ?? { Note: "" });
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [cols.map(cell).join(","), ...sheet.rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName.replace(/[\\/:*?"<>|]+/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export const sheets = {
  department: (t: DeptRow[]): Sheet => ({ name: "Department-wise", rows: t.map((d) => ({ Department: d.deptName, Enrolled: d.enrolled, "Students evaluated": d.evaluated, Subjects: d.subjects, Scripts: d.scripts, "Average mark": d.avg, "Pass %": d.passPct, "All-clear students %": d.allClearPct, "Failed scripts": d.failed, Highest: d.highest, Topper: d.topper })) }),
  subject: (t: SubjectRow[]): Sheet => ({ name: "Subject Result Analysis", rows: t.map((s) => ({ Department: s.deptName, Semester: s.semester, Code: s.code, Subject: s.title, Assessment: s.assessment, Faculty: s.faculty, Examiner: s.examiners, Credits: s.credits, Enrolled: s.enrolled, Appeared: s.appeared, Passed: s.passed, Failed: s.failed, "Pass %": s.passPct, Average: s.avg, Highest: s.highest, Lowest: s.lowest, ...Object.fromEntries(GRADES.map((g) => [`Grade ${g}`, s.grades[g] || 0])), Published: s.published ? "Yes" : "No" })) }),
  grades: (s: Stats): Sheet => ({ name: "Grades & Ranges", rows: [...GRADES.map((g) => ({ Type: "Grade", Band: g, Scripts: s.grades[g] || 0, "% of scripts": pct(s.grades[g] || 0, s.scripts) })), ...RANGES.map((r, i) => ({ Type: "Mark range", Band: r.label, Scripts: s.ranges[i], "% of scripts": pct(s.ranges[i], s.scripts) }))] }),
  comparison: (t: ComparisonRow[]): Sheet => ({ name: "IAT Comparison", rows: t.map((c) => ({ Department: c.deptName, Code: c.code, Subject: c.title, ...Object.fromEntries(ASSESSMENTS.flatMap((a) => [[`${a} average`, c.byAssessment[a]?.avg ?? ""], [`${a} pass %`, c.byAssessment[a]?.passPct ?? ""], [`${a} appeared`, c.byAssessment[a]?.appeared ?? ""]])), "IAT-1 → IAT-2 change": c.change ?? "" })) }),
  progress: (t: ProgressRow[]): Sheet => ({ name: "IAT-1 to IAT-2 Progress", rows: t.map((p) => ({ "Register No": p.regNo, Name: p.name, Department: p.deptName, Subject: p.code, "IAT-1": p.iat1, "IAT-2": p.iat2, Change: p.change })) }),
  questions: (t: QuestionRow[]): Sheet => ({ name: "Question Analysis", rows: t.map((q) => ({ Question: q.question, Part: q.part, CO: q.co, "Students who scored": q.attempted, "Average mark": q.avg, "Highest mark": q.max, "Chose (a)": q.part === "A" ? "" : q.choiceA, "Chose (b)": q.part === "A" ? "" : q.choiceB })) }),
  cos: (t: CoRow[]): Sheet => ({ name: "CO Analysis", rows: t.map((c) => ({ CO: c.co, Questions: c.questions, "Average marks per student": c.avgMarks, "Share of marks %": c.share })) }),
  examiners: (t: ExaminerRow[]): Sheet => ({ name: "Examiner-wise", rows: t.map((e) => ({ Examiner: e.examiner, Subjects: e.subjects, Scripts: e.scripts, Average: e.avg, "Pass %": e.passPct, Highest: e.highest, Lowest: e.lowest })) }),
  students: (t: StudentRow[], name = "Student Ranking"): Sheet => ({ name, rows: t.map((s) => ({ Rank: s.rank, "Register No": s.regNo, Name: s.name, Department: s.deptName, Category: s.category, Scripts: s.subjects, "Total marks": s.total, Average: s.avg, Passed: s.passed, Failed: s.failed, "Best subject": s.best, "Weakest subject": s.weakest })) }),
  semesters: (t: SemesterRow[]): Sheet => ({ name: "Semester-wise", rows: t.map((s) => ({ Semester: s.semester, Assessment: s.assessment, Departments: s.departments, Subjects: s.subjects, Students: s.students, Scripts: s.scripts, Average: s.avg, "Pass %": s.passPct, "All-clear students %": s.allClearPct, "Failed scripts": s.failed, Highest: s.highest })) }),
  categories: (t: CategoryRow[]): Sheet => ({ name: "Regular vs Lateral", rows: t.map((c) => ({ Category: c.category, Students: c.students, Scripts: c.scripts, Average: c.avg, "Pass %": c.passPct, "All-clear students %": c.allClearPct })) }),
  risk: (t: RiskRow[]): Sheet => ({ name: "Students At Risk", rows: t.map((r) => ({ "Register No": r.regNo, Name: r.name, Department: r.deptName, Category: r.category, Scripts: r.scripts, Failed: r.failed, Average: r.avg, "Failed subjects": r.failedSubjects, Reason: r.reason })) }),
  toppers: (t: TopperRow[]): Sheet => ({ name: "Department Toppers", rows: t.map((r) => ({ Department: r.deptName, Rank: r.rank, "Register No": r.regNo, Name: r.name, Scripts: r.scripts, Average: r.avg, Failed: r.failed })) }),
  raw: (rows: MarkRow[]): Sheet => ({ name: "All Marks", rows: rows.map((r) => ({ "Register No": r.regNo, Name: r.name, Category: r.category, Department: r.deptName, Semester: r.semester, Code: r.subjectCode, Subject: r.subjectTitle, Assessment: r.assessment, "Part A": r.partA, "Part B+C": r.partBC, Total: r.total, Grade: r.grade, Result: r.passed ? "PASS" : "FAIL", Examiner: r.examiner, Published: r.published ? "Yes" : "No" })) }),
};

/** Writes one or more sheets to an .xlsx download (empty sheets get a "No data" row so the file always opens). */
export function exportSheets(fileName: string, list: Sheet[], filters?: Record<string, string>) {
  const wb = XLSX.utils.book_new();
  if (filters) {
    const info = [{ Field: "Report", Value: "KVELL Result Portal – Analytics" }, { Field: "Generated", Value: new Date().toLocaleString("en-IN") },
      ...Object.entries(filters).map(([Field, Value]) => ({ Field, Value }))];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(info), "Filters");
  }
  list.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ Note: "No data for the selected filters" }]);
    const cols = Object.keys(s.rows[0] ?? { Note: "" });
    ws["!cols"] = cols.map((c) => ({ wch: Math.min(40, Math.max(c.length, ...s.rows.map((r) => String(r[c] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  downloadWorkbook(wb, fileName);
}
