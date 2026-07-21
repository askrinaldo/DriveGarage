import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lightbulb, Bug, HelpCircle, ExternalLink, ArrowRight, Send, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

const SUPPORT_EMAIL = "drivegarage@evolvit.no";

const actions = [
  {
    key: "support",
    icon: HelpCircle,
    title: "Support",
    description: "Spørsmål om appen, din konto, abonnement eller generell brukerstøtte.",
    subject: "DriveGarage Support",
    cta: "Skriv en melding",
    gradient: "from-indigo-500/10 to-cyan-500/10",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/10",
    accentColor: "text-indigo-400",
    placeholder: "Beskriv hva du trenger hjelp med...",
  },
  {
    key: "feature",
    icon: Lightbulb,
    title: "Funksjonsforespørsel",
    description: "Har du en idé til en ny funksjon eller forbedring? Vi vil gjerne høre det.",
    subject: "DriveGarage Feature Request",
    cta: "Send et forslag",
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    accentColor: "text-amber-400",
    placeholder: "Beskriv funksjonen eller forbedringen du ønsker...",
  },
  {
    key: "bug",
    icon: Bug,
    title: "Rapporter en feil",
    description: "Noe fungerer ikke som det skal? Fortell oss hva som skjedde.",
    subject: "DriveGarage Bug Report",
    cta: "Rapporter en feil",
    gradient: "from-red-500/10 to-rose-500/10",
    border: "border-red-500/20",
    iconColor: "text-red-400",
    iconBg: "bg-red-500/10",
    accentColor: "text-red-400",
    placeholder: "Beskriv feilen og hva du gjorde da den oppsto...",
  },
];

type FormState = {
  subject: string;
  message: string;
};

const emptyForm = (): FormState => ({ subject: "", message: "" });

export default function Help() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, FormState>>({
    support: emptyForm(),
    feature: emptyForm(),
    bug: emptyForm(),
  });

  const isDirty = Object.values(forms).some(
    (f) => f.subject.trim() !== "" || f.message.trim() !== ""
  );

  useNavigationGuard(isDirty);

  function updateForm(key: string, field: keyof FormState, value: string) {
    setForms((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function handleOpen(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  function handleSend(action: (typeof actions)[number]) {
    const form = forms[action.key];
    const subject = form.subject.trim() || action.subject;
    const body = form.message.trim();
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
    window.open(mailtoUrl, "_blank");
    setForms((prev) => ({ ...prev, [action.key]: emptyForm() }));
    setOpenKey(null);
  }

  function handleDiscard(key: string) {
    setForms((prev) => ({ ...prev, [key]: emptyForm() }));
    setOpenKey(null);
  }

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
        {actions.map(({ icon: Icon, key, title, description, subject, cta, gradient, border, iconColor, iconBg, accentColor, placeholder }, i) => {
          const isOpen = openKey === key;
          const form = forms[key];
          const hasText = form.subject.trim() !== "" || form.message.trim() !== "";

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.07, duration: 0.35 }}
              className={`rounded-2xl border ${border} bg-gradient-to-br ${gradient} bg-card overflow-hidden transition-all duration-200`}
            >
              {/* Card header — always visible */}
              <button
                type="button"
                onClick={() => handleOpen(key)}
                className="w-full flex items-start gap-4 p-5 text-left hover:opacity-80 transition-opacity"
              >
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-black text-foreground uppercase tracking-wide mb-1">{title}</p>
                  <p className="text-[12px] text-muted-foreground/60 leading-relaxed mb-3">{description}</p>
                  <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${isOpen ? accentColor : "text-muted-foreground/50"} transition-colors`}>
                    <Mail className="w-3 h-3" />
                    {cta}
                    {hasText && !isOpen
                      ? <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Ulagret tekst" />
                      : <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    }
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0 mt-1" />
              </button>

              {/* Expandable form */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="form"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">
                          Emne
                        </label>
                        <Input
                          placeholder={subject}
                          value={form.subject}
                          onChange={(e) => updateForm(key, "subject", e.target.value)}
                          className="bg-background/40 border-white/10 text-[13px] h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1.5 block">
                          Melding
                        </label>
                        <Textarea
                          placeholder={placeholder}
                          value={form.message}
                          onChange={(e) => updateForm(key, "message", e.target.value)}
                          rows={5}
                          className="bg-background/40 border-white/10 text-[13px] resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleSend({ icon: Icon, key, title, description, subject, cta, gradient, border, iconColor, iconBg, accentColor, placeholder })}
                          disabled={!form.message.trim()}
                          className="gap-1.5 text-[11px] font-bold uppercase tracking-wide h-8"
                        >
                          <Send className="w-3 h-3" />
                          Åpne i e-post
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                        {hasText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiscard(key)}
                            className="gap-1.5 text-[11px] text-muted-foreground/50 hover:text-destructive h-8"
                          >
                            <X className="w-3 h-3" />
                            Forkast
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
                        Klikk «Åpne i e-post» for å sende meldingen via din e-postklient.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
