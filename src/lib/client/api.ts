'use client';

/**
 * Client-side API helper. Every request goes through here so error handling,
 * the { ok, data } envelope and credentials are handled consistently.
 *
 * Sessions work over two channels:
 *  - the httpOnly `rra_session` cookie (default), and
 *  - an `Authorization: Bearer <token>` header when the token is present in
 *    localStorage. The fallback keeps the app working in environments where
 *    cookies are blocked, e.g. when it is embedded in a cross-origin iframe
 *    (preview panels) with third-party cookie restrictions.
 */

const TOKEN_KEY = 'rra_token';

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // storage unavailable (privacy mode) — cookie channel still works
  }
}

export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore — cookie channel remains */
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(path: string, opts?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = opts ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      credentials: 'same-origin',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...(rest.headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new Error('Network error — please check your connection and try again.');
  }
  let payload: { ok?: boolean; data?: T; error?: string } | null = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok || !payload || payload.ok !== true) {
    // A 401 on a data endpoint (not on login/register themselves) means the
    // stored token is stale/invalid — drop it so the next request starts clean.
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      clearStoredToken();
    }
    throw new Error(payload?.error || `Request failed (${res.status}).`);
  }
  return payload.data as T;
}

/** Downloads a binary/text response from an endpoint as a file. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(path, { credentials: 'same-origin', headers: authHeaders() });
  if (!res.ok) {
    let message = `Download failed (${res.status}).`;
    try {
      const payload = await res.json();
      if (payload?.error) message = payload.error;
    } catch {
      /* binary or empty body */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] ?? fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
