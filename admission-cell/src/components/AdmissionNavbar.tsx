import React, { useState } from "react";
import {
  Menu,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  getCurrentAdmissionUser,
  isSuperAdmin,
  COLLEGES,
  logoutAdmissionUser,
} from "../utils/rbac";
import { CollegeKey } from "../types/admission";

interface NavbarProps {
  setMobileOpen?: (open: boolean) => void;
  title?: string;
  collegeKey: CollegeKey;
}

export const AdmissionNavbar: React.FC<NavbarProps> = ({
  setMobileOpen,
  title,
  collegeKey,
}) => {
  const [, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const currentUser = getCurrentAdmissionUser();
  const college = COLLEGES[collegeKey];
  const isSuper = isSuperAdmin(currentUser);

  const handleSwitchCollege = (targetKey: CollegeKey) => {
    setDropdownOpen(false);
    setLocation(COLLEGES[targetKey].portalPath);
  };

  const handleLogout = () => {
    logoutAdmissionUser();
    setLocation("/login");
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0B192C] text-white border-b border-[#D4A72C]/30 shadow-md">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile trigger & Portal Branding */}
        <div className="flex items-center gap-3">
          {setMobileOpen && (
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-white/80 hover:bg-white/10"
              aria-label="Open Navigation"
            >
              <Menu size={22} />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center p-1 shadow-md border-2 border-[#D4A72C] overflow-hidden shrink-0">
              <img
                src={college.logoUrl}
                alt={college.name}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel font-bold text-sm tracking-wide text-white uppercase hidden sm:inline">
                  {college.portalTitle}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#D4A72C] text-[#0B192C]">
                  CODE {college.code}
                </span>
              </div>
              <p className="text-[11px] text-[#D4A72C] font-semibold truncate max-w-xs sm:max-w-md">
                {title || college.name}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Switcher (for Super Admin only) & User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Super Admin Switcher between differentiated portals */}
          {isSuper && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-[#D4A72C]/40 text-xs font-semibold text-white transition cursor-pointer"
              >
                <img
                  src={college.logoUrl}
                  alt={college.shortName}
                  className="h-5 w-5 rounded-full object-contain bg-white p-0.5 shrink-0"
                />
                <span className="hidden md:inline">Inspect: {college.shortName}</span>
                <ChevronDown size={14} className="text-[#D4A72C]" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0B192C] border border-[#D4A72C]/40 shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-white/10 text-[10px] uppercase font-black tracking-wider text-[#D4A72C]">
                    Super Admin Cell Inspection
                  </div>
                  {Object.values(COLLEGES).map((col) => (
                    <button
                      key={col.key}
                      onClick={() => handleSwitchCollege(col.key)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${
                        collegeKey === col.key
                          ? "bg-[#D4A72C]/20 text-[#D4A72C] font-bold"
                          : "text-white/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={col.logoUrl}
                          alt={col.shortName}
                          className="h-6 w-6 rounded-full object-contain bg-white p-0.5 shrink-0 border border-amber-300/40"
                        />
                        <span className="truncate">{col.portalTitle}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-amber-300">
                        {col.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User profile & Sign Out */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <div className="h-8 w-8 rounded-full bg-[#D4A72C] text-[#0B192C] font-bold flex items-center justify-center text-xs border border-amber-300">
                {currentUser?.name?.charAt(0) || "U"}
              </div>
              <div className="text-left hidden xl:block">
                <div className="text-xs font-bold text-white leading-tight">{currentUser?.name || "Officer"}</div>
                <div className="text-[10px] text-[#D4A72C] font-medium leading-tight">
                  {currentUser?.role?.replace("ADMISSION_", "") || "ADMISSION OFFICER"}
                </div>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white text-[#172033] shadow-2xl border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900">{currentUser?.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{currentUser?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {currentUser?.role}
                  </span>
                </div>

                <div className="p-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition text-left cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out of Admission Cell</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
