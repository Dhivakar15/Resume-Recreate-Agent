import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser, ApiError } from '@/lib/api-helpers';
import { updateCoverLetterSchema } from '@/lib/validation';

type Params = { params: Promise<{ id: string }> };

/** PUT /api/cover-letters/:id — edit saved letter content. */
export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.coverLetter.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError('Cover letter not found.', 404);
    const body = await parseBody(req, updateCoverLetterSchema);
    const letter = await db.coverLetter.update({ where: { id }, data: { content: body.content } });
    return ok({ letter: { ...letter, createdAt: letter.createdAt.toISOString(), updatedAt: letter.updatedAt.toISOString() } });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/cover-letters/:id */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.coverLetter.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError('Cover letter not found.', 404);
    await db.coverLetter.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
