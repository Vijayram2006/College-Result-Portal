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
  HelpCircle,
  Pencil,
  Inbox,
  AlertTriangle,
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
  getCircularsForCoe,
  subscribeCirculars,
  fetchDynamicDepartments,
  fetchDynamicFaculties,
  refreshCircularsFromServer,
  updateCircular,
  forwardCircular,
  markCircularSeen,
  replyCircularByCoe,
  deleteCircular,
} from "./circularStore";
import { CircularDialog } from "./CircularDialog";
import { getCircularSegmentConfig } from "./DynamicCircularFilter";

interface CircularCoeViewProps {
  coeName?: string;
  onToast?: (msg: string) => void;
}

export const CircularCoeView: React.FC<CircularCoeViewProps> = ({
  coeName = "Dr. M. Sathish (Controller of Examinations)",
  onToast,
}) => {
  const [circulars, setCirculars] = useState<Circular[]>(() =>
    getCircularsForCoe()
  );
  const [departments, setDepartments] = useState<DepartmentOption[]>(DEFAULT_DEPARTMENTS);
  const [loadingDepts, setLoadingDepts] = useState(false);
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

  // COE Forward Circular state
  const [forwardingCircular, setForwardingCircular] = useState<Circular | null>(null);
  const [forwardRouting, setForwardRouting] = useState<HodRoutingOption>("ALL_DEPTS");
  const [forwardSingleDept, setForwardSingleDept] = useState<string>("cse");
  const [forwardSelectedDepts, setForwardSelectedDepts] = useState<string[]>([]);
  const [forwardAudiences, setForwardAudiences] = useState<CircularTargetAudience[]>(["HOD"]);
  const [forwarding, setForwarding] = useState<boolean>(false);

  // Dialog State
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [coeFilterSegment, setCoeFilterSegment] = useState<"ALL" | "PENDING" | "APPROVED" | "PUBLISHED" | "DELETED">("ALL");
  const [directiveFilterSegment, setDirectiveFilterSegment] = useState<"ALL" | "ACTIVE" | "DELETED">("ALL");

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
      setCirculars(getCircularsForCoe());
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
      alert("Please provide an examination circular subject.");
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

    const isSpecificFaculty = !isApprovalRequired && targetAudiences.includes("FACULTY") && facultyTargetMode === "SPECIFIC_FACULTY";
    if (isSpecificFaculty && selectedFacultyIds.length === 0) {
      alert("Please select at least one faculty member, or choose 'All Faculty in Target Department(s)'.");
      return;
    }

    const selectedFacultyNames = isSpecificFaculty
      ? faculties
        .filter((f) => selectedFacultyIds.includes(String(f.staffId || f.id)))
        .map((f) => `${f.title || "Dr."} ${f.name}`)
      : [];

    let finalTargetAudiences: CircularTargetAudience[] = isApprovalRequired ? ["HOD"] : [...targetAudiences];
    if (!isApprovalRequired && copyDeanFyi && !finalTargetAudiences.includes("COE")) {
      finalTargetAudiences.push("COE");
    }

    await createCircular({
      subject: subject.trim(),
      message: message.trim(),
      category,
      priority,
      targetAudiences: finalTargetAudiences,
      targetFacultyIds: isSpecificFaculty ? selectedFacultyIds : [],
      targetFacultyNames: selectedFacultyNames,
      requiresDeanApproval: isApprovalRequired,
      submissionNotes: (isApprovalRequired || copyDeanFyi) ? submissionNotes.trim() : undefined,
      attachment: attachments[0] || null,
      attachments,
      routingOption: isApprovalRequired ? "ALL_DEPTS" : routingOption,
      targetDepartmentKeys: targetKeys,
      targetDepartmentNames: targetNames,
      createdBy: {
        id: "COE-01",
        name: coeName,
        role: "COE",
      },
    });

    // Reset Form
    setSubject("");
    setMessage("");
    setSubmissionNotes("");
    setAttachments([]);
    setRoutingOption("ALL_DEPTS");
    setSelectedFacultyIds([]);
    setFacultyTargetMode("ALL_DEPT_FACULTY");
    setCopyDeanFyi(false);

    const feedback = isApprovalRequired
      ? "Examination circular submitted to Associate Dean for review & approval!"
      : copyDeanFyi
        ? "Circular broadcast to Department HODs & transmitted to Associate Dean for verification!"
        : "Examination circular published and broadcast directly to Department HODs!";

    if (onToast) {
      onToast(feedback);
    } else {
      alert(feedback);
    }

    setActiveTab("myCirculars");
  };

  const openEditModal = (circ: Circular) => {
    setEditingCircular(circ);
    setEditSubject(circ.subject);
    setEditMessage(circ.message);
    setEditCategory(circ.category);
    setEditPriority(circ.priority);
    setEditSubmissionNotes(circ.submissionNotes || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCircular) return;
    if (!editSubject.trim()) {
      alert("Subject cannot be empty");
      return;
    }
    if (!editMessage.trim()) {
      alert("Message cannot be empty");
      return;
    }
    try {
      setEditSubmitting(true);
      await updateCircular(editingCircular.id, {
        subject: editSubject.trim(),
        message: editMessage.trim(),
        category: editCategory,
        priority: editPriority,
        submissionNotes: editSubmissionNotes.trim(),
      });
      setEditingCircular(null);
      if (onToast) onToast("Circular updated successfully!");
    } catch (err: any) {
      alert("Failed to update circular: " + (err?.message || "Unknown error"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const openForwardModal = (circ: Circular) => {
    setForwardingCircular(circ);
    setForwardRouting(circ.routingOption || "ALL_DEPTS");
    setForwardSingleDept(circ.targetDepartmentKeys?.[0] || "cse");
    setForwardSelectedDepts(circ.targetDepartmentKeys || []);
    setForwardAudiences(["HOD"]);
  };

  const handleForwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forwardingCircular) return;

    let targetKeys: string[] = [];
    let targetNames: string[] = [];

    if (forwardRouting === "ALL_DEPTS") {
      targetKeys = departments.map((d) => d.key);
      targetNames = departments.map((d) => d.name);
    } else if (forwardRouting === "SINGLE_DEPT") {
      const d = departments.find((dept) => dept.key === forwardSingleDept);
      targetKeys = [forwardSingleDept];
      targetNames = d ? [d.name] : [forwardSingleDept];
    } else {
      if (forwardSelectedDepts.length === 0) {
        alert("Please select at least one department.");
        return;
      }
      targetKeys = forwardSelectedDepts;
      targetNames = departments
        .filter((d) => forwardSelectedDepts.includes(d.key))
        .map((d) => d.name);
    }

    try {
      setForwarding(true);
      await forwardCircular(forwardingCircular.id, {
        routingOption: forwardRouting,
        targetDepartmentKeys: targetKeys,
        targetDepartmentNames: targetNames,
        targetAudiences: ["HOD"],
      });
      setForwardingCircular(null);
      if (onToast) onToast("Approved circular forwarded to target Department HODs!");
    } catch (err: any) {
      alert("Failed to forward circular: " + (err?.message || "Unknown error"));
    } finally {
      setForwarding(false);
    }
  };

  const handleOpenDeanDirective = async (circ: Circular) => {
    setSelectedCircular(circ);
    setIsDialogOpen(true);
    setCoeReplyInput(circ.coeReply || "");
    if (!circ.seenByCoe) {
      await markCircularSeen(circ.id);
    }
  };

  const handleSendCoeReply = async (circId: string) => {
    if (!coeReplyInput.trim()) {
      alert("Please enter a reply message.");
      return;
    }
    try {
      setSubmittingReply(true);
      await replyCircularByCoe(circId, coeReplyInput.trim());
      if (onToast) onToast("Official reply transmitted to Associate Dean!");
    } catch (err: any) {
      alert("Failed to send reply: " + (err?.message || "Unknown error"));
    } finally {
      setSubmittingReply(false);
    }
  };

  const myIssuedCirculars = useMemo(() => {
    return circulars.filter((c) => c.createdBy?.role === "COE");
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
      {/* COE Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#D4A72C] text-[#0B192C]">
                Office of Controller of Examinations
              </span>
              <span className="text-xs text-amber-300 font-medium">
                Examination Memorandums & Timetable Notifications
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              COE Circular Management & Broadcast Desk
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Publish official examination timetables, QP scrutiny schedules, and valuation circulars to Department HODs. Seamlessly submit directives to the Associate Dean for review or broadcast directly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-4 py-2.5 rounded-2xl text-left w-full sm:w-auto">
              <span className="text-[10px] font-bold uppercase text-amber-400 block">
                Controller of Examinations
              </span>
              <span className="text-xs font-black text-white truncate block max-w-[220px]">
                {coeName}
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
            <span>Associate Dean Directives</span>
            {unseenDirectivesCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {unseenDirectivesCount} NEW
              </span>
            ) : (
              <span className="text-slate-400 font-normal">({deanDirectives.length})</span>
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
                Draft Examination Circular
              </h2>
              <p className="text-xs text-slate-500">
                Define the notification content, target departments, and approval settings for Associate Dean review.
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
                <option value="EXAMINATION">Examination Schedule & Notice</option>
                <option value="ACADEMIC">Academic Directive</option>
                <option value="ADMINISTRATIVE">Administrative Policy</option>
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
              placeholder="e.g. Schedule of Central Valuation & External Examiner Allocation for Semester Examinations..."
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
              placeholder="Provide complete details regarding the examination instructions, timeline, and requirements..."
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
                <span>Attach Files (Time Tables, Regulations, Circular PDF)</span>
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
                  Supports multiple PDF, DOCX, XLSX documents
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

          {/* APPROVAL SETTING (2-PATHWAY GOVERNANCE MATRIX) */}
          <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-700" />
                <span>Executive Governance & Associate Dean Endorsement</span>
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Select the administrative pathway for this examination circular:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${approvalMode === "REQUIRE_APPROVAL"
                  ? "border-amber-600 bg-white font-bold text-amber-950 shadow-xs ring-1 ring-amber-500/30"
                  : "border-amber-200 bg-white/70 text-slate-700 hover:bg-white"
                  }`}
              >
                <input
                  type="radio"
                  name="coeApprovalMode"
                  value="REQUIRE_APPROVAL"
                  checked={approvalMode === "REQUIRE_APPROVAL"}
                  onChange={() => setApprovalMode("REQUIRE_APPROVAL")}
                  className="mt-0.5 text-amber-600"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Require Associate Dean Approval & Sanction</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                    Standard Academic Governance: Submits directly to Associate Dean for institutional review. Hides target audience and department routing until sanctioned.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${approvalMode === "DIRECT_DISPATCH"
                  ? "border-amber-600 bg-white font-bold text-amber-950 shadow-xs ring-1 ring-amber-500/30"
                  : "border-amber-200 bg-white/70 text-slate-700 hover:bg-white"
                  }`}
              >
                <input
                  type="radio"
                  name="coeApprovalMode"
                  value="DIRECT_DISPATCH"
                  checked={approvalMode === "DIRECT_DISPATCH"}
                  onChange={() => setApprovalMode("DIRECT_DISPATCH")}
                  className="mt-0.5 text-amber-600"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Direct Autonomous Broadcast to HODs</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                    Self-Sanctioned Emergency/Exam Notice: Dispatches immediately to target Department HODs without prior Dean approval.
                  </p>
                  {approvalMode === "DIRECT_DISPATCH" && (
                    <div
                      className="mt-2.5 pt-2 border-t border-amber-200/60"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 text-[11px]">
                        <input
                          type="checkbox"
                          checked={copyDeanFyi}
                          onChange={(e) => setCopyDeanFyi(e.target.checked)}
                          className="rounded text-amber-600"
                        />
                        <span>Transmit verification copy to Associate Dean (FYI Record)</span>
                      </label>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {(approvalMode === "REQUIRE_APPROVAL" || copyDeanFyi) && (
              <div className="space-y-2 pt-2 border-t border-amber-200/60">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-amber-800" />
                  <span>Submission Note / Justification to Associate Dean:</span>
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    approvalMode === "REQUIRE_APPROVAL"
                      ? "e.g. Submitted for Dean's approval as per Syndicate circular dated 02/11/2026. Hall capacity and examiner ratios verified..."
                      : "e.g. Broadcast for examination schedule; transmitted to Associate Dean desk for official record..."
                  }
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
                    Select where this examination notice should be delivered.
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
                        Broadcast to Heads of Department for action and faculty assignment
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

                {/* Dynamic Specific Faculty Selector (When Faculty is targeted) */}
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
                          name="coeFacultyTargetMode"
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
                          name="coeFacultyTargetMode"
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
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <Building2 size={14} className="text-[#0B192C]" />
                  <span>Department Routing</span>
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
                        All engineering departments
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
                        {d.name} ({d.code})
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
              className="px-6 py-3 rounded-2xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#0B192C]/20 transition cursor-pointer"
            >
              <Send size={15} />
              <span>
                {approvalMode === "REQUIRE_APPROVAL"
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
                      onClick={() => {
                        setSelectedCircular(circ);
                        setIsDialogOpen(true);
                      }}
                      className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer space-y-3 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                            {circ.refNo}
                          </span>

                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              Pending Dean Review
                            </span>
                          )}

                          {isApprovedByDean && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-indigo-600" />
                              <span>Approved by Associate Dean — Ready to Forward</span>
                            </span>
                          )}

                          {isPublished && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Dispatched & Published to HODs</span>
                            </span>
                          )}

                          {isRejected && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <AlertCircle size={11} className="text-rose-600" />
                              <span>Revision Required (Rejected by Dean)</span>
                            </span>
                          )}

                          {circ.status === "DELETED" && (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
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
                          {/* EDIT BUTTON: Enabled for Pending, Approved, Published, or Rejected */}
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

                          {/* FORWARD BUTTON: Visible ONLY when Associate Dean Approves */}
                          {isApprovedByDean && circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openForwardModal(circ);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                            >
                              <Send size={13} />
                              <span>Forward to Department HODs</span>
                            </button>
                          )}

                          {/* DELETE BUTTON for COE */}
                          {circ.status !== "DELETED" && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete circular "${circ.subject}"?`)) {
                                  await deleteCircular(circ.id);
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
                          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                            <span>Associate Dean Rejection Remarks & Action Required</span>
                          </div>
                          <p className="text-xs text-rose-800 font-medium italic pl-6">
                            "{circ.approvalRemarks || "Revisions requested by Associate Dean before release."}"
                          </p>
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

                        {circ.approvalRemarks && !isRejected ? (
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                              Associate Dean Endorsement:
                            </span>
                            <p className="text-emerald-900 mt-0.5 font-semibold">
                              "{circ.approvalRemarks}"
                            </p>
                            {circ.approvedAt && (
                              <span className="text-[10px] text-emerald-700 block mt-1">
                                Approved on {new Date(circ.approvedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>
                        ) : isPending ? (
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                            Awaiting review by Associate Dean...
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
                Directives and institutional guidelines routed strictly to the Examination Cell.
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
                  Directives and memos routed to COE by the Associate Dean will appear here.
                </p>
              </div>
            ) : (
              filteredDeanDirectives.map((circ) => (
                <div
                  key={circ.id}
                  onClick={() => handleOpenDeanDirective(circ)}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#0B192C]">
                        {circ.refNo}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {circ.category}
                      </span>
                      {circ.seenByCoe ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Seen by COE {circ.seenAt ? `(${new Date(circ.seenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ""}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" />
                          <span>Delivered — Unread</span>
                        </span>
                      )}

                      {circ.status === "DELETED" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <Trash2 size={11} className="text-rose-600" />
                          <span>DELETED / RECALLED</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(circ.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">
                    {circ.status === "DELETED"
                      ? `[Notice Retracted — Directive Withdrawn by Associate Dean]`
                      : circ.subject}
                  </h4>
                  {circ.status !== "DELETED" && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {circ.message}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Issued by: <strong className="text-slate-800">{circ.createdBy?.name || "Associate Dean"}</strong></span>
                    <span>•</span>
                    <span>Priority: <strong className={`font-bold ${circ.priority === "URGENT" ? "text-rose-600" : circ.priority === "HIGH" ? "text-amber-600" : "text-slate-600"}`}>{circ.priority}</strong></span>
                  </div>

                  {/* DELETED DIRECTIVE NOTICE */}
                  {circ.status === "DELETED" && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                      <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[10px] uppercase text-rose-700 block">Directive Recalled / Deleted</span>
                        <span className="text-rose-800 leading-relaxed">
                          Associate Dean {circ.deletedBy?.name ? `(${circ.deletedBy.name})` : ""} deleted this circular on {new Date(circ.deletedAt || circ.createdAt).toLocaleString()}. This directive has been officially retracted.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* COE Reply Trail or Input */}
                  {circ.status !== "DELETED" && (
                    <div className="pt-2 border-t border-slate-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {circ.coeReply ? (
                        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 font-medium">
                          <span className="font-bold block text-[10px] uppercase text-indigo-800">My Response to Associate Dean:</span>
                          <p className="italic mt-0.5">"{circ.coeReply}"</p>
                          {circ.coeReplyAt && (
                            <span className="text-[10px] text-indigo-600 block mt-1">
                              Replied on {new Date(circ.coeReplyAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-[#0B192C]" />
                            <span>Reply to Associate Dean (Optional):</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. Received & noted. Scrutiny schedules updated..."
                              value={coeReplyInput}
                              onChange={(e) => setCoeReplyInput(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-[#0B192C]"
                            />
                            <button
                              type="button"
                              disabled={submittingReply}
                              onClick={() => handleSendCoeReply(circ.id)}
                              className="px-4 py-1.5 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <Send size={12} />
                              <span>{submittingReply ? "Sending..." : "Reply"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FORWARD CIRCULAR MODAL (When Approved by Dean) */}
      {forwardingCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
                  {forwardingCircular.refNo}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Forward Approved Circular to HODs
                </h3>
              </div>
              <button
                onClick={() => setForwardingCircular(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 font-medium">
              <span className="font-bold block text-indigo-900">Approved by Associate Dean:</span>
              <span>"{forwardingCircular.approvalRemarks || "Sanctioned for distribution."}"</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Department Routing:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${forwardRouting === "ALL_DEPTS"
                      ? "border-[#0B192C] bg-slate-50 font-bold text-[#0B192C]"
                      : "border-slate-200 text-slate-700"
                      }`}
                  >
                    <input
                      type="radio"
                      name="modalForwardRouting"
                      checked={forwardRouting === "ALL_DEPTS"}
                      onChange={() => setForwardRouting("ALL_DEPTS")}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">All Departments</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Broadcast to all {departments.length} HODs
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${forwardRouting === "SINGLE_DEPT"
                      ? "border-[#0B192C] bg-slate-50 font-bold text-[#0B192C]"
                      : "border-slate-200 text-slate-700"
                      }`}
                  >
                    <input
                      type="radio"
                      name="modalForwardRouting"
                      checked={forwardRouting === "SINGLE_DEPT"}
                      onChange={() => setForwardRouting("SINGLE_DEPT")}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">Particular Dept</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      One specific department
                    </span>
                  </label>

                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${forwardRouting === "SELECTED_DEPTS"
                      ? "border-[#0B192C] bg-slate-50 font-bold text-[#0B192C]"
                      : "border-slate-200 text-slate-700"
                      }`}
                  >
                    <input
                      type="radio"
                      name="modalForwardRouting"
                      checked={forwardRouting === "SELECTED_DEPTS"}
                      onChange={() => setForwardRouting("SELECTED_DEPTS")}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">Selected Depts</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Choose multiple
                    </span>
                  </label>
                </div>
              </div>

              {forwardRouting === "SINGLE_DEPT" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Choose Department:</label>
                  <select
                    value={forwardSingleDept}
                    onChange={(e) => setForwardSingleDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.name} ({d.code}) — HOD: {d.hodName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {forwardRouting === "SELECTED_DEPTS" && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Choose Target Departments ({forwardSelectedDepts.length} selected):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {departments.map((dept) => {
                      const isSel = forwardSelectedDepts.includes(dept.key);
                      return (
                        <div
                          key={dept.key}
                          onClick={() => {
                            setForwardSelectedDepts((prev) =>
                              isSel ? prev.filter((k) => k !== dept.key) : [...prev, dept.key]
                            );
                          }}
                          className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${isSel
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

              {/* Audience Notice: Forwarded strictly to Department HODs */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Users size={14} className="text-amber-700 shrink-0" />
                <span className="font-semibold">
                  Approved circular is forwarded strictly to the Heads of Department (HODs) of the selected branches.
                </span>
              </div>
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
                disabled={forwarding}
                onClick={handleForwardSubmit}
                className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0B192C]/20 transition cursor-pointer"
              >
                <Send size={14} />
                <span>{forwarding ? "Forwarding..." : "Confirm & Dispatch Circular"}</span>
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

            <form onSubmit={handleSaveEdit} className="space-y-4">
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
                    <option value="MEETING">Meeting</option>
                    <option value="EVENT">Event</option>
                    <option value="EMERGENCY">Emergency</option>
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
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="NORMAL">Normal</option>
                    <option value="LOW">Low</option>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C]"
                  required
                />
              </div>

              {editingCircular.status === "PENDING_DEAN_APPROVAL" && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Submission Note to Associate Dean
                  </label>
                  <input
                    type="text"
                    value={editSubmissionNotes}
                    onChange={(e) => setEditSubmissionNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-1 focus:ring-[#0B192C]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCircular(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-900 text-[#D4A72C] text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#0B192C]/20 transition cursor-pointer"
                >
                  <Check size={14} />
                  <span>{editSubmitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog Window */}
      <CircularDialog
        circular={selectedCircular}
        isOpen={isDialogOpen}
        userRole="COE"
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedCircular(null);
        }}
      />
    </div>
  );
};

