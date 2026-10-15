import React from "react";
import { SystemAdminControlHub } from "../components/system-admin/SystemAdminControlHub";
import { isSuperAdmin } from "../utils/rbac";

export const SuperAdminControlPage: React.FC = () => {
  // College COEs can reach this URL (bookmark, or another account signed in on the same browser); the server refuses their calls
  if (!isSuperAdmin()) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-2xl border border-[#E5DCC8] bg-white p-6 text-center">
        <h2 className="text-lg font-bold text-[#0B192C]">Chief COE access only</h2>
        <p className="mt-2 text-sm text-slate-600">
          This console is for the Chief COE (Super Admin). You are signed in as a college COE. Sign out and sign in as
          the Chief COE to open it.
        </p>
        <a href="/admin/dashboard" className="mt-4 inline-block rounded-lg bg-[#0B192C] px-4 py-2 text-sm font-semibold text-white">
          Go to dashboard
        </a>
      </div>
    );
  }
  return <SystemAdminControlHub />;
};

export default SuperAdminControlPage;
