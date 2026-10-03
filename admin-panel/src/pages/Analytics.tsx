import React from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Award,
  BookOpen,
  Users,
  Download,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const departmentData = [
  { name: "CSE & AI", total: 145, pass: 140, fail: 5, passRate: 96.5 },
  { name: "ECE", total: 120, pass: 112, fail: 8, passRate: 93.3 },
  { name: "EEE", total: 95, pass: 88, fail: 7, passRate: 92.6 },
  { name: "Mech", total: 110, pass: 98, fail: 12, passRate: 89.0 },
  { name: "Civil", total: 80, pass: 72, fail: 8, passRate: 90.0 },
];

const gradeDistribution = [
  { name: "O (Outstanding)", value: 240, color: "#2E7D5B" },
  { name: "A+ (Excellent)", value: 180, color: "#0B192C" },
  { name: "A (Very Good)", value: 110, color: "#D4A72C" },
  { name: "B+ (Good)", value: 75, color: "#C98A18" },
  { name: "B (Above Avg)", value: 30, color: "#667085" },
  { name: "RA / Fail", value: 40, color: "#B54747" },
];

const passRateTrends = [
  { term: "Nov 2023", passPercentage: 91.2 },
  { term: "May 2024", passPercentage: 93.4 },
  { term: "Nov 2024", passPercentage: 94.1 },
  { term: "May 2025", passPercentage: 96.4 },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#D4A72C] uppercase tracking-wider mb-1">
            <BarChart3 size={14} />
            Institutional Analytics
          </div>
          <h1 className="text-2xl font-black text-[#0B192C]">Academic & Result Analytics</h1>
          <p className="text-xs text-[#667085] mt-1">
            Comprehensive department pass rates, grade distributions, and historical performance trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-xs px-3 py-2 rounded-xl text-gray-700 font-semibold">
            <Calendar size={14} /> Academic Year: 2025 - 2026
          </div>
          <button
            onClick={() => alert("Analytics report exported as PDF")}
            className="flex items-center gap-2 bg-[#0B192C] text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-[#0B192C]/90 transition shadow-sm"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2E7D5B]/10 text-[#2E7D5B] flex items-center justify-center font-black">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              University Pass Rate
            </span>
            <span className="text-2xl font-black text-[#0B192C]">96.4%</span>
            <span className="text-[10px] text-[#2E7D5B] font-bold block mt-0.5">+2.3% from previous term</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0B192C]/10 text-[#0B192C] flex items-center justify-center font-black">
            <Users size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Evaluated Students
            </span>
            <span className="text-2xl font-black text-[#0B192C]">686</span>
            <span className="text-[10px] text-gray-500 font-bold block mt-0.5">Across 5 Departments</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D4A72C]/10 text-[#C98A18] flex items-center justify-center font-black">
            <Award size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              First Class Distinction
            </span>
            <span className="text-2xl font-black text-[#0B192C]">61.2%</span>
            <span className="text-[10px] text-[#C98A18] font-bold block mt-0.5">CGPA ≥ 8.5</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#B54747]/10 text-[#B54747] flex items-center justify-center font-black">
            <BookOpen size={24} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Re-appearance (RA)
            </span>
            <span className="text-2xl font-black text-[#B54747]">3.6%</span>
            <span className="text-[10px] text-[#B54747] font-bold block mt-0.5">25 Students total</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Pass Comparison Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-base text-[#0B192C]">Department Pass Rate Comparison</h3>
              <p className="text-xs text-gray-500">Number of passing candidates vs arrear candidates</p>
            </div>
            <span className="text-xs font-bold text-[#D4A72C] bg-[#D4A72C]/10 px-2.5 py-1 rounded-full">
              May 2025
            </span>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#172033" }} />
                <YAxis tick={{ fontSize: 12, fill: "#172033" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0B192C", borderRadius: "12px", color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pass" name="Passed" fill="#2E7D5B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="fail" name="RA / Backlog" fill="#B54747" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-bold text-base text-[#0B192C]">Grade Distribution</h3>
            <p className="text-xs text-gray-500">Breakdown of awarded letter grades</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            {gradeDistribution.map((g) => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                <span className="text-gray-700 font-semibold">{g.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historical Pass Trend */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-bold text-base text-[#0B192C]">Multi-Semester Pass Percentage Trend</h3>
            <p className="text-xs text-gray-500">Track institutional pass rate progression over time</p>
          </div>
        </div>
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={passRateTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="term" tick={{ fontSize: 12, fill: "#172033" }} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 12, fill: "#172033" }} />
              <Tooltip contentStyle={{ backgroundColor: "#0B192C", borderRadius: "12px", color: "#fff" }} />
              <Line
                type="monotone"
                dataKey="passPercentage"
                name="Pass Rate (%)"
                stroke="#D4A72C"
                strokeWidth={3}
                dot={{ fill: "#0B192C", r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
