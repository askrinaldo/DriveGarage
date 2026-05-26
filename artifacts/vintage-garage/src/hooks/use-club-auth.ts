import { useState, useCallback, useEffect } from "react";

export type ClubRole = "owner" | "admin" | "moderator" | "member";

export interface ClubSession {
  token: string;
  role: ClubRole;
  memberName: string;
  clubId: number;
}

const ROLE_ORDER: Record<ClubRole, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

function tokenKey(clubId: number): string {
  return `club_session_${clubId}`;
}

function loadSession(clubId: number): ClubSession | null {
  try {
    const raw = localStorage.getItem(tokenKey(clubId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClubSession;
    // Quick expiry check by decoding JWT without verifying (just reading exp)
    const parts = parsed.token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]!));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem(tokenKey(clubId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: ClubSession): void {
  localStorage.setItem(tokenKey(session.clubId), JSON.stringify(session));
}

function clearSession(clubId: number): void {
  localStorage.removeItem(tokenKey(clubId));
}

export function useClubAuth(clubId: number | null) {
  const [session, setSession] = useState<ClubSession | null>(() =>
    clubId ? loadSession(clubId) : null
  );

  useEffect(() => {
    if (clubId) {
      setSession(loadSession(clubId));
    } else {
      setSession(null);
    }
  }, [clubId]);

  const login = useCallback(
    async (memberName: string): Promise<{ ok: true; role: ClubRole } | { ok: false; error: string }> => {
      if (!clubId) return { ok: false, error: "Ingen klubb valgt" };
      try {
        const res = await fetch(`/api/auth/club-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberName: memberName.trim(), clubId }),
        });

        if (!res.ok) {
          const body = await res.json() as { error?: string };
          return { ok: false, error: body.error ?? "Pålogging feilet" };
        }

        const data = await res.json() as { token: string; role: ClubRole; memberName: string };
        const newSession: ClubSession = {
          token: data.token,
          role: data.role,
          memberName: data.memberName,
          clubId,
        };
        saveSession(newSession);
        setSession(newSession);
        return { ok: true, role: data.role };
      } catch {
        return { ok: false, error: "Nettverksfeil" };
      }
    },
    [clubId]
  );

  const logout = useCallback(() => {
    if (clubId) {
      clearSession(clubId);
      setSession(null);
    }
  }, [clubId]);

  const hasRole = useCallback(
    (minRole: ClubRole): boolean => {
      if (!session) return false;
      return (ROLE_ORDER[session.role] ?? 0) >= (ROLE_ORDER[minRole] ?? 0);
    },
    [session]
  );

  const getToken = useCallback((): string | null => {
    if (!clubId) return null;
    return loadSession(clubId)?.token ?? null;
  }, [clubId]);

  return {
    session,
    isAuthenticated: !!session,
    role: session?.role ?? null,
    memberName: session?.memberName ?? null,
    login,
    logout,
    hasRole,
    getToken,
  };
}

/**
 * Global token getter for setAuthTokenGetter.
 * Reads the club token based on the current URL path (e.g. /clubs/1/...).
 */
export function getClubTokenFromUrl(): string | null {
  const match = window.location.pathname.match(/\/clubs\/(\d+)/);
  if (!match) return null;
  const clubId = parseInt(match[1]!, 10);
  return loadSession(clubId)?.token ?? null;
}
