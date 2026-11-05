import React, { useState, useEffect } from "react";
import { CandidatePreview, TemplateView } from "../../services/hallTicketAdminApi";
import { Award, AlertTriangle, Maximize2, Printer, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface BlockLayout {
  x: number; // in mm
  y: number; // in mm
  width?: number; // %
  fontSize?: number; // pt
}

export interface HallTicketLayoutMap {
  header: BlockLayout;
  candidate: BlockLayout;
  photo: BlockLayout;
  papers: BlockLayout;
  notes: BlockLayout;
  signatures: BlockLayout;
}

export const DEFAULT_LAYOUT: HallTicketLayoutMap = {
  header: { x: 0, y: 0, width: 100, fontSize: 12 },
  candidate: { x: 0, y: 0, width: 100, fontSize: 11 },
  photo: { x: 0, y: 0, width: 35, fontSize: 10 },
  papers: { x: 0, y: 0, width: 100, fontSize: 11 },
  notes: { x: 0, y: 0, width: 100, fontSize: 11 },
  signatures: { x: 0, y: 0, width: 100, fontSize: 11 },
};

export function parseLayoutJson(raw?: string | null): HallTicketLayoutMap {
  if (!raw) return DEFAULT_LAYOUT;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      header: { ...DEFAULT_LAYOUT.header, ...parsed?.header },
      candidate: { ...DEFAULT_LAYOUT.candidate, ...parsed?.candidate },
      photo: { ...DEFAULT_LAYOUT.photo, ...parsed?.photo },
      papers: { ...DEFAULT_LAYOUT.papers, ...parsed?.papers },
      notes: { ...DEFAULT_LAYOUT.notes, ...parsed?.notes },
      signatures: { ...DEFAULT_LAYOUT.signatures, ...parsed?.signatures },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function formatDate(d?: string | null): string {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
}

interface Props {
  preview: CandidatePreview | null;
  template: TemplateView;
  loading?: boolean;
}

export function HallTicketPortraitPreview({ preview, template, loading }: Props) {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);

  // Close full preview on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B192C] mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Hall Ticket Preview...
        </p>
      </div>
    );
  }

  const studentFound = preview?.studentFound;

  // Render the core A4 ticket layout
  const renderTicketContent = (isModal: boolean = false) => {
    const layout = parseLayoutJson(template.layoutJson);
    const photoPos = template.photoPosition || "right";
    const photoSize = template.photoSize || "medium";

    // Fixed width box so it never overlaps text
    let sizeStyle = { width: "128px", height: "150px" }; // medium default
    if (photoSize === "small") {
      sizeStyle = { width: "100px", height: "120px" };
    } else if (photoSize === "large") {
      sizeStyle = { width: "150px", height: "180px" };
    }

    const photoBox = template.showPhoto && (
      <div
        style={{
          ...sizeStyle,
          transform: `translate(${layout.photo.x}mm, ${layout.photo.y}mm)`,
        }}
        className="border-2 border-dashed border-slate-400 bg-slate-50 flex flex-col items-center justify-center text-center p-2 rounded shrink-0 self-start shadow-xs"
      >
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tighter leading-snug">
          AFFIX RECENT PASSPORT SIZE PHOTOGRAPH
        </span>
      </div>
    );

    const isLeft = photoPos === "left";
    const isTopCentre = photoPos === "top centre";

    return (
      <div
        id="portrait-hall-ticket-print"
        style={
          template.backgroundImage
            ? {
                backgroundImage: `url(${template.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : undefined
        }
        className="bg-white text-slate-900 rounded-2xl p-6 sm:p-10 w-full max-w-[820px] mx-auto shadow-md border border-slate-300 font-sans space-y-6 text-[12px] leading-relaxed relative"
      >
        {/* Header Block with Configured Logos */}
        <div
          style={{
            transform: `translate(${layout.header.x}mm, ${layout.header.y}mm)`,
            fontSize: `${layout.header.fontSize}pt`,
          }}
          className="text-center border-b-2 border-slate-800 pb-4 space-y-1"
        >
          <div className="flex items-center justify-center gap-6 pb-2">
            {template.logoSource === "both" ? (
              <>
                <img src="/kvell-logo.png" alt="University Seal" className="h-14 sm:h-16 w-auto object-contain" />
                <img src="/engineering-logo.png" alt="College Logo" className="h-14 sm:h-16 w-auto object-contain" />
              </>
            ) : template.logoSource === "engineering-logo.png" ? (
              <img src="/engineering-logo.png" alt="College Logo" className="h-14 sm:h-16 w-auto object-contain" />
            ) : (template.logoSource === "uploaded" || template.logoSource === "custom") && template.logoImage ? (
              <img src={template.logoImage} alt="Uploaded Logo" className="h-14 sm:h-16 w-auto object-contain" />
            ) : (
              <img src="/kvell-logo.png" alt="University Seal" className="h-14 sm:h-16 w-auto object-contain" />
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-wide text-slate-950 uppercase">
            KVELL UNIVERSITY
          </h2>
          <p className="text-[13px] font-extrabold tracking-wider text-slate-700 uppercase">
            CONTROLLER OF EXAMINATIONS
          </p>
          <p className="text-[14px] font-bold text-slate-900 uppercase tracking-normal pt-1 break-words">
            {template.examTitle || `END SEMESTER EXAMINATIONS - ${template.academicYear || "2026-2027"}`}
          </p>
          <div className="pt-2">
            <span className="inline-block px-4 py-1.5 bg-[#0B192C] text-[#D4A72C] font-black text-xs uppercase tracking-widest rounded-md">
              HALL TICKET
            </span>
          </div>
        </div>

        {/* Candidate & Photo Details (Clean side-by-side flex layout with NO overlapping) */}
        {isTopCentre ? (
          <div className="space-y-4">
            {photoBox && <div className="flex justify-center">{photoBox}</div>}
            <div className="w-full">
              <table className="w-full text-[12px] border border-slate-300 border-collapse table-fixed">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 w-44 border-r border-slate-200">
                      Hall Ticket No
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-extrabold text-[#0B192C] break-all">
                      {studentFound && preview?.hallTicketNo
                        ? preview.hallTicketNo
                        : `HT-${template.academicYear.replace(/\s+/g, "") || "2026-2027"}-${preview?.semester ? String(preview.semester).replace(/\D/g, '') : "1"}-SAMPLE`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Register Number
                    </td>
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 break-all">
                      {studentFound && preview?.registerNumber ? preview.registerNumber : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Student Name
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 uppercase break-words">
                      {studentFound && preview?.name ? preview.name : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Date of Birth
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-slate-800">
                      {studentFound && preview?.dateOfBirth ? preview.dateOfBirth : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Degree &amp; Branch
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 break-words">
                      {studentFound && preview?.degreeBranch ? preview.degreeBranch : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Semester
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">
                      {studentFound && preview?.semester ? preview.semester : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Examination Centre
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-900 break-words">
                      {template.examinationCentre?.trim() ? (
                        template.examinationCentre.trim()
                      ) : (
                        <span className="text-rose-600 font-semibold italic">
                          (Not specified - required before Fix)
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${layout.candidate.x}mm, ${layout.candidate.y}mm)`,
              fontSize: `${layout.candidate.fontSize}pt`,
            }}
            className={`flex flex-col sm:flex-row ${
              isLeft ? "sm:flex-row-reverse" : ""
            } items-start justify-between gap-5`}
          >
            {/* Candidate Details Table: takes remaining width without collision */}
            <div className="flex-1 w-full min-w-0">
              <table className="w-full text-[12px] border border-slate-300 border-collapse table-fixed">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 w-36 sm:w-40 border-r border-slate-200 shrink-0">
                      Hall Ticket No
                    </td>
                    <td className="px-3 py-2 font-mono font-extrabold text-[#0B192C] break-all">
                      {studentFound && preview?.hallTicketNo
                        ? preview.hallTicketNo
                        : `HT-${template.academicYear.replace(/\s+/g, "") || "2026-2027"}-${preview?.semester ? String(preview.semester).replace(/\D/g, '') : "1"}-SAMPLE`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Register Number
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-900 break-all">
                      {studentFound && preview?.registerNumber ? preview.registerNumber : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Student Name
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 uppercase break-words">
                      {studentFound && preview?.name ? preview.name : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Date of Birth
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-800">
                      {studentFound && preview?.dateOfBirth ? preview.dateOfBirth : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Degree &amp; Branch
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 break-words">
                      {studentFound && preview?.degreeBranch ? preview.degreeBranch : "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Semester
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900">
                      {studentFound && preview?.semester ? preview.semester : "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 bg-slate-50 font-bold text-slate-700 border-r border-slate-200">
                      Examination Centre
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 break-words">
                      {template.examinationCentre?.trim() ? (
                        template.examinationCentre.trim()
                      ) : (
                        <span className="text-rose-600 font-semibold italic">
                          (Not specified - required before Fix)
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Photo Box: Fixed size, clean spacing, never covers text */}
            {photoBox}
          </div>
        )}

        {/* Papers Section */}
        <div
          style={{
            transform: `translate(${layout.papers.x}mm, ${layout.papers.y}mm)`,
            fontSize: `${layout.papers.fontSize}pt`,
          }}
          className="space-y-2 pt-2"
        >
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <span className="font-extrabold uppercase text-[12px] text-slate-900 tracking-wider">
              Examination Papers
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-600">
              Total Papers: {preview?.papers?.length || 0}
            </span>
          </div>

          <table className="w-full text-[12px] border border-slate-300 border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-left">
                <th className="px-2 py-2 w-10 text-center border-r border-slate-300">S.No</th>
                <th className="px-2.5 py-2 w-24 border-r border-slate-300">Code</th>
                <th className="px-3 py-2 border-r border-slate-300">Subject Title</th>
                <th className="px-2.5 py-2 w-20 border-r border-slate-300">Semester</th>
                <th className="px-2.5 py-2 w-28 border-r border-slate-300">Date</th>
                <th className="px-2 py-2 w-16 text-center border-r border-slate-300">Session</th>
                <th className="px-2 py-2 w-20 text-center">Type</th>
              </tr>
            </thead>
            <tbody>
              {preview?.papers && preview.papers.length > 0 ? (
                preview.papers.map((p, idx) => {
                  const hasExamEntry = Boolean(p.examDate && p.session);
                  const formattedDate = formatDate(p.examDate);
                  const isPractical = p.examType === "PRACTICAL";
                  return (
                    <tr key={idx} className="border-b border-slate-200 even:bg-slate-50/50">
                      <td className="px-2 py-2 text-center font-mono text-slate-600 border-r border-slate-200">
                        {p.sno || idx + 1}
                      </td>
                      <td className="px-2.5 py-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                        {p.subjectCode}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-200 break-words">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{p.subjectTitle}</span>
                          {hasExamEntry ? (
                            <span className="inline-block text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
                              {formattedDate} - {p.session}
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                              Exam entry missing
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-slate-700 border-r border-slate-200">
                        {p.paperSemester || `Semester ${template.semester || 1}`}
                      </td>
                      <td className="px-2.5 py-2 font-mono text-slate-800 border-r border-slate-200">
                        {p.examDate ? (
                          formattedDate
                        ) : (
                          <span className="text-red-600 font-bold text-[10px]">Exam entry missing</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                        {p.session || "-"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            p.paperType === "ARREAR"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isPractical
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {p.paperType === "ARREAR" ? "ARREAR" : isPractical ? "PRACTICAL" : "THEORY"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500 italic">
                    {studentFound
                      ? "No registered examination papers found for this student."
                      : "Paper schedule will appear here when student is loaded."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Instructions / Notes Section */}
        <div
          style={{
            transform: `translate(${layout.notes.x}mm, ${layout.notes.y}mm)`,
            fontSize: `${layout.notes.fontSize}pt`,
          }}
          className="space-y-2 border-t border-slate-300 pt-3"
        >
          <p className="font-extrabold uppercase text-[12px] text-slate-950 tracking-wider">
            Important Instructions to Candidates:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-slate-800 text-[12px]">
            {template.notes && template.notes.length > 0 ? (
              template.notes.map((note, idx) => (
                <li key={idx} className="leading-snug break-words">
                  {note}
                </li>
              ))
            ) : (
              <li className="italic text-rose-600">No instructions configured.</li>
            )}
          </ol>
        </div>

        {/* Signatures Section: Centred with full captions visible */}
        <div
          style={{
            transform: `translate(${layout.signatures.x}mm, ${layout.signatures.y}mm)`,
            fontSize: `${layout.signatures.fontSize}pt`,
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-200 text-center"
        >
          <div className="space-y-1.5">
            <div className="border-t-2 border-slate-700 pt-2">
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight break-words">
                {template.sigCandidate || "Signature of the candidate"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="border-t-2 border-slate-700 pt-2">
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight break-words">
                {template.sigCoe || "Controller of Examinations"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="border-t-2 border-slate-700 pt-2">
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight break-words">
                {template.sigPrincipal || "Principal"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-100/70 p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-inner space-y-4">
      {/* Header Bar with Full Preview button */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-[#D4A72C]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">
            Reference Hall Ticket Preview (Portrait A4)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullScreen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-1.5 shadow-sm"
            title="Open large full-screen preview with zoom & print"
          >
            <Maximize2 size={13} />
            <span>Full Preview</span>
          </button>
        </div>
      </div>

      {!studentFound && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-900 text-xs font-bold">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <span>No students for this academic year, batch and semester. Showing reference layout.</span>
        </div>
      )}

      {/* Main preview container: guaranteed minimum width on desktop, scaled A4 */}
      <div className="w-full overflow-x-auto py-2">
        <div className="min-w-[640px] max-w-[820px] mx-auto">
          {renderTicketContent(false)}
        </div>
      </div>

      {/* Full Preview Modal with Zoom, Print, and Escape close */}
      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          {/* Scoped Print CSS */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              body * {
                visibility: hidden !important;
              }
              #portrait-hall-ticket-print, #portrait-hall-ticket-print * {
                visibility: visible !important;
              }
              #portrait-hall-ticket-print {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 12px !important;
                border: none !important;
                box-shadow: none !important;
              }
            }
          `}</style>

          {/* Modal Header */}
          <div className="bg-[#0B192C] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide">
                Official Hall Ticket Full Preview
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                {preview?.registerNumber ? `${preview.registerNumber} - ${preview.name}` : "A4 Portrait Layout"}
              </p>
            </div>

            {/* Controls: Zoom, Print, Close */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Zoom Controls (50% to 150%) */}
              <div className="flex items-center bg-white/10 rounded-xl p-1 border border-white/20">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 10))}
                  disabled={zoom <= 50}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white disabled:opacity-30 transition"
                  title="Zoom Out (min 50%)"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-xs font-mono font-bold px-2 text-white min-w-[50px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(150, z + 10))}
                  disabled={zoom >= 150}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white disabled:opacity-30 transition"
                  title="Zoom In (max 150%)"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={() => setZoom(100)}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition ml-1"
                  title="Reset Zoom (100%)"
                >
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-white text-[#0B192C] text-xs font-black hover:bg-slate-100 transition shadow-sm flex items-center gap-1.5"
              >
                <Printer size={15} />
                <span>Print</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsFullScreen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Scrollable Area with Zoom Scale */}
          <div className="flex-1 overflow-auto p-4 sm:p-10 flex justify-center items-start">
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
              className="w-full max-w-[820px] pb-12"
            >
              {renderTicketContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


