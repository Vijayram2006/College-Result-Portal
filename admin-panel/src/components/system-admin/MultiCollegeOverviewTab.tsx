import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  GraduationCap,
  Layers,
  FileCheck2,
  Lock,
  Unlock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { COLLEGES, CollegeKey, setSuperAdminCollegeView, getActiveCollegeKey } from "../../utils/rbac";
import { updateSystemConfig, SystemConfig } from "../../utils/systemConfig";
import { superAdminApi, apiErrorMessage, CollegeOverview } from "../../services/api";
import { CollegeDetailWindow } from "./CollegeDetailWindow";

interface MultiCollegeOverviewTabProps {
  systemConfig: SystemConfig;
  onConfigChange: (newConfig: SystemConfig) => void;
  onNavigateToTab: (tab: any) => void;
}

export const MultiCollegeOverviewTab: React.FC<MultiCollegeOverviewTabProps> = ({
  systemConfig,
  onConfigChange,
  onNavigateToTab,
}) => {
  const [activeViewCollege, setActiveViewCollege] = useState<CollegeKey>(getActiveCollegeKey());
  const empty = { depts: 0, students: 0, batches: 0, results: 0 };
  const [stats, setStats] = useState<Record<CollegeKey, { depts: number; students: number; batches: number; results: number }>>({
    engineering: empty,
    nursing: empty,
    pharmacy: empty,
  });
  const [statsError, setStatsError] = useState<string | null>(null);
  const [overviews, setOverviews] = useState<Partial<Record<CollegeKey, CollegeOverview>>>({});
  const [openCollege, setOpenCollege] = useState<CollegeKey | null>(null);

  // Live figures for every college from the result server
  const loadCollegeStats = () => {
    superAdminApi
      .overview()
      .then((colleges) => {
        const next = { engineering: empty, nursing: empty, pharmacy: empty } as Record<CollegeKey, typeof empty>;
        const full: Partial<Record<CollegeKey, CollegeOverview>> = {};
        colleges.forEach((c) => {
          full[c.key] = c;
          next[c.key] = { depts: c.departments, students: c.students, batches: c.publishedBatches, results: c.publishedRecords };
        });
        setStats(next);
        setOverviews(full);
        setStatsError(null);
      })
      .catch((err) => setStatsError(apiErrorMessage(err, "Could not load the college figures.")));
  };

  useEffect(() => {
    loadCollegeStats();
    const timer = window.setInterval(loadCollegeStats, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleInspect = (collegeKey: CollegeKey) => {
    setSuperAdminCollegeView(collegeKey);
    setActiveViewCollege(collegeKey);
  };

  const handleToggleCollegeLock = (collegeKey: CollegeKey) => {
    const current = systemConfig.institutionalLocks[collegeKey]?.locked || false;
    const updated = updateSystemConfig({
      institutionalLocks: {
        ...systemConfig.institutionalLocks,
        [collegeKey]: {
          ...systemConfig.institutionalLocks[collegeKey],
          locked: !current,
        },
      },
    });
    onConfigChange(updated);
  };

  const totalUniversityStudents = stats.engineering.students + stats.nursing.students + stats.pharmacy.students;
  const totalUniversityDepts = stats.engineering.depts + stats.nursing.depts + stats.pharmacy.depts;
  const totalUniversityResults = stats.engineering.results + stats.nursing.results + stats.pharmacy.results;

  return (
    <div className="space-y-6">
      {statsError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold">{statsError}</div>
      )}
      {/* Universal Overview Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#152744] to-[#0B192C] text-white p-6 rounded-3xl border border-[#D4A72C]/30 shadow-xl relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 w-80 h-80 bg-[#D4A72C]/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#D4A72C] text-[#0B192C] font-extrabold text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider">
                Multi-Institution Central Authority
              </span>
              <span className="text-slate-300 text-xs font-semibold">
                Session: {systemConfig.academicSession.academicYear} ({systemConfig.academicSession.semesterTerm})
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              University Aggregate Governance
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
              Dr. Sathish holds supreme executive control across all three Karpaga Vinayaga constituent colleges.
              Switching viewing context updates all COE modules in real time while maintaining Super Admin credentials.
            </p>
          </div>

          {/* Aggregate Counters */}
          <div className="grid grid-cols-3 gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-3">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Total Students</span>
              <span className="text-xl font-black text-[#D4A72C]">{totalUniversityStudents}</span>
            </div>
            <div className="text-center px-3 border-x border-white/10">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Depts Managed</span>
              <span className="text-xl font-black text-white">{totalUniversityDepts}</span>
            </div>
            <div className="text-center px-3">
              <span className="block text-[10px] font-bold uppercase text-slate-400">Published</span>
              <span className="text-xl font-black text-emerald-400">{totalUniversityResults}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Constituent Colleges Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(Object.keys(COLLEGES) as CollegeKey[]).map((key) => {
          const col = COLLEGES[key];
          const st = stats[key];
          const isLocked = systemConfig.institutionalLocks[key]?.locked;
          const isCurrentView = activeViewCollege === key;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              title={`Open ${col.shortName} College details`}
              onClick={() => setOpenCollege(key)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setOpenCollege(key);
                }
              }}
              className={`rounded-3xl border transition-all duration-200 bg-white shadow-md flex flex-col justify-between overflow-hidden relative cursor-pointer hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B192C] ${
                isCurrentView
                  ? "border-[#D4A72C] ring-2 ring-[#D4A72C]/40"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Top Card Header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={col.logoUrl}
                      alt={col.name}
                      className="w-12 h-12 rounded-2xl object-contain bg-slate-50 p-1 border border-slate-200 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${col.badgeBg} ${col.badgeText}`}>
                          {col.code}
                        </span>
                        {isCurrentView && (
                          <span className="text-[10px] bg-[#D4A72C] text-[#0B192C] font-black px-2 py-0.5 rounded-full">
                            Active Inspection
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-[#0B192C] mt-1 line-clamp-1" title={col.name}>
                        {col.shortName} College
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{col.coeTitle}</p>
                    </div>
                  </div>
                </div>

                {/* College Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div className="bg-[#F8F5EE] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Departments</span>
                    <span className="text-base font-extrabold text-[#0B192C]">{st.depts} Active</span>
                  </div>
                  <div className="bg-[#F8F5EE] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Registered Students</span>
                    <span className="text-base font-extrabold text-[#0B192C]">{st.students}</span>
                  </div>
                  <div className="bg-[#F8F5EE] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Batch Catalogs</span>
                    <span className="text-base font-extrabold text-[#0B192C]">{st.batches} Batches</span>
                  </div>
                  <div className="bg-[#F8F5EE] p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Published Results</span>
                    <span className="text-base font-extrabold text-[#0B192C]">{st.results} Records</span>
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-bold text-[#B08014] flex items-center gap-1">
                  <ExternalLink size={12} /> Click to open departments & full details
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div
                className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleToggleCollegeLock(key)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isLocked
                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  }`}
                  title={isLocked ? "Unlock mark entries & uploads" : "Emergency freeze mark entries"}
                >
                  {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                  <span>{isLocked ? "Frozen" : "Operational"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInspect(key)}
                  className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                    isCurrentView
                      ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span>{isCurrentView ? "Currently Inspected" : `Inspect ${col.shortName}`}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {openCollege && (
        <CollegeDetailWindow
          college={openCollege}
          overview={overviews[openCollege]}
          onClose={() => setOpenCollege(null)}
        />
      )}

      {/* Quick Action Navigation Strip */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-[#0B192C]">Rapid Access to Master Controls</h4>
          <p className="text-xs text-slate-500">Configure public gateways, manage officer accounts, or trigger full backups</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigateToTab("gateways")}
            className="px-4 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#eae6db] text-[#0B192C] text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
          >
            <span>🚦 Portal Gateways</span>
          </button>
          <button
            onClick={() => onNavigateToTab("users")}
            className="px-4 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#eae6db] text-[#0B192C] text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
          >
            <span>👥 Officer Accounts</span>
          </button>
          <button
            onClick={() => onNavigateToTab("storage")}
            className="px-4 py-2 rounded-xl bg-[#F8F5EE] hover:bg-[#eae6db] text-[#0B192C] text-xs font-bold border border-slate-200 transition flex items-center gap-1.5"
          >
            <span>💾 Universal Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
