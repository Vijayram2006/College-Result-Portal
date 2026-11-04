import React, { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, RotateCcw } from "lucide-react";
import { apiClient, apiErrorMessage } from "../../services/api";

/**
 * The Associate Dean's view of paper correction (read-only): the COE allots each subject's answer scripts to
 * evaluating faculty; the Dean follows every evaluator's progress and mark average. No student identities are shown.
 */

interface Bundle {
  evaluatorId: number;
  username: string;
  name: string;
  deptCode: string;
  first: number;
  last: number;
  scripts: number;
  evaluated: number;
  average: number;
}

interface SubjectAllotment {
  subjectCode: string;
  subjectTitle: string;
  scripts: number;
  evaluated: number;
  allottedBy: string | null;
  allottedAt: string | null;
  bundles: Bundle[];
}

const SEMESTERS = ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI", "Semester VII", "Semester VIII"];
const ASSESSMENTS = ["IAT-1", "IAT-2", "End Semester"] as const;

interface PaperCorrectionViewProps {
  onToast?: (msg: string) => void;
}

export const PaperCorrectionView: React.FC<PaperCorrectionViewProps> = () => {
  const [departments, setDepartments] = useState<{ key: string; name: string; code: string }[]>([]);
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("Semester I");
  const [assessment, setAssessment] = useState<(typeof ASSESSMENTS)[number]>("End Semester");
  const [subjects, setSubjects] = useState<SubjectAllotment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ key: string; name: string; code: string; status?: string }[]>("/admin/departments")
      .then((r) => {
        const active = r.data.filter((d) => d.status !== "INACTIVE");
        setDepartments(active);
        if (active.length) setDept((cur) => cur || active[0].key);
      })
      .catch((e) => setError(apiErrorMessage(e, "Could not load the departments.")));
  }, []);

  const load = React.useCallback(() => {
    if (!dept) return;
    setLoading(true);
    setError(null);
    apiClient.get<SubjectAllotment[]>("/dean/paper-allotments", { params: { dept, semester, assessment } })
      .then((r) => setSubjects(r.data))
      .catch((e) => { setSubjects([]); setError(apiErrorMessage(e, "Could not load the paper-correction progress.")); })
      .finally(() => setLoading(false));
  }, [dept, semester, assessment]);
  useEffect(load, [load]);

  const totalScripts = subjects.reduce((n, s) => n + s.scripts, 0);
  const totalEvaluated = subjects.reduce((n, s) => n + s.evaluated, 0);
  const evaluators = new Set(subjects.flatMap((s) => s.bundles.map((b) => b.evaluatorId))).size;
  const allotted = subjects.filter((s) => s.bundles.length > 0).length;
  const deptCode = departments.find((d) => d.key === dept)?.code || dept.toUpperCase();

  const select = "mt-1 w-full bg-[#F8F5EE] border border-[#E5E1D8] rounded-xl px-3 py-2.5 text-sm font-bold text-[#0B192C] normal-case tracking-normal focus:outline-none focus:border-[#D4A72C]";

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0">
              <ClipboardList size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#0B192C]">Paper Correction Progress</h1>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                The COE allots each subject's answer scripts to evaluating faculty. Follow every evaluator's progress and
                mark average here (view only). Scripts are shown under dummy numbers only.
              </p>
            </div>
          </div>
          <button onClick={load} className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5">
            <RotateCcw size={14} /> Refresh
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Department
            <select value={dept} onChange={(e) => setDept(e.target.value)} className={select}>
              {departments.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Semester
            <select value={semester} onChange={(e) => setSemester(e.target.value)} className={select}>
              {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Assessment
            <div className="mt-1 grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {ASSESSMENTS.map((a) => (
                <button key={a} type="button" onClick={() => setAssessment(a)}
                  className={`py-2 rounded-lg text-xs font-black normal-case tracking-normal transition ${assessment === a ? "bg-[#0B192C] text-[#D4A72C] shadow" : "text-slate-600 hover:bg-white"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Subjects allotted", `${allotted} / ${subjects.length}`],
            ["Evaluating faculty", String(evaluators)],
            ["Scripts evaluated", `${totalEvaluated} / ${totalScripts}`],
            ["Progress", `${totalScripts ? Math.round((totalEvaluated / totalScripts) * 100) : 0}%`],
          ].map(([label, value]) => (
            <div key={label} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E5E1D8]">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
              <span className="block text-2xl font-black text-[#0B192C] mt-1">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 text-sm font-black text-[#0B192C]">
          {deptCode} · {semester} · {assessment}
        </div>
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : subjects.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No subjects in {deptCode} {semester}.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subjects.map((s) => {
              const pct = s.scripts ? Math.round((s.evaluated / s.scripts) * 100) : 0;
              return (
                <div key={s.subjectCode} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-xs px-2 py-1 rounded-lg bg-[#0B192C] text-[#D4A72C]">{s.subjectCode}</span>
                    <span className="font-bold text-sm text-[#0B192C]">{s.subjectTitle}</span>
                    {s.bundles.length > 0 ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 size={11} /> Allotted by {s.allottedBy || "the COE"}{s.allottedAt ? ` · ${s.allottedAt}` : ""}</span>
                    ) : (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Waiting for the COE's allotment</span>
                    )}
                    <span className="ml-auto text-xs font-bold text-slate-600">{s.evaluated} / {s.scripts} evaluated ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  {s.bundles.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                            <th className="py-1.5 pr-3">Evaluator</th>
                            <th className="py-1.5 pr-3">Dept</th>
                            <th className="py-1.5 pr-3">Scripts</th>
                            <th className="py-1.5 pr-3">Evaluated</th>
                            <th className="py-1.5 pr-3">Mark average</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {s.bundles.map((b) => (
                            <tr key={b.evaluatorId}>
                              <td className="py-2 pr-3 font-bold text-[#0B192C]">{b.name} <span className="font-mono font-normal text-slate-500">({b.username})</span></td>
                              <td className="py-2 pr-3">{b.deptCode}</td>
                              <td className="py-2 pr-3 font-mono">{b.first}–{b.last} ({b.scripts})</td>
                              <td className="py-2 pr-3">{b.evaluated} / {b.scripts}</td>
                              <td className="py-2 pr-3">{b.evaluated ? b.average : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperCorrectionView;
