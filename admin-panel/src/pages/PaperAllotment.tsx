import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { apiClient, apiErrorMessage, departmentsApi, type DepartmentRecord } from "../services/api";

/**
 * Paper-correction allotment (COE): pick a department, semester and assessment, then choose the faculty who correct
 * each subject's answer scripts. The server splits the scripts equally, keeps each evaluator to their own bundle and
 * notifies the evaluators, their HOD and the Associate Dean.
 */

interface Evaluator {
  id: number;
  username: string;
  name: string;
  deptKey: string;
  deptCode: string;
  designation: string;
}

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

/** The equal split the server makes: the first (scripts % n) evaluators take one script more. */
function split(scripts: number, n: number): [number, number][] {
  const out: [number, number][] = [];
  if (n === 0) return out;
  const base = Math.floor(scripts / n);
  const extra = scripts % n;
  let next = 1;
  for (let i = 0; i < n; i++) {
    const count = base + (i < extra ? 1 : 0);
    out.push([next, next + count - 1]);
    next += count;
  }
  return out;
}

export const PaperAllotmentPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("Semester I");
  const [assessment, setAssessment] = useState<(typeof ASSESSMENTS)[number]>("End Semester");
  const [subjects, setSubjects] = useState<SubjectAllotment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // The allot dialog
  const [editing, setEditing] = useState<SubjectAllotment | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    departmentsApi.list().then((d) => {
      const active = d.filter((x) => x.status !== "INACTIVE");
      setDepartments(active);
      if (active.length) setDept((cur) => cur || active[0].key);
    }).catch((e) => setError(apiErrorMessage(e, "Could not load the departments.")));
    apiClient.get<Evaluator[]>("/admin/paper-allotments/evaluators").then((r) => setEvaluators(r.data))
      .catch((e) => setError(apiErrorMessage(e, "Could not load the faculty list.")));
  }, []);

  const load = React.useCallback(() => {
    if (!dept) return;
    setLoading(true);
    setError(null);
    apiClient.get<SubjectAllotment[]>("/admin/paper-allotments", { params: { dept, semester, assessment } })
      .then((r) => setSubjects(r.data))
      .catch((e) => { setSubjects([]); setError(apiErrorMessage(e, "Could not load the subjects.")); })
      .finally(() => setLoading(false));
  }, [dept, semester, assessment]);
  useEffect(load, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const openDialog = (s: SubjectAllotment) => {
    setEditing(s);
    setPicked(s.bundles.map((b) => b.evaluatorId));
    setSearch("");
  };

  const deptCode = departments.find((d) => d.key === dept)?.code || dept.toUpperCase();
  // The subject's own department first, then the others
  const shownEvaluators = useMemo(() => {
    const q = search.trim().toLowerCase();
    return evaluators
      .filter((e) => !q || `${e.name} ${e.username} ${e.deptCode} ${e.designation}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.deptKey === dept) - Number(a.deptKey === dept) || a.deptCode.localeCompare(b.deptCode) || a.name.localeCompare(b.name));
  }, [evaluators, search, dept]);

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    if (!editing || picked.length === 0) return;
    setSaving(true);
    try {
      await apiClient.put("/admin/paper-allotments", { dept, semester, subject: editing.subjectCode, assessment, evaluatorIds: picked });
      showToast(`${editing.subjectCode}: ${editing.scripts} scripts allotted to ${picked.length} evaluator${picked.length === 1 ? "" : "s"}. They have been notified.`);
      setEditing(null);
      load();
    } catch (e) {
      alert(apiErrorMessage(e, "The allotment could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (s: SubjectAllotment) => {
    if (!window.confirm(`Cancel the ${s.subjectCode} ${assessment} allotment? Its evaluators will be told and will no longer see these scripts.`)) return;
    try {
      await apiClient.delete("/admin/paper-allotments", { params: { dept, semester, subject: s.subjectCode, assessment } });
      showToast(`${s.subjectCode} allotment cancelled.`);
      load();
    } catch (e) {
      alert(apiErrorMessage(e, "The allotment could not be cancelled."));
    }
  };

  const allotted = subjects.filter((s) => s.bundles.length > 0).length;
  const preview = editing ? split(editing.scripts, picked.length) : [];
  const nameOf = (id: number) => evaluators.find((e) => e.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-5">
      {toast && (
        <div role="status" className="fixed top-20 right-6 z-50 bg-[#0B192C] text-[#D4A72C] px-5 py-3 rounded-2xl shadow-2xl border border-[#D4A72C] text-xs font-bold max-w-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0B192C]">Paper Correction Allotment</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Choose the faculty who correct each subject's answer scripts. The scripts are split equally under dummy
              numbers; each evaluator sees only their own bundle. The evaluators, their HOD and the Associate Dean are
              notified.
            </p>
          </div>
        </div>

        {/* Step 1: what to allot */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Department
            <select value={dept} onChange={(e) => setDept(e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-[#0B192C] normal-case tracking-normal focus:outline-none focus:ring-2 focus:ring-[#D4A72C]">
              {departments.map((d) => <option key={d.key} value={d.key}>{d.code} — {d.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Semester
            <select value={semester} onChange={(e) => setSemester(e.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-[#0B192C] normal-case tracking-normal focus:outline-none focus:ring-2 focus:ring-[#D4A72C]">
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
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {/* Step 2: subjects */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black text-[#0B192C]">
            {deptCode} · {semester} · {assessment}
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {allotted} of {subjects.length} subjects allotted
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading subjects…</div>
        ) : subjects.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No subjects in {deptCode} {semester}. Add them on the Subjects page first.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subjects.map((s) => {
              const pct = s.scripts ? Math.round((s.evaluated / s.scripts) * 100) : 0;
              return (
                <div key={s.subjectCode} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs px-2 py-1 rounded-lg bg-[#0B192C] text-[#D4A72C]">{s.subjectCode}</span>
                      <span className="font-bold text-sm text-[#0B192C]">{s.subjectTitle}</span>
                      {s.bundles.length > 0 ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 size={11} /> Allotted</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Not allotted</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span><strong className="text-[#0B192C]">{s.scripts}</strong> answer scripts</span>
                      <span>·</span>
                      <span><strong className="text-[#0B192C]">{s.evaluated}</strong> evaluated ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-md">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    {s.bundles.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {s.bundles.map((b) => (
                          <span key={b.evaluatorId} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                            <strong className="text-[#0B192C]">{b.name}</strong> ({b.deptCode}) · scripts {b.first}–{b.last} · {b.evaluated}/{b.scripts} done
                            {b.evaluated > 0 && <> · avg {b.average}</>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => openDialog(s)} disabled={s.scripts === 0}
                      title={s.scripts === 0 ? "No answer scripts for this subject" : undefined}
                      className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                      <UserPlus size={14} /> {s.bundles.length ? "Change evaluators" : "Allot evaluators"}
                    </button>
                    {s.bundles.length > 0 && (
                      <button onClick={() => cancel(s)} title="Cancel this allotment"
                        className="p-2.5 rounded-xl text-red-600 hover:bg-red-50 border border-red-200">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Allot dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label={`Allot ${editing.subjectCode}`} className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-[#0B192C]">Allot {editing.subjectCode} — {editing.subjectTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{deptCode} · {semester} · {assessment} · {editing.scripts} answer scripts</p>
              </div>
              <button onClick={() => setEditing(null)} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 min-h-0">
              {/* Faculty list */}
              <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col min-h-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">1. Tick the evaluators</p>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, staff ID or department"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A72C]" />
                </div>
                <div className="overflow-y-auto space-y-1.5 min-h-[160px] max-h-[45vh]">
                  {shownEvaluators.length === 0 && <p className="text-xs text-slate-500 p-2">No faculty found. Add faculty sign-ins first.</p>}
                  {shownEvaluators.map((e) => (
                    <label key={e.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition ${picked.includes(e.id) ? "border-[#D4A72C] bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={picked.includes(e.id)} onChange={() => toggle(e.id)} className="accent-[#0B192C] w-4 h-4" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-[#0B192C] truncate">{e.name}</span>
                        <span className="block text-[10px] text-slate-500 truncate">{e.username} · {e.deptCode}{e.designation ? ` · ${e.designation}` : ""}</span>
                      </span>
                      {e.deptKey === dept && <span className="text-[9px] font-black uppercase text-emerald-700">Same dept</span>}
                    </label>
                  ))}
                </div>
              </div>

              {/* Split preview */}
              <div className="p-5 flex flex-col min-h-0">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">2. Check the split</p>
                {picked.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-slate-500 gap-2 py-8">
                    <Users size={24} className="text-slate-300" />
                    Tick one or more faculty. The {editing.scripts} scripts are divided equally between them.
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto max-h-[45vh]">
                    {picked.map((id, i) => (
                      <div key={id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <span className="font-bold text-[#0B192C] truncate">{nameOf(id)}</span>
                        <span className="font-mono text-slate-600 shrink-0">
                          {preview[i] && preview[i][1] >= preview[i][0] ? `scripts ${preview[i][0]}–${preview[i][1]} (${preview[i][1] - preview[i][0] + 1})` : "no scripts"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {editing.bundles.length > 0 && (
                  <p className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    This replaces the current allotment. Marks already entered are kept.
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={save} disabled={saving || picked.length === 0 || picked.length > editing.scripts}
                className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-black flex items-center gap-1.5 disabled:opacity-40">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Allot to {picked.length || "…"} evaluator{picked.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaperAllotmentPage;
