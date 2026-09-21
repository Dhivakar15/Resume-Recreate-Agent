import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { skillGapSchema } from '@/lib/validation';
import { skillGapAnalysis, extractJobRequirements } from '@/lib/ai';
import { aiErrorResponse, aiRateLimitResponse, loadUserResume } from '@/lib/resume-loader';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeKeyword } from '@/lib/resume-utils';

/** POST /api/ai/skill-gap — compare current skills against a target role / job description. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`ai-skillgap:${user.id}`, 12, 60_000)) return aiRateLimitResponse();
    const body = await parseBody(req, skillGapSchema);
    const { data, text } = await loadUserResume(user.id, body.resumeId);

    // 1. Required skills — from the JD when provided, otherwise AI-extracted for the role.
    let requiredSkills: string[];
    if (body.jobDescription?.trim()) {
      const requirements = await extractJobRequirements(body.jobDescription.trim());
      requiredSkills = [...new Set([...requirements.requiredSkills, ...requirements.preferredSkills, ...requirements.technologies])].slice(0, 20);
    } else {
      const requirements = await extractJobRequirements(
        `Generic, representative job description for the role "${body.targetRole}". Typical responsibilities, required skills, preferred skills and technologies expected for this position in the current market.`,
        body.targetRole,
      );
      requiredSkills = [...new Set([...requirements.requiredSkills, ...requirements.preferredSkills, ...requirements.technologies])].slice(0, 20);
    }

    // 2. Deterministic matching against the resume.
    const resumeText = normalizeKeyword(text.toLowerCase());
    const tokens = new Set(resumeText.split(/[\s,;/|().]+/).filter(Boolean));
    const has = (kw: string) => {
      const n = normalizeKeyword(kw.toLowerCase());
      if (!n) return false;
      if (resumeText.includes(n)) return true;
      const parts = n.split(' ').filter((t) => t.length > 1);
      return parts.length > 1 && parts.every((t) => tokens.has(t));
    };
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    for (const s of requiredSkills) (has(s) ? matchedSkills : missingSkills).push(s);

    const currentSkills = [...new Set(Object.values(data.skills).flat())];
    const readiness = requiredSkills.length ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 0;

    // 3. AI learning plan for the gaps.
    const plan = await skillGapAnalysis({
      resumeText: text,
      currentSkills,
      requiredSkills,
      matchedSkills,
      missingSkills,
      targetRole: body.targetRole,
    });

    return ok({
      targetRole: body.targetRole,
      currentSkills,
      requiredSkills,
      matchedSkills,
      missingSkills,
      readiness,
      recommendations: plan.recommendations,
      summary: plan.summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    const aiRes = aiErrorResponse(e);
    if (aiRes) return aiRes;
    return handleError(e);
  }
}
