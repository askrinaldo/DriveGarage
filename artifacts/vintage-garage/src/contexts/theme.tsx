import { createContext, useContext, useEffect, useState } from "react";
import { getUserToken } from "@/hooks/use-user-auth";

export type AccentColor =
  | "kobber"
  | "blå"
  | "rød"
  | "grønn"
  | "gul"
  | "lilla"
  | "grå";

export type ColorMode = "dark" | "light";

interface ThemeState {
  accent: AccentColor;
  mode: ColorMode;
}

interface ThemeContextValue extends ThemeState {
  setAccent: (accent: AccentColor) => void;
  setMode: (mode: ColorMode) => void;
  applyServerTheme: (accent: string | null, mode: string | null) => void;
}

const ACCENT_VALUES: Record<AccentColor, { h: number; s: number; l: number }> = {
  kobber: { h: 25, s: 60, l: 50 },
  blå:    { h: 214, s: 70, l: 52 },
  rød:    { h: 0, s: 65, l: 52 },
  grønn:  { h: 142, s: 58, l: 40 },
  gul:    { h: 42, s: 75, l: 48 },
  lilla:  { h: 268, s: 58, l: 56 },
  grå:    { h: 220, s: 10, l: 52 },
};

const VALID_ACCENTS = new Set<string>(["kobber", "blå", "rød", "grønn", "gul", "lilla", "grå"]);
const VALID_MODES = new Set<string>(["dark", "light"]);

const STORAGE_KEY = "vg-theme";
const DEFAULT_STATE: ThemeState = { accent: "kobber", mode: "dark" };

function loadTheme(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return JSON.parse(raw) as ThemeState;
  } catch {
    return DEFAULT_STATE;
  }
}

function applyTheme(state: ThemeState) {
  const root = document.documentElement;
  const { h, s, l } = ACCENT_VALUES[state.accent];

  const primaryHsl = `${h} ${s}% ${l}%`;
  const primaryDimHsl = `${h} ${s}% ${l - 8}%`;

  root.style.setProperty("--primary", primaryHsl);
  root.style.setProperty("--accent", primaryHsl);
  root.style.setProperty("--ring", primaryHsl);
  root.style.setProperty("--sidebar-primary", primaryHsl);
  root.style.setProperty("--sidebar-ring", primaryHsl);
  root.style.setProperty("--chart-1", primaryHsl);

  if (state.mode === "light") {
    root.classList.add("light-mode");
    root.style.setProperty("--background", "220 20% 96%");
    root.style.setProperty("--foreground", "220 15% 12%");
    root.style.setProperty("--card", "0 0% 100%");
    root.style.setProperty("--card-foreground", "220 15% 12%");
    root.style.setProperty("--card-border", "220 15% 84%");
    root.style.setProperty("--popover", "0 0% 100%");
    root.style.setProperty("--popover-foreground", "220 15% 12%");
    root.style.setProperty("--popover-border", "220 15% 84%");
    root.style.setProperty("--secondary", "220 15% 88%");
    root.style.setProperty("--secondary-foreground", "220 15% 20%");
    root.style.setProperty("--muted", "220 15% 92%");
    root.style.setProperty("--muted-foreground", "220 12% 42%");
    root.style.setProperty("--border", "220 15% 84%");
    root.style.setProperty("--input", "220 15% 90%");
    root.style.setProperty("--sidebar", "220 20% 94%");
    root.style.setProperty("--sidebar-foreground", "220 15% 20%");
    root.style.setProperty("--sidebar-border", "220 15% 80%");
    root.style.setProperty("--sidebar-accent", "220 15% 88%");
    root.style.setProperty("--sidebar-accent-foreground", "220 15% 10%");
    root.style.setProperty("--button-outline", "rgba(0,0,0,0.12)");
  } else {
    root.classList.remove("light-mode");
    root.style.setProperty("--background", "220 15% 10%");
    root.style.setProperty("--foreground", "220 10% 90%");
    root.style.setProperty("--card", "220 15% 13%");
    root.style.setProperty("--card-foreground", "220 10% 90%");
    root.style.setProperty("--card-border", "220 15% 20%");
    root.style.setProperty("--popover", "220 15% 11%");
    root.style.setProperty("--popover-foreground", "220 10% 90%");
    root.style.setProperty("--popover-border", "220 15% 20%");
    root.style.setProperty("--secondary", "220 15% 20%");
    root.style.setProperty("--secondary-foreground", "220 10% 90%");
    root.style.setProperty("--muted", "220 15% 18%");
    root.style.setProperty("--muted-foreground", "220 10% 60%");
    root.style.setProperty("--border", "220 15% 20%");
    root.style.setProperty("--input", "220 15% 18%");
    root.style.setProperty("--sidebar", "220 20% 8%");
    root.style.setProperty("--sidebar-foreground", "220 10% 85%");
    root.style.setProperty("--sidebar-border", "220 15% 16%");
    root.style.setProperty("--sidebar-accent", "220 15% 15%");
    root.style.setProperty("--sidebar-accent-foreground", "220 10% 95%");
    root.style.setProperty("--button-outline", "rgba(255,255,255,0.10)");
  }
}

async function saveThemeToServer(accent: AccentColor, mode: ColorMode): Promise<void> {
  const token = getUserToken();
  if (!token) return;
  try {
    await fetch("/api/users/me/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-user-token": token },
      body: JSON.stringify({ themeAccent: accent, themeMode: mode }),
    });
  } catch {
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(() => {
    const t = loadTheme();
    return t;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  function setAccent(accent: AccentColor) {
    const next = { ...theme, accent };
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    void saveThemeToServer(accent, theme.mode);
  }

  function setMode(mode: ColorMode) {
    const next = { ...theme, mode };
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    void saveThemeToServer(theme.accent, mode);
  }

  function applyServerTheme(accent: string | null, mode: string | null) {
    const resolvedAccent = (accent && VALID_ACCENTS.has(accent) ? accent : null) as AccentColor | null;
    const resolvedMode = (mode && VALID_MODES.has(mode) ? mode : null) as ColorMode | null;
    if (!resolvedAccent && !resolvedMode) return;
    const next: ThemeState = {
      accent: resolvedAccent ?? theme.accent,
      mode: resolvedMode ?? theme.mode,
    };
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <ThemeContext.Provider value={{ ...theme, setAccent, setMode, applyServerTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { ACCENT_VALUES };
