import React from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface FacultyBannerProps {
  collegeName: string;
  logoUrl: string;
  userName: string;
  username: string;
  onOpenMenu: () => void;
  /** Shown on every page except the dashboard. */
  onBack?: () => void;
}

/**
 * The faculty portal's top bar: the navy college card that used to open the dashboard (logo, "Office of Academic
 * Affairs" tag, college name, portal line), kept at the top of every page. The sidebar's logo block is the same
 * height (h-[7.5rem] on large screens) so the gold rule runs straight across.
 */
export const FacultyBanner: React.FC<FacultyBannerProps> = ({ collegeName, logoUrl, userName, username, onOpenMenu, onBack }) => (
  <header className="sticky top-0 z-30 bg-linear-to-r from-[#0B192C] via-[#0F223D] to-[#132A4A] text-white border-b-4 border-[#D4A72C] shadow-lg box-border min-h-[5.5rem] lg:h-[7.5rem]">
    <div className="flex h-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          onClick={onOpenMenu}
          className="lg:hidden p-1.5 sm:p-2 rounded-xl text-white hover:bg-white/10 transition shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#D4A72C]"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
        )}
        <img
          src={logoUrl}
          alt={collegeName}
          className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 rounded-full bg-white p-1 border-2 border-[#D4A72C] object-contain shadow-lg shrink-0"
        />
        <div className="min-w-0">
          <div className="hidden sm:inline-flex items-center gap-2 rounded-md bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#D4A72C]">
            <span>OFFICE OF ACADEMIC AFFAIRS · FACULTY PORTAL</span>
          </div>
          <h1 className="sm:mt-1.5 text-sm sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-snug">{collegeName}</h1>
          <p className="mt-0.5 hidden sm:block truncate text-xs lg:text-sm text-slate-300 font-semibold">
            Academic Course Administration, Continuous Internal Assessment &amp; Marks Portal
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <NotificationBell />
        <div className="hidden xl:block text-right pl-3 border-l border-white/20">
          <span className="block text-xs font-bold text-white whitespace-nowrap">{userName}</span>
          <span className="block text-[10px] font-mono text-white/60">{username}</span>
        </div>
      </div>
    </div>
  </header>
);
