import React, { useState, useMemo, useEffect } from "react";
import {
  PenLine,
  BookOpen,
  Calendar,
  Building2,
  Users,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Printer,
  Search,
  Filter,
  CheckSquare,
  Award,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Eye,
  FileCheck,
  UserCheck,
  Lock,
  X,
  Scale,
  TrendingUp,
  BarChart3,
  Check,
} from "lucide-react";
import * as XLSX from "xlsx";
import { allCurriculumSubjects, CurriculumSubject } from "../../data/curriculumSubjects";

export interface EvaluatedScriptDetail {
  scriptBarcode: string;
  dummyCode: string;
  partAMarks: number; // Max 20
  partBMarks: number; // Max 80
  totalMarks: number; // Max 100
  grade: "O" | "A+" | "A" | "B+" | "B" | "RA";
  evaluatedAt: string;
  remarks: string;
  status: "VERIFIED" | "VALUED" | "SCRUTINY_FLAGGED";
  subjectCode?: string;
  subjectTitle?: string;
}

export interface EvaluatorStaff {
  id: string;
  name: string;
  facultyId: string;
  department: string;
  role: "Chief Evaluator" | "Internal Examiner" | "External Examiner";
  assignedScripts: number;
  evaluatedScripts?: number;
  averageMarks?: number;
  stdDev?: number;
  highestMark?: number;
  lowestMark?: number;
  passCount?: number;
  scriptRangeStart: number;
  scriptRangeEnd: number;
  bundlePacketId: string;
  status: "Assigned" | "In Evaluation" | "Completed";
  allottedScripts?: EvaluatedScriptDetail[];
}

export interface FacultyAllocatedSubject {
  allocationId: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  semester: string;
  academicYear: string;
  bundlePacketId: string;
  assignedScripts: number;
  evaluatedScripts: number;
  averageMarks: number;
  stdDev: number;
  passCount: number;
  campVenue: string;
  deadlineDate: string;
  status: string;
  scripts: EvaluatedScriptDetail[];
}

export interface FacultyOverallStats {
  id: string;
  name: string;
  department: string;
  role: string;
  totalAllottedScripts: number;
  totalEvaluatedScripts: number;
  overallAverageMarks: number;
  overallStdDev: number;
  overallPassRate: number;
  highestMark: number;
  lowestMark: number;
  allocatedSubjects: FacultyAllocatedSubject[];
  allScripts: (EvaluatedScriptDetail & { subjectCode: string; subjectTitle: string })[];
}

export interface PaperCorrectionAllocation {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  deptKey: string;
  semester: string;
  academicYear: string;
  regulation: string;
  examSession: string;
  qpMasterCode: string;
  totalAnswerScripts: number;
  numberOfStaff: number;
  assignedStaff: EvaluatorStaff[];
  allocatedAt: string;
  deadlineDate: string;
  campVenue: string;
  adApprovedBy: string;
  status: "ALLOCATED" | "VALUATION_IN_PROGRESS" | "SCRUTINY_COMPLETED";
}

// Available faculties for 1-click auto-suggestion
const PRESET_FACULTY_POOL = [
  { name: "Prof. K. Venkatesh", id: "FAC-ENG-104", dept: "AI&DS", role: "Internal Examiner" as const },
  { name: "Dr. S. Mohan", id: "FAC-ENG-101", dept: "AI&DS", role: "Chief Evaluator" as const },
  { name: "Dr. Ananya Menon", id: "FAC-ENG-202", dept: "CSE", role: "Internal Examiner" as const },
  { name: "Dr. Jayapradha", id: "FAC-ENG-201", dept: "CSE", role: "Chief Evaluator" as const },
  { name: "Dr. Meenakshi S.", id: "FAC-ENG-302", dept: "BME", role: "Internal Examiner" as const },
  { name: "Dr. R. Natarajan", id: "FAC-ENG-301", dept: "BME", role: "Chief Evaluator" as const },
  { name: "Dr. Kavitha Raman", id: "FAC-ENG-402", dept: "Biotech", role: "Internal Examiner" as const },
  { name: "Dr. G. Sivakumar", id: "FAC-ENG-401", dept: "Biotech", role: "Chief Evaluator" as const },
  { name: "Dr. P. Suresh", id: "FAC-ENG-502", dept: "ECE", role: "Internal Examiner" as const },
  { name: "Dr. T. Balakrishnan", id: "FAC-ENG-501", dept: "ECE", role: "Chief Evaluator" as const },
  { name: "Prof. Arjun Rao", id: "FAC-ENG-208", dept: "CSE", role: "Internal Examiner" as const },
  { name: "Prof. Vikram Shah", id: "FAC-ENG-209", dept: "CSE", role: "Internal Examiner" as const },
  { name: "Prof. S. Nandhini", id: "FAC-ENG-108", dept: "AI&DS", role: "Internal Examiner" as const },
  { name: "Dr. Meganathan", id: "FAC-VAL-001", dept: "Evaluation Wing", role: "External Examiner" as const },
];

// Helper function to generate realistic evaluated scripts for faculty paper inspection
export const generateFacultyScripts = (
  facultyName: string,
  bundlePacketId: string,
  subjectCode: string,
  count: number,
  baseMean: number = 68.0,
  stdDev: number = 7.0
): EvaluatedScriptDetail[] => {
  const list: EvaluatedScriptDetail[] = [];
  const startId = bundlePacketId.includes("A") ? 8401 : bundlePacketId.includes("B") ? 8431 : 8461;

  for (let i = 1; i <= count; i++) {
    const wave = Math.sin(i * 4.2 + (baseMean % 7)) * stdDev * 1.35;
    const rawTotal = Math.min(97, Math.max(38, Math.round(baseMean + wave)));
    const partA = Math.min(20, Math.max(7, Math.round((rawTotal / 100) * 20 + Math.sin(i * 2) * 1.5)));
    const partB = Math.max(0, rawTotal - partA);
    const total = partA + partB;

    let grade: "O" | "A+" | "A" | "B+" | "B" | "RA" = "B";
    if (total >= 90) grade = "O";
    else if (total >= 80) grade = "A+";
    else if (total >= 70) grade = "A";
    else if (total >= 60) grade = "B+";
    else if (total >= 50) grade = "B";
    else grade = "RA";

    list.push({
      scriptBarcode: `BC-${subjectCode}-${bundlePacketId}-${String(i).padStart(2, "0")}`,
      dummyCode: `DMY-${startId + i}`,
      partAMarks: partA,
      partBMarks: partB,
      totalMarks: total,
      grade,
      evaluatedAt: `2026-10-${18 + (i % 3)} ${String((i % 6) + 9).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")} AM`,
      remarks:
        total >= 85
          ? "Exemplary solution derivation in Part B"
          : total < 50
          ? "Analytical deficit in question 14 rubrics"
          : "Standard autonomous valuation completed",
      status: i % 9 === 0 ? "SCRUTINY_FLAGGED" : "VERIFIED",
    });
  }
  return list;
};

const STORAGE_KEY = "kvell_paper_correction_assignments";

// Initial demo allocations with multi-faculty evaluation performance data
const INITIAL_ALLOCATIONS: PaperCorrectionAllocation[] = [
  {
    id: "ALLOC-AI602-2026",
    subjectCode: "AI602",
    subjectTitle: "Deep Learning & Neural Architectures",
    department: "Artificial Intelligence & Data Science",
    deptKey: "aids",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-AI602-V2",
    totalAnswerScripts: 50,
    numberOfStaff: 2,
    allocatedAt: "2026-10-18 10:30 AM",
    deadlineDate: "2026-10-24",
    campVenue: "Autonomous Valuation Camp (Hall 304, Tech Block)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-1",
        name: "Prof. K. Venkatesh",
        facultyId: "FAC-ENG-104",
        department: "AI&DS",
        role: "Chief Evaluator",
        assignedScripts: 25,
        evaluatedScripts: 25,
        averageMarks: 68.4,
        stdDev: 6.8,
        highestMark: 92,
        lowestMark: 45,
        passCount: 24,
        scriptRangeStart: 1,
        scriptRangeEnd: 25,
        bundlePacketId: "PKT-AI602-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Prof. K. Venkatesh", "PKT-AI602-A", "AI602", 25, 68.4, 6.8),
      },
      {
        id: "STAFF-2",
        name: "Dr. S. Mohan",
        facultyId: "FAC-ENG-101",
        department: "AI&DS",
        role: "Internal Examiner",
        assignedScripts: 25,
        evaluatedScripts: 25,
        averageMarks: 65.2,
        stdDev: 7.1,
        highestMark: 88,
        lowestMark: 42,
        passCount: 23,
        scriptRangeStart: 26,
        scriptRangeEnd: 50,
        bundlePacketId: "PKT-AI602-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. S. Mohan", "PKT-AI602-B", "AI602", 25, 65.2, 7.1),
      },
    ],
  },
  {
    id: "ALLOC-CS601-2026",
    subjectCode: "CS601",
    subjectTitle: "Data Structures & Algorithms",
    department: "Computer Science and Engineering",
    deptKey: "cse",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-CS601-V1",
    totalAnswerScripts: 40,
    numberOfStaff: 2,
    allocatedAt: "2026-10-17 02:15 PM",
    deadlineDate: "2026-10-23",
    campVenue: "Autonomous Valuation Camp (Hall 302, CS Wing)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-CS-1",
        name: "Dr. Ananya Menon",
        facultyId: "FAC-ENG-202",
        department: "CSE",
        role: "Chief Evaluator",
        assignedScripts: 20,
        evaluatedScripts: 20,
        averageMarks: 73.2,
        stdDev: 6.4,
        highestMark: 95,
        lowestMark: 52,
        passCount: 20,
        scriptRangeStart: 1,
        scriptRangeEnd: 20,
        bundlePacketId: "PKT-CS601-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. Ananya Menon", "PKT-CS601-A", "CS601", 20, 73.2, 6.4),
      },
      {
        id: "STAFF-CS-2",
        name: "Dr. Jayapradha",
        facultyId: "FAC-ENG-201",
        department: "CSE",
        role: "Internal Examiner",
        assignedScripts: 20,
        evaluatedScripts: 20,
        averageMarks: 71.5,
        stdDev: 6.9,
        highestMark: 91,
        lowestMark: 48,
        passCount: 19,
        scriptRangeStart: 21,
        scriptRangeEnd: 40,
        bundlePacketId: "PKT-CS601-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. Jayapradha", "PKT-CS601-B", "CS601", 20, 71.5, 6.9),
      },
    ],
  },
  {
    id: "ALLOC-MA26C01T-2026",
    subjectCode: "MA26C01T",
    subjectTitle: "Matrices and Calculus",
    department: "All Engineering Departments",
    deptKey: "all",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-MA26C01T-AUTONOMOUS",
    totalAnswerScripts: 60,
    numberOfStaff: 2,
    allocatedAt: "2026-10-16 11:00 AM",
    deadlineDate: "2026-10-22",
    campVenue: "Central Mathematics Valuation Camp (Hall 105)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-MA-1",
        name: "Prof. Arjun Rao",
        facultyId: "FAC-ENG-208",
        department: "Mathematics",
        role: "Chief Evaluator",
        assignedScripts: 30,
        evaluatedScripts: 30,
        averageMarks: 67.8,
        stdDev: 7.9,
        highestMark: 94,
        lowestMark: 41,
        passCount: 28,
        scriptRangeStart: 1,
        scriptRangeEnd: 30,
        bundlePacketId: "PKT-MA26C01T-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Prof. Arjun Rao", "PKT-MA26C01T-A", "MA26C01T", 30, 67.8, 7.9),
      },
      {
        id: "STAFF-MA-2",
        name: "Prof. Vikram Shah",
        facultyId: "FAC-ENG-209",
        department: "Mathematics",
        role: "Internal Examiner",
        assignedScripts: 30,
        evaluatedScripts: 30,
        averageMarks: 66.2,
        stdDev: 8.3,
        highestMark: 90,
        lowestMark: 43,
        passCount: 27,
        scriptRangeStart: 31,
        scriptRangeEnd: 60,
        bundlePacketId: "PKT-MA26C01T-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Prof. Vikram Shah", "PKT-MA26C01T-B", "MA26C01T", 30, 66.2, 8.3),
      },
    ],
  },
  {
    id: "ALLOC-AI604-2026",
    subjectCode: "AI604",
    subjectTitle: "Natural Language Processing & LLMs",
    department: "Artificial Intelligence & Data Science",
    deptKey: "aids",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-AI604-V1",
    totalAnswerScripts: 40,
    numberOfStaff: 2,
    allocatedAt: "2026-10-17 09:30 AM",
    deadlineDate: "2026-10-23",
    campVenue: "Autonomous Valuation Camp (Hall 304, Tech Block)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-AI4-1",
        name: "Prof. K. Venkatesh",
        facultyId: "FAC-ENG-104",
        department: "AI&DS",
        role: "Chief Evaluator",
        assignedScripts: 20,
        evaluatedScripts: 20,
        averageMarks: 71.2,
        stdDev: 6.2,
        highestMark: 94,
        lowestMark: 48,
        passCount: 19,
        scriptRangeStart: 1,
        scriptRangeEnd: 20,
        bundlePacketId: "PKT-AI604-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Prof. K. Venkatesh", "PKT-AI604-A", "AI604", 20, 71.2, 6.2),
      },
      {
        id: "STAFF-AI4-2",
        name: "Prof. S. Nandhini",
        facultyId: "FAC-ENG-108",
        department: "AI&DS",
        role: "Internal Examiner",
        assignedScripts: 20,
        evaluatedScripts: 20,
        averageMarks: 69.8,
        stdDev: 6.5,
        highestMark: 91,
        lowestMark: 44,
        passCount: 19,
        scriptRangeStart: 21,
        scriptRangeEnd: 40,
        bundlePacketId: "PKT-AI604-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Prof. S. Nandhini", "PKT-AI604-B", "AI604", 20, 69.8, 6.5),
      },
    ],
  },
  {
    id: "ALLOC-CS603-2026",
    subjectCode: "CS603",
    subjectTitle: "Cloud Computing & DevOps Architecture",
    department: "Computer Science and Engineering",
    deptKey: "cse",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-CS603-V2",
    totalAnswerScripts: 50,
    numberOfStaff: 2,
    allocatedAt: "2026-10-18 03:00 PM",
    deadlineDate: "2026-10-24",
    campVenue: "Autonomous Valuation Camp (Hall 302, CS Wing)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-CS3-1",
        name: "Dr. Ananya Menon",
        facultyId: "FAC-ENG-202",
        department: "CSE",
        role: "Chief Evaluator",
        assignedScripts: 25,
        evaluatedScripts: 25,
        averageMarks: 75.0,
        stdDev: 5.8,
        highestMark: 96,
        lowestMark: 54,
        passCount: 25,
        scriptRangeStart: 1,
        scriptRangeEnd: 25,
        bundlePacketId: "PKT-CS603-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. Ananya Menon", "PKT-CS603-A", "CS603", 25, 75.0, 5.8),
      },
      {
        id: "STAFF-CS3-2",
        name: "Dr. Jayapradha",
        facultyId: "FAC-ENG-201",
        department: "CSE",
        role: "Internal Examiner",
        assignedScripts: 25,
        evaluatedScripts: 25,
        averageMarks: 72.8,
        stdDev: 6.3,
        highestMark: 93,
        lowestMark: 50,
        passCount: 24,
        scriptRangeStart: 26,
        scriptRangeEnd: 50,
        bundlePacketId: "PKT-CS603-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. Jayapradha", "PKT-CS603-B", "CS603", 25, 72.8, 6.3),
      },
    ],
  },
  {
    id: "ALLOC-BM603-2026",
    subjectCode: "BM603",
    subjectTitle: "Biomedical Instrumentation & Sensors",
    department: "Biomedical Engineering",
    deptKey: "bme",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-BM603-V1",
    totalAnswerScripts: 30,
    numberOfStaff: 2,
    allocatedAt: "2026-10-17 11:30 AM",
    deadlineDate: "2026-10-23",
    campVenue: "Autonomous Valuation Camp (Bio-Wing 204)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-BM-1",
        name: "Dr. Meenakshi S.",
        facultyId: "FAC-ENG-302",
        department: "BME",
        role: "Chief Evaluator",
        assignedScripts: 15,
        evaluatedScripts: 15,
        averageMarks: 67.4,
        stdDev: 7.2,
        highestMark: 89,
        lowestMark: 44,
        passCount: 14,
        scriptRangeStart: 1,
        scriptRangeEnd: 15,
        bundlePacketId: "PKT-BM603-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. Meenakshi S.", "PKT-BM603-A", "BM603", 15, 67.4, 7.2),
      },
      {
        id: "STAFF-BM-2",
        name: "Dr. R. Natarajan",
        facultyId: "FAC-ENG-301",
        department: "BME",
        role: "Internal Examiner",
        assignedScripts: 15,
        evaluatedScripts: 15,
        averageMarks: 66.0,
        stdDev: 7.5,
        highestMark: 87,
        lowestMark: 41,
        passCount: 14,
        scriptRangeStart: 16,
        scriptRangeEnd: 30,
        bundlePacketId: "PKT-BM603-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. R. Natarajan", "PKT-BM603-B", "BM603", 15, 66.0, 7.5),
      },
    ],
  },
  {
    id: "ALLOC-BT602-2026",
    subjectCode: "BT602",
    subjectTitle: "Genetic Engineering & CRISPR Technology",
    department: "Biotechnology",
    deptKey: "biotech",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-BT602-V2",
    totalAnswerScripts: 30,
    numberOfStaff: 2,
    allocatedAt: "2026-10-18 10:00 AM",
    deadlineDate: "2026-10-24",
    campVenue: "Autonomous Valuation Camp (Biotech Lab 102)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-BT-1",
        name: "Dr. Kavitha Raman",
        facultyId: "FAC-ENG-402",
        department: "Biotech",
        role: "Chief Evaluator",
        assignedScripts: 15,
        evaluatedScripts: 15,
        averageMarks: 68.2,
        stdDev: 6.7,
        highestMark: 90,
        lowestMark: 45,
        passCount: 14,
        scriptRangeStart: 1,
        scriptRangeEnd: 15,
        bundlePacketId: "PKT-BT602-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. Kavitha Raman", "PKT-BT602-A", "BT602", 15, 68.2, 6.7),
      },
      {
        id: "STAFF-BT-2",
        name: "Dr. G. Sivakumar",
        facultyId: "FAC-ENG-401",
        department: "Biotech",
        role: "Internal Examiner",
        assignedScripts: 15,
        evaluatedScripts: 15,
        averageMarks: 65.5,
        stdDev: 7.0,
        highestMark: 86,
        lowestMark: 42,
        passCount: 13,
        scriptRangeStart: 16,
        scriptRangeEnd: 30,
        bundlePacketId: "PKT-BT602-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. G. Sivakumar", "PKT-BT602-B", "BT602", 15, 65.5, 7.0),
      },
    ],
  },
  {
    id: "ALLOC-EC601-2026",
    subjectCode: "EC601",
    subjectTitle: "VLSI Design & Embedded Systems",
    department: "Electronics & Communication Engineering",
    deptKey: "ece",
    semester: "Semester I",
    academicYear: "2026-2027",
    regulation: "R-2023 Autonomous",
    examSession: "Nov/Dec 2026 (FN)",
    qpMasterCode: "QP-2026-EC601-V1",
    totalAnswerScripts: 40,
    numberOfStaff: 2,
    allocatedAt: "2026-10-17 01:00 PM",
    deadlineDate: "2026-10-23",
    campVenue: "Autonomous Valuation Camp (ECE Block Hall 201)",
    adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
    status: "VALUATION_IN_PROGRESS",
    assignedStaff: [
      {
        id: "STAFF-EC-1",
        name: "Dr. P. Suresh",
        facultyId: "FAC-ENG-502",
        department: "ECE",
        role: "Chief Evaluator",
        assignedScripts: 20,
        evaluatedScripts: 20,
        averageMarks: 70.4,
        stdDev: 6.6,
        highestMark: 93,
        lowestMark: 47,
        passCount: 19,
        scriptRangeStart: 1,
        scriptRangeEnd: 20,
        bundlePacketId: "PKT-EC601-A",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. P. Suresh", "PKT-EC601-A", "EC601", 20, 70.4, 6.6),
      },
      {
        id: "STAFF-EC-2",
        name: "Dr. T. Balakrishnan",
        facultyId: "FAC-ENG-501",
        department: "ECE",
        role: "Internal Examiner",
        assignedScripts: 20,
        evaluatedScripts: 20,
        averageMarks: 68.9,
        stdDev: 6.9,
        highestMark: 91,
        lowestMark: 45,
        passCount: 19,
        scriptRangeStart: 21,
        scriptRangeEnd: 40,
        bundlePacketId: "PKT-EC601-B",
        status: "Completed",
        allottedScripts: generateFacultyScripts("Dr. T. Balakrishnan", "PKT-EC601-B", "EC601", 20, 68.9, 6.9),
      },
    ],
  },
];

interface PaperCorrectionViewProps {
  onToast?: (msg: string) => void;
}

export const PaperCorrectionView: React.FC<PaperCorrectionViewProps> = ({ onToast }) => {
  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("2026-2027");
  const [selectedSemester, setSelectedSemester] = useState<string>("Semester I");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("Artificial Intelligence & Data Science");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected Subject
  const [selectedSubject, setSelectedSubject] = useState<CurriculumSubject | null>(null);

  // Form Inputs
  const [totalScriptsInput, setTotalScriptsInput] = useState<number>(50);
  const [numberOfStaffInput, setNumberOfStaffInput] = useState<number>(2);
  const [valuationCampVenue, setValuationCampVenue] = useState<string>(
    "Central Valuation Camp · Engineering Academic Block (Camp Room 304)"
  );
  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split("T")[0];
  });

  // Dynamic Staff Input State
  const [evaluatorInputs, setEvaluatorInputs] = useState<
    { name: string; facultyId: string; department: string; role: EvaluatorStaff["role"] }[]
  >([
    { name: "Prof. K. Venkatesh", facultyId: "FAC-ENG-104", department: "AI&DS", role: "Chief Evaluator" },
    { name: "Dr. S. Mohan", facultyId: "FAC-ENG-101", department: "AI&DS", role: "Internal Examiner" },
  ]);

  // Persisted Allocations (ensure full multi-subject dataset is loaded)
  const [allocations, setAllocations] = useState<PaperCorrectionAllocation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 6) {
          return parsed;
        }
      }
      return INITIAL_ALLOCATIONS;
    } catch {
      return INITIAL_ALLOCATIONS;
    }
  });

  // Active view tab: "faculty-overview" (Default: Overall Paper Allotment & Mark Avg Hub) | "allocations-history" | "new-allocation"
  const [activeTab, setActiveTab] = useState<"faculty-overview" | "allocations-history" | "new-allocation">("faculty-overview");

  // Selected faculty ID for faculty-overview tab (Default: Prof. K. Venkatesh)
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("FAC-ENG-104");
  const [facultySearchQuery, setFacultySearchQuery] = useState<string>("");
  const [facultyDeptFilter, setFacultyDeptFilter] = useState<string>("ALL");
  const [facultySubjectFilter, setFacultySubjectFilter] = useState<string>("ALL");
  const [facultyGradeFilter, setFacultyGradeFilter] = useState<string>("ALL");
  const [facultyScriptSearch, setFacultyScriptSearch] = useState<string>("");

  // Selected Allocation for Modal / Print Preview
  const [inspectionAllocation, setInspectionAllocation] = useState<PaperCorrectionAllocation | null>(null);

  // COE Central Master Key inspection modal state
  const [showMasterKeyModal, setShowMasterKeyModal] = useState<boolean>(false);

  // AD Faculty Allotted Papers & Valuation Performance Inspection Modal state
  const [inspectingFacultyModal, setInspectingFacultyModal] = useState<{
    staff: EvaluatorStaff;
    allocation: PaperCorrectionAllocation;
  } | null>(null);
  const [inspectModalTab, setInspectModalTab] = useState<"overall" | "subject">("overall");
  const [scriptFilterGrade, setScriptFilterGrade] = useState<string>("ALL");
  const [scriptSearchQuery, setScriptSearchQuery] = useState<string>("");

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  // Computed map of all faculties with overall paper allocations and mark averages
  const facultyOverallMap = useMemo(() => {
    const map = new Map<string, FacultyOverallStats>();

    // Seed preset faculty pool
    PRESET_FACULTY_POOL.forEach((f) => {
      map.set(f.id, {
        id: f.id,
        name: f.name,
        department: f.dept,
        role: f.role,
        totalAllottedScripts: 0,
        totalEvaluatedScripts: 0,
        overallAverageMarks: 0,
        overallStdDev: 0,
        overallPassRate: 0,
        highestMark: 0,
        lowestMark: 100,
        allocatedSubjects: [],
        allScripts: [],
      });
    });

    // Aggregate from allocations
    allocations.forEach((alloc) => {
      alloc.assignedStaff.forEach((staff) => {
        const key = staff.facultyId || staff.name;
        if (!map.has(key)) {
          map.set(key, {
            id: staff.facultyId || key,
            name: staff.name,
            department: staff.department,
            role: staff.role,
            totalAllottedScripts: 0,
            totalEvaluatedScripts: 0,
            overallAverageMarks: 0,
            overallStdDev: 0,
            overallPassRate: 0,
            highestMark: 0,
            lowestMark: 100,
            allocatedSubjects: [],
            allScripts: [],
          });
        }

        const fac = map.get(key)!;
        const staffScripts =
          staff.allottedScripts && staff.allottedScripts.length > 0
            ? staff.allottedScripts
            : generateFacultyScripts(
                staff.name,
                staff.bundlePacketId,
                alloc.subjectCode,
                staff.assignedScripts,
                staff.averageMarks || 68.0,
                staff.stdDev || 6.8
              );

        fac.totalAllottedScripts += staff.assignedScripts;
        fac.totalEvaluatedScripts += staff.evaluatedScripts ?? staff.assignedScripts;

        fac.allocatedSubjects.push({
          allocationId: alloc.id,
          subjectCode: alloc.subjectCode,
          subjectTitle: alloc.subjectTitle,
          department: alloc.department,
          semester: alloc.semester,
          academicYear: alloc.academicYear,
          bundlePacketId: staff.bundlePacketId,
          assignedScripts: staff.assignedScripts,
          evaluatedScripts: staff.evaluatedScripts ?? staff.assignedScripts,
          averageMarks: staff.averageMarks ?? 68.4,
          stdDev: staff.stdDev ?? 6.8,
          passCount: staff.passCount ?? Math.round(staff.assignedScripts * 0.95),
          campVenue: alloc.campVenue,
          deadlineDate: alloc.deadlineDate,
          status: staff.status,
          scripts: staffScripts,
        });

        staffScripts.forEach((s) => {
          fac.allScripts.push({
            ...s,
            subjectCode: alloc.subjectCode,
            subjectTitle: alloc.subjectTitle,
          });
          if (s.totalMarks > fac.highestMark) fac.highestMark = s.totalMarks;
          if (s.totalMarks < fac.lowestMark) fac.lowestMark = s.totalMarks;
        });
      });
    });

    // Compute overall weighted mark average and standard deviation
    map.forEach((fac) => {
      if (fac.allScripts.length > 0) {
        const sum = fac.allScripts.reduce((acc, s) => acc + s.totalMarks, 0);
        fac.overallAverageMarks = parseFloat((sum / fac.allScripts.length).toFixed(1));

        const variance =
          fac.allScripts.reduce((acc, s) => acc + Math.pow(s.totalMarks - fac.overallAverageMarks, 2), 0) /
          fac.allScripts.length;
        fac.overallStdDev = parseFloat(Math.sqrt(variance).toFixed(1));

        const passed = fac.allScripts.filter((s) => s.totalMarks >= 50).length;
        fac.overallPassRate = parseFloat(((passed / fac.allScripts.length) * 100).toFixed(1));
      } else {
        fac.lowestMark = 0;
      }
    });

    return map;
  }, [allocations]);

  const facultyList = useMemo(() => {
    return Array.from(facultyOverallMap.values()).filter((f) => f.totalAllottedScripts > 0);
  }, [facultyOverallMap]);

  const selectedFacultyStats = useMemo(() => {
    return (
      facultyOverallMap.get(selectedFacultyId) ||
      facultyList[0] ||
      null
    );
  }, [facultyOverallMap, selectedFacultyId, facultyList]);

  // Export Faculty Overall Dossier to Excel
  const handleExportFacultyOverallDossier = (fac: FacultyOverallStats) => {
    const summaryRows = fac.allocatedSubjects.map((sub, idx) => ({
      "Sl No": idx + 1,
      "Faculty Name": fac.name,
      "Faculty ID": fac.id,
      "Department": fac.department,
      "Subject Code": sub.subjectCode,
      "Subject Title": sub.subjectTitle,
      "Bundle Packet ID": sub.bundlePacketId,
      "Allotted Scripts": sub.assignedScripts,
      "Evaluated Scripts": sub.evaluatedScripts,
      "Respective Mark Average (μ)": sub.averageMarks,
      "Std Dev (σ)": sub.stdDev,
      "Pass Rate %": `${Math.round((sub.passCount / sub.assignedScripts) * 100)}%`,
      "Camp Venue": sub.campVenue,
      "Deadline": sub.deadlineDate,
      "Valuation Status": sub.status,
    }));

    const scriptRows = fac.allScripts.map((s, idx) => ({
      "Sl No": idx + 1,
      "Faculty Name": fac.name,
      "Faculty ID": fac.id,
      "Subject Code": s.subjectCode,
      "Subject Title": s.subjectTitle,
      "Script Barcode": s.scriptBarcode,
      "COE Dummy Barcode": s.dummyCode,
      "Part A Marks (Max 20)": s.partAMarks,
      "Part B Marks (Max 80)": s.partBMarks,
      "Total Marks (Max 100)": s.totalMarks,
      "Grade Awarded": s.grade,
      "Valuation Timestamp": s.evaluatedAt,
      "Scrutiny Status": s.status,
      "Remarks": s.remarks,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    const ws2 = XLSX.utils.json_to_sheet(scriptRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Subject_Allocations");
    XLSX.utils.book_append_sheet(wb, ws2, "All_Allotted_Scripts");
    XLSX.writeFile(wb, `KVELL_Faculty_Allotted_Papers_${fac.id}_${fac.name.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`);
    notify(`Exported overall paper allocation and marks dossier for ${fac.name} to Excel`);
  };

  const saveAllocations = (list: PaperCorrectionAllocation[]) => {
    setAllocations(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Subject Catalog
  const filteredSubjects = useMemo(() => {
    return allCurriculumSubjects.filter((sub) => {
      const matchDept =
        selectedDepartment === "All Departments" ||
        sub.department.toLowerCase() === selectedDepartment.toLowerCase() ||
        (selectedDepartment.includes("AI") && sub.deptKey === "aids") ||
        (selectedDepartment.includes("Computer") && sub.deptKey === "cse") ||
        (selectedDepartment.includes("Biomedical") && sub.deptKey === "bme") ||
        (selectedDepartment.includes("Biotech") && sub.deptKey === "biotech");

      const matchSem =
        !selectedSemester ||
        sub.semester.toLowerCase() === selectedSemester.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        sub.code.toLowerCase().includes(q) ||
        sub.title.toLowerCase().includes(q) ||
        sub.department.toLowerCase().includes(q);

      return matchDept && matchSem && matchSearch;
    });
  }, [selectedDepartment, selectedSemester, searchQuery]);

  // Auto-select first subject when filtered list changes if none selected
  useEffect(() => {
    if (filteredSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(filteredSubjects[0]);
    }
  }, [filteredSubjects, selectedSubject]);

  // When selectedSubject changes, adjust script count default based on department
  useEffect(() => {
    if (selectedSubject) {
      let defaultCount = 50;
      if (selectedSubject.deptKey === "cse") defaultCount = 60;
      else if (selectedSubject.deptKey === "bme") defaultCount = 28;
      else if (selectedSubject.deptKey === "biotech") defaultCount = 25;
      else if (selectedSubject.deptKey === "ece") defaultCount = 35;
      else if (selectedSubject.deptKey === "mech") defaultCount = 48;
      setTotalScriptsInput(defaultCount);
    }
  }, [selectedSubject]);

  // Sync evaluator inputs array length when numberOfStaffInput changes
  useEffect(() => {
    const n = Math.max(1, Math.min(10, numberOfStaffInput || 1));
    setEvaluatorInputs((prev) => {
      const next = [...prev];
      while (next.length < n) {
        const poolIndex = next.length % PRESET_FACULTY_POOL.length;
        const candidate = PRESET_FACULTY_POOL[poolIndex];
        next.push({
          name: candidate.name,
          facultyId: candidate.id,
          department: candidate.dept,
          role: next.length === 0 ? "Chief Evaluator" : "Internal Examiner",
        });
      }
      return next.slice(0, n);
    });
  }, [numberOfStaffInput]);

  // AUTOMATIC EQUAL MAPPING ENGINE
  // Calculates equal distribution of answer scripts among N staff members
  const calculatedMapping = useMemo(() => {
    const total = Math.max(1, totalScriptsInput || 1);
    const staffCount = Math.max(1, evaluatorInputs.length || 1);

    const basePerStaff = Math.floor(total / staffCount);
    const remainder = total % staffCount;

    let currentScriptIndex = 1;

    const list: EvaluatorStaff[] = evaluatorInputs.map((staff, idx) => {
      // Equal distribution: first `remainder` faculties receive 1 extra script
      const count = idx < remainder ? basePerStaff + 1 : basePerStaff;
      const start = currentScriptIndex;
      const end = start + count - 1;
      currentScriptIndex += count;

      const packetLetter = String.fromCharCode(65 + (idx % 26));
      const code = selectedSubject?.code || "SUB";
      const bundleId = `PKT-${code}-${packetLetter}`;

      const baseMean = 68.0 + (idx === 0 ? 1.5 : -1.2);
      const stdDev = 6.8 + (idx % 2 === 0 ? 0.3 : -0.2);
      const scripts = generateFacultyScripts(staff.name, bundleId, code, count, baseMean, stdDev);
      const avg = parseFloat((scripts.reduce((a, b) => a + b.totalMarks, 0) / (scripts.length || 1)).toFixed(1));
      const passCount = scripts.filter((s) => s.totalMarks >= 50).length;
      const highestMark = Math.max(...scripts.map((s) => s.totalMarks));
      const lowestMark = Math.min(...scripts.map((s) => s.totalMarks));

      return {
        id: `STAFF-${idx + 1}`,
        name: staff.name.trim() || `Evaluating Faculty ${idx + 1}`,
        facultyId: staff.facultyId.trim() || `FAC-${idx + 101}`,
        department: staff.department.trim() || (selectedSubject?.department || "Engineering"),
        role: staff.role,
        assignedScripts: count,
        evaluatedScripts: count,
        averageMarks: avg,
        stdDev,
        highestMark,
        lowestMark,
        passCount,
        scriptRangeStart: start,
        scriptRangeEnd: end,
        bundlePacketId: bundleId,
        status: "Completed",
        allottedScripts: scripts,
      };
    });

    return {
      totalScripts: total,
      staffCount,
      basePerStaff,
      remainder,
      distribution: list,
    };
  }, [totalScriptsInput, evaluatorInputs, selectedSubject]);

  // Update staff info
  const handleUpdateStaff = (
    index: number,
    field: "name" | "facultyId" | "department" | "role",
    val: string
  ) => {
    setEvaluatorInputs((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return updated;
    });
  };

  // Quick pick preset faculty
  const handleApplyPresetFaculty = (index: number, candidate: typeof PRESET_FACULTY_POOL[0]) => {
    setEvaluatorInputs((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          name: candidate.name,
          facultyId: candidate.id,
          department: candidate.dept,
          role: index === 0 ? "Chief Evaluator" : candidate.role,
        };
      }
      return updated;
    });
    notify(`Selected ${candidate.name} (${candidate.dept})`);
  };

  // Confirm Allocation Handler
  const handleConfirmAllocation = () => {
    if (!selectedSubject) {
      notify("Please select a subject first!");
      return;
    }

    if (totalScriptsInput <= 0) {
      notify("Please enter a valid number of answer scripts!");
      return;
    }

    if (calculatedMapping.distribution.some((s) => !s.name.trim())) {
      notify("Please fill in names for all evaluating staff!");
      return;
    }

    const newAllocation: PaperCorrectionAllocation = {
      id: `ALLOC-${selectedSubject.code}-${Date.now().toString().slice(-4)}`,
      subjectCode: selectedSubject.code,
      subjectTitle: selectedSubject.title,
      department: selectedSubject.department,
      deptKey: selectedSubject.deptKey,
      semester: selectedSemester,
      academicYear: selectedAcademicYear,
      regulation: "R-2023 Autonomous",
      examSession: `${selectedSemester.toUpperCase()} END SEMESTER EXAMINATIONS`,
      qpMasterCode: `QP-${selectedAcademicYear.slice(0, 4)}-${selectedSubject.code}-VERIFIED`,
      totalAnswerScripts: calculatedMapping.totalScripts,
      numberOfStaff: calculatedMapping.staffCount,
      assignedStaff: calculatedMapping.distribution,
      allocatedAt: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      deadlineDate,
      campVenue: valuationCampVenue,
      adApprovedBy: "Dr. K. R. Ramanathan (Associate Dean - Academics)",
      status: "ALLOCATED",
    };

    const updated = [newAllocation, ...allocations.filter((a) => a.subjectCode !== selectedSubject.code)];
    saveAllocations(updated);
    notify(
      `Successfully mapped ${calculatedMapping.totalScripts} scripts of ${selectedSubject.code} equally across ${calculatedMapping.staffCount} faculties!`
    );
    setActiveTab("allocations-history");
    setInspectionAllocation(newAllocation);
  };

  // Export to Excel Handler
  const handleExportExcel = (alloc: PaperCorrectionAllocation) => {
    const rows = alloc.assignedStaff.map((staff, idx) => ({
      "Sl No": idx + 1,
      "Bundle / Packet ID": staff.bundlePacketId,
      "Faculty Name": staff.name,
      "Faculty ID": staff.facultyId,
      Department: staff.department,
      "Valuation Role": staff.role,
      "Valuation Protocol": "COE Strict Blind Valuation",
      "Assigned Scripts Count": staff.assignedScripts,
      "Bundle Batch": `${staff.assignedScripts} Scripts (COE Shuffled Dummy Barcodes)`,
      "Student Identity": "Withheld / Confidential Dummy System",
      "Subject Code": alloc.subjectCode,
      "Subject Title": alloc.subjectTitle,
      Semester: alloc.semester,
      "Academic Year": alloc.academicYear,
      "Valuation Venue": alloc.campVenue,
      "Submission Deadline": alloc.deadlineDate,
      "Handover Acknowledgment Signature": "____________________",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${alloc.subjectCode}_Allocation`);
    XLSX.writeFile(wb, `KVELL_Paper_Correction_Order_${alloc.subjectCode}_${alloc.academicYear.replace("/", "-")}.xlsx`);
    notify(`Downloaded valuation allotment roster for ${alloc.subjectCode}`);
  };

  return (
    <div className="space-y-7">
      {/* MODULE HEADER BANNER */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#EAB308] text-[#0B192C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest inline-block shadow-sm">
              EXAMINATION CELL · AUTONOMOUS CENTRAL VALUATION
            </span>
            <span className="bg-white/10 text-[#D4A72C] text-[10px] font-bold px-2 py-0.5 rounded border border-[#D4A72C]/30 font-mono">
              STAGE 4 · FACULTY SCRIPT MAPPING
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <PenLine className="text-[#D4A72C]" size={28} />
            Paper Correction Module
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            The Associate Dean maps current semester examination answer scripts for evaluation to qualified faculties.
            Enter the total answer script count and number of evaluating staff — our engine automatically divides and
            allocates bundles equally with discrete dummy serial numbers and official handover rosters.
          </p>
        </div>

        {/* Tab Switcher in Header */}
        <div className="relative z-10 flex flex-wrap items-center bg-white/10 p-1 rounded-2xl border border-white/15 shrink-0 gap-1">
          <button
            onClick={() => setActiveTab("faculty-overview")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "faculty-overview"
                ? "bg-[#EAB308] text-[#0B192C] shadow-md ring-2 ring-[#EAB308]/40"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users size={14} /> Faculty Overall Allotment &amp; Mark Avg Hub ({facultyList.length})
          </button>
          <button
            onClick={() => setActiveTab("allocations-history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "allocations-history"
                ? "bg-[#EAB308] text-[#0B192C] shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <CheckSquare size={14} /> Subject Allocations &amp; Evaluator Deltas ({allocations.length})
          </button>
          <button
            onClick={() => setActiveTab("new-allocation")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "new-allocation"
                ? "bg-[#EAB308] text-[#0B192C] shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <Plus size={14} /> Map New Paper
          </button>
        </div>
      </div>

      {activeTab === "new-allocation" && (
        <div className="space-y-7">
          {/* STEP 1: SUBJECT SELECTION & ACADEMIC FILTERS */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                  STEP 1 · CURRICULUM CATALOG SELECTION
                </span>
                <h2 className="font-display font-black text-lg text-[#0B192C] mt-0.5">
                  Select Subject, Semester &amp; Academic Year
                </h2>
                <p className="text-xs text-gray-500">
                  First choose the academic year, semester, and subject to pull the current examination paper into the
                  valuation engine.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-600" />
                  {filteredSubjects.length} Subjects Available
                </span>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Academic Year */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1.5 tracking-wider">
                  Academic Year
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-3 text-gray-400" />
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="2026-2027">2026-2027 (Current)</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                  </select>
                </div>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1.5 tracking-wider">
                  Semester
                </label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3 top-3 text-gray-400" />
                  <select
                    value={selectedSemester}
                    onChange={(e) => {
                      setSelectedSemester(e.target.value);
                      setSelectedSubject(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="Semester I">Semester I (Current Exam)</option>
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

              {/* Department */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1.5 tracking-wider">
                  Department
                </label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-3 text-gray-400" />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedSubject(null);
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Artificial Intelligence & Data Science">AI &amp; Data Science</option>
                    <option value="Computer Science and Engineering">Computer Science &amp; Engg</option>
                    <option value="Biomedical Engineering">Biomedical Engineering</option>
                    <option value="Biotech">Biotechnology</option>
                    <option value="Electronics & Communication Engineering">ECE</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Electrical & Electronics Engineering">EEE</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Robotics and Automation">Robotics &amp; Automation</option>
                  </select>
                </div>
              </div>

              {/* Search Subject */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1.5 tracking-wider">
                  Search Subject
                </label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by code or title..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SUBJECT CARDS GRID */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Click any subject card to load for correction assignment:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                {filteredSubjects.map((sub) => {
                  const isSelected = selectedSubject?.code === sub.code;
                  const alreadyAllocated = allocations.some((a) => a.subjectCode === sub.code);

                  return (
                    <div
                      key={sub.code}
                      onClick={() => setSelectedSubject(sub)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#FAF8F5] border-[#D4A72C] shadow-md ring-2 ring-[#D4A72C]/20"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-xs text-[#0B192C] bg-[#0B192C]/10 px-2 py-0.5 rounded">
                              {sub.code}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              {sub.credits} Credits
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-[#0B192C] mt-1.5 line-clamp-1" title={sub.title}>
                            {sub.title}
                          </h4>
                        </div>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-[#D4A72C] text-[#0B192C] flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 truncate max-w-[170px]">{sub.department}</span>
                        {alreadyAllocated ? (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ALLOCATED
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            READY
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STEP 2: CURRENT SEMESTER EXAMINATION PAPER DOSSIER */}
          {selectedSubject && (
            <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D4A72C] p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#0B192C] text-[#D4A72C] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-2">
                <ShieldCheck size={14} /> CURRENT SEMESTER EXAMINATION PAPER
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    EXAMINATION SPECIFICATION &amp; OFFICIAL RELEASE DOSSIER
                  </span>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <h3 className="font-display font-black text-xl text-[#0B192C]">
                      {selectedSubject.code} — {selectedSubject.title}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#EAB308] text-[#0B192C]">
                      {selectedSemester}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0B192C] text-white">
                      AY {selectedAcademicYear}
                    </span>
                  </div>
                </div>

                {/* Key Spec Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white border border-[#E5E1D8]">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Department</span>
                    <span className="font-bold text-[#0B192C] mt-0.5 block truncate">
                      {selectedSubject.department}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-[#E5E1D8]">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">QP Master Code</span>
                    <span className="font-mono font-bold text-blue-700 mt-0.5 block">
                      QP-{selectedAcademicYear.slice(0, 4)}-{selectedSubject.code}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-[#E5E1D8]">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Curriculum Status</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block flex items-center gap-1">
                      <CheckCircle2 size={13} /> BoS &amp; COE Finalized
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-[#E5E1D8]">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Valuation Camp</span>
                    <span className="font-bold text-[#0B192C] mt-0.5 block truncate">Central Valuation Camp</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DEAN SCRIPT ALLOCATION & CENTRAL COE MASTER KEY MAPPING */}
          {selectedSubject && (
            <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                      STEP 2 · CENTRAL VALUATION PROTOCOL &amp; GOVERNANCE
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#0B192C] text-[#D4A72C]">
                      Dean Mapping Only
                    </span>
                  </div>
                  <h2 className="font-display font-black text-xl text-[#0B192C] mt-0.5">
                    Paper Correction Faculty Allocation Engine
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    <strong>Rule:</strong> In Step 2, the Dean ONLY maps the answer scripts equally to evaluating faculties.
                    Faculty valuation in Step 3 remains strictly blind under scrambled COE dummy barcodes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMasterKeyModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152a48] text-[#D4A72C] font-extrabold text-xs transition shrink-0 cursor-pointer shadow-sm flex items-center gap-2 border border-[#D4A72C]/40"
                >
                  <ShieldCheck size={14} className="text-[#D4A72C]" />
                  <span>COE Master Key (Locked)</span>
                </button>
              </div>

              {/* Informational Workflow Callout matching user's architecture */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-black shrink-0">
                    <Lock size={16} />
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-900 text-xs">
                      [2. COE Central Master Key (Locked in Dean/COE DB)]
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Maps: <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">Reg No 20260110226001</code> &rarr; <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">Script ID: SCR-001</code> &rarr; <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold">Dummy Barcode: DMY-84291</code>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-extrabold text-amber-900 bg-amber-200/60 px-2 py-1 rounded-lg shrink-0">
                  Top Flap Masked / Concealed
                </span>
              </div>

              {/* INPUT CONTROLS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#FAF8F5] border border-[#E5E1D8]">
                {/* Number of Answer Scripts */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#0B192C] mb-1.5 tracking-wider">
                    Total Answer Scripts <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={totalScriptsInput || ""}
                      onChange={(e) => setTotalScriptsInput(Math.max(1, parseInt(e.target.value) || 0))}
                      placeholder="e.g. 50, 120"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-300 font-mono font-black text-base text-[#0B192C] focus:border-[#D4A72C] focus:outline-none bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Total scripts received at Autonomous Exam Cell
                  </span>
                </div>

                {/* Number of Staff */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#0B192C] mb-1.5 tracking-wider">
                    Number of Evaluating Staff <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Users size={16} className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={numberOfStaffInput || ""}
                      onChange={(e) => setNumberOfStaffInput(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                      placeholder="e.g. 2, 3, 4"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-gray-300 font-mono font-black text-base text-[#0B192C] focus:border-[#D4A72C] focus:outline-none bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Creates {numberOfStaffInput} equal bundle slots
                  </span>
                </div>

                {/* Valuation Camp Deadline */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#0B192C] mb-1.5 tracking-wider">
                    Valuation Deadline
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:border-[#D4A72C] focus:outline-none bg-white cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Mark entry &amp; scrutiny submission target
                  </span>
                </div>

                {/* Camp Venue */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-[#0B192C] mb-1.5 tracking-wider">
                    Camp Valuation Room
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-3 text-gray-500" />
                    <input
                      type="text"
                      value={valuationCampVenue}
                      onChange={(e) => setValuationCampVenue(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:border-[#D4A72C] focus:outline-none bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">Physical script distribution wing</span>
                </div>
              </div>

              {/* AUTOMATIC EQUAL DISTRIBUTION SUMMARY BANNER */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-[#D4A72C]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#0B192C] block">
                      Automatic Equal Distribution Formulation:
                    </span>
                    <p className="text-xs text-gray-700 mt-0.5">
                      <span className="font-extrabold text-[#0B192C]">{calculatedMapping.totalScripts} Answer Scripts</span>{" "}
                      ÷ <span className="font-extrabold text-[#0B192C]">{calculatedMapping.staffCount} Staff</span> ={" "}
                      <span className="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                        {calculatedMapping.basePerStaff} scripts / staff
                      </span>
                      {calculatedMapping.remainder > 0 && (
                        <span className="text-amber-800 ml-2 font-semibold">
                          (+1 script allocated to first {calculatedMapping.remainder} staff to account for 100% of
                          scripts)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="px-3 py-1 bg-white rounded-xl border border-[#D4A72C]/50 text-xs font-mono font-black text-[#0B192C]">
                    Total Allocated: {calculatedMapping.distribution.reduce((acc, s) => acc + s.assignedScripts, 0)} /{" "}
                    {calculatedMapping.totalScripts}
                  </span>
                </div>
              </div>

              {/* STAFF DETAILS & BUNDLE MAPPING FORM */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-[#0B192C] flex items-center gap-2">
                    <UserCheck size={18} className="text-[#D4A72C]" />
                    Evaluating Faculties &amp; Packet Assignment ({calculatedMapping.staffCount} Slots)
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    AD can enter custom names or choose from pre-registered faculty quick-picks
                  </span>
                </div>

                <div className="space-y-4">
                  {calculatedMapping.distribution.map((staff, idx) => (
                    <div
                      key={staff.id}
                      className="p-5 rounded-2xl border-2 border-gray-200 bg-white hover:border-[#D4A72C]/50 transition-all shadow-xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 rounded-xl bg-[#0B192C] text-[#D4A72C] font-mono font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                              PACKET ALLOTMENT
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-sm text-[#0B192C]">
                                {staff.bundlePacketId}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 font-mono">
                                {staff.assignedScripts} SCRIPTS
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* COE Blind Valuation Batch Allocation */}
                        <div className="flex items-center gap-3 text-xs bg-[#FAF8F5] px-3.5 py-1.5 rounded-xl border border-[#E5E1D8]">
                          <span className="text-gray-500 font-medium">Valuation Protocol:</span>
                          <span className="font-mono font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                            {staff.assignedScripts} Scripts (COE Shuffled Blind Batch)
                          </span>
                        </div>
                      </div>

                      {/* Inputs Row for AD */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {/* Staff Name Input */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1 tracking-wider">
                            Evaluating Faculty Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={evaluatorInputs[idx]?.name || ""}
                            onChange={(e) => handleUpdateStaff(idx, "name", e.target.value)}
                            placeholder="Enter Faculty Name (e.g. Dr. Ananya Menon)"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:border-[#D4A72C] focus:outline-none"
                          />
                        </div>

                        {/* Faculty ID / Employee Code */}
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1 tracking-wider">
                            Faculty ID
                          </label>
                          <input
                            type="text"
                            value={evaluatorInputs[idx]?.facultyId || ""}
                            onChange={(e) => handleUpdateStaff(idx, "facultyId", e.target.value)}
                            placeholder="FAC-ENG-101"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 font-mono font-bold text-xs text-[#0B192C] focus:border-[#D4A72C] focus:outline-none"
                          />
                        </div>

                        {/* Role Dropdown */}
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-gray-500 mb-1 tracking-wider">
                            Evaluation Role
                          </label>
                          <select
                            value={evaluatorInputs[idx]?.role || "Internal Examiner"}
                            onChange={(e) =>
                              handleUpdateStaff(idx, "role", e.target.value as EvaluatorStaff["role"])
                            }
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:border-[#D4A72C] focus:outline-none bg-white cursor-pointer"
                          >
                            <option value="Chief Evaluator">Chief Evaluator</option>
                            <option value="Internal Examiner">Internal Examiner</option>
                            <option value="External Examiner">External Examiner</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Pick Faculty Recommendations */}
                      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                          Quick Pick:
                        </span>
                        {PRESET_FACULTY_POOL.slice(0, 5).map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleApplyPresetFaculty(idx, cand)}
                            className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-[#D4A72C]/20 hover:text-[#0B192C] text-gray-600 font-semibold text-[10px] transition cursor-pointer"
                          >
                            {cand.name} ({cand.dept})
                          </button>
                        ))}
                      </div>

                      {/* Live Faculty Overall Allocation & Mark Average Preview */}
                      {(() => {
                        const currentInput = evaluatorInputs[idx];
                        if (!currentInput?.name?.trim()) return null;
                        const matchKey = currentInput.facultyId || currentInput.name;
                        const facStats = facultyOverallMap.get(matchKey) ||
                          Array.from(facultyOverallMap.values()).find(
                            (f) => f.name.toLowerCase().includes(currentInput.name.toLowerCase().trim())
                          );

                        if (!facStats || facStats.totalAllottedScripts === 0) return null;

                        return (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              <span className="font-bold text-blue-950 font-sans">
                                {facStats.name} Active Workload:
                              </span>
                              <span className="bg-white px-2 py-0.5 rounded border border-blue-300 font-black text-blue-900">
                                {facStats.totalAllottedScripts} Papers Allotted ({facStats.allocatedSubjects.length} Subj)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 font-sans">Overall Mark Avg:</span>
                              <span className="bg-white px-2 py-0.5 rounded border border-blue-300 font-black text-blue-950">
                                &mu;: {facStats.overallAverageMarks} / 100
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFacultyId(facStats.id);
                                  setActiveTab("faculty-overview");
                                }}
                                className="text-[10px] text-blue-700 underline font-sans font-bold hover:text-blue-900"
                              >
                                View Overall Dossier &rarr;
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              {/* ACTION FOOTER BAR */}
              <div className="p-5 rounded-2xl bg-[#0B192C] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-[#D4A72C] block">
                    Ready to Finalize Paper Correction Assignment
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Official camp orders will be issued for {selectedSubject.code} ({calculatedMapping.totalScripts}{" "}
                    scripts equally divided into {calculatedMapping.staffCount} bundles).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTotalScriptsInput(50);
                      setNumberOfStaffInput(2);
                      notify("Reset parameters to default");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAllocation}
                    className="px-6 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <CheckSquare size={16} /> Confirm &amp; Issue Paper Correction Order
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE ALLOCATIONS & HISTORY TAB */}
      {activeTab === "allocations-history" && (
        <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                VALUATION MONITORING DESK
              </span>
              <h2 className="font-display font-black text-xl text-[#0B192C] mt-0.5">
                Active Paper Correction Allocations
              </h2>
              <p className="text-xs text-gray-500">
                All scheduled valuation assignments mapped by the Associate Dean with packet rosters and evaluators.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("new-allocation")}
                className="px-4 py-2 rounded-xl bg-[#0B192C] text-white hover:bg-[#152744] font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={14} /> Map Another Subject
              </button>
            </div>
          </div>

          {allocations.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF8F5] rounded-2xl border border-dashed border-gray-300">
              <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm font-bold text-gray-700">No active paper correction allocations found.</p>
              <p className="text-xs text-gray-500 mt-1">
                Select a subject from the "Map New Paper" tab to generate staff allotments.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="rounded-3xl border-2 border-gray-200 bg-[#FAF8F5] overflow-hidden shadow-sm hover:border-[#D4A72C]/60 transition"
                >
                  {/* Allocation Header */}
                  <div className="p-5 bg-white border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-sm">
                        {alloc.subjectCode.slice(0, 4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-[#0B192C] bg-[#FAF8F5] px-2 py-0.5 rounded border border-gray-200">
                            {alloc.subjectCode}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {alloc.semester} · AY {alloc.academicYear}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {alloc.status}
                          </span>
                        </div>
                        <h3 className="font-display font-black text-base text-[#0B192C] mt-1">
                          {alloc.subjectTitle}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {alloc.department} • Allocated on {alloc.allocatedAt} • Deadline:{" "}
                          <span className="font-bold text-red-600">{alloc.deadlineDate}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setInspectionAllocation(alloc)}
                        className="px-3.5 py-2 rounded-xl bg-white text-[#0B192C] hover:bg-gray-100 border border-gray-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye size={14} /> View Slip
                      </button>
                      <button
                        onClick={() => handleExportExcel(alloc)}
                        className="px-3.5 py-2 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download size={14} /> Export Excel
                      </button>
                    </div>
                  </div>

                  {/* If 2 or more faculty correcting the paper: MULTI-FACULTY VALUATION MARK AVERAGES & CONCORDANCE AUDIT */}
                  {alloc.assignedStaff.length >= 2 && (() => {
                    const staffWithAverages = alloc.assignedStaff.filter((s) => s.averageMarks !== undefined);
                    const avgScores = staffWithAverages.map((s) => s.averageMarks || 0);
                    const maxAvg = avgScores.length ? Math.max(...avgScores) : 0;
                    const minAvg = avgScores.length ? Math.min(...avgScores) : 0;
                    const delta = parseFloat((maxAvg - minAvg).toFixed(1));

                    return (
                      <div className="mx-5 mt-4 p-4 rounded-2xl bg-white border-2 border-blue-200/90 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold shrink-0">
                              <Scale size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-display font-black text-xs text-[#0B192C]">
                                  Multi-Faculty Valuation Mark Averages &amp; Concordance Audit
                                </h4>
                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-900 text-white">
                                  {alloc.assignedStaff.length} Evaluators
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500">
                                Multiple faculties are correcting this paper. Comparing their respective mark averages (&mu;) and standard deviation spread (&sigma;).
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto font-mono">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Cross-Faculty Delta:</span>
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${
                                delta <= 5.0
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              &Delta; {delta} Marks ({delta <= 5.0 ? "High Consistency \u2264 5M" : "Audit Watchlist > 5M"})
                            </span>
                          </div>
                        </div>

                        {/* Side-by-side Evaluator Averages Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {alloc.assignedStaff.map((staff, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="px-1.5 py-0.2 rounded font-mono font-black text-[9px] bg-[#0B192C] text-[#D4A72C]">
                                  {staff.bundlePacketId}
                                </span>
                                <p className="font-bold text-xs text-[#0B192C] truncate mt-0.5">{staff.name}</p>
                                <span className="text-[10px] text-gray-500 block truncate">{staff.role}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[9px] font-extrabold uppercase text-blue-700 block">Respective Avg</span>
                                <span className="font-mono font-black text-base text-blue-950 block">
                                  {staff.averageMarks ?? 68.4} <span className="text-[10px] font-normal text-gray-500">/ 100</span>
                                </span>
                                <span className="text-[9px] font-mono text-amber-800 font-bold block">
                                  &sigma;: &plusmn;{staff.stdDev ?? 6.8}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Evaluators Grid with Respective Marks & Inspection Action */}
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alloc.assignedStaff.map((staff, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col justify-between hover:border-blue-400 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-[#0B192C] text-[#D4A72C]">
                              {staff.bundlePacketId}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                              {staff.role}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-[#0B192C] mt-2">{staff.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {staff.facultyId} • {staff.department}
                          </p>

                          {/* Respective Marks & Valuation Performance Badge */}
                          <div className="mt-3 p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] font-bold text-blue-900 uppercase">Respective Mark Avg (&mu;):</span>
                              <span className="font-mono font-black text-sm text-blue-950">
                                {staff.averageMarks ?? 68.4} / 100
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
                              <span>Std Dev Spread (&sigma;):</span>
                              <span className="font-bold text-amber-900">&plusmn;{staff.stdDev ?? 6.8}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-gray-600">
                              <span>Valuation Pass Rate:</span>
                              <span className="font-bold text-emerald-800">
                                {Math.round(((staff.passCount ?? staff.assignedScripts) / staff.assignedScripts) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                              {staff.assignedScripts} Scripts
                            </span>
                            <span className="font-mono text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {staff.evaluatedScripts ?? staff.assignedScripts} / {staff.assignedScripts} Valued
                            </span>
                          </div>

                          {/* AD INSPECTION BUTTON FOR ALLOTTED PAPERS & PERFORMANCE */}
                          <button
                            type="button"
                            onClick={() => setInspectingFacultyModal({ staff, allocation: alloc })}
                            className="w-full py-2 px-3 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-[#D4A72C]/30"
                          >
                            <UserCheck size={13} className="text-[#D4A72C]" />
                            <span>Inspect Allotted Papers &amp; Performance</span>
                          </button>

                          {/* LINK TO FACULTY OVERALL ALLOCATION & MARK AVERAGE HUB */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFacultyId(staff.facultyId);
                              setActiveTab("faculty-overview");
                              notify(`Switched to overall allocation & marks hub for ${staff.name}`);
                            }}
                            className="w-full py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B192C] font-extrabold text-[10px] transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300"
                          >
                            <Users size={12} className="text-[#0B192C]" />
                            <span>View All Subjects Allotted to {staff.name}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Bar */}
                  <div className="px-5 py-3 bg-gray-100/70 border-t border-gray-200 flex flex-wrap items-center justify-between text-[11px] text-gray-600">
                    <span>
                      Camp Venue: <strong className="text-gray-800">{alloc.campVenue}</strong>
                    </span>
                    <span>
                      Total Answer Scripts:{" "}
                      <strong className="text-gray-900 font-mono text-xs">{alloc.totalAnswerScripts}</strong> (Equally
                      divided across {alloc.numberOfStaff} staff)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FACULTY OVERALL PAPER ALLOCATION & AVERAGE MARKS HUB */}
      {activeTab === "faculty-overview" && (
        <div className="space-y-6">
          {/* STEP 1: FACULTY SELECTION & SEARCH PANEL */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                  FACULTY PERFORMANCE AUDIT &bull; CENTRAL VALUATION CAMP
                </span>
                <h2 className="font-display font-black text-xl text-[#0B192C] mt-0.5">
                  Faculty Overall Allotment &amp; Mark Average Intelligence
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select any faculty to inspect their complete allotted paper bundles across all curriculum subjects,
                  overall script volumes, and respective mark averages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <Users size={14} className="text-blue-700" />
                  {facultyList.length} Active Valuating Faculties
                </span>
              </div>
            </div>

            {/* Filter and Search Bar for Faculty Selection */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  placeholder="Search faculty name, faculty ID, department..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white"
                />
              </div>

              {/* Department Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-gray-200">
                {["ALL", "AI&DS", "CSE", "BME", "Biotech", "ECE", "Mathematics"].map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setFacultyDeptFilter(dept)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      facultyDeptFilter === dept
                        ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white"
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Faculty Selection Dropdown Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 border-2 border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-black shrink-0 shadow-xs">
                  <UserCheck size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                    ACTIVE FACULTY SELECTION CONSOLE
                  </span>
                  <span className="text-xs font-bold text-[#0B192C]">
                    Select any faculty to view overall paper allocation &amp; average marks:
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={selectedFacultyId}
                  onChange={(e) => {
                    setSelectedFacultyId(e.target.value);
                    const target = facultyList.find((f) => f.id === e.target.value);
                    if (target) notify(`Selected ${target.name} — Loaded overall paper allocation & marks`);
                  }}
                  className="px-4 py-2 rounded-xl border-2 border-amber-400 font-black text-xs text-[#0B192C] bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs min-w-[300px]"
                >
                  {facultyList.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} ({fac.department}) — {fac.totalAllottedScripts} Papers Allotted | μ: {fac.overallAverageMarks}/100
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Faculty Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {facultyList
                .filter((f) => {
                  const matchDept = facultyDeptFilter === "ALL" || f.department.toLowerCase().includes(facultyDeptFilter.toLowerCase());
                  const q = facultySearchQuery.toLowerCase().trim();
                  const matchQuery = !q || f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || f.department.toLowerCase().includes(q);
                  return matchDept && matchQuery;
                })
                .map((fac) => {
                  const isSelected = selectedFacultyId === fac.id;
                  return (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => {
                        setSelectedFacultyId(fac.id);
                        notify(`Selected ${fac.name} — Loaded overall paper allocation & marks`);
                      }}
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#0B192C] text-white border-[#D4A72C] shadow-md ring-2 ring-[#D4A72C]/40"
                          : "bg-[#FAF8F5] text-gray-800 border-gray-200 hover:border-gray-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 ${
                              isSelected ? "bg-[#D4A72C] text-[#0B192C]" : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {fac.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-bold text-xs truncate ${isSelected ? "text-white" : "text-[#0B192C]"}`}>
                              {fac.name}
                            </p>
                            <span className={`text-[10px] block truncate font-mono ${isSelected ? "text-slate-300" : "text-gray-500"}`}>
                              {fac.id} &bull; {fac.department}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              isSelected ? "bg-white/10 text-amber-300" : "bg-white text-gray-600 border border-gray-200"
                            }`}
                          >
                            {fac.allocatedSubjects.length} Subj
                          </span>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-[#D4A72C] text-[#0B192C] flex items-center justify-center text-[9px] font-black">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] font-mono truncate">
                        <span className={isSelected ? "text-slate-300" : "text-gray-500"}>
                          Subj: {fac.allocatedSubjects.map((s) => s.subjectCode).join(", ")}
                        </span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center justify-between text-[11px] font-mono">
                        <span className={`font-bold ${isSelected ? "text-amber-300" : "text-blue-900"}`}>
                          {fac.totalAllottedScripts} Papers Allotted
                        </span>
                        <span className={`font-black ${isSelected ? "text-white" : "text-[#0B192C]"}`}>
                          &mu;: {fac.overallAverageMarks} / 100
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* STEP 2: SELECTED FACULTY EXECUTIVE DOSSIER */}
          {selectedFacultyStats && (
            <div className="space-y-6 animate-in fade-in">
              {/* Executive Faculty Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B192C] via-[#102035] to-[#1c324e] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl border border-[#D4A72C]/30 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-3xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center font-display font-black text-2xl shadow-lg border-2 border-white/20 shrink-0">
                    {selectedFacultyStats.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-black text-2xl text-white">
                        {selectedFacultyStats.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#EAB308] text-[#0B192C]">
                        {selectedFacultyStats.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-mono">
                      Faculty ID: <strong className="text-white">{selectedFacultyStats.id}</strong> &bull; Department:{" "}
                      <strong className="text-white">{selectedFacultyStats.department}</strong> &bull; Autonomous Valuation Panel
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                  <button
                    type="button"
                    onClick={() => handleExportFacultyOverallDossier(selectedFacultyStats)}
                    className="px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download size={14} /> Download Excel Dossier
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Printer size={14} /> Print Audit
                  </button>
                </div>
              </div>

              {/* 4 STATISTICAL KPI METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Overall Average Marks */}
                <div className="p-5 rounded-3xl bg-white border-2 border-blue-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">
                        OVERALL MARK AVERAGE (&mu;)
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-blue-950 mt-1 block font-mono">
                        {selectedFacultyStats.overallAverageMarks}
                        <span className="text-sm font-normal text-gray-500 ml-1">/ 100</span>
                      </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <Scale size={20} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">Across All Papers:</span>
                    <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedFacultyStats.allScripts.length} Papers Aggregated
                    </span>
                  </div>
                </div>

                {/* Metric 2: Total Paper Allocation */}
                <div className="p-5 rounded-3xl bg-white border-2 border-amber-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider block">
                        TOTAL PAPERS ALLOTTED
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-amber-950 mt-1 block font-mono">
                        {selectedFacultyStats.totalAllottedScripts}
                        <span className="text-sm font-normal text-gray-500 ml-1">Papers</span>
                      </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <BookOpen size={20} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">Allotted Bundles:</span>
                    <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded">
                      {selectedFacultyStats.allocatedSubjects.length} Curriculum Subjects
                    </span>
                  </div>
                </div>

                {/* Metric 3: Overall Dispersion */}
                <div className="p-5 rounded-3xl bg-white border-2 border-emerald-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                        STANDARD DEVIATION (&sigma;)
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-emerald-950 mt-1 block font-mono">
                        &plusmn;{selectedFacultyStats.overallStdDev}
                        <span className="text-sm font-normal text-gray-500 ml-1">Marks</span>
                      </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">Consistency:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      High Quality (&le; 8.5&sigma;)
                    </span>
                  </div>
                </div>

                {/* Metric 4: Valuation Pass Rate */}
                <div className="p-5 rounded-3xl bg-white border-2 border-purple-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider block">
                        VALUATION PASS RATE
                      </span>
                      <span className="font-display font-black text-3xl sm:text-4xl text-purple-950 mt-1 block font-mono">
                        {selectedFacultyStats.overallPassRate}%
                      </span>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0 shadow-2xs">
                      <Award size={20} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-500">Extrema:</span>
                    <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded">
                      Max: {selectedFacultyStats.highestMark} &bull; Min: {selectedFacultyStats.lowestMark}
                    </span>
                  </div>
                </div>
              </div>

              {/* OVERALL GRADE ATTAINMENT DISTRIBUTION BAR */}
              <div className="bg-white rounded-3xl border border-[#E5E1D8] p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-2">
                    <BarChart3 size={16} className="text-[#D4A72C]" />
                    GRADE ATTAINMENT DISTRIBUTION ON ALL ALLOTTED PAPERS ({selectedFacultyStats.allScripts.length} PAPERS):
                  </span>
                  <span className="text-xs font-mono text-gray-500">Autonomous Valuation Scale</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="font-mono font-black text-xl text-emerald-950 block">
                      {selectedFacultyStats.allScripts.filter((s) => s.grade === "O").length}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 block mt-0.5">Grade O (90-100)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                    <span className="font-mono font-black text-xl text-blue-950 block">
                      {selectedFacultyStats.allScripts.filter((s) => s.grade === "A+").length}
                    </span>
                    <span className="text-[11px] font-bold text-blue-800 block mt-0.5">Grade A+ (80-89)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                    <span className="font-mono font-black text-xl text-indigo-950 block">
                      {selectedFacultyStats.allScripts.filter((s) => s.grade === "A").length}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-800 block mt-0.5">Grade A (70-79)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="font-mono font-black text-xl text-amber-950 block">
                      {selectedFacultyStats.allScripts.filter((s) => s.grade === "B+").length}
                    </span>
                    <span className="text-[11px] font-bold text-amber-800 block mt-0.5">Grade B+ (60-69)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="font-mono font-black text-xl text-slate-900 block">
                      {selectedFacultyStats.allScripts.filter((s) => s.grade === "B").length}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 block mt-0.5">Grade B (50-59)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                    <span className="font-mono font-black text-xl text-red-950 block">
                      {selectedFacultyStats.allScripts.filter((s) => s.grade === "RA").length}
                    </span>
                    <span className="text-[11px] font-bold text-red-800 block mt-0.5">Grade RA (&lt;50)</span>
                  </div>
                </div>
              </div>

              {/* ALLOTTED SUBJECTS & BUNDLES BREAKDOWN TABLE */}
              <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5]">
                  <div>
                    <h4 className="font-display font-black text-base text-[#0B192C] flex items-center gap-2">
                      <BookOpen size={18} className="text-[#D4A72C]" />
                      Curriculum Subjects Allotted to {selectedFacultyStats.name} ({selectedFacultyStats.allocatedSubjects.length} Allotted Bundles)
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Breakdown of each curriculum subject, packet bundle code, assigned scripts, and respective average mark awarded.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-white rounded-xl border border-gray-200 text-xs font-mono font-black text-[#0B192C]">
                    Total Allotted: {selectedFacultyStats.totalAllottedScripts} Answer Scripts
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Subject Code &amp; Title</th>
                        <th className="py-3 px-4">Packet ID</th>
                        <th className="py-3 px-4 text-center">Allotted Scripts</th>
                        <th className="py-3 px-4 text-center bg-blue-950">Respective Avg (&mu;)</th>
                        <th className="py-3 px-4 text-center">Std Dev (&sigma;)</th>
                        <th className="py-3 px-4 text-center">Pass Rate</th>
                        <th className="py-3 px-4">Valuation Camp</th>
                        <th className="py-3 px-4">Deadline</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {selectedFacultyStats.allocatedSubjects.map((sub, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20 transition">
                          <td className="py-3 px-4">
                            <span className="font-mono font-black text-blue-900 block text-xs">{sub.subjectCode}</span>
                            <span className="font-bold text-gray-900 block mt-0.5">{sub.subjectTitle}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{sub.department} &bull; {sub.semester}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#0B192C]">
                            <span className="px-2 py-0.5 rounded bg-black/5 border border-black/10">
                              {sub.bundlePacketId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-blue-950 text-sm">
                            {sub.assignedScripts} Scripts
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-base text-blue-950 bg-blue-50/40">
                            {sub.averageMarks} <span className="text-[10px] font-normal text-gray-500">/ 100</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-amber-900">
                            &plusmn;{sub.stdDev}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {Math.round((sub.passCount / sub.assignedScripts) * 100)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{sub.campVenue}</td>
                          <td className="py-3 px-4 font-mono text-red-600 font-bold">{sub.deadlineDate}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const targetAlloc = allocations.find((a) => a.id === sub.allocationId);
                                if (targetAlloc) {
                                  const targetStaff = targetAlloc.assignedStaff.find((s) => s.id === selectedFacultyStats.id || s.facultyId === selectedFacultyStats.id || s.name === selectedFacultyStats.name);
                                  if (targetStaff) {
                                    setInspectingFacultyModal({ staff: targetStaff, allocation: targetAlloc });
                                  }
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-[11px] transition cursor-pointer shadow-xs"
                            >
                              Inspect Scripts
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMPLETE SCRIPT-BY-SCRIPT ALLOTTED PAPERS ROSTER */}
              <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h4 className="font-display font-black text-base text-[#0B192C]">
                      Script-by-Script Evaluated Papers Roster ({selectedFacultyStats.allScripts.length} Papers)
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Autonomous COE blind barcodes, Part A &amp; Part B marks, and awarded grades for all papers allotted to this faculty.
                    </p>
                  </div>

                  {/* Filter by Subject & Grade */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={facultySubjectFilter}
                      onChange={(e) => setFacultySubjectFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] bg-white cursor-pointer"
                    >
                      <option value="ALL">All Subjects ({selectedFacultyStats.allocatedSubjects.length})</option>
                      {selectedFacultyStats.allocatedSubjects.map((s) => (
                        <option key={s.subjectCode} value={s.subjectCode}>
                          {s.subjectCode} — {s.bundlePacketId}
                        </option>
                      ))}
                    </select>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={facultyScriptSearch}
                        onChange={(e) => setFacultyScriptSearch(e.target.value)}
                        placeholder="Search dummy barcode..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 font-medium text-xs text-[#0B192C] bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">S.No</th>
                        <th className="py-2.5 px-3">Subject Code</th>
                        <th className="py-2.5 px-3">Script Barcode</th>
                        <th className="py-2.5 px-3">COE Dummy Mask</th>
                        <th className="py-2.5 px-3 text-center">Part A (/20)</th>
                        <th className="py-2.5 px-3 text-center">Part B (/80)</th>
                        <th className="py-2.5 px-3 text-center bg-blue-950">Total (/100)</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {selectedFacultyStats.allScripts
                        .filter((s) => {
                          const matchSub = facultySubjectFilter === "ALL" || s.subjectCode === facultySubjectFilter;
                          const q = facultyScriptSearch.toLowerCase().trim();
                          const matchQ = !q || s.scriptBarcode.toLowerCase().includes(q) || s.dummyCode.toLowerCase().includes(q);
                          return matchSub && matchQ;
                        })
                        .map((s, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/20 transition">
                            <td className="py-2 px-3 font-mono text-gray-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-blue-900">{s.subjectCode}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#0B192C]">{s.scriptBarcode}</td>
                            <td className="py-2 px-3 font-mono font-black text-blue-900 bg-blue-50/50">{s.dummyCode}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-gray-700">{s.partAMarks}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-gray-700">{s.partBMarks}</td>
                            <td className="py-2 px-3 text-center font-mono font-black text-sm text-blue-950 bg-blue-50/40">
                              {s.totalMarks}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                                  s.grade === "O"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : s.grade === "A+" || s.grade === "A"
                                    ? "bg-blue-100 text-blue-800"
                                    : s.grade === "B+" || s.grade === "B"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {s.grade}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-500">{s.evaluatedAt}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  s.status === "VERIFIED"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* INSPECTION / PRINT MEMO MODAL */}
      {inspectionAllocation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/engineering-logo.png"
                  alt="Seal"
                  className="h-12 w-12 rounded-full border border-gray-300 p-0.5 object-contain"
                />
                <div>
                  <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                    KARPAGA VINAYAGA COLLEGE OF ENGINEERING AND TECHNOLOGY
                  </span>
                  <h3 className="font-display font-black text-lg text-[#0B192C]">
                    Official Paper Correction Allocation Memo
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Ref: {inspectionAllocation.id} • Issued by Office of Associate Dean (Academics)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectionAllocation(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Memo Details Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Subject</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {inspectionAllocation.subjectCode} — {inspectionAllocation.subjectTitle}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Academic Year &amp; Sem</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {inspectionAllocation.academicYear} · {inspectionAllocation.semester}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Total Scripts</span>
                  <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">
                    {inspectionAllocation.totalAnswerScripts} Scripts
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Valuation Camp</span>
                  <span className="font-bold text-gray-900 mt-0.5 block truncate">
                    {inspectionAllocation.campVenue}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Evaluation Deadline</span>
                  <span className="font-bold text-red-600 mt-0.5 block">
                    {inspectionAllocation.deadlineDate}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold block">Authorized Officer</span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {inspectionAllocation.adApprovedBy}
                  </span>
                </div>
              </div>

              {/* Evaluators Table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-gray-700 font-extrabold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Packet ID</th>
                      <th className="py-2.5 px-3">Evaluator Name</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3 text-center">Scripts</th>
                      <th className="py-2.5 px-3">Valuation System</th>
                      <th className="py-2.5 px-3 text-center">Receipt Sign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {inspectionAllocation.assignedStaff.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0B192C]">
                          {staff.bundlePacketId}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-gray-900 block">{staff.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{staff.facultyId}</span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-semibold">{staff.role}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-900">
                          {staff.assignedScripts}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-800 text-[11px] font-bold">
                          COE Blind Batch ({staff.assignedScripts} Dummy Barcodes)
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-gray-300">
                          _______________
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures Block */}
              <div className="pt-6 flex items-end justify-between text-center text-xs">
                <div>
                  <div className="h-10 border-b border-gray-400 w-40 mb-1" />
                  <p className="font-bold text-gray-800">Central Valuation Chief</p>
                  <p className="text-[10px] text-gray-500">Camp In-Charge</p>
                </div>
                <div>
                  <div className="h-10 border-b border-gray-400 w-44 mb-1" />
                  <p className="font-bold text-[#0B192C]">Dr. K. R. Ramanathan</p>
                  <p className="text-[10px] text-gray-500">Associate Dean (Academics)</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <button
                onClick={() => handleExportExcel(inspectionAllocation)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#0B192C] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Download Excel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Print Memo
                </button>
                <button
                  onClick={() => setInspectionAllocation(null)}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COE CENTRAL MASTER KEY INSPECTION MODAL */}
      {showMasterKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#0B192C] text-white shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center font-black shadow-md shrink-0">
                  <Lock size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                      CENTRAL COE KEY SYSTEM · STRICT MASKING
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-red-900/60 text-amber-300 border border-amber-400/30">
                      Dean / COE Eyes Only
                    </span>
                  </div>
                  <h3 className="font-display font-black text-lg text-white">
                    COE Central Master Key &amp; De-Masking Architecture
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Step 2: Dean only maps answer scripts to faculties &bull; Dummy barcodes conceal candidate identities
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMasterKeyModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 bg-[#FAF8F5]">
              {/* Architecture Lifecycle Diagram */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B192C] via-[#102035] to-[#1c324e] text-white border-2 border-[#D4A72C]/40 shadow-md space-y-4">
                <span className="text-[10px] font-black uppercase text-[#EAB308] tracking-widest block">
                  5-STEP BLIND VALUATION LIFECYCLE
                </span>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-[9px] text-[#D4A72C] font-black uppercase block">1. STUDENT SCRIPT</span>
                    <span className="font-bold text-white block mt-1">ABI T</span>
                    <span className="font-mono text-[10px] text-slate-300">20260110226001</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#D4A72C]/20 border border-[#D4A72C]/50">
                    <span className="text-[9px] text-[#EAB308] font-black uppercase block">2. COE MASTER KEY</span>
                    <span className="font-mono font-bold text-white block mt-1">SCR-001</span>
                    <span className="font-mono text-[10px] text-amber-300 font-bold">&rarr; DMY-84291</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-[9px] text-[#D4A72C] font-black uppercase block">3. FACULTY DESK</span>
                    <span className="font-mono font-bold text-amber-400 block mt-1">DMY-84291</span>
                    <span className="text-[10px] text-slate-300">Blind: 84 / 100</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-[9px] text-[#D4A72C] font-black uppercase block">4. DE-MASK JOIN</span>
                    <span className="font-mono font-bold text-emerald-400 block mt-1">COE Re-Link</span>
                    <span className="text-[10px] text-emerald-200">Key Authenticated</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                    <span className="text-[9px] text-[#D4A72C] font-black uppercase block">5. DEAN &amp; PUBLISH</span>
                    <span className="font-bold text-white block mt-1">ABI T (84/100)</span>
                    <span className="text-[10px] text-purple-300 font-bold">Grade: A+</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#D4A72C] shrink-0" />
                  <span>
                    <strong>Step 2 Protocol:</strong> The Dean only maps the answer scripts equally to evaluating faculties. The secret lookup table remains sealed in the database until submitted marks are de-masked in Step 4/5.
                  </span>
                </div>
              </div>

              {/* Sample Locked Lookup Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-display font-extrabold text-xs text-[#0B192C]">
                    COE Central Master Key Lookup Table (Locked in COE/Dean DB)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-500">
                    Table: kvell_coe_master_key_ai602
                  </span>
                </div>

                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Student Reg No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Script ID</th>
                        <th className="py-2.5 px-3">Dummy Barcode</th>
                        <th className="py-2.5 px-3">Allocated Faculty</th>
                        <th className="py-2.5 px-3">Flap Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      <tr className="bg-amber-50/40">
                        <td className="py-2 px-3 font-mono font-black text-[#0B192C]">20260110226001</td>
                        <td className="py-2 px-3 font-bold text-[#0B192C]">ABI T</td>
                        <td className="py-2 px-3 font-mono text-gray-600">SCR-001</td>
                        <td className="py-2 px-3 font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                          DMY-84291
                        </td>
                        <td className="py-2 px-3 text-gray-700">Prof. K. Venkatesh (PKT-AI602-A)</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-900">
                            Masked / Concealed
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono text-gray-700">20260110226002</td>
                        <td className="py-2 px-3 text-gray-800">ABISHEK M</td>
                        <td className="py-2 px-3 font-mono text-gray-600">SCR-002</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">DMY-84292</td>
                        <td className="py-2 px-3 text-gray-700">Prof. K. Venkatesh (PKT-AI602-A)</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-900">
                            Masked / Concealed
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono text-gray-700">20260110226026</td>
                        <td className="py-2 px-3 text-gray-800">LOGESH R</td>
                        <td className="py-2 px-3 font-mono text-gray-600">SCR-026</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">DMY-84316</td>
                        <td className="py-2 px-3 text-gray-700">Dr. S. Mohan (PKT-AI602-B)</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-900">
                            Masked / Concealed
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowMasterKeyModal(false)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white font-bold text-xs hover:bg-[#152744] transition cursor-pointer"
              >
                Close Master Key Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AD INSPECTION CONSOLE - FACULTY ALLOTTED PAPERS & VALUATION PERFORMANCE */}
      {inspectingFacultyModal && (() => {
        const staff = inspectingFacultyModal.staff;
        const alloc = inspectingFacultyModal.allocation;

        const overallFacStats =
          facultyOverallMap.get(staff.facultyId || staff.name) ||
          Array.from(facultyOverallMap.values()).find(
            (f) => f.name.toLowerCase().includes(staff.name.toLowerCase().trim())
          );

        const isOverallMode = inspectModalTab === "overall";

        const subjectScripts =
          staff.allottedScripts && staff.allottedScripts.length > 0
            ? staff.allottedScripts
            : generateFacultyScripts(
                staff.name,
                staff.bundlePacketId,
                alloc.subjectCode,
                staff.assignedScripts,
                staff.averageMarks || 68.0,
                staff.stdDev || 6.8
              );

        const scriptsList = isOverallMode && overallFacStats?.allScripts?.length
          ? overallFacStats.allScripts
          : subjectScripts;

        // Filter scripts based on grade filter and search
        const filteredScripts = scriptsList.filter((s) => {
          const matchGrade = scriptFilterGrade === "ALL" || s.grade === scriptFilterGrade;
          const q = scriptSearchQuery.toLowerCase().trim();
          const matchSearch =
            !q ||
            s.scriptBarcode.toLowerCase().includes(q) ||
            s.dummyCode.toLowerCase().includes(q) ||
            s.subjectCode?.toLowerCase().includes(q);
          return matchGrade && matchSearch;
        });

        const countO = scriptsList.filter((s) => s.grade === "O").length;
        const countAPlus = scriptsList.filter((s) => s.grade === "A+").length;
        const countA = scriptsList.filter((s) => s.grade === "A").length;
        const countBPlus = scriptsList.filter((s) => s.grade === "B+").length;
        const countB = scriptsList.filter((s) => s.grade === "B").length;
        const countRA = scriptsList.filter((s) => s.grade === "RA").length;

        const otherStaff = alloc.assignedStaff.filter((s) => s.id !== staff.id);

        const handleExportFacultyScripts = () => {
          const rows = scriptsList.map((s, idx) => ({
            "Sl No": idx + 1,
            "Faculty Name": staff.name,
            "Faculty ID": staff.facultyId,
            "Bundle Packet ID": staff.bundlePacketId,
            "Subject Code": s.subjectCode || alloc.subjectCode,
            "Subject Title": s.subjectTitle || alloc.subjectTitle,
            "Script Barcode": s.scriptBarcode,
            "COE Dummy Barcode": s.dummyCode,
            "Part A Marks (Max 20)": s.partAMarks,
            "Part B Marks (Max 80)": s.partBMarks,
            "Total Marks (Max 100)": s.totalMarks,
            "Awarded Grade": s.grade,
            "Valuation Timestamp": s.evaluatedAt,
            "Scrutiny Status": s.status,
            "Faculty Rubric Remarks": s.remarks,
          }));
          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, "Allotted_Scripts");
          XLSX.writeFile(wb, `AD_Inspection_${staff.facultyId}_${isOverallMode ? "Overall" : alloc.subjectCode}_Scripts.xlsx`);
          notify(`Exported ${staff.name}'s allotted papers roster to Excel`);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-6 max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src="/engineering-logo.png"
                    alt="Seal"
                    className="h-12 w-12 rounded-full border border-gray-300 p-0.5 object-contain shadow-xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                        OFFICE OF THE ASSOCIATE DEAN &bull; VALUATION INSPECTION CONSOLE
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#0B192C] text-[#D4A72C]">
                        FACULTY PERFORMANCE AUDIT
                      </span>
                    </div>
                    <h3 className="font-display font-black text-lg text-[#0B192C] mt-0.5">
                      Faculty Allotted Papers &amp; Valuation Performance Inspection
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">
                      Faculty: <strong className="text-gray-900">{staff.name} ({staff.facultyId})</strong> &bull; Total Allocation:{" "}
                      <strong className="text-blue-900">
                        {overallFacStats?.totalAllottedScripts || staff.assignedScripts} Papers Allotted
                      </strong>{" "}
                      &bull; Overall Avg:{" "}
                      <strong className="text-amber-900">
                        &mu;: {overallFacStats?.overallAverageMarks || staff.averageMarks} / 100
                      </strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingFacultyModal(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body Container with Scroll */}
              <div className="overflow-y-auto space-y-5 pr-1">
                {/* Switcher to Compare other co-evaluators on this same paper */}
                {otherStaff.length > 0 && (
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-blue-900 shrink-0" />
                      <span className="font-bold text-blue-950">
                        Cross-Faculty Comparison for {alloc.subjectCode}:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {otherStaff.map((other) => (
                        <button
                          key={other.id}
                          type="button"
                          onClick={() => setInspectingFacultyModal({ staff: other, allocation: alloc })}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-100 text-blue-950 border border-blue-300 font-bold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <UserCheck size={13} className="text-blue-800" />
                          <span>Switch to: {other.name} ({other.averageMarks || 65.2} / 100)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Faculty Profile Banner with Overall Allocation Highlights */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B192C] via-[#102035] to-[#1c324e] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-[#D4A72C]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#D4A72C] text-[#0B192C] flex items-center justify-center font-display font-black text-base shrink-0 shadow-sm">
                      {staff.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-black text-base text-white">{staff.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#EAB308] text-[#0B192C]">
                          {staff.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 font-mono">
                        ID: {staff.facultyId} &bull; Dept: {staff.department} &bull; Current Subject: {alloc.subjectCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-white/10 text-center border border-white/10">
                      <span className="text-[9px] text-amber-300 uppercase block font-bold">Overall Allotted Papers</span>
                      <span className="text-white font-black text-sm">
                        {overallFacStats?.totalAllottedScripts || staff.assignedScripts} Papers ({overallFacStats?.allocatedSubjects.length || 1} Subj)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/10 text-center border border-white/10">
                      <span className="text-[9px] text-blue-300 uppercase block font-bold">Overall Mark Avg (&mu;)</span>
                      <span className="text-white font-black text-sm">
                        {overallFacStats?.overallAverageMarks || staff.averageMarks} / 100
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/10 text-center border border-white/10">
                      <span className="text-[9px] text-emerald-300 uppercase block font-bold">{alloc.subjectCode} Packet Avg</span>
                      <span className="text-white font-black text-sm">
                        {staff.averageMarks ?? 68.4} / 100
                      </span>
                    </div>
                  </div>
                </div>

                {/* MODAL VIEW TOGGLE: OVERALL ALLOTTED PAPERS VS THIS SUBJECT ONLY */}
                <div className="flex items-center justify-between p-1.5 bg-[#FAF8F5] rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectModalTab("overall")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                        isOverallMode
                          ? "bg-[#0B192C] text-[#D4A72C] shadow-sm ring-1 ring-[#D4A72C]/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      }`}
                    >
                      <Layers size={14} />
                      <span>
                        Overall Allotment &amp; Mark Avg ({overallFacStats?.totalAllottedScripts || staff.assignedScripts} Papers across {overallFacStats?.allocatedSubjects.length || 1} Subjects)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectModalTab("subject")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                        !isOverallMode
                          ? "bg-[#0B192C] text-[#D4A72C] shadow-sm ring-1 ring-[#D4A72C]/40"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white"
                      }`}
                    >
                      <FileText size={14} />
                      <span>
                        Current Subject Bundle ({alloc.subjectCode} &bull; {staff.assignedScripts} Scripts)
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (overallFacStats) {
                        setSelectedFacultyId(overallFacStats.id);
                        setActiveTab("faculty-overview");
                        setInspectingFacultyModal(null);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-amber-300"
                  >
                    <span>Full Faculty Hub</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* 4 Performance Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase block">
                      {isOverallMode ? "Overall Mark Avg (\u03bc)" : "Subject Mark Avg (\u03bc)"}
                    </span>
                    <span className="font-display font-black text-2xl text-blue-950 mt-1 block font-mono">
                      {isOverallMode
                        ? (overallFacStats?.overallAverageMarks || staff.averageMarks)
                        : (staff.averageMarks ?? 68.4)}{" "}
                      <span className="text-xs font-normal text-blue-600">/ 100</span>
                    </span>
                    <span className="text-[11px] text-blue-800 font-mono font-bold mt-0.5 block">
                      {isOverallMode
                        ? `Across all ${overallFacStats?.allocatedSubjects.length || 1} assigned subjects`
                        : `${alloc.subjectCode} bundle packet`}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-extrabold text-amber-700 uppercase block">
                      {isOverallMode ? "Overall Paper Allocation" : "Subject Paper Allocation"}
                    </span>
                    <span className="font-display font-black text-2xl text-amber-950 mt-1 block font-mono">
                      {isOverallMode
                        ? (overallFacStats?.totalAllottedScripts || staff.assignedScripts)
                        : staff.assignedScripts}{" "}
                      <span className="text-xs font-normal text-amber-600">Papers</span>
                    </span>
                    <span className="text-[11px] text-amber-800 font-mono font-bold mt-0.5 block">
                      {isOverallMode
                        ? `${overallFacStats?.allocatedSubjects.length || 1} Curriculum Subjects`
                        : `Packet ${staff.bundlePacketId}`}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">
                      {isOverallMode ? "Total Evaluated Count" : "Subject Evaluated"}
                    </span>
                    <span className="font-display font-black text-2xl text-emerald-950 mt-1 block font-mono">
                      {isOverallMode
                        ? (overallFacStats?.totalEvaluatedScripts || staff.assignedScripts)
                        : (staff.evaluatedScripts ?? staff.assignedScripts)}{" "}
                      <span className="text-xs font-normal text-emerald-600">
                        / {isOverallMode ? (overallFacStats?.totalAllottedScripts || staff.assignedScripts) : staff.assignedScripts}
                      </span>
                    </span>
                    <span className="text-[11px] text-emerald-800 font-mono font-bold mt-0.5 block">
                      100% Completed on Camp
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                    <span className="text-[10px] font-extrabold text-purple-700 uppercase block">Valuation Pass Rate</span>
                    <span className="font-display font-black text-2xl text-purple-950 mt-1 block font-mono">
                      {isOverallMode
                        ? (overallFacStats?.overallPassRate || 95)
                        : Math.round(((staff.passCount ?? staff.assignedScripts) / staff.assignedScripts) * 100)}%
                    </span>
                    <span className="text-[11px] text-purple-800 font-mono font-bold mt-0.5 block">
                      Highest: {isOverallMode ? (overallFacStats?.highestMark || 94) : (staff.highestMark ?? 92)} &bull; Lowest:{" "}
                      {isOverallMode ? (overallFacStats?.lowestMark || 45) : (staff.lowestMark ?? 44)}
                    </span>
                  </div>
                </div>

                {/* If Overall Mode: Show Table of All Allotted Subjects and Respective Mark Averages */}
                {isOverallMode && overallFacStats && (
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-[#0B192C] flex items-center gap-2">
                        <BookOpen size={16} className="text-[#D4A72C]" />
                        All Curriculum Subjects Allotted to {staff.name} ({overallFacStats.allocatedSubjects.length} Bundles):
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                        Total: {overallFacStats.totalAllottedScripts} Papers &bull; Weighted Avg: {overallFacStats.overallAverageMarks}/100
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0B192C] text-white uppercase text-[9px] font-bold tracking-wider">
                          <tr>
                            <th className="py-2 px-3">Subject Code &amp; Title</th>
                            <th className="py-2 px-3">Packet ID</th>
                            <th className="py-2 px-3 text-center">Allotted Papers</th>
                            <th className="py-2 px-3 text-center bg-blue-950">Respective Avg (&mu;)</th>
                            <th className="py-2 px-3 text-center">Std Dev (&sigma;)</th>
                            <th className="py-2 px-3">Deadline</th>
                            <th className="py-2 px-3 text-center">Valuation Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {overallFacStats.allocatedSubjects.map((sub, sIdx) => (
                            <tr
                              key={sIdx}
                              className={sub.subjectCode === alloc.subjectCode ? "bg-amber-50/50 font-bold" : "hover:bg-gray-50"}
                            >
                              <td className="py-2 px-3">
                                <span className="font-mono text-blue-900 font-bold">{sub.subjectCode}</span> — {sub.subjectTitle}
                                {sub.subjectCode === alloc.subjectCode && (
                                  <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] bg-amber-200 text-amber-900 font-bold">
                                    Current
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold">{sub.bundlePacketId}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-blue-900">
                                {sub.assignedScripts} Scripts
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-black text-sm text-blue-950 bg-blue-50/50">
                                {sub.averageMarks} / 100
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-amber-900">
                                &plusmn;{sub.stdDev}
                              </td>
                              <td className="py-2 px-3 font-mono text-red-600 font-bold">{sub.deadlineDate}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Grade Distribution Breakdown Bar */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0B192C] uppercase text-[10px] tracking-wider">
                      GRADE ATTAINMENT DISTRIBUTION ON {isOverallMode ? "ALL ALLOTTED PAPERS" : `${alloc.subjectCode} PAPERS`} ({scriptsList.length} PAPERS):
                    </span>
                    <span className="font-mono text-[10px] text-gray-500 font-bold">
                      Autonomous R-2023 Grade Scales
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300">
                      <span className="font-black block font-mono text-base">{countO}</span>
                      <span className="text-[10px] font-bold block">O (90-100)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-950 border border-blue-300">
                      <span className="font-black block font-mono text-base">{countAPlus}</span>
                      <span className="text-[10px] font-bold block">A+ (80-89)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-100 text-indigo-950 border border-indigo-300">
                      <span className="font-black block font-mono text-base">{countA}</span>
                      <span className="text-[10px] font-bold block">A (70-79)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-950 border border-amber-300">
                      <span className="font-black block font-mono text-base">{countBPlus}</span>
                      <span className="text-[10px] font-bold block">B+ (60-69)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-900 border border-slate-300">
                      <span className="font-black block font-mono text-base">{countB}</span>
                      <span className="text-[10px] font-bold block">B (50-59)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-red-100 text-red-950 border border-red-300">
                      <span className="font-black block font-mono text-base">{countRA}</span>
                      <span className="text-[10px] font-bold block">RA (&lt;50)</span>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar for Allotted Scripts Table */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={scriptSearchQuery}
                      onChange={(e) => setScriptSearchQuery(e.target.value)}
                      placeholder="Search dummy barcode, subject code..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 font-medium text-xs text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Grade:</span>
                    {["ALL", "O", "A+", "A", "B+", "B", "RA"].map((gr) => (
                      <button
                        key={gr}
                        type="button"
                        onClick={() => setScriptFilterGrade(gr)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                          scriptFilterGrade === gr
                            ? "bg-[#0B192C] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {gr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All Allotted Papers Roster Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">S.No</th>
                        {isOverallMode && <th className="py-2.5 px-3">Subject</th>}
                        <th className="py-2.5 px-3">Script Barcode</th>
                        <th className="py-2.5 px-3">COE Dummy Mask</th>
                        <th className="py-2.5 px-3 text-center">Part A (/20)</th>
                        <th className="py-2.5 px-3 text-center">Part B (/80)</th>
                        <th className="py-2.5 px-3 text-center bg-blue-950">Total (/100)</th>
                        <th className="py-2.5 px-3 text-center">Grade</th>
                        <th className="py-2.5 px-3">Valuation Timestamp</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium bg-white">
                      {filteredScripts.length === 0 ? (
                        <tr>
                          <td colSpan={isOverallMode ? 10 : 9} className="py-8 text-center text-gray-500">
                            No scripts match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredScripts.map((s, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/20 transition">
                            <td className="py-2.5 px-3 font-mono text-gray-500 font-bold">{idx + 1}</td>
                            {isOverallMode && (
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                                {s.subjectCode || alloc.subjectCode}
                              </td>
                            )}
                            <td className="py-2.5 px-3 font-mono font-bold text-[#0B192C]">{s.scriptBarcode}</td>
                            <td className="py-2.5 px-3 font-mono font-black text-blue-900 bg-blue-50/50">
                              {s.dummyCode}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-700">
                              {s.partAMarks}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-700">
                              {s.partBMarks}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-blue-950 bg-blue-50/40">
                              {s.totalMarks}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${
                                  s.grade === "O"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : s.grade === "A+" || s.grade === "A"
                                    ? "bg-blue-100 text-blue-800"
                                    : s.grade === "B+" || s.grade === "B"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {s.grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500">{s.evaluatedAt}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  s.status === "VERIFIED"
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportFacultyScripts}
                    className="px-4 py-2 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download size={14} /> Export Allotted Scripts (Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer size={14} /> Print Audit
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      notify(`Associate Dean Certified & Approved evaluation for ${staff.name} (${staff.bundlePacketId})`);
                      setInspectingFacultyModal(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Check size={14} className="text-[#D4A72C]" />
                    <span>Associate Dean Inspection Certified</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PaperCorrectionView;
