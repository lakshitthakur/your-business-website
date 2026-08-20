import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listCustomers } from "@/lib/server/customers";

export const Route = createFileRoute("/admin/_auth/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const data = await listCustomers({ data: { search: search || undefined } });
    setCustomers(data as any[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-black">Customers</h1>
      <p className="mt-1 text-muted-foreground">All registered customers.</p>

      <div className="mt-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search customers..."
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Licence</th>
                  <th className="px-4 py-3 text-left font-medium">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-semibold">{c.first_name} {c.last_name}</td>
                    <td className="px-4 py-3">{c.email || "N/A"}</td>
                    <td className="px-4 py-3">{c.phone || "N/A"}</td>
                    <td className="px-4 py-3">{c.licence_number || "N/A"}</td>
                    <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
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
