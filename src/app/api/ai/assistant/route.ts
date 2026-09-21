import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { assistantSchema } from '@/lib/validation';
import { assistantReply } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { normalizeResumeData } from '@/types/resume';
import { resumeToText } from '@/lib/resume-utils';

/** POST /api/ai/assistant — resume-aware chat assistant. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-assistant:${user.id}`, 30, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, assistantSchema);

    let resumeText = '';
    if (body.resumeId) {
      const { text } = await loadUserResume(user.id, body.resumeId);
      resumeText = text;
    } else {
      // Fall back to the user's most recently updated resume.
      const latest = await db.resume.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { data: true },
      });
      if (latest) {
        const data = normalizeResumeData(JSON.parse(latest.data));
        resumeText = resumeToText(data);
      }
    }

    const reply = await assistantReply(body.messages, resumeText || 'The user has no resume content yet. Encourage them to create one.', user.name);
    return ok({ reply });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
