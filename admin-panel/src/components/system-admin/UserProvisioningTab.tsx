import React, { useEffect, useState } from "react";
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
  Eye,
  EyeOff,
  Smartphone,
} from "lucide-react";
import { OfficerUser } from "./types";
import { superAdminApi, apiErrorMessage } from "../../services/api";

/** An eye button inside a password box that shows or hides what was typed. */
const RevealButton: React.FC<{ shown: boolean; onToggle: () => void }> = ({ shown, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? "Hide password" : "Show password"}
    title={shown ? "Hide password" : "Show password"}
    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0B192C]"
  >
    {shown ? <EyeOff size={15} /> : <Eye size={15} />}
  </button>
);

/**
 * For a chosen college: the college COE, a Deputy COE, the Associate Dean or Dean (question paper review, approval
 * of forwarded marks, read-only results); "All colleges" makes a Super Admin.
 */
type OfficerKind = "COE" | "DEPUTY_COE" | "ASSOCIATE_DEAN" | "DEAN" | "ADMISSION_OFFICER";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Chief COE (Super Admin)",
  COE_ENGINEERING: "COE · Engineering",
  COE_NURSING: "COE · Nursing",
  COE_PHARMACY: "COE · Pharmacy",
  DEPUTY_COE: "Deputy COE",
  ASSOCIATE_DEAN: "Associate Dean",
  DEAN: "Dean",
  ADMISSION_OFFICER: "Admission Officer",
};

export const UserProvisioningTab: React.FC = () => {
  const [officers, setOfficers] = useState<OfficerUser[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const [newKind, setNewKind] = useState<OfficerKind>("COE");
  const [startPassword, setStartPassword] = useState("");
  const [showStartPassword, setShowStartPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetModalUser, setResetModalUser] = useState<OfficerUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Officer accounts are real server accounts (college COEs, deputies and Super Admins)
  const loadOfficers = () => {
    superAdminApi
      .officers()
      .then((list) => {
        setOfficers(list as OfficerUser[]);
        setLoadError(null);
      })
      .catch((err) => setLoadError(apiErrorMessage(err, "Could not load the officer accounts.")));
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleToggleStatus = async (id: string) => {
    const target = officers.find((o) => o.id === id);
    if (!target) return;
    const next = target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (next === "SUSPENDED" && !window.confirm(`Suspend ${target.username}? They are signed out at once and cannot sign in.`)) return;
    try {
      await superAdminApi.setStatus(id, next);
      loadOfficers();
      showToast(`${target.username} is now ${next === "ACTIVE" ? "active" : "suspended"}`);
    } catch (err) {
      alert(apiErrorMessage(err, "Could not change the account status."));
    }
  };

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username) {
      alert("Please enter the name and username.");
      return;
    }
    const college = newUser.collegeKey || "engineering";
    const role =
      college === "all" ? "SUPER_ADMIN" : newKind === "COE" ? `COE_${String(college).toUpperCase()}` : newKind;
    setBusy(true);
    try {
      const created = await superAdminApi.createOfficer({
        name: newUser.name.trim(),
        username: newUser.username.trim(),
        email: (newUser.email || "").trim(),
        role,
        collegeKey: college,
        password: startPassword,
      });
      setShowAddModal(false);
      setNewUser({ name: "", username: "", email: "", role: "COE_ENGINEERING", collegeKey: "engineering", status: "ACTIVE" });
      setNewKind("COE");
      setStartPassword("");
      loadOfficers();
      showToast(`Created ${created.username}. They must choose their own password at first sign-in.`);
    } catch (err) {
      alert(apiErrorMessage(err, "Could not create the officer account."));
    }
    setBusy(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    try {
      await superAdminApi.resetPassword(resetModalUser.id, newPassword);
      showToast(`New starting password set for ${resetModalUser.username}; they must change it at next sign-in`);
      setResetModalUser(null);
      setNewPassword("");
      loadOfficers();
    } catch (err) {
      alert(apiErrorMessage(err, "Could not reset the password."));
    }
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
            <span>Provision New Officer Account</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold">{loadError}</div>
      )}

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
                      <span className="font-bold text-[#0B192C] block">{ROLE_LABEL[user.role] ?? user.role}</span>
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

                        {user.mfaEnabled && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Reset two-step sign-in for ${user.username}?\n\nUse this when they lost their phone. They set it up again at their next sign-in, and their open sessions end.`)) return;
                              try {
                                await superAdminApi.resetMfa(user.id);
                                showToast(`Two-step sign-in reset for ${user.username}`);
                                loadOfficers();
                              } catch (err) {
                                alert(apiErrorMessage(err, "Two-step sign-in could not be reset."));
                              }
                            }}
                            title="Reset two-step sign-in (lost phone)"
                            aria-label={`Reset two-step sign-in for ${user.username}`}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-amber-100 transition"
                          >
                            <Smartphone size={14} />
                          </button>
                        )}

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Role</label>
                  <select
                    value={newUser.collegeKey === "all" ? "SUPER" : newKind}
                    disabled={newUser.collegeKey === "all"}
                    onChange={(e) => setNewKind(e.target.value as OfficerKind)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C] disabled:bg-slate-50"
                  >
                    {newUser.collegeKey === "all" ? (
                      <option value="SUPER">Super Admin (all colleges)</option>
                    ) : (
                      <>
                        <option value="COE">Controller of Examinations</option>
                        <option value="DEPUTY_COE">Deputy COE</option>
                        <option value="ASSOCIATE_DEAN">Associate Dean</option>
                        <option value="DEAN">Dean</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Starting Password</label>
                  <div className="relative">
                    <input
                      type={showStartPassword ? "text" : "password"}
                      required
                      minLength={10}
                      aria-label="Starting password"
                      placeholder="10+ letters and digits"
                      value={startPassword}
                      onChange={(e) => setStartPassword(e.target.value)}
                      className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                    />
                    <RevealButton shown={showStartPassword} onToggle={() => setShowStartPassword((v) => !v)} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 -mt-1">The officer must replace the starting password at first sign-in.</p>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. coe.deputy@kvell.edu.in (optional)"
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
                  disabled={busy}
                  className="px-5 py-2 rounded-xl bg-[#0B192C] hover:bg-[#152744] disabled:opacity-60 text-[#D4A72C] font-extrabold text-xs shadow-md"
                >
                  {busy ? "Creating..." : "Provision Account"}
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
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    aria-label="New password"
                    placeholder="10+ characters, letters and digits"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-xs text-[#0B192C] focus:outline-none focus:border-[#0B192C]"
                  />
                  <RevealButton shown={showNewPassword} onToggle={() => setShowNewPassword((v) => !v)} />
                </div>
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
