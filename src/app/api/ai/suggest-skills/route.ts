import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { suggestSkillsSchema } from '@/lib/validation';
import { suggestSkills, AIError } from '@/lib/ai';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/suggest-skills — suggests relevant skills for the target role based on resume context. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-skills:${user.id}`, 15, 60_000)) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many AI requests. Please wait a minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, suggestSkillsSchema);
    try {
      const suggestions = await suggestSkills(body.targetRole, body.context);
      return ok({ suggestions });
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
