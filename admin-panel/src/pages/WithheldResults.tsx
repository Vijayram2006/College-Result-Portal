import React, { useEffect, useState } from "react";
import { ShieldAlert, Unlock } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { isSuperAdmin } from "../utils/rbac";

/*
 * Withheld results (requirements REQ-15): the COE holds back a student's published result of a semester and
 * assessment with a reason code (WH1 malpractice, WH2 fee dues, WH3 attendance shortage). The student sees
 * "Withheld" and the reason instead of the marks until the COE releases it.
 */

type Code = { code: string; description: string };
type Withhold = { regNo: string; name: string; deptKey: string; semester: string; assessmentType: string; code: string; description: string; reason: string | null; setBy: string; setAt: string };

const input = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#0B192C]";
const label = "block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1";

export const WithheldResultsPage: React.FC = () => {
  const viewOnly = isSuperAdmin();
  const [codes, setCodes] = useState<Code[]>([]);
  const [rows, setRows] = useState<Withhold[] | null>(null);
  const [form, setForm] = useState({ regNo: "", semester: "Semester I", assessmentType: "End Semester", code: "WH1", reason: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient.get<Code[]>("/admin/withholds/codes").then((r) => setCodes(r.data)).catch(() => setCodes([]));
    apiClient.get<Withhold[]>("/admin/withholds").then((r) => setRows(r.data)).catch((e) => setError(apiErrorMessage(e, "Could not load.")));
  }, []);

  const run = async (fn: () => Promise<{ data: Withhold[] }>) => {
    setBusy(true);
    setError("");
    try {
      setRows((await fn()).data);
    } catch (e) {
      setError(apiErrorMessage(e, "The action failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0"><ShieldAlert size={18} /></div>
          <div>
            <h2 className="font-display font-bold text-xl text-[#0B192C]">Withheld Results</h2>
            <p className="text-xs text-gray-500 mt-0.5">Hold back a student's result with a reason code. The student sees "Withheld" until you release it.</p>
          </div>
        </div>
        {!viewOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <label className="sm:col-span-2"><span className={label}>Register number</span><input className={input} value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} /></label>
            <label><span className={label}>Semester</span><select className={input} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>{SEMESTER_OPTIONS.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className={label}>Assessment</span><select className={input} value={form.assessmentType} onChange={(e) => setForm({ ...form, assessmentType: e.target.value })}>{["IAT-1", "IAT-2", "End Semester"].map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="sm:col-span-2"><span className={label}>Reason code</span><select className={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>{codes.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.description}</option>)}</select></label>
            <label className="sm:col-span-5"><span className={label}>Note to the student (optional)</span><input className={input} maxLength={300} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>
            <button disabled={busy || !form.regNo.trim()} onClick={() => run(() => apiClient.put<Withhold[]>("/admin/withholds", form))}
              className="h-10 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-black disabled:opacity-50">Withhold result</button>
          </div>
        )}
        {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</p>}
      </div>

      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        {rows?.length === 0 && <p className="text-xs text-gray-500">No results are withheld.</p>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                <tr>{["Student", "Department", "Result", "Code", "Note", "Withheld by", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((w) => (
                  <tr key={w.regNo + w.semester + w.assessmentType}>
                    <td className="px-3 py-2"><span className="font-semibold">{w.name}</span><br /><span className="font-mono text-gray-500">{w.regNo}</span></td>
                    <td className="px-3 py-2">{w.deptKey.toUpperCase().replace(/^AIDS$/, "ADS")}</td>
                    <td className="px-3 py-2">{w.semester} · {w.assessmentType}</td>
                    <td className="px-3 py-2 font-black text-rose-700">{w.code} · {w.description}</td>
                    <td className="px-3 py-2">{w.reason || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{w.setBy}<br />{new Date(w.setAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-3 py-2 text-right">
                      {!viewOnly && (
                        <button disabled={busy} onClick={() => run(() => apiClient.delete<Withhold[]>("/admin/withholds", { params: { regNo: w.regNo, semester: w.semester, assessment: w.assessmentType } }))}
                          className="h-8 px-3 rounded-lg border border-emerald-300 text-emerald-800 font-bold inline-flex items-center gap-1"><Unlock size={12} /> Release</button>
                      )}
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
};

export default WithheldResultsPage;
