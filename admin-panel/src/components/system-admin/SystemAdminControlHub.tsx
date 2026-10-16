import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Globe,
  Users,
  BookOpen,
  HardDrive,
  ClipboardList,
  Crown,
  Sparkles,
  Sliders,
  Download,
  AlertTriangle,
  RefreshCw,
  Layers,
  Lock,
} from "lucide-react";
import { SystemAdminTab } from "./types";
import { MultiCollegeOverviewTab } from "./MultiCollegeOverviewTab";
import { PortalGatewaysTab } from "./PortalGatewaysTab";
import { UserProvisioningTab } from "./UserProvisioningTab";
import { AcademicRegulationTab } from "./AcademicRegulationTab";
import { StorageMaintenanceTab } from "./StorageMaintenanceTab";
import { SecurityAuditTab } from "./SecurityAuditTab";
import { getSystemConfig, SystemConfig, updateSystemConfig } from "../../utils/systemConfig";
import { SUPER_ADMIN_CONFIG, getActiveCollege, getActiveCollegeKey } from "../../utils/rbac";

export const SystemAdminControlHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SystemAdminTab>("overview");
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig());
  const activeCollege = getActiveCollege();

  useEffect(() => {
    const handleUpdate = () => {
      setSystemConfig(getSystemConfig());
    };
    window.addEventListener("kvell_system_config_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleConfigChange = (newConfig: SystemConfig) => {
    setSystemConfig(newConfig);
  };

  const tabs = [
    { id: "overview", label: "Multi-College Governance", icon: Building2 },
    { id: "gateways", label: "Portal Gateways & Locks", icon: Globe },
    { id: "users", label: "Officer & COE Provisioning", icon: Users },
    { id: "regulations", label: "Regulations & Grading", icon: BookOpen },
    { id: "storage", label: "Universal Backup & Storage", icon: HardDrive },
    { id: "audit", label: "Security & Audit Trail", icon: ClipboardList },
  ];

  const isEmergencyLock = systemConfig.systemMode === "EMERGENCY_LOCK";

  return (
    <div className="space-y-6">
      {/* Super Admin Top Executive Banner */}
      <div className="bg-[#0B192C] text-white p-6 sm:p-8 rounded-[2.5rem] border-2 border-[#D4A72C]/40 shadow-2xl relative overflow-hidden">
        {/* Ambient Golden Glow Rings */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-96 h-96 bg-[#D4A72C]/15 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white p-1.5 border-2 border-[#D4A72C] flex items-center justify-center shrink-0 shadow-xl relative">
              <img
                src="/kvell-logo.png"
                alt="University Seal"
                className="w-full h-full object-contain"
              />
              <span className="absolute -bottom-2 -right-2 bg-[#D4A72C] text-[#0B192C] p-1.5 rounded-xl shadow-md border border-white">
                <Crown size={14} className="fill-current" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-[#D4A72C] text-[#0B192C] font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                  SUPREME UNIVERSITY AUTHORITY
                </span>
                <span className="bg-white/10 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  USER: {SUPER_ADMIN_CONFIG.username}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    isEmergencyLock
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isEmergencyLock ? "bg-white" : "bg-emerald-400"}`} />
                  {isEmergencyLock ? "EMERGENCY LOCKDOWN ENGAGED" : "ALL SYSTEMS OPERATIONAL"}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{SUPER_ADMIN_CONFIG.name}</span>
                <span className="text-xs font-bold text-[#D4A72C] uppercase tracking-widest hidden sm:inline-block">
                  • Overall University COE & Super Administrator
                </span>
              </h1>

              <p className="text-xs text-slate-300 mt-1 max-w-2xl font-normal leading-relaxed">
                Centralized executive command hub. All constituent colleges (Engineering & Technology, Nursing Sciences, and Pharmaceutical Sciences)
                are managed from this unified control console.
              </p>
            </div>
          </div>

          {/* Current Inspection Status Pill */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 shrink-0">
            <div>
              <span className="block text-[10px] font-extrabold uppercase text-[#D4A72C] tracking-wider">
                ACTIVE COE INSPECTION CONTEXT
              </span>
              <span className="block text-sm font-black text-white">
                {activeCollege.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Code: {activeCollege.code} • Scoped Storage Active
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-[#D4A72C] shrink-0">
              <img src={activeCollege.logoUrl} alt={activeCollege.name} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SystemAdminTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-150 whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-[#0B192C] text-[#D4A72C] shadow-md"
                  : "text-slate-600 hover:text-[#0B192C] hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Component Render */}
      <div className="transition-all duration-200">
        {activeTab === "overview" && (
          <MultiCollegeOverviewTab
            systemConfig={systemConfig}
            onConfigChange={handleConfigChange}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "gateways" && (
          <PortalGatewaysTab
            systemConfig={systemConfig}
            onConfigChange={handleConfigChange}
          />
        )}

        {activeTab === "users" && <UserProvisioningTab />}

        {activeTab === "regulations" && (
          <AcademicRegulationTab
            systemConfig={systemConfig}
            onConfigChange={handleConfigChange}
          />
        )}

        {activeTab === "storage" && <StorageMaintenanceTab />}

        {activeTab === "audit" && <SecurityAuditTab />}
      </div>
    </div>
  );
};
