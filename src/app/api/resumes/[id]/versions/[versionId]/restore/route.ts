import { db } from '@/lib/db';
import { ok, handleError, requireUser, ApiError } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string; versionId: string }> };

/** POST /api/resumes/:id/versions/:versionId/restore — restore a saved version. */
export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id, versionId } = await params;
    const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
    if (!resume) throw new ApiError('Resume not found.', 404);

    const version = await db.resumeVersion.findFirst({
      where: { id: versionId, resumeId: resume.id },
    });
    if (!version) throw new ApiError('Version not found.', 404);

    const updated = await db.resume.update({
      where: { id: resume.id },
      data: { data: version.data },
      select: { id: true, updatedAt: true },
    });
    return ok({ restored: true, resume: updated });
  } catch (e) {
    return handleError(e);
  }
}
