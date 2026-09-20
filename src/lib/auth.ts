import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'rra_session';
const SESSION_DAYS = 7;

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    'development-only-secret-change-me-in-production-9f2b7c';
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/** Verifies a session JWT and resolves the user id (or null). */
async function resolveToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads the session from the request and resolves the current user (or null).
 *
 * Two credential channels are supported on purpose:
 *  1. `Authorization: Bearer <jwt>` header — used by the SPA when cookies are
 *     unavailable (e.g. the app is embedded in a cross-origin preview iframe
 *     where third-party cookies are blocked by the browser).
 *  2. The httpOnly `rra_session` cookie — primary channel for normal usage.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // 1) Bearer token (works even when cookies are blocked).
  try {
    const headerList = await headers();
    const auth = headerList.get('authorization');
    if (auth?.toLowerCase().startsWith('bearer ')) {
      const userId = await resolveToken(auth.slice(7).trim());
      if (userId) {
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, createdAt: true },
        });
        if (user) return user;
      }
    }
  } catch {
    // headers() unavailable outside request scope — fall through to cookies.
  }

  // 2) httpOnly cookie.
  const store = await cookies();
  const userId = await resolveToken(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * SESSION_DAYS,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}
