import React from "react";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "";
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || "";

/** Support contact, the result disclaimer and the policy links, at the foot of every COE panel page. */
export const SiteFooter: React.FC = () => (
  <footer className="border-t border-[#E5E1D8] bg-white px-4 sm:px-8 py-4 text-[11px] text-slate-600 space-y-1.5">
    <p>
      <b>Support:</b> Office of the Controller of Examinations, KVELL University
      {SUPPORT_EMAIL && <> · <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></>}
      {SUPPORT_PHONE && <> · {SUPPORT_PHONE}</>}
    </p>
    <p>
      <b>Disclaimer:</b> results shown online are provisional. The marksheet issued by the Controller of Examinations is
      the official record.
    </p>
    <nav aria-label="Policies" className="flex flex-wrap gap-x-4 gap-y-1">
      <a className="underline" href="/privacy.html">Privacy policy</a>
      <a className="underline" href="/terms.html">Terms of use</a>
      <a className="underline" href="/status.html">System status</a>
      <span>© {new Date().getFullYear()} KVELL University</span>
    </nav>
  </footer>
);
