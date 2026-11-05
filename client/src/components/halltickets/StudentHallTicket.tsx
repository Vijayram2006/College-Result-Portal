import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/api";
import {
  FileText,
  Printer,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Send,
  MessageSquare,
  ShieldAlert,
  User,
} from "lucide-react";
import { deptCode } from "../../hooks/useDepartments";

export interface PaperDTO {
  sNo: number;
  code: string;
  title: string;
  semester: string;
  isArrear?: boolean;
}

export interface StudentHallTicketData {
  published: boolean;
  regNo: string;
  name: string;
  dob: string;
  degreeAndBranch: string;
  semester: string;
  examCentre: string;
  hallTicketNo: string;
  papers: PaperDTO[];
}

export interface HallTicketQueryView {
  id: number;
  hallTicketId: number;
  studentReg: string;
  studentName: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  coeResponse?: string | null;
  respondedBy?: string | null;
  respondedAt?: string | null;
  createdAt: string;
}

export function StudentHallTicket() {
  const [ticket, setTicket] = useState<StudentHallTicketData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Query Form State
  const [queries, setQueries] = useState<HallTicketQueryView[]>([]);
  const [queryMessage, setQueryMessage] = useState<string>("");
  const [submittingQuery, setSubmittingQuery] = useState<boolean>(false);
  const [querySuccess, setQuerySuccess] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const loadTicketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Attempt to fetch published hall ticket from dedicated endpoint
      try {
        const res = await apiClient.get<any>("/student/hallticket/my-ticket");
        if (res.data && res.data.published && res.data.papers) {
          setTicket({
            published: true,
            regNo: res.data.regNo || "",
            name: res.data.name || "",
            dob: res.data.dob || "-",
            degreeAndBranch: res.data.degreeAndBranch || "",
            semester: res.data.semester || "",
            examCentre: res.data.examCentre || "-",
            hallTicketNo: res.data.hallTicketNo || `HT-${res.data.regNo}`,
            papers: res.data.papers || [],
          });
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.error("Hall ticket fetch /student/hallticket/my-ticket error:", err);
      }

      try {
        const resLegacy = await apiClient.get<any[]>("/student/hall-tickets");
        if (Array.isArray(resLegacy.data) && resLegacy.data.length > 0) {
          const t = resLegacy.data[0];
          if (t.status === "PUBLISHED") {
            const mappedPapers: PaperDTO[] = (t.schedule || []).map((s: any, idx: number) => ({
              sNo: idx + 1,
              code: s.subjectCode || "—",
              title: s.subjectTitle || "—",
              semester: `Semester ${t.semester || ""}`,
              isArrear: false,
            }));

            setTicket({
              published: true,
              regNo: t.studentReg || "",
              name: t.studentName || "",
              dob: "-",
              degreeAndBranch: t.deptName || deptCode(t.deptKey) || "",
              semester: `Semester ${t.semester}`,
              examCentre: "-",
              hallTicketNo: t.hallTicketNo || `HT-${t.studentReg}`,
              papers: mappedPapers,
            });
            setLoading(false);
            return;
          }
        }
      } catch (legacyErr: any) {
        console.error("Hall ticket legacy fetch /student/hall-tickets error:", legacyErr);
      }

      // If no published ticket is available
      setTicket(null);
    } catch (err: any) {
      console.error("Hall ticket general load error:", err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQueries = useCallback(async () => {
    try {
      const res = await apiClient.get<HallTicketQueryView[]>("/student/hall-tickets/queries");
      if (Array.isArray(res.data)) {
        setQueries(res.data);
      }
    } catch {
      // Query load optional
    }
  }, []);

  useEffect(() => {
    loadTicketData();
    loadQueries();
  }, [loadTicketData, loadQueries]);

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;
    setQueryError(null);
    setQuerySuccess(null);

    const msg = queryMessage.trim();
    if (!msg) {
      setQueryError("Please describe the issue or mistake.");
      return;
    }
    if (msg.length > 500) {
      setQueryError("Message cannot exceed 500 characters.");
      return;
    }

    try {
      setSubmittingQuery(true);
      const res = await apiClient.post<HallTicketQueryView>(`/student/hall-tickets/1/queries`, { message: msg });
      setQueryMessage("");
      setQuerySuccess("Your query has been submitted to the Controller of Examinations.");
      if (res.data) {
        setQueries((prev) => [res.data, ...prev]);
      }
      setTimeout(() => setQuerySuccess(null), 5000);
    } catch (err: any) {
      const errText =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Could not submit your query.";
      setQueryError(errText);
    } finally {
      setSubmittingQuery(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A72C] mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">Verifying hall ticket publication status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
        <AlertCircle size={48} className="mx-auto text-rose-500" />
        <h3 className="text-lg font-black text-[#0B192C]">Unable to Load Hall Ticket</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  // If the ticket has not been published yet by the COE:
  // Render the existing "No Published Hall Ticket Available" card exactly as it is.
  if (!ticket || !ticket.published) {
    return (
      <div className="w-full max-w-7xl bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
        <FileText size={48} className="mx-auto text-slate-300" />
        <h3 className="text-lg font-black text-[#0B192C]">No Published Hall Ticket Available</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          The hall ticket for your semester examination has not been published yet by the Controller of Examinations.
        </p>
      </div>
    );
  }

  // Published Hall Ticket View
  return (
    <div className="w-full max-w-7xl space-y-6 print:space-y-4">
      {/* Scoped print styling configured for single A4 page fit */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-hall-ticket, #printable-hall-ticket * {
            visibility: visible;
          }
          #printable-hall-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Controls Header (Hidden in Print View) */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden no-print">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#D4A72C] border border-[#D4A72C]/40">
            <FileText size={26} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
              Official Examination Hall Ticket
            </h2>
            <p className="text-xs font-bold text-[#D4A72C] uppercase tracking-wider mt-0.5">
              Verified &bull; Published by COE &bull; Ready for Download
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] text-xs font-black transition shadow-lg cursor-pointer"
          >
            <Printer size={16} />
            <span>Download / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Hall Ticket Document Area */}
      <div
        id="printable-hall-ticket"
        className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6"
      >
        {/* 1. TOP: KVELL University Logo & Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#0B192C] gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/kvell-logo.png"
              alt="KVELL University Logo"
              className="h-16 w-16 rounded-full bg-white p-0.5 border-2 border-[#D4A72C] shrink-0"
            />
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0B192C] tracking-wide">
                KVELL UNIVERSITY
              </h2>
              <p className="text-xs font-extrabold text-[#8A6410] uppercase tracking-wider mt-0.5">
                CONTROLLER OF EXAMINATIONS
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                END SEMESTER EXAMINATIONS &bull; ACADEMIC YEAR 2026 - 2027
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              HALL TICKET NUMBER
            </span>
            <span className="text-sm font-black font-mono text-[#0B192C]">
              {ticket.hallTicketNo}
            </span>
          </div>
        </div>

        {/* 2. Title Bar */}
        <div className="bg-[#0B192C] py-2 px-6 text-center rounded-xl border border-[#D4A72C]/40">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            HALL TICKET
          </h3>
        </div>

        {/* 3. Student Details Box with Photo on Right */}
        <div className="flex flex-col sm:flex-row gap-5 items-start justify-between bg-[#F8F5EE]/60 p-5 rounded-2xl border border-slate-200">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs w-full">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                REGISTER NUMBER
              </span>
              <span className="font-mono font-black text-[#0B192C] text-sm mt-0.5 block">
                {ticket.regNo}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                NAME
              </span>
              <span className="font-black text-[#0B192C] text-sm mt-0.5 block">
                {ticket.name}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                DATE OF BIRTH
              </span>
              <span className="font-bold text-[#0B192C] mt-0.5 block">
                {ticket.dob}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                CURRENT SEMESTER
              </span>
              <span className="font-bold text-[#0B192C] mt-0.5 block">
                {ticket.semester}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                DEGREE &amp; BRANCH
              </span>
              <span className="font-bold text-[#0B192C] mt-0.5 block">
                {ticket.degreeAndBranch}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                EXAMINATION CENTRE
              </span>
              <span className="font-bold text-[#0B192C] mt-0.5 block">
                {ticket.examCentre}
              </span>
            </div>
          </div>

          {/* Student Photo Placeholder */}
          <div className="w-28 h-36 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-white text-slate-400 p-2 text-center shrink-0 self-center sm:self-start">
            <User size={36} className="text-slate-300 mb-1" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Candidate Photo
            </span>
          </div>
        </div>

        {/* 4. Subjects Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Registered Examination Papers (Current &amp; Arrear Papers)
          </h4>
          <div className="rounded-xl border border-slate-300 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white text-[10px] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 w-14 text-center">S.No</th>
                  <th className="px-4 py-2.5 w-32">Subject Code</th>
                  <th className="px-4 py-2.5">Subject Title</th>
                  <th className="px-4 py-2.5 w-28 text-center">Semester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                {ticket.papers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No examination papers scheduled for this hall ticket.
                    </td>
                  </tr>
                ) : (
                  ticket.papers.map((p) => (
                    <tr key={p.code} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-center font-bold text-slate-500">
                        {p.sNo}
                      </td>
                      <td className="px-4 py-2 font-mono font-bold text-[#0B192C]">
                        {p.code}
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-900">
                        {p.title}
                      </td>
                      <td className="px-4 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {p.semester}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Notes for Examination Box */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 text-xs">
          <p className="font-extrabold text-[#0B192C] uppercase tracking-wider text-[11px]">
            Notes for Examination:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium text-[11px]">
            <li>Hall Ticket is mandatory for entry into the Examination Hall.</li>
            <li>Carry a valid College ID along with this Hall Ticket.</li>
            <li>Any malpractice will result in cancellation of the examination.</li>
            <li>Report to the Examination Centre at least 30 minutes before the commencement of the exam.</li>
          </ol>
        </div>

        {/* 6. Three Signature Blocks */}
        <div className="pt-6 grid grid-cols-3 gap-6 text-center border-t border-slate-300">
          <div>
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p className="text-[10px] font-bold text-slate-600 mt-2 uppercase tracking-wider">
              Signature of the Candidate
            </p>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p className="text-[10px] font-bold text-[#0B192C] mt-2 uppercase tracking-wider">
              Controller of Examinations
            </p>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-400" />
            <p className="text-[10px] font-bold text-[#0B192C] mt-2 uppercase tracking-wider">
              Principal
            </p>
          </div>
        </div>
      </div>

      {/* Discrepancy & Query Submission Section (Screen Only, Hidden in Print) */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 print:hidden no-print">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-[#F8F5EE]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare size={22} className="text-[#D4A72C]" />
            <div>
              <h3 className="text-base font-black text-[#0B192C]">Report a Mistake / Query to COE</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Found an error on your hall ticket (e.g. wrong subject, spelling mistake)? Send a query directly to the examination office.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmitQuery} className="p-6 sm:p-8 space-y-4">
          {queryError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{queryError}</span>
            </div>
          )}

          {querySuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{querySuccess}</span>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="queryMsg" className="font-extrabold text-[#0B192C] uppercase tracking-wider">
                Describe the Discrepancy
              </label>
              <span className={queryMessage.length > 500 ? "text-rose-600 font-bold" : "text-slate-400 font-mono"}>
                {queryMessage.length} / 500
              </span>
            </div>
            <textarea
              id="queryMsg"
              rows={3}
              value={queryMessage}
              onChange={(e) => setQueryMessage(e.target.value)}
              placeholder="e.g. Course code CS304 should be registered instead of CS302. Please verify..."
              maxLength={550}
              className="w-full text-xs sm:text-sm font-medium text-[#0B192C] rounded-2xl border border-slate-300 bg-white p-4 focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingQuery || queryMessage.trim().length > 500}
              className="bg-[#0B192C] hover:bg-[#152744] disabled:bg-slate-400 text-white text-xs font-extrabold px-6 py-3 rounded-2xl shadow transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {submittingQuery ? (
                <>
                  <Clock3 size={15} className="animate-spin text-[#D4A72C]" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={15} className="text-[#D4A72C]" />
                  <span>Submit Query to COE</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Queries & Replies */}
        {queries.length > 0 && (
          <div className="p-6 sm:p-8 border-t border-slate-100 bg-[#F8F5EE]/20 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Your Past Queries &amp; COE Responses
            </h4>
            <div className="space-y-3">
              {queries.map((q) => (
                <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      Query #{q.id} &bull; {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ""}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        q.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0B192C]">{q.message}</p>
                  {q.coeResponse && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 mt-2">
                      <span className="font-extrabold block text-blue-800">
                        COE Response ({q.respondedBy || "COE Office"}):
                      </span>
                      <p className="mt-0.5">{q.coeResponse}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
