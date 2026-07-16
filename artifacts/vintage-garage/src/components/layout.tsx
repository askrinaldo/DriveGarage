import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Car, Wrench, Plus, Users, LogOut, Crown,
  User, ChevronDown, HelpCircle, CreditCard,
  IdCard, Building2, ChevronRight, Settings, Menu, Sun, Moon,
  Scale, FileText, Mail, Palette, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useState, useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePanel, ThemeControls } from "@/components/theme-panel";
import { CompanyInfo } from "@/components/company-info";
import { useTheme } from "@/contexts/theme";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";

interface LayoutProps { children: React.ReactNode }
interface TenantEntry { tenantId: number; tenantName: string; role: string; isPersonal: boolean }

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { isAuthenticated, isSuperAdmin, name, logout, token, tenantId, tenantName, isPersonalTenant, switchTenant } = useUserAuth();
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const isDark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  function toggleDarkMode() { setMode(isDark ? "light" : "dark"); }

  const navItems = [
    { href: "/dashboard",       label: t("nav.overview"),       icon: LayoutDashboard },
    { href: "/vehicles",        label: t("nav.myGarage"),       icon: Car             },
    { href: "/clubs",           label: t("nav.clubs"),          icon: Users           },
    { href: "/membership-card", label: t("nav.membershipCard"), icon: IdCard          },
    { href: "/billing",         label: t("nav.subscription"),   icon: CreditCard      },
    { href: "/help",            label: t("nav.help"),           icon: HelpCircle      },
  ];

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
  const initials = name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  const sidebar = (
    <aside className="w-60 flex-shrink-0 flex flex-col h-full bg-sidebar border-r border-sidebar-border">

      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-black text-[15px] tracking-tight text-sidebar-foreground">DriveGarage</span>
          </div>
        </Link>
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-md text-sidebar-foreground/35 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-all"
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Tenant switcher */}
      {isAuthenticated && (
        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/20 hover:bg-sidebar-accent/50 transition-colors text-left group">
                <div className="w-5 h-5 rounded bg-muted/60 flex items-center justify-center shrink-0">
                  <Building2 className="w-3 h-3 text-sidebar-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-sidebar-foreground/75 truncate leading-tight">{tenantName ?? t("tenant.myGarage")}</p>
                  <p className="text-[10px] text-sidebar-foreground/35 leading-tight">{isPersonalTenant ? t("tenant.personalAccount") : t("tenant.organization")}</p>
                </div>
                <ChevronRight className="w-3 h-3 text-sidebar-foreground/25 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {hasMultipleTenants && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("tenant.switchGarage")}</p>
                  </div>
                  {tenants.map((tenant) => (
                    <DropdownMenuItem
                      key={tenant.tenantId}
                      onClick={() => void handleSwitchTenant(tenant.tenantId)}
                      className={cn("gap-2", tenant.tenantId === tenantId && "text-primary")}
                      disabled={switchingTenant}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tenant.tenantName}</span>
                      {tenant.tenantId === tenantId && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate("/tenant-new")} className="gap-2">
                <Plus className="w-3.5 h-3.5" />
                {t("tenant.newOrganization")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/org/settings")} className="gap-2">
                <Settings className="w-3.5 h-3.5" />
                {t("tenant.settings")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        <div className="pb-2 px-1">
          <p className="text-[10px] font-bold text-sidebar-foreground/25 uppercase tracking-widest">{t("nav.navigation")}</p>
        </div>

        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer text-[13px]",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 font-medium"
              )}>
                {isActive && (
                  <div className="absolute left-0 inset-y-1.5 w-[2px] rounded-r-full bg-primary" />
                )}
                <item.icon className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/40"
                )} />
                <span className="flex-1">{item.label}</span>
              </div>
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link href="/admin">
            <div className={cn(
              "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer text-[13px] font-medium",
              location === "/admin"
                ? "bg-amber-500/15 text-amber-400 font-semibold"
                : "text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10"
            )}>
              <Crown className="w-4 h-4 shrink-0" />
              {t("nav.adminPanel")}
            </div>
          </Link>
        )}

        <div className="pt-2 space-y-0.5">
          <ThemePanel />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-1.5 border-t border-sidebar-border">
        <Link href="/vehicles/new">
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer text-[13px] font-semibold">
            <Plus className="w-3.5 h-3.5" />
            {t("vehicle.addVehicle")}
          </div>
        </Link>

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sidebar-accent/40 transition-colors cursor-pointer">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 text-primary font-bold text-[11px]">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-sidebar-foreground/80 truncate leading-tight">{name}</p>
                  {isSuperAdmin
                    ? <p className="text-[10px] text-amber-400/80 leading-tight">{t("auth.superAdmin")}</p>
                    : <p className="text-[10px] text-sidebar-foreground/35 leading-tight">{t("auth.loggedIn")}</p>
                  }
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-sidebar-foreground/25 shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                <User className="w-4 h-4 mr-2" />
                {t("auth.myProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/billing")} className="gap-2">
                <CreditCard className="w-4 h-4 mr-2" />
                {t("nav.subscription")}
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2">
                    <Crown className="w-4 h-4 mr-2" />
                    {t("nav.adminPanel")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <div className="px-2 py-2" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t("nav.theme")}</span>
                </div>
                <ThemeControls />
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Språk</span>
                </div>
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <FlagSwitcher />
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Juridisk</p>
              </div>
              <DropdownMenuItem onClick={() => navigate("/privacy")} className="gap-2 text-xs">
                <Scale className="w-3.5 h-3.5 mr-2" />
                Personvernerklæring
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/terms")} className="gap-2 text-xs">
                <FileText className="w-3.5 h-3.5 mr-2" />
                Vilkår for bruk
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/contact")} className="gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 mr-2" />
                Kontakt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                <LogOut className="w-4 h-4 mr-2" />
                {t("auth.logOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer text-xs font-bold">
                {t("auth.logIn")}
              </div>
            </Link>
            <Link href="/register" className="flex-1">
              <div className="flex items-center justify-center px-3 py-2 rounded-lg border border-sidebar-border hover:bg-sidebar-accent/50 transition-colors cursor-pointer text-xs font-semibold text-sidebar-foreground/50">
                {t("auth.register")}
              </div>
            </Link>
          </div>
        )}

        <CompanyInfo className="px-2 pt-1 text-[10px] leading-relaxed text-sidebar-foreground/25" />
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-60 shrink-0">
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
        "fixed inset-y-0 left-0 z-50 w-60 md:hidden transition-transform duration-300",
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
            <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wrench className="w-3 h-3 text-primary" />
            </div>
            <span className="font-black text-[15px] text-sidebar-foreground tracking-tight">DriveGarage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDarkMode}
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
                <div className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  {t("auth.logIn")}
                </div>
              </Link>
            )}
            <Link href="/vehicles/new">
              <div className="p-2 rounded-lg bg-primary">
                <Plus className="w-4 h-4 text-primary-foreground" />
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
