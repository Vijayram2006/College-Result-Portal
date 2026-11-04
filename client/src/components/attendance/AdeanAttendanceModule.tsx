import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Eye,
  Calendar,
  Users,
  Building2,
  FileCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Award,
  X
} from "lucide-react";
import {
  attendanceApi,
  type AttendanceBatchSummaryItem,
  type MonthlyBatchDetail
} from "../../services/api";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function AdeanAttendanceModule() {
  const [batches, setBatches] = useState<AttendanceBatchSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deptFilter, setDeptFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Review modal state
  const [selectedBatch, setSelectedBatch] = useState<MonthlyBatchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [actionRemarks, setActionRemarks] = useState<string>("");
  const [processingAction, setProcessingAction] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadBatches = () => {
    setLoading(true);
    attendanceApi
      .getAdeanBatches(
        deptFilter !== "ALL" ? deptFilter : undefined,
        statusFilter !== "ALL" ? statusFilter : undefined
      )
      .then((data) => {
        setBatches(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading ADEAN batches:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadBatches();
  }, [deptFilter, statusFilter]);

  const handleOpenReview = (batchId: string) => {
    setLoadingDetail(true);
    setActionRemarks("");
    attendanceApi
      .getMonthlyBatch({ batchId })
      .then((detail) => {
        setSelectedBatch(detail);
        setLoadingDetail(false);
      })
      .catch((err) => {
        console.error("Error loading detail:", err);
        setLoadingDetail(false);
      });
  };

  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    if (!selectedBatch) return;
    if (action === "REJECT" && !actionRemarks.trim()) {
      alert("Please provide remarks for returning the batch.");
      return;
    }

    setProcessingAction(true);
    try {
      const updated = await attendanceApi.adeanReviewBatch({
        batchId: selectedBatch.batchId,
        action,
        remarks: actionRemarks.trim() || (action === "APPROVE" ? "Approved by Associate Dean. Authorized for Student Portal publication." : "Returned for corrections."),
      });

      setSelectedBatch(updated);
      setFeedbackMsg(
        action === "APPROVE"
          ? "Monthly attendance batch approved and published to Student Portal successfully!"
          : "Monthly attendance returned with remarks."
      );
      setTimeout(() => setFeedbackMsg(null), 5000);
      loadBatches();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to process review.");
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.subjectCode.toLowerCase().includes(q) ||
      b.subjectTitle.toLowerCase().includes(q) ||
      b.facultyName.toLowerCase().includes(q) ||
      b.deptKey.toLowerCase().includes(q) ||
      b.batchId.toLowerCase().includes(q)
    );
  });

  const pendingCount = batches.filter((b) => b.status === "HOD_APPROVED").length;
  const publishedCount = batches.filter((b) => b.status === "ADEAN_APPROVED").length;

  return (
    <div className="space-y-6">
      {/* ADEAN Banner */}
      <div className="bg-[#0B192C] text-white p-6 rounded-3xl border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded font-mono font-black text-[10px] bg-[#D4A72C] text-[#0B192C] tracking-widest uppercase">
                ASSOCIATE DEAN GOVERNANCE
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Faculty of Engineering &bull; Institutional Attendance Approval
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2.5">
              <ShieldCheck className="text-[#D4A72C]" size={26} />
              Monthly Attendance Approval &amp; Portal Publication
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Final institutional review of department attendance submissions endorsed by Department Heads (HODs). Approving a batch publishes the subject attendance percentage and absent details to enrolled students.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-amber-500/20 border border-amber-500/40 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-black uppercase text-amber-300 block">Pending ADEAN Review</span>
              <span className="font-mono font-black text-lg text-white">{pendingCount}</span>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 rounded-2xl text-center">
              <span className="text-[10px] font-black uppercase text-emerald-300 block">Published to Students</span>
              <span className="font-mono font-black text-lg text-white">{publishedCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search subject, faculty, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/20 rounded-xl pl-9 pr-3 py-2 text-white font-medium focus:outline-none focus:border-[#D4A72C]"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[#D4A72C]"
            >
              <option value="ALL">All Departments</option>
              <option value="cse">CSE - Computer Science</option>
              <option value="aids">AIDS - Artificial Intelligence</option>
              <option value="ece">ECE - Electronics &amp; Comm</option>
              <option value="eee">EEE - Electrical &amp; Electronics</option>
              <option value="mech">MECH - Mechanical</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[#D4A72C]"
            >
              <option value="ALL">All Statuses</option>
              <option value="HOD_APPROVED">Pending ADEAN Approval</option>
              <option value="ADEAN_APPROVED">Approved &amp; Published</option>
              <option value="SUBMITTED_TO_HOD">Under HOD Scrutiny</option>
            </select>
          </div>

          <button
            onClick={loadBatches}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition flex items-center gap-1.5 self-end"
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Institutional Monthly Attendance Submissions ({filteredBatches.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Faculty of Engineering</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Month / Year</th>
                <th className="py-3 px-4 text-center">Conducted Classes</th>
                <th className="py-3 px-4 text-center">Class Avg %</th>
                <th className="py-3 px-4 text-center">Governance Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBatches.length > 0 ? (
                filteredBatches.map((b) => (
                  <tr key={b.batchId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FC6226] uppercase">
                      {b.deptKey}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.subjectCode}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{b.subjectTitle}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{b.facultyName}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {MONTH_NAMES[b.month]} {b.year}
                      <span className="block text-[10px] font-normal text-slate-400">Sem {b.semester}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                      {b.totalConducted} classes
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-black text-slate-900 text-sm">{b.classAveragePct}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          b.status === "ADEAN_APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "HOD_APPROVED"
                            ? "bg-purple-100 text-purple-800 animate-pulse"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.status === "HOD_APPROVED" ? "PENDING ADEAN APPROVAL" : b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReview(b.batchId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer ${
                          b.status === "HOD_APPROVED"
                            ? "bg-[#0B192C] text-[#D4A72C] hover:bg-[#172033] shadow"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <Eye size={13} />
                        <span>{b.status === "HOD_APPROVED" ? "Review & Publish" : "View Record"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    {loading ? "Loading attendance records..." : "No attendance submissions found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#0B192C] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-black text-[9px] bg-[#D4A72C] text-[#0B192C] tracking-wider uppercase">
                    ADEAN PUBLICATION REVIEW
                  </span>
                  <span className="font-mono text-xs text-slate-300">{selectedBatch.batchId}</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  {selectedBatch.subjectCode} - {selectedBatch.subjectTitle}
                </h3>
                <p className="text-xs text-slate-300">
                  Dept: <strong>{selectedBatch.deptKey.toUpperCase()}</strong> &bull; Faculty: <strong>{selectedBatch.facultyName}</strong> &bull; HOD Endorsement: <strong>{selectedBatch.hodName || "HOD"}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Prior HOD notes */}
              {selectedBatch.hodRemarks && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-purple-950">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-purple-700">
                    HOD Scrutiny Remarks &bull; {selectedBatch.hodName}
                  </span>
                  <p className="font-medium text-xs mt-1">{selectedBatch.hodRemarks}</p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Enrolled Students</span>
                  <span className="text-lg font-black text-slate-900">{selectedBatch.totalStudents}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Classes Conducted</span>
                  <span className="text-lg font-black text-slate-900">{selectedBatch.totalConducted} classes</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Class Average %</span>
                  <span className="text-lg font-black text-[#0B192C]">{selectedBatch.classAveragePct}%</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Status</span>
                  <span className="text-xs font-black text-purple-800 block mt-1">{selectedBatch.status.replace(/_/g, " ")}</span>
                </div>
              </div>

              {/* Student table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2">Student Performance Sheet ({selectedBatch.students?.length || 0} students)</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Reg No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3 text-center">Conducted</th>
                        <th className="py-2.5 px-3 text-center text-emerald-700">Attended</th>
                        <th className="py-2.5 px-3 text-center text-rose-700">Absent</th>
                        <th className="py-2.5 px-3 text-center text-blue-700">OD</th>
                        <th className="py-2.5 px-3 text-right">Attendance %</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {selectedBatch.students?.map((st, i) => (
                        <tr key={st.regNo} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{st.regNo}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{st.studentName}</td>
                          <td className="py-2 px-3 text-center font-mono">{st.conducted}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{st.attended}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-rose-700">{st.absent}</td>
                          <td className="py-2 px-3 text-center font-mono text-blue-700">{st.od}</td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">{st.percentage}%</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                st.percentage >= 75
                                  ? "bg-emerald-100 text-emerald-800"
                                  : st.percentage >= 65
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {st.percentage >= 75 ? "ELIGIBLE" : st.percentage >= 65 ? "CONDONATION" : "SHORTAGE"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ADEAN remarks */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Associate Dean Approval Remarks &amp; Publication Directives
                </label>
                <textarea
                  rows={2}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="Official approval note (e.g. Approved and authorized for Student Portal publication)..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#D4A72C]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Once published, students can immediately review their subject-wise percentages and absent dates.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Close
                </button>

                {selectedBatch.status === "HOD_APPROVED" && (
                  <>
                    <button
                      type="button"
                      disabled={processingAction}
                      onClick={() => handleReviewAction("REJECT")}
                      className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      <span>Return with Remarks</span>
                    </button>

                    <button
                      type="button"
                      disabled={processingAction}
                      onClick={() => handleReviewAction("APPROVE")}
                      className="px-5 py-2 rounded-xl bg-[#0B192C] text-[#D4A72C] border-2 border-[#D4A72C] font-black hover:bg-[#172033] shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      <span>Approve &amp; Publish to Student Portal</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
