import React, { useState } from "react";
import {
  X,
  CreditCard,
  Award,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Binary,
  Save,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { StudentApplicant, DocumentAttachment, formatQuota } from "../types/admission";
import { COLLEGES } from "../utils/rbac";
import { validateAadharNumber, formatAadharInput } from "../utils/aadharValidator";
import {
  calculateTenthSummary,
  calculateTwelfthCutoff,
  calculateTwelfthSummary,
} from "../utils/cutoffCalculator";
import {
  buildEngineeringRegNo,
} from "../utils/engineeringRegGen";
import {
  updateMandatedFeedsForCollege,
  useNextEngineeringRoll,
} from "../services/admissionStorage";
import { DocumentUploadZone } from "./DocumentUploadZone";
import { createDigitalTwelfthAttachment } from "../utils/digitalMarksheet";

interface UpdateModalProps {
  student: StudentApplicant | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

// Hooks must run in the same order on every render, so the closed state is handled by this wrapper
export const UpdateStudentDataModal: React.FC<UpdateModalProps> = (props) =>
  props.isOpen && props.student ? <UpdateStudentDataForm {...props} student={props.student} /> : null;

const UpdateStudentDataForm: React.FC<UpdateModalProps & { student: StudentApplicant }> = ({
  student,
  isOpen,
  onClose,
  onUpdated,
}) => {

  const [activeSection, setActiveSection] = useState<"aadhar" | "tenth" | "twelfth" | "regNo">("aadhar");

  // Registration Number state
  const [regNo, setRegNo] = useState(student.regNo || "");

  // Aadhar Feed state
  // The server only sends the masked number: leave the field empty to keep it, or type the full number to replace it
  const storedAadhar = student.aadhar?.aadharNumber || "";
  const [aadharNumber, setAadharNumber] = useState(/^\d{12}$/.test(storedAadhar) ? storedAadhar : "");
  const [aadharVerified, setAadharVerified] = useState(student.aadhar?.isVerified || false);
  const [aadharDoc, setAadharDoc] = useState<DocumentAttachment | undefined>(student.aadhar?.document);
  const [showAadhar, setShowAadhar] = useState(false);

  // 10th Marks Feed state
  const [tenthBoard, setTenthBoard] = useState(student.tenthMarks?.board || "STATE_BOARD");
  const [tenthSchool, setTenthSchool] = useState(student.tenthMarks?.schoolName || "");
  const [tenthPassingYear, setTenthPassingYear] = useState<number | "">(student.tenthMarks?.yearOfPassing ?? "");
  const [tenthRoll, setTenthRoll] = useState(student.tenthMarks?.rollNumber || "");
  const [tenthL1, setTenthL1] = useState<number | "">(student.tenthMarks?.lang1Marks ?? "");
  const [tenthL2, setTenthL2] = useState<number | "">(student.tenthMarks?.lang2Marks ?? "");
  const [tenthMaths, setTenthMaths] = useState<number | "">(student.tenthMarks?.mathsMarks ?? "");
  const [tenthScience, setTenthScience] = useState<number | "">(student.tenthMarks?.scienceMarks ?? "");
  const [tenthSocial, setTenthSocial] = useState<number | "">(student.tenthMarks?.socialMarks ?? "");
  const [tenthDoc, setTenthDoc] = useState<DocumentAttachment | undefined>(student.tenthMarks?.document);
  const [tenthVerified, setTenthVerified] = useState(student.tenthMarks?.isVerified || false);

  // 12th Marks Feed state
  const [twelfthBoard, setTwelfthBoard] = useState(student.twelfthMarks?.board || "STATE_BOARD");
  const [twelfthSchool, setTwelfthSchool] = useState(student.twelfthMarks?.schoolName || "");
  const [twelfthPassingYear, setTwelfthPassingYear] = useState<number | "">(student.twelfthMarks?.yearOfPassing ?? "");
  const [twelfthStream, setTwelfthStream] = useState(student.twelfthMarks?.stream || "PCMB");
  const [twelfthRoll, setTwelfthRoll] = useState(student.twelfthMarks?.rollNumber || "");
  const [twelfthL1, setTwelfthL1] = useState<number | "">(student.twelfthMarks?.lang1Marks ?? "");
  const [twelfthL2, setTwelfthL2] = useState<number | "">(student.twelfthMarks?.lang2Marks ?? "");
  const [twelfthMaths, setTwelfthMaths] = useState<number | "">(student.twelfthMarks?.mathsMarks ?? "");
  const [twelfthPhysics, setTwelfthPhysics] = useState<number | "">(student.twelfthMarks?.physicsMarks ?? "");
  const [twelfthChemistry, setTwelfthChemistry] = useState<number | "">(student.twelfthMarks?.chemistryMarks ?? "");
  const [twelfthBiology, setTwelfthBiology] = useState<number | "">(student.twelfthMarks?.biologyMarks ?? "");
  const [twelfthCS, setTwelfthCS] = useState<number | "">(student.twelfthMarks?.computerScienceMarks ?? "");
  const [twelfthDoc, setTwelfthDoc] = useState<DocumentAttachment | undefined>(student.twelfthMarks?.document);
  const [twelfthVerified, setTwelfthVerified] = useState(student.twelfthMarks?.isVerified || false);

  // Status
  const [status, setStatus] = useState(student.status);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Recalculations
  const aadharCheck = validateAadharNumber(aadharNumber);
  const tenthCalc = calculateTenthSummary({
    lang1: Number(tenthL1) || 0,
    lang2: Number(tenthL2) || 0,
    maths: Number(tenthMaths) || 0,
    science: Number(tenthScience) || 0,
    social: Number(tenthSocial) || 0,
  });

  const twelfthCutoffCalc = calculateTwelfthCutoff(
    {
      lang1: Number(twelfthL1) || 0,
      lang2: Number(twelfthL2) || 0,
      maths: Number(twelfthMaths) || 0,
      physics: Number(twelfthPhysics) || 0,
      chemistry: Number(twelfthChemistry) || 0,
      biology: Number(twelfthBiology) || 0,
      computerScience: Number(twelfthCS) || 0,
    },
    student.collegeKey
  );

  const isCbseOrIsc = twelfthBoard === "CBSE" || twelfthBoard === "ISC" || twelfthBoard === "ICSE";

  const twelfthSummaryCalc = calculateTwelfthSummary(
    {
      lang1: isCbseOrIsc ? undefined : (twelfthL1 !== "" ? Number(twelfthL1) : undefined),
      lang2: twelfthL2 !== "" ? Number(twelfthL2) : undefined,
      maths: twelfthMaths !== "" ? Number(twelfthMaths) : undefined,
      physics: Number(twelfthPhysics) || 0,
      chemistry: Number(twelfthChemistry) || 0,
      biology: twelfthBiology !== "" ? Number(twelfthBiology) : undefined,
      computerScience: twelfthCS !== "" ? Number(twelfthCS) : undefined,
    },
    100,
    twelfthBoard
  );

  // Engineering Next Roll No preview
  const isEngineering = student.collegeKey === "engineering";
  const serverNextRoll = useNextEngineeringRoll(isEngineering ? student.deptKey : "", student.degreeCode, student.admissionYear);
  const nextRoll = isEngineering ? serverNextRoll : 1;

  const suggestedEngRegNo = isEngineering
    ? buildEngineeringRegNo({
        universityYear: student.admissionYear,
        degreeCode: student.degreeCode,
        programmeCode: student.deptKey,
        admissionYear: student.admissionYear,
        rollNumber: nextRoll,
      })
    : "";

  const handleGenerateOfficialEngineeringRegNo = () => {
    setRegNo(suggestedEngRegNo);
  };

  const handleSave = () => {
    updateMandatedFeedsForCollege(student.collegeKey, student.id, {
      regNo: regNo.trim(),
      status,
      aadhar: {
        aadharNumber: aadharNumber.replace(/\D/g, "") || storedAadhar,
        isVerified: aadharVerified,
        document: aadharDoc,
        documentName: aadharDoc?.fileName,
        verifiedAt: aadharVerified ? new Date().toISOString() : undefined,
      },
      tenthMarks: {
        board: (tenthBoard as any) || "STATE_BOARD",
        schoolName: tenthSchool.trim(),
        yearOfPassing: Number(tenthPassingYear) || 2024,
        rollNumber: tenthRoll,
        lang1Marks: Number(tenthL1),
        lang2Marks: Number(tenthL2),
        mathsMarks: Number(tenthMaths),
        scienceMarks: Number(tenthScience),
        socialMarks: Number(tenthSocial),
        totalMarks: tenthCalc.total,
        percentage: tenthCalc.percentage,
        document: tenthDoc,
        marksheetDocName: tenthDoc?.fileName,
        isVerified: tenthVerified,
      },
      twelfthMarks: {
        board: (twelfthBoard as any) || "STATE_BOARD",
        schoolName: twelfthSchool.trim(),
        yearOfPassing: Number(twelfthPassingYear) || 2026,
        stream: twelfthStream,
        rollNumber: twelfthRoll,
        lang1Marks: isCbseOrIsc ? undefined : Number(twelfthL1),
        lang2Marks: Number(twelfthL2),
        mathsMarks: Number(twelfthMaths),
        physicsMarks: Number(twelfthPhysics),
        chemistryMarks: Number(twelfthChemistry),
        biologyMarks: Number(twelfthBiology),
        computerScienceMarks: Number(twelfthCS),
        totalMarks: twelfthSummaryCalc.total,
        maxMarks: twelfthSummaryCalc.maxTotal,
        percentage: twelfthSummaryCalc.percentage,
        calculatedCutoff: twelfthCutoffCalc.cutoff,
        document: twelfthDoc,
        marksheetDocName: twelfthDoc?.fileName,
        isVerified: twelfthVerified,
      },
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onUpdated();
      onClose();
    }, 600);
  };

  const collegeConf = COLLEGES[student.collegeKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0B192C] text-white p-5 border-b border-[#D4A72C]/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white p-1 shadow-md border-2 border-[#D4A72C] flex items-center justify-center shrink-0">
              <img
                src={collegeConf.logoUrl}
                alt={collegeConf.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-cinzel font-bold text-white">
                  Update Student Data Feeds & Marksheets
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D4A72C] text-[#0B192C]">
                  {collegeConf.portalTitle}
                </span>
              </div>
              <p className="text-xs text-[#D4A72C] mt-0.5">
                Candidate: <strong className="text-white">{student.fullName}</strong> • App #{student.applicationNo} • Quota: <strong className="text-white">{formatQuota(student.quota)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection("aadhar")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === "aadhar"
                ? "border-sky-600 text-sky-900 bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <CreditCard size={15} className="text-sky-600" />
            1. Aadhar Card Feed
            {aadharDoc && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("tenth")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === "tenth"
                ? "border-amber-600 text-amber-900 bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Award size={15} className="text-amber-600" />
            2. 10th Marks Feed
            {tenthDoc && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("twelfth")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === "twelfth"
                ? "border-emerald-600 text-emerald-900 bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Sparkles size={15} className="text-emerald-600" />
            3. 12th Marks Feed
            {twelfthDoc && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("regNo")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeSection === "regNo"
                ? "border-[#D4A72C] text-[#0B192C] bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Binary size={15} className="text-[#D4A72C]" />
            4. Reg Number
            {regNo ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1 rounded">Set</span>
            ) : (
              <span className="text-[10px] bg-gray-200 text-gray-700 px-1 rounded">Empty</span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: AADHAR */}
          {activeSection === "aadhar" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200">
                <span className="text-xs font-bold text-sky-900 block mb-1">
                  Feed & Verify Aadhar Card Details
                </span>
                <p className="text-[11px] text-sky-800">
                  Update the 12-digit UIDAI number and upload the official Aadhar card copy.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  12-Digit Aadhar Card Number
                </label>
                <div className="relative">
                  <input
                    type={showAadhar ? "text" : "password"}
                    maxLength={14}
                    value={formatAadharInput(aadharNumber)}
                    onChange={(e) => setAadharNumber(e.target.value)}
                    placeholder={storedAadhar ? `On file: ${storedAadhar.slice(-4).padStart(12, "X").replace(/(.{4})/g, "$1 ").trim()} (type to replace)` : "1234 5678 9012"}
                    className="w-full text-base font-mono font-bold tracking-widest px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAadhar(!showAadhar)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
                  >
                    {showAadhar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="mt-1.5">
                  {aadharNumber === "" && storedAadhar ? (
                    <span className="text-[11px] text-gray-500">The number on file is kept (shown masked).</span>
                  ) : aadharNumber.replace(/\D/g, "").length === 12 ? (
                    aadharCheck.isValid ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 size={15} /> Verhoeff Checksum Valid
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                        <AlertCircle size={15} /> {aadharCheck.message}
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] text-gray-500">
                      Length: {aadharNumber.replace(/\D/g, "").length} / 12 digits
                    </span>
                  )}
                </div>
              </div>

              {/* REAL AADHAR FILE UPLOAD */}
              <DocumentUploadZone
                label="Student Aadhar Card Document"
                description="Upload scanned PDF or JPG image (Max 15MB)"
                currentDocument={aadharDoc}
                onDocumentChange={setAadharDoc}
              />

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={aadharVerified}
                    onChange={(e) => setAadharVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Sign off Aadhar Card as Officially Verified
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 2: 10TH MARKS */}
          {activeSection === "tenth" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Update 10th Standard (SSLC) Academic Feed
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Subject breakdown out of 100 marks each.
                  </p>
                </div>
                <span className="text-xs font-black bg-amber-200 text-[#0B192C] px-3 py-1 rounded-full">
                  Total: {tenthCalc.total} / {tenthCalc.maxTotal} ({tenthCalc.percentage}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Board</label>
                  <select
                    value={tenthBoard}
                    onChange={(e) => setTenthBoard(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white font-semibold"
                  >
                    <option value="STATE_BOARD">Tamil Nadu State Board</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="OTHER">Other State Board</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">10th Roll No</label>
                  <input
                    type="text"
                    value={tenthRoll}
                    onChange={(e) => setTenthRoll(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <span className="text-xs font-bold text-gray-700 block mb-2">Subject Marks</span>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Lang 1</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={tenthL1}
                      onChange={(e) => setTenthL1(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="—"
                      className="w-full text-xs font-bold text-center py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">English</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={tenthL2}
                      onChange={(e) => setTenthL2(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="—"
                      className="w-full text-xs font-bold text-center py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Maths</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={tenthMaths}
                      onChange={(e) => setTenthMaths(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="—"
                      className="w-full text-xs font-bold text-center py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Science</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={tenthScience}
                      onChange={(e) => setTenthScience(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="—"
                      className="w-full text-xs font-bold text-center py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Social</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={tenthSocial}
                      onChange={(e) => setTenthSocial(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="—"
                      className="w-full text-xs font-bold text-center py-1.5 rounded border border-gray-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* REAL 10TH MARKSHEET FILE UPLOAD */}
              <DocumentUploadZone
                label="10th Standard Marksheet Document"
                description="Upload original SSLC Marksheet (PDF, PNG, JPG, Max 15MB)"
                currentDocument={tenthDoc}
                onDocumentChange={setTenthDoc}
              />

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={tenthVerified}
                    onChange={(e) => setTenthVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Sign off 10th Marks & Marksheet as Officially Verified
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 3: 12TH MARKS */}
          {activeSection === "twelfth" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Update 12th Standard (HSC) Feed & Cutoff
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Formula: {twelfthCutoffCalc.formulaDescription}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-emerald-200 text-[#0B192C] px-3 py-1.5 rounded-xl border border-emerald-400">
                    Cutoff: {twelfthCutoffCalc.cutoff} / {twelfthCutoffCalc.maxCutoff}
                  </span>
                  <span className="text-xs font-black bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300">
                    Total: {twelfthSummaryCalc.total} / {twelfthSummaryCalc.maxTotal} ({twelfthSummaryCalc.percentage}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Board</label>
                  <select
                    value={twelfthBoard}
                    onChange={(e) => {
                      const newBoard = e.target.value;
                      setTwelfthBoard(newBoard);
                      if (newBoard === "CBSE" || newBoard === "ISC" || newBoard === "ICSE") {
                        setTwelfthL1("");
                      }
                    }}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white font-semibold"
                  >
                    <option value="">-- Choose 12th Board --</option>
                    <option value="STATE_BOARD">Tamil Nadu State Board (HSC)</option>
                    <option value="CBSE">CBSE (Central Board)</option>
                    <option value="ISC">ISC / ICSE</option>
                    <option value="OTHER">Other Board</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stream</label>
                  <select
                    value={twelfthStream}
                    onChange={(e) => setTwelfthStream(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white font-semibold"
                  >
                    <option value="">-- Choose Stream --</option>
                    <option value="PCMB">PCMB (Physics, Chem, Maths, Bio)</option>
                    <option value="PCMC">PCMC (Physics, Chem, Maths, Comp Sci)</option>
                    <option value="PCB">PCB (Pure Science / Bio)</option>
                    <option value="COMMERCE">Commerce with Mathematics</option>
                    <option value="OTHER">Other Stream</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">12th Roll / Reg No</label>
                  <input
                    type="text"
                    value={twelfthRoll}
                    onChange={(e) => setTwelfthRoll(e.target.value)}
                    placeholder="e.g. HSC-948271"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Year of Passing</label>
                  <input
                    type="number"
                    value={twelfthPassingYear}
                    onChange={(e) => setTwelfthPassingYear(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 2026"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">School / Junior College Name</label>
                <input
                  type="text"
                  value={twelfthSchool}
                  onChange={(e) => setTwelfthSchool(e.target.value)}
                  placeholder="e.g. Government Higher Secondary School"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">12th Subject Scores (Marks out of 100)</span>
                    {isCbseOrIsc ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                        5 Subjects Pattern (No Tamil for {twelfthBoard || "CBSE/ISC"})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        6 Subjects Pattern (Includes Tamil)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">
                    Core: Maths ({Number(twelfthMaths) || 0}) + Physics ({Number(twelfthPhysics) || 0}) + Chem ({Number(twelfthChemistry) || 0})
                  </span>
                </div>

                <div className={`grid gap-2 ${isCbseOrIsc ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-6"}`}>
                  {!isCbseOrIsc && (
                    <div>
                      <label className="text-[10px] text-gray-600 font-bold block mb-0.5">Part 1 Lang</label>
                      <input
                        type="number"
                        max={100}
                        min={0}
                        value={twelfthL1}
                        onChange={(e) => setTwelfthL1(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Tamil"
                        className="w-full text-xs font-bold text-center py-1.5 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-gray-600 font-bold block mb-0.5">English</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthL2}
                      onChange={(e) => setTwelfthL2(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="English"
                      className="w-full text-xs font-bold text-center py-1.5 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">Maths</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthMaths}
                      onChange={(e) => setTwelfthMaths(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Maths"
                      className="w-full text-xs font-bold text-center py-1.5 rounded-lg border border-emerald-400 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">Physics</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthPhysics}
                      onChange={(e) => setTwelfthPhysics(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Physics"
                      className="w-full text-xs font-bold text-center py-1.5 rounded-lg border border-emerald-400 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">Chemistry</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthChemistry}
                      onChange={(e) => setTwelfthChemistry(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Chemistry"
                      className="w-full text-xs font-bold text-center py-1.5 rounded-lg border border-emerald-400 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-600 font-bold block mb-0.5">Bio / CS</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthCS !== "" ? twelfthCS : twelfthBiology}
                      onChange={(e) => {
                        const val = e.target.value === "" ? "" : Number(e.target.value);
                        setTwelfthCS(val);
                        setTwelfthBiology(val);
                      }}
                      placeholder="Bio / CS"
                      className="w-full text-xs font-bold text-center py-1.5 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-700 font-semibold">
                  <span>Aggregate Total: {twelfthSummaryCalc.total} / {twelfthSummaryCalc.maxTotal}</span>
                  <span>Percentage: {twelfthSummaryCalc.percentage}%</span>
                </div>
              </div>

              {/* REAL 12TH MARKSHEET FILE UPLOAD */}
              <DocumentUploadZone
                label="12th Standard Marksheet Document"
                description="Upload original HSC Marksheet (PDF, PNG, JPG, Max 15MB)"
                currentDocument={twelfthDoc}
                onDocumentChange={setTwelfthDoc}
              />

              {/* Quick Digital Generation Option */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/80 border border-amber-300">
                <div className="text-xs text-amber-950">
                  <span className="font-bold block">Need a certified 12th marksheet document?</span>
                  <span className="text-[11px] text-amber-800">
                    Generate an official digital HSC certificate with candidate scores.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digital = createDigitalTwelfthAttachment(
                      student.fullName,
                      {
                        board: (twelfthBoard as any) || "STATE_BOARD",
                        stream: twelfthStream || "PCMB",
                        schoolName: twelfthSchool.trim() || "Higher Secondary School",
                        rollNumber: twelfthRoll.trim() || `HSC-2026-${Math.floor(100000 + Math.random() * 900000)}`,
                        yearOfPassing: Number(twelfthPassingYear) || 2026,
                        lang1Marks: isCbseOrIsc ? undefined : (Number(twelfthL1) || 92),
                        lang2Marks: Number(twelfthL2) || 88,
                        mathsMarks: Number(twelfthMaths) || 95,
                        physicsMarks: Number(twelfthPhysics) || 90,
                        chemistryMarks: Number(twelfthChemistry) || 92,
                        biologyMarks: Number(twelfthBiology) || 0,
                        computerScienceMarks: Number(twelfthCS) || 96,
                        calculatedCutoff: twelfthCutoffCalc.cutoff,
                      },
                      collegeConf.name
                    );
                    setTwelfthDoc(digital);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C] text-xs font-bold hover:bg-[#132943] transition cursor-pointer shrink-0"
                >
                  ⚡ Generate Digital Marksheet
                </button>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={twelfthVerified}
                    onChange={(e) => setTwelfthVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Sign off 12th Marks & Marksheet as Officially Verified
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 4: REG NO */}
          {activeSection === "regNo" && (
            <div className="space-y-4">
              {isEngineering ? (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      <Binary size={16} />
                      14-Digit Engineering Registration Generator (KVCET)
                    </span>
                    <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      Code 01
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-800">
                    Department: <strong>{student.deptName}</strong> ({student.deptKey}), Degree Code <strong>{student.degreeCode}</strong>.
                  </p>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 font-mono text-center">
                    <span className="text-[10px] text-gray-500 block uppercase font-sans font-bold">
                      Suggested Official Register Number
                    </span>
                    <span className="text-base font-black text-[#0B192C] tracking-wider">
                      {suggestedEngRegNo}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateOfficialEngineeringRegNo}
                    className="px-4 py-2 rounded-xl bg-[#0B192C] text-[#D4A72C] text-xs font-bold hover:bg-[#132943] transition flex items-center gap-2 cursor-pointer shadow"
                  >
                    <Sparkles size={14} />
                    <span>Apply Official 14-Digit Reg No</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <span className="text-xs font-bold text-gray-800 block mb-1">
                    Registration Number Assignment
                  </span>
                  <p className="text-[11px] text-gray-600">
                    The autonomous generation engine is strictly for Engineering. For {collegeConf.shortName}, enter the allotted register number manually.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Active Registration Number
                </label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="Leave empty or enter registration number"
                  maxLength={14}
                  className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4A72C] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Admission Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_VERIFICATION">Pending Document Verification</option>
                  <option value="DOCS_VERIFIED">Documents Verified</option>
                  <option value="ADMITTED">Admitted / Enrolled</option>
                  <option value="REJECTED">Application Rejected</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveSuccess}
            className="px-6 py-2.5 rounded-xl bg-[#0B192C] text-[#D4A72C] font-black text-xs hover:bg-[#132943] transition shadow flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {saveSuccess ? (
              <>
                <Check size={16} className="text-emerald-400" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save All Feed Updates & Documents</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
