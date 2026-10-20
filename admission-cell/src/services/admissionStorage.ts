/**
 * Isolated Student Admission Storage & Service Layer
 * Each Constituent Admission Cell has its OWN strictly partitioned storage key:
 * - Engineering: kvell_admission_engineering_applicants
 * - Nursing: kvell_admission_nursing_applicants
 * - Pharmacy: kvell_admission_pharmacy_applicants
 * - Emerging Sciences: kvell_admission_emerging_applicants
 *
 * ZERO registration numbers are pre-added. Everything is ready for the user to add.
 * ZERO mock applicants: All dashboards start clean with 0 default candidates.
 * Full support for real document uploads (Aadhar card, 10th marksheet, 12th marksheet).
 */

import { StudentApplicant, CollegeKey } from "../types/admission";

export function getCollegeStorageKey(collegeKey: CollegeKey): string {
  return `kvell_admission_${collegeKey}_applicants`;
}

export function getStoredApplicantsByCollege(collegeKey: CollegeKey): StudentApplicant[] {
  try {
    const key = getCollegeStorageKey(collegeKey);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Strip out any previously seeded mock applicants so dashboard starts clean
        const cleaned = parsed.filter(
          (s) =>
            !s.id?.startsWith("APP-ENG-") &&
            !s.id?.startsWith("APP-NUR-") &&
            !s.id?.startsWith("APP-PHARM-") &&
            !s.id?.startsWith("APP-EMERG-")
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.error(`Error reading admission storage for ${collegeKey}`, e);
  }
  return [];
}

export function saveApplicantsByCollege(collegeKey: CollegeKey, list: StudentApplicant[]) {
  try {
    const key = getCollegeStorageKey(collegeKey);
    localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event("kvell_admission_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error(`Error saving admission applicants for ${collegeKey}`, e);
  }
}

export function clearAllAdmissionDataForCollege(collegeKey: CollegeKey) {
  try {
    const key = getCollegeStorageKey(collegeKey);
    localStorage.removeItem(key);
    window.dispatchEvent(new Event("kvell_admission_updated"));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error(`Error clearing storage for ${collegeKey}`, e);
  }
}

export function clearAllAdmissionDataEverywhere() {
  const colleges: CollegeKey[] = ["engineering", "nursing", "pharmacy", "emerging_sciences"];
  colleges.forEach((c) => clearAllAdmissionDataForCollege(c));
}

export function createApplicantForCollege(
  collegeKey: CollegeKey,
  newApplicant: StudentApplicant
): StudentApplicant {
  const current = getStoredApplicantsByCollege(collegeKey);
  const updated = [newApplicant, ...current];
  saveApplicantsByCollege(collegeKey, updated);
  return newApplicant;
}

export function updateApplicantForCollege(
  collegeKey: CollegeKey,
  id: string,
  updates: Partial<StudentApplicant>
): StudentApplicant | null {
  const current = getStoredApplicantsByCollege(collegeKey);
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const updatedStudent: StudentApplicant = {
    ...current[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedStudent;
  saveApplicantsByCollege(collegeKey, current);
  return updatedStudent;
}

export function updateMandatedFeedsForCollege(
  collegeKey: CollegeKey,
  id: string,
  data: {
    regNo?: string;
    status?: StudentApplicant["status"];
    aadhar?: Partial<StudentApplicant["aadhar"]>;
    tenthMarks?: Partial<StudentApplicant["tenthMarks"]>;
    twelfthMarks?: Partial<StudentApplicant["twelfthMarks"]>;
  }
): StudentApplicant | null {
  const current = getStoredApplicantsByCollege(collegeKey);
  const index = current.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const target = current[index];
  const updatedStudent: StudentApplicant = {
    ...target,
    regNo: data.regNo !== undefined ? data.regNo : target.regNo,
    status: data.status || target.status,
    aadhar: data.aadhar ? { ...target.aadhar, ...data.aadhar } : target.aadhar,
    tenthMarks: data.tenthMarks ? { ...target.tenthMarks, ...data.tenthMarks } : target.tenthMarks,
    twelfthMarks: data.twelfthMarks ? { ...target.twelfthMarks, ...data.twelfthMarks } : target.twelfthMarks,
    updatedAt: new Date().toISOString(),
  };

  current[index] = updatedStudent;
  saveApplicantsByCollege(collegeKey, current);
  return updatedStudent;
}

export function deleteApplicantFromCollege(collegeKey: CollegeKey, id: string): boolean {
  const current = getStoredApplicantsByCollege(collegeKey);
  const filtered = current.filter((s) => s.id !== id);
  if (filtered.length !== current.length) {
    saveApplicantsByCollege(collegeKey, filtered);
    return true;
  }
  return false;
}

export function getApplicantById(
  collegeKey: CollegeKey,
  id: string
): StudentApplicant | undefined {
  const current = getStoredApplicantsByCollege(collegeKey);
  return current.find((s) => s.id === id);
}

/**
 * Calculates next sequential roll number strictly for Engineering
 */
export function getNextEngineeringRollNumber(
  programmeCode: string,
  degreeCode: string = "1",
  admYear: number = 2026
): number {
  const current = getStoredApplicantsByCollege("engineering");

  // Filter students in the same department who already have a 14-digit regNo
  const matching = current.filter(
    (s) =>
      s.deptKey === programmeCode &&
      s.regNo &&
      s.regNo.length === 14
  );

  if (matching.length === 0) return 1;

  const rollNumbers = matching
    .map((s) => {
      const rollStr = s.regNo.slice(-3);
      return parseInt(rollStr, 10);
    })
    .filter((n) => !isNaN(n));

  if (rollNumbers.length === 0) return 1;
  return Math.max(...rollNumbers) + 1;
}

/**
 * Clean zero-mock policy: Zero default candidates in dashboards.
 * Dashboards start 100% clean with 0 applicants until real students are enrolled.
 */
export function seedCleanDemonstrationForCollegeIfEmpty(_collegeKey: CollegeKey) {
  // Purposely empty to satisfy zero-default-values requirement.
}

// Auto-clean any leftover mock seeds across all colleges on startup
if (typeof window !== "undefined" && window.localStorage) {
  const allCollegeKeys: CollegeKey[] = ["engineering", "nursing", "pharmacy", "emerging_sciences"];
  allCollegeKeys.forEach((ck) => {
    try {
      const k = getCollegeStorageKey(ck);
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (s) =>
              !s.id?.startsWith("APP-ENG-") &&
              !s.id?.startsWith("APP-NUR-") &&
              !s.id?.startsWith("APP-PHARM-") &&
              !s.id?.startsWith("APP-EMERG-")
          );
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      }
    } catch {}
  });
}
