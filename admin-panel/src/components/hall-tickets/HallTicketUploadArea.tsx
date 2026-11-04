import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  hallTicketAdminApi,
  ImportRow,
  BadRow,
  ImportResponse,
} from "../../services/hallTicketAdminApi";

interface Props {
  academicYear: string;
  setAcademicYear: (val: string) => void;
  batch: string;
  setBatch: (val: string) => void;
  semester: number;
  setSemester: (val: number) => void;
  onImportSuccess: () => void;
}

const DOB_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function HallTicketUploadArea({
  academicYear,
  setAcademicYear,
  batch,
  setBatch,
  semester,
  setSemester,
  onImportSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [badRows, setBadRows] = useState<BadRow[]>([]);
  const [parsing, setParsing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize column lookup
  const getCol = (row: Record<string, any>, ...aliases: string[]): string => {
    for (const key of Object.keys(row)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
      for (const alias of aliases) {
        if (normalizedKey === alias.toLowerCase().replace(/[\s_-]/g, "")) {
          return String(row[key] ?? "").trim();
        }
      }
    }
    return "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setGeneralError(null);
    setImportResult(null);
    setBadRows([]);
    setParsedRows([]);

    // 1. File size check (max 2 MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      setGeneralError("File exceeds the maximum allowed size of 2 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("Spreadsheet does not contain any sheets.");
      }
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rawRows.length === 0) {
        throw new Error("Spreadsheet is empty. No data rows detected.");
      }

      // 2. Row limit check (max 3,000 rows)
      if (rawRows.length > 3000) {
        setGeneralError(`Spreadsheet contains ${rawRows.length} rows, exceeding the 3,000 row limit.`);
        setParsing(false);
        return;
      }

      const rows: ImportRow[] = [];
      const errors: BadRow[] = [];
      const studentSubjectMap = new Map<string, Set<string>>();

      rawRows.forEach((raw, idx) => {
        const rowNumber = idx + 2; // Excel 1-based, row 1 is header
        const reg = getCol(raw, "register_number", "reg_no", "regno", "registernumber", "reg");
        const name = getCol(raw, "name", "student_name", "candidate_name");
        let dob = getCol(raw, "date_of_birth", "dob", "birth_date");
        const degreeBranch = getCol(raw, "degree_branch", "degree", "branch", "dept");
        const curSem = getCol(raw, "current_semester", "semester", "current_sem", "sem");
        const examCentre = getCol(raw, "exam_centre", "exam_center", "centre", "center");
        const subCode = getCol(raw, "subject_code", "sub_code", "code");
        const subTitle = getCol(raw, "subject_title", "sub_title", "title");
        let pType = getCol(raw, "paper_type", "type").toUpperCase();
        const pSem = getCol(raw, "paper_semester", "paper_sem", "sub_sem");

        // Format excel date if numeric
        if (typeof raw["date_of_birth"] === "number" || typeof raw["dob"] === "number") {
          try {
            const dateNum = Number(raw["date_of_birth"] || raw["dob"]);
            const parsedDate = new Date(Math.round((dateNum - 25569) * 86400 * 1000));
            dob = parsedDate.toISOString().split("T")[0];
          } catch {
            // Keep original string
          }
        }

        if (!pType) {
          pType = "CURRENT";
        }

        // Validate row fields
        if (!reg) {
          errors.push({ rowNumber, registerNumber: "-", reason: "Register number is missing" });
          return;
        }
        if (!name) {
          errors.push({ rowNumber, registerNumber: reg, reason: "Candidate name is missing" });
        }
        if (!dob || !DOB_REGEX.test(dob)) {
          errors.push({
            rowNumber,
            registerNumber: reg,
            reason: `Date of birth must be YYYY-MM-DD (got: "${dob || "empty"}")`,
          });
        }
        if (!degreeBranch) {
          errors.push({ rowNumber, registerNumber: reg, reason: "Degree and branch is missing" });
        }

        const semNum = parseInt(curSem.replace(/[^0-9]/g, ""), 10);
        if (isNaN(semNum) || semNum < 1 || semNum > 8) {
          errors.push({
            rowNumber,
            registerNumber: reg,
            reason: `Current semester must be between 1 and 8 (got: "${curSem}")`,
          });
        }

        if (!examCentre || examCentre === "-") {
          errors.push({ rowNumber, registerNumber: reg, reason: "Blank exam centre is not allowed" });
        }

        if (!subCode) {
          errors.push({ rowNumber, registerNumber: reg, reason: "Subject code is missing" });
        }

        if (!subTitle) {
          errors.push({ rowNumber, registerNumber: reg, reason: "Subject title is missing" });
        }

        if (pType !== "CURRENT" && pType !== "ARREAR") {
          errors.push({
            rowNumber,
            registerNumber: reg,
            reason: `Paper type must be CURRENT or ARREAR (got: "${pType}")`,
          });
        }

        const pSemNum = parseInt(pSem.replace(/[^0-9]/g, ""), 10);
        if (isNaN(pSemNum) || pSemNum < 1 || pSemNum > 8) {
          errors.push({
            rowNumber,
            registerNumber: reg,
            reason: `Paper semester must be between 1 and 8 (got: "${pSem}")`,
          });
        }

        // Duplicate subject code for same student
        if (subCode) {
          let seen = studentSubjectMap.get(reg);
          if (!seen) {
            seen = new Set<string>();
            studentSubjectMap.set(reg, seen);
          }
          if (seen.has(subCode.toUpperCase())) {
            errors.push({
              rowNumber,
              registerNumber: reg,
              reason: `Duplicate subject code "${subCode}" for student ${reg}`,
            });
          } else {
            seen.add(subCode.toUpperCase());
          }
        }

        rows.push({
          rowNumber,
          registerNumber: reg,
          name,
          dateOfBirth: dob,
          degreeBranch,
          currentSemester: curSem || String(semester),
          examCentre,
          subjectCode: subCode,
          subjectTitle: subTitle,
          paperType: pType as "CURRENT" | "ARREAR",
          paperSemester: pSem || String(semester),
        });
      });

      setParsedRows(rows);
      setBadRows(errors);
    } catch (err: any) {
      setGeneralError(err.message || "Failed to read or parse spreadsheet.");
    } finally {
      setParsing(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (badRows.length > 0) {
      setGeneralError("Cannot import. Please resolve the validation errors listed below.");
      return;
    }
    if (parsedRows.length === 0) {
      setGeneralError("No valid rows to import.");
      return;
    }

    try {
      setUploading(true);
      setGeneralError(null);
      const res = await hallTicketAdminApi.importDrafts({
        academicYear,
        batch,
        semester,
        examName: "End Semester Examinations",
        rows: parsedRows,
      });

      setImportResult(res);
      setFile(null);
      setParsedRows([]);
      setBadRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onImportSuccess();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.badRows && Array.isArray(data.badRows)) {
        setBadRows(data.badRows);
        setGeneralError(data.error || "Server validation failed on uploaded rows.");
      } else {
        setGeneralError(data?.error || err.message || "Failed to import hall tickets.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setBadRows([]);
    setGeneralError(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 no-print">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-[#0B192C] flex items-center gap-2.5">
            <UploadCloud size={22} className="text-[#D4A72C]" />
            Upload Hall Ticket Data Sheet
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Import student examination details and papers from Excel (.xlsx) or CSV. Existing tickets update without duplicate rows.
          </p>
        </div>

        <div className="text-xs font-bold text-slate-400">
          Max: 2 MB &bull; 3,000 rows
        </div>
      </div>

      {/* Cohort Selector Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
            Academic Year <span className="text-rose-500">*</span>
          </label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs"
          >
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
            Batch <span className="text-rose-500">*</span>
          </label>
          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs"
          >
            <option value="2024-2028">2024-2028</option>
            <option value="2023-2027">2023-2027</option>
            <option value="2022-2026">2022-2026</option>
            <option value="2021-2025">2021-2025</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#0B192C] mb-1.5">
            Semester <span className="text-rose-500">*</span>
          </label>
          <select
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
            className="w-full text-xs font-bold text-[#0B192C] rounded-2xl border border-slate-300 bg-white px-4 py-2.5 focus:ring-2 focus:ring-[#0B192C]/20 shadow-xs"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* File Upload Box */}
      <div className="border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center hover:border-[#0B192C] transition-colors bg-slate-50/50">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          id="sheet-upload-input"
        />
        <label
          htmlFor="sheet-upload-input"
          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
        >
          <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[#0B192C]">
            <FileSpreadsheet size={24} className="text-[#D4A72C]" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-extrabold text-[#0B192C]">
              Click to select spreadsheet (.xlsx, .csv)
            </span>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Required headers: register_number, name, date_of_birth, degree_branch, current_semester, exam_centre, subject_code, subject_title, paper_type, paper_semester
            </p>
          </div>
        </label>

        {file && (
          <div className="mt-4 inline-flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold text-[#0B192C]">
            <FileText size={16} className="text-[#D4A72C]" />
            <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-rose-500 transition-colors"
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-bold">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{generalError}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {importResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-bold">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <div>{importResult.message}</div>
        </div>
      )}

      {/* Validation Failure Table (Bad Rows) */}
      {badRows.length > 0 && (
        <div className="space-y-2 border border-rose-200 rounded-2xl p-4 bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-black uppercase tracking-wider">
            <AlertTriangle size={16} className="text-rose-600" />
            {badRows.length} Validation Issue(s) Found (Import Blocked)
          </div>
          <p className="text-[11px] text-rose-700 font-semibold">
            Every row in the spreadsheet must pass validation. Please fix the following errors in your data sheet and re-upload.
          </p>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-rose-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-100/60 text-rose-900 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2">Row #</th>
                  <th className="px-3 py-2">Register No</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 font-mono">
                {badRows.map((b, i) => (
                  <tr key={i} className="hover:bg-rose-50/40">
                    <td className="px-3 py-2 font-bold text-rose-700">{b.rowNumber}</td>
                    <td className="px-3 py-2 text-slate-800">{b.registerNumber}</td>
                    <td className="px-3 py-2 font-sans font-semibold text-rose-800">{b.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {file && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={uploading}
            className="px-4 py-2.5 rounded-2xl border border-slate-300 text-xs font-extrabold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUploadSubmit}
            disabled={uploading || parsing || badRows.length > 0 || parsedRows.length === 0}
            className="px-6 py-2.5 rounded-2xl bg-[#0B192C] text-white text-xs font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
          >
            {uploading ? (
              <>Uploading &amp; Importing...</>
            ) : (
              <>
                <UploadCloud size={16} />
                Import {parsedRows.length} Row(s)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
