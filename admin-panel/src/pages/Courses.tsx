import React, { useState } from "react";
import { Plus, Search, Edit } from "lucide-react";

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

  const filtered = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.deptKey.toLowerCase().includes(query.toLowerCase())
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
            placeholder="Search course code, title, department..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
          />
        </div>

        <button
          onClick={() => alert("Add Course modal")}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold flex items-center gap-2 hover:bg-[#132943] transition shadow w-full sm:w-auto justify-center"
        >
          <Plus size={15} className="text-[#D4A72C]" /> Add New Course
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
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
