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
  Users,
  Search,
  Download,
  Share2,
} from "lucide-react";
import {
  safeLoadNotifications,
  safeLoadTimetable,
  DeanExamNotification,
  ExamTimetableSlot,
} from "./dean/ExamTimetableNotificationView";

interface HodExamNotificationsViewProps {
  department?: string;
  hodName?: string;
  onNavigateQP?: () => void;
  onToast?: (msg: string) => void;
}

export const HodExamNotificationsView: React.FC<HodExamNotificationsViewProps> = ({
  department = "Computer Science & Engineering",
  hodName = "Dr. Jayapradha",
  onNavigateQP,
  onToast,
}) => {
  const [notifications, setNotifications] = useState<DeanExamNotification[]>(() => safeLoadNotifications());
  const [timetable, setTimetable] = useState<ExamTimetableSlot[]>(() => safeLoadTimetable());
  const [selectedNotifId, setSelectedNotifId] = useState<string>(() => {
    const list = safeLoadNotifications();
    return list.length > 0 ? list[0].id : "";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [circulatedIds, setCirculatedIds] = useState<Record<string, boolean>>({});
  const [acknowledgedIds, setAcknowledgedIds] = useState<Record<string, boolean>>({});

  const refreshData = () => {
    const notifData = safeLoadNotifications();
    setNotifications(notifData);
    if (!selectedNotifId && notifData.length > 0) {
      setSelectedNotifId(notifData[0].id);
    }
    setTimetable(safeLoadTimetable());
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("kvell_exam_notification_updated", refreshData);
    window.addEventListener("kvell_timetable_updated", refreshData);
    window.addEventListener("storage", refreshData);
    return () => {
      window.removeEventListener("kvell_exam_notification_updated", refreshData);
      window.removeEventListener("kvell_timetable_updated", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const handleCirculateToFaculty = (notifId: string, refNo: string) => {
    setCirculatedIds((prev) => ({ ...prev, [notifId]: true }));
    notify(`Official Circular ${refNo} successfully forwarded to all ${department} Faculty & DAC Members!`);
  };

  const handleAcknowledge = (notifId: string, refNo: string) => {
    setAcknowledgedIds((prev) => ({ ...prev, [notifId]: true }));
    notify(`Receipt of Circular ${refNo} acknowledged to Dean of Academics!`);
  };

  const filteredNotifs = notifications.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      n.refNo.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      n.senderName.toLowerCase().includes(q)
    );
  });

  const activeNotif = notifications.find((n) => n.id === selectedNotifId) || notifications[0];

  // Filter timetable slots relevant to the HOD's department
  const deptCode = department.toLowerCase().includes("comp") || department.toLowerCase().includes("cse")
    ? "CSE"
    : department.toLowerCase().includes("ai") || department.toLowerCase().includes("data")
    ? "ADS"
    : department.toLowerCase().includes("bio") || department.toLowerCase().includes("bme")
    ? "BME"
    : department.toLowerCase().includes("tech") || department.toLowerCase().includes("bt")
    ? "BT"
    : department.toLowerCase().includes("elec") || department.toLowerCase().includes("ece")
    ? "ECE"
    : "MECH";

  const departmentTimetable = timetable.filter(
    (slot) => slot.deptCode === deptCode || slot.deptName.toLowerCase().includes(deptCode.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* TOP BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-[#0B192C] border border-[#D4A72C]/30 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border-2 border-[#D4A72C] flex items-center justify-center shrink-0 text-[#D4A72C] shadow-lg">
              <Bell size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">
                <span>HOD EXECUTIVE DESK &bull; DEAN ACADEMIC DISPATCH</span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight">
                Examination Notifications &amp; Dean Broadcast Circulars
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 font-semibold max-w-2xl leading-relaxed">
                Official institutional circulars broadcasted by the Dean of Academics for End Semester Examinations.
                Review official timelines, circulate guidelines to department faculty, and coordinate Stage 2 DAC Question Paper Scrutiny.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {onNavigateQP && (
              <button
                type="button"
                onClick={onNavigateQP}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[#D4A72C] hover:bg-[#b08014] text-[#0B192C] px-5 py-3 text-xs font-black shadow-lg transition cursor-pointer"
              >
                <span>Stage 2 DAC Scrutiny Desk</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* METRIC CARDS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            ACTIVE DEAN CIRCULARS
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#0B192C]">{notifications.length}</span>
            <span className="text-xs text-gray-500 font-semibold">Broadcasted</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Live in HOD &amp; Faculty Portals
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            NEXT QP SUBMISSION DEADLINE
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-mono font-black text-rose-600">
              {activeNotif ? activeNotif.deadline.split(" ")[0] : "2026-10-23"}
            </span>
            <span className="text-xs text-rose-700 font-bold">
              {activeNotif ? activeNotif.deadline.split(" ").slice(1).join(" ") : "05:00 PM"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Strict adherence mandatory</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            DEPARTMENT SCOPE
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-[#0B192C] truncate">{department}</span>
          </div>
          <p className="text-[11px] text-[#B08014] font-bold mt-1">HOD: {hodName}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            ISSUING AUTHORITY
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-black text-blue-900">
              {activeNotif ? activeNotif.senderName : "Dr. Meera Krishnan"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Dean of Academics &bull; COE</p>
        </div>
      </div>

      {/* TWO COLUMN MASTER-DETAIL VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: LIST OF BROADCAST NOTIFICATIONS (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText size={15} className="text-[#D4A72C]" />
              Dean Circulars Archive ({notifications.length})
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Synced Live
            </span>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars, ref no..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
            />
          </div>

          <div className="space-y-3">
            {filteredNotifs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No matching circulars found.</p>
            ) : (
              filteredNotifs.map((n) => {
                const isSelected = activeNotif && activeNotif.id === n.id;
                const isCirculated = circulatedIds[n.id];
                const isAck = acknowledgedIds[n.id];

                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNotifId(n.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2.5 ${
                      isSelected
                        ? "bg-amber-50/80 border-[#D4A72C] shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-[#0B192C] text-[#D4A72C]">
                        {n.refNo}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Due: {n.deadline.split(" ")[0]}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-[#0B192C] line-clamp-2 leading-snug">
                      {n.title}
                    </h4>

                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-normal">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
                      <span className="text-gray-500">{n.issueDate}</span>
                      <div className="flex items-center gap-1.5">
                        {isCirculated && (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                            Circulated
                          </span>
                        )}
                        {isAck && (
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold">
                            Acked
                          </span>
                        )}
                        <span className="text-amber-700 font-bold">{n.deliveredAt}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: FULL OFFICIAL MEMORANDUM & DIRECTIVES (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeNotif ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Institutional Circular Header */}
              <div className="border-b-2 border-gray-900 pb-5 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0B192C] text-[#D4A72C] tracking-widest">
                    OFFICIAL NOTIFICATION &bull; ACADEMIC COUNCIL DIRECTIVE
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#0B192C] uppercase tracking-wide">
                  Karpaga Vinayaga College of Engineering and Technology
                </h2>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  (Autonomous Institution &bull; Affiliated to Anna University &bull; Approved by AICTE)
                </p>
                <p className="text-[11px] font-bold text-[#B08014] uppercase tracking-wider">
                  Office of the Dean of Academics &amp; Controller of Examinations
                </p>
              </div>

              {/* Memo Meta Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Circular Ref No.</span>
                  <span className="font-mono font-bold text-[#0B192C] mt-0.5 block">{activeNotif.refNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Issue Date</span>
                  <span className="font-mono font-bold text-gray-800 mt-0.5 block">{activeNotif.issueDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Academic Year / Sem</span>
                  <span className="font-bold text-gray-800 mt-0.5 block">
                    {activeNotif.academicYear} &bull; {activeNotif.semester}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">QP Submission Deadline</span>
                  <span className="font-mono font-bold text-rose-600 mt-0.5 block">{activeNotif.deadline}</span>
                </div>
              </div>

              {/* Addressed To Section */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold">Addressed To:</span>{" "}
                  <span>All Heads of Departments (HODs) &bull; Department Academic Committee (DAC) Members &bull; Course Instructors</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-bold">Target Streams:</span>{" "}
                  <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-300">
                    {activeNotif.targetDepartments.join(", ")}
                  </span>
                </div>
              </div>

              {/* Subject & Circular Body */}
              <div className="space-y-3">
                <div className="border-l-4 border-[#D4A72C] pl-3 py-0.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Subject</span>
                  <h3 className="font-bold text-base text-[#0B192C] mt-0.5">{activeNotif.title}</h3>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 text-xs text-gray-800 leading-relaxed space-y-2 border border-gray-100">
                  <p className="font-semibold">{activeNotif.message}</p>
                </div>
              </div>

              {/* HOD Specific Action Directives */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-800" />
                  <h4 className="font-bold text-sm text-[#0B192C]">
                    Department Compliance Directives for HOD ({department})
                  </h4>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-[11px] text-amber-950 font-medium">
                  <li>
                    <strong>Convene DAC Committee:</strong> Immediately assemble the Department Academic Committee to notify all course faculty.
                  </li>
                  <li>
                    <strong>Enforce 2 Distinct Sets:</strong> Ensure faculty submit Set A and Set B with full Bloom&apos;s Taxonomy (K1&ndash;K6) mapping.
                  </li>
                  <li>
                    <strong>Conduct Stage 2 Scrutiny:</strong> Inspect question papers in the HOD portal for syllabus coverage, marks distribution, and answer keys.
                  </li>
                  <li>
                    <strong>Forward to Associate Dean:</strong> Once verified, forward approved sets to the Exam Cell and Associate Dean before {activeNotif.deadline}.
                  </li>
                </ul>
              </div>

              {/* Dean Regulatory Guidelines */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#D4A72C]" />
                  Statutory Question Paper Guidelines Mandated by Dean:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeNotif.guidelines.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-2.5"
                    >
                      <span className="h-5 w-5 rounded-full bg-[#0B192C] text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 leading-normal">{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Exam Timetable Snapshot */}
              {departmentTimetable.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={16} className="text-blue-900" />
                      Scheduled Exam Timetable for {department}:
                    </h4>
                    <span className="text-[10px] font-mono text-gray-500 font-bold">
                      {departmentTimetable.length} Courses Slated
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] text-gray-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Date &amp; Day</th>
                          <th className="py-2 px-3">Session</th>
                          <th className="py-2 px-3">Course</th>
                          <th className="py-2 px-3 text-center">Registered</th>
                          <th className="py-2 px-3">Designated Faculty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {departmentTimetable.map((slot) => (
                          <tr key={slot.id} className="hover:bg-amber-50/30">
                            <td className="py-2 px-3 font-mono font-bold text-gray-900">
                              {slot.date} ({slot.day})
                            </td>
                            <td className="py-2 px-3 font-mono text-gray-600">{slot.session}</td>
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-[#0B192C]">{slot.subjectCode}</span> &bull;{" "}
                              <span className="text-gray-600">{slot.subjectTitle}</span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold">{slot.registeredCount}</td>
                            <td className="py-2 px-3 text-blue-900 font-semibold">{slot.qpFacultyAuthor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Signatory & Action Buttons Footer */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Issued By Authority</span>
                  <p className="font-bold text-sm text-[#0B192C]">{activeNotif.senderName}</p>
                  <p className="text-xs text-gray-500">{activeNotif.senderRole} &bull; Karpaga Vinayaga Autonomous</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCirculateToFaculty(activeNotif.id, activeNotif.refNo)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-sm ${
                      circulatedIds[activeNotif.id]
                        ? "bg-emerald-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    <Share2 size={14} />
                    <span>
                      {circulatedIds[activeNotif.id] ? "Circulated to Faculty" : "Circulate to Department Faculty"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAcknowledge(activeNotif.id, activeNotif.refNo)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border ${
                      acknowledgedIds[activeNotif.id]
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Check size={14} />
                    <span>{acknowledgedIds[activeNotif.id] ? "Receipt Acknowledged" : "Acknowledge"}</span>
                  </button>

                  {onNavigateQP && (
                    <button
                      type="button"
                      onClick={onNavigateQP}
                      className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Go to DAC Scrutiny</span>
                      <ArrowRight size={14} className="text-[#D4A72C]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-gray-400">
              Select a circular from the left to view the official memorandum.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HodExamNotificationsView;
