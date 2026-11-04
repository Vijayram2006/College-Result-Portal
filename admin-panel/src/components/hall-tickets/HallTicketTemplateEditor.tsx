import React, { useState, useEffect, useCallback } from "react";
import {
  TemplateView,
  CandidatePreview,
  CohortDepartmentOption,
  GenerateResult,
  hallTicketAdminApi,
} from "../../services/hallTicketAdminApi";
import { HallTicketPortraitPreview } from "./HallTicketPortraitPreview";
import {
  Lock,
  Unlock,
  Save,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Settings,
  Building,
} from "lucide-react";

interface Props {
  academicYear: string;
  setAcademicYear: (v: string) => void;
  batch: string;
  setBatch: (v: string) => void;
  semester: number;
  setSemester: (v: number) => void;
  selectedDept?: string;
  onDepartmentChange?: (deptKey: string) => void;
  onGenerationComplete?: (result: GenerateResult) => void;
}

export function HallTicketTemplateEditor({
  academicYear,
  setAcademicYear,
  batch,
  setBatch,
  semester,
  setSemester,
  selectedDept,
  onDepartmentChange,
  onGenerationComplete,
}: Props) {
  const [template, setTemplate] = useState<TemplateView>({
    academicYear,
    batch,
    semester,
    examTitle: `END SEMESTER EXAMINATIONS - ${academicYear}`,
    examinationCentre: "",
    notes: [
      "Hall Ticket is mandatory for entry into the Examination Hall.",
      "Carry a valid College ID along with this Hall Ticket.",
      "Any malpractice will result in cancellation of the examination.",
      "Report to the Examination Centre at least 30 minutes before the commencement of the exam.",
    ],
    sigCandidate: "Signature of the candidate",
    sigCoe: "Controller of Examinations",
    sigPrincipal: "Principal",
    showPhoto: true,
    status: "DRAFT",
    version: 1,
  });

  const [preview, setPreview] = useState<CandidatePreview | null>(null);
  const [departments, setDepartments] = useState<CohortDepartmentOption[]>([]);
  const [internalDept, setInternalDept] = useState<string>(selectedDept || "");
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(false);
  const [loadingDepts, setLoadingDepts] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [fixing, setFixing] = useState<boolean>(false);
  const [unfixing, setUnfixing] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"editor" | "preview" | "split">("split");

  // Keep internalDept synced if parent prop changes
  useEffect(() => {
    if (selectedDept !== undefined && selectedDept !== internalDept) {
      setInternalDept(selectedDept);
    }
  }, [selectedDept]);

  // Load template & preview on cohort change
  const loadData = useCallback(async () => {
    try {
      setLoadingTemplate(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const t = await hallTicketAdminApi.getTemplate({ academicYear, batch, semester });
      setTemplate(t);
    } catch (err: any) {
      console.error("Failed to load template:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to load template.");
    } finally {
      setLoadingTemplate(false);
    }

    let activeDeptKey = internalDept;
    try {
      setLoadingDepts(true);
      const depts = await hallTicketAdminApi.getCohortDepartments({ academicYear, batch, semester });
      setDepartments(depts || []);

      const deptExists = depts && depts.some((d) => d.deptKey.toLowerCase() === activeDeptKey.toLowerCase());
      if (!deptExists) {
        activeDeptKey = depts && depts.length > 0 ? depts[0].deptKey : "";
        setInternalDept(activeDeptKey);
        onDepartmentChange?.(activeDeptKey);
      }
    } catch (err: any) {
      console.error("Failed to load cohort departments:", err);
    } finally {
      setLoadingDepts(false);
    }

    try {
      setLoadingPreview(true);
      const p = await hallTicketAdminApi.getPreview({
        academicYear,
        batch,
        semester,
        departmentKey: activeDeptKey || undefined,
      });
      setPreview(p);
    } catch (err: any) {
      console.error("Failed to load preview:", err);
    } finally {
      setLoadingPreview(false);
    }
  }, [academicYear, batch, semester, onDepartmentChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle department selector switch: immediate preview update, template text unchanged
  const handleDepartmentChange = async (deptKey: string) => {
    setInternalDept(deptKey);
    onDepartmentChange?.(deptKey);
    try {
      setLoadingPreview(true);
      const p = await hallTicketAdminApi.getPreview({
        academicYear,
        batch,
        semester,
        departmentKey: deptKey || undefined,
      });
      setPreview(p);
    } catch (err: any) {
      console.error("Failed to load preview for department:", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const isFixed = template.status === "FIXED";

  // Note management
  const handleNoteChange = (idx: number, val: string) => {
    if (isFixed) return;
    const next = [...template.notes];
    next[idx] = val;
    setTemplate({ ...template, notes: next });
  };

  const handleAddNote = () => {
    if (isFixed || template.notes.length >= 10) return;
    setTemplate({
      ...template,
      notes: [...template.notes, "New examination rule / instruction."],
    });
  };

  const handleRemoveNote = (idx: number) => {
    if (isFixed) return;
    const next = template.notes.filter((_, i) => i !== idx);
    setTemplate({ ...template, notes: next });
  };

  const handleMoveNote = (idx: number, direction: "up" | "down") => {
    if (isFixed) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= template.notes.length) return;
    const next = [...template.notes];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setTemplate({ ...template, notes: next });
  };

  // Actions
  const handleSaveDraft = async () => {
    if (isFixed) {
      setErrorMsg("Template is fixed and cannot be edited. Unfix the template first.");
      return;
    }
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await hallTicketAdminApi.saveTemplate({
        academicYear,
        batch,
        semester,
        examTitle: template.examTitle,
        examinationCentre: template.examinationCentre,
        notes: template.notes,
        sigCandidate: template.sigCandidate,
        sigCoe: template.sigCoe,
        sigPrincipal: template.sigPrincipal,
        showPhoto: template.showPhoto,
      });
      setTemplate(updated);
      setSuccessMsg("Template draft saved successfully.");
      // Refresh preview for current department
      const p = await hallTicketAdminApi.getPreview({
        academicYear,
        batch,
        semester,
        departmentKey: internalDept || undefined,
      });
      setPreview(p);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleFixTemplate = async () => {
    if (!template.examinationCentre?.trim()) {
      setErrorMsg("Examination centre is required to fix template.");
      return;
    }
    if (!template.notes || template.notes.length === 0) {
      setErrorMsg("At least one examination instruction note is required.");
      return;
    }

    try {
      setFixing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await hallTicketAdminApi.fixTemplate({
        academicYear,
        batch,
        semester,
      });
      setTemplate(updated);
      setSuccessMsg("Template fixed and locked! You can now generate hall tickets.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to fix template.");
    } finally {
      setFixing(false);
    }
  };

  const handleUnfixTemplate = async () => {
    try {
      setUnfixing(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await hallTicketAdminApi.unfixTemplate({
        academicYear,
        batch,
        semester,
      });
      setTemplate(updated);
      setSuccessMsg("Template unlocked and returned to DRAFT mode.");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Cannot unfix template.");
    } finally {
      setUnfixing(false);
    }
  };

  const handleGenerate = async () => {
    if (!isFixed) {
      setErrorMsg("Template must be fixed before generating hall tickets.");
      return;
    }
    if (!internalDept) {
      setErrorMsg("Please select a department with enrolled students to generate hall tickets.");
      return;
    }

    try {
      setGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await hallTicketAdminApi.generateFromTemplate({
        academicYear,
        batch,
        semester,
        departmentKey: internalDept,
      });
      setSuccessMsg(res.message);
      if (onGenerationComplete) {
        onGenerationComplete(res);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to generate hall tickets.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cohort Selectors & Status Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2">
              <Settings size={20} className="text-[#D4A72C]" />
              Cohort Selection &amp; Reference Template
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Configure and fix the official hall ticket template for the selected student cohort
            </p>
          </div>

          {/* Template Status Badge */}
          <div className="flex items-center gap-3">
            {isFixed ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Lock size={14} className="text-emerald-700" />
                FIXED (v{template.version}) - Locked for Generation
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                <Unlock size={14} className="text-amber-700" />
                DRAFT (v{template.version}) - Editable
              </span>
            )}
          </div>
        </div>

        {/* Cohort Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
              Batch <span className="text-rose-500">*</span>
            </label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20"
            >
              <option value="2024-2028">2024-2028</option>
              <option value="2023-2027">2023-2027</option>
              <option value="2022-2026">2022-2026</option>
              <option value="2021-2025">2021-2025</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
              Semester <span className="text-rose-500">*</span>
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
              Department <span className="text-slate-400 font-normal">(Student Filter)</span>
            </label>
            <select
              value={internalDept}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              disabled={loadingDepts}
              className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 shadow-xs focus:ring-2 focus:ring-[#0B192C]/20 disabled:bg-slate-50 disabled:text-slate-400"
            >
              {departments.length === 0 ? (
                <option value="">{loadingDepts ? "Loading departments..." : "(No students in cohort)"}</option>
              ) : (
                departments.map((d) => (
                  <option key={d.deptKey} value={d.deptKey}>
                    {d.code || d.deptKey.toUpperCase()} ({d.studentCount} student{d.studentCount === 1 ? "" : "s"})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Action Banners */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* View Switcher (Editor, Preview, Split) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveView("editor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "editor" ? "bg-white text-[#0B192C] shadow-xs" : "text-slate-600"
              }`}
            >
              Template Editor
            </button>
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "preview" ? "bg-white text-[#0B192C] shadow-xs" : "text-slate-600"
              }`}
            >
              Document Preview
            </button>
            <button
              onClick={() => setActiveView("split")}
              className={`hidden md:block px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "split" ? "bg-white text-[#0B192C] shadow-xs" : "text-slate-600"
              }`}
            >
              Side-by-Side View
            </button>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isFixed ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || loadingTemplate}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-black transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{saving ? "Saving..." : "Save Draft"}</span>
                </button>

                <button
                  onClick={handleFixTemplate}
                  disabled={fixing || loadingTemplate}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-[#D4A72C] text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Lock size={15} />
                  <span>{fixing ? "Fixing..." : "Fix Template"}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleUnfixTemplate}
                  disabled={unfixing || loadingTemplate}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                  title="Return template to editable draft state"
                >
                  <Unlock size={15} />
                  <span>{unfixing ? "Unfixing..." : "Unfix Template"}</span>
                </button>

                <button
                  onClick={handleGenerate}
                  disabled={generating || loadingTemplate}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Wand2 size={15} />
                  <span>{generating ? "Generating..." : "Generate Hall Tickets"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div
        className={`grid gap-6 ${
          activeView === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {/* Left Column: Template Form */}
        {(activeView === "editor" || activeView === "split") && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0B192C]">
                Official Reference Template Form
              </h3>
              {isFixed && (
                <span className="text-[11px] font-bold text-slate-400 italic">
                  Read-only (Unlock template to edit)
                </span>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Examination Title
                </label>
                <input
                  type="text"
                  disabled={isFixed}
                  value={template.examTitle || ""}
                  onChange={(e) => setTemplate({ ...template, examTitle: e.target.value })}
                  placeholder={`END SEMESTER EXAMINATIONS - ${academicYear}`}
                  className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
                  Examination Centre <span className="text-rose-500">* (Required before Fix)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={isFixed}
                    value={template.examinationCentre || ""}
                    onChange={(e) =>
                      setTemplate({ ...template, examinationCentre: e.target.value })
                    }
                    placeholder="Enter examination centre venue (e.g. Main Examination Block Hall A)..."
                    className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <Building
                    size={16}
                    className="absolute right-3.5 top-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Photo Box Toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="checkbox"
                  id="showPhotoToggle"
                  disabled={isFixed}
                  checked={template.showPhoto}
                  onChange={(e) => setTemplate({ ...template, showPhoto: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B192C] focus:ring-[#0B192C]"
                />
                <label
                  htmlFor="showPhotoToggle"
                  className="text-xs font-bold text-slate-800 cursor-pointer select-none"
                >
                  Include Candidate Photograph Box on printed ticket
                </label>
              </div>

              {/* Signatures */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Signature Block Captions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Left Signature
                    </label>
                    <input
                      type="text"
                      disabled={isFixed}
                      value={template.sigCandidate || ""}
                      onChange={(e) =>
                        setTemplate({ ...template, sigCandidate: e.target.value })
                      }
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Centre Signature
                    </label>
                    <input
                      type="text"
                      disabled={isFixed}
                      value={template.sigCoe || ""}
                      onChange={(e) => setTemplate({ ...template, sigCoe: e.target.value })}
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Right Signature
                    </label>
                    <input
                      type="text"
                      disabled={isFixed}
                      value={template.sigPrincipal || ""}
                      onChange={(e) =>
                        setTemplate({ ...template, sigPrincipal: e.target.value })
                      }
                      className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-500 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Notes List Editor */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0B192C]">
                      Candidate Instructions / Notes
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Up to 10 lines (max 300 characters each)
                    </span>
                  </div>
                  {!isFixed && template.notes.length < 10 && (
                    <button
                      onClick={handleAddNote}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B192C] text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Add Note</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {template.notes.map((note, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2"
                    >
                      <span className="font-mono font-bold text-slate-400 text-xs w-5 text-center">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        maxLength={300}
                        disabled={isFixed}
                        value={note}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#0B192C] disabled:bg-slate-100 disabled:text-slate-500 font-medium"
                      />
                      {!isFixed && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveNote(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => handleMoveNote(idx, "down")}
                            disabled={idx === template.notes.length - 1}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => handleRemoveNote(idx)}
                            disabled={template.notes.length <= 1}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 disabled:opacity-30"
                            title="Remove note"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Live Document Preview */}
        {(activeView === "preview" || activeView === "split") && (
          <div className="space-y-4">
            <HallTicketPortraitPreview
              preview={preview}
              template={template}
              loading={loadingPreview}
            />
          </div>
        )}
      </div>
    </div>
  );
}

