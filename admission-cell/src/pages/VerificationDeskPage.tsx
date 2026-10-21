import { resolveDocUrl } from "../services/admissionStorage";
import { errorMessage } from "../services/api";
import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Award,
  Sparkles,
  CheckCircle2,
  Check,
  Eye,
  FileText,
  Download,
  X,
  FileCheck,
} from "lucide-react";
import { StudentApplicant, CollegeKey, DocumentAttachment } from "../types/admission";
import {
  getStoredApplicantsByCollege,
  updateMandatedFeedsForCollege,
  seedCleanDemonstrationForCollegeIfEmpty,
} from "../services/admissionStorage";
import { COLLEGES } from "../utils/rbac";
import { maskAadharNumber } from "../utils/aadharValidator";
import { createDigitalTwelfthAttachment } from "../utils/digitalMarksheet";

interface VerificationDeskProps {
  collegeKey: CollegeKey;
  onOpenUpdateModal: (student: StudentApplicant) => void;
}

export const VerificationDeskPage: React.FC<VerificationDeskProps> = ({
  collegeKey,
  onOpenUpdateModal,
}) => {
  const [students, setStudents] = useState<StudentApplicant[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "aadhar_pending" | "tenth_pending" | "twelfth_pending">("all");
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

  useEffect(() => {
    loadData();
    window.addEventListener("kvell_admission_updated", loadData);
    return () => window.removeEventListener("kvell_admission_updated", loadData);
  }, [collegeKey]);

  const toggleAadharVerification = (student: StudentApplicant) => {
    const nextState = !student.aadhar?.isVerified;
    updateMandatedFeedsForCollege(collegeKey, student.id, {
      aadhar: {
        isVerified: nextState,
        verifiedAt: nextState ? new Date().toISOString() : undefined,
      },
    });
    loadData();
  };

  const toggleTenthVerification = (student: StudentApplicant) => {
    const nextState = !student.tenthMarks?.isVerified;
    updateMandatedFeedsForCollege(collegeKey, student.id, {
      tenthMarks: {
        isVerified: nextState,
      },
    });
    loadData();
  };

  const toggleTwelfthVerification = (student: StudentApplicant) => {
    const nextState = !student.twelfthMarks?.isVerified;
    updateMandatedFeedsForCollege(collegeKey, student.id, {
      twelfthMarks: {
        isVerified: nextState,
      },
    });
    loadData();
  };

  const handleViewTwelfthDoc = (student: StudentApplicant) => {
    if (student.twelfthMarks?.document) {
      setPreviewDoc(student.twelfthMarks.document);
    } else {
      // Auto-generate official digital HSC marksheet document with candidate details
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

  const filteredStudents = students.filter((s) => {
    if (activeTab === "aadhar_pending") return !s.aadhar?.isVerified;
    if (activeTab === "tenth_pending") return !s.tenthMarks?.isVerified;
    if (activeTab === "twelfth_pending") return !s.twelfthMarks?.isVerified;
    return true;
  });

  const isPdf = previewDoc?.fileType?.includes("pdf") || previewDoc?.fileName?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-6">
      {/* Header */}
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
              {college.portalTitle} • Verification & KYC Desk
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
              CODE {college.code}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Verify candidate Aadhar card documents, 10th standard SSLC marksheets, and 12th standard HSC marksheets for {college.name}.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 bg-white p-2 rounded-2xl shadow-xs text-xs font-semibold gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === "all"
              ? "bg-[#0B192C] text-white font-bold"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          All Candidates ({students.length})
        </button>
        <button
          onClick={() => setActiveTab("aadhar_pending")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === "aadhar_pending"
              ? "bg-sky-700 text-white font-bold"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <CreditCard size={14} />
          <span>Aadhar Pending ({students.filter((s) => !s.aadhar?.isVerified).length})</span>
        </button>
        <button
          onClick={() => setActiveTab("tenth_pending")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === "tenth_pending"
              ? "bg-amber-700 text-white font-bold"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Award size={14} />
          <span>10th Marksheet Pending ({students.filter((s) => !s.tenthMarks?.isVerified).length})</span>
        </button>
        <button
          onClick={() => setActiveTab("twelfth_pending")}
          className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === "twelfth_pending"
              ? "bg-emerald-800 text-white font-bold"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Sparkles size={14} />
          <span>12th Marksheet Pending ({students.filter((s) => !s.twelfthMarks?.isVerified).length})</span>
        </button>
      </div>

      {/* Verification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStudents.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-200">
            No candidates matching this verification filter in {college.shortName}.
          </div>
        ) : (
          filteredStudents.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs space-y-4 hover:shadow transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{s.fullName}</h3>
                  <div className="text-[11px] text-gray-500 font-mono">
                    App #{s.applicationNo} • {s.deptName} ({s.degreeLevel})
                  </div>
                </div>
                <button
                  onClick={() => onOpenUpdateModal(s)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#0B192C] text-[#D4A72C] hover:bg-[#132943] transition cursor-pointer"
                >
                  Upload / Edit
                </button>
              </div>

              {/* 3 Feeds Status Checks with Document Previews */}
              <div className="space-y-2.5 text-xs">
                {/* 1. Aadhar Card */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CreditCard size={15} className="text-sky-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-gray-800">Aadhar: </span>
                      <span className="font-mono text-gray-600">
                        {maskAadharNumber(s.aadhar?.aadharNumber || "")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.aadhar?.document && (
                      <button
                        onClick={() => setPreviewDoc(s.aadhar.document!)}
                        className="px-2 py-1 rounded bg-sky-100 text-sky-800 font-bold text-[10px] flex items-center gap-1 hover:bg-sky-200 cursor-pointer"
                      >
                        <Eye size={11} />
                        <span>Doc</span>
                      </button>
                    )}
                    <button
                      onClick={() => toggleAadharVerification(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        s.aadhar?.isVerified
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {s.aadhar?.isVerified && <Check size={12} />}
                      <span>{s.aadhar?.isVerified ? "Verified" : "Verify"}</span>
                    </button>
                  </div>
                </div>

                {/* 2. 10th Marksheet */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Award size={15} className="text-amber-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-gray-800">10th: </span>
                      <span className="text-gray-600">
                        {s.tenthMarks?.totalMarks} / {s.tenthMarks?.maxMarks} ({s.tenthMarks?.percentage}%)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.tenthMarks?.document && (
                      <button
                        onClick={() => setPreviewDoc(s.tenthMarks.document!)}
                        className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1 hover:bg-amber-200 cursor-pointer"
                      >
                        <Eye size={11} />
                        <span>Doc</span>
                      </button>
                    )}
                    <button
                      onClick={() => toggleTenthVerification(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        s.tenthMarks?.isVerified
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {s.tenthMarks?.isVerified && <Check size={12} />}
                      <span>{s.tenthMarks?.isVerified ? "Verified" : "Verify"}</span>
                    </button>
                  </div>
                </div>

                {/* 3. 12th Marksheet */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Sparkles size={15} className="text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-gray-800">12th Cutoff: </span>
                      <span className="text-emerald-800 font-bold">
                        {s.twelfthMarks?.calculatedCutoff} / 200
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.twelfthMarks?.document ? (
                      <button
                        onClick={() => setPreviewDoc(s.twelfthMarks.document!)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-200 cursor-pointer shadow-xs transition"
                        title="View 12th HSC Marksheet"
                      >
                        <Eye size={12} />
                        <span>12th Doc</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleViewTwelfthDoc(s)}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center gap-1 hover:bg-amber-200 cursor-pointer border border-amber-300 shadow-xs transition"
                        title="View or Generate 12th HSC Marksheet"
                      >
                        <Eye size={12} />
                        <span>View 12th Doc</span>
                      </button>
                    )}
                    <button
                      onClick={() => toggleTwelfthVerification(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        s.twelfthMarks?.isVerified
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {s.twelfthMarks?.isVerified && <Check size={12} />}
                      <span>{s.twelfthMarks?.isVerified ? "Verified" : "Verify"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
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
              {isPdf ? (
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
