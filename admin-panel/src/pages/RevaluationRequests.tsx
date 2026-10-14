import React, { useEffect, useState } from "react";
import { RotateCcw, RefreshCw } from "lucide-react";
import { revaluationApi, RevaluationRequest, apiErrorMessage } from "../services/api";
import { getActiveCollege } from "../utils/rbac";

const STATUSES: RevaluationRequest["status"][] = ["SUBMITTED", "IN_REVIEW", "COMPLETED", "REJECTED"];
const tone: Record<RevaluationRequest["status"], string> = {
  SUBMITTED: "bg-amber-100 text-amber-800 border-amber-200",
  IN_REVIEW: "bg-sky-100 text-sky-800 border-sky-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

/** The COE's inbox of student revaluation / answer-script photocopy requests (this college only). */
export const RevaluationRequestsPage: React.FC = () => {
  const college = getActiveCollege();
  const [requests, setRequests] = useState<RevaluationRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"OPEN" | "ALL">("OPEN");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => {
    revaluationApi
      .list()
      .then((list) => {
        setRequests(list);
        setError(null);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load the revaluation requests.")));
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const update = async (r: RevaluationRequest, status: RevaluationRequest["status"]) => {
    setBusy(r.id);
    try {
      await revaluationApi.setStatus(r.id, status, notes[r.id] ?? r.note ?? "");
      load();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not update the request."));
    }
    setBusy(null);
  };

  const shown = requests.filter((r) => filter === "ALL" || r.status === "SUBMITTED" || r.status === "IN_REVIEW");

  return (
    <div className="space-y-6 w-full">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            {college.shortName} · Student requests
          </span>
          <h2 className="font-display text-2xl font-bold">Revaluation Requests</h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Students apply while the Super Admin's revaluation window is open. Mark each request in review, completed or
            rejected; the student sees the status and your note on their result page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "OPEN" | "ALL")}
            className="h-9 rounded-lg bg-white/10 border border-white/20 px-2.5 text-xs font-semibold text-white"
          >
            <option value="OPEN" className="text-[#0B192C]">Open requests</option>
            <option value="ALL" className="text-[#0B192C]">All requests</option>
          </select>
          <button onClick={load} className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800">{error}</div>}

      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-left text-xs min-w-[860px]">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3">Reference / Applied</th>
                <th className="p-3">Student</th>
                <th className="p-3">Results</th>
                <th className="p-3">Subjects</th>
                <th className="p-3 text-right">Fee</th>
                <th className="p-3">Status</th>
                <th className="p-3">Note & action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold">
                    <RotateCcw size={22} className="mx-auto text-gray-300 mb-2" />
                    {filter === "OPEN" ? "No open revaluation requests." : "No revaluation requests yet."}
                  </td>
                </tr>
              ) : (
                shown.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-[#F8F5EE]/60">
                    <td className="p-3">
                      <span className="font-mono font-bold text-[#0B192C] block">{r.refId}</span>
                      <span className="text-[10px] text-gray-500">{r.createdAt}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-[#0B192C] block">{r.studentName}</span>
                      <span className="text-[10px] font-mono text-gray-500">{r.regNo} · {r.departmentName}</span>
                    </td>
                    <td className="p-3 font-semibold text-gray-800">
                      {r.semester}
                      <span className="block text-[10px] text-gray-500">{r.assessmentType}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">{r.subjectCodes.join(", ")}</td>
                    <td className="p-3 text-right font-bold">₹{r.totalFee}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${tone[r.status]}`}>
                        {r.status === "IN_REVIEW" ? "IN REVIEW" : r.status}
                      </span>
                      {r.updatedBy && <span className="block text-[10px] text-gray-400 mt-1">{r.updatedBy}</span>}
                    </td>
                    <td className="p-3 space-y-2 min-w-[240px]">
                      <input
                        value={notes[r.id] ?? r.note ?? ""}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                        maxLength={500}
                        placeholder="Note for the student (optional)"
                        className="w-full h-8 rounded-lg border border-[#E5E1D8] px-2 text-[11px]"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.filter((s) => s !== "SUBMITTED").map((s) => (
                          <button
                            key={s}
                            disabled={busy === r.id || r.status === s}
                            onClick={() => update(r, s)}
                            className="px-2.5 py-1 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#F8F5EE] disabled:opacity-40 text-[10px] font-extrabold text-[#0B192C]"
                          >
                            {s === "IN_REVIEW" ? "In review" : s === "COMPLETED" ? "Completed" : "Reject"}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
