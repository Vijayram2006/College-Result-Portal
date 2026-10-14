import * as XLSX from "xlsx";
import { downloadWorkbook } from "./downloadWorkbook";

/**
 * Published-results download, shared by the admin panel (any department of the college) and the faculty portal
 * (own department only; the server decides which batches are returned). The same file lives in both apps.
 */

export interface PublishedRecord {
  regNo: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  credits?: number;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
  gradePoints: number;
  resultStatus: string;
}

export interface PublishedBatch {
  id: string;
  departmentKey: string;
  departmentName: string;
  semester: string;
  academicYear: string;
  examMonthYear: string;
  subjectCode?: string;
  subjectTitle?: string;
  publicationStatus: string;
  publishedAt?: string;
  publishedBy?: string;
  assessmentType?: string;
  records: PublishedRecord[];
}

/** One downloadable result sheet: every published subject of a department, semester and assessment. */
export interface PublishedGroup {
  key: string;
  departmentKey: string;
  departmentName: string;
  semester: string;
  assessment: string;
  academicYear: string;
  batches: PublishedBatch[];
  students: number;
}

type Sheet = ReturnType<typeof XLSX.utils.aoa_to_sheet>;

const GRADES = ["O", "A+", "A", "B+", "B", "C", "F"];
const ASSESSMENT_ORDER = ["IAT-1", "IAT-2", "End Semester"];

const assessmentOf = (b: PublishedBatch) => b.assessmentType || "End Semester";
const semesterNumber = (s: string) => {
  const roman = s.match(/\b(VIII|VII|VI|V|IV|III|II|I)\b/)?.[1];
  const map: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  return roman ? map[roman] : Number(s.match(/\d+/)?.[0] ?? 0);
};

/** Groups PUBLISHED batches into result sheets, ordered by department, semester and assessment. */
export function groupPublished(batches: PublishedBatch[]): PublishedGroup[] {
  const groups = new Map<string, PublishedGroup>();
  for (const b of batches) {
    if (b.publicationStatus !== "PUBLISHED") continue;
    const assessment = assessmentOf(b);
    const key = `${b.departmentKey}|${b.semester}|${assessment}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, departmentKey: b.departmentKey, departmentName: b.departmentName, semester: b.semester, assessment,
        academicYear: b.academicYear, batches: [], students: 0 };
      groups.set(key, g);
    }
    g.batches.push(b);
  }
  for (const g of Array.from(groups.values())) {
    g.batches.sort((a, b) => (a.subjectCode ?? "").localeCompare(b.subjectCode ?? ""));
    g.students = new Set(g.batches.flatMap((b) => b.records.map((r) => r.regNo))).size;
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.departmentName.localeCompare(b.departmentName) ||
    semesterNumber(a.semester) - semesterNumber(b.semester) ||
    ASSESSMENT_ORDER.indexOf(a.assessment) - ASSESSMENT_ORDER.indexOf(b.assessment));
}

const pct = (part: number, whole: number) => (whole ? Math.round((part * 1000) / whole) / 10 : 0);

/** The rows of one result sheet: a student per row, a Total + Grade column pair per subject. */
function resultSheet(g: PublishedGroup): Sheet {
  const endSem = g.assessment === "End Semester";
  const subjects = g.batches.map((b) => ({ code: b.subjectCode ?? b.id, byReg: new Map(b.records.map((r) => [r.regNo, r])) }));
  const students = new Map<string, string>();
  g.batches.forEach((b) => b.records.forEach((r) => { if (!students.has(r.regNo)) students.set(r.regNo, r.studentName); }));

  const header = ["S.No", "Register Number", "Student Name",
    ...subjects.flatMap((s) => [`${s.code} Total`, `${s.code} Grade`]),
    "Subjects Passed", "Arrears", "Result", ...(endSem ? ["SGPA"] : [])];
  const rows: (string | number)[][] = [];
  let i = 0;
  for (const [regNo, name] of Array.from(students.entries())) {
    let passed = 0, failed = 0, credits = 0, weighted = 0;
    const cells: (string | number)[] = [];
    for (const s of subjects) {
      const r = s.byReg.get(regNo);
      if (!r) { cells.push("—", "—"); continue; }
      cells.push(r.totalMarks, r.grade);
      if (r.resultStatus === "PASS") passed++; else failed++;
      const c = r.credits ?? 0;
      credits += c;
      weighted += c * r.gradePoints;
    }
    // Same formula as the server's GradeCalculator.gpa: credit-weighted grade points over every graded subject
    const sgpa = credits ? Math.round((weighted / credits) * 100) / 100 : "—";
    rows.push([++i, regNo, name, ...cells, passed, failed, failed ? "FAIL" : "PASS", ...(endSem ? [sgpa] : [])]);
  }

  const top = [
    [`${g.departmentName} — ${g.semester} — ${g.assessment} Results`],
    [`Academic Year: ${g.academicYear}`, "", `Students: ${students.size}`, "", `Subjects: ${subjects.length}`],
    [],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...top, header, ...rows]);
  ws["!cols"] = header.map((h, idx) => ({ wch: idx === 2 ? 28 : idx === 1 ? 18 : Math.max(8, h.length + 2) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: top.length, c: 0 }, e: { r: top.length + rows.length, c: header.length - 1 } }) };
  return ws;
}

function summarySheet(g: PublishedGroup): Sheet {
  const rows = g.batches.map((b) => {
    const total = b.records.length;
    const passed = b.records.filter((r) => r.resultStatus === "PASS").length;
    const counts = Object.fromEntries(GRADES.map((gr) => [gr, b.records.filter((r) => r.grade === gr).length]));
    const avg = total ? Math.round((b.records.reduce((a, r) => a + r.totalMarks, 0) / total) * 10) / 10 : 0;
    return { "Subject Code": b.subjectCode ?? "", "Subject Title": b.subjectTitle ?? "", Credits: b.records[0]?.credits ?? "",
      Students: total, Passed: passed, Failed: total - passed, "Pass %": pct(passed, total), "Average Mark": avg,
      ...counts, "Published By": b.publishedBy ?? "", "Published At": b.publishedAt ?? "" };
  });
  return XLSX.utils.json_to_sheet(rows);
}

function detailRows(g: PublishedGroup) {
  return g.batches.flatMap((b) => b.records.map((r) => ({
    Department: g.departmentName, Semester: g.semester, Assessment: g.assessment, "Academic Year": g.academicYear,
    "Register Number": r.regNo, "Student Name": r.studentName, "Subject Code": r.courseCode, "Subject Title": r.courseTitle,
    Credits: r.credits ?? "", "Part A": Number(r.internalMarks), "Part B + C": Number(r.externalMarks), Total: r.totalMarks,
    Grade: r.grade, "Grade Points": r.gradePoints, Result: r.resultStatus,
  })));
}

const fileSafe = (s: string) => s.replace(/[^A-Za-z0-9+-]+/g, "_").replace(/^_|_$/g, "");

/** Downloads one result sheet as .xlsx: Result Sheet, Subject Summary and Marks Detail tabs. */
export function downloadPublishedGroup(g: PublishedGroup, collegeShortName = "KVELL") {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, resultSheet(g), "Result Sheet");
  XLSX.utils.book_append_sheet(wb, summarySheet(g), "Subject Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows(g)), "Marks Detail");
  downloadWorkbook(wb, `${fileSafe(collegeShortName)}_${fileSafe(g.departmentKey.toUpperCase())}_${fileSafe(g.semester)}_${fileSafe(g.assessment)}_Results.xlsx`);
}

/** Downloads every given result sheet in one workbook: an index tab plus one marks-detail tab for all of them. */
export function downloadAllPublished(groups: PublishedGroup[], collegeShortName = "KVELL") {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groups.map((g) => ({
    Department: g.departmentName, Semester: g.semester, Assessment: g.assessment, "Academic Year": g.academicYear,
    Subjects: g.batches.length, Students: g.students,
  }))), "Index");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groups.flatMap(detailRows)), "All Marks");
  downloadWorkbook(wb, `${fileSafe(collegeShortName)}_All_Published_Results.xlsx`);
}
