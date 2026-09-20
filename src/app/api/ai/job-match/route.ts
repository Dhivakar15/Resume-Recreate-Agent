import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { jobMatchSchema } from '@/lib/validation';
import { extractJobRequirements, jobMatchSuggestions, AIError } from '@/lib/ai';
import { computeJobMatchScore } from '@/lib/ats-score';
import { resumeToText } from '@/lib/resume-utils';
import { normalizeResumeData, type ResumeData } from '@/types/resume';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/job-match — extracts structured requirements from a pasted job
 * description and compares them with the user's resume.
 * Match score is computed deterministically (required 65% / preferred 20% / keywords 15%).
 * Missing skills are shown as guidance only — never added to the resume automatically.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-jd:${user.id}`, 12, 60_000)) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many AI requests. Please wait a minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = await parseBody(req, jobMatchSchema);

    let resumeData: ResumeData | null = null;
    let resumeId: string | null = null;
    if (body.resumeId) {
      const resume = await db.resume.findFirst({ where: { id: body.resumeId, userId: user.id } });
      if (resume) {
        resumeData = normalizeResumeData(JSON.parse(resume.data));
        resumeId = resume.id;
      }
    }

    try {
      const requirements = await extractJobRequirements(body.content, body.title);

      let match = { score: 0, matchedSkills: [] as string[], missingSkills: [] as string[] };
      let suggestions = { suggestedKeywords: [] as string[], suggestions: [] as string[] };

      if (resumeData) {
        match = computeJobMatchScore(resumeData, requirements);
        suggestions = await jobMatchSuggestions(resumeToText(resumeData), requirements);
      }

      const analysis = { requirements, match: { ...match, ...suggestions }, generatedAt: new Date().toISOString() };

      const jd = await db.jobDescription.create({
        data: {
          userId: user.id,
          resumeId,
          title: requirements.title || body.title || 'Untitled Job Description',
          company: null,
          content: body.content.slice(0, 20000),
          analysis: JSON.stringify(analysis),
        },
      });

      if (resumeId) {
        await db.aIAnalysis.create({
          data: {
            resumeId,
            type: 'JOB_MATCH',
            targetRole: requirements.title,
            score: match.score,
            result: JSON.stringify(analysis),
          },
        });
      }

      return ok({ analysis, jobDescriptionId: jd.id });
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
