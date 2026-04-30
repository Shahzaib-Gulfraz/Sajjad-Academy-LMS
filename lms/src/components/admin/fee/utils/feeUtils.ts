import type { Student } from "@/types/domain";
import type { FeeTransaction } from "@/components/admin/types";

export const studentCode = (id: number) => `STU-${String(id).padStart(4, "0")}`;

export const getEnrolledCourses = (student: Student) => {
  const fromTests = student.tests.map((test) => test.subject);
  const fromAssignments = student.assignments.map((assignment) => assignment.subject);
  return Array.from(new Set([...fromTests, ...fromAssignments]));
};

export const generateReceiptNo = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `RCPT-${datePart}-${suffix}`;
};

export const viewReceipt = (tx: FeeTransaction) => {
  const receiptHtml = `
      <html>
      <head>
        <title>${tx.receiptNo}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h2 { margin-bottom: 12px; }
          .row { margin: 8px 0; }
          .label { font-weight: 700; display: inline-block; width: 150px; }
          .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; max-width: 520px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Fee Receipt</h2>
          <div class="row"><span class="label">Receipt No:</span> ${tx.receiptNo}</div>
          <div class="row"><span class="label">Date:</span> ${new Date(tx.transactionDate).toLocaleString()}</div>
          <div class="row"><span class="label">Student:</span> ${tx.studentName}</div>
          <div class="row"><span class="label">Student ID:</span> STU-${String(tx.studentId).padStart(4, "0")}</div>
          <div class="row"><span class="label">Class:</span> ${tx.className}</div>
          <div class="row"><span class="label">Amount Paid:</span> Rs. ${tx.amount.toLocaleString()}</div>
          <div class="row"><span class="label">Payment Method:</span> ${tx.method}</div>
          <div class="row"><span class="label">Collected By:</span> ${tx.collector}</div>
          <div class="row"><span class="label">Remarks:</span> ${tx.remarks || "-"}</div>
        </div>
      </body>
      </html>
    `;

  const receiptWindow = window.open("", "_blank", "width=700,height=700");
  if (!receiptWindow) return;
  receiptWindow.document.write(receiptHtml);
  receiptWindow.document.close();
  receiptWindow.focus();
  setTimeout(() => {
    receiptWindow.print();
  }, 200);
};
