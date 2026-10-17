import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { Copy, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import { adminAuthApi, apiErrorMessage } from "../services/api";

/** Fired when the server says this COE account must set up two-step sign-in first. */
export const MFA_SETUP_REQUIRED = "kvell:mfa-setup-required";

type Step = "closed" | "loading" | "scan" | "codes";

/**
 * Two-step sign-in set-up, required for every COE and the Chief COE: scan the QR code with an authenticator app
 * (Google Authenticator, Microsoft Authenticator, ...), type the first code, then save the eight recovery codes.
 * Shown over the panel until it is done (after any forced password change).
 */
export function MfaSetupGate() {
  const needsSetup = () => {
    const u = adminAuthApi.getCurrentUser();
    return !!u && !!u.mfaSetupRequired && !u.mustChangePassword;
  };
  const [step, setStep] = useState<Step>(() => (needsSetup() ? "loading" : "closed"));
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const open = () => setStep((s) => (s === "closed" ? "loading" : s));
    window.addEventListener(MFA_SETUP_REQUIRED, open);
    return () => window.removeEventListener(MFA_SETUP_REQUIRED, open);
  }, []);

  useEffect(() => {
    if (step !== "loading") return;
    adminAuthApi
      .mfaSetup()
      .then(async (s) => {
        setSecret(s.secret);
        setQr(await QRCode.toDataURL(s.otpauthUri, { margin: 1, width: 220 }));
        setStep("scan");
      })
      .catch((err) => {
        setError(apiErrorMessage(err, "Two-step sign-in could not be started."));
        setStep("scan");
      });
  }, [step]);

  if (step === "closed") return null;

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      setCodes(await adminAuthApi.mfaEnable(code.trim()));
      setStep("codes");
    } catch (err) {
      setError(apiErrorMessage(err, "The code is not correct."));
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    adminAuthApi.logout();
    window.location.assign("/admin/login");
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-[#0B192C]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mfa-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-[#D4A72C]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 id="mfa-title" className="text-lg font-black text-[#0B192C]">
              {step === "codes" ? "Save your recovery codes" : "Set up two-step sign-in"}
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              {step === "codes"
                ? "Each code signs you in once if you lose your phone. Keep them somewhere safe, not on this computer."
                : "COE accounts need a code from an authenticator app at every sign-in, as well as the password."}
            </p>
          </div>
        </div>

        {step === "loading" && <p className="text-sm text-slate-500">Preparing…</p>}

        {step === "scan" && (
          <form onSubmit={confirm} className="space-y-4">
            <ol className="text-xs text-slate-700 space-y-1 list-decimal pl-4">
              <li>Install <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> on your phone.</li>
              <li>In the app, add an account and scan this QR code.</li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            {qr && <img src={qr} alt="QR code for the authenticator app" className="mx-auto h-[220px] w-[220px] rounded-xl border border-slate-200" />}
            {secret && (
              <div className="text-[11px] text-slate-600">
                Cannot scan? Enter this key in the app:
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px]" data-testid="mfa-secret">{secret}</code>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(secret)} className="p-1.5 rounded-lg border hover:bg-slate-50" aria-label="Copy key">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
            <label className="block space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1"><Smartphone size={12} /> Code from the app</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-lg font-bold tracking-[0.4em] text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none"
              />
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy || code.length !== 6} className="flex-1 h-11 rounded-xl bg-[#0B192C] text-white text-sm font-extrabold disabled:opacity-60">
                {busy ? "Checking…" : "Turn on two-step sign-in"}
              </button>
              <button type="button" onClick={signOut} className="h-11 px-3 rounded-xl border text-sm font-bold text-slate-600 flex items-center gap-1">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </form>
        )}

        {step === "codes" && (
          <div className="space-y-4">
            <ul className="grid grid-cols-2 gap-2" data-testid="recovery-codes">
              {codes.map((c) => (
                <li key={c} className="rounded-lg bg-slate-100 px-2 py-1.5 text-center font-mono text-sm font-bold">{c}</li>
              ))}
            </ul>
            <button type="button" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))} className="w-full h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-2">
              <Copy size={14} /> Copy the codes
            </button>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I have saved these codes
            </label>
            <button type="button" disabled={!saved} onClick={() => window.location.reload()} className="w-full h-11 rounded-xl bg-[#0B192C] text-white text-sm font-extrabold disabled:opacity-50">
              Continue to the panel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
