import type { ResumeData } from '@/types/resume';

/**
 * Converts structured resume data into a plain-text representation.
 * Used for AI prompts, keyword matching and ATS scoring.
 */
export function resumeToText(data: ResumeData): string {
  const lines: string[] = [];
  const p = data.personal;
  if (p.fullName) lines.push(p.fullName);
  if (p.professionalTitle) lines.push(p.professionalTitle);
  const contacts = [p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean);
  if (contacts.length) lines.push(contacts.join(' | '));

  if (data.summary) lines.push(`PROFESSIONAL SUMMARY:\n${data.summary}`);
  if (data.objective) lines.push(`CAREER OBJECTIVE:\n${data.objective}`);

  if (data.skills) {
    const s = data.skills;
    const groups: string[] = [];
    if (s.languages?.length) groups.push(`Languages: ${s.languages.join(', ')}`);
    if (s.frameworks?.length) groups.push(`Frameworks: ${s.frameworks.join(', ')}`);
    if (s.databases?.length) groups.push(`Databases: ${s.databases.join(', ')}`);
    if (s.tools?.length) groups.push(`Tools: ${s.tools.join(', ')}`);
    if (s.cloud?.length) groups.push(`Cloud: ${s.cloud.join(', ')}`);
    if (s.soft?.length) groups.push(`Soft skills: ${s.soft.join(', ')}`);
    if (groups.length) lines.push(`SKILLS:\n${groups.join('\n')}`);
  }

  if (data.experience?.length) {
    lines.push('EXPERIENCE:');
    for (const e of data.experience) {
      lines.push(`- ${e.jobTitle} at ${e.company}${e.location ? `, ${e.location}` : ''} (${e.startDate} - ${e.endDate})`);
      if (e.description) lines.push(e.description);
    }
  }

  if (data.internships?.length) {
    lines.push('INTERNSHIPS:');
    for (const e of data.internships) {
      lines.push(`- ${e.title} at ${e.company}${e.location ? `, ${e.location}` : ''} (${e.duration})`);
      if (e.technologies) lines.push(`Technologies: ${e.technologies}`);
      if (e.description) lines.push(e.description);
    }
  }

  if (data.projects?.length) {
    lines.push('PROJECTS:');
    for (const e of data.projects) {
      lines.push(`- ${e.name}${e.role ? ` (Role: ${e.role})` : ''}`);
      if (e.technologies) lines.push(`Technologies: ${e.technologies}`);
      if (e.description) lines.push(e.description);
    }
  }

  if (data.education?.length) {
    lines.push('EDUCATION:');
    for (const e of data.education) {
      lines.push(`- ${e.degree}, ${e.institution}${e.location ? `, ${e.location}` : ''} (${e.startYear} - ${e.endYear})${e.score ? ` — ${e.score}` : ''}`);
    }
  }

  if (data.certifications?.length) {
    lines.push('CERTIFICATIONS:');
    for (const c of data.certifications) lines.push(`- ${c.name}${c.organization ? `, ${c.organization}` : ''}${c.date ? ` (${c.date})` : ''}`);
  }

  if (data.achievements?.length) {
    lines.push('ACHIEVEMENTS:');
    for (const a of data.achievements) lines.push(`- ${a.title}${a.description ? `: ${a.description}` : ''}`);
  }

  if (data.languages?.length) {
    lines.push(`LANGUAGES: ${data.languages.map((l) => `${l.language} (${l.proficiency})`).join(', ')}`);
  }

  return lines.filter(Boolean).join('\n\n');
}

/** Splits a description field into bullet lines, stripping common prefixes. */
export function descriptionToBullets(description: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-–—•*]|\d+\.)\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

/** Normalizes a skill/keyword for comparison. */
export function normalizeKeyword(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9+.# ]/g, '').replace(/\s+/g, ' ').trim();
}
