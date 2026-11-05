import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  Paperclip,
  X,
  Search,
  Users,
  Eye,
  Check,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  CheckSquare,
  MessageSquare,
  Inbox,
  Lock,
  Pencil,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { apiClient, adminAuthApi } from "../services/api";

export type CircularPriority = "NORMAL" | "HIGH" | "URGENT";
export type CircularCategory = "ACADEMIC" | "EXAMINATION" | "ADMINISTRATIVE" | "EVENTS" | "GENERAL";
export type CircularTargetAudience = "HOD" | "FACULTY" | "COE" | "STUDENTS";
export type CircularStatus = "PUBLISHED" | "PENDING_DEAN_APPROVAL" | "APPROVED_BY_DEAN" | "REJECTED" | "DRAFT" | "SCHEDULED" | "DELETED";
export type HodRoutingOption = "SINGLE_DEPT" | "SELECTED_DEPTS" | "ALL_DEPTS";

export interface CircularAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface Circular {
  id: string;
  refNo: string;
  subject: string;
  message: string;
  attachment?: CircularAttachment | null;
  attachments?: CircularAttachment[];
  category: CircularCategory;
  priority: CircularPriority;
  status: CircularStatus;
  targetAudiences: CircularTargetAudience[];
  requiresDeanApproval?: boolean;
  submissionNotes?: string;
  approvalRemarks?: string;
  approvedBy?: {
    id: string;
    name: string;
    role: string;
    approvedAt?: string;
  } | null;
  approvedAt?: string | null;
  createdBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  routingOption: HodRoutingOption;
  targetDepartmentKeys: string[];
  targetDepartmentNames: string[];
  targetFacultyIds?: string[];
  targetFacultyNames?: string[];
  hodActions: Record<string, any>;
  seenByCoe?: boolean;
  seenAt?: string | null;
  coeReply?: string | null;
  coeReplyAt?: string | null;
  scheduledFor?: string | null;
  deletedBy?: {
    id: string;
    name: string;
    role: string;
  } | null;
  deletedAt?: string | null;
}

export interface DepartmentOption {
  key: string;
  name: string;
  code: string;
  hodName: string;
}

export interface FacultyOption {
  id: string | number;
  title?: string;
  name: string;
  designation?: string;
  deptKey: string;
  deptName?: string;
  staffId?: string;
  email?: string;
}

const DEFAULT_DEPTS: DepartmentOption[] = [
  { key: "cse", code: "CSE", name: "Computer Science & Engineering", hodName: "Dr. K. Rajesh" },
  { key: "aids", code: "AIDS", name: "Artificial Intelligence & Data Science", hodName: "Dr. P. Suresh" },
  { key: "ece", code: "ECE", name: "Electronics & Communication Engineering", hodName: "Dr. M. Sangeetha" },
  { key: "eee", code: "EEE", name: "Electrical & Electronics Engineering", hodName: "Dr. A. Saravanan" },
  { key: "mech", code: "MECH", name: "Mechanical Engineering", hodName: "Dr. R. Anand" },
  { key: "bme", code: "BME", name: "Biomedical Engineering", hodName: "Dr. V. Deepa" },
  { key: "bt", code: "BT", name: "Biotechnology", hodName: "Dr. S. Karthik" },
  { key: "civil", code: "CIVIL", name: "Civil Engineering", hodName: "Dr. T. Murugan" },
];

const getCircularSegmentConfig = (key: string, isSelected: boolean) => {
  switch (key) {
    case "ALL":
    case "ACTIVE":
      return {
        icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
        buttonClass: isSelected
          ? "bg-[#0B192C] text-[#D4A72C] border-[#0B192C] shadow-sm shadow-[#0B192C]/25 ring-2 ring-[#D4A72C]/30 font-black"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-[#D4A72C] text-[#0B192C] font-black"
          : "bg-slate-100 text-slate-700 font-bold",
      };
    case "PENDING":
    case "PENDING_HOD":
      return {
        icon: <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-200" : "text-amber-600"}`} />,
        buttonClass: isSelected
          ? "bg-amber-600 text-white border-amber-700 shadow-sm shadow-amber-600/30 ring-2 ring-amber-400/40 font-black"
          : "bg-amber-50/70 text-amber-900 border-amber-200/90 hover:bg-amber-100/80 hover:border-amber-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-amber-950 text-amber-200 font-black"
          : "bg-amber-200/90 text-amber-900 font-bold",
      };
    case "APPROVED":
      return {
        icon: <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-200" : "text-indigo-600"}`} />,
        buttonClass: isSelected
          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-400/40 font-black"
          : "bg-indigo-50/70 text-indigo-900 border-indigo-200/90 hover:bg-indigo-100/80 hover:border-indigo-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-indigo-950 text-indigo-200 font-black"
          : "bg-indigo-200/90 text-indigo-900 font-bold",
      };
    case "PUBLISHED":
      return {
        icon: <Send className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-200" : "text-emerald-600"}`} />,
        buttonClass: isSelected
          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-400/40 font-black"
          : "bg-emerald-50/70 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100/80 hover:border-emerald-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-emerald-950 text-emerald-200 font-black"
          : "bg-emerald-200/90 text-emerald-900 font-bold",
      };
    case "DELETED":
      return {
        icon: <Trash2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-rose-200" : "text-rose-600"}`} />,
        buttonClass: isSelected
          ? "bg-rose-900 text-white border-rose-950 shadow-sm shadow-rose-900/35 ring-2 ring-rose-500/40 font-black"
          : "bg-rose-50/70 text-rose-800 border-rose-200/80 hover:bg-rose-100/80 hover:border-rose-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-rose-200 text-rose-950 font-black"
          : "bg-rose-200/80 text-rose-800 font-bold",
      };
    default:
      return {
        icon: <Inbox className="w-3.5 h-3.5 shrink-0" />,
        buttonClass: isSelected
          ? "bg-slate-900 text-white border-slate-900 shadow-sm font-black"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-slate-700 text-white font-black"
          : "bg-slate-200 text-slate-700 font-bold",
      };
  }
};

export const CircularsPage: React.FC = () => {
  const currentUser = adminAuthApi.getCurrentUser();
  const coeName = currentUser?.name || currentUser?.username || "Controller of Examinations";

  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>(DEFAULT_DEPTS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "myCirculars" | "deanDirectives">("compose");

  // Form State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<CircularCategory>("EXAMINATION");
  const [priority, setPriority] = useState<CircularPriority>("HIGH");
  const [targetAudiences, setTargetAudiences] = useState<CircularTargetAudience[]>(["HOD"]);
  const [routingOption, setRoutingOption] = useState<HodRoutingOption>("ALL_DEPTS");
  const [singleDeptKey, setSingleDeptKey] = useState<string>("cse");
  const [selectedDeptKeys, setSelectedDeptKeys] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<CircularAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Specific Faculty Targeting State
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [facultyTargetMode, setFacultyTargetMode] = useState<"ALL_DEPT_FACULTY" | "SPECIFIC_FACULTY">("ALL_DEPT_FACULTY");
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState("");

  // Approval Options (2-Pathway Governance Matrix)
  const [approvalMode, setApprovalMode] = useState<"REQUIRE_APPROVAL" | "DIRECT_DISPATCH">("REQUIRE_APPROVAL");
  const [copyDeanFyi, setCopyDeanFyi] = useState<boolean>(false);
  const [requiresDeanApproval, setRequiresDeanApproval] = useState<boolean>(true);
  const [submissionNotes, setSubmissionNotes] = useState<string>("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [coeFilterSegment, setCoeFilterSegment] = useState<"ALL" | "PENDING" | "APPROVED" | "PUBLISHED" | "DELETED">("ALL");
  const [directiveFilterSegment, setDirectiveFilterSegment] = useState<"ALL" | "ACTIVE" | "DELETED">("ALL");
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);

  // COE Reply state to Dean
  const [coeReplyInput, setCoeReplyInput] = useState<string>("");
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  // COE Edit Circular state
  const [editingCircular, setEditingCircular] = useState<Circular | null>(null);
  const [editSubject, setEditSubject] = useState<string>("");
  const [editMessage, setEditMessage] = useState<string>("");
  const [editCategory, setEditCategory] = useState<CircularCategory>("EXAMINATION");
  const [editPriority, setEditPriority] = useState<CircularPriority>("HIGH");
  const [editSubmissionNotes, setEditSubmissionNotes] = useState<string>("");
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open Dean Directive with Auto-Ack
  const handleOpenDeanDirective = async (circ: Circular) => {
    setSelectedCircular(circ);
    setCoeReplyInput(circ.coeReply || "");
    if (!circ.seenByCoe) {
      try {
        await apiClient.post(`/circulars/${circ.id}/ack`);
        const nowIso = new Date().toISOString();
        circ.seenByCoe = true;
        circ.seenAt = nowIso;
        setCirculars((prev) =>
          prev.map((c) => (c.id === circ.id ? { ...c, seenByCoe: true, seenAt: nowIso } : c))
        );
      } catch (e) {
        console.error("Failed to mark directive as seen", e);
      }
    }
  };

  // COE Reply Submit
  const handleSendReply = async () => {
    if (!selectedCircular || !coeReplyInput.trim()) return;
    try {
      setSubmittingReply(true);
      await apiClient.post(`/circulars/${selectedCircular.id}/reply`, {
        reply: coeReplyInput.trim(),
      });
      const nowIso = new Date().toISOString();
      selectedCircular.coeReply = coeReplyInput.trim();
      selectedCircular.coeReplyAt = nowIso;
      setCirculars((prev) =>
        prev.map((c) =>
          c.id === selectedCircular.id
            ? { ...c, coeReply: coeReplyInput.trim(), coeReplyAt: nowIso }
            : c
        )
      );
      alert("Official reply transmitted to Associate Dean successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to submit reply to Associate Dean.");
    } finally {
      setSubmittingReply(false);
    }
  };

  // Edit Circular Handlers
  const openEditModal = (circ: Circular) => {
    setEditingCircular(circ);
    setEditSubject(circ.subject || "");
    setEditMessage(circ.message || "");
    setEditCategory(circ.category || "EXAMINATION");
    setEditPriority(circ.priority || "HIGH");
    setEditSubmissionNotes(circ.submissionNotes || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCircular) return;
    if (!editSubject.trim() || !editMessage.trim()) {
      alert("Please enter both Subject and Message content.");
      return;
    }

    try {
      setEditSubmitting(true);
      const payload = {
        subject: editSubject.trim(),
        message: editMessage.trim(),
        category: editCategory,
        priority: editPriority,
        submissionNotes: editSubmissionNotes.trim() || undefined,
      };

      await apiClient.put(`/circulars/${editingCircular.id}`, payload);
      alert("Circular updated successfully!");
      setEditingCircular(null);
      await loadCirculars();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to update circular.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Forward Modal State
  const [forwardingCircular, setForwardingCircular] = useState<Circular | null>(null);
  const [forwardRoutingOption, setForwardRoutingOption] = useState<HodRoutingOption>("ALL_DEPTS");
  const [forwardSingleDeptKey, setForwardSingleDeptKey] = useState<string>("cse");
  const [forwardSelectedDeptKeys, setForwardSelectedDeptKeys] = useState<string[]>([]);
  const [forwardAudiences, setForwardAudiences] = useState<CircularTargetAudience[]>(["HOD"]);
  const [forwardFacultyMode, setForwardFacultyMode] = useState<"ALL_DEPT_FACULTY" | "SPECIFIC_FACULTY">("ALL_DEPT_FACULTY");
  const [forwardSelectedFacultyIds, setForwardSelectedFacultyIds] = useState<string[]>([]);
  const [forwardFacultySearch, setForwardFacultySearch] = useState("");
  const [forwardSubmitting, setForwardSubmitting] = useState(false);

  const openForwardModal = (circ: Circular) => {
    setForwardingCircular(circ);
    setForwardRoutingOption(circ.routingOption || "ALL_DEPTS");
    setForwardSingleDeptKey(circ.targetDepartmentKeys?.[0] || departments[0]?.key || "cse");
    setForwardSelectedDeptKeys(circ.targetDepartmentKeys || []);
    setForwardAudiences(["HOD"]);
    setForwardSelectedFacultyIds([]);
    setForwardFacultyMode("ALL_DEPT_FACULTY");
  };

  const handleReuseCircular = (circ: Circular) => {
    setSubject(circ.subject || "");
    setMessage(circ.message || "");
    setCategory(circ.category || "EXAMINATION");
    setPriority(circ.priority || "HIGH");
    setSubmissionNotes(circ.submissionNotes || "");
    setRequiresDeanApproval(true);
    setActiveTab("compose");
  };

  const handleForwardSubmit = async () => {
    if (!forwardingCircular) return;

    let targetKeys: string[] = [];
    let targetNames: string[] = [];

    if (forwardRoutingOption === "ALL_DEPTS") {
      targetKeys = departments.map((d) => d.key);
      targetNames = departments.map((d) => d.name);
    } else if (forwardRoutingOption === "SINGLE_DEPT") {
      const match = departments.find((d) => d.key === forwardSingleDeptKey) || departments[0];
      if (match) {
        targetKeys = [match.key];
        targetNames = [match.name];
      }
    } else {
      if (forwardSelectedDeptKeys.length === 0) {
        alert("Please select at least one department.");
        return;
      }
      targetKeys = forwardSelectedDeptKeys;
      targetNames = departments
        .filter((d) => forwardSelectedDeptKeys.includes(d.key))
        .map((d) => d.name);
    }

    try {
      setForwardSubmitting(true);
      const targetFacultyNames = faculties
        .filter((f) => forwardSelectedFacultyIds.includes(String(f.id)))
        .map((f) => `${f.title ? f.title + " " : ""}${f.name}`);

      const payload = {
        routingOption: forwardRoutingOption,
        targetDepartmentKeys: targetKeys,
        targetDepartmentNames: targetNames,
        targetFacultyIds: [],
        targetFacultyNames: [],
        targetAudiences: ["HOD"],
      };

      await apiClient.post(`/circulars/${forwardingCircular.id}/forward`, payload);
      alert("Circular successfully forwarded and broadcast to target Department HODs!");
      setForwardingCircular(null);
      await loadCirculars();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to forward circular.");
    } finally {
      setForwardSubmitting(false);
    }
  };

  const loadCirculars = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any[]>("/circulars");
      if (res.data && Array.isArray(res.data)) {
        const mapped: Circular[] = res.data.map((c) => {
          const rawAtts = Array.isArray(c.attachments) && c.attachments.length > 0
            ? c.attachments
            : c.attachment ? [c.attachment] : [];
          return {
            id: String(c.id),
            refNo: c.refNo,
            subject: c.subject,
            message: c.message,
            category: c.category || "EXAMINATION",
            priority: c.priority || "NORMAL",
            status: (c.status as CircularStatus) || "PUBLISHED",
            targetAudiences: (c.targetAudiences as CircularTargetAudience[]) || ["HOD"],
            requiresDeanApproval: Boolean(c.requiresDeanApproval),
            submissionNotes: c.submissionNotes || undefined,
            approvalRemarks: c.approvalRemarks || undefined,
            approvedBy: c.approvedBy || null,
            approvedAt: c.approvedAt || null,
            attachment: c.attachment || rawAtts[0] || null,
            attachments: rawAtts,
            createdBy: {
              id: String(c.createdBy?.id || "COE-01"),
              name: c.createdBy?.name || "COE",
              role: c.createdBy?.role || "COE",
            },
            createdAt: c.createdAt,
            routingOption: c.routingOption || "ALL_DEPTS",
            targetDepartmentKeys: c.targetDepartmentKeys || [],
            targetDepartmentNames: c.targetDepartmentNames || [],
            targetFacultyIds: c.targetFacultyIds || [],
            targetFacultyNames: c.targetFacultyNames || [],
            hodActions: c.hodActions || {},
            seenByCoe: Boolean(c.seenByCoe || c.seen_by_coe),
            seenAt: c.seenAt || c.seen_at || null,
            coeReply: c.coeReply || c.coe_reply || null,
            coeReplyAt: c.coeReplyAt || c.coe_reply_at || null,
            scheduledFor: c.scheduledFor || c.scheduled_for || null,
            deletedBy: c.deletedBy || c.deleted_by || null,
            deletedAt: c.deletedAt || c.deleted_at || null,
          };
        });
        setCirculars(mapped);
      }
    } catch (e) {
      console.error("Failed to load circulars", e);
    } finally {
      setLoading(false);
    }
  };

  const loadFaculties = async (deptKey?: string) => {
    try {
      setLoadingFaculties(true);
      const url = deptKey && deptKey !== "ALL"
        ? `/circulars/faculties?deptKey=${encodeURIComponent(deptKey)}`
        : "/circulars/faculties";
      const res = await apiClient.get<any[]>(url);
      if (res.data && Array.isArray(res.data)) {
        setFaculties(
          res.data.map((f) => ({
            id: String(f.id),
            title: f.title || "Dr.",
            name: f.name,
            designation: f.designation || "Faculty",
            deptKey: f.deptKey || f.dept_key,
            deptName: f.deptName || f.dept_name,
            staffId: f.staffId || f.staff_id,
            email: f.email || "",
          }))
        );
      }
    } catch {
      setFaculties([]);
    } finally {
      setLoadingFaculties(false);
    }
  };

  const loadDepartments = async () => {
    try {
      let res: any = null;
      try {
        res = await apiClient.get<any[]>("/admin/departments");
      } catch {
        res = await apiClient.get<any[]>("/circulars/departments");
      }
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setDepartments(
          res.data.map((d: any) => ({
            key: d.key || d.deptKey || d.dept_key || d.code?.toLowerCase(),
            name: d.name,
            code: d.code || (d.key || "").toUpperCase(),
            hodName: d.headName || d.hodName || "Head of Department",
          }))
        );
      }
    } catch {
      // Retain fallback
    }
  };

  useEffect(() => {
    void loadCirculars();
    void loadDepartments();
    void loadFaculties();

    const interval = setInterval(() => {
      void loadCirculars();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMultipleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newAttachments: CircularAttachment[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newAttachments.push({
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          dataUrl: reader.result as string,
        });
        loadedCount++;
        if (loadedCount === fileList.length) {
          setAttachments((prev) => [...prev, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDeptSelection = (key: string) => {
    setSelectedDeptKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleTargetAudience = (audience: CircularTargetAudience, checked: boolean) => {
    setTargetAudiences((prev) => {
      if (checked) {
        return prev.includes(audience) ? prev : [...prev, audience];
      } else {
        const next = prev.filter((a) => a !== audience);
        return next.length === 0 ? ["HOD"] : next;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      alert("Please enter a circular subject.");
      return;
    }
    if (!message.trim()) {
      alert("Please enter the memorandum content.");
      return;
    }

    const isApprovalRequired = approvalMode === "REQUIRE_APPROVAL";
    let targetKeys: string[] = [];
    let targetNames: string[] = [];

    if (!isApprovalRequired) {
      if (routingOption === "ALL_DEPTS") {
        targetKeys = departments.map((d) => d.key);
        targetNames = departments.map((d) => d.name);
      } else if (routingOption === "SINGLE_DEPT") {
        const match = departments.find((d) => d.key === singleDeptKey) || departments[0];
        if (match) {
          targetKeys = [match.key];
          targetNames = [match.name];
        }
      } else {
        if (selectedDeptKeys.length === 0) {
          alert("Please select at least one department.");
          return;
        }
        targetKeys = selectedDeptKeys;
        targetNames = departments
          .filter((d) => selectedDeptKeys.includes(d.key))
          .map((d) => d.name);
      }
    }

    let finalTargetAudiences: CircularTargetAudience[] = isApprovalRequired ? ["HOD"] : [...targetAudiences];
    if (!isApprovalRequired && copyDeanFyi && !finalTargetAudiences.includes("COE")) {
      finalTargetAudiences.push("COE");
    }

    try {
      setSubmitting(true);
      const payload = {
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        routingOption: isApprovalRequired ? "ALL_DEPTS" : routingOption,
        targetDepartmentKeys: targetKeys,
        targetDepartmentNames: targetNames,
        targetAudiences: finalTargetAudiences,
        requiresDeanApproval: isApprovalRequired,
        submissionNotes: (isApprovalRequired || copyDeanFyi) ? submissionNotes.trim() : undefined,
        attachment: attachments[0] || null,
        attachments,
      };

      await apiClient.post("/circulars", payload);

      setSubject("");
      setMessage("");
      setSubmissionNotes("");
      setAttachments([]);
      setRoutingOption("ALL_DEPTS");
      setCopyDeanFyi(false);

      const successFeedback = isApprovalRequired
        ? "Examination circular submitted to Associate Dean for endorsement!"
        : copyDeanFyi
          ? "Circular broadcast to Department HODs & routed to Associate Dean desk for official record!"
          : "Examination circular broadcast directly to Department HODs!";
      alert(successFeedback);

      await loadCirculars();
      setActiveTab("myCirculars");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create circular. Please check backend connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = (circId: string, att: CircularAttachment) => {
    if (att.dataUrl) {
      const link = document.createElement("a");
      link.href = att.dataUrl;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(`/api/v1/circulars/${circId}/attachment`, "_blank");
    }
  };

  const myIssuedCirculars = useMemo(() => {
    return circulars.filter(
      (c) =>
        c.createdBy?.role === "COE" ||
        c.createdBy?.role === "ADMIN" ||
        c.createdBy?.role === "SUPER_ADMIN"
    );
  }, [circulars]);

  const deanDirectives = useMemo(() => {
    return circulars.filter(
      (c) =>
        (c.createdBy?.role === "ASSOCIATE_DEAN" || c.createdBy?.role === "DEAN") &&
        Boolean(c.targetAudiences?.includes("COE"))
    );
  }, [circulars]);

  const unseenDirectivesCount = useMemo(() => {
    return deanDirectives.filter((c) => !c.seenByCoe && c.status !== "DELETED").length;
  }, [deanDirectives]);

  const filteredMyCirculars = useMemo(() => {
    return myIssuedCirculars.filter((c) => {
      const matchSearch =
        !searchQuery.trim() ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.message.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (coeFilterSegment === "DELETED") {
        return c.status === "DELETED";
      } else if (coeFilterSegment === "PENDING") {
        return c.status === "PENDING_DEAN_APPROVAL";
      } else if (coeFilterSegment === "APPROVED") {
        return c.status === "APPROVED_BY_DEAN";
      } else if (coeFilterSegment === "PUBLISHED") {
        return c.status === "PUBLISHED";
      }
      return true;
    });
  }, [myIssuedCirculars, searchQuery, coeFilterSegment]);

  const filteredDeanDirectives = useMemo(() => {
    return deanDirectives.filter((c) => {
      const matchSearch =
        !searchQuery.trim() ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.message.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (directiveFilterSegment === "DELETED") {
        return c.status === "DELETED";
      } else if (directiveFilterSegment === "ACTIVE") {
        return c.status !== "DELETED";
      }
      return true;
    });
  }, [deanDirectives, searchQuery, directiveFilterSegment]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#D4A72C] text-[#0B192C]">
                Office of Controller of Examinations
              </span>
              <span className="text-xs text-amber-300 font-medium">
                Official Examination Directives & Guidelines Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              COE Circular Management Portal
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Compose examination memorandums, paper scrutiny guidelines, and central valuation notices. Route directives directly to Department HODs or submit to the Associate Dean for review and sanction.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-left">
              <span className="text-[10px] font-bold uppercase text-amber-400 block">
                Signed-in Authority
              </span>
              <span className="text-xs font-black text-white truncate block max-w-[200px]">
                {coeName}
              </span>
            </div>

            <button
              onClick={loadCirculars}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-[#D4A72C] border border-white/10 transition cursor-pointer"
              title="Refresh circulars from server"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("compose")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === "compose"
                ? "bg-[#D4A72C] text-[#0B192C] shadow-sm font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <Send size={14} />
            <span>Compose Exam Circular</span>
          </button>

          <button
            onClick={() => setActiveTab("myCirculars")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === "myCirculars"
                ? "bg-[#D4A72C] text-[#0B192C] shadow-sm font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <FileText size={14} />
            <span>COE Issued Circulars ({myIssuedCirculars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("deanDirectives")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === "deanDirectives"
                ? "bg-[#D4A72C] text-[#0B192C] shadow-sm font-extrabold"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <ShieldCheck size={14} />
            <span>Directives From Associate Dean</span>
            {unseenDirectivesCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {unseenDirectivesCount} NEW
              </span>
            ) : (
              <span className="text-[10px] opacity-70">({deanDirectives.length})</span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: COMPOSE CIRCULAR */}
      {activeTab === "compose" ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Draft Official Examination Circular
              </h2>
              <p className="text-xs text-slate-500">
                Define circular subject, message, multi-file attachments, target disciplines, and review settings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CircularCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white"
              >
                <option value="EXAMINATION">Examination Regulation & Notice</option>
                <option value="ACADEMIC">Academic Directive</option>
                <option value="ADMINISTRATIVE">Administrative Policy</option>
                <option value="GENERAL">General Memorandum</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Priority Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CircularPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white"
              >
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent (Immediate Compliance)</option>
                <option value="NORMAL">Normal Priority</option>
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Circular Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Schedule of Central Valuation, QP Scrutiny & Invigilation Duty Allocation..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C]"
            />
          </div>

          {/* Message Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Official Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              placeholder="Provide full instructions, timelines, exam codes, and operational instructions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] leading-relaxed"
            />
          </div>

          {/* MULTI-FILE ATTACHMENT DECK */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Paperclip size={14} className="text-amber-600" />
                <span>Document Attachments (Attach Timetables, Valuation Orders, or Guidelines)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Documents</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleMultipleFileUpload}
              className="hidden"
            />

            {attachments.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#0B192C] rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-slate-50"
              >
                <Upload size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-bold text-slate-700">
                  Upload examination time tables, circular PDFs, or valuation schedules
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports multiple PDF, DOCX, XLSX files (up to 15MB total)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {att.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* APPROVAL SETTINGS & CONVERSATION OPTION */}
          <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-700" />
                <span>Executive Approval & Endorsement Routing Matrix</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Configure whether this examination circular mandates Associate Dean sanction or dispatches autonomously.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <label
                className={`p-4 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between gap-2 ${approvalMode === "REQUIRE_APPROVAL"
                    ? "bg-[#0B192C] text-white border-[#0B192C] shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="approvalMode"
                    value="REQUIRE_APPROVAL"
                    checked={approvalMode === "REQUIRE_APPROVAL"}
                    onChange={() => {
                      setApprovalMode("REQUIRE_APPROVAL");
                      setRequiresDeanApproval(true);
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-bold">Require Associate Dean Approval & Sanction</p>
                    <p className={`text-[10px] mt-1 leading-relaxed ${approvalMode === "REQUIRE_APPROVAL" ? "text-slate-300" : "text-slate-500"}`}>
                      Standard Academic Governance: Queued for Dean endorsement. Department distribution is held until sanctioned.
                    </p>
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded self-start ${approvalMode === "REQUIRE_APPROVAL" ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-900"}`}>
                  Strict Scrutiny
                </span>
              </label>

              <label
                className={`p-4 rounded-xl border text-xs cursor-pointer transition flex flex-col justify-between gap-2 ${approvalMode === "DIRECT_DISPATCH"
                    ? "bg-[#0B192C] text-white border-[#0B192C] shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="approvalMode"
                    value="DIRECT_DISPATCH"
                    checked={approvalMode === "DIRECT_DISPATCH"}
                    onChange={() => {
                      setApprovalMode("DIRECT_DISPATCH");
                      setRequiresDeanApproval(false);
                    }}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-bold">Direct Autonomous Broadcast to HODs</p>
                    <p className={`text-[10px] mt-1 leading-relaxed ${approvalMode === "DIRECT_DISPATCH" ? "text-slate-300" : "text-slate-500"}`}>
                      Self-Sanctioned Emergency/Exam Notice: Dispatches directly to selected Department HODs immediately.
                    </p>
                    {approvalMode === "DIRECT_DISPATCH" && (
                      <div
                        className="mt-2.5 pt-2 border-t border-slate-200/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px]">
                          <input
                            type="checkbox"
                            checked={copyDeanFyi}
                            onChange={(e) => setCopyDeanFyi(e.target.checked)}
                            className="rounded text-amber-500"
                          />
                          <span>Transmit verification copy to Associate Dean (FYI Record)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded self-start ${approvalMode === "DIRECT_DISPATCH" ? "bg-emerald-400 text-slate-950" : "bg-emerald-100 text-emerald-900"}`}>
                  Instant Dispatch
                </span>
              </label>
            </div>

            {(approvalMode === "REQUIRE_APPROVAL" || copyDeanFyi) && (
              <div className="space-y-2 pt-2 border-t border-amber-200/60">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-amber-800" />
                  <span>COE Note / Explanation to Associate Dean:</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Timetable vetted with academic regulations; central valuation order submitted for formal record..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-200/80 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white"
                />
              </div>
            )}
          </div>

          {/* TARGET AUDIENCE & ROUTING SELECTION */}
          {approvalMode === "REQUIRE_APPROVAL" ? (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold">Associate Dean Review Requested</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Target audience and department routing are hidden during approval request. You will configure and forward to departments once Associate Dean sanction is granted.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* TARGET AUDIENCE SELECTION */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Users size={14} className="text-[#0B192C]" />
                    <span>Target Audiences</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Choose who receives this memorandum.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${targetAudiences.includes("HOD")
                        ? "border-[#0B192C] bg-slate-50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetAudiences.includes("HOD")}
                      onChange={(e) => toggleTargetAudience("HOD", e.target.checked)}
                      className="mt-0.5 rounded text-[#0B192C]"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Department HODs</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Forward to Heads of Department for action and faculty arrangement
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${targetAudiences.includes("FACULTY")
                        ? "border-[#0B192C] bg-slate-50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetAudiences.includes("FACULTY")}
                      onChange={(e) => toggleTargetAudience("FACULTY", e.target.checked)}
                      className="mt-0.5 rounded text-[#0B192C]"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Direct Faculty Memo</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Direct notification to faculties of the selected disciplines
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* DEPARTMENT JURISDICTION SELECTION */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Building2 size={14} className="text-[#0B192C]" />
                  <span>Department Routing & Scope</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${routingOption === "ALL_DEPTS"
                        ? "border-[#0B192C] bg-slate-50"
                        : "border-slate-200"
                      }`}
                  >
                    <input
                      type="radio"
                      name="coeRouting"
                      value="ALL_DEPTS"
                      checked={routingOption === "ALL_DEPTS"}
                      onChange={() => setRoutingOption("ALL_DEPTS")}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">All Departments</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        All academic disciplines ({departments.length} departments)
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${routingOption === "SINGLE_DEPT"
                        ? "border-[#0B192C] bg-slate-50"
                        : "border-slate-200"
                      }`}
                  >
                    <input
                      type="radio"
                      name="coeRouting"
                      value="SINGLE_DEPT"
                      checked={routingOption === "SINGLE_DEPT"}
                      onChange={() => setRoutingOption("SINGLE_DEPT")}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Single Department</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">One target discipline</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${routingOption === "SELECTED_DEPTS"
                        ? "border-[#0B192C] bg-slate-50"
                        : "border-slate-200"
                      }`}
                  >
                    <input
                      type="radio"
                      name="coeRouting"
                      value="SELECTED_DEPTS"
                      checked={routingOption === "SELECTED_DEPTS"}
                      onChange={() => setRoutingOption("SELECTED_DEPTS")}
                      className="mt-0.5"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Selected Departments</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Custom selection</p>
                    </div>
                  </label>
                </div>

                {routingOption === "SINGLE_DEPT" && (
                  <select
                    value={singleDeptKey}
                    onChange={(e) => setSingleDeptKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.name} ({d.code}) - {d.hodName}
                      </option>
                    ))}
                  </select>
                )}

                {routingOption === "SELECTED_DEPTS" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {departments.map((dept) => {
                      const isSelected = selectedDeptKeys.includes(dept.key);
                      return (
                        <div
                          key={dept.key}
                          onClick={() => toggleDeptSelection(dept.key)}
                          className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${isSelected
                              ? "bg-[#0B192C] text-white border-[#0B192C]"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <span className="font-bold truncate">{dept.code}</span>
                          {isSelected && <Check size={12} strokeWidth={3} className="text-[#D4A72C]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#0B192C]/20 transition cursor-pointer"
            >
              <Send size={15} />
              <span>
                {submitting
                  ? "Publishing..."
                  : approvalMode === "REQUIRE_APPROVAL"
                    ? "Submit to Associate Dean for Approval"
                    : copyDeanFyi
                      ? "Broadcast Directly + Transmit Dean FYI"
                      : "Publish & Broadcast Directly to HODs"}
              </span>
            </button>
          </div>
        </form>
      ) : activeTab === "myCirculars" ? (
        /* TAB 2: MY ISSUED CIRCULARS & APPROVAL STATUS */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  COE Examination Directives & Approval Status
                </h3>
                <p className="text-xs text-slate-500">
                  Track circulars submitted to Associate Dean, approval remarks, and distribution status.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600">
                Total Directives: {myIssuedCirculars.length}
              </span>
            </div>

            {/* Filter Badges for COE Issued Circulars */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
              {[
                { key: "ALL", label: "All COE Circulars", count: myIssuedCirculars.length },
                { key: "PENDING", label: "Pending Approval", count: myIssuedCirculars.filter((c) => c.status === "PENDING_DEAN_APPROVAL").length },
                { key: "APPROVED", label: "Approved / Ready", count: myIssuedCirculars.filter((c) => c.status === "APPROVED_BY_DEAN").length },
                { key: "PUBLISHED", label: "Published to HODs", count: myIssuedCirculars.filter((c) => c.status === "PUBLISHED").length },
                { key: "DELETED", label: "Deleted / Revoked", count: myIssuedCirculars.filter((c) => c.status === "DELETED").length },
              ].map((pill) => {
                const isSelected = coeFilterSegment === pill.key;
                const config = getCircularSegmentConfig(pill.key, isSelected);
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setCoeFilterSegment(pill.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-2 border hover:-translate-y-0.5 active:translate-y-0 ${config.buttonClass}`}
                  >
                    {config.icon}
                    <span>{pill.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.badgeClass}`}>
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredMyCirculars.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No examination circulars match this filter</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try switching filter tabs or compose a new circular.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMyCirculars.map((circ) => {
                  const isPending = circ.status === "PENDING_DEAN_APPROVAL";
                  const isApprovedByDean = circ.status === "APPROVED_BY_DEAN";
                  const isPublished = circ.status === "PUBLISHED";
                  const isRejected = circ.status === "REJECTED";

                  return (
                    <div
                      key={circ.id}
                      onClick={() => setSelectedCircular(circ)}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 transition cursor-pointer space-y-3.5 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                            {circ.refNo}
                          </span>

                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 animate-pulse flex items-center gap-1">
                              <Clock size={11} />
                              <span>Pending Associate Dean Review</span>
                            </span>
                          )}

                          {isApprovedByDean && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-indigo-600" />
                              <span>Approved by Associate Dean — Ready to Forward</span>
                            </span>
                          )}

                          {isPublished && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Dispatched & Published to HODs</span>
                            </span>
                          )}

                          {isRejected && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                              <AlertCircle size={11} className="text-rose-600" />
                              <span>Revision Required (Rejected by Dean)</span>
                            </span>
                          )}

                          {circ.status === "DELETED" && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                              <Trash2 size={11} className="text-rose-600" />
                              <span>Deleted / Revoked</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400">
                          {new Date(circ.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-900 flex-1">
                          {circ.subject}
                        </h4>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* EDIT ACTION BUTTON: Available for Pending, Approved, Published, or Rejected */}
                          {(isPending || isApprovedByDean || isPublished || isRejected) && circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(circ);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                              title="Edit circular subject, content, and category"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* FORWARD ACTION BUTTON: Visible ONLY when Associate Dean Approves */}
                          {isApprovedByDean && circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openForwardModal(circ);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs flex items-center gap-2 shadow-md shadow-[#0B192C]/20 transition cursor-pointer"
                            >
                              <Send size={13} />
                              <span>Forward to Department HODs</span>
                            </button>
                          )}

                          {isRejected && circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReuseCircular(circ);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <RefreshCw size={12} />
                              <span>Revise in Compose</span>
                            </button>
                          )}

                          {/* DELETE ACTION BUTTON */}
                          {circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete circular "${circ.subject}"?`)) {
                                  try {
                                    await apiClient.delete(`/circulars/${circ.id}`);
                                    alert("Circular deleted successfully");
                                    await loadCirculars();
                                  } catch (err: any) {
                                    alert("Failed to delete circular: " + (err?.message || "Error"));
                                  }
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 border border-rose-200 transition cursor-pointer"
                              title="Delete this circular"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* DELETED LOG BANNER */}
                      {circ.status === "DELETED" && (
                        <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 space-y-1">
                          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                            <AlertCircle size={15} className="text-rose-600 shrink-0" />
                            <span>Circular Deleted / Retracted Notice</span>
                          </div>
                          <p className="text-xs text-rose-800 pl-6">
                            This circular was deleted by{" "}
                            <strong className="font-bold">
                              {circ.deletedBy?.role === "ASSOCIATE_DEAN" ? "Associate Dean" : circ.deletedBy?.role === "COE" ? "COE" : circ.deletedBy?.role || "Authorized Authority"}
                              {circ.deletedBy?.name ? ` (${circ.deletedBy.name})` : ""}
                            </strong>{" "}
                            on {new Date(circ.deletedAt || circ.createdAt).toLocaleString()}. This circular is revoked.
                          </p>
                        </div>
                      )}

                      {/* REJECTION LOG BANNER: Displayed to COE when Associate Dean Rejects */}
                      {isRejected && (
                        <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                            <span className="flex items-center gap-1.5">
                              <AlertCircle size={14} className="text-rose-600" />
                              <span>Associate Dean Rejection Log & Directives</span>
                            </span>
                            {circ.approvedAt && (
                              <span className="text-[10px] text-rose-600 font-medium">
                                {new Date(circ.approvedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-rose-200/80 text-xs text-rose-950 font-semibold leading-relaxed">
                            "{circ.approvalRemarks || "No specific rejection remarks provided."}"
                          </div>
                          {circ.approvedBy?.name && (
                            <p className="text-[11px] text-rose-800 font-medium">
                              Reviewing Dean: <strong>{circ.approvedBy.name}</strong>
                            </p>
                          )}
                        </div>
                      )}
                      {/* Conversation Feedback Trail */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                        {circ.submissionNotes && (
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                              My Note to Dean:
                            </span>
                            <p className="text-slate-700 mt-0.5 font-medium">
                              {circ.submissionNotes}
                            </p>
                          </div>
                        )}

                        {circ.approvalRemarks ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              Associate Dean Endorsement:
                            </span>
                            <p className="text-emerald-900 mt-0.5 font-semibold">
                              "{circ.approvalRemarks}"
                            </p>
                          </div>
                        ) : isPending ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                            Awaiting review by Associate Dean (Dr. R. Shanmugasundaram)...
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 3: CIRCULARS FROM ASSOCIATE DEAN */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Official Memorandums Received From Associate Dean
              </h3>
              <p className="text-xs text-slate-500">
                Directives and institutional guidelines routed to the Examination Cell.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {deanDirectives.length} Directives
            </span>
          </div>

          {/* Filter Badges for Associate Dean Directives */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
            {[
              { key: "ALL", label: "All Directives", count: deanDirectives.length },
              { key: "ACTIVE", label: "Active Directives", count: deanDirectives.filter((c) => c.status !== "DELETED").length },
              { key: "DELETED", label: "Deleted / Retracted", count: deanDirectives.filter((c) => c.status === "DELETED").length },
            ].map((pill) => {
              const isSelected = directiveFilterSegment === pill.key;
              const config = getCircularSegmentConfig(pill.key, isSelected);
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setDirectiveFilterSegment(pill.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-2 border hover:-translate-y-0.5 active:translate-y-0 ${config.buttonClass}`}
                >
                  {config.icon}
                  <span>{pill.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${config.badgeClass}`}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filteredDeanDirectives.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Inbox size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No directives match this filter</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Directives from Associate Dean routed to COE will show here.
                </p>
              </div>
            ) : (
              filteredDeanDirectives.map((circ) => (
                <div
                  key={circ.id}
                  onClick={() => handleOpenDeanDirective(circ)}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#0B192C]">
                        {circ.refNo}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {circ.category}
                      </span>

                      {circ.seenByCoe ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={10} className="text-emerald-600" />
                          <span>Seen {circ.seenAt ? `(${new Date(circ.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Delivered — Unread
                        </span>
                      )}

                      {circ.status === "DELETED" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <Trash2 size={10} className="text-rose-600" />
                          <span>DELETED / RECALLED</span>
                        </span>
                      )}

                      {circ.coeReply && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <MessageSquare size={10} />
                          <span>Replied</span>
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {circ.status === "DELETED"
                        ? `[Notice Retracted — Directive Withdrawn by Associate Dean]`
                        : circ.subject}
                    </h4>

                    {circ.status === "DELETED" && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                        <AlertCircle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-rose-800">
                          Associate Dean {circ.deletedBy?.name ? `(${circ.deletedBy.name})` : ""} deleted this circular on {new Date(circ.deletedAt || circ.createdAt).toLocaleString()}.
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400">
                      Issued by {circ.createdBy?.name} • {new Date(circ.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • Priority: <strong className={circ.priority === "URGENT" ? "text-rose-600" : circ.priority === "HIGH" ? "text-amber-600" : "text-slate-600"}>{circ.priority}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#0B192C] bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
                  >
                    View Memo
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Detail Dialog Modal */}
      {selectedCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                  {selectedCircular.refNo}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {selectedCircular.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedCircular(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {selectedCircular.status === "DELETED" &&
                selectedCircular.createdBy?.role !== "COE" &&
                selectedCircular.createdBy?.role !== "ADMIN" &&
                selectedCircular.createdBy?.role !== "SUPER_ADMIN"
                  ? `[Notice Retracted — Topic Withdrawn by Associate Dean]`
                  : selectedCircular.subject}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Issued: {new Date(selectedCircular.createdAt).toLocaleString()} • Origin: {selectedCircular.createdBy.name}
              </p>
            </div>

            {/* Deleted Directive Banner */}
            {selectedCircular.status === "DELETED" && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-xs uppercase text-rose-700 block">
                    Circular Deleted / Retracted Notice
                  </span>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    This circular was deleted by{" "}
                    <strong className="font-bold">
                      {selectedCircular.deletedBy?.role === "ASSOCIATE_DEAN" ? "Associate Dean" : selectedCircular.deletedBy?.role === "COE" ? "COE" : selectedCircular.deletedBy?.role || "Authorized Authority"}
                      {selectedCircular.deletedBy?.name ? ` (${selectedCircular.deletedBy.name})` : ""}
                    </strong>{" "}
                    on {new Date(selectedCircular.deletedAt || selectedCircular.createdAt).toLocaleString()}. This directive has been officially retracted.
                  </p>
                </div>
              </div>
            )}

            {selectedCircular.status === "DELETED" &&
            selectedCircular.createdBy?.role !== "COE" &&
            selectedCircular.createdBy?.role !== "ADMIN" &&
            selectedCircular.createdBy?.role !== "SUPER_ADMIN" ? (
              <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 text-xs sm:text-sm text-rose-900 leading-relaxed font-medium">
                This official memorandum was retracted and deleted by{" "}
                <strong className="font-bold">Associate Dean</strong>
                {selectedCircular.deletedAt ? ` on ${new Date(selectedCircular.deletedAt).toLocaleString()}` : ""}.
                The subject, topic, message content, and document attachments have been withdrawn and are hidden from recipients.
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                {selectedCircular.message}
              </div>
            )}

            {/* Conversation Notes */}
            {(selectedCircular.submissionNotes || selectedCircular.approvalRemarks) &&
              (selectedCircular.status !== "DELETED" ||
                selectedCircular.createdBy?.role === "COE" ||
                selectedCircular.createdBy?.role === "ADMIN" ||
                selectedCircular.createdBy?.role === "SUPER_ADMIN") && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                {selectedCircular.submissionNotes && (
                  <div>
                    <span className="font-bold text-slate-700 block">COE Note to Dean:</span>
                    <p className="text-slate-800 mt-0.5">{selectedCircular.submissionNotes}</p>
                  </div>
                )}
                {selectedCircular.approvalRemarks && (
                  <div className="pt-2 border-t border-amber-200/60">
                    <span className="font-bold text-emerald-800 block">Associate Dean Remarks:</span>
                    <p className="text-emerald-950 font-semibold mt-0.5">"{selectedCircular.approvalRemarks}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {selectedCircular.attachments &&
              selectedCircular.attachments.length > 0 &&
              (selectedCircular.status !== "DELETED" ||
                selectedCircular.createdBy?.role === "COE" ||
                selectedCircular.createdBy?.role === "ADMIN" ||
                selectedCircular.createdBy?.role === "SUPER_ADMIN") && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Attached Documents ({selectedCircular.attachments.length}):
                </span>
                <div className="space-y-1.5">
                  {selectedCircular.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Paperclip size={14} className="text-amber-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                        <span className="text-slate-400 text-[10px]">({(att.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(selectedCircular.id, att)}
                        className="px-2.5 py-1 bg-[#0B192C] text-[#D4A72C] hover:bg-slate-900 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Reply & Communication Channel with Associate Dean */}
            {selectedCircular.status !== "DELETED" && (selectedCircular.createdBy?.role === "ASSOCIATE_DEAN" || selectedCircular.createdBy?.role === "DEAN" || selectedCircular.targetAudiences?.includes("COE")) && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-[#0B192C]" />
                    <span>Communication with Associate Dean</span>
                  </h4>
                  {selectedCircular.seenByCoe && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-emerald-600" />
                      <span>COE Acknowledged {selectedCircular.seenAt ? `(${new Date(selectedCircular.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}</span>
                    </span>
                  )}
                </div>

                {selectedCircular.coeReply && (
                  <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-indigo-900">
                      <span>Current Transmitted Reply:</span>
                      {selectedCircular.coeReplyAt && (
                        <span className="text-[10px] text-indigo-600 font-normal">
                          {new Date(selectedCircular.coeReplyAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 italic font-medium">"{selectedCircular.coeReply}"</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    {selectedCircular.coeReply ? "Update Reply to Associate Dean:" : "Send Reply to Associate Dean:"}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Type official reply, confirmation, or compliance note to the Associate Dean..."
                    value={coeReplyInput}
                    onChange={(e) => setCoeReplyInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white text-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={submittingReply || !coeReplyInput.trim()}
                      onClick={handleSendReply}
                      className="px-4 py-2 bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Send size={13} />
                      <span>{submittingReply ? "Submitting..." : selectedCircular.coeReply ? "Update Reply" : "Send Reply to Dean"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCircular(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FORWARDING DIALOG MODAL (When Dean Approves) */}
      {forwardingCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                  {forwardingCircular.refNo}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900">
                  Approved by Associate Dean
                </span>
              </div>
              <button
                onClick={() => setForwardingCircular(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Forward Circular to Department HODs
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The Associate Dean has approved this circular. Select which department HODs and faculty to dispatch to.
              </p>
            </div>

            {/* Associate Dean Approval Endorsement Preview */}
            {forwardingCircular.approvalRemarks && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  <span>Associate Dean's Endorsement Remarks:</span>
                </span>
                <p className="text-emerald-950 font-semibold italic">"{forwardingCircular.approvalRemarks}"</p>
              </div>
            )}

            {/* Circular Subject & Memo Preview */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Circular Subject & Content
              </span>
              <p className="text-sm font-bold text-slate-900">{forwardingCircular.subject}</p>
              <p className="text-xs text-slate-600 line-clamp-3">{forwardingCircular.message}</p>
            </div>

            {/* Routing Destination Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Select Department Distribution Option:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${forwardRoutingOption === "ALL_DEPTS"
                      ? "border-[#0B192C] bg-slate-50 shadow-xs font-bold text-[#0B192C]"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                >
                  <input
                    type="radio"
                    name="forwardRouting"
                    checked={forwardRoutingOption === "ALL_DEPTS"}
                    onChange={() => setForwardRoutingOption("ALL_DEPTS")}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">All Departments</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                    Broadcast to all {departments.length} department HODs
                  </span>
                </label>

                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${forwardRoutingOption === "SINGLE_DEPT"
                      ? "border-[#0B192C] bg-slate-50 shadow-xs font-bold text-[#0B192C]"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                >
                  <input
                    type="radio"
                    name="forwardRouting"
                    checked={forwardRoutingOption === "SINGLE_DEPT"}
                    onChange={() => setForwardRoutingOption("SINGLE_DEPT")}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">Particular Department</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                    Route to one specific department HOD
                  </span>
                </label>

                <label
                  className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${forwardRoutingOption === "SELECTED_DEPTS"
                      ? "border-[#0B192C] bg-slate-50 shadow-xs font-bold text-[#0B192C]"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                >
                  <input
                    type="radio"
                    name="forwardRouting"
                    checked={forwardRoutingOption === "SELECTED_DEPTS"}
                    onChange={() => setForwardRoutingOption("SELECTED_DEPTS")}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold">Multiple Selected</span>
                  <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                    Choose multiple departments
                  </span>
                </label>
              </div>

              {forwardRoutingOption === "SINGLE_DEPT" && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Choose Department:</label>
                  <select
                    value={forwardSingleDeptKey}
                    onChange={(e) => setForwardSingleDeptKey(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept.key} value={dept.key}>
                        {dept.name} ({dept.code}) — HOD: {dept.hodName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {forwardRoutingOption === "SELECTED_DEPTS" && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Choose Target Departments ({forwardSelectedDeptKeys.length} selected):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                    {departments.map((dept) => {
                      const isSel = forwardSelectedDeptKeys.includes(dept.key);
                      return (
                        <div
                          key={dept.key}
                          onClick={() => {
                            setForwardSelectedDeptKeys((prev) =>
                              isSel ? prev.filter((k) => k !== dept.key) : [...prev, dept.key]
                            );
                          }}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${isSel
                              ? "bg-[#0B192C] text-white border-[#0B192C]"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <span className="font-bold truncate">{dept.code}</span>
                          {isSel && <Check size={12} strokeWidth={3} className="text-[#D4A72C]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Audience Notice: Forwarded strictly to Department HODs */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Users size={14} className="text-amber-700 shrink-0" />
              <span className="font-semibold">
                Approved circular is forwarded strictly to the Heads of Department (HODs) of the selected branches.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setForwardingCircular(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={forwardSubmitting}
                onClick={handleForwardSubmit}
                className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0B192C]/20 transition cursor-pointer"
              >
                <Send size={14} />
                <span>{forwardSubmitting ? "Forwarding..." : "Confirm & Dispatch Circular"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CIRCULAR MODAL (For Pending, Approved, or Rejected) */}
      {editingCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                  {editingCircular.refNo}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Edit Circular
                </span>
              </div>
              <button
                onClick={() => setEditingCircular(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Circular Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as CircularCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="EXAMINATION">Examination</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="ADMINISTRATIVE">Administrative</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as CircularPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Official Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] leading-relaxed"
                  required
                />
              </div>

              {editingCircular.requiresDeanApproval && (
                <div>
                  <label className="text-xs font-bold text-amber-950 block mb-1">
                    COE Note / Explanation to Associate Dean:
                  </label>
                  <textarea
                    rows={2}
                    value={editSubmissionNotes}
                    onChange={(e) => setEditSubmissionNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-amber-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCircular(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{editSubmitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CircularsPage;
