import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../services/api";
import {
  FileText,
  FileCheck2,
  MessageSquare,
  RefreshCw,
  Search,
  Check,
  Send,
  Wand2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Building,
  Save,
  Users,
  ShieldAlert,
  ClipboardCheck,
  CheckSquare,
  ChevronRight,
  Eye,
  Sliders,
  UploadCloud,
  History,
  Layers,
} from "lucide-react";
import {
  hallTicketAdminApi,
  HallTicketAdminView,
  HallTicketQueryView,
  TemplateView,
  TemplateVersionSummary,
  CandidatePreview,
  CohortDepartmentOption,
  SelectionStudentItem,
  ReviewSummary,
  ReadinessResult,
} from "../services/hallTicketAdminApi";
import {
  HallTicketPortraitPreview,
  BlockLayout,
  HallTicketLayoutMap,
  DEFAULT_LAYOUT,
  parseLayoutJson,
} from "../components/hall-tickets/HallTicketPortraitPreview";

const FIXED_YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const FIXED_SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const validateImage = async (
  file: File,
  maxSize: number
): Promise<{ valid: boolean; error?: string; base64?: string }> => {
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit.` };
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 8));
  // PNG: 89 50 4E 47
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  // JPEG: FF D8 FF
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isPng && !isJpeg) {
    return { valid: false, error: "Only PNG and JPG/JPEG images are permitted." };
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ valid: true, base64: reader.result as string });
    reader.onerror = () => resolve({ valid: false, error: "Failed to read image file." });
    reader.readAsDataURL(file);
  });
};

export function HallTicketsPage() {
  const [activeTab, setActiveTab] = useState<"workflow" | "queries" | "legacy">("workflow");

  // ================= STAGE 1: SELECT STUDENTS =================
  const [cohortDepartments, setCohortDepartments] = useState<CohortDepartmentOption[]>([]);
  const [selectedCohortDept, setSelectedCohortDept] = useState<string>("aids");
  const [yearLabel, setYearLabel] = useState<string>("1st Year");
  const [semester, setSemester] = useState<number>(1);
  const [loadingCohorts, setLoadingCohorts] = useState<boolean>(true);
  const [cohortError, setCohortError] = useState<string | null>(null);

  // Academic Year and Batch (Selection Criteria #4 and #5)
  const [academicYear, setAcademicYear] = useState<string>("");
  const [batch, setBatch] = useState<string>("");

  // Student selection records loaded from DB
  const [selectionStudents, setSelectionStudents] = useState<SelectionStudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Section 3: Choose Template state
  const [editTemplateChoice, setEditTemplateChoice] = useState<"yes" | "no" | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState<string>("");
  const [customBgFile, setCustomBgFile] = useState<File | null>(null);
  const [customBgPreview, setCustomBgPreview] = useState<string | null>(null);

  // Section 4: 6-Block Layout Editor State
  const [activeBlock, setActiveBlock] = useState<keyof HallTicketLayoutMap>("header");

  // Section 7: Generate Checkbox Guard
  const [previewChecked, setPreviewChecked] = useState<boolean>(false);

  // ================= STAGE 2: EDIT TEMPLATE =================
  const [template, setTemplate] = useState<TemplateView>({
    academicYear: "",
    batch: "",
    templateName: "Reference",
    semester: null,
    examTitle: "END SEMESTER EXAMINATIONS",
    examinationCentre: "",
    notes: [
      "Hall Ticket is mandatory for entry into the Examination Hall.",
      "Carry a valid College ID along with this Hall Ticket.",
      "Any malpractice will result in cancellation of the examination.",
      "Report to the Examination Centre at least 30 minutes before the commencement of the exam.",
    ],
    sigCandidate: "Signature of the candidate",
    sigCoe: "Controller of Examinations",
    sigPrincipal: "Principal",
    showPhoto: true,
    photoPosition: "right",
    photoSize: "medium",
    logoSource: "both",
    status: "DRAFT",
    version: 1,
  });

  const [preview, setPreview] = useState<CandidatePreview | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [fixingTemplate, setFixingTemplate] = useState<boolean>(false);
  const [unfixingTemplate, setUnfixingTemplate] = useState<boolean>(false);

  const [templateFeedback, setTemplateFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Track saved baseline for dirty checking & save status
  const [lastSavedTemplate, setLastSavedTemplate] = useState<{
    academicYear: string;
    batch: string;
    templateName?: string;
    examTitle: string;
    examinationCentre: string;
    notes: string[];
    sigCandidate: string;
    sigCoe: string;
    sigPrincipal: string;
    showPhoto: boolean;
    photoPosition: string;
    photoSize: string;
    logoSource?: string;
    layoutJson?: string | null;
  } | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [templatesList, setTemplatesList] = useState<TemplateView[]>([]);
  const [templateVersions, setTemplateVersions] = useState<TemplateVersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);

  // ================= STAGE 4: GENERATE =================
  const [generating, setGenerating] = useState<boolean>(false);
  const [generationSummary, setGenerationSummary] = useState<{
    created: number;
    updated: number;
    rebuilt?: number;
    papersWritten?: number;
    skipped: number;
    message: string;
  } | null>(null);
  const [customTemplateError, setCustomTemplateError] = useState<string | null>(null);

  // Readiness evaluation (explains why Generate is disabled)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState<boolean>(false);

  // ================= STAGE 5: REVIEW =================
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [loadingReview, setLoadingReview] = useState<boolean>(false);
  const [reviewerName, setReviewerName] = useState<string>("");
  const [confirmingReview, setConfirmingReview] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // ================= STAGE 6: PUBLISH =================
  const [publishing, setPublishing] = useState<boolean>(false);
  const [publishSummary, setPublishSummary] = useState<{
    publishedCount: number;
    blockedCount: number;
    supersededCount: number;
    blockedRegNos: string[];
    message: string;
  } | null>(null);

  // ================= TICKETS & QUERIES =================
  const [tickets, setTickets] = useState<HallTicketAdminView[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [ticketSearch, setTicketSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [queries, setQueries] = useState<HallTicketQueryView[]>([]);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replyingId, setReplyingId] = useState<number | null>(null);

  // Legacy tab state
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [loadingLegacy, setLoadingLegacy] = useState<boolean>(false);
  const [generatingLegacy, setGeneratingLegacy] = useState<boolean>(false);
  const [legacySuccess, setLegacySuccess] = useState<string | null>(null);

  // Validation helpers
  const parseYears = (val: string): [number, number] | null => {
    const m = val.trim().match(/^(\d{4})-(\d{4})$/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10)];
  };

  const ayYears = useMemo(() => parseYears(academicYear), [academicYear]);
  const isAyValid = ayYears !== null;
  const batchYears = useMemo(() => parseYears(batch), [batch]);
  const isBatchValid = batchYears !== null && batchYears[1] > batchYears[0];
  const isFixed = template.status === "FIXED";

  // Dynamic count of published tickets for current selection
  const publishedTicketsCount = useMemo(() => {
    const fromTickets = tickets.filter((t) => t.status === "PUBLISHED").length;
    const fromReview = reviewSummary?.tickets
      ? reviewSummary.tickets.filter((t) => t.status === "PUBLISHED").length
      : 0;
    const fromPublish = publishSummary?.publishedCount ?? 0;
    return Math.max(fromTickets, fromReview, fromPublish);
  }, [tickets, reviewSummary, publishSummary]);

  const withdrawnTicketsCount = useMemo(() => {
    const fromTickets = tickets.filter((t) => t.status === "WITHDRAWN").length;
    const fromReview = reviewSummary?.tickets
      ? reviewSummary.tickets.filter((t) => t.status === "WITHDRAWN").length
      : 0;
    return Math.max(fromTickets, fromReview, reviewSummary?.withdrawnCount ?? 0);
  }, [tickets, reviewSummary]);

  const blockedTicketsCount = useMemo(() => {
    return tickets.filter((t) => t.status === "BLOCKED_FEES").length;
  }, [tickets]);

  const generatedTicketsCount = useMemo(() => {
    return tickets.filter((t) => t.status === "GENERATED").length;
  }, [tickets]);

  // Withdraw & Restore State
  const [withdrawingTicketId, setWithdrawingTicketId] = useState<number | null>(null);
  const [withdrawReasonInput, setWithdrawReasonInput] = useState<string>("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState<boolean>(false);

  const [withdrawAllModalOpen, setWithdrawAllModalOpen] = useState<boolean>(false);
  const [withdrawAllReasonInput, setWithdrawAllReasonInput] = useState<string>("");
  const [withdrawAllError, setWithdrawAllError] = useState<string | null>(null);
  const [isSubmittingWithdrawAll, setIsSubmittingWithdrawAll] = useState<boolean>(false);

  const [restoringTicketId, setRestoringTicketId] = useState<number | null>(null);

  // Check if current fields differ from lastSavedTemplate baseline
  const hasUnsavedChanges = useMemo(() => {
    if (!lastSavedTemplate) return false;
    if (academicYear.trim() !== lastSavedTemplate.academicYear.trim()) return true;
    if (batch.trim() !== lastSavedTemplate.batch.trim()) return true;
    if ((template.templateName || "Reference").trim() !== (lastSavedTemplate.templateName || "Reference").trim()) return true;
    if ((template.examTitle || "").trim() !== (lastSavedTemplate.examTitle || "").trim()) return true;
    if ((template.examinationCentre || "").trim() !== (lastSavedTemplate.examinationCentre || "").trim()) return true;
    if ((template.sigCandidate || "").trim() !== (lastSavedTemplate.sigCandidate || "").trim()) return true;
    if ((template.sigCoe || "").trim() !== (lastSavedTemplate.sigCoe || "").trim()) return true;
    if ((template.sigPrincipal || "").trim() !== (lastSavedTemplate.sigPrincipal || "").trim()) return true;
    if (Boolean(template.showPhoto) !== Boolean(lastSavedTemplate.showPhoto)) return true;
    if ((template.photoPosition || "right") !== (lastSavedTemplate.photoPosition || "right")) return true;
    if ((template.photoSize || "medium") !== (lastSavedTemplate.photoSize || "medium")) return true;
    if ((template.logoSource || "both") !== (lastSavedTemplate.logoSource || "both")) return true;
    if ((template.layoutJson || "") !== (lastSavedTemplate.layoutJson || "")) return true;
    if (template.notes.length !== lastSavedTemplate.notes.length) return true;
    for (let i = 0; i < template.notes.length; i++) {
      if (template.notes[i] !== lastSavedTemplate.notes[i]) return true;
    }
    return false;
  }, [academicYear, batch, template, lastSavedTemplate]);

  // Section 4: 6-Block Layout Management
  const currentLayout = useMemo(() => parseLayoutJson(template.layoutJson), [template.layoutJson]);

  const updateBlockLayout = (block: keyof HallTicketLayoutMap, updater: (prev: BlockLayout) => BlockLayout) => {
    if (isFixed) return;
    const nextLayout: HallTicketLayoutMap = {
      ...currentLayout,
      [block]: updater(currentLayout[block]),
    };
    setTemplate((prev) => ({
      ...prev,
      layoutJson: JSON.stringify(nextLayout),
    }));
  };

  const moveBlock = (block: keyof HallTicketLayoutMap, dx: number, dy: number, shift: boolean) => {
    const step = shift ? 5 : 1;
    updateBlockLayout(block, (prev) => ({
      ...prev,
      x: prev.x + dx * step,
      y: prev.y + dy * step,
    }));
  };

  const adjustWidth = (block: keyof HallTicketLayoutMap, delta: number) => {
    updateBlockLayout(block, (prev) => ({
      ...prev,
      width: Math.max(10, Math.min(100, (prev.width || 100) + delta)),
    }));
  };

  const adjustFontSize = (block: keyof HallTicketLayoutMap, delta: number) => {
    updateBlockLayout(block, (prev) => ({
      ...prev,
      fontSize: Math.max(6, Math.min(24, (prev.fontSize || 10) + delta)),
    }));
  };

  const setBlockCoord = (block: keyof HallTicketLayoutMap, axis: "x" | "y", val: number) => {
    updateBlockLayout(block, (prev) => ({
      ...prev,
      [axis]: isNaN(val) ? 0 : val,
    }));
  };

  // 1. Initial Load: Departments
  useEffect(() => {
    let isMounted = true;
    async function loadDepts() {
      try {
        setLoadingCohorts(true);
        setCohortError(null);
        const depts = await hallTicketAdminApi.getCohortDepartments();
        if (!isMounted) return;
        setCohortDepartments(depts || []);
        if (depts && depts.length > 0) {
          setSelectedCohortDept((prev) => {
            if (prev && depts.some((d) => d.deptKey === prev)) return prev;
            const aids = depts.find((d) => d.deptKey.toLowerCase() === "aids");
            return aids ? aids.deptKey : depts[0].deptKey;
          });
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || "Failed to load departments";
        if (isMounted) setCohortError(msg);
      } finally {
        if (isMounted) setLoadingCohorts(false);
      }
    }
    loadDepts();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Selection Students (Stage 1 table) - When all 5 criteria are set
  const loadSelectionStudents = useCallback(async () => {
    if (!selectedCohortDept || !yearLabel || !semester || !isAyValid || !isBatchValid) {
      setSelectionStudents([]);
      setStudentError(null);
      return;
    }
    try {
      setLoadingStudents(true);
      setStudentError(null);
      const list = await hallTicketAdminApi.getSelectionStudents({
        departmentKey: selectedCohortDept,
        yearLabel,
        semester,
      });
      setSelectionStudents(list || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to load students";
      setStudentError(msg);
      setSelectionStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedCohortDept, yearLabel, semester, isAyValid, isBatchValid]);

  useEffect(() => {
    loadSelectionStudents();
  }, [loadSelectionStudents]);

  // 3. Load Template when AY, Batch and Selection criteria are entered
  useEffect(() => {
    if (!isAyValid || !isBatchValid) return;
    let isMounted = true;
    async function loadTemplateData() {
      try {
        setLoadingTemplate(true);
        const [t, list] = await Promise.all([
          hallTicketAdminApi.getTemplate({
            academicYear,
            batch,
            departmentKey: selectedCohortDept,
            yearLabel,
            semester,
          }),
          hallTicketAdminApi.listTemplates({
            academicYear,
            batch,
            departmentKey: selectedCohortDept,
            yearLabel,
            semester,
          }),
        ]);
        if (isMounted) {
          setTemplate(t);
          setTemplatesList(list || []);
          setLastSavedTemplate({
            academicYear: t.academicYear || academicYear,
            batch: t.batch || batch,
            templateName: t.templateName || "Reference",
            examTitle: t.examTitle || "",
            examinationCentre: t.examinationCentre || "",
            notes: [...(t.notes || [])],
            sigCandidate: t.sigCandidate || "",
            sigCoe: t.sigCoe || "",
            sigPrincipal: t.sigPrincipal || "",
            showPhoto: Boolean(t.showPhoto),
            photoPosition: t.photoPosition || "right",
            photoSize: t.photoSize || "medium",
            logoSource: t.logoSource || "both",
            layoutJson: t.layoutJson || null,
          });
          setSaveErrorMsg(null);
        }
      } catch (err: any) {
        console.error("Failed to load template:", err);
      } finally {
        if (isMounted) setLoadingTemplate(false);
      }
    }
    loadTemplateData();
    return () => {
      isMounted = false;
    };
  }, [academicYear, batch, selectedCohortDept, yearLabel, semester, isAyValid, isBatchValid]);

  // 4. Live Portrait Preview (using first student in selection)
  const loadPreview = useCallback(async () => {
    if (!isAyValid || !isBatchValid || !selectedCohortDept || !yearLabel || !semester) {
      setPreview(null);
      return;
    }
    try {
      setLoadingPreview(true);
      const p = await hallTicketAdminApi.getPreview({
        academicYear,
        batch,
        semester,
        departmentKey: selectedCohortDept,
        yearLabel,
      });
      setPreview(p);
    } catch (err: any) {
      console.error("Failed to load preview:", err);
    } finally {
      setLoadingPreview(false);
    }
  }, [academicYear, batch, semester, selectedCohortDept, yearLabel, isAyValid, isBatchValid]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // 5. Readiness check for Stage 4 Generate
  const loadReadiness = useCallback(async () => {
    try {
      setLoadingReadiness(true);
      const res = await hallTicketAdminApi.getReadiness({
        academicYear,
        batch,
        departmentKey: selectedCohortDept,
        yearLabel,
        semester,
      });
      setReadiness(res);
    } catch (err: any) {
      console.error("Failed to fetch readiness:", err);
    } finally {
      setLoadingReadiness(false);
    }
  }, [academicYear, batch, selectedCohortDept, yearLabel, semester]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

  // 6. Review Summary (Stage 5)
  const loadReview = useCallback(async () => {
    if (!isAyValid || !isBatchValid || !selectedCohortDept || !yearLabel || !semester) {
      setReviewSummary(null);
      return;
    }
    try {
      setLoadingReview(true);
      const rev = await hallTicketAdminApi.getReviewSummary({
        academicYear,
        batch,
        semester,
        departmentKey: selectedCohortDept,
        yearLabel,
      });
      setReviewSummary(rev);
    } catch (err: any) {
      console.error("Failed to load review summary:", err);
    } finally {
      setLoadingReview(false);
    }
  }, [academicYear, batch, semester, selectedCohortDept, yearLabel, isAyValid, isBatchValid]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  // 7. Generated tickets table
  const loadTickets = useCallback(async () => {
    if (!isAyValid || !isBatchValid || !semester) return;
    try {
      setLoadingTickets(true);
      const list = await hallTicketAdminApi.listGeneratedTickets({
        academicYear,
        batch,
        semester,
        departmentKey: selectedCohortDept || undefined,
      });
      setTickets(list || []);
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  }, [academicYear, batch, semester, selectedCohortDept, isAyValid, isBatchValid]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Queries
  const loadQueries = useCallback(async () => {
    try {
      const res = await hallTicketAdminApi.listQueries();
      setQueries(res || []);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  // Legacy Timetable Departments
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await apiClient.get<any[]>("/admin/departments");
        setDepartments(res.data || []);
      } catch {
        // Fallback
      }
    }
    loadDepts();
  }, []);

  // Filtered selection students
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return selectionStudents;
    const q = studentSearch.toLowerCase();
    return selectionStudents.filter(
      (s) =>
        s.registerNumber.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.degreeBranch && s.degreeBranch.toLowerCase().includes(q)) ||
        (s.section && s.section.toLowerCase().includes(q))
    );
  }, [selectionStudents, studentSearch]);

  // Current department display
  const currentDeptObj = cohortDepartments.find(
    (d) => d.deptKey.toLowerCase() === selectedCohortDept.toLowerCase()
  );

  // Template Notes Management
  const handleNoteChange = (idx: number, val: string) => {
    if (isFixed) return;
    const next = [...template.notes];
    next[idx] = val;
    setTemplate({ ...template, notes: next });
  };

  const handleAddNote = () => {
    if (isFixed || template.notes.length >= 10) return;
    setTemplate({
      ...template,
      notes: [...template.notes, "New examination rule / instruction."],
    });
  };

  const handleRemoveNote = (idx: number) => {
    if (isFixed) return;
    const next = template.notes.filter((_, i) => i !== idx);
    setTemplate({ ...template, notes: next });
  };

  const handleMoveNote = (idx: number, direction: "up" | "down") => {
    if (isFixed) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= template.notes.length) return;
    const next = [...template.notes];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setTemplate({ ...template, notes: next });
  };

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setCustomBgFile(null);
      setCustomBgPreview(null);
      return;
    }
    const file = e.target.files[0];
    const val = await validateImage(file, 2 * 1024 * 1024);
    if (!val.valid) {
      setTemplateFeedback({ text: val.error || "Invalid background image file", type: "error" });
      setCustomBgFile(null);
      setCustomBgPreview(null);
      return;
    }
    setCustomBgFile(file);
    setCustomBgPreview(val.base64 || null);
    setTemplateFeedback({ text: `Background image "${file.name}" validated successfully.`, type: "success" });
  };

  const handleUseReferenceTemplate = async () => {
    if (!isAyValid || !isBatchValid) {
      setTemplateFeedback({ text: "Please enter valid Academic Year and Batch (YYYY-YYYY) first.", type: "error" });
      return;
    }
    try {
      setLoadingTemplate(true);
      setTemplateFeedback(null);
      const copy = await hallTicketAdminApi.useReferenceTemplate({
        academicYear,
        batch,
        deptKey: selectedCohortDept,
        yearLabel,
        semester,
      });
      setTemplate(copy);
      setLastSavedTemplate({
        academicYear: copy.academicYear || academicYear,
        batch: copy.batch || batch,
        templateName: copy.templateName || "Reference",
        examTitle: copy.examTitle || "",
        examinationCentre: copy.examinationCentre || "",
        notes: [...(copy.notes || [])],
        sigCandidate: copy.sigCandidate || "",
        sigCoe: copy.sigCoe || "",
        sigPrincipal: copy.sigPrincipal || "",
        showPhoto: Boolean(copy.showPhoto),
        photoPosition: copy.photoPosition || "right",
        photoSize: copy.photoSize || "medium",
        logoSource: copy.logoSource || "both",
        layoutJson: copy.layoutJson || null,
      });
      setEditTemplateChoice("yes");
      setTemplateFeedback({ text: `Reference template loaded as editable draft for ${selectedCohortDept.toUpperCase()} Sem ${semester}.`, type: "success" });
      const list = await hallTicketAdminApi.listTemplates({ academicYear, batch, departmentKey: selectedCohortDept, yearLabel, semester });
      setTemplatesList(list || []);
      loadPreview();
      loadReadiness();
    } catch (err: any) {
      setTemplateFeedback({ text: err.response?.data?.message || err.message || "Failed to load reference template", type: "error" });
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleCreateCustomTemplate = async () => {
    if (!customTemplateName.trim()) {
      setCustomTemplateError("Template name is required.");
      setTemplateFeedback({ text: "Template name is required.", type: "error" });
      return;
    }
    if (!isAyValid || !isBatchValid) {
      setCustomTemplateError("Valid Academic Year and Batch (YYYY-YYYY) required.");
      setTemplateFeedback({ text: "Valid Academic Year and Batch (YYYY-YYYY) required.", type: "error" });
      return;
    }
    try {
      setLoadingTemplate(true);
      setCustomTemplateError(null);
      setTemplateFeedback(null);
      let bgBase64: string | undefined = undefined;
      let bgMime: string | undefined = undefined;

      if (customBgFile && customBgPreview) {
        bgBase64 = customBgPreview;
        bgMime = customBgFile.type;
      }

      const semNum = typeof semester === "number" ? semester : parseInt(String(semester), 10);
      const created = await hallTicketAdminApi.createTemplate({
        academicYear: academicYear.trim(),
        batch: batch.trim(),
        deptKey: selectedCohortDept ? selectedCohortDept.trim() : undefined,
        yearLabel: yearLabel ? yearLabel.trim() : undefined,
        semester: !isNaN(semNum) && semNum > 0 ? semNum : undefined,
        templateName: customTemplateName.trim(),
      });
      setTemplate(created);
      setLastSavedTemplate({
        academicYear: created.academicYear || academicYear,
        batch: created.batch || batch,
        templateName: created.templateName || customTemplateName.trim(),
        examTitle: created.examTitle || "",
        examinationCentre: created.examinationCentre || "",
        notes: [...(created.notes || [])],
        sigCandidate: created.sigCandidate || "",
        sigCoe: created.sigCoe || "",
        sigPrincipal: created.sigPrincipal || "",
        showPhoto: Boolean(created.showPhoto),
        photoPosition: created.photoPosition || "right",
        photoSize: created.photoSize || "medium",
        logoSource: created.logoSource || "both",
        layoutJson: created.layoutJson || null,
      });
      setEditTemplateChoice("yes");
      setTemplateFeedback({ text: `Custom template "${customTemplateName}" created and opened as editable draft.`, type: "success" });
      const list = await hallTicketAdminApi.listTemplates({ academicYear, batch, departmentKey: selectedCohortDept, yearLabel, semester });
      setTemplatesList(list || []);
      loadPreview();
      loadReadiness();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to create template";
      setCustomTemplateError(msg);
      setTemplateFeedback({ text: msg, type: "error" });
    } finally {
      setLoadingTemplate(false);
    }
  };

  const loadSavedVersions = async () => {
    try {
      setLoadingVersions(true);
      const list = await hallTicketAdminApi.listTemplateVersions();
      setTemplateVersions(list || []);
      setShowVersionModal(true);
    } catch (err: any) {
      setTemplateFeedback({ text: err.response?.data?.message || err.message || "Failed to load saved versions", type: "error" });
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleApplyPreviousVersion = async (vId: number) => {
    try {
      setLoadingTemplate(true);
      setTemplateFeedback(null);
      const applied = await hallTicketAdminApi.usePreviousTemplate({
        versionId: vId,
        academicYear,
        batch,
        deptKey: selectedCohortDept,
        yearLabel,
        semester,
      });
      setTemplate(applied);
      setLastSavedTemplate({
        academicYear: applied.academicYear || academicYear,
        batch: applied.batch || batch,
        templateName: applied.templateName || "Reference",
        examTitle: applied.examTitle || "",
        examinationCentre: applied.examinationCentre || "",
        notes: [...(applied.notes || [])],
        sigCandidate: applied.sigCandidate || "",
        sigCoe: applied.sigCoe || "",
        sigPrincipal: applied.sigPrincipal || "",
        showPhoto: Boolean(applied.showPhoto),
        photoPosition: applied.photoPosition || "right",
        photoSize: applied.photoSize || "medium",
        logoSource: applied.logoSource || "both",
        layoutJson: applied.layoutJson || null,
      });
      setShowVersionModal(false);
      setEditTemplateChoice("yes");
      setTemplateFeedback({ text: `Template version #${vId} copied into draft for current selection.`, type: "success" });
      const list = await hallTicketAdminApi.listTemplates({ academicYear, batch, departmentKey: selectedCohortDept, yearLabel, semester });
      setTemplatesList(list || []);
      loadPreview();
    } catch (err: any) {
      setTemplateFeedback({ text: err.response?.data?.message || err.message || "Failed to copy version", type: "error" });
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const val = await validateImage(file, 1 * 1024 * 1024);
    if (!val.valid) {
      setTemplateFeedback({ text: val.error || "Invalid logo image", type: "error" });
      return;
    }
    setTemplate({
      ...template,
      logoSource: "uploaded",
      logoImage: val.base64,
      logoMime: file.type,
    });
  };

  // Stage 2: Save Draft
  const handleSaveDraft = async () => {
    if (isFixed) {
      setTemplateFeedback({ text: "Template is fixed and locked. Unfix the template first to edit.", type: "error" });
      return;
    }
    if (!isAyValid || !isBatchValid) {
      setTemplateFeedback({ text: "Please enter valid Academic Year and Batch formats (YYYY-YYYY).", type: "error" });
      setSaveErrorMsg("Valid Academic Year and Batch (YYYY-YYYY) required.");
      return;
    }
    try {
      setSavingTemplate(true);
      setTemplateFeedback(null);
      setSaveErrorMsg(null);
      const updated = await hallTicketAdminApi.saveTemplate({
        academicYear,
        batch,
        templateName: template.templateName || "Reference",
        deptKey: selectedCohortDept,
        yearLabel,
        semester,
        examTitle: template.examTitle,
        examinationCentre: template.examinationCentre,
        notes: template.notes,
        sigCandidate: template.sigCandidate,
        sigCoe: template.sigCoe,
        sigPrincipal: template.sigPrincipal,
        showPhoto: template.showPhoto,
        photoPosition: template.photoPosition,
        photoSize: template.photoSize,
        logoSource: template.logoSource,
        logoImage: template.logoImage,
        logoMime: template.logoMime,
        backgroundImage: template.backgroundImage,
        backgroundMime: template.backgroundMime,
        layoutJson: template.layoutJson,
      });
      // Refresh state from server response so displayed values match what is stored
      setTemplate(updated);
      setLastSavedTemplate({
        academicYear: updated.academicYear || academicYear,
        batch: updated.batch || batch,
        templateName: updated.templateName || "Reference",
        examTitle: updated.examTitle || "",
        examinationCentre: updated.examinationCentre || "",
        notes: [...(updated.notes || [])],
        sigCandidate: updated.sigCandidate || "",
        sigCoe: updated.sigCoe || "",
        sigPrincipal: updated.sigPrincipal || "",
        showPhoto: Boolean(updated.showPhoto),
        photoPosition: updated.photoPosition || "right",
        photoSize: updated.photoSize || "medium",
        logoSource: updated.logoSource || "both",
        layoutJson: updated.layoutJson || null,
      });
      const list = await hallTicketAdminApi.listTemplates({ academicYear, batch, departmentKey: selectedCohortDept, yearLabel, semester });
      setTemplatesList(list || []);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedTime(timeStr);
      setSaveErrorMsg(null);
      setTemplateFeedback({ text: `Template draft saved successfully at ${timeStr}.`, type: "success" });
      await loadReview();
      await loadReadiness();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save draft.";
      setSaveErrorMsg(msg);
      setTemplateFeedback({
        text: msg,
        type: "error",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  // Stage 3: Fix Template
  const handleFixTemplate = async () => {
    if (!template.examinationCentre || !template.examinationCentre.trim()) {
      setTemplateFeedback({ text: "Cannot fix template: Examination centre is required. Please specify exam centre and save draft.", type: "error" });
      return;
    }
    if (!template.notes || template.notes.length === 0 || !template.notes.some((n) => n && n.trim())) {
      setTemplateFeedback({ text: "Cannot fix template: At least one examination instruction note is required. Please add a note and save draft.", type: "error" });
      return;
    }
    if (hasUnsavedChanges) {
      setTemplateFeedback({ text: "Cannot fix template: You have unsaved draft changes. Please click 'Save Draft' first.", type: "error" });
      return;
    }
    if (!isAyValid || !isBatchValid) {
      setTemplateFeedback({ text: "Cannot fix template: Academic Year and Batch must be in valid YYYY-YYYY format.", type: "error" });
      return;
    }

    try {
      setFixingTemplate(true);
      setTemplateFeedback(null);
      const updated = await hallTicketAdminApi.fixTemplate({
        academicYear,
        batch,
        templateName: template.templateName,
        templateId: template.id || undefined,
        deptKey: selectedCohortDept,
        yearLabel,
        semester,
      });
      setTemplate(updated);
      setTemplateFeedback({
        text: `Template fixed and locked (v${updated.version})! Ready for generation.`,
        type: "success",
      });
      const list = await hallTicketAdminApi.listTemplates({ academicYear, batch, departmentKey: selectedCohortDept, yearLabel, semester });
      setTemplatesList(list || []);
      await loadReview();
      await loadReadiness();
    } catch (err: any) {
      setTemplateFeedback({
        text: err.response?.data?.message || err.message || "Failed to fix template.",
        type: "error",
      });
    } finally {
      setFixingTemplate(false);
    }
  };

  // Stage 3: Unfix Template
  const handleUnfixTemplate = async () => {
    try {
      setUnfixingTemplate(true);
      setTemplateFeedback(null);
      const updated = await hallTicketAdminApi.unfixTemplate({
        academicYear,
        batch,
        templateName: template.templateName,
        templateId: template.id || undefined,
        deptKey: selectedCohortDept,
        yearLabel,
        semester,
      });
      setTemplate(updated);
      setTemplateFeedback({ text: "Template unlocked and returned to DRAFT mode with all settings preserved.", type: "success" });
      const list = await hallTicketAdminApi.listTemplates({ academicYear, batch, departmentKey: selectedCohortDept, yearLabel, semester });
      setTemplatesList(list || []);
      await loadReview();
      await loadReadiness();
    } catch (err: any) {
      setTemplateFeedback({
        text: err.response?.data?.message || err.message || "Failed to unfix template.",
        type: "error",
      });
    } finally {
      setUnfixingTemplate(false);
    }
  };

  // Stage 4: Generate Hall Tickets
  const handleGenerate = async () => {
    if (!isFixed) {
      setTemplateFeedback({ text: "Cannot generate: Template must be fixed first.", type: "error" });
      return;
    }
    if (!previewChecked) {
      setTemplateFeedback({ text: "Please inspect the preview and tick 'I have checked the preview' before generating.", type: "error" });
      return;
    }
    if (!readiness?.canGenerate) {
      const msg = readiness?.missing?.length
        ? readiness.missing.join("; ")
        : "Cannot generate: Pre-conditions not met.";
      setTemplateFeedback({ text: msg, type: "error" });
      return;
    }

    try {
      setGenerating(true);
      setGenerationSummary(null);
      setTemplateFeedback(null);
      const res = await hallTicketAdminApi.generateFromTemplate({
        academicYear,
        batch,
        semester,
        departmentKey: selectedCohortDept,
        yearLabel,
      });
      setGenerationSummary({
        created: res.created,
        updated: res.updated,
        rebuilt: res.rebuilt ?? res.updated,
        papersWritten: res.papersWritten ?? 0,
        skipped: res.skippedPublished,
        message: res.message,
      });
      await loadTickets();
      await loadReview();
      await loadReadiness();
    } catch (err: any) {
      setTemplateFeedback({
        text: err.response?.data?.message || err.message || "Failed to generate hall tickets.",
        type: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Stage 5: Confirm Review
  const handleConfirmReview = async () => {
    if (!reviewerName.trim()) {
      setReviewFeedback({ text: "Please enter reviewer name to confirm review.", type: "error" });
      return;
    }
    try {
      setConfirmingReview(true);
      setReviewFeedback(null);
      const res = await hallTicketAdminApi.confirmReview({
        academicYear,
        batch,
        semester,
        departmentKey: selectedCohortDept,
        yearLabel,
        reviewerName: reviewerName.trim(),
      });
      setReviewFeedback({ text: res.message, type: "success" });
      await loadReview();
    } catch (err: any) {
      setReviewFeedback({
        text: err.response?.data?.message || err.message || "Failed to confirm review.",
        type: "error",
      });
    } finally {
      setConfirmingReview(false);
    }
  };

  // Stage 6: Publish Hall Tickets
  const handlePublishAll = async () => {
    if (!reviewSummary?.canPublish) {
      setPublishSummary({
        publishedCount: 0,
        blockedCount: 0,
        supersededCount: 0,
        blockedRegNos: [],
        message: "Publish is blocked: Review must be confirmed and all blocking issues resolved.",
      });
      return;
    }

    try {
      setPublishing(true);
      setPublishSummary(null);
      const res = await hallTicketAdminApi.publishFromTemplate({
        academicYear,
        batch,
        semester,
        departmentKey: selectedCohortDept,
        yearLabel,
      });
      setPublishSummary({
        publishedCount: res.publishedCount,
        blockedCount: res.blockedCount,
        supersededCount: res.supersededCount,
        blockedRegNos: res.blockedRegNos || [],
        message: res.message,
      });
      await loadTickets();
      await loadReview();
    } catch (err: any) {
      setPublishSummary({
        publishedCount: 0,
        blockedCount: 0,
        supersededCount: 0,
        blockedRegNos: [],
        message: err.response?.data?.message || err.message || "Failed to publish hall tickets.",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Withdraw & Restore handlers
  const handleWithdrawSingleTicket = async (id: number) => {
    const trimmed = withdrawReasonInput.trim();
    if (!trimmed) {
      setWithdrawError("Withdrawal reason is required.");
      return;
    }
    if (trimmed.length > 300) {
      setWithdrawError("Withdrawal reason cannot exceed 300 characters.");
      return;
    }
    try {
      setIsSubmittingWithdraw(true);
      setWithdrawError(null);
      await hallTicketAdminApi.withdrawTicket(id, trimmed);
      setWithdrawingTicketId(null);
      setWithdrawReasonInput("");
      await loadTickets();
      await loadReview();
    } catch (err: any) {
      setWithdrawError(err.response?.data?.message || err.message || "Failed to withdraw ticket.");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleWithdrawAllPublished = async () => {
    const trimmed = withdrawAllReasonInput.trim();
    if (!trimmed) {
      setWithdrawAllError("Withdrawal reason is required.");
      return;
    }
    if (trimmed.length > 300) {
      setWithdrawAllError("Withdrawal reason cannot exceed 300 characters.");
      return;
    }
    try {
      setIsSubmittingWithdrawAll(true);
      setWithdrawAllError(null);
      await hallTicketAdminApi.withdrawSelection({
        academicYear,
        batch,
        deptKey: selectedCohortDept,
        yearLabel,
        semester,
        reason: trimmed,
      });
      setWithdrawAllModalOpen(false);
      setWithdrawAllReasonInput("");
      await loadTickets();
      await loadReview();
    } catch (err: any) {
      setWithdrawAllError(err.response?.data?.message || err.message || "Failed to withdraw published tickets.");
    } finally {
      setIsSubmittingWithdrawAll(false);
    }
  };

  const handleRestoreTicket = async (id: number) => {
    try {
      setRestoringTicketId(id);
      await hallTicketAdminApi.restoreTicket(id);
      await loadTickets();
      await loadReview();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to restore hall ticket.");
    } finally {
      setRestoringTicketId(null);
    }
  };

  // Queries reply handler
  const handleSendReply = async (queryId: number) => {
    const text = replyText[queryId]?.trim();
    if (!text) return;
    try {
      setReplyingId(queryId);
      await hallTicketAdminApi.respondQuery(queryId, text);
      setReplyText((prev) => ({ ...prev, [queryId]: "" }));
      await loadQueries();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Could not submit response.");
    } finally {
      setReplyingId(null);
    }
  };

  // Legacy tab actions
  const loadLegacyBatch = async () => {
    if (!selectedDept || !selectedSemester) return;
    try {
      setLoadingLegacy(true);
      await apiClient.get<any[]>("/admin/hallticket/batch", {
        params: {
          dept: selectedDept,
          year: selectedYear || undefined,
          semester: Number(selectedSemester),
        },
      });
    } catch (err: any) {
      console.error("Legacy batch error:", err);
    } finally {
      setLoadingLegacy(false);
    }
  };

  const handleLegacyGenerate = async () => {
    if (!selectedDept || !selectedSemester) return;
    try {
      setGeneratingLegacy(true);
      setLegacySuccess(null);
      await apiClient.post("/admin/hallticket/generate", {
        dept: selectedDept,
        year: selectedYear,
        semester: Number(selectedSemester),
      });
      setLegacySuccess("Generated hall tickets for department batch.");
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to generate.");
    } finally {
      setGeneratingLegacy(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#D4A72C] border border-[#D4A72C]/40">
              <FileText size={26} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                COE Hall Tickets Operations
              </h1>
              <p className="text-xs sm:text-sm font-bold text-[#D4A72C] uppercase tracking-wider mt-0.5">
                Stage-by-Stage Workflow: Selection &rarr; Template &rarr; Fix &rarr; Generate &rarr; Review &rarr; Publish
              </p>
            </div>
          </div>

          <div className="bg-white/10 text-white border border-white/20 px-4 py-2 rounded-xl text-xs font-mono font-bold">
            COE Logistics Portal
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/10">
          <button
            onClick={() => setActiveTab("workflow")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "workflow"
                ? "bg-white text-[#0B192C] shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileCheck2 size={15} />
            Stages 1-6 Workflow
          </button>

          <button
            onClick={() => setActiveTab("queries")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "queries"
                ? "bg-white text-[#0B192C] shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <MessageSquare size={15} />
            Student Queries
            {queries.length > 0 && (
              <span className="bg-[#D4A72C] text-[#0B192C] px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {queries.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("legacy")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "legacy"
                ? "bg-white text-[#0B192C] shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <RefreshCw size={15} />
            Timetable Batch Generation
          </button>
        </div>
      </div>

      {/* Main Stages Workflow */}
      {activeTab === "workflow" && (
        <div className="space-y-8">
          {/* ========================================================================= */}
          {/* STAGE 1: SELECT STUDENTS                                                  */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B192C] text-[#D4A72C]">
                    STAGE 1
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
                    <Users size={20} className="text-[#D4A72C]" />
                    Select Students From Database
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Choose Department, Year Label, and Semester to fetch uploaded candidate records
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {selectionStudents.length} Student{selectionStudents.length === 1 ? "" : "s"} Found
                </span>
              </div>
            </div>

            {/* Selection Inputs: All 5 Required Cohort Criteria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Department */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCohortDept}
                  onChange={(e) => {
                    setSelectedCohortDept(e.target.value);
                    setEditTemplateChoice(null);
                  }}
                  disabled={loadingCohorts || cohortDepartments.length === 0}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20"
                >
                  {cohortDepartments.length === 0 ? (
                    <option value="">{loadingCohorts ? "Loading..." : "No departments"}</option>
                  ) : (
                    cohortDepartments.map((d) => (
                      <option key={d.deptKey} value={d.deptKey}>
                        {d.name || d.code || d.deptKey.toUpperCase()} ({d.studentCount} student{d.studentCount === 1 ? "" : "s"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 2. Year Label */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Year Label <span className="text-rose-500">*</span>
                </label>
                <select
                  value={yearLabel}
                  onChange={(e) => {
                    setYearLabel(e.target.value);
                    setEditTemplateChoice(null);
                  }}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20"
                >
                  {FIXED_YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Semester */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Semester <span className="text-rose-500">*</span>
                </label>
                <select
                  value={semester}
                  onChange={(e) => {
                    setSemester(Number(e.target.value));
                    setEditTemplateChoice(null);
                  }}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20"
                >
                  {FIXED_SEMESTER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Academic Year */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setEditTemplateChoice(null);
                  }}
                  placeholder="YYYY-YYYY (e.g. 2025-2026)"
                  className={`w-full text-xs font-bold text-[#0B192C] rounded-2xl border px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20 ${
                    !isAyValid && academicYear ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-white"
                  }`}
                />
                {!isAyValid && academicYear && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                    Must be YYYY-YYYY
                  </span>
                )}
              </div>

              {/* 5. Batch */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Batch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={batch}
                  onChange={(e) => {
                    setBatch(e.target.value);
                    setEditTemplateChoice(null);
                  }}
                  placeholder="YYYY-YYYY (e.g. 2022-2026)"
                  className={`w-full text-xs font-bold text-[#0B192C] rounded-2xl border px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20 ${
                    !isBatchValid && batch ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-white"
                  }`}
                />
                {!isBatchValid && batch && (
                  <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                    Must be YYYY-YYYY (end &gt; start)
                  </span>
                )}
              </div>
            </div>

            {cohortError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{cohortError}</span>
              </div>
            )}

            {/* Selection Panel Status Metrics */}
            {selectionStudents.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Candidates</span>
                  <span className="text-base font-black text-[#0B192C]">{selectionStudents.length}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Generated</span>
                  <span className="text-base font-black text-slate-700">{generatedTicketsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Published</span>
                  <span className="text-base font-black text-emerald-800">{publishedTicketsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Withdrawn</span>
                  <span className="text-base font-black text-purple-800">{withdrawnTicketsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Blocked (Fees)</span>
                  <span className="text-base font-black text-rose-800">{blockedTicketsCount}</span>
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Uploaded Candidate Details
                </span>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search candidate by reg no or name..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="text-xs rounded-xl border border-slate-300 pl-8 pr-3 py-1.5 w-60"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5">Register Number</th>
                      <th className="px-3 py-2.5">Candidate Name</th>
                      <th className="px-3 py-2.5">Date of Birth</th>
                      <th className="px-3 py-2.5">Degree &amp; Branch</th>
                      <th className="px-3 py-2.5 text-center">Semester</th>
                      <th className="px-3 py-2.5 text-center">Section</th>
                      <th className="px-3 py-2.5">Papers (Current &amp; Arrears)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingStudents ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                          Loading student details...
                        </td>
                      </tr>
                    ) : studentError ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center font-bold text-rose-700 bg-rose-50/70 border border-rose-200">
                          {studentError}
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center font-bold text-amber-800 bg-amber-50/50">
                          No students in this selection.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s, idx) => (
                        <tr key={s.registerNumber} className="hover:bg-slate-50/70 transition">
                          <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-[#0B192C]">{s.registerNumber}</td>
                          <td className="px-3 py-2 font-bold text-slate-800 uppercase">{s.name}</td>
                          <td className="px-3 py-2 text-slate-600 font-mono">{s.dateOfBirth || "-"}</td>
                          <td className="px-3 py-2 text-slate-700 font-medium">{s.degreeBranch || "-"}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold">{s.semester}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold">{s.section || "-"}</td>
                          <td className="px-3 py-2 max-w-xs">
                            {s.papers && s.papers.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {s.papers.map((p, pIdx) => (
                                  <span
                                    key={`${p.subjectCode}-${pIdx}`}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                      p.paperType === "ARREAR"
                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    }`}
                                    title={`${p.subjectCode}: ${p.subjectTitle} (${p.paperType})`}
                                  >
                                    <span>{p.subjectCode}</span>
                                    <span className="text-[9px] opacity-75">[{p.paperType === "ARREAR" ? "ARR" : "CUR"}]</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No papers registered</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: CHOOSE TEMPLATE */}
            {selectionStudents.length > 0 && (
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-2">
                      <Sliders size={16} className="text-[#D4A72C]" />
                      Choose Template (Academic Year: {academicYear || "—"}, Batch: {batch || "—"})
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Select whether to copy the official reference template, create your own custom template, or reuse a previously fixed version across the college.
                    </p>
                  </div>
                  {template?.id && (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Active: {template.templateName || "Reference"} ({template.status} v{template.version})
                    </span>
                  )}
                </div>

                {/* Available Templates for this Selection */}
                {templatesList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-extrabold text-[#0B192C] flex items-center gap-1 mr-1">
                      <Layers size={14} className="text-indigo-600" />
                      Cohort Templates:
                    </span>
                    {templatesList.map((t) => {
                      const isActive = template?.id === t.id || (!template?.id && !t.id && (template?.templateName || "Reference") === (t.templateName || "Reference"));
                      return (
                        <button
                          key={t.id || t.templateName}
                          type="button"
                          onClick={() => {
                            setTemplate(t);
                            setEditTemplateChoice("yes");
                            loadPreview();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                            isActive
                              ? "bg-[#0B192C] text-[#D4A72C] shadow-sm ring-2 ring-[#D4A72C]"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span>{t.templateName || "Reference"}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            t.status === "FIXED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {t.status} v{t.version}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Option 1: Use Reference Template */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 font-black text-xs text-[#0B192C]">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>Use Reference Template</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Copies the official reference layout and content into this cohort's draft. The original reference template is never altered.
                      </p>
                    </div>
                    <button
                      onClick={handleUseReferenceTemplate}
                      disabled={loadingTemplate || isFixed}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <Sliders size={14} />
                      <span>{loadingTemplate ? "Loading..." : "Copy Reference"}</span>
                    </button>
                  </div>

                  {/* Option 2: Create My Own Template */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 font-black text-xs text-[#0B192C]">
                        <Plus size={16} className="text-indigo-600" />
                        <span>Create My Own Template</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Creates a blank DRAFT template with custom name. Opens immediately with full upload areas.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        disabled={isFixed}
                        placeholder="Template Name (e.g. Autonomous Nov 2026)..."
                        value={customTemplateName}
                        onChange={(e) => {
                          setCustomTemplateName(e.target.value);
                          if (customTemplateError) setCustomTemplateError(null);
                        }}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 font-bold bg-slate-50/50 focus:bg-white"
                      />
                      <button
                        onClick={handleCreateCustomTemplate}
                        disabled={loadingTemplate || isFixed || !customTemplateName.trim()}
                        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        <Plus size={14} />
                        <span>Create Blank Template</span>
                      </button>
                      {customTemplateError && (
                        <span className="text-[11px] text-rose-600 font-bold block">
                          {customTemplateError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Option 3: Use Previous Template */}
                  <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 font-black text-xs text-[#0B192C]">
                        <History size={16} className="text-amber-600" />
                        <span>Use Previous Template</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Reuse a previously fixed template from another department or academic year. Copies into this selection's draft.
                      </p>
                    </div>
                    <button
                      onClick={loadSavedVersions}
                      disabled={loadingTemplate || isFixed || loadingVersions}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-black transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      <History size={14} />
                      <span>{loadingVersions ? "Loading History..." : "Browse Saved Versions"}</span>
                    </button>
                  </div>
                </div>

                {/* Edit choice toggle if template is ready */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">
                    Template mode: {editTemplateChoice === "yes" ? "Editing Template (Stage 2 Open)" : "Direct to Fix (Stage 2 Collapsed)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditTemplateChoice("yes")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                        editTemplateChoice === "yes"
                          ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Sliders size={13} />
                      <span>Edit Template</span>
                    </button>
                    <button
                      onClick={() => setEditTemplateChoice("no")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                        editTemplateChoice === "no"
                          ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <ChevronRight size={13} />
                      <span>Go to Fix</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* STAGE 2: EDIT TEMPLATE (Only if editTemplateChoice === "yes")              */}
          {/* ========================================================================= */}
          {selectionStudents.length > 0 && editTemplateChoice === "yes" && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B192C] text-[#D4A72C]">
                      STAGE 2
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
                      <Sliders size={20} className="text-[#D4A72C]" />
                      Edit Hall Ticket Reference Template
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Configure typed Academic Year &amp; Batch, venue centre, rules, signature captions, and live portrait preview
                  </p>
                </div>

                {/* Status line & Fixed note */}
                <div className="flex flex-wrap items-center gap-3">
                  {isFixed ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      {publishedTicketsCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span>
                            {publishedTicketsCount} tickets are already published. Unfixing does not change them. Generating and publishing again will supersede them.
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                        <span className="text-xs font-bold text-slate-700">
                          Template is fixed. Unfix it to edit.
                        </span>
                        <button
                          onClick={handleUnfixTemplate}
                          disabled={unfixingTemplate}
                          className="px-3 py-1 rounded-lg bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50"
                          title="Return template to editable draft state"
                        >
                          <Unlock size={13} />
                          <span>{unfixingTemplate ? "Unfixing..." : "Unfix"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {saveErrorMsg ? (
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-rose-600 shrink-0" />
                          <span>Save failed: {saveErrorMsg}</span>
                        </span>
                      ) : hasUnsavedChanges ? (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span>Unsaved changes</span>
                        </span>
                      ) : lastSavedTime ? (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>All changes saved at {lastSavedTime}</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Year and Batch Typed Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                    Academic Year <span className="text-rose-500">* (YYYY-YYYY, required)</span>
                  </label>
                  <input
                    type="text"
                    disabled={isFixed}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="YYYY-YYYY (e.g. 2026-2027)"
                    className={`w-full text-xs font-bold text-[#0B192C] rounded-2xl border px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20 ${
                      !isAyValid && academicYear ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-white"
                    } disabled:bg-slate-100`}
                  />
                  {!isAyValid && academicYear && (
                    <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                      Format must be YYYY-YYYY (e.g. 2026-2027)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                    Batch <span className="text-rose-500">* (YYYY-YYYY, end &gt; start, required)</span>
                  </label>
                  <input
                    type="text"
                    disabled={isFixed}
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="YYYY-YYYY (e.g. 2024-2028)"
                    className={`w-full text-xs font-bold text-[#0B192C] rounded-2xl border px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20 ${
                      !isBatchValid && batch ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-white"
                    } disabled:bg-slate-100`}
                  />
                  {!isBatchValid && batch && (
                    <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                      Format must be YYYY-YYYY with end year greater than start year (e.g. 2024-2028)
                    </span>
                  )}
                </div>
              </div>

              {/* Editor & Live Portrait Preview Layout (Editor stacked above or wide column, Preview guaranteed >= 640px) */}
              <div className="space-y-6 pt-2 border-t border-slate-100">
                {/* Form Fields Section */}
                <div className="space-y-4 border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">
                      Template Content &amp; Formatting Options
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500">
                      Live preview updates below
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                      Examination Title
                    </label>
                    <input
                      type="text"
                      disabled={isFixed}
                      value={template.examTitle || ""}
                      onChange={(e) => setTemplate({ ...template, examTitle: e.target.value })}
                      placeholder={`END SEMESTER EXAMINATIONS - ${academicYear || "2026-2027"}`}
                      className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                      Examination Centre <span className="text-rose-500">* (Required to Fix)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={isFixed}
                        value={template.examinationCentre || ""}
                        onChange={(e) => setTemplate({ ...template, examinationCentre: e.target.value })}
                        placeholder="Enter examination centre venue (e.g. Main Examination Block Hall A)..."
                        className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs disabled:bg-slate-100"
                      />
                      <Building size={16} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Photo Placement & Size Controls */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="showPhotoCheck"
                        disabled={isFixed}
                        checked={template.showPhoto}
                        onChange={(e) => setTemplate({ ...template, showPhoto: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-[#0B192C] focus:ring-[#0B192C]"
                      />
                      <label htmlFor="showPhotoCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Include Candidate Photograph Box
                      </label>
                    </div>

                    {template.showPhoto && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Photo Placement
                          </label>
                          <select
                            disabled={isFixed}
                            value={template.photoPosition || "right"}
                            onChange={(e) => setTemplate({ ...template, photoPosition: e.target.value })}
                            className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold"
                          >
                            <option value="right">Right</option>
                            <option value="left">Left</option>
                            <option value="top centre">Top Centre</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Photo Size
                          </label>
                          <select
                            disabled={isFixed}
                            value={template.photoSize || "medium"}
                            onChange={(e) => setTemplate({ ...template, photoSize: e.target.value })}
                            className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold"
                          >
                            <option value="small">Small (70x85 px)</option>
                            <option value="medium">Medium (90x110 px)</option>
                            <option value="large">Large (110x135 px)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Signature Block Captions */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Signature Block Captions
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Left Signature Caption (Candidate)
                        </label>
                        <input
                          type="text"
                          disabled={isFixed}
                          value={template.sigCandidate || ""}
                          onChange={(e) => setTemplate({ ...template, sigCandidate: e.target.value })}
                          className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold shadow-xs disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Centre Signature Caption (Controller of Examinations)
                        </label>
                        <input
                          type="text"
                          disabled={isFixed}
                          value={template.sigCoe || ""}
                          onChange={(e) => setTemplate({ ...template, sigCoe: e.target.value })}
                          className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold shadow-xs disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Right Signature Caption (Principal)
                        </label>
                        <input
                          type="text"
                          disabled={isFixed}
                          value={template.sigPrincipal || ""}
                          onChange={(e) => setTemplate({ ...template, sigPrincipal: e.target.value })}
                          className="w-full text-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-semibold shadow-xs disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes Editor (<= 10 lines of 300 chars) */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0B192C]">
                        Candidate Instructions / Notes ({template.notes.length}/10)
                      </h4>
                      {!isFixed && template.notes.length < 10 && (
                        <button
                          onClick={handleAddNote}
                          className="px-2.5 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#0B192C] text-xs font-bold transition flex items-center gap-1"
                        >
                          <Plus size={13} />
                          <span>Add Note</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {template.notes.map((note, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2">
                          <span className="font-mono font-bold text-slate-400 text-xs w-5 text-center">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            maxLength={300}
                            disabled={isFixed}
                            value={note}
                            onChange={(e) => handleNoteChange(idx, e.target.value)}
                            className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium"
                          />
                          {!isFixed && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleMoveNote(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                onClick={() => handleMoveNote(idx, "down")}
                                disabled={idx === template.notes.length - 1}
                                className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                onClick={() => handleRemoveNote(idx)}
                                disabled={template.notes.length <= 1}
                                className="p-1 rounded text-rose-500 hover:text-rose-700 disabled:opacity-30"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Template Assets & Upload Area (Background Image & Logo) - Visible for every DRAFT template */}
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-2">
                          <UploadCloud size={16} className="text-indigo-600" />
                          Template Upload Area &amp; Assets (Background &amp; Logo)
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Uploaded images are stored directly in this draft and rendered on the hall tickets.
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isFixed
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {isFixed ? "Locked (FIXED)" : "Uploads Active (DRAFT)"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Background Image Upload Area */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black uppercase tracking-wider text-[#0B192C]">
                            Background Image / Watermark
                          </label>
                          {template.backgroundImage && !isFixed && (
                            <button
                              type="button"
                              onClick={() => setTemplate({ ...template, backgroundImage: null, backgroundMime: null })}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline"
                            >
                              Remove Background
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Optional watermark or emblem (PNG or JPG &le; 2 MB). Rendered centered behind text.
                        </p>
                        {!isFixed && (
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={async (e) => {
                              if (!e.target.files || e.target.files.length === 0) return;
                              const file = e.target.files[0];
                              const val = await validateImage(file, 2 * 1024 * 1024);
                              if (!val.valid) {
                                setTemplateFeedback({ text: val.error || "Invalid background image file", type: "error" });
                                return;
                              }
                              setTemplate({
                                ...template,
                                backgroundImage: val.base64,
                                backgroundMime: file.type,
                              });
                              setTemplateFeedback({ text: `Background image "${file.name}" uploaded to draft template.`, type: "success" });
                            }}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B192C] file:text-[#D4A72C] hover:file:bg-slate-800"
                          />
                        )}
                        {template.backgroundImage ? (
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={template.backgroundImage}
                              alt="Background Preview"
                              className="h-16 w-16 object-cover rounded-xl border border-slate-300 shadow-2xs"
                            />
                            <div>
                              <span className="text-xs text-emerald-700 font-bold block">
                                ✓ Background image loaded in draft
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Shows in live portrait preview on the right
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic bg-white p-3 rounded-xl border border-dashed border-slate-200">
                            No background watermark uploaded
                          </div>
                        )}
                      </div>

                      {/* Header Logo Upload Area */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black uppercase tracking-wider text-[#0B192C]">
                            Institution Logo Choice &amp; Upload
                          </label>
                          {template.logoImage && !isFixed && (
                            <button
                              type="button"
                              onClick={() => setTemplate({ ...template, logoImage: null, logoMime: null, logoSource: "both" })}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline"
                            >
                              Reset to Default
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: "both", label: "Both Logos" },
                            { id: "kvell-logo.png", label: "Kvell Logo" },
                            { id: "engineering-logo.png", label: "College Logo" },
                            { id: "uploaded", label: "Custom Upload" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isFixed}
                              onClick={() => setTemplate({ ...template, logoSource: opt.id })}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center ${
                                (template.logoSource || "both") === opt.id
                                  ? "bg-[#0B192C] text-[#D4A72C] border-[#0B192C] shadow-2xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                              } disabled:opacity-50`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {!isFixed && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Upload Custom Logo (PNG/JPG &le; 1 MB, magic bytes checked)
                            </label>
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              onChange={handleLogoUpload}
                              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B192C] file:text-[#D4A72C] hover:file:bg-slate-800"
                            />
                          </div>
                        )}
                        {template.logoImage ? (
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={template.logoImage}
                              alt="Custom Logo Preview"
                              className="h-12 w-12 object-contain rounded-xl border border-slate-300 bg-white p-1 shadow-2xs"
                            />
                            <div>
                              <span className="text-xs text-emerald-700 font-bold block">
                                ✓ Custom logo stored in draft
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Rendered in hall ticket header
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic bg-white p-3 rounded-xl border border-dashed border-slate-200">
                            Using built-in vector logos ({template.logoSource || "both"})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 6-Block Layout Position & Size Adjuster */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0B192C]">
                          Block Layout &amp; Positioning (6 Core Blocks)
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Nudge blocks (1mm per click, Shift+Click = 5mm), adjust width %, font size, or type exact (X, Y) mm
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(["header", "candidate", "photo", "papers", "notes", "signatures"] as (keyof HallTicketLayoutMap)[]).map((blk) => (
                          <button
                            key={blk}
                            type="button"
                            onClick={() => setActiveBlock(blk)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition ${
                              activeBlock === blk
                                ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {blk}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Block Controls Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      {/* Direction Arrows */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Nudge ({activeBlock})</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={(e) => moveBlock(activeBlock, 0, -1, e.shiftKey)}
                            className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold disabled:opacity-40"
                            title="Move Up 1mm (Shift+Click: 5mm)"
                          >
                            <ArrowUp size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={(e) => moveBlock(activeBlock, -1, 0, e.shiftKey)}
                            className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold disabled:opacity-40"
                            title="Move Left 1mm (Shift+Click: 5mm)"
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={(e) => moveBlock(activeBlock, 1, 0, e.shiftKey)}
                            className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold disabled:opacity-40"
                            title="Move Right 1mm (Shift+Click: 5mm)"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={(e) => moveBlock(activeBlock, 0, 1, e.shiftKey)}
                            className="p-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold disabled:opacity-40"
                            title="Move Down 1mm (Shift+Click: 5mm)"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Coordinates (X, Y in mm) */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Coordinates (mm)</span>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600">X:</label>
                          <input
                            type="number"
                            disabled={isFixed}
                            value={currentLayout[activeBlock].x}
                            onChange={(e) => setBlockCoord(activeBlock, "x", parseFloat(e.target.value))}
                            className="w-20 text-xs rounded-lg border border-slate-300 px-2 py-1 font-mono font-bold bg-white"
                          />
                          <span className="text-[11px] text-slate-400">mm</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600">Y:</label>
                          <input
                            type="number"
                            disabled={isFixed}
                            value={currentLayout[activeBlock].y}
                            onChange={(e) => setBlockCoord(activeBlock, "y", parseFloat(e.target.value))}
                            className="w-20 text-xs rounded-lg border border-slate-300 px-2 py-1 font-mono font-bold bg-white"
                          />
                          <span className="text-[11px] text-slate-400">mm</span>
                        </div>
                      </div>

                      {/* Block Width (%) */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Block Width (%)</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={() => adjustWidth(activeBlock, -5)}
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="font-mono font-bold text-xs text-[#0B192C] w-12 text-center">
                            {currentLayout[activeBlock].width || 100}%
                          </span>
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={() => adjustWidth(activeBlock, 5)}
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Font Size (pt) */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Font Size (pt)</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={() => adjustFontSize(activeBlock, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="font-mono font-bold text-xs text-[#0B192C] w-12 text-center">
                            {currentLayout[activeBlock].fontSize || 10}pt
                          </span>
                          <button
                            type="button"
                            disabled={isFixed}
                            onClick={() => adjustFontSize(activeBlock, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Portrait Preview Section (Wide full-width block below editor) */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Eye size={15} className="text-[#D4A72C]" />
                      Live Portrait Preview (First Candidate of Selection)
                    </span>
                    {preview?.registerNumber && (
                      <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                        {preview.registerNumber} - {preview.name}
                      </span>
                    )}
                  </div>
                  <HallTicketPortraitPreview
                    preview={preview}
                    template={template}
                    loading={loadingPreview}
                  />
                </div>
              </div>

              {/* Bottom of Template Card: Single Save Draft Button & Status Line */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {saveErrorMsg ? (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-rose-600 shrink-0" />
                      <span>Save failed: {saveErrorMsg}</span>
                    </span>
                  ) : hasUnsavedChanges ? (
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-amber-600 shrink-0" />
                      <span>Unsaved changes</span>
                    </span>
                  ) : lastSavedTime ? (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span>All changes saved at {lastSavedTime}</span>
                    </span>
                  ) : null}
                </div>

                <div>
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingTemplate || isFixed || !isAyValid || !isBatchValid}
                    className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Save size={15} />
                    <span>{savingTemplate ? "Saving..." : "Save Draft"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: FIX TEMPLATE                                                     */}
          {/* ========================================================================= */}
          {selectionStudents.length > 0 && editTemplateChoice !== null && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B192C] text-[#D4A72C]">
                      STAGE 3
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
                      <Lock size={20} className="text-[#D4A72C]" />
                      Fix Template (Lock for Generation)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Locking the template creates a fixed version for ({academicYear || "YYYY-YYYY"}, {batch || "YYYY-YYYY"}) required for generation
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {isFixed ? (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Lock size={14} className="text-emerald-700" />
                      FIXED (v{template.version}) - Locked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                      <Unlock size={14} className="text-amber-700" />
                      DRAFT (v{template.version}) - Unfixed
                    </span>
                  )}
                </div>
              </div>

              {/* Requirement Check & Fix Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={isAyValid && isBatchValid ? "text-emerald-600" : "text-slate-400"} />
                    <span>Academic Year &amp; Batch entered in valid YYYY-YYYY format</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={lastSavedTemplate?.examinationCentre?.trim() ? "text-emerald-600" : "text-slate-400"} />
                    <span>Examination Centre venue saved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className={(lastSavedTemplate?.notes?.length ?? 0) >= 1 ? "text-emerald-600" : "text-slate-400"} />
                    <span>At least 1 candidate instruction rule saved</span>
                  </div>
                  {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 text-amber-700 font-bold pt-1">
                      <AlertCircle size={14} className="text-amber-600" />
                      <span>Save the draft before fixing.</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {!isFixed ? (
                    <button
                      onClick={handleFixTemplate}
                      disabled={
                        fixingTemplate ||
                        hasUnsavedChanges ||
                        !isAyValid ||
                        !isBatchValid ||
                        !lastSavedTemplate?.examinationCentre?.trim() ||
                        !(lastSavedTemplate?.notes?.length >= 1)
                      }
                      className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                      title={
                        hasUnsavedChanges
                          ? "Save the draft before fixing."
                          : !lastSavedTemplate?.examinationCentre?.trim() || !(lastSavedTemplate?.notes?.length >= 1)
                          ? "Examination centre and at least 1 note must be saved before fixing."
                          : "Fix and lock template"
                      }
                    >
                      <Lock size={15} />
                      <span>{fixingTemplate ? "Fixing..." : "Fix Template"}</span>
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      {publishedTicketsCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span>
                            {publishedTicketsCount} tickets are already published. Unfixing does not change them. Generating and publishing again will supersede them.
                          </span>
                        </div>
                      )}
                      <button
                        onClick={handleUnfixTemplate}
                        disabled={unfixingTemplate}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                        title="Return template to editable draft state"
                      >
                        <Unlock size={15} />
                        <span>{unfixingTemplate ? "Unfixing..." : "Unfix Template"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {templateFeedback && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                    templateFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {templateFeedback.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span>{templateFeedback.text}</span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 4: GENERATE HALL TICKETS                                            */}
          {/* ========================================================================= */}
          {selectionStudents.length > 0 && editTemplateChoice !== null && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B192C] text-[#D4A72C]">
                      STAGE 4
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
                      <Wand2 size={20} className="text-[#D4A72C]" />
                      Generate Hall Tickets
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Snapshots current and arrear papers for each candidate in selection with number HT-YYYY-YYYY-SEM-REGNO
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !readiness?.canGenerate || !previewChecked}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                    title={
                      !readiness?.canGenerate && readiness?.missing
                        ? readiness.missing.join("; ")
                        : !previewChecked
                        ? "Check the preview confirmation box to enable generation"
                        : "Generate tickets"
                    }
                  >
                    <Wand2 size={15} />
                    <span>{generating ? "Generating..." : "Generate Hall Tickets"}</span>
                  </button>
                </div>
              </div>

              {/* Checkbox: I have checked the preview (Section 7) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="previewCheckedBox"
                  checked={previewChecked}
                  onChange={(e) => setPreviewChecked(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B192C] focus:ring-[#0B192C] cursor-pointer"
                />
                <label htmlFor="previewCheckedBox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                  I have checked the preview
                </label>
                {!previewChecked && (
                  <span className="text-[11px] text-amber-700 font-semibold ml-auto">
                    (Required to enable generation)
                  </span>
                )}
              </div>

              {/* Readiness reasons if generate is disabled */}
              {!readiness?.canGenerate && readiness?.missing && readiness.missing.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-amber-700" />
                    Generation Pre-conditions Not Met:
                  </span>
                  <div className="text-xs text-amber-800 space-y-1 pl-5 list-disc">
                    {readiness.missing.map((msg, i) => (
                      <div key={i}>&bull; {msg}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation Summary Box */}
              {generationSummary && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-black text-xs">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    <span>{generationSummary.message}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-emerald-200">
                    <div>
                      <span className="text-slate-600 block">Created:</span>
                      <span className="font-mono font-bold text-emerald-800">{generationSummary.created}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Rebuilt:</span>
                      <span className="font-mono font-bold text-amber-800">{generationSummary.rebuilt ?? generationSummary.updated}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Papers Written:</span>
                      <span className="font-mono font-bold text-indigo-800">{generationSummary.papersWritten ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Skipped (Published):</span>
                      <span className="font-mono font-bold text-slate-700">{generationSummary.skipped}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 5: REVIEW GENERATED TICKETS                                         */}
          {/* ========================================================================= */}
          {selectionStudents.length > 0 && editTemplateChoice !== null && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#0B192C] text-[#D4A72C]">
                      STAGE 5
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
                      <ClipboardCheck size={20} className="text-[#D4A72C]" />
                      Review Generated Hall Tickets
                    </h2>
                  </div>
                  <p className="text-xs text-slate-800 font-bold mt-1">
                    Reviewing: {currentDeptObj?.name || selectedCohortDept}, {yearLabel || "1st Year"}, Semester {semester}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Inspect student tickets, paper counts, and blocking issues before CoE confirmation
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {reviewSummary?.reviewed ? (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-700" />
                      Reviewed by {reviewSummary.reviewedBy} (v{reviewSummary.templateVersion})
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                      <ShieldAlert size={13} className="text-amber-700" />
                      Review Required for Template v{reviewSummary?.templateVersion || template.version}
                    </span>
                  )}
                </div>
              </div>

              {/* Review Panel Counts Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Generated (Draft)</span>
                  <span className="text-lg font-black text-slate-800">{generatedTicketsCount}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Published</span>
                  <span className="text-lg font-black text-emerald-900">{publishedTicketsCount}</span>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Withdrawn</span>
                  <span className="text-lg font-black text-purple-900">{withdrawnTicketsCount}</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Blocked (Fees)</span>
                  <span className="text-lg font-black text-rose-900">{blockedTicketsCount}</span>
                </div>
              </div>

              {/* Review Tickets Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">#</th>
                      <th className="px-3 py-2.5">Register No</th>
                      <th className="px-3 py-2.5">Student Name</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-center">Version</th>
                      <th className="px-3 py-2.5">Exam Centre</th>
                      <th className="px-3 py-2.5 text-center">Papers</th>
                      <th className="px-3 py-2.5">Verification Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loadingReview ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                          Checking tickets...
                        </td>
                      </tr>
                    ) : !reviewSummary || reviewSummary.tickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                          No generated hall tickets found. Complete Stage 4 (Generate) first.
                        </td>
                      </tr>
                    ) : (
                      reviewSummary.tickets.map((t, idx) => (
                        <tr key={t.regNo} className="hover:bg-slate-50/70 transition">
                          <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-[#0B192C]">{t.regNo}</td>
                          <td className="px-3 py-2 font-bold text-slate-800 uppercase">{t.studentName}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                t.status === "PUBLISHED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : t.status === "WITHDRAWN"
                                  ? "bg-purple-100 text-purple-800"
                                  : t.status === "NOT_GENERATED"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {t.templateVersion != null ? `v${t.templateVersion}` : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-medium truncate max-w-xs">
                            {t.examCentre || template.examinationCentre || "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold">{t.paperCount}</td>
                          <td className="px-3 py-2">
                            {t.blockingIssues && t.blockingIssues.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {t.blockingIssues.map((issue, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                  >
                                    {issue}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                                <Check size={13} /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Review Confirmation Form */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <input
                    type="text"
                    maxLength={150}
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Enter CoE / Reviewer Name (required to confirm)..."
                    className="flex-1 text-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-medium"
                  />
                  <button
                    onClick={handleConfirmReview}
                    disabled={confirmingReview || !reviewerName.trim() || !reviewSummary?.tickets?.length}
                    className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckSquare size={14} />
                    <span>{confirmingReview ? "Confirming..." : "Confirm Review"}</span>
                  </button>
                </div>

                <div className="text-[11px] font-bold text-slate-500">
                  {reviewSummary?.blockingCount ? (
                    <span className="text-rose-600">
                      {reviewSummary.blockingCount} unresolved blocking issue(s)
                    </span>
                  ) : (
                    <span className="text-emerald-600">0 blocking issues detected</span>
                  )}
                </div>
              </div>

              {reviewFeedback && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
                    reviewFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {reviewFeedback.type === "success" ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span>{reviewFeedback.text}</span>
                </div>
              )}

              {/* Publish to Students Action Section inside Review Area */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-[#0B192C] flex items-center gap-2">
                      <Check size={18} className="text-[#D4A72C]" />
                      Publish to Students
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Publishes verified hall tickets for {currentDeptObj?.name || selectedCohortDept}, Semester {semester}.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handlePublishAll}
                      disabled={publishing || !reviewSummary?.reviewed || (reviewSummary?.blockingCount ?? 0) > 0}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                      title={
                        !reviewSummary?.reviewed
                          ? "Locked: Review not confirmed."
                          : (reviewSummary?.blockingCount ?? 0) > 0
                          ? `Locked: ${reviewSummary.blockingCount} blocking issues in this selection.`
                          : "Publish reviewed hall tickets to students"
                      }
                    >
                      <Check size={16} />
                      <span>{publishing ? "Publishing..." : "Publish to Students"}</span>
                    </button>

                    {/* Lock Reason Display Beside Button */}
                    {(!reviewSummary?.reviewed || (reviewSummary?.blockingCount ?? 0) > 0) && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                        {!reviewSummary?.reviewed
                          ? "Locked: Review not confirmed."
                          : `Locked: ${reviewSummary?.blockingCount} blocking issues in this selection.`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Under the button: "View issues" list showing each blocking ticket */}
                {reviewSummary?.tickets && reviewSummary.tickets.some((t) => t.blockingIssues && t.blockingIssues.length > 0) && (
                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert size={14} className="text-rose-600" />
                        View Issues ({reviewSummary.blockingCount} issue{reviewSummary.blockingCount === 1 ? "" : "s"} across {reviewSummary.tickets.filter((t) => t.blockingIssues && t.blockingIssues.length > 0).length} student{reviewSummary.tickets.filter((t) => t.blockingIssues && t.blockingIssues.length > 0).length === 1 ? "" : "s"})
                      </span>
                    </div>
                    <div className="divide-y divide-rose-100 max-h-56 overflow-y-auto pr-1">
                      {reviewSummary.tickets
                        .filter((t) => t.blockingIssues && t.blockingIssues.length > 0)
                        .map((t) => (
                          <div key={t.regNo} className="py-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 text-xs">
                            <div className="font-mono font-bold text-slate-900 shrink-0">
                              {t.regNo} <span className="font-sans font-bold text-slate-700 uppercase ml-1.5">{t.studentName}</span>
                            </div>
                            <div className="text-rose-700 font-semibold sm:text-right">
                              {t.blockingIssues.join(", ")}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Publish Results Summary */}
                {publishSummary && (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 font-black text-xs text-[#0B192C]">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>{publishSummary.message}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase block">Published</span>
                        <span className="text-lg font-black text-emerald-900">{publishSummary.publishedCount}</span>
                      </div>

                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <span className="text-[11px] font-bold text-rose-800 uppercase block">Blocked (Fee Dues)</span>
                        <span className="text-lg font-black text-rose-900">{publishSummary.blockedCount}</span>
                      </div>

                      <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl">
                        <span className="text-[11px] font-bold text-slate-700 uppercase block">Superseded</span>
                        <span className="text-lg font-black text-slate-800">{publishSummary.supersededCount}</span>
                      </div>
                    </div>

                    {publishSummary.blockedRegNos && publishSummary.blockedRegNos.length > 0 && (
                      <div className="pt-2">
                        <span className="text-xs font-bold text-rose-800 block mb-1">
                          Students Blocked for Pending Fee Dues:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {publishSummary.blockedRegNos.map((reg) => (
                            <span
                              key={reg}
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-100 text-rose-900 border border-rose-200"
                            >
                              {reg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Withdraw Single Ticket Modal */}
          {withdrawingTicketId !== null && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                  <AlertCircle size={20} />
                  <span>Withdraw Hall Ticket from Student</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Withdrawing will remove this ticket from the student's portal immediately. The ticket, papers, and queries remain in the system for auditing and can be restored later.
                </p>
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1">
                    Reason for Withdrawal <span className="text-rose-500">*</span> (1 to 300 characters)
                  </label>
                  <textarea
                    value={withdrawReasonInput}
                    onChange={(e) => setWithdrawReasonInput(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="e.g., Timetable schedule revised / Attendance discrepancy recheck required..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-3 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Required field</span>
                    <span>{withdrawReasonInput.trim().length} / 300</span>
                  </div>
                </div>
                {withdrawError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                    {withdrawError}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWithdrawingTicketId(null)}
                    disabled={isSubmittingWithdraw}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWithdrawSingleTicket(withdrawingTicketId)}
                    disabled={isSubmittingWithdraw || !withdrawReasonInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                  >
                    {isSubmittingWithdraw ? "Withdrawing..." : "Confirm Withdrawal"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Withdraw All Published Tickets Modal */}
          {withdrawAllModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                  <AlertCircle size={20} />
                  <span>Withdraw All Published Tickets ({publishedTicketsCount})</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will withdraw all <strong>{publishedTicketsCount}</strong> published tickets for {currentDeptObj?.name || selectedCohortDept}, Semester {semester}. They will be immediately removed from students' view.
                </p>
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1">
                    Reason for Batch Withdrawal <span className="text-rose-500">*</span> (1 to 300 characters)
                  </label>
                  <textarea
                    value={withdrawAllReasonInput}
                    onChange={(e) => setWithdrawAllReasonInput(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="e.g., Examination timetable rescheduling across department..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-3 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Required field</span>
                    <span>{withdrawAllReasonInput.trim().length} / 300</span>
                  </div>
                </div>
                {withdrawAllError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                    {withdrawAllError}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWithdrawAllModalOpen(false)}
                    disabled={isSubmittingWithdrawAll}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdrawAllPublished}
                    disabled={isSubmittingWithdrawAll || !withdrawAllReasonInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                  >
                    {isSubmittingWithdrawAll ? "Withdrawing All..." : `Withdraw ${publishedTicketsCount} Tickets`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hall Tickets Master Table */}
          {tickets.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">
                  Generated Hall Tickets Archive ({tickets.length})
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  {publishedTicketsCount > 0 && (
                    <button
                      onClick={() => {
                        setWithdrawAllModalOpen(true);
                        setWithdrawAllReasonInput("");
                        setWithdrawAllError(null);
                      }}
                      className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition flex items-center gap-1.5 shadow-xs"
                      title="Withdraw all published tickets for this selection"
                    >
                      <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                      <span>Withdraw all published tickets ({publishedTicketsCount})</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {["ALL", "GENERATED", "PUBLISHED", "WITHDRAWN", "SUPERSEDED", "BLOCKED_FEES"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                          statusFilter === st ? "bg-white text-[#0B192C] shadow-xs" : "text-slate-500"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Register Number</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Hall Ticket No</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Fee Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tickets
                      .filter((t) => statusFilter === "ALL" || t.status === statusFilter)
                      .map((t, idx) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-mono font-bold text-[#0B192C]">{t.studentReg}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800 uppercase">{t.studentName}</td>
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{t.hallTicketNo}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                t.status === "PUBLISHED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : t.status === "WITHDRAWN"
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : t.status === "SUPERSEDED"
                                  ? "bg-slate-200 text-slate-700 border border-slate-300"
                                  : t.status === "BLOCKED_FEES"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                t.feePaid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {t.feePaid ? "PAID" : "FEE DUES"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right space-x-2">
                            {t.status === "PUBLISHED" && (
                              <button
                                onClick={() => {
                                  setWithdrawingTicketId(t.id);
                                  setWithdrawReasonInput("");
                                  setWithdrawError(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black transition"
                                title="Withdraw hall ticket from student portal"
                              >
                                Withdraw from students
                              </button>
                            )}
                            {t.status === "WITHDRAWN" && (
                              <div className="inline-flex items-center gap-2">
                                {t.withdrawReason && (
                                  <span
                                    className="text-[10px] font-medium text-slate-500 italic max-w-[180px] truncate"
                                    title={`Withdrawn by ${t.withdrawnBy || "COE"}: "${t.withdrawReason}"`}
                                  >
                                    "{t.withdrawReason}"
                                  </span>
                                )}
                                <button
                                  onClick={() => handleRestoreTicket(t.id)}
                                  disabled={restoringTicketId === t.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black transition disabled:opacity-50"
                                  title="Restore hall ticket to published state"
                                >
                                  {restoringTicketId === t.id ? "Restoring..." : "Restore to students"}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Withdraw Single Ticket Modal */}
          {withdrawingTicketId !== null && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                  <AlertCircle size={20} />
                  <span>Withdraw Hall Ticket from Student</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Withdrawing will remove this ticket from the student's portal immediately. The ticket, papers, and queries remain in the system for auditing and can be restored later.
                </p>
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1">
                    Reason for Withdrawal <span className="text-rose-500">*</span> (1 to 300 characters)
                  </label>
                  <textarea
                    value={withdrawReasonInput}
                    onChange={(e) => setWithdrawReasonInput(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="e.g., Timetable schedule revised / Attendance discrepancy recheck required..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-3 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Required field</span>
                    <span>{withdrawReasonInput.trim().length} / 300</span>
                  </div>
                </div>
                {withdrawError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                    {withdrawError}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWithdrawingTicketId(null)}
                    disabled={isSubmittingWithdraw}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWithdrawSingleTicket(withdrawingTicketId)}
                    disabled={isSubmittingWithdraw || !withdrawReasonInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                  >
                    {isSubmittingWithdraw ? "Withdrawing..." : "Confirm Withdrawal"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Withdraw All Published Tickets Modal */}
          {withdrawAllModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                  <AlertCircle size={20} />
                  <span>Withdraw All Published Tickets ({publishedTicketsCount})</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will withdraw all <strong>{publishedTicketsCount}</strong> published tickets for {currentDeptObj?.name || selectedCohortDept}, Semester {semester}. They will be immediately removed from students' view.
                </p>
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1">
                    Reason for Batch Withdrawal <span className="text-rose-500">*</span> (1 to 300 characters)
                  </label>
                  <textarea
                    value={withdrawAllReasonInput}
                    onChange={(e) => setWithdrawAllReasonInput(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="e.g., Examination timetable rescheduling across department..."
                    className="w-full text-xs rounded-xl border border-slate-300 p-3 font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Required field</span>
                    <span>{withdrawAllReasonInput.trim().length} / 300</span>
                  </div>
                </div>
                {withdrawAllError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                    {withdrawAllError}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWithdrawAllModalOpen(false)}
                    disabled={isSubmittingWithdrawAll}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdrawAllPublished}
                    disabled={isSubmittingWithdrawAll || !withdrawAllReasonInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                  >
                    {isSubmittingWithdrawAll ? "Withdrawing All..." : `Withdraw ${publishedTicketsCount} Tickets`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Student Queries */}
      {activeTab === "queries" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
                <MessageSquare size={20} className="text-[#D4A72C]" />
                Student Hall Ticket Queries &amp; Grievances
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Review and resolve discrepancy reports raised by students regarding their hall tickets
              </p>
            </div>

            <button
              onClick={loadQueries}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Refresh Queries</span>
            </button>
          </div>

          {queries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium text-xs">
              No open student queries found.
            </div>
          ) : (
            <div className="space-y-4">
              {queries.map((q) => (
                <div key={q.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#0B192C]">{q.studentReg}</span>
                      <span className="text-xs font-bold text-slate-700 uppercase">({q.studentName})</span>
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        Ticket #{q.hallTicketId}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        General / Hall Ticket Discrepancy
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          q.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {q.createdAt ? new Date(q.createdAt).toLocaleString() : ""}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-slate-200">
                    {q.message}
                  </p>

                  {q.coeResponse && (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900">
                      <span className="font-bold">COE Response: </span>
                      {q.coeResponse}
                      <span className="text-[10px] text-emerald-600 block mt-1">
                        Responded by {q.respondedBy || "COE"} at{" "}
                        {q.respondedAt ? new Date(q.respondedAt).toLocaleString() : ""}
                      </span>
                    </div>
                  )}

                  {q.status === "OPEN" && (
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Type response to student..."
                        value={replyText[q.id] || ""}
                        onChange={(e) => setReplyText({ ...replyText, [q.id]: e.target.value })}
                        className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      />
                      <button
                        onClick={() => handleSendReply(q.id)}
                        disabled={replyingId === q.id || !replyText[q.id]?.trim()}
                        className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send size={13} />
                        <span>{replyingId === q.id ? "Sending..." : "Reply"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Legacy Timetable Batch Generation */}
      {activeTab === "legacy" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 no-print">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-xs"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d: any) => (
                    <option key={d.key || d.deptKey} value={d.key || d.deptKey}>
                      {d.name || d.deptName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-xs"
                >
                  <option value="">-- Select Year --</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-xs"
                >
                  <option value="">-- Select Semester --</option>
                  {FIXED_SEMESTER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <button
                onClick={loadLegacyBatch}
                disabled={!selectedDept || !selectedSemester || loadingLegacy}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingLegacy ? "animate-spin" : ""} />
                <span>Fetch Students</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  onClick={handleLegacyGenerate}
                  disabled={!selectedDept || !selectedSemester || generatingLegacy}
                  className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Wand2 size={14} />
                  <span>{generatingLegacy ? "Generating..." : "Generate Batch"}</span>
                </button>
              </div>
            </div>

            {legacySuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{legacySuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Use Previous Template Versions */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0B192C]">
                    Saved Template Versions
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Select a previously fixed version across the college to copy into the current selection's draft
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {loadingVersions ? (
              <div className="py-12 text-center text-xs font-bold text-slate-500">
                Loading saved versions...
              </div>
            ) : templateVersions.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No fixed template versions found in the system yet. Fix a template first to create version history.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {templateVersions.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-2xl transition flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#0B192C]">
                          {v.templateName || "Template"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          v{v.versionNumber}
                        </span>
                        {v.source && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            {v.source}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span><strong>AY:</strong> {v.academicYear}</span>
                        <span><strong>Batch:</strong> {v.batch}</span>
                        <span><strong>Dept:</strong> {v.deptKey ? v.deptKey.toUpperCase() : "All"}</span>
                        <span><strong>Sem:</strong> {v.semester ? `Semester ${v.semester}` : "All"}</span>
                        {v.fixedBy && <span><strong>Fixed by:</strong> {v.fixedBy}</span>}
                        {v.fixedAt && (
                          <span>
                            <strong>Date:</strong> {new Date(v.fixedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loadingTemplate}
                      onClick={() => handleApplyPreviousVersion(v.id)}
                      className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Check size={14} />
                      <span>Use This Version</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
