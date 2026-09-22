import { db } from '@/lib/db';
import { ok, handleError, requireUser, ApiError } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

/** POST /api/resumes/:id/duplicate — creates a full copy of the resume. */
export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
    if (!resume) throw new ApiError('Resume not found.', 404);

    const copy = await db.resume.create({
      data: {
        userId: user.id,
        title: `${resume.title} (Copy)`.slice(0, 120),
        targetRole: resume.targetRole,
        template: resume.template,
        data: resume.data,
      },
      select: {
        id: true, title: true, targetRole: true, template: true,
        createdAt: true, updatedAt: true,
        _count: { select: { versions: true, analyses: true } },
      },
    });
    return ok({ resume: copy }, 201);
  } catch (e) {
    return handleError(e);
  }
}
