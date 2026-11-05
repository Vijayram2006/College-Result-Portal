import React, { useEffect, useState } from "react";
import { BarChart3, CalendarCheck2, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { apiClient, authApi } from "../services/api";
import { LeaveInbox } from "./erp/ErpViews";

/**
 * Dean portal (first version). The Dean gives the final approval of the HODs' leave, after the Associate Dean has
 * recommended it. The rest of the portal is a placeholder: it is designed once the Dean's requirements and data
 * are received.
 */
type Nav = "dashboard" | "leave";

const PLANNED: [string, string, React.ElementType][] = [
  ["College overview", "Departments, staff and student strength at a glance.", GraduationCap],
  ["Results & pass percentage", "Semester results of every department, compared year on year.", BarChart3],
  ["Faculty performance", "Scorecards of the college with the Associate Dean's remarks.", Users],
  ["Reports & circulars", "Monthly reports from the HODs and the Dean's circulars.", ClipboardList],
];

export function DeanPortal({ onLogout }: { onLogout: () => void }) {
  const me = authApi.currentUser();
  const [nav, setNav] = useState<Nav>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ waiting: number; approved: number; rejected: number } | null>(null);

  useEffect(() => {
    apiClient.get<{ status: string; approverRole: string }[]>("/erp/leave/inbox")
      .then((r) => setCounts({
        waiting: r.data.filter((l) => l.status === "PENDING" && l.approverRole === "DEAN").length,
        approved: r.data.filter((l) => l.status === "APPROVED").length,
        rejected: r.data.filter((l) => l.status === "REJECTED").length,
      }))
      .catch(() => setCounts(null));
  }, [nav]);

  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 4000); };
  const items: [Nav, string, React.ElementType][] = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["leave", "HOD Leave Approvals", CalendarCheck2],
  ];

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex">
      <aside className={`${menuOpen ? "fixed inset-0 z-40 w-72" : "hidden"} md:static md:block md:w-64 bg-[#0B192C] text-white flex-shrink-0`}>
        <div className="h-20 px-5 flex items-center justify-between border-b border-white/10">
          <div>
            <div className="text-[#D4A72C] font-black tracking-wide">DEAN PORTAL</div>
            <div className="text-[11px] text-white/60">{me?.collegeName || "KVELL University"}</div>
          </div>
          <button className="md:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <nav className="p-3 space-y-1">
          {items.map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setNav(key); setMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left ${nav === key ? "bg-[#D4A72C] text-[#0B192C]" : "text-white/80 hover:bg-white/10"}`}>
              <Icon size={15} /><span className="flex-1">{label}</span>
              {key === "leave" && counts && counts.waiting > 0 && <span className="text-[10px] bg-red-600 text-white rounded-full px-1.5">{counts.waiting}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 mt-4 border-t border-white/10">
          <div className="px-2 text-xs font-bold">{me?.name || "Dean"}</div>
          <div className="px-2 text-[10px] text-white/50 mb-3">{me?.username}</div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:bg-white/10"><LogOut size={15} /> Sign out</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center gap-3">
          <button className="md:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div>
            <div className="text-lg font-black text-[#0B192C]">{nav === "dashboard" ? "Dashboard" : "HOD Leave Approvals"}</div>
            <div className="text-[11px] text-slate-500">Dean · {me?.collegeName || ""}</div>
          </div>
        </header>
        <div className="p-4 md:p-8 space-y-6 max-w-6xl">
          {nav === "dashboard" && (
            <>
              <div className="bg-[#0B192C] rounded-3xl p-6 text-white">
                <div className="text-[10px] font-black tracking-widest text-[#D4A72C]">WELCOME</div>
                <h1 className="text-2xl font-black mt-1">{me?.name || "Dean"}</h1>
                <p className="text-sm text-white/70 mt-1 max-w-2xl">You give the final approval of the HODs' leave, after the Associate Dean has recommended it.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {([["Waiting for you", counts?.waiting, "text-amber-700"], ["Approved", counts?.approved, "text-emerald-700"], ["Rejected", counts?.rejected, "text-red-700"]] as const).map(([label, v, color]) => (
                  <button key={label} onClick={() => setNav("leave")} className="text-left bg-white rounded-3xl border border-slate-200 shadow-sm px-5 py-4 hover:border-[#D4A72C]">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">HOD leave · {label}</span>
                    <span className={`text-3xl font-black ${color}`}>{v ?? "—"}</span>
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-6 space-y-4">
                <div>
                  <h2 className="text-sm font-black text-[#0B192C]">More of the Dean portal is coming</h2>
                  <p className="text-xs text-slate-500 mt-1">These sections will be designed once the Dean's requirements and data are received. They are placeholders for now.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PLANNED.map(([title, text, Icon]) => (
                    <div key={title} className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 opacity-80">
                      <Icon size={18} className="text-slate-400 mt-0.5" />
                      <div>
                        <div className="text-sm font-bold text-slate-700">{title} <span className="ml-1 text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">Planned</span></div>
                        <div className="text-xs text-slate-500">{text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {nav === "leave" && (
            <LeaveInbox title="HOD leave approvals" detail="HODs' leave recommended by the Associate Dean. You give the final approval or reject it with a reason; the HOD is notified. Approved leave can be printed as the official leave form." onToast={showToast} />
          )}
        </div>
      </main>
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-[#0B192C] text-white text-sm font-semibold rounded-2xl px-5 py-3 shadow-lg">{toast}</div>}
    </div>
  );
}
