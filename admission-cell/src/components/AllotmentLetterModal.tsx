import React from "react";
import { X, Printer, ShieldCheck, Download, CheckCircle2 } from "lucide-react";
import { StudentApplicant, formatQuota } from "../types/admission";
import { COLLEGES } from "../utils/rbac";
import { maskAadharNumber } from "../utils/aadharValidator";

interface AllotmentProps {
  student: StudentApplicant | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AllotmentLetterModal: React.FC<AllotmentProps> = ({ student, isOpen, onClose }) => {
  if (!isOpen || !student) return null;

  const college = COLLEGES[student.collegeKey];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden my-6">
        {/* Modal Top Bar */}
        <div className="bg-[#0B192C] text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-cinzel font-bold text-white">
              Admission Confirmation & Allotment Order
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-[#D4A72C] text-[#0B192C] text-xs font-black flex items-center gap-1.5 hover:bg-amber-400 transition cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div id="printable-admission-letter" className="p-8 text-[#172033] bg-white space-y-6">
          {/* Institution Header */}
          <div className="border-b-2 border-[#0B192C] pb-5 text-center">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="h-16 w-16 p-1 rounded-xl border border-gray-200 bg-white shadow-xs shrink-0 flex items-center justify-center">
                <img
                  src="/assets/logos/kvell-university-logo.png"
                  alt="KVELL University Logo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="flex-1 text-center">
                <div className="font-cinzel font-black text-xs tracking-widest text-[#B08014] uppercase">
                  Karpaga Vinayaga Educational Lore for Learning
                </div>
                <h1 className="font-cinzel font-extrabold text-base sm:text-lg text-[#0B192C] uppercase tracking-wide leading-tight mt-0.5">
                  {college.name}
                </h1>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  (Deemed-to-be University u/s 3 of the UGC Act, 1956) • Chengalpattu, Tamil Nadu, India
                </p>
              </div>

              <div className="h-16 w-16 p-1 rounded-xl border border-gray-200 bg-white shadow-xs shrink-0 flex items-center justify-center">
                <img
                  src={college.logoUrl}
                  alt={college.name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="mt-2 inline-block bg-[#0B192C] text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full">
              Official Provisional Allotment & Enrollment Slip — Academic Year {student.admissionYear}-{student.admissionYear + 1}
            </div>
          </div>

          {/* Core Numbers Bar */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Application Number</span>
              <span className="text-xs font-mono font-bold text-gray-900">{student.applicationNo}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Official Register Number</span>
              {student.regNo ? (
                <span className="text-sm font-mono font-black text-[#0B192C] tracking-wider bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  {student.regNo}
                </span>
              ) : (
                <span className="text-xs font-mono text-gray-400 italic">Pending Assignment</span>
              )}
            </div>
          </div>

          {/* Student Profile Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <span className="text-gray-500 block text-[11px]">Candidate Full Name:</span>
              <strong className="text-gray-900 font-bold">{student.fullName}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Date of Birth / Gender:</span>
              <strong className="text-gray-900 font-bold">{student.dob} ({student.gender})</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Allotted Degree & Programme:</span>
              <strong className="text-[#0B192C] font-bold">{student.degreeLevel} • {student.deptName}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Admission Quota:</span>
              <strong className="text-gray-900 font-bold">{formatQuota(student.quota)}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Parent / Guardian:</span>
              <span className="text-gray-800">{student.fatherName || student.motherName}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Contact Details:</span>
              <span className="text-gray-800">{student.phone} • {student.email}</span>
            </div>
          </div>

          {/* Verified Mandated Data Feeds */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider border-b pb-1">
              Verified Academic & Identification Feeds
            </h3>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-gray-200 bg-sky-50/40">
                <span className="text-[10px] font-bold text-sky-900 uppercase block">1. Aadhar Card KYC</span>
                <p className="font-mono text-xs font-bold text-gray-900 mt-1">
                  {maskAadharNumber(student.aadhar.aadharNumber)}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-1">
                  <CheckCircle2 size={12} /> {student.aadhar.isVerified ? "UIDAI Verified" : "Pending Verification"}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-gray-200 bg-amber-50/40">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">2. 10th Standard (SSLC)</span>
                <p className="text-xs font-bold text-gray-900 mt-1">
                  {student.tenthMarks.totalMarks} / {student.tenthMarks.maxMarks} ({student.tenthMarks.percentage}%)
                </p>
                <span className="text-[10px] text-gray-500 block">{student.tenthMarks.board}</span>
              </div>

              <div className="p-3 rounded-lg border border-gray-200 bg-emerald-50/40">
                <span className="text-[10px] font-bold text-emerald-950 uppercase block">3. 12th Standard & Cutoff</span>
                <p className="text-xs font-bold text-emerald-900 mt-1">
                  Cutoff: {student.twelfthMarks.calculatedCutoff} / 200
                </p>
                <span className="text-[10px] text-gray-500 block">Total: {student.twelfthMarks.percentage}% ({student.twelfthMarks.stream})</span>
              </div>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-8 border-t border-gray-300 flex items-end justify-between text-xs">
            <div className="text-left">
              <div className="h-10 w-24 border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
                University Seal
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Registrar Verification Stamp</p>
            </div>

            <div className="text-right">
              <div className="font-serif italic text-xs font-bold text-gray-800">
                Dr. Sathish / Dean of Admissions
              </div>
              <div className="h-0.5 w-36 bg-gray-400 my-1 ml-auto" />
              <p className="text-[10px] font-bold uppercase text-gray-600">
                Dean of Academic Admissions
              </p>
              <p className="text-[9px] text-gray-400">KVELL Central University</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
