import { CollegeKey, isSuperAdmin } from "./rbac";
import { apiClient, apiErrorMessage } from "../services/api";

/**
 * Portal gateways, college locks and session details set by the Super Admin. They live on the result server, which
 * also enforces them; this module keeps the latest copy for the pages that show them (and lock their buttons).
 */

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
  /** Approvals forwarded marks need before the college COE may publish them (both off: Faculty -> COE). */
  markApproval?: { hodApproval: boolean; deanApproval: boolean };
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
  lastUpdated: "",
  updatedBy: "System default",
  academicSession: { academicYear: "2026 - 2027", semesterTerm: "ODD", sessionStatus: "ACTIVE" },
  gateways: {
    studentResultPortal: { enabled: true, announcement: "", allowGradeDownload: true, withholdResults: false },
    facultyMarkEntry: {
      enabled: true,
      submissionDeadline: "",
      lockNotice: "Mark submission window is open for the current evaluation.",
      allowInternalMarkEdit: true,
      allowExternalMarkEdit: true,
    },
    revaluationWindow: { enabled: false, deadline: "", feePerCourse: 400 },
  },
  institutionalLocks: {
    engineering: { locked: false, resultsLive: true, freezeSubmissions: false },
    nursing: { locked: false, resultsLive: true, freezeSubmissions: false },
    pharmacy: { locked: false, resultsLive: true, freezeSubmissions: false },
  },
  markApproval: { hodApproval: false, deanApproval: false },
  gradingRegulations: {
    engineering: { regulation: "", passMinInternal: 0, passMinExternal: 0, passMinTotal: 40, scaleDescription: "" },
    nursing: { regulation: "", passMinInternal: 0, passMinExternal: 0, passMinTotal: 40, scaleDescription: "" },
    pharmacy: { regulation: "", passMinInternal: 0, passMinExternal: 0, passMinTotal: 40, scaleDescription: "" },
    moderation: { maxGraceMarks: 0, enableCondonation: false, attendanceThreshold: 0 },
  },
};

const CACHE_KEY = "kvell_system_config_cache";
let cache: SystemConfig = readCache();

function readCache(): SystemConfig {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as SystemConfig;
  } catch {
    // no cached copy (private window, first visit)
  }
  return DEFAULT_SYSTEM_CONFIG;
}

function setCache(config: SystemConfig) {
  cache = config;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // the in-memory copy is enough
  }
  window.dispatchEvent(new Event("kvell_system_config_updated"));
}

function deepMerge<T>(base: T, patch: any): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch ?? base;
  const out: any = { ...(base as any) };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" ? deepMerge(out[k], v) : v;
  }
  return out;
}

/** The latest known configuration (synchronous, for rendering). */
export function getSystemConfig(): SystemConfig {
  return cache;
}

/** Fetches the configuration from the server (the full one for a Super Admin, the public copy otherwise). */
export async function loadSystemConfig(): Promise<SystemConfig> {
  const url = isSuperAdmin() ? "/super-admin/config" : "/public/system-config";
  const { data } = await apiClient.get<SystemConfig>(url);
  setCache(data);
  return data;
}

/** Saves a partial change on the server and returns what the server stored. */
export async function saveSystemConfig(patch: Partial<SystemConfig>): Promise<SystemConfig> {
  const { data } = await apiClient.put<SystemConfig>("/super-admin/config", patch);
  setCache(data);
  return data;
}

/**
 * Applies a change straight away on screen and saves it on the server; if the server refuses, the reason is shown
 * and the stored configuration is loaded back. (The second argument is ignored: the server records who saved.)
 */
export function updateSystemConfig(patch: Partial<SystemConfig>, _updatedBy?: string): SystemConfig {
  const merged = deepMerge(cache, patch);
  setCache(merged);
  saveSystemConfig(patch).catch((err) => {
    alert(apiErrorMessage(err, "Could not save the portal settings."));
    loadSystemConfig().catch(() => undefined);
  });
  return merged;
}

/** Restores the defaults on the server (all portals open, nothing locked). */
export async function resetSystemConfig(): Promise<SystemConfig> {
  const { data } = await apiClient.post<SystemConfig>("/super-admin/config/reset");
  setCache(data);
  return data;
}

/** True when the college's COE may not change anything (the server refuses such changes too). */
export function isCollegeLocked(config: SystemConfig, college: CollegeKey): boolean {
  const lock = config.institutionalLocks?.[college];
  return config.systemMode === "EMERGENCY_LOCK" || lock?.locked === true || lock?.freezeSubmissions === true;
}

/** Loads the configuration now, every 30 seconds, and whenever the server refuses a change with 423 Locked. */
export function startSystemConfigSync(): () => void {
  const refresh = () => {
    loadSystemConfig().catch(() => undefined);
  };
  refresh();
  const timer = window.setInterval(refresh, 30000);
  window.addEventListener("kvell:system-config-stale", refresh);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("kvell:system-config-stale", refresh);
  };
}
