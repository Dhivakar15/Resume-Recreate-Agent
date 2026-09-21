import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser, ApiError } from '@/lib/api-helpers';
import { saveVersionSchema } from '@/lib/validation';
import { logActivity } from '@/lib/activity';

type Params = { params: Promise<{ id: string }> };

/** GET /api/resumes/:id/versions — list saved versions. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await db.resume.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!resume) throw new ApiError('Resume not found.', 404);
    const versions = await db.resumeVersion.findMany({
      where: { resumeId: resume.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, label: true, createdAt: true, data: true },
    });
    return ok({ versions });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/resumes/:id/versions — snapshot the current resume data as a named version. */
export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
    if (!resume) throw new ApiError('Resume not found.', 404);
    const body = await parseBody(req, saveVersionSchema);

    const count = await db.resumeVersion.count({ where: { resumeId: resume.id } });
    const version = await db.resumeVersion.create({
      data: {
        resumeId: resume.id,
        label: body.label ?? `Version ${count + 1}`,
        data: resume.data,
      },
      select: { id: true, label: true, createdAt: true },
    });
    await logActivity(user.id, 'version_saved', `Saved version "${version.label}" of "${resume.title}"`);
    return ok({ version }, 201);
  } catch (e) {
    return handleError(e);
  }
}
