import { apiClient } from "./api";

export type CertificateType =
  | "BONAFIDE"
  | "MARKSHEET_10"
  | "MARKSHEET_12"
  | "TRANSFER_CERTIFICATE";

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  BONAFIDE: "Bonafide Certificate",
  MARKSHEET_10: "10th Marksheet",
  MARKSHEET_12: "12th Marksheet",
  TRANSFER_CERTIFICATE: "Transfer Certificate",
};

export const CERTIFICATE_TYPES: CertificateType[] = [
  "BONAFIDE",
  "MARKSHEET_10",
  "MARKSHEET_12",
  "TRANSFER_CERTIFICATE",
];

export interface CreateCertificateRequest {
  certificateType: CertificateType;
  purpose?: string;
}

export interface CertificateRequestView {
  id: number;
  studentReg: string;
  certificateType: CertificateType;
  purpose?: string | null;
  status: string;
  createdAt: string;
}

export const certificateApi = {
  async list(): Promise<CertificateRequestView[]> {
    const res = await apiClient.get<CertificateRequestView[]>("/student/certificates");
    return res.data;
  },

  async create(req: CreateCertificateRequest): Promise<CertificateRequestView> {
    const res = await apiClient.post<CertificateRequestView>("/student/certificates", req);
    return res.data;
  },
};

