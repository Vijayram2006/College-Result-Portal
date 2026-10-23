import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Award, BarChart3, BookOpen, Building2, CalendarRange, ClipboardList, Download, FileSpreadsheet,
  FilterX, GraduationCap, SlidersHorizontal, Layers, Lightbulb, ListChecks, PenLine, RefreshCw, Sigma, Target, TrendingDown,
  TrendingUp, Trophy, UserCheck, Users,
} from "lucide-react";
import {
  adminResultsApi, apiErrorMessage, marksApi, ResultBatchRecord, StudentMarkRecord, StudentRecord, studentsApi,
  SubjectRecord, subjectsApi,
} from "../services/api";
import { getActiveCollege } from "../utils/rbac";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { Department, getStoredDepartments, refreshDepartments } from "./Departments";
import * as A from "../utils/analytics";
import { BellCurveAnalytics } from "../components/analytics/BellCurve";
import { Activity } from "lucide-react";
import {
  ASSESSMENT_COLORS, AssessmentDot, AXIS, Card, ChartTooltip, Column, CRITICAL, DataTable, Drawer, ExportButtons,
  GRADE_COLORS, GradeChip, GRID, Kpi, PctBar, ResultChip, SERIES,
} from "../components/analytics/AnalyticsUi";

/*
 * Result Analytics: every view is computed in the browser from the marks the server holds (all entered answer
 * scripts, published or not), so it is live and needs no extra endpoints. Filters live in the URL, so a filtered
 * view can be bookmarked or sent to someone.
 *
 * Colours follow the validated reference palette: assessments are categorical identities (slots 1-3), grades are an
 * ordered single-hue ramp with F in the reserved critical red, and every chart has a table beside it.
 */

type Filters = { dept: string; sem: string; assess: string; subject: string; cat: string; pub: string };
const DEFAULT_FILTERS: Filters = { dept: "all", sem: "all", assess: "all", subject: "all", cat: "all", pub: "all" };

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "departments", label: "Department-wise", icon: Building2 },
  { id: "subjects", label: "Subject-wise", icon: BookOpen },
  { id: "assessments", label: "IAT / Assessment-wise", icon: Layers },
  { id: "semesters", label: "Semester-wise", icon: CalendarRange },
  { id: "questions", label: "Questions & COs", icon: Target },
  { id: "examiners", label: "Examiner-wise", icon: PenLine },
  { id: "students", label: "Students", icon: Users },
  { id: "bellcurve", label: "Bell Curve", icon: Activity },
  { id: "data", label: "All Marks", icon: ClipboardList },
] as const;
type TabId = (typeof TABS)[number]["id"];

const REFRESH_MS = 30000;

function readUrl(): { filters: Filters; tab: TabId } {
  const p = new URLSearchParams(window.location.search);
  const filters = { ...DEFAULT_FILTERS };
  (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).forEach((k) => {
    const v = p.get(k);
    if (v) filters[k] = v;
  });
  const tab = p.get("tab");
  return { filters, tab: (TABS.some((t) => t.id === tab) ? tab : "overview") as TabId };
}

function applyFilters(rows: A.MarkRow[], f: Filters, skip: (keyof Filters)[] = []): A.MarkRow[] {
  const on = (k: keyof Filters) => !skip.includes(k) && f[k] !== "all";
  return rows.filter(
    (r) =>
      (!on("dept") || r.deptKey === f.dept) &&
      (!on("sem") || r.semester === f.sem) &&
      (!on("assess") || r.assessment === f.assess) &&
      (!on("subject") || r.subjectCode === f.subject) &&
      (!on("cat") || r.category === f.cat) &&
      (!on("pub") || (f.pub === "published" ? r.published : !r.published))
  );
}

const fmtDate = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

const selectCls =
  "w-full px-2.5 py-2 rounded-xl border border-[#E5E1D8] bg-white font-bold text-[#0B192C] text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/50";

export const AnalyticsPage: React.FC = () => {
  const [, navigate] = useLocation();
  const college = getActiveCollege();
  const initial = useMemo(readUrl, []);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [tab, setTab] = useState<TabId>(initial.tab);

  const [marks, setMarks] = useState<StudentMarkRecord[]>([]);
  const [batches, setBatches] = useState<ResultBatchRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>(getStoredDepartments());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [live, setLive] = useState(true);

  const [openSubject, setOpenSubject] = useState<string | null>(null); // dept|sem|code|assessment
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [questionAssessment, setQuestionAssessment] = useState<string>("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const [m, b, s, st] = await Promise.all([
        marksApi.all(), adminResultsApi.getResultBatches(), subjectsApi.list(), studentsApi.list(),
      ]);
      setMarks(m); setBatches(b); setSubjects(s); setStudents(st);
      setUpdatedAt(new Date().toLocaleTimeString("en-IN"));
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load the analytics data."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    refreshDepartments().then(setDepartments).catch(() => undefined);
  }, [load]);

  // Live mode: refresh quietly while the page is visible, and whenever marks are saved in another tab of this panel
  useEffect(() => {
    if (!live) return;
    const tick = () => document.visibilityState === "visible" && load(true);
    const id = window.setInterval(tick, REFRESH_MS);
    const onMarks = () => load(true);
    window.addEventListener("kvell_marks_updated", onMarks);
    return () => { window.clearInterval(id); window.removeEventListener("kvell_marks_updated", onMarks); };
  }, [live, load]);

  // Keep the URL in step with the filters and tab
  useEffect(() => {
    const p = new URLSearchParams();
    (Object.keys(filters) as (keyof Filters)[]).forEach((k) => filters[k] !== "all" && p.set(k, filters[k]));
    if (tab !== "overview") p.set("tab", tab);
    const qs = p.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [filters, tab]);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((f) => {
      const next = { ...f, [key]: value };
      if (key === "dept" || key === "sem") next.subject = "all"; // the subject list depends on both
      return next;
    });
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  /* ---------- data ---------- */

  const allRows = useMemo(() => A.buildRows(marks, batches, subjects), [marks, batches, subjects]);
  const rows = useMemo(() => applyFilters(allRows, filters), [allRows, filters]);
  /** Everything except the assessment filter, for comparisons across IAT-1 / IAT-2 / End Semester. */
  const crossAssessment = useMemo(() => applyFilters(allRows, filters, ["assess"]), [allRows, filters]);
  /** Everything except semester and assessment, for the semester trend. */
  const crossSemester = useMemo(() => applyFilters(allRows, filters, ["sem", "assess"]), [allRows, filters]);
  const enrolled = useMemo(
    () => students.filter((s) =>
      (filters.dept === "all" || s.deptKey === filters.dept) &&
      (filters.sem === "all" || s.semester === filters.sem) &&
      (filters.cat === "all" || (filters.cat === "Lateral" ? s.category === "lateral" : s.category !== "lateral"))),
    [students, filters.dept, filters.sem, filters.cat]
  );

  const stat = useMemo(() => A.stats(rows), [rows]);
  const clear = useMemo(() => A.allClear(rows), [rows]);
  const deptT = useMemo(() => A.departmentTable(rows, students, filters.sem === "all" ? "" : filters.sem), [rows, students, filters.sem]);
  const subjT = useMemo(() => A.subjectTable(rows, students), [rows, students]);
  const compT = useMemo(() => A.assessmentComparison(crossAssessment), [crossAssessment]);
  const progress = useMemo(() => A.iatProgress(crossAssessment), [crossAssessment]);
  const semT = useMemo(() => A.semesterTable(crossSemester), [crossSemester]);
  const examT = useMemo(() => A.examinerTable(rows), [rows]);
  const studT = useMemo(() => A.studentTable(rows), [rows]);
  const riskT = useMemo(() => A.atRiskStudents(rows), [rows]);
  const toppers = useMemo(() => A.deptToppers(rows, 3), [rows]);
  const catT = useMemo(() => A.categoryTable(rows), [rows]);
  const gradeMatrix = useMemo(() => A.deptGradeMatrix(rows), [rows]);

  const assessmentsPresent = useMemo(
    () => A.ASSESSMENTS.filter((a) => crossAssessment.some((r) => r.assessment === a)),
    [crossAssessment]
  );
  const qAssessment = filters.assess !== "all" ? filters.assess : questionAssessment || assessmentsPresent[0] || "";
  const qRows = useMemo(() => rows.filter((r) => r.assessment === qAssessment), [rows, qAssessment]);
  const questionT = useMemo(() => A.questionTable(qRows), [qRows]);
  const coT = useMemo(() => A.coTable(qRows), [qRows]);

  /* ---------- filter options ---------- */

  const deptOptions = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.key, `${d.code || d.key.toUpperCase()} — ${d.name}`));
    allRows.forEach((r) => !map.has(r.deptKey) && map.set(r.deptKey, r.deptName));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [departments, allRows]);
  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    const fits = (dept: string, sem: string) => (filters.dept === "all" || dept === filters.dept) && (filters.sem === "all" || sem === filters.sem);
    subjects.filter((s) => fits(s.deptKey, s.semester)).forEach((s) => map.set(s.code, `${s.code} — ${s.title}`));
    allRows.filter((r) => fits(r.deptKey, r.semester)).forEach((r) => !map.has(r.subjectCode) && map.set(r.subjectCode, `${r.subjectCode} — ${r.subjectTitle}`));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [subjects, allRows, filters.dept, filters.sem]);

  /** Answer scripts per option of each filter, given the other filters (so empty options are visible before clicking). */
  const counts = useMemo(() => {
    const countBy = (skip: (keyof Filters)[], key: (r: A.MarkRow) => string) => {
      const m = new Map<string, number>();
      applyFilters(allRows, filters, skip).forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
      return m;
    };
    return {
      dept: countBy(["dept", "subject"], (r) => r.deptKey),
      sem: countBy(["sem", "subject"], (r) => r.semester),
      assess: countBy(["assess"], (r) => r.assessment),
      subject: countBy(["subject"], (r) => r.subjectCode),
      cat: countBy(["cat"], (r) => r.category),
      pub: countBy(["pub"], (r) => (r.published ? "published" : "unpublished")),
    };
  }, [allRows, filters]);
  const total = (m: Map<string, number>) => Array.from(m.values()).reduce((a, b) => a + b, 0);
  /** Department chips: short code on the chip, full name on hover; departments with marks first. */
  const deptChips = useMemo(() => {
    const names = new Map(deptOptions.map(([k, label]) => [k, label]));
    return Array.from(names.keys())
      .map((key) => {
        const d = departments.find((x) => x.key === key);
        return { key, code: d?.code || key.toUpperCase(), name: d?.name || names.get(key) || key };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [deptOptions, departments]);
  const chipValue = (k: keyof Filters) =>
    k === "dept" ? deptChips.find((d) => d.key === filters.dept)?.code ?? filters.dept.toUpperCase()
      : k === "pub" ? (filters.pub === "published" ? "Published" : "Not published")
      : filters[k];

  const filterLabels = useMemo(() => {
    const out: Record<string, string> = {
      College: college.name,
      Department: filters.dept === "all" ? "All departments" : deptOptions.find(([k]) => k === filters.dept)?.[1] ?? filters.dept,
      Semester: filters.sem === "all" ? "All semesters" : filters.sem,
      Assessment: filters.assess === "all" ? "All assessments" : filters.assess,
      Subject: filters.subject === "all" ? "All subjects" : subjectOptions.find(([k]) => k === filters.subject)?.[1] ?? filters.subject,
      Category: filters.cat === "all" ? "Regular and lateral" : filters.cat,
      Publication: filters.pub === "all" ? "Published and not published" : filters.pub === "published" ? "Published only" : "Not published only",
    };
    return out;
  }, [college.name, filters, deptOptions, subjectOptions]);

  const activeChips = (Object.keys(filters) as (keyof Filters)[]).filter((k) => filters[k] !== "all");
  const chipLabel: Record<keyof Filters, string> = { dept: "Department", sem: "Semester", assess: "Assessment", subject: "Subject", cat: "Category", pub: "Publication" };
  const filterTag = activeChips.map((k) => (k === "dept" ? filters.dept.toUpperCase() : filters[k])).join("_").replace(/\s+/g, "-");
  const fileName = (what: string) => `KVELL_${what}${filterTag ? `_${filterTag}` : ""}_${fmtDate()}`;

  /* ---------- downloads ---------- */

  const tabSheets = (id: TabId): A.Sheet[] => {
    switch (id) {
      case "overview": return [A.sheets.department(deptT), A.sheets.subject(subjT), A.sheets.grades(stat), A.sheets.categories(catT)];
      case "departments": return [A.sheets.department(deptT), A.sheets.categories(catT), A.sheets.toppers(toppers)];
      case "subjects": return [A.sheets.subject(subjT)];
      case "assessments": return [A.sheets.comparison(compT), A.sheets.progress(progress)];
      case "semesters": return [A.sheets.semesters(semT)];
      case "questions": return [A.sheets.questions(questionT), A.sheets.cos(coT)];
      case "examiners": return [A.sheets.examiners(examT)];
      case "students": return [A.sheets.students(studT), A.sheets.risk(riskT), A.sheets.toppers(toppers)];
      case "data": return [A.sheets.raw(rows)];
      case "bellcurve": return [A.sheets.raw(rows)];
    }
  };
  const downloadEverything = () =>
    A.exportSheets(fileName("Result_Analytics_Full_Report"), [
      A.sheets.department(deptT), A.sheets.subject(subjT), A.sheets.comparison(compT), A.sheets.progress(progress),
      A.sheets.semesters(semT), A.sheets.grades(stat), A.sheets.categories(catT), A.sheets.questions(questionT),
      A.sheets.cos(coT), A.sheets.examiners(examT), A.sheets.students(studT), A.sheets.risk(riskT),
      A.sheets.toppers(toppers), A.sheets.raw(rows),
    ], { ...filterLabels, "Questions & COs assessment": qAssessment || "—" });
  const downloadTab = () =>
    A.exportSheets(fileName(`Analytics_${TABS.find((t) => t.id === tab)!.label.replace(/[^A-Za-z]+/g, "_")}`), tabSheets(tab), filterLabels);

  /* ---------- drill-down helpers ---------- */

  const drillDept = (deptKey: string) => { setFilter("dept", deptKey); setTab("subjects"); };
  const closeSubject = useCallback(() => setOpenSubject(null), []);
  const closeStudent = useCallback(() => setOpenStudent(null), []);

  /* ---------- render ---------- */

  const hasData = allRows.length > 0;
  /** Department name -> short key (CSE, AIDS, ...) so table columns stay on one line. */
  const deptCodes = useMemo(() => new Map(allRows.map((r) => [r.deptName, r.deptKey.toUpperCase()])), [allRows]);

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0B192C] text-white p-6 sm:p-7 shadow-lg">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#D4A72C]/10" />
        <div className="absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-black text-[#D4A72C] uppercase tracking-widest mb-1.5">
              <BarChart3 size={14} /> Result Analytics · Live
              <span className="relative flex h-2 w-2">
                {live && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1baf7a] opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${live ? "bg-[#1baf7a]" : "bg-gray-500"}`} />
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black leading-tight">Examination Result Analysis</h1>
            <p className="text-xs text-white/70 mt-1.5 max-w-2xl">
              Department, subject, IAT, semester, question, CO, examiner and student analysis from every mark entered,
              published or not. Click any bar or row to drill down; every table downloads as Excel or CSV.
            </p>
            <p className="text-[11px] text-white/50 mt-2 font-semibold">
              {updatedAt ? `Updated ${updatedAt}` : "Loading…"} · {allRows.length} answer scripts in total
              {live ? ` · refreshes every ${REFRESH_MS / 1000}s` : " · live refresh off"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLive(!live)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition ${live ? "border-[#1baf7a]/60 bg-[#1baf7a]/15 text-white" : "border-white/20 bg-white/5 text-white/70"}`}
              title="Refresh automatically while this page is open"
            >
              Live {live ? "ON" : "OFF"}
            </button>
            <button
              type="button"
              onClick={() => load()}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              disabled={!hasData}
              onClick={downloadTab}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              title="Download the tables of the tab you are on"
            >
              <Download size={14} /> This tab
            </button>
            <button
              type="button"
              disabled={!hasData}
              onClick={downloadEverything}
              className="px-4 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#e2b53a] text-[#0B192C] text-xs font-black flex items-center gap-1.5 shadow disabled:opacity-40"
              title="One Excel workbook with every analysis (14 sheets) for the current filters"
            >
              <FileSpreadsheet size={15} /> Download full report
            </button>
          </div>
        </div>
      </div>

      {/* Filters: every choice is one click, and each option shows how many answer scripts it has */}
      <div id="analytics-filters" className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-4 sm:p-5 space-y-3.5 scroll-mt-32">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-black text-sm text-[#0B192C] flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-[#D4A72C]" /> Filters
            <span className="text-[11px] font-semibold text-gray-400">Pick what to analyse. Numbers show how many answer scripts each option has.</span>
          </h2>
          {activeChips.length > 0 && (
            <button type="button" onClick={resetFilters} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#8C2F00] bg-[#FFF4D6] hover:bg-[#FBE7B5] flex items-center gap-1.5">
              <FilterX size={13} /> Clear all filters
            </button>
          )}
        </div>

        <FilterRow label="Assessment">
          <Pill active={filters.assess === "all"} onClick={() => setFilter("assess", "all")} count={total(counts.assess)}>All</Pill>
          {A.ASSESSMENTS.map((a) => (
            <Pill key={a} active={filters.assess === a} onClick={() => setFilter("assess", a)} count={counts.assess.get(a) ?? 0}>
              <AssessmentDot name={a} />
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Department">
          <Pill active={filters.dept === "all"} onClick={() => setFilter("dept", "all")} count={total(counts.dept)}>All</Pill>
          {deptChips.map((d) => (
            <Pill key={d.key} active={filters.dept === d.key} onClick={() => setFilter("dept", d.key)} count={counts.dept.get(d.key) ?? 0} title={d.name}>
              {d.code}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Semester">
          <Pill active={filters.sem === "all"} onClick={() => setFilter("sem", "all")} count={total(counts.sem)}>All</Pill>
          {SEMESTER_OPTIONS.map((s) => (
            <Pill key={s} active={filters.sem === s} onClick={() => setFilter("sem", s)} count={counts.sem.get(s) ?? 0} title={s}>
              {s.replace("Semester ", "Sem ")}
            </Pill>
          ))}
        </FilterRow>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto_auto] gap-3.5 xl:gap-6 items-start">
          <FilterRow label="Subject">
            <select
              value={filters.subject}
              onChange={(e) => setFilter("subject", e.target.value)}
              className={`${selectCls} max-w-xl ${filters.subject !== "all" ? "!border-[#0B192C] !bg-[#FFF6DD]" : ""}`}
            >
              <option value="all">
                All subjects{filters.dept !== "all" || filters.sem !== "all" ? " (of the department / semester chosen above)" : ""}
              </option>
              {subjectOptions.map(([k, label]) => (
                <option key={k} value={k}>{label} · {counts.subject.get(k) ?? 0} scripts</option>
              ))}
            </select>
          </FilterRow>
          <FilterRow label="Students" compact>
            <Pill active={filters.cat === "all"} onClick={() => setFilter("cat", "all")}>All</Pill>
            <Pill active={filters.cat === "Regular"} onClick={() => setFilter("cat", "Regular")} count={counts.cat.get("Regular") ?? 0}>Regular</Pill>
            <Pill active={filters.cat === "Lateral"} onClick={() => setFilter("cat", "Lateral")} count={counts.cat.get("Lateral") ?? 0}>Lateral</Pill>
          </FilterRow>
          <FilterRow label="Results" compact>
            <Pill active={filters.pub === "all"} onClick={() => setFilter("pub", "all")}>All</Pill>
            <Pill active={filters.pub === "published"} onClick={() => setFilter("pub", "published")} count={counts.pub.get("published") ?? 0}>Published</Pill>
            <Pill active={filters.pub === "unpublished"} onClick={() => setFilter("pub", "unpublished")} count={counts.pub.get("unpublished") ?? 0}>Not published</Pill>
          </FilterRow>
        </div>
      </div>

      {/* Tabs + what is being shown: stays under the college banner while scrolling on wide screens */}
      <div className="lg:sticky lg:top-[6.75rem] z-20 bg-[#F8F5EE]/95 backdrop-blur py-2 -mx-1 px-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition border ${
                  on ? "bg-[#0B192C] text-white border-[#0B192C] shadow-md" : "bg-white text-gray-700 border-[#E5E1D8] hover:border-[#D4A72C] hover:text-[#0B192C]"
                }`}
              >
                <Icon size={14} className={on ? "text-[#D4A72C]" : "text-gray-400"} /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-bold text-[#0B192C]">
            Showing {rows.length} of {allRows.length} answer scripts
          </span>
          {activeChips.length === 0 ? (
            <span className="text-gray-500 font-semibold">· everything (no filters)</span>
          ) : (
            <>
              {activeChips.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k, "all")}
                  className="px-2 py-0.5 rounded-md bg-[#0B192C] text-white font-bold flex items-center gap-1 hover:bg-[#8C2F00]"
                  title={`Remove the ${chipLabel[k]} filter`}
                >
                  <span className="text-[#D4A72C]">{chipLabel[k]}:</span> {chipValue(k)} <span className="opacity-70">✕</span>
                </button>
              ))}
              <button type="button" onClick={resetFilters} className="px-2 py-0.5 rounded-md font-bold text-[#8C2F00] hover:bg-[#FFF4D6]">
                Clear all
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => document.getElementById("analytics-filters")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="ml-auto px-2 py-0.5 rounded-md font-bold text-[#1c5cab] hover:bg-[#EEF4FC] flex items-center gap-1"
          >
            <SlidersHorizontal size={12} /> Change filters
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white border border-[#E5E1D8] animate-pulse" />)}
        </div>
      ) : !hasData ? (
        <Card>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <h3 className="font-display font-black text-lg text-[#0B192C]">No marks entered yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xl">Analytics fill in as soon as marks are saved in Mark Entry, whether or not they are published.</p>
            </div>
            <button type="button" onClick={() => navigate("/admin/results/validation")} className="px-5 py-3 rounded-2xl bg-[#0B192C] text-white font-extrabold text-xs">
              Go to Mark Entry
            </button>
          </div>
        </Card>
      ) : rows.length === 0 && tab !== "assessments" && tab !== "semesters" ? (
        <Card>
          <div className="text-center py-8">
            <FilterX className="mx-auto text-[#D4A72C]" size={28} />
            <h3 className="font-display font-black text-lg text-[#0B192C] mt-2">No answer scripts match these filters</h3>
            <button type="button" onClick={resetFilters} className="mt-3 px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold">Clear all filters</button>
          </div>
        </Card>
      ) : (
        <>
          {tab === "overview" && (
            <Overview
              stat={stat} clear={clear} enrolled={enrolled.length} deptT={deptT} subjT={subjT} compT={compT}
              studT={studT} riskT={riskT} crossAssessment={crossAssessment} onDept={drillDept}
              onStudent={setOpenStudent} onSubject={setOpenSubject} goTab={setTab}
            />
          )}

          {tab === "departments" && (
            <div className="space-y-5">
              <Card
                title="Pass % by department"
                subtitle="Sorted best first. Click a bar to open that department's subjects."
                actions={<ExportButtons fileName={fileName("Department_wise")} sheet={() => A.sheets.department(deptT)} filters={filterLabels} />}
              >
                <PassBars data={deptT.map((d) => ({ key: d.deptKey, label: d.deptName, value: d.passPct }))} onClick={drillDept} />
              </Card>
              <Card title="Department result summary" subtitle="Click a row to see that department's subjects.">
                <DataTable
                  rows={deptT}
                  rowKey={(r) => r.deptKey}
                  onRowClick={(r) => drillDept(r.deptKey)}
                  initialSort="passPct"
                  columns={[
                    { key: "deptName", label: "Department", value: (r) => r.deptName, className: "font-bold text-[#0B192C]" },
                    { key: "enrolled", label: "Enrolled", value: (r) => r.enrolled, align: "right" },
                    { key: "evaluated", label: "Evaluated", value: (r) => r.evaluated, align: "right" },
                    { key: "subjects", label: "Subjects", value: (r) => r.subjects, align: "right" },
                    { key: "scripts", label: "Scripts", value: (r) => r.scripts, align: "right" },
                    { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                    { key: "passPct", label: "Pass %", value: (r) => r.passPct, render: (r) => <PctBar value={r.passPct} /> },
                    { key: "allClearPct", label: "All-clear %", value: (r) => r.allClearPct, align: "right" },
                    { key: "failed", label: "Failed scripts", value: (r) => r.failed, align: "right", render: (r) => <span className={r.failed ? "text-[#b42318] font-bold" : ""}>{r.failed}</span> },
                    { key: "topper", label: "Top score", value: (r) => r.topper },
                  ]}
                />
              </Card>
              <Card
                title="Grade distribution by department"
                subtitle="Number of answer scripts in each grade."
                actions={<ExportButtons fileName={fileName("Grades_by_department")} sheet={() => ({ name: "Grades by department", rows: gradeMatrix.map((g) => ({ Department: g.dept, ...Object.fromEntries(A.GRADES.map((x) => [x, g[x] ?? 0])), Total: g.total })) })} filters={filterLabels} />}
              >
                <ResponsiveContainer width="100%" height={Math.max(220, gradeMatrix.length * 34 + 70)}>
                  <BarChart data={gradeMatrix} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} {...AXIS} />
                    <YAxis type="category" dataKey="dept" width={150} {...AXIS} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {A.GRADES.map((g) => (
                      <Bar key={g} dataKey={g} name={`Grade ${g}`} stackId="g" fill={GRADE_COLORS[g]} stroke="#fff" strokeWidth={1}
                        onClick={(d: any) => drillDept(d.key ?? d.payload?.key)} cursor="pointer" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Card title="Regular vs lateral entry" actions={<ExportButtons fileName={fileName("Regular_vs_Lateral")} sheet={() => A.sheets.categories(catT)} filters={filterLabels} />}>
                  <DataTable
                    rows={catT}
                    rowKey={(r) => r.category}
                    columns={[
                      { key: "category", label: "Category", value: (r) => r.category, className: "font-bold" },
                      { key: "students", label: "Students", value: (r) => r.students, align: "right" },
                      { key: "scripts", label: "Scripts", value: (r) => r.scripts, align: "right" },
                      { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                      { key: "passPct", label: "Pass %", value: (r) => r.passPct, render: (r) => <PctBar value={r.passPct} /> },
                      { key: "allClearPct", label: "All-clear %", value: (r) => r.allClearPct, align: "right" },
                    ]}
                  />
                </Card>
                <Card title="Department toppers (top 3)" actions={<ExportButtons fileName={fileName("Department_toppers")} sheet={() => A.sheets.toppers(toppers)} filters={filterLabels} />}>
                  <DataTable
                    rows={toppers}
                    rowKey={(r) => `${r.deptName}|${r.regNo}`}
                    onRowClick={(r) => setOpenStudent(r.regNo)}
                    pageSize={12}
                    columns={[
                      { key: "deptName", label: "Department", value: (r) => r.deptName },
                      { key: "rank", label: "Rank", value: (r) => r.rank, align: "center", render: (r) => <Medal rank={r.rank} /> },
                      { key: "name", label: "Student", value: (r) => r.name, render: (r) => <><div className="font-bold text-[#0B192C]">{r.name}</div><div className="text-[10px] text-gray-400 font-mono">{r.regNo}</div></> },
                      { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                      { key: "failed", label: "Failed", value: (r) => r.failed, align: "right" },
                    ]}
                  />
                </Card>
              </div>
            </div>
          )}

          {tab === "subjects" && (
            <div className="space-y-5">
              <Card
                title="Subjects needing attention"
                subtitle={`Lowest pass % first${subjT.length > 15 ? " (15 of " + subjT.length + " shown; the table lists all)" : ""}. Click a bar for the full subject analysis.`}
              >
                <PassBars
                  data={[...subjT].sort((a, b) => a.passPct - b.passPct || a.avg - b.avg).slice(0, 15)
                    .map((s) => ({ key: s.key, label: `${s.code} · ${s.key.split("|")[0].toUpperCase()} · ${s.assessment}`, value: s.passPct, color: ASSESSMENT_COLORS[s.assessment] }))}
                  onClick={setOpenSubject}
                  legend={assessmentsPresent.length > 1}
                />
              </Card>
              <Card
                title="Subject result analysis"
                subtitle="One row per subject and assessment. Click a row for grades, question analysis, CO analysis and the student list."
                actions={<ExportButtons fileName={fileName("Subject_Result_Analysis")} sheet={() => A.sheets.subject(subjT)} filters={filterLabels} />}
              >
                <DataTable
                  rows={subjT}
                  rowKey={(r) => r.key}
                  onRowClick={(r) => setOpenSubject(r.key)}
                  initialSort="passPct"
                  initialDir="asc"
                  columns={[
                    { key: "code", label: "Code", value: (r) => r.code, className: "font-mono font-bold text-[#0B192C]" },
                    { key: "title", label: "Subject", value: (r) => r.title, className: "max-w-[16rem] truncate" },
                    { key: "deptName", label: "Dept", value: (r) => r.deptName, render: (r) => <DeptCode name={r.deptName} codes={deptCodes} /> },
                    { key: "semester", label: "Sem", value: (r) => r.semester.replace("Semester ", "") },
                    { key: "assessment", label: "Assessment", value: (r) => r.assessment, render: (r) => <AssessmentDot name={r.assessment} /> },
                    { key: "appeared", label: "Appeared", value: (r) => r.appeared, align: "right", render: (r) => <span>{r.appeared}<span className="text-gray-400">/{r.enrolled}</span></span> },
                    { key: "passed", label: "Pass", value: (r) => r.passed, align: "right" },
                    { key: "failed", label: "Fail", value: (r) => r.failed, align: "right", render: (r) => <span className={r.failed ? "text-[#b42318] font-bold" : ""}>{r.failed}</span> },
                    { key: "passPct", label: "Pass %", value: (r) => r.passPct, render: (r) => <PctBar value={r.passPct} /> },
                    { key: "avg", label: "Avg", value: (r) => r.avg, align: "right" },
                    { key: "highest", label: "High", value: (r) => r.highest, align: "right" },
                    { key: "lowest", label: "Low", value: (r) => r.lowest, align: "right" },
                    { key: "grades", label: "Grades (O→F)", value: (r) => r.grades.O ?? 0, render: (r) => <GradeStrip grades={r.grades} total={r.appeared} /> },
                    { key: "published", label: "Status", value: (r) => (r.published ? 1 : 0), render: (r) => r.published ? <span className="text-[10px] font-black text-[#006300]">PUBLISHED</span> : <span className="text-[10px] font-black text-gray-400">NOT PUBLISHED</span> },
                  ]}
                />
              </Card>
            </div>
          )}

          {tab === "assessments" && (
            <div className="space-y-5">
              <p className="text-[11px] text-gray-500 font-semibold">This tab compares assessments side by side, so it ignores the Assessment filter.</p>
              <AssessmentTiles rows={crossAssessment} />
              <Card
                title="Average marks by subject: IAT-1 vs IAT-2 vs End Semester"
                subtitle={compT.length > 20 ? `First 20 of ${compT.length} subjects; filter by department to see others. The table below lists all.` : "Each colour is one assessment."}
              >
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={compT.slice(0, 20).map((c) => ({ code: c.code, ...Object.fromEntries(A.ASSESSMENTS.map((a) => [a, c.byAssessment[a]?.avg ?? null])) }))} margin={{ top: 10, right: 10, bottom: 30 }}>
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="code" {...AXIS} angle={-35} textAnchor="end" interval={0} height={60} />
                    <YAxis domain={[0, 100]} {...AXIS} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" height={28} />
                    {assessmentsPresent.map((a) => <Bar key={a} dataKey={a} name={a} fill={ASSESSMENT_COLORS[a]} radius={[4, 4, 0, 0]} maxBarSize={22} />)}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card title="Assessment comparison by subject" actions={<ExportButtons fileName={fileName("IAT_Comparison")} sheet={() => A.sheets.comparison(compT)} filters={filterLabels} />}>
                <DataTable
                  rows={compT}
                  rowKey={(r) => r.key}
                  initialSort="change"
                  initialDir="asc"
                  columns={[
                    { key: "code", label: "Code", value: (r) => r.code, className: "font-mono font-bold text-[#0B192C]" },
                    { key: "title", label: "Subject", value: (r) => r.title, className: "max-w-[16rem] truncate" },
                    { key: "deptName", label: "Dept", value: (r) => r.deptName, render: (r) => <DeptCode name={r.deptName} codes={deptCodes} /> },
                    ...A.ASSESSMENTS.map((a): Column<A.ComparisonRow> => ({
                      key: a, label: `${a} avg · pass %`, align: "right", value: (r) => r.byAssessment[a]?.avg ?? -1,
                      render: (r) => r.byAssessment[a] ? <span><b>{r.byAssessment[a]!.avg}</b> <span className="text-gray-400">· {r.byAssessment[a]!.passPct}%</span></span> : <span className="text-gray-300">—</span>,
                    })),
                    { key: "change", label: "IAT-1 → IAT-2", align: "right", value: (r) => r.change ?? 0, render: (r) => <Change value={r.change} /> },
                  ]}
                />
              </Card>
              <Card
                title="Student progress from IAT-1 to IAT-2"
                subtitle="Students who wrote both IATs in a subject. Biggest drops first."
                actions={<ExportButtons fileName={fileName("IAT_Progress")} sheet={() => A.sheets.progress(progress)} filters={filterLabels} />}
              >
                {progress.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">No student has both IAT-1 and IAT-2 marks in the same subject yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <Kpi label="Improved" value={progress.filter((p) => p.change > 0).length} icon={<TrendingUp size={14} />} tone="good" hint="scored more in IAT-2" />
                      <Kpi label="Same" value={progress.filter((p) => p.change === 0).length} icon={<Sigma size={14} />} hint="no change" />
                      <Kpi label="Declined" value={progress.filter((p) => p.change < 0).length} icon={<TrendingDown size={14} />} tone="bad" hint="scored less in IAT-2" />
                    </div>
                    <DataTable
                      rows={progress}
                      rowKey={(r) => `${r.regNo}|${r.code}`}
                      onRowClick={(r) => setOpenStudent(r.regNo)}
                      initialSort="change"
                      initialDir="asc"
                      columns={[
                        { key: "regNo", label: "Register No", value: (r) => r.regNo, className: "font-mono" },
                        { key: "name", label: "Name", value: (r) => r.name, className: "font-bold text-[#0B192C]" },
                        { key: "deptName", label: "Dept", value: (r) => r.deptName, render: (r) => <DeptCode name={r.deptName} codes={deptCodes} /> },
                        { key: "code", label: "Subject", value: (r) => r.code, className: "font-mono" },
                        { key: "iat1", label: "IAT-1", value: (r) => r.iat1, align: "right" },
                        { key: "iat2", label: "IAT-2", value: (r) => r.iat2, align: "right" },
                        { key: "change", label: "Change", value: (r) => r.change, align: "right", render: (r) => <Change value={r.change} /> },
                      ]}
                    />
                  </>
                )}
              </Card>
            </div>
          )}

          {tab === "semesters" && (
            <div className="space-y-5">
              <p className="text-[11px] text-gray-500 font-semibold">This tab shows every semester side by side, so it ignores the Semester and Assessment filters.</p>
              <Card title="Pass % by semester" subtitle="Each colour is one assessment.">
                {semT.length === 0 ? <p className="text-xs text-gray-500 py-4">No marks for these filters.</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={Array.from(A.groupBy(semT, (s) => s.semester).entries()).map(([semester, list]) => ({
                        semester, ...Object.fromEntries(list.map((s) => [s.assessment, s.passPct])),
                      }))}
                      margin={{ top: 10, right: 10 }}
                    >
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="semester" {...AXIS} />
                      <YAxis domain={[0, 100]} unit="%" {...AXIS} />
                      <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "#0B192C0A" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" height={28} />
                      {A.ASSESSMENTS.filter((a) => semT.some((s) => s.assessment === a)).map((a) => (
                        <Bar key={a} dataKey={a} name={a} fill={ASSESSMENT_COLORS[a]} radius={[4, 4, 0, 0]} maxBarSize={40}>
                          <LabelList dataKey={a} position="top" formatter={(v: number) => (v == null ? "" : `${v}%`)} style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card title="Semester-wise summary" actions={<ExportButtons fileName={fileName("Semester_wise")} sheet={() => A.sheets.semesters(semT)} filters={filterLabels} />}>
                <DataTable
                  rows={semT}
                  rowKey={(r) => r.key}
                  onRowClick={(r) => { setFilters((f) => ({ ...f, sem: r.semester, assess: r.assessment, subject: "all" })); setTab("subjects"); }}
                  columns={[
                    { key: "semester", label: "Semester", value: (r) => A.semesterIndex(r.semester), render: (r) => <b className="text-[#0B192C]">{r.semester}</b> },
                    { key: "assessment", label: "Assessment", value: (r) => r.assessment, render: (r) => <AssessmentDot name={r.assessment} /> },
                    { key: "departments", label: "Depts", value: (r) => r.departments, align: "right" },
                    { key: "subjects", label: "Subjects", value: (r) => r.subjects, align: "right" },
                    { key: "students", label: "Students", value: (r) => r.students, align: "right" },
                    { key: "scripts", label: "Scripts", value: (r) => r.scripts, align: "right" },
                    { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                    { key: "passPct", label: "Pass %", value: (r) => r.passPct, render: (r) => <PctBar value={r.passPct} /> },
                    { key: "allClearPct", label: "All-clear %", value: (r) => r.allClearPct, align: "right" },
                    { key: "failed", label: "Failed", value: (r) => r.failed, align: "right" },
                  ]}
                />
              </Card>
            </div>
          )}

          {tab === "questions" && (
            <QuestionsView
              assessment={qAssessment}
              assessments={assessmentsPresent}
              lockedByFilter={filters.assess !== "all"}
              onAssessment={setQuestionAssessment}
              questionT={questionT}
              coT={coT}
              scripts={qRows.length}
              exportProps={{ fileName, filterLabels }}
            />
          )}

          {tab === "examiners" && (
            <Card
              title="Examiner-wise analysis"
              subtitle="How the scripts each examiner valued compare. Large gaps in average for the same subject can point to uneven valuation."
              actions={<ExportButtons fileName={fileName("Examiner_wise")} sheet={() => A.sheets.examiners(examT)} filters={filterLabels} />}
            >
              <DataTable
                rows={examT}
                rowKey={(r) => r.examiner}
                initialSort="scripts"
                columns={[
                  { key: "examiner", label: "Examiner", value: (r) => r.examiner, className: "font-bold text-[#0B192C]" },
                  { key: "subjects", label: "Subjects", value: (r) => r.subjects, className: "font-mono text-[11px]" },
                  { key: "scripts", label: "Scripts", value: (r) => r.scripts, align: "right" },
                  { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                  { key: "passPct", label: "Pass %", value: (r) => r.passPct, render: (r) => <PctBar value={r.passPct} /> },
                  { key: "highest", label: "Highest", value: (r) => r.highest, align: "right" },
                  { key: "lowest", label: "Lowest", value: (r) => r.lowest, align: "right" },
                ]}
              />
            </Card>
          )}

          {tab === "students" && (
            <div className="space-y-5">
              <Card
                title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-[#d03b3b]" /> Students at risk ({riskT.length})</span>}
                subtitle="Two or more failed scripts, an average below 50, or a drop of 10+ marks from IAT-1 to IAT-2 in a subject. Click a student for the full profile."
                actions={<ExportButtons fileName={fileName("Students_at_risk")} sheet={() => A.sheets.risk(riskT)} filters={filterLabels} />}
              >
                <DataTable
                  rows={riskT}
                  rowKey={(r) => r.regNo}
                  onRowClick={(r) => setOpenStudent(r.regNo)}
                  initialSort="failed"
                  emptyText="No student is at risk for these filters."
                  columns={[
                    { key: "regNo", label: "Register No", value: (r) => r.regNo, className: "font-mono" },
                    { key: "name", label: "Name", value: (r) => r.name, className: "font-bold text-[#0B192C]" },
                    { key: "deptName", label: "Dept", value: (r) => r.deptName, render: (r) => <DeptCode name={r.deptName} codes={deptCodes} /> },
                    { key: "scripts", label: "Scripts", value: (r) => r.scripts, align: "right" },
                    { key: "failed", label: "Failed", value: (r) => r.failed, align: "right", render: (r) => <span className="font-black text-[#b42318]">{r.failed}</span> },
                    { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                    { key: "reason", label: "Why", value: (r) => r.reason, className: "text-[11px] text-gray-600" },
                  ]}
                />
              </Card>
              <Card
                title="Student ranking"
                subtitle="Ranked by average mark across the selected scripts. Click a student for the full profile."
                actions={<ExportButtons fileName={fileName("Student_Ranking")} sheet={() => A.sheets.students(studT)} filters={filterLabels} />}
              >
                <DataTable
                  rows={studT}
                  rowKey={(r) => r.regNo}
                  onRowClick={(r) => setOpenStudent(r.regNo)}
                  initialSort="rank"
                  initialDir="asc"
                  searchPlaceholder="Search by name or register number…"
                  rowTone={(r) => (r.failed > 0 ? "bad" : undefined)}
                  columns={[
                    { key: "rank", label: "Rank", value: (r) => r.rank, align: "center", render: (r) => <Medal rank={r.rank} /> },
                    { key: "regNo", label: "Register No", value: (r) => r.regNo, className: "font-mono" },
                    { key: "name", label: "Name", value: (r) => r.name, className: "font-bold text-[#0B192C]" },
                    { key: "deptName", label: "Dept", value: (r) => r.deptName, render: (r) => <DeptCode name={r.deptName} codes={deptCodes} /> },
                    { key: "category", label: "Category", value: (r) => r.category },
                    { key: "subjects", label: "Scripts", value: (r) => r.subjects, align: "right" },
                    { key: "avg", label: "Average", value: (r) => r.avg, align: "right", render: (r) => <b>{r.avg}</b> },
                    { key: "passed", label: "Passed", value: (r) => r.passed, align: "right" },
                    { key: "failed", label: "Failed", value: (r) => r.failed, align: "right", render: (r) => <span className={r.failed ? "text-[#b42318] font-black" : ""}>{r.failed}</span> },
                    { key: "best", label: "Best", value: (r) => r.best, className: "font-mono text-[11px]" },
                    { key: "weakest", label: "Weakest", value: (r) => r.weakest, className: "font-mono text-[11px]" },
                  ]}
                />
              </Card>
            </div>
          )}

          {tab === "bellcurve" && <BellCurveAnalytics rows={rows} />}

          {tab === "data" && (
            <Card
              title="All marks"
              subtitle="Every answer script matching the filters. Click a row for that student's profile."
              actions={<ExportButtons fileName={fileName("All_Marks")} sheet={() => A.sheets.raw(rows)} filters={filterLabels} />}
            >
              <DataTable
                rows={rows}
                rowKey={(r) => `${r.regNo}|${r.deptKey}|${r.semester}|${r.subjectCode}|${r.assessment}`}
                onRowClick={(r) => setOpenStudent(r.regNo)}
                initialSort="total"
                pageSize={25}
                searchPlaceholder="Search name, register no, subject, examiner…"
                columns={[
                  { key: "regNo", label: "Register No", value: (r) => r.regNo, className: "font-mono" },
                  { key: "name", label: "Name", value: (r) => r.name, className: "font-bold text-[#0B192C]" },
                  { key: "deptName", label: "Dept", value: (r) => r.deptName, render: (r) => <DeptCode name={r.deptName} codes={deptCodes} /> },
                  { key: "semester", label: "Sem", value: (r) => r.semester.replace("Semester ", "") },
                  { key: "subjectCode", label: "Subject", value: (r) => r.subjectCode, className: "font-mono" },
                  { key: "assessment", label: "Assessment", value: (r) => r.assessment, render: (r) => <AssessmentDot name={r.assessment} /> },
                  { key: "partA", label: "Part A", value: (r) => r.partA, align: "right" },
                  { key: "partBC", label: "Part B+C", value: (r) => r.partBC, align: "right" },
                  { key: "total", label: "Total", value: (r) => r.total, align: "right", render: (r) => <b>{r.total}</b> },
                  { key: "grade", label: "Grade", value: (r) => A.GRADES.indexOf(r.grade as never), align: "center", render: (r) => <GradeChip grade={r.grade} /> },
                  { key: "passed", label: "Result", value: (r) => (r.passed ? 1 : 0), render: (r) => <ResultChip passed={r.passed} /> },
                  { key: "examiner", label: "Examiner", value: (r) => r.examiner },
                  { key: "published", label: "Published", value: (r) => (r.published ? 1 : 0), render: (r) => (r.published ? "Yes" : "No") },
                ]}
              />
            </Card>
          )}
        </>
      )}

      <SubjectDrawer
        subjectKey={openSubject}
        allRows={allRows}
        students={students}
        onClose={closeSubject}
        onStudent={(regNo) => { setOpenSubject(null); setOpenStudent(regNo); }}
        fileName={fileName}
      />
      <StudentDrawer regNo={openStudent} allRows={allRows} onClose={closeStudent} fileName={fileName} />
    </div>
  );
};

export default AnalyticsPage;

/* ======================================================================= */
/*                                Overview                                  */
/* ======================================================================= */

const Overview: React.FC<{
  stat: A.Stats; clear: { students: number; clear: number; pct: number }; enrolled: number; deptT: A.DeptRow[];
  subjT: A.SubjectRow[]; compT: A.ComparisonRow[]; studT: A.StudentRow[]; riskT: A.RiskRow[]; crossAssessment: A.MarkRow[];
  onDept: (k: string) => void; onStudent: (r: string) => void; onSubject: (k: string) => void; goTab: (t: TabId) => void;
}> = ({ stat, clear, enrolled, deptT, subjT, compT, studT, riskT, crossAssessment, onDept, onStudent, onSubject, goTab }) => {
  const insights = useMemo(() => {
    const out: { tone: "good" | "bad" | "info"; text: React.ReactNode }[] = [];
    if (deptT.length > 1) {
      const best = deptT[0], worst = deptT[deptT.length - 1];
      out.push({ tone: "good", text: <><b>{best.deptName}</b> leads with a {best.passPct}% pass rate (average {best.avg}).</> });
      if (worst.deptKey !== best.deptKey) out.push({ tone: worst.passPct < 75 ? "bad" : "info", text: <><b>{worst.deptName}</b> has the lowest pass rate: {worst.passPct}% with {worst.failed} failed scripts.</> });
    }
    if (subjT.length) {
      const hard = [...subjT].sort((a, b) => a.passPct - b.passPct || a.avg - b.avg)[0];
      out.push({ tone: hard.passPct < 60 ? "bad" : "info", text: <>Toughest paper: <b>{hard.code}</b> {hard.title} ({hard.assessment}): {hard.passPct}% passed, average {hard.avg}.</> });
      const easy = [...subjT].sort((a, b) => b.avg - a.avg)[0];
      if (easy.key !== hard.key) out.push({ tone: "good", text: <>Highest-scoring paper: <b>{easy.code}</b> ({easy.assessment}) with an average of {easy.avg}.</> });
    }
    const changes = compT.filter((c) => c.change !== null);
    if (changes.length) {
      const up = [...changes].sort((a, b) => b.change! - a.change!)[0];
      const down = [...changes].sort((a, b) => a.change! - b.change!)[0];
      if (up.change! > 0) out.push({ tone: "good", text: <><b>{up.code}</b> improved most from IAT-1 to IAT-2 (+{up.change} average).</> });
      if (down.change! < 0) out.push({ tone: "bad", text: <><b>{down.code}</b> dropped most from IAT-1 to IAT-2 ({down.change} average).</> });
    }
    if (studT.length) out.push({ tone: "good", text: <>Top student: <b>{studT[0].name}</b> ({studT[0].deptName}) with an average of {studT[0].avg}.</> });
    out.push({ tone: riskT.length ? "bad" : "good", text: riskT.length ? <><b>{riskT.length}</b> students need attention (see Students tab).</> : <>No student is at risk for these filters.</> });
    return out;
  }, [deptT, subjT, compT, studT, riskT]);

  const gradeData = A.GRADES.map((g) => ({ grade: g, count: stat.grades[g] || 0, pct: A.pct(stat.grades[g] || 0, stat.scripts) }));
  const rangeData = A.RANGES.map((r, i) => ({ label: r.label, count: stat.ranges[i], fail: r.min < 40 })).reverse();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Answer scripts" value={stat.scripts} icon={<ClipboardList size={14} />} hint={`${stat.students} students evaluated${enrolled ? ` of ${enrolled} enrolled` : ""}`} />
        <Kpi label="Pass %" value={`${stat.passPct}%`} icon={<UserCheck size={14} />} tone={stat.passPct >= 75 ? "good" : stat.passPct < 50 ? "bad" : "default"} hint={`${stat.passed} passed · ${stat.failed} failed`} />
        <Kpi label="Average mark" value={stat.avg} icon={<Sigma size={14} />} hint={`Median ${stat.median} · SD ${stat.stdDev}`} />
        <Kpi label="All-clear students" value={`${clear.pct}%`} icon={<ListChecks size={14} />} hint={`${clear.clear} of ${clear.students} passed every script`} />
        <Kpi label="Highest" value={stat.highest} icon={<Trophy size={14} />} hint={`Lowest ${stat.lowest}`} />
        <Kpi label="O + A+ grades" value={`${A.pct((stat.grades.O || 0) + (stat.grades["A+"] || 0), stat.scripts)}%`} icon={<Award size={14} />} hint={`${(stat.grades.O || 0) + (stat.grades["A+"] || 0)} scripts at 80+`} tone="good" />
        <Kpi label="Students at risk" value={riskT.length} icon={<AlertTriangle size={14} />} tone={riskT.length ? "bad" : "good"} hint="2+ fails, avg < 50 or IAT drop" />
        <Kpi label="Departments · subjects" value={`${deptT.length} · ${new Set(subjT.map((s) => s.code)).size}`} icon={<GraduationCap size={14} />} hint="with marks in this view" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card title={<span className="flex items-center gap-2"><Lightbulb size={16} className="text-[#D4A72C]" /> Key insights</span>} className="xl:col-span-1">
          <ul className="space-y-2.5">
            {insights.map((i, n) => (
              <li key={n} className="flex gap-2.5 text-xs text-gray-700 leading-relaxed">
                <span className={`mt-0.5 w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${i.tone === "good" ? "bg-[#E8F3EA] text-[#006300]" : i.tone === "bad" ? "bg-[#FDECEC] text-[#b42318]" : "bg-[#EEF4FC] text-[#1c5cab]"}`}>
                  {i.tone === "good" ? "▲" : i.tone === "bad" ? "!" : "i"}
                </span>
                <span>{i.text}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Grade distribution" subtitle="Answer scripts in each grade (O ≥ 90 … F < 40)" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={gradeData} margin={{ top: 20, right: 10 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="grade" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
              <Bar dataKey="count" name="Scripts" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {gradeData.map((g) => <Cell key={g.grade} fill={GRADE_COLORS[g.grade]} />)}
                <LabelList dataKey="pct" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Pass % by department" subtitle="Click a bar to open that department's subjects.">
          <PassBars data={deptT.map((d) => ({ key: d.deptKey, label: d.deptName, value: d.passPct }))} onClick={onDept} />
        </Card>
        <Card title="Mark distribution" subtitle="Answer scripts per band of total marks (red = below the pass mark of 40)">
          <ResponsiveContainer width="100%" height={Math.max(250, deptT.length * 34 + 40)}>
            <BarChart data={rangeData} margin={{ top: 20, right: 10 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
              <Bar dataKey="count" name="Scripts" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {rangeData.map((r) => <Cell key={r.label} fill={r.fail ? CRITICAL : SERIES} />)}
                <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <AssessmentTiles rows={crossAssessment} note="Ignores the Assessment filter so the three can be compared." />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title={<span className="flex items-center gap-2"><Trophy size={16} className="text-[#D4A72C]" /> Top 5 students</span>} actions={<button type="button" onClick={() => goTab("students")} className="text-[11px] font-bold text-[#1c5cab] hover:underline">Full ranking →</button>}>
          <ol className="space-y-1.5">
            {studT.slice(0, 5).map((s) => (
              <li key={s.regNo}>
                <button type="button" onClick={() => onStudent(s.regNo)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#FFF6DD] text-left">
                  <Medal rank={s.rank} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[#0B192C] truncate">{s.name}</span>
                    <span className="block text-[10px] text-gray-400 font-mono">{s.regNo} · {s.deptName}</span>
                  </span>
                  <span className="text-sm font-black text-[#0B192C] tabular-nums">{s.avg}</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
        <Card title={<span className="flex items-center gap-2"><BookOpen size={16} className="text-[#d03b3b]" /> Lowest pass % subjects</span>} actions={<button type="button" onClick={() => goTab("subjects")} className="text-[11px] font-bold text-[#1c5cab] hover:underline">All subjects →</button>}>
          <ol className="space-y-1.5">
            {[...subjT].sort((a, b) => a.passPct - b.passPct || a.avg - b.avg).slice(0, 5).map((s) => (
              <li key={s.key}>
                <button type="button" onClick={() => onSubject(s.key)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#FFF6DD] text-left">
                  <span className="font-mono text-[11px] font-bold text-[#0B192C] w-20 shrink-0">{s.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-gray-700 truncate">{s.title}</span>
                    <span className="block text-[10px] text-gray-400"><AssessmentDot name={s.assessment} /> · {s.deptName}</span>
                  </span>
                  <PctBar value={s.passPct} />
                </button>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
};

/* ======================================================================= */
/*                           Questions & COs                                */
/* ======================================================================= */

const QuestionsView: React.FC<{
  assessment: string; assessments: string[]; lockedByFilter: boolean; onAssessment: (a: string) => void;
  questionT: A.QuestionRow[]; coT: A.CoRow[]; scripts: number;
  exportProps: { fileName: (w: string) => string; filterLabels: Record<string, string> };
}> = ({ assessment, assessments, lockedByFilter, onAssessment, questionT, coT, scripts, exportProps }) => {
  const partA = questionT.filter((q) => q.part === "A");
  const partBC = questionT.filter((q) => q.part !== "A");
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-black text-base text-[#0B192C]">Question paper analysis · {assessment || "—"}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Each assessment has its own paper and CO pattern, so this view looks at one at a time ({scripts} answer scripts).
            </p>
          </div>
          {!lockedByFilter && (
            <div className="inline-flex p-1 rounded-xl bg-[#F8F5EE] border border-[#E5E1D8] gap-1">
              {A.ASSESSMENTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={!assessments.includes(a)}
                  onClick={() => onAssessment(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30 ${assessment === a ? "bg-[#0B192C] text-white" : "text-gray-700 hover:bg-white"}`}
                >
                  <AssessmentDot name={a} />
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
      {scripts === 0 ? (
        <Card><p className="text-xs text-gray-500">No answer scripts for this assessment and these filters.</p></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Card title="Part A: average marks per question" subtitle="Each question is out of 2.">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={partA} margin={{ top: 20, right: 10 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="question" {...AXIS} />
                  <YAxis domain={[0, 2]} {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
                  <Bar dataKey="avg" name="Average" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {partA.map((q) => <Cell key={q.question} fill={q.avg < 1 ? CRITICAL : SERIES} />)}
                    <LabelList dataKey="avg" position="top" style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Part B & C: average marks per question" subtitle="The better of choice (a) and (b), as in the total. Q16 is Part C.">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={partBC} margin={{ top: 20, right: 10 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="question" {...AXIS} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
                  <Bar dataKey="avg" name="Average" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={44}>
                    <LabelList dataKey="avg" position="top" style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <Card title="Choice (a) vs (b) in Part B & C" subtitle="How many students answered each choice.">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={partBC} margin={{ top: 10, right: 10 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="question" {...AXIS} />
                  <YAxis allowDecimals={false} {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" height={26} />
                  <Bar dataKey="choiceA" name="Chose (a)" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="choiceB" name="Chose (b)" fill="#eb6834" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card
              title="Course outcome (CO) analysis"
              subtitle="Average marks each student scored on the questions of each CO, and that CO's share of all marks."
              actions={<ExportButtons fileName={exportProps.fileName(`CO_Analysis_${assessment}`)} sheet={() => A.sheets.cos(coT)} filters={{ ...exportProps.filterLabels, Assessment: assessment }} />}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={coT} margin={{ top: 20, right: 10 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="co" {...AXIS} />
                  <YAxis {...AXIS} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
                  <Bar dataKey="avgMarks" name="Avg marks per student" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={44}>
                    <LabelList dataKey="avgMarks" position="top" style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3">
                <DataTable
                  rows={coT}
                  rowKey={(r) => r.co}
                  pageSize={10}
                  columns={[
                    { key: "co", label: "CO", value: (r) => r.co, className: "font-black text-[#0B192C]" },
                    { key: "questions", label: "Questions", value: (r) => r.questions, className: "text-[11px]" },
                    { key: "avgMarks", label: "Avg marks", value: (r) => r.avgMarks, align: "right" },
                    { key: "share", label: "Share %", value: (r) => r.share, align: "right" },
                  ]}
                />
              </div>
            </Card>
          </div>
          <Card
            title="Question-wise table"
            actions={<ExportButtons fileName={exportProps.fileName(`Question_Analysis_${assessment}`)} sheet={() => A.sheets.questions(questionT)} filters={{ ...exportProps.filterLabels, Assessment: assessment }} />}
          >
            <DataTable
              rows={questionT}
              rowKey={(r) => r.question}
              pageSize={16}
              columns={[
                { key: "question", label: "Question", value: (r) => Number(r.question.slice(1)), render: (r) => <b>{r.question}</b> },
                { key: "part", label: "Part", value: (r) => r.part, align: "center" },
                { key: "co", label: "CO", value: (r) => r.co, align: "center" },
                { key: "attempted", label: "Students who scored", value: (r) => r.attempted, align: "right" },
                { key: "avg", label: "Average", value: (r) => r.avg, align: "right" },
                { key: "max", label: "Highest", value: (r) => r.max, align: "right" },
                { key: "choiceA", label: "Chose (a)", value: (r) => r.choiceA, align: "right", render: (r) => (r.part === "A" ? "—" : r.choiceA) },
                { key: "choiceB", label: "Chose (b)", value: (r) => r.choiceB, align: "right", render: (r) => (r.part === "A" ? "—" : r.choiceB) },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
};

/* ======================================================================= */
/*                              Drill-downs                                 */
/* ======================================================================= */

const SubjectDrawer: React.FC<{
  subjectKey: string | null; allRows: A.MarkRow[]; students: StudentRecord[]; onClose: () => void;
  onStudent: (regNo: string) => void; fileName: (w: string) => string;
}> = ({ subjectKey, allRows, students, onClose, onStudent, fileName }) => {
  const [deptKey, semester, code, assessment] = (subjectKey ?? "|||").split("|");
  const list = useMemo(
    () => allRows.filter((r) => r.deptKey === deptKey && r.semester === semester && r.subjectCode === code && r.assessment === assessment),
    [allRows, deptKey, semester, code, assessment]
  );
  const s = useMemo(() => A.stats(list), [list]);
  const q = useMemo(() => A.questionTable(list), [list]);
  const co = useMemo(() => A.coTable(list), [list]);
  const ranked = useMemo(() => [...list].sort((a, b) => b.total - a.total), [list]);
  const enrolledCount = students.filter((st) => st.deptKey === deptKey && st.semester === semester).length;
  const r0 = list[0];
  if (!subjectKey || !r0) return null;
  const title = `${code} · ${r0.subjectTitle}`;
  const sheetsFor = (): A.Sheet[] => [
    A.sheets.subject(A.subjectTable(list, students)), A.sheets.grades(s), A.sheets.questions(q), A.sheets.cos(co), A.sheets.raw(ranked),
  ];
  const gradeData = A.GRADES.map((g) => ({ grade: g, count: s.grades[g] || 0 }));
  return (
    <Drawer
      open
      onClose={onClose}
      title={title}
      subtitle={`${r0.deptName} · ${semester} · ${assessment} · examiner ${Array.from(new Set(list.map((r) => r.examiner))).join(", ")}`}
      actions={
        <button
          type="button"
          onClick={() => A.exportSheets(fileName(`Subject_${code}_${assessment}`), sheetsFor(), { Department: r0.deptName, Semester: semester, Subject: title, Assessment: assessment })}
          className="px-3 py-1.5 rounded-lg bg-[#D4A72C] text-[#0B192C] text-xs font-black flex items-center gap-1.5"
        >
          <FileSpreadsheet size={14} /> Download subject report
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Appeared" value={`${s.scripts}${enrolledCount ? ` / ${enrolledCount}` : ""}`} icon={<Users size={14} />} hint={enrolledCount > s.scripts ? `${enrolledCount - s.scripts} without marks` : "everyone has marks"} />
        <Kpi label="Pass %" value={`${s.passPct}%`} icon={<UserCheck size={14} />} tone={s.passPct >= 75 ? "good" : s.passPct < 50 ? "bad" : "default"} hint={`${s.passed} passed · ${s.failed} failed`} />
        <Kpi label="Average" value={s.avg} icon={<Sigma size={14} />} hint={`Median ${s.median} · SD ${s.stdDev}`} />
        <Kpi label="Highest / lowest" value={`${s.highest} / ${s.lowest}`} icon={<Trophy size={14} />} hint={ranked[0] ? `Top: ${ranked[0].name}` : ""} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Grades">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeData} margin={{ top: 20, right: 10 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="grade" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
              <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]} maxBarSize={44}>
                {gradeData.map((g) => <Cell key={g.grade} fill={GRADE_COLORS[g.grade]} />)}
                <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Average per question" subtitle="Part A out of 2; Part B/C counts the better choice">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={q} margin={{ top: 20, right: 10 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="question" {...AXIS} interval={0} tick={{ fill: "#6b6a65", fontSize: 9 }} />
              <YAxis {...AXIS} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
              <Bar dataKey="avg" name="Average" radius={[4, 4, 0, 0]} maxBarSize={24}>
                {q.map((x) => <Cell key={x.question} fill={x.part === "A" ? "#5598e7" : SERIES} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {co.length > 0 && (
        <Card title="CO analysis">
          <div className="flex flex-wrap gap-2">
            {co.map((c) => (
              <div key={c.co} className="px-3 py-2 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] min-w-[7rem]">
                <div className="text-[10px] font-black text-gray-400 uppercase">{c.co}</div>
                <div className="text-lg font-black text-[#0B192C]">{c.avgMarks}</div>
                <div className="text-[10px] text-gray-500">{c.share}% of marks · {c.questions}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card title="Students" subtitle="Click a student for their full profile">
        <DataTable
          rows={ranked}
          rowKey={(r) => r.regNo}
          onRowClick={(r) => onStudent(r.regNo)}
          initialSort="total"
          pageSize={25}
          rowTone={(r) => (r.passed ? undefined : "bad")}
          columns={[
            { key: "regNo", label: "Register No", value: (r) => r.regNo, className: "font-mono" },
            { key: "name", label: "Name", value: (r) => r.name, className: "font-bold text-[#0B192C]" },
            { key: "category", label: "Category", value: (r) => r.category },
            { key: "partA", label: "Part A", value: (r) => r.partA, align: "right" },
            { key: "partBC", label: "Part B+C", value: (r) => r.partBC, align: "right" },
            { key: "total", label: "Total", value: (r) => r.total, align: "right", render: (r) => <b>{r.total}</b> },
            { key: "grade", label: "Grade", value: (r) => A.GRADES.indexOf(r.grade as never), align: "center", render: (r) => <GradeChip grade={r.grade} /> },
            { key: "passed", label: "Result", value: (r) => (r.passed ? 1 : 0), render: (r) => <ResultChip passed={r.passed} /> },
          ]}
        />
      </Card>
    </Drawer>
  );
};

const StudentDrawer: React.FC<{ regNo: string | null; allRows: A.MarkRow[]; onClose: () => void; fileName: (w: string) => string }> = ({
  regNo, allRows, onClose, fileName,
}) => {
  const list = useMemo(() => (regNo ? allRows.filter((r) => r.regNo === regNo) : []), [allRows, regNo]);
  const s = useMemo(() => A.stats(list), [list]);
  /** Rank by average among classmates (same department and semester, all assessments). */
  const rank = useMemo(() => {
    if (!list[0]) return null;
    const mates = allRows.filter((r) => r.deptKey === list[0].deptKey && r.semester === list[0].semester);
    const table = A.studentTable(mates);
    return { rank: table.find((t) => t.regNo === regNo)?.rank ?? 0, of: table.length };
  }, [allRows, list, regNo]);
  if (!regNo || !list[0]) return null;
  const r0 = list[0];
  const bySubject = Array.from(A.groupBy(list, (r) => r.subjectCode).entries()).map(([code, items]) => ({
    code, ...Object.fromEntries(items.map((i) => [i.assessment, i.total])),
  }));
  const present = A.ASSESSMENTS.filter((a) => list.some((r) => r.assessment === a));
  return (
    <Drawer
      open
      onClose={onClose}
      title={r0.name}
      subtitle={`${regNo} · ${r0.deptName} · ${r0.semester} · ${r0.category}`}
      actions={
        <button
          type="button"
          onClick={() => A.exportSheets(fileName(`Student_${regNo}`), [A.sheets.raw(list)], { Student: `${r0.name} (${regNo})`, Department: r0.deptName })}
          className="px-3 py-1.5 rounded-lg bg-[#D4A72C] text-[#0B192C] text-xs font-black flex items-center gap-1.5"
        >
          <FileSpreadsheet size={14} /> Download
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Answer scripts" value={s.scripts} icon={<ClipboardList size={14} />} hint={`${new Set(list.map((r) => r.subjectCode)).size} subjects`} />
        <Kpi label="Average" value={s.avg} icon={<Sigma size={14} />} hint={`Highest ${s.highest} · lowest ${s.lowest}`} />
        <Kpi label="Passed / failed" value={`${s.passed} / ${s.failed}`} icon={<UserCheck size={14} />} tone={s.failed ? "bad" : "good"} hint={s.failed ? "has failed scripts" : "all passed"} />
        <Kpi label="Class rank" value={rank ? `#${rank.rank}` : "—"} icon={<Trophy size={14} />} hint={rank ? `of ${rank.of} in ${r0.deptName}, ${r0.semester}` : ""} />
      </div>
      <Card title="Marks by subject" subtitle="Each colour is one assessment; the dashed line is the pass mark (40).">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={bySubject} margin={{ top: 10, right: 10 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="code" {...AXIS} />
            <YAxis domain={[0, 100]} {...AXIS} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "#0B192C0A" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="top" height={26} />
            <ReferenceLine y={40} stroke={CRITICAL} strokeDasharray="5 4" label={{ value: "Pass 40", position: "insideTopRight", fill: "#b42318", fontSize: 10, fontWeight: 700 }} />
            {present.map((a) => (
              <Bar key={a} dataKey={a} name={a} fill={ASSESSMENT_COLORS[a]} radius={[4, 4, 0, 0]} maxBarSize={32}>
                <LabelList dataKey={a} position="top" style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="All answer scripts">
        <DataTable
          rows={list}
          rowKey={(r) => `${r.subjectCode}|${r.assessment}`}
          initialSort="subjectCode"
          initialDir="asc"
          rowTone={(r) => (r.passed ? undefined : "bad")}
          columns={[
            { key: "subjectCode", label: "Code", value: (r) => r.subjectCode, className: "font-mono font-bold" },
            { key: "subjectTitle", label: "Subject", value: (r) => r.subjectTitle },
            { key: "assessment", label: "Assessment", value: (r) => r.assessment, render: (r) => <AssessmentDot name={r.assessment} /> },
            { key: "partA", label: "Part A", value: (r) => r.partA, align: "right" },
            { key: "partBC", label: "Part B+C", value: (r) => r.partBC, align: "right" },
            { key: "total", label: "Total", value: (r) => r.total, align: "right", render: (r) => <b>{r.total}</b> },
            { key: "grade", label: "Grade", value: (r) => A.GRADES.indexOf(r.grade as never), align: "center", render: (r) => <GradeChip grade={r.grade} /> },
            { key: "passed", label: "Result", value: (r) => (r.passed ? 1 : 0), render: (r) => <ResultChip passed={r.passed} /> },
            { key: "published", label: "Published", value: (r) => (r.published ? 1 : 0), render: (r) => (r.published ? "Yes" : "No") },
          ]}
        />
      </Card>
    </Drawer>
  );
};

/* ======================================================================= */
/*                              Small pieces                                */
/* ======================================================================= */

/** Horizontal pass-% bars (one series; red below 50%), clickable for drill-down. */
const PassBars: React.FC<{ data: { key: string; label: string; value: number; color?: string }[]; onClick?: (key: string) => void; legend?: boolean }> = ({
  data, onClick, legend,
}) => {
  if (!data.length) return <p className="text-xs text-gray-500 py-4">No data for these filters.</p>;
  return (
    <>
      {legend && (
        <div className="flex flex-wrap gap-3 mb-2 text-[11px] text-gray-600 font-semibold">
          {A.ASSESSMENTS.map((a) => <AssessmentDot key={a} name={a} />)}
        </div>
      )}
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32 + 30)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 44 }}>
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" domain={[0, 100]} unit="%" {...AXIS} />
          <YAxis type="category" dataKey="label" width={170} {...AXIS} />
          <Tooltip content={<ChartTooltip unit="%" />} cursor={{ fill: "#0B192C0A" }} />
          <Bar dataKey="value" name="Pass %" radius={[0, 4, 4, 0]} maxBarSize={20} cursor={onClick ? "pointer" : undefined}
            onClick={(d: any) => onClick?.(d.key ?? d.payload?.key)}>
            {data.map((d) => <Cell key={d.key} fill={d.color ?? (d.value < 50 ? CRITICAL : SERIES)} />)}
            <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: "#52514e", fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};

/** One tile per assessment with its own colour, for a quick IAT-1 / IAT-2 / End Semester comparison. */
const AssessmentTiles: React.FC<{ rows: A.MarkRow[]; note?: string }> = ({ rows, note }) => (
  <div>
    {note && <p className="text-[11px] text-gray-500 font-semibold mb-2">{note}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {A.ASSESSMENTS.map((a) => {
        const list = rows.filter((r) => r.assessment === a);
        const s = A.stats(list);
        return (
          <div key={a} className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-4 border-t-4" style={{ borderTopColor: ASSESSMENT_COLORS[a] }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#0B192C]"><AssessmentDot name={a} /></span>
              <span className="text-[10px] font-bold text-gray-400">{s.scripts} scripts</span>
            </div>
            {s.scripts ? (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div><div className="text-[10px] font-black text-gray-400 uppercase">Pass %</div><div className="text-xl font-black text-[#0B192C]">{s.passPct}%</div></div>
                <div><div className="text-[10px] font-black text-gray-400 uppercase">Average</div><div className="text-xl font-black text-[#0B192C]">{s.avg}</div></div>
                <div><div className="text-[10px] font-black text-gray-400 uppercase">Students</div><div className="text-xl font-black text-[#0B192C]">{s.students}</div></div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-3">No marks entered yet.</p>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

/** A thin stacked bar of grade counts inside a table cell. */
const GradeStrip: React.FC<{ grades: Record<string, number>; total: number }> = ({ grades, total }) => (
  <div className="min-w-[10rem]" title={A.GRADES.map((g) => `${g}: ${grades[g] || 0}`).join("  ")}>
    <div className="flex h-2 rounded-full overflow-hidden gap-px bg-white">
      {A.GRADES.map((g) => (grades[g] ? <div key={g} style={{ width: `${(grades[g] / Math.max(1, total)) * 100}%`, background: GRADE_COLORS[g] }} /> : null))}
    </div>
    <div className="text-[10px] text-gray-500 mt-0.5 tabular-nums">{A.GRADES.map((g) => grades[g] || 0).join(" · ")}</div>
  </div>
);

/** One labelled row of the filter panel. */
const FilterRow: React.FC<{ label: string; compact?: boolean; children: React.ReactNode }> = ({ label, compact, children }) => (
  <div className={`flex flex-col ${compact ? "" : "sm:flex-row sm:items-center"} gap-1.5 sm:gap-3 min-w-0`}>
    <span className={`text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0 ${compact ? "" : "sm:w-24"}`}>{label}</span>
    <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">{children}</div>
  </div>
);

/** A one-click filter option; options with no answer scripts are greyed but still clickable. */
const Pill: React.FC<{ active: boolean; onClick: () => void; count?: number; title?: string; children: React.ReactNode }> = ({
  active, onClick, count, title, children,
}) => {
  const empty = count === 0 && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition whitespace-nowrap ${
        active
          ? "bg-[#0B192C] text-white border-[#0B192C] shadow"
          : empty
          ? "bg-white text-gray-400 border-dashed border-[#D9D4C7] hover:text-gray-600"
          : "bg-[#F8F5EE] text-[#0B192C] border-[#E5E1D8] hover:border-[#D4A72C] hover:bg-[#FFF6DD]"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`text-[10px] font-black tabular-nums px-1.5 rounded-md ${active ? "bg-[#D4A72C] text-[#0B192C]" : empty ? "" : "bg-white text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
};

const DeptCode: React.FC<{ name: string; codes: Map<string, string> }> = ({ name, codes }) => (
  <span title={name} className="font-bold whitespace-nowrap">{codes.get(name) ?? name}</span>
);

const Change: React.FC<{ value: number | null }> = ({ value }) =>
  value === null ? <span className="text-gray-300">—</span> : (
    <span className={`font-black tabular-nums ${value > 0 ? "text-[#006300]" : value < 0 ? "text-[#b42318]" : "text-gray-500"}`}>
      {value > 0 ? "▲ +" : value < 0 ? "▼ " : ""}{value}
    </span>
  );

const Medal: React.FC<{ rank: number }> = ({ rank }) => {
  const style = rank === 1 ? "bg-[#D4A72C] text-[#0B192C]" : rank === 2 ? "bg-[#C9CED6] text-[#0B192C]" : rank === 3 ? "bg-[#C98B5A] text-white" : "bg-[#EFECE4] text-gray-600";
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black shrink-0 ${style}`}>{rank}</span>;
};
