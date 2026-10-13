import React, { useState, useEffect } from "react";
import { getStoredDepartments, Department } from "./Departments";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Filter,
  Layers,
  GraduationCap,
  Sparkles,
  Edit3,
  Trash2,
  ShieldCheck,
  Award,
  AlertCircle,
  FileCheck,
  X,
  RotateCcw,
} from "lucide-react";
import { allCurriculumSubjects } from "../data/curriculumSubjects";

import { getScopedKey, getActiveCollege, getActiveCollegeKey, isEngineeringCollege } from "../utils/rbac";

export interface SubjectItem {
  id: string;
  code: string;
  title: string;
  category: "Core Mandatory" | "Professional Elective" | "Open Elective";
  credits: number;
  department: string;
  semester: string;
  academicYear?: string;
  faculty: string;
  status: "COE FINALIZED" | "PENDING APPROVAL";
  studentsEnrolled?: number;
}

export const SubjectsPage: React.FC = () => {
  const college = getActiveCollege();
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    const activeCollege = getActiveCollegeKey();
    const storageKey = getScopedKey("kvell_admin_subjects");

    // For Nursing and Pharmacy: NO pre-seeded subjects! Start clean.
    if (activeCollege !== "engineering") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        return [];
      }
      return [];
    }

    // Engineering college: load existing subjects or defaults
    try {
      const saved = localStorage.getItem("kvell_admin_subjects");
      if (!saved) {
        localStorage.setItem("kvell_admin_subjects", JSON.stringify(allCurriculumSubjects));
        return allCurriculumSubjects as SubjectItem[];
      }
      const parsed: SubjectItem[] = JSON.parse(saved);
      if (parsed.length === 0) {
        localStorage.setItem("kvell_admin_subjects", JSON.stringify(allCurriculumSubjects));
        return allCurriculumSubjects as SubjectItem[];
      }
      const migrated = parsed.map((s) => ({
        ...s,
        academicYear: "2026-27",
        semester: "Semester I",
      }));
      localStorage.setItem("kvell_admin_subjects", JSON.stringify(migrated));
      return migrated;
    } catch {
      return allCurriculumSubjects as SubjectItem[];
    }
  });
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [semesterFilter, setSemesterFilter] = useState<string>("All");
  const [isAllFinalized, setIsAllFinalized] = useState(false);

  // Modal State for Adding New Subject
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<"Core Mandatory" | "Professional Elective" | "Open Elective">("Core Mandatory");
  const [newCredits, setNewCredits] = useState(4);
  const [newSemester, setNewSemester] = useState("Semester I");
  const [storedDepts, setStoredDepts] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState("General Engineering");
  const [newFaculty, setNewFaculty] = useState("");

  useEffect(() => {
    const list = getStoredDepartments();
    setStoredDepts(list);
    if (list.length > 0) {
      setNewDept(list[0].name);
    }
  }, []);

  const handleFinalizeAll = () => {
    const updated = subjects.map((sub) => ({ ...sub, status: "COE FINALIZED" as const }));
    setSubjects(updated);
    try {
      localStorage.setItem(getScopedKey("kvell_admin_subjects"), JSON.stringify(updated));
      window.dispatchEvent(new Event("kvell_subjects_updated"));
    } catch (e) {
      console.error(e);
    }
    setIsAllFinalized(true);
    alert(`COE Official Finalization Completed! All subjects for ${college.name} are now approved.`);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) {
      alert("Please enter subject code and title.");
      return;
    }
    const newSubject: SubjectItem = {
      id: String(Date.now()),
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      category: newCategory,
      credits: Number(newCredits),
      department: newDept,
      semester: newSemester || "Semester I",
      academicYear: "2026-27",
      faculty: newFaculty.trim() || "Faculty In-Charge",
      status: "COE FINALIZED",
      studentsEnrolled: 0,
    };
    const updated = [newSubject, ...subjects];
    setSubjects(updated);
    try {
      localStorage.setItem(getScopedKey("kvell_admin_subjects"), JSON.stringify(updated));
      window.dispatchEvent(new Event("kvell_subjects_updated"));
    } catch (e) {
      console.error(e);
    }
    setIsAddOpen(false);
    setNewCode("");
    setNewTitle("");
    if (storedDepts.length > 0) setNewDept(storedDepts[0].name);
    setNewFaculty("");
    alert(`Subject '${newSubject.code} - ${newSubject.title}' added to ${college.name}!`);
  };

  const handleDeleteSubject = (id: string, title: string) => {
    if (window.confirm(`Delete subject '${title}' from subject catalog?`)) {
      const updated = subjects.filter((s) => s.id !== id);
      setSubjects(updated);
      try {
        localStorage.setItem(getScopedKey("kvell_admin_subjects"), JSON.stringify(updated));
        window.dispatchEvent(new Event("kvell_subjects_updated"));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleClearAllSubjects = () => {
    if (window.confirm(`Are you sure you want to remove all subjects from ${college.name}?`)) {
      setSubjects([]);
      try {
        localStorage.setItem(getScopedKey("kvell_admin_subjects"), JSON.stringify([]));
        window.dispatchEvent(new Event("kvell_subjects_updated"));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleResetToCurriculum = () => {
    if (isEngineeringCollege()) {
      if (window.confirm("Reload all official Regulation 2026 Semester I subjects across all departments?")) {
        setSubjects(allCurriculumSubjects as SubjectItem[]);
        try {
          localStorage.setItem("kvell_admin_subjects", JSON.stringify(allCurriculumSubjects));
          window.dispatchEvent(new Event("kvell_subjects_updated"));
        } catch (e) {
          console.error(e);
        }
        setIsAllFinalized(true);
        alert("Official Regulation 2026 subjects reloaded and synced successfully!");
      }
    } else {
      setSubjects([]);
      try {
        localStorage.setItem(getScopedKey("kvell_admin_subjects"), JSON.stringify([]));
        window.dispatchEvent(new Event("kvell_subjects_updated"));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch =
      `${sub.code} ${sub.title} ${sub.faculty} ${sub.department}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDept =
      deptFilter === "All" || sub.department.toLowerCase().includes(deptFilter.toLowerCase());
    const matchesCategory =
      categoryFilter === "All" || sub.category === categoryFilter;
    const matchesSemester =
      semesterFilter === "All" || sub.semester === semesterFilter;
    return matchesSearch && matchesDept && matchesCategory && matchesSemester;
  });

  const coreCount = subjects.filter((s) => s.category === "Core Mandatory").length;
  const electiveCount = subjects.filter((s) => s.category !== "Core Mandatory").length;
  const pendingCount = subjects.filter((s) => s.status === "PENDING APPROVAL").length;

  return (
    <div className="space-y-8 w-full">
      {/* Top Banner & Header */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D4A72C]/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-black uppercase px-3 py-1 rounded tracking-widest inline-block mb-2.5 shadow-sm">
            CONTROLLER OF EXAMINATIONS · SUBJECT CATALOG
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white">
            Subjects & Electives Management
          </h2>
          <p className="text-xs text-white/70 mt-1.5 max-w-2xl font-medium leading-relaxed">
            Official curriculum catalog for all academic semesters. The Controller of Examinations (COE) finalizes all core mandatory and elective subjects here for student registration and examination processing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {subjects.length > 0 && (
            <button
              onClick={handleClearAllSubjects}
              className="px-4 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-200 font-extrabold text-xs border border-red-400/30 transition shadow flex items-center gap-2"
              title="Remove all subjects from catalog"
            >
              <Trash2 size={16} /> Clear All Subjects
            </button>
          )}

          {isEngineeringCollege() && (
            <button
              onClick={handleResetToCurriculum}
              className="px-4 py-3 rounded-2xl bg-[#D4A72C]/20 hover:bg-[#D4A72C]/30 text-[#D4A72C] font-extrabold text-xs border border-[#D4A72C]/40 transition shadow flex items-center gap-2"
              title="Reload official Regulation 2026 subjects for all departments"
            >
              <RotateCcw size={16} /> Official 2026 Subjects
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs border border-white/20 transition shadow flex items-center gap-2"
          >
            <Plus size={16} className="text-[#D4A72C]" /> Add Subject / Elective
          </button>

          <button
            onClick={handleFinalizeAll}
            className={`px-6 py-3 rounded-2xl font-extrabold text-xs transition shadow-lg flex items-center gap-2 active:scale-95 border ${
              pendingCount === 0 || isAllFinalized
                ? "bg-emerald-600 text-white border-emerald-400/40"
                : "bg-[#D4A72C] text-[#0B192C] hover:bg-[#c39722] border-[#D4A72C]"
            }`}
          >
            <FileCheck size={17} />
            <span>
              {pendingCount === 0 || isAllFinalized
                ? "ALL SUBJECTS COE FINALIZED"
                : `Finalize All Subjects (${pendingCount} Pending)`}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Total Subjects
            </span>
            <span className="font-display font-black text-2xl text-[#0B192C]">
              {subjects.length} Courses
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Core Mandatory
            </span>
            <span className="font-display font-black text-2xl text-[#0B192C]">
              {coreCount} Core
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Elective Subjects
            </span>
            <span className="font-display font-black text-2xl text-[#B08014]">
              {electiveCount} Electives
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              COE Approval State
            </span>
            <span className="font-display font-black text-lg text-emerald-800">
              {pendingCount === 0 ? "FINALIZED" : `${pendingCount} Pending`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Subjects Table & Filters Container */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-5">
          <div>
            <h3 className="font-display font-extrabold text-xl text-[#0B192C]">
              Official Academic Subjects & Elective Directory
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Review and finalize core subjects and student-selected electives.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, title, faculty..."
                className="w-full h-10 pl-9 pr-3.5 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 text-xs font-semibold text-[#0B192C] focus:bg-white focus:outline-none focus:border-[#0B192C] transition shadow-sm"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:outline-none transition shadow-sm"
            >
              <option value="All">All Departments</option>
              {storedDepts.map((d) => (
                <option key={d.key} value={d.name}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:outline-none transition shadow-sm"
            >
              <option value="All">All Categories</option>
              <option value="Core Mandatory">Core Mandatory</option>
              <option value="Professional Elective">Professional Elective</option>
              <option value="Open Elective">Open Elective</option>
            </select>

            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:outline-none transition shadow-sm"
            >
              <option value="All">All Semesters (Semester I)</option>
              <option value="Semester I">Semester I</option>
            </select>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-4">Course Code</th>
                <th className="p-4">Subject Title</th>
                <th className="p-4">Category / Type</th>
                <th className="p-4 text-center">Credits</th>
                <th className="p-4">Semester & Dept</th>
                <th className="p-4">Faculty In-Charge</th>
                <th className="p-4 text-center">COE Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8] bg-white">
              {filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-gray-500 font-semibold text-xs">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center border border-[#E5E1D8]">
                        <BookOpen size={26} className="text-[#B08014]" />
                      </div>
                      <div>
                        <h4 className="font-display font-extrabold text-[#0B192C] text-sm">
                          {subjects.length === 0 ? "Subject Catalog is Empty" : "No Matching Subjects Found"}
                        </h4>
                        <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                          {subjects.length === 0
                            ? "All subjects have been cleared. Click \"+ Add Subject / Elective\" above to register official curriculum courses."
                            : "No subjects matched the applied search and category filters. Try clearing the filter."}
                        </p>
                      </div>
                      {subjects.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddOpen(true)}
                          className="mt-2 px-4 py-2 rounded-xl bg-[#0B192C] text-white font-extrabold text-xs hover:bg-[#132943] transition shadow flex items-center gap-2"
                        >
                          <Plus size={14} className="text-[#D4A72C]" />
                          <span>Add New Subject</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-4">
                      <span className="font-mono text-xs font-black text-[#B08014] bg-[#D4A72C]/15 px-2.5 py-1 rounded-md border border-[#D4A72C]/30 shadow-sm">
                        {sub.code}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-[#0B192C] text-sm">
                      {sub.title}
                      {sub.studentsEnrolled && sub.studentsEnrolled > 0 ? (
                        <span className="block text-[10px] font-bold text-gray-400 mt-0.5">
                          Enrolled: {sub.studentsEnrolled} Students
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm border ${
                          sub.category === "Core Mandatory"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : sub.category === "Professional Elective"
                            ? "bg-amber-50 text-amber-900 border-amber-200"
                            : "bg-purple-50 text-purple-800 border-purple-200"
                        }`}
                      >
                        {sub.category}
                      </span>
                    </td>
                    <td className="p-4 text-center font-black text-[#0B192C]">
                      {sub.credits} Credits
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-gray-800 block text-xs">
                        Semester I <span className="text-[#B08014] font-black">(2026-27)</span>
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 block truncate max-w-[150px]">
                        {sub.department}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-gray-700">
                      {sub.faculty}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black border shadow-sm ${
                          sub.status === "COE FINALIZED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        <ShieldCheck size={13} />
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSubjects((prev) =>
                              prev.map((s) =>
                                s.id === sub.id
                                  ? {
                                      ...s,
                                      status:
                                        s.status === "COE FINALIZED"
                                          ? "PENDING APPROVAL"
                                          : "COE FINALIZED",
                                    }
                                  : s
                              )
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#0B192C] text-white font-extrabold text-[10px] hover:bg-[#152744] transition shadow-sm"
                          title="Toggle COE Approval"
                        >
                          Toggle COE
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub.id, sub.title)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-200"
                          title="Delete Subject"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SUBJECT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-[#D4A72C]/40 bg-white p-7 shadow-2xl reveal-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5 text-[#0B192C]">
                <div className="p-2 rounded-xl bg-[#0B192C] text-[#D4A72C]">
                  <BookOpen size={18} />
                </div>
                <h3 className="text-base font-black text-[#0B192C]">
                  Add Subject / Elective to COE Catalog
                </h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. CS309E"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Credits *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={6}
                    value={newCredits}
                    onChange={(e) => setNewCredits(Number(e.target.value))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  Subject Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Ethics"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  Department *
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                >
                  {storedDepts.length > 0 ? (
                    storedDepts.map((d) => (
                      <option key={d.key} value={d.name}>
                        {d.name} ({d.code})
                      </option>
                    ))
                  ) : (
                    <option value="General Engineering">General Engineering</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Category Type *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(
                        e.target.value as "Core Mandatory" | "Professional Elective" | "Open Elective"
                      )
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                  >
                    <option value="Core Mandatory">Core Mandatory</option>
                    <option value="Professional Elective">Professional Elective</option>
                    <option value="Open Elective">Open Elective</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                    Academic Year & Semester *
                  </label>
                  <div className="h-11 w-full rounded-2xl border border-[#D4A72C]/40 bg-[#D4A72C]/10 px-3.5 flex items-center justify-between text-xs font-extrabold text-[#0B192C]">
                    <span>Semester I</span>
                    <span className="bg-[#0B192C] text-[#D4A72C] px-2 py-0.5 rounded text-[10px] font-mono font-bold">2026-27</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold text-[#0B192C] uppercase tracking-wider">
                  Faculty In-Charge
                </label>
                <input
                  type="text"
                  value={newFaculty}
                  onChange={(e) => setNewFaculty(e.target.value)}
                  placeholder="e.g. Dr. Ananya Menon"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8F5EE] px-3.5 text-xs font-bold text-[#0B192C] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#0B192C] hover:bg-[#152744] px-6 py-2.5 text-xs font-extrabold text-white border border-[#D4A72C]/40 shadow-lg"
                >
                  Finalize & Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
