import React, { useEffect, useState } from "react";
import { Link } from "wouter";
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
} from "lucide-react";
import { adminDashboardApi, AdminDashboardStats } from "../services/api";

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);

  useEffect(() => {
    const load = () => {
      adminDashboardApi.getStats().then(setStats);
    };
    load();
    window.addEventListener("kvell_marks_updated", load);
    window.addEventListener("kvell_subjects_updated", load);
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("kvell_marks_updated", load);
      window.removeEventListener("kvell_subjects_updated", load);
      window.removeEventListener("storage", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  return (
    <div className="space-y-8 w-full">
      {/* Welcome Banner */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-xl">
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            University Controller of Examinations
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            Result & Examination Management Portal
          </h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed font-medium">
            Upload semester end marks, run automated schema validation, and publish official grade statements directly to the Student Portal.
          </p>
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

      {/* Clean University Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider">
              Total Students
            </span>
            <span className="font-display font-black text-2xl sm:text-3xl text-[#0B192C] mt-1 block">
              {stats?.totalStudents || 0}
            </span>
            <span className="text-[10px] font-semibold text-[#667085] mt-1 block flex items-center gap-1">
              {stats?.totalStudents ? (
                <>
                  <CheckCircle2 size={12} className="text-[#1D8A5A]" /> Active Enrolled
                </>
              ) : (
                "No Enrolled Students"
              )}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider">
              Total Faculty
            </span>
            <span className="font-display font-black text-2xl sm:text-3xl text-[#0B192C] mt-1 block">
              {stats?.totalFaculty || 0}
            </span>
            <span className="text-[10px] font-semibold text-[#667085] mt-1 block">
              {stats?.totalFaculty ? `${stats.totalFaculty} Assigned Faculty` : "No Faculty Recorded"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider">
              Total Departments
            </span>
            <span className="font-display font-black text-2xl sm:text-3xl text-[#0B192C] mt-1 block">
              {stats?.totalDepartments || 0}
            </span>
            <span className="text-[10px] font-semibold text-[#B08014] mt-1 block font-mono">
              {stats?.totalDepartments ? `${stats.totalDepartments} Active Departments` : "No Active Departments"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-[#667085] block tracking-wider">
              Total Courses
            </span>
            <span className="font-display font-black text-2xl sm:text-3xl text-[#0B192C] mt-1 block">
              {stats?.totalCourses || 0}
            </span>
            <span className="text-[10px] font-semibold text-[#667085] mt-1 block">
              {stats?.totalCourses ? `${stats.totalCourses} Registered Courses` : "No Courses Registered"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
        </div>
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
              <TrendingUp size={12} /> May 2025
            </span>
          </div>
          <span className="font-display font-black text-3xl text-[#0B192C]">
            {stats?.overallPassPercentage || 0}%
          </span>
          <p className="text-xs text-gray-500 mt-2">
            Cumulative pass percentage across all engineering departments.
          </p>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-extrabold tracking-wider">
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
                    No upload batches recorded. Click "Student Data" to add student records.
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
    </div>
  );
};
