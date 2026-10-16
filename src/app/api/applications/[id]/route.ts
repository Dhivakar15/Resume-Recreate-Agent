import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser, ApiError } from '@/lib/api-helpers';
import { applicationUpdateSchema } from '@/lib/validation';
import { logActivity } from '@/lib/activity';

type Params = { params: Promise<{ id: string }> };

/** PUT /api/applications/:id — update a tracked application. */
export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.application.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError('Application not found.', 404);
    const body = await parseBody(req, applicationUpdateSchema);

    const application = await db.application.update({
      where: { id },
      data: {
        company: body.company ?? undefined,
        role: body.role ?? undefined,
        status: body.status ?? undefined,
        appliedDate: body.appliedDate !== undefined ? (body.appliedDate ? new Date(body.appliedDate) : new Date()) : undefined,
        interviewDate: body.interviewDate !== undefined ? (body.interviewDate ? new Date(body.interviewDate) : null) : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });

    if (body.status && body.status !== existing.status) {
      await logActivity(user.id, 'application', `${application.role} @ ${application.company}: ${existing.status} → ${body.status}`);
    }
    return ok({ application });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/applications/:id */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.application.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new ApiError('Application not found.', 404);
    await db.application.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
