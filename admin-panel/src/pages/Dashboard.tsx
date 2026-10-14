import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Users,
  UserCheck,
  Building2,
  BookOpen,
  Globe,
  TrendingUp,
  Upload,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  PenLine,
  BarChart3,
  Award,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";
import { adminDashboardApi, AdminDashboardStats, studentsApi, StudentRecord } from "../services/api";
import { getStoredDepartments, refreshDepartments, Department } from "./Departments";
import { getActiveCollege } from "../utils/rbac";

export const Dashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const college = getActiveCollege();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals for interactive cards
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const [students, setStudents] = useState<StudentRecord[]>([]);

  const loadData = () => {
    adminDashboardApi.getStats().then(setStats).catch(() => undefined);
    setDepartments(getStoredDepartments());
    refreshDepartments().then(setDepartments).catch(() => undefined);
    studentsApi.list().then(setStudents).catch(() => undefined);
  };

  useEffect(() => {
    loadData();
    // Live numbers: other COE sessions and faculty submissions update the server, not this tab
    const timer = window.setInterval(() => adminDashboardApi.getStats().then(setStats).catch(() => undefined), 20000);
    window.addEventListener("kvell_marks_updated", loadData);
    window.addEventListener("kvell_subjects_updated", loadData);
    const syncDepts = () => setDepartments(getStoredDepartments());
    window.addEventListener("kvell_departments_updated", syncDepts);
    window.addEventListener("kvell_students_updated", loadData);
    window.addEventListener("storage", loadData);
    window.addEventListener("focus", loadData);
    return () => {
      window.removeEventListener("kvell_marks_updated", loadData);
      window.removeEventListener("kvell_subjects_updated", loadData);
      window.removeEventListener("kvell_departments_updated", syncDepts);
      window.removeEventListener("kvell_students_updated", loadData);
      window.removeEventListener("storage", loadData);
      window.removeEventListener("focus", loadData);
      window.clearInterval(timer);
    };
  }, []);

  // Helper to get student count for any department
  const getDeptStudentCount = (key: string): number =>
    departments.find((d) => d.key === key.toLowerCase())?.totalStudents ?? 0;

  // Full enrolled student list across the college's departments
  const allEnrolledStudents = useMemo(
    () =>
      students.map((s) => ({
        regNo: s.regNo,
        name: s.studentName,
        deptKey: s.deptKey,
        deptName: s.deptName,
        category: s.category,
      })),
    [students]
  );

  // Filtered students for quick search modal
  const filteredModalStudents = useMemo(() => {
    return allEnrolledStudents.filter((s) => {
      const matchDept = selectedDeptFilter === "all" || s.deptKey === selectedDeptFilter || (selectedDeptFilter === "aids" && s.deptKey === "ads");
      const q = studentSearchQuery.toLowerCase().trim();
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q);
      return matchDept && matchQuery;
    });
  }, [allEnrolledStudents, selectedDeptFilter, studentSearchQuery]);

  return (
    <div className="space-y-8 w-full">
      {/* Welcome Banner with Official College Seal */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 flex items-center gap-5 max-w-2xl">
          <img
            src={college.logoUrl}
            alt={college.name}
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-white p-1 border-2 border-[#D4A72C] shrink-0 object-contain shadow-lg"
          />
          <div>
            <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-1.5">
              OFFICE OF THE CONTROLLER OF EXAMINATIONS
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
              {college.name}
            </h2>
            <p className="text-xs text-[#D4A72C] font-semibold mt-1">
              Examination Administration, Valuation Bundles &amp; Result Publication Portal
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link
            href="/admin/results/upload"
            className="px-5 py-3 rounded-xl bg-[#D4A72C] text-[#0B192C] font-extrabold text-xs hover:bg-[#b08014] transition shadow flex items-center gap-2"
          >
            <Upload size={16} /> Student Data Excel/CSV
          </Link>
          <Link
            href="/admin/results/published"
            className="px-5 py-3 rounded-xl bg-white/10 text-white font-extrabold text-xs hover:bg-white/20 transition border border-white/20 flex items-center gap-2"
          >
            <Globe size={16} /> View Published Results
          </Link>
        </div>
      </div>

      {/* FULLY FUNCTIONAL UNIVERSITY METRICS CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#D4A72C]" />
            Live University Metric Directory · Click Any Card to Inspect & Manage
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Total Students (Clickable & Functional) */}
          <div
            onClick={() => setShowStudentsModal(true)}
            className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                  Total Students
                </span>
                <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                  {stats !== null ? stats.totalStudents : 0}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                <Users size={22} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-[#1D8A5A] flex items-center gap-1">
                <CheckCircle2 size={13} /> Active Enrolled
              </span>
              <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                View Roster <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* Card 2: Total Departments (Clickable & Functional) */}
          <div
            onClick={() => navigate("/admin/departments")}
            className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                  Total Departments
                </span>
                <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                  {stats !== null ? stats.totalDepartments : 0}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                <Building2 size={22} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-[#B08014] font-mono">
                {departments.length} Active Branches
              </span>
              <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                Manage Depts <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* Card 3: Total Faculty (Clickable & Functional) */}
          <div
            onClick={() => setShowFacultyModal(true)}
            className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                  Total Faculty & HODs
                </span>
                <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                  {stats !== null ? stats.totalFaculty : 0}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                <UserCheck size={22} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-gray-500">
                Assigned Dept Heads
              </span>
              <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                View Faculty <ChevronRight size={13} />
              </span>
            </div>
          </div>

          {/* Card 4: Total Courses (Clickable & Functional) */}
          <div
            onClick={() => navigate("/admin/subjects")}
            className="group cursor-pointer bg-white p-5 rounded-3xl border-2 border-[#E5E1D8] hover:border-[#D4A72C] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider group-hover:text-[#0B192C] transition">
                  Total Courses
                </span>
                <span className="font-display font-black text-3xl sm:text-4xl text-[#0B192C] mt-1 block">
                  {stats !== null ? stats.totalCourses : 0}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] group-hover:bg-[#0B192C] group-hover:text-[#D4A72C] flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                <BookOpen size={22} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-gray-500">
                Active Curriculum
              </span>
              <span className="text-[11px] font-extrabold text-[#0B192C] group-hover:text-[#B08014] flex items-center gap-0.5 transition">
                Open Catalog <ChevronRight size={13} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DEPARTMENT MATRIX & ENROLLMENT BREAKDOWN */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#D4A72C] uppercase tracking-wider mb-1">
              <Building2 size={15} />
              University Academic Matrix & Branch Directory
            </div>
            <h3 className="font-display font-bold text-xl text-[#0B192C]">
              Department Enrolled Candidates & Quick Action Center
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Select any department to jump directly into Student Roster, Examination Mark Entry, or Performance Analytics.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/admin/departments")}
              className="px-4 py-2.5 rounded-xl bg-[#F8F5EE] hover:bg-[#E5E1D8] text-[#0B192C] text-xs font-bold transition border border-[#E5E1D8] flex items-center gap-1.5"
            >
              <Building2 size={14} className="text-[#D4A72C]" />
              <span>Configure Departments</span>
            </button>
            <button
              onClick={() => setShowStudentsModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-extrabold transition shadow flex items-center gap-1.5"
            >
              <Users size={14} className="text-[#D4A72C]" />
              <span>Inspect All Students ({allEnrolledStudents.length})</span>
            </button>
          </div>
        </div>

        {departments.length === 0 ? (
          <div className="p-10 text-center bg-[#F8F5EE]/40 rounded-2xl border-2 border-dashed border-[#E5E1D8]">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center mb-3">
              <Building2 size={24} className="text-[#D4A72C]" />
            </div>
            <h4 className="font-display font-bold text-base text-[#0B192C]">No Departments Configured</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              No academic departments have been added for {college.name} yet. Configure your departments to enroll students and record examination marks.
            </p>
            <button
              onClick={() => navigate("/admin/departments")}
              className="mt-4 px-4 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold hover:bg-[#152744] transition inline-flex items-center gap-1.5 shadow"
            >
              <Building2 size={14} className="text-[#D4A72C]" />
              Add Department Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d) => {
              const count = getDeptStudentCount(d.key);
              const isFeatured = d.key === "aids" || d.key === "cse" || d.key === "bme";

              return (
                <div
                  key={d.key}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                    isFeatured
                      ? "bg-[#FFFDF7] border-[#D4A72C]/40 shadow-sm"
                      : "bg-white border-[#E5E1D8] hover:border-gray-400"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-black text-[#0B192C] bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 rounded-lg">
                        {d.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          count > 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {count} {count === 1 ? "Student" : "Students"}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-sm text-[#0B192C] line-clamp-1">{d.name}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      HOD: <span className="font-semibold text-gray-700">{d.headName || "Not assigned"}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        sessionStorage.setItem("kvell_selected_dept", d.key);
                        navigate("/admin/results/upload");
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-[#F8F5EE] hover:bg-[#E5E1D8] text-[#0B192C] text-[11px] font-extrabold transition text-center border border-[#E5E1D8]"
                      title={`Manage ${d.code} Student Data`}
                    >
                      Roster
                    </button>
                    <button
                      onClick={() => {
                        sessionStorage.setItem("kvell_selected_dept", d.key);
                        navigate("/admin/results/validation");
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-[#0B192C] hover:bg-[#132943] text-white text-[11px] font-extrabold transition text-center shadow-sm"
                      title={`Enter marks for ${d.code}`}
                    >
                      Marks
                    </button>
                    <button
                      onClick={() => {
                        sessionStorage.setItem("kvell_selected_dept", d.key);
                        navigate("/admin/analytics");
                      }}
                      className="p-1.5 rounded-lg bg-[#D4A72C]/20 hover:bg-[#D4A72C]/30 text-[#0B192C] transition border border-[#D4A72C]/50"
                      title={`View ${d.code} Analytics`}
                    >
                      <BarChart3 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Secondary Status & Workflow Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              Pending Verification
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              Draft / Validated
            </span>
          </div>
          <span className="font-display font-black text-3xl text-[#C98A18]">
            {stats?.pendingResults || 0} Batches
          </span>
          <p className="text-xs text-gray-500 mt-2">
            Uploaded mark sheets waiting for Admin review and confirmation publish.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              Published Batches
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Visible to Students
            </span>
          </div>
          <span className="font-display font-black text-3xl text-[#2E7D5B]">
            {stats?.publishedResults || 0} Batches
          </span>
          <p className="text-xs text-gray-500 mt-2">
            Officially published results accessible on the Student Portal.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              Overall Pass Rate
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1">
              <TrendingUp size={12} /> Published results
            </span>
          </div>
          <span className="font-display font-black text-3xl text-[#0B192C]">
            {stats?.overallPassPercentage || 0}%
          </span>
          <p className="text-xs text-gray-500 mt-2">
            Share of students with published results who passed every subject.
          </p>
        </div>
      </div>

      {/* Live department overview */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-6">
        <div className="mb-4 border-b border-[#E5E1D8] pb-4">
          <h3 className="font-display font-bold text-lg text-[#0B192C]">Department Overview</h3>
          <p className="text-xs text-gray-500 mt-0.5">Live from the database; refreshes every 20 seconds</p>
        </div>
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
              <tr>
                <th className="p-3">Department</th>
                <th className="p-3 text-center">Students</th>
                <th className="p-3 text-center">Without DOB</th>
                <th className="p-3 text-center">Subjects</th>
                <th className="p-3 text-center">Marks Entered</th>
                <th className="p-3 text-center">Published</th>
                <th className="p-3 text-right">Pass %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {!stats?.departments || stats.departments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold text-xs">
                    No departments have students or subjects yet.
                  </td>
                </tr>
              ) : (
                stats.departments.map((d) => (
                  <tr key={d.deptKey} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3 font-semibold text-gray-800">{d.name}</td>
                    <td className="p-3 text-center font-bold text-gray-900">{d.students}</td>
                    <td className={`p-3 text-center font-bold ${d.studentsWithoutDob > 0 ? "text-amber-700" : "text-gray-400"}`}>
                      {d.studentsWithoutDob}
                    </td>
                    <td className="p-3 text-center text-gray-700">{d.subjects}</td>
                    <td className="p-3 text-center text-gray-700">{d.marksEntered}</td>
                    <td className="p-3 text-center text-gray-700">{d.publishedBatches}</td>
                    <td className="p-3 text-right font-mono text-gray-700">
                      {d.publishedBatches > 0 ? `${d.passPercentage}%` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#E5E1D8] pb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-[#0B192C]">
              Recent Result Upload Batches
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Monitor upload batches and perform publishing confirmation
            </p>
          </div>
          <Link
            href="/admin/results/published"
            className="text-xs font-bold text-[#0B192C] hover:text-[#B08014] transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            View All Batches <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider sticky top-0 z-20">
              <tr>
                <th className="p-3">Batch ID</th>
                <th className="p-3">Department</th>
                <th className="p-3">Semester</th>
                <th className="p-3 text-center">Students</th>
                <th className="p-3 text-center">Publication Status</th>
                <th className="p-3 text-right">Upload Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {!stats?.recentUploads || stats.recentUploads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-semibold text-xs">
                    No upload batches recorded for {college.shortName}. Click "Student Data" to add student records.
                  </td>
                </tr>
              ) : (
                stats.recentUploads.map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-[#F8F5EE]/60 transition">
                    <td className="p-3 font-mono font-bold text-[#0B192C]">{batch.batchId}</td>
                    <td className="p-3 font-semibold text-gray-800">{batch.department}</td>
                    <td className="p-3 font-medium text-gray-700">{batch.semester}</td>
                    <td className="p-3 text-center font-bold text-gray-900">{batch.students}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          batch.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : batch.status === "VALIDATED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-gray-600">{batch.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE STUDENTS DIRECTORY MODAL */}
      {showStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 border border-[#E5E1D8] shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-black">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-[#0B192C]">
                    Enrolled Students Directory ({allEnrolledStudents.length} Active Candidates)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Live candidate registry across {college.name} departments.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStudentsModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Search by name or reg number..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-xs font-semibold focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] font-extrabold uppercase text-gray-400">Filter Branch:</span>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] font-bold text-xs text-[#0B192C] focus:outline-none"
                >
                  <option value="all">All Branches ({allEnrolledStudents.length})</option>
                  {departments.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.code} ({getDeptStudentCount(d.key)} Students)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-y-auto flex-1 border border-[#E5E1D8] rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold sticky top-0">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Register Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3 text-center">Category</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]">
                  {filteredModalStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 font-semibold">
                        No students match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredModalStudents.map((s, idx) => (
                      <tr key={s.regNo} className="hover:bg-[#F8F5EE]/60 transition">
                        <td className="p-3 font-mono text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-[#0B192C]">{s.regNo}</td>
                        <td className="p-3 font-bold text-gray-900">{s.name}</td>
                        <td className="p-3 font-semibold text-gray-700">{s.deptName}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              s.category === "lateral" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {s.category || "regular"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setShowStudentsModal(false);
                              navigate("/admin/results/validation");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#D4A72C]/20 hover:bg-[#D4A72C]/40 text-[#0B192C] text-[11px] font-extrabold transition inline-flex items-center gap-1"
                          >
                            <PenLine size={12} /> Enter Marks
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E5E1D8] text-xs">
              <span className="text-gray-500 font-medium">
                Showing <strong>{filteredModalStudents.length}</strong> of {allEnrolledStudents.length} students
              </span>
              <button
                onClick={() => {
                  setShowStudentsModal(false);
                  navigate("/admin/results/upload");
                }}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white font-extrabold text-xs hover:bg-[#152744] transition flex items-center gap-1.5 shadow"
              >
                <span>Open Full Student Data Manager</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FACULTY DIRECTORY MODAL */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#E5E1D8] shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-black">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-[#0B192C]">
                    Faculty & Department Heads Directory
                  </h3>
                  <p className="text-xs text-gray-500">
                    Official Department Heads and examination controllers for {college.name}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFacultyModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="divide-y divide-[#E5E1D8] max-h-96 overflow-y-auto">
              {departments.length === 0 ? (
                <div className="py-8 text-center text-gray-500 font-semibold text-xs">
                  No departments or faculty assigned yet for {college.name}.
                </div>
              ) : (
                departments.map((d) => (
                  <div key={d.key} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 block text-sm">{d.headName || "HOD name not assigned"}</span>
                      <span className="text-[10px] font-mono text-gray-500 block">
                        Logins: {d.hodLogin || "—"} (HOD) · {d.facultyLogin || "—"} (Faculty)
                      </span>
                      <span className="text-gray-500 text-[11px] font-medium">{d.name} ({d.code})</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                      Head of Department
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E5E1D8]">
              <button
                onClick={() => setShowFacultyModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white font-extrabold text-xs hover:bg-[#152744] transition"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
