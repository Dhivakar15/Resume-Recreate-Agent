import { db } from '@/lib/db';
import { handleError, requireUser, ApiError, fail } from '@/lib/api-helpers';
import { normalizeResumeData, type ResumeTemplate } from '@/types/resume';
import { generateResumePdf, pdfFileName } from '@/lib/pdf';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** GET /api/resumes/:id/pdf — real server-side PDF download. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
    if (!resume) throw new ApiError('Resume not found.', 404);

    const data = normalizeResumeData(JSON.parse(resume.data));
    const template = (resume.template as ResumeTemplate) || 'modern';

    let bytes: Uint8Array;
    try {
      bytes = await generateResumePdf(template, data);
    } catch (e) {
      console.error('[pdf] generation failed:', e);
      return fail('We could not generate your PDF right now. Please check the resume content and try again.', 500);
    }

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName(data)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
