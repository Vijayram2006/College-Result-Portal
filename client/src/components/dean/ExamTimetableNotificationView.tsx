import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Send,
  Building2,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Download,
  Plus,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Bell,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  Eye,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface ExamTimetableSlot {
  id: string;
  date: string;
  day: string;
  session: "FN (10:00 AM - 01:00 PM)" | "AN (02:00 PM - 05:00 PM)";
  deptKey: string;
  deptName: string;
  deptCode: string;
  subjectCode: string;
  subjectTitle: string;
  semester: string;
  academicYear: string;
  registeredCount: number;
  qpStatus: "NOT_SUBMITTED" | "SUBMITTED_TO_HOD" | "HOD_APPROVED" | "DEAN_APPROVED" | "FORWARDED_TO_EXAM_CELL";
  qpFacultyAuthor: string;
}

export interface DeanExamNotification {
  id: string;
  refNo: string;
  title: string;
  issueDate: string;
  deadline: string;
  academicYear: string;
  semester: string;
  targetDepartments: string[];
  message: string;
  senderName: string;
  senderRole: string;
  guidelines: string[];
  status: "ACTIVE" | "ARCHIVED";
  deliveredAt: string;
  readCount: number;
}

const STORAGE_TIMETABLE_KEY = "kvell_exam_timetable";
const STORAGE_NOTIF_KEY = "kvell_exam_notifications";

export const INITIAL_TIMETABLE: ExamTimetableSlot[] = [
  {
    id: "TT-001",
    date: "2026-10-24",
    day: "Saturday",
    session: "FN (10:00 AM - 01:00 PM)",
    deptKey: "aids",
    deptCode: "ADS",
    deptName: "Artificial Intelligence & Data Science",
    subjectCode: "AI602",
    subjectTitle: "Deep Learning & Neural Architectures",
    semester: "Semester I",
    academicYear: "2026-2027",
    registeredCount: 50,
    qpStatus: "FORWARDED_TO_EXAM_CELL",
    qpFacultyAuthor: "Prof. K. Venkatesh",
  },
  {
    id: "TT-002",
    date: "2026-10-24",
    day: "Saturday",
    session: "FN (10:00 AM - 01:00 PM)",
    deptKey: "cse",
    deptCode: "CSE",
    deptName: "Computer Science & Engineering",
    subjectCode: "CS601",
    subjectTitle: "Data Structures & Algorithms",
    semester: "Semester I",
    academicYear: "2026-2027",
    registeredCount: 20,
    qpStatus: "FORWARDED_TO_EXAM_CELL",
    qpFacultyAuthor: "Dr. Ananya Menon",
  },
  {
    id: "TT-003",
    date: "2026-10-24",
    day: "Saturday",
    session: "FN (10:00 AM - 01:00 PM)",
    deptKey: "bme",
    deptCode: "BME",
    deptName: "Biomedical Engineering",
    subjectCode: "BM603",
    subjectTitle: "Biomedical Instrumentation & Sensors",
    semester: "Semester I",
    academicYear: "2026-2027",
    registeredCount: 28,
    qpStatus: "FORWARDED_TO_EXAM_CELL",
    qpFacultyAuthor: "Dr. Meenakshi S.",
  },
  {
    id: "TT-004",
    date: "2026-10-26",
    day: "Monday",
    session: "FN (10:00 AM - 01:00 PM)",
    deptKey: "bt",
    deptCode: "BT",
    deptName: "Biotechnology",
    subjectCode: "BT601",
    subjectTitle: "Molecular Biology & Genetic Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    registeredCount: 25,
    qpStatus: "HOD_APPROVED",
    qpFacultyAuthor: "Dr. Kavitha Raman",
  },
  {
    id: "TT-005",
    date: "2026-10-26",
    day: "Monday",
    session: "AN (02:00 PM - 05:00 PM)",
    deptKey: "ece",
    deptCode: "ECE",
    deptName: "Electronics & Communication Engineering",
    subjectCode: "EC604",
    subjectTitle: "Digital Signal Processing & VLSI Design",
    semester: "Semester I",
    academicYear: "2026-2027",
    registeredCount: 35,
    qpStatus: "SUBMITTED_TO_HOD",
    qpFacultyAuthor: "Dr. P. Suresh",
  },
  {
    id: "TT-006",
    date: "2026-10-28",
    day: "Wednesday",
    session: "FN (10:00 AM - 01:00 PM)",
    deptKey: "mech",
    deptCode: "MECH",
    deptName: "Mechanical Engineering",
    subjectCode: "ME602",
    subjectTitle: "Thermodynamics & Heat Transfer",
    semester: "Semester I",
    academicYear: "2026-2027",
    registeredCount: 48,
    qpStatus: "NOT_SUBMITTED",
    qpFacultyAuthor: "Dr. V. Karthik",
  },
];

export const INITIAL_NOTIFICATIONS: DeanExamNotification[] = [
  {
    id: "NOTIF-2026-001",
    refNo: "KVCET/COE/2026/CIR-EXAM-088",
    title: "Urgent: Submission of Question Papers for End Semester Autonomous Examinations (Nov/Dec 2026)",
    issueDate: "2026-10-20",
    deadline: "2026-10-23 05:00 PM",
    academicYear: "2026-2027",
    semester: "Semester I",
    targetDepartments: ["ADS", "CSE", "BME", "BT", "ECE", "MECH"],
    message:
      "All course instructors and designated faculty members are hereby instructed to prepare and submit 2 sets (Set A & Set B) of Question Papers along with Detailed Answer Keys & Scheme of Valuation on or before the deadline. Strict adherence to Bloom's Taxonomy and Outcome-Based Education (OBE) metrics is mandatory.",
    senderName: "Dr. Meera Krishnan",
    senderRole: "Dean of Academics",
    guidelines: [
      "2 Distinct Sets (Set A and Set B) must be submitted for each course.",
      "Part A: 10 Questions x 2 Marks = 20 Marks (Cognitive Level K1/K2).",
      "Part B: 5 Either/Or Questions x 13 Marks = 65 Marks (Cognitive Level K3/K4).",
      "Part C: 1 Compulsory Application/Case Study x 15 Marks = 15 Marks (Cognitive Level K5/K6).",
      "Each question must clearly designate Course Outcome (CO1 - CO5) and Bloom's Revised Taxonomy level.",
      "Upload question papers securely via the Faculty Portal with complete answer schemes.",
    ],
    status: "ACTIVE",
    deliveredAt: "2026-10-20 10:00 AM",
    readCount: 18,
  },
];

export function safeLoadTimetable(): ExamTimetableSlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_TIMETABLE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TIMETABLE_KEY, JSON.stringify(INITIAL_TIMETABLE));
      return INITIAL_TIMETABLE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TIMETABLE;
  }
}

export function safeLoadNotifications(): DeanExamNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

interface ExamTimetableNotificationViewProps {
  onToast?: (msg: string) => void;
  onNavigateToExamCell?: () => void;
}

export const ExamTimetableNotificationView: React.FC<ExamTimetableNotificationViewProps> = ({
  onToast,
  onNavigateToExamCell,
}) => {
  const [timetable, setTimetable] = useState<ExamTimetableSlot[]>(() => safeLoadTimetable());
  const [notifications, setNotifications] = useState<DeanExamNotification[]>(() => safeLoadNotifications());
  const [activeTab, setActiveTab] = useState<"timetable" | "notifications" | "circular">("timetable");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState("all");

  // Notification Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState(
    "Urgent: Submission of Question Papers for End Semester Autonomous Examinations (Nov/Dec 2026)"
  );
  const [notifDeadline, setNotifDeadline] = useState("2026-10-23T17:00");
  const [notifMessage, setNotifMessage] = useState(
    "All course instructors and designated faculty members are hereby instructed to prepare and submit 2 sets (Set A & Set B) of Question Papers along with Detailed Answer Keys & Scheme of Valuation on or before the deadline."
  );
  const [selectedDepts, setSelectedDepts] = useState<string[]>([
    "ADS",
    "CSE",
    "BME",
    "BT",
    "ECE",
    "MECH",
  ]);

  // Timetable Add Slot Modal
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newDate, setNewDate] = useState("2026-10-30");
  const [newSession, setNewSession] = useState<"FN (10:00 AM - 01:00 PM)" | "AN (02:00 PM - 05:00 PM)">(
    "FN (10:00 AM - 01:00 PM)"
  );
  const [newDept, setNewDept] = useState("aids");
  const [newSubjectCode, setNewSubjectCode] = useState("AI603");
  const [newSubjectTitle, setNewSubjectTitle] = useState("Natural Language Processing");
  const [newFaculty, setNewFaculty] = useState("Prof. K. Venkatesh");
  const [newStudentsCount, setNewStudentsCount] = useState(50);

  const saveTimetableData = (data: ExamTimetableSlot[]) => {
    setTimetable(data);
    try {
      localStorage.setItem(STORAGE_TIMETABLE_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event("kvell_timetable_updated"));
    } catch {}
  };

  const saveNotificationsData = (data: DeanExamNotification[]) => {
    setNotifications(data);
    try {
      localStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event("kvell_exam_notification_updated"));
    } catch {}
  };

  useEffect(() => {
    const handleStorage = () => {
      setTimetable(safeLoadTimetable());
      setNotifications(safeLoadNotifications());
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kvell_timetable_updated", handleStorage);
    window.addEventListener("kvell_exam_notification_updated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kvell_timetable_updated", handleStorage);
      window.removeEventListener("kvell_exam_notification_updated", handleStorage);
    };
  }, []);

  // Filtered timetable
  const filteredTimetable = useMemo(() => {
    return timetable.filter((slot) => {
      const matchSearch =
        slot.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slot.subjectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slot.deptName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slot.qpFacultyAuthor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDeptFilter === "all" || slot.deptKey === selectedDeptFilter;
      const matchDate = selectedDateFilter === "all" || slot.date === selectedDateFilter;
      return matchSearch && matchDept && matchDate;
    });
  }, [timetable, searchQuery, selectedDeptFilter, selectedDateFilter]);

  // Aggregate stats
  const totalSlots = timetable.length;
  const totalRegisteredStudents = timetable.reduce((acc, curr) => acc + curr.registeredCount, 0);
  const uniqueDates = Array.from(new Set(timetable.map((s) => s.date))).sort();
  const forwardedCount = timetable.filter((s) => s.qpStatus === "FORWARDED_TO_EXAM_CELL").length;

  // Handle broadcast notification
  const handleBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    const newNotif: DeanExamNotification = {
      id: `NOTIF-${Date.now()}`,
      refNo: `KVCET/COE/2026/CIR-EXAM-${Math.floor(100 + Math.random() * 900)}`,
      title: notifTitle,
      issueDate: new Date().toISOString().split("T")[0],
      deadline: notifDeadline.replace("T", " "),
      academicYear: "2026-2027",
      semester: "Semester I",
      targetDepartments: selectedDepts,
      message: notifMessage,
      senderName: "Dr. Meera Krishnan",
      senderRole: "Dean of Academics",
      guidelines: [
        "2 Distinct Sets (Set A and Set B) must be submitted for each course.",
        "Part A: 10 Questions x 2 Marks = 20 Marks (Cognitive Level K1/K2).",
        "Part B: 5 Either/Or Questions x 13 Marks = 65 Marks (Cognitive Level K3/K4).",
        "Part C: 1 Compulsory Application/Case Study x 15 Marks = 15 Marks (Cognitive Level K5/K6).",
        "Upload question papers securely via the Faculty Portal with complete answer schemes.",
      ],
      status: "ACTIVE",
      deliveredAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      readCount: 0,
    };

    const updated = [newNotif, ...notifications];
    saveNotificationsData(updated);
    setShowBroadcastModal(false);
    if (onToast) {
      onToast("Exam Notification successfully broadcast to HOD & Faculty Portals!");
    }
  };

  // Handle add timetable slot
  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const deptInfoMap: Record<string, { code: string; name: string }> = {
      aids: { code: "ADS", name: "Artificial Intelligence & Data Science" },
      cse: { code: "CSE", name: "Computer Science & Engineering" },
      bme: { code: "BME", name: "Biomedical Engineering" },
      bt: { code: "BT", name: "Biotechnology" },
      ece: { code: "ECE", name: "Electronics & Communication Engineering" },
      mech: { code: "MECH", name: "Mechanical Engineering" },
    };

    const deptInfo = deptInfoMap[newDept] || { code: "ENG", name: "Engineering" };
    const dateObj = new Date(newDate);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[dateObj.getDay()] || "Day";

    const newSlot: ExamTimetableSlot = {
      id: `TT-${Date.now()}`,
      date: newDate,
      day: dayName,
      session: newSession,
      deptKey: newDept,
      deptCode: deptInfo.code,
      deptName: deptInfo.name,
      subjectCode: newSubjectCode.trim().toUpperCase(),
      subjectTitle: newSubjectTitle.trim(),
      semester: "Semester I",
      academicYear: "2026-2027",
      registeredCount: Number(newStudentsCount),
      qpStatus: "NOT_SUBMITTED",
      qpFacultyAuthor: newFaculty.trim(),
    };

    const updated = [...timetable, newSlot];
    saveTimetableData(updated);
    setShowAddSlotModal(false);
    if (onToast) {
      onToast(`Added timetable slot for ${newSlot.subjectCode} (${newSlot.date})`);
    }
  };

  // Export Timetable to Excel
  const handleExportExcel = () => {
    const exportData = timetable.map((s) => ({
      "Exam Date": s.date,
      "Day of Exam": s.day,
      Session: s.session,
      Department: s.deptName,
      "Subject Code": s.subjectCode,
      "Subject Title": s.subjectTitle,
      "Registered Students": s.registeredCount,
      "Faculty Author": s.qpFacultyAuthor,
      "QP Verification Status": s.qpStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam_Timetable");
    XLSX.writeFile(wb, "KVCET_Autonomous_Exam_Timetable_2026.xlsx");
    if (onToast) onToast("Exported Examination Timetable to Excel");
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold shrink-0 shadow-md">
              <Calendar size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200 uppercase tracking-wider">
                  Workflow Step 5 &amp; 6
                </span>
                <span className="text-xs font-bold text-gray-500 font-mono">
                  Autonomous Curriculum 2026–2027
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#0B192C] tracking-tight mt-0.5">
                Examination Timetable &amp; Faculty Notifications
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                Allocate date-wise examination schedules across departments and broadcast official question paper preparation notifications directly to the Faculty Portal.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddSlotModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-[#0B192C] border-2 border-[#0B192C]/20 hover:border-[#0B192C] font-extrabold text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} />
              <span>Allocate Exam Slot</span>
            </button>

            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1a2f4d] text-[#D4A72C] font-extrabold text-xs transition shadow-md flex items-center gap-2 cursor-pointer border border-[#D4A72C]/40"
            >
              <Send size={15} />
              <span>Broadcast to HOD &amp; Faculty Portals</span>
            </button>

            {onNavigateToExamCell && (
              <button
                onClick={onNavigateToExamCell}
                className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#c49824] text-[#0B192C] font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Exam Cell</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              SCHEDULED EXAM SESSIONS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-[#0B192C]">{totalSlots}</span>
              <span className="text-xs text-gray-600 font-semibold">Subject Slots</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Across {uniqueDates.length} exam dates</p>
          </div>

          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              TOTAL REGISTERED STUDENTS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-blue-900">{totalRegisteredStudents}</span>
              <span className="text-xs text-gray-600 font-semibold">Candidates</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">AI&amp;DS, CSE, BME, BT, ECE, MECH</p>
          </div>

          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              QP FORWARDED TO EXAM CELL
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-700">{forwardedCount}</span>
              <span className="text-xs text-gray-600 font-semibold">/ {totalSlots} Ready</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-semibold mt-1">Dean Verified &amp; Signed</p>
          </div>

          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              ACTIVE FACULTY NOTIFICATIONS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-[#D4A72C]">{notifications.length}</span>
              <span className="text-xs text-gray-600 font-semibold">Broadcasts</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Directly live in Faculty Portal</p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("timetable")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "timetable"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <Calendar size={15} />
            <span>Examination Timetable Grid</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {timetable.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "notifications"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <Bell size={15} />
            <span>Faculty Broadcast Circulars</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("circular")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "circular"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <FileText size={15} />
            <span>Official Gazette View</span>
          </button>
        </div>

        {activeTab === "timetable" && (
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>Export Timetable (XLSX)</span>
          </button>
        )}
      </div>

      {/* TAB 1: TIMETABLE ALLOCATION VIEW */}
      {activeTab === "timetable" && (
        <div className="space-y-4">
          {/* FILTER TOOLBAR */}
          <div className="bg-white rounded-2xl border border-[#E5E1D8] p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search subject code, title, faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Dept filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl text-gray-700 font-bold focus:outline-none"
              >
                <option value="all">All Departments (12)</option>
                <option value="aids">AI &amp; DS</option>
                <option value="cse">CSE</option>
                <option value="bme">BME</option>
                <option value="bt">Biotechnology</option>
                <option value="ece">ECE</option>
                <option value="mech">Mechanical</option>
              </select>

              {/* Date filter */}
              <select
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl text-gray-700 font-bold focus:outline-none"
              >
                <option value="all">All Exam Dates</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TIMETABLE TABLE */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0B192C] text-white text-[11px] font-black uppercase tracking-wider border-b border-[#0B192C]">
                    <th className="py-3.5 px-4">Exam Date &amp; Day</th>
                    <th className="py-3.5 px-4">Session &amp; Timing</th>
                    <th className="py-3.5 px-4">Dept</th>
                    <th className="py-3.5 px-4">Course Code &amp; Title</th>
                    <th className="py-3.5 px-4 text-center">Enrolled Students</th>
                    <th className="py-3.5 px-4">Faculty In-Charge</th>
                    <th className="py-3.5 px-4">QP Review Lifecycle</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredTimetable.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        No examination slots match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTimetable.map((slot) => {
                      const isForwarded = slot.qpStatus === "FORWARDED_TO_EXAM_CELL";
                      return (
                        <tr key={slot.id} className="hover:bg-amber-50/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#0B192C] font-mono">{slot.date}</div>
                            <div className="text-[11px] text-gray-500 font-semibold">{slot.day}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${
                                slot.session.startsWith("FN")
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-purple-100 text-purple-900 border border-purple-300"
                              }`}
                            >
                              <Clock size={11} />
                              {slot.session}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {slot.deptCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#0B192C] flex items-center gap-1.5">
                              <span className="font-mono text-[#B08014] font-black">{slot.subjectCode}</span>
                              <span>—</span>
                              <span>{slot.subjectTitle}</span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {slot.semester} · {slot.academicYear}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                              <Users size={12} className="text-gray-500" />
                              {slot.registeredCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-gray-700">
                            {slot.qpFacultyAuthor}
                          </td>
                          <td className="py-3.5 px-4">
                            {isForwarded ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 size={12} />
                                Forwarded to Exam Cell
                              </span>
                            ) : slot.qpStatus === "HOD_APPROVED" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={12} />
                                HOD Approved (Awaiting AD)
                              </span>
                            ) : slot.qpStatus === "SUBMITTED_TO_HOD" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                                <FileText size={12} />
                                Uploaded by Faculty
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                <AlertCircle size={12} />
                                Not Yet Uploaded
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isForwarded && onNavigateToExamCell ? (
                              <button
                                onClick={onNavigateToExamCell}
                                className="px-3 py-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C] hover:bg-slate-800 text-[11px] font-extrabold transition shadow-sm inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Exam Cell</span>
                                <ChevronRight size={13} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowBroadcastModal(true);
                                  setNotifTitle(
                                    `Reminder: Upload Question Paper for ${slot.subjectCode} - ${slot.subjectTitle}`
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-black transition shadow-sm inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Bell size={12} />
                                <span>Notify Faculty</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY BROADCAST CIRCULARS & NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0B192C]">
                Official Examination Notifications Broadcasted to Faculty Portal
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Notifications issued by the Dean of Academics are instantly synced and displayed in the Faculty Portal question paper preparation workspace.
              </p>
            </div>
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1a2f4d] text-[#D4A72C] font-extrabold text-xs transition shadow-md flex items-center gap-2 cursor-pointer border border-[#D4A72C]/40"
            >
              <Plus size={15} />
              <span>Issue New Notification</span>
            </button>
          </div>

          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] p-6 shadow-sm transition space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                      <Bell size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {notif.refNo}
                        </span>
                        <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300">
                          {notif.status} · LIVE IN FACULTY PORTAL
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-[#0B192C] mt-1">{notif.title}</h3>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-gray-500 block">
                      Issued: {notif.issueDate} · {notif.deliveredAt}
                    </span>
                    <span className="text-xs font-black text-rose-600 font-mono block mt-0.5">
                      Deadline: {notif.deadline}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed bg-[#F8F5EE] p-3.5 rounded-2xl border border-[#E5E1D8]">
                  {notif.message}
                </p>

                {/* Target Departments */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-gray-500 text-[11px]">Target Branches:</span>
                  {notif.targetDepartments.map((dept) => (
                    <span
                      key={dept}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      {dept}
                    </span>
                  ))}
                </div>

                {/* Guidelines */}
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider block mb-2">
                    MANDATORY OBE &amp; BLOOM&apos;S TAXONOMY GUIDELINES:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                    {notif.guidelines.map((g, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200/60">
                        <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-[11px]">{g}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer status */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span className="font-semibold">
                    Signatory: {notif.senderName} ({notif.senderRole})
                  </span>
                  <span className="font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Delivered to 24 Faculty Accounts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: OFFICIAL GAZETTE PRINT VIEW */}
      {activeTab === "circular" && (
        <div className="bg-white rounded-3xl border-2 border-[#E5E1D8] p-8 shadow-sm max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center border-b-2 border-[#0B192C] pb-6 space-y-2">
            <img
              src="/engineering-logo.png"
              alt="KVCET Seal"
              className="h-20 w-20 mx-auto object-contain"
            />
            <h2 className="font-display font-black text-xl text-[#0B192C] uppercase tracking-wide">
              Karpaga Vinayaga College of Engineering and Technology
            </h2>
            <p className="text-xs text-gray-600">
              (Autonomous Institution, Approved by AICTE, Affiliated to Anna University, Chennai)
            </p>
            <p className="text-xs font-bold text-[#D4A72C] uppercase tracking-wider">
              OFFICE OF THE DEAN OF ACADEMICS &amp; CONTROLLER OF EXAMINATIONS
            </p>
            <div className="pt-2">
              <span className="inline-block bg-[#0B192C] text-[#D4A72C] text-xs font-black uppercase px-4 py-1 rounded">
                OFFICIAL NOTIFICATION &amp; EXAM TIMETABLE GAZETTE · 2026–2027
              </span>
            </div>
          </div>

          {/* Reference & Date */}
          <div className="flex justify-between text-xs font-mono border-b border-gray-200 pb-3">
            <span>Ref No: KVCET/DEAN/EXAM/2026/CIR-088</span>
            <span>Date: 2026-10-22</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-gray-800">
            <p className="font-bold">
              Sub: Autonomous End Semester Examinations Schedule &amp; Question Paper Submission Deadline — Reg.
            </p>
            <p>
              This is to notify all Heads of Departments and faculty members that the Autonomous End Semester Examinations for First Year B.E. / B.Tech (Regulation R-2021) are scheduled to commence from <strong>October 24, 2026</strong>.
            </p>
            <p>
              Faculty members designated as course question paper setters are requested to adhere strictly to the schedule below and upload the Question Papers (Set A &amp; Set B) to the Faculty Portal before <strong>October 23, 2026, 05:00 PM</strong>.
            </p>
          </div>

          {/* Gazette Timetable */}
          <div className="border border-gray-300 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 font-bold border-b border-gray-300">
                <tr>
                  <th className="p-2.5">Date &amp; Day</th>
                  <th className="p-2.5">Session</th>
                  <th className="p-2.5">Dept</th>
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">Course Title</th>
                  <th className="p-2.5 text-center">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {timetable.map((t) => (
                  <tr key={t.id}>
                    <td className="p-2.5 font-mono">{t.date} ({t.day.slice(0, 3)})</td>
                    <td className="p-2.5">{t.session.split(" ")[0]}</td>
                    <td className="p-2.5 font-bold">{t.deptCode}</td>
                    <td className="p-2.5 font-mono">{t.subjectCode}</td>
                    <td className="p-2.5">{t.subjectTitle}</td>
                    <td className="p-2.5 text-center font-bold">{t.registeredCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-end text-xs">
            <div className="text-center">
              <div className="h-10"></div>
              <p className="font-bold">Dr. S. Radhakrishnan</p>
              <p className="text-gray-500 text-[11px]">Controller of Examinations (COE)</p>
            </div>
            <div className="text-center">
              <div className="h-10"></div>
              <p className="font-bold">Dr. Meera Krishnan</p>
              <p className="text-gray-500 text-[11px]">Dean of Academics</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BROADCAST EXAM NOTIFICATION */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold shrink-0">
                  <Send size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-[#0B192C]">
                    Dean Sends Exam Notification to Faculty Portal
                  </h3>
                  <p className="text-xs text-gray-500">
                    Step 6 of Workflow Chart: Broadcast QP Preparation instructions to all faculty.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBroadcastNotification} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Circular Title / Notification Header:
                </label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A72C] font-semibold text-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    QP Submission Deadline:
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={notifDeadline}
                    onChange={(e) => setNotifDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A72C] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Signatory Authority:
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Dr. Meera Krishnan (Dean of Academics)"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Target Departments:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["ADS", "CSE", "BME", "BT", "ECE", "MECH"].map((d) => (
                    <label
                      key={d}
                      className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDepts.includes(d)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDepts([...selectedDepts, d]);
                          } else {
                            setSelectedDepts(selectedDepts.filter((x) => x !== d));
                          }
                        }}
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Official Notification Directive / Guidelines:
                </label>
                <textarea
                  rows={4}
                  required
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full p-3 text-xs bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A72C] text-gray-800 leading-relaxed"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles size={16} className="text-[#D4A72C] shrink-0 mt-0.5" />
                <span>
                  Broadcasting will immediately display a persistent high-priority notification banner in both HOD &amp; Faculty Portals, enabling 1-click question paper authoring and Stage 2 DAC scrutiny.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#1a2f4d] text-[#D4A72C] font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer border border-[#D4A72C]/40"
                >
                  <Send size={14} />
                  <span>Broadcast to HOD &amp; Faculty Portals</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD TIMETABLE SLOT */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0B192C]">
                    Allocate New Examination Slot
                  </h3>
                  <p className="text-[11px] text-gray-500">Workflow Step 5</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSlotModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Exam Date:</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Session:</label>
                  <select
                    value={newSession}
                    onChange={(e: any) => setNewSession(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl font-bold"
                  >
                    <option value="FN (10:00 AM - 01:00 PM)">Forenoon (FN: 10AM - 1PM)</option>
                    <option value="AN (02:00 PM - 05:00 PM)">Afternoon (AN: 2PM - 5PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Department:</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl font-bold"
                >
                  <option value="aids">Artificial Intelligence &amp; Data Science (AIDS)</option>
                  <option value="cse">Computer Science &amp; Engineering (CSE)</option>
                  <option value="bme">Biomedical Engineering (BME)</option>
                  <option value="bt">Biotechnology (BT)</option>
                  <option value="ece">Electronics &amp; Communication (ECE)</option>
                  <option value="mech">Mechanical Engineering (MECH)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Subject Code:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI603"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl font-mono uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Enrolled Count:</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newStudentsCount}
                    onChange={(e) => setNewStudentsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Course Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Natural Language Processing"
                  value={newSubjectTitle}
                  onChange={(e) => setNewSubjectTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Faculty In-Charge:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. K. Venkatesh"
                  value={newFaculty}
                  onChange={(e) => setNewFaculty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] font-black text-xs transition shadow cursor-pointer"
                >
                  Add Timetable Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExamTimetableNotificationView;
