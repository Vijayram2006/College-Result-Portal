import { cachedQuestionPapers } from "../services/questionPapersApi";

export type HierarchyRole = "Faculty" | "HOD" | "AD" | "COE" | "Chief COE";
export type HierarchyStageNumber = 1 | 2 | 3 | 4 | 5;

export interface StageSignature {
  stageNumber: HierarchyStageNumber;
  stageRole: HierarchyRole;
  officerTitle: string;
  officerName: string;
  status: "COMPLETED" | "CURRENT" | "PENDING" | "RETURNED";
  timestamp?: string;
  sealOrReference?: string;
  remarks?: string;
}

export interface QuestionPartAItem {
  qNo: number;
  text: string;
  co: string;
  bloom: string;
  marks: number;
}

export interface QuestionPartBItem {
  qNo: number;
  optionA: {
    text: string;
    co: string;
    bloom: string;
    marks: number;
    subdivisions?: string[];
  };
  optionB: {
    text: string;
    co: string;
    bloom: string;
    marks: number;
    subdivisions?: string[];
  };
}

export interface QuestionPartCItem {
  qNo: number;
  text: string;
  co: string;
  bloom: string;
  marks: number;
  rubricHint: string;
}

export interface PdfAttachment {
  fileName: string;
  fileSize: string;
  fileData: string; // base64 data URL
  uploadedAt: string;
}

export interface QuestionPaperItem {
  id: string;
  qpCode: string;
  subjectCode: string;
  subjectTitle: string;
  department: string;
  deptKey: string;
  facultyName: string; // Stage 1: Faculty Author
  hodName: string; // Stage 2: HOD DAC Scrutiny
  adName: string; // Stage 3: Associate Dean Academic Scrutiny
  coeName: string; // Stage 4: COE Examination Wing
  chiefCoeName: string; // Stage 5: Chief COE / Super Admin
  currentStageNumber: HierarchyStageNumber; // 1 to 5
  currentStageRole: HierarchyRole;
  status:
    | "PENDING_HOD_REVIEW"
    | "PENDING_AD_REVIEW"
    | "PENDING_COE_REVIEW"
    | "PENDING_CHIEF_COE"
    | "CHIEF_COE_APPROVED"
    | "RETURNED_TO_FACULTY"
    | "RETURNED_TO_HOD"
    | "RETURNED_TO_AD"
    | "RETURNED_TO_COE";
  semester: string;
  academicYear: string;
  regulation: string;
  examType: "End Semester Examination" | "Internal Assessment - I" | "Internal Assessment - II" | "Model Examination";
  set: "Set A" | "Set B";
  dateSubmitted: string;
  timeSubmitted: string;
  forwardedToCoe: boolean;
  forwardedDate?: string;
  approvedBy?: string;
  adRemarks?: string;
  maxMarks: number;
  durationHours: number;
  syllabusCoverage: string;
  bloomsDistribution: {
    rememberUnderstand: number; // K1-K2 (%)
    applyAnalyze: number; // K3-K4 (%)
    evaluateCreate: number; // K5-K6 (%)
  };
  courseOutcomesCovered: string[];
  parts: {
    partA: {
      instructions: string;
      questions: QuestionPartAItem[];
    };
    partB: {
      instructions: string;
      questions: QuestionPartBItem[];
    };
    partC: {
      instructions: string;
      questions: QuestionPartCItem[];
    };
  };
  hodDeclaration: {
    certifiedByHod: boolean;
    moderationDoneByDept: boolean;
    date: string;
    hodNote: string;
  };
  coeReferenceNo?: string;
  chiefCoeSealNo?: string;
  hierarchyTrail: StageSignature[];
  pdfAttachment?: PdfAttachment;
}

export const STORAGE_KEY = "kvell_assoc_dean_question_papers";

/** Normalises a question paper from the server. Missing fields stay blank: nothing is invented. */
export function sanitizeQuestionPaper(p: any): QuestionPaperItem {
  if (!p || typeof p !== "object") p = {};

  const id = p.id || `QP-${Date.now()}`;
  const subjectCode = p.subjectCode || "";
  const subjectTitle = p.subjectTitle || "";
  const department = p.department || "";
  const deptKey = p.deptKey || "";
  const facultyName = p.facultyName || "";
  const hodName = p.hodName || "";
  const adName = p.adName || "";
  const coeName = p.coeName || "";
  const chiefCoeName = p.chiefCoeName || "";

  let currentStageNumber: HierarchyStageNumber = 1;
  if (typeof p.currentStageNumber === "number" && p.currentStageNumber >= 1 && p.currentStageNumber <= 5) {
    currentStageNumber = p.currentStageNumber as HierarchyStageNumber;
  } else if (p.status === "PENDING_HOD_REVIEW") {
    currentStageNumber = 2;
  } else if (p.status === "PENDING_AD_REVIEW") {
    currentStageNumber = 3;
  } else if (p.status === "PENDING_COE_REVIEW") {
    currentStageNumber = 4;
  } else if (p.status === "CHIEF_COE_APPROVED" || p.status === "PENDING_CHIEF_COE") {
    currentStageNumber = 5;
  }

  const currentStageRole: HierarchyRole =
    p.currentStageRole ||
    (currentStageNumber === 1
      ? "Faculty"
      : currentStageNumber === 2
      ? "HOD"
      : currentStageNumber === 3
      ? "AD"
      : currentStageNumber === 4
      ? "COE"
      : "Chief COE");

  const status = p.status || "DRAFT";
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const bloomsDistribution = {
    rememberUnderstand: num(p.bloomsDistribution?.rememberUnderstand),
    applyAnalyze: num(p.bloomsDistribution?.applyAnalyze),
    evaluateCreate: num(p.bloomsDistribution?.evaluateCreate),
  };

  // Without a recorded trail, show only who holds the paper at each stage (no invented dates, seals or remarks)
  const stage = (n: HierarchyStageNumber): StageSignature["status"] =>
    n < currentStageNumber || (n === 5 && status === "CHIEF_COE_APPROVED") ? "COMPLETED" : n === currentStageNumber ? "CURRENT" : "PENDING";
  const defaultTrail: StageSignature[] = [
    { stageNumber: 1, stageRole: "Faculty", officerTitle: "Subject Instructor", officerName: facultyName, status: stage(1), timestamp: p.dateSubmitted || undefined },
    { stageNumber: 2, stageRole: "HOD", officerTitle: "Head of Department", officerName: hodName, status: stage(2) },
    { stageNumber: 3, stageRole: "AD", officerTitle: "Associate Dean (Academics)", officerName: adName, status: stage(3), timestamp: p.forwardedDate || undefined, remarks: p.adRemarks || undefined },
    { stageNumber: 4, stageRole: "COE", officerTitle: "Controller of Examinations", officerName: coeName, status: stage(4), sealOrReference: p.coeReferenceNo },
    { stageNumber: 5, stageRole: "Chief COE", officerTitle: "Chief University Controller", officerName: chiefCoeName, status: stage(5), sealOrReference: p.chiefCoeSealNo },
  ];
  const hierarchyTrail = Array.isArray(p.hierarchyTrail) && p.hierarchyTrail.length > 0 ? p.hierarchyTrail : defaultTrail;

  const part = (x: any) => ({
    instructions: x?.instructions || "",
    questions: Array.isArray(x?.questions) ? x.questions : [],
  });

  return {
    ...p,
    id,
    qpCode: p.qpCode || "",
    subjectCode,
    subjectTitle,
    department,
    deptKey,
    facultyName,
    hodName,
    adName,
    coeName,
    chiefCoeName,
    currentStageNumber,
    currentStageRole,
    status,
    semester: p.semester || "",
    academicYear: p.academicYear || "",
    regulation: p.regulation || "",
    examType: p.examType || "",
    set: p.set || "",
    dateSubmitted: p.dateSubmitted || "",
    timeSubmitted: p.timeSubmitted || "",
    forwardedToCoe: !!p.forwardedToCoe,
    forwardedDate: p.forwardedDate,
    approvedBy: p.approvedBy,
    adRemarks: p.adRemarks || "",
    maxMarks: p.maxMarks || 100,
    durationHours: p.durationHours || 3,
    syllabusCoverage: p.syllabusCoverage || "",
    bloomsDistribution,
    courseOutcomesCovered: Array.isArray(p.courseOutcomesCovered) ? p.courseOutcomesCovered : [],
    parts: { partA: part(p.parts?.partA), partB: part(p.parts?.partB), partC: part(p.parts?.partC) },
    hodDeclaration: p.hodDeclaration || { certifiedByHod: false, moderationDoneByDept: false, date: "", hodNote: "" },
    coeReferenceNo: p.coeReferenceNo,
    chiefCoeSealNo: p.chiefCoeSealNo,
    hierarchyTrail,
    pdfAttachment: p.pdfAttachment?.fileData
      ? {
          fileName: p.pdfAttachment.fileName || `${subjectCode || "question-paper"}.pdf`,
          fileSize: p.pdfAttachment.fileSize || "",
          fileData: p.pdfAttachment.fileData,
          uploadedAt: p.pdfAttachment.uploadedAt || p.dateSubmitted || "",
        }
      : undefined,
  };
}

/** The question papers the signed-in COE / Chief COE may see (from the server; see services/questionPapersApi). */
export function safeLoadQuestionPapers(): QuestionPaperItem[] {
  return cachedQuestionPapers();
}
