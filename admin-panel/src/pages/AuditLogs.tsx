import React, { useState } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  Download,
  User,
  Activity,
  Globe,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { mockAuditLogs, AuditLogRecord } from "../services/api";

export const AuditLogsPage: React.FC = () => {
  const [logs] = useState<AuditLogRecord[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "PUBLISHED_RESULT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#2E7D5B]/10 text-[#2E7D5B] border border-[#2E7D5B]/30">
            <Globe size={12} /> PUBLISHED_RESULT
          </span>
        );
      case "VALIDATED_RESULT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#C98A18]/10 text-[#C98A18] border border-[#C98A18]/30">
            <CheckCircle2 size={12} /> VALIDATED_RESULT
          </span>
        );
      case "UPLOADED_RESULT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#0B192C]/10 text-[#0B192C] border border-[#0B192C]/30">
            <Upload size={12} /> UPLOADED_RESULT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <Activity size={12} /> {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#D4A72C] uppercase tracking-wider mb-1">
            <ClipboardList size={14} />
            Institutional Governance & Compliance
          </div>
          <h1 className="text-2xl font-black text-[#0B192C]">Administrative Audit Logs</h1>
          <p className="text-xs text-[#667085] mt-1">
            Immutable log of all result uploads, validations, publications, and administrative system actions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Audit log report downloaded")}
            className="flex items-center gap-2 bg-[#0B192C] hover:bg-[#0B192C]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md"
          >
            <Download size={14} /> Export Audit Log
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search action, target, admin ID, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600">Action Type:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Administrative Actions</option>
            <option value="PUBLISHED_RESULT">PUBLISHED_RESULT</option>
            <option value="VALIDATED_RESULT">VALIDATED_RESULT</option>
            <option value="UPLOADED_RESULT">UPLOADED_RESULT</option>
            <option value="MODIFIED_STUDENT">MODIFIED_STUDENT</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Log ID & Timestamp</th>
                <th className="p-4">Administrator</th>
                <th className="p-4">Action Executed</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">IP / Device Info</th>
                <th className="p-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-semibold">
                    No audit log records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition">
                    <td className="p-4">
                      <span className="font-mono font-bold text-gray-800 block">{log.id}</span>
                      <span className="text-[10px] text-gray-400 block font-semibold">{log.timestamp}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#0B192C]/10 text-[#0B192C] font-bold text-[10px] flex items-center justify-center shrink-0">
                          <User size={12} />
                        </div>
                        <div>
                          <span className="font-bold text-[#0B192C] block">{log.adminName}</span>
                          <span className="text-[10px] text-gray-400 block font-mono">{log.adminId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getActionBadge(log.action)}</td>
                    <td className="p-4 font-bold text-gray-800">{log.target}</td>
                    <td className="p-4 text-gray-500 font-mono text-[11px]">{log.ipAddress}</td>
                    <td className="p-4 text-gray-600 max-w-xs">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
