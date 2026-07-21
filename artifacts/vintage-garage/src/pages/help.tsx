import { motion } from "framer-motion";
import { Mail, Lightbulb, Bug, HelpCircle, ExternalLink, ArrowRight } from "lucide-react";

const SUPPORT_EMAIL = "drivegarage@evolvit.no";

const actions = [
  {
    icon: HelpCircle,
    title: "Support",
    description: "Spørsmål om appen, din konto, abonnement eller generell brukerstøtte.",
    subject: "DriveGarage Support",
    cta: "Send supportforespørsel",
    gradient: "from-indigo-500/10 to-cyan-500/10",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/10",
  },
  {
    icon: Lightbulb,
    title: "Funksjonsforespørsel",
    description: "Har du en idé til en ny funksjon eller forbedring? Vi vil gjerne høre det.",
    subject: "DriveGarage Feature Request",
    cta: "Send funksjonsforespørsel",
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  {
    icon: Bug,
    title: "Rapporter en feil",
    description: "Noe fungerer ikke som det skal? Fortell oss hva som skjedde.",
    subject: "DriveGarage Bug Report",
    cta: "Send feilrapport",
    gradient: "from-red-500/10 to-rose-500/10",
    border: "border-red-500/20",
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10",
  },
];

export default function Help() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <HelpCircle className="w-4 h-4 text-primary/70" />
          <span className="text-[11px] font-bold text-primary/70 uppercase tracking-widest">Hjelp & kontakt</span>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Hjelp</h1>
        <p className="text-muted-foreground/60 text-[13px] mt-1.5 leading-relaxed">
          Vi svarer på alle henvendelser innen 2 virkedager.
        </p>
      </motion.div>

      {/* Action cards */}
      <div className="space-y-3">
        {actions.map(({ icon: Icon, title, description, subject, cta, gradient, border, iconColor, iconBg }, i) => (
          <motion.a
            key={title}
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.07, duration: 0.35 }}
            className={`group flex items-start gap-4 rounded-2xl border ${border} bg-gradient-to-br ${gradient} bg-card p-5 hover:border-opacity-60 transition-all duration-200 hover:shadow-lg hover:shadow-black/10 cursor-pointer block`}
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-black text-foreground uppercase tracking-wide mb-1">{title}</p>
              <p className="text-[12px] text-muted-foreground/60 leading-relaxed mb-3">{description}</p>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/50 group-hover:text-primary/70 transition-colors uppercase tracking-wide">
                <Mail className="w-3 h-3" />
                {cta}
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors shrink-0 mt-1" />
          </motion.a>
        ))}
      </div>

      {/* Email address */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="rounded-xl border border-border/40 bg-card px-5 py-4 flex items-center gap-3"
      >
        <Mail className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-0.5">E-postadresse</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-[13px] font-mono text-foreground/70 hover:text-primary transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground/35 shrink-0">Svar innen 2 virkedager</p>
      </motion.div>

    </div>
  );
}
