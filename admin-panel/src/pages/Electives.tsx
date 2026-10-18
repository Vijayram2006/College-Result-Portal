import React, { useState } from 'react';
import { BookOpen, Calendar, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

export const Electives: React.FC = () => {
  const [semester, setSemester] = useState("Semester I");
  const [deptKey, setDeptKey] = useState("cse");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [groupName, setGroupName] = useState("Professional Elective - I");
  const [openAt, setOpenAt] = useState("2026-10-01T09:00");
  const [closeAt, setCloseAt] = useState("2026-10-05T23:59");
  const [status, setStatus] = useState("OPEN");

  const [electiveCourses, setElectiveCourses] = useState([
    { code: "CS305-A", name: "Cloud Computing", credits: 3 },
    { code: "CS305-B", name: "Cyber Security", credits: 3 },
    { code: "CS305-C", name: "Data Analytics", credits: 3 },
    { code: "CS305-D", name: "Internet of Things", credits: 3 },
  ]);

  return (
    <div className="space-y-8 w-full">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            ELECTIVE GROUP MANAGEMENT
          </span>
          <h2 className="font-display text-2xl font-bold">
            Department Elective Configurations
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Configure current semester elective groups, set open/close selection windows, and manage course offerings.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="px-5 py-3 rounded-xl bg-[#D4A72C] text-[#0B192C] font-extrabold text-xs hover:bg-[#c39722] transition shadow flex items-center gap-2"
        >
          <Plus size={16} /> Create Elective Group
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#8A6410] tracking-wider">
              {deptKey.toUpperCase()} · {semester}
            </span>
            <h3 className="font-display font-bold text-xl text-[#0B192C] mt-0.5">
              {groupName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
              STATUS: {status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-[#F8F5EE] p-4 rounded-xl border border-[#E5E1D8]">
          <div className="flex items-center gap-2.5 text-gray-700 font-semibold">
            <Calendar size={16} className="text-[#D4A72C]" />
            <span>Opens: 01 Oct 2026, 09:00 AM</span>
          </div>
          <div className="flex items-center gap-2.5 text-gray-700 font-semibold">
            <Clock size={16} className="text-red-500" />
            <span>Closes: 05 Oct 2026, 11:59 PM</span>
          </div>
          <div className="flex items-center gap-2.5 text-gray-700 font-semibold">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Selection Rule: Exactly 1 Subject</span>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider mb-3">
            Offered Elective Courses ({electiveCourses.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {electiveCourses.map((c) => (
              <div key={c.code} className="p-4 rounded-xl border border-[#E5E1D8] bg-white flex items-center justify-between hover:border-[#D4A72C] transition">
                <div>
                  <span className="font-mono text-xs font-bold text-[#8A6410] block">{c.code}</span>
                  <span className="font-bold text-sm text-[#0B192C] block mt-0.5">{c.name}</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-gray-100 font-bold text-[10px] text-gray-600">
                  {c.credits} Credits
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};