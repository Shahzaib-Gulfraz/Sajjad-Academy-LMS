import { useEffect, useMemo, useState } from "react";
import type { Student } from "@/types/domain";
import type { FeeTransaction, PaymentMethod } from "@/components/admin/types";
import { toast } from "sonner";
import FeeSearch from "./components/FeeSearch";
import FeeSummaryCards from "./components/FeeSummaryCards";
import FeeTable from "./components/FeeTable";
import ReceiptsTable from "./components/ReceiptsTable";
import StudentOverviewCard from "./components/StudentOverviewCard";
import type { FeeManagementProps } from "./types/fee";
import { generateReceiptNo, getEnrolledCourses, studentCode, viewReceipt } from "./utils/feeUtils";

const FeeManagement = ({
  students,
  transactions = [],
  onStudentsChange,
  onRecordTransaction,
  onUpdateTransaction,
  onAssignDue,
  onTransactionsChange,
  onAuditLog,
  currentAdmin = "Admin User",
  showPendingOnly = false,
}: FeeManagementProps) => {
  const [query, setQuery] = useState("");
  const [receiptQuery, setReceiptQuery] = useState("");
  const [paymentMap, setPaymentMap] = useState<Record<number, string>>({});
  const [methodMap, setMethodMap] = useState<Record<number, PaymentMethod>>({});
  const [collectorMap, setCollectorMap] = useState<Record<number, string>>({});
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
  const [dueMap, setDueMap] = useState<Record<number, string>>({});
  const [periodMap, setPeriodMap] = useState<Record<number, string>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [pendingOnly, setPendingOnly] = useState(showPendingOnly);

  useEffect(() => {
    setPendingOnly(showPendingOnly);
  }, [showPendingOnly]);

  const pendingStudents = useMemo(
    () => students.filter((s) => s.fees.pending > 0),
    [students]
  );

  const totalPending = pendingStudents.reduce((sum, s) => sum + s.fees.pending, 0);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = pendingOnly ? pendingStudents : students;
    if (!q) return base;

    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        studentCode(s.id).toLowerCase().includes(q)
    );
  }, [query, pendingStudents, pendingOnly, students]);

  const selectedStudent = useMemo(() => {
    if (selectedStudentId !== null) {
      return filteredStudents.find((s) => s.id === selectedStudentId) || null;
    }
    if (filteredStudents.length === 1) return filteredStudents[0];
    return null;
  }, [filteredStudents, selectedStudentId]);

  const filteredTransactions = useMemo(() => {
    const q = receiptQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.receiptNo.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q)
    );
  }, [receiptQuery, transactions]);

  const selectedStudentTransactions = useMemo(() => {
    if (!selectedStudent) return [];
    return filteredTransactions.filter((tx) => tx.studentId === selectedStudent.id);
  }, [filteredTransactions, selectedStudent]);

  const applyPayment = async (studentId: number) => {
    const amount = Number(paymentMap[studentId] || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    const target = students.find((s) => s.id === studentId);
    if (!target) {
      toast.error("Student not found");
      return;
    }
    if (target.fees.pending <= 0) {
      toast.info("Student has no pending fee");
      return;
    }

    const applied = Math.min(amount, target.fees.pending);
    const method = methodMap[studentId] || "Cash";
    const collector = (collectorMap[studentId] || currentAdmin).trim() || currentAdmin;
    const remarks = (remarksMap[studentId] || "").trim();

    const nextTransaction: FeeTransaction = {
      id: `${Date.now()}-${studentId}`,
      receiptNo: generateReceiptNo(),
      studentId: target.id,
      studentName: target.name,
      className: target.grade,
      amount: applied,
      method,
      collector,
      remarks,
      transactionDate: new Date().toISOString(),
    };

    try {
      await onRecordTransaction?.(nextTransaction);
    } catch {
      toast.error("Failed to record payment on server");
      return;
    }

    if (!onRecordTransaction) {
      const next = students.map((s) => {
        if (s.id !== studentId) return s;

        const pending = Math.max(0, s.fees.pending - applied);
        const paid = s.fees.paid + applied;
        const status = pending === 0 ? "Paid" : "Partial";

        return {
          ...s,
          fees: {
            ...s.fees,
            paid,
            pending,
            status,
          },
        };
      });
      onStudentsChange(next);
    }
    setPaymentMap((prev) => ({ ...prev, [studentId]: "" }));
    setRemarksMap((prev) => ({ ...prev, [studentId]: "" }));

    if (!onRecordTransaction) {
      onTransactionsChange?.([nextTransaction, ...transactions]);
    }
    onAuditLog?.({
      actor: currentAdmin,
      module: "Fee",
      action: "Recorded Fee Payment",
      details: `${target.name} (${studentCode(target.id)}) paid Rs. ${applied.toLocaleString()} via ${method}.`,
    });
    toast.success(`Payment recorded: Rs. ${applied.toLocaleString()}`);
  };

  const isCurrentMonth = (dateString: string) => {
    const date = new Date(dateString);
    if (!Number.isFinite(date.getTime())) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const updateTransaction = (
    txId: string,
    updates: { amount: number; method: PaymentMethod; collector: string; remarks: string }
  ) => {
    const existing = transactions.find((tx) => tx.id === txId);
    if (!existing) return;
    if (!isCurrentMonth(existing.transactionDate)) {
      toast.error("Only current month transactions can be edited.");
      return;
    }

    const target = students.find((s) => s.id === existing.studentId);
    if (!target) {
      toast.error("Student not found for this transaction.");
      return;
    }

    const delta = updates.amount - existing.amount;
    const nextPaid = target.fees.paid + delta;
    const nextPending = target.fees.pending - delta;
    if (nextPaid < 0 || nextPending < 0 || nextPaid > target.fees.total) {
      toast.error("Updated amount is out of allowed range.");
      return;
    }

    if (onUpdateTransaction) {
      void Promise.resolve(onUpdateTransaction(txId, updates))
        .then(() => {
          onAuditLog?.({
            actor: currentAdmin,
            module: "Fee",
            action: "Edited Fee Transaction",
            details: `${existing.studentName} transaction edited. Amount: Rs. ${existing.amount.toLocaleString()} -> Rs. ${updates.amount.toLocaleString()}.`,
          });
          toast.success("Transaction updated.");
        })
        .catch(() => {
          toast.error("Failed to update transaction on server.");
        });
      return;
    }

    const nextStudents = students.map((s) => {
      if (s.id !== target.id) return s;
      const status = nextPending === 0 ? "Paid" : nextPaid > 0 ? "Partial" : "Pending";
      return {
        ...s,
        fees: {
          ...s.fees,
          paid: nextPaid,
          pending: nextPending,
          status,
        },
      };
    });
    onStudentsChange(nextStudents);

    const nextTransactions = transactions.map((tx) =>
      tx.id === txId
        ? {
            ...tx,
            amount: updates.amount,
            method: updates.method,
            collector: updates.collector,
            remarks: updates.remarks,
          }
        : tx
    );
    onTransactionsChange?.(nextTransactions);
    onAuditLog?.({
      actor: currentAdmin,
      module: "Fee",
      action: "Edited Fee Transaction",
      details: `${existing.studentName} transaction edited. Amount: Rs. ${existing.amount.toLocaleString()} -> Rs. ${updates.amount.toLocaleString()}.`,
    });
    toast.success("Transaction updated.");
  };

  const markAsPaid = async (studentId: number) => {
    const target = students.find((s) => s.id === studentId);
    if (!target || target.fees.pending <= 0) return;
    const fullAmount = target.fees.pending;
    const method = methodMap[studentId] || "Cash";
    const collector = (collectorMap[studentId] || currentAdmin).trim() || currentAdmin;
    const remarks = (remarksMap[studentId] || "").trim();

    const nextTransaction: FeeTransaction = {
      id: `${Date.now()}-${studentId}`,
      receiptNo: generateReceiptNo(),
      studentId: target.id,
      studentName: target.name,
      className: target.grade,
      amount: fullAmount,
      method,
      collector,
      remarks: remarks || "Marked fully paid",
      transactionDate: new Date().toISOString(),
    };

    try {
      await onRecordTransaction?.(nextTransaction);
    } catch {
      toast.error("Failed to record payment on server");
      return;
    }

    if (!onRecordTransaction) {
      const next = students.map((s) => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          fees: {
            ...s.fees,
            paid: s.fees.paid + s.fees.pending,
            pending: 0,
            status: "Paid",
          },
        };
      });
      onStudentsChange(next);
    }
    setPaymentMap((prev) => ({ ...prev, [studentId]: "" }));
    setRemarksMap((prev) => ({ ...prev, [studentId]: "" }));

    if (!onRecordTransaction) {
      onTransactionsChange?.([nextTransaction, ...transactions]);
    }
    onAuditLog?.({
      actor: currentAdmin,
      module: "Fee",
      action: "Marked Fee Fully Paid",
      details: `${target.name} (${studentCode(target.id)}) marked paid with Rs. ${fullAmount.toLocaleString()}.`,
    });
    toast.success("Student marked as fully paid");
  };

  const assignDue = async (studentId: number) => {
    const amountDue = Number(dueMap[studentId] || 0);
    if (!Number.isFinite(amountDue) || amountDue < 0) {
      toast.error("Enter a valid due amount");
      return;
    }
    if (!Number.isInteger(amountDue)) {
      toast.error("Due amount must be a whole number");
      return;
    }

    const period = (periodMap[studentId] || new Date().toISOString().slice(0, 7)).trim();
    if (!/^\d{4}-\d{2}$/.test(period)) {
      toast.error("Period must be in YYYY-MM format");
      return;
    }

    const target = students.find((s) => s.id === studentId);
    if (!target) {
      toast.error("Student not found");
      return;
    }

    try {
      await onAssignDue?.({ studentId, period, amountDue });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to assign due on server";
      toast.error(message);
      return;
    }

    setDueMap((prev) => ({ ...prev, [studentId]: "" }));
    onAuditLog?.({
      actor: currentAdmin,
      module: "Fee",
      action: "Assigned Fee Due",
      details: `${target.name} (${studentCode(target.id)}) due set to Rs. ${amountDue.toLocaleString()} for ${period}.`,
    });
    toast.success("Due updated successfully");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="section-header mb-0">
        <div>
          <h1 className="section-title">Fee Management</h1>
          <p className="section-subtitle">Track dues, collect payments, and review receipts.</p>
        </div>
      </div>

      <FeeSummaryCards
        pendingCount={pendingStudents.length}
        totalPending={totalPending}
        totalStudents={pendingOnly ? pendingStudents.length : students.length}
        onShowPendingOnly={() => setPendingOnly(true)}
      />

      <FeeSearch
        query={query}
        receiptQuery={receiptQuery}
        onQueryChange={setQuery}
        onReceiptQueryChange={setReceiptQuery}
      />

      {selectedStudent && (
        <>
          <StudentOverviewCard student={selectedStudent} />

          <div className="card card-elevated p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Fee Form</h3>
                <p className="text-sm text-muted-foreground">
                  Collect fee for {selectedStudent.name} ({studentCode(selectedStudent.id)})
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Pending: Rs. {selectedStudent.fees.pending.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="input-label text-xs">Period (YYYY-MM)</label>
                <input
                  value={periodMap[selectedStudent.id] || new Date().toISOString().slice(0, 7)}
                  onChange={(e) =>
                    setPeriodMap((prev) => ({ ...prev, [selectedStudent.id]: e.target.value }))
                  }
                  placeholder="2026-04"
                  className="input-modern mt-1"
                />
              </div>
              <div>
                <label className="input-label text-xs">Set Due (Rs.)</label>
                <input
                  value={dueMap[selectedStudent.id] || ""}
                  onChange={(e) =>
                    setDueMap((prev) => ({ ...prev, [selectedStudent.id]: e.target.value }))
                  }
                  placeholder="e.g. 15000"
                  className="input-modern mt-1"
                />
              </div>
              <div>
                <label className="input-label text-xs">Amount</label>
                <input
                  value={paymentMap[selectedStudent.id] || ""}
                  onChange={(e) =>
                    setPaymentMap((prev) => ({ ...prev, [selectedStudent.id]: e.target.value }))
                  }
                  placeholder="Amount"
                  className="input-modern mt-1"
                />
              </div>
              <div>
                <label className="input-label text-xs">Method</label>
                <select
                  value={methodMap[selectedStudent.id] || "Cash"}
                  onChange={(e) =>
                    setMethodMap((prev) => ({
                      ...prev,
                      [selectedStudent.id]: e.target.value as PaymentMethod,
                    }))
                  }
                  className="select-modern mt-1"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank</option>
                  <option value="Online">Online</option>
                </select>
              </div>
              <div>
                <label className="input-label text-xs">Collector</label>
                <input
                  value={collectorMap[selectedStudent.id] ?? currentAdmin}
                  onChange={(e) =>
                    setCollectorMap((prev) => ({ ...prev, [selectedStudent.id]: e.target.value }))
                  }
                  placeholder="Collector"
                  className="input-modern mt-1"
                />
              </div>
              <div>
                <label className="input-label text-xs">Remarks</label>
                <input
                  value={remarksMap[selectedStudent.id] || ""}
                  onChange={(e) =>
                    setRemarksMap((prev) => ({ ...prev, [selectedStudent.id]: e.target.value }))
                  }
                  placeholder="Remarks"
                  className="input-modern mt-1"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => {
                  void assignDue(selectedStudent.id);
                }}
                className="btn-outline"
              >
                Set Due
              </button>
              <button
                onClick={() => {
                  void applyPayment(selectedStudent.id);
                }}
                className="btn-primary"
                disabled={selectedStudent.fees.pending <= 0}
              >
                Submit Fee
              </button>
              <button
                onClick={() => {
                  void markAsPaid(selectedStudent.id);
                }}
                className="btn-secondary"
                disabled={selectedStudent.fees.pending <= 0}
              >
                Mark Paid
              </button>
            </div>
          </div>

          <div className="card card-elevated p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Past Transactions
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent.name} · {studentCode(selectedStudent.id)}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Courses:{" "}
                {getEnrolledCourses(selectedStudent).length > 0
                  ? getEnrolledCourses(selectedStudent).join(", ")
                  : "No courses available"}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table min-w-[720px]">
                <thead>
                  <tr>
                    {["Date", "Receipt #", "Amount", "Method", "Collector", "Remarks"].map(
                      (head) => (
                        <th key={head}>
                          {head}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {selectedStudentTransactions.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-4 text-sm text-muted-foreground text-center"
                        colSpan={6}
                      >
                        No transactions found for this student.
                      </td>
                    </tr>
                  ) : (
                    selectedStudentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          {new Date(tx.transactionDate).toLocaleDateString("en-PK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="font-mono">{tx.receiptNo}</td>
                        <td className="font-semibold">
                          Rs. {tx.amount.toLocaleString()}
                        </td>
                        <td>{tx.method}</td>
                        <td>{tx.collector}</td>
                        <td>
                          {tx.remarks || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <FeeTable
        students={filteredStudents}
        selectedStudentId={selectedStudentId}
        paymentMap={paymentMap}
        methodMap={methodMap}
        collectorMap={collectorMap}
        remarksMap={remarksMap}
        currentAdmin={currentAdmin}
        showInlineControls={false}
        onSelectStudent={setSelectedStudentId}
        onPaymentChange={(studentId, value) =>
          setPaymentMap((prev) => ({ ...prev, [studentId]: value }))
        }
        onMethodChange={(studentId, value) =>
          setMethodMap((prev) => ({ ...prev, [studentId]: value }))
        }
        onCollectorChange={(studentId, value) =>
          setCollectorMap((prev) => ({ ...prev, [studentId]: value }))
        }
        onRemarksChange={(studentId, value) =>
          setRemarksMap((prev) => ({ ...prev, [studentId]: value }))
        }
        onApplyPayment={applyPayment}
        onMarkPaid={markAsPaid}
      />

      <ReceiptsTable
        transactions={filteredTransactions}
        students={students}
        onViewReceipt={viewReceipt}
        canEditTransaction={(tx) => isCurrentMonth(tx.transactionDate)}
        onEditTransaction={updateTransaction}
      />
    </div>
  );
};

export default FeeManagement;
