import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getReports, addPayment } from "@/lib/agreements";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_auth/overdue")({
  component: OverduePage,
});

function OverduePage() {
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getReports({ data: { type: "overdue" } });
    setOverdue(data as any[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMarkPaid(p: any) {
    try {
      await addPayment({
        data: {
          id: p.id,
          agreement_id: p.agreement_id,
          due_date: p.due_date,
          amount: p.amount,
          paid_amount: p.amount,
          status: "Paid",
          payment_date: new Date().toISOString().split("T")[0],
        },
      });
      toast.success("Payment recorded");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black">Overdue Payments</h1>
      <p className="mt-1 text-muted-foreground">Payments past their due date.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : overdue.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No overdue payments. Great work!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Agreement</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Period</th>
                  <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overdue.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link to="/admin/agreements/$agreementId" params={{ agreementId: p.agreement_no }} className="font-semibold hover:text-primary">
                        {p.agreement_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{p.first_name} {p.last_name}</td>
                    <td className="px-4 py-3">{p.period_label}</td>
                    <td className="px-4 py-3">{p.due_date}</td>
                    <td className="px-4 py-3 font-semibold">${p.amount}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleMarkPaid(p)} className="rounded-md bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600">
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{status}</span>;
}
