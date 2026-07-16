import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Car, Wrench, FileText, History, Users, MessageSquare,
  Calendar, ArrowRightLeft, Bot, Cloud, CheckCircle2,
  ChevronRight, Menu, X, Star, Shield, Zap, Plus,
  Clock, Lock, TrendingUp, Camera, MapPin, Bike,
  ArrowRight, ChevronDown, Receipt, BarChart2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";
import { CompanyInfo } from "@/components/company-info";

/* ─── useInView ─────────────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/* ─── FadeIn ────────────────────────────────────────────────────── */
function FadeIn({
  children, delay = 0, y = 24, className = "",
}: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${y}px)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated counter ──────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

function StatCard({ value, suffix, label, delay }: {
  value: number; suffix: string; label: string; delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 1800, visible);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="text-center" style={{ transitionDelay: `${delay}ms` }}>
      <div className="text-3xl md:text-5xl font-black text-white mb-2 tabular-nums tracking-tighter">
        {count.toLocaleString("nb-NO")}{suffix}
      </div>
      <div className="text-[11px] text-[#7a8a96] uppercase tracking-[0.14em] font-semibold">{label}</div>
    </div>
  );
}

/* ─── FAQ item ──────────────────────────────────────────────────── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full py-5 flex items-center justify-between gap-4 text-left group"
      >
        <span className="text-[15px] font-semibold text-white/85 group-hover:text-white transition-colors leading-snug">
          {question}
        </span>
        <ChevronDown
          className="w-4 h-4 text-[#7a8a96] shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "200px" : "0px" }}
      >
        <p className="text-[14px] text-[#8898aa] leading-relaxed pb-5">{answer}</p>
      </div>
    </div>
  );
}

/* ─── Product showcase mockup ───────────────────────────────────── */
function ProductMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto select-none pointer-events-none">
      <div className="absolute -inset-10 rounded-3xl bg-gradient-to-b from-amber-600/8 to-orange-600/4 blur-3xl" />
      <div className="relative rounded-2xl border border-white/[0.09] bg-[#09090d]/98 overflow-hidden shadow-[0_50px_120px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Browser chrome */}
        <div className="bg-[#060609] border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            {["bg-red-500/40", "bg-amber-500/40", "bg-green-500/40"].map((c) => (
              <div key={c} className={`w-3 h-3 rounded-full ${c}`} />
            ))}
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-md px-4 py-1 text-[11px] text-[#7a8a96] w-52 text-center tracking-wide">
              drivegarage.no/dashboard
            </div>
          </div>
        </div>
        {/* App layout */}
        <div className="flex" style={{ height: "300px" }}>
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col gap-0.5 w-44 shrink-0 border-r border-white/[0.05] bg-[#060608] p-3">
            <div className="flex items-center gap-2 px-2 py-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(180,90,30,0.4)]">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-white tracking-tight">DriveGarage</span>
            </div>
            {[
              { label: "Oversikt",      active: true,  dot: "bg-amber-500" },
              { label: "Garasjen min",  active: false, dot: "" },
              { label: "Klubber",       active: false, dot: "" },
              { label: "Abonnement",    active: false, dot: "" },
            ].map(({ label, active, dot }) => (
              <div
                key={label}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-2 ${
                  active ? "bg-amber-500/12 text-amber-300" : "text-[#7a8a96]"
                }`}
              >
                {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
                {label}
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">God morgen, Erik</span>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                Premium aktiv
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Kjøretøy",    value: "3",   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/15" },
                { label: "Serviceposter", value: "47", color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/15" },
                { label: "Kvitteringer", value: "124", color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/15" },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`border rounded-xl p-2.5 ${bg}`}>
                  <div className={`text-xl font-black ${color}`}>{value}</div>
                  <div className="text-[10px] text-[#7a8a96] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {/* Vehicles */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "1968 Volvo Amazon",       tag: "Bil", km: "87 400 km", color: "border-amber-500/30 bg-amber-500/5" },
                { name: "1972 Triumph Bonneville",  tag: "MC",  km: "22 100 km", color: "border-orange-500/30 bg-orange-500/5" },
                { name: "1955 Ford F100",           tag: "Bil", km: "141 200 km", color: "border-yellow-500/30 bg-yellow-500/5" },
              ].map(({ name, tag, km, color }) => (
                <div key={name} className={`border rounded-xl p-2.5 ${color}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Car className="w-3 h-3 text-amber-400/70" />
                    <span className="text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[#7a8a96]">{tag}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-white leading-tight">{name}</div>
                  <div className="text-[9px] text-[#7a8a96] mt-0.5">{km}</div>
                </div>
              ))}
            </div>
            {/* Recent */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] text-[#7a8a96]">Siste: Oljeskift · Volvo Amazon · 2 dager siden</span>
            </div>
          </div>
        </div>
      </div>
      {/* Floating badges */}
      <div className="absolute -right-4 top-16 hidden lg:flex flex-col gap-2">
        <div className="bg-[#0d0d11]/95 border border-white/10 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-white font-semibold whitespace-nowrap">PDF-eksport klar</span>
        </div>
        <div className="bg-[#0d0d11]/95 border border-white/10 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-xl flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-white font-semibold whitespace-nowrap">Kjøretøyverdi opp 12%</span>
        </div>
      </div>
      <div className="absolute -left-4 bottom-10 hidden lg:block">
        <div className="bg-[#0d0d11]/95 border border-white/10 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-xl flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-white font-semibold whitespace-nowrap">Data lagret i Norge</span>
        </div>
      </div>
    </div>
  );
}

const TESTIMONIALS = [
  { name: "Tor Gunnar H.", vehicle: "1968 Volvo Amazon",       text: "Endelig ett sted å samle alt om bilen. Servicehistorikken er gull verdt ved salg!", stars: 5 },
  { name: "Anita B.",      vehicle: "1972 Triumph Bonneville", text: "Kvitteringsarkivet har reddet meg flere ganger. Anbefaler DriveGarage til alle MC-entusiaster.", stars: 5 },
  { name: "Knut-Erik L.",  vehicle: "1955 Ford F100",          text: "Restaureringsloggen med bilder er fantastisk. Jeg kan vise frem hele historien til kunden.", stars: 5 },
];

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const FEATURES = [
    { icon: Wrench,         title: t("landing.features.f1Title"), desc: t("landing.features.f1Desc"), color: "text-amber-400",  border: "border-amber-500/20",  glow: "bg-amber-500/8" },
    { icon: Camera,         title: t("landing.features.f2Title"), desc: t("landing.features.f2Desc"), color: "text-orange-400", border: "border-orange-500/20", glow: "bg-orange-500/8" },
    { icon: History,        title: t("landing.features.f3Title"), desc: t("landing.features.f3Desc"), color: "text-yellow-400", border: "border-yellow-500/20", glow: "bg-yellow-500/8" },
    { icon: Users,          title: t("landing.features.f4Title"), desc: t("landing.features.f4Desc"), color: "text-amber-400",  border: "border-amber-500/20",  glow: "bg-amber-500/8" },
    { icon: MessageSquare,  title: t("landing.features.f5Title"), desc: t("landing.features.f5Desc"), color: "text-orange-400", border: "border-orange-500/20", glow: "bg-orange-500/8" },
    { icon: Calendar,       title: t("landing.features.f6Title"), desc: t("landing.features.f6Desc"), color: "text-yellow-400", border: "border-yellow-500/20", glow: "bg-yellow-500/8" },
    { icon: ArrowRightLeft, title: t("landing.features.f7Title"), desc: t("landing.features.f7Desc"), color: "text-amber-400",  border: "border-amber-500/20",  glow: "bg-amber-500/8" },
    { icon: Bot,            title: t("landing.features.f8Title"), desc: t("landing.features.f8Desc"), color: "text-orange-400", border: "border-orange-500/20", glow: "bg-orange-500/8" },
    { icon: Cloud,          title: t("landing.features.f9Title"), desc: t("landing.features.f9Desc"), color: "text-yellow-400", border: "border-yellow-500/20", glow: "bg-yellow-500/8" },
  ];

  const FAQ_ITEMS = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
    { q: t("landing.faq.q6"), a: t("landing.faq.a6") },
  ];

  const PLAN_FEATURES = [
    t("landing.pricing.plan.f1"), t("landing.pricing.plan.f2"),
    t("landing.pricing.plan.f3"), t("landing.pricing.plan.f4"),
    t("landing.pricing.plan.f5"), t("landing.pricing.plan.f6"),
    t("landing.pricing.plan.f7"),
  ];

  return (
    <div className="min-h-screen bg-[#09090d] text-white font-sans overflow-x-hidden selection:bg-amber-500/25">

      {/* ── Ambient glows ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-5%]  w-[50%] h-[50%] rounded-full bg-amber-600/[0.055] blur-[160px]" />
        <div className="absolute top-[40%]  right-[-5%] w-[35%] h-[35%] rounded-full bg-orange-700/[0.045] blur-[140px]" />
        <div className="absolute bottom-[-8%] left-[5%]  w-[45%] h-[35%] rounded-full bg-amber-800/[0.04]  blur-[180px]" />
      </div>

      {/* ════ NAVBAR ════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-white/[0.07] bg-[#09090d]/90 backdrop-blur-2xl" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_18px_rgba(200,100,30,0.4)]">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="text-[17px] font-black tracking-tight">DriveGarage</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 text-[13.5px] font-medium text-[#8898aa]">
            <button onClick={() => scrollTo("funksjoner")} className="hover:text-white transition-colors duration-200">{t("landing.navbar.features")}</button>
            <button onClick={() => scrollTo("slik-fungerer")} className="hover:text-white transition-colors duration-200">{t("landing.navbar.howItWorks")}</button>
            <button onClick={() => scrollTo("priser")} className="hover:text-white transition-colors duration-200">{t("landing.navbar.pricing")}</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-white transition-colors duration-200">FAQ</button>
            <Link href="/sign-in" className="hover:text-white transition-colors duration-200">{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up">
              <button className="h-9 px-5 rounded-full bg-amber-500 hover:bg-amber-400 text-[#09090d] text-[13px] font-black tracking-wide transition-all hover:scale-[1.02] shadow-[0_0_24px_rgba(200,130,30,0.35)]">
                {t("landing.navbar.createAccount")}
              </button>
            </Link>
            <FlagSwitcher dark />
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-[#8898aa] hover:text-white p-1.5" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.07] bg-[#09090d]/98 backdrop-blur-2xl px-6 py-6 space-y-4">
            <button onClick={() => scrollTo("funksjoner")} className="block text-[#8898aa] hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.features")}</button>
            <button onClick={() => scrollTo("slik-fungerer")} className="block text-[#8898aa] hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.howItWorks")}</button>
            <button onClick={() => scrollTo("priser")} className="block text-[#8898aa] hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.pricing")}</button>
            <button onClick={() => scrollTo("faq")} className="block text-[#8898aa] hover:text-white w-full text-left py-2 text-sm">FAQ</button>
            <Link href="/sign-in" className="block text-[#8898aa] hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
              <button className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-[#09090d] rounded-xl font-black text-sm mt-2 transition-all">
                {t("landing.navbar.createAccount")}
              </button>
            </Link>
            <FlagSwitcher dark className="pt-2" />
          </div>
        )}
      </nav>

      <main className="relative z-10">

        {/* ════ HERO ════ */}
        <section className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src="/opengraph.jpg"
              alt=""
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#09090d]/75 via-[#09090d]/55 to-[#09090d]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09090d]/60 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 pt-32 pb-20">
            <div className="max-w-3xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-[12.5px] font-semibold text-white/70 mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                {t("landing.badge")}
              </div>

              {/* Headline */}
              <h1 className="text-[52px] sm:text-[68px] md:text-[84px] font-black leading-[0.95] tracking-[-0.03em] mb-7">
                <span className="text-white drop-shadow-2xl">
                  {t("landing.hero.title1")}
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  {t("landing.hero.title2")}
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-[18px] md:text-[20px] text-white/60 max-w-lg mb-10 leading-relaxed">
                {t("landing.hero.subtitle")}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-12">
                <Link href="/sign-up">
                  <button className="flex items-center gap-2 h-14 px-8 text-[15px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-[#09090d] font-black tracking-wide shadow-[0_0_50px_rgba(200,130,30,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(200,130,30,0.5)]">
                    {t("landing.hero.ctaPrimary")}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
                <button
                  onClick={() => scrollTo("slik-fungerer")}
                  className="flex items-center gap-2 h-14 px-6 text-[15px] rounded-2xl bg-white/[0.07] border border-white/[0.14] text-white/80 hover:text-white hover:bg-white/[0.12] transition-all duration-200 font-semibold backdrop-blur-sm"
                >
                  {t("landing.hero.ctaSecondary")}
                </button>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-white/45">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-500/70" />GDPR-trygg · Data i Norge</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500/70" />Oppsett på 2 minutter</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500/70" />50 kr/mnd via Vipps</span>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-40">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">Scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </section>

        {/* ════ STATS BAR ════ */}
        <section className="border-y border-white/[0.05] bg-white/[0.008] py-16">
          <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-10">
            <StatCard value={12000} suffix="+"  label={t("landing.stats.vehicles")}  delay={0} />
            <StatCard value={500}   suffix="+"  label={t("landing.stats.clubs")}     delay={80} />
            <StatCard value={45000} suffix="+"  label={t("landing.stats.documents")} delay={160} />
            <StatCard value={100}   suffix="%"  label={t("landing.stats.passion")}   delay={240} />
          </div>
        </section>

        {/* ════ APP SHOWCASE ════ */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 py-28">
          <FadeIn className="text-center mb-16">
            <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-5">
              Plattformen
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em] mb-5">
              Alt du trenger.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Ingenting du ikke trenger.</span>
            </h2>
            <p className="text-[#8898aa] max-w-xl mx-auto text-lg leading-relaxed">
              DriveGarage er bygget for entusiaster som tar vare på historien bak hvert kjøretøy.
            </p>
          </FadeIn>
          <FadeIn delay={80}>
            <ProductMockup />
          </FadeIn>
        </section>

        {/* ════ BEFORE / AFTER ════ */}
        <section id="hvorfor" className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-950/[0.06] to-transparent" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-16">
              <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-5">
                {t("landing.why.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em] mb-5">
                {t("landing.why.title")}
              </h2>
              <p className="text-[#8898aa] max-w-xl mx-auto text-lg leading-relaxed">
                {t("landing.why.subtitle")}
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Without */}
              <FadeIn delay={0}>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-[13px] font-black uppercase tracking-wider text-red-400/80">Uten DriveGarage</p>
                  </div>
                  <ul className="space-y-3.5">
                    {[
                      "Mapper med kvitteringer ingen kan finne",
                      "Servicehistorikk på gule lapper",
                      "Bilder spredt over tre telefoner",
                      "Glemt vedlikehold senker verdien",
                      "Papirarbeid før hvert salg",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3 text-[13.5px] text-[#8898aa]">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 shrink-0 mt-2" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>

              {/* With */}
              <FadeIn delay={80}>
                <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] to-orange-500/[0.03] p-8 h-full shadow-[0_0_60px_rgba(180,100,20,0.08)]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[13px] font-black uppercase tracking-wider text-amber-400">Med DriveGarage</p>
                  </div>
                  <ul className="space-y-3.5">
                    {[
                      "All historikk samlet på ett sted",
                      "Søkbar servicelogg med bilder",
                      "Dokumentarkiv alltid tilgjengelig",
                      "Dokumentert verdi styrker salgsprisen",
                      "Del hele historien med ett klikk",
                    ].map((t) => (
                      <li key={t} className="flex items-start gap-3 text-[13.5px] text-white/80">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ════ FEATURES ════ */}
        <section id="funksjoner" className="py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] via-white/[0.025] to-white/[0.01] border-y border-white/[0.04]" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-16">
              <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-5">
                {t("landing.features.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em] mb-5">
                {t("landing.features.title")}
              </h2>
              <p className="text-[#8898aa] max-w-xl mx-auto text-lg leading-relaxed">
                {t("landing.features.subtitle")}
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc, color, border, glow }, i) => (
                <FadeIn key={title} delay={Math.floor(i / 3) * 50 + (i % 3) * 70}>
                  <div className={`group h-full rounded-2xl border ${border} ${glow} hover:bg-amber-500/[0.06] transition-all duration-300 p-7 flex flex-col gap-5`}>
                    <div className={`w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white mb-2">{title}</h3>
                      <p className="text-[#8898aa] text-[13.5px] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════ */}
        <section id="slik-fungerer" className="max-w-7xl mx-auto px-5 md:px-8 py-28">
          <FadeIn className="text-center mb-20">
            <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-5">
              {t("landing.howItWorks.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em]">
              {t("landing.howItWorks.title")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[22%] right-[22%] h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

            {[
              {
                step: "01",
                title: "Opprett garasjen din",
                desc: "Registrer deg og legg til kjøretøyene dine. Bill, MC, klassiker — alt er velkomment.",
                icon: Car,
              },
              {
                step: "02",
                title: "Logg service og dokumenter",
                desc: "Legg inn serviceposter, kvitteringer og bilder. Bygg en komplett tidslinje.",
                icon: Wrench,
              },
              {
                step: "03",
                title: "Bevarer historien for alltid",
                desc: "Alt er søkbart, eksporterbart og trygt lagret. For deg og alle som kommer etter.",
                icon: FileText,
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-16 h-16 rounded-2xl bg-[#09090d] border border-amber-500/30 flex items-center justify-center text-xl font-black text-amber-400 mb-7 shadow-[0_0_30px_rgba(180,100,20,0.15)] relative z-10 shrink-0 tracking-widest">
                    {item.step}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-[17px] font-bold text-white mb-3 leading-snug">{item.title}</h3>
                  <p className="text-[#8898aa] text-[14px] leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ════ COMMUNITY ════ */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-950/[0.07] to-transparent" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <FadeIn>
                <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-6">
                  Fellesskap
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em] mb-6 leading-tight">
                  Bli en del av<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">entusiastmiljøet.</span>
                </h2>
                <p className="text-[#8898aa] text-lg leading-relaxed mb-8">
                  Finn din stamme. Bli med i bilklubber, MC-foreninger og lokale samlinger. Del lidenskap med likesinnede.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    { icon: Car,   text: "Klassiske bilklubber etter merke og modell" },
                    { icon: Bike,  text: "MC-foreninger og turryttere" },
                    { icon: MapPin, text: "Lokale treff og arrangementer" },
                    { icon: Users, text: "Invitasjonsbasert eller åpne klubber" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-[14px] text-white/75">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up">
                  <button className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 text-amber-400 hover:text-amber-300 transition-all text-[14px] font-bold">
                    Utforsk klubber
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </FadeIn>

              {/* Club cards */}
              <FadeIn delay={80}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "Norsk Volvoklubben",     type: "Bil",  members: 284, color: "from-blue-500/10 border-blue-500/20" },
                    { name: "MC Norge",               type: "MC",   members: 512, color: "from-orange-500/10 border-orange-500/20" },
                    { name: "Veteranvogneiere",       type: "Bil",  members: 193, color: "from-amber-500/10 border-amber-500/20" },
                    { name: "Bergen Klassikklubb",    type: "Bil",  members: 148, color: "from-emerald-500/10 border-emerald-500/20" },
                    { name: "Harley Owners Trondheim",type: "MC",   members: 227, color: "from-red-500/10 border-red-500/20" },
                    { name: "Ford F100 Norge",        type: "Bil",  members: 89,  color: "from-amber-500/10 border-amber-500/20" },
                  ].map(({ name, type, members, color }) => (
                    <div key={name} className={`rounded-xl border bg-gradient-to-br ${color} to-transparent p-4 hover:scale-[1.01] transition-transform duration-200 cursor-default`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                          {type === "MC" ? <Bike className="w-4 h-4 text-white/60" /> : <Car className="w-4 h-4 text-white/60" />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/30 bg-white/5 border border-white/8 rounded-full px-2 py-0.5">{type}</span>
                      </div>
                      <p className="text-[12px] font-bold text-white leading-snug mb-1">{name}</p>
                      <p className="text-[11px] text-[#7a8a96] flex items-center gap-1">
                        <Users className="w-3 h-3" />{members} medlemmer
                      </p>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ════ TESTIMONIALS ════ */}
        <section className="py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.012] to-transparent border-y border-white/[0.04]" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-14">
              <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-5">
                {t("landing.testimonials.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em]">
                {t("landing.testimonials.title")}
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((item, i) => (
                <FadeIn key={item.name} delay={i * 70}>
                  <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.035] transition-all duration-300 p-7 flex flex-col gap-5">
                    <div className="flex gap-1">
                      {Array.from({ length: item.stars }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[14px] text-white/70 leading-relaxed flex-1">"{item.text}"</p>
                    <div className="border-t border-white/[0.06] pt-4">
                      <p className="font-bold text-white text-[13.5px]">{item.name}</p>
                      <p className="text-[11px] text-[#7a8a96] mt-0.5 flex items-center gap-1.5"><Car className="w-3 h-3" />{item.vehicle}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════ PRICING ════ */}
        <section id="priser" className="py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-950/[0.09] to-transparent" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-14">
              <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-[0.14em] mb-5">
                {t("landing.pricing.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.025em] mb-5">
                {t("landing.pricing.title")}
              </h2>
              <p className="text-[#8898aa] max-w-md mx-auto text-lg">
                Én plan. Alt inkludert. Betalt med Vipps.
              </p>
            </FadeIn>

            <FadeIn delay={80}>
              <div className="max-w-lg mx-auto">
                <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-600/[0.10] to-orange-600/[0.05] backdrop-blur-xl shadow-[0_0_80px_rgba(180,100,20,0.18)] overflow-hidden">
                  {/* Top badge */}
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090d] text-[11px] font-black px-6 py-1 rounded-b-2xl tracking-wider shadow-[0_4px_20px_rgba(200,130,30,0.45)]">
                    {t("landing.pricing.plan.badge")}
                  </div>

                  <div className="p-8 pt-10">
                    <div className="flex items-start justify-between mb-7">
                      <div>
                        <p className="text-[11px] font-black text-amber-400 uppercase tracking-[0.14em] mb-2">
                          DriveGarage Premium
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-5xl font-black text-white tracking-tight">50 kr</span>
                          <span className="text-[#8898aa] text-base">/mnd</span>
                        </div>
                        <p className="text-[12px] text-[#7a8a96] mt-1">per bruker · ingen bindingstid · ingen prøveperiode</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(200,130,30,0.4)]">
                        <Car className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <ul className="space-y-3 mb-7">
                      {PLAN_FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-white/80">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>

                    <Link href="/sign-up">
                      <button className="w-full h-13 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#09090d] rounded-xl text-[15px] font-black shadow-[0_0_30px_rgba(200,130,30,0.35)] transition-all hover:scale-[1.01]" style={{ height: "52px" }}>
                        {t("landing.pricing.plan.cta")}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>

                    {/* Vipps callout */}
                    <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 px-4 py-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#FF5B24] flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white mb-0.5">Betaling via Vipps Recurring</p>
                        <p className="text-[11.5px] text-[#8898aa] leading-relaxed">
                          Godkjenn betalingsavtalen i Vipps-appen. Ingen kortopplysninger hos oss. Avslutt når som helst — direkte i profilen din.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reassurance */}
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: Lock,   text: "Ingen binding" },
                    { icon: Shield, text: "GDPR-trygg" },
                    { icon: Zap,    text: "Aktiv på 2 min" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex flex-col items-center gap-1.5">
                      <Icon className="w-4 h-4 text-amber-500/50" />
                      <span className="text-[11px] text-[#7a8a96]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ════ FAQ ════ */}
        <section id="faq" className="max-w-3xl mx-auto px-5 md:px-8 py-28">
          <FadeIn className="text-center mb-12">
            <div className="inline-block px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#8898aa] text-[11px] font-black uppercase tracking-[0.14em] mb-5">
              {t("landing.faq.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.025em]">
              {t("landing.faq.title")}
            </h2>
          </FadeIn>

          <FadeIn delay={60}>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-md px-7 md:px-9">
              {FAQ_ITEMS.map(({ q, a }) => (
                <FAQItem key={q} question={q} answer={a} />
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ════ FINAL CTA ════ */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-950/10" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-amber-600/[0.07] blur-[130px]" />
          <FadeIn className="max-w-4xl mx-auto px-5 md:px-8 relative z-10 text-center">
            <div className="inline-block px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#8898aa] text-[11px] font-black uppercase tracking-[0.14em] mb-8">
              Kom i gang i dag
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.025em] mb-6 leading-[1.0]">
              {t("landing.cta.title")}
            </h2>
            <p className="text-[#8898aa] text-xl mb-10 max-w-md mx-auto leading-relaxed">
              {t("landing.cta.subtitle")}
            </p>
            <Link href="/sign-up">
              <button className="inline-flex items-center gap-2.5 h-14 px-10 text-[17px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-[#09090d] font-black shadow-[0_0_60px_rgba(200,130,30,0.35)] transition-all hover:scale-[1.03] hover:shadow-[0_0_80px_rgba(200,130,30,0.45)]">
                {t("landing.cta.button")}
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <p className="mt-5 text-[12px] text-[#7a8a96]">50 kr/mnd · Betaling via Vipps · Ingen binding · Avslutt når som helst</p>
          </FadeIn>
        </section>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-white/[0.05] bg-[#060608] relative z-10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-14">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_12px_rgba(180,90,20,0.3)]">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="text-[16px] font-black text-white">DriveGarage</span>
              </div>
              <p className="text-[#7a8a96] text-[13.5px] leading-relaxed max-w-[260px] mb-5">
                {t("landing.footer.desc")}
              </p>
              <CompanyInfo className="text-[#7a8a96] text-[12px] leading-relaxed space-y-0.5" />
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-black mb-4 text-[12px] uppercase tracking-[0.12em]">{t("landing.footer.product")}</h4>
              <ul className="space-y-2.5 text-[13.5px] text-[#7a8a96]">
                <li><button onClick={() => scrollTo("funksjoner")} className="hover:text-white transition-colors duration-150">{t("landing.footer.features")}</button></li>
                <li><button onClick={() => scrollTo("priser")}     className="hover:text-white transition-colors duration-150">{t("landing.footer.pricing")}</button></li>
                <li><button onClick={() => scrollTo("faq")}        className="hover:text-white transition-colors duration-150">FAQ</button></li>
                <li><Link href="/sign-in"  className="hover:text-white transition-colors duration-150">{t("landing.footer.logIn")}</Link></li>
                <li><Link href="/sign-up"  className="hover:text-white transition-colors duration-150 text-amber-400 font-semibold">{t("landing.navbar.createAccount")}</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-black mb-4 text-[12px] uppercase tracking-[0.12em]">{t("landing.footer.company")}</h4>
              <ul className="space-y-2.5 text-[13.5px] text-[#7a8a96]">
                <li><Link href="/contact" className="hover:text-white transition-colors duration-150">{t("landing.footer.contact")}</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors duration-150">{t("landing.footer.privacy")}</Link></li>
                <li><Link href="/terms"   className="hover:text-white transition-colors duration-150">{t("landing.footer.terms")}</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors duration-150">{t("landing.footer.cookies")}</Link></li>
              </ul>
            </div>

            {/* Betaling */}
            <div>
              <h4 className="text-white font-black mb-4 text-[12px] uppercase tracking-[0.12em]">Betaling</h4>
              <ul className="space-y-2.5 text-[13.5px] text-[#7a8a96]">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B24] shrink-0" />
                  Vipps Recurring
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                  Ingen kortlagring
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                  GDPR-trygg
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-500/60 shrink-0" />
                  Ingen bindingstid
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/[0.05] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[#7a8a96]">
              © {new Date().getFullYear()} DriveGarage. Alle rettigheter forbeholdt.
            </p>
            <div className="flex items-center gap-5 text-[12px] text-[#7a8a96]">
              <Link href="/privacy" className="hover:text-white transition-colors">{t("landing.footer.privacy")}</Link>
              <Link href="/terms"   className="hover:text-white transition-colors">{t("landing.footer.terms")}</Link>
              <Link href="/cookies" className="hover:text-white transition-colors">{t("landing.footer.cookies")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
