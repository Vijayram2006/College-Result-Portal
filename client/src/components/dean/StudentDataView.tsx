import React, { useState, useMemo } from "react";
import {
  Upload,
  UserPlus,
  Download,
  Trash2,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  Edit2,
  Calendar,
  Building2,
  BookOpen,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { aidsSem1Students } from "../../data/aidsStudents";

export interface StudentRecord {
  regNo: string;
  name: string;
  dob: string;
  department: string;
  year: string;
  semester: string;
  category: "Regular" | "Lateral";
}

const DEFAULT_DOBS: Record<string, string> = {
  "20260110226001": "2009-03-28",
  "20260110226002": "2009-05-28",
  "20260110226003": "2008-08-17",
  "20260110226004": "2009-03-30",
  "20260110226005": "2008-12-15",
  "20260110226006": "2008-08-18",
};

const INITIAL_STUDENTS: StudentRecord[] = aidsSem1Students.map((s, idx) => ({
  regNo: s.regNo,
  name: s.name,
  dob: DEFAULT_DOBS[s.regNo] || `2008-${String((idx % 12) + 1).padStart(2, "0")}-${String((idx % 27) + 1).padStart(2, "0")}`,
  department: "Artificial Intelligence & Data Science",
  year: "1st Year (I Year)",
  semester: "Semester I",
  category: idx >= 46 ? "Lateral" : "Regular",
}));

export const StudentDataView: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem("kvell_dean_student_data");
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    } catch {
      return INITIAL_STUDENTS;
    }
  });

  const [selectedDept, setSelectedDept] = useState("Artificial Intelligence & Data Science");
  const [selectedYear, setSelectedYear] = useState("1st Year (I Year)");
  const [selectedSemester, setSelectedSemester] = useState("Semester I");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("2026-2027");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Regular" | "Lateral">("All");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newRegNo, setNewRegNo] = useState("");
  const [newName, setNewName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newCategory, setNewCategory] = useState<"Regular" | "Lateral">("Regular");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const persistStudents = (updated: StudentRecord[]) => {
    setStudents(updated);
    try {
      localStorage.setItem("kvell_dean_student_data", JSON.stringify(updated));
    } catch {}
  };

  // Filtered and sorted: Regular first, Lateral at the end, then by regNo
  const filteredStudents = useMemo(() => {
    let list = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === "All" || s.category === categoryFilter;
      return matchesSearch && matchesCat;
    });

    return list.sort((a, b) => {
      if (a.category === "Regular" && b.category === "Lateral") return -1;
      if (a.category === "Lateral" && b.category === "Regular") return 1;
      return a.regNo.localeCompare(b.regNo, undefined, { numeric: true });
    });
  }, [students, searchQuery, categoryFilter]);

  const regularCount = students.filter((s) => s.category === "Regular").length;
  const lateralCount = students.filter((s) => s.category === "Lateral").length;

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Register Number": "20260110226051",
        "Name": "KUMARAN S",
        "DOB": "2008-07-15",
        "Department": "Artificial Intelligence & Data Science",
        "Category": "Regular",
        "Year": "1st Year",
        "Semester": "Semester I",
      },
      {
        "Register Number": "20260110226052",
        "Name": "NANDHINI M",
        "DOB": "2008-11-20",
        "Department": "Artificial Intelligence & Data Science",
        "Category": "Lateral",
        "Year": "1st Year",
        "Semester": "Semester I",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student_Template");
    XLSX.writeFile(wb, "KVELL_Student_Data_Template.xlsx");
    showToast("Sample Excel Template downloaded successfully!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const imported: StudentRecord[] = rawJson.map((r, i) => {
          const regNo = String(
            r["Register Number"] || r["Reg No"] || r["regNo"] || `20260110226${String(100 + i)}`
          ).trim();
          const name = String(r["Name"] || r["Student Name"] || r["studentName"] || `Student ${regNo}`).trim();
          const dob = String(r["DOB"] || r["Date of Birth"] || "2008-01-01").trim();
          const catRaw = String(r["Category"] || "").toLowerCase();
          const category: "Regular" | "Lateral" = catRaw.includes("lateral") ? "Lateral" : "Regular";

          return {
            regNo,
            name,
            dob,
            department: selectedDept,
            year: selectedYear,
            semester: selectedSemester,
            category,
          };
        });

        // Non-destructive append/merge
        const map = new Map<string, StudentRecord>();
        students.forEach((s) => map.set(s.regNo, s));
        imported.forEach((s) => map.set(s.regNo, s));

        const updated = Array.from(map.values());
        persistStudents(updated);
        showToast(`Successfully merged ${imported.length} student record(s) from spreadsheet.`);
      } catch (err) {
        showToast("Error parsing Excel file. Please use the sample template.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNo.trim() || !newName.trim()) return;

    if (students.some((s) => s.regNo.toLowerCase() === newRegNo.trim().toLowerCase())) {
      showToast(`Student with Register Number ${newRegNo} already exists!`);
      return;
    }

    const newStudent: StudentRecord = {
      regNo: newRegNo.trim().toUpperCase(),
      name: newName.trim().toUpperCase(),
      dob: newDob || "2008-05-15",
      department: selectedDept,
      year: selectedYear,
      semester: selectedSemester,
      category: newCategory,
    };

    const updated = [...students, newStudent];
    persistStudents(updated);
    setShowAddModal(false);
    setNewRegNo("");
    setNewName("");
    setNewDob("");
    showToast(`Added ${newStudent.name} (${newStudent.regNo}) to ${selectedDept}.`);
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const updated = students.map((s) => (s.regNo === editingStudent.regNo ? editingStudent : s));
    persistStudents(updated);
    setEditingStudent(null);
    showToast(`Updated student details for ${editingStudent.regNo}.`);
  };

  const handleDeleteStudent = (regNo: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name} (${regNo}) from registry?`)) return;
    const updated = students.filter((s) => s.regNo !== regNo);
    persistStudents(updated);
    showToast(`Deleted student ${regNo}.`);
  };

  const handleDeleteTargetSemester = () => {
    if (!window.confirm(`Delete all student registry mappings for ${selectedDept} - ${selectedSemester}?`)) return;
    const updated = students.filter((s) => s.department !== selectedDept || s.semester !== selectedSemester);
    persistStudents(updated);
    showToast(`Cleared semester records for ${selectedDept} (${selectedSemester}).`);
  };

  const handleDeleteTargetYear = () => {
    if (!window.confirm(`Delete all student registry mappings for ${selectedDept} - ${selectedYear}?`)) return;
    const updated = students.filter((s) => s.department !== selectedDept || s.year !== selectedYear);
    persistStudents(updated);
    showToast(`Cleared year records for ${selectedDept} (${selectedYear}).`);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main Student Data Container matching Image 1 */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C]/20 text-[#D4A72C] border border-[#D4A72C]/40 text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider inline-block mb-2 shadow-xs">
            STEP 1 OF 3 • EXCEL / CSV UPLOAD &amp; STUDENT REGISTRY MANAGEMENT
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Student Data</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Select target department, study year, and semester. Upload Excel spreadsheets or use the Add Student button.
            Older records are preserved and merged, with regular students sorted first and lateral entries appended at
            the end.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>+ Add Student</span>
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-amber-600 text-[#0B192C] font-black text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download size={15} />
            <span>Sample Excel Template</span>
          </button>
        </div>
      </div>

      {/* Card 1: Select Target Department, Year & Semester */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div>
            <h2 className="font-display font-bold text-base text-[#0B192C]">
              1. Select Target Department, Year &amp; Semester
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Student data will be mapped and assigned to the selected department, study year and academic period
            </p>
          </div>
          <span className="self-start sm:self-center bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-amber-300">
            MANDATORY BATCH MAPPING
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              DEPARTMENT
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none transition shadow-xs"
            >
              <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
              <option value="Computer Science and Engineering">Computer Science and Engineering</option>
              <option value="Biomedical Engineering">Biomedical Engineering</option>
              <option value="Biotechnology">Biotechnology</option>
              <option value="Computer Science and Business Systems">Computer Science and Business Systems</option>
              <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
              <option value="Electrical & Electronics Engineering">Electrical & Electronics Engineering</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Automobile Engineering">Automobile Engineering</option>
              <option value="Robotics and Automation">Robotics and Automation</option>
              <option value="Civil Engineering">Civil Engineering</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                YEAR (STUDY YEAR)
              </label>
              <span className="text-[9px] font-bold text-gray-400 uppercase">1ST TO 4TH YEAR</span>
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none transition shadow-xs"
            >
              <option value="1st Year (I Year)">1st Year (I Year)</option>
              <option value="2nd Year (II Year)">2nd Year (II Year)</option>
              <option value="3rd Year (III Year)">3rd Year (III Year)</option>
              <option value="4th Year (IV Year)">4th Year (IV Year)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              TARGET SEMESTER
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none transition shadow-xs"
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
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              ACADEMIC YEAR
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full h-11 px-3.5 rounded-2xl border border-gray-200 bg-[#FAF8F5] focus:bg-white text-xs font-bold text-[#0B192C] focus:border-[#0B192C] focus:outline-none transition shadow-xs"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>
        </div>

        {/* Active Target Banner and Delete Controls */}
        <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="font-bold text-gray-700">
            <span className="text-gray-400 uppercase tracking-wider text-[10px] mr-1.5">ACTIVE TARGET:</span>
            <span className="text-[#0B192C] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              {selectedDept} • {selectedYear} • {selectedSemester} • {selectedAcademicYear}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTargetSemester}
              className="px-3.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Target Semester Data</span>
            </button>
            <button
              onClick={handleDeleteTargetYear}
              className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Target Year Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Upload Student Spreadsheet */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-bold text-base text-[#0B192C]">
              2. Upload Student Spreadsheet (Non-Destructive Append)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Uploading a new file will merge with existing students for without affecting previous data.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserPlus size={14} className="text-[#D4A72C]" />
            <span>+ Add Student Manually</span>
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <label className="border-2 border-dashed border-gray-300 hover:border-[#D4A72C] rounded-2xl p-8 bg-[#FAF8F5]/60 hover:bg-amber-50/20 transition flex flex-col items-center justify-center gap-2 cursor-pointer text-center group">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          <div className="h-12 w-12 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#D4A72C] group-hover:border-[#D4A72C] transition">
            <Upload size={22} />
          </div>
          <p className="text-xs font-bold text-[#0B192C] mt-1">
            Drag &amp; drop student Excel/CSV sheet here, or <span className="text-[#B08014] underline">Browse files</span>
          </p>
          <p className="text-[11px] text-gray-400">
            Supports Register Number, Name, DOB, Category (Regular / Lateral). Auto-maps to {selectedDept}.
          </p>
        </label>
      </div>

      {/* Card 3: Student Registry Table */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              Enrolled Student Directory ({filteredStudents.length} Students)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Official roll list configured for {selectedDept} • {selectedSemester}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F8F5EE] p-1 rounded-xl border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setCategoryFilter("All")}
                className={`px-3 py-1 rounded-lg transition ${
                  categoryFilter === "All" ? "bg-[#0B192C] text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                All ({students.length})
              </button>
              <button
                onClick={() => setCategoryFilter("Regular")}
                className={`px-3 py-1 rounded-lg transition ${
                  categoryFilter === "Regular" ? "bg-[#0B192C] text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Regular ({regularCount})
              </button>
              <button
                onClick={() => setCategoryFilter("Lateral")}
                className={`px-3 py-1 rounded-lg transition ${
                  categoryFilter === "Lateral" ? "bg-[#0B192C] text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Lateral ({lateralCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name / reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-[#FAF8F5] text-xs font-medium focus:bg-white focus:outline-none focus:border-[#0B192C]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
              <tr>
                <th className="py-3 px-3.5 text-center w-12">#</th>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Date of Birth</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Study Year &amp; Sem</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-semibold">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.regNo} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3.5 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0B192C]">{s.regNo}</td>
                    <td className="py-3 px-4 font-bold text-[#0B192C]">{s.name}</td>
                    <td className="py-3 px-4 text-gray-600 font-mono">{s.dob}</td>
                    <td className="py-3 px-4 text-gray-600 truncate max-w-[200px]" title={s.department}>
                      {s.department}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {s.year} • {s.semester}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          s.category === "Regular"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setEditingStudent({ ...s })}
                        className="p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Edit Student"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s.regNo, s.name)}
                        className="p-1 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete Student"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD STUDENT MANUALLY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-[#D4A72C]" />
                <h3 className="font-display font-bold text-base">Add New Student</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  REGISTER NUMBER *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20260110226051"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold uppercase focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  FULL CANDIDATE NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIKRAM S"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold uppercase focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  DATE OF BIRTH (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  ADMISSION CATEGORY
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold focus:border-[#0B192C] focus:outline-none"
                >
                  <option value="Regular">Regular Entry</option>
                  <option value="Lateral">Lateral Entry (Appended at end)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold hover:bg-[#152744] shadow"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-[#D4A72C]" />
                <h3 className="font-display font-bold text-base">Edit Student Details</h3>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  REGISTER NUMBER
                </label>
                <input
                  type="text"
                  disabled
                  value={editingStudent.regNo}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-100 text-xs font-bold font-mono text-gray-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  FULL CANDIDATE NAME
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value.toUpperCase() })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold uppercase focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  DATE OF BIRTH (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={editingStudent.dob}
                  onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-medium focus:border-[#0B192C] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                  ADMISSION CATEGORY
                </label>
                <select
                  value={editingStudent.category}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, category: e.target.value as "Regular" | "Lateral" })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-bold focus:border-[#0B192C] focus:outline-none"
                >
                  <option value="Regular">Regular Entry</option>
                  <option value="Lateral">Lateral Entry (Appended at end)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold hover:bg-[#152744] shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
