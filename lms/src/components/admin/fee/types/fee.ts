import type { Student } from "@/types/domain";
import type { AuditLogEntry, FeeTransaction } from "@/components/admin/types";

export type FeeManagementProps = {
  students: Student[];
  transactions?: FeeTransaction[];
  onStudentsChange: (next: Student[]) => void;
  onRecordTransaction?: (transaction: FeeTransaction) => void | Promise<void>;
  onUpdateTransaction?: (
    txId: string,
    updates: { amount: number; method: FeeTransaction["method"]; collector: string; remarks: string },
  ) => Promise<void> | void;
  onAssignDue?: (args: {
    studentId: number;
    period: string;
    amountDue: number;
  }) => Promise<void> | void;
  onTransactionsChange?: (next: FeeTransaction[]) => void;
  onAuditLog?: (entry: Omit<AuditLogEntry, "id" | "createdAt">) => void;
  currentAdmin?: string;
  showPendingOnly?: boolean;
};
