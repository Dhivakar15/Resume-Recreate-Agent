import { db } from '@/lib/db';
import { ok, fail, handleError, parseBody } from '@/lib/api-helpers';
import { registerSchema } from '@/lib/validation';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    if (!rateLimit(`register:${ip}`, 10, 60_000)) {
      return fail('Too many attempts. Please wait a minute and try again.', 429);
    }
    const body = await parseBody(req, registerSchema);
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return fail('An account with this email already exists. Try signing in instead.', 409);

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: { name: body.name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);
    // The token is also returned so the SPA can keep it in localStorage and
    // send it as `Authorization: Bearer` — this keeps sessions working in
    // contexts where cookies are blocked (e.g. embedded preview iframes).
    return ok({ user, token });
  } catch (e) {
    return handleError(e);
  }
}
