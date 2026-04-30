export type BackendRole = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type AppRole = 'admin' | 'teacher' | 'student';

export type AuthUser = {
  id: string;
  systemId?: string;
  name: string;
  email: string;
  role: BackendRole;
  isActive: boolean;
};

export type AuthPayload = {
  user: AuthUser;
  expiresAt: string;
};

export type AuthSession = AuthPayload & {
  issuedAt: number;
};

const AUTH_STORAGE_KEYS: Record<AppRole, string> = {
  admin: 'admin_token',
  teacher: 'teacher_token',
  student: 'student_token',
};
const AUTH_LEGACY_STORAGE_KEY = 'auth-session';
const AUTH_LAST_ACTIVE_ROLE_KEY = 'auth-last-active-role';

export function getPortalRoleFromPath(pathname?: string): AppRole | null {
  const currentPath =
    pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  if (currentPath.startsWith('/admin')) return 'admin';
  if (currentPath.startsWith('/teacher')) return 'teacher';
  if (currentPath.startsWith('/student')) return 'student';
  return null;
}

function getStorageKey(role: AppRole) {
  return AUTH_STORAGE_KEYS[role];
}

/**
 * Returns true when the session's `expiresAt` is within 30 seconds of now
 * (or already past). The 30-second buffer gives the silent-refresh time to run.
 *
 * For UX only — the server is the true authority.
 */
export function isSessionExpired(session: AuthSession): boolean {
  if (!session.expiresAt) return true;
  const expTime = new Date(session.expiresAt).getTime();
  return Date.now() >= expTime - 30000;
}

// ---------------------------------------------------------------------------

function resolveSessionRole(explicitRole?: AppRole | null): AppRole | null {
  if (explicitRole) return explicitRole;

  const byPath = getPortalRoleFromPath();
  if (byPath) return byPath;

  const last = localStorage.getItem(AUTH_LAST_ACTIVE_ROLE_KEY);
  if (last === 'admin' || last === 'teacher' || last === 'student') {
    return last;
  }

  for (const role of ['admin', 'teacher', 'student'] as const) {
    if (localStorage.getItem(getStorageKey(role))) {
      return role;
    }
  }

  return null;
}

export function backendRoleToAppRole(role: BackendRole): AppRole {
  if (role === 'ADMIN') return 'admin';
  if (role === 'TEACHER') return 'teacher';
  return 'student';
}

export function defaultPathByRole(role: AppRole): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/student/dashboard';
}

export function saveAuthSession(payload: AuthPayload): AuthSession {
  const role = backendRoleToAppRole(payload.user.role);
  const session: AuthSession = {
    ...payload,
    issuedAt: Date.now(),
  };
  localStorage.setItem(getStorageKey(role), JSON.stringify(session));
  localStorage.setItem(AUTH_LAST_ACTIVE_ROLE_KEY, role);

  // Backward compatibility cleanup for legacy single-session storage.
  localStorage.removeItem(AUTH_LEGACY_STORAGE_KEY);
  return session;
}



export function loadAuthSession(role?: AppRole | null): AuthSession | null {
  const resolvedRole = resolveSessionRole(role);
  const raw = resolvedRole ? localStorage.getItem(getStorageKey(resolvedRole)) : null;

  // One-time migration from legacy key if role-scoped token is missing.
  if (!raw) {
    const legacyRaw = localStorage.getItem(AUTH_LEGACY_STORAGE_KEY);
    if (!legacyRaw) return null;

    try {
      const legacyParsed = JSON.parse(legacyRaw) as AuthSession;
      if (!legacyParsed?.user?.role) return null;

      const legacyRole = backendRoleToAppRole(legacyParsed.user.role);
      localStorage.setItem(getStorageKey(legacyRole), legacyRaw);
      localStorage.setItem(AUTH_LAST_ACTIVE_ROLE_KEY, legacyRole);
      localStorage.removeItem(AUTH_LEGACY_STORAGE_KEY);

      if (isSessionExpired(legacyParsed)) {
        // Without tokens, just attempt refresh if needed
        return legacyParsed;
      }

      if (!resolvedRole || resolvedRole === legacyRole) return legacyParsed;
      return null;
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user?.role) return null;

    // Guard against cross-role token leakage in the wrong portal.
    if (resolvedRole) {
      const tokenRole = backendRoleToAppRole(parsed.user.role);
      if (tokenRole !== resolvedRole) return null;
    }

    // Since we don't know the refresh token expiration, we always return the session
    // even if expired, letting api.ts attempt a silent refresh via the httpOnly cookie.
    return parsed;
  } catch {
    return null;
  }
}

export function clearAuthSession(role?: AppRole | null) {
  const resolvedRole = resolveSessionRole(role);
  if (!resolvedRole) return;

  localStorage.removeItem(getStorageKey(resolvedRole));

  const last = localStorage.getItem(AUTH_LAST_ACTIVE_ROLE_KEY);
  if (last === resolvedRole) {
    localStorage.removeItem(AUTH_LAST_ACTIVE_ROLE_KEY);
  }
}
