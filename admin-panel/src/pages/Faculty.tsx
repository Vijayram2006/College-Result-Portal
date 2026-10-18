import React, { useState, useEffect } from "react";
import { Search, Plus, Edit, Lock } from "lucide-react";
import { getActiveCollegeKey } from "../utils/rbac";
import { getSystemConfig, SystemConfig } from "../utils/systemConfig";

interface Faculty {
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  deptName: string;
  subjectCode: string;
  subjectName: string;
  status: "ACTIVE" | "INACTIVE";
}

const initialFaculty: Faculty[] = [];

export const FacultyPage: React.FC = () => {
  const [facultyList] = useState<Faculty[]>(initialFaculty);
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

  const filtered = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.employeeId.toLowerCase().includes(query.toLowerCase()) ||
      f.deptName.toLowerCase().includes(query.toLowerCase())
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
                Faculty appointments, course assignments, and officer provisioning are strictly locked by the Controller of Examinations. All faculty registries are read-only.
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
            placeholder="Search faculty ID, name, department..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
          />
        </div>

        <button
          disabled={isCollegeLocked}
          onClick={() => {
            if (isCollegeLocked) {
              alert("Institutional Freeze Active: Registering faculty members is restricted by the Controller of Examinations (Dr. Sathish).");
              return;
            }
            alert("Add Faculty modal");
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow w-full sm:w-auto justify-center ${
            isCollegeLocked
              ? "bg-slate-700 text-gray-400 cursor-not-allowed border border-slate-600"
              : "bg-[#0B192C] text-white hover:bg-[#132943]"
          }`}
        >
          {isCollegeLocked ? <Lock size={15} className="text-red-400" /> : <Plus size={15} className="text-[#D4A72C]" />}
          <span>{isCollegeLocked ? "Locked by COE" : "Add New Faculty"}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B192C]">
            Faculty Directory & Assigned Courses ({filtered.length})
          </span>
          <span className="text-[10px] text-gray-500 font-semibold uppercase">
            Faculty Management
          </span>
        </div>

        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
              <tr>
                <th className="p-3.5">Employee ID</th>
                <th className="p-3.5">Faculty Name</th>
                <th className="p-3.5">Designation</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Assigned Course</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold text-xs">
                    No faculty members present. Click "Add New Faculty" to register department staff.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.employeeId} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#0B192C]">{f.employeeId}</td>
                    <td className="p-3.5 font-bold text-gray-900">{f.name}</td>
                    <td className="p-3.5 font-medium text-gray-700">{f.designation}</td>
                    <td className="p-3.5 text-gray-800">{f.deptName}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-[#8A6410] mr-1.5">{f.subjectCode}</span>
                      <span className="text-gray-600 font-medium">{f.subjectName}</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => alert(`Edit faculty ${f.name}`)}
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
