import { db } from '@/lib/db';
import { ok, handleError, requireUser } from '@/lib/api-helpers';
import { normalizeResumeData, SKILL_CATEGORIES } from '@/types/resume';
import { computeResumeCompletion } from '@/lib/scores';

/** GET /api/analytics — score history, totals, status breakdown, skills progress, monthly activity. */
export async function GET() {
  try {
    const user = await requireUser();

    const [analyses, resumes, applications, versions, coverLetters] = await Promise.all([
      db.aIAnalysis.findMany({
        where: { resume: { userId: user.id }, score: { not: null } },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { id: true, score: true, type: true, targetRole: true, createdAt: true, resume: { select: { title: true } } },
      }),
      db.resume.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 12,
        select: { id: true, title: true, data: true, createdAt: true, updatedAt: true },
      }),
      db.application.findMany({ where: { userId: user.id }, select: { status: true } }),
      db.resumeVersion.count({ where: { resume: { userId: user.id } } }),
      db.coverLetter.count({ where: { userId: user.id } }),
    ]);

    const scoreHistory = analyses.map((a) => ({
      date: a.createdAt.toISOString(),
      score: a.score as number,
      resumeTitle: a.resume.title,
      targetRole: a.targetRole,
      type: a.type,
    }));

    const first = scoreHistory[0]?.score ?? null;
    const latest = scoreHistory[scoreHistory.length - 1]?.score ?? null;

    const latestResume = resumes[0] ?? null;
    let skillsByCategory: { category: string; count: number }[] = [];
    let completion = 0;
    if (latestResume) {
      try {
        const data = normalizeResumeData(JSON.parse(latestResume.data));
        skillsByCategory = SKILL_CATEGORIES.map((c) => ({ category: c.label, count: data.skills[c.key].length }));
        completion = computeResumeCompletion(data);
      } catch {
        /* ignore */
      }
    }

    // Monthly activity for the last 6 months (analyses + new resumes).
    const months: { month: string; analyses: number; resumes: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      months.push({
        month: label,
        analyses: analyses.filter((a) => a.createdAt >= d && a.createdAt < next).length,
        resumes: resumes.filter((r) => r.createdAt >= d && r.createdAt < next).length,
      });
    }

    const STATUSES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
    return ok({
      scoreHistory,
      totals: { resumes: resumes.length, versions, analyses: analyses.length, applications: applications.length, coverLetters },
      applicationsByStatus: STATUSES.map((status) => ({ status, count: applications.filter((a) => a.status === status).length })),
      scoreChange: { first, latest, delta: first != null && latest != null ? latest - first : null },
      skillsByCategory,
      activityByMonth: months,
      completion,
    });
  } catch (e) {
    return handleError(e);
  }
}
