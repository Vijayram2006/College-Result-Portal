import { resolveDocUrl } from "../services/admissionStorage";
import { errorMessage } from "../services/api";
import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  UserPlus,
  Trash2,
  Binary,
  CreditCard,
  Award,
  FileCheck2,
  Eye,
  X,
  FileCheck,
} from "lucide-react";
import { StudentApplicant, CollegeKey, formatQuota, DocumentAttachment } from "../types/admission";
import {
  getStoredApplicantsByCollege,
  deleteApplicantFromCollege,
  updateMandatedFeedsForCollege,
  seedCleanDemonstrationForCollegeIfEmpty,
} from "../services/admissionStorage";
import { COLLEGES } from "../utils/rbac";
import { maskAadharNumber } from "../utils/aadharValidator";
import { createDigitalTwelfthAttachment } from "../utils/digitalMarksheet";

interface RosterProps {
  collegeKey: CollegeKey;
  onOpenNewStudentModal: () => void;
  onOpenUpdateModal: (student: StudentApplicant) => void;
  onOpenAllotmentModal: (student: StudentApplicant) => void;
}

export const StudentsAdmissionRoster: React.FC<RosterProps> = ({
  collegeKey,
  onOpenNewStudentModal,
  onOpenUpdateModal,
  onOpenAllotmentModal,
}) => {
  const [students, setStudents] = useState<StudentApplicant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [degreeFilter, setDegreeFilter] = useState<string>("all");
  const [regNoFilter, setRegNoFilter] = useState<string>("all");
  const [quotaFilter, setQuotaFilter] = useState<string>("all");
  const [previewDoc, setPreviewDocState] = useState<DocumentAttachment | null>(null);
  // Stored documents are fetched from the server when opened (each opening is recorded there)
  const setPreviewDoc = (doc: DocumentAttachment | null) => {
    if (!doc) return setPreviewDocState(null);
    resolveDocUrl(doc.dataUrl)
      .then((url) => setPreviewDocState({ ...doc, dataUrl: url }))
      .catch((e) => alert(errorMessage(e, "Could not open the document.")));
  };

  const college = COLLEGES[collegeKey];

  const loadData = () => {
    seedCleanDemonstrationForCollegeIfEmpty(collegeKey);
    const list = getStoredApplicantsByCollege(collegeKey);
    setStudents(list);
  };

  const handleViewTwelfthDoc = (student: StudentApplicant) => {
    if (student.twelfthMarks?.document) {
      setPreviewDoc(student.twelfthMarks.document);
    } else {
      const digitalDoc = createDigitalTwelfthAttachment(
        student.fullName,
        student.twelfthMarks || {},
        college.name
      );
      updateMandatedFeedsForCollege(collegeKey, student.id, {
        twelfthMarks: {
          document: digitalDoc,
          marksheetDocName: digitalDoc.fileName,
        },
      });
      loadData();
      setPreviewDoc(digitalDoc);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("kvell_admission_updated", loadData);
    return () => window.removeEventListener("kvell_admission_updated", loadData);
  }, [collegeKey]);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove candidate record for ${name}?`)) {
      deleteApplicantFromCollege(collegeKey, id);
      loadData();
    }
  };

  const filteredStudents = students.filter((s) => {
    if (degreeFilter !== "all" && s.degreeLevel !== degreeFilter) {
      return false;
    }

    if (quotaFilter !== "all" && s.quota !== quotaFilter) {
      return false;
    }

    if (regNoFilter === "assigned" && (!s.regNo || !s.regNo.trim())) {
      return false;
    }

    if (regNoFilter === "unassigned" && s.regNo && s.regNo.trim().length > 0) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchApp = s.applicationNo.toLowerCase().includes(q);
      const matchReg = (s.regNo || "").toLowerCase().includes(q);
      const matchAadhar = (s.aadhar?.aadharNumber || "").includes(q);
      const matchDept = s.deptName.toLowerCase().includes(q);
      return matchName || matchApp || matchReg || matchAadhar || matchDept;
    }

    return true;
  });

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;

    const headers = [
      "Application No",
      "Registration No",
      "Student Name",
      "College",
      "Department",
      "Degree",
      "Aadhar Number",
      "Aadhar Doc Attached",
      "10th Total",
      "10th Marksheet Attached",
      "12th Cutoff",
      "12th Marksheet Attached",
      "Status",
    ];

    const rows = filteredStudents.map((s) => [
      s.applicationNo,
      s.regNo || "N/A",
      s.fullName,
      college.name,
      s.deptName,
      s.degreeLevel,
      s.aadhar?.aadharNumber || "N/A",
      s.aadhar?.document ? "YES" : "NO",
      s.tenthMarks?.totalMarks || 0,
      s.tenthMarks?.document ? "YES" : "NO",
      s.twelfthMarks?.calculatedCutoff || 0,
      s.twelfthMarks?.document ? "YES" : "NO",
      s.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${college.shortName}_Admissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-white p-1 shadow-md border-2 border-amber-300 shrink-0 flex items-center justify-center">
            <img
              src={college.logoUrl}
              alt={college.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-cinzel font-bold text-[#0B192C]">
                {college.portalTitle} • Student Roster
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                CODE {college.code}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Differentiated database for {college.name} with Aadhar, 10th and 12th marksheet document attachments.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewStudentModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4A72C] to-amber-500 text-[#0B192C] text-xs font-black flex items-center gap-2 shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer border border-amber-300"
          >
            <UserPlus size={15} />
            <span>Enroll New Candidate</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, reg no, aadhar..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4A72C] outline-none text-xs bg-gray-50/50"
            />
          </div>

          {/* Quota Filter */}
          <div>
            <select
              value={quotaFilter}
              onChange={(e) => setQuotaFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold outline-none bg-white"
            >
              <option value="all">All Quotas</option>
              <option value="ENTRANCE_QUOTA">Entrance Quota</option>
              <option value="MANAGEMENT_QUOTA">Management Quota</option>
            </select>
          </div>

          {/* Degree Filter */}
          <div>
            <select
              value={degreeFilter}
              onChange={(e) => setDegreeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold outline-none bg-white"
            >
              <option value="all">All Degrees (UG & PG)</option>
              <option value="UG">Undergraduate (UG Only)</option>
              <option value="PG">Postgraduate (PG Only)</option>
            </select>
          </div>

          {/* Reg No Filter */}
          <div>
            <select
              value={regNoFilter}
              onChange={(e) => setRegNoFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold outline-none bg-white"
            >
              <option value="all">All Reg No Statuses</option>
              <option value="assigned">Assigned Numbers Only</option>
              <option value="unassigned">Pending Assignment Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100">
          <span>
            Showing <strong>{filteredStudents.length}</strong> candidates in {college.shortName}
          </span>
          <span className="font-semibold text-amber-800">
            * Click "Update & Upload Docs" on any student to attach marksheets and Aadhar cards
          </span>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
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
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No matching candidates found in {college.shortName}.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{student.fullName}</div>
                      <div className="text-[10px] font-mono text-gray-500">{student.applicationNo}</div>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                        {formatQuota(student.quota)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800 truncate max-w-xs">{student.deptName}</div>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {student.degreeLevel} • Batch {student.admissionYear}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      {student.regNo ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-[#0B192C] border border-amber-300 block truncate max-w-[145px]">
                          {student.regNo}
                        </span>
                      ) : (
                        <button
                          onClick={() => onOpenUpdateModal(student)}
                          className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline flex items-center gap-1 cursor-pointer"
                        >
                          <Binary size={12} />
                          <span>+ Assign Reg No</span>
                        </button>
                      )}
                    </td>

                    {/* Aadhar */}
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
                          <button
                            onClick={() => setPreviewDoc(student.aadhar.document!)}
                            className="text-[9px] text-sky-800 font-bold bg-sky-100 hover:bg-sky-200 px-1.5 py-0.5 rounded border border-sky-300 flex items-center gap-0.5 cursor-pointer shadow-xs transition"
                            title="View Aadhar Card Document"
                          >
                            <Eye size={10} />
                            <span>DOC</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 10th Marks */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-800">
                        {student.tenthMarks?.totalMarks} / {student.tenthMarks?.maxMarks}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        <span>{student.tenthMarks?.percentage}%</span>
                        {student.tenthMarks?.document && (
                          <button
                            onClick={() => setPreviewDoc(student.tenthMarks.document!)}
                            className="text-[9px] text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-0.5 cursor-pointer shadow-xs transition"
                            title="View 10th Marksheet"
                          >
                            <Eye size={10} />
                            <span>DOC</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 12th Marks */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-800">
                        {student.twelfthMarks?.calculatedCutoff} / 200
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        <span>{student.twelfthMarks?.percentage}%</span>
                        {student.twelfthMarks?.document ? (
                          <button
                            onClick={() => setPreviewDoc(student.twelfthMarks.document!)}
                            className="text-[9px] text-emerald-900 font-bold bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-0.5 cursor-pointer shadow-xs transition"
                            title="View 12th HSC Marksheet"
                          >
                            <Eye size={10} />
                            <span>12th DOC</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleViewTwelfthDoc(student)}
                            className="text-[9px] text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-0.5 cursor-pointer shadow-xs transition"
                            title="View or Generate 12th Marksheet"
                          >
                            <Eye size={10} />
                            <span>View 12th</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          student.status === "ADMITTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : student.status === "DOCS_VERIFIED"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {student.status.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenUpdateModal(student)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C] text-[11px] font-bold hover:bg-[#132943] transition cursor-pointer shadow-xs"
                          title="Feed/Update Aadhar, 10th/12th marks, upload certificates"
                        >
                          Update & Upload
                        </button>

                        <button
                          onClick={() => onOpenAllotmentModal(student)}
                          className="px-2 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-[11px] font-semibold hover:bg-gray-100 transition cursor-pointer"
                        >
                          Slip
                        </button>

                        <button
                          onClick={() => handleDelete(student.id, student.fullName)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
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

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-gray-300">
            <div className="bg-[#0B192C] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-[#D4A72C]" />
                <span className="font-bold text-xs truncate max-w-md">
                  {previewDoc.fileName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.dataUrl}
                  download={previewDoc.fileName}
                  className="px-3 py-1.5 rounded-xl bg-[#D4A72C] text-[#0B192C] font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 transition shadow-xs"
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-4 overflow-auto flex items-center justify-center">
              {previewDoc.fileType?.includes("pdf") || previewDoc.fileName?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.fileName}
                  className="w-full h-full rounded-2xl border border-gray-300 bg-white"
                />
              ) : (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.fileName}
                  className="max-h-full max-w-full rounded-2xl object-contain shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
