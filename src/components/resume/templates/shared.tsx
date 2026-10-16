'use client';

import type { ResumeData } from '@/types/resume';

/** Splits a description field into display bullet lines. */
export function splitBullets(description: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-–—•*]|\d+\.)\s*/, '').trim())
    .filter(Boolean);
}

export function hasAnyContent(d: ResumeData): boolean {
  const p = d.personal;
  return Boolean(
    p.fullName || p.professionalTitle || p.email || p.phone || p.location ||
    p.linkedin || p.github || p.portfolio || d.summary || d.objective ||
    d.education.length || d.experience.length || d.internships.length ||
    d.projects.length || d.certifications.length || d.achievements.length ||
    d.languages.length || Object.values(d.skills).some((a) => a.length),
  );
}

export function contactItems(d: ResumeData): string[] {
  return [d.personal.email, d.personal.phone, d.personal.location, d.personal.linkedin, d.personal.github, d.personal.portfolio]
    .map((c) => c.trim())
    .filter(Boolean);
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export function skillGroups(d: ResumeData): SkillGroup[] {
  const s = d.skills;
  return (
    [
      ['Languages', s.languages],
      ['Frameworks & Libraries', s.frameworks],
      ['Databases', s.databases],
      ['Tools & Platforms', s.tools],
      ['Cloud Technologies', s.cloud],
      ['Soft Skills', s.soft],
    ] as [string, string[]][]
  )
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function dateRange(start: string, end: string): string {
  const s = start.trim();
  const e = end.trim();
  if (s && e) return `${s} — ${e}`;
  return s || e;
}
