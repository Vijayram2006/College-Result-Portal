import React, { useState, useEffect } from "react";
import {
  Bell,
  Calendar,
  Clock,
  Send,
  Building2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  ExternalLink,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  safeLoadNotifications,
  DeanExamNotification,
} from "./dean/ExamTimetableNotificationView";

interface FacultyExamNotificationsViewProps {
  onNavigateToQuestionPaper?: () => void;
  onToast?: (msg: string) => void;
  facultyName?: string;
  department?: string;
}

export const FacultyExamNotificationsView: React.FC<FacultyExamNotificationsViewProps> = ({
  onNavigateToQuestionPaper,
  onToast,
  facultyName = "",
  department = "Computer Science and Engineering",
}) => {
  const [notifications, setNotifications] = useState<DeanExamNotification[]>(() => safeLoadNotifications());
  const [selectedNotifId, setSelectedNotifId] = useState<string>(() => {
    const list = safeLoadNotifications();
    return list.length > 0 ? list[0].id : "";
  });

  const refreshNotifs = () => {
    const data = safeLoadNotifications();
    setNotifications(data);
    if (!selectedNotifId && data.length > 0) {
      setSelectedNotifId(data[0].id);
    }
  };

  useEffect(() => {
    refreshNotifs();
    window.addEventListener("kvell_exam_notification_updated", refreshNotifs);
    window.addEventListener("storage", refreshNotifs);
    return () => {
      window.removeEventListener("kvell_exam_notification_updated", refreshNotifs);
      window.removeEventListener("storage", refreshNotifs);
    };
  }, []);

  const activeNotif = notifications.find((n) => n.id === selectedNotifId) || notifications[0];

  return (
    <div className="space-y-6">
      {/* TOP BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-[#0B192C] border border-[#D4A72C]/30 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border-2 border-[#D4A72C] flex items-center justify-center shrink-0 text-[#D4A72C] shadow-lg">
              <Bell size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">
                <span>WORKFLOW STEP 6 · DEAN ACADEMIC CIRCULARS</span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight">
                Examination Notifications &amp; Faculty Circulars
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-semibold max-w-2xl">
                Official institutional notifications broadcasted by the Dean of Academics for Autonomous End Semester Examinations, question paper deadlines, and OBE rubrics.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {onNavigateToQuestionPaper && (
              <button
                onClick={onNavigateToQuestionPaper}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] px-5 py-3 text-xs font-black shadow-lg transition cursor-pointer"
              >
                <span>Prepare Question Paper (Step 7)</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* METRIC STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            ACTIVE EXAM CIRCULARS
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#0B192C]">{notifications.length}</span>
            <span className="text-xs text-gray-500 font-semibold">Broadcasted</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-bold mt-1">Directly live in Faculty Portal</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            NEXT QP SUBMISSION DEADLINE
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-mono font-black text-rose-600">
              {activeNotif ? activeNotif.deadline : "Oct 23, 05:00 PM"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Strict adherence required</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            SIGNATORY AUTHORITY
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-black text-blue-900">
              {activeNotif ? activeNotif.senderName : "Dr. Meera Krishnan"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Dean of Academics</p>
        </div>
      </div>

      {/* TWO COLUMN VIEW: LIST ON LEFT, FULL CIRCULAR ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: NOTIFICATIONS LIST (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Broadcast Archive ({notifications.length})
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Synced Live
            </span>
          </div>

          <div className="space-y-3">
            {notifications.map((notif) => {
              const isSelected = notif.id === selectedNotifId;
              return (
                <div
                  key={notif.id}
                  onClick={() => setSelectedNotifId(notif.id)}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer space-y-2 ${
                    isSelected
                      ? "border-[#D4A72C] bg-amber-50/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {notif.refNo}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      {notif.issueDate}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-[#0B192C] leading-snug line-clamp-2">
                    {notif.title}
                  </h3>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="font-mono text-rose-600 font-bold">
                      Due: {notif.deadline.split(" ")[0]}
                    </span>
                    <span className="text-xs font-extrabold text-[#D4A72C] flex items-center gap-0.5">
                      Read <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: FULL CIRCULAR PREVIEW & ACTIONS (8 cols) */}
        {activeNotif && (
          <div className="lg:col-span-8 bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header info */}
            <div className="border-b border-slate-200 pb-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                    {activeNotif.refNo}
                  </span>
                  <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-300">
                    OFFICIAL DIRECTIVE · {activeNotif.status}
                  </span>
                </div>

                <span className="text-xs font-mono font-black text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                  Submission Deadline: {activeNotif.deadline}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-[#0B192C] leading-tight">
                {activeNotif.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-semibold pt-1">
                <span>Issued: {activeNotif.issueDate} at {activeNotif.deliveredAt}</span>
                <span>•</span>
                <span>Academic Year: {activeNotif.academicYear} ({activeNotif.semester})</span>
                <span>•</span>
                <span>From: {activeNotif.senderName} ({activeNotif.senderRole})</span>
              </div>
            </div>

            {/* Directive Message */}
            <div className="bg-[#F8F5EE] p-5 rounded-2xl border border-[#E5E1D8] space-y-2">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                OFFICIAL DEAN DIRECTIVE:
              </span>
              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-normal">
                {activeNotif.message}
              </p>
            </div>

            {/* Target Departments */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                APPLICABLE BRANCHES / DEPARTMENTS:
              </span>
              <div className="flex flex-wrap gap-2">
                {activeNotif.targetDepartments.map((dept) => (
                  <span
                    key={dept}
                    className="px-3 py-1 rounded-xl text-xs font-black bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>

            {/* OBE Guidelines Checklist */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                MANDATORY QUESTION PAPER SETTING GUIDELINES (OBE &amp; BLOOM&apos;S TAXONOMY):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeNotif.guidelines.map((g, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800"
                  >
                    <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500">
                <span>Course: </span>
                <strong className="text-[#0B192C]">CS601 / CS602 (CSE)</strong>
                <span className="ml-2">• Faculty: </span>
                <strong className="text-[#0B192C]">{facultyName}</strong>
              </div>

              {onNavigateToQuestionPaper && (
                <button
                  onClick={onNavigateToQuestionPaper}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0B192C] hover:bg-[#1a2f4d] text-[#D4A72C] font-black text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-[#D4A72C]/40"
                >
                  <Send size={15} />
                  <span>Start Drafting Question Paper (Workflow Step 7)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default FacultyExamNotificationsView;
