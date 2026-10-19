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
import { StudentDataView } from "./dean/StudentDataView";
import { InternalMarksView } from "./dean/InternalMarksView";
import { AnswerScriptsView } from "./dean/AnswerScriptsView";
import { PublishedResultsView } from "./dean/PublishedResultsView";
import { DepartmentsView } from "./dean/DepartmentsView";
import { SubjectsView } from "./dean/SubjectsView";
import { QuestionPaperReviewView, INITIAL_QUESTION_PAPERS, safeLoadQuestionPapers } from "./dean/QuestionPaperReviewView";

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
    code: "AIDS",
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
  // Navigation & View state
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [resultsMenuOpen, setResultsMenuOpen] = useState<boolean>(true);
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
      return 3;
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
    return () => {
      window.removeEventListener("kvell_qp_updated", updateQpCount);
      window.removeEventListener("storage", updateQpCount);
    };
  }, []);

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
        deptCode: "AIDS",
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
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                  ENGINEERING
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

            {/* Stage 3 Question Paper Review - Dedicated First-Class Item */}
            <button
              onClick={() => {
                setActiveNav("question-paper-review");
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                activeNav === "question-paper-review"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-extrabold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckSquare size={17} />
                <span>Question Paper Review</span>
              </div>
              {pendingQpCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-400 text-slate-950 animate-pulse">
                  {pendingQpCount}
                </span>
              )}
            </button>

            {/* Results Collapsible Menu */}
            <div>
              <button
                onClick={() => setResultsMenuOpen(!resultsMenuOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeNav.startsWith("results") || [
                    "student-data",
                    "internal-marks",
                    "answer-scripts",
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

                  {/* Revaluation Requests */}
                  <button
                    onClick={() => {
                      setActiveNav("revaluation");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
                      activeNav === "revaluation"
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <RotateCcw size={14} />
                    <span>Revaluation Requests</span>
                  </button>

                  {/* Question Paper Review (HOD Submissions) */}
                  <button
                    onClick={() => {
                      setActiveNav("question-paper-review");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left ${
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
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-400 text-slate-950">
                        {pendingQpCount}
                      </span>
                    )}
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
                setShowFacultyModal(true);
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "faculty"
                  ? "bg-[#EAB308] text-[#0B192C] shadow-md font-bold"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserCheck size={17} />
              <span>Faculty & HODs</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Bar matching screenshot */}
        <div className="p-3 border-t border-white/10 bg-[#081322] flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 font-mono shrink-0">
              ENG
            </span>
            <div className="overflow-hidden">
              <p
                className="text-xs font-bold text-white truncate max-w-[145px]"
                title="Dean of Academics"
              >
                Dean of Academics
              </p>
              <p className="text-[9px] font-bold text-[#D4A72C] uppercase tracking-wider truncate">
                ROLE: DEAN OF ACADEMICS
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
      <main className="flex-1 lg:pl-72 min-h-screen flex flex-col">
        {/* Mobile Top App Bar */}
        <div className="lg:hidden bg-[#0B192C] text-white px-4 py-3 border-b border-[#D4A72C]/20 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg bg-white/10 text-white"
            >
              <Menu size={20} />
            </button>
            <span className="text-xs font-black tracking-wide text-white uppercase">
              Karpaga Vinayaga Portal
            </span>
          </div>
          <button
            onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
            className="p-1.5 rounded-full bg-white text-[#0B192C]"
          >
            <Bell size={16} />
          </button>
        </div>

        {/* Body Container */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-7 max-w-[1600px] w-full mx-auto">
          {/* TOP BANNER WITH SEAL & KYRO TIGER MASCOT - Exactly matching screenshot */}
          <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Left: Seal Logo + Badges + College Title */}
            <div className="relative z-10 flex items-center gap-4 sm:gap-5 max-w-3xl">
              <img
                src="/engineering-logo.png"
                alt="College Seal"
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white p-1 border-2 border-[#D4A72C] shrink-0 object-contain shadow-lg"
              />
              <div>
                <span className="bg-[#EAB308] text-[#0B192C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-1.5 shadow-sm">
                  OFFICE OF THE DEAN OF ACADEMICS
                </span>
                <h1 className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
                  Karpaga Vinayaga College of Engineering and Technology
                </h1>
                <p className="text-xs text-[#D4A72C] font-semibold mt-1">
                  {activeNav === "student-data"
                    ? "Student Data"
                    : activeNav === "internal-marks"
                    ? "Internal Marks"
                    : activeNav === "answer-scripts"
                    ? "Answer Script Entry"
                    : activeNav === "published-results"
                    ? "Published Examination Results"
                    : activeNav === "revaluation"
                    ? "Revaluation Requests"
                    : activeNav === "question-paper-review"
                    ? "Question Paper Review & COE Forwarding"
                    : activeNav === "departments"
                    ? "University Department Directory & Management"
                    : activeNav === "subjects"
                    ? "COE Subject Catalog & Finalization Hub"
                    : "University Admin Dashboard"}
                </p>
              </div>

              {/* Tiger Mascot standing on the right edge of title */}
              <div className="hidden xl:block shrink-0 -my-4 ml-2">
                <img
                  src="/kyro-standing.png"
                  alt="Kyro Mascot"
                  className="h-28 object-contain drop-shadow-xl select-none pointer-events-none"
                />
              </div>
            </div>

            {/* Right: Bell Icon & Profile Badge */}
            <div className="flex items-center gap-4 relative z-10 self-end md:self-center">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
                  className="h-10 w-10 rounded-full bg-white text-[#0B192C] flex items-center justify-center hover:bg-slate-100 transition shadow cursor-pointer"
                  title="View Academic Notifications"
                >
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#0B192C]" />
                </button>

                {/* Notification Dropdown Drawer */}
                {showNotificationDrawer && (
                  <div className="absolute right-0 mt-3 w-80 bg-white text-[#0B192C] rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                        Academic Alerts & Gazette
                      </span>
                      <button
                        onClick={() => setShowNotificationDrawer(false)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="space-y-2.5 mt-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="font-bold text-[#0B192C]">AI&DS (AI602) Moderation Complete</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          +2 BoS grace marks approved. Awaiting final Dean gazette sign-off.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="font-bold text-[#0B192C]">CSE (CS601) Mark Entry Verified</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          20/20 students submitted. 95% pass rate.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="font-bold text-[#0B192C]">Central Exam Session Active</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          Autonomous valuation wing operational on Port 3000.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Card */}
              <div className="text-right">
                <p className="text-xs font-extrabold text-white leading-tight">
                  Dean of Academics (Engineering)
                </p>
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest block">
                  ADMIN
                </span>
              </div>
            </div>
          </div>

          {/* DASHBOARD VIEW CONTENT */}
          {activeNav === "dashboard" && (
            <div className="space-y-7">
              {/* METRIC DIRECTORY TITLE & TOP ACTION BUTTONS - Exact match */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#D4A72C]" />
                  LIVE UNIVERSITY METRIC DIRECTORY · CLICK ANY CARD TO INSPECT &amp; MANAGE
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveNav("question-paper-review")}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs transition shadow flex items-center gap-2 cursor-pointer"
                  >
                    <CheckSquare size={15} /> Question Paper Review {pendingQpCount > 0 ? `(${pendingQpCount} Pending)` : ""}
                  </button>
                  <button
                    onClick={handleExportAllStudents}
                    className="px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-extrabold text-xs transition shadow flex items-center gap-2 cursor-pointer"
                  >
                    <Upload size={15} /> Student Data Excel/CSV
                  </button>
                  <button
                    onClick={() => setShowPublishedModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-extrabold text-xs transition flex items-center gap-2 border border-white/20 cursor-pointer shadow"
                  >
                    <Globe size={15} /> View Published Results
                  </button>
                </div>
              </div>

              {/* 4 METRIC CARDS - Exact match */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Card 1: Total Students (216) */}
                <div
                  onClick={() => setShowStudentsModal(true)}
                  className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                        TOTAL STUDENTS
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                        216
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                      <Users size={22} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-[#1D8A5A] flex items-center gap-1">
                      <CheckCircle2 size={13} /> Active Enrolled
                    </span>
                    <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                      View Roster <ChevronRight size={13} />
                    </span>
                  </div>
                </div>

                {/* Card 2: Total Departments (12) */}
                <div
                  onClick={() => setActiveNav("departments")}
                  className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                        TOTAL DEPARTMENTS
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                        12
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                      <Building2 size={22} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-[#B08014] font-mono">
                      12 Active Branches
                    </span>
                    <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                      Manage Depts <ChevronRight size={13} />
                    </span>
                  </div>
                </div>

                {/* Card 3: Total Faculty & HODs (24) */}
                <div
                  onClick={() => setShowFacultyModal(true)}
                  className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                        TOTAL FACULTY &amp; HODS
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                        24
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                      <UserCheck size={22} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-gray-500">
                      Assigned Dept Heads
                    </span>
                    <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                      View Faculty <ChevronRight size={13} />
                    </span>
                  </div>
                </div>

                {/* Card 4: Total Courses (50) */}
                <div
                  onClick={() => setActiveNav("subjects")}
                  className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                        TOTAL COURSES
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                        50
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                      <BookOpen size={22} />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-gray-500">
                      Active Curriculum
                    </span>
                    <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                      Open Catalog <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              </div>

              {/* HOD Question Paper Review Alert Banner for Associate Dean */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[#0B192C] text-white border-2 border-[#D4A72C]/40 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-[#D4A72C]/20 border border-[#D4A72C]/40 flex items-center justify-center text-[#D4A72C] shrink-0">
                    <CheckSquare size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-white">
                        HOD Question Paper Submissions Awaiting Review
                      </h3>
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                        {pendingQpCount} Awaiting AD Action
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Verify Bloom&apos;s Taxonomy, CO mapping, and syllabus coverage before approving and forwarding to the Controller of Examinations (COE).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveNav("question-paper-review")}
                  className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#e2b435] text-[#0B192C] text-xs font-black transition flex items-center gap-1.5 shadow shrink-0 cursor-pointer"
                >
                  <span>Review Question Papers</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* UNIVERSITY ACADEMIC MATRIX & BRANCH DIRECTORY - Exact match */}
              <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black text-[#D4A72C] uppercase tracking-wider mb-1">
                      <Building2 size={15} />
                      UNIVERSITY ACADEMIC MATRIX &amp; BRANCH DIRECTORY
                    </div>
                    <h2 className="font-display font-bold text-xl text-[#0B192C]">
                      Department Enrolled Candidates &amp; Quick Action Center
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Select any department to jump directly into Student Roster, Examination Mark Entry, or Performance Analytics.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowDepartmentsModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-[#F8F5EE] hover:bg-[#E5E1D8] text-[#0B192C] text-xs font-bold transition border border-[#E5E1D8] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Building2 size={14} className="text-[#D4A72C]" />
                      <span>Configure Departments</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDeptFilter("all");
                        setShowStudentsModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-extrabold transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Users size={14} className="text-[#D4A72C]" />
                      <span>Inspect All Students (216)</span>
                    </button>
                  </div>
                </div>

                {/* 3-Column Grid of 12 Department Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((dept) => {
                    return (
                      <div
                        key={dept.key}
                        className="p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between bg-white border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-black text-[#0B192C] bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 rounded-lg">
                              {dept.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                dept.studentCount > 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {dept.studentCount} {dept.studentCount === 1 ? "Student" : "Students"}
                            </span>
                          </div>

                          <h3 className="font-display font-bold text-sm text-[#0B192C] line-clamp-1" title={dept.name}>
                            {dept.name}
                          </h3>
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            HOD: <span className="font-semibold text-gray-700">{dept.headName}</span>
                          </p>
                        </div>

                        {/* Bottom Action Buttons: Roster | Marks | Chart */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedDeptFilter(dept.code);
                              setShowStudentsModal(true);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-[#F8F5EE] hover:bg-[#E5E1D8] text-[#0B192C] text-[11px] font-extrabold transition text-center border border-[#E5E1D8] cursor-pointer"
                            title={`Inspect ${dept.code} student roster`}
                          >
                            Roster
                          </button>
                          <button
                            onClick={() => {
                              setActiveNav("internal-marks");
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-[#0B192C] hover:bg-[#132943] text-white text-[11px] font-extrabold transition text-center shadow-sm cursor-pointer"
                            title={`View internal marks for ${dept.code}`}
                          >
                            Marks
                          </button>
                          <button
                            onClick={() => {
                              setActiveNav("analytics");
                            }}
                            className="p-1.5 rounded-lg bg-[#D4A72C]/20 hover:bg-[#D4A72C]/30 text-[#0B192C] transition border border-[#D4A72C]/50 cursor-pointer"
                            title={`View analytics for ${dept.code}`}
                          >
                            <BarChart3 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STUDENT DATA VIEW (Matching Image 1) */}
          {activeNav === "student-data" && <StudentDataView />}

          {/* INTERNAL MARKS VIEW (Matching Image 2) */}
          {activeNav === "internal-marks" && <InternalMarksView />}

          {/* ANSWER SCRIPTS VIEW (Matching Image 3 with View instead of Upload) */}
          {activeNav === "answer-scripts" && <AnswerScriptsView />}

          {/* PUBLISHED RESULTS VIEW (Matching Image 4) */}
          {activeNav === "published-results" && <PublishedResultsView />}

          {/* DEPARTMENTS VIEW (Matching Image 1) */}
          {activeNav === "departments" && <DepartmentsView />}

          {/* SUBJECTS & ELECTIVES VIEW (Matching Image 2) */}
          {activeNav === "subjects" && <SubjectsView />}

          {/* QUESTION PAPER REVIEW VIEW (Dedicated Component in AD Panel) */}
          {activeNav === "question-paper-review" && (
            <QuestionPaperErrorBoundary
              onReset={() => {
                localStorage.removeItem("kvell_assoc_dean_question_papers");
                window.dispatchEvent(new Event("kvell_qp_updated"));
                showToast("Restored initial question paper dataset!");
              }}
            >
              <QuestionPaperReviewView onToast={showToast} />
            </QuestionPaperErrorBoundary>
          )}


          {/* REVALUATION REQUESTS VIEW */}
          {activeNav === "revaluation" && (
            <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="font-display font-bold text-xl text-[#0B192C]">
                  Revaluation &amp; Answer Script Photocopy Requests
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Student grievance applications for re-totalling and external evaluation review.
                </p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-gray-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Application ID</th>
                      <th className="py-3 px-4">Register No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Original Mark</th>
                      <th className="py-3 px-4">Request Type</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    <tr>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">REV-2026-001</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0B192C]">20260110201014</td>
                      <td className="py-3 px-4 font-bold text-gray-800">SANJAY RAM K</td>
                      <td className="py-3 px-4">CS601 Data Structures</td>
                      <td className="py-3 px-4 font-mono text-amber-700 font-bold">46 (RA)</td>
                      <td className="py-3 px-4 font-semibold text-gray-600">Revaluation + Script Copy</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => showToast("Revaluation Assigned to External Evaluator")}
                          className="px-3 py-1 rounded-lg bg-[#0B192C] text-white text-[11px] font-bold hover:bg-[#152744]"
                        >
                          Approve Review
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ANALYTICS VIEW */}
          {activeNav === "analytics" && (
            <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="font-display font-bold text-xl text-[#0B192C]">
                  Department Performance &amp; Pass Rate Analytics
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Comparative pass percentage and distinction distribution across engineering streams.
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { dept: "AIDS", pass: 94.0, count: 50 },
                      { dept: "BME", pass: 92.8, count: 28 },
                      { dept: "BT", pass: 96.0, count: 25 },
                      { dept: "CSE", pass: 95.0, count: 20 },
                      { dept: "ECE", pass: 91.4, count: 35 },
                      { dept: "MECH", pass: 89.6, count: 48 },
                      { dept: "IT", pass: 90.0, count: 10 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E1D8" />
                    <XAxis dataKey="dept" stroke="#667085" fontSize={11} />
                    <YAxis domain={[80, 100]} stroke="#667085" fontSize={11} unit="%" />
                    <ChartTooltip />
                    <Bar dataKey="pass" fill="#0B192C" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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
                {["all", "AIDS", "BME", "BT", "CSE", "ECE", "MECH", "IT"].map((dept) => (
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
                { name: "Dr. S. Mohan", role: "HOD", dept: "AI&DS", exp: "14 Years" },
                { name: "Prof. K. Venkatesh", role: "Associate Professor", dept: "AI&DS", exp: "9 Years" },
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
                { code: "AI601", title: "Artificial Intelligence Foundations", dept: "AIDS", credits: 4 },
                { code: "AI602", title: "Deep Learning & Neural Architectures", dept: "AIDS", credits: 4 },
                { code: "AI603", title: "Natural Language Processing", dept: "AIDS", credits: 3 },
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
