
import React, { useState, useMemo } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Edit3,
  Eye,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { DraftSummary } from "../../services/hallTicketAdminApi";

interface Props {
  drafts: DraftSummary[];
  loading: boolean;
  onRefresh: () => void;
  onOpenEdit: (id: number) => void;
  onOpenPreview: (id: number) => void;
}

export function HallTicketDraftList({
  drafts,
  loading,
  onRefresh,
  onOpenEdit,
  onOpenPreview,
}: Props) {
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        d.studentReg.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.degreeBranch.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === "SIGNED") return d.signStatus === "COE_SIGNED";
      if (statusFilter === "GENERATED") return d.signStatus === "GENERATED";
      if (statusFilter === "ISSUES") return d.blockingIssueCount > 0;
      return true;
    });
  }, [drafts, search, statusFilter]);

  const signedCount = useMemo(
    () => drafts.filter((d) => d.signStatus === "COE_SIGNED").length,
    [drafts]
  );
  const issuesCount = useMemo(
    () => drafts.filter((d) => d.blockingIssueCount > 0).length,
    [drafts]
  );

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 no-print">
      {/* List Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2.5">
            <FileText size={22} className="text-[#D4A72C]" />
            Hall Ticket Drafts
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Inspect, edit candidate details and papers, and sign tickets prior to student release.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh drafts"
          >
            <RotateCcw size={16} className={loading ? "animate-spin text-[#0B192C]" : ""} />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">Total Drafts</div>
          <div className="text-2xl font-black text-[#0B192C] mt-1">{drafts.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-[11px] font-extrabold uppercase text-amber-700">Unsigned Drafts</div>
          <div className="text-2xl font-black text-amber-800 mt-1">
            {drafts.length - signedCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="text-[11px] font-extrabold uppercase text-emerald-700">CoE Signed</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{signedCount}</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
          <div className="text-[11px] font-extrabold uppercase text-rose-700">Blocking Issues</div>
          <div className="text-2xl font-black text-rose-800 mt-1">{issuesCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by register number, name, or branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B192C]/20"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          {[
            { key: "ALL", label: "All" },
            { key: "GENERATED", label: "Unsigned" },
            { key: "SIGNED", label: "CoE Signed" },
            { key: "ISSUES", label: "With Issues" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                statusFilter === tab.key
                  ? "bg-white text-[#0B192C] shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts Table */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Register No &amp; Name</th>
                <th className="px-4 py-3">Degree &amp; Branch</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Exam Centre</th>
                <th className="px-4 py-3 text-center">Papers</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Blocking Issues</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold">
                    Loading draft hall tickets...
                  </td>
                </tr>
              ) : filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-semibold">
                    No draft hall tickets found matching your selection.
                  </td>
                </tr>
              ) : (
                filteredDrafts.map((d) => {
                  const hasCentre = d.examCentre && d.examCentre.trim() !== "" && d.examCentre !== "-";
                  const isSigned = d.signStatus === "COE_SIGNED";

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[#0B192C]">{d.studentReg}</div>
                        <div className="text-slate-600 font-medium">{d.name}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700">{d.degreeBranch}</span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          Sem {d.semester}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {hasCentre ? (
                          <span className="text-slate-700 font-semibold">{d.examCentre}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md text-[11px]">
                            <AlertCircle size={12} /> Blank
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="font-mono font-bold text-slate-800">
                          {d.activePaperCount}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isSigned ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-black">
                            <ShieldCheck size={12} /> Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-black">
                            <Clock size={12} /> Draft
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {d.blockingIssueCount > 0 ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-black">
                              <AlertTriangle size={11} /> {d.blockingIssueCount} Issue(s)
                            </span>
                            <div className="text-[10px] text-rose-600 font-medium line-clamp-1">
                              {d.blockingIssues[0]}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 size={12} /> None
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenEdit(d.id)}
                            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-[#0B192C] font-bold transition-colors"
                            title="Edit hall ticket"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => onOpenPreview(d.id)}
                            className="p-1.5 rounded-xl border border-[#0B192C]/20 bg-[#0B192C]/5 hover:bg-[#0B192C]/10 text-[#0B192C] font-bold transition-colors"
                            title="Portrait Preview"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
