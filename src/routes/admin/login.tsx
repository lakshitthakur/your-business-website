import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { adminLogin, getAdminSession, setupAdmin } from "@/lib/admin-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Punjab Rentals" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getAdminSession();
      if (session) navigate({ to: "/admin" });
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (needsSetup) {
        const result = await setupAdmin({ data: { email, password, name } });
        if (result.success) {
          toast.success("Admin account created");
          navigate({ to: "/admin" });
        }
      } else {
        const result = await adminLogin({ data: { email, password } });
        if (result.success) {
          toast.success("Signed in");
          navigate({ to: "/admin" });
        } else {
          toast.error(result.error || "Login failed");
        }
      }
    } catch (err: any) {
      if (err.message?.includes("Admin already exists")) {
        setNeedsSetup(false);
        toast.error("Admin already exists. Please sign in.");
      } else {
        toast.error(err.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to site
        </Link>

        <div className="mt-4">
          <div className="font-black tracking-tight">
            <span className="bg-[var(--brand-dark)] px-2.5 py-1 text-white">PUNJAB</span>
            <span className="border-2 border-[var(--brand-dark)] px-2.5 py-1 text-[var(--brand-dark)]">RENTALS</span>
          </div>
        </div>

        <h1 className="mt-6 text-2xl font-black">{needsSetup ? "Create Admin Account" : "Admin Sign In"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {needsSetup ? "Set up the admin account for Punjab Rentals." : "Sign in to manage your rental business."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {needsSetup && (
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Please wait..." : needsSetup ? "Create Account" : "Sign In"}
          </button>
        </form>

        {!needsSetup && (
          <button
            onClick={() => setNeedsSetup(true)}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-primary"
          >
            First time? Create admin account
          </button>
        )}
        {needsSetup && (
          <button
            onClick={() => setNeedsSetup(false)}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-primary"
          >
            Already have an account? Sign in
          </button>
        )}
      </div>
    </div>
  );
}
