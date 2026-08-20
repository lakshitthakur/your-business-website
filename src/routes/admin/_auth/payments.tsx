import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAgreements, addPayment, markOverduePayments } from "@/lib/server/agreements";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_auth/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await listAgreements({ data: { status: "Active" } });
    setAgreements(data as any[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMarkOverdue() {
    const result = await markOverduePayments();
    toast.success(`${result.updated} payments marked as overdue`);
    await load();
  }

  async function handleMarkPaid(payment: any) {
    try {
      await addPayment({
        data: {
          id: payment.id,
          agreement_id: payment.agreement_id,
          due_date: payment.due_date,
          amount: payment.amount,
          paid_amount: payment.amount,
          status: "Paid",
          payment_date: new Date().toISOString().split("T")[0],
        },
      });
      toast.success("Payment marked as paid");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Payments</h1>
          <p className="mt-1 text-muted-foreground">Weekly payments for all active rentals.</p>
        </div>
        <button onClick={handleMarkOverdue} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
          Mark Overdue
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : agreements.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No active rentals with payments.</div>
        ) : (
          agreements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <Link to="/admin/agreements/$agreementId" params={{ agreementId: a.agreement_no }} className="font-bold hover:text-primary">
                  {a.agreement_no} — {a.first_name} {a.last_name}
                </Link>
                <span className="text-sm text-muted-foreground">Outstanding: <span className="font-semibold">${a.outstanding || 0}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Period</th>
                      <th className="px-4 py-2 text-left font-medium">Due Date</th>
                      <th className="px-4 py-2 text-left font-medium">Amount</th>
                      <th className="px-4 py-2 text-left font-medium">Paid</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {a.payments?.map((p: any) => (
                      <tr key={p.id} className="hover:bg-secondary/30">
                        <td className="px-4 py-2">{p.period_label}</td>
                        <td className="px-4 py-2">{p.due_date}</td>
                        <td className="px-4 py-2">${p.amount}</td>
                        <td className="px-4 py-2">${p.paid_amount || 0}</td>
                        <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-2">
                          {(p.status === "Pending" || p.status === "Overdue") && (
                            <button onClick={() => handleMarkPaid(p)} className="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600">
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Paid: "bg-green-100 text-green-700",
    "Partially Paid": "bg-blue-100 text-blue-700",
    Overdue: "bg-red-100 text-red-700",
    Waived: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
}