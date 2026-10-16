'use client';

import type { ResumeData } from '@/types/resume';
import { contactItems, dateRange, skillGroups, splitBullets } from './shared';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
  <section className="mt-4">
    <h2 className="border-b border-neutral-500 pb-0.5 text-[12.5px] font-bold uppercase tracking-wide text-neutral-900">
      {title}
    </h2>
    <div className="mt-2 space-y-2.5">{children}</div>
  </section>
  );
}

function Bullets({ text }: { text: string }) {
  return (
  <ul className="ml-4 list-disc space-y-1 text-[11.5px] leading-relaxed text-neutral-800">
    {splitBullets(text).map((b, i) => (
      <li key={i}>{b}</li>
    ))}
  </ul>
  );
}

/** Template 2 — Professional: classic serif, formal left-aligned header. */
export function ProfessionalTemplate({ data }: { data: ResumeData }) {
  const d = data;
  const p = d.personal;
  const contacts = contactItems(d);
  const groups = skillGroups(d);


  return (
    <div className="p-9 font-serif text-neutral-900">
      <header>
        <h1 className="text-[24px] font-bold uppercase tracking-wide">{p.fullName || 'Your Name'}</h1>
        {p.professionalTitle && <p className="mt-0.5 text-[12.5px] italic text-neutral-700">{p.professionalTitle}</p>}
        {contacts.length > 0 && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-700">{contacts.join('  •  ')}</p>
        )}
      </header>

      {(d.summary || d.objective) && (
        <Section title={d.summary ? 'Professional Summary' : 'Career Objective'}>
          <p className="text-[11.5px] leading-relaxed text-neutral-800">{d.summary || d.objective}</p>
        </Section>
      )}

      {groups.length > 0 && (
        <Section title="Skills">
          {groups.map((g) => (
            <p key={g.label} className="text-[11.5px] leading-relaxed">
              <span className="font-bold">{g.label}: </span>
              <span className="text-neutral-800">{g.items.join(', ')}</span>
            </p>
          ))}
        </Section>
      )}

      {d.experience.length > 0 && (
        <Section title="Professional Experience">
          {d.experience.map((e) => (
            <div key={e.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-bold">{[e.jobTitle, e.company].filter(Boolean).join(', ')}</p>
                <p className="shrink-0 text-[11px] italic text-neutral-600">{dateRange(e.startDate, e.endDate)}</p>
              </div>
              {e.location && <p className="text-[11px] italic text-neutral-600">{e.location}</p>}
              {e.description && <Bullets text={e.description} />}
            </div>
          ))}
        </Section>
      )}

      {d.internships.length > 0 && (
        <Section title="Internships">
          {d.internships.map((e) => (
            <div key={e.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-bold">{[e.title, e.company].filter(Boolean).join(', ')}</p>
                <p className="shrink-0 text-[11px] italic text-neutral-600">{e.duration}</p>
              </div>
              {e.location && <p className="text-[11px] italic text-neutral-600">{e.location}</p>}
              {e.technologies && (
                <p className="text-[11px] text-neutral-700">
                  <span className="font-semibold">Technologies: </span>
                  {e.technologies}
                </p>
              )}
              {e.description && <Bullets text={e.description} />}
            </div>
          ))}
        </Section>
      )}

      {d.projects.length > 0 && (
        <Section title="Projects">
          {d.projects.map((e) => (
            <div key={e.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-bold">{e.name}</p>
                {(e.githubUrl || e.liveUrl) && (
                  <p className="shrink-0 text-[10px] text-neutral-600">{[e.githubUrl, e.liveUrl].filter(Boolean).join(' | ')}</p>
                )}
              </div>
              {e.role && <p className="text-[11px] italic text-neutral-600">Role: {e.role}</p>}
              {e.technologies && (
                <p className="text-[11px] text-neutral-700">
                  <span className="font-semibold">Technologies: </span>
                  {e.technologies}
                </p>
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
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12.5px] font-bold">{[e.degree, e.institution].filter(Boolean).join(', ')}</p>
                <p className="shrink-0 text-[11px] italic text-neutral-600">{dateRange(e.startYear, e.endYear)}</p>
              </div>
              <p className="text-[11px] text-neutral-700">{[e.location, e.score].filter(Boolean).join(' • ')}</p>
            </div>
          ))}
        </Section>
      )}

      {d.certifications.length > 0 && (
        <Section title="Certifications">
          {d.certifications.map((c) => (
            <div key={c.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11.5px] font-semibold">{[c.name, c.organization].filter(Boolean).join(', ')}</p>
                <p className="shrink-0 text-[11px] italic text-neutral-600">{c.date}</p>
              </div>
              {c.credentialUrl && <p className="text-[10px] text-neutral-600">{c.credentialUrl}</p>}
            </div>
          ))}
        </Section>
      )}

      {d.achievements.length > 0 && (
        <Section title="Achievements">
          <ul className="ml-4 list-disc space-y-1 text-[11.5px] leading-relaxed text-neutral-800">
            {d.achievements.map((a) => (
              <li key={a.id}>
                <span className="font-bold">{a.title}</span>
                {a.description ? ` — ${a.description}` : ''}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {d.languages.length > 0 && (
        <Section title="Languages">
          <p className="text-[11.5px] text-neutral-800">
            {d.languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join('  •  ')}
          </p>
        </Section>
      )}
    </div>
  );
}
