import type { LucideIcon } from "lucide-react";
import { BarChart3, BedDouble, Bus, ClipboardCheck, ClipboardPen, ClipboardList, FileSpreadsheet, FileText, LayoutDashboard, Users } from "lucide-react";

/**
 * The officers panel runs in two modes from the same code:
 * - the COE panel (port 3002): Controllers of Examinations and the Chief COE;
 * - the Office Portal (port 3004, started with VITE_PANEL=office): the university's offices, each seeing only its own
 *   menu. Accounts (fees) is the first; the Admission Cell, the Administrative Officer, the Transport Officer and
 *   others are added to OFFICES below as their teams finish them.
 * Each mode accepts only its own logins and, being a separate address, keeps its own sign-in. The server checks the
 * role on every request in both.
 */
export const OFFICE_PANEL = import.meta.env.VITE_PANEL === "office";

export const OFFICE_PORTAL_URL = import.meta.env.VITE_OFFICE_URL || "http://localhost:3004";
export const COE_PANEL_URL = import.meta.env.VITE_COE_URL || "http://localhost:3002";

export interface Office {
  key: string;
  /** Shown on the sign-in page, the sidebar and the header. */
  name: string;
  /** The roles (as the server returns them at sign-in) that belong to this office. */
  roles: string[];
  /** Every page of the office starts with this path. */
  basePath: string;
  home: string;
  menu: [path: string, label: string, icon: LucideIcon][];
}

/** The offices of the Office Portal. To add one: its roles, its pages under its basePath, and its menu. */
export const OFFICES: Office[] = [
  {
    key: "accounts",
    name: "Accounts Office",
    roles: ["ACCOUNTS_STAFF", "ACCOUNTS_HEAD"],
    basePath: "/admin/accounts",
    home: "/admin/accounts/dashboard",
    menu: [
      ["/admin/accounts/dashboard", "Dashboard", LayoutDashboard],
      ["/admin/accounts/fee-heads", "Fee heads", ClipboardList],
      ["/admin/accounts/fee-structure", "Fee structure", FileSpreadsheet],
      ["/admin/accounts/exam-fees", "Exam fees", ClipboardPen],
      ["/admin/accounts/rates", "Bus & hostel rates", Bus],
      ["/admin/accounts/services", "Student bus & hostel", BedDouble],
      ["/admin/accounts/dues", "Student dues", Users],
      ["/admin/accounts/payments", "Payments & receipts", FileText],
      ["/admin/accounts/approvals", "Concessions & refunds", ClipboardCheck],
      ["/admin/accounts/reports", "Reports & Tally export", BarChart3],
    ],
  },
  // Next: { key: "admission", name: "Admission Cell", ... }, { key: "ao", name: "Administrative Officer", ... },
  //       { key: "transport", name: "Transport Office", ... }
];

export const OFFICE_ROLES = OFFICES.flatMap((o) => o.roles);

export const officeOf = (role?: string | null) => OFFICES.find((o) => !!role && o.roles.includes(role)) || null;
