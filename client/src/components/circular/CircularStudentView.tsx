import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Clock,
  Paperclip,
  GraduationCap,
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Circular, StudentYear, normalizeDepartment } from "./CircularTypes";
import {
  getCircularsForStudent,
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

interface CircularStudentViewProps {
  deptKey?: string;
  deptName?: string;
  studentYear?: StudentYear;
  studentName?: string;
  regNo?: string;
}

export const CircularStudentView: React.FC<CircularStudentViewProps> = ({
  deptKey = "cse",
  deptName = "Computer Science & Engineering",
  studentYear = "3rd Year",
  studentName = "Student",
  regNo = "711521104001",
}) => {
  const effectiveDeptKey =
    normalizeDepartment(deptKey) || normalizeDepartment(deptName) || "cse";

  const [circulars, setCirculars] = useState<Circular[]>(() =>
    getCircularsForStudent(effectiveDeptKey, studentYear)
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
      setCirculars(getCircularsForStudent(effectiveDeptKey, studentYear));
    });
    return unsub;
  }, [effectiveDeptKey, studentYear]);

  // Executive Filtering Logic
  const filteredCirculars = useMemo(() => {
    return circulars.filter((c) => {
      // 1. Text Search
      const searchMatch =
        !searchQuery.trim() ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.attachments && c.attachments.some((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (c.attachment && c.attachment.name.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Active Segment Filter
      let segmentMatch = true;
      if (activeSegment === "DELETED") {
        segmentMatch = c.status === "DELETED";
      } else {
        if (c.status === "DELETED") return false;

        if (activeSegment === "URGENT") {
          segmentMatch = c.priority === "URGENT" || c.priority === "HIGH";
        } else if (activeSegment === "ACADEMIC") {
          segmentMatch = c.category === "ACADEMIC";
        } else if (activeSegment === "EXAMINATION") {
          segmentMatch = c.category === "EXAMINATION";
        }
      }

      return searchMatch && segmentMatch;
    });
  }, [circulars, searchQuery, activeSegment]);

  // Real-time Badge Counts
  const filterCounts: FilterCounts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let urgent = 0;
    let academic = 0;
    let examination = 0;
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
      if (c.category === "EXAMINATION") examination++;
    });

    return {
      total: circulars.length,
      filtered: filteredCirculars.length,
      urgent,
      academic,
      examination,
      forwarded: circulars.filter((c) => c.status !== "DELETED").length,
      deleted,
      byCategory,
      byPriority,
    };
  }, [circulars, filteredCirculars]);

  const resetFilters = () => {
    setSearchQuery("");
    setActiveSegment("ALL");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || activeSegment !== "ALL";

  const handleOpenCircular = (circ: Circular) => {
    setSelectedCircular(circ);
    setIsDialogOpen(true);
  };

  const segments = [
    { key: "ALL", label: "Active Notices", count: circulars.filter((c) => c.status !== "DELETED").length },
    { key: "ACADEMIC", label: "Academic", count: filterCounts.academic },
    { key: "EXAMINATION", label: "Exam", count: filterCounts.examination ?? 0 },
    { key: "URGENT", label: "Urgent", count: filterCounts.urgent },
    { key: "DELETED", label: "Deleted / Revoked", count: filterCounts.deleted ?? 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B192C] via-[#1E3E62] to-[#0B192C] text-white p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A72C]/20 border border-[#D4A72C]/40 text-[#D4A72C] text-xs font-semibold">
              <GraduationCap size={14} />
              <span>Student Circular Board • {deptName}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Official Department Notices & Circulars
            </h1>
            <p className="text-xs text-slate-300">
              Official notices approved by the Associate Dean and forwarded by your Head of Department for {studentYear}.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700 text-xs">
            <div className="text-right">
              <p className="font-bold text-white">{studentName}</p>
              <p className="text-[10px] text-[#D4A72C]">
                {deptName} • {studentYear}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Stat Cards */}
      <CircularMetricStatCards
        counts={filterCounts}
        activeSegment={activeSegment}
        onSegmentChange={setActiveSegment}
        role="STUDENT"
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
          title="Student Circulars Queue"
          subtitle={`Notices officially released by the HOD for ${studentYear} students.`}
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
                    ? "No matching notices found"
                    : `No active circulars for ${studentYear}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {hasActiveFilters
                    ? "Try clearing or adjusting your search criteria and filter tabs."
                    : "New official circulars released to your class will automatically appear here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCirculars.map((circ) => {
                const attCount =
                  circ.attachments?.length || (circ.attachment ? 1 : 0);

                return (
                  <div
                    key={circ.id}
                    onClick={() => handleOpenCircular(circ)}
                    className="group relative p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-[#0B192C]/40 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Avatar Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-[#0B192C] text-[#D4A72C] font-black text-sm flex items-center justify-center shrink-0 shadow-xs border border-slate-800">
                        STU
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
                          {circ.status === "DELETED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                              <Trash2 size={12} className="text-rose-600" />
                              Deleted / Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Official Release
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
                                This circular was officially deleted on {new Date(circ.deletedAt || circ.createdAt).toLocaleString()}.
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            Origin: <strong className="text-slate-800">{circ.createdBy.name}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>
                            Audience: <strong className="text-slate-700">{studentYear} Students</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-slate-100 group-hover:bg-[#0B192C] group-hover:text-white transition flex items-center cursor-pointer">
                        <span>View Notice</span>
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
        userRole="STUDENT"
        deptKey={effectiveDeptKey}
        deptName={deptName}
      />
    </div>
  );
};
