import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Binary,
  Sparkles,
  CreditCard,
  GraduationCap,
  Award,
} from "lucide-react";
import {
  CollegeKey,
  DegreeLevel,
  AdmissionQuota,
  StudentApplicant,
  DocumentAttachment,
} from "../types/admission";
import { COLLEGES } from "../utils/rbac";
import { COLLEGE_DEPARTMENTS } from "../utils/collegeDepartments";
import { buildEngineeringRegNo } from "../utils/engineeringRegGen";
import { validateAadharNumber, formatAadharInput } from "../utils/aadharValidator";
import {
  calculateTenthSummary,
  calculateTwelfthCutoff,
  calculateTwelfthSummary,
} from "../utils/cutoffCalculator";
import {
  createApplicantForCollege,
  getNextEngineeringRollNumber,
} from "../services/admissionStorage";
import { DocumentUploadZone } from "./DocumentUploadZone";
import { createDigitalTwelfthAttachment } from "../utils/digitalMarksheet";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fixedCollegeKey?: CollegeKey; // When in dedicated portal, locked to that college
}

export const StudentAdmissionModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  fixedCollegeKey = "engineering",
}) => {
  const [selectedCollege, setSelectedCollege] = useState<CollegeKey>(fixedCollegeKey);
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel | "">("");
  const [selectedBranchCode, setSelectedBranchCode] = useState<string>("");
  const [selectedBranchName, setSelectedBranchName] = useState<string>("");
  const [admissionYear, setAdmissionYear] = useState<number>(2026);
  const [universityYear, setUniversityYear] = useState<number>(2026);
  const [quota, setQuota] = useState<AdmissionQuota | "">("");

  // Registration Number
  const [regNo, setRegNo] = useState<string>("");

  // Personal Details
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Mandated Feed 1: Aadhar Card & Document
  const [aadharRaw, setAadharRaw] = useState("");
  const [aadharDoc, setAadharDoc] = useState<DocumentAttachment | undefined>(undefined);

  // Mandated Feed 2: 10th Marks & Marksheet
  const [tenthBoard, setTenthBoard] = useState<string>("");
  const [tenthSchool, setTenthSchool] = useState("");
  const [tenthRoll, setTenthRoll] = useState("");
  const [tenthPassingYear, setTenthPassingYear] = useState<number | "">("");
  const [tenthL1, setTenthL1] = useState<number | "">("");
  const [tenthL2, setTenthL2] = useState<number | "">("");
  const [tenthMaths, setTenthMaths] = useState<number | "">("");
  const [tenthScience, setTenthScience] = useState<number | "">("");
  const [tenthSocial, setTenthSocial] = useState<number | "">("");
  const [tenthDoc, setTenthDoc] = useState<DocumentAttachment | undefined>(undefined);

  // Mandated Feed 3: 12th Marks & Marksheet
  const [twelfthBoard, setTwelfthBoard] = useState<string>("");
  const [twelfthSchool, setTwelfthSchool] = useState("");
  const [twelfthRoll, setTwelfthRoll] = useState("");
  const [twelfthStream, setTwelfthStream] = useState<string>("");
  const [twelfthPassingYear, setTwelfthPassingYear] = useState<number | "">("");
  const [twelfthL1, setTwelfthL1] = useState<number | "">("");
  const [twelfthL2, setTwelfthL2] = useState<number | "">("");
  const [twelfthMaths, setTwelfthMaths] = useState<number | "">("");
  const [twelfthPhysics, setTwelfthPhysics] = useState<number | "">("");
  const [twelfthChemistry, setTwelfthChemistry] = useState<number | "">("");
  const [twelfthBiology, setTwelfthBiology] = useState<number | "">("");
  const [twelfthCS, setTwelfthCS] = useState<number | "">("");
  const [twelfthDoc, setTwelfthDoc] = useState<DocumentAttachment | undefined>(undefined);

  const [activeTab, setActiveTab] = useState<"program" | "personal" | "aadhar" | "tenth" | "twelfth">("program");
  const [errorMsg, setErrorMsg] = useState("");

  const availableDepts = degreeLevel
    ? COLLEGE_DEPARTMENTS[selectedCollege]?.[degreeLevel] || []
    : [];

  useEffect(() => {
    setSelectedCollege(fixedCollegeKey);
    if (isOpen) {
      setDegreeLevel("");
      setSelectedBranchCode("");
      setSelectedBranchName("");
      setQuota("");
      setRegNo("");
      setFullName("");
      setGender("");
      setDob("");
      setBloodGroup("");
      setEmail("");
      setPhone("");
      setFatherName("");
      setMotherName("");
      setGuardianPhone("");
      setAddress("");
      setCity("");
      setDistrict("");
      setState("");
      setPincode("");
      setAadharRaw("");
      setAadharDoc(undefined);
      setTenthBoard("");
      setTenthSchool("");
      setTenthRoll("");
      setTenthPassingYear("");
      setTenthL1("");
      setTenthL2("");
      setTenthMaths("");
      setTenthScience("");
      setTenthSocial("");
      setTenthDoc(undefined);
      setTwelfthBoard("");
      setTwelfthSchool("");
      setTwelfthRoll("");
      setTwelfthStream("");
      setTwelfthPassingYear("");
      setTwelfthL1("");
      setTwelfthL2("");
      setTwelfthMaths("");
      setTwelfthPhysics("");
      setTwelfthChemistry("");
      setTwelfthBiology("");
      setTwelfthCS("");
      setTwelfthDoc(undefined);
      setActiveTab("program");
      setErrorMsg("");
    }
  }, [isOpen, fixedCollegeKey]);

  if (!isOpen) return null;

  // Real-time calculations (zero when marks are empty)
  const aadharValidation = validateAadharNumber(aadharRaw);
  const tenthSummary = calculateTenthSummary({
    lang1: Number(tenthL1) || 0,
    lang2: Number(tenthL2) || 0,
    maths: Number(tenthMaths) || 0,
    science: Number(tenthScience) || 0,
    social: Number(tenthSocial) || 0,
  });

  const twelfthCutoff = calculateTwelfthCutoff(
    {
      lang1: Number(twelfthL1) || 0,
      lang2: Number(twelfthL2) || 0,
      maths: Number(twelfthMaths) || 0,
      physics: Number(twelfthPhysics) || 0,
      chemistry: Number(twelfthChemistry) || 0,
      biology: Number(twelfthBiology) || 0,
      computerScience: Number(twelfthCS) || 0,
    },
    selectedCollege
  );

  const isCbseOrIsc = twelfthBoard === "CBSE" || twelfthBoard === "ISC" || twelfthBoard === "ICSE";

  const twelfthSummary = calculateTwelfthSummary(
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

  // Engineering Next Roll No preview (only if Engineering and Dept selected)
  const isEngineering = selectedCollege === "engineering";
  const canGenerateReg = isEngineering && !!selectedBranchCode && !!degreeLevel;
  const nextRollNumber = canGenerateReg
    ? getNextEngineeringRollNumber(selectedBranchCode, degreeLevel === "UG" ? "1" : "2", admissionYear)
    : 1;

  const sampleEngRegNoPreview = canGenerateReg
    ? buildEngineeringRegNo({
        universityYear,
        degreeCode: degreeLevel === "UG" ? "1" : "2",
        programmeCode: selectedBranchCode,
        admissionYear,
        rollNumber: nextRollNumber,
      })
    : "";

  const handleGenerateEngineeringRegNo = () => {
    if (sampleEngRegNoPreview) {
      setRegNo(sampleEngRegNoPreview);
    }
  };

  const handleNextStep = () => {
    setErrorMsg("");
    if (activeTab === "program") {
      if (!degreeLevel) {
        setErrorMsg("Please choose a Degree Level (UG / PG).");
        return;
      }
      if (!quota) {
        setErrorMsg("Please choose an Admission Quota.");
        return;
      }
      if (!selectedBranchCode) {
        setErrorMsg("Please choose an Academic Department / Branch.");
        return;
      }
      setActiveTab("personal");
    } else if (activeTab === "personal") {
      if (!fullName.trim()) {
        setErrorMsg("Please enter candidate's full name.");
        return;
      }
      if (!gender) {
        setErrorMsg("Please choose candidate's gender.");
        return;
      }
      setActiveTab("aadhar");
    } else if (activeTab === "aadhar") {
      if (!aadharRaw.trim() || aadharRaw.replace(/\D/g, "").length !== 12) {
        setErrorMsg("A valid 12-digit Aadhar number is mandatory.");
        return;
      }
      setActiveTab("tenth");
    } else if (activeTab === "tenth") {
      setActiveTab("twelfth");
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    if (activeTab === "personal") setActiveTab("program");
    else if (activeTab === "aadhar") setActiveTab("personal");
    else if (activeTab === "tenth") setActiveTab("aadhar");
    else if (activeTab === "twelfth") setActiveTab("tenth");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!degreeLevel) {
      setErrorMsg("Please choose a Degree Level.");
      setActiveTab("program");
      return;
    }

    if (!quota) {
      setErrorMsg("Please choose an Admission Quota.");
      setActiveTab("program");
      return;
    }

    if (!selectedBranchCode) {
      setErrorMsg("Please choose an Academic Department / Branch.");
      setActiveTab("program");
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg("Please enter candidate's full name.");
      setActiveTab("personal");
      return;
    }

    if (!gender) {
      setErrorMsg("Please choose candidate's gender.");
      setActiveTab("personal");
      return;
    }

    if (!aadharRaw.trim() || aadharRaw.replace(/\D/g, "").length !== 12) {
      setErrorMsg("A valid 12-digit Aadhar number is mandatory.");
      setActiveTab("aadhar");
      return;
    }

    const collegeConf = COLLEGES[selectedCollege];
    const newId = `APP-${collegeConf.code}-${Date.now().toString().slice(-6)}`;
    const appNumber = `${collegeConf.shortName.toUpperCase()}/${admissionYear}/${Math.floor(100 + Math.random() * 900)}`;

    // If candidate has entered 12th marks or has no doc, generate official digital marksheet so they always have an attachment!
    let finalTwelfthDoc = twelfthDoc;
    if (!finalTwelfthDoc && (twelfthPhysics !== "" || twelfthChemistry !== "" || twelfthMaths !== "")) {
      finalTwelfthDoc = createDigitalTwelfthAttachment(
        fullName.trim(),
        {
          board: (twelfthBoard as any) || "STATE_BOARD",
          stream: twelfthStream || "PCMB",
          schoolName: twelfthSchool.trim() || "Higher Secondary School",
          rollNumber: twelfthRoll.trim() || `HSC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
          yearOfPassing: Number(twelfthPassingYear) || new Date().getFullYear(),
          lang1Marks: Number(twelfthL1) || 0,
          lang2Marks: Number(twelfthL2) || 0,
          mathsMarks: Number(twelfthMaths) || 0,
          physicsMarks: Number(twelfthPhysics) || 0,
          chemistryMarks: Number(twelfthChemistry) || 0,
          biologyMarks: Number(twelfthBiology) || 0,
          computerScienceMarks: Number(twelfthCS) || 0,
          calculatedCutoff: twelfthCutoff.cutoff,
        },
        collegeConf.name
      );
    }

    const newStudent: StudentApplicant = {
      id: newId,
      applicationNo: appNumber,
      regNo: regNo.trim(),
      fullName: fullName.trim(),
      gender: gender as any,
      dob,
      bloodGroup,
      email: email.trim(),
      phone: phone.trim(),
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      guardianPhone: guardianPhone.trim(),
      address: address.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      collegeKey: selectedCollege,
      collegeCode: collegeConf.code,
      deptKey: selectedBranchCode,
      deptName: selectedBranchName || "Selected Department",
      degreeLevel: degreeLevel as DegreeLevel,
      degreeCode: degreeLevel === "UG" ? "1" : "2",
      admissionYear,
      quota: quota as AdmissionQuota,
      status: "DOCS_VERIFIED",
      aadhar: {
        aadharNumber: aadharRaw.replace(/\D/g, ""),
        isVerified: aadharValidation.isValid,
        document: aadharDoc,
        documentName: aadharDoc?.fileName,
      },
      tenthMarks: {
        board: (tenthBoard as any) || "STATE_BOARD",
        schoolName: tenthSchool.trim(),
        rollNumber: tenthRoll.trim(),
        yearOfPassing: Number(tenthPassingYear) || new Date().getFullYear(),
        lang1Marks: Number(tenthL1) || 0,
        lang2Marks: Number(tenthL2) || 0,
        mathsMarks: Number(tenthMaths) || 0,
        scienceMarks: Number(tenthScience) || 0,
        socialMarks: Number(tenthSocial) || 0,
        totalMarks: tenthSummary.total,
        maxMarks: tenthSummary.maxTotal,
        percentage: tenthSummary.percentage,
        document: tenthDoc,
        marksheetDocName: tenthDoc?.fileName,
        isVerified: !!tenthDoc,
      },
      twelfthMarks: {
        board: (twelfthBoard as any) || "STATE_BOARD",
        schoolName: twelfthSchool.trim(),
        rollNumber: twelfthRoll.trim(),
        stream: twelfthStream || "PCMB",
        yearOfPassing: Number(twelfthPassingYear) || new Date().getFullYear(),
        lang1Marks: isCbseOrIsc ? undefined : (Number(twelfthL1) || 0),
        lang2Marks: Number(twelfthL2) || 0,
        mathsMarks: Number(twelfthMaths) || 0,
        physicsMarks: Number(twelfthPhysics) || 0,
        chemistryMarks: Number(twelfthChemistry) || 0,
        biologyMarks: Number(twelfthBiology) || 0,
        computerScienceMarks: Number(twelfthCS) || 0,
        totalMarks: twelfthSummary.total,
        maxMarks: twelfthSummary.maxTotal,
        percentage: twelfthSummary.percentage,
        calculatedCutoff: twelfthCutoff.cutoff,
        document: finalTwelfthDoc,
        marksheetDocName: finalTwelfthDoc?.fileName,
        isVerified: !!finalTwelfthDoc,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createApplicantForCollege(selectedCollege, newStudent);
    onSuccess();
    onClose();
  };

  const collegeConf = COLLEGES[selectedCollege];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 overflow-hidden my-8 max-h-[92vh] flex flex-col">
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
              <h2 className="font-cinzel font-bold text-base text-white">
                Enroll New Student • {collegeConf.portalTitle}
              </h2>
              <p className="text-xs text-[#D4A72C]">{collegeConf.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("program")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "program"
                ? "border-[#D4A72C] text-[#0B192C] bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <GraduationCap size={15} className="text-[#D4A72C]" />
            1. Branch & Reg No
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "personal"
                ? "border-[#D4A72C] text-[#0B192C] bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <UserPlus size={15} className="text-[#D4A72C]" />
            2. Personal Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("aadhar")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "aadhar"
                ? "border-[#D4A72C] text-[#0B192C] bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <CreditCard size={15} className="text-[#D4A72C]" />
            3. Aadhar & Document
            {aadharDoc && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tenth")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "tenth"
                ? "border-[#D4A72C] text-[#0B192C] bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Award size={15} className="text-[#D4A72C]" />
            4. 10th Marks & Marksheet
            {tenthDoc && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("twelfth")}
            className={`px-4 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "twelfth"
                ? "border-[#D4A72C] text-[#0B192C] bg-white font-bold"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <Sparkles size={15} className="text-[#D4A72C]" />
            5. 12th Marks & Marksheet
            {twelfthDoc && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 font-medium">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
              e.preventDefault();
            }
          }}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* TAB 1: BRANCH & REG NO */}
          {activeTab === "program" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white p-1 border border-gray-300 shadow-xs flex items-center justify-center shrink-0">
                    <img
                      src={collegeConf.logoUrl}
                      alt={collegeConf.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-[#0B192C]">
                      {collegeConf.portalTitle}
                    </span>
                    <p className="text-[11px] text-gray-500">{collegeConf.description}</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-black/10 text-gray-800">
                  Institution Code: {collegeConf.code}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Degree Level *
                  </label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => {
                      const val = e.target.value as DegreeLevel | "";
                      setDegreeLevel(val);
                      setSelectedBranchCode("");
                      setSelectedBranchName("");
                    }}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-300 outline-none bg-white focus:ring-2 focus:ring-[#D4A72C]"
                  >
                    <option value="">-- Choose Degree Level --</option>
                    <option value="UG">Undergraduate (UG - Code: 1)</option>
                    <option value="PG">Postgraduate (PG - Code: 2)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Admission Quota *
                  </label>
                  <select
                    value={quota}
                    onChange={(e) => setQuota(e.target.value as AdmissionQuota)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-300 outline-none bg-white focus:ring-2 focus:ring-[#D4A72C]"
                  >
                    <option value="">-- Choose Admission Quota --</option>
                    <option value="ENTRANCE_QUOTA">Entrance Quota</option>
                    <option value="MANAGEMENT_QUOTA">Management Quota</option>
                  </select>
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Academic Department / Branch *
                </label>
                <select
                  value={selectedBranchCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedBranchCode(code);
                    const match = availableDepts.find((d) => d.code === code);
                    if (match) setSelectedBranchName(match.name);
                    else setSelectedBranchName("");
                  }}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#D4A72C] outline-none bg-white"
                >
                  <option value="">
                    {!degreeLevel
                      ? "-- Please Choose Degree Level First --"
                      : "-- Choose Academic Department / Branch --"}
                  </option>
                  {availableDepts.map((d) => (
                    <option key={d.code} value={d.code}>
                      Code {d.code} • {d.name} ({d.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* REGISTRATION NUMBER ASSIGNMENT */}
              {isEngineering ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-900 flex items-center gap-1.5">
                      <Binary size={16} />
                      Engineering 14-Digit Format Engine (KVCET)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                      Code 01
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-800">
                    Formula:{" "}
                    {canGenerateReg ? (
                      <span className="font-mono font-bold">
                        2026 (Univ) + 01 (KVCET) + {degreeLevel === "UG" ? "1" : "2"} + {selectedBranchCode} + 26 + {String(nextRollNumber).padStart(3, "0")}
                      </span>
                    ) : (
                      <span className="italic text-gray-500">
                        Please choose Degree Level and Department above to generate the official registration number formula.
                      </span>
                    )}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      maxLength={14}
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      placeholder="Leave empty or generate official 14-digit number"
                      className="flex-1 w-full text-xs font-mono font-bold px-3 py-2 rounded-xl border border-amber-300 bg-white outline-none"
                    />
                    <button
                      type="button"
                      disabled={!canGenerateReg}
                      onClick={handleGenerateEngineeringRegNo}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm ${
                        canGenerateReg
                          ? "bg-[#0B192C] text-[#D4A72C] hover:bg-[#132943]"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Sparkles size={14} />
                      <span>
                        {canGenerateReg
                          ? `Auto-Generate Reg No (${sampleEngRegNoPreview})`
                          : "Auto-Generate Reg No (Choose Department First)"}
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    * Registration numbers are not auto-added unless you click generate or enter manually.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">
                    Registration Number (Manual / University Allotment)
                  </label>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="Enter registration number if allotted, or leave blank"
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white"
                  />
                  <p className="text-[10px] text-gray-500">
                    The autonomous generation engine is strictly for Engineering. For {collegeConf.shortName}, enter the allotted register number or leave empty.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PERSONAL DETAILS */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Anandha Kumar K"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-[#D4A72C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white"
                  >
                    <option value="">-- Choose Gender --</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white"
                  >
                    <option value="">-- Select Blood Group --</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mother's Name</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Guardian Phone</label>
                  <input
                    type="text"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Permanent Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Door No, Street Name, Landmark"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
                <input
                  type="text"
                  placeholder="District"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: AADHAR CARD & REAL DOCUMENT UPLOAD */}
          {activeTab === "aadhar" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200">
                <span className="text-xs font-bold text-sky-900 block mb-1">
                  Mandated Feed 1: Aadhar Card & Document KYC
                </span>
                <p className="text-[11px] text-sky-800">
                  Enter 12-digit UIDAI number and upload the student's official Aadhar card copy.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  12-Digit Aadhar Card Number *
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={formatAadharInput(aadharRaw)}
                  onChange={(e) => setAadharRaw(e.target.value)}
                  placeholder="Enter 12-digit UIDAI number"
                  className="w-full text-base font-mono font-bold tracking-widest px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <div className="mt-1.5">
                  {aadharRaw.replace(/\D/g, "").length === 12 ? (
                    aadharValidation.isValid ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Valid 12-Digit UIDAI Format (Verhoeff Verified)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                        <AlertCircle size={14} /> {aadharValidation.message}
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] text-gray-500">
                      Length: {aadharRaw.replace(/\D/g, "").length} / 12 digits
                    </span>
                  )}
                </div>
              </div>

              {/* REAL FILE UPLOAD DROPZONE */}
              <DocumentUploadZone
                label="Student Aadhar Card Document"
                description="Upload scanned copy or digital e-Aadhar (PDF, PNG, JPG, Max 15MB)"
                currentDocument={aadharDoc}
                onDocumentChange={setAadharDoc}
                required
              />
            </div>
          )}

          {/* TAB 4: 10TH MARKS & REAL MARKSHEET UPLOAD */}
          {activeTab === "tenth" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Mandated Feed 2: 10th Standard (SSLC) Academic Record
                  </span>
                  <p className="text-[11px] text-amber-800">
                    Enter SSLC board, school name, roll number, and 5 subject marks.
                  </p>
                </div>
                <span className="text-xs font-black bg-amber-200 text-[#0B192C] px-3 py-1 rounded-full">
                  Total: {tenthSummary.total} / {tenthSummary.maxTotal} ({tenthSummary.percentage}%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Board</label>
                  <select
                    value={tenthBoard}
                    onChange={(e) => setTenthBoard(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none bg-white font-semibold"
                  >
                    <option value="">-- Choose 10th Board --</option>
                    <option value="STATE_BOARD">Tamil Nadu State Board</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="OTHER">Other Board</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">School Name</label>
                  <input
                    type="text"
                    value={tenthSchool}
                    onChange={(e) => setTenthSchool(e.target.value)}
                    placeholder="e.g. Govt Higher Secondary School"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">10th Roll No</label>
                  <input
                    type="text"
                    value={tenthRoll}
                    onChange={(e) => setTenthRoll(e.target.value)}
                    placeholder="e.g. 1029482"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Year of Passing</label>
                <input
                  type="number"
                  value={tenthPassingYear}
                  onChange={(e) => setTenthPassingYear(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 2024"
                  className="w-full sm:w-1/4 text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none font-mono"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <span className="text-xs font-bold text-gray-700 block mb-2">Subject Marks (out of 100)</span>
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

              {/* REAL FILE UPLOAD DROPZONE */}
              <DocumentUploadZone
                label="10th Standard Marksheet / Certificate"
                description="Upload original SSLC Marksheet (PDF, PNG, JPG, Max 15MB)"
                currentDocument={tenthDoc}
                onDocumentChange={setTenthDoc}
                required
              />
            </div>
          )}

          {/* TAB 5: 12TH MARKS & REAL MARKSHEET UPLOAD */}
          {activeTab === "twelfth" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Mandated Feed 3: 12th Standard (HSC) Record & Cutoff Details
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Formula: {twelfthCutoff.formulaDescription}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-emerald-200 text-[#0B192C] px-3 py-1.5 rounded-xl border border-emerald-400">
                    Cutoff: {twelfthCutoff.cutoff} / {twelfthCutoff.maxCutoff}
                  </span>
                  <span className="text-xs font-black bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-300">
                    Total: {twelfthSummary.total} / {twelfthSummary.maxTotal} ({twelfthSummary.percentage}%)
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
                    <option value="">-- Choose 12th Stream --</option>
                    <option value="PCMB">PCMB (Physics, Chemistry, Maths, Bio)</option>
                    <option value="PCMC">PCMC (Physics, Chemistry, Maths, Comp Sci)</option>
                    <option value="PCB">PCB (Pure Science / Biology)</option>
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
                  placeholder="e.g. Government Higher Secondary School / KV Matriculation"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">Subject Scores (Marks out of 100)</span>
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
                    Cutoff Core: Maths ({Number(twelfthMaths) || 0}) + Physics ({Number(twelfthPhysics) || 0}) + Chemistry ({Number(twelfthChemistry) || 0})
                  </span>
                </div>

                <div className={`grid gap-2.5 ${isCbseOrIsc ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-6"}`}>
                  {!isCbseOrIsc && (
                    <div>
                      <label className="text-[10px] text-gray-600 font-bold block mb-0.5">Part 1 Lang</label>
                      <input
                        type="number"
                        max={100}
                        min={0}
                        value={twelfthL1}
                        onChange={(e) => setTwelfthL1(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Tamil / ..."
                        className="w-full text-xs font-bold text-center py-2 rounded-lg border border-gray-300 bg-white"
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
                      className="w-full text-xs font-bold text-center py-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">Maths *</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthMaths}
                      onChange={(e) => setTwelfthMaths(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Maths"
                      className="w-full text-xs font-bold text-center py-2 rounded-lg border border-emerald-400 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">Physics *</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthPhysics}
                      onChange={(e) => setTwelfthPhysics(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Physics"
                      className="w-full text-xs font-bold text-center py-2 rounded-lg border border-emerald-400 bg-emerald-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-800 font-bold block mb-0.5">Chemistry *</label>
                    <input
                      type="number"
                      max={100}
                      min={0}
                      value={twelfthChemistry}
                      onChange={(e) => setTwelfthChemistry(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Chemistry"
                      className="w-full text-xs font-bold text-center py-2 rounded-lg border border-emerald-400 bg-emerald-50/50"
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
                      className="w-full text-xs font-bold text-center py-2 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex flex-wrap justify-between items-center text-xs text-gray-700 font-semibold gap-2">
                  <span>Aggregate: <strong>{twelfthSummary.total}</strong> / {twelfthSummary.maxTotal} marks</span>
                  <span>Percentage: <strong>{twelfthSummary.percentage}%</strong></span>
                  <span className="text-emerald-800 font-bold">Engineering Cutoff: {twelfthCutoff.cutoff} / 200</span>
                </div>
              </div>

              {/* REAL FILE UPLOAD DROPZONE */}
              <DocumentUploadZone
                label="12th Standard Marksheet / HSC Certificate"
                description="Upload original HSC Marksheet (PDF, PNG, JPG, Max 15MB)"
                currentDocument={twelfthDoc}
                onDocumentChange={setTwelfthDoc}
              />

              {/* Instant Digital Marksheet Fallback */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-300">
                <div className="text-xs text-amber-950">
                  <span className="font-bold block">Don't have a scanned physical marksheet right now?</span>
                  <span className="text-[11px] text-amber-800">
                    Generate an official digital HSC marksheet certificate with your entered scores instantly.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const digitalDoc = createDigitalTwelfthAttachment(
                      fullName || "Candidate",
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
                        calculatedCutoff: twelfthCutoff.cutoff,
                      },
                      collegeConf.name
                    );
                    setTwelfthDoc(digitalDoc);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#0B192C] text-[#D4A72C] text-xs font-bold hover:bg-[#132943] transition cursor-pointer shrink-0 shadow-xs"
                >
                  ⚡ Generate Digital Marksheet
                </button>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== "program" && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  ← Previous Step
                </button>
              )}

              {activeTab !== "twelfth" ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white text-xs font-bold hover:bg-[#132943] transition cursor-pointer"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A72C] to-amber-600 text-[#0B192C] text-xs font-black shadow-lg hover:from-amber-400 hover:to-amber-500 transition border border-amber-300 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Enroll Candidate with Documents</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
