'use client';

import type { ResumeData } from '@/types/resume';
import { contactItems, dateRange, skillGroups, splitBullets } from './shared';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
  <section className="mt-6">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900">{title}</h2>
    <div className="mt-2.5 space-y-3">{children}</div>
  </section>
  );
}

function Bullets({ text }: { text: string }) {
  return (
  <ul className="ml-4 list-disc space-y-1 text-[11px] leading-relaxed text-neutral-600">
    {splitBullets(text).map((b, i) => (
      <li key={i}>{b}</li>
    ))}
  </ul>
  );
}

/** Template 3 — Minimal: maximum whitespace, no decoration, pure content. */
export function MinimalTemplate({ data }: { data: ResumeData }) {
  const d = data;
  const p = d.personal;
  const contacts = contactItems(d);
  const groups = skillGroups(d);


  return (
    <div className="p-10 font-sans text-neutral-900">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">{p.fullName || 'Your Name'}</h1>
        {p.professionalTitle && <p className="mt-0.5 text-[12px] text-neutral-500">{p.professionalTitle}</p>}
        {contacts.length > 0 && (
          <p className="mt-2 text-[10.5px] leading-relaxed text-neutral-500">{contacts.join('   ·   ')}</p>
        )}
      </header>

      {(d.summary || d.objective) && (
        <Section title={d.summary ? 'Summary' : 'Objective'}>
          <p className="text-[11px] leading-relaxed text-neutral-600">{d.summary || d.objective}</p>
        </Section>
      )}

      {groups.length > 0 && (
        <Section title="Skills">
          {groups.map((g) => (
            <p key={g.label} className="text-[11px] leading-relaxed">
              <span className="font-medium text-neutral-900">{g.label} — </span>
              <span className="text-neutral-600">{g.items.join(', ')}</span>
            </p>
          ))}
        </Section>
      )}

      {d.experience.length > 0 && (
        <Section title="Experience">
          {d.experience.map((e) => (
            <div key={e.id}>
              <p className="text-[12px] font-medium">{[e.jobTitle, e.company].filter(Boolean).join(' · ')}</p>
              <p className="text-[10.5px] text-neutral-500">{[dateRange(e.startDate, e.endDate), e.location].filter(Boolean).join('  ·  ')}</p>
              {e.description && <Bullets text={e.description} />}
            </div>
          ))}
        </Section>
      )}

      {d.internships.length > 0 && (
        <Section title="Internships">
          {d.internships.map((e) => (
            <div key={e.id}>
              <p className="text-[12px] font-medium">{[e.title, e.company].filter(Boolean).join(' · ')}</p>
              <p className="text-[10.5px] text-neutral-500">{[e.duration, e.location].filter(Boolean).join('  ·  ')}</p>
              {e.technologies && <p className="text-[10.5px] text-neutral-500">Technologies: {e.technologies}</p>}
              {e.description && <Bullets text={e.description} />}
            </div>
          ))}
        </Section>
      )}

      {d.projects.length > 0 && (
        <Section title="Projects">
          {d.projects.map((e) => (
            <div key={e.id}>
              <p className="text-[12px] font-medium">{e.name}</p>
              {(e.role || e.technologies) && (
                <p className="text-[10.5px] text-neutral-500">
                  {[e.role, e.technologies].filter(Boolean).join('  ·  ')}
                </p>
              )}
              {(e.githubUrl || e.liveUrl) && (
                <p className="text-[10px] text-neutral-500">{[e.githubUrl, e.liveUrl].filter(Boolean).join('  ·  ')}</p>
              )}
              {e.description && <Bullets text={e.description} />}
            </div>
          ))}
        </Section>
      )}

      {d.education.length > 0 && (
        <Section title="Education">
          {d.education.map((e) => (
            <div key={e.id}>
              <p className="text-[12px] font-medium">{[e.degree, e.institution].filter(Boolean).join(' · ')}</p>
              <p className="text-[10.5px] text-neutral-500">{[dateRange(e.startYear, e.endYear), e.location, e.score].filter(Boolean).join('  ·  ')}</p>
            </div>
          ))}
        </Section>
      )}

      {d.certifications.length > 0 && (
        <Section title="Certifications">
          {d.certifications.map((c) => (
            <div key={c.id}>
              <p className="text-[11.5px] font-medium">{[c.name, c.organization].filter(Boolean).join(' · ')}</p>
              <p className="text-[10.5px] text-neutral-500">{[c.date, c.credentialUrl].filter(Boolean).join('  ·  ')}</p>
            </div>
          ))}
        </Section>
      )}

      {d.achievements.length > 0 && (
        <Section title="Achievements">
          <ul className="ml-4 list-disc space-y-1 text-[11px] leading-relaxed text-neutral-600">
            {d.achievements.map((a) => (
              <li key={a.id}>
                <span className="font-medium text-neutral-900">{a.title}</span>
                {a.description ? ` — ${a.description}` : ''}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {d.languages.length > 0 && (
        <Section title="Languages">
          <p className="text-[11px] text-neutral-600">
            {d.languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join('   ·   ')}
          </p>
        </Section>
      )}
    </div>
  );
}
