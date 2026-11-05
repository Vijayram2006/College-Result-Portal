import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Clock,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  GraduationCap,
  Send,
  Lock,
  ArrowRight,
  ShieldCheck,
  Search,
  Check,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Circular,
  HodDistributionTarget,
  StudentYear,
  ALL_STUDENT_YEARS,
  normalizeDepartment,
} from "./CircularTypes";
import {
  getCircularsForHod,
  updateHodAction,
  subscribeCirculars,
  refreshCircularsFromServer,
  findHodAction,
} from "./circularStore";
import { CircularDialog } from "./CircularDialog";
import {
  DynamicCircularFilter,
  CircularMetricStatCards,
  FilterCounts,
} from "./DynamicCircularFilter";

interface CircularHodViewProps {
  deptKey?: string;
  deptName?: string;
  hodName?: string;
  onToast?: (msg: string) => void;
}

export const CircularHodView: React.FC<CircularHodViewProps> = ({
  deptKey = "cse",
  deptName = "Computer Science & Engineering",
  hodName = "Dr. K. Rajesh (HOD)",
  onToast,
}) => {
  const effectiveDeptKey =
    normalizeDepartment(deptKey) || normalizeDepartment(deptName) || "cse";

  const [circulars, setCirculars] = useState<Circular[]>(() =>
    getCircularsForHod(effectiveDeptKey)
  );

  // Executive Filter State
  const [activeSegment, setActiveSegment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Forwarding Modal State
  const [forwardingCircular, setForwardingCircular] = useState<Circular | null>(null);
  const [forwardTarget, setForwardTarget] = useState<HodDistributionTarget>("FACULTY_AND_STUDENTS");
  const [selectedYears, setSelectedYears] = useState<StudentYear[]>([
    "2nd Year",
    "3rd Year",
    "4th Year",
  ]);
  const [hodRemarks, setHodRemarks] = useState("");

  useEffect(() => {
    void refreshCircularsFromServer();
    const unsub = subscribeCirculars(() => {
      setCirculars(getCircularsForHod(effectiveDeptKey));
    });
    return unsub;
  }, [effectiveDeptKey]);

  const toggleYear = (year: StudentYear) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleKeepCircular = (circ: Circular, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const confirmed = window.confirm(
      `Keep circular "${circ.subject}" for departmental records without forwarding downstream?`
    );
    if (!confirmed) return;

    updateHodAction(circ.id, effectiveDeptKey, {
      hodId: `HOD-${effectiveDeptKey.toUpperCase()}`,
      hodName,
      deptKey: effectiveDeptKey,
      deptName,
      action: "KEPT",
      forwardedAt: new Date().toISOString(),
      remarks: "Retained in department records by HOD.",
    });

    if (onToast) {
      onToast("Circular retained in departmental records.");
    }
  };

  const openForwardModal = (circ: Circular, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const existingAction = findHodAction(circ.hodActions, effectiveDeptKey);
    if (existingAction && existingAction.action === "FORWARDED") {
      setForwardTarget(existingAction.target || "FACULTY_AND_STUDENTS");
      setSelectedYears(existingAction.targetYears || ["2nd Year", "3rd Year", "4th Year"]);
      setHodRemarks(existingAction.remarks || "");
    } else {
      setForwardTarget("FACULTY_AND_STUDENTS");
      setSelectedYears(["2nd Year", "3rd Year", "4th Year"]);
      setHodRemarks("");
    }
    setForwardingCircular(circ);
  };

  const handleConfirmForward = () => {
    if (!forwardingCircular) return;

    if (
      (forwardTarget === "STUDENTS_ONLY" || forwardTarget === "FACULTY_AND_STUDENTS") &&
      selectedYears.length === 0
    ) {
      alert("Please select at least one student class year to forward.");
      return;
    }

    updateHodAction(forwardingCircular.id, effectiveDeptKey, {
      hodId: `HOD-${effectiveDeptKey.toUpperCase()}`,
      hodName,
      deptKey: effectiveDeptKey,
      deptName,
      action: "FORWARDED",
      target: forwardTarget,
      targetYears:
        forwardTarget === "FACULTY_ONLY" ? [] : selectedYears,
      forwardedAt: new Date().toISOString(),
      remarks: hodRemarks.trim() || undefined,
    });

    if (onToast) {
      onToast(
        forwardTarget === "FACULTY_ONLY"
          ? "Circular successfully forwarded to department faculty!"
          : forwardTarget === "STUDENTS_ONLY"
            ? `Circular forwarded to ${selectedYears.join(", ")} students!`
            : `Circular forwarded to department faculty and ${selectedYears.join(", ")} students!`
      );
    }

    setForwardingCircular(null);
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

      // 2. Active Segment Filter
      const myAction = findHodAction(circ.hodActions, effectiveDeptKey);
      let segmentMatch = true;
      if (activeSegment === "DELETED") {
        segmentMatch = circ.status === "DELETED";
      } else {
        if (circ.status === "DELETED") return false;

        if (activeSegment === "ACTION_REQUIRED" || activeSegment === "PENDING") {
          segmentMatch = !myAction || myAction.action === "SEEN";
        } else if (activeSegment === "FORWARDED") {
          segmentMatch = myAction?.action === "FORWARDED";
        } else if (activeSegment === "KEPT") {
          segmentMatch = myAction?.action === "KEPT";
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
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let pending = 0;
    let kept = 0;
    let forwarded = 0;
    let urgent = 0;
    let academic = 0;
    let deleted = 0;

    circulars.forEach((c) => {
      if (c.status === "DELETED") {
        deleted++;
        return;
      }
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
      if (c.priority === "URGENT" || c.priority === "HIGH") urgent++;
      if (c.category === "ACADEMIC") academic++;

      const act = findHodAction(c.hodActions, effectiveDeptKey);
      if (!act || act.action === "SEEN") pending++;
      else if (act.action === "KEPT") kept++;
      else if (act.action === "FORWARDED") forwarded++;
    });

    return {
      total: circulars.length,
      filtered: filteredCirculars.length,
      urgent,
      academic,
      deleted,
      actionRequired: pending,
      forwarded,
      byCategory,
      byPriority,
      byStatus: {
        PENDING: pending,
        KEPT: kept,
        FORWARDED: forwarded,
      },
    };
  }, [circulars, filteredCirculars, effectiveDeptKey]);

  const resetFilters = () => {
    setSearchQuery("");
    setActiveSegment("ALL");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || activeSegment !== "ALL";

  const handleOpenCircular = (circ: Circular) => {
    setSelectedCircular(circ);
    setIsDialogOpen(true);
    const existing = findHodAction(circ.hodActions, effectiveDeptKey);
    if (!existing) {
      updateHodAction(circ.id, effectiveDeptKey, {
        hodId: `HOD-${effectiveDeptKey.toUpperCase()}`,
        hodName,
        deptKey: effectiveDeptKey,
        deptName,
        action: "SEEN",
        forwardedAt: new Date().toISOString(),
        remarks: "Viewed by Department HOD.",
      });
    }
  };

  const segments = [
    { key: "ALL", label: "Active Circulars", count: circulars.filter((c) => c.status !== "DELETED").length },
    { key: "ACTION_REQUIRED", label: "Action Required", count: filterCounts.actionRequired ?? 0 },
    { key: "FORWARDED", label: "Forwarded", count: filterCounts.forwarded ?? 0 },
    { key: "KEPT", label: "Kept in Dept", count: filterCounts.byStatus?.KEPT ?? 0 },
    { key: "URGENT", label: "Urgent", count: filterCounts.urgent },
    { key: "DELETED", label: "Deleted / Revoked", count: filterCounts.deleted ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <Building2 size={14} />
              <span>HOD Department Circular Desk • {deptName}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Institutional Circulars from Associate Dean
            </h1>
            <p className="text-xs text-slate-300">
              Read incoming Dean circulars (read-only). Retain in department records or forward down to department faculties and specific year students.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-xs">
            <ShieldCheck size={18} className="text-[#D4A72C]" />
            <div>
              <p className="font-bold text-white">{hodName}</p>
              <p className="text-[10px] text-slate-400">Head of Department</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Stat Cards */}
      <CircularMetricStatCards
        counts={filterCounts}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        role="HOD"
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
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          title="Department Circulars Queue"
          subtitle="Select any circular to inspect full description, attachments, or manage department forwarding."
        />

        {/* Circulars List Content */}
        <div className="p-6 sm:p-7">
          {filteredCirculars.length === 0 ? (
            <div className="py-16 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8 space-y-3 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-bold text-slate-900">
                  {hasActiveFilters
                    ? "No matching circulars found"
                    : "No circulars in queue"}
                </h3>
                <p className="text-xs text-slate-500">
                  {hasActiveFilters
                    ? "Try clearing or adjusting your search criteria and filter tabs."
                    : "New circulars routed from the Associate Dean will appear here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCirculars.map((circ) => {
                const action = findHodAction(circ.hodActions, effectiveDeptKey);
                const isPending = !action;
                const isActionRequired = !action || action.action === "SEEN";
                const attCount =
                  circ.attachments?.length || (circ.attachment ? 1 : 0);

                return (
                  <div
                    key={circ.id}
                    onClick={() => handleOpenCircular(circ)}
                    className={`group relative p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isActionRequired
                      ? "border-amber-300/80 bg-amber-50/20 hover:border-amber-400 hover:shadow-md"
                      : "border-slate-200/90 bg-white hover:border-[#0B192C]/40 hover:shadow-md"
                      }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Avatar Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] font-black text-sm flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
                        HOD
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

                          {circ.createdBy?.role === "COE" && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              COE Directive {circ.approvedBy ? "• Dean Sanctioned ✓" : ""}
                            </span>
                          )}

                          {/* HOD Status Badge */}
                          {circ.status === "DELETED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-md">
                              <Trash2 size={12} className="text-rose-600" /> Deleted / Revoked
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-md animate-pulse">
                              ● Action Required
                            </span>
                          ) : action.action === "SEEN" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-md">
                              <CheckCircle2 size={12} className="text-teal-600" /> Seen (Action Required)
                            </span>
                          ) : action.action === "FORWARDED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Forwarded ({action.target === "FACULTY_ONLY" ? "Faculty" : action.target === "STUDENTS_ONLY" ? "Students" : "Faculty & Students"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-md">
                              <Lock size={12} className="text-blue-600" /> Kept in Dept Records
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
                            Issued by: <strong className="text-slate-800">{circ.createdBy.name} ({circ.createdBy.role === "COE" ? "COE" : "Associate Dean"})</strong>
                            {circ.approvedBy && (
                              <span className="text-emerald-700 ml-1.5 font-semibold">
                                • Sanctioned by {circ.approvedBy.name}
                              </span>
                            )}
                          </span>
                          {action && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>
                                Actioned: <strong className="text-slate-700">{new Date(action.forwardedAt).toLocaleString()}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="shrink-0 flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {circ.status === "DELETED" ? (
                        <span className="h-9 px-3 text-xs font-bold rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-1">
                          <Trash2 size={12} />
                          <span>Revoked</span>
                        </span>
                      ) : isActionRequired ? (
                        <>
                          <button
                            onClick={(e) => handleKeepCircular(circ, e)}
                            className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                          >
                            Keep
                          </button>
                          <button
                            onClick={(e) => openForwardModal(circ, e)}
                            className="h-9 px-3.5 text-xs font-bold rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] transition flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Send size={12} />
                            <span>Forward</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => openForwardModal(circ, e)}
                          className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                        >
                          Update Forwarding
                        </button>
                      )}

                      <button className="h-9 px-3.5 text-xs font-bold gap-1 rounded-xl bg-slate-100 group-hover:bg-[#0B192C] group-hover:text-white transition flex items-center cursor-pointer">
                        <span>Details</span>
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
        userRole="HOD"
        deptKey={effectiveDeptKey}
        deptName={deptName}
        onToast={onToast}
        onActionComplete={() => setCirculars(getCircularsForHod(effectiveDeptKey))}
        onForward={(circ) => {
          setIsDialogOpen(false);
          openForwardModal(circ);
        }}
        onKeep={(circ) => {
          handleKeepCircular(circ);
        }}
      />

      {/* HOD FORWARDING MODAL */}
      {forwardingCircular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#0B192C] text-[#D4A72C]">
                {forwardingCircular.refNo}
              </span>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                Forward Circular Downstream
              </h3>
              <p className="text-xs text-slate-500">
                Choose distribution destination for {deptName}.
              </p>
            </div>

            {/* Target Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">
                Distribution Target
              </label>

              <div className="grid grid-cols-1 gap-2">
                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${forwardTarget === "FACULTY_AND_STUDENTS"
                    ? "border-[#0B192C] bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="forwardTarget"
                    value="FACULTY_AND_STUDENTS"
                    checked={forwardTarget === "FACULTY_AND_STUDENTS"}
                    onChange={() => setForwardTarget("FACULTY_AND_STUDENTS")}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Both Department Faculty & Students
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Release to faculty circular desk and student notice board
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${forwardTarget === "FACULTY_ONLY"
                    ? "border-[#0B192C] bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="forwardTarget"
                    value="FACULTY_ONLY"
                    checked={forwardTarget === "FACULTY_ONLY"}
                    onChange={() => setForwardTarget("FACULTY_ONLY")}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Department Faculty Only
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Restricted to faculty (students will not see this circular)
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${forwardTarget === "STUDENTS_ONLY"
                    ? "border-[#0B192C] bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                  <input
                    type="radio"
                    name="forwardTarget"
                    value="STUDENTS_ONLY"
                    checked={forwardTarget === "STUDENTS_ONLY"}
                    onChange={() => setForwardTarget("STUDENTS_ONLY")}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Department Students Only
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Direct release to department class years
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Student Years (if students included) */}
            {(forwardTarget === "STUDENTS_ONLY" ||
              forwardTarget === "FACULTY_AND_STUDENTS") && (
                <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Select Department Student Class Years</span>
                    <span className="text-[10px] text-slate-500">
                      {selectedYears.length} year(s) chosen
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {ALL_STUDENT_YEARS.map((year) => {
                      const isSelected = selectedYears.includes(year);
                      return (
                        <button
                          type="button"
                          key={year}
                          onClick={() => toggleYear(year)}
                          className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer border ${isSelected
                            ? "bg-[#0B192C] text-white border-[#0B192C]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <span>{year}</span>
                          {isSelected && (
                            <CheckCircle2 size={14} className="text-[#D4A72C]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Remarks */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                HOD Endorsement Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Strict attendance required for review session..."
                value={hodRemarks}
                onChange={(e) => setHodRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-[#0B192C]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setForwardingCircular(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmForward}
                className="px-5 py-2 text-xs font-extrabold rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] transition cursor-pointer shadow-sm"
              >
                Confirm & Forward Downstream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
