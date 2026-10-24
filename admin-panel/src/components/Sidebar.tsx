import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  FileText,
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  BookOpen,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  PenLine,
  Send,
  Globe,
  BarChart3,
  ClipboardList,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  Crown,
  RotateCcw,
  ClipboardCheck,
  FileCheck,
  LayoutGrid,
} from "lucide-react";
import { adminAuthApi } from "../services/api";
import { getActiveCollege, isSuperAdmin, SUPER_ADMIN_CONFIG } from "../utils/rbac";
import { UNIVERSITY_BAR_HEIGHT } from "./Navbar";
import { safeLoadQuestionPapers } from "../data/questionPapersData";
import { refreshQuestionPapers } from "../services/questionPapersApi";

const kvellSealLogo = "/kvell-logo.png";

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const [location, navigate] = useLocation();
  const [resultsOpen, setResultsOpen] = useState(true);
  const [qpCounts, setQpCounts] = useState({ pendingCoe: 0, pendingChief: 0 });

  const currentUser = adminAuthApi.getCurrentUser();
  const college = getActiveCollege();
  const isSuper = isSuperAdmin(currentUser);

  React.useEffect(() => {
    const updateCounts = () => {
      const papers = safeLoadQuestionPapers();
      const pendingCoe = papers.filter((p) => p.status === "PENDING_COE_REVIEW").length;
      const pendingChief = papers.filter((p) => p.status === "PENDING_CHIEF_COE").length;
      setQpCounts({ pendingCoe, pendingChief });
    };
    updateCounts();
    void refreshQuestionPapers();
    window.addEventListener("kvell_qp_updated", updateCounts);
    window.addEventListener("storage", updateCounts);
    return () => {
      window.removeEventListener("kvell_qp_updated", updateCounts);
      window.removeEventListener("storage", updateCounts);
    };
  }, []);

  const handleLogout = () => {
    adminAuthApi.logout();
    navigate("/admin/login");
  };

  const isActive = (path: string) => location === path;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={isSuper ? { top: UNIVERSITY_BAR_HEIGHT } : undefined}
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0B192C] text-white flex flex-col justify-between border-r border-[#D4A72C]/20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header & Branding */}
        <div>
          {/* The Chief COE's KVELL branding sits in the full-width university bar instead; only the phone close button stays */}
          {isSuper ? (
            <div className="lg:hidden flex justify-end px-4 pt-3">
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-1" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
          ) : (
          /* Same height as the top bar (Navbar), so the gold rule runs straight across */
          <div className="px-4 h-[6.75rem] box-border border-b-4 border-[#D4A72C] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={kvellSealLogo}
                alt="KVELL UNIVERSITY"
                className="h-10 w-10 rounded-full bg-white p-0.5 border border-[#D4A72C] shrink-0 object-contain shadow-sm"
              />
              <div className="overflow-hidden">
                <span className="font-display font-black text-xs tracking-wide text-white block truncate uppercase" title="KVELL UNIVERSITY">
                  KVELL UNIVERSITY
                </span>
                <span className="text-[10px] font-extrabold text-[#D4A72C] tracking-wider uppercase block truncate">
                  {college.shortName || "COE Portal"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-white/60 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>
          )}

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* The Chief COE's home is the university console, shown as "Dashboard"; college COEs get their college dashboard */}
            <Link
              href={isSuper ? "/admin/super-admin" : "/admin/dashboard"}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive(isSuper ? "/admin/super-admin" : "/admin/dashboard")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard</span>
            </Link>



            {/* Results Management Section */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest px-3.5">
                Examination & Results
              </span>
            </div>

            <div>
              <button
                onClick={() => setResultsOpen(!resultsOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  location.startsWith("/admin/results")
                    ? "text-[#D4A72C] bg-white/5"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={17} />
                  <span>Results</span>
                </div>
                {resultsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>

              {resultsOpen && (
                <div className="ml-4 pl-3 border-l border-white/15 my-1 space-y-1">
                  <Link
                    href="/admin/results/upload"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/upload")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Upload size={14} />
                    <span>{isSuper ? "Student Data (View)" : "Student Data"}</span>
                  </Link>

                  <Link
                    href="/admin/results/validation"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/validation")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <PenLine size={14} />
                    <span>Marks (View)</span>
                  </Link>

                  <Link
                    href="/admin/results/internal-marks"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/internal-marks")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ClipboardCheck size={14} />
                    <span>Internal Marks (View)</span>
                  </Link>

                  <Link
                    href="/admin/results/answer-scripts"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/answer-scripts")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FileText size={14} />
                    <span>Answer Scripts</span>
                  </Link>

                  <Link
                    href="/admin/hall-allotment"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/hall-allotment")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <LayoutGrid size={14} />
                    <span>Hall Allotment</span>
                  </Link>

                  <Link
                    href="/admin/results/withheld"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/withheld")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ShieldAlert size={14} />
                    <span>Withheld Results</span>
                  </Link>

                  <Link
                    href="/admin/results/publish"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/publish")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Send size={14} />
                    <span>Publish Results</span>
                  </Link>

                  <Link
                    href="/admin/results/published"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/published")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Globe size={14} />
                    <span>Published Results</span>
                  </Link>

                  <Link
                    href="/admin/results/revaluation"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      isActive("/admin/results/revaluation")
                        ? "bg-[#D4A72C] text-[#0B192C] font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <RotateCcw size={14} />
                    <span>Revaluation Requests</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Question Papers Navigation Link */}
            <Link
              href="/admin/question-papers"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/question-papers")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md font-black"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileCheck size={17} />
                <span>Question Papers</span>
              </div>
              {(isSuper ? qpCounts.pendingChief : qpCounts.pendingCoe) > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive("/admin/question-papers")
                      ? "bg-[#0B192C] text-[#D4A72C]"
                      : "bg-[#D4A72C] text-[#0B192C]"
                  }`}
                >
                  {isSuper ? qpCounts.pendingChief : qpCounts.pendingCoe}
                </span>
              )}
            </Link>

            
            {/* Departments and subjects are managed by each college's COE; the Chief COE does not see them */}
            {!isSuper && (
            <>
            {/* Academic Structure Section */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest px-3.5">
                Academic Structure & Catalog
              </span>
            </div>

            <Link
              href="/admin/departments"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/departments")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Building2 size={17} />
              <span>Departments</span>
            </Link>

            <Link
              href="/admin/subjects"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/subjects")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BookOpen size={17} />
              <span>Subjects</span>
            </Link>
            </>
            )}

            {/* Faculty master: entered by each college's COE; the Chief COE views it */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest px-3.5">
                Faculty Detail
              </span>
            </div>

            <Link
              href="/admin/faculty-master"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/faculty-master")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserCheck size={17} />
              <span>{isSuper ? "Faculty Master (View)" : "Faculty Master"}</span>
            </Link>

            {/* Analytics & Audit */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/70 uppercase tracking-widest px-3.5">
                Governance & Reports
              </span>
            </div>

            <Link
              href="/admin/analytics"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/analytics")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <BarChart3 size={17} />
              <span>Analytics</span>
            </Link>

            <Link
              href="/admin/audit-logs"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/audit-logs")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ClipboardList size={17} />
              <span>Audit Logs</span>
            </Link>

            <Link
              href="/admin/profile"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/profile")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <User size={17} />
              <span>Profile</span>
            </Link>

            {/* Quick Switch to Main Portal */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-[#D4A72C] uppercase tracking-widest px-3.5">
                Connected App
              </span>
            </div>
            <a
              href={import.meta.env.VITE_MAIN_PORTAL_URL || "http://localhost:3000"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#D4A72C]/10 border border-[#D4A72C]/30 text-[#D4A72C] hover:bg-[#D4A72C]/20 transition"
            >
              <div className="flex items-center gap-2.5">
                <Globe size={16} />
                <span>Main Portal</span>
              </div>
              <Sparkles size={14} className="animate-pulse" />
            </a>
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#D4A72C]/20 border border-[#D4A72C] text-[#D4A72C] font-bold text-xs flex items-center justify-center shrink-0">
                {isSuper ? <Crown size={15} /> : college.code}
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate">
                  {currentUser?.name || (isSuper ? SUPER_ADMIN_CONFIG.name : college.coeTitle)}
                </span>
                <span className="block text-[9px] font-extrabold uppercase text-[#D4A72C] tracking-wider truncate">
                  {isSuper ? "Controller of Examinations" : `ROLE: ${currentUser?.role || college.role}`}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
