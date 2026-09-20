import { db } from '@/lib/db';
import { ok, fail, handleError, parseBody, requireUser, ApiError } from '@/lib/api-helpers';
import { recreateSchema } from '@/lib/validation';
import { recreateResume, AIError } from '@/lib/ai';
import { resumeToText } from '@/lib/resume-utils';
import { normalizeResumeData } from '@/types/resume';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/recreate — the core "Resume Recreation" feature.
 * Accepts either an existing resumeId or raw resume text (e.g. from an
 * uploaded PDF/DOCX) and returns an AI-reorganized, professionally
 * rewritten ResumeData. Factual content is preserved; the result is returned
 * for review and is NOT saved automatically.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-recreate:${user.id}`, 8, 60_000)) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many AI requests. Please wait a minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, recreateSchema);

    let sourceText = body.rawText?.trim() ?? '';
    if (body.resumeId) {
      const resume = await db.resume.findFirst({ where: { id: body.resumeId, userId: user.id } });
      if (!resume) throw new ApiError('Resume not found.', 404);
      const data = normalizeResumeData(JSON.parse(resume.data));
      const structured = resumeToText(data);
      sourceText = [structured, sourceText].filter(Boolean).join('\n\n');
    }

    if (sourceText.replace(/\s/g, '').length < 60) {
      return fail('Not enough resume content to recreate. Provide your existing resume text or build content first.', 422);
    }

    try {
      const data = await recreateResume(sourceText, body.targetRole);
      return ok({ data, targetRole: body.targetRole ?? null });
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
