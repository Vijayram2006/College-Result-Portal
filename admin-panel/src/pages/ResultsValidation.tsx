import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
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
} from "lucide-react";
import { adminResultsApi, ResultBatchRecord, ResultRecordItem, addAuditLog } from "../services/api";
import { getRealLocalTimestamp } from "../utils/dateUtils";

// Department & Subject Catalog (Includes AIDS & MA8201 from examination paper)
const departmentCatalog: Record<string, { name: string; subjects: { code: string; title: string }[] }> = {
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
  it: {
    name: "Information Technology",
    subjects: [
      { code: "IT301", title: "Web Technologies & Frameworks" },
      { code: "IT302", title: "Computer Networks & Protocols" },
      { code: "IT501", title: "Software Engineering & Agile" },
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
  it: [
    { regNo: "KVELL2025IT001", name: "Harish Kumar", dob: "2004-08-16" },
    { regNo: "KVELL2025IT002", name: "Lavanya Natarajan", dob: "2004-11-23" },
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
}

export const ResultsValidation: React.FC = () => {
  const [, navigate] = useLocation();

  // Step 1: Target Selection State
  const [deptKey, setDeptKey] = useState("aids");
  const [semester, setSemester] = useState("Semester I");
  const [academicYear, setAcademicYear] = useState("2026 - 2027");
  const [subjectCode, setSubjectCode] = useState("MA8201");
  const [customSubjectCode, setCustomSubjectCode] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  // Synchronize Subjects from Subjects component (localStorage kvell_admin_subjects)
  const [adminSubjects, setAdminSubjects] = useState<
    { id?: string; code: string; title: string; department?: string; category?: string; semester?: string; academicYear?: string }[]
  >(() => {
    try {
      const saved = localStorage.getItem("kvell_admin_subjects");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const syncSubjects = () => {
      try {
        const saved = localStorage.getItem("kvell_admin_subjects");
        if (saved) {
          setAdminSubjects(JSON.parse(saved));
        } else {
          setAdminSubjects([]);
        }
      } catch {}
    };
    window.addEventListener("kvell_subjects_updated", syncSubjects);
    window.addEventListener("storage", syncSubjects);
    return () => {
      window.removeEventListener("kvell_subjects_updated", syncSubjects);
      window.removeEventListener("storage", syncSubjects);
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
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Form Assessment Metadata
  const [assessmentType, setAssessmentType] = useState<"IAT-1" | "IAT-2" | "End Semester">("IAT-1");
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

  // Active Department and Available Subjects (Combining Admin Subjects with Department Catalog)
  const activeDept = departmentCatalog[deptKey] || departmentCatalog.aids;

  const deptKeyToName: Record<string, string> = {
    aids: "Artificial Intelligence & Data Science",
    cse: "Computer Science & Engineering",
    ece: "Electronics & Communication",
    mech: "Mechanical Engineering",
    eee: "Electrical & Electronics",
    it: "Information Technology",
  };

  const availableSubjects: { code: string; title: string; source: "admin" | "catalog" }[] = React.useMemo(() => {
    const list: { code: string; title: string; source: "admin" | "catalog" }[] = [];
    const seen = new Set<string>();

    const activeDeptTitle = (deptKeyToName[deptKey] || activeDept.name || "").toLowerCase().trim();
    const k = deptKey.toLowerCase().trim();

    // 1. Department-matching subjects added in the Subjects component
    const matchedAdmin = adminSubjects.filter((s) => {
      const subDept = (s.department || "").toLowerCase().trim();
      return subDept === k || subDept === activeDeptTitle || subDept.includes(k) || activeDeptTitle.includes(subDept);
    });

    matchedAdmin.forEach((sub) => {
      const c = (sub.code || "").trim().toUpperCase();
      if (c && !seen.has(c)) {
        seen.add(c);
        list.push({ code: c, title: sub.title || sub.code, source: "admin" });
      }
    });

    // 2. If no matching subjects for this dept, include other added admin subjects
    if (matchedAdmin.length === 0 && adminSubjects.length > 0) {
      adminSubjects.forEach((sub) => {
        const c = (sub.code || "").trim().toUpperCase();
        if (c && !seen.has(c)) {
          seen.add(c);
          list.push({ code: c, title: sub.title || sub.code, source: "admin" });
        }
      });
    }

    // 3. Fallback catalog subjects
    (activeDept.subjects || []).forEach((sub) => {
      const c = (sub.code || "").trim().toUpperCase();
      if (c && !seen.has(c)) {
        seen.add(c);
        list.push({ code: c, title: sub.title, source: "catalog" });
      }
    });

    return list.length > 0 ? list : [{ code: "MA8201", title: "Matrices and Calculus", source: "catalog" }];
  }, [deptKey, adminSubjects, activeDept]);

  // Keep subjectCode selected and valid
  useEffect(() => {
    if (!isCustomSubject && availableSubjects.length > 0) {
      const exists = availableSubjects.some((s) => s.code === subjectCode);
      if (!exists) {
        setSubjectCode(availableSubjects[0].code);
      }
    }
  }, [availableSubjects, isCustomSubject, subjectCode]);

  const activeSubject =
    availableSubjects.find((s) => s.code === (isCustomSubject ? customSubjectCode : subjectCode)) ||
    availableSubjects[0];
  const effectiveSubjectCode = isCustomSubject ? customSubjectCode.trim().toUpperCase() || "MA8201" : subjectCode;
  const effectiveSubjectTitle = activeSubject?.title || "Matrices and Calculus";

  // Check if target was passed via sessionStorage from Step 1 (Student Data)
  useEffect(() => {
    const metaRaw = sessionStorage.getItem("kvell_upload_meta");
    if (metaRaw) {
      try {
        const meta = JSON.parse(metaRaw);
        if (meta.deptKey && departmentCatalog[meta.deptKey]) {
          setDeptKey(meta.deptKey);
        }
        if (meta.semester) setSemester("Semester I");
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

  // FETCH DATA button action
  const handleFetchData = () => {
    setIsFetching(true);
    setTimeout(() => {
      // 1. Check if uploaded spreadsheet exists in sessionStorage
      const rawUpload = sessionStorage.getItem("kvell_uploaded_results");
      let candidateList: { regNo: string; name: string; dob: string; category?: "regular" | "lateral" }[] = [];

      if (rawUpload) {
        try {
          const parsed = JSON.parse(rawUpload);
          if (Array.isArray(parsed) && parsed.length > 0) {
            candidateList = parsed.map((p, idx) => ({
              regNo: String(p["Register Number"] || p.regNo || `202601102260${20 + idx}`).trim().toUpperCase(),
              name: String(p["Name"] || p.studentName || `Candidate ${idx + 1}`).trim(),
              dob: p["DOB"] || p.dob || "2004-05-14",
              category: String(p["Category"] || p.category || "regular").toLowerCase().includes("lateral")
                ? "lateral"
                : "regular",
            }));
          }
        } catch (e) {
          console.error(e);
        }
      }

      // If no session upload or different department, fallback to department registry
      if (candidateList.length === 0) {
        candidateList = (baseStudentsByDept[deptKey] || baseStudentsByDept.aids).map((s) => ({
          ...s,
          category: "regular" as const,
        }));
      }

      // Universal sorting: Regular first, Lateral at the end only, sorted by numeric Reg No
      candidateList.sort((a, b) => {
        const isLatA = (a.category || "regular") === "lateral";
        const isLatB = (b.category || "regular") === "lateral";
        if (isLatA !== isLatB) return isLatA ? 1 : -1;
        return a.regNo.localeCompare(b.regNo, undefined, { numeric: true, sensitivity: "base" });
      });

      // Check saved marks from localStorage for this department & subject
      const storageKey = `kvell_marks_${deptKey}_${semester}_${effectiveSubjectCode}`;
      let savedMarksMap: Record<string, any> = {};
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) savedMarksMap = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }

      const formatted: StudentMarkData[] = candidateList.map((c) => {
        const existing = savedMarksMap[c.regNo];
        if (existing) {
          return {
            ...c,
            hasMarks: true,
            partATotal: existing.partATotal,
            partBCTotal: existing.partBCTotal,
            grandTotal: existing.grandTotal,
            grade: existing.grade,
            resultStatus: existing.resultStatus,
            partA: existing.partA || Array(10).fill(0),
            partBC: existing.partBC || initialPartBC,
          };
        }
        return {
          ...c,
          hasMarks: false,
          partATotal: 0,
          partBCTotal: 0,
          grandTotal: 0,
          grade: "—",
          resultStatus: "FAIL",
          partA: Array(10).fill(0),
          partBC: initialPartBC,
        };
      });

      setStudents(formatted);
      setIsDataFetched(true);
      setIsFetching(false);
      setSelectedStudent(null);
      setShowMarkEntryForm(false);
      setFeedback({
        type: "success",
        message: `Fetched ${formatted.length} student records for ${activeDept.name} • ${semester} • ${effectiveSubjectCode}. Click a student name to enter marks.`,
      });
    }, 400);
  };

  // Initiate mark entry: prompt examiner name & designation first (fields start empty)
  const handleInitiateMarkEntry = (student: StudentMarkData) => {
    setPendingStudent(student);
    setSelectedStudent(student);
    setExaminerName("");
    setExaminerDesignation("");
    setShowExaminerPrompt(true);
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
    } else {
      // Default clean marksheet
      setPartAMarks(Array(10).fill(0));
      setPartBCMarks(JSON.parse(JSON.stringify(initialPartBC)));
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

  // Grand Total (A + B + C)
  const grandTotal = Math.min(100, Math.round(partATotal + partBCTotal));

  // Letter Grade
  const calculateGrade = (total: number) => {
    if (total >= 90) return "O";
    if (total >= 80) return "A+";
    if (total >= 70) return "A";
    if (total >= 60) return "B+";
    if (total >= 50) return "B";
    if (total >= 40) return "C";
    return "F";
  };

  const grandGrade = calculateGrade(grandTotal);
  const resultStatus = grandTotal >= 40 ? "PASS" : "FAIL";

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

  // CONFIRM MARK button action
  const handleConfirmMark = () => {
    if (!selectedStudent) return;

    const updatedStudent: StudentMarkData = {
      ...selectedStudent,
      hasMarks: true,
      partATotal,
      partBCTotal,
      grandTotal,
      grade: grandGrade,
      resultStatus,
      partA: [...partAMarks],
      partBC: JSON.parse(JSON.stringify(partBCMarks)),
      assessmentType,
      deptKey,
      deptName: activeDept.name,
      semester,
      subjectCode: effectiveSubjectCode,
      subjectTitle: effectiveSubjectTitle,
    };

    // Update students state
    const newStudents = students.map((s) => (s.regNo === selectedStudent.regNo ? updatedStudent : s));
    setStudents(newStudents);
    setSelectedStudent(updatedStudent);

    // Persist to localStorage
    const storageKey = `kvell_marks_${deptKey}_${semester}_${effectiveSubjectCode}`;
    let savedMarksMap: Record<string, any> = {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) savedMarksMap = JSON.parse(saved);
      savedMarksMap[selectedStudent.regNo] = updatedStudent;
      localStorage.setItem(storageKey, JSON.stringify(savedMarksMap));
      window.dispatchEvent(new Event("kvell_marks_updated"));
    } catch (e) {
      console.error(e);
    }

    addAuditLog({
      action: "ENTERED_STUDENT_MARKS",
      target: `${selectedStudent.regNo} (${selectedStudent.name})`,
      timestamp: getRealLocalTimestamp(),
      description: `Entered official examination marks for candidate ${selectedStudent.name} (${selectedStudent.regNo}) in ${effectiveSubjectCode} ${effectiveSubjectTitle}: Total ${grandTotal}/100, Grade ${grandGrade} (${resultStatus}). Evaluated by ${examinerName} (${examinerDesignation}).`,
    });

    setFeedback({
      type: "success",
      message: `Marks successfully confirmed & saved for ${selectedStudent.name} (${selectedStudent.regNo})! Grand Total: ${grandTotal}/100 [Grade ${grandGrade}]. Evaluator: ${examinerName}.`,
    });

    setShowMarkEntryForm(false);
  };

  // Publish / Commit All Entered Marks
  const handleCommitBatch = async () => {
    const entered = students.filter((s) => s.hasMarks);
    if (entered.length === 0) {
      alert("Please enter marks for at least one student before publishing batch.");
      return;
    }

    const totalStudents = entered.length;
    const passedStudents = entered.filter((s) => s.resultStatus === "PASS").length;
    const passPercentage = Number(((passedStudents / totalStudents) * 100).toFixed(1));

    const records: ResultRecordItem[] = entered.map((s) => ({
      regNo: s.regNo,
      studentName: s.name,
      dob: s.dob,
      deptKey,
      courseCode: effectiveSubjectCode,
      courseTitle: effectiveSubjectTitle,
      semester,
      internalMarks: s.partATotal,
      externalMarks: s.partBCTotal,
      totalMarks: s.grandTotal,
      grade: s.grade,
      gradePoints: s.grade === "O" ? 10 : s.grade === "A+" ? 9 : s.grade === "A" ? 8 : s.grade === "B+" ? 7 : s.grade === "B" ? 6 : s.grade === "C" ? 5 : 0,
      resultStatus: s.resultStatus,
    }));

    const batchId = `RES-${Date.now().toString().slice(-4)}-${deptKey.toUpperCase()}-${effectiveSubjectCode}`;
    const newBatch: ResultBatchRecord = {
      id: batchId,
      batchTitle: `${effectiveSubjectCode} ${semester} Examinations (${activeDept.name})`,
      departmentKey: deptKey,
      departmentName: activeDept.name,
      semester,
      academicYear,
      examMonthYear: "Nov / Dec 2026",
      uploadDate: getRealLocalTimestamp(),
      uploadedBy: `${examinerName} (${examinerDesignation})`,
      totalStudents,
      passedStudents,
      passPercentage,
      publicationStatus: "PUBLISHED",
      records,
    };

    try {
      await adminResultsApi.createResultBatch(newBatch);
      window.dispatchEvent(new Event("kvell_marks_updated"));
      addAuditLog({
        action: "COMMITTED_MARK_BATCH",
        target: `${newBatch.id} (${newBatch.batchTitle})`,
        timestamp: getRealLocalTimestamp(),
        description: `Committed and published marks for ${totalStudents} students in ${effectiveSubjectCode} ${effectiveSubjectTitle}. Pass rate: ${passPercentage}%. Evaluated by ${examinerName}.`,
      });
      alert(`Successfully published marks for ${totalStudents} students to the Published Results Hub!`);
      navigate("/admin/results/published");
    } catch (err) {
      console.error(err);
      alert("Failed to commit result batch. Please try again.");
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            STEP 2 OF 3 • EXAMINATION MARK ENTRY HUB
          </span>
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <PenLine className="text-[#D4A72C]" size={26} />
            Student Mark Entry
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Select target department, semester, and subject code, then click <strong>"FETCH DATA"</strong> to retrieve students and enter paper marks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDataFetched && students.some((s) => s.hasMarks) && (
            <button
              onClick={handleCommitBatch}
              className="px-5 py-3 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow flex items-center gap-2"
            >
              <Globe size={16} /> Publish & Commit All Marks
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
          <span className="px-3 py-1 rounded-full bg-[#D4A72C]/20 text-[#0B192C] font-extrabold text-[10px] uppercase w-fit">
            MANDATORY BATCH MAPPING
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Department
            </label>
            <select
              value={deptKey}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="aids">Artificial Intelligence & Data Science (AIDS)</option>
              <option value="cse">Computer Science & Engineering (CSE)</option>
              <option value="ece">Electronics & Communication (ECE)</option>
              <option value="mech">Mechanical Engineering (MECH)</option>
              <option value="eee">Electrical & Electronics (EEE)</option>
              <option value="it">Information Technology (IT)</option>
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
              <option value="Semester I">Semester I</option>
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
              <option value="2026 - 2027">2026 - 2027</option>
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
                className="text-[10px] text-[#B08014] font-bold hover:underline"
              >
                {isCustomSubject ? "Pick from Catalog" : "+ Custom Code"}
              </button>
            </div>

            {isCustomSubject ? (
              <input
                type="text"
                value={customSubjectCode}
                onChange={(e) => setCustomSubjectCode(e.target.value.toUpperCase())}
                placeholder="e.g. MA8201"
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
                {availableSubjects.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code} - {sub.title} {sub.source === "admin" ? "★ (COE Catalog)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Action Row with FETCH DATA Button */}
        <div className="pt-4 border-t border-[#E5E1D8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500">
            Selected: <strong className="text-[#0B192C]">{activeDept.name}</strong> •{" "}
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
                Click on a student row to select, then click <strong>"ENTER MARK"</strong> to open the evaluation marksheet.
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
                  <span>ENTER MARK FOR {selectedStudent.name}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Student List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateMarkEntry(student);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#0B192C] text-white shadow"
                              : "bg-gray-100 text-gray-800 hover:bg-[#0B192C] hover:text-white"
                          }`}
                        >
                          <PenLine size={13} />
                          <span>{student.hasMarks ? "Edit Mark" : "Enter Mark"}</span>
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-[#E5E1D8] shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Top Modal Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#0B192C] text-white text-[10px] font-extrabold uppercase tracking-wider">
                  OFFICIAL EVALUATION SCRIPT
                </span>
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
                        onClick={() => setAssessmentType(type)}
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
                {/* PART - A (Questions 1 to 10) */}
                <div className="lg:col-span-4 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white">
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                    PART - A (Max 20)
                  </div>
                  <table className="w-full text-center text-xs divide-y divide-red-900/40">
                    <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border-r border-red-900/40 w-1/2">Question Number</th>
                        <th className="p-2 w-1/2">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/30">
                      {partAMarks.map((mark, i) => (
                        <tr key={i} className="hover:bg-red-50/40">
                          <td className="p-1.5 font-extrabold text-red-900 border-r border-red-900/40">
                            {i + 1}
                          </td>
                          <td className="p-1.5">
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
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-red-100 text-red-950 font-black">
                      <tr>
                        <td className="p-2 border-r border-red-900/40 uppercase text-[10px]">
                          Total (Part - A)
                        </td>
                        <td className="p-2 font-mono text-sm text-[#0B192C]">
                          {partATotal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* PART - B + C (Questions 11 to 16 with subdivisions a & b) */}
                <div className="lg:col-span-8 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white">
                  <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                    PART - B + C (Max 80)
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
                          <th className="p-2">Q. Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-900/30">
                        {[11, 12, 13, 14, 15, 16].map((qNum) => {
                          const qData = partBCMarks[qNum];
                          const qTotal = calculateQTotal(qData);
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
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
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
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
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
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
                                  />
                                </td>
                                <td rowSpan={2} className="p-2 font-mono font-bold text-sm text-[#0B192C] align-middle bg-red-50/20">
                                  {qTotal}
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
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
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
                                    className="w-12 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA]"
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
                            Total (Part - B + C)
                          </td>
                          <td className="p-2 font-mono text-sm text-[#0B192C]">
                            {partBCTotal}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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

            {/* Modal Bottom Buttons: Cancel & CONFIRM MARK */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowMarkEntryForm(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmMark}
                  className="px-8 py-3 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-white font-black text-xs shadow-xl transition flex items-center gap-2 active:scale-95"
                >
                  <Save size={16} />
                  <span>CONFIRM MARK & SAVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResultsValidation;
