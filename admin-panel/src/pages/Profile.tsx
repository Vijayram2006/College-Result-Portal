import React from "react";
import { User, ShieldCheck, Mail, Building, Key, Lock, Clock, LogOut } from "lucide-react";
import { adminAuthApi } from "../services/api";
import { useLocation } from "wouter";
import { getActiveCollege } from "../utils/rbac";

export const ProfilePage: React.FC = () => {
  const [, navigate] = useLocation();
  const college = getActiveCollege();
  const user = adminAuthApi.getCurrentUser() || {
    id: "ADM-001",
    username: "ADMIN",
    name: "Dr. Controller of Examinations",
    role: "ADMIN",
    email: "admin@kvell.edu.in",
  };

  const handleLogout = () => {
    adminAuthApi.logout();
    navigate("/admin/login");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white p-8 rounded-2xl border border-[#D4A72C]/30 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#D4A72C]/10 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-[#D4A72C] flex items-center justify-center text-[#D4A72C] text-3xl font-black shrink-0 shadow-md">
            {college.icon}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldCheck size={13} /> {user.role} ROLE AUTHORIZED
            </div>
            <h1 className="text-2xl font-black">{user.name}</h1>
            <p className="text-xs text-white/70">
              Office of the Controller of Examinations | {college.name}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Account Info */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[#0B192C] border-b pb-3 flex items-center gap-2">
            <User size={18} className="text-[#D4A72C]" /> Administrative Profile
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Admin Account ID:</span>
              <span className="font-mono font-bold text-[#0B192C]">{user.id}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Username:</span>
              <span className="font-bold text-[#0B192C]">{user.username}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Institutional Entity:</span>
              <span className="font-bold text-[#0B192C]">{college.name}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
              <span className="text-gray-500 font-semibold">Official Email:</span>
              <span className="font-bold text-[#0B192C]">{user.email || "admin@kvell.edu.in"}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
              <span className="text-gray-500 font-semibold">RBAC Jurisdiction:</span>
              <span className="font-bold text-[#0B192C]">{college.shortName} Domain (Scoped Access)</span>
            </div>
          </div>
        </div>

        {/* Security & System Privilege */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[#0B192C] border-b pb-3 flex items-center gap-2">
            <Lock size={18} className="text-[#2E7D5B]" /> Security & Privileges
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-3">
              <ShieldCheck className="text-[#2E7D5B] shrink-0" size={20} />
              <div>
                <span className="font-bold text-[#2E7D5B] block">Result Publishing Right</span>
                <span className="text-gray-600 text-[11px] block">
                  Authorized to push validated scorecards to live Student Portal.
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center gap-3">
              <Key className="text-[#C98A18] shrink-0" size={20} />
              <div>
                <span className="font-bold text-[#C98A18] block">API Bearer JWT Token Active</span>
                <span className="text-gray-600 text-[11px] block">
                  Session secured with standard HTTP Bearer headers.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-md"
              >
                <LogOut size={16} /> Sign Out of Admin Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
