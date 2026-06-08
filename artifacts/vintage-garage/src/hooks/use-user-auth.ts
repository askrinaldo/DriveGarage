import { useState, useCallback, useEffect } from "react";

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
const BRIDGE_COOKIE = "_gptoken";

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

/** Read a cookie by name from document.cookie */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

/** Clear the bridge cookie immediately after we pick it up */
function clearBridgeCookie() {
  document.cookie = `${BRIDGE_COOKIE}=; path=/; max-age=0; secure; samesite=lax`;
}

/** Decode JWT payload without verifying (verification happens server-side) */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]!)) as Record<string, unknown>;
  } catch {
    return null;
  }
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

/** Build a UserSession directly from a JWT payload (no extra API call needed) */
function sessionFromJwt(token: string): UserSession | null {
  const p = decodeJwtPayload(token);
  if (!p) return null;
  return {
    token,
    id: p.userId as number,
    name: p.name as string,
    email: p.email as string,
    role: (p.role as UserRole) ?? "user",
    tenantId: (p.tenantId as number) ?? null,
    tenantName: (p.tenantName as string) ?? null,
    tenantRole: (p.tenantRole as TenantRole) ?? null,
    isPersonalTenant: (p.isPersonalTenant as boolean) ?? true,
  };
}

export function useUserAuth() {
  const [session, setSession] = useState<UserSession | null>(loadSession);

  // On mount: pick up the bridge cookie set by /api/callback after Replit OIDC
  useEffect(() => {
    const bridgeToken = readCookie(BRIDGE_COOKIE);
    if (bridgeToken) {
      clearBridgeCookie();
      const newSession = sessionFromJwt(bridgeToken);
      if (newSession) {
        saveSession(newSession);
        setSession(newSession);
      }
    }
  }, []);

  // Email/password login — kept for admin backward compat
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

  // Replit Auth logout — redirects to OIDC end-session, clears local state
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    window.location.href = "/api/logout";
  }, []);

  // Initiate Replit OIDC login
  const loginWithReplit = useCallback(() => {
    const returnTo = encodeURIComponent(window.location.pathname || "/");
    window.location.href = `/api/login?returnTo=${returnTo}`;
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
    loginWithReplit,
    switchTenant,
  };
}
