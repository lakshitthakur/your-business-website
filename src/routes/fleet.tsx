import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedCarPhotos } from "@/lib/carPhotos";
import { Car, Truck, Package, Phone, Search } from "lucide-react";

type Vehicle = "all" | "car" | "suv" | "van" | "truck";

type CarRow = {
  id: string;
  vehicle_type: Exclude<Vehicle, "all">;
  make: string;
  model: string;
  year: number;
  image_path: string | null;
  description: string | null;
  weekly_price: number | null;
  available: boolean;
};

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Browse Fleet — Punjab Rentals" },
      { name: "description", content: "Search cars, SUVs, vans and trucks available for long term rental and rent-to-own at Punjab Rentals." },
      { property: "og:title", content: "Browse Punjab Rentals Fleet" },
      { property: "og:description", content: "Find your next long term rental — cars, vans and trucks in Melbourne." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: FleetPage,
});

const TYPES: { key: Vehicle; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: null },
  { key: "car", label: "Cars", icon: <Car className="h-4 w-4" /> },
  { key: "suv", label: "SUVs", icon: <Car className="h-4 w-4" /> },
  { key: "van", label: "Vans", icon: <Package className="h-4 w-4" /> },
  { key: "truck", label: "Trucks", icon: <Truck className="h-4 w-4" /> },
];

function FleetPage() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [type, setType] = useState<Vehicle>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("id, vehicle_type, make, model, year, image_path, description, weekly_price, available")
        .eq("available", true)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setCars(data as CarRow[]);
        const paths = data.map((c) => c.image_path).filter(Boolean) as string[];
        setPhotos(await getSignedCarPhotos(paths));
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cars.filter((c) => {
      if (type !== "all" && c.vehicle_type !== type) return false;
      if (q && !`${c.make} ${c.model} ${c.year}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cars, type, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-stretch font-black tracking-tight">
            <span className="bg-[var(--brand-dark)] px-2.5 py-1 text-white">PUNJAB</span>
            <span className="border-2 border-[var(--brand-dark)] px-2.5 py-1 text-[var(--brand-dark)]">RENTALS</span>
          </Link>
          <a
            href="tel:0404115670"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Phone className="h-4 w-4" /> 0404 115 670
          </a>
        </div>
      </header>

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Fleet</div>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Find your next vehicle</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Search our current fleet by vehicle type or make and model.
          </p>

          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by make, model or year (e.g. Toyota Camry)"
                className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    type === t.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <p className="text-muted-foreground">Loading fleet…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-lg font-semibold">No vehicles match your search</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try clearing filters or call Gary directly on 0404 115 670.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <article key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  {c.image_path && photos[c.image_path] ? (
                    <img
                      src={photos[c.image_path]}
                      alt={`${c.year} ${c.make} ${c.model}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Car className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {c.vehicle_type}
                  </div>
                  <h3 className="mt-1 text-lg font-bold">
                    {c.year} {c.make} {c.model}
                  </h3>
                  {c.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm">
                      {c.weekly_price != null ? (
                        <>
                          <span className="text-lg font-black text-foreground">${c.weekly_price}</span>
                          <span className="text-muted-foreground"> / week</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Call for pricing</span>
                      )}
                    </div>
                    <a
                      href="tel:0404115670"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <Phone className="h-3.5 w-3.5" /> Enquire
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
