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

// ─── feat-9 platform AI functions ────────────────────────────────────────────

import type {
  CareerProfileResult,
  LinkedInResult,
  ProjectDescriptionResult,
  RewriteMode,
  SkillGapRecommendation,
} from '@/types/ai-tools';
import type { CertificationItem, LearningItem, RoadmapStep } from '@/types/ai-tools';

const MODE_PROMPTS: Record<RewriteMode, string> = {
  rewrite: 'Produce a fresh, professionally reworded version of the text.',
  improve: 'Improve the text: stronger wording, clearer impact, better flow.',
  professional: 'Rewrite the text in a polished, corporate-professional tone.',
  concise: 'Make the text noticeably more concise while keeping every real fact.',
  'action-verbs': 'Rewrite so each line starts with a strong past-tense action verb (no leading dashes).',
  ats: 'Rewrite to be ATS-friendly: standard terminology, relevant keyword phrasing from the input, no fancy wording, clean structure.',
  quantify: 'Rewrite emphasizing measurable impact. Only use numbers/scales that already appear in the text — never invent metrics.',
  grammar: 'Correct grammar, spelling and punctuation only. Preserve meaning and wording as much as possible.',
};

/** Rewriter: 3 alternative versions of a resume section in one call. */
export async function rewriteSectionVariants(
  text: string,
  mode: RewriteMode,
  targetRole?: string,
  context?: string,
): Promise<string[]> {
  const system = `You are an expert resume writer. ${MODE_PROMPTS[mode]}
Return JSON: {"variants":["variant 1","variant 2","variant 3"]}
Each variant is a complete, ready-to-paste replacement for the text. For bullet-style text return one bullet per line separated by \\n, no leading dashes/numbers. 3 distinct variants, each 1-6 lines.
${roleLine(targetRole)}
${FACTUAL_RULES}`;
  const user = `${context ? `Context about the candidate:\n${context}\n\n` : ''}Text to rewrite:\n"""\n${text}\n"""`;
  const parsed = await chatJSON<{ variants?: unknown }>(system, user);
  const variants = Array.isArray(parsed.variants)
    ? parsed.variants.map((v) => String(v).trim()).filter(Boolean).slice(0, 3)
    : [];
  if (!variants.length) throw new AIError('The AI did not return any rewrites. Please try again.');
  return variants.map((v) =>
    v
      .split('\n')
      .map((l) => l.replace(/^\s*(?:[-–—•*]|\d+[.)])\s*/, '').trim())
      .filter(Boolean)
      .join('\n'),
  );
}

/** Cover letter generator. */
export async function generateCoverLetter(input: {
  resumeText: string;
  company: string;
  role: string;
  jobDescription?: string;
  tone: 'professional' | 'formal' | 'short';
}): Promise<{ letter: string; wordCount: number }> {
  const toneLine =
    input.tone === 'short'
      ? 'Keep it SHORT: 3 short paragraphs, under 180 words total.'
      : input.tone === 'formal'
        ? 'Use a formal, traditional business-letter register. 3-4 paragraphs, under 320 words.'
        : 'Professional and confident. 3-4 paragraphs, under 300 words.';
  const system = `You are an expert career writer. Write a tailored cover letter for the candidate using their resume.
Rules:
- ${toneLine}
- Structure: greeting ("Dear Hiring Manager,"), opening hook naming the role and company, 1-2 body paragraphs connecting real resume evidence to the role, closing with a call to action, sign-off ("Sincerely," on its own line, candidate name on the next line).
- Ground every claim in the resume. ${FACTUAL_RULES.replace('Do not use first-person pronouns (I, me, my).', 'First person is allowed in a cover letter.')}
${input.jobDescription ? '- Weave in the key requirements from the job description where the candidate genuinely matches.' : ''}
- Output the letter text only — no subject line, no markdown, no placeholders like [Company].`;
  const user = `Company: ${input.company}\nRole: ${input.role}\n\n${input.jobDescription ? `JOB DESCRIPTION:\n"""\n${input.jobDescription.slice(0, 8000)}\n"""\n\n` : ''}RESUME:\n"""\n${input.resumeText.slice(0, 10000)}\n"""`;
  const letter = await chat([
    { role: 'assistant', content: system },
    { role: 'user', content: user },
  ]);
  return { letter, wordCount: letter.split(/\s+/).filter(Boolean).length };
}

/** Deterministic + AI learning plan for the skill gap analyzer. */
export async function skillGapAnalysis(input: {
  resumeText: string;
  currentSkills: string[];
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  targetRole: string;
}): Promise<{ recommendations: SkillGapRecommendation[]; summary: string }> {
  const system = `You are a senior technical career coach. The candidate's matched and missing skills for a target role have already been determined — do NOT re-evaluate them.
For up to the 6 most important missing skills, produce a practical learning plan.
Return JSON: {"recommendations":[{"skill":"exact missing skill","reason":"why it matters for this role (1 sentence)","priority":"high"|"medium"|"low","learningSteps":["3-4 concrete learning steps/projects"]}],"summary":"2 sentence overall readiness assessment"}
Only recommend skills from the provided missing list. Be specific and practical.`;
  const user = `Target role: ${input.targetRole}\n\nCurrent skills: ${input.currentSkills.join(', ') || '(none listed)'}\nMatched: ${input.matchedSkills.join(', ') || '(none)'}\nMissing: ${input.missingSkills.join(', ') || '(none)'}\n\nResume summary for context:\n"""\n${input.resumeText.slice(0, 4000)}\n"""`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);
  const recommendations: SkillGapRecommendation[] = Array.isArray(parsed.recommendations)
    ? (parsed.recommendations as Record<string, unknown>[]).slice(0, 6).map((r) => ({
        skill: String(r.skill ?? '').trim().slice(0, 80),
        reason: String(r.reason ?? '').trim().slice(0, 240),
        priority: (['high', 'medium', 'low'].includes(String(r.priority)) ? String(r.priority) : 'medium') as SkillGapRecommendation['priority'],
        learningSteps: Array.isArray(r.learningSteps) ? r.learningSteps.map((s) => String(s).trim().slice(0, 200)).filter(Boolean).slice(0, 5) : [],
      })).filter((r) => r.skill)
    : [];
  return {
    recommendations,
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : '',
  };
}

/** Career advisor: full AI career profile from a resume. */
export async function careerProfile(resumeText: string, targetRole?: string): Promise<CareerProfileResult> {
  const system = `You are an AI career advisor analyzing a candidate's resume to build their career profile.
Return JSON with exactly these keys:
{"summary":"3 sentence career assessment",
"jobRoles":[{"title":"specific role title","matchScore":72,"why":"1 sentence justification"}],
"skillsInDemand":["market-demanded skills this candidate already has, max 10"],
"skillGaps":["important gaps to close, max 8"],
"technologies":["concrete technologies worth adopting next, max 10"],
"roadmap":[{"phase":"Phase 1 — name","timeframe":"e.g. 0-3 months","focus":"main focus","milestones":["3-4 concrete milestones"]}],
"learning":[{"topic":"skill/topic to learn","resources":"types of resources (courses, docs, projects)","why":"1 sentence"}],
"certifications":[{"name":"certification","provider":"issuer","why":"1 sentence"}],
"projectsToBuild":["3-5 portfolio project ideas that strengthen the profile"],
"interviewTopics":["5-6 topics to prepare for interviews"]}
Rules: 3-5 jobRoles with realistic matchScores (0-100) that sum sensibly against the candidate's actual profile; roadmap has exactly 3 phases (0-3, 3-6, 6-12 months); everything grounded in the resume — do not invent employers or experience.${targetRole ? ` The candidate's stated target role is "${targetRole}" — weight recommendations toward it.` : ''}`;
  const parsed = await chatJSON<Record<string, unknown>>(system, `RESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`);
  const list = (v: unknown, max = 10) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  const roles = Array.isArray(parsed.jobRoles)
    ? (parsed.jobRoles as Record<string, unknown>[]).slice(0, 5).map((r) => ({
        title: String(r.title ?? '').trim().slice(0, 100),
        matchScore: Math.max(0, Math.min(100, Math.round(Number(r.matchScore) || 0))),
        why: String(r.why ?? '').trim().slice(0, 240),
      })).filter((r) => r.title)
    : [];
  const roadmap: RoadmapStep[] = Array.isArray(parsed.roadmap)
    ? (parsed.roadmap as Record<string, unknown>[]).slice(0, 4).map((r) => ({
        phase: String(r.phase ?? '').trim().slice(0, 120),
        timeframe: String(r.timeframe ?? '').trim().slice(0, 60),
        focus: String(r.focus ?? '').trim().slice(0, 240),
        milestones: Array.isArray(r.milestones) ? r.milestones.map((m) => String(m).trim().slice(0, 200)).filter(Boolean).slice(0, 5) : [],
      })).filter((r) => r.phase)
    : [];
  const learning: LearningItem[] = Array.isArray(parsed.learning)
    ? (parsed.learning as Record<string, unknown>[]).slice(0, 8).map((r) => ({
        topic: String(r.topic ?? '').trim().slice(0, 120),
        resources: String(r.resources ?? '').trim().slice(0, 240),
        why: String(r.why ?? '').trim().slice(0, 240),
      })).filter((r) => r.topic)
    : [];
  const certifications: CertificationItem[] = Array.isArray(parsed.certifications)
    ? (parsed.certifications as Record<string, unknown>[]).slice(0, 6).map((r) => ({
        name: String(r.name ?? '').trim().slice(0, 140),
        provider: String(r.provider ?? '').trim().slice(0, 100),
        why: String(r.why ?? '').trim().slice(0, 240),
      })).filter((r) => r.name)
    : [];
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 800) : '',
    jobRoles: roles,
    skillsInDemand: list(parsed.skillsInDemand),
    skillGaps: list(parsed.skillGaps, 8),
    technologies: list(parsed.technologies),
    roadmap,
    learning,
    certifications,
    projectsToBuild: list(parsed.projectsToBuild, 6),
    interviewTopics: list(parsed.interviewTopics, 8),
    generatedAt: new Date().toISOString(),
  };
}

/** Project description generator: idea → full resume-ready project content. */
export async function generateProjectDescription(name: string, idea: string, targetRole?: string): Promise<ProjectDescriptionResult> {
  const system = `You are an expert resume writer and engineer. Turn the project name + rough idea below into complete, professional resume-ready content.
Return JSON: {"overview":"2-3 sentence professional project overview","technologies":["likely technologies used, max 10"],"responsibilities":["what the candidate did/owned, max 6, each under 140 chars"],"features":["key features, max 6, each under 140 chars"],"bullets":["3-5 resume bullet points, one per line description inside the string array, strong action verbs, under 160 chars each"],"interviewExplanation":"a 4-6 sentence script the candidate can use to explain this project in an interview"}
Rules:
- Base content ONLY on the idea provided; propose standard, plausible technologies for such a project but do not invent exotic employers/users/metrics.
- If a number would normally be needed (users, performance), phrase it generically (e.g. "reduced load times") rather than inventing figures.
${roleLine(targetRole)}
- No first-person pronouns in resume content.`;
  const parsed = await chatJSON<Record<string, unknown>>(system, `Project name: ${name}\nIdea: """${idea.slice(0, 3000)}"""`);
  const list = (v: unknown, max = 10) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  return {
    overview: typeof parsed.overview === 'string' ? parsed.overview.slice(0, 1200) : '',
    technologies: list(parsed.technologies, 10),
    responsibilities: list(parsed.responsibilities, 6),
    features: list(parsed.features, 6),
    bullets: list(parsed.bullets, 6),
    interviewExplanation: typeof parsed.interviewExplanation === 'string' ? parsed.interviewExplanation.slice(0, 1600) : '',
    generatedAt: new Date().toISOString(),
  };
}

/** LinkedIn profile optimizer. */
export async function optimizeLinkedInProfile(resumeText: string): Promise<LinkedInResult> {
  const system = `You are a LinkedIn profile expert. Based on the resume below, produce optimized LinkedIn content.
Return JSON: {"headline":"220-char-max headline with role + value proposition + key skills","headlineAlternatives":["2 alternative headlines"],"about":"first-person LinkedIn About section, 3-5 short paragraphs, engaging, grounded in the resume","skills":["up to 15 LinkedIn skills (exact names recruiters filter by)"],"experience":[{"title":"job title — company","description":"1-2 sentence experience description in first person"}],"projects":[{"name":"project name","description":"1-2 sentence description"}],"tips":["4-6 profile improvement tips"]}
Experience/projects must reflect ONLY what is in the resume. Do not invent employers, dates or metrics.`;
  const parsed = await chatJSON<Record<string, unknown>>(system, `RESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`);
  const list = (v: unknown, max = 15) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  const experience = Array.isArray(parsed.experience)
    ? (parsed.experience as Record<string, unknown>[]).slice(0, 8).map((e) => ({
        title: String(e.title ?? '').trim().slice(0, 160),
        description: String(e.description ?? '').trim().slice(0, 1200),
      })).filter((e) => e.title)
    : [];
  const projects = Array.isArray(parsed.projects)
    ? (parsed.projects as Record<string, unknown>[]).slice(0, 8).map((p) => ({
        name: String(p.name ?? '').trim().slice(0, 160),
        description: String(p.description ?? '').trim().slice(0, 1200),
      })).filter((p) => p.name)
    : [];
  return {
    headline: typeof parsed.headline === 'string' ? parsed.headline.slice(0, 240) : '',
    headlineAlternatives: list(parsed.headlineAlternatives, 3),
    about: typeof parsed.about === 'string' ? parsed.about.slice(0, 4000) : '',
    skills: list(parsed.skills),
    experience,
    projects,
    tips: list(parsed.tips, 8),
    generatedAt: new Date().toISOString(),
  };
}

/** Interview preparation question sets. */
export async function generateInterviewQuestions(resumeText: string, role: string): Promise<Record<'hr' | 'technical' | 'project' | 'behavioral' | 'jobSpecific', string[]>> {
  const system = `You are an interview coach. Generate likely interview questions for this candidate based on their resume and target role.
Return JSON: {"hr":["5 HR questions (background, motivation, salary expectations style)"],"technical":["6 technical questions tied to the candidate's actual skills"],"project":["5 questions about the candidate's real projects"],"behavioral":["5 behavioral (STAR) questions"],"jobSpecific":["5 role-specific questions for the target role"]}
Each question is one sentence. Technical/project questions MUST reference the candidate's actual stack and projects where possible.`;
  const parsed = await chatJSON<Record<string, unknown>>(system, `Target role: ${role}\n\nRESUME:\n"""\n${resumeText.slice(0, 12000)}\n"""`);
  const list = (v: unknown, max = 8) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);
  return {
    hr: list(parsed.hr, 6),
    technical: list(parsed.technical, 8),
    project: list(parsed.project, 6),
    behavioral: list(parsed.behavioral, 6),
    jobSpecific: list(parsed.jobSpecific, 6),
  };
}

/** Mock interview: evaluate an answer and (optionally) produce the next question. */
export async function mockInterviewTurn(input: {
  resumeText: string;
  role: string;
  question?: string;
  answer?: string;
  askedHistory: string[];
}): Promise<{ evaluation: { score: number; feedback: string; strengths: string[]; improvements: string[] } | null; nextQuestion: string | null; questionType: string; finished: boolean; wrapUp: { overallScore: number; summary: string; finalTips: string[] } | null }> {
  const askedCount = input.askedHistory.length;
  const wrapUpNow = input.answer !== undefined && input.question !== undefined && askedCount >= 5;

  if (input.question && input.answer !== undefined) {
    // Evaluate the answer + decide what comes next.
    const system = `You are a strict but supportive interview coach running a mock interview for the target role.
Evaluate the candidate's answer to the question, then ${wrapUpNow ? 'conclude the interview' : 'ask the next question'}.
Return JSON: {"score":0-100 how well the answer performed,"feedback":"2-3 sentence evaluation","strengths":["1-3 strengths of the answer"],"improvements":["1-3 concrete improvements"],${wrapUpNow ? '"wrapUp":{"overallScore":0-100 across all answers,"summary":"3-4 sentence overall performance summary","finalTips":["3-4 preparation tips"]}' : '"nextQuestion":"the next interview question","questionType":"HR"|"Technical"|"Project"|"Behavioral"'}
Score honestly: generic/vague answers score low; specific, structured, relevant answers score high.
${wrapUpNow ? 'This is the final turn — include wrapUp and set nextQuestion to null.' : 'Do NOT repeat any previously asked question.'}
Do not invent facts about the candidate.`;
    const user = `TARGET ROLE: ${input.role}\n\nPREVIOUSLY ASKED: ${JSON.stringify(input.askedHistory.slice(-8))}\n\nQUESTION ASKED: ${input.question}\n\nCANDIDATE ANSWER:\n"""\n${input.answer.slice(0, 5000)}\n"""\n\nRESUME (for context):\n"""\n${input.resumeText.slice(0, 6000)}\n"""`;
    const parsed = await chatJSON<Record<string, unknown>>(system, user);
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.map((s) => String(s).trim()).filter(Boolean).slice(0, 4) : [];
    const improvements = Array.isArray(parsed.improvements) ? parsed.improvements.map((s) => String(s).trim()).filter(Boolean).slice(0, 4) : [];
    let wrapUp: { overallScore: number; summary: string; finalTips: string[] } | null = null;
    if (wrapUpNow && parsed.wrapUp && typeof parsed.wrapUp === 'object') {
      const w = parsed.wrapUp as Record<string, unknown>;
      wrapUp = {
        overallScore: Math.max(0, Math.min(100, Math.round(Number(w.overallScore) || 0))),
        summary: String(w.summary ?? '').slice(0, 900),
        finalTips: Array.isArray(w.finalTips) ? w.finalTips.map((t) => String(t).trim()).filter(Boolean).slice(0, 5) : [],
      };
    }
    return {
      evaluation: {
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
        feedback: String(parsed.feedback ?? '').slice(0, 900),
        strengths,
        improvements,
      },
      nextQuestion: wrapUpNow ? null : typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion.slice(0, 600) : null,
      questionType: String(parsed.questionType ?? 'General').slice(0, 40),
      finished: wrapUpNow || !parsed.nextQuestion,
      wrapUp,
    };
  }

  // Opening question.
  const system = `You are an interview coach starting a mock interview. Ask exactly ONE opening question.
Return JSON: {"nextQuestion":"the opening interview question","questionType":"HR"|"Technical"|"Project"|"Behavioral"}
Start with a strong HR/warm-up question tailored to the candidate's profile and target role.`;
  const parsed = await chatJSON<Record<string, unknown>>(system, `TARGET ROLE: ${input.role}\n\nRESUME:\n"""\n${input.resumeText.slice(0, 8000)}\n"""`);
  return {
    evaluation: null,
    nextQuestion: typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion.slice(0, 600) : 'Tell me about yourself and your background.',
    questionType: String(parsed.questionType ?? 'HR').slice(0, 40),
    finished: false,
    wrapUp: null,
  };
}

/** AI chat assistant grounded in the user's resume. */
export async function assistantReply(messages: { role: 'user' | 'assistant'; content: string }[], resumeText: string, userName: string): Promise<string> {
  const system = `You are the AI Resume Assistant inside "Resume Recreate Agent AI", helping ${userName} with their resume and career.
You have access to the user's latest resume (provided below). Ground every answer in it.
You can: improve summaries, suggest missing skills, improve project descriptions, assess ATS-friendliness, generate interview questions, and explain recommendations.
Style: concise, actionable, friendly-professional. Use short paragraphs or compact bullet lists. When suggesting rewrites, provide ready-to-paste text. Never invent experience the user does not have. Keep answers under 250 words unless the user asks for more.`;
  const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  return chat([{ role: 'assistant', content: `${system}\n\nUSER'S RESUME:\n"""\n${resumeText.slice(0, 9000)}\n"""` }, ...history]);
}

/**
 * Rewrites resume content optimized for a specific job (JD matcher "optimized version").
 * The model returns ONLY the sections it rewrites (summary/objective/bullet descriptions);
 * everything else is merged server-side from the original, so output stays small and reliable.
 */
export async function optimizeResumeForJob(
  data: import('@/types/resume').ResumeData,
  requirements: { title: string; requiredSkills: string[]; preferredSkills: string[]; technologies: string[]; keywords: string[]; responsibilities: string[] },
): Promise<{ optimized: import('@/types/resume').ResumeData; changes: string[] }> {
  const system = `You are an expert resume writer tailoring a resume to a specific job description.
Return ONLY the sections you rewrite, as JSON:
{"summary":"rewritten professional summary (2-4 sentences, no first-person)",
"objective":"rewritten career objective, or "" to leave unchanged",
"experience":[{"id":"existing id","description":"rewritten bullets, one per line, \\n separated"}],
"internships":[{"id":"existing id","description":"rewritten bullets"}],
"projects":[{"id":"existing id","description":"rewritten bullets"}],
"changes":["4-8 short descriptions of what you changed"]}
Rules:
- Only include the top-level keys you actually changed (omit experience/internships/projects arrays entirely if unchanged).
- Every id MUST come from the provided resume — never invent new ids.
- You may ONLY reword: weave genuine overlaps with the job requirements into summary/bullets, use alias phrasings of skills the candidate demonstrably already has (e.g. "REST APIs" if they built APIs with Express).
- NEVER add skills, jobs, projects, dates, metrics or experience the candidate does not have.
- Keep bullet facts identical — improve wording and keyword alignment only.
Respond with valid JSON only.`;
  const user = `JOB: ${requirements.title}
REQUIREMENTS:
${JSON.stringify(
    {
      requiredSkills: requirements.requiredSkills,
      preferredSkills: requirements.preferredSkills,
      technologies: requirements.technologies,
      keywords: requirements.keywords,
      responsibilities: requirements.responsibilities,
    },
    null,
    1,
  )}

RESUME (ids are authoritative):
${JSON.stringify(
    {
      summary: data.summary,
      objective: data.objective,
      experience: data.experience.map((e) => ({ id: e.id, jobTitle: e.jobTitle, description: e.description })),
      internships: data.internships.map((e) => ({ id: e.id, title: e.title, description: e.description })),
      projects: data.projects.map((e) => ({ id: e.id, name: e.name, description: e.description })),
    },
    null,
    1,
  ).slice(0, 20000)}`;
  const parsed = await chatJSON<Record<string, unknown>>(system, user);

  const { emptyResumeData } = await import('@/types/resume');
  const base = emptyResumeData();
  const optimized = JSON.parse(JSON.stringify(data)) as import('@/types/resume').ResumeData;
  const changes = Array.isArray(parsed.changes) ? parsed.changes.map((c) => String(c).trim()).filter(Boolean).slice(0, 10) : [];

  let applied = 0;
  if (typeof parsed.summary === 'string' && parsed.summary.trim() && parsed.summary.trim() !== data.summary.trim()) {
    optimized.summary = parsed.summary.trim().slice(0, 3000);
    applied++;
    if (!changes.some((c) => c.toLowerCase().includes('summary'))) changes.unshift('Rewove the professional summary around the key requirements of this job');
  }
  if (typeof parsed.objective === 'string' && parsed.objective.trim() && parsed.objective.trim() !== data.objective.trim()) {
    optimized.objective = parsed.objective.trim().slice(0, 2000);
    applied++;
  }
  const applyBullets = <T extends { id: string; description: string }>(list: T[], incoming: unknown): number => {
    if (!Array.isArray(incoming)) return 0;
    let n = 0;
    for (const item of incoming as Record<string, unknown>[]) {
      const target = list.find((e) => e.id === item.id);
      const desc = typeof item.description === 'string' ? item.description.trim() : '';
      if (target && desc && desc !== target.description.trim()) {
        target.description = desc.slice(0, 4000);
        n++;
      }
    }
    return n;
  };
  applied += applyBullets(optimized.experience, parsed.experience);
  applied += applyBullets(optimized.internships, parsed.internships);
  applied += applyBullets(optimized.projects, parsed.projects);

  if (applied === 0) throw new AIError('The AI could not produce a meaningful optimization for this resume. Please try again.');
  void base;
  return { optimized, changes: changes.slice(0, 10) };
}
