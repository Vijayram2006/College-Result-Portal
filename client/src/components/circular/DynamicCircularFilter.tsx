import React from "react";
import {
  Search,
  X,
  RotateCcw,
  Inbox,
  AlertTriangle,
  GraduationCap,
  CheckCircle2,
  Building2,
  SlidersHorizontal,
  Layers,
  Clock,
  Send,
  Lock,
  Trash2,
  FileText,
  Users,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Input } from "../ui/input";

export interface FilterCounts {
  total: number;
  filtered: number;
  urgent: number;
  academic: number;
  examination?: number;
  actionRequired?: number;
  forwarded?: number;
  deleted?: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus?: Record<string, number>;
}

interface CircularMetricStatCardsProps {
  counts: FilterCounts;
  activeSegment: string;
  onSegmentChange: (seg: string) => void;
  role?: "DEAN" | "HOD" | "FACULTY" | "STUDENT";
}

export const CircularMetricStatCards: React.FC<CircularMetricStatCardsProps> = ({
  counts,
  activeSegment,
  onSegmentChange,
  role = "DEAN",
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Queue */}
      <div
        onClick={() => onSegmentChange("ALL")}
        className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs space-y-1 ${activeSegment === "ALL"
          ? "border-[#0B192C] bg-slate-50 ring-2 ring-[#0B192C]/10 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
          }`}
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Total in Queue
          </span>
          <Inbox className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-black text-slate-900">{counts.total}</div>
        <p className="text-[11px] text-slate-500 font-medium">All circular records</p>
      </div>

      {/* Card 2: Urgent / Priority */}
      <div
        onClick={() => onSegmentChange("URGENT")}
        className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs space-y-1 ${activeSegment === "URGENT"
          ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-400/20 shadow-sm"
          : "border-rose-200 bg-gradient-to-br from-rose-50/60 to-white hover:border-rose-300"
          }`}
      >
        <div className="flex items-center justify-between text-rose-700">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">
            Urgent Action
          </span>
          <AlertTriangle className="w-4 h-4 text-rose-600" />
        </div>
        <div className="text-2xl font-black text-rose-800">{counts.urgent}</div>
        <p className="text-[11px] text-rose-700 font-medium">Immediate attention notices</p>
      </div>

      {/* Card 3: Academic & Exams */}
      <div
        onClick={() => onSegmentChange("ACADEMIC")}
        className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs space-y-1 ${activeSegment === "ACADEMIC"
          ? "border-blue-400 bg-blue-50/80 ring-2 ring-blue-400/20 shadow-sm"
          : "border-blue-200 bg-gradient-to-br from-blue-50/60 to-white hover:border-blue-300"
          }`}
      >
        <div className="flex items-center justify-between text-blue-700">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
            Academic & Syllabus
          </span>
          <GraduationCap className="w-4 h-4 text-blue-600" />
        </div>
        <div className="text-2xl font-black text-blue-800">{counts.academic}</div>
        <p className="text-[11px] text-blue-700 font-medium">Curriculum and academic circulars</p>
      </div>

      {/* Card 4: Action Status / Forwarded */}
      <div
        onClick={() => onSegmentChange(role === "HOD" ? "ACTION_REQUIRED" : "FORWARDED")}
        className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs space-y-1 ${activeSegment === "ACTION_REQUIRED" || activeSegment === "FORWARDED"
          ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-400/20 shadow-sm"
          : "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white hover:border-emerald-300"
          }`}
      >
        <div className="flex items-center justify-between text-emerald-700">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
            {role === "HOD" ? "Action Required" : "Distributed / Active"}
          </span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-2xl font-black text-emerald-800">
          {role === "HOD" ? (counts.actionRequired ?? 0) : (counts.forwarded ?? counts.total)}
        </div>
        <p className="text-[11px] text-emerald-700 font-medium">
          {role === "HOD" ? "Pending department action" : "Forwarded & released"}
        </p>
      </div>
    </div>
  );
};

export interface SegmentDisplayConfig {
  icon: React.ReactNode;
  buttonClass: string;
  badgeClass: string;
}

export const getCircularSegmentConfig = (key: string, isSelected: boolean): SegmentDisplayConfig => {
  switch (key) {
    case "ALL":
    case "ACTIVE":
      return {
        icon: <Layers className="w-3.5 h-3.5 shrink-0" />,
        buttonClass: isSelected
          ? "bg-[#0B192C] text-[#D4A72C] border-[#0B192C] shadow-sm shadow-[#0B192C]/25 ring-2 ring-[#D4A72C]/30 font-black"
          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-[#D4A72C] text-[#0B192C] font-black"
          : "bg-slate-100 text-slate-700 font-bold",
      };
    case "ACTION_REQUIRED":
    case "PENDING":
    case "PENDING_HOD":
      return {
        icon: <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-200" : "text-amber-600"}`} />,
        buttonClass: isSelected
          ? "bg-amber-600 text-white border-amber-700 shadow-sm shadow-amber-600/30 ring-2 ring-amber-400/40 font-black"
          : "bg-amber-50/70 text-amber-900 border-amber-200/90 hover:bg-amber-100/80 hover:border-amber-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-amber-950 text-amber-200 font-black"
          : "bg-amber-200/90 text-amber-900 font-bold",
      };
    case "FORWARDED":
    case "STUDENTS_FORWARDED":
    case "PUBLISHED":
      return {
        icon: <Send className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-200" : "text-emerald-600"}`} />,
        buttonClass: isSelected
          ? "bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-400/40 font-black"
          : "bg-emerald-50/70 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100/80 hover:border-emerald-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-emerald-950 text-emerald-200 font-black"
          : "bg-emerald-200/90 text-emerald-900 font-bold",
      };
    case "KEPT":
      return {
        icon: <Lock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-200" : "text-indigo-600"}`} />,
        buttonClass: isSelected
          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-400/40 font-black"
          : "bg-indigo-50/70 text-indigo-900 border-indigo-200/90 hover:bg-indigo-100/80 hover:border-indigo-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-indigo-950 text-indigo-200 font-black"
          : "bg-indigo-200/90 text-indigo-900 font-bold",
      };
    case "URGENT":
      return {
        icon: <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-rose-200" : "text-rose-600"}`} />,
        buttonClass: isSelected
          ? "bg-rose-600 text-white border-rose-700 shadow-sm shadow-rose-600/30 ring-2 ring-rose-400/40 font-black"
          : "bg-rose-50/70 text-rose-900 border-rose-200/90 hover:bg-rose-100/80 hover:border-rose-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-rose-950 text-rose-200 font-black"
          : "bg-rose-200/90 text-rose-900 font-bold",
      };
    case "ACADEMIC":
      return {
        icon: <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-200" : "text-blue-600"}`} />,
        buttonClass: isSelected
          ? "bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-600/30 ring-2 ring-blue-400/40 font-black"
          : "bg-blue-50/70 text-blue-900 border-blue-200/90 hover:bg-blue-100/80 hover:border-blue-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-blue-950 text-blue-200 font-black"
          : "bg-blue-200/90 text-blue-900 font-bold",
      };
    case "EXAMINATION":
      return {
        icon: <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-purple-200" : "text-purple-600"}`} />,
        buttonClass: isSelected
          ? "bg-purple-600 text-white border-purple-700 shadow-sm shadow-purple-600/30 ring-2 ring-purple-400/40 font-black"
          : "bg-purple-50/70 text-purple-900 border-purple-200/90 hover:bg-purple-100/80 hover:border-purple-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-purple-950 text-purple-200 font-black"
          : "bg-purple-200/90 text-purple-900 font-bold",
      };
    case "FACULTY_ONLY":
      return {
        icon: <Users className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-slate-200" : "text-slate-600"}`} />,
        buttonClass: isSelected
          ? "bg-slate-800 text-white border-slate-900 shadow-sm shadow-slate-800/25 ring-2 ring-slate-400/30 font-black"
          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-slate-950 text-slate-200 font-black"
          : "bg-slate-200 text-slate-700 font-bold",
      };
    case "COE_DIRECTIVES":
      return {
        icon: <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-purple-200" : "text-purple-700"}`} />,
        buttonClass: isSelected
          ? "bg-purple-700 text-white border-purple-800 shadow-sm shadow-purple-700/30 ring-2 ring-purple-400/40 font-black"
          : "bg-purple-50/70 text-purple-900 border-purple-200/80 hover:bg-purple-100/80 hover:border-purple-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-purple-950 text-purple-200 font-black"
          : "bg-purple-200/90 text-purple-900 font-bold",
      };
    case "APPROVED":
      return {
        icon: <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-200" : "text-indigo-600"}`} />,
        buttonClass: isSelected
          ? "bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-400/40 font-black"
          : "bg-indigo-50/70 text-indigo-900 border-indigo-200/80 hover:bg-indigo-100/80 hover:border-indigo-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-indigo-950 text-indigo-200 font-black"
          : "bg-indigo-200/90 text-indigo-900 font-bold",
      };
    case "DELETED":
      return {
        icon: <Trash2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-rose-200" : "text-rose-600"}`} />,
        buttonClass: isSelected
          ? "bg-rose-900 text-white border-rose-950 shadow-sm shadow-rose-900/35 ring-2 ring-rose-500/40 font-black"
          : "bg-rose-50/70 text-rose-800 border-rose-200/80 hover:bg-rose-100/80 hover:border-rose-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-rose-200 text-rose-950 font-black"
          : "bg-rose-200/80 text-rose-800 font-bold",
      };
    default:
      return {
        icon: <Inbox className="w-3.5 h-3.5 shrink-0" />,
        buttonClass: isSelected
          ? "bg-slate-900 text-white border-slate-900 shadow-sm font-black"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-2xs font-bold",
        badgeClass: isSelected
          ? "bg-slate-700 text-white font-black"
          : "bg-slate-200 text-slate-700 font-bold",
      };
  }
};

interface DynamicCircularFilterProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeSegment: string;
  onSegmentChange: (seg: string) => void;
  segments: { key: string; label: string; count: number }[];
  counts: FilterCounts;
  onReset: () => void;
  hasActiveFilters: boolean;
  title?: string;
  subtitle?: string;
  extraControls?: React.ReactNode;
}

export const DynamicCircularFilter: React.FC<DynamicCircularFilterProps> = ({
  searchQuery,
  onSearchChange,
  activeSegment,
  onSegmentChange,
  segments,
  counts,
  onReset,
  hasActiveFilters,
  title = "Circulars Queue",
  subtitle = "Select any official circular to view complete document, attachments, or take routing action.",
  extraControls,
}) => {
  return (
    <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-t-3xl">
      {/* Title & Stats */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
            {counts.filtered} displayed
          </span>
        </div>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      {/* Interactive Single-Row Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search circulars, ref, content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-1 focus-visible:ring-[#0B192C] bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Executive Themed Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
          {segments.map((seg) => {
            const isSelected = activeSegment === seg.key;
            const config = getCircularSegmentConfig(seg.key, isSelected);

            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSegmentChange(seg.key)}
                className={`px-3 py-1.5 text-xs rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-2 border hover:-translate-y-0.5 active:translate-y-0 ${config.buttonClass}`}
              >
                {config.icon}
                <span>{seg.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${config.badgeClass}`}
                >
                  {seg.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Extra Role-Specific Controls (e.g. Department dropdown) */}
        {extraControls}

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition cursor-pointer"
            title="Clear all active filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
