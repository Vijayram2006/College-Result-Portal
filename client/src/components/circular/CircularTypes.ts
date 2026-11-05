export type CircularPriority = "NORMAL" | "HIGH" | "URGENT";

export type CircularCategory = "ACADEMIC" | "EXAMINATION" | "ADMINISTRATIVE" | "EVENTS" | "GENERAL";

export type HodRoutingOption = "SINGLE_DEPT" | "SELECTED_DEPTS" | "ALL_DEPTS";

export type HodDistributionTarget = "FACULTY_ONLY" | "STUDENTS_ONLY" | "FACULTY_AND_STUDENTS";

export type StudentYear = "1st Year" | "2nd Year" | "3rd Year" | "4th Year";

export type CircularTargetAudience = "HOD" | "FACULTY" | "COE" | "STUDENTS";

export type CircularStatus = "PUBLISHED" | "PENDING_DEAN_APPROVAL" | "APPROVED_BY_DEAN" | "REJECTED" | "SCHEDULED" | "DRAFT" | "DELETED";

export interface CircularAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // Base64 or object URL for preview/download
}

export interface HodForwardingAction {
  hodId: string;
  hodName: string;
  deptKey: string;
  deptName: string;
  action: "KEPT" | "FORWARDED" | "SEEN";
  target?: HodDistributionTarget;
  targetYears?: StudentYear[];
  forwardedAt: string;
  remarks?: string;
}

export interface Circular {
  id: string;
  refNo: string;
  subject: string;
  message: string;
  attachment?: CircularAttachment | null; // Primary / first attachment (backward compat)
  attachments?: CircularAttachment[]; // Multiple attachments list
  category: CircularCategory;
  priority: CircularPriority;
  status: CircularStatus;
  targetAudiences: CircularTargetAudience[];
  requiresDeanApproval?: boolean;
  submissionNotes?: string;
  approvalRemarks?: string;
  approvedBy?: {
    id: string;
    name: string;
    role: string;
    approvedAt?: string;
  } | null;
  approvedAt?: string | null;
  createdBy: {
    id: string;
    name: string;
    role: "ASSOCIATE_DEAN" | "DEAN" | "COE" | string;
  };
  createdAt: string;
  routingOption: HodRoutingOption;
  targetDepartmentKeys: string[];
  targetDepartmentNames: string[];
  targetFacultyIds?: string[];
  targetFacultyNames?: string[];
  hodActions: Record<string, HodForwardingAction>; // Map of deptKey -> Action taken by that HOD
  seenByCoe?: boolean;
  seenAt?: string | null;
  coeReply?: string | null;
  coeReplyAt?: string | null;
  scheduledFor?: string | null;
  deletedBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
  deletedAt?: string | null;
}

export interface DepartmentOption {
  key: string;
  name: string;
  code: string;
  hodName: string;
}

export interface FacultyOption {
  id: string | number;
  title?: string;
  name: string;
  designation?: string;
  deptKey: string;
  deptName?: string;
  staffId?: string;
  email?: string;
}

export const DEFAULT_DEPARTMENTS: DepartmentOption[] = [
  { key: "cse", code: "CSE", name: "Computer Science & Engineering", hodName: "Dr. K. Rajesh" },
  { key: "aids", code: "AIDS", name: "Artificial Intelligence & Data Science", hodName: "Dr. P. Suresh" },
  { key: "ece", code: "ECE", name: "Electronics & Communication Engineering", hodName: "Dr. M. Sangeetha" },
  { key: "eee", code: "EEE", name: "Electrical & Electronics Engineering", hodName: "Dr. A. Saravanan" },
  { key: "mech", code: "MECH", name: "Mechanical Engineering", hodName: "Dr. R. Anand" },
  { key: "bme", code: "BME", name: "Biomedical Engineering", hodName: "Dr. V. Deepa" },
  { key: "bt", code: "BT", name: "Biotechnology", hodName: "Dr. S. Karthik" },
  { key: "civil", code: "CIVIL", name: "Civil Engineering", hodName: "Dr. T. Murugan" },
];

export const ALL_STUDENT_YEARS: StudentYear[] = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

export function normalizeDepartment(str?: string | null): string {
  if (!str) return "";
  const s = str.trim().toLowerCase();

  // Exact codes
  if (s === "cse" || s === "cs") return "cse";
  if (s === "aids" || s === "ai" || s === "ads") return "aids";
  if (s === "ece") return "ece";
  if (s === "eee") return "eee";
  if (s === "mech" || s === "me") return "mech";
  if (s === "bme") return "bme";
  if (s === "bt") return "bt";
  if (s === "civil" || s === "ce") return "civil";
  if (s === "it") return "it";

  // Standard engineering disciplines
  if (s.includes("comp") || s.includes("computer")) return "cse";
  if (s.includes("artificial") || s.includes("intelligence") || s.includes("data science")) return "aids";
  if (s.includes("electrical") && s.includes("electronics")) return "eee";
  if (s.includes("electronics") && s.includes("communication")) return "ece";
  if (s.includes("mechanical")) return "mech";
  if (s.includes("biomedical")) return "bme";
  if (s.includes("biotech") || s.includes("biotechnology")) return "bt";
  if (s.includes("civil")) return "civil";
  if (s.includes("information tech") || s.includes("information") || s.includes("infotech")) return "it";

  // Dynamic slug for custom DB departments (e.g. "Air Force Engineer" -> "airforceengineer")
  const slug = s.replace(/[^a-z0-9]/g, "");
  return slug || s;
}

export function matchesDept(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const rawA = a.trim().toLowerCase();
  const rawB = b.trim().toLowerCase();
  if (rawA === rawB) return true;

  const na = normalizeDepartment(a);
  const nb = normalizeDepartment(b);
  if (na && nb && na === nb) return true;

  // Only allow substring matching if both strings are sufficiently long (>= 4 chars)
  // to prevent false positives (e.g. "ce" matching "science" or "it" matching "security")
  if (rawA.length >= 4 && rawB.length >= 4 && (rawA.includes(rawB) || rawB.includes(rawA))) {
    return true;
  }
  if (na && nb && na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }

  return false;
}
