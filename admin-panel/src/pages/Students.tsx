import React, { useState } from "react";
import { Search, UserPlus, Edit, CheckCircle, XCircle, Eye } from "lucide-react";

interface Student {
  regNo: string;
  name: string;
  email: string;
  deptName: string;
  year: string;
  section: string;
  semester: string;
  sgpa: number;
  cgpa: number;
  status: "ACTIVE" | "INACTIVE";
}

const initialStudents: Student[] = [];

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filtered = students.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.regNo.toLowerCase().includes(query.toLowerCase()) ||
      s.deptName.toLowerCase().includes(query.toLowerCase());
    const matchesYear = yearFilter === "all" || s.year === yearFilter;
    return matchesQuery && matchesYear;
  });

  const toggleStatus = (regNo: string) => {
    setStudents(
      students.map((s) =>
        s.regNo === regNo ? { ...s, status: s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : s
      )
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Action Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E1D8] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student reg no, name..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Academic Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>

        <button
          onClick={() => alert("Add Student modal (Reuses existing students table schema)")}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold flex items-center gap-2 hover:bg-[#132943] transition shadow w-full sm:w-auto justify-center"
        >
          <UserPlus size={15} className="text-[#D4A72C]" /> Add New Student
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B192C]">
            Enrolled Candidate Directory ({filtered.length} Students)
          </span>
          <span className="text-[10px] text-gray-500 font-semibold uppercase">
            Reusing Existing `students` Database Table
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-3.5">Register No</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Year & Section</th>
                <th className="p-3.5 text-center">SGPA</th>
                <th className="p-3.5 text-center">CGPA</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-semibold text-xs">
                    No enrolled students present. Click "Add New Student" or upload result marksheets.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.regNo} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#0B192C]">{s.regNo}</td>
                    <td className="p-3.5 font-bold text-gray-900">{s.name}</td>
                    <td className="p-3.5 font-medium text-gray-800">{s.deptName}</td>
                    <td className="p-3.5 text-gray-700">{s.year} • {s.section}</td>
                    <td className="p-3.5 text-center font-bold text-[#0B192C]">{s.sgpa.toFixed(2)}</td>
                    <td className="p-3.5 text-center font-bold text-[#B08014]">{s.cgpa.toFixed(2)}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        title="View Profile"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => toggleStatus(s.regNo)}
                        className={`p-1.5 rounded-lg transition ${
                          s.status === "ACTIVE"
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                        title={s.status === "ACTIVE" ? "Deactivate Student" : "Activate Student"}
                      >
                        {s.status === "ACTIVE" ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E5E1D8] shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-[#E5E1D8] pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0B192C]">{selectedStudent.name}</h3>
                <span className="font-mono text-xs font-bold text-[#B08014]">{selectedStudent.regNo}</span>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Department</span>
                <span className="font-bold text-[#0B192C]">{selectedStudent.deptName}</span>
              </div>
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Semester</span>
                <span className="font-bold text-[#0B192C]">{selectedStudent.semester}</span>
              </div>
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Latest SGPA</span>
                <span className="font-bold text-[#0B192C]">{selectedStudent.sgpa.toFixed(2)}</span>
              </div>
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Cumulative CGPA</span>
                <span className="font-bold text-[#B08014]">{selectedStudent.cgpa.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close Candidate Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
