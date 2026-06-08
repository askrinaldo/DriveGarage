import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2, AlertCircle, Eye, EyeOff, Gauge, Wrench as WrenchIcon, Award, Users } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useTheme } from "@/contexts/theme";

const STATS = [
  { value: "2 400+", label: "Kjøretøy registrert" },
  { value: "340+", label: "Aktive klubber" },
  { value: "8 900+", label: "Medlemmer" },
  { value: "47 000+", label: "Servicelogg-oppføringer" },
];

const FEATURES = [
  { icon: WrenchIcon, text: "Digital servicebok" },
  { icon: Gauge, text: "Kilometerhistorikk" },
  { icon: Award, text: "Klubbgarasjer" },
  { icon: Users, text: "Veteranmiljø" },
];

function AnimatedCounter({ target }: { target: string }) {
  return <span>{target}</span>;
}

export default function Login() {
  const [, navigate] = useLocation();
  const { login } = useUserAuth();
  const { applyServerTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    applyServerTheme(result.themePrefs.themeAccent, result.themePrefs.themeMode);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#0a0a0b]">

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">

        {/* Deep layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0e] via-[#111218] to-[#0a0c14]" />

        {/* Radial copper glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#b87333]/8 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#1a2744]/40 blur-[80px] pointer-events-none" />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#b87333 1px, transparent 1px), linear-gradient(90deg, #b87333 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Decorative mechanical circles */}
        <div className="absolute right-[-80px] top-[20%] w-[320px] h-[320px] rounded-full border border-[#b87333]/10 opacity-60" />
        <div className="absolute right-[-40px] top-[20%] translate-y-[-40px] w-[240px] h-[240px] rounded-full border border-[#b87333]/15" />
        <div className="absolute right-[40px] top-[20%] translate-y-[-20px] w-[160px] h-[160px] rounded-full border border-[#b87333]/20" />

        {/* Horizontal gauge-line accents */}
        <div className="absolute left-0 top-[38%] w-full h-px bg-gradient-to-r from-transparent via-[#b87333]/15 to-transparent" />
        <div className="absolute left-0 top-[62%] w-full h-px bg-gradient-to-r from-transparent via-[#b87333]/10 to-transparent" />

        {/* Logo */}
        <div className={`relative z-10 flex items-center gap-3 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
          <div className="w-10 h-10 rounded-xl bg-[#b87333]/20 border border-[#b87333]/30 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-[#b87333]" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-wide">Vintage Garage</span>
            <div className="text-[10px] text-[#b87333]/70 uppercase tracking-[0.2em] font-medium">Norsk veteranplattform</div>
          </div>
        </div>

        {/* Center hero text */}
        <div className={`relative z-10 space-y-6 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b87333]/10 border border-[#b87333]/20 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#b87333] animate-pulse" />
              <span className="text-[11px] text-[#b87333] uppercase tracking-[0.15em] font-semibold">Premium plattform</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Ta vare på<br />
              <span className="bg-gradient-to-r from-[#b87333] via-[#d4944a] to-[#c9a96e] bg-clip-text text-transparent">
                historien til
              </span><br />
              kjøretøyet ditt
            </h1>
          </div>
          <p className="text-[#8a8fa8] text-base leading-relaxed max-w-[360px]">
            Dokumenter vedlikehold, lagre kvitteringer og bli med i et levende veteranmiljø.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
                <Icon className="w-3 h-3 text-[#b87333]" />
                <span className="text-xs text-white/70 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className={`relative z-10 grid grid-cols-2 gap-4 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {STATS.map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
              <div className="text-2xl font-black text-white">
                <AnimatedCounter target={stat.value} />
              </div>
              <div className="text-xs text-[#8a8fa8] mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">

        {/* Right panel background */}
        <div className="absolute inset-0 bg-[#0d0e11]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#b87333]/4 via-transparent to-transparent" />

        <div className={`relative z-10 w-full max-w-[400px] transition-all duration-700 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-[#b87333]/20 border border-[#b87333]/30 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-[#b87333]" />
            </div>
            <span className="font-bold text-lg text-white">Vintage Garage</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">Velkommen tilbake</h2>
            <p className="text-[#8a8fa8] text-sm">Logg inn på garasjen din</p>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md p-7 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">

              {error && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#8a8fa8] uppercase tracking-wider">E-post</Label>
                <Input
                  type="email"
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11 bg-white/[0.05] border-white/[0.10] text-white placeholder:text-white/25 focus:border-[#b87333]/60 focus:ring-[#b87333]/20 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#8a8fa8] uppercase tracking-wider">Passord</Label>
                  <button type="button" className="text-xs text-[#b87333]/70 hover:text-[#b87333] transition-colors">
                    Glemt passord?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 bg-white/[0.05] border-white/[0.10] text-white placeholder:text-white/25 focus:border-[#b87333]/60 focus:ring-[#b87333]/20 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-[#b87333] to-[#c9863a] hover:from-[#c9863a] hover:to-[#b87333] text-white font-semibold rounded-xl border-0 shadow-lg shadow-[#b87333]/20 transition-all duration-300 mt-1"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Logger inn..." : "Logg inn"}
              </Button>
            </form>
          </div>

          {/* Divider + register link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#8a8fa8]">
              Ny på Vintage Garage?{" "}
              <Link href="/register" className="text-[#b87333] hover:text-[#d4944a] font-semibold transition-colors">
                Opprett gratis konto
              </Link>
            </p>
          </div>

          {/* Bottom badge */}
          <div className="mt-8 flex items-center justify-center gap-2 opacity-40">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] text-white/50 uppercase tracking-widest px-2">Sikker tilkobling</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
