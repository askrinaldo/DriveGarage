import { useState, useCallback } from "react";

export type UserRole = "user" | "super_admin";
export type TenantRole = "owner" | "admin" | "member";

export interface UserSession {
  token: string;
  id: number;
  name: string;
  email: string;
  role: UserRole;
  tenantId: number | null;
  tenantName: string | null;
  tenantRole: TenantRole | null;
  isPersonalTenant: boolean;
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

interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  themeAccent?: string | null;
  themeMode?: string | null;
  tenantId?: number | null;
  tenantName?: string | null;
  tenantRole?: TenantRole | null;
  isPersonalTenant?: boolean;
}

function buildSession(token: string, user: ApiUser): UserSession {
  return {
    token,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId ?? null,
    tenantName: user.tenantName ?? null,
    tenantRole: user.tenantRole ?? null,
    isPersonalTenant: user.isPersonalTenant ?? true,
  };
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
    const data = await res.json() as { token?: string; user?: ApiUser; error?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "Registrering feilet" };
    const newSession = buildSession(data.token!, data.user!);
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
    const data = await res.json() as { token?: string; user?: ApiUser; error?: string };
    if (!res.ok) return { ok: false as const, error: data.error ?? "Pålogging feilet" };
    const newSession = buildSession(data.token!, data.user!);
    saveSession(newSession);
    setSession(newSession);
    return { ok: true as const, themePrefs: { themeAccent: data.user?.themeAccent ?? null, themeMode: data.user?.themeMode ?? null } };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const switchTenant = useCallback(async (tenantId: number): Promise<{ ok: boolean; error?: string }> => {
    const token = loadSession()?.token;
    if (!token) return { ok: false, error: "Ikke innlogget" };
    const res = await fetch("/api/auth/switch-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-token": token },
      body: JSON.stringify({ tenantId }),
    });
    const data = await res.json() as { token?: string; tenantId?: number; tenantName?: string; tenantRole?: TenantRole; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Bytte feilet" };
    const current = loadSession();
    if (current && data.token) {
      const newSession: UserSession = {
        ...current,
        token: data.token,
        tenantId: data.tenantId ?? null,
        tenantName: data.tenantName ?? null,
        tenantRole: data.tenantRole ?? null,
        isPersonalTenant: false,
      };
      saveSession(newSession);
      setSession(newSession);
    }
    return { ok: true };
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
    tenantId: session?.tenantId ?? null,
    tenantName: session?.tenantName ?? null,
    tenantRole: session?.tenantRole ?? null,
    isPersonalTenant: session?.isPersonalTenant ?? true,
    login,
    register,
    logout,
    switchTenant,
  };
}
