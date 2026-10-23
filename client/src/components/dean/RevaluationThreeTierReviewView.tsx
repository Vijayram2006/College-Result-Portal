import React, { useState, useMemo } from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  X,
  Award,
  Sparkles,
  Building2,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  FileCheck,
  RefreshCw,
  Sliders,
  Check,
  Scale,
  UserPlus,
  Compass,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

export interface ValuationProcedureRecord {
  id: string; // e.g., "REV-2026-001"
  studentRegNo: string;
  studentName: string;
  department: string;
  semester: string;
  academicYear: string;
  subjectCode: string;
  subjectTitle: string;
  dummyBarcode: string;
  packetId: string;

  // EXAMINER 1: First Valuation (Regular Faculty Examiner)
  proc1: {
    examinerName: string;
    examinerId: string;
    role: string;
    department: string;
    partAMarks: number;
    partBCMarks: number;
    totalMarks: number;
    grade: string;
    evaluatedDate: string;
  };

  // Re-evaluation Application Details
  application: {
    applicationRef: string;
    appliedDate: string;
    feeReceiptNo: string;
    feeAmount: number;
    reason: string;
    status:
      | "APPLICATION_APPROVED"
      | "PENDING_EXAMINER_2"
      | "UNDER_SECOND_EVALUATION"
      | "PENDING_EXAMINER_3"
      | "THIRD_VALUATION_PENDING"
      | "RATIFIED";
  };

  // EXAMINER 2: Re-evaluation (Second Independent Examiner)
  proc2: {
    allotmentStatus: "PENDING_ALLOTMENT" | "ALLOTTED" | "EVALUATED";
    examinerName?: string;
    examinerId?: string;
    role?: string;
    institution?: string;
    allottedDate?: string;
    partAMarks?: number;
    partBCMarks?: number;
    totalMarks?: number;
    grade?: string;
    evaluatedDate?: string;
    remarks?: string;
  };

  // MARK DIFFERENCE (|M1 - M2|)
  markDifference?: number;
  isThirdValuationTriggered: boolean; // true if markDifference > 10

  // EXAMINER 3: Third Valuation (Triggered only when markDifference > 10)
  proc3?: {
    allotmentStatus: "NOT_REQUIRED" | "PENDING_ALLOTMENT" | "ALLOTTED" | "EVALUATED";
    examinerName?: string;
    examinerId?: string;
    role?: string;
    institution?: string;
    allottedDate?: string;
    partAMarks?: number;
    partBCMarks?: number;
    totalMarks?: number;
    grade?: string;
    evaluatedDate?: string;
    resolutionFormula?: string; // e.g. "Nearest Two Marks Average: (M2 + M3)/2"
    chiefRationale?: string;
  };

  // Final Ratified Result
  finalOutcome: {
    awardedMarks: number;
    grade: string;
    markShift: number; // awardedMarks - proc1.totalMarks
    status:
      | "FIRST_VALUATION_CONFIRMED"
      | "REVAL_ACCEPTED_NORMAL"
      | "THIRD_VALUATION_RESOLVED"
      | "AWAITING_CHIEF_RATIFICATION"
      | "AWAITING_EXAMINER_2"
      | "AWAITING_EXAMINER_3";
    approvedBy: string;
    ratifiedDate?: string;
  };
}

// Curated pool of independent examiners available for Examiner 2 allotment
export const EXAMINER_2_POOL = [
  { name: "Dr. S. Mohan", id: "FAC-EXT-501", role: "External Examiner", institution: "Anna University Regional Campus" },
  { name: "Dr. P. Suresh", id: "FAC-EXT-504", role: "External Examiner", institution: "MIT Chennai" },
  { name: "Dr. N. Sundaram", id: "FAC-EXT-508", role: "External Examiner", institution: "SSN College of Engineering" },
  { name: "Dr. Kavitha Raman", id: "FAC-EXT-402", role: "External Examiner", institution: "PSG College of Technology" },
  { name: "Dr. Meenakshi S.", id: "FAC-EXT-302", role: "External Examiner", institution: "SRM Institute of Science & Technology" },
  { name: "Dr. V. Karthik", id: "FAC-EXT-605", role: "External Examiner", institution: "Thiagarajar College of Engineering" },
  { name: "Dr. Meganathan K.", id: "FAC-EXT-512", role: "External Examiner", institution: "College of Engineering Guindy (CEG)" },
  { name: "Dr. Ananya Menon", id: "FAC-EXT-202", role: "Independent Valuer", institution: "Government College of Technology" },
];

// Senior subject specialists / autonomous board pool for Examiner 3 allotment (Triggered when Δ > 10)
export const EXAMINER_3_POOL = [
  {
    name: "Dr. K. R. Ramanathan",
    id: "CHIEF-VAL-01",
    role: "Chief Subject Expert & Autonomous Valuation Chairman",
    institution: "Karpaga Vinayaga Autonomous Board",
  },
  {
    name: "Dr. T. Balakrishnan",
    id: "CHIEF-VAL-02",
    role: "Senior Professor & Autonomous Board Vice Chairman",
    institution: "Karpaga Vinayaga Autonomous Board",
  },
  {
    name: "Dr. R. Natarajan",
    id: "CHIEF-VAL-03",
    role: "Dean of Academic Standards & Valuation Warden",
    institution: "Karpaga Vinayaga Autonomous Board",
  },
  {
    name: "Dr. G. Sivakumar",
    id: "CHIEF-VAL-04",
    role: "Chief Evaluation Board Member & Emeritus Professor",
    institution: "Karpaga Vinayaga Autonomous Board",
  },
  {
    name: "Dr. H. Jayashree",
    id: "CHIEF-VAL-05",
    role: "Senior Mathematical Sciences Ombudsman",
    institution: "Karpaga Vinayaga Autonomous Board",
  },
];

// Initial Realistic Dataset across multiple departments demonstrating Examiner 2 & Examiner 3 allotment states
const INITIAL_REVALUATION_RECORDS: ValuationProcedureRecord[] = [
  // 1. AI&DS - Procedural 3 resolved
  {
    id: "REV-2026-001",
    studentRegNo: "20260110226001",
    studentName: "ABI T",
    department: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "CS26C02T",
    subjectTitle: "Fundamentals of Data Science",
    dummyBarcode: "DMY-74892 (KV-619284)",
    packetId: "PKT-A",
    proc1: {
      examinerName: "Dr. Ananya Menon",
      examinerId: "FAC-ENG-202",
      role: "Internal Examiner",
      department: "CSE",
      partAMarks: 10,
      partBCMarks: 32,
      totalMarks: 42,
      grade: "RA",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-01",
      appliedDate: "2026-10-17",
      feeReceiptNo: "KVELL-REC-8921",
      feeAmount: 600,
      reason: "Part B Question 14 derivation steps not properly credited in initial valuation.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. S. Mohan",
      examinerId: "FAC-EXT-501",
      role: "External Examiner",
      institution: "Anna University Regional Campus",
      allottedDate: "2026-10-18",
      partAMarks: 14,
      partBCMarks: 42,
      totalMarks: 56,
      grade: "B",
      evaluatedDate: "2026-10-19",
      remarks: "Question 14 algorithm steps completely valid; Part B awarded +10 marks.",
    },
    markDifference: 14, // |42 - 56| = 14 > 10 -> EXAMINER 3 TRIGGERED!
    isThirdValuationTriggered: true,
    proc3: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. K. R. Ramanathan",
      examinerId: "CHIEF-VAL-01",
      role: "Chief Subject Expert & Valuation Chairman",
      institution: "Karpaga Vinayaga Autonomous Board",
      allottedDate: "2026-10-20",
      partAMarks: 13,
      partBCMarks: 41,
      totalMarks: 54,
      grade: "B",
      evaluatedDate: "2026-10-21",
      resolutionFormula: "Average of two nearest marks: (56 + 54) / 2 = 55",
      chiefRationale: "First examiner missed secondary gradient proof. Examiner 2 and 3 marks converge closely.",
    },
    finalOutcome: {
      awardedMarks: 55,
      grade: "B",
      markShift: 13,
      status: "THIRD_VALUATION_RESOLVED",
      approvedBy: "Associate Dean (Academics) & Controller of Examinations",
      ratifiedDate: "2026-10-21",
    },
  },

  // 2. AI&DS - Normal Re-eval (Delta <= 10)
  {
    id: "REV-2026-002",
    studentRegNo: "20260110226002",
    studentName: "ABISHEK S R",
    department: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "MA26C01T",
    subjectTitle: "Matrices and Calculus",
    dummyBarcode: "DMY-38192 (KV-482910)",
    packetId: "PKT-B",
    proc1: {
      examinerName: "Prof. K. Venkatesh",
      examinerId: "FAC-ENG-104",
      role: "Internal Examiner",
      department: "Mathematics & AI",
      partAMarks: 14,
      partBCMarks: 48,
      totalMarks: 62,
      grade: "B+",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-02",
      appliedDate: "2026-10-17",
      feeReceiptNo: "KVELL-REC-8922",
      feeAmount: 600,
      reason: "Eigenvalues calculation in Question 11 awarded partial marks.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. P. Suresh",
      examinerId: "FAC-EXT-504",
      role: "External Examiner",
      institution: "MIT Chennai",
      allottedDate: "2026-10-18",
      partAMarks: 16,
      partBCMarks: 52,
      totalMarks: 68,
      grade: "B+",
      evaluatedDate: "2026-10-19",
      remarks: "Slightly more generous on intermediate reduction steps; awarded +6 marks.",
    },
    markDifference: 6, // |62 - 68| = 6 <= 10 -> EXAMINER 3 NOT NEEDED!
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 68,
      grade: "B+",
      markShift: 6,
      status: "REVAL_ACCEPTED_NORMAL",
      approvedBy: "Associate Dean (Academics)",
      ratifiedDate: "2026-10-20",
    },
  },

  // 3. AI&DS - Procedural 3 resolved
  {
    id: "REV-2026-003",
    studentRegNo: "20260110226003",
    studentName: "ADITYA S",
    department: "Artificial Intelligence & Data Science",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "CS26C02T",
    subjectTitle: "Fundamentals of Data Science",
    dummyBarcode: "DMY-91823 (KV-192039)",
    packetId: "PKT-A",
    proc1: {
      examinerName: "Dr. Ananya Menon",
      examinerId: "FAC-ENG-202",
      role: "Internal Examiner",
      department: "CSE",
      partAMarks: 8,
      partBCMarks: 28,
      totalMarks: 36,
      grade: "RA",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-03",
      appliedDate: "2026-10-18",
      feeReceiptNo: "KVELL-REC-8925",
      feeAmount: 600,
      reason: "Question 13 pandas dataframe pipeline full solution given; request complete re-check.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. S. Mohan",
      examinerId: "FAC-EXT-501",
      role: "External Examiner",
      institution: "Anna University Regional Campus",
      allottedDate: "2026-10-19",
      partAMarks: 12,
      partBCMarks: 41,
      totalMarks: 53,
      grade: "B",
      evaluatedDate: "2026-10-20",
      remarks: "Student logic is correct; initial examiner marked strictly on syntax formatting.",
    },
    markDifference: 17, // |36 - 53| = 17 > 10 -> EXAMINER 3 TRIGGERED!
    isThirdValuationTriggered: true,
    proc3: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. K. R. Ramanathan",
      examinerId: "CHIEF-VAL-01",
      role: "Chief Subject Expert & Valuation Chairman",
      institution: "Karpaga Vinayaga Autonomous Board",
      allottedDate: "2026-10-20",
      partAMarks: 11,
      partBCMarks: 40,
      totalMarks: 51,
      grade: "B",
      evaluatedDate: "2026-10-21",
      resolutionFormula: "Average of two nearest marks: (53 + 51) / 2 = 52",
      chiefRationale: "Second examiner assessment verified. Code logic valid for full marks in autonomous rubric.",
    },
    finalOutcome: {
      awardedMarks: 52,
      grade: "B",
      markShift: 16,
      status: "THIRD_VALUATION_RESOLVED",
      approvedBy: "Associate Dean (Academics) & Controller of Examinations",
      ratifiedDate: "2026-10-21",
    },
  },

  // 4. CSE - Normal Re-eval (Delta <= 10)
  {
    id: "REV-2026-004",
    studentRegNo: "20260110226004",
    studentName: "AKSHAYA S",
    department: "Computer Science & Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "CY26C01I",
    subjectTitle: "Engineering Chemistry",
    dummyBarcode: "DMY-40192 (KV-859201)",
    packetId: "PKT-C",
    proc1: {
      examinerName: "Dr. R. Revathi",
      examinerId: "FAC-ENG-304",
      role: "Internal Examiner",
      department: "Chemistry",
      partAMarks: 16,
      partBCMarks: 58,
      totalMarks: 74,
      grade: "A",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-04",
      appliedDate: "2026-10-18",
      feeReceiptNo: "KVELL-REC-8930",
      feeAmount: 600,
      reason: "Spectroscopy problem Part B expected distinction mark.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. N. Sundaram",
      examinerId: "FAC-EXT-508",
      role: "External Examiner",
      institution: "SSN College of Engineering",
      allottedDate: "2026-10-19",
      partAMarks: 17,
      partBCMarks: 60,
      totalMarks: 77,
      grade: "A+",
      evaluatedDate: "2026-10-20",
      remarks: "NMR spectroscopy diagram drawn with high precision; awarded +3 marks.",
    },
    markDifference: 3, // |74 - 77| = 3 <= 10 -> EXAMINER 3 NOT NEEDED
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 77,
      grade: "A+",
      markShift: 3,
      status: "REVAL_ACCEPTED_NORMAL",
      approvedBy: "Associate Dean (Academics)",
      ratifiedDate: "2026-10-20",
    },
  },

  // 5. CSE - Examiner 3 resolved
  {
    id: "REV-2026-005",
    studentRegNo: "20260110226005",
    studentName: "ANISH V",
    department: "Computer Science & Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "CS26N011",
    subjectTitle: "Industry Nexus- I Python Foundations",
    dummyBarcode: "DMY-58201 (KV-391829)",
    packetId: "PKT-D",
    proc1: {
      examinerName: "Dr. Ananya Menon",
      examinerId: "FAC-ENG-202",
      role: "Internal Examiner",
      department: "CSE",
      partAMarks: 9,
      partBCMarks: 34,
      totalMarks: 43,
      grade: "RA",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-05",
      appliedDate: "2026-10-18",
      feeReceiptNo: "KVELL-REC-8934",
      feeAmount: 600,
      reason: "OOP inheritance question was marked zero due to syntax variation.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. S. Mohan",
      examinerId: "FAC-EXT-501",
      role: "External Examiner",
      institution: "Anna University Regional Campus",
      allottedDate: "2026-10-19",
      partAMarks: 13,
      partBCMarks: 45,
      totalMarks: 58,
      grade: "B",
      evaluatedDate: "2026-10-20",
      remarks: "Python multiple inheritance solution is valid under Python 3.10 C3 MRO rules.",
    },
    markDifference: 15, // |43 - 58| = 15 > 10 -> EXAMINER 3 TRIGGERED!
    isThirdValuationTriggered: true,
    proc3: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. K. R. Ramanathan",
      examinerId: "CHIEF-VAL-01",
      role: "Chief Subject Expert & Valuation Chairman",
      institution: "Karpaga Vinayaga Autonomous Board",
      allottedDate: "2026-10-20",
      partAMarks: 12,
      partBCMarks: 44,
      totalMarks: 56,
      grade: "B",
      evaluatedDate: "2026-10-21",
      resolutionFormula: "Average of two nearest marks: (58 + 56) / 2 = 57",
      chiefRationale: "Examiner 1 applied strict static typing rubric. Examiner 2 and 3 dynamic typing evaluation endorsed.",
    },
    finalOutcome: {
      awardedMarks: 57,
      grade: "B",
      markShift: 14,
      status: "THIRD_VALUATION_RESOLVED",
      approvedBy: "Associate Dean (Academics) & Controller of Examinations",
      ratifiedDate: "2026-10-21",
    },
  },

  // 6. CSE - Normal Re-eval (Delta <= 10)
  {
    id: "REV-2026-006",
    studentRegNo: "20260110226006",
    studentName: "ASHVATHKUMAR S",
    department: "Computer Science & Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "MA26C01T",
    subjectTitle: "Matrices and Calculus",
    dummyBarcode: "DMY-84920 (KV-502918)",
    packetId: "PKT-B",
    proc1: {
      examinerName: "Prof. K. Venkatesh",
      examinerId: "FAC-ENG-104",
      role: "Internal Examiner",
      department: "Mathematics & AI",
      partAMarks: 12,
      partBCMarks: 40,
      totalMarks: 52,
      grade: "B",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-06",
      appliedDate: "2026-10-18",
      feeReceiptNo: "KVELL-REC-8938",
      feeAmount: 600,
      reason: "Double integral bounds in Question 15 evaluated accurately.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. P. Suresh",
      examinerId: "FAC-EXT-504",
      role: "External Examiner",
      institution: "MIT Chennai",
      allottedDate: "2026-10-19",
      partAMarks: 14,
      partBCMarks: 46,
      totalMarks: 60,
      grade: "B+",
      evaluatedDate: "2026-10-20",
      remarks: "Polar coordinate transformation credited; +8 marks.",
    },
    markDifference: 8, // |52 - 60| = 8 <= 10 -> EXAMINER 3 NOT NEEDED
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 60,
      grade: "B+",
      markShift: 8,
      status: "REVAL_ACCEPTED_NORMAL",
      approvedBy: "Associate Dean (Academics)",
      ratifiedDate: "2026-10-20",
    },
  },

  // 7. BME - EXAMINER 3 PENDING DEAN ALLOTMENT! (Δ = 13 > 10)
  {
    id: "REV-2026-007",
    studentRegNo: "20260110226007",
    studentName: "ASIF AHMED A R",
    department: "Biomedical Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "BM26C03T",
    subjectTitle: "Human Anatomy & Physiology",
    dummyBarcode: "DMY-29481 (KV-729401)",
    packetId: "PKT-E",
    proc1: {
      examinerName: "Dr. Meenakshi S.",
      examinerId: "FAC-ENG-302",
      role: "Internal Examiner",
      department: "BME",
      partAMarks: 11,
      partBCMarks: 37,
      totalMarks: 48,
      grade: "C",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-07",
      appliedDate: "2026-10-19",
      feeReceiptNo: "KVELL-REC-8942",
      feeAmount: 600,
      reason: "Cardiac electrophysiology membrane potential curves verified.",
      status: "PENDING_EXAMINER_3",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. S. Mohan",
      examinerId: "FAC-EXT-501",
      role: "External Examiner",
      institution: "Anna University Regional Campus",
      allottedDate: "2026-10-19",
      partAMarks: 15,
      partBCMarks: 46,
      totalMarks: 61,
      grade: "B+",
      evaluatedDate: "2026-10-20",
      remarks: "Action potential graph accurately labeled; substantial rubric credit awarded.",
    },
    markDifference: 13, // |48 - 61| = 13 > 10 -> EXAMINER 3 TRIGGERED!
    isThirdValuationTriggered: true,
    proc3: {
      allotmentStatus: "PENDING_ALLOTMENT", // DEAN MUST ALLOT EXAMINER 3!
    },
    finalOutcome: {
      awardedMarks: 61,
      grade: "B+",
      markShift: 13,
      status: "AWAITING_EXAMINER_3",
      approvedBy: "Associate Dean (Pending Third Valuer)",
    },
  },

  // 8. BME - Normal Re-eval (Delta <= 10)
  {
    id: "REV-2026-008",
    studentRegNo: "20260110226008",
    studentName: "BHARATHI V",
    department: "Biomedical Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "CY26C01I",
    subjectTitle: "Engineering Chemistry",
    dummyBarcode: "DMY-69102 (KV-491028)",
    packetId: "PKT-A",
    proc1: {
      examinerName: "Dr. R. Revathi",
      examinerId: "FAC-ENG-304",
      role: "Internal Examiner",
      department: "Chemistry",
      partAMarks: 16,
      partBCMarks: 55,
      totalMarks: 71,
      grade: "A",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-08",
      appliedDate: "2026-10-19",
      feeReceiptNo: "KVELL-REC-8945",
      feeAmount: 600,
      reason: "Re-totalling check in Section A.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. S. Mohan",
      examinerId: "FAC-EXT-501",
      role: "External Examiner",
      institution: "Anna University Regional Campus",
      allottedDate: "2026-10-19",
      partAMarks: 17,
      partBCMarks: 56,
      totalMarks: 73,
      grade: "A",
      evaluatedDate: "2026-10-20",
      remarks: "Slight totaling oversight in Question 4 corrected; awarded +2 marks.",
    },
    markDifference: 2, // |71 - 73| = 2 <= 10 -> EXAMINER 3 NOT NEEDED
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 73,
      grade: "A",
      markShift: 2,
      status: "REVAL_ACCEPTED_NORMAL",
      approvedBy: "Associate Dean (Academics)",
      ratifiedDate: "2026-10-20",
    },
  },

  // 9. Biotechnology - EXAMINER 2 PENDING DEAN ALLOTMENT!
  {
    id: "REV-2026-009",
    studentRegNo: "20260110226009",
    studentName: "CHANDRU K",
    department: "Biotechnology",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "BT26C02T",
    subjectTitle: "Microbiology & Cell Biology",
    dummyBarcode: "DMY-10928 (KV-920194)",
    packetId: "PKT-F",
    proc1: {
      examinerName: "Dr. Kavitha Raman",
      examinerId: "FAC-ENG-402",
      role: "Internal Examiner",
      department: "Biotech",
      partAMarks: 10,
      partBCMarks: 35,
      totalMarks: 45,
      grade: "RA",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-09",
      appliedDate: "2026-10-20",
      feeReceiptNo: "KVELL-REC-8950",
      feeAmount: 600,
      reason: "Gram staining biochemical pathway diagram fully drawn with mordant mechanism.",
      status: "PENDING_EXAMINER_2",
    },
    proc2: {
      allotmentStatus: "PENDING_ALLOTMENT", // DEAN MUST ALLOT EXAMINER 2!
    },
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 45,
      grade: "RA",
      markShift: 0,
      status: "AWAITING_EXAMINER_2",
      approvedBy: "Associate Dean (Pending Valuation)",
    },
  },

  // 10. Biotechnology - Examiner 2 Allotted (In-Progress)
  {
    id: "REV-2026-010",
    studentRegNo: "20260110226010",
    studentName: "DEEPIKA M",
    department: "Biotechnology",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "BT26C02T",
    subjectTitle: "Microbiology & Cell Biology",
    dummyBarcode: "DMY-49201 (KV-381920)",
    packetId: "PKT-F",
    proc1: {
      examinerName: "Dr. Kavitha Raman",
      examinerId: "FAC-ENG-402",
      role: "Internal Examiner",
      department: "Biotech",
      partAMarks: 14,
      partBCMarks: 51,
      totalMarks: 65,
      grade: "B+",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-10",
      appliedDate: "2026-10-20",
      feeReceiptNo: "KVELL-REC-8952",
      feeAmount: 600,
      reason: "Bacterial kinetics exponential phase math evaluated strictly.",
      status: "UNDER_SECOND_EVALUATION",
    },
    proc2: {
      allotmentStatus: "ALLOTTED",
      examinerName: "Dr. N. Sundaram",
      examinerId: "FAC-EXT-508",
      role: "External Examiner",
      institution: "SSN College of Engineering",
      allottedDate: "2026-10-21",
    },
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 65,
      grade: "B+",
      markShift: 0,
      status: "AWAITING_EXAMINER_2",
      approvedBy: "Associate Dean (In-Progress)",
    },
  },

  // 11. ECE - EXAMINER 3 PENDING DEAN ALLOTMENT! (Δ = 16 > 10)
  {
    id: "REV-2026-011",
    studentRegNo: "20260110226011",
    studentName: "DINESH KUMAR R",
    department: "Electronics & Communication Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "EC26C01T",
    subjectTitle: "Digital Electronics & VLSI Design",
    dummyBarcode: "DMY-85012 (KV-491820)",
    packetId: "PKT-G",
    proc1: {
      examinerName: "Dr. P. Suresh",
      examinerId: "FAC-ENG-502",
      role: "Internal Examiner",
      department: "ECE",
      partAMarks: 8,
      partBCMarks: 31,
      totalMarks: 39,
      grade: "RA",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-11",
      appliedDate: "2026-10-19",
      feeReceiptNo: "KVELL-REC-8958",
      feeAmount: 600,
      reason: "Verilog HDL finite state machine code was written with Mealy architecture; deserves full marks.",
      status: "PENDING_EXAMINER_3",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. V. Karthik",
      examinerId: "FAC-EXT-605",
      role: "External Examiner",
      institution: "Thiagarajar College of Engineering",
      allottedDate: "2026-10-20",
      partAMarks: 13,
      partBCMarks: 42,
      totalMarks: 55,
      grade: "B",
      evaluatedDate: "2026-10-21",
      remarks: "FSM Verilog code compiles without syntax defect and meets synthesis specifications.",
    },
    markDifference: 16, // |39 - 55| = 16 > 10 -> EXAMINER 3 TRIGGERED!
    isThirdValuationTriggered: true,
    proc3: {
      allotmentStatus: "PENDING_ALLOTMENT", // DEAN MUST ALLOT EXAMINER 3!
    },
    finalOutcome: {
      awardedMarks: 55,
      grade: "B",
      markShift: 16,
      status: "AWAITING_EXAMINER_3",
      approvedBy: "Associate Dean (Pending Third Valuer)",
    },
  },

  // 12. ECE - Normal Re-eval (Delta <= 10)
  {
    id: "REV-2026-012",
    studentRegNo: "20260110226012",
    studentName: "GOWTHAM P",
    department: "Electronics & Communication Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "EC26C01T",
    subjectTitle: "Digital Electronics & VLSI Design",
    dummyBarcode: "DMY-39182 (KV-192840)",
    packetId: "PKT-G",
    proc1: {
      examinerName: "Dr. P. Suresh",
      examinerId: "FAC-ENG-502",
      role: "Internal Examiner",
      department: "ECE",
      partAMarks: 14,
      partBCMarks: 44,
      totalMarks: 58,
      grade: "B",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-12",
      appliedDate: "2026-10-19",
      feeReceiptNo: "KVELL-REC-8960",
      feeAmount: 600,
      reason: "K-map simplification in Question 12.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. V. Karthik",
      examinerId: "FAC-EXT-605",
      role: "External Examiner",
      institution: "Thiagarajar College of Engineering",
      allottedDate: "2026-10-20",
      partAMarks: 15,
      partBCMarks: 49,
      totalMarks: 64,
      grade: "B+",
      evaluatedDate: "2026-10-21",
      remarks: "Don't care conditions in 4-variable K-map correctly grouped; +6 marks.",
    },
    markDifference: 6, // |58 - 64| = 6 <= 10 -> EXAMINER 3 NOT NEEDED
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 64,
      grade: "B+",
      markShift: 6,
      status: "REVAL_ACCEPTED_NORMAL",
      approvedBy: "Associate Dean (Academics)",
      ratifiedDate: "2026-10-21",
    },
  },

  // 13. Mechanical Engineering - EXAMINER 2 PENDING DEAN ALLOTMENT!
  {
    id: "REV-2026-013",
    studentRegNo: "20260110226013",
    studentName: "HARISH M",
    department: "Mechanical Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "ME26C02T",
    subjectTitle: "Engineering Thermodynamics",
    dummyBarcode: "DMY-73019 (KV-294019)",
    packetId: "PKT-H",
    proc1: {
      examinerName: "Dr. V. Karthik",
      examinerId: "FAC-ENG-605",
      role: "Internal Examiner",
      department: "Mech",
      partAMarks: 9,
      partBCMarks: 31,
      totalMarks: 40,
      grade: "RA",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-13",
      appliedDate: "2026-10-20",
      feeReceiptNo: "KVELL-REC-8964",
      feeAmount: 600,
      reason: "Rankine cycle reheat cycle enthalpy calculation from steam table.",
      status: "PENDING_EXAMINER_2",
    },
    proc2: {
      allotmentStatus: "PENDING_ALLOTMENT", // DEAN MUST ALLOT EXAMINER 2!
    },
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 40,
      grade: "RA",
      markShift: 0,
      status: "AWAITING_EXAMINER_2",
      approvedBy: "Associate Dean (Pending Valuation)",
    },
  },

  // 14. Mechanical Engineering - Normal Re-eval (Delta <= 10)
  {
    id: "REV-2026-014",
    studentRegNo: "20260110226014",
    studentName: "JANANI S",
    department: "Mechanical Engineering",
    semester: "Semester I",
    academicYear: "2026-2027",
    subjectCode: "ME26C02T",
    subjectTitle: "Engineering Thermodynamics",
    dummyBarcode: "DMY-94012 (KV-682910)",
    packetId: "PKT-H",
    proc1: {
      examinerName: "Dr. V. Karthik",
      examinerId: "FAC-ENG-605",
      role: "Internal Examiner",
      department: "Mech",
      partAMarks: 15,
      partBCMarks: 55,
      totalMarks: 70,
      grade: "A",
      evaluatedDate: "2026-10-15",
    },
    application: {
      applicationRef: "APP-REV-14",
      appliedDate: "2026-10-19",
      feeReceiptNo: "KVELL-REC-8968",
      feeAmount: 600,
      reason: "Brayton cycle efficiency derivation steps.",
      status: "RATIFIED",
    },
    proc2: {
      allotmentStatus: "EVALUATED",
      examinerName: "Dr. S. Mohan",
      examinerId: "FAC-EXT-501",
      role: "External Examiner",
      institution: "Anna University Regional Campus",
      allottedDate: "2026-10-20",
      partAMarks: 16,
      partBCMarks: 58,
      totalMarks: 74,
      grade: "A",
      evaluatedDate: "2026-10-21",
      remarks: "Specific heat ratio variation appropriately accounted for; awarded +4 marks.",
    },
    markDifference: 4, // |70 - 74| = 4 <= 10 -> EXAMINER 3 NOT NEEDED
    isThirdValuationTriggered: false,
    proc3: {
      allotmentStatus: "NOT_REQUIRED",
    },
    finalOutcome: {
      awardedMarks: 74,
      grade: "A",
      markShift: 4,
      status: "REVAL_ACCEPTED_NORMAL",
      approvedBy: "Associate Dean (Academics)",
      ratifiedDate: "2026-10-21",
    },
  },
];

interface RevaluationThreeTierReviewViewProps {
  onToast?: (msg: string) => void;
}

export const RevaluationThreeTierReviewView: React.FC<RevaluationThreeTierReviewViewProps> = ({
  onToast,
}) => {
  const [records, setRecords] = useState<ValuationProcedureRecord[]>(() => {
    try {
      const saved = localStorage.getItem("kvell_revaluation_3tier_records_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_REVALUATION_RECORDS;
  });

  const [activeTab, setActiveTab] = useState<"roster" | "stats" | "escrow">("roster");
  const [statsGrouping, setStatsGrouping] = useState<"department" | "subject">("department");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [inspectModalRecord, setInspectModalRecord] = useState<ValuationProcedureRecord | null>(null);
  const [allotExaminer2Record, setAllotExaminer2Record] = useState<ValuationProcedureRecord | null>(null);
  const [allotExaminer3Record, setAllotExaminer3Record] = useState<ValuationProcedureRecord | null>(null);
  const [simulateM2Record, setSimulateM2Record] = useState<ValuationProcedureRecord | null>(null);

  // Form states for Examiner 2 allotment modal
  const [selectedEx2Id, setSelectedEx2Id] = useState<string>(EXAMINER_2_POOL[0].id);
  const [customEx2Name, setCustomEx2Name] = useState<string>("");
  const [customEx2Inst, setCustomEx2Inst] = useState<string>("");
  const [ex2Instructions, setEx2Instructions] = useState<string>("Conduct independent autonomous valuation against scheme rubric.");
  const [ex2Deadline, setEx2Deadline] = useState<string>("2026-10-25");
  const [simulatedM2Score, setSimulatedM2Score] = useState<number>(55);

  // Form states for Examiner 3 allotment modal
  const [selectedEx3Id, setSelectedEx3Id] = useState<string>(EXAMINER_3_POOL[0].id);
  const [ex3Formula, setEx3Formula] = useState<string>("Nearest Two Marks Average: (M2 + M3) / 2");
  const [simulatedM3Score, setSimulatedM3Score] = useState<number>(54);

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
  };

  const saveRecords = (newRecords: ValuationProcedureRecord[]) => {
    setRecords(newRecords);
    try {
      localStorage.setItem("kvell_revaluation_3tier_records_v3", JSON.stringify(newRecords));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDataset = () => {
    saveRecords(INITIAL_REVALUATION_RECORDS);
    notify("Re-evaluation dataset reset to initial multi-department baseline!");
  };

  // Distinct subjects present in the records
  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach((r) => map.set(r.subjectCode, r.subjectTitle));
    return Array.from(map.entries()).map(([code, title]) => ({ code, title }));
  }, [records]);

  // Filtered dataset based on subject, procedure status, and search query
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSubject = selectedSubject === "ALL" || r.subjectCode === selectedSubject;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING_EXAMINER_2" && r.proc2.allotmentStatus === "PENDING_ALLOTMENT") ||
        (statusFilter === "NORMAL_REVAL" && !r.isThirdValuationTriggered && r.proc2.allotmentStatus === "EVALUATED") ||
        (statusFilter === "PROC3_TRIGGERED" && r.isThirdValuationTriggered) ||
        (statusFilter === "PENDING_EXAMINER_3" && r.proc3?.allotmentStatus === "PENDING_ALLOTMENT") ||
        (statusFilter === "RATIFIED" && r.finalOutcome.status !== "AWAITING_EXAMINER_2" && r.finalOutcome.status !== "AWAITING_EXAMINER_3");

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.studentName.toLowerCase().includes(q) ||
        r.studentRegNo.includes(q) ||
        r.dummyBarcode.toLowerCase().includes(q) ||
        r.subjectCode.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);

      return matchSubject && matchStatus && matchQuery;
    });
  }, [records, selectedSubject, statusFilter, searchQuery]);

  // Helper math calculators
  const calcMean = (arr: number[]) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);
  const calcStd = (arr: number[], mean: number) => {
    if (arr.length <= 1) return 0;
    const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  // Overall Global Statistics
  const globalStats = useMemo(() => {
    const list = selectedSubject === "ALL" ? records : records.filter((r) => r.subjectCode === selectedSubject);
    const n = list.length;
    if (n === 0) {
      return {
        count: 0,
        meanM1: 0,
        stdM1: 0,
        meanM2: 0,
        stdM2: 0,
        meanDelta: 0,
        stdDelta: 0,
        meanFinal: 0,
        thirdValuationCount: 0,
        thirdValuationRate: 0,
        maxDelta: 0,
        pendingEx2Count: 0,
        pendingEx3Count: 0,
      };
    }

    const m1Vals = list.map((r) => r.proc1.totalMarks);
    const m2Vals = list.filter((r) => r.proc2.totalMarks !== undefined).map((r) => r.proc2.totalMarks as number);
    const deltaVals = list.filter((r) => r.markDifference !== undefined).map((r) => r.markDifference as number);
    const finalVals = list.map((r) => r.finalOutcome.awardedMarks);

    const meanM1 = calcMean(m1Vals);
    const stdM1 = calcStd(m1Vals, meanM1);

    const meanM2 = calcMean(m2Vals);
    const stdM2 = calcStd(m2Vals, meanM2);

    const meanDelta = calcMean(deltaVals);
    const stdDelta = calcStd(deltaVals, meanDelta);

    const meanFinal = calcMean(finalVals);
    const thirdValuationCount = list.filter((r) => r.isThirdValuationTriggered).length;
    const thirdValuationRate = Math.round((thirdValuationCount / n) * 100);
    const maxDelta = deltaVals.length > 0 ? Math.max(...deltaVals) : 0;
    const pendingEx2Count = list.filter((r) => r.proc2.allotmentStatus === "PENDING_ALLOTMENT").length;
    const pendingEx3Count = list.filter((r) => r.proc3?.allotmentStatus === "PENDING_ALLOTMENT").length;

    return {
      count: n,
      meanM1: Number(meanM1.toFixed(1)),
      stdM1: Number(stdM1.toFixed(2)),
      meanM2: Number(meanM2.toFixed(1)),
      stdM2: Number(stdM2.toFixed(2)),
      meanDelta: Number(meanDelta.toFixed(1)),
      stdDelta: Number(stdDelta.toFixed(2)),
      meanFinal: Number(meanFinal.toFixed(1)),
      thirdValuationCount,
      thirdValuationRate,
      maxDelta,
      pendingEx2Count,
      pendingEx3Count,
    };
  }, [records, selectedSubject]);

  // DEPARTMENT-WISE STANDARD DEVIATION & AVERAGE STATS
  const departmentStatsData = useMemo(() => {
    const map = new Map<
      string,
      {
        dept: string;
        evaluatedMarks: number[];
        m1Marks: number[];
        deltas: number[];
        proc3Count: number;
        pendingEx2Count: number;
        pendingEx3Count: number;
      }
    >();

    records.forEach((r) => {
      const cur = map.get(r.department) || {
        dept: r.department,
        evaluatedMarks: [],
        m1Marks: [],
        deltas: [],
        proc3Count: 0,
        pendingEx2Count: 0,
        pendingEx3Count: 0,
      };

      if (r.proc2.allotmentStatus === "PENDING_ALLOTMENT") {
        cur.pendingEx2Count += 1;
      }
      if (r.proc3?.allotmentStatus === "PENDING_ALLOTMENT") {
        cur.pendingEx3Count += 1;
      }
      if (r.isThirdValuationTriggered) {
        cur.proc3Count += 1;
      }

      cur.m1Marks.push(r.proc1.totalMarks);
      if (r.proc2.totalMarks !== undefined) {
        cur.evaluatedMarks.push(r.proc2.totalMarks);
      } else {
        cur.evaluatedMarks.push(r.proc1.totalMarks);
      }
      if (r.markDifference !== undefined) {
        cur.deltas.push(r.markDifference);
      }

      map.set(r.department, cur);
    });

    return Array.from(map.values()).map((item) => {
      const n = item.evaluatedMarks.length;
      const mean = Number(calcMean(item.evaluatedMarks).toFixed(1));
      const std = Number(calcStd(item.evaluatedMarks, mean).toFixed(2));
      const variance = Number((std * std).toFixed(2));
      const meanM1 = Number(calcMean(item.m1Marks).toFixed(1));
      const avgDelta = Number(calcMean(item.deltas).toFixed(1));

      const shortName =
        item.dept === "Artificial Intelligence & Data Science"
          ? "AI&DS"
          : item.dept === "Computer Science & Engineering"
          ? "CSE"
          : item.dept === "Biomedical Engineering"
          ? "BME"
          : item.dept === "Biotechnology"
          ? "Biotech"
          : item.dept === "Electronics & Communication Engineering"
          ? "ECE"
          : item.dept === "Mechanical Engineering"
          ? "MECH"
          : item.dept;

      const consistencyRating =
        std < 6.0 ? "High Consistency" : std <= 10.0 ? "Moderate Spread" : "High Dispersion";

      return {
        department: item.dept,
        shortName,
        name: shortName,
        sampleSize: n,
        mean,
        std,
        variance,
        meanM1,
        avgDelta,
        spreadLower: Math.max(0, Number((mean - std).toFixed(1))),
        spreadUpper: Math.min(100, Number((mean + std).toFixed(1))),
        proc3Count: item.proc3Count,
        escrowRate: n > 0 ? Math.round((item.proc3Count / n) * 100) : 0,
        consistencyRating,
        pendingEx2Count: item.pendingEx2Count,
        pendingEx3Count: item.pendingEx3Count,
      };
    });
  }, [records]);

  // SUBJECT-WISE STANDARD DEVIATION & AVERAGE STATS
  const subjectStatsData = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        title: string;
        dept: string;
        evaluatedMarks: number[];
        m1Marks: number[];
        deltas: number[];
        proc3Count: number;
      }
    >();

    records.forEach((r) => {
      const cur = map.get(r.subjectCode) || {
        code: r.subjectCode,
        title: r.subjectTitle,
        dept: r.department,
        evaluatedMarks: [],
        m1Marks: [],
        deltas: [],
        proc3Count: 0,
      };

      if (r.isThirdValuationTriggered) {
        cur.proc3Count += 1;
      }

      cur.m1Marks.push(r.proc1.totalMarks);
      if (r.proc2.totalMarks !== undefined) {
        cur.evaluatedMarks.push(r.proc2.totalMarks);
      } else {
        cur.evaluatedMarks.push(r.proc1.totalMarks);
      }
      if (r.markDifference !== undefined) {
        cur.deltas.push(r.markDifference);
      }

      map.set(r.subjectCode, cur);
    });

    return Array.from(map.values()).map((item) => {
      const n = item.evaluatedMarks.length;
      const mean = Number(calcMean(item.evaluatedMarks).toFixed(1));
      const std = Number(calcStd(item.evaluatedMarks, mean).toFixed(2));
      const variance = Number((std * std).toFixed(2));
      const meanM1 = Number(calcMean(item.m1Marks).toFixed(1));
      const avgDelta = Number(calcMean(item.deltas).toFixed(1));

      const consistencyRating =
        std < 6.0 ? "High Consistency" : std <= 10.0 ? "Moderate Spread" : "High Dispersion";

      return {
        subjectCode: item.code,
        name: item.code,
        title: item.title,
        dept: item.dept,
        sampleSize: n,
        mean,
        std,
        variance,
        meanM1,
        avgDelta,
        spreadLower: Math.max(0, Number((mean - std).toFixed(1))),
        spreadUpper: Math.min(100, Number((mean + std).toFixed(1))),
        proc3Count: item.proc3Count,
        escrowRate: n > 0 ? Math.round((item.proc3Count / n) * 100) : 0,
        consistencyRating,
      };
    });
  }, [records]);

  // Delta Bracket Distribution Histogram Data
  const deltaBracketData = useMemo(() => {
    const list = selectedSubject === "ALL" ? records : records.filter((r) => r.subjectCode === selectedSubject);
    let range0_5 = 0;
    let range6_10 = 0;
    let range11_15 = 0;
    let rangeAbove15 = 0;

    list.forEach((r) => {
      if (r.markDifference === undefined) return;
      if (r.markDifference <= 5) range0_5++;
      else if (r.markDifference <= 10) range6_10++;
      else if (r.markDifference <= 15) range11_15++;
      else rangeAbove15++;
    });

    return [
      {
        range: "Δ 0–5 M",
        label: "Small difference (0-5)",
        count: range0_5,
        status: "Examiner 1 vs 2 Consistent",
        color: "#10B981", // emerald
      },
      {
        range: "Δ 6–10 M",
        label: "Moderate Shift (6-10)",
        count: range6_10,
        status: "Examiner 2 Accepted",
        color: "#3B82F6", // blue
      },
      {
        range: "Δ 11–15 M",
        label: "Threshold Exceeded (11-15)",
        count: range11_15,
        status: "3rd Valuation Triggered",
        color: "#F59E0B", // amber
      },
      {
        range: "Δ > 15 M",
        label: "Extreme Divergence (>15)",
        count: rangeAbove15,
        status: "3rd Val + Quality Audit",
        color: "#EF4444", // red
      },
    ];
  }, [records, selectedSubject]);

  // ALLOT EXAMINER 2 HANDLER (Dean only allots Examiner 2)
  const handleConfirmAllotExaminer2 = (andSimulate: boolean = false) => {
    if (!allotExaminer2Record) return;

    const chosenPool = EXAMINER_2_POOL.find((e) => e.id === selectedEx2Id);
    const examinerName = customEx2Name.trim() || chosenPool?.name || "Dr. S. Mohan";
    const examinerId = chosenPool?.id || "FAC-EXT-CUSTOM";
    const role = "External Examiner";
    const institution = customEx2Inst.trim() || chosenPool?.institution || "Anna University Regional Campus";

    const updated = records.map((r) => {
      if (r.id !== allotExaminer2Record.id) return r;

      if (!andSimulate) {
        return {
          ...r,
          proc2: {
            ...r.proc2,
            allotmentStatus: "ALLOTTED" as const,
            examinerName,
            examinerId,
            role,
            institution,
            allottedDate: new Date().toISOString().slice(0, 10),
            remarks: `Allotted by Dean. Deadline: ${ex2Deadline}. Instructions: ${ex2Instructions}`,
          },
          application: {
            ...r.application,
            status: "UNDER_SECOND_EVALUATION" as const,
          },
          finalOutcome: {
            ...r.finalOutcome,
            status: "AWAITING_EXAMINER_2" as const,
          },
        };
      }

      // If simulated with marks:
      const totalMarks = Math.min(100, Math.max(0, simulatedM2Score));
      const partAMarks = Math.min(20, Math.round(totalMarks * 0.25));
      const partBCMarks = totalMarks - partAMarks;
      const grade =
        totalMarks >= 90 ? "O" : totalMarks >= 80 ? "A+" : totalMarks >= 70 ? "A" : totalMarks >= 60 ? "B+" : totalMarks >= 50 ? "B" : "RA";
      const markDifference = Math.abs(r.proc1.totalMarks - totalMarks);
      const isThirdValuationTriggered = markDifference > 10;

      return {
        ...r,
        proc2: {
          allotmentStatus: "EVALUATED" as const,
          examinerName,
          examinerId,
          role,
          institution,
          allottedDate: new Date().toISOString().slice(0, 10),
          partAMarks,
          partBCMarks,
          totalMarks,
          grade,
          evaluatedDate: new Date().toISOString().slice(0, 10),
          remarks: `Valuation completed. ${ex2Instructions}`,
        },
        markDifference,
        isThirdValuationTriggered,
        proc3: isThirdValuationTriggered
          ? {
              allotmentStatus: "PENDING_ALLOTMENT" as const,
            }
          : {
              allotmentStatus: "NOT_REQUIRED" as const,
            },
        application: {
          ...r.application,
          status: isThirdValuationTriggered
            ? ("PENDING_EXAMINER_3" as const)
            : ("RATIFIED" as const),
        },
        finalOutcome: {
          awardedMarks: isThirdValuationTriggered ? totalMarks : totalMarks,
          grade: isThirdValuationTriggered ? grade : grade,
          markShift: totalMarks - r.proc1.totalMarks,
          status: isThirdValuationTriggered
            ? ("AWAITING_EXAMINER_3" as const)
            : ("REVAL_ACCEPTED_NORMAL" as const),
          approvedBy: isThirdValuationTriggered ? "Dean (Escalated to 3rd Valuer)" : "Associate Dean (Academics)",
          ratifiedDate: isThirdValuationTriggered ? undefined : new Date().toISOString().slice(0, 10),
        },
      };
    });

    saveRecords(updated);
    setAllotExaminer2Record(null);

    if (andSimulate) {
      const diff = Math.abs(allotExaminer2Record.proc1.totalMarks - simulatedM2Score);
      if (diff > 10) {
        notify(
          `Examiner 2 evaluated: ${simulatedM2Score}M. Discrepancy Δ = ${diff} marks (>10M)! Mandatory Examiner 3 escalation triggered for Dean allotment.`
        );
      } else {
        notify(
          `Examiner 2 evaluated: ${simulatedM2Score}M. Discrepancy Δ = ${diff} marks (≤10M). Re-evaluation ratified!`
        );
      }
    } else {
      notify(
        `Dean successfully allotted Examiner 2 (${examinerName}) for dummy barcode ${allotExaminer2Record.dummyBarcode}!`
      );
    }
  };

  // ALLOT EXAMINER 3 HANDLER (Dean allots Examiner 3 if necessary when Δ > 10)
  const handleConfirmAllotExaminer3 = (andResolve: boolean = false) => {
    if (!allotExaminer3Record) return;

    const chosenPool = EXAMINER_3_POOL.find((e) => e.id === selectedEx3Id);
    const examinerName = chosenPool?.name || "Dr. K. R. Ramanathan";
    const examinerId = chosenPool?.id || "CHIEF-VAL-01";
    const role = chosenPool?.role || "Chief Subject Expert & Autonomous Valuation Chairman";
    const institution = chosenPool?.institution || "Karpaga Vinayaga Autonomous Board";

    const updated = records.map((r) => {
      if (r.id !== allotExaminer3Record.id) return r;

      if (!andResolve) {
        return {
          ...r,
          proc3: {
            allotmentStatus: "ALLOTTED" as const,
            examinerName,
            examinerId,
            role,
            institution,
            allottedDate: new Date().toISOString().slice(0, 10),
            resolutionFormula: ex3Formula,
            chiefRationale: "Allotted by Dean under Autonomous Regulation §14.3 due to mark discrepancy > 10.",
          },
          application: {
            ...r.application,
            status: "THIRD_VALUATION_PENDING" as const,
          },
          finalOutcome: {
            ...r.finalOutcome,
            status: "AWAITING_EXAMINER_3" as const,
          },
        };
      }

      // If simulated and resolved:
      const totalMarks = Math.min(100, Math.max(0, simulatedM3Score));
      const partAMarks = Math.min(20, Math.round(totalMarks * 0.25));
      const partBCMarks = totalMarks - partAMarks;
      const m1 = r.proc1.totalMarks;
      const m2 = r.proc2.totalMarks ?? totalMarks;

      // Calculate final based on formula:
      let finalMarks = totalMarks;
      if (ex3Formula.includes("Nearest Two Marks Average")) {
        const diff12 = Math.abs(m1 - m2);
        const diff23 = Math.abs(m2 - totalMarks);
        const diff13 = Math.abs(m1 - totalMarks);

        if (diff23 <= diff12 && diff23 <= diff13) {
          finalMarks = Math.round((m2 + totalMarks) / 2);
        } else if (diff13 <= diff12) {
          finalMarks = Math.round((m1 + totalMarks) / 2);
        } else {
          finalMarks = Math.round((m1 + m2) / 2);
        }
      } else if (ex3Formula.includes("Higher of Two")) {
        finalMarks = Math.max(m2, totalMarks);
      } else {
        finalMarks = Math.round((m1 + m2 + totalMarks) / 3);
      }

      const finalGrade =
        finalMarks >= 90 ? "O" : finalMarks >= 80 ? "A+" : finalMarks >= 70 ? "A" : finalMarks >= 60 ? "B+" : finalMarks >= 50 ? "B" : "RA";

      return {
        ...r,
        proc3: {
          allotmentStatus: "EVALUATED" as const,
          examinerName,
          examinerId,
          role,
          institution,
          allottedDate: new Date().toISOString().slice(0, 10),
          partAMarks,
          partBCMarks,
          totalMarks,
          grade:
            totalMarks >= 90 ? "O" : totalMarks >= 80 ? "A+" : totalMarks >= 70 ? "A" : totalMarks >= 60 ? "B+" : totalMarks >= 50 ? "B" : "RA",
          evaluatedDate: new Date().toISOString().slice(0, 10),
          resolutionFormula: `${ex3Formula} -> Final: ${finalMarks}`,
          chiefRationale: "Chief Examiner reviewed full script against autonomous rubric. Converged mark ratified.",
        },
        application: {
          ...r.application,
          status: "RATIFIED" as const,
        },
        finalOutcome: {
          awardedMarks: finalMarks,
          grade: finalGrade,
          markShift: finalMarks - r.proc1.totalMarks,
          status: "THIRD_VALUATION_RESOLVED" as const,
          approvedBy: "Associate Dean (Academics) & Controller of Examinations",
          ratifiedDate: new Date().toISOString().slice(0, 10),
        },
      };
    });

    saveRecords(updated);
    setAllotExaminer3Record(null);

    if (andResolve) {
      notify(`Examiner 3 ratified by Senior Examiner (${examinerName})! Final mark published.`);
    } else {
      notify(`Dean successfully allotted Examiner 3 (${examinerName}) for candidate ${allotExaminer3Record.dummyBarcode}!`);
    }
  };

  // Export Complete 3-Examiner Audit Sheet to Excel
  const handleExportAuditExcel = () => {
    const rows = filteredRecords.map((r, idx) => ({
      "Sl No": idx + 1,
      "Application ID": r.id,
      "Student Reg No": r.studentRegNo,
      "Student Name": r.studentName,
      Department: r.department,
      "Subject Code": r.subjectCode,
      "Subject Title": r.subjectTitle,
      "Dummy Barcode": r.dummyBarcode,
      "Packet ID": r.packetId,
      // Examiner 1
      "Proc 1 Examiner": r.proc1.examinerName,
      "Proc 1 Marks (M1)": r.proc1.totalMarks,
      "Proc 1 Grade": r.proc1.grade,
      // Examiner 2
      "Proc 2 Allotment": r.proc2.allotmentStatus,
      "Proc 2 Examiner": r.proc2.examinerName || "Pending Allotment",
      "Proc 2 Marks (M2)": r.proc2.totalMarks ?? "Pending",
      "Proc 2 Grade": r.proc2.grade ?? "Pending",
      // Delta
      "Mark Difference (|M1 - M2|)": r.markDifference ?? "Pending",
      "Third Valuation Required (>10)": r.isThirdValuationTriggered ? "YES" : "NO",
      // Examiner 3
      "Proc 3 Allotment": r.proc3?.allotmentStatus || "NOT_REQUIRED",
      "Proc 3 Chief Examiner": r.proc3?.examinerName || "N/A",
      "Proc 3 Marks (M3)": r.proc3?.totalMarks ?? "N/A",
      "Proc 3 Formula": r.proc3?.resolutionFormula || "N/A",
      // Final Outcome
      "Final Ratified Mark": r.finalOutcome.awardedMarks,
      "Final Grade": r.finalOutcome.grade,
      "Net Mark Shift": r.finalOutcome.markShift > 0 ? `+${r.finalOutcome.markShift}` : r.finalOutcome.markShift,
      "Resolution Status": r.finalOutcome.status,
      "Approved By": r.finalOutcome.approvedBy,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "3Tier_Revaluation_Audit");

    // Add Department-wise Stats Sheet
    const deptRows = departmentStatsData.map((d) => ({
      Department: d.department,
      "Sample Size (N)": d.sampleSize,
      "Mean Score (μ)": d.mean,
      "Avg Mark Difference (Δ)": d.avgDelta,
      "Proc 3 Triggered (>10)": d.proc3Count,
      "Escrow Escalation Rate": `${d.escrowRate}%`,
      "Valuation Consistency": d.consistencyRating,
    }));
    const wsDept = XLSX.utils.json_to_sheet(deptRows);
    XLSX.utils.book_append_sheet(wb, wsDept, "Department_Analysis");

    // Add Subject-wise Stats Sheet
    const subjRows = subjectStatsData.map((s) => ({
      "Subject Code": s.subjectCode,
      "Subject Title": s.title,
      Department: s.dept,
      "Sample Size (N)": s.sampleSize,
      "Mean Score (μ)": s.mean,
      "Proc 3 Triggered (>10)": s.proc3Count,
      "Valuation Consistency": s.consistencyRating,
    }));
    const wsSubj = XLSX.utils.json_to_sheet(subjRows);
    XLSX.utils.book_append_sheet(wb, wsSubj, "Subject_Analysis");

    XLSX.writeFile(
      wb,
      `KVELL_Revaluation_Dept_Subject_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    notify("Exported comprehensive 3-Examiner valuation audit & Department/Subject standard deviation sheets!");
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* HEADER BANNER */}
      <div className="bg-white text-[#0B192C] rounded-3xl p-6 sm:p-8 shadow-sm border border-[#D4A72C]/30 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-[#EAB308] text-[#0B192C] text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest inline-block shadow-sm">
              OFFICE OF ASSOCIATE DEAN &amp; COE
            </span>
            <span className="bg-slate-50 text-[#D4A72C] text-[10px] font-bold px-2 py-0.5 rounded border border-[#D4A72C]/30 font-mono">
              DEAN EXAMINER ALLOTMENT &bull; DEPT/SUBJECT STD DEV
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-[#0B192C] flex items-center gap-3">
            <Scale className="text-[#D4A72C]" size={28} />
            Re-evaluation &amp; 3-Tier Valuation Management
          </h1>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            When a student applies for re-evaluation, the <strong>Dean only allots Examiner 2</strong>. If the mark difference{" "}
            <strong className="text-amber-400 font-mono">&Delta; = |M1 - M2| &gt; 10 marks</strong>, the paper mandatory encounters{" "}
            <strong>Examiner 3</strong> where the <strong>Dean only allots Examiner 3</strong> (Senior Valuer). All dispersion analytics are tracked via Department-wise and Subject-wise standard deviation graphs.
          </p>
        </div>

        {/* Action Tools */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAuditExcel}
            className="px-4 py-2.5 rounded-xl bg-white text-[#0B192C] hover:bg-gray-100 border border-gray-300 font-extrabold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download size={15} /> Export Audit Sheet (Excel)
          </button>
          <button
            type="button"
            onClick={handleResetDataset}
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#0B192C] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            title="Reset to pristine 14-record multi-department test cohort"
          >
            <RefreshCw size={14} /> Reset Demo Data
          </button>
          <button
            type="button"
            onClick={() => {
              notify("All completed re-evaluations and 3rd valuations synchronized with Examination Result Gazette!");
            }}
            className="px-4 py-2.5 rounded-xl bg-[#EAB308] hover:bg-[#d69e06] text-[#0B192C] font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <CheckCircle2 size={16} /> Ratify All Published
          </button>
        </div>
      </div>

      {/* STATUTORY WORKFLOW BANNER (DEAN'S ROLE HIGHLIGHTED) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <span className="text-[11px] font-black uppercase text-[#D4A72C] tracking-widest flex items-center gap-1.5">
            <ShieldCheck size={16} />
            Autonomous Re-evaluation Dean Allotment Mandate (§14.3)
          </span>
          <span className="text-[10px] font-bold text-gray-500 font-mono">
            Dean Action: Allot Examiner 2 &bull; Allot Examiner 3 (Only If &Delta; &gt; 10M)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-gray-200 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#0B192C] text-[#D4A72C] font-mono">
                EXAMINER 1
              </span>
              <span className="text-[10px] font-bold text-gray-500">Initial Valuation</span>
            </div>
            <h3 className="font-bold text-[#0B192C] text-sm">First Examiner (Regular Faculty)</h3>
            <p className="text-gray-600 text-[11px] mt-1 leading-normal">
              Regular answer script valuation at Central Valuation Camp. Marks (M1) and provisional grades entered blindly.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-300 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-900 text-white font-mono">
                EXAMINER 2 (DEAN ALLOTS)
              </span>
              <span className="text-[10px] font-bold text-blue-800 font-black">Dean Action #1</span>
            </div>
            <h3 className="font-bold text-blue-950 text-sm">Examiner 2 Allotment</h3>
            <p className="text-blue-900 text-[11px] mt-1 leading-normal">
              When student applies for re-eval, <strong>Dean only allots Examiner 2</strong> from the independent examiner pool. If &Delta; &le; 10M, valuation closes.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 font-mono">
                EXAMINER 3 (&Delta; &gt; 10M)
              </span>
              <span className="text-[10px] font-black text-amber-900">Dean Action #2 (If Necessary)</span>
            </div>
            <h3 className="font-bold text-amber-950 text-sm">Examiner 3 Allotment</h3>
            <p className="text-amber-900 text-[11px] mt-1 leading-normal">
              If |M1 - M2| &gt; 10 marks, <strong>Dean only allots Examiner 3</strong> (Senior Subject Specialist / Board Chairman) for final resolution.
            </p>
          </div>
        </div>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Revaluations */}
        <div
          onClick={() => {
            setActiveTab("roster");
            setStatusFilter("ALL");
            setSelectedSubject("ALL");
            setSearchQuery("");
            setTimeout(() => {
              document.getElementById("valuation-roster-section")?.scrollIntoView({ behavior: "smooth" });
            }, 50);
          }}
          className={`bg-white p-5 rounded-3xl border transition-all flex items-center justify-between cursor-pointer group hover:shadow-md ${
            statusFilter === "ALL" && activeTab === "roster"
              ? "border-[#0B192C] ring-2 ring-[#0B192C]/10"
              : "border-[#E5E1D8] hover:border-slate-400"
          }`}
          role="button"
          tabIndex={0}
          title="Click to view all re-evaluations"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                TOTAL RE-EVALUATIONS
              </span>
              <span className="text-[9px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition">
                &bull; Click to view
              </span>
            </div>
            <span className="font-display font-black text-3xl text-[#0B192C] mt-1 block font-mono">
              {globalStats.count}
            </span>
            <span className="text-[11px] text-gray-500 font-semibold mt-0.5 block">
              Awaiting Ex-2 Allotment:{" "}
              <strong
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("roster");
                  setStatusFilter("PENDING_EXAMINER_2");
                  setSelectedSubject("ALL");
                  setSearchQuery("");
                  setTimeout(() => {
                    document.getElementById("valuation-roster-section")?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }}
                className="text-blue-700 underline font-black hover:text-blue-900 cursor-pointer"
                title="Click to view cases awaiting Examiner 2"
              >
                {globalStats.pendingEx2Count}
              </strong>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0B192C]/5 text-[#0B192C] flex items-center justify-center font-black group-hover:scale-110 transition-transform">
            <Layers size={22} />
          </div>
        </div>

        {/* Card 2: Normal Re-evals (Delta <= 10) */}
        <div
          onClick={() => {
            setActiveTab("roster");
            setStatusFilter("NORMAL_REVAL");
            setSelectedSubject("ALL");
            setSearchQuery("");
            setTimeout(() => {
              document.getElementById("valuation-roster-section")?.scrollIntoView({ behavior: "smooth" });
            }, 50);
          }}
          className={`bg-white p-5 rounded-3xl border transition-all flex items-center justify-between cursor-pointer group hover:shadow-md ${
            statusFilter === "NORMAL_REVAL" && activeTab === "roster"
              ? "border-emerald-600 ring-2 ring-emerald-500/10"
              : "border-[#E5E1D8] hover:border-emerald-400"
          }`}
          role="button"
          tabIndex={0}
          title="Click to view normal re-evaluations (Delta <= 10M)"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                NORMAL RE-VAL (&Delta; &le; 10)
              </span>
              <span className="text-[9px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                &bull; Click to view
              </span>
            </div>
            <span className="font-display font-black text-3xl text-emerald-700 mt-1 block font-mono">
              {globalStats.count - globalStats.thirdValuationCount} / {globalStats.count}
            </span>
            <span className="text-[11px] text-emerald-800 font-bold mt-0.5 block">
              {100 - globalStats.thirdValuationRate}% Permissible Tolerance
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card 3: Examiner 3 Escrow Triggered (> 10 Marks) */}
        <div
          onClick={() => {
            setActiveTab("roster");
            setStatusFilter("PENDING_EXAMINER_3");
            setSelectedSubject("ALL");
            setSearchQuery("");
            setTimeout(() => {
              document.getElementById("valuation-roster-section")?.scrollIntoView({ behavior: "smooth" });
            }, 50);
            notify("Displaying pending Examiner 3 items awaiting Examiner 3 Dean allotment.");
          }}
          className={`bg-white p-5 rounded-3xl border transition-all flex items-center justify-between cursor-pointer group hover:shadow-md ${
            statusFilter === "PENDING_EXAMINER_3" && activeTab === "roster"
              ? "border-red-600 ring-2 ring-red-500/20 bg-red-50/10"
              : "border-[#E5E1D8] hover:border-red-400"
          }`}
          role="button"
          tabIndex={0}
          title="Click to view pending Examiner 3 work awaiting Examiner 3 allotment"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider block">
                EXAMINER 3 ESCROW (&Delta; &gt; 10)
              </span>
              <span className="text-[9px] font-bold text-red-600 opacity-0 group-hover:opacity-100 transition">
                &bull; Click to view pending
              </span>
            </div>
            <span className="font-display font-black text-3xl text-red-600 mt-1 block font-mono">
              {globalStats.thirdValuationCount}
            </span>
            <span className="text-[11px] text-red-700 font-bold mt-0.5 block">
              Pending Dean Allotment:{" "}
              <strong className="text-red-900 underline font-black">
                {globalStats.pendingEx3Count}
              </strong>
              <span className="ml-1 text-[10px] font-normal text-red-600">
                (Click to display)
              </span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-red-100 transition-all">
            <AlertTriangle size={22} className={globalStats.pendingEx3Count > 0 ? "animate-pulse" : ""} />
          </div>
        </div>
      </div>

      {/* MAIN TAB SWITCHER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("roster")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "roster"
                ? "bg-[#0B192C] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FileText size={15} /> Dean Valuation Roster ({records.length})
            {globalStats.pendingEx2Count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500 text-white font-mono">
                {globalStats.pendingEx2Count} Ex-2
              </span>
            )}
            {globalStats.pendingEx3Count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-mono animate-pulse">
                {globalStats.pendingEx3Count} Ex-3
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "stats"
                ? "bg-[#0B192C] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 size={15} /> Department &amp; Subject Marks Graph
          </button>
          <button
            onClick={() => setActiveTab("escrow")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === "escrow"
                ? "bg-red-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <AlertTriangle size={15} /> Examiner 3 Escrow Desk ({globalStats.thirdValuationCount})
          </button>
        </div>

        {/* Global Subject Selector Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-extrabold uppercase text-gray-500 shrink-0">FILTER SUBJECT:</span>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none bg-white cursor-pointer"
          >
            <option value="ALL">All Subjects ({subjectOptions.length})</option>
            {subjectOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.code} — {opt.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: 3-TIER VALUATION ROSTER TABLE WITH DEAN ALLOTMENT ACTIONS */}
      {activeTab === "roster" && (
        <div id="valuation-roster-section" className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-5">
          {/* Active Filter Banners for Quick Pending Recognition */}
          {statusFilter === "PENDING_EXAMINER_3" && (
            <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <AlertTriangle size={17} className="animate-pulse" />
                </div>
                <div>
                  <div className="font-extrabold text-[#0B192C]">
                    Examiner 3 Escrow Desk &bull; Pending Examiner 3 Allotment ({filteredRecords.length} Case{filteredRecords.length === 1 ? "" : "s"})
                  </div>
                  <div className="text-[11px] text-red-700 font-medium">
                    Mark discrepancy &gt; 10 marks between Examiner 1 and Examiner 2. The Dean must allot Examiner 3 to ratify and complete evaluation.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter("ALL")}
                className="px-3 py-1.5 rounded-xl bg-white border border-red-300 text-red-800 font-extrabold text-xs hover:bg-red-100 transition cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Clear Filter (View All)
              </button>
            </div>
          )}

          {statusFilter === "PENDING_EXAMINER_2" && (
            <div className="p-3.5 bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <UserCheck size={17} />
                </div>
                <div>
                  <div className="font-extrabold text-[#0B192C]">
                    Examiner 2 Queue &bull; Pending Examiner 2 Allotment ({filteredRecords.length} Case{filteredRecords.length === 1 ? "" : "s"})
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium">
                    Student re-evaluation applications awaiting Dean allotment of independent Examiner 2.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter("ALL")}
                className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-800 font-extrabold text-xs hover:bg-blue-100 transition cursor-pointer shrink-0 self-start sm:self-auto"
              >
                Clear Filter (View All)
              </button>
            </div>
          )}
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate, barcode, department..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-[#0B192C] focus:ring-2 focus:ring-[#D4A72C] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status:</span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "ALL" ? "bg-[#0B192C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({records.length})
              </button>
              <button
                onClick={() => setStatusFilter("PENDING_EXAMINER_2")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "PENDING_EXAMINER_2"
                    ? "bg-blue-600 text-white font-bold"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                Awaiting Examiner 2 ({globalStats.pendingEx2Count})
              </button>
              <button
                onClick={() => setStatusFilter("NORMAL_REVAL")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "NORMAL_REVAL"
                    ? "bg-emerald-600 text-white font-bold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Normal (&Delta; &le; 10M)
              </button>
              <button
                onClick={() => setStatusFilter("PROC3_TRIGGERED")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "PROC3_TRIGGERED"
                    ? "bg-red-600 text-white font-bold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                3rd Val Triggered (&Delta; &gt; 10M)
              </button>
              <button
                onClick={() => setStatusFilter("PENDING_EXAMINER_3")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === "PENDING_EXAMINER_3"
                    ? "bg-amber-600 text-white font-bold"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Awaiting Examiner 3 ({globalStats.pendingEx3Count})
              </button>
            </div>
          </div>

          {/* COMPREHENSIVE 3-PROCEDURE TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B192C] text-white font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-3">Candidate / Dummy Barcode</th>
                  <th className="py-3.5 px-3">Department &amp; Subject</th>
                  <th className="py-3.5 px-3 text-center bg-slate-800">
                    <div>EXAMINER 1</div>
                    <div className="text-[9px] font-normal text-gray-300">Examiner 1 (M1)</div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-blue-950">
                    <div>EXAMINER 2</div>
                    <div className="text-[9px] font-normal text-blue-200">Examiner 2 (Dean Allots)</div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-amber-900">
                    <div>DIFF (&Delta;)</div>
                    <div className="text-[9px] font-normal text-amber-200">|M1 - M2|</div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-red-950">
                    <div>EXAMINER 3</div>
                    <div className="text-[9px] font-normal text-red-200">Examiner 3 (Dean Allots if &Delta;&gt;10)</div>
                  </th>
                  <th className="py-3.5 px-3 text-center bg-emerald-950">
                    <div>FINAL MARK</div>
                    <div className="text-[9px] font-normal text-emerald-200">Ratified Grade</div>
                  </th>
                  <th className="py-3.5 px-3 text-center">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium bg-white">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No re-evaluation records match your active search filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-amber-50/20 transition">
                      {/* Candidate & Dummy Barcode */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-xs text-[#0B192C] block">{r.studentName}</span>
                        <span className="font-mono text-[11px] text-gray-500 block">{r.studentRegNo}</span>
                        <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                          {r.dummyBarcode}
                        </span>
                      </td>

                      {/* Department & Subject */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-xs text-[#0B192C] block">{r.subjectCode}</span>
                        <span className="text-[11px] text-gray-600 block line-clamp-1">{r.subjectTitle}</span>
                        <span className="text-[10px] font-bold text-slate-500 block">{r.department}</span>
                      </td>

                      {/* Examiner 1 */}
                      <td className="py-3 px-3 text-center bg-slate-50">
                        <span className="font-mono font-black text-sm text-[#0B192C] block">
                          {r.proc1.totalMarks} / 100
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 block font-mono">
                          Grade: {r.proc1.grade}
                        </span>
                        <span className="text-[9px] text-gray-400 block truncate max-w-[120px] mx-auto">
                          {r.proc1.examinerName}
                        </span>
                      </td>

                      {/* Examiner 2 (Dean Allotment) */}
                      <td className="py-3 px-3 text-center bg-blue-50/40">
                        {r.proc2.allotmentStatus === "PENDING_ALLOTMENT" ? (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200 inline-block">
                              Awaiting Allotment
                            </span>
                            <button
                              onClick={() => {
                                setAllotExaminer2Record(r);
                                setSelectedEx2Id(EXAMINER_2_POOL[0].id);
                                setSimulatedM2Score(r.proc1.totalMarks + 6);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] transition shadow-xs flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <UserCheck size={11} /> Allot Examiner 2
                            </button>
                          </div>
                        ) : r.proc2.allotmentStatus === "ALLOTTED" ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-blue-950 block">
                              {r.proc2.examinerName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block font-mono">
                              In Valuation
                            </span>
                            <button
                              onClick={() => {
                                setAllotExaminer2Record(r);
                                setSimulatedM2Score(r.proc1.totalMarks + 14);
                              }}
                              className="text-[10px] text-blue-700 underline block mx-auto cursor-pointer font-bold"
                            >
                              Record / Re-allot
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono font-black text-sm text-blue-900 block">
                              {r.proc2.totalMarks} / 100
                            </span>
                            <span className="text-[10px] font-bold text-blue-700 block font-mono">
                              Grade: {r.proc2.grade}
                            </span>
                            <span className="text-[9px] text-blue-600 block truncate max-w-[120px] mx-auto">
                              {r.proc2.examinerName}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Delta (|M1 - M2|) */}
                      <td className="py-3 px-3 text-center bg-amber-50/50">
                        {r.markDifference !== undefined ? (
                          <>
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded-full inline-block ${
                                r.isThirdValuationTriggered
                                  ? "bg-red-100 text-red-900 border border-red-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}
                            >
                              &Delta; {r.markDifference}M
                            </span>
                            <span className="text-[9px] font-bold block mt-1">
                              {r.isThirdValuationTriggered ? (
                                <span className="text-red-600 flex items-center justify-center gap-0.5">
                                  <AlertTriangle size={11} /> &gt; 10M TRIGGER
                                </span>
                              ) : (
                                <span className="text-emerald-700">&le; 10M NORMAL</span>
                              )}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Pending Ex-2</span>
                        )}
                      </td>

                      {/* Examiner 3 (Dean Allotment If Delta > 10) */}
                      <td className="py-3 px-3 text-center bg-red-50/30">
                        {!r.isThirdValuationTriggered ? (
                          <span className="text-[11px] text-gray-400 font-medium italic">
                            Not Required (&Delta; &le; 10)
                          </span>
                        ) : r.proc3?.allotmentStatus === "PENDING_ALLOTMENT" ? (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-100 text-red-900 border border-red-300 inline-block font-mono animate-pulse">
                              Escrow: Allot Needed
                            </span>
                            <button
                              onClick={() => {
                                setAllotExaminer3Record(r);
                                setSelectedEx3Id(EXAMINER_3_POOL[0].id);
                                const m2 = r.proc2.totalMarks ?? 60;
                                setSimulatedM3Score(Math.round((m2 + r.proc1.totalMarks) / 2));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] transition shadow-xs flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <ShieldAlert size={11} /> Allot Examiner 3
                            </button>
                          </div>
                        ) : r.proc3?.allotmentStatus === "ALLOTTED" ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-red-950 block">
                              {r.proc3.examinerName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block font-mono">
                              Valuation In-Progress
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono font-black text-sm text-red-700 block">
                              {r.proc3?.totalMarks} / 100
                            </span>
                            <span className="text-[10px] font-bold text-red-800 block font-mono">
                              Grade: {r.proc3?.grade}
                            </span>
                            <span className="text-[9px] text-gray-500 block truncate max-w-[120px] mx-auto">
                              {r.proc3?.examinerName}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Final Ratified Score */}
                      <td className="py-3 px-3 text-center bg-emerald-50/40">
                        {r.finalOutcome.status === "AWAITING_EXAMINER_2" ||
                        r.finalOutcome.status === "AWAITING_EXAMINER_3" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block font-mono">
                            Pending Valuation
                          </span>
                        ) : (
                          <>
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-mono font-black text-base text-emerald-900">
                                {r.finalOutcome.awardedMarks}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-800 text-white">
                                {r.finalOutcome.grade}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-700 block mt-0.5 font-mono">
                              {r.finalOutcome.markShift > 0
                                ? `+${r.finalOutcome.markShift} Marks`
                                : r.finalOutcome.markShift === 0
                                ? "No Change"
                                : `${r.finalOutcome.markShift} Marks`}
                            </span>
                          </>
                        )}
                      </td>

                      {/* Dossier Action Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setInspectModalRecord(r)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0B192C] text-white hover:bg-[#152744] text-[11px] font-bold transition flex items-center gap-1 mx-auto cursor-pointer shadow-xs"
                        >
                          <Eye size={12} className="text-[#D4A72C]" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENT-WISE & SUBJECT-WISE STANDARD DEVIATION GRAPH & MARKS AVERAGE */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* VIEW SELECTOR & DISPERSION SUMMARY */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                  STATISTICAL DISPERSION &bull; NO EXAMINER COMPARISON
                </span>
                <h2 className="font-display font-black text-xl text-[#0B192C] mt-0.5 flex items-center gap-2">
                  <BarChart3 className="text-[#D4A72C]" size={22} />
                  Marks Average (&mu;) Graph
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Analysis of re-evaluation marking variance based on <strong>Department-wise</strong> and{" "}
                  <strong>Subject-wise</strong> academic streams. Evaluating score spread (&sigma;) and escalation rates
                  across curriculum cohorts.
                </p>
              </div>

              {/* TOGGLE: Department-wise vs Subject-wise */}
              <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setStatsGrouping("department")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    statsGrouping === "department"
                      ? "bg-[#0B192C] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Building2 size={14} /> Department-wise Graph
                </button>
                <button
                  type="button"
                  onClick={() => setStatsGrouping("subject")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    statsGrouping === "subject"
                      ? "bg-[#0B192C] text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Compass size={14} /> Subject-wise Graph
                </button>
              </div>
            </div>

            {/* Quick 4 Statistical Coefficient Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Active Analysis Mode</span>
                <span className="font-display font-black text-lg text-slate-900 mt-1 block">
                  {statsGrouping === "department" ? "6 Departments" : `${subjectStatsData.length} Course Subjects`}
                </span>
                <span className="text-[11px] text-slate-600 font-mono font-bold mt-0.5 block">
                  Total Cohort: {records.length} Scripts
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase block">Global Average Marks (&mu;)</span>
                <span className="font-display font-black text-2xl text-blue-950 mt-1 block font-mono">
                  {globalStats.meanM2 || globalStats.meanFinal} <span className="text-xs font-normal text-blue-600">/ 100</span>
                </span>
                <span className="text-[11px] text-blue-800 font-mono font-bold mt-0.5 block">
                  Initial Mean: {globalStats.meanM1} M
                </span>
              </div>


              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase block">Escrow Escalation Rate</span>
                <span className="font-display font-black text-2xl text-emerald-950 mt-1 block font-mono">
                  {globalStats.thirdValuationRate}% <span className="text-xs font-normal text-emerald-600">(&Delta; &gt; 10M)</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-mono font-bold mt-0.5 block">
                  {globalStats.thirdValuationCount} Scripts to 3rd Val
                </span>
              </div>
            </div>
          </div>

          {/* Notice: Analytical Graph Relocated to Dean Analytics */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B192C] to-[#152744] text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#D4A72C]/30 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4A72C]/20 border border-[#D4A72C] flex items-center justify-center text-[#D4A72C] shrink-0">
                <BarChart3 size={20} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                  CENTRAL ANALYTICS HUB
                </span>
                <h4 className="font-display font-bold text-sm text-white">
                  Analytical Graphs Centralized in Dean Assessment Analytics
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  The multi-assessment standard deviation (&sigma;) and average marks (&mu;) graphs across IAT-1, IAT-2, END-SEM, and REVALUATION are now active under the <strong>Assessment Analytics</strong> component.
                </p>
              </div>
            </div>
          </div>

          {/* DETAILED STATISTICAL DISPERSION MATRIX TABLE */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-[#0B192C] flex items-center gap-2">
                  <Layers size={18} className="text-[#D4A72C]" />
                  {statsGrouping === "department"
                    ? "Department-wise Marks Summary"
                    : "Subject-wise Marks Summary"}
                </h3>
                <p className="text-xs text-gray-500">
                  Comprehensive audit of mean (&mu;), standard deviation (&sigma;), variance (&sigma;&sup2;), and 1&sigma; normal spread band.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-gray-400">
                {statsGrouping === "department" ? "6 Engineering Disciplines" : `${subjectStatsData.length} Subjects`}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B192C] text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3">
                      {statsGrouping === "department" ? "Engineering Department" : "Subject Code & Title"}
                    </th>
                    <th className="py-3 px-3 text-center">Cohort (N)</th>
                    <th className="py-3 px-3 text-center bg-blue-950">Mean Mark (&mu;)</th>
                    <th className="py-3 px-3 text-center">3rd Val Escalations</th>
                    <th className="py-3 px-3 text-center">Evaluation Consistency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium bg-white">
                  {(statsGrouping === "department" ? departmentStatsData : subjectStatsData).map((item: any, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/20 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-xs text-[#0B192C] block">
                          {statsGrouping === "department" ? item.department : item.title}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500 block">
                          {statsGrouping === "department" ? item.shortName : `${item.subjectCode} • ${item.dept}`}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-700">
                        {item.sampleSize} scripts
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-blue-950 bg-blue-50/30">
                        {item.mean} <span className="text-[10px] font-normal text-blue-700">/ 100</span>
                      </td>


                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full inline-block ${
                            item.proc3Count > 0
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {item.proc3Count} ({item.escrowRate}%)
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            item.std < 6.0
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : item.std <= 10.0
                              ? "bg-blue-100 text-blue-900 border border-blue-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {item.consistencyRating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECONDARY GRAPH: MARK DISCREPANCY (|M1 - M2|) THRESHOLD HISTOGRAM */}
          <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-[#0B192C] flex items-center gap-2">
                  <Scale size={18} className="text-[#D4A72C]" />
                  Mark Difference (&Delta; = |M1 - M2|) Bracket Distribution
                </h3>
                <p className="text-xs text-gray-500">
                  Distribution of variance between First Valuation (M1) and Second Re-evaluation (M2). Scripts exceeding 10 marks trigger Examiner 3.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-mono font-bold border border-emerald-200">
                  &le; 10M: Normal Re-eval
                </span>
                <span className="p-1.5 rounded-lg bg-red-50 text-red-900 font-mono font-bold border border-red-200">
                  &gt; 10M: Mandatory 3rd Valuer
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deltaBracketData} margin={{ top: 10, right: 10, left: -10, bottom: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1EFE9" />
                  <XAxis dataKey="range" stroke="#667085" fontSize={11} />
                  <YAxis stroke="#667085" fontSize={11} allowDecimals={false} unit=" Scripts" />
                  <ChartTooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} Scripts (${item.payload.status})`,
                      item.payload.label,
                    ]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {deltaBracketData.map((entry, index) => (
                      <Cell key={`delta-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THIRD VALUATION ESCROW DESK (Δ > 10M) */}
      {activeTab === "escrow" && (
        <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white font-mono uppercase">
                  CRITICAL VALUATION ESCROW
                </span>
                <span className="text-xs font-bold text-gray-500 font-mono">
                  {records.filter((r) => r.isThirdValuationTriggered).length} Cases Exceeding 10 Marks
                </span>
              </div>
              <h2 className="font-display font-black text-xl text-[#0B192C] mt-1">
                Examiner 3: Third Examiner Valuation Queue (&Delta; &gt; 10 Marks)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Under autonomous college regulations, when the mark awarded by the re-evaluator differs by more than 10 marks from the first valuation, the <strong>Dean only allots Examiner 3</strong> (Senior Subject Specialist / Valuation Chairman) to ratify the result.
              </p>
            </div>

            <button
              onClick={() => {
                notify("All Examiner 3 Chief Examiner recommendations have been ratified!");
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <CheckCircle2 size={16} /> Ratify All 3rd Valuations
            </button>
          </div>

          <div className="space-y-4">
            {records
              .filter((r) => r.isThirdValuationTriggered)
              .map((r, idx) => (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border-2 border-red-200 bg-red-50/20 hover:border-red-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-100">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-xl bg-red-600 text-white font-mono font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0B192C]">{r.studentName}</span>
                          <span className="font-mono text-xs text-gray-500">({r.studentRegNo})</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-blue-900 border border-blue-200">
                            {r.dummyBarcode}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {r.subjectCode} — {r.subjectTitle} &bull; {r.department}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-red-600 text-white">
                        &Delta; {r.markDifference} Marks Discrepancy
                      </span>
                      {r.proc3?.allotmentStatus === "PENDING_ALLOTMENT" && (
                        <button
                          onClick={() => {
                            setAllotExaminer3Record(r);
                            setSelectedEx3Id(EXAMINER_3_POOL[0].id);
                            const m2 = r.proc2.totalMarks ?? 60;
                            setSimulatedM3Score(Math.round((m2 + r.proc1.totalMarks) / 2));
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer animate-pulse"
                        >
                          <ShieldAlert size={14} /> Allot Examiner 3 Now
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Examiner Comparison Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Proc 1 */}
                    <div className="p-3 bg-white rounded-xl border border-gray-200">
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block">
                        Examiner 1 (First Examiner)
                      </span>
                      <p className="font-bold text-xs text-[#0B192C] mt-1">{r.proc1.examinerName}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="font-mono font-black text-base text-[#0B192C]">
                          {r.proc1.totalMarks} / 100
                        </span>
                        <span className="font-mono font-bold text-gray-500">Grade: {r.proc1.grade}</span>
                      </div>
                    </div>

                    {/* Proc 2 */}
                    <div className="p-3 bg-white rounded-xl border border-blue-200">
                      <span className="text-[10px] font-extrabold uppercase text-blue-700 block">
                        Examiner 2 (Second Re-evaluator)
                      </span>
                      <p className="font-bold text-xs text-blue-950 mt-1">
                        {r.proc2.examinerName || "Allotted"}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="font-mono font-black text-base text-blue-900">
                          {r.proc2.totalMarks} / 100
                        </span>
                        <span className="font-mono font-bold text-blue-700">Grade: {r.proc2.grade}</span>
                      </div>
                    </div>

                    {/* Proc 3 */}
                    <div className="p-3 bg-white rounded-xl border-2 border-red-300">
                      <span className="text-[10px] font-extrabold uppercase text-red-700 block">
                        Examiner 3 (Chief Examiner Resolution)
                      </span>
                      <p className="font-bold text-xs text-red-950 mt-1">
                        {r.proc3?.examinerName || (
                          <span className="text-red-600 font-bold underline">Dean Allotment Pending</span>
                        )}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-xs">
                        {r.proc3?.totalMarks ? (
                          <>
                            <span className="font-mono font-black text-base text-red-700">
                              {r.proc3.totalMarks} / 100
                            </span>
                            <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Final: {r.finalOutcome.awardedMarks} ({r.finalOutcome.grade})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-mono text-amber-700 font-bold">
                            Awaiting Dean to assign valuer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Formula & Chief Rationale */}
                  {r.proc3 && r.proc3.resolutionFormula && (
                    <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-gray-900">Resolution Formula:</span>{" "}
                        <span className="font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-semibold">
                          {r.proc3.resolutionFormula}
                        </span>
                        <span className="text-gray-600 ml-2 italic">&bull; {r.proc3.chiefRationale}</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-800 font-bold shrink-0">
                        Net Shift: +{r.finalOutcome.markShift} Marks
                      </span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ALLOT EXAMINER 2 MODAL (DEAN ONLY ALLOTS EXAMINER 2) */}
      {allotExaminer2Record && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-gray-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-bold">
                  <UserPlus size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-700 tracking-widest block">
                    DEAN PORTAL &bull; EXAMINER 2 ALLOTMENT
                  </span>
                  <h3 className="font-display font-black text-lg text-[#0B192C]">
                    Allot Examiner 2 for Re-evaluation
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Candidate: Blind Dummy Barcode <strong>{allotExaminer2Record.dummyBarcode}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllotExaminer2Record(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Candidate & Paper Context (Concealed identity) */}
            <div className="grid grid-cols-2 gap-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-gray-200 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Subject</span>
                <span className="font-bold text-gray-900 block">{allotExaminer2Record.subjectCode}</span>
                <span className="text-[11px] text-gray-500 truncate block">{allotExaminer2Record.subjectTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Department</span>
                <span className="font-bold text-gray-900 block">{allotExaminer2Record.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Examiner 1 Marks (M1)</span>
                <span className="font-mono font-black text-sm text-gray-900 block">
                  {allotExaminer2Record.proc1.totalMarks} / 100 (Grade: {allotExaminer2Record.proc1.grade})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Application Reason</span>
                <span className="text-[11px] text-gray-700 line-clamp-2 block">
                  {allotExaminer2Record.application.reason}
                </span>
              </div>
            </div>

            {/* Form to Select Examiner 2 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 block uppercase tracking-wider">
                Select Independent Examiner 2 from Faculty Pool:
              </label>
              <select
                value={selectedEx2Id}
                onChange={(e) => setSelectedEx2Id(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white cursor-pointer"
              >
                {EXAMINER_2_POOL.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.role} &bull; {ex.institution})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Valuation Deadline</label>
                  <input
                    type="date"
                    value={ex2Deadline}
                    onChange={(e) => setEx2Deadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block">Confidential Instruction</label>
                  <input
                    type="text"
                    value={ex2Instructions}
                    onChange={(e) => setEx2Instructions(e.target.value)}
                    placeholder="e.g. Verify Part B derivation"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Instant Demo Valuation Simulation Box */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-blue-900">
                  Instant Simulation: Pre-enter Examiner 2 Score (M2)
                </span>
                <span className="font-mono text-xs font-black text-blue-900">{simulatedM2Score} / 100</span>
              </div>
              <input
                type="range"
                min={20}
                max={95}
                value={simulatedM2Score}
                onChange={(e) => setSimulatedM2Score(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex items-center justify-between text-[11px] text-blue-800 font-mono">
                <span>
                  Resulting &Delta; = |{allotExaminer2Record.proc1.totalMarks} - {simulatedM2Score}| ={" "}
                  <strong>{Math.abs(allotExaminer2Record.proc1.totalMarks - simulatedM2Score)}M</strong>
                </span>
                <span className="font-bold">
                  {Math.abs(allotExaminer2Record.proc1.totalMarks - simulatedM2Score) > 10 ? (
                    <span className="text-red-600">&gt; 10M: Triggers Examiner 3</span>
                  ) : (
                    <span className="text-emerald-700">&le; 10M: Direct Resolution</span>
                  )}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAllotExaminer2Record(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAllotExaminer2(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Allot Only (Awaiting Valuer)
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAllotExaminer2(true)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Check size={14} /> Allot &amp; Simulate Valuation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALLOT EXAMINER 3 MODAL (DEAN ALLOTS EXAMINER 3 ONLY IF NECESSARY WHEN Δ > 10) */}
      {allotExaminer3Record && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-red-300 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-red-600 tracking-widest block">
                    MANDATORY EXAMINER 3 ESCALATION (&Delta; &gt; 10M)
                  </span>
                  <h3 className="font-display font-black text-lg text-[#0B192C]">
                    Dean Allotment: Examiner 3 (Senior Valuer)
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Candidate: Dummy Barcode <strong>{allotExaminer3Record.dummyBarcode}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllotExaminer3Record(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Discrepancy Alert Banner */}
            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-950 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold">
                <span>Examiner 1 (M1): {allotExaminer3Record.proc1.totalMarks} Marks</span>
                <span>Examiner 2 (M2): {allotExaminer3Record.proc2.totalMarks} Marks</span>
                <span className="text-red-700 font-black">
                  &Delta; = {allotExaminer3Record.markDifference} Marks (&gt; 10M)
                </span>
              </div>
              <p className="text-[11px] text-red-800">
                Autonomous statutory regulation mandates that the Dean allot a Senior Subject Specialist or Valuation Chairman to resolve the divergence.
              </p>
            </div>

            {/* Selection of Senior Examiner 3 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 block uppercase tracking-wider">
                Select Senior Specialist from Autonomous Board Pool:
              </label>
              <select
                value={selectedEx3Id}
                onChange={(e) => setSelectedEx3Id(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:ring-2 focus:ring-red-600 focus:outline-none bg-white cursor-pointer"
              >
                {EXAMINER_3_POOL.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} &bull; {ex.role}
                  </option>
                ))}
              </select>

              <div>
                <label className="text-xs font-bold text-gray-700 block uppercase tracking-wider mt-2">
                  Autonomous Resolution Formula:
                </label>
                <select
                  value={ex3Formula}
                  onChange={(e) => setEx3Formula(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-[#0B192C] focus:ring-2 focus:ring-red-600 focus:outline-none bg-white cursor-pointer mt-1"
                >
                  <option value="Nearest Two Marks Average: (M2 + M3) / 2">
                    Nearest Two Marks Average: (M2 + M3) / 2 (Standard Autonomous Statute)
                  </option>
                  <option value="Higher of Two Re-evaluations: max(M2, M3)">
                    Higher of Two Re-evaluations: max(M2, M3)
                  </option>
                  <option value="Three-way Mean: (M1 + M2 + M3) / 3">
                    Three-way Mean: (M1 + M2 + M3) / 3
                  </option>
                </select>
              </div>
            </div>

            {/* Instant Demo Simulation Box for Examiner 3 */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-900">
                  Instant Simulation: Pre-enter Examiner 3 Score (M3)
                </span>
                <span className="font-mono text-xs font-black text-amber-950">{simulatedM3Score} / 100</span>
              </div>
              <input
                type="range"
                min={30}
                max={90}
                value={simulatedM3Score}
                onChange={(e) => setSimulatedM3Score(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-[11px] text-amber-800 font-mono">
                Convergent resolution will calculate final score based on M1 ({allotExaminer3Record.proc1.totalMarks}), M2 (
                {allotExaminer3Record.proc2.totalMarks}), and M3 ({simulatedM3Score}).
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAllotExaminer3Record(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAllotExaminer3(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Allot Only
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAllotExaminer3(true)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Check size={14} /> Allot &amp; Ratify Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION / AUDIT MODAL */}
      {inspectModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold">
                  <Scale size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-[#D4A72C] tracking-widest block">
                    AUTONOMOUS EXAMINATION CELL &bull; VALUATION AUDIT DOSSIER
                  </span>
                  <h3 className="font-display font-black text-lg text-[#0B192C]">
                    3-Examiner Re-evaluation Inspection Slip &bull; {inspectModalRecord.id}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Candidate: {inspectModalRecord.studentName} ({inspectModalRecord.studentRegNo}) &bull; Barcode:{" "}
                    {inspectModalRecord.dummyBarcode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectModalRecord(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Subject & Application Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-gray-200 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Subject</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{inspectModalRecord.subjectCode}</span>
                <span className="text-[11px] text-gray-500 block truncate">{inspectModalRecord.subjectTitle}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Department</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{inspectModalRecord.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Reval Receipt</span>
                <span className="font-mono font-bold text-blue-700 mt-0.5 block">
                  {inspectModalRecord.application.feeReceiptNo}
                </span>
                <span className="text-[11px] text-gray-500">Fee: &inr;{inspectModalRecord.application.feeAmount}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Mark Difference</span>
                <span
                  className={`font-mono font-black text-sm mt-0.5 inline-block ${
                    inspectModalRecord.isThirdValuationTriggered ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  &Delta; {inspectModalRecord.markDifference ?? "Pending"} Marks
                </span>
                <span className="text-[10px] text-gray-500 block">
                  {inspectModalRecord.isThirdValuationTriggered ? "Examiner 3 Invoked" : "Normal Resolution"}
                </span>
              </div>
            </div>

            {/* Step-by-Step 3 Examiner Breakdown Table */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                Sequential Examiner Rubrics &amp; Marks Trajectory
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-gray-700 font-extrabold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Valuation Stage</th>
                      <th className="py-2.5 px-3">Examiner Name &amp; Affiliation</th>
                      <th className="py-2.5 px-3 text-center">Part A (20)</th>
                      <th className="py-2.5 px-3 text-center">Part B&amp;C (80)</th>
                      <th className="py-2.5 px-3 text-center">Total (100)</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {/* Proc 1 */}
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-gray-900">
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[10px] block w-fit">
                          Examiner 1
                        </span>
                        Initial Evaluation
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-gray-900 block">{inspectModalRecord.proc1.examinerName}</span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {inspectModalRecord.proc1.examinerId} &bull; {inspectModalRecord.proc1.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{inspectModalRecord.proc1.partAMarks}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{inspectModalRecord.proc1.partBCMarks}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0B192C]">
                        {inspectModalRecord.proc1.totalMarks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">{inspectModalRecord.proc1.grade}</td>
                    </tr>

                    {/* Proc 2 */}
                    <tr className="bg-blue-50/30">
                      <td className="py-2.5 px-3 font-bold text-blue-900">
                        <span className="px-2 py-0.5 rounded bg-blue-100 font-mono text-[10px] block w-fit text-blue-900">
                          Examiner 2 (Dean Allots)
                        </span>
                        Re-evaluation
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-blue-950 block">
                          {inspectModalRecord.proc2.examinerName || "Pending Allotment"}
                        </span>
                        <span className="text-[10px] text-blue-700 font-mono">
                          {inspectModalRecord.proc2.role || "External Examiner"} &bull;{" "}
                          {inspectModalRecord.proc2.institution || "Anna Univ"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-900">
                        {inspectModalRecord.proc2.partAMarks ?? "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-blue-900">
                        {inspectModalRecord.proc2.partBCMarks ?? "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-blue-900">
                        {inspectModalRecord.proc2.totalMarks ?? "Pending"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-900">
                        {inspectModalRecord.proc2.grade ?? "-"}
                      </td>
                    </tr>

                    {/* Proc 3 if present */}
                    {inspectModalRecord.isThirdValuationTriggered && (
                      <tr className="bg-red-50/40">
                        <td className="py-2.5 px-3 font-bold text-red-900">
                          <span className="px-2 py-0.5 rounded bg-red-100 font-mono text-[10px] block w-fit text-red-900 font-bold">
                            Examiner 3
                          </span>
                          Third Valuation (&Delta; &gt; 10)
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-red-950 block">
                            {inspectModalRecord.proc3?.examinerName || "Dean Allotment Pending"}
                          </span>
                          <span className="text-[10px] text-red-700 font-mono">
                            {inspectModalRecord.proc3?.role || "Chief Subject Expert"} &bull;{" "}
                            {inspectModalRecord.proc3?.institution || "Autonomous Board"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-red-900">
                          {inspectModalRecord.proc3?.partAMarks ?? "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-red-900">
                          {inspectModalRecord.proc3?.partBCMarks ?? "-"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-red-900">
                          {inspectModalRecord.proc3?.totalMarks ?? "Pending"}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-red-900">
                          {inspectModalRecord.proc3?.grade ?? "-"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Ratification Summary Box */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-black uppercase tracking-wider text-emerald-900 block text-[10px]">
                  OFFICIAL RATIFIED OUTCOME
                </span>
                <p className="text-emerald-950 font-bold mt-0.5">
                  Final Marks Awarded:{" "}
                  <strong className="text-base font-mono text-emerald-900">
                    {inspectModalRecord.finalOutcome.awardedMarks} / 100
                  </strong>{" "}
                  (Grade: {inspectModalRecord.finalOutcome.grade})
                </p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Resolution Protocol: {inspectModalRecord.proc3?.resolutionFormula || "Standard Re-evaluation Award"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Approved By</span>
                <span className="font-bold text-gray-900">{inspectModalRecord.finalOutcome.approvedBy}</span>
                <span className="text-[10px] text-gray-500 block">
                  Date: {inspectModalRecord.finalOutcome.ratifiedDate || "In-Progress"}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">
                Official document certified under Autonomous Academic Council Regulations.
              </span>
              <button
                onClick={() => setInspectModalRecord(null)}
                className="px-5 py-2 rounded-xl bg-[#0B192C] text-white font-bold text-xs hover:bg-[#152744] transition cursor-pointer"
              >
                Close Audit Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevaluationThreeTierReviewView;
