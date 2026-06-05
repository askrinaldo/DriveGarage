import { useTheme, type AccentColor, type ColorMode, ACCENT_VALUES } from "@/contexts/theme";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT_OPTIONS: { id: AccentColor; label: string }[] = [
  { id: "kobber", label: "Kobber" },
  { id: "blå",    label: "Blå" },
  { id: "rød",    label: "Rød" },
  { id: "grønn",  label: "Grønn" },
  { id: "gul",    label: "Gul" },
  { id: "lilla",  label: "Lilla" },
  { id: "grå",    label: "Grå" },
];

const MODE_OPTIONS: { id: ColorMode; label: string; icon: React.ReactNode }[] = [
  { id: "light", label: "Lys",  icon: <Sun className="w-3.5 h-3.5" /> },
  { id: "auto",  label: "Auto", icon: <Monitor className="w-3.5 h-3.5" /> },
  { id: "dark",  label: "Mørk", icon: <Moon className="w-3.5 h-3.5" /> },
];

function accentSwatch(accent: AccentColor) {
  const { h, s, l } = ACCENT_VALUES[accent];
  return `hsl(${h} ${s}% ${l}%)`;
}

export function ThemeControls() {
  const { accent, mode, setAccent, setMode } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
          Aksentfarge
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
          Lysmodus
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

export function ThemePanel({ buttonClassName, popoverSide = "right", iconOnly = false }: ThemePanelProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-sm font-medium w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            buttonClassName
          )}
          title="Tilpass tema"
        >
          <Palette className="w-4 h-4 shrink-0" />
          {!iconOnly && <span>Tema</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent side={popoverSide} align="end" className="w-56 p-4">
        <ThemeControls />
      </PopoverContent>
    </Popover>
  );
}
