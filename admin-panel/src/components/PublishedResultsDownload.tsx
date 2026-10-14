import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { downloadAllPublished, downloadPublishedGroup, groupPublished, PublishedBatch } from "../utils/publishedResults";

/**
 * "Download Published Results": one row per department + semester + assessment that has published results, each
 * downloadable as an Excel result sheet. Shared by the admin panel and the faculty portal (same file in both apps).
 */
export const PublishedResultsDownload: React.FC<{
  batches: PublishedBatch[];
  collegeShortName?: string;
  loading?: boolean;
  error?: string | null;
}> = ({ batches, collegeShortName = "KVELL", loading = false, error = null }) => {
  const groups = useMemo(() => groupPublished(batches), [batches]);
  const [dept, setDept] = useState("ALL");
  const [semester, setSemester] = useState("ALL");
  const [assessment, setAssessment] = useState("ALL");

  const departments = useMemo(
    () => Array.from(new Map(groups.map((g) => [g.departmentKey, g.departmentName])).entries()),
    [groups]
  );
  const semesters = useMemo(() => Array.from(new Set(groups.map((g) => g.semester))), [groups]);
  const assessments = useMemo(() => Array.from(new Set(groups.map((g) => g.assessment))), [groups]);
  const shown = groups.filter(
    (g) =>
      (dept === "ALL" || g.departmentKey === dept) &&
      (semester === "ALL" || g.semester === semester) &&
      (assessment === "ALL" || g.assessment === assessment)
  );

  const select = "h-9 rounded-lg border border-[#E5E1D8] bg-white px-2.5 text-xs font-semibold text-[#0B192C]";

  return (
    <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#E5E1D8] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-[#2E7D5B]" />
          <div>
            <span className="text-xs font-bold text-[#0B192C] block">Download Published Results</span>
            <span className="text-[10px] text-gray-500">
              Excel result sheet per department, semester and assessment (Result Sheet, Subject Summary, Marks Detail)
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {departments.length > 1 && (
            <select aria-label="Department" className={select} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="ALL">All departments</option>
              {departments.map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          )}
          <select aria-label="Semester" className={select} value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="ALL">All semesters</option>
            {semesters.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select aria-label="Assessment" className={select} value={assessment} onChange={(e) => setAssessment(e.target.value)}>
            <option value="ALL">All assessments</option>
            {assessments.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            onClick={() => downloadAllPublished(shown, collegeShortName)}
            disabled={shown.length === 0}
            className="h-9 px-3 rounded-lg bg-[#0B192C] hover:bg-[#132A4A] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold inline-flex items-center gap-1.5"
          >
            <Download size={13} /> Download all shown ({shown.length})
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[50vh]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">Semester</th>
              <th className="p-3">Assessment</th>
              <th className="p-3 text-center">Subjects</th>
              <th className="p-3 text-center">Students</th>
              <th className="p-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1D8]">
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500 font-semibold">Loading published results…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="p-6 text-center text-red-600 font-semibold">{error}</td></tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-500 font-semibold">
                  {groups.length === 0 ? "No results have been published yet." : "No published results match these filters."}
                </td>
              </tr>
            ) : (
              shown.map((g) => (
                <tr key={g.key} className="hover:bg-[#F8F5EE]/60">
                  <td className="p-3 font-bold text-[#0B192C]">{g.departmentName}</td>
                  <td className="p-3 font-semibold text-gray-800">
                    {g.semester} <span className="text-[10px] text-gray-500">· {g.academicYear}</span>
                  </td>
                  <td className="p-3 font-semibold text-gray-800">{g.assessment}</td>
                  <td className="p-3 text-center font-bold">{g.batches.length}</td>
                  <td className="p-3 text-center font-bold">{g.students}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => downloadPublishedGroup(g, collegeShortName)}
                      className="px-3 py-1.5 rounded-lg bg-[#2E7D5B] hover:bg-emerald-700 text-white font-extrabold text-[11px] inline-flex items-center gap-1"
                    >
                      <Download size={13} /> Excel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
