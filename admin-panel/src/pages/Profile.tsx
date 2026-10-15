import React, { useEffect, useState } from "react";
import { User, ShieldCheck, Key, Lock, LogOut, Pencil, Save, X } from "lucide-react";
import { adminAuthApi, apiErrorMessage, StaffProfile } from "../services/api";
import { useLocation } from "wouter";
import { getActiveCollege, isSuperAdmin } from "../utils/rbac";
import { OPEN_PASSWORD_CHANGE } from "../components/PasswordChange";

const emptyForm = { name: "", email: "", phone: "", designation: "" };

export const ProfilePage: React.FC = () => {
  const [, navigate] = useLocation();
  const college = getActiveCollege();
  const isSuper = isSuperAdmin();
  const stored = adminAuthApi.getCurrentUser();

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    adminAuthApi
      .getProfile()
      .then(setProfile)
      .catch((err) => setMessage({ type: "error", text: apiErrorMessage(err, "Could not load your profile.") }));
  }, []);

  const startEdit = () => {
    if (!profile) return;
    setForm({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      designation: profile.designation || "",
    });
    setMessage(null);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const saved = await adminAuthApi.updateProfile(form);
      setProfile(saved);
      setEditing(false);
      setMessage({ type: "success", text: "Profile saved." });
      // The sidebar and top bar read the stored name; refresh them
      window.dispatchEvent(new Event("kvell_profile_updated"));
    } catch (err) {
      setMessage({ type: "error", text: apiErrorMessage(err, "Could not save your profile.") });
    }
    setSaving(false);
  };

  const handleLogout = () => {
    adminAuthApi.logout();
    navigate("/admin/login");
  };

  const roleLabel = isSuper ? "Controller of Examinations · KVELL University" : `Controller of Examinations · ${college.shortName}`;
  const displayName = profile?.name || stored?.name || "";
  const rows: [string, string][] = [
    ["Username", profile?.username || stored?.username || ""],
    ["Role", roleLabel],
    ["Institution", profile?.collegeName || college.name],
    ["Designation", profile?.designation || "Not recorded"],
    ["Official Email", profile?.email || "Not recorded"],
    ["Phone", profile?.phone || "Not recorded"],
    ["Last Sign-in", profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString("en-IN") : "—"],
  ];

  const input =
    "w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-[#0B192C] focus:outline-none focus:ring-2 focus:ring-[#D4A72C]";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0B192C] text-white p-8 rounded-2xl border border-[#D4A72C]/30 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-[#D4A72C]/10 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <img
            src={isSuper ? "/kvell-logo.png" : college.logoUrl}
            alt=""
            className="w-20 h-20 rounded-2xl bg-white p-1.5 border-2 border-[#D4A72C] object-contain shrink-0 shadow-md"
          />
          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A72C] text-[#0B192C] text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldCheck size={13} /> {roleLabel}
            </div>
            <h1 className="text-2xl font-black">{displayName}</h1>
            <p className="text-xs text-white/70">
              {profile?.designation ? `${profile.designation} · ` : ""}
              {profile?.collegeName || college.name}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold border ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrative Profile: view or edit */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base text-[#0B192C] flex items-center gap-2">
              <User size={18} className="text-[#D4A72C]" /> Administrative Profile
            </h3>
            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                disabled={!profile}
                className="px-3 py-1.5 rounded-lg bg-[#0B192C] hover:bg-[#152744] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Pencil size={13} className="text-[#D4A72C]" /> Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={save} className="space-y-3 text-xs">
              <label className="block">
                <span className="font-semibold text-gray-600">Full Name *</span>
                <input className={input} value={form.name} maxLength={100} required
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="font-semibold text-gray-600">Designation</span>
                <input className={input} value={form.designation} maxLength={80} placeholder="e.g. Controller of Examinations"
                  onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </label>
              <label className="block">
                <span className="font-semibold text-gray-600">Official Email</span>
                <input className={input} type="email" value={form.email} maxLength={120} placeholder="name@college.edu.in"
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="block">
                <span className="font-semibold text-gray-600">Phone</span>
                <input className={input} type="tel" value={form.phone} maxLength={20} placeholder="+91 98765 43210"
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <p className="text-[11px] text-gray-500">Username, role and institution are fixed and cannot be changed here.</p>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1.5">
                  <X size={14} /> Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2E7D5B] hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 disabled:opacity-60">
                  <Save size={14} /> {saving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-xs">
              {rows.map(([label, value]) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center gap-3">
                  <span className="text-gray-500 font-semibold shrink-0">{label}:</span>
                  <span className="font-bold text-[#0B192C] text-right break-all">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-[#0B192C] border-b pb-3 flex items-center gap-2">
            <Lock size={18} className="text-[#2E7D5B]" /> Security
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center gap-3">
              <Key className="text-[#C98A18] shrink-0" size={20} />
              <div>
                <span className="font-bold text-[#C98A18] block">Signed-in Session Active</span>
                <span className="text-gray-600 text-[11px] block">
                  Changing your password signs out your other sessions.
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={() => window.dispatchEvent(new Event(OPEN_PASSWORD_CHANGE))}
                className="w-full flex items-center justify-center gap-2 bg-[#0B192C] hover:bg-[#152744] text-white font-bold text-xs py-3 rounded-xl transition shadow-md"
              >
                <Key size={16} className="text-[#D4A72C]" /> Change Password
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-md"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
