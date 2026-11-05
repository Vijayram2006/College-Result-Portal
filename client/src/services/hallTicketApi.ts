import { apiClient } from "./api";

export interface ExamScheduleItem {
  id: number;
  examDate: string;
  dayName: string;
  session: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectTitle: string;
  classroom?: string | null;
}

export interface StudentHallTicketView {
  id: number;
  studentReg: string;
  studentName: string;
  deptName: string;
  collegeKey: string;
  semester: number;
  section: string;
  examTimetableId: number;
  examTitle: string;
  hallTicketNo: string;
  status: "GENERATED" | "PUBLISHED" | "BLOCKED_FEES";
  publishedAt: string;
  schedule: ExamScheduleItem[];
}

export interface HallTicketQueryView {
  id: number;
  hallTicketId: number;
  studentReg: string;
  studentName: string;
  message: string;
  status: "OPEN" | "RESOLVED";
  coeResponse?: string | null;
  respondedBy?: string | null;
  respondedAt?: string | null;
  createdAt: string;
}

export const hallTicketApi = {
  async getMyHallTickets(): Promise<StudentHallTicketView[]> {
    const res = await apiClient.get<StudentHallTicketView[]>("/student/hall-tickets");
    return res.data;
  },

  async submitQuery(hallTicketId: number, message: string): Promise<HallTicketQueryView> {
    const res = await apiClient.post<HallTicketQueryView>(`/student/hall-tickets/${hallTicketId}/queries`, {
      message,
    });
    return res.data;
  },

  async getMyQueries(): Promise<HallTicketQueryView[]> {
    const res = await apiClient.get<HallTicketQueryView[]>("/student/hall-tickets/queries");
    return res.data;
  },
};

