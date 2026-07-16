import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Car, Wrench, FileText, History, Users, TrendingUp,
  Camera, Menu, X, ChevronDown, ArrowRight, CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";
import { CompanyInfo } from "@/components/company-info";

/* ─── Fade in (opacity only, Apple-style) ───────────────────────── */
function FadeIn({ children, delay = 0, className = "" }: {
  children: ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(true);
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated counter ──────────────────────────────────────────── */
function Counter({ to, suffix }: { to: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setOn(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!on) return;
    let t0: number | null = null;
    const run = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / 1400, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [on, to]);
  return <span ref={ref}>{val.toLocaleString("nb-NO")}{suffix}</span>;
}

/* ─── FAQ accordion ─────────────────────────────────────────────── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full py-5 flex items-start justify-between gap-6 text-left group"
      >
        <span className="text-[15px] text-white/75 group-hover:text-white transition-colors duration-200 leading-snug">
          {q}
        </span>
        <ChevronDown
          className="w-4 h-4 text-white/25 shrink-0 mt-0.5 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: open ? "200px" : 0 }}
      >
        <p className="text-[14px] text-white/40 leading-relaxed pb-6">{a}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function go(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const FAQ_ITEMS = [
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
  ];

  const navScrolled = scrollY > 60;

  return (
    <div className="bg-[#080808] text-white antialiased overflow-x-hidden">

      {/* ══ NAVBAR ══ */}
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
        style={{
          background: navScrolled ? "rgba(8,8,8,0.92)" : "transparent",
          backdropFilter: navScrolled ? "blur(20px)" : "none",
          borderBottom: navScrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}
      >
        <div className="max-w-[1180px] mx-auto px-6 md:px-10 h-[66px] flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Car className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-[16px] font-bold tracking-[-0.02em] text-white">DriveGarage</span>
          </div>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: t("landing.navbar.features"), id: "funksjoner" },
              { label: t("landing.navbar.howItWorks"), id: "slik-fungerer" },
              { label: t("landing.navbar.pricing"), id: "priser" },
              { label: "FAQ", id: "faq" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => go(id)}
                className="text-[13.5px] text-white/45 hover:text-white transition-colors duration-200"
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            <FlagSwitcher dark />
            <Link href="/sign-in">
              <span className="text-[13.5px] text-white/45 hover:text-white transition-colors duration-200 cursor-pointer">
                {t("landing.navbar.logIn")}
              </span>
            </Link>
            <Link href="/sign-up">
              <button className="h-8 px-4 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors">
                {t("landing.navbar.createAccount")}
              </button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-white/50 hover:text-white transition-colors"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] bg-[#080808] px-6 py-6 space-y-1">
            {[
              { label: t("landing.navbar.features"), id: "funksjoner" },
              { label: t("landing.navbar.howItWorks"), id: "slik-fungerer" },
              { label: t("landing.navbar.pricing"), id: "priser" },
              { label: "FAQ", id: "faq" },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => go(id)}
                className="block w-full text-left py-3 text-[15px] text-white/50 hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="pt-4 space-y-3">
              <Link href="/sign-in" onClick={() => setMenuOpen(false)}>
                <button className="block w-full py-3 text-[15px] text-white/50 hover:text-white transition-colors text-left">
                  {t("landing.navbar.logIn")}
                </button>
              </Link>
              <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
                <button className="w-full py-3 rounded-xl bg-white text-black font-semibold text-[15px]">
                  {t("landing.navbar.createAccount")}
                </button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ══ HERO ══ */}
      <section className="relative h-screen min-h-[680px] flex flex-col justify-end overflow-hidden">
        {/* Photo — let it breathe */}
        <img
          src="/hero-fjord.png"
          alt="1964 Volvo P1800 on a Norwegian mountain road"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 65%" }}
          draggable={false}
        />
        {/* Gradient — only at the very bottom, nothing above */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.7) 22%, rgba(8,8,8,0.15) 50%, rgba(0,0,0,0) 75%)",
          }}
        />
        {/* Subtle left vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 50%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-[1180px] mx-auto px-6 md:px-10 pb-14 md:pb-20 w-full">
          {/* Eyebrow */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-5">
            {t("landing.badge")}
          </p>

          {/* Headline — large, white, no effects */}
          <h1
            className="font-bold text-white leading-[0.93] tracking-[-0.035em] mb-6"
            style={{ fontSize: "clamp(48px, 7vw, 96px)" }}
          >
            {t("landing.hero.title1")}<br />
            {t("landing.hero.title2")}
          </h1>

          {/* One sentence */}
          <p className="text-[17px] text-white/55 max-w-sm leading-relaxed mb-9">
            {t("landing.hero.subtitle")}
          </p>

          {/* Two buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/sign-up">
              <button className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[14px] font-semibold transition-colors">
                {t("landing.hero.ctaPrimary")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <button
              onClick={() => go("slik-fungerer")}
              className="inline-flex items-center gap-2 h-12 px-7 rounded-xl border border-white/20 text-white/65 hover:text-white hover:border-white/35 text-[14px] font-medium transition-colors"
            >
              {t("landing.hero.ctaSecondary")}
            </button>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-[12px] text-white/25 tracking-wide">
            50 kr/mnd &nbsp;·&nbsp; Betaling via Vipps &nbsp;·&nbsp; Ingen binding &nbsp;·&nbsp; GDPR-trygg
          </p>
        </div>
      </section>

      {/* ══ TRUST — stats ══ */}
      <section className="border-b border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
            {[
              { to: 12000, suffix: "+", label: t("landing.stats.vehicles") },
              { to: 500,   suffix: "+", label: t("landing.stats.clubs") },
              { to: 45000, suffix: "+", label: t("landing.stats.documents") },
            ].map(({ to, suffix, label }) => (
              <div key={label} className="py-10 text-center px-4">
                <p className="text-[32px] md:text-[40px] font-bold text-white tracking-[-0.03em] tabular-nums">
                  <Counter to={to} suffix={suffix} />
                </p>
                <p className="text-[11px] text-white/30 uppercase tracking-[0.14em] mt-1.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section id="slik-fungerer" className="py-28 md:py-36 border-b border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <FadeIn>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-4">
              {t("landing.howItWorks.badge")}
            </p>
            <h2
              className="font-bold text-white tracking-[-0.03em] leading-[1.05] mb-20"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
            >
              I gang på to minutter.
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-14 md:gap-10">
            {[
              {
                n: "1",
                title: "Opprett garasjen din",
                body: "Registrer deg med e-post, Google eller Apple. Ingen kredittkort kreves for å starte.",
              },
              {
                n: "2",
                title: "Legg til kjøretøyene dine",
                body: "Veteran, motorsykkel eller nyere bil — legg til så mange du vil med ett klikk.",
              },
              {
                n: "3",
                title: "Bygg historien for alltid",
                body: "Logg service, last opp kvitteringer og bilder. Historien din vokser for hvert år.",
              },
            ].map(({ n, title, body }, i) => (
              <FadeIn key={n} delay={i * 80}>
                <div className="flex flex-col gap-5">
                  <span className="text-[11px] font-bold text-white/20 tracking-[0.1em]">0{n}</span>
                  <div className="w-px h-8 bg-amber-500/40" />
                  <h3 className="text-[19px] font-semibold text-white leading-snug">{title}</h3>
                  <p className="text-[14px] text-white/40 leading-relaxed">{body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ APP SHOWCASE ══ */}
      <section className="py-28 md:py-36 border-b border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <FadeIn className="mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-4">Plattformen</p>
            <h2
              className="font-bold text-white tracking-[-0.03em] leading-[1.05] max-w-lg"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
            >
              Orden. Oversikt. Historie.
            </h2>
          </FadeIn>

          {/* Showcase panel */}
          <FadeIn delay={60}>
            <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
              {/* Vehicle strip */}
              <div className="border-b border-white/[0.05] px-6 py-4 flex items-center gap-4 overflow-x-auto no-scrollbar">
                {[
                  { name: "1968 Volvo Amazon", km: "87 400 km", active: true },
                  { name: "1972 Triumph Bonneville", km: "22 100 km", active: false },
                  { name: "1955 Ford F100", km: "141 200 km", active: false },
                ].map(({ name, km, active }) => (
                  <div
                    key={name}
                    className={`shrink-0 px-4 py-2.5 rounded-xl border text-left transition-colors ${
                      active
                        ? "border-amber-500/30 bg-amber-500/8"
                        : "border-white/[0.07] hover:border-white/[0.12]"
                    }`}
                  >
                    <p className={`text-[12px] font-semibold ${active ? "text-white" : "text-white/50"}`}>{name}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{km}</p>
                  </div>
                ))}
              </div>

              {/* Service history */}
              <div className="px-6 py-6 space-y-0 divide-y divide-white/[0.04]">
                {[
                  { date: "Mar 2024", title: "Oljeskift og filterbytte",          cost: "1 200 kr", cat: "Service",     dot: "bg-amber-400" },
                  { date: "Nov 2023", title: "Bremseservice foran",               cost: "3 800 kr", cat: "Bremser",     dot: "bg-orange-400" },
                  { date: "Jun 2023", title: "EU-kontroll bestått",               cost: "620 kr",   cat: "Kontroll",    dot: "bg-emerald-400" },
                  { date: "Jan 2023", title: "Nye dekk — Michelin Pilot Sport",   cost: "6 400 kr", cat: "Dekk",        dot: "bg-sky-400" },
                  { date: "Aug 2022", title: "Motorgjennomgang og justeringer",   cost: "12 500 kr", cat: "Motor",      dot: "bg-violet-400" },
                ].map(({ date, title, cost, cat, dot }) => (
                  <div key={title} className="flex items-center gap-4 py-3.5 group hover:bg-white/[0.015] -mx-2 px-2 rounded-lg transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <p className="text-[11px] text-white/25 w-20 shrink-0 tabular-nums">{date}</p>
                    <p className="text-[13.5px] text-white/75 flex-1 truncate group-hover:text-white transition-colors">{title}</p>
                    <span className="text-[11px] text-white/25 bg-white/[0.05] border border-white/[0.07] px-2 py-0.5 rounded-md shrink-0">{cat}</span>
                    <p className="text-[13px] text-white/55 tabular-nums shrink-0 text-right w-20">{cost}</p>
                  </div>
                ))}
              </div>

              {/* Bottom summary */}
              <div className="border-t border-white/[0.05] px-6 py-4 flex items-center justify-between">
                <p className="text-[12px] text-white/25">5 av 47 serviceposter · Volvo Amazon 1968</p>
                <p className="text-[12px] text-amber-500/70 font-medium">Totalt: 24 520 kr</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="funksjoner" className="py-28 md:py-36 border-b border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <FadeIn className="mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-4">
              {t("landing.features.badge")}
            </p>
            <h2
              className="font-bold text-white tracking-[-0.03em] leading-[1.05] max-w-md"
              style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
            >
              Et komplett bibliotek for kjøretøyet ditt.
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-white/[0.05]">
            {[
              {
                icon: Wrench,
                title: "Digital servicelogg",
                desc: "Logg hvert vedlikehold med dato, kostnad, hvem som utførte jobben og bilder.",
              },
              {
                icon: Camera,
                title: "Fotoarkiv",
                desc: "Bygg et visuelt arkiv av kjøretøyets historie, restaurering og utvikling.",
              },
              {
                icon: FileText,
                title: "Dokumentarkiv",
                desc: "EU-kontroll, forsikring, kvitteringer og kontrakter — alt søkbart og tilgjengelig.",
              },
              {
                icon: History,
                title: "Kjøretøytidslinje",
                desc: "Se hele livet til kjøretøyet visualisert som en kronologisk tidslinje.",
              },
              {
                icon: Users,
                title: "Veteranklubber",
                desc: "Finn bilklubber og MC-foreninger, eller opprett din egen med invitasjonssystem.",
              },
              {
                icon: TrendingUp,
                title: "Verdisporing",
                desc: "Dokumentert servicehistorikk øker verdien direkte ved videresalg.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <FadeIn
                key={title}
                delay={i * 50}
                className="border-b border-r border-white/[0.05] p-8 md:p-10"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-6">
                  <Icon className="w-4.5 h-4.5 text-amber-400" />
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-2.5">{title}</h3>
                <p className="text-[13.5px] text-white/38 leading-relaxed">{desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section id="priser" className="py-28 md:py-36 border-b border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start">
            <FadeIn>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-4">
                {t("landing.pricing.badge")}
              </p>
              <h2
                className="font-bold text-white tracking-[-0.03em] leading-[1.05] mb-6"
                style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
              >
                Én plan.<br />Alt inkludert.
              </h2>
              <p className="text-[15px] text-white/40 leading-relaxed max-w-xs">
                Ingen nivåer. Ingen friperiode. Du betaler 50 kr i måneden og får full tilgang til alt DriveGarage tilbyr.
              </p>
            </FadeIn>

            <FadeIn delay={60}>
              <div className="border border-white/[0.09] rounded-2xl overflow-hidden">
                <div className="px-8 py-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-5">
                    DriveGarage Premium
                  </p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[52px] font-bold text-white tracking-[-0.03em] leading-none">50</span>
                    <span className="text-white/30 text-base ml-1">kr / mnd</span>
                  </div>
                  <p className="text-[12.5px] text-white/25 mb-8">per bruker · ingen binding</p>

                  <ul className="space-y-3 mb-8">
                    {[
                      t("landing.pricing.plan.f1"),
                      t("landing.pricing.plan.f2"),
                      t("landing.pricing.plan.f3"),
                      t("landing.pricing.plan.f4"),
                      t("landing.pricing.plan.f5"),
                      t("landing.pricing.plan.f6"),
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[13.5px] text-white/55">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/sign-up">
                    <button className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[14px] transition-colors">
                      {t("landing.pricing.plan.cta")}
                    </button>
                  </Link>
                </div>

                <div className="border-t border-white/[0.06] px-8 py-5 flex items-center gap-3 bg-white/[0.015]">
                  <div className="w-7 h-7 rounded-lg bg-[#FF5B24] flex items-center justify-center shrink-0">
                    <span className="text-white text-[11px] font-black">V</span>
                  </div>
                  <div>
                    <p className="text-[12.5px] font-medium text-white/70">Betaling via Vipps Recurring</p>
                    <p className="text-[11px] text-white/30">Avslutt når du vil direkte i Vipps-appen.</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" className="py-28 md:py-36 border-b border-white/[0.05]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16 lg:gap-20">
            <FadeIn>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500 mb-4">FAQ</p>
              <h2
                className="font-bold text-white tracking-[-0.03em] leading-[1.05]"
                style={{ fontSize: "clamp(28px, 3.5vw, 44px)" }}
              >
                {t("landing.faq.title")}
              </h2>
            </FadeIn>
            <FadeIn delay={60}>
              <div>
                {FAQ_ITEMS.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══ CLOSING CTA ══ */}
      <section className="relative py-36 md:py-48 overflow-hidden">
        <img
          src="/hero-fjord.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "50% 30%", filter: "brightness(0.3) saturate(0.7)" }}
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.5) 60%, rgba(8,8,8,0.3) 100%)" }}
        />
        <FadeIn className="relative z-10 max-w-[1180px] mx-auto px-6 md:px-10">
          <h2
            className="font-bold text-white tracking-[-0.035em] leading-[0.95] mb-8"
            style={{ fontSize: "clamp(44px, 6vw, 80px)" }}
          >
            {t("landing.cta.title")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/sign-up">
              <button className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[14px] transition-colors">
                {t("landing.cta.button")}
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="h-12 px-7 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-[14px] transition-colors">
                {t("landing.navbar.logIn")}
              </button>
            </Link>
          </div>
          <p className="mt-7 text-[12px] text-white/20">50 kr/mnd · Vipps · Ingen binding</p>
        </FadeIn>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-white/[0.05] py-14 bg-[#050505]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center">
                  <Car className="w-3 h-3 text-black" />
                </div>
                <span className="text-[14px] font-bold text-white">DriveGarage</span>
              </div>
              <CompanyInfo className="text-[12px] text-white/25 leading-relaxed space-y-1" />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-5">
                {t("landing.footer.product")}
              </p>
              <ul className="space-y-3">
                {[
                  { label: t("landing.footer.features"), action: () => document.getElementById("funksjoner")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: t("landing.footer.pricing"), action: () => document.getElementById("priser")?.scrollIntoView({ behavior: "smooth" }) },
                  { label: "FAQ", action: () => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }) },
                ].map(({ label, action }) => (
                  <li key={label}>
                    <button onClick={action} className="text-[13px] text-white/35 hover:text-white transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-5">
                {t("landing.footer.company")}
              </p>
              <ul className="space-y-3">
                {[
                  { label: t("landing.footer.logIn"), href: "/sign-in" },
                  { label: t("landing.footer.privacy"), href: "/privacy" },
                  { label: t("landing.footer.terms"), href: "/terms" },
                  { label: t("landing.footer.contact"), href: "/contact" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-[13px] text-white/35 hover:text-white transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/25 mb-5">Konto</p>
              <Link href="/sign-up">
                <button className="h-9 px-5 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors">
                  {t("landing.navbar.createAccount")}
                </button>
              </Link>
              <div className="mt-5">
                <FlagSwitcher dark />
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/20">
              © {new Date().getFullYear()} DriveGarage. Alle rettigheter forbeholdt.
            </p>
            <div className="flex items-center gap-5 text-[12px] text-white/20">
              <Link href="/privacy" className="hover:text-white/40 transition-colors">{t("landing.footer.privacy")}</Link>
              <Link href="/terms"   className="hover:text-white/40 transition-colors">{t("landing.footer.terms")}</Link>
              <Link href="/cookies" className="hover:text-white/40 transition-colors">{t("landing.footer.cookies")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
