import React, { useState, useEffect } from "react";
import { Building2, Plus, Edit, Trash2, X, Check, AlertCircle, RotateCcw, Lock } from "lucide-react";
import { getScopedKey, getActiveCollege, getActiveCollegeKey } from "../utils/rbac";
import { departmentsApi, apiErrorMessage } from "../services/api";
import { getSystemConfig, SystemConfig } from "../utils/systemConfig";

export interface Department {
  key: string;
  name: string;
  code: string;
  headName: string;
  totalStudents: number;
  status: "ACTIVE" | "INACTIVE";
  hodLogin?: string | null;
  facultyLogin?: string | null;
}

// Departments come from the server (scoped to the signed-in COE's college). Pages read this cache synchronously;
// refreshDepartments() reloads it and tells every page through "kvell_departments_updated".
const cacheKey = () => getScopedKey("kvell_server_departments");

export const getStoredDepartments = (): Department[] => {
  try {
    const raw = localStorage.getItem(cacheKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading departments", e);
  }
  return [];
};

export const refreshDepartments = async (): Promise<Department[]> => {
  const list = (await departmentsApi.list()).map((d) => ({
    key: d.key,
    name: d.name,
    code: d.code,
    headName: d.headName,
    hodLogin: d.hodLogin,
    facultyLogin: d.facultyLogin,
    totalStudents: d.totalStudents,
    status: d.status,
  }));
  const json = JSON.stringify(list);
  let changed = true;
  try {
    changed = localStorage.getItem(cacheKey()) !== json;
    localStorage.setItem(cacheKey(), json);
  } catch {}
  // Only announce real changes: listeners re-read the cache, and must never refresh again from this event
  if (changed) window.dispatchEvent(new Event("kvell_departments_updated"));
  return list;
};

export const DepartmentsPage: React.FC = () => {
  const [depts, setDepts] = useState<Department[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formHeadName, setFormHeadName] = useState("");
  const [formStatus, setFormStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadDepartments = () => {
    setDepts(getStoredDepartments());
    refreshDepartments()
      .then(setDepts)
      .catch((err) => setErrorMsg(apiErrorMessage(err, "Could not load departments.")));
  };

  // Real-time System Governance Configuration & Lock Enforcement
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(getSystemConfig);

  useEffect(() => {
    const handleConfigUpdate = () => {
      setSystemConfig(getSystemConfig());
    };
    window.addEventListener("kvell_system_config_updated", handleConfigUpdate);
    window.addEventListener("storage", handleConfigUpdate);
    return () => {
      window.removeEventListener("kvell_system_config_updated", handleConfigUpdate);
      window.removeEventListener("storage", handleConfigUpdate);
    };
  }, []);

  const activeCollegeKey = getActiveCollegeKey();
  const isCollegeLocked =
    systemConfig.systemMode === "EMERGENCY_LOCK" ||
    systemConfig.institutionalLocks?.[activeCollegeKey]?.locked === true ||
    systemConfig.institutionalLocks?.[activeCollegeKey]?.freezeSubmissions === true;

  useEffect(() => {
    loadDepartments();
    const handleUpdate = () => setDepts(getStoredDepartments());
    window.addEventListener("kvell_departments_updated", handleUpdate);
    window.addEventListener("kvell_dept_students_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("kvell_departments_updated", handleUpdate);
      window.removeEventListener("kvell_dept_students_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const openAddModal = () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Adding departments is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    setEditingKey(null);
    setFormName("");
    setFormCode("");
    setFormKey("");
    setFormHeadName("");
    setFormStatus("");
    setErrorMsg("");
    setShowModal(true);
  };

  const openEditModal = (d: Department) => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Editing department details is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    setEditingKey(d.key);
    setFormName(d.name);
    setFormCode(d.code);
    setFormKey(d.key);
    setFormHeadName(d.headName);
    setFormStatus(d.status);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!editingKey) {
      // Auto suggest code from uppercase letters or acronym
      const words = name.trim().split(/\s+/);
      if (words.length > 1) {
        const acronym = words.map((w) => w[0]).join("").toUpperCase();
        setFormCode(acronym);
        setFormKey(acronym.toLowerCase());
      } else if (name.length > 0) {
        setFormCode(name.slice(0, 4).toUpperCase());
        setFormKey(name.slice(0, 4).toLowerCase());
      }
    }
  };

  const handleCodeChange = (code: string) => {
    setFormCode(code.toUpperCase());
    if (!editingKey) {
      setFormKey(code.trim().toLowerCase());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Modifying department configuration is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    const trimmedName = formName.trim();
    const trimmedCode = formCode.trim().toUpperCase();
    const trimmedKey = (formKey.trim() || trimmedCode).toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!trimmedName) {
      setErrorMsg("Please enter department name.");
      return;
    }
    if (!trimmedCode) {
      setErrorMsg("Please enter department code.");
      return;
    }
    if (!formStatus) {
      setErrorMsg("Please choose the department status.");
      return;
    }

    const payload = {
      name: trimmedName,
      code: trimmedCode,
      headName: formHeadName.trim(),
      status: formStatus,
    };
    try {
      if (editingKey) {
        await departmentsApi.update(editingKey, payload);
      } else {
        await departmentsApi.create({ key: trimmedKey, ...payload });
      }
      setDepts(await refreshDepartments());
      setShowModal(false);
    } catch (err) {
      setErrorMsg(apiErrorMessage(err, "Could not save the department."));
    }
  };

  const handleDelete = async (key: string, name: string) => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: deleting departments is locked by the Super Admin.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete '${name}' department?`)) return;
    try {
      await departmentsApi.remove(key);
      setDepts(await refreshDepartments());
    } catch (err) {
      alert(apiErrorMessage(err, "Could not delete the department."));
    }
  };

  const college = getActiveCollege();

  const getDeptStudentCount = (key: string, _name?: string) =>
    depts.find((d) => d.key === key)?.totalStudents ?? 0;

  return (
    <div className="space-y-6 w-full">
      {/* Institutional Freeze Alert Banner */}
      {isCollegeLocked && (
        <div className="p-5 rounded-3xl bg-red-950/80 border-2 border-red-500/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center shrink-0">
              <Lock className="text-red-300" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm uppercase tracking-wider text-red-300">INSTITUTIONAL EXAMINATION LOCK ACTIVE</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">Dr. Sathish Enforcement</span>
              </div>
              <p className="text-xs text-red-200/90 mt-0.5">
                Department configurations and structural modifications are strictly locked by the Controller of Examinations. All department structures are read-only.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/50 text-red-200 text-xs font-mono font-bold whitespace-nowrap">
            STATUTORY FREEZE
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E1D8] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="text-[#0B192C]" size={20} />
            <h3 className="font-display font-bold text-lg text-[#0B192C]">
              {college.shortName} Departments ({depts.length})
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configure {college.name} academic departments. Added departments will be instantly available in Student Data, Mark Entry, and Subject registries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            disabled={isCollegeLocked}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow ${
              isCollegeLocked
                ? "bg-slate-700 text-gray-400 cursor-not-allowed border border-slate-600"
                : "bg-[#0B192C] text-white hover:bg-[#132943]"
            }`}
          >
            {isCollegeLocked ? <Lock size={15} className="text-red-400" /> : <Plus size={15} className="text-[#D4A72C]" />}
            <span>{isCollegeLocked ? "Locked by COE" : "Add Department"}</span>
          </button>
        </div>
      </div>

      {/* Departments Grid or Empty State */}
      {depts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-[#D4A72C]/60 p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] mx-auto flex items-center justify-center text-2xl">
            {college.icon}
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="font-display font-bold text-lg text-[#0B192C]">No Departments Present</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              No academic departments are currently configured for <strong>{college.name}</strong>. Click <strong>"Add Department"</strong> to register new programs.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-extrabold shadow-md transition"
            >
              <Plus size={15} className="text-[#D4A72C]" /> Add Department
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {depts.map((d) => (
            <div
              key={d.key}
              className="bg-white rounded-2xl border border-[#E5E1D8] p-6 shadow-sm flex flex-col justify-between hover:border-[#D4A72C] transition duration-150"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#0B192C] bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-1 rounded-lg">
                      {d.code}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {d.key.toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      d.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                <h4 className="font-display font-bold text-lg text-[#0B192C] mt-2">{d.name}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Abbreviation: <span className="font-extrabold text-[#0B192C]">{d.code}</span>
                </p>

                <div className="mt-4 p-3 rounded-xl bg-[#F8F5EE] border border-[#E5E1D8] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">HOD / Department Head:</span>
                    <span className="font-bold text-[#0B192C]">{d.headName || "Not assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Students:</span>
                    <span className="font-bold text-[#8A6410]">{getDeptStudentCount(d.key, d.name)} Candidates</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E5E1D8] flex items-center justify-between">
                <button
                  type="button"
                  disabled={isCollegeLocked}
                  onClick={() => handleDelete(d.key, d.name)}
                  className={`text-xs font-bold flex items-center gap-1 transition ${
                    isCollegeLocked
                      ? "text-gray-300 cursor-not-allowed opacity-50"
                      : "text-red-600 hover:text-red-700"
                  }`}
                  title={isCollegeLocked ? "Locked by COE" : "Delete department"}
                >
                  {isCollegeLocked ? <Lock size={12} /> : <Trash2 size={13} />} Delete
                </button>
                <button
                  type="button"
                  disabled={isCollegeLocked}
                  onClick={() => openEditModal(d)}
                  className={`text-xs font-bold flex items-center gap-1 transition ${
                    isCollegeLocked
                      ? "text-gray-400 cursor-not-allowed opacity-60"
                      : "text-[#0B192C] hover:text-[#8A6410]"
                  }`}
                  title={isCollegeLocked ? "Locked by COE" : "Edit Details"}
                >
                  {isCollegeLocked ? <Lock size={12} /> : <Edit size={14} />} Edit Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E5E1D8] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#8A6410]" />
                <h3 className="font-display font-bold text-lg text-[#0B192C]">
                  {editingKey ? "Edit Department" : "Add New Department"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Department Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="e.g. CSE"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-bold uppercase focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    System Key
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    disabled={!!editingKey}
                    onChange={(e) => setFormKey(e.target.value.toLowerCase())}
                    placeholder="e.g. cse"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-mono lowercase bg-gray-50 focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  HOD / Head of Department Name
                </label>
                <input
                  type="text"
                  value={formHeadName}
                  onChange={(e) => setFormHeadName(e.target.value)}
                  placeholder="Head of department"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-bold text-gray-700 bg-white"
                >
                  <option value="">Choose status</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#152744] shadow"
                >
                  <Check size={14} className="text-[#D4A72C]" />
                  {editingKey ? "Save Changes" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
