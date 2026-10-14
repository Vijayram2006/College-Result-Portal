import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, LogOut, ShieldCheck, X } from "lucide-react";
import { adminAuthApi as authApi, apiErrorMessage } from "../services/api";

/** Fired when the server says the signed-in account must choose its own password first. */
export const PASSWORD_CHANGE_REQUIRED = "kvell:password-change-required";
/** Fired by a "Change password" button. */
export const OPEN_PASSWORD_CHANGE = "kvell:open-change-password";

const inputClass =
  "w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none";

/**
 * Staff password change. Opens by itself (and cannot be dismissed) while the account still has its shared starting
 * password; otherwise it opens from a "Change password" button. Used by the Controller of Examinations accounts.
 */
export function PasswordChangeGate() {
  const [mode, setMode] = useState<"closed" | "forced" | "optional">(() =>
    authApi.getCurrentUser()?.mustChangePassword ? "forced" : "closed"
  );
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const forced = () => {
      setMode("forced");
    };
    const optional = () => setMode((m) => (m === "forced" ? m : "optional"));
    window.addEventListener(PASSWORD_CHANGE_REQUIRED, forced);
    window.addEventListener(OPEN_PASSWORD_CHANGE, optional);
    return () => {
      window.removeEventListener(PASSWORD_CHANGE_REQUIRED, forced);
      window.removeEventListener(OPEN_PASSWORD_CHANGE, optional);
    };
  }, []);

  if (mode === "closed") return null;

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      const wasForced = mode === "forced";
      reset();
      setMode("closed");
      // Pages opened behind the forced dialog were refused by the server; load them again now
      if (wasForced) window.location.reload();
    } catch (err) {
      setError(apiErrorMessage(err, "The password could not be changed."));
    } finally {
      setSaving(false);
    }
  };

  const forced = mode === "forced";
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0B192C]/70 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-[#D4A72C]">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-[#0B192C]">{forced ? "Choose your own password" : "Change password"}</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {forced
                ? "This account still has the starting password shared with other accounts. Set a private password to continue."
                : "Other signed-in sessions of this account will be signed out."}
            </p>
          </div>
          {!forced && (
            <button type="button" onClick={() => { reset(); setMode("closed"); }} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Current password</span>
          <input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">New password</span>
          <input type="password" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
          <span className="block text-[11px] text-slate-500">At least 10 characters, with letters and digits, not containing your username.</span>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Confirm new password</span>
          <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        </label>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-[#0B192C] text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60">
            <KeyRound size={15} className="text-[#D4A72C]" /> {saving ? "Saving..." : "Save new password"}
          </button>
          {forced && (
            <button
              type="button"
              onClick={() => { authApi.logout(); window.location.assign("/admin/login"); }}
              className="h-11 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold flex items-center gap-1.5"
            >
              <LogOut size={15} /> Sign out
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
