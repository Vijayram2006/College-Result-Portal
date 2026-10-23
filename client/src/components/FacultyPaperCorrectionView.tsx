import React, { useState, useEffect, useMemo } from "react";
import { apiErrorMessage, authApi, facultyApi, type StudentMarkDTO } from "../services/api";
import {
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  X,
  Award,
  Sparkles,
  Building2,
  Calendar,
  AlertCircle,
  Save,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Users,
  PenLine,
  Lock,
  RotateCcw,
  Layers,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { SplitScreenEvaluationModal } from "./common/SplitScreenEvaluationModal";

export interface EvaluatorStaff {
  id: string;
  name: string;
  facultyId: string;
  department: string;
  role: "Chief Evaluator" | "Internal Examiner" | "External Examiner";
  assignedScripts: number;
  evaluatedScripts?: number;
  averageMarks?: number;
  stdDev?: number;
  scriptRangeStart: number;
  scriptRangeEnd: number;
  bundlePacketId: string;
  status: "Assigned" | "In Evaluation" | "Completed";
}

export interface PaperCorrectionAllocation {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  deptKey: string;
  semester: string;
  academicYear: string;
  regulation: string;
  examSession: string;
  qpMasterCode: string;
  totalAnswerScripts: number;
  numberOfStaff: number;
  assignedStaff: EvaluatorStaff[];
  allocatedAt: string;
  deadlineDate: string;
  campVenue: string;
  adApprovedBy: string;
  status: "ALLOCATED" | "VALUATION_IN_PROGRESS" | "SCRUTINY_COMPLETED";
}

// Deterministic pseudorandom permutation of numbers [0..count-1] based on seed string
export function getScrambledIndices(count: number, seed: string): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  let seedNum = 0;
  for (let i = 0; i < seed.length; i++) {
    seedNum = (seedNum * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  for (let i = indices.length - 1; i > 0; i--) {
    seedNum = (seedNum * 16807 + 12345) % 2147483647;
    const j = Math.abs(seedNum) % (i + 1);
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }
  return indices;
}

// Helper to generate non-sequential COE confidential dummy barcodes that cannot be traced to student alphabetical order
export function getCoeDummyBarcode(subjectCode: string, packetId: string, serialIndex: number) {
  // Scramble using coprime multipliers so dummy codes are completely decoupled from student alphabetical roll order
  const hash = Math.abs(((serialIndex * 3719 + 5431) ^ (packetId.charCodeAt(packetId.length - 1) * 491)) % 89999) + 10000;
  const barcode = Math.abs(((serialIndex * 7129 + 1307) ^ (subjectCode.charCodeAt(0) * 83)) % 899999) + 100000;
  return {
    dummyCode: `DMY-${hash}`,
    barcodeNumber: `KV-${barcode}`,
  };
}

export interface EvaluatedScriptItem {
  scriptId: string;
  slotNumber: number;
  dummyCode: string;
  barcodeNumber: string;
  packetId: string;
  subjectCode: string;
  partAMarks: number;
  partBCMarks: number;
  totalMarks: number;
  grade: string;
  status: "PENDING" | "EVALUATED" | "LOCKED";
  evaluatedAt?: string;
  remarks?: string;
}

const STORAGE_KEY = "kvell_paper_correction_assignments";
const EVALUATED_STORAGE_KEY = "kvell_faculty_evaluated_scripts";

// Fallback initial allocation in case AD hasn't run yet
const FALLBACK_ALLOCATION: PaperCorrectionAllocation = {
  id: "ALLOC-AI602-2026",
  subjectCode: "AI602",
  subjectTitle: "Deep Learning & Neural Architectures",
  department: "Artificial Intelligence & Data Science",
  deptKey: "aids",
  semester: "Semester I",
  academicYear: "2026-2027",
  regulation: "R-2023 Autonomous",
  examSession: "Nov/Dec 2026 (FN)",
  qpMasterCode: "QP-2026-AI602-V2",
  totalAnswerScripts: 50,
  numberOfStaff: 2,
  allocatedAt: "2026-10-18 10:30 AM",
  deadlineDate: "2026-10-24",
  campVenue: "Autonomous Valuation Camp (Hall 304, Tech Block)",
  adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
  status: "VALUATION_IN_PROGRESS",
  assignedStaff: [
    {
      id: "STAFF-1",
      name: "Prof. K. Venkatesh",
      facultyId: "FAC-ENG-104",
      department: "AI&DS",
      role: "Chief Evaluator",
      assignedScripts: 25,
      scriptRangeStart: 1,
      scriptRangeEnd: 25,
      bundlePacketId: "PKT-AI602-A",
      status: "In Evaluation",
    },
    {
      id: "STAFF-2",
      name: "Dr. Ananya Menon",
      facultyId: "FAC-ENG-202",
      department: "CSE",
      role: "Internal Examiner",
      assignedScripts: 25,
      scriptRangeStart: 26,
      scriptRangeEnd: 50,
      bundlePacketId: "PKT-AI602-B",
      status: "In Evaluation",
    },
  ],
};

interface FacultyPaperCorrectionViewProps {
  currentFacultyName?: string;
  onToast?: (msg: string) => void;
}

export const FacultyPaperCorrectionView: React.FC<FacultyPaperCorrectionViewProps> = ({
  currentFacultyName = "Dr. Ananya Menon",
  onToast,
}) => {
  // Load allocations from localStorage
  const [allocations, setAllocations] = useState<PaperCorrectionAllocation[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [FALLBACK_ALLOCATION];
  });

  // Active Selected Faculty Identity
  const [selectedFacultyName, setSelectedFacultyName] = useState<string>(() => {
    // Check if currentFacultyName exists in any allocation
    return currentFacultyName || "Prof. K. Venkatesh";
  });

  // Selected Allocation for Detailed Valuation
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>("");

  // Evaluated scripts mapping (persisted per script)
  const [evaluatedScriptsMap, setEvaluatedScriptsMap] = useState<Record<string, EvaluatedScriptItem>>(() => {
    try {
      const raw = localStorage.getItem(EVALUATED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Search & Status filters
  const [scriptSearch, setScriptSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "EVALUATED">("ALL");

  // Selected Answer Script for Split-Screen Evaluation Desk (Left: Written Script, Right: Mark Entry)
  const [evaluatingScript, setEvaluatingScript] = useState<EvaluatedScriptItem | null>(null);

  // Modal State for Scanned Answer Script Photocopy Preview
  const [activeScriptModal, setActiveScriptModal] = useState<{
    script: EvaluatedScriptItem;
    bundlePacketId: string;
    subjectCode: string;
    subjectTitle: string;
    page: number;
  } | null>(null);

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  // Sync allocations on storage events
  useEffect(() => {
    const handleStorageUpdate = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAllocations(parsed);
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("kvell_paper_correction_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("kvell_paper_correction_updated", handleStorageUpdate);
    };
  }, []);

  // Save evaluated scripts
  const saveEvaluatedScripts = (map: Record<string, EvaluatedScriptItem>) => {
    setEvaluatedScriptsMap(map);
    try {
      localStorage.setItem(EVALUATED_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      console.error(e);
    }
  };

  // Extract all unique faculty names found across all allocations
  const allAssignedFacultyNames = useMemo(() => {
    const names = new Set<string>();
    allocations.forEach((alloc) => {
      alloc.assignedStaff.forEach((staff) => {
        if (staff.name) names.add(staff.name.trim());
      });
    });
    // Ensure default faculties are present
    names.add("Prof. K. Venkatesh");
    names.add("Dr. Ananya Menon");
    names.add("Dr. S. Mohan");
    return Array.from(names);
  }, [allocations]);

  // Find allocations assigned to the selected faculty
  // Only the bundles the Dean allotted to this sign-in (by staff ID, or by name for older allotments)
  const myUsername = (authApi.currentUser()?.username || "").toUpperCase();
  const isMine = React.useCallback((staff: EvaluatorStaff) => {
    if (myUsername && (staff.facultyId || "").toUpperCase() === myUsername) return true;
    const q = selectedFacultyName.toLowerCase().trim();
    return !!q && staff.name.toLowerCase().trim() === q;
  }, [myUsername, selectedFacultyName]);
  const myAllocations = useMemo(
    () => allocations.filter((alloc) => alloc.assignedStaff.some(isMine)),
    [allocations, isMine]
  );

  // Set default active allocation if none selected
  useEffect(() => {
    if (myAllocations.length > 0 && (!selectedAllocationId || !myAllocations.find((a) => a.id === selectedAllocationId))) {
      setSelectedAllocationId(myAllocations[0].id);
    }
  }, [myAllocations, selectedAllocationId]);

  // Currently active allocation object
  const activeAllocation = useMemo(() => {
    return myAllocations.find((a) => a.id === selectedAllocationId) || myAllocations[0];
  }, [selectedAllocationId, myAllocations]);

  // Currently active staff slot for this faculty in the selected allocation
  const activeStaffSlot = useMemo(() => {
    if (!activeAllocation) return null;
    return activeAllocation.assignedStaff.find(isMine) || null;
  }, [activeAllocation, isMine]);

  // The real answer scripts of the allotted subject, under the COE's dummy numbers (already shuffled by the server)
  const assessmentOf = (a?: PaperCorrectionAllocation) =>
    !a ? "End Semester" : /IAT-?2/i.test(a.examSession) ? "IAT-2" : /IAT-?1/i.test(a.examSession) ? "IAT-1" : "End Semester";
  // The allotted subject's department (an ECE paper can be allotted to a CSE faculty member)
  const deptOf = (a?: PaperCorrectionAllocation) => (a?.deptKey && a.deptKey !== "all" ? a.deptKey : undefined);
  const [realRoster, setRealRoster] = useState<StudentMarkDTO[] | null>(null);
  const loadRoster = React.useCallback(() => {
    if (!activeAllocation) return;
    facultyApi.roster(activeAllocation.semester, activeAllocation.subjectCode, assessmentOf(activeAllocation), deptOf(activeAllocation))
      .then((r) => setRealRoster(r.length ? r : null))
      .catch(() => setRealRoster(null));
  }, [activeAllocation?.id]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  // Generate the discrete list of assigned scripts for this staff's packet (Strict Blind Valuation)
  const assignedScriptsList: EvaluatedScriptItem[] = useMemo(() => {
    if (!activeAllocation || !activeStaffSlot) return [];
    if (realRoster) {
      // This evaluator's bundle: their slot range of the shuffled real scripts
      const bundle = realRoster.slice(Math.max(0, activeStaffSlot.scriptRangeStart - 1), activeStaffSlot.scriptRangeEnd);
      return bundle.map((m, i) => ({
        scriptId: m.regNo,
        slotNumber: i + 1,
        dummyCode: m.regNo,
        barcodeNumber: m.regNo,
        packetId: activeStaffSlot.bundlePacketId,
        subjectCode: activeAllocation.subjectCode,
        partAMarks: m.partATotal,
        partBCMarks: m.partBCTotal,
        totalMarks: m.grandTotal,
        grade: m.grade || "—",
        status: m.hasMarks ? "EVALUATED" : "PENDING",
      }));
    }

    const { scriptRangeStart, scriptRangeEnd, bundlePacketId } = activeStaffSlot;
    const count = scriptRangeEnd - scriptRangeStart + 1;
    const code = activeAllocation.subjectCode;

    // Deterministically scramble scripts within packet so order does NOT map to student alphabetical roll order
    const scrambled = getScrambledIndices(count, `${code}-${bundlePacketId}`);

    const list: EvaluatedScriptItem[] = [];

    for (let i = 0; i < count; i++) {
      const scrambledOffset = scrambled[i];
      const serialNum = scriptRangeStart + scrambledOffset;
      const scriptId = `${code}-${bundlePacketId}-SCR-${String(serialNum).padStart(3, "0")}`;
      const { dummyCode, barcodeNumber } = getCoeDummyBarcode(code, bundlePacketId, serialNum);

      // Check if existing saved mark exists
      const saved = evaluatedScriptsMap[scriptId];
      if (saved) {
        list.push({
          ...saved,
          slotNumber: i + 1,
          dummyCode: saved.dummyCode || dummyCode,
          barcodeNumber: saved.barcodeNumber || barcodeNumber,
        });
      } else {
        list.push({
          scriptId,
          slotNumber: i + 1,
          dummyCode,
          barcodeNumber,
          packetId: bundlePacketId,
          subjectCode: code,
          partAMarks: 0,
          partBCMarks: 0,
          totalMarks: 0,
          grade: "RA",
          status: "PENDING",
        });
      }
    }

    return list;
  }, [activeAllocation, activeStaffSlot, evaluatedScriptsMap, realRoster]);

  // Filtered scripts (Searchable by dummy barcode or script slot)
  const filteredScripts = useMemo(() => {
    return assignedScriptsList.filter((item) => {
      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      const q = scriptSearch.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.dummyCode.toLowerCase().includes(q) ||
        item.barcodeNumber.toLowerCase().includes(q) ||
        `script #${item.slotNumber}`.toLowerCase().includes(q);

      return matchStatus && matchQuery;
    });
  }, [assignedScriptsList, statusFilter, scriptSearch]);

  // Summary Metrics (Current Active Allocation)
  const totalAssigned = assignedScriptsList.length;
  const totalEvaluatedCount = assignedScriptsList.filter((s) => s.status !== "PENDING").length;
  const progressPercent = totalAssigned > 0 ? Math.round((totalEvaluatedCount / totalAssigned) * 100) : 0;
  const averageMark =
    totalEvaluatedCount > 0
      ? (
          assignedScriptsList
            .filter((s) => s.status !== "PENDING")
            .reduce((acc, s) => acc + s.totalMarks, 0) / totalEvaluatedCount
        ).toFixed(1)
      : "0.0";

  // Overall Statistics across all curriculum subjects allotted to this faculty
  const overallFacultyStats = useMemo(() => {
    let totalAllotted = 0;
    let totalEvaluated = 0;
    let weightedMarksSum = 0;

    const subjectsSummary = myAllocations.map((alloc) => {
      const staffMatch =
        alloc.assignedStaff.find(
          (s) =>
            s.name.toLowerCase().includes(selectedFacultyName.toLowerCase()) ||
            selectedFacultyName.toLowerCase().includes(s.name.toLowerCase())
        ) || alloc.assignedStaff[0];

      const assigned = staffMatch?.assignedScripts || 0;
      const evaluated = staffMatch?.evaluatedScripts ?? assigned;
      const avg = staffMatch?.averageMarks ?? 68.0;

      totalAllotted += assigned;
      totalEvaluated += evaluated;
      weightedMarksSum += avg * (evaluated || assigned);

      return {
        allocationId: alloc.id,
        subjectCode: alloc.subjectCode,
        subjectTitle: alloc.subjectTitle,
        bundlePacketId: staffMatch?.bundlePacketId || "PKT-A",
        assignedScripts: assigned,
        evaluatedScripts: evaluated,
        averageMarks: avg,
        stdDev: staffMatch?.stdDev ?? 6.8,
        campVenue: alloc.campVenue,
        deadlineDate: alloc.deadlineDate,
      };
    });

    const overallAverage =
      totalAllotted > 0
        ? parseFloat((weightedMarksSum / totalAllotted).toFixed(1))
        : 68.0;

    return {
      totalAllotted,
      totalEvaluated,
      overallAverage,
      subjectsSummary,
    };
  }, [myAllocations, selectedFacultyName]);

  // Calculate grade based on total
  const computeGrade = (total: number) => {
    if (total >= 90) return "O";
    if (total >= 80) return "A+";
    if (total >= 70) return "A";
    if (total >= 60) return "B+";
    if (total >= 50) return "B";
    if (total >= 45) return "C";
    return "RA";
  };

  // Handle Mark Input
  const handleUpdateMarks = (
    scriptId: string,
    field: "partA" | "partBC",
    value: number
  ) => {
    setEvaluatedScriptsMap((prev) => {
      const current = assignedScriptsList.find((s) => s.scriptId === scriptId);
      if (!current) return prev;

      const partA = field === "partA" ? Math.max(0, Math.min(20, value)) : current.partAMarks;
      const partBC = field === "partBC" ? Math.max(0, Math.min(80, value)) : current.partBCMarks;
      const total = partA + partBC;
      const grade = computeGrade(total);

      const updatedItem: EvaluatedScriptItem = {
        ...current,
        partAMarks: partA,
        partBCMarks: partBC,
        totalMarks: total,
        grade,
        status: total > 0 ? "EVALUATED" : "PENDING",
        evaluatedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const nextMap = { ...prev, [scriptId]: updatedItem };
      try {
        localStorage.setItem(EVALUATED_STORAGE_KEY, JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });
  };

  // Quick Evaluate All Scripts (Simulate Complete Valuation with Realistic Marks)
  const handleSimulateQuickEvaluation = () => {
    const updatedMap = { ...evaluatedScriptsMap };

    assignedScriptsList.forEach((script, idx) => {
      const baseMark = 68 + ((idx * 7) % 27);
      const partA = Math.round(Math.min(20, (baseMark * 0.22)));
      const partBC = Math.round(Math.min(80, baseMark - partA));
      const total = partA + partBC;
      const grade = computeGrade(total);

      updatedMap[script.scriptId] = {
        ...script,
        partAMarks: partA,
        partBCMarks: partBC,
        totalMarks: total,
        grade,
        status: "EVALUATED",
        evaluatedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        remarks: "Autonomous Valuation Camp · Evaluated & Signed by Examiner",
      };
    });

    saveEvaluatedScripts(updatedMap);
    notify(`Batch evaluated all ${assignedScriptsList.length} scripts in Packet ${activeStaffSlot?.bundlePacketId}!`);
  };

  // Lock and Finalize Bundle
  const handleLockBundle = () => {
    const updatedMap = { ...evaluatedScriptsMap };
    assignedScriptsList.forEach((script) => {
      if (updatedMap[script.scriptId]) {
        updatedMap[script.scriptId].status = "LOCKED";
      }
    });
    saveEvaluatedScripts(updatedMap);
    notify(
      `Bundle ${activeStaffSlot?.bundlePacketId} has been locked and submitted to Valuation Chief (Dr. Meganathan)!`
    );
  };

  // Export to Excel Handler (Blind Valuation Marksheet)
  const handleExportBundleExcel = () => {
    if (!activeAllocation || !activeStaffSlot) return;

    const rows = assignedScriptsList.map((item, idx) => ({
      "Sl No": idx + 1,
      "Packet Bundle ID": item.packetId,
      "COE Confidential Dummy Barcode": item.dummyCode,
      "Encrypted Barcode Number": item.barcodeNumber,
      "Subject Code": item.subjectCode,
      "Part A Marks (20)": item.partAMarks,
      "Part B & C Marks (80)": item.partBCMarks,
      "Grand Total Marks (100)": item.totalMarks,
      Grade: item.grade,
      Status: item.status,
      "Valuating Faculty": activeStaffSlot.name,
      "Faculty ID": activeStaffSlot.facultyId,
      "Valuation Camp Room": activeAllocation.campVenue,
      "Evaluation Date": item.evaluatedAt || "Pending",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${activeStaffSlot.bundlePacketId}_Marksheet`);
    XLSX.writeFile(
      wb,
      `KVELL_Faculty_Blind_Valuation_${activeStaffSlot.bundlePacketId}_${activeStaffSlot.name.replace(/\s+/g, "_")}.xlsx`
    );
    notify(`Exported blind valuation marksheet for Packet ${activeStaffSlot.bundlePacketId}`);
  };

  // The correction window opens only for evaluators the Dean has allotted answer-script bundles to
  if (myAllocations.length === 0) {
    return (
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-2">
        <FileText size={28} className="mx-auto text-[#D4A72C]" />
        <h2 className="text-lg font-black text-[#0B192C]">No answer scripts allotted to you</h2>
        <p className="text-xs text-slate-600">
          The Associate Dean allots answer-script bundles (IAT-1, IAT-2 and End Semester) to evaluators. Once a bundle is
          allotted to your staff ID, its correction window opens here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* TOP BANNER WITH SEALS & FACULTY ALLOCATION HEADER */}
      <div className="bg-white text-[#0B192C] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#EAB308] text-[#0B192C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest inline-block shadow-sm">
              CENTRAL VALUATION CAMP · FACULTY DESK
            </span>
            <span className="bg-slate-50 text-[#D4A72C] text-[10px] font-bold px-2 py-0.5 rounded border border-[#D4A72C]/30 font-mono">
              OFFICIAL SCRIPT EVALUATION
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0B192C] flex items-center gap-3">
            <FileText className="text-[#D4A72C]" size={28} />
            Assigned Paper Correction Desk
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Welcome to the Autonomous Valuation Wing. Examination answer scripts allocated to you by the{" "}
            <strong className="text-[#0B192C]">Associate Dean (Academics)</strong> are listed below with their discrete
            bundle packet IDs, serial ranges, and evaluation marksheets.
          </p>
        </div>

        {/* Identity & Active Faculty Selector */}
        <div className="relative z-10 bg-slate-50 p-3 rounded-2xl border border-slate-200 min-w-[260px] shrink-0">
          <span className="text-[10px] font-extrabold uppercase text-[#D4A72C] tracking-wider block mb-1">
            Logged-In Evaluating Faculty
          </span>
          <div className="w-full bg-slate-50 text-[#0B192C] font-bold text-xs py-2 px-3 rounded-xl border border-[#D4A72C]/40">
            {selectedFacultyName}
          </div>
          <span className="text-[10px] text-slate-600 mt-1 block">
            Role: <strong className="text-[#0B192C]">{activeStaffSlot?.role || "Examiner"}</strong> •{" "}
            {activeStaffSlot?.department || "Engineering"}
          </span>
        </div>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Paper Allocation */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
              OVERALL PAPERS ALLOTTED
            </span>
            <span className="font-display font-black text-3xl text-[#0B192C] mt-1 block font-mono">
              {overallFacultyStats.totalAllotted}
            </span>
            <span className="text-[11px] text-gray-500 font-semibold mt-0.5 block">
              Across {myAllocations.length} Subj (Active: {totalAssigned} Scripts)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center font-black">
            <FileText size={22} />
          </div>
        </div>

        {/* Card 2: Evaluated Count */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
              ACTIVE BUNDLE EVALUATED
            </span>
            <span className="font-display font-black text-3xl text-emerald-700 mt-1 block font-mono">
              {totalEvaluatedCount} / {totalAssigned}
            </span>
            <span className="text-[11px] text-emerald-800 font-bold mt-0.5 block">
              {progressPercent}% Current Bundle Valued
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card 3: Overall Average Score */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
              OVERALL AVERAGE SCORE
            </span>
            <span className="font-display font-black text-3xl text-blue-900 mt-1 block font-mono">
              {overallFacultyStats.overallAverage}
            </span>
            <span className="text-[11px] text-blue-800 font-bold mt-0.5 block">
              Out of 100 Marks (Active: {averageMark})
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>

        {/* Card 4: Valuation Camp Target */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
              TARGET DEADLINE
            </span>
            <span className="font-display font-black text-xl text-red-600 mt-1 block font-mono">
              {activeAllocation?.deadlineDate || "Within 5 Days"}
            </span>
            <span className="text-[11px] text-gray-500 font-semibold mt-0.5 block truncate max-w-[140px]">
              {activeAllocation?.campVenue || "Hall 304"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* OVERALL ALLOCATION & MARK AVERAGE SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#102035] to-[#1c324e] text-white p-5 rounded-3xl border border-[#D4A72C]/30 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center font-display font-black text-sm shrink-0">
              {selectedFacultyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-wider block">
                FACULTY VALUATION DOSSIER &bull; OVERALL PERFORMANCE
              </span>
              <h3 className="font-display font-black text-base text-white">
                {selectedFacultyName} — Allotted Papers &amp; Mark Averages
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/10 rounded-xl text-xs font-mono font-bold text-amber-300 border border-white/10">
              Total Allotted: {overallFacultyStats.totalAllotted} Papers
            </span>
            <span className="px-3 py-1 bg-[#D4A72C] rounded-xl text-xs font-mono font-black text-[#0B192C]">
              Overall Avg: {overallFacultyStats.overallAverage} / 100
            </span>
          </div>
        </div>

        {/* Breakdown Row of Each Allotted Subject */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
          {overallFacultyStats.subjectsSummary.map((sub) => (
            <div
              key={sub.allocationId}
              onClick={() => setSelectedAllocationId(sub.allocationId)}
              className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                sub.allocationId === activeAllocation?.id
                  ? "bg-[#D4A72C]/20 border-[#D4A72C] shadow-xs"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-[#D4A72C]">{sub.subjectCode}</span>
                  <span className="text-[10px] text-slate-400">({sub.bundlePacketId})</span>
                </div>
                <p className="font-medium text-white text-[11px] truncate max-w-[180px]">{sub.subjectTitle}</p>
                <span className="text-[10px] text-slate-300 font-mono mt-0.5 block">
                  Allotted: <strong>{sub.assignedScripts} Scripts</strong>
                </span>
              </div>
              <div className="text-right font-mono shrink-0">
                <span className="text-[9px] text-amber-300 uppercase block font-bold">Respective Avg</span>
                <span className="font-black text-base text-white block">
                  {sub.averageMarks} <span className="text-[10px] font-normal text-slate-300">/ 100</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALLOCATED SUBJECTS & PACKET SELECTOR TABS */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
              VALUATION APPOINTMENT ORDERS
            </span>
            <h2 className="font-display font-black text-lg text-[#0B192C]">
              Subjects Assigned to You by Associate Dean
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-500">
            {myAllocations.length} Active Allocation Order(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myAllocations.map((alloc) => {
            const staffMatch =
              alloc.assignedStaff.find(
                (s) =>
                  s.name.toLowerCase().includes(selectedFacultyName.toLowerCase()) ||
                  selectedFacultyName.toLowerCase().includes(s.name.toLowerCase())
              ) || alloc.assignedStaff[0];

            const isSelected = alloc.id === selectedAllocationId;

            return (
              <div
                key={alloc.id}
                onClick={() => setSelectedAllocationId(alloc.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#FAF8F5] border-[#D4A72C] shadow-md ring-2 ring-[#D4A72C]/20"
                    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs bg-[#0B192C] text-[#D4A72C] px-2 py-0.5 rounded">
                      {alloc.subjectCode}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 font-mono">
                      {staffMatch.bundlePacketId}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-[#0B192C] mt-2 line-clamp-1" title={alloc.subjectTitle}>
                    {alloc.subjectTitle}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">{alloc.department}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Quota</span>
                    <span className="font-mono font-bold text-[#0B192C]">
                      {staffMatch.assignedScripts} Scripts
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Valuation Protocol</span>
                    <span className="font-mono text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      COE Blind Batch
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED ANSWER SCRIPTS TABLE & EVALUATION DESK */}
      {activeAllocation && activeStaffSlot && (
        <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 sm:p-7 shadow-sm space-y-6">
          {/* Desk Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#0B192C] text-[#D4A72C] font-mono">
                  {activeStaffSlot.bundlePacketId}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200">
                  {activeStaffSlot.assignedScripts} Scripts · COE Shuffled Blind Batch
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {activeStaffSlot.role}
                </span>
              </div>
              <h2 className="font-display font-black text-xl text-[#0B192C] mt-1">
                {activeAllocation.subjectCode} — {activeAllocation.subjectTitle}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeAllocation.semester} · {activeAllocation.academicYear} • Official Camp Handover Order:{" "}
                <strong className="text-gray-800">{activeAllocation.id}</strong>
              </p>
            </div>

            {/* Action Tools */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleSimulateQuickEvaluation}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                title="Populate authentic evaluator marks for all scripts"
              >
                <Sparkles size={15} /> Quick-Grade Rubric (All Scripts)
              </button>
              <button
                type="button"
                onClick={handleExportBundleExcel}
                className="px-4 py-2.5 rounded-xl bg-white text-[#0B192C] hover:bg-gray-100 border border-gray-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download size={14} /> Export Marksheet
              </button>
              <button
                type="button"
                onClick={handleLockBundle}
                className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Lock size={14} className="text-[#D4A72C]" /> Lock &amp; Submit Bundle
              </button>
            </div>
          </div>

          {/* Strict Blind Valuation Security Banner */}
          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center gap-3 text-xs text-blue-950 shadow-xs">
            <ShieldCheck size={18} className="text-blue-700 shrink-0" />
            <div>
              <span className="font-bold text-blue-900">COE Strict Blind Valuation Protocol Active:</span>{" "}
              Candidate register numbers and names are securely masked by the Controller of Examinations. All answer scripts are evaluated solely using non-identifiable, scrambled COE Dummy Barcodes.
            </div>
          </div>

          {/* STEP 3: SELECT ANSWER SCRIPT FOR DUAL-SCREEN EVALUATION */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-[#0B192C] via-[#12233b] to-[#1e3455] text-white border-2 border-[#D4A72C]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#EAB308] text-[#0B192C] flex items-center justify-center font-black shrink-0 shadow-md">
                <PenLine size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                    STEP 3 · STRICT BLIND VALUATION DESK
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white border border-white/20">
                    Dual Split-Screen Layout
                  </span>
                </div>
                <h3 className="font-display font-extrabold text-sm sm:text-base text-white mt-0.5">
                  Select Answer Script for Side-by-Side Valuation
                </h3>
                <p className="text-[11px] text-slate-300">
                  Left panel (50%): Student written answer script &bull; Right panel (50%): Official evaluation script form with Part A &amp; Part B mark entry
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
              <select
                value={evaluatingScript?.scriptId || ""}
                onChange={(e) => {
                  const found = assignedScriptsList.find((s) => s.scriptId === e.target.value);
                  if (found) setEvaluatingScript(found);
                }}
                className="bg-[#081322] text-white text-xs font-bold py-2.5 px-3.5 rounded-xl border border-[#D4A72C]/50 focus:ring-2 focus:ring-[#D4A72C] focus:outline-none cursor-pointer flex-1 md:w-72"
              >
                <option value="">-- Choose Answer Script to Evaluate --</option>
                {assignedScriptsList.map((item, idx) => (
                  <option key={item.scriptId} value={item.scriptId}>
                    Script #{item.slotNumber || idx + 1} • {item.dummyCode} ({item.status === "PENDING" ? "Pending Marks" : `${item.totalMarks}/100 - ${item.grade}`})
                  </option>
                ))}
              </select>
              {assignedScriptsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEvaluatingScript(assignedScriptsList[0])}
                  className="px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-black text-xs transition shrink-0 shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <PenLine size={14} />
                  <span>Open Desk</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar within Table */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={scriptSearch}
                onChange={(e) => setScriptSearch(e.target.value)}
                placeholder="Search by dummy code (e.g. DMY-84291)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status:</span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-[#0B192C] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({assignedScriptsList.length})
              </button>
              <button
                onClick={() => setStatusFilter("PENDING")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-amber-500 text-slate-950 font-black"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Pending ({assignedScriptsList.filter((s) => s.status === "PENDING").length})
              </button>
              <button
                onClick={() => setStatusFilter("EVALUATED")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "EVALUATED"
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Evaluated ({assignedScriptsList.filter((s) => s.status !== "PENDING").length})
              </button>
            </div>
          </div>

          {/* SCRIPT-BY-SCRIPT EVALUATION TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Script Slot</th>
                  <th className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-blue-950">
                      <ShieldCheck size={13} className="text-blue-600" />
                      COE Confidential Dummy Barcode
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center">Part A (20)</th>
                  <th className="py-3 px-3 text-center">Part B&amp;C (80)</th>
                  <th className="py-3 px-3 text-center">Total (100)</th>
                  <th className="py-3 px-2 text-center">Grade</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Script Photocopy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium bg-white">
                {filteredScripts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No matching answer scripts found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredScripts.map((item, idx) => {
                    const isEvaluated = item.status !== "PENDING";

                    return (
                      <tr key={item.scriptId} className="hover:bg-amber-50/30 transition">
                        {/* Script Slot */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-[#0B192C] text-[#D4A72C] font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                              {item.slotNumber || idx + 1}
                            </span>
                            <div>
                              <span className="font-mono font-bold text-xs text-[#0B192C] block">
                                Script Item #{item.slotNumber || idx + 1}
                              </span>
                              <span className="text-[10px] text-emerald-700 block font-mono font-semibold">
                                {item.packetId} · Shuffled
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COE Confidential Dummy Barcode - NO STUDENT NAME / REG */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-1 px-2 rounded bg-gray-100 border border-gray-300 font-mono text-[9px] tracking-widest text-gray-700 select-none shadow-xs font-bold">
                              |||| | || |||| | ||
                            </div>
                            <div>
                              <span className="font-mono font-black text-xs text-[#0B192C] bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded block w-fit shadow-xs">
                                {item.dummyCode}
                              </span>
                              <span className="font-mono text-[10px] text-gray-500 block mt-0.5 font-semibold">
                                Barcode: {item.barcodeNumber}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Part A Marks (0 - 20) */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={item.partAMarks || ""}
                            onChange={(e) =>
                              handleUpdateMarks(item.scriptId, "partA", parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs border border-gray-300 rounded-lg focus:border-[#D4A72C] focus:outline-none bg-white"
                          />
                        </td>

                        {/* Part B&C Marks (0 - 80) */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            value={item.partBCMarks || ""}
                            onChange={(e) =>
                              handleUpdateMarks(item.scriptId, "partBC", parseInt(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs border border-gray-300 rounded-lg focus:border-[#D4A72C] focus:outline-none bg-white"
                          />
                        </td>

                        {/* Grand Total Marks */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg ${
                              item.totalMarks >= 50
                                ? "bg-emerald-50 text-emerald-800"
                                : item.totalMarks > 0
                                ? "bg-red-50 text-red-700"
                                : "text-gray-400 bg-gray-50"
                            }`}
                          >
                            {item.totalMarks} / 100
                          </span>
                        </td>

                        {/* Grade */}
                        <td className="py-3 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                              item.grade === "O" || item.grade === "A+"
                                ? "bg-purple-100 text-purple-900"
                                : item.grade === "A" || item.grade === "B+"
                                ? "bg-blue-100 text-blue-900"
                                : item.grade === "B" || item.grade === "C"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-red-100 text-red-900"
                            }`}
                          >
                            {item.grade}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {item.status === "LOCKED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 flex items-center justify-center gap-1">
                              <Lock size={10} /> LOCKED
                            </span>
                          ) : isEvaluated ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1">
                              <CheckCircle2 size={10} /> MARKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                              PENDING
                            </span>
                          )}
                        </td>

                        {/* Action: Evaluate Script (Split-Screen) */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setEvaluatingScript(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0B192C] hover:bg-[#152a48] text-[#D4A72C] hover:text-white font-extrabold text-xs border border-[#D4A72C]/40 transition flex items-center gap-1.5 mx-auto cursor-pointer shadow-xs group"
                            title="Open side-by-side Answer Script and Evaluation Form"
                          >
                            <PenLine size={13} className="text-[#D4A72C] group-hover:scale-110 transition" />
                            <span>Evaluate Script</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCANNED ANSWER SCRIPT PHOTOCOPY MODAL PREVIEW */}
      {activeScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#D4A72C]/30 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#EAB308] text-[#0B192C] font-mono font-black text-xs">
                  {activeScriptModal.bundlePacketId}
                </span>
                <div>
                  <h3 className="font-display font-black text-sm sm:text-base text-white">
                    Answer Script Photocopy — {activeScriptModal.script.dummyCode}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono">
                    COE Confidential Barcode: {activeScriptModal.script.barcodeNumber} •{" "}
                    {activeScriptModal.subjectCode} {activeScriptModal.subjectTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer"
                  title="Print Answer Booklet"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => setActiveScriptModal(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Scanned Document Simulation */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6">
              {/* Cover Sheet */}
              <div className="bg-white rounded-2xl border-2 border-gray-300 p-6 sm:p-8 shadow-md relative overflow-hidden font-serif">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <span className="font-sans font-black text-7xl uppercase rotate-[-25deg] text-black">
                    KVELL CENTRAL VALUATION
                  </span>
                </div>

                {/* Top Cover Header */}
                <div className="text-center border-b-2 border-black pb-4">
                  <h2 className="text-lg font-black uppercase tracking-wider text-black">
                    Karpaga Vinayaga College of Engineering and Technology
                  </h2>
                  <p className="text-xs uppercase font-sans font-bold text-gray-700 tracking-wide mt-0.5">
                    Autonomous End Semester Examinations • Official Answer Script Booklet
                  </p>
                  <p className="text-[11px] font-sans font-semibold text-gray-500 mt-1">
                    Central Valuation Camp Allocation • Packet: {activeScriptModal.bundlePacketId}
                  </p>
                </div>

                {/* Candidate Barcode & Meta - STRICT BLIND VALUATION */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-gray-300 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">REGISTER NUMBER</span>
                    <span className="font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded text-xs inline-block mt-0.5 border border-gray-200">
                      [MASKED BY COE]
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">STUDENT CANDIDATE</span>
                    <span className="font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded text-xs inline-block mt-0.5 border border-gray-200">
                      [BLIND VALUATION]
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">SUBJECT &amp; CODE</span>
                    <span className="font-bold text-black block mt-0.5">
                      {activeScriptModal.subjectCode} — {activeScriptModal.subjectTitle}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">COE DUMMY BARCODE</span>
                    <span className="font-mono font-black text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-block mt-0.5">
                      {activeScriptModal.script.dummyCode} ({activeScriptModal.script.barcodeNumber})
                    </span>
                  </div>
                </div>

                {/* Examiner Marks Table */}
                <div className="py-4 font-sans">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-700 block mb-2">
                    EXAMINER OFFICIAL VALUATION MARKS BREAKDOWN
                  </span>
                  <table className="w-full text-center border-collapse border border-gray-400 text-xs">
                    <thead className="bg-gray-100 font-bold">
                      <tr>
                        <th className="border border-gray-400 p-2">PART A (10 × 2M = 20M)</th>
                        <th className="border border-gray-400 p-2">PART B &amp; C (5 × 16M = 80M)</th>
                        <th className="border border-gray-400 p-2">GRAND TOTAL (100M)</th>
                        <th className="border border-gray-400 p-2">FINAL GRADE</th>
                        <th className="border border-gray-400 p-2">EXAMINER SIGN</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono font-bold">
                      <tr>
                        <td className="border border-gray-400 p-2.5 text-blue-900">
                          {activeScriptModal.script.partAMarks} / 20
                        </td>
                        <td className="border border-gray-400 p-2.5 text-blue-900">
                          {activeScriptModal.script.partBCMarks} / 80
                        </td>
                        <td className="border border-gray-400 p-2.5 text-base text-[#0B192C]">
                          {activeScriptModal.script.totalMarks} / 100
                        </td>
                        <td className="border border-gray-400 p-2.5 text-base text-[#B08014]">
                          {activeScriptModal.script.grade}
                        </td>
                        <td className="border border-gray-400 p-2.5 text-emerald-700 font-sans">
                          <span className="flex items-center justify-center gap-1 font-bold">
                            <ShieldCheck size={14} /> Certified
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Handwritten Answer Simulation */}
                <div className="mt-4 p-5 rounded-xl border border-gray-200 bg-[#FFFDF8] font-mono text-xs text-gray-800 space-y-3 leading-relaxed shadow-inner">
                  <div className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 flex justify-between">
                    <span>ANSWER SCRIPT PHOTOCOPY PREVIEW (PAGE {activeScriptModal.page} OF 8)</span>
                    <span className="text-emerald-700">HIGH-RESOLUTION SCAN 300 DPI</span>
                  </div>

                  <p className="font-serif italic text-gray-700 text-sm">
                    <strong>Part A — Question 1:</strong> Define Gradient Descent and state its convergence criteria in
                    deep neural network optimization.
                  </p>
                  <p className="pl-4 border-l-2 border-blue-400 text-gray-900 font-sans text-xs">
                    <em>Student Answer:</em> Gradient descent is a first-order iterative optimization algorithm for
                    finding a local minimum of a differentiable objective loss function J(theta). In deep networks,
                    weights are updated along the negative gradient direction: theta(t+1) = theta(t) - alpha * grad(J). Convergence is achieved when the norm of the gradient falls below a pre-specified
                    threshold epsilon approx 10^-5 or when loss reduction between epochs stabilizes.
                  </p>
                  <div className="text-right font-sans text-xs font-bold text-emerald-700">
                    [Marks Awarded by Examiner: 2.0 / 2.0]
                  </div>

                  <p className="font-serif italic text-gray-700 text-sm pt-2">
                    <strong>Part B — Question 11(a):</strong> Explain backpropagation architecture with mathematical
                    derivation of chain rule for hidden layer weight tensors.
                  </p>
                  <p className="pl-4 border-l-2 border-blue-400 text-gray-900 font-sans text-xs">
                    <em>Student Answer:</em> Let z^[l] = W^[l] * a^[l-1] + b^[l] and a^[l] = g(z^[l]).
                    By applying the multivariate chain rule across layers L down to 1, the partial derivative with
                    respect to weight matrix is given by dL / dW^[l] = delta^[l] * (a^[l-1])^T. The error vector propagates backwards through transposition delta^[l] =
                    (W^[l+1])^T * delta^[l+1] hadamard g'(z^[l]).
                  </p>
                  <div className="text-right font-sans text-xs font-bold text-emerald-700">
                    [Marks Awarded by Examiner: 14.5 / 16.0]
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500 font-medium">
                Photocopy certified by Controller of Examinations Central Valuation Camp
              </span>
              <button
                onClick={() => setActiveScriptModal(null)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white font-bold text-xs hover:bg-[#152744] transition cursor-pointer"
              >
                Close Photocopy Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DUAL-SCREEN EVALUATION DESK (Left: Written Script, Right: Mark Entry Form) */}
      {evaluatingScript && activeAllocation && (
        <SplitScreenEvaluationModal
          isOpen={Boolean(evaluatingScript)}
          onClose={() => setEvaluatingScript(null)}
          dummyBarcode={evaluatingScript.dummyCode}
          isBlindValuation={true}
          studentRegNo={evaluatingScript.scriptId}
          subjectCode={activeAllocation.subjectCode}
          subjectTitle={activeAllocation.subjectTitle}
          semester={activeAllocation.semester}
          department={activeAllocation.department}
          assessmentType={activeAllocation.examSession?.includes("IAT-2") ? "IAT-2" : "IAT-1"}
          packetId={evaluatingScript.packetId || activeStaffSlot?.bundlePacketId || "PKT-A"}
          pdfLoader={realRoster ? () => facultyApi.answerScript({ semester: activeAllocation.semester, subject: activeAllocation.subjectCode, regNo: evaluatingScript.dummyCode, assessment: assessmentOf(activeAllocation), dept: deptOf(activeAllocation) }) : undefined}
          onSaveMarks={async (result) => {
            if (realRoster) {
              // Saved to the real marks (the server checks the limits and maps the dummy number to the student)
              const sub = (x: { i: number; ii: number; iii: number }) => ({ i: x.i || 0, ii: x.ii || 0, iii: x.iii || 0 });
              const partBC: Record<string, { a: { i: number; ii: number; iii: number }; b: { i: number; ii: number; iii: number } }> = {};
              for (const q of [11, 12, 13, 14, 15, 16]) {
                const d = result.partBCMarks[q];
                partBC[String(q)] = { a: sub(d ? d.a : { i: 0, ii: 0, iii: 0 }), b: sub(d ? d.b : { i: 0, ii: 0, iii: 0 }) };
              }
              const current = realRoster.find((m) => m.regNo === evaluatingScript.dummyCode);
              try {
                await facultyApi.save({
                  semester: activeAllocation.semester,
                  subjectCode: activeAllocation.subjectCode,
                  regNo: evaluatingScript.dummyCode,
                  assessmentType: assessmentOf(activeAllocation),
                  partA: result.partAMarks,
                  partBC,
                  examinerName: authApi.currentUser()?.name || selectedFacultyName,
                  examinerDesignation: activeStaffSlot?.role || "Internal Examiner",
                  expectedVersion: current?.version,
                  deptKey: deptOf(activeAllocation),
                } as any);
                notify(`Marks saved for ${evaluatingScript.dummyCode}.`);
                loadRoster();
              } catch (e) {
                notify(apiErrorMessage(e, "The marks could not be saved."));
              }
              return;
            }
            const updatedMap: Record<string, EvaluatedScriptItem> = {
              ...evaluatedScriptsMap,
              [evaluatingScript.scriptId]: {
                ...evaluatingScript,
                partAMarks: result.partATotal,
                partBCMarks: result.partBTotal,
                totalMarks: result.grandTotal,
                grade: result.grade,
                status: "EVALUATED",
                evaluatedAt: new Date().toLocaleString(),
              },
            };
            saveEvaluatedScripts(updatedMap);
            notify(`Evaluated marks saved for ${evaluatingScript.dummyCode}: ${result.grandTotal} / 100 (${result.grade})`);
          }}
        />
      )}
    </div>
  );
};

export default FacultyPaperCorrectionView;
