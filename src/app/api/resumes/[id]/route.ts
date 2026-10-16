import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser, ApiError } from '@/lib/api-helpers';
import { updateResumeSchema, sanitizeResumeData } from '@/lib/validation';
import { normalizeResumeData } from '@/types/resume';

type Params = { params: Promise<{ id: string }> };

async function findOwnedResume(id: string, userId: string) {
  const resume = await db.resume.findFirst({ where: { id, userId } });
  if (!resume) throw new ApiError('Resume not found.', 404);
  return resume;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await findOwnedResume(id, user.id);
    const [versions, analyses] = await Promise.all([
      db.resumeVersion.findMany({
        where: { resumeId: resume.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, label: true, createdAt: true },
      }),
      db.aIAnalysis.findMany({
        where: { resumeId: resume.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, score: true, createdAt: true, result: true },
      }),
    ]);
    return ok({
      resume: {
        id: resume.id,
        title: resume.title,
        targetRole: resume.targetRole,
        template: resume.template,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
      data: normalizeResumeData(JSON.parse(resume.data)),
      versions,
      analyses: analyses.map((a) => ({ ...a, result: JSON.parse(a.result) })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await findOwnedResume(id, user.id);
    const body = await parseBody(req, updateResumeSchema);

    const updated = await db.resume.update({
      where: { id: resume.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.targetRole !== undefined ? { targetRole: body.targetRole || null } : {}),
        ...(body.template !== undefined ? { template: body.template } : {}),
        ...(body.data !== undefined ? { data: JSON.stringify(sanitizeResumeData(body.data)) } : {}),
      },
      select: { id: true, title: true, targetRole: true, template: true, updatedAt: true },
    });
    return ok({ resume: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await findOwnedResume(id, user.id);
    await db.resume.delete({ where: { id: resume.id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
