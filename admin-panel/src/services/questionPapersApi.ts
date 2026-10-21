import { useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "./api";
import type { PdfAttachment, QuestionPaperItem } from "../data/questionPapersData";

/**
 * Question papers on the server (/api/v1/question-papers). The screens read a shared copy of the list that is
 * refreshed from the server; every change is one server action (submit, resubmit, approve, return, forward,
 * release), and the server decides what each role may do. Papers stored on the server carry
 * pdfAttachment.fileData = "server-pdf:<id>"; the file is fetched only when someone opens it.
 */

export const QP_UPDATED_EVENT = "kvell_qp_updated";

let cache: QuestionPaperItem[] = [];
let loaded = false;
// Set after the first load attempt (even a failed one): a failure is retried only by an explicit refresh, never by a
// screen redrawing, so a refused request (e.g. before the starting password is changed) cannot loop
let attempted = false;
let inFlight: Promise<QuestionPaperItem[]> | null = null;
let lastError: string | null = null;

/** The last list received from the server (empty until the first load finishes). */
export function cachedQuestionPapers(): QuestionPaperItem[] {
  if (!attempted && !inFlight) void refreshQuestionPapers();
  return cache;
}

export function questionPapersError(): string | null {
  return lastError;
}

/** Reloads the list from the server and tells every open screen. */
export function refreshQuestionPapers(): Promise<QuestionPaperItem[]> {
  if (inFlight) return inFlight;
  attempted = true;
  inFlight = apiClient
    .get<QuestionPaperItem[]>("/question-papers")
    .then((r) => {
      cache = r.data;
      loaded = true;
      lastError = null;
      return cache;
    })
    .catch((err) => {
      lastError = apiErrorMessage(err, "Could not load the question papers.");
      return cache;
    })
    .finally(() => {
      inFlight = null;
      window.dispatchEvent(new Event(QP_UPDATED_EVENT));
    });
  return inFlight;
}

/** Puts one changed paper into the shared list and tells every open screen. */
function remember(paper: QuestionPaperItem): QuestionPaperItem {
  const i = cache.findIndex((p) => p.id === paper.id);
  cache = i >= 0 ? cache.map((p) => (p.id === paper.id ? paper : p)) : [paper, ...cache];
  window.dispatchEvent(new Event(QP_UPDATED_EVENT));
  return paper;
}

/** The list for a screen: loads once, follows every change. */
export function useQuestionPapers(): { papers: QuestionPaperItem[]; loading: boolean; error: string | null } {
  const [papers, setPapers] = useState<QuestionPaperItem[]>(cache);
  const [loading, setLoading] = useState(!loaded);
  useEffect(() => {
    const sync = () => {
      setPapers(cache);
      setLoading(!loaded && !lastError);
    };
    window.addEventListener(QP_UPDATED_EVENT, sync);
    void refreshQuestionPapers();
    return () => window.removeEventListener(QP_UPDATED_EVENT, sync);
  }, []);
  return { papers, loading, error: lastError };
}

export interface PaperInput {
  subjectCode: string;
  subjectTitle: string;
  semester: string;
  academicYear: string;
  regulation: string;
  examType: QuestionPaperItem["examType"];
  set: QuestionPaperItem["set"];
  /** maxMarks, duration, Bloom's distribution, course outcomes, parts, declarations. */
  content: Record<string, unknown>;
  /** A newly chosen PDF (data URL); leave out on a resubmission to keep the stored file. */
  pdf?: { fileName: string; dataUrl: string } | null;
  remarks?: string;
}

/** The PDF part of a submission: only a file the user just chose is sent (stored files stay on the server). */
export function pdfInput(att: PdfAttachment | null | undefined): PaperInput["pdf"] {
  if (!att || !att.fileData || !att.fileData.startsWith("data:application/pdf")) return null;
  return { fileName: att.fileName, dataUrl: att.fileData };
}

export async function submitQuestionPaper(input: PaperInput): Promise<QuestionPaperItem> {
  return remember((await apiClient.post<QuestionPaperItem>("/question-papers", input, { timeout: 60000 })).data);
}

export async function resubmitQuestionPaper(id: string, input: PaperInput): Promise<QuestionPaperItem> {
  return remember((await apiClient.put<QuestionPaperItem>(`/question-papers/${id}`, input, { timeout: 60000 })).data);
}

export type PaperAction = "APPROVE" | "RETURN" | "FORWARD" | "RELEASE";

export async function questionPaperAction(
  paper: QuestionPaperItem,
  action: PaperAction,
  options: { remarks?: string; returnTo?: "Faculty" | "HOD" | "AD" | "COE"; set?: string; hodDeclaration?: unknown } = {}
): Promise<QuestionPaperItem> {
  const body = { action, ...options, expectedVersion: (paper as any).version };
  try {
    return remember((await apiClient.post<QuestionPaperItem>(`/question-papers/${paper.id}/action`, body)).data);
  } catch (err: any) {
    // Someone else moved the paper: show the current state
    if (err?.response?.status === 409) void refreshQuestionPapers();
    throw err;
  }
}

const pdfUrls = new Map<string, string>();

/** A URL the browser can show: a just-chosen file as it is, a stored file fetched from the server (cached). */
export async function resolvePdfUrl(fileData: string): Promise<string> {
  if (!fileData.startsWith("server-pdf:")) return fileData;
  const id = fileData.slice("server-pdf:".length);
  const known = pdfUrls.get(id);
  if (known) return known;
  const res = await apiClient.get(`/question-papers/${id}/pdf`, { responseType: "blob", timeout: 60000 });
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  pdfUrls.set(id, url);
  return url;
}

/** For links and frames that show a PDF directly: the browser URL once it is ready ("" until then). */
export function usePdfUrl(fileData: string | undefined): string {
  const [url, setUrl] = useState(fileData && !fileData.startsWith("server-pdf:") ? fileData : "");
  useEffect(() => {
    let live = true;
    if (!fileData) {
      setUrl("");
      return;
    }
    resolvePdfUrl(fileData).then((u) => live && setUrl(u)).catch(() => live && setUrl(""));
    return () => {
      live = false;
    };
  }, [fileData]);
  return url;
}

export { apiErrorMessage };

export const MAX_PDF_BYTES = 15 * 1024 * 1024;
export const SEMESTER_OPTIONS = ["Semester I", "Semester II", "Semester III", "Semester IV", "Semester V",
  "Semester VI", "Semester VII", "Semester VIII"];

/** Reads a chosen PDF (at most 15 MB, the server's limit) as a data URL for upload. */
export function readPdfFile(file: File): Promise<{ fileName: string; dataUrl: string; fileSize: string }> {
  return new Promise((resolve, reject) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      reject(new Error("Please choose a PDF file (.pdf)."));
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      reject(new Error("The PDF is larger than 15 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // Some browsers label PDFs as octet-stream; the server checks the file itself
      const dataUrl = String(reader.result).replace(/^data:[^;]*;/, "data:application/pdf;");
      const fileSize = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`;
      resolve({ fileName: file.name, dataUrl, fileSize });
    };
    reader.onerror = () => reject(new Error("The PDF could not be read."));
    reader.readAsDataURL(file);
  });
}

/** The paper's details kept with it on the server. The questions themselves are in the uploaded PDF. */
export function paperContent(extra: { remarks?: string; hodDeclaration?: unknown } = {}): Record<string, unknown> {
  return {
    maxMarks: 100,
    durationHours: 3,
    syllabusCoverage: "Units I to V",
    bloomsDistribution: { rememberUnderstand: 30, applyAnalyze: 50, evaluateCreate: 20 },
    courseOutcomesCovered: ["CO1", "CO2", "CO3", "CO4", "CO5"],
    parts: {
      partA: { instructions: "See the attached question paper (PDF).", questions: [] },
      partB: { instructions: "See the attached question paper (PDF).", questions: [] },
      partC: { instructions: "See the attached question paper (PDF).", questions: [] },
    },
    hodDeclaration: extra.hodDeclaration ?? { certifiedByHod: false, moderationDoneByDept: false, date: "", hodNote: "" },
  };
}

/** The academic year in the screens' style, e.g. "2026 - 2027" (it starts in June). */
export function academicYearNow(d = new Date()): string {
  const start = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start} - ${start + 1}`;
}
