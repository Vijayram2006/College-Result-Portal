import { apiClient } from "./api";

export interface HallTicketAdminView {
  id: number;
  studentReg: string;
  studentName: string;
  deptKey: string;
  deptName: string;
  semester: number;
  section: string;
  examTimetableId: number;
  examTitle: string;
  hallTicketNo: string;
  status: "GENERATED" | "PUBLISHED" | "BLOCKED_FEES" | "SUPERSEDED" | "WITHDRAWN";
  feePaid: boolean;
  publishedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  withdrawnBy?: string | null;
  withdrawnAt?: string | null;
  withdrawReason?: string | null;
  restoredBy?: string | null;
  restoredAt?: string | null;
}

export interface TemplateView {
  id?: number | null;
  collegeKey?: string | null;
  academicYear: string;
  batch: string;
  templateName?: string;
  deptKey?: string | null;
  yearLabel?: string | null;
  semester?: number | null;
  examTitle: string;
  examinationCentre: string;
  notes: string[];
  sigCandidate: string;
  sigCoe: string;
  sigPrincipal: string;
  showPhoto: boolean;
  photoPosition?: "left" | "right" | "top centre" | string;
  photoSize?: "small" | "medium" | "large" | string;
  logoSource?: "engineering-logo.png" | "kvell-logo.png" | "both" | "uploaded" | string;
  logoImage?: string | null;
  logoMime?: string | null;
  backgroundImage?: string | null;
  backgroundMime?: string | null;
  layoutJson?: string | null;
  status: "DRAFT" | "FIXED";
  version: number;
  fixedBy?: string | null;
  fixedAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface TemplateVersionSummary {
  id: number;
  templateId: number;
  versionNumber: number;
  collegeKey: string;
  academicYear: string;
  batch: string;
  deptKey?: string | null;
  yearLabel?: string | null;
  semester?: number | null;
  templateName: string;
  source?: string | null;
  fixedBy?: string | null;
  fixedAt: string;
}

export interface SaveTemplateRequest {
  academicYear: string;
  batch: string;
  templateName?: string;
  deptKey?: string;
  yearLabel?: string;
  semester?: number | null;
  examTitle: string;
  examinationCentre: string;
  notes: string[];
  sigCandidate: string;
  sigCoe: string;
  sigPrincipal: string;
  showPhoto: boolean;
  photoPosition?: string;
  photoSize?: string;
  logoSource?: string;
  logoImage?: string | null;
  logoMime?: string | null;
  backgroundImage?: string | null;
  backgroundMime?: string | null;
  layoutJson?: string | null;
}

export interface CreateTemplateRequest {
  academicYear: string;
  batch: string;
  templateName: string;
  deptKey?: string;
  yearLabel?: string;
  semester?: number;
  useReference?: boolean;
  examTitle?: string;
  examinationCentre?: string;
  notes?: string[];
  sigCandidate?: string;
  sigCoe?: string;
  sigPrincipal?: string;
  showPhoto?: boolean;
  photoPosition?: string;
  photoSize?: string;
  logoSource?: string;
  logoImage?: string | null;
  logoMime?: string | null;
  backgroundImage?: string | null;
  backgroundMime?: string | null;
  layoutJson?: string | null;
}

export interface SelectionStudentItem {
  registerNumber: string;
  name: string;
  dateOfBirth: string;
  degreeBranch: string;
  semester: number;
  section: string;
  yearLabel: string;
  departmentKey: string;
  papers?: PaperItem[];
}

export interface CohortDepartmentOption {
  deptKey: string;
  code: string;
  name: string;
  studentCount: number;
}

export interface CandidatePreview {
  studentFound: boolean;
  registerNumber?: string | null;
  name?: string | null;
  dateOfBirth?: string | null;
  degreeBranch?: string | null;
  semester?: string | null;
  section?: string | null;
  departmentKey?: string | null;
  examinationCentre?: string | null;
  hallTicketNo?: string | null;
  papers: PaperItem[];
  template: TemplateView;
}

export interface GenerateResult {
  success: boolean;
  created: number;
  updated: number;
  rebuilt?: number;
  papersWritten?: number;
  skippedPublished: number;
  skippedNoBatch: number;
  skippedRegNos: string[];
  message: string;
}

export interface ApplyResult {
  success: boolean;
  updatedCount: number;
  skippedPublishedCount: number;
  message: string;
}

export interface ReviewTicketItem {
  ticketId: number | null;
  regNo: string;
  studentName: string;
  status: string;
  templateVersion: number | null;
  examCentre: string | null;
  paperCount: number;
  blockingIssues: string[];
}

export interface ReviewSummary {
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  templateVersion: number;
  tickets: ReviewTicketItem[];
  canPublish: boolean;
  blockingCount: number;
  withdrawnCount?: number;
}

export interface ReviewConfirmResponse {
  reviewed: boolean;
  reviewedBy: string;
  reviewedAt: string;
  templateVersion: number;
  message: string;
}

export interface ReadinessResult {
  canGenerate: boolean;
  studentCount: number;
  missing: string[];
}

export interface TemplatePublishResult {
  publishedCount: number;
  supersededCount: number;
  blockedCount: number;
  blockedRegNos: string[];
  message: string;
}

export interface PublishResult {
  publishedCount: number;
  blockedCount: number;
  blockedRegNos: string[];
}

export interface HallTicketQueryView {
  id: number;
  hallTicketId: number;
  studentReg: string;
  studentName: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  coeResponse?: string | null;
  respondedBy?: string | null;
  respondedAt?: string | null;
  createdAt: string;
}

export interface ExamTimetableOption {
  id: number;
  title: string;
  semester: number;
  section: string;
  academicYear: string;
  deptKey: string;
}

// Hall Ticket Overrides & Editor Types
export interface ImportRow {
  rowNumber: number;
  registerNumber: string;
  name: string;
  dateOfBirth: string;
  degreeBranch: string;
  currentSemester: string;
  examCentre: string;
  subjectCode: string;
  subjectTitle: string;
  paperType: "CURRENT" | "ARREAR";
  paperSemester: string;
}

export interface BadRow {
  rowNumber: number;
  registerNumber: string;
  reason: string;
}

export interface ImportRequest {
  academicYear: string;
  batch: string;
  semester: number;
  examName?: string;
  rows: ImportRow[];
}

export interface ImportResponse {
  success: boolean;
  ticketsImported: number;
  papersImported: number;
  message: string;
}

export interface PaperItem {
  id?: number;
  sno: number;
  subjectCode: string;
  subjectTitle: string;
  paperSemester: string;
  paperType: "CURRENT" | "ARREAR" | string;
  isActive: boolean;
  examDate?: string | null;
  session?: string | null;
  examType?: string | null;
}

export interface EditLog {
  id: number;
  overrideId: number;
  changedBy: string;
  changedAt: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface DraftSummary {
  id: number;
  collegeKey?: string;
  studentReg: string;
  academicYear: string;
  batch: string;
  semester: number;
  examName: string;
  name: string;
  dateOfBirth: string;
  degreeBranch: string;
  currentSemester: string;
  examCentre: string;
  signStatus: "GENERATED" | "COE_SIGNED";
  signedBy?: string | null;
  signedAt?: string | null;
  editVersion: number;
  updatedAt: string;
  activePaperCount: number;
  totalPaperCount: number;
  blockingIssueCount: number;
  blockingIssues: string[];
}

export interface DraftDetail extends DraftSummary {
  papers: PaperItem[];
  editLogs: EditLog[];
}

export interface SaveDraftRequest {
  editVersion: number;
  name: string;
  dateOfBirth: string;
  degreeBranch: string;
  currentSemester: string;
  examCentre: string;
  papers: PaperItem[];
}

export const hallTicketAdminApi = {
  async listExamTimetables(): Promise<ExamTimetableOption[]> {
    try {
      const res = await apiClient.get<any[]>("/dean/timetable", {
        params: { category: "SEMESTER_EXAM", status: "PUBLISHED" },
      });
      return res.data.map((t) => ({
        id: t.id,
        title: t.examName || t.title,
        semester: t.semester,
        section: t.section,
        academicYear: t.academicYear,
        deptKey: t.deptKey,
      }));
    } catch {
      return [];
    }
  },

  async generate(examTimetableId: number): Promise<number> {
    const res = await apiClient.post<number>("/admin/hall-tickets/generate", {
      examTimetableId,
    });
    return res.data;
  },

  async list(filters?: {
    semester?: number;
    section?: string;
    status?: string;
    examTimetableId?: number;
  }): Promise<HallTicketAdminView[]> {
    const res = await apiClient.get<HallTicketAdminView[]>("/admin/hall-tickets", {
      params: filters,
    });
    return res.data;
  },

  async publish(examTimetableId: number): Promise<PublishResult> {
    const res = await apiClient.post<PublishResult>("/admin/hall-tickets/publish", {
      examTimetableId,
    });
    return res.data;
  },

  async listQueries(): Promise<HallTicketQueryView[]> {
    const res = await apiClient.get<HallTicketQueryView[]>("/admin/hall-tickets/queries");
    return res.data;
  },

  async respondQuery(queryId: number, response: string): Promise<HallTicketQueryView> {
    const res = await apiClient.post<HallTicketQueryView>(
      `/admin/hall-tickets/queries/${queryId}/respond`,
      { response }
    );
    return res.data;
  },

  // --- Hall Ticket Editor & Overrides Endpoints ---
  async importDrafts(req: ImportRequest): Promise<ImportResponse> {
    const res = await apiClient.post<ImportResponse>("/admin/hall-tickets/editor/import", req);
    return res.data;
  },

  async listDrafts(filters?: {
    academicYear?: string;
    batch?: string;
    semester?: number;
  }): Promise<DraftSummary[]> {
    const res = await apiClient.get<DraftSummary[]>("/admin/hall-tickets/editor/drafts", {
      params: filters,
    });
    return res.data;
  },

  async getDraft(id: number): Promise<DraftDetail> {
    const res = await apiClient.get<DraftDetail>(`/admin/hall-tickets/editor/drafts/${id}`);
    return res.data;
  },

  async saveDraft(id: number, data: SaveDraftRequest): Promise<DraftDetail> {
    const res = await apiClient.put<DraftDetail>(`/admin/hall-tickets/editor/drafts/${id}`, data);
    return res.data;
  },

  async signDraft(id: number): Promise<DraftDetail> {
    const res = await apiClient.post<DraftDetail>(`/admin/hall-tickets/editor/drafts/${id}/sign`);
    return res.data;
  },

  // --- Hall Ticket Reference Template & Generation Endpoints ---
  async listTemplates(params: {
    academicYear: string;
    batch: string;
    departmentKey?: string;
    yearLabel?: string;
    semester?: number;
  }): Promise<TemplateView[]> {
    const res = await apiClient.get<TemplateView[]>("/admin/hall-tickets/templates", { params });
    return res.data;
  },

  async getTemplate(params: {
    academicYear?: string;
    batch?: string;
    templateName?: string;
    templateId?: number;
    departmentKey?: string;
    yearLabel?: string;
    semester?: number | null;
  }): Promise<TemplateView> {
    const res = await apiClient.get<TemplateView>("/admin/hall-tickets/template", {
      params,
    });
    return res.data;
  },

  async createTemplate(req: CreateTemplateRequest): Promise<TemplateView> {
    const payload: {
      academicYear: string;
      batch: string;
      templateName: string;
      deptKey?: string;
      yearLabel?: string;
      semester?: number;
    } = {
      academicYear: (req.academicYear || "").trim(),
      batch: (req.batch || "").trim(),
      templateName: (req.templateName || "").trim(),
    };

    if (req.deptKey && req.deptKey.trim()) {
      payload.deptKey = req.deptKey.trim();
    }
    if (req.yearLabel && req.yearLabel.trim()) {
      payload.yearLabel = req.yearLabel.trim();
    }
    if (typeof req.semester === "number" && !isNaN(req.semester) && req.semester > 0) {
      payload.semester = req.semester;
    } else if (typeof req.semester === "string" && (req.semester as string).trim() !== "") {
      const parsed = parseInt((req.semester as string).trim(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        payload.semester = parsed;
      }
    }

    const res = await apiClient.post<TemplateView>("/admin/hall-tickets/template/new", payload);
    return res.data;
  },

  async saveTemplate(req: SaveTemplateRequest): Promise<TemplateView> {
    const res = await apiClient.put<TemplateView>("/admin/hall-tickets/template", req);
    return res.data;
  },

  async fixTemplate(params: {
    academicYear: string;
    batch: string;
    templateName?: string;
    templateId?: number;
    deptKey?: string;
    yearLabel?: string;
    semester?: number | null;
  }): Promise<TemplateView> {
    const res = await apiClient.post<TemplateView>("/admin/hall-tickets/template/fix", params);
    return res.data;
  },

  async unfixTemplate(params: {
    academicYear: string;
    batch: string;
    templateName?: string;
    templateId?: number;
    deptKey?: string;
    yearLabel?: string;
    semester?: number | null;
  }): Promise<TemplateView> {
    const res = await apiClient.post<TemplateView>("/admin/hall-tickets/template/unfix", params);
    return res.data;
  },

  async listTemplateVersions(): Promise<TemplateVersionSummary[]> {
    const res = await apiClient.get<TemplateVersionSummary[]>("/admin/hall-tickets/template/versions");
    return res.data;
  },

  async usePreviousTemplate(req: {
    versionId: number;
    academicYear: string;
    batch: string;
    deptKey?: string;
    yearLabel?: string;
    semester?: number;
  }): Promise<TemplateView> {
    const res = await apiClient.post<TemplateView>("/admin/hall-tickets/template/use-previous", req);
    return res.data;
  },

  async useReferenceTemplate(req: {
    academicYear: string;
    batch: string;
    deptKey?: string;
    yearLabel?: string;
    semester?: number;
  }): Promise<TemplateView> {
    const res = await apiClient.post<TemplateView>("/admin/hall-tickets/template/use-reference", req);
    return res.data;
  },

  // --- Selection Students Endpoint ---
  async getSelectionStudents(params: {
    departmentKey?: string;
    yearLabel?: string;
    semester?: number;
  }): Promise<SelectionStudentItem[]> {
    const res = await apiClient.get<SelectionStudentItem[]>("/admin/hall-tickets/selection/students", { params });
    return res.data;
  },

  // --- Dynamic Cohort Lookup Endpoints ---
  async getCohortDepartments(params?: {
    academicYear?: string;
    batch?: string;
    semester?: number;
  }): Promise<CohortDepartmentOption[]> {
    const res = await apiClient.get<CohortDepartmentOption[]>("/admin/hall-tickets/cohorts/departments", { params });
    return res.data;
  },

  async getCohortYears(departmentKey?: string): Promise<string[]> {
    const res = await apiClient.get<string[]>("/admin/hall-tickets/cohorts/years", {
      params: { departmentKey },
    });
    return res.data;
  },

  async getCohortSemesters(departmentKey?: string, yearLabel?: string): Promise<number[]> {
    const res = await apiClient.get<number[]>("/admin/hall-tickets/cohorts/semesters", {
      params: { departmentKey, yearLabel },
    });
    return res.data;
  },

  async getReadiness(params: {
    academicYear?: string;
    batch?: string;
    departmentKey?: string;
    yearLabel?: string;
    semester?: number | null;
  }): Promise<ReadinessResult> {
    const res = await apiClient.get<ReadinessResult>("/admin/hall-tickets/readiness", {
      params: {
        academicYear: params.academicYear || undefined,
        batch: params.batch || undefined,
        departmentKey: params.departmentKey || undefined,
        yearLabel: params.yearLabel || undefined,
        semester: params.semester != null ? params.semester : undefined,
      },
    });
    return res.data;
  },

  async getPreview(params: {
    academicYear?: string;
    batch?: string;
    semester?: number;
    departmentKey?: string;
    yearLabel?: string;
    templateName?: string;
    templateId?: number;
  }): Promise<CandidatePreview> {
    const res = await apiClient.get<CandidatePreview>("/admin/hall-tickets/preview", { params });
    return res.data;
  },

  async generateFromTemplate(req: {
    academicYear: string;
    batch: string;
    semester: number;
    departmentKey: string;
    yearLabel?: string;
    templateId?: number;
    templateName?: string;
  }): Promise<GenerateResult> {
    const res = await apiClient.post<GenerateResult>("/admin/hall-tickets/generate", {
      ...req,
      academicYear: req.academicYear ? req.academicYear.replace(/\s+/g, "") : req.academicYear,
      batch: req.batch ? req.batch.replace(/\s+/g, "") : req.batch,
    });
    return res.data;
  },

  async applyTemplateToAll(req: {
    academicYear: string;
    batch: string;
    semester: number;
    departmentKey: string;
    yearLabel?: string;
  }): Promise<ApplyResult> {
    const res = await apiClient.post<ApplyResult>("/admin/hall-tickets/apply", {
      ...req,
      academicYear: req.academicYear ? req.academicYear.replace(/\s+/g, "") : req.academicYear,
      batch: req.batch ? req.batch.replace(/\s+/g, "") : req.batch,
    });
    return res.data;
  },

  async getReviewSummary(params: {
    academicYear: string;
    batch: string;
    semester: number;
    departmentKey: string;
    yearLabel?: string;
  }): Promise<ReviewSummary> {
    const res = await apiClient.get<ReviewSummary>("/admin/hall-tickets/review", {
      params: {
        ...params,
        academicYear: params.academicYear ? params.academicYear.replace(/\s+/g, "") : params.academicYear,
        batch: params.batch ? params.batch.replace(/\s+/g, "") : params.batch,
      },
    });
    return res.data;
  },

  async confirmReview(req: {
    academicYear: string;
    batch: string;
    semester: number;
    departmentKey: string;
    yearLabel?: string;
    reviewerName: string;
  }): Promise<ReviewConfirmResponse> {
    const res = await apiClient.post<ReviewConfirmResponse>("/admin/hall-tickets/review/confirm", {
      ...req,
      academicYear: req.academicYear ? req.academicYear.replace(/\s+/g, "") : req.academicYear,
      batch: req.batch ? req.batch.replace(/\s+/g, "") : req.batch,
    });
    return res.data;
  },

  async publishFromTemplate(req: {
    academicYear: string;
    batch: string;
    semester?: number;
    departmentKey?: string;
    yearLabel?: string;
    ticketId?: number;
  }): Promise<TemplatePublishResult> {
    const res = await apiClient.post<TemplatePublishResult>("/admin/hall-tickets/publish-reviewed", {
      ...req,
      academicYear: req.academicYear ? req.academicYear.replace(/\s+/g, "") : req.academicYear,
      batch: req.batch ? req.batch.replace(/\s+/g, "") : req.batch,
    });
    return res.data;
  },

  async listGeneratedTickets(params: {
    academicYear?: string;
    batch?: string;
    semester?: number;
    departmentKey?: string;
  }): Promise<HallTicketAdminView[]> {
    const res = await apiClient.get<HallTicketAdminView[]>("/admin/hall-tickets/template/tickets", {
      params: {
        ...params,
        academicYear: params.academicYear ? params.academicYear.replace(/\s+/g, "") : params.academicYear,
        batch: params.batch ? params.batch.replace(/\s+/g, "") : params.batch,
      },
    });
    return res.data;
  },

  async withdrawTicket(id: number, reason: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/admin/hall-tickets/ticket/${id}/withdraw`, {
      reason,
    });
    return res.data;
  },

  async withdrawSelection(params: {
    academicYear: string;
    batch: string;
    deptKey?: string;
    yearLabel?: string;
    semester?: number;
    reason: string;
  }): Promise<{ withdrawnCount: number; message: string }> {
    const res = await apiClient.post<{ withdrawnCount: number; message: string }>("/admin/hall-tickets/selection/withdraw-all", {
      ...params,
      academicYear: params.academicYear ? params.academicYear.replace(/\s+/g, "") : params.academicYear,
      batch: params.batch ? params.batch.replace(/\s+/g, "") : params.batch,
    });
    return res.data;
  },

  async restoreTicket(id: number): Promise<{ ticketId: number; status: string; message: string }> {
    const res = await apiClient.post<{ ticketId: number; status: string; message: string }>(`/admin/hall-tickets/ticket/${id}/restore`);
    return res.data;
  },
};
