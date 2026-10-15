import type { PublishedBatch } from "../utils/publishedResults";
import axios from "axios";
import type { ResultBatchRecord, StudentMarkRecord, StudentRecord, SubjectRecord } from "../components/hodAnalytics/types";

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
  /** The Super Admin is withholding this college's results: no marks are sent while true. */
  withheld?: boolean;
}

/** A student's revaluation / answer-script photocopy request. */
export interface RevaluationRequestDTO {
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

export const authApi = {
  /** The signed-in staff member's own profile (HOD / faculty). */
  async getProfile(): Promise<StaffProfile> {
    return (await apiClient.get<StaffProfile>("/auth/profile")).data;
  },

  /** Saves name and contact details; the stored user gets the new name so headers update. */
  async updateProfile(profile: { name: string; email: string; phone: string; designation: string }): Promise<StaffProfile> {
    const saved = (await apiClient.put<StaffProfile>("/auth/profile", profile)).data;
    const stored = authApi.currentUser();
    if (stored) {
      localStorage.setItem("kvell_auth_user", JSON.stringify({ ...stored, name: saved.name }));
    }
    return saved;
  },

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

  /** The student's own revaluation requests. */
  async getMyRevaluations(): Promise<RevaluationRequestDTO[]> {
    return (await apiClient.get<RevaluationRequestDTO[]>("/student/revaluation")).data;
  },

  /** Applies for revaluation of published subjects (only while the revaluation window is open). */
  async applyRevaluation(body: { semester: string; assessmentType: string; subjectCodes: string[] }): Promise<RevaluationRequestDTO> {
    return (await apiClient.post<RevaluationRequestDTO>("/student/revaluation", body)).data;
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

  /** Full result analytics of the HOD's department: every entered mark (published or not), batches and subjects. */
  async getAnalytics(): Promise<HodAnalyticsDTO> {
    const response = await apiClient.get<HodAnalyticsDTO>("/hod/analytics", { timeout: 60000 });
    return response.data;
  },
};

export interface HodAnalyticsDTO {
  departmentKey: string;
  departmentName: string;
  departmentCode: string;
  marks: StudentMarkRecord[];
  batches: ResultBatchRecord[];
  subjects: SubjectRecord[];
  students: StudentRecord[];
}

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

  /** Published results of the faculty member's own department, with every student's marks (for download). */
  async publishedResults(): Promise<PublishedBatch[]> {
    return (await apiClient.get<PublishedBatch[]>("/faculty/published-results", { timeout: 60000 })).data;
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

export interface StudentInternalSubject {
  subjectCode: string;
  subjectTitle: string;
  values: Partial<Record<InternalComponent, number>>;
  iat1: number | null;
  iat2: number | null;
  iat1Published: boolean;
  iat2Published: boolean;
  breakdown: InternalBreakdown;
  updatedAt: string | null;
}

export interface StudentInternalView {
  visible: boolean;
  scheme: InternalScheme | null;
  semester: string;
  subjects: StudentInternalSubject[];
}

/** Faculty (enter) and HOD (correct) share the same sheet; the server picks the department from the login. */
export const internalMarksApi = {
  async subjects(role: "faculty" | "hod"): Promise<FacultySubjectDTO[]> {
    return (await apiClient.get<FacultySubjectDTO[]>(`/${role}/subjects`)).data;
  },

  async roster(role: "faculty" | "hod", semester: string, subject: string): Promise<InternalRoster> {
    return (await apiClient.get<InternalRoster>(`/${role}/internal-marks`, { params: { semester, subject } })).data;
  },

  /** Faculty enter, the HOD corrects; both only for their own department. */
  async save(role: "faculty" | "hod", payload: {
    semester: string;
    subjectCode: string;
    rows: { regNo: string; values: Partial<Record<InternalComponent, number | null>> }[];
  }): Promise<InternalRoster> {
    return (await apiClient.put<InternalRoster>(`/${role}/internal-marks`, payload)).data;
  },

  async history(role: "faculty" | "hod", semester: string, subject: string, regNo?: string): Promise<InternalHistoryItem[]> {
    return (await apiClient.get<InternalHistoryItem[]>(`/${role}/internal-marks/history`, { params: { semester, subject, regNo } })).data;
  },

  async mine(): Promise<StudentInternalView> {
    return (await apiClient.get<StudentInternalView>("/student/internal-marks")).data;
  },

  async myHistory(subject: string): Promise<InternalHistoryItem[]> {
    return (await apiClient.get<InternalHistoryItem[]>("/student/internal-marks/history", { params: { subject } })).data;
  },
};
