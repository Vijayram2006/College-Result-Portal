import React, { useState, useEffect, useCallback } from "react";
import {
  certificateApi,
  CertificateType,
  CertificateRequestView,
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPES,
} from "../../services/certificateApi";
import {
  Award,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
  Calendar,
} from "lucide-react";

export function StudentCertificateRequests() {
  const [requests, setRequests] = useState<CertificateRequestView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [certificateType, setCertificateType] = useState<CertificateType>("BONAFIDE");
  const [purpose, setPurpose] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await certificateApi.list();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedPurpose = purpose.trim();
    if (trimmedPurpose.length > 300) {
      setFormError("Purpose must not exceed 300 characters.");
      return;
    }

    try {
      setSubmitting(true);
      await certificateApi.create({
        certificateType,
        purpose: trimmedPurpose || undefined,
      });
      setPurpose("");
      setCertificateType("BONAFIDE");
      setFormSuccess("Your certificate request has been submitted successfully.");
      await loadRequests();
      setTimeout(() => setFormSuccess(null), 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Could not submit certificate request. Please try again.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock3 size={13} className="text-amber-500" />
            Submitted, waiting for HOD
          </span>
        );
      case "HOD_APPROVED":
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 size={13} className="text-blue-500" />
            Approved by HOD, waiting to be forwarded
          </span>
        );
      case "FORWARDED_TO_AO":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Forwarded to Administrative Office
          </span>
        );
      case "REJECTED_BY_HOD":
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle size={13} className="text-rose-500" />
            Rejected by HOD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const formatSubmittedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-IN", {
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
    <div className="w-full max-w-7xl space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-[#D4A72C]/40 text-[#D4A72C] shadow-inner">
              <Award size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Student Certificate Requests
              </h2>
              <p className="text-xs sm:text-sm font-bold text-[#D4A72C] uppercase tracking-wider mt-0.5">
                Apply for official university documents &amp; track issuance status
              </p>
            </div>
          </div>
          <div className="bg-white/10 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-mono font-bold">
            Module 2: Self-Service Certificates
          </div>
        </div>
      </div>

      {/* Main Request Form */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-[#F8F5EE]/40">
          <h3 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
            <FileText size={20} className="text-[#D4A72C]" />
            Request New Certificate
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Select the required document and optionally provide a brief reason for processing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm font-bold text-rose-800 flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Certificate Type Selection */}
            <div className="space-y-2">
              <label
                htmlFor="certificateType"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C]"
              >
                Certificate Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="certificateType"
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value as CertificateType)}
                className="w-full text-xs sm:text-sm font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-3.5 focus:border-[#0B192C] focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs"
              >
                {CERTIFICATE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CERTIFICATE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 font-medium">
                Official document recognized for academic, visa, and employment submissions.
              </p>
            </div>

            {/* Live Status Preview */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 space-y-1 self-start">
              <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Selected Document Summary
              </p>
              <p className="text-sm font-black text-[#0B192C]">
                {CERTIFICATE_TYPE_LABELS[certificateType]}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Initial Status:</span>
                {getStatusBadge("PENDING")}
              </div>
            </div>
          </div>

          {/* Purpose Textarea */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label
                htmlFor="purpose"
                className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C]"
              >
                Purpose / Remarks (Optional)
              </label>
              <span
                className={`text-xs font-mono font-bold ${
                  purpose.length > 300 ? "text-rose-600" : "text-slate-400"
                }`}
              >
                {purpose.length} / 300
              </span>
            </div>
            <textarea
              id="purpose"
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="State the purpose (e.g. Higher education application, passport renewal, internship verification)..."
              maxLength={350}
              className="w-full text-xs sm:text-sm font-medium text-[#0B192C] rounded-2xl border border-slate-300 bg-white p-4 focus:border-[#0B192C] focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs resize-none"
            />
            {purpose.length > 300 && (
              <p className="text-xs font-bold text-rose-600">
                Purpose must not exceed 300 characters.
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || purpose.trim().length > 300}
              className="bg-[#0B192C] hover:bg-[#152744] disabled:bg-slate-400 text-white text-xs sm:text-sm font-extrabold px-8 py-3.5 rounded-2xl shadow-lg transition duration-150 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Clock3 size={16} className="animate-spin text-[#D4A72C]" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send size={16} className="text-[#D4A72C]" />
                  <span>Submit Certificate Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Past Requests Table */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
              <Calendar size={20} className="text-[#D4A72C]" />
              My Past Certificate Requests
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review previously requested certificates and their live status
            </p>
          </div>
          <span className="text-xs font-extrabold bg-[#0B192C] text-[#D4A72C] px-3.5 py-1.5 rounded-full">
            Total Requests: {requests.length}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A72C] mx-auto mb-3" />
            Loading your certificate requests...
          </div>
        ) : error ? (
          <div className="m-6 p-6 text-center text-rose-600 font-semibold bg-rose-50 rounded-2xl border border-rose-200">
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Award size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-base text-[#0B192C]">No Certificate Requests Found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto font-medium">
              You haven't submitted any certificate requests yet. Use the form above to submit your first request.
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0B192C] text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wider sticky top-0 z-20">
                <tr>
                  <th className="px-6 py-4">CERTIFICATE TYPE</th>
                  <th className="px-6 py-4">SUBMITTED DATE</th>
                  <th className="px-6 py-4">PURPOSE / REMARKS</th>
                  <th className="px-6 py-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-black text-[#0B192C]">
                        {CERTIFICATE_TYPE_LABELS[req.certificateType] || req.certificateType}
                      </span>
                      <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                        REF #{req.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {formatSubmittedDate(req.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-md">
                      {req.purpose ? (
                        <div title={req.purpose} className="truncate">{req.purpose}</div>
                      ) : (
                        <span className="text-slate-400 italic">No purpose specified</span>
                      )}
                      {(req as any).hodRemarks && (
                        <div className="text-xs text-rose-600 font-semibold mt-0.5">
                          Reason: {(req as any).hodRemarks}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

