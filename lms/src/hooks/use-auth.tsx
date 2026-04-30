/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/api';
import {
  AuthPayload,
  AuthSession,
  AppRole,
  backendRoleToAppRole,
  clearAuthSession,
  getPortalRoleFromPath,
  loadAuthSession,
  saveAuthSession,
} from '@/lib/auth';

type AuthContextValue = {
  session: AuthSession | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // portalRole is derived from the current URL path.
  // Because AuthProvider is now inside BrowserRouter, this is stable and correct.
  const portalRole = getPortalRoleFromPath();

  // useNavigate is safe here because AuthProvider is wrapped by BrowserRouter in App.tsx.
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // Initialise session from storage on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    setSession(loadAuthSession(portalRole));
    setIsInitializing(false);
  }, [portalRole]);

  // -------------------------------------------------------------------------
  // Soft logout — clears only this portal's token, then redirects to login
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    const current = loadAuthSession(portalRole);

    if (current) {
      // Best-effort server-side session invalidation.
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    }

    // Remove ONLY this portal's token — never touches other portals' tokens.
    clearAuthSession(portalRole);
    setSession(null);
  }, [portalRole]);

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  const login = useCallback(
    async (identifier: string, password: string) => {
      const payload = await apiRequest<AuthPayload>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      // Ensure the returned role matches this portal.
      const loginRole = backendRoleToAppRole(payload.user.role);
      if (portalRole && loginRole !== portalRole) {
        throw new Error(
          `This portal is for ${portalRole} accounts. Please use the ${loginRole} portal.`,
        );
      }

      const nextSession = saveAuthSession(payload);
      setSession(nextSession);
      return nextSession;
    },
    [portalRole],
  );

  // -------------------------------------------------------------------------
  // Listen for `lms:unauthorized` — dispatched by api.ts instead of hard-redirecting.
  // Only act if the event is for THIS portal's role to avoid cross-portal interference.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleUnauthorized = (e: Event) => {
      const customEvent = e as CustomEvent<{ role: AppRole | null }>;
      const eventRole = customEvent.detail?.role;

      // Ignore events targeted at a different portal.
      if (eventRole !== portalRole) return;

      // Soft logout for this portal only.
      clearAuthSession(portalRole);
      setSession(null);

      // Redirect to login using React Router (no hard reload).
      navigate('/', { replace: true });
    };

    window.addEventListener('lms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('lms:unauthorized', handleUnauthorized);
  }, [navigate, portalRole]);

  // -------------------------------------------------------------------------
  // Listen for `lms:session-refreshed` — dispatched by api.ts after a
  // successful silent token refresh. Updates in-memory state so the UI
  // reflects the new session without any page reload.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleSessionRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ role: AppRole; session: AuthSession }>;
      const eventRole = customEvent.detail?.role;

      // Only update this portal's state.
      if (eventRole !== portalRole) return;

      setSession(customEvent.detail.session);
    };

    window.addEventListener('lms:session-refreshed', handleSessionRefreshed);
    return () => window.removeEventListener('lms:session-refreshed', handleSessionRefreshed);
  }, [portalRole]);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  const value = useMemo<AuthContextValue>(() => {
    const role = session ? backendRoleToAppRole(session.user.role) : null;
    return {
      session,
      role,
      isAuthenticated: Boolean(session?.user),
      isInitializing,
      login,
      logout,
    };
  }, [isInitializing, login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
