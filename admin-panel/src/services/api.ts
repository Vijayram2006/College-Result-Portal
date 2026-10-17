import axios from "axios";
import { wakeServer } from "../components/ServerWake";
import type { AdminRole, CollegeKey } from "../utils/rbac";

// Environment-configured API URL connecting to Spring Boot backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Interceptor: Attach Bearer token if authenticated
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("kvell_admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // The college a Super Admin is inspecting; the server ignores this header for every other account
    // A call may name its own college (Super Admin college window); otherwise the inspected one is used
    const view = localStorage.getItem("kvell_superadmin_view_college");
    if (view && !config.headers["X-College-View"]) {
      config.headers["X-College-View"] = view;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// An expired or revoked session sends the admin back to the login page
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = String(error?.config?.url || "").includes("/auth/login");
    // An account that still has its shared starting password must choose its own first (PasswordChangeGate)
    if (error?.response?.status === 403 && error.response.data?.passwordChangeRequired) {
      window.dispatchEvent(new Event("kvell:password-change-required"));
    }
    // A Super Admin lock refused this change: refresh the gateways so the page shows the lock
    if (error?.response?.status === 423) {
      window.dispatchEvent(new Event("kvell:system-config-stale"));
    }
    if (error?.response?.status === 401 && !isLogin) {
      localStorage.removeItem("kvell_admin_token");
      localStorage.removeItem("kvell_admin_user");
      if (!window.location.pathname.endsWith("/admin/login")) {
        window.location.assign("/admin/login");
      }
    }
    return retryAfterWake(error);
  }
);

// The hosted server may be asleep (free plan): a request that got no answer at all waits for the wake-up and is
// sent once more. Only reads and sign-ins are repeated, so a save is never applied twice.
async function retryAfterWake(error: any) {
  const config = error?.config;
  if (error?.response || !config || config.__wakeRetried) return Promise.reject(error);
  const method = String(config.method || "get").toLowerCase();
  const repeatable = method === "get" || String(config.url || "").includes("/auth/login");
  const awake = await wakeServer();
  if (!awake || !repeatable) return Promise.reject(error);
  config.__wakeRetried = true;
  return apiClient.request(config);
}

/** Human-readable message from an API error ({ error: "..." } bodies), for alerts and banners. */
export function apiErrorMessage(err: any, fallback = "Request failed. Please try again."): string {
  if (!err?.response) return "Cannot reach the result server. It may still be starting; please try again in a minute.";
  return err.response.data?.error || fallback;
}

// Types & DTO Interfaces matching the backend

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  /** COE_ENGINEERING / COE_NURSING / COE_PHARMACY: each COE only sees its own college's data. */
  role: AdminRole;
  collegeKey: CollegeKey;
  collegeName: string;
  email?: string;
  departmentKey?: string;
  /** Still has the shared starting password: must choose a new one before using the panel. */
  mustChangePassword?: boolean;
}

export interface AdminAuthResponse {
  token: string;
  role: AdminRole;
  user: AdminUser;
}

export interface DepartmentRecord {
  id: string;
  key: string;
  name: string;
  code: string;
  headName: string;
  totalStudents: number;
  status: "ACTIVE" | "INACTIVE";
  hodLogin?: string | null;
  facultyLogin?: string | null;
}

export interface StudentRecord {
  regNo: string;
  studentName: string;
  dob: string;
  dept: string;
  deptKey: string;
  deptName: string;
  category: "regular" | "lateral";
  year: string;
  semester: string;
  academicYear: string;
}

export interface StudentRowInput {
  row?: number;
  regNo: string;
  name: string;
  dob: string;
  category: string;
}

export interface RowError {
  row: number;
  regNo: string;
  field: string;
  error: string;
}

export interface SubjectRecord {
  id: string;
  code: string;
  title: string;
  category: "Core Mandatory" | "Professional Elective" | "Open Elective";
  credits: number;
  department: string;
  deptKey: string;
  semester: string;
  academicYear?: string;
  faculty: string;
  status: "COE FINALIZED" | "PENDING APPROVAL";
  studentsEnrolled?: number;
}

export interface Subdivisions {
  i: number;
  ii: number;
  iii: number;
}

export interface QuestionMarks {
  a: Subdivisions;
  b: Subdivisions;
}

/** One row of the Mark Entry roster. */
export interface StudentMarkRecord {
  regNo: string;
  name: string;
  dob: string;
  category: "regular" | "lateral";
  hasMarks: boolean;
  partATotal: number;
  partBCTotal: number;
  grandTotal: number;
  grade: string;
  resultStatus: "PASS" | "FAIL";
  partA: number[];
  partBC: Record<string, QuestionMarks>;
  assessmentType?: string;
  deptKey?: string;
  deptName?: string;
  semester?: string;
  subjectCode?: string;
  subjectTitle?: string;
  examinerName?: string;
  examinerDesignation?: string;
}

export interface ResultRecordItem {
  regNo: string;
  studentName: string;
  deptKey: string;
  courseCode: string;
  courseTitle: string;
  credits?: number;
  semester: string;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
  gradePoints: number;
  resultStatus: "PASS" | "FAIL";
}

export interface ResultBatchRecord {
  id: string;
  batchTitle: string;
  departmentKey: string;
  departmentName: string;
  semester: string;
  academicYear: string;
  examMonthYear: string;
  subjectCode?: string;
  subjectTitle?: string;
  uploadDate: string;
  uploadedBy: string;
  totalStudents: number;
  passedStudents: number;
  passPercentage: number;
  publicationStatus: "DRAFT" | "VALIDATED" | "PUBLISHED";
  publishedAt?: string;
  publishedBy?: string;
  records: ResultRecordItem[];
  /** IAT-1, IAT-2 or End Semester */
  assessmentType?: string;
}

export interface DashboardDepartmentRow {
  deptKey: string;
  name: string;
  students: number;
  studentsWithoutDob: number;
  subjects: number;
  marksEntered: number;
  publishedBatches: number;
  passPercentage: number;
}

export interface PublishRow {
  subjectCode: string;
  subjectTitle: string;
  students: number;
  marksEntered: number;
  /**
   * NO_MARKS, NOT_FORWARDED (marks entered, faculty has not forwarded), FORWARDED (awaiting COE), PUBLISHED,
   * OUT_OF_DATE (marks changed after forwarding: faculty must forward again).
   */
  state: "NO_MARKS" | "NOT_FORWARDED" | "FORWARDED" | "PUBLISHED" | "OUT_OF_DATE";
  forwardedBy: string | null;
  batchId: string | null;
  publishedAt: string | null;
  publishedStudents: number;
  passPercentage: number;
}

export interface AdminDashboardStats {
  totalStudents: number;
  totalFaculty: number;
  studentsWithoutDob: number;
  marksEntered: number;
  departments: DashboardDepartmentRow[];
  totalDepartments: number;
  totalCourses: number;
  pendingResults: number;
  publishedResults: number;
  overallPassPercentage: number;
  recentUploads: {
    batchId: string;
    department: string;
    semester: string;
    students: number;
    status: "DRAFT" | "VALIDATED" | "PUBLISHED";
    date: string;
  }[];
}

export interface AuditLogRecord {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  timestamp: string;
  ipAddress: string;
  description: string;
}

// REST API Methods for Admin Panel

export const adminAuthApi = {
  async login(username: string, password: string): Promise<AdminAuthResponse> {
    const response = await apiClient.post<AdminAuthResponse>("/auth/login", {
      username,
      password,
      role: "admin",
    });
    if (response.data.token) {
      localStorage.setItem("kvell_admin_token", response.data.token);
      localStorage.setItem("kvell_admin_user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout() {
    const token = localStorage.getItem("kvell_admin_token");
    if (token) {
      // Send the token explicitly: it is removed from storage below before the request interceptor runs
      apiClient.post("/auth/logout", null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    }
    localStorage.removeItem("kvell_admin_token");
    localStorage.removeItem("kvell_admin_user");
    // The next account to sign in on this browser starts in its own college
    localStorage.removeItem("kvell_superadmin_view_college");
  },

  getCurrentUser(): AdminUser | null {
    const raw = localStorage.getItem("kvell_admin_user");
    return raw ? JSON.parse(raw) : null;
  },

  /** Replaces the password; other sessions of the account are signed out. */
  async changePassword(currentPassword: string, newPassword: string): Promise<AdminUser> {
    const response = await apiClient.post<AdminUser>("/auth/change-password", { currentPassword, newPassword });
    const stored = adminAuthApi.getCurrentUser();
    if (stored) {
      localStorage.setItem("kvell_admin_user", JSON.stringify({ ...stored, mustChangePassword: false }));
    }
    return response.data;
  },

  async getProfile(): Promise<StaffProfile> {
    return (await apiClient.get<StaffProfile>("/auth/profile")).data;
  },

  /** Saves the signed-in officer's own name and contact details; the new name shows in the header straight away. */
  async updateProfile(profile: StaffProfileUpdate): Promise<StaffProfile> {
    const saved = (await apiClient.put<StaffProfile>("/auth/profile", profile)).data;
    const stored = adminAuthApi.getCurrentUser();
    if (stored) {
      localStorage.setItem("kvell_admin_user", JSON.stringify({ ...stored, name: saved.name, email: saved.email || "" }));
    }
    return saved;
  },
};

export interface StaffProfile {
  username: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  role: string;
  collegeName: string | null;
  departmentName: string | null;
  lastLoginAt: string | null;
}

export interface StaffProfileUpdate {
  name: string;
  email: string;
  phone: string;
  designation: string;
}

export const adminDashboardApi = {
  async getStats(): Promise<AdminDashboardStats> {
    const res = await apiClient.get<AdminDashboardStats>("/admin/dashboard");
    return res.data;
  },
};

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationInbox {
  unread: number;
  items: NotificationItem[];
}

/** The signed-in user's notifications (bell icon). */
export const notificationsApi = {
  async inbox(): Promise<NotificationInbox> {
    return (await apiClient.get<NotificationInbox>("/notifications")).data;
  },
  async markRead(id: number): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await apiClient.post("/notifications/read-all");
  },
};

export const departmentsApi = {
  async list(): Promise<DepartmentRecord[]> {
    const res = await apiClient.get<DepartmentRecord[]>("/admin/departments");
    return res.data;
  },

  async create(dept: { key: string; name: string; code: string; headName: string; status?: string }): Promise<DepartmentRecord> {
    const res = await apiClient.post<DepartmentRecord>("/admin/departments", dept);
    return res.data;
  },

  async update(key: string, dept: { name: string; code: string; headName: string; status?: string }): Promise<DepartmentRecord> {
    const res = await apiClient.put<DepartmentRecord>(`/admin/departments/${encodeURIComponent(key)}`, dept);
    return res.data;
  },

  async remove(key: string): Promise<void> {
    await apiClient.delete(`/admin/departments/${encodeURIComponent(key)}`);
  },
};

export interface FacultyAddress {
  doorNo?: string | null;
  street?: string | null;
  city?: string | null;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  pincode?: string | null;
}
export interface FacultyQualification { qualification: string; discipline: string; completedOn: string }
export type EmploymentSection = "ENGINEERING" | "INDUSTRIAL" | "POLYTECHNIC";
export interface FacultyEmployment {
  section: EmploymentSection;
  designation: string;
  organisation: string;
  location: string;
  from: string;
  to: string;
}
export interface FacultyCourse { kind: "THEORY" | "PRACTICAL"; branch: string; course: string; timesOffered: number }
export interface FacultyExperience { section: string; years: number; months: number }

export interface FacultyInput {
  title: string;
  name: string;
  relationName: string;
  dept: string;
  gender: string;
  dob: string;
  designation: string;
  joinedServiceOn: string;
  joinedPostOn: string;
  aadhaar: string;
  commAddress: FacultyAddress;
  permAddress: FacultyAddress;
  residentialPhone: string;
  mobile: string;
  email: string;
  qualifications: FacultyQualification[];
  employment: FacultyEmployment[];
  courses: FacultyCourse[];
}

export interface FacultySummary {
  id: number;
  title: string;
  name: string;
  deptKey: string;
  deptName: string;
  designation: string;
  gender: string;
  mobile: string;
  email: string | null;
  joinedServiceOn: string;
  totalExperience: FacultyExperience;
  hasPhoto: boolean;
  updatedAt: string;
}

export interface FacultyDetail {
  id: number;
  title: string;
  name: string;
  relationName: string | null;
  deptKey: string;
  deptName: string;
  gender: string;
  dob: string;
  designation: string;
  joinedServiceOn: string;
  joinedPostOn: string;
  aadhaar: string | null;
  commAddress: FacultyAddress;
  permAddress: FacultyAddress;
  residentialPhone: string | null;
  mobile: string;
  email: string | null;
  qualifications: FacultyQualification[];
  employment: FacultyEmployment[];
  courses: FacultyCourse[];
  experience: FacultyExperience[];
  hasPhoto: boolean;
  hasSignature: boolean;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
}

/** Faculty master (Faculty Detail): the college COE adds and edits; the Chief COE can only read. */
export const facultyMasterApi = {
  async list(dept?: string): Promise<FacultySummary[]> {
    const res = await apiClient.get<FacultySummary[]>("/admin/faculty-master", { params: { dept: dept || undefined } });
    return res.data;
  },

  async get(id: number): Promise<FacultyDetail> {
    const res = await apiClient.get<FacultyDetail>(`/admin/faculty-master/${id}`);
    return res.data;
  },

  async create(input: FacultyInput): Promise<FacultyDetail> {
    const res = await apiClient.post<FacultyDetail>("/admin/faculty-master", input);
    return res.data;
  },

  async update(id: number, input: FacultyInput): Promise<FacultyDetail> {
    const res = await apiClient.put<FacultyDetail>(`/admin/faculty-master/${id}`, input);
    return res.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/admin/faculty-master/${id}`);
  },

  async uploadImage(id: number, kind: "photo" | "signature", file: File): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    await apiClient.post(`/admin/faculty-master/${id}/image`, form, {
      params: { kind },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000,
    });
  },

  /** The image as a blob (the request needs the sign-in token, so it can't be a plain <img src>). */
  async image(id: number, kind: "photo" | "signature"): Promise<Blob> {
    const res = await apiClient.get(`/admin/faculty-master/${id}/image`, { params: { kind }, responseType: "blob" });
    return res.data;
  },

  async removeImage(id: number, kind: "photo" | "signature"): Promise<void> {
    await apiClient.delete(`/admin/faculty-master/${id}/image`, { params: { kind } });
  },
};

export const studentsApi = {
  /** year / academicYear narrow the list to one class (e.g. "1st Year", "2026 - 2027"). */
  async list(dept?: string, semester?: string, year?: string, academicYear?: string): Promise<StudentRecord[]> {
    const res = await apiClient.get<StudentRecord[]>("/admin/students", { params: { dept, semester, year, academicYear } });
    return res.data;
  },

  /** Adds new students and updates existing ones. Rejects with 422 + row errors if any row is invalid. */
  async save(payload: {
    deptKey: string;
    year: string;
    semester: string;
    academicYear: string;
    students: StudentRowInput[];
  }): Promise<{ created: number; updated: number; total: number; withoutDob: number }> {
    // Large sheets (thousands of rows) take several seconds to validate and save
    const res = await apiClient.put("/admin/students", payload, { timeout: 120000 });
    return res.data;
  },

  async remove(regNo: string): Promise<void> {
    await apiClient.delete(`/admin/students/${encodeURIComponent(regNo)}`);
  },

  async removeGroup(dept: string, year: string, semester: string, academicYear?: string): Promise<number> {
    const res = await apiClient.delete<{ deleted: number }>("/admin/students", { params: { dept, year, semester, academicYear } });
    return res.data.deleted;
  },
};

/** One uploaded answer script (the PDF itself is fetched separately). */
export interface AnswerScriptInfo {
  regNo: string;
  subjectCode: string;
  assessmentType: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export const answerScriptsApi = {
  async list(dept: string, semester: string, assessment: string): Promise<AnswerScriptInfo[]> {
    const res = await apiClient.get<AnswerScriptInfo[]>("/admin/answer-scripts", { params: { dept, semester, assessment } });
    return res.data;
  },

  async upload(p: { dept: string; semester: string; subject: string; regNo: string; assessment: string }, file: File): Promise<AnswerScriptInfo> {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<AnswerScriptInfo>("/admin/answer-scripts", form, {
      params: p,
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    return res.data;
  },

  /** The PDF as a blob (the request needs the sign-in token, so it can't be a plain link). */
  async file(p: { dept: string; semester: string; subject: string; regNo: string; assessment: string }): Promise<Blob> {
    const res = await apiClient.get("/admin/answer-scripts/file", { params: p, responseType: "blob", timeout: 120000 });
    return res.data;
  },

  async remove(p: { dept: string; semester: string; subject: string; regNo: string; assessment: string }): Promise<void> {
    await apiClient.delete("/admin/answer-scripts", { params: p });
  },
};

export const subjectsApi = {
  async list(dept?: string): Promise<SubjectRecord[]> {
    const res = await apiClient.get<SubjectRecord[]>("/admin/subjects", { params: { dept } });
    return res.data;
  },

  async create(subject: Partial<SubjectRecord>): Promise<SubjectRecord> {
    const res = await apiClient.post<SubjectRecord>("/admin/subjects", subject);
    return res.data;
  },

  async setStatus(id: string, status: SubjectRecord["status"]): Promise<SubjectRecord> {
    const res = await apiClient.put<SubjectRecord>(`/admin/subjects/${id}/status`, { status });
    return res.data;
  },

  async finalizeAll(): Promise<void> {
    await apiClient.post("/admin/subjects/finalize");
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/admin/subjects/${id}`);
  },

  async removeAll(): Promise<void> {
    await apiClient.delete("/admin/subjects");
  },
};

export const marksApi = {
  async roster(dept: string, semester: string, subject: string, assessment: string): Promise<StudentMarkRecord[]> {
    const res = await apiClient.get<StudentMarkRecord[]>("/admin/marks", { params: { dept, semester, subject, assessment } });
    return res.data;
  },

  /** Every entered mark (published or not), for Analytics. */
  async all(): Promise<StudentMarkRecord[]> {
    const res = await apiClient.get<StudentMarkRecord[]>("/admin/marks/all");
    return res.data;
  },

  /** Saves one student's answer script; the server computes the totals and grade. */
  async save(payload: {
    deptKey: string;
    semester: string;
    subjectCode: string;
    regNo: string;
    assessmentType: string;
    partA: number[];
    partBC: Record<string, QuestionMarks>;
    examinerName: string;
    examinerDesignation: string;
  }): Promise<StudentMarkRecord> {
    const res = await apiClient.put<StudentMarkRecord>("/admin/marks", payload);
    return res.data;
  },
};

export const adminResultsApi = {
  async getResultBatches(): Promise<ResultBatchRecord[]> {
    const res = await apiClient.get<ResultBatchRecord[]>("/admin/results");
    return res.data;
  },

  /** Publishes ALL subjects of a department and semester together (server requires every mark to be entered). */
  async publishDepartment(payload: {
    deptKey: string;
    semester: string;
    academicYear: string;
    assessmentType: string;
  }): Promise<{
    deptKey: string;
    departmentName: string;
    semester: string;
    subjects: number;
    students: number;
    passedStudents: number;
    passPercentage: number;
    batchIds: string[];
  }> {
    const res = await apiClient.post("/admin/publish", payload, { timeout: 60000 });
    return res.data;
  },

  /**
   * "Approve & Publish" on a forwarded subject: the server publishes the whole department and semester the subject
   * belongs to, and refuses (409) until every subject is forwarded with marks for every student.
   */
  async publishResultBatch(batchId: string): Promise<{ success: boolean; message: string; publishedAt: string }> {
    const res = await apiClient.post(`/admin/results/${encodeURIComponent(batchId)}/publish`, null, { timeout: 60000 });
    const s = res.data;
    return {
      success: true,
      message: `Published ${s.subjects} subjects for ${s.students} students of ${s.departmentName} (${s.semester}).`,
      publishedAt: new Date().toLocaleString(),
    };
  },

  /** Hides every subject of a department and semester again; marks are kept. */
  async unpublishDepartment(payload: { deptKey: string; semester: string; assessmentType: string }): Promise<void> {
    await apiClient.post("/admin/publish/unpublish", payload);
  },

  async deleteResultBatch(batchId: string): Promise<{ success: boolean }> {
    await apiClient.delete(`/admin/results/${encodeURIComponent(batchId)}`);
    return { success: true };
  },

  async clearAllBatches(): Promise<{ success: boolean }> {
    await apiClient.delete("/admin/results/all");
    return { success: true };
  },

  async deleteBatchesBySemester(deptKey: string, semester: string): Promise<{ success: boolean; deletedCount: number }> {
    const res = await apiClient.delete<{ deleted: number }>("/admin/results", { params: { dept: deptKey, semester } });
    return { success: true, deletedCount: res.data.deleted };
  },

  /** Forwards one subject's marks (the COE's own Mark Entry counts as verified). */
  async forwardSubject(payload: {
    deptKey: string;
    semester: string;
    subjectCode: string;
    academicYear?: string;
    assessmentType: string;
  }): Promise<ResultBatchRecord> {
    const res = await apiClient.post<ResultBatchRecord>("/admin/forward", payload, { timeout: 60000 });
    return res.data;
  },

  async deleteBatchesBySubject(deptKey: string, semester: string, subjectCode: string): Promise<{ success: boolean; deletedCount: number }> {
    const res = await apiClient.delete<{ deleted: number }>("/admin/results", {
      params: { dept: deptKey, semester, subject: subjectCode },
    });
    return { success: true, deletedCount: res.data.deleted };
  },

  /** Every subject of a department and semester with its publication state (Publish Results page). */
  async getPublishStatus(dept: string, semester: string, assessment: string): Promise<PublishRow[]> {
    const res = await apiClient.get<PublishRow[]>("/admin/publish/status", { params: { dept, semester, assessment } });
    return res.data;
  },

  async getAuditLogs(): Promise<AuditLogRecord[]> {
    const res = await apiClient.get<AuditLogRecord[]>("/admin/audit-logs");
    return res.data;
  },
};

/**
 * The server now records every admin action in the audit log itself (with the real user and IP), so this
 * is kept only so existing screens can keep calling it; it just tells listeners that data changed.
 */
export function addAuditLog(_log: Omit<AuditLogRecord, "id" | "adminId" | "adminName" | "ipAddress">) {
  window.dispatchEvent(new Event("kvell_marks_updated"));
}

// ---------------------------------------------------------------------------------------------------------------
// Super Admin console (server: /api/super-admin, SUPER_ADMIN accounts only)

export interface OfficerAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "SUPER_ADMIN" | "COE_ENGINEERING" | "COE_NURSING" | "COE_PHARMACY" | "DEPUTY_COE";
  collegeKey: CollegeKey | "all";
  status: "ACTIVE" | "SUSPENDED";
  lastLogin: string;
  departmentScope: string;
  mustChangePassword: boolean;
}

export interface CollegeOverview {
  key: CollegeKey;
  name: string;
  coeName: string;
  departments: number;
  students: number;
  studentsWithoutDob: number;
  subjects: number;
  marksEntered: number;
  expectedScripts: number;
  publishedBatches: number;
  awaitingPublish: number;
  publishedRecords: number;
  passPercentage: number;
  lock: { locked: boolean; resultsLive: boolean; freezeSubmissions: boolean };
}

export interface SuperAuditEntry {
  id: string;
  college: string;
  actor: string;
  actorName: string;
  action: string;
  target: string;
  description: string;
  ipAddress: string | null;
  timestamp: string;
}

export interface StorageStats {
  databaseBytes: number;
  tables: { table: string; label: string; rows: number; bytes: number }[];
  configUpdatedBy: string;
  configUpdatedAt: string;
}

export const superAdminApi = {
  async officers(): Promise<OfficerAccount[]> {
    return (await apiClient.get<OfficerAccount[]>("/super-admin/officers")).data;
  },
  async createOfficer(body: { name: string; username: string; email: string; role: string; collegeKey: string; password: string }): Promise<OfficerAccount> {
    return (await apiClient.post<OfficerAccount>("/super-admin/officers", body)).data;
  },
  async setStatus(id: string, status: "ACTIVE" | "SUSPENDED"): Promise<OfficerAccount> {
    return (await apiClient.post<OfficerAccount>(`/super-admin/officers/${encodeURIComponent(id)}/status`, { status })).data;
  },
  async resetPassword(id: string, password: string): Promise<OfficerAccount> {
    return (await apiClient.post<OfficerAccount>(`/super-admin/officers/${encodeURIComponent(id)}/reset-password`, { password })).data;
  },
  async overview(): Promise<CollegeOverview[]> {
    return (await apiClient.get<CollegeOverview[]>("/super-admin/overview")).data;
  },
  async audit(limit = 500): Promise<SuperAuditEntry[]> {
    return (await apiClient.get<SuperAuditEntry[]>("/super-admin/audit", { params: { limit } })).data;
  },
  async storage(): Promise<StorageStats> {
    return (await apiClient.get<StorageStats>("/super-admin/storage")).data;
  },
  async exportBackup(): Promise<unknown> {
    return (await apiClient.get("/super-admin/export")).data;
  },
};

/** One college's COE data, read by the Super Admin without switching the inspected college. */
export const collegeViewApi = {
  async dashboard(college: CollegeKey): Promise<AdminDashboardStats> {
    return (await apiClient.get<AdminDashboardStats>("/admin/dashboard", { headers: { "X-College-View": college } })).data;
  },
  async departments(college: CollegeKey): Promise<DepartmentRecord[]> {
    return (await apiClient.get<DepartmentRecord[]>("/admin/departments", { headers: { "X-College-View": college } })).data;
  },
  async batches(college: CollegeKey): Promise<ResultBatchRecord[]> {
    return (await apiClient.get<ResultBatchRecord[]>("/admin/results", { headers: { "X-College-View": college } })).data;
  },
};

// Student revaluation requests for the signed-in COE's college

export interface RevaluationRequest {
  id: number;
  refId: string;
  regNo: string;
  studentName: string;
  deptKey: string;
  departmentName: string;
  semester: string;
  assessmentType: string;
  subjectCodes: string[];
  feePerCourse: number;
  totalFee: number;
  status: "SUBMITTED" | "IN_REVIEW" | "COMPLETED" | "REJECTED";
  note: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export const revaluationApi = {
  async list(): Promise<RevaluationRequest[]> {
    return (await apiClient.get<RevaluationRequest[]>("/admin/revaluation")).data;
  },
  async setStatus(id: number, status: RevaluationRequest["status"], note: string): Promise<RevaluationRequest> {
    return (await apiClient.post<RevaluationRequest>(`/admin/revaluation/${id}/status`, { status, note })).data;
  },
};

// ---- Internal marks (quiz, activity, assignment, attendance hours + IAT-1/IAT-2 -> internal mark)

/** quiz1 / activity1 / assignment1 go with IAT-1, quiz2 / ... with IAT-2; attendance is for the whole semester. */
export type InternalComponent = "quiz1" | "activity1" | "assignment1" | "quiz2" | "activity2" | "assignment2" | "attendance";

/** Each IAT cycle: IAT (of 100) x iatWeight + quiz + activity + assignment; the two cycles combine by cycleCombine. */
export interface InternalConfig {
  iatWeight: number;
  quiz: { max: number; weight: number };
  activity: { max: number; weight: number };
  assignment: { max: number; weight: number };
  cycleCombine: "AVERAGE" | "BEST" | "SUM";
  hoursPerSubject: number;
  attendanceWeight: number;
  attendanceSlabs: { minPercent: number; marks: number }[];
  rounding: "NEAREST" | "UP" | "NONE";
}

export interface InternalScheme {
  config: InternalConfig;
  maxMarks: number;
  confirmed: boolean;
  visibleToStudents: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface InternalCycle {
  iat: number;
  quiz: number;
  activity: number;
  assignment: number;
  total: number;
  max: number;
}

export interface InternalBreakdown {
  cycle1: InternalCycle;
  cycle2: InternalCycle;
  cycles: number;
  attendance: number;
  attendancePercent: number | null;
  total: number;
  max: number;
  complete: boolean;
}

export interface InternalRow {
  regNo: string;
  name: string;
  category: string;
  values: Partial<Record<InternalComponent, number>>;
  iat1: number | null;
  iat2: number | null;
  breakdown: InternalBreakdown;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface InternalRoster {
  deptKey: string;
  deptName: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  scheme: InternalScheme;
  rows: InternalRow[];
}

export interface InternalHistoryItem {
  regNo: string;
  component: InternalComponent;
  oldValue: number | null;
  newValue: number | null;
  changedBy: string;
  changedAt: string;
}

export const internalMarksApi = {
  async scheme(): Promise<InternalScheme> {
    return (await apiClient.get<InternalScheme>("/admin/internal-scheme")).data;
  },

  async saveScheme(config: InternalConfig, confirmed: boolean, visibleToStudents: boolean): Promise<InternalScheme> {
    return (await apiClient.put<InternalScheme>("/admin/internal-scheme", { config, confirmed, visibleToStudents })).data;
  },

  async roster(dept: string, semester: string, subject: string): Promise<InternalRoster> {
    return (await apiClient.get<InternalRoster>("/admin/internal-marks", { params: { dept, semester, subject } })).data;
  },

  async history(dept: string, semester: string, subject: string, regNo?: string): Promise<InternalHistoryItem[]> {
    return (await apiClient.get<InternalHistoryItem[]>("/admin/internal-marks/history", { params: { dept, semester, subject, regNo } })).data;
  },
};

