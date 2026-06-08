import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Car, Wrench, Trophy, Star,
  Calendar, Edit2, Check, X, Crown, Zap, TrendingUp,
  Award, Lock, ChevronRight
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui-states";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  subscriptionTier: "free" | "standard" | "premium";
  subscriptionStatus: string;
  createdAt: string;
  stats: { vehicleCount: number; serviceCount: number; score: number };
}

interface Badge {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
}

interface Achievement {
  id: number;
  badgeSlug: string;
  earnedAt: string;
}

interface AchievementsData {
  memberName: string;
  achievements: Achievement[];
  allBadges: Badge[];
  totalPoints: number;
}

const TIER_CONFIG = {
  free:     { label: "Gratis",   gradient: "from-slate-500 to-slate-600",   ring: "ring-slate-500/30",  text: "text-slate-300" },
  standard: { label: "Standard", gradient: "from-blue-500 to-indigo-600",   ring: "ring-blue-500/30",   text: "text-blue-300"  },
  premium:  { label: "Premium",  gradient: "from-amber-400 to-orange-500",  ring: "ring-amber-400/30",  text: "text-amber-300" },
};

const CATEGORY_COLORS: Record<string, string> = {
  milestone:   "from-indigo-500 to-cyan-500",
  maintenance: "from-amber-500 to-orange-400",
  activity:    "from-emerald-500 to-teal-400",
  social:      "from-violet-500 to-purple-400",
  special:     "from-rose-500 to-pink-400",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatMemberSince(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("no-NO", { month: "long", year: "numeric" });
}

export default function Profile() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token, name: authName } = useUserAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    const headers = { "x-user-token": token ?? "" };
    void Promise.all([
      fetch("/api/profile/me", { headers }).then(r => r.ok ? r.json() as Promise<ProfileData> : null),
      fetch("/api/profile/leaderboard").then(r => r.ok ? r.json() as Promise<{ id: number; name: string }[]> : null),
    ]).then(([prof]) => {
      if (prof) {
        setProfile(prof);
        setNewName(prof.name);
        // Fetch achievements using member name
        void fetch(`/api/badges/users/${encodeURIComponent(prof.name)}/achievements`)
          .then(r => r.ok ? r.json() as Promise<AchievementsData> : null)
          .then(a => { if (a) setAchievements(a); });
      }
      setLoading(false);
    });
  }, [isAuthenticated, token, navigate]);

  async function saveName() {
    if (!newName.trim() || newName === profile?.name) { setEditingName(false); return; }
    setSavingName(true);
    const res = await fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-token": token ?? "" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setProfile(p => p ? { ...p, name: newName.trim() } : p);
      toast({ title: "Navn oppdatert", description: "Profilnavnet ditt er endret." });
    } else {
      toast({ title: "Feil", description: "Kunne ikke oppdatere navn.", variant: "destructive" });
    }
    setSavingName(false);
    setEditingName(false);
  }

  if (loading) return <LoadingState message="Laster profil..." />;
  if (!profile) return null;

  const tier = TIER_CONFIG[profile.subscriptionTier] ?? TIER_CONFIG.free;
  const earnedSlugs = new Set((achievements?.achievements ?? []).map(a => a.badgeSlug));
  const earnedBadges = achievements?.allBadges.filter(b => earnedSlugs.has(b.slug)) ?? [];
  const lockedBadges = achievements?.allBadges.filter(b => !earnedSlugs.has(b.slug)) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-400/80 uppercase tracking-widest">Profil</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Min profil</h1>
        <p className="text-white/40 text-sm mt-1">Kontoinfo, statistikk og merker</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, duration: 0.45 }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Avatar + info */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-6 text-center space-y-4">
            <div className="relative inline-flex">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ${tier.ring}`}>
                {getInitials(profile.name)}
              </div>
              {profile.subscriptionTier === "premium" && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                  <Crown className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Editable name */}
            <div>
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-center bg-white/[0.06] border-white/20 text-white text-sm h-8"
                    onKeyDown={e => { if (e.key === "Enter") void saveName(); if (e.key === "Escape") setEditingName(false); }}
                    autoFocus
                  />
                  <button onClick={() => void saveName()} disabled={savingName} className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shrink-0 transition-colors">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
                    <X className="w-3.5 h-3.5 text-white/60" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-bold text-white">{profile.name}</span>
                  <button onClick={() => setEditingName(true)} className="p-1 rounded-md hover:bg-white/10 transition-colors">
                    <Edit2 className="w-3 h-3 text-white/30 hover:text-white/60" />
                  </button>
                </div>
              )}
              <p className="text-xs text-white/35 mt-1">{profile.email}</p>
            </div>

            {/* Tier badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${tier.gradient} shadow-sm`}>
              <Star className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">{tier.label}</span>
            </div>

            <div className="text-[11px] text-white/25 flex items-center justify-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Medlem siden {formatMemberSince(profile.createdAt)}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Car, label: "Kjøretøy", value: profile.stats.vehicleCount, gradient: "from-indigo-500 to-cyan-500" },
              { icon: Wrench, label: "Serviser", value: profile.stats.serviceCount, gradient: "from-amber-500 to-orange-400" },
              { icon: Zap, label: "Poeng", value: profile.stats.score + (achievements?.totalPoints ?? 0), gradient: "from-emerald-500 to-teal-400" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="rounded-xl border border-white/[0.07] bg-[#0f1117] p-3 text-center"
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center mx-auto mb-2`}>
                  <s.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-lg font-black text-white tabular-nums">{s.value}</div>
                <div className="text-[10px] text-white/30 font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Upgrade CTA */}
          {profile.subscriptionTier === "free" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate("/billing")}
              className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-900/20 to-orange-900/10 p-4 cursor-pointer hover:border-amber-500/40 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-300">Oppgrader til Premium</span>
              </div>
              <p className="text-xs text-white/35 mb-3">Lås opp AI-mekaniker, ubegrenset lagring og mer</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">fra kr 49/mnd</span>
                <ChevronRight className="w-4 h-4 text-amber-400/60 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Badges + security */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Earned badges */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" /> Merker opptjent
              </h3>
              <span className="text-xs font-bold text-white/30">{earnedBadges.length} / {(achievements?.allBadges.length ?? 0)}</span>
            </div>
            {earnedBadges.length === 0 ? (
              <div className="text-center py-6 text-white/25 text-sm">
                <div className="text-3xl mb-2">🎯</div>
                Ingen merker ennå – logg inn og kom i gang!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {earnedBadges.map((badge, i) => (
                  <motion.div
                    key={badge.slug}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] bg-gradient-to-br ${CATEGORY_COLORS[badge.category] ?? "from-indigo-500 to-cyan-500"} bg-opacity-10 relative overflow-hidden group hover:border-white/20 transition-colors`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_COLORS[badge.category] ?? "from-indigo-500 to-cyan-500"} opacity-[0.06]`} />
                    <div className="text-2xl shrink-0">{badge.icon}</div>
                    <div className="min-w-0 relative">
                      <p className="text-xs font-bold text-white leading-snug">{badge.name}</p>
                      <p className="text-[10px] text-white/40 mt-0.5 leading-snug truncate">{badge.description}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Zap className="w-2.5 h-2.5 text-amber-400/70" />
                        <span className="text-[10px] text-amber-400/70 font-bold">+{badge.points} poeng</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Locked badges */}
          {lockedBadges.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-5">
              <h3 className="text-sm font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Lock className="w-3.5 h-3.5" /> Låste merker
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {lockedBadges.map((badge, i) => (
                  <motion.div
                    key={badge.slug}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] opacity-50"
                  >
                    <div className="text-2xl shrink-0 grayscale">{badge.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/40">{badge.name}</p>
                      <p className="text-[10px] text-white/20 mt-0.5 leading-snug truncate">{badge.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Security & account */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-5 space-y-3">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-cyan-400" /> Konto og sikkerhet
            </h3>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/60">E-postadresse</p>
                <p className="text-sm text-white/80 truncate">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/60">Passord</p>
                <p className="text-sm text-white/30">••••••••</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/login")}
                className="text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] h-7"
              >
                Endre
              </Button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/60">Abonnement</p>
                <p className={`text-sm font-bold ${tier.text}`}>{tier.label}</p>
              </div>
              {profile.subscriptionTier !== "premium" && (
                <Button
                  size="sm"
                  onClick={() => navigate("/billing")}
                  className="text-xs bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-0 h-7"
                >
                  Oppgrader
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
