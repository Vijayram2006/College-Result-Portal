import React, { useState, useEffect, useRef } from "react";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { useLocation } from "wouter";
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  UserPlus,
  Plus,
  ArrowUpDown,
  Search,
  Users,
  GraduationCap,
  Calendar,
  Lock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { downloadWorkbook } from "../utils/downloadWorkbook";
import { addAuditLog, adminResultsApi, apiErrorMessage, studentsApi, RowError } from "../services/api";
import { getRealLocalTimestamp } from "../utils/dateUtils";
import { getStoredDepartments, Department } from "./Departments";
import { aidsSem1Students } from "../data/aidsStudents";
import { cseSem1Students, bmeSem1Students } from "../data/dummyMarksData";
import { getSystemConfig, SystemConfig } from "../utils/systemConfig";

// Date formatter for DOB parsing (supports string, Date instance, and Excel serial numbers)
const formatDob = (rawDob: any): string => {
  if (!rawDob && rawDob !== 0) return "";
  if (rawDob instanceof Date) {
    const y = rawDob.getFullYear();
    const m = String(rawDob.getMonth() + 1).padStart(2, "0");
    const d = String(rawDob.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof rawDob === "number") {
    // Excel serial number to date
    const date = new Date(Math.round((rawDob - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(rawDob).trim();
  // Check if DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY format
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, "0");
    const month = ddmmyyyyMatch[2].padStart(2, "0");
    const year = ddmmyyyyMatch[3];
    return `${year}-${month}-${day}`;
  }
  return str;
};

/*
 * College sheets often start with title rows (college name, place, "First Year B.PHARM – I Semester", "Students Name
 * List") above the real header row, and name the columns their own way ("Registration No", "Regular/Lateral Entry").
 * The header row is found by looking for a register-number column and a name column in the first rows.
 */
const HEADER_ALIASES: Record<"reg" | "name" | "dob" | "category", string[]> = {
  reg: ["registernumber", "registerno", "regno", "regnumber", "registrationnumber", "registrationno", "register", "rollno", "rollnumber"],
  name: ["name", "studentname", "nameofthestudent", "studentsname", "candidatename", "candidate"],
  dob: ["dob", "dateofbirth", "birthdate"],
  category: ["category", "admissiontype", "regularlateralentry", "regularlateral", "entrytype", "entry", "type", "cat"],
};
const headerKey = (cell: any) => String(cell ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

type SheetRow = { sheetRow: number; reg: any; name: any; dob: any; category: any };

/** The student rows of a sheet: finds the header row, maps its columns and skips blank rows. */
function readStudentRows(ws: any): SheetRow[] {
  const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true });
  const firstRow = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r : 0;
  const columnOf = (row: any[], field: keyof typeof HEADER_ALIASES) =>
    row.findIndex((cell) => HEADER_ALIASES[field].includes(headerKey(cell)));
  let headerIdx = grid.slice(0, 20).findIndex((row) => columnOf(row, "reg") >= 0 && columnOf(row, "name") >= 0);
  if (headerIdx < 0) headerIdx = 0; // no recognisable header: the server reports the missing columns per row
  const header = grid[headerIdx] || [];
  const col = { reg: columnOf(header, "reg"), name: columnOf(header, "name"), dob: columnOf(header, "dob"), category: columnOf(header, "category") };
  const at = (row: any[], i: number) => (i >= 0 ? row[i] : "");
  return grid
    .map((row, i) => ({ row, sheetRow: firstRow + i + 1 }))
    .slice(headerIdx + 1)
    // Rows with neither a register number nor a name are blank lines or notes under the list
    .filter(({ row }) => String(at(row, col.reg)).trim() !== "" || String(at(row, col.name)).trim() !== "")
    .map(({ row, sheetRow }) => ({ sheetRow, reg: at(row, col.reg), name: at(row, col.name), dob: at(row, col.dob), category: at(row, col.category) }));
}

export type StudentCategory = "regular" | "lateral";

export interface StudentRecordItem {
  "Register Number": string;
  "Name": string;
  "DOB": string;
  "Department"?: string;
  "Category"?: StudentCategory;
  "Year"?: string;
  regNo: string;
  studentName: string;
  dob: string;
  dept?: string;
  category: StudentCategory;
  year?: string;
  [key: string]: any;
}

// Available Year of Study Options
/** The two semesters of a study year ("1st Year" -> Semester I and II); every semester when no year is chosen. */
export const semestersOfYear = (year: string): string[] => {
  const i = yearOptions.findIndex((y) => y.value === year);
  return i < 0 ? SEMESTER_OPTIONS : SEMESTER_OPTIONS.slice(i * 2, i * 2 + 2);
};

export const yearOptions = [
  { value: "1st Year", label: "1st Year (I Year)", defaultSem: "Semester I" },
  { value: "2nd Year", label: "2nd Year (II Year)", defaultSem: "Semester III" },
  { value: "3rd Year", label: "3rd Year (III Year)", defaultSem: "Semester V" },
  { value: "4th Year", label: "4th Year (IV Year)", defaultSem: "Semester VII" },
];

/**
 * Universal Student Sorting Algorithm:
 * 1. Regular category students are ALWAYS placed first.
 * 2. Lateral category students are ALWAYS appended at the very end only.
 * 3. Within each category group:
 *    - Mode "regNo": Natural numeric & alphanumeric ascending order (e.g. 1, 2, 3, 4, 5...)
 *    - Mode "name": Alphabetical ascending order (A to Z)
 */
export const sortStudentRecords = (
  list: any[],
  mode: "regNo" | "name" = "regNo"
): any[] => {
  return [...list].sort((a, b) => {
    const catA = String(a.category || a.Category || "regular").toLowerCase().trim();
    const catB = String(b.category || b.Category || "regular").toLowerCase().trim();
    const isLateralA = catA === "lateral";
    const isLateralB = catB === "lateral";

    // Lateral students are appended at last only!
    if (isLateralA !== isLateralB) {
      return isLateralA ? 1 : -1;
    }

    // Within the same category group:
    if (mode === "name") {
      const nameA = String(a["Name"] || a.studentName || a.name || "").trim();
      const nameB = String(b["Name"] || b.studentName || b.name || "").trim();
      const nameCmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      if (nameCmp !== 0) return nameCmp;

      const regA = String(a["Register Number"] || a.regNo || "").trim();
      const regB = String(b["Register Number"] || b.regNo || "").trim();
      return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
    } else {
      // Register Number order (natural numeric e.g. 1, 2, 3, 4, 5 or KVELL...001, 002)
      const regA = String(a["Register Number"] || a.regNo || "").trim();
      const regB = String(b["Register Number"] || b.regNo || "").trim();
      const regCmp = regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
      if (regCmp !== 0) return regCmp;

      const nameA = String(a["Name"] || a.studentName || a.name || "").trim();
      const nameB = String(b["Name"] || b.studentName || b.name || "").trim();
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    }
  });
};

import { getScopedKey, getActiveCollege, getActiveCollegeKey, isEngineeringCollege, isSuperAdmin } from "../utils/rbac";

// Department-scoped student storage helpers
export const getDeptUploadedStudents = (dept: string): any[] => {
  if (!dept) return [];
  const rawK = dept.toLowerCase().trim();
  const k = rawK === "ads" || rawK.includes("artificial") ? "aids" : rawK;
  const storageKey = getScopedKey(`kvell_dept_students_${k}`);
  try {
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading dept students", e);
  }

  // Pre-seeded students ONLY apply to Engineering college
  if (isEngineeringCollege()) {
    // 1. AIDS Semester 1 official students (50 students)
    if (k === "aids" || k.includes("artificial intelligence")) {
      return aidsSem1Students.map((s, idx) => ({
        "Register Number": s.regNo,
        "Name": s.name,
        "DOB": "2005-06-15",
        "Department": "AIDS",
        "Category": (idx >= 45 ? "lateral" : "regular") as StudentCategory,
        "Year": "1st Year",
        regNo: s.regNo,
        studentName: s.name,
        dob: "2005-06-15",
        dept: "AIDS",
        deptKey: "aids",
        category: (idx >= 45 ? "lateral" : "regular") as StudentCategory,
        year: "1st Year",
      }));
    }

    // 2. CSE Semester 1 official students (20 students)
    if (k === "cse" || k.includes("computer science")) {
      return cseSem1Students.map((s) => ({
        "Register Number": s.regNo,
        "Name": s.name,
        "DOB": s.dob || "2005-04-18",
        "Department": "CSE",
        "Category": s.category as StudentCategory,
        "Year": "1st Year",
        regNo: s.regNo,
        studentName: s.name,
        dob: s.dob || "2005-04-18",
        dept: "CSE",
        deptKey: "cse",
        category: s.category as StudentCategory,
        year: "1st Year",
      }));
    }

    // 3. BME Semester 1 official students (15 students)
    if (k === "bme" || k.includes("biomedical")) {
      return bmeSem1Students.map((s) => ({
        "Register Number": s.regNo,
        "Name": s.name,
        "DOB": s.dob || "2005-08-22",
        "Department": "BME",
        "Category": s.category as StudentCategory,
        "Year": "1st Year",
        regNo: s.regNo,
        studentName: s.name,
        dob: s.dob || "2005-08-22",
        dept: "BME",
        deptKey: "bme",
        category: s.category as StudentCategory,
        year: "1st Year",
      }));
    }
  }

  // Nursing, Pharmacy, and other departments start clean with 0 students
  return [];
};

export const saveDeptUploadedStudents = (dept: string, list: any[]) => {
  if (!dept) return;
  const k = dept.toLowerCase().trim();
  const key = getScopedKey(`kvell_dept_students_${k}`);
  try {
    sessionStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem(key, JSON.stringify(list));
    sessionStorage.setItem("kvell_uploaded_results", JSON.stringify(list));
    window.dispatchEvent(new Event("kvell_dept_students_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error saving dept students", e);
  }
};

export const ResultsUpload: React.FC = () => {
  const [, navigate] = useLocation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);

  // Target Metadata State (Subject Code removed, Year option added)
  const [storedDepts, setStoredDepts] = useState<Department[]>([]);
  const [deptKey, setDeptKey] = useState("");
  const [studyYear, setStudyYear] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  // Sorting & Filtering State
  const [sortMode, setSortMode] = useState<"regNo" | "name">("regNo");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Student Modal State
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addRegNo, setAddRegNo] = useState("");
  const [addName, setAddName] = useState("");
  const [addDob, setAddDob] = useState("");
  const [addDept, setAddDept] = useState("");
  const [addStudentYear, setAddStudentYear] = useState("");
  const [addCategory, setAddCategory] = useState<StudentCategory>("regular");

  // Status & Feedback message state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // A parsed spreadsheet waits here for the COE to check it and confirm; nothing is saved before that
  const [pendingUpload, setPendingUpload] = useState<{ fileName: string; rows: any[] } | null>(null);

  // Real-time System Governance Configuration & Lock Enforcement
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig);

  useEffect(() => {
    const handleConfigUpdate = () => {
      setSystemConfig(getSystemConfig());
    };
    window.addEventListener("kvell_system_config_updated", handleConfigUpdate);
    window.addEventListener("storage", handleConfigUpdate);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleConfigUpdate);
      window.removeEventListener("storage", handleConfigUpdate);
    };
  }, []);

  const activeCollegeKey = getActiveCollegeKey();
  // The Chief COE only views student data; the college's COE uploads, adds and deletes (the server enforces this too)
  const viewOnly = isSuperAdmin();
  const isCollegeLocked =
    systemConfig.systemMode === "EMERGENCY_LOCK" ||
    systemConfig.institutionalLocks?.[activeCollegeKey]?.locked === true ||
    systemConfig.institutionalLocks?.[activeCollegeKey]?.freezeSubmissions === true;

  // Load available departments dynamically from storage
  useEffect(() => {
    const loadDepts = () => {
      const list = getStoredDepartments();
      setStoredDepts(list);
      if (list.length > 0) {
        setDeptKey((prev) => (prev && list.some((d) => d.key === prev) ? prev : ""));
        setAddDept((prev) => (prev && list.some((d) => d.key === prev) ? prev : ""));
      }
    };
    loadDepts();
    window.addEventListener("kvell_departments_updated", loadDepts);
    window.addEventListener("storage", loadDepts);
    return () => {
      window.removeEventListener("kvell_departments_updated", loadDepts);
      window.removeEventListener("storage", loadDepts);
    };
  }, []);
  // All four choices name one class; nothing is listed or uploaded until every one is made
  const targetMissing = [
    !deptKey && "department",
    !studyYear && "year of study",
    !semester && "semester",
    !academicYear && "academic year",
  ].filter(Boolean) as string[];
  const targetReady = targetMissing.length === 0;

  // Only the newest request may fill the list (an older, slower answer must not overwrite it)
  const loadRequest = useRef(0);
  // Load the saved class list for the chosen department, study year, semester and academic year from the server
  const loadSavedStudents = async (dept: string, year: string, sem: string, acYear: string) => {
    const request = ++loadRequest.current;
    if (!dept || !year || !sem || !acYear) {
      setParsedData([]); // nothing (or not everything) chosen yet
      return;
    }
    try {
      const saved = await studentsApi.list(dept, sem, year, acYear);
      if (request !== loadRequest.current) return;
      const records = saved.map((st) => ({
        "Register Number": st.regNo,
        "Name": st.studentName,
        "DOB": st.dob,
        "Department": st.dept,
        "Category": st.category,
        "Year": st.year,
        regNo: st.regNo,
        studentName: st.studentName,
        dob: st.dob,
        dept: st.dept,
        category: st.category,
        year: st.year,
        saved: true,
      }));
      setParsedData(sortStudentRecords(records, sortMode));
    } catch (err) {
      if (request !== loadRequest.current) return;
      setParsedData([]);
      setFeedback({ type: "error", message: apiErrorMessage(err, "Could not load saved student data.") });
    }
  };
  const reloadSaved = () => loadSavedStudents(deptKey, studyYear, semester, academicYear);

  useEffect(() => {
    setSelectedFile(null);
    setPendingUpload(null);
    loadSavedStudents(deptKey, studyYear, semester, academicYear);
  }, [deptKey, studyYear, semester, academicYear]);

  useEffect(() => {
    setParsedData((rows) => sortStudentRecords(rows, sortMode));
  }, [sortMode]);

  const targetLabel = `${deptKey.toUpperCase()} • ${studyYear} • ${semester} • ${academicYear}`;

  // Confirms a previewed spreadsheet: every row is saved, or none (the errors are listed)
  const confirmPendingUpload = async () => {
    if (!pendingUpload) return;
    const { fileName, rows } = pendingUpload;
    const result = await saveStudentRows(rows, deptKey, studyYear);
    if (!result) return; // row errors are shown; the preview stays for correction
    setPendingUpload(null);
    await reloadSaved();
    setFeedback({
      type: "success",
      message: `Saved ${result.total} students from "${fileName}" (${result.created} new, ${result.updated} updated) for ${deptKey.toUpperCase()} • ${studyYear} (${semester}). ${loginNote(result.withoutDob, result.total)}`,
    });
  };

  const cancelPendingUpload = async () => {
    setPendingUpload(null);
    setSelectedFile(null);
    await reloadSaved();
    setFeedback({ type: "info", message: "The spreadsheet was not saved." });
  };

  // Clears the loaded list. Rows not yet saved are just dropped; saved students are deleted on the server (with their
  // marks) after a confirmation, so they do not come back when the page reloads.
  const handleClearLoaded = async () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Clearing records is restricted by the Controller of Examinations.");
      return;
    }
    const savedCount = parsedData.filter((r) => r.saved).length;
    if (savedCount === 0) {
      setParsedData([]);
      setSelectedFile(null);
      setFeedback({ type: "info", message: "The unsaved rows were cleared." });
      return;
    }
    if (
      !window.confirm(
        `Delete all ${savedCount} saved students of ${targetLabel}?\n\nTheir marks and results are deleted too. This cannot be undone.`
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      const deleted = await studentsApi.removeGroup(deptKey, studyYear, semester, academicYear);
      setSelectedFile(null);
      await reloadSaved();
      setFeedback({ type: "success", message: `Cleared ${targetLabel}: ${deleted} saved students deleted.` });
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "The students could not be deleted.") });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeptChange = (newDept: string) => {
    setDeptKey(newDept);
    setAddDept(newDept);
    setSelectedFile(null);
  };

  // Change Year; a chosen semester that is not part of the new year is cleared
  const handleYearChange = (newYear: string) => {
    setStudyYear(newYear);
    if (semester && !semestersOfYear(newYear).includes(semester)) setSemester("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again (after fixing it) is picked up
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Uploading student data is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    if (!targetReady) {
      setFeedback({ type: "error", message: `Choose the ${targetMissing.join(", ")} first, then upload the file.` });
      return;
    }
    if (file) {
      setSelectedFile(file);
      parseFile(file);
    }
  };

  const loginNote = (withoutDob: number, total: number) =>
    withoutDob === 0
      ? "They can now sign in with Register Number + Date of Birth."
      : withoutDob === total
        ? "No DOB was given, so they cannot sign in yet: upload the same students again with a DOB column later."
        : `${withoutDob} of them have no DOB yet and cannot sign in until it is added.`;

  // Saves rows on the server straight away (all-or-nothing). Shows the row errors and returns null if any are invalid.
  const saveStudentRows = async (
    rows: any[],
    dept: string,
    year: string
  ): Promise<{ created: number; updated: number; total: number; withoutDob: number } | null> => {
    if (!dept || !year || !semester || !academicYear) {
      const missing = [!dept && "department", !year && "year of study", !semester && "semester", !academicYear && "academic year"]
        .filter(Boolean)
        .join(", ");
      setFeedback({ type: "error", message: `Choose the ${missing} first, then upload or add the students again.` });
      return null;
    }
    try {
      return await studentsApi.save({
        deptKey: dept,
        year,
        semester,
        academicYear,
        students: rows.map((r) => ({
          row: r.sheetRow ?? 0,
          regNo: String(r["Register Number"] || r.regNo || ""),
          name: String(r["Name"] || r.studentName || ""),
          dob: String(r["DOB"] || r.dob || ""),
          category: String(r["Category"] || r.category || "regular"),
        })),
      });
    } catch (err: any) {
      const rowErrors: RowError[] = err?.response?.data?.errors || [];
      if (rowErrors.length > 0) {
        const lines = rowErrors
          .slice(0, 8)
          .map((e) => `${e.row > 0 ? `Sheet row ${e.row}` : "Added entry"}${e.regNo ? ` (${e.regNo})` : ""} - ${e.field}: ${e.error}`);
        if (rowErrors.length > 8) lines.push(`...and ${rowErrors.length - 8} more`);
        setFeedback({
          type: "error",
          message: `Nothing was saved. Fix these ${rowErrors.length} problems and try again:\n${lines.join("\n")}`,
        });
      } else {
        setFeedback({ type: "error", message: apiErrorMessage(err, "Student data could not be saved.") });
      }
      return null;
    }
  };

  // Parse Excel with NON-DESTRUCTIVE merge (does not affect previous data)
  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        // CSV cells stay plain text: the library would read "05-06-2005" US-style (May 6), but
        // Indian sheets write dates day-first, which formatDob handles.
        const isCsv = file.name.toLowerCase().endsWith(".csv");
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true, raw: isCsv });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Title rows above the header are skipped; columns are matched by name (see readStudentRows)
        const sheetRows = readStudentRows(ws);

        // Normalize data ensuring Register Number, Name, DOB, Dept, Category, Year are extracted
        const normalized = sheetRows.map((r) => {
          const rawReg = r.reg ?? "";
          const rawName = r.name ?? "";
          const rawDob = r.dob ?? "";
          const rawCat = r.category === "" || r.category == null ? "regular" : r.category;

          const formattedDob = formatDob(rawDob);
          // Unknown categories are kept as typed so the server reports them instead of guessing "regular"
          const catText = String(rawCat).trim().toLowerCase();
          const cleanCategory = (catText.includes("lateral")
            ? "lateral"
            : catText === "" || catText.includes("regular")
              ? "regular"
              : String(rawCat).trim()) as StudentCategory;

          const cleanReg = String(rawReg).trim().toUpperCase();

          return {
            "Register Number": cleanReg,
            "Name": String(rawName).trim(),
            "DOB": formattedDob,
            "Department": deptKey.toUpperCase(),
            "Category": cleanCategory,
            "Year": studyYear,
            regNo: cleanReg,
            studentName: String(rawName).trim(),
            dob: formattedDob,
            dept: deptKey.toUpperCase(),
            category: cleanCategory,
            year: studyYear,
            sheetRow: r.sheetRow, // the row number in the spreadsheet, used in error messages
          };
        });

        // Non-destructive merge: keep the listed students and append/update with new records
        const recordMap = new Map<string, any>();
        parsedData.forEach((item) => {
          const reg = String(item["Register Number"] || item.regNo).trim().toUpperCase();
          if (reg) recordMap.set(reg, item);
        });

        // Rows without a register number, or repeated within this file, are kept (not silently dropped
        // or merged) so the server lists them as errors when the data is confirmed.
        const seenInFile = new Set<string>();
        normalized.forEach((item, idx) => {
          const reg = String(item["Register Number"] || item.regNo).trim().toUpperCase();
          if (!reg) {
            recordMap.set(`__missing_${file.name}_${idx}`, item);
          } else if (seenInFile.has(reg)) {
            recordMap.set(`__duplicate_${file.name}_${idx}`, item);
          } else {
            seenInFile.add(reg);
            recordMap.set(reg, item);
          }
        });

        const mergedSorted = sortStudentRecords(Array.from(recordMap.values()), sortMode);
        setParsedData(mergedSorted);

        // Preview first: the COE checks the rows, then confirms (the save is all-or-nothing on the server)
        setPendingUpload({ fileName: file.name, rows: normalized });
        setFeedback({
          type: "info",
          message: `Preview of "${file.name}": ${normalized.length} rows for ${deptKey.toUpperCase()} • ${studyYear} (${semester}). Check them below, then press Save to add them. Nothing is saved yet.`,
        });
      } catch (err) {
        console.error("Error parsing Excel file", err);
        setFeedback({
          type: "error",
          message: "Failed to parse spreadsheet. Please ensure the file is a valid .xlsx or .csv.",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Add Student Handler (Modal Form Submit)
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Adding student records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    if (!addRegNo.trim()) {
      setFeedback({ type: "error", message: "Register Number is required." });
      return;
    }
    if (!addName.trim()) {
      setFeedback({ type: "error", message: "Student Name is required." });
      return;
    }

    const cleanReg = addRegNo.trim().toUpperCase();
    const formattedDob = formatDob(addDob);

    const newRecord: StudentRecordItem = {
      "Register Number": cleanReg,
      "Name": addName.trim(),
      "DOB": formattedDob,
      "Department": addDept.toUpperCase(),
      "Category": addCategory,
      "Year": addStudentYear,
      regNo: cleanReg,
      studentName: addName.trim(),
      dob: formattedDob,
      dept: addDept.toUpperCase(),
      category: addCategory,
      year: addStudentYear,
    };

    const result = await saveStudentRows([newRecord], addDept, addStudentYear);
    if (!result) return; // errors are shown; the form stays open for correction
    if (addDept === deptKey && addStudentYear === studyYear) {
      await reloadSaved();
    }

    // Reset Form
    setAddRegNo("");
    setAddName("");
    setAddDob("");
    setAddCategory("regular");
    setShowAddStudentModal(false);

    setFeedback({
      type: "success",
      message: `Student "${newRecord.studentName}" (${newRecord.regNo}) ${result.created ? "added" : "updated"} and saved as ${newRecord.category.toUpperCase()} entry in ${newRecord.dept} (${newRecord.year}). ${loginNote(result.withoutDob, 1)}`,
    });
  };

  // Delete Individual Student (and the saved record, if it was already saved)
  const handleDeleteStudent = async (regNo: string) => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: deleting student records is locked by the Super Admin.");
      return;
    }
    const target = parsedData.find(
      (s) => String(s.regNo || s["Register Number"]).trim().toUpperCase() === regNo.trim().toUpperCase()
    );
    if (target?.saved) {
      if (!window.confirm(`Delete saved student ${regNo}? Their marks and results are deleted too.`)) return;
      try {
        await studentsApi.remove(regNo);
      } catch (err) {
        setFeedback({ type: "error", message: apiErrorMessage(err, `Could not delete ${regNo}.`) });
        return;
      }
    }
    const updated = parsedData.filter(
      (s) => String(s.regNo || s["Register Number"]).trim().toUpperCase() !== regNo.trim().toUpperCase()
    );
    setParsedData(updated);
    setFeedback({
      type: "info",
      message: `Student record (${regNo}) deleted from ${deptKey.toUpperCase()}. Total remaining: ${updated.length}.`,
    });
  };

  // Change Sort Mode (Register Number vs Alphabetical Name)
  const handleToggleSort = (newMode: "regNo" | "name") => {
    setSortMode(newMode);
    const reSorted = sortStudentRecords(parsedData, newMode);
    setParsedData(reSorted);
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      { "Register Number": "1", "Name": "Aarav Sharma", "DOB": "2004-05-14", "Category": "Regular" },
      { "Register Number": "2", "Name": "Meera Nair", "DOB": "2004-08-22", "Category": "Regular" },
      { "Register Number": "4", "Name": "Rohan Gupta", "DOB": "2003-11-30", "Category": "Regular" },
      { "Register Number": "5", "Name": "Priyanka Sen", "DOB": "2004-02-18", "Category": "Regular" },
      { "Register Number": "3", "Name": "Vignesh Kumar", "DOB": "2003-09-12", "Category": "Lateral" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Data");
    downloadWorkbook(
      wb,
      `Student_Data_Template_${(deptKey || "ALL").toUpperCase()}_${studyYear.replace(/\s+/g, "")}_${semester.replace(/\s+/g, "")}.xlsx`
    );
  };

  const handleStartUpload = async () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: saving the class list is locked by the Super Admin.");
      return;
    }
    if (parsedData.length === 0) {
      setFeedback({
        type: "error",
        message: "Please upload an Excel spreadsheet or add student records using '+ Add Student' first.",
      });
      return;
    }
    const unsaved = parsedData.filter((r) => !r.saved);
    setIsUploading(true);
    setUploadProgress(30);
    try {
      if (unsaved.length > 0) {
        const result = await saveStudentRows(unsaved, deptKey, studyYear);
        if (!result) return;
      }
      setUploadProgress(100);
      sessionStorage.setItem(
        "kvell_upload_meta",
        JSON.stringify({ deptKey, studyYear, semester, academicYear })
      );
      navigate("/admin/results/validation");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete Complete Target Semester Data
  const handleDeleteTargetSemester = async () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: deleting semester data is locked by the Super Admin.");
      return;
    }
    if (!deptKey || !semester) {
      setFeedback({ type: "error", message: "Choose the department, year and semester first." });
      return;
    }
    const confirmText = `Are you sure you want to delete ALL student data for Target Semester "${semester}" in ${deptKey.toUpperCase()}?\n\nThis will remove all published and draft records for this semester. This action cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    setIsDeleting(true);
    try {
      const result = await adminResultsApi.deleteBatchesBySemester(deptKey, semester);
      addAuditLog({
        action: "DELETED_TARGET_SEMESTER_DATA",
        target: `${deptKey.toUpperCase()} - ${semester}`,
        timestamp: getRealLocalTimestamp(),
        description: `Deleted complete student data for department ${deptKey.toUpperCase()}, ${semester} (${result.deletedCount} batches removed).`,
      });
      setSelectedFile(null);
      setParsedData([]);
      setFeedback({
        type: "success",
        message: `Complete target semester data for ${deptKey.toUpperCase()} ${semester} has been successfully deleted (${result.deletedCount} batch records removed).`,
      });
    } catch (err) {
      console.error("Error deleting target semester data:", err);
      setFeedback({
        type: "error",
        message: `Failed to delete target semester data for ${semester}. Please try again.`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Target Year Data
  const handleDeleteTargetYearData = async () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: deleting year data is locked by the Super Admin.");
      return;
    }
    if (!deptKey || !semester || !studyYear) {
      setFeedback({ type: "error", message: "Choose the department, year and semester first." });
      return;
    }
    const confirmText = `Are you sure you want to delete student data for "${studyYear}" under ${deptKey.toUpperCase()} - ${semester}${academicYear ? ` (${academicYear})` : " (every academic year)"}?\n\nThis will remove student data matching this specific target year, with their marks. This action cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    setIsDeleting(true);
    try {
      const deleted = await studentsApi.removeGroup(deptKey, studyYear, semester, academicYear || undefined);
      await reloadSaved();

      addAuditLog({
        action: "DELETED_TARGET_YEAR_DATA",
        target: `${deptKey.toUpperCase()} - ${studyYear} (${semester})`,
        timestamp: getRealLocalTimestamp(),
        description: `Deleted target student data for department ${deptKey.toUpperCase()}, ${studyYear}, ${semester}.`,
      });

      setFeedback({
        type: "success",
        message: `Target student data for ${deptKey.toUpperCase()} ${studyYear} (${semester}) has been successfully removed (${deleted} saved students deleted).`,
      });
    } catch (err) {
      console.error("Error deleting target year data:", err);
      setFeedback({
        type: "error",
        message: apiErrorMessage(err, `Failed to delete target student data for ${studyYear}. Please try again.`),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Counts for Regular vs Lateral
  const regularCount = parsedData.filter(
    (s) => String(s.category || s.Category || "regular").toLowerCase().trim() !== "lateral"
  ).length;
  const lateralCount = parsedData.filter(
    (s) => String(s.category || s.Category || "regular").toLowerCase().trim() === "lateral"
  ).length;

  // Filtered view for search query
  const displayedStudents = parsedData.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const reg = String(s["Register Number"] || s.regNo || "").toLowerCase();
    const name = String(s["Name"] || s.studentName || "").toLowerCase();
    return reg.includes(q) || name.includes(q);
  });

  return (
    <div className="space-y-8 w-full">
      {/* Institutional Freeze Alert Banner */}
      {isCollegeLocked && (
        <div className="p-5 rounded-3xl bg-red-950/80 border-2 border-red-500/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center shrink-0">
              <Lock className="text-red-300" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wider text-red-300">INSTITUTIONAL EXAMINATION LOCK ACTIVE</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">Dr. Sathish Enforcement</span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                Student data uploads and registry modifications are strictly locked by the Controller of Examinations. All student records are in read-only audit mode.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/50 text-red-200 text-xs font-mono font-bold whitespace-nowrap">
            STATUTORY FREEZE
          </span>
        </div>
      )}

      {viewOnly && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          View only: the Chief COE can see student data here. Uploading, adding and deleting students is done by the college's Controller of Examinations.
        </div>
      )}

      {/* Instructions Header */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            STEP 1 OF 3 • EXCEL / CSV UPLOAD & STUDENT REGISTRY MANAGEMENT
          </span>
          <h2 className="font-display text-2xl font-bold">
            Student Data
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            {viewOnly
              ? "Select a department, study year and semester to view the students saved for it."
              : <>Select target department, study year, and semester. Upload Excel spreadsheets or use the <strong>Add Student</strong> button. Older records are preserved and merged, with regular students sorted first and lateral entries appended at the end.</>}
          </p>
        </div>

        {!viewOnly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            disabled={isCollegeLocked}
            onClick={() => {
              if (isCollegeLocked) return;
              setAddDept(deptKey);
              setAddStudentYear(studyYear);
              setAddRegNo("");
              setAddName("");
              setAddDob("");
              setAddCategory("regular");
              setShowAddStudentModal(true);
            }}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
              isCollegeLocked
                ? "bg-slate-700 text-gray-400 cursor-not-allowed border border-slate-600"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {isCollegeLocked ? <Lock size={16} /> : <UserPlus size={16} />}
            <span>{isCollegeLocked ? "Locked by COE" : "+ Add Student"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] font-extrabold text-xs transition shadow flex items-center justify-center gap-2 active:scale-95"
          >
            <Download size={14} />
            <span>Sample Excel Template</span>
          </button>
        </div>
        )}
      </div>

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition shadow-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : feedback.type === "error"
              ? "bg-red-50 text-red-900 border-red-200"
              : "bg-blue-50 text-blue-900 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : feedback.type === "error" ? (
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
            ) : (
              <Info size={18} className="text-blue-600 shrink-0" />
            )}
            <span className="whitespace-pre-line">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-700 ml-4 font-mono text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Target Department, Year & Semester Selection Card (Subject Code Removed, Year Added) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-6">
        <div className="border-b border-[#E5E1D8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              1. Select Target Department, Year & Semester
            </h3>
            <p className="text-xs text-gray-500">
              Student data will be mapped and assigned to the selected department, study year and academic period
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#D4A72C]/20 text-[#0B192C] font-extrabold text-[10px] uppercase w-fit">
            Mandatory Batch Mapping
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Department
            </label>
            <select
              value={deptKey}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">{storedDepts.length ? "Choose department" : "Choose department (none added yet)"}</option>
              {storedDepts.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Year of Study (Replaced Subject Code, contains the years) */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5 flex items-center justify-between">
              <span>Year (Study Year)</span>
              <span className="text-[10px] text-[#B08014] font-bold">1st to 4th Year</span>
            </label>
            <select
              value={studyYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">Choose year of study</option>
              {yearOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Semester */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Target Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">Choose semester</option>
              {semestersOfYear(studyYear).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">Choose academic year</option>
              <option value="2026 - 2027">2026 - 2027</option>
            </select>
          </div>
        </div>

        {/* Selected Target Summary & Target Deletion Actions */}
        <div className="pt-4 border-t border-[#E5E1D8] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Active Target:</span>
            {deptKey && (
              <span className="px-2.5 py-1 rounded-lg bg-[#0B192C] text-white font-mono font-bold text-xs">
                {deptKey.toUpperCase()}
              </span>
            )}
            {studyYear && (
              <span className="px-2.5 py-1 rounded-lg bg-[#D4A72C]/20 text-[#0B192C] border border-[#D4A72C] font-bold text-xs">
                {studyYear}
              </span>
            )}
            {semester && (
              <span className="px-2.5 py-1 rounded-lg bg-[#F8F5EE] text-[#0B192C] border border-[#E5E1D8] font-bold text-xs">
                {semester}
              </span>
            )}
            {academicYear && (
              <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 font-mono text-xs">
                {academicYear}
              </span>
            )}
            {!targetReady && (
              <span className="text-xs font-semibold text-amber-700" data-testid="target-missing">
                Choose the {targetMissing.join(", ")}
              </span>
            )}
            {parsedData.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                {parsedData.length} Students Loaded
              </span>
            )}
          </div>

          {!viewOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteTargetSemester}
              disabled={isDeleting || isCollegeLocked}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                isCollegeLocked
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50"
                  : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
              }`}
              title={isCollegeLocked ? "Locked by COE" : `Delete all student records and batches for ${deptKey.toUpperCase()} ${semester}`}
            >
              {isCollegeLocked ? <Lock size={13} className="text-gray-400" /> : <Trash2 size={13} className="text-red-600" />}
              <span>Delete Target Semester Data</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteTargetYearData}
              disabled={isDeleting || isCollegeLocked}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                isCollegeLocked
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
              }`}
              title={isCollegeLocked ? "Locked by COE" : `Delete student records matching ${studyYear}`}
            >
              {isCollegeLocked ? <Lock size={13} className="text-gray-400" /> : <Trash2 size={13} className="text-amber-700" />}
              <span>Delete Target Year Data{studyYear ? ` (${studyYear})` : ""}</span>
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Drag & Drop Upload Container (not for the view-only Chief COE) */}
      {!viewOnly && (
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              2. Upload Student Spreadsheet (Non-Destructive Append)
            </h3>
            <p className="text-xs text-gray-500">
              {isCollegeLocked
                ? "Spreadsheet uploads are suspended due to Institutional Lock active under Dr. Sathish."
                : `Uploading a new file will merge with existing students for ${studyYear} without affecting previous data.`}
            </p>
          </div>

          <button
            type="button"
            disabled={isCollegeLocked}
            onClick={() => {
              if (isCollegeLocked) return;
              setAddDept(deptKey);
              setAddStudentYear(studyYear);
              setShowAddStudentModal(true);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
              isCollegeLocked
                ? "bg-slate-700 text-gray-400 cursor-not-allowed"
                : "bg-[#0B192C] hover:bg-[#132943] text-white"
            }`}
          >
            {isCollegeLocked ? <Lock size={14} className="text-gray-400" /> : <UserPlus size={14} className="text-[#D4A72C]" />}
            <span>{isCollegeLocked ? "Locked by COE" : "+ Add Student Manually"}</span>
          </button>
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 transition flex flex-col items-center justify-center relative text-center ${
          isCollegeLocked
            ? "border-red-300 bg-red-50/20 cursor-not-allowed"
            : "border-[#D4A72C] bg-[#F8F5EE]/40 hover:bg-[#F8F5EE]"
        }`}>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            disabled={isCollegeLocked}
            aria-label="Student spreadsheet"
            onChange={handleFileChange}
            className={`absolute inset-0 w-full h-full opacity-0 z-10 ${
              isCollegeLocked ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          />

          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
            isCollegeLocked ? "bg-red-100 text-red-600" : "bg-[#0B192C]/10 text-[#0B192C]"
          }`}>
            {isCollegeLocked ? <Lock size={28} /> : <UploadCloud size={28} />}
          </div>

          <h3 className="font-display font-bold text-lg text-[#0B192C]">
            {isCollegeLocked ? "Uploads Locked by Dr. Sathish" : "Drag & Drop Student Data Spreadsheet (.xlsx, .csv)"}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-lg">
            {isCollegeLocked
              ? "Institutional examination lock is actively enforced. Mark and student registry uploads are restricted."
              : !targetReady
                ? `Choose the ${targetMissing.join(", ")} above first.`
                : "Expected Columns: Register Number • Name • DOB • Category (Optional: Regular / Lateral)"}
          </p>

          <button
            type="button"
            disabled={isCollegeLocked}
            className={`mt-4 px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow flex items-center gap-2 pointer-events-none ${
              isCollegeLocked
                ? "bg-slate-700 text-gray-300"
                : "bg-[#0B192C] text-white"
            }`}
          >
            {isCollegeLocked ? <Lock size={15} className="text-red-400" /> : <FileSpreadsheet size={15} className="text-[#D4A72C]" />}
            <span>{isCollegeLocked ? "Locked by COE" : "Browse File"}</span>
          </button>
        </div>
      </div>
      )}

      {pendingUpload && (
        <div role="region" aria-label="Spreadsheet preview" className="p-5 rounded-2xl border-2 border-[#D4A72C] bg-[#FFF8E6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#0B192C]">
            <p className="font-black text-sm">Preview: {pendingUpload.rows.length} rows from "{pendingUpload.fileName}"</p>
            <p className="mt-0.5">Check the list below. Press <b>Save</b> to add them to {targetLabel}; nothing is saved until then.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={cancelPendingUpload} className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={confirmPendingUpload} disabled={isCollegeLocked} className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold disabled:opacity-50">
              Save {pendingUpload.rows.length} students
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Interactive Student Registry & Order Management */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 sm:p-8 space-y-5">
          {/* Registry Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Users size={20} className="text-[#0B192C]" />
                <h3 className="font-display font-bold text-lg text-[#0B192C]">
                  Current Student Data Registry ({parsedData.length})
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Target: {targetLabel} • Regular students sorted first, lateral entries appended at last.
              </p>
            </div>

            {/* Counts & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Regular: {regularCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                Lateral Entry (At Last): {lateralCount}
              </span>

              {/* Sorting Mode Toggles */}
              <div className="inline-flex rounded-xl border border-gray-300 p-0.5 bg-gray-50 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleToggleSort("regNo")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    sortMode === "regNo"
                      ? "bg-[#0B192C] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                  title="Sort by Register Number in natural order (1, 2, 3, 4, 5...)"
                >
                  Reg No (1,2,3...)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSort("name")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    sortMode === "name"
                      ? "bg-[#0B192C] text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                  title="Sort student names alphabetically (A to Z)"
                >
                  Alphabetical (A - Z)
                </button>
              </div>

              {!viewOnly && (<>
              <button
                type="button"
                onClick={() => {
                  setAddDept(deptKey);
                  setAddStudentYear(studyYear);
                  setShowAddStudentModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow"
              >
                <Plus size={14} /> Add Student
              </button>

              {parsedData.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLoaded}
                  disabled={isDeleting || isCollegeLocked}
                  className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="Delete every student listed here (saved students are deleted on the server too)"
                >
                  <Trash2 size={13} /> Clear Sheet
                </button>
              )}
              </>)}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Register Number or Name..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
              />
            </div>

            <span className="text-xs text-gray-500 font-semibold">
              Showing {displayedStudents.length} of {parsedData.length} records
            </span>
          </div>

          {/* Student Table */}
          <div className="border border-[#E5E1D8] rounded-2xl overflow-hidden shadow-inner">
            <div className="overflow-auto max-h-[75vh]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0B192C] text-white sticky top-0 z-10 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3">Register Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">DOB</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Year</th>
                    <th className="p-3 text-center">Admission Category</th>
                    {!viewOnly && <th className="p-3 text-right w-20">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8] bg-white">
                  {displayedStudents.map((student, idx) => {
                    const isLateral =
                      String(student.category || student.Category || "regular").toLowerCase().trim() === "lateral";
                    const reg = student["Register Number"] || student.regNo;
                    const name = student["Name"] || student.studentName;
                    const dob = student["DOB"] || student.dob || "—";
                    const dept = student["Department"] || student.dept || deptKey.toUpperCase();
                    const sYear = student["Year"] || student.year || studyYear;

                    return (
                      <tr
                        key={`${reg}-${idx}`}
                        className={`transition hover:bg-[#F8F5EE]/80 ${
                          isLateral ? "bg-purple-50/40" : ""
                        }`}
                      >
                        <td className="p-3 text-center font-mono font-bold text-gray-500">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-[#0B192C]">
                          {reg}
                        </td>
                        <td className="p-3 font-bold text-gray-900">
                          {name}
                        </td>
                        <td className="p-3 font-mono text-gray-600">
                          {dob}
                        </td>
                        <td className="p-3 font-semibold text-gray-700">
                          {dept}
                        </td>
                        <td className="p-3 font-medium text-gray-600">
                          {sYear}
                        </td>
                        <td className="p-3 text-center">
                          {isLateral ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1">
                              LATERAL ENTRY (APPENDED LAST)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
                              REGULAR
                            </span>
                          )}
                        </td>
                        {!viewOnly && (
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            disabled={isCollegeLocked}
                            onClick={() => handleDeleteStudent(reg)}
                            className={`p-1.5 rounded-lg transition ${
                              isCollegeLocked
                                ? "text-gray-300 cursor-not-allowed opacity-40"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={isCollegeLocked ? "Locked by COE" : `Remove ${name} (${reg})`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          {!viewOnly && (
          <div className="pt-3 border-t border-[#E5E1D8] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              disabled={isDeleting || isCollegeLocked}
              onClick={handleClearLoaded}
              className={`text-xs font-bold ${
                isCollegeLocked ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:underline"
              }`}
            >
              Clear All Loaded Records
            </button>

            <button
              type="button"
              onClick={handleStartUpload}
              disabled={isUploading || isCollegeLocked}
              className={`px-6 py-3 rounded-xl text-xs font-extrabold transition shadow-lg flex items-center gap-2 active:scale-95 ${
                isCollegeLocked
                  ? "bg-slate-700 text-gray-400 cursor-not-allowed border border-slate-600"
                  : "bg-[#0B192C] hover:bg-[#132943] text-white"
              }`}
            >
              <span>{isCollegeLocked ? "Mark Entry Locked by Dr. Sathish" : `Proceed to Mark Entry (${parsedData.length} Students)`}</span>
              {isCollegeLocked ? <Lock size={16} className="text-red-400" /> : <ArrowRight size={16} className="text-[#D4A72C]" />}
            </button>
          </div>
          )}
        </div>
      )}

      {/* Add Student Modal Form */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#E5E1D8] shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B192C]">
                    Add Student Record
                  </h3>
                  <p className="text-xs text-gray-500">
                    Will append into existing records without affecting previous data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
              {/* Register Number */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                  Register Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addRegNo}
                  onChange={(e) => setAddRegNo(e.target.value.toUpperCase())}
                  placeholder="e.g. 3 or KVELL2025CSE003"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Numeric register numbers (e.g. 1, 2, 3...) will auto-slot into proper ascending order.
                </span>
              </div>

              {/* Student Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                  Student Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Karthik P"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                />
              </div>

              {/* DOB, Department & Year in columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                    DOB <span className="text-gray-400 normal-case font-semibold">(optional, needed for login)</span>
                  </label>
                  <input
                    type="date"
                    value={addDob}
                    onChange={(e) => setAddDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addDept}
                    onChange={(e) => setAddDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                  >
                    <option value="">{storedDepts.length ? "Choose department" : "Choose department (none added yet)"}</option>
                    {storedDepts.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                    Study Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addStudentYear}
                    onChange={(e) => setAddStudentYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                  >
                    <option value="">Choose year of study</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {/* Category Option: Regular or Lateral */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                  Category Option <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      addCategory === "regular"
                        ? "bg-blue-50 border-blue-500 text-blue-950 font-bold shadow-sm"
                        : "bg-[#F8F5EE] border-[#E5E1D8] text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addCategoryRadio"
                      value="regular"
                      checked={addCategory === "regular"}
                      onChange={() => setAddCategory("regular")}
                      className="accent-[#0B192C] w-4 h-4"
                    />
                    <div>
                      <span className="block font-bold text-xs">Regular Entry</span>
                      <span className="block text-[10px] text-gray-500">Sorted by Reg No / Name</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                      addCategory === "lateral"
                        ? "bg-purple-50 border-purple-500 text-purple-950 font-bold shadow-sm"
                        : "bg-[#F8F5EE] border-[#E5E1D8] text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addCategoryRadio"
                      value="lateral"
                      checked={addCategory === "lateral"}
                      onChange={() => {
                        setAddCategory("lateral");
                        setAddStudentYear("2nd Year"); // Lateral entry joins in 2nd year
                      }}
                      className="accent-[#0B192C] w-4 h-4"
                    />
                    <div>
                      <span className="block font-bold text-xs">Lateral Entry</span>
                      <span className="block text-[10px] text-purple-700 font-semibold">Appended at last only</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-[#E5E1D8] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132943] text-white font-extrabold shadow-md transition flex items-center gap-2 active:scale-95"
                >
                  <Plus size={16} className="text-[#D4A72C]" />
                  <span>Save & Add Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
