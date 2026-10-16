import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const MIN_NAME_PX = 13;
const MAX_NAME_PX = 36;

/** Height of the banner; the sidebar's logo block uses the same height so the gold rule runs straight across. */
export const FACULTY_BANNER_HEIGHT = "6.75rem";

/**
 * Font size that fits the college name on one line between the logo and the bell / user block (same rule as the COE
 * portal's banner). Below MIN_NAME_PX the name wraps onto as many lines as it needs (phones), so it is never cut off.
 */
function useFittedNameSize(text: string) {
  const box = useRef<HTMLDivElement>(null);
  const kyro = useRef<HTMLImageElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);

  const fit = useCallback(() => {
    if (!box.current || !probe.current) return;
    const kyroWidth = kyro.current && kyro.current.offsetWidth > 0 ? kyro.current.offsetWidth + 12 : 0;
    const available = box.current.clientWidth - kyroWidth;
    const widthAt100 = probe.current.offsetWidth; // the probe renders the name at 100px
    if (available <= 0 || widthAt100 <= 0) return;
    const fitted = Math.floor((available / widthAt100) * 100 * 0.98);
    setSize(Math.max(MIN_NAME_PX, Math.min(MAX_NAME_PX, fitted)));
  }, []);

  useLayoutEffect(() => {
    fit();
    const observer = new ResizeObserver(fit);
    if (box.current) observer.observe(box.current);
    document.fonts?.ready.then(fit).catch(() => undefined);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [fit, text]);

  return { box, kyro, probe, size, fit };
}

interface FacultyBannerProps {
  collegeName: string;
  logoUrl: string;
  pageTitle: string;
  userName: string;
  username: string;
  onOpenMenu: () => void;
  /** Shown on every page except the dashboard. */
  onBack?: () => void;
}

/** The faculty portal's top bar, in the COE portal's style: navy band, college logo and name, Kyro, gold rule. */
export const FacultyBanner: React.FC<FacultyBannerProps> = ({ collegeName, logoUrl, pageTitle, userName, username, onOpenMenu, onBack }) => {
  const name = useFittedNameSize(collegeName);
  const wraps = name.size !== null && name.size <= MIN_NAME_PX;

  return (
    <header
      className="sticky top-0 z-30 bg-[#0B192C] text-white border-b-4 border-[#D4A72C] shadow-lg box-border lg:h-[6.75rem]"
      style={{ minHeight: FACULTY_BANNER_HEIGHT }}
    >
      <div className="relative flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-8 py-3 h-full min-h-[6.5rem]">
        <div className="flex flex-1 items-center gap-2 sm:gap-5 min-w-0 self-stretch">
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
            className="h-12 w-12 sm:h-[4.5rem] sm:w-[4.5rem] rounded-full bg-white p-1 border-2 border-[#D4A72C] shrink-0 object-contain shadow-lg"
          />
          {/* The name is sized to fill this box on one line; Kyro stands right after it */}
          <div ref={name.box} className="relative flex flex-1 items-center min-w-0 self-stretch">
            <div className="min-w-0">
              <span className="hidden sm:inline-flex items-center gap-1 bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest mb-1">
                Faculty Portal
              </span>
              <h1
                className={`font-display font-black ${wraps ? "leading-snug" : "leading-tight whitespace-nowrap"}`}
                style={{ fontSize: name.size ? `${name.size}px` : undefined }}
              >
                {collegeName}
              </h1>
              <p className="text-[11px] sm:text-xs text-[#D4A72C] font-semibold mt-0.5 truncate">{pageTitle}</p>
            </div>
            {/* Kyro, the KVELL campus mascot, standing beside the college name */}
            <img
              ref={name.kyro}
              onLoad={name.fit}
              src="/kyro-crossed.png"
              alt="Kyro, the KVELL campus mascot"
              className="block self-end -mb-3 h-16 sm:h-20 xl:h-[6.25rem] ml-1.5 sm:ml-3 w-auto shrink-0 object-contain object-bottom pointer-events-none select-none drop-shadow-xl"
            />
            {/* Invisible copy at 100px, used to measure how wide the name is (clipped so it never widens the page) */}
            <div aria-hidden className="absolute left-0 top-0 w-0 h-0 overflow-hidden invisible pointer-events-none">
              <span ref={name.probe} className="absolute font-display font-black whitespace-nowrap" style={{ fontSize: "100px" }}>
                {collegeName}
              </span>
            </div>
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
};
