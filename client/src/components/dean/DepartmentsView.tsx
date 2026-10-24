import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  RotateCcw,
  Search,
  Users,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export interface DepartmentItem {
  key: string;
  name: string;
  code: string;
  headName: string;
  totalStudents: number;
  status: "ACTIVE" | "INACTIVE";
}

export const initialEngineeringDepts: DepartmentItem[] = [
  {
    key: "aids",
    name: "Artificial Intelligence & Data Science",
    code: "ADS",
    headName: "Not assigned",
    totalStudents: 50,
    status: "ACTIVE",
  },
  {
    key: "bme",
    name: "Biomedical Engineering",
    code: "BME",
    headName: "Not assigned",
    totalStudents: 26,
    status: "ACTIVE",
  },
  {
    key: "biotech",
    name: "Biotechnology",
    code: "BT",
    headName: "Not assigned",
    totalStudents: 25,
    status: "ACTIVE",
  },
  {
    key: "civil",
    name: "Civil Engineering",
    code: "CIVIL",
    headName: "Not assigned",
    totalStudents: 0,
    status: "ACTIVE",
  },
  {
    key: "cse",
    name: "Computer Science & Engineering",
    code: "CSE",
    headName: "Not assigned",
    totalStudents: 0,
    status: "ACTIVE",
  },
  {
    key: "eee",
    name: "Electrical & Electronics Engineering",
    code: "EEE",
    headName: "Not assigned",
    totalStudents: 16,
    status: "ACTIVE",
  },
  {
    key: "ece",
    name: "Electronics & Communication Engineering",
    code: "ECE",
    headName: "Not assigned",
    totalStudents: 22,
    status: "ACTIVE",
  },
  {
    key: "it",
    name: "Information Technology",
    code: "IT",
    headName: "Not assigned",
    totalStudents: 18,
    status: "ACTIVE",
  },
  {
    key: "mech",
    name: "Mechanical Engineering",
    code: "MECH",
    headName: "Not assigned",
    totalStudents: 12,
    status: "ACTIVE",
  },
  {
    key: "ra",
    name: "Robotics & Automation",
    code: "RA",
    headName: "Not assigned",
    totalStudents: 15,
    status: "ACTIVE",
  },
  {
    key: "auto",
    name: "Automobile Engineering",
    code: "AUTO",
    headName: "Not assigned",
    totalStudents: 0,
    status: "ACTIVE",
  },
];

export const DepartmentsView: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentItem[]>(() => {
    try {
      const saved = localStorage.getItem("kvell_dean_departments");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialEngineeringDepts;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formHeadName, setFormHeadName] = useState("");
  const [formStudents, setFormStudents] = useState<number>(0);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const saveDepartments = (depts: DepartmentItem[]) => {
    setDepartments(depts);
    try {
      localStorage.setItem("kvell_dean_departments", JSON.stringify(depts));
      localStorage.setItem("kvell_admin_departments", JSON.stringify(depts));
      window.dispatchEvent(new Event("kvell_departments_updated"));
    } catch {}
  };

  const openAddModal = () => {
    setEditingDept(null);
    setFormName("");
    setFormCode("");
    setFormKey("");
    setFormHeadName("Not assigned");
    setFormStudents(0);
    setFormStatus("ACTIVE");
    setShowModal(true);
  };

  const openEditModal = (d: DepartmentItem) => {
    setEditingDept(d);
    setFormName(d.name);
    setFormCode(d.code);
    setFormKey(d.key);
    setFormHeadName(d.headName);
    setFormStudents(d.totalStudents);
    setFormStatus(d.status);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      alert("Please provide department name and abbreviation.");
      return;
    }

    if (editingDept) {
      const updated = departments.map((d) =>
        d.key === editingDept.key
          ? {
              ...d,
              name: formName.trim(),
              code: formCode.trim().toUpperCase(),
              headName: formHeadName.trim() || "Not assigned",
              totalStudents: Number(formStudents) || 0,
              status: formStatus,
            }
          : d
      );
      saveDepartments(updated);
      showToast(`Updated department: ${formName.trim()}`);
    } else {
      const autoKey = (formKey.trim() || formCode.trim()).toLowerCase();
      if (departments.some((d) => d.key === autoKey || d.code.toUpperCase() === formCode.trim().toUpperCase())) {
        alert(`A department with abbreviation or key '${formCode}' already exists.`);
        return;
      }
      const newDept: DepartmentItem = {
        key: autoKey,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        headName: formHeadName.trim() || "Not assigned",
        totalStudents: Number(formStudents) || 0,
        status: formStatus,
      };
      saveDepartments([...departments, newDept]);
      showToast(`Added department: ${formName.trim()}`);
    }

    setShowModal(false);
  };

  const handleDelete = (dept: DepartmentItem) => {
    if (window.confirm(`Are you sure you want to remove the '${dept.name}' department?`)) {
      const updated = departments.filter((d) => d.key !== dept.key);
      saveDepartments(updated);
      showToast(`Deleted department: ${dept.name}`);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all 11 Engineering Departments to default registry?")) {
      saveDepartments(initialEngineeringDepts);
      showToast("Reset 11 Engineering departments successfully!");
    }
  };

  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B192C] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#D4A72C] flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check size={16} className="text-[#D4A72C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Card (Matching Image 1) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E1D8] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 border border-slate-200/60">
              <Building2 size={18} />
            </div>
            <h3 className="font-display font-bold text-xl text-[#0B192C]">
              Engineering Departments ({departments.length})
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
            Configure Karpaga Vinayaga College of Engineering and Technology academic departments. Added departments will be instantly available in Student Data, Mark Entry, and Subject registries.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white hover:bg-[#132943] text-xs font-extrabold flex items-center gap-2 transition shadow-md cursor-pointer"
          >
            <Plus size={16} className="text-[#D4A72C]" />
            <span>+ Add Department</span>
          </button>
        </div>
      </div>

      {/* Departments Grid (Matching Image 1) */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((d) => {
          return (
            <div
              key={d.key}
              className="bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between transition duration-150 border border-[#E5E1D8] hover:border-[#D4A72C]"
            >
              <div>
                {/* Badges Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-0.5 rounded-md uppercase">
                      {d.code}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                      {d.code}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                      d.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                {/* Department Title & Abbreviation */}
                <h4 className="font-display font-bold text-lg text-[#0B192C] mt-2 leading-snug">
                  {d.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Abbreviation: <span className="font-extrabold text-[#0B192C]">{d.code}</span>
                </p>

                {/* Department Info Box */}
                <div className="mt-4 p-3.5 rounded-xl bg-[#F8F5EE] border border-[#E5E1D8] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">HOD / Department Head:</span>
                    <span className="font-bold text-[#0B192C]">{d.headName || "Not assigned"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Active Students:</span>
                    <span className="font-extrabold text-[#0B192C]">
                      {d.totalStudents} Candidates
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Delete & Edit Details */}
              <div className="mt-5 pt-3.5 border-t border-[#E5E1D8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDelete(d)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 size={14} className="text-red-600" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(d)}
                  className="text-xs font-bold text-gray-700 hover:text-[#0B192C] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Edit3 size={14} className="text-gray-600" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5E1D8] space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B192C]">
                    {editingDept ? "Edit Department Details" : "Add New Academic Department"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Karpaga Vinayaga College of Engineering & Technology
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#0B192C] mb-1 uppercase tracking-wider">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Data Science"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1 uppercase tracking-wider">
                    Abbreviation / Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AIDS"
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1 uppercase tracking-wider">
                    Registry Key
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value.toLowerCase())}
                    placeholder="e.g. aids"
                    disabled={!!editingDept}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs font-mono text-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0B192C] mb-1 uppercase tracking-wider">
                  HOD / Department Head
                </label>
                <input
                  type="text"
                  value={formHeadName}
                  onChange={(e) => setFormHeadName(e.target.value)}
                  placeholder="e.g. Dr. HOD AIDS or Not assigned"
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1 uppercase tracking-wider">
                    Active Candidates Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formStudents}
                    onChange={(e) => setFormStudents(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-[#0B192C] mb-1 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#D4A72C]/40"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-[#EAB308] text-xs font-black shadow-md hover:bg-[#132943] transition flex items-center gap-1.5"
                >
                  <Check size={15} />
                  <span>{editingDept ? "Save Changes" : "Create Department"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
