import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, type SessionUser } from '@/lib/auth';

/** Consistent API envelope: { ok: true, data } | { ok: false, error }. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Throws 401 ApiError when there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError('You must be signed in to do that.', 401);
  return user;
}

/** Parses + validates a JSON request body with zod, throwing friendly errors. */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError('Invalid request body.', 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const msg = issue ? `${issue.path.join('.') ? issue.path.join('.') + ': ' : ''}${issue.message}` : 'Invalid input.';
    throw new ApiError(msg, 422);
  }
  return parsed.data;
}

/** Maps thrown errors to consistent API responses. Never leaks stack traces. */
export function handleError(e: unknown) {
  if (e instanceof ApiError) return fail(e.message, e.status);
  console.error('[api] unhandled error:', e);
  return fail('Something went wrong on our side. Please try again.', 500);
}
