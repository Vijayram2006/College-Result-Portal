import React, { useState } from "react";
import {
  GitFork,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowDown,
  Building2,
  Users,
  UserCheck,
  Calendar,
  Send,
  FileCheck,
  Upload,
  CheckSquare,
  AlertCircle,
  Eye,
  Sparkles,
  HelpCircle,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Layers,
  ChevronRight,
  Play,
  Scale,
  Award,
  Globe,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  BookOpen,
} from "lucide-react";

export interface WorkflowStep {
  id: string;
  number: number | string;
  phase: "PRE_EXAM" | "VALUATION" | "MODERATION" | "NORMAL_RESULT" | "REVALUATION";
  phaseTitle: string;
  title: string;
  role: "Dean" | "Faculty" | "HOD" | "Exam Cell" | "Students" | "COE / System";
  status: "COMPLETED" | "ACTIVE" | "PENDING" | "CONDITIONAL";
  description: string;
  targetNav: string;
  metric?: string;
  branch?: "main" | "normal" | "reval" | "ex3_triggered" | "ex3_converged";
  formula?: string;
}

interface WorkflowChartTrackerViewProps {
  onNavigate: (navKey: string) => void;
  onToast?: (msg: string) => void;
}

export const WorkflowChartTrackerView: React.FC<WorkflowChartTrackerViewProps> = ({
  onNavigate,
  onToast,
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string>("step-timetable");
  const [viewMode, setViewMode] = useState<"diagram" | "steps">("diagram");
  const [phaseFilter, setPhaseFilter] = useState<string>("ALL");

  const workflowSteps: WorkflowStep[] = [
    // PHASE 1: ACADEMIC PREPARATION & EXAMINATION SETUP
    {
      id: "step-start",
      number: 1,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Start",
      role: "COE / System",
      status: "COMPLETED",
      description: "Autonomous Academic Year Commencement and Initialization of Examination Session (2026–2027).",
      targetNav: "dashboard",
    },
    {
      id: "step-registration",
      number: 2,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Student Registration",
      role: "Dean",
      status: "COMPLETED",
      description: "Admission Cell uploads student registration rosters with personal, academic, and category credentials; 14-digit Anna University Autonomous Register Numbers issued.",
      targetNav: "student-data",
      metric: "216 Candidates Enrolled",
    },
    {
      id: "step-enrollment",
      number: 3,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Student Course Enrollment",
      role: "Dean",
      status: "COMPLETED",
      description: "Grouping and cataloging students across the 12 Engineering departments (AI&DS: 50, BME: 28, CSE: 20, BT: 25, ECE: 35, MECH: 48).",
      targetNav: "student-data",
      metric: "12 Branches Enrolled",
    },
    {
      id: "step-subjects",
      number: 4,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Subject Allocation",
      role: "Dean",
      status: "COMPLETED",
      description: "Central COE syllabus curriculum mapping, credit schemes, theory & laboratory courses, and elective combinations.",
      targetNav: "subjects",
      metric: "20 Courses Approved",
    },
    {
      id: "step-timetable",
      number: 5,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Timetable Generation",
      role: "Dean",
      status: "COMPLETED",
      description: "Autonomous examination date allocation, forenoon (FN: 10:00 AM - 01:00 PM) / afternoon (AN: 02:00 PM - 05:00 PM) sessions, and clash-free room schedule.",
      targetNav: "timetable-notifications",
      metric: "6 Exam Slots Scheduled",
    },
    {
      id: "step-hall-allocation",
      number: 6,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Hall Allocation (40/Hall)",
      role: "Exam Cell",
      status: "COMPLETED",
      description: "Enforcing statutory ceiling: max 40 candidates per classroom (Desks A-1 to D-10) with 1 faculty invigilator strictly assigned per room.",
      targetNav: "classroom-allocation",
      metric: "Max 40/Room Ceil",
      formula: "Classrooms = ⌈ Total Students / 40 ⌉",
    },
    {
      id: "step-attendance",
      number: 7,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Attendance Marking",
      role: "Exam Cell",
      status: "ACTIVE",
      description: "Invigilator biometric and signature roll call during examination session. Present/Absent/Malpractice ledger sealed with script bundle.",
      targetNav: "classroom-allocation",
      metric: "Live Attendance Ledger",
    },
    {
      id: "step-qp-notice",
      number: 8,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "QP Preparation Notice",
      role: "Dean",
      status: "COMPLETED",
      description: "Official Dean broadcast notification transmitted to all teaching faculty directing question paper drafting before cut-off date.",
      targetNav: "timetable-notifications",
      metric: "Circular Broadcasted",
    },
    {
      id: "step-faculty-prepares-qp",
      number: 9,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "Faculty Prepares Question Paper (QP)",
      role: "Faculty",
      status: "COMPLETED",
      description: "Course faculty authors two independent sets (Set A & Set B) adhering strictly to Revised Bloom's Taxonomy and syllabus outcomes.",
      targetNav: "question-paper-review",
      metric: "Set A & Set B Prepared",
    },
    {
      id: "step-qp-upload",
      number: 10,
      phase: "PRE_EXAM",
      phaseTitle: "Phase 1: Pre-Examination Setup",
      title: "QP Upload Complete & HOD Approval",
      role: "HOD",
      status: "COMPLETED",
      description: "Faculty submits sealed PDF & answer scheme. Department Academic Committee (DAC) scrutiny signed by Head of Department.",
      targetNav: "question-paper-review",
      metric: "100% Sets Received",
    },

    // PHASE 2: VALUATION & PAPER CORRECTION STAGE
    {
      id: "step-dean-alloc-notif",
      number: 11,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Dean Allocation Notification to Faculty",
      role: "Dean",
      status: "COMPLETED",
      description: "Dean issues appointment orders and confidential evaluation timetable for autonomous answer script valuation.",
      targetNav: "paper-correction",
      metric: "11 Evaluators Appointed",
    },
    {
      id: "step-paper-val-assign",
      number: 12,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Paper Valuation Assignment to Faculty",
      role: "Dean",
      status: "COMPLETED",
      description: "Central COE masks real student names and 14-digit register numbers behind encrypted dummy barcodes (e.g. DMY-84291) to guarantee strict blind evaluation.",
      targetNav: "paper-correction",
      metric: "98 Scripts Barcoded",
      formula: "Student Credentials Concealed · Masking Flap Sealed",
    },
    {
      id: "step-exam-eval-faculty",
      number: 13,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Examination Paper Evaluation by Faculty",
      role: "Faculty",
      status: "COMPLETED",
      description: "Examiners evaluate scripts question-by-question against ratified key (Part A 10×2=20, Part B 5×16=80) using dummy barcode identifiers.",
      targetNav: "paper-correction",
      metric: "Strict Blind Valuation",
    },
    {
      id: "step-faculty-evaluates",
      number: 14,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Faculty Evaluates Papers & Records Marks",
      role: "Faculty",
      status: "COMPLETED",
      description: "Examiner completes rubric score breakdown, cross-checks total summation, and signs confidential evaluation ledger.",
      targetNav: "paper-correction",
      metric: "100% Scripts Graded",
    },
    {
      id: "step-upload-marks",
      number: 15,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Upload Marks into Valuation Engine",
      role: "Faculty",
      status: "COMPLETED",
      description: "Evaluator submits Part A and Part B marks directly to the Dean secure server via authenticated faculty token.",
      targetNav: "paper-correction",
      metric: "Locked into Vault",
    },
    {
      id: "step-dean-verifies-marks",
      number: 16,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Dean Verifies Marks & De-Masks Dummy Barcodes",
      role: "Dean",
      status: "COMPLETED",
      description: "Dean Portal securely de-masks dummy barcodes via the COE Central Master Key, mapping evaluated scores back to actual student register numbers.",
      targetNav: "paper-correction",
      metric: "COE Master Key Re-linked",
    },
    {
      id: "step-mark-sheet-gen",
      number: 17,
      phase: "VALUATION",
      phaseTitle: "Phase 2: Blind Valuation & Paper Correction",
      title: "Mark Sheet Generation (Connector A)",
      role: "Dean",
      status: "COMPLETED",
      description: "Generates compiled mark audit sheet containing raw theory scores ready for internal computation and moderation.",
      targetNav: "internal-marks",
      metric: "Raw Marksheet Ready",
    },

    // PHASE 3: MARKS COMPILATION & MODERATION
    {
      id: "step-calc-internals",
      number: 18,
      phase: "MODERATION",
      phaseTitle: "Phase 3: Computation & Moderation",
      title: "Calculate Internal Marks",
      role: "Dean",
      status: "COMPLETED",
      description: "Aggregates continuous internal assessment (CIA): 3 internal assessments + assignments + attendance (40% weightage).",
      targetNav: "internal-marks",
      metric: "CIA Max: 40 Marks",
    },
    {
      id: "step-calc-externals",
      number: 19,
      phase: "MODERATION",
      phaseTitle: "Phase 3: Computation & Moderation",
      title: "Calculate External Marks",
      role: "Dean",
      status: "COMPLETED",
      description: "Normalizes end-semester theory exam score (60% weightage) and combines with CIA internal component.",
      targetNav: "internal-marks",
      metric: "ESE Max: 60 Marks",
      formula: "Final Score = (Internal × 0.40) + (External × 0.60)",
    },
    {
      id: "step-moderation",
      number: 20,
      phase: "MODERATION",
      phaseTitle: "Phase 3: Computation & Moderation",
      title: "Moderation Applied If Needed (Grace Marks)",
      role: "Dean",
      status: "ACTIVE",
      description: "Academic Evaluation Committee / BoS resolution moderation: awarding grace marks for question complexity or syllabus ambiguity.",
      targetNav: "dashboard",
      metric: "+1 to +2 Marks BoS Grace",
    },
    {
      id: "step-final-calculated-result",
      number: 21,
      phase: "MODERATION",
      phaseTitle: "Phase 3: Computation & Moderation",
      title: "Final Calculated Result",
      role: "Dean",
      status: "COMPLETED",
      description: "Total marks aggregated, Anna University autonomous 10-point scale grades computed (O: 90+, A+: 80-89, A: 70-79, B+: 60-69, B: 50-59, RA: <50).",
      targetNav: "published-results",
      metric: "10-Point Grade Scales",
    },
    {
      id: "step-results-compilation",
      number: 22,
      phase: "MODERATION",
      phaseTitle: "Phase 3: Computation & Moderation",
      title: "Results Compilation & Review Process",
      role: "Dean",
      status: "COMPLETED",
      description: "Passing board scrutiny and preparation of Gazette tabulations before release.",
      targetNav: "published-results",
      metric: "Board Approved",
    },

    // PHASE 4: DECISION NODE & DUAL TRACK
    {
      id: "step-decision-grievance",
      number: 23,
      phase: "MODERATION",
      phaseTitle: "Phase 4: Two-Track Path Decision",
      title: "Any Revaluation Application / Grievance?",
      role: "Students",
      status: "CONDITIONAL",
      description: "Bifurcation Point: Students either accept published results (Normal Path) or submit autonomous revaluation applications within 7 days.",
      targetNav: "published-results",
      metric: "Bifurcation Point",
    },

    // TRACK A: NORMAL PATH
    {
      id: "step-verify-min-eligibility",
      number: 24,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Verify Minimum Pass Eligibility",
      role: "Dean",
      status: "COMPLETED",
      branch: "normal",
      description: "Enforces 45% minimum external cutoff and 50% aggregate cutoff for autonomous degree credit credit-worthiness.",
      targetNav: "published-results",
      metric: "45% Ext / 50% Agg",
    },
    {
      id: "step-generate-marksheet",
      number: 25,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Generate Marksheet",
      role: "Dean",
      status: "COMPLETED",
      branch: "normal",
      description: "Generates digital grade cards with QR-code cryptographic signature and autonomous college watermarks.",
      targetNav: "published-results",
      metric: "QR Verified",
    },
    {
      id: "step-publish-approved-result",
      number: 26,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Publish Approved Result",
      role: "Dean",
      status: "COMPLETED",
      branch: "normal",
      description: "Official Gazette publication unlocked on Student Result Portal with instant grade viewing.",
      targetNav: "published-results",
      metric: "Gazette Released",
    },
    {
      id: "step-students-access",
      number: 27,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Students Access Final Marks",
      role: "Students",
      status: "COMPLETED",
      branch: "normal",
      description: "Candidates log in using Date of Birth & Register Number to inspect subject-wise grades, GPA, and CGPA.",
      targetNav: "published-results",
      metric: "100% Portals Open",
    },
    {
      id: "step-dean-endorsement",
      number: 28,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Dean Endorsement",
      role: "Dean",
      status: "COMPLETED",
      branch: "normal",
      description: "Final digital signature by Associate Dean (Academics) and Controller of Examinations.",
      targetNav: "published-results",
      metric: "Signed by Dean",
    },
    {
      id: "step-coe-portal-sync",
      number: 29,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Marks Sent to University / COE Portal",
      role: "COE / System",
      status: "COMPLETED",
      branch: "normal",
      description: "Synchronized with Anna University autonomous database repository for state-level degree conferring.",
      targetNav: "published-results",
      metric: "Synced with AU COE",
    },
    {
      id: "step-archival-transcripts",
      number: 30,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "Final Records Archival & Transcripts",
      role: "COE / System",
      status: "COMPLETED",
      branch: "normal",
      description: "Encrypted permanent ledger archiving and transcript printing for graduates.",
      targetNav: "published-results",
      metric: "Archived in Cloud",
    },
    {
      id: "step-end-normal",
      number: 31,
      phase: "NORMAL_RESULT",
      phaseTitle: "Track A: Normal Result Publishing",
      title: "End (Result Lifecycle Complete)",
      role: "COE / System",
      status: "COMPLETED",
      branch: "normal",
      description: "Concludes the standard examination session lifecycle.",
      targetNav: "dashboard",
    },

    // TRACK B: 3-TIER REVALUATION & GRIEVANCE PATH
    {
      id: "step-apply-reval",
      number: 32,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Apply for Revaluation",
      role: "Students",
      status: "COMPLETED",
      branch: "reval",
      description: "Student submits online revaluation petition with statutory examination fee (₹600/paper).",
      targetNav: "revaluation",
      metric: "12 Petitions Logged",
    },
    {
      id: "step-dean-allots-ex2",
      number: 33,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Dean Assigns Second Faculty (Examiner 2)",
      role: "Dean",
      status: "COMPLETED",
      branch: "reval",
      description: "Under autonomous rules, only the Dean appoints an independent External Examiner (Examiner 2) from premier institutions.",
      targetNav: "revaluation",
      metric: "External Pool Assigned",
    },
    {
      id: "step-second-faculty-eval",
      number: 34,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Second Faculty Evaluates (Examiner 2)",
      role: "Faculty",
      status: "COMPLETED",
      branch: "reval",
      description: "Examiner 2 conducts independent blind re-evaluation of answer script without seeing Examiner 1 remarks.",
      targetNav: "revaluation",
      metric: "M2 Marks Awarded",
    },
    {
      id: "step-calc-reval-marks",
      number: 35,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Calculate Re-evaluated Marks & Delta (|M1 - M2|)",
      role: "Dean",
      status: "COMPLETED",
      branch: "reval",
      description: "Computes mark discrepancy Delta: |Examiner 1 Marks - Examiner 2 Marks|.",
      targetNav: "revaluation",
      formula: "Delta (Δ) = | M1 - M2 |",
    },
    {
      id: "step-delta-check",
      number: 36,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Difference > 10 Marks? (Examiner 3 Escrow)",
      role: "Dean",
      status: "CONDITIONAL",
      branch: "reval",
      description: "Critical Statutory Rule: If Delta ≤ 10, marks are resolved normally. If Delta > 10 marks, Examiner 3 Escrow is triggered!",
      targetNav: "revaluation",
      metric: "Threshold: 10 Marks",
    },
    {
      id: "step-allot-ex3",
      number: "36.1",
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Allot Third Specialist Examiner (Examiner 3)",
      role: "Dean",
      status: "ACTIVE",
      branch: "ex3_triggered",
      description: "When discrepancy exceeds 10 marks, Dean personally allots Examiner 3 (Senior Subject Specialist / Autonomous Board Chairman) to resolve the divergence.",
      targetNav: "revaluation",
      metric: "Escrow Queue Active",
    },
    {
      id: "step-resolution-formula",
      number: 37,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Calculate Nearest Two Marks Average / Ratification",
      role: "Dean",
      status: "COMPLETED",
      branch: "reval",
      description: "Statutory formula: Average of the two nearest evaluations amongst M1, M2, and M3.",
      targetNav: "revaluation",
      formula: "Ratified Score = (Nearest Pair Sum) / 2",
    },
    {
      id: "step-mark-improvement",
      number: 38,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Mark Improvement Verification",
      role: "Dean",
      status: "COMPLETED",
      branch: "reval",
      description: "If re-evaluated score is higher, grade improves. If lower, student benefits from the higher of the two marks.",
      targetNav: "revaluation",
      metric: "Beneficial Mark Retained",
    },
    {
      id: "step-dean-ratifies-reval",
      number: 39,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Dean Ratifies Revaluation Result",
      role: "Dean",
      status: "COMPLETED",
      branch: "reval",
      description: "Associate Dean signs revaluation gazette amendment and passes to accounts for fee/refund processing.",
      targetNav: "revaluation",
      metric: "Ratified by Dean",
    },
    {
      id: "step-updated-marks-card",
      number: 40,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Updated Marks Card Issued",
      role: "COE / System",
      status: "COMPLETED",
      branch: "reval",
      description: "Amended mark sheet issued with revised grade and synchronized with online result portal.",
      targetNav: "published-results",
      metric: "Revised Marks Card",
    },
    {
      id: "step-reval-closed",
      number: 41,
      phase: "REVALUATION",
      phaseTitle: "Track B: 3-Tier Revaluation Engine",
      title: "Revaluation Closed -> End",
      role: "COE / System",
      status: "COMPLETED",
      branch: "reval",
      description: "Final closure of session revaluation audit. Transcripts permanently committed to university records.",
      targetNav: "dashboard",
    },
  ];

  const filteredSteps =
    phaseFilter === "ALL"
      ? workflowSteps
      : workflowSteps.filter((s) => s.phase === phaseFilter);

  const currentStep =
    workflowSteps.find((s) => s.id === selectedStepId) || workflowSteps[4];

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0B192C] text-[#D4A72C] flex items-center justify-center font-bold shrink-0 shadow-md">
              <GitFork size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200 uppercase tracking-wider">
                  Full 35-Stage Governance Flow
                </span>
                <span className="text-xs font-bold text-gray-500 font-mono">
                  Autonomous Examination &amp; Revaluation Architecture
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#0B192C] tracking-tight mt-0.5">
                Examination &amp; Valuation Lifecycle Workflow Map
              </h1>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                Comprehensive interactive workflow implementation covering student enrollment, exam scheduling, hall allocation, blind dummy barcode evaluation, grace moderation, normal result publishing, and the autonomous 3-tier revaluation escrow engine (&Delta; &gt; 10M).
              </p>
            </div>
          </div>

          {/* Controls: Phase filter and view mode */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setPhaseFilter("ALL")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  phaseFilter === "ALL" ? "bg-[#0B192C] text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                All (41)
              </button>
              <button
                onClick={() => setPhaseFilter("PRE_EXAM")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  phaseFilter === "PRE_EXAM" ? "bg-blue-900 text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Pre-Exam (10)
              </button>
              <button
                onClick={() => setPhaseFilter("VALUATION")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  phaseFilter === "VALUATION" ? "bg-[#0B192C] text-[#D4A72C] shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Valuation (7)
              </button>
              <button
                onClick={() => setPhaseFilter("MODERATION")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  phaseFilter === "MODERATION" ? "bg-amber-600 text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Moderation (6)
              </button>
              <button
                onClick={() => setPhaseFilter("NORMAL_RESULT")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  phaseFilter === "NORMAL_RESULT" ? "bg-emerald-700 text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Normal Path (8)
              </button>
              <button
                onClick={() => setPhaseFilter("REVALUATION")}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  phaseFilter === "REVALUATION" ? "bg-red-600 text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                Revaluation (10)
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#F8F5EE] border border-[#E5E1D8] p-1 rounded-xl">
              <button
                onClick={() => setViewMode("diagram")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === "diagram"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Diagram
              </button>
              <button
                onClick={() => setViewMode("steps")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  viewMode === "steps"
                    ? "bg-[#0B192C] text-[#D4A72C] shadow-xs"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Directory
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TWO PANEL LAYOUT: DIAGRAM ON LEFT, STEP INSPECTOR ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: VISUAL FLOWCHART (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E5E1D8] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-[#D4A72C]" />
              EXACT ARCHITECTURAL MATCH TO WORKFLOW SPECIFICATION
            </span>
            <span className="text-[11px] font-semibold text-gray-500">
              Click any block to inspect and navigate
            </span>
          </div>

          {viewMode === "diagram" ? (
            /* FULL VISUAL FLOWCHART CANVAS */
            <div className="space-y-8 max-w-xl mx-auto py-2">
              {/* SECTION 1: PRE-EXAM SETUP */}
              {(phaseFilter === "ALL" || phaseFilter === "PRE_EXAM") && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                      PHASE 1: PRE-EXAMINATION &amp; SETUP
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    {/* Start */}
                    <div
                      onClick={() => setSelectedStepId("step-start")}
                      className={`w-40 py-2 rounded-full text-xs font-black text-center shadow cursor-pointer transition border-2 ${
                        selectedStepId === "step-start"
                          ? "bg-[#D4A72C] text-[#0B192C] border-[#0B192C] scale-105"
                          : "bg-[#0B192C] text-white hover:bg-slate-800 border-[#D4A72C]/40"
                      }`}
                    >
                      Start
                    </div>
                    <ArrowDown size={16} className="text-[#0B192C]" />

                    {/* Pre-Exam linear nodes */}
                    {[
                      { id: "step-registration", label: "Student Registration" },
                      { id: "step-enrollment", label: "Student Course Enrollment" },
                      { id: "step-subjects", label: "Subject Allocation" },
                      { id: "step-timetable", label: "Timetable Generation" },
                      { id: "step-hall-allocation", label: "Hall Allocation (40/Hall Ceil)" },
                      { id: "step-attendance", label: "Attendance Marking" },
                      { id: "step-qp-notice", label: "QP Preparation Notice" },
                      { id: "step-faculty-prepares-qp", label: "Faculty Prepares Question Paper (QP)" },
                      { id: "step-qp-upload", label: "QP Upload Complete & HOD Approval" },
                    ].map((item, idx, arr) => (
                      <React.Fragment key={item.id}>
                        <div
                          onClick={() => setSelectedStepId(item.id)}
                          className={`w-72 py-2.5 px-4 rounded-2xl text-xs font-bold text-center shadow-xs cursor-pointer transition border-2 ${
                            selectedStepId === item.id
                              ? "bg-[#0B192C] text-[#D4A72C] border-[#D4A72C] scale-105"
                              : "bg-[#0B192C] text-white hover:bg-slate-800 border-transparent"
                          }`}
                        >
                          {item.label}
                        </div>
                        {idx < arr.length - 1 && <ArrowDown size={16} className="text-[#0B192C]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: BLIND VALUATION */}
              {(phaseFilter === "ALL" || phaseFilter === "VALUATION") && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      PHASE 2: BLIND VALUATION &amp; PAPER CORRECTION
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <ArrowDown size={16} className="text-[#0B192C]" />
                    {[
                      { id: "step-dean-alloc-notif", label: "Dean Allocation Notification to Faculty" },
                      { id: "step-paper-val-assign", label: "Paper Valuation Assignment (Masked Dummy Barcode)" },
                      { id: "step-exam-eval-faculty", label: "Examination Paper Evaluation by Faculty" },
                      { id: "step-faculty-evaluates", label: "Faculty Evaluates Papers & Records Marks" },
                      { id: "step-upload-marks", label: "Upload Marks into Valuation Engine" },
                      { id: "step-dean-verifies-marks", label: "Dean Verifies Marks & De-Masks Dummy Barcodes" },
                      { id: "step-mark-sheet-gen", label: "Mark Sheet Generated (Connector A)" },
                    ].map((item, idx, arr) => (
                      <React.Fragment key={item.id}>
                        <div
                          onClick={() => setSelectedStepId(item.id)}
                          className={`w-72 py-2.5 px-4 rounded-2xl text-xs font-bold text-center shadow-xs cursor-pointer transition border-2 ${
                            selectedStepId === item.id
                              ? "bg-[#0B192C] text-[#D4A72C] border-[#D4A72C] scale-105"
                              : "bg-[#0B192C] text-white hover:bg-slate-800 border-transparent"
                          }`}
                        >
                          {item.label}
                        </div>
                        {idx < arr.length - 1 && <ArrowDown size={16} className="text-[#0B192C]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: MODERATION & BIFURCATION */}
              {(phaseFilter === "ALL" || phaseFilter === "MODERATION") && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-600" />
                    <span className="text-xs font-black text-purple-950 uppercase tracking-wider">
                      PHASE 3: COMPUTATION, MODERATION &amp; DECISION NODE
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#0B192C] text-[#D4A72C] font-mono font-bold text-xs flex items-center justify-center">
                      A
                    </div>
                    <ArrowDown size={16} className="text-[#0B192C]" />

                    {[
                      { id: "step-calc-internals", label: "Calculate Internal Marks" },
                      { id: "step-calc-externals", label: "Calculate External Marks" },
                      { id: "step-moderation", label: "Moderation Applied If Needed (Grace Marks)" },
                      { id: "step-final-calculated-result", label: "Final Calculated Result" },
                      { id: "step-results-compilation", label: "Results Compilation & Review Process" },
                    ].map((item) => (
                      <React.Fragment key={item.id}>
                        <div
                          onClick={() => setSelectedStepId(item.id)}
                          className={`w-72 py-2.5 px-4 rounded-2xl text-xs font-bold text-center shadow-xs cursor-pointer transition border-2 ${
                            selectedStepId === item.id
                              ? "bg-[#0B192C] text-[#D4A72C] border-[#D4A72C] scale-105"
                              : "bg-[#0B192C] text-white hover:bg-slate-800 border-transparent"
                          }`}
                        >
                          {item.label}
                        </div>
                        <ArrowDown size={16} className="text-[#0B192C]" />
                      </React.Fragment>
                    ))}

                    {/* DECISION NODE: Grievance/Reval */}
                    <div
                      onClick={() => setSelectedStepId("step-decision-grievance")}
                      className={`w-80 py-3.5 px-4 rounded-2xl text-xs font-black text-center shadow-md cursor-pointer transition border-2 ${
                        selectedStepId === "step-decision-grievance"
                          ? "bg-amber-400 text-[#0B192C] border-black scale-105"
                          : "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200"
                      }`}
                    >
                      Any Revaluation / Grievance Application?
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: PARALLEL BRANCHING (Track A vs Track B) */}
              {(phaseFilter === "ALL" || phaseFilter === "NORMAL_RESULT" || phaseFilter === "REVALUATION") && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* TRACK A: NORMAL PATH */}
                    {(phaseFilter === "ALL" || phaseFilter === "NORMAL_RESULT") && (
                      <div className="p-4 bg-emerald-50/40 border-2 border-emerald-200 rounded-2xl space-y-2">
                        <div className="text-center pb-2 border-b border-emerald-200">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-700 text-white uppercase tracking-wider">
                            TRACK A: NORMAL RESULT PATH
                          </span>
                          <span className="text-[11px] text-emerald-800 block mt-1 font-semibold">
                            (No Grievance / Standard Pass)
                          </span>
                        </div>

                        <div className="flex flex-col items-center space-y-2 pt-2">
                          {[
                            { id: "step-verify-min-eligibility", label: "Verify Minimum Pass Eligibility" },
                            { id: "step-generate-marksheet", label: "Generate Marksheet" },
                            { id: "step-publish-approved-result", label: "Publish Approved Result" },
                            { id: "step-students-access", label: "Students Access Final Marks" },
                            { id: "step-dean-endorsement", label: "Dean Endorsement" },
                            { id: "step-coe-portal-sync", label: "Marks Sent to University/COE Portal" },
                            { id: "step-archival-transcripts", label: "Final Records Archival & Transcripts" },
                            { id: "step-end-normal", label: "End (Normal Result Lifecycle Complete)" },
                          ].map((item, idx, arr) => (
                            <React.Fragment key={item.id}>
                              <div
                                onClick={() => setSelectedStepId(item.id)}
                                className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold text-center shadow-xs cursor-pointer transition border-2 ${
                                  selectedStepId === item.id
                                    ? "bg-emerald-900 text-[#D4A72C] border-[#D4A72C] scale-105"
                                    : "bg-emerald-800 text-white hover:bg-emerald-900 border-transparent"
                                }`}
                              >
                                {item.label}
                              </div>
                              {idx < arr.length - 1 && <ArrowDown size={14} className="text-emerald-700" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TRACK B: 3-TIER REVALUATION */}
                    {(phaseFilter === "ALL" || phaseFilter === "REVALUATION") && (
                      <div className="p-4 bg-red-50/40 border-2 border-red-200 rounded-2xl space-y-2">
                        <div className="text-center pb-2 border-b border-red-200">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-red-700 text-white uppercase tracking-wider">
                            TRACK B: 3-TIER REVALUATION
                          </span>
                          <span className="text-[11px] text-red-800 block mt-1 font-semibold">
                            (Dean Allots Ex-2 &amp; Ex-3 if &Delta; &gt; 10M)
                          </span>
                        </div>

                        <div className="flex flex-col items-center space-y-2 pt-2">
                          {[
                            { id: "step-apply-reval", label: "Apply for Revaluation" },
                            { id: "step-dean-allots-ex2", label: "Dean Assigns Second Faculty (Examiner 2)" },
                            { id: "step-second-faculty-eval", label: "Second Faculty Evaluates (Examiner 2)" },
                            { id: "step-calc-reval-marks", label: "Calculate Re-evaluated Marks & Delta" },
                          ].map((item) => (
                            <React.Fragment key={item.id}>
                              <div
                                onClick={() => setSelectedStepId(item.id)}
                                className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold text-center shadow-xs cursor-pointer transition border-2 ${
                                  selectedStepId === item.id
                                    ? "bg-[#0B192C] text-[#D4A72C] border-[#D4A72C] scale-105"
                                    : "bg-[#0B192C] text-white hover:bg-slate-800 border-transparent"
                                }`}
                              >
                                {item.label}
                              </div>
                              <ArrowDown size={14} className="text-red-700" />
                            </React.Fragment>
                          ))}

                          {/* DELTA > 10 DECISION */}
                          <div
                            onClick={() => setSelectedStepId("step-delta-check")}
                            className={`w-full py-2 px-2 rounded-xl text-[11px] font-black text-center shadow-xs cursor-pointer transition border-2 ${
                              selectedStepId === "step-delta-check"
                                ? "bg-red-600 text-white border-black scale-105"
                                : "bg-red-100 text-red-900 border-red-300 hover:bg-red-200"
                            }`}
                          >
                            Difference &gt; 10 Marks?
                          </div>
                          <ArrowDown size={14} className="text-red-700" />

                          {/* IF YES: EX-3 */}
                          <div
                            onClick={() => setSelectedStepId("step-allot-ex3")}
                            className={`w-full py-2 px-3 rounded-xl text-[11px] font-black text-center shadow-xs cursor-pointer transition border-2 ${
                              selectedStepId === "step-allot-ex3"
                                ? "bg-red-700 text-white border-[#D4A72C] scale-105"
                                : "bg-red-600 text-white hover:bg-red-700 border-transparent animate-pulse"
                            }`}
                          >
                            Yes &rarr; Allot Third Specialist Examiner
                          </div>
                          <ArrowDown size={14} className="text-red-700" />

                          {[
                            { id: "step-resolution-formula", label: "Calculate Nearest Two Marks Average" },
                            { id: "step-mark-improvement", label: "Mark Improvement Verification" },
                            { id: "step-dean-ratifies-reval", label: "Dean Ratifies Revaluation Result" },
                            { id: "step-updated-marks-card", label: "Updated Marks Card Issued" },
                            { id: "step-reval-closed", label: "Revaluation Closed &rarr; End" },
                          ].map((item, idx, arr) => (
                            <React.Fragment key={item.id}>
                              <div
                                onClick={() => setSelectedStepId(item.id)}
                                className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold text-center shadow-xs cursor-pointer transition border-2 ${
                                  selectedStepId === item.id
                                    ? "bg-[#0B192C] text-[#D4A72C] border-[#D4A72C] scale-105"
                                    : "bg-[#0B192C] text-white hover:bg-slate-800 border-transparent"
                                }`}
                              >
                                {item.label}
                              </div>
                              {idx < arr.length - 1 && <ArrowDown size={14} className="text-red-700" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP-BY-STEP DIRECTORY VIEW */
            <div className="space-y-2.5">
              {filteredSteps.map((step) => {
                const isSelected = step.id === selectedStepId;
                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStepId(step.id)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? "border-[#D4A72C] bg-amber-50/20 shadow-sm"
                        : "border-[#E5E1D8] hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#0B192C] text-[#D4A72C] text-xs font-black flex items-center justify-center shrink-0">
                        {step.number}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-[#0B192C]">{step.title}</h4>
                          <span className="text-[9px] font-bold text-gray-400 font-mono">
                            {step.phaseTitle.split(":")[0]}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{step.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800">
                        {step.role}
                      </span>
                      {step.metric && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-900 font-mono">
                          {step.metric}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: SELECTED STEP INSPECTION & JUMP CARD (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border-2 border-[#E5E1D8] p-6 shadow-sm space-y-5 sticky top-6">
          <div className="flex items-start justify-between border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                STEP {currentStep.number} &bull; {currentStep.phaseTitle}
              </span>
              <h3 className="text-base font-black text-[#0B192C] mt-0.5 leading-snug">{currentStep.title}</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#0B192C] text-[#D4A72C] shrink-0">
              {currentStep.role}
            </span>
          </div>

          <div className="bg-[#F8F5EE] p-4 rounded-2xl border border-[#E5E1D8] space-y-2">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
              WORKFLOW DESCRIPTION &amp; STATUTORY RULES:
            </span>
            <p className="text-xs text-gray-700 leading-relaxed">{currentStep.description}</p>
          </div>

          {currentStep.formula && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-black block uppercase text-[10px]">Statutory Formula:</span>
              <p className="font-mono font-bold text-amber-950">{currentStep.formula}</p>
            </div>
          )}

          {currentStep.metric && (
            <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-200 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-950">Active System Data:</span>
              <span className="font-black font-mono text-blue-900 bg-white px-2 py-0.5 rounded shadow-xs">
                {currentStep.metric}
              </span>
            </div>
          )}

          {/* Role assignment indicator */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-gray-500 font-medium">Executing Role Authority:</span>
            <span className="font-bold text-[#0B192C]">{currentStep.role}</span>
          </div>

          {/* DIRECT ACTION BUTTON TO JUMP INTO THAT MODULE */}
          <div className="pt-2">
            <button
              onClick={() => {
                onNavigate(currentStep.targetNav);
                if (onToast) onToast(`Navigated to ${currentStep.title} (${currentStep.targetNav})`);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0B192C] hover:bg-[#1a2f4d] text-[#D4A72C] font-black text-xs transition shadow-lg flex items-center justify-center gap-2 cursor-pointer border-2 border-[#D4A72C]/40"
            >
              <span>Launch {currentStep.title} Module</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowChartTrackerView;
