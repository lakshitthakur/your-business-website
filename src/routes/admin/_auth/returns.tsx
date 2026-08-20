import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAgreements, recordReturn } from "@/lib/agreements";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/_auth/returns")({
  component: ReturnsPage,
});

function ReturnsPage() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().split("T")[0],
    return_odometer: 0,
    return_fuel_level: "Full",
    return_damage: "",
    return_cleaning: "",
    return_missing_items: "",
    return_notes: "",
    bond_status: "held",
    bond_deductions: 0,
  });

  async function load() {
    setLoading(true);
    const data = await listAgreements({ data: { status: "Active" } });
    setAgreements(data as any[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSelect(a: any) {
    setSelected(a);
    setReturnForm({
      return_date: new Date().toISOString().split("T")[0],
      return_odometer: a.pickup_odometer || 0,
      return_fuel_level: "Full",
      return_damage: "",
      return_cleaning: "",
      return_missing_items: "",
      return_notes: "",
      bond_status: "held",
      bond_deductions: 0,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const result = await recordReturn({
        data: {
          agreement_id: selected.id,
          return_date: returnForm.return_date,
          return_odometer: returnForm.return_odometer,
          return_fuel_level: returnForm.return_fuel_level,
          return_damage: returnForm.return_damage,
          return_cleaning: returnForm.return_cleaning,
          return_missing_items: returnForm.return_missing_items,
          return_notes: returnForm.return_notes,
          bond_status: returnForm.bond_status,
          bond_deductions: returnForm.bond_deductions,
        },
      });
      toast.success(`Vehicle returned. ${result.km_used} km used${result.extra_km_charge > 0 ? `. Extra KM charge: $${result.extra_km_charge}` : ""}`);
      setSelected(null);
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black">Vehicle Returns</h1>
      <p className="mt-1 text-muted-foreground">Record vehicle returns for active rentals.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Active rentals list */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-bold">Active Rentals</div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : agreements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No active rentals.</div>
            ) : (
              agreements.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelect(a)}
                  className={`w-full px-4 py-3 text-left hover:bg-secondary/50 ${selected?.id === a.id ? "bg-primary/10" : ""}`}
                >
                  <div className="font-semibold text-sm">{a.agreement_no} — {a.first_name} {a.last_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.registration || "No vehicle"} | {a.rental_start} to {a.rental_end}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Return form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          {!selected ? (
            <p className="text-center text-muted-foreground py-12">Select an active rental to record its return.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-bold">Return: {selected.agreement_no}</h3>
              <p className="text-sm text-muted-foreground">
                Pickup odometer: <span className="font-medium">{selected.pickup_odometer || 0} km</span>
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Return Date</label>
                  <input type="date" value={returnForm.return_date} onChange={(e) => setReturnForm({ ...returnForm, return_date: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Return Odometer (km)</label>
                  <input type="number" value={returnForm.return_odometer} onChange={(e) => setReturnForm({ ...returnForm, return_odometer: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Fuel Level</label>
                  <select value={returnForm.return_fuel_level} onChange={(e) => setReturnForm({ ...returnForm, return_fuel_level: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>Full</option>
                    <option>3/4</option>
                    <option>1/2</option>
                    <option>1/4</option>
                    <option>Empty</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Bond Status</label>
                  <select value={returnForm.bond_status} onChange={(e) => setReturnForm({ ...returnForm, bond_status: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="held">Held</option>
                    <option value="refunded">Refunded</option>
                    <option value="partially_refunded">Partially Refunded</option>
                    <option value="forfeited">Forfeited</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Bond Deductions ($)</label>
                  <input type="number" value={returnForm.bond_deductions} onChange={(e) => setReturnForm({ ...returnForm, bond_deductions: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Damage</label>
                <textarea value={returnForm.return_damage} onChange={(e) => setReturnForm({ ...returnForm, return_damage: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Cleaning</label>
                <textarea value={returnForm.return_cleaning} onChange={(e) => setReturnForm({ ...returnForm, return_cleaning: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Missing Items</label>
                <textarea value={returnForm.return_missing_items} onChange={(e) => setReturnForm({ ...returnForm, return_missing_items: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea value={returnForm.return_notes} onChange={(e) => setReturnForm({ ...returnForm, return_notes: e.target.value })} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>

              <button type="submit" className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
                Complete Return
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
