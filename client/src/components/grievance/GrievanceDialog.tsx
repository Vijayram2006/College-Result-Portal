import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  GrievanceDetailDTO,
  GrievanceStatus,
  RecipientCategory,
} from "./GrievanceTypes";
import {
  Paperclip,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  Eye,
  Printer,
  AlertCircle,
  Loader2,
  MessageSquare,
  User,
  Building2,
  Calendar,
  GraduationCap,
  BookOpen,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { grievanceApi } from "@/services/api";
import { toast } from "sonner";

interface GrievanceDialogProps {
  grievance: GrievanceDetailDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: "STUDENT" | "FACULTY" | "HOD" | "DEAN" | "ADMIN";
  loading?: boolean;
  onActionComplete?: () => void;
}

export const GrievanceDialog: React.FC<GrievanceDialogProps> = ({
  grievance,
  open,
  onOpenChange,
  userRole,
  loading = false,
  onActionComplete,
}) => {
  const [remarkText, setRemarkText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const isStudent = userRole === "STUDENT";
  const isAwaitingAction = grievance?.status === "WAITING";
  const canAct =
    !isStudent &&
    isAwaitingAction &&
    ((userRole === "FACULTY" && grievance?.currentHandlerRole === "FACULTY") ||
      (userRole === "HOD" && grievance?.currentHandlerRole === "HOD") ||
      ((userRole === "DEAN" || userRole === "ADMIN") &&
        grievance?.currentHandlerRole === "DEAN"));

  const getMimeType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "application/pdf";
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "svg":
        return "image/svg+xml";
      case "txt":
        return "text/plain";
      case "html":
        return "text/html";
      default:
        return "application/octet-stream";
    }
  };

  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-300/50 backdrop-blur-xs shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-800 border border-rose-300/50 backdrop-blur-xs shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
          </span>
        );
      case "WAITING":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 border border-amber-300/50 backdrop-blur-xs shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> In Review
          </span>
        );
    }
  };

  const handleDownload = async () => {
    if (!grievance || !grievance.attachmentName) return;
    try {
      setIsDownloading(true);
      await grievanceApi.downloadAttachment(grievance.id, grievance.attachmentName);
      toast.success("Attachment downloaded successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to download attachment");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!grievance || !grievance.attachmentName) return;
    try {
      setIsPreviewing(true);
      const blob = await grievanceApi.getAttachmentBlob(grievance.id);
      const mimeType = getMimeType(grievance.attachmentName);
      const fileBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(fileBlob);
      const win = window.open(url, "_blank");
      if (!win) {
        toast.error("Please allow pop-ups to preview this document");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to preview attachment");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePrint = async () => {
    if (!grievance || !grievance.attachmentName) return;
    try {
      setIsPrinting(true);
      const blob = await grievanceApi.getAttachmentBlob(grievance.id);
      const mimeType = getMimeType(grievance.attachmentName);
      const fileBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(fileBlob);

      if (mimeType.startsWith("image/")) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Print - ${grievance.attachmentName}</title>
                <style>
                  @page { margin: 1cm; }
                  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: sans-serif; }
                  img { max-width: 100%; max-height: 95vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${url}" onload="window.focus(); window.print();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          toast.error("Please allow pop-ups to print this document");
        }
      } else if (mimeType === "application/pdf") {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              window.open(url, "_blank");
            }
          }, 300);
        };
      } else {
        const printWin = window.open(url, "_blank");
        if (printWin) {
          printWin.focus();
          printWin.print();
        } else {
          toast.error("Please allow pop-ups to print this document");
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to print attachment");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleAction = async (action: "APPROVE" | "REJECT" | "FORWARD") => {
    if (!grievance) return;
    try {
      setIsSubmitting(true);
      if (userRole === "FACULTY") {
        await grievanceApi.facultyAction(grievance.id, {
          action,
          remark: remarkText.trim() || undefined,
        });
      } else if (userRole === "HOD") {
        await grievanceApi.hodAction(grievance.id, {
          action,
          remark: remarkText.trim() || undefined,
        });
      } else if (userRole === "DEAN" || userRole === "ADMIN") {
        await grievanceApi.deanAction(grievance.id, {
          action,
          remark: remarkText.trim() || undefined,
        });
      }

      const actionText =
        action === "APPROVE"
          ? "approved"
          : action === "REJECT"
            ? "rejected"
            : userRole === "FACULTY"
              ? "forwarded to HOD"
              : "forwarded to Associate Dean";

      toast.success(`Grievance ${actionText} successfully`);
      setRemarkText("");
      onOpenChange(false);
      onActionComplete?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Action could not be completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "DEAN":
        return "bg-purple-500/10 text-purple-800 border-purple-200/80";
      case "HOD":
        return "bg-indigo-500/10 text-indigo-800 border-indigo-200/80";
      case "FACULTY":
        return "bg-blue-500/10 text-blue-800 border-blue-200/80";
      default:
        return "bg-slate-500/10 text-slate-800 border-slate-200/80";
    }
  };

  const getCategoryBadge = (cat?: RecipientCategory) => {
    switch (cat) {
      case "HOD":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-500/10 border border-amber-300/50 backdrop-blur-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
            <Building2 className="w-3 h-3 text-amber-600" /> HOD Direct
          </span>
        );
      case "SUBJECT_FACULTY":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-500/10 border border-indigo-300/50 backdrop-blur-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
            <BookOpen className="w-3 h-3 text-indigo-600" /> Subject Faculty
          </span>
        );
      case "MENTOR":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-300/50 backdrop-blur-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
            <UserCheck className="w-3 h-3 text-emerald-600" /> Mentor Faculty
          </span>
        );
      case "CLASS_FACULTY":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-500/10 border border-blue-300/50 backdrop-blur-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
            <GraduationCap className="w-3 h-3 text-blue-600" /> Class Faculty
          </span>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_25px_60px_-15px_rgba(11,25,44,0.3)] overflow-hidden ring-1 ring-black/5">
        {/* Glassmorphic ambient light accents */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-[#D4A72C]/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr from-[#0B192C]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/90 to-transparent pointer-events-none" />

        <DialogHeader className="space-y-2 pb-3 border-b border-slate-200/60 relative">
          <div className="flex items-center justify-between gap-3 pr-6 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white/75 backdrop-blur-md text-slate-800 border border-white/80 shadow-2xs">
                {grievance?.refId || "GRV"}
              </span>
              {grievance && getStatusBadge(grievance.status)}
              {grievance?.recipientCategory && getCategoryBadge(grievance.recipientCategory)}
              {grievance?.autoForwarded && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-500/10 border border-amber-300/50 backdrop-blur-xs px-2 py-0.5 rounded-lg shadow-2xs">
                  <Clock className="w-3 h-3 text-amber-600" /> Auto-forwarded (24h)
                </span>
              )}
            </div>
          </div>

          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 leading-snug">
            {grievance?.subject || "Grievance Details"}
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-500 pt-0 flex flex-wrap items-center gap-x-4 gap-y-1">
            {grievance ? (
              <>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Submitted: <strong className="text-slate-700">{grievance.createdAt}</strong>
                </span>
                {!isStudent && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Student: <strong className="text-slate-800">{grievance.studentName}</strong> ({grievance.regNo})
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Dept: <strong className="text-slate-700">{grievance.deptName || grievance.deptKey}</strong>
                </span>
                {grievance.sentToName && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    Target: <strong className="text-slate-700">{grievance.sentToName}</strong>
                  </span>
                )}
              </>
            ) : (
              "Loading grievance details..."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading || !grievance ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B192C]" />
            <p className="text-xs font-bold text-slate-600">Retrieving official complaint record...</p>
          </div>
        ) : (
          <div className="space-y-5 pt-3 relative">
            {/* 48-Hour Alert Banner for ADEAN */}
            {grievance.overdue48hrs && (
              <div className="rounded-2xl bg-rose-500/10 backdrop-blur-md border border-rose-300/50 text-rose-950 p-4 text-xs flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-rose-950">High Priority SLA Notice: Overdue (48+ Hours)</p>
                  <p className="text-rose-700 leading-relaxed">
                    This grievance has remained in the Associate Dean queue for more than 48 hours and requires immediate resolution.
                  </p>
                </div>
              </div>
            )}

            {/* Official Complaint Statement */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                Official Statement
              </span>
              <div className="p-4 sm:p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_8px_rgba(11,25,44,0.02)] font-normal">
                {grievance.description}
              </div>
            </div>

            {/* Attached Documentation */}
            {grievance.attachmentName && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  Supporting Documentation
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md hover:bg-white/80 transition-all shadow-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100/80 backdrop-blur-xs flex items-center justify-center text-slate-700 shrink-0 border border-white/60">
                      <Paperclip className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{grievance.attachmentName}</p>
                      {grievance.attachmentSize && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          {(grievance.attachmentSize / 1024).toFixed(1)} KB document
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 3 Action Buttons: Preview, Print, Download */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Preview Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                      disabled={isPreviewing || isDownloading || isPrinting}
                      className="h-8 text-xs font-bold shrink-0 gap-1 rounded-xl border-white/80 bg-white/80 backdrop-blur-xs text-blue-700 hover:bg-blue-50/80 hover:text-blue-800 shadow-2xs cursor-pointer transition-colors"
                      title="Preview document in a new tab"
                    >
                      {isPreviewing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      Preview
                    </Button>

                    {/* Print Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      disabled={isPreviewing || isDownloading || isPrinting}
                      className="h-8 text-xs font-bold shrink-0 gap-1 rounded-xl border-white/80 bg-white/80 backdrop-blur-xs text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 shadow-2xs cursor-pointer transition-colors"
                      title="Print document"
                    >
                      {isPrinting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                      ) : (
                        <Printer className="w-3.5 h-3.5 text-slate-700" />
                      )}
                      Print
                    </Button>

                    {/* Download Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isPreviewing || isDownloading || isPrinting}
                      className="h-8 text-xs font-bold shrink-0 gap-1 rounded-xl border-white/80 bg-white/80 backdrop-blur-xs text-emerald-700 hover:bg-emerald-50/80 hover:text-emerald-800 shadow-2xs cursor-pointer transition-colors"
                      title="Download document to device"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Remarks History Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                <MessageSquare className="w-4 h-4 text-[#D4A72C]" />
                <span>Remarks & Escalation History</span>
              </div>

              {grievance.remarks && grievance.remarks.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300/60">
                  {grievance.remarks.map((r, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full bg-[#0B192C] border-2 border-white ring-2 ring-slate-300/60 shadow-2xs" />

                      <div className="p-3.5 rounded-2xl border border-white/80 bg-white/65 backdrop-blur-md text-xs space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{r.by}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs ${getRoleBadgeStyle(r.role)}`}>
                              {r.role}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">{r.at}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-white/50 backdrop-blur-xs border border-white/60">
                  No administrative remarks or forward notes recorded yet.
                </p>
              )}
            </div>

            {/* Reviewer Notice when Not Actionable */}
            {!canAct && !isStudent && isAwaitingAction && (
              <div className="rounded-2xl border border-amber-300/50 bg-amber-500/10 backdrop-blur-md p-4 text-xs text-amber-900 flex items-center gap-3 shadow-xs">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This complaint is currently awaiting review and action by{" "}
                  <strong className="text-amber-950 font-bold">
                    {grievance.currentHandlerRole === "HOD"
                      ? "Head of Department (HOD)"
                      : grievance.currentHandlerRole === "DEAN"
                        ? "Associate Dean"
                        : "Faculty Incharge"}
                  </strong>.
                </span>
              </div>
            )}

            {!isStudent && !isAwaitingAction && (
              <div
                className={`rounded-2xl border p-4 text-xs flex items-center gap-3 backdrop-blur-md shadow-xs ${grievance.status === "APPROVED"
                    ? "bg-emerald-500/10 border-emerald-300/50 text-emerald-900"
                    : "bg-rose-500/10 border-rose-300/50 text-rose-900"
                  }`}
              >
                {grievance.status === "APPROVED" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  This grievance was formally <strong>{grievance.status.toLowerCase()}</strong>
                  {grievance.resolvedAt ? ` on ${grievance.resolvedAt}` : ""}.
                </span>
              </div>
            )}

            {/* Action Panel for Faculty / HOD / ADEAN */}
            {canAct && (
              <div className="space-y-3.5 pt-4 border-t border-slate-200/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Your Remarks / Endorsement
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Optional feedback for student</span>
                </div>
                <Textarea
                  placeholder="Enter resolution notes, reason for forward, or instructions..."
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  rows={2}
                  className="text-xs rounded-xl border-white/80 bg-white/70 backdrop-blur-md focus:bg-white focus-visible:ring-1 focus-visible:ring-[#0B192C] placeholder:text-slate-400 shadow-2xs"
                />

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  {/* Forward to HOD */}
                  {userRole === "FACULTY" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("FORWARD")}
                      disabled={isSubmitting}
                      className="gap-1.5 text-xs font-bold rounded-xl h-10 border-blue-200/80 bg-white/70 backdrop-blur-xs text-blue-700 hover:bg-blue-50 shadow-2xs"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Forward to HOD
                    </Button>
                  )}

                  {/* Forward to Associate Dean */}
                  {userRole === "HOD" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("FORWARD")}
                      disabled={isSubmitting}
                      className="gap-1.5 text-xs font-bold rounded-xl h-10 border-purple-200/80 bg-white/70 backdrop-blur-xs text-purple-700 hover:bg-purple-50 shadow-2xs"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Forward to Associate Dean
                    </Button>
                  )}

                  {/* Reject */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction("REJECT")}
                    disabled={isSubmitting}
                    className="gap-1.5 text-xs font-black rounded-xl h-10 bg-rose-600/90 hover:bg-rose-600 backdrop-blur-xs text-white shadow-xs px-4"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </Button>

                  {/* Approve */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAction("APPROVE")}
                    disabled={isSubmitting}
                    className="gap-1.5 text-xs font-black rounded-xl h-10 bg-emerald-600/95 hover:bg-emerald-600 backdrop-blur-xs text-white shadow-xs px-5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Grievance
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-slate-200/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs font-bold rounded-xl h-9 px-4 border-white/80 bg-white/70 backdrop-blur-xs text-slate-700 hover:bg-white shadow-2xs"
              >
                Close Dialog
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
