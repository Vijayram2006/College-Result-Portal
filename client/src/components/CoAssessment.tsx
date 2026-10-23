import React, { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Save } from "lucide-react";
import { apiClient, apiErrorMessage } from "../services/api";

/**
 * CO assessment entry, laid out like the college's R2026 CO attainment workbooks (Theory / Integrated course):
 * choose the department, semester, course type, IAT cycle and subject, then enter each sheet's marks per question.
 * The CO of every question and every formula are fixed on the server exactly as in the workbooks.
 * mode "faculty" / "hod" edit their own department; "admin" (COE, Associate Dean) views any department.
 */

type Mode = "faculty" | "hod" | "admin";
type Item = { label: string; max: number; co: string };
type Component = { key: string; title: string; cycle: string | null; courseType: string | null; items: Item[] };
type IatColumn = { label: string; co: string; max: number };
type StudentRow = { regNo: string; name: string; marks: Record<string, (number | null)[] | null>; iat: number[] | null };
type Sheet = {
  deptKey: string; deptName: string; semester: string; subjectCode: string; subjectTitle: string;
  courseType: "THEORY" | "INTEGRATED"; courseTypeLocked: boolean; cycle: string;
  components: Component[]; iatColumns: IatColumn[]; students: StudentRow[];
  surveyWindow: { opensAt: string; closesAt: string; setBy: string; open: boolean } | null;
};
type Level = { students: number; above: number; percent: number | null; level: number };
type StudentAttainment = {
  regNo: string; name: string; iat: Record<string, number>; assignment: Record<string, number>;
  quizOrLab: Record<string, number>; activity: number; total: Record<string, number>;
  grade: string | null; gradePoint: number; seePercent: number; survey: (number | null)[] | null;
};
type Attainment = {
  deptName: string; semester: string; subjectCode: string; subjectTitle: string; courseType: string;
  students: StudentAttainment[]; internal: Record<string, Level>; university: Record<string, Level>;
  survey: { co: string; excellent: number; veryGood: number; good: number; satisfactory: number; poor: number; total: number; excellentOrVeryGood: number; percent: number | null; level: number }[];
  overall: { co: string; iat: number; see: number; direct: number; directNinety: number; exit: number; exitTen: number; total: number; percent: number }[];
};
type SubjectOption = { code: string; title: string; semester: string; deptKey?: string };

const SEMESTERS = ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI", "Semester VII", "Semester VIII"];
const COS = ["CO1", "CO2", "CO3", "CO4", "CO5", "CO6"];
const sel = "w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]";
const f = (v: number | null | undefined, d = 2) => (v == null || Number.isNaN(v) ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(d));

export const CoAssessment: React.FC<{ mode: Mode; onToast?: (m: string) => void }> = ({ mode, onToast }) => {
  const base = mode === "admin" ? "/admin/co-assessment" : `/${mode}/co-assessment`;
  const canEditSheet = mode !== "admin";
  const [departments, setDepartments] = useState<{ key: string; name: string }[]>([]);
  const [dept, setDept] = useState("");
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [semester, setSemester] = useState("");
  const [courseType, setCourseType] = useState<"THEORY" | "INTEGRATED">("THEORY");
  const [cycle, setCycle] = useState<"IAT-1" | "IAT-2">("IAT-1");
  const [subject, setSubject] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [tab, setTab] = useState("");
  const [edits, setEdits] = useState<Record<string, Record<string, (number | null)[]>>>({});
  const [att, setAtt] = useState<Attainment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Departments (COE / Associate Dean choose; faculty and HOD work in their own) and the subject catalog
  useEffect(() => {
    if (mode === "admin") {
      apiClient.get("/admin/departments").then((r) => setDepartments(r.data.map((d: any) => ({ key: d.key, name: d.name }))))
        .catch((e) => setError(apiErrorMessage(e, "Could not load departments.")));
    } else {
      apiClient.get(`/${mode}/subjects`).then((r) => setSubjects(r.data)).catch((e) => setError(apiErrorMessage(e, "Could not load subjects.")));
    }
  }, [mode]);
  useEffect(() => {
    if (mode !== "admin" || !dept) return;
    apiClient.get("/admin/subjects", { params: { dept } }).then((r) => setSubjects(r.data)).catch((e) => setError(apiErrorMessage(e, "Could not load subjects.")));
  }, [mode, dept]);

  const semesterSubjects = subjects.filter((s) => s.semester === semester);
  const params = (extra: Record<string, string> = {}) => ({ ...(mode === "admin" ? { dept } : {}), semester, subject, courseType, ...extra });

  const load = async (keepTab = false) => {
    if (!semester || !subject || (mode === "admin" && !dept)) return;
    setBusy(true);
    setError("");
    try {
      const s = (await apiClient.get<Sheet>(base, { params: params({ cycle }) })).data;
      setSheet(s);
      setCourseType(s.courseType);
      setEdits({});
      setAtt(null);
      if (!keepTab || !tab) setTab(s.components[0]?.key ?? "IAT");
    } catch (e) {
      setSheet(null);
      setError(apiErrorMessage(e, "Could not load the sheet."));
    } finally {
      setBusy(false);
    }
  };

  const loadAttainment = async () => {
    setBusy(true);
    setError("");
    try {
      setAtt((await apiClient.get<Attainment>(`${base}/attainment`, { params: params() })).data);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not calculate the CO attainment."));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (tab === "ATTAINMENT" && sheet) void loadAttainment();
  }, [tab, sheet]);

  const comp = sheet?.components.find((c) => c.key === tab) ?? null;
  // The course exit survey is answered by the students in their portal; staff only see the answers
  const canEdit = canEditSheet && comp?.key !== "EXIT_SURVEY";
  const valueOf = (row: StudentRow, c: Component, i: number) => {
    const e = edits[c.key]?.[row.regNo];
    return e ? e[i] : row.marks[c.key]?.[i] ?? null;
  };
  const invalid = (c: Component, i: number, v: number | null) =>
    v != null && (Number.isNaN(v) || v < 0 || v > c.items[i].max || (c.key === "EXIT_SURVEY" && (v < 1 || !Number.isInteger(v))));
  const setValue = (row: StudentRow, c: Component, i: number, raw: string) => {
    const v = raw.trim() === "" ? null : Number(raw);
    setEdits((prev) => {
      const cur = prev[c.key]?.[row.regNo] ?? c.items.map((_, k) => row.marks[c.key]?.[k] ?? null);
      const next = [...cur];
      next[i] = v;
      return { ...prev, [c.key]: { ...(prev[c.key] || {}), [row.regNo]: next } };
    });
  };
  const dirty = comp ? Object.keys(edits[comp.key] || {}).length : 0;
  const anyInvalid = comp != null && Object.values(edits[comp.key] || {}).some((vals) => vals.some((v, i) => invalid(comp, i, v)));

  const save = async () => {
    if (!sheet || !comp || dirty === 0 || anyInvalid) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.put(base, {
        semester: sheet.semester, subjectCode: sheet.subjectCode, courseType, component: comp.key,
        rows: Object.entries(edits[comp.key]).map(([regNo, marks]) => ({ regNo, marks })),
      });
      onToast?.(`${comp.title} saved for ${sheet.subjectCode}.`);
      await load(true);
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save the marks."));
    } finally {
      setBusy(false);
    }
  };

  // Enter moves down a column, as in the workbook
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, r: number, i: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    document.querySelector<HTMLInputElement>(`[data-cell="${r + (e.shiftKey ? -1 : 1)}-${i}"]`)?.focus();
  };

  const coGroups = (items: { co: string; max: number }[]) => {
    const groups: Record<string, { idx: number[]; max: number }> = {};
    items.forEach((it, i) => {
      groups[it.co] = groups[it.co] || { idx: [], max: 0 };
      groups[it.co].idx.push(i);
      groups[it.co].max += it.max;
    });
    return groups;
  };

  const csv = () => {
    if (!att) return;
    const integrated = att.courseType === "INTEGRATED";
    const head = ["Sl No", "Student Name", "Reg No", ...COS.flatMap((c) => c === "CO6"
      ? [`${c} IAT %`, `${c} Activity %`, `${c} Total`]
      : integrated ? [`${c} IAT %`, `${c} Lab %`, `${c} Total`] : [`${c} IAT %`, `${c} Assignment %`, `${c} Quiz %`, `${c} Total`])];
    const rows = att.students.map((s, i) => [i + 1, s.name, s.regNo, ...COS.flatMap((c) => c === "CO6"
      ? [s.iat[c], s.activity, s.total[c]]
      : integrated ? [s.iat[c], s.quizOrLab[c], s.total[c]] : [s.iat[c], s.assignment[c], s.quizOrLab[c], s.total[c]]).map((v) => f(v))]);
    const lines = [head, ...rows, [], ["", "Attainment", "", ...COS.map((c) => att.internal[c].level)]]
      .map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","));
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `CO_attainment_${att.subjectCode}_${att.semester.replace(" ", "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const th = "px-2 py-2 text-[10px] font-black uppercase text-center border border-slate-200";
  const td = "px-2 py-1.5 text-xs text-center border border-slate-100";

  return (
    <div className="space-y-5">
      <div className="bg-white text-[#0B192C] rounded-3xl p-6 shadow-lg border border-[#D4A72C]/30">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">R2026 · Direct CO assessment</span>
        <h2 className="text-xl sm:text-2xl font-black mt-1">Internal Marks · CO Attainment Sheet</h2>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          {canEditSheet
            ? "Choose the subject and IAT cycle, then enter each sheet question-wise. IAT marks come from the answer-script mark entry. The CO of every question and all calculations follow the college's R2026 CO attainment workbook."
            : "View the question-wise internal marks and the CO attainment of any subject (read-only)."}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        {mode === "admin" && (
          <label className="space-y-1 block">
            <span className="text-[11px] font-bold text-slate-600">Department</span>
            <select className={sel} value={dept} onChange={(e) => { setDept(e.target.value); setSubject(""); setSheet(null); }} aria-label="Department">
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
            </select>
          </label>
        )}
        <label className="space-y-1 block">
          <span className="text-[11px] font-bold text-slate-600">Semester</span>
          <select className={sel} value={semester} onChange={(e) => { setSemester(e.target.value); setSubject(""); setSheet(null); }} aria-label="Semester">
            <option value="">Select semester</option>
            {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-bold text-slate-600">Course type</span>
          <select className={sel} value={courseType} disabled={sheet?.courseTypeLocked} onChange={(e) => { setCourseType(e.target.value as any); setSheet(null); }} aria-label="Course type">
            <option value="THEORY">Theory</option>
            <option value="INTEGRATED">Integrated</option>
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] font-bold text-slate-600">IAT cycle</span>
          <select className={sel} value={cycle} onChange={(e) => { setCycle(e.target.value as any); setSheet(null); }} aria-label="IAT cycle">
            <option value="IAT-1">IAT-1</option>
            <option value="IAT-2">IAT-2</option>
          </select>
        </label>
        <label className="space-y-1 block col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-600">Subject</span>
          <select className={sel} value={subject} onChange={(e) => {
            setSubject(e.target.value);
            setSheet(null);
            // Subject codes ending in I are integrated courses
            if (e.target.value) setCourseType(e.target.value.endsWith("I") ? "INTEGRATED" : "THEORY");
          }} aria-label="Subject">
            <option value="">{semester ? "Select subject" : "Choose the semester first"}</option>
            {semesterSubjects.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.title}</option>)}
          </select>
        </label>
        <button onClick={() => load()} disabled={busy || !semester || !subject || (mode === "admin" && !dept)}
          className="h-10 rounded-xl bg-[#0B192C] text-white text-xs font-black hover:bg-[#152744] disabled:opacity-50 flex items-center justify-center gap-2">
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Load sheet
        </button>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {sheet && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <p className="font-black text-[#0B192C] text-sm">{sheet.subjectCode} · {sheet.subjectTitle}</p>
              <p className="text-slate-500">{sheet.deptName} · {sheet.semester} · {sheet.courseType === "INTEGRATED" ? "Integrated" : "Theory"} course · {sheet.cycle}{sheet.courseTypeLocked ? " · course type fixed once marks were entered" : ""}</p>
            </div>
            {canEdit && comp && (
              <button onClick={save} disabled={busy || dirty === 0 || anyInvalid}
                className="h-9 px-4 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-black disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> Save {comp.title}{dirty ? ` (${dirty})` : ""}
              </button>
            )}
          </div>

          <div role="tablist" className="flex gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
            {[...sheet.components.map((c) => ({ key: c.key, label: c.title })), { key: "IAT", label: `${sheet.cycle} (answer scripts)` }, { key: "ATTAINMENT", label: "CO Attainment" }].map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${tab === t.key ? "bg-[#0B192C] text-white" : "text-slate-600 hover:bg-white"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {comp?.key === "EXIT_SURVEY" && (
            <SurveyWindowPanel sheet={sheet} editable={canEditSheet} base={base} onSaved={() => load(true)} onToast={onToast} />
          )}
          {comp && (
            <div className="overflow-auto max-h-[70vh]">
              <table className="text-left border-collapse min-w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className={th} rowSpan={3}>Sl No</th>
                    <th className={`${th} text-left`} rowSpan={3}>Student Name</th>
                    <th className={th} rowSpan={3}>Reg. No / Q. No</th>
                    {comp.items.map((it) => <th key={it.label} className={`${th} bg-slate-50`}>{it.label}</th>)}
                    {comp.key !== "EXIT_SURVEY" && Object.keys(coGroups(comp.items)).map((co) => <th key={co} className={`${th} bg-amber-50`} rowSpan={2}>{co}</th>)}
                  </tr>
                  <tr>{comp.items.map((it, i) => <th key={i} className={`${th} text-slate-500`}>{it.co}</th>)}</tr>
                  <tr>
                    {comp.items.map((it, i) => <th key={i} className={`${th} text-slate-500`}>{comp.key === "EXIT_SURVEY" ? "1–5" : it.max}</th>)}
                    {comp.key !== "EXIT_SURVEY" && Object.entries(coGroups(comp.items)).map(([co, g]) => <th key={co} className={`${th} bg-amber-50`}>/ {g.max}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sheet.students.map((row, r) => (
                    <tr key={row.regNo} className="hover:bg-slate-50">
                      <td className={td}>{r + 1}</td>
                      <td className={`${td} text-left font-semibold whitespace-nowrap`}>{row.name}</td>
                      <td className={`${td} font-mono`}>{row.regNo}</td>
                      {comp.items.map((it, i) => {
                        const v = valueOf(row, comp, i);
                        return (
                          <td key={i} className="p-0.5 border border-slate-100 text-center">
                            {canEdit ? (
                              <input type="number" inputMode="decimal" min={comp.key === "EXIT_SURVEY" ? 1 : 0} max={it.max} step={comp.key === "EXIT_SURVEY" || it.max === 1 ? 1 : 0.5}
                                data-cell={`${r}-${i}`} onKeyDown={(e) => onKey(e, r, i)}
                                aria-label={`${row.name} ${it.label}`} value={v == null || Number.isNaN(v) ? "" : v}
                                onChange={(e) => setValue(row, comp, i, e.target.value)}
                                className={`w-11 px-1 py-1 rounded border text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A72C] ${invalid(comp, i, v) ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200"}`} />
                            ) : <span className="text-xs font-bold">{f(v)}</span>}
                          </td>
                        );
                      })}
                      {comp.key !== "EXIT_SURVEY" && Object.entries(coGroups(comp.items)).map(([co, g]) => (
                        <td key={co} className={`${td} bg-amber-50/50 font-bold`}>{f(g.idx.reduce((s, i) => s + (valueOf(row, comp, i) ?? 0), 0))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sheet.students.length === 0 && <p className="p-8 text-center text-xs text-slate-500">No students in this department and semester.</p>}
            </div>
          )}

          {tab === "IAT" && (
            <div className="overflow-auto max-h-[70vh]">
              <p className="px-4 pt-3 text-[11px] text-slate-500">Read-only. These are the {sheet.cycle} marks entered against the answer scripts. Only the answered choice of each question counts (the better one, if both were filled), up to the question's maximum.</p>
              <table className="border-collapse min-w-full mt-2">
                <thead className="sticky top-0 bg-white">
                  <tr><th className={th} rowSpan={2}>Sl No</th><th className={`${th} text-left`} rowSpan={2}>Student Name</th><th className={th} rowSpan={2}>Reg. No</th>
                    {sheet.iatColumns.map((c) => <th key={c.label} className={`${th} bg-slate-50`}>{c.label}</th>)}</tr>
                  <tr>{sheet.iatColumns.map((c) => <th key={c.label} className={`${th} text-slate-500`}>{c.co}<br />{c.max}</th>)}</tr>
                </thead>
                <tbody>
                  {sheet.students.map((row, r) => (
                    <tr key={row.regNo}>
                      <td className={td}>{r + 1}</td><td className={`${td} text-left font-semibold whitespace-nowrap`}>{row.name}</td><td className={`${td} font-mono`}>{row.regNo}</td>
                      {sheet.iatColumns.map((c, i) => <td key={c.label} className={`${td} ${row.iat && row.iat[i] >= c.max && c.max > 2 ? "font-bold" : ""}`}>{row.iat ? f(row.iat[i]) : <span className="text-slate-300">—</span>}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "ATTAINMENT" && (
            <div className="p-4 space-y-6">
              {!att ? <p className="text-xs text-slate-500">{busy ? "Calculating..." : "No data."}</p> : (
                <>
                  <div className="flex justify-end">
                    <button onClick={csv} className="h-9 px-4 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-2 hover:bg-slate-50"><Download size={14} /> Download (CSV)</button>
                  </div>
                  <section className="overflow-auto">
                    <h3 className="text-sm font-black text-[#0B192C] mb-2">CO Attainment for IAT &amp; other activities</h3>
                    <table className="border-collapse min-w-full">
                      <thead>
                        <tr><th className={th} rowSpan={2}>Sl No</th><th className={`${th} text-left`} rowSpan={2}>Student Name</th>
                          {COS.map((c) => <th key={c} className={`${th} bg-slate-50`} colSpan={c === "CO6" || att.courseType === "INTEGRATED" ? 2 : 3}>{c}</th>)}
                          <th className={`${th} bg-amber-50`} colSpan={6}>Total CO Marks (%)</th></tr>
                        <tr>{COS.flatMap((c) => (c === "CO6" ? ["IAT", "Activity"] : att.courseType === "INTEGRATED" ? ["IAT", "Lab"] : ["IAT", "Assignment", "Quiz"]).map((x) => <th key={c + x} className={th}>{x}</th>))}
                          {COS.map((c) => <th key={c} className={`${th} bg-amber-50`}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {att.students.map((s, i) => (
                          <tr key={s.regNo}>
                            <td className={td}>{i + 1}</td><td className={`${td} text-left whitespace-nowrap font-semibold`}>{s.name}</td>
                            {COS.flatMap((c) => (c === "CO6" ? [s.iat[c], s.activity] : att.courseType === "INTEGRATED" ? [s.iat[c], s.quizOrLab[c]] : [s.iat[c], s.assignment[c], s.quizOrLab[c]]).map((v, k) => <td key={c + k} className={td}>{f(v)}</td>))}
                            {COS.map((c) => <td key={c} className={`${td} bg-amber-50/50 font-bold ${s.total[c] >= 50 ? "text-emerald-700" : "text-red-700"}`}>{f(s.total[c])}</td>)}
                          </tr>
                        ))}
                        {[["Total No. of students", (l: Level) => l.students], ["No. of students scoring >= 50%", (l: Level) => l.above], ["% of students scoring >=50", (l: Level) => f(l.percent)], ["Attainment", (l: Level) => l.level]].map(([label, get]) => (
                          <tr key={label as string} className="bg-slate-50 font-bold">
                            <td className={`${td} text-right`} colSpan={att.courseType === "INTEGRATED" ? 14 : 19}>{label as string}</td>
                            {COS.map((c) => <td key={c} className={td}>{(get as (l: Level) => any)(att.internal[c])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>

                  <section className="grid lg:grid-cols-2 gap-6">
                    <div className="overflow-auto">
                      <h3 className="text-sm font-black text-[#0B192C] mb-2">Semester End Examination (from the End Semester grades)</h3>
                      <table className="border-collapse min-w-full">
                        <thead><tr><th className={`${th} text-left`}>Student</th><th className={th}>Grade</th><th className={th}>Grade points</th><th className={th}>% (each CO)</th></tr></thead>
                        <tbody>
                          {att.students.map((s) => <tr key={s.regNo}><td className={`${td} text-left`}>{s.name}</td><td className={td}>{s.grade ?? "—"}</td><td className={td}>{f(s.gradePoint)}</td><td className={td}>{f(s.seePercent)}</td></tr>)}
                          <tr className="bg-slate-50 font-bold"><td className={`${td} text-right`} colSpan={3}>Students ≥ 50% · % · Attainment</td><td className={td}>{att.university.CO1.above} · {f(att.university.CO1.percent)} · {att.university.CO1.level}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="overflow-auto">
                      <h3 className="text-sm font-black text-[#0B192C] mb-2">Indirect attainment (Course Exit Survey)</h3>
                      <table className="border-collapse min-w-full">
                        <thead><tr>{["CO", "Excellent", "Very good", "Good", "Satisfactory", "Poor", "Total", "Exc.+V.good", "%", "Level"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                        <tbody>{att.survey.map((r) => <tr key={r.co}>{[r.co, r.excellent, r.veryGood, r.good, r.satisfactory, r.poor, r.total, r.excellentOrVeryGood, f(r.percent), r.level].map((v, k) => <td key={k} className={td}>{v}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  </section>

                  <section className="overflow-auto">
                    <h3 className="text-sm font-black text-[#0B192C] mb-2">Final CO Assessment</h3>
                    <table className="border-collapse min-w-full">
                      <thead><tr>{["COs", "IAT level", "SEE level", "A = 0.5×SEE + 0.5×IAT", "B = 90% of A", "C = Exit survey level", "D = 10% of C", "E = B + D", "Attainment %"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                      <tbody>{att.overall.map((r) => <tr key={r.co}>{[r.co, r.iat, r.see, f(r.direct), f(r.directNinety), r.exit, f(r.exitTen), f(r.total), f(r.percent)].map((v, k) => <td key={k} className={`${td} ${k === 8 ? "font-black" : ""}`}>{v}</td>)}</tr>)}</tbody>
                    </table>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** The period in which students may answer this subject's exit survey (set by the faculty or the HOD). */
const SurveyWindowPanel: React.FC<{ sheet: Sheet; editable: boolean; base: string; onSaved: () => void; onToast?: (m: string) => void }> = ({ sheet, editable, base, onSaved, onToast }) => {
  const local = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const w = sheet.surveyWindow;
  const [opens, setOpens] = useState(local(w?.opensAt) || local(new Date().toISOString()));
  const [closes, setCloses] = useState(local(w?.closesAt) || local(new Date(Date.now() + 7 * 864e5).toISOString()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (closeNow = false) => {
    setBusy(true);
    setError("");
    try {
      const opensAt = closeNow ? new Date(Date.now() - 60000).toISOString() : new Date(opens).toISOString();
      const closesAt = closeNow ? new Date().toISOString() : new Date(closes).toISOString();
      await apiClient.put(`${base}/survey-window`, { semester: sheet.semester, subjectCode: sheet.subjectCode, opensAt: closeNow && w ? w.opensAt : opensAt, closesAt });
      onToast?.(closeNow ? `Exit survey of ${sheet.subjectCode} closed.` : `Exit survey of ${sheet.subjectCode} opened to students.`);
      onSaved();
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save the survey period."));
    } finally {
      setBusy(false);
    }
  };
  const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mx-4 mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
      <p className="text-[11px] font-semibold text-slate-700">
        Students answer the course exit survey in the student portal; their ratings feed the indirect CO attainment automatically.
        {" "}{w ? (
          <span className={`font-black ${w.open ? "text-emerald-700" : "text-slate-700"}`}>
            {w.open ? "Open now" : new Date(w.closesAt) < new Date() ? "Closed" : "Scheduled"}: {fmt(w.opensAt)} – {fmt(w.closesAt)} (set by {w.setBy})
          </span>
        ) : <span className="font-black text-red-700">Not opened to students yet.</span>}
      </p>
      {editable && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-bold text-slate-600 space-y-1 block">
            <span className="block">Opens</span>
            <input type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} className="h-9 px-2 rounded-lg border border-slate-300 text-xs" />
          </label>
          <label className="text-[11px] font-bold text-slate-600 space-y-1 block">
            <span className="block">Closes</span>
            <input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} className="h-9 px-2 rounded-lg border border-slate-300 text-xs" />
          </label>
          <button onClick={() => save(false)} disabled={busy || !opens || !closes} className="h-9 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-black disabled:opacity-50">
            {w ? "Update survey period" : "Open survey to students"}
          </button>
          {w?.open && (
            <button onClick={() => save(true)} disabled={busy} className="h-9 px-4 rounded-xl border border-red-300 text-red-700 text-xs font-black disabled:opacity-50">
              Close now
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
};

export default CoAssessment;
