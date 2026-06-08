import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Wrench, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function FloatingOrb({ cx, cy, r, color, delay = 0 }: { cx: string; cy: string; r: string; color: string; delay?: number }) {
  return (
    <div
      className="absolute rounded-full blur-[80px] pointer-events-none"
      style={{
        left: cx, top: cy, width: r, height: r,
        background: color,
        transform: "translate(-50%, -50%)",
        animation: `orb-float 8s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  );
}

export default function Login() {
  const [, navigate] = useLocation();
  const { loginWithReplit, login } = useUserAuth();
  const { applyServerTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [replitLoading, setReplitLoading] = useState(false);

  // Admin fallback state
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  function handleReplitLogin() {
    setReplitLoading(true);
    loginWithReplit();
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    const result = await login(adminEmail, adminPassword);
    setAdminLoading(false);
    if (!result.ok) { setAdminError(result.error); return; }
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
      <FloatingOrb cx="20%" cy="30%" r="500px" color="rgba(79,70,229,0.12)" delay={0} />
      <FloatingOrb cx="80%" cy="70%" r="400px" color="rgba(6,182,212,0.09)" delay={3} />
      <FloatingOrb cx="55%" cy="15%" r="300px" color="rgba(139,92,246,0.07)" delay={1.5} />

      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#06080f_100%)]" />

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
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-indigo-900/50 mb-4"
            style={{ animation: "orb-float 4s ease-in-out infinite alternate" }}
          >
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">GaragePilot</h1>
          <p className="text-sm text-indigo-300/60 mt-0.5 uppercase tracking-[0.2em] font-medium text-[10px]">Norsk veteranplattform</p>
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl shadow-2xl shadow-black/60 p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white">Velkommen til GaragePilot</h2>
            <p className="text-sm text-white/40 mt-1">Logg inn for å åpne garasjen din</p>
          </div>

          {/* Primary: Replit sign-in */}
          <Button
            onClick={handleReplitLogin}
            disabled={replitLoading}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold rounded-xl border-0 shadow-lg shadow-indigo-900/40 transition-all duration-300 text-base"
          >
            {replitLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            )}
            {replitLoading ? "Logger inn…" : "Logg inn med Replit"}
          </Button>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/25 uppercase tracking-widest">eller</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Admin fallback */}
          {!showAdmin ? (
            <button
              type="button"
              onClick={() => setShowAdmin(true)}
              className="mt-3 w-full text-xs text-white/25 hover:text-white/50 transition-colors text-center py-1"
            >
              Admin-innlogging
            </button>
          ) : (
            <form onSubmit={handleAdminLogin} className="mt-3 space-y-3">
              {adminError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {adminError}
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-white/40 uppercase tracking-wider">E-post</Label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="admin@garage.no"
                  className="h-10 bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/20 focus:border-indigo-500/60 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Passord</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-10 bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/20 focus:border-indigo-500/60 rounded-xl pr-10"
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
                disabled={adminLoading}
                className="w-full h-10 bg-white/10 hover:bg-white/20 text-white/70 font-medium rounded-xl border border-white/10 transition-all"
              >
                {adminLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {adminLoading ? "Logger inn…" : "Logg inn som admin"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 opacity-25">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] text-white/50 uppercase tracking-widest px-2">Sikker tilkobling</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
