import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Settings, Shield, Lock, Mail,
  Chrome, Apple, AtSign, ExternalLink,
  Palette, CheckCircle2, Circle,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui-states";
import { ThemeControls } from "@/components/theme-panel";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

interface ProviderInfo {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "email_address",
    label: "E-post / Passord",
    icon: <AtSign className="w-4 h-4 text-indigo-300" />,
    description: "Logg inn med e-post og passord",
  },
  {
    id: "google",
    label: "Google",
    icon: <Chrome className="w-4 h-4 text-rose-300" />,
    description: "Logg inn med Google-konto",
  },
  {
    id: "apple",
    label: "Apple",
    icon: <Apple className="w-4 h-4 text-slate-300" />,
    description: "Logg inn med Apple-konto",
  },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isAuthenticated, isAuthLoading } = useUserAuth();
  const { isLoaded, user } = useUser();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) navigate("/sign-in");
  }, [isAuthenticated, isAuthLoading, navigate]);

  if (!isAuthenticated || !isLoaded) return <LoadingState message="Laster innstillinger…" />;

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const connectedStrategyIds = new Set(
    (user?.externalAccounts ?? []).map((a) => a.provider)
  );
  const hasPassword = (user?.passwordEnabled) === true;

  function isConnected(provider: ProviderInfo) {
    if (provider.id === "email_address") return hasPassword || !!email;
    return connectedStrategyIds.has(provider.id as never);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-primary/70" />
          <span className="text-[11px] font-bold text-primary/70 uppercase tracking-widest">Innstillinger</span>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Innstillinger</h1>
        <p className="text-muted-foreground/60 text-[13px] mt-1">Konto, sikkerhet og utseende på ett sted</p>
      </motion.div>

      {/* ── Section 1: Account & Security ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card p-5 space-y-3"
      >
        <h3 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-cyan-400" /> Konto og sikkerhet
        </h3>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] light:border-border/40 bg-white/[0.02] light:bg-muted/30">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-indigo-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground/60">{t("profile.emailLabel")}</p>
            <p className="text-sm text-foreground/80 truncate">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] light:border-border/40 bg-white/[0.02] light:bg-muted/30">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-violet-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground/60">{t("profile.passwordLabel")}</p>
            <p className="text-sm text-muted-foreground/70">••••••••</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/sign-in")}
            className="text-xs text-muted-foreground hover:text-foreground/70 hover:bg-muted/30 h-7"
          >
            {t("profile.changePassword")}
          </Button>
        </div>

        <div className="pt-1 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("mailto:drivegarage@evolvit.no?subject=Personvern%20-%20Datainnsyn%2FSletting", "_blank")}
            className="text-xs h-7 text-destructive/80 border-destructive/30 hover:border-destructive/60 hover:text-destructive"
          >
            Slett mine data
          </Button>
        </div>
      </motion.div>

      {/* ── Section 2: Login Methods ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card p-5 space-y-3"
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary/70" /> Påloggingsmetoder
          </h3>
          <a
            href="https://accounts.clerk.dev/user"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors"
          >
            Administrer <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
          Tilkoblede påloggingsmetoder administreres via Clerk. Koble til eller fjern metoder via lenken over.
        </p>

        <div className="space-y-2">
          {PROVIDERS.map((provider) => {
            const active = isConnected(provider);
            return (
              <div
                key={provider.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] light:border-border/40 bg-white/[0.02] light:bg-muted/30"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] light:bg-muted/40 flex items-center justify-center shrink-0">
                  {provider.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground/80">{provider.label}</p>
                  <p className="text-[11px] text-muted-foreground/55">{provider.description}</p>
                </div>
                {active ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tilkoblet
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/40">
                    <Circle className="w-3.5 h-3.5" /> Ikke tilkoblet
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 3: Appearance ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card p-5"
      >
        <h3 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-primary/70" /> Utseende
        </h3>
        <ThemeControls />
      </motion.div>

    </div>
  );
}
