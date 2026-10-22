import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import { aidsSem1Students } from "../../data/aidsStudents";
import { SplitScreenEvaluationModal } from "../common/SplitScreenEvaluationModal";

interface AnswerScriptItem {
  regNo: string;
  name: string;
  dob: string;
}

const DEFAULT_DOBS: Record<string, string> = {
  "20260110226001": "2009-03-28",
  "20260110226002": "2009-05-28",
  "20260110226003": "2008-08-17",
  "20260110226004": "2009-03-30",
  "20260110226005": "2008-12-15",
  "20260110226006": "2008-08-18",
};

const SUBJECT_COLUMNS = [
  { code: "CS26C02T", title: "Fundamentals of Data Science", sub: "50/50 AVAILABLE" },
  { code: "CS26N011", title: "Industry Nexus- I Python Foundations", sub: "50/50 AVAILABLE" },
  { code: "CY26C01I", title: "Engineering Chemistry", sub: "50/50 AVAILABLE" },
  { code: "MA26C01T", title: "Matrices and Calculus", sub: "50/50 AVAILABLE" },
  { code: "UC26C01T", title: "Tamil Heritage and Technology", sub: "50/50 AVAILABLE" },
];

export const AnswerScriptsView: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState("Artificial Intelligence & Data Science");
  const [selectedSemester, setSelectedSemester] = useState("Semester I");
  const [selectedAssessment, setSelectedAssessment] = useState("IAT-1");
  const [searchStudent, setSearchStudent] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected script modal preview
  const [activeScriptModal, setActiveScriptModal] = useState<{
    student: AnswerScriptItem;
    subject: { code: string; title: string };
    assessment: string;
    page: number;
  } | null>(null);

  // Split-Screen Evaluation Script Modal (Left: Written Script, Right: Mark Entry)
  const [splitScreenEvalTarget, setSplitScreenEvalTarget] = useState<{
    student: AnswerScriptItem;
    subject: { code: string; title: string };
    assessment: string;
  } | null>(null);

  const studentList: AnswerScriptItem[] = useMemo(() => {
    return aidsSem1Students.map((s, idx) => ({
      regNo: s.regNo,
      name: s.name,
      dob: DEFAULT_DOBS[s.regNo] || `2008-${String((idx % 12) + 1).padStart(2, "0")}-${String((idx % 27) + 1).padStart(2, "0")}`,
    }));
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchStudent.trim().toLowerCase();
    if (!q) return studentList;
    return studentList.filter(
      (s) => s.regNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [studentList, searchStudent]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner matching Image 3 */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider inline-block mb-2 shadow-xs">
            SCANNED ANSWER SCRIPTS
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Answer Script View</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            View the scanned photocopy (PDF) of each student's answer script for every subject. All answer scripts are
            permanently encrypted, indexed, and available for Dean academic verification.
          </p>
        </div>
      </div>

      {/* Filter Bar matching Image 3 */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            DEPARTMENT
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
          >
            <option value="Artificial Intelligence & Data Science">Artificial Intelligence &amp; Data Science</option>
            <option value="Computer Science and Engineering">Computer Science and Engineering</option>
            <option value="Biomedical Engineering">Biomedical Engineering</option>
            <option value="Biotechnology">Biotechnology</option>
          </select>
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            SEMESTER
          </label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
          >
            <option value="Semester I">Semester I</option>
            <option value="Semester II">Semester II</option>
          </select>
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            ASSESSMENT
          </label>
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
          >
            <option value="IAT-1">IAT-1</option>
            <option value="IAT-2">IAT-2</option>
            <option value="End Semester">End Semester</option>
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
            SEARCH STUDENT
          </label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Reg. no or name"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-semibold focus:border-[#0B192C] focus:outline-none"
            />
          </div>
        </div>

        <div className="self-end pb-0.5">
          <button
            onClick={handleRefresh}
            className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#D4A72C]" : "text-gray-500"} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info notice bar matching Image 3 */}
      <p className="text-xs text-gray-500 font-semibold pl-1">
        {selectedDept} • {selectedSemester} • {selectedAssessment}: {studentList.length} students,{" "}
        {SUBJECT_COLUMNS.length} subjects, {studentList.length * SUBJECT_COLUMNS.length} of{" "}
        {studentList.length * SUBJECT_COLUMNS.length} scripts available for verification.
      </p>

      {/* Matrix Table with "View PDF" instead of Upload */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">REGISTER NUMBER</th>
                <th className="py-3.5 px-4 whitespace-nowrap">STUDENT NAME</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">DOB</th>
                {SUBJECT_COLUMNS.map((col) => (
                  <th key={col.code} className="py-3.5 px-3 text-center min-w-[155px]">
                    <span className="font-mono text-white block">{col.code}</span>
                    <span className="text-[9px] font-medium text-gray-300 block line-clamp-1">{col.title}</span>
                    <span className="text-[8px] font-black text-[#D4A72C] block mt-0.5">{col.sub}</span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredStudents.map((s) => (
                <tr key={s.regNo} className="hover:bg-amber-50/20 transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#0B192C] whitespace-nowrap">{s.regNo}</td>
                  <td className="py-3 px-4 font-bold text-[#0B192C] whitespace-nowrap">{s.name}</td>
                  <td className="py-3 px-3.5 text-gray-500 font-mono text-[11px] whitespace-nowrap">{s.dob}</td>

                  {/* Subject Action Cells with Evaluation Desk & View PDF */}
                  {SUBJECT_COLUMNS.map((col) => (
                    <td key={col.code} className="py-2 px-1.5 text-center">
                      <div className="flex flex-col gap-1 items-stretch max-w-[140px] mx-auto">
                        <button
                          type="button"
                          onClick={() =>
                            setSplitScreenEvalTarget({
                              student: s,
                              subject: col,
                              assessment: selectedAssessment,
                            })
                          }
                          className="py-1 px-2 rounded-lg border border-red-900/50 bg-red-50/80 hover:bg-red-100 text-red-950 text-[10px] font-black transition flex items-center justify-center gap-1 shadow-2xs group cursor-pointer"
                          title={`Open Split-Screen Evaluation Script for ${s.name} (${col.code})`}
                        >
                          <FileText size={11} className="text-red-900 group-hover:scale-110 transition" />
                          <span>Evaluation Desk</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveScriptModal({
                              student: s,
                              subject: col,
                              assessment: selectedAssessment,
                              page: 1,
                            })
                          }
                          className="py-0.5 px-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          title={`View scanned PDF photocopy for ${s.name} (${col.code})`}
                        >
                          <Eye size={10} className="text-gray-500" />
                          <span>Photocopy</span>
                        </button>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* High-Fidelity Answer Script Viewer Modal */}
      {activeScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#D4A72C]/20 border border-[#D4A72C]/40 text-[#D4A72C] flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">
                    Official Answer Script Photocopy • {activeScriptModal.subject.code}
                  </h3>
                  <p className="text-[11px] text-[#D4A72C]">
                    Candidate: {activeScriptModal.student.name} ({activeScriptModal.student.regNo}) •{" "}
                    {activeScriptModal.assessment}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition"
                  title="Print Answer Script"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => setActiveScriptModal(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Scanned Document Simulation */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6">
              {/* Cover Sheet */}
              <div className="bg-white rounded-2xl border-2 border-gray-300 p-6 sm:p-8 shadow-md relative overflow-hidden font-serif">
                {/* University Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <span className="font-sans font-black text-7xl uppercase rotate-[-25deg] text-black">
                    KVELL AUTONOMOUS
                  </span>
                </div>

                {/* Top Cover Header */}
                <div className="text-center border-b-2 border-black pb-4">
                  <h2 className="text-lg font-black uppercase tracking-wider text-black">
                    Karpaga Vinayaga College of Engineering and Technology
                  </h2>
                  <p className="text-xs uppercase font-sans font-bold text-gray-700 tracking-wide mt-0.5">
                    Office of the Dean of Academics • Autonomous Examination Wing
                  </p>
                  <p className="text-[11px] font-sans font-semibold text-gray-500 mt-1">
                    Continuous Internal Assessment (CIA / {activeScriptModal.assessment}) Script Booklet
                  </p>
                </div>

                {/* Candidate Barcode & Meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-gray-300 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">REGISTER NUMBER</span>
                    <span className="font-mono font-black text-black text-sm">{activeScriptModal.student.regNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">STUDENT NAME</span>
                    <span className="font-bold text-black">{activeScriptModal.student.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">SUBJECT CODE &amp; NAME</span>
                    <span className="font-bold text-black">
                      {activeScriptModal.subject.code} - {activeScriptModal.subject.title}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">DATE OF VALUATION</span>
                    <span className="font-mono font-bold text-black">2026-10-18</span>
                  </div>
                </div>

                {/* Examiner Marks Table */}
                <div className="py-4 font-sans">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-700 block mb-2">
                    EVALUATOR MARKS BREAKDOWN
                  </span>
                  <table className="w-full text-center border-collapse border border-gray-400 text-xs">
                    <thead className="bg-gray-100 font-bold">
                      <tr>
                        <th className="border border-gray-400 p-2">PART A (Q1–Q5, 2M)</th>
                        <th className="border border-gray-400 p-2">PART B (Q6–Q8, 10M)</th>
                        <th className="border border-gray-400 p-2">TOTAL (Out of 40)</th>
                        <th className="border border-gray-400 p-2">CONVERTED (Out of 20)</th>
                        <th className="border border-gray-400 p-2">SCRUTINY STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono font-bold">
                      <tr>
                        <td className="border border-gray-400 p-2">2 + 2 + 2 + 1.5 + 2 = 9.5</td>
                        <td className="border border-gray-400 p-2">9 + 9.5 + 8.5 = 27.0</td>
                        <td className="border border-gray-400 p-2 text-base text-[#0B192C]">36.5 / 40</td>
                        <td className="border border-gray-400 p-2 text-base text-[#B08014]">18.3 / 20</td>
                        <td className="border border-gray-400 p-2 text-emerald-700 font-sans">
                          <span className="flex items-center justify-center gap-1">
                            <ShieldCheck size={14} /> Certified
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Hand-written Answer Simulation */}
                <div className="mt-4 p-5 rounded-xl border border-gray-200 bg-[#FFFDF8] font-mono text-xs text-gray-800 space-y-3 leading-relaxed shadow-inner">
                  <div className="text-[10px] font-sans font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-1 flex justify-between">
                    <span>ANSWER SHEET SCRIPT PREVIEW (PAGE {activeScriptModal.page} OF 6)</span>
                    <span className="text-emerald-700">SCAN VERIFIED 300 DPI</span>
                  </div>
                  <p>
                    <span className="font-bold text-black underline">Answer 1:</span> Data Science is an interdisciplinary
                    field that uses scientific methods, processes, algorithms, and systems to extract knowledge and
                    insights from structured and unstructured data.
                  </p>
                  <p>
                    <span className="font-bold text-black underline">Answer 2:</span> The core phases of the CRISP-DM lifecycle
                    include: 1. Business Understanding, 2. Data Understanding, 3. Data Preparation, 4. Modeling, 5.
                    Evaluation, 6. Deployment.
                  </p>
                  <p className="text-gray-500 italic text-[11px]">
                    [Evaluator Annotations: Correct definitions provided with neat diagrammatic representation. +2/2 marks
                    awarded by Examiner #ENG-VAL-04].
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setActiveScriptModal((prev) => (prev ? { ...prev, page: Math.max(1, prev.page - 1) } : null))
                  }
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs font-bold text-gray-600">Page {activeScriptModal.page} of 6</span>
                <button
                  onClick={() =>
                    setActiveScriptModal((prev) => (prev ? { ...prev, page: Math.min(6, prev.page + 1) } : null))
                  }
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 flex items-center gap-1"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveScriptModal(null)}
                  className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744]"
                >
                  Close Script
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Split-Screen Evaluation Desk Modal */}
      {splitScreenEvalTarget && (
        <SplitScreenEvaluationModal
          isOpen={Boolean(splitScreenEvalTarget)}
          onClose={() => setSplitScreenEvalTarget(null)}
          studentRegNo={splitScreenEvalTarget.student.regNo}
          studentName={splitScreenEvalTarget.student.name}
          isBlindValuation={false}
          subjectCode={splitScreenEvalTarget.subject.code}
          subjectTitle={splitScreenEvalTarget.subject.title}
          semester={selectedSemester}
          department={selectedDept}
          assessmentType={selectedAssessment as any}
          onSaveMarks={(result) => {
            alert(`Verified marks for ${splitScreenEvalTarget.student.name} (${splitScreenEvalTarget.student.regNo}): ${result.grandTotal}/100 - Grade: ${result.grade}`);
          }}
        />
      )}
    </div>
  );
};
