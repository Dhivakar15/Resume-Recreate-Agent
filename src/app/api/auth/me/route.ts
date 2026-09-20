import { ok, handleError } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
