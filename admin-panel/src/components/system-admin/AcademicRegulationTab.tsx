import React, { useState } from "react";
import {
  BookOpen,
  Award,
  Sliders,
  CheckCircle2,
  Save,
  HelpCircle,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { SystemConfig, updateSystemConfig } from "../../utils/systemConfig";

interface AcademicRegulationTabProps {
  systemConfig: SystemConfig;
  onConfigChange: (newConfig: SystemConfig) => void;
}

export const AcademicRegulationTab: React.FC<AcademicRegulationTabProps> = ({
  systemConfig,
  onConfigChange,
}) => {
  // Read-only for now: the server grades every college the same way (pass at 40 of 100, no grace marks) until the
  // college confirms its pass rules. The server ignores any regulation changes, so this tab only shows them.
  const [formData, setFormData] = useState<SystemConfig>(systemConfig);
  void onConfigChange;
  void updateSystemConfig;

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#0B192C]">
            Master Academic Regulations & Grading Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure statutory grading scales, pass criteria (Anna Univ / INC / PCI), and university moderation policies.
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold">
          Read only
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
        <strong>Grading in use:</strong> {formData.gradingRegulations.engineering.scaleDescription || "Pass at 40 of 100."}{" "}
        It applies to every college. These rules can be made editable once the college confirms its pass criteria
        (for example 40 or 50, and any Part A / Part B + C minimums); until then the result server keeps grading this way.
      </div>

      <fieldset disabled className="contents">

      {/* 3 Statutory Regulation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Engineering College */}
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
                ⚙️
              </span>
              <div>
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">Faculty of Engineering</span>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Anna University CBCS</h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  Active Regulation
                </label>
                <input
                  type="text"
                  value={formData.gradingRegulations.engineering.regulation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gradingRegulations: {
                        ...formData.gradingRegulations,
                        engineering: {
                          ...formData.gradingRegulations.engineering,
                          regulation: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min Internal</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.engineering.passMinInternal}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min External</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.engineering.passMinExternal}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min Total</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.engineering.passMinTotal}%</span>
                </div>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 text-[11px] text-amber-900">
                <span className="font-bold block mb-1">Grading Scale (10-Point):</span>
                <span>O (10), A+ (9), A (8), B+ (7), B (6), C (5), U (0 - Re-appear)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
            <span>UGC / AICTE Aligned</span>
            <span className="text-emerald-700 font-bold">✓ Active Schema</span>
          </div>
        </div>

        {/* 2. Nursing College */}
        <div className="bg-white rounded-3xl border border-sky-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-lg">
                🏥
              </span>
              <div>
                <span className="text-[10px] font-extrabold text-sky-700 uppercase tracking-wider block">Faculty of Nursing</span>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Indian Nursing Council (INC)</h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  Active Regulation
                </label>
                <input
                  type="text"
                  value={formData.gradingRegulations.nursing.regulation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gradingRegulations: {
                        ...formData.gradingRegulations,
                        nursing: {
                          ...formData.gradingRegulations.nursing,
                          regulation: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min Internal</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.nursing.passMinInternal}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min External</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.nursing.passMinExternal}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min Total</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.nursing.passMinTotal}%</span>
                </div>
              </div>

              <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100 text-[11px] text-sky-900">
                <span className="font-bold block mb-1">Statutory INC Bands:</span>
                <span>Distinction (≥75%), First (60-74%), Pass (50-59%), Fail (&lt;50%)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
            <span>INC Statutory Council</span>
            <span className="text-emerald-700 font-bold">✓ Active Schema</span>
          </div>
        </div>

        {/* 3. Pharmacy College */}
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                💊
              </span>
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">Faculty of Pharmacy</span>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Pharmacy Council of India (PCI)</h3>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  Active Regulation
                </label>
                <input
                  type="text"
                  value={formData.gradingRegulations.pharmacy.regulation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gradingRegulations: {
                        ...formData.gradingRegulations,
                        pharmacy: {
                          ...formData.gradingRegulations.pharmacy,
                          regulation: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min Internal</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.pharmacy.passMinInternal}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min External</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.pharmacy.passMinExternal}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Min Total</span>
                  <span className="text-xs font-black text-[#0B192C]">{formData.gradingRegulations.pharmacy.passMinTotal}%</span>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-[11px] text-emerald-900">
                <span className="font-bold block mb-1">10-Point PCI Credit System:</span>
                <span>O (10), A (9), B (8), C (7), D (6), F (0 - Fail)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium flex items-center justify-between">
            <span>PCI Statutory Council</span>
            <span className="text-emerald-700 font-bold">✓ Active Schema</span>
          </div>
        </div>
      </div>

      {/* University Moderation & Grace Marks Configuration */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4A72C] flex items-center justify-center font-bold">
            <Sliders size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#0B192C]">University Moderation & Grace Mark Rules</h3>
            <p className="text-[10px] text-slate-500 font-medium">Rules applied during examination board finalization before publication</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
              Max Moderation Grace Marks Per Candidate
            </label>
            <input
              type="number"
              min={0}
              max={15}
              value={formData.gradingRegulations.moderation.maxGraceMarks}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gradingRegulations: {
                    ...formData.gradingRegulations,
                    moderation: {
                      ...formData.gradingRegulations.moderation,
                      maxGraceMarks: parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B192C]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Maximum marks that can be awarded to bridge a failing grade.</span>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
              Minimum Attendance Condonation Limit (%)
            </label>
            <input
              type="number"
              min={50}
              max={90}
              value={formData.gradingRegulations.moderation.attendanceThreshold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gradingRegulations: {
                    ...formData.gradingRegulations,
                    moderation: {
                      ...formData.gradingRegulations.moderation,
                      attendanceThreshold: parseInt(e.target.value) || 75,
                    },
                  },
                })
              }
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#0B192C]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Candidates below this percentage require Vice-Chancellor approval.</span>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-[#0B192C]">
              <input
                type="checkbox"
                checked={formData.gradingRegulations.moderation.enableCondonation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gradingRegulations: {
                      ...formData.gradingRegulations,
                      moderation: {
                        ...formData.gradingRegulations.moderation,
                        enableCondonation: e.target.checked,
                      },
                    },
                  })
                }
                className="rounded text-[#0B192C] focus:ring-0"
              />
              <span>Enable Medical Condonation Exemption</span>
            </label>
            <span className="text-[10px] text-slate-400 mt-1 block">Allows 10% attendance relaxation with certified medical board verification.</span>
          </div>
        </div>
      </div>
      </fieldset>
    </div>
  );
};
