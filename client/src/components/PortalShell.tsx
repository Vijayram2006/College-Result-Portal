import React, { useState } from "react";
import { ChevronRight, KeyRound, LogOut, UserRound, X, type LucideIcon } from "lucide-react";
import { FacultyBanner } from "./FacultyBanner";

/**
 * The frame every signed-in portal shares (faculty, HOD, student; the COE admin panel, the Associate Dean and the
 * admission cell use the same design): the navy sidebar with the workspace card and navigation, the navy college
 * banner with the gold rule, the page body and the footer.
 */

export interface PortalNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** A small count shown next to the label (e.g. papers waiting). */
  badge?: number;
}

interface PortalShellProps {
  navItems: PortalNavItem[];
  active: string;
  onNavigate: (key: string) => void;
  /** Sidebar: the college (or portal) line under "KVELL UNIVERSITY". */
  sidebarSubtitle: string;
  workspaceLabel: string;
  workspaceDetail?: string;
  userName: string;
  userSub: string;
  /** Banner: tag line, college name and the portal's description. */
  bannerTag: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerUser: string;
  bannerUserSub: string;
  onBellLink?: (link: string) => void;
  /** Staff can edit their profile and password; students sign in with their date of birth. */
  accountButtons?: boolean;
  onLogout: () => void;
  /** Extra items under the navigation (e.g. the link to the COE panel). */
  navFooter?: React.ReactNode;
  children: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  navItems,
  active,
  onNavigate,
  sidebarSubtitle,
  workspaceLabel,
  workspaceDetail,
  userName,
  userSub,
  bannerTag,
  bannerTitle,
  bannerSubtitle,
  bannerUser,
  bannerUserSub,
  onBellLink,
  accountButtons = true,
  onLogout,
  navFooter,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const go = (key: string) => {
    onNavigate(key);
    setSidebarOpen(false);
  };
  const firstKey = navItems[0]?.key;

  return (
    <div className="flex min-h-screen bg-[#F8F5EE] text-[#172033]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col bg-[#0B192C] text-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0 border-r border-[#D4A72C]/20 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-5 box-border h-[5.5rem] lg:h-[7.5rem] border-b-4 border-[#D4A72C]">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/kvell-logo.png"
              alt="KVELL UNIVERSITY"
              className="h-10 w-10 object-contain rounded-full bg-white p-0.5 border border-[#D4A72C]/40 shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black tracking-wide text-white uppercase">KVELL UNIVERSITY</p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-[#D4A72C] tracking-wider uppercase">{sidebarSubtitle}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-5">
          <div className="rounded-xl border border-[#D4A72C]/30 bg-white/5 p-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold text-[#D4A72C] uppercase tracking-wider">Authorized Workspace</span>
            </div>
            {workspaceDetail && <p className="mt-1.5 text-[11px] leading-4 font-semibold text-slate-300">{workspaceDetail}</p>}
          </div>
        </div>

        <nav className="portal-scrollbar mt-6 flex-1 overflow-y-auto px-3">
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#D4A72C]/80">{workspaceLabel}</p>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const on = item.key === active;
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition duration-150 ${
                    on ? "bg-[#D4A72C] text-[#0B192C] shadow-md font-black" : "text-slate-200 font-semibold hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={16} strokeWidth={on ? 2.5 : 1.8} className={on ? "text-[#0B192C]" : "text-[#D4A72C]"} />
                  <span>{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">{item.badge}</span>
                  )}
                  {on && !item.badge && <ChevronRight className="ml-auto text-[#0B192C]" size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
          {navFooter && <div className="mt-4 px-1">{navFooter}</div>}
        </nav>

        <div className="border-t border-white/10 p-4 bg-[#081220]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4A72C] text-xs font-black text-[#0B192C] shadow-sm">
              {(userName || "U")[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-white">{userName}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-[#D4A72C]">{userSub}</p>
            </div>
            {accountButtons && (
              <>
                <button
                  onClick={() => window.dispatchEvent(new Event("kvell:open-profile-edit"))}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-[#D4A72C] transition"
                  aria-label="Edit profile"
                  title="Edit profile"
                >
                  <UserRound size={16} />
                </button>
                <button
                  onClick={() => window.dispatchEvent(new Event("kvell:open-change-password"))}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-[#D4A72C] transition"
                  aria-label="Change password"
                  title="Change password"
                >
                  <KeyRound size={16} />
                </button>
              </>
            )}
            <button
              onClick={onLogout}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition"
              aria-label="Sign out"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#0B192C]/50 backdrop-blur-xs lg:hidden"
          aria-label="Close navigation overlay"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <FacultyBanner
          collegeName={bannerTitle}
          logoUrl="/kvell-logo.png"
          userName={bannerUser}
          username={bannerUserSub}
          tag={bannerTag}
          subtitle={bannerSubtitle}
          onBellLink={onBellLink}
          onOpenMenu={() => setSidebarOpen(true)}
          onBack={active !== firstKey ? () => go(firstKey) : undefined}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">{children}</div>
        </main>
        <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 px-4 text-center font-medium">
          <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Result Portal.</p>
          <p className="mt-1 opacity-80">
            Results shown online are provisional; the marksheet issued by the Controller of Examinations is the official record.
            Support: Office of the Controller of Examinations.
          </p>
          <p className="mt-1 space-x-3">
            <a className="underline" href="/privacy.html">Privacy policy</a>
            <a className="underline" href="/terms.html">Terms of use</a>
            <a className="underline" href="/status.html">System status</a>
          </p>
        </footer>
      </div>
    </div>
  );
};
