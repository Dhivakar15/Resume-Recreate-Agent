import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { markNotificationsSchema } from '@/lib/validation';
import { normalizeResumeData } from '@/types/resume';
import { computeResumeCompletion } from '@/lib/scores';

/**
 * GET /api/notifications — stored notifications plus freshly generated,
 * de-duplicated dynamic ones (missing info, low completion, upcoming interviews).
 */
export async function GET() {
  try {
    const user = await requireUser();

    const [resumes, applications, stored] = await Promise.all([
      db.resume.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, data: true, updatedAt: true },
      }),
      db.application.findMany({ where: { userId: user.id }, select: { company: true, role: true, interviewDate: true } }),
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);

    // ── Generate dynamic notifications (persisted, de-duplicated by title) ──
    const pending: { type: string; title: string; body: string }[] = [];

    const latest = resumes[0];
    if (latest) {
      try {
        const data = normalizeResumeData(JSON.parse(latest.data));
        const completion = computeResumeCompletion(data);
        if (completion < 60) {
          pending.push({
            type: 'missing_info',
            title: `“${latest.title}” is only ${completion}% complete`,
            body: 'Fill in your summary, skills and experience to raise your ATS score.',
          });
        }
        if (!data.summary.trim()) {
          pending.push({ type: 'suggestion', title: 'Add a professional summary', body: `Your latest resume “${latest.title}” is missing a summary — it carries major ATS weight.` });
        }
        const skillCount = Object.values(data.skills).reduce((a, arr) => a + arr.length, 0);
        if (skillCount < 8) {
          pending.push({ type: 'suggestion', title: 'Grow your skills section', body: 'Only a few skills detected. Aim for 8+ — keyword coverage drives 25% of your ATS score.' });
        }
      } catch {
        /* ignore malformed data */
      }
    } else {
      pending.push({ type: 'suggestion', title: 'Create your first resume', body: 'You have no resumes yet — start with the AI Builder or upload an existing one.' });
    }

    const soon = Date.now() + 3 * 24 * 60 * 60 * 1000;
    for (const app of applications) {
      if (app.interviewDate) {
        const t = new Date(app.interviewDate).getTime();
        if (t >= Date.now() && t <= soon) {
          pending.push({
            type: 'application_reminder',
            title: `Interview at ${app.company}`,
            body: `Your ${app.role} interview is on ${new Date(app.interviewDate).toLocaleDateString()}. Review Interview Prep questions.`,
          });
        }
      }
    }

    const existingTitles = new Set(stored.map((n) => n.title));
    const fresh = pending.filter((p) => !existingTitles.has(p.title));
    if (fresh.length) {
      await db.notification.createMany({ data: fresh.map((f) => ({ ...f, userId: user.id })) });
    }

    const notifications = fresh.length
      ? await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 })
      : stored;

    return ok({
      notifications: notifications.map((n) => ({
        id: n.id, type: n.type, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt.toISOString(),
      })),
      unread: notifications.filter((n) => !n.read).length,
    });
  } catch (e) {
    return handleError(e);
  }
}

/** PATCH /api/notifications — mark all (or specific ids) as read. */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, markNotificationsSchema);
    if (body.all || !body.ids?.length) {
      await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    } else {
      await db.notification.updateMany({ where: { userId: user.id, id: { in: body.ids } }, data: { read: true } });
    }
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
