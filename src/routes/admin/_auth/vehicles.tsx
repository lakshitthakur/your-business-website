import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from "@/lib/vehicles";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/_auth/vehicles")({
  component: VehiclesPage,
});

function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicle_type: "car",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    registration: "",
    weekly_price: 0,
    bond: 0,
    km_allowance: 0,
    extra_km_rate: 0,
    excess_amount: 0,
    status: "Available",
    available: true,
  });

  async function load() {
    setLoading(true);
    const data = await listVehicles({ data: {} });
    setVehicles(data as any[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ vehicle_type: "car", make: "", model: "", year: new Date().getFullYear(), registration: "", weekly_price: 0, bond: 0, km_allowance: 0, extra_km_rate: 0, excess_amount: 0, status: "Available", available: true });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await updateVehicle({ data: { id: editingId, ...form } });
        toast.success("Vehicle updated");
      } else {
        await createVehicle({ data: form as any });
        toast.success("Vehicle added");
      }
      resetForm();
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function handleEdit(v: any) {
    setForm({
      vehicle_type: v.vehicle_type,
      make: v.make,
      model: v.model,
      year: v.year,
      registration: v.registration || "",
      weekly_price: v.weekly_price,
      bond: v.bond,
      km_allowance: v.km_allowance,
      extra_km_rate: v.extra_km_rate,
      excess_amount: v.excess_amount,
      status: v.status,
      available: !!v.available,
    });
    setEditingId(v.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    try {
      await deleteVehicle({ data: { id } });
      toast.success("Vehicle deleted");
      await load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Vehicles</h1>
          <p className="mt-1 text-muted-foreground">Manage your fleet.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-bold">{editingId ? "Edit Vehicle" : "Add Vehicle"}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Registration</label>
              <input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Make</label>
              <input required value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Model</label>
              <input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Year</label>
              <input type="number" required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Weekly Price ($)</label>
              <input type="number" value={form.weekly_price} onChange={(e) => setForm({ ...form, weekly_price: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Bond ($)</label>
              <input type="number" value={form.bond} onChange={(e) => setForm({ ...form, bond: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">KM Allowance</label>
              <input type="number" value={form.km_allowance} onChange={(e) => setForm({ ...form, km_allowance: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Extra KM Rate ($)</label>
              <input type="number" value={form.extra_km_rate} onChange={(e) => setForm({ ...form, extra_km_rate: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Available">Available</option>
                <option value="Reserved">Reserved</option>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{editingId ? "Update" : "Add"} Vehicle</button>
            <button type="button" onClick={resetForm} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Registration</th>
                  <th className="px-4 py-3 text-left font-medium">Weekly Price</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{v.year} {v.make} {v.model}</div>
                      <div className="text-xs text-muted-foreground capitalize">{v.vehicle_type}</div>
                    </td>
                    <td className="px-4 py-3">{v.registration || "N/A"}</td>
                    <td className="px-4 py-3">${v.weekly_price}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(v)} className="rounded-md border border-border p-1.5 hover:bg-secondary"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(v.id)} className="rounded-md border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
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
    Available: "bg-green-100 text-green-700",
    Reserved: "bg-yellow-100 text-yellow-700",
    Active: "bg-blue-100 text-blue-700",
    Maintenance: "bg-orange-100 text-orange-700",
    Unavailable: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
}
