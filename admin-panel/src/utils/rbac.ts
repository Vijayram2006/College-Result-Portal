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
 * Checks if the user is a Super Administrator (Dr. Sathish or SUPER_ADMIN role)
 */
export function isSuperAdmin(user?: any): boolean {
  const currentUser = user || adminAuthApi.getCurrentUser();
  if (!currentUser) return false;
  return (
    currentUser.role === "SUPER_ADMIN" ||
    (currentUser.username && currentUser.username.trim().toUpperCase() === "SATHISH") ||
    (currentUser.name && currentUser.name.toLowerCase().includes("sathish"))
  );
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
 * Set active college inspection context for Super Admin (Dr. Sathish)
 */
export function setSuperAdminCollegeView(college: CollegeKey) {
  localStorage.setItem("kvell_superadmin_view_college", college);
  const currentUser = adminAuthApi.getCurrentUser();
  if (currentUser) {
    const conf = COLLEGES[college];
    const updatedUser = {
      ...currentUser,
      collegeKey: college,
      collegeName: conf ? conf.name : currentUser.collegeName,
    };
    localStorage.setItem("kvell_admin_user", JSON.stringify(updatedUser));
  }
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("kvell_college_switched"));
  window.location.reload();
}

/**
 * Quick switch college role (for presentation / administrative switching in the same panel)
 */
export function switchCollegeRole(newCollege: CollegeKey) {
  const currentUser = adminAuthApi.getCurrentUser();
  if (!currentUser) return;

  const conf = COLLEGES[newCollege];
  const updatedUser = {
    ...currentUser,
    id: newCollege === "nursing" ? "ADM-NUR-001" : newCollege === "pharmacy" ? "ADM-PHARM-001" : "ADM-ENG-001",
    role: conf.role,
    collegeKey: newCollege,
    collegeName: conf.name,
    name: conf.coeTitle,
    email: conf.email,
    username: newCollege === "nursing" ? "COE_NURSING" : newCollege === "pharmacy" ? "COE_PHARMACY" : "ADMIN",
  };

  localStorage.setItem("kvell_admin_user", JSON.stringify(updatedUser));
  localStorage.setItem("kvell_admin_token", `demo-token-${newCollege}`);
  window.dispatchEvent(new Event("storage"));
  window.location.reload();
}
