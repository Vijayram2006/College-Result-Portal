import React, { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, KeyRound, Loader2, Lock, User, Wallet } from "lucide-react";
import { adminAuthApi, apiErrorMessage } from "../services/api";
import { COE_PANEL_URL, OFFICES, officeOf } from "../utils/panel";

/** Sign-in of the Office Portal: each office's officers (Accounts now; more offices later). */
export const OfficeLogin: React.FC = () => {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await adminAuthApi.login(username, password, {
        otp: otpStep ? otp : undefined,
        captchaId: captcha?.id,
        captchaAnswer: captcha ? captchaAnswer : undefined,
      });
      const office = officeOf(res.role);
      if (office) {
        navigate(office.home);
      } else {
        adminAuthApi.logout();
        setError("This is the Office Portal. COE officers sign in to the COE panel.");
      }
    } catch (err: any) {
      const data = err?.response?.data;
      setCaptcha(data?.captchaRequired ? data.captcha : null);
      setCaptchaAnswer("");
      if (data?.otpRequired) {
        if (otpStep && otp) setError(apiErrorMessage(err, "The code is not correct."));
        setOtpStep(true);
        setOtp("");
      } else {
        setError(apiErrorMessage(err, "Invalid user ID or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  const field = "w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A72C]";

  return (
    <div className="login-font min-h-screen bg-[#0B192C] flex flex-col">
      <div className="bg-[#060D17] text-white border-b border-[#D4A72C]/20 text-[11px] py-1.5 px-4 sm:px-8 flex items-center gap-2">
        <span className="bg-[#D4A72C] text-[#0B192C] font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase">
          # Official portal
        </span>
        <span className="text-slate-300 font-medium">University offices · Accounts and administration</span>
      </div>
      <header className="bg-white border-b-4 border-[#D4A72C] px-4 sm:px-8 py-3 flex items-center gap-3">
        <img src="/kvell-logo.png" alt="KVELL University" className="h-14 w-14 rounded-full bg-white p-1 border-2 border-[#D4A72C] shadow" />
        <div>
          <span className="block font-display font-black text-lg sm:text-xl text-[#0B192C] tracking-tight">KVELL DEEMED TO BE UNIVERSITY</span>
          <span className="block text-[11px] font-extrabold text-[#B08014] uppercase tracking-widest">Office Portal · University offices</span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="text-white space-y-4 hidden lg:block">
            <span className="inline-flex items-center gap-2 bg-[#D4A72C]/15 border border-[#D4A72C]/50 text-[#D4A72C] text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
              <Wallet size={14} /> Office Portal
            </span>
            <h1 className="font-display text-5xl font-extrabold leading-tight">Office Portal<br /><span className="text-[#D4A72C]">Kvell University</span></h1>
            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              One sign-in for the university's offices. Each officer sees only their own office.
            </p>
            <ul className="space-y-1.5 text-sm">
              {OFFICES.map((o) => <li key={o.key} className="flex items-center gap-2 text-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-[#D4A72C]" />{o.name}</li>)}
            </ul>
          </div>
          <form onSubmit={submit} className="bg-white rounded-[2rem] shadow-2xl p-8 space-y-5 border border-[#D4A72C]/30">
            <div className="text-center">
              <img src="/kvell-logo.png" alt="" className="mx-auto h-16 w-16 rounded-full bg-white p-1 border-2 border-[#D4A72C] shadow" />
              <h2 className="mt-3 font-display text-2xl font-extrabold text-[#0B192C]">Office sign-in</h2>
              <p className="text-xs text-slate-500">Sign in with your office user ID</p>
            </div>
            {!otpStep ? (
              <>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">User ID
                  <span className="relative block mt-1">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your user ID" autoComplete="username" required />
                  </span>
                </label>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">Password
                  <span className="relative block mt-1">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={field} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                    <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
              </>
            ) : (
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">Code from your authenticator app
                <input className={`${field} pl-3 tracking-[0.4em] text-center font-mono`} value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoFocus required />
              </label>
            )}
            {captcha && (
              <div className="space-y-2">
                <img src={captcha.image} alt="Security check" className="mx-auto rounded-lg border" />
                <input className={`${field} pl-3`} value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} placeholder="Type the characters shown" required />
              </div>
            )}
            {error && <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[#0B192C] hover:bg-[#152744] text-[#D4A72C] font-black text-sm inline-flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Sign in
            </button>
            <p className="text-center text-[11px] text-slate-500">
              COE officer? Use the <a className="underline font-bold" href={COE_PANEL_URL + "/admin/login"}>COE panel</a>.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default OfficeLogin;
