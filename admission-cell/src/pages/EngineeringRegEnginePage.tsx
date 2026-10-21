import React, { useState } from "react";
import {
  Binary,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import {
  ENGINEERING_UG_BRANCHES,
  ENGINEERING_PG_BRANCHES,
  buildEngineeringRegNo,
  parseEngineeringRegNo,
  ENGINEERING_COLLEGE_CODE,
} from "../utils/engineeringRegGen";
import { useNextEngineeringRoll } from "../services/admissionStorage";

export const EngineeringRegEnginePage: React.FC = () => {
  // Playground state
  const [degreeCode, setDegreeCode] = useState<"1" | "2">("1");
  const [selectedBranch, setSelectedBranch] = useState("02");
  const [admissionYear, setAdmissionYear] = useState(2026);
  const [universityYear, setUniversityYear] = useState(2026);
  const [customRoll, setCustomRoll] = useState<number | "auto">("auto");
  const [copied, setCopied] = useState(false);

  // Inspector state
  const [inspectInput, setInspectInput] = useState("");

  const branches = degreeCode === "1" ? ENGINEERING_UG_BRANCHES : ENGINEERING_PG_BRANCHES;
  const currentBranchObj = branches.find((b) => b.code === selectedBranch) || branches[0];

  const nextAutoRoll = useNextEngineeringRoll(
    selectedBranch,
    degreeCode,
    admissionYear
  );

  const rollToUse = customRoll === "auto" ? nextAutoRoll : customRoll;

  const generatedRegNo = buildEngineeringRegNo({
    universityYear,
    degreeCode,
    programmeCode: selectedBranch,
    admissionYear,
    rollNumber: rollToUse,
  });

  const inspectedResult = parseEngineeringRegNo(inspectInput);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedRegNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B192C] via-[#132943] to-[#0B192C] text-white border border-amber-400/50 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#D4A72C] text-[#0B192C]">
                ENGINEERING ONLY • KVELL-KVCET SPEC
              </span>
              <span className="text-xs font-mono text-amber-300">College Code: 01</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-cinzel font-bold text-white">
              Official 14-Digit Registration Number Engine
            </h1>
            <p className="text-xs text-white/75 mt-1 max-w-2xl leading-relaxed">
              Derived directly from Karpaga Vinayaga College of Engineering and Technology academic guidelines. Configured exclusively for Engineering departments.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center">
            <span className="text-[10px] text-amber-300 font-bold uppercase block">Status</span>
            <span className="text-xs font-bold text-white flex items-center gap-1.5 justify-center mt-0.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              Engine Ready (Zero Pre-added)
            </span>
          </div>
        </div>
      </div>

      {/* 14-Digit Formula Breakdown Card */}
      <div className="p-6 rounded-3xl bg-white border border-amber-300 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Binary size={20} className="text-[#0B192C]" />
            <h2 className="font-bold text-sm text-[#0B192C] uppercase tracking-wide">
              Official 14-Digit Structural Decomposition
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
            Total Length: 14 Digits
          </span>
        </div>

        {/* Visual Blocks Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 text-center">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Univ Year</span>
            <span className="text-base font-mono font-black text-gray-900 block mt-1">2 0 2 6</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">4 Digits</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">KVCET Code</span>
            <span className="text-base font-mono font-black text-amber-900 block mt-1">0 1</span>
            <span className="text-[9px] text-amber-700 block mt-0.5">2 Digits</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 border border-sky-300">
            <span className="text-[10px] font-bold text-sky-800 uppercase block">Degree</span>
            <span className="text-base font-mono font-black text-sky-900 block mt-1">1 (UG)</span>
            <span className="text-[9px] text-sky-700 block mt-0.5">1 Digit</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-300">
            <span className="text-[10px] font-bold text-purple-800 uppercase block">Programme</span>
            <span className="text-base font-mono font-black text-purple-900 block mt-1">0 2 (AI&DS)</span>
            <span className="text-[9px] text-purple-700 block mt-0.5">2 Digits</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Adm. Year</span>
            <span className="text-base font-mono font-black text-emerald-900 block mt-1">2 6</span>
            <span className="text-[9px] text-emerald-700 block mt-0.5">2 Digits</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-300">
            <span className="text-[10px] font-bold text-rose-800 uppercase block">Roll Number</span>
            <span className="text-base font-mono font-black text-rose-900 block mt-1">0 0 1</span>
            <span className="text-[9px] text-rose-700 block mt-0.5">3 Digits</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono text-center text-gray-800 font-bold">
          Example from Official Specification Sheet: <span className="text-amber-800">20260110226001</span> (Artificial Intelligence & Data Science, Roll #001)
        </div>
      </div>

      {/* Interactive Playground & Generator Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generator Controls */}
        <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#D4A72C]" />
            <h3 className="font-bold text-sm text-[#0B192C]">
              Interactive Registration Playground
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Degree Level</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDegreeCode("1");
                    setSelectedBranch("02");
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    degreeCode === "1"
                      ? "bg-[#0B192C] text-white border-[#0B192C]"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Undergraduate (UG) • Code 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDegreeCode("2");
                    setSelectedBranch("01");
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    degreeCode === "2"
                      ? "bg-[#0B192C] text-white border-[#0B192C]"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Postgraduate (PG) • Code 2
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Engineering Programme / Department
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-[#D4A72C]"
              >
                <option value="">-- Choose Engineering Department --</option>
                {branches.map((b) => (
                  <option key={b.code} value={b.code}>
                    Branch Code {b.code} • {b.name} ({b.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Admission Year</label>
                <input
                  type="number"
                  value={admissionYear}
                  onChange={(e) => setAdmissionYear(Number(e.target.value))}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sequential Roll</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={rollToUse}
                    onChange={(e) => setCustomRoll(Number(e.target.value))}
                    className="w-full text-xs font-bold text-center px-2 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomRoll("auto")}
                    className="px-2 py-1 text-[10px] font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
                    title="Auto-calculate next roll from database"
                  >
                    Auto
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Generated Result Box */}
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
              Resulting 14-Digit Registration Number
            </span>
            <div className="text-xl sm:text-2xl font-mono font-black text-[#0B192C] tracking-widest my-2 select-all">
              {generatedRegNo}
            </div>

            <button
              onClick={handleCopy}
              className="px-4 py-1.5 rounded-xl bg-[#0B192C] text-[#D4A72C] text-xs font-bold hover:bg-[#132943] transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Number"}</span>
            </button>
          </div>
        </div>

        {/* Reverse Inspector */}
        <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={18} className="text-sky-600" />
              <h3 className="font-bold text-sm text-[#0B192C]">
                Reverse Registration Number Inspector
              </h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Paste or type any 14-digit registration number to verify and deconstruct its exact fields according to the regulation.
            </p>

            <input
              type="text"
              maxLength={14}
              value={inspectInput}
              onChange={(e) => setInspectInput(e.target.value.trim())}
              placeholder="e.g. 20260110226001"
              className="w-full text-base font-mono font-bold tracking-widest px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none bg-gray-50 text-gray-900"
            />

            {inspectInput.trim().length === 0 ? (
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500">
                Type or paste a 14-digit registration number above to inspect and verify its structure.
              </div>
            ) : inspectedResult ? (
              <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="font-bold text-gray-700">Verification:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Valid KVCET Spec
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Institution:</span>
                  <span className="font-bold text-gray-900">{inspectedResult.collegeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Degree Level:</span>
                  <span className="font-bold text-gray-900">{inspectedResult.degreeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Programme:</span>
                  <span className="font-bold text-amber-900">{inspectedResult.programmeName} (Code: {inspectedResult.programmeCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Admission Year:</span>
                  <span className="font-bold text-gray-900">{inspectedResult.yearOfAdmission}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sequential Roll Number:</span>
                  <span className="font-mono font-bold text-gray-900">#{inspectedResult.rollNumber}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>Enter a valid 14-digit KVCET registration number (Starts with University Year + 01).</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 font-medium">
            💡 <strong>Note on Registration Creation:</strong> Registration numbers will only be added to students when you decide. The generator is kept completely ready for you.
          </div>
        </div>
      </div>

      {/* Official Master Tables Reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UG Branch Table */}
        <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-xs uppercase text-gray-700 tracking-wider">
              UG Engineering Branches (Degree Code: 1)
            </h3>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
              10 Departments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase border-b">
                  <th className="py-2 text-left">Branch Name</th>
                  <th className="py-2 text-right">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ENGINEERING_UG_BRANCHES.map((b) => (
                  <tr key={b.code} className="hover:bg-amber-50/40">
                    <td className="py-2 font-medium text-gray-800">{b.name}</td>
                    <td className="py-2 text-right font-mono font-bold text-[#0B192C]">{b.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PG Branch Table */}
        <div className="p-6 rounded-3xl bg-white border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-xs uppercase text-gray-700 tracking-wider">
              PG Engineering Branches (Degree Code: 2)
            </h3>
            <span className="text-[10px] font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded">
              7 Programmes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase border-b">
                  <th className="py-2 text-left">Programme Name</th>
                  <th className="py-2 text-right">Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ENGINEERING_PG_BRANCHES.map((b) => (
                  <tr key={b.code} className="hover:bg-sky-50/40">
                    <td className="py-2 font-medium text-gray-800">{b.name}</td>
                    <td className="py-2 text-right font-mono font-bold text-[#0B192C]">{b.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
