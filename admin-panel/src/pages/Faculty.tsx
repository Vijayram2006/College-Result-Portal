import React, { useState } from "react";
import { Search, Plus, Edit } from "lucide-react";

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

  const filtered = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.employeeId.toLowerCase().includes(query.toLowerCase()) ||
      f.deptName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
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
          onClick={() => alert("Add Faculty modal")}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold flex items-center gap-2 hover:bg-[#132943] transition shadow w-full sm:w-auto justify-center"
        >
          <Plus size={15} className="text-[#D4A72C]" /> Add New Faculty
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
                      <span className="font-mono font-bold text-[#B08014] mr-1.5">{f.subjectCode}</span>
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
