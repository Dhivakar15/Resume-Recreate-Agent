import 'server-only';
import ZAI from 'z-ai-web-dev-sdk';
import { emptyResumeData, normalizeResumeData, type JobRequirements, type ResumeData, type SkillsData } from '@/types/resume';

/**
 * AI service layer. All provider details live behind this module — route
 * handlers never talk to the SDK directly. The SDK is configured through
 * environment variables (see .env.example) and must NEVER be imported
 * from client code.
 */

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

let cachedClient: ZAI | null = null;

async function getClient(): Promise<ZAI> {
  try {
    if (!cachedClient) cachedClient = await ZAI.create();
    return cachedClient;
  } catch (e) {
    console.error('[ai] failed to initialise AI client:', e);
    throw new AIError('The AI service is not configured or unreachable. Please verify the AI API settings and try again.');
  }
}

type Msg = { role: 'assistant' | 'user'; content: string };

async function chat(messages: Msg[]): Promise<string> {
  const zai = await getClient();
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });
      const content = completion.choices[0]?.message?.content;
      if (!content || !content.trim()) throw new AIError('The AI service returned an empty response.');
      return content.trim();
    } catch (e) {
      lastErr = e;
      if (e instanceof AIError && e.message.includes('empty response')) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
    }
  }
  console.error('[ai] chat failed:', lastErr);
  throw new AIError('The AI service is currently unavailable. Please try again in a moment.');
}

/** Extracts the first JSON value from a model response (handles fences & prose). */
function extractJSON(raw: string): unknown | null {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const starts = [s.indexOf('{'), s.indexOf('[')].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const openChar = s[start];
  const closeChar = openChar === '{' ? '}' : ']';
  const end = s.lastIndexOf(closeChar);
  if (end <= start) return null;
  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/** Chat that must return JSON; retries once with a stricter instruction. */
export async function chatJSON<T>(system: string, user: string): Promise<T> {
  const base: Msg[] = [
    { role: 'assistant', content: `${system}\n\nAlways respond with valid minified JSON only — no prose, no markdown fences.` },
    { role: 'user', content: user },
  ];
  let lastRaw = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: Msg[] = attempt === 0 ? base : [...base, { role: 'user', content: 'Your previous reply was not valid JSON. Respond again with valid JSON only.' }];
    lastRaw = await chat(messages);
    const parsed = extractJSON(lastRaw);
    if (parsed !== null) return parsed as T;
  }
  console.error('[ai] unparseable JSON response:', lastRaw.slice(0, 500));
  throw new AIError('The AI returned an unreadable response. Please try again.');
}

// ─── Shared prompt rules ─────────────────────────────────────────────────────

const FACTUAL_RULES = `CRITICAL RULES:
- Use ONLY facts, numbers, technologies and achievements present in the user's input.
- NEVER invent employers, job titles, dates, metrics, tools, skills or accomplishments.
- If a detail is unknown, simply do not mention it — do not fabricate it.
- Do not use first-person pronouns (I, me, my).
- Do not output markdown formatting.`;

function roleLine(targetRole?: string): string {
  return targetRole ? `The resume targets the role: "${targetRole}". Tailor the wording (not the facts) toward this role.` : '';
}

// ─── Public AI functions ─────────────────────────────────────────────────────

export type ImproveKind = 'summary' | 'objective' | 'experience' | 'internship' | 'project' | 'achievement';

const KIND_PROMPTS: Record<ImproveKind, string> = {
  summary: `Rewrite the user's professional summary for a resume. Produce 2-4 concise sentences in a single paragraph. Start with a strong descriptor of their profile, mention their stack/domain, and one concrete strength or outcome they mention.`,
  objective: `Rewrite the user's career objective for a resume. Produce 2-3 concise sentences in a single paragraph focused on what they bring and the direction they want, grounded in their real input.`,
  experience: `Rewrite the user's work experience description as professional resume bullet points. Return 2-5 lines, one bullet per line, each starting with a strong past-tense action verb, no leading dashes or numbers. Follow each bullet with what it achieved when the input supports it.`,
  internship: `Rewrite the user's internship description as professional resume bullet points. Return 2-4 lines, one bullet per line, each starting with a strong action verb, no leading dashes or numbers.`,
  project: `Rewrite the user's project description as professional resume bullet points. Return 2-4 lines, one bullet per line, each starting with a strong action verb, no leading dashes or numbers. Mention the technologies the user listed, in natural sentences.`,
  achievement: `Rewrite the user's achievement as a single crisp professional resume bullet line (max 2 lines). Keep it factual and impactful.`,
};

export async function improveText(kind: ImproveKind, text: string, targetRole?: string, context?: string): Promise<string> {
  const system = `You are an expert resume writer for ATS-friendly resumes. ${KIND_PROMPTS[kind]}\n${roleLine(targetRole)}\n${FACTUAL_RULES}`;
  const user = `${context ? `Context about the candidate:\n${context}\n\n` : ''}Text to improve:\n"""\n${text}\n"""`;
  const result = await chat([
    { role: 'assistant', content: system },
    { role: 'user', content: user },
  ]);
  // Normalise bullets: strip leading markers the model may add anyway.
  return result
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-–—•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
}

export interface SkillSuggestions extends SkillsData {
  note: string;
}

export async function suggestSkills(targetRole?: string, context?: string): Promise<SkillSuggestions> {
  const system = `You are a technical career coach. Suggest relevant skills for a resume based on the candidate's context and target role.
Rules:
- Only suggest skills that are clearly standard/expected for this target role or directly evidenced by the candidate's context.
- Prefer skills the candidate seems close to (adjacent tools, natural next steps). Do not invent exotic expertise.
- 3 to 7 items per category, each 1-3 words. Categories may be empty if nothing fits.
- "soft" = soft skills (e.g. Teamwork, Communication).
Respond with JSON: {"languages":[],"frameworks":[],"databases":[],"tools":[],"cloud":[],"soft":[],"note":"one short sentence explaining the basis of these suggestions"}`;
  const user = `Target role: ${targetRole || 'not specified'}\n\nCandidate context (resume content):\n"""\n${context || '(empty — base suggestions on the target role only)'}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 8) : []);
  return {
    languages: list(parsed.languages),
    frameworks: list(parsed.frameworks),
    databases: list(parsed.databases),
    tools: list(parsed.tools),
    cloud: list(parsed.cloud),
    soft: list(parsed.soft),
    note: typeof parsed.note === 'string' ? parsed.note : '',
  };
}

export interface ResumeFeedback {
  keywords: string[];
  strengths: string[];
  improvements: string[];
  formatting: string[];
  recommendations: string[];
}

/** AI part of the ATS analysis: keywords + qualitative feedback. Score is computed deterministically elsewhere. */
export async function analyzeResumeContent(resumeText: string, targetRole: string): Promise<ResumeFeedback> {
  const system = `You are an ATS (Applicant Tracking System) and resume expert. Analyse the resume below against the target role.
Return JSON with exactly these keys:
{"keywords":["10-20 concrete technical skills/tools/methods a hiring manager for this role would scan for, ranked by importance"],
"strengths":["3-5 short specific strengths of this resume"],
"improvements":["3-6 short actionable content improvements (never suggest adding fake experience)"],
"formatting":["2-4 formatting suggestions for ATS readability"],
"recommendations":["2-4 job-specific recommendations for this target role"]}
Keep every item under 160 characters. Do not invent facts about the candidate.`;
  const user = `Target role: "${targetRole}"\n\nRESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  const list = (v: unknown, max = 8) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  return {
    keywords: list(parsed.keywords, 20),
    strengths: list(parsed.strengths, 6),
    improvements: list(parsed.improvements, 8),
    formatting: list(parsed.formatting, 6),
    recommendations: list(parsed.recommendations, 6),
  };
}

export async function extractJobRequirements(jdText: string, title?: string): Promise<JobRequirements> {
  const system = `You are an expert technical recruiter. Extract structured requirements from the job description below.
Return JSON with exactly these keys (use [] when something is absent, "" for unknown text):
{"title":"job title if stated, else best guess from the description",
"requiredSkills":["must-have skills, max 12"],
"preferredSkills":["nice-to-have skills, max 10"],
"technologies":["concrete technologies/tools/platforms mentioned, max 15"],
"responsibilities":["key responsibilities, max 8, each under 120 chars"],
"keywords":["10-20 ATS keywords/aliases a resume could legitimately contain (e.g. 'REST APIs','CI/CD')"],
"education":"education requirement as stated, or ''",
"experienceYears":"experience requirement as stated (e.g. '2+ years'), or ''"}
Only include what is actually in the description. Do not add requirements that are not mentioned.`;
  const user = `${title ? `Job posting title: "${title}"\n\n` : ''}JOB DESCRIPTION:\n"""\n${jdText.slice(0, 15000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  const list = (v: unknown, max = 15) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  return {
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 120) : title?.trim() || 'Target Position',
    requiredSkills: list(parsed.requiredSkills, 12),
    preferredSkills: list(parsed.preferredSkills, 10),
    technologies: list(parsed.technologies, 15),
    responsibilities: list(parsed.responsibilities, 8),
    keywords: list(parsed.keywords, 20),
    education: typeof parsed.education === 'string' ? parsed.education.slice(0, 300) : '',
    experienceYears: typeof parsed.experienceYears === 'string' ? parsed.experienceYears.slice(0, 120) : '',
  };
}

export interface JobMatchSuggestions {
  suggestedKeywords: string[];
  suggestions: string[];
}

/** AI suggestions for closing the gap between a resume and a job description. */
export async function jobMatchSuggestions(resumeText: string, requirements: JobRequirements): Promise<JobMatchSuggestions> {
  const system = `You are a career coach comparing a candidate's resume with a job description.
Given the extracted job requirements and the resume, return JSON:
{"suggestedKeywords":["6-12 keywords/phrases from the job description that the candidate could legitimately work into their resume IF they genuinely have that experience — alias terms that ATS scans for (e.g. 'REST' vs 'RESTful APIs')"],
"suggestions":["4-6 specific, honest suggestions to better align the resume with this job. Never tell the candidate to claim skills or experience they do not have."]}
Each item under 180 characters.`;
  const user = `JOB REQUIREMENTS:\n${JSON.stringify(requirements, null, 1)}\n\nRESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  const list = (v: unknown, max = 12) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  return {
    suggestedKeywords: list(parsed.suggestedKeywords),
    suggestions: list(parsed.suggestions, 8),
  };
}

/**
 * Recreates a resume: reorganizes raw resume content (or an existing ResumeData)
 * into the structured schema with professionally improved wording.
 * Factual information is preserved; nothing is invented.
 */
export async function recreateResume(sourceText: string, targetRole?: string): Promise<ResumeData> {
  const system = `You are an expert resume writer. Your task: RECREATE a resume from the source text below into a structured JSON format.

Steps: understand the information, organize sections, improve wording, remove repetition, create professional bullet points, and optimize keywords for the target role.

${roleLine(targetRole)}

${FACTUAL_RULES}
Additional rules:
- Bullet descriptions: one bullet per line, strong action verbs, no leading dashes.
- If a section has no information in the source, return an empty array or "".
- Keep the candidate's real contact details exactly as provided (empty string if unknown).
- The summary should be 2-4 sentences grounded in the candidate's real experience.

Respond with JSON exactly matching this shape:
{"personal":{"fullName":"","professionalTitle":"","email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""},
"objective":"","summary":"",
"education":[{"id":"e1","degree":"","institution":"","location":"","startYear":"","endYear":"","score":""}],
"skills":{"languages":[],"frameworks":[],"databases":[],"tools":[],"cloud":[],"soft":[]},
"experience":[{"id":"x1","jobTitle":"","company":"","location":"","startDate":"","endDate":"","description":"line1\\nline2"}],
"internships":[{"id":"i1","title":"","company":"","duration":"","location":"","description":"","technologies":""}],
"projects":[{"id":"p1","name":"","description":"","role":"","technologies":"","githubUrl":"","liveUrl":""}],
"certifications":[{"id":"c1","name":"","organization":"","date":"","credentialUrl":""}],
"achievements":[{"id":"a1","title":"","description":""}],
"languages":[{"id":"l1","language":"","proficiency":""}]}`;
  const user = `SOURCE RESUME CONTENT:\n"""\n${sourceText.slice(0, 20000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  // Sanitize through the same normalizer used for storage.
  const data = normalizeResumeData(parsed);
  const base = emptyResumeData();
  if (data === base) throw new AIError('The AI could not structure this resume content. Please try again or enter details manually.');
  return data;
}
