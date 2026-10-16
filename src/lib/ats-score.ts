import type { ATSAnalysis, ResumeData, ScoreBreakdownItem } from '@/types/resume';
import { descriptionToBullets, normalizeKeyword, resumeToText } from '@/lib/resume-utils';
import type { ResumeFeedback } from '@/lib/ai';

const ACTION_VERBS = [
  'built', 'developed', 'designed', 'implemented', 'created', 'led', 'managed', 'improved',
  'optimized', 'automated', 'delivered', 'launched', 'reduced', 'increased', 'migrated',
  'integrated', 'tested', 'deployed', 'maintained', 'analyzed', 'collaborated', 'mentored',
  'architected', 'engineered', 'streamlined', 'achieved', 'configured', 'researched', 'presented',
];

const FIRST_PERSON = /\b(i|me|my|mine|myself)\b/i;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hasQuantified(text: string): boolean {
  return /\d+\s?(%|percent|x\b|\+)|\$\s?\d|\b\d{2,}\b/.test(text);
}

/**
 * Deterministic, explainable ATS-style scoring.
 * The score is derived purely from resume content + AI-extracted role keywords,
 * so the same inputs always produce the same score.
 * This is an estimate for guidance only — not an official ATS score.
 */
export function computeATSScore(
  data: ResumeData,
  feedback: ResumeFeedback,
  targetRole: string,
): ATSAnalysis {
  const breakdown: ScoreBreakdownItem[] = [];
  const p = data.personal;
  const resumeText = resumeToText(data).toLowerCase();
  const normalizedResume = normalizeKeyword(resumeText);

  // 1. Contact & links (10)
  let contact = 0;
  const contactNotes: string[] = [];
  if (p.fullName.trim()) contact += 3; else contactNotes.push('add your full name');
  if (p.email.trim()) contact += 3; else contactNotes.push('add an email address');
  if (p.phone.trim()) contact += 2; else contactNotes.push('add a phone number');
  if (p.linkedin || p.github || p.portfolio) contact += 2; else contactNotes.push('add LinkedIn/GitHub/portfolio');
  breakdown.push({ label: 'Contact & Links', score: clamp(contact, 0, 10), max: 10, note: contactNotes.length ? `Consider to ${contactNotes.join(', ')}.` : 'Complete and well linked.' });

  // 2. Professional summary (15)
  let summary = 0;
  const sumLen = data.summary.trim().length;
  if (sumLen >= 150 && sumLen <= 700 && !FIRST_PERSON.test(data.summary)) summary = 15;
  else if (sumLen >= 80) summary = 10;
  else if (sumLen > 0) summary = 5;
  breakdown.push({
    label: 'Professional Summary',
    score: summary,
    max: 15,
    note: sumLen === 0 ? 'No summary written yet.' : summary === 15 ? 'Strong, appropriately sized summary.' : 'Aim for 2-4 impactful sentences (150+ chars) without first-person pronouns.',
  });

  // 3. Education (10)
  const edu = data.education.filter((e) => e.degree.trim() && e.institution.trim());
  const eduScore = edu.length ? clamp(6 + Math.min(edu.length - 1, 1) * 2 + (data.education.some((e) => e.score.trim()) ? 2 : 0), 0, 10) : 0;
  breakdown.push({ label: 'Education', score: eduScore, max: 10, note: edu.length ? (eduScore >= 10 ? 'Detailed education section.' : 'Add CGPA/percentage and dates for more detail.') : 'No education entries found.' });

  // 4. Skills coverage vs target keywords (25)
  const keywords = feedback.keywords.map(normalizeKeyword).filter(Boolean).slice(0, 20);
  const uniqueKeywords = [...new Set(keywords)];
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of uniqueKeywords) {
    if (normalizedResume.includes(kw) || [...normalizedResume.split(/[\s,;/|]+/)].includes(kw)) matched.push(kw);
    else missing.push(kw);
  }
  const coverage = uniqueKeywords.length ? matched.length / uniqueKeywords.length : 0;
  const skillsCount = Object.values(data.skills ?? {}).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
  const keywordScore = Math.round(coverage * 18) + (skillsCount >= 8 ? 4 : skillsCount >= 4 ? 2 : 0) + (Object.values(data.skills ?? {}).filter((a) => Array.isArray(a) && a.length > 0).length >= 4 ? 3 : 0);
  breakdown.push({ label: 'Skills & Keyword Match', score: clamp(keywordScore, 0, 25), max: 25, note: uniqueKeywords.length ? `${matched.length}/${uniqueKeywords.length} role keywords detected.` : 'No target keywords extracted — try again.' });

  // 5. Experience & projects depth (25)
  const bullets = [
    ...data.experience.flatMap((e) => descriptionToBullets(e.description)),
    ...data.internships.flatMap((e) => descriptionToBullets(e.description)),
    ...data.projects.flatMap((e) => descriptionToBullets(e.description)),
  ];
  const allBulletsText = bullets.join(' ').toLowerCase();
  let depth = 0;
  if (data.experience.length + data.internships.length + data.projects.length > 0) depth += 8;
  if (bullets.length >= 6) depth += 5; else if (bullets.length >= 3) depth += 3;
  const actionVerbHits = bullets.filter((b) => ACTION_VERBS.some((v) => b.toLowerCase().startsWith(v))).length;
  if (actionVerbHits >= Math.max(3, Math.ceil(bullets.length * 0.4))) depth += 5;
  else if (actionVerbHits >= 2) depth += 3;
  if (hasQuantified(allBulletsText)) depth += 4;
  const verbNote = actionVerbHits < 2 ? 'Start bullet points with strong action verbs.' : hasQuantified(allBulletsText) ? 'Good use of action verbs and measurable details.' : 'Add measurable outcomes (%, numbers, scale) where truthful.';
  breakdown.push({ label: 'Experience & Projects Depth', score: clamp(depth, 0, 25), max: 25, note: bullets.length ? verbNote : 'Add experience, internships or projects with bullet points.' });

  // 6. Formatting & ATS readability (15)
  let fmt = 6; // generated resumes are single-column by design
  if (!FIRST_PERSON.test(resumeToText(data))) fmt += 3;
  if (bullets.length >= 3) fmt += 2;
  const totalLen = resumeToText(data).length;
  if (totalLen >= 800 && totalLen <= 9000) fmt += 4;
  breakdown.push({ label: 'ATS Formatting', score: clamp(fmt, 0, 15), max: 15, note: 'Single-column layout, standard section titles and consistent bullets maximize parseability.' });

  const score = clamp(Math.round(breakdown.reduce((a, b) => a + b.score, 0)), 0, 100);

  return {
    score,
    breakdown,
    keywordMatch: { matched, missing },
    strengths: feedback.strengths,
    improvements: feedback.improvements,
    formatting: feedback.formatting,
    recommendations: feedback.recommendations,
    targetRole,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Deterministic match score between a resume and extracted job requirements.
 * requiredSkills coverage weighted 65%, preferred+tech 20%, keywords 15%.
 */
export function computeJobMatchScore(
  data: ResumeData,
  requirements: { requiredSkills: string[]; preferredSkills: string[]; technologies: string[]; keywords: string[] },
): { matchedSkills: string[]; missingSkills: string[]; score: number } {
  const resumeText = normalizeKeyword(resumeToText(data).toLowerCase());
  const tokens = new Set(resumeText.split(/[\s,;/|().]+/).filter(Boolean));
  const has = (kw: string) => {
    const n = normalizeKeyword(kw.toLowerCase());
    if (!n) return false;
    if (resumeText.includes(n)) return true;
    // multi-word: every token present somewhere
    const parts = n.split(' ').filter((t) => t.length > 1);
    return parts.length > 1 && parts.every((t) => tokens.has(t));
  };
  const allSkills = [...requirements.requiredSkills, ...requirements.preferredSkills, ...requirements.technologies];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  for (const s of [...new Set(allSkills.map((s) => s.trim()).filter(Boolean))]) {
    (has(s) ? matchedSkills : missingSkills).push(s);
  }
  const reqCov = requirements.requiredSkills.length ? requirements.requiredSkills.filter(has).length / requirements.requiredSkills.length : 1;
  const prefCov = requirements.preferredSkills.length ? requirements.preferredSkills.filter(has).length / requirements.preferredSkills.length : 1;
  const kwCov = requirements.keywords.length ? requirements.keywords.filter(has).length / requirements.keywords.length : 1;
  const score = Math.round((reqCov * 65 + prefCov * 20 + kwCov * 15));
  return { matchedSkills, missingSkills, score: clamp(score, 0, 100) };
}
