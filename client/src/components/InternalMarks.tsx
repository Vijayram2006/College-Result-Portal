import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, History, Info, Lock, RefreshCw, Save, X } from "lucide-react";
import {
  apiErrorMessage,
  authApi,
  FacultySubjectDTO,
  InternalBreakdown,
  InternalComponent,
  InternalConfig,
  InternalCycle,
  InternalHistoryItem,
  InternalRoster,
  InternalScheme,
  internalMarksApi,
  StudentInternalView,
} from "../services/api";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { useSystemConfig } from "../utils/systemConfig";

/*
 * Internal marks, in two IAT cycles. Each cycle has its IAT (answer-script total, of 100) and its own quiz, activity
 * and assignment, giving that cycle's internal mark; the two cycle marks are converted into the end-semester internal
 * mark, plus attendance (hours of the semester). The formula is the college COE's. Faculty enter, the HOD corrects,
 * students see their own (when the COE shows them). The server recomputes every total; the sheet only previews
 * unsaved edits with the same formula (keep computeInternal in step with InternalMarkService.compute).
 */

type Part = "quiz" | "activity" | "assignment";
type Cycle = "1" | "2";
const PARTS: Part[] = ["quiz", "activity", "assignment"];
const CYCLES: Cycle[] = ["1", "2"];
const PART_LABEL: Record<Part, string> = { quiz: "Quiz", activity: "Activity", assignment: "Assignment" };

/** "quiz2" -> "Quiz (IAT-2)", "attendance" -> "Attendance". */
export function componentLabel(k: string) {
  if (k === "attendance") return "Attendance";
  const part = k.replace(/\d$/, "") as Part;
  return `${PART_LABEL[part] ?? part} (IAT-${k.slice(-1)})`;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n * 10 === Math.round(n * 10) ? 1 : 2));

/** The parts used by the formula (weight above 0), shown in each IAT cycle. */
const usedParts = (c: InternalConfig) => PARTS.filter((p) => c[p].weight > 0);
const cycleMax = (c: InternalConfig) => c.iatWeight + c.quiz.weight + c.activity.weight + c.assignment.weight;
const componentMax = (c: InternalConfig, k: InternalComponent) => (k === "attendance" ? c.hoursPerSubject : c[k.replace(/\d$/, "") as Part].max);

/** Same calculation as the server's InternalMarkService.compute, for previewing unsaved edits. */
export function computeInternal(c: InternalConfig, v: Partial<Record<InternalComponent, number>>, iat1: number | null, iat2: number | null): InternalBreakdown {
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
    else attendance = c.attendanceSlabs.find((s) => percent >= s.minPercent)?.marks ?? 0;
  }
  const raw = cycles + attendance;
  const total = c.rounding === "UP" ? Math.ceil(raw - 1e-9) : c.rounding === "NONE" ? Math.round(raw * 10) / 10 : Math.round(raw);
  const entered = (n: Cycle) => usedParts(c).every((p) => v[`${p}${n}` as InternalComponent] != null);
  const complete = (c.iatWeight === 0 || (iat1 != null && iat2 != null)) && entered("1") && entered("2") && (c.attendanceWeight === 0 || hours != null);
  return {
    cycle1: c1, cycle2: c2, cycles: r2(cycles), attendance: r2(attendance),
    attendancePercent: percent == null ? null : Math.round(percent * 10) / 10, total,
    max: (c.cycleCombine === "SUM" ? 2 : 1) * cycleMax(c) + c.attendanceWeight, complete,
  };
}

/** The formula in words, so everyone sees exactly how the internal mark is made. */
export const FormulaSummary: React.FC<{ scheme: InternalScheme }> = ({ scheme }) => {
  const c = scheme.config;
  const cycleParts = [`IAT (of 100) → ${fmt(c.iatWeight)}`, ...usedParts(c).map((p) => `${PART_LABEL[p]} (of ${fmt(c[p].max)}) → ${fmt(c[p].weight)}`)];
  const combine = c.cycleCombine === "BEST" ? "the better of the two IAT cycles" : c.cycleCombine === "SUM" ? "IAT-1 cycle + IAT-2 cycle" : "the average of the two IAT cycles";
  const slabs = c.attendanceSlabs.length
    ? c.attendanceSlabs.map((s) => `≥${fmt(s.minPercent)}%: ${fmt(s.marks)}`).join(" · ")
    : `percentage × ${fmt(c.attendanceWeight)}`;
  return (
    <div className={`rounded-2xl border p-4 text-xs space-y-1.5 ${scheme.confirmed ? "bg-white border-slate-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex flex-wrap items-center gap-2 font-black text-[#0B192C]">
        <ClipboardCheck size={15} className="text-[#D4A72C]" /> Internal mark formula · out of {fmt(scheme.maxMarks)}
        {scheme.confirmed ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">Confirmed by COE</span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase">Provisional – not yet confirmed by COE</span>
        )}
      </div>
      <p className="font-semibold text-slate-700">Each IAT cycle (IAT-1 and IAT-2, out of {fmt(cycleMax(c))}): {cycleParts.join("  +  ")}</p>
      <p className="font-semibold text-slate-700">
        End-semester internal = {combine}
        {c.attendanceWeight > 0 ? `  +  attendance (hours of ${fmt(c.hoursPerSubject)}) → ${fmt(c.attendanceWeight)}` : ""}
      </p>
      {c.attendanceWeight > 0 && <p className="text-slate-500 font-semibold">Attendance marks: {slabs}</p>}
      <p className="text-slate-400 font-semibold">
        Total {c.rounding === "UP" ? "rounded up" : c.rounding === "NONE" ? "not rounded" : "rounded to the nearest mark"}
        {scheme.updatedAt ? ` · formula set ${scheme.updatedAt} by ${scheme.updatedBy}` : ""}
      </p>
    </div>
  );
};

const HistoryDialog: React.FC<{ title: string; load: () => Promise<InternalHistoryItem[]>; onClose: () => void }> = ({ title, load, onClose }) => {
  const [items, setItems] = useState<InternalHistoryItem[] | null>(null);
  const [error, setError] = useState("");
  // Loaded once when the dialog opens (load is a new function on every render of the parent)
  useEffect(() => {
    load().then(setItems).catch((e) => setError(apiErrorMessage(e, "Could not load the change history.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-label="Change history" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-black text-sm text-[#0B192C] flex items-center gap-2"><History size={16} className="text-[#D4A72C]" /> {title}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="overflow-auto p-4">
          {error && <p className="text-xs font-bold text-red-700">{error}</p>}
          {!items && !error && <p className="text-xs text-slate-400">Loading…</p>}
          {items && items.length === 0 && <p className="text-xs text-slate-500 font-semibold">No changes recorded yet.</p>}
          {items && items.length > 0 && (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50">
                <tr><th className="text-left p-2">When</th><th className="text-left p-2">Student</th><th className="text-left p-2">Item</th><th className="text-left p-2">Change</th><th className="text-left p-2">By</th></tr>
              </thead>
              <tbody>
                {items.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 whitespace-nowrap">{h.changedAt}</td>
                    <td className="p-2">{h.regNo}</td>
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

/** Two header rows: an "IAT-1" and an "IAT-2" group (IAT mark, quiz, activity, assignment, cycle total), attendance, internal. */
const GroupedHead: React.FC<{ c: InternalConfig; maxMarks: number; lead: string[]; tail?: boolean }> = ({ c, maxMarks, lead, tail = true }) => {
  const parts = usedParts(c);
  return (
    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
      <tr>
        {lead.map((l, i) => (
          <th key={l} rowSpan={2} className={`text-left p-3 align-bottom ${i === 0 ? "sticky left-0 z-10 bg-slate-50" : ""}`}>{l}</th>
        ))}
        {CYCLES.map((n) => (
          <th key={n} colSpan={parts.length + 2} className={`p-2 text-center border-l border-slate-200 ${n === "1" ? "bg-sky-50 text-sky-800" : "bg-violet-50 text-violet-800"}`}>
            IAT-{n} cycle
          </th>
        ))}
        {c.attendanceWeight > 0 && <th rowSpan={2} className="text-center p-3 align-bottom border-l border-slate-200">Attendance<br /><span className="normal-case font-semibold">hours of {fmt(c.hoursPerSubject)}</span></th>}
        <th rowSpan={2} className="text-center p-3 align-bottom border-l border-slate-200">Internal<br /><span className="normal-case font-semibold">of {fmt(maxMarks)}</span></th>
        {tail && <th rowSpan={2} className="p-3" />}
      </tr>
      <tr>
        {CYCLES.map((n) => (
          <React.Fragment key={n}>
            <th className="text-center p-2 border-l border-slate-200">IAT-{n}<br /><span className="normal-case font-semibold">of 100</span></th>
            {parts.map((p) => <th key={p} className="text-center p-2">{PART_LABEL[p]}<br /><span className="normal-case font-semibold">of {fmt(c[p].max)}</span></th>)}
            <th className="text-center p-2">Total<br /><span className="normal-case font-semibold">of {fmt(cycleMax(c))}</span></th>
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );
};

const selectCls = "w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0B192C] focus:outline-none focus:ring-2 focus:ring-[#D4A72C]";

/** The subject sheet: faculty enter marks, the HOD corrects them (same sheet, own department only). */
export const InternalMarksSheet: React.FC<{ role: "faculty" | "hod"; onToast?: (m: string) => void }> = ({ role, onToast }) => {
  const isHod = role === "hod";
  const me = authApi.currentUser();
  const [subjects, setSubjects] = useState<FacultySubjectDTO[]>([]);
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [roster, setRoster] = useState<InternalRoster | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Record<InternalComponent, number | null>>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{ regNo?: string; title: string } | null>(null);
  const [savedNote, setSavedNote] = useState("");

  // The Super Admin's faculty locks (the server refuses locked saves itself, with 423)
  const systemConfig = useSystemConfig() as any;
  const college = String(me?.collegeKey || "engineering").toLowerCase();
  const gateway = systemConfig?.gateways?.facultyMarkEntry;
  const deadline = gateway?.submissionDeadline;
  const lockReason =
    systemConfig?.systemMode === "EMERGENCY_LOCK" ? "The university is in emergency lockdown."
      : gateway?.enabled === false ? gateway?.lockNotice || "Mark entry is closed by the Controller of Examinations."
      : deadline && new Date() > new Date(deadline) ? `The mark submission deadline (${new Date(deadline).toLocaleString()}) has passed.`
      : systemConfig?.institutionalLocks?.[college]?.locked || systemConfig?.institutionalLocks?.[college]?.freezeSubmissions
        ? "Mark entry for this college is frozen by the Chief COE." : "";
  const canEdit = !lockReason;

  useEffect(() => {
    internalMarksApi.subjects(role).then(setSubjects).catch((e) => setError(apiErrorMessage(e, "Could not load subjects.")));
  }, [role]);

  const semesterSubjects = subjects.filter((s) => s.semester === semester);
  const semestersWithSubjects = SEMESTER_OPTIONS.filter((s) => subjects.some((x) => x.semester === s));

  const load = (sem = semester, code = subject) => {
    if (!sem || !code) return;
    setLoading(true);
    setError("");
    setSavedNote("");
    internalMarksApi
      .roster(role, sem, code)
      .then((r) => { setRoster(r); setEdits({}); })
      .catch((e) => { setRoster(null); setError(apiErrorMessage(e, "Could not load internal marks.")); })
      .finally(() => setLoading(false));
  };

  const config = roster?.scheme.config;
  const dirtyCount = Object.values(edits).reduce((n, e) => n + Object.keys(e).length, 0);

  const valueOf = (regNo: string, comp: InternalComponent, saved?: number) => {
    const e = edits[regNo];
    return e && comp in e ? e[comp] : saved;
  };
  const invalid = (comp: InternalComponent, v: number | null | undefined) =>
    v != null && config != null && (Number.isNaN(v) || v < 0 || v > componentMax(config, comp) || Math.abs(v * 2 - Math.round(v * 2)) > 1e-9);
  const anyInvalid = roster != null && Object.entries(edits).some(([, e]) => Object.entries(e).some(([k, v]) => invalid(k as InternalComponent, v as number | null)));

  const setValue = (row: InternalRoster["rows"][number], comp: InternalComponent, raw: string) => {
    const v = raw.trim() === "" ? null : Number(raw);
    setEdits((prev) => {
      const next = { ...prev, [row.regNo]: { ...(prev[row.regNo] || {}) } };
      const saved = row.values[comp];
      if ((v == null && saved == null) || v === saved) delete next[row.regNo][comp];
      else next[row.regNo][comp] = v;
      if (Object.keys(next[row.regNo]).length === 0) delete next[row.regNo];
      return next;
    });
  };

  const save = async () => {
    if (!roster || dirtyCount === 0 || anyInvalid) return;
    setSaving(true);
    setError("");
    try {
      const updated = await internalMarksApi.save(role, {
        semester: roster.semester,
        subjectCode: roster.subjectCode,
        rows: Object.entries(edits).map(([regNo, values]) => ({ regNo, values })),
      });
      setRoster(updated);
      setEdits({});
      onToast?.(`Internal marks saved for ${roster.subjectCode}.`);
      if (isHod) setSavedNote(`Corrections saved for ${roster.subjectCode}. They are recorded under your name in the change history.`);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save internal marks."));
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    if (!roster) return null;
    const totals = roster.rows.map((r) => r.breakdown);
    return {
      students: totals.length,
      complete: totals.filter((b) => b.complete).length,
      average: totals.length ? totals.reduce((s, b) => s + b.total, 0) / totals.length : 0,
    };
  }, [roster]);

  const cell = (r: InternalRoster["rows"][number], k: InternalComponent, b: InternalBreakdown) => {
    const v = valueOf(r.regNo, k, r.values[k]);
    return (
      <td key={k} className={`p-1.5 text-center ${k === "attendance" ? "border-l border-slate-100" : ""}`}>
        {canEdit ? (
          <input
            type="number" inputMode="decimal" step={0.5} min={0} max={componentMax(config!, k)}
            aria-label={`${componentLabel(k)} ${r.regNo}`}
            value={v == null || Number.isNaN(v) ? "" : v}
            onChange={(e) => setValue(r, k, e.target.value)}
            className={`w-14 px-1.5 py-1.5 rounded-lg border text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A72C] ${invalid(k, v) ? "border-red-500 bg-red-50 text-red-700" : "border-slate-300"}`}
          />
        ) : (
          <span className="font-bold">{v == null ? <span className="text-slate-300">—</span> : fmt(v)}</span>
        )}
        {k === "attendance" && b.attendancePercent != null && (
          <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">{fmt(b.attendancePercent)}% → {fmt(b.attendance)}</span>
        )}
      </td>
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 shadow-lg border border-[#D4A72C]/30">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">Continuous assessment</span>
        <h2 className="text-xl sm:text-2xl font-black mt-1">{isHod ? "Internal Marks (HOD Correction)" : "Internal Marks Entry"}</h2>
        <p className="text-xs text-white/70 mt-1 max-w-3xl">
          {isHod
            ? "Internal marks of your department's students, as entered by the faculty. Correct a value here if needed; every correction is recorded under your name in the change history."
            : "Enter the quiz, activity and assignment of each IAT cycle, and the attendance hours, for each student. IAT-1 and IAT-2 come from the answer scripts, and the internal mark is worked out with the COE's formula. Every change is recorded."}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
        <label className="space-y-1 block">
          <span className="text-[11px] font-bold text-slate-600">Semester</span>
          <select className={selectCls} value={semester} onChange={(e) => { setSemester(e.target.value); setSubject(""); setRoster(null); }} aria-label="Semester">
            <option value="">Select semester</option>
            {semestersWithSubjects.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-bold text-slate-600">Subject</span>
          <select className={selectCls} value={subject} disabled={!semester} aria-label="Subject"
            onChange={(e) => { setSubject(e.target.value); load(semester, e.target.value); }}>
            <option value="">Select subject</option>
            {semesterSubjects.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.title}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => load()} disabled={!subject || loading}
          className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {savedNote && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">{savedNote}</div>
      )}
      {lockReason && roster && (
        <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-2">
          <Lock size={15} /> {lockReason} Internal marks are view-only for now.
        </div>
      )}

      {roster && config && stats && (
        <>
          <FormulaSummary scheme={roster.scheme} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-full bg-white border">{roster.subjectCode} — {roster.subjectTitle}</span>
              <span className="px-3 py-1.5 rounded-full bg-white border">{stats.students} students</span>
              <span className="px-3 py-1.5 rounded-full bg-white border">{stats.complete} complete</span>
              <span className="px-3 py-1.5 rounded-full bg-white border">Average {fmt(Math.round(stats.average * 10) / 10)} / {fmt(roster.scheme.maxMarks)}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setHistory({ title: `Change history · ${roster.subjectCode}` })}
                className="px-3 py-2 rounded-xl border bg-white text-xs font-bold flex items-center gap-1.5">
                <History size={14} /> Change history
              </button>
              {canEdit && (
                <button type="button" onClick={save} disabled={saving || dirtyCount === 0 || anyInvalid}
                  className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
                  <Save size={14} className="text-[#D4A72C]" /> {saving ? "Saving…" : `${isHod ? "Save corrections" : "Save changes"}${dirtyCount ? ` (${dirtyCount})` : ""}`}
                </button>
              )}
            </div>
          </div>
          {anyInvalid && <p className="text-xs font-bold text-red-700">Some values are outside their allowed range (highlighted in red). Fix them to save.</p>}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs min-w-[1150px]">
              <GroupedHead c={config} maxMarks={roster.scheme.maxMarks} lead={["Reg. No.", "Name"]} />
              <tbody>
                {roster.rows.map((r) => {
                  const merged: Partial<Record<InternalComponent, number>> = { ...r.values };
                  Object.entries(edits[r.regNo] || {}).forEach(([k, v]) => {
                    if (v == null || Number.isNaN(v)) delete merged[k as InternalComponent];
                    else merged[k as InternalComponent] = v;
                  });
                  const b = edits[r.regNo] ? computeInternal(config, merged, r.iat1, r.iat2) : r.breakdown;
                  return (
                    <tr key={r.regNo} className={`border-t ${edits[r.regNo] ? "bg-[#FFF8E6]" : ""}`}>
                      {/* Pinned, so the student stays visible while the sheet scrolls sideways */}
                      <td className={`p-3 font-bold text-[#0B192C] whitespace-nowrap sticky left-0 z-[1] ${edits[r.regNo] ? "bg-[#FFF8E6]" : "bg-white"}`}>{r.regNo}</td>
                      <td className="p-3 whitespace-nowrap">{r.name}{r.category === "lateral" && <span className="ml-1 text-[10px] text-slate-400">(lateral)</span>}</td>
                      {CYCLES.map((n) => {
                        const iat = n === "1" ? r.iat1 : r.iat2;
                        const cyc = n === "1" ? b.cycle1 : b.cycle2;
                        return (
                          <React.Fragment key={n}>
                            <td className="p-2 text-center border-l border-slate-100">{iat ?? <span className="text-slate-300">—</span>}</td>
                            {usedParts(config).map((p) => cell(r, `${p}${n}` as InternalComponent, b))}
                            <td className="p-2 text-center font-black text-slate-700" data-testid={`cycle${n}-${r.regNo}`}>{fmt(cyc.total)}</td>
                          </React.Fragment>
                        );
                      })}
                      {config.attendanceWeight > 0 && cell(r, "attendance", b)}
                      <td className="p-3 text-center border-l border-slate-100">
                        <span className="text-sm font-black text-[#0B192C]">{fmt(b.total)}</span>
                        <span className={`block text-[10px] font-bold ${b.complete ? "text-emerald-700" : "text-amber-700"}`}>{b.complete ? "complete" : "incomplete"}</span>
                      </td>
                      <td className="p-2">
                        <button type="button" onClick={() => setHistory({ regNo: r.regNo, title: `Change history · ${r.regNo} · ${roster.subjectCode}` })}
                          aria-label={`History of ${r.regNo}`} title={r.updatedAt ? `Last change ${r.updatedAt} by ${r.updatedBy}` : "No changes yet"}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><History size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
                {roster.rows.length === 0 && (
                  <tr><td colSpan={20} className="p-6 text-center text-slate-400 font-semibold">No students in this semester.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!roster && !loading && !error && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 font-semibold">
          Choose a semester and subject to see the internal marks.
        </div>
      )}

      {history && roster && (
        <HistoryDialog
          title={history.title}
          load={() => internalMarksApi.history(role, roster.semester, roster.subjectCode, history.regNo)}
          onClose={() => setHistory(null)}
        />
      )}
    </div>
  );
};

/** The student's own internal marks, per subject of the current semester. */
export const StudentInternalMarks: React.FC = () => {
  const [view, setView] = useState<StudentInternalView | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string | null>(null);

  useEffect(() => {
    internalMarksApi.mine().then(setView).catch((e) => setError(apiErrorMessage(e, "Could not load your internal marks.")));
  }, []);

  if (error) return <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">{error}</div>;
  if (!view) return <div className="p-8 text-center text-xs text-slate-400">Loading…</div>;
  if (!view.visible || !view.scheme) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-sm text-slate-600 font-semibold flex flex-col items-center gap-2">
        <Info className="text-[#D4A72C]" /> Internal marks are not open for viewing yet. They will appear here once the Controller of Examinations releases them.
      </div>
    );
  }
  const c = view.scheme.config;
  const show = (v: number | undefined) => (v == null ? <span className="text-slate-300">—</span> : fmt(v));
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-[#0B192C]">My Internal Marks · {view.semester}</h2>
        <p className="text-xs text-slate-500 font-semibold mt-1">Updated as soon as your faculty enter them. IAT marks count once that IAT is published.</p>
      </div>
      <FormulaSummary scheme={view.scheme} />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <GroupedHead c={c} maxMarks={view.scheme.maxMarks} lead={["Subject"]} />
          <tbody>
            {view.subjects.map((s) => (
              <tr key={s.subjectCode} className="border-t">
                <td className="p-3 sticky left-0 z-[1] bg-white"><span className="font-black text-[#0B192C]">{s.subjectCode}</span><span className="block text-slate-500">{s.subjectTitle}</span></td>
                {CYCLES.map((n) => {
                  const iat = n === "1" ? s.iat1 : s.iat2;
                  const published = n === "1" ? s.iat1Published : s.iat2Published;
                  const cyc = n === "1" ? s.breakdown.cycle1 : s.breakdown.cycle2;
                  return (
                    <React.Fragment key={n}>
                      <td className="p-2 text-center border-l border-slate-100">{iat != null ? iat : <span className="text-slate-400 text-[10px] font-bold">{published ? "absent" : "awaited"}</span>}</td>
                      {usedParts(c).map((p) => <td key={p} className="p-2 text-center font-bold">{show(s.values[`${p}${n}` as InternalComponent])}</td>)}
                      <td className="p-2 text-center font-black text-slate-700">{fmt(cyc.total)}</td>
                    </React.Fragment>
                  );
                })}
                {c.attendanceWeight > 0 && (
                  <td className="p-2 text-center font-bold border-l border-slate-100">
                    {show(s.values.attendance)}
                    {s.breakdown.attendancePercent != null && <span className="block text-[10px] text-slate-500">{fmt(s.breakdown.attendancePercent)}%</span>}
                  </td>
                )}
                <td className="p-3 text-center border-l border-slate-100">
                  <span className="text-sm font-black text-[#0B192C]">{fmt(s.breakdown.total)}</span>
                  <span className={`block text-[10px] font-bold ${s.breakdown.complete ? "text-emerald-700" : "text-amber-700"}`}>
                    {s.breakdown.complete ? <span className="inline-flex items-center gap-0.5"><CheckCircle2 size={10} /> complete</span> : "in progress"}
                  </span>
                </td>
                <td className="p-2">
                  <button type="button" onClick={() => setHistory(s.subjectCode)} aria-label={`History of ${s.subjectCode}`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><History size={14} /></button>
                </td>
              </tr>
            ))}
            {view.subjects.length === 0 && <tr><td colSpan={20} className="p-6 text-center text-slate-400 font-semibold">No subjects this semester yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {history && <HistoryDialog title={`Change history · ${history}`} load={() => internalMarksApi.myHistory(history)} onClose={() => setHistory(null)} />}
    </div>
  );
};
