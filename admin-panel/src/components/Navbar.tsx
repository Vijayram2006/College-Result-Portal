import React from "react";
import { Menu, ShieldCheck, Bell, Sparkles } from "lucide-react";
import { adminAuthApi } from "../services/api";
import { NotificationBell } from "./NotificationBell";
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
          src={college.logoUrl || "/kvell-logo.png"}
          alt={college.name}
          className="w-10 h-10 rounded-full border border-[#D4A72C] p-0.5 object-contain bg-white shrink-0"
        />
        <div>
          <h1 className="font-display font-extrabold text-lg sm:text-xl text-[#0B192C]">
            {title}
          </h1>
          <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider hidden sm:block">
            {college.name} • Office of the Controller of Examinations
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">


        <NotificationBell />

        <div className="flex items-center gap-3 pl-3 border-l border-[#E5E1D8]">
          <div className="text-right hidden md:block">
            <span className="block text-xs font-bold text-[#0B192C]">
              {currentUser?.name || college.coeTitle}
            </span>
            <span className="block text-[10px] font-mono text-[#667085]">
              {currentUser?.username || ""}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
