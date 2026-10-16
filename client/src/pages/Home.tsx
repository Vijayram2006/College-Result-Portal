import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "../lib/trpc";
import { aidsSem1Students } from "../data/aidsStudents";
import { marksStudentsList, generalStudentsList, ensureDummyMarksLoaded, cseSem1Students, bmeSem1Students } from "../data/dummyMarksData";
import * as XLSX from "xlsx";
import { FacultyMarkEntry, clearFacultyPharmacyAndNursingData } from "../components/FacultyMarkEntry";
import type { LucideIcon } from "lucide-react";
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
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PenLine,
  Plus,
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

type Role = "Student" | "Faculty" | "HOD" | "Dean" | "Admin";
type PageKey =
  | "dashboard"
  | "subjects"
  | "marks"
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
  | "noticeboard";

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
    name: "Aarav Sharma",
    roleLabel: "Student (B.Tech CSE)",
    initials: "AS",
    department: "Computer Science & Engineering",
  },
  Faculty: {
    name: "Dr. Ananya Menon",
    roleLabel: "Faculty",
    initials: "AM",
    department: "Computer Science & Engineering",
  },
  HOD: {
    name: "Dr. Raghav Iyer",
    roleLabel: "Head of Department",
    initials: "RI",
    department: "Computer Science & Engineering",
  },
  Dean: {
    name: "Dr. Meera Krishnan",
    roleLabel: "Dean of Academics",
    initials: "MK",
    department: "Academic Affairs",
  },
  Admin: {
    name: "KVELL System Administrator",
    roleLabel: "System Administrator",
    initials: "AD",
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
    { key: "marks", label: "Marks Entry", icon: PenLine },
  ],
  HOD: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "faculty", label: "Faculty", icon: GraduationCap },
    { key: "students", label: "Students", icon: UsersRound },
    { key: "performance", label: "Performance", icon: BarChart3 },
    { key: "at-risk", label: "At-Risk Students", icon: ShieldAlert },
    { key: "reports", label: "Reports", icon: FileText },
  ],
  Dean: [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "departments", label: "Departments", icon: Building2 },
    { key: "dean-review", label: "Mark Review", icon: FileBarChart },
    { key: "performance", label: "Performance", icon: BarChart3 },
    { key: "trends", label: "Trends", icon: TrendingUp },
    { key: "at-risk", label: "At-Risk Students", icon: ShieldAlert },
    { key: "reports", label: "Reports", icon: FileText },
  ],
  Admin: [
    { key: "students", label: "Students Directory", icon: UsersRound },
    { key: "admin", label: "User Access & Add Student", icon: UserPlus },
    { key: "electives", label: "Create Elective Group", icon: BookOpen },
    { key: "elective-demand", label: "Elective Demand", icon: BarChart3 },
  ],
};

const facultyTrend = [
  { period: "IA-1", score: 68, benchmark: 64 },
  { period: "Test 1", score: 72, benchmark: 67 },
  { period: "IA-2", score: 76, benchmark: 71 },
  { period: "Test 2", score: 78, benchmark: 73 },
  { period: "Seminar", score: 81, benchmark: 76 },
];

const facultySubjectData = [
  { subject: "Data Structures", value: 82 },
  { subject: "Networks", value: 76 },
  { subject: "Operating Systems", value: 71 },
  { subject: "DBMS", value: 68 },
];

const hodTrend = [
  { period: "2023–24", score: 67 },
  { period: "2024–25", score: 71 },
  { period: "2025–26", score: 76 },
  { period: "Current", score: 79 },
];

const deanTrend = [
  { period: "2023", cse: 71, ece: 68, mech: 64, it: 73 },
  { period: "2024", cse: 75, ece: 71, mech: 67, it: 76 },
  { period: "2025", cse: 78, ece: 75, mech: 70, it: 79 },
  { period: "2026", cse: 81, ece: 78, mech: 73, it: 82 },
];

const students: Array<{ reg: string; name: string; section: string; semester: string; average: number; status: string }> = generalStudentsList;

const subjects = [
  { code: "CS601", name: "Data Structures", section: "CSE A", students: 64, average: 82, completion: 96, tone: "success" as const },
  { code: "CS603", name: "Operating Systems", section: "CSE B", students: 58, average: 71, completion: 89, tone: "warning" as const },
  { code: "CS605", name: "Database Management Systems", section: "CSE A", students: 64, average: 68, completion: 78, tone: "warning" as const },
  { code: "CS607", name: "Cloud Computing", section: "CSE B", students: 58, average: 76, completion: 94, tone: "success" as const },
];

const attentionStudents: Array<{ reg: string; student: string; subject: string; performance: number; trend: string; status: string }> = [];

const facultyRows = [
  { name: "Dr. Ananya Menon", subjects: 4, students: 244, average: 76, completion: 92, status: "On track" },
  { name: "Prof. Vikram Shah", subjects: 3, students: 186, average: 73, completion: 88, status: "On track" },
  { name: "Dr. Priya Nair", subjects: 3, students: 172, average: 69, completion: 79, status: "Review" },
  { name: "Prof. Arjun Rao", subjects: 2, students: 128, average: 81, completion: 96, status: "On track" },
];

const departments: Array<{ name: string; short: string; faculty: number; students: number; average: number; improvement: string; risk: number; status: string }> = [
  { name: "Artificial Intelligence & Data Science", short: "AIDS", faculty: 12, students: 50, average: 86, improvement: "+4.2%", risk: 2, status: "Healthy" },
  { name: "Computer Science and Engineering", short: "CSE", faculty: 18, students: 20, average: 88, improvement: "+5.1%", risk: 1, status: "Healthy" },
  { name: "Biomedical Engineering", short: "BME", faculty: 10, students: 15, average: 84, improvement: "+3.8%", risk: 1, status: "Healthy" },
  { name: "Automobile Engineering", short: "AUTO", faculty: 8, students: 0, average: 78, improvement: "+1.2%", risk: 0, status: "Healthy" },
  { name: "Biotech", short: "BIOTECH", faculty: 9, students: 0, average: 80, improvement: "+2.0%", risk: 0, status: "Healthy" },
  { name: "Electronics & Communication Engineering", short: "ECE", faculty: 14, students: 0, average: 81, improvement: "+2.5%", risk: 0, status: "Healthy" },
  { name: "Electrical & Electronics Engineering", short: "EEE", faculty: 11, students: 0, average: 79, improvement: "+1.9%", risk: 0, status: "Healthy" },
  { name: "Civil Engineering", short: "CIVIL", faculty: 9, students: 0, average: 76, improvement: "+1.5%", risk: 0, status: "Healthy" },
  { name: "Robotics and Automation", short: "R&A", faculty: 8, students: 0, average: 82, improvement: "+3.0%", risk: 0, status: "Healthy" },
  { name: "Mechanical Engineering", short: "MECH", faculty: 15, students: 0, average: 77, improvement: "+1.7%", risk: 0, status: "Healthy" },
  { name: "Master of Business Administration", short: "MBA", faculty: 12, students: 0, average: 83, improvement: "+2.4%", risk: 0, status: "Healthy" },
  { name: "Master of Computer Applications", short: "MCA", faculty: 10, students: 0, average: 85, improvement: "+3.1%", risk: 0, status: "Healthy" },
];

const marksStudents: Array<{ reg: string; name: string; sub1: string; sub2: string; sub3: string; sub4: string; sub5: string }> = marksStudentsList;

const GRADE_OPTIONS = ["O", "A+", "A", "B+", "B", "C", "F"] as const;

function calculateStudentResult(grades: Record<string, string>): { status: "PASS" | "FAIL"; grade: string } {
  const subjectList = ["sub1", "sub2", "sub3", "sub4", "sub5"];
  const list = subjectList.map((s) => (grades[s] || "O").toUpperCase());
  const hasFail = list.some((g) => g === "F" || g === "RA" || g === "FAIL");
  const points: Record<string, number> = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "F": 0 };
  if (hasFail) return { status: "FAIL", grade: "F" };
  const avg = list.reduce((sum, g) => sum + (points[g] ?? 6), 0) / Math.max(list.length, 1);
  const overallGrade = avg >= 9.5 ? "O" : avg >= 8.5 ? "A+" : avg >= 7.5 ? "A" : avg >= 6.5 ? "B+" : avg >= 5.5 ? "B" : "C";
  return { status: "PASS", grade: overallGrade };
}

function buildIAComparison(rows: any[]) {
  return (["Semester 1", "Semester 2"] as const).map((assessment) => {
    return { assessment, average: 85, highest: 98, lowest: 55, passPercentage: 92, count: 5 };
  });
}

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
    facultyName: "Dr. Ananya Menon",
    examinerId: "KVELL-FAC-ENG-018",
    department: "Computer Science & Engineering",
    badgeBg: "bg-amber-100 border-amber-300",
    badgeText: "text-amber-900",
    hodName: "Dr. Jayapradha (HOD CSE)",
    courses: [
      {
        id: "CRS-CS3351",
        code: "CS3351",
        title: "Digital Principles and Computer Organization",
        department: "Computer Science & Engineering",
        deptShort: "CSE",
        semester: "Semester I",
        section: "Section A",
        type: "Theory",
        enrolledStudents: 70,
        evaluatedStudents: 64,
        passRate: 91.4,
        avgScore: 78.2,
        status: "In Progress",
      },
      {
        id: "CRS-AI3401",
        code: "AI3401",
        title: "Artificial Intelligence & Neural Networks",
        department: "Artificial Intelligence & Data Science",
        deptShort: "AIDS",
        semester: "Semester I",
        section: "Section A",
        type: "Theory",
        enrolledStudents: 50,
        evaluatedStudents: 34,
        passRate: 85.3,
        avgScore: 72.4,
        status: "In Progress",
      },
      {
        id: "CRS-CS3361",
        code: "CS3361",
        title: "Database Systems Laboratory & Practical",
        department: "Computer Science & Engineering",
        deptShort: "CSE",
        semester: "Semester I",
        section: "Section B",
        type: "Laboratory",
        enrolledStudents: 20,
        evaluatedStudents: 20,
        passRate: 100,
        avgScore: 84.5,
        status: "Completed",
      },
      {
        id: "CRS-CS3352",
        code: "CS3352",
        title: "Design and Analysis of Algorithms",
        department: "Computer Science & Engineering",
        deptShort: "CSE",
        semester: "Semester I",
        section: "Section A",
        type: "Theory",
        enrolledStudents: 60,
        evaluatedStudents: 60,
        passRate: 90.0,
        avgScore: 76.1,
        status: "Completed",
      },
    ],
  },
  Pharmacy: {
    collegeKey: "Pharmacy",
    collegeName: "Karpaga Vinayaga Institute for Pharmaceutical Sciences",
    collegeSubtitle: "Approved by Pharmacy Council of India (PCI) · Affiliated to The TN Dr. M.G.R. Medical University",
    shortName: "Pharmacy",
    icon: "💊",
    logoUrl: "/pharmacy-logo.png",
    facultyName: "Dr. S. Ramanathan",
    examinerId: "KVELL-FAC-PHARM-009",
    department: "Pharmaceutics & Pharmaceutical Analysis",
    badgeBg: "bg-emerald-100 border-emerald-300",
    badgeText: "text-emerald-900",
    hodName: "Dr. K. Raman (HOD Pharmacy)",
    courses: [],
  },
  Nursing: {
    collegeKey: "Nursing",
    collegeName: "Karpaga Vinayaga College of Nursing",
    collegeSubtitle: "Approved by Indian Nursing Council (INC) & TN Nurses Council · Affiliated to The TN Dr. M.G.R. Medical University",
    shortName: "Nursing",
    icon: "🏥",
    logoUrl: "/nursing-logo.png",
    facultyName: "Prof. Mary Thomas",
    examinerId: "KVELL-FAC-NUR-014",
    department: "Medical-Surgical & Clinical Nursing",
    badgeBg: "bg-sky-100 border-sky-300",
    badgeText: "text-sky-900",
    hodName: "Prof. Grace David (HOD Nursing)",
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

  useEffect(() => {
    if (activeCollege === "Pharmacy" || activeCollege === "Nursing") {
      clearFacultyPharmacyAndNursingData();
    }
  }, [activeCollege]);

  const courses = currentCollege.courses;
  const [courseFilter, setCourseFilter] = useState<"ALL" | "Theory" | "Laboratory">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showGradeAnalyticsModal, setShowGradeAnalyticsModal] = useState(false);

  // Dynamic Functional Metrics
  const totalStudents = useMemo(
    () => courses.reduce((acc, c) => acc + c.enrolledStudents, 0),
    [courses]
  );
  const totalCourses = courses.length;
  const totalEvaluated = useMemo(
    () => courses.reduce((acc, c) => acc + c.evaluatedStudents, 0),
    [courses]
  );
  const marksProgress = totalStudents > 0 ? Math.round((totalEvaluated / totalStudents) * 100) : 0;
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
      {/* Top Banner Card matching Image 2 */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#0B192C] via-[#0F223D] to-[#132A4A] p-6 sm:p-8 text-white border border-[#D4A72C]/30 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <img
              src={currentCollege.logoUrl || "/kvell-logo.png"}
              alt={currentCollege.collegeName}
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white p-1 border-2 border-[#D4A72C] object-contain shadow-lg shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">
                <span>OFFICE OF ACADEMIC AFFAIRS · FACULTY PORTAL</span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight">
                {currentCollege.collegeName}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-semibold max-w-2xl">
                Academic Course Administration, Continuous Internal Assessment &amp; Marks Portal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => onNavigate("marks")}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] px-5 py-3 text-xs font-black shadow-lg transition cursor-pointer"
            >
              <PenLine size={16} strokeWidth={2.5} />
              <span>Enter Internal Marks</span>
            </button>
            <button
              onClick={() => {
                if (totalStudents > 0) setShowRosterModal(true);
                else onNavigate("marks");
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 text-xs font-bold transition cursor-pointer"
            >
              <Users size={16} />
              <span>Student Roster ({totalStudents})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live University Metric Directory Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#B08014]">
          <Sparkles size={14} className="text-[#D4A72C]" />
          <span>LIVE UNIVERSITY METRIC DIRECTORY · CLICK ANY CARD TO INSPECT &amp; MANAGE</span>
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
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#B08014] transition">
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
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#B08014] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
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
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#B08014] transition">
                {totalCourses}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] transition">
              <BookOpen size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="font-bold text-[#B08014]">
              {totalCourses > 0 ? "Active Curriculum" : "0 Active Branches"}
            </span>
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#B08014] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
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
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#B08014] transition">
                {marksProgress}%
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] transition">
              <PenLine size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
            <span className="font-bold text-blue-700">
              {totalStudents > 0 ? `${totalEvaluated} / ${totalStudents} Evaluated` : "No submissions yet"}
            </span>
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#B08014] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
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
              <p className="mt-1 text-3xl font-black text-[#0B192C] group-hover:text-[#B08014] transition">
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
            <span className="font-extrabold text-[#0B192C] group-hover:text-[#B08014] group-hover:translate-x-0.5 transition flex items-center gap-0.5">
              <span>Grade Analytics</span>
              <ChevronRight size={13} />
            </span>
          </div>
        </div>
      </div>

      {/* University Academic Matrix & Branch Directory (matching Image 2) */}
      <Panel className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#D4A72C]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#B08014]">
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
                      Faculty: {currentCollege.facultyName}
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
              There are currently no active course allocations for {currentCollege.collegeName}. All student cohorts and curriculum batches are synchronized with the Controller of Examinations.
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
                      <p className="text-xs font-black text-[#B08014]">{crs.enrolledStudents} Enrolled</p>
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
                  <p className="text-2xl font-black text-blue-700 mt-1">{totalEvaluated} / {totalStudents}</p>
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



function AttentionTable({ compact = false, onView }: { compact?: boolean; onView?: () => void }) {
  return (
    <Panel className="overflow-hidden">
      <div className="p-5 pb-3"><SectionHeading title="Students requiring attention" detail="Prioritized by current performance" action={onView ? <button onClick={onView} className="text-[12px] font-semibold text-[#FC6226] hover:underline">View all</button> : undefined} /></div>
      <div className="mobile-table-scroll">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Performance</th><th className="px-4 py-3">Trend</th><th className="px-5 py-3 text-right">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{attentionStudents.slice(0, compact ? 3 : 5).map((student) => <tr key={student.reg} className="transition hover:bg-slate-50/70"><td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{student.student}</p><p className="mt-0.5 text-[11px] text-slate-400">{student.reg}</p></td><td className="px-4 py-3.5 text-xs text-slate-600">{student.subject}</td><td className="px-4 py-3.5"><span className="text-xs font-semibold text-slate-800">{student.performance}%</span></td><td className="px-4 py-3.5">{student.trend === "down" ? <span className="flex items-center gap-1 text-xs font-medium text-red-700"><TrendingDown size={14} />Declining</span> : student.trend === "up" ? <span className="flex items-center gap-1 text-xs font-medium text-green-700"><TrendingUp size={14} />Improving</span> : <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><Activity size={14} />Stable</span>}</td><td className="px-5 py-3.5 text-right"><StatusBadge tone={student.status === "Critical" ? "danger" : "warning"}>{student.status}</StatusBadge></td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}

// Separate Component for HOD Student Result Search Directory
function StudentResultView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSection, setSelectedSection] = useState("All");

  const [hodStudentsData, setHodStudentsData] = useState<any[]>([]);

  useEffect(() => {
    const load = () => {
      let list: any[] = [];
      try {
        const raw = localStorage.getItem("kvell_students");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed.map((s: any) => ({
              reg: s.regNo,
              name: s.name,
              year: s.year || "1st Year",
              sem: s.semester || "Semester I",
              section: s.section || "A",
              average: s.sgpa ? Math.round(s.sgpa * 10) : 0,
              status: s.status === "ACTIVE" ? "PASS" : "FAIL",
            }));
          }
        }
      } catch (e) {
        console.error(e);
      }

      if (list.length === 0) {
        try {
          const rawBatches = localStorage.getItem("kvell_custom_batches");
          if (rawBatches) {
            const batches = JSON.parse(rawBatches);
            if (Array.isArray(batches)) {
              const studentMap = new Map<string, any>();
              batches.forEach((b: any) => {
                if (Array.isArray(b.records)) {
                  b.records.forEach((r: any) => {
                    if (r.regNo && !studentMap.has(r.regNo)) {
                      studentMap.set(r.regNo, {
                        reg: r.regNo,
                        name: r.studentName || r.name || "Candidate",
                        year: "1st Year",
                        sem: b.semester || "Semester I",
                        section: "Section A",
                        average: r.totalMarks || 0,
                        status: r.resultStatus || "PASS",
                      });
                    }
                  });
                }
              });
              list = Array.from(studentMap.values());
            }
          }
        } catch (e) {}
      }
      setHodStudentsData(list);
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("kvell_students_updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("kvell_students_updated", load);
    };
  }, []);

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
          <span className="bg-[#D4A72C]/15 text-[#B08014] text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full inline-block border border-[#D4A72C]/30">
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
            <label className="text-[11px] font-bold text-slate-500 uppercase">Section:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0B192C] focus:outline-none"
            >
              <option value="All">All Sections</option>
              <option value="CSE A">CSE A</option>
              <option value="CSE B">CSE B</option>
              <option value="IT A">IT A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Results Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B192C] text-white font-extrabold uppercase tracking-wider text-[11px]">
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
                <td className="px-4 py-3.5 text-center font-black text-slate-900">{st.average}%</td>
                <td className="px-5 py-3.5 text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-black border ${
                      st.status === "PASS"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-red-100 text-red-800 border-red-200"
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "studentResult">("dashboard");

  // Year-wise Bar Graph Data for 1st yr, 2nd yr, 3rd yr, 4th yr
  // Rule: < 40% -> RED (#EF4444), >= 40% -> GREEN (#22C55E)
  const [yearGraphData, setYearGraphData] = useState([
    { name: "1st yr", passPercentage: 94.2, students: 60 },
    { name: "2nd yr", passPercentage: 36.5, students: 58 }, // < 40% -> RED
    { name: "3rd yr", passPercentage: 92.0, students: 62 },
    { name: "4th yr", passPercentage: 91.5, students: 55 },
  ]);

  const toggleYearPass = (index: number) => {
    setYearGraphData((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, passPercentage: item.passPercentage < 40 ? 88.0 : 35.0 }
          : item
      )
    );
  };

  // Top Pass Percentage Faculty Data matching CSE department
  const topFacultyRanking = [
    {
      rank: "#1",
      rankTone: "bg-[#D4A72C] text-[#0B192C]",
      name: "Dr. Rajesh Sharma",
      subject: "CS601 - Deep Learning & Neural Networks",
      passRate: "98.5%",
    },
    {
      rank: "#2",
      rankTone: "bg-slate-700 text-white",
      name: "Prof. Meenakshi Sundaram",
      subject: "CS602 - Distributed Systems Architecture",
      passRate: "96.8%",
    },
    {
      rank: "#3",
      rankTone: "bg-amber-900/80 text-amber-200",
      name: "Dr. Ananya Menon",
      subject: "CS201 - Object Oriented Programming",
      passRate: "94.2%",
    },
    {
      rank: "#4",
      rankTone: "bg-slate-800 text-slate-400",
      name: "Dr. Raghav Iyer",
      subject: "CS301 - Data Structures & Algorithms",
      passRate: "92.5%",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#172033] font-sans flex flex-col justify-between selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Top Banner Bar */}
      <div className="bg-[#060D17] text-white border-b border-[#D4A72C]/20 text-[11px] py-2 px-4 sm:px-10 flex flex-wrap items-center justify-between gap-2 z-50">
        <div className="flex items-center gap-2">
          <span className="bg-[#D4A72C] text-[#0B192C] font-extrabold text-[10px] px-2.5 py-0.5 rounded tracking-wider uppercase shadow-sm">
            # OFFICIAL PORTAL
          </span>
          <span className="text-slate-300 font-medium">
            May 2025 Semester End Examination Results Published
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
          <span>AICTE & UGC Approved</span>
          <span>•</span>
          <span className="text-[#D4A72C]">NAAC A++ Accredited</span>
        </div>
      </div>

      {/* Main Header Navbar */}
      <header className="bg-white border-b border-[#E5E1D8] sticky top-0 z-40 shadow-sm">
        <div className="w-full px-4 sm:px-10 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <img
              src={kvellSealLogo}
              alt="KVELL Seal"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-full shadow-md p-0.5 bg-white border-2 border-[#D4A72C]/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0B192C]">
                  KVELL DEEMED TO BE UNIVERSITY
                </span>
                <span className="hidden sm:inline-block bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200">
                  ESTD. 2001
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-[#B08014] tracking-wider uppercase mt-0.5">
                ENGINEERING AND EMERGING SCIENCES • RESULT & GRADE PORTAL
              </p>
            </div>
          </div>

          {/* Center Component Navigation Tabs & COE Admin Switcher */}
          <div className="flex items-center gap-2 bg-[#F8F5EE] p-1.5 rounded-2xl border border-[#E5E1D8]">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === "dashboard"
                  ? "bg-[#0B192C] text-white shadow-md"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              <BarChart3 size={15} className={activeTab === "dashboard" ? "text-[#D4A72C]" : "text-slate-500"} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("studentResult")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === "studentResult"
                  ? "bg-[#0B192C] text-white shadow-md"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
            >
              <Users size={15} className={activeTab === "studentResult" ? "text-[#D4A72C]" : "text-slate-500"} />
              Student Result
            </button>
            
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-black text-[#0B192C] bg-[#D4A72C]/20 hover:bg-[#D4A72C]/40 border border-[#D4A72C]/50 transition flex items-center gap-1.5 shadow-sm"
              title="Open Controller of Examinations Admin Panel"
            >
              <ExternalLink size={14} className="text-[#0B192C]" />
              <span className="hidden md:inline">COE Portal (3002)</span>
            </a>
          </div>

          {/* Right HOD Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-extrabold text-[#0B192C]">{hodName}</p>
              <p className="text-[11px] font-bold text-[#B08014] tracking-wider uppercase">HOD - {department}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm transition"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout Container - Enlarged to Full Window Width */}
      <main className="w-full px-4 sm:px-10 py-8 space-y-8 flex-1">
        {/* Dark Hero Welcome Card */}
        <div className="bg-[#0B192C] text-white rounded-[2rem] p-7 sm:p-9 shadow-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 z-10">
            <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm inline-block">
              HOD PORTAL • {department}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
              {hodName}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              Head of Department (HOD) • {department}
            </p>
          </div>

          {/* Department Pass Rate Pill Box */}
          <div className="bg-white/10 border border-white/15 p-5 rounded-2xl text-center shadow-inner z-10 min-w-[220px]">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              DEPARTMENT PASS RATE
            </span>
            <p className="text-2xl font-black text-[#38BDF8] mt-1 tracking-tight">
              93.5% Overall Pass
            </p>
          </div>
        </div>

        {/* Tab 1: Main HOD Dashboard (Analytics & Pass Graph) */}
        {activeTab === "dashboard" ? (
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
                      <BarChart3 className="text-[#B08014]" size={16} />
                      Year-wise Pass Percentage Graph
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      May 2025 Semester End Examination Pass Rate (%) by Academic Year
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
                  <span className="uppercase text-[10px] text-slate-400">Toggle Threshold:</span>
                  {yearGraphData.map((yr, idx) => (
                    <button
                      key={yr.name}
                      onClick={() => toggleYearPass(idx)}
                      className={`px-2.5 py-1 rounded-lg border transition text-[10px] font-black ${
                        yr.passPercentage < 40
                          ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                          : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                      }`}
                      title="Click to toggle pass percentage above/below 40% rule"
                    >
                      {yr.name}: {yr.passPercentage}%
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
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-[#D4A72C] flex items-center gap-2">
                      🏅 Top Pass Percentage Faculty
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      Faculty members with highest student pass percentage in their handling courses.
                    </p>
                  </div>
                  <span className="bg-white/10 text-slate-200 text-xs font-mono font-bold px-3 py-1 rounded-lg border border-white/10 shrink-0">
                    COMPUTER SCIENCE AND ENGINEERING RANKING
                  </span>
                </div>

                {/* Faculty Ranking List */}
                <div className="space-y-3.5">
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
        ) : (
          /* Tab 2: Separate Component "Student Result" Search Directory */
          <StudentResultView />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Result Portal.</p>
      </footer>
    </div>
  );
}


function DeanMarkReview({ onToast }: { onToast?: (message: string) => void }) {
  const requestsQuery = trpc.review.deanRequests.useQuery();
  const reviewMutation = trpc.review.reviewSubmission.useMutation({ onSuccess: () => { requestsQuery.refetch(); setSelectedId(null); }, onError: () => requestsQuery.refetch() });
  const publishMutation = trpc.marks.publishResults.useMutation({
    onSuccess: (res) => {
      requestsQuery.refetch();
      onToast?.(`Assessment results published successfully to web portal! (${res.count ?? 0} record(s) published)`);
    }
  });
  const requests = requestsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = requests.find((row) => row.submission.id === selectedId);
  useEffect(() => { if (selectedId === null && requests[0]) setSelectedId(requests[0].submission.id); }, [requests, selectedId]);
  const comparisonInput = useMemo(() => selected ? { subjectId: selected.submission.subjectId, semester: selected.submission.semester, section: selected.submission.section } : { semester: "__none__" }, [selected]);
  const comparisonQuery = trpc.reports.rows.useQuery(comparisonInput, { enabled: Boolean(selected) });
  const comparison = buildIAComparison(comparisonQuery.data ?? []);
  const marks = selected ? (() => { try { return JSON.parse(selected.submission.marksJson) as Record<string, string>; } catch { return {}; } })() : {};
  const studentGradeRows = marksStudents.map((student) => {
    const grades = {
      sub1: marks[`${student.reg}-sub1`] || student.sub1,
      sub2: marks[`${student.reg}-sub2`] || student.sub2,
      sub3: marks[`${student.reg}-sub3`] || student.sub3,
      sub4: marks[`${student.reg}-sub4`] || student.sub4,
      sub5: marks[`${student.reg}-sub5`] || student.sub5,
    };
    const res = calculateStudentResult(grades);
    return { ...student, grades, res };
  });
  const review = (decision: "approve" | "return") => { if (selected && !reviewMutation.isPending) reviewMutation.mutate({ id: selected.submission.id, decision, reviewer: "Dean" }); };
  const exportSelected = () => { if (!selected) return; const data = studentGradeRows.map((row) => ({ Department: "Computer Science and Engineering", Year: selected.submission.academicYear, Semester: selected.submission.semester, Subject: selected.subject?.name ?? "", Section: selected.submission.section, "Register Number": row.reg, "Student Name": row.name, "Sub 1": row.grades.sub1, "Sub 2": row.grades.sub2, "Sub 3": row.grades.sub3, "Sub 4": row.grades.sub4, "Sub 5": row.grades.sub5, Result: `${row.res.status} (${row.res.grade})` })); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), selected.submission.assessment); XLSX.writeFile(workbook, `KVELL_CSE_${selected.submission.assessment}_review.xlsx`); };
  return <div className="space-y-6"><PageIntro eyebrow="Dean workspace" title="Mark Review" description="Review HOD-approved internal assessment marks and publish finalized results to the student portal." action={<button onClick={() => publishMutation.mutate({})} disabled={publishMutation.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#FC6226] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E04F18] disabled:opacity-50"><CheckCircle2 size={14} />{publishMutation.isPending ? "Publishing..." : "Publish All Results to Portal"}</button>} /><div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]"><Panel className="p-5"><SectionHeading title="Review queue" detail="Select a HOD-approved assessment" /><div className="mt-4 space-y-3">{requests.map((row) => <button key={row.submission.id} onClick={() => setSelectedId(row.submission.id)} className={cn("w-full rounded-lg border p-3 text-left transition", selectedId === row.submission.id ? "border-[#F5D8B4] bg-[#FFE8C2]/50" : "border-slate-100 hover:border-[#FC6226]/30")}><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">{row.subject?.name ?? "Subject"}</p><p className="mt-1 text-[11px] leading-4 text-slate-500">YR {row.submission.academicYear} · SEM {row.submission.semester}<br />SUB {row.subject?.code ?? "—"} · SEC {row.submission.section} · {row.submission.assessment}</p></div><StatusBadge tone="warning">Pending</StatusBadge></div></button>)}{requests.length === 0 && <EmptyState title="No marks awaiting Dean review" detail="HOD-approved assessment submissions will appear here." />}</div></Panel>{selected ? <div className="space-y-5"><Panel className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-[#C2410C]">Computer Science and Engineering · {selected.submission.assessment}</p><h2 className="mt-1 text-base font-semibold text-slate-900">{selected.subject?.name ?? "Subject"}</h2><p className="mt-1 text-xs text-slate-500">YR {selected.submission.academicYear} · SEM {selected.submission.semester} · SUB {selected.subject?.code ?? "—"} · SEC {selected.submission.section}</p></div><div className="flex gap-2"><button onClick={exportSelected} className="inline-flex items-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Export Excel</button><button onClick={() => publishMutation.mutate({ subjectId: selected.submission.subjectId })} disabled={publishMutation.isPending} className="inline-flex items-center gap-1.5 rounded-md bg-[#FC6226] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E04F18] disabled:opacity-50"><CheckCircle2 size={14} />Publish subject</button></div></div><div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-4">{([["Average Grade", "A+"], ["Pass Count", "5/5"], ["Fail Count", "0"], ["Pass percentage", "100%"]] as const).map(([label, value]) => <MetricTile key={label} label={label} value={String(value)} />)}</div><div className="mobile-table-scroll"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Register Number & Student</th><th className="px-3 py-3 text-center">Sub 1</th><th className="px-3 py-3 text-center">Sub 2</th><th className="px-3 py-3 text-center">Sub 3</th><th className="px-3 py-3 text-center">Sub 4</th><th className="px-3 py-3 text-center">Sub 5</th><th className="px-5 py-3 text-right">Result</th></tr></thead><tbody className="divide-y divide-slate-100">{studentGradeRows.map((row) => <tr key={row.reg}><td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{row.name}</p><p className="text-[11px] font-mono text-slate-400">{row.reg}</p></td><td className="px-3 py-3.5 text-center text-xs font-bold text-slate-800">{row.grades.sub1}</td><td className="px-3 py-3.5 text-center text-xs font-bold text-slate-800">{row.grades.sub2}</td><td className="px-3 py-3.5 text-center text-xs font-bold text-slate-800">{row.grades.sub3}</td><td className="px-3 py-3.5 text-center text-xs font-bold text-slate-800">{row.grades.sub4}</td><td className="px-3 py-3.5 text-center text-xs font-bold text-slate-800">{row.grades.sub5}</td><td className="px-5 py-3.5 text-right"><StatusBadge tone={row.res.status === "PASS" ? "success" : "danger"}>{row.res.status} ({row.res.grade})</StatusBadge></td></tr>)}</tbody></table></div></Panel><Panel className="p-5"><SectionHeading title="IA-1 vs IA-2 · CSE" detail="Submitted review marks comparison" /><div className="h-[230px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="assessment" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="average" name="Average" fill="#FC6226" radius={[4, 4, 0, 0]} /><Bar dataKey="highest" name="Highest" fill="#E04F18" radius={[4, 4, 0, 0]} /><Bar dataKey="lowest" name="Lowest" fill="#FDBA74" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel><div className="flex justify-end gap-2"><button onClick={() => review("return")} disabled={reviewMutation.isPending} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Return to HOD</button><button onClick={() => review("approve")} disabled={reviewMutation.isPending} className="rounded-md bg-[#FC6226] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E04F18]">Approve assessment</button></div></div> : <EmptyState title="Select a review request" detail="Choose an item from the Dean review queue to inspect its IA marks." />}</div></div>;
}

function DeanDashboard({ onNavigate, onToast }: { onNavigate: (page: PageKey) => void; onToast?: (message: string) => void }) {
  const requestsQuery = trpc.review.deanRequests.useQuery();
  const reportsQuery = trpc.reports.rows.useQuery({});
  const subjectsQuery = trpc.subjects.list.useQuery();
  const reviewMutation = trpc.review.reviewSubmission.useMutation({ onSuccess: () => { requestsQuery.refetch(); setSelectedId(null); }, onError: () => requestsQuery.refetch() });
  const publishMutation = trpc.marks.publishResults.useMutation({
    onSuccess: () => {
      requestsQuery.refetch();
      reportsQuery.refetch();
      onToast?.("All results published successfully to web portal!");
    }
  });
  const requests = requestsQuery.data ?? [];
  const reportRows = reportsQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = requests.find((row) => row.submission.id === selectedId);
  const comparisonInput = useMemo(() => selected ? { subjectId: selected.submission.subjectId, semester: selected.submission.semester, section: selected.submission.section } : { semester: "__none__" }, [selected]);
  const comparisonQuery = trpc.reports.rows.useQuery(comparisonInput, { enabled: Boolean(selected) });
  const comparison = buildIAComparison(comparisonQuery.data ?? []);
  const selectedMarks = selected ? (() => { try { return JSON.parse(selected.submission.marksJson) as Record<string, number>; } catch { return {}; } })() : {};
  const selectedIaRows = Object.entries(selectedMarks).filter(([key]) => key.endsWith("-internal")).map(([key, value]) => { const reg = key.replace(/-internal$/, ""); const student = students.find((item) => item.reg === reg); return { reg, name: student?.name ?? reg, value: Number(value || 0) }; });
  const totalMarks = reportRows.reduce((sum, row) => { try { return sum + Object.values(JSON.parse(row.submission.marksJson) as Record<string, number>).reduce((inner, value) => inner + Number(value || 0), 0); } catch { return sum; } }, 0);
  const totalEntries = reportRows.reduce((sum, row) => { try { return sum + Object.keys(JSON.parse(row.submission.marksJson) as Record<string, number>).length; } catch { return sum; } }, 0);
  const average = totalEntries ? Math.round((totalMarks / (totalEntries * 20)) * 100) : 0;
  const review = (id: number, decision: "approve" | "return") => { if (!reviewMutation.isPending) reviewMutation.mutate({ id, decision, reviewer: "Dean" }); };
  const exportSelected = () => { if (!selected) return; const data = selectedIaRows.map((row) => ({ Department: "Computer Science and Engineering", Year: selected.submission.academicYear, Semester: selected.submission.semester, Subject: selected.subject?.name ?? "", Section: selected.submission.section, Assessment: selected.submission.assessment, Name: row.name, "IA Mark": row.value })); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), selected.submission.assessment); XLSX.writeFile(workbook, `KVELL_CSE_${selected.submission.assessment}_review.xlsx`); };
  return <div className="space-y-6"><PageIntro eyebrow="Dean executive workspace" title="University overview" description="Review HOD-approved IA marks, inspect student assessment details, and publish approved results to the portal." action={<div className="flex items-center gap-2"><button onClick={() => publishMutation.mutate({})} disabled={publishMutation.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#FC6226] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E04F18] disabled:opacity-50"><CheckCircle2 size={14} />{publishMutation.isPending ? "Publishing..." : "Publish All Results"}</button><button onClick={() => onNavigate("reports")} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileBarChart size={14} />Open reports</button></div>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Dean review requests" value={`${requests.length}`} note="HOD-approved marks awaiting decision" icon={FileText} tone="amber" trend={requests.length ? "down" : "flat"} /><KpiCard label="Subjects with data" value={`${subjects.length}`} note="Persisted subject records" icon={BookOpen} trend="flat" /><KpiCard label="Mark submissions" value={`${reportRows.length}`} note="Live persisted submissions" icon={BarChart3} trend="up" /><KpiCard label="Overall average" value={average ? `${average}%` : "—"} note="Calculated from saved marks" icon={TrendingUp} tone="green" trend="up" /></div><div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Panel className="p-5"><SectionHeading title="Live academic summary" detail="Derived from current backend records" /><div className="space-y-4 pt-2"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><span className="text-xs text-slate-600">Subjects monitored</span><span className="text-sm font-bold text-slate-900">{subjects.length}</span></div><div className="flex items-center justify-between border-b border-slate-100 pb-3"><span className="text-xs text-slate-600">Review queue</span><span className="text-sm font-bold text-amber-700">{requests.length} pending</span></div><div className="flex items-center justify-between"><span className="text-xs text-slate-600">Approved records</span><span className="text-sm font-bold text-green-700">{reportRows.filter((row) => row.submission.status === "FINAL_APPROVED" || (row.submission.status as string) === "approved").length}</span></div></div></Panel><Panel className="p-5"><SectionHeading title="Final approval queue" detail="Select a request to inspect read-only IA assessment marks" /><div className="space-y-3 pt-2">{requests.slice(0, 4).map((row) => <div key={row.submission.id} className={cn("rounded-lg border p-3", selectedId === row.submission.id ? "border-[#F5D8B4] bg-[#FFE8C2]/40" : "border-slate-100")}><button onClick={() => setSelectedId(row.submission.id)} className="w-full text-left"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-800">{row.subject?.name ?? "Subject"}</p><p className="mt-1 text-[11px] text-slate-500">YR {row.submission.academicYear} · SEM {row.submission.semester} · SUB {row.subject?.code ?? "—"} · SEC {row.submission.section} · {row.submission.assessment}</p></div><StatusBadge tone="warning">Dean review</StatusBadge></div></button><div className="mt-3 flex gap-2"><button onClick={() => review(row.submission.id, "return")} disabled={reviewMutation.isPending} className="rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 disabled:opacity-50">Return to HOD</button><button onClick={() => review(row.submission.id, "approve")} disabled={reviewMutation.isPending} className="rounded-md bg-[#FC6226] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#E04F18] disabled:opacity-50">Approve</button></div></div>)}{requests.length === 0 && <p className="py-6 text-center text-xs text-slate-500">No HOD-approved marks waiting for Dean review.</p>}</div></Panel></div>{selected && <><Panel className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-[#C2410C]">Computer Science and Engineering · IA review</p><h2 className="mt-1 text-base font-semibold text-slate-900">{selected.subject?.name ?? "Subject"}</h2><p className="mt-1 text-xs text-slate-500">YR {selected.submission.academicYear} · SEM {selected.submission.semester} · SUB {selected.subject?.code ?? "—"} · SEC {selected.submission.section} · {selected.submission.assessment}</p></div><button onClick={exportSelected} className="inline-flex items-center gap-2 self-start rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Export Excel</button></div><div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-4">{comparison.map((item) => <MetricTile key={item.assessment} label={`${item.assessment} average`} value={item.count ? `${item.average}` : "—"} />)}</div><div className="mobile-table-scroll"><table className="w-full min-w-[500px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-4 py-3">IA mark</th><th className="px-5 py-3 text-right">Mode</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedIaRows.map((row) => <tr key={row.reg}><td className="px-5 py-3.5 text-xs font-medium text-slate-700">{row.name}</td><td className="px-4 py-3.5 text-xs font-semibold text-slate-900">{row.value}</td><td className="px-5 py-3.5 text-right"><StatusBadge tone="neutral">Read only</StatusBadge></td></tr>)}</tbody></table></div></Panel><Panel className="p-5"><SectionHeading title="IA-1 vs IA-2 · CSE" detail="Average, highest, lowest, and pass percentage from submitted review marks" /><div className="mb-4 grid gap-4 lg:grid-cols-2">{comparison.map((item) => <div key={item.assessment} className="rounded-lg border border-slate-100 p-3"><p className="mb-3 text-xs font-bold text-[#8C2F00]">{item.assessment} · Computer Science and Engineering</p><div className="grid grid-cols-2 gap-2">{([["Average", item.average], ["Highest", item.highest], ["Lowest", item.lowest], ["Pass percentage", item.passPercentage]] as const).map(([label, value]) => <div key={label} className="rounded-md bg-[#FFF4D6]/50 p-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}{label === "Pass percentage" ? "%" : ""}</p></div>)}</div></div>)}</div><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="assessment" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="average" name="Average" fill="#FC6226" radius={[4, 4, 0, 0]} /><Bar dataKey="highest" name="Highest" fill="#E04F18" radius={[4, 4, 0, 0]} /><Bar dataKey="lowest" name="Lowest" fill="#FDBA74" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel></>}</div>;
}

function SubjectsPage({ onToast }: { onToast: (message: string) => void }) {
  const subjectsQuery = trpc.subjects.list.useQuery();
  const createSubject = trpc.subjects.create.useMutation({
    onSuccess: async () => {
      await subjectsQuery.refetch();
      setShowCreate(false);
      setNewSubject({ code: "", name: "", semester: "VI", section: "CSE A" });
      onToast("Subject created and available in Marks Entry");
    },
    onError: (error: any) => onToast(error.message || "Unable to create subject"),
  });
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [newSubject, setNewSubject] = useState({ code: "", name: "", semester: "VI", section: "CSE A" });
  const subjectRows = subjectsQuery.data ?? [];
  const visible = subjectRows.filter((subject: any) => `${subject.name} ${subject.code}`.toLowerCase().includes(search.toLowerCase()));
  const selectedSubject = subjectRows.find((subj: any) => subj.id === selectedSubjectId);
  return <div className="space-y-6">
    <PageIntro eyebrow="Faculty workspace" title="My subjects" description="Manage assigned subjects, sections, and assessment progress." action={<button onClick={() => setShowCreate((current) => !current)} className="inline-flex items-center gap-2 rounded-md bg-[#FC6226] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#E04F18]"><BookOpen size={14} />{showCreate ? "Close subject form" : "Add subject"}</button>} />
    {showCreate && <Panel className="border-[#F5D8B4] bg-[#FFE8C2]/40 p-5"><SectionHeading title="Create a new subject" detail="This subject will be available for faculty marks entry and review." /><div className="grid gap-3 md:grid-cols-4"><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Subject code</label><input value={newSubject.code} onChange={(event) => setNewSubject({ ...newSubject, code: event.target.value.toUpperCase() })} placeholder="CS609" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs focus:border-[#FC6226] focus:outline-none" /></div><div className="md:col-span-1"><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Subject name</label><input value={newSubject.name} onChange={(event) => setNewSubject({ ...newSubject, name: event.target.value })} placeholder="Advanced Algorithms" className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs focus:border-[#FC6226] focus:outline-none" /></div><FieldSelect label="Semester" value={newSubject.semester} options={["I"]} /><FieldSelect label="Section" value={newSubject.section} options={["CSE A", "CSE B", "IT A"]} /></div><div className="mt-4 flex justify-end"><button disabled={createSubject.isPending || !newSubject.code || !newSubject.name} onClick={() => createSubject.mutate({ ...newSubject, createdBy: "demo-faculty" })} className="rounded-md bg-[#FC6226] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E04F18] disabled:cursor-not-allowed disabled:opacity-50">{createSubject.isPending ? "Creating…" : "Create subject"}</button></div></Panel>}
    <Panel className="p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="relative min-w-0 flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subjects" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#FC6226] focus:outline-none" /></div><div className="flex gap-2"><select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 focus:border-[#FC6226] focus:outline-none"><option>Semester I</option></select><select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 focus:border-[#FC6226] focus:outline-none"><option>All sections</option><option>Section A</option><option>Section B</option></select></div></div></Panel>
    <div className="grid gap-4 md:grid-cols-2">{visible.map((subject: any, index: number) => { const tone = subject.averageScore >= 75 ? "success" : "warning"; return <Panel key={subject.id} className={cn("reveal-up p-5", `reveal-up-delay-${Math.min(index + 1, 3)}`)}><div className="flex items-start justify-between gap-3"><div><span className="text-[11px] font-bold tracking-[0.14em] text-[#FC6226]">{subject.code}</span><h2 className="mt-2 text-[16px] font-semibold text-slate-900">{subject.name}</h2></div><StatusBadge tone={tone}>{tone === "success" ? "On track" : "Review"}</StatusBadge></div><div className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4"><div><p className="text-[11px] text-slate-400">Semester</p><p className="mt-1 text-xs font-semibold text-slate-700">{subject.semester}</p></div><div><p className="text-[11px] text-slate-400">Section</p><p className="mt-1 text-xs font-semibold text-slate-700">{subject.section}</p></div><div><p className="text-[11px] text-slate-400">Students</p><p className="mt-1 text-xs font-semibold text-slate-700">{subject.studentCount}</p></div></div><div className="mt-4 flex items-center justify-between"><div><p className="text-[11px] text-slate-400">Average score</p><p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-900">{subject.averageScore}%</p></div><div className="w-28"><div className="mb-1.5 flex justify-between text-[10px] text-slate-400"><span>Performance</span><span>{subject.averageScore}%</span></div><MiniProgress value={subject.averageScore} color={tone === "success" ? "#FC6226" : "#b45309"} /></div></div><button onClick={() => setSelectedSubjectId(subject.id)} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FC6226] hover:underline">View details <ChevronRight size={14} /></button></Panel> })}</div>
    {selectedSubject && <Panel className="border-[#F5D8B4] bg-[#FFE8C2]/40 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C2F00]">Subject detail</p><h2 className="mt-2 text-lg font-semibold text-slate-900">{selectedSubject.name}</h2><p className="mt-1 text-xs text-slate-500">{selectedSubject.code} · Semester {selectedSubject.semester} · {selectedSubject.section}</p></div><button onClick={() => setSelectedSubjectId(null)} className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close subject details"><X size={16} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><MetricTile label="Students" value={`${selectedSubject.studentCount}`} /><MetricTile label="Average score" value={`${selectedSubject.averageScore}%`} /><MetricTile label="Review status" value="Active" tone="success" /><MetricTile label="Department" value="CSE" /></div></Panel>}
  </div>;
}

function MarksPage({ role, onToast }: { role: Role; onToast: (message: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectsQuery = trpc.subjects.list.useQuery();
  const saveDraft = trpc.marks.saveDraft.useMutation({
    onSuccess: () => { setUnsaved(false); onToast("Marks draft saved successfully"); },
    onError: (err) => { onToast(`Save failed: ${err.message}`); }
  });
  const submitForReview = trpc.marks.submitForReview.useMutation({
    onSuccess: () => { setUnsaved(false); onToast(role === "Faculty" ? "Results uploaded & submitted to HOD review" : "Results uploaded & submitted to Dean review"); },
    onError: (err) => { onToast(`Submission failed: ${err.message}`); }
  });

  const subjectRows = subjectsQuery.data ?? [];
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [semester, setSemester] = useState("I");
  const [section, setSection] = useState("CSE A");
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [assessment, setAssessment] = useState<"IA-1" | "IA-2">("IA-1");
  const [search, setSearch] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  const [marks, setMarks] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      marksStudents.flatMap((student) => [
        [`${student.reg}-sub1`, student.sub1],
        [`${student.reg}-sub2`, student.sub2],
        [`${student.reg}-sub3`, student.sub3],
        [`${student.reg}-sub4`, student.sub4],
        [`${student.reg}-sub5`, student.sub5],
      ])
    )
  );

  const filteredSubjects = useMemo(() => {
    if (!subjectRows.length) return [];
    const matched = subjectRows.filter((subject) => subject.semester === semester);
    return matched.length ? matched : subjectRows;
  }, [subjectRows, semester]);

  useEffect(() => {
    if (!subjectId && subjectRows.length > 0) {
      setSubjectId(subjectRows[0].id);
    }
  }, [subjectRows, subjectId]);

  const selectedSubject = subjectRows.find((subject) => subject.id === subjectId) ?? subjectRows[0];

  const visible = marksStudents.filter((student) => `${student.reg} ${student.name}`.toLowerCase().includes(search.toLowerCase()));

  const updateMark = (key: string, value: string) => {
    setMarks((current) => ({ ...current, [key]: value }));
    setUnsaved(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (!data.length) {
          onToast("The uploaded file contains no data rows.");
          return;
        }

        const nextMarks: Record<string, string> = { ...marks };
        let updatedCount = 0;
        const subKeys = ["sub1", "sub2", "sub3", "sub4", "sub5"];

        data.forEach((row: any) => {
          const regKey = Object.keys(row).find((k) => /reg|usn|roll|student.*id|code/i.test(k));
          const regVal = regKey ? String(row[regKey]).trim() : null;
          const nameVal = String(row.Name || row.name || row["Student Name"] || "").trim().toLowerCase();

          const student = marksStudents.find(
            (s) => (regVal && s.reg.toLowerCase() === regVal.toLowerCase()) || (nameVal && s.name.toLowerCase() === nameVal)
          );

          if (student) {
            subKeys.forEach((sub, idx) => {
              const valKey = Object.keys(row).find((k) => new RegExp(`sub.*${idx + 1}|subject.*${idx + 1}|${sub}`, "i").test(k));
              if (valKey && row[valKey] !== undefined) {
                const valStr = String(row[valKey]).trim().toUpperCase();
                const matchedGrade = GRADE_OPTIONS.find((g) => g === valStr) || (valStr === "PASS" ? "O" : valStr === "FAIL" ? "F" : "A");
                nextMarks[`${student.reg}-${sub}`] = matchedGrade;
                updatedCount++;
              }
            });
          }
        });

        setMarks(nextMarks);
        setUnsaved(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onToast(`Successfully uploaded results! Parsed ${data.length} student records from ${file.name}`);
      } catch (err: any) {
        onToast(`Failed to parse result file: ${err?.message || "Invalid Excel/CSV format"}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const submitMarks = (mode: "draft" | "review") => {
    if (!selectedSubject) {
      onToast("Select academic year, semester, section, and subject first");
      return;
    }
    const payload = {
      subjectId: selectedSubject.id,
      academicYear,
      semester: selectedSubject.semester || semester,
      section: selectedSubject.section || section,
      assessment,
      marksJson: JSON.stringify(marks),
      role: role === "Admin" ? "Faculty" : role,
    };
    if (mode === "draft") saveDraft.mutate(payload);
    else submitForReview.mutate(payload);
  };

  const handleMarkCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const components = ["internal", "test", "quiz", "seminar"];
    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      targetRow = Math.min(visible.length - 1, rowIndex + 1);
    } else if (e.key === "ArrowLeft") {
      const input = e.currentTarget;
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        if (colIndex > 0) {
          e.preventDefault();
          targetCol = colIndex - 1;
        }
      }
    } else if (e.key === "ArrowRight") {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        if (colIndex < components.length - 1) {
          e.preventDefault();
          targetCol = colIndex + 1;
        }
      }
    }

    if (targetRow !== rowIndex || targetCol !== colIndex) {
      const targetStudent = visible[targetRow];
      const targetComp = components[targetCol];
      if (targetStudent) {
        const el = document.getElementById(`mark-input-${targetStudent.reg}-${targetComp}`);
        if (el) {
          (el as HTMLInputElement).focus();
          (el as HTMLInputElement).select();
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
      <PageIntro
        eyebrow="Faculty workspace"
        title="Marks entry & Result upload"
        description="Enter IA-1 and IA-2 component marks manually or upload an Excel/CSV spreadsheet result file for the selected academic year, semester, section, and subject."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md bg-[#2C1810] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#422518] shadow-sm"
            >
              <Upload size={14} />
              <span>Upload Result File (.xlsx / .csv)</span>
            </button>
            <div className="flex items-center gap-2 text-[11px] text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {unsaved ? "Unsaved changes" : "All changes saved"}
            </div>
          </div>
        }
      />

      <Panel className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <FieldSelect label="Academic year" value={academicYear} options={["2026-27"]} onChange={setAcademicYear} />
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Semester</label>
            <select value={semester} onChange={(event) => setSemester(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs focus:border-[#FC6226] focus:outline-none">
              <option>I</option>
            </select>
          </div>
          <FieldSelect
            label="Section"
            value={section}
            options={Array.from(new Set(subjectRows.map((subject) => subject.section))).length ? Array.from(new Set(subjectRows.map((subject) => subject.section))) : ["CSE A", "CSE B"]}
            onChange={setSection}
          />
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Subject</label>
            <select
              value={subjectId ?? selectedSubject?.id ?? ""}
              onChange={(event) => setSubjectId(Number(event.target.value))}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-[#FC6226] focus:outline-none"
            >
              <option value="">Select subject</option>
              {(filteredSubjects.length ? filteredSubjects : subjectRows).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} · {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-slate-500">IA component set</label>
            <select
              value={assessment}
              onChange={(event) => setAssessment(event.target.value as "IA-1" | "IA-2")}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-[#FC6226] focus:outline-none"
            >
              <option value="IA-1">Internal Assessment 1</option>
              <option value="IA-2">Internal Assessment 2</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500">
            Editing <span className="font-semibold text-[#8C2F00]">{assessment}</span> separately from the other internal assessment. <span className="hidden sm:inline text-[#C2410C]">Tip: Use ↑ ↓ ← → or Enter to navigate marks.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <Upload size={14} />
              <span>Upload Excel Result</span>
            </button>
            <button
              onClick={() => {
                setUnsaved(false);
                onToast("Reset to last saved values");
              }}
              className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600"
            >
              Reset
            </button>
            <button
              disabled={saveDraft.isPending || !selectedSubject}
              onClick={() => submitMarks("draft")}
              className="rounded-md border border-[#FC6226] bg-white px-3.5 py-2 text-xs font-semibold text-[#FC6226] hover:bg-[#FFE8CC] transition disabled:opacity-50"
            >
              {saveDraft.isPending ? "Saving..." : "Save draft"}
            </button>
            <button
              disabled={submitForReview.isPending || !selectedSubject}
              onClick={() => submitMarks("review")}
              className="rounded-md bg-[#FC6226] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E04F18] transition shadow-sm disabled:opacity-50"
            >
              {submitForReview.isPending ? "Submitting..." : role === "Faculty" ? "Submit to HOD" : "Submit to Dean"}
            </button>
          </div>
        </div>
      </Panel>

      <div className="rounded-xl border border-slate-700/60 bg-[#111827] p-4 text-left shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          EXPECTED COLUMNS:
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-100">
          Register Number &bull; Student Name &bull; Sub 1 &bull; Sub 2 &bull; Sub 3 &bull; Sub 4 &bull; Sub 5
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Results are based on grade only (O, A+, A, B+, B, C, F). Internal (40) and External (60) marks removed.
        </p>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{assessment} component marks</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {selectedSubject ? `${selectedSubject.name} · ${selectedSubject.section || section} · ${academicYear}` : "Select a subject to begin"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload size={13} />
              <span>Import file</span>
            </button>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students"
                className="h-9 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="mobile-table-scroll">
          <table className="w-full min-w-[940px] text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Register Number & Student</th>
                <th className="px-3 py-3 text-center">Sub 1</th>
                <th className="px-3 py-3 text-center">Sub 2</th>
                <th className="px-3 py-3 text-center">Sub 3</th>
                <th className="px-3 py-3 text-center">Sub 4</th>
                <th className="px-3 py-3 text-center">Sub 5</th>
                <th className="px-5 py-3 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((student) => {
                const studentGrades = {
                  sub1: marks[`${student.reg}-sub1`] || student.sub1,
                  sub2: marks[`${student.reg}-sub2`] || student.sub2,
                  sub3: marks[`${student.reg}-sub3`] || student.sub3,
                  sub4: marks[`${student.reg}-sub4`] || student.sub4,
                  sub5: marks[`${student.reg}-sub5`] || student.sub5,
                };
                const res = calculateStudentResult(studentGrades);
                return (
                  <tr key={student.reg}>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-slate-800">{student.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{student.reg}</p>
                    </td>
                    {["sub1", "sub2", "sub3", "sub4", "sub5"].map((subKey) => (
                      <td className="px-3 py-3.5 text-center" key={subKey}>
                        <select
                          value={marks[`${student.reg}-${subKey}`] || (student as any)[subKey] || "O"}
                          onChange={(event) => updateMark(`${student.reg}-${subKey}`, event.target.value)}
                          className="h-9 w-20 rounded-md border border-slate-200 bg-white px-2 text-center text-xs font-bold text-slate-800 focus:border-[#FC6226] focus:outline-none focus:ring-1 focus:ring-[#FC6226]"
                        >
                          {GRADE_OPTIONS.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                    <td className="px-5 py-3.5 text-right">
                      <StatusBadge tone={res.status === "PASS" ? "success" : "danger"}>
                        {res.status} ({res.grade})
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function PerformancePage({ role, onToast, studentReg, studentName, onReturn }: { role: Role; onToast: (message: string) => void; studentReg?: string; studentName?: string; onReturn?: () => void }) {
  const subjectsQuery = trpc.subjects.list.useQuery();
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [semester, setSemester] = useState("VI");
  const [assessment, setAssessment] = useState<"IA-1" | "IA-2">("IA-1");
  const [section, setSection] = useState("CSE A");
  const [applied, setApplied] = useState<{ subjectId?: number; semester: string; assessment: "IA-1" | "IA-2"; section: string } | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const subjects = subjectsQuery.data ?? [];
  const reportInput = useMemo(() => studentReg ? {} : applied ? { subjectId: applied.subjectId, semester: applied.semester, assessment: applied.assessment, section: applied.section } : {}, [applied, studentReg]);
  const marksQuery = trpc.reports.rows.useQuery(reportInput, { enabled: Boolean(applied) || Boolean(studentReg) });
  const selectedSubject = subjects.find((subject) => subject.id === applied?.subjectId);
  const marksRows = (marksQuery.data ?? []).flatMap((row) => { let parsed: Record<string, number> = {}; try { parsed = JSON.parse(row.submission.marksJson); } catch { } const regs = Array.from(new Set(Object.keys(parsed).map((key) => key.replace(/-(internal|test|quiz|seminar)$/, "")))); return regs.filter((reg) => !studentReg || reg === studentReg).map((reg) => { const student = marksStudents.find((item) => item.reg === reg); const internal = Number(parsed[`${reg}-internal`] ?? 0); const total = ["internal", "test", "quiz", "seminar"].reduce((sum, component) => sum + Number(parsed[`${reg}-${component}`] ?? 0), 0); return { reg, name: student?.name ?? studentName ?? reg, section: row.submission.section, assessment: row.submission.assessment, internal, total, percentage: Math.round((total / 80) * 100) }; }); });
  const sortedRows = [...marksRows].sort((a, b) => sortOrder === "desc" ? b.internal - a.internal : a.internal - b.internal);
  const seed = selectedSubject ? selectedSubject.name.length % 6 : 0;
  const chartData = studentReg ? (["IA-1", "IA-2"] as const).map((period) => { const rows = marksRows.filter((row) => row.assessment === period); const score = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.internal, 0) / rows.length) : 0; return { period, score, benchmark: 50 }; }) : facultyTrend.map((point, index) => ({ ...point, score: Math.max(40, point.score + seed + index), benchmark: Math.max(38, point.benchmark + index / 2) }));
  const submitFilters = () => { if (!subjectId) { onToast("Select a subject before loading performance"); return; } setApplied({ subjectId, semester, assessment, section }); onToast("Performance marks loaded from the selected parameters"); };
  const title = studentReg ? `${studentName ?? studentReg} · IA performance` : "Student performance";
  return <div className="space-y-6"><PageIntro eyebrow={studentReg ? "Individual student performance" : role === "HOD" ? "Department analytics" : "Faculty workspace"} title={title} description={studentReg ? "Read-only IA-1 and IA-2 marks for this student, calculated from submitted assessment records." : "Select all parameters and submit to view read-only marks from the marks entry portal."} action={studentReg && onReturn ? <button onClick={onReturn} className="rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Return to Students</button> : undefined} />{!studentReg && <Panel className="p-4"><div className="grid gap-3 md:grid-cols-5"><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Subject</label><select value={subjectId ?? ""} onChange={(event) => setSubjectId(Number(event.target.value) || undefined)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="">Select subject</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</select></div><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Semester</label><select value={semester} onChange={(event) => setSemester(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"><option>VI</option><option>V</option><option>IV</option></select></div><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Assessment</label><select value={assessment} onChange={(event) => setAssessment(event.target.value as "IA-1" | "IA-2")} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="IA-1">IA-1</option><option value="IA-2">IA-2</option></select></div><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Section</label><select value={section} onChange={(event) => setSection(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs">{(Array.from(new Set(subjects.map((subject) => subject.section))).length ? Array.from(new Set(subjects.map((subject) => subject.section))) : ["CSE A"]).map((item) => <option key={item}>{item}</option>)}</select></div><button onClick={submitFilters} className="h-10 self-end rounded-md bg-[#FC6226] px-4 text-xs font-semibold text-white hover:bg-[#E04F18]">Submit</button></div><p className="mt-3 text-[11px] text-slate-500">Students remain hidden until Submit. Marks are read-only and reflect the latest saved or submitted marks entry.</p></Panel>}{(applied || studentReg) && <><Panel className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><SectionHeading title={studentReg ? "IA marks by assessment" : `${selectedSubject?.name ?? "Subject"} · ${applied?.assessment}`} detail={studentReg ? "Read-only marks from submitted IA assessments" : `${applied?.semester} · ${applied?.section} · read-only marks`} /><select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"><option value="desc">High to Low</option><option value="asc">Low to High</option></select></div><div className="mobile-table-scroll mt-4"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Assessment</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">IA mark</th><th className="px-5 py-3 text-right">Mode</th></tr></thead><tbody className="divide-y divide-slate-100">{sortedRows.map((row, index) => <tr key={`${row.reg}-${row.assessment}-${index}`}><td className="px-5 py-3.5 text-xs font-semibold text-[#FC6226]">{row.assessment}</td><td className="px-4 py-3.5"><p className="text-xs font-semibold text-slate-800">{row.name}</p><p className="text-[11px] text-slate-400">{row.reg}</p></td><td className="px-4 py-3.5 text-xs text-slate-600">{row.section}</td><td className="px-4 py-3.5 text-xs font-bold text-[#FC6226]">{row.internal}</td><td className="px-5 py-3.5 text-right"><StatusBadge tone="neutral">Read only</StatusBadge></td></tr>)}</tbody></table></div>{sortedRows.length === 0 && <p className="py-8 text-center text-xs text-slate-500">No IA marks found for this student.</p>}</Panel><Panel className="p-5"><SectionHeading title={studentReg ? "Individual IA performance trend" : "Performance trend"} detail="Derived from submitted IA marks" /><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis domain={[40, 95]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} /><ChartTooltip content={<ChartTooltipContent />} /><Line type="monotone" dataKey="score" name="Selected performance" stroke="#FC6226" strokeWidth={2.5} dot={{ r: 3 }} /><Line type="monotone" dataKey="benchmark" name="Benchmark" stroke="#94a3c2" strokeDasharray="4 4" /></LineChart></ResponsiveContainer></div></Panel></>}</div>;
}

function StudentsPage({ onView, role }: { onView: (student: (typeof students)[number]) => void; role: Role }) {
  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [section, setSection] = useState("All sections");
  const usersQuery = trpc.admin.users.useQuery({ actorRole: "Admin" });
  const reportQuery = trpc.reports.rows.useQuery({}, { enabled: role === "HOD" });

  const extraStudents = (usersQuery.data ?? [])
    .filter((u: any) => u.portalRole === "Student")
    .map((u: any) => ({
      reg: u.openId || u.username,
      name: u.name,
      section: u.department?.includes("IT") ? "IT A" : "CSE A",
      semester: "Semester I",
      average: 82,
      status: u.status === "ACTIVE" ? "On track" : "Monitor",
    }));

  const allStudentsList = [
    ...students,
    ...extraStudents.filter((e: any) => !students.some((s) => s.reg === e.reg)),
  ];

  const visible = allStudentsList.filter((student) => `${student.name} ${student.reg} ${student.section}`.toLowerCase().includes(search.toLowerCase()) && (role !== "HOD" || section === "All sections" || student.section === section));
  const reviewRows = (reportQuery.data ?? []).filter((row) => row.submission.status === "PENDING_DEAN" || row.submission.status === "HOD_APPROVED" || row.submission.status === "FINAL_APPROVED" || (row.submission.status as string) === "submitted_to_dean" || (row.submission.status as string) === "approved").flatMap((row) => { let parsed: Record<string, number> = {}; try { parsed = JSON.parse(row.submission.marksJson); } catch { } const regs = Array.from(new Set(Object.keys(parsed).map((key) => key.replace(/-(internal|test|quiz|seminar)$/, "")))); return regs.map((reg) => { const matched = students.find((student) => student.reg === reg); const total = ["internal", "test", "quiz", "seminar"].reduce((sum, component) => sum + Number(parsed[`${reg}-${component}`] ?? 0), 0); return { key: `${row.submission.id}-${reg}`, reg, name: matched?.name ?? reg, subject: row.subject?.name ?? "Subject", section: row.submission.section, assessment: row.submission.assessment, total, percentage: Math.round((total / 80) * 100) }; }); });
  return <div className="space-y-6"><PageIntro eyebrow={role === "HOD" ? "Department directory" : "Faculty workspace"} title="Students" description={role === "HOD" ? "Select academic year and section to review students and their submitted marks." : "Search and review your assigned student records."} /><Panel className="p-4"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">{role !== "HOD" && <div className="relative w-full md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs" /></div>}{role === "HOD" && <div className="flex flex-wrap gap-2"><div><label className="mb-1 block text-[10px] font-semibold text-slate-500">Academic year</label><select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs"><option>2026-27</option></select></div><div><label className="mb-1 block text-[10px] font-semibold text-slate-500">Section</label><select value={section} onChange={(event) => setSection(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs"><option>All sections</option><option>CSE A</option><option>CSE B</option></select></div></div>}</div></Panel><Panel className="overflow-hidden"><div className="mobile-table-scroll"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Semester</th><th className="px-4 py-3">Average performance</th><th className="px-5 py-3 text-right">Status</th>{role !== "HOD" && <th className="px-5 py-3 text-right">View</th>}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((student) => <tr key={student.reg}><td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{student.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{student.reg}</p></td><td className="px-4 py-3.5 text-xs text-slate-600">{student.section}</td><td className="px-4 py-3.5 text-xs text-slate-600">{student.semester}</td><td className="px-4 py-3.5"><div className="flex w-36 items-center gap-2"><MiniProgress value={student.average} color={student.average >= 75 ? "#FC6226" : student.average >= 65 ? "#b45309" : "#b91c1c"} /><span className="text-xs font-semibold text-slate-800">{student.average}%</span></div></td><td className="px-5 py-3.5 text-right"><StatusBadge tone={student.status === "On track" ? "success" : student.status === "Monitor" ? "warning" : "danger"}>{student.status}</StatusBadge></td>{role !== "HOD" && <td className="px-5 py-3.5 text-right"><button onClick={() => onView(student)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FC6226] hover:underline"><Eye size={14} />View</button></td>}</tr>)}</tbody></table></div><div className="border-t border-slate-100 px-5 py-4"><p className="text-[11px] text-slate-400">Showing {visible.length} students for {academicYear}{role === "HOD" && section !== "All sections" ? ` · ${section}` : ""}</p></div></Panel>{role === "HOD" && <Panel className="overflow-hidden"><div className="border-b border-slate-100 p-5"><SectionHeading title="Submitted student marks" detail="Read-only marks from faculty submissions after HOD review" /></div><div className="mobile-table-scroll"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Marks</th><th className="px-5 py-3 text-right">Mode</th></tr></thead><tbody className="divide-y divide-slate-100">{reviewRows.map((row) => <tr key={row.key}><td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{row.name}</p><p className="mt-0.5 text-[11px] text-slate-400">{row.reg}</p></td><td className="px-4 py-3.5 text-xs text-slate-600">{row.subject}</td><td className="px-4 py-3.5 text-xs text-slate-600">{row.section}</td><td className="px-4 py-3.5 text-xs text-slate-600">{row.assessment}</td><td className="px-4 py-3.5 text-xs font-bold text-slate-800">{row.total}/80 · {row.percentage}%</td><td className="px-5 py-3.5 text-right"><StatusBadge tone="neutral">Read only</StatusBadge></td></tr>)}</tbody></table></div>{reviewRows.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No HOD-reviewed student marks are available for the current data.</p>}</Panel>}</div>;
}

function ReportsPage({ onToast }: { onToast: (message: string) => void }) {
  const subjectsQuery = trpc.subjects.list.useQuery();
  const [semester, setSemester] = useState("I");
  const [section, setSection] = useState("All sections");
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const reportsQuery = trpc.reports.rows.useQuery({ semester, section: section === "All sections" ? undefined : section, subjectId });
  const publishMutation = trpc.marks.publishResults.useMutation({
    onSuccess: (res) => {
      reportsQuery.refetch();
      onToast(`Successfully published ${res.count ?? 0} result record(s) to the student portal!`);
    }
  });
  const rows = reportsQuery.data ?? [];
  const exportWorkbook = (kind: "overall" | "IA-1" | "IA-2") => { const selectedRows = rows.filter((row) => kind === "overall" || row.submission.assessment === kind); const data = selectedRows.map((row) => ({ Student: "Class marks", Subject: row.subject?.name ?? "", Semester: row.submission.semester, Section: row.submission.section, Assessment: row.submission.assessment, Status: row.submission.status, Marks: row.submission.marksJson })); const workbook = XLSX.utils.book_new(); const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ Notice: "No submitted marks match the selected parameters" }]); XLSX.utils.book_append_sheet(workbook, sheet, kind === "overall" ? "Overall Marks" : kind.replace("-", " ")); XLSX.writeFile(workbook, `KVELL_${kind.replace("-", "_")}_marks.xlsx`); onToast(`${kind === "overall" ? "Overall" : kind} Excel downloaded`); };
  return <div className="space-y-6"><PageIntro eyebrow="Reporting center" title="Reports" description="Export overall marks, publish assessment results to student portal, or download workbooks." action={<button onClick={() => publishMutation.mutate({ subjectId })} disabled={publishMutation.isPending} className="inline-flex items-center gap-2 rounded-md bg-[#FC6226] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#E04F18] disabled:opacity-50"><CheckCircle2 size={14} />{publishMutation.isPending ? "Publishing..." : subjectId ? "Publish Selected Subject Results" : "Publish All Results to Portal"}</button>} /><Panel className="p-5"><SectionHeading title="Report parameters" detail="Filter the report dataset before downloading Excel or publishing results" /><div className="grid gap-4 sm:grid-cols-3"><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Semester</label><select value={semester} onChange={(event) => setSemester(event.target.value)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"><option>VI</option><option>V</option><option>IV</option></select></div><FieldSelect label="Section" value={section} options={["All sections", "CSE A", "CSE B"]} /><div><label className="mb-1.5 block text-[11px] font-semibold text-slate-500">Subject</label><select value={subjectId ?? ""} onChange={(event) => setSubjectId(Number(event.target.value) || undefined)} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs"><option value="">All subjects</option>{(subjectsQuery.data ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div></div><div className="mt-5 grid gap-3 md:grid-cols-3"><button onClick={() => exportWorkbook("overall")} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FC6226] px-3.5 py-3 text-xs font-semibold text-white hover:bg-[#E04F18]"><Download size={14} />Export overall marks Excel</button><button onClick={() => exportWorkbook("IA-1")} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Export IA-1 Excel</button><button onClick={() => exportWorkbook("IA-2")} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Export IA-2 Excel</button></div><p className="mt-4 text-[11px] text-slate-500">{rows.length} persisted submission records available for export.</p></Panel></div>;
}

function FacultyPage() {
  const requestsQuery = trpc.review.requests.useQuery();
  const reviewMutation = trpc.review.reviewSubmission.useMutation({ onSuccess: () => { requestsQuery.refetch(); setSelectedId(null); }, onError: () => requestsQuery.refetch() });
  const requests = requestsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = requests.find((row) => row.submission.id === selectedId);
  const comparisonInput = useMemo(() => selected ? { subjectId: selected.submission.subjectId, semester: selected.submission.semester, section: selected.submission.section } : { semester: "__none__" }, [selected]);
  const comparisonQuery = trpc.reports.rows.useQuery(comparisonInput, { enabled: Boolean(selected) });
  const comparison = buildIAComparison(comparisonQuery.data ?? []);
  const review = (decision: "approve" | "return") => { if (selected && !reviewMutation.isPending) reviewMutation.mutate({ id: selected.submission.id, decision, reviewer: "HOD" }); };
  const marks = selected ? (() => { try { return JSON.parse(selected.submission.marksJson) as Record<string, number>; } catch { return {}; } })() : {};
  const iaMarkRows = Object.entries(marks).filter(([key]) => key.endsWith("-internal")).map(([key, value]) => { const reg = key.replace(/-internal$/, ""); const student = students.find((item) => item.reg === reg); return { reg, name: student?.name ?? reg, value: Number(value || 0) }; });
  const exportSelected = () => { if (!selected) return; const data = iaMarkRows.map((row) => ({ Department: "Computer Science and Engineering", Year: selected.submission.academicYear, Semester: selected.submission.semester, Subject: selected.subject?.name ?? "", Section: selected.submission.section, Assessment: selected.submission.assessment, Name: row.name, "IA Mark": row.value })); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), selected.submission.assessment); XLSX.writeFile(workbook, `KVELL_CSE_${selected.submission.assessment}_review.xlsx`); };
  return <div className="space-y-6"><PageIntro eyebrow="HOD workspace" title="Faculty review requests" description="Only faculty mark-review requests are shown. Select a request to inspect each student’s IA mark in read-only mode and approve or reject it." /><Panel className="p-5"><SectionHeading title="Pending review requests" detail="Every request includes year, semester, subject, section, and assessment." /><div className="mt-4 space-y-3">{requests.map((row) => <button key={row.submission.id} onClick={() => setSelectedId(row.submission.id)} className={cn("w-full rounded-lg border p-4 text-left transition hover:border-[#FC6226]/30 hover:bg-[#FFE8C2]/30", selectedId === row.submission.id ? "border-[#F5D8B4] bg-[#FFE8C2]/50" : "border-slate-100")}><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{row.subject?.name ?? "Subject"}</p><p className="mt-1 text-[11px] text-slate-500">YR {row.submission.academicYear} · SEM {row.submission.semester} · SUB {row.subject?.code ?? "—"} · SEC {row.submission.section} · {row.submission.assessment}</p></div><StatusBadge tone="warning">Awaiting review</StatusBadge></div></button>)}{requests.length === 0 && <EmptyState title="No faculty review requests" detail="Faculty requests will appear here after marks are submitted for HOD review." />}</div></Panel>{selected && <><Panel className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-[#C2410C]">Computer Science and Engineering · IA review</p><h2 className="mt-1 text-base font-semibold text-slate-900">{selected.subject?.name ?? "Subject"}</h2><p className="mt-1 text-xs text-slate-500">YR {selected.submission.academicYear} · SEM {selected.submission.semester} · SUB {selected.subject?.code ?? "—"} · SEC {selected.submission.section} · {selected.submission.assessment}</p></div><div className="flex gap-2"><button onClick={exportSelected} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Export Excel</button><button onClick={() => review("return")} disabled={reviewMutation.isPending} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Reject</button><button onClick={() => review("approve")} disabled={reviewMutation.isPending} className="rounded-md bg-[#FC6226] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E04F18]">Approve & send Dean</button></div></div><div className="mobile-table-scroll"><table className="w-full min-w-[500px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-4 py-3">Value</th><th className="px-5 py-3 text-right">Mode</th></tr></thead><tbody className="divide-y divide-slate-100">{iaMarkRows.map((row) => <tr key={row.reg}><td className="px-5 py-3.5 text-xs font-medium text-slate-700">{row.name}</td><td className="px-4 py-3.5 text-xs font-semibold text-slate-900">{row.value}</td><td className="px-5 py-3.5 text-right"><StatusBadge tone="neutral">Read only</StatusBadge></td></tr>)}</tbody></table></div></Panel><Panel className="p-5"><SectionHeading title="IA-1 vs IA-2 · CSE" detail="Comparison of submitted review marks" /><div className="mb-4 grid gap-4 lg:grid-cols-2">{comparison.map((item) => <div key={item.assessment} className="rounded-lg border border-slate-100 p-3"><p className="mb-3 text-xs font-bold text-[#8C2F00]">{item.assessment} · Computer Science and Engineering</p><div className="grid grid-cols-2 gap-2">{([["Average", item.average], ["Highest", item.highest], ["Lowest", item.lowest], ["Pass percentage", item.passPercentage]] as const).map(([label, value]) => <div key={label} className="rounded-md bg-[#FFF4D6]/50 p-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}{label === "Pass percentage" ? "%" : ""}</p></div>)}</div></div>)}</div><div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparison}><CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="assessment" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="average" name="Average" fill="#FC6226" radius={[4, 4, 0, 0]} /><Bar dataKey="highest" name="Highest" fill="#E04F18" radius={[4, 4, 0, 0]} /><Bar dataKey="lowest" name="Lowest" fill="#FDBA74" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel></>}</div>;
}

function AtRiskPage({ role, onView }: { role: Role; onView: () => void }) {
  const rows = role === "Dean" ? departments.flatMap((department, index) => [{ reg: `22${department.short}0${index + 1}`, student: ["Nisha Thomas", "Kabir Rao", "Mira Joseph", "Rohan Das"][index], department: department.short, subject: index % 2 ? "Operating Systems" : "DBMS", performance: 54 + index * 4, previous: 62 + index * 2, status: index === 0 ? "Critical" : index === 1 ? "Monitor" : "Improving" }]) : attentionStudents.map((item) => ({ reg: item.reg, student: item.student, department: "CSE", subject: item.subject, performance: item.performance, previous: item.performance + (item.trend === "down" ? 8 : item.trend === "up" ? -5 : 1), status: item.status }));
  return <div className="space-y-6"><PageIntro eyebrow={role === "Dean" ? "College monitoring" : "Focused monitoring"} title="At-risk students" description={role === "Dean" ? "College-wide view of students requiring academic support." : "Prioritize interventions using current and previous performance signals."} /><div className="grid gap-4 sm:grid-cols-3"><KpiCard label="Critical" value={role === "Dean" ? "31" : "12"} note="Immediate follow-up" icon={AlertCircle} tone="amber" trend="down" /><KpiCard label="Monitor" value={role === "Dean" ? "55" : "18"} note="Review this cycle" icon={Clock3} trend="flat" /><KpiCard label="Improving" value="24" note="Positive movement" icon={TrendingUp} tone="green" trend="up" /></div><Panel className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-[15px] font-semibold text-slate-900">Priority student list</h2><p className="mt-1 text-[11px] text-slate-500">Sorted by current performance and trend direction.</p></div></div><div className="mobile-table-scroll"><table className="w-full min-w-[820px] text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th>{role === "Dean" && <th className="px-4 py-3">Department</th>}<th className="px-4 py-3">Subject</th><th className="px-4 py-3">Current</th><th className="px-4 py-3">Previous</th><th className="px-4 py-3">Trend</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => { const trend = row.performance > row.previous ? "up" : row.performance < row.previous ? "down" : "flat"; return <tr key={row.reg} className="hover:bg-slate-50/70"><td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-800">{row.student}</p><p className="mt-0.5 text-[11px] text-slate-400">{row.reg}</p></td>{role === "Dean" && <td className="px-4 py-3.5 text-xs text-slate-600">{row.department}</td>}<td className="px-4 py-3.5 text-xs text-slate-600">{row.subject}</td><td className="px-4 py-3.5 text-xs font-bold text-slate-800">{row.performance}%</td><td className="px-4 py-3.5 text-xs text-slate-500">{row.previous}%</td><td className="px-4 py-3.5">{trend === "down" ? <span className="flex items-center gap-1 text-xs font-semibold text-red-700"><TrendingDown size={14} />Declining</span> : trend === "up" ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><TrendingUp size={14} />Improving</span> : <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Activity size={14} />Stable</span>}</td><td className="px-5 py-3.5 text-right"><button onClick={onView} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FC6226] hover:underline"><Eye size={14} />View</button></td></tr>; })}</tbody></table></div></Panel></div>;
}

function DepartmentsPage({ onToast }: { onToast: (message: string) => void }) {
  const subjectsQuery = trpc.subjects.list.useQuery();
  const reportsQuery = trpc.reports.rows.useQuery({});
  const rows = subjectsQuery.data ?? [];
  const reportRows = reportsQuery.data ?? [];
  const liveRows = rows.map((subject) => { const related = reportRows.filter((row) => row.subject?.id === subject.id); const average = subject.averageScore || (related.length ? Math.round(related.reduce((sum, row) => { try { const values = Object.values(JSON.parse(row.submission.marksJson) as Record<string, number>); return sum + values.reduce((inner, value) => inner + Number(value || 0), 0) / Math.max(values.length, 1); } catch { return sum; } }, 0) / related.length / 20 * 100) : 0); return { ...subject, average: Math.round(average), department: (subject as any).department || subject.section.split(" ")[0] }; });
  return <div className="space-y-6"><PageIntro eyebrow="Executive overview" title="Departments" description="Compare live academic outcomes from persisted subjects and marks submissions." /><div className="grid gap-4 md:grid-cols-2">{liveRows.map((department, index) => <Panel key={department.id} className="reveal-up p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FC6226] text-xs font-bold text-white">{department.section.split(" ")[0].slice(0, 3).toUpperCase()}</div><div><h2 className="text-[15px] font-semibold text-slate-900">{department.name}</h2><p className="mt-1 text-[11px] text-slate-500">{department.department} · {department.studentCount} students · {department.section}</p></div></div><StatusBadge tone={department.average >= 75 ? "success" : "warning"}>{department.average >= 75 ? "Strong" : "Review"}</StatusBadge></div><div className="mt-5 grid grid-cols-3 gap-3"><MetricTile label="Average" value={department.average ? `${department.average}%` : "—"} /><MetricTile label="Semester" value={department.semester} /><MetricTile label="Submissions" value={`${reportRows.filter((row) => row.subject?.id === department.id).length}`} tone="success" /></div><button onClick={() => onToast(`${department.name} analytics loaded from live records`)} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FC6226] hover:underline">View live analytics <ChevronRight size={14} /></button></Panel>)}{!liveRows.length && <EmptyState title="No department data yet" detail="Create subjects and submit marks to populate executive analytics." />}</div></div>;
}

function TrendsPage() {
  const reportsQuery = trpc.reports.rows.useQuery({});
  const rows = reportsQuery.data ?? [];
  const grouped = Array.from(new Map(rows.map((row) => [row.subject?.code ?? `SUB-${row.submission.subjectId}`, row.subject?.name ?? "Subject"])).entries()).map(([code, name]) => { const current = rows.filter((row) => (row.subject?.code ?? `SUB-${row.submission.subjectId}`) === code); const values = (assessment: "IA-1" | "IA-2") => { const selected = current.filter((row) => row.submission.assessment === assessment); let total = 0; let count = 0; selected.forEach((row) => { try { const parsed = JSON.parse(row.submission.marksJson) as Record<string, number>; total += Object.values(parsed).reduce((sum, value) => sum + Number(value || 0), 0); count += Object.keys(parsed).length; } catch { } }); return count ? Math.round((total / (count * 20)) * 100) : 0; }; return { department: code, name, ia1: values("IA-1"), ia2: values("IA-2") }; });
  const trendRows = grouped.length ? grouped : [{ department: "No data", name: "No persisted subjects", ia1: 0, ia2: 0 }];
  return <div className="space-y-6"><PageIntro eyebrow="Executive analytics" title="Trend analysis" description="Live assessment movement calculated from persisted marks submissions." /><div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]"><Panel className="p-5"><SectionHeading title="IA-1 vs IA-2 by subject" detail="Calculated from current backend records" /><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={trendRows} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><CartesianGrid stroke="#e2e8f0" vertical={false} strokeDasharray="3 3" /><XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={10} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="ia1" name="IA-1" fill="#FDBA74" radius={[4, 4, 0, 0]} barSize={18} /><Bar dataKey="ia2" name="IA-2" fill="#FC6226" radius={[4, 4, 0, 0]} barSize={18} /></BarChart></ResponsiveContainer></div></Panel><Panel className="p-5"><SectionHeading title="Live trend signals" detail="Decision support summary" /><div className="space-y-3 pt-2">{trendRows.slice(0, 4).map((row) => <div key={row.department} className="rounded-lg border border-slate-100 p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-800">{row.name}</span><span className={cn("text-xs font-bold", row.ia2 >= row.ia1 ? "text-green-700" : "text-red-700")}>{row.ia2 - row.ia1 >= 0 ? "+" : ""}{row.ia2 - row.ia1} pts</span></div><p className="mt-1 text-[11px] text-slate-500">IA-1 {row.ia1 || "—"}% → IA-2 {row.ia2 || "—"}%</p></div>)}</div></Panel></div></div>;
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

function AdminPage({ onToast }: { onToast: (message: string) => void }) {
  const adminInput = useMemo(() => ({ actorRole: "Admin" as const }), []);
  const usersQuery = trpc.admin.users.useQuery(adminInput);

  const createMutation = trpc.admin.createUser.useMutation({
    onSuccess: (data) => {
      usersQuery.refetch();
      onToast(`New user account '${data?.user?.username || "user"}' created successfully`);
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      onToast(error.message || "Unable to create user account. Check username/email.");
    },
  });

  const roleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      onToast("User portal role updated");
    },
  });

  const statusMutation = trpc.admin.updateUserStatus.useMutation({
    onSuccess: (data) => {
      usersQuery.refetch();
      onToast(`User access ${(data?.status as string)?.toUpperCase() === "ACTIVE" ? "granted" : "revoked"}`);
    },
  });

  const passwordMutation = trpc.admin.updateUserPassword.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      onToast("User password updated successfully");
      setChangePasswordUser(null);
      setNewPassword("");
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      onToast("User account removed from directory");
    },
  });

  const deleteMarksMutation = trpc.admin.deleteAllMarks.useMutation({
    onSuccess: () => {
      onToast("All student marks and review notifications were deleted");
    },
  });

  const users = usersQuery.data ?? [];

  // State for Create User Form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [portalRole, setPortalRole] = useState<Role>("Faculty");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [accessStatus, setAccessStatus] = useState<"Active" | "Revoked">("Active");

  // State for Filters & Password Modal
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [changePasswordUser, setChangePasswordUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  const resetForm = () => {
    setUsername("");
    setName("");
    setEmail("");
    setPassword("");
    setPortalRole("Faculty");
    setDepartment("Computer Science & Engineering");
    setAccessStatus("Active");
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !name || !email) {
      onToast("Please fill in User ID, Full Name, and Email");
      return;
    }
    createMutation.mutate({
      actorRole: "Admin",
      username,
      name,
      email,
      password: password || "kvell#2026",
      portalRole,
      department,
      status: accessStatus,
    });
  };

  const toggleShowUserPassword = (id: number) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      `${user.name} ${user.openId} ${user.email} ${user.department}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || user.portalRole === roleFilter;
    const matchesStatus = statusFilter === "All" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const deleteMarks = () => {
    if (
      window.confirm(
        "Delete all student marks and review notifications? This cannot be undone."
      )
    )
      deleteMarksMutation.mutate({
        actorRole: "Admin",
        confirmation: "DELETE_ALL_MARKS",
      });
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Administration & Security"
        title="Admin Panel & User Access Control"
        description="Create user accounts, set credentials & passwords, assign roles, and grant or revoke webportal access for faculty, department heads, and administrators."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                const randomId = Math.floor(100 + Math.random() * 900);
                setUsername(`KVELL2025CSE${randomId}`);
                setName("New CSE Student");
                setEmail(`student.cse${randomId}@students.kvell.edu`);
                setPortalRole("Student");
                setDepartment("Computer Science & Engineering");
                generatePassword();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#D4A72C] hover:bg-[#b08014] px-4 py-2.5 text-xs font-extrabold text-[#0B192C] shadow-md transition duration-150 active:scale-[0.98]"
            >
              <UserPlus size={16} />
              <span>Create CSE Student User</span>
            </button>
            <button
              onClick={() => {
                generatePassword();
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0B192C] hover:bg-[#152744] px-5 py-2.5 text-xs font-extrabold text-white shadow-md border border-[#D4A72C]/40 transition duration-150 active:scale-[0.98]"
            >
              <UserPlus size={16} className="text-[#D4A72C]" />
              <span>Create User Account</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard
          label="Total User Accounts"
          value={`${users.length}`}
          note="In webportal directory"
          icon={UsersRound}
          trend="flat"
        />
        <KpiCard
          label="Active Access"
          value={`${users.filter((u) => (u.status as string) !== "REVOKED" && (u.status as string) !== "Revoked").length}`}
          note="Permitted to sign in"
          icon={ShieldCheck}
          tone="green"
          trend="up"
        />
        <KpiCard
          label="Revoked Access"
          value={`${users.filter((u) => (u.status as string) === "REVOKED" || (u.status as string) === "Revoked").length}`}
          note="Access suspended"
          icon={Lock}
          tone="amber"
          trend="down"
        />
        <KpiCard
          label="Administrators"
          value={`${users.filter((u) => u.portalRole === "Admin" || (u.role as string) === "Admin" || (u.role as string) === "admin").length}`}
          note="Full system controls"
          icon={ShieldAlert}
          trend="flat"
        />
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-[#D4A72C]/40 bg-white p-7 shadow-2xl reveal-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 text-[#0B192C]">
                <div className="p-2 rounded-xl bg-[#0B192C] text-[#D4A72C]">
                  <UserPlus size={18} />
                </div>
                <h2 className="text-base font-extrabold text-[#0B192C]">
                  Create User Account & Access
                </h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    User ID / Username *
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. faculty.ananya"
                    required
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-semibold text-[#0B192C] placeholder:text-slate-400 focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Menon"
                    required
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-semibold text-[#0B192C] placeholder:text-slate-400 focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@kvelluniversity.edu"
                  required
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-semibold text-[#0B192C] placeholder:text-slate-400 focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Account Password *
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] font-bold text-[#B08014] hover:underline"
                  >
                    Generate Random Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter or generate password"
                    required
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 pr-10 text-xs font-semibold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0B192C]"
                  >
                    {showPassword ? <Lock size={15} /> : <KeyRound size={15} />}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Portal Access Role *
                  </label>
                  <select
                    value={portalRole}
                    onChange={(e) => setPortalRole(e.target.value as Role)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                  >
                    <option value="Student">Student (Result & Elective Portal)</option>
                    <option value="Faculty">Faculty (Teaching Portal)</option>
                    <option value="HOD">HOD (Department Portal)</option>
                    <option value="Dean">Dean (Executive Portal)</option>
                    <option value="Admin">Admin (System Controls)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Initial Access Status *
                  </label>
                  <select
                    value={accessStatus}
                    onChange={(e) =>
                      setAccessStatus(e.target.value as "Active" | "Revoked")
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                  >
                    <option value="Active">Active (Permitted)</option>
                    <option value="Revoked">Revoked (Suspended)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
                >
                  <option value="Computer Science & Engineering">
                    Computer Science & Engineering
                  </option>
                  <option value="Information Technology">
                    Information Technology
                  </option>
                  <option value="Electronics & Communication">
                    Electronics & Communication
                  </option>
                  <option value="Mechanical Engineering">
                    Mechanical Engineering
                  </option>
                  <option value="Academic Affairs">Academic Affairs</option>
                  <option value="University Administration">
                    University Administration
                  </option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-white border border-[#D4A72C]/40 px-5 py-2.5 text-xs font-extrabold shadow-md transition disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {changePasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-[#D4A72C]/40 bg-white p-6 shadow-2xl reveal-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-[#0B192C]">
                <div className="p-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                  <KeyRound size={16} />
                </div>
                <h3 className="text-sm font-extrabold text-[#0B192C]">
                  Update Password for {changePasswordUser.name}
                </h3>
              </div>
              <button
                onClick={() => setChangePasswordUser(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Set a new password for account{" "}
                <span className="font-extrabold text-[#0B192C] bg-[#D4A72C]/15 px-2 py-0.5 rounded-md border border-[#D4A72C]/30">
                  {changePasswordUser.openId}
                </span>
                .
              </p>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 px-3.5 text-xs font-semibold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setChangePasswordUser(null)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newPassword) return;
                    passwordMutation.mutate({
                      actorRole: "Admin",
                      userId: changePasswordUser.id,
                      password: newPassword,
                    });
                  }}
                  disabled={passwordMutation.isPending || !newPassword}
                  className="rounded-2xl bg-[#0B192C] hover:bg-[#152744] px-5 py-2 text-xs font-extrabold text-white border border-[#D4A72C]/30 shadow-md transition disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER ACCESS DIRECTORY TABLE */}
      <div className="bg-white rounded-3xl shadow-xl border border-[#E5E1D8] p-6 overflow-hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#0B192C]">
              User Access & Credentials Directory
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Control portal login access, credentials, and role permissions for all users.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user ID, name..."
                className="h-10 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE]/70 pl-9 pr-3.5 text-xs font-semibold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-[#F8F5EE]/70 px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
            >
              <option value="All">All Roles</option>
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="HOD">HOD</option>
              <option value="Dean">Dean</option>
              <option value="Admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-[#F8F5EE]/70 px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:border-[#0B192C] focus:outline-none transition shadow-sm"
            >
              <option value="All">All Access</option>
              <option value="Active">Active</option>
              <option value="Revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <div className="mobile-table-scroll">
            <table className="w-full min-w-[840px] text-left">
              <thead className="bg-[#0B192C] text-white text-[11px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">User ID & Name</th>
                  <th className="px-4 py-3.5">Email & Dept</th>
                  <th className="px-4 py-3.5">Portal Role</th>
                  <th className="px-4 py-3.5">Password</th>
                  <th className="px-4 py-3.5">Access Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.map((user) => {
                  const isRevoked = (user.status as string) === "REVOKED" || (user.status as string) === "Revoked";
                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "transition hover:bg-[#F8F5EE]/60",
                        isRevoked && "bg-red-50/30"
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-[#D4A72C]/15 px-2 py-0.5 text-[11px] font-extrabold text-[#B08014] border border-[#D4A72C]/30 shadow-sm">
                            {user.openId}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-extrabold text-[#0B192C]">
                          {user.name}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-medium text-slate-700">{user.email}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                          {user.department || "General"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={user.portalRole || ((user.role as string) === "Admin" || (user.role as string) === "admin" ? "Admin" : "Faculty")}
                          disabled={roleMutation.isPending}
                          onChange={(e) => {
                            const selectedRole = e.target.value as Role;
                            const isSysAdmin = selectedRole === "Admin" ? "admin" : "user";
                            roleMutation.mutate({
                              actorRole: "Admin",
                              userId: user.id,
                              role: isSysAdmin,
                              portalRole: selectedRole,
                            });
                          }}
                          className="h-9 rounded-xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:border-[#0B192C] transition shadow-sm"
                        >
                          <option value="Student">Student</option>
                          <option value="Faculty">Faculty</option>
                          <option value="HOD">HOD</option>
                          <option value="Dean">Dean</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-lg bg-[#D4A72C]/10 px-2.5 py-1 font-mono text-[11px] font-extrabold text-[#B08014] border border-[#D4A72C]/30">
                            PBKDF2 Salted
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge tone={isRevoked ? "danger" : "success"}>
                          {isRevoked ? "Access Revoked" : "Active Access"}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              statusMutation.mutate({
                                actorRole: "Admin",
                                userId: user.id,
                                status: isRevoked ? "Active" : "Revoked",
                              })
                            }
                            disabled={statusMutation.isPending}
                            className={cn(
                              "rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition shadow-sm",
                              isRevoked
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            )}
                            title={isRevoked ? "Grant Access" : "Revoke Access"}
                          >
                            {isRevoked ? "Grant Access" : "Revoke"}
                          </button>
                          <button
                            onClick={() => {
                              setChangePasswordUser(user);
                              setNewPassword(user.password || "kvell#2026");
                            }}
                            className="rounded-xl border border-slate-200 bg-[#F8F5EE] p-2 text-slate-600 hover:bg-slate-200 hover:text-[#0B192C] transition shadow-sm"
                            title="Change Password"
                          >
                            <KeyRound size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove user ${user.name} (${user.openId}) permanently?`
                                )
                              ) {
                                deleteUserMutation.mutate({
                                  actorRole: "Admin",
                                  userId: user.id,
                                });
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                            className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition shadow-sm"
                            title="Delete User Account"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <p className="p-8 text-center text-xs font-semibold text-slate-500">
              No user accounts found matching your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ElectivesComponent({ onToast }: { onToast: (msg: string) => void }) {
  const [semester, setSemester] = useState("Semester I");
  const [deptKey, setDeptKey] = useState("Computer Science & Engineering");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [groupName, setGroupName] = useState("Professional Elective - I");
  const [openAt, setOpenAt] = useState("2026-10-01T09:00");
  const [closeAt, setCloseAt] = useState("2026-10-05T23:59");
  const [status, setStatus] = useState("OPEN");

  const [electiveCourses, setElectiveCourses] = useState([
    { code: "CS305E", name: "Machine Learning & Intelligent Systems", credits: 4, category: "Professional Elective I", faculty: "Dr. Ananya Menon" },
    { code: "CS306E", name: "Cloud Native Computing & Microservices", credits: 4, category: "Professional Elective I", faculty: "Prof. Vikram Shah" },
    { code: "CS307E", name: "Cyber Security & Information Assurance", credits: 4, category: "Professional Elective I", faculty: "Dr. Raghav Iyer" },
    { code: "CS308E", name: "Data Science & Big Data Engineering", credits: 4, category: "Professional Elective I", faculty: "Dr. Priya Nair" },
  ]);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState(4);
  const [newFaculty, setNewFaculty] = useState("");

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) {
      onToast("Please enter course code and title");
      return;
    }
    setElectiveCourses((prev) => [
      ...prev,
      { code: newCode, name: newName, credits: Number(newCredits), category: groupName, faculty: newFaculty || "Faculty" },
    ]);
    onToast(`Added elective subject '${newCode} - ${newName}' to group`);
    setNewCode("");
    setNewName("");
    setNewFaculty("");
  };

  return (
    <div className="space-y-6 w-full">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2 shadow-sm">
            ELECTIVE GROUP MANAGEMENT
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Department Elective Configurations
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl font-medium leading-relaxed">
            Configure semester elective groups, set open/close selection windows, and add available course offerings for student enrollment.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-3 rounded-2xl bg-[#D4A72C] text-[#0B192C] font-extrabold text-xs hover:bg-[#c39722] transition shadow-lg flex items-center gap-2 shrink-0 active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> Create Elective Group
        </button>
      </div>

      {/* Main Elective Group Details Card */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-5">
          <div>
            <span className="text-[10px] font-black uppercase text-[#B08014] tracking-wider">
              {deptKey.toUpperCase()} · {semester}
            </span>
            <h3 className="font-extrabold text-2xl text-[#0B192C] mt-0.5">
              {groupName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-300 shadow-sm flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              STATUS: {status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-[#F8F5EE] p-5 rounded-2xl border border-[#E5E1D8]">
          <div className="flex items-center gap-3 text-slate-800 font-bold">
            <Calendar size={18} className="text-[#B08014]" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Selection Opens</p>
              <p className="text-xs font-black text-[#0B192C]">01 Oct 2026, 09:00 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-800 font-bold">
            <Clock size={18} className="text-red-500" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Selection Closes</p>
              <p className="text-xs font-black text-[#0B192C]">05 Oct 2026, 11:59 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-800 font-bold">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Selection Rule</p>
              <p className="text-xs font-black text-emerald-800">Exactly 1 Subject Required</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-extrabold text-xs uppercase text-[#B08014] tracking-wider">
              Offered Elective Courses ({electiveCourses.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {electiveCourses.map((c) => (
              <div
                key={c.code}
                className="p-5 rounded-2xl border border-[#E5E1D8] bg-white flex items-center justify-between hover:border-[#D4A72C] transition shadow-sm hover:shadow-md"
              >
                <div>
                  <span className="font-mono text-xs font-black text-[#B08014] bg-[#D4A72C]/10 px-2.5 py-0.5 rounded-md border border-[#D4A72C]/30 inline-block mb-1">
                    {c.code}
                  </span>
                  <span className="font-extrabold text-sm text-[#0B192C] block">
                    {c.name}
                  </span>
                  {c.faculty && (
                    <span className="text-[11px] font-bold text-slate-500 mt-0.5 block">
                      Instructor: {c.faculty}
                    </span>
                  )}
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#0B192C] font-black text-[11px] text-[#D4A72C] shrink-0 ml-3 shadow-sm">
                  {c.credits} Credits
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Course Form inside Group */}
        <div className="border-t border-[#E5E1D8] pt-6">
          <h4 className="font-extrabold text-xs uppercase text-[#0B192C] tracking-wider mb-3">
            Add Elective Course to Offering Group
          </h4>
          <form onSubmit={handleAddCourse} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Code (e.g. CS309E)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              placeholder="Course Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none sm:col-span-2"
            />
            <button
              type="submit"
              className="h-10 rounded-xl bg-[#0B192C] text-white font-extrabold text-xs hover:bg-[#152744] transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={15} className="text-[#D4A72C]" /> Add Subject
            </button>
          </form>
        </div>
      </div>

      {/* CREATE ELECTIVE GROUP MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-[#D4A72C]/40 bg-white p-7 shadow-2xl reveal-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-[#0B192C]">
                <div className="p-2 rounded-xl bg-[#0B192C] text-[#D4A72C]">
                  <BookOpen size={18} />
                </div>
                <h3 className="text-base font-black text-[#0B192C]">
                  Configure New Elective Group
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  Elective Group Title *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Professional Elective - II"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Target Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  >
                    <option value="Semester I">Semester I (1st Sem)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Department
                  </label>
                  <select
                    value={deptKey}
                    onChange={(e) => setDeptKey(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Eng</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Comm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Selection Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={openAt}
                    onChange={(e) => setOpenAt(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Selection Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={closeAt}
                    onChange={(e) => setCloseAt(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    onToast(`Elective Group '${groupName}' created successfully!`);
                  }}
                  className="rounded-2xl bg-[#0B192C] hover:bg-[#152744] px-6 py-2.5 text-xs font-extrabold text-white border border-[#D4A72C]/40 shadow-lg"
                >
                  Save Group Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElectiveDemandComponent({ onToast }: { onToast: (msg: string) => void }) {
  const [status, setStatus] = useState<"DRAFT" | "UNDER_COE_REVIEW" | "COE_APPROVED">("DRAFT");
  const [approved, setApproved] = useState(false);

  const demandData = [
    { rank: 1, code: "CS305E", name: "Machine Learning & Intelligent Systems", students: 86, percentage: 41.0 },
    { rank: 2, code: "CS306E", name: "Cloud Native Computing & Microservices", students: 64, percentage: 30.5 },
    { rank: 3, code: "CS307E", name: "Cyber Security & Information Assurance", students: 42, percentage: 20.0 },
    { rank: 4, code: "CS308E", name: "Data Science & Big Data Engineering", students: 18, percentage: 8.5 },
  ];

  const handleCoeApproval = () => {
    setApproved(true);
    setStatus("COE_APPROVED");
    onToast("COE Official Approval Recorded! Elective selections finalized into official semester subjects.");
  };

  return (
    <div className="space-y-6 w-full">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2 shadow-sm">
            DEMAND ANALYTICS & COE APPROVAL WORKFLOW
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Elective Demand Dashboard
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl font-medium leading-relaxed">
            Inspect live student elective preference rankings, total selection counts, and submit for Controller of Examinations (COE) official approval.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!approved ? (
            <button
              onClick={handleCoeApproval}
              className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 transition shadow-lg flex items-center gap-2 active:scale-95 border border-emerald-400/40"
            >
              <CheckCircle2 size={16} /> Confirm COE Official Approval
            </button>
          ) : (
            <span className="px-5 py-3 rounded-2xl bg-emerald-100 text-emerald-900 font-extrabold text-xs border border-emerald-300 flex items-center gap-2 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-700" /> COE APPROVED & FINALIZED
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Selections Submitted</span>
          <span className="font-black text-3xl text-[#0B192C] mt-1 block">210 Students</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Top Preferred Elective</span>
          <span className="font-black text-2xl text-emerald-700 mt-1 block">Machine Learning (41%)</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#E5E1D8] shadow-md">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Workflow Approval State</span>
          <span className="font-black text-2xl text-[#B08014] mt-1 block">{status}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-xl p-6 sm:p-8 space-y-4">
        <div className="border-b border-[#E5E1D8] pb-4 flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-xl text-[#0B192C]">
              Semester I · Professional Elective Demand Ranking
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ordered by total student selections (COUNT DESC)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[11px] font-extrabold tracking-wider">
              <tr>
                <th className="p-4">Rank</th>
                <th className="p-4">Course Code</th>
                <th className="p-4">Elective Subject</th>
                <th className="p-4 text-center">Student Selections</th>
                <th className="p-4 text-center">Preference Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {demandData.map((row) => (
                <tr key={row.code} className="hover:bg-[#F8F5EE]/60 transition">
                  <td className="p-4 font-black text-[#0B192C]">#{row.rank}</td>
                  <td className="p-4 font-mono font-extrabold text-[#B08014]">
                    <span className="bg-[#D4A72C]/15 px-2.5 py-1 rounded-md border border-[#D4A72C]/30">
                      {row.code}
                    </span>
                  </td>
                  <td className="p-4 font-extrabold text-[#0B192C]">{row.name}</td>
                  <td className="p-4 text-center font-black text-[#0B192C]">{row.students} Students</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-28 bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner border border-slate-200">
                        <div className="bg-[#D4A72C] h-full rounded-full" style={{ width: `${row.percentage}%` }} />
                      </div>
                      <span className="font-extrabold text-[#0B192C]">{row.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AppShell({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const [activePage, setActivePage] = useState<PageKey>(role === "Admin" ? "admin" : "dashboard");
  const [performanceStudent, setPerformanceStudent] = useState<
    (typeof students)[number] | null
  >(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");

  const currentRoleNav = roleNav[role] || roleNav["Faculty"];
  const activeNav =
    currentRoleNav.find((item) => item.key === activePage) ?? currentRoleNav[0];
  const meta = roleMeta[role] || roleMeta["Faculty"];
  const facultyCollegeKey = (role === "Faculty" ? localStorage.getItem("kvell_faculty_college") : null) as FacultyCollege | null;
  const facultyCollege = facultyCollegeKey && FACULTY_COLLEGES[facultyCollegeKey] ? FACULTY_COLLEGES[facultyCollegeKey] : (role === "Faculty" ? FACULTY_COLLEGES.Engineering : null);
  const notificationRole = (role === "Admin" || (role as string) === "Student") ? "Faculty" : (role as any);
  const notificationsQuery = trpc.notifications.list.useQuery({
    role: notificationRole,
  });
  const markNotification = trpc.notifications.markRead.useMutation({
    onSuccess: () => notificationsQuery.refetch(),
  });
  const notifications = notificationsQuery.data ?? [];

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
    if (page !== "performance") setPerformanceStudent(null);
    setActivePage(page);
    setSidebarOpen(false);
  };

  const content = useMemo(() => {
    switch (activePage) {
      case "dashboard":
        return role === "Student" ? (
          <PerformancePage
            role="Faculty"
            onToast={setToast}
            studentReg="KVELL2025CSE041"
            studentName="Aarav Sharma"
            onReturn={() => navigate("dashboard")}
          />
        ) : role === "Faculty" ? (
          <FacultyDashboard onNavigate={navigate} />
        ) : role === "HOD" ? (
          <HodPortalDashboard onLogout={() => {}} />
        ) : role === "Dean" ? (
          <DeanDashboard onNavigate={navigate} onToast={setToast} />
        ) : (
          <ElectivesComponent onToast={setToast} />
        );
      case "electives":
        return <ElectivesComponent onToast={setToast} />;
      case "elective-demand":
        return <ElectiveDemandComponent onToast={setToast} />;
      case "subjects":
        if (role === "Faculty") return <FacultyDashboard onNavigate={navigate} />;
        return <SubjectsPage onToast={setToast} />;
      case "marks":
        return <FacultyMarkEntry onToast={setToast} />;
      case "verification":
      case "noticeboard":
        return <FacultyDashboard onNavigate={navigate} />;
      case "performance":
        if (role === "Faculty") return <FacultyDashboard onNavigate={navigate} />;
        return (
          <PerformancePage
            role={role}
            onToast={setToast}
            studentReg={performanceStudent?.reg}
            studentName={performanceStudent?.name}
            onReturn={() => navigate("students")}
          />
        );
      case "students":
        if (role === "Faculty") return <FacultyDashboard onNavigate={navigate} />;
        return (
          <StudentsPage
            role={role}
            onView={(student) => {
              setPerformanceStudent(student);
              navigate("performance");
            }}
          />
        );
      case "reports":
        if (role === "Faculty") return <FacultyDashboard onNavigate={navigate} />;
        return <ReportsPage onToast={setToast} />;
      case "faculty":
        return <FacultyPage />;
      case "at-risk":
        return (
          <AtRiskPage
            role={role}
            onView={() =>
              navigate(role === "Faculty" ? "dashboard" : "students")
            }
          />
        );
      case "departments":
        return <DepartmentsPage onToast={setToast} />;
      case "trends":
        return <TrendsPage />;
      case "dean-review":
        return <DeanMarkReview onToast={setToast} />;
      case "admin":
        return <AdminPage onToast={setToast} />;
      default:
        return role === "Admin" ? <ElectivesComponent onToast={setToast} /> : <FacultyDashboard onNavigate={navigate} />;
    }
  }, [activePage, role]);

  return (
    <div className="flex min-h-screen bg-[#F8F5EE] text-[#172033] selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0B192C] text-white transition-transform duration-200 ease-out lg:static lg:translate-x-0 border-r border-[#D4A72C]/20 shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[78px] items-center justify-between border-b border-white/10 px-5">
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
              Academic Year 2026-27 · Semester I
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
              {facultyCollege ? facultyCollege.shortName[0] : meta.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-white">
                {facultyCollege ? facultyCollege.facultyName : meta.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-[#D4A72C]">
                {facultyCollege ? `${facultyCollege.shortName} · Examiner` : meta.roleLabel}
              </p>
            </div>
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
        {/* TOP NAVBAR HEADER */}
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
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#B08014] uppercase tracking-wider">
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
            {role !== "Faculty" && (
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
            )}

            <button
              onClick={() => setToast("Help center is coming soon")}
              className="hidden rounded-xl p-2 text-slate-500 hover:bg-[#F8F5EE] hover:text-[#0B192C] transition sm:block"
              aria-label="Help"
            >
              <CircleHelp size={18} />
            </button>

            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative rounded-xl p-2 text-slate-500 hover:bg-[#F8F5EE] hover:text-[#0B192C] transition"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <p className="text-xs font-extrabold text-[#0B192C]">
                      Notifications
                    </p>
                    <span className="text-[10px] font-bold text-[#B08014] bg-[#D4A72C]/10 px-2 py-0.5 rounded-md">
                      {notifications.filter((item) => item.isRead === 0).length}{" "}
                      unread
                    </span>
                  </div>
                  <div className="space-y-3 pt-3">
                    {notifications.length ? (
                      notifications.slice(0, 5).map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            markNotification.mutate({ id: item.id })
                          }
                          className="flex w-full gap-2.5 text-left p-2 rounded-xl hover:bg-[#F8F5EE] transition"
                        >
                          <span
                            className={cn(
                              "mt-1 h-2 w-2 shrink-0 rounded-full",
                              item.isRead ? "bg-slate-300" : "bg-[#D4A72C]"
                            )}
                          />
                          <span>
                            <p className="text-[11px] font-bold text-[#0B192C]">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                              {item.message}
                            </p>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="py-2 text-[11px] text-slate-400 font-medium">
                        No workflow notifications yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="flex items-center gap-2.5 bg-[#F8F5EE] border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0B192C] text-[11px] font-black text-[#D4A72C]">
                {facultyCollege ? facultyCollege.shortName[0] : meta.initials}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-xs font-extrabold text-[#0B192C]">
                  {facultyCollege ? facultyCollege.facultyName : meta.name}
                </p>
                <p className="text-[9px] font-bold text-[#B08014] uppercase tracking-wider">
                  {facultyCollege ? `${facultyCollege.collegeName}` : meta.roleLabel}
                </p>
              </div>
              <ChevronDown size={14} className="hidden text-slate-400 lg:block" />
            </div>
          </div>
        </header>

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
  const usersQuery = trpc.admin.users.useQuery({ actorRole: "Admin" });
  const allUsers: any[] = usersQuery.data ?? [];

  const [selectedRole, setSelectedRole] = useState<"Student" | "HOD" | "Faculty">("Student");
  const [regNumber, setRegNumber] = useState("20260110226001");
  const [username, setUsername] = useState("FACULTY01");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // System Gateway status check (set by Overall University COE Dr. Sathish)
  const [systemConfig, setSystemConfig] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("kvell_system_config");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleConfigUpdate = () => {
      try {
        const raw = localStorage.getItem("kvell_system_config");
        if (raw) setSystemConfig(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("kvell_system_config_updated", handleConfigUpdate);
    window.addEventListener("storage", handleConfigUpdate);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleConfigUpdate);
      window.removeEventListener("storage", handleConfigUpdate);
    };
  }, []);

  const isStudentPortalLocked =
    selectedRole === "Student" &&
    systemConfig &&
    (systemConfig.systemMode === "EMERGENCY_LOCK" ||
      systemConfig.systemMode === "MAINTENANCE" ||
      systemConfig.gateways?.studentResultPortal?.enabled === false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    if (selectedRole === "Student") {
      if (isStudentPortalLocked) {
        setErrorMsg("Access Denied: Student Portal is currently offline under maintenance by Controller of Examinations (Dr. Sathish).");
        return;
      }
      const trimmed = (regNumber || "").trim().toLowerCase();
      const matched = allUsers.find(
        (u: any) =>
          (u.portalRole === "Student" || u.role === "user") &&
          (u.username?.toLowerCase() === trimmed || u.openId?.toLowerCase() === trimmed || u.email?.toLowerCase() === trimmed)
      );

      const aidsMatch = aidsSem1Students.find((s) => s.regNo.toLowerCase() === trimmed);
      const studentName = matched?.name || aidsMatch?.name || (aidsSem1Students[0]?.name || "ABI T");
      const resolvedReg = matched?.openId || matched?.username || aidsMatch?.regNo || (regNumber || "20260110226001");

      onAuthenticated("Student", {
        reg: resolvedReg,
        name: studentName,
        semester: 1,
      });
    } else if (selectedRole === "HOD") {
      const trimmed = (username || "").trim().toLowerCase();
      const matched = allUsers.find(
        (u: any) =>
          (u.portalRole === "HOD" || u.portalRole === "Faculty" || u.portalRole === "Dean") &&
          (u.username?.toLowerCase() === trimmed || u.openId?.toLowerCase() === trimmed || u.email?.toLowerCase() === trimmed || u.name?.toLowerCase().includes(trimmed))
      );

      if (matched && matched.portalRole === "Faculty") {
        let resolvedCollege: FacultyCollege = "Engineering";
        if (trimmed.includes("pharm") || matched?.department?.toLowerCase().includes("pharm")) {
          resolvedCollege = "Pharmacy";
        } else if (trimmed.includes("nur") || matched?.department?.toLowerCase().includes("nurs")) {
          resolvedCollege = "Nursing";
        }
        if (resolvedCollege !== "Engineering") {
          clearFacultyPharmacyAndNursingData();
        }
        localStorage.setItem("kvell_faculty_college", resolvedCollege);
        onAuthenticated("Faculty");
      } else if (matched) {
        onAuthenticated("HOD", undefined, {
          name: matched.name,
          department: matched.department || "COMPUTER SCIENCE AND ENGINEERING",
        });
      } else {
        onAuthenticated("HOD", undefined, {
          name: username || "JAYAPRADHA",
          department: "COMPUTER SCIENCE AND ENGINEERING",
        });
      }
    } else if (selectedRole === "Faculty") {
      const trimmed = (username || "").trim().toLowerCase();
      let resolvedCollege: FacultyCollege = "Engineering";
      if (trimmed.includes("pharm")) {
        resolvedCollege = "Pharmacy";
      } else if (trimmed.includes("nur")) {
        resolvedCollege = "Nursing";
      } else {
        const matched = allUsers.find(
          (u: any) =>
            u.username?.toLowerCase() === trimmed ||
            u.openId?.toLowerCase() === trimmed ||
            u.email?.toLowerCase() === trimmed
        );
        if (matched?.college === "Pharmacy" || matched?.department?.toLowerCase().includes("pharm")) {
          resolvedCollege = "Pharmacy";
        } else if (matched?.college === "Nursing" || matched?.department?.toLowerCase().includes("nurs")) {
          resolvedCollege = "Nursing";
        }
      }
      if (resolvedCollege !== "Engineering") {
        clearFacultyPharmacyAndNursingData();
      }
      localStorage.setItem("kvell_faculty_college", resolvedCollege);
      onAuthenticated("Faculty");
    }
  };

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
            May 2025 Semester End Examination Results Published for Faculty of Engineering and Emerging Sciences!
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
          <span>AICTE & UGC Approved</span>
          <span>•</span>
          <span className="text-[#D4A72C]">NAAC A++ Accredited Engineering Faculty</span>
        </div>
      </div>

      {/* Main Header Navbar */}
      <header className="bg-white border-b border-[#E5E1D8] sticky top-0 z-40 shadow-sm">
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
              <p className="text-[10px] sm:text-[11px] font-bold text-[#B08014] tracking-wider uppercase mt-0.5">
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
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Academic Portal
              </h1>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#D4A72C] leading-tight mt-1">
                Kvell University
              </h1>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Access Student Result Portal, HOD Department Analytics & Bar Graphs, and Examination Control Management. Select your portal role to sign in.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <p className="text-2xl font-black text-[#D4A72C]">96.4%</p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Engineering Pass Rate</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <p className="text-2xl font-black text-[#D4A72C]">May 2025</p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Semester End Results</p>
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
                  {selectedRole === "Student" ? "Student Result Portal" : selectedRole === "HOD" ? "HOD Department Portal" : "Faculty Portal"}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select your role and enter credentials to sign in
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 border border-slate-200">
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
              </div>

              {/* Public Announcement Banner from Super Admin Dr. Sathish */}
              {systemConfig?.gateways?.studentResultPortal?.announcement && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-[#D4A72C]/40 text-[#0B192C] flex items-center gap-2.5 shadow-sm">
                  <Sparkles size={16} className="text-[#B08014] shrink-0 animate-pulse" />
                  <div className="text-left text-xs">
                    <span className="font-extrabold uppercase text-[9px] text-[#B08014] block">Official COE Announcement</span>
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
                {selectedRole === "Student" ? (
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
                        placeholder="e.g. 20260110226001 / KVELL2025CSE018"
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
                          placeholder="e.g. FACULTY01 / FACULTY_PHARM / FACULTY_NUR"
                          className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                        />
                      </div>
                    </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      HOD USERNAME / ID
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. JAYAPRADHA"
                        className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                      />
                    </div>
                  </div>
                )}

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

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 shadow-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStudentPortalLocked}
                  className={`w-full h-12 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition duration-150 active:scale-[0.99] ${
                    isStudentPortalLocked
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#0B192C] hover:bg-[#152744] text-white cursor-pointer"
                  }`}
                >
                  <Lock size={14} className={isStudentPortalLocked ? "text-slate-400" : "text-[#D4A72C]"} />
                  {isStudentPortalLocked
                    ? "Student Portal Offline (COE Locked)"
                    : `Sign In to ${selectedRole === "Faculty" ? "Faculty Portal" : `${selectedRole} Portal`}`}
                </button>
              </form>

              {/* Demo Quick Sign-in Helper */}
              <div className="mt-5 pt-4 border-t border-slate-200 text-center">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                  DIRECT QUICK ACCESS (ONE-CLICK LOGIN):
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("kvell_faculty_college", "Engineering");
                      onAuthenticated("Faculty");
                    }}
                    className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 font-extrabold text-[11px] hover:bg-amber-100 transition shadow-sm border border-amber-300 cursor-pointer"
                  >
                    ⚙️ Engineering Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearFacultyPharmacyAndNursingData();
                      localStorage.setItem("kvell_faculty_college", "Pharmacy");
                      onAuthenticated("Faculty");
                    }}
                    className="px-3 py-1.5 rounded-full bg-sky-50 text-sky-900 font-extrabold text-[11px] hover:bg-sky-100 transition shadow-sm border border-sky-300 cursor-pointer"
                  >
                    💊 Pharmacy Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearFacultyPharmacyAndNursingData();
                      localStorage.setItem("kvell_faculty_college", "Nursing");
                      onAuthenticated("Faculty");
                    }}
                    className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 font-extrabold text-[11px] hover:bg-emerald-100 transition shadow-sm border border-emerald-300 cursor-pointer"
                  >
                    🏥 Nursing Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAuthenticated("HOD", undefined, {
                        name: "JAYAPRADHA",
                        department: "COMPUTER SCIENCE AND ENGINEERING",
                      });
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#FC6226]/10 text-[#FC6226] font-extrabold text-[11px] hover:bg-[#FC6226]/20 transition shadow-sm border border-[#FC6226]/30 cursor-pointer"
                  >
                    👔 HOD (CSE)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAuthenticated("Student", {
                        reg: "20260110226001",
                        name: "ABI T",
                        semester: 1,
                      });
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#D4A72C]/20 text-[#0B192C] font-extrabold text-[11px] hover:bg-[#D4A72C]/30 transition shadow-sm border border-[#D4A72C] cursor-pointer"
                  >
                    🎓 Student (ABI T)
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Result Portal.</p>
      </footer>
    </div>
  );
}

function StudentDashboard({
  studentReg = "20260110226001",
  studentName = "ABI T",
  initialSemester = 1,
  onLogout,
}: {
  studentReg?: string;
  studentName?: string;
  initialSemester?: number;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "result" | "subjects">("dashboard");
  const [currentSemesterNum, setCurrentSemesterNum] = useState<number>(initialSemester);

  useEffect(() => {
    setCurrentSemesterNum(initialSemester);
  }, [initialSemester]);
  const [selectedElective, setSelectedElective] = useState<string>("CS305E");
  const [electiveSubmitted, setElectiveSubmitted] = useState<boolean>(true);
  const [coeStatus, setCoeStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Universal System Configuration from Super Admin Dr. Sathish
  const [systemConfig, setSystemConfig] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("kvell_system_config");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleConfigUpdate = () => {
      try {
        const raw = localStorage.getItem("kvell_system_config");
        if (raw) setSystemConfig(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener("kvell_system_config_updated", handleConfigUpdate);
    window.addEventListener("storage", handleConfigUpdate);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleConfigUpdate);
      window.removeEventListener("storage", handleConfigUpdate);
    };
  }, []);

  // Revaluation Application State
  const [revalSelectedCourses, setRevalSelectedCourses] = useState<string[]>([]);
  const [revalSubmitted, setRevalSubmitted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("kvell_revaluation_requests");
      if (saved) {
        const list = JSON.parse(saved);
        return Array.isArray(list) && list.some((r: any) => r.regNo === studentReg);
      }
      return false;
    } catch {
      return false;
    }
  });
  const [revalRefId, setRevalRefId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("kvell_revaluation_requests");
      if (saved) {
        const list = JSON.parse(saved);
        const found = Array.isArray(list) ? list.find((r: any) => r.regNo === studentReg) : null;
        return found ? found.refId : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  const kvellSealLogo = "/kvell-logo.png";

  const semRoman = "I";
  const semOrdinal = "1st";
  const isElectiveEligible = false;

  const semesterCoursesData: Record<
    number,
    {
      core: Array<{ code: string; title: string; credits: number; category: string; faculty: string }>;
      electives?: Array<{ code: string; title: string; credits: number; category: string; faculty: string; description: string }>;
    }
  > = {
    1: {
      core: [
        { code: "UC26C01T", title: "Induction & Professional English", credits: 3, category: "Core Mandatory", faculty: "Prof. S. Nandhini" },
        { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, category: "Core Mandatory", faculty: "Dr. K. Raman" },
        { code: "CY26C01I", title: "Engineering Chemistry", credits: 4, category: "Core Mandatory", faculty: "Dr. A. Sundaram" },
        { code: "CS26C02T", title: "Programming in C", credits: 3, category: "Core Mandatory", faculty: "Dr. Priya Nair" },
        { code: "CS26N01I", title: "Programming Laboratory", credits: 3, category: "Core Mandatory", faculty: "Prof. Arjun Rao" },
        { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, category: "Core Mandatory", faculty: "Prof. M. Joseph" },
        { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, category: "Core Mandatory", faculty: "Dr. S. Priya" },
        { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, category: "Core Mandatory", faculty: "Prof. S. Nandhini" },
      ],
    },
    2: {
      core: [
        { code: "MA201", title: "Differential Equations & Complex Analysis", credits: 4, category: "Core Theory", faculty: "Dr. K. Raman" },
        { code: "CH201", title: "Engineering Chemistry & Environmental Science", credits: 4, category: "Core Theory", faculty: "Dr. A. Sundaram" },
        { code: "CS201", title: "Object Oriented Programming Fundamentals", credits: 3, category: "Core Theory", faculty: "Dr. Ananya Menon" },
        { code: "EC201", title: "Digital Logic & Circuit Design", credits: 3, category: "Core Theory", faculty: "Prof. V. Shah" },
        { code: "CS201L", title: "OOP & Digital Logic Laboratory", credits: 2, category: "Core Lab", faculty: "Dr. Ananya Menon" },
      ],
    },
    3: {
      core: [
        { code: "CS301", title: "Data Structures & Algorithms", credits: 4, category: "Core Theory", faculty: "Dr. Raghav Iyer" },
        { code: "CS302", title: "Computer Organization & Architecture", credits: 4, category: "Core Theory", faculty: "Prof. Arjun Rao" },
        { code: "CS303", title: "Object Oriented Programming with Java", credits: 3, category: "Core Theory", faculty: "Dr. Priya Nair" },
        { code: "CS304L", title: "Data Structures & Java Laboratory", credits: 2, category: "Core Lab", faculty: "Dr. Raghav Iyer" },
      ],
      electives: [
        { code: "CS305E", title: "Machine Learning & Intelligent Systems", credits: 4, category: "Professional Elective I", faculty: "Dr. Ananya Menon", description: "Supervised and unsupervised learning techniques, neural networks, and pattern recognition algorithms." },
        { code: "CS306E", title: "Cloud Native Computing & Microservices", credits: 4, category: "Professional Elective I", faculty: "Prof. Vikram Shah", description: "Containerization using Docker, Kubernetes orchestration, microservices design, and CI/CD pipelines." },
        { code: "CS307E", title: "Cyber Security & Information Assurance", credits: 4, category: "Professional Elective I", faculty: "Dr. Raghav Iyer", description: "Network security protocols, cryptographic primitives, threat modeling, and defensive architecture." },
      ],
    },
    4: {
      core: [
        { code: "CS401", title: "Operating Systems Architecture", credits: 4, category: "Core Theory", faculty: "Prof. Vikram Shah" },
        { code: "CS402", title: "Database Management Systems", credits: 4, category: "Core Theory", faculty: "Dr. Priya Nair" },
        { code: "CS403", title: "Theory of Computation & Automata", credits: 3, category: "Core Theory", faculty: "Dr. Raghav Iyer" },
        { code: "CS404L", title: "OS & DBMS Laboratory", credits: 2, category: "Core Lab", faculty: "Prof. Vikram Shah" },
      ],
      electives: [
        { code: "CS405E", title: "Computer Networks & Security", credits: 4, category: "Professional Elective II", faculty: "Dr. Ananya Menon", description: "TCP/IP protocol suite, routing algorithms, wireless networks, and packet analysis." },
        { code: "CS406E", title: "Full Stack Web Engineering (React & Node)", credits: 4, category: "Professional Elective II", faculty: "Prof. Arjun Rao", description: "Modern Web UI development, RESTful APIs, asynchronous server programming, and state management." },
        { code: "CS407E", title: "Computer Graphics & Virtual Reality", credits: 4, category: "Professional Elective II", faculty: "Dr. Priya Nair", description: "3D rendering pipelines, ray tracing, OpenGL/WebGL, and interactive VR simulations." },
      ],
    },
    5: {
      core: [
        { code: "CS501", title: "Compiler Design & Program Analysis", credits: 4, category: "Core Theory", faculty: "Dr. Raghav Iyer" },
        { code: "CS502", title: "Software Engineering & Agile Methodologies", credits: 3, category: "Core Theory", faculty: "Dr. Ananya Menon" },
        { code: "CS503L", title: "Compiler & Software Engineering Lab", credits: 2, category: "Core Lab", faculty: "Dr. Raghav Iyer" },
      ],
      electives: [
        { code: "CS504E", title: "Deep Learning & Artificial Neural Networks", credits: 4, category: "Professional Elective III", faculty: "Dr. Ananya Menon", description: "Convolutional Neural Networks (CNN), Recurrent Networks (RNN), Transformers, and PyTorch frameworks." },
        { code: "CS505E", title: "Big Data Analytics & Distributed Systems", credits: 4, category: "Professional Elective III", faculty: "Prof. Vikram Shah", description: "Hadoop ecosystem, Apache Spark, MapReduce, and large-scale parallel processing." },
        { code: "CS506E", title: "DevOps & Infrastructure Automation", credits: 4, category: "Professional Elective III", faculty: "Prof. Arjun Rao", description: "Infrastructure as Code (Terraform), Ansible, CI/CD pipelines, and monitoring tools." },
      ],
    },
    6: {
      core: [
        { code: "CS601", title: "Distributed Cloud Architecture", credits: 4, category: "Core Theory", faculty: "Prof. Vikram Shah" },
        { code: "CS602", title: "Information & Network Security", credits: 4, category: "Core Theory", faculty: "Dr. Raghav Iyer" },
        { code: "CS603L", title: "Cloud & Network Security Lab", credits: 2, category: "Core Lab", faculty: "Prof. Vikram Shah" },
      ],
      electives: [
        { code: "CS604E", title: "Natural Language Processing & LLMs", credits: 4, category: "Professional Elective IV", faculty: "Dr. Ananya Menon", description: "Tokenization, attention mechanisms, BERT/GPT architectures, and prompt engineering." },
        { code: "CS605E", title: "Blockchain & Smart Contract Development", credits: 4, category: "Professional Elective IV", faculty: "Dr. Priya Nair", description: "Ethereum, Solidity smart contracts, consensus mechanisms, and decentralized applications (dApps)." },
        { code: "CS606E", title: "Internet of Things (IoT) & Embedded Systems", credits: 4, category: "Professional Elective IV", faculty: "Prof. Arjun Rao", description: "Microcontroller programming, sensor integration, MQTT protocols, and IoT edge analytics." },
      ],
    },
    7: {
      core: [
        { code: "CS701", title: "High Performance Computing", credits: 4, category: "Core Theory", faculty: "Dr. Raghav Iyer" },
        { code: "CS702P", title: "Major Capstone Project - Phase 1", credits: 4, category: "Project", faculty: "Dr. Ananya Menon" },
      ],
      electives: [
        { code: "CS703E", title: "Quantum Computing & Information", credits: 4, category: "Professional Elective V", faculty: "Dr. Raghav Iyer", description: "Qubits, quantum gates, Shor's & Grover's algorithms, and Qiskit quantum simulations." },
        { code: "CS704E", title: "Autonomous Mobile Robotics", credits: 4, category: "Professional Elective V", faculty: "Prof. Arjun Rao", description: "ROS framework, kinematics, SLAM (Simultaneous Localization and Mapping), and motion planning." },
      ],
    },
    8: {
      core: [
        { code: "CS801P", title: "Major Capstone Project - Phase 2 & Industry Internship", credits: 12, category: "Project", faculty: "Dr. Ananya Menon" },
      ],
      electives: [
        { code: "CS802E", title: "Enterprise Systems & AI Operations (MLOps)", credits: 4, category: "Professional Elective VI", faculty: "Prof. Vikram Shah", description: "Model deployment pipelines, model monitoring, A/B testing, and enterprise AI management." },
      ],
    },
  };

  const isCse = studentReg.includes("2010") || studentName.toUpperCase().includes("AARAV") || studentName.toUpperCase().includes("ANANYA R") || studentName.toUpperCase().includes("DEEPAK");
  const isBme = studentReg.includes("2040") || studentName.toUpperCase().includes("ABINAYA") || studentName.toUpperCase().includes("BALAJI R") || studentName.toUpperCase().includes("CHANDRU");
  const detectedProgramName = isCse
    ? "B.Tech Computer Science and Engineering"
    : isBme
    ? "B.Tech Biomedical Engineering"
    : "B.Tech Artificial Intelligence & Data Science";

  const studentCourses = useMemo(() => {
    if (isCse) {
      return [
        { code: "UC26C01T", title: "Induction & Professional English", credits: 3, grade: "O", points: 10, status: "PASS" },
        { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, grade: "A+", points: 9, status: "PASS" },
        { code: "CY26C01I", title: "Engineering Chemistry", credits: 4, grade: "O", points: 10, status: "PASS" },
        { code: "CS26C02T", title: "Programming in C", credits: 3, grade: "O", points: 10, status: "PASS" },
        { code: "CS26N01I", title: "Programming Laboratory", credits: 3, grade: "A+", points: 9, status: "PASS" },
        { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, grade: "O", points: 10, status: "PASS" },
        { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, grade: "A+", points: 9, status: "PASS" },
        { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, grade: "O", points: 10, status: "PASS" },
      ];
    }
    if (isBme) {
      return [
        { code: "EN26C01T", title: "Professional English", credits: 3, grade: "O", points: 10, status: "PASS" },
        { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, grade: "A+", points: 9, status: "PASS" },
        { code: "PH26C01I", title: "Engineering Physics", credits: 4, grade: "A", points: 8, status: "PASS" },
        { code: "EE26C01T", title: "Basic Electrical and Electronics Engineering", credits: 3, grade: "O", points: 10, status: "PASS" },
        { code: "CS26C01I", title: "Problem Solving and Python Programming", credits: 3, grade: "A+", points: 9, status: "PASS" },
        { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, grade: "O", points: 10, status: "PASS" },
        { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, grade: "A+", points: 9, status: "PASS" },
        { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, grade: "O", points: 10, status: "PASS" },
      ];
    }
    return [
      { code: "UC26C01T", title: "Induction & Professional English", credits: 3, grade: "O", points: 10, status: "PASS" },
      { code: "MA26C01T", title: "Matrices and Calculus", credits: 4, grade: "A+", points: 9, status: "PASS" },
      { code: "CY26C01I", title: "Engineering Chemistry", credits: 4, grade: "O", points: 10, status: "PASS" },
      { code: "CS26C02T", title: "Programming in C", credits: 3, grade: "O", points: 10, status: "PASS" },
      { code: "CS26N01I", title: "Programming Laboratory", credits: 3, grade: "O", points: 10, status: "PASS" },
      { code: "ME26C02P", title: "Engineering Practices Laboratory", credits: 2, grade: "A+", points: 9, status: "PASS" },
      { code: "UC26C02P", title: "Physics & Chemistry Laboratory", credits: 2, grade: "O", points: 10, status: "PASS" },
      { code: "UC26C03P", title: "Professional Communication Laboratory", credits: 2, grade: "O", points: 10, status: "PASS" },
    ];
  }, [isCse, isBme]);

  const totalCredits = studentCourses.reduce((sum, c) => sum + c.credits, 0);
  const totalPoints = studentCourses.reduce((sum, c) => sum + c.points * c.credits, 0);
  const computedSgpa = Number((totalPoints / Math.max(totalCredits, 1)).toFixed(2));

  const currentSemData = semesterCoursesData[currentSemesterNum] ?? semesterCoursesData[3];
  const currentCoreSubjects = currentSemData.core;
  const currentElectiveOptions = currentSemData.electives ?? [];
  const totalCoreCredits = currentCoreSubjects.reduce((acc, c) => acc + c.credits, 0);

  const activeElectiveObj =
    currentElectiveOptions.find((e) => e.code === selectedElective) ?? currentElectiveOptions[0] ?? {
      code: "CS305E",
      title: "Machine Learning & Intelligent Systems",
      credits: 4,
      category: "Professional Elective I",
      faculty: "Dr. Ananya Menon",
      description: "Supervised and unsupervised learning techniques."
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

  const handleApplyRevaluation = () => {
    if (revalSelectedCourses.length === 0) {
      alert("Please select at least one course for revaluation.");
      return;
    }
    const feePer = systemConfig?.gateways?.revaluationWindow?.feePerCourse ?? 400;
    const totalFee = feePer * revalSelectedCourses.length;
    const ref = `REV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReq = {
      refId: ref,
      regNo: studentReg,
      studentName,
      courses: revalSelectedCourses,
      totalFee,
      appliedAt: new Date().toISOString(),
      status: "UNDER_REVIEW",
    };
    try {
      const saved = localStorage.getItem("kvell_revaluation_requests");
      const list = saved ? JSON.parse(saved) : [];
      list.push(newReq);
      localStorage.setItem("kvell_revaluation_requests", JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error(e);
    }
    setRevalSubmitted(true);
    setRevalRefId(ref);
    setNotificationMsg(`Revaluation Application ${ref} submitted for ${revalSelectedCourses.length} course(s). Prescribed Fee: ₹${totalFee}`);
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleDownloadGradeCard = () => {
    const lines = [
      "================================================================================",
      "                      KVELL DEEMED TO BE UNIVERSITY                             ",
      "                 OFFICIAL END-SEMESTER STATEMENT OF MARKS                       ",
      "================================================================================",
      `Student Name    : ${studentName}`,
      `Register Number : ${studentReg}`,
      `Program         : ${detectedProgramName}`,
      `Academic Year   : 2026-27 (Semester ${semRoman})`,
      `Issuing Auth    : Dr. Sathish (Overall University COE & Super Administrator)`,
      "--------------------------------------------------------------------------------",
      "COURSE CODE   COURSE TITLE                                CREDITS  GRADE  PTS  STATUS",
      "--------------------------------------------------------------------------------",
      ...studentCourses.map(
        (c) =>
          `${c.code.padEnd(14)} ${c.title.padEnd(42)} ${String(c.credits).padStart(3)}   ${c.grade.padStart(4)}   ${String(c.points).padStart(2)}  ${c.status}`
      ),
      "--------------------------------------------------------------------------------",
      `Total Credits   : 23`,
      `Semester SGPA   : ${computedSgpa || 9.42}`,
      `Cumulative CGPA : 9.28`,
      `Final Result    : PASS - DISTINCTION`,
      "================================================================================",
      `Official Timestamp: ${new Date().toLocaleString()} (Verified by Dr. Sathish COE)`,
      "================================================================================",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KVELL_Official_Statement_Marks_${studentReg}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNotificationMsg("Official Statement of Marks downloaded successfully.");
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const isResultsWithheld = systemConfig?.gateways?.studentResultPortal?.withholdResults === true;
  const isGradeDownloadAllowed = systemConfig?.gateways?.studentResultPortal?.allowGradeDownload !== false;
  const isRevalWindowOpen = systemConfig?.gateways?.revaluationWindow?.enabled === true;
  const revalFeePerCourse = systemConfig?.gateways?.revaluationWindow?.feePerCourse ?? 400;
  const revalDeadline = systemConfig?.gateways?.revaluationWindow?.deadline ?? "2026-11-15T17:00:00";
  const publicAnnouncement = systemConfig?.gateways?.studentResultPortal?.announcement;

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#172033] font-sans flex flex-col justify-between selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Top Banner Bar */}
      <div className="bg-[#060D17] text-white border-b border-[#D4A72C]/20 text-[11px] py-2 px-4 sm:px-10 flex flex-wrap items-center justify-between gap-2 z-50">
        <div className="flex items-center gap-2">
          <span className="bg-[#D4A72C] text-[#0B192C] font-extrabold text-[10px] px-2.5 py-0.5 rounded tracking-wider uppercase shadow-sm">
            # OFFICIAL PORTAL
          </span>
          <span className="text-slate-300 font-medium">
            {publicAnnouncement || "May 2025 Semester End Examination Results Published for Faculty of Engineering and Emerging Sciences!"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
          <span>AICTE & UGC Approved</span>
          <span>•</span>
          <span className="text-[#D4A72C]">NAAC A++ Accredited Engineering Faculty</span>
        </div>
      </div>

      {/* Main Header Navbar */}
      <header className="bg-white border-b border-[#E5E1D8] sticky top-0 z-40 shadow-sm">
        <div className="w-full px-4 sm:px-10 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={kvellSealLogo}
              alt="KVELL University Seal"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-full shadow-md p-0.5 bg-white border-2 border-[#D4A72C]/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0B192C]">
                  KVELL DEEMED TO BE UNIVERSITY
                </span>
                <span className="hidden sm:inline-block bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200">
                  ESTD. 2001
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-[#B08014] tracking-wider uppercase mt-0.5">
                ENGINEERING AND EMERGING SCIENCES • STUDENT PORTAL
              </p>
            </div>
          </div>

          {/* Navigation Module Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F8F5EE] border border-slate-200 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition duration-150 ${activeTab === "dashboard"
                  ? "bg-[#0B192C] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <LayoutDashboard size={16} className={activeTab === "dashboard" ? "text-[#D4A72C]" : ""} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("result")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition duration-150 ${activeTab === "result"
                  ? "bg-[#0B192C] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <FileText size={16} className={activeTab === "result" ? "text-[#D4A72C]" : ""} />
              Result
            </button>
            <button
              onClick={() => setActiveTab("subjects")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition duration-150 ${activeTab === "subjects"
                  ? "bg-[#0B192C] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              <BookOpen size={16} className={activeTab === "subjects" ? "text-[#D4A72C]" : ""} />
              My Subjects
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Static Current Semester Display Badge */}
            <div className="flex items-center gap-2 bg-[#F8F5EE] border border-slate-300 rounded-xl px-3.5 py-1.5 shadow-sm text-xs font-extrabold text-[#0B192C]">
              <span>Current Semester:</span>
              <span className="bg-[#0B192C] text-[#D4A72C] px-2.5 py-0.5 rounded-lg font-black text-xs tracking-wide">
                Semester {semRoman} ({semOrdinal} Sem)
              </span>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-extrabold text-[#0B192C]">{studentName}</p>
              <p className="text-xs font-bold text-slate-500">Register: {studentReg}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm transition"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Interactive Toast Banner */}
      {notificationMsg && (
        <div className="bg-[#0B192C] text-[#D4A72C] py-3 px-6 text-center text-xs sm:text-sm font-extrabold border-b border-[#D4A72C]/30 flex items-center justify-center gap-2 shadow-md">
          <CheckCircle2 size={18} className="text-[#38BDF8]" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Container - Enlarged to full window max-w-7xl */}
      <main className="flex-1 py-8 px-4 sm:px-8 lg:px-12 flex justify-center items-start w-full">
        {activeTab === "dashboard" ? (
          /* Dashboard Module: Enlarged Credentials Card */
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
                    AS
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#0B192C]">{studentName}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1">
                      Register No: <span className="font-mono text-[#0B192C]">{studentReg}</span>
                    </p>
                    <p className="text-xs font-bold text-[#B08014] mt-1">
                      Undergraduate • B.Tech Artificial Intelligence & Data Science
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
                    <p className="text-sm font-extrabold text-[#0B192C] mt-1">Computer Science & Engineering</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      ACADEMIC PROGRAM
                    </p>
                    <p className="text-sm font-extrabold text-[#0B192C] mt-1">B.Tech CSE & Artificial Intelligence</p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      SEMESTER & YEAR
                    </p>
                    <p className="text-sm font-extrabold text-[#0B192C] mt-1">
                      Semester {semRoman} ({semOrdinal} Semester • Academic Year 2026-27)
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60">
                    <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      INSTITUTIONAL EMAIL
                    </p>
                    <p className="text-sm font-bold text-[#0B192C] mt-1 truncate">aarav.sharma@students.kvell.edu</p>
                  </div>

                </div>
              </div>

              <div className="p-6 bg-[#0B192C] text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">
                    ACADEMIC RESULT MODULE
                  </p>
                  <p className="text-base font-bold mt-1">
                    May 2025 Semester End Grade Card and Official Statement of Marks are published.
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

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#0B192C] text-white text-xs sm:text-xs font-extrabold uppercase tracking-wider">
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

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-[#0B192C] text-white text-xs font-extrabold uppercase tracking-wider">
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
                    FACULTY OF ENGINEERING & EMERGING SCIENCES • OFFICIAL STATEMENT OF MARKS
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-white/10 text-white border border-white/20 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold">
                  {studentReg}
                </span>
                {/* Download Official Grade Sheet Button controlled by allowGradeDownload */}
                {isGradeDownloadAllowed ? (
                  <button
                    onClick={handleDownloadGradeCard}
                    className="px-4 py-2 bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] font-extrabold text-xs rounded-xl shadow transition flex items-center gap-2"
                  >
                    <Download size={15} />
                    <span>Download Official Grade Sheet</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-slate-800 text-slate-400 font-bold text-xs rounded-xl border border-slate-700 cursor-not-allowed flex items-center gap-2"
                    title="Grade Sheet download temporarily locked by University COE (Dr. Sathish)"
                  >
                    <Lock size={14} className="text-amber-400" />
                    <span>Download Locked by COE</span>
                  </button>
                )}
              </div>
            </div>

            {/* If Results are Withheld by Dr. Sathish */}
            {isResultsWithheld ? (
              <div className="m-6 sm:m-8 bg-red-50/90 border-2 border-red-300 rounded-3xl p-8 sm:p-12 text-center shadow-lg space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-600 shadow-inner">
                  <ShieldAlert size={36} />
                </div>
                <div>
                  <span className="inline-block bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                    STATUTORY HOLD DIRECTIVE
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-red-950 tracking-tight">
                    Results Withheld by University Controller of Examinations (Dr. Sathish)
                  </h3>
                  <p className="text-xs sm:text-sm text-red-800 max-w-2xl mx-auto mt-2 leading-relaxed font-medium">
                    The examination results for candidate <strong className="font-mono font-bold text-red-950">{studentReg}</strong> ({studentName}) have been temporarily withheld pending statutory moderation audit and grade audit verification. Mark breakdowns will be re-enabled once certified by the Office of the Controller of Examinations.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-mono font-bold text-red-700">
                  <span className="bg-red-100 px-3 py-1 rounded-lg border border-red-200">SEAL REF: COE/WITHHOLD/AUDIT-2026</span>
                  <span className="bg-red-100 px-3 py-1 rounded-lg border border-red-200">AUTH: DR. SATHISH (SUPER ADMIN)</span>
                </div>
              </div>
            ) : (
              <>
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
                    <p className="font-extrabold text-[#0B192C] mt-1">{detectedProgramName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">SEMESTER & EXAM MONTH</p>
                    <p className="font-extrabold text-[#0B192C] mt-1">Semester {semRoman} (Academic Year 2026-27)</p>
                  </div>
                </div>

                {/* Course Grade Breakdown Table */}
                <div className="mx-6 sm:mx-8 mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-base text-[#0B192C]">Course Grade Breakdown</h4>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-500">Total Credits: 23</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-[#0B192C] text-white text-xs font-extrabold uppercase tracking-wider">
                        <tr>
                          <th className="px-5 py-4">COURSE CODE</th>
                          <th className="px-5 py-4">COURSE TITLE</th>
                          <th className="px-5 py-4 text-center">CREDITS</th>
                          <th className="px-5 py-4 text-center">GRADE</th>
                          <th className="px-5 py-4 text-center">GRADE POINTS</th>
                          <th className="px-5 py-4 text-center">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {studentCourses.map((c) => (
                          <tr key={c.code} className="hover:bg-slate-50/80 transition">
                            <td className="px-5 py-4 font-mono font-bold text-[#0B192C]">{c.code}</td>
                            <td className="px-5 py-4 font-extrabold text-slate-900">{c.title}</td>
                            <td className="px-5 py-4 text-center text-slate-600">{c.credits}</td>
                            <td className="px-5 py-4 text-center font-extrabold text-[#0B192C]">{c.grade}</td>
                            <td className="px-5 py-4 text-center font-bold text-slate-800">{c.points}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-block bg-green-100 text-green-800 text-xs font-extrabold px-3 py-1 rounded-full border border-green-200">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Result Card */}
                <div className="bg-[#0B192C] text-white p-6 sm:p-8 mt-10 mx-6 sm:mx-8 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center items-center divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">SEMESTER SGPA</p>
                    <p className="text-3xl font-black text-white mt-1">9.42</p>
                  </div>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">CUMULATIVE CGPA</p>
                    <p className="text-3xl font-black text-white mt-1">9.28</p>
                  </div>
                  <div className="py-3 sm:py-0">
                    <p className="text-xs font-extrabold text-[#D4A72C] uppercase tracking-wider">OVERALL RESULT</p>
                    <p className="text-lg font-black text-[#38BDF8] mt-1 tracking-wide">PASS - DISTINCTION</p>
                  </div>
                </div>
              </>
            )}

            {/* Revaluation & Grievance Gateway Section (Controlled by revaluationWindow) */}
            <div className="p-6 sm:p-8 m-6 sm:m-8 bg-[#F8F5EE] rounded-3xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-[#0B192C]">
                      University Revaluation & Answer Script Photocopy Window
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Statutory grievance & re-assessment gateway authorized by Controller of Examinations (Dr. Sathish)
                    </p>
                  </div>
                </div>

                <div>
                  {isRevalWindowOpen ? (
                    <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                      WINDOW OPEN (Fee: ₹{revalFeePerCourse} / Course)
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Lock size={12} />
                      WINDOW CLOSED BY COE
                    </span>
                  )}
                </div>
              </div>

              {isRevalWindowOpen ? (
                revalSubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                      <div>
                        <h5 className="font-extrabold text-sm text-emerald-950">
                          Revaluation Application Successfully Submitted
                        </h5>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Reference ID: <strong className="font-mono">{revalRefId}</strong> • Status: Under Re-evaluation by Chief Evaluator Panel
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-600 text-white text-xs font-extrabold px-3.5 py-1.5 rounded-xl shadow-sm">
                      VERIFICATION IN PROGRESS
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                      <span>Select course(s) to apply for answer script copy and revaluation:</span>
                      <span className="text-slate-500">
                        Application Deadline: <strong className="text-[#0B192C]">{new Date(revalDeadline).toLocaleDateString()}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {studentCourses.slice(0, 6).map((c) => {
                        const isSelected = revalSelectedCourses.includes(c.code);
                        return (
                          <div
                            key={c.code}
                            onClick={() => toggleRevalCourse(c.code)}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "border-purple-600 bg-purple-50/70 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRevalCourse(c.code)}
                                className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                              />
                              <div>
                                <span className="font-mono text-xs font-bold text-[#0B192C]">{c.code}</span>
                                <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{c.title}</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500">Grade: {c.grade}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="text-xs font-semibold text-slate-700">
                        Selected: <strong className="text-[#0B192C] font-black">{revalSelectedCourses.length}</strong> course(s) • Total Prescribed Fee: <strong className="text-purple-700 font-black text-sm">₹{revalSelectedCourses.length * revalFeePerCourse}</strong>
                      </div>

                      <button
                        onClick={handleApplyRevaluation}
                        disabled={revalSelectedCourses.length === 0}
                        className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition"
                      >
                        <RotateCcw size={14} />
                        <span>Submit Revaluation Application</span>
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  The Controller of Examinations (Dr. Sathish) has not currently scheduled an active revaluation period for Semester {semRoman}. Students with result queries should submit an official written petition to the COE administrative office.
                </p>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-5 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Result Portal.</p>
      </footer>
    </div>
  );
}

export default function Home() {
  const [authenticatedRole, setAuthenticatedRole] = useState<Role | null>(null);
  const [activeStudent, setActiveStudent] = useState<{
    reg: string;
    name: string;
    semester: number;
  }>({
    reg: "KVELL2025CSE018",
    name: "Rohan Sharma",
    semester: 1,
  });
  const [activeHod, setActiveHod] = useState<{ name: string; department: string }>({
    name: "JAYAPRADHA",
    department: "COMPUTER SCIENCE AND ENGINEERING",
  });

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
        onLogout={() => setAuthenticatedRole(null)}
      />
    );
  }

  if (authenticatedRole === "HOD") {
    return (
      <HodPortalDashboard
        hodName={activeHod.name}
        department={activeHod.department}
        onLogout={() => setAuthenticatedRole(null)}
      />
    );
  }

  return (
    <AppShell
      role={authenticatedRole}
      onLogout={() => setAuthenticatedRole(null)}
    />
  );
}
