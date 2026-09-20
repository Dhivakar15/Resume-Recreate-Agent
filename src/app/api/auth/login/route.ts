import { db } from '@/lib/db';
import { ok, fail, handleError, parseBody } from '@/lib/api-helpers';
import { loginSchema } from '@/lib/validation';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'local';
    if (!rateLimit(`login:${ip}`, 15, 60_000)) {
      return fail('Too many attempts. Please wait a minute and try again.', 429);
    }
    const body = await parseBody(req, loginSchema);
    const email = body.email.toLowerCase();

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return fail('Invalid email or password.', 401);

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return fail('Invalid email or password.', 401);

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);
    return ok({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
  } catch (e) {
    return handleError(e);
  }
}
