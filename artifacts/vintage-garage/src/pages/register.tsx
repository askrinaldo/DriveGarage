import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useTheme } from "@/contexts/theme";

const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 0.5,
  opacity: Math.random() * 0.5 + 0.1,
  speed: Math.random() * 0.3 + 0.05,
  drift: (Math.random() - 0.5) * 0.15,
}));

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const ptRef = useRef(PARTICLES.map((p) => ({ ...p })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const pts = ptRef.current;
      for (const p of pts) {
        p.y -= p.speed * 0.4;
        p.x += p.drift * 0.2;
        if (p.y < -2) { p.y = 102; p.x = Math.random() * 100; }
        if (p.x < -2) p.x = 102;
        if (p.x > 102) p.x = -2;

        ctx.beginPath();
        ctx.arc((p.x / 100) * W, (p.y / 100) * H, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
        ctx.fill();
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 12) {
            ctx.beginPath();
            ctx.moveTo((pts[i].x / 100) * W, (pts[i].y / 100) * H);
            ctx.lineTo((pts[j].x / 100) * W, (pts[j].y / 100) * H);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 12)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)];
  const score = checks.filter(Boolean).length;
  const colors = ["bg-red-500", "bg-amber-500", "bg-emerald-500"];
  const labels = ["Svakt", "Greit", "Sterkt"];
  if (!password) return null;
  return (
    <div className="space-y-1 pt-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : "bg-white/10"}`} />
        ))}
      </div>
      <p className="text-[11px] text-white/30">{labels[score - 1] ?? ""}</p>
    </div>
  );
}

const PERKS = [
  "Ubegrenset servicelogg",
  "Kvitteringsarkiv",
  "Klubbmedlemskap",
  "Norsk veteran-community",
];

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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#06080f]">
      <style>{`
        @keyframes orb-float {
          from { transform: translate(-50%, -50%) scale(1); }
          to   { transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>

      <ParticleCanvas />

      {/* Orbs — violet/cyan tones */}
      <div className="absolute rounded-full blur-[90px] pointer-events-none"
        style={{ left: "75%", top: "25%", width: "500px", height: "500px", background: "rgba(139,92,246,0.11)", transform: "translate(-50%,-50%)", animation: "orb-float 9s ease-in-out infinite alternate" }} />
      <div className="absolute rounded-full blur-[80px] pointer-events-none"
        style={{ left: "25%", top: "75%", width: "400px", height: "400px", background: "rgba(6,182,212,0.08)", transform: "translate(-50%,-50%)", animation: "orb-float 7s ease-in-out 2s infinite alternate" }} />
      <div className="absolute rounded-full blur-[60px] pointer-events-none"
        style={{ left: "50%", top: "10%", width: "280px", height: "280px", background: "rgba(79,70,229,0.10)", transform: "translate(-50%,-50%)", animation: "orb-float 6s ease-in-out 1s infinite alternate" }} />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#06080f_100%)]" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md mx-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
          transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-indigo-900/50 mb-4"
            style={{ animation: "orb-float 4s ease-in-out infinite alternate" }}
          >
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">GaragePilot</h1>
          <p className="text-[10px] text-indigo-300/60 mt-0.5 uppercase tracking-[0.2em] font-medium">Gratis å starte</p>
        </div>

        {/* Glass card */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-black/60 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Opprett konto</h2>
            <p className="text-sm text-white/40 mt-1">Gratis for alltid · Ingen kredittkort</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Fullt navn</Label>
              <Input
                type="text"
                placeholder="Ola Nordmann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-11 bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/20 focus:border-indigo-500/60 focus:ring-indigo-500/20 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/40 uppercase tracking-wider">E-post</Label>
              <Input
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/20 focus:border-indigo-500/60 focus:ring-indigo-500/20 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Passord</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minst 6 tegn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                  className="h-11 bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/20 focus:border-indigo-500/60 focus:ring-indigo-500/20 rounded-xl pr-10"
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
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl border-0 shadow-lg shadow-indigo-900/40 transition-all duration-300 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? "Oppretter konto..." : "Kom i gang — det er gratis"}
            </Button>

            <p className="text-[11px] text-center text-white/20 pt-1 leading-relaxed">
              Ved å registrere deg godtar du våre vilkår og personvernregler.
            </p>
          </form>

          {/* Perks */}
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <ul className="grid grid-cols-2 gap-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5 text-xs text-white/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400/60 shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-white/35 mt-5">
          Har du allerede konto?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Logg inn her
          </Link>
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 opacity-25">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-white/50 uppercase tracking-widest px-2">GaragePilot © 2026</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
