/**
 * Autonomous 14-Digit Registration Number Generation Engine
 * SPECIFICATION: STRICTLY FOR ENGINEERING ONLY (KVCET - Karpaga Vinayaga College of Engineering and Technology)
 * Under KVELL-KVCET Official Academic Regulation
 *
 * Formula:
 * [University Year: 4 digits] + [KVCET: 01] + [Degree: 1 digit] + [Programme: 2 digits] + [Year of Admission: 2 digits] + [Roll Number: 3 digits]
 * Total: 14 Digits
 */

export interface EngineeringProgramme {
  code: string; // 2 digits
  name: string;
  shortName: string;
}

export const ENGINEERING_COLLEGE_CODE = "01";

// Degree Codes as per official document
export const DEGREE_CODES = {
  UG: "1",
  PG: "2",
  PHD: "3",
} as const;

// UG Programmes as per official document
export const ENGINEERING_UG_BRANCHES: EngineeringProgramme[] = [
  { code: "01", name: "Automobile Engineering", shortName: "AUTO" },
  { code: "02", name: "Artificial Intelligence and Data Science", shortName: "AI&DS" },
  { code: "03", name: "Biomedical Engineering", shortName: "BME" },
  { code: "04", name: "Biotechnology", shortName: "BIOTECH" },
  { code: "05", name: "Civil Engineering", shortName: "CIVIL" },
  { code: "06", name: "Computer Science Engineering", shortName: "CSE" },
  { code: "07", name: "Electrical and Electronics Engineering", shortName: "EEE" },
  { code: "08", name: "Electronics and Communication Engineering", shortName: "ECE" },
  { code: "09", name: "Mechanical Engineering", shortName: "MECH" },
  { code: "10", name: "Robotics and Automation", shortName: "ROBO" },
];

// PG Programmes as per official document
export const ENGINEERING_PG_BRANCHES: EngineeringProgramme[] = [
  { code: "01", name: "Big Data Analytics", shortName: "BDA" },
  { code: "02", name: "Biometric and Cyber Security", shortName: "BCS" },
  { code: "03", name: "Biotechnology", shortName: "PG-BIOTECH" },
  { code: "04", name: "Computer Science and Engineering (Networks)", shortName: "CSE-NET" },
  { code: "05", name: "Manufacturing Engineering", shortName: "MFG" },
  { code: "06", name: "Master of Business Administration", shortName: "MBA" },
  { code: "07", name: "Master of Computer Applications", shortName: "MCA" },
];

export interface RegNoBreakdown {
  universityYear: string;
  collegeCode: string;
  collegeName: string;
  degreeCode: string;
  degreeName: string;
  programmeCode: string;
  programmeName: string;
  yearOfAdmission: string;
  rollNumber: string;
  fullRegNo: string;
  isValid: boolean;
}

/**
 * Generate 14-digit registration number for Engineering
 */
export function buildEngineeringRegNo(params: {
  universityYear?: number | string; // default 2026
  degreeCode: "1" | "2" | "3";      // 1=UG, 2=PG, 3=Ph.D.
  programmeCode: string;            // 2-digit code e.g. "02"
  admissionYear?: number | string;  // default 26 (from 2026)
  rollNumber: number | string;      // sequential e.g. 1 -> "001"
}): string {
  const univYear = String(params.universityYear || "2026").trim();
  const collegeCode = ENGINEERING_COLLEGE_CODE; // strictly "01"
  const degree = params.degreeCode;
  const progCode = String(params.programmeCode).padStart(2, "0");
  
  // Year of Admission (2 digits)
  let admYr = String(params.admissionYear || "26").trim();
  if (admYr.length === 4) {
    admYr = admYr.slice(-2);
  }
  admYr = admYr.padStart(2, "0");

  // Roll Number (3 digits)
  const rollStr = String(params.rollNumber).padStart(3, "0");

  const regNo = `${univYear}${collegeCode}${degree}${progCode}${admYr}${rollStr}`;
  return regNo;
}

/**
 * Parse and validate an existing 14-digit registration number
 */
export function parseEngineeringRegNo(regNo: string): RegNoBreakdown | null {
  const clean = String(regNo || "").trim();
  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) {
    return null;
  }

  const universityYear = clean.substring(0, 4);
  const collegeCode = clean.substring(4, 6);
  const degreeCode = clean.substring(6, 7);
  const programmeCode = clean.substring(7, 9);
  const yearOfAdmission = clean.substring(9, 11);
  const rollNumber = clean.substring(11, 14);

  const isKvcet = collegeCode === ENGINEERING_COLLEGE_CODE;
  let degreeName = "Unknown";
  if (degreeCode === "1") degreeName = "Undergraduate (UG)";
  else if (degreeCode === "2") degreeName = "Postgraduate (PG)";
  else if (degreeCode === "3") degreeName = "Doctoral (Ph.D.)";

  let programmeName = "Custom / General Branch";
  if (degreeCode === "1") {
    const match = ENGINEERING_UG_BRANCHES.find((b) => b.code === programmeCode);
    if (match) programmeName = match.name;
  } else if (degreeCode === "2") {
    const match = ENGINEERING_PG_BRANCHES.find((b) => b.code === programmeCode);
    if (match) programmeName = match.name;
  }

  return {
    universityYear,
    collegeCode,
    collegeName: isKvcet ? "Karpaga Vinayaga College of Engineering & Technology (KVCET)" : "Other College",
    degreeCode,
    degreeName,
    programmeCode,
    programmeName,
    yearOfAdmission: `20${yearOfAdmission}`,
    rollNumber,
    fullRegNo: clean,
    isValid: isKvcet && (degreeCode === "1" || degreeCode === "2" || degreeCode === "3"),
  };
}
