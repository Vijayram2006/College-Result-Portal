import React, { useState, useMemo, useEffect } from "react";
import {
  apiErrorMessage,
  cachedQuestionPapers,
  questionPaperAction,
  refreshQuestionPapers,
  resolvePdfUrl,
  usePdfUrl,
  useQuestionPapers,
  type PaperAction,
} from "../../services/questionPapersApi";
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
  ExternalLink,
  Layers,
  HelpCircle,
  Check,
  Lock,
  Crown,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

export type HierarchyRole = "Faculty" | "HOD" | "AD" | "COE" | "Chief COE";
export type HierarchyStageNumber = 1 | 2 | 3 | 4 | 5;

export interface StageSignature {
  stageNumber: HierarchyStageNumber;
  stageRole: HierarchyRole;
  officerTitle: string;
  officerName: string;
  status: "COMPLETED" | "CURRENT" | "PENDING" | "RETURNED";
  timestamp?: string;
  sealOrReference?: string;
  remarks?: string;
}

export interface QuestionPartAItem {
  qNo: number;
  text: string;
  co: string;
  bloom: string;
  marks: number;
}

export interface QuestionPartBItem {
  qNo: number;
  optionA: {
    text: string;
    co: string;
    bloom: string;
    marks: number;
    subdivisions?: string[];
  };
  optionB: {
    text: string;
    co: string;
    bloom: string;
    marks: number;
    subdivisions?: string[];
  };
}

export interface QuestionPartCItem {
  qNo: number;
  text: string;
  co: string;
  bloom: string;
  marks: number;
  rubricHint: string;
}

export interface PdfAttachment {
  fileName: string;
  fileSize: string;
  fileData: string; // base64 data URL
  uploadedAt: string;
}

export interface QuestionPaperItem {
  id: string;
  qpCode: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  deptKey: string;
  facultyName: string; // Stage 1: Faculty Author
  hodName: string; // Stage 2: HOD DAC Scrutiny
  adName: string; // Stage 3: Associate Dean Academic Scrutiny
  coeName: string; // Stage 4: COE Examination Wing
  chiefCoeName: string; // Stage 5: Chief COE / Super Admin
  currentStageNumber: HierarchyStageNumber; // 1 to 5
  currentStageRole: HierarchyRole;
  status:
    | "PENDING_HOD_REVIEW"
    | "PENDING_AD_REVIEW"
    | "PENDING_COE_REVIEW"
    | "PENDING_CHIEF_COE"
    | "CHIEF_COE_APPROVED"
    | "RETURNED_TO_FACULTY"
    | "RETURNED_TO_HOD"
    | "RETURNED_TO_AD"
    | "RETURNED_TO_COE";
  semester: string;
  academicYear: string;
  regulation: string;
  examType: "End Semester Examination" | "Internal Assessment - I" | "Internal Assessment - II" | "Model Examination";
  set: "Set A" | "Set B";
  dateSubmitted: string;
  timeSubmitted: string;
  forwardedToCoe: boolean;
  forwardedDate?: string;
  approvedBy?: string;
  adRemarks?: string;
  maxMarks: number;
  durationHours: number;
  syllabusCoverage: string;
  bloomsDistribution: {
    rememberUnderstand: number; // K1-K2 (%)
    applyAnalyze: number; // K3-K4 (%)
    evaluateCreate: number; // K5-K6 (%)
  };
  courseOutcomesCovered: string[];
  parts: {
    partA: {
      instructions: string;
      questions: QuestionPartAItem[];
    };
    partB: {
      instructions: string;
      questions: QuestionPartBItem[];
    };
    partC: {
      instructions: string;
      questions: QuestionPartCItem[];
    };
  };
  hodDeclaration: {
    certifiedByHod: boolean;
    moderationDoneByDept: boolean;
    date: string;
    hodNote: string;
  };
  coeReferenceNo?: string;
  chiefCoeSealNo?: string;
  hierarchyTrail: StageSignature[];
  pdfAttachment?: PdfAttachment;
}

export const STORAGE_KEY = "kvell_assoc_dean_question_papers";

/** Normalises a question paper from the server. Missing fields stay blank: nothing is invented. */
export function sanitizeQuestionPaper(p: any): QuestionPaperItem {
  if (!p || typeof p !== "object") p = {};

  const id = p.id || `QP-${Date.now()}`;
  const subjectCode = p.subjectCode || "";
  const subjectTitle = p.subjectTitle || "";
  const department = p.department || "";
  const deptKey = p.deptKey || "";
  const facultyName = p.facultyName || "";
  const hodName = p.hodName || "";
  const adName = p.adName || "";
  const coeName = p.coeName || "";
  const chiefCoeName = p.chiefCoeName || "";

  let currentStageNumber: HierarchyStageNumber = 1;
  if (typeof p.currentStageNumber === "number" && p.currentStageNumber >= 1 && p.currentStageNumber <= 5) {
    currentStageNumber = p.currentStageNumber as HierarchyStageNumber;
  } else if (p.status === "PENDING_HOD_REVIEW") {
    currentStageNumber = 2;
  } else if (p.status === "PENDING_AD_REVIEW") {
    currentStageNumber = 3;
  } else if (p.status === "PENDING_COE_REVIEW") {
    currentStageNumber = 4;
  } else if (p.status === "CHIEF_COE_APPROVED" || p.status === "PENDING_CHIEF_COE") {
    currentStageNumber = 5;
  }

  const currentStageRole: HierarchyRole =
    p.currentStageRole ||
    (currentStageNumber === 1
      ? "Faculty"
      : currentStageNumber === 2
      ? "HOD"
      : currentStageNumber === 3
      ? "AD"
      : currentStageNumber === 4
      ? "COE"
      : "Chief COE");

  const status = p.status || "DRAFT";
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const bloomsDistribution = {
    rememberUnderstand: num(p.bloomsDistribution?.rememberUnderstand),
    applyAnalyze: num(p.bloomsDistribution?.applyAnalyze),
    evaluateCreate: num(p.bloomsDistribution?.evaluateCreate),
  };

  // Without a recorded trail, show only who holds the paper at each stage (no invented dates, seals or remarks)
  const stage = (n: HierarchyStageNumber): StageSignature["status"] =>
    n < currentStageNumber || (n === 5 && status === "CHIEF_COE_APPROVED") ? "COMPLETED" : n === currentStageNumber ? "CURRENT" : "PENDING";
  const defaultTrail: StageSignature[] = [
    { stageNumber: 1, stageRole: "Faculty", officerTitle: "Subject Instructor", officerName: facultyName, status: stage(1), timestamp: p.dateSubmitted || undefined },
    { stageNumber: 2, stageRole: "HOD", officerTitle: "Head of Department", officerName: hodName, status: stage(2) },
    { stageNumber: 3, stageRole: "AD", officerTitle: "Associate Dean (Academics)", officerName: adName, status: stage(3), timestamp: p.forwardedDate || undefined, remarks: p.adRemarks || undefined },
    { stageNumber: 4, stageRole: "COE", officerTitle: "Controller of Examinations", officerName: coeName, status: stage(4), sealOrReference: p.coeReferenceNo },
    { stageNumber: 5, stageRole: "Chief COE", officerTitle: "Chief University Controller", officerName: chiefCoeName, status: stage(5), sealOrReference: p.chiefCoeSealNo },
  ];
  const hierarchyTrail = Array.isArray(p.hierarchyTrail) && p.hierarchyTrail.length > 0 ? p.hierarchyTrail : defaultTrail;

  const part = (x: any) => ({
    instructions: x?.instructions || "",
    questions: Array.isArray(x?.questions) ? x.questions : [],
  });

  return {
    ...p,
    id,
    qpCode: p.qpCode || "",
    subjectCode,
    subjectTitle,
    department,
    deptKey,
    facultyName,
    hodName,
    adName,
    coeName,
    chiefCoeName,
    currentStageNumber,
    currentStageRole,
    status,
    semester: p.semester || "",
    academicYear: p.academicYear || "",
    regulation: p.regulation || "",
    examType: p.examType || "",
    set: p.set || "",
    dateSubmitted: p.dateSubmitted || "",
    timeSubmitted: p.timeSubmitted || "",
    forwardedToCoe: !!p.forwardedToCoe,
    forwardedDate: p.forwardedDate,
    approvedBy: p.approvedBy,
    adRemarks: p.adRemarks || "",
    maxMarks: p.maxMarks || 100,
    durationHours: p.durationHours || 3,
    syllabusCoverage: p.syllabusCoverage || "",
    bloomsDistribution,
    courseOutcomesCovered: Array.isArray(p.courseOutcomesCovered) ? p.courseOutcomesCovered : [],
    parts: { partA: part(p.parts?.partA), partB: part(p.parts?.partB), partC: part(p.parts?.partC) },
    hodDeclaration: p.hodDeclaration || { certifiedByHod: false, moderationDoneByDept: false, date: "", hodNote: "" },
    coeReferenceNo: p.coeReferenceNo,
    chiefCoeSealNo: p.chiefCoeSealNo,
    hierarchyTrail,
    pdfAttachment: p.pdfAttachment?.fileData
      ? {
          fileName: p.pdfAttachment.fileName || `${subjectCode || "question-paper"}.pdf`,
          fileSize: p.pdfAttachment.fileSize || "",
          fileData: p.pdfAttachment.fileData,
          uploadedAt: p.pdfAttachment.uploadedAt || p.dateSubmitted || "",
        }
      : undefined,
  };
}

/** The question papers the signed-in user may see (from the server; see services/questionPapersApi). */
export function safeLoadQuestionPapers(): QuestionPaperItem[] {
  return cachedQuestionPapers();
}

export interface QuestionPaperReviewViewProps {
  onToast?: (msg: string) => void;
}

export const QuestionPaperReviewView: React.FC<QuestionPaperReviewViewProps> = ({ onToast }) => {
  const { papers, loading, error: loadError } = useQuestionPapers();

  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal review state
  const [activePaperModal, setActivePaperModal] = useState<QuestionPaperItem | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"hierarchy" | "specifications" | "partA" | "partB" | "partC" | "officialPreview" | "pdf">("hierarchy");
  const [deanNotesInput, setDeanNotesInput] = useState<string>("");
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [pdfModalOpen, setPdfModalState] = useState<{
    fileName: string;
    fileData: string;
  } | null>(null);
  // Stored PDFs are fetched from the server when opened
  const setPdfModalOpen = (v: { fileName: string; fileData: string } | null) => {
    if (!v) return setPdfModalState(null);
    resolvePdfUrl(v.fileData)
      .then((url) => setPdfModalState({ ...v, fileData: url }))
      .catch((e) => alert(apiErrorMessage(e, "Could not open the PDF.")));
  };

  // Quick Action Confirm Modal
  const [confirmDialog, setConfirmDialog] = useState<{
    action: "forward_coe" | "forward_chief_coe" | "chief_coe_release" | "return_hod" | "return_faculty";
    paper: QuestionPaperItem;
  } | null>(null);

  const activePdfUrl = usePdfUrl(activePaperModal?.pdfAttachment?.fileData);

  // Reload the list from the server
  const handleResetData = () => {
    void refreshQuestionPapers().then(() => onToast?.("Question papers reloaded from the server."));
  };

  // KPI Calculations across stages with defensive checks
  const stats = useMemo(() => {
    const total = papers.length;
    const stage2Hod = papers.filter((p) => p.currentStageNumber === 2).length;
    const stage3Ad = papers.filter((p) => p.currentStageNumber === 3).length;
    const stage4Coe = papers.filter((p) => p.currentStageNumber === 4).length;
    const stage5Chief = papers.filter((p) => p.status === "CHIEF_COE_APPROVED").length;
    const returned = papers.filter((p) => (p.status || "").startsWith("RETURNED_TO")).length;
    return { total, stage2Hod, stage3Ad, stage4Coe, stage5Chief, returned };
  }, [papers]);

  // Filtered List with defensive optional chaining
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      const matchDept = selectedDept === "all" || p.deptKey === selectedDept;
      const matchStage =
        selectedStage === "all" ||
        (selectedStage === "ad" && p.currentStageNumber === 3) ||
        (selectedStage === "coe" && p.currentStageNumber === 4) ||
        (selectedStage === "chief" && p.status === "CHIEF_COE_APPROVED") ||
        (selectedStage === "returned" && (p.status || "").startsWith("RETURNED_TO"));

      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        (p.subjectCode || "").toLowerCase().includes(q) ||
        (p.subjectTitle || "").toLowerCase().includes(q) ||
        (p.department || "").toLowerCase().includes(q) ||
        (p.hodName || "").toLowerCase().includes(q) ||
        (p.facultyName || "").toLowerCase().includes(q) ||
        (p.qpCode || "").toLowerCase().includes(q);

      return matchDept && matchStage && matchQuery;
    });
  }, [papers, selectedDept, selectedStage, searchQuery]);

  // Open review modal
  const handleOpenReview = (paper: QuestionPaperItem) => {
    setActivePaperModal(paper);
    setActiveModalTab("hierarchy");
    setDeanNotesInput(paper.adRemarks || "");
  };

  const runAction = async (
    paperId: string,
    action: PaperAction,
    options: Parameters<typeof questionPaperAction>[2],
    success: (p: QuestionPaperItem) => string
  ) => {
    const paper = papers.find((p) => p.id === paperId);
    if (!paper) return;
    setIsProcessingAction(true);
    try {
      const updated = await questionPaperAction(paper, action, options);
      setConfirmDialog(null);
      if (activePaperModal && activePaperModal.id === paperId) setActivePaperModal(updated);
      onToast?.(success(updated));
    } catch (e) {
      alert(apiErrorMessage(e, "The action could not be completed."));
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Stage 3 -> Stage 4: Associate Dean approves and forwards to the COE
  const handleAdApproveAndForwardToCOE = (paperId: string, customRemarks?: string) => {
    const remarks = customRemarks?.trim() || deanNotesInput.trim() || undefined;
    void runAction(paperId, "APPROVE", { remarks }, (p) =>
      `Question paper ${p.subjectCode} approved by the Associate Dean and forwarded to the COE.`);
  };

  // Stage 4 -> Stage 5: COE forwards to the Chief COE
  const handleCoeForwardToChiefCOE = (paperId: string) => {
    void runAction(paperId, "FORWARD", {}, (p) =>
      `Question paper ${p.subjectCode} forwarded to the Chief COE (reference ${p.coeReferenceNo}).`);
  };

  // Stage 5: Chief COE releases the paper with the seal
  const handleChiefCoeAuthorizeRelease = (paperId: string) => {
    void runAction(paperId, "RELEASE", {}, (p) =>
      `Question paper ${p.subjectCode} released by the Chief COE (seal ${p.chiefCoeSealNo}).`);
  };

  // Return to an earlier stage with the reason
  const handleReturnPaper = (paperId: string, returnTarget: "HOD" | "Faculty", returnRemarks?: string) => {
    const finalRemarks = returnRemarks?.trim() || deanNotesInput.trim();
    if (finalRemarks.length < 5) {
      alert(`Please give the reason (at least 5 characters) for returning the paper to the ${returnTarget}.`);
      return;
    }
    void runAction(paperId, "RETURN", { returnTo: returnTarget, remarks: finalRemarks }, () =>
      `Question paper returned to the ${returnTarget} for revision.`);
  };

  return (
    <div className="space-y-6">
      {(loading || loadError) && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${loadError ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {loadError || "Loading question papers..."}
        </div>
      )}
      {/* Top Banner - 5-Stage Hierarchy Governance */}
      <div className="bg-white text-[#0B192C] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D4A72C]/30 relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider shadow-xs flex items-center gap-1.5">
                <ShieldCheck size={13} />
                5-STAGE EXAMINATION GOVERNANCE HIERARCHY
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-1 rounded tracking-wider">
                PORT 3000 / 3002 PIPELINE
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B192C]">
              Question Paper &amp; Mark Review Permission Hierarchy
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Standardized linear governance:{" "}
              <strong className="text-[#D4A72C]">
                1. Faculty Author ➔ 2. HOD (DAC Scrutiny) ➔ 3. Associate Dean (AD Moderation) ➔ 4. COE (Logistics) ➔ 5. Chief COE (Executive Master Seal)
              </strong>
              . At Stage 3, the Associate Dean conducts rigorous academic moderation before authorizing transmission to the COE.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto shrink-0">
            <button
              onClick={handleResetData}
              title="Reload the question papers from the server"
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-50 text-slate-600 hover:text-[#0B192C] text-xs font-bold transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 5-Step Visual Stepper Ribbon */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] text-xs">
            {/* Step 1: Faculty */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 font-black flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <p className="font-extrabold text-[#0B192C] text-[11px]">Faculty</p>
                <p className="text-[10px] text-slate-600">Course Instructor Draft</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 2: HOD */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <p className="font-extrabold text-[#0B192C] text-[11px]">HOD</p>
                <p className="text-[10px] text-slate-600">DAC Scrutiny Endorsement</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 3: Associate Dean */}
            <div className="flex items-center gap-2.5 bg-[#D4A72C]/15 border border-[#D4A72C]/40 px-3 py-1.5 rounded-xl">
              <span className="h-7 w-7 rounded-full bg-[#D4A72C] text-[#0B192C] font-black flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <p className="font-black text-[#D4A72C] text-[11px]">Associate Dean (AD)</p>
                <p className="text-[10px] text-slate-600 font-semibold">Academic Moderation (Current)</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 4: COE */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 font-black flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <p className="font-extrabold text-[#0B192C] text-[11px]">COE</p>
                <p className="text-[10px] text-slate-600">Logistics &amp; Confidential Sets</p>
              </div>
            </div>

            <ArrowRight size={14} className="text-slate-600 shrink-0" />

            {/* Step 5: Chief COE */}
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black flex items-center justify-center shrink-0">
                <Crown size={13} />
              </span>
              <div>
                <p className="font-extrabold text-[#0B192C] text-[11px]">Chief COE</p>
                <p className="text-[10px] text-slate-600">Dr. Sathish Master Seal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Stage 3 AD Review (Pending here) */}
        <div
          onClick={() => setSelectedStage("ad")}
          className={`bg-white p-5 rounded-3xl border-2 transition cursor-pointer flex flex-col justify-between ${
            stats.stage3Ad > 0
              ? "border-amber-400 bg-amber-50/25 shadow-md"
              : "border-[#E5E1D8] shadow-xs hover:border-[#D4A72C]"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                  STAGE 3: AWAITING AD REVIEW
                </span>
                {stats.stage3Ad > 0 && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>
              <span className="font-display font-black text-3xl text-amber-800 mt-1 block">
                {stats.stage3Ad}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between text-[11px] font-bold text-amber-800">
            <span>Holding at AD Panel</span>
            <span className="flex items-center gap-0.5">
              Filter Stage 3 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 2: Stage 4 COE In-Queue */}
        <div
          onClick={() => setSelectedStage("coe")}
          className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-xs cursor-pointer hover:border-purple-500 transition flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-purple-700 tracking-wider">
                STAGE 4: TRANSMITTED TO COE
              </span>
              <span className="font-display font-black text-3xl text-purple-700 mt-1 block">
                {stats.stage4Coe}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-[11px] font-bold text-purple-700">
            <span>Approved by AD ➔ With COE</span>
            <span className="flex items-center gap-0.5">
              Filter Stage 4 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 3: Stage 5 Chief COE Master Release */}
        <div
          onClick={() => setSelectedStage("chief")}
          className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-xs cursor-pointer hover:border-emerald-500 transition flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider">
                STAGE 5: CHIEF COE MASTER SEAL
              </span>
              <span className="font-display font-black text-3xl text-emerald-700 mt-1 block">
                {stats.stage5Chief}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shrink-0">
              <Crown size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span>Officially Released for Conduction</span>
            <span className="flex items-center gap-0.5">
              Filter Stage 5 <ChevronRight size={12} />
            </span>
          </div>
        </div>

        {/* Card 4: Returned for Revision */}
        <div
          onClick={() => setSelectedStage("returned")}
          className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-xs cursor-pointer hover:border-red-400 transition flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-rose-700 tracking-wider">
                RETURNED FOR REVISION
              </span>
              <span className="font-display font-black text-3xl text-rose-700 mt-1 block">
                {stats.returned}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
              <RotateCcw size={20} />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px] font-bold text-rose-700">
            <span>Returned to HOD or Faculty</span>
            <span className="flex items-center gap-0.5">
              Filter Returned <ChevronRight size={12} />
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-4">
        {/* Department Filter */}
        <div className="min-w-[180px] flex-1">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            DEPARTMENT
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full text-xs font-bold text-[#0B192C] bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4A72C]"
          >
            <option value="all">All Departments (12)</option>
            <option value="cse">Computer Science &amp; Engineering</option>
            <option value="aids">Artificial Intelligence &amp; Data Science</option>
            <option value="bme">Biomedical Engineering</option>
            <option value="ece">Electronics &amp; Communication</option>
            <option value="mech">Mechanical Engineering</option>
          </select>
        </div>

        {/* Stage Filter */}
        <div className="min-w-[180px] flex-1">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            HIERARCHY STAGE
          </label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="w-full text-xs font-bold text-[#0B192C] bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4A72C]"
          >
            <option value="all">All Stages ({papers.length})</option>
            <option value="ad">Stage 3: Associate Dean Review ({stats.stage3Ad})</option>
            <option value="coe">Stage 4: COE Examination Wing ({stats.stage4Coe})</option>
            <option value="chief">Stage 5: Chief COE Master Release ({stats.stage5Chief})</option>
            <option value="returned">Returned for Revision ({stats.returned})</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="min-w-[220px] flex-2">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            SEARCH BY CODE, TITLE, INSTRUCTOR OR HOD
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject code, title, faculty or HOD..."
              className="w-full text-xs font-semibold pl-9 pr-4 py-2 bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl text-[#0B192C] focus:outline-none focus:border-[#D4A72C]"
            />
          </div>
        </div>

        {/* Clear Filters */}
        {(selectedDept !== "all" || selectedStage !== "all" || searchQuery) && (
          <div className="self-end pb-1">
            <button
              onClick={() => {
                setSelectedDept("all");
                setSelectedStage("all");
                setSearchQuery("");
              }}
              className="text-xs font-bold text-gray-500 hover:text-[#0B192C] underline cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main List of Question Papers with 5-Stage Status */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#D4A72C] uppercase tracking-wider mb-1">
              <CheckSquare size={15} />
              EXAMINATION GOVERNANCE QUEUE · 5-TIER CLEARANCE
            </div>
            <h2 className="font-display font-bold text-xl text-[#0B192C]">
              Department Question Papers in Governance Chain
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Click &quot;Review &amp; Moderate&quot; to inspect questions, verify Bloom&apos;s Taxonomy, and sign off custody to the COE.
            </p>
          </div>

          <div className="text-xs font-extrabold text-gray-500 bg-[#F8F5EE] px-3.5 py-2 rounded-xl border border-[#E5E1D8] shrink-0">
            Showing <span className="text-[#0B192C]">{filteredPapers.length}</span> of {papers.length} Papers
          </div>
        </div>

        {filteredPapers.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <HelpCircle size={32} className="mx-auto text-gray-400" />
            <p className="text-sm font-bold text-gray-700">No question papers match your filters</p>
            <p className="text-xs text-gray-400">Try selecting a different department or stage filter above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPapers.map((paper) => {
              const isAtAdStage = paper.currentStageNumber === 3 && paper.status === "PENDING_AD_REVIEW";
              const isAtCoeStage = paper.currentStageNumber === 4 && paper.status === "PENDING_COE_REVIEW";
              const isChiefApproved = paper.status === "CHIEF_COE_APPROVED";
              const isReturned = paper.status.startsWith("RETURNED_TO");

              return (
                <div
                  key={paper.id}
                  className={`p-5 sm:p-6 transition hover:bg-[#FAF8F5] flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                    isAtAdStage ? "bg-amber-50/15" : ""
                  }`}
                >
                  {/* Left: Code, Title, Dept, Hierarchy tracker, and Metadata */}
                  <div className="space-y-3.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-black text-sm bg-[#0B192C] text-[#D4A72C] px-2.5 py-1 rounded-lg">
                        {paper.subjectCode}
                      </span>
                      <span className="text-xs font-extrabold text-gray-500 font-mono">
                        {paper.qpCode} ({paper.set})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                        {paper.examType}
                      </span>

                      {/* Stage Pill */}
                      {isAtAdStage && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <Clock size={11} className="animate-spin text-amber-700" />
                          STAGE 3: AWAITING ASSOCIATE DEAN APPROVAL
                        </span>
                      )}
                      {isAtCoeStage && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-800 border border-purple-300 flex items-center gap-1">
                          <ShieldCheck size={12} className="text-purple-700" />
                          STAGE 4: APPROVED BY AD ➔ WITH COE
                        </span>
                      )}
                      {isChiefApproved && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Crown size={12} className="text-emerald-700" />
                          STAGE 5: MASTER SEAL RELEASED (CHIEF COE)
                        </span>
                      )}
                      {isReturned && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertCircle size={12} className="text-rose-700" />
                          {paper.status === "RETURNED_TO_HOD" ? "RETURNED TO STAGE 2 (HOD)" : "RETURNED TO STAGE 1 (FACULTY)"}
                        </span>
                      )}

                      {/* PDF Document Attached Badge */}
                      {paper.pdfAttachment && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <FileText size={11} className="text-amber-700" />
                          PDF: {paper.pdfAttachment.fileName} ({paper.pdfAttachment.fileSize})
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display font-black text-lg text-[#0B192C]">
                        {paper.subjectTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-600 mt-1">
                        <span className="flex items-center gap-1 font-semibold text-gray-800">
                          <Building2 size={13} className="text-[#D4A72C]" />
                          {paper.department}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User size={13} className="text-blue-600" />
                          Faculty: <strong className="text-gray-800">{paper.facultyName}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <UserCheck size={13} className="text-amber-600" />
                          HOD: <strong className="text-gray-800">{paper.hodName}</strong>
                        </span>
                      </div>
                    </div>

                    {/* 5-Stage Mini Progress Bar */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-gray-200/90 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-gray-500">
                        <span>Governance Custody:</span>
                        <span className="text-[#0B192C] font-mono">
                          Current: {paper.currentStageRole} (Stage {paper.currentStageNumber}/5)
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-extrabold">
                        {paper.hierarchyTrail.map((sig) => {
                          const isDone = sig.status === "COMPLETED";
                          const isCur = sig.status === "CURRENT";
                          const isRet = sig.status === "RETURNED";

                          return (
                            <div
                              key={sig.stageNumber}
                              className={`py-1.5 px-1 rounded-lg border transition ${
                                isDone
                                  ? "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                                  : isCur
                                  ? "bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-300 font-black animate-pulse"
                                  : isRet
                                  ? "bg-rose-100 text-rose-900 border-rose-300"
                                  : "bg-gray-100 text-gray-400 border-gray-200"
                              }`}
                            >
                              <div className="truncate">{sig.stageNumber}. {sig.stageRole}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Meta tags and seals */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                      <span className="bg-[#F8F5EE] px-2.5 py-1 rounded-lg border border-[#E5E1D8] text-gray-700">
                        100 Marks (3 Hrs)
                      </span>
                      <span className="bg-[#F8F5EE] px-2.5 py-1 rounded-lg border border-[#E5E1D8] text-gray-700">
                        Part A (20M) + Part B (65M) + Part C (15M)
                      </span>
                      <span className="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200">
                        Syllabus: {paper.syllabusCoverage}
                      </span>
                      <span className="bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200">
                        Bloom&apos;s: K1-K2 ({paper.bloomsDistribution?.rememberUnderstand ?? 30}%) | K3-K4 ({paper.bloomsDistribution?.applyAnalyze ?? 50}%) | K5-K6 ({paper.bloomsDistribution?.evaluateCreate ?? 20}%)
                      </span>

                      {paper.coeReferenceNo && (
                        <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-300 font-mono font-black text-[10px]">
                          COE: {paper.coeReferenceNo}
                        </span>
                      )}

                      {paper.chiefCoeSealNo && (
                        <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-300 font-mono font-black text-[10px]">
                          MASTER SEAL: {paper.chiefCoeSealNo}
                        </span>
                      )}
                    </div>

                    {/* Scrutiny notes */}
                    {paper.adRemarks && (
                      <div
                        className={`text-xs p-3 rounded-2xl border ${
                          isChiefApproved
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                            : isReturned
                            ? "bg-rose-50/70 border-rose-200 text-rose-900"
                            : "bg-gray-50 border-gray-200 text-gray-700"
                        }`}
                      >
                        <strong className="font-extrabold uppercase text-[10px] block mb-0.5 tracking-wider">
                          Scrutiny / Feedback Record:
                        </strong>
                        <p className="italic">&ldquo;{paper.adRemarks}&rdquo;</p>
                      </div>
                    )}
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-end gap-2.5 shrink-0 pt-2 lg:pt-0">
                    <button
                      onClick={() => handleOpenReview(paper)}
                      className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-extrabold transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} className="text-[#D4A72C]" />
                      <span>Review &amp; Moderate</span>
                    </button>

                    {paper.pdfAttachment && (
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: paper.pdfAttachment!.fileName,
                            fileData: paper.pdfAttachment!.fileData,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="View Uploaded Question Paper PDF"
                      >
                        <FileText size={14} className="text-amber-700" />
                        <span>View PDF</span>
                      </button>
                    )}

                    {/* Stage 3 Action: AD approves and forwards to Stage 4 COE */}
                    {isAtAdStage && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            action: "forward_coe",
                            paper,
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow flex items-center gap-1.5 cursor-pointer"
                        title="Authorize question paper and forward directly to Controller of Examinations (Stage 4)"
                      >
                        <ShieldCheck size={14} />
                        <span>Approve &amp; Forward to COE</span>
                      </button>
                    )}

                    {/* Stage 4 Action: Forward to Chief COE */}
                    {isAtCoeStage && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            action: "forward_chief_coe",
                            paper,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition shadow flex items-center gap-1.5 cursor-pointer"
                      >
                        <Crown size={14} />
                        <span>COE ➔ Chief COE</span>
                      </button>
                    )}

                    {/* Stage 5 Action: Released */}
                    {isChiefApproved && (
                      <div className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <Lock size={12} />
                        <span>Released by Chief COE</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPREHENSIVE QUESTION PAPER REVIEW MODAL */}
      {activePaperModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-5 sm:p-6 border-b border-[#D4A72C]/30 flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs bg-[#D4A72C] text-[#0B192C] px-2.5 py-0.5 rounded">
                    {activePaperModal.subjectCode}
                  </span>
                  <span className="text-xs text-slate-300 font-bold">
                    {activePaperModal.qpCode} ({activePaperModal.set})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/10 text-[#D4A72C] border border-[#D4A72C]/30">
                    {activePaperModal.examType}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                    Stage {activePaperModal.currentStageNumber}: {activePaperModal.currentStageRole}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {activePaperModal.subjectTitle}
                </h2>
                <p className="text-xs text-slate-300">
                  {activePaperModal.department} • Faculty: <strong className="text-white">{activePaperModal.facultyName}</strong> • HOD: <strong className="text-white">{activePaperModal.hodName}</strong>
                </p>
              </div>

              <button
                onClick={() => setActivePaperModal(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="bg-[#FAF8F5] px-5 sm:px-6 py-2.5 border-b border-gray-200 flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveModalTab("hierarchy")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "hierarchy"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                <ShieldCheck size={14} className="text-[#D4A72C]" />
                <span>5-Stage Governance Trail</span>
              </button>

              <button
                onClick={() => setActiveModalTab("specifications")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "specifications"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Specifications &amp; Rubrics
              </button>

              <button
                onClick={() => setActiveModalTab("partA")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "partA"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Part A (10 × 2 = 20M)
              </button>

              <button
                onClick={() => setActiveModalTab("partB")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "partB"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Part B (5 × 13 = 65M)
              </button>

              <button
                onClick={() => setActiveModalTab("partC")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  activeModalTab === "partC"
                    ? "bg-[#0B192C] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                Part C (1 × 15 = 15M)
              </button>

              <button
                onClick={() => setActiveModalTab("officialPreview")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "officialPreview"
                    ? "bg-[#D4A72C] text-[#0B192C] shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                <Printer size={13} />
                <span>Official QP Preview</span>
              </button>

              <button
                onClick={() => setActiveModalTab("pdf")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "pdf"
                    ? "bg-[#D4A72C] text-[#0B192C] shadow-xs"
                    : "text-gray-600 hover:bg-gray-200/60"
                }`}
              >
                <FileText size={13} />
                <span>Uploaded Faculty PDF</span>
                {activePaperModal.pdfAttachment && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Modal Body Scrollable Area */}
            <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
              {/* TAB: 5-Stage Governance Trail */}
              {activeModalTab === "hierarchy" && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-[#0B192C] text-white border border-[#D4A72C]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                        PERMISSION PIPELINE: FACULTY ➔ HOD ➔ AD ➔ COE ➔ CHIEF COE
                      </span>
                      <h3 className="font-display font-extrabold text-base text-white mt-0.5">
                        Chain of Custody &amp; Verification Signatures
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Every stage requires authenticated sign-off before advancing to the next authority.
                      </p>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white font-mono font-bold text-xs">
                      Current: Stage {activePaperModal.currentStageNumber} ({activePaperModal.currentStageRole})
                    </div>
                  </div>

                  {/* Uploaded Faculty PDF Document Quick Access Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="text-amber-800" size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#0B192C]">
                            {activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                          </h4>
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                            Faculty PDF
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {activePaperModal.pdfAttachment?.fileSize || "245 KB"} &bull; Uploaded by {activePaperModal.facultyName} on {activePaperModal.pdfAttachment?.uploadedAt || activePaperModal.dateSubmitted}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`,
                            fileData: activePaperModal.pdfAttachment?.fileData || "",
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye size={13} className="text-[#D4A72C]" />
                        <span>Inspect PDF</span>
                      </button>
                      <button
                        onClick={() => setActiveModalTab("pdf")}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0B192C] border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink size={13} />
                        <span>Open in Tab</span>
                      </button>
                      <a
                        href={activePdfUrl || undefined}
                        download={activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                        className="px-3.5 py-2 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black hover:bg-amber-400 transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>

                  {/* 5-Stage Step Cards */}
                  <div className="space-y-4">
                    {activePaperModal.hierarchyTrail.map((sig) => {
                      const isCompleted = sig.status === "COMPLETED";
                      const isCurrent = sig.status === "CURRENT";
                      const isReturned = sig.status === "RETURNED";

                      return (
                        <div
                          key={sig.stageNumber}
                          className={`p-4 sm:p-5 rounded-2xl border-2 transition ${
                            isCompleted
                              ? "bg-emerald-50/40 border-emerald-300"
                              : isCurrent
                              ? "bg-amber-50/50 border-amber-400 ring-2 ring-amber-200"
                              : isReturned
                              ? "bg-rose-50/50 border-rose-300"
                              : "bg-gray-50 border-gray-200 opacity-60"
                          } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-600 text-white"
                                  : isCurrent
                                  ? "bg-amber-500 text-slate-950 animate-pulse"
                                  : isReturned
                                  ? "bg-rose-600 text-white"
                                  : "bg-gray-300 text-gray-700"
                              }`}
                            >
                              {sig.stageNumber}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-[#0B192C]">
                                  Stage {sig.stageNumber}: {sig.stageRole} ({sig.officerTitle})
                                </h4>
                                {isCompleted && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                    Signed Off
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-200 text-amber-900">
                                    In Review
                                  </span>
                                )}
                                {isReturned && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-200 text-rose-900">
                                    Returned
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-gray-700">
                                Officer: {sig.officerName}
                              </p>
                              {sig.timestamp && (
                                <p className="text-[11px] text-gray-500">
                                  Timestamp: {sig.timestamp}
                                </p>
                              )}
                              {sig.remarks && (
                                <p className="text-xs text-gray-600 italic pt-1">
                                  &ldquo;{sig.remarks}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          {sig.sealOrReference && (
                            <div className="sm:text-right shrink-0">
                              <span className="text-[10px] font-extrabold uppercase text-gray-400 block">
                                Digital Seal / Reference
                              </span>
                              <span className="font-mono font-black text-xs text-[#0B192C] bg-white px-2.5 py-1 rounded border border-gray-200 inline-block mt-0.5">
                                {sig.sealOrReference}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB: Specifications & Bloom's */}
              {activeModalTab === "specifications" && (
                <div className="space-y-6">
                  {/* Spec Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        EXAMINATION &amp; SET
                      </span>
                      <p className="font-bold text-sm text-[#0B192C] mt-1">
                        {activePaperModal.examType} ({activePaperModal.set})
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        Ref: {activePaperModal.qpCode}
                      </p>
                    </div>

                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        TOTAL MARKS &amp; TIME
                      </span>
                      <p className="font-bold text-sm text-[#0B192C] mt-1">
                        {activePaperModal.maxMarks} Marks • {activePaperModal.durationHours} Hours
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Regulation: {activePaperModal.regulation}
                      </p>
                    </div>

                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        SYLLABUS &amp; CO COVERAGE
                      </span>
                      <p className="font-bold text-sm text-[#0B192C] mt-1">
                        {activePaperModal.syllabusCoverage}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-mono font-bold text-blue-700">
                        {activePaperModal.courseOutcomesCovered.join(" • ")}
                      </div>
                    </div>
                  </div>

                  {/* Bloom's Taxonomy Distribution */}
                  <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-gray-200 space-y-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#D4A72C]" />
                      Bloom&apos;s Taxonomy Question Weightage Analysis
                    </h4>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>Remember &amp; Understand (K1 - K2)</span>
                          <span>{activePaperModal.bloomsDistribution?.rememberUnderstand ?? 30}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${activePaperModal.bloomsDistribution?.rememberUnderstand ?? 30}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>Apply &amp; Analyze (K3 - K4)</span>
                          <span>{activePaperModal.bloomsDistribution?.applyAnalyze ?? 50}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all"
                            style={{ width: `${activePaperModal.bloomsDistribution?.applyAnalyze ?? 50}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                          <span>Evaluate &amp; Create (K5 - K6 / Higher Order)</span>
                          <span>{activePaperModal.bloomsDistribution?.evaluateCreate ?? 20}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${activePaperModal.bloomsDistribution?.evaluateCreate ?? 20}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HOD Endorsement Declaration */}
                  <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs uppercase tracking-wider">
                      <CheckCircle2 size={16} className="text-amber-700" />
                      Departmental Academic Committee (DAC) &amp; HOD Endorsement
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed italic">
                      &ldquo;{activePaperModal.hodDeclaration?.hodNote || "Endorsed by Departmental Academic Committee."}&rdquo;
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-gray-500 border-t border-amber-200/60">
                      <span>Submitted by: <strong>{activePaperModal.hodName}</strong></span>
                      <span>Faculty Author: <strong>{activePaperModal.facultyName}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Part A Questions */}
              {activeModalTab === "partA" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{activePaperModal.parts.partA.instructions}</span>
                    <span className="text-[#0B192C]">Total: 20 Marks</span>
                  </div>

                  <div className="space-y-3">
                    {activePaperModal.parts.partA.questions.map((q) => (
                      <div
                        key={q.qNo}
                        className="p-4 rounded-2xl border border-gray-200 hover:border-gray-300 bg-white transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="h-6 w-6 rounded-full bg-[#0B192C] text-[#D4A72C] font-black text-xs flex items-center justify-center shrink-0">
                              {q.qNo}
                            </span>
                            <p className="text-xs font-bold text-[#0B192C] leading-relaxed">
                              {q.text}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 shrink-0">
                            [{q.marks} Marks]
                          </span>
                        </div>

                        <div className="pl-9 flex items-center gap-2 text-[10px] font-mono font-bold">
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                            CO: {q.co}
                          </span>
                          <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                            Bloom: {q.bloom}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Part B Questions */}
              {activeModalTab === "partB" && (
                <div className="space-y-5">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{activePaperModal.parts.partB.instructions}</span>
                    <span className="text-[#0B192C]">Total: 65 Marks</span>
                  </div>

                  <div className="space-y-6">
                    {activePaperModal.parts.partB.questions.map((q) => (
                      <div
                        key={q.qNo}
                        className="p-5 rounded-2xl border-2 border-gray-200 bg-white space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="font-extrabold text-sm text-[#0B192C]">
                            Question {q.qNo} (Either / Or Choice)
                          </span>
                          <span className="font-mono font-bold text-xs bg-gray-100 px-2.5 py-1 rounded text-gray-800">
                            [13 Marks]
                          </span>
                        </div>

                        {/* Option (a) */}
                        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-gray-200/80 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-extrabold text-xs text-blue-700">
                              ({q.qNo}.a)
                            </span>
                            <p className="text-xs font-bold text-gray-900 flex-1 leading-relaxed">
                              {q.optionA.text}
                            </p>
                            <span className="font-mono text-xs text-gray-500 font-bold">
                              [13M]
                            </span>
                          </div>

                          <div className="pl-6 flex items-center gap-2 text-[10px] font-mono font-bold pt-1">
                            <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                              CO: {q.optionA.co}
                            </span>
                            <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                              Bloom: {q.optionA.bloom}
                            </span>
                          </div>
                        </div>

                        {/* OR Divider */}
                        <div className="relative text-center my-1">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                          </div>
                          <span className="relative bg-white px-4 text-xs font-black uppercase text-gray-400">
                            OR
                          </span>
                        </div>

                        {/* Option (b) */}
                        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-gray-200/80 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <span className="font-extrabold text-xs text-emerald-700">
                              ({q.qNo}.b)
                            </span>
                            <p className="text-xs font-bold text-gray-900 flex-1 leading-relaxed">
                              {q.optionB.text}
                            </p>
                            <span className="font-mono text-xs text-gray-500 font-bold">
                              [13M]
                            </span>
                          </div>

                          <div className="pl-6 flex items-center gap-2 text-[10px] font-mono font-bold pt-1">
                            <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                              CO: {q.optionB.co}
                            </span>
                            <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                              Bloom: {q.optionB.bloom}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Part C Questions */}
              {activeModalTab === "partC" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-gray-200 flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{activePaperModal.parts.partC.instructions}</span>
                    <span className="text-[#0B192C]">Total: 15 Marks</span>
                  </div>

                  <div className="space-y-4">
                    {activePaperModal.parts.partC.questions.map((q) => (
                      <div
                        key={q.qNo}
                        className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/20 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <span className="h-7 w-7 rounded-full bg-indigo-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {q.qNo}
                            </span>
                            <div>
                              <span className="font-extrabold text-[11px] text-indigo-900 uppercase tracking-wider block mb-1">
                                Comprehensive / Evaluative Higher-Order Problem
                              </span>
                              <p className="text-xs font-bold text-[#0B192C] leading-relaxed">
                                {q.text}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-black text-xs bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded shrink-0">
                            [15 Marks]
                          </span>
                        </div>

                        <div className="pl-10 text-[11px] bg-white p-3 rounded-xl border border-indigo-100 space-y-1">
                          <strong className="text-indigo-950 block">Scrutiny Rubric Guideline:</strong>
                          <p className="text-gray-600">{q.rubricHint}</p>
                        </div>

                        <div className="pl-10 flex items-center gap-2 text-[10px] font-mono font-bold">
                          <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded">
                            CO: {q.co}
                          </span>
                          <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                            Bloom: {q.bloom}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Official QP Document View */}
              {activeModalTab === "officialPreview" && (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-gray-300 shadow-inner font-serif text-[#0B192C] space-y-6 max-w-4xl mx-auto">
                  <div className="text-center border-b-2 border-gray-800 pb-4 space-y-1">
                    <p className="text-[10px] font-sans font-bold tracking-widest uppercase text-gray-500">
                      Reg. No. [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                    </p>
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                      Karpaga Vinayaga College of Engineering and Technology
                    </h2>
                    <p className="text-xs font-sans font-semibold text-gray-600">
                      (An Autonomous Institution • Affiliated to Anna University, Chennai)
                    </p>
                    <p className="text-xs font-sans font-extrabold uppercase tracking-wider text-[#0B192C] mt-2">
                      B.E. / B.Tech. DEGREE END SEMESTER EXAMINATIONS - MAY / JUNE 2026
                    </p>
                    <p className="text-xs font-sans font-bold">
                      {activePaperModal.semester} • {activePaperModal.department}
                    </p>
                    <p className="text-sm font-sans font-black mt-1">
                      {activePaperModal.subjectCode} - {activePaperModal.subjectTitle.toUpperCase()}
                    </p>
                    <p className="text-[11px] font-sans text-gray-600">
                      ({activePaperModal.regulation})
                    </p>
                    <div className="flex justify-between items-center text-xs font-sans font-extrabold pt-2">
                      <span>Time: 3 Hours</span>
                      <span className="font-mono">QP Code: {activePaperModal.qpCode}</span>
                      <span>Maximum: 100 Marks</span>
                    </div>
                  </div>

                  <div className="text-xs font-sans text-gray-600 border-b border-gray-200 pb-3 space-y-0.5">
                    <p><strong>General Instructions:</strong></p>
                    <p>1. Answer all questions from Part A, either (a) or (b) from each question in Part B, and the comprehensive question in Part C.</p>
                  </div>

                  {/* Document Questions */}
                  <div className="space-y-6 text-xs leading-relaxed">
                    <div>
                      <p className="font-sans font-black uppercase text-center border-b border-gray-300 pb-1 mb-3">
                        PART - A (10 × 2 = 20 Marks)
                      </p>
                      <div className="space-y-2">
                        {activePaperModal.parts.partA.questions.map((q) => (
                          <div key={q.qNo} className="flex justify-between gap-4">
                            <span>{q.qNo}. {q.text}</span>
                            <span className="font-mono text-[11px] font-bold shrink-0">({q.marks})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="font-sans font-black uppercase text-center border-b border-gray-300 pb-1 mb-3">
                        PART - B (5 × 13 = 65 Marks)
                      </p>
                      <div className="space-y-4">
                        {activePaperModal.parts.partB.questions.map((q) => (
                          <div key={q.qNo} className="space-y-2">
                            <div className="flex justify-between gap-4">
                              <span>{q.qNo}. (a) {q.optionA.text}</span>
                              <span className="font-mono text-[11px] font-bold shrink-0">(13)</span>
                            </div>
                            <p className="text-center font-sans font-bold text-gray-400 text-[10px]">-- OR --</p>
                            <div className="flex justify-between gap-4">
                              <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(b) {q.optionB.text}</span>
                              <span className="font-mono text-[11px] font-bold shrink-0">(13)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="font-sans font-black uppercase text-center border-b border-gray-300 pb-1 mb-3">
                        PART - C (1 × 15 = 15 Marks)
                      </p>
                      <div className="space-y-2">
                        {activePaperModal.parts.partC.questions.map((q) => (
                          <div key={q.qNo} className="flex justify-between gap-4">
                            <span>{q.qNo}. {q.text}</span>
                            <span className="font-mono text-[11px] font-bold shrink-0">({q.marks})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Seals */}
                  <div className="mt-8 pt-4 border-t-2 border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">1. Faculty Author:</p>
                      <p className="font-bold text-[#0B192C]">{activePaperModal.facultyName}</p>
                    </div>

                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">2. HOD DAC Endorsement:</p>
                      <p className="font-bold text-[#0B192C]">{activePaperModal.hodName}</p>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-[10px] text-amber-800 uppercase font-bold">3. Associate Dean Scrutiny:</p>
                      <p className="font-black text-amber-950">{activePaperModal.adName}</p>
                      {activePaperModal.coeReferenceNo && (
                        <p className="text-[10px] font-mono text-purple-700 font-bold mt-1">
                          COE: {activePaperModal.coeReferenceNo}
                        </p>
                      )}
                      {activePaperModal.chiefCoeSealNo && (
                        <p className="text-[10px] font-mono text-emerald-800 font-black mt-0.5">
                          MASTER SEAL: {activePaperModal.chiefCoeSealNo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Faculty Uploaded PDF Document */}
              {activeModalTab === "pdf" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="text-amber-800" size={22} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#0B192C]">
                          {activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                        </h4>
                        <p className="text-xs text-slate-500">
                          File Size: {activePaperModal.pdfAttachment?.fileSize || "245 KB"} &bull; Uploaded by {activePaperModal.facultyName} on {activePaperModal.pdfAttachment?.uploadedAt || activePaperModal.dateSubmitted}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`,
                            fileData: activePaperModal.pdfAttachment?.fileData || "",
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Eye size={14} className="text-[#D4A72C]" />
                        <span>Full Screen PDF</span>
                      </button>
                      <a
                        href={activePdfUrl || undefined}
                        download={activePaperModal.pdfAttachment?.fileName || `${activePaperModal.qpCode}.pdf`}
                        className="px-4 py-2 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black hover:bg-amber-400 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 h-[650px]">
                    <iframe
                      src={activePdfUrl || undefined}
                      title={activePaperModal.pdfAttachment?.fileName || "Question Paper"}
                      className="w-full h-full rounded-xl bg-white border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Hierarchy Scrutiny & Forwarding Section */}
              <div className="bg-[#FAF8F5] p-5 rounded-2xl border-2 border-[#E5E1D8] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#D4A72C]" />
                    <h3 className="font-display font-extrabold text-sm text-[#0B192C]">
                      Permission Clearance Actions: Stage {activePaperModal.currentStageNumber} ({activePaperModal.currentStageRole})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                    STAGE 3 ACADEMIC SCRUTINY CELL
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5">
                    Scrutiny Remarks &amp; Clearance Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={deanNotesInput}
                    onChange={(e) => setDeanNotesInput(e.target.value)}
                    placeholder="Enter observation notes, Bloom's level verification, or revision instructions..."
                    className="w-full text-xs font-medium p-3 bg-white border border-[#E5E1D8] rounded-xl text-[#0B192C] focus:outline-none focus:border-[#D4A72C]"
                  />
                </div>

                {/* Bottom Action Buttons along Hierarchy */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-gray-500">
                    Hierarchy Status:{" "}
                    <strong className="text-[#0B192C]">
                      {activePaperModal.status === "PENDING_AD_REVIEW"
                        ? "Stage 3 (Associate Dean Review)"
                        : activePaperModal.status === "PENDING_COE_REVIEW"
                        ? "Stage 4 (Transmitted to COE)"
                        : activePaperModal.status === "PENDING_CHIEF_COE"
                        ? "Stage 5 (With Chief COE Dr. Sathish)"
                        : activePaperModal.status === "CHIEF_COE_APPROVED"
                        ? "Stage 5 Complete (Master University Seal Release)"
                        : "Returned for Revision"}
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Return Options */}
                    {activePaperModal.status !== "CHIEF_COE_APPROVED" && (
                      <button
                        onClick={() => handleReturnPaper(activePaperModal.id, "HOD", deanNotesInput)}
                        disabled={isProcessingAction}
                        className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        <span>Return to HOD (Stage 2)</span>
                      </button>
                    )}

                    {/* Stage 3: AD Approves & Forwards to COE */}
                    {activePaperModal.currentStageNumber === 3 && activePaperModal.status === "PENDING_AD_REVIEW" && (
                      <button
                        onClick={() => handleAdApproveAndForwardToCOE(activePaperModal.id, deanNotesInput)}
                        disabled={isProcessingAction}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck size={16} />
                        <span>Approve &amp; Forward to COE (Stage 4)</span>
                      </button>
                    )}

                    {/* Stage 4: COE Forward to Chief COE Simulation */}
                    {activePaperModal.currentStageNumber === 4 && (
                      <button
                        onClick={() => handleCoeForwardToChiefCOE(activePaperModal.id)}
                        disabled={isProcessingAction}
                        className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Send size={15} />
                        <span>Endorse &amp; Forward to Chief COE (Stage 5)</span>
                      </button>
                    )}

                    {/* Stage 5: Chief COE Final Release Simulation */}
                    {activePaperModal.currentStageNumber === 5 && activePaperModal.status !== "CHIEF_COE_APPROVED" && (
                      <button
                        onClick={() => handleChiefCoeAuthorizeRelease(activePaperModal.id)}
                        disabled={isProcessingAction}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Crown size={16} />
                        <span>Chief COE Master Seal Release</span>
                      </button>
                    )}

                    {/* Print Preview */}
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} className="text-[#D4A72C]" />
                      <span>Print QP</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-[#0B192C]">
                  {confirmDialog.action === "forward_coe"
                    ? "Advance to Stage 4 (COE)?"
                    : confirmDialog.action === "forward_chief_coe"
                    ? "Advance to Stage 5 (Chief COE)?"
                    : "Authorize Master University Release?"}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  {confirmDialog.paper.subjectCode} - {confirmDialog.paper.subjectTitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {confirmDialog.action === "forward_coe"
                ? `You are certifying that the question paper has passed Associate Dean academic scrutiny. An official COE dispatch reference will be generated and custody transferred to Controller of Examinations.`
                : confirmDialog.action === "forward_chief_coe"
                ? `COE verification complete. Paper is being forwarded to Chief COE (Dr. Sathish) for final executive clearance.`
                : `Chief COE Dr. Sathish is applying the final Master University Seal, authorizing official printing and examination conduction.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.action === "forward_coe") {
                    handleAdApproveAndForwardToCOE(confirmDialog.paper.id);
                  } else if (confirmDialog.action === "forward_chief_coe") {
                    handleCoeForwardToChiefCOE(confirmDialog.paper.id);
                  } else {
                    handleChiefCoeAuthorizeRelease(confirmDialog.paper.id);
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow transition cursor-pointer"
              >
                Confirm &amp; Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN PDF VIEWER MODAL */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in">
          <div className="bg-white max-w-5xl w-full h-[90vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="text-[#D4A72C]" size={20} />
                <div>
                  <h3 className="font-bold text-sm text-white">{pdfModalOpen.fileName}</h3>
                  <span className="text-[10px] text-slate-400">Stage 3 &bull; Associate Dean Academic Scrutiny &amp; Verification</span>
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

export default QuestionPaperReviewView;
