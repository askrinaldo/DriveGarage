import { useTheme, type AccentColor, type ColorMode, ACCENT_VALUES } from "@/contexts/theme";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

function useSystemIsDark() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDark;
}

const ACCENT_OPTIONS: { id: AccentColor; label: string }[] = [
  { id: "kobber", label: "Kobber" },
  { id: "blå",    label: "Blå" },
  { id: "rød",    label: "Rød" },
  { id: "grønn",  label: "Grønn" },
  { id: "gul",    label: "Gul" },
  { id: "lilla",  label: "Lilla" },
  { id: "grå",    label: "Grå" },
];

function accentSwatch(accent: AccentColor) {
  const { h, s, l } = ACCENT_VALUES[accent];
  return `hsl(${h} ${s}% ${l}%)`;
}

export function ThemeControls() {
  const { accent, mode, setAccent, setMode } = useTheme();
  const { t } = useTranslation();
  const systemIsDark = useSystemIsDark();

  const MODE_OPTIONS: { id: ColorMode; label: string; icon: React.ReactNode }[] = [
    { id: "light", label: t("theme.light"), icon: <Sun className="w-3.5 h-3.5" /> },
    { id: "auto",  label: t("theme.auto"),  icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: "dark",  label: t("theme.dark"),  icon: <Moon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
          {t("theme.accentColor")}
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              title={opt.label}
              onClick={() => setAccent(opt.id)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                accent === opt.id
                  ? "border-foreground scale-110 shadow-md"
                  : "border-transparent"
              )}
              style={{ backgroundColor: accentSwatch(opt.id) }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 capitalize">{accent}</p>
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
          {t("theme.lightMode")}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-2 px-1 rounded-md border text-xs font-medium transition-colors",
                mode === opt.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              {opt.icon}
              {opt.label}
              {opt.id === "auto" && (
                <span className="text-[10px] font-normal leading-none text-muted-foreground">
                  {t("theme.now")}: {systemIsDark ? t("theme.dark") : t("theme.light")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ThemePanelProps {
  buttonClassName?: string;
  popoverSide?: "right" | "top" | "bottom" | "left";
  iconOnly?: boolean;
}

const MODE_ICON_MAP: Record<ColorMode, React.ReactNode> = {
  light: <Sun className="w-3 h-3" />,
  auto:  <Monitor className="w-3 h-3" />,
  dark:  <Moon className="w-3 h-3" />,
};

export function ThemePanel({ buttonClassName, popoverSide = "right", iconOnly = false }: ThemePanelProps) {
  const { accent, mode } = useTheme();
  const { t } = useTranslation();
  const swatchColor = accentSwatch(accent);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            buttonClassName
          )}
          title={t("theme.title")}
        >
          <span className="relative shrink-0">
            <Palette className="w-4 h-4" />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar ring-0"
              style={{ backgroundColor: swatchColor }}
            />
          </span>
          {!iconOnly && <span className="flex-1">{t("nav.theme")}</span>}
          <span className="flex items-center shrink-0 text-sidebar-foreground/50">
            {MODE_ICON_MAP[mode]}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side={popoverSide} align="end" className="w-56 p-4">
        <ThemeControls />
      </PopoverContent>
    </Popover>
  );
}
