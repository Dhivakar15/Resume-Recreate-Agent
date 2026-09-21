import { db } from '@/lib/db';
import { ok, handleError, parseBody, requireUser } from '@/lib/api-helpers';
import { applicationCreateSchema } from '@/lib/validation';
import { logActivity } from '@/lib/activity';

/** GET /api/applications — list the user's job applications, newest first. */
export async function GET() {
  try {
    const user = await requireUser();
    const applications = await db.application.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });
    return ok({ applications });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/applications — create a tracked job application. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, applicationCreateSchema);
    const application = await db.application.create({
      data: {
        userId: user.id,
        company: body.company,
        role: body.role,
        status: body.status,
        appliedDate: body.appliedDate ? new Date(body.appliedDate) : new Date(),
        interviewDate: body.interviewDate ? new Date(body.interviewDate) : null,
        notes: body.notes ?? null,
      },
    });
    await logActivity(user.id, 'application', `Application added: ${body.role} at ${body.company}`);
    return ok({ application }, 201);
  } catch (e) {
    return handleError(e);
  }
}
