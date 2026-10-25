import { useEffect, useMemo, useRef, useState } from "react";
// Sample lists for the remaining demo-only screens (Faculty performance / Dean); real results come from the API
import { facultyApi, publicApi, type FacultyOverviewDTO, type PublicSummaryDTO } from "../services/api";
import { apiErrorMessage, authApi, hodApi, studentApi, type HodOverviewDTO, type RegisteredSubjectDTO, type RevaluationRequestDTO, type StudentResultsDTO } from "../services/api";

const ADMIN_PANEL_URL = import.meta.env.VITE_ADMIN_PANEL_URL || "http://localhost:3002/admin/login";
import * as XLSX from "xlsx";
import { downloadWorkbook } from "../utils/downloadWorkbook";
import { NotificationBell } from "../components/NotificationBell";
import { FacultyBanner } from "../components/FacultyBanner";
import { PublishedResultsDownload } from "../components/PublishedResultsDownload";
import { useSystemConfig, isStudentPortalClosed, isRevaluationOpen } from "../utils/systemConfig";
import type { PublishedBatch } from "../utils/publishedResults";
import { FacultyMarkEntry, clearFacultyPharmacyAndNursingData } from "../components/FacultyMarkEntry";
import { AssociateDeanDashboard } from "../components/AssociateDeanDashboard";
import { QuestionPaperReviewView, safeLoadQuestionPapers } from "../components/dean/QuestionPaperReviewView";
import { FacultyQuestionPaperView } from "../components/FacultyQuestionPaperView";
import { MarkApprovalsView } from "../components/MarkApprovalsView";
import { PortalShell } from "../components/PortalShell";
import { FacultyPaperCorrectionView } from "../components/FacultyPaperCorrectionView";
import { HodQuestionPaperScrutinyView } from "../components/HodQuestionPaperScrutinyView";
import {
  safeLoadNotifications,
  DeanExamNotification,
} from "../components/dean/ExamTimetableNotificationView";
import { FacultyExamNotificationsView } from "../components/FacultyExamNotificationsView";
import { HodExamNotificationsView } from "../components/HodExamNotificationsView";
import type { LucideIcon } from "lucide-react";
import { StudentQuizzes } from "../components/QuizEditor";
import { HallPlansView } from "../components/HallPlansView";
import { StudentResultNotes, StudentSeatingCards } from "../components/StudentExtras";
import { HodAnalytics } from "../components/hodAnalytics/HodAnalytics";
import { CoAssessment } from "../components/CoAssessment";
import { StudentExitSurvey } from "../components/StudentExitSurvey";
import { startSharedStore } from "../services/sharedStore";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock,
  Clock3,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  FileBarChart,
  FileCheck,
  FileText,
  GraduationCap,
  KeyRound,
  UserRound,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PenLine,
  PieChart,
  ClipboardCheck,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlock,
  Upload,
  User,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

type Role = "Student" | "Faculty" | "HOD" | "Associate Dean" | "Dean" | "Admin";
type PageKey =
  | "dashboard"
  | "subjects"
  | "marks"
  | "hall-allotment"
  | "performance"
  | "students"
  | "reports"
  | "faculty"
  | "at-risk"
  | "departments"
  | "trends"
  | "dean-review"
  | "admin"
  | "electives"
  | "elective-demand"
  | "verification"
  | "noticeboard"
  | "internal-marks"
  | "paper-correction"
  | "question-paper";

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}

interface StatusBadgeProps {
  children: React.ReactNode;
  tone: "success" | "warning" | "danger" | "neutral";
}

const roleMeta: Record<
  Role,
  { name: string; roleLabel: string; initials: string; department: string }
> = {
  Student: {
    name: "",
    roleLabel: "Student (B.Tech CSE)",
    initials: "",
    department: "Computer Science & Engineering",
  },
  Faculty: {
    name: "",
    roleLabel: "Faculty",
    initials: "",
    department: "Computer Science & Engineering",
  },
  HOD: {
    name: "",
    roleLabel: "Head of Department (CSE)",
    initials: "",
    department: "Computer Science & Engineering",
  },
  "Associate Dean": {
    name: "",
    roleLabel: "Associate Dean (Academics & Evaluation)",
    initials: "",
    department: "Office of the Associate Dean",
  },
  Dean: {
    name: "",
    roleLabel: "Dean of Academics",
    initials: "",
    department: "Academic Affairs",
  },
  Admin: {
    name: "",
    roleLabel: "System Administrator",
    initials: "",
    department: "University Administration",
  },
};

const roleNav: Record<Role, NavItem[]> = {
  Student: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "performance", label: "My Results", icon: BarChart3 },
    { key: "subjects", label: "My Courses", icon: BookOpen },
    { key: "reports", label: "Transcripts", icon: FileText },
  ],
  Faculty: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "noticeboard", label: "Exam Notifications", icon: Bell },
    { key: "internal-marks", label: "Internal Marks", icon: ClipboardCheck },
    { key: "paper-correction", label: "Paper Correction", icon: FileText },
    { key: "hall-allotment", label: "Hall Allotment", icon: LayoutDashboard },
    { key: "question-paper", label: "Question Papers", icon: FileCheck },
  ],
  HOD: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "noticeboard", label: "Exam Notifications", icon: Bell },
    { key: "question-paper", label: "Question Papers", icon: FileCheck },
    { key: "faculty", label: "Faculty", icon: GraduationCap },
    { key: "students", label: "Students", icon: UsersRound },
    { key: "performance", label: "Performance", icon: BarChart3 },
    { key: "at-risk", label: "At-Risk Students", icon: ShieldAlert },
    { key: "reports", label: "Reports", icon: FileText },
  ],
  "Associate Dean": [
    { key: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
    { key: "question-paper", label: "Question Paper Review", icon: CheckSquare },
    { key: "dean-review", label: "Mark Scrutiny & Moderation", icon: FileBarChart },
    { key: "departments", label: "Department Matrix", icon: Building2 },
    { key: "performance", label: "Performance Audit", icon: BarChart3 },
    { key: "at-risk", label: "At-Risk Interventions", icon: ShieldAlert },
    { key: "trends", label: "Trends", icon: TrendingUp },
    { key: "reports", label: "Reports", icon: FileText },
  ],
  Dean: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "question-paper", label: "Question Paper Review", icon: CheckSquare },
    { key: "departments", label: "Departments", icon: Building2 },
    { key: "dean-review", label: "Mark Review", icon: FileBarChart },
    { key: "performance", label: "Performance", icon: BarChart3 },
    { key: "trends", label: "Trends", icon: TrendingUp },
    { key: "at-risk", label: "At-Risk Students", icon: ShieldAlert },
    { key: "reports", label: "Reports", icon: FileText },
  ],
  Admin: [
    { key: "question-paper", label: "Question Papers Hub", icon: FileCheck },
    { key: "students", label: "Students Directory", icon: UsersRound },
    { key: "admin", label: "User Access & Add Student", icon: UserPlus },
    { key: "electives", label: "Create Elective Group", icon: BookOpen },
    { key: "elective-demand", label: "Elective Demand", icon: BarChart3 },
  ],
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function UniversityLogo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2")}>
      <div className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border", compact ? "h-9 w-9" : "h-12 w-12", inverted ? "border-white/20 bg-white" : "border-[#EED6B5] bg-white")}>
        <img src="/kvell_university_logo.png" alt="KVELL UNIVERSITY official seal" className="h-full w-full object-contain p-0.5" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className={cn("text-[13px] font-bold leading-4 tracking-[-0.02em]", inverted ? "text-white" : "text-[#FC6226]")}>KVELL UNIVERSITY</p>
          <p className={cn("mt-1 max-w-[230px] text-[10px] leading-4", inverted ? "text-[#FFE8C2]" : "text-slate-500")}>Karpaga Vinayaga Educational Lore for Learning Deemed to be University</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ children, tone }: StatusBadgeProps) {
  const tones = {
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", tones[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-[10px] border border-[#EED6B5]/70 bg-white card-shadow", className)}>{children}</section>;
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>}
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
        {detail && <p className="mt-1 text-[12px] text-slate-500">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

function KpiCard({ label, value, note, icon: Icon, trend, tone = "navy" }: { label: string; value: string; note: string; icon: LucideIcon; trend?: "up" | "down" | "flat"; tone?: "navy" | "amber" | "green" }) {
  const iconClass = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "green" ? "bg-green-50 text-green-700" : "bg-[#FFE8C2] text-[#8C2F00]";
  return (
    <Panel className="reveal-up flex min-h-[142px] flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconClass)}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
        {trend && (
          <span className={cn("flex items-center gap-1 text-[11px] font-semibold", trend === "down" ? "text-red-700" : trend === "up" ? "text-green-700" : "text-slate-500")}>
            {trend === "down" ? <ArrowDownRight size={13} /> : trend === "up" ? <ArrowUpRight size={13} /> : <Activity size={13} />}
            {trend === "down" ? "Needs review" : trend === "up" ? "vs last cycle" : "current cycle"}
          </span>
        )}
      </div>
      <div>
        <p className="mt-4 text-[12px] font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
        <p className="mt-1 text-[11px] text-slate-400">{note}</p>
      </div>
    </Panel>
  );
}

function MiniProgress({ value, color = "#FC6226" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; dataKey?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-xs font-semibold text-slate-900">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          {item.value}%
        </p>
      ))}
    </div>
  );
}

function EmptyChartState({ label = "No data available" }: { label?: string }) {
  return <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-400">{label}</div>;
}

interface FacultyCourse {
  id: string;
  code: string;
  title: string;
  department: string;
  deptShort: string;
  semester: string;
  section: string;
  type: "Theory" | "Laboratory" | "Elective";
  enrolledStudents: number;
  evaluatedStudents: number;
  passRate: number;
  avgScore: number;
  faculty?: string;
  status: "In Progress" | "Completed" | "Pending";
}

type FacultyCollege = "Engineering" | "Pharmacy" | "Nursing";

interface FacultyCollegeProfile {
  collegeKey: FacultyCollege;
  collegeName: string;
  collegeSubtitle: string;
  shortName: string;
  icon: string;
  facultyName: string;
  examinerId: string;
  department: string;
  badgeBg: string;
  badgeText: string;
  hodName: string;
  logoUrl: string;
  courses: FacultyCourse[];
}

const FACULTY_COLLEGES: Record<FacultyCollege, FacultyCollegeProfile> = {
  Engineering: {
    collegeKey: "Engineering",
    collegeName: "Karpaga Vinayaga College of Engineering and Technology",
    collegeSubtitle: "Approved by AICTE & UGC · Affiliated to Anna University · NAAC Accredited",
    shortName: "Engineering",
    icon: "⚙️",
    logoUrl: "/engineering-logo.png",
    facultyName: "",
    examinerId: "",
    department: "Computer Science & Engineering",
    badgeBg: "bg-amber-100 border-amber-300",
    badgeText: "text-amber-900",
    hodName: "",
    courses: [],
  },
  Pharmacy: {
    collegeKey: "Pharmacy",
    collegeName: "Karpaga Vinayaga Institute for Pharmaceutical Sciences",
    collegeSubtitle: "Approved by Pharmacy Council of India (PCI) · Affiliated to The TN Dr. M.G.R. Medical University",
    shortName: "Pharmacy",
    icon: "💊",
    logoUrl: "/pharmacy-logo.png",
    facultyName: "",
    examinerId: "",
    department: "Pharmaceutics & Pharmaceutical Analysis",
    badgeBg: "bg-emerald-100 border-emerald-300",
    badgeText: "text-emerald-900",
    hodName: "",
    courses: [],
  },
  Nursing: {
    collegeKey: "Nursing",
    collegeName: "Karpaga Vinayaga College of Nursing",
    collegeSubtitle: "Approved by Indian Nursing Council (INC) & TN Nurses Council · Affiliated to The TN Dr. M.G.R. Medical University",
    shortName: "Nursing",
    icon: "🏥",
    logoUrl: "/nursing-logo.png",
    facultyName: "",
    examinerId: "",
    department: "Medical-Surgical & Clinical Nursing",
    badgeBg: "bg-sky-100 border-sky-300",
    badgeText: "text-sky-900",
    hodName: "",
    courses: [],
  },
};

function FacultyDashboard({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [activeCollege, setActiveCollege] = useState<FacultyCollege>(() => {
    const saved = localStorage.getItem("kvell_faculty_college");
    if (saved === "Pharmacy" || saved === "Nursing" || saved === "Engineering") return saved as FacultyCollege;
    return "Engineering";
  });

  const currentCollege = FACULTY_COLLEGES[activeCollege] || FACULTY_COLLEGES.Engineering;

  // Real data for the signed-in faculty member: their subjects with live mark-entry progress
  const [overview, setOverview] = useState<FacultyOverviewDTO | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  useEffect(() => {
    facultyApi
      .overview()
      .then(setOverview)
      .catch((err) => setOverviewError(apiErrorMessage(err, "Could not load your subjects.")));
  }, []);
  // Published results of the faculty member's own department (the server scopes them), for Excel download
  const [published, setPublished] = useState<PublishedBatch[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(true);
  const [publishedError, setPublishedError] = useState<string | null>(null);
  useEffect(() => {
    facultyApi
      .publishedResults()
      .then(setPublished)
      .catch((err) => setPublishedError(apiErrorMessage(err, "Could not load published results.")))
      .finally(() => setPublishedLoading(false));
  }, []);
  const courses = overview?.courses ?? [];
  const [courseFilter, setCourseFilter] = useState<"ALL" | "Theory" | "Laboratory">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showGradeAnalyticsModal, setShowGradeAnalyticsModal] = useState(false);
  const [examNotifs, setExamNotifs] = useState<DeanExamNotification[]>(() => safeLoadNotifications());

  useEffect(() => {
    const handleUpdate = () => {
      setExamNotifs(safeLoadNotifications());
    };
    window.addEventListener("kvell_exam_notification_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("kvell_exam_notification_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Dynamic Functional Metrics
  // Each student takes every subject of their semester, so count them once per semester (not once per subject)
  const totalStudents = useMemo(() => {
    const perSemester = new Map<string, number>();
    courses.forEach((c) => perSemester.set(c.semester, Math.max(perSemester.get(c.semester) ?? 0, c.enrolledStudents)));
    return Array.from(perSemester.values()).reduce((a, b) => a + b, 0);
  }, [courses]);
  const totalScripts = useMemo(() => courses.reduce((acc, c) => acc + c.enrolledStudents, 0), [courses]);
  const totalCourses = courses.length;
  const totalEvaluated = useMemo(
    () => courses.reduce((acc, c) => acc + c.evaluatedStudents, 0),
    [courses]
  );
  const marksProgress = totalScripts > 0 ? Math.round((totalEvaluated / totalScripts) * 100) : 0;
  const passRate =
    courses.length > 0
      ? (courses.reduce((acc, c) => acc + c.passRate, 0) / courses.length).toFixed(1)
      : "0.0";

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesFilter = courseFilter === "ALL" || c.type === courseFilter;
      const matchesSearch =
        !searchQuery ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [courses, courseFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Live University Metric Directory Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#8A6410]">
          <Sparkles size={14} className="text-[#D4A72C]" />
          <span>LIVE UNIVERSITY METRIC DIRECTORY · CLICK ANY CARD TO INSPECT &amp; MANAGE</span>
        </div>
        {/* The dashboard's actions (the navy college card above them is now the portal's top bar) */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigate("marks")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] px-5 py-2.5 text-xs font-black shadow-md transition cursor-pointer"
          >
            <PenLine size={16} strokeWidth={2.5} />
            <span>Enter Internal Marks</span>
          </button>
          <button
            onClick={() => {
              if (totalStudents > 0) setShowRosterModal(true);
              else onNavigate("marks");
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white px-5 py-2.5 text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Users size={16} />
            <span>Student Roster ({totalStudents})</span>
          </button>
        </div>
      </div>

      {/* 4 Functional Stat Cards matching Image 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL STUDENTS */}
        <div
          onClick={() => {
            if (totalStudents > 0) setShowRosterModal(true);
            else onNavigate("marks");
          }}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#D4A72C] hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                TOTAL STUDENTS
              </p>
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#8A6410] transition">
                {totalStudents}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] transition">
              <Users size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="flex items-center gap-1 font-bold text-emerald-700">
              <CheckCircle2 size={13} />
              <span>Active Enrolled</span>
            </span>
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#8A6410] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              <span>View Roster</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Card 2: ASSIGNED COURSES */}
        <div
          onClick={() => {
            setCourseFilter("ALL");
            onNavigate("marks");
          }}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#D4A72C] hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                ASSIGNED COURSES
              </p>
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#8A6410] transition">
                {totalCourses}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] transition">
              <BookOpen size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="font-bold text-[#8A6410]">
              {totalCourses > 0 ? "Active Curriculum" : "0 Active Branches"}
            </span>
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#8A6410] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              <span>Open Catalog</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Card 3: MARKS PROGRESS */}
        <div
          onClick={() => onNavigate("marks")}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#D4A72C] hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                MARKS PROGRESS
              </p>
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#8A6410] transition">
                {marksProgress}%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] transition">
              <PenLine size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="font-bold text-blue-700">
              {totalScripts > 0 ? `${totalEvaluated} / ${totalScripts} scripts evaluated` : "No submissions yet"}
            </span>
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#8A6410] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              <span>Enter Marks</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>

        {/* Card 4: CLASS PASS RATE */}
        <div
          onClick={() => {
            if (totalCourses > 0) setShowGradeAnalyticsModal(true);
            else onNavigate("marks");
          }}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#D4A72C] hover:shadow-lg transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                CLASS PASS RATE
              </p>
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#8A6410] transition">
                {passRate}%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] transition">
              <BarChart3 size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="font-bold text-indigo-700">
              {totalCourses > 0 ? "Overall Cohort" : "No assessment data"}
            </span>
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#8A6410] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              <span>Grade Analytics</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* Question Paper Quick Action Banner for Faculty (Stage 1 ➔ Stage 2 HOD Scrutiny) */}
      <div
        onClick={() => onNavigate("question-paper")}
        className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-r from-amber-50/80 via-white to-amber-50/40 p-5 shadow-xs hover:border-[#D4A72C] hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B192C] text-[#D4A72C] shrink-0 shadow-sm">
            <FileCheck size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase bg-[#D4A72C] text-[#0B192C] px-2 py-0.5 rounded">
                STAGE 1 ➔ STAGE 2
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                OFFICIAL QUESTION PAPER WORKFLOW
              </span>
            </div>
            <h3 className="text-base font-black text-[#0B192C] mt-1">
              Draft &amp; Submit Question Papers to HOD for DAC Scrutiny
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Prepare Part A (20M), Part B (65M with choices), Part C (15M) mapped to Bloom&apos;s Taxonomy (K1–K6) and Course Outcomes (CO1–CO5). Submit to your HOD for scrutiny.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black text-[#0B192C] group-hover:text-[#B08014] transition flex items-center gap-1 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
            <span>Open Question Papers</span>
            <ChevronRight size={14} />
          </span>
        </div>
      </div>

      {/* University Academic Matrix & Branch Directory (matching Image 2) */}
      <Panel className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#D4A72C]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8A6410]">
                UNIVERSITY ACADEMIC MATRIX &amp; BRANCH DIRECTORY
              </span>
            </div>
            <h2 className="mt-1.5 text-xl font-black text-[#0B192C]">
              Department Enrolled Candidates &amp; Quick Action Center
            </h2>
            <p className="mt-1 text-xs text-slate-500 font-semibold">
              Select any department to jump directly into Student Roster, Examination Mark Entry, or Performance Analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {courses.length > 0 && (
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCourseFilter("ALL")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition",
                    courseFilter === "ALL"
                      ? "bg-white text-[#0B192C] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  All ({courses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("Theory")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition",
                    courseFilter === "Theory"
                      ? "bg-white text-[#0B192C] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Theory
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("Laboratory")}
                  className={cn(
                    "rounded-lg px-3 py-1.5 transition",
                    courseFilter === "Laboratory"
                      ? "bg-white text-[#0B192C] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Practical
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (totalStudents > 0) setShowRosterModal(true);
                else onNavigate("marks");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#F8F5EE] hover:bg-slate-200/80 px-4 py-2.5 text-xs font-extrabold text-slate-700 transition cursor-pointer"
            >
              <SlidersHorizontal size={14} className="text-[#D4A72C]" />
              <span>Configure Departments</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (totalStudents > 0) setShowRosterModal(true);
                else onNavigate("marks");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B192C] hover:bg-[#162a45] px-4 py-2.5 text-xs font-black text-white transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Users size={14} className="text-[#D4A72C]" />
              <span>Inspect All Students ({totalStudents})</span>
            </button>
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 pt-6">
            {filteredCourses.map((course) => {
              const pct =
                course.enrolledStudents > 0
                  ? Math.round((course.evaluatedStudents / course.enrolledStudents) * 100)
                  : 0;
              const isCompleted = course.evaluatedStudents === course.enrolledStudents;

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-[#D4A72C]/80 hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-lg bg-[#0B192C] px-2.5 py-1 font-mono text-xs font-black text-[#D4A72C] shadow-xs">
                          {course.code}
                        </span>
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {course.department} · {course.section}
                        </span>
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {course.semester}
                        </span>
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {course.type}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                          <CheckCircle2 size={11} />
                          Evaluated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-800 shrink-0">
                          <Clock size={11} />
                          Evaluation Active
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-sm font-extrabold text-[#0B192C]">
                      {course.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 font-medium">
                      Faculty: {(overview?.facultyName ?? "Loading…")}
                    </p>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                        <span>Internal Mark Progress</span>
                        <span className="text-[#0B192C]">
                          {course.evaluatedStudents} / {course.enrolledStudents} students ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            isCompleted
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-[#D4A72C] to-[#FC6226]"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] pt-1.5 border-t border-slate-200/60">
                        <div>
                          <span className="block text-slate-400 font-semibold">Pass Rate</span>
                          <strong className="text-emerald-700 font-extrabold">{course.passRate}%</strong>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-semibold">Avg Internal Score</span>
                          <strong className="text-[#0B192C] font-extrabold">{course.avgScore} / 100</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {course.enrolledStudents} Candidates Registered
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate("marks")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4A72C] hover:bg-[#b58615] px-4 py-2 text-xs font-black text-[#0B192C] transition shadow-xs active:scale-95 cursor-pointer"
                    >
                      <PenLine size={13} />
                      <span>Enter Marks</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 py-16 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-xs border border-slate-200 text-slate-400">
              <Building2 size={26} className="text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-extrabold text-slate-800">
              No Courses or Department Registrations Assigned
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              {overviewError ? overviewError : overview ? `No subjects have been added for your department yet. The Controller of Examinations adds them on the Subjects page.` : "Loading your subjects…"}
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => onNavigate("marks")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B192C] hover:bg-[#162a45] px-5 py-2.5 text-xs font-extrabold text-[#D4A72C] transition shadow-xs cursor-pointer"
              >
                <PenLine size={14} />
                <span>Check Mark Entry Workspace</span>
              </button>
            </div>
          </div>
        )}
      </Panel>

      <PublishedResultsDownload
        batches={published}
        collegeShortName={currentCollege.shortName}
        loading={publishedLoading}
        error={publishedError}
      />

      {/* Roster Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#0B192C] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Users size={18} className="text-[#D4A72C]" />
                <h3 className="text-sm font-black tracking-wide uppercase">
                  Enrolled Students Directory · {currentCollege.shortName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Showing summary of students registered across active courses for {currentCollege.collegeName}:
              </p>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {courses.map((crs) => (
                  <div key={crs.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <p className="text-xs font-extrabold text-[#0B192C]">{crs.code} - {crs.title}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{crs.department} · {crs.section}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[#8A6410]">{crs.enrolledStudents} Enrolled</p>
                      <p className="text-[10px] text-emerald-700 font-bold">{crs.evaluatedStudents} Evaluated</p>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active student allocations registered for this college.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-[#F8F5EE] px-6 py-3.5">
              <span className="text-xs font-bold text-slate-600">Total Enrolled: {totalStudents} Candidates</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRosterModal(false);
                    onNavigate("marks");
                  }}
                  className="rounded-xl bg-[#D4A72C] hover:bg-[#b08014] px-4 py-2 text-xs font-black text-[#0B192C] transition shadow-xs"
                >
                  Open Marks Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grade Analytics Modal */}
      {showGradeAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#0B192C] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <BarChart3 size={18} className="text-[#D4A72C]" />
                <h3 className="text-sm font-black tracking-wide uppercase">
                  Class Performance &amp; Pass Rate Analytics
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGradeAnalyticsModal(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#F8F5EE] border border-slate-200 text-center">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Average Pass Rate</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{passRate}%</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F8F5EE] border border-slate-200 text-center">
                  <p className="text-[10px] font-extrabold uppercase text-slate-500">Evaluated Candidates</p>
                  <p className="text-2xl font-black text-blue-700 mt-1">{totalEvaluated} / {totalScripts}</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {courses.map((crs) => (
                  <div key={crs.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                    <div>
                      <p className="text-xs font-extrabold text-[#0B192C]">{crs.code} - {crs.title}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{crs.department} · Avg Score: {crs.avgScore}/100</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                      {crs.passRate}% Pass Rate
                    </span>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No active course performance records registered for this college.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 bg-[#F8F5EE] px-6 py-3.5">
              <button
                type="button"
                onClick={() => setShowGradeAnalyticsModal(false)}
                className="rounded-xl bg-[#0B192C] px-5 py-2 text-xs font-bold text-white hover:bg-[#1b2f48] transition"
              >
                Close Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function StudentResultView({ students }: { students: HodOverviewDTO["students"] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");

  const hodStudentsData = students;

  const filteredStudents = hodStudentsData.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reg.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === "All" || s.year === selectedYear;
    const matchesSection = selectedSection === "All" || s.section === selectedSection;
    return matchesQuery && matchesYear && matchesSection;
  });

  return (
    <div className="bg-white rounded-[2.25rem] p-6 sm:p-9 shadow-sm border border-slate-200 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="bg-[#D4A72C]/15 text-[#8A6410] text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full inline-block border border-[#D4A72C]/30">
            🎓 STUDENT RESULT COMPONENT
          </span>
          <h3 className="text-xl font-black text-[#0B192C] mt-1 tracking-tight">
            Student Result Directory &amp; Search
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Search student results by Name or Register Number with filters for Academic Year and Section.
          </p>
        </div>

        {/* Search Bar & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or reg..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-[#F8F5EE]/60 pl-9 pr-3 text-xs font-semibold focus:border-[#0B192C] focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0B192C] focus:outline-none"
            >
              <option value="All">All Years</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>

          {/* Section Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase">Category:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0B192C] focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Regular">Regular</option>
              <option value="Lateral">Lateral</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Results Table */}
      <div className="overflow-auto rounded-2xl border border-slate-200 max-h-[75vh]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B192C] text-white font-extrabold uppercase tracking-wider text-[11px] sticky top-0 z-20">
            <tr>
              <th className="px-5 py-3.5">STUDENT NAME &amp; REGISTER NO</th>
              <th className="px-4 py-3.5">ACADEMIC YEAR</th>
              <th className="px-4 py-3.5">SEMESTER</th>
              <th className="px-4 py-3.5">SECTION</th>
              <th className="px-4 py-3.5 text-center">AVERAGE SCORE</th>
              <th className="px-5 py-3.5 text-right">RESULT STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {filteredStudents.map((st) => (
              <tr key={st.reg} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3.5">
                  <p className="font-extrabold text-slate-900">{st.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">{st.reg}</p>
                </td>
                <td className="px-4 py-3.5 font-bold text-slate-800">{st.year}</td>
                <td className="px-4 py-3.5 text-slate-600">{st.sem}</td>
                <td className="px-4 py-3.5 text-slate-600 font-bold">{st.section}</td>
                <td className="px-4 py-3.5 text-center font-black text-slate-900">{st.average === null ? "—" : `${st.average}%`}</td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${
                      st.status === "PASS"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : st.status === "FAIL"
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {st.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-500 font-medium">
                  No student results match the search query or selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HodQuestionPapersView({
  department,
  hodName,
}: {
  department: string;
  hodName: string;
}) {
  return <HodQuestionPaperScrutinyView department={department} hodName={hodName} />;
}

function HodPortalDashboard({
  onLogout,
  hodName = "JAYAPRADHA",
  department = "COMPUTER SCIENCE AND ENGINEERING",
}: {
  onLogout: () => void;
  hodName?: string;
  department?: string;
}) {
  const kvellSealLogo = "/kvell-logo.png";
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics" | "markEntry" | "internals" | "hallAllotment" | "studentResult" | "questionPapers" | "markApprovals" | "notifications">("dashboard");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [deanBroadcastNotifs, setDeanBroadcastNotifs] = useState<DeanExamNotification[]>(() => safeLoadNotifications());
  const [pendingFacultyQpCount, setPendingFacultyQpCount] = useState<number>(() => {
    try {
      const list = safeLoadQuestionPapers();
      return list.filter((p: any) => p.status === "PENDING_HOD_REVIEW").length;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    const updateCount = () => {
      try {
        const list = safeLoadQuestionPapers();
        setPendingFacultyQpCount(list.filter((p: any) => p.status === "PENDING_HOD_REVIEW").length);
      } catch {}
      setDeanBroadcastNotifs(safeLoadNotifications());
    };
    window.addEventListener("kvell_qp_updated", updateCount);
    window.addEventListener("kvell_exam_notification_updated", updateCount);
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("kvell_qp_updated", updateCount);
      window.removeEventListener("kvell_exam_notification_updated", updateCount);
      window.removeEventListener("storage", updateCount);
    };
  }, []);

  // Year-wise Bar Graph Data for 1st yr, 2nd yr, 3rd yr, 4th yr
  // Rule: < 40% -> RED (#EF4444), >= 40% -> GREEN (#22C55E)
  const [overview, setOverview] = useState<HodOverviewDTO | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  useEffect(() => {
    hodApi
      .getOverview()
      .then(setOverview)
      .catch((err) => setOverviewError(apiErrorMessage(err, "Could not load department results.")));
  }, []);
  const yearGraphData = overview?.yearPass ?? [];

  // Top Pass Percentage Faculty: examiners of the department's published subjects (from the server)
  const rankTones = ["bg-[#D4A72C] text-[#0B192C]", "bg-slate-700 text-white", "bg-amber-900/80 text-amber-200", "bg-slate-800 text-slate-400"];
  const topFacultyRanking = (overview?.topFaculty ?? []).map((f, i) => ({
    rank: `#${f.rank}`,
    rankTone: rankTones[Math.min(i, rankTones.length - 1)],
    name: `${f.name}${f.designation ? ` (${f.designation})` : ""}`,
    subject: `${f.subjectCode} - ${f.subjectTitle} · ${f.students} students`,
    passRate: `${f.passPercentage}%`,
  }));

  return (
    <PortalShell
      navItems={[
        { key: "dashboard", label: "Dashboard", icon: BarChart3 },
        { key: "analytics", label: "Analytics", icon: PieChart },
        { key: "markEntry", label: "Mark Entry", icon: PenLine },
        { key: "internals", label: "Internal Mark Entry", icon: ClipboardCheck },
        { key: "studentResult", label: "Student Result", icon: Users },
        { key: "questionPapers", label: "Question Papers", icon: FileCheck, badge: pendingFacultyQpCount },
        { key: "markApprovals", label: "Mark Approvals", icon: CheckSquare },
        { key: "hallAllotment", label: "Hall Allotment", icon: LayoutDashboard },
        { key: "notifications", label: "Exam Notifications", icon: Bell, badge: deanBroadcastNotifs.length },
      ]}
      active={activeTab}
      onNavigate={(k) => setActiveTab(k as typeof activeTab)}
      sidebarSubtitle={(authApi.currentUser()?.collegeKey ?? "engineering").toUpperCase()}
      workspaceLabel="HOD Workspace"
      workspaceDetail={department}
      userName={hodName}
      userSub={`HOD · ${department}`}
      bannerTag={`HOD PORTAL · ${department}`}
      bannerTitle={authApi.currentUser()?.collegeName ?? "KVELL University"}
      bannerSubtitle="Department results, internal marks, question paper scrutiny and approval of forwarded marks"
      bannerUser={hodName}
      bannerUserSub={authApi.currentUser()?.username ?? ""}
      onBellLink={(link) =>
        link === "mark-approvals" ? setActiveTab("markApprovals")
          : link === "question-paper" ? setActiveTab("questionPapers") : undefined
      }
      onLogout={onLogout}
      navFooter={
        <a
          href={ADMIN_PANEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#D4A72C] border border-[#D4A72C]/40 hover:bg-white/10 transition"
          title="Open the Controller of Examinations panel"
        >
          <ExternalLink size={16} />
          <span>COE Portal</span>
        </a>
      }
    >
      <div className="space-y-8">
        {/* Dark Hero Welcome Card */}

        {/* Tab 1: Main HOD Dashboard (Analytics & Pass Graph) */}
        {activeTab === "dashboard" ? (
          <div className="space-y-6">
            {/* WORKFLOW STEP 6 & 7: DEAN BROADCAST EXAM NOTIFICATIONS HERO BANNER FOR HOD */}
            {deanBroadcastNotifs.length > 0 && deanBroadcastNotifs[0].status === "ACTIVE" && (
              <div className="bg-[#0B192C] text-white rounded-3xl border-2 border-[#D4A72C] p-6 shadow-2xl relative overflow-hidden space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center font-bold shrink-0 shadow-md">
                      <Bell size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-[#D4A72C] text-[#0B192C] tracking-widest uppercase">
                          OFFICIAL DEAN BROADCAST CIRCULAR
                        </span>
                        <span className="font-mono text-xs text-amber-400 font-bold">
                          {deanBroadcastNotifs[0].refNo}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-white mt-1">
                        {deanBroadcastNotifs[0].title}
                      </h2>
                      <p className="text-xs text-slate-300 font-medium">
                        Issued by <strong>{deanBroadcastNotifs[0].senderName}</strong> ({deanBroadcastNotifs[0].senderRole}) &bull; Date: {deanBroadcastNotifs[0].issueDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="bg-red-500/20 border border-red-500/50 px-3.5 py-1.5 rounded-xl text-right">
                      <span className="text-[10px] font-black uppercase text-red-300 block">
                        DAC Scrutiny Deadline
                      </span>
                      <span className="font-mono font-black text-xs text-white">
                        {deanBroadcastNotifs[0].deadline}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2 text-xs">
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {deanBroadcastNotifs[0].message}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-[11px] text-amber-300 font-mono">
                    <span className="font-bold text-white">Target Streams:</span>
                    {deanBroadcastNotifs[0].targetDepartments.map((deptCode) => (
                      <span key={deptCode} className="px-2 py-0.5 rounded bg-white/10 border border-white/15">
                        {deptCode}
                      </span>
                    ))}
                    <span className="ml-auto text-slate-400">
                      Delivered: {deanBroadcastNotifs[0].deliveredAt}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-slate-400 font-medium">
                    Dean directive requires HOD to ensure 2 sets (Set A &amp; Set B) per course with DAC compliance.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("notifications")}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={14} className="text-[#D4A72C]" />
                      <span>View Full Memorandum ({deanBroadcastNotifs.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("questionPapers")}
                      className="px-4 py-2 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>Stage 2 DAC Scrutiny</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 2 DAC Scrutiny Banner if Faculty submissions pending */}
            {pendingFacultyQpCount > 0 && (
              <div
                onClick={() => setActiveTab("questionPapers")}
                className="p-5 rounded-2xl bg-linear-to-r from-amber-500/15 via-amber-50 to-white border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-amber-500 transition shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-sm">
                    <Clock size={20} className="animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                        STAGE 2 DAC ACTION REQUIRED
                      </span>
                      <span className="text-[11px] font-extrabold text-amber-900">
                        {pendingFacultyQpCount} Faculty Paper(s) Awaiting Scrutiny
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-[#0B192C] mt-0.5">
                      Faculty Question Paper Submissions Awaiting HOD DAC Scrutiny
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Department faculty members have submitted question papers. Review Bloom&apos;s distribution and DAC compliance before forwarding to the Associate Dean.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <span>Conduct DAC Scrutiny</span>
                  <ArrowRight size={14} className="text-[#D4A72C]" />
                </button>
              </div>
            )}
            <div className="bg-white rounded-[2.25rem] p-6 sm:p-9 shadow-sm border border-slate-200 space-y-8">
            <div>
              <span className="bg-[#FFF4D6] text-[#8C2F00] text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full inline-block border border-[#F5D8B4]">
                📊 RESULT ANALYTICS & FACULTY PERFORMANCE
              </span>
              <h2 className="text-2xl font-black text-[#0B192C] mt-2 tracking-tight">
                Department Pass Percentage & Faculty Analytics
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Visual graph of examination pass rates across 1st yr, 2nd yr, 3rd yr, 4th yr and top faculty ranking.
              </p>
            </div>

            {/* 2-Column Grid Layout */}
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left Column: Year-wise Pass Percentage Graph Card */}
              <div className="bg-[#F8F5EE]/60 border border-slate-200/90 rounded-[2rem] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#0B192C] flex items-center gap-2">
                      <BarChart3 className="text-[#8A6410]" size={16} />
                      Year-wise Pass Percentage Graph
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Pass rate (%) of published results by year of study
                    </p>
                  </div>
                  {/* Graph Color Indicator Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-red-600">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /> &lt; 40% (Red)
                    </span>
                    <span className="flex items-center gap-1.5 text-green-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> &ge; 40% (Green)
                    </span>
                  </div>
                </div>

                {/* Threshold Interactive Toggles */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                  <span className="uppercase text-[10px] text-slate-500">
                    {overviewError ??
                      (overview
                        ? `Overall ${overview.overallPassPercentage}% pass (${overview.studentsWithResults} students with results):`
                        : "Loading pass rates...")}
                  </span>
                  {yearGraphData.map((yr) => (
                    <button
                      key={yr.name}
                      type="button"
                      className={`px-2.5 py-1 rounded-lg border transition text-[10px] font-black ${
                        yr.passPercentage < 40
                          ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                          : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                      }`}
                      title={`${yr.students} students with published results`}
                    >
                      {yr.name}: {yr.students > 0 ? `${yr.passPercentage}%` : "no results"}
                    </button>
                  ))}
                </div>

                {/* Recharts Bar Chart - Color: Red (<40%), Green (>=40%) */}
                <div className="h-[300px] pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearGraphData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#1e293b", fontSize: 12, fontWeight: 800 }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="passPercentage" name="Pass Rate (%)" radius={[8, 8, 0, 0]}>
                        {yearGraphData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.passPercentage < 40 ? "#EF4444" : "#22C55E"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Top Pass Percentage Faculty Card (Dark Navy Card) */}
              <div className="bg-[#0B192C] text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#D4A72C] flex items-center gap-2">
                      🏅 Top Pass Percentage Faculty
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Faculty members with highest student pass percentage in their handling courses.
                    </p>
                  </div>
                  <span className="bg-white/10 text-slate-200 text-xs font-mono font-bold px-3 py-1 rounded-lg border border-white/10 self-start sm:shrink-0 max-w-full">
                    {department} RANKING
                  </span>
                </div>

                {/* Faculty Ranking List */}
                <div className="space-y-3.5">
                  {topFacultyRanking.length === 0 && (
                    <p className="text-xs font-semibold text-slate-400 py-6 text-center">
                      {overview ? "No results have been published for this department yet." : "Loading…"}
                    </p>
                  )}
                  {topFacultyRanking.map((fac) => (
                    <div
                      key={fac.rank}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-white/10 transition shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-8 w-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${fac.rankTone}`}>
                          {fac.rank}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white">{fac.name}</h4>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{fac.subject}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-[#38BDF8]">{fac.passRate}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PASS RATE</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : activeTab === "markEntry" ? (
          /* Tab: the HOD enters answer-script marks like the faculty (any subject of the department) */
          <FacultyMarkEntry />
        ) : activeTab === "internals" ? (
          /* Tab: the HOD enters and corrects the department's internal (CO sheet) marks */
          <CoAssessment mode="hod" />
        ) : activeTab === "analytics" ? (
          /* Tab 2: the department's full result analytics (same as the COE's, for this department only) */
          <HodAnalytics />
        ) : activeTab === "studentResult" ? (
          /* Tab: student result search */
          <StudentResultView students={overview?.students ?? []} />
        ) : activeTab === "hallAllotment" ? (
          /* Tab: the COE's hall allotment for the department; the HOD validates it for the faculty */
          <HallPlansView mode="hod" deptKey={authApi.currentUser()?.departmentKey} />
        ) : activeTab === "markApprovals" ? (
          /* Tab: forwarded marks waiting for the HOD's approval (when the Chief COE requires it) */
          <MarkApprovalsView role="hod" />
        ) : activeTab === "notifications" ? (
          /* Tab: the Dean's exam notifications (QP submission, timetable, valuation) */
          <HodExamNotificationsView
            department={department}
            hodName={hodName}
            onNavigateQP={() => setActiveTab("questionPapers")}
          />
        ) : (
          /* Tab: question papers submitted by the department's faculty */
          <HodQuestionPapersView department={department} hodName={hodName} />
        )}
      </div>
    </PortalShell>
  );
}


function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#FC6226]">{eyebrow}</p><h1 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-slate-950">{title}</h1><p className="mt-2 max-w-2xl text-[13px] text-slate-500">{description}</p></div>{action}</div>;
}

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange?: (val: string) => void }) {
  return <div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">{label}</label><select value={value} onChange={(e) => onChange?.(e.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-[#FC6226] focus:outline-none">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
}

function MetricTile({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-green-700" : tone === "warning" ? "text-amber-700" : tone === "danger" ? "text-red-700" : "text-slate-900";
  return <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className={cn("mt-1 text-lg font-semibold tracking-[-0.03em]", toneClass)}>{value}</p>{detail && <p className="mt-1 text-[10px] text-slate-500">{detail}</p>}</div>;
}

function InsightCard({ label, detail, tone }: { label: string; detail: string; tone: "success" | "warning" | "danger" }) {
  const styles = { success: "border-green-100 bg-green-50/60", warning: "border-amber-100 bg-amber-50/60", danger: "border-red-100 bg-red-50/60" };
  const labelStyle = { success: "text-green-800", warning: "text-amber-800", danger: "text-red-800" };
  return <div className={cn("rounded-lg border p-4", styles[tone])}><p className={cn("text-xs font-semibold", labelStyle[tone])}>{label}</p><p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Panel className="flex min-h-[220px] flex-col items-center justify-center p-6 text-center"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Search size={17} /></div><h2 className="mt-3 text-sm font-semibold text-slate-800">{title}</h2><p className="mt-1 text-xs text-slate-500">{detail}</p></Panel>;
}

function usePublicSummary() {
  const [summary, setSummary] = useState<PublicSummaryDTO | null>(null);
  useEffect(() => {
    publicApi.summary().then(setSummary).catch(() => setSummary(null));
  }, []);
  return summary;
}

/** Banner text: when results were last published (or that none are published yet). */
function PublicationNotice() {
  const summary = usePublicSummary();
  if (!summary) return <>Examination Result Portal</>;
  return summary.lastPublishedAt ? (
    <>Examination results last published on {summary.lastPublishedAt}</>
  ) : (
    <>Examination results will appear here once the Controller of Examinations publishes them</>
  );
}

/** Login page figures from the published results. */
function PublicFigure({ kind }: { kind: "pass" | "published" }) {
  const summary = usePublicSummary();
  if (kind === "pass") return <>{summary && summary.studentsWithResults > 0 ? `${summary.passPercentage}%` : "—"}</>;
  return <>{summary?.lastPublishedLabel ?? "Not yet"}</>;
}

function AppShell({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const [activePage, setActivePage] = useState<PageKey>(role === "Admin" ? "admin" : "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");

  const currentRoleNav = roleNav[role] || roleNav["Faculty"];
  const activeNav =
    currentRoleNav.find((item) => item.key === activePage) ?? currentRoleNav[0];
  const meta = roleMeta[role] || roleMeta["Faculty"];
  // The faculty member's college comes from their login (set from the server's answer at sign-in)
  const facultyCollegeKey = (role === "Faculty" ? localStorage.getItem("kvell_faculty_college") : null) as FacultyCollege | null;
  const facultyCollege = facultyCollegeKey && FACULTY_COLLEGES[facultyCollegeKey] ? FACULTY_COLLEGES[facultyCollegeKey] : (role === "Faculty" ? FACULTY_COLLEGES.Engineering : null);

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(null), 3200);
      return () => window.clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    setActivePage(role === "Admin" ? "admin" : "dashboard");
    setSidebarOpen(false);
  }, [role]);

  const navigate = (page: PageKey) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  // Only faculty reach this shell (students, HODs and Deans have their own dashboards; COEs use the COE panel)
  const content = useMemo(() => {
    switch (activePage) {
      case "marks":
      case "paper-correction":
        // Faculty evaluate in Paper Correction (the bundles the Dean allots)
        return (
          <FacultyPaperCorrectionView
            currentFacultyName={authApi.currentUser()?.name || meta.name}
            onToast={setToast}
          />
        );
      case "hall-allotment":
        return <HallPlansView mode="faculty" deptKey={authApi.currentUser()?.departmentKey} onToast={setToast} />;
      case "internal-marks":
        return <CoAssessment mode="faculty" onToast={setToast} />;
      case "question-paper":
        return (
          <FacultyQuestionPaperView
            onToast={setToast}
            facultyName={authApi.currentUser()?.name ?? ""}
            department={facultyCollege?.collegeName || authApi.currentUser()?.departmentName || ""}
          />
        );
      case "verification":
      case "noticeboard":
        return (
          <FacultyExamNotificationsView
            onNavigateToQuestionPaper={() => navigate("question-paper")}
            onToast={setToast}
            facultyName={authApi.currentUser()?.name || ""}
            department={facultyCollege?.collegeName || meta.department}
          />
        );
      default:
        return <FacultyDashboard onNavigate={navigate} />;
    }
  }, [activePage, role]);

  return (
    <div className="flex min-h-screen bg-[#F8F5EE] text-[#172033] selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col bg-[#0B192C] text-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0 border-r border-[#D4A72C]/20 shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex shrink-0 items-center justify-between px-5 box-border", role === "Faculty" ? "h-[6.75rem] border-b-4 border-[#D4A72C]" : "h-[78px] border-b border-white/10")}>
          <div className="flex items-center gap-3">
            <img
              src="/kvell-logo.png"
              alt="KVELL UNIVERSITY"
              className="h-10 w-10 object-contain rounded-full bg-white p-0.5 border border-[#D4A72C]/40 shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black tracking-wide text-white uppercase" title="KVELL UNIVERSITY">
                KVELL UNIVERSITY
              </p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-[#D4A72C] tracking-wider uppercase">
                {facultyCollege ? facultyCollege.shortName : (role === "Faculty" ? "Engineering" : `${role} Portal`)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-5">
          <div className="rounded-xl border border-[#D4A72C]/30 bg-white/5 p-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold text-[#D4A72C] uppercase tracking-wider">
                Authorized Workspace
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 font-semibold text-slate-300">
              {authApi.currentUser()?.departmentName ?? ""}
            </p>
          </div>
        </div>

        <nav className="portal-scrollbar mt-6 flex-1 overflow-y-auto px-3">
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#D4A72C]/80">
            {role} Workspace
          </p>
          <div className="space-y-1.5">
            {currentRoleNav.map((item) => {
              const Icon = item.icon;
              const active = item.key === activePage;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition duration-150",
                    active
                      ? "bg-[#D4A72C] text-[#0B192C] shadow-md font-black"
                      : "text-slate-200 font-semibold hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 1.8} className={active ? "text-[#0B192C]" : "text-[#D4A72C]"} />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="ml-auto text-[#0B192C]" size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-4 bg-[#081220]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4A72C] text-xs font-black text-[#0B192C] shadow-sm">
              {facultyCollege ? (authApi.currentUser()?.name ?? "F")[0] : meta.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-white">
                {facultyCollege ? authApi.currentUser()?.name ?? facultyCollege.shortName : meta.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-[#D4A72C]">
                {facultyCollege ? `${facultyCollege.shortName} · Examiner` : meta.roleLabel}
              </p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new Event("kvell:open-profile-edit"))}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-[#D4A72C] transition"
              aria-label="Edit profile"
              title="Edit profile"
            >
              <UserRound size={16} />
            </button>
            <button
              onClick={() => window.dispatchEvent(new Event("kvell:open-change-password"))}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-[#D4A72C] transition"
              aria-label="Change password"
              title="Change password"
            >
              <KeyRound size={16} />
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition"
              aria-label="Log out"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0B192C]/50 backdrop-blur-xs lg:hidden"
          aria-label="Close navigation overlay"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP NAVBAR HEADER: faculty get the COE portal's college banner */}
        {role === "Faculty" ? (
          <FacultyBanner
            collegeName={facultyCollege?.collegeName ?? authApi.currentUser()?.collegeName ?? "KVELL University"}
            logoUrl={facultyCollege?.logoUrl || "/kvell-logo.png"}
            userName={authApi.currentUser()?.name ?? "Faculty"}
            username={authApi.currentUser()?.username ?? ""}
            onOpenMenu={() => setSidebarOpen(true)}
            onBack={activePage !== "dashboard" ? () => navigate("dashboard") : undefined}
          />
        ) : (
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-[#E5E1D8] bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            {activePage !== "dashboard" && (
              <button
                onClick={() => navigate("dashboard")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-[#F8F5EE] text-[#0B192C] shadow-sm transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B192C]/20"
                title="Return to Dashboard"
                aria-label="Return to Dashboard"
              >
                <ArrowLeft size={18} strokeWidth={2.2} />
              </button>
            )}

            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#8A6410] uppercase tracking-wider">
                <span>Portal</span>
                <ChevronRight size={12} />
                <span className="truncate text-slate-600 font-semibold">
                  {activeNav?.label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-lg font-extrabold text-[#0B192C]">
                {activeNav?.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden md:block">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={15}
              />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search portal..."
                className="h-10 w-52 rounded-2xl border border-slate-200 bg-[#F8F5EE] pl-9 pr-3.5 text-xs font-semibold text-[#172033] placeholder:text-slate-400 focus:border-[#0B192C] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0B192C] transition lg:w-64 shadow-sm"
              />
            </div>

            <button
              onClick={() => setToast("Help center is coming soon")}
              className="hidden rounded-xl p-2 text-slate-500 hover:bg-[#F8F5EE] hover:text-[#0B192C] transition sm:block"
              aria-label="Help"
            >
              <CircleHelp size={18} />
            </button>

            <NotificationBell />

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2.5 bg-[#F8F5EE] border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B192C] text-[11px] font-black text-[#D4A72C]">
                {facultyCollege ? (authApi.currentUser()?.name ?? "F")[0] : meta.initials}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-xs font-extrabold text-[#0B192C]">
                  {facultyCollege ? authApi.currentUser()?.name ?? facultyCollege.shortName : meta.name}
                </p>
                <p className="text-[9px] font-bold text-[#8A6410] uppercase tracking-wider">
                  {facultyCollege ? `${facultyCollege.collegeName}` : meta.roleLabel}
                </p>
              </div>
              <ChevronDown size={14} className="hidden text-slate-400 lg:block" />
            </div>
          </div>
        </header>
        )}

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
            <div key={`${role}-${activePage}`} className="reveal-up">
              {content}
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex max-w-[340px] items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
            <CheckCircle2 size={15} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Action complete
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{toast}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-auto p-1 text-slate-400 hover:text-slate-700"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function LoginPage({
  onAuthenticated,
}: {
  onAuthenticated: (
    role: Role,
    studentInfo?: { reg: string; name: string; semester: number },
    hodInfo?: { name: string; department: string }
  ) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<"Student" | "HOD" | "Faculty" | "Dean" | "Admin">("Student");
  const [regNumber, setRegNumber] = useState("");
  const [dob, setDob] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(() =>
    sessionStorage.getItem("kvell_session_expired") ? "Your session ended. Please sign in again." : null
  );
  const [submitting, setSubmitting] = useState(false);
  // Picture challenge the server asks for after failed sign-ins (used up by each attempt)
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  useEffect(() => {
    sessionStorage.removeItem("kvell_session_expired");
  }, []);

  // Portal gateways set by the Super Admin, served by the result server (which also refuses a closed portal's sign-in)
  const systemConfig = useSystemConfig();
  const isStudentPortalLocked = selectedRole === "Student" && isStudentPortalClosed(systemConfig);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    if (isStudentPortalLocked) {
      setErrorMsg("The student result portal is closed by the Controller of Examinations. Please try again later.");
      return;
    }

    // Result management happens in the Examination Control Panel (admin panel app)
    if (selectedRole === "Admin") {
      window.location.assign(ADMIN_PANEL_URL);
      return;
    }

    setSubmitting(true);
    try {
      if (selectedRole === "Student") {
        // Students sign in with Register Number + Date of Birth
        const res = await authApi.login(regNumber.trim(), dob, "student", challenge());
        onAuthenticated("Student", { reg: res.user.username, name: res.user.name, semester: 1 });
      } else if (selectedRole === "Faculty") {
        // Faculty enter marks for their own department and forward them to the COE
        const res = await authApi.login(username.trim(), password, "faculty", challenge());
        // The college comes from the account on the server, never from what was typed
        const college = res.user.collegeKey === "pharmacy" ? "Pharmacy" : res.user.collegeKey === "nursing" ? "Nursing" : "Engineering";
        localStorage.setItem("kvell_faculty_college", college);
        onAuthenticated("Faculty");
      } else if (selectedRole === "Dean") {
        // The Associate Dean (or Dean) of the college reviews question papers and follows the college's results
        await authApi.login(username.trim(), password, "dean", challenge());
        onAuthenticated("Associate Dean");
      } else {
        const res = await authApi.login(username.trim(), password, "hod", challenge());
        onAuthenticated("HOD", undefined, {
          name: res.user.name,
          department: (res.user.departmentName || "").toUpperCase(),
        });
      }
    } catch (err: any) {
      const data = err?.response?.data;
      setCaptcha(data?.captchaRequired ? data.captcha : null);
      setCaptchaAnswer("");
      setErrorMsg(apiErrorMessage(err, "Sign in failed. Please check your details."));
    } finally {
      setSubmitting(false);
    }
  };

  function challenge() {
    return captcha ? { captchaId: captcha.id, captchaAnswer } : {};
  }

  const kvellSealLogo = "/kvell-logo.png";

  return (
    <div className="min-h-screen bg-[#0B192C] text-[#172033] font-sans flex flex-col justify-between selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Top Banner Bar */}
      <div className="bg-[#060D17] text-white border-b border-[#D4A72C]/20 text-[11px] py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-2 z-50">
        <div className="flex items-center gap-2">
          <span className="bg-[#D4A72C] text-[#0B192C] font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase shadow-sm">
            # OFFICIAL PORTAL
          </span>
          <span className="text-slate-300 font-medium">
            <PublicationNotice />
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
          <span>AICTE & UGC Approved</span>
          <span>•</span>
          <span className="text-[#D4A72C]">NAAC A++ Accredited Engineering Faculty</span>
        </div>
      </div>

      {/* Main Header Navbar */}
      <header className="bg-white border-b border-[#E5E1D8] relative sm:sticky top-0 z-40 shadow-sm">
        <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <img
              src={kvellSealLogo}
              alt="KVELL University Seal"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-full shadow-md p-0.5 bg-white border-2 border-[#D4A72C]/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#0B192C]">
                  KVELL DEEMED TO BE UNIVERSITY
                </span>
                <span className="hidden sm:inline-block bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200">
                  ESTD. 2001
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#8A6410] tracking-wider uppercase mt-0.5">
                ENGINEERING AND EMERGING SCIENCES • EXAMINATION & RESULT PORTAL
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="bg-[#0B192C] text-[#D4A72C] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
              <GraduationCap size={15} className="text-[#D4A72C]" />
              {selectedRole} Portal Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero & Login Card Section */}
      <section className="relative overflow-hidden bg-[#0B192C] text-white py-10 lg:py-14 px-4 sm:px-6 lg:px-8 flex-1 flex items-center justify-center">
        {/* Decorative Golden Ambient Rings & Background Glow */}
        <div className="pointer-events-none absolute -left-28 -top-28 h-[450px] w-[450px] rounded-full border border-[#D4A72C]/15" />
        <div className="pointer-events-none absolute -left-14 -top-14 h-[350px] w-[350px] rounded-full border border-[#D4A72C]/10" />
        <div className="pointer-events-none absolute right-10 -bottom-28 h-[400px] w-[400px] rounded-full border border-[#D4A72C]/10" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4A72C]/5 blur-3xl rounded-full" />

        <div className="max-w-6xl w-full mx-auto relative z-10 grid lg:grid-cols-2 gap-10 items-center">
          {/* Left Hero Column */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#D4A72C] text-xs font-extrabold w-fit border border-[#D4A72C]/30 shadow-sm">
              <Building2 size={14} />
              <span>FACULTY OF ENGINEERING & EMERGING SCIENCES</span>
            </div>
            <div>
              <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Academic Portal
              </h1>
              <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-[#D4A72C] leading-tight mt-1">
                Kvell University
              </h1>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Access Student Result Portal, HOD Department Analytics & Bar Graphs, and Examination Control Management. Select your portal role to sign in.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <p className="text-2xl font-black text-[#D4A72C]"><PublicFigure kind="pass" /></p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Pass Rate (published results)</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <p className="text-2xl font-black text-[#D4A72C]"><PublicFigure kind="published" /></p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Latest Results Published</p>
              </div>
            </div>
          </div>

          {/* Right Card Column */}
          <div className="w-full flex justify-center">
            <div className="bg-white text-[#172033] rounded-[2.25rem] p-7 sm:p-9 shadow-2xl border border-white/20 w-full relative">

              {/* Seal Logo inside Card */}
              <div className="text-center mb-5">
                <img
                  src={kvellSealLogo}
                  alt="KVELL Seal Logo"
                  className="h-16 w-16 mx-auto rounded-full bg-white p-1 border-2 border-[#D4A72C] shadow-md"
                />
                <h2 className="font-extrabold text-xl text-[#0B192C] mt-2.5">
                  {selectedRole === "Student" ? "Student Result Portal" : selectedRole === "HOD" ? "HOD Department Portal" : selectedRole === "Dean" ? "Associate Dean Portal" : "Faculty Portal"}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select your role and enter credentials to sign in
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedRole("Student")}
                  className={`py-2 text-xs font-black rounded-xl transition ${
                    selectedRole === "Student"
                      ? "bg-[#0B192C] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("HOD")}
                  className={`py-2 text-xs font-black rounded-xl transition ${
                    selectedRole === "HOD"
                      ? "bg-[#0B192C] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  👔 HOD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("Faculty")}
                  className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                    selectedRole === "Faculty"
                      ? "bg-[#0B192C] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  👨‍🏫 Faculty
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole("Dean")}
                  className={`py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                    selectedRole === "Dean"
                      ? "bg-[#0B192C] text-white shadow-md"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🏛️ Assoc. Dean
                </button>
              </div>

              {/* Public Announcement Banner from Super Admin Dr. Sathish */}
              {systemConfig?.gateways?.studentResultPortal?.announcement && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-[#D4A72C]/40 text-[#0B192C] flex items-center gap-2.5 shadow-sm">
                  <Sparkles size={16} className="text-[#8A6410] shrink-0 animate-pulse" />
                  <div className="text-left text-xs">
                    <span className="font-extrabold uppercase text-[9px] text-[#8A6410] block">Official COE Announcement</span>
                    <span className="font-bold text-slate-800">{systemConfig.gateways.studentResultPortal.announcement}</span>
                  </div>
                </div>
              )}

              {/* Student Portal Lockdown Notice */}
              {isStudentPortalLocked && (
                <div className="mb-4 p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-950 flex items-start gap-3 shadow-md">
                  <ShieldAlert size={22} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-extrabold text-sm text-red-950 flex items-center gap-2">
                      <span>Student Result Portal Offline</span>
                      <span className="text-[9px] bg-red-200 text-red-900 font-black px-2 py-0.5 rounded-full uppercase">
                        COE Maintenance
                      </span>
                    </h4>
                    <p className="text-xs text-red-800 mt-1 leading-relaxed">
                      The Student Result Portal has been temporarily placed in maintenance mode by Overall University COE (Dr. Sathish) for result moderation and data synchronization.
                    </p>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={submit} className="space-y-4">
                {selectedRole === "Admin" ? (
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                    Result upload, mark entry and publication are managed in the Examination Control Panel.
                    Continue to sign in there with your administrator credentials.
                  </p>
                ) : selectedRole === "Student" ? (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      STUDENT REGISTER NUMBER
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        placeholder="Register number"
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                      />
                    </div>
                  </div>
                ) : selectedRole === "Faculty" ? (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      FACULTY USERNAME / EXAMINER ID
                    </label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. FACCSE"
                          className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                        />
                      </div>
                    </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      {selectedRole === "Dean" ? "ASSOCIATE DEAN USERNAME" : "HOD USERNAME / ID"}
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={selectedRole === "HOD" ? "e.g. HODCSE" : selectedRole === "Dean" ? "e.g. ADEAN_ENG" : "e.g. FACCSE"}
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === "Student" && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      DATE OF BIRTH
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        required
                        aria-label="Date of birth"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {(selectedRole === "HOD" || selectedRole === "Faculty" || selectedRole === "Dean") && (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      PASSWORD
                    </label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full h-12 pl-11 pr-10 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {captcha && (
                  <div>
                    <label htmlFor="portal-captcha" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      TYPE THE CHARACTERS IN THE PICTURE
                    </label>
                    <img src={captcha.image} alt="Security check: characters to type" className="h-[60px] rounded-xl border border-slate-200 mb-2" />
                    <input
                      id="portal-captcha"
                      required
                      autoComplete="off"
                      maxLength={8}
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-sm font-bold tracking-widest focus:border-[#0B192C] focus:outline-none"
                    />
                  </div>
                )}

                {errorMsg && (
                  <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 shadow-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || isStudentPortalLocked}
                  className="w-full h-12 rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition duration-150 active:scale-[0.99] disabled:opacity-60"
                >
                  <Lock size={14} className={isStudentPortalLocked ? "text-slate-400" : "text-[#D4A72C]"} />
                  {isStudentPortalLocked
                    ? "Student Portal Offline (COE Locked)"
                    : selectedRole === "Admin"
                    ? "Open Examination Control Panel"
                    : submitting
                      ? "Signing in..."
                      : `Sign In to ${selectedRole} Portal`}
                </button>
              </form>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Result Portal.</p>
        <p className="mt-1 opacity-80">Results shown online are provisional; the marksheet issued by the Controller of Examinations is the official record. Support: Office of the Controller of Examinations.</p>
        <p className="mt-1 space-x-3"><a className="underline" href="/privacy.html">Privacy policy</a><a className="underline" href="/terms.html">Terms of use</a><a className="underline" href="/status.html">System status</a></p>
      </footer>
    </div>
  );
}

function StudentDashboard({
  studentReg = "20260110226001",
  studentName = "",
  initialSemester = 1,
  onLogout,
}: {
  studentReg?: string;
  studentName?: string;
  initialSemester?: number;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "result" | "internals" | "quizzes" | "subjects">("dashboard");
  const [currentSemesterNum, setCurrentSemesterNum] = useState<number>(initialSemester);

  useEffect(() => {
    setCurrentSemesterNum(initialSemester);
  }, [initialSemester]);
  const [selectedElective, setSelectedElective] = useState<string>("CS305E");
  const [electiveSubmitted, setElectiveSubmitted] = useState<boolean>(true);
  const [coeStatus, setCoeStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Gateways set by the Super Admin, from the result server (which also enforces them)
  const systemConfig = useSystemConfig() as any;

  // Revaluation requests are stored on the result server, where the COE works through them
  const [revalSelectedCourses, setRevalSelectedCourses] = useState<string[]>([]);
  const [myRevaluations, setMyRevaluations] = useState<RevaluationRequestDTO[]>([]);
  const [revalBusy, setRevalBusy] = useState(false);
  const loadRevaluations = () => {
    studentApi.getMyRevaluations().then(setMyRevaluations).catch(() => undefined);
  };
  useEffect(() => {
    loadRevaluations();
  }, []);

  const kvellSealLogo = "/kvell-logo.png";

  const isElectiveEligible = false;



  const [results, setResults] = useState<StudentResultsDTO | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  useEffect(() => {
    studentApi
      .getMyResults()
      .then(setResults)
      .catch((err) => setResultsError(apiErrorMessage(err, "Could not load your results.")));
  }, []);
  // Each published assessment (IAT-1, IAT-2, End Semester) is its own statement; the latest is shown first
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const resultEntries = results?.semesters ?? [];
  const latestSemester =
    resultEntries.length > 0 ? resultEntries[resultIndex ?? resultEntries.length - 1] ?? resultEntries[resultEntries.length - 1] : null;
  const isInternal = !!latestSemester?.internalAssessment;
  // The student's own current semester (from their student record)
  const semNumber = Math.min(8, Math.max(1, results?.profile.currentSemester ?? 1));
  const semRoman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][semNumber - 1];
  const semOrdinal = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][semNumber - 1];
  const studentCourses = (latestSemester?.subjects ?? []).map((sub) => ({
    code: sub.code,
    title: sub.title,
    credits: sub.credits,
    total: sub.total,
    grade: sub.grade,
    points: sub.gradePoints,
    status: sub.status,
  }));
  const deptName = results?.profile.departmentName ?? "—";
  const programPrefix = (key: string) => (key === "mba" ? "MBA" : key === "mca" ? "MCA" : "B.Tech");
  const programLabel = results
    ? ["mba", "mca"].includes(results.profile.departmentKey)
      ? results.profile.departmentName
      : `${programPrefix(results.profile.departmentKey)} ${results.profile.departmentName}`
    : "—";
  const academicYearLabel = results?.profile.academicYear ?? "";
  const categoryLabel = results ? (results.profile.category === "lateral" ? "Lateral Entry" : "Regular") : "—";
  const initials =
    studentName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST";

  // Registered subjects come from the COE subject catalog on the server
  const [mySubjects, setMySubjects] = useState<RegisteredSubjectDTO[]>([]);
  useEffect(() => {
    studentApi.getMySubjects().then(setMySubjects).catch(() => setMySubjects([]));
  }, []);
  const currentCoreSubjects = mySubjects.map((sub) => ({
    code: sub.code,
    title: sub.title,
    credits: sub.credits,
    category: sub.category,
    faculty: sub.faculty,
  }));
  // Elective offers are not published from the server yet, so none are listed
  const currentElectiveOptions: { code: string; title: string; credits: number; category: string; faculty: string; description: string }[] = [];
  const totalCoreCredits = currentCoreSubjects.reduce((acc, c) => acc + c.credits, 0);

  const activeElectiveObj =
    currentElectiveOptions.find((e) => e.code === selectedElective) ?? currentElectiveOptions[0] ?? {
      code: "",
      title: "",
      credits: 0,
      category: "",
      faculty: "",
      description: "",
    };

  const handleSubmitElective = () => {
    setElectiveSubmitted(true);
    setNotificationMsg(`Elective choice (${activeElectiveObj.code} - ${activeElectiveObj.title}) submitted to COE for approval!`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // Revaluation Handlers
  const toggleRevalCourse = (code: string) => {
    setRevalSelectedCourses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleApplyRevaluation = async () => {
    if (!latestSemester || revalSelectedCourses.length === 0) {
      alert("Please select at least one course for revaluation.");
      return;
    }
    setRevalBusy(true);
    try {
      const created = await studentApi.applyRevaluation({
        semester: String(latestSemester.semester),
        assessmentType: latestSemester.assessmentType,
        subjectCodes: revalSelectedCourses,
      });
      setRevalSelectedCourses([]);
      loadRevaluations();
      setNotificationMsg(`Revaluation request ${created.refId} submitted for ${created.subjectCodes.length} course(s). Fee: ₹${created.totalFee}`);
      setTimeout(() => setNotificationMsg(null), 5000);
    } catch (err) {
      alert(apiErrorMessage(err, "Could not submit the revaluation request."));
      loadRevaluations();
    }
    setRevalBusy(false);
  };

  // The statement shown on screen, as a PDF (the same published marks the server sent)
  const handleDownloadGradeCard = async () => {
    if (!latestSemester) return;
    const internal = Boolean(latestSemester.internalAssessment);
    try {
      const { downloadStatementPdf } = await import("../lib/statementPdf");
      await downloadStatementPdf({
        studentName,
        regNo: studentReg,
        program: programLabel,
        semesterLabel: latestSemester.semesterLabel,
        academicYear: latestSemester.academicYear,
        examMonthYear: latestSemester.examMonthYear,
        assessmentType: latestSemester.assessmentType,
        courses: studentCourses.map((c) => ({
          code: c.code,
          title: c.title,
          credits: c.credits,
          total: c.total,
          grade: c.grade,
          status: c.status,
        })),
        totalMarks: latestSemester.totalMarks,
        maxMarks: latestSemester.maxMarks,
        internal,
        earnedCredits: latestSemester.earnedCredits,
        totalCredits: latestSemester.totalCredits,
        sgpa: latestSemester.sgpa != null ? Number(latestSemester.sgpa).toFixed(2) : "-",
        cgpa: results?.cgpa != null ? Number(results.cgpa).toFixed(2) : "-",
        overallResult: results?.overallResult ?? "-",
        result: latestSemester.result,
      });
      setNotificationMsg("Statement of marks downloaded (PDF).");
    } catch {
      setNotificationMsg("Could not create the PDF. Please try again.");
    }
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Withheld: the server sends no marks and says so; the gateway flag covers the moment before the next refresh
  const isResultsWithheld = results?.withheld === true || systemConfig?.gateways?.studentResultPortal?.withholdResults === true;
  const isGradeDownloadAllowed = systemConfig?.gateways?.studentResultPortal?.allowGradeDownload !== false;
  const isRevalWindowOpen = isRevaluationOpen(systemConfig);
  const revalFeePerCourse = systemConfig?.gateways?.revaluationWindow?.feePerCourse ?? 400;
  const revalDeadline: string = systemConfig?.gateways?.revaluationWindow?.deadline ?? "";
  const activeRevaluation =
    myRevaluations.find(
      (r) =>
        latestSemester &&
        r.assessmentType === latestSemester.assessmentType &&
        r.semester === latestSemester.semesterLabel &&
        (r.status === "SUBMITTED" || r.status === "IN_REVIEW")
    ) ?? null;
  const publicAnnouncement = systemConfig?.gateways?.studentResultPortal?.announcement;

  return (
    <PortalShell
      navItems={[
        { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { key: "result", label: "Result", icon: FileText },
        { key: "subjects", label: "My Subjects", icon: BookOpen },
        { key: "internals", label: "Course Exit Survey", icon: ClipboardCheck },
        { key: "quizzes", label: "Online Quiz", icon: CheckSquare },
      ]}
      active={activeTab}
      onNavigate={(k) => setActiveTab(k as typeof activeTab)}
      sidebarSubtitle="Student Portal"
      workspaceLabel="Student Workspace"
      workspaceDetail={`Semester ${semRoman} (${semOrdinal} Sem) · Register ${studentReg}`}
      userName={studentName}
      userSub={`Register: ${studentReg}`}
      bannerTag={`STUDENT PORTAL · SEMESTER ${semRoman}`}
      bannerTitle="KVELL Deemed to be University"
      bannerSubtitle="Examination results, internal marks and registered subjects"
      bannerUser={studentName}
      bannerUserSub={studentReg}
      onBellLink={(link) => (link === "result" ? setActiveTab("result") : undefined)}
      accountButtons={false}
      onLogout={onLogout}
    >
      {/* Interactive Toast Banner */}
      {notificationMsg && (
        <div className="bg-[#0B192C] text-[#D4A72C] py-3 px-6 text-center text-xs sm:text-sm font-extrabold border-b border-[#D4A72C]/30 flex items-center justify-center gap-2 shadow-md">
          <CheckCircle2 size={18} className="text-[#38BDF8]" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Container - Enlarged to full window max-w-7xl */}
      <div className="flex justify-center items-start w-full">
        {activeTab === "dashboard" ? (
          /* Dashboard Module: Enlarged Credentials Card */
          <div className="w-full max-w-7xl space-y-6">
            <StudentSeatingCards />

            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">

              <div className="bg-[#0B192C] text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={kvellSealLogo}
                    alt="Seal"
                    className="h-12 w-12 rounded-full bg-white p-0.5 border-2 border-[#D4A72C]"
                  />
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg tracking-wide text-white">
                      STUDENT CREDENTIALS & PROFILE
                    </h3>
                    <p className="text-xs font-bold text-[#D4A72C] tracking-wider uppercase">
                      FACULTY OF ENGINEERING & EMERGING SCIENCES • OFFICIAL ACADEMIC RECORD
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 border-b border-slate-100 bg-[#F8F5EE]/50 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="h-20 w-20 rounded-full bg-[#0B192C] text-[#D4A72C] font-black text-2xl flex items-center justify-center border-2 border-[#D4A72C] shadow-lg">
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#0B192C]">{studentName}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      Register No: <span className="font-mono text-[#0B192C]">{studentReg}</span>
                    </p>
                    <p className="text-xs font-bold text-[#8A6410] mt-1">
                      Undergraduate • {programLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-400">
                  STUDENT IDENTIFICATION & ACADEMIC CREDENTIALS
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      REGISTER NUMBER
                    </p>
                    <p className="text-base font-black font-mono text-[#0B192C] mt-1">{studentReg}</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      FULL NAME
                    </p>
                    <p className="text-base font-black text-[#0B192C] mt-1">{studentName}</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      DEPARTMENT
                    </p>
                    <p className="text-sm font-extrabold text-[#0B192C] mt-1">{deptName}</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      ACADEMIC PROGRAM
                    </p>
                    <p className="text-sm font-extrabold text-[#0B192C] mt-1">{programLabel}</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      SEMESTER & YEAR
                    </p>
                    <p className="text-sm font-extrabold text-[#0B192C] mt-1">
                      Semester {semRoman} ({semOrdinal} Semester{academicYearLabel ? ` • Academic Year ${academicYearLabel}` : ""})
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      ADMISSION CATEGORY
                    </p>
                    <p className="text-sm font-bold text-[#0B192C] mt-1 truncate">{categoryLabel}</p>
                  </div>

                </div>
              </div>

              <div className="p-6 bg-[#0B192C] text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">
                    ACADEMIC RESULT MODULE
                  </p>
                  <p className="text-base font-bold mt-1">
                    {latestSemester
                      ? `${latestSemester.semesterLabel} ${latestSemester.assessmentType} results are published. Open the Result Module to see your marks.`
                      : "Your results have not been published yet. Please check back after the Controller of Examinations releases them."}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("result")}
                  className="bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl shadow transition duration-150 flex items-center gap-2"
                >
                  <FileText size={16} />
                  Open Result Module
                </button>
              </div>

            </div>

          </div>
        ) : activeTab === "internals" ? (
          /* Course exit survey: the student rates each course outcome; it feeds the CO attainment */
          <StudentExitSurvey />
        ) : activeTab === "quizzes" ? (
          /* Online quizzes opened by the subject faculty; the score fills the CO sheet */
          <StudentQuizzes />
        ) : activeTab === "subjects" ? (
          /* My Subjects Module: Enlarged View */
          <div className="w-full max-w-7xl space-y-6">

            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">

              <div className="bg-[#0B192C] text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={kvellSealLogo}
                    alt="Seal"
                    className="h-12 w-12 rounded-full bg-white p-0.5 border-2 border-[#D4A72C]"
                  />
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg tracking-wide text-white">
                      MY REGISTERED SUBJECTS & ELECTIVE SELECTION
                    </h3>
                    <p className="text-xs font-bold text-[#D4A72C] tracking-wider uppercase mt-0.5">
                      SEMESTER {semRoman} • FACULTY OF ENGINEERING & EMERGING SCIENCES
                    </p>
                  </div>
                </div>

                {coeStatus === "APPROVED" ? (
                  <span className="bg-green-500/20 text-green-300 border border-green-500/40 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm">
                    <ShieldCheck size={16} className="text-green-400" />
                    COE STATUS: APPROVED & RELEASED
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-4 py-2 rounded-full text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm">
                    <Clock3 size={16} className="text-amber-400 animate-spin" />
                    COE STATUS: PENDING APPROVAL
                  </span>
                )}
              </div>

              {/* Dynamic Notice Banner based on Elective Eligibility */}
              {isElectiveEligible ? (
                <div className="p-5 bg-[#FFF4D6]/70 border-b border-[#F5D8B4] text-xs sm:text-sm font-bold text-[#8C2F00] flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>
                    {semOrdinal} Semester Upgrade Notice: Students must select exactly ONE elective subject below for Semester {semRoman}. The selection will be reviewed and approved by the Controller of Examinations (COE) to release the final subject list.
                  </span>
                </div>
              ) : (
                <div className="p-5 bg-blue-50 border-b border-blue-200 text-xs sm:text-sm font-bold text-blue-900 flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-blue-600" />
                  <span>
                    Elective Selection Eligibility Notice: Elective subject selection is available for 3rd Semester students and above. As a Semester {semRoman} ({semOrdinal} Semester) student, all your registered courses are core mandatory subjects.
                  </span>
                </div>
              )}

              {/* 1. Core Mandatory Subjects List */}
              <div className="p-6 sm:p-8 border-b border-slate-100 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-extrabold text-[#0B192C]">
                      Semester {semRoman} Core Mandatory Subjects
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                      Compulsory courses automatically registered for B.Tech CSE ({semOrdinal} Semester)
                    </p>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full border border-slate-200">
                    Total Core Credits: {totalCoreCredits}
                  </span>
                </div>

                <div className="overflow-auto rounded-2xl border border-slate-200 max-h-[75vh]">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#0B192C] text-white text-xs sm:text-xs font-extrabold uppercase tracking-wider sticky top-0 z-20">
                      <tr>
                        <th className="px-5 py-4">COURSE CODE</th>
                        <th className="px-5 py-4">SUBJECT TITLE</th>
                        <th className="px-5 py-4 text-center">CREDITS</th>
                        <th className="px-5 py-4">TYPE</th>
                        <th className="px-5 py-4">FACULTY IN-CHARGE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {currentCoreSubjects.map((sub) => (
                        <tr key={sub.code} className="hover:bg-slate-50 transition">
                          <td className="px-5 py-4 font-mono font-bold text-[#0B192C]">{sub.code}</td>
                          <td className="px-5 py-4 font-extrabold text-slate-900">{sub.title}</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-800">{sub.credits}</td>
                          <td className="px-5 py-4">
                            <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded border border-slate-200">
                              {sub.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{sub.faculty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Elective Section or Non-Eligibility Card */}
              {!isElectiveEligible ? (
                <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-200 text-center space-y-2">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-200/70 text-slate-600 mb-1">
                    <BookOpen size={24} />
                  </div>
                  <h5 className="font-extrabold text-base text-[#0B192C]">
                    Elective Selection Not Applicable for Semester {semRoman} ({semOrdinal} Semester)
                  </h5>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto font-medium">
                    Students in Semester 1 & 2 follow a mandatory common core curriculum. Professional and Open Elective subject selection unlocks starting from Semester III onwards.
                  </p>
                </div>
              ) : coeStatus === "PENDING" ? (
                <div className="p-6 sm:p-8 space-y-5 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0B192C]">
                        {semOrdinal} Semester Professional Elective Selection (Choose 1 Elective Only)
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                        Select your preferred elective subject for {semOrdinal} semester upgrading. (Only 1 elective allowed)
                      </p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-extrabold px-4 py-1.5 rounded-full">
                      ⚠️ Action Required: Select 1 Elective
                    </span>
                  </div>

                  <div className="space-y-4">
                    {currentElectiveOptions.map((e) => {
                      const isSelected = selectedElective === e.code;
                      return (
                        <div
                          key={e.code}
                          onClick={() => setSelectedElective(e.code)}
                          className={`p-5 rounded-2xl border transition cursor-pointer flex flex-wrap items-start justify-between gap-4 ${isSelected
                              ? "border-[#0B192C] bg-[#0B192C]/5 ring-2 ring-[#0B192C]/20 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                        >
                          <div className="flex items-start gap-4 min-w-0 flex-1">
                            <input
                              type="radio"
                              name="electiveSelection"
                              checked={isSelected}
                              onChange={() => setSelectedElective(e.code)}
                              className="mt-1 h-5 w-5 text-[#0B192C] focus:ring-[#0B192C]"
                            />
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-xs text-[#0B192C] bg-[#D4A72C]/20 px-2.5 py-1 rounded border border-[#D4A72C]/40">
                                  {e.code}
                                </span>
                                <h5 className="font-extrabold text-base text-[#0B192C]">{e.title}</h5>
                              </div>
                              <p className="text-sm text-slate-600 mt-2 font-medium leading-relaxed">{e.description}</p>
                              <p className="text-xs font-semibold text-slate-400 mt-2">
                                Faculty: {e.faculty} • Credits: {e.credits}
                              </p>
                            </div>
                          </div>

                          {isSelected && (
                            <span className="bg-[#0B192C] text-[#D4A72C] text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-sm">
                              SELECTED ELECTIVE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 flex flex-wrap items-center justify-between gap-4">
                    {electiveSubmitted ? (
                      <span className="text-xs sm:text-sm font-bold text-amber-700 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 flex items-center gap-2">
                        <Clock3 size={16} className="animate-spin" />
                        Elective Choice Submitted ({selectedElective}). Awaiting COE Approval & Release.
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-500 font-medium">
                        Select 1 elective and click Submit to forward your choice to the Controller of Examinations.
                      </span>
                    )}

                    <button
                      onClick={handleSubmitElective}
                      className="bg-[#0B192C] hover:bg-[#152744] text-white text-xs sm:text-sm font-extrabold px-7 py-3.5 rounded-2xl shadow-lg transition flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} className="text-[#D4A72C]" />
                      Submit Selected Elective ({selectedElective}) to COE
                    </button>
                  </div>
                </div>
              ) : (
                /* 3. After COE Release: Official Released Final Subject List Only */
                <div className="p-6 sm:p-8 bg-[#F8F5EE] border-t border-slate-200 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck size={24} className="text-green-600" />
                      <div>
                        <h4 className="text-base font-extrabold text-[#0B192C]">
                          OFFICIAL RELEASED SUBJECT LIST (APPROVED BY COE)
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                          Approved by Controller of Examinations for Semester {semRoman} • Total Registered Credits: {totalCoreCredits + (activeElectiveObj?.credits ?? 4)}
                        </p>
                      </div>
                    </div>

                    <span className="bg-green-600 text-white text-xs font-mono font-bold px-4 py-1.5 rounded-lg shadow-sm">
                      SEAL REF: COE/2026/SEM{currentSemesterNum}/RELEASED
                    </span>
                  </div>

                  <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm max-h-[75vh]">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-[#0B192C] text-white text-xs font-extrabold uppercase tracking-wider sticky top-0 z-20">
                        <tr>
                          <th className="px-5 py-4">CODE</th>
                          <th className="px-5 py-4">APPROVED COURSE TITLE</th>
                          <th className="px-5 py-4 text-center">CREDITS</th>
                          <th className="px-5 py-4">COURSE TYPE</th>
                          <th className="px-5 py-4 text-center">COE STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {currentCoreSubjects.map((sub) => (
                          <tr key={sub.code}>
                            <td className="px-5 py-4 font-mono font-bold text-[#0B192C]">{sub.code}</td>
                            <td className="px-5 py-4 font-extrabold text-slate-900">{sub.title}</td>
                            <td className="px-5 py-4 text-center font-bold text-slate-800">{sub.credits}</td>
                            <td className="px-5 py-4 text-slate-600">{sub.category}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-block bg-green-100 text-green-800 text-xs font-extrabold px-3 py-1 rounded-full border border-green-200">
                                RELEASED
                              </span>
                            </td>
                          </tr>
                        ))}
                        {/* Selected Approved Elective Row */}
                        {activeElectiveObj && (
                          <tr className="bg-[#D4A72C]/10 border-2 border-[#D4A72C]/40">
                            <td className="px-5 py-4 font-mono font-black text-[#0B192C]">{activeElectiveObj.code}</td>
                            <td className="px-5 py-4 font-black text-[#0B192C]">
                              {activeElectiveObj.title}
                              <span className="ml-3 text-xs font-extrabold bg-[#0B192C] text-[#D4A72C] px-2.5 py-0.5 rounded">
                                APPROVED ELECTIVE
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center font-black text-[#0B192C]">{activeElectiveObj.credits}</td>
                            <td className="px-5 py-4 font-bold text-[#0B192C]">{activeElectiveObj.category}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-block bg-green-600 text-white text-xs font-black px-3.5 py-1 rounded-full shadow-sm">
                                COE APPROVED
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

          </div>
        ) : (
          /* Result Module: Enlarged Official Statement of Marks */
          <>
          <StudentResultNotes result={latestSemester} />
          <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">

            {/* Card Dark Header with Grade Sheet Download Control */}
            <div className="bg-[#0B192C] text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={kvellSealLogo}
                  alt="Seal"
                  className="h-12 w-12 rounded-full bg-white p-0.5 border-2 border-[#D4A72C]"
                />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-wide text-white">
                    KVELL UNIVERSITY
                  </h3>
                  <p className="text-xs font-bold text-[#D4A72C] tracking-wider uppercase mt-0.5">
                    FACULTY OF ENGINEERING & EMERGING SCIENCES •{" "}
                    {isInternal ? `INTERNAL ASSESSMENT MARKS (${latestSemester?.assessmentType})` : "OFFICIAL STATEMENT OF MARKS"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-white/10 text-white border border-white/20 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold">
                  {studentReg}
                </span>
                {/* Grade sheet download, allowed or locked by the Super Admin */}
                {!isResultsWithheld && studentCourses.length > 0 &&
                  (isGradeDownloadAllowed ? (
                    <button
                      onClick={handleDownloadGradeCard}
                      className="px-4 py-2 bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] font-extrabold text-xs rounded-xl shadow transition flex items-center gap-2"
                    >
                      <Download size={15} />
                      <span>Download Grade Sheet (PDF)</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-700 cursor-not-allowed flex items-center gap-2"
                      title="Grade sheet download is turned off by the Controller of Examinations"
                    >
                      <Lock size={14} className="text-amber-400" />
                      <span>Download Locked by COE</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Results withheld by the Super Admin: the server returns no marks while this is on */}
            {isResultsWithheld && (
              <div className="m-6 sm:m-8 bg-red-50/90 border-2 border-red-300 rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-3">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600 shadow-inner">
                  <ShieldAlert size={36} />
                </div>
                <span className="inline-block bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Results withheld
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-red-950 tracking-tight">
                  Results are temporarily withheld by the Controller of Examinations
                </h3>
                <p className="text-xs sm:text-sm text-red-800 max-w-2xl mx-auto leading-relaxed font-medium">
                  The results for <strong className="font-mono font-bold text-red-950">{studentReg}</strong> ({studentName}) are on hold
                  pending verification. They will appear here as soon as they are released.
                </p>
              </div>
            )}

            {/* Candidate Details Box */}
            <div className="bg-[#F8F5EE] border border-slate-200/80 rounded-2xl p-6 sm:p-8 mx-6 sm:mx-8 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">CANDIDATE NAME</p>
                <p className="font-black text-[#0B192C] text-base mt-1">{studentName}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">REGISTER NUMBER</p>
                <p className="font-black text-[#0B192C] text-base font-mono mt-1">{studentReg}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">ENGINEERING PROGRAM</p>
                <p className="font-extrabold text-[#0B192C] mt-1">{programLabel}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  {isInternal ? "SEMESTER & ASSESSMENT" : "SEMESTER & EXAM MONTH"}
                </p>
                <p className="font-extrabold text-[#0B192C] mt-1">
                  {latestSemester
                    ? `${latestSemester.semesterLabel} • ${latestSemester.examMonthYear} (Academic Year ${latestSemester.academicYear})`
                    : "No results published yet"}
                </p>
              </div>
            </div>

            {/* Course Grade Breakdown Table */}
            <div className="mx-6 sm:mx-8 mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-[#0B192C]">
                  {isInternal ? `${latestSemester?.assessmentType} Marks` : "Course Grade Breakdown"}
                </h4>
                {!isInternal && (
                  <span className="text-xs sm:text-sm font-extrabold text-slate-500">Total Credits: {latestSemester?.totalCredits ?? 0}</span>
                )}
              </div>

              {resultEntries.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {resultEntries.map((entry, i) => {
                    const active = entry === latestSemester;
                    return (
                      <button
                        key={`${entry.semester}-${entry.assessmentType}`}
                        type="button"
                        onClick={() => setResultIndex(i)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition ${
                          active ? "bg-[#0B192C] text-white border-[#0B192C]" : "bg-white text-[#0B192C] border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {entry.semesterLabel} • {entry.assessmentType}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="overflow-auto rounded-2xl border border-slate-200 max-h-[75vh]">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0B192C] text-white text-xs font-extrabold uppercase tracking-wider sticky top-0 z-20">
                    <tr>
                      <th className="px-5 py-4">COURSE CODE</th>
                      <th className="px-5 py-4">COURSE TITLE</th>
                      {!isInternal && <th className="px-5 py-4 text-center">CREDITS</th>}
                      <th className="px-5 py-4 text-center">MARKS (/100)</th>
                      <th className="px-5 py-4 text-center">GRADE</th>
                      {!isInternal && <th className="px-5 py-4 text-center">GRADE POINTS</th>}
                      <th className="px-5 py-4 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {studentCourses.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4 font-mono font-bold text-[#0B192C]">{c.code}</td>
                        <td className="px-5 py-4 font-extrabold text-slate-900">{c.title}</td>
                        {!isInternal && <td className="px-5 py-4 text-center text-slate-600">{c.credits}</td>}
                        <td className="px-5 py-4 text-center font-bold text-slate-800">{c.total}</td>
                        <td className="px-5 py-4 text-center font-extrabold text-[#0B192C]">{c.grade}</td>
                        {!isInternal && <td className="px-5 py-4 text-center font-bold text-slate-800">{c.points}</td>}
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-block text-xs font-extrabold px-3 py-1 rounded-full border ${
                              c.status === "PASS"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {studentCourses.length === 0 && (
                      <tr>
                        <td colSpan={isInternal ? 5 : 7} className="px-5 py-10 text-center text-sm font-bold text-slate-500">
                          {resultsError ?? (results ? "Your results have not been published yet." : "Loading your results...")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revaluation & answer-script photocopy (window opened by the Super Admin; requests go to the COE) */}
            {!isResultsWithheld && studentCourses.length > 0 && (
              <div className="p-6 sm:p-8 m-6 sm:m-8 bg-[#F8F5EE] rounded-3xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[#0B192C]">Revaluation & Answer Script Photocopy</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        For {latestSemester?.semesterLabel} · {latestSemester?.assessmentType}; requests go to the Controller of Examinations
                      </p>
                    </div>
                  </div>
                  {isRevalWindowOpen ? (
                    <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm self-start">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                      WINDOW OPEN (Fee: ₹{revalFeePerCourse} / course)
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 self-start">
                      <Lock size={12} />
                      WINDOW CLOSED
                    </span>
                  )}
                </div>

                {myRevaluations.length > 0 && (
                  <div className="space-y-2">
                    {myRevaluations.map((r) => (
                      <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-mono font-bold text-[#0B192C]">{r.refId}</span>
                          <span className="text-slate-500"> · {r.semester} · {r.assessmentType} · {r.subjectCodes.join(", ")} · ₹{r.totalFee}</span>
                          {r.note && <p className="text-slate-600 mt-1">COE note: {r.note}</p>}
                        </div>
                        <span
                          className={`self-start sm:self-auto px-3 py-1 rounded-full font-extrabold text-[10px] ${
                            r.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status === "IN_REVIEW" ? "IN REVIEW" : r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {isRevalWindowOpen ? (
                  activeRevaluation ? (
                    <p className="text-xs text-emerald-800 font-semibold">
                      Your request {activeRevaluation.refId} for these results is being processed.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                        <span>Select the course(s) for answer-script copy and revaluation:</span>
                        {revalDeadline && (
                          <span className="text-slate-500">
                            Deadline: <strong className="text-[#0B192C]">{new Date(revalDeadline).toLocaleString()}</strong>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {studentCourses.map((c) => {
                          const isSelected = revalSelectedCourses.includes(c.code);
                          return (
                            <label
                              key={c.code}
                              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected ? "border-purple-600 bg-purple-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <span className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRevalCourse(c.code)}
                                  className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500 shrink-0"
                                />
                                <span className="min-w-0">
                                  <span className="font-mono text-xs font-bold text-[#0B192C]">{c.code}</span>
                                  <span className="block text-xs font-semibold text-slate-700 truncate">{c.title}</span>
                                </span>
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-500 shrink-0">
                                {c.total} · {c.grade}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                        <div className="text-xs font-semibold text-slate-700">
                          Selected: <strong className="text-[#0B192C] font-black">{revalSelectedCourses.length}</strong> course(s) · Fee:{" "}
                          <strong className="text-purple-700 font-black text-sm">₹{revalSelectedCourses.length * revalFeePerCourse}</strong>
                        </div>
                        <button
                          onClick={handleApplyRevaluation}
                          disabled={revalSelectedCourses.length === 0 || revalBusy}
                          className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition"
                        >
                          <RotateCcw size={14} />
                          <span>{revalBusy ? "Submitting..." : "Submit Revaluation Request"}</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    The revaluation window is not open at the moment. The Controller of Examinations announces when it opens.
                  </p>
                )}
              </div>
            )}

            {/* Footer Card */}
            <div className="bg-[#0B192C] text-white p-6 sm:p-8 mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center items-center divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              {isInternal && latestSemester ? (
                <>
                  {/* Internal assessment tests have no SGPA / CGPA */}
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">ASSESSMENT</p>
                    <p className="text-2xl font-black text-white mt-1">{latestSemester.assessmentType}</p>
                  </div>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">TOTAL MARKS</p>
                    <p className="text-3xl font-black text-white mt-1">
                      {latestSemester.totalMarks} <span className="text-base text-white/60">/ {latestSemester.maxMarks}</span>
                    </p>
                  </div>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">AVERAGE</p>
                    <p className="text-3xl font-black text-white mt-1">
                      {latestSemester.maxMarks ? ((latestSemester.totalMarks * 100) / latestSemester.maxMarks).toFixed(1) : "0"}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">SEMESTER SGPA</p>
                    <p className="text-3xl font-black text-white mt-1">
                      {latestSemester?.sgpa != null ? Number(latestSemester.sgpa).toFixed(2) : "—"}
                    </p>
                  </div>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">CUMULATIVE CGPA</p>
                    <p className="text-3xl font-black text-white mt-1">{results?.cgpa != null ? Number(results.cgpa).toFixed(2) : "—"}</p>
                  </div>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">OVERALL RESULT</p>
                    <p className="text-lg font-black text-[#38BDF8] mt-1 tracking-wide">{results?.overallResult ?? "—"}</p>
                  </div>
                </>
              )}
            </div>

          </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}

export default function Home() {
  const [authenticatedRole, setAuthenticatedRole] = useState<Role | null>(null);
  // Staff share the examination workflow data (timetable, notifications, paper correction, revaluation) via the server
  useEffect(() => {
    if (authenticatedRole && authenticatedRole !== "Student") startSharedStore();
  }, [authenticatedRole]);
  const [activeStudent, setActiveStudent] = useState<{
    reg: string;
    name: string;
    semester: number;
  }>({
    reg: "",
    name: "",
    semester: 1,
  });
  const [activeHod, setActiveHod] = useState<{ name: string; department: string }>({
    name: "",
    department: "",
  });

  // A saved staff profile: show the new name (HOD header reads activeHod; the staff shell reads the stored user)
  useEffect(() => {
    const onSaved = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      setActiveHod((prev) => ({ ...prev, name: name || prev.name }));
    };
    window.addEventListener("kvell:profile-updated", onSaved);
    return () => window.removeEventListener("kvell:profile-updated", onSaved);
  }, []);

  const handleAuth = (
    role: Role,
    studentInfo?: { reg: string; name: string; semester: number },
    hodInfo?: { name: string; department: string }
  ) => {
    if (studentInfo) {
      setActiveStudent(studentInfo);
    }
    if (hodInfo) {
      setActiveHod(hodInfo);
    }
    setAuthenticatedRole(role);
  };

  if (!authenticatedRole) {
    return <LoginPage onAuthenticated={handleAuth} />;
  }

  if (authenticatedRole === "Student") {
    return (
      <StudentDashboard
        studentReg={activeStudent.reg}
        studentName={activeStudent.name}
        initialSemester={activeStudent.semester}
        onLogout={() => {
          authApi.logout();
          setAuthenticatedRole(null);
        }}
      />
    );
  }

  if (authenticatedRole === "HOD") {
    return (
      <HodPortalDashboard
        hodName={activeHod.name}
        department={activeHod.department}
        onLogout={() => {
          authApi.logout();
          setAuthenticatedRole(null);
        }}
      />
    );
  }

  if (authenticatedRole === "Associate Dean" || authenticatedRole === "Dean") {
    return (
      <AssociateDeanDashboard
        onLogout={() => {
          authApi.logout();
          setAuthenticatedRole(null);
        }}
      />
    );
  }

  return (
    <AppShell
      role={authenticatedRole}
      onLogout={() => {
          authApi.logout();
          setAuthenticatedRole(null);
        }}
    />
  );
}
