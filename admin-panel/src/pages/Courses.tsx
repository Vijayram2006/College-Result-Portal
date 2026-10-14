import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Lock } from "lucide-react";
import { getActiveCollegeKey } from "../utils/rbac";
import { getSystemConfig, SystemConfig } from "../utils/systemConfig";

interface Course {
  code: string;
  title: string;
  credits: number;
  deptKey: string;
  semester: string;
  status: "ACTIVE" | "INACTIVE";
}

const initialCourses: Course[] = [];

export const CoursesPage: React.FC = () => {
  const [courses] = useState<Course[]>(initialCourses);
  const [query, setQuery] = useState("");

  // Real-time System Governance Configuration & Lock Enforcement
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig);

  useEffect(() => {
    const handleConfigUpdate = () => {
      setSystemConfig(getSystemConfig());
    };
    window.addEventListener("kvell_system_config_updated", handleConfigUpdate);
    window.addEventListener("storage", handleConfigUpdate);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleConfigUpdate);
      window.removeEventListener("storage", handleConfigUpdate);
    };
  }, []);

  const activeCollegeKey = getActiveCollegeKey();
  const isCollegeLocked =
    systemConfig.systemMode === "EMERGENCY_LOCK" ||
    systemConfig.institutionalLocks?.[activeCollegeKey]?.locked === true ||
    systemConfig.institutionalLocks?.[activeCollegeKey]?.freezeSubmissions === true;

  const filtered = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.deptKey.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      {/* Institutional Freeze Alert Banner */}
      {isCollegeLocked && (
        <div className="p-5 rounded-3xl bg-red-950/80 border-2 border-red-500/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center shrink-0">
              <Lock className="text-red-300" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wider text-red-300">INSTITUTIONAL EXAMINATION LOCK ACTIVE</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">Dr. Sathish Enforcement</span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                Curriculum subject catalogs and course configurations are strictly locked by the Controller of Examinations. All course registries are read-only.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/50 text-red-200 text-xs font-mono font-bold whitespace-nowrap">
            STATUTORY FREEZE
          </span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E1D8] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course code, title, department..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
          />
        </div>

        <button
          disabled={isCollegeLocked}
          onClick={() => {
            if (isCollegeLocked) {
              alert("Institutional Freeze Active: Adding new courses is restricted by the Controller of Examinations (Dr. Sathish).");
              return;
            }
            alert("Add Course modal");
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow w-full sm:w-auto justify-center ${
            isCollegeLocked
              ? "bg-slate-700 text-gray-400 cursor-not-allowed border border-slate-600"
              : "bg-[#0B192C] text-white hover:bg-[#132943]"
          }`}
        >
          {isCollegeLocked ? <Lock size={15} className="text-red-400" /> : <Plus size={15} className="text-[#D4A72C]" />}
          <span>{isCollegeLocked ? "Locked by COE" : "Add New Course"}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B192C]">
            Course Catalog ({filtered.length} Subjects)
          </span>
          <span className="text-[10px] text-gray-500 font-semibold uppercase">
            Course Management
          </span>
        </div>

        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
              <tr>
                <th className="p-3.5">Course Code</th>
                <th className="p-3.5">Course Title</th>
                <th className="p-3.5 text-center">Credits</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Semester</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold text-xs">
                    No courses present in catalog. Click "Add New Course" to add subjects.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.code} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#0B192C]">{c.code}</td>
                    <td className="p-3.5 font-bold text-gray-900">{c.title}</td>
                    <td className="p-3.5 text-center font-bold text-[#B08014]">{c.credits} Credits</td>
                    <td className="p-3.5 font-bold uppercase text-gray-700">{c.deptKey}</td>
                    <td className="p-3.5 text-gray-800">{c.semester}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => alert(`Edit ${c.code}`)}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
