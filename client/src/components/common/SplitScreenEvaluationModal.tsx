import { AnswerScriptPane } from "../AnswerScriptPane";
import { fitSub } from "../../utils/markCaps";
import React, { useState, useEffect } from "react";
import {
  FileText,
  X,
  Sparkles,
  Save,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  Printer,
  Eye,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface QuestionSubPart {
  i: number;
  ii: number;
  iii: number;
}

export interface QuestionData {
  a: QuestionSubPart;
  b: QuestionSubPart;
  co: string;
}

export interface SplitScreenEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentRegNo?: string;
  studentName?: string;
  dummyBarcode?: string;
  isBlindValuation?: boolean;
  subjectCode: string;
  subjectTitle: string;
  semester?: string;
  department?: string;
  examDate?: string;
  assessmentType?: "IAT-1" | "IAT-2" | "End Semester";
  packetId?: string;
  initialPartA?: number[];
  initialPartB?: Record<number, QuestionData>;
  /** Loads the real (anonymised) answer script PDF; when given it replaces the sample booklet. */
  pdfLoader?: () => Promise<Blob>;
  onSaveMarks: (result: {
    partATotal: number;
    partBTotal: number;
    grandTotal: number;
    grade: string;
    partAMarks: number[];
    partBCMarks: Record<number, QuestionData>;
  }) => void;
}

export const SplitScreenEvaluationModal: React.FC<SplitScreenEvaluationModalProps> = ({
  isOpen,
  onClose,
  studentRegNo = "20260110226001",
  studentName = "ABI T",
  dummyBarcode = "DMY-84291",
  isBlindValuation = false,
  subjectCode,
  subjectTitle,
  semester = "Semester I",
  department = "Computer Science & Engineering",
  examDate = "09/10/26",
  assessmentType: initialAssessment = "IAT-1",
  packetId = "PKT-A",
  initialPartA,
  initialPartB,
  pdfLoader,
  onSaveMarks,
}) => {
  if (!isOpen) return null;

  const [assessmentType, setAssessmentType] = useState<"IAT-1" | "IAT-2" | "End Semester">(initialAssessment);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewMode, setViewMode] = useState<"written_script" | "pdf_placeholder">("written_script");

  // Part A: Questions 1 to 10 (Max 2 marks each, total 20)
  const [partAMarks, setPartAMarks] = useState<number[]>(() => {
    if (initialPartA && initialPartA.length === 10) return initialPartA;
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  });

  // Part B: Questions 11 to 15 (Max 16 marks per question, total 80)
  const [partBCMarks, setPartBCMarks] = useState<Record<number, QuestionData>>(() => {
    if (initialPartB && Object.keys(initialPartB).length >= 6) return initialPartB;
    const z = () => ({ a: { i: 0, ii: 0, iii: 0 }, b: { i: 0, ii: 0, iii: 0 } });
    return {
      11: { ...z(), co: "CO1" }, 12: { ...z(), co: "CO1" }, 13: { ...z(), co: "CO2" },
      14: { ...z(), co: "CO2" }, 15: { ...z(), co: "CO3" }, 16: { ...z(), co: "CO6" },
    };
  });

  // CO Mappings for Part A
  const partACOs = ["CO1", "CO1", "CO1", "CO1", "CO2", "CO2", "CO2", "CO3", "CO3", "CO3"];

  // Calculate Part A Total
  const partATotal = Number(partAMarks.reduce((sum, m) => sum + (Number(m) || 0), 0).toFixed(1));

  // Calculate Q. Total for Part B
  const calculateSubTotal = (sub: QuestionSubPart) => {
    return Math.min(16, (Number(sub.i) || 0) + (Number(sub.ii) || 0) + (Number(sub.iii) || 0));
  };

  const calculateQTotal = (q: QuestionData, qNum?: number) => {
    const totalA = calculateSubTotal(q.a);
    const totalB = calculateSubTotal(q.b);
    return Math.min(qNum === 16 ? 15 : 13, Math.max(totalA, totalB)); // the answered choice, up to the question's marks
  };

  // Calculate Part B Total (Questions 11 to 15)
  const partBTotal = [11, 12, 13, 14, 15, 16].reduce((sum, qNum) => {
    const qData = partBCMarks[qNum];
    return sum + (qData ? calculateQTotal(qData, qNum) : 0);
  }, 0);

  // Grand Total & Grade Calculation
  const grandTotal = Math.min(100, Math.round(partATotal + partBTotal));

  const calculateGrade = (total: number) => {
    if (total >= 90) return "O";
    if (total >= 80) return "A+";
    if (total >= 70) return "A";
    if (total >= 60) return "B+";
    if (total >= 50) return "B";
    if (total >= 45) return "C";
    return "RA";
  };

  const currentGrade = calculateGrade(grandTotal);

  // Auto-Fill sample authentic scores matching user's screenshot
  const handleAutoFillSample = () => {
    setPartAMarks([2, 2, 2, 1, 2, 2, 1.5, 2, 1.5, 2]);
    setPartBCMarks({
      11: { a: { i: 8, ii: 6, iii: 0 }, b: { i: 5, ii: 0, iii: 0 }, co: "CO1" },
      12: { a: { i: 7, ii: 7, iii: 0 }, b: { i: 0, ii: 0, iii: 0 }, co: "CO1" },
      13: { a: { i: 8, ii: 6, iii: 0 }, b: { i: 0, ii: 0, iii: 0 }, co: "CO2" },
      14: { a: { i: 6, ii: 8, iii: 0 }, b: { i: 0, ii: 0, iii: 0 }, co: "CO2" },
      15: { a: { i: 7, ii: 7, iii: 0 }, b: { i: 0, ii: 0, iii: 0 }, co: "CO3" },
    });
  };

  const handleSave = () => {
    onSaveMarks({
      partATotal,
      partBTotal,
      grandTotal,
      grade: currentGrade,
      partAMarks,
      partBCMarks,
    });
    onClose();
  };

  const displayReg = isBlindValuation ? (dummyBarcode || "[MASKED BY COE]") : studentRegNo;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-[98vw] xl:max-w-[1550px] h-[95vh] bg-[#1a2332] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* MODAL GRID CONTAINER: LEFT (50%) + RIGHT (50%) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 flex-1 overflow-hidden h-full">
          {/* ========================================================= */}
          {/* LEFT PANEL: ANSWER SCRIPT VIEWER (Exactly matching user's screenshot) */}
          {/* ========================================================= */}
          <div className="bg-[#0B192C] rounded-2xl border border-slate-700 flex flex-col overflow-hidden h-full shadow-lg">
            {/* Left Header Bar */}
            <div className="bg-[#081322] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#EAB308]/20 text-[#EAB308]">
                  <FileText size={16} />
                </span>
                <span className="font-display font-black text-xs uppercase tracking-wider text-white">
                  ANSWER SCRIPT
                </span>
              </div>
              <div className="text-[11px] font-mono text-gray-400 font-semibold truncate max-w-[320px]">
                {displayReg} &bull; {subjectCode} &bull; {assessmentType}
              </div>
            </div>

            {/* Sub-toolbar with View Switcher & Page Navigation */}
            <div className="px-4 py-2 bg-[#0B192C] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewMode("written_script")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    viewMode === "written_script"
                      ? "bg-[#D4A72C] text-[#0B192C] shadow-xs"
                      : "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  Photocopy Pages ({currentPage}/8)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("pdf_placeholder")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    viewMode === "pdf_placeholder"
                      ? "bg-[#D4A72C] text-[#0B192C] shadow-xs"
                      : "bg-slate-800 text-gray-300 hover:bg-slate-700"
                  }`}
                >
                  Upload Status
                </button>
              </div>

              {viewMode === "written_script" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-mono text-[11px] text-[#D4A72C] font-bold">
                    Page {currentPage} of 8
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= 8}
                    onClick={() => setCurrentPage((p) => Math.min(8, p + 1))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-40 cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <div className="h-4 w-px bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(150, z + 25))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(75, z - 25))}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-gray-300 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Left Body Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#081322] flex items-center justify-center">
              {pdfLoader ? (
                <div className="w-full h-full">
                  <AnswerScriptPane fetchPdf={pdfLoader} scriptKey={displayReg} label={`${displayReg} • ${subjectCode} • ${assessmentType}`} />
                </div>
              ) : viewMode === "pdf_placeholder" ? (
                /* EXACT Placeholder matching user's screenshot */
                <div className="bg-[#FAF8F5] rounded-2xl p-8 sm:p-12 w-full max-w-lg text-center border border-gray-200 shadow-inner space-y-4 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">
                      No answer script uploaded for this assessment yet.
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      The COE uploads scripts on the Answer Scripts page. You can still enter marks.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setViewMode("written_script")}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                    >
                      View Written Photocopy Simulation &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                /* Authentic High-Fidelity Written Student Answer Booklet */
                <div
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                  className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-xl w-full border-2 border-gray-300 text-[#0B192C] font-serif transition-transform duration-150 space-y-5"
                >
                  {/* Top Seal / Header */}
                  <div className="border-b-2 border-black pb-3 text-center">
                    <div className="flex items-center justify-between text-[10px] font-sans font-bold text-gray-500 uppercase tracking-widest pb-1">
                      <span>PAGE {currentPage} OF 8</span>
                      <span>HIGH RESOLUTION SCAN 300 DPI</span>
                      <span>PACKET {packetId}</span>
                    </div>
                    <h3 className="font-sans font-black text-sm uppercase tracking-wider text-black">
                      Karpaga Vinayaga College of Engineering and Technology
                    </h3>
                    <p className="text-[10px] font-sans text-gray-600 uppercase font-semibold">
                      Autonomous End Semester Examination Answer Booklet
                    </p>
                  </div>

                  {/* Watermark */}
                  <div className="relative font-mono text-xs text-gray-900 space-y-4 leading-relaxed">
                    {currentPage === 1 && (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] font-sans">
                          <strong>PART - A &bull; Question 1:</strong> Define Data Normalization and write the formula for Min-Max Feature Scaling.
                        </div>
                        <div className="pl-4 border-l-2 border-blue-600 text-gray-900 font-sans italic text-xs">
                          <em>Candidate Written Answer:</em>
                          <p className="mt-1 font-serif not-italic">
                            Data Normalization is the pre-processing technique of scaling numerical feature vectors into a uniform bounded range [0, 1] to prevent dominance by attributes with large absolute magnitudes.
                          </p>
                          <p className="mt-1 font-mono font-bold text-blue-900">
                            X_norm = (X - X_min) / (X_max - X_min)
                          </p>
                        </div>
                        <div className="text-right text-[10px] font-sans font-black text-emerald-700">
                          &check; [Evaluator Marks Awarded: 2.0 / 2.0 &bull; CO1]
                        </div>

                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] font-sans pt-2">
                          <strong>PART - A &bull; Question 2:</strong> State the difference between supervised and unsupervised clustering.
                        </div>
                        <div className="pl-4 border-l-2 border-blue-600 text-gray-900 font-sans italic text-xs">
                          <em>Candidate Written Answer:</em>
                          <p className="mt-1 font-serif not-italic">
                            Supervised learning relies on ground-truth target labels y_i with loss minimisation J(&theta;). Unsupervised clustering identifies inherent latent geometric structures without labels using distance metrics d(x_i, &mu;_k).
                          </p>
                        </div>
                        <div className="text-right text-[10px] font-sans font-black text-emerald-700">
                          &check; [Evaluator Marks Awarded: 2.0 / 2.0 &bull; CO1]
                        </div>
                      </div>
                    )}

                    {currentPage === 2 && (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] font-sans">
                          <strong>PART - B &bull; Question 11(a):</strong> Explain K-Means Clustering algorithm with mathematical convergence proof and cluster centroid update derivation.
                        </div>
                        <div className="pl-4 border-l-2 border-blue-600 text-gray-900 font-sans text-xs space-y-2">
                          <em>Candidate Written Answer:</em>
                          <p className="font-serif">
                            1. Initialize k cluster centroids &mu;_1, &mu;_2, ... &mu;_k randomly from the data distribution.
                          </p>
                          <p className="font-serif">
                            2. Expectation Step: Assign each sample point x_i to the closest cluster centroid:
                            c^(i) = argmin_k || x^(i) - &mu;_k ||^2
                          </p>
                          <p className="font-serif">
                            3. Maximization Step: Update centroid vectors by computing the coordinate arithmetic mean of all assigned vectors:
                            &mu;_k = (1 / |C_k|) &sum; (for i &isin; C_k) x^(i)
                          </p>
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[10px] text-center text-slate-800">
                            Objective Distortion Function: J = &sum; (i=1 to m) || x^(i) - &mu;_c(i) ||^2
                          </div>
                        </div>
                        <div className="text-right text-[10px] font-sans font-black text-emerald-700">
                          &check; [Subdivision I: 8.0M + Subdivision II: 6.0M = 14.0 / 16.0 &bull; CO1]
                        </div>
                      </div>
                    )}

                    {currentPage > 2 && (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] font-sans">
                          <strong>PART - B &bull; Question {11 + (currentPage - 2)}(a):</strong> Comprehensive solution and analytical derivation continued on Page {currentPage}.
                        </div>
                        <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center font-sans space-y-2">
                          <p className="font-bold text-xs text-gray-700">
                            Student Answer Worksheet &bull; Page {currentPage}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Handwritten derivations, mathematical matrix computations, and structural flowchart diagrams certified in high resolution.
                          </p>
                          <div className="pt-2 text-emerald-700 font-bold text-xs font-mono">
                            &check; Authenticated by Valuation Camp Invigilator
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Script Footer */}
                  <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-[10px] font-sans text-gray-500">
                    <span>Autonomous Central Valuation Wing</span>
                    <span className="font-mono font-bold text-blue-900">{subjectCode} Script Booklet</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT PANEL: OFFICIAL EVALUATION SCRIPT FORM (Exact match to screenshot) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden h-full shadow-lg">
            {/* Top Modal Bar */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#0B192C] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                  OFFICIAL EVALUATION SCRIPT
                </span>
                <span className="text-xs font-mono font-bold text-[#B08014]">
                  REG: {displayReg}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAF8F5]">
              {/* Red-Bordered Official University Evaluation Sheet */}
              <div className="border-2 border-red-900/60 rounded-2xl p-4 sm:p-6 bg-[#FFFCF7] text-[#0B192C] shadow-sm space-y-4">
                {/* Header Row: Assessment Buttons, Banner Logo, and Kyro Mascot */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b-2 border-red-900/40 pb-4">
                  {/* Left: Assessment Selector & Auto-Fill */}
                  <div className="w-full md:w-1/4 flex flex-col items-start gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-red-900">
                      ASSESSMENT TYPE
                    </span>
                    <div className="inline-flex rounded-lg border border-red-900/40 p-0.5 bg-white text-xs font-bold shadow-xs">
                      {(["IAT-1", "IAT-2", "End Semester"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAssessmentType(type)}
                          className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer ${
                            assessmentType === type
                              ? "bg-[#0B192C] text-white shadow-xs"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFillSample}
                      className="px-2.5 py-1 rounded-lg bg-[#D4A72C]/20 hover:bg-[#D4A72C]/30 text-[#0B192C] font-black text-[10px] border border-[#D4A72C] transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Populate authentic evaluator marks matching rubric"
                    >
                      <Sparkles size={11} className="text-[#B08014]" />
                      <span>Auto-Fill Marks</span>
                    </button>
                  </div>

                  {/* Center: Karpaga Vinayaga Banner Logo */}
                  <div className="w-full md:flex-1 flex flex-col items-center justify-center text-center px-2">
                    <img
                      src="/karpaga-vinayaga-banner.png"
                      alt="Karpaga Vinayaga Educational Lore for Learning"
                      className="h-14 sm:h-16 w-auto object-contain"
                    />
                    <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-widest mt-1">
                      Karpaga Vinayaga College of Engineering &amp; Technology
                    </span>
                  </div>

                  {/* Rightmost: Kyro Mascot */}
                  <div className="w-full md:w-1/4 flex items-center justify-center md:justify-end">
                    <img
                      src="/kyro-crossed.png"
                      alt="Kyro Mascot"
                      className="h-20 sm:h-24 w-auto object-contain drop-shadow-sm select-none pointer-events-none"
                    />
                  </div>
                </div>

                {/* Metadata Details Grid */}
                <div className="border border-red-900/60 divide-y divide-red-900/60 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-900/60">
                    <div className="p-2.5 flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[10px] text-red-900">
                        REGISTRATION NUMBER
                      </span>
                      <span className="font-mono font-black text-sm tracking-wider text-[#0B192C] bg-white px-2.5 py-0.5 rounded border border-gray-300">
                        {displayReg}
                      </span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[10px] text-red-900">SEMESTER</span>
                      <span className="font-bold text-gray-900">{semester}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-900/60">
                    <div className="p-2.5 flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[10px] text-red-900">
                        DEGREE / BRANCH
                      </span>
                      <span className="font-bold text-gray-900 truncate max-w-[200px]">
                        {department}
                      </span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[10px] text-red-900">DATE</span>
                      <span className="font-bold text-gray-900">{examDate}</span>
                    </div>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <span className="font-extrabold uppercase text-[10px] text-red-900">
                      SUBJECT CODE / TITLE
                    </span>
                    <span className="font-bold text-gray-900">
                      {subjectCode} &bull; {subjectTitle}
                    </span>
                  </div>
                </div>

                {/* Main Evaluation Grid: PART A and PART B side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
                  {/* PART - A (Questions 1 to 10) */}
                  <div className="lg:col-span-5 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                      PART - A (MAX 20)
                    </div>
                    <table className="w-full text-center text-xs divide-y divide-red-900/40">
                      <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="p-1.5 border-r border-red-900/40 w-24">QUESTION NUMBER</th>
                          <th className="p-1.5 border-r border-red-900/40">MARKS</th>
                          <th className="p-1.5 w-12">CO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-900/30">
                        {partAMarks.map((mark, i) => (
                          <tr key={i} className="hover:bg-red-50/30">
                            <td className="p-1.5 font-extrabold text-red-900 border-r border-red-900/40">
                              {i + 1}
                            </td>
                            <td className="p-1.5 border-r border-red-900/40">
                              <input
                                type="number"
                                min="0"
                                max="2"
                                step="0.5"
                                value={mark === 0 ? "" : mark}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updated = [...partAMarks];
                                  updated[i] = isNaN(val) ? 0 : Math.min(2, Math.max(0, val));
                                  setPartAMarks(updated);
                                }}
                                className="w-14 text-center font-bold px-1 py-0.5 rounded border border-gray-300 bg-[#FFFEFA] focus:ring-1 focus:ring-red-900 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5 font-mono text-[10px] text-gray-500 font-bold">
                              {partACOs[i]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-red-100 text-red-950 font-black">
                        <tr>
                          <td className="p-2 border-r border-red-900/40 uppercase text-[10px]">
                            TOTAL (PART - A)
                          </td>
                          <td colSpan={2} className="p-2 font-mono text-sm text-[#0B192C]">
                            {partATotal} / 20
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* PART - B (Questions 11 to 15 with sub-questions a & b) */}
                  <div className="lg:col-span-7 border-2 border-red-900/60 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="bg-red-950 text-white font-black text-xs text-center py-2 uppercase tracking-wider">
                      PART - B (QUESTIONS 11 - 15)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs divide-y divide-red-900/40">
                        <thead className="bg-red-50 text-red-950 font-extrabold text-[10px] uppercase">
                          <tr>
                            <th className="p-1.5 border-r border-red-900/40 w-12">Q. NO</th>
                            <th className="p-1.5 border-r border-red-900/40 w-8">SUB</th>
                            <th className="p-1.5 border-r border-red-900/40 w-10">I</th>
                            <th className="p-1.5 border-r border-red-900/40 w-10">II</th>
                            <th className="p-1.5 border-r border-red-900/40 w-10">III</th>
                            <th className="p-1.5 border-r border-red-900/40 w-16">Q. TOTAL</th>
                            <th className="p-1.5 w-12">CO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-900/30">
                          {[11, 12, 13, 14, 15, 16].map((qNum) => {
                            const qData = partBCMarks[qNum];
                            const qTotal = calculateQTotal(qData, qNum);
                            return (
                              <React.Fragment key={qNum}>
                                {/* Sub-division a */}
                                <tr className="hover:bg-red-50/20">
                                  <td
                                    rowSpan={2}
                                    className="p-1.5 font-extrabold text-red-900 border-r border-red-900/40 align-middle bg-red-50/20"
                                  >
                                    {qNum}
                                  </td>
                                  <td className="p-1 font-bold text-gray-700 border-r border-red-900/40">a</td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="number"
                                      min="0"
                                      max={qNum === 16 ? 15 : 13}
                                      value={qData.a.i === 0 ? "" : qData.a.i}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setPartBCMarks({
                                          ...partBCMarks,
                                          [qNum]: {
                                            ...qData,
                                            a: { ...qData.a, i: fitSub(qData.a, "i", val, qNum) },
                                          },
                                        });
                                      }}
                                      className="w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="number"
                                      min="0"
                                      max={qNum === 16 ? 15 : 13}
                                      value={qData.a.ii === 0 ? "" : qData.a.ii}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setPartBCMarks({
                                          ...partBCMarks,
                                          [qNum]: {
                                            ...qData,
                                            a: { ...qData.a, ii: fitSub(qData.a, "ii", val, qNum) },
                                          },
                                        });
                                      }}
                                      className="w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="number"
                                      min="0"
                                      max={qNum === 16 ? 15 : 13}
                                      value={qData.a.iii === 0 ? "" : qData.a.iii}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setPartBCMarks({
                                          ...partBCMarks,
                                          [qNum]: {
                                            ...qData,
                                            a: { ...qData.a, iii: fitSub(qData.a, "iii", val, qNum) },
                                          },
                                        });
                                      }}
                                      className="w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none"
                                    />
                                  </td>
                                  <td
                                    rowSpan={2}
                                    className="p-1.5 font-mono font-black text-sm text-[#0B192C] border-r border-red-900/40 align-middle bg-amber-50/40"
                                  >
                                    {qTotal}
                                  </td>
                                  <td
                                    rowSpan={2}
                                    className="p-1.5 font-mono text-[10px] text-gray-600 font-bold align-middle"
                                  >
                                    {qData.co}
                                  </td>
                                </tr>

                                {/* Sub-division b */}
                                <tr className="hover:bg-red-50/20">
                                  <td className="p-1 font-bold text-gray-700 border-r border-red-900/40">b</td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="number"
                                      min="0"
                                      max={qNum === 16 ? 15 : 13}
                                      value={qData.b.i === 0 ? "" : qData.b.i}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setPartBCMarks({
                                          ...partBCMarks,
                                          [qNum]: {
                                            ...qData,
                                            b: { ...qData.b, i: fitSub(qData.b, "i", val, qNum) },
                                          },
                                        });
                                      }}
                                      className="w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="number"
                                      min="0"
                                      max={qNum === 16 ? 15 : 13}
                                      value={qData.b.ii === 0 ? "" : qData.b.ii}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setPartBCMarks({
                                          ...partBCMarks,
                                          [qNum]: {
                                            ...qData,
                                            b: { ...qData.b, ii: fitSub(qData.b, "ii", val, qNum) },
                                          },
                                        });
                                      }}
                                      className="w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none"
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="number"
                                      min="0"
                                      max={qNum === 16 ? 15 : 13}
                                      value={qData.b.iii === 0 ? "" : qData.b.iii}
                                      placeholder="0"
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setPartBCMarks({
                                          ...partBCMarks,
                                          [qNum]: {
                                            ...qData,
                                            b: { ...qData.b, iii: fitSub(qData.b, "iii", val, qNum) },
                                          },
                                        });
                                      }}
                                      className="w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none"
                                    />
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-red-100 text-red-950 font-black">
                          <tr>
                            <td colSpan={5} className="p-2 border-r border-red-900/40 uppercase text-[10px] text-right pr-4">
                              TOTAL (PART - B)
                            </td>
                            <td colSpan={2} className="p-2 font-mono text-sm text-[#0B192C]">
                              {partBTotal} / 80
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* GRAND TOTAL SUMMARY BAR */}
                <div className="p-4 rounded-xl bg-[#0B192C] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">PART A</span>
                      <span className="font-bold text-amber-400">{partATotal} / 20</span>
                    </div>
                    <span className="text-gray-500 text-lg">+</span>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">PART B</span>
                      <span className="font-bold text-amber-400">{partBTotal} / 80</span>
                    </div>
                    <span className="text-gray-500 text-lg">=</span>
                    <div>
                      <span className="text-[10px] text-[#D4A72C] block uppercase font-bold">GRAND TOTAL</span>
                      <span className="font-black text-xl text-white">{grandTotal} / 100</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-mono font-black bg-[#EAB308] text-[#0B192C]">
                      GRADE: {currentGrade}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {grandTotal >= 50 ? "&bull; PASS" : "&bull; RE-APPEAR"}
                    </span>
                  </div>
                </div>

                {/* MODAL ACTION BUTTONS */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFillSample}
                      className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition cursor-pointer"
                    >
                      Reset / Sample Marks
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-6 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={15} /> Save &amp; Submit Evaluation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenEvaluationModal;
