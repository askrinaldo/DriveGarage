import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { setLanguage, supportedLanguages, languageMeta, type SupportedLanguage } from "@/i18n";

interface FlagSwitcherProps {
  className?: string;
  dark?: boolean;
}

export function FlagSwitcher({ className, dark = false }: FlagSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {supportedLanguages.map((lang) => {
        const meta = languageMeta[lang];
        const isActive = currentLang === lang;
        return (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            title={meta.label}
            className={cn(
              "w-8 h-8 rounded-lg text-lg leading-none flex items-center justify-center transition-all duration-150",
              isActive
                ? dark
                  ? "bg-white/20 scale-110 shadow-md"
                  : "bg-sidebar-accent scale-110 ring-1 ring-border shadow-sm"
                : dark
                ? "opacity-35 hover:opacity-90 hover:bg-white/10"
                : "opacity-35 hover:opacity-80 hover:bg-sidebar-accent/60"
            )}
          >
            {meta.flag}
          </button>
        );
      })}
    </div>
  );
}

/* Legacy full-width popover switcher — kept for potential reuse */
export function LanguageSwitcher() {
  return null;
}
