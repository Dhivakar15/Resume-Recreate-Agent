import 'server-only';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/api-helpers';
import { normalizeResumeData, type ResumeData } from '@/types/resume';
import { resumeToText } from '@/lib/resume-utils';

/** Loads a user-owned resume and returns sanitized data + plain text. Throws friendly ApiErrors. */
export async function loadUserResume(userId: string, resumeId: string): Promise<{ resume: { id: string; title: string; targetRole: string | null; data: string }; data: ResumeData; text: string }> {
  const resume = await db.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) throw new ApiError('Resume not found.', 404);
  let data: ResumeData;
  try {
    data = normalizeResumeData(JSON.parse(resume.data));
  } catch {
    throw new ApiError('This resume has corrupted data and cannot be processed.', 422);
  }
  const text = resumeToText(data);
  if (text.replace(/\s/g, '').length < 60) {
    throw new ApiError('This resume has too little content for AI processing. Add your summary, skills, education or experience first.', 422);
  }
  return { resume, data, text };
}

/** Standard 429 response used by AI routes. */
export function aiRateLimitResponse() {
  return new Response(JSON.stringify({ ok: false, error: 'Too many AI requests. Please wait a minute and try again.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Wraps AIError into a 503 response so the client shows a friendly retry message. */
export function aiErrorResponse(e: unknown): Response | null {
  const message = e instanceof Error ? e.message : '';
  if (message.includes('AI service') || message.includes('AI returned') || message.includes('AI could not') || message.includes('AI did not')) {
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
