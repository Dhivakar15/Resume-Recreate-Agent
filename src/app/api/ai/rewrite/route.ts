import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { rewriteSchema } from '@/lib/validation';
import { rewriteSectionVariants } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';
import { resumeToText } from '@/lib/resume-utils';

/** POST /api/ai/rewrite — 3 AI rewrites of a section in the selected mode. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-rewrite:${user.id}`, 20, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, rewriteSchema);

    let targetRole = body.targetRole?.trim();
    let context = body.context?.trim();
    if (body.resumeId) {
      const { resume, data } = await loadUserResume(user.id, body.resumeId);
      targetRole = targetRole || resume.targetRole?.trim() || undefined;
      if (!context) context = resumeToText(data).slice(0, 2500);
    }

    const variants = await rewriteSectionVariants(body.text, body.mode, targetRole, context);
    return ok({ variants, mode: body.mode });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
