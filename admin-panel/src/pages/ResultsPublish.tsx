import React, { useEffect, useState } from "react";
import { SEMESTER_OPTIONS } from "../utils/semesters";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, EyeOff, Globe, RefreshCw, Send } from "lucide-react";
import { adminResultsApi, apiErrorMessage, PublishRow } from "../services/api";
import { getStoredDepartments } from "./Departments";



const ACADEMIC_YEAR = "2026 - 2027";

const STATE_LABEL: Record<PublishRow["state"], { text: string; className: string }> = {
  NO_MARKS: { text: "No marks entered", className: "bg-gray-100 text-gray-700 border-gray-200" },
  NOT_FORWARDED: { text: "Not forwarded by faculty", className: "bg-amber-50 text-amber-800 border-amber-300" },
  FORWARDED: { text: "Forwarded - awaiting COE", className: "bg-sky-50 text-sky-800 border-sky-300" },
  PUBLISHED: { text: "Published", className: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  OUT_OF_DATE: { text: "Marks changed - forward again", className: "bg-red-50 text-red-700 border-red-300" },
};

export const ResultsPublish: React.FC = () => {
  const [DEPARTMENTS, setDepartments] = useState(() => getStoredDepartments());
  const [deptKey, setDeptKey] = useState("");
  const [SEMESTER, setSemester] = useState("");
  // IAT-1, IAT-2 and End Semester are published separately
  const [ASSESSMENT, setAssessment] = useState("");

  useEffect(() => {
    const sync = () => {
      const list = getStoredDepartments();
      setDepartments(list);
      setDeptKey((cur) => (cur && list.some((d) => d.key === cur) ? cur : ""));
    };
    window.addEventListener("kvell_departments_updated", sync);
    return () => window.removeEventListener("kvell_departments_updated", sync);
  }, []);
  const [rows, setRows] = useState<PublishRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const deptName = DEPARTMENTS.find((d) => d.key === deptKey)?.name ?? deptKey.toUpperCase();

  const load = async (showSpinner = true) => {
    if (!deptKey || !SEMESTER || !ASSESSMENT) {
      setRows([]); // nothing chosen yet
      return;
    }
    if (showSpinner) setLoading(true);
    try {
      setRows(await adminResultsApi.getPublishStatus(deptKey, SEMESTER, ASSESSMENT));
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not load the subjects.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refresh = () => load(false);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [deptKey, SEMESTER, ASSESSMENT]);

  // Results are released for the whole department at once, and only when every subject has marks for every student
  const incomplete = rows.filter((r) => r.marksEntered < r.students);
  // Faculty must forward every subject (the COE's own Mark Entry counts) and forward again after any change
  const notForwarded = rows.filter((r) => r.state === "NOT_FORWARDED" || r.state === "NO_MARKS" || r.state === "OUT_OF_DATE");
  const allMarked =
    rows.length > 0 && rows.every((r) => r.students > 0) && incomplete.length === 0 && notForwarded.length === 0;
  const allLive = rows.length > 0 && rows.every((r) => r.state === "PUBLISHED");
  const anyLive = rows.some((r) => r.state === "PUBLISHED" || r.state === "OUT_OF_DATE");
  const outOfDate = rows.some((r) => r.state === "OUT_OF_DATE");
  const studentCount = rows[0]?.students ?? 0;

  const publishAll = async () => {
    if (
      !window.confirm(
        `${outOfDate || anyLive ? "Republish" : "Publish"} the ${ASSESSMENT} results for ${deptName}?\n\n` +
          `${rows.length} subjects for ${studentCount} students:\n` +
          rows.map((r) => `• ${r.subjectCode} - ${r.subjectTitle}`).join("\n") +
          `\n\nStudents and the HOD will see ALL subjects immediately, together.`
      )
    )
      return;
    setBusy(true);
    try {
      const summary = await adminResultsApi.publishDepartment({
        deptKey,
        semester: SEMESTER,
        academicYear: ACADEMIC_YEAR,
        assessmentType: ASSESSMENT,
      });
      window.dispatchEvent(new Event("kvell_marks_updated"));
      setMessage({
        type: "success",
        text: `Results published: ${summary.subjects} subjects for ${summary.students} students (${summary.passedStudents} passed every subject, ${summary.passPercentage}%).`,
      });
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not publish the results.") });
    } finally {
      setBusy(false);
      await load(false);
    }
  };

  const unpublishAll = async () => {
    if (
      !window.confirm(
        `Hide ALL ${ASSESSMENT} results for ${deptName} from students and the HOD?\n\nThe marks are kept. You can publish again at any time.`
      )
    )
      return;
    setBusy(true);
    try {
      await adminResultsApi.unpublishDepartment({ deptKey, semester: SEMESTER, assessmentType: ASSESSMENT });
      window.dispatchEvent(new Event("kvell_marks_updated"));
      setMessage({ type: "success", text: `${ASSESSMENT} results for ${deptName} are hidden from students and the HOD.` });
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not unpublish the results.") });
    } finally {
      setBusy(false);
      await load(false);
    }
  };

  const publishedCount = rows.filter((r) => r.state === "PUBLISHED").length;

  return (
    <div className="space-y-6 w-full">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            Release results to students & HOD
          </span>
          <h2 className="font-display text-2xl font-bold">Publish Results</h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Faculty enter marks and forward each subject to you. Results go out for the whole department at once, only
            when every subject is forwarded with marks for every student. Students never see a partial result.
          </p>
        </div>
        <Link
          href="/admin/results/published"
          className="px-5 py-3 rounded-xl bg-white/10 text-white font-extrabold text-xs hover:bg-white/20 transition border border-white/20 flex items-center gap-2"
        >
          <Globe size={16} /> Published Results
        </Link>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-start justify-between gap-3 shadow-sm ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}
        >
          <span className="flex items-start gap-2">
            {message.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-red-600 shrink-0" />
            )}
            {message.text}
          </span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 shadow-sm ${
            allMarked ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          {allMarked ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          )}
          <span>
            {allMarked
              ? allLive
                ? `All ${rows.length} subjects are published for ${studentCount} students.`
                : `Marks are entered for every student in all ${rows.length} subjects. You can publish the results now.`
              : incomplete.length > 0
                ? `Publishing is locked until marks are entered for every student in every subject. Still missing: ${incomplete
                    .map((r) => `${r.subjectCode} (${r.students - r.marksEntered} student${r.students - r.marksEntered === 1 ? "" : "s"})`)
                    .join(", ")}. A student who was absent needs a 0 entered.`
                : `Publishing is locked until faculty forward every subject for verification. Waiting for: ${notForwarded
                    .map((r) => `${r.subjectCode}${r.state === "OUT_OF_DATE" ? " (changed - forward again)" : ""}`)
                    .join(", ")}.`}
          </span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="grid sm:grid-cols-3 gap-4 flex-1 max-w-3xl">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Department</label>
              <select
                value={deptKey}
                onChange={(e) => {
                  setMessage(null);
                  setDeptKey(e.target.value);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
              >
                <option value="">{DEPARTMENTS.length ? "Choose department" : "Choose department (none added yet)"}</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Semester</label>
              <select
                value={SEMESTER}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold"
              >
                <option value="">Choose semester</option>
                {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">Assessment</label>
              <select
                value={ASSESSMENT}
                onChange={(e) => setAssessment(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold"
              >
                <option value="">Choose assessment</option>
                <option value="IAT-1">IAT-1</option>
                <option value="IAT-2">IAT-2</option>
                <option value="End Semester">End Semester</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => load()}
              className="px-4 py-2.5 rounded-xl border border-[#E5E1D8] text-[#0B192C] font-extrabold text-xs hover:bg-[#F8F5EE] transition flex items-center gap-2"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            {anyLive && (
              <button
                onClick={unpublishAll}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-extrabold text-xs hover:bg-slate-50 transition flex items-center gap-2 disabled:opacity-40"
              >
                <EyeOff size={14} /> Unpublish all
              </button>
            )}
            <button
              onClick={publishAll}
              disabled={!allMarked || allLive || busy}
              title={!allMarked ? "Enter marks for every student in every subject first" : undefined}
              className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132943] text-white font-extrabold text-xs shadow transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} className="text-[#D4A72C]" />
              {busy ? "Publishing..." : outOfDate ? "Republish all results" : anyLive && !allLive ? "Publish all results" : "Publish all results"}
            </button>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          {rows.length > 0 && (
            <>
              <strong className="text-[#0B192C]">{publishedCount}</strong> of {rows.length} subjects visible to students for{" "}
              <strong className="text-[#0B192C]">{deptName}</strong>
            </>
          )}
        </div>

        <div className="overflow-auto rounded-2xl border border-[#E5E1D8] max-h-[75vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
              <tr>
                <th className="p-3.5">Subject</th>
                <th className="p-3.5 text-center">Marks entered</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Visible to students</th>
                <th className="p-3.5 text-center">Pass %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 font-semibold">
                    Loading subjects...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 font-semibold">
                    No subjects for this department yet. Add them on the Subjects page.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const label = STATE_LABEL[r.state];
                  const live = r.state === "PUBLISHED" || r.state === "OUT_OF_DATE";
                  return (
                    <tr key={r.subjectCode} className="hover:bg-[#F8F5EE]/60 transition">
                      <td className="p-3.5">
                        <p className="font-mono font-bold text-[#0B192C]">{r.subjectCode}</p>
                        <p className="text-gray-600 font-medium mt-0.5">{r.subjectTitle}</p>
                      </td>
                      <td className="p-3.5 text-center font-bold text-gray-900">
                        {r.marksEntered} <span className="text-gray-400 font-medium">/ {r.students}</span>
                        {r.marksEntered < r.students && (
                          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">{r.students - r.marksEntered} missing</p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${label.className}`}>
                          {label.text}
                        </span>
                        {r.forwardedBy && r.state !== "NOT_FORWARDED" && (
                          <p className="text-[10px] text-gray-500 mt-1">Forwarded by {r.forwardedBy}</p>
                        )}
                        {r.publishedAt && (
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">{r.publishedAt}</p>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold text-gray-800">{live ? r.publishedStudents : 0}</td>
                      <td className="p-3.5 text-center font-mono text-gray-700">{live ? `${r.passPercentage}%` : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
