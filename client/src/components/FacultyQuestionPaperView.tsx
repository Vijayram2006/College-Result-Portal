import React, { useState, useMemo, useEffect } from "react";
import {
  SEMESTER_OPTIONS,
  academicYearNow,
  apiErrorMessage,
  paperContent,
  pdfInput,
  readPdfFile,
  resolvePdfUrl,
  resubmitQuestionPaper,
  submitQuestionPaper,
  useQuestionPapers,
} from "../services/questionPapersApi";
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
  BadgeAlert,
  FileEdit,
  Building2,
  Calendar,
  UserCheck,
  Award,
  Upload,
  Download,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  QuestionPaperItem,
  INITIAL_QUESTION_PAPERS,
  QuestionPartAItem,
  QuestionPartBItem,
  QuestionPartCItem,
  StageSignature,
  PdfAttachment,
  SAMPLE_QP_PDF_DATA,
  safeLoadQuestionPapers,
} from "./dean/QuestionPaperReviewView";
import {
  safeLoadNotifications,
  DeanExamNotification,
} from "./dean/ExamTimetableNotificationView";


interface FacultyQuestionPaperViewProps {
  onToast?: (msg: string) => void;
  facultyName?: string;
  department?: string;
}

export const FacultyQuestionPaperView: React.FC<FacultyQuestionPaperViewProps> = ({
  onToast,
  facultyName = "Dr. Ananya Menon",
  department = "Computer Science and Engineering",
}) => {
  // The server returns only this faculty member's own papers
  const { papers, loading, error: loadError } = useQuestionPapers();
  const [busy, setBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "all" | "pending_hod" | "in_review" | "approved" | "returned"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [paperToRevise, setPaperToRevise] = useState<QuestionPaperItem | null>(null);
  const [previewPaper, setPreviewPaper] = useState<QuestionPaperItem | null>(null);
  const [hierarchyPaper, setHierarchyPaper] = useState<QuestionPaperItem | null>(null);

  const [examNotifs, setExamNotifs] = useState<DeanExamNotification[]>(() => safeLoadNotifications());
  useEffect(() => {
    const load = () => setExamNotifs(safeLoadNotifications());
    window.addEventListener("kvell_exam_notification_updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("kvell_exam_notification_updated", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  // Filter papers for this Faculty member or department with safe optional chaining
  const facultyPapers = useMemo(() => {
    const fName = (facultyName || "").toLowerCase();
    const dName = (department || "").toLowerCase();
    return papers.filter((p) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          (p.subjectCode || "").toLowerCase().includes(q) ||
          (p.subjectTitle || "").toLowerCase().includes(q) ||
          (p.qpCode || "").toLowerCase().includes(q) ||
          (p.examType || "").toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (activeTab === "pending_hod") return p.status === "PENDING_HOD_REVIEW";
      if (activeTab === "in_review")
        return (
          p.status === "PENDING_AD_REVIEW" ||
          p.status === "PENDING_COE_REVIEW" ||
          p.status === "PENDING_CHIEF_COE"
        );
      if (activeTab === "approved") return p.status === "CHIEF_COE_APPROVED";
      if (activeTab === "returned")
        return (
          p.status === "RETURNED_TO_FACULTY" ||
          p.status === "RETURNED_TO_HOD"
        );

      return true;
    });
  }, [papers, searchQuery, activeTab]);

  // Statistics with safe optional chaining
  const stats = useMemo(() => {
    const list = papers;

    return {
      total: list.length,
      pendingHod: list.filter((p) => p.status === "PENDING_HOD_REVIEW").length,
      inReview: list.filter(
        (p) =>
          p.status === "PENDING_AD_REVIEW" ||
          p.status === "PENDING_COE_REVIEW" ||
          p.status === "PENDING_CHIEF_COE"
      ).length,
      approved: list.filter((p) => p.status === "CHIEF_COE_APPROVED").length,
      returned: list.filter((p) => p.status === "RETURNED_TO_FACULTY").length,
    };
  }, [papers]);

  // Draft form state
  const [formSubjectCode, setFormSubjectCode] = useState("");
  const [formSubjectTitle, setFormSubjectTitle] = useState("");
  const [formExamType, setFormExamType] = useState<
    "End Semester Examination" | "Internal Assessment - I" | "Internal Assessment - II" | "Model Examination"
  >("End Semester Examination");
  const [formSet, setFormSet] = useState<"Set A" | "Set B">("Set A");
  const [formSemester, setFormSemester] = useState("Semester VI");
  const [formCertified, setFormCertified] = useState(false);
  const [formFacultyRemarks, setFormFacultyRemarks] = useState(
    "Drafted strictly in accordance with Autonomous Regulation 2021 curriculum and Bloom's Revised Taxonomy levels."
  );

  // PDF Attachment State
  const [formPdfAttachment, setFormPdfAttachment] = useState<PdfAttachment | null>(null);
  const [pdfUploadLoading, setPdfUploadLoading] = useState(false);
  const [pdfModalOpen, setPdfModalState] = useState<{
    fileName: string;
    fileData: string;
  } | null>(null);
  const setPdfModalOpen = (v: { fileName: string; fileData: string } | null) => {
    if (!v) return setPdfModalState(null);
    resolvePdfUrl(v.fileData)
      .then((url) => setPdfModalState({ ...v, fileData: url }))
      .catch((e) => alert(apiErrorMessage(e, "Could not open the PDF.")));
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setPdfUploadLoading(true);
    readPdfFile(file)
      .then((pdf) => {
        setFormPdfAttachment({
          fileName: pdf.fileName,
          fileSize: pdf.fileSize,
          fileData: pdf.dataUrl,
          uploadedAt: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        onToast?.(`PDF "${pdf.fileName}" attached.`);
      })
      .catch((err: Error) => {
        alert(err.message);
        input.value = "";
      })
      .finally(() => setPdfUploadLoading(false));
  };

  const openDraftModal = (paper?: QuestionPaperItem) => {
    if (paper) {
      setPaperToRevise(paper);
      setFormSubjectCode(paper.subjectCode);
      setFormSubjectTitle(paper.subjectTitle);
      setFormExamType(paper.examType);
      setFormSet(paper.set);
      setFormSemester(paper.semester);
      // The stored PDF stays unless a new one is chosen
      setFormPdfAttachment(paper.pdfAttachment || null);
      setFormFacultyRemarks("");
      setFormCertified(false);
    } else {
      setPaperToRevise(null);
      setFormSubjectCode("");
      setFormSubjectTitle("");
      setFormExamType("End Semester Examination");
      setFormSet("Set A");
      setFormSemester("Semester VI");
      setFormPdfAttachment(null);
      setFormFacultyRemarks("");
      setFormCertified(false);
    }
    setShowDraftModal(true);
  };

  const handleSubmitDraftToHod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!formCertified) {
      alert("Please check the declaration box certifying syllabus and Bloom's taxonomy compliance.");
      return;
    }
    if (!formPdfAttachment) {
      alert("Please attach the question paper PDF.");
      return;
    }
    const input = {
      subjectCode: formSubjectCode.trim(),
      subjectTitle: formSubjectTitle.trim(),
      semester: formSemester,
      academicYear: paperToRevise?.academicYear || academicYearNow(),
      regulation: paperToRevise?.regulation || "Regulation 2021",
      examType: formExamType,
      set: formSet,
      content: paperContent(),
      pdf: pdfInput(formPdfAttachment),
      remarks: formFacultyRemarks.trim().slice(0, 500) || undefined,
    };
    setBusy(true);
    try {
      if (paperToRevise) {
        const saved = await resubmitQuestionPaper(paperToRevise.id, input);
        onToast?.(`Question Paper ${saved.subjectCode} revised and resubmitted to the HOD.`);
      } else {
        const saved = await submitQuestionPaper(input);
        onToast?.(`Question Paper ${saved.subjectCode} submitted to the HOD for scrutiny.`);
      }
      setShowDraftModal(false);
      setPaperToRevise(null);
    } catch (err) {
      alert(apiErrorMessage(err, "The question paper could not be submitted."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {(loading || loadError) && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${loadError ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {loadError || "Loading question papers..."}
        </div>
      )}
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#0B192C] via-[#0F223D] to-[#132A4A] p-6 sm:p-8 text-white border border-[#D4A72C]/30 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <img
              src="/kvell-logo.png"
              alt="KVELL Seal"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white p-1 border-2 border-[#D4A72C] object-contain shadow-lg shrink-0"
            />
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">
                <span>FACULTY PORTAL · STAGE 1 AUTHORING ➔ STAGE 2 HOD SCRUTINY</span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight">
                Question Paper Authoring &amp; Submission
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-semibold max-w-2xl">
                Draft Autonomous Regulation 2021 Question Papers with Bloom&apos;s Revised Taxonomy (K1–K6) and Course Outcome mapping (CO1–CO5). Papers are submitted to HOD for DAC Scrutiny before Associate Dean review.
              </p>
            </div>
          </div>

          <button
            onClick={() => openDraftModal()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] px-5 py-3 text-xs font-black shadow-lg transition cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Draft New Question Paper to HOD</span>
          </button>
        </div>
      </div>

      {/* WORKFLOW STEP 6 & 7: DEAN EXAM NOTIFICATION BANNER */}
      {examNotifs.length > 0 && examNotifs[0].status === "ACTIVE" && (
        <div className="bg-[#0B192C] text-white rounded-2xl border-2 border-[#D4A72C] p-5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center font-bold shrink-0">
                <Send size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                    WORKFLOW STEP 6 · OFFICIAL NOTIFICATION FROM DEAN
                  </span>
                  <span className="font-mono text-xs text-[#D4A72C] font-bold">
                    {examNotifs[0].refNo}
                  </span>
                </div>
                <h3 className="font-display font-extrabold text-sm sm:text-base text-white mt-0.5">
                  {examNotifs[0].title}
                </h3>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-white/60 uppercase tracking-wider block font-bold">
                SUBMISSION DEADLINE
              </span>
              <span className="text-xs font-mono font-black text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                {examNotifs[0].deadline}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10">
            {examNotifs[0].message}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
            <span className="text-[11px] text-[#D4A72C] font-semibold">
              Signatory: {examNotifs[0].senderName} ({examNotifs[0].senderRole})
            </span>
            <button
              onClick={() => openDraftModal()}
              className="px-4 py-2 rounded-xl bg-[#D4A72C] hover:bg-[#e2b435] text-[#0B192C] font-black text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span>Faculty Prepares Question Paper (Step 7)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* WORKFLOW: REJECTION NOTIFICATION CARD (If any paper returned by Dean/HOD) */}
      {papers.some((p) => p.status === "RETURNED_TO_FACULTY") && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                <AlertCircle size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">
                  WORKFLOW: REJECTION NOTIFICATION FROM DEAN / DAC SCRUTINY
                </span>
                <h4 className="font-extrabold text-sm text-rose-950">
                  Question Paper Returned for Revision
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-200 text-rose-900">
              Action Required
            </span>
          </div>

          {papers
            .filter((p) => p.status === "RETURNED_TO_FACULTY")
            .map((p) => (
              <div
                key={p.id}
                className="bg-white p-3.5 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-mono font-black text-rose-900">{p.subjectCode}</span>
                  <span className="font-bold text-gray-800 ml-2">{p.subjectTitle}</span>
                  {(() => {
                    // The reviewer's mandatory feedback (REQ-01) and the paper's revision history
                    const trail = p.hierarchyTrail ?? [];
                    const returned = [...trail].reverse().find((t) => t.status === "RETURNED");
                    return (
                      <>
                        <p className="text-[11px] text-rose-700 mt-1">
                          <span className="font-black">Feedback from {returned?.stageRole ?? "the reviewer"}{returned?.officerName ? ` (${returned.officerName})` : ""}:</span>{" "}
                          <span className="italic">&ldquo;{returned?.remarks || p.adRemarks || "See the reviewer's comments"}&rdquo;</span>
                          {returned?.timestamp && <span className="text-rose-500"> · {returned.timestamp}</span>}
                        </p>
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-[10px] font-black uppercase text-rose-800">Revision history ({trail.filter((t) => t.status !== "PENDING").length} steps)</summary>
                          <ol className="mt-1 space-y-0.5 text-[10.5px] text-slate-700">
                            {trail.filter((t) => t.status !== "PENDING").map((t, i) => (
                              <li key={i}>
                                <span className={`font-black ${t.status === "RETURNED" ? "text-rose-700" : t.status === "CURRENT" ? "text-amber-700" : "text-emerald-700"}`}>
                                  {t.status === "RETURNED" ? "Returned" : t.status === "CURRENT" ? "Waiting" : "Done"}
                                </span>{" "}
                                · Stage {t.stageNumber} {t.stageRole}{t.officerName ? ` (${t.officerName})` : ""}{t.timestamp ? ` · ${t.timestamp}` : ""}
                                {t.remarks ? <span className="italic"> · &ldquo;{t.remarks}&rdquo;</span> : null}
                              </li>
                            ))}
                          </ol>
                        </details>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => openDraftModal(p)}
                  className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Revise &amp; Re-upload (Step 7 &amp; 8)</span>
                </button>
              </div>
            ))}
        </div>
      )}

      {/* 5 Hierarchy Steps Quick Infographic */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Layers size={14} className="text-[#D4A72C]" />
          <span>OFFICIAL UNIVERSITY 5-STAGE QUESTION PAPER APPROVAL HIERARCHY</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[#D4A72C]/10 border border-[#D4A72C]/40">
            <span className="font-mono font-black text-[10px] text-[#0B192C] bg-[#D4A72C] px-1.5 py-0.5 rounded">STAGE 1</span>
            <p className="font-black text-[#0B192C] mt-1.5">Faculty Author</p>
            <p className="text-[10px] text-slate-600">Draft &amp; map Part A/B/C to Bloom&apos;s levels &amp; COs</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="font-mono font-black text-[10px] text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">STAGE 2</span>
            <p className="font-black text-amber-950 mt-1.5">HOD DAC Scrutiny</p>
            <p className="text-[10px] text-slate-600">Audit syllabus 100%, verify DAC checklist &amp; endorse</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <span className="font-mono font-black text-[10px] text-blue-900 bg-blue-200 px-1.5 py-0.5 rounded">STAGE 3</span>
            <p className="font-black text-blue-950 mt-1.5">Associate Dean Review</p>
            <p className="text-[10px] text-slate-600">Academic scrutiny, syllabus balance &amp; COE endorsement</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
            <span className="font-mono font-black text-[10px] text-indigo-900 bg-indigo-200 px-1.5 py-0.5 rounded">STAGE 4</span>
            <p className="font-black text-indigo-950 mt-1.5">COE Examination Wing</p>
            <p className="text-[10px] text-slate-600">Confidential room set allocation &amp; encryption</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="font-mono font-black text-[10px] text-emerald-900 bg-emerald-200 px-1.5 py-0.5 rounded">STAGE 5</span>
            <p className="font-black text-emerald-950 mt-1.5">Chief COE Master Release</p>
            <p className="text-[10px] text-slate-600">Master University Seal &amp; final authorization</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "all"
              ? "bg-[#0B192C] text-white border-[#0B192C] shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
              TOTAL PAPERS
            </span>
            <FileText size={18} className={activeTab === "all" ? "text-[#D4A72C]" : "text-slate-400"} />
          </div>
          <p className="text-2xl font-black mt-1">{stats.total}</p>
          <p className="text-[10px] opacity-75 mt-0.5">All authored papers</p>
        </div>

        <div
          onClick={() => setActiveTab("pending_hod")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "pending_hod"
              ? "bg-amber-500 text-white border-amber-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
              AWAITING HOD
            </span>
            <Clock size={18} className={activeTab === "pending_hod" ? "text-white" : "text-amber-500"} />
          </div>
          <p className="text-2xl font-black mt-1 text-amber-600 group-hover:text-amber-700">
            {stats.pendingHod}
          </p>
          <p className="text-[10px] opacity-75 mt-0.5">Stage 2: DAC Scrutiny</p>
        </div>

        <div
          onClick={() => setActiveTab("in_review")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "in_review"
              ? "bg-blue-600 text-white border-blue-700 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
              AD / COE REVIEW
            </span>
            <UserCheck size={18} className={activeTab === "in_review" ? "text-white" : "text-blue-500"} />
          </div>
          <p className="text-2xl font-black mt-1 text-blue-600">{stats.inReview}</p>
          <p className="text-[10px] opacity-75 mt-0.5">Stages 3 &amp; 4</p>
        </div>

        <div
          onClick={() => setActiveTab("approved")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "approved"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
              CHIEF COE APPROVED
            </span>
            <ShieldCheck size={18} className={activeTab === "approved" ? "text-white" : "text-emerald-500"} />
          </div>
          <p className="text-2xl font-black mt-1 text-emerald-600">{stats.approved}</p>
          <p className="text-[10px] opacity-75 mt-0.5">Master Seal Released</p>
        </div>

        <div
          onClick={() => setActiveTab("returned")}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeTab === "returned"
              ? "bg-rose-600 text-white border-rose-700 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
              REVISION REQUIRED
            </span>
            <RotateCcw size={18} className={activeTab === "returned" ? "text-white" : "text-rose-500"} />
          </div>
          <p className="text-2xl font-black mt-1 text-rose-600">{stats.returned}</p>
          <p className="text-[10px] opacity-75 mt-0.5">Action needed</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject code, course title, QP code, or exam..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B192C]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "all" ? "bg-[#0B192C] text-white" : "hover:bg-slate-100"
            }`}
          >
            All Papers ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab("pending_hod")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "pending_hod" ? "bg-amber-500 text-white" : "hover:bg-slate-100"
            }`}
          >
            Awaiting HOD ({stats.pendingHod})
          </button>
          <button
            onClick={() => setActiveTab("returned")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "returned" ? "bg-rose-500 text-white" : "hover:bg-slate-100"
            }`}
          >
            Returned ({stats.returned})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === "approved" ? "bg-emerald-600 text-white" : "hover:bg-slate-100"
            }`}
          >
            Approved ({stats.approved})
          </button>
        </div>
      </div>

      {/* Question Papers List */}
      <div className="space-y-4">
        {facultyPapers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 space-y-2">
            <FileText size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No question papers matching filter</p>
            <p className="text-xs text-slate-400">
              Click &quot;Draft New Question Paper to HOD&quot; to author a new Autonomous paper.
            </p>
          </div>
        ) : (
          facultyPapers.map((paper) => {
            const isPendingHod = paper.status === "PENDING_HOD_REVIEW";
            const isPendingAd = paper.status === "PENDING_AD_REVIEW";
            const isPendingCoe = paper.status === "PENDING_COE_REVIEW";
            const isPendingChiefCoe = paper.status === "PENDING_CHIEF_COE";
            const isApproved = paper.status === "CHIEF_COE_APPROVED";
            const isReturned = paper.status === "RETURNED_TO_FACULTY";

            return (
              <div
                key={paper.id}
                className={`bg-white rounded-3xl p-6 border transition shadow-xs hover:shadow-md ${
                  isPendingHod
                    ? "border-amber-200"
                    : isReturned
                    ? "border-rose-300 bg-rose-50/15"
                    : isApproved
                    ? "border-emerald-200"
                    : "border-slate-200"
                }`}
              >
                {/* Return Alert Banner */}
                {isReturned && (
                  <div className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <BadgeAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-rose-950">
                          Question Paper Returned by HOD for Revisions
                        </p>
                        <p className="text-rose-800 mt-0.5">
                          {paper.hierarchyTrail?.find((t) => t.status === "RETURNED")?.remarks ||
                            paper.adRemarks ||
                            "Please revise questions in Part C to satisfy higher-order Bloom's taxonomy levels (K5/K6)."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openDraftModal(paper)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-sm"
                    >
                      <FileEdit size={14} />
                      <span>Revise &amp; Resubmit to HOD</span>
                    </button>
                  </div>
                )}

                {/* Card Top Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs bg-[#0B192C] text-[#D4A72C] px-2.5 py-1 rounded-md">
                        {paper.subjectCode}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-600">
                        {paper.qpCode} ({paper.set})
                      </span>
                      <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                        {paper.examType}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {paper.semester} • {paper.academicYear}
                      </span>
                      {paper.pdfAttachment && (
                        <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                          <FileText size={11} className="text-blue-700" />
                          <span>PDF: {paper.pdfAttachment.fileName} ({paper.pdfAttachment.fileSize})</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-[#0B192C]">{paper.subjectTitle}</h3>
                    <p className="text-xs text-slate-500">
                      Author: <strong className="text-slate-800">{paper.facultyName}</strong> • HOD Reviewer:{" "}
                      <strong className="text-slate-800">{paper.hodName}</strong>
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 text-right">
                    {isPendingHod && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-xs">
                        <Clock size={13} className="text-amber-600 animate-spin" />
                        <span>Stage 2: Awaiting HOD DAC Scrutiny</span>
                      </span>
                    )}
                    {isPendingAd && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5 shadow-xs">
                        <UserCheck size={13} className="text-blue-600" />
                        <span>Stage 3: Associate Dean Academic Review</span>
                      </span>
                    )}
                    {isPendingCoe && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1.5 shadow-xs">
                        <Building2 size={13} className="text-indigo-600" />
                        <span>Stage 4: COE Logistics &amp; Set Allocation</span>
                      </span>
                    )}
                    {isPendingChiefCoe && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1.5 shadow-xs">
                        <Award size={13} className="text-purple-600" />
                        <span>Stage 5: Awaiting Chief COE Release</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1.5 shadow-xs">
                        <ShieldCheck size={13} className="text-emerald-700" />
                        <span>Chief COE Master Seal Authorized</span>
                      </span>
                    )}
                    {isReturned && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5 shadow-xs">
                        <RotateCcw size={13} className="text-rose-600" />
                        <span>Returned for Revision</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 5-Stage Stepper */}
                <div className="py-4 border-b border-slate-100">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {(Array.isArray(paper.hierarchyTrail) ? paper.hierarchyTrail : []).map((sig, idx) => {
                      const isDone = sig.status === "COMPLETED";
                      const isCurrent = sig.status === "CURRENT";
                      const isReturnedStep = sig.status === "RETURNED";

                      return (
                        <div key={sig.stageNumber || idx} className="space-y-1">
                          <div className="flex items-center justify-center">
                            <div
                              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition ${
                                isDone
                                  ? "bg-emerald-600 text-white"
                                  : isCurrent
                                  ? "bg-amber-500 text-white ring-4 ring-amber-100"
                                  : isReturnedStep
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isDone ? (
                                <Check size={14} />
                              ) : isReturnedStep ? (
                                <RotateCcw size={12} />
                              ) : (
                                sig.stageNumber
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] font-black text-slate-800 truncate">
                            {sig.stageRole}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {isDone
                              ? "Approved"
                              : isCurrent
                              ? "In Review"
                              : isReturnedStep
                              ? "Returned"
                              : "Pending"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Specs & Actions */}
                <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                    <span>
                      Max Marks: <strong className="text-slate-800">{paper.maxMarks || 100}M</strong> (3 Hours)
                    </span>
                    <span>•</span>
                    <span>
                      Syllabus: <strong className="text-slate-800">{paper.syllabusCoverage || "100% (Units I to V)"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Bloom&apos;s:{" "}
                      <strong className="text-slate-800">
                        K1-K2 ({paper.bloomsDistribution?.rememberUnderstand ?? 30}%) • K3-K4 ({paper.bloomsDistribution?.applyAnalyze ?? 50}%) • K5-K6 ({paper.bloomsDistribution?.evaluateCreate ?? 20}%)
                      </strong>
                    </span>
                    {paper.chiefCoeSealNo && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-bold text-emerald-800">
                          Seal: {paper.chiefCoeSealNo}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {paper.pdfAttachment && (
                      <button
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: paper.pdfAttachment!.fileName,
                            fileData: paper.pdfAttachment!.fileData,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileText size={14} className="text-blue-700" />
                        <span>View PDF</span>
                      </button>
                    )}
                    <button
                      onClick={() => setPreviewPaper(paper)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={14} />
                      <span>Preview Paper</span>
                    </button>
                    <button
                      onClick={() => setHierarchyPaper(paper)}
                      className="px-3.5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers size={14} className="text-[#D4A72C]" />
                      <span>Hierarchy Trail</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DRAFT & SUBMIT MODAL */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="font-mono text-[10px] font-black uppercase bg-[#D4A72C]/20 text-[#0B192C] px-2.5 py-0.5 rounded">
                  STAGE 1 ➔ STAGE 2 SUBMISSION
                </span>
                <h3 className="font-display font-black text-xl text-[#0B192C] mt-1">
                  {paperToRevise ? "Revise & Resubmit Question Paper" : "Draft New Question Paper to HOD"}
                </h3>
                <p className="text-xs text-slate-500">
                  Author: {facultyName} • Submitting to HOD: Prof. Jayapradha (CSE)
                </p>
              </div>
              <button
                onClick={() => setShowDraftModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDraftToHod} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formSubjectCode}
                    onChange={(e) => setFormSubjectCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold focus:outline-none focus:border-[#0B192C]"
                    placeholder="e.g. CS602"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Examination Type
                  </label>
                  <select
                    value={formExamType}
                    onChange={(e) => setFormExamType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0B192C]"
                  >
                    <option>End Semester Examination</option>
                    <option>Internal Assessment - I</option>
                    <option>Internal Assessment - II</option>
                    <option>Model Examination</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Subject Course Title
                </label>
                <input
                  type="text"
                  required
                  value={formSubjectTitle}
                  onChange={(e) => setFormSubjectTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-[#0B192C]"
                  placeholder="e.g. Distributed Systems Architecture"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Set</label>
                  <select
                    value={formSet}
                    onChange={(e) => setFormSet(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0B192C]"
                  >
                    <option>Set A</option>
                    <option>Set B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:border-[#0B192C]"
                  >
                    {SEMESTER_OPTIONS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Marks / Time</label>
                  <input
                    type="text"
                    disabled
                    value="100 Marks (3 Hours)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-600"
                  />
                </div>
              </div>

              {/* Rubric Breakdown Preview */}
              <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E5E1D8] space-y-2">
                <span className="font-extrabold text-[11px] text-[#0B192C] uppercase tracking-wider block">
                  Autonomous Question Paper Structure &amp; Bloom&apos;s Level Compliance
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="font-black text-[#0B192C] block">Part A (20 Marks)</span>
                    <span className="text-slate-600">10 × 2 Marks (K1/K2 Remember &amp; Understand)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="font-black text-[#0B192C] block">Part B (65 Marks)</span>
                    <span className="text-slate-600">5 × 13 Marks (K3/K4 Apply &amp; Analyze with a/b choice)</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="font-black text-[#0B192C] block">Part C (15 Marks)</span>
                    <span className="text-slate-600">1 × 15 Marks (K5/K6 Evaluate &amp; Create Case Study)</span>
                  </div>
                </div>
              </div>

              {/* PDF Document Upload Zone */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border-2 border-dashed border-blue-300 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Upload size={16} />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-xs text-[#0B192C] uppercase tracking-wide">
                        Upload Question Paper PDF Document
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Upload official typed or scanned question paper PDF for HOD, Dean &amp; COE scrutiny.
                      </p>
                    </div>
                  </div>

                </div>

                {formPdfAttachment ? (
                  <div className="bg-white p-3.5 rounded-xl border border-blue-200 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0 font-black text-xs font-mono">
                        PDF
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-xs font-black text-slate-800 truncate">
                          {formPdfAttachment.fileName}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Size: {formPdfAttachment.fileSize} • Uploaded: {formPdfAttachment.uploadedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPdfModalOpen({
                            fileName: formPdfAttachment.fileName,
                            fileData: formPdfAttachment.fileData,
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C] text-xs font-bold hover:bg-[#152744] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormPdfAttachment(null)}
                        title="Remove PDF"
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-blue-200 bg-white hover:bg-blue-50/50 transition cursor-pointer group">
                      <Upload size={24} className="text-blue-500 group-hover:scale-110 transition duration-150 mb-1" />
                      <span className="text-xs font-bold text-blue-900">
                        {pdfUploadLoading ? "Uploading & Encoding..." : "Click to browse or drag & drop PDF here"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Supported: .pdf (Max size: 25MB)
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={handlePdfFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Faculty Submission Notes / Revision Summary
                </label>
                <textarea
                  rows={3}
                  value={formFacultyRemarks}
                  onChange={(e) => setFormFacultyRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#0B192C] text-xs"
                />
              </div>

              {/* Declaration Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formCertified}
                  onChange={(e) => setFormCertified(e.target.checked)}
                  className="mt-0.5 rounded text-[#D4A72C] focus:ring-[#D4A72C]"
                />
                <span className="text-[11px] font-semibold text-amber-950 leading-relaxed">
                  I hereby declare that this Question Paper has been drafted strictly in accordance with Autonomous Regulation 2021 curriculum, syllabus coverage (Units I to V), and Bloom&apos;s Revised Taxonomy levels. I submit this paper to the Head of Department (HOD) for DAC Scrutiny.
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-black transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                >
                  <Send size={15} className="text-[#D4A72C]" />
                  <span>{busy ? "Submitting..." : "Submit Question Paper to HOD [Stage 1 ➔ 2]"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW PAPER MODAL */}
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
                {previewPaper.pdfAttachment && (
                  <button
                    onClick={() =>
                      setPdfModalOpen({
                        fileName: previewPaper.pdfAttachment!.fileName,
                        fileData: previewPaper.pdfAttachment!.fileData,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileText size={14} />
                    <span>View PDF</span>
                  </button>
                )}
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

            {/* Uploaded PDF Banner */}
            {previewPaper.pdfAttachment && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-black text-xs flex items-center justify-center font-mono">
                    PDF
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Attached File: {previewPaper.pdfAttachment.fileName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Size: {previewPaper.pdfAttachment.fileSize} • Uploaded: {previewPaper.pdfAttachment.uploadedAt}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPdfModalOpen({
                      fileName: previewPaper.pdfAttachment!.fileName,
                      fileData: previewPaper.pdfAttachment!.fileData,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#0B192C] text-[#D4A72C] font-bold text-xs hover:bg-[#152744] transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye size={13} />
                  <span>Open PDF Viewer</span>
                </button>
              </div>
            )}

            {/* Exam Header */}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-xs text-[#0B192C]">PART A — (10 × 2 = 20 Marks)</h4>
                <span className="text-[10px] text-slate-500">Answer ALL Questions</span>
              </div>
              <div className="space-y-2 text-xs">
                {(previewPaper.parts?.partA?.questions || []).map((q) => (
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
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-xs text-[#0B192C]">PART B — (5 × 13 = 65 Marks)</h4>
                <span className="text-[10px] text-slate-500">Answer ALL Questions (Either/Or)</span>
              </div>
              <div className="space-y-3 text-xs">
                {(previewPaper.parts?.partB?.questions || []).map((q) => (
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
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-black text-xs text-[#0B192C]">PART C — (1 × 15 = 15 Marks)</h4>
                <span className="text-[10px] text-slate-500">Comprehensive / Evaluative Case Study</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[#D4A72C]/40 bg-[#FFFDF7] space-y-2 text-xs">
                {(previewPaper.parts?.partC?.questions || []).map((q) => (
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
                    {q.rubricHint && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200">
                        Evaluation Rubric: {q.rubricHint}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HIERARCHY TRAIL MODAL */}
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
              {hierarchyPaper.hierarchyTrail.map((sig, idx) => {
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
                  <span className="text-[10px] text-slate-400">Faculty Uploaded Question Paper PDF Document</span>
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
