import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  FileCheck,
  CheckSquare,
  Users,
  Search,
  BookOpen,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  UserX,
  Award
} from "lucide-react";
import {
  attendanceApi,
  authApi,
  type AttendanceSubjectOption,
  type AttendanceStudentRosterItem,
  type MonthlyBatchDetail,
  type AttendanceRecordItem
} from "../../services/api";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const PERIOD_SLOTS = [
  "Period 1 (09:00 - 10:00 AM)",
  "Period 2 (10:00 - 11:00 AM)",
  "Period 3 (11:15 - 12:15 PM)",
  "Period 4 (12:15 - 01:15 PM)",
  "Period 5 (02:00 - 03:00 PM)",
  "Period 6 (03:00 - 04:00 PM)",
  "Period 7 (04:00 - 05:00 PM)",
];

export function FacultyAttendanceModule() {
  const currentUser = authApi.currentUser();
  const userDeptKey = currentUser?.departmentKey || "cse";
  const userDeptName = currentUser?.departmentName || "Department of " + userDeptKey.toUpperCase();
  const userFacultyName = currentUser?.name || currentUser?.username || "";

  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [subjects, setSubjects] = useState<AttendanceSubjectOption[]>([]);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("");
  const [semester, setSemester] = useState<number>(1);
  const [deptKey, setDeptKey] = useState<string>(userDeptKey);

  // Sync department key if user changes
  useEffect(() => {
    if (userDeptKey && userDeptKey !== deptKey) {
      setDeptKey(userDeptKey);
    }
  }, [userDeptKey]);

  // Daily entry state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<string>(PERIOD_SLOTS[0]);
  const [roster, setRoster] = useState<AttendanceStudentRosterItem[]>([]);
  const [studentStatusMap, setStudentStatusMap] = useState<Record<string, { status: "PRESENT" | "ABSENT" | "ON_DUTY"; remark: string }>>({});
  const [savingDaily, setSavingDaily] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Monthly batch state
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [monthlyBatch, setMonthlyBatch] = useState<MonthlyBatchDetail | null>(null);
  const [loadingBatch, setLoadingBatch] = useState<boolean>(false);
  const [submittingBatch, setSubmittingBatch] = useState<boolean>(false);
  const [batchActionMsg, setBatchActionMsg] = useState<string | null>(null);

  // Load available subjects
  useEffect(() => {
    attendanceApi
      .getAvailableSubjects(semester)
      .then((subs) => {
        // Filter subjects strictly belonging to this faculty member (or department if general)
        const mySubjects = subs.filter((s) => {
          if (!currentUser || currentUser.role !== "FACULTY") return true;
          const f = (s.faculty || "").toLowerCase();
          const u = (currentUser.username || "").toLowerCase();
          const n = (currentUser.name || "").toLowerCase();
          return f.includes(u) || (n && f.includes(n)) || f.includes("faculty in-charge") || !s.faculty;
        });

        setSubjects(mySubjects);
        if (mySubjects.length > 0) {
          if (!mySubjects.some((s) => s.code === selectedSubjectCode)) {
            setSelectedSubjectCode(mySubjects[0].code);
          }
        } else {
          setSelectedSubjectCode("");
          setRoster([]);
          setStudentStatusMap({});
          setMonthlyBatch(null);
        }
      })
      .catch((err) => {
        console.error("Error loading subjects:", err);
        setSubjects([]);
        setSelectedSubjectCode("");
        setRoster([]);
        setStudentStatusMap({});
      });
  }, [semester, deptKey]);

  // Load student roster for the department and semester
  useEffect(() => {
    if (!selectedSubjectCode || subjects.length === 0) {
      setRoster([]);
      setStudentStatusMap({});
      return;
    }
    attendanceApi
      .getStudentRoster(deptKey, semester)
      .then((students) => {
        setRoster(students);
        // Initialize daily map
        const initialMap: Record<string, { status: "PRESENT" | "ABSENT" | "ON_DUTY"; remark: string }> = {};
        students.forEach((s) => {
          initialMap[s.regNo] = { status: "PRESENT", remark: "" };
        });
        setStudentStatusMap(initialMap);
      })
      .catch((err) => console.error("Error loading roster:", err));
  }, [deptKey, semester, selectedSubjectCode, subjects.length]);

  // Load daily attendance records when subject/date/slot changes
  useEffect(() => {
    if (!selectedSubjectCode || !selectedDate || subjects.length === 0) return;
    attendanceApi
      .getDailyAttendance(selectedSubjectCode, selectedDate, selectedSlot)
      .then((records) => {
        if (records.length > 0) {
          setStudentStatusMap((prev) => {
            const next = { ...prev };
            records.forEach((r) => {
              next[r.regNo] = { status: r.status, remark: r.remark || "" };
            });
            return next;
          });
        }
      })
      .catch((err) => console.error("Error loading daily attendance:", err));
  }, [selectedSubjectCode, selectedDate, selectedSlot, subjects.length]);

  // Load monthly batch summary
  const loadMonthlyBatch = () => {
    if (!selectedSubjectCode || subjects.length === 0) {
      setMonthlyBatch(null);
      setLoadingBatch(false);
      return;
    }
    setLoadingBatch(true);
    attendanceApi
      .getMonthlyBatch({
        deptKey,
        semester,
        subjectCode: selectedSubjectCode,
        year: selectedYear,
        month: selectedMonth,
      })
      .then((batch) => {
        setMonthlyBatch(batch);
        setLoadingBatch(false);
      })
      .catch((err) => {
        console.error("Error loading batch:", err);
        setMonthlyBatch(null);
        setLoadingBatch(false);
      });
  };

  useEffect(() => {
    loadMonthlyBatch();
  }, [selectedSubjectCode, semester, deptKey, selectedYear, selectedMonth, subjects.length]);

  // Mark all present
  const handleMarkAllPresent = () => {
    setStudentStatusMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((regNo) => {
        next[regNo] = { status: "PRESENT", remark: "" };
      });
      return next;
    });
  };

  // Toggle single student status
  const handleSetStudentStatus = (regNo: string, status: "PRESENT" | "ABSENT" | "ON_DUTY") => {
    setStudentStatusMap((prev) => ({
      ...prev,
      [regNo]: {
        ...prev[regNo],
        status,
        remark: status === "PRESENT" ? "" : (prev[regNo]?.remark || (status === "ON_DUTY" ? "Official duty" : "Unexcused")),
      },
    }));
  };

  // Save daily attendance
  const handleSaveDaily = async () => {
    setSavingDaily(true);
    setSaveSuccessMsg(null);
    try {
      const records = Object.entries(studentStatusMap).map(([regNo, item]) => ({
        regNo,
        status: item.status,
        remark: item.remark,
      }));

      const updatedBatch = await attendanceApi.saveDailyAttendance({
        deptKey,
        semester,
        subjectCode: selectedSubjectCode,
        date: selectedDate,
        sessionSlot: selectedSlot,
        records,
      });

      setMonthlyBatch(updatedBatch);
      setSaveSuccessMsg(`Daily attendance saved successfully for ${records.length} students.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to save daily attendance.");
    } finally {
      setSavingDaily(false);
    }
  };

  // Submit monthly batch to HOD
  const handleSubmitBatch = async () => {
    if (!monthlyBatch) return;
    if (
      !window.confirm(
        `Are you sure you want to submit the monthly attendance of ${monthlyBatch.subjectCode} (${MONTHS.find((m) => m.value === monthlyBatch.month)?.label} ${monthlyBatch.year}) for HOD approval?`
      )
    ) {
      return;
    }

    setSubmittingBatch(true);
    setBatchActionMsg(null);
    try {
      const updated = await attendanceApi.submitMonthlyBatch(monthlyBatch.batchId);
      setMonthlyBatch(updated);
      setBatchActionMsg("Monthly attendance submitted to HOD successfully for scrutiny!");
      setTimeout(() => setBatchActionMsg(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to submit batch.");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Daily stats calculation
  const totalStudents = roster.length;
  const presentCount = Object.values(studentStatusMap).filter((s) => s.status === "PRESENT").length;
  const absentCount = Object.values(studentStatusMap).filter((s) => s.status === "ABSENT").length;
  const odCount = Object.values(studentStatusMap).filter((s) => s.status === "ON_DUTY").length;
  const dailyAttendancePct = totalStudents > 0 ? (((presentCount + odCount) * 100) / totalStudents).toFixed(1) : "0.0";

  const selectedSubject = subjects.find((s) => s.code === selectedSubjectCode);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0B192C] text-white p-6 rounded-3xl border-2 border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded font-mono font-black text-[10px] bg-[#D4A72C] text-[#0B192C] tracking-widest uppercase">
                FACULTY ATTENDANCE MODULE
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {userDeptName}
              </span>
              {userFacultyName && (
                <span className="text-xs font-bold text-amber-300">
                  • {userFacultyName}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2.5">
              <CheckSquare className="text-[#D4A72C]" size={26} />
              Attendance Management &amp; Monthly Approval
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Record daily subject attendance, compute monthly student percentages, and submit monthly attendance batches for <strong>HOD scrutiny</strong> and <strong>Associate Dean (ADEAN) institutional approval</strong>. Once approved by ADEAN, attendance &amp; absent details are published to the Student Portal.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-2xl border border-white/15 shrink-0">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "daily"
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Clock size={15} />
              <span>Mark Daily Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "monthly"
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Send size={15} />
              <span>Monthly Sheet &amp; Approval</span>
              {monthlyBatch?.status === "DRAFT" && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-amber-300 mb-1">Subject</label>
            <select
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              disabled={subjects.length === 0}
              className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[#D4A72C] disabled:opacity-60"
            >
              {subjects.length === 0 ? (
                <option value="">No subjects assigned for Sem {semester}</option>
              ) : (
                subjects.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code} - {sub.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-300 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[#D4A72C]"
            >
              <option value={1}>Semester I (1st Semester)</option>
              <option value={2}>Semester II (2nd Semester)</option>
              <option value={3}>Semester III (3rd Semester)</option>
              <option value={4}>Semester IV (4th Semester)</option>
              <option value={5}>Semester V (5th Semester)</option>
              <option value={6}>Semester VI (6th Semester)</option>
              <option value={7}>Semester VII (7th Semester)</option>
              <option value={8}>Semester VIII (8th Semester)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-300 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[#D4A72C]"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-300 mb-1">Academic Year</label>
            <input
              type="text"
              readOnly
              value={`${selectedYear} (${MONTHS.find((m) => m.value === selectedMonth)?.label})`}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-slate-300 font-semibold cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Save / Action Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {batchActionMsg && (
        <div className="bg-blue-50 border border-blue-300 text-blue-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm animate-in fade-in duration-200">
          <Sparkles className="text-blue-600 shrink-0" size={18} />
          <span>{batchActionMsg}</span>
        </div>
      )}

      {/* =====================================================================
          TAB 1: DAILY ATTENDANCE MARKING
          ===================================================================== */}
      {activeTab === "daily" && (
        subjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-3">
            <AlertCircle className="mx-auto text-amber-500" size={36} />
            <h3 className="font-bold text-base text-slate-800">
              No Subjects Assigned for Semester {semester}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You are not assigned as faculty to any course in Semester {semester} for {userDeptName}. Please select a semester where your courses are allocated (e.g. 1st Semester).
            </p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Daily Controls & KPI Summary */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D4A72C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Session / Period Slot</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#D4A72C]"
                >
                  {PERIOD_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="self-end pb-0.5">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1.5"
                  title="Mark all students as Present"
                >
                  <UserCheck size={14} />
                  <span>Mark All Present</span>
                </button>
              </div>
            </div>

            {/* Quick Session Stats */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="text-center px-3 border-r border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Enrolled</span>
                <span className="text-base font-black text-slate-800">{totalStudents}</span>
              </div>
              <div className="text-center px-3 border-r border-slate-200">
                <span className="text-[10px] font-bold uppercase text-emerald-600 block">Present</span>
                <span className="text-base font-black text-emerald-700">{presentCount}</span>
              </div>
              <div className="text-center px-3 border-r border-slate-200">
                <span className="text-[10px] font-bold uppercase text-rose-600 block">Absent</span>
                <span className="text-base font-black text-rose-700">{absentCount}</span>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] font-bold uppercase text-amber-600 block">Session %</span>
                <span className="text-base font-black text-[#0B192C]">{dailyAttendancePct}%</span>
              </div>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Student Attendance Roster &bull; {selectedSubject?.code} - {selectedSubject?.title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Date: <strong>{selectedDate}</strong> &bull; Slot: <strong>{selectedSlot}</strong> &bull; Total Students: {roster.length}
                </p>
              </div>

              <button
                onClick={handleSaveDaily}
                disabled={savingDaily}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#0B192C] text-[#D4A72C] hover:bg-[#172033] border border-[#D4A72C]/40 shadow transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>{savingDaily ? "Saving Attendance..." : "Save Daily Attendance"}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Register No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    <th className="py-3 px-4">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="mx-auto mb-2 text-slate-300" size={32} />
                        <p className="font-bold text-slate-600">No students enrolled</p>
                        <p className="text-[11px] text-slate-400">
                          No students found in {userDeptName} for Semester {semester}.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    roster.map((student, idx) => {
                      const current = studentStatusMap[student.regNo] || { status: "PRESENT", remark: "" };
                      return (
                      <tr key={student.regNo} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{student.regNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{student.name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            {student.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Present Button */}
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(student.regNo, "PRESENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                current.status === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow"
                                  : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                              }`}
                            >
                              <UserCheck size={13} />
                              <span>P</span>
                            </button>

                            {/* Absent Button */}
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(student.regNo, "ABSENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                current.status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow"
                                  : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                              }`}
                            >
                              <UserX size={13} />
                              <span>A</span>
                            </button>

                            {/* On Duty (OD) Button */}
                            <button
                              type="button"
                              onClick={() => handleSetStudentStatus(student.regNo, "ON_DUTY")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                current.status === "ON_DUTY"
                                  ? "bg-blue-600 text-white shadow"
                                  : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                              }`}
                            >
                              <Award size={13} />
                              <span>OD</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder={current.status === "ABSENT" ? "e.g. Fever / Unexcused" : current.status === "ON_DUTY" ? "e.g. Sports meet / Hackathon" : "Optional remarks"}
                            value={current.remark}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentStatusMap((prev) => ({
                                ...prev,
                                [student.regNo]: { ...prev[student.regNo], remark: val },
                              }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-[#D4A72C]"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Changes saved here automatically update this month&apos;s consolidated attendance calculations.
              </span>
              <button
                onClick={handleSaveDaily}
                disabled={savingDaily}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#0B192C] text-[#D4A72C] hover:bg-[#172033] border border-[#D4A72C]/40 shadow transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Save Daily Attendance</span>
              </button>
            </div>
          </div>
        </div>
        )
      )}

      {/* =====================================================================
          TAB 2: MONTHLY SHEET & APPROVAL SUBMISSION
          ===================================================================== */}
      {activeTab === "monthly" && (
        subjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-3">
            <AlertCircle className="mx-auto text-amber-500" size={36} />
            <h3 className="font-bold text-base text-slate-800">
              No Subjects Assigned for Semester {semester}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You are not assigned as faculty to any course in Semester {semester} for {userDeptName}. Please select a semester where your courses are allocated (e.g. 1st Semester).
            </p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Monthly Workflow Status Banner */}
          {monthlyBatch && (
            <div
              className={`p-6 rounded-3xl border shadow-sm relative overflow-hidden ${
                monthlyBatch.status === "ADEAN_APPROVED"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : monthlyBatch.status === "HOD_APPROVED"
                  ? "bg-purple-50 border-purple-300 text-purple-950"
                  : monthlyBatch.status === "SUBMITTED_TO_HOD"
                  ? "bg-blue-50 border-blue-300 text-blue-950"
                  : monthlyBatch.status.startsWith("REJECTED")
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-amber-50 border-amber-300 text-amber-950"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono font-black text-[10px] tracking-wider uppercase ${
                        monthlyBatch.status === "ADEAN_APPROVED"
                          ? "bg-emerald-700 text-white"
                          : monthlyBatch.status === "HOD_APPROVED"
                          ? "bg-purple-700 text-white"
                          : monthlyBatch.status === "SUBMITTED_TO_HOD"
                          ? "bg-blue-700 text-white"
                          : monthlyBatch.status.startsWith("REJECTED")
                          ? "bg-rose-700 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      STATUS: {monthlyBatch.status.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      BATCH: {monthlyBatch.batchId}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black mt-1">
                    {monthlyBatch.status === "ADEAN_APPROVED" && "✓ Fully Approved by Associate Dean & Published to Student Portal"}
                    {monthlyBatch.status === "HOD_APPROVED" && "⌛ Scrutinized & Approved by HOD &bull; Pending ADEAN Final Approval"}
                    {monthlyBatch.status === "SUBMITTED_TO_HOD" && "⌛ Submitted for HOD Approval & Scrutiny"}
                    {monthlyBatch.status === "DRAFT" && "✎ Draft Monthly Attendance Sheet &bull; Pending Submission"}
                    {monthlyBatch.status.startsWith("REJECTED") && "⚠️ Returned / Rejection Remarks Logged &bull; Please Revise"}
                  </h3>

                  <p className="text-xs opacity-80 leading-relaxed max-w-2xl">
                    Subject: <strong>{monthlyBatch.subjectCode} - {monthlyBatch.subjectTitle}</strong> &bull; Total Classes Conducted: <strong>{monthlyBatch.totalConducted}</strong> &bull; Class Average: <strong>{monthlyBatch.classAveragePct}%</strong>
                  </p>
                </div>

                {/* Submission / Status Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {monthlyBatch.status === "DRAFT" || monthlyBatch.status.startsWith("REJECTED") ? (
                    <button
                      onClick={handleSubmitBatch}
                      disabled={submittingBatch}
                      className="px-5 py-3 rounded-2xl text-xs font-black bg-[#0B192C] text-[#D4A72C] border-2 border-[#D4A72C] hover:bg-[#172033] shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={16} />
                      <span>{submittingBatch ? "Submitting..." : "Submit to HOD for Approval"}</span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 rounded-xl bg-white/70 border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <span>Workflow In Progress</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviewer Audit Log notes if available */}
              {(monthlyBatch.hodRemarks || monthlyBatch.adeanRemarks) && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {monthlyBatch.hodRemarks && (
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        HOD Remarks ({monthlyBatch.hodName || "HOD"})
                      </span>
                      <p className="text-slate-800 font-medium mt-0.5">{monthlyBatch.hodRemarks}</p>
                    </div>
                  )}
                  {monthlyBatch.adeanRemarks && (
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Associate Dean Remarks ({monthlyBatch.adeanName || "ADEAN"})
                      </span>
                      <p className="text-slate-800 font-medium mt-0.5">{monthlyBatch.adeanRemarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Monthly Student Summary Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Monthly Student Performance &amp; Attendance Breakdown
                </h3>
                <p className="text-[11px] text-slate-500">
                  Month: <strong>{MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}</strong> &bull; Subject: <strong>{selectedSubjectCode}</strong> &bull; Total Classes: {monthlyBatch?.totalConducted || 0}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">
                  Class Average: <strong className="text-slate-900 font-mono text-sm">{monthlyBatch?.classAveragePct || 0}%</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Register No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4 text-center">Conducted</th>
                    <th className="py-3 px-4 text-center text-emerald-700">Attended</th>
                    <th className="py-3 px-4 text-center text-rose-700">Absent</th>
                    <th className="py-3 px-4 text-center text-blue-700">On Duty</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                    <th className="py-3 px-4 text-center">Eligibility Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {monthlyBatch?.students && monthlyBatch.students.length > 0 ? (
                    monthlyBatch.students.map((st, idx) => (
                      <tr key={st.regNo} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.regNo}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{st.studentName}</td>
                        <td className="py-3 px-4 text-center font-mono">{st.conducted}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">{st.attended}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">{st.absent}</td>
                        <td className="py-3 px-4 text-center font-mono text-blue-700">{st.od}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900 text-sm">
                          {st.percentage}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              st.percentage >= 75
                                ? "bg-emerald-100 text-emerald-800"
                                : st.percentage >= 65
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {st.percentage >= 75 ? "ELIGIBLE" : st.percentage >= 65 ? "CONDONATION" : "SHORTAGE (<75%)"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                        No monthly records recorded yet for this selection. Use the "Mark Daily Attendance" tab to record classes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}
    </div>
  );
}
