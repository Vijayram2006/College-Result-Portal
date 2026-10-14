import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { adminAuthApi } from "../services/api";
import { NotificationBell } from "./NotificationBell";
import { getActiveCollege } from "../utils/rbac";

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  title: string;
}

const MIN_NAME_PX = 14;
const MAX_NAME_PX = 36;

/**
 * Font size that fits the college name on one line in the space left between the logo and the bell / user block
 * (the user's name differs per account, so a screen-width formula is not enough). Below MIN_NAME_PX the name wraps.
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

/** The college banner, kept at the top of every admin page while scrolling. */
export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen, title }) => {
  const currentUser = adminAuthApi.getCurrentUser();
  const college = getActiveCollege();
  const name = useFittedNameSize(college.name);
  const wraps = name.size !== null && name.size <= MIN_NAME_PX;

  return (
    <header className="sticky top-0 z-30 bg-[#0B192C] text-white border-b-4 border-[#D4A72C] shadow-lg box-border min-h-[6.75rem] lg:h-[6.75rem]">
      <div className="relative flex items-center justify-between gap-4 px-4 sm:px-8 py-3 h-full min-h-[6.5rem]">
        <div className="flex flex-1 items-center gap-3 sm:gap-5 min-w-0 self-stretch">
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
          {/* The name is sized to fill this box on one line; Kyro stands right after it */}
          <div ref={name.box} className="relative flex flex-1 items-center min-w-0 self-stretch">
            <div className="min-w-0">
              <span className="hidden sm:inline-block bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded tracking-widest mb-1">
                Office of the Controller of Examinations
              </span>
              <h1
                className={`font-display font-black leading-tight ${wraps ? "line-clamp-2" : "whitespace-nowrap"}`}
                style={{ fontSize: name.size ? `${name.size}px` : undefined }}
              >
                {college.name}
              </h1>
              <p className="text-[11px] sm:text-xs text-[#D4A72C] font-semibold mt-0.5 truncate">{title}</p>
            </div>
            {/* Kyro, the KVELL campus mascot, standing beside the college name */}
            <img
              ref={name.kyro}
              onLoad={name.fit}
              src="/kyro-crossed.png"
              alt="Kyro, the KVELL campus mascot"
              className="hidden xl:block self-end -mb-3 h-[6.25rem] ml-3 w-auto shrink-0 object-contain object-bottom pointer-events-none select-none drop-shadow-xl"
            />
            {/* Invisible copy at 100px, used to measure how wide the name is (clipped so it never widens the page) */}
            <div aria-hidden className="absolute left-0 top-0 w-0 h-0 overflow-hidden invisible pointer-events-none">
              <span ref={name.probe} className="absolute font-display font-black whitespace-nowrap" style={{ fontSize: "100px" }}>
                {college.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <NotificationBell />
          <div className="hidden xl:block text-right pl-3 border-l border-white/20">
            <span className="block text-xs font-bold text-white whitespace-nowrap">{currentUser?.name || college.coeTitle}</span>
            <span className="block text-[10px] font-mono text-white/60">{currentUser?.username || ""}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
