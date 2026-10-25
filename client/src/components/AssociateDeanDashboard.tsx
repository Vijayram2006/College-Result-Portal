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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);

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
                      <span className="font-bold">IAT-1</span>
                    </div>
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
                      <span className="font-bold">IAT-2</span>
                    </div>
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
                      <span className="font-bold">END-SEM</span>
                    </div>
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
                      <span className="font-bold">REVALUATION</span>
                    </div>
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
          {/* Revaluation: the analytics above (end semester) plus the college's real revaluation requests */}
          {activeNav === "analytics-revaluation" && <DeanRevaluationView />}
        </div>
      </main>

    </div>
  );
};

export default AssociateDeanDashboard;
