import React, { useState } from "react";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Trash2,
  Edit2,
  Check,
  X,
  Crown,
  Search,
  Lock,
  Unlock,
  AlertCircle,
  Building2,
} from "lucide-react";
import { OfficerUser } from "./types";
import { getRealLocalTimestamp } from "../../utils/dateUtils";

const INITIAL_OFFICERS: OfficerUser[] = [
  {
    id: "ADM-SUPER-001",
    name: "Dr. Sathish",
    username: "Sathish",
    email: "coe.sathish@kvell.edu.in",
    role: "SUPER_ADMIN",
    collegeKey: "all",
    status: "ACTIVE",
    lastLogin: "Active Now (Current Session)",
    departmentScope: "Central University - All Faculties",
  },
  {
    id: "ADM-ENG-001",
    name: "Dr. Controller of Examinations (Engineering)",
    username: "ADMIN",
    email: "coe.engineering@kvell.edu.in",
    role: "COE_ENGINEERING",
    collegeKey: "engineering",
    status: "ACTIVE",
    lastLogin: "10 mins ago",
    departmentScope: "Engineering, Tech & Computer Applications",
  },
  {
    id: "ADM-NUR-001",
    name: "Dr. Controller of Examinations (Nursing)",
    username: "COE_NURSING",
    email: "coe.nursing@kvell.edu.in",
    role: "COE_NURSING",
    collegeKey: "nursing",
    status: "ACTIVE",
    lastLogin: "1 hour ago",
    departmentScope: "Nursing & Clinical Sciences",
  },
  {
    id: "ADM-PHARM-001",
    name: "Dr. Controller of Examinations (Pharmacy)",
    username: "COE_PHARMACY",
    email: "coe.pharmacy@kvell.edu.in",
    role: "COE_PHARMACY",
    collegeKey: "pharmacy",
    status: "ACTIVE",
    lastLogin: "Yesterday, 17:30",
    departmentScope: "Pharmaceutical Sciences & Research",
  },
];

const OFFICERS_STORAGE_KEY = "kvell_officer_users";

export const UserProvisioningTab: React.FC = () => {
  const [officers, setOfficers] = useState<OfficerUser[]>(() => {
    try {
      const raw = localStorage.getItem(OFFICERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_OFFICERS;
    } catch {
      return INITIAL_OFFICERS;
    }
  });

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<OfficerUser>>({
    name: "",
    username: "",
    email: "",
    role: "COE_ENGINEERING",
    collegeKey: "engineering",
    status: "ACTIVE",
  });
  const [resetModalUser, setResetModalUser] = useState<OfficerUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const saveOfficers = (list: OfficerUser[]) => {
    setOfficers(list);
    localStorage.setItem(OFFICERS_STORAGE_KEY, JSON.stringify(list));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleStatus = (id: string) => {
    const target = officers.find((o) => o.id === id);
    if (target?.role === "SUPER_ADMIN") {
      alert("Cannot suspend the Primary Super Administrator account.");
      return;
    }
    const updated = officers.map((u) =>
      u.id === id ? { ...u, status: u.status === "ACTIVE" ? ("SUSPENDED" as const) : ("ACTIVE" as const) } : u
    );
    saveOfficers(updated);
    showToast(`Account status updated successfully`);
  };

  const handleCreateOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username || !newUser.email) {
      alert("Please enter Name, Username and Email.");
      return;
    }

    const created: OfficerUser = {
      id: `ADM-OFFICER-${Date.now().toString().slice(-4)}`,
      name: newUser.name,
      username: newUser.username.trim(),
      email: newUser.email.trim(),
      role: newUser.role as any,
      collegeKey: newUser.collegeKey as any,
      status: "ACTIVE",
      lastLogin: "Never",
      departmentScope: `${newUser.collegeKey?.toUpperCase()} Faculty`,
      customPassword: (newUser as any).customPassword || "admin123",
    } as any;

    saveOfficers([...officers, created]);
    setShowAddModal(false);
    setNewUser({ name: "", username: "", email: "", role: "COE_ENGINEERING", collegeKey: "engineering", status: "ACTIVE" });
    showToast(`Created officer account for ${created.name}`);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (resetModalUser) {
      const updated = officers.map((u) =>
        u.id === resetModalUser.id ? ({ ...u, customPassword: newPassword } as any) : u
      );
      saveOfficers(updated);
    }
    showToast(`Password successfully reset for ${resetModalUser?.username}`);
    setResetModalUser(null);
    setNewPassword("");
  };

  const filtered = officers.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.username.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#0B192C]">
            University Examination Officers & COE Account Provisioning
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Administrator account provisioning for College Controllers, Deputies, and Chief Examination Superintendents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs flex items-center gap-2 shadow-md transition"
          >
            <UserPlus size={16} />
            <span>Provision New COE Account</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <ShieldCheck size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by officer name, username, email, or role..."
            className="w-full pl-11 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
          />
        </div>
      </div>

      {/* Officers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B192C] text-white text-[10px] uppercase tracking-wider font-extrabold">
              <tr>
                <th className="py-3.5 px-5">Officer Details</th>
                <th className="py-3.5 px-5">Role & College Scope</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Last Activity</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((user) => {
                const isSuper = user.role === "SUPER_ADMIN";
                return (
                  <tr key={user.id} className="hover:bg-[#F8F5EE]/40 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            isSuper
                              ? "bg-[#D4A72C] text-[#0B192C] border-2 border-[#0B192C] shadow-sm"
                              : "bg-slate-100 text-[#0B192C]"
                          }`}
                        >
                          {isSuper ? <Crown size={16} /> : user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-extrabold text-[#0B192C] block flex items-center gap-1.5">
                            {user.name}
                            {isSuper && (
                              <span className="text-[9px] bg-[#D4A72C] text-[#0B192C] font-black px-1.5 py-0.2 rounded uppercase">
                                Chief Controller
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            ID: {user.username} • {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <span className="font-bold text-[#0B192C] block">{user.role}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">{user.departmentScope}</span>
                    </td>

                    <td className="py-4 px-5">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase inline-block ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-slate-500 text-[11px] font-mono">
                      {user.lastLogin}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setResetModalUser(user)}
                          title="Reset Password"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#D4A72C]/20 hover:text-[#0B192C] transition"
                        >
                          <KeyRound size={14} />
                        </button>

                        {!isSuper && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user.id)}
                            title={user.status === "ACTIVE" ? "Suspend Account" : "Activate Account"}
                            className={`p-1.5 rounded-lg transition ${
                              user.status === "ACTIVE"
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {user.status === "ACTIVE" ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Officer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-[#0B192C]">Provision Examination Officer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Full Name & Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. K. Ramanathan, Deputy COE"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Username / ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COE_DEPUTY"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Assigned College
                  </label>
                  <select
                    value={newUser.collegeKey}
                    onChange={(e) => setNewUser({ ...newUser, collegeKey: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  >
                    <option value="engineering">Engineering</option>
                    <option value="nursing">Nursing</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="all">All Constituent Colleges</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. coe.deputy@kvell.edu.in"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs shadow-md"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-[#0B192C]">
                Reset Password for {resetModalUser.username}
              </h3>
              <button onClick={() => setResetModalUser(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500">
                Enter a new temporary or permanent password for <strong>{resetModalUser.name}</strong>.
              </p>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-extrabold text-xs shadow-md"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
