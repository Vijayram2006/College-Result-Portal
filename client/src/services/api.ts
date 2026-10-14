import axios from "axios";

// Target Spring Boot REST API Backend URL (Configurable via VITE_API_BASE_URL)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer token if available
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

// An account that still has its shared starting password must choose its own first (PasswordChangeGate)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 403 && error.response.data?.passwordChangeRequired) {
      window.dispatchEvent(new Event("kvell:password-change-required"));
    }
    return Promise.reject(error);
  }
);

/** Human-readable message from an API error ({ error: "..." } bodies). */
export function apiErrorMessage(err: any, fallback = "Request failed. Please try again."): string {
  if (!err?.response) return "Cannot reach the result server. Please try again shortly.";
  return err.response.data?.error || fallback;
}

// DTOs matching the Spring Boot backend

export type PortalRole = "student" | "hod" | "faculty" | "admin";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: "ADMIN" | "HOD" | "STUDENT" | "FACULTY";
  departmentKey?: string;
  collegeKey?: "engineering" | "nursing" | "pharmacy";
  collegeName?: string;
  departmentName?: string;
  regNo?: string;
  /** Still has the shared starting password: must choose a new one before using the portal. */
  mustChangePassword?: boolean;
}

export interface AuthResponseDTO {
  token: string;
  role: "ADMIN" | "HOD" | "STUDENT" | "FACULTY";
  user: AuthUser;
}

export interface SubjectResultDTO {
  code: string;
  title: string;
  credits: number;
  internal: number; // Part A total
  external: number; // Part B + C total
  total: number;
  grade: string;
  gradePoints: number;
  status: "PASS" | "FAIL";
  publishedAt?: string;
}

/** One published assessment of a semester. IAT-1 / IAT-2 are internal tests: no SGPA (null). */
export interface SemesterResultDTO {
  semester: number;
  semesterLabel: string;
  assessmentType: "IAT-1" | "IAT-2" | "End Semester";
  internalAssessment: boolean;
  examMonthYear: string;
  academicYear: string;
  sgpa: number | null;
  totalCredits: number;
  earnedCredits: number;
  result: "PASS" | "FAIL";
  totalMarks: number;
  maxMarks: number;
  subjects: SubjectResultDTO[];
}

export interface StudentResultsDTO {
  profile: {
    regNo: string;
    name: string;
    departmentKey: string;
    departmentName: string;
    category: "regular" | "lateral";
    year: string;
    currentSemester: number;
    currentSemesterLabel: string;
    academicYear: string;
  };
  semesters: SemesterResultDTO[];
  /** From End Semester results only; null while only internal assessments are published. */
  cgpa: number | null;
  overallResult: string;
  arrears: number;
}

export interface HodOverviewDTO {
  departmentKey: string;
  departmentName: string;
  overallPassPercentage: number;
  studentsWithResults: number;
  yearPass: { name: string; passPercentage: number; students: number }[];
  students: {
    reg: string;
    name: string;
    year: string;
    sem: string;
    section: string;
    average: number | null;
    status: "PASS" | "FAIL" | "AWAITING";
  }[];
  /** Examiners of the department's published subjects, best pass percentage first. */
  topFaculty: {
    rank: number;
    name: string;
    designation: string;
    subjectCode: string;
    subjectTitle: string;
    passPercentage: number;
    students: number;
  }[];
}

/** Aggregate figures for the public login page and banners (no personal data). */
export interface PublicSummaryDTO {
  lastPublishedAt: string | null;
  lastPublishedLabel: string | null;
  passPercentage: number;
  studentsWithResults: number;
}

export const publicApi = {
  async summary(): Promise<PublicSummaryDTO> {
    return (await apiClient.get<PublicSummaryDTO>("/public/summary")).data;
  },
};

export const authApi = {
  /** Students sign in with Register Number + Date of Birth; HOD and Admin with username + password. */
  async login(username: string, password: string, role: PortalRole): Promise<AuthResponseDTO> {
    const response = await apiClient.post<AuthResponseDTO>("/auth/login", { username, password, role });
    if (response.data.token) {
      localStorage.setItem("kvell_auth_token", response.data.token);
      localStorage.setItem("kvell_auth_user", JSON.stringify(response.data.user));
      if (response.data.user.mustChangePassword) {
        window.dispatchEvent(new Event("kvell:password-change-required"));
      }
    }
    return response.data;
  },

  /** Staff replace their password; other sessions of the account are signed out. */
  async changePassword(currentPassword: string, newPassword: string): Promise<AuthUser> {
    const response = await apiClient.post<AuthUser>("/auth/change-password", { currentPassword, newPassword });
    const stored = authApi.currentUser();
    if (stored) {
      localStorage.setItem("kvell_auth_user", JSON.stringify({ ...stored, mustChangePassword: false }));
    }
    return response.data;
  },

  logout() {
    const token = localStorage.getItem("kvell_auth_token");
    if (token) {
      // Send the token explicitly: it is removed from storage below before the request interceptor runs
      apiClient.post("/auth/logout", null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    }
    localStorage.removeItem("kvell_auth_token");
    localStorage.removeItem("kvell_auth_user");
  },

  /** The signed-in user as returned at login (faculty use it for their department). */
  currentUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem("kvell_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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

/** The signed-in user's notifications (bell icon): students, faculty and HODs each get their own. */
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

export const studentApi = {
  /** The signed-in student's own published results. */
  async getMyResults(): Promise<StudentResultsDTO> {
    const response = await apiClient.get<StudentResultsDTO>("/student/me/results");
    return response.data;
  },

  /** COE-finalized subjects of the student's own department and semester. */
  async getMySubjects(): Promise<RegisteredSubjectDTO[]> {
    const response = await apiClient.get<RegisteredSubjectDTO[]>("/student/me/subjects");
    return response.data;
  },
};

export interface RegisteredSubjectDTO {
  code: string;
  title: string;
  credits: number;
  category: string;
  faculty: string;
}

export const hodApi = {
  /** Pass percentages and student list for the signed-in HOD's department (published results only). */
  async getOverview(): Promise<HodOverviewDTO> {
    const response = await apiClient.get<HodOverviewDTO>("/hod/overview");
    return response.data;
  },
};

export interface FacultySubjectDTO {
  id: string;
  code: string;
  title: string;
  deptKey: string;
  department: string;
  semester: string;
  credits: number;
  status: string;
}

export interface MarkSubdivisions {
  i: number;
  ii: number;
  iii: number;
}

export interface QuestionMarks {
  a: MarkSubdivisions;
  b: MarkSubdivisions;
}

/** One row of the faculty Mark Entry roster. */
export interface StudentMarkDTO {
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

/** Forwarding / publication state of one subject (NOT_FORWARDED, FORWARDED, PUBLISHED, OUT_OF_DATE, NO_MARKS). */
export interface SubjectStatusDTO {
  subjectCode: string;
  subjectTitle: string;
  students: number;
  marksEntered: number;
  state: "NO_MARKS" | "NOT_FORWARDED" | "FORWARDED" | "PUBLISHED" | "OUT_OF_DATE";
  batchId: string | null;
  publishedAt: string | null;
  forwardedBy: string | null;
}

export interface FacultyCourseDTO {
  id: string;
  code: string;
  title: string;
  department: string;
  deptShort: string;
  semester: string;
  section: string;
  type: "Theory" | "Laboratory";
  enrolledStudents: number;
  evaluatedStudents: number;
  passRate: number;
  avgScore: number;
  status: string;
}

export interface FacultyOverviewDTO {
  facultyName: string;
  username: string;
  departmentKey: string;
  departmentName: string;
  departmentCode: string;
  hodName: string;
  collegeKey: string;
  courses: FacultyCourseDTO[];
}

/** Faculty mark entry: the server limits every call to the faculty member's own department. */
export const facultyApi = {
  async subjects(): Promise<FacultySubjectDTO[]> {
    return (await apiClient.get<FacultySubjectDTO[]>("/faculty/subjects")).data;
  },

  async roster(semester: string, subject: string, assessment: string): Promise<StudentMarkDTO[]> {
    return (await apiClient.get<StudentMarkDTO[]>("/faculty/marks", { params: { semester, subject, assessment } })).data;
  },

  /** Saves one answer script; the server recomputes totals and grade. */
  async save(payload: {
    semester: string;
    subjectCode: string;
    regNo: string;
    assessmentType: string;
    partA: number[];
    partBC: Record<string, QuestionMarks>;
    examinerName: string;
    examinerDesignation: string;
  }): Promise<StudentMarkDTO> {
    return (await apiClient.put<StudentMarkDTO>("/faculty/marks", payload)).data;
  },

  /** Forwards the subject's entered marks to the Controller of Examinations for verification. */
  async forward(payload: { semester: string; subjectCode: string; academicYear: string; assessmentType: string }): Promise<{
    id: string;
    totalStudents: number;
    publicationStatus: string;
  }> {
    return (await apiClient.post("/faculty/forward", payload, { timeout: 60000 })).data;
  },

  /** The faculty dashboard: name, department, HOD and every subject's live progress. */
  async overview(): Promise<FacultyOverviewDTO> {
    return (await apiClient.get<FacultyOverviewDTO>("/faculty/overview")).data;
  },

  /** A student's scanned answer script (PDF) for the marks form; 404 when none is uploaded. */
  async answerScript(p: { semester: string; subject: string; regNo: string; assessment: string }): Promise<Blob> {
    return (await apiClient.get("/faculty/answer-scripts/file", { params: p, responseType: "blob", timeout: 120000 })).data;
  },

  async status(semester: string, assessment: string): Promise<SubjectStatusDTO[]> {
    return (await apiClient.get<SubjectStatusDTO[]>("/faculty/status", { params: { semester, assessment } })).data;
  },
};
