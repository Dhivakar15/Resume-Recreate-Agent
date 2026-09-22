// ─── AI tool result types (shared client + server) ───────────────────────────

// Rewriter
export type RewriteMode =
  | 'rewrite'
  | 'improve'
  | 'professional'
  | 'concise'
  | 'action-verbs'
  | 'ats'
  | 'quantify'
  | 'grammar';

export const REWRITE_MODES: { key: RewriteMode; label: string; hint: string }[] = [
  { key: 'rewrite', label: 'Rewrite', hint: 'Fresh professional rewording' },
  { key: 'improve', label: 'Improve', hint: 'Stronger, sharper wording' },
  { key: 'professional', label: 'Make Professional', hint: 'Corporate polish' },
  { key: 'concise', label: 'Make Concise', hint: 'Trim without losing facts' },
  { key: 'action-verbs', label: 'Add Action Verbs', hint: 'Start lines with power verbs' },
  { key: 'ats', label: 'Make ATS-Friendly', hint: 'Keyword-rich and parseable' },
  { key: 'quantify', label: 'Add Measurable Impact', hint: 'Highlight real metrics' },
  { key: 'grammar', label: 'Fix Grammar', hint: 'Correct grammar and spelling' },
];

export interface RewriteResult {
  variants: string[];
  mode: RewriteMode;
}

// Cover letter
export type CoverLetterTone = 'professional' | 'formal' | 'short';

export const COVER_LETTER_TONES: { key: CoverLetterTone; label: string }[] = [
  { key: 'professional', label: 'Professional' },
  { key: 'formal', label: 'Formal' },
  { key: 'short', label: 'Short version' },
];

export interface CoverLetterResult {
  letter: string;
  wordCount: number;
  tone: CoverLetterTone;
}

export interface SavedCoverLetter {
  id: string;
  company: string;
  role: string;
  tone: string;
  content: string;
  resumeId: string | null;
  resumeTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

// Skill gap
export type SkillPriority = 'high' | 'medium' | 'low';

export interface SkillGapRecommendation {
  skill: string;
  reason: string;
  priority: SkillPriority;
  learningSteps: string[];
}

export interface SkillGapResult {
  targetRole: string;
  currentSkills: string[];
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  readiness: number; // 0-100 deterministic
  recommendations: SkillGapRecommendation[];
  summary: string;
  generatedAt: string;
}

// Career advisor
export interface CareerRoleMatch {
  title: string;
  matchScore: number; // 0-100
  why: string;
}

export interface RoadmapStep {
  phase: string;
  timeframe: string;
  focus: string;
  milestones: string[];
}

export interface LearningItem {
  topic: string;
  resources: string;
  why: string;
}

export interface CertificationItem {
  name: string;
  provider: string;
  why: string;
}

export interface CareerProfileResult {
  summary: string;
  jobRoles: CareerRoleMatch[];
  skillsInDemand: string[];
  skillGaps: string[];
  technologies: string[];
  roadmap: RoadmapStep[];
  learning: LearningItem[];
  certifications: CertificationItem[];
  projectsToBuild: string[];
  interviewTopics: string[];
  generatedAt: string;
}

// Project description generator
export interface ProjectDescriptionResult {
  overview: string;
  technologies: string[];
  responsibilities: string[];
  features: string[];
  bullets: string[];
  interviewExplanation: string;
  generatedAt: string;
}

// LinkedIn optimizer
export interface LinkedInResult {
  headline: string;
  headlineAlternatives: string[];
  about: string;
  skills: string[];
  experience: { title: string; description: string }[];
  projects: { name: string; description: string }[];
  tips: string[];
  generatedAt: string;
}

// Interview preparation
export interface InterviewQuestionSet {
  hr: string[];
  technical: string[];
  project: string[];
  behavioral: string[];
  jobSpecific: string[];
  generatedAt: string;
}

// Mock interview
export interface MockAnswerEvaluation {
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface MockInterviewResult {
  evaluation: MockAnswerEvaluation | null;
  nextQuestion: string | null;
  questionType: string | null;
  questionNumber: number;
  finished: boolean;
  wrapUp: { overallScore: number; summary: string; finalTips: string[] } | null;
}

// Dashboard summary
export interface DashboardSummary {
  user: { name: string; email: string; memberSince: string };
  stats: {
    totalResumes: number;
    totalVersions: number;
    totalAnalyses: number;
    totalApplications: number;
    totalCoverLetters: number;
    activeApplications: number;
    interviewsScheduled: number;
  };
  scores: {
    ats: number | null;
    atsTargetRole: string | null;
    atsResumeTitle: string | null;
    quality: number | null;
    qualityResumeTitle: string | null;
    completion: number; // 0-100 of latest resume content
    profileCompleteness: number; // 0-100 personal info
    atsHistory: { date: string; score: number }[];
  };
  latestAnalysis: {
    resumeId: string;
    resumeTitle: string;
    score: number;
    improvements: string[];
    keywordMatch: { matched: string[]; missing: string[] };
    generatedAt: string;
  } | null;
  recommendations: string[];
  recentResumes: {
    id: string;
    title: string;
    targetRole: string | null;
    template: string;
    updatedAt: string;
    versions: number;
  }[];
  activities: { id: string; type: string; message: string; createdAt: string }[];
}

// Analytics
export interface AnalyticsData {
  scoreHistory: { date: string; score: number; resumeTitle: string; targetRole: string | null; type: string }[];
  totals: {
    resumes: number;
    versions: number;
    analyses: number;
    applications: number;
    coverLetters: number;
  };
  applicationsByStatus: { status: string; count: number }[];
  scoreChange: { first: number | null; latest: number | null; delta: number | null };
  skillsByCategory: { category: string; count: number }[];
  activityByMonth: { month: string; analyses: number; resumes: number }[];
  completion: number;
}

// Notifications
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// Job optimizer
export interface JobOptimizationResult {
  optimizedData: import('@/types/resume').ResumeData;
  changes: string[];
  generatedAt: string;
}
