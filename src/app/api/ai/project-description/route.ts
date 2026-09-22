import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { projectDescriptionSchema } from '@/lib/validation';
import { generateProjectDescription } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/project-description — project idea → resume-ready content. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-projectgen:${user.id}`, 15, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, projectDescriptionSchema);
    const result = await generateProjectDescription(body.name, body.idea, body.targetRole?.trim() || undefined);
    return ok(result);
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
