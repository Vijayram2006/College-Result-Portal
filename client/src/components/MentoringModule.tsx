import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Send,
  Building2,
  Mail,
  Phone,
  Compass,
  FileText,
  Filter,
  Check,
  X,
  Sparkles,
  Award,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  Eye,
  BookOpen,
  GraduationCap,
  Activity,
  Sliders,
  Trash2,
} from "lucide-react";
import {
  mentoringApi,
  type StudentMentorDashboard,
  type MenteeView,
  type MentoringSessionView,
  type MentoringConcernView,
  type HodMentoringOverview,
  type CollegeMentoringOverview,
  type AllocationDetailView,
  type EligibleStudentView,
  type FacultyOptionView,
  type PendingAllocationView,
  type PendingBatchView,
  type AutoAllocateResult,
  type EscalatedMentorRequestView,
  type MenteeAcademicProfile,
} from "../services/api";
import { DepartmentOptions } from "./DepartmentOptions";
import { deptCode } from "../hooks/useDepartments";

interface MentoringModuleProps {
  mode: "student" | "faculty" | "hod" | "dean" | "admin";
  onToast?: (msg: string, tone?: "success" | "warning" | "danger" | "neutral") => void;
  deptKey?: string;
  collegeKey?: string;
}

export function MentoringModule({
  mode,
  onToast,
  deptKey = "cse",
  collegeKey = "engineering",
}: MentoringModuleProps) {
  // Internal floating notification fallback when onToast is omitted by parent
  const [internalNotice, setInternalNotice] = useState<{ msg: string; tone: "success" | "warning" | "danger" | "neutral" } | null>(null);

  const notify = (msg: string, tone: "success" | "warning" | "danger" | "neutral" = "neutral") => {
    onToast?.(msg, tone);
    setInternalNotice({ msg, tone });
  };

  useEffect(() => {
    if (!internalNotice) return;
    const timer = setTimeout(() => setInternalNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [internalNotice]);

  // ── State for Student ─────────────────────────────────────────────────────────
  const [studentDash, setStudentDash] = useState<StudentMentorDashboard | null>(null);
  const [newConcernTitle, setNewConcernTitle] = useState("");
  const [newConcernCat, setNewConcernCat] = useState("ACADEMIC");
  const [newConcernDesc, setNewConcernDesc] = useState("");
  const [concernSubmitting, setConcernSubmitting] = useState(false);

  // Student Mentor Change / Escalation Request (Requirement 1.4)
  const [showMentorChangeModal, setShowMentorChangeModal] = useState(false);
  const [changeReason, setChangeReason] = useState("Guidance Domain Mismatch");
  const [mentorQueries, setMentorQueries] = useState("");
  const [preferredMentorNotes, setPreferredMentorNotes] = useState("");
  const [mentorChangeSubmitting, setMentorChangeSubmitting] = useState(false);

  // ── State for Faculty ─────────────────────────────────────────────────────────
  const [mentees, setMentees] = useState<MenteeView[]>([]);
  const [sessions, setSessions] = useState<MentoringSessionView[]>([]);
  const [concerns, setConcerns] = useState<MentoringConcernView[]>([]);
  const [selectedMentee, setSelectedMentee] = useState<string | null>(null);

  // Mentee Dossier / Academic & Extracurricular Profile Modal (Requirement 1.3)
  const [viewingMenteeProfile, setViewingMenteeProfile] = useState<MenteeAcademicProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // New Session Form
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionType, setSessionType] = useState("ACADEMIC");
  const [meetingMode, setMeetingMode] = useState("IN_PERSON");
  const [topics, setTopics] = useState("");
  const [guidance, setGuidance] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [nextReview, setNextReview] = useState("");

  // Response to Concern
  const [selectedConcern, setSelectedConcern] = useState<MentoringConcernView | null>(null);
  const [mentorReply, setMentorReply] = useState("");
  const [concernStatus, setConcernStatus] = useState<"IN_REVIEW" | "RESOLVED" | "ESCALATED_TO_HOD">("RESOLVED");

  // ── State for HOD ─────────────────────────────────────────────────────────────
  const [hodOverview, setHodOverview] = useState<HodMentoringOverview | null>(null);
  const [hodAllocations, setHodAllocations] = useState<AllocationDetailView[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<EligibleStudentView[]>([]);
  const [deptFaculty, setDeptFaculty] = useState<FacultyOptionView[]>([]);
  const [hodTab, setHodTab] = useState<"allocation" | "governance" | "escalations">("allocation");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetFacultyId, setTargetFacultyId] = useState<number | "">("");
  const [selectedStudentRegs, setSelectedStudentRegs] = useState<string[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSemFilter, setStudentSemFilter] = useState<string>("ALL");
  const [allocStatusFilter, setAllocStatusFilter] = useState<string>("ALL");
  // Deletion of Mentor Allocation
  const [selectedHodAllocIds, setSelectedHodAllocIds] = useState<number[]>([]);
  const [allocToDelete, setAllocToDelete] = useState<AllocationDetailView | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Automated Mentee Allocation (Requirement 1.1)
  const [showAutoAllocateModal, setShowAutoAllocateModal] = useState(false);
  const [autoSemFilter, setAutoSemFilter] = useState<string>("ALL");
  const [autoStrategy, setAutoStrategy] = useState<"BALANCED" | "ROUND_ROBIN">("BALANCED");
  const [autoAllocating, setAutoAllocating] = useState(false);
  const [autoResult, setAutoResult] = useState<AutoAllocateResult | null>(null);
  const [autoAllocateError, setAutoAllocateError] = useState<string | null>(null);

  // Unassigned students matching semester filter
  const unassignedStudents = useMemo(() => {
    return eligibleStudents.filter((s) => {
      const isUnassigned = !s.facultyId || s.allocationStatus === "UNASSIGNED" || s.allocationStatus === "REJECTED_BY_ADEAN";
      const matchesSem = autoSemFilter === "ALL" || String(s.semester) === String(autoSemFilter);
      return isUnassigned && matchesSem;
    });
  }, [eligibleStudents, autoSemFilter]);

  // Total students in the department that are unassigned
  const deptUnassignedCount = useMemo(() => {
    return eligibleStudents.filter((s) => !s.facultyId || s.allocationStatus === "UNASSIGNED" || s.allocationStatus === "REJECTED_BY_ADEAN").length;
  }, [eligibleStudents]);

  // Total students in the selected semester filter
  const totalStudentsInFilter = useMemo(() => {
    return eligibleStudents.filter((s) => autoSemFilter === "ALL" || String(s.semester) === String(autoSemFilter));
  }, [eligibleStudents, autoSemFilter]);

  // Live simulation of how students will be distributed across faculty mentors
  const strategySimulation = useMemo(() => {
    if (!deptFaculty || deptFaculty.length === 0) return [];

    const facultyLoads = deptFaculty.map((f) => ({
      facultyId: f.id,
      facultyName: f.name,
      facultyUsername: f.username,
      currentLoad: (f.activeMenteeCount ?? f.activeCount ?? 0) + (f.pendingMenteeCount ?? f.pendingCount ?? 0),
      newAllocations: 0,
    }));

    if (unassignedStudents.length === 0) {
      return facultyLoads;
    }

    if (autoStrategy === "ROUND_ROBIN") {
      unassignedStudents.forEach((_, index) => {
        const target = facultyLoads[index % facultyLoads.length];
        target.newAllocations += 1;
      });
    } else {
      // Balanced: assign to whichever faculty has lowest total load (currentLoad + newAllocations)
      unassignedStudents.forEach(() => {
        let minFac = facultyLoads[0];
        for (const fac of facultyLoads) {
          if (fac.currentLoad + fac.newAllocations < minFac.currentLoad + minFac.newAllocations) {
            minFac = fac;
          }
        }
        minFac.newAllocations += 1;
      });
    }

    return facultyLoads;
  }, [deptFaculty, unassignedStudents, autoStrategy]);

  // Escalated Mentor Requests to HOD (Requirement 1.4)
  const [escalatedRequests, setEscalatedRequests] = useState<EscalatedMentorRequestView[]>([]);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalatedMentorRequestView | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [escalationAction, setEscalationAction] = useState<"REASSIGN" | "RETAIN">("REASSIGN");
  const [reassignFacultyId, setReassignFacultyId] = useState<number | "">("");
  const [hodResolveRemarks, setHodResolveRemarks] = useState("");
  const [resolvingEscalation, setResolvingEscalation] = useState(false);

  // ── State for Associate Dean (ADEAN) & Admin ──────────────────────────────────
  const [collegeOverview, setCollegeOverview] = useState<CollegeMentoringOverview | null>(null);
  const [pendingAllocations, setPendingAllocations] = useState<PendingAllocationView[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<number[]>([]);
  const [deanTab, setDeanTab] = useState<"approvals" | "overview">("approvals");
  const [deanDeptFilter, setDeanDeptFilter] = useState<string>("ALL");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [targetRejectIds, setTargetRejectIds] = useState<number[]>([]);

  // Batch-wise ADEAN Approval (Requirement 1.2)
  const [pendingBatches, setPendingBatches] = useState<PendingBatchView[]>([]);
  const [approvalViewMode, setApprovalViewMode] = useState<"batch" | "individual">("batch");
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<PendingBatchView | null>(null);
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState<string | null>(null);
  const [batchRejectRemarks, setBatchRejectRemarks] = useState("");

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      if (mode === "student") {
        const data = await mentoringApi.getStudentDashboard();
        setStudentDash(data);
      } else if (mode === "faculty") {
        const [mList, sList, cList] = await Promise.all([
          mentoringApi.getFacultyMentees(),
          mentoringApi.getSessions(),
          mentoringApi.getConcerns(),
        ]);
        setMentees(mList);
        setSessions(sList);
        setConcerns(cList);
      } else if (mode === "hod") {
        const [overview, allocs, students, faculty, cList, escalated] = await Promise.all([
          mentoringApi.getHodOverview(deptKey),
          mentoringApi.getHodAllocations(deptKey).catch(() => []),
          mentoringApi.getEligibleStudents(deptKey).catch(() => []),
          mentoringApi.getDeptFaculty(deptKey).catch(() => []),
          mentoringApi.getConcerns(),
          mentoringApi.getEscalatedRequests(deptKey).catch(() => []),
        ]);
        setHodOverview(overview);
        setHodAllocations(allocs);
        setEligibleStudents(students);
        setDeptFaculty(faculty);
        setConcerns(cList);
        setEscalatedRequests(escalated);
      } else {
        // mode === "dean" or "admin"
        const [overview, pending, batches, cList] = await Promise.all([
          mentoringApi.getInstitutionalOverview(collegeKey),
          mentoringApi.getPendingDeanAllocations(deanDeptFilter !== "ALL" ? deanDeptFilter : undefined).catch(() => []),
          mentoringApi.getPendingBatches(deanDeptFilter !== "ALL" ? deanDeptFilter : undefined).catch(() => []),
          mentoringApi.getConcerns(),
        ]);
        setCollegeOverview(overview);
        setPendingAllocations(pending);
        setPendingBatches(batches);
        setConcerns(cList);
      }
    } catch (err: any) {
      console.error(err);
      onToast?.("Could not load mentoring data.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode, deptKey, collegeKey, deanDeptFilter]);

  // ── Handlers: Student ─────────────────────────────────────────────────────────
  const handleRaiseConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcernTitle || !newConcernDesc) return;
    setConcernSubmitting(true);
    try {
      await mentoringApi.submitConcern({
        title: newConcernTitle,
        category: newConcernCat,
        description: newConcernDesc,
      });
      onToast?.("Your concern has been submitted to your mentor.", "success");
      setNewConcernTitle("");
      setNewConcernDesc("");
      loadData();
    } catch {
      onToast?.("Failed to submit concern.", "danger");
    } finally {
      setConcernSubmitting(false);
    }
  };

  // ── Handlers: Faculty ─────────────────────────────────────────────────────────
  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentee || !topics || !guidance) return;
    try {
      await mentoringApi.recordSession({
        studentRegNo: selectedMentee,
        sessionDate,
        sessionType,
        meetingMode,
        topicsDiscussed: topics,
        guidanceNotes: guidance,
        actionItems,
        nextReviewDate: nextReview || undefined,
      });
      onToast?.("Mentoring session recorded successfully.", "success");
      setShowSessionModal(false);
      setTopics("");
      setGuidance("");
      setActionItems("");
      loadData();
    } catch {
      onToast?.("Failed to record mentoring session.", "danger");
    }
  };

  const handleUpdateConcern = async () => {
    if (!selectedConcern) return;
    try {
      await mentoringApi.updateConcern(selectedConcern.id, {
        status: concernStatus,
        mentorResponse: mentorReply,
      });
      onToast?.("Concern response updated successfully.", "success");
      setSelectedConcern(null);
      loadData();
    } catch {
      onToast?.("Failed to update concern.", "danger");
    }
  };

  // ── Handlers: HOD Mentee Assignment ──────────────────────────────────────────
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFacultyId) {
      onToast?.("Please select a faculty mentor.", "warning");
      return;
    }
    if (selectedStudentRegs.length === 0) {
      onToast?.("Please select at least one student to assign.", "warning");
      return;
    }

    setAssignSubmitting(true);
    try {
      const allocations = selectedStudentRegs.map((regNo) => ({
        studentRegNo: regNo,
        facultyId: Number(targetFacultyId),
      }));

      await mentoringApi.allocateMentors({
        deptKey,
        academicYear: "2026-2027",
        allocations,
      });

      onToast?.(
        `Successfully assigned ${allocations.length} mentee(s) and submitted for Associate Dean (ADEAN) approval!`,
        "success"
      );
      setShowAssignModal(false);
      setSelectedStudentRegs([]);
      setTargetFacultyId("");
      loadData();
    } catch (err: any) {
      console.error(err);
      onToast?.("Failed to assign mentees.", "danger");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const toggleSelectStudent = (regNo: string) => {
    setSelectedStudentRegs((prev) =>
      prev.includes(regNo) ? prev.filter((r) => r !== regNo) : [...prev, regNo]
    );
  };

  const selectAllUnassigned = () => {
    const unassigned = eligibleStudents
      .filter((s) => s.allocationStatus === "UNASSIGNED" || s.allocationStatus === "REJECTED")
      .map((s) => s.regNo);
    setSelectedStudentRegs(unassigned);
  };

  // ── Handlers: Deletion of Mentor Allocation ──────────────────────────────────
  const handleDeleteSingle = async () => {
    if (!allocToDelete) return;
    setDeleteSubmitting(true);
    try {
      await mentoringApi.deleteHodAllocation(allocToDelete.id);
      onToast?.(
        `Successfully deleted mentor allocation for ${allocToDelete.studentName} (${allocToDelete.studentRegNo}). Student is now unassigned.`,
        "success"
      );
      setAllocToDelete(null);
      setSelectedHodAllocIds((prev) => prev.filter((id) => id !== allocToDelete.id));
      loadData();
    } catch (err: any) {
      console.error(err);
      onToast?.("Failed to delete mentor allocation.", "danger");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHodAllocIds.length === 0) return;
    setDeleteSubmitting(true);
    try {
      const res = await mentoringApi.deleteHodAllocations(selectedHodAllocIds);
      onToast?.(
        `Successfully deleted ${res.deleted ?? selectedHodAllocIds.length} mentor allocation(s). Selected students are now unassigned.`,
        "success"
      );
      setSelectedHodAllocIds([]);
      setShowBulkDeleteModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      onToast?.("Failed to delete selected mentor allocations.", "danger");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // ── Handlers: Associate Dean Approval ────────────────────────────────────────
  const handleApproveSelected = async () => {
    if (selectedPendingIds.length === 0) {
      onToast?.("Select at least one allocation to approve.", "warning");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await mentoringApi.reviewAllocations({
        allocationIds: selectedPendingIds,
        action: "APPROVE",
      });
      onToast?.(
        res.message || `Approved ${res.approvedCount} allocation(s). Visible now in faculty and student portals.`,
        "success"
      );
      setSelectedPendingIds([]);
      loadData();
    } catch {
      onToast?.("Failed to approve allocations.", "danger");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleApproveSingle = async (allocId: number) => {
    try {
      await mentoringApi.reviewAllocations({
        allocationIds: [allocId],
        action: "APPROVE",
      });
      onToast?.("Mentee allocation approved! Mentee is now visible in faculty and student portals.", "success");
      loadData();
    } catch {
      onToast?.("Failed to approve allocation.", "danger");
    }
  };

  const openRejectModal = (ids: number[]) => {
    setTargetRejectIds(ids);
    setRejectRemarks("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (targetRejectIds.length === 0) return;
    setReviewSubmitting(true);
    try {
      await mentoringApi.reviewAllocations({
        allocationIds: targetRejectIds,
        action: "REJECT",
        remarks: rejectRemarks || "Returned by Associate Dean for reassignment.",
      });
      onToast?.("Allocations returned to HOD for revision.", "warning");
      setShowRejectModal(false);
      setSelectedPendingIds([]);
      setTargetRejectIds([]);
      loadData();
    } catch {
      onToast?.("Failed to reject allocation.", "danger");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Handlers: Student Mentor Change Request (Requirement 1.4) ─────────────
  const handleStudentMentorChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMentorChangeSubmitting(true);
    try {
      await mentoringApi.submitMentorChangeRequest({
        reason: changeReason,
        queriesAboutMentor: mentorQueries,
        preferredMentorNotes: preferredMentorNotes,
      });
      onToast?.(
        "Your mentor reassignment request and queries have been escalated confidentially to your Head of Department (HOD).",
        "success"
      );
      setShowMentorChangeModal(false);
      setMentorQueries("");
      setPreferredMentorNotes("");
      loadData();
    } catch {
      onToast?.("Failed to submit mentor change request.", "danger");
    } finally {
      setMentorChangeSubmitting(false);
    }
  };

  // ── Handlers: Faculty Mentee Academic Dossier (Requirement 1.3) ────────────
  const handleOpenMenteeProfile = async (regNo: string) => {
    setLoadingProfile(true);
    try {
      const profile = await mentoringApi.getMenteeProfile(regNo);
      setViewingMenteeProfile(profile);
    } catch {
      onToast?.("Could not load mentee profile details.", "danger");
    } finally {
      setLoadingProfile(false);
    }
  };

  // ── Handlers: Automated Mentee Allocation (Requirement 1.1) ───────────────
  const handleRunAutoAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutoAllocating(true);
    setAutoAllocateError(null);
    try {
      const res = await mentoringApi.autoAllocate({
        deptKey,
        semester: autoSemFilter !== "ALL" ? Number(autoSemFilter) : undefined,
        strategy: autoStrategy,
      });
      setAutoResult(res);
      notify(res.message, "success");
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to execute automated allocation.";
      setAutoAllocateError(msg);
      notify(msg, "danger");
    } finally {
      setAutoAllocating(false);
    }
  };

  // ── Handlers: Batch-wise ADEAN Approval (Requirement 1.2) ──────────────────
  const handleBatchApprove = async (batchId: string) => {
    setReviewSubmitting(true);
    try {
      const res = await mentoringApi.reviewBatch({
        batchId,
        action: "APPROVE",
        remarks: "Approved by Associate Dean (ADEAN).",
      });
      onToast?.(
        res.message || `Batch ${batchId} successfully approved. All mentees are active.`,
        "success"
      );
      loadData();
    } catch {
      onToast?.("Failed to approve batch.", "danger");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const openBatchRejectModal = (batchId: string) => {
    setTargetBatchId(batchId);
    setBatchRejectRemarks("");
    setShowBatchRejectModal(true);
  };

  const handleConfirmBatchReject = async () => {
    if (!targetBatchId) return;
    setReviewSubmitting(true);
    try {
      await mentoringApi.reviewBatch({
        batchId: targetBatchId,
        action: "REJECT",
        remarks: batchRejectRemarks || "Returned by Associate Dean for cohort reassignment.",
      });
      onToast?.(`Batch ${targetBatchId} returned to HOD for revision.`, "warning");
      setShowBatchRejectModal(false);
      setTargetBatchId(null);
      loadData();
    } catch {
      onToast?.("Failed to reject batch.", "danger");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Handlers: HOD Escalation Resolution (Requirement 1.4) ──────────────────
  const handleResolveEscalationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalation) return;
    if (escalationAction === "REASSIGN" && !reassignFacultyId) {
      onToast?.("Please select a target faculty mentor for reassignment.", "warning");
      return;
    }
    setResolvingEscalation(true);
    try {
      await mentoringApi.resolveMentorChange({
        concernId: selectedEscalation.id,
        action: escalationAction,
        newFacultyId: escalationAction === "REASSIGN" ? Number(reassignFacultyId) : undefined,
        hodRemarks: hodResolveRemarks || (escalationAction === "REASSIGN" ? "Reassigned by HOD" : "Counseling provided; retained current mentor"),
      });
      onToast?.(
        escalationAction === "REASSIGN"
          ? "Student mentor reassigned successfully and notification dispatched."
          : "Escalation resolved with HOD counseling remarks.",
        "success"
      );
      setShowResolveModal(false);
      setSelectedEscalation(null);
      setHodResolveRemarks("");
      loadData();
    } catch {
      onToast?.("Failed to resolve mentor change request.", "danger");
    } finally {
      setResolvingEscalation(false);
    }
  };

  // ── 1. STUDENT VIEW ──────────────────────────────────────────────────────────
  if (mode === "student") {
    const isApproved = studentDash?.allocationStatus === "APPROVED" && Boolean(studentDash?.mentor);
    const isPending = studentDash?.allocationStatus === "PENDING_ADEAN_APPROVAL";

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Academic Mentoring Hub</h2>
            <p className="text-xs text-slate-500">
              One-on-one faculty guidance, meeting logs, and student advisory support
            </p>
          </div>
          <span
            className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-2 ${isApproved
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : isPending
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-slate-100 text-slate-700 border border-slate-300"
              }`}
          >
            {isApproved ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-600" />
                ADEAN Approved Active Mentor
              </>
            ) : isPending ? (
              <>
                <Clock size={14} className="text-amber-600 animate-pulse" />
                Awaiting Associate Dean (ADEAN) Approval
              </>
            ) : (
              <>
                <AlertCircle size={14} className="text-slate-500" />
                Mentor Assignment Pending
              </>
            )}
          </span>
        </div>

        {/* Dynamic Display: Only show mentor name after ADEAN approval */}
        {isApproved && studentDash?.mentor ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold text-2xl shrink-0 shadow">
                  {studentDash.mentor.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] tracking-wider uppercase border border-emerald-200">
                      Assigned Mentor
                    </span>
                    <span className="text-xs text-slate-400 font-mono">@{studentDash.mentor.username}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{studentDash.mentor.name}</h3>
                  <p className="text-xs font-medium text-slate-500">
                    Faculty Advisor · {studentDash.mentor.department}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Building2 size={13} />
                    {studentDash.mentor.cabin}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px] border-t sm:border-t-0 sm:border-l border-slate-100 sm:pl-6 pt-4 sm:pt-0">
                <a
                  href={`mailto:${studentDash.mentor.email}`}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0B192C] transition"
                >
                  <Mail size={14} className="text-slate-400" />
                  {studentDash.mentor.email}
                </a>
                <a
                  href={`tel:${studentDash.mentor.phone}`}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0B192C] transition"
                >
                  <Phone size={14} className="text-slate-400" />
                  {studentDash.mentor.phone}
                </a>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Sessions Conducted:</span>
                  <span className="font-bold text-[#0B192C]">{studentDash.sessions?.length || 0}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMentorChangeModal(true)}
                  className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition shadow-sm cursor-pointer"
                  title="If unwilling to continue with current mentor or have concerns to escalate"
                >
                  <AlertTriangle size={13} />
                  Request Mentor Change / Queries to HOD
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Notice Card shown when not approved: Mentor Name is hidden as required */
          <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-8 text-center shadow-sm space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Clock size={28} className="animate-pulse" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-black text-[#0B192C]">
                {isPending ? "Mentor Allocation Submitted for ADEAN Approval" : "Mentor Allocation in Progress"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isPending
                  ? "Your department Head of Department (HOD) has assigned your faculty mentor and forwarded the cohort allocation to the Associate Dean (Academics & Evaluation) for institutional verification. Once the Associate Dean approves your allocation, your mentor's name and contact card will appear here."
                  : "Your department HOD will assign academic mentors for your cohort. Once submitted and approved by the Associate Dean, your assigned mentor's details and advising schedule will be displayed here."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-800 shadow-sm">
              <ShieldCheck size={16} className="text-amber-600" />
              <span>Status: {isPending ? "Pending ADEAN Verification" : "Awaiting Department Assignment"}</span>
            </div>
          </div>
        )}

        {/* Sessions & Concerns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mentoring Sessions History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-[#0B192C]" />
              Mentoring Sessions & Minutes
            </h3>

            {!isApproved ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                Session history will be available once your mentor allocation is approved.
              </p>
            ) : !studentDash?.sessions || studentDash.sessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No mentoring sessions logged yet for this academic year.
              </p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {studentDash.sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1.5 transition hover:border-slate-200"
                  >
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-[#0B192C]">
                        <Clock size={13} className="text-[#D4A72C]" />
                        {s.sessionDate} · {s.sessionType}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {s.meetingMode}
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <strong className="text-slate-900">Topic:</strong> {s.topicsDiscussed}
                    </p>
                    <p className="text-slate-600">
                      <strong className="text-slate-900">Guidance:</strong> {s.guidanceNotes}
                    </p>
                    {s.actionItems && (
                      <p className="text-emerald-700 font-semibold pt-1">
                        🎯 Action Items: {s.actionItems}
                      </p>
                    )}
                    {s.nextReviewDate && (
                      <p className="text-slate-400 text-[11px] pt-1">
                        Next Review Date: {s.nextReviewDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raise Concern / Concerns List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <MessageSquare size={18} className="text-[#0B192C]" />
                Raise a Query / Concern
              </h3>

              <form onSubmit={handleRaiseConcern} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Subject / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newConcernTitle}
                    onChange={(e) => setNewConcernTitle(e.target.value)}
                    placeholder="e.g. Elective subject doubt, lab conflict, academic guidance"
                    className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Category</label>
                    <select
                      value={newConcernCat}
                      onChange={(e) => setNewConcernCat(e.target.value)}
                      className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                    >
                      <option value="ACADEMIC">Academic</option>
                      <option value="EXAM">Examination</option>
                      <option value="FACILITY">Campus Facility</option>
                      <option value="CAREER">Career / Internship</option>
                      <option value="PERSONAL">Personal / Well-being</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Description</label>
                  <textarea
                    required
                    rows={2}
                    value={newConcernDesc}
                    onChange={(e) => setNewConcernDesc(e.target.value)}
                    placeholder="Provide details so your mentor can assist or arrange a session..."
                    className="w-full mt-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={concernSubmitting || !isApproved}
                  className="w-full bg-[#0B192C] text-[#D4A72C] font-bold text-xs py-2.5 rounded-xl hover:bg-[#1E3E62] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                  Submit Query to Mentor
                </button>
              </form>
            </div>

            {/* Existing Concerns */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">My Queries & Status</h4>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {!studentDash?.concerns || studentDash.concerns.length === 0 ? (
                  <p className="text-[11px] text-slate-400">No queries raised.</p>
                ) : (
                  studentDash.concerns.map((c) => (
                    <div
                      key={c.id}
                      className="text-xs p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{c.title}</p>
                        {c.mentorResponse && (
                          <p className="text-[11px] text-emerald-700 mt-0.5">Mentor: {c.mentorResponse}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "ESCALATED_TO_HOD"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                      >
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Request Mentor Change / Queries about Mentor (Requirement 1.4) */}
        {showMentorChangeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-600" />
                    Request Mentor Change / Queries to HOD
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requirement 1.4: Confidential escalation directly to Head of Department (HOD)
                  </p>
                </div>
                <button
                  onClick={() => setShowMentorChangeModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-700" />
                  Direct HOD Escalation Protocol
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  If you are not willing to continue with your assigned faculty mentor, your queries and justification
                  will bypass the mentor and be routed strictly to your Head of Department for counseling or mentor reassignment.
                </p>
              </div>

              <form onSubmit={handleStudentMentorChange} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Primary Reason for Reassignment Request *</label>
                  <select
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  >
                    <option value="Guidance Domain Mismatch">Domain / Subject Specialization Mismatch</option>
                    <option value="Availability & Scheduling Conflict">Faculty Availability & Timetable Conflict</option>
                    <option value="Communication Barrier">Communication / Language Barrier</option>
                    <option value="Academic Advisory Conflict">Academic Counseling Disagreement</option>
                    <option value="Personal Well-being Concern">Personal / Comfort Level Concern</option>
                    <option value="Other">Other Specific Reason</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Specific Queries & Grievances about Current Mentor *</label>
                  <textarea
                    required
                    rows={3}
                    value={mentorQueries}
                    onChange={(e) => setMentorQueries(e.target.value)}
                    placeholder="Provide details regarding issues faced, attempts to meet, or specific queries for the HOD..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Preferred Specialization / Faculty Note (Optional)</label>
                  <input
                    type="text"
                    value={preferredMentorNotes}
                    onChange={(e) => setPreferredMentorNotes(e.target.value)}
                    placeholder="e.g. AI / ML focus, VLSI, or preferred faculty member name"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowMentorChangeModal(false)}
                    className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mentorChangeSubmitting || !mentorQueries.trim()}
                    className="px-5 py-2 bg-rose-700 text-white rounded-xl font-bold hover:bg-rose-800 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    {mentorChangeSubmitting ? "Escalating..." : "Escalate to HOD"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 2. FACULTY VIEW ───────────────────────────────────────────────────────────
  if (mode === "faculty") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Mentee Dashboard</h2>
            <p className="text-xs text-slate-500">
              Monitor approved mentees, record mentoring sessions, and resolve student concerns
            </p>
          </div>
          <button
            onClick={() => {
              if (mentees.length > 0) setSelectedMentee(mentees[0].regNo);
              setShowSessionModal(true);
            }}
            disabled={mentees.length === 0}
            className="flex items-center gap-2 bg-[#0B192C] text-[#D4A72C] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#1E3E62] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Record Mentoring Session
          </button>
        </div>

        {/* Mentees Table: ONLY Approved Mentees are displayed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-[#0B192C]" />
              Approved Allocated Mentees ({mentees.length})
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck size={14} />
              ADEAN Approved Only
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Register No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Year / Sem</th>
                  <th className="py-3 px-4">Arrears</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">IA Average</th>
                  <th className="py-3 px-4">Extracurricular</th>
                  <th className="py-3 px-4">Last Mentoring</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mentees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <Users size={28} className="mx-auto text-slate-300" />
                        <p className="font-bold text-slate-700">No approved mentees allocated yet.</p>
                        <p className="text-[11px] text-slate-500">
                          Mentee assignments made by the department HOD must be approved by the Associate Dean (ADEAN)
                          before they appear in your active mentee roster.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  mentees.map((m) => (
                    <tr key={m.regNo} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#0B192C]">{m.regNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{m.name}</td>
                      <td className="py-3 px-4">
                        {m.yearLabel} (Sem {m.semester})
                      </td>
                      <td className="py-3 px-4">
                        {(m.arrearsCount ?? 0) > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]"
                            title={m.arrearSubjects || "Active arrears"}
                          >
                            <AlertTriangle size={11} />
                            {m.arrearsCount} Arrear(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                            <CheckCircle2 size={11} />
                            0 Arrears
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(m.attendancePct ?? 0) < 75
                                ? "bg-rose-500"
                                : (m.attendancePct ?? 0) < 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                                }`}
                              style={{ width: `${Math.min(100, m.attendancePct ?? 0)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold ${(m.attendancePct ?? 0) < 75 ? "text-rose-700" : "text-slate-800"}`}
                          >
                            {(m.attendancePct ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {(m.iaAverage ?? 0) > 0 ? (
                          `${(m.iaAverage ?? 0).toFixed(1)}/100`
                        ) : (
                          <span className="text-slate-400 font-normal">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {(m.activities?.length ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[10px] border border-blue-200">
                            <Award size={11} />
                            {m.activities?.length} Listed
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {m.lastSessionDate || <span className="text-slate-400">Not recorded</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenMenteeProfile(m.regNo)}
                            disabled={loadingProfile}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0B192C] font-bold text-[11px] flex items-center gap-1 shadow-sm cursor-pointer"
                            title="View Arrears, Attendance, IA Marks & Extracurricular Dossier"
                          >
                            <Eye size={12} />
                            Dossier
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMentee(m.regNo);
                              setShowSessionModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0B192C] text-[#D4A72C] font-bold text-[11px] hover:bg-[#1E3E62] transition shadow-sm cursor-pointer"
                          >
                            Log Session
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Queries Inbox & Recent Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-600" />
              Student Concerns & Requests ({concerns.length})
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {concerns.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No student concerns raised.</p>
              ) : (
                concerns.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{c.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                            }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.studentName} ({c.studentRegNo}) · {c.category}
                      </p>
                      <p className="text-xs text-slate-700 mt-1">"{c.description}"</p>
                      {c.mentorResponse && (
                        <p className="text-xs text-emerald-700 font-medium mt-1">Your reply: {c.mentorResponse}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedConcern(c);
                        setMentorReply(c.mentorResponse || "");
                        setConcernStatus(c.status as any);
                      }}
                      className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-[#0B192C]"
                    >
                      Respond
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-[#0B192C]" />
              Recent Session Records
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No mentoring sessions recorded yet.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>
                        {s.studentName} ({s.studentRegNo})
                      </span>
                      <span className="text-slate-500">{s.sessionDate}</span>
                    </div>
                    <p className="text-slate-600 mt-1">
                      <strong>Topic:</strong> {s.topicsDiscussed}
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      <strong>Guidance:</strong> {s.guidanceNotes}
                    </p>
                    {s.actionItems && <p className="text-emerald-700 mt-1 font-semibold">Action: {s.actionItems}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal: Record Session */}
        {showSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Record Mentoring Session</h3>
                <button onClick={() => setShowSessionModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRecordSession} className="space-y-4 mt-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Select Mentee</label>
                  <select
                    value={selectedMentee || ""}
                    onChange={(e) => setSelectedMentee(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 font-semibold"
                  >
                    {mentees.map((m) => (
                      <option key={m.regNo} value={m.regNo}>
                        {m.name} ({m.regNo})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Type</label>
                    <select
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-200"
                    >
                      <option value="ACADEMIC">Academic</option>
                      <option value="CAREER">Career & Placement</option>
                      <option value="ATTENDANCE">Attendance / Discipline</option>
                      <option value="PERSONAL">Personal Well-being</option>
                      <option value="GENERAL">General Progress</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Topics Discussed</label>
                  <input
                    type="text"
                    required
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    placeholder="e.g. IAT performance, projects, attendance"
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Guidance & Advice Given</label>
                  <textarea
                    required
                    rows={2}
                    value={guidance}
                    onChange={(e) => setGuidance(e.target.value)}
                    placeholder="Observations and mentorship instructions..."
                    className="w-full mt-1 p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Action Items</label>
                    <input
                      type="text"
                      value={actionItems}
                      onChange={(e) => setActionItems(e.target.value)}
                      placeholder="e.g. Submit assignment by Friday"
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700">Next Review Date</label>
                    <input
                      type="date"
                      value={nextReview}
                      onChange={(e) => setNextReview(e.target.value)}
                      className="w-full mt-1 p-2.5 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0B192C] text-[#D4A72C] rounded-xl font-bold hover:bg-[#1E3E62]"
                  >
                    Save Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Respond to Concern */}
        {selectedConcern && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Respond to Concern</h3>
                <button onClick={() => setSelectedConcern(null)}>
                  <X size={18} />
                </button>
              </div>
              <div>
                <p className="font-bold text-slate-800">{selectedConcern.title}</p>
                <p className="text-slate-600 mt-1 italic">"{selectedConcern.description}"</p>
              </div>
              <div>
                <label className="font-bold text-slate-700">Status</label>
                <select
                  value={concernStatus}
                  onChange={(e: any) => setConcernStatus(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200"
                >
                  <option value="IN_REVIEW">Under Review</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="ESCALATED_TO_HOD">Escalate to HOD</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Mentor Remarks / Response</label>
                <textarea
                  rows={3}
                  value={mentorReply}
                  onChange={(e) => setMentorReply(e.target.value)}
                  placeholder="Type guidance or action taken..."
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => setSelectedConcern(null)} className="px-4 py-1.5 border rounded-xl font-bold">
                  Cancel
                </button>
                <button
                  onClick={handleUpdateConcern}
                  className="px-4 py-1.5 bg-[#0B192C] text-[#D4A72C] rounded-xl font-bold"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Mentee Academic & Extracurricular Dossier (Requirement 1.3) */}
        {viewingMenteeProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col text-xs">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold text-lg">
                    {viewingMenteeProfile.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900">{viewingMenteeProfile.name}</h3>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {viewingMenteeProfile.regNo}
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {viewingMenteeProfile.yearLabel} · Sem {viewingMenteeProfile.semester} · {deptCode(viewingMenteeProfile.deptKey)} · {viewingMenteeProfile.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingMenteeProfile(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 4 Performance Metric Cards (Requirement 1.3) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Arrears</span>
                  <p className={`text-xl font-black mt-1 ${viewingMenteeProfile.arrearsCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {viewingMenteeProfile.arrearsCount}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {viewingMenteeProfile.arrearsCount > 0 ? "Pending paper(s)" : "No backlogs"}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance</span>
                  <p className={`text-xl font-black mt-1 ${viewingMenteeProfile.attendancePct < 75 ? "text-rose-600" : "text-emerald-600"}`}>
                    {viewingMenteeProfile.attendancePct.toFixed(1)}%
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {viewingMenteeProfile.attendedClasses} / {viewingMenteeProfile.totalClasses} classes
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IA Average</span>
                  <p className="text-xl font-black mt-1 text-[#0B192C]">
                    {viewingMenteeProfile.iaAverage > 0 ? `${viewingMenteeProfile.iaAverage.toFixed(1)}` : "N/A"}
                  </p>
                  <span className="text-[10px] text-slate-500">Out of 100</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Extracurricular</span>
                  <p className="text-xl font-black mt-1 text-indigo-600">
                    {viewingMenteeProfile.extracurricularActivities?.length || 0}
                  </p>
                  <span className="text-[10px] text-slate-500">Events / Awards</span>
                </div>
              </div>

              {/* Scrollable Dossier Details */}
              <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                {/* Arrears List if any */}
                {viewingMenteeProfile.arrearsCount > 0 && (
                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 space-y-2">
                    <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" />
                      Arrear Subjects Requiring Mentoring Focus ({viewingMenteeProfile.arrearsCount})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingMenteeProfile.arrearSubjectList?.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-800 font-mono font-bold text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internal Assessment Marks Breakdown */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-[#0B192C]" />
                      Internal Assessment (IA) Performance Breakdown
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Continuous Evaluation</span>
                  </div>
                  {(!viewingMenteeProfile.subjectMarks || viewingMenteeProfile.subjectMarks.length === 0) ? (
                    <p className="p-4 text-center text-slate-400 text-[11px]">No internal assessment marks recorded yet for current semester.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                        <tr>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3">Component</th>
                          <th className="py-2 px-3 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingMenteeProfile.subjectMarks.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-800">{m.subjectCode}</span>
                              <span className="text-slate-500 ml-1.5 text-[11px]">{m.subjectTitle}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-medium">{m.component}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-900">{m.value} / 100</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Extracurricular Activities */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Award size={14} className="text-[#0B192C]" />
                      Extracurricular & Co-curricular Activities
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Holistic Development</span>
                  </div>
                  {(!viewingMenteeProfile.extracurricularActivities || viewingMenteeProfile.extracurricularActivities.length === 0) ? (
                    <p className="p-4 text-center text-slate-400 text-[11px]">No extracurricular activities recorded for this student.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {viewingMenteeProfile.extracurricularActivities.map((act) => (
                        <div key={act.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50/60">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                                {act.activityType}
                              </span>
                              <p className="font-bold text-slate-800">{act.title}</p>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {act.organization} · {act.achievement}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {act.academicYear} {act.eventDate ? `(${act.eventDate})` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mentoring Log & Concerns */}
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#0B192C]" />
                    Session & Advisory History ({viewingMenteeProfile.sessions?.length || 0} Sessions)
                  </h4>
                  {(!viewingMenteeProfile.sessions || viewingMenteeProfile.sessions.length === 0) ? (
                    <p className="text-[11px] text-slate-400">No previous sessions logged for this student.</p>
                  ) : (
                    <div className="space-y-2">
                      {viewingMenteeProfile.sessions.slice(0, 3).map((s) => (
                        <div key={s.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px]">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>{s.sessionDate} · {s.sessionType}</span>
                            <span className="text-slate-500 font-normal">{s.meetingMode}</span>
                          </div>
                          <p className="text-slate-700 mt-1"><strong>Topic:</strong> {s.topicsDiscussed}</p>
                          <p className="text-slate-600 mt-0.5"><strong>Guidance:</strong> {s.guidanceNotes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (viewingMenteeProfile) {
                      setSelectedMentee(viewingMenteeProfile.regNo);
                      setViewingMenteeProfile(null);
                      setShowSessionModal(true);
                    }
                  }}
                  className="px-4 py-2 bg-[#0B192C] text-[#D4A72C] rounded-xl font-bold hover:bg-[#1E3E62] transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Record New Session for {viewingMenteeProfile.name}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMenteeProfile(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 3. HOD VIEW ───────────────────────────────────────────────────────────────
  if (mode === "hod") {
    // Filter allocations & students
    const filteredAllocations = hodAllocations.filter((a) => {
      const matchSearch =
        studentSearch === "" ||
        a.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        a.studentRegNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
        a.facultyName.toLowerCase().includes(studentSearch.toLowerCase());
      const matchStatus =
        allocStatusFilter === "ALL" || a.status === allocStatusFilter;
      const matchSem =
        studentSemFilter === "ALL" || String(a.semester) === studentSemFilter;
      return matchSearch && matchStatus && matchSem;
    });

    const pendingCount = hodAllocations.filter((a) => a.status === "PENDING_ADEAN_APPROVAL").length;
    const approvedCount = hodAllocations.filter((a) => a.status === "APPROVED").length;

    return (
      <div className="space-y-6">
        {/* Floating Notice Toast */}
        {internalNotice && (
          <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200 ${
            internalNotice.tone === "success"
              ? "bg-emerald-600 text-white"
              : internalNotice.tone === "danger"
              ? "bg-rose-600 text-white"
              : internalNotice.tone === "warning"
              ? "bg-amber-600 text-white"
              : "bg-slate-900 text-white"
          }`}>
            <div className="flex items-center gap-2">
              {internalNotice.tone === "success" && <CheckCircle2 size={16} />}
              {internalNotice.tone === "danger" && <AlertTriangle size={16} />}
              {internalNotice.tone === "warning" && <AlertCircle size={16} />}
              <span>{internalNotice.msg}</span>
            </div>
            <button onClick={() => setInternalNotice(null)} className="cursor-pointer text-white/80 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Department Mentoring Administration</h2>
            <p className="text-xs text-slate-500">
              Assign mentees to faculty, forward for Associate Dean (ADEAN) approval, and track mentoring compliance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAutoResult(null);
                setAutoAllocateError(null);
                setShowAutoAllocateModal(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-700 to-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:from-indigo-800 hover:to-blue-800 transition shadow cursor-pointer"
            >
              <Sparkles size={16} className="text-amber-300" />
              ⚡ Automated Mentee Allocation
            </button>
            <button
              onClick={() => {
                setSelectedStudentRegs([]);
                setTargetFacultyId("");
                setShowAssignModal(true);
              }}
              className="flex items-center gap-2 bg-[#0B192C] text-[#D4A72C] font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#1E3E62] transition shadow cursor-pointer"
            >
              <Plus size={16} />
              Manual Allocation
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 bg-rose-50 border border-rose-300 text-rose-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-rose-100 hover:border-rose-400 transition shadow-xs cursor-pointer"
              title="Delete mentor allocation"
            >
              <Trash2 size={16} className="text-rose-600" />
              Delete Mentor Allocation{selectedHodAllocIds.length > 0 ? ` (${selectedHodAllocIds.length})` : ""}
            </button>
          </div>
        </div>

        {/* Top Workflow Notice Banner */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Two-Tier Mentoring Governance Protocol
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                When you assign mentees, they are submitted to the Associate Dean (ADEAN). Only after Associate Dean approval
                will the students appear in the faculty portal, and only then will your faculty mentor name be displayed in
                the student portal.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-xs font-bold text-amber-800 shadow-sm flex items-center gap-1.5">
              <Clock size={14} className="text-amber-600" />
              {pendingCount} Awaiting ADEAN Approval
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
          <button
            onClick={() => setHodTab("allocation")}
            className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${hodTab === "allocation"
                ? "border-[#0B192C] text-[#0B192C]"
                : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
          >
            <Users size={16} />
            <span>Mentee Allocations & Approval Status ({hodAllocations.length})</span>
          </button>
          <button
            onClick={() => setHodTab("governance")}
            className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${hodTab === "governance"
                ? "border-[#0B192C] text-[#0B192C]"
                : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
          >
            <UserCheck size={16} />
            <span>Faculty Workload & Metrics</span>
          </button>
          <button
            onClick={() => setHodTab("escalations")}
            className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${hodTab === "escalations"
                ? "border-[#0B192C] text-[#0B192C]"
                : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
          >
            <AlertTriangle size={16} className="text-rose-500" />
            <span>Escalated Requests & Queries ({escalatedRequests.length})</span>
          </button>
        </div>

        {hodTab === "allocation" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by student name, register number, or mentor..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={allocStatusFilter}
                  onChange={(e) => setAllocStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_ADEAN_APPROVAL">Awaiting ADEAN Approval</option>
                  <option value="APPROVED">Approved by ADEAN</option>
                  <option value="REJECTED">Revision Requested</option>
                </select>
                <select
                  value={studentSemFilter}
                  onChange={(e) => setStudentSemFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-700"
                >
                  <option value="ALL">All Semesters</option>
                  <option value="1">Sem 1 (1st Semester)</option>
                  <option value="2">Sem 2 (2nd Semester)</option>
                  <option value="3">Sem 3 (3rd Semester)</option>
                  <option value="4">Sem 4 (4th Semester)</option>
                  <option value="5">Sem 5 (5th Semester)</option>
                  <option value="6">Sem 6 (6th Semester)</option>
                  <option value="7">Sem 7 (7th Semester)</option>
                  <option value="8">Sem 8 (8th Semester)</option>
                </select>
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Refresh allocations"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            {/* Selected Allocations Bulk Action Bar */}
            {selectedHodAllocIds.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/90 border border-rose-200 p-3.5 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs">
                    {selectedHodAllocIds.length}
                  </span>
                  <div>
                    <span className="font-bold text-rose-900">
                      {selectedHodAllocIds.length} mentor allocation(s) selected
                    </span>
                    <span className="text-[11px] text-rose-700 block sm:inline sm:ml-2">
                      (Deleting will unassign these mentees and return them to the eligible roster)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-sm cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Delete Selected ({selectedHodAllocIds.length})
                  </button>
                  <button
                    onClick={() => setSelectedHodAllocIds([])}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Allocations Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredAllocations.length > 0 &&
                            filteredAllocations.every((a) => selectedHodAllocIds.includes(a.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const idsToAdd = filteredAllocations.map((a) => a.id);
                              setSelectedHodAllocIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
                            } else {
                              const idsToRemove = new Set(filteredAllocations.map((a) => a.id));
                              setSelectedHodAllocIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
                            }
                          }}
                          className="rounded text-[#0B192C]"
                          title="Select all visible allocations"
                        />
                      </th>
                      <th className="py-3 px-4">Register No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Semester</th>
                      <th className="py-3 px-4">Assigned Faculty Mentor</th>
                      <th className="py-3 px-4">Approval Status</th>
                      <th className="py-3 px-4">Assigned Date</th>
                      <th className="py-3 px-4">Remarks / Notes</th>
                      <th className="py-3 px-4 text-center w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
                          <div className="max-w-md mx-auto space-y-2">
                            <Users size={28} className="mx-auto text-slate-300" />
                            <p className="font-bold text-slate-700">No student allocations match the criteria.</p>
                            <p className="text-[11px] text-slate-500">
                              Click "+ Assign Mentees & Send for ADEAN Approval" to pair students with faculty mentors.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAllocations.map((a) => {
                        const isSelected = selectedHodAllocIds.includes(a.id);
                        return (
                          <tr key={a.id} className={`transition ${isSelected ? "bg-rose-50/40" : "hover:bg-slate-50/80"}`}>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedHodAllocIds((prev) => [...prev, a.id]);
                                  } else {
                                    setSelectedHodAllocIds((prev) => prev.filter((id) => id !== a.id));
                                  }
                                }}
                                className="rounded text-[#0B192C]"
                              />
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-[#0B192C]">{a.studentRegNo}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{a.studentName}</td>
                            <td className="py-3 px-4">Sem {a.semester}</td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-bold text-slate-900">{a.facultyName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">@{a.facultyUsername}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {a.status === "APPROVED" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                  Approved by ADEAN
                                </span>
                              ) : a.status === "PENDING_ADEAN_APPROVAL" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
                                  <Clock size={13} className="text-amber-600 animate-pulse" />
                                  Awaiting ADEAN Approval
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-800">
                                  <AlertTriangle size={13} className="text-rose-600" />
                                  Revision Needed
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {a.createdAt ? a.createdAt.split("T")[0] : "-"}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {a.adeanRemarks || <span className="text-slate-300">No remarks</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setAllocToDelete(a)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 hover:border-rose-300 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                                title={`Delete mentor allocation for ${a.studentName}`}
                              >
                                <Trash2 size={13} className="text-rose-600" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {hodTab === "governance" && (
          /* Governance & Workload Tab */
          <div className="space-y-6">
            {/* Overview Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Approved Mentees
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{approvedCount}</p>
                <span className="text-[11px] font-semibold text-emerald-600">Active in Portals</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Awaiting ADEAN Approval
                </span>
                <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
                <span className="text-[11px] font-semibold text-amber-700">Submitted to Dean</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Active Mentors
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{deptFaculty.length}</p>
                <span className="text-[11px] font-semibold text-slate-500">Department Faculty</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Sessions Conducted
                </span>
                <p className="text-2xl font-black text-[#0B192C] mt-1">{hodOverview?.totalSessions ?? 0}</p>
                <span className="text-[11px] font-semibold text-emerald-600">AY 2026-2027</span>
              </div>
            </div>

            {/* Mentors Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCheck size={18} className="text-[#0B192C]" />
                Faculty Mentor Workload & Distribution
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Faculty Member</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Approved Mentees</th>
                      <th className="py-3 px-4">Pending Approvals</th>
                      <th className="py-3 px-4">Total Load</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No faculty records found.
                        </td>
                      </tr>
                    ) : (
                      deptFaculty.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-800">{f.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{f.username}</td>
                          <td className="py-3 px-4 font-bold text-emerald-700">{f.activeMenteeCount} Mentees</td>
                          <td className="py-3 px-4 font-bold text-amber-700">{f.pendingMenteeCount} Pending</td>
                          <td className="py-3 px-4 font-bold text-[#0B192C]">
                            {f.activeMenteeCount + f.pendingMenteeCount} Students
                          </td>
                          <td className="py-3 px-4">
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              Active Faculty Mentor
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Escalated Requests & Queries (Requirement 1.4) */}
        {hodTab === "escalations" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-rose-600" />
                    Escalated Mentor Change Requests & Queries ({escalatedRequests.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requirement 1.4: Direct HOD escalations from students seeking reassignment or mentor guidance queries
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <RotateCcw size={14} />
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Current Mentor</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Student Queries / Grievance</th>
                      <th className="py-3 px-4">Preferred Notes</th>
                      <th className="py-3 px-4">Escalated On</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {escalatedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="max-w-md mx-auto space-y-2">
                            <CheckCircle2 size={30} className="mx-auto text-emerald-500" />
                            <p className="font-bold text-slate-800">No pending mentor escalations.</p>
                            <p className="text-[11px] text-slate-500">
                              All student queries and mentor change requests have been addressed or resolved.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      escalatedRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{req.studentName}</p>
                            <p className="text-[10px] font-mono text-slate-400">{req.studentRegNo}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800">{req.currentFacultyName || "Assigned Faculty"}</p>
                          </td>
                          <td className="py-3 px-4 font-semibold text-rose-700">{req.reason || req.title}</td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-700" title={req.queriesAboutMentor || req.description}>
                            "{req.queriesAboutMentor || req.description}"
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {req.preferredMentorNotes || <span className="text-slate-300">None specified</span>}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {(req.createdAt || req.escalatedAt) ? (req.createdAt || req.escalatedAt)!.split("T")[0] : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                req.status === "ESCALATED_TO_HOD"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {req.status === "ESCALATED_TO_HOD" ? "Pending HOD" : "Resolved"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {req.status === "ESCALATED_TO_HOD" ? (
                              <button
                                onClick={() => {
                                  setSelectedEscalation(req);
                                  setEscalationAction("REASSIGN");
                                  setReassignFacultyId("");
                                  setHodResolveRemarks("");
                                  setShowResolveModal(true);
                                }}
                                className="px-3 py-1.5 bg-[#0B192C] text-[#D4A72C] rounded-lg font-bold text-[11px] hover:bg-[#1E3E62] transition cursor-pointer shadow-sm"
                              >
                                Reassign / Resolve
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Resolved</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: HOD Assign Mentees & Send for ADEAN Approval */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Assign Mentees & Send for ADEAN Approval
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select a faculty mentor and students to submit for Associate Dean verification.
                  </p>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs flex-1 flex flex-col min-h-0">
                {/* Step 1: Faculty selection */}
                <div>
                  <label className="font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                    1. Select Faculty Mentor
                  </label>
                  <select
                    required
                    value={targetFacultyId}
                    onChange={(e) => setTargetFacultyId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  >
                    <option value="">-- Choose Faculty Member --</option>
                    {deptFaculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.username}) — Currently {f.activeMenteeCount} approved, {f.pendingMenteeCount} pending
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Student multi-select */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-extrabold text-slate-700 uppercase tracking-wider">
                      2. Select Students ({selectedStudentRegs.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllUnassigned}
                        className="text-[11px] font-bold text-[#0B192C] hover:underline cursor-pointer"
                      >
                        Select All Unassigned
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentRegs([])}
                        className="text-[11px] font-bold text-slate-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 flex flex-col min-h-[220px]">
                    <div className="bg-slate-50 p-2.5 border-b border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Department Student Roster</span>
                      <span className="text-[11px] text-slate-400">Total: {eligibleStudents.length} Students</span>
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
                      {eligibleStudents.length === 0 ? (
                        <p className="p-6 text-center text-slate-400">No students found in department {deptKey}.</p>
                      ) : (
                        eligibleStudents.map((s) => {
                          const isChecked = selectedStudentRegs.includes(s.regNo);
                          return (
                            <label
                              key={s.regNo}
                              onClick={() => toggleSelectStudent(s.regNo)}
                              className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition ${isChecked ? "bg-amber-50/70 border border-amber-200" : "hover:bg-slate-50"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                {isChecked ? (
                                  <CheckSquare size={16} className="text-[#0B192C]" />
                                ) : (
                                  <Square size={16} className="text-slate-300" />
                                )}
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {s.name} <span className="font-mono text-slate-400 font-normal">({s.regNo})</span>
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {s.yearLabel} · Sem {s.semester}
                                  </p>
                                </div>
                              </div>
                              <div>
                                {s.allocationStatus === "APPROVED" ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    Mentor: {s.currentFacultyName || "Assigned"}
                                  </span>
                                ) : s.allocationStatus === "PENDING_ADEAN_APPROVAL" ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                    Awaiting Approval
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    Unassigned
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-500">
                    Submitting will set status to <strong>PENDING_ADEAN_APPROVAL</strong>.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={assignSubmitting || selectedStudentRegs.length === 0 || !targetFacultyId}
                      className="px-5 py-2 bg-[#0B192C] text-[#D4A72C] rounded-xl font-bold hover:bg-[#1E3E62] transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Send size={14} />
                      {assignSubmitting ? "Submitting..." : "Assign & Submit to ADEAN"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Automated Mentee Allocation (Requirement 1.1) */}
        {showAutoAllocateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Automated Mentee Allocation</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Requirement 1.1: Load-balanced automated allocation engine</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAutoAllocateModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {autoResult ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>{autoResult.message}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block uppercase font-semibold">Total Allocated</span>
                        <span className="font-extrabold text-slate-900 text-base">{autoResult.totalAllocated} Students</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 block uppercase font-semibold">Faculty Mentors</span>
                        <span className="font-extrabold text-slate-900 text-base">{autoResult.facultyCount} Faculty</span>
                      </div>
                    </div>
                    <div className="p-2.5 bg-emerald-100/70 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between">
                      <span>Batch ID: <strong className="font-mono text-emerald-950 font-bold">{autoResult.batchId}</strong></span>
                      <span className="bg-emerald-200 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[10px]">
                        Forwarded to ADEAN
                      </span>
                    </div>

                    {/* Allocated Pairs Roster Preview */}
                    {autoResult.allocations && autoResult.allocations.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wide">
                          Allocated Cohort Pairs ({autoResult.allocations.length})
                        </span>
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-emerald-200 bg-white divide-y divide-slate-100 text-[11px]">
                          {autoResult.allocations.map((a, i) => {
                            const facName = deptFaculty.find((f) => f.id === a.facultyId)?.name || `Faculty #${a.facultyId}`;
                            const studentName = eligibleStudents.find((s) => s.regNo === a.studentRegNo)?.name || a.studentRegNo;
                            return (
                              <div key={i} className="px-3 py-1.5 flex items-center justify-between">
                                <span className="font-medium text-slate-800 truncate pr-2">
                                  <strong className="font-mono text-slate-900">{a.studentRegNo}</strong> ({studentName})
                                </span>
                                <span className="text-indigo-700 font-bold shrink-0 flex items-center gap-1">
                                  <ArrowRight size={11} className="text-slate-400" />
                                  {facName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAutoAllocateModal(false);
                        setAutoResult(null);
                        setHodTab("allocation");
                      }}
                      className="px-5 py-2.5 bg-[#0B192C] text-[#D4A72C] rounded-xl font-bold hover:bg-[#1E3E62] transition shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck size={14} />
                      View Allocations in Roster
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRunAutoAllocate} className="space-y-4">
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-[11px]">
                      <ShieldCheck size={14} className="text-indigo-700" />
                      Two-Tier Automated Governance
                    </p>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      This algorithm automatically pairs unassigned students in <strong>{deptCode(deptKey)}</strong> with
                      available departmental faculty mentors, balancing the student-to-mentor ratio. All allocations will be
                      batched together and forwarded to the <strong>Associate Dean (ADEAN)</strong> for batch verification.
                    </p>
                  </div>

                  {/* Inline Error Alert */}
                  {autoAllocateError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-800">Allocation Notice</p>
                          <p className="text-rose-700 mt-0.5">{autoAllocateError}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoAllocateError(null)}
                        className="text-rose-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Semester Filter</label>
                    <select
                      value={autoSemFilter}
                      onChange={(e) => {
                        setAutoSemFilter(e.target.value);
                        setAutoAllocateError(null);
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C] bg-white cursor-pointer"
                    >
                      <option value="ALL">All Eligible Semesters (Whole Department)</option>
                      <option value="1">Semester 1 (1st Year)</option>
                      <option value="2">Semester 2 (1st Year)</option>
                      <option value="3">Semester 3 (2nd Year)</option>
                      <option value="4">Semester 4 (2nd Year)</option>
                      <option value="5">Semester 5 (3rd Year)</option>
                      <option value="6">Semester 6 (3rd Year)</option>
                      <option value="7">Semester 7 (4th Year)</option>
                      <option value="8">Semester 8 (4th Year)</option>
                    </select>

                    {/* Filter Status Message */}
                    {unassignedStudents.length > 0 ? (
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 mt-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>
                          {unassignedStudents.length} unassigned student{unassignedStudents.length > 1 ? "s" : ""} available in {autoSemFilter === "ALL" ? "whole department" : `Semester ${autoSemFilter}`}
                        </span>
                      </p>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1 mt-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800">
                          <AlertCircle size={14} />
                          No unassigned students found in {autoSemFilter === "ALL" ? "this department" : `Semester ${autoSemFilter}`}
                        </div>
                        <p className="text-amber-700">
                          {totalStudentsInFilter.length > 0
                            ? `All ${totalStudentsInFilter.length} students in this cohort already have active or pending mentor allocations.`
                            : "No students are enrolled in this semester."}
                        </p>
                        {autoSemFilter !== "ALL" && deptUnassignedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setAutoSemFilter("ALL");
                              setAutoAllocateError(null);
                            }}
                            className="text-indigo-700 font-bold underline hover:text-indigo-900 cursor-pointer block mt-1"
                          >
                            Switch to All Eligible Semesters ({deptUnassignedCount} unassigned available across department)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700 block">Allocation Load-Balancing Strategy</label>
                      <span className="text-[10px] font-semibold text-slate-400">Click a card to switch strategy</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Strategy 1: Balanced Ratio */}
                      <button
                        type="button"
                        onClick={() => {
                          setAutoStrategy("BALANCED");
                          setAutoAllocateError(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                          autoStrategy === "BALANCED"
                            ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                                  autoStrategy === "BALANCED"
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {autoStrategy === "BALANCED" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </span>
                              Balanced Ratio
                            </span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                              Recommended
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed">
                            Distributes students evenly across faculty mentors by prioritizing mentors with the lowest current workload.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                          <span className={`font-bold flex items-center gap-1 ${autoStrategy === "BALANCED" ? "text-indigo-700" : "text-slate-400"}`}>
                            {autoStrategy === "BALANCED" ? <><Check size={12} /> Active Strategy</> : "Click to select"}
                          </span>
                        </div>
                      </button>

                      {/* Strategy 2: Round Robin */}
                      <button
                        type="button"
                        onClick={() => {
                          setAutoStrategy("ROUND_ROBIN");
                          setAutoAllocateError(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between relative ${
                          autoStrategy === "ROUND_ROBIN"
                            ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                                  autoStrategy === "ROUND_ROBIN"
                                    ? "border-indigo-600 bg-indigo-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {autoStrategy === "ROUND_ROBIN" && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                              </span>
                              Round Robin
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.5 rounded">
                              Sequential
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-600 leading-relaxed">
                            Sequentially assigns students in cohort roll order 1-by-1 across the departmental faculty roster cyclically.
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                          <span className={`font-bold flex items-center gap-1 ${autoStrategy === "ROUND_ROBIN" ? "text-indigo-700" : "text-slate-400"}`}>
                            {autoStrategy === "ROUND_ROBIN" ? <><Check size={12} /> Active Strategy</> : "Click to select"}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Dynamic Simulation Preview */}
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                        <Sliders size={13} className="text-indigo-600" />
                        Live Allocation Simulation ({autoStrategy === "BALANCED" ? "Balanced Ratio Mode" : "Round Robin Mode"})
                      </span>
                      <span className="text-[10px] text-indigo-700 bg-indigo-100/90 font-bold px-2 py-0.5 rounded-full">
                        {unassignedStudents.length > 0
                          ? `~${(unassignedStudents.length / Math.max(1, deptFaculty.length)).toFixed(1)} mentees/faculty`
                          : "0 to distribute"}
                      </span>
                    </div>

                    {deptFaculty.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-2">
                        No faculty mentors found for department {deptCode(deptKey)}.
                      </p>
                    ) : unassignedStudents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-2">
                        Select a semester with unassigned students to preview the distribution simulation.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {strategySimulation.map((fac) => (
                          <div
                            key={fac.facultyId}
                            className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between text-[11px] transition-all"
                          >
                            <div className="truncate pr-2">
                              <p className="font-bold text-slate-900 truncate">{fac.facultyName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">@{fac.facultyUsername} · Current: {fac.currentLoad}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[10px] transition-all ${
                                  fac.newAllocations > 0
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                +{fac.newAllocations} new
                              </span>
                              <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                                Total: {fac.currentLoad + fac.newAllocations}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 italic">
                      * Toggle between Balanced Ratio and Round Robin above to compare simulated distribution loads in real time.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAutoAllocateModal(false)}
                      className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={autoAllocating || unassignedStudents.length === 0 || deptFaculty.length === 0}
                      title={unassignedStudents.length === 0 ? "No unassigned students available to allocate" : undefined}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-700 to-blue-700 text-white rounded-xl font-bold hover:from-indigo-800 hover:to-blue-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow"
                    >
                      <Sparkles size={14} className={autoAllocating ? "animate-spin" : ""} />
                      {autoAllocating
                        ? "Executing Auto-Allocation..."
                        : unassignedStudents.length > 0
                        ? `Execute Automated Allocation (${unassignedStudents.length} Students)`
                        : "No Unassigned Students"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: Resolve Mentor Change / Escalation Request (Requirement 1.4) */}
        {showResolveModal && selectedEscalation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600" />
                    Resolve Escalated Mentor Request
                  </h3>
                  <p className="text-slate-500 text-[11px]">Requirement 1.4: HOD Mentor Reassignment & Grievance Resolution</p>
                </div>
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student and Query Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>
                    Student: {selectedEscalation.studentName} ({selectedEscalation.studentRegNo})
                  </span>
                  <span className="text-rose-700 font-semibold">{selectedEscalation.reason || selectedEscalation.title}</span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  <strong>Current Mentor:</strong> {selectedEscalation.currentFacultyName || "Assigned Faculty"}
                </p>
                <p className="text-slate-700 text-[11px] italic bg-white p-2 rounded border border-slate-200 mt-1">
                  "{selectedEscalation.queriesAboutMentor || selectedEscalation.description}"
                </p>
                {selectedEscalation.preferredMentorNotes && (
                  <p className="text-slate-500 text-[10px]">
                    <strong>Student's Preference Note:</strong> {selectedEscalation.preferredMentorNotes}
                  </p>
                )}
              </div>

              <form onSubmit={handleResolveEscalationSubmit} className="space-y-3.5">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Resolution Action *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                        escalationAction === "REASSIGN" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => setEscalationAction("REASSIGN")}
                    >
                      <input
                        type="radio"
                        checked={escalationAction === "REASSIGN"}
                        onChange={() => setEscalationAction("REASSIGN")}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Reassign Mentor</span>
                        <span className="text-[10px] text-slate-500">Allocate a new faculty mentor</span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center gap-2 ${
                        escalationAction === "RETAIN" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => setEscalationAction("RETAIN")}
                    >
                      <input
                        type="radio"
                        checked={escalationAction === "RETAIN"}
                        onChange={() => setEscalationAction("RETAIN")}
                        className="text-indigo-600"
                      />
                      <div>
                        <span className="font-bold text-slate-800 block">Counsel & Retain</span>
                        <span className="text-[10px] text-slate-500">Provide counseling remarks</span>
                      </div>
                    </label>
                  </div>
                </div>

                {escalationAction === "REASSIGN" && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Select New Faculty Mentor *</label>
                    <select
                      required
                      value={reassignFacultyId}
                      onChange={(e) => setReassignFacultyId(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                    >
                      <option value="">-- Choose New Faculty Mentor --</option>
                      {deptFaculty.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.username}) — Currently {f.activeMenteeCount} mentees
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">HOD Resolution Remarks & Feedback *</label>
                  <textarea
                    required
                    rows={3}
                    value={hodResolveRemarks}
                    onChange={(e) => setHodResolveRemarks(e.target.value)}
                    placeholder="Provide counseling advice or reason for reassignment to record in student file..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(false)}
                    className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resolvingEscalation || (escalationAction === "REASSIGN" && !reassignFacultyId)}
                    className="px-5 py-2 bg-[#0B192C] text-[#D4A72C] rounded-xl font-bold hover:bg-[#1E3E62] transition disabled:opacity-50 cursor-pointer"
                  >
                    {resolvingEscalation ? "Processing..." : "Complete & Resolve"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Single Mentor Allocation Deletion */}
        {allocToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Delete Mentor Allocation</h3>
                    <p className="text-[11px] text-slate-500">Unassign student & dissolve mentorship</p>
                  </div>
                </div>
                <button
                  onClick={() => setAllocToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this mentor allocation? The student will be unassigned and immediately returned to the eligible student roster.
              </p>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Student:</span>
                  <span className="font-bold text-slate-900">{allocToDelete.studentName} ({allocToDelete.studentRegNo})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Semester:</span>
                  <span className="font-bold text-slate-800">Sem {allocToDelete.semester}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Assigned Mentor:</span>
                  <span className="font-bold text-slate-900">{allocToDelete.facultyName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Current Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    allocToDelete.status === "APPROVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : allocToDelete.status === "PENDING_ADEAN_APPROVAL"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {allocToDelete.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAllocToDelete(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteSingle}
                  className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition disabled:opacity-50 text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 size={14} />
                  {deleteSubmitting ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Bulk / Header Mentor Allocation Deletion */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 text-rose-600">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Delete Mentor Allocation</h3>
                    <p className="text-[11px] text-slate-500">Unassign and remove mentor-mentee pairing</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {selectedHodAllocIds.length > 0 ? (
                <>
                  <p className="text-xs text-slate-600">
                    Are you sure you want to delete the following <strong className="text-rose-600 font-bold">{selectedHodAllocIds.length}</strong> mentor allocation(s)?
                    These students will be removed from their assigned mentors and returned to the unassigned eligible roster.
                  </p>
                  <div className="flex-1 overflow-y-auto max-h-60 border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {hodAllocations
                      .filter((a) => selectedHodAllocIds.includes(a.id))
                      .map((a) => (
                        <div key={a.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-900">{a.studentName}</span>
                            <span className="text-slate-400 font-mono ml-2">({a.studentRegNo})</span>
                            <p className="text-[11px] text-slate-500">Mentor: {a.facultyName} • Sem {a.semester}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : a.status === "PENDING_ADEAN_APPROVAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteSubmitting}
                      onClick={handleDeleteSelected}
                      className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition disabled:opacity-50 text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Trash2 size={14} />
                      {deleteSubmitting ? "Deleting..." : `Delete ${selectedHodAllocIds.length} Allocation(s)`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-600">
                    Select an allocated student below to delete their mentor allocation, or select multiple checkboxes in the allocations table.
                  </p>
                  <div className="flex-1 overflow-y-auto max-h-60 border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {hodAllocations.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">No active mentor allocations found to delete.</div>
                    ) : (
                      hodAllocations.map((a) => (
                        <div key={a.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-900">{a.studentName}</span>
                            <span className="text-slate-400 font-mono ml-2">({a.studentRegNo})</span>
                            <p className="text-[11px] text-slate-500">Mentor: {a.facultyName} • Sem {a.semester}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBulkDeleteModal(false);
                              setAllocToDelete(a);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold text-[11px] cursor-pointer"
                          >
                            <Trash2 size={12} className="text-rose-600" />
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 4. ASSOCIATE DEAN (ADEAN) & ADMIN VIEW ────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Associate Dean Mentoring Governance & Approvals</h2>
          <p className="text-xs text-slate-500">
            Institutional verification of HOD mentee allocations, approval workflow, and university ratio benchmarks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingAllocations.length > 0 && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-2">
              <Clock size={14} className="animate-pulse" />
              {pendingAllocations.length} Pending Approval
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setDeanTab("approvals")}
          className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${deanTab === "approvals"
              ? "border-[#0B192C] text-[#0B192C]"
              : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          <ShieldCheck size={16} />
          <span>ADEAN Approval Queue ({pendingAllocations.length})</span>
        </button>
        <button
          onClick={() => setDeanTab("overview")}
          className={`pb-3 transition border-b-2 flex items-center gap-2 cursor-pointer ${deanTab === "overview"
              ? "border-[#0B192C] text-[#0B192C]"
              : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
        >
          <Users size={16} />
          <span>Institutional Metrics & Departments</span>
        </button>
      </div>

      {deanTab === "approvals" ? (
        <div className="space-y-4">
          {/* Sub-tab view toggle: Batch-wise Approval (Req 1.2) vs Individual Allocations */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit text-xs font-bold">
              <button
                type="button"
                onClick={() => setApprovalViewMode("batch")}
                className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 ${
                  approvalViewMode === "batch"
                    ? "bg-white text-[#0B192C] shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users size={14} className={approvalViewMode === "batch" ? "text-indigo-600" : ""} />
                <span>Batch-wise Mentee Approval ({pendingBatches.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovalViewMode("individual")}
                className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 ${
                  approvalViewMode === "individual"
                    ? "bg-white text-[#0B192C] shadow-sm font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserCheck size={14} />
                <span>Individual Student Queue ({pendingAllocations.length})</span>
              </button>
            </div>

            <select
              value={deanDeptFilter}
              onChange={(e) => setDeanDeptFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-700 text-xs self-start sm:self-auto"
            >
              <DepartmentOptions allValue="ALL" />
            </select>
          </div>

          {/* 1. Batch-wise Approval View (Requirement 1.2) */}
          {approvalViewMode === "batch" && (
            <div className="space-y-4">
              {pendingBatches.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                  <h4 className="font-bold text-slate-800 text-base">All Allocation Batches Approved</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are no pending mentee cohorts awaiting batch-wise Associate Dean approval. All approved students are
                    fully synchronized in their respective mentors' dashboards.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingBatches.map((b) => (
                    <div
                      key={b.batchId}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {b.batchId}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase border border-indigo-200">
                              {b.deptKey}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            Academic Year: {b.academicYear} · Submitted by <strong className="text-slate-700">{b.assignedBy}</strong>
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs">
                          {b.studentCount} Students
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between text-slate-600">
                        <span>Created on: {b.createdAt ? b.createdAt.split("T")[0] : "Recent"}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedBatchDetails(b)}
                          className="font-bold text-[#0B192C] hover:text-[#D4A72C] transition underline cursor-pointer"
                        >
                          View Students ({b.allocations?.length || b.studentCount})
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => openBatchRejectModal(b.batchId)}
                          disabled={reviewSubmitting}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 font-bold text-xs hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                        >
                          Return Batch
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchApprove(b.batchId)}
                          disabled={reviewSubmitting}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          Approve Entire Batch
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Individual Allocations Table View */}
          {approvalViewMode === "individual" && (
            <div className="space-y-4">
              {/* Actions & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={
                        pendingAllocations.length > 0 && selectedPendingIds.length === pendingAllocations.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPendingIds(pendingAllocations.map((p) => p.id));
                        } else {
                          setSelectedPendingIds([]);
                        }
                      }}
                      className="rounded text-[#0B192C]"
                    />
                    <span>Select All ({selectedPendingIds.length} of {pendingAllocations.length})</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApproveSelected}
                    disabled={reviewSubmitting || selectedPendingIds.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition shadow disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Check size={15} />
                    Approve Selected ({selectedPendingIds.length})
                  </button>
                  <button
                    onClick={() => openRejectModal(selectedPendingIds)}
                    disabled={reviewSubmitting || selectedPendingIds.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-300 text-rose-700 font-bold text-xs hover:bg-rose-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X size={15} />
                    Reject / Request Revision
                  </button>
                </div>
              </div>

              {/* Pending Allocations Table */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 w-10">Select</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Semester</th>
                        <th className="py-3 px-4">Assigned Faculty Mentor</th>
                        <th className="py-3 px-4">Submitted By</th>
                        <th className="py-3 px-4 text-right">ADEAN Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingAllocations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <div className="max-w-md mx-auto space-y-2">
                              <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                              <p className="font-bold text-slate-800 text-sm">All mentee allocations verified!</p>
                              <p className="text-[11px] text-slate-500">
                                There are currently no mentee allocations awaiting Associate Dean approval. All approved
                                students are actively populated in the faculty and student portals.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        pendingAllocations.map((p) => {
                          const isSelected = selectedPendingIds.includes(p.id);
                          return (
                            <tr key={p.id} className={`transition ${isSelected ? "bg-amber-50/50" : "hover:bg-slate-50/80"}`}>
                              <td className="py-3 px-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPendingIds([...selectedPendingIds, p.id]);
                                    } else {
                                      setSelectedPendingIds(selectedPendingIds.filter((id) => id !== p.id));
                                    }
                                  }}
                                  className="rounded text-[#0B192C]"
                                />
                              </td>
                              <td className="py-3 px-4 font-bold uppercase text-[#0B192C]">{p.deptKey}</td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{p.studentName}</p>
                                <p className="text-[10px] font-mono text-slate-400">{p.studentRegNo}</p>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-700">Sem {p.semester}</td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{p.facultyName}</p>
                                <p className="text-[10px] font-mono text-slate-400">@{p.facultyUsername}</p>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <span className="font-mono font-bold text-slate-700">{p.assignedBy}</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleApproveSingle(p.id)}
                                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm cursor-pointer"
                                  >
                                    <Check size={12} />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => openRejectModal([p.id])}
                                    className="px-2.5 py-1 border border-rose-300 text-rose-700 rounded-lg font-bold text-[11px] hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Institutional Overview Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Students</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{collegeOverview?.totalStudents ?? 0}</p>
              <span className="text-[11px] font-semibold text-slate-500">Enrolled Undergraduate</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved Allocated</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{collegeOverview?.totalAllocated ?? 0}</p>
              <span className="text-[11px] font-semibold text-emerald-700">Active Mentees</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending ADEAN Approvals</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendingAllocations.length}</p>
              <span className="text-[11px] font-semibold text-amber-700">Awaiting Verification</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Mentors</span>
              <p className="text-2xl font-black text-[#0B192C] mt-1">{collegeOverview?.totalMentors ?? 0}</p>
              <span className="text-[11px] font-semibold text-slate-500">Faculty Across Colleges</span>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-[#0B192C]" />
              Department-Wise Allocation & Verification Benchmark
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Approved Mentees</th>
                    <th className="py-3 px-4">Active Mentors</th>
                    <th className="py-3 px-4">Sessions Conducted</th>
                    <th className="py-3 px-4">Pending Approvals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(collegeOverview?.departmentBreakdown || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No department breakdown available.
                      </td>
                    </tr>
                  ) : (
                    (collegeOverview?.departmentBreakdown || []).map((d) => (
                      <tr key={d.deptKey} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-bold uppercase text-[#0B192C]">{d.deptKey}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{d.totalMentees} Students</td>
                        <td className="py-3 px-4">{d.totalMentors} Faculty</td>
                        <td className="py-3 px-4">{d.totalSessions} Sessions</td>
                        <td className="py-3 px-4">
                          {d.pendingApprovals && d.pendingApprovals > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                              {d.pendingApprovals} Pending
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              All Verified
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ADEAN Reject / Request Revision */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Return Allocations for Revision</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-slate-600">
              You are returning {targetRejectIds.length} mentee allocation(s) back to the department HOD for revision.
            </p>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Associate Dean Remarks & Feedback</label>
              <textarea
                rows={3}
                required
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="e.g. Please rebalance mentee ratio across senior faculty; student cohort has conflict..."
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={reviewSubmitting || !rejectRemarks.trim()}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {reviewSubmitting ? "Returning..." : "Return to HOD"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Batch Students (Requirement 1.2) */}
      {selectedBatchDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">Batch Cohort Details</h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                    {selectedBatchDetails.batchId}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Dept: {deptCode(selectedBatchDetails.deptKey)} · AY {selectedBatchDetails.academicYear} · {selectedBatchDetails.studentCount} Mentees
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Semester</th>
                    <th className="py-2.5 px-3">Assigned Faculty Mentor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBatchDetails.allocations?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0B192C]">{item.studentRegNo}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{item.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-600">Sem {item.semester}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.facultyName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBatchDetails(null)}
                className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const bId = selectedBatchDetails.batchId;
                    setSelectedBatchDetails(null);
                    openBatchRejectModal(bId);
                  }}
                  className="px-3.5 py-2 border border-rose-300 text-rose-700 rounded-xl font-bold hover:bg-rose-50 cursor-pointer"
                >
                  Return Batch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const bId = selectedBatchDetails.batchId;
                    setSelectedBatchDetails(null);
                    handleBatchApprove(bId);
                  }}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Check size={14} />
                  Approve Entire Batch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ADEAN Reject Entire Batch (Requirement 1.2) */}
      {showBatchRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Return Batch Cohort for Revision</h3>
              <button onClick={() => setShowBatchRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-slate-600">
              You are returning Batch <strong className="font-mono text-slate-900">{targetBatchId}</strong> back to the department HOD for re-allocation.
            </p>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Associate Dean Remarks & Feedback *</label>
              <textarea
                rows={3}
                required
                value={batchRejectRemarks}
                onChange={(e) => setBatchRejectRemarks(e.target.value)}
                placeholder="e.g. Please rebalance mentee ratio across senior faculty; student cohort has conflict..."
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowBatchRejectModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchReject}
                disabled={reviewSubmitting || !batchRejectRemarks.trim()}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {reviewSubmitting ? "Returning Batch..." : "Return Batch to HOD"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
