import { ok, ApiError, handleError, requireUser } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TEXT_CHARS = 200_000; // guard rail for downstream AI processing

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

type Kind = 'pdf' | 'docx';

function detectKind(fileName: string, mime: string): Kind {
  const ext = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === 'docx' || mime === DOCX_MIME) return 'docx';
  throw new ApiError('Unsupported file type. Please upload a PDF or DOCX file.', 415);
}

/** Magic-byte sniffing so renamed/corrupt files are rejected with a clear message. */
function sniffKind(bytes: Uint8Array): Kind | null {
  if (bytes.length < 5) return null;
  // %PDF-
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'pdf';
  // PK\x03\x04 (DOCX is a ZIP container)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return 'docx';
  return null;
}

/** Collapse noisy whitespace from extractors while preserving paragraph breaks. */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

/** Hard ceiling so a pathological file can never hang the request until the
 *  gateway kills it with an opaque 502 — the client gets a real error instead. */
const EXTRACT_TIMEOUT_MS = 25_000;

function withTimeout<T>(task: Promise<T>, what: string): Promise<T> {
  return Promise.race([
    task,
    new Promise<never>((_, reject) =>
      setTimeout(() => new ApiError(`Reading this ${what} took too long and was cancelled. If the file is very large or image-heavy, try a smaller or text-based version.`, 422), EXTRACT_TIMEOUT_MS),
    ),
  ]);
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  try {
    const pdf = await withTimeout(getDocumentProxy(new Uint8Array(buffer)), 'PDF');
    const { text } = await withTimeout(extractText(pdf, { mergePages: true }), 'PDF');
    return Array.isArray(text) ? text.join('\n') : text;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    if (msg.includes('password') || msg.includes('encrypt')) {
      throw new ApiError('This PDF is password-protected. Please remove the password and try again.', 422);
    }
    throw new ApiError('We could not read this PDF. It may be corrupted — try re-exporting it, or upload a DOCX instead.', 422);
  }
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import('mammoth')).default;
  try {
    const { value } = await withTimeout(mammoth.extractRawText({ buffer: Buffer.from(buffer) }), 'DOCX');
    return value;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('We could not read this DOCX file. It may be corrupted — try re-saving it from Word, or upload a PDF instead.', 422);
  }
}

/**
 * POST /api/upload — accepts multipart/form-data with a `file` field
 * (PDF or DOCX, max 5 MB), extracts the resume text server-side and returns
 * it for review / AI recreation. Nothing is persisted on disk.
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

    const file = value as File;
    if (file.size === 0) {
      throw new ApiError('The selected file is empty. Please choose a valid resume file.', 422);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 5 MB.`, 413);
    }

    const fileName = file.name || 'resume';
    const declared = detectKind(fileName, file.type);
    const buffer = await file.arrayBuffer();
    const sniffed = sniffKind(new Uint8Array(buffer.slice(0, 8)));
    if (!sniffed) {
      throw new ApiError(`"${fileName}" does not look like a valid ${declared === 'pdf' ? 'PDF' : 'DOCX'} document. It may be corrupted or have the wrong extension.`, 415);
    }
    if (sniffed !== declared) {
      throw new ApiError(`This file's content is ${sniffed === 'pdf' ? 'a PDF' : 'a DOCX'} but the extension says otherwise. Please re-check the file and try again.`, 415);
    }

    const text = cleanText(declared === 'pdf' ? await extractPdf(buffer) : await extractDocx(buffer));
    if (text.replace(/\s/g, '').length < 40) {
      throw new ApiError('Almost no text could be extracted from this file. If it is a scanned/image-only PDF, please upload a text-based PDF or a DOCX instead.', 422);
    }

    return ok({
      text,
      fileName,
      characters: text.length,
      kind: declared,
      bytes: file.size,
    });
  } catch (e) {
    return handleError(e);
  }
}
