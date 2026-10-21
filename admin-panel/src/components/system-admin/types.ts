import { CollegeKey } from "../../utils/rbac";
import { SystemConfig } from "../../utils/systemConfig";

export type SystemAdminTab =
  | "overview"
  | "question-papers"
  | "gateways"
  | "users"
  | "regulations"
  | "storage"
  | "audit";

export interface OfficerUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "SUPER_ADMIN" | "COE_ENGINEERING" | "COE_NURSING" | "COE_PHARMACY" | "DEPUTY_COE" | "ASSOCIATE_DEAN" | "DEAN" | "ADMISSION_OFFICER";
  collegeKey: CollegeKey | "all";
  status: "ACTIVE" | "SUSPENDED";
  lastLogin: string;
  departmentScope?: string;
  mfaEnabled?: boolean;
}

export interface CollegeMetrics {
  key: CollegeKey;
  name: string;
  shortName: string;
  code: string;
  coeName: string;
  totalDepartments: number;
  totalStudents: number;
  totalBatches: number;
  resultsStatus: "PUBLISHED" | "VALIDATED" | "DRAFT" | "PENDING";
  facultyEntriesSubmitted: number;
  facultyEntriesTotal: number;
  isLocked: boolean;
}
