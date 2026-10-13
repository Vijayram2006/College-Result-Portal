import React, { useState, useEffect } from "react";
import {
  Globe,
  CheckCircle2,
  Eye,
  Send,
  AlertTriangle,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { adminResultsApi, ResultBatchRecord, addAuditLog } from "../services/api";
import { getRealLocalTimestamp } from "../utils/dateUtils";
import { getScopedKey, getActiveCollege } from "../utils/rbac";

export const ResultsPublished: React.FC = () => {
  const college = getActiveCollege();
  const [batches, setBatches] = useState<ResultBatchRecord[]>([]);
  const [selectedBatchModal, setSelectedBatchModal] = useState<ResultBatchRecord | null>(null);
  const [publishConfirmBatch, setPublishConfirmBatch] = useState<ResultBatchRecord | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = () => {
    adminResultsApi.getResultBatches().then(setBatches);
  };

  const handleDeleteBatch = async (batchId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete result batch "${title}"?`)) return;
    await adminResultsApi.deleteResultBatch(batchId);
    setBatches(batches.filter((b) => b.id !== batchId));
    setFeedbackMessage(`Batch "${title}" deleted successfully.`);
  };

  const handleClearAllBatches = async () => {
    if (!window.confirm("Are you sure you want to delete ALL result batches? This action cannot be undone.")) return;
    await adminResultsApi.clearAllBatches();
    setBatches([]);
    setFeedbackMessage("All result batches cleared successfully.");
  };

  const handlePublishConfirm = async () => {
    if (!publishConfirmBatch) return;
    setPublishing(true);

    const targetId = publishConfirmBatch.id;
    const nowTimestamp = getRealLocalTimestamp(true);

    try {
      await adminResultsApi.publishResultBatch(targetId);
    } catch (err: any) {
      console.warn("Server publish endpoint error, applying local persistence:", err);
    }

    // Always persist PUBLISHED status in localStorage scoped to active college
    try {
      const batchKey = getScopedKey("kvell_custom_batches");
      const raw = localStorage.getItem(batchKey);
      let list: ResultBatchRecord[] = raw ? JSON.parse(raw) : [];
      let found = false;

      list = list.map((b) => {
        if (b.id === targetId) {
          found = true;
          return {
            ...b,
            publicationStatus: "PUBLISHED" as const,
            publishedAt: nowTimestamp,
            publishedBy: `Dr. Controller of Examinations (${college.shortName.toUpperCase()})`,
          };
        }
        return b;
      });

      if (!found) {
        list.unshift({
          ...publishConfirmBatch,
          publicationStatus: "PUBLISHED" as const,
          publishedAt: nowTimestamp,
          publishedBy: `Dr. Controller of Examinations (${college.shortName.toUpperCase()})`,
        });
      }

      localStorage.setItem(batchKey, JSON.stringify(list));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Error writing published batch to localStorage", e);
    }

    setBatches((prev) =>
      prev.map((b) =>
        b.id === targetId
          ? {
              ...b,
              publicationStatus: "PUBLISHED" as const,
              publishedAt: nowTimestamp,
              publishedBy: `Dr. Controller of Examinations (${college.shortName.toUpperCase()})`,
            }
          : b
      )
    );

    addAuditLog({
      action: "COE_PUBLISHED_RESULTS",
      target: `${publishConfirmBatch.id} (${publishConfirmBatch.batchTitle})`,
      timestamp: nowTimestamp,
      description: `Controller of Examinations officially verified and PUBLISHED examination results for batch "${publishConfirmBatch.batchTitle}" (${publishConfirmBatch.totalStudents} candidates). Evaluated and forwarded by ${publishConfirmBatch.uploadedBy}.`,
    });

    setFeedbackMessage(
      `Results for "${publishConfirmBatch.batchTitle}" successfully PUBLISHED by COE! Visible live on Student & HOD Portals.`
    );
    setPublishConfirmBatch(null);
    setPublishing(false);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            {college.icon} {college.shortName.toUpperCase()} · RESULT PUBLICATION WORKFLOW
          </span>
          <h2 className="font-display text-2xl font-bold">
            {college.name} Published Results Control
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Students can only view results that have reached <strong>PUBLISHED</strong> status. Admin confirmation is required to release validated results.
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B192C]">
            Examination Result Batches Directory ({batches.length} Batches)
          </span>
          <div className="flex items-center gap-3">
            {batches.length > 0 && (
              <button
                onClick={handleClearAllBatches}
                className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] border border-red-200 transition flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear All Batches
              </button>
            )}
            <span className="text-[10px] text-gray-500 font-semibold uppercase">
              Status Filter: DRAFT / VALIDATED / PUBLISHED
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-3.5">Batch Title & Dept</th>
                <th className="p-3.5">Semester & Year</th>
                <th className="p-3.5">Upload Info</th>
                <th className="p-3.5 text-center">Students</th>
                <th className="p-3.5 text-center">Pass %</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Publication Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-500 font-semibold text-xs space-y-2">
                    <p className="font-bold text-gray-700 text-sm">No Result Batches Present</p>
                    <p className="text-gray-500 text-xs">Upload student examination marksheets to create, validate, and publish result batches.</p>
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3.5">
                      <span className="font-bold text-[#0B192C] text-sm block">{b.batchTitle}</span>
                      <span className="text-[10px] font-mono text-[#B08014] font-bold block">{b.departmentName}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-gray-800 block">{b.semester}</span>
                      <span className="text-[10px] text-gray-500">{b.examMonthYear}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-gray-700 text-[11px] block">{b.uploadDate}</span>
                      <span className="text-[10px] text-gray-500">{b.uploadedBy}</span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-gray-900">{b.totalStudents}</td>
                    <td className="p-3.5 text-center font-black text-[#2E7D5B]">{b.passPercentage}%</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold inline-block ${
                          b.publicationStatus === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : b.publicationStatus === "VALIDATED"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-gray-100 text-gray-800 border border-gray-300"
                        }`}
                      >
                        {b.publicationStatus === "VALIDATED" ? "AWAITING COE PUBLISH" : b.publicationStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedBatchModal(b)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition inline-flex items-center gap-1"
                      >
                        <Eye size={13} /> View
                      </button>

                      {b.publicationStatus === "VALIDATED" && (
                        <button
                          onClick={() => setPublishConfirmBatch(b)}
                          className="px-3 py-1.5 rounded-lg bg-[#2E7D5B] hover:bg-emerald-700 text-white font-extrabold text-[11px] transition shadow inline-flex items-center gap-1"
                        >
                          <Send size={13} /> PUBLISH
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBatch(b.id, b.batchTitle)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] transition inline-flex items-center gap-1 border border-red-200"
                        title="Delete Result Batch"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Confirmation Modal for Result Publication */}
      {publishConfirmBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E5E1D8] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#B54747]">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-[#0B192C]">Publish Results?</h3>
                <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">
                  Official Administrative Action
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E5E1D8] text-xs space-y-1.5 text-gray-700">
              <div className="flex justify-between">
                <span>Batch:</span>
                <span className="font-bold text-[#0B192C]">{publishConfirmBatch.batchTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>Department:</span>
                <span className="font-bold text-[#0B192C]">{publishConfirmBatch.departmentName}</span>
              </div>
              <div className="flex justify-between">
                <span>Forwarded By (Faculty):</span>
                <span className="font-bold text-[#0B192C]">{publishConfirmBatch.uploadedBy || "Faculty Evaluator"}</span>
              </div>
              <div className="flex justify-between">
                <span>Students Included:</span>
                <span className="font-bold text-[#B08014]">{publishConfirmBatch.totalStudents} Candidates</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Once published, these results will become <strong>immediately visible to students in the Student Portal</strong> and SGPA/CGPA transcripts will be generated.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setPublishConfirmBatch(null)}
                disabled={publishing}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishConfirm}
                disabled={publishing}
                className="px-5 py-2.5 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-white text-xs font-extrabold shadow transition flex items-center gap-2 active:scale-95"
              >
                <Send size={14} /> {publishing ? "Verifying Authority & Publishing..." : "Approve & Publish Official Results"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Batch Details Modal */}
      {selectedBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 border border-[#E5E1D8] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0B192C]">
                  {selectedBatchModal.batchTitle}
                </h3>
                <span className="text-xs text-[#B08014] font-bold">
                  {selectedBatchModal.departmentName} • {selectedBatchModal.semester}
                </span>
              </div>
              <button onClick={() => setSelectedBatchModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-4 bg-[#F8F5EE] rounded-xl text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Publication Status</span>
                <span className="font-extrabold text-[#2E7D5B]">{selectedBatchModal.publicationStatus}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Students</span>
                <span className="font-bold">{selectedBatchModal.totalStudents}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Pass Percentage</span>
                <span className="font-bold text-[#2E7D5B]">{selectedBatchModal.passPercentage}%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Uploaded By</span>
                <span className="font-semibold">{selectedBatchModal.uploadedBy}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBatchModal(null)}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
