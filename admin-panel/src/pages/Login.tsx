import React, { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import {
  Lock,
  User,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  GraduationCap,
  UsersRound,
  Sparkles,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { adminAuthApi, apiErrorMessage, type CaptchaChallenge } from "../services/api";
import { refreshDepartments } from "./Departments";

const kvellSealLogo = "/kvell-logo.png";

export const Login: React.FC = () => {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("ADMIN");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Second step for COE accounts with two-step sign-in, and the picture challenge after failed attempts
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminAuthApi.login(username, password, {
        otp: otpStep ? otp : undefined,
        captchaId: captcha?.id,
        captchaAnswer: captcha ? captchaAnswer : undefined,
      });
      const allowedRoles = ["SUPER_ADMIN", "ADMIN", "COE_ENGINEERING", "COE_NURSING", "COE_PHARMACY"];
      if (allowedRoles.includes(res.role)) {
        if (!res.user.mfaSetupRequired) await refreshDepartments().catch(() => undefined);
        navigate(res.role === "SUPER_ADMIN" ? "/admin/super-admin" : "/admin/dashboard");
      } else {
        setError("Access Denied: 403 Forbidden. Only accounts with Controller of Examination role can log in.");
        adminAuthApi.logout();
      }
    } catch (err: any) {
      const data = err?.response?.data;
      // Each challenge is used up by the attempt that sent it
      setCaptcha(data?.captchaRequired ? data.captcha : null);
      setCaptchaAnswer("");
      if (data?.otpRequired) {
        if (otpStep && otp) setError(apiErrorMessage(err, "The code is not correct."));
        setOtpStep(true);
        setOtp("");
      } else {
        setError(apiErrorMessage(err, "Invalid Credentials or Unauthorized Access."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B192C] text-[#172033] font-sans flex flex-col justify-between selection:bg-[#D4A72C] selection:text-[#0B192C]">
      {/* Top Banner Bar */}
      <div className="bg-[#060D17] text-white border-b border-[#D4A72C]/20 text-[11px] py-1.5 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-2 z-50">
        <div className="flex items-center gap-2">
          <span className="bg-[#D4A72C] text-[#0B192C] font-extrabold text-[10px] px-2 py-0.5 rounded tracking-wider uppercase shadow-sm">
            # OFFICIAL PORTAL
          </span>
          <span className="text-slate-300 font-medium">
            Controller of Examinations Admin Workflow & Result Management
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[#F59E0B] font-bold">
          <Sparkles size={13} className="animate-pulse" />
          <span>COE Examination Control Suite</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
          <span>AICTE & UGC Approved</span>
          <span>•</span>
          <span className="text-[#D4A72C]">NAAC A++ Accredited</span>
        </div>
      </div>

      {/* Main Header Navbar */}
      <header className="bg-white border-b border-[#E5E1D8] sticky top-0 z-40 shadow-sm">
        <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <img
              src={kvellSealLogo}
              alt="KVELL University Seal"
              className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-full shadow-md p-0.5 bg-white border-2 border-[#D4A72C]/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#0B192C]">
                  KVELL DEEMED TO BE UNIVERSITY
                </span>
                <span className="hidden sm:inline-block bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-slate-200">
                  ESTD. 2001
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#8A6410] tracking-wider uppercase mt-0.5">
                CONTROLLER OF EXAMINATIONS • EXAMINATION & RESULT ADMINISTRATION PORTAL
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="bg-[#0B192C] text-[#D4A72C] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
              <ShieldCheck size={14} className="text-[#D4A72C]" />
              COE Portal Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero & Login Card Section */}
      <section className="relative overflow-hidden bg-[#0B192C] text-white py-10 lg:py-14 px-4 sm:px-6 lg:px-8 flex-1 flex items-center justify-center">
        {/* Decorative Golden Ambient Rings & Background Glow */}
        <div className="pointer-events-none absolute -left-28 -top-28 h-[450px] w-[450px] rounded-full border border-[#D4A72C]/15" />
        <div className="pointer-events-none absolute -left-14 -top-14 h-[350px] w-[350px] rounded-full border border-[#D4A72C]/10" />
        <div className="pointer-events-none absolute right-10 -bottom-28 h-[400px] w-[400px] rounded-full border border-[#D4A72C]/10" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D4A72C]/5 blur-3xl rounded-full" />

        <div className="max-w-6xl w-full mx-auto relative z-10 grid lg:grid-cols-2 gap-10 items-center">
          {/* Left Hero Column (same layout as the student / HOD portal sign-in) */}
          <div className="hidden lg:flex flex-col justify-center space-y-6 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#D4A72C] text-xs font-extrabold w-fit border border-[#D4A72C]/30 shadow-sm">
              <span>CONTROLLER OF EXAMINATIONS</span>
            </div>
            <div>
              <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Examination Control
              </h1>
              <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight text-[#D4A72C] leading-tight mt-1">
                Kvell University
              </h1>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Publish results, manage marks, question papers and portal settings for the Engineering, Nursing and Pharmacy colleges. Every COE account is protected by two-step sign-in.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <p className="text-2xl font-black text-[#D4A72C]">3 Colleges</p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Engineering, Nursing, Pharmacy</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
                <p className="text-2xl font-black text-[#D4A72C]">2-Step</p>
                <p className="text-xs text-slate-300 font-bold mt-0.5">Sign-in for every COE account</p>
              </div>
            </div>
          </div>

          {/* Right Card Column */}
          <div className="w-full flex justify-center">
          <div className="bg-white text-[#172033] rounded-[2.25rem] p-7 sm:p-9 shadow-2xl border border-white/20 w-full relative">
              
              {/* Seal Logo inside Card */}
              <div className="text-center mb-6">
                <img
                  src={kvellSealLogo}
                  alt="KVELL Seal Logo"
                  className="h-16 w-16 mx-auto rounded-full bg-white p-1 border-2 border-[#D4A72C] shadow-md"
                />
                <h2 className="font-extrabold text-xl text-[#0B192C] mt-3">Controller of Examinations Login</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Enter your COE administration credentials to sign in</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    CONTROLLER OF EXAMINATION ID / USERNAME
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. ADMIN"
                      className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-12 pl-11 pr-10 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {otpStep && (
                  <div>
                    <label htmlFor="otp" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      AUTHENTICATOR CODE
                    </label>
                    <input
                      id="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      maxLength={12}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.toUpperCase())}
                      placeholder="6-digit code (or a recovery code)"
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-sm font-bold tracking-widest text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Open your authenticator app and type the code shown for KVELL Result Portal.</p>
                  </div>
                )}

                {captcha && (
                  <div>
                    <label htmlFor="captcha" className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                      TYPE THE CHARACTERS IN THE PICTURE
                    </label>
                    <img src={captcha.image} alt="Security check: characters to type" className="h-[60px] rounded-xl border border-slate-200 mb-2" />
                    <input
                      id="captcha"
                      required
                      autoComplete="off"
                      maxLength={8}
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                      className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-sm font-bold tracking-widest text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                    />
                  </div>
                )}

                {error && (
                  <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 shadow-sm">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition duration-150 active:scale-[0.99]"
                >
                  <Lock size={14} className="text-[#D4A72C]" />
                  {loading ? "Authenticating..." : "Sign In to Controller of Examination Portal"}
                </button>
              </form>

              {/* Demo Quick Sign-in Helper with Multi-College RBAC */}
              <div className="mt-6 pt-5 border-t border-slate-200 text-center">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2.5">
                  SELECT YOUR COLLEGE (FILLS THE USER ID):
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Super Admin - Dr. Sathish */}
                  <button
                    type="button"
                    onClick={() => {
                      setUsername("COE");
                      setPassword("");
                    }}
                    className="w-full px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#D4A72C]/20 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 text-[#0B192C] border-2 border-[#D4A72C] font-bold text-xs transition flex items-center justify-between shadow-md group relative overflow-hidden"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0 shadow-sm border border-[#D4A72C]">
                        <Crown size={15} />
                      </span>
                      <span className="text-left">
                        <span className="block font-black text-[#0B192C] flex items-center gap-1.5">
                          Dr. Sathish • Super Admin
                          <span className="text-[9px] bg-[#0B192C] text-[#D4A72C] px-1.5 py-0.2 rounded font-extrabold uppercase">
                            Chief COE
                          </span>
                        </span>
                        <span className="block text-[10px] font-mono text-[#8C6D1F]">User ID: COE</span>
                      </span>
                    </span>
                    <span className="text-[10px] bg-[#D4A72C] text-[#0B192C] font-black px-2.5 py-1 rounded-full shadow-sm">
                      Total System Control
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUsername("COE_NURSING");
                      setPassword("");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-bold text-xs transition flex items-center justify-between shadow-sm group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🏥</span>
                      <span className="text-left">
                        <span className="block font-black text-[#0B192C]">Nursing College COE</span>
                        <span className="block text-[10px] font-mono text-sky-700">User ID: COE_NURSING</span>
                      </span>
                    </span>
                    <span className="text-[10px] bg-sky-200/70 text-sky-900 font-black px-2 py-0.5 rounded-full">
                      Separate data
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUsername("COE_PHARMACY");
                      setPassword("");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs transition flex items-center justify-between shadow-sm group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">💊</span>
                      <span className="text-left">
                        <span className="block font-black text-[#0B192C]">Pharmacy College COE</span>
                        <span className="block text-[10px] font-mono text-emerald-700">User ID: COE_PHARMACY</span>
                      </span>
                    </span>
                    <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                      Separate data
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUsername("ADMIN");
                      setPassword("");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center justify-between shadow-sm group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">⚙️</span>
                      <span className="text-left">
                        <span className="block font-black text-[#0B192C]">Engineering College COE</span>
                        <span className="block text-[10px] font-mono text-amber-700">User ID: ADMIN</span>
                      </span>
                    </span>
                    <span className="text-[10px] bg-amber-200/70 text-amber-900 font-black px-2 py-0.5 rounded-full">
                      Separate data
                    </span>
                  </button>
                </div>
              </div>

          </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Portal.</p>
        <p className="mt-1 opacity-80">Support: Office of the Controller of Examinations.</p>
      </footer>
    </div>
  );
};

export default Login;
