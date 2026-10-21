import React from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Binary,
  FileCheck2,
  X,
  LogOut,
  Building2,
} from "lucide-react";
import { COLLEGES, logoutAdmissionUser } from "../utils/rbac";
import { CollegeKey } from "../types/admission";

interface SidebarProps {
  collegeKey: CollegeKey;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onOpenNewStudentModal?: () => void;
}

export const AdmissionSidebar: React.FC<SidebarProps> = ({
  collegeKey,
  mobileOpen,
  setMobileOpen,
  onOpenNewStudentModal,
}) => {
  const [location, setLocation] = useLocation();
  const college = COLLEGES[collegeKey];
  const basePath = college.portalPath;

  const isActive = (path: string) => location === path;

  const handleLogout = () => {
    logoutAdmissionUser();
    setLocation("/login");
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0B192C] text-white flex flex-col justify-between border-r border-[#D4A72C]/20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Header Brand */}
          <div className="px-5 h-[5.5rem] lg:h-[7.5rem] box-border border-b-4 border-[#D4A72C] flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/kvell-logo.png"
                alt="KVELL UNIVERSITY"
                className="h-10 w-10 object-contain rounded-full bg-white p-0.5 border border-[#D4A72C]/40 shadow-sm shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black tracking-wide text-white block truncate uppercase">
                  KVELL UNIVERSITY
                </span>
                <span className="mt-0.5 text-[11px] font-bold text-[#D4A72C] tracking-wider uppercase block truncate">
                  {college.shortName} Admissions
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-white/60 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="p-4 pb-2">
            <button
              onClick={() => {
                if (onOpenNewStudentModal) onOpenNewStudentModal();
                setMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A72C] to-amber-500 text-[#0B192C] font-black text-xs shadow-lg hover:from-amber-400 hover:to-amber-500 transition border border-amber-300 active:scale-95 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Enroll In {college.shortName}</span>
            </button>
          </div>

          {/* Navigation Links for this Differentiated Admission Cell */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest px-3 py-1">
              {college.shortName} Operations
            </div>

            <Link
              href={basePath}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive(basePath)
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard size={17} />
              <span>Cell Dashboard</span>
            </Link>

            <Link
              href={`${basePath}/roster`}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive(`${basePath}/roster`)
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Users size={17} />
              <span>Candidate Roster</span>
            </Link>

            <Link
              href={`${basePath}/verification`}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive(`${basePath}/verification`)
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <FileCheck2 size={17} />
              <span>Document & KYC Desk</span>
            </Link>

            {/* Registration Number Engine - ONLY IN ENGINEERING */}
            {college.regEngineAvailable && (
              <>
                <div className="pt-4 text-[10px] font-black text-[#D4A72C] uppercase tracking-widest px-3 py-1 flex items-center justify-between">
                  <span>Registration Engine</span>
                  <span className="text-[8px] bg-amber-500/20 text-[#D4A72C] border border-[#D4A72C]/40 px-1 py-0.5 rounded">
                    KVCET ONLY
                  </span>
                </div>

                <Link
                  href={`${basePath}/reg-engine`}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive(`${basePath}/reg-engine`)
                      ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Binary size={17} className="text-[#D4A72C]" />
                    <span>14-Digit Format Engine</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-white/10 px-1.5 py-0.5 rounded text-amber-300">
                    01
                  </span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/logos/kvell-university-logo.png"
              alt="KVELL University"
              className="h-7 w-7 rounded-full bg-white p-0.5 object-contain border border-[#D4A72C]/50 shrink-0"
            />
            <div className="overflow-hidden">
              <span className="text-[10px] font-black text-[#D4A72C] uppercase tracking-wider block">KVELL University</span>
              <span className="text-[10px] text-white/60 truncate block">{college.name}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 text-xs font-bold transition border border-white/10 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
