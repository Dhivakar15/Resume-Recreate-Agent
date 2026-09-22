import { db } from '@/lib/db';
import { ok, handleError, requireUser } from '@/lib/api-helpers';
import { normalizeResumeData } from '@/types/resume';
import { computeProfileCompleteness, computeQualityScore, computeResumeCompletion } from '@/lib/scores';

interface SummaryAnalysis {
  resumeId: string;
  resumeTitle: string;
  score: number;
  improvements: string[];
  keywordMatch: { matched: string[]; missing: string[] };
  generatedAt: string;
}

/**
 * GET /api/dashboard/summary — one aggregated payload powering the dashboard home:
 * scores, stats, latest AI analysis, recommendations, recent resumes + activities.
 */
export async function GET() {
  try {
    const user = await requireUser();

    const [resumes, analyses, activities, applications, coverLetters, versions, totalAnalyses] = await Promise.all([
      db.resume.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, title: true, targetRole: true, template: true, data: true, updatedAt: true,
          _count: { select: { versions: true } },
        },
      }),
      db.aIAnalysis.findMany({
        where: { resume: { userId: user.id }, type: 'ATS' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, resumeId: true, score: true, targetRole: true, result: true, createdAt: true },
      }),
      db.activity.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 8 }),
      db.application.findMany({ where: { userId: user.id }, select: { status: true, interviewDate: true } }),
      db.coverLetter.count({ where: { userId: user.id } }),
      db.resumeVersion.count({ where: { resume: { userId: user.id } } }),
      db.aIAnalysis.count({ where: { resume: { userId: user.id } } }),
    ]);

    const latestResume = resumes[0] ?? null;
    const latestData = latestResume ? normalizeResumeData(JSON.parse(latestResume.data)) : null;
    const latestAnalysis = analyses[0] ?? null;

    let analysisPayload: SummaryAnalysis | null = null;
    if (latestAnalysis) {
      try {
        const parsed = JSON.parse(latestAnalysis.result) as {
          improvements?: string[];
          keywordMatch?: { matched: string[]; missing: string[] };
        };
        const resumeTitle = resumes.find((r) => r.id === latestAnalysis.resumeId)?.title ?? 'Resume';
        analysisPayload = {
          resumeId: latestAnalysis.resumeId,
          resumeTitle,
          score: latestAnalysis.score ?? 0,
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 6) : [],
          keywordMatch: {
            matched: Array.isArray(parsed.keywordMatch?.matched) ? parsed.keywordMatch.matched.slice(0, 12) : [],
            missing: Array.isArray(parsed.keywordMatch?.missing) ? parsed.keywordMatch.missing.slice(0, 12) : [],
          },
          generatedAt: latestAnalysis.createdAt.toISOString(),
        };
      } catch {
        analysisPayload = null;
      }
    }

    // Deterministic recommendations derived from real data (no AI call — instant load).
    const recommendations: string[] = [];
    if (!latestResume) {
      recommendations.push('Create your first resume to unlock AI scores, tailoring and analytics.');
    } else if (latestData) {
      if (!latestData.summary.trim()) recommendations.push(`Add a professional summary to "${latestResume.title}" — it carries the most ATS weight after skills.`);
      const skillCount = Object.values(latestData.skills).reduce((a, arr) => a + arr.length, 0);
      if (skillCount < 8) recommendations.push('Grow your skills section to 8+ entries — keyword coverage is 25% of your ATS score.');
      const hasMetrics = /\d+\s?(%|percent|x\b|\+)|\$\s?\d|\b\d{2,}\b/.test(
        [...latestData.experience, ...latestData.internships, ...latestData.projects].map((e) => e.description).join(' '),
      );
      if (!hasMetrics) recommendations.push('Add measurable outcomes (%, numbers, scale) to your experience bullets where truthful.');
      if (!latestData.personal.linkedin.trim()) recommendations.push('Add your LinkedIn profile to your resume, then run the LinkedIn Optimizer.');
      if (analysisPayload?.improvements.length) recommendations.push(analysisPayload.improvements[0]);
      if (applications.length > 0 && interviewsScheduledCount(applications) === 0) {
        recommendations.push('No interviews scheduled yet — use Interview Prep to sharpen your answers.');
      }
      if (!analyses.length) recommendations.push('Run the AI Resume Analyzer to get your estimated ATS score and fixes.');
    }

    const now = Date.now();
    const interviewsScheduled = applications.filter((a) => a.interviewDate && new Date(a.interviewDate).getTime() >= now).length;

    return ok({
      user: { name: user.name, email: user.email, memberSince: user.createdAt.toISOString() },
      stats: {
        totalResumes: resumes.length,
        totalVersions: versions,
        totalAnalyses,
        totalApplications: applications.length,
        totalCoverLetters: coverLetters,
        activeApplications: applications.filter((a) => ['Applied', 'Shortlisted', 'Interview'].includes(a.status)).length,
        interviewsScheduled,
      },
      scores: {
        ats: latestAnalysis?.score ?? null,
        atsTargetRole: latestAnalysis?.targetRole ?? null,
        atsResumeTitle: analysisPayload?.resumeTitle ?? null,
        quality: latestData ? computeQualityScore(latestData) : null,
        qualityResumeTitle: latestResume?.title ?? null,
        completion: latestData ? computeResumeCompletion(latestData) : 0,
        profileCompleteness: latestData ? computeProfileCompleteness(latestData) : 0,
        atsHistory: analyses
          .filter((a) => a.score != null)
          .slice(0, 12)
          .reverse()
          .map((a) => ({ date: a.createdAt.toISOString(), score: a.score as number })),
      },
      latestAnalysis: analysisPayload,
      recommendations: recommendations.slice(0, 5),
      recentResumes: resumes.slice(0, 5).map((r) => ({
        id: r.id,
        title: r.title,
        targetRole: r.targetRole,
        template: r.template,
        updatedAt: r.updatedAt.toISOString(),
        versions: r._count.versions,
      })),
      activities: activities.map((a) => ({ id: a.id, type: a.type, message: a.message, createdAt: a.createdAt.toISOString() })),
    });
  } catch (e) {
    return handleError(e);
  }
}

function interviewsScheduledCount(apps: { interviewDate: Date | null }[]): number {
  const now = Date.now();
  return apps.filter((a) => a.interviewDate && new Date(a.interviewDate).getTime() >= now).length;
}
