export type PaymentMethod = "Cash" | "Card" | "Bank Transfer" | "Online";

export interface FeeTransaction {
  id: string;
  receiptNo: string;
  studentId: number;
  studentName: string;
  className: string;
  amount: number;
  method: PaymentMethod;
  collector: string;
  remarks: string;
  transactionDate: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  module: "Fee" | "Student" | "Teacher" | "Security";
  action: string;
  details: string;
  createdAt: string;
}

export interface SmartAlert {
  id: string;
  type: "fee" | "attendance" | "assignment" | "announcement";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  createdAt: string;
}

export interface PlannerAllocation {
  id: string;
  day?: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  startDate?: string;
  endDate?: string;
  date?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  className: string;
  subject: string;
  teacherId: number;
  teacherName: string;
}
