import { getRealLocalTimestamp } from "./dateUtils";
import { CollegeKey } from "./rbac";

export interface StudentGatewayConfig {
  enabled: boolean;
  announcement: string;
  allowGradeDownload: boolean;
  withholdResults: boolean;
}

export interface FacultyGatewayConfig {
  enabled: boolean;
  submissionDeadline: string;
  lockNotice: string;
  allowInternalMarkEdit: boolean;
  allowExternalMarkEdit: boolean;
}

export interface RevaluationGatewayConfig {
  enabled: boolean;
  deadline: string;
  feePerCourse: number;
}

export interface CollegeLockConfig {
  locked: boolean;
  resultsLive: boolean;
  freezeSubmissions: boolean;
}

export interface GradingRegulationConfig {
  regulation: string;
  passMinInternal: number;
  passMinExternal: number;
  passMinTotal: number;
  scaleDescription: string;
}

export interface SystemConfig {
  systemMode: "OPERATIONAL" | "MAINTENANCE" | "EMERGENCY_LOCK";
  lastUpdated: string;
  updatedBy: string;
  academicSession: {
    academicYear: string;
    semesterTerm: "ODD" | "EVEN";
    sessionStatus: "ACTIVE" | "RESULTS_PROCESSING" | "EXAM_PERIOD" | "CONCLUDED";
  };
  gateways: {
    studentResultPortal: StudentGatewayConfig;
    facultyMarkEntry: FacultyGatewayConfig;
    revaluationWindow: RevaluationGatewayConfig;
  };
  institutionalLocks: Record<CollegeKey, CollegeLockConfig>;
  gradingRegulations: {
    engineering: GradingRegulationConfig;
    nursing: GradingRegulationConfig;
    pharmacy: GradingRegulationConfig;
    moderation: {
      maxGraceMarks: number;
      enableCondonation: boolean;
      attendanceThreshold: number;
    };
  };
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  systemMode: "OPERATIONAL",
  lastUpdated: new Date().toISOString(),
  updatedBy: "Dr. Sathish (Overall University COE & Super Admin)",
  academicSession: {
    academicYear: "2025 - 2026",
    semesterTerm: "EVEN",
    sessionStatus: "ACTIVE",
  },
  gateways: {
    studentResultPortal: {
      enabled: true,
      announcement: "Official End-Semester Examination Results are published. Revaluation window is open.",
      allowGradeDownload: true,
      withholdResults: false,
    },
    facultyMarkEntry: {
      enabled: true,
      submissionDeadline: "2026-11-30T23:59:59",
      lockNotice: "Mark submission window is open for current semester evaluation.",
      allowInternalMarkEdit: true,
      allowExternalMarkEdit: true,
    },
    revaluationWindow: {
      enabled: true,
      deadline: "2026-11-15T17:00:00",
      feePerCourse: 400,
    },
  },
  institutionalLocks: {
    engineering: {
      locked: false,
      resultsLive: true,
      freezeSubmissions: false,
    },
    nursing: {
      locked: false,
      resultsLive: true,
      freezeSubmissions: false,
    },
    pharmacy: {
      locked: false,
      resultsLive: true,
      freezeSubmissions: false,
    },
  },
  gradingRegulations: {
    engineering: {
      regulation: "Anna University R2021 CBCS",
      passMinInternal: 45,
      passMinExternal: 45,
      passMinTotal: 50,
      scaleDescription: "10-Point Relative Grading (O: 10, A+: 9, A: 8, B+: 7, B: 6, C: 5, U: 0)",
    },
    nursing: {
      regulation: "INC (Indian Nursing Council) 2020",
      passMinInternal: 50,
      passMinExternal: 50,
      passMinTotal: 50,
      scaleDescription: "INC Percentage Bands (Distinction: >=75%, First: 60-74%, Pass: 50-59%, Fail: <50%)",
    },
    pharmacy: {
      regulation: "PCI (Pharmacy Council of India) 2014",
      passMinInternal: 50,
      passMinExternal: 50,
      passMinTotal: 50,
      scaleDescription: "10-Point PCI CBCS System (O: 10, A: 9, B: 8, C: 7, D: 6, F: 0)",
    },
    moderation: {
      maxGraceMarks: 5,
      enableCondonation: true,
      attendanceThreshold: 75,
    },
  },
};

const SYSTEM_CONFIG_KEY = "kvell_system_config";

/**
 * Retrieves the universal system configuration from localStorage
 */
export function getSystemConfig(): SystemConfig {
  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(DEFAULT_SYSTEM_CONFIG));
      return DEFAULT_SYSTEM_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SYSTEM_CONFIG,
      ...parsed,
      gateways: {
        ...DEFAULT_SYSTEM_CONFIG.gateways,
        ...(parsed.gateways || {}),
      },
      institutionalLocks: {
        ...DEFAULT_SYSTEM_CONFIG.institutionalLocks,
        ...(parsed.institutionalLocks || {}),
      },
      gradingRegulations: {
        ...DEFAULT_SYSTEM_CONFIG.gradingRegulations,
        ...(parsed.gradingRegulations || {}),
      },
    };
  } catch (err) {
    console.error("Failed to parse system configuration", err);
    return DEFAULT_SYSTEM_CONFIG;
  }
}

/**
 * Updates the universal system configuration and notifies listeners
 */
export function updateSystemConfig(patch: Partial<SystemConfig>, updatedBy: string = "Dr. Sathish (Super Admin)"): SystemConfig {
  const current = getSystemConfig();
  const updated: SystemConfig = {
    ...current,
    ...patch,
    lastUpdated: getRealLocalTimestamp(),
    updatedBy,
  };

  localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(updated));

  // Dispatch custom and storage events for reactive updates across tabs and client portal
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("kvell_system_config_updated", { detail: updated }));

  // Append to audit log
  appendSystemAuditLog({
    action: "SYSTEM_CONFIG_UPDATED",
    performedBy: updatedBy,
    details: `Updated system controls mode: ${updated.systemMode}`,
    timestamp: getRealLocalTimestamp(),
  });

  return updated;
}

/**
 * Resets system configuration back to default values
 */
export function resetSystemConfig(): SystemConfig {
  localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(DEFAULT_SYSTEM_CONFIG));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("kvell_system_config_updated", { detail: DEFAULT_SYSTEM_CONFIG }));
  return DEFAULT_SYSTEM_CONFIG;
}

export interface UniversalDatabaseSnapshot {
  version: string;
  metadata: {
    exportDate: string;
    exportedBy: string;
    totalKeys: number;
    title: string;
  };
  systemConfig: SystemConfig;
  data: Record<string, any>;
}

/**
 * Exports entire universal database across all colleges (Engineering, Nursing, Pharmacy)
 */
export function exportUniversalDatabaseSnapshot(): UniversalDatabaseSnapshot {
  const allData: Record<string, any> = {};
  let totalKeys = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("kvell_") || key.startsWith("demo_") || key.includes("admin"))) {
      try {
        const val = localStorage.getItem(key);
        allData[key] = val ? JSON.parse(val) : val;
      } catch {
        allData[key] = localStorage.getItem(key);
      }
      totalKeys++;
    }
  }

  const snapshot: UniversalDatabaseSnapshot = {
    version: "2.5.0-KVELL-CENTRAL",
    metadata: {
      exportDate: getRealLocalTimestamp(),
      exportedBy: "Dr. Sathish (Overall University COE & Super Admin)",
      totalKeys,
      title: "KVELL Deemed University Master Examination & Result Database Backup",
    },
    systemConfig: getSystemConfig(),
    data: allData,
  };

  return snapshot;
}

/**
 * Imports universal database snapshot into localStorage with validation
 */
export function importUniversalDatabaseSnapshot(jsonString: string): { success: boolean; message: string; count: number } {
  try {
    const parsed: UniversalDatabaseSnapshot = JSON.parse(jsonString);
    if (!parsed.data || typeof parsed.data !== "object") {
      return { success: false, message: "Invalid snapshot format: missing data block", count: 0 };
    }

    let count = 0;
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (typeof value === "string") {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
      count++;
    });

    if (parsed.systemConfig) {
      localStorage.setItem(SYSTEM_CONFIG_KEY, JSON.stringify(parsed.systemConfig));
    }

    // Trigger universal update events
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("kvell_marks_updated"));
    window.dispatchEvent(new Event("kvell_students_updated"));
    window.dispatchEvent(new Event("kvell_departments_updated"));
    window.dispatchEvent(new Event("kvell_system_config_updated"));

    appendSystemAuditLog({
      action: "DATABASE_RESTORED",
      performedBy: "Dr. Sathish (Super Admin)",
      details: `Restored snapshot containing ${count} database entities.`,
      timestamp: getRealLocalTimestamp(),
    });

    return {
      success: true,
      message: `Successfully restored ${count} university database entities across all colleges.`,
      count,
    };
  } catch (err: any) {
    return { success: false, message: `Snapshot import failed: ${err.message}`, count: 0 };
  }
}

export interface StorageCategoryDiagnostic {
  category: string;
  college: string;
  keysCount: number;
  estimatedBytes: number;
  sampleKeys: string[];
}

/**
 * Analyzes storage distribution across colleges and system components
 */
export function getStorageDiagnostics(): StorageCategoryDiagnostic[] {
  const groups: Record<string, { keysCount: number; bytes: number; sampleKeys: string[]; college: string }> = {
    system: { keysCount: 0, bytes: 0, sampleKeys: [], college: "Universal Central System" },
    engineering: { keysCount: 0, bytes: 0, sampleKeys: [], college: "Engineering & Tech" },
    nursing: { keysCount: 0, bytes: 0, sampleKeys: [], college: "Nursing Sciences" },
    pharmacy: { keysCount: 0, bytes: 0, sampleKeys: [], college: "Pharmaceutical Sciences" },
    audit: { keysCount: 0, bytes: 0, sampleKeys: [], college: "Security & Audit Trail" },
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || "";
    const val = localStorage.getItem(key) || "";
    const bytes = (key.length + val.length) * 2;

    if (key.includes("audit") || key.includes("log")) {
      groups.audit.keysCount++;
      groups.audit.bytes += bytes;
      if (groups.audit.sampleKeys.length < 3) groups.audit.sampleKeys.push(key);
    } else if (key.includes("nursing")) {
      groups.nursing.keysCount++;
      groups.nursing.bytes += bytes;
      if (groups.nursing.sampleKeys.length < 3) groups.nursing.sampleKeys.push(key);
    } else if (key.includes("pharmacy")) {
      groups.pharmacy.keysCount++;
      groups.pharmacy.bytes += bytes;
      if (groups.pharmacy.sampleKeys.length < 3) groups.pharmacy.sampleKeys.push(key);
    } else if (key.startsWith("kvell_system") || key.includes("superadmin") || key.includes("token")) {
      groups.system.keysCount++;
      groups.system.bytes += bytes;
      if (groups.system.sampleKeys.length < 3) groups.system.sampleKeys.push(key);
    } else if (key.startsWith("kvell_")) {
      groups.engineering.keysCount++;
      groups.engineering.bytes += bytes;
      if (groups.engineering.sampleKeys.length < 3) groups.engineering.sampleKeys.push(key);
    }
  }

  return [
    { category: "Universal System & Master Toggles", college: groups.system.college, keysCount: groups.system.keysCount, estimatedBytes: groups.system.bytes, sampleKeys: groups.system.sampleKeys },
    { category: "Engineering College Data (Default Base)", college: groups.engineering.college, keysCount: groups.engineering.keysCount, estimatedBytes: groups.engineering.bytes, sampleKeys: groups.engineering.sampleKeys },
    { category: "Nursing College Data (Scoped Storage)", college: groups.nursing.college, keysCount: groups.nursing.keysCount, estimatedBytes: groups.nursing.bytes, sampleKeys: groups.nursing.sampleKeys },
    { category: "Pharmacy College Data (Scoped Storage)", college: groups.pharmacy.college, keysCount: groups.pharmacy.keysCount, estimatedBytes: groups.pharmacy.bytes, sampleKeys: groups.pharmacy.sampleKeys },
    { category: "Audit Trail & Activity Records", college: groups.audit.college, keysCount: groups.audit.keysCount, estimatedBytes: groups.audit.bytes, sampleKeys: groups.audit.sampleKeys },
  ];
}

export interface SystemAuditItem {
  id?: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

const AUDIT_LOGS_KEY = "kvell_system_audit_logs";

export function getSystemAuditLogs(): SystemAuditItem[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : getInitialAuditLogs();
  } catch {
    return getInitialAuditLogs();
  }
}

export function appendSystemAuditLog(item: Omit<SystemAuditItem, "id">): void {
  const logs = getSystemAuditLogs();
  const newLog: SystemAuditItem = {
    ...item,
    id: `SYS-AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  const updated = [newLog, ...logs].slice(0, 100);
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
}

function getInitialAuditLogs(): SystemAuditItem[] {
  return [
    {
      id: "SYS-AUDIT-001",
      action: "SUPER_ADMIN_SESSION_INITIATED",
      performedBy: "Dr. Sathish (Overall University COE & Super Admin)",
      details: "Chief Controller authenticated and initiated university central oversight console.",
      timestamp: getRealLocalTimestamp(),
    },
    {
      id: "SYS-AUDIT-002",
      action: "MULTI_COLLEGE_GOVERNANCE_ACTIVE",
      performedBy: "Dr. Sathish",
      details: "Multi-college isolated storage bridges verified across Engineering, Nursing & Pharmacy.",
      timestamp: getRealLocalTimestamp(),
    },
  ];
}
