import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  BookOpen,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
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
} from "lucide-react";
import { adminAuthApi } from "../services/api";

const kvellSealLogo = "/kvell-logo.png";

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const [location, navigate] = useLocation();
  const [resultsOpen, setResultsOpen] = useState(true);

  const currentUser = adminAuthApi.getCurrentUser();

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
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#0B192C] text-white flex flex-col justify-between border-r border-[#D4A72C]/20 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header & Branding */}
        <div>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={kvellSealLogo}
                alt="KVELL Seal"
                className="h-11 w-11 rounded-full bg-white p-0.5 border border-[#D4A72C]"
              />
              <div>
                <span className="font-display font-black text-sm tracking-tight text-white block">
                  KVELL UNIVERSITY
                </span>
                <span className="text-[10px] font-bold text-[#D4A72C] tracking-wider uppercase block">
                  Controller of Examination Panel
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

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)]">
            {/* Dashboard */}
            <Link
              href="/admin/dashboard"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive("/admin/dashboard")
                  ? "bg-[#D4A72C] text-[#0B192C] shadow-md"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard</span>
            </Link>



            {/* Results Management Section */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest px-3.5">
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
                    <span>Upload Results</span>
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
                    <CheckCircle2 size={14} />
                    <span>Validation</span>
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
                </div>
              )}
            </div>

            
            {/* Subject Management Section */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest px-3.5">
                Subject Management & Finalization
              </span>
            </div>

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
  

            {/* Analytics & Audit */}
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest px-3.5">
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
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#D4A72C]/10 border border-[#D4A72C]/30 text-[#D4A72C] hover:bg-[#D4A72C]/20 transition"
            >
              <div className="flex items-center gap-2.5">
                <Globe size={16} />
                <span>Main Portal (Port 3000)</span>
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
                ADM
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate">
                  {currentUser?.name || "Controller of Exams"}
                </span>
                <span className="block text-[9px] font-extrabold uppercase text-[#D4A72C] tracking-wider">
                  ROLE: CONTROLLER OF EXAMINATION
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
