import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { improveSchema } from '@/lib/validation';
import { improveText, AIError } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/improve — professionally rewrites summary/objective/experience/internship/project/achievement text. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-improve:${user.id}`, 20, 60_000)) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many AI requests. Please wait a minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, improveSchema);
    try {
      const text = await improveText(body.kind, body.text, body.targetRole, body.context);
      return ok({ text });
    } catch (e) {
      if (e instanceof AIError) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw e;
    }
  } catch (e) {
    return handleError(e);
  }
}
