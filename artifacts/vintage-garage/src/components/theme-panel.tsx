import { useTheme, type AccentColor, type ColorMode, ACCENT_VALUES } from "@/contexts/theme";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Palette, Moon, Sun } from "lucide-react";
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === "dark" ? (
              <Moon className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            )}
            <Label className="text-sm cursor-pointer" htmlFor="mode-toggle">
              {mode === "dark" ? "Mørk" : "Lys"}
            </Label>
          </div>
          <Switch
            id="mode-toggle"
            checked={mode === "light"}
            onCheckedChange={(v) => setMode(v ? "light" : "dark")}
          />
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
