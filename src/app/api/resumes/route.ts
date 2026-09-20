import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { createResumeSchema, sanitizeResumeData } from '@/lib/validation';

export async function GET() {
  try {
    const user = await requireUser();
    const resumes = await db.resume.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, title: true, targetRole: true, template: true,
        createdAt: true, updatedAt: true,
        _count: { select: { versions: true, analyses: true } },
      },
    });
    return ok({ resumes });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, createResumeSchema);
    const data = sanitizeResumeData(body.data);
    const resume = await db.resume.create({
      data: {
        userId: user.id,
        title: body.title,
        targetRole: body.targetRole ?? null,
        template: body.template ?? 'modern',
        data: JSON.stringify(data),
      },
      select: { id: true, title: true, targetRole: true, template: true, createdAt: true, updatedAt: true },
    });
    return ok({ resume }, 201);
  } catch (e) {
    return handleError(e);
  }
}
