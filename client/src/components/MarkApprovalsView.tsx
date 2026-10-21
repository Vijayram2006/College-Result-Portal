import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, ShieldCheck, Undo2 } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";

/**
 * Forwarded marks waiting for the HOD's or the Associate Dean's approval before the COE may publish them. Which
 * approvals are needed is set by the Chief COE; when neither is, this list is informational only.
 */

interface ApprovalItem {
  batchId: string;
  departmentName: string;
  semester: string;
  assessmentType: string;
  subjectCode: string;
  subjectTitle: string;
  students: number;
  passPercentage: number;
  forwardedBy: string;
  forwardedAt: string;
  hodApprovedBy: string | null;
  hodApprovedAt: string | null;
  deanApprovedBy: string | null;
  deanApprovedAt: string | null;
  returnedBy: string | null;
  returnReason: string | null;
  waitingForYou: boolean;
}

interface Overview {
  hodApproval: boolean;
  deanApproval: boolean;
  items: ApprovalItem[];
}

export function MarkApprovalsView({ role }: { role: "hod" | "dean" }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [returning, setReturning] = useState<ApprovalItem | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    apiClient
      .get<Overview>(`/${role}/mark-approvals`)
      .then((r) => {
        setData(r.data);
        setError(null);
      })
      .catch((e) => setError(apiErrorMessage(e, "Could not load the forwarded marks.")));
  }, [role]);

  useEffect(load, [load]);

  const act = async (item: ApprovalItem, action: "approve" | "return") => {
    setBusy(item.batchId);
    try {
      await apiClient.post(`/${role}/mark-approvals/${encodeURIComponent(item.batchId)}/${action}`,
        action === "return" ? { reason: reason.trim() } : {});
      setMessage(action === "approve" ? `${item.subjectCode} approved.` : `${item.subjectCode} returned to the faculty.`);
      setReturning(null);
      setReason("");
      load();
    } catch (e) {
      alert(apiErrorMessage(e, "The action could not be completed."));
    } finally {
      setBusy(null);
    }
  };

  const needed = data ? [data.hodApproval && "HOD", data.deanApproval && "Associate Dean"].filter(Boolean).join(" → ") : "";
  const mine = role === "hod" ? data?.hodApproval : data?.deanApproval;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-[#0B192C]">Approval of forwarded marks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {data
                ? needed
                  ? `Set by the Chief COE: Faculty → ${needed} → COE publishes.`
                  : "The Chief COE has not asked for approvals: faculty forward straight to the COE. You can still return marks that need correction."
                : "Loading..."}
            </p>
          </div>
        </div>
        <button onClick={load} className="self-start inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RotateCcw size={13} /> Refresh
        </button>
      </div>

      {message && (
        <p role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={14} /> {message}
        </p>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      {!data && !error && (
        <p className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </p>
      )}
      {data && data.items.length === 0 && <p className="py-6 text-center text-xs text-slate-500">No forwarded marks are waiting.</p>}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Subject</th>
                {role === "dean" && <th className="px-4 py-3">Department</th>}
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Students / pass</th>
                <th className="px-4 py-3">Forwarded</th>
                <th className="px-4 py-3">Approvals</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((i) => (
                <tr key={i.batchId} className={i.waitingForYou && mine ? "bg-amber-50/50" : ""}>
                  <td className="px-4 py-3"><span className="font-mono text-[11px]">{i.subjectCode}</span><br /><span className="text-slate-500">{i.subjectTitle}</span></td>
                  {role === "dean" && <td className="px-4 py-3">{i.departmentName}</td>}
                  <td className="px-4 py-3">{i.semester} · {i.assessmentType}</td>
                  <td className="px-4 py-3">{i.students} · {i.passPercentage}%</td>
                  <td className="px-4 py-3 text-slate-500">{i.forwardedBy}<br />{i.forwardedAt}</td>
                  <td className="px-4 py-3">
                    {i.returnedBy ? (
                      <span className="text-rose-700 font-bold">Returned: {i.returnReason}</span>
                    ) : (
                      <>
                        <span className="block">HOD: {i.hodApprovedBy ? `✓ ${i.hodApprovedAt}` : data.hodApproval ? "waiting" : "not needed"}</span>
                        <span className="block">Assoc. Dean: {i.deanApprovedBy ? `✓ ${i.deanApprovedAt}` : data.deanApproval ? "waiting" : "not needed"}</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!i.returnedBy && (
                      <div className="inline-flex gap-2">
                        {i.waitingForYou && mine && (
                          <button onClick={() => act(i, "approve")} disabled={busy !== null}
                            className="px-3 py-1.5 rounded-lg bg-[#0B192C] text-white font-bold disabled:opacity-50">
                            {busy === i.batchId ? "..." : "Approve"}
                          </button>
                        )}
                        <button onClick={() => { setReturning(i); setReason(""); }} disabled={busy !== null}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 font-bold inline-flex items-center gap-1 disabled:opacity-50">
                          <Undo2 size={12} /> Return
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {returning && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-[#0B192C]">Return {returning.subjectCode} to the faculty</h3>
            <p className="text-xs text-slate-500">The marks cannot be published until the faculty correct them and forward them again.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3}
              placeholder="What needs to be corrected (at least 5 characters)"
              className="w-full rounded-xl border border-slate-200 p-3 text-xs" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReturning(null)} className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={() => act(returning, "return")} disabled={busy !== null || reason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold disabled:opacity-50">Return marks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
