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
  /** REQ-03: the script must stay open this many seconds before its marks can be submitted (0 = no wait). */
  minSeconds?: number;
  /** REQ-04: remarks already saved ("overall", "q1".."q16"). */
  initialRemarks?: Record<string, string>;
  /** Boxes saved as not attempted (NA): "A1".."A10", "11a.i".."16b.iii". */
  initialNotAttempted?: string[];
  onSaveMarks: (result: {
    partATotal: number;
    partBTotal: number;
    grandTotal: number;
    grade: string;
    partAMarks: number[];
    partBCMarks: Record<number, QuestionData>;
    remarks: Record<string, string>;
    notAttempted: string[];
  }) => void;
}

export const SplitScreenEvaluationModal: React.FC<SplitScreenEvaluationModalProps> = ({
  isOpen,
  onClose,
  studentRegNo = "",
  studentName = "",
  dummyBarcode = "",
  isBlindValuation = false,
  subjectCode,
  subjectTitle,
  semester = "Semester I",
  department = "",
  examDate = new Date().toLocaleDateString("en-GB"),
  assessmentType: initialAssessment = "IAT-1",
  packetId = "",
  initialPartA,
  initialPartB,
  pdfLoader,
  minSeconds = 0,
  initialRemarks,
  initialNotAttempted,
  onSaveMarks,
}) => {
  // REQ-04 remarks and the REQ-03 minimum evaluation time (the server checks the time too)
  const [remarks, setRemarks] = useState<Record<string, string>>(() => ({ ...(initialRemarks ?? {}) }));
  const [remarkKey, setRemarkKey] = useState("overall");
  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (minSeconds <= 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [minSeconds]);
  const waitLeft = Math.max(0, Math.ceil(minSeconds - (now - openedAt) / 1000));
  if (!isOpen) return null;

  const [assessmentType, setAssessmentType] = useState<"IAT-1" | "IAT-2" | "End Semester">(initialAssessment);

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

  // Every box is empty (not marked yet), a number - 0 included, for an attempted answer - or NA for a question the
  // student did not attempt (typed as N; counts as 0). Keys: "A1".."A10" in Part A, "11a.i".."16b.iii" in B / C.
  const [naBoxes, setNaBoxes] = useState<Set<string>>(() => new Set(initialPartA ? initialNotAttempted ?? [] : []));
  const [filledBoxes, setFilledBoxes] = useState<Set<string>>(() => {
    // A saved script: every Part A box that is not NA, and every Part B / C box with marks
    const filled = new Set<string>();
    if (initialPartA && initialPartA.length === 10) {
      const na = new Set(initialNotAttempted ?? []);
      initialPartA.forEach((_, i) => !na.has(`A${i + 1}`) && filled.add(`A${i + 1}`));
      Object.entries(initialPartB ?? {}).forEach(([q, d]) =>
        (["a", "b"] as const).forEach((ch) =>
          (["i", "ii", "iii"] as const).forEach((k) => {
            if ((Number(d[ch][k]) || 0) > 0) filled.add(`${q}${ch}.${k}`);
          })
        )
      );
    }
    return filled;
  });
  const boxUsed = (key: string) => naBoxes.has(key) || filledBoxes.has(key);
  const boxText = (key: string, value: number) => (naBoxes.has(key) ? "NA" : filledBoxes.has(key) ? String(value) : "");
  const boxClass = (key: string) => (naBoxes.has(key) ? "italic !text-slate-500 !bg-slate-100" : "");
  /** Reads what was typed in a box: "" clears it, N / NA / - marks it not attempted, a number goes through fit. */
  const onBoxInput = (key: string, raw: string, apply: (value: number) => void) => {
    const text = raw.trim().toUpperCase();
    const mark = (na: boolean, filled: boolean) => {
      setNaBoxes((prev) => {
        const next = new Set(prev);
        if (na) next.add(key);
        else next.delete(key);
        return next;
      });
      setFilledBoxes((prev) => {
        const next = new Set(prev);
        if (filled) next.add(key);
        else next.delete(key);
        return next;
      });
    };
    if (text === "") {
      mark(false, false);
      apply(0);
      return;
    }
    if (/^(N|-)/.test(text)) {
      mark(true, false);
      apply(0);
      return;
    }
    const digits = text.replace(/[^0-9.]/g, "");
    const value = Number(digits);
    if (digits === "" || Number.isNaN(value)) return;
    mark(false, true);
    apply(Math.max(0, value));
  };
  // A question is answered as choice (a) OR (b): once one has a value, the other is a dummy (locked and empty)
  const otherChoiceUsed = (qNum: number, q: QuestionData, choice: "a" | "b") => {
    const otherKey = choice === "a" ? "b" : "a";
    const other = q[otherKey];
    return (Number(other.i) || 0) + (Number(other.ii) || 0) + (Number(other.iii) || 0) > 0
      || (["i", "ii", "iii"] as const).some((k) => boxUsed(`${qNum}${otherKey}.${k}`));
  };
  /** Questions with nothing entered: every Part A box, and one choice of each Part B / C question, needs a value. */
  const unmarkedQuestions = () => [
    ...Array.from({ length: 10 }, (_, i) => `A${i + 1}`).filter((k) => !boxUsed(k)).map((k) => k.slice(1)),
    ...[11, 12, 13, 14, 15, 16]
      .filter((q) => !(["a", "b"] as const).some((ch) => (["i", "ii", "iii"] as const).some((k) => boxUsed(`${q}${ch}.${k}`))))
      .map(String),
  ];

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

  const handleSave = () => {
    const unmarked = unmarkedQuestions();
    if (unmarked.length) {
      alert(
        `Question${unmarked.length > 1 ? "s" : ""} ${unmarked.join(", ")} ${unmarked.length > 1 ? "are" : "is"} empty. ` +
          "Enter the marks (0 if the answer was attempted but earned nothing), or N for not attempted (NA)."
      );
      return;
    }
    onSaveMarks({
      partATotal,
      partBTotal,
      grandTotal,
      grade: currentGrade,
      partAMarks,
      partBCMarks,
      remarks: Object.fromEntries(Object.entries(remarks).filter(([, v]) => v.trim())),
      notAttempted: Array.from(naBoxes),
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

            {/* Left Body Area */}
            <div className={`flex-1 min-h-0 bg-[#081322] ${pdfLoader ? "p-2 flex" : "overflow-y-auto p-4 flex items-center justify-center"}`}>
              {pdfLoader ? (
                <AnswerScriptPane fill fetchPdf={pdfLoader} scriptKey={displayReg} label={`${displayReg} • ${subjectCode} • ${assessmentType}`} />
              ) : (
                <div className="m-auto text-center text-xs text-gray-300 space-y-2 px-6">
                  <FileText size={32} className="mx-auto text-gray-500" />
                  <p className="font-bold">No answer script is available for this student.</p>
                  <p className="text-gray-400">The COE uploads the scanned scripts on the Answer Scripts page.</p>
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

                {/* How to fill a box: marks, 0 for an attempted answer that earned nothing, or N for not attempted */}
                <div className="rounded-lg border border-red-900/30 bg-red-50/60 px-3 py-1.5 text-[11px] font-semibold text-red-950 flex flex-wrap gap-x-4 gap-y-1">
                  <span><b>0</b> = attempted, no marks</span>
                  <span><b>N</b> = not attempted (shows <i>NA</i>, counts as 0)</span>
                  <span>Every question needs a value; in Q11-16 fill only the choice (a or b) the student wrote.</span>
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
                                type="text"
                                inputMode="decimal"
                                aria-label={`Part A question ${i + 1}`}
                                value={boxText(`A${i + 1}`, mark)}
                                onChange={(e) =>
                                  onBoxInput(`A${i + 1}`, e.target.value, (v) => {
                                    const updated = [...partAMarks];
                                    updated[i] = Math.min(2, v);
                                    setPartAMarks(updated);
                                  })
                                }
                                className={`w-14 text-center font-bold px-1 py-0.5 rounded border border-gray-300 bg-[#FFFEFA] focus:ring-1 focus:ring-red-900 focus:outline-none ${boxClass(`A${i + 1}`)}`}
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
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Q${qNum}(a)(i)`}
                                      disabled={otherChoiceUsed(qNum, qData, "a")}
                                      value={boxText(`${qNum}a.i`, qData.a.i)}
                                      onChange={(e) =>
                                        onBoxInput(`${qNum}a.i`, e.target.value, (v) =>
                                          setPartBCMarks({ ...partBCMarks, [qNum]: { ...qData, a: { ...qData.a, i: fitSub(qData.a, "i", v, qNum) } } })
                                        )
                                      }
                                      className={`w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${boxClass(`${qNum}a.i`)}`}
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Q${qNum}(a)(ii)`}
                                      disabled={otherChoiceUsed(qNum, qData, "a")}
                                      value={boxText(`${qNum}a.ii`, qData.a.ii)}
                                      onChange={(e) =>
                                        onBoxInput(`${qNum}a.ii`, e.target.value, (v) =>
                                          setPartBCMarks({ ...partBCMarks, [qNum]: { ...qData, a: { ...qData.a, ii: fitSub(qData.a, "ii", v, qNum) } } })
                                        )
                                      }
                                      className={`w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${boxClass(`${qNum}a.ii`)}`}
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Q${qNum}(a)(iii)`}
                                      disabled={otherChoiceUsed(qNum, qData, "a")}
                                      value={boxText(`${qNum}a.iii`, qData.a.iii)}
                                      onChange={(e) =>
                                        onBoxInput(`${qNum}a.iii`, e.target.value, (v) =>
                                          setPartBCMarks({ ...partBCMarks, [qNum]: { ...qData, a: { ...qData.a, iii: fitSub(qData.a, "iii", v, qNum) } } })
                                        )
                                      }
                                      className={`w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${boxClass(`${qNum}a.iii`)}`}
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
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Q${qNum}(b)(i)`}
                                      disabled={otherChoiceUsed(qNum, qData, "b")}
                                      value={boxText(`${qNum}b.i`, qData.b.i)}
                                      onChange={(e) =>
                                        onBoxInput(`${qNum}b.i`, e.target.value, (v) =>
                                          setPartBCMarks({ ...partBCMarks, [qNum]: { ...qData, b: { ...qData.b, i: fitSub(qData.b, "i", v, qNum) } } })
                                        )
                                      }
                                      className={`w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${boxClass(`${qNum}b.i`)}`}
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Q${qNum}(b)(ii)`}
                                      disabled={otherChoiceUsed(qNum, qData, "b")}
                                      value={boxText(`${qNum}b.ii`, qData.b.ii)}
                                      onChange={(e) =>
                                        onBoxInput(`${qNum}b.ii`, e.target.value, (v) =>
                                          setPartBCMarks({ ...partBCMarks, [qNum]: { ...qData, b: { ...qData.b, ii: fitSub(qData.b, "ii", v, qNum) } } })
                                        )
                                      }
                                      className={`w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${boxClass(`${qNum}b.ii`)}`}
                                    />
                                  </td>
                                  <td className="p-1 border-r border-red-900/40">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Q${qNum}(b)(iii)`}
                                      disabled={otherChoiceUsed(qNum, qData, "b")}
                                      value={boxText(`${qNum}b.iii`, qData.b.iii)}
                                      onChange={(e) =>
                                        onBoxInput(`${qNum}b.iii`, e.target.value, (v) =>
                                          setPartBCMarks({ ...partBCMarks, [qNum]: { ...qData, b: { ...qData.b, iii: fitSub(qData.b, "iii", v, qNum) } } })
                                        )
                                      }
                                      className={`w-10 text-center font-bold py-0.5 rounded border border-gray-300 bg-[#FFFEFA] text-xs focus:ring-1 focus:ring-red-900 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${boxClass(`${qNum}b.iii`)}`}
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

                {/* REQ-04: evaluation remarks, per question or overall; the student sees them after publication */}
                <div className="rounded-xl border border-slate-300 bg-white p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0B192C]">Evaluation remarks &amp; comments</span>
                    <select value={remarkKey} onChange={(e) => setRemarkKey(e.target.value)} aria-label="Remark for"
                      className="h-8 rounded-lg border border-slate-300 px-2 text-xs font-bold text-[#0B192C]">
                      <option value="overall">Overall</option>
                      {Array.from({ length: 16 }, (_, i) => <option key={i} value={`q${i + 1}`}>Question {i + 1}</option>)}
                    </select>
                  </div>
                  <textarea value={remarks[remarkKey] ?? ""} maxLength={500} rows={2}
                    onChange={(e) => setRemarks((r) => ({ ...r, [remarkKey]: e.target.value }))}
                    placeholder={remarkKey === "overall" ? "Overall comment on the script" : `Comment on question ${remarkKey.slice(1)}`}
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-[#0B192C]" />
                  {Object.entries(remarks).filter(([, v]) => v.trim()).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(remarks).filter(([, v]) => v.trim()).map(([k]) => (
                        <button key={k} type="button" onClick={() => setRemarkKey(k)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${k === remarkKey ? "bg-[#0B192C] text-[#D4A72C] border-[#0B192C]" : "bg-amber-50 border-amber-200 text-[#0B192C]"}`}>
                          {k === "overall" ? "Overall" : `Q${k.slice(1)}`}
                        </button>
                      ))}
                    </div>
                  )}
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
                    {waitLeft > 0 && (
                      <span className="text-[11px] font-bold text-amber-300" role="timer">
                        Minimum evaluation time: {Math.floor(waitLeft / 60)}:{String(waitLeft % 60).padStart(2, "0")} left
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={waitLeft > 0}
                      title={waitLeft > 0 ? "Read the whole script first; submitting unlocks when the minimum evaluation time is over" : undefined}
                      className="px-6 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
