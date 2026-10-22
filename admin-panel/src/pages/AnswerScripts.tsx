import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, FileText, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import {
  answerScriptsApi,
  apiErrorMessage,
  AnswerScriptInfo,
  studentsApi,
  StudentRecord,
  subjectsApi,
  SubjectRecord,
} from "../services/api";
import { getStoredDepartments } from "./Departments";

const SEMESTERS = ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V", "Semester VI", "Semester VII", "Semester VIII"];
const ASSESSMENTS = ["IAT-1", "IAT-2", "End Semester"] as const;

const MAX_BYTES = 15 * 1024 * 1024;
const letters = (v: string) => v.toUpperCase().replace(/[^A-Z]/g, "");

/** One chosen PDF and the student it will be uploaded for. */
type BulkItem = { file: File; regNo: string; how: string; include: boolean; result?: "done" | "error"; error?: string };

/**
 * Finds the student a scanned PDF belongs to from its file name: the register number (exact), a mistyped
 * register number (its last 6 digits, when only one student has them), or the student's name.
 */
function matchFile(name: string, students: StudentRecord[]): { regNo: string; how: string } {
  const base = name.replace(/\.pdf$/i, "");
  const digits = base.match(/\d{10,15}/)?.[0];
  if (digits) {
    if (students.some((s) => s.regNo === digits)) return { regNo: digits, how: "Register number" };
    const bySuffix = students.filter((s) => s.regNo.endsWith(digits.slice(-6)));
    if (bySuffix.length === 1) return { regNo: bySuffix[0].regNo, how: `Corrected from ${digits} — check` };
  }
  const word = letters(base.split(/[-_]/)[0]);
  if (word.length >= 4) {
    const byName = students.filter((s) => {
      const n = letters(s.studentName);
      return n === word || n.includes(word) || word.includes(n);
    });
    if (byName.length === 1) return { regNo: byName[0].regNo, how: "Student name — check" };
  }
  return { regNo: "", how: "No match — choose the student" };
}

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Answer Scripts: upload each student's scanned answer script (PDF) for every subject of the department,
 * per assessment. One row per student, one column per subject.
 */
export const AnswerScripts: React.FC = () => {
  const [departments, setDepartments] = useState(() => getStoredDepartments());
  const [deptKey, setDeptKey] = useState("");
  const [semester, setSemester] = useState("");
  const [assessment, setAssessment] = useState<"" | (typeof ASSESSMENTS)[number]>("");
  const [search, setSearch] = useState("");

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [scripts, setScripts] = useState<AnswerScriptInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [subjectCode, setSubjectCode] = useState("");
  const [bulk, setBulk] = useState<BulkItem[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  // One hidden file input, pointed at whichever cell's Upload / Replace was clicked
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ regNo: string; subject: string } | null>(null);

  useEffect(() => {
    const sync = () => {
      const list = getStoredDepartments();
      setDepartments(list);
      setDeptKey((cur) => (cur && list.some((d) => d.key === cur) ? cur : ""));
    };
    window.addEventListener("kvell_departments_updated", sync);
    return () => window.removeEventListener("kvell_departments_updated", sync);
  }, []);

  const load = async () => {
    if (!deptKey || !semester || !assessment) {
      setMessage({ type: "error", text: "Choose the department, semester and assessment first." });
      return;
    }
    setLoading(true);
    try {
      const [st, subs, sc] = await Promise.all([
        studentsApi.list(deptKey, semester),
        subjectsApi.list(deptKey),
        answerScriptsApi.list(deptKey, semester, assessment),
      ]);
      setStudents(st);
      setSubjects(subs.filter((s) => s.semester === semester).sort((a, b) => a.code.localeCompare(b.code)));
      setScripts(sc);
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not load the answer scripts.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deptKey && semester && assessment) load();
    else {
      setStudents([]);
      setSubjects([]);
      setScripts([]);
    }
  }, [deptKey, semester, assessment]);

  const scriptMap = useMemo(() => {
    const m = new Map<string, AnswerScriptInfo>();
    scripts.forEach((s) => m.set(`${s.regNo}|${s.subjectCode}`, s));
    return m;
  }, [scripts]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => !q || s.regNo.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q));
  }, [students, search]);

  const params = (regNo: string, subject: string) => ({ dept: deptKey, semester, subject, regNo, assessment });

  const chooseFile = (regNo: string, subject: string) => {
    uploadTarget.current = { regNo, subject };
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTarget.current;
    if (!file || !target) return;
    if (file.type && file.type !== "application/pdf") {
      setMessage({ type: "error", text: "Only PDF files can be uploaded." });
      return;
    }
    const cell = `${target.regNo}|${target.subject}`;
    setBusyCell(cell);
    try {
      const saved = await answerScriptsApi.upload(params(target.regNo, target.subject), file);
      setScripts((prev) => [...prev.filter((s) => `${s.regNo}|${s.subjectCode}` !== cell), saved]);
      setMessage({ type: "success", text: `Uploaded ${saved.fileName} for ${target.regNo} • ${target.subject} (${assessment}).` });
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not upload the answer script.") });
    } finally {
      setBusyCell(null);
    }
  };

  const view = async (regNo: string, subject: string) => {
    // Open the tab right away (popup blockers allow it only during the click), then show the PDF in it
    const tab = window.open("", "_blank");
    try {
      const blob = await answerScriptsApi.file(params(regNo, subject));
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      tab?.close();
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not open the answer script.") });
    }
  };

  const remove = async (regNo: string, subject: string) => {
    if (!window.confirm(`Remove the answer script of ${regNo} for ${subject} (${assessment})?`)) return;
    const cell = `${regNo}|${subject}`;
    setBusyCell(cell);
    try {
      await answerScriptsApi.remove(params(regNo, subject));
      setScripts((prev) => prev.filter((s) => `${s.regNo}|${s.subjectCode}` !== cell));
      setMessage({ type: "success", text: `Removed the answer script of ${regNo} • ${subject}.` });
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not remove the answer script.") });
    } finally {
      setBusyCell(null);
    }
  };

  // ---- Bulk upload: many PDFs for one subject, each matched to a student
  const pathOf = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
  const chooseBulk = (e: React.ChangeEvent<HTMLInputElement>) => {
    let files = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    e.target.value = "";
    // A folder with one sub-folder per subject: keep only the chosen subject's folder (its name is the subject code)
    const inSubjectFolder = files.filter((f) => pathOf(f).split("/").slice(0, -1).some((d) => d.trim().toUpperCase() === subjectCode));
    if (inSubjectFolder.length) files = inSubjectFolder;
    if (!files.length) {
      setMessage({ type: "error", text: "No PDF files were found in what you chose." });
      return;
    }
    const items = files
      .sort((a, b) => pathOf(a).localeCompare(pathOf(b), undefined, { numeric: true }))
      .map((file) => ({ file, ...matchFile(file.name, students), include: file.size <= MAX_BYTES }));
    setBulk(items);
  };
  const setBulkStudent = (i: number, regNo: string) =>
    setBulk((prev) => prev.map((b, k) => (k === i ? { ...b, regNo, how: regNo ? "Chosen by you" : "No match — choose the student", result: undefined } : b)));
  const toggleBulk = (i: number) => setBulk((prev) => prev.map((b, k) => (k === i ? { ...b, include: !b.include } : b)));
  const bulkCount = (regNo: string) => bulk.filter((b) => b.include && b.regNo === regNo).length;
  const bulkProblems = bulk.filter((b) => b.include && !b.result && (!b.regNo || b.file.size > MAX_BYTES || bulkCount(b.regNo) > 1)).length;
  const bulkReady = bulk.filter((b) => b.include && b.regNo && b.result !== "done").length;
  const missingStudents = subjectCode
    ? students.filter((s) => !scriptMap.has(`${s.regNo}|${subjectCode}`) && !bulk.some((b) => b.include && b.regNo === s.regNo))
    : [];

  const uploadBulk = async () => {
    if (!subjectCode || bulkProblems > 0) return;
    setBulkBusy(true);
    let done = 0;
    let failed = 0;
    for (let i = 0; i < bulk.length; i++) {
      const b = bulk[i];
      if (!b.include || !b.regNo || b.result === "done") continue;
      try {
        const saved = await answerScriptsApi.upload(params(b.regNo, subjectCode), b.file);
        setScripts((prev) => [...prev.filter((x) => !(x.regNo === saved.regNo && x.subjectCode === saved.subjectCode)), saved]);
        setBulk((prev) => prev.map((x, k) => (k === i ? { ...x, result: "done", error: undefined } : x)));
        done++;
      } catch (err) {
        setBulk((prev) => prev.map((x, k) => (k === i ? { ...x, result: "error", error: apiErrorMessage(err, "Upload failed") } : x)));
        failed++;
      }
    }
    setBulkBusy(false);
    setMessage(failed
      ? { type: "error", text: `${done} answer scripts uploaded for ${subjectCode}; ${failed} failed (see the list).` }
      : { type: "success", text: `${done} answer scripts uploaded for ${subjectCode} (${assessment}).` });
  };

  const shownSubjects = subjectCode ? subjects.filter((x) => x.code === subjectCode) : subjects;
  const uploadedFor = (code: string) => scripts.filter((s) => s.subjectCode === code).length;
  const deptName = departments.find((d) => d.key === deptKey)?.name ?? deptKey.toUpperCase();

  return (
    <div className="space-y-6 w-full">
      <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFileChosen} />
      <input ref={bulkInput} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={chooseBulk} />
      {/* A whole folder, including its sub-folders */}
      <input ref={folderInput} type="file" multiple className="hidden" onChange={chooseBulk} {...({ webkitdirectory: "", directory: "" } as any)} />

      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30">
        <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
          Scanned answer scripts
        </span>
        <h2 className="font-display text-2xl font-bold flex items-center gap-3">
          <FileText className="text-[#D4A72C]" size={24} /> Answer Script Entry
        </h2>
        <p className="text-xs text-white/70 mt-1 max-w-2xl">
          Upload the scanned photocopy (PDF) of each student's answer script for every subject. One PDF per student, subject
          and assessment; uploading again replaces it.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-start justify-between gap-3 shadow-sm ${
            message.type === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          <span className="flex items-start gap-2">
            {message.type === "success" ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={18} className="text-red-600 shrink-0" />}
            {message.text}
          </span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-xs items-end">
          <label className="block">
            <span className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Department</span>
            <select value={deptKey} onChange={(e) => setDeptKey(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-[#0B192C]">
              <option value="">{departments.length ? "Choose department" : "Choose department (none added yet)"}</option>
              {departments.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Semester</span>
            <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-[#0B192C]">
              <option value="">Choose semester</option>
              {SEMESTERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Assessment</span>
            <select value={assessment} onChange={(e) => setAssessment(e.target.value as any)} className="w-full h-9 px-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-[#0B192C]">
              <option value="">Choose assessment</option>
              {ASSESSMENTS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Subject</span>
            <select value={subjectCode} onChange={(e) => { setSubjectCode(e.target.value); setBulk([]); }} className="w-full h-9 px-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-[#0B192C]">
              <option value="">All subjects</option>
              {subjects.map((x) => (
                <option key={x.code} value={x.code}>
                  {x.code} · {x.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1">Search student</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Reg. no or name" className="w-full h-9 pl-8 pr-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-semibold" />
            </div>
          </label>
          <button onClick={load} disabled={loading} className="h-9 px-4 rounded-xl bg-[#0B192C] text-white font-extrabold flex items-center justify-center gap-2 hover:bg-[#152744] disabled:opacity-60">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        <p className="text-[11px] text-gray-500">
          {deptName} • {semester} • {assessment}: {students.length} students, {subjects.length} subjects, {scripts.length} of{" "}
          {students.length * subjects.length} scripts uploaded.
        </p>

        {subjectCode && students.length > 0 && (
          <div className="rounded-2xl border-2 border-dashed border-[#D4A72C] bg-[#FFFBEB] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#0B192C]">Bulk upload · {subjectCode} · {assessment}</p>
                <p className="text-[11px] text-gray-600">
                  Choose the folder of this subject's scanned PDFs (sub-folders are included; in a department folder with one
                  sub-folder per subject, only the {subjectCode} folder is used), or choose the PDFs themselves. Each file is matched to a student by the register number in its
                  file name (or the student's name). Check the matches, then upload. One PDF per student; uploading replaces an earlier one.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => folderInput.current?.click()} disabled={bulkBusy} className="h-9 px-4 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-60">
                  <Upload size={14} /> Choose folder
                </button>
                <button onClick={() => bulkInput.current?.click()} disabled={bulkBusy} className="h-9 px-4 rounded-xl bg-white border border-[#0B192C] text-[#0B192C] text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-60">
                  Choose PDFs
                </button>
              </div>
            </div>
            {bulk.length > 0 && (
              <>
                <div className="overflow-auto max-h-[50vh] rounded-xl border border-[#E5E1D8] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B192C] text-white text-[10px] uppercase sticky top-0">
                      <tr><th className="p-2">Upload</th><th className="p-2">File</th><th className="p-2">Size</th><th className="p-2">Student</th><th className="p-2">Matched by</th><th className="p-2">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E1D8]">
                      {bulk.map((b, i) => {
                        const tooBig = b.file.size > MAX_BYTES;
                        const dup = b.include && !!b.regNo && bulkCount(b.regNo) > 1;
                        const exists = !!b.regNo && scriptMap.has(`${b.regNo}|${subjectCode}`) && !b.result;
                        const bad = b.result === "error" || (b.include && !b.result && (!b.regNo || tooBig || dup));
                        return (
                          <tr key={i} className={b.result === "done" ? "bg-emerald-50" : bad ? "bg-red-50" : ""}>
                            <td className="p-2"><input type="checkbox" checked={b.include} disabled={bulkBusy || b.result === "done"} onChange={() => toggleBulk(i)} aria-label={`Upload ${b.file.name}`} /></td>
                            <td className="p-2 font-mono text-[11px] break-all">{pathOf(b.file)}</td>
                            <td className={`p-2 whitespace-nowrap ${tooBig ? "text-red-700 font-bold" : ""}`}>{kb(b.file.size)}</td>
                            <td className="p-2">
                              <select value={b.regNo} disabled={bulkBusy || b.result === "done"} onChange={(e) => setBulkStudent(i, e.target.value)} className="h-8 px-2 rounded-lg border border-[#E5E1D8] text-xs font-semibold max-w-[260px]" aria-label={`Student for ${b.file.name}`}>
                                <option value="">— choose student —</option>
                                {students.map((x) => <option key={x.regNo} value={x.regNo}>{x.regNo} · {x.studentName}</option>)}
                              </select>
                            </td>
                            <td className={`p-2 text-[11px] ${/check|No match|Chosen/.test(b.how) ? "text-amber-700 font-bold" : "text-gray-600"}`}>{b.how}</td>
                            <td className="p-2 text-[11px] font-bold">
                              {b.result === "done" ? <span className="text-emerald-700">Uploaded</span>
                                : b.result === "error" ? <span className="text-red-700">{b.error}</span>
                                : !b.include ? <span className="text-gray-400">Skipped</span>
                                : tooBig ? <span className="text-red-700">Larger than 15 MB</span>
                                : !b.regNo ? <span className="text-red-700">Choose the student</span>
                                : dup ? <span className="text-red-700">Same student as another file</span>
                                : exists ? <span className="text-amber-700">Replaces the uploaded PDF</span>
                                : <span className="text-gray-500">Ready</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {missingStudents.length > 0 && (
                  <p className="text-[11px] text-amber-800 font-semibold">
                    No PDF yet for {missingStudents.length} student{missingStudents.length === 1 ? "" : "s"}: {missingStudents.map((x) => `${x.regNo} ${x.studentName}`).join(", ")}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {bulkProblems > 0 && <span className="text-[11px] font-bold text-red-700">Fix the {bulkProblems} red row{bulkProblems === 1 ? "" : "s"} (or untick them) to upload.</span>}
                  <button onClick={() => setBulk([])} disabled={bulkBusy} className="h-9 px-4 rounded-xl bg-gray-100 text-xs font-bold disabled:opacity-60">Clear</button>
                  <button onClick={uploadBulk} disabled={bulkBusy || bulkProblems > 0 || bulkReady === 0} className="h-9 px-4 rounded-xl bg-[#D4A72C] text-[#0B192C] text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-50">
                    {bulkBusy ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    {bulkBusy ? `Uploading… ${bulk.filter((b) => b.result === "done").length}/${bulk.filter((b) => b.include).length}` : `Upload ${bulkReady} PDF${bulkReady === 1 ? "" : "s"}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {subjects.length === 0 && !loading ? (
          <div className="p-8 text-center text-xs text-gray-500 border-2 border-dashed border-[#E5E1D8] rounded-2xl">
            No subjects for {deptName} in {semester}. Add them on the Subjects page first.
          </div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-[#E5E1D8] max-h-[75vh]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
                <tr>
                  <th className="p-3 sticky left-0 bg-[#0B192C] z-10">Register Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">DOB</th>
                  {shownSubjects.map((s) => (
                    <th key={s.code} className="p-3 text-center min-w-[150px]" title={s.title}>
                      <span className="block">{s.code}</span>
                      <span className="block text-[9px] font-semibold normal-case text-white/60 truncate max-w-[150px]">{s.title}</span>
                      <span className="block text-[9px] font-bold text-[#D4A72C]">
                        {uploadedFor(s.code)}/{students.length} uploaded
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D8]">
                {visibleStudents.map((st) => (
                  <tr key={st.regNo} className="hover:bg-[#F8F5EE]/60">
                    <td className="p-3 font-mono font-bold text-[#0B192C] sticky left-0 bg-white">{st.regNo}</td>
                    <td className="p-3 font-bold text-gray-900">{st.studentName}</td>
                    <td className="p-3 font-mono text-gray-600">{st.dob || "—"}</td>
                    {shownSubjects.map((sub) => {
                      const cell = `${st.regNo}|${sub.code}`;
                      const info = scriptMap.get(cell);
                      const busy = busyCell === cell;
                      return (
                        <td key={sub.code} className="p-2 text-center align-middle">
                          {busy ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500">
                              <RefreshCw size={12} className="animate-spin" /> Working…
                            </span>
                          ) : info ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold inline-flex items-center gap-1" title={`${info.fileName} • ${info.uploadedAt} • ${info.uploadedBy}`}>
                                <CheckCircle2 size={10} /> PDF • {kb(info.sizeBytes)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => view(st.regNo, sub.code)} className="px-2 py-1 rounded-md bg-[#0B192C] text-white text-[10px] font-bold inline-flex items-center gap-1" title="View PDF">
                                  <Eye size={11} /> View
                                </button>
                                <button onClick={() => chooseFile(st.regNo, sub.code)} className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold" title="Replace with another PDF">
                                  Replace
                                </button>
                                <button onClick={() => remove(st.regNo, sub.code)} className="p-1 rounded-md text-red-600 hover:bg-red-50" title="Remove">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => chooseFile(st.regNo, sub.code)} className="px-2.5 py-1.5 rounded-lg border border-dashed border-[#B08014] text-[#8A6410] hover:bg-[#D4A72C]/10 text-[10px] font-extrabold inline-flex items-center gap-1">
                              <Upload size={11} /> Upload PDF
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleStudents.length === 0 && !loading && (
              <p className="p-8 text-center text-xs text-gray-500">No students found. Add them on the Student Data page.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerScripts;
