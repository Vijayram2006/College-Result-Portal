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

  const executeLogin = (user: AdmissionUser, redirectPath: string) => {
    loginAdmissionUser(user);
    setLocation(redirectPath);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanUser = username.trim().toUpperCase();

      if (!cleanUser) {
        setErrorMsg("Please enter your official Admission Officer ID or Username.");
        return;
      }

      if (cleanUser.includes("SATHISH") || cleanUser.includes("SUPER") || cleanUser.includes("CHIEF")) {
        executeLogin(SUPER_ADMIN_CONFIG, "/engineering");
        return;
      }

      if (cleanUser.includes("ENG") || cleanUser.includes("KVCET") || cleanUser === "ADMIN") {
        const col = COLLEGES.engineering;
        executeLogin(
          {
            id: "ADM-ENG-001",
            name: "Dean of Admissions (Engineering)",
            username: "ADMISSION_ENG",
            role: "ADMISSION_ENGINEERING",
            collegeKey: "engineering",
            collegeName: col.name,
            email: col.email,
            title: col.deanTitle,
          },
          col.portalPath
        );
        return;
      }

      if (cleanUser.includes("NUR") || cleanUser.includes("KVCN")) {
        const col = COLLEGES.nursing;
        executeLogin(
          {
            id: "ADM-NUR-001",
            name: "Dean of Admissions (Nursing)",
            username: "ADMISSION_NUR",
            role: "ADMISSION_NURSING",
            collegeKey: "nursing",
            collegeName: col.name,
            email: col.email,
            title: col.deanTitle,
          },
          col.portalPath
        );
        return;
      }

      if (cleanUser.includes("PHARM") || cleanUser.includes("KVIPS")) {
        const col = COLLEGES.pharmacy;
        executeLogin(
          {
            id: "ADM-PHARM-001",
            name: "Dean of Admissions (Pharmacy)",
            username: "ADMISSION_PHARM",
            role: "ADMISSION_PHARMACY",
            collegeKey: "pharmacy",
            collegeName: col.name,
            email: col.email,
            title: col.deanTitle,
          },
          col.portalPath
        );
        return;
      }

      if (cleanUser.includes("EMERG") || cleanUser.includes("KVFES") || cleanUser.includes("SCIENCE")) {
        const col = COLLEGES.emerging_sciences;
        executeLogin(
          {
            id: "ADM-EMERG-001",
            name: "Dean of Admissions (Emerging Sciences)",
            username: "ADMISSION_EMERG",
            role: "ADMISSION_EMERGING",
            collegeKey: "emerging_sciences",
            collegeName: col.name,
            email: col.email,
            title: col.deanTitle,
          },
          col.portalPath
        );
        return;
      }

      // Default fallback if valid credentials entered
      const col = COLLEGES.engineering;
      executeLogin(
        {
          id: "ADM-001",
          name: "Admission Officer",
          username: cleanUser,
          role: "ADMISSION_ENGINEERING",
          collegeKey: "engineering",
          collegeName: col.name,
          email: col.email,
          title: col.deanTitle,
        },
        col.portalPath
      );
    } catch {
      setErrorMsg("Authentication failed. Please verify your admission credentials.");
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

            {/* Login Form */}
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
                    placeholder="e.g. ADMISSION_ENG or SATHISH"
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

            {/* Demo Quick Sign-in Helper with Multi-College RBAC */}
            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2.5">
                RBAC DEMO QUICK SIGN-IN (SEPARATE ADMISSION ROLES):
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {/* Super Admin - Dr. Sathish */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername("Sathish");
                    setPassword("admin123");
                  }}
                  className="w-full px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#D4A72C]/20 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 text-[#0B192C] border-2 border-[#D4A72C] font-bold text-xs transition flex items-center justify-between shadow-md group relative overflow-hidden cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-[#0B192C] text-[#D4A72C] flex items-center justify-center shrink-0 shadow-sm border border-[#D4A72C]">
                      <Crown size={15} />
                    </span>
                    <span className="text-left">
                      <span className="block font-black text-[#0B192C] flex items-center gap-1.5">
                        Dr. Sathish • Super Admin
                        <span className="text-[9px] bg-[#0B192C] text-[#D4A72C] px-1.5 py-0.2 rounded font-extrabold uppercase">
                          Chief Admission
                        </span>
                      </span>
                      <span className="block text-[10px] font-mono text-[#8C6D1F]">
                        User ID: Sathish
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] bg-[#D4A72C] text-[#0B192C] font-black px-2.5 py-1 rounded-full shadow-sm">
                    Total System Control
                  </span>
                </button>

                {/* Engineering - KVCET */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername("ADMISSION_ENG");
                    setPassword("eng@2026");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center justify-between shadow-sm group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <img
                      src={COLLEGES.engineering.logoUrl}
                      alt="Engineering Logo"
                      className="h-7 w-7 rounded-full bg-white p-0.5 object-contain border border-amber-300 shrink-0"
                    />
                    <span className="text-left">
                      <span className="block font-black text-[#0B192C]">
                        Engineering Admission Cell
                      </span>
                      <span className="block text-[10px] font-mono text-amber-700">
                        User ID: ADMISSION_ENG
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 font-black px-2 py-0.5 rounded-full">
                    14-Digit Format Engine
                  </span>
                </button>

                {/* Nursing - KVCN */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername("ADMISSION_NUR");
                    setPassword("nur@2026");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-bold text-xs transition flex items-center justify-between shadow-sm group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <img
                      src={COLLEGES.nursing.logoUrl}
                      alt="Nursing Logo"
                      className="h-7 w-7 rounded-full bg-white p-0.5 object-contain border border-sky-300 shrink-0"
                    />
                    <span className="text-left">
                      <span className="block font-black text-[#0B192C]">
                        Nursing Admission Cell
                      </span>
                      <span className="block text-[10px] font-mono text-sky-700">
                        User ID: ADMISSION_NUR
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] bg-sky-200/70 text-sky-900 font-black px-2 py-0.5 rounded-full">
                    Paramedical Desk
                  </span>
                </button>

                {/* Pharmacy - KVIPS */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername("ADMISSION_PHARM");
                    setPassword("pharm@2026");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs transition flex items-center justify-between shadow-sm group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <img
                      src={COLLEGES.pharmacy.logoUrl}
                      alt="Pharmacy Logo"
                      className="h-7 w-7 rounded-full bg-white p-0.5 object-contain border border-emerald-300 shrink-0"
                    />
                    <span className="text-left">
                      <span className="block font-black text-[#0B192C]">
                        Pharmacy Admission Cell
                      </span>
                      <span className="block text-[10px] font-mono text-emerald-700">
                        User ID: ADMISSION_PHARM
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-black px-2 py-0.5 rounded-full">
                    PCI Regulated
                  </span>
                </button>

                {/* Emerging Sciences - KVFES */}
                <button
                  type="button"
                  onClick={() => {
                    setUsername("ADMISSION_EMERG");
                    setPassword("emerg@2026");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs transition flex items-center justify-between shadow-sm group cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <img
                      src={COLLEGES.emerging_sciences.logoUrl}
                      alt="Emerging Sciences Logo"
                      className="h-7 w-7 rounded-full bg-white p-0.5 object-contain border border-purple-300 shrink-0"
                    />
                    <span className="text-left">
                      <span className="block font-black text-[#0B192C]">
                        Emerging Sciences Cell
                      </span>
                      <span className="block text-[10px] font-mono text-purple-700">
                        User ID: ADMISSION_EMERG
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] bg-purple-200/70 text-purple-900 font-black px-2 py-0.5 rounded-full">
                    Science & Tech
                  </span>
                </button>
              </div>
            </div>
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
