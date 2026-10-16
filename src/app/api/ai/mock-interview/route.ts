import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { mockInterviewSchema } from '@/lib/validation';
import { mockInterviewTurn } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/mock-interview — one conversational turn.
 * Call 1 (no answer): get the opening question.
 * Each next call: { question, answer } → evaluation + next question (wrap-up after 5).
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-mock:${user.id}`, 30, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, mockInterviewSchema);
    const { resume, text } = await loadUserResume(user.id, body.resumeId);
    const role = body.role?.trim() || resume.targetRole?.trim() || 'Software Developer';

    const result = await mockInterviewTurn({
      resumeText: text,
      role,
      question: body.question?.trim() || undefined,
      answer: body.answer?.trim() || undefined,
      askedHistory: body.askedHistory ?? [],
    });

    return ok({
      ...result,
      questionNumber: (body.askedHistory?.length ?? 0) + 1,
    });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
