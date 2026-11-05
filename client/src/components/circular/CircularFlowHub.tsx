import React, { useState } from "react";
import {
  ShieldAlert,
  Building2,
  Users,
  GraduationCap,
  Sparkles,
  Layers,
  ArrowRight,
  Send,
  Eye,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { CircularDeanView } from "./CircularDeanView";
import { CircularCoeView } from "./CircularCoeView";
import { CircularHodView } from "./CircularHodView";
import { CircularFacultyView } from "./CircularFacultyView";
import { CircularStudentView } from "./CircularStudentView";
import {
  StudentYear,
  ALL_STUDENT_YEARS,
  DEFAULT_DEPARTMENTS,
} from "./CircularTypes";

export type CircularRole =
  | "ASSOCIATE_DEAN"
  | "COE"
  | "HOD"
  | "FACULTY"
  | "STUDENT";

export interface CircularFlowHubProps {
  initialRole?: CircularRole;
  initialDeptKey?: string;
  initialStudentYear?: StudentYear;
  allowRoleSwitch?: boolean;
}

export const CircularFlowHub: React.FC<CircularFlowHubProps> = ({
  initialRole = "ASSOCIATE_DEAN",
  initialDeptKey = "cse",
  initialStudentYear = "3rd Year",
  allowRoleSwitch = true,
}) => {
  const [activeRole, setActiveRole] = useState<CircularRole>(initialRole);
  const [selectedDeptKey, setSelectedDeptKey] =
    useState<string>(initialDeptKey);
  const [selectedYear, setSelectedYear] =
    useState<StudentYear>(initialStudentYear);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const currentDept =
    DEFAULT_DEPARTMENTS.find((d) => d.key === selectedDeptKey) ||
    DEFAULT_DEPARTMENTS[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B192C] text-[#D4A72C] px-5 py-3 rounded-2xl shadow-xl border border-[#D4A72C]/30 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Role & Context Bar (For Development, Verification & Switching) */}
      {allowRoleSwitch && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers size={14} className="text-[#0B192C]" />
              Role Simulator:
            </span>

            {/* Role Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveRole("ASSOCIATE_DEAN")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeRole === "ASSOCIATE_DEAN"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Sparkles size={13} />
                <span>Associate Dean</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRole("COE")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeRole === "COE"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <ShieldCheck size={13} />
                <span>COE (Exam Cell)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRole("HOD")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeRole === "HOD"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Building2 size={13} />
                <span>HOD</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRole("FACULTY")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeRole === "FACULTY"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Users size={13} />
                <span>Faculty</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRole("STUDENT")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeRole === "STUDENT"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <GraduationCap size={13} />
                <span>Student</span>
              </button>
            </div>
          </div>

          {/* Context Selectors for Testing: Department & Year */}
          {activeRole !== "ASSOCIATE_DEAN" && activeRole !== "COE" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Dept:</span>
                <select
                  value={selectedDeptKey}
                  onChange={(e) => setSelectedDeptKey(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white font-semibold text-slate-800"
                >
                  {DEFAULT_DEPARTMENTS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {activeRole === "STUDENT" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Year:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value as StudentYear)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs bg-white font-semibold text-slate-800"
                  >
                    {ALL_STUDENT_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Role View Routing */}
      {activeRole === "ASSOCIATE_DEAN" && (
        <CircularDeanView onToast={showToast} />
      )}

      {activeRole === "COE" && (
        <CircularCoeView onToast={showToast} />
      )}

      {activeRole === "HOD" && (
        <CircularHodView
          deptKey={currentDept.key}
          deptName={currentDept.name}
          hodName={currentDept.hodName}
          onToast={showToast}
        />
      )}

      {activeRole === "FACULTY" && (
        <CircularFacultyView
          deptKey={currentDept.key}
          deptName={currentDept.name}
          facultyName={`Faculty (${currentDept.code})`}
        />
      )}

      {activeRole === "STUDENT" && (
        <CircularStudentView
          deptKey={currentDept.key}
          deptName={currentDept.name}
          studentYear={selectedYear}
          studentName={`Student (${currentDept.code} - ${selectedYear})`}
        />
      )}
    </div>
  );
};
export default CircularFlowHub;
