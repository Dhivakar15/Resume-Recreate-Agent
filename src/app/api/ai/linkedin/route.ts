import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { linkedinSchema } from '@/lib/validation';
import { optimizeLinkedInProfile } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/linkedin — LinkedIn profile optimization from a resume. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-linkedin:${user.id}`, 10, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, linkedinSchema);
    const { text } = await loadUserResume(user.id, body.resumeId);
    const result = await optimizeLinkedInProfile(text);
    return ok(result);
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
