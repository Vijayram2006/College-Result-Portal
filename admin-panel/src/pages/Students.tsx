import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Check,
  AlertCircle,
  UsersRound,
  RotateCcw,
  Lock,
} from "lucide-react";
import { getStoredDepartments, Department } from "./Departments";
import { aidsSem1Students } from "../data/aidsStudents";
import { cseSem1Students, bmeSem1Students } from "../data/dummyMarksData";
import { getActiveCollegeKey } from "../utils/rbac";
import { getSystemConfig, SystemConfig } from "../utils/systemConfig";

export interface Student {
  regNo: string;
  name: string;
  email: string;
  deptName: string;
  deptKey?: string;
  year: string;
  section: string;
  semester: string;
  sgpa: number;
  cgpa: number;
  status: "ACTIVE" | "INACTIVE";
}

export const defaultAidsStudents: Student[] = aidsSem1Students.map((s) => ({
  regNo: s.regNo,
  name: s.name,
  email: `${s.regNo.toLowerCase()}@students.kvell.edu`,
  deptName: "Artificial Intelligence & Data Science",
  deptKey: "aids",
  year: "1st Year",
  section: "A",
  semester: "Semester I",
  sgpa: 8.85,
  cgpa: 8.85,
  status: "ACTIVE",
}));

export const defaultCseStudents: Student[] = cseSem1Students.map((s) => ({
  regNo: s.regNo,
  name: s.name,
  email: s.email,
  deptName: "Computer Science and Engineering",
  deptKey: "cse",
  year: "1st Year",
  section: s.section,
  semester: "Semester I",
  sgpa: 8.92,
  cgpa: 8.92,
  status: "ACTIVE",
}));

export const defaultBmeStudents: Student[] = bmeSem1Students.map((s) => ({
  regNo: s.regNo,
  name: s.name,
  email: s.email,
  deptName: "Biomedical Engineering",
  deptKey: "bme",
  year: "1st Year",
  section: s.section,
  semester: "Semester I",
  sgpa: 8.74,
  cgpa: 8.74,
  status: "ACTIVE",
}));

export const defaultStoredStudents: Student[] = [
  ...defaultAidsStudents,
  ...defaultCseStudents,
  ...defaultBmeStudents,
];

export const getStoredStudents = (): Student[] => {
  try {
    const raw = localStorage.getItem("kvell_students");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Retain students belonging to active departments: AIDS, CSE, and BME
        const allowed = parsed.filter((s: any) => {
          const k = String(s.deptKey || "").toLowerCase().trim();
          const n = String(s.deptName || "").toLowerCase().trim();
          return (
            k === "aids" || k === "cse" || k === "bme" ||
            n.includes("artificial intelligence") || n.includes("aids") ||
            n.includes("computer science") || n.includes("biomedical")
          );
        });

        if (allowed.length > 0) {
          return allowed;
        }
      }
    }
  } catch (e) {
    console.error("Error reading kvell_students", e);
  }
  return defaultStoredStudents;
};

export const saveStoredStudents = (students: Student[]) => {
  try {
    localStorage.setItem("kvell_students", JSON.stringify(students));
    window.dispatchEvent(new Event("kvell_students_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error saving kvell_students", e);
  }
};

export const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRegNo, setEditingRegNo] = useState<string | null>(null);

  // Form Fields
  const [formRegNo, setFormRegNo] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formYear, setFormYear] = useState("1st Year");
  const [formSection, setFormSection] = useState("A");
  const [formSemester, setFormSemester] = useState("Semester I");
  const [formSgpa, setFormSgpa] = useState("0.00");
  const [formCgpa, setFormCgpa] = useState("0.00");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [errorMsg, setErrorMsg] = useState("");

  const [availableDepts, setAvailableDepts] = useState<Department[]>([]);

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

  const loadData = () => {
    setStudents(getStoredStudents());
    const depts = getStoredDepartments();
    setAvailableDepts(depts);
    if (!formDept && depts.length > 0) {
      setFormDept(depts[0].name);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("kvell_students_updated", handleUpdate);
    window.addEventListener("kvell_departments_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("kvell_students_updated", handleUpdate);
      window.removeEventListener("kvell_departments_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const openAddModal = () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Adding new student records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    setEditingRegNo(null);
    setFormRegNo("");
    setFormName("");
    setFormEmail("");
    setFormDept(availableDepts.length > 0 ? availableDepts[0].name : "General Engineering");
    setFormYear("1st Year");
    setFormSection("A");
    setFormSemester("Semester I");
    setFormSgpa("0.00");
    setFormCgpa("0.00");
    setFormStatus("ACTIVE");
    setErrorMsg("");
    setShowModal(true);
  };

  const openEditModal = (s: Student) => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Editing student records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    setEditingRegNo(s.regNo);
    setFormRegNo(s.regNo);
    setFormName(s.name);
    setFormEmail(s.email);
    setFormDept(s.deptName);
    setFormYear(s.year);
    setFormSection(s.section);
    setFormSemester(s.semester);
    setFormSgpa(s.sgpa.toFixed(2));
    setFormCgpa(s.cgpa.toFixed(2));
    setFormStatus(s.status);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!editingRegNo && name.trim()) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, ".");
      setFormEmail(`${slug}@students.kvell.edu`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Modifying student candidate records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    const cleanReg = formRegNo.trim().toUpperCase();
    const cleanName = formName.trim();
    const cleanEmail = formEmail.trim() || `${cleanReg.toLowerCase()}@students.kvell.edu`;

    if (!cleanReg) {
      setErrorMsg("Please enter Register Number.");
      return;
    }
    if (!cleanName) {
      setErrorMsg("Please enter Student Name.");
      return;
    }

    const currentList = getStoredStudents();

    if (editingRegNo) {
      // Update
      const updated = currentList.map((s) =>
        s.regNo === editingRegNo
          ? {
              ...s,
              regNo: cleanReg,
              name: cleanName,
              email: cleanEmail,
              deptName: formDept.trim() || "General Engineering",
              year: formYear,
              section: formSection,
              semester: formSemester,
              sgpa: parseFloat(formSgpa) || 0,
              cgpa: parseFloat(formCgpa) || 0,
              status: formStatus,
            }
          : s
      );
      saveStoredStudents(updated);
      setStudents(updated);
    } else {
      // Check duplicate
      if (currentList.some((s) => s.regNo.toUpperCase() === cleanReg)) {
        setErrorMsg(`Student with Register Number '${cleanReg}' is already enrolled.`);
        return;
      }

      const newStudent: Student = {
        regNo: cleanReg,
        name: cleanName,
        email: cleanEmail,
        deptName: formDept.trim() || "General Engineering",
        year: formYear,
        section: formSection,
        semester: formSemester,
        sgpa: parseFloat(formSgpa) || 0,
        cgpa: parseFloat(formCgpa) || 0,
        status: formStatus,
      };

      const updated = [newStudent, ...currentList];
      saveStoredStudents(updated);
      setStudents(updated);
    }

    setShowModal(false);
  };

  const handleDelete = (regNo: string, name: string) => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Deleting student candidate records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    if (window.confirm(`Are you sure you want to delete student '${name}' (${regNo})?`)) {
      const updated = students.filter((s) => s.regNo !== regNo);
      saveStoredStudents(updated);
      setStudents(updated);
      if (selectedStudent?.regNo === regNo) {
        setSelectedStudent(null);
      }
    }
  };

  const [deptFilter, setDeptFilter] = useState("all");

  const handleResetToAids = () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Resetting student records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    if (window.confirm("Keep only the 50 AIDS Semester 1 students and remove all other student data?")) {
      saveStoredStudents(defaultAidsStudents);
      setStudents(defaultAidsStudents);
    }
  };

  const handleClearAll = () => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Clearing student records is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    if (window.confirm("Are you sure you want to remove ALL enrolled students? This will clear the student directory.")) {
      saveStoredStudents([]);
      setStudents([]);
    }
  };

  const toggleStatus = (regNo: string) => {
    if (isCollegeLocked) {
      alert("Institutional Freeze Active: Changing student status is restricted by the Controller of Examinations (Dr. Sathish).");
      return;
    }
    const updated = students.map((s) =>
      s.regNo === regNo ? { ...s, status: (s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE" } : s
    );
    saveStoredStudents(updated);
    setStudents(updated);
  };

  const filtered = students.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.regNo.toLowerCase().includes(query.toLowerCase()) ||
      s.deptName.toLowerCase().includes(query.toLowerCase());
    const matchesYear = yearFilter === "all" || s.year === yearFilter;
    const matchesDept =
      deptFilter === "all" ||
      s.deptName.toLowerCase() === deptFilter.toLowerCase() ||
      (s.deptKey && s.deptKey.toLowerCase() === deptFilter.toLowerCase());
    return matchesQuery && matchesYear && matchesDept;
  });

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
                Candidate registrations, status changes, and directory modifications are strictly locked by the Controller of Examinations. All student records are read-only.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-red-900/60 border border-red-500/50 text-red-200 text-xs font-mono font-bold whitespace-nowrap">
            STATUTORY FREEZE
          </span>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E5E1D8] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student reg no, name..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E1D8] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Departments</option>
            {availableDepts.map((d) => (
              <option key={d.key} value={d.key}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-[#E5E1D8] text-xs font-semibold text-gray-700 bg-white"
          >
            <option value="all">All Academic Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleResetToAids}
            disabled={isCollegeLocked}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              isCollegeLocked
                ? "border-gray-200 text-gray-400 cursor-not-allowed opacity-50 bg-gray-50"
                : "border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
            title={isCollegeLocked ? "Locked by COE" : "Keep only AIDS Semester 1 students (50 Candidates)"}
          >
            {isCollegeLocked ? <Lock size={14} /> : <RotateCcw size={14} />} AIDS Only (50)
          </button>
          {students.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isCollegeLocked}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                isCollegeLocked
                  ? "border-gray-200 text-gray-400 cursor-not-allowed opacity-50 bg-gray-50"
                  : "border-red-200 text-red-600 hover:bg-red-50"
              }`}
              title={isCollegeLocked ? "Locked by COE" : "Clear all students"}
            >
              {isCollegeLocked ? <Lock size={14} /> : <Trash2 size={14} />} Clear All
            </button>
          )}
          <button
            onClick={openAddModal}
            disabled={isCollegeLocked}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow justify-center ${
              isCollegeLocked
                ? "bg-slate-700 text-gray-400 cursor-not-allowed border border-slate-600"
                : "bg-[#0B192C] text-white hover:bg-[#132943]"
            }`}
          >
            {isCollegeLocked ? <Lock size={15} className="text-red-400" /> : <UserPlus size={15} className="text-[#D4A72C]" />}
            <span>{isCollegeLocked ? "Locked by COE" : "Add New Student"}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0B192C]">
            Enrolled Candidate Directory ({filtered.length} Students)
          </span>
          <span className="text-[10px] text-gray-500 font-semibold uppercase">
            Candidate Records Storage
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-3.5">Register No</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Year & Section</th>
                <th className="p-3.5 text-center">SGPA</th>
                <th className="p-3.5 text-center">CGPA</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500 font-semibold text-xs">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 mx-auto flex items-center justify-center">
                        <UsersRound size={24} />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">No enrolled students present</p>
                      <p className="text-gray-500 text-xs">
                        All previous student data has been removed. Click <strong>"Add New Student"</strong> above to feed candidates manually, or upload student marksheets via Results Upload.
                      </p>
                      <button
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#152744]"
                      >
                        <UserPlus size={14} className="text-[#D4A72C]" /> Add First Candidate
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.regNo} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#0B192C]">{s.regNo}</td>
                    <td className="p-3.5 font-bold text-gray-900">{s.name}</td>
                    <td className="p-3.5 font-medium text-gray-800">{s.deptName}</td>
                    <td className="p-3.5 text-gray-700">
                      {s.year} • {s.section}
                    </td>
                    <td className="p-3.5 text-center font-bold text-[#0B192C]">{s.sgpa.toFixed(2)}</td>
                    <td className="p-3.5 text-center font-bold text-[#B08014]">{s.cgpa.toFixed(2)}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        title="View Profile"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={isCollegeLocked}
                        onClick={() => openEditModal(s)}
                        className={`p-1.5 rounded-lg transition ${
                          isCollegeLocked
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                            : "bg-gray-100 hover:bg-gray-200 text-[#0B192C]"
                        }`}
                        title={isCollegeLocked ? "Locked by COE" : "Edit Student"}
                      >
                        {isCollegeLocked ? <Lock size={13} /> : <Edit size={14} />}
                      </button>
                      <button
                        type="button"
                        disabled={isCollegeLocked}
                        onClick={() => toggleStatus(s.regNo)}
                        className={`p-1.5 rounded-lg transition ${
                          isCollegeLocked
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                            : s.status === "ACTIVE"
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        }`}
                        title={isCollegeLocked ? "Locked by COE" : s.status === "ACTIVE" ? "Deactivate Student" : "Activate Student"}
                      >
                        {isCollegeLocked ? <Lock size={13} /> : s.status === "ACTIVE" ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      </button>
                      <button
                        type="button"
                        disabled={isCollegeLocked}
                        onClick={() => handleDelete(s.regNo, s.name)}
                        className={`p-1.5 rounded-lg transition ${
                          isCollegeLocked
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
                            : "bg-red-50 hover:bg-red-100 text-red-600"
                        }`}
                        title={isCollegeLocked ? "Locked by COE" : "Delete Student"}
                      >
                        {isCollegeLocked ? <Lock size={13} /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E5E1D8] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-[#B08014]" />
                <h3 className="font-display font-bold text-lg text-[#0B192C]">
                  {editingRegNo ? "Edit Student Record" : "Add New Student Candidate"}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Register Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formRegNo}
                    disabled={!!editingRegNo}
                    onChange={(e) => setFormRegNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 20260110226020"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-mono font-bold uppercase focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-semibold focus:outline-none focus:border-[#0B192C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Department
                </label>
                {availableDepts.length > 0 ? (
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-bold text-gray-800 bg-white"
                  >
                    {availableDepts.map((d) => (
                      <option key={d.key} value={d.name}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-semibold"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Year of Study
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-semibold bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Semester
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-semibold bg-white"
                  >
                    <option value="Semester I">Semester I</option>
                    <option value="Semester II">Semester II</option>
                    <option value="Semester III">Semester III</option>
                    <option value="Semester IV">Semester IV</option>
                    <option value="Semester V">Semester V</option>
                    <option value="Semester VI">Semester VI</option>
                    <option value="Semester VII">Semester VII</option>
                    <option value="Semester VIII">Semester VIII</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value.toUpperCase())}
                    placeholder="e.g. A"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-bold uppercase text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. student@students.kvell.edu"
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-mono text-gray-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-bold bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    CGPA (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formCgpa}
                    onChange={(e) => setFormCgpa(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E1D8] font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0B192C] text-white font-extrabold flex items-center gap-1.5 hover:bg-[#152744] shadow"
                >
                  <Check size={14} className="text-[#D4A72C]" />
                  {editingRegNo ? "Save Changes" : "Enroll Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#E5E1D8] shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-[#E5E1D8] pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0B192C]">{selectedStudent.name}</h3>
                <span className="font-mono text-xs font-bold text-[#B08014]">{selectedStudent.regNo}</span>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Department</span>
                <span className="font-bold text-[#0B192C]">{selectedStudent.deptName}</span>
              </div>
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Current Semester</span>
                <span className="font-bold text-[#0B192C]">{selectedStudent.semester}</span>
              </div>
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Year & Section</span>
                <span className="font-bold text-[#0B192C]">
                  {selectedStudent.year} • Section {selectedStudent.section}
                </span>
              </div>
              <div className="bg-[#F8F5EE] p-3 rounded-xl border border-[#E5E1D8]">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Cumulative CGPA</span>
                <span className="font-bold text-[#B08014]">{selectedStudent.cgpa.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  const toEdit = selectedStudent;
                  setSelectedStudent(null);
                  openEditModal(toEdit);
                }}
                className="px-4 py-2 rounded-xl border border-[#0B192C] text-[#0B192C] text-xs font-bold hover:bg-gray-50"
              >
                Edit Details
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-bold"
              >
                Close Candidate Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
