/**
 * useUserAuth — Clerk-backed auth hook.
 *
 * Primary auth: Clerk session cookie (set by ClerkProvider).
 * Admin fallback: email/password JWT stored in localStorage + x-user-token header.
 *
 * The DB user profile (tenantId, role, etc.) is fetched from /api/auth/user
 * which uses the Clerk session (or JWT header) to look up the internal user.
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth, useUser, useClerk, useSession } from "@clerk/react";

export type UserRole = "user" | "super_admin";
export type TenantRole = "owner" | "admin" | "member";

export interface UserSession {
  token: string | null;
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

// ─── Admin JWT fallback (localStorage) ──────────────────────────────────────

const STORAGE_KEY = "user_session";

interface AdminSession {
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

function loadAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
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

function saveAdminSession(session: AdminSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearAdminSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Returns the admin JWT token if present (used by main.tsx to set x-user-token header). */
export function getUserToken(): string | null {
  return loadAdminSession()?.token ?? null;
}

// ─── DB user profile (fetched from /api/auth/user for Clerk users) ──────────

interface DbUserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  tenantId: number | null;
  tenantName: string | null;
  tenantRole: TenantRole | null;
  isPersonalTenant: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUserAuth() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { session: clerkSession } = useSession();

  const [dbProfile, setDbProfile] = useState<DbUserProfile | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(
    () => loadAdminSession()
  );

  // Fetch DB profile when Clerk session is active — send Bearer token so the
  // API server can validate the session even in dev-proxy environments where
  // Clerk session cookies are not forwarded correctly.
  useEffect(() => {
    if (!authLoaded) return;
    if (!isSignedIn || !clerkSession) {
      setDbProfile(null);
      return;
    }
    clerkSession.getToken().then((token) => {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch("/api/auth/user", { credentials: "include", headers });
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { user: DbUserProfile | null } | null) => {
        setDbProfile(data?.user ?? null);
      })
      .catch(() => setDbProfile(null));
  }, [isSignedIn, authLoaded, clerkSession]);

  // ── Admin email/password login (fallback) ─────────────────────────────────
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ ok: false; error: string } | { ok: true; themePrefs: ThemePrefs }> => {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as {
        token?: string;
        user?: { id: number; name: string; email: string; role: UserRole; themeAccent?: string | null; themeMode?: string | null; tenantId?: number | null; tenantName?: string | null; tenantRole?: TenantRole | null; isPersonalTenant?: boolean };
        error?: string;
      };
      if (!res.ok) return { ok: false, error: data.error ?? "Pålogging feilet" };
      const session: AdminSession = {
        token: data.token!,
        id: data.user!.id,
        name: data.user!.name,
        email: data.user!.email,
        role: data.user!.role,
        tenantId: data.user!.tenantId ?? null,
        tenantName: data.user!.tenantName ?? null,
        tenantRole: data.user!.tenantRole ?? null,
        isPersonalTenant: data.user!.isPersonalTenant ?? true,
      };
      saveAdminSession(session);
      setAdminSession(session);
      return {
        ok: true,
        themePrefs: {
          themeAccent: data.user!.themeAccent ?? null,
          themeMode: data.user!.themeMode ?? null,
        },
      };
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string
    ): Promise<{ ok: false; error: string } | { ok: true; themePrefs: ThemePrefs }> => {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json() as { token?: string; user?: { id: number; name: string; email: string; role: UserRole; themeAccent?: string | null; themeMode?: string | null; tenantId?: number | null; tenantName?: string | null; tenantRole?: TenantRole | null; isPersonalTenant?: boolean }; error?: string };
      if (!res.ok) return { ok: false, error: data.error ?? "Registrering feilet" };
      const session: AdminSession = {
        token: data.token!,
        id: data.user!.id,
        name: data.user!.name,
        email: data.user!.email,
        role: data.user!.role,
        tenantId: data.user!.tenantId ?? null,
        tenantName: data.user!.tenantName ?? null,
        tenantRole: data.user!.tenantRole ?? null,
        isPersonalTenant: data.user!.isPersonalTenant ?? true,
      };
      saveAdminSession(session);
      setAdminSession(session);
      return {
        ok: true,
        themePrefs: {
          themeAccent: data.user!.themeAccent ?? null,
          themeMode: data.user!.themeMode ?? null,
        },
      };
    },
    []
  );

  // ── Clerk logout (also clears admin session) ──────────────────────────────
  const logout = useCallback(() => {
    clearAdminSession();
    setAdminSession(null);
    setDbProfile(null);
    if (isSignedIn) {
      void signOut({ redirectUrl: "/" });
    } else {
      window.location.href = "/";
    }
  }, [isSignedIn, signOut]);

  const loginWithClerk = useCallback(() => {
    window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`;
  }, []);

  const switchTenant = useCallback(
    async (tenantId: number): Promise<{ ok: boolean; error?: string }> => {
      const token = loadAdminSession()?.token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json() as {
        token?: string;
        tenantId?: number;
        tenantName?: string;
        tenantRole?: TenantRole;
        error?: string;
      };
      if (!res.ok) return { ok: false, error: data.error ?? "Bytte feilet" };
      if (adminSession && data.token) {
        const updated: AdminSession = {
          ...adminSession,
          token: data.token,
          tenantId: data.tenantId ?? null,
          tenantName: data.tenantName ?? null,
          tenantRole: data.tenantRole ?? null,
          isPersonalTenant: false,
        };
        saveAdminSession(updated);
        setAdminSession(updated);
      } else if (dbProfile) {
        setDbProfile((p) =>
          p
            ? {
                ...p,
                tenantId: data.tenantId ?? p.tenantId,
                tenantName: data.tenantName ?? p.tenantName,
                tenantRole: data.tenantRole ?? p.tenantRole,
                isPersonalTenant: false,
              }
            : p
        );
      }
      return { ok: true };
    },
    [adminSession, dbProfile]
  );

  // ── Resolve effective session ─────────────────────────────────────────────
  // Admin JWT takes priority over Clerk (so admin can log in with password)
  const effectiveSession: UserSession | null = adminSession
    ? adminSession
    : isSignedIn && dbProfile
    ? {
        token: null,
        id: dbProfile.id,
        name: clerkUser?.fullName ?? dbProfile.name,
        email:
          clerkUser?.primaryEmailAddress?.emailAddress ?? dbProfile.email,
        role: dbProfile.role,
        tenantId: dbProfile.tenantId,
        tenantName: dbProfile.tenantName,
        tenantRole: dbProfile.tenantRole,
        isPersonalTenant: dbProfile.isPersonalTenant,
      }
    : null;

  const isAuthenticated = !!effectiveSession;
  const isSuperAdmin = effectiveSession?.role === "super_admin";

  return {
    session: effectiveSession,
    isAuthenticated,
    isSuperAdmin,
    name: effectiveSession?.name ?? null,
    email: effectiveSession?.email ?? null,
    role: effectiveSession?.role ?? null,
    token: effectiveSession?.token ?? null,
    tenantId: effectiveSession?.tenantId ?? null,
    tenantName: effectiveSession?.tenantName ?? null,
    tenantRole: effectiveSession?.tenantRole ?? null,
    isPersonalTenant: effectiveSession?.isPersonalTenant ?? true,
    login,
    register,
    logout,
    loginWithClerk,
    switchTenant,
  };
}
