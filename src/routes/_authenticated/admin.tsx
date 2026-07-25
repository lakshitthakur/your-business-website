import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedCarPhotos } from "@/lib/carPhotos";
import { toast } from "sonner";
import { Plus, Trash2, LogOut } from "lucide-react";

type VType = "car" | "suv" | "van" | "truck";
type CarRow = {
  id: string;
  vehicle_type: VType;
  make: string;
  model: string;
  year: number;
  image_path: string | null;
  description: string | null;
  weekly_price: number | null;
  available: boolean;
};

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Fleet Admin — Punjab Rentals" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [cars, setCars] = useState<CarRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    vehicle_type: "car" as VType,
    make: "",
    model: "",
    year: new Date().getFullYear(),
    weekly_price: "" as string,
    description: "",
    available: true,
    file: null as File | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: udata } = await supabase.auth.getUser();
      const uid = udata.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      setIsAdmin(!!roles?.some((r) => r.role === "admin"));
      await reload();
    })();
  }, []);

  async function reload() {
    const { data } = await supabase
      .from("cars")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setCars(data as CarRow[]);
      const paths = data.map((c) => c.image_path).filter(Boolean) as string[];
      setPhotos(await getSignedCarPhotos(paths));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      let image_path: string | null = null;
      if (form.file) {
        const ext = form.file.name.split(".").pop() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("car-photos")
          .upload(path, form.file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        image_path = path;
      }
      const { error } = await supabase.from("cars").insert({
        vehicle_type: form.vehicle_type,
        make: form.make.trim(),
        model: form.model.trim(),
        year: Number(form.year),
        weekly_price: form.weekly_price ? Number(form.weekly_price) : null,
        description: form.description.trim() || null,
        available: form.available,
        image_path,
      });
      if (error) throw error;
      toast.success("Vehicle added");
      setForm({
        vehicle_type: "car",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        weekly_price: "",
        description: "",
        available: true,
        file: null,
      });
      await reload();
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(car: CarRow) {
    const { error } = await supabase
      .from("cars")
      .update({ available: !car.available })
      .eq("id", car.id);
    if (error) toast.error(error.message);
    else await reload();
  }

  async function remove(car: CarRow) {
    if (!confirm(`Delete ${car.year} ${car.make} ${car.model}?`)) return;
    if (car.image_path) {
      await supabase.storage.from("car-photos").remove([car.image_path]);
    }
    const { error } = await supabase.from("cars").delete().eq("id", car.id);
    if (error) toast.error(error.message);
    else await reload();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-black">Admin access required</h1>
          <p className="mt-3 text-muted-foreground">
            Your account is signed in but does not have admin permissions yet.
          </p>
          <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/50 p-4 text-sm">
            <p className="font-semibold">To grant yourself admin (one-time setup):</p>
            <p className="mt-2 text-muted-foreground">Your user ID:</p>
            <code className="mt-1 block break-all rounded bg-background px-2 py-1 text-xs">{userId}</code>
            <p className="mt-3 text-muted-foreground">
              Ask a workspace admin to run this in the backend SQL editor:
            </p>
            <code className="mt-1 block break-all rounded bg-background px-2 py-1 text-xs">
              INSERT INTO public.user_roles (user_id, role) VALUES ('{userId}', 'admin');
            </code>
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/" className="rounded-md border border-border px-4 py-2 text-sm font-medium">Back to site</Link>
            <button onClick={signOut} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-black tracking-tight">← Punjab Rentals</Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-black">Fleet management</h1>
        <p className="mt-1 text-muted-foreground">Add, edit and remove vehicles that appear on the public fleet page.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Add form */}
          <form onSubmit={handleAdd} className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Plus className="h-5 w-5" /> Add vehicle</h2>

            <label className="block text-sm">
              <span className="font-medium">Type</span>
              <select
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as VType })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="car">Car</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-medium">Make</span>
                <input
                  required
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                  placeholder="Toyota"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Model</span>
                <input
                  required
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="Camry"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-medium">Year</span>
                <input
                  type="number"
                  required
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">$/week</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.weekly_price}
                  onChange={(e) => setForm({ ...form, weekly_price: e.target.value })}
                  placeholder="350"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium">Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                className="mt-1 w-full text-sm"
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              Show on public fleet page
            </label>

            <button
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add vehicle"}
            </button>
          </form>

          {/* List */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{cars.length} vehicles in fleet</div>
            {cars.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                No vehicles yet. Add your first one on the left.
              </div>
            )}
            {cars.map((c) => (
              <div key={c.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                  {c.image_path && photos[c.image_path] && (
                    <img src={photos[c.image_path]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">{c.vehicle_type}</div>
                  <div className="font-bold">{c.year} {c.make} {c.model}</div>
                  <div className="text-sm text-muted-foreground">
                    {c.weekly_price != null ? `$${c.weekly_price}/week` : "Price on enquiry"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={c.available} onChange={() => toggleAvailable(c)} />
                    Public
                  </label>
                  <button
                    onClick={() => remove(c)}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
