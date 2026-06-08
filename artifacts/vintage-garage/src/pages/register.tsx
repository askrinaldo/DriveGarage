import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useTheme } from "@/contexts/theme";

const PERKS = [
  "Ubegrenset servicelogg",
  "Kvitteringsarkiv",
  "Klubbmedlemskap",
  "Norsk veteran-community",
];

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ["bg-red-500", "bg-amber-500", "bg-emerald-500"];
  const labels = ["Svakt", "Greit", "Sterkt"];

  if (!password) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="text-[11px] text-white/40">{labels[score - 1] ?? ""}</p>
    </div>
  );
}

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useUserAuth();
  const { applyServerTheme } = useTheme();
  const [name, setName] = useState("");
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
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    applyServerTheme(result.themePrefs.themeAccent, result.themePrefs.themeMode);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[#0a0a0b]">

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0e] via-[#111218] to-[#0a0c14]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#b87333]/7 blur-[100px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#b87333 1px, transparent 1px), linear-gradient(90deg, #b87333 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Decorative rings */}
        <div className="absolute left-[-100px] bottom-[15%] w-[380px] h-[380px] rounded-full border border-[#b87333]/10" />
        <div className="absolute left-[-60px] bottom-[15%] translate-y-[40px] w-[280px] h-[280px] rounded-full border border-[#b87333]/15" />

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

        {/* Center content */}
        <div className={`relative z-10 space-y-8 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b87333]/10 border border-[#b87333]/20 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#b87333] animate-pulse" />
              <span className="text-[11px] text-[#b87333] uppercase tracking-[0.15em] font-semibold">Gratis å starte</span>
            </div>
            <h1 className="text-4xl font-black text-white leading-[1.15] tracking-tight">
              Alt kjøretøyet<br />
              ditt fortjener<br />
              <span className="bg-gradient-to-r from-[#b87333] via-[#d4944a] to-[#c9a96e] bg-clip-text text-transparent">
                dokumentert.
              </span>
            </h1>
          </div>

          {/* Perk list */}
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#b87333]/15 border border-[#b87333]/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-[#b87333]" />
                </div>
                <span className="text-sm text-white/70">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <div className={`relative z-10 transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <blockquote className="border-l-2 border-[#b87333]/40 pl-4">
            <p className="text-sm text-white/50 italic leading-relaxed">
              "Den beste garasjedagboken for norske veteranbilentusiaster."
            </p>
          </blockquote>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 bg-[#0d0e11]" />
        <div className="absolute inset-0 bg-gradient-to-tl from-[#b87333]/4 via-transparent to-transparent" />

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
            <h2 className="text-2xl font-bold text-white mb-1.5">Opprett konto</h2>
            <p className="text-[#8a8fa8] text-sm">Gratis for alltid · Ingen kredittkort</p>
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
                <Label className="text-xs font-semibold text-[#8a8fa8] uppercase tracking-wider">Fullt navn</Label>
                <Input
                  type="text"
                  placeholder="Ola Nordmann"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-11 bg-white/[0.05] border-white/[0.10] text-white placeholder:text-white/25 focus:border-[#b87333]/60 focus:ring-[#b87333]/20 rounded-xl"
                />
              </div>

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
                <Label className="text-xs font-semibold text-[#8a8fa8] uppercase tracking-wider">Passord</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minst 6 tegn"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
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
                <PasswordStrength password={password} />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-[#b87333] to-[#c9863a] hover:from-[#c9863a] hover:to-[#b87333] text-white font-semibold rounded-xl border-0 shadow-lg shadow-[#b87333]/20 transition-all duration-300 mt-1"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Oppretter konto..." : "Kom i gang — det er gratis"}
              </Button>

              <p className="text-[11px] text-center text-white/25 pt-1 leading-relaxed">
                Ved å registrere deg godtar du våre vilkår og personvernregler.
              </p>
            </form>
          </div>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#8a8fa8]">
              Har du allerede konto?{" "}
              <Link href="/login" className="text-[#b87333] hover:text-[#d4944a] font-semibold transition-colors">
                Logg inn her
              </Link>
            </p>
          </div>

          {/* Bottom divider */}
          <div className="mt-8 flex items-center justify-center gap-2 opacity-40">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] text-white/50 uppercase tracking-widest px-2">Vintage Garage © 2026</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
