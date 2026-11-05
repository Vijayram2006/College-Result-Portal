import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Paperclip,
  FileText,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Search,
  ArrowRight,
  ShieldAlert,
  Building2,
  GraduationCap,
  Sparkles,
  Inbox,
  Send,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { grievanceApi } from "@/services/api";
import {
  GrievanceDetailDTO,
  GrievanceStatus,
  GrievanceSummaryDTO,
  RecipientCategory,
} from "./GrievanceTypes";
import { GrievanceDialog } from "./GrievanceDialog";
import { toast } from "sonner";

interface GrievanceReviewViewProps {
  role: "FACULTY" | "HOD" | "DEAN";
}

export const GrievanceReviewView: React.FC<GrievanceReviewViewProps> = ({ role }) => {
  const [grievances, setGrievances] = useState<GrievanceSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | GrievanceStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pop-up dialog state
  const [selectedDetail, setSelectedDetail] = useState<GrievanceDetailDTO | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 48-Hour Alert Pop-up for ADEAN
  const [alertGrievances, setAlertGrievances] = useState<GrievanceSummaryDTO[]>([]);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      let list: GrievanceSummaryDTO[] = [];
      if (role === "FACULTY") {
        list = await grievanceApi.getFacultyGrievances();
      } else if (role === "HOD") {
        list = await grievanceApi.getHodGrievances();
      } else {
        list = await grievanceApi.getDeanGrievances();

        // Check for 48-hr pending grievances for ADEAN
        try {
          const overdue = await grievanceApi.getDeanPendingAlerts();
          if (overdue && overdue.length > 0) {
            setAlertGrievances(overdue);
            setIsAlertModalOpen(true);
          }
        } catch (e) {
          console.error("Failed to fetch pending alerts", e);
        }
      }
      setGrievances(list || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load grievances");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleOpenDetail = async (id: number) => {
    setSelectedDetail(null);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      let detail: GrievanceDetailDTO;
      if (role === "FACULTY") {
        detail = await grievanceApi.getFacultyGrievanceDetail(id);
      } else if (role === "HOD") {
        detail = await grievanceApi.getHodGrievanceDetail(id);
      } else {
        detail = await grievanceApi.getDeanGrievanceDetail(id);
      }
      setSelectedDetail(detail);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load grievance details");
      setIsDetailOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const pendingCount = grievances.filter(
    (g) => g.status === "WAITING" && g.currentHandlerRole === role
  ).length;

  const counts = {
    ALL: grievances.length,
    WAITING: grievances.filter((g) => g.status?.toUpperCase() === "WAITING").length,
    APPROVED: grievances.filter((g) => g.status?.toUpperCase() === "APPROVED").length,
    REJECTED: grievances.filter((g) => g.status?.toUpperCase() === "REJECTED").length,
  };

  const filteredGrievances = useMemo(() => {
    return grievances.filter((g) => {
      const matchesStatus = statusFilter === "ALL" || g.status?.toUpperCase() === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.subject?.toLowerCase().includes(q) ||
        g.refId?.toLowerCase().includes(q) ||
        g.studentName?.toLowerCase().includes(q) ||
        g.regNo?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [grievances, statusFilter, searchQuery]);

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
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Waiting
          </span>
        );
    }
  };

  const getStageBadge = (item: GrievanceSummaryDTO) => {
    if (item.status !== "WAITING") return null;
    if (role === "FACULTY" && item.currentHandlerRole === "HOD") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Send className="w-3 h-3 text-blue-600" /> Forwarded to HOD
        </span>
      );
    }
    if ((role === "FACULTY" || role === "HOD") && item.currentHandlerRole === "DEAN") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Send className="w-3 h-3 text-purple-600" /> Forwarded to Dean
        </span>
      );
    }
    if (item.currentHandlerRole === role) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
          ● Action Required
        </span>
      );
    }
    return null;
  };

  const roleTitle =
    role === "FACULTY"
      ? "Faculty Grievance Desk"
      : role === "HOD"
        ? "Department HOD Oversight"
        : "Associate Dean Executive Review";

  const roleSubtitle =
    role === "FACULTY"
      ? "FACULTY & CLASS INCHARGE WORKSPACE"
      : role === "HOD"
        ? "HEAD OF DEPARTMENT JURISDICTION"
        : "COLLEGE-WIDE ESCALATION AUTHORITY";

  return (
    <div className="w-full max-w-7xl space-y-6">
      {/* Executive University Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B192C] via-[#0F2238] to-[#1E3A5F] text-white p-7 sm:p-9 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#D4A72C]/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-[#D4A72C] text-[#0B192C] shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> {roleSubtitle}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white shadow-xs">
                  {pendingCount} Awaiting Your Action
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {roleTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {role === "FACULTY" && "Review, resolve, or forward departmental complaints submitted by enrolled students."}
              {role === "HOD" && "Review department grievances. Unaddressed complaints auto-escalate to Associate Dean after 24 hours."}
              {role === "DEAN" && "Final executive authority on escalated grievances across all engineering departments."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-10 px-4 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Inbox
            </Button>
          </div>
        </div>
      </div>

      {/* 24-Hour SLA Callout for HOD */}
      {role === "HOD" && (
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-blue-900 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-sm text-blue-950">24-Hour Review Protocol</h4>
            <p className="text-blue-700 leading-relaxed">
              Grievances routed to HOD must be resolved or forwarded within <strong>24 hours</strong>. If left unattended beyond 24 hours, the system automatically escalates the grievance directly to the Associate Dean.
            </p>
          </div>
        </div>
      )}

      {/* 48-Hour Oversight Protocol Callout for ADEAN */}
      {role === "DEAN" && (
        <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/90 to-fuchsia-50/50 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-purple-900 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0 shadow-2xs">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-sm text-purple-950">48-Hour Oversight Protocol</h4>
            <p className="text-purple-700 leading-relaxed">
              Grievances pending for <strong>48 hours</strong> at the Associate Dean level trigger high-priority alerts upon login. As Associate Dean, decisions on these escalated matters are <strong>final</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total in Queue</span>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{counts.ALL}</div>
          <p className="text-[11px] text-slate-500 font-medium">All department records</p>
        </div>

        <div className="p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">Action Required</span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-800">{pendingCount}</div>
          <p className="text-[11px] text-amber-700 font-medium">Awaiting your decision</p>
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
          <p className="text-[11px] text-rose-700 font-medium">Declined</p>
        </div>
      </div>

      {/* Main Review Card */}
      <Card className="rounded-3xl shadow-sm border border-slate-200 overflow-hidden bg-white">
        <CardHeader className="p-6 sm:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Grievances Queue</span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {filteredGrievances.length} displayed
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Select any student grievance to inspect full descriptions, attachments, previous handler remarks, and take action.
            </CardDescription>
          </div>

          {/* Interactive Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search student, reg no, ref..."
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
              <p className="text-xs font-semibold text-slate-600">Loading grievance inbox...</p>
            </div>
          ) : filteredGrievances.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8 space-y-3 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                <Inbox className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-bold text-slate-900">
                  {searchQuery || statusFilter !== "ALL"
                    ? "No matching grievances found"
                    : "No grievances pending in queue"}
                </h3>
                <p className="text-xs text-slate-500">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Try adjusting your search criteria or filter tabs."
                    : "There are currently no active grievances assigned to your review queue."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGrievances.map((item) => {
                const isActionable = item.status === "WAITING" && item.currentHandlerRole === role;
                const initials = (item.studentName || "ST")
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenDetail(item.id)}
                    className={`group relative p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isActionable
                        ? "border-amber-300/80 bg-amber-50/20 hover:border-amber-400 hover:shadow-md"
                        : "border-slate-200/90 bg-white hover:border-[#0B192C]/40 hover:shadow-md"
                      }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Student Initials Avatar */}
                      <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] font-black text-sm flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
                        {initials}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                            {item.refId}
                          </span>
                          {getStatusBadge(item.status)}
                          {getCategoryBadge(item.recipientCategory)}
                          {getStageBadge(item)}
                          {item.autoForwarded && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <Clock className="w-3 h-3 text-amber-600" /> Auto-forwarded (24h)
                            </span>
                          )}
                          {item.hasAttachment && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Paperclip className="w-3 h-3 text-slate-500" /> Attachment
                            </span>
                          )}
                          <span className="text-[11px] font-semibold text-slate-400 ml-auto md:ml-0">
                            {item.createdAt}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#0B192C] transition-colors truncate">
                          {item.subject}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Student: <strong className="text-slate-800 font-bold">{item.studentName}</strong>{" "}
                            <span className="font-mono text-slate-500 font-semibold">({item.regNo})</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            Dept: <strong className="text-slate-700 uppercase">{item.deptKey}</strong>
                          </span>
                          {(item.currentHandlerName || item.handlerName) && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>
                                Current Handler: <strong className="text-slate-700">{item.currentHandlerName || item.handlerName}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <Button
                        size="sm"
                        variant={isActionable ? "default" : "outline"}
                        className={`h-9 text-xs font-bold gap-1.5 rounded-xl ${isActionable
                            ? "bg-[#0B192C] hover:bg-[#152744] text-white shadow-xs"
                            : "text-slate-700"
                          }`}
                      >
                        {isActionable ? "Take Action" : "View Record"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pop-up Dialog for Individual Grievance */}
      <GrievanceDialog
        grievance={selectedDetail}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        userRole={role}
        loading={loadingDetail}
        onActionComplete={loadData}
      />

      {/* 48-Hour Alert Notification Pop-up for Associate Dean */}
      {role === "DEAN" && (
        <Dialog open={isAlertModalOpen} onOpenChange={setIsAlertModalOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-rose-900">
                    High Priority SLA Notice
                  </DialogTitle>
                  <p className="text-[11px] text-rose-600 font-extrabold uppercase tracking-wider">
                    48+ Hours Unresolved
                  </p>
                </div>
              </div>
              <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
                The following escalated grievances have been pending review at the Associate Dean level for over 48 hours without resolution:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-3 max-h-64 overflow-y-auto">
              {alertGrievances.map((ag) => (
                <div
                  key={ag.id}
                  onClick={() => {
                    setIsAlertModalOpen(false);
                    handleOpenDetail(ag.id);
                  }}
                  className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-rose-900 bg-white px-2 py-0.5 rounded border border-rose-200">
                      {ag.refId}
                    </span>
                    <span className="text-[11px] text-rose-700 font-extrabold bg-rose-200/80 px-2 py-0.5 rounded-full">
                      Overdue 48h+
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">{ag.subject}</p>
                  <p className="text-[11px] text-slate-500">
                    Student: <strong className="text-slate-700">{ag.studentName}</strong> ({ag.regNo}) • Dept: {ag.deptKey}
                  </p>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAlertModalOpen(false)}
                className="w-full text-xs font-bold rounded-xl h-10 border-slate-300 text-slate-700"
              >
                Acknowledge & Close Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
