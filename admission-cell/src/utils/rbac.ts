import { API_ROOT } from "../services/api";
import { CollegeConfig, CollegeKey, AdminRole } from "../types/admission";

export interface AdmissionUser {
  id: string;
  name: string;
  username: string;
  role: AdminRole;
  collegeKey?: CollegeKey;
  collegeName?: string;
  email: string;
  title: string;
}

export const SUPER_ADMIN_CONFIG: AdmissionUser = {
  id: "ADM-SUPER-001",
  name: "Dr. Sathish",
  username: "Sathish",
  role: "SUPER_ADMIN",
  title: "Overall University Admission Dean & Super Administrator",
  email: "admissions.central@kvell.edu.in",
  collegeName: "KVELL Central University Admissions Directorate",
};

export const UNIVERSITY_LOGO = "/assets/logos/kvell-university-logo.png";

export const COLLEGES: Record<CollegeKey, CollegeConfig> = {
  engineering: {
    key: "engineering",
    name: "Karpaga Vinayaga College of Engineering and Technology",
    shortName: "Engineering",
    portalTitle: "KVCET Engineering Admission Cell",
    code: "01",
    deanTitle: "Dean of Admissions (Engineering)",
    email: "admissions.engineering@kvell.edu.in",
    role: "ADMISSION_ENGINEERING",
    themeColor: "#B08014",
    accentBg: "bg-amber-500",
    accentText: "text-amber-400",
    borderColor: "border-amber-400",
    icon: "⚙️",
    logoUrl: "/assets/logos/engineering-logo.png",
    description: "Faculty of Engineering, Technology & Computer Applications",
    regEngineAvailable: true, // STRICTLY FOR ENGINEERING ONLY
    portalPath: "/engineering",
  },
  nursing: {
    key: "nursing",
    name: "Karpaga Vinayaga College of Nursing",
    shortName: "Nursing",
    portalTitle: "KVCN Nursing Admission Cell",
    code: "02",
    deanTitle: "Dean of Admissions (Nursing)",
    email: "admissions.nursing@kvell.edu.in",
    role: "ADMISSION_NURSING",
    themeColor: "#0284C7",
    accentBg: "bg-sky-500",
    accentText: "text-sky-400",
    borderColor: "border-sky-400",
    icon: "🏥",
    logoUrl: "/assets/logos/nursing-logo.png",
    description: "Faculty of Nursing, Clinical Care & Allied Health Sciences",
    regEngineAvailable: false,
    portalPath: "/nursing",
  },
  pharmacy: {
    key: "pharmacy",
    name: "Karpaga Vinayaga Institute of Pharmaceutical Sciences",
    shortName: "Pharmacy",
    portalTitle: "KVIPS Pharmacy Admission Cell",
    code: "03",
    deanTitle: "Dean of Admissions (Pharmacy)",
    email: "admissions.pharmacy@kvell.edu.in",
    role: "ADMISSION_PHARMACY",
    themeColor: "#059669",
    accentBg: "bg-emerald-500",
    accentText: "text-emerald-400",
    borderColor: "border-emerald-400",
    icon: "💊",
    logoUrl: "/assets/logos/pharmacy-logo.png",
    description: "Faculty of Pharmaceutical Sciences & Drug Discovery",
    regEngineAvailable: false,
    portalPath: "/pharmacy",
  },
  emerging_sciences: {
    key: "emerging_sciences",
    name: "Faculty of Allied Health & Emerging Sciences",
    shortName: "Emerging Sciences",
    portalTitle: "KVFES Emerging Sciences Admission Cell",
    code: "04",
    deanTitle: "Dean of Admissions (Emerging Sciences)",
    email: "admissions.emerging@kvell.edu.in",
    role: "ADMISSION_EMERGING",
    themeColor: "#7C3AED",
    accentBg: "bg-purple-500",
    accentText: "text-purple-400",
    borderColor: "border-purple-400",
    icon: "🔬",
    logoUrl: "/assets/logos/kvell-university-logo.png",
    description: "Faculty of Data Science, Cyber Forensics & Emerging Tech",
    regEngineAvailable: false,
    portalPath: "/emerging-sciences",
  },
};

const USER_STORAGE_KEY = "kvell_admission_user";
const TOKEN_STORAGE_KEY = "kvell_admission_token";

export function getCurrentAdmissionUser(): AdmissionUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to parse admission user", e);
  }
  return null;
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const user = getCurrentAdmissionUser();
  return Boolean(token && user);
}

export function loginAdmissionUser(user: AdmissionUser, token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("kvell_admission_user_changed"));
}

export function setCurrentAdmissionUser(user: AdmissionUser, token: string) {
  loginAdmissionUser(user, token);
}

export function isSuperAdmin(user?: AdmissionUser | null): boolean {
  const u = user !== undefined ? user : getCurrentAdmissionUser();
  if (!u) return false;
  return u.role === "SUPER_ADMIN";
}

export function logoutAdmissionUser() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    fetch(`${API_ROOT}/v1/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
  }
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("storage"));
}
