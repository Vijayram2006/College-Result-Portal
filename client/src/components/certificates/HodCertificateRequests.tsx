import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  hodCertificateApi,
  HodCertificateView,
  HodCertificateStatus,
} from "../../services/hodCertificateApi";
import {
  Award,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
  Calendar,
  Filter,
  X,
  Check,
  Search,
  AlertTriangle,
  Info,
  User,
} from "lucide-react";

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  BONAFIDE: "Bonafide Certificate",
  MARKSHEET_10: "10th Marksheet",
  MARKSHEET_12: "12th Marksheet",
  TRANSFER_CERTIFICATE: "Transfer Certificate",
};

export function HodCertificateRequests() {
  const [requests, setRequests] = useState<HodCertificateView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Action modals
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [approveTarget, setApproveTarget] = useState<HodCertificateView | null>(null);
  const [approveRemarks, setApproveRemarks] = useState<string>("");

  const [rejectTarget, setRejectTarget] = useState<HodCertificateView | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState<string>("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const [forwardTarget, setForwardTarget] = useState<HodCertificateView | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hodCertificateApi.list();
      setRequests(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load certificate requests.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Counts summary
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let forwarded = 0;
    let rejected = 0;

    requests.forEach((r) => {
      if (r.status === "PENDING") pending++;
      else if (r.status === "HOD_APPROVED") approved++;
      else if (r.status === "FORWARDED_TO_AO") forwarded++;
      else if (r.status === "REJECTED_BY_HOD") rejected++;
    });

    return { total: requests.length, pending, approved, forwarded, rejected };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (r.studentName || "").toLowerCase().includes(q);
        const matchesReg = (r.studentReg || "").toLowerCase().includes(q);
        const matchesType = (CERTIFICATE_TYPE_LABELS[r.certificateType] || r.certificateType)
          .toLowerCase()
          .includes(q);
        if (!matchesName && !matchesReg && !matchesType) return false;
      }
      return true;
    });
  }, [requests, statusFilter, searchQuery]);

  // Actions
  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      setActionLoading(true);
      setError(null);
      await hodCertificateApi.approve(approveTarget.id, approveRemarks);
      setSuccessMessage(`Certificate request #${approveTarget.id} approved successfully.`);
      setApproveTarget(null);
      setApproveRemarks("");
      await loadRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to approve certificate request.";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const trimmed = rejectRemarks.trim();
    if (!trimmed) {
      setRejectError("Rejection reason is required.");
      return;
    }
    if (trimmed.length > 300) {
      setRejectError("Rejection reason must not exceed 300 characters.");
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      await hodCertificateApi.reject(rejectTarget.id, trimmed);
      setSuccessMessage(`Certificate request #${rejectTarget.id} has been rejected.`);
      setRejectTarget(null);
      setRejectRemarks("");
      setRejectError(null);
      await loadRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reject certificate request.";
      setRejectError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForward = async () => {
    if (!forwardTarget) return;
    try {
      setActionLoading(true);
      setError(null);
      await hodCertificateApi.forward(forwardTarget.id);
      setSuccessMessage(
        `Certificate request #${forwardTarget.id} forwarded to Administrative Office.`
      );
      setForwardTarget(null);
      await loadRequests();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to forward certificate request.";
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: HodCertificateStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-300">
            <Clock3 size={13} className="text-amber-500" />
            Pending Review
          </span>
        );
      case "HOD_APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-300">
            <CheckCircle2 size={13} className="text-blue-500" />
            Approved (To Forward)
          </span>
        );
      case "FORWARDED_TO_AO":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Forwarded to AO
          </span>
        );
      case "REJECTED_BY_HOD":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-300">
            <AlertCircle size={13} className="text-rose-500" />
            Rejected by HOD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D4A72C] text-[#0B192C]">
                Department Portal
              </span>
              <span className="text-xs text-amber-200/80 font-mono">
                Official Verification Workflow
              </span>
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              <Award className="text-[#D4A72C]" size={26} />
              Certificate Requests &amp; Approvals
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
              Review and approve student certificate applications for your department, and forward
              verified requests directly to the Administrative Office.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              disabled={loading}
              className="px-4 py-2 text-xs font-extrabold rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/15 cursor-pointer disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Required Release Note */}
        <div className="mt-6 p-4 rounded-2xl bg-[#D4A72C]/10 border border-[#D4A72C]/30 flex items-start gap-3 text-xs text-amber-200">
          <Info size={18} className="text-[#D4A72C] shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-[#D4A72C]">Workflow Notice: </span>
            Forwarded requests are sent to the Administrative Office. The AO portal is not part of this release.
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-700 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-500 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-700 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-700 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-700 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter("PENDING")}
          className={`p-4 rounded-2xl border text-left transition ${
            statusFilter === "PENDING"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-700">Pending Review</span>
            <Clock3 size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.pending}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Waiting for HOD decision</div>
        </button>

        <button
          onClick={() => setStatusFilter("HOD_APPROVED")}
          className={`p-4 rounded-2xl border text-left transition ${
            statusFilter === "HOD_APPROVED"
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-400/20"
              : "bg-white border-slate-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-blue-700">Approved to Forward</span>
            <CheckCircle2 size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.approved}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ready for AO dispatch</div>
        </button>

        <button
          onClick={() => setStatusFilter("FORWARDED_TO_AO")}
          className={`p-4 rounded-2xl border text-left transition ${
            statusFilter === "FORWARDED_TO_AO"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-700">Forwarded to AO</span>
            <Send size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.forwarded}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Dispatched to office</div>
        </button>

        <button
          onClick={() => setStatusFilter("REJECTED_BY_HOD")}
          className={`p-4 rounded-2xl border text-left transition ${
            statusFilter === "REJECTED_BY_HOD"
              ? "bg-rose-50 border-rose-300 ring-2 ring-rose-400/20"
              : "bg-white border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-rose-700">Rejected</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{counts.rejected}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Rejected with remarks</div>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "ALL", label: `All (${counts.total})` },
              { id: "PENDING", label: `Pending (${counts.pending})` },
              { id: "HOD_APPROVED", label: `Approved (${counts.approved})` },
              { id: "FORWARDED_TO_AO", label: `Forwarded (${counts.forwarded})` },
              { id: "REJECTED_BY_HOD", label: `Rejected (${counts.rejected})` },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#0B192C] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, reg no, type..."
              className="w-full text-xs font-medium pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0B192C] focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A72C] mx-auto mb-3" />
            Loading department certificate requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Award size={42} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-base text-slate-800">No Certificate Requests Found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {statusFilter !== "ALL"
                ? `There are currently no requests with status ${statusFilter.replace(/_/g, " ")}.`
                : "No certificate requests have been submitted by students of your department yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white text-[11px] font-black uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 border-r border-slate-800">Student Details</th>
                  <th className="px-5 py-3.5 border-r border-slate-800">Certificate Type</th>
                  <th className="px-5 py-3.5 border-r border-slate-800">Purpose</th>
                  <th className="px-5 py-3.5 border-r border-slate-800 whitespace-nowrap">Submitted Date</th>
                  <th className="px-5 py-3.5 border-r border-slate-800 text-center">Status</th>
                  <th className="px-5 py-3.5 border-r border-slate-800">HOD Remarks</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    {/* Student Details */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-[#0B192C]">{req.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{req.studentReg}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref #{req.id}</div>
                    </td>

                    {/* Certificate Type */}
                    <td className="px-5 py-3.5">
                      <div className="font-black text-slate-900">
                        {CERTIFICATE_TYPE_LABELS[req.certificateType] || req.certificateType}
                      </div>
                    </td>

                    {/* Purpose */}
                    <td className="px-5 py-3.5 max-w-xs">
                      {req.purpose ? (
                        <div title={req.purpose} className="line-clamp-2 text-slate-600">
                          {req.purpose}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No purpose specified</span>
                      )}
                    </td>

                    {/* Submitted Date */}
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>

                    {/* HOD Remarks */}
                    <td className="px-5 py-3.5 max-w-xs">
                      {req.hodRemarks ? (
                        <div className="space-y-0.5">
                          <p className="text-slate-800 font-semibold">{req.hodRemarks}</p>
                          {req.hodActionBy && (
                            <p className="text-[10px] text-slate-400">
                              By {req.hodActionBy} &bull; {req.hodActionAt ? formatDate(req.hodActionAt) : ""}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">&mdash;</span>
                      )}
                    </td>

                    {/* Actions by status */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {req.status === "PENDING" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setApproveTarget(req);
                              setApproveRemarks("");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(req);
                              setRejectRemarks("");
                              setRejectError(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          >
                            <X size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : req.status === "HOD_APPROVED" ? (
                        <button
                          onClick={() => setForwardTarget(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#0B192C] hover:bg-[#1b2d49] text-[#D4A72C] font-extrabold text-[11px] border border-[#D4A72C]/40 shadow-xs transition flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Send size={13} />
                          <span>Forward to AO</span>
                        </button>
                      ) : req.status === "FORWARDED_TO_AO" ? (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 size={13} /> Dispatched to AO
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          Closed (Rejected)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#0B192C] flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                Approve Certificate Request #{approveTarget.id}
              </h3>
              <button
                onClick={() => setApproveTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 text-xs text-slate-700">
              <div>
                <strong>Student:</strong> {approveTarget.studentName} ({approveTarget.studentReg})
              </div>
              <div>
                <strong>Certificate:</strong>{" "}
                {CERTIFICATE_TYPE_LABELS[approveTarget.certificateType] ||
                  approveTarget.certificateType}
              </div>
              {approveTarget.purpose && (
                <div>
                  <strong>Purpose:</strong> {approveTarget.purpose}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                HOD Remarks / Approval Note (Optional, max 300 characters):
              </label>
              <textarea
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Add verification notes or instructions for the administrative office..."
                className="w-full text-xs font-medium rounded-xl border border-slate-300 p-3 focus:border-[#0B192C] focus:outline-none resize-none"
              />
              <div className="text-right text-[10px] font-mono text-slate-400">
                {approveRemarks.length} / 300
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setApproveTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#0B192C] flex items-center gap-2">
                <AlertTriangle className="text-rose-600" size={20} />
                Reject Certificate Request #{rejectTarget.id}
              </h3>
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectError(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 text-xs text-slate-700">
              <div>
                <strong>Student:</strong> {rejectTarget.studentName} ({rejectTarget.studentReg})
              </div>
              <div>
                <strong>Certificate:</strong>{" "}
                {CERTIFICATE_TYPE_LABELS[rejectTarget.certificateType] ||
                  rejectTarget.certificateType}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Reason for Rejection <span className="text-rose-600 font-black">* (Required)</span>:
              </label>
              <textarea
                value={rejectRemarks}
                onChange={(e) => {
                  setRejectRemarks(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                maxLength={300}
                rows={3}
                placeholder="Enter mandatory reason explaining why this request cannot be approved..."
                className="w-full text-xs font-medium rounded-xl border border-rose-300 p-3 focus:border-rose-500 focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-rose-600 font-semibold">
                  {rejectError || "A reason is mandatory for rejection."}
                </span>
                <span className="font-mono text-slate-400">{rejectRemarks.length} / 300</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setRejectTarget(null);
                  setRejectError(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectRemarks.trim()}
                className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Confirmation Modal */}
      {forwardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#0B192C] flex items-center gap-2">
                <Send className="text-[#D4A72C]" size={20} />
                Forward Request #{forwardTarget.id} to AO
              </h3>
              <button
                onClick={() => setForwardTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl text-xs space-y-2 text-amber-900">
              <p className="font-bold">
                Are you sure you want to forward this HOD-approved certificate request to the
                Administrative Office (AO)?
              </p>
              <div className="font-medium text-slate-700">
                &bull; Student: {forwardTarget.studentName} ({forwardTarget.studentReg})
                <br />
                &bull; Certificate:{" "}
                {CERTIFICATE_TYPE_LABELS[forwardTarget.certificateType] ||
                  forwardTarget.certificateType}
                <br />
                &bull; Current Status: HOD Approved
              </div>
              <p className="text-[11px] text-amber-800">
                Once forwarded, the status will update to <strong>FORWARDED_TO_AO</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setForwardTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleForward}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-black bg-[#0B192C] hover:bg-[#1a2e4c] text-[#D4A72C] rounded-xl shadow-md border border-[#D4A72C]/40 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Forwarding..." : "Confirm Forward to AO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

