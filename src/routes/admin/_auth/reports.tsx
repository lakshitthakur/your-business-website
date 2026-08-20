import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getReports } from "@/lib/agreements";

export const Route = createFileRoute("/admin/_auth/reports")({
  component: ReportsPage,
});

type ReportType = "weekly_revenue" | "monthly_revenue" | "outstanding" | "overdue" | "vehicle_utilization";

function ReportsPage() {
  const [type, setType] = useState<ReportType>("weekly_revenue");
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const result = await getReports({ data: { type, from, to } });
    setData(result as any[]);
    setLoading(false);
  }

  function exportCsv() {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => row[h]).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Reports</h1>
          <p className="mt-1 text-muted-foreground">Business reports and analytics.</p>
        </div>
        <button onClick={exportCsv} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary">
          Export CSV
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm font-medium">Report Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="weekly_revenue">Weekly Revenue</option>
            <option value="monthly_revenue">Monthly Revenue</option>
            <option value="outstanding">Outstanding Payments</option>
            <option value="overdue">Overdue Payments</option>
            <option value="vehicle_utilization">Vehicle Utilization</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <button onClick={load} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Run Report
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No data. Click "Run Report" to generate.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  {Object.keys(data[0]).map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium capitalize">{h.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    {Object.values(row).map((v: any, j) => (
                      <td key={j} className="px-4 py-3">{typeof v === "number" ? v.toLocaleString() : v}</td>
                    ))}
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
