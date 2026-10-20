import React, { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Send,
  RotateCcw,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Eye,
  AlertCircle,
  Building2,
  BookOpen,
  Award,
  CheckSquare,
  Sparkles,
  User,
  Calendar,
  FileCheck,
  ArrowRight,
  X,
  Layers,
  HelpCircle,
  Check,
  Lock,
  Crown,
  UserCheck,
  ShieldAlert,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import {
  QuestionPaperItem,
  HierarchyRole,
  HierarchyStageNumber,
  PdfAttachment,
  SAMPLE_QP_PDF_DATA,
  safeLoadQuestionPapers,
  saveQuestionPapers,
} from "../data/questionPapersData";
import { adminAuthApi } from "../services/api";
import { isSuperAdmin, SUPER_ADMIN_CONFIG, getActiveCollege } from "../utils/rbac";

export const QuestionPapersPage: React.FC = () => {
  const currentUser = adminAuthApi.getCurrentUser();
  const college = getActiveCollege();
  const isSuper = isSuperAdmin(currentUser);

  // Allow user to toggle between COE View (Stage 4) and Chief COE View (Stage 5)
  const [activeRoleView, setActiveRoleView] = useState<"COE" | "Chief COE">(
    isSuper ? "Chief COE" : "COE"
  );

  const [papers, setPapers] = useState<QuestionPaperItem[]>(() => safeLoadQuestionPapers());
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStageTab, setSelectedStageTab] = useState<
    "all" | "pending_coe" | "pending_chief_coe" | "approved" | "returned"
  >(isSuper ? "pending_chief_coe" : "pending_coe");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewPaper, setViewPaper] = useState<QuestionPaperItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState<{
    fileName: string;
    fileData: string;
  } | null>(null);

  // COE Moderation State for Modal
  const [allocatedSet, setAllocatedSet] = useState<"Set A" | "Set B">("Set A");
  const [dispatchNote, setDispatchNote] = useState<string>("");

  // Rejection / Return Modal State
  const [returnModal, setReturnModal] = useState<{
    paperId: string;
    targetStage: "COE" | "AD" | "HOD" | "Faculty";
  } | null>(null);
  const [returnRemarks, setReturnRemarks] = useState<string>("");

  // Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    action: "forward_chief_coe" | "chief_coe_approve";
    paper: QuestionPaperItem;
  } | null>(null);

  // Sync with localStorage & events
  const refreshData = () => {
    setPapers(safeLoadQuestionPapers());
  };

  useEffect(() => {
    window.addEventListener("kvell_qp_updated", refreshData);
    window.addEventListener("storage", refreshData);
    return () => {
      window.removeEventListener("kvell_qp_updated", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Keep viewPaper in sync when papers update
  useEffect(() => {
    if (viewPaper) {
      const updated = papers.find((p) => p.id === viewPaper.id);
      if (updated) setViewPaper(updated);
    }
  }, [papers]);

  // Update view paper set state when opened
  useEffect(() => {
    if (viewPaper) {
      setAllocatedSet(viewPaper.set || "Set A");
      setDispatchNote("");
    }
  }, [viewPaper?.id]);

  // KPI Counts
  const stats = useMemo(() => {
    const total = papers.length;
    const pendingCoe = papers.filter((p) => p.status === "PENDING_COE_REVIEW").length;
    const pendingChief = papers.filter((p) => p.status === "PENDING_CHIEF_COE").length;
    const masterApproved = papers.filter((p) => p.status === "CHIEF_COE_APPROVED").length;
    const returned = papers.filter((p) => p.status.startsWith("RETURNED")).length;
    return { total, pendingCoe, pendingChief, masterApproved, returned };
  }, [papers]);

  // Filtered List
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      // Stage tab filter
      if (selectedStageTab === "pending_coe" && p.status !== "PENDING_COE_REVIEW") return false;
      if (selectedStageTab === "pending_chief_coe" && p.status !== "PENDING_CHIEF_COE") return false;
      if (selectedStageTab === "approved" && p.status !== "CHIEF_COE_APPROVED") return false;
      if (selectedStageTab === "returned" && !p.status.startsWith("RETURNED")) return false;

      // Department filter
      if (selectedDept !== "all" && p.deptKey !== selectedDept) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = p.subjectCode.toLowerCase().includes(q);
        const matchTitle = p.subjectTitle.toLowerCase().includes(q);
        const matchFaculty = p.facultyName.toLowerCase().includes(q);
        const matchQp = p.qpCode.toLowerCase().includes(q);
        const matchRef = p.coeReferenceNo?.toLowerCase().includes(q) || false;
        if (!matchCode && !matchTitle && !matchFaculty && !matchQp && !matchRef) return false;
      }

      return true;
    });
  }, [papers, selectedStageTab, selectedDept, searchQuery]);

  // Action: COE Forwards to Chief COE (Stage 4 -> Stage 5)
  const handleCoeForwardToChiefCOE = (paperId: string) => {
    const currentPaper = papers.find((p) => p.id === paperId);
    if (!currentPaper) return;

    const refNo = currentPaper.coeReferenceNo || `COE/DISPATCH/2026/${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = papers.map((p) => {
      if (p.id !== paperId) return p;

      const newTrail = p.hierarchyTrail.map((sig) => {
        if (sig.stageNumber === 4) {
          return {
            ...sig,
            status: "COMPLETED" as const,
            timestamp: nowStr,
            sealOrReference: refNo,
            remarks: dispatchNote || `Confidential room allocation: ${allocatedSet}. Certified & forwarded to Chief COE.`,
          };
        }
        if (sig.stageNumber === 5) {
          return {
            ...sig,
            status: "CURRENT" as const,
            timestamp: "Awaiting Chief COE Master Seal",
          };
        }
        return sig;
      });

      return {
        ...p,
        set: allocatedSet,
        currentStageNumber: 5 as HierarchyStageNumber,
        currentStageRole: "Chief COE" as HierarchyRole,
        status: "PENDING_CHIEF_COE" as const,
        coeReferenceNo: refNo,
        hierarchyTrail: newTrail,
      };
    });

    saveQuestionPapers(updated);
    setPapers(updated);
    setConfirmDialog(null);
    showToast(`✓ Question Paper ${currentPaper.subjectCode} endorsed & dispatched to Chief COE (Ref: ${refNo})`);
  };

  // Action: Chief COE Authorizes Master University Seal (Stage 5 Completed)
  const handleChiefCoeAuthorizeRelease = (paperId: string) => {
    const currentPaper = papers.find((p) => p.id === paperId);
    if (!currentPaper) return;

    const sealNo = `KVELL/SEAL/2026/${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const updated = papers.map((p) => {
      if (p.id !== paperId) return p;

      const newTrail = p.hierarchyTrail.map((sig) => {
        if (sig.stageNumber === 5) {
          return {
            ...sig,
            status: "COMPLETED" as const,
            timestamp: nowStr,
            sealOrReference: sealNo,
            remarks: `EXECUTIVE SEAL APPLIED: Master University Examination Seal issued by Dr. Sathish (Chief COE). Final clearance granted for printing and autonomous conduction.`,
          };
        }
        return sig;
      });

      return {
        ...p,
        currentStageNumber: 5 as HierarchyStageNumber,
        currentStageRole: "Chief COE" as HierarchyRole,
        status: "CHIEF_COE_APPROVED" as const,
        chiefCoeSealNo: sealNo,
        approvedBy: `${SUPER_ADMIN_CONFIG.name} (${SUPER_ADMIN_CONFIG.shortTitle})`,
        hierarchyTrail: newTrail,
      };
    });

    saveQuestionPapers(updated);
    setPapers(updated);
    setConfirmDialog(null);
    showToast(`👑 Master Seal Affixed (${sealNo}): ${currentPaper.subjectCode} officially released for Examination!`);
  };

  // Action: Return to earlier stage with remarks
  const handleExecuteReturn = () => {
    if (!returnModal || !returnRemarks.trim()) return;

    const { paperId, targetStage } = returnModal;
    const targetStageNum: HierarchyStageNumber =
      targetStage === "COE" ? 4 : targetStage === "AD" ? 3 : targetStage === "HOD" ? 2 : 1;
    const targetStatus =
      targetStage === "COE"
        ? "RETURNED_TO_COE"
        : targetStage === "AD"
        ? "RETURNED_TO_AD"
        : targetStage === "HOD"
        ? "RETURNED_TO_HOD"
        : "RETURNED_TO_FACULTY";

    const officerName = activeRoleView === "Chief COE" ? SUPER_ADMIN_CONFIG.name : "COE Examination Wing";

    const updated = papers.map((p) => {
      if (p.id !== paperId) return p;

      const newTrail = p.hierarchyTrail.map((sig) => {
        if (sig.stageNumber === (activeRoleView === "Chief COE" ? 5 : 4)) {
          return {
            ...sig,
            status: "RETURNED" as const,
            remarks: `Returned to Stage ${targetStageNum} (${targetStage}) by ${officerName}: ${returnRemarks}`,
          };
        }
        if (sig.stageNumber === targetStageNum) {
          return {
            ...sig,
            status: "CURRENT" as const,
          };
        }
        return sig;
      });

      return {
        ...p,
        currentStageNumber: targetStageNum,
        currentStageRole: targetStage as HierarchyRole,
        status: targetStatus as any,
        adRemarks: `Returned by ${officerName} (${activeRoleView}): ${returnRemarks}`,
        hierarchyTrail: newTrail,
      };
    });

    saveQuestionPapers(updated);
    setPapers(updated);
    setReturnModal(null);
    setReturnRemarks("");
    showToast(`Question paper returned to ${targetStage} for revision.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-bounce bg-[#0B192C] text-[#D4A72C] px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-[#D4A72C] flex items-center gap-3">
          <Sparkles size={18} className="animate-spin" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP EXECUTIVE BANNER & PORTAL ROLE TOGGLE */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-8 rounded-[2.5rem] border-2 border-[#D4A72C]/40 shadow-2xl relative overflow-hidden">
        {/* Ambient Golden Glow Rings */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-96 h-96 bg-[#D4A72C]/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white p-1.5 border-2 border-[#D4A72C] flex items-center justify-center shrink-0 shadow-xl relative">
              <img
                src="/kvell-logo.png"
                alt="University Seal"
                className="w-full h-full object-contain"
              />
              <span className="absolute -bottom-2 -right-2 bg-[#D4A72C] text-[#0B192C] p-1.5 rounded-xl shadow-md border border-white">
                {activeRoleView === "Chief COE" ? <Crown size={14} className="fill-current" /> : <ShieldCheck size={14} />}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-[#D4A72C] text-[#0B192C] font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  {activeRoleView === "Chief COE" ? (
                    <>
                      <Crown size={12} /> STAGE 5 SUPREME CONSOLE
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={12} /> STAGE 4 COE EXAMINATION WING
                    </>
                  )}
                </span>
                <span className="bg-white/10 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  AUTONOMOUS REGULATION 2021
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  5-STAGE PERMISSION WORKFLOW
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Question Paper Logistics & Master Release Hub</span>
              </h1>

              <p className="text-xs text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
                {activeRoleView === "Chief COE"
                  ? "Executive authorization center for Dr. Sathish (Chief COE). Review complete academic and DAC audit trails, verify confidentiality certifications, and issue cryptographic Master University Seals for final examination conduction."
                  : "Controller of Examinations (COE) wing. Conduct confidential room scrutiny, verify Bloom's taxonomy balances, allocate examination sets (Set A / Set B), and endorse papers for Chief COE executive clearance."}
              </p>
            </div>
          </div>

          {/* ACTIVE VIEW ROLE SELECTOR TOGGLE */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl flex flex-col sm:flex-row items-center gap-2 shrink-0">
            <span className="text-[10px] font-extrabold uppercase text-[#D4A72C] tracking-wider px-2">
              ACTIVE VIEW MODE:
            </span>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  setActiveRoleView("COE");
                  setSelectedStageTab("pending_coe");
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  activeRoleView === "COE"
                    ? "bg-[#D4A72C] text-[#0B192C] shadow-lg"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldCheck size={14} />
                <span>COE Wing (Stage 4)</span>
                {stats.pendingCoe > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-600 text-white">
                    {stats.pendingCoe}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveRoleView("Chief COE");
                  setSelectedStageTab("pending_chief_coe");
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                  activeRoleView === "Chief COE"
                    ? "bg-gradient-to-r from-amber-400 to-[#D4A72C] text-[#0B192C] shadow-lg font-black"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <Crown size={14} />
                <span>Chief COE (Stage 5)</span>
                {stats.pendingChief > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-black animate-pulse">
                    {stats.pendingChief}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* WORKFLOW PIPELINE BREADCRUMB INDICATOR */}
        <div className="mt-6 pt-5 border-t border-white/15">
          <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-[10px]">
                1
              </span>
              <span className="font-bold text-white/80">Faculty Author</span>
            </div>
            <ChevronRight size={14} className="text-white/40 shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-[10px]">
                2
              </span>
              <span className="font-bold text-white/80">HOD DAC Scrutiny</span>
            </div>
            <ChevronRight size={14} className="text-white/40 shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center text-[10px]">
                3
              </span>
              <span className="font-bold text-white/80">Associate Dean Review</span>
            </div>
            <ChevronRight size={14} className="text-white/40 shrink-0" />

            <div
              className={`flex items-center gap-2 shrink-0 px-3 py-1 rounded-xl transition ${
                activeRoleView === "COE"
                  ? "bg-[#D4A72C] text-[#0B192C] font-black ring-2 ring-[#D4A72C]/50"
                  : "bg-white/10 text-white font-bold"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full font-black flex items-center justify-center text-[10px] ${
                  activeRoleView === "COE" ? "bg-[#0B192C] text-[#D4A72C]" : "bg-white/20 text-white"
                }`}
              >
                4
              </span>
              <span>COE Set Allocation</span>
            </div>
            <ChevronRight size={14} className="text-white/40 shrink-0" />

            <div
              className={`flex items-center gap-2 shrink-0 px-3 py-1 rounded-xl transition ${
                activeRoleView === "Chief COE"
                  ? "bg-gradient-to-r from-amber-400 to-[#D4A72C] text-[#0B192C] font-black ring-2 ring-amber-400/50"
                  : "bg-white/10 text-white font-bold"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full font-black flex items-center justify-center text-[10px] ${
                  activeRoleView === "Chief COE" ? "bg-[#0B192C] text-amber-400" : "bg-white/20 text-white"
                }`}
              >
                5
              </span>
              <span className="flex items-center gap-1">
                <Crown size={12} />
                Chief COE Master Seal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Stage 4 Pending */}
        <div
          onClick={() => {
            setActiveRoleView("COE");
            setSelectedStageTab("pending_coe");
          }}
          className={`p-5 rounded-3xl border-2 transition cursor-pointer shadow-sm flex flex-col justify-between ${
            selectedStageTab === "pending_coe"
              ? "bg-amber-50 border-[#D4A72C] ring-2 ring-[#D4A72C]/40"
              : "bg-white border-slate-200 hover:border-[#D4A72C]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Pending COE Scrutiny (Stage 4)
              </span>
              <span className="text-3xl font-black text-[#0B192C] mt-1 block">
                {stats.pendingCoe}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Awaiting Set Allocation</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* KPI 2: Stage 5 Pending */}
        <div
          onClick={() => {
            setActiveRoleView("Chief COE");
            setSelectedStageTab("pending_chief_coe");
          }}
          className={`p-5 rounded-3xl border-2 transition cursor-pointer shadow-sm flex flex-col justify-between ${
            selectedStageTab === "pending_chief_coe"
              ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/40"
              : "bg-white border-slate-200 hover:border-purple-400"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Pending Chief COE (Stage 5)
              </span>
              <span className="text-3xl font-black text-[#0B192C] mt-1 block">
                {stats.pendingChief}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Crown size={24} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>Awaiting Master Seal</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* KPI 3: Master Approved & Sealed */}
        <div
          onClick={() => setSelectedStageTab("approved")}
          className={`p-5 rounded-3xl border-2 transition cursor-pointer shadow-sm flex flex-col justify-between ${
            selectedStageTab === "approved"
              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/40"
              : "bg-white border-slate-200 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Master University Sealed
              </span>
              <span className="text-3xl font-black text-emerald-700 mt-1 block">
                {stats.masterApproved}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Award size={24} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Cleared for Conduction</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* KPI 4: Total Papers in System */}
        <div
          onClick={() => setSelectedStageTab("all")}
          className={`p-5 rounded-3xl border-2 transition cursor-pointer shadow-sm flex flex-col justify-between ${
            selectedStageTab === "all"
              ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/40"
              : "bg-white border-slate-200 hover:border-blue-400"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Total Papers Registered
              </span>
              <span className="text-3xl font-black text-[#0B192C] mt-1 block">
                {stats.total}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Layers size={24} />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Complete Catalog</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedStageTab("pending_coe")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                selectedStageTab === "pending_coe"
                  ? "bg-[#0B192C] text-[#D4A72C] shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ShieldCheck size={14} />
              <span>COE Review Queue (Stage 4)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-black">
                {stats.pendingCoe}
              </span>
            </button>

            <button
              onClick={() => setSelectedStageTab("pending_chief_coe")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                selectedStageTab === "pending_chief_coe"
                  ? "bg-purple-900 text-purple-200 shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Crown size={14} />
              <span>Chief COE Master Seal Queue (Stage 5)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500 text-white font-black">
                {stats.pendingChief}
              </span>
            </button>

            <button
              onClick={() => setSelectedStageTab("approved")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                selectedStageTab === "approved"
                  ? "bg-emerald-700 text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Master Sealed ({stats.masterApproved})</span>
            </button>

            <button
              onClick={() => setSelectedStageTab("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition ${
                selectedStageTab === "all"
                  ? "bg-[#0B192C] text-white shadow"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Papers ({stats.total})
            </button>
          </div>

          {/* Department Selector & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#D4A72C] cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="cse">Computer Science & Engg</option>
                <option value="aids">AI & Data Science</option>
                <option value="bme">Biomedical Engineering</option>
                <option value="mech">Mechanical Engineering</option>
                <option value="ece">Electronics & Communication</option>
                <option value="nursing">Nursing Sciences</option>
                <option value="pharmacy">Pharmaceutical Sciences</option>
              </select>
            </div>

            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject code, title, faculty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION PAPERS TABLE / CARD ROSTER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPapers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <BookOpen size={28} />
            </div>
            <h3 className="font-display font-black text-base text-[#0B192C]">
              No Question Papers Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No question papers match the selected filter criteria. Try changing the stage tab or
              searching for a different subject code.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredPapers.map((paper) => {
              const isStage4Waiting = paper.status === "PENDING_COE_REVIEW";
              const isStage5Waiting = paper.status === "PENDING_CHIEF_COE";
              const isApproved = paper.status === "CHIEF_COE_APPROVED";

              return (
                <div
                  key={paper.id}
                  className="p-5 hover:bg-slate-50/70 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  {/* Left Column: Subject Details & Badges */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-[#0B192C] text-[#D4A72C] shadow-xs">
                        {paper.subjectCode}
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        {paper.qpCode}
                      </span>

                      {/* Set Badge */}
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {paper.set}
                      </span>

                      {/* Status Badge */}
                      {isStage4Waiting && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 flex items-center gap-1">
                          <ShieldCheck size={11} />
                          Stage 4: Pending COE Set Allocation
                        </span>
                      )}
                      {isStage5Waiting && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-800 border border-purple-500/30 flex items-center gap-1 animate-pulse">
                          <Crown size={11} />
                          Stage 5: Pending Chief COE Master Seal
                        </span>
                      )}
                      {isApproved && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 border border-emerald-500/30 flex items-center gap-1">
                          <Award size={11} />
                          Master Sealed &amp; University Released
                        </span>
                      )}
                      {paper.pdfAttachment && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <FileText size={11} className="text-amber-700" />
                          PDF: {paper.pdfAttachment.fileName} ({paper.pdfAttachment.fileSize})
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-black text-base text-[#0B192C] leading-snug">
                      {paper.subjectTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 size={13} className="text-slate-400" />
                        {paper.department}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <User size={13} className="text-slate-400" />
                        Author: {paper.facultyName}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar size={13} className="text-slate-400" />
                        Submitted: {paper.dateSubmitted}
                      </span>
                    </div>

                    {/* Reference numbers & stamps */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                      {paper.coeReferenceNo && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          COE Ref: {paper.coeReferenceNo}
                        </span>
                      )}
                      {paper.chiefCoeSealNo && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          University Seal: {paper.chiefCoeSealNo}
                        </span>
                      )}
                      {paper.adRemarks && (
                        <span className="text-slate-500 italic max-w-xl truncate">
                          "{paper.adRemarks}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: 5-Stage Step Indicators */}
                  <div className="shrink-0 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    {paper.hierarchyTrail.map((sig) => {
                      const isDone = sig.status === "COMPLETED";
                      const isCurrent = sig.status === "CURRENT";
                      return (
                        <div
                          key={sig.stageNumber}
                          title={`${sig.officerTitle} (${sig.officerName}): ${sig.status}`}
                          className="flex flex-col items-center gap-1"
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-[11px] transition ${
                              isDone
                                ? "bg-emerald-600 text-white shadow-xs"
                                : isCurrent
                                ? "bg-[#0B192C] text-[#D4A72C] ring-2 ring-[#D4A72C] animate-pulse"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            {isDone ? <Check size={14} /> : sig.stageNumber}
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {sig.stageRole}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => setViewPaper(paper)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Eye size={14} />
                      <span>Inspect Paper</span>
                    </button>

                    {paper.pdfAttachment && (
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: paper.pdfAttachment!.fileName,
                            fileData: paper.pdfAttachment!.fileData || SAMPLE_QP_PDF_DATA,
                          })
                        }
                        className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="View Uploaded Faculty PDF"
                      >
                        <FileText size={14} className="text-amber-700" />
                        <span>View PDF</span>
                      </button>
                    )}

                    {/* COE Quick Forward Button */}
                    {activeRoleView === "COE" && isStage4Waiting && (
                      <button
                        onClick={() => {
                          setViewPaper(paper);
                          setConfirmDialog({
                            action: "forward_chief_coe",
                            paper,
                          });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <ShieldCheck size={14} />
                        <span>Allocate Set &amp; Forward</span>
                      </button>
                    )}

                    {/* Chief COE Master Seal Quick Button */}
                    {activeRoleView === "Chief COE" && isStage5Waiting && (
                      <button
                        onClick={() => {
                          setViewPaper(paper);
                          setConfirmDialog({
                            action: "chief_coe_approve",
                            paper,
                          });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#D4A72C] hover:from-amber-600 hover:to-amber-500 text-[#0B192C] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Crown size={14} />
                        <span>Affix Master Seal</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL INSPECTION & MODERATION MODAL */}
      {viewPaper && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-6 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-[#D4A72C] text-[#0B192C]">
                    {viewPaper.subjectCode}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {viewPaper.qpCode}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/10 text-white">
                    {viewPaper.set}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {viewPaper.status}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  {viewPaper.subjectTitle}
                </h2>
                <p className="text-xs text-slate-400">
                  {viewPaper.department} • {viewPaper.regulation} • {viewPaper.examType}
                </p>
              </div>

              <button
                onClick={() => setViewPaper(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* FACULTY UPLOADED QUESTION PAPER PDF BANNER */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800">
                    <FileText size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-black text-sm sm:text-base text-[#0B192C]">
                        {viewPaper.pdfAttachment?.fileName || `${viewPaper.qpCode}.pdf`}
                      </h4>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                        Faculty Uploaded PDF
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      File Size: <strong className="text-slate-800">{viewPaper.pdfAttachment?.fileSize || "245 KB"}</strong> &bull; Uploaded by <strong className="text-slate-800">{viewPaper.facultyName}</strong> on {viewPaper.pdfAttachment?.uploadedAt || viewPaper.dateSubmitted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() =>
                      setPdfModalOpen({
                        fileName: viewPaper.pdfAttachment?.fileName || `${viewPaper.qpCode}.pdf`,
                        fileData: viewPaper.pdfAttachment?.fileData || SAMPLE_QP_PDF_DATA,
                      })
                    }
                    className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Eye size={14} />
                    <span>Inspect PDF Document</span>
                  </button>
                  <a
                    href={viewPaper.pdfAttachment?.fileData || SAMPLE_QP_PDF_DATA}
                    download={viewPaper.pdfAttachment?.fileName || `${viewPaper.qpCode}.pdf`}
                    className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-amber-400 text-[#0B192C] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Download size={14} />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>

              {/* 5-STAGE AUDIT TRAIL TIMELINE */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-black text-xs text-[#0B192C] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#D4A72C]" />
                    5-Stage Custody &amp; Permission Trail
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    Faculty → HOD → AD → COE → Chief COE
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                  {viewPaper.hierarchyTrail.map((sig) => {
                    const isDone = sig.status === "COMPLETED";
                    const isCurrent = sig.status === "CURRENT";
                    return (
                      <div
                        key={sig.stageNumber}
                        className={`p-3 rounded-2xl border transition ${
                          isDone
                            ? "bg-emerald-50/70 border-emerald-200"
                            : isCurrent
                            ? "bg-amber-50 border-amber-300 ring-2 ring-amber-300/50"
                            : "bg-white border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase text-slate-700">
                            Stage {sig.stageNumber}: {sig.stageRole}
                          </span>
                          {isDone ? (
                            <CheckCircle2 size={13} className="text-emerald-600" />
                          ) : isCurrent ? (
                            <Clock size={13} className="text-amber-600 animate-spin" />
                          ) : null}
                        </div>
                        <span className="block text-[11px] font-black text-[#0B192C] truncate">
                          {sig.officerName}
                        </span>
                        <span className="block text-[9px] text-slate-500 truncate">
                          {sig.officerTitle}
                        </span>
                        {sig.sealOrReference && (
                          <span className="mt-1 block text-[9px] font-mono font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded truncate">
                            {sig.sealOrReference}
                          </span>
                        )}
                        {sig.remarks && (
                          <p className="mt-1 text-[9px] text-slate-600 italic line-clamp-2" title={sig.remarks}>
                            "{sig.remarks}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BLOOM'S TAXONOMY & SYLLABUS AUDIT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Bloom's Taxonomy Balance
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-blue-700">Remember / Understand (K1-K2)</span>
                      <span>{viewPaper.bloomsDistribution.rememberUnderstand}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${viewPaper.bloomsDistribution.rememberUnderstand}%` }}
                      />
                    </div>

                    <div className="flex justify-between font-bold pt-1">
                      <span className="text-amber-700">Apply / Analyze (K3-K4)</span>
                      <span>{viewPaper.bloomsDistribution.applyAnalyze}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${viewPaper.bloomsDistribution.applyAnalyze}%` }}
                      />
                    </div>

                    <div className="flex justify-between font-bold pt-1">
                      <span className="text-purple-700">Evaluate / Create (K5-K6)</span>
                      <span>{viewPaper.bloomsDistribution.evaluateCreate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full"
                        style={{ width: `${viewPaper.bloomsDistribution.evaluateCreate}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    DAC &amp; Curriculum Verification
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 size={14} />
                      <span>Syllabus Coverage: {viewPaper.syllabusCoverage}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 size={14} />
                      <span>DAC HOD Endorsement Certified</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                      <CheckCircle2 size={14} />
                      <span>CO Mapping: {viewPaper.courseOutcomesCovered.join(", ")}</span>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-500 italic">
                      HOD Note: "{viewPaper.hodDeclaration.hodNote}"
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">
                    Examination Specifications
                  </span>
                  <div className="space-y-1 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Max Marks:</span>
                      <span className="font-bold">{viewPaper.maxMarks} Marks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Duration:</span>
                      <span className="font-bold">{viewPaper.durationHours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Academic Year:</span>
                      <span className="font-bold">{viewPaper.academicYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Semester:</span>
                      <span className="font-bold">{viewPaper.semester}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUESTIONS PREVIEW TABS (Part A, Part B, Part C) */}
              <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
                <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-display font-black text-xs text-[#0B192C] uppercase tracking-wider flex items-center gap-2">
                    <FileText size={15} className="text-[#D4A72C]" />
                    Question Paper Content Breakdown
                  </h4>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 flex items-center gap-1 transition"
                  >
                    <Printer size={13} />
                    <span>Print Paper</span>
                  </button>
                </div>

                <div className="p-5 space-y-6">
                  {/* PART A */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <h5 className="font-display font-black text-xs text-[#0B192C] uppercase">
                        PART A — Short Answer Questions
                      </h5>
                      <span className="text-xs font-bold text-slate-500">
                        {viewPaper.parts.partA.instructions}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {viewPaper.parts.partA.questions.map((q) => (
                        <div key={q.qNo} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-slate-700">
                            <span>Q.{q.qNo}</span>
                            <span className="text-[10px] font-mono text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                              {q.co} • {q.bloom} • {q.marks}M
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium leading-relaxed">{q.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PART B */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <h5 className="font-display font-black text-xs text-[#0B192C] uppercase">
                        PART B — Descriptive / Either-Or Questions
                      </h5>
                      <span className="text-xs font-bold text-slate-500">
                        {viewPaper.parts.partB.instructions}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {viewPaper.parts.partB.questions.map((q) => (
                        <div key={q.qNo} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                          <div className="flex items-center justify-between font-black text-slate-800">
                            <span>QUESTION {q.qNo}</span>
                            <span className="text-[10px] font-mono text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded">
                              13 Marks
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                              <span className="text-[10px] font-black text-slate-500 block">OPTION (a)</span>
                              <p className="text-slate-800 leading-relaxed">{q.optionA.text}</p>
                              <span className="inline-block mt-1 text-[10px] font-mono text-slate-500">
                                {q.optionA.co} • {q.optionA.bloom}
                              </span>
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                              <span className="text-[10px] font-black text-slate-500 block">OPTION (b)</span>
                              <p className="text-slate-800 leading-relaxed">{q.optionB.text}</p>
                              <span className="inline-block mt-1 text-[10px] font-mono text-slate-500">
                                {q.optionB.co} • {q.optionB.bloom}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PART C */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <h5 className="font-display font-black text-xs text-[#0B192C] uppercase">
                        PART C — Comprehensive / Evaluative Question (K5/K6)
                      </h5>
                      <span className="text-xs font-bold text-slate-500">
                        {viewPaper.parts.partC.instructions}
                      </span>
                    </div>
                    {viewPaper.parts.partC.questions.map((q) => (
                      <div key={q.qNo} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
                        <div className="flex items-center justify-between font-black text-[#0B192C]">
                          <span>Q.{q.qNo} Comprehensive Evaluative Problem</span>
                          <span className="text-[10px] font-mono text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded font-black">
                            {q.co} • {q.bloom} • {q.marks} Marks
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">{q.text}</p>
                        <div className="mt-2 p-2.5 rounded-xl bg-white border border-amber-200 text-slate-600 text-[11px]">
                          <span className="font-black text-amber-900 block mb-0.5">Evaluation Rubric &amp; Marks Distribution:</span>
                          {q.rubricHint}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACTION EXECUTION ZONE: COE SET ALLOCATION / CHIEF COE RELEASE */}
              <div className="bg-[#0B192C] text-white p-6 rounded-3xl border border-[#D4A72C]/40 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    {activeRoleView === "Chief COE" ? (
                      <Crown size={18} className="text-[#D4A72C]" />
                    ) : (
                      <ShieldCheck size={18} className="text-[#D4A72C]" />
                    )}
                    <h4 className="font-display font-black text-sm text-white">
                      {activeRoleView === "Chief COE"
                        ? "Stage 5 Chief COE Executive Seal Authorization"
                        : "Stage 4 COE Confidential Room Set Allocation"}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#D4A72C] font-mono uppercase">
                    OFFICIAL UNIVERSITY EXAM AUDIT
                  </span>
                </div>

                {/* COE View Controls */}
                {activeRoleView === "COE" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Set Allocation */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Assign Examination Package Set:
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setAllocatedSet("Set A")}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition border ${
                              allocatedSet === "Set A"
                                ? "bg-[#D4A72C] text-[#0B192C] border-[#D4A72C] shadow-lg"
                                : "bg-white/5 text-slate-300 border-white/20 hover:bg-white/10"
                            }`}
                          >
                            Set A (Primary)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllocatedSet("Set B")}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition border ${
                              allocatedSet === "Set B"
                                ? "bg-[#D4A72C] text-[#0B192C] border-[#D4A72C] shadow-lg"
                                : "bg-white/5 text-slate-300 border-white/20 hover:bg-white/10"
                            }`}
                          >
                            Set B (Reserve / Confidential)
                          </button>
                        </div>
                      </div>

                      {/* Dispatch Note */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          COE Dispatch Notes / Remarks:
                        </label>
                        <input
                          type="text"
                          value={dispatchNote}
                          onChange={(e) => setDispatchNote(e.target.value)}
                          placeholder="e.g. Set A primary allocation confirmed. Forwarded to Chief COE."
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        onClick={() =>
                          setReturnModal({
                            paperId: viewPaper.id,
                            targetStage: "AD",
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/40 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Return to Associate Dean</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setViewPaper(null)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                        >
                          Close
                        </button>

                        <button
                          onClick={() =>
                            setConfirmDialog({
                              action: "forward_chief_coe",
                              paper: viewPaper,
                            })
                          }
                          className="px-6 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-amber-400 text-[#0B192C] text-xs font-black transition shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          <Send size={15} />
                          <span>Endorse &amp; Forward to Chief COE</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chief COE View Controls */}
                {activeRoleView === "Chief COE" && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      As Chief Controller of Examinations (Dr. Sathish), applying the Master University Seal is the final step in the autonomous examination governance pipeline. Upon release, question paper custody is authorized for confidential printing and invigilation dispatch.
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        onClick={() =>
                          setReturnModal({
                            paperId: viewPaper.id,
                            targetStage: "COE",
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold border border-red-500/40 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Return to COE Wing</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setViewPaper(null)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                        >
                          Close
                        </button>

                        <button
                          onClick={() =>
                            setConfirmDialog({
                              action: "chief_coe_approve",
                              paper: viewPaper,
                            })
                          }
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#D4A72C] hover:from-amber-500 hover:to-amber-400 text-[#0B192C] text-xs font-black transition shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                          <Crown size={15} />
                          <span>Affix Master University Seal &amp; Authorize Release</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.action === "chief_coe_approve"
                    ? "bg-amber-100 text-[#0B192C]"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {confirmDialog.action === "chief_coe_approve" ? <Crown size={24} /> : <Send size={24} />}
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-[#0B192C]">
                  {confirmDialog.action === "chief_coe_approve"
                    ? "Authorize Master University Seal?"
                    : "Endorse & Forward to Chief COE?"}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {confirmDialog.paper.subjectCode} • {confirmDialog.paper.subjectTitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmDialog.action === "chief_coe_approve"
                ? `You are acting as Chief COE Dr. Sathish. This action generates the official Master University Examination Seal and marks the paper as officially approved for printing and examination conduction.`
                : `COE room allocation (${allocatedSet}) confirmed. An official COE dispatch reference will be generated and custody transferred to Chief COE (Dr. Sathish).`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.action === "forward_chief_coe") {
                    handleCoeForwardToChiefCOE(confirmDialog.paper.id);
                  } else {
                    handleChiefCoeAuthorizeRelease(confirmDialog.paper.id);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black shadow transition cursor-pointer ${
                  confirmDialog.action === "chief_coe_approve"
                    ? "bg-[#D4A72C] hover:bg-amber-400 text-[#0B192C]"
                    : "bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C]"
                }`}
              >
                Confirm &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETURN MODAL */}
      {returnModal && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-red-100 text-red-600">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-[#0B192C]">
                  Return Question Paper to {returnModal.targetStage}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Stage Revision Directive
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Revision Reason / Directives:
              </label>
              <textarea
                rows={3}
                value={returnRemarks}
                onChange={(e) => setReturnRemarks(e.target.value)}
                placeholder="Explain the reason for return (e.g. Part C lacks Bloom's K5/K6 higher order evaluative balance)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => {
                  setReturnModal(null);
                  setReturnRemarks("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!returnRemarks.trim()}
                onClick={handleExecuteReturn}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 shadow transition cursor-pointer"
              >
                Return Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PDF PREVIEW MODAL */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
          <div className="bg-white max-w-5xl w-full h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="text-[#D4A72C]" size={20} />
                <div>
                  <h3 className="font-bold text-sm text-white">{pdfModalOpen.fileName}</h3>
                  <span className="text-[10px] text-slate-400">
                    {activeRoleView === "Chief COE" ? "Stage 5 • Chief COE Master University Audit" : "Stage 4 • Controller of Examinations Moderation"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfModalOpen.fileData}
                  download={pdfModalOpen.fileName}
                  className="px-3 py-1.5 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black hover:bg-amber-400 transition flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setPdfModalOpen(null)}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={pdfModalOpen.fileData}
                title={pdfModalOpen.fileName}
                className="w-full h-full rounded-2xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionPapersPage;
