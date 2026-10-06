import { ok, ApiError, handleError, requireUser } from '@/lib/api-helpers';
import { parseUploadFile } from '@/lib/resume-parse';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload — accepts multipart/form-data with a `file` field
 * (PDF or DOCX, max 5 MB), extracts the resume text server-side and returns
 * it for review / AI recreation. Nothing is persisted on disk.
 *
 * NOTE: an identical handler exists at POST /api/resumes/parse. The upload
 * dialog falls back to it automatically if this route is ever unavailable.
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
