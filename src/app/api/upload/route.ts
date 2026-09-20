import { handleError, fail, ok, requireUser } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const EXT = /\.(pdf|docx)$/i;

/**
 * POST /api/upload — multipart/form-data with a `file` field (PDF or DOCX).
 * Extracts plain text server-side. Never stores the file itself.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!rateLimit(`upload:${user.id}`, 12, 60_000)) {
      return fail('Too many uploads. Please wait a moment and try again.', 429);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail('Invalid upload. Please attach a PDF or DOCX file.', 400);
    }

    const file = form.get('file');
    if (!(file instanceof File)) return fail('No file attached. Please choose a PDF or DOCX resume file.', 400);
    if (file.size === 0) return fail('The selected file is empty.', 400);
    if (file.size > MAX_SIZE) return fail('File is too large. Maximum allowed size is 5 MB.', 413);
    if (!ALLOWED.has(file.type) && !EXT.test(file.name)) {
      return fail('Unsupported file type. Please upload a PDF or DOCX file.', 415);
    }

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (isPdf) {
      const { extractText, getDocumentProxy } = await import('unpdf');
      try {
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const result = await extractText(pdf, { mergePages: true });
        text = result.text;
      } catch (e) {
        console.error('[upload] pdf parse failed:', e);
        return fail('We could not read this PDF. It may be corrupted, password-protected, or a scanned image. Try a text-based PDF or a DOCX file.', 422);
      }
    } else {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch (e) {
        console.error('[upload] docx parse failed:', e);
        return fail('We could not read this DOCX file. Please make sure it is a valid Word document.', 422);
      }
    }

    text = text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length < 50) {
      return fail('We could only extract very little text from this file — it may be a scanned image. Please upload a text-based resume.', 422);
    }

    return ok({ text: text.slice(0, 30000), fileName: file.name, characters: text.length });
  } catch (e) {
    return handleError(e);
  }
}
