import React, { useState } from "react";
import {
  Globe,
  Download,
  Trash2,
  Eye,
  Send,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Building2,
  Calendar,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { aidsSem1Students } from "../../data/aidsStudents";

export interface ResultBatchItem {
  id: string;
  batchTitle: string;
  departmentName: string;
  semester: string;
  examMonthYear: string;
  uploadDate: string;
  uploadedBy: string;
  totalStudents: number;
  passPercentage: number;
  publicationStatus: "PUBLISHED" | "AWAITING DEAN PUBLISH";
}

const INITIAL_BATCHES: ResultBatchItem[] = [
  {
    id: "batch-01",
    batchTitle: "UC26C01T Semester I IAT-1 (Artificial Intelligence & Data Science)",
    departmentName: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    examMonthYear: "IAT-1 Internal Assessment",
    uploadDate: "2026-10-18 23:16",
    uploadedBy: "VIJAY (Professor & Controller of Examinations)",
    totalStudents: 50,
    passPercentage: 100,
    publicationStatus: "AWAITING DEAN PUBLISH",
  },
  {
    id: "batch-02",
    batchTitle: "CS26C02T Semester I IAT-1 (Computer Science & Engineering)",
    departmentName: "Computer Science & Engineering",
    semester: "Semester I",
    examMonthYear: "IAT-1 Internal Assessment",
    uploadDate: "2026-10-16 15:41",
    uploadedBy: "Demo Examiner (Assistant Professor)",
    totalStudents: 50,
    passPercentage: 98,
    publicationStatus: "PUBLISHED",
  },
  {
    id: "batch-03",
    batchTitle: "MA26C01T Matrices and Calculus (AI&DS)",
    departmentName: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    examMonthYear: "IAT-1",
    uploadDate: "2026-10-17 11:20",
    uploadedBy: "Dr. Ramanathan (Professor)",
    totalStudents: 50,
    passPercentage: 96,
    publicationStatus: "PUBLISHED",
  },
  {
    id: "batch-04",
    batchTitle: "CY26C01I Engineering Chemistry (CSE)",
    departmentName: "Computer Science & Engineering",
    semester: "Semester I",
    examMonthYear: "IAT-1",
    uploadDate: "2026-10-17 14:10",
    uploadedBy: "Dr. S. Deepa (Associate Professor)",
    totalStudents: 50,
    passPercentage: 94,
    publicationStatus: "PUBLISHED",
  },
  {
    id: "batch-05",
    batchTitle: "CS26N011 Industry Nexus-I Python (AI&DS)",
    departmentName: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    examMonthYear: "IAT-1",
    uploadDate: "2026-10-18 09:30",
    uploadedBy: "Prof. Arjun Rao (Assistant Professor)",
    totalStudents: 50,
    passPercentage: 100,
    publicationStatus: "PUBLISHED",
  },
  {
    id: "batch-06",
    batchTitle: "AI602 Deep Learning & Neural Architectures (AI&DS)",
    departmentName: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    examMonthYear: "IAT-2",
    uploadDate: "2026-10-18 16:45",
    uploadedBy: "Valuation Wing",
    totalStudents: 50,
    passPercentage: 95,
    publicationStatus: "PUBLISHED",
  },
];

export const PublishedResultsView: React.FC = () => {
  const [batches, setBatches] = useState<ResultBatchItem[]>(() => {
    try {
      const saved = localStorage.getItem("kvell_dean_published_batches");
      return saved ? JSON.parse(saved) : INITIAL_BATCHES;
    } catch {
      return INITIAL_BATCHES;
    }
  });

  const [downloadSemester, setDownloadSemester] = useState("All semesters");
  const [downloadAssessment, setDownloadAssessment] = useState("All assessments");
  const [selectedBatchModal, setSelectedBatchModal] = useState<ResultBatchItem | null>(null);
  const [publishConfirmBatch, setPublishConfirmBatch] = useState<ResultBatchItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const persistBatches = (list: ResultBatchItem[]) => {
    setBatches(list);
    try {
      localStorage.setItem("kvell_dean_published_batches", JSON.stringify(list));
    } catch {}
  };

  const handleExportBatchExcel = (dept: string, assessment: string) => {
    const data = aidsSem1Students.map((s, idx) => ({
      "Register Number": s.regNo,
      "Student Name": s.name,
      "Department": dept,
      "Semester": "Semester I",
      "Assessment": assessment,
      "Subject Code": "UC26C01T",
      "Internal Score (out of 40)": 32 + ((idx * 3) % 9),
      "Attendance Score (out of 5)": 5,
      "Total Internal": 37 + ((idx * 3) % 4),
      "Result Status": "PASS",
      "Grade": idx < 15 ? "O" : idx < 35 ? "A+" : "A",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Published_Results");
    XLSX.writeFile(wb, `KVELL_${dept.replace(/\s+/g, "_")}_${assessment}_Published.xlsx`);
    showToast(`Downloaded published Excel sheet for ${dept} (${assessment})!`);
  };

  const handleDownloadAllShown = () => {
    handleExportBatchExcel("Computer_Science_and_Engineering", "IAT-1");
  };

  const handlePublishConfirm = () => {
    if (!publishConfirmBatch) return;

    const updated = batches.map((b) =>
      b.id === publishConfirmBatch.id ? { ...b, publicationStatus: "PUBLISHED" as const } : b
    );
    persistBatches(updated);
    setPublishConfirmBatch(null);
    showToast(`Results for "${publishConfirmBatch.batchTitle}" successfully published live to the Student Portal!`);
  };

  const handleDeleteBatch = (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete result batch "${title}"?`)) return;
    const updated = batches.filter((b) => b.id !== id);
    persistBatches(updated);
    showToast(`Deleted batch ${title}.`);
  };

  const handleClearAllBatches = () => {
    if (!window.confirm("Are you sure you want to clear ALL result batches? This action cannot be undone.")) return;
    persistBatches([]);
    showToast("All result batches cleared.");
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner matching Image 4 */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider inline-block mb-2 shadow-xs">
            ENGINEERING • RESULT PUBLICATION WORKFLOW
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Karpaga Vinayaga College of Engineering and Technology Published Results Control
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Students can only view results that have reached <strong>PUBLISHED</strong> status. Admin confirmation is
            required to release validated results.
          </p>
        </div>
      </div>

      {/* Card 1: Download Published Results matching Image 4 */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#0B192C]">Download Published Results</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Excel result sheet per department, semester and assessment (Result Sheet, Subject Summary, Marks Detail)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={downloadSemester}
              onChange={(e) => setDownloadSemester(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] text-xs font-bold text-gray-700 focus:outline-none"
            >
              <option value="All semesters">All semesters</option>
              <option value="Semester I">Semester I</option>
              <option value="Semester II">Semester II</option>
            </select>

            <select
              value={downloadAssessment}
              onChange={(e) => setDownloadAssessment(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] text-xs font-bold text-gray-700 focus:outline-none"
            >
              <option value="All assessments">All assessments</option>
              <option value="IAT-1">IAT-1</option>
              <option value="IAT-2">IAT-2</option>
            </select>

            <button
              onClick={handleDownloadAllShown}
              className="h-9 px-4 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download size={13} />
              <span>Download all shown (1)</span>
            </button>
          </div>
        </div>

        {/* Download Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3 px-4">DEPARTMENT</th>
                <th className="py-3 px-4">SEMESTER</th>
                <th className="py-3 px-4 text-center">ASSESSMENT</th>
                <th className="py-3 px-4 text-center">SUBJECTS</th>
                <th className="py-3 px-4 text-center">STUDENTS</th>
                <th className="py-3 px-4 text-right">DOWNLOAD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-[#0B192C]">Computer Science &amp; Engineering</td>
                <td className="py-3 px-4 text-gray-700 font-semibold">Semester I • 2026 - 2027</td>
                <td className="py-3 px-4 text-center">
                  <span className="font-bold text-gray-800">IAT-1</span>
                </td>
                <td className="py-3 px-4 text-center font-bold text-gray-700">5</td>
                <td className="py-3 px-4 text-center font-bold text-gray-700">50</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleExportBatchExcel("Computer Science and Engineering", "IAT-1")}
                    className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-[11px] transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Excel</span>
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-bold text-[#0B192C]">Artificial Intelligence &amp; Data Science</td>
                <td className="py-3 px-4 text-gray-700 font-semibold">Semester I • 2026 - 2027</td>
                <td className="py-3 px-4 text-center">
                  <span className="font-bold text-gray-800">IAT-1</span>
                </td>
                <td className="py-3 px-4 text-center font-bold text-gray-700">5</td>
                <td className="py-3 px-4 text-center font-bold text-gray-700">50</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleExportBatchExcel("Artificial Intelligence & Data Science", "IAT-1")}
                    className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-[11px] transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={12} />
                    <span>Excel</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 2: Examination Result Batches Directory matching Image 4 */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#0B192C]">
            Examination Result Batches Directory ({batches.length} Batches)
          </span>

          <div className="flex items-center gap-3">
            {batches.length > 0 && (
              <button
                onClick={handleClearAllBatches}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Clear All Batches</span>
              </button>
            )}
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              STATUS FILTER: DRAFT / VALIDATED / PUBLISHED
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">BATCH TITLE &amp; DEPT</th>
                <th className="py-3.5 px-4">SEMESTER &amp; YEAR</th>
                <th className="py-3.5 px-4">UPLOAD INFO</th>
                <th className="py-3.5 px-4 text-center">STUDENTS</th>
                <th className="py-3.5 px-4 text-center">PASS %</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-right">PUBLICATION ACTION</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-medium">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400 font-semibold">
                    No result batches present.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#0B192C] text-xs block">{b.batchTitle}</span>
                      <span className="text-[10px] font-mono text-[#B08014] font-bold block mt-0.5">
                        {b.departmentName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-gray-800 block">{b.semester}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{b.examMonthYear}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-gray-700 text-[11px] block">{b.uploadDate}</span>
                      <span className="text-[10px] text-gray-500">{b.uploadedBy}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">{b.totalStudents}</td>

                    <td className="py-3.5 px-4 text-center font-black text-emerald-600">{b.passPercentage}%</td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold inline-block ${
                          b.publicationStatus === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                        }`}
                      >
                        {b.publicationStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedBatchModal(b)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> View
                      </button>

                      {b.publicationStatus !== "PUBLISHED" && (
                        <button
                          onClick={() => setPublishConfirmBatch(b)}
                          className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-[11px] transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Send size={12} /> PUBLISH
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBatch(b.id, b.batchTitle)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] transition inline-flex items-center gap-1 border border-red-200 cursor-pointer"
                        title="Delete Result Batch"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: VIEW BATCH DETAILS */}
      {selectedBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div>
                <h3 className="font-display font-bold text-base">{selectedBatchModal.batchTitle}</h3>
                <p className="text-[11px] text-[#D4A72C]">
                  {selectedBatchModal.departmentName} • {selectedBatchModal.semester}
                </p>
              </div>
              <button onClick={() => setSelectedBatchModal(null)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">STATUS</span>
                  <span className="font-black text-emerald-700">{selectedBatchModal.publicationStatus}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">CANDIDATES</span>
                  <span className="font-bold text-black">{selectedBatchModal.totalStudents}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">PASS %</span>
                  <span className="font-bold text-emerald-700">{selectedBatchModal.passPercentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">UPLOADED BY</span>
                  <span className="font-medium text-gray-800 line-clamp-1">{selectedBatchModal.uploadedBy}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed font-medium">
                This batch is verified by Academic Scrutiny Wing and signed off by the Dean of Academics. Published
                records are synchronized with the central student result portal.
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedBatchModal(null)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744]"
              >
                Close Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANDATORY CONFIRMATION FOR PUBLICATION */}
      {publishConfirmBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#0B192C]">Publish Results Live?</h3>
                <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                  Dean of Academics Official Endorsement
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-gray-200 text-xs space-y-1.5 text-gray-700">
              <div className="flex justify-between">
                <span>Batch:</span>
                <span className="font-bold text-[#0B192C] truncate max-w-[200px]">
                  {publishConfirmBatch.batchTitle}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Department:</span>
                <span className="font-bold text-[#0B192C]">{publishConfirmBatch.departmentName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Candidates:</span>
                <span className="font-bold text-[#B08014]">{publishConfirmBatch.totalStudents} Students</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Upon publishing, candidate grades will become <strong>immediately visible to students</strong> in their
              respective portal and provisional marksheets will be released.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setPublishConfirmBatch(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishConfirm}
                className="px-5 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-extrabold shadow flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Endorse &amp; Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
