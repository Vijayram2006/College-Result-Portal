/**
 * Admission applicants, kept on the result server (/api/v1/admission/applicants) for the signed-in officer's
 * college. The screens read a shared copy of each college's list (refreshed from the server) and every change is
 * sent to the server, which validates it, keeps the Aadhaar number masked and records it in the audit log. Scanned
 * documents are uploaded separately and fetched only when someone opens them ("server-doc:<id>:<section>").
 */

import { useEffect, useState } from "react";
import { StudentApplicant, CollegeKey, DocumentAttachment } from "../types/admission";
import { api, errorMessage } from "./api";
import { getCurrentAdmissionUser } from "../utils/rbac";

export const ADMISSION_UPDATED_EVENT = "kvell_admission_updated";
const SERVER_COLLEGES: CollegeKey[] = ["engineering", "nursing", "pharmacy"];

const cache: Partial<Record<CollegeKey, StudentApplicant[]>> = {};
const loading: Partial<Record<CollegeKey, Promise<StudentApplicant[]>>> = {};
// Colleges whose first load was attempted: a failed load is retried only by an explicit refresh, never by a redraw
const attempted = new Set<CollegeKey>();
let lastError: string | null = null;

function announce() {
  window.dispatchEvent(new Event(ADMISSION_UPDATED_EVENT));
}

export function admissionLoadError(): string | null {
  return lastError;
}

/** Reloads a college's applicants from the server. */
export function refreshApplicants(collegeKey: CollegeKey): Promise<StudentApplicant[]> {
  const user = getCurrentAdmissionUser();
  const allowed = user?.role === "SUPER_ADMIN" || user?.collegeKey === collegeKey;
  if (!SERVER_COLLEGES.includes(collegeKey) || !allowed) {
    cache[collegeKey] = [];
    return Promise.resolve([]);
  }
  const running = loading[collegeKey];
  if (running) return running;
  attempted.add(collegeKey);
  const p = api<StudentApplicant[]>("GET", `/admission/applicants?college=${collegeKey}`)
    .then((list) => {
      cache[collegeKey] = list;
      lastError = null;
      return list;
    })
    .catch((e) => {
      lastError = errorMessage(e, "Could not load the applicants.");
      return cache[collegeKey] ?? [];
    })
    .finally(() => {
      delete loading[collegeKey];
      announce();
    });
  loading[collegeKey] = p;
  return p;
}

/** The college's applicants as last received from the server (loads them the first time). */
export function getStoredApplicantsByCollege(collegeKey: CollegeKey): StudentApplicant[] {
  if (!attempted.has(collegeKey) && !loading[collegeKey]) void refreshApplicants(collegeKey);
  return cache[collegeKey] ?? [];
}

function remember(collegeKey: CollegeKey, applicant: StudentApplicant) {
  if (applicant.regNo) forgetRolls();
  const list = cache[collegeKey] ?? [];
  const i = list.findIndex((s) => s.id === applicant.id);
  cache[collegeKey] = i >= 0 ? list.map((s) => (s.id === applicant.id ? applicant : s)) : [applicant, ...list];
  announce();
}

function failed(collegeKey: CollegeKey, e: unknown, what: string) {
  alert(errorMessage(e, `Could not ${what}.`));
  void refreshApplicants(collegeKey);
}

const SECTIONS: { section: "aadhar" | "tenthMarks" | "twelfthMarks"; kind: string }[] = [
  { section: "aadhar", kind: "aadhar" },
  { section: "tenthMarks", kind: "tenth" },
  { section: "twelfthMarks", kind: "twelfth" },
];

/** Uploads every document that was just chosen (a data: URL); stored ones stay on the server. */
async function uploadDocuments(id: string, applicant: Partial<StudentApplicant>): Promise<StudentApplicant | null> {
  let latest: StudentApplicant | null = null;
  for (const { section, kind } of SECTIONS) {
    const doc = (applicant as any)[section]?.document as DocumentAttachment | undefined;
    if (doc?.dataUrl?.startsWith("data:")) {
      latest = await api<StudentApplicant>("PUT", `/admission/applicants/${id}/documents/${kind}`, {
        fileName: doc.fileName,
        dataUrl: doc.dataUrl,
      });
    }
  }
  return latest;
}

export function createApplicantForCollege(collegeKey: CollegeKey, newApplicant: StudentApplicant): StudentApplicant {
  void (async () => {
    try {
      let saved = await api<StudentApplicant>("POST", `/admission/applicants?college=${collegeKey}`, newApplicant);
      saved = (await uploadDocuments(saved.id, newApplicant)) ?? saved;
      remember(collegeKey, saved);
    } catch (e) {
      failed(collegeKey, e, "save the applicant");
    }
  })();
  return newApplicant;
}

async function save(collegeKey: CollegeKey, merged: StudentApplicant) {
  try {
    let saved = await api<StudentApplicant>("PUT", `/admission/applicants/${merged.id}`, merged);
    saved = (await uploadDocuments(saved.id, merged)) ?? saved;
    remember(collegeKey, saved);
  } catch (e) {
    failed(collegeKey, e, "save the changes");
  }
}

export function updateApplicantForCollege(
  collegeKey: CollegeKey,
  id: string,
  updates: Partial<StudentApplicant>
): StudentApplicant | null {
  const current = (cache[collegeKey] ?? []).find((s) => s.id === id);
  if (!current) return null;
  const merged: StudentApplicant = { ...current, ...updates };
  remember(collegeKey, merged);
  void save(collegeKey, merged);
  return merged;
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
  const target = (cache[collegeKey] ?? []).find((s) => s.id === id);
  if (!target) return null;
  const merged: StudentApplicant = {
    ...target,
    regNo: data.regNo !== undefined ? data.regNo : target.regNo,
    status: data.status || target.status,
    aadhar: data.aadhar ? { ...target.aadhar, ...data.aadhar } : target.aadhar,
    tenthMarks: data.tenthMarks ? { ...target.tenthMarks, ...data.tenthMarks } : target.tenthMarks,
    twelfthMarks: data.twelfthMarks ? { ...target.twelfthMarks, ...data.twelfthMarks } : target.twelfthMarks,
  };
  remember(collegeKey, merged);
  void save(collegeKey, merged);
  return merged;
}

export function deleteApplicantFromCollege(collegeKey: CollegeKey, id: string): boolean {
  const list = cache[collegeKey] ?? [];
  if (!list.some((s) => s.id === id)) return false;
  cache[collegeKey] = list.filter((s) => s.id !== id);
  announce();
  api("DELETE", `/admission/applicants/${id}`).catch((e) => failed(collegeKey, e, "delete the applicant"));
  return true;
}

export function getApplicantById(collegeKey: CollegeKey, id: string): StudentApplicant | undefined {
  return (cache[collegeKey] ?? []).find((s) => s.id === id);
}

/** Only clears what this browser shows; the records stay on the server. */
export function clearAllAdmissionDataForCollege(collegeKey: CollegeKey) {
  delete cache[collegeKey];
  attempted.delete(collegeKey);
  announce();
}

export function clearAllAdmissionDataEverywhere() {
  (Object.keys(cache) as CollegeKey[]).forEach((c) => delete cache[c]);
  announce();
}

export function getCollegeStorageKey(collegeKey: CollegeKey): string {
  return `kvell_admission_${collegeKey}_applicants`;
}

/**
 * The next roll number for an Engineering register number: one more than the highest already given for the same
 * year, degree, programme and admission year (the server refuses a number that is already used).
 */
export function getNextEngineeringRollNumber(programmeCode: string, degreeCode: string = "1", admYear: number = 2026): number {
  const yy = String(admYear).slice(-2);
  const prefix = `${admYear}01${degreeCode}${String(programmeCode).padStart(2, "0")}${yy}`;
  const rolls = (cache.engineering ?? [])
    .map((s) => s.regNo || "")
    .filter((r) => r.length === 14 && r.startsWith(prefix))
    .map((r) => parseInt(r.slice(-3), 10))
    .filter((n) => !isNaN(n));
  return rolls.length ? Math.max(...rolls) + 1 : 1;
}

const serverNextRoll = new Map<string, number>();
const rollLoading = new Set<string>();

function rollPrefix(programmeCode: string, degreeCode: string, admYear: number): string {
  return `${admYear}01${degreeCode}${String(programmeCode).padStart(2, "0")}${String(admYear).slice(-2)}`;
}

/**
 * The next roll number as a hook: the server's answer counts students already enrolled in the results system as
 * well as applicants, so the suggestion never collides with an existing register number.
 */
export function useNextEngineeringRoll(programmeCode: string, degreeCode: string = "1", admYear: number = 2026): number {
  const prefix = rollPrefix(programmeCode, degreeCode, admYear);
  const [, tick] = useState(0);
  useEffect(() => {
    const again = () => tick((n) => n + 1);
    window.addEventListener(ADMISSION_UPDATED_EVENT, again);
    if (programmeCode && !serverNextRoll.has(prefix) && !rollLoading.has(prefix)) {
      rollLoading.add(prefix);
      api<{ next: number }>("GET", `/admission/applicants/next-roll?prefix=${prefix}`)
        .then((r) => serverNextRoll.set(prefix, r.next))
        .catch(() => undefined)
        .finally(() => {
          rollLoading.delete(prefix);
          announce();
        });
    }
    return () => window.removeEventListener(ADMISSION_UPDATED_EVENT, again);
  }, [prefix, programmeCode]);
  return Math.max(getNextEngineeringRollNumber(programmeCode, degreeCode, admYear), serverNextRoll.get(prefix) ?? 1);
}

/** After saving a register number the server's next roll is fetched again. */
function forgetRolls() {
  serverNextRoll.clear();
}

export function seedCleanDemonstrationForCollegeIfEmpty(_collegeKey: CollegeKey) {
  // Applicants come only from the server
}

const docUrls = new Map<string, string>();

/** A URL the browser can show: a just-chosen file as it is, a stored one fetched from the server (cached). */
export async function resolveDocUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("server-doc:")) return dataUrl;
  const known = docUrls.get(dataUrl);
  if (known) return known;
  const [, id, section] = dataUrl.split(":");
  const kind = SECTIONS.find((s) => s.section === section)?.kind ?? section;
  const blob = await api<Blob>("GET", `/admission/applicants/${id}/documents/${kind}`, undefined, true);
  const url = URL.createObjectURL(blob);
  docUrls.set(dataUrl, url);
  return url;
}

/** For previews and links: the browser URL once ready ("" while loading). */
export function useDocUrl(dataUrl: string | undefined): string {
  const [url, setUrl] = useState(dataUrl && !dataUrl.startsWith("server-doc:") ? dataUrl : "");
  useEffect(() => {
    let live = true;
    if (!dataUrl) {
      setUrl("");
      return;
    }
    resolveDocUrl(dataUrl).then((u) => live && setUrl(u)).catch(() => live && setUrl(""));
    return () => {
      live = false;
    };
  }, [dataUrl]);
  return url;
}
