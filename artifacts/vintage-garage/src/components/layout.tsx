import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Car, Wrench, Plus, Users, LogOut, Crown,
  User, HelpCircle, CreditCard,
  IdCard, Settings, Menu,
  Scale, FileText, Mail, Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useState, useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePanel } from "@/components/theme-panel";
import { CompanyInfo } from "@/components/company-info";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";

interface LayoutProps { children: React.ReactNode }

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const {
    isAuthenticated, isSuperAdmin, name, logout,
  } = useUserAuth();
  const { t } = useTranslation();
  const navItems = [
    { href: "/dashboard",       label: t("nav.overview"),       icon: LayoutDashboard },
    { href: "/vehicles",        label: t("nav.myGarage"),       icon: Car             },
    { href: "/clubs",           label: t("nav.clubs"),          icon: Users           },
    { href: "/membership-card", label: t("nav.membershipCard"), icon: IdCard          },
    { href: "/billing",         label: t("nav.subscription"),   icon: CreditCard      },
    { href: "/help",            label: t("nav.help"),           icon: HelpCircle      },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location]);
  function handleLogout() { logout(); navigate("/sign-in"); }

  const initials = name
    ? name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  /* ── Sidebar ──────────────────────────────────────────────────── */
  const sidebar = (
    <aside className="w-44 flex-shrink-0 flex flex-col h-full bg-sidebar">

      {/* Logo */}
      <div className="px-5 pt-5 pb-5 flex items-center justify-between">
        <Link href="/dashboard">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Wrench className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-black text-[13px] tracking-tight text-sidebar-foreground uppercase">DriveGarage</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "relative flex items-center gap-2.5 px-2.5 py-[9px] rounded-lg transition-all duration-150 cursor-pointer text-[12.5px]",
                isActive
                  ? "text-sidebar-foreground font-bold"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 font-medium hover:bg-sidebar-accent/30"
              )}>
                {isActive && (
                  <div className="absolute left-0 inset-y-2 w-[2px] rounded-r-full bg-primary" />
                )}
                <item.icon className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-primary" : "text-sidebar-foreground/35"
                )} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {isSuperAdmin && (
          <Link href="/admin">
            <div className={cn(
              "relative flex items-center gap-2.5 px-2.5 py-[9px] rounded-lg transition-all duration-150 cursor-pointer text-[12.5px] font-medium",
              location === "/admin"
                ? "text-amber-400 font-bold"
                : "text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10"
            )}>
              <Crown className={cn("w-4 h-4 shrink-0", location === "/admin" ? "text-amber-400" : "text-amber-500/40")} />
              {t("nav.adminPanel")}
            </div>
          </Link>
        )}

        {/* Theme picker — stays accessible */}
        <div className="pt-2 pb-1">
          <ThemePanel />
        </div>
      </nav>

      {/* Profile */}
      <div className="border-t border-sidebar-border/50 px-3 py-3">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent/30 transition-colors text-left">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 text-primary font-black text-[11px] select-none">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-sidebar-foreground/80 truncate leading-tight">{name}</p>
                  {isSuperAdmin
                    ? <p className="text-[10px] text-amber-400/80 leading-tight uppercase tracking-wide">Super Admin</p>
                    : <p className="text-[10px] text-primary/70 leading-tight uppercase tracking-wide font-semibold">Pro Medlem</p>
                  }
                </div>
                <Settings className="w-3.5 h-3.5 text-sidebar-foreground/25 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-60 mb-1">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                <User className="w-4 h-4" />
                {t("auth.myProfile")}
              </DropdownMenuItem>
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2">
                    <Crown className="w-4 h-4" />
                    {t("nav.adminPanel")}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Språk</span>
                </div>
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <FlagSwitcher />
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Juridisk</p>
              </div>
              <DropdownMenuItem onClick={() => navigate("/privacy")} className="gap-2 text-xs">
                <Scale className="w-3.5 h-3.5" /> Personvernerklæring
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/terms")} className="gap-2 text-xs">
                <FileText className="w-3.5 h-3.5" /> Vilkår for bruk
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/contact")} className="gap-2 text-xs">
                <Mail className="w-3.5 h-3.5" /> Kontakt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4" />
                {t("auth.logOut")}
              </DropdownMenuItem>
              <div className="px-2 py-2">
                <CompanyInfo className="text-[10px] leading-relaxed text-muted-foreground/30" />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="space-y-1.5">
            <Link href="/sign-in">
              <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer text-[12px] font-bold">
                {t("auth.logIn")}
              </div>
            </Link>
            <Link href="/sign-up">
              <div className="flex items-center justify-center px-3 py-2 rounded-lg border border-sidebar-border hover:bg-sidebar-accent/30 transition-colors cursor-pointer text-[12px] font-medium text-sidebar-foreground/50">
                {t("auth.register")}
              </div>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );

  /* ── Full layout ──────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen w-full bg-background">

      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-44 shrink-0 sticky top-0 h-screen">
        {sidebar}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-44 md:hidden transition-transform duration-300 ease-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebar}
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30 bg-sidebar/95 backdrop-blur-md border-b border-sidebar-border/50">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors">
              <Menu className="w-5 h-5 text-sidebar-foreground/60" />
            </button>
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Wrench className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-black text-[13px] text-sidebar-foreground tracking-tight uppercase">DriveGarage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href="/vehicles/new">
              <div className="p-2 rounded-md bg-primary">
                <Plus className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-6 md:py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
