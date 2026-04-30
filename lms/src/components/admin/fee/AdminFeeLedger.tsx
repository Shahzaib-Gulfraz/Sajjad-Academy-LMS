import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { FeeTransaction } from "@/components/admin/types";

interface Props {
  transactions: FeeTransaction[];
}

const AdminFeeLedger = ({ transactions }: Props) => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.studentName.toLowerCase().includes(q) ||
        String(tx.studentId).includes(q) ||
        tx.receiptNo.toLowerCase().includes(q) ||
        tx.collector.toLowerCase().includes(q)
    );
  }, [query, transactions]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, tx) => {
          acc.amount += tx.amount;
          return acc;
        },
        { amount: 0 }
      ),
    [filtered]
  );

  const printReceipt = (tx: FeeTransaction) => {
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

    const printWindow = window.open("", "_blank", "width=700,height=700");
    if (!printWindow) return;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Fee Ledger & Receipts</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold text-success">Rs. {totals.amount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Last Transaction</p>
          <p className="text-sm font-semibold text-foreground">
            {filtered[0] ? new Date(filtered[0].transactionDate).toLocaleString() : "N/A"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student, ID, receipt or collector"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Date", "Receipt", "Student", "Class", "Amount", "Method", "Collector", "Actions"].map(
                (head) => (
                  <th key={head} className="px-4 py-2 text-left text-xs text-muted-foreground">
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-sm text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            )}
            {filtered.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-sm">
                  {new Date(tx.transactionDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-sm">{tx.receiptNo}</td>
                <td className="px-4 py-2 text-sm">
                  {tx.studentName}
                  <p className="text-xs text-muted-foreground">STU-{String(tx.studentId).padStart(4, "0")}</p>
                </td>
                <td className="px-4 py-2 text-sm">{tx.className}</td>
                <td className="px-4 py-2 text-sm font-semibold">Rs. {tx.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm">{tx.method}</td>
                <td className="px-4 py-2 text-sm">{tx.collector}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => printReceipt(tx)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFeeLedger;
