import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, History, Lock, Plus, RefreshCw, Save, Settings2, Trash2, X } from "lucide-react";
import {
  apiErrorMessage,
  InternalBreakdown,
  InternalComponent,
  InternalConfig,
  InternalCycle,
  InternalHistoryItem,
  InternalRoster,
  InternalScheme,
  internalMarksApi,
  subjectsApi,
  SubjectRecord,
} from "../services/api";
import { getStoredDepartments, Department } from "./Departments";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { isSuperAdmin } from "../utils/rbac";

/*
 * Internal marks (COE): the college's formula, and every subject's internal marks with their change history.
 * Faculty enter the marks and the HOD corrects them (in the main portal); here they are view only. The Chief COE also only views the formula.
 * computeInternal / FormulaSummary are copies of client/src/components/InternalMarks.tsx (keep them in step).
 */

type Part = "quiz" | "activity" | "assignment";
type Cycle = "1" | "2";
const PARTS: Part[] = ["quiz", "activity", "assignment"];
const CYCLES: Cycle[] = ["1", "2"];
const PART_LABEL: Record<Part, string> = { quiz: "Quiz", activity: "Activity", assignment: "Assignment" };
const componentLabel = (k: string) =>
  k === "attendance" ? "Attendance" : `${PART_LABEL[k.replace(/\d$/, "") as Part] ?? k} (IAT-${k.slice(-1)})`;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 2));
const usedParts = (c: InternalConfig) => PARTS.filter((p) => c[p].weight > 0);
const cycleMax = (c: InternalConfig) => c.iatWeight + c.quiz.weight + c.activity.weight + c.assignment.weight;
const configTotal = (c: InternalConfig) => (c.cycleCombine === "SUM" ? 2 : 1) * cycleMax(c) + c.attendanceWeight;

function computeInternal(c: InternalConfig, v: Partial<Record<InternalComponent, number>>, iat1: number | null, iat2: number | null): InternalBreakdown {
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const part = (value: number | undefined, comp: { max: number; weight: number }) =>
    value == null || comp.weight === 0 ? 0 : (Math.min(value, comp.max) / comp.max) * comp.weight;
  const cycle = (n: Cycle, iat: number | null): InternalCycle => {
    const i = iat == null ? 0 : (iat / 100) * c.iatWeight;
    const q = part(v[`quiz${n}`], c.quiz);
    const a = part(v[`activity${n}`], c.activity);
    const s = part(v[`assignment${n}`], c.assignment);
    return { iat: r2(i), quiz: r2(q), activity: r2(a), assignment: r2(s), total: r2(i + q + a + s), max: cycleMax(c) };
  };
  const c1 = cycle("1", iat1);
  const c2 = cycle("2", iat2);
  const cycles = c.cycleCombine === "BEST" ? Math.max(c1.total, c2.total) : c.cycleCombine === "SUM" ? c1.total + c2.total : (c1.total + c2.total) / 2;
  const hours = v.attendance;
  const percent = hours == null ? null : Math.min(100, (hours / c.hoursPerSubject) * 100);
  let attendance = 0;
  if (percent != null && c.attendanceWeight > 0) {
    if (c.attendanceSlabs.length === 0) attendance = (percent / 100) * c.attendanceWeight;
    else attendance = [...c.attendanceSlabs].sort((a, b) => b.minPercent - a.minPercent).find((s) => percent >= s.minPercent)?.marks ?? 0;
  }
  const raw = cycles + attendance;
  const total = c.rounding === "UP" ? Math.ceil(raw - 1e-9) : c.rounding === "NONE" ? Math.round(raw * 10) / 10 : Math.round(raw);
  const entered = (n: Cycle) => usedParts(c).every((p) => v[`${p}${n}` as InternalComponent] != null);
  const complete = (c.iatWeight === 0 || (iat1 != null && iat2 != null)) && entered("1") && entered("2") && (c.attendanceWeight === 0 || hours != null);
  return {
    cycle1: c1, cycle2: c2, cycles: r2(cycles), attendance: r2(attendance),
    attendancePercent: percent == null ? null : Math.round(percent * 10) / 10, total, max: configTotal(c), complete,
  };
}

const FormulaSummary: React.FC<{ scheme: InternalScheme }> = ({ scheme }) => {
  const c = scheme.config;
  const cycleParts = [`IAT (of 100) → ${fmt(c.iatWeight)}`, ...usedParts(c).map((p) => `${PART_LABEL[p]} (of ${fmt(c[p].max)}) → ${fmt(c[p].weight)}`)];
  const combine = c.cycleCombine === "BEST" ? "the better of the two IAT cycles" : c.cycleCombine === "SUM" ? "IAT-1 cycle + IAT-2 cycle" : "the average of the two IAT cycles";
  return (
    <div className={`rounded-2xl border p-4 text-xs space-y-1.5 ${scheme.confirmed ? "bg-white border-gray-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex flex-wrap items-center gap-2 font-black text-[#0B192C]">
        <ClipboardCheck size={15} className="text-[#D4A72C]" /> Internal mark formula · out of {fmt(scheme.maxMarks)}
        {scheme.confirmed
          ? <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">Confirmed</span>
          : <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">Provisional – not confirmed</span>}
        {!scheme.visibleToStudents && <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-black uppercase">Hidden from students</span>}
      </div>
      <p className="font-semibold text-gray-700">Each IAT cycle (IAT-1 and IAT-2, out of {fmt(cycleMax(c))}): {cycleParts.join("  +  ")}</p>
      <p className="font-semibold text-gray-700">
        End-semester internal = {combine}
        {c.attendanceWeight > 0 ? `  +  attendance (hours of ${fmt(c.hoursPerSubject)}) → ${fmt(c.attendanceWeight)}` : ""}
      </p>
      {c.attendanceWeight > 0 && (
        <p className="text-gray-500 font-semibold">
          Attendance marks: {c.attendanceSlabs.length ? c.attendanceSlabs.map((s) => `≥${fmt(s.minPercent)}%: ${fmt(s.marks)}`).join(" · ") : `percentage × ${fmt(c.attendanceWeight)}`}
        </p>
      )}
    </div>
  );
};

const input =
  "w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-[#0B192C] focus:outline-none focus:ring-2 focus:ring-[#D4A72C] disabled:bg-gray-50";

type Tab = "marks" | "formula";

export const InternalMarksPage: React.FC = () => {
  const viewOnly = isSuperAdmin();
  const [tab, setTab] = useState<Tab>("marks");
  return (
    <div className="space-y-6">
      {viewOnly && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center gap-2">
          <Lock size={15} className="shrink-0" />
          View only: the Chief COE can see internal marks and the formula. Faculty enter the marks and the college's Controller of Examinations sets the formula.
        </div>
      )}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30">
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2"><ClipboardCheck className="text-[#D4A72C]" /> Internal Marks{viewOnly ? " (View)" : ""}</h1>
        <p className="text-xs text-white/70 mt-1 max-w-3xl">
          Quiz, activity, assignment and attendance (hours) entered by the faculty, with IAT-1 and IAT-2 from the answer scripts,
          converted into the internal mark with the college's formula. Every change is recorded with who made it and when.
        </p>
      </div>
      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        {([["marks", "Marks"], ["formula", "Formula & Settings"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 -mb-px ${tab === k ? "border-[#D4A72C] bg-white text-[#0B192C]" : "border-transparent text-gray-500"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "marks" ? <MarksTab /> : <FormulaTab viewOnly={viewOnly} />}
    </div>
  );
};

const MarksTab: React.FC = () => {
  const [departments] = useState<Department[]>(getStoredDepartments);
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [roster, setRoster] = useState<InternalRoster | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ regNo?: string; title: string } | null>(null);

  useEffect(() => {
    setSubjects([]);
    if (!dept) return;
    subjectsApi.list(dept).then(setSubjects).catch((e) => setError(apiErrorMessage(e, "Could not load subjects.")));
  }, [dept]);

  const load = (code = subject) => {
    if (!dept || !semester || !code) return;
    setLoading(true);
    setError("");
    internalMarksApi.roster(dept, semester, code)
      .then(setRoster)
      .catch((e) => { setRoster(null); setError(apiErrorMessage(e, "Could not load internal marks.")); })
      .finally(() => setLoading(false));
  };

  const config = roster?.scheme.config;
  const stats = useMemo(() => roster && {
    complete: roster.rows.filter((r) => r.breakdown.complete).length,
    average: roster.rows.length ? roster.rows.reduce((s, r) => s + r.breakdown.total, 0) / roster.rows.length : 0,
  }, [roster]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-3 items-end">
        <label className="block space-y-1"><span className="text-[11px] font-bold text-gray-600">Department</span>
          <select className={input} value={dept} aria-label="Department" onChange={(e) => { setDept(e.target.value); setSubject(""); setRoster(null); }}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
          </select>
        </label>
        <label className="block space-y-1"><span className="text-[11px] font-bold text-gray-600">Semester</span>
          <select className={input} value={semester} aria-label="Semester" onChange={(e) => { setSemester(e.target.value); setSubject(""); setRoster(null); }}>
            <option value="">Select semester</option>
            {SEMESTER_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="block space-y-1"><span className="text-[11px] font-bold text-gray-600">Subject</span>
          <select className={input} value={subject} aria-label="Subject" disabled={!dept || !semester} onChange={(e) => { setSubject(e.target.value); load(e.target.value); }}>
            <option value="">Select subject</option>
            {subjects.filter((s) => s.semester === semester).map((s) => <option key={s.code} value={s.code}>{s.code} — {s.title}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => load()} disabled={!subject || loading} className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
      {roster && config && stats && (
        <>
          <FormulaSummary scheme={roster.scheme} />
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center gap-2">
            <Lock size={14} className="shrink-0" /> Internal marks are entered by the subject's faculty and corrected by the HOD in the main portal. This sheet is view only.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-full bg-white border">{roster.subjectCode} — {roster.subjectTitle}</span>
              <span className="px-3 py-1.5 rounded-full bg-white border">{roster.rows.length} students</span>
              <span className="px-3 py-1.5 rounded-full bg-white border">{stats.complete} complete</span>
              <span className="px-3 py-1.5 rounded-full bg-white border">Average {fmt(Math.round(stats.average * 10) / 10)} / {fmt(roster.scheme.maxMarks)}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setHistory({ title: `Change history · ${roster.subjectCode}` })} className="px-3 py-2 rounded-xl border bg-white text-xs font-bold flex items-center gap-1.5">
                <History size={14} /> Change history
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[1150px]">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th rowSpan={2} className="text-left p-3 align-bottom">Reg. No.</th>
                  <th rowSpan={2} className="text-left p-3 align-bottom">Name</th>
                  {CYCLES.map((n) => (
                    <th key={n} colSpan={usedParts(config).length + 2} className={`p-2 text-center border-l border-gray-200 ${n === "1" ? "bg-sky-50 text-sky-800" : "bg-violet-50 text-violet-800"}`}>IAT-{n} cycle</th>
                  ))}
                  {config.attendanceWeight > 0 && <th rowSpan={2} className="text-center p-3 align-bottom border-l border-gray-200">Attendance<br /><span className="normal-case">hours of {fmt(config.hoursPerSubject)}</span></th>}
                  <th rowSpan={2} className="text-center p-3 align-bottom border-l border-gray-200">Internal<br /><span className="normal-case">of {fmt(roster.scheme.maxMarks)}</span></th>
                  <th rowSpan={2} className="text-left p-3 align-bottom">Last change</th>
                  <th rowSpan={2} />
                </tr>
                <tr>
                  {CYCLES.map((n) => (
                    <React.Fragment key={n}>
                      <th className="text-center p-2 border-l border-gray-200">IAT-{n}<br /><span className="normal-case">of 100</span></th>
                      {usedParts(config).map((p) => <th key={p} className="text-center p-2">{PART_LABEL[p]}<br /><span className="normal-case">of {fmt(config[p].max)}</span></th>)}
                      <th className="text-center p-2">Total<br /><span className="normal-case">of {fmt(cycleMax(config))}</span></th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.rows.map((r) => {
                  const b = r.breakdown;
                  const show = (v: number | undefined) => (v == null ? <span className="text-gray-300">—</span> : fmt(v));
                  return (
                    <tr key={r.regNo} className="border-t">
                      <td className="p-3 font-bold text-[#0B192C] whitespace-nowrap">{r.regNo}</td>
                      <td className="p-3 whitespace-nowrap">{r.name}</td>
                      {CYCLES.map((n) => (
                        <React.Fragment key={n}>
                          <td className="p-2 text-center border-l border-gray-100">{show((n === "1" ? r.iat1 : r.iat2) ?? undefined)}</td>
                          {usedParts(config).map((p) => <td key={p} className="p-2 text-center font-bold">{show(r.values[`${p}${n}` as InternalComponent])}</td>)}
                          <td className="p-2 text-center font-black text-gray-700">{fmt((n === "1" ? b.cycle1 : b.cycle2).total)}</td>
                        </React.Fragment>
                      ))}
                      {config.attendanceWeight > 0 && (
                        <td className="p-2 text-center border-l border-gray-100">
                          <span className="font-bold">{show(r.values.attendance)}</span>
                          {b.attendancePercent != null && <span className="block text-[10px] text-gray-500 mt-0.5">{fmt(b.attendancePercent)}% → {fmt(b.attendance)}</span>}
                        </td>
                      )}
                      <td className="p-3 text-center border-l border-gray-100"><span className="text-sm font-black">{fmt(b.total)}</span>
                        <span className={`block text-[10px] font-bold ${b.complete ? "text-emerald-700" : "text-amber-700"}`}>{b.complete ? "complete" : "incomplete"}</span></td>
                      <td className="p-3 text-[10px] text-gray-500 whitespace-nowrap">{r.updatedAt ? <>{r.updatedAt}<br />{r.updatedBy}</> : "—"}</td>
                      <td className="p-2"><button type="button" aria-label={`History of ${r.regNo}`} onClick={() => setHistory({ regNo: r.regNo, title: `Change history · ${r.regNo}` })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><History size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!roster && !loading && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-xs text-gray-500 font-semibold">Choose a department, semester and subject.</div>
      )}
      {history && roster && <HistoryDialog title={history.title} load={() => internalMarksApi.history(roster.deptKey, roster.semester, roster.subjectCode, history.regNo)} onClose={() => setHistory(null)} />}
    </div>
  );
};

const HistoryDialog: React.FC<{ title: string; load: () => Promise<InternalHistoryItem[]>; onClose: () => void }> = ({ title, load, onClose }) => {
  const [items, setItems] = useState<InternalHistoryItem[] | null>(null);
  const [error, setError] = useState("");
  // Loaded once when the dialog opens
  useEffect(() => {
    load().then(setItems).catch((e) => setError(apiErrorMessage(e, "Could not load the change history.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-label="Change history" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-black text-sm text-[#0B192C] flex items-center gap-2"><History size={16} className="text-[#D4A72C]" /> {title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="overflow-auto p-4">
          {error && <p className="text-xs font-bold text-red-700">{error}</p>}
          {!items && !error && <p className="text-xs text-gray-400">Loading…</p>}
          {items && items.length === 0 && <p className="text-xs text-gray-500 font-semibold">No changes recorded yet.</p>}
          {items && items.length > 0 && (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-50"><tr><th className="text-left p-2">When</th><th className="text-left p-2">Student</th><th className="text-left p-2">Item</th><th className="text-left p-2">Change</th><th className="text-left p-2">By</th></tr></thead>
              <tbody>
                {items.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 whitespace-nowrap">{h.changedAt}</td><td className="p-2">{h.regNo}</td>
                    <td className="p-2 font-bold whitespace-nowrap">{componentLabel(h.component)}{h.component === "attendance" ? " (hours)" : ""}</td>
                    <td className="p-2 whitespace-nowrap">{h.oldValue == null ? "—" : fmt(h.oldValue)} → <b>{h.newValue == null ? "cleared" : fmt(h.newValue)}</b></td>
                    <td className="p-2">{h.changedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const FormulaTab: React.FC<{ viewOnly: boolean }> = ({ viewOnly }) => {
  const [scheme, setScheme] = useState<InternalScheme | null>(null);
  const [c, setC] = useState<InternalConfig | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [example, setExample] = useState({ iat1: 70, quiz1: 8, activity1: 9, assignment1: 10, iat2: 80, quiz2: 7, activity2: 8, assignment2: 9, attendance: 42 });

  useEffect(() => {
    internalMarksApi.scheme().then((s) => { setScheme(s); setC(s.config); setConfirmed(s.confirmed); setVisible(s.visibleToStudents); })
      .catch((e) => setError(apiErrorMessage(e, "Could not load the formula.")));
  }, []);

  if (!c) return error ? <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">{error}</div> : <p className="text-xs text-gray-400">Loading…</p>;

  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
  const total = configTotal(c);
  const { iat1, iat2, ...entered } = example;
  const sample = computeInternal(c, entered, iat1, iat2);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const s = await internalMarksApi.saveScheme(c, confirmed, visible);
      setScheme(s); setC(s.config); setConfirmed(s.confirmed); setVisible(s.visibleToStudents);
      setMessage("Formula saved. Every internal mark is now worked out with it.");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save the formula."));
    } finally {
      setSaving(false);
    }
  };

  const weightRow = (label: string, key: "quiz" | "activity" | "assignment") => (
    <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 items-center">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      <input type="number" min={1} max={100} step={0.5} className={input} aria-label={`${label} out of`} value={c[key].max} onChange={(e) => setC({ ...c, [key]: { ...c[key], max: num(e.target.value) } })} />
      <input type="number" min={0} max={100} step={0.5} className={input} aria-label={`${label} weight`} value={c[key].weight} onChange={(e) => setC({ ...c, [key]: { ...c[key], weight: num(e.target.value) } })} />
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-5">
      {scheme && <FormulaSummary scheme={scheme} />}
      {error && <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2"><AlertTriangle size={14} /> {error}</div>}
      {message && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">{message}</div>}

      <fieldset disabled={viewOnly} className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-2"><Settings2 size={14} className="text-[#D4A72C]" /> Each IAT cycle</h3>
          <p className="text-[11px] text-gray-500">IAT-1 and IAT-2 each come with their own quiz, activity and assignment. The same weights apply to both cycles.</p>
          <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 text-[10px] font-bold uppercase text-gray-500"><span /><span>Entered out of</span><span>Weight</span></div>
          <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 items-center">
            <span className="text-xs font-bold text-gray-700">IAT (answer script)</span>
            <input className={input} value={100} disabled aria-label="IAT out of" />
            <input type="number" min={0} max={100} step={0.5} className={input} aria-label="IAT weight" value={c.iatWeight} onChange={(e) => setC({ ...c, iatWeight: num(e.target.value) })} />
          </div>
          {weightRow("Quiz", "quiz")}
          {weightRow("Activity", "activity")}
          {weightRow("Assignment", "assignment")}
          <p className="text-[11px] text-gray-500">Each cycle is out of {fmt(cycleMax(c))}. Weight 0 leaves that item out of the formula and hides it from the entry sheet.</p>

          <label className="block space-y-1 pt-2"><span className="text-[11px] font-bold text-gray-600">How the IAT-1 and IAT-2 cycles become the end-semester internal</span>
            <select className={input} value={c.cycleCombine} aria-label="Cycle combination" onChange={(e) => setC({ ...c, cycleCombine: e.target.value as InternalConfig["cycleCombine"] })}>
              <option value="AVERAGE">Average of the two cycles</option>
              <option value="BEST">Better of the two cycles</option>
              <option value="SUM">Add the two cycles</option>
            </select>
          </label>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">Attendance (subject-wise)</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1"><span className="text-[11px] font-bold text-gray-600">Hours per subject</span>
              <input type="number" min={1} max={300} className={input} value={c.hoursPerSubject} onChange={(e) => setC({ ...c, hoursPerSubject: num(e.target.value) })} /></label>
            <label className="block space-y-1"><span className="text-[11px] font-bold text-gray-600">Attendance weight</span>
              <input type="number" min={0} max={100} step={0.5} className={input} value={c.attendanceWeight} onChange={(e) => setC({ ...c, attendanceWeight: num(e.target.value) })} /></label>
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-600 block">Marks by attendance percentage (no rows = percentage × weight)</span>
            {c.attendanceSlabs.map((s, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-2 items-center text-xs">
                <span className="font-bold text-gray-500">≥</span>
                <input type="number" min={0} max={100} step={0.5} className={input} aria-label={`Slab ${i + 1} percent`} value={s.minPercent}
                  onChange={(e) => setC({ ...c, attendanceSlabs: c.attendanceSlabs.map((x, j) => (j === i ? { ...x, minPercent: num(e.target.value) } : x)) })} />
                <span className="font-bold text-gray-500">% →</span>
                <input type="number" min={0} step={0.5} className={input} aria-label={`Slab ${i + 1} marks`} value={s.marks}
                  onChange={(e) => setC({ ...c, attendanceSlabs: c.attendanceSlabs.map((x, j) => (j === i ? { ...x, marks: num(e.target.value) } : x)) })} />
                {!viewOnly && <button type="button" aria-label="Remove slab" onClick={() => setC({ ...c, attendanceSlabs: c.attendanceSlabs.filter((_, j) => j !== i) })} className="p-1.5 rounded-lg text-red-700 hover:bg-red-50"><Trash2 size={13} /></button>}
              </div>
            ))}
            {!viewOnly && (
              <button type="button" onClick={() => setC({ ...c, attendanceSlabs: [...c.attendanceSlabs, { minPercent: 0, marks: 0 }] })} className="px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1">
                <Plus size={12} /> Add slab
              </button>
            )}
          </div>

          <label className="block space-y-1"><span className="text-[11px] font-bold text-gray-600">Rounding of the internal mark</span>
            <select className={input} value={c.rounding} onChange={(e) => setC({ ...c, rounding: e.target.value as InternalConfig["rounding"] })}>
              <option value="NEAREST">To the nearest mark</option>
              <option value="UP">Always up</option>
              <option value="NONE">No rounding (one decimal)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> This formula is confirmed (removes the "provisional" notice everywhere)</label>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Students can see their internal marks (live)</label>
        </div>
      </fieldset>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">Try it: example student</h3>
          <span className={`text-xs font-black ${total > 0 && total <= 100 ? "text-[#0B192C]" : "text-red-700"}`} data-testid="formula-total">Internal mark out of {fmt(total)}</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          {(Object.keys(example) as (keyof typeof example)[]).map((k) => (
            <label key={k} className="block space-y-1"><span className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">{k === "iat1" ? "IAT-1" : k === "iat2" ? "IAT-2" : k === "attendance" ? "Hours" : componentLabel(k)}</span>
              <input type="number" className={input} value={example[k]} onChange={(e) => setExample({ ...example, [k]: num(e.target.value) })} /></label>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-700" data-testid="formula-example">
          IAT-1 cycle {fmt(sample.cycle1.total)} / {fmt(cycleMax(c))} · IAT-2 cycle {fmt(sample.cycle2.total)} / {fmt(cycleMax(c))} →{" "}
          {c.cycleCombine === "BEST" ? "better" : c.cycleCombine === "SUM" ? "sum" : "average"} {fmt(sample.cycles)} + attendance {fmt(sample.attendance)}
          {sample.attendancePercent != null ? ` (${fmt(sample.attendancePercent)}%)` : ""} = <b className="text-[#0B192C]">{fmt(sample.total)} / {fmt(total)}</b>
        </p>
      </div>

      {!viewOnly && (
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
            <Save size={14} className="text-[#D4A72C]" /> {saving ? "Saving…" : "Save formula"}
          </button>
        </div>
      )}
    </form>
  );
};
