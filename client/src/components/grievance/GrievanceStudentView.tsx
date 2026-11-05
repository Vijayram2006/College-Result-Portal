import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Paperclip,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Building2,
  ArrowRight,
  ShieldCheck,
  UploadCloud,
  FileCheck2,
  Sparkles,
  GraduationCap,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { grievanceApi } from "@/services/api";
import {
  GrievanceDetailDTO,
  GrievanceStatus,
  GrievanceSummaryDTO,
  RecipientDTO,
  RecipientCategory,
} from "./GrievanceTypes";
import { GrievanceDialog } from "./GrievanceDialog";
import { toast } from "sonner";

export const GrievanceStudentView: React.FC = () => {
  const [grievances, setGrievances] = useState<GrievanceSummaryDTO[]>([]);
  const [recipients, setRecipients] = useState<RecipientDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | GrievanceStatus>("ALL");

  // New Grievance Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recipientCategory, setRecipientCategory] = useState<RecipientCategory>("CLASS_FACULTY");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Pop-up Dialog
  const [selectedDetail, setSelectedDetail] = useState<GrievanceDetailDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [list, recs] = await Promise.all([
        grievanceApi.getMyGrievances().catch((e) => {
          console.error("Failed to load student grievances", e);
          return [];
        }),
        grievanceApi.getRecipients().catch((e) => {
          console.error("Failed to load recipients", e);
          return [];
        }),
      ]);
      setGrievances(list || []);
      setRecipients(recs || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load grievances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (id: number) => {
    setSelectedDetail(null);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const detail = await grievanceApi.getStudentGrievanceDetail(id);
      setSelectedDetail(detail);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load grievance details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      toast.error("Please select a recipient (Faculty or HOD)");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please enter what this grievance is about");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your grievance");
      return;
    }

    const recipient = recipients.find((r) => String(r.id) === selectedRecipientId);
    if (!recipient) {
      toast.error("Invalid recipient selected");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("description", description.trim());
      formData.append("sentToRole", recipient.role);
      formData.append("sentToUserId", String(recipient.id));
      formData.append("recipientCategory", recipientCategory);
      if (attachment) {
        formData.append("file", attachment);
      }
      await grievanceApi.createGrievance(formData);
      toast.success("Grievance raised successfully!");
      setIsNewModalOpen(false);
      setSubject("");
      setDescription("");
      setSelectedRecipientId("");
      setRecipientCategory("CLASS_FACULTY");
      setAttachment(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to submit grievance");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const counts = {
    ALL: grievances.length,
    WAITING: grievances.filter((g) => g.status?.toUpperCase() === "WAITING").length,
    APPROVED: grievances.filter((g) => g.status?.toUpperCase() === "APPROVED").length,
    REJECTED: grievances.filter((g) => g.status?.toUpperCase() === "REJECTED").length,
  };

  // Filtered List
  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      const matchesStatus = statusFilter === "ALL" || g.status?.toUpperCase() === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.subject?.toLowerCase().includes(q) ||
        g.refId?.toLowerCase().includes(q) ||
        g.deptKey?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [grievances, statusFilter, searchQuery]);

  const hodRecipients = useMemo(() => recipients.filter((r) => r.role === "HOD"), [recipients]);
  const facultyRecipients = useMemo(() => recipients.filter((r) => r.role !== "HOD"), [recipients]);

  const filteredRecipients = useMemo(() => {
    switch (recipientCategory) {
      case "HOD":
        return hodRecipients.length > 0 ? hodRecipients : recipients;
      case "CLASS_FACULTY":
      case "SUBJECT_FACULTY":
      case "MENTOR":
      default:
        return facultyRecipients.length > 0 ? facultyRecipients : recipients;
    }
  }, [recipientCategory, recipients, hodRecipients, facultyRecipients]);

  const handleCategoryChange = (cat: RecipientCategory) => {
    setRecipientCategory(cat);
    if (cat === "HOD") {
      const hod = hodRecipients[0];
      if (hod) {
        setSelectedRecipientId(String(hod.id));
      } else if (recipients.length > 0) {
        setSelectedRecipientId(String(recipients[0].id));
      }
    } else {
      if (facultyRecipients.length > 0) {
        setSelectedRecipientId(String(facultyRecipients[0].id));
      } else if (recipients.length > 0) {
        setSelectedRecipientId(String(recipients[0].id));
      }
    }
  };

  const getCategoryBadge = (cat?: RecipientCategory) => {
    switch (cat) {
      case "HOD":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-500/10 border border-amber-300/50 px-2 py-0.5 rounded-md">
            <Building2 className="w-3 h-3 text-amber-600" /> HOD Direct
          </span>
        );
      case "SUBJECT_FACULTY":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-500/10 border border-indigo-300/50 px-2 py-0.5 rounded-md">
            <BookOpen className="w-3 h-3 text-indigo-600" /> Subject Faculty
          </span>
        );
      case "MENTOR":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-300/50 px-2 py-0.5 rounded-md">
            <UserCheck className="w-3 h-3 text-emerald-600" /> Mentor Faculty
          </span>
        );
      case "CLASS_FACULTY":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-500/10 border border-blue-300/50 px-2 py-0.5 rounded-md">
            <GraduationCap className="w-3 h-3 text-blue-600" /> Class Faculty
          </span>
        );
    }
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      case "WAITING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> In Review
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-7xl space-y-6">
      {/* Executive University Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B192C] via-[#0F2238] to-[#1E3A5F] text-white p-7 sm:p-9 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#D4A72C]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-[#D4A72C] text-[#0B192C] shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" /> Official Redressal Desk
              </span>
              <span className="text-xs text-slate-300 font-medium">Department Level</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Student Grievance Redressal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Submit formal complaints or academic inquiries directly to your department's Class Incharge or Head of Department. Every grievance is securely tracked with time-stamped audit trails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-10 px-4 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsNewModalOpen(true)}
              className="h-10 px-5 text-xs font-black bg-[#D4A72C] hover:bg-[#C29624] text-[#0B192C] shadow-lg transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Raise New Grievance
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Filed</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.ALL}</div>
          <p className="text-[11px] text-slate-500 font-medium">Cumulative requests</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">Under Review</span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-800">{counts.WAITING}</div>
          <p className="text-[11px] text-amber-700 font-medium">Awaiting action</p>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">{counts.APPROVED}</div>
          <p className="text-[11px] text-emerald-700 font-medium">Resolved in favor</p>
        </div>

        <div className="p-5 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/70 to-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800">{counts.REJECTED}</div>
          <p className="text-[11px] text-rose-700 font-medium">Declined or closed</p>
        </div>
      </div>

      {/* Main Container Card */}
      <Card className="rounded-3xl shadow-sm border border-slate-200 overflow-hidden bg-white">
        <CardHeader className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>My Grievance History</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {filteredGrievances.length} shown
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Select any grievance card to review administrative responses, stage escalation, and download attachments.
            </CardDescription>
          </div>

          {/* Interactive Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by about, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-1 focus-visible:ring-[#0B192C]"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center p-1 bg-slate-100/90 rounded-xl">
              {(["ALL", "WAITING", "APPROVED", "REJECTED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${statusFilter === filter
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()} ({counts[filter]})
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B192C]" />
              <p className="text-xs font-semibold text-slate-600">Fetching grievance records...</p>
            </div>
          ) : filteredGrievances.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8 space-y-3 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-bold text-slate-900">
                  {searchQuery || statusFilter !== "ALL"
                    ? "No matching grievances found"
                    : "No grievances raised yet"}
                </h3>
                <p className="text-xs text-slate-500">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Try adjusting your search keywords or filter settings."
                    : "Have an issue regarding classroom facilities, attendance discrepancy, or examinations? Submit a formal grievance to your department."}
                </p>
              </div>
              {!searchQuery && statusFilter === "ALL" && (
                <Button
                  size="sm"
                  onClick={() => setIsNewModalOpen(true)}
                  className="mt-2 text-xs font-bold gap-1.5 bg-[#0B192C] hover:bg-[#152744] text-white rounded-xl shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Raise Your First Grievance
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGrievances.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item.id)}
                  className="group relative p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#0B192C]/40 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.refId}
                      </span>
                      {getStatusBadge(item.status)}
                      {getCategoryBadge(item.recipientCategory)}
                      {item.hasAttachment && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Paperclip className="w-3 h-3 text-slate-500" /> Attachment
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-400">
                        {item.createdAt}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#0B192C] transition-colors truncate">
                      {item.subject}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dept: <strong className="text-slate-700 uppercase">{item.deptKey}</strong></span>
                      {(item.currentHandlerName || item.handlerName) && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>Assigned to: <strong className="text-slate-700">{item.currentHandlerName || item.handlerName}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <span className="text-xs font-extrabold text-[#0B192C] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      View Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Styled Modal: Raise New Grievance */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8">
          <form onSubmit={handleCreate}>
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-black">
                  <Sparkles className="w-4 h-4" />
                </span>
                <DialogTitle className="text-xl font-black text-slate-900">
                  Raise New Grievance
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 pt-1">
                This grievance is securely submitted only to authorized faculty or HOD of your department.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-5">
              {/* Recipient Channel Selection (4 Options) */}
              <div className="space-y-2.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Send Grievance To <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Department isolated</span>
                </label>

                {/* 4 Segmented Option Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("CLASS_FACULTY")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${recipientCategory === "CLASS_FACULTY"
                        ? "border-[#0B192C] bg-[#0B192C] text-white shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <GraduationCap className={`w-3.5 h-3.5 ${recipientCategory === "CLASS_FACULTY" ? "text-[#D4A72C]" : "text-blue-600"}`} />
                      <span>Class Faculty</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${recipientCategory === "CLASS_FACULTY" ? "text-slate-300" : "text-slate-400"}`}>
                      Class Incharge
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange("HOD")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${recipientCategory === "HOD"
                        ? "border-[#0B192C] bg-[#0B192C] text-white shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <Building2 className={`w-3.5 h-3.5 ${recipientCategory === "HOD" ? "text-[#D4A72C]" : "text-amber-600"}`} />
                      <span>HOD</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${recipientCategory === "HOD" ? "text-slate-300" : "text-slate-400"}`}>
                      Department Head
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange("SUBJECT_FACULTY")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${recipientCategory === "SUBJECT_FACULTY"
                        ? "border-[#0B192C] bg-[#0B192C] text-white shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <BookOpen className={`w-3.5 h-3.5 ${recipientCategory === "SUBJECT_FACULTY" ? "text-[#D4A72C]" : "text-indigo-600"}`} />
                      <span>Subject Faculty</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${recipientCategory === "SUBJECT_FACULTY" ? "text-slate-300" : "text-slate-400"}`}>
                      Course Teachers
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCategoryChange("MENTOR")}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${recipientCategory === "MENTOR"
                        ? "border-[#0B192C] bg-[#0B192C] text-white shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-extrabold text-xs">
                      <UserCheck className={`w-3.5 h-3.5 ${recipientCategory === "MENTOR" ? "text-[#D4A72C]" : "text-emerald-600"}`} />
                      <span>Mentor Faculty</span>
                    </div>
                    <p className={`text-[10px] mt-0.5 ${recipientCategory === "MENTOR" ? "text-slate-300" : "text-slate-400"}`}>
                      Assigned Mentor
                    </p>
                  </button>
                </div>

                {/* Specific Recipient Selection or Direct Channel Notice */}
                {recipientCategory === "HOD" ? (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-300/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>
                        Recipient: <strong className="text-amber-900 font-bold">{hodRecipients[0]?.name || "Head of Department"}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900">
                      Direct HOD Escalation
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <select
                      value={selectedRecipientId}
                      onChange={(e) => setSelectedRecipientId(e.target.value)}
                      className="w-full text-xs h-10 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-800 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0B192C] cursor-pointer"
                      required
                    >
                      <option value="">
                        {recipientCategory === "CLASS_FACULTY"
                          ? "-- Select Class Faculty / Incharge --"
                          : recipientCategory === "SUBJECT_FACULTY"
                            ? "-- Select Subject Faculty --"
                            : "-- Select Mentor Faculty --"}
                      </option>
                      {filteredRecipients.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          {r.name} {recipientCategory === "CLASS_FACULTY" ? "(Class Incharge)" : recipientCategory === "SUBJECT_FACULTY" ? "(Subject Faculty)" : "(Mentor Faculty)"}
                        </option>
                      ))}
                    </select>

                    {recipientCategory === "MENTOR" && (
                      <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 pt-0.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Ready for Mentor Portal connection. Grievance will route directly to your assigned mentor.</span>
                      </p>
                    )}
                  </div>
                )}

                {recipients.length === 0 && (
                  <p className="text-[11px] text-amber-600 font-medium">
                    No active faculty/HOD found for your department.
                  </p>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    About <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">{subject.length}/180</span>
                </div>
                <Input
                  placeholder="e.g. Lab equipment malfunction / Attendance discrepancy / Infrastructure issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="text-xs h-10 rounded-xl border-slate-300 focus-visible:ring-1 focus-visible:ring-[#0B192C]"
                  maxLength={180}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Detailed Complaint / Message <span className="text-rose-500">*</span>
                </label>
                <Textarea
                  placeholder="Clearly describe your concern, incident details, or request for redressal..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="text-xs rounded-xl border-slate-300 focus-visible:ring-1 focus-visible:ring-[#0B192C] leading-relaxed resize-none"
                  required
                />
              </div>

              {/* Optional Attachment */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Attachment (Optional)</span>
                  <span className="text-[10px] text-slate-400">PDF, PNG, JPG (Max 15 MB)</span>
                </label>
                <div className="relative border border-dashed border-slate-300 rounded-xl p-3 hover:bg-slate-50/70 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex items-center gap-3 pointer-events-none">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {attachment ? <FileCheck2 className="w-5 h-5 text-emerald-600" /> : <UploadCloud className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {attachment ? attachment.name : "Click to attach documentation"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {attachment ? `${(attachment.size / 1024).toFixed(1)} KB selected` : "Supports scanned sheets, screenshots, or receipts"}
                      </p>
                    </div>
                    {attachment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachment(null);
                        }}
                        className="pointer-events-auto text-xs text-rose-600 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
                className="text-xs rounded-xl h-10 px-4 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-black rounded-xl h-10 px-6 bg-[#0B192C] hover:bg-[#152744] text-white shadow-md gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#D4A72C]" /> Submitting...
                  </>
                ) : (
                  <>Submit Grievance</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pop-up Dialog for Detail View */}
      <GrievanceDialog
        grievance={selectedDetail}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        userRole="STUDENT"
        loading={loadingDetail}
        onActionComplete={loadData}
      />
    </div>
  );
};
