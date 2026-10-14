import React from "react";
import { Menu } from "lucide-react";
import { adminAuthApi } from "../services/api";
import { NotificationBell } from "./NotificationBell";
import { getActiveCollege } from "../utils/rbac";

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  title: string;
}

/** The college banner, kept at the top of every admin page while scrolling. */
export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen, title }) => {
  const currentUser = adminAuthApi.getCurrentUser();
  const college = getActiveCollege();

  return (
    <header className="sticky top-0 z-30 bg-[#0B192C] text-white border-b-4 border-[#D4A72C] shadow-lg box-border min-h-[6.75rem] lg:h-[6.75rem]">
      <div className="relative flex items-center justify-between gap-4 px-4 sm:px-8 py-3 h-full min-h-[6.5rem]">
        <div className="flex items-center gap-3 sm:gap-5 min-w-0 self-stretch">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-white hover:bg-white/10 transition shrink-0"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <img
            src={college.logoUrl || "/kvell-logo.png"}
            alt={college.name}
            className="h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full bg-white p-1 border-2 border-[#D4A72C] shrink-0 object-contain shadow-lg"
          />
          <div className="min-w-0">
            <span className="hidden sm:inline-block bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest mb-1">
              Office of the Controller of Examinations
            </span>
            {/* Scales with the free width (screen minus sidebar, logo, bell, user and Kyro) so the full name fits */}
            <h1 className="font-display text-sm sm:text-lg lg:text-[clamp(0.95rem,calc((100vw_-_60rem)/32),1.5rem)] xl:text-[clamp(0.95rem,calc((100vw_-_51rem)/30),2.25rem)] font-black leading-tight line-clamp-2">
              {college.name}
            </h1>
            <p className="text-[11px] sm:text-xs text-[#D4A72C] font-semibold mt-0.5 truncate">{title}</p>
          </div>
          {/* Kyro, the KVELL campus mascot, standing beside the college name */}
          <img
            src="/kyro-crossed.png"
            alt="Kyro, the KVELL campus mascot"
            className="hidden xl:block self-end -mb-3 h-[6.25rem] ml-2 w-auto shrink-0 object-contain object-bottom pointer-events-none select-none drop-shadow-xl"
          />
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <NotificationBell />
          <div className="hidden xl:block text-right pl-3 border-l border-white/20">
            <span className="block text-xs font-bold text-white">{currentUser?.name || college.coeTitle}</span>
            <span className="block text-[10px] font-mono text-white/60">{currentUser?.username || ""}</span>
          </div>
        </div>

      </div>
    </header>
  );
};
