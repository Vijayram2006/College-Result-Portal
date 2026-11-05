import React, { useState, useEffect } from "react";
import { X, Printer, ShieldCheck, User } from "lucide-react";
import { hallTicketAdminApi, DraftDetail } from "../../services/hallTicketAdminApi";

interface Props {
  draftId: number | null;
  onClose: () => void;
}

export function HallTicketPortraitPreviewModal({ draftId, onClose }: Props) {
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (draftId) {
      setLoading(true);
      hallTicketAdminApi
        .getDraft(draftId)
        .then((d) => setDraft(d))
        .catch((e) => console.error("Failed to load draft for preview", e))
        .finally(() => setLoading(false));
    }
  }, [draftId]);

  if (!draftId) return null;

  const handlePrint = () => {
    window.print();
  };

  const activePapers = (draft?.papers || []).filter((p) => p.isActive);
  const isSigned = draft?.signStatus === "COE_SIGNED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      {/* Scoped Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #portrait-hall-ticket-preview, #portrait-hall-ticket-preview * {
            visibility: visible;
          }
          #portrait-hall-ticket-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="bg-[#0B192C] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 no-print">
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wide">
              Hall Ticket Portrait Preview
            </h2>
            <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
              Official institutional format &bull; {draft?.studentReg || ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white text-[#0B192C] text-xs font-black hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Printer size={14} /> Print Portrait A4
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-semibold">
              Loading portrait preview...
            </div>
          ) : !draft ? (
            <div className="py-20 text-center text-rose-500 font-bold">
              Draft ticket not found.
            </div>
          ) : (
            <div
              id="portrait-hall-ticket-preview"
              className="bg-white mx-auto border-2 border-slate-900 rounded-xl p-6 sm:p-8 space-y-6 text-slate-900 shadow-lg max-w-[680px]"
            >
              {/* Institution Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <div className="text-[11px] tracking-widest font-black uppercase text-slate-600">
                  KVELL EDUCATIONAL INSTITUTIONS &bull; AUTONOMOUS
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-950">
                  OFFICE OF THE CONTROLLER OF EXAMINATIONS
                </h1>
                <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                  HALL TICKET &bull; {draft.examName || "END SEMESTER EXAMINATIONS"}
                </div>
                <div className="text-[11px] font-bold text-slate-600">
                  Academic Year: {draft.academicYear} | Semester: {draft.semester}
                </div>
              </div>

              {/* Candidate Info Grid with Photo Box */}
              <div className="border border-slate-900 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs flex-1">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">
                      Register Number
                    </span>
                    <span className="font-mono font-black text-sm text-slate-950">
                      {draft.studentReg}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">
                      Candidate Name
                    </span>
                    <span className="font-bold text-slate-950 text-xs">
                      {draft.name}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">
                      Degree &amp; Branch
                    </span>
                    <span className="font-bold text-slate-950 text-xs">
                      {draft.degreeBranch}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">
                      Current Semester
                    </span>
                    <span className="font-bold text-slate-950 text-xs">
                      {draft.currentSemester}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">
                      Date of Birth
                    </span>
                    <span className="font-mono font-bold text-slate-950 text-xs">
                      {draft.dateOfBirth}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">
                      Exam Centre
                    </span>
                    <span className="font-bold text-slate-950 text-xs">
                      {draft.examCentre || "—"}
                    </span>
                  </div>
                </div>

                {/* Photo Placeholder Box */}
                <div className="w-28 h-32 border-2 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center text-center p-2 shrink-0 bg-slate-50">
                  <User size={30} className="text-slate-400 mb-1" />
                  <span className="text-[9px] font-extrabold uppercase tracking-tight text-slate-500 leading-tight">
                    Affix Recent Passport Size Photograph
                  </span>
                </div>
              </div>

              {/* Papers Table */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Registered Examination Courses / Papers
                </div>

                <div className="border border-slate-900 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-900 text-slate-950 font-black uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 w-12 text-center border-r border-slate-900">S.No</th>
                        <th className="px-3 py-2 w-28 border-r border-slate-900">Course Code</th>
                        <th className="px-3 py-2 border-r border-slate-900">Course / Subject Title</th>
                        <th className="px-3 py-2 w-24 text-center">Semester</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-sans">
                      {activePapers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-500 font-semibold">
                            No active examination papers registered.
                          </td>
                        </tr>
                      ) : (
                        activePapers.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-300">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-950 border-r border-slate-300">
                              {p.subjectCode}
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-300">
                              {p.subjectTitle}
                              {p.paperType === "ARREAR" && (
                                <span className="ml-1.5 text-[10px] font-bold text-amber-700">
                                  (Arrear)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-slate-800">
                              Sem {p.paperSemester}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instructions / Notes for Examination */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/60 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                  Notes &amp; Instructions to the Candidate:
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-700 font-medium">
                  <li>
                    Candidates must bring this Hall Ticket along with their official College Identity Card to every session.
                  </li>
                  <li>
                    Possession of mobile phones, smartwatches, or unauthorized study material inside the examination hall is strictly prohibited.
                  </li>
                  <li>
                    Candidates should occupy their allotted seats 15 minutes before the commencement of the examination.
                  </li>
                  <li>
                    No candidate will be allowed to leave the examination hall until 30 minutes before closing time.
                  </li>
                </ol>
              </div>

              {/* Three Signatures Block */}
              <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center items-end">
                {/* Column 1: Candidate */}
                <div className="space-y-2">
                  <div className="h-10 border-b border-dashed border-slate-400"></div>
                  <div className="text-[11px] font-extrabold uppercase text-slate-700">
                    Signature of Candidate
                  </div>
                </div>

                {/* Column 2: Controller of Examinations */}
                <div className="space-y-1">
                  {isSigned ? (
                    <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-bold leading-tight flex flex-col items-center">
                      <ShieldCheck size={16} className="text-emerald-700 mb-0.5" />
                      <span>Verified and signed by CoE:</span>
                      <span className="font-extrabold">{draft.signedBy || "Controller of Examinations"}</span>
                      <span className="font-mono text-[9px] text-emerald-700">
                        {draft.signedAt ? new Date(draft.signedAt).toLocaleString() : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="h-10 border-b border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-400 italic">
                      (Pending Sign-Off)
                    </div>
                  )}
                  <div className="text-[11px] font-extrabold uppercase text-slate-700">
                    Controller of Examinations
                  </div>
                </div>

                {/* Column 3: Principal */}
                <div className="space-y-2">
                  <div className="h-10 border-b border-dashed border-slate-400"></div>
                  <div className="text-[11px] font-extrabold uppercase text-slate-700">
                    Principal
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
