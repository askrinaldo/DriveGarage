import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, Wrench, Receipt, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/vehicles", label: "My Garage", icon: Car },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="bg-primary/20 p-2 rounded-md">
                <Wrench className="w-6 h-6 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-tight text-sidebar-foreground">Vintage Garage</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                  location === item.href
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Link href="/vehicles/new">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors cursor-pointer text-sm font-medium">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Vintage Garage</span>
          </div>
          <Link href="/vehicles/new">
            <div className="p-2 rounded-md bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" />
            </div>
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
