import React, { useState } from "react";
import { Building2, Plus, Edit } from "lucide-react";

interface Department {
  key: string;
  name: string;
  code: string;
  headName: string;
  totalStudents: number;
  status: "ACTIVE" | "INACTIVE";
}

const initialDepts: Department[] = [
  { key: "cse", name: "Computer Science & Engineering", code: "CSE", headName: "JAYAPRADHA", totalStudents: 240, status: "ACTIVE" },
  { key: "ece", name: "Electronics & Communication Engineering", code: "ECE", headName: "Dr. V. Ramanathan", totalStudents: 180, status: "ACTIVE" },
  { key: "mech", name: "Mechanical Engineering", code: "MECH", headName: "Dr. S. Sundaram", totalStudents: 120, status: "ACTIVE" },
  { key: "eee", name: "Electrical & Electronics Engineering", code: "EEE", headName: "Dr. M. Krishnan", totalStudents: 90, status: "ACTIVE" },
  { key: "it", name: "Information Technology", code: "IT", headName: "Dr. P. Deshmukh", totalStudents: 150, status: "ACTIVE" },
];

export const DepartmentsPage: React.FC = () => {
  const [depts] = useState<Department[]>(initialDepts);

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E1D8] shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-[#0B192C]">
            Engineering Departments ({depts.length})
          </h3>
          <p className="text-xs text-gray-500">
            Reusing existing <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">departments</code> database table.
          </p>
        </div>

        <button
          onClick={() => alert("Add Department modal")}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold flex items-center gap-2 hover:bg-[#132943] transition shadow"
        >
          <Plus size={15} className="text-[#D4A72C]" /> Add Department
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {depts.map((d) => (
          <div key={d.key} className="bg-white rounded-2xl border border-[#E5E1D8] p-6 shadow-sm flex flex-col justify-between hover:border-[#D4A72C] transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-xs font-bold text-[#0B192C] bg-[#0B192C]/10 px-2.5 py-1 rounded-lg">
                  KEY: {d.key.toUpperCase()}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  {d.status}
                </span>
              </div>

              <h4 className="font-display font-bold text-lg text-[#0B192C] mt-2">{d.name}</h4>
              <p className="text-xs text-gray-500 mt-1">Code: <span className="font-bold text-gray-800">{d.code}</span></p>

              <div className="mt-4 p-3 rounded-xl bg-[#F8F5EE] border border-[#E5E1D8] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">HOD / Department Head:</span>
                  <span className="font-bold text-[#0B192C]">{d.headName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Students:</span>
                  <span className="font-bold text-[#B08014]">{d.totalStudents} Candidates</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#E5E1D8] flex justify-end">
              <button
                onClick={() => alert(`Edit ${d.name}`)}
                className="text-xs font-bold text-[#0B192C] hover:text-[#B08014] flex items-center gap-1"
              >
                <Edit size={14} /> Edit Department Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
