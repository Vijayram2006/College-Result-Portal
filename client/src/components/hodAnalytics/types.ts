/** Record shapes shared with the admin panel (admin-panel/src/services/api.ts), used by the HOD analytics. */

export interface StudentRecord {
  regNo: string;
  studentName: string;
  dob: string;
  dept: string;
  deptKey: string;
  deptName: string;
  category: "regular" | "lateral";
  year: string;
  semester: string;
  academicYear: string;
}

export interface SubjectRecord {
  id: string;
  code: string;
  title: string;
  category: "Core Mandatory" | "Professional Elective" | "Open Elective";
  credits: number;
  department: string;
  deptKey: string;
  semester: string;
  academicYear?: string;
  faculty: string;
  status: "COE FINALIZED" | "PENDING APPROVAL";
  studentsEnrolled?: number;
}

export interface Subdivisions {
  i: number;
  ii: number;
  iii: number;
}

export interface QuestionMarks {
  a: Subdivisions;
  b: Subdivisions;
}

/** One row of the Mark Entry roster. */
export interface StudentMarkRecord {
  regNo: string;
  name: string;
  dob: string;
  category: "regular" | "lateral";
  hasMarks: boolean;
  partATotal: number;
  partBCTotal: number;
  grandTotal: number;
  grade: string;
  resultStatus: "PASS" | "FAIL";
  partA: number[];
  partBC: Record<string, QuestionMarks>;
  assessmentType?: string;
  deptKey?: string;
  deptName?: string;
  semester?: string;
  subjectCode?: string;
  subjectTitle?: string;
  examinerName?: string;
  examinerDesignation?: string;
}

export interface ResultRecordItem {
  regNo: string;
  studentName: string;
  deptKey: string;
  courseCode: string;
  courseTitle: string;
  credits?: number;
  semester: string;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
  gradePoints: number;
  resultStatus: "PASS" | "FAIL";
}

export interface ResultBatchRecord {
  id: string;
  batchTitle: string;
  departmentKey: string;
  departmentName: string;
  semester: string;
  academicYear: string;
  examMonthYear: string;
  subjectCode?: string;
  subjectTitle?: string;
  uploadDate: string;
  uploadedBy: string;
  totalStudents: number;
  passedStudents: number;
  passPercentage: number;
  publicationStatus: "DRAFT" | "VALIDATED" | "PUBLISHED";
  publishedAt?: string;
  publishedBy?: string;
  records: ResultRecordItem[];
  /** IAT-1, IAT-2 or End Semester */
  assessmentType?: string;
}
