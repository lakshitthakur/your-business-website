import { createFileRoute, Link, useNavigate, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getAdminSession, adminLogout } from "@/lib/admin-auth";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  Car,
  CreditCard,
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export const Route = createFileRoute("/admin/_auth")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }
    return { admin: session };
  },
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/agreements", label: "Agreements", icon: FileText },
  { to: "/admin/active", label: "Active Rentals", icon: Car },
  { to: "/admin/customers", label: "Customers", icon: ClipboardList },
  { to: "/admin/vehicles", label: "Vehicles", icon: Car },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/overdue", label: "Overdue", icon: AlertTriangle },
  { to: "/admin/returns", label: "Returns", icon: ArrowDownUp },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/audit", label: "Audit Logs", icon: ClipboardList },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await adminLogout();
    toast.success("Signed out");
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link to="/" className="font-black tracking-tight text-sm">
            <span className="bg-[var(--brand-dark)] px-2 py-0.5 text-white">PUNJAB</span>
            <span className="border border-[var(--brand-dark)] px-2 py-0.5 text-[var(--brand-dark)]">RENTALS</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          <div className="mb-2 px-3 text-xs text-muted-foreground truncate">{admin?.email}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 md:px-6">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
