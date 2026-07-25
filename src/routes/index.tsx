import { createFileRoute } from "@tanstack/react-router";
import heroCar from "@/assets/hero-car.jpg";
import suv from "@/assets/suv.jpg";
import van from "@/assets/van.jpg";
import truck from "@/assets/truck.jpg";
import { Phone, Mail, Globe, MapPin, Check, Car, Truck, Package } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Punjab Rentals — Long Term Car, Van & Truck Rentals in Melbourne" },
      {
        name: "description",
        content:
          "Punjab Rentals offers long term rentals and rent-to-own plans on SUVs, sedans, hybrids, vans and trucks across Truganina and Dandenong South VIC. Call 0404 115 670.",
      },
      { property: "og:title", content: "Punjab Rentals — Long Term Vehicle Rentals VIC" },
      {
        property: "og:description",
        content:
          "Cars, vans and trucks for long term rental and rent-to-own. Truganina & Dandenong South VIC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-stretch font-black tracking-tight ${className}`}>
      <span className="bg-[var(--brand-dark)] px-2.5 py-1 text-white">PUNJAB</span>
      <span className="border-2 border-[var(--brand-dark)] px-2.5 py-1 text-[var(--brand-dark)]">
        RENTALS
      </span>
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#fleet" className="hover:text-primary">Fleet</a>
            <a href="#plans" className="hover:text-primary">Plans</a>
            <a href="#locations" className="hover:text-primary">Locations</a>
            <a href="#contact" className="hover:text-primary">Contact</a>
          </nav>
          <a
            href="tel:0404115670"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Phone className="h-4 w-4" /> 0404 115 670
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
              Long term rentals · Rent to own
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Drive today.<br />
              <span className="text-primary">Own it tomorrow.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Cars, vans and trucks for long term rental and rent-to-own plans across
              Melbourne. Flexible terms, honest pricing, family run.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="tel:0404115670"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
              >
                <Phone className="h-4 w-4" /> Call Gary
              </a>
              <a
                href="#fleet"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-6 py-3 font-semibold hover:bg-secondary"
              >
                View fleet
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> No hidden fees</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Flexible terms</span>
              <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 2 VIC locations</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -z-10 translate-x-6 translate-y-6 rounded-2xl bg-primary/10" />
            <img
              src={heroCar}
              alt="White sedan available for long term rental"
              width={1600}
              height={1000}
              className="rounded-2xl border border-border bg-secondary shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Vehicle categories */}
      <section id="fleet" className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Our fleet</div>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">A vehicle for every job</h2>
            </div>
            <p className="max-w-md text-muted-foreground">
              From daily commuters to heavy rigids — choose from our wide range of well-maintained vehicles.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                img: suv,
                icon: <Car className="h-5 w-5" />,
                title: "Cars & SUVs",
                body: "SUVs, Hybrids, Sedans and Hatchbacks. Great for rideshare, family or daily driving.",
              },
              {
                img: van,
                icon: <Package className="h-5 w-5" />,
                title: "Vans",
                body: "1 tonne and 2 tonne vans. Ideal for tradies, couriers and moving jobs.",
              },
              {
                img: truck,
                icon: <Truck className="h-5 w-5" />,
                title: "Trucks",
                body: "Car licence, MR and HR trucks available for transport and logistics operators.",
              },
            ].map((c) => (
              <article key={c.title} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-lg">
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img
                    src={c.img}
                    alt={c.title}
                    loading="lazy"
                    width={1000}
                    height={700}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-primary">
                    {c.icon}
                    <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">Plan 01</div>
              <h3 className="mt-2 text-2xl font-black">Long Term Rental</h3>
              <p className="mt-3 text-muted-foreground">
                Predictable weekly rates on a well-maintained vehicle. Perfect for rideshare drivers,
                tradies and anyone who needs reliable wheels without the long-term commitment of ownership.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Weekly billing", "Servicing included", "Swap vehicles as needs change", "Available across our whole fleet"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl border border-primary bg-[var(--brand-dark)] p-8 text-white">
              <div className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold">Most popular</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Plan 02</div>
              <h3 className="mt-2 text-2xl font-black">Rent to Own</h3>
              <p className="mt-3 text-white/80">
                Your rental payments work toward ownership. Drive the vehicle, build equity, and when
                the term is complete — it's yours. Talk to Gary about a plan that fits.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {["Payments build equity", "Own the vehicle at end of term", "Fixed, transparent contracts", "Sedans, vans and trucks available"].map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{f}</li>
                ))}
              </ul>
              <a
                href="tel:0404115670"
                className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold hover:opacity-90"
              >
                <Phone className="h-4 w-4" /> Enquire now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section id="locations" className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mb-10">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Locations</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Find us in Victoria</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {["Truganina, VIC", "Dandenong South, VIC"].map((loc) => (
              <div key={loc} className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6">
                <div className="rounded-lg bg-primary/10 p-3 text-primary"><MapPin className="h-6 w-6" /></div>
                <div>
                  <div className="text-lg font-bold">{loc}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    By appointment — call ahead to view available vehicles.
                  </p>
                  <a href="tel:0404115670" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                    Book a viewing →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-[var(--brand-dark)] text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h2 className="text-3xl font-black md:text-4xl">Talk to Gary Singh</h2>
            <p className="mt-2 text-white/70">Fleet Manager — happy to answer questions about any plan or vehicle.</p>
            <div className="mt-8 space-y-4 text-sm">
              <a href="tel:0404115670" className="flex items-center gap-3 hover:text-primary">
                <div className="rounded-lg bg-white/10 p-2"><Phone className="h-5 w-5" /></div>
                0404 115 670
              </a>
              <a href="mailto:admin@punjabrentals.com.au" className="flex items-center gap-3 hover:text-primary">
                <div className="rounded-lg bg-white/10 p-2"><Mail className="h-5 w-5" /></div>
                admin@punjabrentals.com.au
              </a>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/10 p-2"><Globe className="h-5 w-5" /></div>
                punjabrentals.com.au
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/10 p-2"><MapPin className="h-5 w-5" /></div>
                Truganina VIC & Dandenong South VIC
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-8 backdrop-blur">
            <h3 className="text-xl font-bold">Ready to hit the road?</h3>
            <p className="mt-2 text-sm text-white/70">
              Whether you need a car for the week or a truck to build a business — we'll help you get moving.
            </p>
            <a
              href="tel:0404115670"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold hover:opacity-90"
            >
              <Phone className="h-4 w-4" /> Call 0404 115 670
            </a>
            <a
              href="mailto:admin@punjabrentals.com.au"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/20 px-6 py-3 font-semibold hover:bg-white/10"
            >
              <Mail className="h-4 w-4" /> Send an email
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-[var(--brand-dark)] border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Punjab Rentals — Cars, Vans & Trucks. Truganina & Dandenong South VIC.
      </footer>
    </div>
  );
}
