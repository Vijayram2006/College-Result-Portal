import React from "react";
import { Menu, ShieldCheck, Bell, Sparkles } from "lucide-react";
import { adminAuthApi } from "../services/api";
import { getActiveCollege } from "../utils/rbac";

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen, title }) => {
  const currentUser = adminAuthApi.getCurrentUser();
  const college = getActiveCollege();

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
          src="/kvell-logo.png"
          alt="KVELL Logo"
          className="w-10 h-10 rounded-full border border-[#D4A72C] p-0.5 object-cover shrink-0"
        />
        <div>
          <h1 className="font-display font-extrabold text-lg sm:text-xl text-[#0B192C]">
            {title}
          </h1>
          <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider hidden sm:block">
            KVELL UNIVERSITY • {college.shortName} • Examination Control & Result Administration
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Active College Badge (Hidden for Pharmacy and Nursing COE portals as requested) */}
        {college.key !== "pharmacy" && college.key !== "nursing" && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${college.badgeBg} ${college.badgeText}`}
          >
            <span>{college.icon}</span>
            <span>{college.shortName}</span>
          </div>
        )}

        <button className="p-2 rounded-xl bg-[#F8F5EE] hover:bg-gray-200 text-[#0B192C] transition relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D4A72C]" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-[#E5E1D8]">
          <div className="text-right hidden md:block">
            <span className="block text-xs font-bold text-[#0B192C]">
              {currentUser?.name || college.coeTitle}
            </span>
            <span className="block text-[10px] font-mono text-[#667085]">
              {currentUser?.email || college.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
