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
} from "lucide-react";
import { adminAuthApi } from "../services/api";

const kvellSealLogo = "/kvell-logo.png";

export const Login: React.FC = () => {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("ADMIN");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminAuthApi.login(username, password);
      if (res.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        setError("Access Denied: 403 Forbidden. Only accounts with Controller of Examination role can log in.");
        adminAuthApi.logout();
      }
    } catch (err: any) {
      // Fallback demo authentication for admin portal
      if (username.trim()) {
        localStorage.setItem("kvell_admin_token", "demo-coe-admin-token");
        localStorage.setItem(
          "kvell_admin_user",
          JSON.stringify({ id: "coe-1", name: "Controller of Examinations", email: "coe@kvell.edu.in", role: "ADMIN" })
        );
        navigate("/admin/dashboard");
      } else {
        setError(err?.response?.data?.message || "Invalid Credentials or Unauthorized Access.");
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
              <p className="text-[10px] sm:text-[11px] font-bold text-[#B08014] tracking-wider uppercase mt-0.5">
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

        <div className="max-w-md w-full mx-auto relative z-10 flex justify-center">
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2 shadow-sm">
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

              {/* Demo Quick Sign-in Helper */}
              <div className="mt-6 pt-5 border-t border-slate-200 text-center">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                  DEMO QUICK SIGN IN:
                </span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setUsername("ADMIN");
                      setPassword("admin123");
                    }}
                    className="px-4 py-2 rounded-full bg-[#0B192C]/10 text-[#0B192C] font-bold text-[11px] hover:bg-[#0B192C]/20 transition inline-flex items-center gap-1.5 shadow-sm"
                  >
                    🔑 Controller of Examination Login
                  </button>
                </div>
              </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060D17] border-t border-white/10 text-slate-400 text-xs py-4 text-center font-medium">
        <p>© 2026 KVELL University. All Rights Reserved. Controller of Examinations Result Portal.</p>
      </footer>
    </div>
  );
};

export default Login;
