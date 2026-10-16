import type { ResumeData } from '@/types/resume';

/**
 * Deterministic, explainable resume quality metrics.
 * Pure functions — safe on both client and server. Same input always yields
 * the same score; no AI involved in the numbers.
 */

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Personal-info completeness: 8 fields, weighted (name/email/phone count most). */
export function computeProfileCompleteness(data: ResumeData): number {
  const p = data.personal;
  const checks: [boolean, number][] = [
    [Boolean(p.fullName.trim()), 20],
    [Boolean(p.email.trim()), 20],
    [Boolean(p.phone.trim()), 15],
    [Boolean(p.professionalTitle.trim()), 15],
    [Boolean(p.location.trim()), 10],
    [Boolean(p.linkedin.trim() || p.github.trim() || p.portfolio.trim()), 10],
    [Boolean(p.github.trim() || p.portfolio.trim()), 5],
    [Boolean(p.linkedin.trim()), 5],
  ];
  return clamp(checks.reduce((acc, [ok, w]) => acc + (ok ? w : 0), 0));
}

/**
 * Content completion across key sections.
 * Weights: summary 20, skills 20, experience 20, projects 15, education 15, extras 10.
 * A section is proportional to how much of it is plausibly filled.
 */
export function computeResumeCompletion(data: ResumeData): number {
  const parts: number[] = [];

  // Summary (20)
  const sumLen = data.summary.trim().length;
  parts.push(sumLen >= 150 ? 20 : sumLen >= 60 ? 12 : sumLen > 0 ? 6 : 0);

  // Skills (20)
  const skillCount = Object.values(data.skills ?? {}).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0);
  parts.push(clamp(skillCount * 2.5, 0, 20));

  // Experience / internships (20)
  const expBullets =
    data.experience.reduce((a, e) => a + (e.description.split('\n').filter((l) => l.trim()).length || (e.jobTitle.trim() ? 1 : 0)), 0) +
    data.internships.reduce((a, e) => a + (e.description.split('\n').filter((l) => l.trim()).length || (e.title.trim() ? 1 : 0)), 0);
  parts.push(clamp(expBullets * 2, 0, 20));

  // Projects (15)
  const projCount = data.projects.filter((pr) => pr.name.trim()).length;
  const projScore = data.projects.reduce((a, pr) => a + (pr.name.trim() ? 4 : 0) + (pr.description.trim() ? 3 : 0), 0);
  parts.push(clamp(Math.max(projCount * 7, projScore), 0, 15));

  // Education (15)
  const edu = data.education.filter((e) => e.degree.trim() && e.institution.trim());
  parts.push(clamp(edu.length * 8 + (data.education.some((e) => e.score.trim()) ? 3 : 0), 0, 15));

  // Extras: certifications, achievements, languages, objective (10)
  let extras = 0;
  if (data.certifications.length) extras += 3;
  if (data.achievements.length) extras += 3;
  if (data.languages.length) extras += 2;
  if (data.objective.trim()) extras += 2;
  parts.push(clamp(extras, 0, 10));

  return clamp(Math.round(parts.reduce((a, b) => a + b, 0)));
}

/** Action verbs used to detect strong bullet starts (shared with scoring). */
const VERBS = [
  'built', 'developed', 'designed', 'implemented', 'created', 'led', 'managed', 'improved', 'optimized',
  'automated', 'delivered', 'launched', 'reduced', 'increased', 'migrated', 'integrated', 'tested',
  'deployed', 'maintained', 'analyzed', 'collaborated', 'mentored', 'architected', 'engineered',
  'streamlined', 'achieved', 'configured', 'researched', 'presented', 'designed', 'spearheaded',
];

function hasQuantified(text: string): boolean {
  return /\d+\s?(%|percent|x\b|\+)|\$\s?\d|\b\d{2,}\b/.test(text);
}

/**
 * Resume quality score: composite of summary, bullet strength, skills breadth,
 * measurable outcomes and completeness. Deterministic 0-100.
 */
export function computeQualityScore(data: ResumeData): number {
  let score = 0;

  const sumLen = data.summary.trim().length;
  if (sumLen >= 150) score += 20;
  else if (sumLen >= 60) score += 12;
  else if (sumLen > 0) score += 5;

  const bullets = [
    ...data.experience.flatMap((e) => e.description.split('\n')),
    ...data.internships.flatMap((e) => e.description.split('\n')),
    ...data.projects.flatMap((e) => e.description.split('\n')),
  ].map((b) => b.replace(/^\s*(?:[-–—•*]|\d+[.)])\s*/, '').trim()).filter(Boolean);

  if (bullets.length >= 8) score += 20;
  else if (bullets.length >= 4) score += 12;
  else if (bullets.length >= 2) score += 6;

  const verbHits = bullets.filter((b) => VERBS.some((v) => b.toLowerCase().startsWith(v))).length;
  if (bullets.length && verbHits / bullets.length >= 0.5) score += 15;
  else if (verbHits >= 2) score += 8;

  if (hasQuantified(bullets.join(' '))) score += 15;

  const skillCount = Object.values(data.skills ?? {}).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0);
  score += clamp(skillCount, 0, 10);

  const firstPerson = /\b(i|me|my|mine|myself)\b/i.test(data.summary);
  if (data.summary && !firstPerson) score += 5;

  const extras = data.certifications.length + data.achievements.length + data.languages.length;
  score += clamp(extras * 3, 0, 15);

  return clamp(Math.round(score));
}
