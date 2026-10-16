import 'server-only';
import ZAI from 'z-ai-web-dev-sdk';
import { emptyResumeData, normalizeResumeData, type JobRequirements, type ResumeData, type SkillsData } from '@/types/resume';
import type {
  CareerProfileResult,
  CoverLetterTone,
  InterviewQuestionSet,
  LinkedInResult,
  MockInterviewResult,
  ProjectDescriptionResult,
  RewriteMode,
  SkillGapRecommendation,
} from '@/types/ai-tools';

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
${RESUME_JSON_SHAPE}`;
  const user = `SOURCE RESUME CONTENT:\n"""\n${sourceText.slice(0, 20000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  // Sanitize through the same normalizer used for storage.
  const data = normalizeResumeData(parsed);
  const base = emptyResumeData();
  if (data === base) throw new AIError('The AI could not structure this resume content. Please try again or enter details manually.');
  return data;
}

// ─── Dashboard-upgrade AI functions ──────────────────────────────────────────

const RESUME_JSON_SHAPE = `{"personal":{"fullName":"","professionalTitle":"","email":"","phone":"","location":"","linkedin":"","github":"","portfolio":""},
"objective":"","summary":"",
"education":[{"id":"e1","degree":"","institution":"","location":"","startYear":"","endYear":"","score":""}],
"skills":{"languages":[],"frameworks":[],"databases":[],"tools":[],"cloud":[],"soft":[]},
"experience":[{"id":"x1","jobTitle":"","company":"","location":"","startDate":"","endDate":"","description":"line1\\nline2"}],
"internships":[{"id":"i1","title":"","company":"","duration":"","location":"","description":"","technologies":""}],
"projects":[{"id":"p1","name":"","description":"","role":"","technologies":"","githubUrl":"","liveUrl":""}],
"certifications":[{"id":"c1","name":"","organization":"","date":"","credentialUrl":""}],
"achievements":[{"id":"a1","title":"","description":""}],
"languages":[{"id":"l1","language":"","proficiency":""}]}`;

/** Person-facing prose (cover letters, LinkedIn, chat) is legitimately first-person — relax that one rule, keep the rest. */
const FIRST_PERSON_OVERRIDE = `Override for this task only: write in the candidate's natural first-person voice (I/me/my are correct here). Every other rule above still applies strictly.`;

// Small sanitizing helpers shared by the structured AI functions.
const clipText = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clampInt = (v: unknown, min: number, max: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};
const stringList = (v: unknown, max = 8, itemMax = 200): string[] =>
  Array.isArray(v) ? v.map((x) => clipText(x, itemMax)).filter(Boolean).slice(0, max) : [];

/** Strips leading bullet markers the model may add (same normalization as improveText). */
function normalizeBulletLines(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-–—•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
}

// ─── AI assistant (conversational resume coach) ──────────────────────────────

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ASSISTANT_HISTORY_LIMIT = 24;

export async function assistantReply(messages: AssistantChatMessage[], resumeText: string, userName?: string): Promise<string> {
  const system = `You are the Resume Assistant — a friendly, expert resume and career coach inside the Resume Recreate Agent AI app${userName ? `, chatting with ${userName}` : ''}.
Help with summaries, wording, ATS keywords, resume structure, interview preparation and job-search questions.
Ground every answer in the RESUME CONTENT below when it is present; when it is absent or the user asks something the resume cannot answer, say so honestly and explain what they could add.
${FACTUAL_RULES}
- The no-first-person rule applies to resume wording you draft, not to our conversation.
- Keep replies under 180 words, specific and actionable. If a request would change facts, remind the user to confirm details themselves.`;
  const convo: Msg[] = [
    { role: 'assistant', content: system },
    { role: 'assistant', content: `RESUME CONTENT (may be a note if the user has none):\n"""\n${resumeText.slice(0, 12000)}\n"""` },
    ...messages.slice(-ASSISTANT_HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }) as Msg),
  ];
  const reply = await chat(convo);
  return reply.slice(0, 4000);
}

// ─── Career profile / advisor ────────────────────────────────────────────────

export async function careerProfile(resumeText: string, targetRole?: string): Promise<CareerProfileResult> {
  const system = `You are a senior career advisor. Analyse the resume below and build a practical career plan.
Return JSON with exactly these keys:
{"summary":"2-3 sentence overview of the candidate's profile and trajectory, grounded in the resume",
"jobRoles":[{"title":"","matchScore":0,"why":""}] (3-4 realistic roles that fit this experience, best match first, matchScore integer 0-100),
"skillsInDemand":["6-10 skills employers seek for these roles"],
"skillGaps":["3-6 concrete gaps between this resume and the target roles"],
"technologies":["6-12 concrete tools/technologies evidenced by the resume or clearly expected for these roles"],
"roadmap":[{"phase":"","timeframe":"","focus":"","milestones":[""]}] (3-4 phases; timeframe like '0-3 months'; 2-4 milestones each),
"learning":[{"topic":"","resources":"","why":""}] (3-5 items; resources = real, well-known resource types such as official documentation, freeCodeCamp, Coursera — never invent a specific fake course),
"certifications":[{"name":"","provider":"","why":""}] (2-4 widely known, real certifications only),
"projectsToBuild":["3-5 portfolio project ideas that would strengthen this profile"],
"interviewTopics":["5-8 topics to prepare for interviews in these roles"]}
Keep every string under 240 characters and every list within the stated size. Base roles, gaps and scores ONLY on the resume evidence — do not invent employers, dates, titles or metrics.`;
  const user = `${roleLine(targetRole)}\n\nRESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);

  const jobRoles = (Array.isArray(parsed.jobRoles) ? parsed.jobRoles : []).slice(0, 4).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      title: clipText(item.title, 120),
      matchScore: clampInt(item.matchScore, 0, 100),
      why: clipText(item.why, 240),
    };
  }).filter((r) => r.title);

  const roadmap = (Array.isArray(parsed.roadmap) ? parsed.roadmap : []).slice(0, 4).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      phase: clipText(item.phase, 80),
      timeframe: clipText(item.timeframe, 60),
      focus: clipText(item.focus, 240),
      milestones: stringList(item.milestones, 4, 160),
    };
  }).filter((r) => r.phase);

  const learning = (Array.isArray(parsed.learning) ? parsed.learning : []).slice(0, 5).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      topic: clipText(item.topic, 120),
      resources: clipText(item.resources, 200),
      why: clipText(item.why, 240),
    };
  }).filter((r) => r.topic);

  const certifications = (Array.isArray(parsed.certifications) ? parsed.certifications : []).slice(0, 4).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      name: clipText(item.name, 160),
      provider: clipText(item.provider, 120),
      why: clipText(item.why, 240),
    };
  }).filter((r) => r.name);

  return {
    summary: clipText(parsed.summary, 800),
    jobRoles,
    skillsInDemand: stringList(parsed.skillsInDemand, 10, 120),
    skillGaps: stringList(parsed.skillGaps, 6, 160),
    technologies: stringList(parsed.technologies, 12, 80),
    roadmap,
    learning,
    certifications,
    projectsToBuild: stringList(parsed.projectsToBuild, 5, 200),
    interviewTopics: stringList(parsed.interviewTopics, 8, 160),
    generatedAt: new Date().toISOString(),
  };
}

// ─── Cover letter ────────────────────────────────────────────────────────────

export interface CoverLetterInput {
  resumeText: string;
  company: string;
  role: string;
  jobDescription?: string;
  tone: CoverLetterTone;
}

const COVER_TONE_GUIDES: Record<CoverLetterTone, string> = {
  professional: 'Confident and warm professional register — 250-350 words in 3-4 short paragraphs.',
  formal: 'Traditional formal register — 250-350 words in 3-4 short paragraphs.',
  short: 'Compact and punchy — 120-180 words in 2 short paragraphs.',
};

export async function generateCoverLetter({ resumeText, company, role, jobDescription, tone }: CoverLetterInput): Promise<{ letter: string; wordCount: number }> {
  const system = `You are an expert cover letter writer. Write a complete, ready-to-send cover letter from the candidate to the hiring team at "${company}" applying for the ${role} position.
Tone: ${COVER_TONE_GUIDES[tone]}
Structure: open with "Dear Hiring Team,", reference the role and one real strength from the resume, connect the candidate's genuine experience to the company, close with a professional sign-off and the candidate's name from the resume (or just "Sincerely," if unknown).
Use ONLY experiences, skills and achievements present in the candidate's resume${jobDescription ? ' and job description' : ''}.
${FIRST_PERSON_OVERRIDE}
${FACTUAL_RULES}
Do not invent addresses, dates, references or company details. Do not use markdown formatting.`;
  const user = `JOB DESCRIPTION:\n"""\n${(jobDescription || '(not provided — rely on the resume and the role title)').slice(0, 8000)}\n"""\n\nCANDIDATE RESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`;
  const letter = (await chat([
    { role: 'assistant', content: system },
    { role: 'user', content: user },
  ])).slice(0, 8000);
  return {
    letter,
    wordCount: letter.split(/\s+/).filter(Boolean).length,
  };
}

// ─── Interview preparation questions ─────────────────────────────────────────

export async function generateInterviewQuestions(resumeText: string, role: string): Promise<InterviewQuestionSet> {
  const system = `You are an experienced interviewer preparing a candidate for "${role}" interviews.
Generate categorized question sets grounded in the candidate's actual resume (their real projects, stack and experience) plus standard expectations for the role.
Return JSON with exactly these keys:
{"hr":["5-6 general HR/warm-up questions"],
"technical":["6-8 technical questions based on the candidate's stack and the role"],
"project":["4-6 deep-dive questions referencing the candidate's actual projects"],
"behavioral":["4-6 behavioral (STAR) questions"],
"jobSpecific":["4-6 questions specific to the ${role} role in real hiring processes"]}
Each question under 240 characters. Questions may reference the candidate's real technologies and projects, but never invent employers, metrics or experiences.`;
  const user = `TARGET ROLE: "${role}"\n\nRESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  return {
    hr: stringList(parsed.hr, 8, 240),
    technical: stringList(parsed.technical, 10, 240),
    project: stringList(parsed.project, 8, 240),
    behavioral: stringList(parsed.behavioral, 8, 240),
    jobSpecific: stringList(parsed.jobSpecific, 8, 240),
    generatedAt: new Date().toISOString(),
  };
}

// ─── LinkedIn profile optimizer ──────────────────────────────────────────────

export async function optimizeLinkedInProfile(resumeText: string): Promise<LinkedInResult> {
  const system = `You are a LinkedIn profile expert. Turn the resume below into optimized LinkedIn content.
Return JSON with exactly these keys:
{"headline":"one compelling headline, max 220 characters, style 'Role | Speciality | Value' using only real facts",
"headlineAlternatives":["3 alternative headlines with different angles"],
"about":"first-person About section, 3-5 short paragraphs (under 1100 characters), grounded in the resume",
"skills":["8-15 skills taken from the resume plus clearly adjacent ones a recruiter would search for"],
"experience":[{"title":"","description":""}] (one entry per resume experience, title = real job title, description = 2-3 first-person-friendly sentences highlighting real outcomes),
"projects":[{"name":"","description":""}] (up to 6, from the resume's real projects),
"tips":["4-6 short actionable profile tips (networking, keywords, settings)"]}
Only use facts present in the resume — never invent employers, titles, dates or metrics.
${FIRST_PERSON_OVERRIDE}
${FACTUAL_RULES}`;
  const parsed = await chatJSON<Record<string, unknown>>(system, `RESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`);

  const experience = (Array.isArray(parsed.experience) ? parsed.experience : []).slice(0, 8).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      title: clipText(item.title, 120),
      description: clipText(item.description, 1200),
    };
  }).filter((r) => r.title);

  const projects = (Array.isArray(parsed.projects) ? parsed.projects : []).slice(0, 6).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    return {
      name: clipText(item.name, 120),
      description: clipText(item.description, 800),
    };
  }).filter((r) => r.name);

  return {
    headline: clipText(parsed.headline, 220),
    headlineAlternatives: stringList(parsed.headlineAlternatives, 4, 220),
    about: clipText(parsed.about, 1200),
    skills: stringList(parsed.skills, 15, 60),
    experience,
    projects,
    tips: stringList(parsed.tips, 6, 200),
    generatedAt: new Date().toISOString(),
  };
}

// ─── Mock interview (one stateless conversational turn) ──────────────────────

export interface MockInterviewTurnInput {
  resumeText: string;
  role: string;
  question?: string;
  answer?: string;
  askedHistory?: string[];
}

const MOCK_ROUND_SIZE = 5;
const MOCK_QUESTION_TYPES = ['technical', 'project', 'behavioral', 'jobSpecific', 'hr'] as const;

export async function mockInterviewTurn({ resumeText, role, question, answer, askedHistory = [] }: MockInterviewTurnInput): Promise<MockInterviewResult> {
  const asked = askedHistory.map((q) => String(q).trim()).filter(Boolean).slice(-MOCK_ROUND_SIZE);
  const isAnswerTurn = Boolean(question && answer);
  // Deterministic round end: the 5th answer closes the interview.
  const finalTurn = isAnswerTurn && asked.length >= MOCK_ROUND_SIZE;

  const system = `You are a warm but rigorous interviewer running a ${MOCK_ROUND_SIZE}-question mock interview for the "${role}" role.
${finalTurn
    ? 'The candidate just answered the FINAL question of the round. Do not ask another question — finish=true and provide wrapUp.'
    : isAnswerTurn
      ? `The candidate just answered a question. Evaluate the answer, then ask the NEXT question (${asked.length + 1} of ${MOCK_ROUND_SIZE}) from a different angle/type than the ones already asked.`
      : 'Ask the OPENING question — a short "tell me about yourself"-style prompt tailored to the role and resume.'}
Across the round, naturally cover technical depth, the candidate's real projects, behavioral (STAR) and role-specific topics.
${FACTUAL_RULES}
- Questions must be grounded in the resume and the role; never invent employers, experiences or metrics.
- Keep every question under 320 characters.
Return JSON with exactly these keys:
{"evaluation":null or {"score":0,"feedback":"2-4 sentences assessing the answer against what the resume supports","strengths":["1-3 short points"],"improvements":["1-3 short actionable points"]},
"nextQuestion":"the next interview question, or '' when finished",
"questionType":"one of: technical, project, behavioral, jobSpecific, hr",
"finished":false,
"wrapUp":null or {"overallScore":0,"summary":"2-4 sentence honest overall assessment","finalTips":["3-4 short tips"]}}
Rules: evaluation must be null when there is no answer to assess; overallScore is your holistic 0-100 estimate of this round's performance; wrapUp must be null unless finished is true.`;

  const user = `RESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""\n\nQuestions already asked:\n${asked.length ? asked.map((q, i) => `${i + 1}. ${q}`).join('\n') : '(none — this is the opening)'}${question ? `\n\nCurrent question:\n"${question}"` : ''}${answer ? `\n\nCandidate's answer:\n"""\n${answer.slice(0, 4000)}\n"""` : ''}`;

  const parsed = await chatJSON<Record<string, unknown>>(system, user);

  let evaluation: MockInterviewResult['evaluation'] = null;
  if (isAnswerTurn && parsed.evaluation && typeof parsed.evaluation === 'object') {
    const e = parsed.evaluation as Record<string, unknown>;
    evaluation = {
      score: clampInt(e.score, 0, 100),
      feedback: clipText(e.feedback, 700),
      strengths: stringList(e.strengths, 3, 160),
      improvements: stringList(e.improvements, 3, 160),
    };
  }

  const rawNext = clipText(parsed.nextQuestion, 500);
  const finished = finalTurn;
  let nextQuestion: string | null = finished || !rawNext ? null : rawNext;
  let questionType: string | null = MOCK_QUESTION_TYPES.includes(String(parsed.questionType) as (typeof MOCK_QUESTION_TYPES)[number])
    ? String(parsed.questionType)
    : null;

  if (!isAnswerTurn && !nextQuestion) {
    throw new AIError('The AI did not return an interview question. Please try again.');
  }
  if (!finished && !nextQuestion) {
    // Keep the session flowing with a safe generic follow-up instead of failing the turn.
    nextQuestion = 'Can you walk me through a concrete example that shows this skill in practice?';
    questionType = questionType ?? 'behavioral';
  }

  let wrapUp: MockInterviewResult['wrapUp'] = null;
  if (finished) {
    const w = parsed.wrapUp && typeof parsed.wrapUp === 'object' ? (parsed.wrapUp as Record<string, unknown>) : null;
    const tips = stringList(w?.finalTips, 4, 200);
    wrapUp = {
      overallScore: clampInt(w?.overallScore ?? evaluation?.score ?? 0, 0, 100),
      summary: clipText(w?.summary ?? evaluation?.feedback ?? 'Interview complete — review the feedback above.', 900),
      finalTips: tips.length ? tips : (evaluation?.improvements ?? []).slice(0, 3),
    };
  }

  return {
    evaluation,
    nextQuestion,
    questionType,
    questionNumber: asked.length + 1,
    finished,
    wrapUp,
  };
}

// ─── Job-description optimizer (targeted copy of a full resume) ──────────────

export async function optimizeResumeForJob(data: ResumeData, requirements: JobRequirements): Promise<{ optimized: ResumeData; changes: string[] }> {
  const system = `You are an expert resume writer tailoring a resume to a specific job.
Rewrite the resume JSON below so it reads as the strongest HONEST match for the job requirements:
- Rewrite the summary/objective to align with the role, using only real facts from the resume.
- Rephrase and reorder experience/internship/project bullets to surface relevance to the requirements; keep every real fact, employer and date; strengthen verbs.
- Promote genuinely-held skills that match the requirements; NEVER add skills, tools or metrics the resume does not already show.
- Keep the candidate's personal contact details exactly as provided.
${FACTUAL_RULES}
- Bullet descriptions: one bullet per line, strong action verbs, no leading dashes.
- If a section has no information, return an empty array or "".
Respond with JSON exactly:
{"optimized":${RESUME_JSON_SHAPE},
"changes":["one short line per meaningful change, max 10"]}`;
  const user = `JOB REQUIREMENTS:\n${JSON.stringify(requirements, null, 1)}\n\nCURRENT RESUME JSON:\n${JSON.stringify(data).slice(0, 20000)}`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);

  const optimized = normalizeResumeData(parsed.optimized ?? parsed);
  const base = emptyResumeData();
  if (optimized === base) throw new AIError('The AI could not optimize this resume. Please try again.');

  const changes = stringList(parsed.changes, 10, 220);
  return { optimized, changes: changes.length ? changes : ['Reworded content to align with the job requirements.'] };
}

// ─── Project description generator ───────────────────────────────────────────

export async function generateProjectDescription(name: string, idea: string, targetRole?: string): Promise<ProjectDescriptionResult> {
  const system = `You are a senior engineer and resume mentor. Turn the project idea below into resume-ready content for the candidate.
Return JSON with exactly these keys:
{"overview":"2-4 sentence project overview suitable for a resume (no first-person pronouns)",
"technologies":["4-8 technologies that fit this idea well"],
"responsibilities":["3-5 bullets describing what the candidate builds/owns in this project"],
"features":["4-6 concrete, demoable features"],
"bullets":["3-5 resume bullet lines: strong action verbs, one line each, no leading dashes, no invented metrics"],
"interviewExplanation":"3-5 sentences coaching the candidate on how to explain this project in an interview"}
Keep every string under 400 characters and every list within the stated size. Technologies should genuinely suit the idea — the candidate must only keep the ones they actually use. Never present the project as already existing at a company.`;
  const user = `Project name: "${name}"\nIdea:\n"""\n${idea.slice(0, 3000)}\n"""\n${roleLine(targetRole)}`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  return {
    overview: clipText(parsed.overview, 1000),
    technologies: stringList(parsed.technologies, 8, 60),
    responsibilities: stringList(parsed.responsibilities, 5, 300).map(normalizeBulletLines),
    features: stringList(parsed.features, 6, 240),
    bullets: stringList(parsed.bullets, 5, 300).map(normalizeBulletLines),
    interviewExplanation: clipText(parsed.interviewExplanation, 1200),
    generatedAt: new Date().toISOString(),
  };
}

// ─── Section rewriter (3 variants in one mode) ───────────────────────────────

const REWRITE_MODE_INSTRUCTIONS: Record<RewriteMode, string> = {
  rewrite: 'Fresh professional rewording — same facts, new phrasing.',
  improve: 'Stronger, sharper wording without losing any facts.',
  professional: 'Corporate polish — formal, confident professional register.',
  concise: 'Trim filler and redundancy without losing any facts.',
  'action-verbs': 'Start every line with a strong action verb.',
  ats: 'Make it ATS-friendly — keyword-rich, parseable, standard industry phrasing using only keywords genuinely present in the input or resume context.',
  quantify: 'Surface the measurable impact using ONLY numbers or metrics present in the input or resume context — never invent figures.',
  grammar: 'Correct grammar and spelling with minimal other changes.',
};

export async function rewriteSectionVariants(text: string, mode: RewriteMode, targetRole?: string, context?: string): Promise<string[]> {
  const system = `You are an expert resume writer. Produce 3 DISTINCT rewrites of the text below in the mode "${mode}" — ${REWRITE_MODE_INSTRUCTIONS[mode]}
${roleLine(targetRole)}
${FACTUAL_RULES}
Additional rules:
- Keep the same meaning and only real facts — never add employers, skills, tools, dates or metrics.
- Preserve the input's line structure when it is bullet points (one bullet per line).
- The 3 variants must differ in wording, not in facts.
Respond with JSON: {"variants":["variant 1","variant 2","variant 3"]}`;
  const user = `${context ? `Resume context (for grounding only):\n"""\n${context.slice(0, 2500)}\n"""\n\n` : ''}Text to rewrite:\n"""\n${text.slice(0, 4000)}\n"""`;
  const parsed = await chatJSON<{ variants?: unknown }>(system, user);
  const variants = stringList(parsed.variants, 3, 3000).map(normalizeBulletLines).filter(Boolean);
  if (!variants.length) throw new AIError('The AI returned no usable rewrites. Please try again.');
  return variants;
}

// ─── Skill gap learning plan ─────────────────────────────────────────────────

export interface SkillGapPlanInput {
  resumeText: string;
  currentSkills: string[];
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  targetRole: string;
}

const SKILL_PRIORITIES = ['high', 'medium', 'low'] as const;

export async function skillGapAnalysis({ resumeText, currentSkills, requiredSkills, matchedSkills, missingSkills, targetRole }: SkillGapPlanInput): Promise<{ recommendations: SkillGapRecommendation[]; summary: string }> {
  const system = `You are a technical career coach creating a learning plan for a candidate's skill gaps.
Return JSON with exactly these keys:
{"summary":"2-3 sentence overview of the candidate's readiness and the biggest gaps, grounded in their real resume",
"recommendations":[{"skill":"","reason":"","priority":"high|medium|low","learningSteps":["2-4 concrete steps, each under 120 characters"]}]}
Rules:
- Build recommendations ONLY from the missing-skills list provided (max 6, highest-impact first). If that list is empty, return [].
- "skill" must match the missing skill exactly; "reason" connects it to the target role or job description.
- learningSteps use real, well-known resource types (official docs, tutorials, building a small project) — never fake course names.
- Do not invent experience, employers or metrics.`;
  const user = `TARGET ROLE: "${targetRole}"\n\nCurrent skills: ${JSON.stringify(currentSkills.slice(0, 40))}\nRequired skills: ${JSON.stringify(requiredSkills.slice(0, 25))}\nMatched skills: ${JSON.stringify(matchedSkills.slice(0, 25))}\nMissing skills: ${JSON.stringify(missingSkills.slice(0, 25))}\n\nRESUME:\n"""\n${resumeText.slice(0, 8000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);

  const priorities = SKILL_PRIORITIES as readonly string[];
  const recommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : []).slice(0, 6).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const priority = clipText(item.priority, 10).toLowerCase();
    return {
      skill: clipText(item.skill, 80),
      reason: clipText(item.reason, 300),
      priority: (priorities.includes(priority) ? priority : 'medium') as SkillGapRecommendation['priority'],
      learningSteps: stringList(item.learningSteps, 4, 160),
    };
  }).filter((r) => r.skill);

  return {
    recommendations,
    summary: clipText(parsed.summary, 900),
  };
}
