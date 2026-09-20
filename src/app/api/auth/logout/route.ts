import { ok, handleError } from '@/lib/api-helpers';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ signedOut: true });
  } catch (e) {
    return handleError(e);
  }
}
