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
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  CheckSquare,
  XCircle,
  MessageSquare,
} from "lucide-react";
import {
  Circular,
  CircularCategory,
  CircularPriority,
  CircularTargetAudience,
  HodRoutingOption,
  CircularAttachment,
  DEFAULT_DEPARTMENTS,
  DepartmentOption,
  FacultyOption,
  matchesDept,
} from "./CircularTypes";
import {
  createCircular,
  getCircularsForDean,
  getPendingApprovalsForDean,
  approveCircular,
  releaseScheduledCircularNow,
  subscribeCirculars,
  fetchDynamicDepartments,
  fetchDynamicFaculties,
  refreshCircularsFromServer,
  findHodAction,
  deleteCircular,
} from "./circularStore";
import { CircularDialog } from "./CircularDialog";
import {
  DynamicCircularFilter,
  CircularMetricStatCards,
  FilterCounts,
} from "./DynamicCircularFilter";

interface CircularDeanViewProps {
  deanName?: string;
  onToast?: (msg: string) => void;
}

export const CircularDeanView: React.FC<CircularDeanViewProps> = ({
  deanName = "Dr. R. Shanmugasundaram (Associate Dean)",
  onToast,
}) => {
  const [circulars, setCirculars] = useState<Circular[]>(() =>
    getCircularsForDean()
  );
  const [pendingApprovals, setPendingApprovals] = useState<Circular[]>(() =>
    getPendingApprovalsForDean()
  );
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "history" | "approvals">("compose");

  // Form State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<CircularCategory>("ACADEMIC");
  const [priority, setPriority] = useState<CircularPriority>("NORMAL");
  const [targetAudiences, setTargetAudiences] = useState<CircularTargetAudience[]>(["HOD"]);
  const [routingOption, setRoutingOption] = useState<HodRoutingOption>("ALL_DEPTS");
  const [singleDeptKey, setSingleDeptKey] = useState<string>("cse");
  const [selectedDeptKeys, setSelectedDeptKeys] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<CircularAttachment[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const setTimerPreset = (minutesToAdd: number) => {
    const target = new Date(Date.now() + minutesToAdd * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const localIso = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
    setScheduledDateTime(localIso);
    setIsScheduled(true);
  };

  const formatCountdown = (scheduledFor?: string | null) => {
    if (!scheduledFor) return "";
    const diff = new Date(scheduledFor).getTime() - now;
    if (diff <= 0) return "Releasing now...";
    const totalSecs = Math.floor(diff / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `in ${hours}h ${mins}m ${secs}s`;
    }
    return `in ${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const isCoeOnly = targetAudiences.length === 1 && targetAudiences[0] === "COE";

  // Specific Faculty Targeting State
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [facultyTargetMode, setFacultyTargetMode] = useState<"ALL_DEPT_FACULTY" | "SPECIFIC_FACULTY">("ALL_DEPT_FACULTY");
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState("");

  // Approval review feedback state
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dialog State
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Executive Filter State
  const [activeSegment, setActiveSegment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState<string>("ALL");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFaculties = async (deptKey?: string) => {
    try {
      setLoadingFaculties(true);
      const list = await fetchDynamicFaculties(deptKey);
      setFaculties(list);
    } catch {
      setFaculties([]);
    } finally {
      setLoadingFaculties(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setLoadingDepts(true);
      const list = await fetchDynamicDepartments();
      if (list && list.length > 0) {
        setDepartments(list);
        if (!list.some((d) => d.key === singleDeptKey)) {
          setSingleDeptKey(list[0].key);
        }
      }
    } catch {
      // Retain fallback
    } finally {
      setLoadingDepts(false);
    }
  };

  useEffect(() => {
    void refreshCircularsFromServer();
    const unsub = subscribeCirculars(() => {
      setCirculars(getCircularsForDean());
      setPendingApprovals(getPendingApprovalsForDean());
    });
    void loadDepartments();

    const interval = setInterval(() => {
      void refreshCircularsFromServer();
    }, 10000);

    return () => {
      unsub();
      clearInterval(interval);
    };
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
      alert("Please provide a circular subject.");
      return;
    }
    if (!message.trim()) {
      alert("Please enter the official circular content.");
      return;
    }

    let targetKeys: string[] = [];
    let targetNames: string[] = [];

    if (isCoeOnly) {
      targetKeys = ["coe"];
      targetNames = ["Examination Cell (COE)"];
    } else if (routingOption === "ALL_DEPTS") {
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

    if (isScheduled && !scheduledDateTime) {
      alert("Please select a scheduled date and time for timed release.");
      return;
    }
    const scheduledIso = isScheduled && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined;

    const isSpecificFaculty = !isCoeOnly && targetAudiences.includes("FACULTY") && facultyTargetMode === "SPECIFIC_FACULTY";
    if (isSpecificFaculty && selectedFacultyIds.length === 0) {
      alert("Please select at least one faculty member, or choose 'All Faculty in Target Department(s)'.");
      return;
    }

    const selectedFacultyNames = isSpecificFaculty
      ? faculties
        .filter((f) => selectedFacultyIds.includes(String(f.staffId || f.id)))
        .map((f) => `${f.title || "Dr."} ${f.name}`)
      : [];

    try {
      await createCircular({
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        status: isScheduled ? "SCHEDULED" : "PUBLISHED",
        scheduledFor: scheduledIso,
        targetAudiences,
        targetFacultyIds: isSpecificFaculty ? selectedFacultyIds : [],
        targetFacultyNames: selectedFacultyNames,
        attachment: attachments[0] || null,
        attachments,
        routingOption: isCoeOnly ? "ALL_DEPTS" : routingOption,
        targetDepartmentKeys: targetKeys,
        targetDepartmentNames: targetNames,
        createdBy: {
          id: "AD-01",
          name: deanName,
          role: "ASSOCIATE_DEAN",
        },
      });

      // Reset Form
      setSubject("");
      setMessage("");
      setAttachments([]);
      setRoutingOption("ALL_DEPTS");
      setTargetAudiences(["HOD"]);
      setSelectedFacultyIds([]);
      setFacultyTargetMode("ALL_DEPT_FACULTY");
      setIsScheduled(false);
      setScheduledDateTime("");

      const destSummary = targetAudiences.join(", ");
      const successMsg = isScheduled
        ? `Circular scheduled for automated release to [${destSummary}] at ${new Date(scheduledDateTime).toLocaleString()}!`
        : `Circular published & dispatched to [${destSummary}] successfully!`;
      if (onToast) {
        onToast(successMsg);
      } else {
        alert(successMsg);
      }

      setActiveTab("history");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to publish circular. Please check server connection.");
    }
  };

  const handleApprove = async (circId: string, approve: boolean) => {
    setProcessingId(circId);
    try {
      const remarks = reviewRemarks[circId] || "";
      await approveCircular(circId, approve, remarks);
      const actionLabel = approve ? "approved & queued for COE forwarding" : "rejected with remarks";
      if (onToast) {
        onToast(`COE Circular ${actionLabel} successfully!`);
      }
      setPendingApprovals(getPendingApprovalsForDean());
      setCirculars(getCircularsForDean());
    } finally {
      setProcessingId(null);
    }
  };

  // Executive Filtering Logic
  const filteredCirculars = useMemo(() => {
    return circulars.filter((circ) => {
      // 1. Text Search
      const searchMatch =
        !searchQuery.trim() ||
        circ.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circ.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        circ.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (circ.attachments && circ.attachments.some((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (circ.attachment && circ.attachment.name.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Department Filter
      let deptMatch = true;
      if (filterDept !== "ALL") {
        if (circ.routingOption === "ALL_DEPTS") {
          deptMatch = true;
        } else {
          const keyMatch = circ.targetDepartmentKeys?.some((k) => matchesDept(k, filterDept));
          const nameMatch = circ.targetDepartmentNames?.some((n) => matchesDept(n, filterDept));
          deptMatch = Boolean(keyMatch || nameMatch);
        }
      }

      // 3. Segment Filter
      const hasAction = Object.keys(circ.hodActions || {}).length > 0;
      let segmentMatch = true;
      if (activeSegment === "DELETED") {
        segmentMatch = circ.status === "DELETED";
      } else {
        if (circ.status === "DELETED") return false;

        if (activeSegment === "FORWARDED") {
          segmentMatch = Object.values(circ.hodActions || {}).some((a) => a.action === "FORWARDED");
        } else if (activeSegment === "KEPT") {
          segmentMatch = Object.values(circ.hodActions || {}).some((a) => a.action === "KEPT");
        } else if (activeSegment === "PENDING_HOD") {
          segmentMatch = !hasAction;
        } else if (activeSegment === "COE_DIRECTIVES") {
          segmentMatch = circ.createdBy?.role === "COE" || circ.targetAudiences?.includes("COE");
        }
      }

      return searchMatch && deptMatch && segmentMatch;
    });
  }, [circulars, searchQuery, filterDept, activeSegment]);

  const coeCircularsList = useMemo(() => {
    return circulars.filter((c) => c.createdBy?.role === "COE");
  }, [circulars]);

  // Executive Segment Counts
  const filterCounts: FilterCounts = useMemo(() => {
    let urgent = 0;
    let academic = 0;
    let examination = 0;
    let forwarded = 0;
    let deleted = 0;
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    circulars.forEach((c) => {
      if (c.status === "DELETED") {
        deleted++;
        return;
      }
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      if (c.priority === "HIGH" || c.priority === "URGENT") urgent++;
      if (c.category === "ACADEMIC") academic++;
      if (c.category === "EXAMINATION") examination++;
      const actions = Object.values(c.hodActions || {});
      if (actions.some((a) => a.action === "FORWARDED")) forwarded++;
    });

    return {
      total: circulars.length,
      filtered: filteredCirculars.length,
      urgent,
      academic,
      examination,
      forwarded,
      deleted,
      byCategory,
      byPriority,
    };
  }, [circulars, filteredCirculars.length]);

  const segments = [
    { key: "ALL", label: "Active Circulars", count: circulars.filter((c) => c.status !== "DELETED").length },
    { key: "FORWARDED", label: "HOD Forwarded", count: filterCounts.forwarded ?? 0 },
    {
      key: "PENDING_HOD",
      label: "Awaiting Action",
      count: circulars.filter((c) => c.status !== "DELETED" && Object.keys(c.hodActions || {}).length === 0).length,
    },
    { key: "URGENT", label: "Urgent", count: filterCounts.urgent },
    { key: "COE_DIRECTIVES", label: "COE Directives", count: coeCircularsList.length },
    { key: "DELETED", label: "Deleted / Retracted", count: filterCounts.deleted ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Dean Header */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#D4A72C] text-[#0B192C]">
                Executive Academic Governance
              </span>
              <span className="text-xs text-amber-300 font-medium">
                Official Memorandum & Directive Broadcast Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Institutional Circular Management
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Broadcast official academic notices to Department HODs, direct to Teaching Faculty, or to the Controller of Examinations (COE). Review and sanction incoming COE exam circulars with complete audit oversight.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-left w-full sm:w-auto">
              <span className="text-[10px] font-bold uppercase text-amber-400 block">
                Primary Authority
              </span>
              <span className="text-xs font-black text-white truncate block max-w-[200px]">
                {deanName}
              </span>
            </div>
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
            <span>Compose New Circular</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === "history"
              ? "bg-[#D4A72C] text-[#0B192C] shadow-sm font-extrabold"
              : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <FileText size={14} />
            <span>Issued Circulars Queue ({circulars.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === "approvals"
              ? "bg-[#D4A72C] text-[#0B192C] shadow-sm font-extrabold"
              : pendingApprovals.length > 0
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
          >
            <ShieldCheck size={14} />
            <span>COE Approvals Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-[#0B192C] animate-pulse">
                {pendingApprovals.length} Pending
              </span>
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
                Draft Official Memorandum
              </h2>
              <p className="text-xs text-slate-500">
                Specify notification subject, message, multi-file attachments, and target delivery destinations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Notification Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CircularCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white"
              >
                <option value="ACADEMIC">Academic Directive</option>
                <option value="EXAMINATION">Examination Regulation</option>
                <option value="ADMINISTRATIVE">Administrative Order</option>
                <option value="EVENTS">Events & Symposiums</option>
                <option value="GENERAL">General Notice</option>
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
                <option value="NORMAL">Normal Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent (Immediate Compliance)</option>
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
              placeholder="e.g. Revised Academic Schedule, Paper Valuation Guidelines, or Examination Instructions..."
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
              placeholder="Write the full body of the official circular here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] leading-relaxed"
            />
          </div>

          {/* MULTIPLE ATTACHMENTS DECK */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Paperclip size={14} className="text-amber-600" />
                <span>Document Attachments (Select multiple files supported)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Files</span>
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
                  Click to browse and upload multiple documents
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supports PDF, DOCX, XLSX, Images (select multiple files at once or in batches)
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
                            {(att.size / 1024).toFixed(1)} KB • {att.type || "Document"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{attachments.length} file(s) attached</span>
                  <button
                    type="button"
                    onClick={() => setAttachments([])}
                    className="text-rose-600 hover:underline font-bold text-[11px]"
                  >
                    Clear All Files
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RECIPIENT TARGET AUDIENCES (OPTIONAL DESTINATIONS) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <Send size={14} className="text-[#0B192C]" />
                <span>Target Audiences & Delivery Gateways</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Select one or multiple recipient groups. The memorandum will route directly to all selected portals.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target 1: HODs */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${targetAudiences.includes("HOD")
                  ? "border-[#0B192C] bg-slate-50 shadow-xs ring-1 ring-[#0B192C]/10"
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
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#0B192C]" />
                    <span>Department HODs</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Route to Heads of Department for action and subsequent faculty/student distribution.
                  </p>
                </div>
              </label>

              {/* Target 2: Faculties Directly */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${targetAudiences.includes("FACULTY")
                  ? "border-[#0B192C] bg-slate-50 shadow-xs ring-1 ring-[#0B192C]/10"
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
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users size={14} className="text-[#0B192C]" />
                    <span>Department Faculty (Direct)</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Direct notification to teaching faculty without requiring prior HOD forwarding.
                  </p>
                </div>
              </label>

              {/* Target 3: COE Examination Portal */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${targetAudiences.includes("COE")
                  ? "border-[#0B192C] bg-slate-50 shadow-xs ring-1 ring-[#0B192C]/10"
                  : "border-slate-200 hover:border-slate-300"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={targetAudiences.includes("COE")}
                  onChange={(e) => toggleTargetAudience("COE", e.target.checked)}
                  className="mt-0.5 rounded text-[#0B192C]"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#0B192C]" />
                    <span>Examination Cell (COE)</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Official directive delivered directly into the Controller of Examinations portal.
                  </p>
                </div>
              </label>
            </div>

            {/* Dynamic Specific Faculty Selector */}
            {targetAudiences.includes("FACULTY") && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Users size={14} className="text-indigo-600" />
                    Faculty Targeting Scope:
                  </p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Live Database Faculty
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${facultyTargetMode === "ALL_DEPT_FACULTY"
                      ? "border-indigo-600 bg-white font-bold text-indigo-900 shadow-xs"
                      : "border-indigo-200 bg-white/70 text-slate-700 hover:bg-white"
                      }`}
                  >
                    <input
                      type="radio"
                      name="deanFacultyTargetMode"
                      value="ALL_DEPT_FACULTY"
                      checked={facultyTargetMode === "ALL_DEPT_FACULTY"}
                      onChange={() => setFacultyTargetMode("ALL_DEPT_FACULTY")}
                    />
                    <span>All Faculty in Target Department(s)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${facultyTargetMode === "SPECIFIC_FACULTY"
                      ? "border-indigo-600 bg-white font-bold text-indigo-900 shadow-xs"
                      : "border-indigo-200 bg-white/70 text-slate-700 hover:bg-white"
                      }`}
                  >
                    <input
                      type="radio"
                      name="deanFacultyTargetMode"
                      value="SPECIFIC_FACULTY"
                      checked={facultyTargetMode === "SPECIFIC_FACULTY"}
                      onChange={() => {
                        setFacultyTargetMode("SPECIFIC_FACULTY");
                        void loadFaculties(routingOption === "SINGLE_DEPT" ? singleDeptKey : undefined);
                      }}
                    />
                    <span>Specific Faculty Members</span>
                  </label>
                </div>

                {facultyTargetMode === "SPECIFIC_FACULTY" && (
                  <div className="space-y-2 pt-2 border-t border-indigo-200/60">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] font-bold text-indigo-950">
                        Choose Particular Faculty ({selectedFacultyIds.length} selected):
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search faculty..."
                          value={facultySearch}
                          onChange={(e) => setFacultySearch(e.target.value)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 bg-white text-slate-800 placeholder-slate-400 w-40 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => void loadFaculties(routingOption === "SINGLE_DEPT" ? singleDeptKey : undefined)}
                          className="text-[10px] px-2 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold transition cursor-pointer"
                        >
                          Refresh DB
                        </button>
                      </div>
                    </div>

                    {loadingFaculties ? (
                      <p className="text-xs text-indigo-600 italic py-2">Loading live faculty members from database...</p>
                    ) : faculties.length === 0 ? (
                      <p className="text-xs text-slate-500 py-1">No faculty members found for the selected department(s).</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 bg-white rounded-xl border border-indigo-200">
                        {faculties
                          .filter((f) => {
                            if (!facultySearch) return true;
                            const q = facultySearch.toLowerCase();
                            return (
                              f.name.toLowerCase().includes(q) ||
                              f.deptName?.toLowerCase().includes(q) ||
                              f.deptKey?.toLowerCase().includes(q) ||
                              (f.staffId && f.staffId.toLowerCase().includes(q))
                            );
                          })
                          .map((f) => {
                            const fid = String(f.staffId || f.id);
                            const isChosen = selectedFacultyIds.includes(fid);
                            return (
                              <button
                                key={fid}
                                type="button"
                                onClick={() => {
                                  setSelectedFacultyIds((prev) =>
                                    isChosen ? prev.filter((x) => x !== fid) : [...prev, fid]
                                  );
                                }}
                                className={`text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition cursor-pointer ${isChosen
                                  ? "border-indigo-600 bg-indigo-50/80 font-bold text-indigo-950 ring-1 ring-indigo-500/30"
                                  : "border-slate-100 hover:border-indigo-200 bg-slate-50/50 text-slate-700"
                                  }`}
                              >
                                <div className="truncate pr-1">
                                  <p className="truncate font-semibold">{f.title || "Dr."} {f.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{f.designation} • {f.deptKey?.toUpperCase()}</p>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold ${isChosen ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                                  {isChosen ? "✓" : "+"}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DEPARTMENT JURISDICTION SELECTION */}
          {isCoeOnly ? (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-start gap-3.5 shadow-xs">
                <div className="p-2.5 bg-[#0B192C] text-[#D4A72C] rounded-xl shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Direct Executive Directive to Controller of Examinations (COE) Office</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold">
                      COE Gate Only
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Department scope and academic jurisdiction selection are bypassed for this memorandum. It will be dispatched exclusively to the Controller of Examinations portal with real-time read-receipt tracking and acknowledgement response capabilities.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <Building2 size={14} className="text-[#0B192C]" />
                    <span>Department Scope & Jurisdiction</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Select which departments receive this memorandum (applies to selected HODs and direct Faculty).
                  </p>
                </div>

                {/* Live DB Refresh Button */}
                <button
                  type="button"
                  onClick={loadDepartments}
                  disabled={loadingDepts}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                  title="Refresh departments from database"
                >
                  <RefreshCw size={12} className={loadingDepts ? "animate-spin" : ""} />
                  <span>{loadingDepts ? "Loading..." : "Sync DB Departments"}</span>
                </button>
              </div>

              {/* Routing Mode Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${routingOption === "ALL_DEPTS"
                    ? "border-[#0B192C] bg-slate-50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="routingOption"
                    value="ALL_DEPTS"
                    checked={routingOption === "ALL_DEPTS"}
                    onChange={() => setRoutingOption("ALL_DEPTS")}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">All Departments</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Broadcast to all active academic departments ({departments.length} disciplines)
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${routingOption === "SINGLE_DEPT"
                    ? "border-[#0B192C] bg-slate-50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="routingOption"
                    value="SINGLE_DEPT"
                    checked={routingOption === "SINGLE_DEPT"}
                    onChange={() => setRoutingOption("SINGLE_DEPT")}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Particular Department Only</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Target a single specific academic discipline
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${routingOption === "SELECTED_DEPTS"
                    ? "border-[#0B192C] bg-slate-50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="routingOption"
                    value="SELECTED_DEPTS"
                    checked={routingOption === "SELECTED_DEPTS"}
                    onChange={() => setRoutingOption("SELECTED_DEPTS")}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800">Multiple Specific Departments</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Hand-pick target departments from the matrix below
                    </p>
                  </div>
                </label>
              </div>

              {/* Single Department Selector */}
              {routingOption === "SINGLE_DEPT" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    Select Target Department:
                  </label>
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
                </div>
              )}

              {/* Multiple Selected Departments Checkboxes */}
              {routingOption === "SELECTED_DEPTS" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Choose Departments ({selectedDeptKeys.length} selected):
                    </span>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedDeptKeys(departments.map((d) => d.key))}
                        className="text-[#0B192C] hover:underline font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDeptKeys([])}
                        className="text-rose-600 hover:underline font-bold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {departments.map((dept) => {
                      const isSelected = selectedDeptKeys.includes(dept.key);
                      return (
                        <div
                          key={dept.key}
                          onClick={() => toggleDeptSelection(dept.key)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${isSelected
                            ? "bg-[#0B192C] text-white border-[#0B192C]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <div className="min-w-0">
                            <p className="font-bold truncate">{dept.code}</p>
                            <p
                              className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-500"
                                }`}
                            >
                              {dept.name}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${isSelected ? "bg-[#D4A72C] text-[#0B192C]" : "border border-slate-300"
                              }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TIMED RELEASE / SCHEDULED SEND OPTION */}
          <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={16} className="text-amber-700" />
                  <span>Timed Circular Release / Scheduled Dispatch (Timer Send)</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Set a specific future date and time for this circular to be published and released automatically.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0B192C]"></div>
              </label>
            </div>

            {isScheduled && (
              <div className="space-y-3 pt-3 border-t border-amber-200/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-800" />
                    <span>Select Dispatch Date & Time:</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-amber-900 uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setTimerPreset(2)}
                      className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300 transition cursor-pointer"
                    >
                      +2 Mins
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimerPreset(5)}
                      className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300 transition cursor-pointer"
                    >
                      +5 Mins
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimerPreset(15)}
                      className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300 transition cursor-pointer"
                    >
                      +15 Mins
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimerPreset(60)}
                      className="px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300 transition cursor-pointer"
                    >
                      +1 Hour
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-amber-300 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white text-slate-800"
                  />
                  {scheduledDateTime && (
                    <div className="text-xs text-purple-900 font-bold bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 flex items-center gap-1.5">
                      <Clock size={12} className="text-purple-700" />
                      <span>Auto-releases {formatCountdown(scheduledDateTime)}</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-amber-800 font-medium">
                  • This circular will be saved in <strong>SCHEDULED</strong> status and automatically activated when the timer threshold is reached.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#0B192C]/20 transition cursor-pointer"
            >
              <Send size={15} />
              <span>{isScheduled ? "Schedule Circular for Release" : "Broadcast Official Memorandum"}</span>
            </button>
          </div>
        </form>
      ) : activeTab === "approvals" ? (
        /* TAB 3: COE CIRCULARS & APPROVALS QUEUE */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-amber-600" />
                  <span>Controller of Examinations (COE) Approvals Queue</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Examination circulars submitted by COE requiring Associate Dean review and official endorsement before publishing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingApprovals.length} Awaiting Sanction
                </span>
              </div>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-800">
                  All COE Circulars are up to date
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  No examination circulars currently require Associate Dean review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((circ) => {
                  const remarks = reviewRemarks[circ.id] || "";
                  const isProcessing = processingId === circ.id;

                  return (
                    <div
                      key={circ.id}
                      className="border-2 border-amber-200 bg-amber-50/20 rounded-2xl p-5 sm:p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-[#0B192C] text-[#D4A72C]">
                            {circ.refNo}
                          </span>
                          <span className="text-xs font-bold text-slate-600">
                            Submitted by: {circ.createdBy?.name} (COE)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(circ.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {circ.subject}
                        </h3>
                        <p className="text-xs text-slate-700 mt-2 whitespace-pre-line leading-relaxed">
                          {circ.message}
                        </p>
                      </div>

                      {/* COE Submission Note / Conversation */}
                      {circ.submissionNotes && (
                        <div className="p-3.5 bg-amber-100/70 border border-amber-300/80 rounded-xl flex items-start gap-3">
                          <MessageSquare size={16} className="text-amber-800 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-bold text-amber-900 block">
                              COE Note to Associate Dean:
                            </span>
                            <p className="text-amber-800 mt-0.5 leading-relaxed">
                              {circ.submissionNotes}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Attachments preview */}
                      {circ.attachments && circ.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {circ.attachments.map((att, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700"
                            >
                              <Paperclip size={12} className="text-amber-600" />
                              <span>{att.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Associate Dean Feedback & Action Bar */}
                      <div className="pt-3 border-t border-amber-100 space-y-3">
                        <label className="text-xs font-bold text-slate-700 block">
                          Associate Dean Endorsement Remarks / Instructions (Optional):
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Approved as per Syndicate regulation. HODs are instructed to ensure strict compliance..."
                          value={remarks}
                          onChange={(e) =>
                            setReviewRemarks((prev) => ({
                              ...prev,
                              [circ.id]: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C] bg-white"
                        />

                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(circ.id, false)}
                            className="px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle size={14} />
                            <span>Request Revisions</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(circ.id, true)}
                            className="px-5 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                          >
                            <CheckSquare size={14} />
                            <span>{isProcessing ? "Processing..." : "Approve & Broadcast to HODs"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COE History / Audited List */}
          {coeCircularsList.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText size={16} className="text-[#0B192C]" />
                <span>All COE Examination Memorandums History ({coeCircularsList.length})</span>
              </h3>

              <div className="divide-y divide-slate-100">
                {coeCircularsList.map((c) => (
                  <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#0B192C]">
                          {c.refNo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "PENDING_DEAN_APPROVAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                            }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 truncate mt-1">
                        {c.status === "DELETED"
                          ? `[Notice Retracted by COE — Subject Withdrawn]`
                          : c.subject}
                      </p>
                      {c.status === "DELETED" && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 mt-1.5">
                          <AlertCircle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-rose-800">
                            COE {c.deletedBy?.name ? `(${c.deletedBy.name})` : ""} retracted and deleted this examination memorandum on {new Date(c.deletedAt || c.createdAt).toLocaleString()}.
                          </span>
                        </div>
                      )}
                      {c.approvalRemarks && (
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                          Dean Remarks: "{c.approvalRemarks}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCircular(c);
                        setIsDialogOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#0B192C] bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: ISSUED CIRCULARS QUEUE & EXECUTIVE METRICS */
        <div className="space-y-6">
          {/* Executive Stat Cards */}
          <CircularMetricStatCards
            counts={filterCounts}
            activeSegment={activeSegment}
            onSegmentChange={setActiveSegment}
            role="DEAN"
          />

          {/* Search & Dynamic Department Filter Bar */}
          <div className="rounded-3xl shadow-sm border border-slate-200 overflow-hidden bg-white">
            <DynamicCircularFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeSegment={activeSegment}
              onSegmentChange={setActiveSegment}
              segments={segments}
              counts={filterCounts}
              onReset={() => {
                setSearchQuery("");
                setActiveSegment("ALL");
                setFilterDept("ALL");
              }}
              hasActiveFilters={Boolean(
                searchQuery || activeSegment !== "ALL" || filterDept !== "ALL"
              )}
              title="Issued Memorandum Queue"
              subtitle="Select any circular to view complete document, attachments, and department responses."
              extraControls={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Filter Dept:</span>
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-700 focus:ring-1 focus:ring-[#0B192C]"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              }
            />

            {/* Circulars List */}
            <div className="p-4 sm:p-6">
              {filteredCirculars.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
                  <FileText size={36} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No circulars match current filters</p>
                  <p className="text-xs text-slate-400">
                    Try clearing search terms or selecting a different department/segment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCirculars.map((circ) => {
                    const hodActionList = Object.values(circ.hodActions || {});
                    const forwardedActions = hodActionList.filter(
                      (a) => a.action === "FORWARDED"
                    );
                    const keptActions = hodActionList.filter(
                      (a) => a.action === "KEPT"
                    );
                    const seenHodActions = hodActionList.filter(
                      (a) => a.action === "SEEN" && !a.hodId?.startsWith("FACULTY-")
                    );
                    const seenFacultyActions = hodActionList.filter(
                      (a) => a.action === "SEEN" && a.hodId?.startsWith("FACULTY-")
                    );

                    const isForwarded = forwardedActions.length > 0;
                    const isKept = keptActions.length > 0;
                    const attCount =
                      circ.attachments && circ.attachments.length > 0
                        ? circ.attachments.length
                        : circ.attachment
                          ? 1
                          : 0;

                    const isCoeCreated = circ.createdBy?.role === "COE";

                    return (
                      <div
                        key={circ.id}
                        onClick={() => {
                          setSelectedCircular(circ);
                          setIsDialogOpen(true);
                        }}
                        className="bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition shadow-xs hover:shadow-md cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-[#0B192C] bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {circ.refNo}
                            </span>

                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${circ.priority === "URGENT"
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : circ.priority === "HIGH"
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}
                            >
                              {circ.priority}
                            </span>

                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                              {circ.category}
                            </span>

                            {isCoeCreated && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                                COE Origin
                              </span>
                            )}

                            {circ.status === "SCHEDULED" && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                                <Clock size={11} className="text-purple-700" />
                                <span>Scheduled ({formatCountdown(circ.scheduledFor)})</span>
                              </span>
                            )}

                            {circ.status === "DELETED" && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                <Trash2 size={11} className="text-rose-600" />
                                <span>Deleted / Revoked</span>
                              </span>
                            )}

                            {circ.status === "PENDING_DEAN_APPROVAL" && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                Pending Dean Review
                              </span>
                            )}

                            {circ.targetAudiences?.includes("COE") && (
                              circ.seenByCoe ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  <span>Seen by COE {circ.seenAt ? `(${new Date(circ.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  <span>Delivered — Unread by COE</span>
                                </span>
                              )
                            )}

                            {circ.targetAudiences && circ.targetAudiences.length > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                Targets: {circ.targetAudiences.join(", ")}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0B192C] transition truncate">
                            {circ.status === "DELETED" && circ.createdBy?.role === "COE"
                              ? `[Notice Retracted — Topic Withdrawn by COE]`
                              : circ.subject}
                          </h3>

                          {circ.status === "DELETED" && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-[10px] uppercase text-rose-700 block">Circular Deleted / Recalled</span>
                                <span className="text-rose-800">
                                  {circ.deletedBy?.role === "COE" ? "COE" : "Associate Dean"} {circ.deletedBy?.name ? `(${circ.deletedBy.name})` : ""} deleted this circular on {new Date(circ.deletedAt || circ.createdAt).toLocaleString()}. This circular is revoked.
                                </span>
                              </div>
                            </div>
                          )}

                          {circ.coeReply && (
                            <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs">
                              <div className="flex items-center justify-between text-indigo-950 font-bold mb-0.5">
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare size={13} className="text-indigo-600" />
                                  <span>COE Official Reply:</span>
                                </span>
                                {circ.coeReplyAt && (
                                  <span className="text-[10px] text-indigo-700 font-medium">
                                    {new Date(circ.coeReplyAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-800 font-medium italic">"{circ.coeReply}"</p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-slate-400" />
                              <span>{new Date(circ.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </span>

                            <span className="flex items-center gap-1">
                              <Building2 size={13} className="text-slate-400" />
                              <span>
                                {circ.routingOption === "ALL_DEPTS"
                                  ? "All Departments"
                                  : circ.targetDepartmentNames?.join(", ") || "Target Departments"}
                              </span>
                            </span>

                            {attCount > 0 && (circ.status !== "DELETED" || circ.createdBy?.role !== "COE") && (
                              <span className="flex items-center gap-1 text-amber-700 font-bold">
                                <Paperclip size={13} />
                                <span>{attCount} file(s)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          {circ.status === "SCHEDULED" && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Release circular "${circ.subject}" immediately to all targets?`)) {
                                  await releaseScheduledCircularNow(circ.id);
                                  onToast ? onToast("Scheduled circular released immediately!") : alert("Circular released!");
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                              title="Override timer and broadcast now"
                            >
                              <Send size={12} />
                              <span>Release Now</span>
                            </button>
                          )}
                          {isForwarded ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                              <CheckCircle2 size={13} />
                              <span>HOD Forwarded ({forwardedActions.map((a) => a.deptKey?.toUpperCase()).join(", ")})</span>
                            </span>
                          ) : isKept ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                              <Check size={13} />
                              <span>Dept Kept ({keptActions.map((a) => a.deptKey?.toUpperCase()).join(", ")})</span>
                            </span>
                          ) : seenHodActions.length > 0 ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-teal-600" />
                              <span>Seen by HOD ({seenHodActions.map((a) => a.deptKey?.toUpperCase()).join(", ")})</span>
                            </span>
                          ) : circ.targetAudiences?.includes("COE") && circ.seenByCoe ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Seen by COE</span>
                            </span>
                          ) : seenFacultyActions.length > 0 ? (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-indigo-600" />
                              <span>Seen by Faculty ({seenFacultyActions[0].hodName})</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                              <Clock size={13} className="text-slate-400" />
                              <span>Delivered — Unread</span>
                            </span>
                          )}

                          {circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete circular "${circ.subject}"?`)) {
                                  if ((await deleteCircular(circ.id)) && onToast) onToast("Circular deleted successfully");
                                }
                              }}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="Delete this circular"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="p-2 rounded-xl bg-slate-100 group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] text-slate-600 transition"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Window */}
      <CircularDialog
        circular={selectedCircular}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userRole="ASSOCIATE_DEAN"
      />
    </div>
  );
};
