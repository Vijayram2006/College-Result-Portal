import {
  Circular,
  CircularTargetAudience,
  CircularStatus,
  HodRoutingOption,
  HodForwardingAction,
  StudentYear,
  DEFAULT_DEPARTMENTS,
  DepartmentOption,
  FacultyOption,
  normalizeDepartment,
  matchesDept,
} from "./CircularTypes";
import { apiClient } from "../../services/api";

const STORAGE_KEY = "kvell_circulars_v1";
export const EVENT_CIRCULAR_UPDATED = "kvell_circular_updated";

export function loadCirculars(): Circular[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge obsolete static mock circulars if present
      const cleaned = parsed.filter(
        (c) => c && c.id !== "circ-101" && c.id !== "circ-102"
      );
      return cleaned;
    }
    return [];
  } catch (e) {
    console.error("Error reading circular storage", e);
    return [];
  }
}

export function saveCirculars(circulars: Circular[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(circulars));
    window.dispatchEvent(new Event(EVENT_CIRCULAR_UPDATED));
    window.dispatchEvent(new StorageEvent("storage"));
  } catch (e) {
    console.error("Error saving circulars to storage", e);
  }
}

/** Fetches fresh circulars from the Spring Boot backend and syncs them locally with smart merge */
export async function refreshCircularsFromServer(): Promise<Circular[]> {
  try {
    const res = await apiClient.get<any[]>("/circulars");
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      const serverMapped: Circular[] = res.data.map((c) => {
        const rawAtts = Array.isArray(c.attachments) && c.attachments.length > 0
          ? c.attachments
          : c.attachment ? [c.attachment] : [];

        return {
          id: String(c.id),
          refNo: c.refNo,
          subject: c.subject,
          message: c.message,
          category: c.category || "ACADEMIC",
          priority: c.priority || "NORMAL",
          status: (c.status as CircularStatus) || "PUBLISHED",
          targetAudiences: (c.targetAudiences as CircularTargetAudience[]) || ["HOD"],
          requiresDeanApproval: Boolean(c.requiresDeanApproval),
          submissionNotes: c.submissionNotes || undefined,
          approvalRemarks: c.approvalRemarks || undefined,
          approvedBy: c.approvedBy || null,
          approvedAt: c.approvedAt || null,
          attachment: c.attachment || rawAtts[0] || null,
          attachments: rawAtts,
          createdBy: {
            id: String(c.createdBy?.id || "AD-01"),
            name: c.createdBy?.name || "Associate Dean",
            role: c.createdBy?.role || "ASSOCIATE_DEAN",
          },
          createdAt: c.createdAt,
          routingOption: c.routingOption || "ALL_DEPTS",
          targetDepartmentKeys: c.targetDepartmentKeys || [],
          targetDepartmentNames: c.targetDepartmentNames || [],
          targetFacultyIds: c.targetFacultyIds || [],
          targetFacultyNames: c.targetFacultyNames || [],
          hodActions: c.hodActions || {},
          seenByCoe: Boolean(c.seenByCoe),
          seenAt: c.seenAt || null,
          coeReply: c.coeReply || null,
          coeReplyAt: c.coeReplyAt || null,
          scheduledFor: c.scheduledFor || null,
          deletedBy: c.deletedBy || null,
          deletedAt: c.deletedAt || null,
        };
      });

      saveCirculars(serverMapped);
      return serverMapped;
    } else if (res.data && Array.isArray(res.data) && res.data.length === 0) {
      saveCirculars([]);
      return [];
    }
  } catch (err) {
    // Falls back to local storage if backend offline or still starting
  }
  return loadCirculars();
}

export async function createCircular(
  data: Omit<Circular, "id" | "refNo" | "createdAt" | "hodActions" | "status"> & {
    status?: CircularStatus;
  }
): Promise<Circular> {
  const current = loadCirculars();
  const sequence = current.length + 101;
  const rawAtts = data.attachments && data.attachments.length > 0
    ? data.attachments
    : data.attachment ? [data.attachment] : [];

  const isCoe = data.createdBy?.role === "COE";
  const refPrefix = isCoe ? "KVELL/COE/CIR" : "KVELL/AD/CIR";
  const currentYear = new Date().getFullYear();

  const finalStatus: CircularStatus = data.status
    ? data.status
    : isCoe && data.requiresDeanApproval
      ? "PENDING_DEAN_APPROVAL"
      : "PUBLISHED";

  const targetAudiences: CircularTargetAudience[] =
    data.targetAudiences && data.targetAudiences.length > 0
      ? data.targetAudiences
      : ["HOD"];

  const payload = {
    subject: data.subject,
    message: data.message,
    category: data.category,
    priority: data.priority,
    routingOption: data.routingOption,
    targetDepartmentKeys: data.targetDepartmentKeys,
    targetDepartmentNames: data.targetDepartmentNames,
    targetFacultyIds: data.targetFacultyIds || [],
    targetFacultyNames: data.targetFacultyNames || [],
    targetAudiences,
    requiresDeanApproval: Boolean(data.requiresDeanApproval),
    submissionNotes: data.submissionNotes,
    scheduledFor: data.scheduledFor,
    attachment: rawAtts[0] || null,
    attachments: rawAtts,
  };

  try {
    const res = await apiClient.post<any>("/circulars", payload);
    if (res.data) {
      const c = res.data;
      const serverCircular: Circular = {
        id: String(c.id),
        refNo: c.refNo,
        subject: c.subject,
        message: c.message,
        category: c.category || data.category,
        priority: c.priority || data.priority,
        status: (c.status as CircularStatus) || finalStatus,
        targetAudiences: (c.targetAudiences as CircularTargetAudience[]) || targetAudiences,
        requiresDeanApproval: Boolean(c.requiresDeanApproval),
        submissionNotes: c.submissionNotes || data.submissionNotes,
        approvalRemarks: c.approvalRemarks,
        approvedBy: c.approvedBy || null,
        approvedAt: c.approvedAt || null,
        attachment: c.attachment || rawAtts[0] || null,
        attachments: Array.isArray(c.attachments) && c.attachments.length > 0 ? c.attachments : rawAtts,
        createdBy: {
          id: String(c.createdBy?.id || data.createdBy?.id || "AD-01"),
          name: c.createdBy?.name || data.createdBy?.name || "Associate Dean",
          role: c.createdBy?.role || data.createdBy?.role || "ASSOCIATE_DEAN",
        },
        createdAt: c.createdAt || new Date().toISOString(),
        routingOption: c.routingOption || data.routingOption,
        targetDepartmentKeys: c.targetDepartmentKeys || data.targetDepartmentKeys,
        targetDepartmentNames: c.targetDepartmentNames || data.targetDepartmentNames,
        targetFacultyIds: c.targetFacultyIds || data.targetFacultyIds || [],
        targetFacultyNames: c.targetFacultyNames || data.targetFacultyNames || [],
        hodActions: c.hodActions || {},
        seenByCoe: Boolean(c.seenByCoe),
        seenAt: c.seenAt || null,
        coeReply: c.coeReply || null,
        coeReplyAt: c.coeReplyAt || null,
        scheduledFor: c.scheduledFor || data.scheduledFor || null,
      };
      const updated = [serverCircular, ...current.filter((x) => x.id !== serverCircular.id && x.refNo !== serverCircular.refNo)];
      saveCirculars(updated);
      return serverCircular;
    }
  } catch (err: any) {
    console.error("Backend /circulars POST failed:", err);
    throw err;
  }

  const localFallback: Circular = {
    ...data,
    id: `circ-${Date.now()}`,
    refNo: `${refPrefix}/${currentYear}/${sequence}`,
    status: finalStatus,
    targetAudiences,
    targetFacultyIds: data.targetFacultyIds || [],
    targetFacultyNames: data.targetFacultyNames || [],
    createdAt: new Date().toISOString(),
    attachment: rawAtts[0] || null,
    attachments: rawAtts,
    hodActions: {},
    seenByCoe: false,
    seenAt: null,
    coeReply: null,
    coeReplyAt: null,
    scheduledFor: data.scheduledFor || null,
  };
  const updated = [localFallback, ...current];
  saveCirculars(updated);
  return localFallback;
}

export async function releaseScheduledCircularNow(circularId: string): Promise<boolean> {
  const current = loadCirculars();
  const updated = current.map((c) => {
    if (c.id === circularId) {
      return {
        ...c,
        status: "PUBLISHED" as CircularStatus,
        scheduledFor: null,
      };
    }
    return c;
  });
  saveCirculars(updated);

  try {
    const numId = parseInt(circularId, 10);
    if (!isNaN(numId)) {
      await apiClient.post(`/circulars/${numId}/release-now`);
      await refreshCircularsFromServer();
    }
    return true;
  } catch (e) {
    console.error("Failed to release scheduled circular now:", e);
    await refreshCircularsFromServer();
    return false;
  }
}

export async function updateCircular(
  circularId: string,
  data: Partial<Circular>
): Promise<Circular | null> {
  const current = loadCirculars();
  const rawAtts = data.attachments && data.attachments.length > 0
    ? data.attachments
    : data.attachment ? [data.attachment] : [];

  const payload: any = {
    subject: data.subject,
    message: data.message,
    category: data.category,
    priority: data.priority,
    routingOption: data.routingOption,
    targetDepartmentKeys: data.targetDepartmentKeys,
    targetDepartmentNames: data.targetDepartmentNames,
    targetFacultyIds: data.targetFacultyIds || [],
    targetFacultyNames: data.targetFacultyNames || [],
    targetAudiences: data.targetAudiences,
    requiresDeanApproval: data.requiresDeanApproval,
    submissionNotes: data.submissionNotes,
    scheduledFor: data.scheduledFor,
    attachment: rawAtts[0] || null,
    attachments: rawAtts,
  };

  try {
    const numId = parseInt(circularId, 10);
    if (!isNaN(numId)) {
      const res = await apiClient.put<any>(`/circulars/${numId}`, payload);
      if (res.data) {
        await refreshCircularsFromServer();
        const refreshed = loadCirculars();
        return refreshed.find((c) => c.id === circularId) || null;
      }
    }
  } catch (e) {
    console.error("Failed to update circular on server:", e);
    throw e;
  }
  return current.find((c) => c.id === circularId) || null;
}

export async function markCircularSeen(circularId: string): Promise<boolean> {
  const current = loadCirculars();
  const updated = current.map((c) =>
    c.id === circularId ? { ...c, seenByCoe: true, seenAt: new Date().toISOString() } : c
  );
  saveCirculars(updated);

  try {
    const numId = parseInt(circularId, 10);
    if (!isNaN(numId)) {
      await apiClient.post(`/circulars/${numId}/ack`);
      await refreshCircularsFromServer();
    }
    return true;
  } catch (e) {
    await refreshCircularsFromServer();
    return false;
  }
}

export async function replyCircularByCoe(circularId: string, reply: string): Promise<boolean> {
  const current = loadCirculars();
  const updated = current.map((c) =>
    c.id === circularId
      ? { ...c, seenByCoe: true, coeReply: reply, coeReplyAt: new Date().toISOString() }
      : c
  );
  saveCirculars(updated);

  try {
    const numId = parseInt(circularId, 10);
    if (!isNaN(numId)) {
      await apiClient.post(`/circulars/${numId}/reply`, { reply });
      await refreshCircularsFromServer();
    }
    return true;
  } catch (e) {
    await refreshCircularsFromServer();
    throw e;
  }
}

export async function approveCircular(
  circularId: string,
  approve: boolean = true,
  remarks?: string
): Promise<boolean> {
  const current = loadCirculars();
  let modified = false;

  const updated = current.map((circ) => {
    if (circ.id === circularId) {
      modified = true;
      return {
        ...circ,
        status: (approve ? "APPROVED_BY_DEAN" : "REJECTED") as CircularStatus,
        approvalRemarks: remarks || circ.approvalRemarks,
        approvedAt: new Date().toISOString(),
      };
    }
    return circ;
  });

  if (modified) {
    saveCirculars(updated);

    // Synchronize approval to backend asynchronously
    try {
      const numId = parseInt(circularId, 10);
      if (!isNaN(numId)) {
        await apiClient.post(`/circulars/${numId}/approve`, {
          action: approve ? "APPROVE" : "REJECT",
          remarks: remarks || "",
        });
        await refreshCircularsFromServer();
      }
    } catch (e) {
      await refreshCircularsFromServer();
      throw e;
    }
  }
  return modified;
}

export async function forwardCircular(
  circularId: string,
  routingData?: {
    routingOption?: HodRoutingOption;
    targetDepartmentKeys?: string[];
    targetDepartmentNames?: string[];
    targetFacultyIds?: string[];
    targetFacultyNames?: string[];
    targetAudiences?: CircularTargetAudience[];
  }
): Promise<boolean> {
  const current = loadCirculars();
  let modified = false;

  const updated = current.map((circ) => {
    if (circ.id === circularId) {
      modified = true;
      return {
        ...circ,
        status: "PUBLISHED" as CircularStatus,
        routingOption: routingData?.routingOption || circ.routingOption,
        targetDepartmentKeys: routingData?.targetDepartmentKeys || circ.targetDepartmentKeys,
        targetDepartmentNames: routingData?.targetDepartmentNames || circ.targetDepartmentNames,
        targetFacultyIds: routingData?.targetFacultyIds || circ.targetFacultyIds,
        targetFacultyNames: routingData?.targetFacultyNames || circ.targetFacultyNames,
        targetAudiences: routingData?.targetAudiences || circ.targetAudiences,
      };
    }
    return circ;
  });

  if (modified) {
    saveCirculars(updated);
    try {
      const numId = parseInt(circularId, 10);
      if (!isNaN(numId)) {
        await apiClient.post(`/circulars/${numId}/forward`, routingData || {});
        await refreshCircularsFromServer();
      }
    } catch (e) {
      console.error("Failed to forward circular to backend", e);
      await refreshCircularsFromServer();
      throw e;
    }
  }
  return modified;
}

export async function deleteCircular(circularId: string, currentUser?: { id: string; name: string; role: string }): Promise<boolean> {
  const numId = parseInt(circularId, 10);
  if (!isNaN(numId)) {
    try {
      await apiClient.delete(`/circulars/${numId}`);
    } catch (e: any) {
      window.alert(e?.response?.data?.message || "The circular could not be deleted.");
      return false;
    }
  }

  const current = loadCirculars();
  const updated = current.map((c) => {
    if (c.id === circularId) {
      return {
        ...c,
        status: "DELETED" as CircularStatus,
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : c.deletedBy || { id: "1", name: "Authorized Authority", role: "ASSOCIATE_DEAN" },
      };
    }
    return c;
  });
  saveCirculars(updated);

  try {
    await refreshCircularsFromServer();
  } catch {
    // fallback
  }

  return true;
}

export function updateHodAction(
  circularId: string,
  deptKey: string,
  action: HodForwardingAction
): boolean {
  const current = loadCirculars();
  let modified = false;

  const updated = current.map((circ) => {
    if (circ.id === circularId) {
      modified = true;
      return {
        ...circ,
        hodActions: {
          ...circ.hodActions,
          [deptKey]: action,
        },
      };
    }
    return circ;
  });

  if (modified) {
    saveCirculars(updated);

    // Push action to Spring Boot backend asynchronously
    void (async () => {
      try {
        const numId = parseInt(circularId, 10);
        if (!isNaN(numId)) {
          await apiClient.post(`/circulars/${numId}/hod-action`, {
            action: action.action,
            target: action.target,
            targetYears: action.targetYears,
            remarks: action.remarks,
          });
          await refreshCircularsFromServer();
        }
      } catch (e) {
        console.error("Failed to save the action on the server", e);
        await refreshCircularsFromServer();
        window.alert("The action could not be saved. Please try again.");
      }
    })();
  }
  return modified;
}

export function findHodAction(
  actions: Record<string, HodForwardingAction> = {},
  deptKey: string
): HodForwardingAction | undefined {
  if (!actions || !deptKey) return undefined;
  if (actions[deptKey]) return actions[deptKey];
  const normalized = normalizeDepartment(deptKey);
  if (actions[normalized]) return actions[normalized];

  for (const [key, val] of Object.entries(actions)) {
    if (matchesDept(key, deptKey)) {
      return val;
    }
  }
  return undefined;
}

export async function fetchDynamicDepartments(): Promise<DepartmentOption[]> {
  try {
    let res: any = null;
    try {
      res = await apiClient.get<any[]>("/circulars/departments");
    } catch {
      // If circulars/departments is not reached, try /admin/departments
      res = await apiClient.get<any[]>("/admin/departments");
    }
    if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
      const depts: DepartmentOption[] = res.data.map((d: any) => ({
        key: d.key || d.deptKey || d.dept_key || d.code?.toLowerCase(),
        name: d.name,
        code: d.code || (d.key || "").toUpperCase(),
        hodName: d.headName || d.hodName || "Head of Department",
      }));
      localStorage.setItem("kvell_circular_departments", JSON.stringify(depts));
      return depts;
    }
  } catch {
    // Try fallback
  }

  try {
    const cached = localStorage.getItem("kvell_circular_departments");
    if (cached) {
      const parsed: DepartmentOption[] = JSON.parse(cached);
      return parsed.filter((d) => d.key !== "it");
    }
  } catch { }

  return [];
}

export async function fetchDynamicFaculties(deptKey?: string): Promise<FacultyOption[]> {
  try {
    const url = deptKey && deptKey !== "ALL"
      ? `/circulars/faculties?deptKey=${encodeURIComponent(deptKey)}`
      : "/circulars/faculties";
    const res = await apiClient.get<any[]>(url);
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map((f) => ({
        id: String(f.id),
        title: f.title || "Dr.",
        name: f.name,
        designation: f.designation || "Faculty",
        deptKey: f.deptKey || f.dept_key,
        deptName: f.deptName || f.dept_name,
        staffId: f.staffId || f.staff_id,
        email: f.email || "",
      }));
    }
  } catch (e) {
    console.warn("Could not fetch live faculties from backend", e);
  }
  return [];
}

export function getCircularsForDean(): Circular[] {
  return loadCirculars();
}

export function getPendingApprovalsForDean(): Circular[] {
  const all = loadCirculars();
  return all.filter((c) => c.status === "PENDING_DEAN_APPROVAL");
}

export function getCircularsForCoe(): Circular[] {
  const all = loadCirculars();
  return all.filter((circ) => {
    const isCreator = circ.createdBy?.role === "COE";
    const isTargeted = circ.targetAudiences?.includes("COE");
    return isCreator || isTargeted;
  });
}

export function getCircularsForHod(deptKey: string): Circular[] {
  const all = loadCirculars();
  return all.filter((circ) => {
    if (circ.status !== "PUBLISHED" && circ.status !== "DELETED") return false;

    const audienceMatch =
      !circ.targetAudiences ||
      circ.targetAudiences.length === 0 ||
      circ.targetAudiences.includes("HOD");
    if (!audienceMatch) return false;

    if (circ.routingOption === "ALL_DEPTS") return true;
    const keyMatch = circ.targetDepartmentKeys?.some((k) => matchesDept(k, deptKey));
    const nameMatch = circ.targetDepartmentNames?.some((n) => matchesDept(n, deptKey));
    return Boolean(keyMatch || nameMatch);
  });
}

export function getCircularsForFaculty(
  deptKey: string,
  facultyUsername?: string,
  facultyName?: string
): Circular[] {
  const all = loadCirculars();
  return all.filter((circ) => {
    if (circ.status !== "PUBLISHED" && circ.status !== "DELETED") return false;

    const isTargetDept =
      circ.routingOption === "ALL_DEPTS" ||
      circ.targetDepartmentKeys?.some((k) => matchesDept(k, deptKey)) ||
      circ.targetDepartmentNames?.some((n) => matchesDept(n, deptKey));
    if (!isTargetDept) return false;

    // Specific faculty targeting check
    if (circ.targetFacultyIds && circ.targetFacultyIds.length > 0) {
      const u = (facultyUsername || "").trim().toLowerCase();
      const n = (facultyName || "").trim().toLowerCase();
      const idMatch = circ.targetFacultyIds.some((id) => id.toLowerCase() === u);
      const nameMatch = circ.targetFacultyNames?.some(
        (fn) => fn.toLowerCase().includes(n) || (n && n.includes(fn.toLowerCase()))
      );
      return idMatch || Boolean(nameMatch);
    }

    // 1. Direct faculty routing from Associate Dean or COE to all faculty in department
    if (circ.targetAudiences?.includes("FACULTY")) {
      return true;
    }

    // 2. Downstream HOD forwarding
    const action = findHodAction(circ.hodActions, deptKey);
    if (!action) return false;

    return (
      action.action === "FORWARDED" &&
      (action.target === "FACULTY_ONLY" ||
        action.target === "FACULTY_AND_STUDENTS")
    );
  });
}

export function getCircularsForStudent(
  deptKey: string,
  year: StudentYear
): Circular[] {
  const all = loadCirculars();
  return all.filter((circ) => {
    if (circ.status !== "PUBLISHED" && circ.status !== "DELETED") return false;

    const isTargetDept =
      circ.routingOption === "ALL_DEPTS" ||
      circ.targetDepartmentKeys?.some((k) => matchesDept(k, deptKey)) ||
      circ.targetDepartmentNames?.some((n) => matchesDept(n, deptKey));
    if (!isTargetDept) return false;

    const action = findHodAction(circ.hodActions, deptKey);
    if (!action) return false;

    if (action.action !== "FORWARDED") return false;
    const targetMatch =
      action.target === "STUDENTS_ONLY" ||
      action.target === "FACULTY_AND_STUDENTS";
    if (!targetMatch) return false;

    if (!action.targetYears || action.targetYears.length === 0) return true;
    return action.targetYears.includes(year);
  });
}

export function subscribeCirculars(listener: () => void): () => void {
  const handler = () => listener();
  window.addEventListener(EVENT_CIRCULAR_UPDATED, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT_CIRCULAR_UPDATED, handler);
    window.removeEventListener("storage", handler);
  };
}
