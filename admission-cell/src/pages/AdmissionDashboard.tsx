import React, { useState, useEffect } from "react";
import {
  Users,
  CreditCard,
  Award,
  Sparkles,
  Binary,
  UserPlus,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import { StudentApplicant, CollegeKey, formatQuota } from "../types/admission";
import {
  getStoredApplicantsByCollege,
  seedCleanDemonstrationForCollegeIfEmpty,
} from "../services/admissionStorage";
import { COLLEGES } from "../utils/rbac";
import { maskAadharNumber } from "../utils/aadharValidator";

interface DashboardProps {
  collegeKey: CollegeKey;
  onOpenNewStudentModal: () => void;
  onOpenUpdateModal: (student: StudentApplicant) => void;
  onOpenAllotmentModal: (student: StudentApplicant) => void;
}

export const AdmissionDashboard: React.FC<DashboardProps> = ({
  collegeKey,
  onOpenNewStudentModal,
  onOpenUpdateModal,
  onOpenAllotmentModal,
}) => {
  const [applicants, setApplicants] = useState<StudentApplicant[]>([]);
  const college = COLLEGES[collegeKey];

  const loadData = () => {
    seedCleanDemonstrationForCollegeIfEmpty(collegeKey);
    const list = getStoredApplicantsByCollege(collegeKey);
    setApplicants(list);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("kvell_admission_updated", loadData);
    return () => {
      window.removeEventListener("kvell_admission_updated", loadData);
    };
  }, [collegeKey]);

  // Aggregates for this isolated cell
  const totalApplicants = applicants.length;
  const aadharVerifiedCount = applicants.filter((s) => s.aadhar?.isVerified).length;
  const aadharWithDocCount = applicants.filter((s) => s.aadhar?.document || s.aadhar?.documentName).length;
  const tenthWithDocCount = applicants.filter((s) => s.tenthMarks?.document || s.tenthMarks?.marksheetDocName).length;
  const twelfthWithDocCount = applicants.filter((s) => s.twelfthMarks?.document || s.twelfthMarks?.marksheetDocName).length;
  const assignedRegNoCount = applicants.filter((s) => s.regNo && s.regNo.trim().length > 0).length;
  const pendingRegNoCount = totalApplicants - assignedRegNoCount;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B192C] via-[#132943] to-[#0B192C] text-white border border-[#D4A72C]/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white p-1.5 shadow-xl border-2 border-[#D4A72C] shrink-0 flex items-center justify-center">
              <img
                src={college.logoUrl}
                alt={college.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase text-[#D4A72C] tracking-wider">
                  {college.portalTitle} • CODE {college.code}
                </span>
              </div>
              <h1 className="font-cinzel text-xl sm:text-2xl font-black text-white">
                {college.shortName} Admissions & Candidate Lifecycle
              </h1>
              <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                {college.description}. Fully isolated candidate management with verified Aadhar card, 10th and 12th marksheet document attachments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenNewStudentModal}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#D4A72C] to-amber-500 text-[#0B192C] text-xs font-black flex items-center gap-2 shadow-lg hover:from-amber-400 hover:to-amber-500 transition active:scale-95 cursor-pointer border border-amber-300"
            >
              <UserPlus size={16} />
              <span>Enroll In {college.shortName}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Candidates in this Cell */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {college.shortName} Candidates
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">{totalApplicants}</div>
          <p className="text-[11px] text-gray-500 mt-1">
            Registered for Academic Year 2026-27
          </p>
        </div>

        {/* Aadhar Verified & Attached */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Aadhar Documents
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-900">
            {aadharWithDocCount} <span className="text-xs font-semibold text-gray-400">/ {totalApplicants}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold mt-1">
            <CheckCircle2 size={13} />
            <span>{aadharVerifiedCount} Verhoeff Verified KYC</span>
          </div>
        </div>

        {/* 10th & 12th Marksheets Uploaded */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Marksheets Uploaded
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {twelfthWithDocCount} <span className="text-xs font-semibold text-gray-400">/ {totalApplicants}</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            10th ({tenthWithDocCount}) & 12th ({twelfthWithDocCount}) Attached
          </p>
        </div>

        {/* Assigned Reg Numbers */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Register Numbers
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Binary size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">
            {assignedRegNoCount}
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            {pendingRegNoCount} pending assignment
          </p>
        </div>
      </div>

      {/* Recent Candidates Roster Table */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h2 className="font-bold text-sm text-[#0B192C]">
              {college.shortName} Candidates ({applicants.length})
            </h2>
            <p className="text-xs text-gray-500">
              Isolated applicant roster for {college.name}. Update candidate marks, upload certificates, or assign register numbers.
            </p>
          </div>
          <button
            onClick={onOpenNewStudentModal}
            className="px-3 py-1.5 rounded-xl bg-[#0B192C] text-[#D4A72C] text-xs font-bold hover:bg-[#132943] transition cursor-pointer self-start sm:self-auto"
          >
            + New {college.shortName} Candidate
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                <th className="py-3 px-4">Candidate & App No</th>
                <th className="py-3 px-4">Department & Degree</th>
                <th className="py-3 px-4">Register Number</th>
                <th className="py-3 px-4">1. Aadhar Card</th>
                <th className="py-3 px-4">2. 10th Marks</th>
                <th className="py-3 px-4">3. 12th Cutoff</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applicants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No candidates currently enrolled in {college.shortName}. Click "Enroll" to add the first applicant.
                  </td>
                </tr>
              ) : (
                applicants.map((student) => (
                  <tr key={student.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{student.fullName}</div>
                      <div className="text-[10px] font-mono text-gray-500">{student.applicationNo}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800 truncate max-w-xs">{student.deptName}</div>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {student.degreeLevel} • {formatQuota(student.quota)}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      {student.regNo ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-[#0B192C] border border-amber-300">
                          {student.regNo}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">
                          Not assigned
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-gray-700">
                        {maskAadharNumber(student.aadhar?.aadharNumber || "")}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            student.aadhar?.isVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {student.aadhar?.isVerified ? "Verified" : "Pending"}
                        </span>
                        {student.aadhar?.document && (
                          <span className="text-[9px] text-sky-700 font-bold bg-sky-50 px-1 rounded border border-sky-200">
                            DOC
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-800">
                        {student.tenthMarks?.totalMarks} / {student.tenthMarks?.maxMarks}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span>{student.tenthMarks?.percentage}%</span>
                        {student.tenthMarks?.document && (
                          <span className="text-[9px] text-amber-800 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                            DOC
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-800">
                        {student.twelfthMarks?.calculatedCutoff} / 200
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <span>{student.twelfthMarks?.percentage}%</span>
                        {student.twelfthMarks?.document && (
                          <span className="text-[9px] text-emerald-800 font-bold bg-emerald-50 px-1 rounded border border-emerald-200">
                            DOC
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenUpdateModal(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C] text-[11px] font-bold hover:bg-[#132943] transition cursor-pointer shadow-xs"
                        >
                          Feed / Upload
                        </button>
                        <button
                          onClick={() => onOpenAllotmentModal(student)}
                          className="px-2 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-[11px] font-semibold hover:bg-gray-100 transition cursor-pointer"
                        >
                          Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
