import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { saveCoverLetterSchema } from '@/lib/validation';
import { logActivity } from '@/lib/activity';

/** GET /api/cover-letters — list saved cover letters. */
export async function GET() {
  try {
    const user = await requireUser();
    const letters = await db.coverLetter.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { resume: { select: { title: true } } },
    });
    return ok({
      letters: letters.map((l) => ({
        id: l.id,
        company: l.company,
        role: l.role,
        tone: l.tone,
        content: l.content,
        resumeId: l.resumeId,
        resumeTitle: l.resume?.title ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/cover-letters — save a generated cover letter. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, saveCoverLetterSchema);
    let resumeId: string | null = null;
    if (body.resumeId) {
      const resume = await db.resume.findFirst({ where: { id: body.resumeId, userId: user.id }, select: { id: true } });
      resumeId = resume?.id ?? null;
    }
    const letter = await db.coverLetter.create({
      data: { userId: user.id, resumeId, company: body.company, role: body.role, tone: body.tone, content: body.content },
    });
    await logActivity(user.id, 'cover_letter', `Cover letter for ${body.role} @ ${body.company} saved`);
    return ok({ letter: { ...letter, resumeTitle: null, createdAt: letter.createdAt.toISOString(), updatedAt: letter.updatedAt.toISOString() } }, 201);
  } catch (e) {
    return handleError(e);
  }
}
