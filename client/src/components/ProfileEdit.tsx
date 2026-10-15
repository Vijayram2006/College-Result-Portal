import { useEffect, useState, type FormEvent } from "react";
import { Save, UserRound, X } from "lucide-react";
import { apiErrorMessage, authApi, type StaffProfile } from "../services/api";

/** Fired by an "Edit profile" button (HOD / faculty). */
export const OPEN_PROFILE_EDIT = "kvell:open-profile-edit";
/** Fired after a save, with the new name as detail, so headers can show it. */
export const PROFILE_UPDATED = "kvell:profile-updated";

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none";

/** Staff edit their own name, designation, email and phone. Username, role and department are fixed. */
export function ProfileEditDialog() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", designation: "" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const show = () => {
      if (authApi.currentUser()?.role === "STUDENT") return;
      setOpen(true);
      setError(null);
      setSaved(false);
      setProfile(null);
      authApi
        .getProfile()
        .then((p) => {
          setProfile(p);
          setForm({ name: p.name || "", email: p.email || "", phone: p.phone || "", designation: p.designation || "" });
        })
        .catch((err) => setError(apiErrorMessage(err, "Could not load your profile.")));
    };
    window.addEventListener(OPEN_PROFILE_EDIT, show);
    return () => window.removeEventListener(OPEN_PROFILE_EDIT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const p = await authApi.updateProfile(form);
      setProfile(p);
      setSaved(true);
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED, { detail: p.name }));
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save your profile."));
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0B192C]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[#D4A72C]/40 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 text-[#0B192C]">
            <div className="p-1.5 rounded-lg bg-[#0B192C] text-[#D4A72C]">
              <UserRound size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black">Edit profile</h2>
              {profile && (
                <p className="text-[11px] font-semibold text-slate-500">
                  {profile.username} · {profile.role}
                  {profile.departmentName ? ` · ${profile.departmentName}` : ""}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!profile && !error ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Full name *</span>
              <input className={inputClass} value={form.name} required maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Designation</span>
              <input className={inputClass} value={form.designation} maxLength={80} placeholder="e.g. Assistant Professor"
                onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Email</span>
              <input className={inputClass} type="email" value={form.email} maxLength={120} placeholder="name@college.edu.in"
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-slate-600">Phone</span>
              <input className={inputClass} type="tel" value={form.phone} maxLength={20} placeholder="+91 98765 43210"
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <p className="text-[11px] text-slate-500">Username, role and department are fixed and cannot be changed here.</p>
          </>
        )}

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">{error}</div>}
        {saved && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">Profile saved.</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold">
            Close
          </button>
          <button type="submit" disabled={saving || !profile}
            className="px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60">
            <Save size={15} className="text-[#D4A72C]" /> {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
