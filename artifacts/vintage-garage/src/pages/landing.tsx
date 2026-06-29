import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Car, Wrench, FileText, History, Users, MessageSquare,
  Calendar, ArrowRightLeft, Bot, Cloud, CheckCircle2,
  ChevronRight, Menu, X, Star, Shield, Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { FlagSwitcher } from "@/components/language-switcher";
import { CompanyInfo } from "@/components/company-info";

/* ── Animated counter ────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
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
      <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 tabular-nums">
        {count.toLocaleString("nb-NO")}{suffix}
      </div>
      <div className="text-sm text-[#8899bb] uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

const TESTIMONIALS = [
  { name: "Tor Gunnar H.", vehicle: "1968 Volvo Amazon",       text: "Endelig ett sted å samle alt om bilen. Servicehistorikken er gull verdt ved salg!", stars: 5 },
  { name: "Anita B.",      vehicle: "1972 Triumph Bonneville", text: "Kvitteringsarkivet har reddet meg flere ganger. Anbefaler DriveGarage til alle MC-entusiaster.", stars: 5 },
  { name: "Knut-Erik L.",  vehicle: "1955 Ford F100",          text: "Restaureringsloggen med bilder er fantastisk. Jeg kan vise frem hele historien til kunden.", stars: 5 },
];

const FEATURE_ICONS = [Wrench, FileText, History, Users, MessageSquare, Calendar, ArrowRightLeft, Bot, Cloud] as const;
const FEATURE_ACCENTS = [
  "from-indigo-500/20", "from-cyan-500/20", "from-blue-500/20",
  "from-violet-500/20", "from-indigo-500/20", "from-cyan-500/20",
  "from-blue-500/20",   "from-violet-500/20", "from-indigo-500/20",
] as const;

export default function LandingPage() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTo(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const FEATURES = [
    { icon: FEATURE_ICONS[0], title: t("landing.features.f1Title"), desc: t("landing.features.f1Desc"), accent: FEATURE_ACCENTS[0] },
    { icon: FEATURE_ICONS[1], title: t("landing.features.f2Title"), desc: t("landing.features.f2Desc"), accent: FEATURE_ACCENTS[1] },
    { icon: FEATURE_ICONS[2], title: t("landing.features.f3Title"), desc: t("landing.features.f3Desc"), accent: FEATURE_ACCENTS[2] },
    { icon: FEATURE_ICONS[3], title: t("landing.features.f4Title"), desc: t("landing.features.f4Desc"), accent: FEATURE_ACCENTS[3] },
    { icon: FEATURE_ICONS[4], title: t("landing.features.f5Title"), desc: t("landing.features.f5Desc"), accent: FEATURE_ACCENTS[4] },
    { icon: FEATURE_ICONS[5], title: t("landing.features.f6Title"), desc: t("landing.features.f6Desc"), accent: FEATURE_ACCENTS[5] },
    { icon: FEATURE_ICONS[6], title: t("landing.features.f7Title"), desc: t("landing.features.f7Desc"), accent: FEATURE_ACCENTS[6] },
    { icon: FEATURE_ICONS[7], title: t("landing.features.f8Title"), desc: t("landing.features.f8Desc"), accent: FEATURE_ACCENTS[7] },
    { icon: FEATURE_ICONS[8], title: t("landing.features.f9Title"), desc: t("landing.features.f9Desc"), accent: FEATURE_ACCENTS[8] },
  ];

  const STEPS = [
    { step: "01", title: t("landing.howItWorks.step1Title"), desc: t("landing.howItWorks.step1Desc") },
    { step: "02", title: t("landing.howItWorks.step2Title"), desc: t("landing.howItWorks.step2Desc") },
    { step: "03", title: t("landing.howItWorks.step3Title"), desc: t("landing.howItWorks.step3Desc") },
    { step: "04", title: t("landing.howItWorks.step4Title"), desc: t("landing.howItWorks.step4Desc") },
  ];

  return (
    <div className="min-h-screen bg-[#060b18] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">

      {/* Fixed background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[140px]" />
        <div className="absolute top-[30%] right-[-8%] w-[35%] h-[35%] rounded-full bg-cyan-500/12 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[5%] w-[55%] h-[45%] rounded-full bg-blue-700/8 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(99,102,241,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.8) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* ════ NAVBAR ════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-[#060b18]/80 backdrop-blur-xl" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">DriveGarage</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8899bb]">
            <button onClick={() => scrollTo("funksjoner")} className="hover:text-white transition-colors">{t("landing.navbar.features")}</button>
            <button onClick={() => scrollTo("slik-fungerer")} className="hover:text-white transition-colors">{t("landing.navbar.howItWorks")}</button>
            <button onClick={() => scrollTo("priser")} className="hover:text-white transition-colors">{t("landing.navbar.pricing")}</button>
            <Link href="/sign-in" className="hover:text-white transition-colors">{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up">
              <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-sm rounded-full px-6 h-9 text-sm">
                {t("landing.navbar.createAccount")}
              </Button>
            </Link>
            <FlagSwitcher dark />
          </div>

          <button className="md:hidden text-[#8899bb] hover:text-white p-2" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#060b18]/95 backdrop-blur-xl px-6 py-6 space-y-4">
            <button onClick={() => scrollTo("funksjoner")} className="block text-[#8899bb] hover:text-white w-full text-left py-1">{t("landing.navbar.features")}</button>
            <button onClick={() => scrollTo("slik-fungerer")} className="block text-[#8899bb] hover:text-white w-full text-left py-1">{t("landing.navbar.howItWorks")}</button>
            <button onClick={() => scrollTo("priser")} className="block text-[#8899bb] hover:text-white w-full text-left py-1">{t("landing.navbar.pricing")}</button>
            <Link href="/sign-in" className="block text-[#8899bb] hover:text-white py-1" onClick={() => setMenuOpen(false)}>{t("landing.navbar.logIn")}</Link>
            <Link href="/sign-up" onClick={() => setMenuOpen(false)}>
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-0 rounded-full mt-2">
                {t("landing.navbar.createAccountFree")}
              </Button>
            </Link>
            <FlagSwitcher dark className="pt-2" />
          </div>
        )}
      </nav>

      <main className="relative z-10">

        {/* ════ HERO ════ */}
        <section className="max-w-7xl mx-auto px-6 pt-48 pb-32 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            {t("landing.badge")}
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto leading-[1.05]">
            {t("landing.hero.title1")}<br />{t("landing.hero.titleConnector")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400">
              {t("landing.hero.title2")}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#8899bb] max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 border-0 shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.03]">
                {t("landing.hero.ctaPrimary")}
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => scrollTo("slik-fungerer")}
              className="h-14 px-8 text-lg rounded-full bg-white/5 border-white/15 text-white hover:bg-white/10 backdrop-blur-sm transition-all"
            >
              {t("landing.hero.ctaSecondary")} <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 opacity-55">
            {[
              { icon: Shield, text: t("landing.trust.secureData") },
              { icon: Zap,    text: t("landing.trust.setup") },
              { icon: Star,   text: t("landing.trust.rating") },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-[#8899bb]">
                <Icon className="w-4 h-4 text-cyan-500" />
                {text}
              </div>
            ))}
          </div>
        </section>

        {/* ════ STATS ════ */}
        <section className="border-y border-white/[0.07] bg-white/[0.015] backdrop-blur-sm py-16">
          <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value={12000} suffix="+" label={t("landing.stats.vehicles")}  delay={0} />
            <StatCard value={500}   suffix="+" label={t("landing.stats.clubs")}     delay={100} />
            <StatCard value={45000} suffix="+" label={t("landing.stats.documents")} delay={200} />
            <StatCard value={100}   suffix="%" label={t("landing.stats.passion")}   delay={300} />
          </div>
        </section>

        {/* ════ FEATURES ════ */}
        <section id="funksjoner" className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-20">
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
              {t("landing.features.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">{t("landing.features.title")}</h2>
            <p className="text-[#8899bb] max-w-2xl mx-auto text-lg">
              {t("landing.features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
              <Card key={title} className="bg-white/[0.025] border-white/[0.07] backdrop-blur-md hover:bg-white/[0.05] transition-all duration-300 group overflow-hidden relative rounded-2xl">
                <div className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <CardContent className="p-8 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:border-cyan-500/30 transition-all duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2.5 text-white">{title}</h3>
                  <p className="text-[#8899bb] leading-relaxed text-sm">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ════ HOW IT WORKS ════ */}
        <section id="slik-fungerer" className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/10 via-indigo-950/20 to-transparent border-y border-white/[0.05]" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
                {t("landing.howItWorks.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold">{t("landing.howItWorks.title")}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              {STEPS.map((item, i) => (
                <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-16 h-16 rounded-2xl bg-[#060b18] border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-400 mb-6 shadow-[0_0_25px_rgba(99,102,241,0.15)] relative z-10">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-[#8899bb] text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ TESTIMONIALS ════ */}
        <section className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
              {t("landing.testimonials.badge")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold">{t("landing.testimonials.title")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item) => (
              <Card key={item.name} className="bg-white/[0.025] border-white/[0.07] backdrop-blur-md rounded-2xl hover:bg-white/[0.04] transition-all duration-300">
                <CardContent className="p-8">
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: item.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[#c5d0e8] leading-relaxed mb-6 text-sm">"{item.text}"</p>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.name}</p>
                    <p className="text-xs text-[#8899bb] mt-0.5">{item.vehicle}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ════ PRICING ════ */}
        <section id="priser" className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/15 to-transparent" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
                {t("landing.pricing.badge")}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">{t("landing.pricing.title")}</h2>
              <p className="text-[#8899bb] max-w-xl mx-auto text-lg">{t("landing.pricing.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">

              {/* Free */}
              <Card className="bg-white/[0.025] border-white/[0.08] backdrop-blur-md rounded-2xl">
                <CardContent className="p-8">
                  <p className="text-xs font-semibold text-[#8899bb] uppercase tracking-wider mb-2">{t("landing.pricing.free.label")}</p>
                  <div className="text-4xl font-bold text-white mb-1">
                    {t("landing.pricing.free.price")}<span className="text-base text-[#8899bb] font-normal">{t("landing.pricing.free.period")}</span>
                  </div>
                  <p className="text-xs text-[#8899bb] mb-8">{t("landing.pricing.free.forever")}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    {[t("landing.pricing.free.f1"), t("landing.pricing.free.f2"), t("landing.pricing.free.f3")].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[#c5d0e8]">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up">
                    <Button variant="outline" className="w-full bg-white/[0.05] border-white/[0.10] text-white hover:bg-white/[0.10] rounded-xl">
                      {t("landing.pricing.free.cta")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Premium */}
              <Card className="bg-white/[0.04] border-indigo-500/40 backdrop-blur-xl relative rounded-2xl shadow-[0_0_60px_rgba(99,102,241,0.15)] scale-[1.03] z-10">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-xs font-semibold px-5 py-1.5 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                  {t("landing.pricing.popular")}
                </div>
                <CardContent className="p-8">
                  <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">{t("landing.pricing.premium.label")}</p>
                  <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-1">
                    {t("landing.pricing.premium.price")}<span className="text-base text-[#8899bb] font-normal">{t("landing.pricing.premium.period")}</span>
                  </div>
                  <p className="text-xs text-[#8899bb] mb-8">{t("landing.pricing.premium.yearly")}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    {[
                      t("landing.pricing.premium.f1"), t("landing.pricing.premium.f2"),
                      t("landing.pricing.premium.f3"), t("landing.pricing.premium.f4"),
                      t("landing.pricing.premium.f5"),
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-white">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up">
                    <Button className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-0 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] h-11">
                      {t("landing.pricing.premium.cta")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Standard */}
              <Card className="bg-white/[0.025] border-white/[0.08] backdrop-blur-md rounded-2xl">
                <CardContent className="p-8">
                  <p className="text-xs font-semibold text-[#8899bb] uppercase tracking-wider mb-2">{t("landing.pricing.standard.label")}</p>
                  <div className="text-4xl font-bold text-white mb-1">
                    {t("landing.pricing.standard.price")}<span className="text-base text-[#8899bb] font-normal">{t("landing.pricing.standard.period")}</span>
                  </div>
                  <p className="text-xs text-[#8899bb] mb-8">{t("landing.pricing.standard.yearly")}</p>
                  <ul className="space-y-3 mb-8 text-sm">
                    {[
                      t("landing.pricing.standard.f1"), t("landing.pricing.standard.f2"),
                      t("landing.pricing.standard.f3"), t("landing.pricing.standard.f4"),
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[#c5d0e8]">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up">
                    <Button variant="outline" className="w-full bg-white/[0.05] border-white/[0.10] text-white hover:bg-white/[0.10] rounded-xl">
                      {t("landing.pricing.standard.cta")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ════ FINAL CTA ════ */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-indigo-600/10 blur-[100px]" />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {t("landing.cta.title")}
            </h2>
            <p className="text-xl text-[#8899bb] mb-10 max-w-xl mx-auto">
              {t("landing.cta.subtitle")}
            </p>
            <Link href="/sign-up">
              <Button className="h-16 px-12 text-xl rounded-full bg-white text-[#060b18] hover:bg-gray-100 border-0 font-bold shadow-[0_0_50px_rgba(255,255,255,0.2)] transition-all hover:scale-105">
                {t("landing.cta.button")}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-white/[0.07] bg-[#060b18] relative z-10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">DriveGarage</span>
            </div>
            <p className="text-[#8899bb] text-sm leading-relaxed max-w-xs">
              {t("landing.footer.desc")}
            </p>
            <CompanyInfo className="text-[#8899bb] text-xs leading-relaxed mt-5" />
          </div>
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm">{t("landing.footer.product")}</h4>
            <ul className="space-y-3 text-sm text-[#8899bb]">
              <li><button onClick={() => scrollTo("funksjoner")} className="hover:text-white transition-colors">{t("landing.footer.features")}</button></li>
              <li><button onClick={() => scrollTo("priser")} className="hover:text-white transition-colors">{t("landing.footer.pricing")}</button></li>
              <li><Link href="/sign-in" className="hover:text-white transition-colors">{t("landing.footer.logIn")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm">{t("landing.footer.company")}</h4>
            <ul className="space-y-3 text-sm text-[#8899bb]">
              <li><span className="cursor-default">{t("landing.footer.about")}</span></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t("landing.footer.contact")}</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t("landing.footer.privacy")}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Vilkår for bruk</Link></li>
              <li><Link href="/cookies" className="hover:text-white transition-colors">Informasjonskapsler</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8899bb]">
          <span>© {new Date().getFullYear()} DriveGarage AS. {t("landing.footer.rights")}</span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-white transition-colors">Personvern</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Vilkår</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Informasjonskapsler</Link>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>{t("landing.footer.secure")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
