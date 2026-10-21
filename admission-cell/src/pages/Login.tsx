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
  Sparkles,
  Crown,
} from "lucide-react";
import {
  COLLEGES,
  loginAdmissionUser,
  SUPER_ADMIN_CONFIG,
  AdmissionUser,
  isAuthenticated,
  getCurrentAdmissionUser,
} from "../utils/rbac";
import { CollegeKey } from "../types/admission";
import { api } from "../services/api";

const kvellSealLogo = "/kvell-logo.png";

export const Login: React.FC = () => {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect directly to user's assigned portal
  React.useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentAdmissionUser();
      if (user) {
        if (user.role === "SUPER_ADMIN") {
          setLocation("/engineering");
        } else if (user.collegeKey && COLLEGES[user.collegeKey]) {
          setLocation(COLLEGES[user.collegeKey].portalPath);
        }
      }
    }
  }, [setLocation]);

  const [otp, setOtp] = useState("");
  const [otpNeeded, setOtpNeeded] = useState(false);
  // After failed attempts the server asks for a picture challenge
  const [captcha, setCaptcha] = useState<{ id: string; image: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pendingUser, setPendingUser] = useState<{ user: AdmissionUser; token: string; path: string } | null>(null);

  const finish = (user: AdmissionUser, token: string, path: string) => {
    loginAdmissionUser(user, token);
    setLocation(path);
  };

  // Admission officers sign in with role "admission"; the Chief COE with the COE sign-in (and two-step code)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const name = username.trim();
    if (!name || !password) {
      setErrorMsg("Enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const chief = otpNeeded || name.toUpperCase() === "COE";
      const res = await api<any>("POST", "/auth/login", {
        username: name,
        password,
        role: chief ? "admin" : "admission",
        ...(otpNeeded ? { otp: otp.trim() } : {}),
        ...(captcha ? { captchaId: captcha.id, captchaAnswer: captchaAnswer.trim() } : {}),
      });
      const u = res.user;
      const superAdmin = u.role === "SUPER_ADMIN";
      if (!superAdmin && !u.collegeKey) throw new Error("This account has no college.");
      const college = (u.collegeKey || "engineering") as CollegeKey;
      const user: AdmissionUser = {
        id: String(u.id),
        name: u.name,
        username: u.username,
        role: superAdmin ? "SUPER_ADMIN" : COLLEGES[college].role,
        collegeKey: superAdmin ? undefined : college,
        collegeName: superAdmin ? "KVELL University" : COLLEGES[college].name,
        email: u.email || "",
        title: superAdmin ? "Chief COE" : COLLEGES[college].deanTitle,
      };
      const path = superAdmin ? "/engineering" : COLLEGES[college].portalPath;
      if (u.mustChangePassword) {
        setPendingUser({ user, token: res.token, path });
        return;
      }
      finish(user, res.token, path);
    } catch (err: any) {
      setCaptcha(err?.body?.captchaRequired ? err.body.captcha : null);
      setCaptchaAnswer("");
      if (err?.body?.otpRequired) {
        setOtpNeeded(true);
        setErrorMsg(otpNeeded ? err.message : "Enter the 6-digit code from your authenticator app.");
      } else {
        setErrorMsg(err?.message || "Sign in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // First sign-in: the starting password must be replaced before the admission cell opens
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      localStorage.setItem("kvell_admission_token", pendingUser.token);
      await api("POST", "/auth/change-password", { currentPassword: password, newPassword });
      finish(pendingUser.user, pendingUser.token, pendingUser.path);
    } catch (err: any) {
      localStorage.removeItem("kvell_admission_token");
      setErrorMsg(err?.message || "The password could not be changed.");
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
            Central Admission Cell Workflow & Student Enrollment
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[#F59E0B] font-bold">
          <Sparkles size={13} className="animate-pulse" />
          <span>Admission Cell Control Suite</span>
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
              <p className="text-[10px] sm:text-[11px] font-bold text-[#B08014] tracking-wider uppercase mt-0.5">
                CENTRAL ADMISSION CELL • STUDENT ONBOARDING & ENROLLMENT PORTAL
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="bg-[#0B192C] text-[#D4A72C] text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
              <ShieldCheck size={14} className="text-[#D4A72C]" />
              Admission Portal Mode
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

        <div className="max-w-md w-full mx-auto relative z-10 flex justify-center">
          <div className="bg-white text-[#172033] rounded-[2.25rem] p-7 sm:p-9 shadow-2xl border border-white/20 w-full relative">
            {/* Seal Logo inside Card */}
            <div className="text-center mb-6">
              <img
                src={kvellSealLogo}
                alt="KVELL Seal Logo"
                className="h-16 w-16 mx-auto rounded-full bg-white p-1 border-2 border-[#D4A72C] shadow-md"
              />
              <h2 className="font-extrabold text-xl text-[#0B192C] mt-3">
                Central Admission Cell Login
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Enter your admission officer credentials to sign in
              </p>
            </div>

            {pendingUser ? (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <p className="text-xs text-slate-600">
                  This is your first sign-in. Choose your own password (at least 10 characters, with letters and numbers).
                </p>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-semibold"
                />
                {errorMsg && <p role="alert" className="text-xs font-bold text-red-700">{errorMsg}</p>}
                <button type="submit" disabled={loading}
                  className="w-full h-12 rounded-2xl bg-[#0B192C] text-white font-extrabold text-xs">
                  {loading ? "Saving..." : "Save password and continue"}
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                  ADMISSION OFFICER ID / USERNAME
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. ADMISSION_ENG (Chief COE: COE)"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border border-slate-200 bg-[#F8F5EE]/60 focus:bg-white text-xs font-semibold text-[#172033] focus:border-[#0B192C] focus:ring-1 focus:ring-[#0B192C] focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {otpNeeded && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    TWO-STEP CODE
                  </label>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              )}

              {captcha && (
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                    TYPE THE CHARACTERS IN THE PICTURE
                  </label>
                  <img src={captcha.image} alt="Picture challenge" className="h-14 rounded-lg border border-slate-200 bg-white mb-2" />
                  <input
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    required
                    autoComplete="off"
                    placeholder="Characters shown above"
                    className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 shadow-sm">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-[#0B192C] hover:bg-[#152744] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition duration-150 active:scale-[0.99] cursor-pointer"
              >
                <Lock size={14} className="text-[#D4A72C]" />
                {loading ? "Authenticating..." : "Sign In to Admission Cell Portal"}
              </button>
            </form>
            )}

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Central Admission Cell Portal.</p>
      </footer>
    </div>
  );
};

export default Login;
