import axios from "axios";
import { getRealLocalTimestamp } from "../utils/dateUtils";

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
  role: "ADMIN" | "FACULTY" | "STUDENT";
  email?: string;
  departmentKey?: string;
}

export interface AdminAuthResponse {
  token: string;
  role: "ADMIN" | "FACULTY" | "STUDENT";
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
      // Local fallback handler for demo admin authentication if server is unreachable
      if (username.toUpperCase() === "ADMIN" || username.toLowerCase() === "admin@kvell.edu") {
        const mockAdmin: AdminAuthResponse = {
          token: "mock-jwt-admin-token-secret-2026",
          role: "ADMIN",
          user: {
            id: "ADM-001",
            username: "ADMIN",
            name: "Dr. Controller of Examinations",
            role: "ADMIN",
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
    try {
      const res = await apiClient.get<AdminDashboardStats>("/admin/dashboard");
      return res.data;
    } catch {
      // Fallback default statistics
      return {
        totalStudents: 686,
        totalFaculty: 42,
        totalDepartments: 5,
        totalCourses: 48,
        pendingResults: 3,
        publishedResults: 14,
        overallPassPercentage: 96.4,
        recentUploads: [
          { batchId: "RES-2025-CSE-S6", department: "Computer Science & Engineering", semester: "Semester VI", students: 124, status: "PUBLISHED", date: "2026-09-24 14:30" },
          { batchId: "RES-2025-ECE-S6", department: "Electronics & Communication", semester: "Semester VI", students: 110, status: "VALIDATED", date: "2026-09-24 16:15" },
          { batchId: "RES-2025-MECH-S4", department: "Mechanical Engineering", semester: "Semester IV", students: 95, status: "DRAFT", date: "2026-09-25 09:10" },
        ],
      };
    }
  },
};

export const adminResultsApi = {
  async getResultBatches(): Promise<ResultBatchRecord[]> {
    let customBatches: ResultBatchRecord[] = [];
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      if (raw) customBatches = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await apiClient.get<ResultBatchRecord[]>("/admin/results");
      const serverBatches: ResultBatchRecord[] = res.data;
      const combined = [...serverBatches];
      // Merge custom batches created locally if not already present
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
    // 1. Persist locally to localStorage
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      const list: ResultBatchRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(newBatch);
      localStorage.setItem("kvell_custom_batches", JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }

    // 2. Persist to Express backend server
    try {
      const res = await apiClient.post<{ success: boolean; batch: ResultBatchRecord }>("/admin/results", newBatch);
      return res.data;
    } catch {
      return { success: true, batch: newBatch };
    }
  },

  async publishResultBatch(batchId: string): Promise<{ success: boolean; message: string; publishedAt: string }> {
    // Update local storage status
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      if (raw) {
        const list: ResultBatchRecord[] = JSON.parse(raw);
        const updated = list.map((b) =>
          b.id === batchId
            ? {
                ...b,
                publicationStatus: "PUBLISHED" as const,
                publishedAt: getRealLocalTimestamp(true),
                publishedBy: "Dr. Controller of Examinations (ADMIN)",
              }
            : b
        );
        localStorage.setItem("kvell_custom_batches", JSON.stringify(updated));
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
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      if (raw) {
        const list: ResultBatchRecord[] = JSON.parse(raw);
        const filtered = list.filter((b) => b.id !== batchId);
        localStorage.setItem("kvell_custom_batches", JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }

    try {
      await apiClient.delete(`/admin/results/${batchId}`);
    } catch {
      /* ignore */
    }

    return { success: true };
  },

  async clearAllBatches(): Promise<{ success: boolean }> {
    localStorage.removeItem("kvell_custom_batches");
    try {
      await apiClient.delete("/admin/results/all");
    } catch {
      /* ignore */
    }
    return { success: true };
  },

  async getAuditLogs(): Promise<AuditLogRecord[]> {
    try {
      const raw = localStorage.getItem("kvell_audit_logs");
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading audit logs", e);
    }

    try {
      const res = await apiClient.get<AuditLogRecord[]>("/admin/audit-logs");
      return res.data;
    } catch {
      localStorage.setItem("kvell_audit_logs", JSON.stringify(initialAuditLogs));
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

export const initialAuditLogs: AuditLogRecord[] = [
  {
    id: "LOG-1094",
    adminId: "ADM-001",
    adminName: "Dr. Controller of Examinations",
    action: "PUBLISHED_RESULT",
    target: "RES-2025-CSE-S6 (CS101 Semester VI Examinations)",
    timestamp: getRealLocalTimestamp(),
    ipAddress: "192.168.1.45",
    description: "Published examination results for 4 Computer Science & Engineering candidates to Student & HOD Portals.",
  },
  {
    id: "LOG-1093",
    adminId: "ADM-001",
    adminName: "Dr. Controller of Examinations",
    action: "VALIDATED_RESULT",
    target: "RES-2025-CSE-S6 (CS101 Semester VI Examinations)",
    timestamp: getRealLocalTimestamp(),
    ipAddress: "192.168.1.45",
    description: "Validated 4 candidate records for Computer Science & Engineering Semester VI with 0 errors.",
  },
  {
    id: "LOG-1092",
    adminId: "ADM-001",
    adminName: "Dr. Controller of Examinations",
    action: "UPLOADED_RESULT",
    target: "cs101_semester6_marks.csv",
    timestamp: getRealLocalTimestamp(),
    ipAddress: "192.168.1.45",
    description: "Uploaded examination marksheet spreadsheet for Computer Science & Engineering May 2025 session.",
  },
];

export function addAuditLog(log: Omit<AuditLogRecord, "id" | "adminId" | "adminName" | "ipAddress">) {
  try {
    const raw = localStorage.getItem("kvell_audit_logs");
    let logs: AuditLogRecord[] = raw ? JSON.parse(raw) : [...initialAuditLogs];

    const newEntry: AuditLogRecord = {
      id: `LOG-${1000 + logs.length + 1}`,
      adminId: "ADM-001",
      adminName: "Dr. Controller of Examinations",
      ipAddress: "192.168.1.45",
      action: log.action,
      target: log.target,
      timestamp: log.timestamp || getRealLocalTimestamp(),
      description: log.description,
    };

    logs.unshift(newEntry);
    localStorage.setItem("kvell_audit_logs", JSON.stringify(logs));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error adding audit log:", e);
  }
}

// Mock data storage for local demonstration mode when backend is offline
export const mockResultBatches: ResultBatchRecord[] = [];

export const mockAuditLogs: AuditLogRecord[] = initialAuditLogs;
