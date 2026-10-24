import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Building2,
  BookOpen,
  TrendingUp,
  FileText,
  Layers,
  Award,
  Filter,
  Search,
  Download,
  Printer,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Scale,
  Sparkles,
  Compass,
  GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

export type AssessmentSubComponent = "IAT-1" | "IAT-2" | "END-SEM" | "REVALUATION";

export interface AnalyticsSubject {
  code: string;
  title: string;
  type: "COMMON" | "CORE";
  department: string;
  deptKey: string;
  semester: string;
  academicYear: string;
  credits: number;
  totalStudents: number;
}

// Master list of curriculum subjects covering Common and Core
export const ANALYTICS_SUBJECTS_CATALOG: AnalyticsSubject[] = [
  // 1. Common Subjects (Common for all departments)
  {
    code: "MA26C01T",
    title: "Matrices and Calculus",
    type: "COMMON",
    department: "All Engineering Departments",
    deptKey: "all",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 216,
  },
  {
    code: "PH26C01I",
    title: "Engineering Physics",
    type: "COMMON",
    department: "All Engineering Departments",
    deptKey: "all",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 196,
  },
  {
    code: "EN26C01T",
    title: "Professional English & Communication",
    type: "COMMON",
    department: "All Engineering Departments",
    deptKey: "all",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 3,
    totalStudents: 216,
  },
  {
    code: "CS26C01I",
    title: "Problem Solving and Python Programming",
    type: "COMMON",
    department: "All Engineering Departments",
    deptKey: "all",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 3,
    totalStudents: 216,
  },
  {
    code: "CY26C01I",
    title: "Engineering Chemistry",
    type: "COMMON",
    department: "All Engineering Departments",
    deptKey: "all",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 180,
  },

  // 2. Core Departmental Subjects
  {
    code: "AI602",
    title: "Deep Learning & Neural Architectures",
    type: "CORE",
    department: "Artificial Intelligence & Data Science",
    deptKey: "aids",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 50,
  },
  {
    code: "CS601",
    title: "Data Structures & Algorithms",
    type: "CORE",
    department: "Computer Science & Engineering",
    deptKey: "cse",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 20,
  },
  {
    code: "BM603",
    title: "Biomedical Instrumentation & Sensors",
    type: "CORE",
    department: "Biomedical Engineering",
    deptKey: "bme",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 28,
  },
  {
    code: "BT601",
    title: "Molecular Biology & Genetic Engineering",
    type: "CORE",
    department: "Biotechnology",
    deptKey: "biotech",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 25,
  },
  {
    code: "EC604",
    title: "Digital Signal Processing & VLSI Design",
    type: "CORE",
    department: "Electronics & Communication Engineering",
    deptKey: "ece",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 35,
  },
  {
    code: "ME602",
    title: "Thermodynamics & Heat Transfer",
    type: "CORE",
    department: "Mechanical Engineering",
    deptKey: "mech",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 48,
  },
  {
    code: "MC26102T",
    title: "Advanced Data Structures & Algorithms",
    type: "CORE",
    department: "Master of Computer Applications (MCA)",
    deptKey: "mca",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 4,
    totalStudents: 40,
  },
  {
    code: "MB26108T",
    title: "Operations Management",
    type: "CORE",
    department: "Master of Business Administration (MBA)",
    deptKey: "mba",
    semester: "Semester I",
    academicYear: "2026-2027",
    credits: 3,
    totalStudents: 45,
  },
];

// Department dataset for Common subjects across the 4 assessment components
const ALL_DEPARTMENTS_DATA: Record<
  AssessmentSubComponent,
  {
    deptCode: string;
    deptName: string;
    mean: number;
    std: number;
    variance: number;
    spreadLower: number;
    spreadUpper: number;
    sampleSize: number;
    passRate: number;
    consistencyRating: "High" | "Good" | "Moderate" | "Watchlist";
  }[]
> = {
  "IAT-1": [
    { deptCode: "ADS", deptName: "AI & Data Science", mean: 68.4, std: 6.8, variance: 46.2, spreadLower: 61.6, spreadUpper: 75.2, sampleSize: 50, passRate: 94.0, consistencyRating: "High" },
    { deptCode: "CSE", deptName: "Computer Science", mean: 71.2, std: 7.4, variance: 54.8, spreadLower: 63.8, spreadUpper: 78.6, sampleSize: 20, passRate: 95.0, consistencyRating: "High" },
    { deptCode: "BME", deptName: "Biomedical Engg", mean: 64.8, std: 6.1, variance: 37.2, spreadLower: 58.7, spreadUpper: 70.9, sampleSize: 28, passRate: 92.8, consistencyRating: "High" },
    { deptCode: "Biotech", deptName: "Biotechnology", mean: 62.0, std: 8.9, variance: 79.2, spreadLower: 53.1, spreadUpper: 70.9, sampleSize: 25, passRate: 96.0, consistencyRating: "Good" },
    { deptCode: "ECE", deptName: "Electronics & Comm", mean: 66.5, std: 5.4, variance: 29.1, spreadLower: 61.1, spreadUpper: 71.9, sampleSize: 35, passRate: 91.4, consistencyRating: "High" },
    { deptCode: "MECH", deptName: "Mechanical Engg", mean: 59.8, std: 11.2, variance: 125.4, spreadLower: 48.6, spreadUpper: 71.0, sampleSize: 48, passRate: 89.6, consistencyRating: "Moderate" },
    { deptCode: "IT", deptName: "Information Tech", mean: 67.0, std: 6.5, variance: 42.3, spreadLower: 60.5, spreadUpper: 73.5, sampleSize: 10, passRate: 90.0, consistencyRating: "High" },
  ],
  "IAT-2": [
    { deptCode: "ADS", deptName: "AI & Data Science", mean: 72.1, std: 6.2, variance: 38.4, spreadLower: 65.9, spreadUpper: 78.3, sampleSize: 50, passRate: 96.0, consistencyRating: "High" },
    { deptCode: "CSE", deptName: "Computer Science", mean: 74.5, std: 6.9, variance: 47.6, spreadLower: 67.6, spreadUpper: 81.4, sampleSize: 20, passRate: 100.0, consistencyRating: "High" },
    { deptCode: "BME", deptName: "Biomedical Engg", mean: 67.4, std: 5.8, variance: 33.6, spreadLower: 61.6, spreadUpper: 73.2, sampleSize: 28, passRate: 96.4, consistencyRating: "High" },
    { deptCode: "Biotech", deptName: "Biotechnology", mean: 65.8, std: 8.1, variance: 65.6, spreadLower: 57.7, spreadUpper: 73.9, sampleSize: 25, passRate: 96.0, consistencyRating: "Good" },
    { deptCode: "ECE", deptName: "Electronics & Comm", mean: 69.2, std: 5.1, variance: 26.0, spreadLower: 64.1, spreadUpper: 74.3, sampleSize: 35, passRate: 94.2, consistencyRating: "High" },
    { deptCode: "MECH", deptName: "Mechanical Engg", mean: 63.4, std: 9.8, variance: 96.0, spreadLower: 53.6, spreadUpper: 73.2, sampleSize: 48, passRate: 91.6, consistencyRating: "Good" },
    { deptCode: "IT", deptName: "Information Tech", mean: 70.3, std: 6.0, variance: 36.0, spreadLower: 64.3, spreadUpper: 76.3, sampleSize: 10, passRate: 100.0, consistencyRating: "High" },
  ],
  "END-SEM": [
    { deptCode: "ADS", deptName: "AI & Data Science", mean: 70.6, std: 7.1, variance: 50.4, spreadLower: 63.5, spreadUpper: 77.7, sampleSize: 50, passRate: 94.0, consistencyRating: "High" },
    { deptCode: "CSE", deptName: "Computer Science", mean: 73.8, std: 7.8, variance: 60.8, spreadLower: 66.0, spreadUpper: 81.6, sampleSize: 20, passRate: 95.0, consistencyRating: "High" },
    { deptCode: "BME", deptName: "Biomedical Engg", mean: 66.2, std: 6.5, variance: 42.3, spreadLower: 59.7, spreadUpper: 72.7, sampleSize: 28, passRate: 92.8, consistencyRating: "High" },
    { deptCode: "Biotech", deptName: "Biotechnology", mean: 64.5, std: 9.2, variance: 84.6, spreadLower: 55.3, spreadUpper: 73.7, sampleSize: 25, passRate: 96.0, consistencyRating: "Good" },
    { deptCode: "ECE", deptName: "Electronics & Comm", mean: 68.0, std: 5.9, variance: 34.8, spreadLower: 62.1, spreadUpper: 73.9, sampleSize: 35, passRate: 91.4, consistencyRating: "High" },
    { deptCode: "MECH", deptName: "Mechanical Engg", mean: 61.9, std: 12.4, variance: 153.8, spreadLower: 49.5, spreadUpper: 74.3, sampleSize: 48, passRate: 89.6, consistencyRating: "Watchlist" },
    { deptCode: "IT", deptName: "Information Tech", mean: 68.8, std: 6.8, variance: 46.2, spreadLower: 62.0, spreadUpper: 75.6, sampleSize: 10, passRate: 90.0, consistencyRating: "High" },
  ],
  "REVALUATION": [
    { deptCode: "ADS", deptName: "AI & Data Science", mean: 59.0, std: 7.2, variance: 51.8, spreadLower: 51.8, spreadUpper: 66.2, sampleSize: 12, passRate: 83.3, consistencyRating: "High" },
    { deptCode: "CSE", deptName: "Computer Science", mean: 65.0, std: 8.5, variance: 72.3, spreadLower: 56.5, spreadUpper: 73.5, sampleSize: 7, passRate: 85.7, consistencyRating: "Good" },
    { deptCode: "BME", deptName: "Biomedical Engg", mean: 67.0, std: 6.8, variance: 46.2, spreadLower: 60.2, spreadUpper: 73.8, sampleSize: 8, passRate: 87.5, consistencyRating: "High" },
    { deptCode: "Biotech", deptName: "Biotechnology", mean: 55.0, std: 10.2, variance: 104.0, spreadLower: 44.8, spreadUpper: 65.2, sampleSize: 6, passRate: 66.7, consistencyRating: "Moderate" },
    { deptCode: "ECE", deptName: "Electronics & Comm", mean: 60.0, std: 5.8, variance: 33.6, spreadLower: 54.2, spreadUpper: 65.8, sampleSize: 9, passRate: 77.8, consistencyRating: "High" },
    { deptCode: "MECH", deptName: "Mechanical Engg", mean: 57.0, std: 16.4, variance: 269.0, spreadLower: 40.6, spreadUpper: 73.4, sampleSize: 14, passRate: 64.3, consistencyRating: "Watchlist" },
    { deptCode: "IT", deptName: "Information Tech", mean: 62.0, std: 7.0, variance: 49.0, spreadLower: 55.0, spreadUpper: 69.0, sampleSize: 4, passRate: 75.0, consistencyRating: "High" },
  ],
};

// Cohort dataset for Core subjects across the 4 assessment components
const CORE_COHORT_TEMPLATES: Record<
  AssessmentSubComponent,
  {
    group: string;
    description: string;
    meanDelta: number; // offset from subject base mean
    stdDelta: number;
    samplePct: number;
  }[]
> = {
  "IAT-1": [
    { group: "Section A (Batch 1)", description: "Students Reg 01-25", meanDelta: +3.2, stdDelta: 5.4, samplePct: 0.5 },
    { group: "Section B (Batch 2)", description: "Students Reg 26-50", meanDelta: -2.1, stdDelta: 7.2, samplePct: 0.5 },
    { group: "Hosteller Cohort", description: "Campus Resident Students", meanDelta: +1.8, stdDelta: 6.1, samplePct: 0.4 },
    { group: "Day Scholar Cohort", description: "Commuter Students", meanDelta: -0.9, stdDelta: 6.8, samplePct: 0.6 },
    { group: "Distinction Band [>75M]", description: "Upper Quartile Performers", meanDelta: +14.5, stdDelta: 3.2, samplePct: 0.35 },
    { group: "Median Band [50-75M]", description: "Core Average Cohort", meanDelta: -1.2, stdDelta: 4.8, samplePct: 0.55 },
    { group: "Remedial Band [<50M]", description: "Identified for Bridge Coaching", meanDelta: -19.4, stdDelta: 4.1, samplePct: 0.1 },
  ],
  "IAT-2": [
    { group: "Section A (Batch 1)", description: "Students Reg 01-25", meanDelta: +4.8, stdDelta: 4.9, samplePct: 0.5 },
    { group: "Section B (Batch 2)", description: "Students Reg 26-50", meanDelta: +0.2, stdDelta: 6.3, samplePct: 0.5 },
    { group: "Hosteller Cohort", description: "Campus Resident Students", meanDelta: +3.0, stdDelta: 5.4, samplePct: 0.4 },
    { group: "Day Scholar Cohort", description: "Commuter Students", meanDelta: +1.2, stdDelta: 5.9, samplePct: 0.6 },
    { group: "Distinction Band [>75M]", description: "Upper Quartile Performers", meanDelta: +15.8, stdDelta: 2.8, samplePct: 0.42 },
    { group: "Median Band [50-75M]", description: "Core Average Cohort", meanDelta: +0.4, stdDelta: 4.2, samplePct: 0.52 },
    { group: "Remedial Band [<50M]", description: "Identified for Bridge Coaching", meanDelta: -16.2, stdDelta: 3.6, samplePct: 0.06 },
  ],
  "END-SEM": [
    { group: "Section A (Batch 1)", description: "Students Reg 01-25", meanDelta: +3.6, stdDelta: 6.2, samplePct: 0.5 },
    { group: "Section B (Batch 2)", description: "Students Reg 26-50", meanDelta: -1.4, stdDelta: 7.9, samplePct: 0.5 },
    { group: "Hosteller Cohort", description: "Campus Resident Students", meanDelta: +2.4, stdDelta: 6.5, samplePct: 0.4 },
    { group: "Day Scholar Cohort", description: "Commuter Students", meanDelta: -0.4, stdDelta: 7.3, samplePct: 0.6 },
    { group: "Distinction Band [>75M]", description: "Upper Quartile Performers", meanDelta: +15.2, stdDelta: 3.4, samplePct: 0.38 },
    { group: "Median Band [50-75M]", description: "Core Average Cohort", meanDelta: -0.8, stdDelta: 5.1, samplePct: 0.54 },
    { group: "Remedial Band [<50M]", description: "Autonomous Arrear Review", meanDelta: -18.0, stdDelta: 4.5, samplePct: 0.08 },
  ],
  "REVALUATION": [
    { group: "Section A (Batch 1)", description: "Revaluation Applicants Batch 1", meanDelta: +2.1, stdDelta: 7.4, samplePct: 0.5 },
    { group: "Section B (Batch 2)", description: "Revaluation Applicants Batch 2", meanDelta: -1.0, stdDelta: 8.6, samplePct: 0.5 },
    { group: "Part A Discrepancy", description: "Analytical Questions 1-10", meanDelta: +4.2, stdDelta: 5.2, samplePct: 0.3 },
    { group: "Part B Discrepancy", description: "Descriptive Rubrics 11-15", meanDelta: +1.5, stdDelta: 9.1, samplePct: 0.7 },
    { group: "Grade Escalated", description: "Passed with Upgraded Grade", meanDelta: +8.4, stdDelta: 4.3, samplePct: 0.6 },
    { group: "Grade Retained", description: "No Grade Modification", meanDelta: -0.4, stdDelta: 3.8, samplePct: 0.4 },
  ],
};

export interface AnalyticsViewProps {
  onToast?: (msg: string) => void;
  activeSubComponent?: AssessmentSubComponent;
  onSubComponentChange?: (sub: AssessmentSubComponent) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onToast,
  activeSubComponent: controlledSubComponent,
  onSubComponentChange,
}) => {
  // State: selected subject
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>("MA26C01T");

  // State: active assessment sub-component (controlled from sidebar or internal)
  const [internalSubComponent, setInternalSubComponent] = useState<AssessmentSubComponent>("END-SEM");
  const activeSubComponent = controlledSubComponent ?? internalSubComponent;

  const setActiveSubComponent = (sub: AssessmentSubComponent) => {
    setInternalSubComponent(sub);
    if (onSubComponentChange) {
      onSubComponentChange(sub);
    }
  };

  // State: subject filter / search
  const [subjectFilterType, setSubjectFilterType] = useState<"ALL" | "COMMON" | "CORE">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Notify helper
  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  // Find currently active subject object
  const currentSubject = useMemo(() => {
    return (
      ANALYTICS_SUBJECTS_CATALOG.find((s) => s.code === selectedSubjectCode) ||
      ANALYTICS_SUBJECTS_CATALOG[0]
    );
  }, [selectedSubjectCode]);

  // Filtered subjects list for dropdown
  const filteredCatalog = useMemo(() => {
    return ANALYTICS_SUBJECTS_CATALOG.filter((sub) => {
      const matchType = subjectFilterType === "ALL" || sub.type === subjectFilterType;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        sub.code.toLowerCase().includes(q) ||
        sub.title.toLowerCase().includes(q) ||
        sub.department.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [subjectFilterType, searchQuery]);

  // Is current subject Common for all departments?
  const isCommonSubject = currentSubject.type === "COMMON";

  // Compute graph & table dataset
  const activeDataset = useMemo(() => {
    if (isCommonSubject) {
      // Return All Departments comparative data for the selected assessment sub-component
      const deptList = ALL_DEPARTMENTS_DATA[activeSubComponent];
      return deptList.map((d) => ({
        name: d.deptCode,
        fullName: d.deptName,
        department: d.deptName,
        mean: d.mean,
        std: d.std,
        variance: d.variance,
        spreadLower: d.spreadLower,
        spreadUpper: d.spreadUpper,
        sampleSize: d.sampleSize,
        passRate: d.passRate,
        consistencyRating: d.consistencyRating,
        isEscalated: d.std > 8.5,
      }));
    } else {
      // Core Subject: Generate Departmental Cohort Distribution for this specific department
      const templates = CORE_COHORT_TEMPLATES[activeSubComponent];
      // Department base average based on department
      let baseMean = 68.0;
      if (currentSubject.deptKey === "cse") baseMean = 73.0;
      if (currentSubject.deptKey === "bme") baseMean = 67.0;
      if (currentSubject.deptKey === "biotech") baseMean = 65.0;
      if (currentSubject.deptKey === "mech") baseMean = 62.0;
      if (currentSubject.deptKey === "ece") baseMean = 69.0;

      // Adjust based on active subcomponent
      if (activeSubComponent === "IAT-1") baseMean -= 2.0;
      if (activeSubComponent === "IAT-2") baseMean += 2.5;
      if (activeSubComponent === "REVALUATION") baseMean -= 8.0;

      return templates.map((t) => {
        const mean = Math.min(96, Math.max(35, parseFloat((baseMean + t.meanDelta).toFixed(1))));
        const std = parseFloat(t.stdDelta.toFixed(1));
        const variance = parseFloat((std * std).toFixed(1));
        const spreadLower = Math.max(0, parseFloat((mean - std).toFixed(1)));
        const spreadUpper = Math.min(100, parseFloat((mean + std).toFixed(1)));
        const sampleSize = Math.max(
          4,
          Math.round(currentSubject.totalStudents * t.samplePct)
        );
        const passRate = mean >= 50 ? Math.min(100, Math.round(75 + (mean - 50) * 0.5)) : 45;
        const consistencyRating: "High" | "Good" | "Moderate" | "Watchlist" =
          std <= 5.5 ? "High" : std <= 8.5 ? "Good" : std <= 11 ? "Moderate" : "Watchlist";

        return {
          name: t.group,
          fullName: `${currentSubject.department} — ${t.group}`,
          department: currentSubject.department,
          description: t.description,
          mean,
          std,
          variance,
          spreadLower,
          spreadUpper,
          sampleSize,
          passRate,
          consistencyRating,
          isEscalated: std > 8.5,
        };
      });
    }
  }, [isCommonSubject, currentSubject, activeSubComponent]);

  // Summary Metrics for the active view
  const summaryMetrics = useMemo(() => {
    if (!activeDataset.length) {
      return { overallMean: 0, overallStd: 0, totalCohort: 0, passPct: 0, highConsistencyCount: 0 };
    }
    const totalCohort = activeDataset.reduce((acc, curr) => acc + curr.sampleSize, 0);
    const weightedMean =
      activeDataset.reduce((acc, curr) => acc + curr.mean * curr.sampleSize, 0) / (totalCohort || 1);
    const avgStd =
      activeDataset.reduce((acc, curr) => acc + curr.std * curr.sampleSize, 0) / (totalCohort || 1);
    const avgPass =
      activeDataset.reduce((acc, curr) => acc + curr.passRate * curr.sampleSize, 0) / (totalCohort || 1);
    const highConsistencyCount = activeDataset.filter((d) => d.std <= 8.5).length;

    return {
      overallMean: parseFloat(weightedMean.toFixed(1)),
      overallStd: parseFloat(avgStd.toFixed(1)),
      totalCohort,
      passPct: parseFloat(avgPass.toFixed(1)),
      highConsistencyCount,
    };
  }, [activeDataset]);

  // Export to Excel
  const handleExportExcel = () => {
    const wsData = [
      ["KARPAGA VINAYAGA COLLEGE OF ENGINEERING AND TECHNOLOGY"],
      ["OFFICE OF THE DEAN OF ACADEMICS · ASSESSMENT PERFORMANCE ANALYTICS"],
      [],
      ["Subject Code:", currentSubject.code, "Subject Title:", currentSubject.title],
      ["Subject Type:", currentSubject.type, "Academic Department:", currentSubject.department],
      ["Semester / AY:", `${currentSubject.semester} · ${currentSubject.academicYear}`, "Active Assessment:", activeSubComponent],
      [],
      [
        isCommonSubject ? "Department" : "Cohort Section",
        "Cohort Sample (N)",
        "Mean Marks (μ)",
        "Pass Rate (%)",
      ],
      ...activeDataset.map((row) => [
        row.name,
        row.sampleSize,
        row.mean,
        `${row.passRate}%`,
      ]),
      [],
      ["Institutional Summary"],
      ["Weighted Mean (μ):", summaryMetrics.overallMean],
      ["Total Evaluated Cohort:", summaryMetrics.totalCohort],
      ["Autonomous Pass Percentage:", `${summaryMetrics.passPct}%`],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${currentSubject.code}_${activeSubComponent}`);
    XLSX.writeFile(
      wb,
      `Dean_Analytics_${currentSubject.code}_${activeSubComponent}_Report.xlsx`
    );
    notify(`Exported ${currentSubject.code} (${activeSubComponent}) Analytics to Excel!`);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & SUBJECT SELECTOR (DEAN CHOOSES SUBJECT FIRST) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                OFFICE OF THE DEAN OF ACADEMICS &bull; ASSESSMENT ANALYTICS
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#0B192C] text-[#D4A72C]">
                DUAL-AXIS STATS ENGINE
              </span>
            </div>
            <h1 className="font-display font-black text-2xl text-[#0B192C] mt-1 flex items-center gap-2.5">
              <BarChart3 className="text-[#D4A72C]" size={26} />
              Dean Academic Performance Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl leading-relaxed">
              Dean first selects any curriculum subject. <strong>Common subjects</strong> display unified comparative graphs across all departments. <strong>Core papers</strong> show focused analysis for their departmental cohorts across <strong>IAT-1</strong>, <strong>IAT-2</strong>, <strong>END-SEM</strong>, and <strong>REVALUATION</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download size={14} /> Export Sheet
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 text-[#0B192C] border border-gray-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer size={14} /> Print Audit
            </button>
          </div>
        </div>

        {/* STEP 1: SUBJECT SELECTOR CONTROL PANEL */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border-2 border-[#D4A72C]/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[#0B192C]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#0B192C]">
                SELECT CURRICULUM SUBJECT (STEP 1):
              </span>
            </div>

            {/* Quick Filter: All vs Common vs Core */}
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setSubjectFilterType("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  subjectFilterType === "ALL"
                    ? "bg-[#0B192C] text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({ANALYTICS_SUBJECTS_CATALOG.length})
              </button>
              <button
                type="button"
                onClick={() => setSubjectFilterType("COMMON")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  subjectFilterType === "COMMON"
                    ? "bg-blue-900 text-white"
                    : "text-blue-900 hover:bg-blue-50"
                }`}
              >
                <Building2 size={12} /> Common Subjects
              </button>
              <button
                type="button"
                onClick={() => setSubjectFilterType("CORE")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  subjectFilterType === "CORE"
                    ? "bg-emerald-800 text-white"
                    : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                <GraduationCap size={12} /> Core Dept Papers
              </button>
            </div>
          </div>

          {/* Main Dropdown & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <select
                id="dean-analytics-subject-select"
                value={selectedSubjectCode}
                onChange={(e) => {
                  setSelectedSubjectCode(e.target.value);
                  const sub = ANALYTICS_SUBJECTS_CATALOG.find((s) => s.code === e.target.value);
                  if (sub) {
                    notify(`Loaded analytics for ${sub.code} (${sub.type} - ${sub.title})`);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#D4A72C] font-bold text-sm text-[#0B192C] focus:ring-2 focus:ring-[#0B192C] focus:outline-none bg-white cursor-pointer shadow-xs"
              >
                {filteredCatalog.map((sub) => (
                  <option key={sub.code} value={sub.code}>
                    {sub.code} — {sub.title} [{sub.type === "COMMON" ? "COMMON (ALL DEPTS)" : `CORE (${sub.department})`}]
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject code, title..."
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-300 font-medium text-xs text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white"
              />
            </div>
          </div>

          {/* Dynamic Subject Classification Banner */}
          <div className="pt-2">
            {isCommonSubject ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900 to-[#0B192C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#D4A72C] shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#EAB308] text-[#0B192C]">
                        COMMON SUBJECT FOR ALL DEPARTMENTS
                      </span>
                      <span className="font-mono text-xs text-blue-200">{currentSubject.code}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5">
                      <strong>Multi-Department Comparative Analysis:</strong> Displaying all-department analytical graph comparing <strong>AI&amp;DS, CSE, BME, Biotech, ECE, MECH, and IT</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-right sm:shrink-0 font-mono text-xs">
                  <span className="text-blue-200 block text-[10px] uppercase font-bold">Total Cohort</span>
                  <span className="text-white font-black text-sm">{currentSubject.totalStudents} Candidates</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-900 to-[#0B192C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-400 text-emerald-950">
                        CORE DEPARTMENTAL PAPER
                      </span>
                      <span className="font-mono text-xs text-emerald-200">{currentSubject.code}</span>
                    </div>
                    <p className="text-xs text-slate-200 mt-0.5">
                      <strong>Departmental Cohort Analysis:</strong> Displaying focused analytical graph for <strong>{currentSubject.department}</strong> academic sections and student performance bands.
                    </p>
                  </div>
                </div>
                <div className="text-right sm:shrink-0 font-mono text-xs">
                  <span className="text-emerald-200 block text-[10px] uppercase font-bold">Enrolled Cohort</span>
                  <span className="text-white font-black text-sm">{currentSubject.totalStudents} Students</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: ACTIVE ASSESSMENT SUB-COMPONENT STATUS (CONTROLLED VIA SIDEBAR) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-sm ${
                activeSubComponent === "IAT-1"
                  ? "bg-blue-600 text-white"
                  : activeSubComponent === "IAT-2"
                  ? "bg-indigo-600 text-white"
                  : activeSubComponent === "END-SEM"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-red-600 text-white"
              }`}
            >
              <span className="text-[9px] uppercase tracking-tighter opacity-80">SUB</span>
              <span className="text-base leading-none">
                {activeSubComponent === "IAT-1"
                  ? "1"
                  : activeSubComponent === "IAT-2"
                  ? "2"
                  : activeSubComponent === "END-SEM"
                  ? "3"
                  : "4"}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Active Assessment Sub-Component (Sidebar):
                </span>
                <span className="font-display font-black text-xl text-[#0B192C]">
                  {activeSubComponent}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    activeSubComponent === "IAT-1"
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : activeSubComponent === "IAT-2"
                      ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                      : activeSubComponent === "END-SEM"
                      ? "bg-amber-50 text-amber-900 border border-amber-300"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {activeSubComponent === "IAT-1" && "Units I & II · Formative"}
                  {activeSubComponent === "IAT-2" && "Units III & IV · Mid-Term"}
                  {activeSubComponent === "END-SEM" && "100 Marks (A+B) · Autonomous Final Exam"}
                  {activeSubComponent === "REVALUATION" && "\u0394 Shift \u2022 3rd Val · Marking Variance"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeSubComponent === "IAT-1" &&
                  "Continuous Internal Assessment Test 1 evaluating foundational conceptual units I & II formative benchmark performance."}
                {activeSubComponent === "IAT-2" &&
                  "Continuous Internal Assessment Test 2 evaluating applied engineering units III & IV mid-term cumulative performance."}
                {activeSubComponent === "END-SEM" &&
                  "End-Semester Summative Final Examination (Part A + Part B 100 Marks scaled to autonomous valuation standards)."}
                {activeSubComponent === "REVALUATION" &&
                  "Revaluation procedural variance and mark delta shifts analyzing second & third valuation escalations."}
              </p>
            </div>
          </div>

          {/* Quick Sub-Component Selector Badges */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-center shrink-0">
            {(
              [
                { key: "IAT-1", label: "IAT-1", sub: "Sub 1" },
                { key: "IAT-2", label: "IAT-2", sub: "Sub 2" },
                { key: "END-SEM", label: "END-SEM", sub: "Sub 3" },
                { key: "REVALUATION", label: "REVAL", sub: "Sub 4" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveSubComponent(item.key as AssessmentSubComponent);
                  notify(`Switched to ${item.key} Sub-Component`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  activeSubComponent === item.key
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white"
                }`}
                title={`Switch to ${item.key} analytics`}
              >
                <span className="text-[10px] opacity-60 font-mono">{item.sub}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4 STATISTICAL COEFFICIENT METRIC CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Active Scope Mode</span>
            <span className="font-display font-black text-lg text-slate-900 mt-1 block">
              {isCommonSubject
                ? "7 Engineering Disciplines"
                : `${currentSubject.department.split(" ")[0]} Cohorts`}
            </span>
            <span className="text-[11px] text-slate-600 font-mono font-bold mt-0.5 block">
              Total Cohort: {summaryMetrics.totalCohort} Candidates
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <span className="text-[10px] font-extrabold text-blue-700 uppercase block">
              Average Marks (&mu;) [{activeSubComponent}]
            </span>
            <span className="font-display font-black text-2xl text-blue-950 mt-1 block font-mono">
              {summaryMetrics.overallMean} <span className="text-xs font-normal text-blue-600">/ 100</span>
            </span>
            <span className="text-[11px] text-blue-800 font-mono font-bold mt-0.5 block">
              Attainment Index: {summaryMetrics.passPct}% Pass
            </span>
          </div>


        </div>
      </div>

      {/* 2. DUAL-AXIS COMPOSED GRAPH (EXACT STYLING MATCHING REFERENCED IMAGE) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#0B192C] text-[#D4A72C]">
                {activeSubComponent} COMPONENT
              </span>
              <span className="text-[10px] font-black uppercase text-gray-500 font-mono">
                {currentSubject.code} &bull; {currentSubject.title}
              </span>
            </div>
            <h2 className="font-display font-bold text-lg text-[#0B192C] flex items-center gap-2 mt-1">
              <TrendingUp size={20} className="text-[#D4A72C]" />
              {isCommonSubject
                ? `Department-wise Average Marks (μ) — ${activeSubComponent}`
                : `${currentSubject.department} Cohort Average Marks (μ) — ${activeSubComponent}`}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Average marks (&mu;, 0-100) of each group for the selected assessment.</p>
          </div>

          {/* Legends matching user image */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono shrink-0">
            <span className="flex items-center gap-1.5 text-blue-900 font-bold">
              <span className="h-3 w-3 rounded-sm bg-[#1E3A8A] inline-block" /> Average Marks (&mu;)
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-bold">
            </span>
            <span className="flex items-center gap-1 text-red-600 font-bold">
            </span>
          </div>
        </div>

        {/* The Dual Axis ComposedChart */}
        <div className="h-88 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeDataset}
              margin={{ top: 20, right: 30, left: -5, bottom: isCommonSubject ? 20 : 45 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFE9" />
              <XAxis
                dataKey="name"
                stroke="#667085"
                fontSize={11}
                tick={{ fontWeight: 600 }}
                interval={0}
                angle={isCommonSubject ? 0 : -20}
                textAnchor={isCommonSubject ? "middle" : "end"}
              />
              {/* Left Axis: Marks Average (0 - 100) */}
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                stroke="#1E3A8A"
                fontSize={11}
                unit="M"
                label={{
                  value: `Average Marks (μ, 0-100) · ${activeSubComponent}`,
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 10,
                  fill: "#1E3A8A",
                }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0B192C] text-white p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 font-mono border border-gray-700 min-w-[240px]">
                      <p className="font-bold text-amber-400 font-sans text-sm border-b border-gray-700 pb-1">
                        {d.fullName || d.name}
                      </p>
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">Assessment Sub-Component:</span>
                          <span className="font-bold text-emerald-400">{activeSubComponent}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">Average Marks (&mu;):</span>
                          <span className="font-bold text-white">{d.mean} / 100</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">Evaluated Cohort (N):</span>
                          <span className="font-bold text-white">{d.sampleSize} papers</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">Pass Rate:</span>
                          <span className="font-bold text-emerald-400">{d.passRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Bars for Marks Average */}
              <Bar
                yAxisId="left"
                dataKey="mean"
                name="Average Marks (μ)"
                fill="#1E3A8A"
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              >
                {activeDataset.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.mean >= 70 ? "#1E3A8A" : entry.mean >= 60 ? "#3B82F6" : "#60A5FA"}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Formula bar matching bottom bar in user's image */}
      </div>

      {/* 3. DETAILED STATISTICAL DISPERSION MATRIX TABLE */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C] flex items-center gap-2">
              <Layers size={18} className="text-[#D4A72C]" />
              {isCommonSubject
                ? `Department-wise Marks Summary — ${activeSubComponent}`
                : `Departmental Cohort Marks Summary — ${activeSubComponent}`}
            </h3>
            <p className="text-xs text-gray-500">
              Average marks and pass rate for {currentSubject.code}.
            </p>
          </div>

          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
            {activeDataset.length} Active Records &bull; {currentSubject.code}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">
                  {isCommonSubject ? "Engineering Department" : "Academic Cohort / Section"}
                </th>
                <th className="py-3 px-3 text-center">Cohort (N)</th>
                <th className="py-3 px-3 text-center bg-blue-950">Mean Mark (&mu;)</th>
                                                                <th className="py-3 px-3 text-center">Pass Rate (%)</th>
                              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium bg-white">
              {activeDataset.map((item, idx) => (
                <tr key={idx} className="hover:bg-amber-50/20 transition">
                  <td className="py-3 px-3">
                    <span className="font-bold text-xs text-[#0B192C] block">
                      {item.fullName || item.name}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 block">
                      {isCommonSubject ? item.name : `${currentSubject.code} • ${currentSubject.deptKey.toUpperCase()}`}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-gray-700">
                    {item.sampleSize} scripts
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-black text-sm text-blue-950 bg-blue-50/30">
                    {item.mean} <span className="text-[10px] font-normal text-blue-700">/ 100</span>
                  </td>




                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800">
                    {item.passRate}%
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
