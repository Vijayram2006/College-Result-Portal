import { useEffect, useState } from "react";
import { apiClient } from "../services/api";

/**
 * The Super Admin's portal gateways and locks, read from the result server (GET /api/public/system-config, no
 * sign-in needed). The server enforces them itself; the portal uses them to explain what is closed and why.
 */
export interface PortalConfig {
  systemMode: "OPERATIONAL" | "MAINTENANCE" | "EMERGENCY_LOCK";
  gateways: {
    studentResultPortal: { enabled: boolean; announcement: string; allowGradeDownload: boolean; withholdResults: boolean };
    facultyMarkEntry: {
      enabled: boolean;
      submissionDeadline: string;
      lockNotice: string;
      allowInternalMarkEdit: boolean;
      allowExternalMarkEdit: boolean;
    };
    revaluationWindow: { enabled: boolean; deadline: string; feePerCourse: number };
  };
  institutionalLocks: Record<string, { locked: boolean; resultsLive: boolean; freezeSubmissions: boolean }>;
}

let latest: PortalConfig | null = null;
const listeners = new Set<(c: PortalConfig | null) => void>();
let timer: number | undefined;

async function refresh() {
  try {
    const { data } = await apiClient.get<PortalConfig>("/public/system-config");
    latest = data;
    listeners.forEach((l) => l(data));
  } catch {
    // keep the last known settings; the server still enforces the real ones
  }
}

/** The current portal settings (null until loaded), kept fresh every 30 seconds and when the tab regains focus. */
export function useSystemConfig(): PortalConfig | null {
  const [config, setConfig] = useState<PortalConfig | null>(latest);
  useEffect(() => {
    listeners.add(setConfig);
    if (listeners.size === 1) {
      refresh();
      timer = window.setInterval(refresh, 30000);
      window.addEventListener("focus", refresh);
    }
    return () => {
      listeners.delete(setConfig);
      if (listeners.size === 0) {
        window.clearInterval(timer);
        window.removeEventListener("focus", refresh);
      }
    };
  }, []);
  return config;
}

/** Students cannot sign in or see anything while this is true. */
export function isStudentPortalClosed(c: PortalConfig | null): boolean {
  return !!c && (c.systemMode !== "OPERATIONAL" || c.gateways.studentResultPortal.enabled === false);
}

/** Why faculty may not save marks now (same rules as the server), or null when they may. */
export function facultyLockReason(c: PortalConfig | null, college: string): string | null {
  if (!c) return null;
  const g = c.gateways.facultyMarkEntry;
  if (c.systemMode === "EMERGENCY_LOCK") return "The university is in emergency lockdown.";
  if (!g.enabled) return g.lockNotice || "Mark entry is closed by the Controller of Examinations.";
  if (g.submissionDeadline && new Date(g.submissionDeadline).getTime() < Date.now()) {
    return `The mark submission deadline (${new Date(g.submissionDeadline).toLocaleString()}) has passed.`;
  }
  const lock = c.institutionalLocks?.[college];
  if (lock?.locked) return "Mark entry for this college is locked by the Super Admin.";
  if (lock?.freezeSubmissions) return "Changes for this college are frozen by the Super Admin.";
  return null;
}

/** Whether the revaluation window is open now (the server checks this again on submit). */
export function isRevaluationOpen(c: PortalConfig | null): boolean {
  if (!c || c.systemMode !== "OPERATIONAL") return false;
  const w = c.gateways.revaluationWindow;
  return w.enabled && (!w.deadline || new Date(w.deadline).getTime() >= Date.now());
}
