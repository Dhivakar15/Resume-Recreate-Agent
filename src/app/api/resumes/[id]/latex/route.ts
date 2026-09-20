import { db } from '@/lib/db';
import { handleError, requireUser, ApiError, fail, ok } from '@/lib/api-helpers';
import { normalizeResumeData, type ResumeTemplate } from '@/types/resume';
import { generateLatex, latexFileName } from '@/lib/latex';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/resumes/:id/latex            → downloads a .tex source file
 * GET /api/resumes/:id/latex?inline=1   → JSON { tex, fileName } for view/copy UI
 */
export async function GET(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resume = await db.resume.findFirst({ where: { id, userId: user.id } });
    if (!resume) throw new ApiError('Resume not found.', 404);

    const inline = new URL(req.url).searchParams.get('inline') === '1';
    const data = normalizeResumeData(JSON.parse(resume.data));
    const template = (resume.template as ResumeTemplate) || 'modern';

    let tex: string;
    try {
      tex = generateLatex(data, template);
    } catch (e) {
      console.error('[latex] generation failed:', e);
      return fail('We could not generate the LaTeX source right now. Please try again.', 500);
    }

    if (inline) {
      return ok({ tex, fileName: latexFileName(data) });
    }

    return new Response(tex, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-tex; charset=utf-8',
        'Content-Disposition': `attachment; filename="${latexFileName(data)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
