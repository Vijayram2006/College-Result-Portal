import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Clock,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Users,
  Building2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Send,
  Trash2,
} from "lucide-react";
import { Circular, normalizeDepartment } from "./CircularTypes";
import {
  getCircularsForFaculty,
  subscribeCirculars,
  findHodAction,
  refreshCircularsFromServer,
  updateHodAction,
} from "./circularStore";
import { authApi } from "../../services/api";
import { CircularDialog } from "./CircularDialog";
import {
  DynamicCircularFilter,
  CircularMetricStatCards,
  FilterCounts,
} from "./DynamicCircularFilter";

interface CircularFacultyViewProps {
  deptKey?: string;
  deptName?: string;
  facultyName?: string;
}

export const CircularFacultyView: React.FC<CircularFacultyViewProps> = ({
  deptKey = "cse",
  deptName = "Computer Science & Engineering",
  facultyName = "Faculty Member",
}) => {
  const effectiveDeptKey =
    normalizeDepartment(deptKey) || normalizeDepartment(deptName) || "cse";

  const currentFacultyUsername = authApi.currentUser()?.username;
  const currentFacultyFullName = authApi.currentUser()?.name || facultyName;

  const [circulars, setCirculars] = useState<Circular[]>(() =>
    getCircularsForFaculty(effectiveDeptKey, currentFacultyUsername, currentFacultyFullName)
  );

  // Executive Filter State
  const [activeSegment, setActiveSegment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    void refreshCircularsFromServer();
    const unsub = subscribeCirculars(() => {
      setCirculars(getCircularsForFaculty(effectiveDeptKey, currentFacultyUsername, currentFacultyFullName));
    });
    return unsub;
  }, [effectiveDeptKey, currentFacultyUsername, currentFacultyFullName]);

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

      // 2. Active Segment Filter
      const action = findHodAction(circ.hodActions, effectiveDeptKey);
      const isStudentForwarded =
        action &&
        (action.target === "STUDENTS_ONLY" || action.target === "FACULTY_AND_STUDENTS");

      let segmentMatch = true;
      if (activeSegment === "DELETED") {
        segmentMatch = circ.status === "DELETED";
      } else {
        if (circ.status === "DELETED") return false;

        if (activeSegment === "STUDENTS_FORWARDED" || activeSegment === "FORWARDED") {
          segmentMatch = Boolean(isStudentForwarded);
        } else if (activeSegment === "FACULTY_ONLY") {
          segmentMatch = !isStudentForwarded;
        } else if (activeSegment === "URGENT") {
          segmentMatch = circ.priority === "URGENT" || circ.priority === "HIGH";
        } else if (activeSegment === "ACADEMIC") {
          segmentMatch = circ.category === "ACADEMIC";
        }
      }

      return searchMatch && segmentMatch;
    });
  }, [circulars, searchQuery, activeSegment, effectiveDeptKey]);

  // Real-time Badge Counts
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
      const action = findHodAction(c.hodActions, effectiveDeptKey);
      if (
        action &&
        (action.target === "STUDENTS_ONLY" || action.target === "FACULTY_AND_STUDENTS")
      ) {
        forwarded++;
      }
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
  }, [circulars, filteredCirculars.length, effectiveDeptKey]);

  const segments = [
    { key: "ALL", label: "Active Circulars", count: circulars.filter((c) => c.status !== "DELETED").length },
    { key: "STUDENTS_FORWARDED", label: "Released to Students", count: filterCounts.forwarded ?? 0 },
    { key: "FACULTY_ONLY", label: "Faculty Only", count: Math.max(0, circulars.filter((c) => c.status !== "DELETED").length - (filterCounts.forwarded ?? 0)) },
    { key: "URGENT", label: "Urgent", count: filterCounts.urgent },
    { key: "ACADEMIC", label: "Academic", count: filterCounts.academic },
    { key: "DELETED", label: "Deleted / Revoked", count: filterCounts.deleted ?? 0 },
  ];

  const handleOpenDialog = (circ: Circular) => {
    setSelectedCircular(circ);
    setIsDialogOpen(true);
    const facultyKey = `FACULTY_${(currentFacultyUsername || "anon").toLowerCase()}`;
    const existing = circ.hodActions?.[facultyKey];
    if (!existing) {
      updateHodAction(circ.id, facultyKey, {
        hodId: `FACULTY-${currentFacultyUsername || "0"}`,
        hodName: currentFacultyFullName,
        deptKey: effectiveDeptKey,
        deptName,
        action: "SEEN",
        forwardedAt: new Date().toISOString(),
        remarks: `Viewed by ${currentFacultyFullName}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold">
              <Users size={14} />
              <span>Department Faculty Circular Desk • {deptName}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Official Academic & Administrative Circulars
            </h1>
            <p className="text-xs text-slate-300">
              Read-only circular notice hub. Includes direct executive directives from Associate Dean / COE and downstream HOD forwarding records.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-xs">
            <ShieldCheck size={18} className="text-[#D4A72C]" />
            <div>
              <p className="font-bold text-white">{facultyName}</p>
              <p className="text-[10px] text-slate-400">Read-Only Access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Stat Cards */}
      <CircularMetricStatCards
        counts={filterCounts}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        role="FACULTY"
      />

      {/* Main Review Card */}
      <div className="rounded-3xl shadow-sm border border-slate-200 overflow-hidden bg-white">
        {/* Integrated Single-Row Header Filter */}
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
          }}
          hasActiveFilters={Boolean(searchQuery || activeSegment !== "ALL")}
          title="Faculty Notices Queue"
          subtitle="Official memorandums distributed by Associate Dean or Department HOD."
        />

        {/* Circulars List */}
        <div className="p-4 sm:p-6">
          {filteredCirculars.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FileText size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700">No circulars match current filters</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No active memorandum matches the search keyword or segment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCirculars.map((circ) => {
                const action = findHodAction(circ.hodActions, effectiveDeptKey);
                const isStudentForwarded =
                  action &&
                  (action.target === "STUDENTS_ONLY" ||
                    action.target === "FACULTY_AND_STUDENTS");

                const isDirectFaculty = circ.targetAudiences?.includes("FACULTY");

                const attCount =
                  circ.attachments && circ.attachments.length > 0
                    ? circ.attachments.length
                    : circ.attachment
                    ? 1
                    : 0;

                return (
                  <div
                    key={circ.id}
                    onClick={() => handleOpenDialog(circ)}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-[#0B192C]/40 bg-white hover:bg-slate-50/70 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Avatar Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] font-black text-sm flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
                        FAC
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                            {circ.refNo}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                            {circ.category}
                          </span>
                          {circ.priority === "URGENT" && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              URGENT
                            </span>
                          )}

                          {/* Routing Badge */}
                          {circ.status === "DELETED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-md">
                              <Trash2 size={11} className="text-rose-600" /> Deleted / Revoked
                            </span>
                          ) : circ.targetFacultyIds && circ.targetFacultyIds.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-md">
                              <Users size={11} className="text-purple-600" /> Direct Specific Faculty Directive
                            </span>
                          ) : isDirectFaculty && !action ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-md">
                              <Send size={11} className="text-blue-600" /> Direct Executive Directive
                            </span>
                          ) : isStudentForwarded ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Released to Students ({action?.targetYears?.join(", ")})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-md">
                              <Lock size={12} className="text-slate-500" /> Faculty Eyes Only
                            </span>
                          )}

                          {attCount > 0 && circ.status !== "DELETED" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Paperclip size={12} className="text-slate-500" />
                              {attCount} file(s)
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto md:ml-0">
                            <Clock size={12} />
                            {new Date(circ.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#0B192C] transition-colors truncate">
                          {circ.status === "DELETED"
                            ? `[Notice Retracted — Topic Withdrawn by ${circ.deletedBy?.role === "COE" ? "COE" : "Associate Dean"}]`
                            : circ.subject}
                        </h4>

                        {circ.status === "DELETED" && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                            <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-[10px] uppercase text-rose-700 block">Notice Recalled / Deleted</span>
                              <span className="text-rose-800">
                                {circ.deletedBy?.role === "COE" ? "COE" : "Associate Dean"} {circ.deletedBy?.name ? `(${circ.deletedBy.name})` : ""} deleted this circular on {new Date(circ.deletedAt || circ.createdAt).toLocaleString()}. This circular is no longer active.
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Origin: <strong className="text-slate-800">{circ.createdBy.name}</strong>
                          </span>
                          {action ? (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>
                                Forwarded by HOD: <strong className="text-slate-700">{action.hodName}</strong> ({new Date(action.forwardedAt).toLocaleDateString()})
                              </span>
                            </>
                          ) : isDirectFaculty ? (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-blue-700 font-semibold">
                                Delivered directly to Teaching Faculty
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-slate-100 group-hover:bg-[#0B192C] group-hover:text-white transition flex items-center cursor-pointer">
                        <span>View Circular</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pop-up Window Dialog */}
      <CircularDialog
        circular={selectedCircular}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        userRole="FACULTY"
        deptKey={effectiveDeptKey}
        deptName={deptName}
      />
    </div>
  );
};
