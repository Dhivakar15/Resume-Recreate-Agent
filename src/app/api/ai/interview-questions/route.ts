import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { interviewQuestionsSchema } from '@/lib/validation';
import { generateInterviewQuestions } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';

/** POST /api/ai/interview-questions — question sets (HR/technical/project/behavioral/job-specific). */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-interview:${user.id}`, 12, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, interviewQuestionsSchema);
    const { resume, text } = await loadUserResume(user.id, body.resumeId);
    const role = body.role?.trim() || resume.targetRole?.trim() || 'Software Developer';
    const questions = await generateInterviewQuestions(text, role);
    return ok({ ...questions, role });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
