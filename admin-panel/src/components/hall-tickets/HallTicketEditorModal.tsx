import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  History,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  hallTicketAdminApi,
  DraftDetail,
  PaperItem,
} from "../../services/hallTicketAdminApi";

interface Props {
  draftId: number | null;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function HallTicketEditorModal({ draftId, onClose, onSaveSuccess }: Props) {
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [signing, setSigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [degreeBranch, setDegreeBranch] = useState<string>("");
  const [currentSemester, setCurrentSemester] = useState<string>("");
  const [examCentre, setExamCentre] = useState<string>("");
  const [papers, setPapers] = useState<PaperItem[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const loadDraft = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      setConflictError(false);
      const data = await hallTicketAdminApi.getDraft(id);
      setDraft(data);
      setName(data.name || "");
      setDateOfBirth(data.dateOfBirth || "");
      setDegreeBranch(data.degreeBranch || "");
      setCurrentSemester(data.currentSemester || String(data.semester));
      setExamCentre(data.examCentre || "");
      setPapers(data.papers || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load hall ticket draft.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  if (!draftId) return null;

  const handlePaperChange = (index: number, field: keyof PaperItem, val: any) => {
    setPapers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleToggleActive = (index: number) => {
    setPapers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], isActive: !copy[index].isActive };
      return copy;
    });
  };

  const handleAddPaper = () => {
    setPapers((prev) => {
      const nextSno = prev.length + 1;
      return [
        ...prev,
        {
          sno: nextSno,
          subjectCode: "",
          subjectTitle: "",
          paperSemester: currentSemester || "3",
          paperType: "CURRENT",
          isActive: true,
        },
      ];
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    setError(null);
    setSuccessMsg(null);
    setConflictError(false);

    // Frontend validation
    if (!name.trim()) {
      setError("Candidate name cannot be blank.");
      return;
    }
    if (!dateOfBirth.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      setError("Date of birth must be YYYY-MM-DD.");
      return;
    }
    if (!degreeBranch.trim()) {
      setError("Degree and branch cannot be blank.");
      return;
    }
    if (!examCentre.trim() || examCentre.trim() === "-") {
      setError("Exam centre is required and cannot be blank.");
      return;
    }

    const activeCount = papers.filter((p) => p.isActive).length;
    if (activeCount > 15) {
      setError(`At most 15 papers allowed (currently ${activeCount} active).`);
      return;
    }

    for (const p of papers) {
      if (p.isActive) {
        if (!p.subjectCode.trim()) {
          setError("Subject code cannot be empty for active paper.");
          return;
        }
        if (!p.subjectTitle.trim()) {
          setError(`Subject title cannot be empty for paper "${p.subjectCode}".`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const updated = await hallTicketAdminApi.saveDraft(draft.id, {
        editVersion: draft.editVersion,
        name: name.trim(),
        dateOfBirth: dateOfBirth.trim(),
        degreeBranch: degreeBranch.trim(),
        currentSemester: currentSemester.trim(),
        examCentre: examCentre.trim(),
        papers,
      });

      setDraft(updated);
      setPapers(updated.papers);
      setSuccessMsg("Ticket saved successfully. Status is set to GENERATED.");
      onSaveSuccess();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setConflictError(true);
        setError("This ticket was changed by someone else. Reload and try again.");
      } else {
        setError(err.response?.data?.error || err.message || "Failed to save draft changes.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!draft) return;
    setError(null);
    setSuccessMsg(null);

    if (draft.blockingIssues && draft.blockingIssues.length > 0) {
      setError("Cannot sign hall ticket while blocking issues exist.");
      return;
    }

    try {
      setSigning(true);
      const updated = await hallTicketAdminApi.signDraft(draft.id);
      setDraft(updated);
      setSuccessMsg("Hall ticket successfully signed by Controller of Examinations.");
      onSaveSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to sign hall ticket.");
    } finally {
      setSigning(false);
    }
  };

  const activePapersCount = papers.filter((p) => p.isActive).length;
  const hasBlockingIssues = draft && draft.blockingIssues && draft.blockingIssues.length > 0;
  const isSigned = draft?.signStatus === "COE_SIGNED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0B192C] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
              Hall Ticket Editor
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-[#D4A72C] border border-[#D4A72C]/30">
                {draft?.studentReg}
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              Edit candidate information, modify or deactivate papers, and resolve blocking issues.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black border ${
                isSigned
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}
            >
              {isSigned ? "COE SIGNED" : "GENERATED"}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-[#0B192C]" size={24} />
              Loading ticket details...
            </div>
          ) : (
            <>
              {/* Conflict / Error Banner */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-3 text-rose-800 font-bold">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                  {conflictError && (
                    <button
                      onClick={() => loadDraft(draft!.id)}
                      className="px-3 py-1 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Reload
                    </button>
                  )}
                </div>
              )}

              {/* Success Banner */}
              {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 font-bold">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>{successMsg}</div>
                </div>
              )}

              {/* Blocking Issues Alert Box */}
              {hasBlockingIssues && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-black uppercase text-[11px] tracking-wider">
                    <AlertTriangle size={16} className="text-amber-600" />
                    Blocking Issues ({draft?.blockingIssues.length}) &bull; Sign-Off Disabled
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 font-semibold text-xs pl-2">
                    {draft?.blockingIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Candidate Info Grid */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700">
                  Candidate Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Register Number (Read-only)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={draft?.studentReg || ""}
                      className="w-full font-mono font-bold bg-slate-200/60 border border-slate-300 rounded-xl px-3 py-2 text-slate-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Candidate Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B192C]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Date of Birth (YYYY-MM-DD) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full font-mono font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B192C]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Degree &amp; Branch <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={degreeBranch}
                      onChange={(e) => setDegreeBranch(e.target.value)}
                      className="w-full font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B192C]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Current Semester <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentSemester}
                      onChange={(e) => setCurrentSemester(e.target.value)}
                      className="w-full font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B192C]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Exam Centre <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={examCentre}
                      onChange={(e) => setExamCentre(e.target.value)}
                      placeholder="e.g. Main Examination Hall"
                      className={`w-full font-semibold bg-white border rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-[#0B192C]/20 ${
                        !examCentre.trim() || examCentre.trim() === "-"
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Papers Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700">
                      Examination Papers
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-slate-500">
                      ({activePapersCount} active / 15 max)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddPaper}
                    disabled={activePapersCount >= 15}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-extrabold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus size={14} /> Add Paper
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 w-12 text-center">S.No</th>
                        <th className="px-3 py-2.5 w-28">Subject Code</th>
                        <th className="px-3 py-2.5">Subject Title</th>
                        <th className="px-3 py-2.5 w-20">Semester</th>
                        <th className="px-3 py-2.5 w-24">Type</th>
                        <th className="px-3 py-2.5 w-24 text-center">Status</th>
                        <th className="px-3 py-2.5 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {papers.map((p, idx) => (
                        <tr
                          key={idx}
                          className={`${
                            p.isActive ? "hover:bg-slate-50/50" : "bg-slate-100/60 opacity-60"
                          }`}
                        >
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={p.subjectCode}
                              disabled={!p.isActive}
                              onChange={(e) =>
                                handlePaperChange(idx, "subjectCode", e.target.value.toUpperCase())
                              }
                              className="w-full font-mono font-bold uppercase bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={p.subjectTitle}
                              disabled={!p.isActive}
                              onChange={(e) =>
                                handlePaperChange(idx, "subjectTitle", e.target.value)
                              }
                              className="w-full font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={p.paperSemester}
                              disabled={!p.isActive}
                              onChange={(e) =>
                                handlePaperChange(idx, "paperSemester", e.target.value)
                              }
                              className="w-full font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-center"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={p.paperType}
                              disabled={!p.isActive}
                              onChange={(e) =>
                                handlePaperChange(idx, "paperType", e.target.value as any)
                              }
                              className="w-full font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800"
                            >
                              <option value="CURRENT">Current</option>
                              <option value="ARREAR">Arrear</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                p.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {p.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(idx)}
                              className={`p-1 rounded-lg text-xs font-bold transition-colors ${
                                p.isActive
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                              title={p.isActive ? "Deactivate paper" : "Activate paper"}
                            >
                              {p.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit History Log Accordion */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white">
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full flex items-center justify-between text-left font-extrabold text-slate-700 uppercase tracking-wider text-[11px]"
                >
                  <span className="flex items-center gap-2">
                    <History size={16} className="text-slate-400" />
                    Audit Trail &amp; Edit History ({draft?.editLogs?.length || 0})
                  </span>
                  <span>{showLogs ? "Hide" : "Show"}</span>
                </button>

                {showLogs && (
                  <div className="mt-3 divide-y divide-slate-100 max-h-48 overflow-y-auto text-[11px]">
                    {draft?.editLogs?.length === 0 ? (
                      <div className="text-slate-400 py-2">No edits recorded yet.</div>
                    ) : (
                      draft?.editLogs.map((log) => (
                        <div key={log.id} className="py-2 space-y-0.5">
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-bold text-slate-700">{log.changedBy}</span>
                            <span className="font-mono">
                              {log.changedAt ? new Date(log.changedAt).toLocaleString() : ""}
                            </span>
                          </div>
                          <div className="text-slate-600">
                            <span className="font-mono font-bold text-[#0B192C]">
                              {log.fieldName}
                            </span>
                            :{" "}
                            {log.oldValue && (
                              <span className="line-through text-rose-600 mr-1.5">
                                {log.oldValue}
                              </span>
                            )}
                            <span className="text-emerald-700 font-semibold">{log.newValue}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="text-slate-500 text-[11px] font-semibold">
            Version: <span className="font-mono font-bold">{draft?.editVersion}</span> &bull;{" "}
            {isSigned ? (
              <span className="text-emerald-700 font-bold">
                Signed by {draft?.signedBy}
              </span>
            ) : (
              <span className="text-amber-700 font-bold">Unsigned Draft</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-slate-300 text-xs font-extrabold text-slate-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-5 py-2 rounded-2xl bg-[#0B192C] text-white text-xs font-black hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleSign}
              disabled={signing || loading || hasBlockingIssues || isSigned}
              className="px-5 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-1.5"
              title={
                hasBlockingIssues
                  ? "Cannot sign while blocking issues exist"
                  : isSigned
                  ? "Already CoE signed"
                  : "Sign hall ticket"
              }
            >
              <ShieldCheck size={14} />
              {signing ? "Signing..." : isSigned ? "CoE Signed" : "Sign Hall Ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
