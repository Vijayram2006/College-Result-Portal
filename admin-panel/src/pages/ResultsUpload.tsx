import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { addAuditLog } from "../services/api";
import { getRealLocalTimestamp } from "../utils/dateUtils";

export const ResultsUpload: React.FC = () => {
  const [, navigate] = useLocation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);

  // Target Metadata State
  const [deptKey, setDeptKey] = useState("cse");
  const [semester, setSemester] = useState("Semester VI");
  const [academicYear, setAcademicYear] = useState("2025 - 2026");
  const [examMonthYear, setExamMonthYear] = useState("May 2025");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      parseFile(file);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setParsedData(data);
      } catch (err) {
        console.error("Error parsing Excel file", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleStartUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        // Save uploaded records & target metadata in sessionStorage
        sessionStorage.setItem("kvell_uploaded_results", JSON.stringify(parsedData));
        sessionStorage.setItem(
          "kvell_upload_meta",
          JSON.stringify({
            deptKey,
            semester,
            academicYear,
            examMonthYear,
          })
        );
        addAuditLog({
          action: "UPLOADED_RESULT",
          target: selectedFile.name,
          timestamp: getRealLocalTimestamp(),
          description: `Uploaded examination spreadsheet "${selectedFile.name}" for ${deptKey.toUpperCase()} ${semester} (${parsedData.length} records).`,
        });
        navigate("/admin/results/validation");
      }
    }, 300);
  };

  return (
    <div className="space-y-8 w-full">
      {/* Instructions Header */}
      <div className="bg-[#0B192C] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#D4A72C]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest inline-block mb-2">
            STEP 1 OF 3 • EXCEL / CSV UPLOAD & TARGET SEMESTER SELECTION
          </span>
          <h2 className="font-display text-2xl font-bold">
            Semester Result Upload Interface
          </h2>
          <p className="text-xs text-white/70 mt-1 max-w-xl">
            Select the target department, academic year, and semester before uploading student examination marksheet spreadsheet (.xlsx or .csv).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 border border-white/20 text-xs font-semibold space-y-1">
          <span className="text-[#D4A72C] font-bold block uppercase text-[10px]">Expected Columns:</span>
          <span className="block text-white/80">Register Number • Student Name • Sub 1 • Sub 2 • Sub 3 • Sub 4 • Sub 5</span>
          <span className="block text-white/80">Results are based on grade only (O, A+, A, B+, B, C, F)</span>
        </div>
      </div>

      {/* Target Semester & Examination Metadata Selection Card */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 space-y-4">
        <div className="border-b border-[#E5E1D8] pb-3 flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-base text-[#0B192C]">
              1. Select Target Department & Semester
            </h3>
            <p className="text-xs text-gray-500">
              Results will be mapped and assigned to the selected academic period
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#D4A72C]/20 text-[#0B192C] font-extrabold text-[10px] uppercase">
            Mandatory Batch Mapping
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Department
            </label>
            <select
              value={deptKey}
              onChange={(e) => setDeptKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="cse">Computer Science & Engineering (CSE)</option>
              <option value="ece">Electronics & Communication (ECE)</option>
              <option value="mech">Mechanical Engineering (MECH)</option>
              <option value="eee">Electrical & Electronics (EEE)</option>
              <option value="it">Information Technology (IT)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Target Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="Semester I">Semester I</option>
              <option value="Semester II">Semester II</option>
              <option value="Semester III">Semester III</option>
              <option value="Semester IV">Semester IV</option>
              <option value="Semester V">Semester V</option>
              <option value="Semester VI">Semester VI</option>
              <option value="Semester VII">Semester VII</option>
              <option value="Semester VIII">Semester VIII</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="2025 - 2026">2025 - 2026</option>
              <option value="2024 - 2025">2024 - 2025</option>
              <option value="2023 - 2024">2023 - 2024</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1.5">
              Exam Session / Month
            </label>
            <select
              value={examMonthYear}
              onChange={(e) => setExamMonthYear(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E1D8] bg-[#F8F5EE] text-[#0B192C] font-bold focus:outline-none focus:ring-2 focus:ring-[#0B192C]"
            >
              <option value="May 2025">May 2025 End Semester</option>
              <option value="Dec 2025">Dec 2025 End Semester</option>
              <option value="May 2024">May 2024 End Semester</option>
              <option value="Nov 2024">Nov 2024 End Semester</option>
            </select>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Container */}
      <div className="bg-white rounded-3xl border border-[#E5E1D8] shadow-sm p-6 sm:p-10 text-center space-y-6">
        <h3 className="font-display font-bold text-base text-[#0B192C] text-left border-b border-[#E5E1D8] pb-3">
          2. Upload Spreadsheet File
        </h3>

        <div className="border-2 border-dashed border-[#D4A72C] rounded-2xl p-8 sm:p-12 bg-[#F8F5EE]/40 hover:bg-[#F8F5EE] transition flex flex-col items-center justify-center relative">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          <div className="w-16 h-16 rounded-2xl bg-[#0B192C]/10 text-[#0B192C] flex items-center justify-center mb-4">
            <UploadCloud size={32} />
          </div>

          <h3 className="font-display font-bold text-xl text-[#0B192C]">
            Drag & Drop Examination Spreadsheet Here
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files for {semester} ({deptKey.toUpperCase()})
          </p>

          <button
            type="button"
            className="mt-6 px-6 py-3 rounded-xl bg-[#0B192C] text-white font-extrabold text-xs hover:bg-[#132943] transition shadow flex items-center gap-2 pointer-events-none"
          >
            <FileSpreadsheet size={16} className="text-[#D4A72C]" /> Browse File from Computer
          </button>
        </div>

        {/* Selected File Details & Upload Progress */}
        {selectedFile && (
          <div className="bg-[#F8F5EE] rounded-2xl p-6 border border-[#E5E1D8] text-left space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} className="text-[#1D8A5A]" />
                <div>
                  <span className="font-bold text-sm text-[#0B192C] block">{selectedFile.name}</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Size: {(selectedFile.size / 1024).toFixed(1)} KB • {parsedData.length || "Checking..."} Records Found
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                Target: {semester}
              </span>
            </div>

            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Uploading & Mapping Spreadsheet to {semester}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0B192C] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleStartUpload}
                disabled={isUploading}
                className="px-6 py-3 rounded-xl bg-[#0B192C] text-white text-xs font-extrabold hover:bg-[#132943] transition shadow flex items-center gap-2"
              >
                <span>Proceed to Automated Validation</span>
                <ArrowRight size={16} className="text-[#D4A72C]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
