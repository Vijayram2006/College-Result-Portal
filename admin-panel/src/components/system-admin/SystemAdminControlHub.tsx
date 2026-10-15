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
      {/* Shown only while the whole university is in emergency lock */}
      {isEmergencyLock && (
        <div className="p-3 rounded-2xl bg-red-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={14} /> Emergency lockdown engaged
        </div>
      )}

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
