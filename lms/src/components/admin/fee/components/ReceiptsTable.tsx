import { useMemo, useState } from "react";
import { Printer, X } from "lucide-react";
import type { FeeTransaction, PaymentMethod } from "@/components/admin/types";
import type { Student } from "@/types/domain";

type Props = {
  transactions: FeeTransaction[];
  students: Student[]; // to fetch student details
  onViewReceipt?: (tx: FeeTransaction) => void; // optional callback
  canEditTransaction?: (tx: FeeTransaction) => boolean;
  onEditTransaction?: (
    txId: string,
    updates: { amount: number; method: PaymentMethod; collector: string; remarks: string }
  ) => void | Promise<void>;
};

// Helper to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const ReceiptsTable = ({
  transactions,
  students,
  canEditTransaction,
  onEditTransaction,
}: Props) => {
  const [selectedTx, setSelectedTx] = useState<FeeTransaction | null>(null);
  const [editingTx, setEditingTx] = useState<FeeTransaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState<PaymentMethod>("Cash");
  const [editCollector, setEditCollector] = useState("");
  const [editRemarks, setEditRemarks] = useState("");

  // Find student details for the selected transaction
  const studentDetails = selectedTx
    ? students.find((s) => s.id === selectedTx.studentId)
    : null;

  const editingStudent = useMemo(
    () => (editingTx ? students.find((s) => s.id === editingTx.studentId) : null),
    [editingTx, students]
  );

  // Generate a mock fee breakdown (in real app, this would come from the transaction or fee structure)
  const getFeeBreakdown = (amount: number) => {
    // Example breakdown – in practice, you'd store this in the transaction
    const tuition = Math.round(amount * 0.7);
    const transport = Math.round(amount * 0.15);
    const library = Math.round(amount * 0.05);
    const sports = amount - tuition - transport - library;
    return { tuition, transport, library, sports };
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !selectedTx || !studentDetails) return;
    const breakdown = getFeeBreakdown(selectedTx.amount);
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${selectedTx.receiptNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; }
            .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #ccc; padding: 2rem; }
            .header { text-align: center; margin-bottom: 2rem; }
            .header h1 { margin: 0; color: #333; }
            .header p { margin: 0.25rem 0; color: #666; }
            .details { margin-bottom: 1.5rem; }
            .details table { width: 100%; border-collapse: collapse; }
            .details td { padding: 0.25rem 0; }
            .breakdown { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
            .breakdown th, .breakdown td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
            .total { font-weight: bold; }
            .footer { text-align: center; margin-top: 2rem; color: #666; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>ASAS Academy</h1>
              <p>123 Education Street, Knowledge City</p>
              <p>Phone: (051) 123-4567 | Email: info@asas.edu</p>
            </div>
            <div class="details">
              <table>
                <tr><td><strong>Receipt No:</strong> ${selectedTx.receiptNo}</td><td><strong>Date:</strong> ${formatDate(selectedTx.transactionDate)}</td></tr>
                <tr><td><strong>Student Name:</strong> ${studentDetails.name}</td><td><strong>Class:</strong> ${studentDetails.grade}</td></tr>
                <tr><td><strong>Roll No:</strong> ${studentDetails.id}</td><td><strong>Guardian Name:</strong> ${studentDetails.guardian || "N/A"}</td></tr>
                <tr><td><strong>Contact:</strong> ${studentDetails.guardianPhone || studentDetails.phone || "N/A"}</td><td></td></tr>
              </table>
            </div>
            <table class="breakdown">
              <thead><tr><th>Description</th><th>Amount (Rs.)</th></tr></thead>
              <tbody>
                <tr><td>Tuition Fee</td><td>${breakdown.tuition.toLocaleString()}</td></tr>
                <tr><td>Transport Fee</td><td>${breakdown.transport.toLocaleString()}</td></tr>
                <tr><td>Library Fee</td><td>${breakdown.library.toLocaleString()}</td></tr>
                <tr><td>Sports Fee</td><td>${breakdown.sports.toLocaleString()}</td></tr>
                <tr class="total"><td><strong>Total Paid</strong></td><td><strong>Rs. ${selectedTx.amount.toLocaleString()}</strong></td></tr>
              </tbody>
            </table>
            <p><strong>Payment Method:</strong> ${selectedTx.method}</p>
            <p><strong>Transaction ID:</strong> ${selectedTx.id}</p>
            <div class="footer">
              <p>Thank you for your payment. This is a computer-generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="card card-elevated overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Receipts</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="data-table w-full min-w-[760px]">
          <thead>
            <tr>
              {["Date", "Receipt #", "Student", "Amount", "Method", "Actions"].map((head) => (
                <th
                  key={head}
                  className=""
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-sm text-muted-foreground text-center" colSpan={6}>
                  No receipts generated yet.
                </td>
              </tr>
            )}
            {transactions.slice(0, 10).map((tx) => (
              <tr key={tx.id}>
                <td className="px-4 py-2 text-sm">{formatDate(tx.transactionDate)}</td>
                <td className="px-4 py-2 text-sm font-mono">{tx.receiptNo}</td>
                <td className="px-4 py-2 text-sm">{tx.studentName}</td>
                <td className="px-4 py-2 text-sm font-semibold">
                  Rs. {tx.amount.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm">{tx.method}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="btn-outline btn-sm inline-flex items-center gap-1"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      View Receipt
                    </button>
                    {canEditTransaction?.(tx) && (
                      <button
                        onClick={() => {
                          setEditingTx(tx);
                          setEditAmount(String(tx.amount));
                          setEditMethod(tx.method);
                          setEditCollector(tx.collector);
                          setEditRemarks(tx.remarks || "");
                        }}
                        className="btn-secondary btn-sm inline-flex items-center gap-1"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedTx && studentDetails && (
        <div className="modal-overlay p-4">
          <div className="modal max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Fee Receipt</h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="btn-ghost btn-icon text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-6 space-y-4">
              {/* Academy Header */}
              <div className="text-center border-b border-border pb-4">
                <h2 className="text-2xl font-bold text-foreground">ASAS Academy</h2>
                <p className="text-sm text-muted-foreground">
                  123 Education Street, Knowledge City
                </p>
                <p className="text-sm text-muted-foreground">
                  Phone: (051) 123-4567 | Email: info@asas.edu
                </p>
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Receipt No:</p>
                  <p className="font-semibold text-foreground">{selectedTx.receiptNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date:</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(selectedTx.transactionDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Student Name:</p>
                  <p className="font-semibold text-foreground">{studentDetails.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Class:</p>
                  <p className="font-semibold text-foreground">{studentDetails.grade}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Roll No:</p>
                  <p className="font-semibold text-foreground">
                    {studentDetails.id}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Guardian Name:</p>
                  <p className="font-semibold text-foreground">
                    {studentDetails.guardian || "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Contact:</p>
                  <p className="font-semibold text-foreground">
                    {studentDetails.guardianPhone || studentDetails.phone || "N/A"}
                  </p>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount (Rs.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const breakdown = getFeeBreakdown(selectedTx.amount);
                      return (
                        <>
                          <tr className="border-t border-border">
                            <td className="px-4 py-2 text-sm">Tuition Fee</td>
                            <td className="px-4 py-2 text-sm font-medium">
                              {breakdown.tuition.toLocaleString()}
                            </td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-4 py-2 text-sm">Transport Fee</td>
                            <td className="px-4 py-2 text-sm font-medium">
                              {breakdown.transport.toLocaleString()}
                            </td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-4 py-2 text-sm">Library Fee</td>
                            <td className="px-4 py-2 text-sm font-medium">
                              {breakdown.library.toLocaleString()}
                            </td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-4 py-2 text-sm">Sports Fee</td>
                            <td className="px-4 py-2 text-sm font-medium">
                              {breakdown.sports.toLocaleString()}
                            </td>
                          </tr>
                          <tr className="border-t border-border bg-muted/20">
                            <td className="px-4 py-2 text-sm font-semibold">Total Paid</td>
                            <td className="px-4 py-2 text-sm font-bold text-primary">
                              Rs. {selectedTx.amount.toLocaleString()}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Payment Info */}
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Payment Method:</span>{" "}
                  <span className="font-medium">{selectedTx.method}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Transaction ID:</span>{" "}
                  <span className="font-mono text-xs">
                    {selectedTx.id}
                  </span>
                </p>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
                <p>Thank you for your payment. This is a computer-generated receipt.</p>
              </div>
            </div>

            {/* Modal Footer with Print Button */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTx && editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-xl w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Edit Fee Transaction</h3>
              <button
                onClick={() => setEditingTx(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-muted-foreground">
                {editingStudent.name} · {editingStudent.grade} · {editingTx.receiptNo}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Method</label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Collector</label>
                  <input
                    value={editCollector}
                    onChange={(e) => setEditCollector(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Remarks</label>
                  <input
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => setEditingTx(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amount = Number(editAmount);
                  if (!Number.isFinite(amount) || amount < 0) return;
                  void Promise.resolve(
                    onEditTransaction?.(editingTx.id, {
                      amount,
                      method: editMethod,
                      collector: editCollector,
                      remarks: editRemarks,
                    }),
                  ).then(() => {
                    setEditingTx(null);
                  });
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceiptsTable;
