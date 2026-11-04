import { authApi } from "../services/api";

/**
 * The college shown in every portal's top bar: the signed-in user's own college (from their department), with its
 * logo. The COE panel's banner uses the same names and logos (COLLEGES in admin-panel/src/utils/rbac.ts).
 */
export interface CollegeBrand {
  key: string;
  name: string;
  logoUrl: string;
}

const BRANDS: Record<string, CollegeBrand> = {
  engineering: { key: "engineering", name: "Karpaga Vinayaga College of Engineering and Technology", logoUrl: "/engineering-logo.png" },
  nursing: { key: "nursing", name: "Karpaga Vinayaga College of Nursing", logoUrl: "/nursing-logo.png" },
  pharmacy: { key: "pharmacy", name: "Karpaga Vinayaga Institute for Pharmaceutical Sciences", logoUrl: "/pharmacy-logo.png" },
};

const UNIVERSITY: CollegeBrand = { key: "university", name: "KVELL Deemed to be University", logoUrl: "/kvell-logo.png" };

export function collegeBrand(collegeKey?: string | null): CollegeBrand {
  const key = (collegeKey ?? authApi.currentUser()?.collegeKey ?? "").toLowerCase();
  return BRANDS[key] ?? UNIVERSITY;
}
