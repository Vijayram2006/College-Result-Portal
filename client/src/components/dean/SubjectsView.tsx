import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  ShieldCheck,
  FileCheck,
  X,
  RotateCcw,
  Check,
  Clock,
  ChevronDown,
} from "lucide-react";
import { allCurriculumSubjects } from "../../data/curriculumSubjects";

export interface SubjectItem {
  id: string;
  code: string;
  title: string;
  category: "Core Mandatory" | "Professional Elective" | "Open Elective";
  credits: number;
  department: string;
  deptKey?: string;
  semester: string;
  academicYear?: string;
  faculty: string;
  status: "COE FINALIZED" | "PENDING APPROVAL";
  studentsEnrolled?: number;
}

export const initialEngineeringSubjects: SubjectItem[] = allCurriculumSubjects.map((s, idx) => {
  // To match the exact screenshot where 1 subject is pending approval and PH2GC01I is for Robotics & Automation:
  const isRoboticsPhysics = s.title === "Engineering Physics" && (s.deptKey === "robotics" || s.department.toLowerCase().includes("robotics"));
  return {
    ...s,
    code: isRoboticsPhysics ? "PH2GC01I" : s.code,
    department: s.department === "Robotics and Automation" ? "Robotics & Automation" : s.department,
    academicYear: "2026-27",
    semester: "Semester I",
    faculty: s.faculty || "Faculty In-Charge",
    // 1 subject is pending approval to match "Finalize All Subjects (1 Pending)" and "1 Pending"
    status: idx === 1 ? ("PENDING APPROVAL" as const) : ("COE FINALIZED" as const),
  };
});

// Prepend or sort so that Robotics & Automation Engineering Physics is clearly visible as in Screenshot 2
const sortedInitialSubjects = [...initialEngineeringSubjects].sort((a, b) => {
  if (a.code === "PH2GC01I") return -1;
  if (b.code === "PH2GC01I") return 1;
  return 0;
});

export const SubjectsView: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    try {
      const saved = localStorage.getItem("kvell_dean_subjects");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const adminSaved = localStorage.getItem("kvell_admin_subjects");
      if (adminSaved) {
        const parsed = JSON.parse(adminSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return sortedInitialSubjects;
  });

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [semesterFilter, setSemesterFilter] = useState<string>("All");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<"Core Mandatory" | "Professional Elective" | "Open Elective">("Core Mandatory");
  const [formCredits, setFormCredits] = useState<number>(4);
  const [formSemester, setFormSemester] = useState("Semester I");
  const [formDept, setFormDept] = useState("Artificial Intelligence & Data Science");
  const [formFaculty, setFormFaculty] = useState("Faculty In-Charge");
  const [formStatus, setFormStatus] = useState<"COE FINALIZED" | "PENDING APPROVAL">("COE FINALIZED");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const saveSubjects = (newList: SubjectItem[]) => {
    setSubjects(newList);
    try {
      localStorage.setItem("kvell_dean_subjects", JSON.stringify(newList));
      localStorage.setItem("kvell_admin_subjects", JSON.stringify(newList));
      window.dispatchEvent(new Event("kvell_subjects_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const coreCount = subjects.filter((s) => s.category === "Core Mandatory").length;
  const electiveCount = subjects.filter((s) => s.category !== "Core Mandatory").length;
  const pendingCount = subjects.filter((s) => s.status === "PENDING APPROVAL").length;

  const handleFinalizeAll = () => {
    const updated = subjects.map((s) => ({
      ...s,
      status: "COE FINALIZED" as const,
    }));
    saveSubjects(updated);
    showToast("All curriculum subjects finalized with Dean of Academics endorsement!");
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all subjects from the catalog?")) {
      saveSubjects([]);
      showToast("All subjects cleared.");
    }
  };

  const handleResetToCurriculum = () => {
    if (window.confirm("Reset catalog to official Regulation 2026 Curriculum (50 Courses)?")) {
      saveSubjects(sortedInitialSubjects);
      showToast("Reset to official Regulation 2026 subjects successfully!");
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = subjects.map((s) =>
      s.id === id
        ? {
            ...s,
            status: s.status === "COE FINALIZED" ? ("PENDING APPROVAL" as const) : ("COE FINALIZED" as const),
          }
        : s
    );
    saveSubjects(updated);
    const target = subjects.find((s) => s.id === id);
    if (target) {
      showToast(`Subject ${target.code} status updated to ${target.status === "COE FINALIZED" ? "PENDING APPROVAL" : "COE FINALIZED"}`);
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Delete '${title}' from subject registry?`)) {
      const updated = subjects.filter((s) => s.id !== id);
      saveSubjects(updated);
      showToast(`Deleted subject: ${title}`);
    }
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setFormCode("");
    setFormTitle("");
    setFormCategory("Core Mandatory");
    setFormCredits(4);
    setFormSemester("Semester I");
    setFormDept("Artificial Intelligence & Data Science");
    setFormFaculty("Faculty In-Charge");
    setFormStatus("COE FINALIZED");
    setIsAddOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formTitle.trim()) {
      alert("Please provide Course Code and Subject Title.");
      return;
    }

    if (editingSubject) {
      const updated = subjects.map((s) =>
        s.id === editingSubject.id
          ? {
              ...s,
              code: formCode.trim().toUpperCase(),
              title: formTitle.trim(),
              category: formCategory,
              credits: Number(formCredits) || 3,
              semester: formSemester,
              department: formDept,
              faculty: formFaculty.trim() || "Faculty In-Charge",
              status: formStatus,
            }
          : s
      );
      saveSubjects(updated);
      showToast(`Updated subject: ${formTitle.trim()}`);
    } else {
      const newSubject: SubjectItem = {
        id: `subj_${Date.now()}`,
        code: formCode.trim().toUpperCase(),
        title: formTitle.trim(),
        category: formCategory,
        credits: Number(formCredits) || 3,
        semester: formSemester,
        academicYear: "2026-27",
        department: formDept,
        faculty: formFaculty.trim() || "Faculty In-Charge",
        status: formStatus,
        studentsEnrolled: 0,
      };
      saveSubjects([newSubject, ...subjects]);
      showToast(`Added new subject: ${formTitle.trim()}`);
    }

    setIsAddOpen(false);
  };

  // Unique departments for filter
  const departmentsList = [
    "Artificial Intelligence & Data Science",
    "Biomedical Engineering",
    "Biotechnology",
    "Civil Engineering",
    "Computer Science & Engineering",
    "Electrical & Electronics Engineering",
    "Electronics & Communication Engineering",
    "Information Technology",
    "Mechanical Engineering",
    "Robotics & Automation",
    "Automobile Engineering",
  ];

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.faculty.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === "All" || s.department.toLowerCase() === deptFilter.toLowerCase();
    const matchesCategory = categoryFilter === "All" || s.category === categoryFilter;
    const matchesSemester = semesterFilter === "All" || s.semester === semesterFilter;

    return matchesSearch && matchesDept && matchesCategory && matchesSemester;
  });

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B192C] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#D4A72C] flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check size={16} className="text-[#D4A72C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HERO DARK CARD (Exactly matching Image 2) */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-[#EAB308] text-[#0B192C] text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider inline-block mb-3 shadow-sm">
            CONTROLLER OF EXAMINATIONS - SUBJECT CATALOG
          </span>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Subjects &amp; Electives Management
          </h2>
          <p className="text-xs text-gray-300 font-medium mt-2 leading-relaxed">
            Official curriculum catalog for all academic semesters. The Controller of Examinations (COE) finalizes all core mandatory and elective subjects here for student registration and examination processing.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          {subjects.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-4 py-2.5 rounded-2xl bg-[#7F1D1D]/70 hover:bg-[#7F1D1D] text-red-200 border border-red-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              title="Clear all subjects"
            >
              <Trash2 size={15} />
              <span>Clear All Subjects</span>
            </button>
          )}

          {subjects.length === 0 && (
            <button
              type="button"
              onClick={handleResetToCurriculum}
              className="px-4 py-2.5 rounded-2xl bg-[#EAB308]/20 hover:bg-[#EAB308]/30 text-[#EAB308] border border-[#EAB308]/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Restore Regulation 2026</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus size={15} className="text-[#D4A72C]" />
            <span>+ Add Subject / Elective</span>
          </button>

          <button
            type="button"
            onClick={handleFinalizeAll}
            className={`px-5 py-2.5 rounded-2xl font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer ${
              pendingCount === 0
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400/40"
                : "bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C]"
            }`}
          >
            <FileCheck size={16} />
            <span>
              {pendingCount === 0
                ? "ALL SUBJECTS COE FINALIZED"
                : `Finalize All Subjects (${pendingCount} Pending)`}
            </span>
          </button>
        </div>
      </div>

      {/* 4 KPI STAT CARDS (Exactly matching Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Subjects */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              TOTAL SUBJECTS
            </span>
            <span className="font-display font-black text-2xl text-[#0B192C]">
              {subjects.length} Courses
            </span>
          </div>
        </div>

        {/* Card 2: Core Mandatory */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              CORE MANDATORY
            </span>
            <span className="font-display font-black text-2xl text-[#0B192C]">
              {coreCount} Core
            </span>
          </div>
        </div>

        {/* Card 3: Elective Subjects */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              ELECTIVE SUBJECTS
            </span>
            <span className="font-display font-black text-2xl text-[#B08014]">
              {electiveCount} Electives
            </span>
          </div>
        </div>

        {/* Card 4: COE Approval State */}
        <div className="bg-white p-5 rounded-3xl border border-[#E5E1D8] shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              COE APPROVAL STATE
            </span>
            <span className="font-display font-black text-xl text-emerald-700">
              {pendingCount === 0 ? "FINALIZED" : `${pendingCount} Pending`}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN DIRECTORY & TABLE CARD (Exactly matching Image 2) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 sm:p-8 space-y-6">
        {/* Title and Filter Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-5">
          <div>
            <h3 className="font-display font-black text-xl text-[#0B192C]">
              Official Academic Subjects &amp; Elective Directory
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Review and finalize core subjects and student-selected electives.
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
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

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:outline-none transition shadow-sm cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:outline-none transition shadow-sm cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Core Mandatory">Core Mandatory</option>
              <option value="Professional Elective">Professional Elective</option>
              <option value="Open Elective">Open Elective</option>
            </select>

            {/* Semester Filter */}
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#E5E1D8] bg-[#F8F5EE]/70 px-3 text-xs font-extrabold text-[#0B192C] focus:bg-white focus:outline-none transition shadow-sm cursor-pointer"
            >
              <option value="All">All Semesters</option>
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
        </div>

        {/* Subjects Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="p-4">COURSE CODE</th>
                <th className="p-4">SUBJECT TITLE</th>
                <th className="p-4">CATEGORY / TYPE</th>
                <th className="p-4 text-center">CREDITS</th>
                <th className="p-4">SEMESTER &amp; DEPT</th>
                <th className="p-4">FACULTY IN-CHARGE</th>
                <th className="p-4 text-center">COE STATUS</th>
                <th className="p-4 text-center">ACTIONS</th>
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
                            ? "Click \"Restore Regulation 2026\" or \"+ Add Subject / Elective\" to register official curriculum courses."
                            : "No subjects matched the applied search and filter criteria. Try adjusting your query."}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((sub) => {
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-[#FAF8F5] transition duration-100"
                    >
                      {/* COURSE CODE */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2.5 py-1 rounded-md uppercase">
                          {sub.code}
                        </span>
                      </td>

                      {/* SUBJECT TITLE */}
                      <td className="p-4 font-bold text-xs sm:text-sm text-[#0B192C]">
                        {sub.title}
                      </td>

                      {/* CATEGORY / TYPE */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="bg-blue-50 text-blue-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                          {sub.category}
                        </span>
                      </td>

                      {/* CREDITS */}
                      <td className="p-4 text-center font-bold text-xs text-[#0B192C] whitespace-nowrap">
                        {sub.credits} Credits
                      </td>

                      {/* SEMESTER & DEPT */}
                      <td className="p-4">
                        <div className="font-bold text-xs text-[#0B192C]">
                          {sub.semester} {sub.academicYear ? `(${sub.academicYear})` : "(2026-27)"}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium">
                          {sub.department}
                        </div>
                      </td>

                      {/* FACULTY IN-CHARGE */}
                      <td className="p-4 text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {sub.faculty || "Faculty In-Charge"}
                      </td>

                      {/* COE STATUS */}
                      <td className="p-4 text-center whitespace-nowrap">
                        {sub.status === "COE FINALIZED" ? (
                          <span className="border border-emerald-400 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>COE FINALIZED</span>
                          </span>
                        ) : (
                          <span className="border border-amber-300 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5">
                            <Clock size={12} className="text-amber-600" />
                            <span>PENDING APPROVAL</span>
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(sub.id)}
                            className="bg-[#0B192C] hover:bg-[#132943] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                            title="Toggle COE finalization status"
                          >
                            Toggle COE
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id, sub.title)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition cursor-pointer"
                            title="Delete subject"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT SUBJECT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5E1D8] space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-[#0B192C]">
                    {editingSubject ? "Edit Subject Details" : "Add Subject / Elective"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Official Curriculum Catalog Registration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PH2GC01I"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Credits *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={formCredits}
                    onChange={(e) => setFormCredits(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Subject Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering Physics"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                  >
                    <option value="Core Mandatory">Core Mandatory</option>
                    <option value="Professional Elective">Professional Elective</option>
                    <option value="Open Elective">Open Elective</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Semester
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
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
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Department
                </label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                >
                  {departmentsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Faculty In-Charge
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. K. Venkatesh"
                    value={formFaculty}
                    onChange={(e) => setFormFaculty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    COE Approval Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-[#0B192C] focus:outline-none"
                  >
                    <option value="COE FINALIZED">COE FINALIZED</option>
                    <option value="PENDING APPROVAL">PENDING APPROVAL</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold hover:bg-[#132943] transition shadow-md"
                >
                  {editingSubject ? "Save Changes" : "Register Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsView;
