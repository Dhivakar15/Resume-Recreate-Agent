'use client';

import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/app/loading-button';
import { AiReviewDialog } from '@/components/app/ai-review-dialog';
import { Field, EntryCard, AddEntryButton, BulletTextarea } from '@/components/app/builder/entry-fields';
import { useAiImprove } from '@/components/app/builder/use-ai-improve';
import type { ResumeData } from '@/types/resume';
import { Sparkles } from 'lucide-react';

interface StepProps {
  data: ResumeData;
  update: (patch: Partial<ResumeData>) => void;
  targetRole?: string;
  context?: string;
}

// ─── Step 5: Experience ──────────────────────────────────────────────────────

export function StepExperience({ data, update, targetRole, context }: StepProps) {
  const ai = useAiImprove();
  const entries = data.experience;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ experience: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      experience: [
        ...entries,
        { id: crypto.randomUUID(), jobTitle: '', company: '', location: '', startDate: '', endDate: '', description: '' },
      ],
    });

  const remove = (id: string) => update({ experience: entries.filter((e) => e.id !== id) });

  const accept = () => {
    if (!ai.review) return;
    setEntry(ai.review.id, { description: ai.review.improved });
    ai.close();
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No experience added yet. Internships can go in the next step.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard
          key={e.id}
          title="Experience"
          index={i}
          onRemove={() => remove(e.id)}
          actions={
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[36px] text-teal-700 dark:text-teal-300"
              loading={ai.loadingId === e.id}
              loadingText="Improving…"
              onClick={() =>
                ai.run(
                  e.id,
                  'experience',
                  e.description,
                  targetRole,
                  [context, `Role: ${e.jobTitle} at ${e.company}`].filter(Boolean).join('\n'),
                )
              }
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Improve with AI
            </LoadingButton>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job Title" htmlFor={`ex-title-${e.id}`}>
              <Input id={`ex-title-${e.id}`} value={e.jobTitle} onChange={(ev) => setEntry(e.id, { jobTitle: ev.target.value })} placeholder="e.g. Software Developer" maxLength={120} />
            </Field>
            <Field label="Company" htmlFor={`ex-company-${e.id}`}>
              <Input id={`ex-company-${e.id}`} value={e.company} onChange={(ev) => setEntry(e.id, { company: ev.target.value })} placeholder="Company name" maxLength={120} />
            </Field>
            <Field label="Location" htmlFor={`ex-loc-${e.id}`}>
              <Input id={`ex-loc-${e.id}`} value={e.location} onChange={(ev) => setEntry(e.id, { location: ev.target.value })} placeholder="City, Country" maxLength={100} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date" htmlFor={`ex-start-${e.id}`}>
                <Input id={`ex-start-${e.id}`} value={e.startDate} onChange={(ev) => setEntry(e.id, { startDate: ev.target.value })} placeholder="Jan 2023" maxLength={30} />
              </Field>
              <Field label="End Date" htmlFor={`ex-end-${e.id}`}>
                <Input id={`ex-end-${e.id}`} value={e.endDate} onChange={(ev) => setEntry(e.id, { endDate: ev.target.value })} placeholder="Mar 2024" maxLength={30} />
              </Field>
            </div>
            <Field label="Description" htmlFor={`ex-desc-${e.id}`} className="sm:col-span-2">
              <BulletTextarea
                id={`ex-desc-${e.id}`}
                rows={4}
                value={e.description}
                onChange={(ev) => setEntry(e.id, { description: ev.target.value })}
                placeholder={'What did you build, improve or own?\nOne achievement per line'}
                maxLength={4000}
              />
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Experience" onClick={add} maxed={entries.length >= 15} />

      <AiReviewDialog
        open={!!ai.review}
        onOpenChange={(o) => !o && ai.close()}
        title="AI-improved Experience Description"
        original={ai.review?.original ?? ''}
        improved={ai.review?.improved ?? ''}
        onAccept={accept}
      />
    </div>
  );
}

// ─── Step 6: Internships ─────────────────────────────────────────────────────

export function StepInternships({ data, update, targetRole, context }: StepProps) {
  const ai = useAiImprove();
  const entries = data.internships;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ internships: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      internships: [
        ...entries,
        { id: crypto.randomUUID(), title: '', company: '', duration: '', location: '', description: '', technologies: '' },
      ],
    });

  const remove = (id: string) => update({ internships: entries.filter((e) => e.id !== id) });

  const accept = () => {
    if (!ai.review) return;
    setEntry(ai.review.id, { description: ai.review.improved });
    ai.close();
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No internships added yet. They&apos;re a great way to show practical exposure.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard
          key={e.id}
          title="Internship"
          index={i}
          onRemove={() => remove(e.id)}
          actions={
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[36px] text-teal-700 dark:text-teal-300"
              loading={ai.loadingId === e.id}
              loadingText="Improving…"
              onClick={() =>
                ai.run(e.id, 'internship', e.description, targetRole, [context, `Internship: ${e.title} at ${e.company}`].filter(Boolean).join('\n'))
              }
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Improve with AI
            </LoadingButton>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Internship Title" htmlFor={`in-title-${e.id}`}>
              <Input id={`in-title-${e.id}`} value={e.title} onChange={(ev) => setEntry(e.id, { title: ev.target.value })} placeholder="e.g. Web Development Intern" maxLength={120} />
            </Field>
            <Field label="Company" htmlFor={`in-company-${e.id}`}>
              <Input id={`in-company-${e.id}`} value={e.company} onChange={(ev) => setEntry(e.id, { company: ev.target.value })} placeholder="Company name" maxLength={120} />
            </Field>
            <Field label="Duration" htmlFor={`in-dur-${e.id}`}>
              <Input id={`in-dur-${e.id}`} value={e.duration} onChange={(ev) => setEntry(e.id, { duration: ev.target.value })} placeholder="e.g. 3 months (May 2024 - Jul 2024)" maxLength={60} />
            </Field>
            <Field label="Location" htmlFor={`in-loc-${e.id}`}>
              <Input id={`in-loc-${e.id}`} value={e.location} onChange={(ev) => setEntry(e.id, { location: ev.target.value })} placeholder="City, Country or Remote" maxLength={100} />
            </Field>
            <Field label="Technologies Used" htmlFor={`in-tech-${e.id}`} className="sm:col-span-2">
              <Input id={`in-tech-${e.id}`} value={e.technologies} onChange={(ev) => setEntry(e.id, { technologies: ev.target.value })} placeholder="e.g. React, Node.js, MongoDB" maxLength={300} />
            </Field>
            <Field label="Description" htmlFor={`in-desc-${e.id}`} className="sm:col-span-2">
              <BulletTextarea
                id={`in-desc-${e.id}`}
                rows={3}
                value={e.description}
                onChange={(ev) => setEntry(e.id, { description: ev.target.value })}
                placeholder={'What did you work on?\nOne bullet per line'}
                maxLength={4000}
              />
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Internship" onClick={add} maxed={entries.length >= 15} />

      <AiReviewDialog
        open={!!ai.review}
        onOpenChange={(o) => !o && ai.close()}
        title="AI-improved Internship Description"
        original={ai.review?.original ?? ''}
        improved={ai.review?.improved ?? ''}
        onAccept={accept}
      />
    </div>
  );
}

// ─── Step 7: Projects ────────────────────────────────────────────────────────

export function StepProjects({ data, update, targetRole, context }: StepProps) {
  const ai = useAiImprove();
  const entries = data.projects;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ projects: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      projects: [
        ...entries,
        { id: crypto.randomUUID(), name: '', description: '', role: '', technologies: '', githubUrl: '', liveUrl: '' },
      ],
    });

  const remove = (id: string) => update({ projects: entries.filter((e) => e.id !== id) });

  const accept = () => {
    if (!ai.review) return;
    setEntry(ai.review.id, { description: ai.review.improved });
    ai.close();
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No projects added yet. Academic, personal and open-source projects all count.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard
          key={e.id}
          title="Project"
          index={i}
          onRemove={() => remove(e.id)}
          actions={
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[36px] text-teal-700 dark:text-teal-300"
              loading={ai.loadingId === e.id}
              loadingText="Improving…"
              onClick={() =>
                ai.run(e.id, 'project', e.description, targetRole, [context, `Project: ${e.name}. Technologies: ${e.technologies}`].filter(Boolean).join('\n'))
              }
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Improve with AI
            </LoadingButton>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Project Name" htmlFor={`pr-name-${e.id}`} className="sm:col-span-2">
              <Input id={`pr-name-${e.id}`} value={e.name} onChange={(ev) => setEntry(e.id, { name: ev.target.value })} placeholder="e.g. CampusEvents — Event Management Portal" maxLength={120} />
            </Field>
            <Field label="Your Role" htmlFor={`pr-role-${e.id}`}>
              <Input id={`pr-role-${e.id}`} value={e.role} onChange={(ev) => setEntry(e.id, { role: ev.target.value })} placeholder="e.g. Team Lead / Solo Developer" maxLength={100} />
            </Field>
            <Field label="Technologies" htmlFor={`pr-tech-${e.id}`}>
              <Input id={`pr-tech-${e.id}`} value={e.technologies} onChange={(ev) => setEntry(e.id, { technologies: ev.target.value })} placeholder="e.g. React, Django, PostgreSQL" maxLength={300} />
            </Field>
            <Field label="GitHub URL" htmlFor={`pr-gh-${e.id}`}>
              <Input id={`pr-gh-${e.id}`} value={e.githubUrl} onChange={(ev) => setEntry(e.id, { githubUrl: ev.target.value })} placeholder="https://github.com/…" />
            </Field>
            <Field label="Live Demo URL" htmlFor={`pr-live-${e.id}`}>
              <Input id={`pr-live-${e.id}`} value={e.liveUrl} onChange={(ev) => setEntry(e.id, { liveUrl: ev.target.value })} placeholder="https://…" />
            </Field>
            <Field label="Description" htmlFor={`pr-desc-${e.id}`} className="sm:col-span-2">
              <BulletTextarea
                id={`pr-desc-${e.id}`}
                rows={4}
                value={e.description}
                onChange={(ev) => setEntry(e.id, { description: ev.target.value })}
                placeholder={'What does it do? What did YOU build?\nOne bullet per line'}
                maxLength={4000}
              />
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Project" onClick={add} maxed={entries.length >= 20} />

      <AiReviewDialog
        open={!!ai.review}
        onOpenChange={(o) => !o && ai.close()}
        title="AI-improved Project Description"
        original={ai.review?.original ?? ''}
        improved={ai.review?.improved ?? ''}
        onAccept={accept}
      />
    </div>
  );
}
