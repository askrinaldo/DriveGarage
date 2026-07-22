import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  User, Shield, Car, Wrench,
  Calendar, Edit2, Check, X,
  Users, Crown, Bike, AlertCircle,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui-states";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  stats: { vehicleCount: number; serviceCount: number; score: number };
}

interface MyClub {
  id: number;
  name: string;
  clubType: string;
  userRole: string;
  memberCount: number;
  isPrivate: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatMemberSince(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("no-NO", { month: "long", year: "numeric" });
}

const typeLabel: Record<string, string> = {
  car:        "Bil",
  motorcycle: "Motorsykkel",
  both:       "Bil & MC",
};

const typePillColor: Record<string, string> = {
  car:        "bg-blue-500/20 text-blue-300 border border-blue-500/20",
  motorcycle: "bg-amber-500/20 text-amber-300 border border-amber-500/20",
  both:       "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20",
};

function ClubTypeIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn("w-3.5 h-3.5", className);
  if (type === "car") return <Car className={cls} />;
  if (type === "motorcycle") return <Bike className={cls} />;
  return (
    <span className="inline-flex gap-0.5">
      <Car className={cls} />
      <Bike className={cls} />
    </span>
  );
}

function RolePill({ role, t }: { role: string; t: (k: string) => string }) {
  if (role === "owner")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
        <Crown className="w-2.5 h-2.5" /> {t("profile.roleOwner")}
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
        <Shield className="w-2.5 h-2.5" /> {t("profile.roleAdmin")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
      <User className="w-2.5 h-2.5" /> {t("profile.roleMember")}
    </span>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isAuthenticated, isAuthLoading, getAuthHeaders } = useUserAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const [clubs, setClubs] = useState<MyClub[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubsError, setClubsError] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) { navigate("/sign-in"); return; }
    void (async () => {
      const headers = await getAuthHeaders();

      const [prof, clubsRes] = await Promise.all([
        fetch("/api/profile/me", { headers })
          .then(r => r.ok ? r.json() as Promise<ProfileData> : null),
        fetch("/api/clubs?scope=mine", { headers })
          .then(r => r.ok ? r.json() as Promise<MyClub[]> : null),
      ]);

      if (prof) {
        setProfile(prof);
        setNewName(prof.name);
      }
      if (clubsRes !== null) {
        setClubs(clubsRes);
      } else {
        setClubsError(true);
      }
      setLoading(false);
      setClubsLoading(false);
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

        {/* ── Right column ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="lg:col-span-2 space-y-4"
        >

          {/* ── My Clubs ── */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <h3 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-primary/60" /> {t("profile.myClubs")}
            </h3>

            {clubsLoading ? (
              <div className="space-y-2">
                {[0, 1].map(i => (
                  <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : clubsError ? (
              <div className="flex items-center gap-2 text-[12px] text-destructive/70 py-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {t("profile.clubsLoadError")}
              </div>
            ) : clubs.length === 0 ? (
              <div className="py-2 space-y-2">
                <p className="text-[12px] text-muted-foreground/55">{t("profile.noClubs")}</p>
                <Link href="/clubs" className="text-[12px] text-primary/70 hover:text-primary transition-colors font-medium">
                  {t("profile.browseClubs")}
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {clubs.map(club => (
                  <li key={club.id}>
                    <Link
                      href={`/clubs/${club.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 hover:bg-muted/30 px-3 py-2.5 transition-colors group"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        club.clubType === "car" ? "bg-blue-500/15 text-blue-300" :
                        club.clubType === "motorcycle" ? "bg-amber-500/15 text-amber-300" :
                        "bg-emerald-500/15 text-emerald-300"
                      )}>
                        <ClubTypeIcon type={club.clubType} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {club.name}
                          </span>
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", typePillColor[club.clubType] ?? typePillColor.both)}>
                            {typeLabel[club.clubType] ?? club.clubType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RolePill role={club.userRole} t={t} />
                          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" /> {club.memberCount}
                          </span>
                        </div>
                      </div>
                      <X className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 rotate-45 transition-colors shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
