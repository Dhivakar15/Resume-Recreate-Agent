// ─── Resume domain types (shared client + server) ───────────────────────────

export interface PersonalInfo {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startYear: string;
  endYear: string;
  score: string; // CGPA or percentage
}

export interface ExperienceEntry {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string; // one bullet point per line
}

export interface InternshipEntry {
  id: string;
  title: string;
  company: string;
  duration: string;
  location: string;
  description: string; // one bullet point per line
  technologies: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string; // one bullet point per line
  role: string;
  technologies: string;
  githubUrl: string;
  liveUrl: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  organization: string;
  date: string;
  credentialUrl: string;
}

export interface AchievementEntry {
  id: string;
  title: string;
  description: string;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: string;
}

export interface SkillsData {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  cloud: string[];
  soft: string[];
}

export interface ResumeData {
  personal: PersonalInfo;
  objective: string;
  summary: string;
  education: EducationEntry[];
  skills: SkillsData;
  experience: ExperienceEntry[];
  internships: InternshipEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  languages: LanguageEntry[];
}

export const SKILL_CATEGORIES: { key: keyof SkillsData; label: string; placeholder: string }[] = [
  { key: 'languages', label: 'Programming Languages', placeholder: 'Python, Java, C++' },
  { key: 'frameworks', label: 'Frameworks & Libraries', placeholder: 'React, Django, Spring Boot' },
  { key: 'databases', label: 'Databases', placeholder: 'MySQL, PostgreSQL, MongoDB' },
  { key: 'tools', label: 'Tools & Platforms', placeholder: 'Git, Docker, Figma, Jira' },
  { key: 'cloud', label: 'Cloud Technologies', placeholder: 'AWS, Azure, GCP, Vercel' },
  { key: 'soft', label: 'Soft Skills', placeholder: 'Teamwork, Communication, Leadership' },
];

export const TARGET_ROLES = [
  'Software Developer',
  'Java Developer',
  'Python Developer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Web Developer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Mobile App Developer',
  'QA Engineer',
  'Product Manager',
  'Business Analyst',
];

export const LANGUAGE_LEVELS = ['Native', 'Fluent', 'Professional', 'Intermediate', 'Basic'];

export const emptySkills = (): SkillsData => ({
  languages: [],
  frameworks: [],
  databases: [],
  tools: [],
  cloud: [],
  soft: [],
});

export const emptyResumeData = (): ResumeData => ({
  personal: {
    fullName: '',
    professionalTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  objective: '',
  summary: '',
  education: [],
  skills: emptySkills(),
  experience: [],
  internships: [],
  projects: [],
  certifications: [],
  achievements: [],
  languages: [],
});

/** Merge unknown stored data into a complete, type-safe ResumeData. */
export function normalizeResumeData(raw: unknown): ResumeData {
  const base = emptyResumeData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const p = (r.personal ?? {}) as Record<string, unknown>;
  const s = (r.skills ?? {}) as Record<string, unknown>;
  return {
    personal: {
      fullName: str(p.fullName),
      professionalTitle: str(p.professionalTitle),
      email: str(p.email),
      phone: str(p.phone),
      location: str(p.location),
      linkedin: str(p.linkedin),
      github: str(p.github),
      portfolio: str(p.portfolio),
    },
    objective: str(r.objective),
    summary: str(r.summary),
    education: arr(r.education).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        degree: str(x.degree),
        institution: str(x.institution),
        location: str(x.location),
        startYear: str(x.startYear),
        endYear: str(x.endYear),
        score: str(x.score),
      };
    }),
    skills: {
      languages: arr(s.languages).map(String),
      frameworks: arr(s.frameworks).map(String),
      databases: arr(s.databases).map(String),
      tools: arr(s.tools).map(String),
      cloud: arr(s.cloud).map(String),
      soft: arr(s.soft).map(String),
    },
    experience: arr(r.experience).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        jobTitle: str(x.jobTitle),
        company: str(x.company),
        location: str(x.location),
        startDate: str(x.startDate),
        endDate: str(x.endDate),
        description: str(x.description),
      };
    }),
    internships: arr(r.internships).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        title: str(x.title),
        company: str(x.company),
        duration: str(x.duration),
        location: str(x.location),
        description: str(x.description),
        technologies: str(x.technologies),
      };
    }),
    projects: arr(r.projects).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        name: str(x.name),
        description: str(x.description),
        role: str(x.role),
        technologies: str(x.technologies),
        githubUrl: str(x.githubUrl),
        liveUrl: str(x.liveUrl),
      };
    }),
    certifications: arr(r.certifications).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        name: str(x.name),
        organization: str(x.organization),
        date: str(x.date),
        credentialUrl: str(x.credentialUrl),
      };
    }),
    achievements: arr(r.achievements).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        title: str(x.title),
        description: str(x.description),
      };
    }),
    languages: arr(r.languages).map((e) => {
      const x = e as Record<string, unknown>;
      return {
        id: String(x.id ?? crypto.randomUUID()),
        language: str(x.language),
        proficiency: str(x.proficiency),
      };
    }),
  };
}

// ─── AI analysis types ───────────────────────────────────────────────────────

export interface ScoreBreakdownItem {
  label: string;
  score: number;
  max: number;
  note: string;
}

export interface ATSAnalysis {
  score: number; // 0-100, deterministic — "AI Estimated ATS Score"
  breakdown: ScoreBreakdownItem[];
  keywordMatch: { matched: string[]; missing: string[] };
  strengths: string[];
  improvements: string[];
  formatting: string[];
  recommendations: string[];
  targetRole: string;
  generatedAt: string;
}

export interface JobRequirements {
  title: string;
  requiredSkills: string[];
  preferredSkills: string[];
  technologies: string[];
  responsibilities: string[];
  keywords: string[];
  education: string;
  experienceYears: string;
}

export interface JobMatchAnalysis {
  requirements: JobRequirements;
  match: {
    score: number; // 0-100, deterministic
    matchedSkills: string[];
    missingSkills: string[];
    suggestedKeywords: string[];
    suggestions: string[];
  };
  generatedAt: string;
}

export type ResumeTemplate = 'modern' | 'professional' | 'minimal';

export const TEMPLATE_LABELS: Record<ResumeTemplate, string> = {
  modern: 'Modern ATS',
  professional: 'Professional',
  minimal: 'Minimal',
};
