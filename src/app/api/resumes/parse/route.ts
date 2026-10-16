import { ok, ApiError, handleError, requireUser } from '@/lib/api-helpers';
import { parseUploadFile } from '@/lib/resume-parse';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/resumes/parse — fallback twin of POST /api/upload.
 * Identical contract: multipart/form-data `file` (PDF or DOCX, max 5 MB),
 * returns { ok, data: { text, fileName, characters, kind, bytes } }.
 *
 * The upload dialog automatically falls back to this endpoint when
 * /api/upload returns 404/405, keeping resume upload resilient even if one
 * of the two route files gets wiped by the hosting platform's file sync.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`upload:${user.id}`, 12, 60_000)) {
      throw new ApiError('Too many uploads. Please wait a minute and try again.', 429);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ApiError('Invalid upload. Please submit the form as multipart/form-data.', 400);
    }

    const value = form.get('file');
    if (!value || typeof value === 'string') {
      throw new ApiError('No file was attached. Please choose a PDF or DOCX file to upload.', 400);
    }

    const parsed = await parseUploadFile(value as File);
    return ok(parsed);
  } catch (e) {
    return handleError(e);
  }
}
