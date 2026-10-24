import React, { useState, useMemo, useEffect } from "react";
import {
  Building2,
  Users,
  UserCheck,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Download,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Play,
  Pause,
  RotateCcw,
  Layers,
  ChevronRight,
  Eye,
  Check,
  X,
  FileCheck,
  Lock,
  Unlock,
  Award,
} from "lucide-react";
import * as XLSX from "xlsx";
import { aidsSem1Students } from "../../data/aidsStudents";
import { cseSem1Students, bmeSem1Students } from "../../data/dummyMarksData";

export interface ClassroomAllocation {
  hallId: string;
  hallName: string;
  floor: string;
  wing: string;
  maxCapacity: number; // Strictly 40
  allocatedCount: number;
  invigilatorName: string;
  invigilatorDept: string;
  invigilatorPhone: string;
  invigilatorDutyId: string;
  assignedStudents: {
    regNo: string;
    name: string;
    deptCode: string;
    subjectCode: string;
    seatNo: string; // e.g. "A-1" to "D-10"
    attendance: "PRESENT" | "ABSENT" | "MALPRACTICE";
  }[];
}

interface ExamCellClassroomAllocationViewProps {
  onToast?: (msg: string) => void;
  onNavigateToPaperCorrection?: () => void;
}

export const ExamCellClassroomAllocationView: React.FC<ExamCellClassroomAllocationViewProps> = ({
  onToast,
  onNavigateToPaperCorrection,
}) => {
  // Step 1: Date & Session Selection
  const [selectedDate, setSelectedDate] = useState("2026-10-24");
  const [selectedSession, setSelectedSession] = useState<"FN" | "AN">("FN");

  // Step 2: Selected Departments & Subjects for the date
  // For 2026-10-24 FN: AI&DS (AI602 = 50), CSE (CS601 = 20), BME (BM603 = 28) -> Total 98 students
  const activeExams = [
    {
      deptCode: "ADS",
      deptName: "Artificial Intelligence & Data Science",
      subjectCode: "AI602",
      subjectTitle: "Deep Learning & Neural Architectures",
      candidateCount: 50,
      students: aidsSem1Students.map((s) => ({ regNo: s.regNo, name: s.name, deptCode: "ADS", subjectCode: "AI602" })),
      qpSet: "Set A & Set B Sealed",
      qpStatus: "FORWARDED_TO_EXAM_CELL",
      deanApprovalRef: "DEAN/QP-VERIF/2026/014",
    },
    {
      deptCode: "CSE",
      deptName: "Computer Science & Engineering",
      subjectCode: "CS601",
      subjectTitle: "Data Structures & Algorithms",
      candidateCount: 20,
      students: cseSem1Students.map((s) => ({ regNo: s.regNo, name: s.name, deptCode: "CSE", subjectCode: "CS601" })),
      qpSet: "Set A & Set B Sealed",
      qpStatus: "FORWARDED_TO_EXAM_CELL",
      deanApprovalRef: "DEAN/QP-VERIF/2026/009",
    },
    {
      deptCode: "BME",
      deptName: "Biomedical Engineering",
      subjectCode: "BM603",
      subjectTitle: "Biomedical Instrumentation & Sensors",
      candidateCount: 28,
      students: bmeSem1Students.map((s) => ({ regNo: s.regNo, name: s.name, deptCode: "BME", subjectCode: "BM603" })),
      qpSet: "Set A & Set B Sealed",
      qpStatus: "FORWARDED_TO_EXAM_CELL",
      deanApprovalRef: "DEAN/QP-VERIF/2026/021",
    },
  ];

  // Total Students Calculation
  const totalStudents = activeExams.reduce((acc, curr) => acc + curr.candidateCount, 0); // 98
  const capacityPerRoom = 40; // Strictly 40 per flowchart
  const requiredRooms = Math.ceil(totalStudents / capacityPerRoom); // ceil(98 / 40) = 3

  // Flattened pool of all candidates
  const allCandidates = useMemo(() => {
    return activeExams.flatMap((e) => e.students);
  }, []);

  // Pre-generate the 3 halls strictly partitioned by max 40
  const initialHalls: ClassroomAllocation[] = useMemo(() => {
    const hallsData: ClassroomAllocation[] = [
      {
        hallId: "HALL-301",
        hallName: "Examination Hall 301",
        floor: "Ground Floor",
        wing: "Academic Wing A",
        maxCapacity: 40,
        allocatedCount: 40,
        invigilatorName: "Dr. Jayapradha",
        invigilatorDept: "CSE",
        invigilatorPhone: "+91 94441 23456",
        invigilatorDutyId: "INV-2026-301",
        assignedStudents: allCandidates.slice(0, 40).map((st, idx) => {
          const rowLetter = String.fromCharCode(65 + Math.floor(idx / 10)); // A, B, C, D
          const deskNumber = (idx % 10) + 1; // 1 to 10
          return {
            ...st,
            seatNo: `${rowLetter}-${deskNumber}`,
            attendance: "PRESENT",
          };
        }),
      },
      {
        hallId: "HALL-302",
        hallName: "Examination Hall 302",
        floor: "First Floor",
        wing: "Academic Wing B",
        maxCapacity: 40,
        allocatedCount: 40,
        invigilatorName: "Dr. R. Natarajan",
        invigilatorDept: "BME",
        invigilatorPhone: "+91 98402 34567",
        invigilatorDutyId: "INV-2026-302",
        assignedStudents: allCandidates.slice(40, 80).map((st, idx) => {
          const rowLetter = String.fromCharCode(65 + Math.floor(idx / 10));
          const deskNumber = (idx % 10) + 1;
          return {
            ...st,
            seatNo: `${rowLetter}-${deskNumber}`,
            attendance: "PRESENT",
          };
        }),
      },
      {
        hallId: "HALL-303",
        hallName: "Examination Hall 303",
        floor: "Second Floor",
        wing: "Academic Wing C",
        maxCapacity: 40,
        allocatedCount: 18,
        invigilatorName: "Prof. K. Venkatesh",
        invigilatorDept: "ADS",
        invigilatorPhone: "+91 97903 45678",
        invigilatorDutyId: "INV-2026-303",
        assignedStudents: allCandidates.slice(80, 98).map((st, idx) => {
          const rowLetter = String.fromCharCode(65 + Math.floor(idx / 10));
          const deskNumber = (idx % 10) + 1;
          return {
            ...st,
            seatNo: `${rowLetter}-${deskNumber}`,
            attendance: "PRESENT",
          };
        }),
      },
    ];
    return hallsData;
  }, [allCandidates]);

  const [halls, setHalls] = useState<ClassroomAllocation[]>(initialHalls);
  const [selectedHallId, setSelectedHallId] = useState<string>("HALL-301");
  const [activeTab, setActiveTab] = useState<"overview" | "classrooms" | "live_exam" | "scripts_bundle">("overview");

  // Live Exam Controller State
  const [examStatus, setExamStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "COMPLETED">("IN_PROGRESS");
  const [packetSealVerified, setPacketSealVerified] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(10800 - 3420); // 3 hrs minus 57 mins elapsed = 02:03:00
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [scriptsCollected, setScriptsCollected] = useState(98);

  // Countdown timer effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && examStatus === "IN_PROGRESS" && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, examStatus, timerSeconds]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const currentHall = halls.find((h) => h.hallId === selectedHallId) || halls[0];

  // Toggle student attendance
  const handleToggleAttendance = (hallId: string, regNo: string) => {
    setHalls((prev) =>
      prev.map((h) => {
        if (h.hallId !== hallId) return h;
        return {
          ...h,
          assignedStudents: h.assignedStudents.map((st) => {
            if (st.regNo !== regNo) return st;
            const nextAtt: "PRESENT" | "ABSENT" = st.attendance === "PRESENT" ? "ABSENT" : "PRESENT";
            return { ...st, attendance: nextAtt };
          }),
        };
      })
    );
  };

  // Export Room Seating Plan to Excel
  const handleExportSeatingPlan = () => {
    const rows = halls.flatMap((h) =>
      h.assignedStudents.map((s) => ({
        "Exam Hall": h.hallName,
        Floor: h.floor,
        Invigilator: `${h.invigilatorName} (${h.invigilatorDept})`,
        "Seat No": s.seatNo,
        "Register Number": s.regNo,
        "Student Name": s.name,
        Department: s.deptCode,
        "Subject Code": s.subjectCode,
        Attendance: s.attendance,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classroom_Allocation");
    XLSX.writeFile(wb, `KVCET_ExamCell_Classrooms_${selectedDate}_${selectedSession}.xlsx`);
    if (onToast) onToast("Exported Classroom Allocation & Seating Matrix to Excel");
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold shrink-0 shadow-md">
              <Building2 size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wider">
                  Workflow Steps 12 – 20
                </span>
                <span className="text-xs font-bold text-gray-500 font-mono">
                  Autonomous Central Examination Cell
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#0B192C] tracking-tight mt-0.5">
                Exam Cell &amp; Classroom Allocation Hub
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                Date-wise schedule verification · Strictly 40 students per classroom · 1 Faculty Invigilator per hall · Live exam conduction &amp; answer script collection.
              </p>
            </div>
          </div>

          {/* Quick Date & Session Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F8F5EE] border border-[#E5E1D8] px-3 py-2 rounded-2xl">
              <Calendar size={15} className="text-[#0B192C]" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0B192C] focus:outline-none"
              >
                <option value="2026-10-24">2026-10-24 (Saturday)</option>
                <option value="2026-10-26">2026-10-26 (Monday)</option>
                <option value="2026-10-28">2026-10-28 (Wednesday)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-[#F8F5EE] border border-[#E5E1D8] p-1 rounded-2xl">
              <button
                onClick={() => setSelectedSession("FN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedSession === "FN"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                FN (10AM - 1PM)
              </button>
              <button
                onClick={() => setSelectedSession("AN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedSession === "AN"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                AN (2PM - 5PM)
              </button>
            </div>

            <button
              onClick={handleExportSeatingPlan}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-[#0B192C] border-2 border-[#0B192C]/20 hover:border-[#0B192C] font-extrabold text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Seating Matrix</span>
            </button>
          </div>
        </div>

        {/* WORKFLOW RULE CALCULATION BANNER (Exact Flowchart Formula) */}
        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              1. REGISTERED CANDIDATES (DATE-WISE)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-[#0B192C]">{totalStudents}</span>
              <span className="text-xs text-gray-600 font-semibold">Candidates</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">AI&amp;DS (50) + CSE (20) + BME (28)</p>
          </div>

          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              2. MANDATORY CLASSROOM FORMULA
            </span>
            <div className="flex items-baseline gap-2 mt-1 font-mono">
              <span className="text-xl font-black text-blue-900">⌈ {totalStudents} / 40 ⌉ =</span>
              <span className="text-3xl font-black text-blue-900">{requiredRooms} Halls</span>
            </div>
            <p className="text-[11px] text-blue-800 font-semibold mt-1">Strict max 40 per classroom</p>
          </div>

          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              3. FACULTY INVIGILATORS ALLOCATED
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-700">{halls.length}</span>
              <span className="text-xs text-gray-600 font-semibold">Invigilators</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-semibold mt-1">1 Faculty per classroom</p>
          </div>

          <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-[#E5E1D8]">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
              4. LIVE EXAM CONDUCTION STATUS
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-mono font-black text-amber-600">
                {formatTime(timerSeconds)}
              </span>
            </div>
            <p className="text-[11px] text-amber-800 font-semibold mt-1">
              {examStatus === "IN_PROGRESS" ? "Active In-Hall Examination" : "Concluded"}
            </p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <Layers size={15} />
            <span>Workflow Steps 13-16: Date &amp; Subjects Identification</span>
          </button>

          <button
            onClick={() => setActiveTab("classrooms")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "classrooms"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <Building2 size={15} />
            <span>Steps 17 &amp; 18: 40 Students / Hall &amp; Faculty Allocator</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-900 font-bold font-mono">
              {halls.length} Halls
            </span>
          </button>

          <button
            onClick={() => setActiveTab("live_exam")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "live_exam"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <Clock size={15} />
            <span>Step 19: Conduct Examination Console</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">
              LIVE
            </span>
          </button>

          <button
            onClick={() => setActiveTab("scripts_bundle")}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "scripts_bundle"
                ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                : "text-gray-600 hover:text-[#0B192C] hover:bg-gray-100"
            }`}
          >
            <FileCheck size={15} />
            <span>Step 20: Script Bundles &amp; Hand-Off</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-bold font-mono">
              98 Scripts
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: WORKFLOW OVERVIEW (Date-wise subjects & student aggregation) */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0B192C]">
                  Department-wise Subjects &amp; Candidate Enrollment for {selectedDate} ({selectedSession})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Exam Cell verifies all question papers forwarded by the Dean and calculates total hall requirements.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                Dean Verification Complete &amp; Forwarded
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {activeExams.map((ex) => (
                <div
                  key={ex.subjectCode}
                  className="bg-[#F8F5EE] rounded-2xl border-2 border-[#E5E1D8] p-5 space-y-4 hover:border-[#D4A72C] transition shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B192C] text-[#D4A72C] font-mono">
                      {ex.deptCode}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      Ref: {ex.deanApprovalRef}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-[#0B192C] leading-snug">
                      {ex.subjectCode} — {ex.subjectTitle}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{ex.deptName}</p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-600">Candidate Strength:</span>
                    <span className="font-black font-mono text-base text-[#0B192C]">
                      {ex.candidateCount} Students
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>QP Packet:</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {ex.qpSet}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Envelope Wax Seal:</span>
                      <span className="font-mono font-bold text-gray-700">COE-SEAL-OK</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Math Breakdown Callout */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shrink-0">
                  <Building2 size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-blue-950">
                    Mathematical Hall Capacity Derivation (Workflow Step 16)
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Total Candidates = 50 (AIDS) + 20 (CSE) + 28 (BME) = <strong>98 Students</strong>.
                    At 40 candidates maximum per examination hall: ⌈ 98 / 40 ⌉ = <strong>3 Examination Halls</strong> required.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("classrooms")}
                className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-black text-xs transition shadow flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <span>View Classroom Allocations</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLASSROOM ALLOCATION & 1 FACULTY PER ROOM */}
      {activeTab === "classrooms" && (
        <div className="space-y-6">
          {/* Halls Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {halls.map((hall) => {
              const isSelected = hall.hallId === selectedHallId;
              return (
                <div
                  key={hall.hallId}
                  onClick={() => setSelectedHallId(hall.hallId)}
                  className={`bg-white rounded-3xl border-2 p-5 cursor-pointer transition shadow-sm space-y-4 ${
                    isSelected
                      ? "border-[#D4A72C] ring-2 ring-[#D4A72C]/30 bg-amber-50/20"
                      : "border-[#E5E1D8] hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                        {hall.floor} · {hall.wing}
                      </span>
                      <h3 className="font-black text-base text-[#0B192C] mt-0.5">{hall.hallName}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-blue-50 text-blue-900 border border-blue-200">
                      {hall.allocatedCount} / {hall.maxCapacity} Seats
                    </span>
                  </div>

                  {/* Invigilator Assignment */}
                  <div className="bg-[#F8F5EE] p-3 rounded-2xl border border-[#E5E1D8] space-y-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">
                      ASSIGNED FACULTY INVIGILATOR (1 PER ROOM):
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#0B192C]">
                        {hall.invigilatorName}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                        Dept: {hall.invigilatorDept}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Duty ID: {hall.invigilatorDutyId} · Phone: {hall.invigilatorPhone}
                    </p>
                  </div>

                  {/* Department composition in this hall */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>Active Branches:</span>
                    <span className="font-bold text-[#0B192C]">
                      {Array.from(new Set(hall.assignedStudents.map((s) => s.deptCode))).join(", ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ACTIVE SELECTED HALL SEATING MATRIX & ROSTER */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-[#0B192C] text-[#D4A72C] px-2.5 py-0.5 rounded">
                    {currentHall.hallId}
                  </span>
                  <h3 className="font-black text-lg text-[#0B192C]">
                    {currentHall.hallName} — 40-Student Seating Grid
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Seating layout strictly adheres to 40 candidates per hall with 1 Invigilator:{" "}
                  <strong>{currentHall.invigilatorName}</strong> ({currentHall.invigilatorDept}).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportSeatingPlan}
                  className="px-3.5 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#E5E1D8] text-[#0B192C] text-xs font-bold transition border border-[#E5E1D8] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Door Notice</span>
                </button>
              </div>
            </div>

            {/* SEATING DESK MATRIX VISUALIZATION (Rows A-D, 10 Desks each) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  BLACKBOARD / INVIGILATOR DAIS
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  Green = Present · Red = Absent · Click desk to toggle attendance
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-10 gap-2.5">
                {currentHall.assignedStudents.map((st) => {
                  const isPresent = st.attendance === "PRESENT";
                  return (
                    <div
                      key={st.regNo}
                      onClick={() => handleToggleAttendance(currentHall.hallId, st.regNo)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer select-none ${
                        isPresent
                          ? "bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-50 border-rose-300 hover:bg-rose-100"
                      }`}
                      title={`Click to mark ${isPresent ? "ABSENT" : "PRESENT"}`}
                    >
                      <span className="font-mono text-[10px] font-black text-gray-600 block">
                        Desk {st.seatNo}
                      </span>
                      <span className="font-mono text-[11px] font-extrabold text-[#0B192C] block mt-0.5 truncate">
                        {st.regNo.slice(-4)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-700 truncate block">
                        {st.name.split(" ")[0]}
                      </span>
                      <span className="text-[9px] font-black uppercase text-blue-900 bg-blue-100/70 px-1.5 py-0.2 rounded mt-1 inline-block">
                        {st.deptCode}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STUDENT ROSTER TABLE */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 mb-3">
                CANDIDATE ATTENDANCE &amp; HALL REGISTER ({currentHall.assignedStudents.length} Students)
              </h4>
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B192C] text-white text-[11px] font-black uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Seat No</th>
                      <th className="py-2.5 px-3">Register Number</th>
                      <th className="py-2.5 px-3">Candidate Name</th>
                      <th className="py-2.5 px-3">Dept</th>
                      <th className="py-2.5 px-3">Subject Code</th>
                      <th className="py-2.5 px-3 text-center">Attendance Status</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentHall.assignedStudents.map((st) => (
                      <tr key={st.regNo} className="hover:bg-amber-50/30">
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">{st.seatNo}</td>
                        <td className="py-2 px-3 font-mono font-bold text-[#0B192C]">{st.regNo}</td>
                        <td className="py-2 px-3 font-bold text-gray-800">{st.name}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-900">
                            {st.deptCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-gray-700">{st.subjectCode}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              st.attendance === "PRESENT"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-rose-100 text-rose-900"
                            }`}
                          >
                            {st.attendance === "PRESENT" ? (
                              <CheckCircle2 size={11} />
                            ) : (
                              <AlertCircle size={11} />
                            )}
                            {st.attendance}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleToggleAttendance(currentHall.hallId, st.regNo)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-800"
                          >
                            Toggle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONDUCT EXAMINATION CONSOLE (Step 19) */}
      {activeTab === "live_exam" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                    LIVE CONDUCTION CONSOLE
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    Session 10:00 AM - 01:00 PM (Forenoon)
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#0B192C] mt-1">
                  Step 19: Conduct Autonomous Examination
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Real-time exam administration, question paper envelope opening verification, live countdown, and invigilator coordination.
                </p>
              </div>

              {/* Countdown Clock Display */}
              <div className="bg-[#0B192C] text-[#D4A72C] p-4 rounded-2xl border-2 border-[#D4A72C]/40 flex items-center gap-4 shadow-lg shrink-0">
                <Clock size={28} className="animate-pulse" />
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70 block">
                    TIME REMAINING
                  </span>
                  <span className="font-mono text-3xl font-black text-[#D4A72C]">
                    {formatTime(timerSeconds)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-2 border-l border-white/20">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    title={isTimerRunning ? "Pause Timer" : "Resume Timer"}
                  >
                    {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => setTimerSeconds(10800)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    title="Reset to 3 Hours"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Checkpoints Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Checkpoint 1: Envelope Wax Seal Verification */}
              <div className="bg-[#F8F5EE] rounded-2xl border border-[#E5E1D8] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0B192C] flex items-center gap-1.5">
                    <Lock size={15} className="text-[#D4A72C]" />
                    Question Paper Envelope Seal
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    VERIFIED &amp; UNSEALED
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Envelopes containing Question Paper Set A &amp; Set B inspected by Chief Superintendent and opened at 09:45 AM in the presence of 2 student witnesses.
                </p>
                <div className="text-[11px] font-mono text-gray-500 pt-1 border-t border-gray-200">
                  Seal Serial: COE-TAMPER-2026-X884
                </div>
              </div>

              {/* Checkpoint 2: Attendance Verification */}
              <div className="bg-[#F8F5EE] rounded-2xl border border-[#E5E1D8] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0B192C] flex items-center gap-1.5">
                    <UserCheck size={15} className="text-emerald-700" />
                    Candidate Attendance
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                    98 / 98 PRESENT (100%)
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  All 98 candidates seated in designated halls (Hall 301: 40, Hall 302: 40, Hall 303: 18) with valid hall tickets and ID credentials.
                </p>
                <div className="text-[11px] font-mono text-gray-500 pt-1 border-t border-gray-200">
                  Zero Malpractices Reported
                </div>
              </div>

              {/* Checkpoint 3: Invigilation Squad Patrol */}
              <div className="bg-[#F8F5EE] rounded-2xl border border-[#E5E1D8] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#0B192C] flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-blue-900" />
                    Flying Squad Inspection
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    ROUNDS COMPLETE
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Chief COE squad completed Round 1 at 10:30 AM and Round 2 at 11:45 AM. All exam halls operating strictly under Anna University norms.
                </p>
                <div className="text-[11px] font-mono text-gray-500 pt-1 border-t border-gray-200">
                  Squad Head: Dr. S. Radhakrishnan
                </div>
              </div>
            </div>

            {/* Conduction Actions */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-[#D4A72C]" />
                <div>
                  <h4 className="font-extrabold text-sm text-[#0B192C]">
                    Conclude Examination &amp; Collect Answer Scripts
                  </h4>
                  <p className="text-xs text-gray-600">
                    When the 3-hour period concludes at 01:00 PM, invigilators collect and count answer scripts.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setExamStatus("COMPLETED");
                  setActiveTab("scripts_bundle");
                  if (onToast) onToast("Examination concluded! Proceeding to script bundling.");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] font-black text-xs transition shadow cursor-pointer"
              >
                End Exam &amp; Bundle Scripts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCRIPT BUNDLES & HAND-OFF (Step 20 -> Paper Correction Desk) */}
      {activeTab === "scripts_bundle" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    STEP 20 COMPLETE
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    Bundle Ref: KVCET/COE/BUNDLE-2026-OCT24
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#0B192C] mt-1">
                  Students Write Examination &amp; Scripts Collected
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  All 98 answer scripts safely collected by hall invigilators, verified against attendance registers, sealed in tamper-proof packets, and ready for blind dummy barcoding.
                </p>
              </div>

              {onNavigateToPaperCorrection && (
                <button
                  onClick={onNavigateToPaperCorrection}
                  className="px-5 py-3 rounded-2xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer border-2 border-[#D4A72C]"
                >
                  <span>Forward to Dummy Barcode &amp; Paper Correction Desk</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>

            {/* Collected Bundles Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#F8F5EE] rounded-2xl border-2 border-gray-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    BUNDLE A: AI602
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-800">
                    50 / 50 SCRIPTS
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#0B192C]">
                  Deep Learning &amp; Neural Architectures
                </h4>
                <p className="text-xs text-gray-500">
                  Hall 301 (40) + Hall 302 (10) · Tamper-proof Wax Seal #SEAL-AI602
                </p>
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Ready for Masking:</span>
                  <span className="font-bold text-emerald-700">DMY-84291 to DMY-84340</span>
                </div>
              </div>

              <div className="bg-[#F8F5EE] rounded-2xl border-2 border-gray-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    BUNDLE B: CS601
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-800">
                    20 / 20 SCRIPTS
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#0B192C]">
                  Data Structures &amp; Algorithms
                </h4>
                <p className="text-xs text-gray-500">
                  Hall 302 (20) · Tamper-proof Wax Seal #SEAL-CS601
                </p>
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Ready for Masking:</span>
                  <span className="font-bold text-emerald-700">DMY-91201 to DMY-91220</span>
                </div>
              </div>

              <div className="bg-[#F8F5EE] rounded-2xl border-2 border-gray-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                    BUNDLE C: BM603
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-800">
                    28 / 28 SCRIPTS
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[#0B192C]">
                  Biomedical Instrumentation &amp; Sensors
                </h4>
                <p className="text-xs text-gray-500">
                  Hall 302 (10) + Hall 303 (18) · Tamper-proof Wax Seal #SEAL-BM603
                </p>
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Ready for Masking:</span>
                  <span className="font-bold text-emerald-700">DMY-73401 to DMY-73428</span>
                </div>
              </div>
            </div>

            {/* Seamless Workflow Handoff Banner */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-emerald-950">
                    Examination Lifecycle Successfully Transitioned to Evaluation Phase
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    All candidates have completed writing the exam. Scripts are sealed and proceed to the Dean Portal Paper Correction module where candidate credentials are top-flap masked and mapped to dummy barcodes.
                  </p>
                </div>
              </div>

              {onNavigateToPaperCorrection && (
                <button
                  onClick={onNavigateToPaperCorrection}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs transition shadow flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <span>Open Paper Correction</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ExamCellClassroomAllocationView;
