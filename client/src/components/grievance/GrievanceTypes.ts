export type GrievanceStatus = "WAITING" | "APPROVED" | "REJECTED";
export type GrievanceRole = "FACULTY" | "HOD" | "DEAN";
export type RecipientCategory = "CLASS_FACULTY" | "HOD" | "SUBJECT_FACULTY" | "MENTOR";

export interface RecipientDTO {
  id: number;
  name: string;
  username: string;
  role: "FACULTY" | "HOD";
  deptKey: string;
  deptName: string;
  category?: RecipientCategory;
  designation?: string;
}

export interface RemarkItemDTO {
  by: string;
  role: string;
  text: string;
  at: string;
}

export interface GrievanceSummaryDTO {
  id: number;
  refId: string;
  regNo: string;
  studentName: string;
  deptKey: string;
  subject: string;
  status: GrievanceStatus;
  currentHandlerRole: GrievanceRole;
  currentHandlerName?: string;
  handlerName?: string;
  hasAttachment: boolean;
  attachmentName?: string;
  createdAt: string;
  handlerReceivedAt: string;
  autoForwarded: boolean;
  recipientCategory?: RecipientCategory;
}

export interface GrievanceDetailDTO {
  id: number;
  refId: string;
  regNo: string;
  studentName: string;
  deptKey: string;
  deptName: string;
  collegeKey: string;
  subject: string;
  description: string;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  sentToRole: "FACULTY" | "HOD";
  sentToName: string;
  currentHandlerRole: GrievanceRole;
  currentHandlerName: string;
  status: GrievanceStatus;
  remarks: RemarkItemDTO[];
  createdAt: string;
  handlerReceivedAt: string;
  resolvedAt?: string | null;
  autoForwarded: boolean;
  overdue48hrs: boolean;
  recipientCategory?: RecipientCategory;
}

export interface GrievanceActionDTO {
  action: "APPROVE" | "REJECT" | "FORWARD";
  remark?: string;
}

export interface CreateGrievanceJsonDTO {
  subject: string;
  description: string;
  sentToRole: string;
  sentToUserId: number;
  recipientCategory?: RecipientCategory;
}

