import type { PublishedBatch } from "../utils/publishedResults";
import axios from "axios";
import { wakeServer } from "../components/ServerWake";
import type { ResultBatchRecord, StudentMarkRecord, StudentRecord, SubjectRecord } from "../components/hodAnalytics/types";

// Target Spring Boot REST API Backend URL (Configurable via VITE_API_BASE_URL); the portal speaks version 1
export const API_ROOT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/+$/, "");
const API_BASE_URL = `${API_ROOT}/v1`;

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
    // An expired or signed-out session goes back to the sign-in page instead of leaving broken screens
    const isLogin = String(error?.config?.url || "").includes("/auth/login");
    if (error?.response?.status === 401 && !isLogin && localStorage.getItem("kvell_auth_token")) {
      localStorage.removeItem("kvell_auth_token");
      localStorage.removeItem("kvell_auth_user");
      sessionStorage.setItem("kvell_session_expired", "1");
      window.location.reload();
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

/** Human-readable message from an API error ({ error: "..." } bodies). */
export function apiErrorMessage(err: any, fallback = "Request failed. Please try again."): string {
  if (!err?.response) return "Cannot reach the result server. It may still be starting; please try again in a minute.";
  return err.response.data?.error || fallback;
}

// DTOs matching the Spring Boot backend

export type PortalRole = "student" | "hod" | "faculty" | "admin" | "dean";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: "ADMIN" | "HOD" | "STUDENT" | "FACULTY" | "ASSOCIATE_DEAN" | "DEAN";
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
  role: AuthUser["role"];
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
  /** The evaluator's remarks ("overall", "q1".."q16"). */
  remarks?: Record<string, string>;
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
  result: "PASS" | "FAIL" | "WITHHELD";
  totalMarks: number;
  maxMarks: number;
  subjects: SubjectResultDTO[];
  /** WH1 malpractice, WH2 fee dues, WH3 attendance shortage (no marks are sent then). */
  withheldCode?: string | null;
  withheldReason?: string | null;
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
  /** extras: the picture challenge, when the server asked for one after failed attempts. */
  async login(username: string, password: string, role: PortalRole,
              extras: { captchaId?: string; captchaAnswer?: string } = {}): Promise<AuthResponseDTO> {
    const response = await apiClient.post<AuthResponseDTO>("/auth/login", { username, password, role, ...extras });
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
  /** Edit version, sent back as expectedVersion. */
  version?: number;
  /** Evaluator remarks ("overall", "q1".."q16"). */
  remarks?: Record<string, string>;
  /** Boxes the student did not attempt (NA): "A1".."A10", "11a.i".."16b.iii". They count as 0. */
  notAttempted?: string[];
}

/** Forwarding / publication state of one subject (NOT_FORWARDED, FORWARDED, PUBLISHED, OUT_OF_DATE, NO_MARKS). */
export interface SubjectStatusDTO {
  subjectCode: string;
  subjectTitle: string;
  students: number;
  marksEntered: number;
  state: "NO_MARKS" | "NOT_FORWARDED" | "FORWARDED" | "PUBLISHED" | "OUT_OF_DATE" | "WITHDRAWN" | "RETURNED";
  batchId: string | null;
  publishedAt: string | null;
  forwardedBy: string | null;
  /** Set when the HOD or Associate Dean sent the forwarded marks back for correction. */
  returnedBy?: string | null;
  returnReason?: string | null;
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

  /** dept: another department's subject the Dean allotted for paper correction (blank = own department). */
  async roster(semester: string, subject: string, assessment: string, dept?: string): Promise<StudentMarkDTO[]> {
    return (await apiClient.get<StudentMarkDTO[]>("/faculty/marks", { params: { semester, subject, assessment, dept } })).data;
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
    expectedVersion?: number;
    deptKey?: string;
    remarks?: Record<string, string>;
    notAttempted?: string[];
  }): Promise<StudentMarkDTO> {
    return (await apiClient.put<StudentMarkDTO>("/faculty/marks", payload)).data;
  },

  /** Forwards the subject's entered marks to the Controller of Examinations for verification. */
  async forward(payload: { semester: string; subjectCode: string; academicYear: string; assessmentType: string; deptKey?: string }): Promise<{
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
  async answerScript(p: { semester: string; subject: string; regNo: string; assessment: string; dept?: string }): Promise<Blob> {
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

// â”€â”€ Modules: Mentoring, Course Material, Research Papers, Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface MentorInfo {
  facultyId: number;
  name: string;
  username: string;
  department: string;
  email: string;
  phone: string;
  cabin: string;
}

export interface MenteeView {
  regNo: string;
  name: string;
  category: string;
  yearLabel: string;
  semester: number;
  deptKey: string;
  academicYear: string;
  lastSessionDate: string | null;
  pendingConcerns: number;
  arrearsCount?: number;
  arrearSubjects?: string;
  attendancePct?: number;
  iaAverage?: number;
  activities?: { id: number; activityType: string; title: string; organization: string; achievement: string; academicYear: string; eventDate: string }[];
}

export interface MentoringSessionView {
  id: number;
  facultyId: number;
  facultyName: string;
  studentRegNo: string;
  studentName: string;
  sessionDate: string;
  sessionType: string;
  meetingMode: string;
  topicsDiscussed: string;
  guidanceNotes: string;
  actionItems: string | null;
  nextReviewDate: string | null;
  attendanceStatus: string;
  createdAt: string;
}

export interface MentoringConcernView {
  id: number;
  studentRegNo: string;
  studentName: string;
  facultyId: number | null;
  facultyName: string;
  title: string;
  category: string;
  description: string;
  status: "SUBMITTED" | "IN_REVIEW" | "RESOLVED" | "ESCALATED_TO_HOD";
  mentorResponse: string | null;
  hodRemarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentMentorDashboard {
  mentor: MentorInfo | null;
  sessions: MentoringSessionView[];
  concerns: MentoringConcernView[];
  allocationStatus?: "PENDING_ADEAN_APPROVAL" | "APPROVED" | "REJECTED" | "UNASSIGNED";
  approvalMessage?: string;
}

export interface MentorStat {
  facultyId: number;
  name: string;
  username: string;
  menteeCount: number;
  sessionsCount: number;
  pendingCount?: number;
}

export interface HodMentoringOverview {
  deptKey: string;
  totalMentees: number;
  totalMentors: number;
  totalSessions: number;
  activeConcerns: number;
  escalatedConcerns: number;
  mentors: MentorStat[];
  pendingApprovals?: number;
  rejectedCount?: number;
}

export interface CollegeMentoringOverview {
  collegeKey: string;
  totalStudents: number;
  totalAllocated: number;
  totalMentors: number;
  totalSessions: number;
  pendingConcerns: number;
  pendingApprovals?: number;
  departmentBreakdown: HodMentoringOverview[];
}

export interface AllocationDetailView {
  id: number;
  studentRegNo: string;
  studentName: string;
  semester: number;
  facultyId: number;
  facultyName: string;
  facultyUsername: string;
  status: "PENDING_ADEAN_APPROVAL" | "APPROVED" | "REJECTED";
  academicYear: string;
  assignedBy: string;
  adeanRemarks?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface EligibleStudentView {
  regNo: string;
  name: string;
  deptKey: string;
  semester: number;
  yearLabel: string;
  facultyId?: number;
  facultyName?: string;
  currentFacultyId?: number;
  currentFacultyName?: string;
  allocationStatus: "PENDING_ADEAN_APPROVAL" | "APPROVED" | "REJECTED" | "UNASSIGNED" | "REJECTED_BY_ADEAN";
}

export interface FacultyOptionView {
  id: number;
  name: string;
  username: string;
  activeCount?: number;
  pendingCount?: number;
  activeMenteeCount: number;
  pendingMenteeCount: number;
}

export interface PendingAllocationView {
  id: number;
  studentRegNo: string;
  studentName: string;
  deptKey: string;
  semester: number;
  facultyId: number;
  facultyName: string;
  facultyUsername: string;
  academicYear: string;
  assignedBy: string;
  status: string;
  batchId?: string;
  createdAt: string;
}

export interface AllocationReviewResult {
  approvedCount: number;
  rejectedCount: number;
  message: string;
}

export interface AutoAllocateRequest {
  deptKey?: string;
  academicYear?: string;
  semester?: number;
  strategy?: "BALANCED" | "ROUND_ROBIN";
}

export interface AutoAllocateResult {
  totalAllocated: number;
  facultyCount: number;
  batchId: string;
  message: string;
  allocations: { studentRegNo: string; facultyId: number }[];
}

export interface PendingBatchView {
  batchId: string;
  deptKey: string;
  academicYear: string;
  assignedBy: string;
  studentCount: number;
  totalStudents?: number;
  facultyCount: number;
  createdAt: string;
  allocations: PendingAllocationView[];
}

export interface BatchReviewRequest {
  batchId: string;
  action: "APPROVE" | "REJECT";
  remarks?: string;
}

export interface StudentMentorChangeRequest {
  reason: string;
  queriesAboutMentor?: string;
  preferredMentorNotes?: string;
}

export interface EscalatedMentorRequestView {
  id: number;
  studentRegNo: string;
  studentName: string;
  deptKey: string;
  semester: number;
  currentFacultyId?: number;
  currentFacultyName?: string;
  title: string;
  reason?: string;
  category: string;
  description: string;
  queriesAboutMentor?: string;
  preferredMentorNotes?: string;
  status: string;
  mentorResponse?: string;
  hodRemarks?: string;
  createdAt: string;
  escalatedAt?: string;
}

export interface ResolveMentorChangeRequest {
  concernId: number;
  action: "REASSIGN" | "RETAIN" | "RESOLVE";
  newFacultyId?: number;
  hodRemarks?: string;
}

export interface MenteeAcademicProfile {
  regNo: string;
  name: string;
  deptKey: string;
  semester: number;
  yearLabel: string;
  email: string;
  phone: string;
  arrearsCount: number;
  arrearSubjectList: string[];
  attendancePct: number;
  totalClasses: number;
  attendedClasses: number;
  absentClasses: number;
  iaAverage: number;
  subjectMarks: { subjectCode: string; subjectTitle: string; component: string; value: number }[];
  extracurricularActivities: { id: number; activityType: string; title: string; organization: string; achievement: string; academicYear: string; eventDate: string }[];
  sessions: MentoringSessionView[];
  concerns: MentoringConcernView[];
}

export const mentoringApi = {
  async getStudentDashboard(): Promise<StudentMentorDashboard> {
    return (await apiClient.get<StudentMentorDashboard>("/mentoring/student/my-mentor")).data;
  },
  async getFacultyMentees(): Promise<MenteeView[]> {
    return (await apiClient.get<MenteeView[]>("/mentoring/faculty/mentees")).data;
  },
  async getSessions(studentRegNo?: string): Promise<MentoringSessionView[]> {
    return (await apiClient.get<MentoringSessionView[]>("/mentoring/sessions", { params: { studentRegNo } })).data;
  },
  async recordSession(payload: {
    studentRegNo: string;
    sessionDate?: string;
    sessionType?: string;
    meetingMode?: string;
    topicsDiscussed: string;
    guidanceNotes: string;
    actionItems?: string;
    nextReviewDate?: string;
  }): Promise<MentoringSessionView> {
    return (await apiClient.post<MentoringSessionView>("/mentoring/sessions", payload)).data;
  },
  async getConcerns(status?: string): Promise<MentoringConcernView[]> {
    return (await apiClient.get<MentoringConcernView[]>("/mentoring/concerns", { params: { status } })).data;
  },
  async submitConcern(payload: { title: string; category?: string; description: string }): Promise<MentoringConcernView> {
    return (await apiClient.post<MentoringConcernView>("/mentoring/concerns", payload)).data;
  },
  async updateConcern(id: number, payload: { status?: string; mentorResponse?: string; hodRemarks?: string }): Promise<MentoringConcernView> {
    return (await apiClient.put<MentoringConcernView>(`/mentoring/concerns/${id}`, payload)).data;
  },
  async getHodOverview(deptKey?: string): Promise<HodMentoringOverview> {
    return (await apiClient.get<HodMentoringOverview>("/mentoring/hod/overview", { params: { deptKey } })).data;
  },
  async getHodAllocations(deptKey?: string): Promise<AllocationDetailView[]> {
    return (await apiClient.get<AllocationDetailView[]>("/mentoring/hod/allocations", { params: { deptKey } })).data;
  },
  async getEligibleStudents(deptKey?: string): Promise<EligibleStudentView[]> {
    return (await apiClient.get<EligibleStudentView[]>("/mentoring/hod/eligible-students", { params: { deptKey } })).data;
  },
  async getDeptFaculty(deptKey?: string): Promise<FacultyOptionView[]> {
    return (await apiClient.get<FacultyOptionView[]>("/mentoring/hod/faculty", { params: { deptKey } })).data;
  },
  async allocateMentors(payload: { deptKey?: string; academicYear?: string; allocations: { studentRegNo: string; facultyId: number }[] }): Promise<void> {
    await apiClient.post("/mentoring/hod/allocate", payload);
  },
  async deleteHodAllocation(id: number): Promise<void> {
    await apiClient.delete(`/mentoring/hod/allocations/${id}`);
  },
  async deleteHodAllocations(ids: number[]): Promise<{ deleted: number }> {
    return (await apiClient.delete<{ deleted: number }>("/mentoring/hod/allocations", { data: ids })).data;
  },
  async getPendingDeanAllocations(deptKey?: string): Promise<PendingAllocationView[]> {
    return (await apiClient.get<PendingAllocationView[]>("/mentoring/dean/pending-allocations", { params: { deptKey } })).data;
  },
  async reviewAllocations(payload: { allocationIds: number[]; action: "APPROVE" | "REJECT"; remarks?: string }): Promise<AllocationReviewResult> {
    return (await apiClient.post<AllocationReviewResult>("/mentoring/dean/review-allocations", payload)).data;
  },
  async getInstitutionalOverview(collegeKey?: string): Promise<CollegeMentoringOverview> {
    return (await apiClient.get<CollegeMentoringOverview>("/mentoring/institutional/overview", { params: { collegeKey } })).data;
  },
  async autoAllocate(payload: AutoAllocateRequest): Promise<AutoAllocateResult> {
    return (await apiClient.post<AutoAllocateResult>("/mentoring/hod/auto-allocate", payload)).data;
  },
  async getPendingBatches(deptKey?: string): Promise<PendingBatchView[]> {
    return (await apiClient.get<PendingBatchView[]>("/mentoring/dean/pending-batches", { params: { deptKey } })).data;
  },
  async reviewBatch(payload: BatchReviewRequest): Promise<AllocationReviewResult> {
    return (await apiClient.post<AllocationReviewResult>("/mentoring/dean/review-batch", payload)).data;
  },
  async getMenteeProfile(regNo: string): Promise<MenteeAcademicProfile> {
    return (await apiClient.get<MenteeAcademicProfile>(`/mentoring/mentee-profile/${regNo}`)).data;
  },
  async submitMentorChangeRequest(payload: StudentMentorChangeRequest): Promise<MentoringConcernView> {
    return (await apiClient.post<MentoringConcernView>("/mentoring/student/mentor-change-request", payload)).data;
  },
  async getEscalatedRequests(deptKey?: string): Promise<EscalatedMentorRequestView[]> {
    return (await apiClient.get<EscalatedMentorRequestView[]>("/mentoring/hod/escalated-requests", { params: { deptKey } })).data;
  },
  async resolveMentorChange(payload: ResolveMentorChangeRequest): Promise<void> {
    await apiClient.post("/mentoring/hod/resolve-mentor-change", payload);
  },
};

export interface CourseMaterialView {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectTitle: string;
  facultyId: number;
  facultyName: string;
  deptKey: string;
  semester: number;
  section?: string;
  unitNumber: number;
  materialType: "NOTE" | "SLIDES" | "LAB_MANUAL" | "QUESTION_BANK" | "REFERENCE";
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSizeKb: number;
  isPublished: boolean;
  downloadCount: number;
  createdAt: string;
}

export interface UnitCoverage {
  unitNumber: number;
  notesCount: number;
  slidesCount: number;
  labCount: number;
  qbCount: number;
  totalCount: number;
}

export interface SubjectCoverageView {
  subjectId: number;
  subjectCode: string;
  subjectTitle: string;
  faculty: string;
  semester: number;
  totalMaterials: number;
  totalDownloads: number;
  units: UnitCoverage[];
}

export const courseMaterialsApi = {
  async list(params?: { deptKey?: string; semester?: number; section?: string; subjectId?: number; unitNumber?: number; materialType?: string }): Promise<CourseMaterialView[]> {
    return (await apiClient.get<CourseMaterialView[]>("/coursematerials", { params })).data;
  },
  async upload(payload: {
    subjectId: number;
    unitNumber: number;
    materialType?: string;
    title: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    fileSizeKb?: number;
    section?: string;
    deptKeys?: string[];
    semester?: number;
  }): Promise<CourseMaterialView> {
    return (await apiClient.post<CourseMaterialView>("/coursematerials", payload)).data;
  },
  async recordDownload(id: number): Promise<void> {
    await apiClient.post(`/coursematerials/${id}/download`);
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/coursematerials/${id}`);
  },
  async getCoverage(deptKey?: string, semester?: number): Promise<SubjectCoverageView[]> {
    return (await apiClient.get<SubjectCoverageView[]>("/coursematerials/coverage", { params: { deptKey, semester } })).data;
  },
};


export interface ReportDataset {
  reportKey: string;
  title: string;
  subtitle: string;
  generatedBy: string;
  role: string;
  generatedAt: string;
  columns: string[];
  rows: Record<string, any>[];
  summaryStats: Record<string, any>;
}

export interface DownloadLogView {
  id: number;
  username: string;
  role: string;
  reportType: string;
  fileFormat: string;
  filtersApplied: string;
  downloadedAt: string;
}

export const reportsApi = {
  async generate(reportKey: string, params?: Record<string, string>): Promise<ReportDataset> {
    return (await apiClient.get<ReportDataset>("/reports/generate", { params: { reportKey, ...(params || {}) } })).data;
  },
  async logDownload(payload: { reportType: string; fileFormat: string; filtersApplied?: string }): Promise<void> {
    await apiClient.post("/reports/log-download", payload);
  },
  async getHistory(): Promise<DownloadLogView[]> {
    return (await apiClient.get<DownloadLogView[]>("/reports/history")).data;
  },
};


// =============================================================================
// ATTENDANCE & ABSENT DETAILS MODULES
// =============================================================================

export interface AttendanceSubjectOption {
  id: number;
  code: string;
  title: string;
  semester: number;
  deptKey: string;
  faculty: string;
}

export interface AttendanceStudentRosterItem {
  regNo: string;
  name: string;
  deptKey: string;
  semester: number;
  category: string;
}

export interface AttendanceRecordItem {
  id: number;
  regNo: string;
  studentName: string;
  attendanceDate: string;
  sessionSlot: string;
  status: "PRESENT" | "ABSENT" | "ON_DUTY";
  remark: string;
  markedBy: string;
}

export interface MonthlyStudentSummary {
  regNo: string;
  studentName: string;
  conducted: number;
  attended: number;
  absent: number;
  od: number;
  percentage: number;
  eligibilityStatus: "ELIGIBLE" | "CONDONATION" | "SHORTAGE";
}

export interface MonthlyBatchDetail {
  batchId: string;
  deptKey: string;
  semester: number;
  subjectCode: string;
  subjectTitle: string;
  month: number;
  year: number;
  facultyName: string;
  totalConducted: number;
  totalStudents: number;
  classAveragePct: number;
  status: "DRAFT" | "SUBMITTED_TO_HOD" | "HOD_APPROVED" | "ADEAN_APPROVED" | "REJECTED_BY_HOD" | "REJECTED_BY_ADEAN";
  submittedAt: string | null;
  hodName: string | null;
  hodActionAt: string | null;
  hodRemarks: string | null;
  adeanName: string | null;
  adeanActionAt: string | null;
  adeanRemarks: string | null;
  students: MonthlyStudentSummary[];
}

export interface AttendanceBatchSummaryItem {
  batchId: string;
  deptKey: string;
  semester: number;
  subjectCode: string;
  subjectTitle: string;
  month: number;
  year: number;
  facultyName: string;
  totalConducted: number;
  totalStudents: number;
  classAveragePct: number;
  status: "DRAFT" | "SUBMITTED_TO_HOD" | "HOD_APPROVED" | "ADEAN_APPROVED" | "REJECTED_BY_HOD" | "REJECTED_BY_ADEAN";
  submittedAt: string | null;
  hodName: string | null;
  hodActionAt: string | null;
  adeanName: string | null;
  adeanActionAt: string | null;
}

export interface AttendanceMonthBreakdown {
  month: number;
  year: number;
  monthName: string;
  conducted: number;
  attended: number;
  absent: number;
  od: number;
  percentage: number;
}

export interface StudentSubjectAttendance {
  subjectCode: string;
  subjectTitle: string;
  facultyName: string;
  totalConducted: number;
  totalAttended: number;
  totalAbsent: number;
  totalOd: number;
  percentage: number;
  eligibilityStatus: "ELIGIBLE" | "CONDONATION" | "SHORTAGE";
  monthlyBreakdown: AttendanceMonthBreakdown[];
}

export interface StudentAttendanceOverview {
  regNo: string;
  studentName: string;
  semester: number;
  deptKey: string;
  overallPercentage: number;
  totalConducted: number;
  totalAttended: number;
  totalAbsent: number;
  totalOd: number;
  overallEligibility: "ELIGIBLE" | "CONDONATION" | "SHORTAGE";
  subjects: StudentSubjectAttendance[];
}

export interface StudentAbsentItem {
  id: number;
  subjectCode: string;
  subjectTitle: string;
  facultyName: string;
  attendanceDate: string;
  dayOfWeek: string;
  sessionSlot: string;
  status: string;
  remark: string;
}

export interface SubjectAbsentGroup {
  subjectCode: string;
  subjectTitle: string;
  facultyName: string;
  totalAbsentDays: number;
  absentDates: StudentAbsentItem[];
}

export interface StudentAbsentDetailsView {
  regNo: string;
  studentName: string;
  totalAbsentCount: number;
  subjectsAffected: number;
  subjectGroups: SubjectAbsentGroup[];
  allAbsents: StudentAbsentItem[];
}

export const attendanceApi = {
  async getAvailableSubjects(semester?: number): Promise<AttendanceSubjectOption[]> {
    return (await apiClient.get<AttendanceSubjectOption[]>("/attendance/faculty/subjects", { params: { semester } })).data;
  },
  async getStudentRoster(deptKey?: string, semester?: number): Promise<AttendanceStudentRosterItem[]> {
    return (await apiClient.get<AttendanceStudentRosterItem[]>("/attendance/faculty/students", { params: { deptKey, semester } })).data;
  },
  async getDailyAttendance(subjectCode: string, date: string, sessionSlot?: string): Promise<AttendanceRecordItem[]> {
    return (await apiClient.get<AttendanceRecordItem[]>("/attendance/daily", { params: { subjectCode, date, sessionSlot } })).data;
  },
  async saveDailyAttendance(payload: {
    deptKey: string;
    semester: number;
    subjectCode: string;
    date: string;
    sessionSlot: string;
    records: { regNo: string; status: string; remark?: string }[];
  }): Promise<MonthlyBatchDetail> {
    return (await apiClient.post<MonthlyBatchDetail>("/attendance/daily", payload)).data;
  },
  async getMonthlyBatch(params?: {
    batchId?: string;
    deptKey?: string;
    semester?: number;
    subjectCode?: string;
    year?: number;
    month?: number;
  }): Promise<MonthlyBatchDetail> {
    return (await apiClient.get<MonthlyBatchDetail>("/attendance/monthly/batch", { params })).data;
  },
  async submitMonthlyBatch(batchId: string): Promise<MonthlyBatchDetail> {
    return (await apiClient.post<MonthlyBatchDetail>("/attendance/monthly/submit", null, { params: { batchId } })).data;
  },
  async getHodBatches(deptKey?: string, status?: string): Promise<AttendanceBatchSummaryItem[]> {
    return (await apiClient.get<AttendanceBatchSummaryItem[]>("/attendance/hod/batches", { params: { deptKey, status } })).data;
  },
  async hodReviewBatch(payload: { batchId: string; action: "APPROVE" | "REJECT"; remarks?: string }): Promise<MonthlyBatchDetail> {
    return (await apiClient.post<MonthlyBatchDetail>("/attendance/hod/review", payload)).data;
  },
  async getAdeanBatches(deptKey?: string, status?: string): Promise<AttendanceBatchSummaryItem[]> {
    return (await apiClient.get<AttendanceBatchSummaryItem[]>("/attendance/adean/batches", { params: { deptKey, status } })).data;
  },
  async adeanReviewBatch(payload: { batchId: string; action: "APPROVE" | "REJECT"; remarks?: string }): Promise<MonthlyBatchDetail> {
    return (await apiClient.post<MonthlyBatchDetail>("/attendance/adean/review", payload)).data;
  },
  async getStudentOverview(regNo?: string): Promise<StudentAttendanceOverview> {
    return (await apiClient.get<StudentAttendanceOverview>("/attendance/student/overview", { params: { regNo } })).data;
  },
  async getStudentAbsentDetails(regNo?: string, subjectCode?: string): Promise<StudentAbsentDetailsView> {
    return (await apiClient.get<StudentAbsentDetailsView>("/attendance/student/absent-details", { params: { regNo, subjectCode } })).data;
  },
};
import type {
  CreateGrievanceJsonDTO,
  GrievanceActionDTO,
  GrievanceDetailDTO,
  GrievanceSummaryDTO,
  RecipientDTO,
} from "../components/grievance/GrievanceTypes";

export const grievanceApi = {
  // Student
  async getRecipients(): Promise<RecipientDTO[]> {
    return (await apiClient.get<RecipientDTO[]>("/student/grievances/recipients")).data;
  },
  async createGrievanceJson(data: CreateGrievanceJsonDTO): Promise<GrievanceSummaryDTO> {
    return (await apiClient.post<GrievanceSummaryDTO>("/student/grievances", data)).data;
  },
  async createGrievance(formData: FormData): Promise<GrievanceSummaryDTO> {
    const token = localStorage.getItem("kvell_auth_token");
    const res = await fetch(`${API_ROOT}/v1/student/grievances`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { status: res.status, data: err } };
    }
    return await res.json();
  },
  async getMyGrievances(): Promise<GrievanceSummaryDTO[]> {
    return (await apiClient.get<GrievanceSummaryDTO[]>("/student/grievances")).data;
  },
  async getStudentGrievanceDetail(id: number): Promise<GrievanceDetailDTO> {
    return (await apiClient.get<GrievanceDetailDTO>(`/student/grievances/${id}`)).data;
  },

  // Faculty
  async getFacultyGrievances(): Promise<GrievanceSummaryDTO[]> {
    return (await apiClient.get<GrievanceSummaryDTO[]>("/faculty/grievances")).data;
  },
  async getFacultyGrievanceDetail(id: number): Promise<GrievanceDetailDTO> {
    return (await apiClient.get<GrievanceDetailDTO>(`/faculty/grievances/${id}`)).data;
  },
  async facultyAction(id: number, action: GrievanceActionDTO): Promise<GrievanceDetailDTO> {
    return (await apiClient.post<GrievanceDetailDTO>(`/faculty/grievances/${id}/action`, action)).data;
  },

  // HOD
  async getHodGrievances(): Promise<GrievanceSummaryDTO[]> {
    return (await apiClient.get<GrievanceSummaryDTO[]>("/hod/grievances")).data;
  },
  async getHodGrievanceDetail(id: number): Promise<GrievanceDetailDTO> {
    return (await apiClient.get<GrievanceDetailDTO>(`/hod/grievances/${id}`)).data;
  },
  async hodAction(id: number, action: GrievanceActionDTO): Promise<GrievanceDetailDTO> {
    return (await apiClient.post<GrievanceDetailDTO>(`/hod/grievances/${id}/action`, action)).data;
  },

  // Dean / Associate Dean
  async getDeanGrievances(): Promise<GrievanceSummaryDTO[]> {
    return (await apiClient.get<GrievanceSummaryDTO[]>("/dean/grievances")).data;
  },
  async getDeanGrievanceDetail(id: number): Promise<GrievanceDetailDTO> {
    return (await apiClient.get<GrievanceDetailDTO>(`/dean/grievances/${id}`)).data;
  },
  async deanAction(id: number, action: GrievanceActionDTO): Promise<GrievanceDetailDTO> {
    return (await apiClient.post<GrievanceDetailDTO>(`/dean/grievances/${id}/action`, action)).data;
  },
  async getDeanPendingAlerts(): Promise<GrievanceSummaryDTO[]> {
    return (await apiClient.get<GrievanceSummaryDTO[]>("/dean/grievances/pending-alerts")).data;
  },

  // Get attachment Blob for preview / print
  async getAttachmentBlob(id: number): Promise<Blob> {
    const res = await apiClient.get(`/grievances/${id}/attachment`, {
      responseType: "blob",
    });
    return new Blob([res.data]);
  },

  // Download attachment
  async downloadAttachment(id: number, fileName: string): Promise<void> {
    const res = await apiClient.get(`/grievances/${id}/attachment`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
