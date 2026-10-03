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
