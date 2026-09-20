import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser, ApiError, fail } from '@/lib/api-helpers';
import { analyzeSchema } from '@/lib/validation';
import { analyzeResumeContent, AIError } from '@/lib/ai';
import { computeATSScore } from '@/lib/ats-score';
import { resumeToText } from '@/lib/resume-utils';
import { normalizeResumeData } from '@/types/resume';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/analyze — ATS analysis of a resume against a target role.
 * The numeric score is computed deterministically from the resume content and
 * AI-extracted role keywords, so the same inputs always yield the same score.
 * It is clearly labelled in the UI as an "AI Estimated ATS Score".
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-analyze:${user.id}`, 12, 60_000)) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many AI requests. Please wait a minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, analyzeSchema);

    const resume = await db.resume.findFirst({ where: { id: body.resumeId, userId: user.id } });
    if (!resume) throw new ApiError('Resume not found.', 404);

    const data = normalizeResumeData(JSON.parse(resume.data));
    const targetRole = body.targetRole?.trim() || resume.targetRole?.trim() || 'Software Developer';
    const text = resumeToText(data);
    if (text.replace(/\s/g, '').length < 60) {
      return fail('This resume has too little content to analyze. Add your summary, skills, education or experience first.', 422);
    }

    try {
      const feedback = await analyzeResumeContent(text, targetRole);
      const analysis = computeATSScore(data, feedback, targetRole);

      const saved = await db.aIAnalysis.create({
        data: {
          resumeId: resume.id,
          type: 'ATS',
          targetRole,
          score: analysis.score,
          result: JSON.stringify(analysis),
        },
      });

      return ok({ analysis, analysisId: saved.id });
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
