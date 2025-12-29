import { Invoice } from "@/lib/types";

export interface AttendanceRecord {
  name: string;
  present_day: number;
  total_day?: number;
  absent_day?: number;
}

export interface ProcessedResult {
  extracted_data: AttendanceRecord[];
}

export interface RecentInvoice {
  _id?: string;
  id?: string;
  invoiceNumber?: string;
  companyId?: string | { _id?: string; name?: string };
  companyName?: string;
  employeeCount?: number;
  billDetails?: {
    totalAmount: number;
  };
  attendanceData?: {
    totalEmployees: number;
    totalPresentDays: number;
    perDayRate: number;
  };
  createdAt?: string | Date;
  status?: "draft" | "sent" | "paid" | string;
  fileUrl?: string;
  cloudinaryPublicId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}
