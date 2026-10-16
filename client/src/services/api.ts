import axios from "axios";

// Target Spring Boot REST API Backend URL (Configurable via VITE_API_BASE_URL)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 1500,
});

// Request Interceptor: Attach Bearer JWT Token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("kvell_auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interface DTOs matching Spring Boot REST JSON payloads

export interface LoginRequestDTO {
  username: string;
  password: string;
  role: "student" | "faculty";
}

export interface AuthResponseDTO {
  token: string;
  role: "student" | "faculty";
  user: {
    username: string;
    name: string;
    departmentKey?: string;
    departmentName?: string;
  };
}

export interface SubjectResultDTO {
  code: string;
  title: string;
  credits: number;
  grade: "O" | "A+" | "A" | "B+" | "B";
  gradePoints: number;
  status: "PASS" | "FAIL";
}

export interface PreviousSemesterResultDTO {
  semester: string;
  examMonthYear: string;
  sgpa: number;
  cgpa: number;
  totalCredits: number;
  resultStatus: "PASS - DISTINCTION" | "FIRST CLASS" | "PASS";
  subjects: SubjectResultDTO[];
}

export interface StudentRecordDTO {
  regNo: string;
  name: string;
  deptKey: "cse" | "ece" | "mech" | "eee" | "it";
  deptName: string;
  course: string;
  semester: string;
  year: "1st Year" | "2nd Year" | "3rd Year" | "4th Year";
  section: "Section A" | "Section B";
  batch: string;
  sgpa: number;
  cgpa: number;
  totalCredits: number;
  resultStatus: "PASS - DISTINCTION" | "FIRST CLASS" | "PASS";
  examMonthYear: string;
  rank?: number;
  badge?: string;
  subjects: SubjectResultDTO[];
  previousResults: PreviousSemesterResultDTO[];
}

export interface YearPassDataDTO {
  year: string;
  passPercentage: number;
  avgSgpa: number;
  total: number;
  passed: number;
}

export interface FacultyPerformanceDTO {
  rank: number;
  name: string;
  designation: string;
  subjectCode: string;
  subjectName: string;
  passPercentage: number;
  totalStudents: number;
  passedStudents: number;
  avgGradePoints: number;
  badge: string;
}

// REST API Service Endpoints to connect with Java / Spring Boot Backend

export const authApi = {
  /**
   * POST /api/auth/login
   * Java Spring Boot Endpoint: @PostMapping("/api/auth/login")
   */
  async login(payload: LoginRequestDTO): Promise<AuthResponseDTO> {
    const response = await apiClient.post<AuthResponseDTO>("/auth/login", payload);
    if (response.data.token) {
      localStorage.setItem("kvell_auth_token", response.data.token);
    }
    return response.data;
  },

  logout() {
    localStorage.removeItem("kvell_auth_token");
  },
};

export const studentApi = {
  /**
   * GET /api/students/{regNo}
   * Java Spring Boot Endpoint: @GetMapping("/api/students/{regNo}")
   */
  async getStudentByRegNo(regNo: string): Promise<StudentRecordDTO> {
    const response = await apiClient.get<StudentRecordDTO>(`/students/${regNo}`);
    return response.data;
  },

  /**
   * GET /api/students/{regNo}/previous-results
   * Java Spring Boot Endpoint: @GetMapping("/api/students/{regNo}/previous-results")
   */
  async getPreviousResults(regNo: string): Promise<PreviousSemesterResultDTO[]> {
    const response = await apiClient.get<PreviousSemesterResultDTO[]>(`/students/${regNo}/previous-results`);
    return response.data;
  },

  /**
   * GET /api/student/results
   * Java Spring Boot Endpoint: @GetMapping("/api/student/results")
   */
  async getPublishedResults(): Promise<{ success: boolean; results: any[] }> {
    const response = await apiClient.get<{ success: boolean; results: any[] }>("/student/results");
    return response.data;
  },
};

export const hodApi = {
  /**
   * GET /api/hod/candidates?dept=cse&year=3rd Year&section=Section A&query=aarav
   * Java Spring Boot Endpoint: @GetMapping("/api/hod/candidates")
   */
  async getCandidates(params: {
    dept: string;
    year?: string;
    section?: string;
    query?: string;
  }): Promise<StudentRecordDTO[]> {
    const response = await apiClient.get<StudentRecordDTO[]>("/hod/candidates", { params });
    return response.data;
  },

  /**
   * GET /api/hod/analytics/year-pass?dept=cse
   * Java Spring Boot Endpoint: @GetMapping("/api/hod/analytics/year-pass")
   */
  async getYearPassAnalytics(dept: string): Promise<YearPassDataDTO[]> {
    const response = await apiClient.get<YearPassDataDTO[]>("/hod/analytics/year-pass", {
      params: { dept },
    });
    return response.data;
  },

  /**
   * GET /api/hod/analytics/top-faculty?dept=cse
   * Java Spring Boot Endpoint: @GetMapping("/api/hod/analytics/top-faculty")
   */
  async getTopFacultyPerformance(dept: string): Promise<FacultyPerformanceDTO[]> {
    const response = await apiClient.get<FacultyPerformanceDTO[]>("/hod/analytics/top-faculty", {
      params: { dept },
    });
    return response.data;
  },
};

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

export function addAuditLog(log: {
  action: string;
  target: string;
  timestamp?: string;
  description: string;
}) {
  try {
    const logsKey = "kvell_audit_logs";
    const raw = localStorage.getItem(logsKey);
    const logs = raw ? JSON.parse(raw) : [];
    const newEntry = {
      id: `LOG-${1000 + logs.length + 1}`,
      adminId: "FACULTY-01",
      adminName: "Faculty Evaluator",
      ipAddress: "127.0.0.1",
      action: log.action,
      target: log.target,
      timestamp: log.timestamp || new Date().toISOString(),
      description: log.description,
    };
    logs.unshift(newEntry);
    localStorage.setItem(logsKey, JSON.stringify(logs));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error adding audit log:", e);
  }
}

export const adminResultsApi = {
  async getResultBatches(): Promise<ResultBatchRecord[]> {
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async createResultBatch(newBatch: ResultBatchRecord): Promise<{ success: boolean; batch: ResultBatchRecord }> {
    try {
      const raw = localStorage.getItem("kvell_custom_batches");
      const list: ResultBatchRecord[] = raw ? JSON.parse(raw) : [];
      list.unshift(newBatch);
      localStorage.setItem("kvell_custom_batches", JSON.stringify(list));
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
};
