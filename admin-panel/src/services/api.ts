import axios from "axios";
import { getRealLocalTimestamp } from "../utils/dateUtils";
import { seedDummyMarksForDepts, ensureDummyMarksLoaded } from "../data/dummyMarksData";
import { getScopedKey, getActiveCollegeKey, getActiveCollege, AdminRole, CollegeKey, COLLEGES } from "../utils/rbac";

// Environment-configured API URL connecting to Spring Boot backend
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 1500,
});

// Interceptor: Attach Bearer JWT token if authenticated
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("kvell_admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Types & DTO Interfaces matching existing backend schema

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  collegeKey: CollegeKey;
  collegeName: string;
  email: string;
  departmentKey?: string;
}

export interface AdminAuthResponse {
  token: string;
  role: AdminRole;
  user: AdminUser;
}

export interface StudentRecord {
  id: string;
  regNo: string;
  name: string;
  email: string;
  deptKey: string;
  deptName: string;
  course: string;
  semester: string;
  year: string;
  section: string;
  batch: string;
  sgpa: number;
  cgpa: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface FacultyRecord {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  deptKey: string;
  deptName: string;
  assignedSubjects: string[];
  status: "ACTIVE" | "INACTIVE";
}

export interface DepartmentRecord {
  id: string;
  key: string;
  name: string;
  code: string;
  headName: string;
  totalStudents: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface CourseRecord {
  id: string;
  code: string;
  title: string;
  credits: number;
  deptKey: string;
  semester: string;
  year: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface ResultRecordItem {
  regNo: string;
  studentName: string;
  dob?: string;
  deptKey: string;
  courseCode: string;
  courseTitle: string;
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
  uploadDate: string;
  uploadedBy: string;
  totalStudents: number;
  passedStudents: number;
  passPercentage: number;
  publicationStatus: "DRAFT" | "VALIDATED" | "PUBLISHED";
  publishedAt?: string;
  publishedBy?: string;
  records: ResultRecordItem[];
}

export interface ValidationErrorItem {
  row: number;
  regNo: string;
  courseCode: string;
  error: string;
  field: string;
}

export interface ValidationResponse {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  errors: ValidationErrorItem[];
  preview: ResultRecordItem[];
}

export interface AdminDashboardStats {
  totalStudents: number;
  totalFaculty: number;
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
    const cleanUser = (username || "").trim().toUpperCase();

    try {
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
    } catch (err: any) {
      // Dynamic Officer Check: Inspect officers provisioned by Super Admin Dr. Sathish
      try {
        const rawOfficers = localStorage.getItem("kvell_officer_users");
        if (rawOfficers) {
          const officers = JSON.parse(rawOfficers);
          if (Array.isArray(officers)) {
            const matchedOfficer = officers.find(
              (o: any) =>
                (o.username && o.username.trim().toUpperCase() === cleanUser) ||
                (o.email && o.email.trim().toUpperCase() === cleanUser)
            );

            if (matchedOfficer) {
              if (matchedOfficer.status === "SUSPENDED") {
                throw new Error("Access Denied: Account has been SUSPENDED by Overall University COE (Dr. Sathish).");
              }

              if (matchedOfficer.customPassword && password && matchedOfficer.customPassword !== password) {
                throw new Error("Invalid Credentials for provisioned officer account.");
              }

              const resolvedRole = matchedOfficer.role || (cleanUser.includes("SATHISH") ? "SUPER_ADMIN" : "COE_ENGINEERING");
              const collegeKey = matchedOfficer.collegeKey === "all" ? "engineering" : (matchedOfficer.collegeKey || "engineering");
              const collegeConf = COLLEGES[collegeKey as CollegeKey];

              const officerAuth: AdminAuthResponse = {
                token: `mock-jwt-${matchedOfficer.username.toLowerCase()}-token`,
                role: resolvedRole,
                user: {
                  id: matchedOfficer.id || "ADM-PROV-001",
                  username: matchedOfficer.username,
                  name: matchedOfficer.name,
                  role: resolvedRole,
                  collegeKey: collegeKey as CollegeKey,
                  collegeName: collegeConf ? collegeConf.name : "Karpaga Vinayaga Educational Group",
                  email: matchedOfficer.email,
                },
              };

              localStorage.setItem("kvell_admin_token", officerAuth.token);
              localStorage.setItem("kvell_admin_user", JSON.stringify(officerAuth.user));
              return officerAuth;
            }
          }
        }
      } catch (officerErr: any) {
        if (officerErr.message?.includes("Access Denied") || officerErr.message?.includes("Invalid Credentials")) {
          throw officerErr;
        }
      }

      // 0. Super Admin (Dr. Sathish - Overall University COE & Super Administrator)
      if (
        cleanUser === "SATHISH" ||
        cleanUser.includes("SATHISH") ||
        cleanUser.includes("SUPERADMIN") ||
        cleanUser === "SUPER"
      ) {
        const mockSuperAdmin: AdminAuthResponse = {
          token: "mock-jwt-superadmin-sathish-token-2026",
          role: "SUPER_ADMIN",
          user: {
            id: "ADM-SUPER-001",
            username: "Sathish",
            name: "Dr. Sathish",
            role: "SUPER_ADMIN",
            collegeKey: "engineering",
            collegeName: "Karpaga Vinayaga Educational Group (Central University)",
            email: "coe.sathish@kvell.edu.in",
          },
        };
        localStorage.setItem("kvell_admin_token", mockSuperAdmin.token);
        localStorage.setItem("kvell_admin_user", JSON.stringify(mockSuperAdmin.user));
        return mockSuperAdmin;
      }

      // 1. Nursing College COE
      if (cleanUser.includes("NURSING") || cleanUser === "NUR") {
        const mockNursingAdmin: AdminAuthResponse = {
          token: "mock-jwt-nursing-coe-token-2026",
          role: "COE_NURSING",
          user: {
            id: "ADM-NUR-001",
            username: "COE_NURSING",
            name: "Dr. Controller of Examinations (Nursing)",
            role: "COE_NURSING",
            collegeKey: "nursing",
            collegeName: "KVELL College of Nursing",
            email: "coe.nursing@kvell.edu.in",
          },
        };
        localStorage.setItem("kvell_admin_token", mockNursingAdmin.token);
        localStorage.setItem("kvell_admin_user", JSON.stringify(mockNursingAdmin.user));
        return mockNursingAdmin;
      }

      // 2. Pharmacy College COE
      if (cleanUser.includes("PHARM") || cleanUser === "PHARMA") {
        const mockPharmacyAdmin: AdminAuthResponse = {
          token: "mock-jwt-pharmacy-coe-token-2026",
          role: "COE_PHARMACY",
          user: {
            id: "ADM-PHARM-001",
            username: "COE_PHARMACY",
            name: "Dr. Controller of Examinations (Pharmacy)",
            role: "COE_PHARMACY",
            collegeKey: "pharmacy",
            collegeName: "KVELL College of Pharmacy",
            email: "coe.pharmacy@kvell.edu.in",
          },
        };
        localStorage.setItem("kvell_admin_token", mockPharmacyAdmin.token);
        localStorage.setItem("kvell_admin_user", JSON.stringify(mockPharmacyAdmin.user));
        return mockPharmacyAdmin;
      }

      // 3. Engineering COE (Main / Admin account)
      if (
        cleanUser === "ADMIN" ||
        cleanUser.includes("ENG") ||
        cleanUser === "ADMIN@KVELL.EDU" ||
        cleanUser.length > 0
      ) {
        const mockAdmin: AdminAuthResponse = {
          token: "mock-jwt-admin-token-secret-2026",
          role: "COE_ENGINEERING",
          user: {
            id: "ADM-001",
            username: "ADMIN",
            name: "Dr. Controller of Examinations (Engineering)",
            role: "COE_ENGINEERING",
            collegeKey: "engineering",
            collegeName: "KVELL Institute of Technology",
            email: "admin@kvell.edu.in",
          },
        };
        localStorage.setItem("kvell_admin_token", mockAdmin.token);
        localStorage.setItem("kvell_admin_user", JSON.stringify(mockAdmin.user));
        return mockAdmin;
      }

      throw err;
    }
  },

  logout() {
    localStorage.removeItem("kvell_admin_token");
    localStorage.removeItem("kvell_admin_user");
  },

  getCurrentUser(): AdminUser | null {
    const raw = localStorage.getItem("kvell_admin_user");
    return raw ? JSON.parse(raw) : null;
  },
};

export const adminDashboardApi = {
  async getStats(): Promise<AdminDashboardStats> {
    const activeCollege = getActiveCollegeKey();

    try {
      const res = await apiClient.get<AdminDashboardStats>(`/admin/dashboard?college=${activeCollege}`);
      return res.data;
    } catch {
      // Nursing and Pharmacy start with clean empty state (NO pre-seeded data)
      if (activeCollege !== "engineering") {
        let totalStudents = 0;
        let totalCourses = 0;
        let totalDepartments = 0;
        let totalFaculty = 0;
        let pendingResults = 0;
        let publishedResults = 0;
        let overallPassPercentage = 0;
        let recentUploads: AdminDashboardStats["recentUploads"] = [];

        try {
          const rawDepts = localStorage.getItem(getScopedKey("kvell_departments"));
          if (rawDepts) {
            const depts = JSON.parse(rawDepts);
            if (Array.isArray(depts)) {
              totalDepartments = depts.length;
              totalFaculty = depts.filter((d: any) => d.headName && d.headName !== "Not assigned").length;
            }
          }
        } catch {}

        try {
          const rawSubjects = localStorage.getItem(getScopedKey("kvell_admin_subjects"));
          if (rawSubjects) {
            const subjects = JSON.parse(rawSubjects);
            if (Array.isArray(subjects)) {
              totalCourses = subjects.length;
            }
          }
        } catch {}

        try {
          const rawBatches = localStorage.getItem(getScopedKey("kvell_custom_batches"));
          if (rawBatches) {
            const batches = JSON.parse(rawBatches);
            if (Array.isArray(batches)) {
              publishedResults = batches.filter((b: any) => b.publicationStatus === "PUBLISHED").length;
              pendingResults = batches.filter((b: any) => b.publicationStatus !== "PUBLISHED").length;
              recentUploads = batches.map((b: any) => ({
                batchId: b.id,
                department: b.departmentName || b.departmentKey?.toUpperCase() || "General",
                semester: b.semester,
                students: b.totalStudents || 0,
                status: b.publicationStatus || "DRAFT",
                date: b.uploadDate || "",
              }));
              const passRates = batches
                .map((b: any) => Number(b.passPercentage) || 0)
                .filter((p: number) => p > 0);
              if (passRates.length > 0) {
                overallPassPercentage = Number(
                  (passRates.reduce((a: number, b: number) => a + b, 0) / passRates.length).toFixed(1)
                );
              }
            }
          }
        } catch {}

        // Calculate unique students for this college
        const uniqueRegs = new Set<string>();
        const studentPrefix = getScopedKey("kvell_dept_students_");
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(studentPrefix)) {
              const raw = localStorage.getItem(k);
              if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                  list.forEach((s: any) => {
                    const reg = s.regNo || s["Register Number"];
                    if (reg && reg !== "undefined") uniqueRegs.add(String(reg).trim());
                  });
                }
              }
            }
          }
        } catch {}

        try {
          const rawSt = localStorage.getItem(getScopedKey("kvell_students"));
          if (rawSt) {
            const st = JSON.parse(rawSt);
            if (Array.isArray(st)) {
              st.forEach((s: any) => {
                if (s && s.regNo) uniqueRegs.add(String(s.regNo).trim());
              });
            }
          }
        } catch {}

        totalStudents = uniqueRegs.size;

        return {
          totalStudents,
          totalFaculty,
          totalDepartments,
          totalCourses,
          pendingResults,
          publishedResults,
          overallPassPercentage,
          recentUploads,
        };
      }

      // Existing Engineering College Stats
      ensureDummyMarksLoaded();

      let totalStudents = 0;
      let totalCourses = 0;
      let totalDepartments = 12;
      let totalFaculty = 12;
      let pendingResults = 0;
      let publishedResults = 0;
      let overallPassPercentage = 0;
      let recentUploads: AdminDashboardStats["recentUploads"] = [];

      try {
        const rawDepts = localStorage.getItem("kvell_departments");
        if (rawDepts) {
          const depts = JSON.parse(rawDepts);
          if (Array.isArray(depts) && depts.length > 0) {
            totalDepartments = depts.length;
            totalFaculty = depts.filter((d: any) => d.headName && d.headName !== "Not assigned").length || depts.length;
          }
        }
      } catch {}

      try {
        const rawSubjects = localStorage.getItem("kvell_admin_subjects");
        if (rawSubjects) {
          const subjects = JSON.parse(rawSubjects);
          if (Array.isArray(subjects) && subjects.length > 0) {
            totalCourses = subjects.length;
          }
        }
      } catch {}
      if (totalCourses === 0) {
        totalCourses = 18;
      }

      try {
        const rawBatches = localStorage.getItem("kvell_custom_batches");
        if (rawBatches) {
          const batches = JSON.parse(rawBatches);
          if (Array.isArray(batches)) {
            publishedResults = batches.filter((b: any) => b.publicationStatus === "PUBLISHED").length;
            pendingResults = batches.filter((b: any) => b.publicationStatus !== "PUBLISHED").length;
            recentUploads = batches.map((b: any) => ({
              batchId: b.id,
              department: b.departmentName || b.departmentKey?.toUpperCase() || "General",
              semester: b.semester,
              students: b.totalStudents || 0,
              status: b.publicationStatus || "DRAFT",
              date: b.uploadDate || "",
            }));
            const passRates = batches
              .map((b: any) => Number(b.passPercentage) || 0)
              .filter((p: number) => p > 0);
            if (passRates.length > 0) {
              overallPassPercentage = Number(
                (passRates.reduce((a: number, b: number) => a + b, 0) / passRates.length).toFixed(1)
              );
            }
          }
        }
      } catch {}

      // Calculate unique active students across all department rosters & marks
      const uniqueStudentRegs = new Set<string>();

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("kvell_dept_students_")) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((s: any) => {
                  const reg = s.regNo || s["Register Number"];
                  if (reg && reg !== "undefined") uniqueStudentRegs.add(String(reg).trim());
                });
              }
            }
          }
        }
      } catch {}

      try {
        const rawStudents = localStorage.getItem("kvell_students");
        if (rawStudents) {
          const st = JSON.parse(rawStudents);
          if (Array.isArray(st)) {
            st.forEach((s: any) => {
              if (s && s.regNo && s.regNo !== "undefined") uniqueStudentRegs.add(String(s.regNo).trim());
            });
          }
        }
      } catch {}

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("kvell_marks_")) {
            const raw = localStorage.getItem(k);
            if (raw) {
              const studentDict = JSON.parse(raw);
              if (studentDict && typeof studentDict === "object") {
                Object.keys(studentDict).forEach((reg) => {
                  if (reg && reg !== "undefined") uniqueStudentRegs.add(String(reg).trim());
                });
              }
            }
          }
        }
      } catch {}

      totalStudents = uniqueStudentRegs.size > 0 ? uniqueStudentRegs.size : 85;

      return {
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalCourses,
        pendingResults,
        publishedResults,
        overallPassPercentage,
        recentUploads,
      };
    }
  },
};

export const adminResultsApi = {
  async getResultBatches(): Promise<ResultBatchRecord[]> {
    const activeCollege = getActiveCollegeKey();
    const batchesKey = getScopedKey("kvell_custom_batches");

    // For Nursing and Pharmacy: read only scoped custom batches, do not seed dummy engineering marks
    if (activeCollege !== "engineering") {
      let customBatches: ResultBatchRecord[] = [];
      try {
        const raw = localStorage.getItem(batchesKey);
        if (raw) customBatches = JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }
      return customBatches;
    }

    // Engineering college: seed dummy marks if needed
    ensureDummyMarksLoaded();
    let customBatches: ResultBatchRecord[] = [];
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      if (raw) customBatches = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }

    if (customBatches.length === 0) {
      try {
        seedDummyMarksForDepts();
        const fresh = localStorage.getItem("kvell_custom_batches");
        if (fresh) customBatches = JSON.parse(fresh);
      } catch (e) {
        console.error(e);
      }
    }

    try {
      const res = await apiClient.get<ResultBatchRecord[]>("/admin/results");
      const serverBatches: ResultBatchRecord[] = res.data;
      const combined = [...serverBatches];
      customBatches.forEach((cb) => {
        const idx = combined.findIndex((sb) => sb.id === cb.id);
        if (idx >= 0) {
          combined[idx] = { ...combined[idx], ...cb };
        } else {
          combined.unshift(cb);
        }
      });
      return combined;
    } catch {
      return [...customBatches, ...mockResultBatches];
    }
  },

  async createResultBatch(newBatch: ResultBatchRecord): Promise<{ success: boolean; batch: ResultBatchRecord }> {
    const batchesKey = getScopedKey("kvell_custom_batches");
    try {
      const raw = localStorage.getItem(batchesKey);
      const list: ResultBatchRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(newBatch);
      localStorage.setItem(batchesKey, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await apiClient.post<{ success: boolean; batch: ResultBatchRecord }>("/admin/results", newBatch);
      return res.data;
    } catch {
      return { success: true, batch: newBatch };
    }
  },

  async publishResultBatch(batchId: string): Promise<{ success: boolean; message: string; publishedAt: string }> {
    const batchesKey = getScopedKey("kvell_custom_batches");
    const activeCollege = getActiveCollege();

    try {
      const raw = localStorage.getItem(batchesKey);
      if (raw) {
        const list: ResultBatchRecord[] = JSON.parse(raw);
        const updated = list.map((b) =>
          b.id === batchId
            ? {
                ...b,
                publicationStatus: "PUBLISHED" as const,
                publishedAt: getRealLocalTimestamp(true),
                publishedBy: `${activeCollege.coeTitle} (${activeCollege.code})`,
              }
            : b
        );
        localStorage.setItem(batchesKey, JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await apiClient.post(`/admin/results/${batchId}/publish`);
      return res.data;
    } catch {
      return {
        success: true,
        message: "Result batch status updated to PUBLISHED",
        publishedAt: getRealLocalTimestamp(true),
      };
    }
  },

  async deleteResultBatch(batchId: string): Promise<{ success: boolean }> {
    const batchesKey = getScopedKey("kvell_custom_batches");
    try {
      const raw = localStorage.getItem(batchesKey);
      if (raw) {
        const list: ResultBatchRecord[] = JSON.parse(raw);
        const filtered = list.filter((b) => b.id !== batchId);
        localStorage.setItem(batchesKey, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }

    try {
      await apiClient.delete(`/admin/results/${batchId}`);
    } catch {}

    return { success: true };
  },

  async clearAllBatches(): Promise<{ success: boolean }> {
    const batchesKey = getScopedKey("kvell_custom_batches");
    localStorage.removeItem(batchesKey);
    try {
      await apiClient.delete("/admin/results/all");
    } catch {}
    return { success: true };
  },

  async deleteBatchesBySemester(deptKey: string, semester: string): Promise<{ success: boolean; deletedCount: number }> {
    const batchesKey = getScopedKey("kvell_custom_batches");
    let deletedCount = 0;
    try {
      const raw = localStorage.getItem(batchesKey);
      if (raw) {
        const list: ResultBatchRecord[] = JSON.parse(raw);
        const remaining = list.filter((b) => {
          const match =
            (b.departmentKey || "").toLowerCase() === deptKey.toLowerCase() &&
            (b.semester || "").toLowerCase() === semester.toLowerCase();
          if (match) deletedCount++;
          return !match;
        });
        localStorage.setItem(batchesKey, JSON.stringify(remaining));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {
      console.error(e);
    }
    return { success: true, deletedCount };
  },

  async deleteBatchesBySubject(deptKey: string, semester: string, subjectCode: string): Promise<{ success: boolean; deletedCount: number }> {
    const batchesKey = getScopedKey("kvell_custom_batches");
    let deletedCount = 0;
    try {
      const raw = localStorage.getItem(batchesKey);
      if (raw) {
        const list: ResultBatchRecord[] = JSON.parse(raw);
        const remaining = list.filter((b) => {
          const deptMatch = (b.departmentKey || "").toLowerCase() === deptKey.toLowerCase();
          const semMatch = (b.semester || "").toLowerCase() === semester.toLowerCase();
          const codeMatch =
            (b.batchTitle || "").toLowerCase().includes(subjectCode.toLowerCase()) ||
            b.records?.some((r) => (r.courseCode || "").toLowerCase() === subjectCode.toLowerCase());
          const match = deptMatch && semMatch && codeMatch;
          if (match) deletedCount++;
          return !match;
        });
        localStorage.setItem(batchesKey, JSON.stringify(remaining));
        window.dispatchEvent(new Event("storage"));
      }
    } catch (e) {
      console.error(e);
    }
    return { success: true, deletedCount };
  },

  async getAuditLogs(): Promise<AuditLogRecord[]> {
    const logsKey = getScopedKey("kvell_audit_logs");
    try {
      const raw = localStorage.getItem(logsKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading audit logs", e);
    }

    try {
      const res = await apiClient.get<AuditLogRecord[]>("/admin/audit-logs");
      return res.data;
    } catch {
      localStorage.setItem(logsKey, JSON.stringify(initialAuditLogs));
      return initialAuditLogs;
    }
  },

  async uploadAndValidate(formData: FormData): Promise<ValidationResponse> {
    const res = await apiClient.post<ValidationResponse>("/admin/results/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export const initialAuditLogs: AuditLogRecord[] = [];

export function addAuditLog(log: Omit<AuditLogRecord, "id" | "adminId" | "adminName" | "ipAddress">) {
  try {
    const logsKey = getScopedKey("kvell_audit_logs");
    const raw = localStorage.getItem(logsKey);
    let logs: AuditLogRecord[] = raw ? JSON.parse(raw) : [...initialAuditLogs];
    const user = adminAuthApi.getCurrentUser();
    const college = getActiveCollege();

    const newEntry: AuditLogRecord = {
      id: `LOG-${1000 + logs.length + 1}`,
      adminId: user?.id || "ADM-001",
      adminName: user?.name || college.coeTitle,
      ipAddress: "192.168.1.45",
      action: log.action,
      target: log.target,
      timestamp: log.timestamp || getRealLocalTimestamp(),
      description: log.description,
    };

    logs.unshift(newEntry);
    localStorage.setItem(logsKey, JSON.stringify(logs));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error adding audit log:", e);
  }
}

// Mock data storage for local demonstration mode when backend is offline
export const mockResultBatches: ResultBatchRecord[] = [];

export const mockAuditLogs: AuditLogRecord[] = initialAuditLogs;

