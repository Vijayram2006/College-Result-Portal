import React, { useState, useEffect } from "react";
import {
  CalendarX,
  BookOpen,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  Filter,
  Search
} from "lucide-react";
import {
  attendanceApi,
  type StudentAbsentDetailsView,
  type StudentAbsentItem,
  type SubjectAbsentGroup
} from "../../services/api";

export function StudentAbsentDetailsModule({
  studentReg,
  initialSubjectFilter = "ALL"
}: {
  studentReg?: string;
  initialSubjectFilter?: string;
}) {
  const [data, setData] = useState<StudentAbsentDetailsView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectFilter);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadAbsentDetails = () => {
    setLoading(true);
    attendanceApi
      .getStudentAbsentDetails(
        studentReg,
        selectedSubject !== "ALL" ? selectedSubject : undefined
      )
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading absent details:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAbsentDetails();
  }, [studentReg, selectedSubject]);

  // Extract all distinct subjects for the filter buttons
  const availableSubjectCodes = data?.subjectGroups?.map((g) => g.subjectCode) || [];

  return (
    <div className="space-y-6">
      {/* Student Absent Portal Header */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-3xl border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded font-mono font-black text-[10px] bg-rose-500 text-white tracking-widest uppercase">
                STUDENT ABSENT DAYS PORTAL
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Register No: <strong className="font-mono text-white">{data?.regNo || studentReg}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <CalendarX className="text-rose-400" size={26} />
              Subject-Wise Absent Days &amp; Missed Classes
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Verify your recorded absences by subject, date, and class hour. Only absences from <strong>ADEAN-approved monthly attendance reports</strong> are recorded here. If you were on authorized duty or medical leave, ensure your regularisation request is submitted to the HOD within 3 days.
            </p>
          </div>

          {/* Quick Metrics */}
          {data && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg">
              <div className="text-center">
                <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
                  Total Absences
                </span>
                <span className="text-3xl font-black font-mono text-rose-400">
                  {data.totalAbsentCount}
                </span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  Subjects Affected
                </span>
                <span className="text-2xl font-black font-mono text-white">
                  {data.subjectsAffected}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-amber-300 font-bold mr-1">Filter by Subject:</span>
            <button
              onClick={() => setSelectedSubject("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                selectedSubject === "ALL"
                  ? "bg-[#D4A72C] text-[#0B192C] shadow"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              All Subjects
            </button>
            {data?.subjectGroups?.map((g) => (
              <button
                key={g.subjectCode}
                onClick={() => setSelectedSubject(g.subjectCode)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  selectedSubject === g.subjectCode
                    ? "bg-[#D4A72C] text-[#0B192C] shadow"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                <span>{g.subjectCode}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/80 text-white font-mono">
                  {g.totalAbsentDays}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={loadAbsentDetails}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition flex items-center gap-1.5 self-end"
          >
            <RotateCcw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* University Regularisation Policy Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-amber-950 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold mt-0.5">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Attendance Regularisation &amp; Medical Condonation</h4>
            <p className="text-amber-800 leading-relaxed mt-0.5">
              Medical certificates and official On Duty (OD) sanction letters must be endorsed by your faculty advisor and forwarded to the <strong>HOD within 3 working days</strong> of resuming classes. Absences without prior OD sanction are cataloged as Unexcused.
            </p>
          </div>
        </div>
      </div>

      {/* Subject-Wise Grouped Absent Cards */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-medium">
            Loading absent session logs...
          </div>
        ) : data?.subjectGroups && data.subjectGroups.length > 0 ? (
          data.subjectGroups.map((group) => (
            <div
              key={group.subjectCode}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center font-mono font-bold shrink-0">
                    <CalendarX size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        {group.subjectCode}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">{group.subjectTitle}</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Faculty In-Charge: <strong>{group.facultyName}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                    {group.totalAbsentDays} {group.totalAbsentDays === 1 ? "Class Missed" : "Classes Missed"}
                  </span>
                </div>
              </div>

              {/* Exact Dates Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Absent Date</th>
                      <th className="py-2.5 px-4">Day of Week</th>
                      <th className="py-2.5 px-4">Hour / Period Slot</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                      <th className="py-2.5 px-4">Recorded Remarks / Nature of Absence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {group.absentDates.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.attendanceDate}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{item.dayOfWeek}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">{item.sessionSlot}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                            ABSENT
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {item.remark ? (
                            <span className="italic text-slate-800">{item.remark}</span>
                          ) : (
                            <span className="text-slate-400">Unexcused Absence</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
            <h3 className="text-sm font-bold text-slate-800">No Absent Days Recorded!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You have 100% attendance in all scrutinized sessions for this selection, or no absences have been logged in ADEAN-approved reports.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
