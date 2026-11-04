import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  Award,
  Layers,
  Printer,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadWorkbook } from "../utils/downloadWorkbook";
import { reportsApi, type ReportDataset } from "../services/api";

interface ReportCatalogItem {
  key: string;
  title: string;
  category: "Student" | "Faculty" | "HOD" | "Associate Dean" | "COE" | "Chief COE";
  description: string;
  defaultFormat: "XLSX" | "PDF";
}

const REPORT_CATALOG: ReportCatalogItem[] = [
  // Student Reports (Requirement 4.1)
  {
    key: "STUDENT_ACADEMIC_TRANSCRIPT",
    title: "Student Academic Transcript & Marksheet",
    category: "Student",
    description: "Consolidated semester grades, course credits earned, CGPA/SGPA history, and degree completion status",
    defaultFormat: "PDF",
  },
  {
    key: "STUDENT_ATTENDANCE_SUMMARY",
    title: "Student Attendance Performance Summary",
    category: "Student",
    description: "Subject-wise attendance percentage, total class hours, leaves taken, and examination eligibility status",
    defaultFormat: "PDF",
  },
  {
    key: "STUDENT_INTERNAL_ASSESSMENT",
    title: "Continuous Internal Assessment (IA) Report",
    category: "Student",
    description: "IAT-1, IAT-2, assignment evaluation, and model exam marks breakdown with question-level insights",
    defaultFormat: "XLSX",
  },
  {
    key: "STUDENT_FEE_SUMMARY",
    title: "Fee Payment & Clearance Summary",
    category: "Student",
    description: "Tuition fee, examination dues, hostel charges receipts, and university financial clearance statements",
    defaultFormat: "PDF",
  },
  {
    key: "STUDENT_MENTORING_RECORD",
    title: "Mentoring Record & Advisory History",
    category: "Student",
    description: "Assigned faculty mentor contact card, session records, career counseling logs, and action items",
    defaultFormat: "PDF",
  },

  // Faculty Reports (Requirement 4.2)
  {
    key: "FACULTY_ATTENDANCE_REPORT",
    title: "Class Attendance Register & Shortage Report",
    category: "Faculty",
    description: "Subject-wise student attendance rosters, below-75% attendance alert lists, and condonation records",
    defaultFormat: "XLSX",
  },
  {
    key: "FACULTY_INTERNAL_MARKS",
    title: "Subject Internal Assessment Marks Sheet",
    category: "Faculty",
    description: "Question-wise and IAT-wise marks sheet with continuous assessment components and student exam eligibility",
    defaultFormat: "XLSX",
  },
  {
    key: "FACULTY_COURSE_MATERIAL",
    title: "Course Material Syllabus Coverage Report",
    category: "Faculty",
    description: "Unit-wise curriculum resource distribution, lecture notes, lab manuals, and student download telemetry",
    defaultFormat: "PDF",
  },
  {
    key: "FACULTY_MENTORING_LOG",
    title: "Mentee Progress & Mentoring Session Log",
    category: "Faculty",
    description: "Session records, discussion topics, student action items, and next review dates for allocated mentees",
    defaultFormat: "PDF",
  },
  {
    key: "FACULTY_RESEARCH_SUMMARY",
    title: "Faculty Research Publications Summary",
    category: "Faculty",
    description: "Scopus, Web of Science, and IEEE publications list with DOI, impact factor, and quartile metrics",
    defaultFormat: "XLSX",
  },

  // HOD Reports
  {
    key: "HOD_RESULT_ANALYSIS",
    title: "Department Comprehensive Result Analysis",
    category: "HOD",
    description: "Semester-wise and subject-wise pass percentages, faculty examiner rankings, and GPA distributions",
    defaultFormat: "XLSX",
  },
  {
    key: "HOD_MENTORING_AUDIT",
    title: "Department Mentoring Audit",
    category: "HOD",
    description: "Audit name list and sessions conducted dates across departmental faculty mentors",
    defaultFormat: "PDF",
  },
  {
    key: "HOD_COURSE_MATERIAL_STATUS",
    title: "Department Course Material",
    category: "HOD",
    description: "Audit name list, sessions conducted dates, and course materials count for each faculty",
    defaultFormat: "XLSX",
  },
  {
    key: "HOD_RESEARCH_REGISTRY",
    title: "Department Research Publications Registry",
    category: "HOD",
    description: "Audit name list, sessions conducted dates, and research publications count for each faculty",
    defaultFormat: "XLSX",
  },

  // Associate Dean Reports
  {
    key: "DEAN_COLLEGE_PERFORMANCE",
    title: "College Academic Performance & Pass % Audit",
    category: "Associate Dean",
    description: "Inter-departmental academic pass rates, distinction candidates, and evaluation compliance across the college",
    defaultFormat: "PDF",
  },
  {
    key: "DEAN_RESEARCH_MATRIX",
    title: "College Research & Publications Performance Matrix",
    category: "Associate Dean",
    description: "Scopus and Web of Science output by department, premier Q1 journal rankings, and institutional citation impact",
    defaultFormat: "XLSX",
  },
  {
    key: "DEAN_MENTORING_COMPLIANCE",
    title: "College Mentoring & Student Support Compliance",
    category: "Associate Dean",
    description: "Institutional mentoring coverage percentages and student guidance monitoring across all college departments",
    defaultFormat: "PDF",
  },

  // COE Reports
  {
    key: "COE_RESULT_GAZETTE",
    title: "Official Examination Result Gazette (Broadsheet)",
    category: "COE",
    description: "Official broadsheet result ledger with subject grades, semester GPA, cumulative CGPA, and degree classification",
    defaultFormat: "XLSX",
  },
  {
    key: "COE_GRADE_DISTRIBUTION",
    title: "Department-wise Pass % & Grade Distribution",
    category: "COE",
    description: "Statistical grade distribution (O, A+, A, B+, B, C, U) and bell-curve analysis by department",
    defaultFormat: "PDF",
  },
  {
    key: "COE_REVALUATION_CONSOLIDATED",
    title: "Revaluation & Scrutiny Consolidated Report",
    category: "COE",
    description: "Student revaluation applications, before/after marks breakdown, grade upgrades, and scrutiny outcomes",
    defaultFormat: "XLSX",
  },
  {
    key: "COE_HALL_SEATING_SUMMARY",
    title: "Examination Hall Seating & Invigilation Summary",
    category: "COE",
    description: "Hall allotment capacity, student roll rosters, invigilation duty assignments, and session timings",
    defaultFormat: "PDF",
  },

  // Chief COE Reports
  {
    key: "CHIEF_COE_UNIVERSITY_GAZETTE",
    title: "University Multi-College Consolidated Result Gazette",
    category: "Chief COE",
    description: "Tri-college consolidated gazette spanning Engineering, Nursing, and Pharmacy colleges with university rank holders",
    defaultFormat: "XLSX",
  },
  {
    key: "CHIEF_COE_INTERCOLLEGE_BENCHMARK",
    title: "Inter-College Academic & Result Benchmark Report",
    category: "Chief COE",
    description: "Institutional KPI tracking, pass rate targets, mentoring compliance, and research output comparisons",
    defaultFormat: "PDF",
  },
  {
    key: "CHIEF_COE_RESEARCH_OUTPUT",
    title: "University Comprehensive Research & Citation Output",
    category: "Chief COE",
    description: "Central university annual research compendium, Scopus/WoS metrics, and institutional NAAC/NIRF indicators",
    defaultFormat: "XLSX",
  },
  {
    key: "CHIEF_COE_GOVERNANCE_AUDIT",
    title: "University Governance & Administrative Audit Trail",
    category: "Chief COE",
    description: "System security audit log, result publication events, administrative overrides, and timestamped actions",
    defaultFormat: "PDF",
  },
];

interface ReportsDownloadCenterProps {
  roleFilter?: "Student" | "Faculty" | "HOD" | "Associate Dean" | "COE" | "Chief COE" | "ALL";
  role?: string;
  deptKey?: string;
  department?: string;
  collegeKey?: string;
  college?: string;
  onToast?: (msg: string, tone?: "success" | "warning" | "danger" | "neutral") => void;
}

function resolveUserCategory(role?: string, roleFilter?: string): "Student" | "Faculty" | "HOD" | "Associate Dean" | "COE" | "Chief COE" {
  const raw = (roleFilter || role || "").trim().toLowerCase();
  if (raw.includes("student")) return "Student";
  if (raw.includes("super") || raw.includes("chief")) return "Chief COE";
  if (raw.includes("coe") || raw.includes("admin")) return "COE";
  if (raw.includes("dean")) return "Associate Dean";
  if (raw.includes("hod")) return "HOD";
  if (raw.includes("faculty")) return "Faculty";

  try {
    const stored = localStorage.getItem("kvell_auth_user") || localStorage.getItem("kvell_admin_user") || localStorage.getItem("kvell_user");
    if (stored) {
      const u = JSON.parse(stored);
      const r = (u.role || "").toLowerCase();
      if (r.includes("student")) return "Student";
      if (r.includes("super") || r.includes("chief")) return "Chief COE";
      if (r.includes("coe") || r.includes("admin")) return "COE";
      if (r.includes("dean")) return "Associate Dean";
      if (r.includes("hod")) return "HOD";
      if (r.includes("faculty")) return "Faculty";
    }
  } catch {}

  return "Faculty";
}

export function ReportsDownloadCenter({
  roleFilter,
  role,
  deptKey = "cse",
  department,
  collegeKey = "engineering",
  college,
  onToast,
}: ReportsDownloadCenterProps) {
  const userCategory = useMemo(
    () => resolveUserCategory(role, roleFilter),
    [role, roleFilter]
  );
  const [selectedReportKey, setSelectedReportKey] = useState<string>("HOD_RESULT_ANALYSIS");
  const [reportData, setReportData] = useState<ReportDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const availableReports = useMemo(() => {
    return REPORT_CATALOG.filter((r) => {
      if (r.category !== userCategory) return false;
      if (searchQuery.trim()) {
        return (
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return true;
    });
  }, [userCategory, searchQuery]);

  const fetchReport = async (key: string) => {
    setSelectedReportKey(key);
    setLoading(true);
    try {
      const data = await reportsApi.generate(key, { deptKey, collegeKey });
      setReportData(data);
    } catch (err) {
      console.error(err);
      onToast?.("Could not generate report preview.", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const first = REPORT_CATALOG.find((r) => r.category === userCategory);
    if (first) {
      setSelectedReportKey(first.key);
      fetchReport(first.key);
    }
  }, [userCategory, deptKey, collegeKey]);

  // Download Handlers
  const handleDownloadExcel = async () => {
    if (!reportData) return;
    try {
      const ws = XLSX.utils.json_to_sheet(reportData.rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");

      const fileName = `${reportData.reportKey}_${new Date().toISOString().split("T")[0]}.xlsx`;
      downloadWorkbook(wb, fileName);

      await reportsApi.logDownload({
        reportType: reportData.reportKey,
        fileFormat: "XLSX",
        filtersApplied: `Dept: ${deptKey}, College: ${collegeKey}`,
      });

      onToast?.(`Downloaded ${reportData.title} as Excel (.xlsx)`, "success");
    } catch (err) {
      console.error(err);
      onToast?.("Excel generation failed.", "danger");
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header Banner
      doc.setFillColor(11, 25, 44); // #0B192C
      doc.rect(0, 0, pageWidth, 62, "F");

      // Gold Accent Band
      doc.setFillColor(212, 167, 44); // #D4A72C
      doc.rect(0, 62, pageWidth, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(212, 167, 44); // #D4A72C
      doc.text("KVELL UNIVERSITY", 40, 26);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("Karpaga Vinayaga Educational Lore for Learning (Deemed-to-be-University)", 40, 42);

      doc.setFontSize(8.5);
      doc.setTextColor(200, 200, 200);
      const dateText = `Official Document · Generated on ${new Date().toLocaleDateString("en-IN")}`;
      doc.text(dateText, pageWidth - 40, 42, { align: "right" });

      // Report Title
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(reportData.title, 40, 88);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(reportData.subtitle, 40, 102);

      let tableStartY = 115;

      // Optional Summary Stats Strip
      if (reportData.summaryStats && Object.keys(reportData.summaryStats).length > 0) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(40, 108, pageWidth - 80, 24, 4, 4, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(40, 108, pageWidth - 80, 24, 4, 4, "S");

        let statX = 50;
        doc.setFontSize(8);
        Object.entries(reportData.summaryStats).forEach(([label, val]) => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(71, 85, 105);
          doc.text(`${label}: `, statX, 123);
          const lblWidth = doc.getTextWidth(`${label}: `);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(String(val), statX + lblWidth, 123);
          statX += lblWidth + doc.getTextWidth(String(val)) + 20;
        });

        tableStartY = 140;
      }

      // Table
      const headers = [reportData.columns];
      const body = reportData.rows.map((row) => reportData.columns.map((col) => String(row[col] ?? "")));

      const colCount = reportData.columns.length;
      const fontSize = colCount > 10 ? 6.5 : colCount > 7 ? 7.5 : 8.5;
      const cellPadding = colCount > 10 ? 2.5 : 3.5;

      // Safe multi-strategy autoTable invoker
      const applyTable = (targetDoc: any, options: any) => {
        if (typeof autoTable === "function") {
          autoTable(targetDoc, options);
        } else if (typeof (autoTable as any)?.default === "function") {
          (autoTable as any).default(targetDoc, options);
        } else if (typeof (targetDoc as any).autoTable === "function") {
          (targetDoc as any).autoTable(options);
        } else {
          // Manual tabular drawing fallback
          let curY = options.startY || 125;
          targetDoc.setFontSize(fontSize);
          targetDoc.setFont("helvetica", "bold");
          targetDoc.setTextColor(11, 25, 44);
          const colW = (pageWidth - 80) / colCount;
          reportData.columns.forEach((col, idx) => {
            targetDoc.text(String(col).substring(0, 18), 40 + idx * colW, curY);
          });
          curY += 12;
          targetDoc.setFont("helvetica", "normal");
          targetDoc.setTextColor(30, 41, 59);
          body.forEach((r) => {
            r.forEach((val, idx) => {
              targetDoc.text(String(val).substring(0, 18), 40 + idx * colW, curY);
            });
            curY += 11;
            if (curY > pageHeight - 35) {
              targetDoc.addPage();
              curY = 40;
            }
          });
        }
      };

      applyTable(doc, {
        head: headers,
        body: body,
        startY: tableStartY,
        theme: "striped",
        margin: { left: 40, right: 40, bottom: 35 },
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          textColor: [30, 41, 59],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [11, 25, 44],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: fontSize,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // Footer
      const totalPages = typeof doc.getNumberOfPages === "function"
        ? doc.getNumberOfPages()
        : (doc as any).internal?.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1;

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(40, pageHeight - 24, pageWidth - 40, pageHeight - 24);
        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 140);
        doc.text(
          `Page ${i} of ${totalPages} · Digitally certified by KVELL University ERP Examination Directorate`,
          40,
          pageHeight - 12
        );
        doc.text(
          `Ref: ${reportData.reportKey}`,
          pageWidth - 40,
          pageHeight - 12,
          { align: "right" }
        );
      }

      const fileName = `${reportData.reportKey}_${new Date().toISOString().split("T")[0]}.pdf`;

      // Resilient download triggering
      try {
        const blob = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 1500);
      } catch {
        doc.save(fileName);
      }

      try {
        await reportsApi.logDownload({
          reportType: reportData.reportKey,
          fileFormat: "PDF",
          filtersApplied: `Dept: ${deptKey}, College: ${collegeKey}`,
        });
      } catch (logErr) {
        console.warn("Could not log report download audit:", logErr);
      }

      onToast?.(`Downloaded ${reportData.title} as PDF document`, "success");
    } catch (err) {
      console.error(err);
      onToast?.("PDF generation failed.", "danger");
    }
  };

  const handleDownloadCsv = async () => {
    if (!reportData) return;
    try {
      const csvHeader = reportData.columns.join(",");
      const csvRows = reportData.rows.map((r) =>
        reportData.columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
      );
      const csvContent = [csvHeader, ...csvRows].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportData.reportKey}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await reportsApi.logDownload({
        reportType: reportData.reportKey,
        fileFormat: "CSV",
        filtersApplied: `Dept: ${deptKey}, College: ${collegeKey}`,
      });

      onToast?.(`Downloaded ${reportData.title} as CSV`, "success");
    } catch {
      onToast?.("CSV export failed.", "danger");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {userCategory} Reports &amp; Analytics Download Center
          </h2>
          <p className="text-xs text-slate-500">
            Official formatted reports and institutional audit broadsheets authorized for {userCategory} role.
          </p>
        </div>
      </div>

      {/* Role-Restricted Report Scope Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-black shrink-0 shadow-xs">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-black uppercase bg-[#0B192C] text-[#D4A72C] px-2.5 py-0.5 rounded-full border border-[#D4A72C]/40">
                {userCategory} Workspace
              </span>
              <span className="text-xs font-bold text-slate-800">
                Authorized Official Reports ({availableReports.length} Available)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Role-restricted official analytics &amp; export sheets for {userCategory} · {department || college || "KVELL University"}
            </p>
          </div>
        </div>

        {/* Quick Search inside this user's reports */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${userCategory} reports...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-[#F8F5EE]/60 focus:bg-white focus:outline-none focus:border-[#D4A72C]"
          />
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {availableReports.map((r: ReportCatalogItem) => {
          const isSelected = selectedReportKey === r.key;
          return (
            <div
              key={r.key}
              onClick={() => fetchReport(r.key)}
              className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                isSelected
                  ? "border-[#0B192C] bg-[#0B192C] text-white shadow-md"
                  : "border-slate-200 bg-white hover:border-[#D4A72C] text-slate-800 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? "bg-[#D4A72C] text-[#0B192C]" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {r.category}
                  </span>
                  {isSelected && <CheckCircle2 size={16} className="text-[#D4A72C]" />}
                </div>
                <h4 className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-slate-900"}`}>
                  {r.title}
                </h4>
                <p className={`text-[11px] mt-1.5 line-clamp-2 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {r.description}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-semibold">
                <span className={isSelected ? "text-[#D4A72C]" : "text-slate-400"}>Click to preview</span>
                <span className="uppercase">{r.defaultFormat}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Report Preview & Actions */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B192C] border-t-transparent mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Compiling report data...</p>
        </div>
      ) : reportData ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          {/* Header & Download Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#0B192C] text-[#D4A72C] text-[10px] font-mono font-bold px-2 py-0.5">
                  {reportData.reportKey}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {reportData.rows.length} rows compiled
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{reportData.title}</h3>
              <p className="text-xs text-slate-500">{reportData.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <FileSpreadsheet size={15} />
                Download Excel (.xlsx)
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 bg-[#0B192C] hover:bg-[#1E3E62] text-[#D4A72C] font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
              >
                <FileText size={15} />
                Download PDF
              </button>
              <button
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition"
              >
                <Download size={14} />
                CSV
              </button>
            </div>
          </div>

          {/* Summary Metric Badges */}
          {reportData.summaryStats && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(reportData.summaryStats).map(([key, val]) => (
                <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{key}</span>
                  <span className="font-bold text-slate-800 text-sm">{String(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Data Preview Table */}
          <div className="overflow-x-auto max-h-[420px] rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white text-[11px] font-bold uppercase sticky top-0">
                <tr>
                  {reportData.columns.map((col) => (
                    <th key={col} className="py-3 px-4 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    {reportData.columns.map((col) => (
                      <td key={col} className="py-3 px-4 whitespace-nowrap text-slate-700">
                        {String(row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

