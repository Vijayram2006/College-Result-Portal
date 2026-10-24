import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Printer,
  Search,
  Users,
  X,
} from "lucide-react";
import { apiClient, apiErrorMessage, authApi } from "../../services/api";
import { AnswerScriptPane } from "../AnswerScriptPane";
import { printMarkStatement, ReadOnlyMarkSheet, type StudentMark } from "./AnswerScriptReview";

/**
 * The Associate Dean's read-only views of the college's real data (students, subjects, internal marks, answer
 * scripts, results, faculty, revaluation). The server limits every request to the dean's own college and
 * refuses changes; nothing here is stored in the browser.
 */

const SEMESTERS = ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI",
  "Semester VII", "Semester VIII"];
const ASSESSMENTS = ["IAT-1", "IAT-2", "End Semester"];

interface Department {
  key: string;
  name: string;
  code: string;
  headName: string;
  totalStudents: number;
  status: string;
}

/** GET with loading and error state; reloads when the key changes, skipped while path is null. */
function useGet<T>(path: string | null, params?: Record<string, string>): { data: T | null; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: !!path,
    error: null,
  });
  const key = path ? path + JSON.stringify(params ?? {}) : "";
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiClient
      .get<T>(path, { params })
      .then((r) => live && setState({ data: r.data, loading: false, error: null }))
      .catch((e) => live && setState({ data: null, loading: false, error: apiErrorMessage(e, "Could not load the data.") }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

/** REQ-05: the revaluation's Examiner 2 of a student's subject, from the three-tier revaluation records. */
function secondExaminer(regNo: string, subjectCode: string): string {
  try {
    const list = JSON.parse(localStorage.getItem("kvell_revaluation_3tier_records_v3") || "[]") as {
      regNo?: string; subjectCode?: string; proc2?: { examinerName?: string; allotmentStatus?: string };
    }[];
    const r = list.find((x) => x.regNo === regNo && x.subjectCode === subjectCode && x.proc2?.examinerName);
    return r?.proc2?.examinerName ?? "";
  } catch {
    return "";
  }
}

function useDepartments() {
  return useGet<Department[]>("/admin/departments");
}

// ------------------------------------------------------------------ building blocks

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm ${className}`}>{children}</div>;
}

function Header({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 pb-4 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="font-display font-bold text-xl text-[#0B192C]">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
      </div>
      <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
        Read only
      </span>
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#0B192C]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Status({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty: boolean; emptyText: string }) {
  if (loading) {
    return (
      <p className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Loading...
      </p>
    );
  }
  if (error) return <p role="alert" className="py-6 text-center text-xs font-semibold text-red-700">{error}</p>;
  if (empty) return <p className="py-8 text-center text-xs text-gray-500">{emptyText}</p>;
  return null;
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-xs">{children}</tbody>
      </table>
    </div>
  );
}

function DeptSemesterPicker({ dept, setDept, semester, setSemester, extra }: {
  dept: string;
  setDept: (v: string) => void;
  semester: string;
  setSemester: (v: string) => void;
  extra?: React.ReactNode;
}) {
  const { data: depts } = useDepartments();
  useEffect(() => {
    if (!dept && depts && depts.length) setDept(depts[0].key);
  }, [depts, dept, setDept]);
  return (
    <div className="grid gap-3 sm:grid-cols-3 mb-4">
      <Select label="Department" value={dept} onChange={setDept}
        options={(depts ?? []).map((d) => ({ value: d.key, label: d.name }))} />
      <Select label="Semester" value={semester} onChange={setSemester}
        options={SEMESTERS.map((s) => ({ value: s, label: s }))} />
      {extra}
    </div>
  );
}

// ------------------------------------------------------------------ overview

interface Dashboard {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  totalCourses: number;
  marksEntered: number;
  pendingResults: number;
  publishedResults: number;
  overallPassPercentage: number;
  recentUploads: { batchId: string; department: string; semester: string; students: number; status: string; date: string }[];
}

export function DeanOverview({ onNavigate, pendingQpCount }: { onNavigate: (nav: string) => void; pendingQpCount: number }) {
  const { data, loading, error } = useGet<Dashboard>("/admin/dashboard");
  const tiles = data
    ? [
        { label: "Students", value: data.totalStudents, icon: GraduationCap, nav: "student-data" },
        { label: "Faculty", value: data.totalFaculty, icon: Users, nav: "faculty" },
        { label: "Departments", value: data.totalDepartments, icon: Building2, nav: "departments" },
        { label: "Courses", value: data.totalCourses, icon: BookOpen, nav: "subjects" },
        { label: "Published results", value: data.publishedResults, icon: ClipboardCheck, nav: "published-results" },
        { label: "Pass percentage", value: `${data.overallPassPercentage}%`, icon: BarChart3, nav: "analytics" },
        { label: "Question papers for you", value: pendingQpCount, icon: FileText, nav: "question-paper-review" },
      ]
    : [];
  return (
    <div className="space-y-6">
      <Status loading={loading} error={error} empty={false} emptyText="" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => onNavigate(t.nav)}
            className="text-left bg-white rounded-3xl border border-[#E5E1D8] p-5 shadow-sm hover:border-[#D4A72C] transition"
          >
            <t.icon size={18} className="text-[#D4A72C]" />
            <span className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mt-3">{t.label}</span>
            <span className="block text-3xl font-black text-[#0B192C] mt-1">{t.value}</span>
          </button>
        ))}
      </div>
      {data && (
        <Card>
          <Header icon={ClipboardCheck} title="Latest result batches" detail="The most recent subjects forwarded or published in your college." />
          <Status loading={false} error={null} empty={data.recentUploads.length === 0} emptyText="No results have been forwarded yet." />
          {data.recentUploads.length > 0 && (
            <Table head={["Batch", "Department", "Semester", "Students", "Status", "Date"]}>
              {data.recentUploads.map((u) => (
                <tr key={u.batchId}>
                  <td className="px-4 py-3 font-mono text-[11px]">{u.batchId}</td>
                  <td className="px-4 py-3">{u.department}</td>
                  <td className="px-4 py-3">{u.semester}</td>
                  <td className="px-4 py-3">{u.students}</td>
                  <td className="px-4 py-3 font-bold">{u.status}</td>
                  <td className="px-4 py-3 text-gray-500">{u.date}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ students

interface Student {
  regNo: string;
  studentName: string;
  deptName: string;
  category: string;
  year: string;
  semester: string;
  academicYear: string;
}

export function DeanStudentsView() {
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("Semester I");
  const [q, setQ] = useState("");
  const { data, loading, error } = useGet<Student[]>(dept ? "/admin/students" : null, { dept, semester });
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter((s) => !t || s.regNo.toLowerCase().includes(t) || s.studentName.toLowerCase().includes(t));
  }, [data, q]);
  return (
    <Card>
      <Header icon={GraduationCap} title="Students" detail="Students of your college by department and semester." />
      <DeptSemesterPicker dept={dept} setDept={setDept} semester={semester} setSemester={setSemester}
        extra={
          <label className="block">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">Search</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or register number"
                className="h-10 w-full rounded-xl border border-gray-200 pl-8 pr-3 text-xs" />
            </div>
          </label>
        } />
      <Status loading={loading} error={error} empty={rows.length === 0} emptyText="No students for this department and semester." />
      {!loading && !error && rows.length > 0 && (
        <>
          <Table head={["Register No.", "Name", "Department", "Year", "Category", "Academic year"]}>
            {rows.map((s) => (
              <tr key={s.regNo}>
                <td className="px-4 py-3 font-mono text-[11px]">{s.regNo}</td>
                <td className="px-4 py-3 font-semibold text-[#0B192C]">{s.studentName}</td>
                <td className="px-4 py-3">{s.deptName}</td>
                <td className="px-4 py-3">{s.year}</td>
                <td className="px-4 py-3 capitalize">{s.category}</td>
                <td className="px-4 py-3">{s.academicYear}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-[11px] text-gray-500">{rows.length} students</p>
        </>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ subjects and departments

interface Subject {
  id: string;
  code: string;
  title: string;
  category: string;
  credits: number;
  semester: string;
  faculty: string;
  status: string;
  studentsEnrolled: number;
}

export function DeanSubjectsView() {
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("all");
  const { data: depts } = useDepartments();
  useEffect(() => {
    if (!dept && depts && depts.length) setDept(depts[0].key);
  }, [depts, dept]);
  const { data, loading, error } = useGet<Subject[]>(dept ? "/admin/subjects" : null, { dept });
  const rows = (data ?? []).filter((s) => semester === "all" || s.semester === semester);
  return (
    <Card>
      <Header icon={BookOpen} title="Subjects" detail="Courses offered by each department, as set up by the COE." />
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Select label="Department" value={dept} onChange={setDept} options={(depts ?? []).map((d) => ({ value: d.key, label: d.name }))} />
        <Select label="Semester" value={semester} onChange={setSemester}
          options={[{ value: "all", label: "All semesters" }, ...SEMESTERS.map((s) => ({ value: s, label: s }))]} />
      </div>
      <Status loading={loading} error={error} empty={rows.length === 0} emptyText="No subjects found." />
      {!loading && !error && rows.length > 0 && (
        <Table head={["Code", "Title", "Semester", "Category", "Credits", "Students", "Status"]}>
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-mono text-[11px]">{s.code}</td>
              <td className="px-4 py-3 font-semibold text-[#0B192C]">{s.title}</td>
              <td className="px-4 py-3">{s.semester}</td>
              <td className="px-4 py-3">{s.category}</td>
              <td className="px-4 py-3">{s.credits}</td>
              <td className="px-4 py-3">{s.studentsEnrolled}</td>
              <td className="px-4 py-3 font-bold">{s.status}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

export function DeanDepartmentsView() {
  const { data, loading, error } = useDepartments();
  return (
    <Card>
      <Header icon={Building2} title="Departments" detail="Departments of your college and their student strength." />
      <Status loading={loading} error={error} empty={(data ?? []).length === 0} emptyText="No departments." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((d) => (
          <div key={d.key} className="rounded-2xl border border-gray-200 p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#D4A72C]">{d.code}</span>
            <p className="font-bold text-sm text-[#0B192C] mt-1">{d.name}</p>
            <p className="text-xs text-gray-500 mt-2">{d.totalStudents} students · {d.status === "ACTIVE" ? "Active" : d.status}</p>
            {d.headName && <p className="text-xs text-gray-500">HOD: {d.headName}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ internal marks

interface InternalRoster {
  subjectTitle: string;
  scheme: { maxMarks: number };
  rows: {
    regNo: string;
    name: string;
    iat1: number | null;
    iat2: number | null;
    breakdown: { total: number; max: number; complete: boolean; attendancePercent: number | null };
  }[];
}

export function DeanInternalMarksView() {
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("Semester I");
  const [subject, setSubject] = useState("");
  const subjects = useGet<Subject[]>(dept ? "/admin/subjects" : null, { dept });
  const options = (subjects.data ?? []).filter((s) => s.semester === semester);
  useEffect(() => {
    if (!options.find((s) => s.code === subject)) setSubject(options[0]?.code ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects.data, semester]);
  const { data, loading, error } = useGet<InternalRoster>(dept && subject ? "/admin/internal-marks" : null, { dept, semester, subject });
  return (
    <Card>
      <Header icon={ClipboardCheck} title="Internal marks" detail="Internal assessment marks entered by faculty, with the computed internal total." />
      <DeptSemesterPicker dept={dept} setDept={setDept} semester={semester} setSemester={setSemester}
        extra={<Select label="Subject" value={subject} onChange={setSubject}
          options={options.length ? options.map((s) => ({ value: s.code, label: `${s.code} · ${s.title}` })) : [{ value: "", label: "No subjects" }]} />} />
      <Status loading={loading || subjects.loading} error={error || subjects.error} empty={!subject || (data?.rows.length ?? 0) === 0}
        emptyText="No internal marks for this subject yet." />
      {data && data.rows.length > 0 && !loading && (
        <Table head={["Register No.", "Name", "IAT-1", "IAT-2", "Attendance", "Internal total", "Complete"]}>
          {data.rows.map((r) => (
            <tr key={r.regNo}>
              <td className="px-4 py-3 font-mono text-[11px]">{r.regNo}</td>
              <td className="px-4 py-3 font-semibold text-[#0B192C]">{r.name}</td>
              <td className="px-4 py-3">{r.iat1 ?? "—"}</td>
              <td className="px-4 py-3">{r.iat2 ?? "—"}</td>
              <td className="px-4 py-3">{r.breakdown.attendancePercent == null ? "—" : `${r.breakdown.attendancePercent}%`}</td>
              <td className="px-4 py-3 font-bold">{r.breakdown.total} / {r.breakdown.max}</td>
              <td className="px-4 py-3">{r.breakdown.complete ? "Yes" : "Not yet"}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ answer scripts

interface AnswerScript {
  regNo: string;
  subjectCode: string;
  assessmentType: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export function DeanAnswerScriptsView() {
  const [dept, setDept] = useState("");
  const [semester, setSemester] = useState("Semester I");
  const [assessment, setAssessment] = useState("IAT-1");
  const [subject, setSubject] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const subjects = useGet<Subject[]>(dept ? "/admin/subjects" : null, { dept });
  const options = (subjects.data ?? []).filter((s) => s.semester === semester);
  useEffect(() => {
    if (!options.find((s) => s.code === subject)) setSubject(options[0]?.code ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects.data, semester]);
  const scripts = useGet<AnswerScript[]>(dept ? "/admin/answer-scripts" : null, { dept, semester, assessment });
  const roster = useGet<StudentMark[]>(dept && subject ? "/admin/marks" : null, { dept, semester, subject, assessment });
  const uploaded = useMemo(
    () => new Set((scripts.data ?? []).filter((s) => s.subjectCode === subject).map((s) => s.regNo)),
    [scripts.data, subject]
  );
  const rows = useMemo(
    () => [...(roster.data ?? [])].sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true })),
    [roster.data]
  );
  const current = openIndex === null ? null : rows[openIndex] ?? null;
  const subjectInfo = options.find((s) => s.code === subject);
  const loading = subjects.loading || roster.loading || scripts.loading;
  const error = subjects.error || roster.error || scripts.error;

  const print = () => {
    const ok = printMarkStatement({
      collegeKey: authApi.currentUser()?.collegeKey,
      collegeName: authApi.currentUser()?.collegeName,
      department: rows[0]?.deptName ?? dept.toUpperCase(),
      semester,
      subjectCode: subject,
      subjectTitle: subjectInfo?.title ?? rows[0]?.subjectTitle ?? "",
      assessment,
      rows,
    });
    if (!ok) alert("The browser blocked the print window. Allow pop-ups for this site and try again.");
  };

  return (
    <Card>
      <Header icon={FileText} title="Answer scripts"
        detail="Evaluated answer scripts with the faculty's question-wise marks, view only. Opening a script is recorded." />
      <DeptSemesterPicker dept={dept} setDept={setDept} semester={semester} setSemester={setSemester}
        extra={<>
          <Select label="Assessment" value={assessment} onChange={setAssessment} options={ASSESSMENTS.map((a) => ({ value: a, label: a }))} />
          <Select label="Subject" value={subject} onChange={setSubject}
            options={options.length ? options.map((s) => ({ value: s.code, label: `${s.code} · ${s.title}` })) : [{ value: "", label: "No subjects" }]} />
        </>} />
      <Status loading={loading} error={error} empty={!subject || rows.length === 0}
        emptyText="No students or marks for this subject and assessment yet." />
      {!loading && !error && rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs text-gray-500">
              {rows.filter((r) => r.hasMarks).length} of {rows.length} evaluated · {rows.filter((r) => uploaded.has(r.regNo)).length} scripts uploaded
            </p>
            <button onClick={print}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B192C] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#132943]">
              <Printer size={14} className="text-[#D4A72C]" /> Print statement of marks
            </button>
          </div>
          <Table head={["S.No", "Register No.", "Name", "Answer script", "Total", "Examiner 1", "Examiner 2", "Status", ""]}>
            {rows.map((r, i) => (
              <tr key={r.regNo}>
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-mono text-[11px]">{r.regNo}</td>
                <td className="px-4 py-3 font-semibold text-[#0B192C]">{r.name}</td>
                <td className="px-4 py-3">{uploaded.has(r.regNo) ? "Uploaded" : <span className="text-gray-400">Not uploaded</span>}</td>
                <td className="px-4 py-3 font-bold">{r.hasMarks ? `${r.grandTotal} / 100` : "—"}</td>
                {/* REQ-05: who evaluated the script, and the revaluation examiner if there is one */}
                <td className="px-4 py-3">{r.examinerName ? <span className="font-semibold">{r.examinerName}</span> : "—"}</td>
                <td className="px-4 py-3">{secondExaminer(r.regNo, subject) || "—"}</td>
                <td className="px-4 py-3">{r.hasMarks ? "Evaluated" : <span className="text-gray-400">Not evaluated</span>}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setOpenIndex(i)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0B192C] hover:underline">
                    <Eye size={13} /> View
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {current && openIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-[1600px] my-auto space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3">
              <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 text-[10px] font-extrabold uppercase tracking-wider">
                View only
              </span>
              <span className="text-xs font-mono font-bold text-[#8A6410]">{current.regNo}</span>
              <span className="text-xs font-semibold text-[#0B192C]">{current.name}</span>
              <span className="ml-auto text-[11px] text-gray-500">{openIndex + 1} of {rows.length}</span>
              <button onClick={() => setOpenIndex(openIndex - 1)} disabled={openIndex === 0} aria-label="Previous student"
                className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setOpenIndex(openIndex + 1)} disabled={openIndex === rows.length - 1} aria-label="Next student"
                className="rounded-lg border border-gray-200 p-1.5 disabled:opacity-40"><ChevronRight size={16} /></button>
              <button onClick={() => setOpenIndex(null)} aria-label="Close"
                className="rounded-lg bg-gray-100 p-1.5 hover:bg-gray-200"><X size={16} /></button>
            </div>
            <div className="flex flex-col lg:flex-row gap-4">
              <AnswerScriptPane
                scriptKey={`${current.regNo}|${subject}|${assessment}`}
                label={`${current.regNo} • ${subject} • ${assessment}`}
                prompt={uploaded.has(current.regNo) ? undefined : "No answer script uploaded for this student and assessment."}
                fetchPdf={async () => (await apiClient.get("/admin/answer-scripts/file", {
                  params: { dept, semester, subject, regNo: current.regNo, assessment },
                  responseType: "blob",
                  timeout: 120000,
                })).data}
              />
              <div className="bg-white rounded-3xl lg:w-1/2 w-full p-4 sm:p-6 border border-[#E5E1D8] max-h-[90vh] overflow-y-auto">
                <ReadOnlyMarkSheet m={current} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ results and analytics

interface ResultBatch {
  id: string;
  departmentKey: string;
  departmentName: string;
  semester: string;
  examMonthYear: string;
  subjectCode: string;
  subjectTitle: string;
  totalStudents: number;
  passedStudents: number;
  passPercentage: number;
  publicationStatus: string;
  publishedAt: string | null;
}

function useResults() {
  return useGet<ResultBatch[]>("/admin/results");
}

export function DeanResultsView() {
  const { data, loading, error } = useResults();
  const { data: depts } = useDepartments();
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = (data ?? []).filter((b) => (dept === "all" || b.departmentKey === dept) && (status === "all" || b.publicationStatus === status));
  return (
    <Card>
      <Header icon={ClipboardCheck} title="Results" detail="Result batches of your college: forwarded by faculty and published by the COE." />
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Select label="Department" value={dept} onChange={setDept}
          options={[{ value: "all", label: "All departments" }, ...(depts ?? []).map((d) => ({ value: d.key, label: d.name }))]} />
        <Select label="Status" value={status} onChange={setStatus}
          options={[{ value: "all", label: "All" }, { value: "PUBLISHED", label: "Published" }, { value: "PENDING", label: "Waiting for the COE" }]} />
      </div>
      <Status loading={loading} error={error} empty={rows.length === 0} emptyText="No result batches." />
      {!loading && !error && rows.length > 0 && (
        <Table head={["Subject", "Department", "Semester", "Assessment", "Students", "Pass %", "Status"]}>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3"><span className="font-mono text-[11px]">{b.subjectCode}</span><br /><span className="text-gray-500">{b.subjectTitle}</span></td>
              <td className="px-4 py-3">{b.departmentName}</td>
              <td className="px-4 py-3">{b.semester}</td>
              <td className="px-4 py-3">{b.examMonthYear}</td>
              <td className="px-4 py-3">{b.passedStudents} / {b.totalStudents}</td>
              <td className="px-4 py-3 font-bold">{b.passPercentage}%</td>
              <td className="px-4 py-3 font-bold">{b.publicationStatus === "PUBLISHED" ? `Published ${b.publishedAt ?? ""}` : b.publicationStatus}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

export function DeanAnalyticsView() {
  const { data, loading, error } = useResults();
  const byDept = useMemo(() => {
    const m = new Map<string, { name: string; students: number; passed: number; batches: number }>();
    for (const b of data ?? []) {
      if (b.publicationStatus !== "PUBLISHED") continue;
      const e = m.get(b.departmentKey) ?? { name: b.departmentName, students: 0, passed: 0, batches: 0 };
      e.students += b.totalStudents;
      e.passed += b.passedStudents;
      e.batches += 1;
      m.set(b.departmentKey, e);
    }
    return Array.from(m.entries()).map(([key, e]) => ({ key, ...e, pass: e.students ? Math.round((1000 * e.passed) / e.students) / 10 : 0 }))
      .sort((a, b) => b.pass - a.pass);
  }, [data]);
  return (
    <Card>
      <Header icon={BarChart3} title="Department pass rates" detail="Pass percentage of published results, by department (all subjects and assessments)." />
      <Status loading={loading} error={error} empty={byDept.length === 0} emptyText="No published results yet." />
      <div className="space-y-3">
        {byDept.map((d) => (
          <div key={d.key}>
            <div className="flex justify-between text-xs font-semibold text-[#0B192C]">
              <span>{d.name}</span>
              <span>{d.pass}% <span className="text-gray-500 font-normal">({d.batches} subjects)</span></span>
            </div>
            <div className="h-2.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
              <div className="h-full rounded-full bg-[#D4A72C]" style={{ width: `${d.pass}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ faculty and revaluation

interface FacultySummary {
  id: number;
  title: string;
  name: string;
  deptName: string;
  designation: string;
  joinedServiceOn: string;
  totalExperience: { section: string; years: number; months: number };
}

export function DeanFacultyView() {
  const { data, loading, error } = useGet<FacultySummary[]>("/admin/faculty-master");
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter((f) => !q.trim() || `${f.name} ${f.deptName} ${f.designation}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Card>
      <Header icon={Users} title="Faculty" detail="Faculty of your college from the COE's faculty master (contact details and personal records stay with the COE)." />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, department or designation"
        className="mb-4 h-10 w-full sm:max-w-sm rounded-xl border border-gray-200 px-3 text-xs" />
      <Status loading={loading} error={error} empty={rows.length === 0} emptyText="No faculty records." />
      {!loading && !error && rows.length > 0 && (
        <Table head={["Name", "Department", "Designation", "Joined", "Experience"]}>
          {rows.map((f) => (
            <tr key={f.id}>
              <td className="px-4 py-3 font-semibold text-[#0B192C]">{f.title} {f.name}</td>
              <td className="px-4 py-3">{f.deptName}</td>
              <td className="px-4 py-3">{f.designation}</td>
              <td className="px-4 py-3">{f.joinedServiceOn}</td>
              <td className="px-4 py-3">{f.totalExperience.years} y {f.totalExperience.months} m</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

interface Revaluation {
  id: number;
  refId: string;
  regNo: string;
  studentName: string;
  departmentName: string;
  semester: string;
  assessmentType: string;
  subjectCodes: string[];
  status: string;
  createdAt: string;
}

export function DeanRevaluationView() {
  const { data, loading, error } = useGet<Revaluation[]>("/admin/revaluation");
  return (
    <Card>
      <Header icon={ClipboardCheck} title="Revaluation requests" detail="Students' revaluation requests in your college; the COE processes them." />
      <Status loading={loading} error={error} empty={(data ?? []).length === 0} emptyText="No revaluation requests." />
      {!loading && !error && (data ?? []).length > 0 && (
        <Table head={["Reference", "Student", "Department", "Semester", "Subjects", "Status", "Requested"]}>
          {(data ?? []).map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-mono text-[11px]">{r.refId}</td>
              <td className="px-4 py-3"><span className="font-semibold text-[#0B192C]">{r.studentName}</span><br /><span className="text-gray-500 font-mono text-[11px]">{r.regNo}</span></td>
              <td className="px-4 py-3">{r.departmentName}</td>
              <td className="px-4 py-3">{r.semester} · {r.assessmentType}</td>
              <td className="px-4 py-3">{r.subjectCodes.join(", ")}</td>
              <td className="px-4 py-3 font-bold">{r.status}</td>
              <td className="px-4 py-3 text-gray-500">{r.createdAt}</td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
