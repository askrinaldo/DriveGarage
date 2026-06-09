import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Car, Wrench, Plus, Users, LogOut, Crown,
  User, ChevronDown, HelpCircle, Palette, CreditCard, Trophy,
  Star, IdCard, Building2, ChevronRight, Settings, Menu, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useState, useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePanel, ThemeControls } from "@/components/theme-panel";
import { useTheme, type ColorMode } from "@/contexts/theme";

interface LayoutProps {
  children: React.ReactNode;
}

interface TenantEntry {
  tenantId: number;
  tenantName: string;
  role: string;
  isPersonal: boolean;
}

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

const navItems = [
  { href: "/dashboard",       label: "Oversikt",         icon: LayoutDashboard, gradient: "from-indigo-500 to-cyan-500"    },
  { href: "/vehicles",        label: "Garasjen min",      icon: Car,             gradient: "from-sky-500 to-blue-500"       },
  { href: "/clubs",           label: "Klubber",           icon: Users,           gradient: "from-violet-500 to-purple-500"  },
  { href: "/prosjekt",        label: "Månedens prosjekt", icon: Star,            gradient: "from-amber-500 to-orange-400"   },
  { href: "/leaderboard",     label: "Leaderboard",       icon: Trophy,          gradient: "from-yellow-400 to-amber-400"   },
  { href: "/membership-card", label: "Medlemskort",       icon: IdCard,          gradient: "from-cyan-500 to-teal-500"      },
  { href: "/billing",         label: "Abonnement",        icon: CreditCard,      gradient: "from-emerald-500 to-teal-500"   },
  { href: "/help",            label: "Hjelp",             icon: HelpCircle,      gradient: "from-slate-400 to-slate-500"    },
];

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isSuperAdmin, name, logout, token, tenantId, tenantName, isPersonalTenant, switchTenant } = useUserAuth();

  const { mode, setMode } = useTheme();
  const isDark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  function toggleDarkMode() {
    setMode(isDark ? "light" : "dark");
  }

  const [tenants, setTenants] = useState<TenantEntry[]>([]);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    void (async () => {
      const res = await fetch("/api/tenants/mine", { headers: authHeader(token) });
      if (res.ok) setTenants(await res.json() as TenantEntry[]);
    })();
  }, [isAuthenticated, token, tenantId]);

  useEffect(() => { setMobileOpen(false); }, [location]);

  function handleLogout() { logout(); navigate("/login"); }

  async function handleSwitchTenant(id: number) {
    if (id === tenantId) return;
    setSwitchingTenant(true);
    await switchTenant(id);
    setSwitchingTenant(false);
    navigate("/vehicles");
  }

  const hasMultipleTenants = tenants.length > 1;

  const sidebar = (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">

      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-900/30 group-hover:shadow-indigo-900/50 transition-shadow">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight text-sidebar-foreground">DriveGarage</span>
          </div>
        </Link>
        <button
          onClick={toggleDarkMode}
          title={isDark ? "Bytt til lys modus" : "Bytt til mørk modus"}
          className="p-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Tenant switcher */}
      {isAuthenticated && (
        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent/60 transition-colors text-left group">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground/80 truncate">{tenantName ?? "Min garasje"}</p>
                  <p className="text-[10px] text-sidebar-foreground/40">{isPersonalTenant ? "Personlig konto" : "Organisasjon"}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/50 transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {hasMultipleTenants && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bytt garasje</p>
                  </div>
                  {tenants.map((t) => (
                    <DropdownMenuItem
                      key={t.tenantId}
                      onClick={() => void handleSwitchTenant(t.tenantId)}
                      className={cn("gap-2", t.tenantId === tenantId && "text-indigo-500")}
                      disabled={switchingTenant}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.tenantName}</span>
                      {t.tenantId === tenantId && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/tenant-new")} className="gap-2">
                <Plus className="w-3.5 h-3.5" />
                Ny organisasjon
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/org/settings")} className="gap-2">
                <Settings className="w-3.5 h-3.5" />
                Innstillinger
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        <div className="pb-1 px-1">
          <p className="text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest mb-2">Navigasjon</p>
        </div>

        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium group",
                  isActive
                    ? "text-sidebar-foreground bg-sidebar-accent"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
              >
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b ${item.gradient}`} />
                )}
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  isActive
                    ? `bg-gradient-to-br ${item.gradient} shadow-sm`
                    : "bg-sidebar-accent/50 group-hover:bg-sidebar-accent"
                )}>
                  <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70")} />
                </div>
                <span className="flex-1">{item.label}</span>
              </div>
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link href="/admin">
            <div className={cn(
              "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium group",
              location === "/admin"
                ? "text-sidebar-foreground bg-sidebar-accent"
                : "text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10"
            )}>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                <Crown className="w-3.5 h-3.5 text-white" />
              </div>
              Admin-panel
            </div>
          </Link>
        )}

        <div className="pt-2">
          <ThemePanel />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-2 border-t border-sidebar-border">
        <Link href="/vehicles/new">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/80 to-cyan-600/80 hover:from-indigo-500/90 hover:to-cyan-500/90 transition-all cursor-pointer text-sm font-semibold text-white shadow-sm">
            <Plus className="w-4 h-4" />
            Legg til kjøretøy
          </div>
        </Link>

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                  {name ? name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground/80 truncate">{name}</p>
                  {isSuperAdmin
                    ? <p className="text-[10px] text-amber-500/80">Super Admin</p>
                    : <p className="text-[10px] text-sidebar-foreground/35">Innlogget</p>
                  }
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/25 shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                <User className="w-4 h-4 mr-2" />
                Min profil
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2">
                    <Crown className="w-4 h-4 mr-2" />
                    Admin-panel
                  </DropdownMenuItem>
                </>
              )}
              <div className="px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tema</span>
                </div>
                <ThemeControls />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-2" />
                Logg ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <div className="flex items-center justify-center px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 transition-all cursor-pointer text-xs font-bold text-white">
                Logg inn
              </div>
            </Link>
            <Link href="/register" className="flex-1">
              <div className="flex items-center justify-center px-3 py-2 rounded-xl border border-sidebar-border hover:bg-sidebar-accent/50 transition-colors cursor-pointer text-xs font-semibold text-sidebar-foreground/50">
                Registrer
              </div>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 shrink-0">
        {sidebar}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 md:hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebar}
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30 bg-sidebar/90 backdrop-blur-md border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
              <Menu className="w-5 h-5 text-sidebar-foreground/60" />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-base text-sidebar-foreground tracking-tight">DriveGarage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDarkMode}
              title={isDark ? "Bytt til lys modus" : "Bytt til mørk modus"}
              className="p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <button onClick={handleLogout} className="p-2 rounded-lg text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link href="/login">
                <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-bold">
                  Logg inn
                </div>
              </Link>
            )}
            <Link href="/vehicles/new">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-600">
                <Plus className="w-4 h-4 text-white" />
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
