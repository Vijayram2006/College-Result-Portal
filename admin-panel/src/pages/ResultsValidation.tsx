import React, { useState, useEffect } from "react";
import { handleArrowNavigation } from "../utils/arrowNavigation";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { AnswerScriptPane } from "../components/AnswerScriptPane";
import { partACo, partBCCo } from "../utils/coMapping";
import { useLocation } from "wouter";
import {
  Eye,
  PenLine,
  Search,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Save,
  RotateCcw,
  Sparkles,
  Award,
  Globe,
  FileCheck,
  Check,
  Info,
  X,
  ChevronRight,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { adminResultsApi, addAuditLog, answerScriptsApi, apiErrorMessage, marksApi, subjectsApi, SubjectRecord } from "../services/api";
import { getRealLocalTimestamp } from "../utils/dateUtils";
import { getStoredDepartments, Department } from "./Departments";
import { aidsSem1Students } from "../data/aidsStudents";
import { cseSem1Students, bmeSem1Students, seedDummyMarksForDepts, generateStudentMarkDetail, ensureDummyMarksLoaded } from "../data/dummyMarksData";
import { departmentSubjectsCatalog } from "../data/curriculumSubjects";
import { getScopedKey, getActiveCollege, getActiveCollegeKey, isEngineeringCollege, isSuperAdmin } from "../utils/rbac";
import { getSystemConfig, SystemConfig } from "../utils/systemConfig";

// Department & Subject Catalog (Includes AIDS & MA8201 from examination paper)
const departmentCatalog: Record<string, { name: string; subjects: { code: string; title: string }[] }> = {
  bme: { name: "Biomedical Engineering", subjects: [] },
  bt: { name: "Biotechnology", subjects: [] },
  civil: { name: "Civil Engineering", subjects: [] },
  ra: { name: "Robotics & Automation", subjects: [] },
  mba: { name: "Master of Business Administration", subjects: [] },
  mca: { name: "Master of Computer Applications", subjects: [] },
  aids: {
    name: "Artificial Intelligence & Data Science",
    subjects: [
      { code: "MA8201", title: "Matrices and Calculus" },
      { code: "AD301", title: "Foundations of Data Science" },
      { code: "AD302", title: "Artificial Intelligence & Machine Learning" },
      { code: "CS301", title: "Data Structures & Algorithms" },
    ],
  },
  cse: {
    name: "Computer Science & Engineering",
    subjects: [
      { code: "CS301", title: "Data Structures & Algorithms" },
      { code: "CS302", title: "Computer Organization & Architecture" },
      { code: "CS303", title: "Object Oriented Programming with Java" },
      { code: "MA8201", title: "Matrices and Calculus" },
      { code: "CS501", title: "Database Management Systems" },
    ],
  },
  ece: {
    name: "Electronics & Communication",
    subjects: [
      { code: "EC301", title: "Electronic Circuits & Devices" },
      { code: "EC302", title: "Digital Electronics & Logic Design" },
      { code: "EC501", title: "Microprocessors & Microcontrollers" },
      { code: "MA8201", title: "Matrices and Calculus" },
    ],
  },
  mech: {
    name: "Mechanical Engineering",
    subjects: [
      { code: "ME301", title: "Engineering Thermodynamics" },
      { code: "ME302", title: "Fluid Mechanics & Machinery" },
      { code: "ME501", title: "Design of Machine Elements" },
      { code: "MA8201", title: "Matrices and Calculus" },
    ],
  },
  eee: {
    name: "Electrical & Electronics",
    subjects: [
      { code: "EE301", title: "Electric Circuits & Networks" },
      { code: "EE302", title: "Electrical Machines - I" },
      { code: "EE501", title: "Power System Analysis" },
      { code: "MA8201", title: "Matrices and Calculus" },
    ],
  },
};

// Initial student registry for realistic evaluation
const baseStudentsByDept: Record<string, { regNo: string; name: string; dob: string }[]> = {
  aids: [
    { regNo: "20260110226020", name: "Aarav Sharma", dob: "2004-05-14" },
    { regNo: "20260110226021", name: "Meera Nair", dob: "2004-08-22" },
    { regNo: "20260110226022", name: "Rohan Gupta", dob: "2003-11-30" },
    { regNo: "20260110226023", name: "Priyanka Sen", dob: "2004-02-18" },
    { regNo: "20260110226024", name: "Karthik P", dob: "2004-09-05" },
    { regNo: "20260110226025", name: "Sneha Reddy", dob: "2004-07-11" },
  ],
  cse: [
    { regNo: "KVELL2025CSE001", name: "Aarav Sharma", dob: "2004-05-14" },
    { regNo: "KVELL2025CSE002", name: "Meera Nair", dob: "2004-08-22" },
    { regNo: "KVELL2025CSE003", name: "Rohan Gupta", dob: "2003-11-30" },
    { regNo: "KVELL2025CSE004", name: "Priyanka Sen", dob: "2004-02-18" },
    { regNo: "KVELL2025CSE005", name: "Karthik P", dob: "2004-09-05" },
    { regNo: "KVELL2025CSE006", name: "Aditya Verma", dob: "2004-01-12" },
  ],
  ece: [
    { regNo: "KVELL2025ECE001", name: "Vikramaditya Verma", dob: "2004-03-15" },
    { regNo: "KVELL2025ECE002", name: "Ananya Deshmukh", dob: "2004-06-20" },
    { regNo: "KVELL2025ECE003", name: "Siddharth Roy", dob: "2003-10-08" },
  ],
  mech: [
    { regNo: "KVELL2025MECH001", name: "Rahul Menon", dob: "2004-04-12" },
    { regNo: "KVELL2025MECH002", name: "Divya Krishnan", dob: "2004-09-27" },
  ],
  eee: [
    { regNo: "KVELL2025EEE001", name: "Suresh Balaji", dob: "2004-07-04" },
    { regNo: "KVELL2025EEE002", name: "Deepika Rao", dob: "2004-12-19" },
  ],
};

interface StudentMarkData {
  regNo: string;
  name: string;
  dob: string;
  category?: "regular" | "lateral";
  hasMarks: boolean;
  partATotal: number;
  partBCTotal: number;
  grandTotal: number;
  grade: string;
  resultStatus: "PASS" | "FAIL";
  partA: number[];
  partBC: Record<string, { a: { i: number; ii: number; iii: number }; b: { i: number; ii: number; iii: number } }>;
  assessmentType?: string;
  deptKey?: string;
  deptName?: string;
  semester?: string;
  subjectCode?: string;
  subjectTitle?: string;
  examinerName?: string;
  examinerDesignation?: string;
  version?: number;
}

export const ResultsValidation: React.FC = () => {
  const [, navigate] = useLocation();

  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig());

  useEffect(() => {
    const handleConfig = () => setSystemConfig(getSystemConfig());
    window.addEventListener("kvell_system_config_updated", handleConfig);
    window.addEventListener("storage", handleConfig);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleConfig);
      window.removeEventListener("storage", handleConfig);
    };
  }, []);

  const activeCollegeKey = getActiveCollegeKey();
  // The Chief COE only views marks; the college's COE and faculty enter them (the server enforces this too)
  const chiefViewOnly = isSuperAdmin();
  const isCollegeLocked =
    systemConfig.systemMode === "EMERGENCY_LOCK" ||
    systemConfig.institutionalLocks[activeCollegeKey]?.locked === true ||
    systemConfig.institutionalLocks[activeCollegeKey]?.freezeSubmissions === true;

  // Step 1: Target Selection State
  const [deptKey, setDeptKey] = useState(""); // nothing selected until the COE chooses
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  // IAT-1, IAT-2 and End Semester marks are kept separately; Mark Entry works on one at a time
  const [targetAssessment, setTargetAssessment] = useState<"" | "IAT-1" | "IAT-2" | "End Semester">("");
  const [customSubjectCode, setCustomSubjectCode] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  // Subjects come from the server's subject catalog (Subjects page)
  const [adminSubjects, setAdminSubjects] = useState<SubjectRecord[]>([]);

  useEffect(() => {
    const syncSubjects = () => {
      subjectsApi.list().then(setAdminSubjects).catch(() => setAdminSubjects([]));
    };
    syncSubjects();
    window.addEventListener("kvell_subjects_updated", syncSubjects);
    window.addEventListener("focus", syncSubjects);
    return () => {
      window.removeEventListener("kvell_subjects_updated", syncSubjects);
      window.removeEventListener("focus", syncSubjects);
    };
  }, []);

  // Step 2: Data Fetching State
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [students, setStudents] = useState<StudentMarkData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentMarkData | null>(null);

  // Examiner Credentials State (Empty by default as requested)
  const [examinerName, setExaminerName] = useState("");
  const [examinerDesignation, setExaminerDesignation] = useState("");
  const [showExaminerPrompt, setShowExaminerPrompt] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<StudentMarkData | null>(null);

  // Step 3: Mark Entry Form Modal State
  const [showMarkEntryForm, setShowMarkEntryForm] = useState(false);
  // Opened from the row's "View" button: the marksheet is read-only (editing goes through the top button)
  const [viewOnly, setViewOnly] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Form Assessment Metadata
  const [assessmentType, setAssessmentType] = useState<"" | "IAT-1" | "IAT-2" | "End Semester">("");
  const [examDate, setExamDate] = useState("09/10/26");

  // Part A: 10 Questions marks
  const [partAMarks, setPartAMarks] = useState<number[]>(Array(10).fill(0));

  // Part B + C: Questions 11 to 16, each having division a & b with subdivisions i, ii, iii
  type QSubdivisions = { i: number; ii: number; iii: number };
  type QuestionBC = { a: QSubdivisions; b: QSubdivisions };

  const initialPartBC: Record<number, QuestionBC> = {
    11: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
    12: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
    13: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
    14: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
    15: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
    16: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
  };

  const [partBCMarks, setPartBCMarks] = useState<Record<number, QuestionBC>>(initialPartBC);

  const [storedDepts, setStoredDepts] = useState<Department[]>([]);

  useEffect(() => {
    const syncDepts = () => {
      const list = getStoredDepartments();
      setStoredDepts(list);
      if (list.length > 0) {
        setDeptKey((cur) => (cur && list.some((d) => d.key === cur) ? cur : ""));
      }
    };
    syncDepts();
    window.addEventListener("kvell_departments_updated", syncDepts);
    return () => window.removeEventListener("kvell_departments_updated", syncDepts);
  }, []);

  // Active Department and Available Subjects (Combining Admin Subjects with Official Curriculum Catalog)
  const currentDeptObj = storedDepts.find((d) => d.key === deptKey);
  const activeDept = currentDeptObj || { name: deptKey || "Choose department", subjects: [] };

  const deptKeyToName: Record<string, string> = Object.fromEntries(storedDepts.map((d) => [d.key, d.name]));

  const availableSubjects: { code: string; title: string; source: "admin" | "catalog" }[] = React.useMemo(
    () =>
      adminSubjects
        .filter((sub) => sub.deptKey === deptKey && sub.semester === semester)
        .map((sub) => ({ code: sub.code, title: sub.title, source: "admin" as const })),
    [deptKey, semester, adminSubjects]
  );

  // Keep subjectCode selected and valid
  useEffect(() => {
    if (!isCustomSubject && availableSubjects.length > 0) {
      const exists = availableSubjects.some((s) => s.code === subjectCode);
      if (!exists) {
        setSubjectCode("");
      }
    }
  }, [availableSubjects, isCustomSubject, subjectCode]);

  const activeSubject = availableSubjects.find((s) => s.code === subjectCode);
  const effectiveSubjectCode = activeSubject?.code || "";
  const effectiveSubjectTitle = activeSubject?.title || "no subject in catalog";

  // Check if target was passed via sessionStorage from Step 1 (Student Data)
  useEffect(() => {
    const metaRaw = sessionStorage.getItem("kvell_upload_meta");
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        if (meta.deptKey) {
          setDeptKey(meta.deptKey);
        }
        if (meta.semester) setSemester(meta.semester);
        if (meta.academicYear) setAcademicYear("2026 - 2027");
        if (meta.subjectCode) setSubjectCode(meta.subjectCode);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleDeptChange = (newDept: string) => {
    setDeptKey(newDept);
    setIsDataFetched(false);
    setSelectedStudent(null);
    setShowMarkEntryForm(false);
    setIsCustomSubject(false);
  };

  // FETCH DATA button action: every student of the department & semester, with saved marks for the subject
  const handleFetchData = async () => {
    if (!deptKey || !semester || !effectiveSubjectCode || !targetAssessment) {
      setFeedback({
        type: "error",
        message: !deptKey
          ? "Choose a department first."
          : !semester
          ? "Choose a semester first."
          : effectiveSubjectCode && !targetAssessment
          ? "Choose the assessment (IAT-1, IAT-2 or End Semester) first."
          : availableSubjects.length === 0
          ? `No subjects for ${activeDept.name} • ${semester} yet. Add them on the Subjects page first.`
          : "Choose a subject first.",
      });
      return;
    }
    setIsFetching(true);
    try {
      const roster = await marksApi.roster(deptKey, semester, effectiveSubjectCode, targetAssessment);
      const formatted: StudentMarkData[] = roster.map((r) => ({ ...r }));
      setStudents(formatted);
      setIsDataFetched(true);
      setSelectedStudent(null);
      setShowMarkEntryForm(false);
      setFeedback(
        formatted.length === 0
          ? {
              type: "error",
              message: `No students found for ${activeDept.name} • ${semester}. Upload them on the Student Data page first.`,
            }
          : {
              type: "success",
              message: `Fetched ${formatted.length} student records for ${activeDept.name} • ${semester} • ${effectiveSubjectCode}. Click a student name to enter marks.`,
            }
      );
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "Could not fetch student records.") });
    } finally {
      setIsFetching(false);
    }
  };

  // Data loads only when FETCH DATA is clicked; changing the selection clears the previous list
  useEffect(() => {
    setStudents([]);
    setIsDataFetched(false);
    setSelectedStudent(null);
    setFeedback(null);
  }, [deptKey, semester, effectiveSubjectCode, targetAssessment]);

  // Initiate mark entry: prompt examiner name & designation first (fields start empty)
  const handleInitiateMarkEntry = (student: StudentMarkData) => {
    setViewOnly(false);
    setPendingStudent(student);
    setSelectedStudent(student);
    setExaminerName("");
    setExaminerDesignation("");
    setShowExaminerPrompt(true);
  };

  // "View": show the saved marksheet read-only, without asking for examiner details
  const handleViewMarks = (student: StudentMarkData) => {
    setSelectedStudent(student);
    setViewOnly(true);
    setExaminerName(student.examinerName || "");
    setExaminerDesignation(student.examinerDesignation || "");
    handleOpenMarkEntry(student);
  };

  // Confirm examiner and open student answer script
  const handleConfirmExaminer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!examinerName.trim()) {
      alert("Please enter the name of the examiner.");
      return;
    }
    if (!examinerDesignation.trim()) {
      alert("Please enter the examiner designation.");
      return;
    }
    localStorage.setItem("kvell_examiner_name", examinerName.trim());
    localStorage.setItem("kvell_examiner_designation", examinerDesignation.trim());
    setShowExaminerPrompt(false);
    if (pendingStudent) {
      handleOpenMarkEntry(pendingStudent);
    }
  };

  // Open Mark Entry Form for selected student
  const handleOpenMarkEntry = (student: StudentMarkData) => {
    setSelectedStudent(student);
    if (student.hasMarks) {
      setPartAMarks([...student.partA]);
      setPartBCMarks(JSON.parse(JSON.stringify(student.partBC)));
      setAssessmentType(targetAssessment);
    } else {
      // Clean marksheet; the assessment (IAT-1 / IAT-2 / End Semester) must be chosen
      setPartAMarks(Array(10).fill(0));
      setPartBCMarks(JSON.parse(JSON.stringify(initialPartBC)));
      setAssessmentType(targetAssessment);
    }
    setShowMarkEntryForm(true);
  };

  // Calculate Part A Total
  const partATotal = partAMarks.reduce((acc, curr) => acc + (Number(curr) || 0), 0);

  // Calculate Part B + C Total
  const calculateQTotal = (q: QuestionBC) => {
    const aTotal = (Number(q.a.i) || 0) + (Number(q.a.ii) || 0) + (Number(q.a.iii) || 0);
    const bTotal = (Number(q.b.i) || 0) + (Number(q.b.ii) || 0) + (Number(q.b.iii) || 0);
    return Math.max(aTotal, bTotal); // Exam rules: maximum of choice 'a' or 'b'
  };

  const partBCTotal = Object.values(partBCMarks).reduce((acc, q) => acc + calculateQTotal(q), 0);
  const partBTotal = [11, 12, 13, 14, 15].reduce((acc, q) => acc + calculateQTotal(partBCMarks[q]), 0);
  const partCTotal = calculateQTotal(partBCMarks[16]);

  // Grand Total (A + B + C)
  const grandTotal = Math.min(100, Math.round(partATotal + partBCTotal));

  // Dynamic Statutory Grading based on Regulations configured by Dr. Sathish in Super Admin
  const collegeRegulation = systemConfig.gradingRegulations[activeCollegeKey] || {
    regulation: "Anna University CBCS",
    passMinInternal: 45,
    passMinExternal: 45,
    passMinTotal: 50,
  };
  const moderationConfig = systemConfig.gradingRegulations.moderation || {
    maxGraceMarks: 5,
    enableCondonation: true,
  };

  const calculateDynamicGradeAndStatus = (total: number, partA: number, partBC: number) => {
    const internalPercent = (partA / 20) * 100;
    const externalPercent = (partBC / 80) * 100;
    const minTotal = collegeRegulation.passMinTotal ?? 50;
    const minInternal = collegeRegulation.passMinInternal ?? 45;
    const minExternal = collegeRegulation.passMinExternal ?? 45;
    const maxGrace = moderationConfig.maxGraceMarks ?? 0;

    let status: "PASS" | "FAIL" = "FAIL";
    let isGraceApplied = false;

    if (total >= minTotal && internalPercent >= minInternal && externalPercent >= minExternal) {
      status = "PASS";
    } else if (total < minTotal && (total + maxGrace) >= minTotal && internalPercent >= (minInternal - maxGrace)) {
      status = "PASS";
      isGraceApplied = true;
    }

    let grade = "U";
    if (activeCollegeKey === "nursing") {
      // Indian Nursing Council (INC) bands
      if (total >= 75) grade = "Distinction";
      else if (total >= 60) grade = "First Class";
      else if (total >= 50) grade = "Pass";
      else grade = "Fail";
    } else if (activeCollegeKey === "pharmacy") {
      // Pharmacy Council of India (PCI) 10-point scale
      if (total >= 90) grade = "O";
      else if (total >= 80) grade = "A";
      else if (total >= 70) grade = "B";
      else if (total >= 60) grade = "C";
      else if (total >= 50) grade = "D";
      else grade = "F";
    } else {
      // Anna University 10-point CBCS
      if (total >= 90) grade = "O";
      else if (total >= 80) grade = "A+";
      else if (total >= 70) grade = "A";
      else if (total >= 60) grade = "B+";
      else if (total >= 50) grade = "B";
      else if (total >= minTotal || isGraceApplied) grade = "C";
      else grade = "U";
    }

    return { grade, status, isGraceApplied };
  };

  const { grade: grandGrade, status: resultStatus, isGraceApplied } = calculateDynamicGradeAndStatus(
    grandTotal,
    partATotal,
    partBCTotal
  );

  // Pre-fill realistic sample marks matching the examination paper
  const handleFillSampleMarks = () => {
    // Part A: 10 questions (sample 16 out of 20)
    setPartAMarks([2, 2, 2, 1, 2, 1, 2, 2, 2, 2]);

    // Part B + C: Questions 11 to 16
    setPartBCMarks({
      11: { a: { i: 8, ii: 6, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
      12: { a: { i: 7, ii: 7, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
      13: { a: { i: 8, ii: 6, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
      14: { a: { i: 6, ii: 8, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
      15: { a: { i: 7, ii: 7, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } },
      16: { a: { i: 0, ii: 0, iii: 0 }, b: { i: 8, ii: 6, iii: 0 } },
    });
  };

  // CONFIRM MARK button action: the server validates the script and computes the official total & grade
  const handleConfirmMark = async () => {
    if (!selectedStudent) return;
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: marks entry is locked by the Super Admin.");
      return;
    }
    if (!assessmentType) {
      alert("Choose the assessment type (IAT-1, IAT-2 or End Semester) first.");
      return;
    }

    let saved: StudentMarkData;
    try {
      saved = await marksApi.save({
        deptKey,
        semester,
        subjectCode: effectiveSubjectCode,
        regNo: selectedStudent.regNo,
        assessmentType,
        partA: partAMarks.map((m) => Number(m) || 0),
        partBC: JSON.parse(JSON.stringify(partBCMarks)),
        examinerName: examinerName.trim(),
        examinerDesignation: examinerDesignation.trim(),
        expectedVersion: selectedStudent.version ?? 0,
      });
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "Marks could not be saved.") });
      return;
    }

    const newStudents = students.map((s) => (s.regNo === saved.regNo ? saved : s));
    setStudents(newStudents);
    setSelectedStudent(saved);
    window.dispatchEvent(new Event("kvell_marks_updated"));

    setFeedback({
      type: "success",
      message: `Marks successfully confirmed & saved for ${saved.name} (${saved.regNo})! Grand Total: ${saved.grandTotal}/100 [Grade ${saved.grade}]. Evaluator: ${examinerName}.`,
    });

    setShowMarkEntryForm(false);
  };

  // Marks the COE entered itself count as verified: forward this subject, then publish the whole department
  // from the Publish Results page (the server only publishes when every subject is forwarded and complete).
  const handleCommitBatch = async () => {
    if (!effectiveSubjectCode) return;
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: verifying subjects is locked by the Super Admin.");
      return;
    }
    try {
      if (!targetAssessment) {
        setFeedback({ type: "error", message: "Choose the assessment before verifying the subject." });
        return;
      }
      await adminResultsApi.forwardSubject({
        deptKey,
        semester,
        subjectCode: effectiveSubjectCode,
        academicYear,
        assessmentType: targetAssessment,
      });
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "Could not verify this subject.") });
      return;
    }
    navigate("/admin/results/publish");
  };

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
                Mark entry and batch publication are strictly locked by the Controller of Examinations. All submission pathways are currently read-only.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/50 text-red-200 text-xs font-mono font-bold whitespace-nowrap">
            STATUTORY FREEZE
          </span>
        </div>
      )}

      {chiefViewOnly && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          View only: the Chief COE can see entered marks here (use View on a row). Marks are entered and forwarded by the college's faculty and Controller of Examinations.
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            STEP 2 OF 3 • EXAMINATION MARK ENTRY HUB
          </span>
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <PenLine className="text-[#D4A72C]" size={26} />
            {chiefViewOnly ? "Student Marks (View Only)" : "Student Mark Entry"}
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Select target department, semester, and subject code, then click <strong>"FETCH DATA"</strong> to retrieve students and {chiefViewOnly ? "view their marks" : "enter paper marks"}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!chiefViewOnly && isDataFetched && students.some((s) => s.hasMarks) && (
            <button
              onClick={handleCommitBatch}
              disabled={isCollegeLocked}
              className={`px-5 py-3 rounded-xl font-extrabold text-xs transition shadow flex items-center gap-2 ${
                isCollegeLocked
                  ? "bg-slate-700/80 text-gray-300 cursor-not-allowed opacity-60 border border-slate-600"
                  : "bg-[#2E7D5B] hover:bg-emerald-700 text-white"
              }`}
            >
              {isCollegeLocked ? <Lock size={16} /> : <Globe size={16} />}
              {isCollegeLocked ? "Locked by the Super Admin" : <>Verify Subject &amp; Go to Publish</>}
            </button>
          )}
        </div>
      </div>

      {/* Real-time Feedback Toast */}
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
            ) : (
              <Info size={18} className="text-blue-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700 ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 1. Target Selection Card with FETCH DATA Button (matches Image 1) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-6">
        <div className="border-b border-[#E5E1D8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              1. Select Target Department, Semester & Subject Code
            </h3>
            <p className="text-xs text-gray-500">
              Student data will be mapped and assigned to the selected academic period and subject
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#D4A72C]/20 text-[#0B192C] font-extrabold text-[10px] uppercase w-fit">
              MANDATORY BATCH MAPPING
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
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

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Target Semester
            </label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setIsDataFetched(false);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">Choose semester</option>
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase">
                Subject Code
              </label>
            </div>

            <select
              value={subjectCode}
              onChange={(e) => {
                setSubjectCode(e.target.value);
                setIsDataFetched(false);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">{!deptKey ? "Choose department first" : availableSubjects.length ? "Choose subject" : "Choose subject (none added yet)"}</option>
              {availableSubjects.map((sub) => (
                <option key={sub.code} value={sub.code}>
                  {sub.code} - {sub.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Assessment</label>
            <select
              value={targetAssessment}
              onChange={(e) => {
                setTargetAssessment(e.target.value as any);
                setIsDataFetched(false);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="">Choose assessment</option>
              <option value="IAT-1">IAT-1</option>
              <option value="IAT-2">IAT-2</option>
              <option value="End Semester">End Semester</option>
            </select>
          </div>
        </div>

        {/* Action Row with FETCH DATA Button */}
        <div className="pt-4 border-t border-[#E5E1D8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500">
            Selected: <strong className="text-[#0B192C]">{activeDept.name}</strong> •{" "}
            <strong className="text-[#0B192C]">{targetAssessment || "No assessment"}</strong> •{" "}
            <strong className="text-[#0B192C]">{semester}</strong> •{" "}
            <strong className="text-[#B08014]">{effectiveSubjectCode} ({effectiveSubjectTitle})</strong>
          </div>

          <button
            type="button"
            onClick={handleFetchData}
            disabled={isFetching}
            className="px-6 py-3 rounded-xl bg-[#0B192C] hover:bg-[#132943] text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Database size={15} className="text-[#D4A72C]" />
            <span>{isFetching ? "FETCHING STUDENT DATA..." : "FETCH DATA"}</span>
          </button>
        </div>
      </div>

      {/* Step 2: Student Name List Display (Only displayed AFTER clicking FETCH DATA) */}
      {!isDataFetched ? (
        <div className="bg-white rounded-3xl border border-dashed border-[#D4A72C]/60 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center mx-auto">
            <Database size={26} className="text-[#B08014]" />
          </div>
          <h4 className="font-display font-bold text-lg text-[#0B192C]">
            Target Student List Awaiting Query
          </h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Select the target Department, Semester, and Subject Code above and click{" "}
            <span className="font-bold text-[#0B192C]">"FETCH DATA"</span> to display eligible students for mark entry.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-[#0B192C]">
                  Student Evaluation Roster ({students.length} Students)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#D4A72C]/20 text-[#0B192C]">
                  {effectiveSubjectCode}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {chiefViewOnly
                  ? <>Use <strong>View</strong> on a row to see a student's saved marks.</>
                  : <>Click on a student row to select, then click <strong>"ENTER MARK"</strong> (or <strong>"EDIT MARK"</strong> if marks exist) above. Use <strong>View</strong> to see saved marks.</>}
              </p>
            </div>

            {/* ENTER MARK Button: Prominently displayed when student is clicked */}
            {selectedStudent && !chiefViewOnly && (
              <div className="animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => handleInitiateMarkEntry(selectedStudent)}
                  className="px-6 py-3 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] font-black text-xs shadow-lg transition flex items-center gap-2 active:scale-95"
                >
                  <PenLine size={16} />
                  <span>
                    {selectedStudent.hasMarks ? "EDIT MARK" : "ENTER MARK"} FOR {selectedStudent.name}
                  </span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Student List Table */}
          <div className="overflow-auto max-h-[75vh]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
                <tr>
                  <th className="p-3.5 text-center w-12">Select</th>
                  <th className="p-3.5">Registration Number</th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">Date of Birth (DOB)</th>
                  <th className="p-3.5 text-center">Part A Total</th>
                  <th className="p-3.5 text-center">Part B+C Total</th>
                  <th className="p-3.5 text-center">Grand Total</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]">
                {students.map((student) => {
                  const isSelected = selectedStudent?.regNo === student.regNo;
                  return (
                    <tr
                      key={student.regNo}
                      onClick={() => setSelectedStudent(student)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-[#D4A72C]/15 border-l-4 border-l-[#D4A72C]"
                          : "hover:bg-[#F8F5EE]/70"
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="radio"
                          name="studentSelect"
                          checked={isSelected}
                          onChange={() => setSelectedStudent(student)}
                          className="w-4 h-4 text-[#0B192C] accent-[#0B192C] cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#0B192C]">
                        <span>{student.regNo}</span>
                        {student.category === "lateral" ? (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                            LATERAL
                          </span>
                        ) : (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                            REGULAR
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-gray-900">{student.name}</td>
                      <td className="p-3.5 font-mono text-gray-600">{student.dob || "—"}</td>
                      <td className="p-3.5 text-center font-semibold">
                        {student.hasMarks ? student.partATotal : "—"}
                      </td>
                      <td className="p-3.5 text-center font-semibold">
                        {student.hasMarks ? student.partBCTotal : "—"}
                      </td>
                      <td className="p-3.5 text-center font-black text-sm">
                        {student.hasMarks ? (
                          <span className="text-[#0B192C]">{student.grandTotal} / 100</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {student.hasMarks ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> MARKS ENTERED ({student.grade})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            PENDING ENTRY
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {student.hasMarks ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMarks(student);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-[#0B192C] text-white shadow"
                                : "bg-gray-100 text-gray-800 hover:bg-[#0B192C] hover:text-white"
                            }`}
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-400">Not entered</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Examiner Credentials Prompt Modal (Shown Before Opening Answer Script) */}
      {showExaminerPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E5E1D8] shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B192C]">
                    Examiner Verification
                  </h3>
                  <p className="text-xs text-gray-500">
                    Provide evaluator details before opening student answer script
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowExaminerPrompt(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmExaminer} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                  Name of the Examiner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={examinerName}
                  onChange={(e) => setExaminerName(e.target.value)}
                  placeholder="Enter Name of the Examiner"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
                  Examiner Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={examinerDesignation}
                  onChange={(e) => setExaminerDesignation(e.target.value)}
                  placeholder="Enter Examiner Designation"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Professor & Controller of Examinations",
                    "Associate Professor & HoD",
                    "Assistant Professor (Sr. Grade)",
                    "External Chief Evaluator",
                  ].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExaminerDesignation(d)}
                      className="text-[10px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {pendingStudent && (
                <div className="p-3 bg-[#F8F5EE] rounded-xl border border-[#E5E1D8] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Target Candidate</span>
                    <span className="font-bold text-[#0B192C] text-xs">{pendingStudent.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#B08014] bg-white px-2 py-0.5 rounded border border-gray-200">
                    {pendingStudent.regNo}
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExaminerPrompt(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132943] text-white font-extrabold shadow-md transition flex items-center gap-2"
                >
                  <span>Proceed to Answer Script</span>
                  <ArrowRight size={14} className="text-[#D4A72C]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 3: Authentic Examination Mark Entry Form Modal (Matches Image 2 & Requirements) */}
      {showMarkEntryForm && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          {/* Split view: the student's scanned answer script beside the marks form */}
          <div className="w-full max-w-[1600px] my-auto flex flex-col lg:flex-row gap-4">
          <AnswerScriptPane
            scriptKey={`${selectedStudent.regNo}|${effectiveSubjectCode}|${assessmentType}`}
            label={`${selectedStudent.regNo} • ${effectiveSubjectCode} • ${assessmentType}`}
            prompt={assessmentType ? undefined : "Choose the assessment (IAT-1, IAT-2 or End Semester) to see the answer script."}
            fetchPdf={() => answerScriptsApi.file({ dept: deptKey, semester, subject: effectiveSubjectCode, regNo: selectedStudent.regNo, assessment: assessmentType })}
          />
          <div className="bg-white rounded-3xl lg:w-1/2 w-full p-6 sm:p-8 border border-[#E5E1D8] shadow-2xl space-y-6 max-h-[94vh] overflow-y-auto">
            {/* Top Modal Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#0B192C] text-white text-[10px] font-extrabold uppercase tracking-wider">
                  OFFICIAL EVALUATION SCRIPT
                </span>
                {viewOnly && (
                  <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-extrabold uppercase tracking-wider">
                    View only
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-[#B08014]">
                  REG: {selectedStudent.regNo}
                </span>
              </div>
              <button
                onClick={() => setShowMarkEntryForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <fieldset disabled={viewOnly} onKeyDown={handleArrowNavigation} className="min-w-0 border-0 p-0 m-0 space-y-6">
            {/* University Paper Sheet Header (Centered Second Image + Rightmost Kyro Third Image) */}
            <div className="border-2 border-red-900/60 rounded-2xl p-4 sm:p-6 bg-[#FFFCF7] text-[#0B192C] shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-red-900/40 pb-4">
                {/* Left Column: Assessment Selector & Auto-fill */}
                <div className="w-full md:w-1/4 flex flex-col items-start gap-2">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-900">
                    Assessment Type
                  </span>
                  <div className="inline-flex rounded-lg border border-red-900/40 p-0.5 bg-white text-xs font-bold shadow-sm">
                    {(["IAT-1", "IAT-2", "End Semester"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        disabled={type !== assessmentType}
                        title={type !== assessmentType ? "Change the assessment in step 1 above" : undefined}
                        className={`px-2.5 py-1 rounded-md text-[11px] transition ${
                          assessmentType === type
                            ? "bg-[#0B192C] text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleFillSampleMarks}
                    className="px-2.5 py-1 rounded-lg bg-[#D4A72C]/20 hover:bg-[#D4A72C]/30 text-[#0B192C] font-bold text-[10px] border border-[#D4A72C] transition flex items-center gap-1"
                    title="Populate sample scores for quick verification"
                  >
                    <Sparkles size={11} /> Auto-Fill Marks
                  </button>
                </div>

                {/* Center: Second Image (Karpaga Vinayaga Banner Logo with transparent background) */}
                <div className="w-full md:flex-1 flex flex-col items-center justify-center text-center px-2">
                  <img
                    src="/karpaga-vinayaga-banner.png"
                    alt="Karpaga Vinayaga Educational Lore for Learning - Deemed To Be University"
                    className="h-16 sm:h-20 w-auto object-contain"
                  />
                  <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-widest mt-1">
                    Karpaga Vinayaga College of Engineering & Technology
                  </span>
                </div>

                {/* Rightmost: Third Image (Kyro Elephant Mascot - Only the animal mascot, transparent background) */}
                <div className="w-full md:w-1/4 flex items-center justify-center md:justify-end">
                  <img
                    src="/kyro-mascot.png"
                    alt="Kyro Mascot"
                    className="h-24 sm:h-28 w-auto object-contain transition-transform duration-200 hover:scale-105"
                  />
                </div>
              </div>

              {/* Header Details Grid (Matches Image 2 table) */}
              <div className="border border-red-900/60 divide-y divide-red-900/60 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-900/60">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] text-red-900">
                      REGISTRATION NUMBER
                    </span>
                    <span className="font-mono font-black text-sm tracking-widest text-[#0B192C] bg-white px-2 py-0.5 rounded border border-gray-300">
                      {selectedStudent.regNo}
                    </span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] text-red-900">Semester</span>
                    <span className="font-bold text-gray-900">{semester}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-900/60">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] text-red-900">
                      Degree / Branch
                    </span>
                    <span className="font-bold text-gray-900">
                      {deptKey.toUpperCase()} • {activeDept.name}
                    </span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] text-red-900">Date</span>
                    <input
                      type="text"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-24 text-right px-2 py-0.5 font-bold rounded border border-gray-300 bg-white"
                    />
                  </div>
                </div>

                <div className="p-2.5 flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[10px] text-red-900">
                    Subject Code / Title
                  </span>
                  <span className="font-bold text-gray-900">
                    {effectiveSubjectCode} • {effectiveSubjectTitle}
                  </span>
                </div>
              </div>

              {/* Main Evaluation Grid: PART A and PART B + C side by side / stacked */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
                {/* PART - A (Questions 1 to 10): stretches to the height of Part B + Part C beside it */}
                <div className="lg:col-span-4 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white flex flex-col">
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                    PART - A (Max 20)
                  </div>
                  <table className="w-full flex-1 h-full text-center text-xs divide-y divide-red-900/40">
                    <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border-r border-red-900/40 w-2/5">Question Number</th>
                        <th className="p-2 border-r border-red-900/40 w-2/5">Marks</th>
                        <th className="p-2 w-1/5">CO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/30">
                      {partAMarks.map((mark, i) => (
                        <tr key={i} className="hover:bg-red-50/40">
                          <td className="p-1.5 font-extrabold text-red-900 border-r border-red-900/40">
                            {i + 1}
                          </td>
                          <td className="p-1.5 border-r border-red-900/40">
                            <input
                              type="number"
                              min="0"
                              max="2"
                              step="0.5"
                              value={mark === 0 ? "" : mark}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = [...partAMarks];
                                updated[i] = isNaN(val) ? 0 : Math.min(2, Math.max(0, val));
                                setPartAMarks(updated);
                              }}
                              className="w-14 text-center font-bold px-1.5 py-1 rounded border border-gray-300 bg-[#FFFEFA] focus:ring-1 focus:ring-red-900"
                            />
                          </td>
                          <td className="p-1.5 font-extrabold text-[10px] text-[#0B192C] bg-[#D4A72C]/15">{partACo(assessmentType, i + 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-100 text-red-950 font-black">
                      <tr>
                        <td className="p-2 border-r border-red-900/40 uppercase text-[10px]">
                          Total (Part - A)
                        </td>
                        <td className="p-2 font-mono text-sm text-[#0B192C] border-r border-red-900/40">
                          {partATotal}
                        </td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PART - B with PART - C directly below it, beside PART - A */}
                <div className="lg:col-span-8 space-y-4">
                {/* PART - B (Questions 11 to 15, choice a or b) */}
                <div className="border-2 border-red-900/60 rounded-xl overflow-hidden bg-white">
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                    PART - B (Questions 11 - 15)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs divide-y divide-red-900/40">
                      <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="p-2 border-r border-red-900/40 w-16">Q. No</th>
                          <th className="p-2 border-r border-red-900/40 w-8">Sub</th>
                          <th className="p-2 border-r border-red-900/40 w-14">i</th>
                          <th className="p-2 border-r border-red-900/40 w-14">ii</th>
                          <th className="p-2 border-r border-red-900/40 w-14">iii</th>
                          <th className="p-2 border-r border-red-900/40">Q. Total</th>
                          <th className="p-2 w-12">CO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-900/30">
                        {[11, 12, 13, 14, 15].map((qNum) => {
                          const qData = partBCMarks[qNum];
                          const qTotal = calculateQTotal(qData);
                          // A question is answered as (a) OR (b): once one choice has marks, the other row is locked
                          const aHas = (Number(qData.a.i) || 0) + (Number(qData.a.ii) || 0) + (Number(qData.a.iii) || 0) > 0;
                          const bHas = (Number(qData.b.i) || 0) + (Number(qData.b.ii) || 0) + (Number(qData.b.iii) || 0) > 0;
                          const aLocked = bHas && !aHas;
                          const bLocked = aHas && !bHas;
                          return (
                            <React.Fragment key={qNum}>
                              {/* Sub-division a */}
                              <tr className="hover:bg-red-50/30">
                                <td
                                  rowSpan={2}
                                  className="p-2 font-extrabold text-red-900 border-r border-red-900/40 align-middle bg-red-50/20"
                                >
                                  {qNum}
                                </td>
                                <td className="p-1 font-bold text-gray-700 border-r border-red-900/40">a</td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.a.i === 0 ? "" : qData.a.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, i: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={aLocked}
                                    title={aLocked ? "Locked: marks are entered for choice (b). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${aLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.a.ii === 0 ? "" : qData.a.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, ii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={aLocked}
                                    title={aLocked ? "Locked: marks are entered for choice (b). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${aLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.a.iii === 0 ? "" : qData.a.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, iii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={aLocked}
                                    title={aLocked ? "Locked: marks are entered for choice (b). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${aLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td rowSpan={2} className="p-2 font-mono font-bold text-sm text-[#0B192C] align-middle bg-red-50/20 border-r border-red-900/40">
                                  {qTotal}
                                </td>
                                <td rowSpan={2} className="p-1.5 font-extrabold text-[10px] text-[#0B192C] bg-[#D4A72C]/15 align-middle">
                                  {partBCCo(assessmentType, qNum)}
                                </td>
                              </tr>

                              {/* Sub-division b */}
                              <tr className="hover:bg-red-50/30 border-b border-red-900/30">
                                <td className="p-1 font-bold text-gray-700 border-r border-red-900/40">b</td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.b.i === 0 ? "" : qData.b.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, i: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={bLocked}
                                    title={bLocked ? "Locked: marks are entered for choice (a). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${bLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.b.ii === 0 ? "" : qData.b.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, ii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={bLocked}
                                    title={bLocked ? "Locked: marks are entered for choice (a). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${bLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.b.iii === 0 ? "" : qData.b.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, iii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={bLocked}
                                    title={bLocked ? "Locked: marks are entered for choice (a). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${bLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-red-100 text-red-950 font-black">
                        <tr>
                          <td colSpan={5} className="p-2 text-right uppercase text-[10px] border-r border-red-900/40">
                            Total (Part - B)
                          </td>
                          <td className="p-2 font-mono text-sm text-[#0B192C]">
                            {partBTotal}
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* PART - C (Question 16, choice a or b) */}
                <div className="border-2 border-red-900/60 rounded-xl overflow-hidden bg-white">
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                    PART - C (Question 16)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs divide-y divide-red-900/40">
                      <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="p-2 border-r border-red-900/40 w-16">Q. No</th>
                          <th className="p-2 border-r border-red-900/40 w-8">Sub</th>
                          <th className="p-2 border-r border-red-900/40 w-14">i</th>
                          <th className="p-2 border-r border-red-900/40 w-14">ii</th>
                          <th className="p-2 border-r border-red-900/40 w-14">iii</th>
                          <th className="p-2 border-r border-red-900/40">Q. Total</th>
                          <th className="p-2 w-12">CO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-900/30">
                        {[16].map((qNum) => {
                          const qData = partBCMarks[qNum];
                          const qTotal = calculateQTotal(qData);
                          // A question is answered as (a) OR (b): once one choice has marks, the other row is locked
                          const aHas = (Number(qData.a.i) || 0) + (Number(qData.a.ii) || 0) + (Number(qData.a.iii) || 0) > 0;
                          const bHas = (Number(qData.b.i) || 0) + (Number(qData.b.ii) || 0) + (Number(qData.b.iii) || 0) > 0;
                          const aLocked = bHas && !aHas;
                          const bLocked = aHas && !bHas;
                          return (
                            <React.Fragment key={qNum}>
                              {/* Sub-division a */}
                              <tr className="hover:bg-red-50/30">
                                <td
                                  rowSpan={2}
                                  className="p-2 font-extrabold text-red-900 border-r border-red-900/40 align-middle bg-red-50/20"
                                >
                                  {qNum}
                                </td>
                                <td className="p-1 font-bold text-gray-700 border-r border-red-900/40">a</td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.a.i === 0 ? "" : qData.a.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, i: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={aLocked}
                                    title={aLocked ? "Locked: marks are entered for choice (b). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${aLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.a.ii === 0 ? "" : qData.a.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, ii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={aLocked}
                                    title={aLocked ? "Locked: marks are entered for choice (b). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${aLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.a.iii === 0 ? "" : qData.a.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, iii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={aLocked}
                                    title={aLocked ? "Locked: marks are entered for choice (b). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${aLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td rowSpan={2} className="p-2 font-mono font-bold text-sm text-[#0B192C] align-middle bg-red-50/20 border-r border-red-900/40">
                                  {qTotal}
                                </td>
                                <td rowSpan={2} className="p-1.5 font-extrabold text-[10px] text-[#0B192C] bg-[#D4A72C]/15 align-middle">
                                  {partBCCo(assessmentType, qNum)}
                                </td>
                              </tr>

                              {/* Sub-division b */}
                              <tr className="hover:bg-red-50/30 border-b border-red-900/30">
                                <td className="p-1 font-bold text-gray-700 border-r border-red-900/40">b</td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.b.i === 0 ? "" : qData.b.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, i: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={bLocked}
                                    title={bLocked ? "Locked: marks are entered for choice (a). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${bLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.b.ii === 0 ? "" : qData.b.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, ii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={bLocked}
                                    title={bLocked ? "Locked: marks are entered for choice (a). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${bLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max="16"
                                    value={qData.b.iii === 0 ? "" : qData.b.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, iii: Math.min(16, Math.max(0, val)) },
                                        },
                                      });
                                    }}
                                    disabled={bLocked}
                                    title={bLocked ? "Locked: marks are entered for choice (a). Clear them to answer this choice instead." : undefined}
                                    className={`w-12 text-center font-bold py-0.5 rounded border ${bLocked ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-300 bg-[#FFFEFA]"}`}
                                  />
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-red-100 text-red-950 font-black">
                        <tr>
                          <td colSpan={5} className="p-2 text-right uppercase text-[10px] border-r border-red-900/40">
                            Total (Part - C)
                          </td>
                          <td className="p-2 font-mono text-sm text-[#0B192C]">
                            {partCTotal}
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                </div>
              </div>

              {/* Bottom Grand Total & Name of the Examiner Box */}
              <div className="border-2 border-red-900/60 rounded-xl p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-red-950 text-white px-4 py-3 rounded-xl text-center">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-red-200">
                      GRAND TOTAL (A + B + C)
                    </span>
                    <span className="font-mono font-black text-2xl text-[#D4A72C]">
                      {grandTotal} <span className="text-xs text-white/70">/ 100</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      Awarded Grade & Status
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2.5 py-0.5 rounded font-black text-xs bg-[#D4A72C]/20 text-[#0B192C] border border-[#D4A72C]">
                        Grade: {grandGrade}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded font-black text-xs ${
                          resultStatus === "PASS"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {resultStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Name of the Examiner (Changed from Signature of the Examiner) */}
                <div className="text-right text-xs">
                  <span className="text-[10px] uppercase font-extrabold text-red-900 block">
                    Name of the Examiner
                  </span>
                  <span className="font-bold text-sm text-[#0B192C] block mt-0.5">
                    {examinerName}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-600 block">
                    {examinerDesignation}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingStudent(selectedStudent);
                      setShowExaminerPrompt(true);
                    }}
                    className="text-[10px] font-bold text-[#B08014] hover:underline mt-1 inline-block"
                  >
                    Change Examiner Details
                  </button>
                </div>
              </div>
            </div>

            </fieldset>

            {/* Modal Bottom Buttons: Cancel & CONFIRM MARK */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowMarkEntryForm(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              >
                {viewOnly ? "Close" : "Cancel"}
              </button>

              <div className="flex items-center gap-3">
                {!viewOnly && (
                <button
                  type="button"
                  onClick={handleConfirmMark}
                  className="px-8 py-3 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-white font-black text-xs shadow-xl transition flex items-center gap-2 active:scale-95"
                >
                  <Save size={16} />
                  <span>CONFIRM MARK & SAVE</span>
                </button>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResultsValidation;
