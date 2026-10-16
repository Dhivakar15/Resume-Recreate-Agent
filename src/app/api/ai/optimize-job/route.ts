import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser, ApiError } from '@/lib/api-helpers';
import { optimizeJobSchema } from '@/lib/validation';
import { optimizeResumeForJob, extractJobRequirements } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity';
import { computeJobMatchScore } from '@/lib/ats-score';

/**
 * POST /api/ai/optimize-job — produce a job-tailored copy of a resume.
 * Returns the optimized ResumeData + change list + expected match improvement.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-optimize:${user.id}`, 10, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, optimizeJobSchema);
    const { resume, data } = await loadUserResume(user.id, body.resumeId);

    const requirements = await extractJobRequirements(body.jobDescription.trim(), body.title?.trim() || undefined);
    const before = computeJobMatchScore(data, requirements).score;
    const { optimized, changes } = await optimizeResumeForJob(data, requirements);
    const after = computeJobMatchScore(optimized, requirements).score;

    await logActivity(user.id, 'resume_optimized', `"${resume.title}" optimized for ${requirements.title} (match ${before}% → ${after}%)`);

    return ok({ optimizedData: optimized, changes, matchBefore: before, matchAfter: after, jobTitle: requirements.title });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
