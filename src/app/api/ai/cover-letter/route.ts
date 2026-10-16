import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { coverLetterSchema } from '@/lib/validation';
import { generateCoverLetter } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/cover-letter — generate a tailored cover letter from a resume. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-coverletter:${user.id}`, 15, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, coverLetterSchema);
    const { resume, text } = await loadUserResume(user.id, body.resumeId);

    const result = await generateCoverLetter({
      resumeText: text,
      company: body.company,
      role: body.role,
      jobDescription: body.jobDescription?.trim() || undefined,
      tone: body.tone,
    });
    return ok({ ...result, tone: body.tone, resumeTitle: resume.title });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
