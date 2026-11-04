import { apiClient } from "./api";

export type HodCertificateStatus =
  | "PENDING"
  | "HOD_APPROVED"
  | "REJECTED_BY_HOD"
  | "FORWARDED_TO_AO";

export interface HodCertificateView {
  id: number;
  studentReg: string;
  studentName: string;
  deptKey: string;
  certificateType: string;
  purpose?: string | null;
  status: HodCertificateStatus;
  createdAt: string;
  hodRemarks?: string | null;
  hodActionBy?: string | null;
  hodActionAt?: string | null;
  forwardedBy?: string | null;
  forwardedAt?: string | null;
}

export const hodCertificateApi = {
  async list(status?: string): Promise<HodCertificateView[]> {
    const res = await apiClient.get<HodCertificateView[]>("/hod/certificates", {
      params: status && status !== "ALL" ? { status } : undefined,
    });
    return res.data;
  },

  async approve(id: number, remarks?: string): Promise<HodCertificateView> {
    const res = await apiClient.post<HodCertificateView>(`/hod/certificates/${id}/approve`, {
      remarks: remarks?.trim() || undefined,
    });
    return res.data;
  },

  async reject(id: number, remarks: string): Promise<HodCertificateView> {
    const res = await apiClient.post<HodCertificateView>(`/hod/certificates/${id}/reject`, {
      remarks: remarks.trim(),
    });
    return res.data;
  },

  async forward(id: number): Promise<HodCertificateView> {
    const res = await apiClient.post<HodCertificateView>(`/hod/certificates/${id}/forward`);
    return res.data;
  },
};

