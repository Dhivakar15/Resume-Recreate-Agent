'use client';

/**
 * Client-side API helper. Every request goes through here so error handling
 * and the { ok, data } envelope are handled consistently.
 */
export async function apiFetch<T>(path: string, opts?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = opts ?? {};
  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      credentials: 'same-origin',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
    throw new Error(payload?.error || `Request failed (${res.status}).`);
  }
  return payload.data as T;
}

/** Downloads a binary/_text response from an endpoint as a file. */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(path, { credentials: 'same-origin' });
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
