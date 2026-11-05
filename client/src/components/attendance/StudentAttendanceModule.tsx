import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CalendarX,
  Clock,
  User
} from "lucide-react";
import {
  attendanceApi,
  type StudentAttendanceOverview,
  type StudentSubjectAttendance
} from "../../services/api";

export function StudentAttendanceModule({
  studentReg,
  onNavigateToAbsentDetails
}: {
  studentReg?: string;
  onNavigateToAbsentDetails?: (subjectCode?: string) => void;
}) {
  const [overview, setOverview] = useState<StudentAttendanceOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedSubjectCode, setExpandedSubjectCode] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    attendanceApi
      .getStudentOverview(studentReg)
      .then((data) => {
        setOverview(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading student attendance:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [studentReg]);

  const toggleExpand = (code: string) => {
    setExpandedSubjectCode((prev) => (prev === code ? null : code));
  };

  return (
    <div className="space-y-6">
      {/* Student Portal Header Banner */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-7 rounded-3xl border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded font-mono font-black text-[10px] bg-[#D4A72C] text-[#0B192C] tracking-widest uppercase">
                OFFICIAL ATTENDANCE RECORD
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Register No: <strong className="font-mono text-white">{overview?.regNo || studentReg}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <CalendarCheck className="text-[#D4A72C]" size={26} />
              Subject-Wise Attendance &amp; Percentages
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              University regulations require a minimum of <strong>75% attendance</strong> in each course to be eligible to appear for the end-semester examinations. The records shown below reflect officially <strong>ADEAN-approved</strong> monthly attendance reports.
            </p>
          </div>

          {/* Overall Attendance KPI Badge */}
          {overview && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg">
              <div className="text-center">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                  Overall Attendance
                </span>
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {overview.overallPercentage}%
                </span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider block text-center ${
                    overview.overallPercentage >= 75
                      ? "bg-emerald-500 text-white shadow-sm"
                      : overview.overallPercentage >= 65
                      ? "bg-amber-500 text-[#0B192C] font-bold"
                      : "bg-rose-500 text-white animate-pulse"
                  }`}
                >
                  {overview.overallPercentage >= 75
                    ? "✓ EXAM ELIGIBLE"
                    : overview.overallPercentage >= 65
                    ? "CONDONATION ELIGIBLE"
                    : "⚠️ ATTENDANCE SHORTAGE"}
                </span>
                <span className="text-[11px] text-slate-300 block text-center mt-1">
                  {overview.totalAttended + overview.totalOd} / {overview.totalConducted} Classes Attended
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Link to Absent Details */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck size={16} className="text-[#D4A72C]" />
            <span>Attendance records are certified and approved monthly by the Faculty, HOD, and Associate Dean.</span>
          </div>

          {onNavigateToAbsentDetails && (
            <button
              onClick={() => onNavigateToAbsentDetails()}
              className="px-4 py-2 rounded-xl bg-[#D4A72C] text-[#0B192C] font-black hover:bg-amber-400 transition flex items-center gap-2 shadow cursor-pointer"
            >
              <CalendarX size={15} />
              <span>Inspect Absent Days Subject-Wise</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Grid */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Conducted</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900">{overview.totalConducted}</span>
              <span className="text-xs text-slate-500 font-medium">classes</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Classes Attended</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-700">{overview.totalAttended}</span>
              <span className="text-xs text-emerald-600 font-medium">present</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Classes Missed</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-rose-700">{overview.totalAbsent}</span>
              <span className="text-xs text-rose-600 font-medium">absent</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">On Duty (OD)</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-blue-700">{overview.totalOd}</span>
              <span className="text-xs text-blue-600 font-medium">credited</span>
            </div>
          </div>
        </div>
      )}

      {/* Subject-Wise Attendance Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen size={16} className="text-[#FC6226]" />
            <span>Subject-Wise Attendance Details ({overview?.subjects?.length || 0} Registered Subjects)</span>
          </h2>
          <button
            onClick={loadData}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-medium">
            Loading your approved attendance records...
          </div>
        ) : overview?.subjects && overview.subjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {overview.subjects.map((sub) => {
              const isExpanded = expandedSubjectCode === sub.subjectCode;
              const isGood = sub.percentage >= 75;
              const isWarning = sub.percentage >= 65 && sub.percentage < 75;
              const isCritical = sub.percentage < 65;

              return (
                <div
                  key={sub.subjectCode}
                  className={`bg-white rounded-3xl border transition shadow-sm overflow-hidden ${
                    isExpanded ? "border-[#D4A72C] shadow-md" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Subject Card Header */}
                  <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded font-mono font-black text-xs bg-slate-900 text-white">
                          {sub.subjectCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isGood
                              ? "bg-emerald-100 text-emerald-800"
                              : isWarning
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isGood
                            ? "✓ Exam Eligible"
                            : isWarning
                            ? "⚠️ Condonation Range (65-74%)"
                            : "❌ Attendance Shortage (<65%)"}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {sub.subjectTitle}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span>Faculty In-Charge: <strong>{sub.facultyName}</strong></span>
                      </p>
                    </div>

                    {/* Subject Percentage & Progress */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-2xl sm:text-3xl font-black font-mono ${
                              isGood ? "text-emerald-700" : isWarning ? "text-amber-700" : "text-rose-700"
                            }`}
                          >
                            {sub.percentage}%
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            ({sub.totalAttended + sub.totalOd}/{sub.totalConducted})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onNavigateToAbsentDetails && (
                          <button
                            onClick={() => onNavigateToAbsentDetails(sub.subjectCode)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
                            title="View exact dates you missed in this subject"
                          >
                            <CalendarX size={14} />
                            <span>{sub.totalAbsent} Absent Days</span>
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpand(sub.subjectCode)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                          title="View month-by-month breakdown"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="px-5 sm:px-6 pb-4">
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isGood
                            ? "bg-emerald-500"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                      <span>0%</span>
                      <span className="text-amber-600 font-bold">65% (Condonation cutoff)</span>
                      <span className="text-emerald-600 font-bold">75% (University Exam cutoff)</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Expandable Month-by-Month Breakdown */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-100 p-5 sm:p-6 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-500" />
                        <span>Monthly Scrutinized Attendance Log</span>
                      </h4>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Month</th>
                              <th className="py-2.5 px-3 text-center">Conducted</th>
                              <th className="py-2.5 px-3 text-center text-emerald-700">Attended</th>
                              <th className="py-2.5 px-3 text-center text-rose-700">Absent</th>
                              <th className="py-2.5 px-3 text-center text-blue-700">OD</th>
                              <th className="py-2.5 px-3 text-right">Monthly %</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {sub.monthlyBreakdown.map((m) => (
                              <tr key={`${m.year}-${m.month}`} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {m.monthName} {m.year}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono">{m.conducted}</td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                                  {m.attended}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                                  {m.absent}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-blue-700">
                                  {m.od}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                                  {m.percentage}%
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                      m.percentage >= 75
                                        ? "bg-emerald-100 text-emerald-800"
                                        : m.percentage >= 65
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-100 text-rose-800"
                                    }`}
                                  >
                                    {m.percentage >= 75 ? "ELIGIBLE" : m.percentage >= 65 ? "CONDONATION" : "SHORTAGE"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
            <CalendarCheck className="mx-auto text-slate-300" size={36} />
            <h3 className="text-sm font-bold text-slate-700">No Approved Attendance Records Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Monthly attendance reports must be approved by the Department Head (HOD) and the Associate Dean (ADEAN) before they appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
