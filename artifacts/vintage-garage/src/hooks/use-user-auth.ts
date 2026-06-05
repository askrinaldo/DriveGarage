import { useState, useCallback, useEffect } from "react";

export type UserRole = "user" | "super_admin";

export interface UserSession {
  token: string;
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface ThemePrefs {
  themeAccent: string | null;
  themeMode: string | null;
}

const STORAGE_KEY = "user_session";

function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    const parts = parsed.token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: UserSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getUserToken(): string | null {
  return loadSession()?.token ?? null;
}

export function useUserAuth() {
  const [session, setSession] = useState<UserSession | null>(loadSession);

  const register = useCallback(async (name: string, email: string, password: string): Promise<
    { ok: false; error: string } | { ok: true; themePrefs: ThemePrefs }
  > => {
    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json() as { token?: string; user?: { id: number; name: string; email: string; role: UserRole; themeAccent?: string | null; themeMode?: string | null }; error?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "Registrering feilet" };
    const newSession: UserSession = { token: data.token!, id: data.user!.id, name: data.user!.name, email: data.user!.email, role: data.user!.role };
    saveSession(newSession);
    setSession(newSession);
    return { ok: true as const, themePrefs: { themeAccent: data.user?.themeAccent ?? null, themeMode: data.user?.themeMode ?? null } };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<
    { ok: false; error: string } | { ok: true; themePrefs: ThemePrefs }
  > => {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { token?: string; user?: { id: number; name: string; email: string; role: UserRole; themeAccent?: string | null; themeMode?: string | null }; error?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "Pålogging feilet" };
    const newSession: UserSession = { token: data.token!, id: data.user!.id, name: data.user!.name, email: data.user!.email, role: data.user!.role };
    saveSession(newSession);
    setSession(newSession);
    return { ok: true as const, themePrefs: { themeAccent: data.user?.themeAccent ?? null, themeMode: data.user?.themeMode ?? null } };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const isSuperAdmin = session?.role === "super_admin";

  return {
    session,
    isAuthenticated: !!session,
    isSuperAdmin,
    name: session?.name ?? null,
    email: session?.email ?? null,
    role: session?.role ?? null,
    token: session?.token ?? null,
    login,
    register,
    logout,
  };
}
