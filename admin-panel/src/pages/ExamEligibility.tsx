import React, { useState, useEffect, useMemo, useCallback } from "react";
import { apiClient, apiErrorMessage } from "../services/api";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Users,
  Plus,
  Trash2,
  CreditCard,
  X,
  AlertCircle,
} from "lucide-react";

/** Eligibility rule: attendance below 75% = NOT eligible to write the exam. */
export const ATTENDANCE_THRESHOLD = 75;

export interface DepartmentOption {
  key: string;
  name: string;
  code?: string;
}

export type EligibilityStatus = "Eligible" | "Not Eligible" | "Eligible (Condoned)" | "No Data";

export interface StudentEligibilityItem {
  regNo: string;
  studentName: string;
  dob: string;
  department: string;
  deptKey: string;
  classYear: string;
  semester: number;
  classesAttended?: number | null;
  totalClasses?: number | null;
  attendancePercent?: number | null;
  fineDue?: number | null;
  fineStatus?: string | null;
  receiptNo?: string | null;
  paidAmount?: number | null;
  effectiveStatus?: string | null;
}

export interface FineSlabItem {
  id?: number;
  minPct: number | string;
  maxPct: number | string;
  fineAmount: number | string;
}

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export function ExamEligibilityPage() {
  // --- Fine Slabs Configuration State ---
  const [slabs, setSlabs] = useState<FineSlabItem[]>([]);
  const [loadingSlabs, setLoadingSlabs] = useState<boolean>(false);
  const [savingSlabs, setSavingSlabs] = useState<boolean>(false);
  const [slabError, setSlabError] = useState<string | null>(null);
  const [slabSuccess, setSlabSuccess] = useState<string | null>(null);

  // --- Filter States ---
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // --- Student Data & Loading States ---
  const [students, setStudents] = useState<StudentEligibilityItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Record Payment Dialog State ---
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [payingStudent, setPayingStudent] = useState<StudentEligibilityItem | null>(null);
  const [receiptNo, setReceiptNo] = useState<string>("");
  const [recordingPayment, setRecordingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load Fine Slabs on mount
  const loadSlabs = useCallback(async () => {
    try {
      setLoadingSlabs(true);
      setSlabError(null);
      const res = await apiClient.get<any[]>("/admin/eligibility/slabs");
      setSlabs(res.data || []);
    } catch (err: any) {
      console.error("Failed to load slabs:", err);
      setSlabs([]);
    } finally {
      setLoadingSlabs(false);
    }
  }, []);

  useEffect(() => {
    loadSlabs();
  }, [loadSlabs]);

  // Load Departments on mount
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await apiClient.get<any[]>("/admin/departments");
        const list: DepartmentOption[] = (res.data || []).map((d: any) => ({
          key: d.key || d.deptKey || d.id,
          name: d.name || d.deptName,
          code: d.code || d.deptCode,
        }));
        setDepartments(list);
        if (list.length > 0 && !selectedDept) {
          const ece = list.find((d) => d.key.toLowerCase() === "ece");
          setSelectedDept(ece ? ece.key : list[0].key);
        }
      } catch {
        const fallback = [
          { key: "cse", name: "Computer Science and Engineering", code: "CSE" },
          { key: "ece", name: "Electronics and Communication Engineering", code: "ECE" },
          { key: "eee", name: "Electrical and Electronics Engineering", code: "EEE" },
          { key: "mech", name: "Mechanical Engineering", code: "MECH" },
          { key: "civil", name: "Civil Engineering", code: "CIVIL" },
        ];
        setDepartments(fallback);
        setSelectedDept("ece");
      }
    }
    loadDepts();
  }, []);

  // Compute available semesters from selected Year
  const availableSemesters = useMemo(() => {
    switch (selectedYear) {
      case "1st Year":
        return [1, 2];
      case "2nd Year":
        return [3, 4];
      case "3rd Year":
        return [5, 6];
      case "4th Year":
        return [7, 8];
      default:
        return [1, 2, 3, 4, 5, 6, 7, 8];
    }
  }, [selectedYear]);

  useEffect(() => {
    if (selectedSemester && !availableSemesters.includes(Number(selectedSemester))) {
      setSelectedSemester("");
    }
  }, [availableSemesters, selectedSemester]);

  // Compute student status based on server effectiveStatus or 75% threshold
  const getStudentStatus = useCallback((student: StudentEligibilityItem): EligibilityStatus => {
    if (student.effectiveStatus) {
      if (student.effectiveStatus === "ELIGIBLE") return "Eligible";
      if (student.effectiveStatus === "ELIGIBLE_CONDONED") return "Eligible (Condoned)";
      if (student.effectiveStatus === "NOT_ELIGIBLE") return "Not Eligible";
    }

    let pct = student.attendancePercent;
    if (pct == null && student.classesAttended != null && student.totalClasses != null && student.totalClasses > 0) {
      pct = (student.classesAttended / student.totalClasses) * 100;
    }

    if (pct == null) {
      return "No Data";
    }

    if (pct >= ATTENDANCE_THRESHOLD) {
      return "Eligible";
    }

    return "Not Eligible";
  }, []);

  // Attendance formatting: round down to one decimal so < 75 never shows 75.0
  const formatAttendancePct = (pct: number | null | undefined): string => {
    if (pct == null) return "-";
    const roundedDown = Math.floor(Number(pct) * 10) / 10;
    return `${roundedDown.toFixed(1)}%`;
  };

  // Fetch Eligibility List
  const loadEligibility = useCallback(async () => {
    if (!selectedDept || !selectedSemester) return;
    try {
      setLoadingStudents(true);
      setError(null);

      const res = await apiClient.get<StudentEligibilityItem[]>("/admin/eligibility/students", {
        params: {
          dept: selectedDept,
          year: selectedYear || undefined,
          semester: Number(selectedSemester),
        },
      });

      if (Array.isArray(res.data)) {
        setStudents(res.data);
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      console.error("Exam eligibility load error:", err);
      setError(apiErrorMessage(err, "Failed to load student eligibility records."));
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedDept, selectedYear, selectedSemester]);

  useEffect(() => {
    if (selectedDept && selectedSemester) {
      loadEligibility();
    } else {
      setStudents([]);
    }
  }, [selectedDept, selectedSemester, loadEligibility]);

  // Fine Slabs Handlers
  const handleAddSlab = () => {
    setSlabs((prev) => [...prev, { minPct: "", maxPct: "", fineAmount: "" }]);
  };

  const handleUpdateSlabField = (index: number, field: keyof FineSlabItem, value: any) => {
    setSlabs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteSlab = (index: number) => {
    setSlabs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSlabs = async () => {
    try {
      setSavingSlabs(true);
      setSlabError(null);
      setSlabSuccess(null);

      const payload = slabs.map((s) => ({
        minPct: s.minPct === "" ? null : Number(s.minPct),
        maxPct: s.maxPct === "" ? null : Number(s.maxPct),
        fineAmount: s.fineAmount === "" ? null : Number(s.fineAmount),
      }));

      const res = await apiClient.put<FineSlabItem[]>("/admin/eligibility/slabs", payload);
      setSlabs(res.data || []);
      setSlabSuccess("Fine slabs saved successfully.");
      setTimeout(() => setSlabSuccess(null), 4000);

      // Refresh student roster to update fine dues
      if (selectedDept && selectedSemester) {
        await loadEligibility();
      }
    } catch (err: any) {
      console.error("Failed to save slabs:", err);
      setSlabError(apiErrorMessage(err, "Failed to save fine slabs."));
    } finally {
      setSavingSlabs(false);
    }
  };

  // Payment Handlers
  const handleOpenPayment = (student: StudentEligibilityItem) => {
    setPayingStudent(student);
    setReceiptNo("");
    setPaymentError(null);
    setPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingStudent) return;

    const trimmed = receiptNo.trim();
    if (!trimmed) {
      setPaymentError("Receipt number is required.");
      return;
    }
    if (trimmed.length > 40) {
      setPaymentError("Receipt number must be at most 40 characters.");
      return;
    }

    try {
      setRecordingPayment(true);
      setPaymentError(null);

      await apiClient.post(`/admin/eligibility/fines/${payingStudent.regNo}/pay`, {
        receipt_no: trimmed,
        semester: payingStudent.semester || Number(selectedSemester),
      });

      setPaymentModalOpen(false);
      setPayingStudent(null);
      await loadEligibility();
    } catch (err: any) {
      console.error("Payment recording error:", err);
      setPaymentError(apiErrorMessage(err, "Failed to record fine payment."));
    } finally {
      setRecordingPayment(false);
    }
  };

  // Calculate Summary Counts
  const summaryMetrics = useMemo(() => {
    let eligible = 0;
    let notEligible = 0;
    let condoned = 0;
    let noData = 0;

    students.forEach((s) => {
      const st = getStudentStatus(s);
      if (st === "Eligible") eligible++;
      else if (st === "Not Eligible") notEligible++;
      else if (st === "Eligible (Condoned)") condoned++;
      else if (st === "No Data") noData++;
    });

    return {
      total: students.length,
      eligible,
      notEligible,
      condoned,
      noData,
    };
  }, [students, getStudentStatus]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const status = getStudentStatus(s);
      if (statusFilter === "Eligible" && status !== "Eligible") return false;
      if (statusFilter === "Not Eligible" && status !== "Not Eligible") return false;
      if (statusFilter === "Condoned" && status !== "Eligible (Condoned)") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.studentName.toLowerCase().includes(q);
        const matchReg = s.regNo.toLowerCase().includes(q);
        if (!matchName && !matchReg) return false;
      }

      return true;
    });
  }, [students, statusFilter, searchQuery, getStudentStatus]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#D4A72C] border border-[#D4A72C]/40">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  Exam Eligibility
                </h1>
                <span className="bg-[#D4A72C] text-[#0B192C] font-black text-[10px] px-2 py-0.5 rounded tracking-wider uppercase">
                  Threshold: {ATTENDANCE_THRESHOLD}%
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300 mt-1 max-w-3xl">
                Attendance below {ATTENDANCE_THRESHOLD}% renders a student ineligible for semester examinations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadEligibility}
              disabled={loadingStudents || !selectedDept || !selectedSemester}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loadingStudents ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Fine Slabs Configuration Panel (Top of the page, above Cohort filters) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-[#0B192C] tracking-wide">
              Condonation Fine Slabs
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Configure attendance percentage bands and associated fine amounts for condonation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddSlab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer"
            >
              <Plus size={14} className="text-[#D4A72C]" />
              <span>Add Band</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSlabs}
              disabled={savingSlabs}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] text-xs font-black transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {savingSlabs ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#0B192C]" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Slabs</span>
              )}
            </button>
          </div>
        </div>

        {/* Slabs Feedback Notices */}
        {slabError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{slabError}</span>
            </div>
            <button onClick={() => setSlabError(null)} className="text-rose-500 hover:text-rose-800 font-extrabold">
              Dismiss
            </button>
          </div>
        )}

        {slabSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-600" />
            <span>{slabSuccess}</span>
          </div>
        )}

        {/* Slabs Table or Empty State */}
        {loadingSlabs ? (
          <div className="py-6 text-center text-xs text-slate-500 font-bold">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4A72C] mx-auto mb-2" />
            <span>Loading fine slabs...</span>
          </div>
        ) : slabs.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs font-bold text-amber-900 bg-amber-50/80 border border-amber-200 rounded-2xl">
            <p className="text-sm font-black text-amber-950">Set the fine slabs first</p>
            <p className="text-[11px] font-semibold text-amber-800 mt-1">
              No attendance fine slabs have been configured. Click "+ Add Band" above to define attendance bands and condonation fine amounts.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B192C] text-white text-[11px] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-16 text-center">Band</th>
                    <th className="px-4 py-3">Minimum %</th>
                    <th className="px-4 py-3">Maximum %</th>
                    <th className="px-4 py-3">Fine Amount (₹)</th>
                    <th className="px-4 py-3 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                  {slabs.map((slab, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-2.5 text-center font-bold text-slate-500">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={slab.minPct}
                          onChange={(e) => handleUpdateSlabField(idx, "minPct", e.target.value)}
                          placeholder="e.g. 65.0"
                          className="w-32 h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs font-bold focus:border-[#D4A72C] outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={slab.maxPct}
                          onChange={(e) => handleUpdateSlabField(idx, "maxPct", e.target.value)}
                          placeholder="e.g. 74.99"
                          className="w-32 h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs font-bold focus:border-[#D4A72C] outline-none"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="relative w-40">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={slab.fineAmount}
                            onChange={(e) => handleUpdateSlabField(idx, "fineAmount", e.target.value)}
                            placeholder="e.g. 500"
                            className="w-full h-9 pl-7 pr-3 rounded-lg border border-slate-300 font-mono text-xs font-bold focus:border-[#D4A72C] outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSlab(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Band"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Department, Year, Semester Filter Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-extrabold uppercase tracking-wider text-[#0B192C]">
          <Filter size={14} className="text-[#D4A72C]" />
          <span>Cohort &amp; Academic Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Department Select */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Department
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0B192C] focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] outline-none"
            >
              <option value="">-- Select Department --</option>
              {departments.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name} {d.code ? `(${d.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Class Year (Optional)
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0B192C] focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] outline-none"
            >
              <option value="">All Academic Years</option>
              {YEAR_OPTIONS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Select */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
              Semester <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0B192C] focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] outline-none"
            >
              <option value="">-- Select Semester --</option>
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between text-xs font-bold">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800 font-extrabold">
            Dismiss
          </button>
        </div>
      )}

      {/* 4. Summary Metric Cards */}
      {selectedDept && selectedSemester && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Students */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Total Students
              </span>
              <span className="text-2xl font-black text-[#0B192C] block mt-1">
                {summaryMetrics.total}
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Users size={22} />
            </div>
          </div>

          {/* Eligible Students (>= 75%) */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                Eligible (&ge; {ATTENDANCE_THRESHOLD}%)
              </span>
              <span className="text-2xl font-black text-emerald-700 block mt-1">
                {summaryMetrics.eligible}
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* Not Eligible (< 75%) */}
          <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
                Not Eligible (&lt; {ATTENDANCE_THRESHOLD}%)
              </span>
              <span className="text-2xl font-black text-rose-700 block mt-1">
                {summaryMetrics.notEligible}
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle size={22} />
            </div>
          </div>

          {/* Condoned (Paid) */}
          <div className="bg-white rounded-2xl p-5 border border-amber-300 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                Eligible (Condoned)
              </span>
              <span className="text-2xl font-black text-[#8A6410] block mt-1">
                {summaryMetrics.condoned}
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center text-[#D4A72C]">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>
      )}

      {/* 5. Controls & Table Section */}
      {selectedDept && selectedSemester ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
          {/* Controls: Search & Status Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name or register no..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:border-[#D4A72C] outline-none"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {["All", "Eligible", "Not Eligible", "Condoned"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === tab
                      ? "bg-white text-[#0B192C] shadow-sm font-extrabold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table Area */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B192C] text-white text-[11px] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-14 text-center">S.No</th>
                    <th className="px-4 py-3.5 w-36">Register Number</th>
                    <th className="px-4 py-3.5">Student Name</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5 w-28 text-center">Class</th>
                    <th className="px-4 py-3.5 w-32 text-center">Attendance %</th>
                    <th className="px-4 py-3.5 w-36 text-center">Status</th>
                    <th className="px-4 py-3.5 w-36 text-center">Fine Due</th>
                    <th className="px-4 py-3.5 w-36 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4A72C] mx-auto mb-2" />
                        <span className="font-bold">Loading student attendance &amp; eligibility...</span>
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                        <Users size={36} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-slate-600">No students found matching the selected filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const status = getStudentStatus(s);
                      const isNotEligible = status === "Not Eligible";

                      let subNote = "";
                      if (s.classesAttended != null && s.totalClasses != null) {
                        subNote = `(${s.classesAttended}/${s.totalClasses} hrs)`;
                      }

                      return (
                        <tr
                          key={s.regNo}
                          className="hover:bg-slate-50/80 transition"
                        >
                          {/* S.No */}
                          <td className="px-4 py-3 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Register Number */}
                          <td className="px-4 py-3 font-mono font-bold text-[#0B192C]">
                            {s.regNo}
                          </td>

                          {/* Student Name */}
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {s.studentName}
                          </td>

                          {/* Department */}
                          <td className="px-4 py-3 text-slate-600">
                            {s.department}
                          </td>

                          {/* Class / Year */}
                          <td className="px-4 py-3 text-center font-semibold text-slate-600">
                            {s.classYear || `Sem ${s.semester}`}
                          </td>

                          {/* Attendance %: rounded down to 1 decimal place */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-black font-mono text-xs ${
                                s.attendancePercent == null
                                  ? "text-slate-400"
                                  : s.attendancePercent >= ATTENDANCE_THRESHOLD
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {formatAttendancePct(s.attendancePercent)}
                            </span>
                            {subNote && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {subNote}
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-4 py-3 text-center">
                            {status === "Eligible" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={12} className="text-emerald-600" />
                                <span>Eligible</span>
                              </span>
                            )}

                            {status === "Not Eligible" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200">
                                <XCircle size={12} className="text-rose-600" />
                                <span>Not Eligible</span>
                              </span>
                            )}

                            {status === "Eligible (Condoned)" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300">
                                <CheckCircle2 size={12} className="text-[#D4A72C]" />
                                <span>Eligible (Condoned)</span>
                              </span>
                            )}

                            {status === "No Data" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <span>No Data</span>
                              </span>
                            )}
                          </td>

                          {/* Fine Due Column */}
                          <td className="px-4 py-3 text-center">
                            {status === "Eligible (Condoned)" ? (
                              <div>
                                <span className="font-extrabold text-[#0B192C]">
                                  Paid ₹{s.paidAmount != null ? Number(s.paidAmount).toLocaleString("en-IN") : "-"}
                                </span>
                                {s.receiptNo && (
                                  <span className="block text-[10px] font-mono text-slate-500">
                                    Receipt: {s.receiptNo}
                                  </span>
                                )}
                              </div>
                            ) : isNotEligible ? (
                              s.fineDue != null ? (
                                <span className="font-mono font-bold text-rose-700">
                                  ₹{Number(s.fineDue).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-semibold italic">Not set</span>
                              )
                            ) : (
                              <span className="text-slate-300 font-bold">&mdash;</span>
                            )}
                          </td>

                          {/* Action Column */}
                          <td className="px-4 py-3 text-center">
                            {isNotEligible && s.fineDue != null ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(s)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] text-[11px] font-black transition cursor-pointer shadow-sm"
                              >
                                <CreditCard size={13} />
                                <span>Record Payment</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-bold">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Prompt State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <Filter size={48} className="mx-auto text-slate-300" />
          <h3 className="text-base font-black text-[#0B192C]">Select Cohort Filters</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please select a Department and Semester from the filters above to load the student exam eligibility roster.
          </p>
        </div>
      )}

      {/* Record Payment Dialog */}
      {paymentModalOpen && payingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#0B192C] text-white p-6 border-b border-[#D4A72C]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-[#D4A72C] border border-[#D4A72C]/40">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Record Condonation Fine</h3>
                  <p className="text-[11px] font-bold text-[#D4A72C]">
                    Fee Receipt &amp; Eligibility Confirmation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecordPaymentSubmit} className="p-6 space-y-4">
              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Student Overview Box */}
              <div className="bg-[#F8F5EE] rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Register Number:</span>
                  <span className="font-mono font-black text-[#0B192C]">{payingStudent.regNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Student Name:</span>
                  <span className="font-black text-[#0B192C]">{payingStudent.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Attendance:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatAttendancePct(payingStudent.attendancePercent)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-600 font-extrabold uppercase">Fine Due:</span>
                  <span className="font-mono font-black text-[#0B192C] text-sm">
                    ₹{payingStudent.fineDue != null ? Number(payingStudent.fineDue).toLocaleString("en-IN") : "0"}
                  </span>
                </div>
              </div>

              {/* Receipt Number Input */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Receipt Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  placeholder="Enter official receipt number (e.g. REC-2026-001)"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-[#0B192C] focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C] outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be unique and at most 40 characters.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  disabled={recordingPayment}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment || !receiptNo.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4A72C] hover:bg-[#c29624] text-[#0B192C] text-xs font-black transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {recordingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[#0B192C]" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} />
                      <span>Record &amp; Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
