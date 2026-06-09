import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLanguage, supportedLanguages, languageMeta, type SupportedLanguage } from "@/i18n";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LanguageSwitcherProps {
  iconOnly?: boolean;
  buttonClassName?: string;
  popoverSide?: "right" | "top" | "bottom" | "left";
}

export function LanguageSwitcher({
  iconOnly = false,
  buttonClassName,
  popoverSide = "right",
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language as SupportedLanguage;
  const current = languageMeta[currentLang] ?? languageMeta.no;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            buttonClassName
          )}
          title={t("lang.select")}
        >
          <span className="relative shrink-0">
            <Globe className="w-4 h-4" />
            <span className="absolute -bottom-0.5 -right-1 text-[9px] leading-none">{current.flag}</span>
          </span>
          {!iconOnly && <span className="flex-1">{current.label}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent side={popoverSide} align="end" className="w-52 p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
          {t("lang.select")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {supportedLanguages.map((lang) => {
            const meta = languageMeta[lang];
            const isActive = currentLang === lang;
            return (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left",
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <span className="text-base shrink-0">{meta.flag}</span>
                <span className="truncate">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
