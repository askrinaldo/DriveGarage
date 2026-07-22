import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User, Shield, Car, Wrench,
  Calendar, Edit2, Check, X,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui-states";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  stats: { vehicleCount: number; serviceCount: number; score: number };
}


function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatMemberSince(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("no-NO", { month: "long", year: "numeric" });
}

export default function Profile() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isAuthenticated, isAuthLoading, getAuthHeaders } = useUserAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) { navigate("/sign-in"); return; }
    void (async () => {
      const headers = await getAuthHeaders();
      const prof = await fetch("/api/profile/me", { headers })
        .then(r => r.ok ? r.json() as Promise<ProfileData> : null);
      if (prof) {
        setProfile(prof);
        setNewName(prof.name);
      }
      setLoading(false);
    })();
  }, [isAuthenticated, isAuthLoading, getAuthHeaders, navigate]);

  async function saveName() {
    if (!newName.trim() || newName === profile?.name) { setEditingName(false); return; }
    setSavingName(true);
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setProfile(p => p ? { ...p, name: newName.trim() } : p);
      toast({ title: t("profile.nameUpdated"), description: t("profile.nameUpdatedDesc") });
    } else {
      toast({ title: t("profile.nameError"), description: t("profile.nameErrorDesc"), variant: "destructive" });
    }
    setSavingName(false);
    setEditingName(false);
  }

  if (loading) return <LoadingState message={t("profile.loading")} />;
  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary/70" />
          <span className="text-[11px] font-bold text-primary/70 uppercase tracking-widest">{t("profile.sectionLabel")}</span>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">{t("profile.title")}</h1>
        <p className="text-muted-foreground/60 text-[13px] mt-1">{t("profile.subtitle")}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Identity card ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="lg:col-span-1 space-y-4"
        >
          <div className="rounded-2xl border border-border/50 bg-card p-6 text-center space-y-4">
            {/* Avatar */}
            <div className="relative inline-flex">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-foreground text-2xl font-black shadow-lg ring-4 ring-slate-500/30">
                {getInitials(profile.name)}
              </div>
            </div>

            {/* Editable name */}
            <div>
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-center bg-muted/30 border-border text-foreground text-sm h-8"
                    onKeyDown={e => { if (e.key === "Enter") void saveName(); if (e.key === "Escape") setEditingName(false); }}
                    autoFocus
                  />
                  <button onClick={() => void saveName()} disabled={savingName} className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shrink-0 transition-colors">
                    <Check className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                    <X className="w-3.5 h-3.5 text-foreground/60" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-bold text-foreground">{profile.name}</span>
                  <button onClick={() => setEditingName(true)} className="p-1 rounded-md hover:bg-white/10 transition-colors">
                    <Edit2 className="w-3 h-3 text-muted-foreground/70 hover:text-foreground/60" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground/80 mt-1">{profile.email}</p>
            </div>

            <div className="text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {t("profile.memberSince")} {formatMemberSince(profile.createdAt)}
            </div>
          </div>

          {/* Vehicle + service stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Car,    label: t("profile.vehicles"), value: profile.stats.vehicleCount, gradient: "from-indigo-500 to-cyan-500"  },
              { icon: Wrench, label: t("profile.services"), value: profile.stats.serviceCount, gradient: "from-amber-500 to-orange-400" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="rounded-xl border border-border/50 bg-card p-3 text-center"
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-2`}>
                  <s.icon className="w-3.5 h-3.5 text-foreground" />
                </div>
                <div className="text-lg font-black text-foreground tabular-nums">{s.value}</div>
                <div className="text-[10px] text-muted-foreground/70 font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Right column: Privacy + Settings shortcut ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="lg:col-span-2 space-y-4"
        >

          {/* Privacy */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <h3 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-400/70" /> Personvern
            </h3>
            <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
              DriveGarage lagrer kun data som er nødvendig for å levere tjenesten.
              Vi selger aldri data til tredjepart.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/privacy")} className="text-xs h-7">
                Personvernerklæring
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/terms")} className="text-xs h-7">
                Vilkår for bruk
              </Button>
            </div>
          </div>

          {/* Settings shortcut */}
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <p className="text-[12px] text-muted-foreground/55 leading-relaxed mb-3">
              Konto- og sikkerhetsinnstillinger, påloggingsmetoder og utseendevalg finner du på Innstillinger-siden.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/settings")} className="text-xs h-7">
              Gå til innstillinger
            </Button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
