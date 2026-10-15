import { adminAuthApi } from "../services/api";

export type CollegeKey = "engineering" | "nursing" | "pharmacy";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "COE_ENGINEERING" | "COE_NURSING" | "COE_PHARMACY";

export interface CollegeConfig {
  key: CollegeKey;
  name: string;
  shortName: string;
  code: string;
  coeTitle: string;
  email: string;
  role: AdminRole;
  themeColor: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  description: string;
  logoUrl: string;
}

export const SUPER_ADMIN_CONFIG = {
  id: "ADM-SUPER-001",
  name: "Dr. Sathish",
  username: "Sathish",
  title: "Overall University COE & Super Administrator",
  shortTitle: "Chief COE & Super Admin",
  email: "coe.sathish@kvell.edu.in",
  role: "SUPER_ADMIN" as AdminRole,
  universityName: "Karpaga Vinayaga Educational Group (Central University)",
  avatar: "/kvell-logo.png",
  badgeBg: "bg-amber-500/20",
  badgeText: "text-amber-400",
  themeColor: "#D4A72C",
};

export const COLLEGES: Record<CollegeKey, CollegeConfig> = {
  engineering: {
    key: "engineering",
    name: "Karpaga Vinayaga College of Engineering and Technology",
    shortName: "Engineering",
    code: "ENG",
    coeTitle: "Dr. Controller of Examinations (Engineering)",
    email: "coe.engineering@kvell.edu.in",
    role: "COE_ENGINEERING",
    themeColor: "#B08014",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    icon: "⚙️",
    description: "Faculty of Engineering, Technology & Computer Applications",
    logoUrl: "/engineering-logo.png",
  },
  nursing: {
    key: "nursing",
    name: "Karpaga Vinayaga College of Nursing",
    shortName: "Nursing",
    code: "NUR",
    coeTitle: "Dr. Controller of Examinations (Nursing)",
    email: "coe.nursing@kvell.edu.in",
    role: "COE_NURSING",
    themeColor: "#0284C7",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    icon: "🏥",
    description: "Faculty of Nursing, Clinical Care & Allied Health Sciences",
    logoUrl: "/nursing-logo.png",
  },
  pharmacy: {
    key: "pharmacy",
    name: "Karpaga Vinayaga Institute for Pharmaceutical Sciences",
    shortName: "Pharmacy",
    code: "PHARM",
    coeTitle: "Dr. Controller of Examinations (Pharmacy)",
    email: "coe.pharmacy@kvell.edu.in",
    role: "COE_PHARMACY",
    themeColor: "#059669",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    icon: "💊",
    description: "Faculty of Pharmaceutical Sciences & Drug Research",
    logoUrl: "/pharmacy-logo.png",
  },
};

/**
 * Checks if the user is the Super Administrator (Chief COE). Only the role the server issued counts.
 */
export function isSuperAdmin(user?: any): boolean {
  const currentUser = user || adminAuthApi.getCurrentUser();
  if (!currentUser) return false;
  return currentUser.role === "SUPER_ADMIN";
}

/**
 * Returns the currently authenticated user's CollegeConfig
 */
export function getActiveCollege(): CollegeConfig {
  const user = adminAuthApi.getCurrentUser();
  if (!user) return COLLEGES.engineering;

  // If super admin, allow switching the active view context
  const superAdminCollegeView = localStorage.getItem("kvell_superadmin_view_college") as CollegeKey;
  if (isSuperAdmin(user) && superAdminCollegeView && COLLEGES[superAdminCollegeView]) {
    return COLLEGES[superAdminCollegeView];
  }

  if (user.collegeKey && COLLEGES[user.collegeKey as CollegeKey]) {
    return COLLEGES[user.collegeKey as CollegeKey];
  }

  // Derive by role
  if (user.role === "COE_NURSING") return COLLEGES.nursing;
  if (user.role === "COE_PHARMACY") return COLLEGES.pharmacy;
  return COLLEGES.engineering;
}

/**
 * Returns the active college key ('engineering' | 'nursing' | 'pharmacy')
 */
export function getActiveCollegeKey(): CollegeKey {
  return getActiveCollege().key;
}

/**
 * Returns whether the active college is engineering
 */
export function isEngineeringCollege(): boolean {
  return getActiveCollegeKey() === "engineering";
}

/**
 * Generates an isolated storage key scoped to the active college.
 * For 'engineering', the standard baseKey is retained for 100% backward compatibility.
 * For 'nursing' and 'pharmacy', a scoped key like `kvell_nursing_...` is returned.
 */
export function getScopedKey(baseKey: string, targetCollege?: CollegeKey): string {
  const collegeKey = targetCollege || getActiveCollegeKey();
  if (collegeKey === "engineering") {
    return baseKey;
  }
  // Convert "kvell_departments" -> "kvell_nursing_departments"
  // Convert "kvell_custom_batches" -> "kvell_nursing_custom_batches"
  if (baseKey.startsWith("kvell_")) {
    return baseKey.replace(/^kvell_/, `kvell_${collegeKey}_`);
  }
  return `kvell_${collegeKey}_${baseKey}`;
}

/**
 * The college a Super Admin is currently inspecting. The server decides what that view may show; this only picks
 * which college the panel asks for (sent with every request, ignored by the server for anyone but a Super Admin).
 */
export function setSuperAdminCollegeView(college: CollegeKey) {
  localStorage.setItem("kvell_superadmin_view_college", college);
  window.dispatchEvent(new Event("kvell_college_switched"));
  window.location.reload();
}
