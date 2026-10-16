import React, { useState } from 'react';
import { BarChart3, Award, Users, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

export const ElectiveDemand: React.FC = () => {
  const [status, setStatus] = useState<"DRAFT" | "UNDER_COE_REVIEW" | "COE_APPROVED">("DRAFT");
  const [approved, setApproved] = useState(false);

  const demandData = [
    { rank: 1, code: "CS305-A", name: "Cloud Computing", students: 86, percentage: 41.0 },
    { rank: 2, code: "CS305-B", name: "Cyber Security", students: 64, percentage: 30.5 },
    { rank: 3, code: "CS305-C", name: "Data Analytics", students: 42, percentage: 20.0 },
    { rank: 4, code: "CS305-D", name: "Internet of Things", students: 18, percentage: 8.5 },
  ];

  const totalSelections = 210;

  const handleCoeApproval = () => {
    setApproved(true);
    setStatus("COE_APPROVED");
    alert("COE Official Approval Recorded Successfully! Elective selections are now finalized into official semester subjects.");
  };

  return (
    <div className="space-y-8 w-full">
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            DEMAND ANALYTICS & COE APPROVAL WORKFLOW
          </span>
          <h2 className="font-display text-2xl font-bold">
            Elective Demand Dashboard
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Inspect live student elective preference rankings, total selection counts, and submit for COE official approval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!approved ? (
            <button
              onClick={handleCoeApproval}
              className="px-6 py-3 rounded-xl bg-[#2E7D5B] text-white font-extrabold text-xs hover:bg-emerald-700 transition shadow flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Confirm COE Official Approval
            </button>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> COE APPROVED & FINALIZED
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase">Total Selections Submitted</span>
          <span className="font-display font-black text-3xl text-[#0B192C] mt-1 block">210 Students</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase">Top Preferred Elective</span>
          <span className="font-display font-black text-2xl text-[#2E7D5B] mt-1 block">Cloud Computing (41%)</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase">Workflow Approval State</span>
          <span className="font-display font-black text-2xl text-[#B08014] mt-1 block">{status}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-6 space-y-4">
        <div className="border-b border-[#E5E1D8] pb-4 flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0B192C]">
              Semester I · Professional Elective Demand Ranking
            </h3>
            <p className="text-xs text-gray-500">
              Ordered by total student selections (COUNT DESC)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Course Code</th>
                <th className="p-3">Elective Subject</th>
                <th className="p-3 text-center">Student Selections</th>
                <th className="p-3 text-center">Preference Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {demandData.map((row) => (
                <tr key={row.code} className="hover:bg-[#F8F5EE]/60 transition">
                  <td className="p-3 font-bold text-[#0B192C]">#{row.rank}</td>
                  <td className="p-3 font-mono font-bold text-[#B08014]">{row.code}</td>
                  <td className="p-3 font-bold text-gray-900">{row.name}</td>
                  <td className="p-3 text-center font-black text-[#0B192C]">{row.students} Students</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#D4A72C] h-full" style={{ width: `${row.percentage}%` }} />
                      </div>
                      <span className="font-bold text-gray-700">{row.percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};