import { Link, useLocation } from "wouter";
import { LayoutDashboard, Car, Wrench, Plus, Users, LogOut, Crown, User, ChevronDown, HelpCircle, Palette, CreditCard, Trophy, Star, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePanel, ThemeControls } from "@/components/theme-panel";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isSuperAdmin, name, logout } = useUserAuth();

  const navItems = [
    { href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
    { href: "/vehicles", label: "Garasjen min", icon: Car },
    { href: "/clubs", label: "Klubber", icon: Users },
    { href: "/prosjekt", label: "Månedens prosjekt", icon: Star },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/membership-card", label: "Medlemskort", icon: IdCard },
    { href: "/billing", label: "Abonnement", icon: CreditCard },
    { href: "/help", label: "Hjelp", icon: HelpCircle },
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="w-64 flex-shrink-0 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/dashboard">
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

          {isSuperAdmin && (
            <Link href="/admin">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium",
                  location === "/admin"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-primary/80 hover:text-primary hover:bg-primary/10"
                )}
              >
                <Crown className="w-4 h-4" />
                Admin-panel
              </div>
            </Link>
          )}

          <ThemePanel />
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/vehicles/new">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors cursor-pointer text-sm font-medium">
              <Plus className="w-4 h-4" />
              Legg til kjøretøy
            </div>
          </Link>

          {/* User profile */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-sidebar-foreground truncate">{name}</p>
                    {isSuperAdmin && <p className="text-[10px] text-primary">Super Admin</p>}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isSuperAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Crown className="w-4 h-4 mr-2" />
                      Admin-panel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {/* Inline theme controls */}
                <div className="px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 mb-2">
                    <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tema</span>
                  </div>
                  <ThemeControls />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logg ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="flex-1">
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer text-xs font-medium">
                  Logg inn
                </div>
              </Link>
              <Link href="/register" className="flex-1">
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-border hover:bg-sidebar-accent transition-colors cursor-pointer text-xs font-medium text-sidebar-foreground">
                  Registrer
                </div>
              </Link>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">Vintage Garage</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemePanel
              iconOnly
              buttonClassName="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent w-auto"
              popoverSide="bottom"
            />
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link href="/login">
                <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  Logg inn
                </div>
              </Link>
            )}
            <Link href="/vehicles/new">
              <div className="p-2 rounded-md bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" />
              </div>
            </Link>
          </div>
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
