import React, { useState } from "react";
import {
  FileCheck,
  RefreshCw,
  Clock,
  Lock,
  X,
  Sliders,
  CheckCircle2,
  Calendar,
  Building2,
  BookOpen,
  Info,
} from "lucide-react";
import { aidsSem1Students } from "../../data/aidsStudents";

interface StudentInternalRow {
  regNo: string;
  name: string;
  iat1Of100: number;
  quiz1Of10: number | null;
  activity1Of10: number | null;
  assignment1Of10: number | null;
  total1Of35: number;

  iat2Of100: number | null;
  quiz2Of10: number | null;
  activity2Of10: number | null;
  assignment2Of10: number | null;
  total2Of35: number;

  attendanceHours: number | null;
  internalOf40: number;
  isComplete: boolean;
  lastChange: string;
}

const INITIAL_ROWS: StudentInternalRow[] = aidsSem1Students.map((s, idx) => {
  // Matching Image 2:
  // ABI T (idx 0): iat1 = 79, total1 = 15.8, internal = 8 incomplete
  // ABISHEK S R (idx 1): iat1 = 100, total1 = 20, internal = 10 incomplete
  let iat1 = 75 + ((idx * 7) % 26);
  if (idx === 0) iat1 = 79;
  if (idx === 1) iat1 = 100;
  if (idx === 2) iat1 = 85;
  if (idx === 3) iat1 = 92;
  if (idx === 4) iat1 = 74;

  const total1 = Number(((iat1 / 100) * 20).toFixed(1));
  const internal = Math.round(total1 / 2); // provisional average

  return {
    regNo: s.regNo,
    name: s.name,
    iat1Of100: iat1,
    quiz1Of10: null,
    activity1Of10: null,
    assignment1Of10: null,
    total1Of35: total1,

    iat2Of100: null,
    quiz2Of10: null,
    activity2Of10: null,
    assignment2Of10: null,
    total2Of35: 0,

    attendanceHours: null,
    internalOf40: internal,
    isComplete: false,
    lastChange: "2026-10-18 19:42",
  };
});

export const InternalMarksView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"marks" | "formula">("marks");
  const [selectedDept, setSelectedDept] = useState("Artificial Intelligence & Data Science");
  const [selectedSemester, setSelectedSemester] = useState("Semester I");
  const [selectedSubject, setSelectedSubject] = useState("UC26C01T — Tamil Heritage and Technology");
  const [rows, setRows] = useState<StudentInternalRow[]>(INITIAL_ROWS);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const completedCount = rows.filter((r) => r.isComplete).length;
  const averageInternal = (
    rows.reduce((sum, r) => sum + r.internalOf40, 0) / (rows.length || 1)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Tabs matching Image 2 */}
      <div className="border-b border-gray-200 flex items-center gap-8">
        <button
          onClick={() => setActiveTab("marks")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition relative ${
            activeTab === "marks" ? "text-[#0B192C]" : "text-gray-400 hover:text-gray-700"
          }`}
        >
          Marks
          {activeTab === "marks" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EAB308] rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("formula")}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition relative ${
            activeTab === "formula" ? "text-[#0B192C]" : "text-gray-400 hover:text-gray-700"
          }`}
        >
          Formula &amp; Settings
          {activeTab === "formula" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EAB308] rounded-full" />
          )}
        </button>
      </div>

      {activeTab === "marks" ? (
        <div className="space-y-5">
          {/* Filters Row: Department | Semester | Subject | Refresh */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-4 sm:p-5 shadow-xs flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
              >
                <option value="Artificial Intelligence & Data Science">Artificial Intelligence &amp; Data Science</option>
                <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                <option value="Biomedical Engineering">Biomedical Engineering</option>
                <option value="Biotechnology">Biotechnology</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics & Communication Engineering">Electronics &amp; Communication</option>
              </select>
            </div>

            <div className="w-40">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
              >
                <option value="Semester I">Semester I</option>
                <option value="Semester II">Semester II</option>
                <option value="Semester III">Semester III</option>
                <option value="Semester IV">Semester IV</option>
              </select>
            </div>

            <div className="flex-1 min-w-[260px]">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none"
              >
                <option value="UC26C01T — Tamil Heritage and Technology">
                  UC26C01T — Tamil Heritage and Technology
                </option>
                <option value="CS26C02T — Fundamentals of Data Science">
                  CS26C02T — Fundamentals of Data Science
                </option>
                <option value="CS26N011 — Industry Nexus-I Python">CS26N011 — Industry Nexus-I Python</option>
                <option value="CY26C01I — Engineering Chemistry">CY26C01I — Engineering Chemistry</option>
                <option value="MA26C01T — Matrices and Calculus">MA26C01T — Matrices and Calculus</option>
              </select>
            </div>

            <div className="self-end pb-0.5">
              <button
                onClick={handleRefresh}
                className="h-10 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-extrabold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#D4A72C]" : "text-gray-500"} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Formula Banner matching Image 2 */}
          <div className="bg-[#FFFDF5] border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-[#B08014]" />
              <span className="font-extrabold text-xs text-[#0B192C]">Internal mark formula • out of 40</span>
              <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                PROVISIONAL - NOT CONFIRMED
              </span>
            </div>

            <div className="text-[11px] text-gray-700 space-y-1 font-medium pl-6 leading-relaxed">
              <p>
                Each IAT cycle (IAT-1 and IAT-2, out of 35): IAT (of 100) &rarr; 20 + Quiz (of 10) &rarr; 5 + Activity
                (of 10) &rarr; 5 + Assignment (of 10) &rarr; 5
              </p>
              <p>End-semester internal = the average of the two IAT cycles + attendance (hours of 45) &rarr; 5</p>
              <p className="text-gray-500">
                Attendance marks: &ge;95%: 5 • &ge;90%: 4 • &ge;85%: 3 • &ge;80%: 2 • &ge;75%: 1
              </p>
            </div>
          </div>

          {/* Blue Notice Box matching Image 2 */}
          <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-[#1E40AF] font-bold">
            <Lock size={15} className="shrink-0 text-[#2563EB]" />
            <span>
              Internal marks are entered by the subject's faculty and corrected by the HOD in the main portal. This
              sheet is view only.
            </span>
          </div>

          {/* Summary Badges and Change History */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 shadow-xs">
                {selectedSubject.split("—")[0].trim()} — {selectedSubject.split("—")[1]?.trim()}
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 shadow-xs">
                {rows.length} students
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 shadow-xs">
                {completedCount} complete
              </span>
              <span className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-800 shadow-xs">
                Average {averageInternal} / 40
              </span>
            </div>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-center"
            >
              <Clock size={13} className="text-gray-500" />
              <span>Change history</span>
            </button>
          </div>

          {/* Data Table matching Image 2 */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  {/* Top Level Group Headers */}
                  <tr className="bg-[#FAF8F5] border-b border-gray-200 text-[10px] font-extrabold uppercase text-gray-600 tracking-wider">
                    <th rowSpan={2} className="py-3 px-3.5 border-r border-gray-200">
                      REG. NO.
                    </th>
                    <th rowSpan={2} className="py-3 px-4 border-r border-gray-200">
                      NAME
                    </th>
                    <th colSpan={5} className="py-2 px-3 text-center bg-purple-50/70 text-purple-900 border-r border-purple-200">
                      IAT-1 CYCLE
                    </th>
                    <th colSpan={5} className="py-2 px-3 text-center bg-purple-50/70 text-purple-900 border-r border-purple-200">
                      IAT-2 CYCLE
                    </th>
                    <th rowSpan={2} className="py-3 px-3.5 text-center border-r border-gray-200">
                      ATTENDANCE
                      <span className="block text-[8px] font-normal text-gray-400">hours of 45</span>
                    </th>
                    <th rowSpan={2} className="py-3 px-3.5 text-center border-r border-gray-200">
                      INTERNAL
                      <span className="block text-[8px] font-normal text-gray-400">of 40</span>
                    </th>
                    <th rowSpan={2} className="py-3 px-3 text-center">
                      LAST CHANGE
                    </th>
                  </tr>

                  {/* Subheaders for IAT-1 and IAT-2 */}
                  <tr className="bg-[#FAF8F5] border-b border-gray-200 text-[9px] font-black uppercase text-gray-500">
                    {/* IAT-1 subheaders */}
                    <th className="py-2 px-2.5 text-center bg-purple-50/30">
                      IAT-1 <span className="block text-[8px] font-normal text-gray-400">of 100</span>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/30">
                      QUIZ <span className="block text-[8px] font-normal text-gray-400">of 10</span>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/30">
                      ACTIVITY <span className="block text-[8px] font-normal text-gray-400">of 10</span>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/30">
                      ASSIGNMENT <span className="block text-[8px] font-normal text-gray-400">of 10</span>
                    </th>
                    <th className="py-2 px-2.5 text-center bg-purple-50/50 font-black text-purple-900 border-r border-purple-200">
                      TOTAL <span className="block text-[8px] font-normal text-purple-600">of 35</span>
                    </th>

                    {/* IAT-2 subheaders */}
                    <th className="py-2 px-2.5 text-center bg-purple-50/30">
                      IAT-2 <span className="block text-[8px] font-normal text-gray-400">of 100</span>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/30">
                      QUIZ <span className="block text-[8px] font-normal text-gray-400">of 10</span>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/30">
                      ACTIVITY <span className="block text-[8px] font-normal text-gray-400">of 10</span>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50/30">
                      ASSIGNMENT <span className="block text-[8px] font-normal text-gray-400">of 10</span>
                    </th>
                    <th className="py-2 px-2.5 text-center bg-purple-50/50 font-black text-purple-900 border-r border-purple-200">
                      TOTAL <span className="block text-[8px] font-normal text-purple-600">of 35</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {rows.map((row) => (
                    <tr key={row.regNo} className="hover:bg-amber-50/30 transition">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-[#0B192C] border-r border-gray-100">
                        {row.regNo}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#0B192C] border-r border-gray-100 whitespace-nowrap">
                        {row.name}
                      </td>

                      {/* IAT-1 Cycle Cells */}
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-gray-900 bg-purple-50/10">
                        {row.iat1Of100}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-extrabold text-[#0B192C] bg-purple-50/30 border-r border-purple-100">
                        {row.total1Of35}
                      </td>

                      {/* IAT-2 Cycle Cells */}
                      <td className="py-2.5 px-2.5 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2 text-center text-gray-400 font-mono bg-purple-50/10">—</td>
                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-gray-400 bg-purple-50/30 border-r border-purple-100">
                        0
                      </td>

                      {/* Attendance */}
                      <td className="py-2.5 px-3 text-center text-gray-400 font-mono border-r border-gray-100">—</td>

                      {/* Internal of 40 */}
                      <td className="py-2.5 px-3.5 text-center border-r border-gray-100">
                        <span className="font-mono font-black text-[#B45309] block">{row.internalOf40}</span>
                        <span className="text-[9px] font-bold text-[#D97706] italic">incomplete</span>
                      </td>

                      {/* Last Change */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setShowHistoryModal(true)}
                          className="p-1 rounded text-gray-400 hover:text-gray-700 transition"
                          title="View change audit"
                        >
                          <Clock size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Formula & Settings Tab */
        <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="font-display font-bold text-lg text-[#0B192C]">
              Autonomous Internal Mark Weightage &amp; Configuration Matrix
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Statutory evaluation formula endorsed by Dean of Academics for 2026-27 Autonomous Batches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-gray-200 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">IAT Cycle Weightage (of 35)</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">IAT Written Examination (Converted from 100):</span>
                  <span className="font-bold text-[#0B192C]">20 Marks (Weight: 0.20)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">Surprise Online Quiz (of 10):</span>
                  <span className="font-bold text-[#0B192C]">5 Marks (Weight: 0.50)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">Class Activity &amp; Seminar (of 10):</span>
                  <span className="font-bold text-[#0B192C]">5 Marks (Weight: 0.50)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">Assignment Problem Sets (of 10):</span>
                  <span className="font-bold text-[#0B192C]">5 Marks (Weight: 0.50)</span>
                </div>
                <div className="flex justify-between pt-2 text-[#B08014] font-black">
                  <span>Total Single Cycle Weight:</span>
                  <span>35 Marks</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-gray-200 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">Attendance Scale (of 5)</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">&ge; 95% Class Attendance:</span>
                  <span className="font-bold text-emerald-700">5 / 5 Marks</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">&ge; 90% and &lt; 95%:</span>
                  <span className="font-bold text-[#0B192C]">4 / 5 Marks</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">&ge; 85% and &lt; 90%:</span>
                  <span className="font-bold text-[#0B192C]">3 / 5 Marks</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-200">
                  <span className="text-gray-600">&ge; 80% and &lt; 85%:</span>
                  <span className="font-bold text-[#0B192C]">2 / 5 Marks</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-600">&ge; 75% and &lt; 80%:</span>
                  <span className="font-bold text-amber-700">1 / 5 Marks</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#D4A72C]" />
                <h3 className="font-display font-bold text-base">Internal Mark Audit Log</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between font-bold text-[#0B192C]">
                  <span>IAT-1 Batch Submission</span>
                  <span className="font-mono text-gray-500">2026-10-18 19:42</span>
                </div>
                <p className="text-gray-600 mt-1">
                  Submitted by Prof. S. Nandhini (Faculty Evaluator) for UC26C01T. 50/50 scripts evaluated.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between font-bold text-[#0B192C]">
                  <span>HOD Department Verification</span>
                  <span className="font-mono text-gray-500">2026-10-18 21:10</span>
                </div>
                <p className="text-gray-600 mt-1">
                  Verified and forwarded to Dean by Dr. Jayapradha (Head of Department).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[#0B192C]">
                <div className="flex justify-between font-bold">
                  <span>Dean Review Console Ready</span>
                  <span className="font-mono text-amber-800">2026-10-19 10:15</span>
                </div>
                <p className="text-gray-700 mt-1">
                  Read-only marksheet locked for provisional audit and gazette preparation.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
