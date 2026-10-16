import React, { useState } from "react";
import {
  Globe,
  PenLine,
  RotateCcw,
  ShieldAlert,
  Clock,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Save,
  Radio,
  Sliders,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { SystemConfig, updateSystemConfig } from "../../utils/systemConfig";

interface PortalGatewaysTabProps {
  systemConfig: SystemConfig;
  onConfigChange: (newConfig: SystemConfig) => void;
}

export const PortalGatewaysTab: React.FC<PortalGatewaysTabProps> = ({
  systemConfig,
  onConfigChange,
}) => {
  const [formData, setFormData] = useState<SystemConfig>(systemConfig);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const updated = updateSystemConfig(formData, "Dr. Sathish (Super Admin)");
    onConfigChange(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleEmergencyLockdown = () => {
    const confirm = window.confirm(
      "CAUTION: Are you sure you want to trigger EMERGENCY UNIVERSITY LOCKDOWN? This will immediately lock all Student & Faculty portals across Engineering, Nursing, and Pharmacy."
    );
    if (!confirm) return;

    const lockedConfig: Partial<SystemConfig> = {
      systemMode: "EMERGENCY_LOCK",
      gateways: {
        ...formData.gateways,
        studentResultPortal: {
          ...formData.gateways.studentResultPortal,
          enabled: false,
          announcement: "EMERGENCY LOCKDOWN: System is temporarily locked by the Controller of Examinations for audit verification.",
        },
        facultyMarkEntry: {
          ...formData.gateways.facultyMarkEntry,
          enabled: false,
          lockNotice: "Mark entry is frozen by University Super Admin.",
        },
        revaluationWindow: {
          ...formData.gateways.revaluationWindow,
          enabled: false,
        },
      },
    };

    const updated = updateSystemConfig(lockedConfig, "Dr. Sathish (Super Admin)");
    setFormData(updated);
    onConfigChange(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Save Button Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#0B192C]">
            Portal Gateways & Master Availability Switches
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure live access for students, faculties, and revaluation across all university faculties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle2 size={15} />
              <span>Broadcast Live!</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs flex items-center gap-2 shadow-md transition"
          >
            <Save size={15} />
            <span>Save & Broadcast Controls</span>
          </button>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Student Result Portal Gateway */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0B192C]">Student Result Portal (Port 3000)</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Public result lookup for Engineering, Nursing & Pharmacy</p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gateways.studentResultPortal.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        studentResultPortal: {
                          ...formData.gateways.studentResultPortal,
                          enabled: e.target.checked,
                        },
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B192C]"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
                  Public Announcement Banner
                </label>
                <textarea
                  rows={2}
                  value={formData.gateways.studentResultPortal.announcement}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        studentResultPortal: {
                          ...formData.gateways.studentResultPortal,
                          announcement: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="Official notice shown to all students..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0B192C]">
                  <input
                    type="checkbox"
                    checked={formData.gateways.studentResultPortal.allowGradeDownload}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gateways: {
                          ...formData.gateways,
                          studentResultPortal: {
                            ...formData.gateways.studentResultPortal,
                            allowGradeDownload: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded text-[#0B192C] focus:ring-0"
                  />
                  <span>Allow Students to Download Official PDF Grade Sheets</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-red-600">
                  <input
                    type="checkbox"
                    checked={formData.gateways.studentResultPortal.withholdResults}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gateways: {
                          ...formData.gateways,
                          studentResultPortal: {
                            ...formData.gateways.studentResultPortal,
                            withholdResults: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded text-red-600 focus:ring-0"
                  />
                  <span>Emergency Withhold Results (Mask grade point from public query)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Status:</span>
            <span
              className={`font-extrabold px-2 py-0.5 rounded-full ${
                formData.gateways.studentResultPortal.enabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {formData.gateways.studentResultPortal.enabled ? "PORTAL LIVE" : "MAINTENANCE MODE"}
            </span>
          </div>
        </div>

        {/* 2. Faculty Evaluation & Mark Entry Gateway */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <PenLine size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0B192C]">Faculty Evaluation Portal</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Internal & End-Sem marks evaluation by college faculty</p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gateways.facultyMarkEntry.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        facultyMarkEntry: {
                          ...formData.gateways.facultyMarkEntry,
                          enabled: e.target.checked,
                        },
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B192C]"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
                  Submission Deadline (Auto-Lock Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={formData.gateways.facultyMarkEntry.submissionDeadline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        facultyMarkEntry: {
                          ...formData.gateways.facultyMarkEntry,
                          submissionDeadline: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
                  Lock Notice Shown to Evaluators
                </label>
                <input
                  type="text"
                  value={formData.gateways.facultyMarkEntry.lockNotice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        facultyMarkEntry: {
                          ...formData.gateways.facultyMarkEntry,
                          lockNotice: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0B192C]">
                  <input
                    type="checkbox"
                    checked={formData.gateways.facultyMarkEntry.allowInternalMarkEdit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gateways: {
                          ...formData.gateways,
                          facultyMarkEntry: {
                            ...formData.gateways.facultyMarkEntry,
                            allowInternalMarkEdit: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded text-[#0B192C] focus:ring-0"
                  />
                  <span>Allow IA Mark Edits</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0B192C]">
                  <input
                    type="checkbox"
                    checked={formData.gateways.facultyMarkEntry.allowExternalMarkEdit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gateways: {
                          ...formData.gateways,
                          facultyMarkEntry: {
                            ...formData.gateways.facultyMarkEntry,
                            allowExternalMarkEdit: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded text-[#0B192C] focus:ring-0"
                  />
                  <span>Allow External Marks</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Evaluation State:</span>
            <span
              className={`font-extrabold px-2 py-0.5 rounded-full ${
                formData.gateways.facultyMarkEntry.enabled
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {formData.gateways.facultyMarkEntry.enabled ? "SUBMISSIONS OPEN" : "EVALUATION FROZEN"}
            </span>
          </div>
        </div>

        {/* 3. Revaluation & Grievance Gateway */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#0B192C]">Student Revaluation Window</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Re-evaluation and answer script photocopy requests</p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gateways.revaluationWindow.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        revaluationWindow: {
                          ...formData.gateways.revaluationWindow,
                          enabled: e.target.checked,
                        },
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B192C]"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
                  Revaluation Application Deadline
                </label>
                <input
                  type="datetime-local"
                  value={formData.gateways.revaluationWindow.deadline}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gateways: {
                        ...formData.gateways,
                        revaluationWindow: {
                          ...formData.gateways.revaluationWindow,
                          deadline: e.target.value,
                        },
                      },
                    })
                  }
                  className="w-full p-2.5 rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">
                  Prescribed Fee Per Course (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    value={formData.gateways.revaluationWindow.feePerCourse}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gateways: {
                          ...formData.gateways,
                          revaluationWindow: {
                            ...formData.gateways.revaluationWindow,
                            feePerCourse: parseInt(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    className="w-full pl-8 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Window Status:</span>
            <span
              className={`font-extrabold px-2 py-0.5 rounded-full ${
                formData.gateways.revaluationWindow.enabled
                  ? "bg-purple-100 text-purple-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {formData.gateways.revaluationWindow.enabled ? "APPLICATIONS ACCEPTED" : "WINDOW CLOSED"}
            </span>
          </div>
        </div>

        {/* 4. Emergency Central University Lockdown */}
        <div className="bg-red-50/70 rounded-3xl border-2 border-red-200 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-3 border-b border-red-200 pb-4 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-red-950">Emergency Kill Switch (Master Lockdown)</h3>
                <p className="text-[10px] text-red-700 font-medium">Instantly suspend all student & faculty operations</p>
              </div>
            </div>

            <p className="text-xs text-red-900 leading-relaxed font-normal">
              In case of data discrepancies, exam paper leaks, or server audit requirements, Dr. Sathish can engage the emergency kill switch.
              This will freeze all mark uploads, withhold result query displays, and close all revaluation applications across all 3 colleges.
            </p>
          </div>

          <button
            type="button"
            onClick={handleEmergencyLockdown}
            className="w-full mt-6 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98]"
          >
            <ShieldAlert size={16} />
            <span>Engage Emergency University Lockdown</span>
          </button>
        </div>
      </div>
    </div>
  );
};
