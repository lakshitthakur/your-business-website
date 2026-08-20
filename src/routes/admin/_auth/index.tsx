import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDashboardStats } from "@/lib/server/agreements";
import { DollarSign, FileText, Car, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/_auth/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Punjab Rentals" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getDashboardStats();
      setStats(data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-black">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Overview of your rental business.</p>

      {/* Stats Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Rentals"
          value={stats.active_rentals}
          icon={<Car className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Pending Agreements"
          value={stats.pending_agreements}
          icon={<FileText className="h-5 w-5" />}
          color="yellow"
        />
        <StatCard
          title="Available Vehicles"
          value={stats.available_vehicles}
          icon={<Car className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Payments Due (7d)"
          value={`$${stats.payments_due.total.toFixed(2)}`}
          subtitle={`${stats.payments_due.count} payments`}
          icon={<CreditCard className="h-5 w-5" />}
          color="blue"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Overdue Payments"
          value={`$${stats.overdue_payments.total.toFixed(2)}`}
          subtitle={`${stats.overdue_payments.count} overdue`}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <StatCard
          title="Weekly Revenue"
          value={`$${stats.weekly_revenue.toFixed(2)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Outstanding Balance"
          value={`$${stats.outstanding_balance.toFixed(2)}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Recent Agreements</h2>
          <div className="mt-4 space-y-3">
            {stats.recent_agreements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agreements yet.</p>
            ) : (
              stats.recent_agreements.map((a: any) => (
                <Link
                  key={a.agreement_no}
                  to="/admin/agreements/$agreementId"
                  params={{ agreementId: a.agreement_no }}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-secondary/50"
                >
                  <div>
                    <div className="font-semibold text-sm">{a.agreement_no}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.first_name} {a.last_name}
                      {a.vehicle && ` — ${a.year} ${a.make} ${a.model}`}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Recent Payments</h2>
          <div className="mt-4 space-y-3">
            {stats.recent_payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            ) : (
              stats.recent_payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <div className="font-semibold text-sm">{p.agreement_no}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.first_name} {p.last_name} — {p.period_label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">${p.paid_amount || p.amount}</div>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg border p-2 ${colors[color]}`}>{icon}</div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
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
    Paid: "bg-green-100 text-green-700",
    Overdue: "bg-red-100 text-red-700",
    "Partially Paid": "bg-yellow-100 text-yellow-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
