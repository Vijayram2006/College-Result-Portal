import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
    RefreshCw,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { superAdminApi, apiErrorMessage } from "../../services/api";

/** One row of the audit trail, as shown in this tab. */
interface AuditRow {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export const SecurityAuditTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  // The server's audit trail across all three colleges (it cannot be edited or deleted)
  const loadLogs = () => {
    setError(null);
    superAdminApi
      .audit(1000)
      .then((entries) =>
        setLogs(
          entries.map((e) => ({
            id: e.id,
            action: e.action,
            performedBy: `${e.actorName} (${e.actor})`,
            details: `[${(e.college || "").toUpperCase()}] ${e.target} - ${e.description}`,
            timestamp: e.timestamp,
          }))
        )
      )
      .catch((err) => setError(apiErrorMessage(err, "Could not load the audit trail.")));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Action", "Performed By", "Details", "Timestamp"];
    const rows = logs.map((l) => [
      l.id || "",
      `"${l.action}"`,
      `"${l.performedBy.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.timestamp}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `KVELL_SECURITY_AUDIT_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const actionTypes = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs.filter((item) => {
    const matchesSearch =
      item.action.toLowerCase().includes(search.toLowerCase()) ||
      item.performedBy.toLowerCase().includes(search.toLowerCase()) ||
      item.details.toLowerCase().includes(search.toLowerCase());
    const matchesAction = filterAction === "ALL" || item.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#0B192C]">
            Universal University Security & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking of examination authorizations, gateway status changes, mark overrides, and officer logins.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadLogs}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
            title="Refresh Logs"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs flex items-center gap-2 shadow-md transition"
          >
            <Download size={15} />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, administrator, or detail keyword..."
            className="w-full pl-11 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs text-[#0B192C] font-semibold focus:outline-none focus:border-[#0B192C]"
        >
          <option value="ALL">All Event Types</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white text-[10px] uppercase tracking-wider font-extrabold">
              <tr>
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-5">Action Event</th>
                <th className="py-3.5 px-5">Authorized Administrator</th>
                <th className="py-3.5 px-5">Audit Details & Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    {error ?? "No matching security audit records found."}
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#F8F5EE]/40 transition">
                    <td className="py-4 px-5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {item.timestamp}
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-extrabold text-[#0B192C] bg-slate-100 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider inline-block">
                        {item.action}
                      </span>
                    </td>

                    <td className="py-4 px-5 font-bold text-[#0B192C]">
                      {item.performedBy}
                    </td>

                    <td className="py-4 px-5 text-slate-600 max-w-md">
                      {item.details}
                    </td>
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
