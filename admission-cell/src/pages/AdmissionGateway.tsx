import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Binary,
  Users,
  ExternalLink,
  Award,
  Sparkles,
} from "lucide-react";
import { COLLEGES, getCurrentAdmissionUser, isSuperAdmin, setCurrentAdmissionUser, SUPER_ADMIN_CONFIG } from "../utils/rbac";
import { CollegeKey } from "../types/admission";
import {
  getStoredApplicantsByCollege,
  seedCleanDemonstrationForCollegeIfEmpty,
} from "../services/admissionStorage";

export const AdmissionGateway: React.FC = () => {
  const [, setLocation] = useLocation();
  const [counts, setCounts] = useState<Record<CollegeKey, number>>({
    engineering: 0,
    nursing: 0,
    pharmacy: 0,
    emerging_sciences: 0,
  });

  useEffect(() => {
    // Seed clean initial data per college if empty
    (Object.keys(COLLEGES) as CollegeKey[]).forEach((k) => {
      seedCleanDemonstrationForCollegeIfEmpty(k);
    });

    const newCounts: Record<CollegeKey, number> = {
      engineering: getStoredApplicantsByCollege("engineering").length,
      nursing: getStoredApplicantsByCollege("nursing").length,
      pharmacy: getStoredApplicantsByCollege("pharmacy").length,
      emerging_sciences: getStoredApplicantsByCollege("emerging_sciences").length,
    };
    setCounts(newCounts);
  }, []);

  const handleEnterPortal = (key: CollegeKey) => {
    const col = COLLEGES[key];
    const user = {
      id: `ADM-${col.code}-001`,
      name: col.deanTitle,
      username: `DEAN_${col.key.toUpperCase()}`,
      role: col.role,
      collegeKey: col.key,
      collegeName: col.name,
      email: col.email,
      title: col.deanTitle,
    };
    setCurrentAdmissionUser(user);
    setLocation(col.portalPath);
  };

  const handleSuperAdminLogin = () => {
    setCurrentAdmissionUser(SUPER_ADMIN_CONFIG);
    setLocation("/engineering");
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="h-20 w-20 mx-auto rounded-3xl bg-white p-2 shadow-2xl border-2 border-[#D4A72C] flex items-center justify-center">
            <img
              src="/assets/logos/kvell-university-logo.png"
              alt="KVELL University Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="inline-block bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            KVELL Central University Admissions Directorate
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-[#0B192C] uppercase tracking-wide">
            Admission Cell Portal Directory
          </h1>
          <p className="text-xs text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Differentiated Role-Based Access Control (RBAC) portals for each constituent institution. Select your dedicated Admission Cell to manage candidate enrollment, 14-digit registration numbers, and mandated document feeds.
          </p>
        </div>

        {/* 4 Differentiated Admission Cell Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* 1. ENGINEERING ADMISSION CELL */}
          <div className="bg-white rounded-3xl p-6 border-2 border-amber-400 shadow-xl hover:shadow-2xl transition flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-white border-2 border-amber-300 p-1 flex items-center justify-center shadow-sm shrink-0">
                  <img
                    src={COLLEGES.engineering.logoUrl}
                    alt="KVCET Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    CODE 01
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/10 text-gray-700">
                    {counts.engineering} Candidates
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-cinzel font-black text-lg text-[#0B192C] group-hover:text-amber-800 transition">
                  Engineering Admission Cell
                </h2>
                <p className="text-xs font-bold text-amber-700 mt-0.5">
                  Karpaga Vinayaga College of Engineering and Technology (KVCET)
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Faculty of Engineering, Technology & Computer Applications. Configured with the official 14-digit KVCET registration number engine.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                  ⚡ 14-Digit Reg No Engine
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  10 UG Branches
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  7 PG Programmes
                </span>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleEnterPortal("engineering")}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4A72C] to-amber-500 text-[#0B192C] font-black text-xs shadow-md hover:from-amber-400 hover:to-amber-500 transition flex items-center justify-center gap-2 border border-amber-300 cursor-pointer active:scale-98"
              >
                <span>Enter Engineering Admission Cell</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* 2. NURSING ADMISSION CELL */}
          <div className="bg-white rounded-3xl p-6 border-2 border-sky-400 shadow-xl hover:shadow-2xl transition flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-white border-2 border-sky-300 p-1 flex items-center justify-center shadow-sm shrink-0">
                  <img
                    src={COLLEGES.nursing.logoUrl}
                    alt="KVCN Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300">
                    CODE 02
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/10 text-gray-700">
                    {counts.nursing} Candidates
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-cinzel font-black text-lg text-[#0B192C] group-hover:text-sky-800 transition">
                  Nursing Admission Cell
                </h2>
                <p className="text-xs font-bold text-sky-700 mt-0.5">
                  Karpaga Vinayaga College of Nursing (KVCN)
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Faculty of Nursing, Clinical Care & Allied Health Sciences. Approved by INC & TNC. Dedicated clinical admission lifecycle.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-900 border border-sky-200">
                  B.Sc & P.B. B.Sc Nursing
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  M.Sc Nursing Specialties
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  NPCC Critical Care
                </span>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleEnterPortal("nursing")}
                className="w-full py-3 px-4 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Enter Nursing Admission Cell</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* 3. PHARMACY ADMISSION CELL */}
          <div className="bg-white rounded-3xl p-6 border-2 border-emerald-400 shadow-xl hover:shadow-2xl transition flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-white border-2 border-emerald-300 p-1 flex items-center justify-center shadow-sm shrink-0">
                  <img
                    src={COLLEGES.pharmacy.logoUrl}
                    alt="KVIPS Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    CODE 03
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/10 text-gray-700">
                    {counts.pharmacy} Candidates
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-cinzel font-black text-lg text-[#0B192C] group-hover:text-emerald-800 transition">
                  Pharmacy Admission Cell
                </h2>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  Karpaga Vinayaga Institute of Pharmaceutical Sciences (KVIPS)
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Faculty of Pharmaceutical Sciences & Drug Discovery. Approved by PCI. B.Pharm, D.Pharm, and Doctor of Pharmacy (Pharm.D).
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                  B.Pharm (4 Yrs) & Pharm.D
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  D.Pharm (2 Yrs)
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  M.Pharm Specialties
                </span>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleEnterPortal("pharmacy")}
                className="w-full py-3 px-4 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Enter Pharmacy Admission Cell</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* 4. EMERGING SCIENCES ADMISSION CELL */}
          <div className="bg-white rounded-3xl p-6 border-2 border-purple-400 shadow-xl hover:shadow-2xl transition flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-white border-2 border-purple-300 p-1 flex items-center justify-center shadow-sm shrink-0">
                  <img
                    src={COLLEGES.emerging_sciences.logoUrl}
                    alt="KVFES Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                    CODE 04
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/10 text-gray-700">
                    {counts.emerging_sciences} Candidates
                  </span>
                </div>
              </div>

              <div>
                <h2 className="font-cinzel font-black text-lg text-[#0B192C] group-hover:text-purple-800 transition">
                  Emerging Sciences Admission Cell
                </h2>
                <p className="text-xs font-bold text-purple-700 mt-0.5">
                  Faculty of Allied Health & Emerging Sciences (KVFES)
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Cutting-edge degrees in Artificial Intelligence, Cyber Forensics, Medical Lab Technology (MLT), and Radiology.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200">
                  B.Sc AI & Data Science
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  B.Sc Cyber Forensics
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  Medical Laboratory Tech
                </span>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={() => handleEnterPortal("emerging_sciences")}
                className="w-full py-3 px-4 rounded-xl bg-[#7C3AED] hover:bg-purple-700 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Enter Emerging Sciences Cell</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Central Super Admin Elevation Bar */}
        <div className="p-5 rounded-2xl bg-[#0B192C] text-white border border-[#D4A72C]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#D4A72C] text-[#0B192C] font-bold flex items-center justify-center text-lg">
              👑
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                University Registrar & Supreme Admission Authority
              </span>
              <p className="text-[11px] text-[#D4A72C]">
                Logged in as <strong>Dr. Sathish</strong> • Supreme elevation to oversee and inspect all 4 admission cells
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSuperAdminLogin}
              className="px-4 py-2 rounded-xl bg-[#D4A72C] hover:bg-amber-400 text-[#0B192C] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <ShieldCheck size={14} />
              <span>Enter as Super Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
