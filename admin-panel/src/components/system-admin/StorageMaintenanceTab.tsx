import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  Database,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Server,
  Layers,
} from "lucide-react";
import {
  exportUniversalDatabaseSnapshot,
  importUniversalDatabaseSnapshot,
  getStorageDiagnostics,
  StorageCategoryDiagnostic,
  resetSystemConfig,
} from "../../utils/systemConfig";

export const StorageMaintenanceTab: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<StorageCategoryDiagnostic[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDiagnostics = () => {
    setDiagnostics(getStorageDiagnostics());
  };

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const handleDownloadBackup = () => {
    try {
      const snapshot = exportUniversalDatabaseSnapshot();
      const jsonStr = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `KVELL_UNIVERSAL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: "success",
        text: `Universal database backup successfully generated (${snapshot.metadata.totalKeys} entities).`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Backup export failed: ${err.message}` });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        setIsProcessing(true);
        const content = event.target?.result as string;
        const result = importUniversalDatabaseSnapshot(content);
        setIsProcessing(false);

        if (result.success) {
          setStatusMsg({ type: "success", text: result.message });
          refreshDiagnostics();
        } else {
          setStatusMsg({ type: "error", text: result.message });
        }
      } catch (err: any) {
        setIsProcessing(false);
        setStatusMsg({ type: "error", text: `Import failed: ${err.message}` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResetDemo = () => {
    const confirm = window.confirm(
      "CAUTION: Are you sure you want to restore default system settings? This will reset all gateway toggles and academic regulations to default."
    );
    if (!confirm) return;

    resetSystemConfig();
    refreshDiagnostics();
    setStatusMsg({ type: "success", text: "System configuration restored to factory defaults." });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const totalBytes = diagnostics.reduce((acc, d) => acc + d.estimatedBytes, 0);
  const totalKeys = diagnostics.reduce((acc, d) => acc + d.keysCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#0B192C]">
            Universal Storage Diagnostics & Disaster Recovery
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full-database snapshots, isolated college storage explorer, and system state backup/restore tools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshDiagnostics}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
            title="Refresh Diagnostics"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs flex items-center gap-2 shadow-md transition"
          >
            <Download size={15} />
            <span>Export Universal Backup (JSON)</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {statusMsg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D4A72C] flex items-center justify-center font-bold">
                <Download size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Full University Database Snapshot</h3>
                <p className="text-[10px] text-slate-500 font-medium">Export every record across all constituent colleges</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Downloads a comprehensive, timestamped JSON snapshot containing student registries, department directories,
              curriculum subjects, marks matrices, and published result records for Engineering, Nursing, and Pharmacy.
            </p>

            <div className="bg-[#F8F5EE] p-3 rounded-2xl mt-4 text-[11px] font-mono text-slate-700">
              <span className="block font-bold mb-1">Backup Contents:</span>
              <span>• Scoped storage for Engineering, Nursing & Pharmacy</span>
              <br />
              <span>• Master Gateway Toggles & Regulatory Policies</span>
              <br />
              <span>• University Security & Activity Audit Trail</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadBackup}
            className="w-full mt-5 py-3 px-4 rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Download size={15} />
            <span>Download Master Backup Snapshot</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#0B192C]">Restore Database from Snapshot</h3>
                <p className="text-[10px] text-slate-500 font-medium">Import and reconstruct university records from JSON</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Upload an authorized university backup archive to restore or migrate data.
              Schema integrity is verified before committing changes to storage, and reactive update signals are broadcast to all open portal windows.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-5 py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Upload size={15} />
            <span>{isProcessing ? "Validating & Restoring..." : "Select Backup JSON File to Restore"}</span>
          </button>
        </div>
      </div>

      {/* Storage Diagnostics Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <HardDrive size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0B192C]">Isolated Storage Consumption Breakdown</h3>
              <p className="text-[10px] text-slate-500 font-medium">Analysis of active keys, byte distribution and scoped schemas</p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="font-extrabold text-[#0B192C]">{totalKeys} Storage Keys</span>
            <span className="block text-[10px] text-slate-400 font-mono">
              {(totalBytes / 1024).toFixed(1)} KB Active Payload
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {diagnostics.map((diag, idx) => {
            const pct = totalBytes > 0 ? ((diag.estimatedBytes / totalBytes) * 100).toFixed(1) : "0";
            return (
              <div key={idx} className="bg-[#F8F5EE]/60 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-extrabold text-[#0B192C] flex items-center gap-2">
                    <span>{diag.category}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      {diag.college}
                    </span>
                  </span>
                  <span className="font-mono text-slate-600 font-bold">
                    {diag.keysCount} keys • {(diag.estimatedBytes / 1024).toFixed(1)} KB ({pct}%)
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B192C] rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {diag.sampleKeys.length > 0 && (
                  <div className="mt-2 text-[10px] font-mono text-slate-400 flex flex-wrap gap-2">
                    <span className="font-bold text-slate-500">Sample Keys:</span>
                    {diag.sampleKeys.map((k, kidx) => (
                      <span key={kidx} className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Factory Reset Strips */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Restore factory configuration without deleting student marks:</span>
          <button
            type="button"
            onClick={handleResetDemo}
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition border border-red-200"
          >
            Reset Master Config to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
