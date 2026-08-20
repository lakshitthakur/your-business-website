import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAuditLogs } from "@/lib/server/agreements";

export const Route = createFileRoute("/admin/_auth/audit")({
  component: AuditPage,
});

function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getAuditLogs({ data: {} });
      setLogs(data as any[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-black">Audit Logs</h1>
      <p className="mt-1 text-muted-foreground">All administrative actions.</p>

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No audit logs yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Entity</th>
                  <th className="px-4 py-3 text-left font-medium">Entity ID</th>
                  <th className="px-4 py-3 text-left font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium">{l.action}</td>
                    <td className="px-4 py-3">{l.entity_type || "—"}</td>
                    <td className="px-4 py-3 text-xs">{l.entity_id ? l.entity_id.slice(0, 8) + "…" : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.details || "—"}</td>
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