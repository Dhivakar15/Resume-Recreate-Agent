import { z } from 'zod';
import { emptyResumeData, type ResumeData } from '@/types/resume';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email is too long.')
  .email('Please enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name is too long.'),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const isHttpUrl = (v: string) =>
  v === '' || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v);

export const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine(isHttpUrl, { message: 'Please enter a valid URL starting with http:// or https://' })
  .optional()
  .or(z.literal(''));

export const createResumeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120).default('Untitled Resume'),
  targetRole: z.string().trim().max(80).optional(),
  template: z.enum(['modern', 'professional', 'minimal']).optional(),
  data: z.unknown().optional(),
});

export const updateResumeSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty.').max(120).optional(),
  targetRole: z.string().trim().max(80).nullable().optional(),
  template: z.enum(['modern', 'professional', 'minimal']).optional(),
  data: z.unknown().optional(),
});

export const renameSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty.').max(120),
});

export const improveSchema = z.object({
  kind: z.enum(['summary', 'objective', 'experience', 'internship', 'project', 'achievement']),
  text: z.string().trim().min(10, 'Please write at least a sentence to improve.').max(6000),
  targetRole: z.string().trim().max(80).optional(),
  context: z.string().trim().max(4000).optional(),
});

export const suggestSkillsSchema = z.object({
  targetRole: z.string().trim().max(80).optional(),
  context: z.string().trim().max(6000).optional(),
});

export const analyzeSchema = z.object({
  resumeId: z.string().min(1),
  targetRole: z.string().trim().max(80).optional(),
});

export const jobMatchSchema = z.object({
  content: z.string().trim().min(50, 'Please paste a longer job description (at least 50 characters).').max(20000),
  title: z.string().trim().max(120).optional(),
  resumeId: z.string().min(1).optional(),
});

export const recreateSchema = z.object({
  rawText: z.string().trim().max(30000).optional(),
  resumeId: z.string().min(1).optional(),
  targetRole: z.string().trim().max(80).optional(),
});

export const saveVersionSchema = z.object({
  label: z.string().trim().min(1, 'Version label is required.').max(80).optional(),
});

/** Validates + normalizes untrusted resume data into a complete ResumeData. */
export function sanitizeResumeData(raw: unknown): ResumeData {
  const base = emptyResumeData();
  if (!raw || typeof raw !== 'object') return base;
  // Structural validation happens in normalizeResumeData; lengths capped here.
  const data = raw as ResumeData;
  const clip = (s: unknown, max = 6000) =>
    typeof s === 'string' ? s.slice(0, max) : '';
  const list = (v: unknown, max = 40) =>
    Array.isArray(v) ? v.slice(0, max).map((x) => clip(x, 80)) : [];
  return {
    personal: {
      fullName: clip(data.personal?.fullName, 80),
      professionalTitle: clip(data.personal?.professionalTitle, 100),
      email: clip(data.personal?.email, 254),
      phone: clip(data.personal?.phone, 30),
      location: clip(data.personal?.location, 100),
      linkedin: clip(data.personal?.linkedin, 300),
      github: clip(data.personal?.github, 300),
      portfolio: clip(data.personal?.portfolio, 300),
    },
    objective: clip(data.objective, 2000),
    summary: clip(data.summary, 3000),
    education: Array.isArray(data.education) ? data.education.slice(0, 15).map((e) => ({ ...e, degree: clip(e?.degree, 120), institution: clip(e?.institution, 160), location: clip(e?.location, 100), startYear: clip(e?.startYear, 10), endYear: clip(e?.endYear, 10), score: clip(e?.score, 20) })) : base.education,
    skills: {
      languages: list(data.skills?.languages, 30),
      frameworks: list(data.skills?.frameworks, 30),
      databases: list(data.skills?.databases, 30),
      tools: list(data.skills?.tools, 30),
      cloud: list(data.skills?.cloud, 30),
      soft: list(data.skills?.soft, 30),
    },
    experience: Array.isArray(data.experience) ? data.experience.slice(0, 15).map((e) => ({ ...e, jobTitle: clip(e?.jobTitle, 120), company: clip(e?.company, 120), location: clip(e?.location, 100), startDate: clip(e?.startDate, 30), endDate: clip(e?.endDate, 30), description: clip(e?.description, 4000) })) : base.experience,
    internships: Array.isArray(data.internships) ? data.internships.slice(0, 15).map((e) => ({ ...e, title: clip(e?.title, 120), company: clip(e?.company, 120), duration: clip(e?.duration, 60), location: clip(e?.location, 100), description: clip(e?.description, 4000), technologies: clip(e?.technologies, 300) })) : base.internships,
    projects: Array.isArray(data.projects) ? data.projects.slice(0, 20).map((e) => ({ ...e, name: clip(e?.name, 120), description: clip(e?.description, 4000), role: clip(e?.role, 100), technologies: clip(e?.technologies, 300), githubUrl: clip(e?.githubUrl, 300), liveUrl: clip(e?.liveUrl, 300) })) : base.projects,
    certifications: Array.isArray(data.certifications) ? data.certifications.slice(0, 20).map((e) => ({ ...e, name: clip(e?.name, 160), organization: clip(e?.organization, 160), date: clip(e?.date, 40), credentialUrl: clip(e?.credentialUrl, 300) })) : base.certifications,
    achievements: Array.isArray(data.achievements) ? data.achievements.slice(0, 20).map((e) => ({ ...e, title: clip(e?.title, 160), description: clip(e?.description, 1000) })) : base.achievements,
    languages: Array.isArray(data.languages) ? data.languages.slice(0, 15).map((e) => ({ ...e, language: clip(e?.language, 60), proficiency: clip(e?.proficiency, 40) })) : base.languages,
  };
}

// ─── feat-9 platform schemas ─────────────────────────────────────────────────

export const rewriteSchema = z.object({
  resumeId: z.string().min(1).optional(),
  text: z.string().trim().min(10, 'Please write at least a sentence to rewrite.').max(6000),
  mode: z.enum(['rewrite', 'improve', 'professional', 'concise', 'action-verbs', 'ats', 'quantify', 'grammar']),
  targetRole: z.string().trim().max(80).optional(),
  context: z.string().trim().max(4000).optional(),
});

export const coverLetterSchema = z.object({
  resumeId: z.string().min(1),
  company: z.string().trim().min(1, 'Company name is required.').max(120),
  role: z.string().trim().min(1, 'Job role is required.').max(120),
  jobDescription: z.string().trim().max(15000).optional(),
  tone: z.enum(['professional', 'formal', 'short']).default('professional'),
});

export const saveCoverLetterSchema = z.object({
  resumeId: z.string().min(1).nullable().optional(),
  company: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  tone: z.enum(['professional', 'formal', 'short']).default('professional'),
  content: z.string().trim().min(20).max(20000),
});

export const updateCoverLetterSchema = z.object({
  content: z.string().trim().min(20, 'The letter is too short to save.').max(20000),
});

export const skillGapSchema = z.object({
  resumeId: z.string().min(1),
  targetRole: z.string().trim().min(1, 'Target role is required.').max(80),
  jobDescription: z.string().trim().max(15000).optional(),
});

export const careerSchema = z.object({
  resumeId: z.string().min(1),
});

export const projectDescriptionSchema = z.object({
  name: z.string().trim().min(2, 'Project name is required.').max(120),
  idea: z.string().trim().min(15, 'Describe the project idea in at least 15 characters.').max(3000),
  targetRole: z.string().trim().max(80).optional(),
});

export const linkedinSchema = z.object({
  resumeId: z.string().min(1),
});

export const interviewQuestionsSchema = z.object({
  resumeId: z.string().min(1),
  role: z.string().trim().max(80).optional(),
});

export const mockInterviewSchema = z.object({
  resumeId: z.string().min(1),
  role: z.string().trim().max(80).optional(),
  askedHistory: z.array(z.string().trim().max(600)).max(12).default([]),
  question: z.string().trim().max(600).optional(),
  answer: z.string().trim().max(6000).optional(),
});

export const assistantSchema = z.object({
  resumeId: z.string().min(1).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(6000),
      }),
    )
    .min(1)
    .max(24),
});

export const optimizeJobSchema = z.object({
  resumeId: z.string().min(1),
  jobDescription: z.string().trim().min(50, 'Paste a longer job description (at least 50 characters).').max(20000),
  title: z.string().trim().max(120).optional(),
});

export const applicationCreateSchema = z.object({
  company: z.string().trim().min(1, 'Company is required.').max(120),
  role: z.string().trim().min(1, 'Job role is required.').max(120),
  status: z.enum(['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected']).default('Applied'),
  appliedDate: z.string().datetime().optional().or(z.literal('')),
  interviewDate: z.string().datetime().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional(),
});

export const applicationUpdateSchema = applicationCreateSchema.partial();

export const markNotificationsSchema = z.object({
  ids: z.array(z.string().min(1)).max(100).optional(),
  all: z.boolean().optional(),
});
