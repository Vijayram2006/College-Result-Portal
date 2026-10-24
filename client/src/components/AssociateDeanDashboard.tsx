import React, { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  BookOpen,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  PenLine,
  Globe,
  BarChart3,
  ClipboardList,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  FileCheck,
  FileText,
  Send,
  RotateCcw,
  Search,
  Filter,
  Download,
  Plus,
  ExternalLink,
  Bell,
  Eye,
  Award,
  Sliders,
  Check,
  Layers,
  ArrowRight,
  Printer,
  RefreshCw,
  Clock,
  CheckSquare,
  Scale,
  GraduationCap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { cseSem1Students, bmeSem1Students, ensureDummyMarksLoaded } from "../data/dummyMarksData";
import { aidsSem1Students } from "../data/aidsStudents";
import {
  DeanAnalyticsView,
  DeanAnswerScriptsView,
  DeanDepartmentsView,
  DeanInternalMarksView,
  DeanOverview,
  DeanResultsView,
  DeanRevaluationView,
  DeanStudentsView,
  DeanSubjectsView,
} from "./dean/DeanLiveViews";
import { QuestionPaperReviewView, safeLoadQuestionPapers } from "./dean/QuestionPaperReviewView";
import { refreshQuestionPapers } from "../services/questionPapersApi";
import { CoAssessment } from "./CoAssessment";
import { authApi } from "../services/api";
import { MarkApprovalsView } from "./MarkApprovalsView";
import { NotificationBell } from "./NotificationBell";
import { FacultyBanner } from "./FacultyBanner";
import { PaperCorrectionView } from "./dean/PaperCorrectionView";
import { RevaluationThreeTierReviewView } from "./dean/RevaluationThreeTierReviewView";
import { ExamTimetableNotificationView } from "./dean/ExamTimetableNotificationView";
import { WorkflowChartTrackerView } from "./dean/WorkflowChartTrackerView";
import { AnalyticsView } from "./dean/AnalyticsView";
import { HodAnalytics } from "./hodAnalytics/HodAnalytics";
import { HallPlansView } from "./HallPlansView";
import { DeanFacultyManager } from "./dean/DeanFacultyManager";
import { Calendar, GitFork } from "lucide-react";

export interface AssociateDeanDashboardProps {
  onLogout: () => void;
  isEmbedded?: boolean;
}

export interface DepartmentInfo {
  key: string;
  code: string;
  name: string;
  headName: string;
  studentCount: number;
  featured?: boolean;
}

// 12 Departments matching the exact screenshot
const INITIAL_DEPARTMENTS: DepartmentInfo[] = [
  {
    key: "aids",
    code: "ADS",
    name: "Artificial Intelligence & Data Science",
    headName: "Not assigned",
    studentCount: 50,
    featured: true,
  },
  {
    key: "bme",
    code: "BME",
    name: "Biomedical Engineering",
    headName: "Not assigned",
    studentCount: 28,
    featured: true,
  },
  {
    key: "bt",
    code: "BT",
    name: "Biotechnology",
    headName: "Not assigned",
    studentCount: 25,
    featured: true,
  },
  {
    key: "csbs",
    code: "CSBS",
    name: "COMPUTER SCIENCE AND BUISNEES STUDIES",
    headName: "HARIHARAN",
    studentCount: 0,
    featured: true,
  },
  {
    key: "civil",
    code: "CIVIL",
    name: "Civil Engineering",
    headName: "Not assigned",
    studentCount: 0,
    featured: true,
  },
  {
    key: "cse",
    code: "CSE",
    name: "Computer Science & Engineering",
    headName: "Not assigned",
    studentCount: 20,
    featured: true,
  },
  {
    key: "ece",
    code: "ECE",
    name: "Electronics & Communication Engineering",
    headName: "Dr. T. Balakrishnan",
    studentCount: 35,
  },
  {
    key: "mech",
    code: "MECH",
    name: "Mechanical Engineering",
    headName: "Not assigned",
    studentCount: 48,
  },
  {
    key: "eee",
    code: "EEE",
    name: "Electrical & Electronics Engineering",
    headName: "Not assigned",
    studentCount: 0,
  },
  {
    key: "it",
    code: "IT",
    name: "Information Technology",
    headName: "Not assigned",
    studentCount: 10,
  },
  {
    key: "auto",
    code: "AUTO",
    name: "Automobile Engineering",
    headName: "Not assigned",
    studentCount: 0,
  },
  {
    key: "robotics",
    code: "ROBOTICS",
    name: "Robotics and Automation",
    headName: "Not assigned",
    studentCount: 0,
  },
];

interface ScrutinyBatch {
  id: string;
  code: string;
  name: string;
  department: string;
  deptKey: string;
  semester: string;
  academicYear: string;
  facultyInCharge: string;
  hodName: string;
  hodApprovalDate: string;
  totalStudents: number;
  passedStudents: number;
  passPercentage: number;
  status: "PENDING_MODERATION" | "MODERATED" | "RECOMMENDED_TO_DEAN" | "REVISION_REQUIRED";
  moderationMarks: number;
  moderationJustification: string;
  moderatedAt?: string;
}

const DEFAULT_BATCHES: ScrutinyBatch[] = [
  {
    id: "BATCH-AIDS-AI602",
    code: "AI602",
    name: "Deep Learning & Neural Architectures",
    department: "Artificial Intelligence & Data Science",
    deptKey: "aids",
    semester: "Semester I",
    academicYear: "2026-2027",
    facultyInCharge: "Prof. K. Venkatesh",
    hodName: "Dr. S. Mohan",
    hodApprovalDate: "2026-10-15 02:45 PM",
    totalStudents: 50,
    passedStudents: 47,
    passPercentage: 94.0,
    status: "RECOMMENDED_TO_DEAN",
    moderationMarks: 2,
    moderationJustification: "BoS resolution #4: 2 grace marks awarded for high analytical complexity in Part B",
    moderatedAt: "2026-10-16 09:30 AM",
  },
  {
    id: "BATCH-CSE-CS601",
    code: "CS601",
    name: "Data Structures & Algorithms",
    department: "Computer Science & Engineering",
    deptKey: "cse",
    semester: "Semester I",
    academicYear: "2026-2027",
    facultyInCharge: "Dr. Ananya Menon",
    hodName: "Dr. Jayapradha",
    hodApprovalDate: "2026-10-14 11:20 AM",
    totalStudents: 20,
    passedStudents: 19,
    passPercentage: 95.0,
    status: "PENDING_MODERATION",
    moderationMarks: 0,
    moderationJustification: "",
  },
  {
    id: "BATCH-BME-BM603",
    code: "BM603",
    name: "Biomedical Instrumentation & Sensors",
    department: "Biomedical Engineering",
    deptKey: "bme",
    semester: "Semester I",
    academicYear: "2026-2027",
    facultyInCharge: "Dr. Meenakshi S.",
    hodName: "Dr. R. Natarajan",
    hodApprovalDate: "2026-10-14 04:10 PM",
    totalStudents: 28,
    passedStudents: 26,
    passPercentage: 92.8,
    status: "PENDING_MODERATION",
    moderationMarks: 0,
    moderationJustification: "",
  },
  {
    id: "BATCH-BT-BT601",
    code: "BT601",
    name: "Molecular Biology & Genetic Engineering",
    department: "Biotechnology",
    deptKey: "bt",
    semester: "Semester I",
    academicYear: "2026-2027",
    facultyInCharge: "Dr. Kavitha Raman",
    hodName: "Dr. G. Sivakumar",
    hodApprovalDate: "2026-10-15 10:30 AM",
    totalStudents: 25,
    passedStudents: 24,
    passPercentage: 96.0,
    status: "PENDING_MODERATION",
    moderationMarks: 0,
    moderationJustification: "",
  },
  {
    id: "BATCH-ECE-EC604",
    code: "EC604",
    name: "Digital Signal Processing & VLSI Design",
    department: "Electronics & Communication Engineering",
    deptKey: "ece",
    semester: "Semester I",
    academicYear: "2026-2027",
    facultyInCharge: "Dr. P. Suresh",
    hodName: "Dr. T. Balakrishnan",
    hodApprovalDate: "2026-10-13 03:00 PM",
    totalStudents: 35,
    passedStudents: 32,
    passPercentage: 91.4,
    status: "REVISION_REQUIRED",
    moderationMarks: 0,
    moderationJustification: "Returned to HOD: Question 14 rubrics discrepancies detected in Section B",
    moderatedAt: "2026-10-14 01:45 PM",
  },
  {
    id: "BATCH-MECH-ME602",
    code: "ME602",
    name: "Thermodynamics & Heat Transfer",
    department: "Mechanical Engineering",
    deptKey: "mech",
    semester: "Semester I",
    academicYear: "2026-2027",
    facultyInCharge: "Dr. V. Karthik",
    hodName: "Dr. M. Soundararajan",
    hodApprovalDate: "2026-10-15 01:15 PM",
    totalStudents: 48,
    passedStudents: 43,
    passPercentage: 89.6,
    status: "PENDING_MODERATION",
    moderationMarks: 0,
    moderationJustification: "",
  },
];

class QuestionPaperErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Question Paper Review render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl border border-amber-300 p-8 shadow-sm space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <CheckSquare size={24} />
          </div>
          <h3 className="text-lg font-black text-[#0B192C]">
            Question Paper Review Component Recovery
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Detected cached data variation from previous browser session. Click below to load the verified 5-stage Academic Question Paper Scrutiny portal.
          </p>
          <button
            onClick={() => {
              this.props.onReset();
              this.setState({ hasError: false, error: null });
            }}
            className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-[#D4A72C] font-bold text-xs hover:bg-[#152744] transition shadow cursor-pointer inline-flex items-center gap-2"
          >
            <RotateCcw size={14} />
            <span>Restore Question Paper Workspace</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AssociateDeanDashboard: React.FC<AssociateDeanDashboardProps> = ({
  onLogout,
  isEmbedded = false,
}) => {
  // The signed-in Associate Dean / Dean and their college (from the server's sign-in)
  const me = authApi.currentUser();
  const myName = me?.name || "Associate Dean";
  const myTitle = me?.role === "DEAN" ? "Dean" : "Associate Dean";
  const myCollegeName = me?.collegeName || "KVELL University";
  const myCollegeShort = (me?.collegeKey || "engineering").toUpperCase();
  // Navigation & View state
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [resultsMenuOpen, setResultsMenuOpen] = useState<boolean>(true);
  const [examinationMenuOpen, setExaminationMenuOpen] = useState<boolean>(true);
  const [analyticsMenuOpen, setAnalyticsMenuOpen] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Departments
  const [departments, setDepartments] = useState<DepartmentInfo[]>(() => {
    try {
      const stored = localStorage.getItem("kvell_admin_departments");
      return stored ? JSON.parse(stored) : INITIAL_DEPARTMENTS;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  });

  // Scrutiny Batches for Mark Entry & Moderation
  const [batches, setBatches] = useState<ScrutinyBatch[]>(() => {
    try {
      const raw = localStorage.getItem("kvell_assoc_dean_batches");
      return raw ? JSON.parse(raw) : DEFAULT_BATCHES;
    } catch {
      return DEFAULT_BATCHES;
    }
  });

  const [selectedBatchId, setSelectedBatchId] = useState<string>("BATCH-AIDS-AI602");
  const [moderationInput, setModerationInput] = useState<number>(1);
  const [moderationReason, setModerationReason] = useState<string>(
    "Academic Evaluation Committee resolution: Grace marks adjustment for question complexity"
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [showStudentsModal, setShowStudentsModal] = useState<boolean>(false);
  const [showFacultyModal, setShowFacultyModal] = useState<boolean>(false);
  const [showDepartmentsModal, setShowDepartmentsModal] = useState<boolean>(false);
  const [showCoursesModal, setShowCoursesModal] = useState<boolean>(false);
  const [showPublishedModal, setShowPublishedModal] = useState<boolean>(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

  // Question Papers pending review count for badge and alert
  const [pendingQpCount, setPendingQpCount] = useState<number>(() => {
    try {
      const list = safeLoadQuestionPapers();
      return list.filter((p: any) => p.status === "PENDING_AD_REVIEW").length;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    ensureDummyMarksLoaded();
    const updateQpCount = () => {
      try {
        const list = safeLoadQuestionPapers();
        setPendingQpCount(list.filter((p: any) => p.status === "PENDING_AD_REVIEW").length);
      } catch {
        setPendingQpCount(0);
      }
    };
    window.addEventListener("kvell_qp_updated", updateQpCount);
    window.addEventListener("storage", updateQpCount);
    void refreshQuestionPapers();
    return () => {
      window.removeEventListener("kvell_qp_updated", updateQpCount);
      window.removeEventListener("storage", updateQpCount);
    };
  }, []);

  useEffect(() => {
    if (activeNav.startsWith("analytics") || activeNav === "analytics") {
      setAnalyticsMenuOpen(true);
    }
  }, [activeNav]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const saveBatches = (newBatches: ScrutinyBatch[]) => {
    setBatches(newBatches);
    try {
      localStorage.setItem("kvell_assoc_dean_batches", JSON.stringify(newBatches));
    } catch (e) {
      console.error(e);
    }
  };

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) || batches[0],
    [batches, selectedBatchId]
  );

  // Dynamic student list generation to reach exactly 216 students matching the screenshot
  const allEnrolledStudents = useMemo(() => {
    const list: {
      regNo: string;
      name: string;
      deptCode: string;
      deptName: string;
      category: string;
      sem: string;
      status: string;
    }[] = [];

    // 1. AIDS: 50 Students
    aidsSem1Students.slice(0, 50).forEach((s, idx) => {
      list.push({
        regNo: s.regNo,
        name: s.name,
        deptCode: "ADS",
        deptName: "Artificial Intelligence & Data Science",
        category: idx % 6 === 0 ? "Hosteller" : idx % 10 === 0 ? "Lateral" : "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    });

    // 2. BME: 28 Students
    bmeSem1Students.slice(0, 28).forEach((s, idx) => {
      list.push({
        regNo: s.regNo,
        name: s.name,
        deptCode: "BME",
        deptName: "Biomedical Engineering",
        category: idx % 5 === 0 ? "Hosteller" : "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    });

    // 3. BT: 25 Students
    const btNames = [
      "ARUN KUMAR S", "DIVYA BHARATHI M", "GOWTHAM P", "HARINI V", "INDHUMATHI K",
      "JANANI R", "KISHORE N", "LAVANYA S", "MANIKANDAN T", "NANDHINI E",
      "PRAVEEN RAJ M", "RAMYA D", "SARAVANAN K", "THENMOZHI P", "VIGNESHWARAN S",
      "YUVASHREE G", "ABINAYA R", "BALAJI K", "CHITRA M", "DINESH BABU S",
      "ELAKKIYA T", "GAYATHRI N", "HARI PRASATH V", "ISWARYA P", "KARTHIK RAJA C"
    ];
    btNames.forEach((name, idx) => {
      list.push({
        regNo: `202601102070${String(idx + 1).padStart(2, "0")}`,
        name,
        deptCode: "BT",
        deptName: "Biotechnology",
        category: idx % 4 === 0 ? "Hosteller" : "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    });

    // 4. CSE: 20 Students
    cseSem1Students.slice(0, 20).forEach((s, idx) => {
      list.push({
        regNo: s.regNo,
        name: s.name,
        deptCode: "CSE",
        deptName: "Computer Science & Engineering",
        category: idx % 7 === 0 ? "Hosteller" : "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    });

    // 5. ECE: 35 Students
    for (let i = 1; i <= 35; i++) {
      list.push({
        regNo: `202601102050${String(i).padStart(2, "0")}`,
        name: `ECE CANDIDATE ${i}`,
        deptCode: "ECE",
        deptName: "Electronics & Communication Engineering",
        category: i % 5 === 0 ? "Lateral" : "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    }

    // 6. MECH: 48 Students
    for (let i = 1; i <= 48; i++) {
      list.push({
        regNo: `202601102080${String(i).padStart(2, "0")}`,
        name: `MECH CANDIDATE ${i}`,
        deptCode: "MECH",
        deptName: "Mechanical Engineering",
        category: i % 4 === 0 ? "Hosteller" : "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    }

    // 7. IT: 10 Students
    for (let i = 1; i <= 10; i++) {
      list.push({
        regNo: `202601102120${String(i).padStart(2, "0")}`,
        name: `IT CANDIDATE ${i}`,
        deptCode: "IT",
        deptName: "Information Technology",
        category: "Regular",
        sem: "Sem I",
        status: "Active Enrolled",
      });
    }

    // Total = 50 + 28 + 25 + 20 + 35 + 48 + 10 = 216!
    return list;
  }, []);

  // Filtered student list for inspection modal
  const filteredStudents = useMemo(() => {
    return allEnrolledStudents.filter((s) => {
      const matchDept =
        selectedDeptFilter === "all" ||
        s.deptCode.toLowerCase() === selectedDeptFilter.toLowerCase();
      const q = studentSearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.regNo.toLowerCase().includes(q) ||
        s.deptCode.toLowerCase().includes(q);
      return matchDept && matchQuery;
    });
  }, [allEnrolledStudents, selectedDeptFilter, studentSearchQuery]);

  // Batch students calculation for moderation
  const batchStudents = useMemo(() => {
    if (!selectedBatch) return [];
    const sourceList =
      selectedBatch.deptKey === "cse"
        ? cseSem1Students.slice(0, selectedBatch.totalStudents)
        : selectedBatch.deptKey === "bme"
        ? bmeSem1Students.slice(0, selectedBatch.totalStudents)
        : aidsSem1Students.slice(0, selectedBatch.totalStudents);

    return sourceList.map((s, idx) => {
      const baseMark = 65 + ((idx * 7) % 28);
      const internal = Math.round(baseMark * 0.4);
      const external = Math.round(baseMark * 0.6);
      const mod =
        selectedBatch.status === "MODERATED" || selectedBatch.status === "RECOMMENDED_TO_DEAN"
          ? selectedBatch.moderationMarks
          : 0;
      const total = Math.min(100, internal + external + mod);
      let grade = "C";
      if (total >= 90) grade = "O";
      else if (total >= 80) grade = "A+";
      else if (total >= 70) grade = "A";
      else if (total >= 60) grade = "B+";
      else if (total >= 50) grade = "B";
      else if (total >= 45) grade = "C";
      else grade = "RA";

      return {
        regNo: s.regNo,
        name: s.name,
        deptName: selectedBatch.department,
        internal,
        external,
        moderationApplied: mod,
        total,
        grade,
        status: total >= 50 ? "PASS" : "FAIL",
        attendance: 82 + ((idx * 3) % 17),
      };
    });
  }, [selectedBatch]);

  // Export all students to Excel
  const handleExportAllStudents = () => {
    const rows = allEnrolledStudents.map((s) => ({
      "Register Number": s.regNo,
      "Student Name": s.name,
      "Department Code": s.deptCode,
      "Department Name": s.deptName,
      Semester: s.sem,
      Category: s.category,
      Status: s.status,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Enrolled_Students_216");
    XLSX.writeFile(wb, "Karpaga_Vinayaga_University_Students_Roster_2026.xlsx");
    showToast("Downloaded University Student Directory Excel (216 Records)");
  };

  // Export batch scrutiny sheet
  const handleExportScrutiny = () => {
    if (!selectedBatch) return;
    const rows = batchStudents.map((s) => ({
      "Register Number": s.regNo,
      "Student Name": s.name,
      Department: s.deptName,
      "Internal (40)": s.internal,
      "External (60)": s.external,
      "Moderation Marks": s.moderationApplied,
      "Grand Total (100)": s.total,
      Grade: s.grade,
      Status: s.status,
      "Attendance %": `${s.attendance}%`,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${selectedBatch.code}_Marks`);
    XLSX.writeFile(wb, `KVELL_Audit_${selectedBatch.code}_${selectedBatch.deptKey.toUpperCase()}.xlsx`);
    showToast(`Exported ${selectedBatch.code} Scrutiny & Moderation Roster`);
  };

  // Moderation apply
  const handleApplyModeration = () => {
    if (!selectedBatch) return;
    const updated = batches.map((b) => {
      if (b.id === selectedBatch.id) {
        const newPassed = Math.min(b.totalStudents, b.passedStudents + 1);
        const newRate = Number(((newPassed / b.totalStudents) * 100).toFixed(1));
        return {
          ...b,
          status: "MODERATED" as const,
          moderationMarks: moderationInput,
          moderationJustification: moderationReason,
          passedStudents: newPassed,
          passPercentage: newRate,
          moderatedAt: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
      return b;
    });
    saveBatches(updated);
    showToast(`Applied +${moderationInput} Grace Mark(s) to ${selectedBatch.name}`);
  };

  // Recommend to Dean
  const handleRecommendToDean = () => {
    if (!selectedBatch) return;
    const updated = batches.map((b) => {
      if (b.id === selectedBatch.id) {
        return {
          ...b,
          status: "RECOMMENDED_TO_DEAN" as const,
          moderatedAt: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
      return b;
    });
    saveBatches(updated);
    showToast(`Batch ${selectedBatch.code} forwarded to Dean of Academics for final gazette release!`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0B192C] flex font-sans selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B192C] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#D4A72C] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="text-[#D4A72C]" size={18} />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* LEFT SIDEBAR - Exactly matching the screenshot */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0B192C] text-white flex flex-col justify-between border-r border-[#D4A72C]/20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Top Brand Header */}
          <div className="px-5 h-[6.75rem] box-border border-b-4 border-[#D4A72C] flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/kvell-logo.png"
                alt="KVELL UNIVERSITY"
                className="h-10 w-10 rounded-full bg-white p-0.5 border border-[#D4A72C] shrink-0 object-contain shadow-sm"
              />
              <div className="overflow-hidden">
                <span
                  className="font-display font-black text-xs tracking-wide text-white block truncate uppercase"
                  title="KVELL UNIVERSITY"
                >
                  KVELL UNIVERSITY
                </span>
                <span className="text-[10px] font-extrabold text-[#D4A72C] tracking-wider uppercase block truncate">
                  {myCollegeShort}
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-white/60 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-175px)]">
            {/* Dashboard - Active Pill Button matching screenshot */}
            <button
              onClick={() => {
                setActiveNav("dashboard");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeNav === "dashboard"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-extrabold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard</span>
            </button>

            {/* Section: EXAMINATION & RESULTS */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest px-3.5">
                EXAMINATION & RESULTS
              </span>
            </div>

            {/* Forwarded marks waiting for the Associate Dean's approval (when the Chief COE requires it) */}
            <button
              onClick={() => {
                setActiveNav("mark-approvals");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeNav === "mark-approvals"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-extrabold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <CheckSquare size={17} />
              <span>Mark Approvals</span>
            </button>

            {/* Examination Collapsible Menu */}
            <div>
              <button
                onClick={() => setExaminationMenuOpen(!examinationMenuOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  [
                    "examination",
                    "timetable-notifications",
                    "question-paper-review",
                    "classroom-allocation",
                    "paper-correction",
                  ].includes(activeNav)
                    ? "text-[#D4A72C] bg-white/5 font-extrabold"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap size={17} />
                  <span>Examination</span>
                </div>
                {examinationMenuOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {examinationMenuOpen && (
                <div className="ml-4 pl-3 border-l border-white/15 my-1 space-y-1">
                  {/* Flowchart Steps 5 & 6: Timetable & Faculty Notifications */}
                  <button
                    onClick={() => {
                      setActiveNav("timetable-notifications");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "timetable-notifications"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar size={14} />
                      <span>Timetable &amp; Notifications</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-blue-400 text-slate-950 font-mono">
                      5 &amp; 6
                    </span>
                  </button>

                  {/* Stage 3 Question Paper Review */}
                  <button
                    onClick={() => {
                      setActiveNav("question-paper-review");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "question-paper-review"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckSquare size={14} />
                      <span>Question Paper Review</span>
                    </div>
                    {pendingQpCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-400 text-slate-950 animate-pulse">
                        {pendingQpCount}
                      </span>
                    )}
                  </button>

                  {/* Flowchart Steps 13-20: Exam Cell Classrooms (40/Hall) & 1 Faculty */}
                  <button
                    onClick={() => {
                      setActiveNav("classroom-allocation");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "classroom-allocation"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 size={14} />
                      <span>Exam Cell &amp; Classrooms</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-400 text-slate-950 font-mono">
                      40/HALL
                    </span>
                  </button>

                  {/* Stage 4 Paper Correction */}
                  <button
                    onClick={() => {
                      setActiveNav("paper-correction");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "paper-correction"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <PenLine size={14} />
                      <span>Paper Correction</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-[#D4A72C] text-[#0B192C]">
                      ASSIGN
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Results Collapsible Menu */}
            <div>
              <button
                onClick={() => setResultsMenuOpen(!resultsMenuOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeNav.startsWith("results") || [
                    "student-data",
                    "internal-marks",
                    "answer-scripts",
                    "paper-correction",
                    "published-results",
                    "revaluation",
                    "question-paper-review",
                  ].includes(activeNav)
                    ? "text-[#D4A72C] bg-white/5"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={17} />
                  <span>Results</span>
                </div>
                {resultsMenuOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {resultsMenuOpen && (
                <div className="ml-4 pl-3 border-l border-white/15 my-1 space-y-1">
                  {/* Student Data */}
                  <button
                    onClick={() => {
                      setActiveNav("student-data");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
                      activeNav === "student-data"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Upload size={14} />
                    <span>Student Data</span>
                  </button>

                  {/* Internal Marks */}
                  <button
                    onClick={() => {
                      setActiveNav("internal-marks");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
                      activeNav === "internal-marks"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FileCheck size={14} />
                    <span>Internal Marks</span>
                  </button>

                  {/* Answer Scripts */}
                  <button
                    onClick={() => {
                      setActiveNav("answer-scripts");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
                      activeNav === "answer-scripts"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FileText size={14} />
                    <span>Answer Scripts</span>
                  </button>

                  {/* Published Results */}
                  <button
                    onClick={() => {
                      setActiveNav("published-results");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
                      activeNav === "published-results"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Globe size={14} />
                    <span>Published Results</span>
                  </button>

                  {/* Revaluation Requests (3-Tier & Standard Deviation) */}
                  <button
                    onClick={() => {
                      setActiveNav("revaluation");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
                      activeNav === "revaluation"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Scale size={14} />
                      <span>Revaluation &amp; 3rd Val Desk</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-red-500 text-white font-mono">
                      &Delta; &gt; 10M
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Assessment Analytics Collapsible Menu with 4 Sub-Components (IAT-1, IAT-2, END-SEM, REVALUATION) */}
            <div>
              <button
                onClick={() => {
                  if (!activeNav.startsWith("analytics")) {
                    setActiveNav("analytics-iat1");
                    setAnalyticsMenuOpen(true);
                  } else {
                    setAnalyticsMenuOpen(!analyticsMenuOpen);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeNav.startsWith("analytics")
                    ? "text-[#D4A72C] bg-white/5 font-extrabold"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={17} />
                  <span>Assessment Analytics</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setAnalyticsMenuOpen(!analyticsMenuOpen);
                  }}
                  className="p-1 hover:bg-white/10 rounded cursor-pointer"
                  title="Toggle Assessment Sub-Components"
                >
                  {analyticsMenuOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </div>
              </button>

              {analyticsMenuOpen && (
                <div className="ml-4 pl-3 border-l-2 border-[#D4A72C]/40 my-1 space-y-1">
                  {/* Sub-component 1: IAT-1 */}
                  <button
                    onClick={() => {
                      setActiveNav("analytics-iat1");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "analytics-iat1"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded ${
                          activeNav === "analytics-iat1"
                            ? "bg-[#0B192C] text-[#D4A72C]"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        SUB 1
                      </span>
                      <span className="font-bold">IAT-1</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${
                        activeNav === "analytics-iat1"
                          ? "bg-black/15 text-[#0B192C] font-black"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      Units I &amp; II
                    </span>
                  </button>

                  {/* Sub-component 2: IAT-2 */}
                  <button
                    onClick={() => {
                      setActiveNav("analytics-iat2");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "analytics-iat2"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded ${
                          activeNav === "analytics-iat2"
                            ? "bg-[#0B192C] text-[#D4A72C]"
                            : "bg-indigo-500/20 text-indigo-300"
                        }`}
                      >
                        SUB 2
                      </span>
                      <span className="font-bold">IAT-2</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${
                        activeNav === "analytics-iat2"
                          ? "bg-black/15 text-[#0B192C] font-black"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      Units III &amp; IV
                    </span>
                  </button>

                  {/* Sub-component 3: END-SEM */}
                  <button
                    onClick={() => {
                      setActiveNav("analytics-endsem");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "analytics-endsem" || activeNav === "analytics"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded ${
                          activeNav === "analytics-endsem" || activeNav === "analytics"
                            ? "bg-[#0B192C] text-[#D4A72C]"
                            : "bg-amber-400/20 text-amber-300"
                        }`}
                      >
                        SUB 3
                      </span>
                      <span className="font-bold">END-SEM</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${
                        activeNav === "analytics-endsem" || activeNav === "analytics"
                          ? "bg-black/15 text-[#0B192C] font-black"
                          : "bg-[#D4A72C]/20 text-[#D4A72C]"
                      }`}
                    >
                      100 Marks
                    </span>
                  </button>

                  {/* Sub-component 4: REVALUATION */}
                  <button
                    onClick={() => {
                      setActiveNav("analytics-revaluation");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      activeNav === "analytics-revaluation"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded ${
                          activeNav === "analytics-revaluation"
                            ? "bg-[#0B192C] text-[#D4A72C]"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        SUB 4
                      </span>
                      <span className="font-bold">REVALUATION</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${
                        activeNav === "analytics-revaluation"
                          ? "bg-black/15 text-[#0B192C] font-black"
                          : "bg-red-500/20 text-red-300 font-bold"
                      }`}
                    >
                      &Delta; Shift &bull; 3rd Val
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Section: ACADEMIC STRUCTURE & CATALOG */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest px-3.5">
                ACADEMIC STRUCTURE & CATALOG
              </span>
            </div>

            <button
              onClick={() => {
                setActiveNav("departments");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "departments"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-bold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building2 size={17} />
              <span>Departments</span>
            </button>

            <button
              onClick={() => {
                setActiveNav("subjects");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "subjects"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-bold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BookOpen size={17} />
              <span>Subjects</span>
            </button>

            {/* Section: FACULTY DETAIL */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest px-3.5">
                FACULTY DETAIL
              </span>
            </div>

            <button
              onClick={() => {
                setActiveNav("faculty");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "faculty"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-bold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserCheck size={17} />
              <span>Faculty Master</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Bar matching screenshot */}
        <div className="p-3 border-t border-white/10 bg-[#081322] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 font-mono shrink-0">
              {myCollegeShort.slice(0, 3)}
            </span>
            <div className="overflow-hidden">
              <p
                className="text-xs font-bold text-white truncate max-w-[145px]"
                title={myName}
              >
                {myName}
              </p>
              <p className="text-[9px] font-bold text-[#D4A72C] uppercase tracking-wider truncate">
                ROLE: {myTitle.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/5 transition shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 lg:pl-72 min-h-screen flex flex-col">
        {/* Mobile Top App Bar */}
        {/* The same navy college banner as every other portal */}
        <FacultyBanner
          collegeName={myCollegeName}
          logoUrl="/kvell-logo.png"
          userName={myName}
          username={me?.username ?? ""}
          tag={`OFFICE OF THE ${myTitle.toUpperCase()}`}
          subtitle="Question paper review, approval of forwarded marks and the college's results (read only)"
          onBellLink={(link) =>
            link === "question-paper" ? setActiveNav("question-paper-review")
              : link === "mark-approvals" ? setActiveNav("mark-approvals") : undefined
          }
          onOpenMenu={() => setMobileSidebarOpen(true)}
          onBack={activeNav !== "dashboard" ? () => setActiveNav("dashboard") : undefined}
        />

        {/* Body Container */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
          {/* TOP BANNER WITH SEAL & KYRO TIGER MASCOT - Exactly matching screenshot */}

          {/* DASHBOARD VIEW CONTENT */}
          {activeNav === "dashboard" && <DeanOverview onNavigate={setActiveNav} pendingQpCount={pendingQpCount} />}

          {activeNav === "examination" && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
                <div className="border-b border-gray-100 pb-4">
                  <h2 className="font-display font-black text-xl text-[#0B192C] flex items-center gap-2">
                    <GraduationCap size={22} className="text-[#D4A72C]" />
                    Central Examination Operations Hub
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Centralized examination stage controllers: timetables, faculty QP submission review, hall allocation, and valuation staff allotment.
                  </p>
                </div>

                {/* 35-Stage Workflow Map Hero Banner */}
                <div
                  onClick={() => setActiveNav("workflow-chart")}
                  className="mt-5 p-4 rounded-2xl bg-[#0B192C] text-white border-2 border-[#D4A72C]/40 hover:border-[#D4A72C] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center shrink-0 font-black group-hover:scale-105 transition-transform">
                      <GitFork size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#D4A72C] text-[#0B192C]">
                          FULL LIFECYCLE MAP
                        </span>
                        <span className="text-[11px] text-gray-300 font-mono">
                          Pre-Exam &rarr; Valuation &rarr; Moderation &rarr; Dual Results &rarr; Revaluation
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white mt-0.5">
                        Interactive Examination Lifecycle Workflow Chart (35 Stages)
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black text-[#D4A72C] shrink-0">
                    <span>Inspect Interactive Flowchart</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {/* Card 1: Timetable */}
                  <div
                    onClick={() => setActiveNav("timetable-notifications")}
                    className="p-5 rounded-2xl border-2 border-blue-100 hover:border-blue-400 bg-blue-50/20 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Calendar size={20} />
                    </div>
                    <span className="font-bold text-sm text-[#0B192C] block group-hover:text-blue-900">
                      Timetable &amp; Notifications
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Exam timetable scheduling &amp; faculty QP broadcast notifications (Steps 5 &amp; 6).
                    </p>
                    <span className="text-[10px] font-black text-blue-700 mt-3 inline-block">
                      Open Module &rarr;
                    </span>
                  </div>

                  {/* Card 2: QP Review */}
                  <div
                    onClick={() => setActiveNav("question-paper-review")}
                    className="p-5 rounded-2xl border-2 border-amber-100 hover:border-amber-400 bg-amber-50/20 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <CheckSquare size={20} />
                    </div>
                    <span className="font-bold text-sm text-[#0B192C] block group-hover:text-amber-900">
                      Question Paper Review
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      5-stage scrutiny of HOD submitted QP sets &amp; COE forwarding.
                    </p>
                    <span className="text-[10px] font-black text-amber-800 mt-3 inline-block">
                      Open Module &rarr;
                    </span>
                  </div>

                  {/* Card 3: Exam Cell */}
                  <div
                    onClick={() => setActiveNav("classroom-allocation")}
                    className="p-5 rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 bg-emerald-50/20 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Building2 size={20} />
                    </div>
                    <span className="font-bold text-sm text-[#0B192C] block group-hover:text-emerald-900">
                      Exam Cell &amp; Classrooms
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Central hall seating engine (40 candidates &amp; 1 invigilator/hall).
                    </p>
                    <span className="text-[10px] font-black text-emerald-800 mt-3 inline-block">
                      Open Module &rarr;
                    </span>
                  </div>

                  {/* Card 4: Paper Correction */}
                  <div
                    onClick={() => setActiveNav("paper-correction")}
                    className="p-5 rounded-2xl border-2 border-slate-200 hover:border-[#D4A72C] bg-slate-50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <PenLine size={20} />
                    </div>
                    <span className="font-bold text-sm text-[#0B192C] block group-hover:text-[#0B192C]">
                      Paper Correction
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Faculty answer script allocation &amp; valuation progress tracking.
                    </p>
                    <span className="text-[10px] font-black text-[#0B192C] mt-3 inline-block">
                      Open Module &rarr;
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPLETE 35-STAGE WORKFLOW CHART INTERACTIVE TRACKER VIEW */}
          {activeNav === "workflow-chart" && (
            <WorkflowChartTrackerView
              onNavigate={(nav) => setActiveNav(nav)}
              onToast={showToast}
            />
          )}

          {/* EXAM TIMETABLE & NOTIFICATIONS VIEW (Workflow Steps 5 & 6) */}
          {activeNav === "timetable-notifications" && (
            <ExamTimetableNotificationView
              onToast={showToast}
              onNavigateToExamCell={() => setActiveNav("classroom-allocation")}
            />
          )}

          {/* EXAM CELL CLASSROOM & FACULTY ALLOCATION VIEW (Workflow Steps 13-20) */}
          {/* REQ-06: hall allotment is the COE's; the Associate Dean oversees the published allotments (view only) */}
          {activeNav === "classroom-allocation" && <HallPlansView mode="dean" />}

          {/* STUDENT DATA VIEW (Matching Image 1) */}
          {activeNav === "student-data" && <DeanStudentsView />}

          {/* INTERNAL MARKS VIEW (Matching Image 2) */}
          {activeNav === "internal-marks" && <CoAssessment mode="admin" />}

          {/* ANSWER SCRIPTS VIEW (Matching Image 3 with View instead of Upload) */}
          {activeNav === "answer-scripts" && <DeanAnswerScriptsView />}

          {/* PAPER CORRECTION VIEW (Staff Allocation & Equal Mapping Engine) */}
          {activeNav === "paper-correction" && (
            <PaperCorrectionView onToast={showToast} />
          )}

          {/* PUBLISHED RESULTS VIEW (Matching Image 4) */}
          {activeNav === "published-results" && <DeanResultsView />}

          {/* DEPARTMENTS VIEW (Matching Image 1) */}
          {activeNav === "departments" && <DeanDepartmentsView />}

          {/* SUBJECTS & ELECTIVES VIEW (Matching Image 2) */}
          {activeNav === "subjects" && <DeanSubjectsView />}

          {/* QUESTION PAPER REVIEW VIEW (Dedicated Component in AD Panel) */}
          {activeNav === "faculty" && <DeanFacultyManager />}
          {activeNav === "mark-approvals" && <MarkApprovalsView role="dean" />}
          {activeNav === "question-paper-review" && (
            <QuestionPaperErrorBoundary
              onReset={() => {
                void refreshQuestionPapers();
                showToast("Question papers reloaded from the server.");
              }}
            >
              <QuestionPaperReviewView onToast={showToast} />
            </QuestionPaperErrorBoundary>
          )}


          {/* REVALUATION & 3-TIER VALUATION REVIEW VIEW (Std Dev Graphs & Delta > 10M Trigger) */}
          {activeNav === "revaluation" && (
            <RevaluationThreeTierReviewView onToast={showToast} />
          )}

          {/* ASSESSMENT ANALYTICS VIEW (Subject-wise, Common vs Core, 4 Subcomponents) */}
          {/* The HOD's result analytics for the whole college, per assessment (with the bell-curve tab) */}
          {(activeNav.startsWith("analytics") || activeNav === "analytics") && (
            <HodAnalytics
              scope="dean"
              assessment={
                activeNav === "analytics-iat1" ? "IAT-1" : activeNav === "analytics-iat2" ? "IAT-2" : "End Semester"
              }
            />
          )}
          {/* Revaluation: the analytics above (end semester) plus the revaluation comparison */}
          {activeNav === "analytics-revaluation" && (
            <AnalyticsView
              onToast={showToast}
              activeSubComponent="REVALUATION"
              onSubComponentChange={(sub) => {
                if (sub === "IAT-1") setActiveNav("analytics-iat1");
                else if (sub === "IAT-2") setActiveNav("analytics-iat2");
                else if (sub === "END-SEM") setActiveNav("analytics-endsem");
                else if (sub === "REVALUATION") setActiveNav("analytics-revaluation");
              }}
            />
          )}
        </div>
      </main>

      {/* MODAL 1: INSPECT ALL STUDENTS (216) & ROSTER */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2.5">
                <Users size={20} className="text-[#D4A72C]" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    University Enrolled Students Roster
                  </h3>
                  <p className="text-[11px] text-[#D4A72C]">
                    Total Records: {filteredStudents.length} of {allEnrolledStudents.length} Students
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAllStudents}
                  className="px-3 py-1.5 rounded-lg bg-[#EAB308] text-[#0B192C] text-xs font-black hover:bg-[#d69e06] transition flex items-center gap-1.5"
                >
                  <Download size={13} /> Export Excel
                </button>
                <button
                  onClick={() => setShowStudentsModal(false)}
                  className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-gray-100 bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student name, register number..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {["all", "ADS", "BME", "BT", "CSE", "ECE", "MECH", "IT"].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDeptFilter(dept)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                      selectedDeptFilter === dept
                        ? "bg-[#0B192C] text-[#D4A72C]"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {dept.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-gray-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Register No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Semester</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredStudents.map((s) => (
                    <tr key={s.regNo} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0B192C]">{s.regNo}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-800">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-600">{s.deptCode}</td>
                      <td className="py-2.5 px-3">{s.sem}</td>
                      <td className="py-2.5 px-3 text-gray-500">{s.category}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {filteredStudents.length} candidate entries</span>
              <button
                onClick={() => setShowStudentsModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE DEPARTMENTS (12 Branches) */}
      {showDepartmentsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2.5">
                <Building2 size={20} className="text-[#D4A72C]" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Configure Academic Departments (12 Branches)
                  </h3>
                  <p className="text-[11px] text-[#D4A72C]">
                    Karpaga Vinayaga College of Engineering and Technology
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDepartmentsModal(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {departments.map((d) => (
                <div
                  key={d.key}
                  className="p-3.5 rounded-2xl border border-gray-200 flex items-center justify-between hover:border-[#D4A72C] transition bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black bg-[#D4A72C]/20 border border-[#D4A72C]/40 text-[#0B192C] px-2.5 py-1 rounded-lg">
                      {d.code}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#0B192C]">{d.name}</p>
                      <p className="text-[11px] text-gray-500">
                        Assigned HOD: <span className="font-semibold text-gray-800">{d.headName}</span> •{" "}
                        {d.studentCount} Students
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setShowDepartmentsModal(false)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FACULTY & HODS DIRECTORY (24) */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2.5">
                <UserCheck size={20} className="text-[#D4A72C]" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Faculty &amp; Department Heads Directory (24)
                  </h3>
                  <p className="text-[11px] text-[#D4A72C]">
                    Academic Council &amp; Evaluation Officers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFacultyModal(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: "Dr. S. Mohan", role: "HOD", dept: "ADS", exp: "14 Years" },
                { name: "Prof. K. Venkatesh", role: "Associate Professor", dept: "ADS", exp: "9 Years" },
                { name: "Dr. Jayapradha", role: "HOD", dept: "CSE", exp: "16 Years" },
                { name: "Dr. Ananya Menon", role: "Professor", dept: "CSE", exp: "11 Years" },
                { name: "Dr. R. Natarajan", role: "HOD", dept: "BME", exp: "15 Years" },
                { name: "Dr. Meenakshi S.", role: "Associate Professor", dept: "BME", exp: "10 Years" },
                { name: "Dr. G. Sivakumar", role: "HOD", dept: "Biotechnology", exp: "13 Years" },
                { name: "Dr. Kavitha Raman", role: "Assistant Professor", dept: "Biotechnology", exp: "7 Years" },
                { name: "Dr. T. Balakrishnan", role: "HOD", dept: "ECE", exp: "18 Years" },
                { name: "Dr. P. Suresh", role: "Professor", dept: "ECE", exp: "12 Years" },
                { name: "Dr. M. Soundararajan", role: "HOD", dept: "Mechanical", exp: "17 Years" },
                { name: "Dr. V. Karthik", role: "Associate Professor", dept: "Mechanical", exp: "10 Years" },
                { name: "Dr. R. Hariharan", role: "HOD", dept: "CSBS", exp: "12 Years" },
                { name: "Dr. C. Ramesh", role: "HOD", dept: "Civil", exp: "15 Years" },
                { name: "Dr. K. Saravanan", role: "HOD", dept: "EEE", exp: "16 Years" },
                { name: "Dr. N. Balamurugan", role: "HOD", dept: "IT", exp: "14 Years" },
                { name: "Dr. P. Anand", role: "Professor", dept: "Automobile", exp: "11 Years" },
                { name: "Dr. S. Deepa", role: "Associate Professor", dept: "Robotics", exp: "9 Years" },
                { name: "Dr. Rajesh Kumar", role: "Associate Dean", dept: "Academic Office", exp: "19 Years" },
                { name: "Dr. Meera Krishnan", role: "Dean", dept: "Academics", exp: "22 Years" },
                { name: "Dean of Academics", role: "Dean", dept: "Academic Council", exp: "22 Years" },
                { name: "Prof. Grace David", role: "HOD", dept: "Faculty of Nursing", exp: "14 Years" },
                { name: "Dr. R. K. Sharma", role: "HOD", dept: "Faculty of Pharmacy", exp: "16 Years" },
                { name: "Dr. Meganathan", role: "Valuation Chief", dept: "Evaluation Wing", exp: "15 Years" },
              ].map((f, i) => (
                <div key={i} className="p-3.5 rounded-2xl border border-gray-100 bg-[#FAF8F5] flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-black text-xs shrink-0">
                    {f.name.split(" ").slice(-1)[0][0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B192C]">{f.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {f.role} • <span className="font-semibold text-gray-700">{f.dept}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setShowFacultyModal(false)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: COURSES CATALOG (50 Courses) */}
      {showCoursesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2.5">
                <BookOpen size={20} className="text-[#D4A72C]" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    University Courses &amp; Curriculum Catalog (50 Courses)
                  </h3>
                  <p className="text-[11px] text-[#D4A72C]">
                    Karpaga Vinayaga Autonomous Curriculum Matrix
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCoursesModal(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {[
                { code: "AI601", title: "Artificial Intelligence Foundations", dept: "ADS", credits: 4 },
                { code: "AI602", title: "Deep Learning & Neural Architectures", dept: "ADS", credits: 4 },
                { code: "AI603", title: "Natural Language Processing", dept: "ADS", credits: 3 },
                { code: "CS601", title: "Data Structures & Algorithms", dept: "CSE", credits: 4 },
                { code: "CS602", title: "Database Management Systems", dept: "CSE", credits: 4 },
                { code: "CS603", title: "Operating Systems Principles", dept: "CSE", credits: 3 },
                { code: "CS604", title: "Computer Networks & Security", dept: "CSE", credits: 4 },
                { code: "BM601", title: "Human Anatomy & Physiology", dept: "BME", credits: 3 },
                { code: "BM602", title: "Bioelectric Signals & Conditioning", dept: "BME", credits: 4 },
                { code: "BM603", title: "Biomedical Instrumentation & Sensors", dept: "BME", credits: 4 },
                { code: "BT601", title: "Molecular Biology & Genetic Engineering", dept: "BT", credits: 4 },
                { code: "BT602", title: "Bioprocess Engineering & Fermentation", dept: "BT", credits: 4 },
                { code: "EC601", title: "Analog & Digital Communication", dept: "ECE", credits: 4 },
                { code: "EC602", title: "Microprocessors & Microcontrollers", dept: "ECE", credits: 4 },
                { code: "EC604", title: "Digital Signal Processing & VLSI", dept: "ECE", credits: 4 },
                { code: "ME601", title: "Fluid Mechanics & Machinery", dept: "MECH", credits: 4 },
                { code: "ME602", title: "Thermodynamics & Heat Transfer", dept: "MECH", credits: 4 },
                { code: "ME603", title: "Design of Machine Elements", dept: "MECH", credits: 4 },
                { code: "EE601", title: "Electrical Machines I & II", dept: "EEE", credits: 4 },
                { code: "EE602", title: "Power Systems Analysis", dept: "EEE", credits: 4 },
              ].map((c, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#0B192C]">{c.title}</p>
                      <p className="text-[11px] text-gray-500">Department: {c.dept}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded">
                    {c.credits} Credits
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setShowCoursesModal(false)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW PUBLISHED RESULTS */}
      {showPublishedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2.5">
                <Globe size={20} className="text-[#D4A72C]" />
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    University Published Results Portal
                  </h3>
                  <p className="text-[11px] text-[#D4A72C]">
                    Karpaga Vinayaga Gazette Live Verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPublishedModal(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Result Gazette Published
                </p>
                <p className="text-emerald-700 mt-1">
                  Autonomous Semester 1 Results are verified and accessible to students.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-gray-200 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Gazette Verification Details
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Institution:</span>
                    <p className="font-bold text-[#0B192C]">Karpaga Vinayaga College of Eng &amp; Tech</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Active Candidates:</span>
                    <p className="font-bold text-[#0B192C]">216 Students</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Departments Released:</span>
                    <p className="font-bold text-[#0B192C]">12 Branches</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Endorsed By:</span>
                    <p className="font-bold text-[#0B192C]">Dean of Academics</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
              <button
                onClick={() => setShowPublishedModal(false)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssociateDeanDashboard;
