import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Car, Wrench, FileText, History, Users, MessageSquare,
  Calendar, ArrowRightLeft, Bot, Cloud, CheckCircle2,
  ChevronRight, Menu, X, Star, Shield, Zap, Plus, Minus,
  Clock, Lock, TrendingUp, Camera,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";
import { CompanyInfo } from "@/components/company-info";

/* ── useInView ───────────────────────────────────────────────── */
function useInView(threshold = 0.1) {
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

/* ── FadeIn ──────────────────────────────────────────────────── */
function FadeIn({
  children, delay = 0, y = 20, className = "",
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

/* ── Animated counter ────────────────────────────────────────── */
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
      <div className="text-3xl md:text-5xl font-extrabold text-white mb-1.5 tabular-nums tracking-tight">
        {count.toLocaleString("nb-NO")}{suffix}
      </div>
      <div className="text-[11px] text-[#8899bb] uppercase tracking-widest font-medium">{label}</div>
    </div>
  );
}

/* ── FAQ item ────────────────────────────────────────────────── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.07] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full py-5 flex items-center justify-between gap-4 text-left group"
      >
        <span className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors leading-snug">
          {question}
        </span>
        <span className="shrink-0 text-[#8899bb] transition-transform duration-200" style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
          <Plus className="w-4 h-4" />
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "200px" : "0px" }}
      >
        <p className="text-sm text-[#8899bb] leading-relaxed pb-5">{answer}</p>
      </div>
    </div>
  );
}

/* ── Product Mockup ──────────────────────────────────────────── */
function ProductMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto mt-16 md:mt-20 select-none pointer-events-none">
      <div className="absolute -inset-8 rounded-3xl bg-gradient-to-b from-indigo-600/10 to-cyan-600/5 blur-3xl" />
      <div className="relative rounded-2xl border border-white/[0.10] bg-[#090e1d]/95 backdrop-blur-xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Browser chrome */}
        <div className="bg-[#060b18] border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
          <div className="flex gap-1.5">
            {["bg-red-500/40", "bg-amber-500/40", "bg-green-500/40"].map((c) => (
              <div key={c} className={`w-3 h-3 rounded-full ${c}`} />
            ))}
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-md px-4 py-1 text-[11px] text-[#8899bb] w-52 text-center tracking-wide">
              drivegarage.no/dashboard
            </div>
          </div>
        </div>
        {/* App layout */}
        <div className="flex" style={{ height: "280px" }}>
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col gap-0.5 w-44 shrink-0 border-r border-white/[0.05] bg-[#050a18] p-3">
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.4)]">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-bold text-white tracking-tight">DriveGarage</span>
            </div>
            {[
              { label: "Oversikt", active: true },
              { label: "Garasjen min", active: false },
              { label: "Klubber", active: false },
              { label: "Abonnement", active: false },
            ].map(({ label, active }) => (
              <div
                key={label}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium ${
                  active ? "bg-indigo-500/15 text-indigo-300" : "text-[#8899bb]"
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          {/* Main */}
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">God morgen, Erik 👋</span>
              <div className="bg-green-500/10 border border-green-500/20 rounded-md px-2 py-0.5 text-[10px] text-green-400 font-semibold">
                Aktivt abonnement
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Kjøretøy", value: "3", color: "text-indigo-400" },
                { label: "Serviceposter", value: "47", color: "text-cyan-400" },
                { label: "Kvitteringer", value: "124", color: "text-violet-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] text-[#8899bb] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {/* Vehicles */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "1968 Volvo Amazon", dot: "bg-amber-400", tag: "Bil", km: "87 400 km" },
                { name: "1972 Triumph Bonneville", dot: "bg-indigo-400", tag: "MC", km: "22 100 km" },
                { name: "1955 Ford F100", dot: "bg-cyan-400", tag: "Bil", km: "141 200 km" },
              ].map(({ name, dot, tag, km }) => (
                <div key={name} className="bg-white/[0.025] border border-white/[0.07] rounded-lg p-2.5 hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                    <span className="text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[#8899bb]">{tag}</span>
                  </div>
                  <div className="text-[10px] font-semibold text-white leading-tight">{name}</div>
                  <div className="text-[9px] text-[#8899bb] mt-0.5">{km}</div>
                </div>
              ))}
            </div>
            {/* Recent activity */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-[#8899bb]">Siste: Oljeskift · Volvo Amazon · 2 dager siden</span>
            </div>
          </div>
        </div>
      </div>
      {/* Floating badges */}
      <div className="absolute -right-4 top-16 hidden lg:flex flex-col gap-2">
        <div className="bg-[#0c1326]/90 border border-white/10 backdrop-blur-xl rounded-xl px-3 py-2.5 shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-[11px] text-white font-medium whitespace-nowrap">PDF-eksport klar</span>
        </div>
        <div className="bg-[#0c1326]/90 border border-white/10 backdrop-blur-xl rounded-xl px-3 py-2.5 shadow-xl flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] text-white font-medium whitespace-nowrap">AI-råd tilgjengelig</span>
        </div>
      </div>
      <div className="absolute -left-4 bottom-10 hidden lg:block">
        <div className="bg-[#0c1326]/90 border border-white/10 backdrop-blur-xl rounded-xl px-3 py-2.5 shadow-xl flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[11px] text-white font-medium whitespace-nowrap">Data lagret i Norge</span>
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

/* ── Main component ──────────────────────────────────────────── */
export default function LandingPage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const FEATURES = [
    { icon: Wrench,           title: t("landing.features.f1Title"), desc: t("landing.features.f1Desc"), color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
    { icon: Camera,           title: t("landing.features.f2Title"), desc: t("landing.features.f2Desc"), color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
    { icon: History,          title: t("landing.features.f3Title"), desc: t("landing.features.f3Desc"), color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
    { icon: Users,            title: t("landing.features.f4Title"), desc: t("landing.features.f4Desc"), color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
    { icon: MessageSquare,    title: t("landing.features.f5Title"), desc: t("landing.features.f5Desc"), color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
    { icon: Calendar,         title: t("landing.features.f6Title"), desc: t("landing.features.f6Desc"), color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
    { icon: ArrowRightLeft,   title: t("landing.features.f7Title"), desc: t("landing.features.f7Desc"), color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
    { icon: Bot,              title: t("landing.features.f8Title"), desc: t("landing.features.f8Desc"), color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
    { icon: Cloud,            title: t("landing.features.f9Title"), desc: t("landing.features.f9Desc"), color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
  ];

  const STEPS = [
    { step: "01", title: t("landing.howItWorks.step1Title"), desc: t("landing.howItWorks.step1Desc") },
    { step: "02", title: t("landing.howItWorks.step2Title"), desc: t("landing.howItWorks.step2Desc") },
    { step: "03", title: t("landing.howItWorks.step3Title"), desc: t("landing.howItWorks.step3Desc") },
    { step: "04", title: t("landing.howItWorks.step4Title"), desc: t("landing.howItWorks.step4Desc") },
  ];

  const WHY_ITEMS = [
    { icon: TrendingUp, title: t("landing.why.r1Title"), desc: t("landing.why.r1Desc"), color: "text-green-400",  bg: "from-green-500/10", border: "border-green-500/20" },
    { icon: Camera,     title: t("landing.why.r2Title"), desc: t("landing.why.r2Desc"), color: "text-indigo-400", bg: "from-indigo-500/10", border: "border-indigo-500/20" },
    { icon: FileText,   title: t("landing.why.r3Title"), desc: t("landing.why.r3Desc"), color: "text-cyan-400",   bg: "from-cyan-500/10",   border: "border-cyan-500/20" },
  ];

  const FAQ_ITEMS = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
    { q: t("landing.faq.q6"), a: t("landing.faq.a6") },
  ];

  return (
    <div className="min-h-screen bg-[#050914] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-indigo-600/[0.12] blur-[150px]" />
        <div className="absolute top-[35%] right-[-8%]  w-[38%] h-[38%] rounded-full bg-violet-600/[0.09] blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[8%]  w-[50%] h-[40%] rounded-full bg-blue-700/[0.07] blur-[180px]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* ════ NAVBAR ════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.08] bg-[#050914]/85 backdrop-blur-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.35)]">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="text-[17px] font-bold tracking-tight">DriveGarage</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-[#8899bb]">
            <button onClick={() => scrollTo("funksjoner")} className="hover:text-white transition-colors duration-200">{t("landing.navbar.features")}</button>
            <button onClick={() => scrollTo("slik-fungerer")} className="hover:text-white transition-colors duration-200">{t("landing.navbar.howItWorks")}</button>
            <button onClick={() => scrollTo("priser")} className="hover:text-white transition-colors duration-200">{t("landing.navbar.pricing")}</button>
            <Link href="/sign-in" className="hover:text-white transition-colors duration-200">{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up">
              <Button className="h-9 px-5 text-sm rounded-full bg-white text-[#050914] hover:bg-white/90 border-0 font-semibold shadow-[0_0_20px_rgba(255,255,255,0.12)] transition-all hover:scale-[1.02]">
                {t("landing.navbar.createAccount")}
              </Button>
            </Link>
            <FlagSwitcher dark />
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden text-[#8899bb] hover:text-white p-1.5" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#050914]/98 backdrop-blur-2xl px-6 py-6 space-y-4">
            <button onClick={() => scrollTo("funksjoner")} className="block text-[#8899bb] hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.features")}</button>
            <button onClick={() => scrollTo("slik-fungerer")} className="block text-[#8899bb] hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.howItWorks")}</button>
            <button onClick={() => scrollTo("priser")} className="block text-[#8899bb] hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.pricing")}</button>
            <Link href="/sign-in" className="block text-[#8899bb] hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
              <Button className="w-full h-11 bg-white text-[#050914] border-0 rounded-xl font-semibold mt-2 text-sm">
                {t("landing.navbar.createAccount")}
              </Button>
            </Link>
            <FlagSwitcher dark className="pt-2" />
          </div>
        )}
      </nav>

      <main className="relative z-10">

        {/* ════ HERO ════ */}
        <section className="max-w-7xl mx-auto px-5 md:px-8 pt-40 pb-8 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-[13px] font-medium text-[#a0b0cc] mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            {t("landing.badge")}
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-[76px] font-extrabold tracking-[-0.03em] leading-[1.02] mb-7 max-w-4xl mx-auto">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70">
              {t("landing.hero.title1")}
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
              {t("landing.hero.title2")}
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-[17px] md:text-xl text-[#8899bb] max-w-xl mx-auto mb-10 leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/sign-up">
              <Button className="h-13 px-8 text-[15px] rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 shadow-[0_0_50px_rgba(99,102,241,0.35)] transition-all hover:scale-[1.02] font-semibold" style={{ height: "52px" }}>
                {t("landing.hero.ctaPrimary")}
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <button
              onClick={() => scrollTo("slik-fungerer")}
              className="h-13 px-6 text-[15px] rounded-full bg-white/[0.05] border border-white/[0.10] text-[#a0b0cc] hover:text-white hover:bg-white/[0.09] transition-all duration-200 font-medium flex items-center gap-2"
              style={{ height: "52px" }}
            >
              {t("landing.hero.ctaSecondary")}
            </button>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8 text-[13px] text-[#8899bb]/70">
            {[
              { icon: Shield, text: t("landing.trust.secureData") },
              { icon: Clock,  text: t("landing.trust.setup") },
              { icon: Lock,   text: "50 kr/mnd via Vipps" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Product mockup */}
          <ProductMockup />
        </section>

        {/* ════ STATS BAR ════ */}
        <section className="border-y border-white/[0.06] bg-white/[0.01] backdrop-blur-sm py-14 mt-8">
          <div className="max-w-4xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-10">
            <StatCard value={12000} suffix="+" label={t("landing.stats.vehicles")}  delay={0} />
            <StatCard value={500}   suffix="+" label={t("landing.stats.clubs")}     delay={80} />
            <StatCard value={45000} suffix="+" label={t("landing.stats.documents")} delay={160} />
            <StatCard value={100}   suffix="%" label={t("landing.stats.passion")}   delay={240} />
          </div>
        </section>

        {/* ════ WHY DRIVEGARAGE ════ */}
        <section id="hvorfor" className="max-w-7xl mx-auto px-5 md:px-8 py-28">
          <FadeIn className="text-center mb-16">
            <div className="inline-block px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-5">
              {t("landing.why.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
              {t("landing.why.title")}
            </h2>
            <p className="text-[#8899bb] max-w-xl mx-auto text-lg leading-relaxed">
              {t("landing.why.subtitle")}
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHY_ITEMS.map(({ icon: Icon, title, desc, color, bg, border }, i) => (
              <FadeIn key={title} delay={i * 80} className="h-full">
                <div className={`h-full rounded-2xl border ${border} bg-gradient-to-br ${bg} to-transparent p-7 flex flex-col gap-4`}>
                  <div className={`w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                    <p className="text-[#8899bb] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ════ FEATURES ════ */}
        <section id="funksjoner" className="py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/[0.08] via-indigo-950/[0.12] to-transparent border-y border-white/[0.04]" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-16">
              <div className="inline-block px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-5">
                {t("landing.features.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
                {t("landing.features.title")}
              </h2>
              <p className="text-[#8899bb] max-w-xl mx-auto text-lg leading-relaxed">
                {t("landing.features.subtitle")}
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
                <FadeIn key={title} delay={Math.floor(i / 3) * 60 + (i % 3) * 80}>
                  <div className="group h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.045] backdrop-blur-md transition-all duration-300 p-7 flex flex-col gap-5">
                    <div className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
                      <p className="text-[#8899bb] text-sm leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════ HOW IT WORKS ════ */}
        <section id="slik-fungerer" className="max-w-7xl mx-auto px-5 md:px-8 py-28">
          <FadeIn className="text-center mb-16">
            <div className="inline-block px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-5">
              {t("landing.howItWorks.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t("landing.howItWorks.title")}
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-[28px] left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent" />

            {STEPS.map((item, i) => (
              <FadeIn key={i} delay={i * 90} className="flex flex-col items-center sm:items-start text-center sm:text-left lg:items-start lg:text-left">
                <div className="w-14 h-14 rounded-2xl bg-[#050914] border border-indigo-500/30 flex items-center justify-center text-base font-bold text-indigo-400 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.12)] relative z-10 tracking-widest shrink-0">
                  {item.step}
                </div>
                <h3 className="text-base font-semibold text-white mb-2 leading-snug">{item.title}</h3>
                <p className="text-[#8899bb] text-sm leading-relaxed">{item.desc}</p>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ════ TESTIMONIALS ════ */}
        <section className="py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/[0.08] to-transparent" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-14">
              <div className="inline-block px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-5">
                {t("landing.testimonials.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                {t("landing.testimonials.title")}
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((item, i) => (
                <FadeIn key={item.name} delay={i * 80}>
                  <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-md hover:bg-white/[0.04] transition-all duration-300 p-7 flex flex-col gap-5">
                    <div className="flex gap-1">
                      {Array.from({ length: item.stars }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-[#c5d0e8] text-[14px] leading-relaxed flex-1">"{item.text}"</p>
                    <div>
                      <p className="font-semibold text-white text-sm">{item.name}</p>
                      <p className="text-[11px] text-[#8899bb] mt-0.5">{item.vehicle}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════ PRICING ════ */}
        <section id="priser" className="py-28 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/[0.12] to-transparent" />
          <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
            <FadeIn className="text-center mb-14">
              <div className="inline-block px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-5">
                {t("landing.pricing.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
                {t("landing.pricing.title")}
              </h2>
              <p className="text-[#8899bb] max-w-md mx-auto text-lg">
                {t("landing.pricing.subtitle")}
              </p>
            </FadeIn>

            <FadeIn delay={80}>
              <div className="max-w-lg mx-auto">
                {/* Plan card */}
                <div className="relative rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600/[0.12] to-violet-600/[0.08] backdrop-blur-xl shadow-[0_0_80px_rgba(99,102,241,0.18)] overflow-hidden">
                  {/* Top badge */}
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[11px] font-bold px-5 py-1 rounded-b-2xl tracking-wider shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
                    {t("landing.pricing.plan.badge")}
                  </div>

                  <div className="p-8 pt-10">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
                          {t("landing.pricing.plan.label")}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-5xl font-extrabold text-white tracking-tight">50 kr</span>
                          <span className="text-[#8899bb] text-base">{t("landing.pricing.plan.period")}</span>
                        </div>
                        <p className="text-xs text-[#8899bb] mt-1">per bruker · ingen bindingstid</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                        <Car className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <ul className="space-y-3 mb-7">
                      {[
                        t("landing.pricing.plan.f1"), t("landing.pricing.plan.f2"),
                        t("landing.pricing.plan.f3"), t("landing.pricing.plan.f4"),
                        t("landing.pricing.plan.f5"), t("landing.pricing.plan.f6"),
                        t("landing.pricing.plan.f7"),
                      ].map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-white/85">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>

                    <Link href="/sign-up">
                      <Button className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 rounded-xl text-[15px] font-semibold shadow-[0_0_30px_rgba(99,102,241,0.35)] transition-all hover:scale-[1.01]">
                        {t("landing.pricing.plan.cta")}
                      </Button>
                    </Link>

                    {/* Vipps callout */}
                    <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#FF5B24] flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white mb-0.5">Betaling via Vipps</p>
                        <p className="text-[11px] text-[#8899bb] leading-relaxed">
                          Godkjenn betalingsavtale i Vipps-appen. Ingen kortopplysninger lagres hos oss. Avslutt når som helst.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Below-card reassurance */}
                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: Lock,   text: "Ingen binding" },
                    { icon: Shield, text: "GDPR-trygg" },
                    { icon: Zap,    text: "Aktiv på 2 min" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex flex-col items-center gap-1.5">
                      <Icon className="w-4 h-4 text-[#8899bb]/60" />
                      <span className="text-[11px] text-[#8899bb]/70">{text}</span>
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
            <div className="inline-block px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.09] text-[#8899bb] text-xs font-semibold uppercase tracking-widest mb-5">
              {t("landing.faq.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t("landing.faq.title")}
            </h2>
          </FadeIn>

          <FadeIn delay={60}>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md px-6 md:px-8 divide-y divide-transparent">
              {FAQ_ITEMS.map(({ q, a }) => (
                <FAQItem key={q} question={q} answer={a} />
              ))}
            </div>
          </FadeIn>
        </section>

        {/* ════ FINAL CTA ════ */}
        <section className="py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-950/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-indigo-600/[0.08] blur-[120px]" />
          <FadeIn className="max-w-4xl mx-auto px-5 md:px-8 relative z-10 text-center">
            <div className="inline-block px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.09] text-[#a0b0cc] text-xs font-semibold uppercase tracking-widest mb-8">
              Kom i gang i dag
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-[-0.02em] mb-6 leading-[1.05]">
              {t("landing.cta.title")}
            </h2>
            <p className="text-[#8899bb] text-xl mb-10 max-w-md mx-auto leading-relaxed">
              {t("landing.cta.subtitle")}
            </p>
            <Link href="/sign-up">
              <Button className="h-14 px-12 text-lg rounded-full bg-white text-[#050914] hover:bg-white/92 border-0 font-bold shadow-[0_0_60px_rgba(255,255,255,0.18)] transition-all hover:scale-[1.03]">
                {t("landing.cta.button")}
              </Button>
            </Link>
            <p className="mt-5 text-xs text-[#8899bb]/60">50 kr/mnd · Betaling via Vipps · Ingen binding</p>
          </FadeIn>
        </section>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-white/[0.06] bg-[#030710] relative z-10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-14">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                  <Car className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-base font-bold">DriveGarage</span>
              </div>
              <p className="text-[#8899bb] text-sm leading-relaxed max-w-[260px] mb-5">
                {t("landing.footer.desc")}
              </p>
              <CompanyInfo className="text-[#8899bb] text-xs leading-relaxed space-y-0.5" />
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">{t("landing.footer.product")}</h4>
              <ul className="space-y-2.5 text-sm text-[#8899bb]">
                <li><button onClick={() => scrollTo("funksjoner")} className="hover:text-white transition-colors duration-150">{t("landing.footer.features")}</button></li>
                <li><button onClick={() => scrollTo("priser")}     className="hover:text-white transition-colors duration-150">{t("landing.footer.pricing")}</button></li>
                <li><button onClick={() => scrollTo("faq")}        className="hover:text-white transition-colors duration-150">FAQ</button></li>
                <li><Link href="/sign-in"  className="hover:text-white transition-colors duration-150">{t("landing.footer.logIn")}</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">{t("landing.footer.company")}</h4>
              <ul className="space-y-2.5 text-sm text-[#8899bb]">
                <li><Link href="/contact" className="hover:text-white transition-colors duration-150">{t("landing.footer.contact")}</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors duration-150">{t("landing.footer.privacy")}</Link></li>
                <li><Link href="/terms"   className="hover:text-white transition-colors duration-150">{t("landing.footer.terms")}</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors duration-150">{t("landing.footer.cookies")}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Betaling</h4>
              <ul className="space-y-2.5 text-sm text-[#8899bb]">
                <li className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B24] shrink-0" />
                  Vipps Recurring
                </li>
                <li>50 kr/mnd</li>
                <li>Ingen binding</li>
                <li>GDPR-trygg</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8899bb]/60">
            <span>© {new Date().getFullYear()} IT Løsninger No AS. {t("landing.footer.rights")}</span>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Personvern</Link>
              <Link href="/terms"   className="hover:text-white/60 transition-colors">Vilkår</Link>
              <Link href="/cookies" className="hover:text-white/60 transition-colors">Informasjonskapsler</Link>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-indigo-400/50" />
                <span>{t("landing.footer.secure")}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
