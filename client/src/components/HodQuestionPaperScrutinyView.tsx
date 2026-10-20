import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  RotateCcw,
  Search,
  Printer,
  ChevronRight,
  Eye,
  AlertCircle,
  BookOpen,
  Sparkles,
  FileCheck,
  X,
  Layers,
  Check,
  Plus,
  ArrowRight,
  Building2,
  Calendar,
  UserCheck,
  Award,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  QuestionPaperItem,
  INITIAL_QUESTION_PAPERS,
  StageSignature,
  PdfAttachment,
  SAMPLE_QP_PDF_DATA,
  safeLoadQuestionPapers,
} from "./dean/QuestionPaperReviewView";

const STORAGE_KEY = "kvell_assoc_dean_question_papers";

interface HodQuestionPaperScrutinyViewProps {
  department: string;
  hodName: string;
}

export const HodQuestionPaperScrutinyView: React.FC<HodQuestionPaperScrutinyViewProps> = ({
  department,
  hodName,
}) => {
  const [papers, setPapers] = useState<QuestionPaperItem[]>(() => {
    return safeLoadQuestionPapers();
  });

  const [activeFilterTab, setActiveFilterTab] = useState<
    "pending" | "forwarded" | "approved" | "returned" | "all"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState<{
    fileName: string;
    fileData: string;
  } | null>(null);

  // Scrutiny Modal State (Stage 2 HOD Action)
  const [scrutinyPaper, setScrutinyPaper] = useState<QuestionPaperItem | null>(null);
  const [dacSyllabusChecked, setDacSyllabusChecked] = useState(true);
  const [dacBloomsChecked, setDacBloomsChecked] = useState(true);
  const [dacChoiceParityChecked, setDacChoiceParityChecked] = useState(true);
  const [dacPartCEvaluativeChecked, setDacPartCEvaluativeChecked] = useState(true);
  const [hodEndorsementNotes, setHodEndorsementNotes] = useState("");
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [returnRemarksInput, setReturnRemarksInput] = useState("");

  // Preview & Hierarchy Modal States
  const [previewPaper, setPreviewPaper] = useState<QuestionPaperItem | null>(null);
  const [hierarchyPaper, setHierarchyPaper] = useState<QuestionPaperItem | null>(null);

  // Direct Submission Modal
  const [showDirectSubmitModal, setShowDirectSubmitModal] = useState(false);
  const [subCode, setSubCode] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [examType, setExamType] = useState<
    "End Semester Examination" | "Internal Assessment - I" | "Internal Assessment - II" | "Model Examination"
  >("End Semester Examination");
  const [qpSet, setQpSet] = useState<"Set A" | "Set B">("Set A");
  const [sem, setSem] = useState("Semester VI");
  const [certified, setCertified] = useState(false);

  const loadPapers = () => {
    setPapers(safeLoadQuestionPapers());
  };

  useEffect(() => {
    loadPapers();
    window.addEventListener("kvell_qp_updated", loadPapers);
    window.addEventListener("storage", loadPapers);
    return () => {
      window.removeEventListener("kvell_qp_updated", loadPapers);
      window.removeEventListener("storage", loadPapers);
    };
  }, []);

  const savePapers = (updated: QuestionPaperItem[]) => {
    setPapers(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("kvell_qp_updated"));
    } catch {}
  };

  // Filter papers for this department
  const deptKey = department.toLowerCase().includes("computer")
    ? "cse"
    : department.toLowerCase().includes("intelligence")
    ? "aids"
    : department.toLowerCase().includes("biomedical")
    ? "bme"
    : department.toLowerCase().includes("communication")
    ? "ece"
    : "cse";

  const deptPapers = useMemo(() => {
    return papers.filter(
      (p) =>
        p.deptKey === deptKey ||
        p.department?.toLowerCase().includes(department.toLowerCase()) ||
        p.hodName?.toLowerCase().includes(hodName.toLowerCase())
    );
  }, [papers, deptKey, department, hodName]);

  // Breakdown categories
  const pendingHodPapers = useMemo(
    () => deptPapers.filter((p) => p.status === "PENDING_HOD_REVIEW"),
    [deptPapers]
  );
  const forwardedToAdPapers = useMemo(
    () =>
      deptPapers.filter(
        (p) =>
          p.status === "PENDING_AD_REVIEW" ||
          p.status === "PENDING_COE_REVIEW" ||
          p.status === "PENDING_CHIEF_COE"
      ),
    [deptPapers]
  );
  const approvedChiefCoePapers = useMemo(
    () => deptPapers.filter((p) => p.status === "CHIEF_COE_APPROVED"),
    [deptPapers]
  );
  const returnedPapers = useMemo(
    () =>
      deptPapers.filter(
        (p) =>
          p.status === "RETURNED_TO_FACULTY" || p.status === "RETURNED_TO_HOD"
      ),
    [deptPapers]
  );

  // Active filtered list
  const displayPapers = useMemo(() => {
    let list = deptPapers;
    if (activeFilterTab === "pending") list = pendingHodPapers;
    else if (activeFilterTab === "forwarded") list = forwardedToAdPapers;
    else if (activeFilterTab === "approved") list = approvedChiefCoePapers;
    else if (activeFilterTab === "returned") list = returnedPapers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.subjectCode?.toLowerCase().includes(q) ||
          p.subjectTitle?.toLowerCase().includes(q) ||
          p.qpCode?.toLowerCase().includes(q) ||
          p.facultyName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [
    deptPapers,
    activeFilterTab,
    pendingHodPapers,
    forwardedToAdPapers,
    approvedChiefCoePapers,
    returnedPapers,
    searchQuery,
  ]);

  const openScrutinyModal = (paper: QuestionPaperItem) => {
    setScrutinyPaper(paper);
    setDacSyllabusChecked(true);
    setDacBloomsChecked(true);
    setDacChoiceParityChecked(true);
    setDacPartCEvaluativeChecked(true);
    setHodEndorsementNotes(
      `Certified by HOD (${hodName}). Question paper verified by Departmental Academic Committee (DAC) against Autonomous Regulation 2021 curriculum. Recommended for Associate Dean approval.`
    );
    setShowReturnPrompt(false);
    setReturnRemarksInput("");
  };

  // Stage 2 ➔ Stage 3: HOD approves and forwards to Associate Dean
  const handleApproveAndForwardToAd = () => {
    if (!scrutinyPaper) return;
    if (
      !dacSyllabusChecked ||
      !dacBloomsChecked ||
      !dacChoiceParityChecked ||
      !dacPartCEvaluativeChecked
    ) {
      alert("Please complete and verify all 4 DAC scrutiny checklist requirements.");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const updatedList = papers.map((p) => {
      if (p.id !== scrutinyPaper.id) return p;

      const updatedTrail: StageSignature[] = (p.hierarchyTrail || []).map((sig) => {
        if (sig.stageNumber === 2) {
          return {
            ...sig,
            status: "COMPLETED",
            timestamp: `${dateStr}, ${timeStr}`,
            sealOrReference: `HOD/${deptKey.toUpperCase()}/DAC-2026/${Date.now().toString().slice(-3)}`,
            remarks: hodEndorsementNotes,
          };
        }
        if (sig.stageNumber === 3) {
          return {
            ...sig,
            status: "CURRENT",
            timestamp: "Under Academic Scrutiny",
            remarks: "Endorsed by HOD following DAC scrutiny. Awaiting Associate Dean academic clearance.",
          };
        }
        return sig;
      });

      return {
        ...p,
        status: "PENDING_AD_REVIEW" as const,
        currentStageNumber: 3 as const,
        currentStageRole: "AD" as const,
        forwardedToCoe: false,
        hierarchyTrail: updatedTrail,
        hodDeclaration: {
          certifiedByHod: true,
          moderationDoneByDept: true,
          date: dateStr,
          hodNote: hodEndorsementNotes,
        },
      };
    });

    savePapers(updatedList);
    setScrutinyPaper(null);
    setSuccessToast(
      `Question Paper ${scrutinyPaper.subjectCode} approved by HOD and forwarded to Associate Dean (Stage 2 ➔ 3)!`
    );
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // Stage 2 ➔ Stage 1: HOD returns paper to Faculty for revision
  const handleReturnToFaculty = () => {
    if (!scrutinyPaper) return;
    if (!returnRemarksInput.trim()) {
      alert("Please enter the specific revision notes or recommendations for the faculty member.");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const updatedList = papers.map((p) => {
      if (p.id !== scrutinyPaper.id) return p;

      const updatedTrail: StageSignature[] = (p.hierarchyTrail || []).map((sig) => {
        if (sig.stageNumber === 2) {
          return {
            ...sig,
            status: "RETURNED",
            timestamp: `${dateStr}, ${timeStr}`,
            remarks: returnRemarksInput,
          };
        }
        if (sig.stageNumber === 1) {
          return {
            ...sig,
            status: "CURRENT",
            remarks: "Returned by HOD for revision.",
          };
        }
        return sig;
      });

      return {
        ...p,
        status: "RETURNED_TO_FACULTY" as const,
        currentStageNumber: 1 as const,
        currentStageRole: "Faculty" as const,
        adRemarks: `Returned by HOD (${hodName}): ${returnRemarksInput}`,
        hierarchyTrail: updatedTrail,
      };
    });

    savePapers(updatedList);
    setScrutinyPaper(null);
    setShowReturnPrompt(false);
    setReturnRemarksInput("");
    setSuccessToast(
      `Question Paper ${scrutinyPaper.subjectCode} returned to Faculty with revision recommendations.`
    );
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // Direct paper submission by HOD to AD
  const handleSubmitNewPaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certified) {
      alert("Please certify that the paper has been verified by the Departmental Academic Committee (DAC).");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const newPaper: QuestionPaperItem = {
      id: `QP-${Date.now()}-${deptKey.toUpperCase()}-${subCode.toUpperCase()}`,
      qpCode: `KVELL/ESE/2026/${subCode.toUpperCase()}-${qpSet.includes("A") ? "A" : "B"}`,
      subjectCode: subCode.toUpperCase(),
      subjectTitle: subTitle,
      department: department,
      deptKey: deptKey,
      facultyName: `${hodName} (HOD & Course Chair)`,
      hodName: hodName,
      adName: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
      coeName: "Dr. N. Balasubramanian (Controller of Examinations)",
      chiefCoeName: "Dr. Sathish (Chief COE & Super Administrator)",
      currentStageNumber: 3,
      currentStageRole: "AD",
      semester: sem,
      academicYear: "2025 - 2026",
      regulation: "Regulation 2021 (Autonomous)",
      examType: examType,
      set: qpSet,
      dateSubmitted: dateStr,
      timeSubmitted: timeStr,
      status: "PENDING_AD_REVIEW",
      forwardedToCoe: false,
      maxMarks: 100,
      durationHours: 3,
      syllabusCoverage: "100% (Units I to V)",
      bloomsDistribution: {
        rememberUnderstand: 30,
        applyAnalyze: 50,
        evaluateCreate: 20,
      },
      courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
      hierarchyTrail: [
        {
          stageNumber: 1,
          stageRole: "Faculty",
          officerTitle: "Subject Instructor / HOD",
          officerName: hodName,
          status: "COMPLETED",
          timestamp: `${dateStr}, ${timeStr}`,
          sealOrReference: `HOD-DEPT-${subCode.toUpperCase()}`,
          remarks: "Authored and DAC scrutinized by Department Head.",
        },
        {
          stageNumber: 2,
          stageRole: "HOD",
          officerTitle: "Head of Department",
          officerName: hodName,
          status: "COMPLETED",
          timestamp: `${dateStr}, ${timeStr}`,
          sealOrReference: `HOD/${deptKey.toUpperCase()}/DAC-2026/099`,
          remarks: `Certified by HOD (${hodName}). Question paper verified by DAC against Autonomous Regulation 2021 curriculum.`,
        },
        {
          stageNumber: 3,
          stageRole: "AD",
          officerTitle: "Associate Dean (Academics)",
          officerName: "Dr. K. R. Ramanathan",
          status: "CURRENT",
          timestamp: "Under Academic Scrutiny",
          remarks: "Awaiting Associate Dean academic clearance.",
        },
        {
          stageNumber: 4,
          stageRole: "COE",
          officerTitle: "Controller of Examinations",
          officerName: "Dr. N. Balasubramanian",
          status: "PENDING",
        },
        {
          stageNumber: 5,
          stageRole: "Chief COE",
          officerTitle: "Chief University Controller",
          officerName: "Dr. Sathish",
          status: "PENDING",
        },
      ],
      parts: {
        partA: {
          instructions: "Answer ALL Questions. (10 × 2 = 20 Marks)",
          questions: [
            { qNo: 1, text: `Define basic foundational axioms of ${subTitle}.`, co: "CO1", bloom: "K1 (Remember)", marks: 2 },
            { qNo: 2, text: "Explain the standard architectural parameters and scaling limits.", co: "CO1", bloom: "K2 (Understand)", marks: 2 },
            { qNo: 3, text: "Calculate the processing efficiency for given constraints.", co: "CO2", bloom: "K3 (Apply)", marks: 2 },
            { qNo: 4, text: "List the core advantages of modular design paradigms.", co: "CO2", bloom: "K1 (Remember)", marks: 2 },
            { qNo: 5, text: "Formulate the transformation matrix.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
            { qNo: 6, text: "Explain the stability criteria and safety envelopes.", co: "CO3", bloom: "K2 (Understand)", marks: 2 },
            { qNo: 7, text: "Differentiate synchronous from asynchronous implementations.", co: "CO4", bloom: "K2 (Understand)", marks: 2 },
            { qNo: 8, text: "Define fault tolerance benchmarks in mission-critical deployments.", co: "CO4", bloom: "K1 (Remember)", marks: 2 },
            { qNo: 9, text: "State the formal verification and runtime security guarantees.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
            { qNo: 10, text: "Describe energy efficiency optimization strategies in embedded nodes.", co: "CO5", bloom: "K2 (Understand)", marks: 2 },
          ],
        },
        partB: {
          instructions: "Answer ALL Questions, choosing either (a) or (b). (5 × 13 = 65 Marks)",
          questions: [
            {
              qNo: 11,
              optionA: { text: `Derive mathematical formulations for core ${subTitle} algorithms.`, co: "CO1", bloom: "K4 (Analyze)", marks: 13 },
              optionB: { text: "Analyze computational complexity and space efficiency tradeoffs.", co: "CO1", bloom: "K4 (Analyze)", marks: 13 },
            },
            {
              qNo: 12,
              optionA: { text: "Design an optimized processing pipeline with detailed architectural block diagram.", co: "CO2", bloom: "K4 (Analyze)", marks: 13 },
              optionB: { text: "Compare industry standard benchmark implementations with experimental metrics.", co: "CO2", bloom: "K3 (Apply)", marks: 13 },
            },
            {
              qNo: 13,
              optionA: { text: "Formulate recovery protocols under cascading network failure conditions.", co: "CO3", bloom: "K4 (Analyze)", marks: 13 },
              optionB: { text: "Detail error mitigation rubrics and validation methodologies.", co: "CO3", bloom: "K3 (Apply)", marks: 13 },
            },
            {
              qNo: 14,
              optionA: { text: "Construct an end-to-end telemetry architecture for distributed nodes.", co: "CO4", bloom: "K4 (Analyze)", marks: 13 },
              optionB: { text: "Analyze resource allocation algorithms under bursty workloads.", co: "CO4", bloom: "K3 (Apply)", marks: 13 },
            },
            {
              qNo: 15,
              optionA: { text: "Examine security threat surfaces and formal verification guarantees.", co: "CO5", bloom: "K4 (Analyze)", marks: 13 },
              optionB: { text: "Detail deployment architectures on edge-cloud hybrid topologies.", co: "CO5", bloom: "K3 (Apply)", marks: 13 },
            },
          ],
        },
        partC: {
          instructions: "Answer the Comprehensive / Evaluative Question. (1 × 15 = 15 Marks)",
          questions: [
            {
              qNo: 16,
              text: `You are designated as Chief Systems Architect for KVELL Innovation Labs. Design a production-grade ${subTitle} platform capable of serving 500,000 real-time concurrent requests while satisfying strict latency and security constraints. (a) Specify the full system architecture. (b) Formulate the performance evaluation criteria. (c) Address disaster recovery and automated failover.`,
              co: "CO5",
              bloom: "K6 (Create)",
              marks: 15,
              rubricHint: "Comprehensive system architecture design (6M), latency evaluation (5M), failover strategy (4M).",
            },
          ],
        },
      },
      hodDeclaration: {
        certifiedByHod: true,
        moderationDoneByDept: true,
        date: dateStr,
        hodNote: `Certified by HOD (${hodName}). Question paper verified by DAC against Autonomous Regulation 2021 curriculum.`,
      },
    };

    savePapers([newPaper, ...papers]);
    setShowDirectSubmitModal(false);
    setSubCode("");
    setSubTitle("");
    setCertified(false);
    setSuccessToast(`Question Paper ${newPaper.subjectCode} submitted to Associate Dean for Academic Review!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="bg-white rounded-[2.25rem] p-6 sm:p-9 shadow-sm border border-slate-200 space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="bg-[#FFF4D6] text-[#8C2F00] text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full inline-block border border-[#F5D8B4]">
            📋 STAGE 2: HOD DAC SCRUTINY &amp; FORWARDING
          </span>
          <h2 className="text-2xl font-black text-[#0B192C] mt-2 tracking-tight">
            Department Question Paper DAC Scrutiny &amp; Moderation
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Scrutinize question papers submitted by {department} faculty. After DAC certification, forward papers to the Associate Dean (Dr. Rajesh Kumar). Only after Associate Dean clearance will papers advance to the Controller of Examinations (COE).
          </p>
        </div>

        <button
          onClick={() => setShowDirectSubmitModal(true)}
          className="px-5 py-3 rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition shadow flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} className="text-[#D4A72C]" />
          <span>Submit Department Paper to AD</span>
        </button>
      </div>

      {/* Action Required Banner if Faculty Papers Pending */}
      {pendingHodPapers.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-amber-500/15 via-amber-50 to-white border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
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
                  {pendingHodPapers.length} Question Paper(s) Awaiting Scrutiny
                </span>
              </div>
              <h3 className="text-sm font-black text-[#0B192C] mt-0.5">
                Faculty Submissions Awaiting HOD DAC Scrutiny
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Review syllabus coverage and Bloom&apos;s distribution submitted by department faculty before endorsing to Associate Dean.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveFilterTab("pending")}
            className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-sm"
          >
            <span>Inspect Pending Papers</span>
            <ChevronRight size={14} className="text-[#D4A72C]" />
          </button>
        </div>
      )}

      {/* Tabs / Filter Nav */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveFilterTab("pending")}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilterTab === "pending"
                ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Clock size={14} />
            <span>Pending HOD Scrutiny ({pendingHodPapers.length})</span>
          </button>
          <button
            onClick={() => setActiveFilterTab("forwarded")}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilterTab === "forwarded"
                ? "bg-[#0B192C] text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Send size={14} className={activeFilterTab === "forwarded" ? "text-[#D4A72C]" : "text-slate-500"} />
            <span>Forwarded to AD ({forwardedToAdPapers.length})</span>
          </button>
          <button
            onClick={() => setActiveFilterTab("approved")}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilterTab === "approved"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Chief COE Sealed ({approvedChiefCoePapers.length})</span>
          </button>
          <button
            onClick={() => setActiveFilterTab("returned")}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilterTab === "returned"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RotateCcw size={14} />
            <span>Returned ({returnedPapers.length})</span>
          </button>
          <button
            onClick={() => setActiveFilterTab("all")}
            className={`px-3.5 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
              activeFilterTab === "all"
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All Papers ({deptPapers.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department papers..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B192C]"
          />
        </div>
      </div>

      {/* Papers List */}
      <div className="space-y-4">
        {displayPapers.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-[#FAF8F5] rounded-3xl border border-dashed border-slate-200 space-y-1">
            <FileText size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No question papers matching this tab</p>
            <p className="text-[11px] text-slate-400">
              Department faculty submissions and forwarded papers will appear here.
            </p>
          </div>
        ) : (
          displayPapers.map((paper) => {
            const isPendingHod = paper.status === "PENDING_HOD_REVIEW";
            const isPendingAd = paper.status === "PENDING_AD_REVIEW";
            const isPendingCoe = paper.status === "PENDING_COE_REVIEW";
            const isPendingChiefCoe = paper.status === "PENDING_CHIEF_COE";
            const isApproved = paper.status === "CHIEF_COE_APPROVED";
            const isReturned = paper.status === "RETURNED_TO_FACULTY" || paper.status === "RETURNED_TO_HOD";

            return (
              <div
                key={paper.id}
                className={`p-6 rounded-3xl border transition shadow-xs hover:shadow-md ${
                  isPendingHod
                    ? "bg-amber-50/20 border-amber-300"
                    : isApproved
                    ? "bg-emerald-50/20 border-emerald-200"
                    : isReturned
                    ? "bg-rose-50/20 border-rose-200"
                    : "bg-white border-slate-200"
                } flex flex-col md:flex-row md:items-center justify-between gap-5`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-xs bg-[#0B192C] text-[#D4A72C] px-2.5 py-1 rounded">
                      {paper.subjectCode}
                    </span>
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      {paper.qpCode} ({paper.set})
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {paper.examType}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {paper.semester}
                    </span>
                    {paper.pdfAttachment && (
                      <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                        <FileText size={11} className="text-blue-700" />
                        <span>PDF Attached</span>
                      </span>
                    )}

                    {/* Status Badge */}
                    {isPendingHod && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs">
                        <Clock size={11} className="animate-spin" /> Awaiting HOD DAC Scrutiny
                      </span>
                    )}
                    {isPendingAd && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                        <UserCheck size={11} /> Forwarded to Associate Dean
                      </span>
                    )}
                    {isPendingCoe && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                        <Building2 size={11} /> COE Logistics Room
                      </span>
                    )}
                    {isPendingChiefCoe && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                        <Award size={11} /> Awaiting Chief COE Release
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                        <ShieldCheck size={11} /> Chief COE Master Seal Authorized
                      </span>
                    )}
                    {isReturned && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1">
                        <RotateCcw size={11} /> Returned for Revision
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-lg text-[#0B192C]">
                    {paper.subjectTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 text-xs text-slate-500">
                    <span>
                      Faculty Author: <strong className="text-slate-800">{paper.facultyName}</strong>
                    </span>
                    <span>•</span>
                    <span>Submitted: {paper.dateSubmitted} ({paper.timeSubmitted})</span>
                    <span>•</span>
                    <span>Max: {paper.maxMarks} Marks (3 Hours)</span>
                    {paper.chiefCoeSealNo && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-black text-emerald-800">
                          Chief COE Seal: {paper.chiefCoeSealNo}
                        </span>
                      </>
                    )}
                  </div>

                  {/* 5-Stage Stepper Preview */}
                  <div className="pt-2">
                    <div className="flex items-center gap-1 text-[10px]">
                      {["Faculty Author", "HOD DAC", "Associate Dean", "COE Office", "Chief COE"].map((step, idx) => {
                        const stepNum = idx + 1;
                        const sig = paper.hierarchyTrail?.[idx];
                        const isDone = sig?.status === "COMPLETED";
                        const isCurrent = sig?.status === "CURRENT";
                        const isRet = sig?.status === "RETURNED";

                        return (
                          <React.Fragment key={step}>
                            <div
                              className={`px-2 py-0.5 rounded font-black flex items-center gap-1 ${
                                isDone
                                  ? "bg-emerald-100 text-emerald-900"
                                  : isCurrent
                                  ? "bg-amber-200 text-amber-950 ring-1 ring-amber-400"
                                  : isRet
                                  ? "bg-rose-100 text-rose-900"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <span>{stepNum}.</span>
                              <span>{step}</span>
                              {isDone && <Check size={10} />}
                            </div>
                            {idx < 4 && <span className="text-slate-300">➔</span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Remarks Display */}
                  {paper.adRemarks && (
                    <div
                      className={`text-xs p-2.5 rounded-xl border mt-2 ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                          : isReturned
                          ? "bg-rose-50 text-rose-900 border-rose-200"
                          : "bg-amber-50 text-amber-900 border-amber-200"
                      }`}
                    >
                      <strong className="block text-[10px] uppercase tracking-wider font-extrabold mb-0.5">
                        Scrutiny / Audit Note:
                      </strong>
                      <p className="italic">&ldquo;{paper.adRemarks}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 min-w-[200px]">
                  {isPendingHod ? (
                    <>
                      <button
                        onClick={() => openScrutinyModal(paper)}
                        className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck size={15} className="text-[#D4A72C]" />
                        <span>Conduct DAC Scrutiny</span>
                      </button>
                      <button
                        onClick={() => {
                          setScrutinyPaper(paper);
                          setShowReturnPrompt(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>Return to Faculty</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-right">
                      {isPendingAd && (
                        <div className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-center">
                          In Academic Review with AD
                        </div>
                      )}
                      {isApproved && (
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-center">
                          Authorized by Dr. Sathish (COE)
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {paper.pdfAttachment && (
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: paper.pdfAttachment!.fileName,
                            fileData: paper.pdfAttachment!.fileData,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <FileText size={13} className="text-blue-700" />
                        <span>View PDF</span>
                      </button>
                    )}
                    <button
                      onClick={() => setPreviewPaper(paper)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>
                    <button
                      onClick={() => setHierarchyPaper(paper)}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Layers size={13} />
                      <span>Trail</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DAC SCRUTINY & FORWARDING MODAL */}
      {scrutinyPaper && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-[10px] font-black uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                  STAGE 2: DAC SCRUTINY &amp; FORWARDING
                </span>
                <h3 className="font-display font-black text-xl text-[#0B192C] mt-1">
                  Departmental Academic Committee (DAC) Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Course: {scrutinyPaper.subjectCode} — {scrutinyPaper.subjectTitle} • Author: {scrutinyPaper.facultyName}
                </p>
              </div>
              <button
                onClick={() => setScrutinyPaper(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Paper Details Summary */}
            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E5E1D8] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">EXAM TYPE</span>
                <span className="font-bold text-[#0B192C]">{scrutinyPaper.examType}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">SET / SEMESTER</span>
                <span className="font-bold text-[#0B192C]">{scrutinyPaper.set} • {scrutinyPaper.semester}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">MAX MARKS / TIME</span>
                <span className="font-bold text-[#0B192C]">{scrutinyPaper.maxMarks}M (3 Hours)</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold text-[10px] uppercase">SYLLABUS COVERED</span>
                <span className="font-bold text-emerald-800">{scrutinyPaper.syllabusCoverage}</span>
              </div>
            </div>

            {/* Uploaded Faculty PDF Document */}
            {scrutinyPaper.pdfAttachment && (
              <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 font-black text-xs flex items-center justify-center font-mono shrink-0 shadow-xs">
                    PDF
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-black text-slate-800 block truncate">
                      {scrutinyPaper.pdfAttachment.fileName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Faculty Upload • {scrutinyPaper.pdfAttachment.fileSize} • {scrutinyPaper.pdfAttachment.uploadedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPdfModalOpen({
                        fileName: scrutinyPaper.pdfAttachment!.fileName,
                        fileData: scrutinyPaper.pdfAttachment!.fileData,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-[#0B192C] text-[#D4A72C] font-bold text-xs hover:bg-[#152744] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye size={13} />
                    <span>Inspect PDF</span>
                  </button>

                  <a
                    href={scrutinyPaper.pdfAttachment.fileData}
                    download={scrutinyPaper.pdfAttachment.fileName}
                    className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-900 font-bold text-xs hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            )}

            {/* DAC Audit Checklist */}
            <div className="space-y-3">
              <span className="font-extrabold text-xs text-[#0B192C] uppercase tracking-wider block">
                DAC Mandatory Compliance Checklist
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dacSyllabusChecked}
                    onChange={(e) => setDacSyllabusChecked(e.target.checked)}
                    className="rounded text-[#0B192C] focus:ring-[#0B192C]"
                  />
                  <span className="font-semibold text-slate-800">
                    Syllabus Coverage: 100% syllabus (Units I to V) verified against Autonomous Regulation 2021 curriculum.
                  </span>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dacBloomsChecked}
                    onChange={(e) => setDacBloomsChecked(e.target.checked)}
                    className="rounded text-[#0B192C] focus:ring-[#0B192C]"
                  />
                  <span className="font-semibold text-slate-800">
                    Bloom&apos;s Taxonomy Distribution: Balanced distribution verified (K1/K2 30%, K3/K4 50%, K5/K6 20%).
                  </span>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dacChoiceParityChecked}
                    onChange={(e) => setDacChoiceParityChecked(e.target.checked)}
                    className="rounded text-[#0B192C] focus:ring-[#0B192C]"
                  />
                  <span className="font-semibold text-slate-800">
                    Internal Choice Parity: Questions in Part B (Option A vs Option B) maintain equal cognitive difficulty.
                  </span>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dacPartCEvaluativeChecked}
                    onChange={(e) => setDacPartCEvaluativeChecked(e.target.checked)}
                    className="rounded text-[#0B192C] focus:ring-[#0B192C]"
                  />
                  <span className="font-semibold text-slate-800">
                    Part C Evaluative Problem: Comprehensive question tests higher-order evaluative and design rubrics.
                  </span>
                </label>
              </div>
            </div>

            {/* HOD Endorsement Remarks */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                HOD DAC Endorsement Notes (Forwarded to Associate Dean)
              </label>
              <textarea
                rows={3}
                value={hodEndorsementNotes}
                onChange={(e) => setHodEndorsementNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0B192C] text-xs font-medium"
              />
            </div>

            {/* Return Prompt Drawer */}
            {showReturnPrompt && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 animate-in fade-in">
                <span className="font-black text-xs text-rose-950 block">
                  Specify Return Recommendations for Faculty ({scrutinyPaper.facultyName}):
                </span>
                <textarea
                  rows={2}
                  value={returnRemarksInput}
                  onChange={(e) => setReturnRemarksInput(e.target.value)}
                  placeholder="e.g. Please revise Part C Question 16 to evaluate state optimization rather than descriptive theory."
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 focus:outline-none text-xs bg-white"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowReturnPrompt(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white cursor-pointer"
                  >
                    Cancel Return
                  </button>
                  <button
                    onClick={handleReturnToFaculty}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Confirm Return to Faculty [Stage 2 ➔ 1]
                  </button>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReturnPrompt(!showReturnPrompt)}
                className="px-4 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Return to Faculty for Revision</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScrutinyPaper(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleApproveAndForwardToAd}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send size={15} className="text-[#D4A72C]" />
                  <span>Approve &amp; Forward to Associate Dean [Stage 2 ➔ 3]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT SUBMIT MODAL (HOD drafting paper to AD) */}
      {showDirectSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-black text-lg text-[#0B192C]">
                  Submit Department Paper to Associate Dean
                </h3>
                <p className="text-xs text-slate-500">
                  {department} • HOD {hodName}
                </p>
              </div>
              <button
                onClick={() => setShowDirectSubmitModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPaper} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  required
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS603"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Subject Title
                </label>
                <input
                  type="text"
                  required
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  placeholder="e.g. Cloud Computing &amp; DevOps Architecture"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none"
                  >
                    <option>End Semester Examination</option>
                    <option>Internal Assessment - I</option>
                    <option>Internal Assessment - II</option>
                    <option>Model Examination</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Set
                  </label>
                  <select
                    value={qpSet}
                    onChange={(e) => setQpSet(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none"
                  >
                    <option>Set A</option>
                    <option>Set B</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Semester
                </label>
                <select
                  value={sem}
                  onChange={(e) => setSem(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none"
                >
                  <option>Semester VI</option>
                  <option>Semester IV</option>
                  <option>Semester V</option>
                  <option>Semester VII</option>
                  <option>Semester VIII</option>
                </select>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer text-amber-950">
                <input
                  type="checkbox"
                  checked={certified}
                  onChange={(e) => setCertified(e.target.checked)}
                  className="mt-0.5 rounded text-[#D4A72C]"
                />
                <span className="text-[11px]">
                  I certify as Head of Department that this question paper has been moderated by DAC and adheres strictly to Autonomous Regulation 2021 guidelines.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDirectSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-black shadow"
                >
                  Submit to Associate Dean
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPER PREVIEW MODAL */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white max-w-3xl w-full rounded-3xl p-6 sm:p-9 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img src="/kvell-logo.png" alt="Seal" className="h-10 w-10 object-contain rounded-full border border-slate-200" />
                <div>
                  <h3 className="font-bold text-base text-[#0B192C]">
                    KVELL UNIVERSITY · AUTONOMOUS QUESTION PAPER
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {previewPaper.qpCode} • {previewPaper.subjectCode} ({previewPaper.set})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setPreviewPaper(null)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="text-center space-y-1 bg-[#F8F5EE] p-4 rounded-2xl border border-[#E5E1D8]">
              <p className="font-black text-sm text-[#0B192C]">{previewPaper.examType.toUpperCase()}</p>
              <p className="font-bold text-xs text-slate-700">{previewPaper.subjectCode} — {previewPaper.subjectTitle}</p>
              <div className="flex justify-center gap-6 text-[11px] text-slate-600 font-semibold pt-1">
                <span>Duration: 3 Hours</span>
                <span>•</span>
                <span>Max Marks: 100</span>
                <span>•</span>
                <span>Regulation: 2021 (Autonomous)</span>
              </div>
            </div>

            {/* Part A */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-xs text-[#0B192C]">PART A — (10 × 2 = 20 Marks)</h4>
                <span className="text-[10px] text-slate-500">Answer ALL Questions</span>
              </div>
              <div className="space-y-2">
                {previewPaper.parts?.partA?.questions?.map((q) => (
                  <div key={q.qNo} className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0">{q.qNo}.</span>
                      <span className="text-slate-800">{q.text}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-slate-500">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{q.co}</span>
                      <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">{q.bloom}</span>
                      <span className="font-bold text-slate-700">2M</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Part B */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-xs text-[#0B192C]">PART B — (5 × 13 = 65 Marks)</h4>
                <span className="text-[10px] text-slate-500">Answer ALL Questions (Either/Or)</span>
              </div>
              <div className="space-y-3">
                {previewPaper.parts?.partB?.questions?.map((q) => (
                  <div key={q.qNo} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-700 mr-2">{q.qNo}. (a)</span>
                        <span className="text-slate-800">{q.optionA?.text}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        <span className="bg-slate-200 px-1.5 py-0.5 rounded">{q.optionA?.co}</span>
                        <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{q.optionA?.bloom}</span>
                        <span className="font-bold">13M</span>
                      </div>
                    </div>
                    <p className="text-center font-bold text-[10px] uppercase tracking-wider text-slate-400">
                      [ OR ]
                    </p>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-700 mr-2">{q.qNo}. (b)</span>
                        <span className="text-slate-800">{q.optionB?.text}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        <span className="bg-slate-200 px-1.5 py-0.5 rounded">{q.optionB?.co}</span>
                        <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{q.optionB?.bloom}</span>
                        <span className="font-bold">13M</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Part C */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-xs text-[#0B192C]">PART C — (1 × 15 = 15 Marks)</h4>
                <span className="text-[10px] text-slate-500">Comprehensive / Evaluative Question</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[#D4A72C]/40 bg-[#FFFDF7] space-y-2">
                {previewPaper.parts?.partC?.questions?.map((q) => (
                  <div key={q.qNo} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-black text-[#0B192C] mr-2">{q.qNo}.</span>
                        <span className="text-slate-800 font-medium">{q.text}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        <span className="bg-slate-200 px-1.5 py-0.5 rounded">{q.co}</span>
                        <span className="bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded">{q.bloom}</span>
                        <span className="font-bold text-[#0B192C]">15M</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIERARCHY MODAL */}
      {hierarchyPaper && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-[10px] font-black uppercase bg-[#D4A72C]/20 text-[#0B192C] px-2.5 py-0.5 rounded">
                  APPROVAL TRAIL &amp; SEALS
                </span>
                <h3 className="font-display font-black text-lg text-[#0B192C] mt-1">
                  {hierarchyPaper.subjectCode} — {hierarchyPaper.subjectTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  Current Status: <strong className="text-slate-800">{hierarchyPaper.status}</strong>
                </p>
              </div>
              <button
                onClick={() => setHierarchyPaper(null)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {(hierarchyPaper.hierarchyTrail || []).map((sig) => {
                const isDone = sig.status === "COMPLETED";
                const isCurrent = sig.status === "CURRENT";
                const isReturned = sig.status === "RETURNED";

                return (
                  <div
                    key={sig.stageNumber}
                    className={`p-4 rounded-2xl border flex items-start gap-4 transition ${
                      isDone
                        ? "bg-emerald-50/30 border-emerald-200"
                        : isCurrent
                        ? "bg-amber-50/50 border-amber-300"
                        : isReturned
                        ? "bg-rose-50/50 border-rose-300"
                        : "bg-slate-50/50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-amber-500 text-white"
                          : isReturned
                          ? "bg-rose-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isDone ? <Check size={16} /> : isReturned ? <RotateCcw size={14} /> : sig.stageNumber}
                    </div>

                    <div className="space-y-1 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-[#0B192C]">
                          Stage {sig.stageNumber}: {sig.officerTitle} ({sig.stageRole})
                        </p>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            isDone
                              ? "bg-emerald-100 text-emerald-900"
                              : isCurrent
                              ? "bg-amber-100 text-amber-900"
                              : isReturned
                              ? "bg-rose-100 text-rose-900"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {sig.status}
                        </span>
                      </div>
                      <p className="text-slate-600 font-semibold">{sig.officerName}</p>
                      {sig.timestamp && (
                        <p className="text-[11px] text-slate-400">Timestamp: {sig.timestamp}</p>
                      )}
                      {sig.sealOrReference && (
                        <p className="text-[11px] font-mono font-bold text-emerald-800">
                          Seal / Ref: {sig.sealOrReference}
                        </p>
                      )}
                      {sig.remarks && (
                        <p className="text-[11px] text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200 mt-1">
                          &ldquo;{sig.remarks}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHierarchyPaper(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF DOCUMENT PREVIEW MODAL */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
          <div className="bg-white max-w-5xl w-full h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="text-[#D4A72C]" size={20} />
                <div>
                  <h3 className="font-bold text-sm text-white">{pdfModalOpen.fileName}</h3>
                  <span className="text-[10px] text-slate-400">Faculty Uploaded Question Paper PDF Document &bull; DAC Scrutiny</span>
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
