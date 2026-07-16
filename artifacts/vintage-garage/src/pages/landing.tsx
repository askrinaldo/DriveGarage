import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Car, Wrench, FileText, Users, Shield, Zap, Lock,
  Menu, X, ChevronDown, ArrowRight, CheckCircle2, Star,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";
import { CompanyInfo } from "@/components/company-info";

/* ─── Scroll fade ───────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Counter ───────────────────────────────────────────────────── */
function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let t0: number | null = null;
    const dur = 1600;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target]);
  return <span ref={ref}>{val.toLocaleString("nb-NO")}{suffix}</span>;
}

/* ─── FAQ ───────────────────────────────────────────────────────── */
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.07] last:border-0">
      <button onClick={() => setOpen(v => !v)} className="w-full py-5 flex items-center justify-between gap-4 text-left group">
        <span className="text-[15px] font-medium text-white/80 group-hover:text-white transition-colors">{q}</span>
        <ChevronDown className="w-4 h-4 text-white/30 shrink-0 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "" }} />
      </button>
      <div style={{ maxHeight: open ? "220px" : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p className="text-[14px] text-white/50 leading-relaxed pb-5">{a}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
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

  return (
    <div className="bg-[#080808] text-white font-sans overflow-x-hidden selection:bg-amber-500/25">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-black/90 backdrop-blur-2xl border-b border-white/[0.06]" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-[70px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
              <Car className="w-4 h-4 text-black" />
            </div>
            <span className="text-[17px] font-black tracking-tight">DriveGarage</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[13.5px] text-white/50">
            <button onClick={() => go("funksjoner")} className="hover:text-white transition-colors">{t("landing.navbar.features")}</button>
            <button onClick={() => go("priser")} className="hover:text-white transition-colors">{t("landing.navbar.pricing")}</button>
            <button onClick={() => go("faq")} className="hover:text-white transition-colors">FAQ</button>
            <Link href="/sign-in" className="hover:text-white transition-colors">{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up">
              <button className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-black tracking-wide transition-all hover:scale-[1.03]">
                {t("landing.navbar.createAccount")}
              </button>
            </Link>
            <FlagSwitcher dark />
          </div>

          <button className="md:hidden text-white/50 hover:text-white" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-black/98 border-t border-white/[0.07] px-6 py-6 space-y-4">
            <button onClick={() => go("funksjoner")} className="block text-white/50 hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.features")}</button>
            <button onClick={() => go("priser")} className="block text-white/50 hover:text-white w-full text-left py-2 text-sm">{t("landing.navbar.pricing")}</button>
            <button onClick={() => go("faq")} className="block text-white/50 hover:text-white w-full text-left py-2 text-sm">FAQ</button>
            <Link href="/sign-in" className="block text-white/50 hover:text-white py-2 text-sm" onClick={() => setMenuOpen(false)}>{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
              <button className="w-full mt-2 py-3 rounded-xl bg-amber-500 text-black font-black text-sm">
                {t("landing.navbar.createAccount")}
              </button>
            </Link>
            <FlagSwitcher dark className="pt-2" />
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative h-screen min-h-[600px] flex flex-col justify-end overflow-hidden">
        {/* Photo */}
        <div className="absolute inset-0">
          <img
            src="/hero.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            draggable={false}
          />
          {/* Gradient: dark at bottom (text legibility), slight at top (navbar), subtle on left */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-16 md:pb-24 w-full">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/50">
              {t("landing.badge")}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[52px] sm:text-[68px] md:text-[84px] lg:text-[96px] font-black leading-[0.92] tracking-[-0.03em] mb-7 max-w-4xl">
            {t("landing.hero.title1")}<br />
            <span className="text-amber-400">{t("landing.hero.title2")}</span>
          </h1>

          {/* One-liner */}
          <p className="text-[17px] md:text-[19px] text-white/55 max-w-md leading-relaxed mb-10">
            {t("landing.hero.subtitle")}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/sign-up">
              <button className="flex items-center gap-2 h-[52px] px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-[15px] font-black tracking-wide shadow-[0_0_40px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(245,158,11,0.45)]">
                {t("landing.hero.ctaPrimary")}
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </Link>
            <button
              onClick={() => go("slik-fungerer")}
              className="flex items-center gap-2 h-[52px] px-7 rounded-2xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-[15px] font-medium transition-all backdrop-blur-sm"
            >
              {t("landing.hero.ctaSecondary")}
            </button>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap items-center gap-5 mt-8 text-[12.5px] text-white/35">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-500/60" />GDPR · Data i Norge</span>
            <span className="w-px h-3 bg-white/15" />
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500/60" />50 kr/mnd via Vipps</span>
            <span className="w-px h-3 bg-white/15" />
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-amber-500/60" />Ingen binding</span>
          </div>
        </div>

        {/* Stats strip at bottom of hero */}
        <div className="relative z-10 border-t border-white/[0.07] bg-black/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 grid grid-cols-3 gap-6 max-w-2xl">
            {[
              { target: 12000, suffix: "+", label: "Kjøretøy" },
              { target: 500,   suffix: "+", label: "Aktive klubber" },
              { target: 45000, suffix: "+", label: "Dokumenter" },
            ].map(({ target, suffix, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-white tabular-nums tracking-tight">
                  <Counter target={target} suffix={suffix} />
                </p>
                <p className="text-[11px] text-white/35 uppercase tracking-[0.12em] font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funksjoner" className="border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <FadeIn className="mb-16 max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-500 mb-4">Funksjoner</p>
            <h2 className="text-[36px] md:text-[50px] font-black leading-[1.0] tracking-[-0.025em] text-white">
              Alt du trenger<br /><span className="text-white/40">om kjøretøyet ditt.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
            {[
              {
                icon: Wrench,
                title: "Digital servicelogg",
                desc: "Logg hvert vedlikehold med dato, kostnad og bilder. Komplett historikk for alltid.",
              },
              {
                icon: FileText,
                title: "Dokumentarkiv",
                desc: "EU-kontroll, forsikring, kvitteringer og bilder — sortert, søkbart og tilgjengelig.",
              },
              {
                icon: Users,
                title: "Veteranklubber",
                desc: "Finn din stamme. Bli med i bilklubber og MC-foreninger, eller opprett din egen.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 80}>
                <div className="bg-[#0d0d0d] p-8 md:p-10 h-full group hover:bg-[#111] transition-colors duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-7 group-hover:bg-amber-500/15 transition-colors">
                    <Icon className="w-5.5 h-5.5 text-amber-400" />
                  </div>
                  <h3 className="text-[19px] font-bold text-white mb-3">{title}</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="slik-fungerer" className="border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <FadeIn className="mb-16">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-500 mb-4">Slik fungerer det</p>
            <h2 className="text-[36px] md:text-[50px] font-black leading-[1.0] tracking-[-0.025em]">
              I gang på<br /><span className="text-white/40">to minutter.</span>
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { n: "1", title: "Opprett kontoen din", desc: "Registrer deg med e-post eller Google. Tar under ett minutt." },
              { n: "2", title: "Legg til kjøretøyet", desc: "Bil, MC eller veteran — legg til så mange du vil." },
              { n: "3", title: "Bygg historien din", desc: "Logg service, last opp kvitteringer og bilder. Et bibliotek som vokser." },
            ].map(({ n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 90} className="flex gap-6">
                <div className="text-[48px] font-black text-white/[0.07] leading-none shrink-0 select-none tabular-nums">{n}</div>
                <div className="pt-1">
                  <h3 className="text-[17px] font-bold text-white mb-2">{title}</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="priser" className="border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-500 mb-4">{t("landing.pricing.badge")}</p>
              <h2 className="text-[36px] md:text-[50px] font-black leading-[1.0] tracking-[-0.025em] mb-6">
                Én pris.<br /><span className="text-white/40">Alt inkludert.</span>
              </h2>
              <p className="text-white/45 text-[15px] leading-relaxed max-w-sm">
                Ingen skjulte kostnader, ingen nivåer, ingen friperiode. Du betaler 50 kr i måneden og får full tilgang til alt.
              </p>
            </FadeIn>

            <FadeIn delay={80}>
              <div className="rounded-3xl border border-white/[0.10] bg-[#0d0d0d] overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-500 mb-2">DriveGarage Premium</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[54px] font-black leading-none tracking-tight text-white">50</span>
                        <span className="text-white/40 text-lg">kr/mnd</span>
                      </div>
                      <p className="text-white/30 text-[12px] mt-1">per bruker · ingen binding</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Car className="w-7 h-7 text-amber-400" />
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-8">
                    {[
                      t("landing.pricing.plan.f1"),
                      t("landing.pricing.plan.f2"),
                      t("landing.pricing.plan.f3"),
                      t("landing.pricing.plan.f4"),
                      t("landing.pricing.plan.f5"),
                      t("landing.pricing.plan.f6"),
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-white/65">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/sign-up">
                    <button className="w-full h-13 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[15px] transition-all hover:scale-[1.01] shadow-[0_0_30px_rgba(245,158,11,0.25)]" style={{ height: "52px" }}>
                      {t("landing.pricing.plan.cta")}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>

                <div className="border-t border-white/[0.06] px-8 py-5 flex items-center gap-3 bg-black/30">
                  <div className="w-8 h-8 rounded-xl bg-[#FF5B24] flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-[10px]">V</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">Betaling via Vipps Recurring</p>
                    <p className="text-[11.5px] text-white/40">Avslutt når du vil, direkte i Vipps-appen.</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-b border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <FadeIn className="mb-12">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-500 mb-4">FAQ</p>
            <h2 className="text-[36px] md:text-[44px] font-black leading-[1.05] tracking-[-0.025em]">
              {t("landing.faq.title")}
            </h2>
          </FadeIn>
          <FadeIn delay={60}>
            <div>
              {FAQ_ITEMS.map(({ q, a }) => <FAQ key={q} q={q} a={a} />)}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/hero.jpg" alt="" className="w-full h-full object-cover object-center scale-105" draggable={false} />
          <div className="absolute inset-0 bg-black/85" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-32 md:py-44">
          <FadeIn className="max-w-3xl">
            <h2 className="text-[44px] sm:text-[60px] md:text-[72px] font-black leading-[0.95] tracking-[-0.03em] mb-8">
              Kjøretøyet ditt<br />
              <span className="text-amber-400">fortjener sin historie.</span>
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up">
                <button className="flex items-center gap-2 h-[52px] px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-[15px] font-black tracking-wide transition-all hover:scale-[1.02]">
                  {t("landing.cta.button")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/sign-in">
                <button className="h-[52px] px-7 rounded-2xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-[15px] font-medium transition-all">
                  {t("landing.navbar.logIn")}
                </button>
              </Link>
            </div>
            <p className="mt-6 text-[12px] text-white/30">50 kr/mnd · Betaling via Vipps · Ingen binding</p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#050505] border-t border-white/[0.05] py-14">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Car className="w-4 h-4 text-black" />
                </div>
                <span className="font-black text-white">DriveGarage</span>
              </div>
              <CompanyInfo className="text-[12px] text-white/30 leading-relaxed space-y-0.5" />
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/30 mb-4">{t("landing.footer.product")}</p>
              <ul className="space-y-3 text-[13.5px] text-white/45">
                <li><button onClick={() => go("funksjoner")} className="hover:text-white transition-colors">{t("landing.footer.features")}</button></li>
                <li><button onClick={() => go("priser")}     className="hover:text-white transition-colors">{t("landing.footer.pricing")}</button></li>
                <li><button onClick={() => go("faq")}        className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/30 mb-4">{t("landing.footer.company")}</p>
              <ul className="space-y-3 text-[13.5px] text-white/45">
                <li><Link href="/sign-in"  className="hover:text-white transition-colors">{t("landing.footer.logIn")}</Link></li>
                <li><Link href="/privacy"  className="hover:text-white transition-colors">{t("landing.footer.privacy")}</Link></li>
                <li><Link href="/terms"    className="hover:text-white transition-colors">{t("landing.footer.terms")}</Link></li>
                <li><Link href="/contact"  className="hover:text-white transition-colors">{t("landing.footer.contact")}</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/30 mb-4">Konto</p>
              <Link href="/sign-up">
                <button className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-black transition-all">
                  {t("landing.navbar.createAccount")}
                </button>
              </Link>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-white/25">© {new Date().getFullYear()} DriveGarage. Alle rettigheter forbeholdt.</p>
            <div className="flex items-center gap-5 text-[12px] text-white/25">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">{t("landing.footer.privacy")}</Link>
              <Link href="/terms"   className="hover:text-white/60 transition-colors">{t("landing.footer.terms")}</Link>
              <Link href="/cookies" className="hover:text-white/60 transition-colors">{t("landing.footer.cookies")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
