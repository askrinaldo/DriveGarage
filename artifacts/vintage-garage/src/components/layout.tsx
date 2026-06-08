import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Car, Wrench, Plus, Users, LogOut, Crown,
  User, ChevronDown, HelpCircle, Palette, CreditCard, Trophy,
  Star, IdCard, Building2, ChevronRight, Settings, Zap, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useState, useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePanel, ThemeControls } from "@/components/theme-panel";

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
  { href: "/dashboard",        label: "Oversikt",          icon: LayoutDashboard, accent: "indigo" },
  { href: "/vehicles",         label: "Garasjen min",       icon: Car,            accent: "sky"    },
  { href: "/clubs",            label: "Klubber",            icon: Users,           accent: "violet" },
  { href: "/prosjekt",         label: "Månedens prosjekt",  icon: Star,            accent: "amber"  },
  { href: "/leaderboard",      label: "Leaderboard",        icon: Trophy,          accent: "yellow" },
  { href: "/membership-card",  label: "Medlemskort",        icon: IdCard,          accent: "cyan"   },
  { href: "/billing",          label: "Abonnement",         icon: CreditCard,      accent: "emerald"},
  { href: "/help",             label: "Hjelp",              icon: HelpCircle,      accent: "slate"  },
];

const accentGradient: Record<string, string> = {
  indigo:  "from-indigo-500 to-cyan-500",
  sky:     "from-sky-500 to-blue-500",
  violet:  "from-violet-500 to-purple-500",
  amber:   "from-amber-500 to-orange-400",
  yellow:  "from-yellow-400 to-amber-400",
  cyan:    "from-cyan-500 to-teal-500",
  emerald: "from-emerald-500 to-teal-500",
  slate:   "from-slate-400 to-slate-500",
};

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isSuperAdmin, name, logout, token, tenantId, tenantName, isPersonalTenant, switchTenant } = useUserAuth();

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

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handleSwitchTenant(id: number) {
    if (id === tenantId) return;
    setSwitchingTenant(true);
    await switchTenant(id);
    setSwitchingTenant(false);
    navigate("/vehicles");
  }

  const hasMultipleTenants = tenants.length > 1;

  const sidebar = (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full" style={{ background: "#080c14", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-900/40 group-hover:shadow-indigo-900/60 transition-shadow">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight text-white">VintageGarage</span>
          </div>
        </Link>
      </div>

      {/* Tenant switcher */}
      {isAuthenticated && (
        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] hover:bg-white/[0.07] transition-colors text-left group">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate">{tenantName ?? "Min garasje"}</p>
                  <p className="text-[10px] text-white/30">{isPersonalTenant ? "Personlig konto" : "Organisasjon"}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-[#0f1520] border-white/10 text-white/80">
              {hasMultipleTenants && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bytt garasje</p>
                  </div>
                  {tenants.map((t) => (
                    <DropdownMenuItem
                      key={t.tenantId}
                      onClick={() => void handleSwitchTenant(t.tenantId)}
                      className={cn("gap-2 focus:bg-white/10 focus:text-white", t.tenantId === tenantId && "text-indigo-300")}
                      disabled={switchingTenant}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.tenantName}</span>
                      {t.tenantId === tenantId && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-white/10" />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/tenant-new")} className="gap-2 focus:bg-white/10 focus:text-white">
                <Plus className="w-3.5 h-3.5" />
                Ny organisasjon
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/org/settings")} className="gap-2 focus:bg-white/10 focus:text-white">
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
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Navigasjon</p>
        </div>

        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          const gradient = accentGradient[item.accent] ?? "from-indigo-500 to-cyan-500";
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium group",
                  isActive
                    ? "text-white bg-white/[0.08]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
              >
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b ${gradient}`} />
                )}
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  isActive
                    ? `bg-gradient-to-br ${gradient} shadow-sm`
                    : "bg-white/[0.05] group-hover:bg-white/[0.08]"
                )}>
                  <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-white/40 group-hover:text-white/60")} />
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
                ? "text-white bg-white/[0.08]"
                : "text-amber-400/60 hover:text-amber-300 hover:bg-amber-900/20"
            )}>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
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
      <div className="p-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* CTA */}
        <Link href="/vehicles/new">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/80 to-cyan-600/80 hover:from-indigo-500/90 hover:to-cyan-500/90 transition-all cursor-pointer text-sm font-semibold text-white shadow-sm shadow-indigo-900/30">
            <Plus className="w-4 h-4" />
            Legg til kjøretøy
          </div>
        </Link>

        {/* User menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm">
                  {name ? name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white/80 truncate">{name}</p>
                  {isSuperAdmin
                    ? <p className="text-[10px] text-amber-400/80">Super Admin</p>
                    : <p className="text-[10px] text-white/30">Innlogget</p>
                  }
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0f1520] border-white/10 text-white/80">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 focus:bg-white/10 focus:text-white">
                <User className="w-4 h-4 mr-2" />
                Min profil
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 focus:bg-white/10 focus:text-white">
                    <Crown className="w-4 h-4 mr-2" />
                    Admin-panel
                  </DropdownMenuItem>
                </>
              )}
              <div className="px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tema</span>
                </div>
                <ThemeControls />
              </div>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-400/80 focus:bg-red-900/20 focus:text-red-300">
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
              <div className="flex items-center justify-center px-3 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] transition-colors cursor-pointer text-xs font-semibold text-white/50">
                Registrer
              </div>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full" style={{ background: "#080c14" }}>

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col" style={{ width: 256, flexShrink: 0 }}>
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30" style={{ background: "rgba(8,12,20,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5 text-white/60" />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-base text-white tracking-tight">VintageGarage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemePanel
              iconOnly
              buttonClassName="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors w-auto"
              popoverSide="bottom"
            />
            {isAuthenticated ? (
              <button onClick={handleLogout} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-900/20 transition-colors">
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
