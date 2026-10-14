import React, { useState, useEffect, useRef } from "react";
import { Download, Upload, HardDrive, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { superAdminApi, apiErrorMessage, StorageStats } from "../../services/api";
import { resetSystemConfig, saveSystemConfig, SystemConfig } from "../../utils/systemConfig";

const kb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`);

/**
 * Database statistics from the result server, and a backup / restore of the Super Admin settings. Student records
 * live in the server's database: they are backed up there (database dumps), never through the browser.
 */
export const StorageMaintenanceTab: React.FC = () => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDiagnostics = () => {
    superAdminApi
      .storage()
      .then(setStats)
      .catch((err) => setStatusMsg({ type: "error", text: apiErrorMessage(err, "Could not load the database statistics.") }));
  };

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const flash = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    if (type === "success") setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleDownloadBackup = async () => {
    try {
      const backup = await superAdminApi.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KVELL_SETTINGS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      flash("success", "Settings backup downloaded (gateways, locks and database statistics; no student data).");
    } catch (err) {
      flash("error", apiErrorMessage(err, "Could not create the backup."));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      setIsProcessing(true);
      try {
        const parsed = JSON.parse(String(event.target?.result || ""));
        const config: SystemConfig | undefined = parsed?.systemConfig ?? (parsed?.gateways ? parsed : undefined);
        if (!config?.gateways || !config.systemMode) {
          flash("error", "This file is not a KVELL settings backup.");
        } else {
          // Only the settings are restored; grading and the audit stamp are always the server's own
          const { systemMode, academicSession, gateways, institutionalLocks } = config;
          await saveSystemConfig({ systemMode, academicSession, gateways, institutionalLocks });
          flash("success", "Settings restored from the backup and saved on the server.");
          refreshDiagnostics();
        }
      } catch (err) {
        flash("error", err instanceof SyntaxError ? "The file is not valid JSON." : apiErrorMessage(err, "Could not restore the settings."));
      }
      setIsProcessing(false);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Restore the default settings? All portals open, nothing locked. Student marks are not touched.")) return;
    try {
      await resetSystemConfig();
      refreshDiagnostics();
      flash("success", "Settings restored to the defaults.");
    } catch (err) {
      flash("error", apiErrorMessage(err, "Could not reset the settings."));
    }
  };

  const tables = stats?.tables ?? [];
  const totalBytes = tables.reduce((acc, t) => acc + t.bytes, 0);
  const totalRows = tables.reduce((acc, t) => acc + t.rows, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#0B192C]">Database Storage & Settings Backup</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live statistics from the result server's database, and a backup / restore of the portal settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshDiagnostics}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
            title="Refresh statistics"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs flex items-center gap-2 shadow-md transition"
          >
            <Download size={15} />
            <span>Export Settings Backup (JSON)</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4A72C] flex items-center justify-center font-bold">
                <Download size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Settings Backup</h3>
                <p className="text-[10px] text-slate-500 font-medium">Gateways, college locks and session details</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Downloads the current portal settings with a snapshot of the database statistics. Student records, marks and
              answer scripts stay in the server's database, which is backed up on the server itself.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full mt-5 py-3 px-4 rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Download size={15} />
            <span>Download Settings Backup</span>
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Restore Settings</h3>
                <p className="text-[10px] text-slate-500 font-medium">From a settings backup file</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Applies the gateways and locks from a backup file. The server checks every value and records the change in
              the audit trail. Student data is never changed by a restore.
            </p>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-5 py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Upload size={15} />
            <span>{isProcessing ? "Restoring..." : "Select Settings Backup to Restore"}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <HardDrive size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0B192C]">Database Tables</h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Rows and disk use per table · settings last saved by {stats?.configUpdatedBy ?? "—"} ({stats?.configUpdatedAt ?? "—"})
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="font-extrabold text-[#0B192C]">{totalRows.toLocaleString()} rows</span>
            <span className="block text-[10px] text-slate-400 font-mono">
              {kb(totalBytes)} in these tables · database {stats ? kb(stats.databaseBytes) : "—"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {tables.map((t) => {
            const pct = totalBytes > 0 ? ((t.bytes / totalBytes) * 100).toFixed(1) : "0";
            return (
              <div key={t.table} className="bg-[#F8F5EE]/60 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                  <span className="font-extrabold text-[#0B192C] flex items-center gap-2">
                    <span>{t.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">{t.table}</span>
                  </span>
                  <span className="font-mono text-slate-600 font-bold">
                    {t.rows.toLocaleString()} rows · {kb(t.bytes)} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0B192C] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {!stats && <p className="text-xs text-slate-400 text-center py-6">Loading database statistics…</p>}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">Restore the default settings (all portals open, nothing locked); marks are not touched:</span>
          <button
            type="button"
            onClick={handleResetDemo}
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-200"
          >
            Reset Settings to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
