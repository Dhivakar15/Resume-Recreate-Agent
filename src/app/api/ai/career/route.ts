import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { careerSchema } from '@/lib/validation';
import { careerProfile } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/career — full AI career profile: roles, gaps, roadmap, learning, certifications. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-career:${user.id}`, 10, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, careerSchema);
    const { resume, text } = await loadUserResume(user.id, body.resumeId);
    const profile = await careerProfile(text, resume.targetRole ?? undefined);
    return ok(profile);
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
