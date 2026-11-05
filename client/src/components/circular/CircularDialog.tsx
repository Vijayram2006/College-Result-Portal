import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Circular,
  CircularAttachment,
  matchesDept,
} from "./CircularTypes";
import { deleteCircular, findHodAction } from "./circularStore";
import {
  FileText,
  Clock,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  Lock,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface CircularDialogProps {
  circular: Circular | null;
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  userRole?: "ASSOCIATE_DEAN" | "DEAN" | "HOD" | "FACULTY" | "STUDENT" | "ADMIN" | "COE";
  deptKey?: string;
  deptName?: string;
  onActionComplete?: () => void;
  onToast?: (msg: string) => void;
  onForward?: (circ: Circular) => void;
  onKeep?: (circ: Circular) => void;
}

export const CircularDialog: React.FC<CircularDialogProps> = ({
  circular,
  open,
  isOpen,
  onOpenChange,
  onClose,
  userRole = "DEAN",
  deptKey = "cse",
  deptName = "Computer Science & Engineering",
  onActionComplete,
  onToast,
  onForward,
  onKeep,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveOpen = typeof open === "boolean" ? open : Boolean(isOpen);
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };

  if (!circular) return null;

  const isDean = userRole === "ASSOCIATE_DEAN" || userRole === "DEAN" || userRole === "ADMIN";
  const isHod = userRole === "HOD";
  const isFaculty = userRole === "FACULTY";
  const isStudent = userRole === "STUDENT";
  const isSender =
    (isDean && (circular.createdBy?.role === "ASSOCIATE_DEAN" || circular.createdBy?.role === "DEAN")) ||
    (userRole === "COE" && circular.createdBy?.role === "COE");

  const allAttachments: CircularAttachment[] =
    circular.attachments && circular.attachments.length > 0
      ? circular.attachments
      : circular.attachment
        ? [circular.attachment]
        : [];

  const hodAction = findHodAction(circular.hodActions, deptKey);
  const forwardedToStudents =
    hodAction &&
    (hodAction.target === "STUDENTS_ONLY" ||
      hodAction.target === "FACULTY_AND_STUDENTS");

  const handleDownload = (att: CircularAttachment) => {
    if (att.dataUrl) {
      const link = document.createElement("a");
      link.href = att.dataUrl;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (onToast) onToast(`Downloading "${att.name}"`);
    } else {
      window.open(`/api/v1/circulars/${circular.id}/attachment`, "_blank");
      if (onToast) onToast(`Downloading "${att.name}"`);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete circular "${circular.subject}"?\nThis will remove it permanently.`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      if (!(await deleteCircular(circular.id))) return;
      if (onToast) onToast("Circular deleted successfully");
      handleOpenChange(false);
      if (onActionComplete) onActionComplete();
    } catch {
      alert("Failed to delete circular. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityBadge = () => {
    switch (circular.priority) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
            HIGH PRIORITY
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            NORMAL
          </span>
        );
    }
  };

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(11,25,44,0.3)] ring-1 ring-black/5">
        {/* Ambient Glow accents */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-[#D4A72C]/20 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr from-[#0B192C]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Dialog Header */}
        <DialogHeader className="space-y-3 pb-4 border-b border-slate-200/80">
          <div className="flex items-center justify-between gap-3 pr-6 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-[#0B192C] text-[#D4A72C] shadow-2xs">
                {circular.refNo}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {circular.category}
              </span>
              {getPriorityBadge()}

              {circular.createdBy?.role === "COE" && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  COE Examination Directive
                </span>
              )}

              {circular.status === "DELETED" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                  <Trash2 size={12} className="text-rose-600" />
                  DELETED / RECALLED
                </span>
              )}
            </div>

            {(isDean || userRole === "COE" || circular.createdBy?.role === "COE") && circular.status !== "DELETED" && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                title="Delete this circular"
              >
                {isDeleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>Delete Circular</span>
              </button>
            )}
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-snug">
            {circular.status === "DELETED" && !isSender
              ? `[Notice Retracted — Topic Withdrawn by ${circular.deletedBy?.role === "COE" ? "COE" : "Associate Dean"}]`
              : circular.subject}
          </DialogTitle>

          <DialogDescription className="text-xs text-slate-500 pt-0 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Issued:{" "}
              <strong className="text-slate-700">
                {new Date(circular.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4A72C]" />
              Origin:{" "}
              <strong className="text-slate-800">
                {circular.createdBy.name} ({circular.createdBy.role})
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Target:{" "}
              <strong className="text-slate-700">
                {circular.routingOption === "ALL_DEPTS"
                  ? "All Departments"
                  : `${circular.targetDepartmentNames?.length || circular.targetDepartmentKeys?.length || 1} Department(s)`}
              </strong>
            </span>

            {circular.targetAudiences && circular.targetAudiences.length > 0 && (
              <span className="flex items-center gap-1">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                Portals:{" "}
                <strong className="text-slate-700">
                  {circular.targetAudiences.join(", ")}
                </strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Deleted Message Log Notice */}
        {circular.status === "DELETED" && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-xs text-rose-700 uppercase tracking-wide">
                Circular Deleted / Recalled Notice
              </p>
              <p className="text-xs text-rose-800 leading-relaxed">
                This circular was deleted by{" "}
                <strong className="font-bold">
                  {circular.deletedBy?.role === "ASSOCIATE_DEAN" ? "Associate Dean" : circular.deletedBy?.role === "COE" ? "Controller of Examinations (COE)" : circular.deletedBy?.role || "Authorized Authority"}
                  {circular.deletedBy?.name ? ` (${circular.deletedBy.name})` : ""}
                </strong>{" "}
                {circular.deletedAt ? `on ${new Date(circular.deletedAt).toLocaleString()}` : ""}.
                This official memorandum has been revoked and is no longer active.
              </p>
            </div>
          </div>
        )}

        {/* Message Body */}
        <div className="space-y-5 py-4">
          <div className="space-y-1.5">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Official Message Content
            </h4>
            {circular.status === "DELETED" && !isSender ? (
              <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 text-xs sm:text-sm text-rose-900 leading-relaxed shadow-2xs font-medium">
                This official memorandum was retracted and deleted by{" "}
                <strong className="font-bold">
                  {circular.deletedBy?.role === "ASSOCIATE_DEAN"
                    ? "Associate Dean"
                    : circular.deletedBy?.role === "COE"
                      ? "Controller of Examinations (COE)"
                      : circular.deletedBy?.role || "Authorized Authority"}
                </strong>
                {circular.deletedAt ? ` on ${new Date(circular.deletedAt).toLocaleString()}` : ""}.
                The subject, topic, message content, and document attachments have been withdrawn and are hidden from recipients.
              </div>
            ) : (
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed shadow-2xs font-normal">
                {circular.message}
              </div>
            )}
          </div>

          {/* Scheduled Timed Release Banner */}
          {circular.status === "SCHEDULED" && circular.scheduledFor && (
            <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs text-purple-950 flex items-center gap-2.5">
              <Clock size={16} className="text-purple-700 shrink-0" />
              <div>
                <span className="font-bold">Scheduled Timed Release: </span>
                <span>This memorandum will activate automatically and become accessible on {new Date(circular.scheduledFor).toLocaleString()}.</span>
              </div>
            </div>
          )}

          {/* Conversation & Approval Notes (If Any) */}
          {(circular.submissionNotes || circular.approvalRemarks) && (circular.status !== "DELETED" || isSender) && (
            <div className="space-y-2 p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-amber-700" />
                <span>Executive Review & Endorsement Trail</span>
              </h4>

              {circular.submissionNotes && (
                <div className="text-xs text-amber-900 bg-white/80 p-3 rounded-xl border border-amber-200">
                  <span className="font-bold block text-slate-600">COE Submission Note:</span>
                  <p className="mt-0.5">{circular.submissionNotes}</p>
                </div>
              )}

              {circular.approvalRemarks && (
                <div className="text-xs text-emerald-900 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200">
                  <span className="font-bold block text-emerald-800">
                    Associate Dean Approval Remarks:
                  </span>
                  <p className="mt-0.5 font-semibold">"{circular.approvalRemarks}"</p>
                  {circular.approvedAt && (
                    <span className="text-[10px] text-emerald-600 block mt-1">
                      Sanctioned on {new Date(circular.approvedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* COE Office Delivery, Read-Receipt & Official Reply */}
          {(circular.targetAudiences?.includes("COE") || circular.seenByCoe || circular.coeReply) && (
            <div className="space-y-2.5 p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-blue-700" />
                  <span>Controller of Examinations (COE) Status</span>
                </h4>
                {circular.seenByCoe ? (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-600" />
                    Seen by COE {circular.seenAt ? `(${new Date(circular.seenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})` : ""}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Delivered — Awaiting COE Review
                  </span>
                )}
              </div>

              {circular.coeReply && (
                <div className="text-xs text-indigo-950 bg-white/90 p-3 rounded-xl border border-indigo-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-indigo-600" />
                      <span>COE Official Reply:</span>
                    </span>
                    {circular.coeReplyAt && (
                      <span className="text-[10px] text-indigo-600 font-normal">
                        {new Date(circular.coeReplyAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 italic text-slate-800 font-medium">"{circular.coeReply}"</p>
                </div>
              )}
            </div>
          )}

          {/* Files & Attachments Deck */}
          {allAttachments.length > 0 && (circular.status !== "DELETED" || isSender) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Paperclip size={13} className="text-amber-600" />
                  Attached Documents ({allAttachments.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Click download to save files
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allAttachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl shadow-2xs hover:border-amber-300 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {(att.size / 1024).toFixed(1)} KB • {att.type || "Document"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(att)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role-Specific Routing & Audit Information */}
          {isDean && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Department Distribution & HOD Responses
              </h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>Routing: {circular.routingOption}</span>
                  <span className="text-slate-500 font-medium">
                    {Object.keys(circular.hodActions || {}).length} HOD action(s) recorded
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {circular.targetDepartmentNames?.map((name, i) => {
                    const key = circular.targetDepartmentKeys[i] || name;
                    const action = findHodAction(circular.hodActions, key);

                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${action?.action === "FORWARDED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : action?.action === "KEPT"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : action?.action === "SEEN"
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                      >
                        {name}
                        {action?.action === "FORWARDED" && " ✓ (Forwarded)"}
                        {action?.action === "KEPT" && " ℹ (Kept)"}
                        {action?.action === "SEEN" && " 👁 (Seen)"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
          <div className="flex items-center gap-2">
            {circular.status === "DELETED" ? (
              <div className="text-xs font-bold text-rose-700 bg-rose-50 px-3.5 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1.5">
                <Trash2 size={13} />
                <span>This circular has been revoked / deleted</span>
              </div>
            ) : isHod && (!hodAction || hodAction.action === "SEEN") && onForward && onKeep ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    handleOpenChange(false);
                    onKeep(circular);
                  }}
                  variant="outline"
                  className="rounded-xl border-slate-300 text-xs font-bold text-slate-700"
                >
                  Keep in Department
                </Button>
                <Button
                  onClick={() => {
                    handleOpenChange(false);
                    onForward(circular);
                  }}
                  className="rounded-xl bg-[#0B192C] text-[#D4A72C] hover:bg-slate-900 text-xs font-bold"
                >
                  Forward to Faculty & Students
                </Button>
              </div>
            ) : null}
          </div>

          <Button
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
