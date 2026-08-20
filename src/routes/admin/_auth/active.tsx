import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAgreements } from "@/lib/agreements";

export const Route = createFileRoute("/admin/_auth/active")({
  component: ActiveRentalsPage,
});

function ActiveRentalsPage() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await listAgreements({ data: { status: "Active" } });
      setAgreements(data as any[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-black">Active Rentals</h1>
      <p className="mt-1 text-muted-foreground">Currently active rental agreements.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : agreements.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No active rentals.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Agreement</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Start</th>
                  <th className="px-4 py-3 text-left font-medium">End</th>
                  <th className="px-4 py-3 text-left font-medium">Weekly Rate</th>
                  <th className="px-4 py-3 text-left font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agreements.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link to="/admin/agreements/$agreementId" params={{ agreementId: a.agreement_no }} className="font-semibold hover:text-primary">
                        {a.agreement_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{a.first_name} {a.last_name}</td>
                    <td className="px-4 py-3">{a.registration || "Not assigned"}</td>
                    <td className="px-4 py-3">{a.rental_start}</td>
                    <td className="px-4 py-3">{a.rental_end}</td>
                    <td className="px-4 py-3">${a.rental_amount}</td>
                    <td className="px-4 py-3 font-semibold">${a.outstanding || 0}</td>
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
