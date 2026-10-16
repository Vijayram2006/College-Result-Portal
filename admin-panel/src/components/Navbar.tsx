import React from "react";
import { Menu, ShieldCheck, Bell, Sparkles, Crown } from "lucide-react";
import { adminAuthApi } from "../services/api";
import { getActiveCollege, isSuperAdmin, SUPER_ADMIN_CONFIG, setSuperAdminCollegeView } from "../utils/rbac";

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen, title }) => {
  const currentUser = adminAuthApi.getCurrentUser();
  const college = getActiveCollege();
  const isSuper = isSuperAdmin(currentUser);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E1D8] shadow-sm px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-[#0B192C] hover:bg-[#F8F5EE] transition"
        >
          <Menu size={20} />
        </button>
        <img
          src={isSuper ? "/kvell-logo.png" : (college.logoUrl || "/kvell-logo.png")}
          alt={college.name}
          className="w-10 h-10 rounded-full border border-[#D4A72C] p-0.5 object-contain bg-white shrink-0"
        />
        <div>
          <h1 className="font-display font-extrabold text-lg sm:text-xl text-[#0B192C] flex items-center gap-2">
            <span>{title}</span>
            {isSuper && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#D4A72C] text-[#0B192C]">
                <Crown size={12} />
                Super Admin
              </span>
            )}
          </h1>
          <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider hidden sm:block">
            {isSuper
              ? `Inspecting: ${college.shortName} College • Overall University Central Administration`
              : `${college.name} • Office of the Controller of Examinations`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {isSuper && (
          <div className="hidden lg:flex items-center gap-1 bg-[#F8F5EE] p-1 rounded-2xl border border-slate-200">
            <span className="text-[9px] font-black uppercase text-slate-400 px-2 tracking-wider">
              INSPECT:
            </span>
            <button
              type="button"
              onClick={() => college.key !== "engineering" && setSuperAdminCollegeView("engineering")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                college.key === "engineering"
                  ? "bg-[#0B192C] text-[#D4A72C] shadow-sm"
                  : "text-slate-600 hover:text-[#0B192C] hover:bg-white"
              }`}
            >
              <span>⚙️</span>
              <span>Eng</span>
            </button>
            <button
              type="button"
              onClick={() => college.key !== "nursing" && setSuperAdminCollegeView("nursing")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                college.key === "nursing"
                  ? "bg-[#0284C7] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#0B192C] hover:bg-white"
              }`}
            >
              <span>🏥</span>
              <span>Nur</span>
            </button>
            <button
              type="button"
              onClick={() => college.key !== "pharmacy" && setSuperAdminCollegeView("pharmacy")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                college.key === "pharmacy"
                  ? "bg-[#059669] text-white shadow-sm"
                  : "text-slate-600 hover:text-[#0B192C] hover:bg-white"
              }`}
            >
              <span>💊</span>
              <span>Pharm</span>
            </button>
          </div>
        )}

        <button className="p-2 rounded-xl bg-[#F8F5EE] hover:bg-gray-200 text-[#0B192C] transition relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D4A72C]" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-[#E5E1D8]">
          <div className="text-right hidden md:block">
            <span className="block text-xs font-bold text-[#0B192C]">
              {isSuper ? SUPER_ADMIN_CONFIG.name : (currentUser?.name || college.coeTitle)}
            </span>
            <span className="block text-[10px] font-mono text-[#667085]">
              {isSuper ? SUPER_ADMIN_CONFIG.email : (currentUser?.email || college.email)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
