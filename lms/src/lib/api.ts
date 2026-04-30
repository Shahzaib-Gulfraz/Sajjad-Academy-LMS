import {
  clearAuthSession,
  getPortalRoleFromPath,
  loadAuthSession,
  saveAuthSession,
  isSessionExpired,
  type AppRole,
  type AuthPayload,
} from '@/lib/auth';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

type ApiEnvelope<T> = {
  data: T;
};

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper (no auth logic)
// ---------------------------------------------------------------------------

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const portalRole = getPortalRoleFromPath();
  
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Portal-Role': portalRole || '',
      ...(options.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string | string[] }
    | null;

  if (!response.ok) {
    const rawMessage = body && 'message' in body ? body.message : undefined;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : rawMessage || `Request failed with status ${response.status}`;
    throw new ApiRequestError(message, response.status);
  }

  if (!body || !('data' in body)) {
    throw new ApiRequestError('Malformed API response.', response.status);
  }

  return body.data;
}

// ---------------------------------------------------------------------------
// Unauthorized event helper
// Dispatches a scoped CustomEvent so AuthProvider can handle the logout
// gracefully via React Router (no hard page reloads).
// ---------------------------------------------------------------------------

function dispatchUnauthorized(portalRole: AppRole | null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('lms:unauthorized', { detail: { role: portalRole } }),
  );
}

// ---------------------------------------------------------------------------
// Silent token refresh
// ---------------------------------------------------------------------------

/** Tracks in-flight refresh promises per role to avoid concurrent refresh races. */
const refreshPromises: Partial<Record<AppRole, Promise<string | null>>> = {};

/**
 * Attempt a silent token refresh for the given role.
 * Returns the new access token on success, or null on failure.
 * Guarantees at most ONE concurrent refresh request per role.
 */
async function silentRefresh(portalRole: AppRole): Promise<string | null> {
  // Coalesce concurrent callers behind a single promise per role.
  if (refreshPromises[portalRole]) {
    return refreshPromises[portalRole]!;
  }

  const session = loadAuthSession(portalRole);
  if (!session?.refreshToken) return null;

  const promise: Promise<string | null> = (async () => {
    try {
      const payload = await apiRequest<AuthPayload>('/auth/refresh', {
        method: 'POST',
      });

      const newSession = saveAuthSession(payload);

      // Notify the in-memory React state via a storage event so AuthProvider
      // re-reads the updated session without a page reload.
      window.dispatchEvent(
        new CustomEvent('lms:session-refreshed', {
          detail: { role: portalRole, session: newSession },
        }),
      );

      return 'refreshed';
      // Refresh failed — clear the stale session and signal unauthorized.
      clearAuthSession(portalRole);
      return null;
    } finally {
      delete refreshPromises[portalRole];
    }
  })();

  refreshPromises[portalRole] = promise;
  return promise;
}

// ---------------------------------------------------------------------------
// Authenticated request with silent refresh + retry-once
// ---------------------------------------------------------------------------

/**
 * Makes an authenticated API request. Behaviour:
 *
 * 1. Reads the portal role from the current URL **at call-time** (not at error-time).
 * 2. If the stored access token is already expired, attempts a silent refresh first.
 * 3. On a 401 response:
 *    a. Tries a silent refresh.
 *    b. If successful, retries the original request once with the new token.
 *    c. If the refresh fails, dispatches `lms:unauthorized` so AuthProvider can
 *       handle logout via React Router — no hard page reload.
 */
export async function apiAuthRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Capture role at call-time so error handling uses the same role.
  const portalRole = getPortalRoleFromPath();

  let sessionFound = !!loadAuthSession(portalRole);

  // --- Pre-emptive silent refresh when the access token is already expired ---
  if (!sessionFound) {
    dispatchUnauthorized(portalRole);
    throw new ApiRequestError('Not authenticated. Please login again.', 401);
  }

  const session = loadAuthSession(portalRole);
  if (session && isSessionExpired(session)) {
    const success = await silentRefresh(portalRole);
    if (!success) {
      dispatchUnauthorized(portalRole);
      throw new ApiRequestError('Session expired. Please login again.', 401);
    }
  }

  // --- Make the actual request ---
  const makeRequest = () =>
    apiRequest<T>(path, {
      ...options,
    });

  try {
    return await makeRequest();
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      // Access token rejected by server — attempt silent refresh once.
      const success = await silentRefresh(portalRole);

      if (success) {
        // Retry the original request with the fresh token.
        try {
          return await makeRequest();
        } catch (retryError) {
          if (retryError instanceof ApiRequestError && retryError.status === 401) {
            // Still unauthorized after refresh+retry — give up.
            dispatchUnauthorized(portalRole);
          }
          throw retryError;
        }
      }

      // Refresh failed — session is dead.
      dispatchUnauthorized(portalRole);
    }

    throw error;
  }
}
