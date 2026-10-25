import React, { useState, useEffect } from "react";
import { handleArrowNavigation } from "../utils/arrowNavigation";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { AnswerScriptPane } from "./AnswerScriptPane";
import { useSystemConfig } from "../utils/systemConfig";
import { partACo, partBCCo } from "../utils/coMapping";
import { fitSub, questionCap } from "../utils/markCaps";
import {
  Eye,
  Users,
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
  Send,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { apiErrorMessage, authApi, facultyApi, type FacultySubjectDTO } from "../services/api";
import { getRealLocalTimestamp } from "../utils/dateUtils";

export interface Department {
  key: string;
  name: string;
  code: string;
  headName?: string;
  totalStudents?: number;
  status?: "ACTIVE" | "INACTIVE";
}

export const getActiveFacultyCollege = (): string => {
  return localStorage.getItem("kvell_faculty_college") || "Engineering";
};

export const getScopedKey = (baseKey: string, college?: string): string => {
  const col = (college || getActiveFacultyCollege()).toLowerCase();
  if (col === "engineering") return baseKey;
  if (baseKey.startsWith("kvell_")) {
    return baseKey.replace(/^kvell_/, `kvell_${col}_`);
  }
  return `kvell_${col}_${baseKey}`;
};

export const clearFacultyPharmacyAndNursingData = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const lower = key.toLowerCase();
      if (
        (lower.includes("pharmacy") || lower.includes("nursing")) &&
        (lower.includes("marks") || lower.includes("batch") || lower.includes("student") || lower.includes("subject") || lower.includes("dept"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error("Error clearing pharmacy and nursing data", e);
  }
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
}

export interface FacultyMarkEntryProps {
  onToast?: (message: string) => void;
}

export const FacultyMarkEntry: React.FC<FacultyMarkEntryProps> = ({ onToast }) => {
  // The faculty member's department comes from their login; the server only allows that department.
  const me = authApi.currentUser();
  const ownDeptKey = me?.departmentKey || "";
  const ownDeptName = me?.departmentName || ownDeptKey.toUpperCase();

  // Gateways and locks set by the Super Admin, from the result server (which refuses locked saves itself)
  const systemConfig = useSystemConfig() as any;
  // The approval chain set by the Chief COE: Faculty -> [HOD] -> [Associate Dean] -> COE
  const chainSteps = [
    systemConfig?.markApproval?.hodApproval ? "HOD" : null,
    systemConfig?.markApproval?.deanApproval ? "Associate Dean" : null,
    "COE",
  ].filter(Boolean) as string[];
  const firstReviewer = chainSteps[0];
  const chainText = ["Faculty", ...chainSteps].join(" ➔ ");

  // The college comes from the faculty member's login (the server uses the same one)
  const activeColKey = String(me?.collegeKey || getActiveFacultyCollege()).toLowerCase();
  const facultyGateway = systemConfig?.gateways?.facultyMarkEntry;
  const deadline = facultyGateway?.submissionDeadline;
  const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;
  const isEmergencyLocked = systemConfig?.systemMode === "EMERGENCY_LOCK";
  const isCollegeLocked =
    systemConfig?.institutionalLocks?.[activeColKey]?.locked === true ||
    systemConfig?.institutionalLocks?.[activeColKey]?.freezeSubmissions === true;
  const isFacultyGatewayDisabled = facultyGateway?.enabled === false;
  const isFacultyPortalLocked =
    isEmergencyLocked || isFacultyGatewayDisabled || isDeadlinePassed || isCollegeLocked;

  const lockReason = isEmergencyLocked
    ? "EMERGENCY LOCKDOWN: Faculty evaluation portal is temporarily closed by University Controller of Examinations (Dr. Sathish)."
    : isFacultyGatewayDisabled
    ? (facultyGateway?.lockNotice || "Faculty Mark Evaluation Portal has been closed by the Controller of Examinations (Dr. Sathish).")
    : isDeadlinePassed
    ? `SUBMISSION DEADLINE EXPIRED: The evaluation deadline (${new Date(deadline!).toLocaleString()}) set by Dr. Sathish has passed. Marks submission is now auto-locked.`
    : isCollegeLocked
    ? `COLLEGE DATA FROZEN: Dr. Sathish (Super Admin) has frozen mark submissions and edits for ${activeColKey.toUpperCase()}.`
    : "";

  const allowInternal = facultyGateway ? facultyGateway.allowInternalMarkEdit !== false : true;
  const allowExternal = facultyGateway ? facultyGateway.allowExternalMarkEdit !== false : true;

  // Step 1: Target Selection State
  const [deptKey, setDeptKey] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  // IAT-1, IAT-2 and End Semester marks are kept separately; Mark Entry works on one at a time
  const [targetAssessment, setTargetAssessment] = useState<"" | "IAT-1" | "IAT-2" | "End Semester">("");
  const [customSubjectCode, setCustomSubjectCode] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  // Subjects of the department from the COE's subject catalog
  const [adminSubjects, setAdminSubjects] = useState<FacultySubjectDTO[]>([]);

  useEffect(() => {
    facultyApi
      .subjects()
      .then(setAdminSubjects)
      .catch((err) => setFeedback({ type: "error", message: apiErrorMessage(err, "Could not load your subjects.") }));
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
  const [saving, setSaving] = useState(false);

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

  const storedDepts: Department[] = ownDeptKey
    ? [{ key: ownDeptKey, name: ownDeptName, code: ownDeptKey.toUpperCase(), headName: "", totalStudents: 0, status: "ACTIVE" }]
    : [];
  const activeDept = storedDepts[0] || { name: "No department", subjects: [] };

  const availableSubjects: { code: string; title: string; source: "admin" | "catalog" }[] = React.useMemo(
    () =>
      adminSubjects
        .filter((s) => s.semester === semester)
        .map((s) => ({ code: s.code, title: s.title, source: "admin" as const })),
    [adminSubjects, semester]
  );

  // Keep subjectCode selected and valid
  useEffect(() => {
    if (subjectCode && !availableSubjects.some((s) => s.code === subjectCode)) {
      setSubjectCode("");
    }
  }, [availableSubjects, subjectCode]);

  const activeSubject = availableSubjects.find((s) => s.code === subjectCode);
  const effectiveSubjectCode = activeSubject?.code || "";
  const effectiveSubjectTitle = activeSubject?.title || "No subject in the catalog";

  // Forwarding / publication status of the selected subject, from the server
  const [batchStatusInfo, setBatchStatusInfo] = useState<{
    status: "DRAFT" | "VALIDATED" | "PUBLISHED" | "NOT_SAVED";
    batchId?: string;
    publishedAt?: string;
    publishedBy?: string;
    uploadedBy?: string;
    uploadDate?: string;
    changedAfterForward?: boolean;
    returnReason?: string;
  }>({ status: "NOT_SAVED" });

  const checkBatchStatus = React.useCallback(async () => {
    if (!effectiveSubjectCode || !targetAssessment) {
      setBatchStatusInfo({ status: "NOT_SAVED" });
      return;
    }
    try {
      const rows = await facultyApi.status(semester, targetAssessment);
      const row = rows.find((r) => r.subjectCode === effectiveSubjectCode);
      if (!row || row.state === "NO_MARKS" || row.state === "NOT_FORWARDED") {
        setBatchStatusInfo({ status: row && row.state === "NOT_FORWARDED" ? "DRAFT" : "NOT_SAVED" });
        return;
      }
      setBatchStatusInfo({
        status: row.state === "PUBLISHED" ? "PUBLISHED" : row.state === "FORWARDED" ? "VALIDATED" : "DRAFT",
        batchId: row.batchId ?? undefined,
        publishedAt: row.publishedAt ?? undefined,
        uploadedBy: row.forwardedBy ?? undefined,
        changedAfterForward: row.state === "OUT_OF_DATE",
        returnReason: row.state === "RETURNED" ? `${row.returnReason ?? ""} (${row.returnedBy ?? "reviewer"})` : undefined,
      });
    } catch {
      setBatchStatusInfo({ status: "NOT_SAVED" });
    }
  }, [semester, effectiveSubjectCode, targetAssessment]);

  useEffect(() => {
    checkBatchStatus();
  }, [checkBatchStatus]);

  const handleDeptChange = (newDept: string) => {
    // Faculty can only work in their own department (the only option besides "Choose department")
    setDeptKey(newDept === ownDeptKey ? ownDeptKey : "");
  };

  // FETCH DATA button action: the department's students with their marks for this subject
  const handleFetchData = async () => {
    if (!deptKey || !semester || !targetAssessment) {
      setFeedback({
        type: "error",
        message: !deptKey
          ? "Choose your department first."
          : !semester
          ? "Choose a semester first."
          : "Choose the assessment (IAT-1, IAT-2 or End Semester) first.",
      });
      return;
    }
    if (!effectiveSubjectCode) {
      setFeedback({
        type: "error",
        message: availableSubjects.length
          ? "Choose a subject first."
          : "No subjects found for your department. Ask the COE to add them on the Subjects page.",
      });
      return;
    }
    setIsFetching(true);
    try {
      const roster = await facultyApi.roster(semester, effectiveSubjectCode, targetAssessment);
      const formatted: StudentMarkData[] = roster.map((r) => ({ ...r, dob: r.dob || "" }));
      setStudents(formatted);
      setIsDataFetched(true);
      setSelectedStudent(null);
      setShowMarkEntryForm(false);
      const entered = formatted.filter((s) => s.hasMarks).length;
      const msg =
        formatted.length === 0
          ? `No students found for ${activeDept.name} • ${semester}. The COE uploads them on the Student Data page.`
          : `Loaded ${formatted.length} students for ${activeDept.name} • ${semester} • ${effectiveSubjectCode} (${entered} marked). Click any row to enter or edit marks.`;
      setFeedback({ type: formatted.length === 0 ? "error" : "success", message: msg });
      if (onToast && formatted.length > 0) onToast(msg);
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "Could not fetch the students.") });
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
  }, [semester, effectiveSubjectCode, targetAssessment]);

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
  const calculateQTotal = (q: QuestionBC, qNum = 11) => {
    const aTotal = (Number(q.a.i) || 0) + (Number(q.a.ii) || 0) + (Number(q.a.iii) || 0);
    const bTotal = (Number(q.b.i) || 0) + (Number(q.b.ii) || 0) + (Number(q.b.iii) || 0);
    return Math.min(questionCap(qNum), Math.max(aTotal, bTotal)); // the answered choice, never above the question's marks
  };

  const partBCTotal = Object.entries(partBCMarks).reduce((acc, [k, q]) => acc + calculateQTotal(q, Number(k)), 0);
  const partBTotal = [11, 12, 13, 14, 15].reduce((acc, q) => acc + calculateQTotal(partBCMarks[q], q), 0);
  const partCTotal = calculateQTotal(partBCMarks[16], 16);

  // Grand Total (A + B + C)
  const grandTotal = Math.min(100, Math.round(partATotal + partBCTotal));

  // Dynamic Statutory Grading based on Regulations configured by Dr. Sathish in Super Admin
  const collegeRegulation = systemConfig?.gradingRegulations?.[activeColKey] || {
    regulation: "Anna University CBCS",
    passMinInternal: 45,
    passMinExternal: 45,
    passMinTotal: 50,
  };
  const moderationConfig = systemConfig?.gradingRegulations?.moderation || {
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
    if (activeColKey === "nursing") {
      // Indian Nursing Council (INC) bands
      if (total >= 75) grade = "Distinction";
      else if (total >= 60) grade = "First Class";
      else if (total >= 50) grade = "Pass";
      else grade = "Fail";
    } else if (activeColKey === "pharmacy") {
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

  const calculateGrade = (total: number) => {
    if (total >= 90) return "O";
    if (total >= 80) return "A+";
    if (total >= 70) return "A";
    if (total >= 60) return "B+";
    if (total >= 50) return "B";
    if (total >= 45) return "C";
    return "F";
  };


  // The preview must match what the server saves: its grading is O>=90 ... C>=45, PASS at 45, no grace marks.
  // The Super Admin regulation settings (calculateDynamicGradeAndStatus) are not applied until the college confirms
  // its pass rules; until then they would show faculty a different result from the stored one.
  void calculateDynamicGradeAndStatus;
  const grandGrade = calculateGrade(grandTotal);
  const resultStatus: "PASS" | "FAIL" = grandTotal >= 45 ? "PASS" : "FAIL";
  const isGraceApplied = false;

  // CONFIRM MARK: saved on the server, which recomputes the totals and grade
  const handleConfirmMark = async () => {
    if (!selectedStudent || saving) return;
    if (isFacultyPortalLocked) {
      alert(lockReason || "Mark submission is locked by the Controller of Examinations.");
      return;
    }
    if (!assessmentType) {
      alert("Choose the assessment type (IAT-1, IAT-2 or End Semester) first.");
      return;
    }
    setSaving(true);
    try {
      const saved = await facultyApi.save({
        semester,
        subjectCode: effectiveSubjectCode,
        regNo: selectedStudent.regNo,
        assessmentType,
        partA: partAMarks.map((v) => Number(v) || 0),
        partBC: partBCMarks as any,
        examinerName: examinerName.trim(),
        examinerDesignation: examinerDesignation.trim(),
        expectedVersion: (selectedStudent as { version?: number }).version ?? 0,
      });
      const updated: StudentMarkData = { ...saved, dob: saved.dob || "" };
      setStudents((prev) => prev.map((s) => (s.regNo === updated.regNo ? updated : s)));
      setSelectedStudent(updated);
      const successMsg = `Marks saved for ${updated.name} (${updated.regNo}). Grand Total: ${updated.grandTotal}/100 [Grade ${updated.grade}]. Evaluator: ${examinerName}.`;
      setFeedback({ type: "success", message: successMsg });
      if (onToast) onToast(successMsg);
      setShowMarkEntryForm(false);
      checkBatchStatus();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not save the marks."));
    } finally {
      setSaving(false);
    }
  };

  // Forward the subject to the Controller of Examinations (COE) for verification & official publication
  const handleForwardToCOE = async () => {
    if (isFacultyPortalLocked) {
      alert(lockReason || "Marks submission is locked by the Controller of Examinations.");
      return;
    }
    const entered = students.filter((s) => s.hasMarks).length;
    if (entered === 0) {
      alert("Please enter marks for at least one student before forwarding to COE.");
      return;
    }
    if (
      entered < students.length &&
      !window.confirm(
        `Only ${entered} of ${students.length} students have marks. The COE cannot publish until every student has marks.\n\nForward anyway?`
      )
    )
      return;
    try {
      if (!academicYear) {
        setFeedback({ type: "error", message: "Choose the academic year before forwarding." });
        return;
      }
      if (!targetAssessment) {
        setFeedback({ type: "error", message: "Choose the assessment before forwarding." });
        return;
      }
      const batch = await facultyApi.forward({
        semester,
        subjectCode: effectiveSubjectCode,
        academicYear,
        assessmentType: targetAssessment,
      });
      await checkBatchStatus();
      const successMsg = `Forwarded marks of ${batch.totalStudents} students in ${effectiveSubjectCode} to the Controller of Examinations for verification (${targetAssessment}). Awaiting COE publication.`;
      setFeedback({ type: "success", message: successMsg });
      if (onToast) onToast(successMsg);
    } catch (err) {
      setFeedback({ type: "error", message: apiErrorMessage(err, "Failed to forward marks to COE.") });
    }
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto">
      {/* Super Admin Lock Alert */}
      {isFacultyPortalLocked && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-950 flex items-start gap-3 shadow-md">
          <ShieldAlert size={22} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-red-950 flex items-center gap-2">
              <span>Evaluation Portal Locked by University Controller of Examinations (Dr. Sathish)</span>
              <span className="text-[10px] bg-red-200 text-red-900 font-black px-2 py-0.5 rounded-full uppercase">
                COE Directive
              </span>
            </h4>
            <p className="text-xs text-red-800 mt-1 font-medium">
              {lockReason}
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white text-[#0B192C] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            FACULTY PORTAL • MARK ENTRY ({chainText.toUpperCase()})
          </span>
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <PenLine className="text-[#D4A72C]" size={26} />
            Student Mark Entry &amp; Paper Evaluation
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Select target department, semester, and subject code, then click <strong>"FETCH DATA"</strong> to retrieve students and enter paper marks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isDataFetched && students.some((s) => s.hasMarks) && (
            <>
              {batchStatusInfo.status === "PUBLISHED" ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs shadow">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>PUBLISHED BY THE CONTROLLER OF EXAMINATIONS</span>
                </div>
              ) : batchStatusInfo.status === "VALIDATED" ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs shadow">
                    <Clock size={15} className="text-amber-400 shrink-0 animate-pulse" />
                    <span>FORWARDED: WAITING FOR {chainSteps.join(" ➔ ").toUpperCase()}</span>
                  </div>
                  <button
                    onClick={handleForwardToCOE}
                    className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] font-extrabold text-xs transition shadow flex items-center gap-2 active:scale-95"
                    title={`Forward the updated marks again (${chainText})`}
                  >
                    <Send size={14} /> Forward again to {firstReviewer}
                  </button>
                </div>
              ) : (
                <>
                {batchStatusInfo.returnReason && (
                  <div className="max-w-xs px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-100 text-[11px] font-bold">
                    Returned for correction: {batchStatusInfo.returnReason}
                  </div>
                )}
                <button
                  onClick={handleForwardToCOE}
                  className="px-5 py-3 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-[#0B192C] font-extrabold text-xs transition shadow flex items-center gap-2 active:scale-95"
                  title={`Approval chain set by the Chief COE: ${chainText}`}
                >
                  <Send size={16} /> Forward Marks to {firstReviewer}
                </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Institutional Governance & RBAC Notice */}
      <div className="p-4 rounded-2xl bg-[#0B192C]/5 border border-[#0B192C]/15 flex items-start gap-3.5 text-xs text-[#0B192C]">
        <div className="w-8 h-8 rounded-lg bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <ShieldCheck size={18} />
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2 font-bold">
            <span className="uppercase tracking-wider text-[11px] text-[#8A6410]">Institutional Role-Based Governance</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 font-medium text-[11px]">Port 3000 Faculty Evaluation Terminal</span>
          </div>
          <p className="text-gray-700 leading-relaxed text-[11px]">
            <strong>Faculty Scope:</strong> Faculty members evaluate student answer scripts and can only <strong>forward batches to the Controller of Examinations (COE) for verification</strong>. 
            <strong className="text-[#0B192C] ml-1">COE Exclusive Authority:</strong> Only the Controller of Examinations (Port 3002) is authorized to verify and <strong>officially publish results</strong> for student transcript generation.
          </p>
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

      {/* 1. Target Selection Card with FETCH DATA Button */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-6">
        <div className="border-b border-[#E5E1D8] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              1. Select Target Department, Semester &amp; Subject Code
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
              <option value="">Choose department</option>
              {storedDepts.length > 0 ? (
                storedDepts.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.name} ({d.code})
                  </option>
                ))
              ) : null}
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
              <option value="2025 - 2026">2025 - 2026</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-gray-700 uppercase">
                Subject Code
              </label>
              <button
                type="button"
                onClick={() => setIsCustomSubject(!isCustomSubject)}
                className="text-[10px] text-[#8A6410] font-bold hover:underline"
              >
                {isCustomSubject ? "Pick from Catalog" : "+ Custom Code"}
              </button>
            </div>

            {isCustomSubject ? (
              <input
                type="text"
                value={customSubjectCode}
                onChange={(e) => setCustomSubjectCode(e.target.value.toUpperCase())}
                placeholder="e.g. UC26C01T"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
              />
            ) : (
              <select
                value={subjectCode}
                onChange={(e) => {
                  setSubjectCode(e.target.value);
                  setIsDataFetched(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
              >
                <option value="">{availableSubjects.length ? "Choose subject" : "Choose subject (none added yet)"}</option>
                {availableSubjects.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code} - {sub.title} {sub.source === "admin" ? "★ (Curriculum)" : ""}
                  </option>
                ))}
              </select>
            )}
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
            <strong className="text-[#8A6410]">{effectiveSubjectCode} ({effectiveSubjectTitle})</strong>
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
            <Database size={26} className="text-[#8A6410]" />
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
                Click on a student row to select, then click <strong>"ENTER MARK"</strong> (or <strong>"EDIT MARK"</strong> if marks exist) above. Use <strong>View</strong> to see saved marks.
              </p>
            </div>

            {/* ENTER MARK Button: Prominently displayed when student is clicked */}
            {selectedStudent && (
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
                  <th className="p-3.5">Dummy Number</th>
                  <th className="p-3.5">Answer Script</th>
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
                          batchStatusInfo.status === "PUBLISHED" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 size={11} /> PUBLISHED BY COE ({student.grade})
                            </span>
                          ) : batchStatusInfo.status === "VALIDATED" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <Clock size={11} /> FORWARDED TO COE ({student.grade})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
                              <PenLine size={11} /> MARKS ENTERED ({student.grade})
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-300">
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
                {students.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users size={32} className="text-slate-300" />
                        <p className="font-bold text-sm text-[#0B192C]">No Students or Course Batches Registered</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          There are currently no students registered or marks pending for this department and semester.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
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
                    "Assistant Professor",
                    "Associate Professor & Course Incharge",
                    "Professor & Subject Head",
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
                  <span className="font-mono text-xs font-bold text-[#8A6410] bg-white px-2 py-0.5 rounded border border-gray-200">
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

      {/* Step 3: Authentic Examination Mark Entry Form Modal */}
      {showMarkEntryForm && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          {/* Split view: the student's scanned answer script beside the marks form */}
          <div className="w-full max-w-[1600px] my-auto flex flex-col lg:flex-row gap-4">
          <AnswerScriptPane
            scriptKey={`${selectedStudent.regNo}|${effectiveSubjectCode}|${assessmentType}`}
            label={`${selectedStudent.regNo} • ${effectiveSubjectCode} • ${assessmentType}`}
            prompt={assessmentType ? undefined : "Choose the assessment (IAT-1, IAT-2 or End Semester) to see the answer script."}
            fetchPdf={() => facultyApi.answerScript({ semester, subject: effectiveSubjectCode, regNo: selectedStudent.regNo, assessment: assessmentType })}
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
                <span className="text-xs font-mono font-bold text-[#8A6410]">
                  DUMMY NO: {selectedStudent.regNo}
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
            {/* University Paper Sheet Header */}
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
                </div>

                {/* Center: Karpaga Vinayaga Banner Logo */}
                <div className="w-full md:flex-1 flex flex-col items-center justify-center text-center px-2">
                  <img
                    src="/karpaga-vinayaga-banner.png"
                    alt="Karpaga Vinayaga Educational Lore for Learning - Deemed To Be University"
                    className="h-16 sm:h-20 w-auto object-contain"
                  />
                  <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-widest mt-1">
                    Karpaga Vinayaga College of Engineering &amp; Technology
                  </span>
                </div>

                {/* Rightmost: Kyro Elephant Mascot */}
                <div className="w-full md:w-1/4 flex items-center justify-center md:justify-end">
                  <img
                    src="/kyro-crossed.png"
                    alt="Kyro Mascot"
                    className="h-24 sm:h-28 w-auto object-contain transition-transform duration-200 hover:scale-105"
                  />
                </div>
              </div>

              {/* Header Details Grid */}
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

              {/* Main Evaluation Grid: PART A and PART B + C side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2">
                {/* PART - A (Questions 1 to 10): stretches to the height of Part B + Part C beside it */}
                <div className="lg:col-span-4 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white flex flex-col">
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider flex items-center justify-center gap-2">
                    <span>PART - A (Max 20)</span>
                    {!allowInternal && (
                      <span className="bg-amber-400 text-[#0B192C] text-[9px] px-1.5 py-0.5 rounded font-black">
                        LOCKED BY COE
                      </span>
                    )}
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
                              disabled={isFacultyPortalLocked || !allowInternal}
                              value={mark === 0 ? "" : mark}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = [...partAMarks];
                                updated[i] = isNaN(val) ? 0 : Math.min(2, Math.max(0, val));
                                setPartAMarks(updated);
                              }}
                              className={`w-14 text-center font-bold px-1.5 py-1 rounded border border-gray-300 bg-[#FFFEFA] focus:ring-1 focus:ring-red-900 ${
                                isFacultyPortalLocked || !allowInternal
                                  ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                  : ""
                              }`}
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
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider flex items-center justify-center gap-2">
                    <span>PART - B (Questions 11 - 15)</span>
                    {!allowExternal && (
                      <span className="bg-amber-400 text-[#0B192C] text-[9px] px-1.5 py-0.5 rounded font-black">
                        LOCKED BY COE
                      </span>
                    )}
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
                          const qTotal = calculateQTotal(qData, qNum);
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
                                    max={qNum === 16 ? 15 : 13}
                                    disabled={isFacultyPortalLocked || !allowExternal}
                                    value={qData.a.i === 0 ? "" : qData.a.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, i: fitSub(qData.a, "i", val, qNum) },
                                        },
                                      });
                                    }}
                                    className={`w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] ${
                                      isFacultyPortalLocked || !allowExternal
                                        ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                        : ""
                                    }`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    disabled={isFacultyPortalLocked || !allowExternal}
                                    value={qData.a.ii === 0 ? "" : qData.a.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, ii: fitSub(qData.a, "ii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className={`w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] ${
                                      isFacultyPortalLocked || !allowExternal
                                        ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                        : ""
                                    }`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    disabled={isFacultyPortalLocked || !allowExternal}
                                    value={qData.a.iii === 0 ? "" : qData.a.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, iii: fitSub(qData.a, "iii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className={`w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] ${
                                      isFacultyPortalLocked || !allowExternal
                                        ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                        : ""
                                    }`}
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
                                    max={qNum === 16 ? 15 : 13}
                                    disabled={isFacultyPortalLocked || !allowExternal}
                                    value={qData.b.i === 0 ? "" : qData.b.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, i: fitSub(qData.b, "i", val, qNum) },
                                        },
                                      });
                                    }}
                                    className={`w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] ${
                                      isFacultyPortalLocked || !allowExternal
                                        ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                        : ""
                                    }`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    disabled={isFacultyPortalLocked || !allowExternal}
                                    value={qData.b.ii === 0 ? "" : qData.b.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, ii: fitSub(qData.b, "ii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className={`w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] ${
                                      isFacultyPortalLocked || !allowExternal
                                        ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                        : ""
                                    }`}
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    disabled={isFacultyPortalLocked || !allowExternal}
                                    value={qData.b.iii === 0 ? "" : qData.b.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, iii: fitSub(qData.b, "iii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className={`w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] ${
                                      isFacultyPortalLocked || !allowExternal
                                        ? "bg-slate-100 cursor-not-allowed opacity-60 text-slate-500"
                                        : ""
                                    }`}
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
                          const qTotal = calculateQTotal(qData, qNum);
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
                                    max={qNum === 16 ? 15 : 13}
                                    value={qData.a.i === 0 ? "" : qData.a.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, i: fitSub(qData.a, "i", val, qNum) },
                                        },
                                      });
                                    }}
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    value={qData.a.ii === 0 ? "" : qData.a.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, ii: fitSub(qData.a, "ii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    value={qData.a.iii === 0 ? "" : qData.a.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          a: { ...qData.a, iii: fitSub(qData.a, "iii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
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
                                    max={qNum === 16 ? 15 : 13}
                                    value={qData.b.i === 0 ? "" : qData.b.i}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, i: fitSub(qData.b, "i", val, qNum) },
                                        },
                                      });
                                    }}
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    value={qData.b.ii === 0 ? "" : qData.b.ii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, ii: fitSub(qData.b, "ii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
                                  />
                                </td>
                                <td className="p-1 border-r border-red-900/40">
                                  <input
                                    type="number"
                                    min="0"
                                    max={qNum === 16 ? 15 : 13}
                                    value={qData.b.iii === 0 ? "" : qData.b.iii}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      setPartBCMarks({
                                        ...partBCMarks,
                                        [qNum]: {
                                          ...qData,
                                          b: { ...qData.b, iii: fitSub(qData.b, "iii", val, qNum) },
                                        },
                                      });
                                    }}
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
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
                      Awarded Grade &amp; Status
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

                {/* Name of the Examiner */}
                <div className="text-right text-xs">
                  <span className="text-[10px] uppercase font-extrabold text-red-900 block">
                    Name of the Examiner
                  </span>
                  <span className="font-bold text-sm text-[#0B192C] block mt-0.5">
                    {examinerName || "Pending Evaluator Signature"}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-600 block">
                    {examinerDesignation || "Official Examination Evaluator"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingStudent(selectedStudent);
                      setShowExaminerPrompt(true);
                    }}
                    className="text-[10px] font-bold text-[#8A6410] hover:underline mt-1 inline-block"
                  >
                    Change Examiner Details
                  </button>
                </div>
              </div>
            </div>

            </fieldset>

            {/* Modal Bottom Buttons: Cancel & CONFIRM MARK */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <ShieldCheck size={14} className="text-[#2E7D5B]" />
                <span>Marks will be saved to evaluation roster and ready to forward to COE for verification.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMarkEntryForm(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                >
                  {viewOnly ? "Close" : "Cancel"}
                </button>

                {!viewOnly && (
                <button
                  type="button"
                  onClick={handleConfirmMark}
                  className="px-8 py-3 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-white font-black text-xs shadow-xl transition flex items-center gap-2 active:scale-95"
                >
                  <Save size={16} />
                  <span>CONFIRM MARK &amp; SAVE</span>
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

export default FacultyMarkEntry;
