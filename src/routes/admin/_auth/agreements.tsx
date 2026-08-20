import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAgreements, updateAgreement, approveAgreement, activateAgreement, addNote } from "@/lib/agreements";
import { toast } from "sonner";
import { Search, Filter, Eye, Check, X, Play } from "lucide-react";

export const Route = createFileRoute("/admin/_auth/agreements")({
  head: () => ({
    meta: [
      { title: "Agreements — Punjab Rentals Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgreementsPage,
});

function AgreementsPage() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);
    const data = await listAgreements({ data: { search: search || undefined, status: statusFilter || undefined } });
    setAgreements(data as any[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function handleSearch() {
    await load();
  }

  async function handleApprove(id: string) {
    if (!confirm("Approve this agreement?")) return;
    try {
      await approveAgreement({ data: { id } });
      toast.success("Agreement approved");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleActivate(id: string) {
    if (!confirm("Activate this agreement? This will generate weekly payments.")) return;
    try {
      const result = await activateAgreement({ data: { id } });
      toast.success(`Agreement activated. ${result.payments_generated} payments generated.`);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleReject(id: string) {
    if (!confirm("Reject this agreement?")) return;
    try {
      await updateAgreement({ data: { id, status: "Rejected" } });
      toast.success("Agreement rejected");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Agreements</h1>
          <p className="mt-1 text-muted-foreground">Manage all rental agreements.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by agreement #, customer, email, phone..."
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button
          onClick={handleSearch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : agreements.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No agreements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Agreement #</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Start Date</th>
                  <th className="px-4 py-3 text-left font-medium">Weekly Rate</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agreements.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-semibold">{a.agreement_no}</td>
                    <td className="px-4 py-3">
                      <div>{a.first_name} {a.last_name}</div>
                      <div className="text-xs text-muted-foreground">{a.email || a.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      {a.registration ? (
                        <div>
                          <div>{a.year} {a.make} {a.model}</div>
                          <div className="text-xs text-muted-foreground">{a.registration}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{a.rental_start || "TBC"}</td>
                    <td className="px-4 py-3">${a.rental_amount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/agreements/$agreementId"
                          params={{ agreementId: a.agreement_no }}
                          className="rounded-md border border-border p-1.5 hover:bg-secondary"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {a.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(a.id)}
                              className="rounded-md bg-green-500 p-1.5 text-white hover:bg-green-600"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReject(a.id)}
                              className="rounded-md bg-red-500 p-1.5 text-white hover:bg-red-600"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {a.status === "Approved" && (
                          <button
                            onClick={() => handleActivate(a.id)}
                            className="rounded-md bg-blue-500 p-1.5 text-white hover:bg-blue-600"
                            title="Activate"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
  const colors: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-blue-100 text-blue-700",
    Active: "bg-green-100 text-green-700",
    Completed: "bg-gray-100 text-gray-700",
    Rejected: "bg-red-100 text-red-700",
    Cancelled: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
