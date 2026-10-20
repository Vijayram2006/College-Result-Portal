import { CollegeKey } from "../types/admission";

export interface CollegeDepartment {
  code: string;
  name: string;
  shortName: string;
  degreeLevel: "UG" | "PG";
}

export const COLLEGE_DEPARTMENTS: Record<CollegeKey, { UG: CollegeDepartment[]; PG: CollegeDepartment[] }> = {
  engineering: {
    UG: [
      { code: "01", name: "Automobile Engineering", shortName: "AUTO", degreeLevel: "UG" },
      { code: "02", name: "Artificial Intelligence and Data Science", shortName: "AI&DS", degreeLevel: "UG" },
      { code: "03", name: "Biomedical Engineering", shortName: "BME", degreeLevel: "UG" },
      { code: "04", name: "Biotechnology", shortName: "BIOTECH", degreeLevel: "UG" },
      { code: "05", name: "Civil Engineering", shortName: "CIVIL", degreeLevel: "UG" },
      { code: "06", name: "Computer Science Engineering", shortName: "CSE", degreeLevel: "UG" },
      { code: "07", name: "Electrical and Electronics Engineering", shortName: "EEE", degreeLevel: "UG" },
      { code: "08", name: "Electronics and Communication Engineering", shortName: "ECE", degreeLevel: "UG" },
      { code: "09", name: "Mechanical Engineering", shortName: "MECH", degreeLevel: "UG" },
      { code: "10", name: "Robotics and Automation", shortName: "ROBO", degreeLevel: "UG" },
    ],
    PG: [
      { code: "01", name: "Big Data Analytics", shortName: "BDA", degreeLevel: "PG" },
      { code: "02", name: "Biometric and Cyber Security", shortName: "BCS", degreeLevel: "PG" },
      { code: "03", name: "Biotechnology", shortName: "PG-BIOTECH", degreeLevel: "PG" },
      { code: "04", name: "Computer Science and Engineering (Networks)", shortName: "CSE-NET", degreeLevel: "PG" },
      { code: "05", name: "Manufacturing Engineering", shortName: "MFG", degreeLevel: "PG" },
      { code: "06", name: "Master of Business Administration", shortName: "MBA", degreeLevel: "PG" },
      { code: "07", name: "Master of Computer Applications", shortName: "MCA", degreeLevel: "PG" },
    ],
  },
  nursing: {
    UG: [
      { code: "01", name: "B.Sc Nursing (4-Year Basic)", shortName: "B.Sc Nursing", degreeLevel: "UG" },
      { code: "02", name: "Post Basic B.Sc Nursing", shortName: "P.B. B.Sc", degreeLevel: "UG" },
    ],
    PG: [
      { code: "01", name: "M.Sc Medical Surgical Nursing", shortName: "M.Sc Med-Surg", degreeLevel: "PG" },
      { code: "02", name: "M.Sc Community Health Nursing", shortName: "M.Sc Community", degreeLevel: "PG" },
      { code: "03", name: "M.Sc Obstetrics & Gynecological Nursing", shortName: "M.Sc OBG", degreeLevel: "PG" },
      { code: "04", name: "M.Sc Child Health (Pediatric) Nursing", shortName: "M.Sc Pediatric", degreeLevel: "PG" },
      { code: "05", name: "Nurse Practitioner in Critical Care (NPCC)", shortName: "NPCC", degreeLevel: "PG" },
    ],
  },
  pharmacy: {
    UG: [
      { code: "01", name: "Bachelor of Pharmacy (B.Pharm - 4 Yrs)", shortName: "B.Pharm", degreeLevel: "UG" },
      { code: "02", name: "Diploma in Pharmacy (D.Pharm - 2 Yrs)", shortName: "D.Pharm", degreeLevel: "UG" },
      { code: "03", name: "Doctor of Pharmacy (Pharm.D - 6 Yrs)", shortName: "Pharm.D", degreeLevel: "UG" },
    ],
    PG: [
      { code: "01", name: "M.Pharm Pharmaceutics", shortName: "M.Pharm P'ceutics", degreeLevel: "PG" },
      { code: "02", name: "M.Pharm Pharmacology", shortName: "M.Pharm P'cology", degreeLevel: "PG" },
      { code: "03", name: "M.Pharm Pharmaceutical Chemistry", shortName: "M.Pharm Chem", degreeLevel: "PG" },
      { code: "04", name: "M.Pharm Pharmaceutical Analysis", shortName: "M.Pharm Analysis", degreeLevel: "PG" },
    ],
  },
  emerging_sciences: {
    UG: [
      { code: "01", name: "B.Sc Artificial Intelligence & Data Science", shortName: "B.Sc AI&DS", degreeLevel: "UG" },
      { code: "02", name: "B.Sc Cyber Forensics & Information Security", shortName: "B.Sc Cyber", degreeLevel: "UG" },
      { code: "03", name: "B.Sc Medical Laboratory Technology (MLT)", shortName: "B.Sc MLT", degreeLevel: "UG" },
      { code: "04", name: "B.Sc Cardiac Care & Radiology Technology", shortName: "B.Sc Radiology", degreeLevel: "UG" },
      { code: "05", name: "B.Sc Clinical Nutrition & Dietetics", shortName: "B.Sc Nutrition", degreeLevel: "UG" },
    ],
    PG: [
      { code: "01", name: "M.Sc Medical Bioinformatics", shortName: "M.Sc Bioinfo", degreeLevel: "PG" },
      { code: "02", name: "M.Sc Artificial Intelligence in Healthcare", shortName: "M.Sc AI-Health", degreeLevel: "PG" },
      { code: "03", name: "M.Sc Molecular Diagnostics", shortName: "M.Sc Molecular", degreeLevel: "PG" },
    ],
  },
};
