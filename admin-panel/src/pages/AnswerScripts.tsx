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

  const uploadedFor = (code: string) => scripts.filter((s) => s.subjectCode === code).length;
  const deptName = departments.find((d) => d.key === deptKey)?.name ?? deptKey.toUpperCase();

  return (
    <div className="space-y-6 w-full">
      <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFileChosen} />

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs items-end">
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
                  {subjects.map((s) => (
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
                    {subjects.map((sub) => {
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
                            <button onClick={() => chooseFile(st.regNo, sub.code)} className="px-2.5 py-1.5 rounded-lg border border-dashed border-[#B08014] text-[#B08014] hover:bg-[#D4A72C]/10 text-[10px] font-extrabold inline-flex items-center gap-1">
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
